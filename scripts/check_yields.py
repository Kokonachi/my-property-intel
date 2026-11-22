#!/usr/bin/env python3
"""Consistency checks on src/data/real_projects.json (run after scraper/run.sh; exits 1 on failure).
- gross = median over rent ads of rent×12 ÷ (Brickz median psf × that ad's size)   (landed estimate: rent×12 ÷ median price)
- net   = gross − vacancy − assessment − maintenance − quit rent/insurance, all on the same value basis (±0.01)
- PropertyGuru / Mudah source links must search for the project's own name."""
import json, statistics as st, sys
from urllib.parse import urlparse, parse_qs
P = json.load(open(__file__.rsplit('/', 2)[0] + '/src/data/real_projects.json'))['projects']
bad = []
for p in P:
    g, n, c = p['gross_yield'], p.get('net_yield'), p.get('net_costs')
    if g is None:
        if n is not None: bad.append((p['id'], 'net without gross'))
        continue
    if p.get('rent_estimate'):
        exp = p['rent_estimate']['rent'] * 12 / p['tx']['price_median'] * 100
    else:
        exp = st.median([s['rent'] * 12 / (p['tx']['psf_median'] * s['size']) * 100 for s in p['ask_rent']['samples']]) if p['ask_rent']['count'] <= 40 else None
    if exp is not None and abs(exp - g) > 0.01: bad.append((p['id'], f'gross {g} != {exp:.3f}'))
    exp_n = g - sum(c['pts'].values())
    if abs(exp_n - n) > 0.01: bad.append((p['id'], f'net {n} != {exp_n:.3f}'))
    if not (0 < g - n < 3): bad.append((p['id'], f'gross-net gap {g - n:.2f} outside 0–3 pts'))
    for s in p['sources']:
        if 'propertyguru' in s['url']:
            q = parse_qs(urlparse(s['url']).query).get('freetext', [''])[0].lower()
            if q != p['name'].lower(): bad.append((p['id'], f'PG link searches "{q}"'))
print(f'checked {len(P)} projects, {sum(1 for p in P if p["gross_yield"] is not None)} with yield; failures: {len(bad)}')
for b in bad[:30]: print('  FAIL', *b)
sys.exit(1 if bad else 0)
