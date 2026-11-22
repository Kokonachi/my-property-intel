#!/usr/bin/env python3
"""Compute STR gross/net for the BSS / KLCC / First Subang (SS15) pilot.

Airbnb room_details and room_calendar returned HTTP 400 in this run, so occupancy
is an area assumption (not calendar-derived). ADR is the median search quote.
"""
from __future__ import annotations
import csv, json, math, re, statistics
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path('/workspace/my-property-intel')
STR = ROOT / 'scraper/str'

# Midweek 3-night snapshot used for the search (Tue–Fri, 8–11 Dec 2026, 2 adults, MYR).
ASSUMED_OCC = {'klcc': 0.60, 'bss': 0.55, 'sj': 0.50}
PLATFORM_FEE = 0.03          # Airbnb host service fee
MGMT_FEE = 0.20              # professional operator / co-host
CLEAN_PER_STAY = 120         # RM
AVG_LOS = 3                  # nights
UTIL_PER_MONTH = 400         # RM, utilities + wifi
FURNISH = {0: 3000, 1: 3000, 2: 4000, 3: 5000}  # RM / year, amortised
DEFAULT_SIZE = {0: 450, 1: 650, 2: 900, 3: 1200, 4: 1400}
ASSESS_RATE = 0.04
QUIT_RENT = 250
MIN_N = 3

def mid(arr):
    arr = [x for x in arr if x is not None]
    if not arr:
        return None
    a = sorted(arr)
    i = len(a) // 2
    return a[i] if len(a) % 2 else (a[i - 1] + a[i]) / 2

def rooms_of(listing):
    name = (listing.get('name') or '') + ' ' + (listing.get('title') or '')
    br = listing.get('bedrooms')
    if br is None:
        if re_studio(name):
            return 0
        return 1
    n = int(round(float(br)))
    return 0 if n <= 0 else n

def re_studio(name):
    import re
    return bool(re.search(r'\bstudio\b|\b套房\b', name, re.I))

def implied_tx_size(project):
    tx = project.get('tx') or {}
    if tx.get('price_median') and tx.get('psf_median'):
        return tx['price_median'] / tx['psf_median']
    return None

def size_for(project, rooms):
    samples = (project.get('ask_rent') or {}).get('samples') or []
    sizes = []
    for s in samples:
        if not s.get('size'):
            continue
        sr = s.get('rooms')
        if sr is None:
            continue
        sr = int(round(float(sr)))
        if (rooms <= 0 and sr <= 0) or sr == rooms:
            sizes.append(float(s['size']))
    if sizes:
        return mid(sizes)
    costs = project.get('net_costs') or {}
    if costs.get('ref_size'):
        return costs['ref_size']
    implied = implied_tx_size(project)
    if implied:
        return implied
    return DEFAULT_SIZE.get(min(rooms, 4), 800)

def maint_psf_for(project):
    costs = project.get('net_costs') or {}
    if costs.get('maint_psf') is not None:
        return costs['maint_psf']
    return {'klcc': 0.45, 'mk': 0.45, 'bb': 0.40, 'bss': 0.35, 'bs': 0.35, 'sj': 0.35}.get(project.get('area'), 0.35)

def costs_and_yields(adr, occ, size, rooms, psf, maint_psf, lt_rent=None):
    value = psf * size if psf and size else None
    if not value:
        return None
    revenue = adr * occ * 365
    platform = revenue * PLATFORM_FEE
    stays = (occ * 365) / AVG_LOS
    cleaning = stays * CLEAN_PER_STAY
    utilities = UTIL_PER_MONTH * 12
    furnish = FURNISH.get(min(max(rooms, 0), 3), 4000)
    mgmt = revenue * MGMT_FEE
    # Assessment is on estimated annual rental value. Use long-term annual rent
    # when we have a size-matched figure; otherwise 50% of STR revenue as ARV.
    if lt_rent:
        assess = ASSESS_RATE * lt_rent * 12
    else:
        assess = ASSESS_RATE * revenue * 0.5
    maint = (maint_psf or 0) * size * 12
    quit = QUIT_RENT
    total = platform + cleaning + utilities + furnish + mgmt + assess + maint + quit
    gross = revenue / value * 100
    net = (revenue - total) / value * 100
    return {
        'value': round(value),
        'revenue': round(revenue),
        'gross': round(gross, 2),
        'net': round(net, 2),
        'costs': {
            'platform': round(platform),
            'cleaning': round(cleaning),
            'utilities': round(utilities),
            'furnish': furnish,
            'management': round(mgmt),
            'assessment': round(assess),
            'maintenance': round(maint),
            'quit_rent_insurance': quit,
            'total': round(total),
        },
    }

def main():
    raw = json.loads((ROOT / 'data/real_projects.json').read_text())
    projects = raw['projects']
    by_id = {p['id']: p for p in projects}
    matches = json.loads((STR / 'matches.json').read_text())
    import sys
    sys.path.insert(0, str(STR))
    from match_listings import dist_km as dkm

    first = (3.077666, 101.586645)
    pilot_ids = []
    for p in projects:
        if p['area'] in ('bss', 'klcc'):
            pilot_ids.append(p['id'])
        elif p.get('lat') and dkm((p['lat'], p['lng']), first) <= 1.3 and p['type'] != 'Landed':
            pilot_ids.append(p['id'])

    out_projects = {}
    for pid in pilot_ids:
        p = by_id[pid]
        block = matches['by_project'].get(pid, {})
        listings = block.get('listings') or []
        occ = ASSUMED_OCC.get(p['area'], 0.55)
        rec = {
            'id': pid,
            'name': re.sub(r'^Kl\b', 'KL', p['name']),
            'area': p['area'],
            'area_zh': p.get('area_zh'),
            'area_en': p.get('area_en'),
            'n': len(listings),
            'occ': occ,
            'occ_source': 'assumed',
            'long_term_gross': p.get('gross_yield'),
            'long_term_net': p.get('net_yield'),
        }
        if len(listings) < MIN_N:
            rec['status'] = 'insufficient'
            rec['listings'] = [{'room_id': L['room_id'], 'name': L['name'], 'adr': L.get('price_per_night'),
                                'bedrooms': L.get('bedrooms'), 'reviews': L.get('review_count')} for L in listings]
            out_projects[pid] = rec
            continue
        adrs = [L['price_per_night'] for L in listings if L.get('price_per_night')]
        rooms_list = [rooms_of(L) for L in listings]
        rooms = int(round(mid(rooms_list)))
        size = size_for(p, rooms)
        # size-matched long-term rent for assessment
        lt_samples = (p.get('ask_rent') or {}).get('samples') or []
        lt_rents = [s['rent'] for s in lt_samples if s.get('rent') and s.get('rooms') is not None
                    and int(round(float(s['rooms']))) == (1 if rooms == 0 else rooms)]
        if not lt_rents:
            lt_rents = [s['rent'] for s in lt_samples if s.get('rent')]
        lt_rent = mid(lt_rents) if lt_rents else p.get('ask_rent', {}).get('rent_median')
        adr = mid(adrs)
        rec.update({
            'adr': round(adr, 2) if adr else None,
            'rooms': rooms,
            'size': round(size) if size else None,
            'psf': p.get('tx', {}).get('psf_median'),
            'listings': [{'room_id': L['room_id'], 'name': L['name'], 'adr': L.get('price_per_night'),
                          'bedrooms': L.get('bedrooms'), 'reviews': L.get('review_count'),
                          'rating': L.get('rating'), 'url': L.get('room_url')} for L in listings],
        })
        psf = rec['psf']
        if not psf or not adr or not size:
            rec['status'] = 'no_tx'
            out_projects[pid] = rec
            continue
        calc = costs_and_yields(adr, occ, size, rooms, psf, maint_psf_for(p), lt_rent)
        rec['status'] = 'ok'
        rec.update(calc)
        rec['lt_rent_used'] = lt_rent
        out_projects[pid] = rec

    payload = {
        'generated_at': datetime.now(timezone.utc).strftime('%Y-%m-%d'),
        'stay': '2026-12-08 to 2026-12-11, 3 nights, 2 adults, MYR, entire home',
        'min_listings': MIN_N,
        'occupancy_note': 'Airbnb room_calendar and room_details still return HTTP 400 / an anti-bot challenge (retried 2026-11-15 with stay dates and MYR), so occupancy is an area assumption (KLCC 60%, Bangsar South 55%, SS15 50%), not calendar availability. Listings are entire-place only; private/shared rooms are excluded.',
        'assumptions': {
            'occupancy': ASSUMED_OCC,
            'platform_fee': PLATFORM_FEE,
            'management_fee': MGMT_FEE,
            'cleaning_rm_per_stay': CLEAN_PER_STAY,
            'avg_length_of_stay_nights': AVG_LOS,
            'utilities_rm_per_month': UTIL_PER_MONTH,
            'furnish_rm_per_year': FURNISH,
            'assessment_rate': ASSESS_RATE,
            'quit_rent_insurance_rm_year': QUIT_RENT,
            'adr_source': 'median Airbnb search quote for the stay above',
        },
        'search_listings': matches.get('n_unique_listings'),
        'matched_listings': matches.get('n_matched'),
        'projects': out_projects,
    }
    (ROOT / 'src/data/str_pilot.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2))
    (ROOT / 'data').mkdir(exist_ok=True)

    fields = ['project_id', 'project', 'area', 'status', 'n_airbnb', 'adr_rm', 'occupancy', 'occ_source',
              'unit_rooms', 'unit_sqft', 'value_rm', 'str_revenue_rm', 'str_gross_pct', 'str_net_pct',
              'lt_gross_pct', 'lt_net_pct',
              'cost_platform', 'cost_cleaning', 'cost_utilities', 'cost_furnish', 'cost_management',
              'cost_assessment', 'cost_maintenance', 'cost_quit_rent', 'cost_total']
    rows = []
    for pid in pilot_ids:
        r = out_projects[pid]
        c = r.get('costs') or {}
        rows.append({
            'project_id': pid,
            'project': r['name'],
            'area': r['area'],
            'status': r['status'],
            'n_airbnb': r['n'],
            'adr_rm': r.get('adr'),
            'occupancy': r.get('occ'),
            'occ_source': r.get('occ_source'),
            'unit_rooms': r.get('rooms'),
            'unit_sqft': r.get('size'),
            'value_rm': r.get('value'),
            'str_revenue_rm': r.get('revenue'),
            'str_gross_pct': r.get('gross'),
            'str_net_pct': r.get('net'),
            'lt_gross_pct': r.get('long_term_gross'),
            'lt_net_pct': r.get('long_term_net'),
            'cost_platform': c.get('platform'),
            'cost_cleaning': c.get('cleaning'),
            'cost_utilities': c.get('utilities'),
            'cost_furnish': c.get('furnish'),
            'cost_management': c.get('management'),
            'cost_assessment': c.get('assessment'),
            'cost_maintenance': c.get('maintenance'),
            'cost_quit_rent': c.get('quit_rent_insurance'),
            'cost_total': c.get('total'),
        })
    with (ROOT / 'data/str_pilot.csv').open('w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)

    print(f'wrote {len(rows)} rows')
    for r in rows:
        if r['status'] == 'ok':
            print(f"  OK  n={r['n_airbnb']:2}  STR {r['str_gross_pct']}/{r['str_net_pct']}  LT {r['lt_gross_pct']}/{r['lt_net_pct']}  ADR {r['adr_rm']} occ {r['occupancy']}  {r['project']}")
        else:
            print(f"  {r['status']:12} n={r['n_airbnb']:2}  {r['project']}")

if __name__ == '__main__':
    main()
