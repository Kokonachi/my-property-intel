#!/usr/bin/env python3
"""Download official PropertyGuru project photos (ZPPHO) at R2000X2000, skip if already saved."""
import hashlib, io, json, re, time
from pathlib import Path
from PIL import Image
from curl_cffi import requests

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw"
MAN = ROOT / "official_downloads.json"
CURATED = json.loads((ROOT / "official_start_urls.json").read_text())["curated"]
# invert url -> [pids]
url_to_pids = {}
for pid, urls in CURATED.items():
    for u in urls:
        url_to_pids.setdefault(u, []).append(pid)

photos = json.loads((ROOT / "official/unique_zppho.json").read_text())
done = json.loads(MAN.read_text()) if MAN.exists() else {"items": []}
seen = {(it["pid"], it["zppho"]) for it in done["items"]}
_last = 0

def get(url):
    global _last
    w = 1.0 - (time.time() - _last)
    if w > 0: time.sleep(w)
    r = requests.get(url, impersonate="chrome", timeout=40, headers={"Referer": "https://www.propertyguru.com.my/"})
    _last = time.time()
    if r.status_code != 200 or not r.headers.get("content-type", "").startswith("image"):
        return None, f"http {r.status_code} {len(r.content)}"
    return r.content, None

n_new = 0
for page_url, ids in photos.items():
    pids = url_to_pids.get(page_url) or []
    if not pids:
        # guess from slug
        slug = page_url.rstrip("/").split("/")[-1]
        pids = [pid for pid, urls in CURATED.items() if any(slug in u for u in urls)]
    if not pids:
        print("no pid for", page_url); continue
    for zp in ids:
        hi = f"https://sg1-cdn.pgimgs.com/{zp}.R2000X2000.jpg"
        for pid in pids:
            if (pid, zp) in seen:
                continue
            data, err = get(hi)
            if not data:
                # fallback 1600 then 1200 then 800
                for sz in ("R1600X1600", "R1200X1200", "R800X800"):
                    data, err = get(f"https://sg1-cdn.pgimgs.com/{zp}.{sz}.jpg")
                    if data: break
            if not data:
                print("FAIL", pid, zp, err); continue
            try:
                im = Image.open(io.BytesIO(data)).convert("RGB")
            except Exception as e:
                print("BAD", pid, e); continue
            w, h = im.size
            digest = hashlib.sha1(data).hexdigest()[:12]
            dest = RAW / pid; dest.mkdir(exist_ok=True)
            fp = dest / f"pg_{digest}_{w}x{h}.jpg"
            im.save(fp, "JPEG", quality=90)
            rec = dict(pid=pid, kind="official", source="propertyguru-project", url=hi,
                       page=page_url, zppho=zp, path=str(fp.relative_to(ROOT)), w=w, h=h, bytes=len(data))
            done["items"].append(rec)
            seen.add((pid, zp))
            n_new += 1
            print(pid, "->", w, "x", h, zp, flush=True)
            MAN.write_text(json.dumps(done, indent=1))

print("NEW", n_new, "TOTAL", len(done["items"]))
