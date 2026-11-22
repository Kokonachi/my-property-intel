#!/usr/bin/env python3
"""Rebuild new_launches_candidates.csv/json from data/_new_launches_raw.json
and data/real_projects.json. Research-only; does not change the site.
"""
import csv, json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data"
HIGH, LANDED = {"Condo", "Serviced Residence"}, {"Landed"}
SCHEME_NO_YIELD = {"nl-serasi-samm", "nl-ppam-kysa-kiara", "nl-mlima-kiara", "nl-ria-bss"}
UNCERTAIN_OM = {"nl-damaisari"}

def family(t):
    return "landed" if t in LANDED else "highrise"

def mid(arr):
    arr = [x for x in arr if x is not None]
    if not arr:
        return None
    a = sorted(arr)
    i = len(a) // 2
    return a[i] if len(a) % 2 else (a[i - 1] + a[i]) / 2

def comps_for(projects, area, typ):
    fam, out = family(typ), []
    for p in projects:
        if p.get("area") != area or p.get("excluded"):
            continue
        if family(p.get("type")) != fam:
            continue
        rpsf = (p.get("ask_rent") or {}).get("rent_psf_median")
        if not rpsf:
            continue
        out.append({
            "id": p["id"], "name": p["name"], "type": p.get("type"),
            "rent_psf_median": rpsf,
            "rent_median": (p.get("ask_rent") or {}).get("rent_median"),
            "size_median": (p.get("ask_rent") or {}).get("size_median"),
            "gross_yield": p.get("gross_yield"),
            "n_rent": (p.get("ask_rent") or {}).get("count"),
        })
    return out

def yld(rpsf, size, price):
    if not rpsf or not size or not price:
        return None
    return round(rpsf * float(size) * 12 / float(price) * 100, 2)

def main():
    launches = json.loads((OUT / "_new_launches_raw.json").read_text())
    projects = json.loads((OUT / "real_projects.json").read_text())["projects"]
    rows = []
    for L in launches:
        comps = comps_for(projects, L["area"], L["property_type"])
        rpsf = mid([c["rent_psf_median"] for c in comps])
        typ_yields = []
        for ut in L.get("unit_types") or []:
            size = ut.get("size") or ut.get("size_min")
            typ_yields.append({
                **ut,
                "indicative_gross_pct": yld(rpsf, size, ut.get("price_from")),
                "comp_rent_psf_used": round(rpsf, 2) if rpsf else None,
            })
        om_price, om_size = L.get("open_market_from_rm"), L.get("open_market_from_size")
        project_y = yld(rpsf, om_size, om_price) if (om_price and om_size) else None
        basis = caveat = None
        if L["id"] in SCHEME_NO_YIELD:
            project_y, caveat = None, "Scheme / eligibility-priced product; no open-market typ+price pair, so no indicative yield is shown."
        elif L["id"] in UNCERTAIN_OM:
            project_y, caveat = None, "From-price may include reserved typologies and is not used for the project-level yield. See typ-level rows, which still show the raw calculation."
        elif om_price and om_size:
            basis = f"comparable median rent psf {rpsf:.2f} × {om_size} sqft × 12 ÷ RM{om_price:,.0f}" if rpsf else None
            typ_txt = (L.get("open_market_from_type") or "") + " " + (L.get("price_note") or "")
            if any(s in typ_txt.lower() for s in ("estimate", "assumed", "not fully matched", "not typ-matched")):
                caveat = "Typ-to-price pairing is an estimate (often smallest typ × official from-price). Treat the yield as indicative only."
            if L["area"] == "bb":
                extra = "Bukit Bintang has only two map comps (Residensi TRX 1 and Sunway Velocity Two); the 7.81 rent-psf median may overstate achievable rent in Imbi / Raja Chulan."
                caveat = (caveat + " " if caveat else "") + extra
            if L["id"] == "nl-armani-prestige":
                extra = "Suite size 273 sqft is much smaller than typical KLCC comps; applying the area rent psf may misstate actual rent."
                caveat = (caveat + " " if caveat else "") + extra
        elif not om_size:
            project_y, caveat = None, "No sourced unit size to pair with the from-price, so project-level yield is left blank."
        elif not om_price:
            project_y, caveat = None, "A typ size was found but the official from-price is conflicting or unreliable, so project-level yield is left blank."
        if not comps:
            caveat = (caveat + " " if caveat else "") + "No same-area, same-type rental comparables in the current map dataset."
        rec = dict(L)
        rec.update({
            "unit_types": typ_yields, "n_comparables": len(comps),
            "comp_rent_psf_median": round(rpsf, 2) if rpsf else None,
            "comparable_names": [c["name"] for c in comps], "comparables": comps,
            "indicative_gross_pct": project_y, "indicative_yield_basis": basis,
            "indicative_yield_caveat": caveat, "research_date": "2026-11-20",
        })
        rows.append(rec)

    payload = {
        "generated_at": "2026-11-20",
        "timezone_note": "Research date 20 Nov 2026, Asia/Saigon (UTC+7).",
        "scope": "New launches in areas already covered by the 143-project map only.",
        "methodology_file": "data/new_launches_methodology.md",
        "spend_usd": 0.0,
        "n_launches": len(rows),
        "counts_by_area": dict(Counter(r["area"] for r in rows)),
        "counts_by_status": dict(Counter(r["status"] for r in rows)),
        "projects": rows,
    }
    (OUT / "new_launches_candidates.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2))
    fields = [
        "id","name","developer","area","area_en","area_zh","locality","address",
        "tenure","property_type","status","launch_date","expected_completion_year",
        "total_units","units_left","list_price_min","list_price_max",
        "open_market_from_rm","open_market_from_size","open_market_from_type","entry_psf",
        "affordable_scheme","n_comparables","comp_rent_psf_median","indicative_gross_pct",
        "indicative_yield_basis","indicative_yield_caveat","source_url","render_url",
    ]
    with (OUT / "new_launches_candidates.csv").open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k) if r.get(k) is not None else "" for k in fields})
    print(f"wrote {len(rows)} launches")

if __name__ == "__main__":
    main()
