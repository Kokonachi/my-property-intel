#!/usr/bin/env python3
"""One photo per real project -> public/photos/<id>.webp (≤800px) + src/data/photos.json (source per photo).
Priority: PropertyGuru listing photo labelled Exterior/Facilities/Pool/Building (already-cached Apify pages, no new
requests) > PropertyGuru interior/living-room photo > Mudah listing photo > Esri World Imagery aerial of the
project's coordinates. Projects without coordinates and without listing photos get no photo (the UI then shows a
typographic card). Usage: photos.py [--refresh]"""
import io, json, re, sys, time
from pathlib import Path
from PIL import Image
from curl_cffi import requests
import scrape

ROOT = Path(__file__).parent
APP = ROOT.parent
OUTDIR = APP / "public" / "photos"; OUTDIR.mkdir(parents=True, exist_ok=True)
MAP_FP = APP / "src" / "data" / "photos.json"
done = json.loads(MAP_FP.read_text()) if MAP_FP.exists() and "--refresh" not in sys.argv else {}
P = json.loads((APP / "data/real_projects.json").read_text())["projects"]
AREA = {a["app"]: a for a in scrape.AREAS.values()}
RANK = [(r"exterior|facade|building|main entrance|lobby|facilit|swimming|pool|garden|view|compound|surrounding", 3, "exterior"),
        (r"living|interior|dining|balcony|hall", 2, "interior")]
_last = {}


def get(url):
    host = re.match(r"https?://([^/]+)", url).group(1)
    w = 1.5 - (time.time() - _last.get(host, 0))
    if w > 0: time.sleep(w)
    try:
        r = requests.get(url, impersonate="chrome", timeout=40, headers={"Referer": "https://www.propertyguru.com.my/" if "pgimgs" in url else "https://www.mudah.my/"})
    except Exception:
        return None
    _last[host] = time.time()
    return r.content if r.status_code == 200 and r.headers.get("content-type", "").startswith("image") else None


def save(pid, data):
    try:
        im = Image.open(io.BytesIO(data)).convert("RGB")
    except Exception:
        return None
    if im.width < 300:
        return None
    small = im.resize((100, 75))
    if sum(1 for r, g, b in small.getdata() if r > 225 and g > 225 and b > 225) / 7500 > 0.6:
        return None  # mostly white = floor plan / brochure page, not a photo
    im.thumbnail((800, 800))
    fp = OUTDIR / f"{pid}.webp"
    im.save(fp, "WEBP", quality=78)
    return f"photos/{pid}.webp", im.size


def pg_candidates(p):
    cards, _ = scrape.pg_rents(p["name"].upper())
    out = []
    for c in cards:
        for src, alt in c.get("images", []):
            room = (re.search(r" - ([^-]+) - PropertyGuru", alt) or [None, ""])[1].lower()
            score, kind = next(((s, k) for rx, s, k in RANK if re.search(rx, room)), (1, "interior"))
            out.append((score, kind, src, c.get("url")))
    return sorted(out, key=lambda x: -x[0])


def mudah_candidates(p):
    A = next(a for a in scrape.AREAS.values() if a["app"] == p["area"] or a["en"] == p["brickz_town"] or p["brickz_town"].startswith(a["en"]))
    items, url = scrape.mudah_search({"name": p["name"]}, A["mudah"], "rent", landed=p["type"] == "Landed")
    return [(1, "listing", it["image"].replace("/grids/", "/images/"), it.get("url") or url) for it in items if it.get("image")] + \
           [(0, "listing", it["image"], it.get("url") or url) for it in items if it.get("image")]


def aerial(p):
    lat, lng = p["lat"], p["lng"]
    dlat, dlng = 0.0018, 0.0024  # ~200 x 260 m
    url = ("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export"
           f"?bbox={lng - dlng},{lat - dlat},{lng + dlng},{lat + dlat}&bboxSR=4326&imageSR=3857&size=800,600&format=jpg&f=image")
    return url


for p in P:
    if p["id"] in done:
        continue
    rec = None
    for score, kind, src, link in pg_candidates(p)[:4]:
        data = get(src)
        res = data and save(p["id"], data)
        if res:
            rec = dict(src=res[0], kind=kind, source="PropertyGuru listing", url=("https://www.propertyguru.com.my" + link) if link and link.startswith("/") else link, w=res[1][0], h=res[1][1]); break
    if not rec:
        try:
            mc = mudah_candidates(p)[:4]
        except Exception as e:
            print("mudah err", e)
            mc = []
        for score, kind, src, link in mc:
            data = get(src)
            res = data and save(p["id"], data)
            if res:
                rec = dict(src=res[0], kind=kind, source="Mudah.my listing", url=link, w=res[1][0], h=res[1][1]); break
    if not rec and p.get("lat") is not None:
        data = get(aerial(p))
        res = data and save(p["id"], data)
        if res:
            rec = dict(src=res[0], kind="aerial", source="Esri World Imagery (Maxar, Earthstar Geographics)", url="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9", w=res[1][0], h=res[1][1])
    done[p["id"]] = rec
    print(p["name"], "->", rec and f'{rec["source"]} ({rec["kind"]})', flush=True)
    MAP_FP.write_text(json.dumps(done, indent=1))
