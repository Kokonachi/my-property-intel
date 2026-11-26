#!/usr/bin/env python3
"""Offline checks for scraper/kv_batch2.py and its site file. Run: scraper/.venv/bin/python scripts/test_kv_batch2.py"""
import json, statistics as st, sys
from pathlib import Path
APP = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(APP / "scraper"))
import kl_expand as K
import kv_batch2 as B

# location matching: residential objects whose own name matches; no stations / mosques / other phases
ok = lambda n, o, kind="landuse/residential": B.accept_geo(n, [3.1, 101.7, kind, o])
assert ok("MENARA ALPHA", "Menara Alpha Condominiums")
assert ok("SRI PENARA", "Pangsapuri Sri Penara")
assert not ok("TAMAN PUCHONG PERDANA", "SP28 Puchong Perdana", "building/yes")
assert not ok("TAMAN SAUJANA PUCHONG", "Masjid Saujana Puchong", "building/yes")
assert not ok("BANDAR TASIK SELATAN", "KB04 Bandar Tasik Selatan", "railway/station")
assert not ok("MKH BOULEVARD 2", "MKH Boulevard")
assert not ok("WINNER COURT A", "Winner Court")
assert not ok("TAMAN KAJANG UTAMA", "Residensi Kajang Utama")
assert not ok("TAMAN DESA PERMAI (AMPANG)", "Pangsapuri Permai")
assert not ok("STAR RESIDENCE 1", "Arenaa Star Tower 1", "building/yes")
assert not ok("SAUJANA", "Saujana Akasia")

# Mudah ad matching: numbers must sit next to the same word as in the name
assert B.digits_ok("WANGSA MAJU SEKSYEN 1", "Near LRT Wangsa Maju - Flat Seksyen 1")
assert not B.digits_ok("WANGSA MAJU SEKSYEN 1", "Flat Seksyen 10 Wangsa Maju Depo 1+1")
assert B.too_generic("RESIDENSI 1") and B.too_generic("DESA SATU") and not B.too_generic("SRI PENARA")

# site file: same yield method and threshold as batch 1, no fabricated numbers
site = json.loads((APP / "src/data/kv_batch2_site.json").read_text())["projects"]
ids = [p["id"] for p in site]
assert len(ids) == len(set(ids)), "duplicate ids in batch 2"
have = set()
for fp in ("real_projects.json", "kl_batch1_site.json"):
    have |= {p["id"] for p in json.loads((APP / "src/data" / fp).read_text())["projects"]}
assert not have & set(ids), "batch 2 repeats a project already on the site"
for p in site:
    assert p["on_map"] or p["gross_yield"] is not None
    assert (p["lat"] is None) == (not p["on_map"])
    if p["gross_yield"] is None:
        assert p["net_yield"] is None and p["net_costs"] is None
        continue
    n = p["ask_rent"]["count"]
    assert n >= K.MIN_RENT_ADS and p["gross_yield"] <= B.MAX_GROSS, (p["id"], n)
    exp = st.median([s["rent"] * 12 / (p["tx"]["psf_median"] * s["size"]) * 100 for s in p["ask_rent"]["samples"]]) if n <= 40 else None
    assert exp is None or abs(exp - p["gross_yield"]) <= 0.01, (p["id"], exp, p["gross_yield"])
    assert abs(p["gross_yield"] - sum(p["net_costs"]["pts"].values()) - p["net_yield"]) <= 0.01
areas = {a for a in open(APP / "src/data/properties.js").read().split("id: '")[1:]}
area_ids = {a.split("'")[0] for a in areas}
assert {p["area"] for p in site} <= area_ids, {p["area"] for p in site} - area_ids
print("ok", len(site), "batch-2 projects on the site,", sum(p["gross_yield"] is not None for p in site), "with yield")
