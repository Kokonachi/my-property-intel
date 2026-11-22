#!/usr/bin/env python3
"""Re-filter rent samples (drop room rentals) and recompute gross/net without re-scraping."""
from __future__ import annotations
import json, re, statistics as st, sys
from copy import deepcopy
from pathlib import Path

ROOT = Path('/workspace/my-property-intel')
sys.path.insert(0, str(ROOT / 'scraper'))
from room_filter import is_room_rental  # noqa: E402

VACANCY_MONTHS = 1
ASSESS_RATE = 0.04
MAINT_AREA = {'klcc': 0.45, 'bb': 0.40, 'mk': 0.45, 'bs': 0.35, 'bss': 0.35, 'sj': 0.35}


def num(x):
    if x is None:
        return None
    m = re.search(r'[\d.]+', str(x).replace(',', ''))
    return float(m.group()) if m else None


def median(xs):
    return st.median(xs) if xs else None


def maint_psf(p):
    if p.get('type') == 'Landed':
        return 0.0
    bt = (p.get('brickz_type') or '').lower()
    if 'flat' in bt:
        return 0.12
    if bt == 'apartment':
        return 0.25
    return MAINT_AREA.get(p.get('area'), 0.40)


def load_title_catalog():
    cache = ROOT / 'scraper/cache'
    catalog = []
    for fp in cache.glob('*.html'):
        t = fp.read_text(errors='ignore')
        if 'application/ld+json' not in t:
            continue
        for m in re.finditer(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', t, re.S):
            try:
                data = json.loads(m.group(1))
            except Exception:
                continue
            for block in data if isinstance(data, list) else [data]:
                if not isinstance(block, dict) or block.get('@type') != 'ItemList':
                    continue
                for el in block.get('itemListElement', []):
                    it = el.get('item', {}) or {}
                    place = it.get('itemOffered', {}) or {}
                    props = {pr.get('name'): pr.get('value') for pr in place.get('additionalProperty', [])}
                    catalog.append(dict(
                        title=place.get('name', '') or it.get('name', ''),
                        price=num(it.get('price')),
                        size=num(props.get('Floor Size')),
                        rooms=num(props.get('Number of Rooms')),
                    ))
    pgdir = cache / 'pg'
    if pgdir.exists():
        try:
            from lxml import html as LH
        except ImportError:
            LH = None
        if LH:
            for f in pgdir.glob('rent-*.html'):
                try:
                    tree = LH.fromstring(f.read_text(errors='ignore'))
                except Exception:
                    continue
                for card in tree.xpath('//*[@da-id="parent-listing-card-v2-regular"]'):
                    g = lambda k: (lambda e: e[0].text_content().strip() if e else None)(card.xpath(f'.//*[@da-id="{k}"]'))
                    title, price, area = g('listing-card-v2-title'), g('listing-card-v2-price'), g('listing-card-v2-area')
                    if not (title and price and area):
                        continue
                    beds = g('listing-card-v2-bedrooms')
                    catalog.append(dict(
                        title=title,
                        price=num((price or '').split('/')[0]),
                        size=num((area or '').split('sqft')[0]),
                        rooms=num(((beds or '').split('+')[0])) if beds else None,
                    ))
    return catalog


def attach_title(s, catalog):
    if s.get('title'):
        return s['title']
    hits = [c['title'] for c in catalog
            if c.get('price') == s.get('rent') and c.get('size') == s.get('size') and c.get('title')]
    # prefer a title that mentions room keywords if any, else first
    if not hits:
        return ''
    from room_filter import title_says_room
    roomish = [t for t in hits if title_says_room(t)]
    return roomish[0] if roomish else hits[0]


def recompute_project(p, catalog):
    before = dict(gross=p.get('gross_yield'), net=p.get('net_yield'), n=(p.get('ask_rent') or {}).get('count'),
                  rent=(p.get('ask_rent') or {}).get('rent_median'), size=(p.get('ask_rent') or {}).get('size_median'))
    if p.get('excluded') or p.get('rent_method') == 'area_comps':
        return p, before, before, []
    samples = deepcopy((p.get('ask_rent') or {}).get('samples') or [])
    typ, bt = p.get('type'), p.get('brickz_type')
    kept, dropped = [], []
    for s in samples:
        s['title'] = attach_title(s, catalog)
        rec = dict(price=s['rent'], size=s['size'], rooms=s.get('rooms'), title=s['title'])
        drop, reason = is_room_rental(rec, typ=typ, brickz_type=bt)
        if drop:
            dropped.append(dict(rent=s['rent'], size=s['size'], rooms=s.get('rooms'), src=s.get('src'),
                                title=s['title'], reason=reason))
        else:
            kept.append(s)

    tx = p.get('tx') or {}
    psf = tx.get('psf_median')
    rents = kept
    med_rent = median([r['rent'] for r in rents])
    med_rent_size = median([r['size'] for r in rents])
    med_rent_psf = median([r['rent'] / r['size'] for r in rents if r.get('size')])
    ylds = [r['rent'] * 12 / (psf * r['size']) * 100 for r in rents] if psf and rents else []
    gross = round(median(ylds), 2) if ylds else None

    # Typical unit for net costs = listing whose per-ad yield is closest to the median yield
    ref_rent, ref_size = med_rent, med_rent_size
    if ylds and rents:
        target = median(ylds)
        scored = sorted(zip(ylds, rents), key=lambda z: (abs(z[0] - target), -z[1]['size']))
        ref_rent, ref_size = scored[0][1]['rent'], scored[0][1]['size']

    costs = None
    net = None
    if gross is not None and psf and ref_size:
        is_landed = p.get('type') == 'Landed'
        mpsf = maint_psf(p)
        # prefer existing maint if present (already area-tuned)
        if p.get('net_costs') and p['net_costs'].get('maint_psf') is not None and not dropped:
            mpsf = p['net_costs']['maint_psf']
        elif p.get('net_costs') and p['net_costs'].get('maint_psf') is not None:
            mpsf = p['net_costs']['maint_psf']
        value_ref = round(psf * ref_size)
        fixed = 550 if is_landed else 250
        d_vac = gross * VACANCY_MONTHS / 12
        d_assess = gross * ASSESS_RATE
        d_maint = mpsf * 12 / psf * 100 if not is_landed else 0.0
        d_fixed = fixed / value_ref * 100 if value_ref else 0
        net = round(gross - d_vac - d_assess - d_maint - d_fixed, 2)
        costs = dict(
            vacancy_months=VACANCY_MONTHS, assessment_rate=ASSESS_RATE, maint_psf=mpsf, fixed_rm_yr=fixed,
            ref_size=ref_size, ref_value=value_ref, ref_rent=ref_rent,
            pts=dict(vacancy=round(d_vac, 3), assessment=round(d_assess, 3),
                     maintenance=round(d_maint, 3), quit_rent_insurance=round(d_fixed, 3)),
        )

    n_rent = len(rents)
    src = dict(PropertyGuru=sum(1 for r in rents if r.get('src') == 'PropertyGuru'),
               Mudah=sum(1 for r in rents if r.get('src') == 'Mudah'))
    # Keep sample payload lean: no titles in the app file
    slim = [dict(rent=r['rent'], size=r['size'], rooms=r.get('rooms'), src=r.get('src')) for r in rents][:40]
    p['ask_rent'] = dict(
        rent_median=med_rent, size_median=med_rent_size,
        rent_psf_median=round(med_rent_psf, 2) if med_rent_psf else None,
        count=n_rent, samples=slim, by_source=src,
    )
    p['gross_yield'] = gross
    p['net_yield'] = net
    p['net_costs'] = costs
    if not rents:
        p['rent_method'] = None
    conf = p.get('confidence')
    tx_count = tx.get('count') or 0
    if p.get('rent_method') == 'area_comps':
        conf = 'low'
    elif n_rent == 0:
        conf = p.get('confidence')
    else:
        conf = 'high' if n_rent >= 8 and tx_count >= 15 else 'medium' if n_rent >= 4 and tx_count >= 5 else 'low'
    p['confidence'] = conf
    after = dict(gross=gross, net=net, n=n_rent, rent=med_rent, size=med_rent_size)
    return p, before, after, dropped


def main():
    src = ROOT / 'data/real_projects.json'
    raw = json.loads(src.read_text())
    catalog = load_title_catalog()
    print('title catalog', len(catalog))
    changed, dropped_all, outliers = [], [], []
    new_projects = []
    for p in raw['projects']:
        p2, before, after, dropped = recompute_project(p, catalog)
        new_projects.append(p2)
        for d in dropped:
            d['project_id'] = p['id']
            d['project'] = p['name']
            dropped_all.append(d)
        bg, ag = before['gross'], after['gross']
        if bg is not None or ag is not None:
            delta = (ag if ag is not None else 0) - (bg if bg is not None else 0)
            if bg is None or ag is None or abs((ag or 0) - (bg or 0)) >= 0.005:
                if bg != ag:
                    changed.append(dict(
                        id=p['id'], name=p['name'], type=p.get('type'), area=p.get('area'),
                        before_gross=bg, after_gross=ag,
                        before_net=before['net'], after_net=after['net'],
                        before_n=before['n'], after_n=after['n'],
                        before_rent=before['rent'], after_rent=after['rent'],
                        before_size=before['size'], after_size=after['size'],
                        delta=None if (bg is None or ag is None) else round(ag - bg, 2),
                        dropped=len(dropped),
                        dropped_detail=dropped,
                    ))
        g = p2.get('gross_yield')
        if g is not None and (g > 7 or g < 2):
            outliers.append(dict(id=p['id'], name=p['name'], gross=g, net=p2.get('net_yield'),
                                 n=after['n'], rent=after['rent'], size=after['size'],
                                 tx_psf=(p2.get('tx') or {}).get('psf_median'), type=p2.get('type')))

    raw['projects'] = new_projects
    raw['note'] = (raw.get('note') or '') + ' Room-rental ads filtered; gross is median of per-listing yields.'
    src.write_text(json.dumps(raw, ensure_ascii=False, indent=2))
    (ROOT / 'src/data/real_projects.json').write_text(json.dumps(raw, ensure_ascii=False, indent=2))
    (ROOT / 'data/room_rentals_dropped.json').write_text(json.dumps(dropped_all, ensure_ascii=False, indent=2))
    (ROOT / 'data/yield_changes.json').write_text(json.dumps(
        dict(changed=changed, outliers=outliers, dropped_n=len(dropped_all)),
        ensure_ascii=False, indent=2))

    big = [c for c in changed if c['delta'] is None or abs(c['delta']) >= 0.5]
    print(f'dropped ads: {len(dropped_all)}  projects changed: {len(changed)}  |delta|>=0.5: {len(big)}')
    for c in sorted(big, key=lambda x: -(abs(x['delta']) if x['delta'] is not None else 99)):
        print(f"  {c['name']:40} {c['before_gross']} → {c['after_gross']}  (Δ {c['delta']})  n {c['before_n']}→{c['after_n']}  rent {c['before_rent']}→{c['after_rent']}")
    print('\nDropped ads:')
    for d in dropped_all:
        print(f"  {d['project']:40} RM{d['rent']} {d['size']}sqft {d.get('rooms')}rm  {d['reason']}  {d['title'][:90]}")
    print('\nOutliers after filter (gross>7 or <2):')
    for o in sorted(outliers, key=lambda x: -x['gross']):
        print(f"  {o['gross']:6.2f}%  n={o['n']}  rent={o['rent']} size={o['size']} txpsf={o['tx_psf']} typ={o['type']}  {o['name']}")


if __name__ == '__main__':
    main()
