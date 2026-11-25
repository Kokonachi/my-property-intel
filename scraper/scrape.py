#!/usr/bin/env python3
"""
Real-data pilot scraper · 真实数据试点爬虫
==========================================
Pulls a SMALL, polite sample of public data for a few KL areas and writes
../data/real_projects.json (also copied to ../src/data/real_projects.json for the app).

Sources
  * Brickz.my   – median TRANSACTED price & psf per project (public summary table, page 1 only)
  * Mudah.my    – ASKING monthly rents (and asking sale prices) from public search result pages
                  (schema.org ld+json embedded in the page: title, rooms, floor size, price)
  * Nominatim   – OpenStreetMap geocoding (1 req/s, cached)

Politeness: one request at a time, fixed delay between requests to the same host,
on-disk HTML cache (re-runs within CACHE_HOURS don't hit the sites again), small page caps,
no logins, no CAPTCHA solving. See PROJECT.md for ToS / robots notes.

Usage:  scraper/run.sh            (or: scraper/.venv/bin/python scraper/scrape.py --areas mont-kiara,klcc,bangsar)
"""
import argparse, hashlib, json, math, os, re, statistics as st, sys, time, unicodedata
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import quote_plus

from bs4 import BeautifulSoup
from curl_cffi import requests

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / "cache"
OUT = ROOT.parent / "data" / "real_projects.json"
APP_OUT = ROOT.parent / "src" / "data" / "real_projects.json"
UA_NOTE = "my-property-intel research pilot (low volume)"

AREAS = {
    # app area id, Brickz town slug(s), Mudah region path, centroid, label
    "mont-kiara": dict(app="mk", brickz=["mont-kiara"], mudah="kuala-lumpur", c=[3.1701, 101.6512], en="Mont Kiara", zh="满家乐"),
    "klcc":       dict(app="klcc", brickz=["kl-city-centre"], mudah="kuala-lumpur", c=[3.1578, 101.7123], en="KL City Centre / KLCC", zh="吉隆坡市中心"),
    "bangsar":    dict(app="bs", brickz=["bangsar"], mudah="kuala-lumpur", c=[3.1300, 101.6720], en="Bangsar", zh="孟沙"),
    # full-coverage areas: every project Brickz lists (all pages, incl. landed), rents only from Mudah (+cached PropertyGuru)
    "bangsar-south": dict(app="bss", state="kuala-lumpur", brickz=["kampung-kerinchi--bangsar-south-"], mudah="kuala-lumpur",
                          c=[3.1105, 101.6655], en="Bangsar South", zh="孟沙南", full=True, radius=0.035),
    "subang-jaya":   dict(app="sj", state="selangor", brickz=["subang-jaya"], mudah="selangor",
                          c=[3.0490, 101.5850], en="Subang Jaya", zh="梳邦再也", full=True, radius=0.08,
                         landed_q=["subang jaya", "usj", "ss15 subang", "ss17 subang", "putra heights", "semi d subang jaya", "bungalow subang jaya", "semi d usj"]),
}

# map areas used by the app (id, centroid, en, zh) — keep in sync with src/data/properties.js
APP_AREAS = [("klcc", [3.1578, 101.7123], "KLCC", "吉隆坡城中城"), ("bb", [3.1466, 101.7108], "Bukit Bintang", "武吉免登"),
             ("mk", [3.1701, 101.6512], "Mont Kiara", "满家乐"), ("bs", [3.1300, 101.6720], "Bangsar", "孟沙"),
             ("bss", [3.1105, 101.6655], "Bangsar South", "孟沙南"), ("ch", [3.0880, 101.7440], "Cheras", "蕉赖"),
             ("pj", [3.1070, 101.6070], "Petaling Jaya", "八打灵再也"), ("sj", [3.0490, 101.5850], "Subang Jaya", "梳邦再也")]

DELAY = {"www.brickz.my": 30.0, "www.mudah.my": 6.0, "nominatim.openstreetmap.org": 1.2}
_last = {}
CACHE_HOURS = 24 * 6
NOW = datetime.now(timezone(timedelta(hours=8)))


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def fetch(url, kind="html", params=None):
    """Polite GET with per-host delay and disk cache."""
    full = url + ("?" + "&".join(f"{k}={quote_plus(str(v))}" for k, v in params.items()) if params else "")
    key = hashlib.sha1(full.encode()).hexdigest()[:16]
    CACHE.mkdir(exist_ok=True)
    fp = CACHE / f"{key}.{ 'json' if kind=='json' else 'html'}"
    if fp.exists() and time.time() - fp.stat().st_mtime < CACHE_HOURS * 3600:
        txt = fp.read_text()
        return json.loads(txt) if kind == "json" else txt
    host = re.match(r"https?://([^/]+)", url).group(1)
    wait = DELAY.get(host, 5) - (time.time() - _last.get(host, 0))
    if wait > 0:
        time.sleep(wait)
    log(f"  GET {full}")
    headers = {"Accept-Language": "en-MY,en;q=0.9"}
    if "nominatim" in host:
        r = requests.get(full, headers={"User-Agent": UA_NOTE + " (contact: project owner)"}, timeout=40)
    else:
        r = requests.get(full, impersonate="chrome", headers=headers, timeout=40)
    _last[host] = time.time()
    if r.status_code != 200:
        log(f"    -> HTTP {r.status_code}")
        return None
    fp.write_text(r.text)
    return r.json() if kind == "json" else r.text


def num(s):
    s = re.sub(r"[^\d.]", "", s or "")
    return float(s) if s else None


# ---------------- Brickz (transacted) ----------------
def brickz_area(town, pages=1, state="kuala-lumpur"):
    out = []
    p = 0
    while True:
        p += 1
        if pages and p > pages:
            break
        url = f"https://www.brickz.my/transactions/residential/{state}/{town}/" + (f"page/{p}/" if p > 1 else "")
        html = fetch(url)
        if not html:
            break
        if not pages:  # full mode: stop after the last page linked
            last = max([int(x) for x in re.findall(rf"/{re.escape(town)}/page/(\d+)/", html)] + [1])
            if p >= last and p > 1 and f"/page/{p + 1}/" not in html:
                pages = p
        s = BeautifulSoup(html, "lxml")
        for tr in s.select("#ptd_list_table tbody tr"):
            td = tr.find_all("td")
            if len(td) < 5 or not td[0].find("span"):
                continue
            name = td[0].find("span").get_text(strip=True)
            tenure = td[1].find("span").get_text(strip=True).title()
            btype = td[1].find("a").get_text(strip=True).title() if td[1].find("a") else ""
            psf_span = td[2].find("span"); price_span = td[3].find("span")
            q_psf = re.findall(r"[\d,]+", psf_span.get("title", "")) if psf_span else []
            q_pr = re.findall(r"[\d,]+", price_span.get("title", "")) if price_span else []
            a = td[4].find("a")
            landed = "/landed/" in (a["href"] if a else "") and "/non-landed/" not in (a["href"] if a else "")
            m = re.search(r"From (\S+) to (\S+)", a.get("title", "")) if a else None
            out.append(dict(
                name=name, tenure=tenure, brickz_type=btype,
                tx_psf_median=num(psf_span.get_text()), tx_psf_q=[num(x) for x in q_psf][::-1] if q_psf else None,
                tx_price_median=num(price_span.get_text()), tx_price_q=[num(x) for x in q_pr][::-1] if q_pr else None,
                tx_count=int(num(a.get_text()) or 0) if a else 0,
                tx_period=[m.group(1), m.group(2)] if m else None,
                brickz_url=a["href"] if a else url, brickz_area_url=url, landed=landed,
            ))
    return out


# ---------------- Mudah (asking) ----------------
STOP = {"residence", "residences", "residensi", "suites", "suite", "condominium", "condo", "the", "@", "kl", "mont", "kiara",
        "service", "serviced", "at", "by", "klcc", "bangsar", "kuala", "lumpur", "tower", "towers", "mk"}


def tokens(name):
    t = unicodedata.normalize("NFKD", name).lower()
    return [w for w in re.findall(r"[a-z0-9]+", t)]


def key_tokens(name):
    ks = [w for w in tokens(name) if w not in STOP and len(w) > 1]
    return ks or [w for w in tokens(name) if len(w) > 1]


def title_matches(name, title):
    """Listing title must clearly refer to the project (titles are free text written by agents)."""
    tt = set(tokens(title))
    joined = " ".join(tokens(title))
    for variant in [name] + name.split("@"):
        ks = key_tokens(variant)
        if not ks:
            continue
        if all(k.isdigit() or len(k) <= 3 for k in ks):  # e.g. "28 Mont Kiara", "USJ 4" -> require the full phrase  # e.g. "28 Mont Kiara" -> require the full phrase
            if " ".join(tokens(variant)) in joined:
                return True
        elif all(k in tt for k in ks):
            return True
    return False


def mudah_search(project, region, kind="rent", landed=False):
    url = f"https://www.mudah.my/{region}/{'houses' if landed else 'apartment-condominium'}-for-{kind}"
    q = " ".join(tokens(project["name"]))
    html = fetch(url, params={"q": q})
    if not html:
        return [], url + "?q=" + quote_plus(q)
    items = []
    for m in re.finditer(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', html, re.S):
        try:
            data = json.loads(m.group(1))
        except Exception:
            continue
        for block in data if isinstance(data, list) else [data]:
            if block.get("@type") != "ItemList":
                continue
            for el in block.get("itemListElement", []):
                it = el.get("item", {}); place = it.get("itemOffered", {})
                props = {p.get("name"): p.get("value") for p in place.get("additionalProperty", [])}
                items.append(dict(title=place.get("name", ""), price=num(it.get("price")),
                                  size=num(props.get("Floor Size")), rooms=num(props.get("Number of Rooms")),
                                  image=it.get("image") or place.get("image"), url=it.get("url") or place.get("url")))
    # keep only listings whose title mentions all key tokens of the project (avoid fuzzy matches)
    keep = []
    for it in items:
        if title_matches(project["name"], it["title"]) and it["price"] and it["size"] and 250 <= it["size"] <= 8000:
            keep.append(it)
    return keep, url + "?q=" + quote_plus(q)


from room_filter import clean_whole_unit_rents, is_room_rental

def clean_rents(rs, typ=None, brickz_type=None):
    kept, _dropped = clean_whole_unit_rents(rs, typ=typ, brickz_type=brickz_type)
    return kept


def clean_sales(ss):
    return [s for s in ss if 150_000 <= s["price"] <= 40_000_000 and 300 <= s["price"] / s["size"] <= 4000]


# ---------------- PropertyGuru (via Apify web-fetch, cached HTML) ----------------
# PropertyGuru blocks plain HTTP clients (403). Pages are fetched with the Apify "apify/web-fetch" actor
# (see fetch_pg.md) and saved to cache/pg/rent-<project>.html; this parser reads whatever is cached.
_PG = None


def pg_cards():
    global _PG
    if _PG is None:
        from lxml import html as LH
        _PG = []
        for f in sorted((CACHE / "pg").glob("rent-*.html")):
            t = LH.fromstring(f.read_text())
            for card in t.xpath('//*[@da-id="parent-listing-card-v2-regular"]'):
                g = lambda k: (lambda e: e[0].text_content().strip() if e else None)(card.xpath(f'.//*[@da-id="{k}"]'))
                title, price, area = g("listing-card-v2-title"), g("listing-card-v2-price"), g("listing-card-v2-area")
                if not (title and price and area) or "/mo" not in price:
                    continue
                beds = g("listing-card-v2-bedrooms")
                link = card.xpath('.//a[contains(@href,"/property-listing/")]/@href')
                imgs = [(i.get("src"), i.get("alt", "")) for i in card.xpath('.//img[@da-id="hive-image"]') if i.get("src")]
                _PG.append(dict(project=title, price=num(price.split("/")[0]), size=num(area.split("sqft")[0]),
                                rooms=num((beds or "").split("+")[0]) if beds else None,
                                url=link[0] if link else None, file=f.name, src="PropertyGuru", images=imgs))
    return _PG


def pg_rents(name):
    aliases = json.loads((ROOT / "aliases.json").read_text())
    names = [a.lower() for a in aliases.get(name, [])] + [name.lower()]
    norm = lambda x: " ".join(tokens(x))
    keys = {norm(a) for a in names}
    GENERIC = {"residence", "residences", "residensi", "suites", "suite", "condominium", "condo", "the", "service", "serviced",
               "apartment", "apartments", "pangsapuri", "kondominium", "servis", "at"}
    core = lambda x: frozenset(t for t in tokens(x) if t not in GENERIC)
    cores = {core(a) for a in names if core(a)}
    out = [c for c in pg_cards() if norm(c["project"]) in keys or (core(c["project"]) and core(c["project"]) in cores)]
    files = sorted({re.sub(r"-p\d+\.html$", ".html", c["file"]) for c in out})
    return out, files


# ---------------- Nominatim ----------------
def geocode(name, area_label, state="kuala-lumpur"):
    gcache = CACHE / "geocode.json"
    g = json.loads(gcache.read_text()) if gcache.exists() else {}
    overrides = json.loads((ROOT / "geocode_overrides.json").read_text()) if (ROOT / "geocode_overrides.json").exists() else {}
    if name in overrides:
        return overrides[name] + ["override"]
    st = "Selangor" if state == "selangor" else "Kuala Lumpur"
    k = f"{name}|{area_label}" + ("" if st == "Kuala Lumpur" else f"|{st}")
    if k not in g:
        res = None
        qs = [f"{name}, {area_label}, {st}", f"{name}, {st}"]
        if st == "Selangor":
            qs.append(f"{name}, {area_label}")
        for q in qs:
            js = fetch("https://nominatim.openstreetmap.org/search", kind="json",
                       params={"q": q, "format": "jsonv2", "limit": 1, "countrycodes": "my"})
            if js:
                res = [float(js[0]["lat"]), float(js[0]["lon"]), "nominatim"]
                break
        g[k] = res
        gcache.write_text(json.dumps(g, indent=1))
    return g[k]


def jitter(c, name):
    h = int(hashlib.md5(name.encode()).hexdigest()[:8], 16)
    ang = (h % 360) * math.pi / 180; d = 0.003 + (h % 7) * 0.001
    return [c[0] + math.sin(ang) * d, c[1] + math.cos(ang) * d]


def slug(s):
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", s.lower()))


def type_of(bt):
    b = bt.lower()
    if "service" in b or "soho" in b or "sofo" in b:
        return "Serviced Residence"
    if any(x in b for x in ["terrace", "semi", "bungalow", "cluster", "town house", "townhouse"]):
        return "Landed"
    return "Condo"


OVERRIDES = json.loads((ROOT / "geocode_overrides.json").read_text()) if (ROOT / "geocode_overrides.json").exists() else {}
EXCLUDE = {k: v for k, v in (json.loads((ROOT / "exclusions.json").read_text()) if (ROOT / "exclusions.json").exists() else {}).items() if not k.startswith("_")}
_COMPS = {}


def house_type(t):
    t = (t or "").lower()
    if re.search(r"semi[\s-]?d\b|semi[\s-]?detach", t): return "semi-d"
    if "bungalow" in t or "detached" in t: return "bungalow"
    if "cluster" in t: return "cluster"
    if "town" in t: return "townhouse"
    return "terrace"


def landed_comps(A):
    """Area-level landed rent listings (Mudah houses-for-rent), cached per area."""
    key = A["app"]
    if key in _COMPS:
        return _COMPS[key]
    items, urls = [], []
    for q in A["landed_q"]:
        url = f"https://www.mudah.my/{A['mudah']}/houses-for-rent"
        html = fetch(url, params={"q": q})
        urls.append(url + "?q=" + quote_plus(q))
        for m in re.finditer(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', html or "", re.S):
            try:
                data = json.loads(m.group(1))
            except Exception:
                continue
            for block in data if isinstance(data, list) else [data]:
                if block.get("@type") != "ItemList":
                    continue
                for el in block.get("itemListElement", []):
                    it = el.get("item", {}); place = it.get("itemOffered", {})
                    props = {p.get("name"): p.get("value") for p in place.get("additionalProperty", [])}
                    title = place.get("name", "")
                    price = num(it.get("price"))
                    if price and 1000 <= price <= 30000 and not re.search(r"room|shop|office|factory|warehouse|commercial|retail|kiosk", title, re.I):
                        items.append(dict(title=title, price=price, size=num(props.get("Floor Size")),
                                          htype=house_type(title + " " + str(props.get("Property Type", ""))),
                                          hood=re.sub(r"\s+", "", (re.search(r"\b(USJ|SS|PJS)\s?-?\d{1,2}\b", title, re.I) or [""])[0]).upper()))
    seen = set(); uniq = []
    for it in items:
        k = (it["title"], it["price"])
        if k not in seen:
            seen.add(k); uniq.append(it)
    _COMPS[key] = (uniq, urls)
    return _COMPS[key]


def landed_estimate(p, A):
    comps, urls = landed_comps(A)
    hood = re.sub(r"\s+", "", (re.search(r"\b(USJ|SS|PJS)\s?\d{1,2}\b", p["name"], re.I) or [""])[0]).upper()
    ht = house_type(p["brickz_type"])
    same_hood = [c for c in comps if hood and c["hood"] == hood and c["htype"] == ht]
    same_type = [c for c in comps if c["htype"] == ht]
    pick, basis = (same_hood, f"{hood} {ht}") if len(same_hood) >= 3 else (same_type, f"{A['en']} {ht}")
    if len(pick) < 5 and pick is same_type:  # too few comparables of this house type (e.g. semi-D / bungalow)
        return None
    return dict(rent=median([c["price"] for c in pick]), n=len(pick), basis=basis,
                rents=sorted(c["price"] for c in pick), urls=urls)


# ---- net-yield cost assumptions (Malaysian norms, see PROJECT.md) ----
VACANCY_MONTHS = 1          # ~1 month void per year
ASSESS_RATE = 0.04          # cukai taksiran: DBKL & MBSJ residential = 4% of annual value (≈ annual rent)
MAINT_AREA = {"klcc": 0.45, "bb": 0.45, "mk": 0.45, "bs": 0.45, "bss": 0.35, "sj": 0.35}  # RM psf/month incl. sinking fund


def maint_psf(p, A, is_landed):
    """Maintenance + sinking fund, RM psf/month (assumption by area/type; landed = 0)."""
    if is_landed:
        return 0.0
    bt = (p.get("brickz_type") or "").lower()
    if "flat" in bt:
        return 0.12   # low-cost / older flats: ~RM60-90 a month
    if bt == "apartment":
        return 0.25   # older walk-up / mid-rise apartments
    return MAINT_AREA.get(A["app"], 0.40)


def median(xs):
    return st.median(xs) if xs else None


def build(area_key, max_projects, brickz_pages):
    A = AREAS[area_key]
    log(f"[{A['en']}] Brickz …")
    projects = []
    full = A.get("full")
    for town in A["brickz"]:
        projects += brickz_area(town, 0 if full else brickz_pages, A.get("state", "kuala-lumpur"))
    if full:
        seen = set()
        for p in projects:  # same name can appear as landed + non-landed
            k = p["name"] + ("|L" if p["landed"] else "")
            p["_dup"] = k in seen; seen.add(k)
        projects = [p for p in projects if not p["_dup"]]
    else:
        projects = [p for p in projects if type_of(p["brickz_type"]) != "Landed"][:max_projects]
    out = []
    for p in projects:
        log(f"[{A['en']}] {p['name']}")
        is_landed = p.get("landed") or type_of(p["brickz_type"]) == "Landed"
        rents_m, rent_url = mudah_search(p, A["mudah"], "rent", landed=is_landed)
        for r in rents_m: r["src"] = "Mudah"
        rents_pg, pg_files = pg_rents(p["name"])
        typ_now = "Landed" if is_landed else type_of(p["brickz_type"])
        rents = clean_rents(rents_m + rents_pg, typ=typ_now, brickz_type=p["brickz_type"])
        sales, sale_url = ([], None) if full else mudah_search(p, A["mudah"], "sale")
        sales = clean_sales(sales)
        if p["tx_psf_median"]:  # drop spam / other-project ads: asking psf must be within 0.6–1.8× transacted psf
            sales = [x for x in sales if 0.6 <= x["price"] / x["size"] / p["tx_psf_median"] <= 1.8]
        pid = "real-" + slug(p["name"]) + ("-landed" if is_landed and full else "")
        ovr = OVERRIDES.get(pid)
        hidden = bool(ovr and ovr.get("hide"))
        if ovr and not hidden:
            geo, geo_note = [ovr["lat"], ovr["lng"]], "verified" if ovr.get("verified") else "override"
        else:
            geo = geocode(p["name"].title(), A["en"], A.get("state", "kuala-lumpur"))
            geo_note = geo[2] if geo else "approx"
            # sanity: geocode must fall within the area radius
            if geo and math.dist(geo[:2], A["c"]) > A.get("radius", 0.04):
                geo, geo_note = None, "approx"
        if hidden:
            geo, geo_note = None, "none"
        lat, lng = (geo[:2] if geo else jitter(A["c"], p["name"]))
        app_area, a_en, a_zh = A["app"], A["en"], A["zh"]
        if geo:  # Brickz towns are broad (e.g. "KL City Centre"); label by nearest map area
            near = min(APP_AREAS, key=lambda x: math.dist(x[1], geo[:2]))
            if math.dist(near[1], geo[:2]) < 0.025 and not full:
                app_area, a_en, a_zh = near[0], near[2], near[3]

        excluded = EXCLUDE.get(pid)
        rent_method = "listings"
        est = None
        if excluded:
            rents = []
        elif not rents and is_landed and A.get("landed_q"):
            est = landed_estimate(p, A)
            if est:
                rent_method = "area_comps"
        med_rent = median([r["price"] for r in rents])
        med_rent_size = median([r["size"] for r in rents])
        med_rent_psf = median([r["price"] / r["size"] for r in rents])
        ask_psf = median([s["price"] / s["size"] for s in sales])
        ask_price = median([s["price"] for s in sales])
        # size-matched gross yield: each rent listing vs (transacted median psf × that listing's size)
        ylds = [r["price"] * 12 / (p["tx_psf_median"] * r["size"]) * 100 for r in rents] if p["tx_psf_median"] else []
        gross = round(median(ylds), 2) if ylds else None
        if est:  # landed: area comparables of the same house type; yield vs Brickz median transacted price
            gross = round(est["rent"] * 12 / p["tx_price_median"] * 100, 2) if p["tx_price_median"] else None
        # ---- net yield: SAME value basis as gross (gross minus cost ratios) ----
        costs = None
        if gross is not None:
            mpsf = maint_psf(p, A, is_landed)
            size_ref = round(p["tx_price_median"] / p["tx_psf_median"]) if est else med_rent_size
            value_ref = p["tx_price_median"] if est else round(p["tx_psf_median"] * size_ref)
            fixed = 550 if is_landed else 250  # quit rent + insurance, RM/yr (landed: ~RM250 + RM300; strata: ~RM100 + RM150)
            d_vac = gross * VACANCY_MONTHS / 12
            d_assess = gross * ASSESS_RATE
            d_maint = mpsf * 12 / p["tx_psf_median"] * 100 if not est else 0.0
            d_fixed = fixed / value_ref * 100
            net = round(gross - d_vac - d_assess - d_maint - d_fixed, 2)
            costs = dict(vacancy_months=VACANCY_MONTHS, assessment_rate=ASSESS_RATE, maint_psf=mpsf, fixed_rm_yr=fixed,
                         ref_size=size_ref, ref_value=value_ref, ref_rent=med_rent if not est else est["rent"],
                         pts=dict(vacancy=round(d_vac, 3), assessment=round(d_assess, 3), maintenance=round(d_maint, 3), quit_rent_insurance=round(d_fixed, 3)))
        else:
            net = None
        ylds_ask = [r["price"] * 12 / (ask_psf * r["size"]) * 100 for r in rents] if ask_psf else []
        gross_ask = round(median(ylds_ask), 2) if ylds_ask else None
        n_rent, n_sale = len(rents), len(sales)
        conf = "low" if est else "high" if n_rent >= 8 and p["tx_count"] >= 15 else "medium" if n_rent >= 4 and p["tx_count"] >= 5 else "low"
        out.append(dict(
            id=pid, name=p["name"].title(), area=app_area, area_en=a_en, area_zh=a_zh, brickz_town=A["en"],
            region="kv", lat=None if hidden else round(lat, 6), lng=None if hidden else round(lng, 6), geo_source=geo_note,
            geo_detail=(ovr or {}).get("source") or (ovr or {}).get("reason"), on_map=not hidden,
            excluded=excluded, rent_method=None if excluded or (not rents and not est) else rent_method,
            rent_estimate=est,
            tenure=p["tenure"], type="Landed" if is_landed else type_of(p["brickz_type"]), brickz_type=p["brickz_type"],
            tx=dict(psf_median=p["tx_psf_median"], psf_q=p["tx_psf_q"], price_median=p["tx_price_median"],
                    price_q=p["tx_price_q"], count=p["tx_count"], period=p["tx_period"]),
            ask_sale=dict(price_median=ask_price, psf_median=round(ask_psf) if ask_psf else None, count=n_sale),
            ask_rent=dict(rent_median=med_rent, size_median=med_rent_size,
                          rent_psf_median=round(med_rent_psf, 2) if med_rent_psf else None, count=n_rent,
                          samples=[dict(rent=r["price"], size=r["size"], rooms=r["rooms"], src=r["src"],
                                        title=(r.get("title") or r.get("project") or "")[:160]) for r in rents][:40],
                          by_source=dict(PropertyGuru=sum(1 for r in rents if r["src"] == "PropertyGuru"), Mudah=sum(1 for r in rents if r["src"] == "Mudah"))),
            gross_yield=gross, net_yield=net, net_costs=costs, gross_yield_vs_asking=gross_ask, confidence=conf,
            sources=[dict(name="Brickz.my (transacted)", url=p["brickz_url"]),
                     *([dict(name="PropertyGuru (rent listings, via Apify)", url="https://www.propertyguru.com.my/property-for-rent?market=residential&freetext=" + quote_plus(p["name"].title()),
                             pages=["https://www.propertyguru.com.my/property-for-rent?market=residential&freetext=" + quote_plus(re.sub(r"-p\d+$", "", f[5:-5]).replace("-", " ")) for f in pg_files])]
                       if any(r["src"] == "PropertyGuru" for r in rents) else []),
                     dict(name="Mudah.my (rent listings)", url=rent_url),
                     *([dict(name="Mudah.my (landed rent comparables, area-level)", url=u) for u in est["urls"]] if est else []),
                     *([dict(name="Mudah.my (sale listings)", url=sale_url)] if sale_url else [])],
            scraped_at=NOW.isoformat(timespec="minutes"),
        ))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--areas", default="mont-kiara,klcc,bangsar,bangsar-south,subang-jaya")
    ap.add_argument("--max-projects", type=int, default=10, help="per area (Brickz top-N by transaction count)")
    ap.add_argument("--brickz-pages", type=int, default=1)
    a = ap.parse_args()
    allp = []
    summary = {}
    for k in a.areas.split(","):
        k = k.strip()
        try:
            ps = build(k, a.max_projects, a.brickz_pages)
        except Exception as e:  # keep other areas going
            log(f"!! {k}: {e}")
            ps = []
        allp += ps
        summary[k] = dict(projects=len(ps), with_yield=sum(1 for p in ps if p["gross_yield"]))
    doc = dict(generated_at=NOW.isoformat(timespec="minutes"), note="Pilot sample of public listings & transaction summaries. Asking rents ≠ achieved rents. Not investment advice.",
               summary=summary, projects=allp)
    for f in (OUT, APP_OUT):
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(json.dumps(doc, ensure_ascii=False, indent=1))
    log(json.dumps(summary))


if __name__ == "__main__":
    main()
