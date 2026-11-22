#!/usr/bin/env python3
"""Export visually-approved hero exteriors to public/photos and rewrite photos.json.
Projects without an approved hero get no entry (typographic card). Old interiors are not reused."""
import json, shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent
PROJ = ROOT.parents[1]  # my-property-intel
RAW = ROOT / "raw"
PICKS = json.loads((ROOT / "hero_picks.json").read_text())
CURATED = json.loads((ROOT / "official_start_urls.json").read_text())["curated"]
OUT_DIR = PROJ / "public" / "photos"
OUT_DIR.mkdir(parents=True, exist_ok=True)
PHOTOS_JSON = PROJ / "src" / "data" / "photos.json"

# backup once
bak = PROJ / "src" / "data" / "photos.json.bak-pre-upgrade"
if not bak.exists() and PHOTOS_JSON.exists():
    shutil.copy(PHOTOS_JSON, bak)

photos = {}
for pid, rec in PICKS.items():
    if not rec.get("file"):
        continue
    src = RAW / pid / rec["file"]
    if not src.exists():
        print("MISSING", pid, rec["file"])
        continue
    im = Image.open(src).convert("RGB")
    w, h = im.size
    max_side = 1000
    if max(w, h) > max_side:
        scale = max_side / max(w, h)
        im = im.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
        w, h = im.size
    dest = OUT_DIR / f"{pid}.webp"
    im.save(dest, "WEBP", quality=82, method=6)
    page = (CURATED.get(pid) or [None])[0]
    photos[pid] = {
        "src": f"photos/{pid}.webp",
        "kind": rec.get("kind") or "exterior",
        "source": "PropertyGuru project",
        "url": page,
        "w": w,
        "h": h,
    }
    print(pid, rec["kind"], w, "x", h, dest.stat().st_size)

PHOTOS_JSON.write_text(json.dumps(photos, indent=2, ensure_ascii=False) + "\n")
print("WROTE", PHOTOS_JSON, "entries", len(photos), "text-cards-explicit", sum(1 for r in PICKS.values() if not r.get("file")))
