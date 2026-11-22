#!/usr/bin/env python3
"""Fetch each Brickz project page (polite, cached) and record the transaction street names.
Output: streets.json {project_id: {"streets": [[street, n], ...], "url": ...}}. Usage: enrich_streets.py [--all]"""
import json, re, sys, collections
from pathlib import Path
import scrape
from bs4 import BeautifulSoup
ROOT = Path(__file__).parent
P = json.loads((ROOT.parent / "data/real_projects.json").read_text())["projects"]
out_fp = ROOT / "streets.json"
out = json.loads(out_fp.read_text()) if out_fp.exists() else {}
want = [p for p in P if p["area"] in ("bss", "sj") and ("--all" in sys.argv or p["geo_source"] == "approx" or not (p.get("ask_rent") or {}).get("count"))]
for p in want:
    if p["id"] in out:
        continue
    url = next((s["url"] for s in p["sources"] if s["name"].startswith("Brickz")), None)
    if not url:
        continue
    h = scrape.fetch(url)
    if not h:
        continue
    txt = BeautifulSoup(h, "lxml").get_text(" ", strip=True)
    st = re.findall(r"×+-?×*,?\s+((?:JALAN|JLN|LORONG|PERSIARAN|LEBUH|LEBUHRAYA|LINGKARAN)\s[A-Z0-9 /'.\-]+?)\s(?=SERVICE|CONDOMINIUM|APARTMENT|FLAT|TERRACE|SEMI|BUNGALOW|CLUSTER|TOWN|\d{2}/)", txt)
    st += re.findall(r"\b((?:JALAN|JLN|PERSIARAN|LORONG)\s(?:USJ|SS|PJS)\s?[0-9A-Z/]+)", txt)
    c = collections.Counter(s.strip() for s in st)
    out[p["id"]] = {"name": p["name"], "streets": c.most_common(5), "url": url}
    out_fp.write_text(json.dumps(out, indent=1))
    print(p["name"], c.most_common(3), flush=True)
