#!/usr/bin/env python3
"""Match Airbnb search listings to pilot projects (BSS, KLCC, SS15 cluster)."""
import json, math, re
from pathlib import Path
from collections import defaultdict

ROOT = Path('/workspace/my-property-intel')
STR = ROOT / 'scraper/str'

def dist_km(a, b):
    lat1, lon1 = a
    lat2, lon2 = b
    R = 6371
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    x = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(x))

# Official / well-known aliases only. Host room nicknames (Collins, Bourke, …) are not used.
ALIASES = {
    'real-kl-gateway': [
        r'\bkl\s*gateway\s*residence\b', r'\bklgateway\b', r'\bkl\s*gateway\b',
        r'\bklg\b', r'\bcopenhagen studio\b', r'\bbrussels studio\b',
        r'\bdublin studio\b', r'\bodesa studio\b',
        r'connected train.{0,40}above mall', r'above mall.{0,40}connected train',
    ],
    'real-kuala-lumpur-gateway-menara-suezcap': [r'\bmenara suezcap\b', r'\bsuezcap\b'],
    'real-camellia-serviced-suites': [r'\bcamellia\b', r'\bcamelia\b'],
    'real-the-park-residences-1': [
        r'\bthe park residences\b', r'\bpark residences\b', r'\bacacia\b', r'\bbegonia\b',
    ],
    'real-laurel-residence': [r'\blaurel residence\b', r'\blaurel\b'],
    'real-southlink': [r'\bsouthlink\b', r'\bsouth link\b'],
    'real-southview-residence': [r'\bsouthview\b', r'\bsouth view\b'],
    'real-the-goodwood-residence': [r'\bgoodwood\b'],
    'real-residensi-era-novum': [r'\bera novum\b'],
    'real-residensi-kerinchi': [r'\bresidensi kerinchi\b', r'\bkerinchi residence\b'],
    'real-kl-eco-city': [r'\bkl eco city\b', r'\bklec\b', r'\bviia\b', r'\bvii\s*a residence\b'],
    'real-pantai-panorama': [r'\bpantai panorama\b'],
    'real-taman-bukit-angkasa-angkasapuri-flat': [r'\bangkasapuri\b', r'\bbukit angkasa\b'],
    'real-pkns-17-kampung-kerinchi': [r'\bpkns\b'],
    'real-oxley-towers': [r'\boxley towers?\b', r'\boxley\b'],
    'real-quill-residence': [r'\bquill residence\b', r'\bquill\b'],
    'real-platinum-suites-the-face-suites': [r'\bthe face\b', r'\bface suites\b', r'\bplatinum suites\b'],
    'real-10-stonor': [r'\b10 stonor\b', r'\bten stonor\b', r'\bstonor\b'],
    'real-the-manor-kl': [r'\bthe manor\b', r'\bmanor kl\b'],
    'real-residensi-agile-delima': [r'\bagile delima\b', r'\bagile\b'],
    'real-pangsapuri-servis-conlay': [r'\bconlay\b'],
    'real-wisma-infinitum': [r'\binfinitum\b'],
    'real-first-subang-ss-15-courtyard': [
        r'\bfirst\s*subang\b', r'\bss\s*15 courtyard\b', r'\bss15 courtyard\b',
        r'\bcourtyard.{0,20}ss\s*15\b',
    ],
    'real-grand-subang-jaya-ss15': [
        r'\bgrand subang\b', r'\bthe grand ss\s*15\b', r'\bgrand ss\s*15\b',
    ],
    'real-my-place': [r'\bmy place\b', r'\bmyplace\b'],
    'real-casa-tiara': [r'\bcasa tiara\b'],
    'real-e-tiara': [r'\be-?tiara\b'],
    'real-subang-avenue': [r'\bsubang avenue\b'],
    'real-isola': [r'\bisola\b'],
    'real-lafite-apartment': [r'\blafite\b'],
    'real-dorsett-waterfront-subang': [
        r'\bdorsett\s*waterfront\b', r'\bdorsett\s*subang\b', r'\bdorsettwaterfront\b',
        r'\bdws\d{2}\b',
    ],
    'real-saujana-residency': [r'\bsaujana residency\b'],
    'real-sjcc-lot-15-ss-16-subang-jaya': [r'\bsjcc\b', r'\blot 15\b'],
    'real-summer-villa': [r'\bsummer villa\b'],
    'real-spring-summer-villa': [r'\bspring summer\b'],
    'real-keranji': [r'\bkeranji\b'],
}

# Other well-known buildings we must not assign to a nearby pilot project
OTHER_BUILDING = re.compile(
    r'\b(millerz|swiss garden|9\s*seputeh|vivo mid|eaton|scarletz|the loft|'
    r'verve suite|lumi tropicana|damen|da\s*men|southplace|south place|'
    r'greenfields?|sunway geo|empire subang|nu empire|expressionz|'
    r'troika|the face plaza|m vertica)\b',
    re.I,
)


# Entire-place only. Airbnb search titles use "Apartment/Condo/Home in X" for whole
# units and "Private room / Shared room / Room in X" for rooms.
ROOM_TITLE = re.compile(
    r'^(private\s+room|shared\s+room|hotel\s+room|room)\s+in\b', re.I)
ROOM_NAME = re.compile(
    r'\b(private\s+room|shared\s+room|single\s+room|master\s+room|'
    r'room\s+only|sewa\s+bilik|bilik\s+(untuk|sewa)|a\s+room\s+in|'
    r'dorm(itory)?|host(?:el)?\s*bed)\b', re.I)


def is_room_or_shared(it):
    title = (it.get('title') or '').strip()
    name = (it.get('name') or '').strip()
    if ROOM_TITLE.search(title):
        return 'title_room_type'
    if ROOM_NAME.search(name) and not re.search(r'\b(entire|whole\s+unit|whole\s+place)\b', name, re.I):
        return 'name_room_rental'
    rtype = (it.get('room_type') or it.get('property_type') or it.get('place_type') or '')
    if re.search(r'private\s*room|shared\s*room|hotel\s*room', str(rtype), re.I):
        return 'detail_room_type'
    return None


def load_projects():
    projects = json.loads((ROOT / 'data/real_projects.json').read_text())['projects']
    first = (3.077666, 101.586645)
    pilot = []
    for p in projects:
        if p['area'] in ('bss', 'klcc'):
            pilot.append(p)
        elif p.get('lat') and dist_km((p['lat'], p['lng']), first) <= 1.3 and p['type'] != 'Landed':
            pilot.append(p)
    return projects, {p['id']: p for p in projects}, pilot

def load_listings():
    listings = []
    for area, fn in [('bss', 'bss_listings.json'), ('klcc', 'klcc_listings.json'), ('ss15', 'ss15_listings.json')]:
        for it in json.loads((STR / fn).read_text()):
            it = dict(it)
            it['search_area'] = area
            listings.append(it)
    uniq = {}
    for it in listings:
        rid = str(it['room_id'])
        if rid not in uniq:
            uniq[rid] = it
            uniq[rid]['search_areas'] = [it['search_area']]
        else:
            uniq[rid]['search_areas'].append(it['search_area'])
    kept, dropped = [], []
    for it in uniq.values():
        reason = is_room_or_shared(it)
        if reason:
            it['drop_reason'] = reason
            dropped.append(it)
        else:
            kept.append(it)
    print(f'unique {len(uniq)} entire-place {len(kept)} room/shared dropped {len(dropped)}')
    for d in dropped:
        print(f"  DROP [{d['drop_reason']}] {d.get('title')} | {d.get('name')}  {d.get('room_url')}")
    (STR / 'dropped_rooms.json').write_text(json.dumps([
        {k: d.get(k) for k in ('room_id','room_url','name','title','bedrooms','price_per_night','search_areas','drop_reason')}
        for d in dropped
    ], ensure_ascii=False, indent=2))
    return kept

def main():
    projects, by_id, pilot = load_projects()
    listings = load_listings()
    compiled = {pid: [(pat, re.compile(pat, re.I)) for pat in pats] for pid, pats in ALIASES.items()}

    def name_hits(text):
        hits = []
        for pid, pats in compiled.items():
            for pat, rx in pats:
                if rx.search(text):
                    hits.append((pid, pat))
                    break
        return hits

    results = []
    for it in listings:
        text = ' '.join(filter(None, [it.get('name'), it.get('title')]))
        lat, lng = it.get('latitude'), it.get('longitude')
        hits = name_hits(text)
        other = bool(OTHER_BUILDING.search(text))
        nearby = []
        if lat and lng:
            for p in pilot:
                if not p.get('lat'):
                    continue
                d = dist_km((lat, lng), (p['lat'], p['lng']))
                if d <= 0.6:
                    nearby.append((round(d, 3), p['id'], p['name']))
            nearby.sort(key=lambda x: x[0])
        assigned = method = conf = None
        ndist = None
        if hits and not other:
            scored = []
            for pid, pat in hits:
                p = by_id[pid]
                d = dist_km((lat, lng), (p['lat'], p['lng'])) if (lat and p.get('lat')) else 99
                scored.append((d, pid, pat))
            scored.sort(key=lambda x: x[0])
            d, pid, pat = scored[0]
            # Reject name hits that land on a clearly different area (e.g. Isola KLCC vs Isola Subang)
            if d > 1.0:
                method = f'name-too-far:{pat}@{round(d,3)}'
            else:
                assigned, method, ndist = pid, f'name:{pat}', round(d, 3)
                conf = 'name+dist' if d <= 0.5 else 'name-far'
        elif (not other and nearby and nearby[0][0] <= 0.08
              and (len(nearby) == 1 or nearby[1][0] - nearby[0][0] >= 0.35)):
            # Unique pin, only in sparse areas (e.g. Wisma Infinitum). Not used in dense BSS/SS15.
            pid = nearby[0][1]
            if by_id[pid]['area'] == 'klcc':
                assigned, method, conf, ndist = pid, 'geo-unique', 'geo-unique', nearby[0][0]
        it['match_id'] = assigned
        it['match_method'] = method
        it['match_conf'] = conf
        it['match_dist'] = ndist
        it['nearby'] = nearby[:4]
        it['other_building'] = other
        results.append(it)

    keep = [r for r in results if r['match_id']]
    by_p = defaultdict(list)
    for r in keep:
        by_p[r['match_id']].append(r)

    slim_fields = ['room_id', 'room_url', 'name', 'title', 'bedrooms', 'bathrooms',
                   'rating', 'review_count', 'price_per_night', 'price_total',
                   'latitude', 'longitude', 'search_area', 'search_areas',
                   'match_id', 'match_method', 'match_conf', 'match_dist']
    out = {
        'n_unique_listings': len(results),
        'n_matched': len(keep),
        'by_project': {
            pid: {
                'name': by_id[pid]['name'],
                'area': by_id[pid]['area'],
                'n': len(rows),
                'enough': len(rows) >= 3,
                'listings': [{k: r.get(k) for k in slim_fields} for r in rows],
            }
            for pid, rows in sorted(by_p.items(), key=lambda kv: -len(kv[1]))
        },
        'unmatched_n': sum(1 for r in results if not r['match_id']),
    }
    (STR / 'matches.json').write_text(json.dumps(out, ensure_ascii=False, indent=2))

    print(f'unique {len(results)} matched {len(keep)}')
    for pid, rows in sorted(by_p.items(), key=lambda kv: -len(kv[1])):
        flag = 'YES' if len(rows) >= 3 else 'no '
        print(f'  {flag} {len(rows):3}  {by_id[pid]["name"]}  ({pid})')
        for r in rows:
            print(f"       [{r['match_conf']:11} d={r['match_dist']}] {r['name'][:80]}  RM{r.get('price_per_night')} br={r.get('bedrooms')}")
    return out

if __name__ == '__main__':
    main()
