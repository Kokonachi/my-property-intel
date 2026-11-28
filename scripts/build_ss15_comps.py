#!/usr/bin/env python3
"""Build src/data/ss15_launch_comps.json for HAUS ON 15 (SS15 Subang Jaya) from data already in the repo.

No network access, no new Brickz / Mudah / PropertyGuru requests: it only re-reads the cached project
records in src/data/{real_projects,kl_batch1_site,kv_batch2_site}.json (Brickz transacted psf, Mudah /
PropertyGuru asking rents already collected earlier).

Comparable set = completed, FREEHOLD high-rise (Condo / Serviced Residence) projects within RADIUS_KM of the
SS15 LRT station (OSM way 407156837 "KJ29 SS15"), excluding landed and low-cost flats.
  * resale psf  : projects with >= MIN_TX cached Brickz transactions
  * gross yield : projects with >= 3 own rent ads (same rule as areaCompletedStats on the site)
  * rent bands  : individual asking-rent ads of all set members, one band per unit size, +-15% widened to
                  +-20% / +-25% until >= 5 ads (4 ads at +-25%) - same method as bss_launch_comps.json.
"""
import json, math, statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
D = ROOT / 'src' / 'data'
REF = (3.0756959, 101.5861786)   # OSM way 407156837, KJ29 SS15 LRT station centre
RADIUS_KM = 1.5
MIN_TX = 4
SIZES = [690, 830, 905, 960, 980]
HIGH = {'Condo', 'Serviced Residence'}


def km(lat, lng):
    return math.hypot((lat - REF[0]) * 111.0, (lng - REF[1]) * 111.0 * math.cos(math.radians(REF[0])))


def med(a):
    return statistics.median(a) if a else None


projects = []
for f in ('real_projects', 'kl_batch1_site', 'kv_batch2_site'):
    projects += json.loads((D / f'{f}.json').read_text())['projects']

members = []
for p in projects:
    if p.get('lat') is None or p.get('excluded'):
        continue
    if p.get('type') not in HIGH or 'flat' in (p.get('brickz_type') or '').lower() or 'flat' in p['name'].lower():
        continue
    if 'free' not in (p.get('tenure') or '').lower():
        continue
    d = km(p['lat'], p['lng'])
    if d > RADIUS_KM:
        continue
    members.append((d, p))
members.sort(key=lambda x: x[0])

rows = []
for d, p in members:
    ar, tx = p['ask_rent'], p['tx']
    rows.append({
        'id': p['id'], 'name': p['name'], 'distance_km': round(d, 2),
        'tx_count': tx['count'], 'tx_period': tx['period'], 'psf_median': tx['psf_median'],
        'rent_ads': ar['count'], 'rent_psf_median': ar.get('rent_psf_median'), 'gross_yield': p.get('gross_yield'),
    })

psf_set = [r for r in rows if r['tx_count'] >= MIN_TX and r['psf_median']]
gross_set = [r for r in rows if r['rent_ads'] >= 3 and r['gross_yield'] is not None]
nearest = psf_set[0]

# individual ads, de-duplicated within a project on (size, rent)
ads = []
for d, p in members:
    seen = set()
    for s in p['ask_rent']['samples']:
        if not s.get('size') or not s.get('rent'):
            continue
        key = (s['size'], s['rent'])
        if key in seen:
            continue
        seen.add(key)
        ads.append({'project': p['name'].replace('Ss ', 'SS ').replace('Ss', 'SS'), 'size': s['size'], 'rent': s['rent'],
                    'rooms': s.get('rooms'), 'src': s.get('src'), 'psf': round(s['rent'] / s['size'], 2)})

bands = {}
for size in SIZES:
    chosen = None
    for tol in (15, 20, 25):
        sel = [a for a in ads if abs(a['size'] - size) <= size * tol / 100]
        need = 5 if tol < 25 else 4
        if len(sel) >= need:
            chosen = (tol, sel)
            break
        last = (tol, sel)
    tol, sel = chosen or last
    ok = chosen is not None
    projs = {}
    for a in sel:
        projs[a['project']] = projs.get(a['project'], 0) + 1
    bands[str(size)] = {
        'size': size, 'tol_pct': tol if ok else None, 'n': len(sel) if ok else 0,
        'n_near_if_insufficient': 0 if ok else len(sel),
        'rent_psf_median': round(med([a['psf'] for a in sel]), 2) if ok else None,
        'rent_median': round(med([a['rent'] for a in sel])) if ok else None,
        'sufficient': ok, 'projects': projs,
        'listings': sorted(sel, key=lambda a: abs(a['size'] - size)),
        'note': None if ok else 'Fewer than 4 asking-rent ads within ±25% of this size. Headline yield uses the nearby project-median rent psf instead, and is flagged.',
    }

proj_rent_psf = [r['rent_psf_median'] for r in rows if r['rent_ads'] >= 3 and r['rent_psf_median']]
out = {
    'research_date': '2026-11-28',
    'area': 'ss15', 'area_en': 'SS15 Subang Jaya', 'area_zh': 'SS15 梳邦再也',
    'resale': {
        'method': f'Completed freehold high-rise (Condo / Serviced Residence) projects within {RADIUS_KM} km of SS15 LRT station (OSM KJ29 SS15), landed and low-cost flats excluded. Transacted psf is the cached Brickz median (Aug 2025 – Jul 2026); no new Brickz requests. Resale psf needs >= {MIN_TX} cached transactions per project; gross yield needs >= 3 own rent ads.',
        'ref_point': {'lat': REF[0], 'lng': REF[1], 'source': 'OSM way 407156837 (KJ29 SS15 station)'},
        'radius_km': RADIUS_KM, 'min_tx': MIN_TX,
        'n_projects': len(psf_set), 'median_psf': round(med([r['psf_median'] for r in psf_set])),
        'psf_min': min(r['psf_median'] for r in psf_set), 'psf_max': max(r['psf_median'] for r in psf_set),
        'n_gross_projects': len(gross_set), 'median_gross': round(med([r['gross_yield'] for r in gross_set]), 2),
        'nearest': nearest,
        'projects': psf_set, 'gross_projects': gross_set,
        'in_radius_not_used': [r for r in rows if r not in psf_set],
    },
    'comparables': {
        'method': 'Asking-rent ads (Mudah / PropertyGuru, collected earlier) of the same freehold high-rise projects within 1.5 km of SS15 LRT. Duplicate ads inside one project (same size + rent) counted once. Band is ±15% of the unit size when at least 5 ads exist; otherwise widened to ±20% then ±25% until at least 5 (or 4 at ±25%).',
        'n_listings_primary': len(ads), 'n_projects_non_flat': len({a['project'] for a in ads}),
        'area_project_median_rent_psf': round(med(proj_rent_psf), 2),
        'area_project_median_note': f'Median of each nearby project\'s own rent_psf_median (projects with >= 3 own rent ads, n={len(proj_rent_psf)}).',
        'samples_primary': ads,
    },
    'net_yield_method': {
        'vacancy_months': 1, 'assessment_rate': 0.04, 'fixed_rm_yr_strata': 250, 'maint_psf_assumption': 0.35,
        'note': 'Same method as the live map. Maintenance RM0.35 psf/month is the map assumption for Subang Jaya condos (no fee is stated in the sales kit).',
    },
    'bands': bands,
}
(D / 'ss15_launch_comps.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
print('members', len(rows), 'psf_set', len(psf_set), 'gross_set', len(gross_set), 'ads', len(ads))
for r in rows:
    print(r['distance_km'], r['name'][:34], r['tx_count'], r['psf_median'], r['rent_ads'], r['gross_yield'], 'USED' if r in psf_set else '')
print('median psf', out['resale']['median_psf'], 'median gross', out['resale']['median_gross'], 'proj rent psf', out['comparables']['area_project_median_rent_psf'])
for s, b in bands.items():
    print(s, b['sufficient'], b['tol_pct'], b['n'], b['n_near_if_insufficient'], b['rent_psf_median'], b['projects'])
