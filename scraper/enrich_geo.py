#!/usr/bin/env python3
"""Fix approximate project locations -> geocode_overrides.json.
Order per project: Photon (name variants, biased to the area) -> Nominatim (name variants) -> Nominatim on the
most-frequent street in the project's Brickz transaction addresses (streets.json). Results must fall inside the
area radius. Anything still unplaceable is written with "hide": true (listed in the app, not drawn on the map).
Usage: enrich_geo.py   (reads ../data/real_projects.json, which must come from a run without these overrides for new ids)"""
import json, re, math
from pathlib import Path
import scrape
scrape.DELAY["photon.komoot.io"] = 1.2
ROOT = Path(__file__).parent
P = json.loads((ROOT.parent / "data/real_projects.json").read_text())["projects"]
streets = json.loads((ROOT / "streets.json").read_text()) if (ROOT / "streets.json").exists() else {}
ov_fp = ROOT / "geocode_overrides.json"
ov = json.loads(ov_fp.read_text()) if ov_fp.exists() else {}
AREA = {a["app"]: a for a in scrape.AREAS.values()}
CITY = {"sj": ("Subang Jaya", "Selangor"), "bss": ("Bangsar South", "Kuala Lumpur")}

def variants(name):
    n = re.sub(r"\s+", " ", name).strip()
    vs = [n]
    inner = re.findall(r"\(([^)]+)\)", n)
    base = re.sub(r"\([^)]*\)", "", n).strip(" -@")
    vs += inner + [base]
    vs += [re.split(r"\s[-@]\s?", base)[0]]
    vs += [re.sub(r"^(subang perdana|pangsapuri|residensi|taman)\s+", "", base, flags=re.I)]
    vs = [re.sub(r"\b(subang jaya|putra height[s]?)\b", "", v, flags=re.I).strip(" -@,") for v in vs]
    out = []
    for v in vs:
        if len(v) > 3 and v.lower() not in [o.lower() for o in out]:
            out.append(v)
    return out

def ok(lat, lng, A):
    return math.dist([lat, lng], A["c"]) <= A.get("radius", 0.04)

GENERIC = {"subang", "jaya", "selangor", "kuala", "lumpur", "bangsar", "south", "the", "residence", "residences", "court",
           "apartment", "apartments", "flat", "flats", "service", "serviced", "condominium", "condo", "suites", "@", "kampung"}


def photon(q, A):
    js = scrape.fetch("https://photon.komoot.io/api/", kind="json", params={"q": q, "lat": A["c"][0], "lon": A["c"][1], "limit": 5})
    for f in (js or {}).get("features", []):
        pr = f["properties"]; lng, lat = f["geometry"]["coordinates"]
        if pr.get("countrycode") == "MY" and ok(lat, lng, A):
            okkey = pr.get("osm_key") in ("building", "landuse", "place") or (pr.get("osm_key"), pr.get("osm_value")) == ("shop", "mall")
            nm_t = set(re.findall(r"[a-z0-9']+", (pr.get("name") or "").lower()))
            toks = [t for t in re.findall(r"[a-z0-9']+", q.lower()) if t not in GENERIC]
            if okkey and toks and all(t in nm_t for t in toks):  # every distinctive word must appear in the OSM name
                return lat, lng, f"photon: {pr.get('name')} ({pr.get('osm_key')}={pr.get('osm_value')})"
    return None

def nominatim(q, A, must=None):
    js = scrape.fetch("https://nominatim.openstreetmap.org/search", kind="json", params={"q": q, "format": "jsonv2", "limit": 1, "countrycodes": "my"})
    if js:
        lat, lng = float(js[0]["lat"]), float(js[0]["lon"])
        disp = re.sub(r"[^a-z0-9]", "", js[0].get("display_name", "").lower())
        name_toks = [t for t in re.findall(r"[a-z0-9']+", (must or q.split(",")[0]).lower()) if t not in GENERIC]
        if must and re.sub(r"[^a-z0-9]", "", must.lower()) not in disp:
            return None  # street query must return that exact street
        disp_t = set(re.findall(r"[a-z0-9]+", js[0].get("display_name", "").lower()))
        if not must and (not name_toks or not all(t.replace("'", "") in disp_t for t in name_toks)):
            return None
        if ok(lat, lng, A):
            return lat, lng, f"nominatim: {js[0].get('display_name', '')[:80]}"
    return None

import sys
# hand-checked names as they appear in OpenStreetMap
GEO_ALIAS = {"real-pkns-17-kampung-kerinchi": "Pangsapuri 17 Tingkat Kampung Kerinchi", "real-damen-usj-service-apartment": "Da Men",
             "real-kuala-lumpur-gateway": "KL Gateway", "real-kuala-lumpur-gateway-menara-suezcap": "SuezCap Tower",
             "real-taman-bukit-angkasa-angkasapuri-flat": "Taman Bukit Angkasa", "real-taman-bukit-angkasa-taman-angkasapuri-flat": "Taman Bukit Angkasa"}
todo = [p for p in P if p["area"] in CITY and p["geo_source"] == "approx" and p["id"] not in ov
        and ("--force" in sys.argv or p["id"] in streets)]  # wait for enrich_streets.py unless --force
for p in todo:
    A = AREA[p["area"]]; city, state = CITY[p["area"]]
    res = None
    for v in ([GEO_ALIAS[p["id"]]] if p["id"] in GEO_ALIAS else []) + variants(p["name"]):
        res = photon(f"{v} {city}", A) or nominatim(f"{v}, {city}, {state}", A) or nominatim(f"{v}, {state}", A)
        if res:
            break
    if not res:
        sts = [s for s, n in streets.get(p["id"], {}).get("streets", []) if not re.fullmatch(r"JALAN (SS|USJ|PJS)", s)]
        for s in sts[:2]:
            s2 = re.sub(r"^JALAN (USJ|SS|PJS)(\d)", r"JALAN \1 \2", s).title()
            res = nominatim(f"{s2}, {city}, {state}", A, must=s2)
            if res:
                res = (res[0], res[1], f"street from Brickz transactions ({s2}) → " + res[2])
                break
    if res:
        ov[p["id"]] = {"name": p["name"], "lat": round(res[0], 6), "lng": round(res[1], 6), "source": res[2]}
    else:
        ov[p["id"]] = {"name": p["name"], "hide": True, "reason": "no geocoder match for project name or Brickz street"}
    print(p["name"], "->", ov[p["id"]].get("source") or "HIDE", flush=True)
    ov_fp.write_text(json.dumps(ov, indent=1, ensure_ascii=False))
