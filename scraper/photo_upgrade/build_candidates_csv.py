#!/usr/bin/env python3
"""Build the reviewable KL+Selangor candidates CSV and per-area summary from brickz_rows.jsonl.
Excludes non-residential types. Does not touch the live site data."""
import csv, json, re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROJ = ROOT.parents[1]
ROWS = ROOT / "brickz_rows.jsonl"
OUT = PROJ / "data" / "kl_selangor_candidates.csv"
SUM = PROJ / "data" / "kl_selangor_area_summary.csv"
NONRES = re.compile(r"\b(shop|office|industrial|commercial|retail|factory|warehouse|shop-?office)\b", re.I)

rows = [json.loads(l) for l in ROWS.read_text().splitlines() if l.strip()]
kept = []
dropped = 0
for r in rows:
    if NONRES.search(r.get("type") or ""):
        dropped += 1
        continue
    kept.append(r)

# stable order: state, town, name, type
kept.sort(key=lambda r: (r["state"], r["town"], r["name"], r["type"]))

OUT.parent.mkdir(parents=True, exist_ok=True)
fields = ["project_name", "town_area", "state", "type", "tenure", "brickz_tx_count", "latest_tx_date", "brickz_url"]
with OUT.open("w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fields)
    w.writeheader()
    for r in kept:
        w.writerow({
            "project_name": r["name"],
            "town_area": r["town"],
            "state": r["state"],
            "type": r["type"],
            "tenure": r["tenure"],
            "brickz_tx_count": r["tx_count"],
            "latest_tx_date": r["latest_tx_date"],  # end of Brickz filed-transaction period (ISO)
            "brickz_url": r["brickz_url"],
        })

# per-area summary: area = "TOWN, STATE"
areas = defaultdict(list)
for r in kept:
    areas[(r["town"], r["state"])].append(r)

# top 3 examples: highest tx_count
sum_rows = []
for (town, state), items in areas.items():
    items_sorted = sorted(items, key=lambda r: -r["tx_count"])
    examples = "; ".join(f"{x['name']} ({x['tx_count']})" for x in items_sorted[:3])
    sum_rows.append({
        "area": town,
        "state": state,
        "project_count": len(items),
        "top_3_examples": examples,
    })
sum_rows.sort(key=lambda r: (-r["project_count"], r["state"], r["area"]))
with SUM.open("w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["area", "state", "project_count", "top_3_examples"])
    w.writeheader()
    for r in sum_rows:
        w.writerow(r)

print(f"rows_in={len(rows)} kept={len(kept)} dropped_nonres={dropped}")
print(f"KL={sum(1 for r in kept if r['state']=='Kuala Lumpur')} Selangor={sum(1 for r in kept if r['state']=='Selangor')}")
print(f"areas={len(sum_rows)} csv={OUT} summary={SUM}")
