#!/usr/bin/env python3
"""Walk Brickz KL + Selangor residential index pages and write a resumeable JSONL of projects.
Does not visit per-project pages. Cached HTML is reused. Delay 2s between live fetches."""
import json, re, time, sys
from pathlib import Path
from bs4 import BeautifulSoup
from curl_cffi import requests

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / "sitemaps" / "brickz_pages"
CACHE.mkdir(parents=True, exist_ok=True)
OUT = ROOT / "brickz_rows.jsonl"
LOG = ROOT / "logs" / "crawl_brickz.log"

# reuse pages already fetched under other names
ALIASES = {
    ("kuala-lumpur", 1): ROOT / "sitemaps" / "bz_transactions-residential-kuala-lumpur.html",
    ("kuala-lumpur", 150): ROOT / "sitemaps" / "bz_kuala-lumpur-page-150.html",
    ("selangor", 1): ROOT / "sitemaps" / "bz_transactions-residential-selangor.html",
    ("selangor", 353): ROOT / "sitemaps" / "bz_selangor-page-353.html",
}
STATES = {
    "kuala-lumpur": {"label": "Kuala Lumpur", "pages": 150},
    "selangor": {"label": "Selangor", "pages": 353},
}
NONRES = re.compile(r"\b(shop|office|industrial|commercial|retail|factory|warehouse|shop-?office|soho office)\b", re.I)
# SOHO alone is kept (often residential); 'soho office' excluded

def log(msg):
    line = time.strftime("%H:%M:%S ") + msg
    print(line, flush=True)
    with LOG.open("a") as f:
        f.write(line + "\n")

def cache_path(state, p):
    alias = ALIASES.get((state, p))
    if alias and alias.exists() and alias.stat().st_size > 1000:
        return alias
    return CACHE / f"{state}-p{p:04d}.html"

def fetch(state, p):
    fp = cache_path(state, p)
    if fp.exists() and fp.stat().st_size > 1000:
        return fp.read_text(errors="ignore"), True
    url = f"https://www.brickz.my/transactions/residential/{state}/" + (f"page/{p}/" if p > 1 else "")
    last_err = None
    for attempt in range(4):
        time.sleep(2 + attempt * 3)
        try:
            r = requests.get(url, impersonate="chrome", timeout=40)
            if r.status_code == 200 and len(r.content) >= 2000:
                dest = CACHE / f"{state}-p{p:04d}.html"
                dest.write_bytes(r.content)
                return r.text, False
            last_err = f"status={r.status_code} bytes={len(r.content)}"
        except Exception as e:
            last_err = repr(e)
        log(f"RETRY {state} p{p} attempt={attempt+1} {last_err}")
    log(f"FAIL {state} p{p} {last_err}")
    return None, False

def parse(html, state, page_url):
    s = BeautifulSoup(html, "lxml")
    rows = []
    for tr in s.select("#ptd_list_table tbody tr"):
        td = tr.find_all("td")
        if len(td) < 5 or not td[0].find("span"):
            continue
        name = td[0].find("span").get_text(strip=True)
        # town: second meaningful link/span in cell 0
        town = ""
        links = td[0].find_all("a")
        for a in links:
            href = a.get("href") or ""
            # /state/town/  (exactly one slug after state)
            m = re.search(rf"/residential/{state}/([^/]+)/?$", href.rstrip("/"))
            if m and m.group(1) not in {"page", "view", "map", "charts"}:
                town = a.get_text(strip=True) or m.group(1).replace("-", " ").title()
                town_slug = m.group(1)
                break
        else:
            town_slug = ""
        ten_span = td[1].find("span")
        tenure = ten_span.get_text(strip=True).title() if ten_span else ""
        typ_as = td[1].find_all("a")
        btype = ", ".join(a.get_text(strip=True).title() for a in typ_as if a.get_text(strip=True)) if typ_as else ""
        a = td[4].find("a")
        href = a.get("href") if a else page_url
        if href and href.startswith("/"):
            href = "https://www.brickz.my" + href
        title = a.get("title", "") if a else ""
        m = re.search(r"From (\S+) to (\S+)", title)
        def iso(d):
            # DD/MM/YYYY
            try:
                dd, mm, yy = d.split("/")
                return f"{yy}-{mm.zfill(2)}-{dd.zfill(2)}"
            except Exception:
                return d
        period_from = iso(m.group(1)) if m else ""
        period_to = iso(m.group(2)) if m else ""
        try:
            tx = int(re.sub(r"[^\d]", "", a.get_text() if a else "") or 0)
        except Exception:
            tx = 0
        landed = "/landed/" in (href or "") and "/non-landed/" not in (href or "")
        rows.append({
            "name": name,
            "town": town,
            "town_slug": town_slug,
            "state": "Kuala Lumpur" if state == "kuala-lumpur" else "Selangor",
            "state_slug": state,
            "type": btype or ("Landed" if landed else ""),
            "tenure": tenure,
            "tx_count": tx,
            "latest_tx_date": period_to,
            "period_from": period_from,
            "brickz_url": href,
            "landed": landed,
        })
    return rows

def already_done():
    seen = set()
    if OUT.exists():
        for line in OUT.read_text().splitlines():
            if not line.strip():
                continue
            rec = json.loads(line)
            seen.add((rec["state_slug"], rec.get("_page")))
        # we store _page on each row; recover pages
    pages = set()
    if OUT.exists():
        for line in OUT.read_text().splitlines():
            if line.strip():
                rec = json.loads(line)
                pages.add((rec["state_slug"], rec["_page"]))
    return pages

def main():
    done_pages = already_done()
    log(f"resume: {len(done_pages)} pages already in {OUT}")
    for state, meta in STATES.items():
        for p in range(1, meta["pages"] + 1):
            if (state, p) in done_pages:
                continue
            url = f"https://www.brickz.my/transactions/residential/{state}/" + (f"page/{p}/" if p > 1 else "")
            html, cached = fetch(state, p)
            if not html:
                continue
            rows = parse(html, state, url)
            if not rows:
                log(f"EMPTY {state} p{p} cached={cached}")
            with OUT.open("a") as f:
                for rec in rows:
                    rec["_page"] = p
                    f.write(json.dumps(rec, ensure_ascii=False) + "\n")
            log(f"{state} p{p}/{meta['pages']} rows={len(rows)} cached={cached}")
    log("DONE")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        import traceback
        log("CRASH " + traceback.format_exc())
        raise
