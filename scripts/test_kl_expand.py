#!/usr/bin/env python3
"""Unit checks for scraper/kl_expand.py (offline). Run: scraper/.venv/bin/python scripts/test_kl_expand.py"""
import json, sys, tempfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scraper"))
import kl_expand as K

# Brickz cached pages parse and batch-1 filter holds
rows = K.brickz_rows()
assert len(rows) >= 1400, len(rows)
b1 = K.batch1_projects(rows)
assert all(not r["landed"] and r["tx_count"] >= K.MIN_TX and r["town_slug"] in K.BATCH1 for r in b1)
assert all(r["tx_psf_median"] for r in b1), "every batch-1 project needs a median psf"

# matching: exact slug, shared condo for the KL Gateway records, ambiguous names stay unmatched
by_slug, by_core = K.condo_index()
al = json.loads((K.ROOT / "aliases.json").read_text())
m = lambda n: K.match_condo({"name": n}, by_slug, by_core, al, {})
assert m("KL GATEWAY")[0]["id"] == m("KUALA LUMPUR GATEWAY")[0]["id"] == "8093"
assert m("BOULEVARD")[0] is None

# listing de-dup by URL
with tempfile.TemporaryDirectory() as d:
    K.PG_DIR = Path(d)
    (Path(d) / "1.json").write_text(json.dumps({"condo_id": "1", "listings": [{"url": "a", "price": 1}, {"url": "a", "price": 1}, {"url": "b", "price": 2}]}))
    assert len(K.load_pg("1")["listings"]) == 2

# yield: same method as scrape.py (per-ad size-matched gross, net = gross − cost points)
p = {"tx_psf_median": 600}
g, n, c = K.yield_block(p, [{"price": 2400, "size": 800}, {"price": 3000, "size": 1000}], 0.35)
assert g == 6.0 and abs(g - sum(c["pts"].values()) - n) < 0.01 and 0 < g - n < 3, (g, n, c)
print("ok", len(rows), "brickz rows,", len(b1), "batch-1 projects")
