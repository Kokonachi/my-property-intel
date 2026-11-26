#!/usr/bin/env python3
"""Coverage audit: what the site shows per area vs the Brickz universe (non-landed, >= 5 transactions).
Usage: scraper/.venv/bin/python scripts/audit_data_gaps.py [git-ref]   (default: working tree)"""
import json, subprocess, sys, collections
from pathlib import Path
APP = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(APP / "scraper"))
import kl_expand as K
import kv_batch2 as B

ref = sys.argv[1] if len(sys.argv) > 1 else None


def load(rel):
    if ref:
        try:
            return json.loads(subprocess.check_output(["git", "-C", str(APP), "show", f"{ref}:{rel}"], stderr=subprocess.DEVNULL))
        except subprocess.CalledProcessError:
            return {"projects": []}
    fp = APP / rel
    return json.loads(fp.read_text()) if fp.exists() else {"projects": []}


ps = []
for rel in ("src/data/real_projects.json", "src/data/kl_batch1_site.json", "src/data/kv_batch2_site.json"):
    ps += load(rel)["projects"]
photos = load("src/data/photos.json")
# Brickz universe per app area (KL batch-1 towns + batch-2 towns)
uni = collections.Counter()
town_area = {("kuala-lumpur", k): (v[0], v[2]) for k, v in K.BATCH1.items()}
town_area.update({k: (v[0], v[1]) for k, v in B.TOWNS.items()})
for r in B.brickz_rows_all():
    a = town_area.get((r["state"], r["town_slug"]))
    if a and not r["landed"] and r["tx_count"] >= K.MIN_TX:
        uni[a[1]] += 1
rows = collections.defaultdict(lambda: collections.Counter())
for p in ps:
    en = p["area_en"].replace("KL City Centre / KLCC", "KL City Centre")
    c = rows[en]
    c["projects"] += 1
    c["mapped"] += bool(p.get("lat") is not None)
    c["yield"] += p.get("gross_yield") is not None
    c["rent_ads"] += bool(p["ask_rent"].get("count"))
    c["photo"] += p["id"] in photos
tot = collections.Counter()
for c in rows.values():
    tot.update(c)
print(f"TOTAL projects={tot['projects']} mapped={tot['mapped']} yield={tot['yield']} with_rent_ads={tot['rent_ads']} photo={tot['photo']}")
names = sorted(set(rows) | set(uni), key=lambda n: -max(uni.get(n, 0), rows[n]["projects"]))
print("| area | Brickz (non-landed, >=5 tx) | on site | mapped | yield | photo |")
print("|---|---|---|---|---|---|")
for n in names:
    c = rows[n]
    print(f"| {n} | {uni.get(n, '-')} | {c['projects']} | {c['mapped']} | {c['yield']} | {c['photo']} |")
