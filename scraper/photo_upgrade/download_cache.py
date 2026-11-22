#!/usr/bin/env python3
"""Download high-res labelled listing photos already present in the PG/Mudah caches."""
import hashlib, io, json, re, sys, time
from pathlib import Path
from PIL import Image
from curl_cffi import requests

ROOT = Path(__file__).resolve().parent
SCRAPER = ROOT.parent
APP = SCRAPER.parent
sys.path.insert(0, str(SCRAPER))
import scrape

RAW = ROOT / "raw"
RAW.mkdir(exist_ok=True)
MAN = ROOT / "cache_downloads.json"
EXTERIOR_RE = re.compile(r"exterior|facade|façade|building|tower|aerial|main entrance|entrance|compound|surrounding|street view|curb", re.I)
FACILITY_RE = re.compile(r"swimming|pool|lobby|facilit|garden|gym|clubhouse|courtyard|drop.?off|podium", re.I)
SKIP_RE = re.compile(r"floor plan|site plan|brochure|layout|bathroom|toilet|kitchen|bedroom|dining|living|interior|master|walk-in|wardrobe|balcony view from unit", re.I)
PG_UPHO = re.compile(r"(https://[^/]+/listing/\d+/(UPHO\.\d+))(?:\.V\d+)?")

done = json.loads(MAN.read_text()) if MAN.exists() else {"items": []}
seen = {(it["pid"], it["url"]) for it in done["items"]}
_last = {}

def get(url, referer):
    host = re.match(r"https?://([^/]+)", url).group(1)
    w = 1.2 - (time.time() - _last.get(host, 0))
    if w > 0: time.sleep(w)
    try:
        r = requests.get(url, impersonate="chrome", timeout=40, headers={"Referer": referer})
    except Exception as e:
        _last[host] = time.time(); return None, str(e)
    _last[host] = time.time()
    if r.status_code != 200 or not r.headers.get("content-type", "").startswith("image"):
        return None, f"http {r.status_code}"
    return r.content, None

def hi_res_pg(src):
    m = PG_UPHO.search(src or "")
    return m.group(1) if m else src  # bare UPHO path is ~1024px

def label_kind(alt):
    alt = alt or ""
    room = (re.search(r" - ([^-]+) - PropertyGuru", alt) or [None, alt])[1]
    blob = f"{room} {alt}"
    if SKIP_RE.search(blob) and not EXTERIOR_RE.search(blob) and not FACILITY_RE.search(blob):
        return "skip", room
    if EXTERIOR_RE.search(blob): return "exterior", room
    if FACILITY_RE.search(blob): return "facility", room
    return "unknown", room

def save_item(pid, kind, source, url, page, data, alt):
    try:
        im = Image.open(io.BytesIO(data)).convert("RGB")
    except Exception:
        return None
    w, h = im.size
    if max(w, h) < 800:
        return None
    digest = hashlib.sha1(data).hexdigest()[:12]
    dest = RAW / pid
    dest.mkdir(exist_ok=True)
    fp = dest / f"{source[:2]}_{kind}_{digest}_{w}x{h}.jpg"
    im.save(fp, "JPEG", quality=90)
    rec = dict(pid=pid, kind=kind, source=source, url=url, page=page, alt=alt,
               path=str(fp.relative_to(ROOT)), w=w, h=h, bytes=len(data))
    done["items"].append(rec)
    return rec

P = json.loads((APP / "data/real_projects.json").read_text())["projects"]
n_new = 0
for p in P:
    cards, _ = scrape.pg_rents(p["name"].upper())
    # unique images, exteriors first
    cands = []
    for c in cards:
        for src, alt in c.get("images") or []:
            kind, room = label_kind(alt)
            if kind == "skip":
                continue
            if "image-fallback" in (src or "") or src.endswith(".svg"):
                continue
            url = hi_res_pg(src)
            pri = 0 if kind == "exterior" else 1 if kind == "facility" else 2
            cands.append((pri, kind, url, c.get("url"), room))
    # dedupe url, keep best label
    best = {}
    for pri, kind, url, page, room in sorted(cands):
        best.setdefault(url, (pri, kind, page, room))
    # cap: 8 exteriors/facilities, only 2 unknown
    kept, n_unk = [], 0
    for url, (pri, kind, page, room) in best.items():
        if kind == "unknown":
            if n_unk >= 2: continue
            n_unk += 1
        kept.append((pri, kind, url, page, room))
        if len(kept) >= 8:
            break
    for pri, kind, url, page, room in sorted(kept):
        if (p["id"], url) in seen:
            continue
        data, err = get(url, "https://www.propertyguru.com.my/")
        rec = data and save_item(p["id"], kind, "propertyguru-listing", url, page, data, room)
        if rec:
            n_new += 1
            print(p["name"], "->", rec["kind"], rec["w"], rec["h"], flush=True)
        else:
            print(p["name"], "fail", kind, err or "small", url[-60:], flush=True)
        seen.add((p["id"], url))
        MAN.write_text(json.dumps(done, indent=1))

print("NEW", n_new, "TOTAL", len(done["items"]))
