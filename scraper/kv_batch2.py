#!/usr/bin/env python3
"""Klang Valley expansion, batch 2 · 巴生谷扩区（第二批）
=========================================================
Adds the Brickz towns batch 1 did not cover (Cheras, Setapak, Sentul, Kepong, Ampang, PJ, Puchong, Shah Alam, ...)
and fills coordinates for batch-1 projects that had none. Same method and thresholds as kl_expand.py:

  * Transacted prices: Brickz KL + Selangor state index pages already cached in photo_upgrade/ (no Brickz requests).
    Non-landed only, >= MIN_TX transactions (batch 2 also needs >= B2_MIN_TX so the first pass stays reasonable).
  * Rents: Mudah first-page keyword search per project (scrape.fetch: 6 s per request, disk cache), listing titles must
    name the project (scrape.title_matches), room rentals dropped (room_filter). Yield (same gross method as
    scrape.py / kl_expand.yield_block) only with >= 4 own ads. Stops on any challenge page.
  * Coordinates: Nominatim (1.2 s per request) bounded to the Brickz town, accepted only when the returned OSM object's
    own name matches the project name. No match -> not drawn (never a town-centre guess).
  * PropertyGuru blocks scripted requests from this machine (HTTP 403 challenge), so it is not used here.

Usage:
  kv_batch2.py towns      # geocode the batch-2 town centres (cache/kv_towns.json)
  kv_batch2.py mudah      # Mudah rent search for the queue (resumable; Ctrl-C safe)
  kv_batch2.py geo        # Nominatim for batch-2 projects + batch-1 projects without coordinates
  kv_batch2.py build      # -> data/kv_batch2.json + src/data/kv_batch2_site.json, refresh batch-1 coords
"""
import json, math, re, sys, time, collections
from pathlib import Path

import kl_expand as K
import scrape
from room_filter import clean_whole_unit_rents

ROOT = Path(__file__).resolve().parent
APP = ROOT.parent
CACHE = ROOT / "cache"
TOWNS_FP = ROOT / "kv_towns.json"
GEO_FP = ROOT / "kv_geo_matches.json"          # {project id: [lat, lng, osm class/type, osm name] | null}
MUDAH_FP = ROOT / "kv_mudah_matched.json"      # {project id: {term, status, ads:[[rent, size, rooms, url]]}}
OUT = APP / "data" / "kv_batch2.json"
SITE_OUT = APP / "src" / "data" / "kv_batch2_site.json"
B2_MIN_TX = 5   # same floor as batch 1; Mudah is searched in descending transaction order
MUDAH_DELAY = 15.0   # Mudah answered HTTP 429 after ~10 requests at 6 s
MIN_RENT_ADS = K.MIN_RENT_ADS

# Brickz (state, town slug) -> (app area id, en, zh). zh left English where no settled Chinese name is in common use.
TOWNS = {
    ("kuala-lumpur", "cheras"): ("cheras", "Cheras", "蕉赖"),
    ("kuala-lumpur", "setapak"): ("setapak", "Setapak", "文良港"),
    ("kuala-lumpur", "sentul"): ("sentul", "Sentul", "冼都"),
    ("kuala-lumpur", "ampang"): ("ampang-kl", "Ampang (KL)", "安邦（吉隆坡）"),
    ("kuala-lumpur", "kepong"): ("kepong", "Kepong", "甲洞"),
    ("kuala-lumpur", "wangsa-maju"): ("wangsa", "Wangsa Maju", "旺沙玛朱"),
    ("kuala-lumpur", "segambut"): ("segambut", "Segambut", "泗岩沫"),
    ("kuala-lumpur", "jalan-kuching"): ("jkuching", "Jalan Kuching", "古晋路"),
    ("kuala-lumpur", "sri-petaling"): ("srip", "Sri Petaling", "大城堡"),
    ("kuala-lumpur", "desa-petaling"): ("desap", "Desa Petaling", "Desa Petaling"),
    ("kuala-lumpur", "batu-caves"): ("batucaves-kl", "Batu Caves (KL)", "黑风洞（吉隆坡）"),
    ("kuala-lumpur", "bandar-tasik-selatan"): ("bts", "Bandar Tasik Selatan", "南湖镇"),
    ("kuala-lumpur", "jalan-ipoh"): ("jipoh", "Jalan Ipoh", "怡保路"),
    ("kuala-lumpur", "jinjang"): ("jinjang", "Jinjang", "增江"),
    ("kuala-lumpur", "taman-tun-dr-ismail"): ("ttdi", "Taman Tun Dr Ismail", "敦依斯迈花园"),
    ("kuala-lumpur", "sungai-besi"): ("sgbesi", "Sungai Besi", "新街场"),
    ("kuala-lumpur", "bandar-menjalara"): ("menjalara", "Bandar Menjalara", "文明阁"),
    ("kuala-lumpur", "salak-south"): ("salak", "Salak South", "沙叻南"),
    ("kuala-lumpur", "setiawangsa"): ("setiawangsa", "Setiawangsa", "Setiawangsa"),
    ("kuala-lumpur", "keramat"): ("keramat", "Keramat", "吉拉末"),
    ("selangor", "petaling-jaya"): ("pj", "Petaling Jaya", "八打灵再也"),
    ("selangor", "ampang"): ("ampang", "Ampang", "安邦"),
    ("selangor", "puchong"): ("puchong", "Puchong", "蒲种"),
    ("selangor", "shah-alam"): ("shahalam", "Shah Alam", "莎阿南"),
    ("selangor", "subang-jaya"): ("sj", "Subang Jaya", "梳邦再也"),
    ("selangor", "cheras"): ("cheras-sel", "Cheras (Selangor)", "蕉赖（雪兰莪）"),
    ("selangor", "klang"): ("klang", "Klang", "巴生"),
    ("selangor", "kajang"): ("kajang", "Kajang", "加影"),
    ("selangor", "seri-kembangan"): ("serikembangan", "Seri Kembangan", "沙登"),
    ("selangor", "ulu-kelang"): ("ulukelang", "Ulu Kelang", "Ulu Kelang"),
    ("selangor", "sunway"): ("sunway", "Sunway", "双威"),
    ("selangor", "rawang"): ("rawang", "Rawang", "万挠"),
    ("selangor", "bangi"): ("bangi", "Bangi", "万宜"),
    ("selangor", "kota-damansara"): ("kotadamansara", "Kota Damansara", "哥打白沙罗"),
    ("selangor", "sungai-buloh"): ("sgbuloh", "Sungai Buloh", "双溪毛糯"),
    ("selangor", "bandar-kinrara"): ("kinrara", "Bandar Kinrara", "金銮镇"),
    ("selangor", "setia-alam"): ("setiaalam", "Setia Alam", "Setia Alam"),
    ("selangor", "selayang"): ("selayang", "Selayang", "士拉央"),
    ("selangor", "kepong"): ("kepong-sel", "Kepong (Selangor)", "甲洞（雪兰莪）"),
    ("selangor", "ara-damansara"): ("aradamansara", "Ara Damansara", "Ara Damansara"),
    ("selangor", "bukit-raja"): ("bukitraja", "Bukit Raja", "武吉拉惹"),
    ("selangor", "damansara-perdana"): ("dperdana", "Damansara Perdana", "Damansara Perdana"),
    ("selangor", "damansara-damai"): ("ddamai", "Damansara Damai", "Damansara Damai"),
    ("selangor", "bandar-sri-damansara"): ("bsd", "Bandar Sri Damansara", "斯里白沙罗"),
    ("selangor", "batu-caves"): ("batucaves", "Batu Caves", "黑风洞"),
    ("selangor", "serendah"): ("serendah", "Serendah", "Serendah"),
    ("selangor", "semenyih"): ("semenyih", "Semenyih", "士毛月"),
    ("selangor", "kapar"): ("kapar", "Kapar", "加埔"),
    ("selangor", "balakong"): ("balakong", "Balakong", "无拉港"),
    ("selangor", "tropicana"): ("tropicana", "Tropicana", "Tropicana"),
    ("selangor", "puncak-alam"): ("puncakalam", "Puncak Alam", "Puncak Alam"),
    ("selangor", "bandar-utama"): ("bu", "Bandar Utama", "万达镇"),
    ("selangor", "mutiara-damansara"): ("mutiara", "Mutiara Damansara", "Mutiara Damansara"),
    ("selangor", "sungai-long"): ("sglong", "Sungai Long", "双溪龙"),
}
RADIUS = 0.07   # degrees (~7.8 km) around the geocoded town centre; generous because Brickz towns are broad


def brickz_rows_all():
    """Every row on the cached KL + Selangor Brickz index pages (kl_expand's parser, state-aware)."""
    seen, rows = set(), []
    for st in ("kuala-lumpur", "selangor"):
        pages = [K.PU / "sitemaps" / f"bz_transactions-residential-{st}.html"] + \
                sorted((K.PU / "sitemaps" / "brickz_pages").glob(f"{st}-p*.html"))
        for fp in pages:
            if not fp.exists():
                continue
            h = fp.read_text(errors="ignore")
            if st != "kuala-lumpur":
                h = h.replace(f"/residential/{st}/", "/residential/kuala-lumpur/")  # reuse the KL regex
            for r in K.parse_brickz_page(h):
                if st != "kuala-lumpur":
                    r["brickz_url"] = r["brickz_url"].replace("/residential/kuala-lumpur/", f"/residential/{st}/")
                if r["brickz_url"] in seen:
                    continue
                seen.add(r["brickz_url"]); r["state"] = st; rows.append(r)
    return rows


def existing_keys():
    have = set()
    for fp in ("real_projects.json", "kl_batch1_site.json"):
        for p in json.loads((APP / "src" / "data" / fp).read_text())["projects"]:
            have |= {p["id"], p["name"].lower()}
    for p in json.loads(K.OUT.read_text())["projects"]:   # all batch-1 records (shown or not)
        have |= {p["id"], p["name"].lower()}
    return have


def batch2_projects():
    have = existing_keys()
    out = []
    for r in brickz_rows_all():
        key = (r["state"], r["town_slug"])
        if key not in TOWNS or "HOSTEL" in r["name"] or r["landed"] or r["tx_count"] < max(K.MIN_TX, B2_MIN_TX) or not r["tx_psf_median"]:
            continue
        pid = "real-" + K.slug(r["name"])
        if pid in have or r["name"].lower() in have:
            continue
        r["id"] = pid
        out.append(r)
    # one record per id (Brickz sometimes lists the same name in two towns: keep the one with more transactions)
    best = {}
    for r in out:
        if r["id"] not in best or r["tx_count"] > best[r["id"]]["tx_count"]:
            best[r["id"]] = r
    return sorted(best.values(), key=lambda r: -r["tx_count"])


# ---------------- town centres ----------------
def nominatim(q, **extra):
    params = {"q": q, "format": "jsonv2", "limit": 5, "countrycodes": "my", "namedetails": 1, **extra}
    return scrape.fetch("https://nominatim.openstreetmap.org/search", kind="json", params=params) or []


def cmd_towns():
    towns = json.loads(TOWNS_FP.read_text()) if TOWNS_FP.exists() else {}
    for (st, ts), (aid, en, zh) in TOWNS.items():
        k = f"{st}/{ts}"
        if k in towns:
            continue
        name = en.split(" (")[0]
        js = nominatim(f"{name}, {'Selangor' if st == 'selangor' else 'Kuala Lumpur'}, Malaysia", limit=1)
        towns[k] = [round(float(js[0]["lat"]), 4), round(float(js[0]["lon"]), 4)] if js else None
        print(k, towns[k], flush=True)
    TOWNS_FP.write_text(json.dumps(towns, indent=1))


def centre(st, ts):
    return json.loads(TOWNS_FP.read_text()).get(f"{st}/{ts}")


# ---------------- Mudah ----------------
def mudah_raw(name, region):
    """First Mudah results page for the project name; returns (items|None, status). Cached by scrape.fetch."""
    url = f"https://www.mudah.my/{region}/apartment-condominium-for-rent"
    html = scrape.fetch(url, params={"q": " ".join(scrape.tokens(name))})
    if html is None:
        return None, "http_error"
    if re.search(r"cf-chl|challenge-platform|captcha", html, re.I) and "ItemList" not in html:
        return None, "challenge"
    items = []
    for m in re.finditer(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', html, re.S):
        try:
            data = json.loads(m.group(1))
        except Exception:
            continue
        for block in data if isinstance(data, list) else [data]:
            if block.get("@type") != "ItemList":
                continue
            for el in block.get("itemListElement", []):
                it = el.get("item", {}); place = it.get("itemOffered", {})
                props = {p.get("name"): p.get("value") for p in place.get("additionalProperty", [])}
                items.append(dict(title=place.get("name", ""), price=scrape.num(str(it.get("price") or "")),
                                  size=scrape.num(str(props.get("Floor Size") or "")),
                                  rooms=scrape.num(str(props.get("Number of Rooms") or "")), url=it.get("url") or place.get("url")))
    return items, "ok"


def too_generic(name):
    """Names with no distinctive word (e.g. "RESIDENSI 1", "DESA SATU") pull in other buildings' ads: skip them."""
    ks = [t for t in K.toks(re.sub(r"\([^)]*\)", "", name)) if t not in GENERIC_OSM and t not in K.GENERIC
          and not t.isdigit() and t not in {"satu", "dua", "tiga", "seksyen", "fasa", "phase"}]
    return not any(len(t) >= 2 for t in ks)


def digits_ok(name, title):
    """Names with a number ("Wangsa Maju Seksyen 1", "Residensi PV 18") need the number next to the same word as in
    the name, so "Seksyen 10" or a "1+1" layout does not count as a match."""
    tt = " " + " ".join(scrape.tokens(title)) + " "
    for v in K.name_variants(name, {}):
        ts = scrape.tokens(v)
        if not any(t.isdigit() for t in ts):
            return True
        ok = True
        for i, t in enumerate(ts):
            if t.isdigit():
                pair = f" {ts[i - 1]} {t} " if i > 0 else (f" {t} {ts[i + 1]} " if len(ts) > 1 else f" {t} ")
                ok &= pair in tt
        if ok:
            return True
    return False


def match_ads(name, items, aliases):
    if too_generic(name):
        return []
    variants = K.name_variants(name, {k.upper(): v for k, v in aliases.items() if not k.startswith("_")})
    keep, seen = [], set()
    for it in items:
        if not (it["price"] and it["size"] and 250 <= it["size"] <= 8000):
            continue
        if not any(scrape.title_matches(v, it["title"]) for v in variants):
            continue
        k = it["url"] or (it["title"], it["price"], it["size"])
        if k in seen:
            continue
        seen.add(k); keep.append(it)
    return keep


def cmd_mudah():
    """Sequential, MUDAH_DELAY s apart. On HTTP 429 nothing is stored, the run waits (2, 4, 8 min) and gives up after
    three 429s in a row; on a challenge page it stops at once. Resumable: re-run to continue."""
    scrape.DELAY["www.mudah.my"] = MUDAH_DELAY
    aliases = json.loads((ROOT / "aliases.json").read_text())
    store = json.loads(MUDAH_FP.read_text()) if MUDAH_FP.exists() else {}
    store = {k: v for k, v in store.items() if v.get("status") == "ok"}
    ps = batch2_projects()
    todo = [p for p in ps if p["id"] not in store]
    print(f"mudah: {len(ps)} batch-2 projects, {len(todo)} to search", flush=True)
    strikes = 0
    i = 0
    while i < len(todo):
        p = todo[i]
        if (ROOT / "STOP_MUDAH").exists():
            print("stop file found"); break
        if too_generic(p["name"]):
            store[p["id"]] = dict(term=None, status="ok", skipped="generic name", n_results=0, ads=[], at=None)
            i += 1; continue
        items, status = mudah_raw(p["name"], p["state"])
        if status == "challenge":
            print("challenge page: stopping (not retried)", flush=True); break
        if status != "ok":
            strikes += 1
            if strikes >= 3:
                print("3 rate-limit responses in a row: stopping; re-run later to continue", flush=True); break
            wait = 120 * 2 ** (strikes - 1)
            print(f"  {status} on {p['name']}: waiting {wait}s", flush=True)
            time.sleep(wait); continue
        strikes = 0
        ads = match_ads(p["name"], items or [], aliases)
        store[p["id"]] = dict(term=" ".join(scrape.tokens(p["name"])), status=status, n_results=len(items or []),
                              ads=[[a["price"], a["size"], a["rooms"], a["url"], a["title"][:140]] for a in ads],
                              at=time.strftime("%Y-%m-%dT%H:%M+08:00"))
        MUDAH_FP.write_text(json.dumps(store, ensure_ascii=False))
        print(f"  {i + 1}/{len(todo)} {p['name']}: {len(ads)} ads / {len(items or [])} results", flush=True)
        i += 1
    MUDAH_FP.write_text(json.dumps(store, ensure_ascii=False))
    print("searched", len(store), "of", len(ps))


# ---------------- coordinates ----------------
GENERIC_OSM = {"pangsapuri", "kondominium", "apartment", "apartments", "condominium", "flat", "rumah", "residensi", "residence",
               "residences", "blok", "block", "flats", "apartmen", "condominiums", "condos", "pangsapuri", "taman", "suites", "the", "jalan", "kampung", "kg", "desa", "menara", "tower"}


def strong_match(project, osm_name):
    """OSM object's own name must carry every distinctive token of a project-name variant (and vice versa for short names)."""
    if not osm_name:
        return False
    ot = set(K.toks(osm_name))
    for v in K.name_variants(project, {}):
        ks = [t for t in K.toks(v) if t not in GENERIC_OSM and t not in K.GENERIC]
        if not ks:
            continue
        if all(t in ot for t in ks) and len([t for t in ot if t not in GENERIC_OSM and t not in K.GENERIC]) <= len(ks) + 2:
            return True
    return False


def geocode_project(name, st, c, extra=False):
    vb = f"{c[1] - RADIUS},{c[0] + RADIUS},{c[1] + RADIUS},{c[0] - RADIUS}"
    qs = []
    for v in K.name_variants(name.title(), {}):
        if v not in qs:
            qs.append(v)
    if extra:   # second pass: distinctive words only ("Flora Damansara Apartment" -> "Flora Damansara")
        qs = []
        for v in K.name_variants(name.title(), {}):
            core = " ".join(t for t in K.toks(v) if t not in GENERIC_OSM and t not in K.GENERIC)
            if core and core not in qs and core != v.lower():
                qs.append(core)
    for q in qs[:3]:
        for js in [nominatim(q, viewbox=vb, bounded=1)]:
            for h in js:
                nm = (h.get("namedetails") or {}).get("name") or h.get("name")
                if h.get("category") in ("highway", "boundary", "place") and h.get("type") not in ("neighbourhood",):
                    continue
                if strong_match(name, nm):
                    lat, lng = float(h["lat"]), float(h["lon"])
                    if math.dist([lat, lng], c) <= RADIUS:
                        return [round(lat, 6), round(lng, 6), f"{h.get('category')}/{h.get('type')}", nm]
    return None


def cmd_geo():
    geo = json.loads(GEO_FP.read_text()) if GEO_FP.exists() else {}
    jobs = []
    for p in batch2_projects():
        c = centre(p["state"], p["town_slug"])
        if c:
            jobs.append((p["id"], p["name"], p["state"], c))
    # batch-1 projects still without coordinates (shown or hidden)
    for p in json.loads(K.OUT.read_text())["projects"]:
        if not p["on_map"]:
            area, c, *_ = K.BATCH1[p["brickz_town"]]
            jobs.append((p["id"], p["name"], "kuala-lumpur", c))
    extra = len(sys.argv) > 2 and sys.argv[2] == "--extra"
    names = {j[0]: j[1] for j in jobs}
    todo = [j for j in jobs if j[0] not in geo] if not extra else \
        [j for j in jobs if not accept_geo(j[1], geo.get(j[0]))]
    print(f"geo: {len(jobs)} jobs, {len(todo)} to do", flush=True)
    for i, (pid, name, st, c) in enumerate(todo):
        g = geocode_project(name, st, c, extra=extra)
        if g or not extra:
            geo[pid] = g
        if i % 10 == 0 or i == len(todo) - 1:
            GEO_FP.write_text(json.dumps(geo, ensure_ascii=False, indent=0))
            print(f"  {i + 1}/{len(todo)} {name}: {geo.get(pid)}", flush=True)
    GEO_FP.write_text(json.dumps(geo, ensure_ascii=False, indent=0))
    print("hits", sum(1 for v in geo.values() if v), "of", len(geo))


GEO_OK = ("building/", "landuse/residential", "landuse/commercial", "place/neighbourhood")


NOT_HOME = re.compile(r"\b(masjid|surau|sekolah|smk|sjk|sk|kuil|temple|church|gereja|tokong|hospital|klinik|clinic|dewan|balai|"
                      r"pejabat|stesen|station|parking|mall|school|kolej|college|universit[iy]|polis|police|bomba|tadika|"
                      r"kindergarten|office|tnb|substation|pencawang|pasar|market|hotel)\b", re.I)
STATION_CODE = re.compile(r"^[A-Z]{2}\d{2}\b")
BAD_BUILDING = {"service", "train_station", "transportation", "mosque", "school", "church", "temple", "hospital", "parking",
                "industrial", "warehouse", "roof", "government", "public", "university", "college", "kindergarten", "civic",
                "religious", "garage", "garages", "shrine", "office", "retail", "hotel"}


# building-type words only; place words (taman, desa, bandar, menara, ...) stay distinctive here
TYPE_WORDS = {"pangsapuri", "apartment", "apartments", "apartmen", "flat", "flats", "condominium", "condominiums", "kondominium",
              "condo", "condos", "residence", "residences", "residensi", "the", "block", "blok", "tower", "towers", "service",
              "serviced", "suites", "suite", "at"}


TOWN_WORDS = {t for v in list(TOWNS.values()) + [(None, b[2]) for b in K.BATCH1.values()] for t in K.toks(v[1])} | {"kl", "ttdi", "pj", "kuala", "lumpur", "selangor"}


OK_EXTRA = TOWN_WORDS | {"phase", "fasa", "luxury", "condominiums", "kondo"}   # the only words an OSM name may add
SKIP_GEO = {"real-kl-gateway", "real-kuala-lumpur-gateway"}   # KL Gateway's point is being fixed separately (PR #5)


def accept_geo(name, g):
    """Second, stricter look at an OSM hit: residential/building objects only (no stations, mosques, schools, car
    parks), and the OSM name may carry at most one distinctive word the project name does not (none for one-word
    names). Numbers count as distinctive ("MKH Boulevard 2" is not "MKH Boulevard")."""
    if not g or not g[2].startswith(GEO_OK):
        return False
    if g[2].startswith("building/") and g[2].split("/", 1)[1] in BAD_BUILDING:
        return False
    if NOT_HOME.search(g[3]) or STATION_CODE.match(g[3]):
        return False
    if g[2] == "place/neighbourhood" and not re.match(r"(TAMAN|DESA|BANDAR|KAMPUNG|SEKSYEN|PANGSAPURI)\b", name.upper()):
        return False
    core = lambda x: {t for t in K.toks(x) if t not in TYPE_WORDS}
    on = core(g[3])
    for v in K.name_variants(name, {}):
        ks = core(v)
        if ks <= TOWN_WORDS:   # "(AMPANG)", "(TTDI)": a town name is not a building name
            continue
        extra = on - ks
        if ks and ks <= on and len(extra) <= (1 if len(ks) >= 2 else 0) and extra <= OK_EXTRA:
            return True
    return False


OVERPASS_FP = CACHE / "overpass_kv_named.json"   # one Overpass query: named residential landuse / buildings / neighbourhoods, KV bbox


def osm_index():
    d = json.loads(OVERPASS_FP.read_text())
    out = []
    for e in d["elements"]:
        t = e.get("tags", {})
        lat, lng = (e.get("lat"), e.get("lon")) if e["type"] == "node" else ((e.get("center") or {}).get("lat"), (e.get("center") or {}).get("lon"))
        if lat is None or not t.get("name"):
            continue
        kind = ("building/" + t["building"]) if "building" in t else ("landuse/" + t["landuse"]) if "landuse" in t else ("place/" + t.get("place", ""))
        out.append((lat, lng, kind, t["name"]))
    return out


def cmd_osm():
    """Match every job still without an accepted point against the Overpass extract (offline). Several hits are
    accepted only when they sit within ~500 m of each other (same estate); otherwise the project stays unmapped."""
    geo = json.loads(GEO_FP.read_text()) if GEO_FP.exists() else {}
    idx = osm_index()
    jobs = []
    for p in batch2_projects():
        c = centre(p["state"], p["town_slug"])
        if c:
            jobs.append((p["id"], p["name"], c))
    for p in json.loads(K.OUT.read_text())["projects"]:
        if not p["on_map"]:
            jobs.append((p["id"], p["name"], K.BATCH1[p["brickz_town"]][1]))
    added = amb = 0
    for pid, name, c in jobs:
        if accept_geo(name, geo.get(pid)):
            continue
        hits = [h for h in idx if math.dist(h[:2], c) <= RADIUS and accept_geo(name, list(h))]
        if not hits:
            continue
        pref = [h for h in hits if not h[2].startswith("place/")] or hits
        if max(math.dist(a[:2], b[:2]) for a in pref for b in pref) > 0.005:
            amb += 1
            continue
        h = min(pref, key=lambda h: (not h[2].startswith(("landuse/residential", "building/")), math.dist(h[:2], c)))
        geo[pid] = [round(h[0], 6), round(h[1], 6), h[2], h[3]]
        added += 1
    GEO_FP.write_text(json.dumps(geo, ensure_ascii=False, indent=0))
    print(f"overpass: {added} new points, {amb} ambiguous (left unmapped), jobs {len(jobs)}")


GEO_DETAIL = "OpenStreetMap object whose own name matches the project (Nominatim / Overpass, inside the Brickz town, 2026-11-25)"


def cmd_patch_b1():
    """Write Nominatim/OSM points into data/kl_batch1.json for batch-1 projects that had no coordinates.
    (kl_expand.py build needs the uncommitted PropertyGuru cache, so the batch-1 file is patched in place;
    then `kl_expand.py site` regenerates the site file with the usual rules.)"""
    geo = json.loads(GEO_FP.read_text())
    kl = json.loads(K.OUT.read_text())
    n = 0
    for p in kl["projects"]:
        g = geo.get(p["id"])
        if not p["on_map"] and p["id"] not in SKIP_GEO and accept_geo(p["name"], g):
            p.update(lat=g[0], lng=g[1], on_map=True, geo_source="osm", geo_precision="building",
                     geo_detail=GEO_DETAIL + f" · {g[3]}")
            n += 1
    kl["summary"]["on_map"] = sum(x["on_map"] for x in kl["projects"])
    K.OUT.write_text(json.dumps(kl, ensure_ascii=False, indent=1))
    print(f"batch 1: {n} projects got coordinates; on map now {kl['summary']['on_map']} of {len(kl['projects'])}")


def cmd_build():
    geo = json.loads(GEO_FP.read_text()) if GEO_FP.exists() else {}
    mudah = json.loads(MUDAH_FP.read_text()) if MUDAH_FP.exists() else {}
    out, keep = [], []
    for p in batch2_projects():
        aid, en, zh = TOWNS[(p["state"], p["town_slug"])]
        m = mudah.get(p["id"])
        typ = K.type_of(p["brickz_type"])
        raw = [dict(price=a[0], size=a[1], rooms=a[2], url=a[3], title=a[4], src="Mudah") for a in (m or {}).get("ads", [])
               if digits_ok(p["name"], a[4])]
        rents, _ = clean_whole_unit_rents(raw, typ=typ, brickz_type=p["brickz_type"])
        gross, net, costs = K.yield_block(p, rents, K.maint_psf(p, aid))
        n = len(rents)
        show = gross is not None and n >= MIN_RENT_ADS
        conf = "high" if n >= 8 and p["tx_count"] >= 15 else "medium" if n >= MIN_RENT_ADS else "low"
        g = geo.get(p["id"]) if accept_geo(p["name"], geo.get(p["id"])) else None
        q = " ".join(scrape.tokens(p["name"]))
        rec = dict(
            id=p["id"], name=p["name"].title(), area=aid, area_en=en, area_zh=zh, brickz_town=en, region="kv",
            state=p["state"], lat=g[0] if g else None, lng=g[1] if g else None, on_map=bool(g),
            geo_source="osm" if g else "none", geo_precision=("estate" if g[2].startswith("place/") else "building") if g else None,
            geo_detail=(GEO_DETAIL + f" · {g[3]}") if g else None,
            excluded=None, rent_method="listings" if show else None, rent_estimate=None,
            tenure=p["tenure"], type=typ, brickz_type=p["brickz_type"],
            tx=dict(psf_median=p["tx_psf_median"], psf_q=p["tx_psf_q"], price_median=p["tx_price_median"],
                    price_q=p["tx_price_q"], count=p["tx_count"], period=p["tx_period"]),
            ask_sale=dict(price_median=None, psf_median=None, count=0),
            ask_rent=dict(count=n, by_source=dict(PropertyGuru=0, Mudah=n),
                          rent_median=costs["ref_rent"] if costs else None, size_median=costs["ref_size"] if costs else None,
                          rent_psf_median=None,
                          samples=[dict(rent=r["price"], size=r["size"], rooms=r["rooms"], src="Mudah") for r in rents][:40]),
            gross_yield=gross if show else None, net_yield=net if show else None, net_costs=costs if show else None,
            gross_yield_vs_asking=None, yield_display=show, confidence=conf if show else "low",
            sources=[dict(name="Brickz.my (transacted)", url=p["brickz_url"]),
                     *([dict(name="Mudah.my (rent listings)", url=f"https://www.mudah.my/{p['state']}/apartment-condominium-for-rent?q=" + "+".join(q.split()))] if n else [])],
            scraped_at=(m or {}).get("at") if n else None, mudah_searched=bool(m), batch="kv-2")
        out.append(rec)
        if rec["on_map"] or show:
            keep.append({k: v for k, v in rec.items() if k not in ("yield_display", "mudah_searched", "state")})
    summary = dict(projects=len(out), mudah_searched=sum(x["mudah_searched"] for x in out),
                   with_rent_ads=sum(1 for x in out if x["ask_rent"]["count"]), on_map=sum(x["on_map"] for x in out),
                   yield_display=sum(x["yield_display"] for x in out), shown_on_site=len(keep),
                   by_area=collections.Counter(x["area_en"] for x in keep))
    OUT.write_text(json.dumps(dict(generated_at=K.NOW.isoformat(timespec="minutes"), batch="kv-2", summary=summary,
                                   projects=out), ensure_ascii=False, indent=1))
    SITE_OUT.write_text(json.dumps(dict(generated_at=K.NOW.isoformat(timespec="minutes"), batch="kv-2", projects=keep),
                                   ensure_ascii=False, separators=(",", ":")))
    print(json.dumps(summary, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    {"towns": cmd_towns, "mudah": cmd_mudah, "geo": cmd_geo, "patch-b1": cmd_patch_b1, "osm": cmd_osm, "build": cmd_build}[sys.argv[1]]()
