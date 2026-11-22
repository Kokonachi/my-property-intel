#!/usr/bin/env python3
import json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parent
OFF = ROOT / "official"
urls = json.loads((ROOT/"official_start_urls.json").read_text())["urls"]
slug_to_url = {u.rstrip("/").split("/")[-1]: u for u in urls}
zppho = json.loads((OFF/"unique_zppho.json").read_text()) if (OFF/"unique_zppho.json").exists() else {}
pat_zp = re.compile(r"projectnet-project/(\d+)/ZPPHO\.(\d+)")
req_re = re.compile(r"url=https%3A%2F%2Fwww.propertyguru.com.my%2Fcondo%2F([a-z0-9\-]+)")
assets_dir = Path("/cursor/stores/user/grok-bot/agents/94bec3f6-f568-48d3-a33f-55e93a09dad7/assets")
new = 0
for p in sorted(assets_dir.glob("*.txt"), key=lambda x: x.stat().st_mtime):
    text = p.read_text(errors="ignore")
    m = req_re.search(text)
    if not m: continue
    slug = m.group(1)
    if slug not in slug_to_url: continue
    url = slug_to_url[slug]
    text_u = text.replace("\\/","/")
    ids=[]; seen=set()
    for mm in pat_zp.finditer(text_u):
        key=f"projectnet-project/{mm.group(1)}/ZPPHO.{mm.group(2)}"
        if key not in seen:
            seen.add(key); ids.append(key)
    prev = zppho.get(url)
    if prev is not None and len(ids) <= len(prev):
        continue
    zppho[url] = ids
    (OFF/f"{slug}.txt").write_text(text)
    print("ADD", slug, "ZPPHO", len(ids), "was", 0 if prev is None else len(prev))
    new += 1
(OFF/"unique_zppho.json").write_text(json.dumps(zppho, indent=1))
print("PAGES", len(zppho), "PHOTOS", sum(len(v) for v in zppho.values()), "new/updated", new)
