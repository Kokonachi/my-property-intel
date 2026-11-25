#!/usr/bin/env python3
"""KL-wide expansion, batch 1 · 吉隆坡扩区（第一批）
=====================================================
Builds data/kl_batch1.json for the 17 batch-1 Brickz towns WITHOUT touching data/real_projects.json.

Inputs (all offline except step `fetch`):
  * Brickz state index pages already cached in photo_upgrade/sitemaps/brickz_pages/kuala-lumpur-p*.html
    (median + quartile psf/price, tx count, period for all ~1,500 KL projects). No Brickz requests are made.
  * PropertyGuru condo directory URL list photo_upgrade/sitemaps/all_condo_urls.txt (14.8k condos) → each Brickz
    project is matched to ONE PropertyGuru condo id (exact slug, then unique distinctive-token set, then
    pg_condo_overrides.json). Several Brickz records mapping to the same condo (e.g. KL Gateway) share one rent pool
    and are flagged `same_condo_as` so area stats count the condo once.
  * Per-condo PropertyGuru data saved as cache/pg_kl/<condo_id>.json (see pg_kl_extract.js for the format):
    building coordinates from the condo page's schema.org GeoCoordinates, the "For Rent (N)" count, and the rent
    cards from /property-for-rent/at-<slug>-<id>. Listings are de-duplicated by listing URL.

Thresholds (see the plan doc): on the list/map only with ≥5 Brickz transactions; non-landed only;
a yield number is shown only with ≥4 own rent ads (`yield_display`); confidence high = ≥8 ads & ≥15 tx,
medium = ≥4 & ≥5. Coordinates: PropertyGuru building point → existing geocode_overrides.json → not drawn.

Usage:
  kl_expand.py match            # write kl_pg_map.json + kl_fetch_queue.json, print match stats
  kl_expand.py save <file>      # store a pg_kl_extract.js result under cache/pg_kl/
  kl_expand.py build            # parse cache/pg_kl/*.json → data/kl_batch1.json, print summary
"""
import json, math, re, sys, collections
from datetime import datetime, timezone, timedelta
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent
PU = ROOT / "photo_upgrade"
BRICKZ_PAGES = sorted((PU / "sitemaps" / "brickz_pages").glob("kuala-lumpur-p*.html"))
BRICKZ_EXTRA = [PU / "sitemaps" / "bz_transactions-residential-kuala-lumpur.html", PU / "sitemaps" / "bz_kuala-lumpur-page-150.html"]
CONDO_URLS = PU / "sitemaps" / "all_condo_urls.txt"
PG_DIR = ROOT / "cache" / "pg_kl"
MAP_FP = ROOT / "kl_pg_map.json"
QUEUE_FP = ROOT / "kl_fetch_queue.json"
PG_OVERRIDES = ROOT / "pg_condo_overrides.json"
OUT = ROOT.parent / "data" / "kl_batch1.json"

MIN_TX = 5
MIN_RENT_ADS = 4
NOW = datetime.now(timezone(timedelta(hours=8)))

# Brickz town slug → app area (id, centroid, en, zh, radius in degrees ≈ 111 km)
# zh left as English where no settled Chinese name is in common use.
BATCH1 = {
    "kl-city-centre": ("klcc", [3.1550, 101.7100], "KL City Centre", "吉隆坡市中心", 0.05),
    "mont-kiara": ("mk", [3.1701, 101.6512], "Mont Kiara", "满家乐", 0.03),
    "bangsar": ("bs", [3.1300, 101.6720], "Bangsar", "孟沙", 0.03),
    "kampung-kerinchi--bangsar-south-": ("bss", [3.1105, 101.6655], "Bangsar South", "孟沙南", 0.035),
    "pantai": ("pantai", [3.1150, 101.6650], "Pantai", "Pantai", 0.035),
    "dutamas": ("dutamas", [3.1720, 101.6640], "Dutamas", "Dutamas", 0.03),
    "sri-hartamas": ("hartamas", [3.1620, 101.6500], "Sri Hartamas", "斯里哈达马斯", 0.03),
    "desa-parkcity": ("dpc", [3.1870, 101.6300], "Desa ParkCity", "德沙公园城", 0.03),
    "damansara-heights": ("dh", [3.1480, 101.6580], "Damansara Heights", "白沙罗高原", 0.03),
    "old-klang-road": ("okr", [3.0900, 101.6750], "Old Klang Road", "旧巴生路", 0.04),
    "bukit-jalil": ("bj", [3.0580, 101.6900], "Bukit Jalil", "武吉加里尔", 0.04),
    "kl-sentral": ("sentral", [3.1340, 101.6860], "KL Sentral", "吉隆坡中环", 0.025),
    "mid-valley-city": ("mv", [3.1180, 101.6770], "Mid Valley", "谷中城", 0.025),
    "brickfields": ("bf", [3.1300, 101.6850], "Brickfields", "十五碑", 0.03),
    "seputeh": ("seputeh", [3.1140, 101.6800], "Seputeh", "士布爹", 0.03),
    "taman-desa": ("td", [3.1030, 101.6830], "Taman Desa", "德沙花园", 0.03),
    "kuchai-lama": ("kl-kuchai", [3.0890, 101.6900], "Kuchai Lama", "Kuchai Lama", 0.03),
}

GENERIC = {"residence", "residences", "residensi", "suites", "suite", "condominium", "condo", "the", "service", "serviced",
           "apartment", "apartments", "pangsapuri", "kondominium", "servis", "at", "kl", "kuala", "lumpur", "tower", "towers",
           "menara", "blok", "block", "and", "dan", "hotel", "city", "centre", "center"}


def num(s):
    s = re.sub(r"[^\d.]", "", s or "")
    return float(s) if s else None


def toks(s):
    return re.findall(r"[a-z0-9]+", (s or "").lower())


def core(s):
    return frozenset(t for t in toks(s) if t not in GENERIC)


def norm(s):
    return "-".join(toks(s))


def slug(s):
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", s.lower()))


# ---------------- Brickz (cached index pages) ----------------
def parse_brickz_page(html):
    out = []
    for tr in BeautifulSoup(html, "lxml").select("#ptd_list_table tbody tr"):
        td = tr.find_all("td")
        if len(td) < 5 or not td[0].find("span"):
            continue
        a0 = td[0].find("a", class_="ptd_list_item_title")
        a = td[4].find("a")
        href = a["href"] if a else (a0["href"] if a0 else "")
        m = re.search(r"/residential/kuala-lumpur/([^/]+)/", href)
        psf_span, price_span = td[2].find("span"), td[3].find("span")
        q_psf = re.findall(r"[\d,]+", psf_span.get("title", "")) if psf_span else []
        q_pr = re.findall(r"[\d,]+", price_span.get("title", "")) if price_span else []
        per = re.search(r"From (\S+) to (\S+)", a.get("title", "")) if a else None
        out.append(dict(
            name=td[0].find("span").get_text(strip=True), town_slug=m.group(1) if m else None,
            tenure=td[1].find("span").get_text(strip=True).title(),
            brickz_type=td[1].find("a").get_text(strip=True).title() if td[1].find("a") else "",
            tx_psf_median=num(psf_span.get_text()) if psf_span else None,
            tx_psf_q=[num(x) for x in q_psf][::-1] if q_psf else None,
            tx_price_median=num(price_span.get_text()) if price_span else None,
            tx_price_q=[num(x) for x in q_pr][::-1] if q_pr else None,
            tx_count=int(num(a.get_text()) or 0) if a else 0,
            tx_period=[per.group(1), per.group(2)] if per else None,
            brickz_url=href, landed="/landed/" in href and "/non-landed/" not in href,
        ))
    return out


def brickz_rows():
    seen, rows = set(), []
    for fp in BRICKZ_EXTRA + BRICKZ_PAGES:
        if not fp.exists():
            continue
        for r in parse_brickz_page(fp.read_text(errors="ignore")):
            if r["brickz_url"] in seen:
                continue
            seen.add(r["brickz_url"]); rows.append(r)
    return rows


def batch1_projects(rows=None):
    rows = rows if rows is not None else brickz_rows()
    return [r for r in rows if r["town_slug"] in BATCH1 and not r["landed"] and r["tx_count"] >= MIN_TX]


# ---------------- PropertyGuru condo matching ----------------
def condo_index():
    by_slug, by_core = collections.defaultdict(list), collections.defaultdict(list)
    for line in CONDO_URLS.read_text().split():
        m = re.match(r"https://www\.propertyguru\.com\.my/condo/(.+)-(\d+)$", line.strip())
        if not m:
            continue
        rec = dict(url=line.strip(), slug=m.group(1), id=m.group(2))
        by_slug[m.group(1)].append(rec)
        c = core(m.group(1).replace("-", " "))
        if c:
            by_core[c].append(rec)
    return by_slug, by_core


def name_variants(name, aliases):
    vs = [name] + aliases.get(name, [])
    vs += re.findall(r"\(([^)]+)\)", name)
    base = re.sub(r"\([^)]*\)", "", name).strip(" -@")
    vs += [base, base.split("@")[0].strip()]
    out = []
    for v in vs:
        if v and v.lower() not in [o.lower() for o in out]:
            out.append(v)
    return out


def match_condo(p, by_slug, by_core, aliases, overrides):
    """Return (record|None, method). Ambiguous slugs/cores are left unmatched rather than guessed."""
    if p["name"] in overrides:
        o = overrides[p["name"]]
        if not o:
            return None, "override_none"
        m = re.match(r".*/condo/(.+)-(\d+)$", o)
        return dict(url=o, slug=m.group(1), id=m.group(2)), "override"
    for v in name_variants(p["name"], aliases):
        hits = by_slug.get(norm(v), [])
        if len(hits) == 1:
            return hits[0], "exact"
    for v in name_variants(p["name"], aliases):
        c = core(v)
        if len(c) >= 1 and len(by_core.get(c, [])) == 1 and not all(t.isdigit() for t in c):
            return by_core[c][0], "core"
    return None, "none"


def cmd_match():
    aliases = json.loads((ROOT / "aliases.json").read_text())
    overrides = json.loads(PG_OVERRIDES.read_text()) if PG_OVERRIDES.exists() else {}
    overrides = {k: v for k, v in overrides.items() if not k.startswith("_")}
    by_slug, by_core = condo_index()
    ps = batch1_projects()
    mp, stats = {}, collections.Counter()
    for p in ps:
        rec, how = match_condo(p, by_slug, by_core, aliases, overrides)
        stats[how] += 1
        mp[p["brickz_url"]] = dict(name=p["name"], town=p["town_slug"], tx=p["tx_count"], method=how,
                                   condo_url=rec["url"] if rec else None, condo_id=rec["id"] if rec else None)
    MAP_FP.write_text(json.dumps(mp, ensure_ascii=False, indent=1))
    ids = {}
    for v in mp.values():
        if v["condo_id"]:
            ids[v["condo_id"]] = v["condo_url"]
    queue = [dict(condo_id=i, condo_url=u, rent_url=u.replace("/condo/", "/property-for-rent/at-")) for i, u in sorted(ids.items())]
    QUEUE_FP.write_text(json.dumps(queue, indent=1))
    print(json.dumps(dict(projects=len(ps), methods=stats, unique_condos=len(queue)), indent=1))
    miss = sorted((v["tx"], v["name"]) for v in mp.values() if not v["condo_id"])[::-1]
    print("unmatched (by tx):", ", ".join(f"{n} ({t})" for t, n in miss))


# ---------------- PropertyGuru per-condo data ----------------
def load_pg(condo_id):
    fp = PG_DIR / f"{condo_id}.json"
    if not fp.exists():
        return None
    d = json.loads(fp.read_text())
    seen, ls = set(), []
    for l in d.get("listings", []):
        k = l.get("url") or (l.get("title"), l.get("price"), l.get("size"))
        if k in seen:
            continue
        seen.add(k); ls.append(l)
    d["listings"] = ls
    return d


def yield_block(p, rents, maint):
    """Same method as scrape.py: per-ad size-matched gross yield; net = gross − cost ratios."""
    med = lambda xs: (sorted(xs)[len(xs) // 2] if len(xs) % 2 else sum(sorted(xs)[len(xs) // 2 - 1:len(xs) // 2 + 1]) / 2) if xs else None
    psf = p["tx_psf_median"]
    if not rents or not psf:
        return None, None, None
    gross = round(med([r["price"] * 12 / (psf * r["size"]) * 100 for r in rents]), 2)
    size_ref = med([r["size"] for r in rents]); value_ref = round(psf * size_ref)
    d_vac, d_assess = gross / 12, gross * 0.04
    d_maint = maint * 12 / psf * 100
    d_fixed = 250 / value_ref * 100
    net = round(gross - d_vac - d_assess - d_maint - d_fixed, 2)
    costs = dict(vacancy_months=1, assessment_rate=0.04, maint_psf=maint, fixed_rm_yr=250, ref_size=size_ref,
                 ref_value=value_ref, ref_rent=med([r["price"] for r in rents]),
                 pts=dict(vacancy=round(d_vac, 3), assessment=round(d_assess, 3), maintenance=round(d_maint, 3), quit_rent_insurance=round(d_fixed, 3)))
    return gross, net, costs


def maint_psf(p, area):
    bt = (p.get("brickz_type") or "").lower()
    if "flat" in bt:
        return 0.12
    if bt == "apartment":
        return 0.25
    return 0.45 if area in {"klcc", "mk", "bs", "dh", "dpc", "hartamas", "dutamas"} else 0.35


def type_of(bt):
    b = bt.lower()
    return "Serviced Residence" if any(x in b for x in ("service", "soho", "sofo")) else "Condo"


MUDAH_FP = ROOT / "mudah_kl_matched.json"   # {search term: [[price, size, rooms], ...]} already title-matched in the browser
OSM_FP = ROOT / "osm_kl_matches.json"       # {Brickz name: [lat, lng, osm kind, osm name]} unambiguous OSM name hits
# names too generic for a Mudah keyword search: the matched ads are mostly other buildings (checked by hand 2026-11-25)
MUDAH_SKIP = {"BOULEVARD", "RESIDENSI TUN RAZAK", "THE PARK 2", "KL ECO CITY", "THE PEARL", "THE PARK RESIDENCES 1",
              "SENTRAL SUITE", "VERVE SUITES", "TR RESIDENCE", "SKYLINE RESIDENCE"}


def mudah_rents(p, store, aliases):
    """Mudah ads already matched to the project in the browser (scrape.title_matches + aliases, deduped)."""
    if p["name"] in MUDAH_SKIP:
        return []
    rows = store.get(" ".join(toks(p["name"]))) or []
    return [dict(price=r[0], size=r[1], rooms=r[2], title=None, url=None, src="Mudah")
            for r in rows if r[0] and r[1] and 250 <= r[1] <= 8000]


def cmd_build():
    from room_filter import clean_whole_unit_rents
    mp = json.loads(MAP_FP.read_text())
    aliases = json.loads((ROOT / "aliases.json").read_text())
    mudah = json.loads(MUDAH_FP.read_text()) if MUDAH_FP.exists() else {}
    overrides = json.loads((ROOT / "geocode_overrides.json").read_text())
    osm = json.loads(OSM_FP.read_text()) if OSM_FP.exists() else {}
    osm_drop = set(osm.get("_meta", {}).get("drop", []))
    mudah_at = mudah.get("_meta", {}).get("fetched")
    ps = batch1_projects()
    first_by_condo, out = {}, []
    for p in ps:
        m = mp.get(p["brickz_url"], {})
        area, c, en, zh, radius = BATCH1[p["town_slug"]]
        pid = "real-" + slug(p["name"])
        pg = load_pg(m["condo_id"]) if m.get("condo_id") else None
        typ = type_of(p["brickz_type"])
        raw = [dict(price=l["price"], size=l["size"], rooms=l.get("beds"), title=l.get("title"), url=l.get("url"), src="PropertyGuru")
               for l in (pg or {}).get("listings", []) if l.get("price") and l.get("size")]
        raw += mudah_rents(p, mudah, aliases)
        rents, _ = clean_whole_unit_rents(raw, typ=typ, brickz_type=p["brickz_type"])
        gross, net, costs = yield_block(p, rents, maint_psf(p, area))
        n = len(rents)
        conf = "high" if n >= 8 and p["tx_count"] >= 15 else "medium" if n >= MIN_RENT_ADS else "low"
        # coordinates: PG building point (must be inside the Brickz town radius) → manual override → not drawn
        geo, geo_src, precision = None, "none", None
        if pg and pg.get("lat") and math.dist([pg["lat"], pg["lng"]], c) <= radius:
            geo, geo_src, precision = [pg["lat"], pg["lng"]], "propertyguru", "building"
        o = osm.get(p["name"]) if p["name"] not in osm_drop else None
        if not geo and o and math.dist(o[:2], c) <= radius:
            geo, geo_src, precision = o[:2], "osm", "building"
        ov = overrides.get(pid)
        if ov and not ov.get("hide") and (ov.get("verified") or not geo):
            geo, geo_src, precision = [ov["lat"], ov["lng"]], "override", "building" if ov.get("verified") else "approx"
        same = first_by_condo.get(m.get("condo_id")) if m.get("condo_id") else None
        if m.get("condo_id") and not same:
            first_by_condo[m["condo_id"]] = pid
        out.append(dict(
            id=pid, name=p["name"].title(), area=area, area_en=en, area_zh=zh, brickz_town=p["town_slug"], region="kv",
            lat=round(geo[0], 6) if geo else None, lng=round(geo[1], 6) if geo else None, on_map=bool(geo),
            geo_source=geo_src, geo_precision=precision,
            pg_condo=dict(url=m.get("condo_url"), id=m.get("condo_id"), match=m.get("method"),
                          rent_count_on_page=(pg or {}).get("rent_count")),
            same_condo_as=same, tenure=p["tenure"], type=typ, brickz_type=p["brickz_type"],
            tx=dict(psf_median=p["tx_psf_median"], psf_q=p["tx_psf_q"], price_median=p["tx_price_median"],
                    price_q=p["tx_price_q"], count=p["tx_count"], period=p["tx_period"]),
            ask_rent=dict(count=n, by_source=dict(PropertyGuru=sum(r["src"] == "PropertyGuru" for r in rents), Mudah=sum(r["src"] == "Mudah" for r in rents)), rent_median=costs["ref_rent"] if costs else None, size_median=costs["ref_size"] if costs else None,
                          samples=[dict(rent=r["price"], size=r["size"], rooms=r["rooms"], src=r["src"], url=r.get("url"),
                                        title=(r.get("title") or "")[:160]) for r in rents][:40]),
            gross_yield=gross, net_yield=net, net_costs=costs, yield_display=bool(gross is not None and n >= MIN_RENT_ADS),
            confidence=conf, rent_method="listings" if rents else None,
            sources=[dict(name="Brickz.my (transacted)", url=p["brickz_url"]),
                     *([dict(name="PropertyGuru (rent listings)", url=m["condo_url"].replace("/condo/", "/property-for-rent/at-"))] if pg else []),
                     *([dict(name="Mudah.my (rent listings)", url="https://www.mudah.my/kuala-lumpur/apartment-condominium-for-rent?q=" + "+".join(toks(p["name"])))] if any(r["src"] == "Mudah" for r in rents) else [])],
            scraped_at=(pg or {}).get("fetched_at") or (mudah_at if any(r["src"] == "Mudah" for r in rents) else None),
        ))
    summary = dict(projects=len(out), with_rent_data=sum(1 for x in out if x["ask_rent"]["count"]),
                   on_map=sum(x["on_map"] for x in out), yield_display=sum(x["yield_display"] for x in out),
                   confidence=collections.Counter(x["confidence"] for x in out),
                   by_area={k: sum(1 for x in out if x["area"] == v[0]) for k, v in BATCH1.items()})
    OUT.write_text(json.dumps(dict(generated_at=NOW.isoformat(timespec="minutes"), batch="kl-1", summary=summary, projects=out),
                              ensure_ascii=False, indent=1))
    print(json.dumps(summary, ensure_ascii=False, indent=1))


def cmd_save():
    """kl_expand.py save <file.json>: store a pgKlRun() result (or a list of records) as cache/pg_kl/<id>.json."""
    d = json.loads(Path(sys.argv[2]).read_text())
    recs = d.get("batch", d) if isinstance(d, dict) else d
    PG_DIR.mkdir(parents=True, exist_ok=True)
    bad = collections.Counter()
    for r in recs:
        if r.get("status") != "ok":
            bad[r.get("status")] += 1
            continue  # failed fetches are not cached, so they are retried next run
        (PG_DIR / f"{r['condo_id']}.json").write_text(json.dumps(r, ensure_ascii=False))
    print(f"saved {len(recs) - sum(bad.values())}, skipped {dict(bad)}; cache now {len(list(PG_DIR.glob('*.json')))}")


if __name__ == "__main__":
    {"match": cmd_match, "build": cmd_build, "save": cmd_save}[sys.argv[1] if len(sys.argv) > 1 else "match"]()
