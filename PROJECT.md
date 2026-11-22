# 马来西亚房地产智能平台 · Malaysia Property Intelligence (Prototype)

## Purpose
A clickable prototype to show people (investors, partners) the core idea:
**an interactive map that shows the rental yield of every property**, and clicking a
property opens a detailed investor dashboard (valuation, rent & yield trend, AI score,
nearby comparison, forecast, cash-flow calculator, transit & amenities).

## Audience
Property investors in Malaysia (Klang Valley, Johor Bahru, Penang). Chinese primary
labels with English secondary.

## Stack
- Vite + React 18 + Tailwind CSS v4 (`@tailwindcss/vite`)
- react-leaflet + Leaflet. Basemap (`src/components/Basemap.jsx`), toggle 地图 Map / 卫星 Satellite:
  - Default **OpenFreeMap Positron** vector style (https://tiles.openfreemap.org/styles/positron) rendered with
    MapLibre GL via `@maplibre/maplibre-gl-leaflet` (no key). Attribution: OpenFreeMap, OpenMapTiles, OSM contributors.
  - **Esri World Imagery** + Esri `Reference/World_Boundaries_and_Places` label overlay (raster). Attribution: Esri, Maxar, Earthstar Geographics.
    Esri basemaps are fine for a demo; production use needs an ArcGIS account/terms check.
  - `src/lib/leaflet-globals.js` sets `window.L` / `window.maplibregl` before plugins load (ES imports hoist).
- Marker clustering: `leaflet.markercluster` wrapped in `src/components/ClusterGroup.jsx`; bubble = project count,
  colour/label = average yield of children, dark corner badge = number of real-data projects inside.
- **Map UX (Airbnb-style, 2026-11-14)** in `src/pages/MapPage.jsx`: white yield pills (`.ab-pill`, colour dot = yield band,
  ✓ = real data, dark when hovered/selected); clusters on top. Desktop = card list ~55% left + rounded map right, hovering a card
  darkens its pill. Mobile = full-bleed map, floating search + filter chips, tap pill → bottom peek card (photo placeholder,
  name, area, price, rent, gross/net) → detail; draggable bottom sheet (peek/half/full) headed "N 个楼盘".
  "移动地图时搜索 Search as I move the map" checkbox filters the list to the map bounds.
- **Bilingual 中/EN** (`src/lib/i18n.jsx`): one language at a time via `t('中文', 'English')` / `L({zh, en})`; compact
  `LangToggle` in the mobile top bar, desktop header and detail headers; choice saved in `localStorage['mpi-lang']`;
  default = browser language (zh* → Chinese, else English); sets `<html lang>`. Project names/addresses are never translated.
- Detail pages: on < 640px the comparison table becomes stacked cards (name on top, then psf / rent / samples / yield,
  current project highlighted); desktop keeps the table. Real-project peers show top 8 + current, with "show all".
- Recharts for charts
- Hash routing (`#/` map, `#/property/:id` detail) — no server config needed
- Sample data / 示例数据: 55 illustrative projects generated in `src/data/properties.js` (kept for areas without real data).
- **Real data / 真实数据 (pilot)**: `data/real_projects.json` (copied to `src/data/real_projects.json`), adapted in
  `src/data/real.js`. Real projects get a dark ✓ pill, a 真实 Real / 示例 Sample / 全部 All toggle on the map, and their
  own detail page `src/pages/RealDetailPage.jsx` (sources, sample counts, scrape date, confidence, rent-vs-size scatter).

## How to run
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # outputs dist/
npm run preview
python3 scripts/review.py        # original sample-data review (needs preview on :4173)
python3 scripts/review_real.py   # basemaps (Positron + satellite), clusters, real markers, real detail page, console errors
python3 scripts/review_ab.py [base_url] [prefix]  # Airbnb-style UX at 1440 & 390 → screenshots/<prefix>-*.png
python3 scripts/review_i18n.py [base_url] [prefix] # 390 zh / 390 en / 1440 en: map, sheet, detail, peer cards, persistence

# Real-data pilot — ONE command (re-runnable; HTML cached 6 days in scraper/cache/):
scraper/run.sh                                   # all areas (mont-kiara, klcc, bangsar, bangsar-south, subang-jaya) → data/real_projects.json + src/data/real_projects.json
scraper/run.sh --areas mont-kiara --max-projects 20
npm run build && vercel --prod --scope asr-9b42  # publish
# cron example (weekly, Mon 03:00 MYT):  0 3 * * 1  cd /workspace/my-property-intel && scraper/run.sh && npm run build && vercel --prod --scope asr-9b42
```

## Folder map
```
PROJECT.md            this brief
index.html            entry
src/main.jsx          bootstrap + hash router
src/App.jsx           routes
src/data/properties.js sample projects, areas, derived metrics
src/pages/MapPage.jsx  home: full map + synced sidebar list + filters
src/pages/DetailPage.jsx property dashboard
src/components/*       shared UI (cards, calculator, sparkline, badges)
src/pages/RealDetailPage.jsx real-data project page
src/data/real.js       adapter for real_projects.json
src/components/Basemap.jsx, ClusterGroup.jsx
scraper/               real-data pilot (run.sh, scrape.py, aliases.json, import_apify.py, cache/)
data/real_projects.json scraper output
scripts/review*.py     Playwright self-reviews (review_ab.py = current map UX)
screenshots/           review output
ref/                   design reference
```

## Real-data scraper (scraper/)
- `scrape.py` — Brickz.my area table (median **transacted** psf/price, quartiles, tx count, period, tenure, type) for the
  top-N projects by transactions in each Brickz town → for each project: asking rents from **PropertyGuru** (cached pages,
  see below) + **Mudah.my** search (schema.org ld+json), asking sale prices from Mudah, geocode via **Nominatim** (1 req/s, cached,
  must fall within ~4 km of the area centroid, else area centroid + jitter flagged `approx`).
- Gross yield = median over rent ads of `rent×12 ÷ (Brickz median psf × that ad's size)` → size-matched. Also
  `gross_yield_vs_asking` (vs Mudah asking psf). Net yield (app) assumes RM0.40 psf maintenance, 8% vacancy, 0.25% + RM600 other costs.
- Confidence: high = ≥8 rent ads & ≥15 transactions; medium = ≥4 & ≥5; else low.
- `aliases.json` maps Brickz legal names (e.g. "RESIDENSI AGILE DELIMA") to marketing names used on portals ("Agile Bukit Bintang").
- PropertyGuru blocks plain HTTP (403/Cloudflare). Pages were fetched through the user's **Apify** connector
  (`apify/web-fetch`, ~US$0.0015/page) and stored with `scraper/import_apify.py <apify_output_file> [key]` → `cache/pg/rent-<key>.html`.
  The key defaults to the request URL's `freetext` + page number (e.g. `rent-bangsar-south-p2.html`), so swapped/out-of-order
  outputs land in the right file; truncated (>256 KB) bodies are salvaged. Area-wide pages (Bangsar South p1–3, Subang Jaya p1–5)
  are matched to projects by alias / normalised name / core-token set.
- **Gap filling (2026-11-14)**:
  - `enrich_streets.py` — fetches each Brickz project page (30 s apart, cached) and stores the most frequent transaction
    street names in `streets.json`.
  - `enrich_geo.py` — for every `approx` project in Bangsar South / Subang Jaya: Photon (all distinctive words of the name
    must appear in the OSM name; building/landuse/place only) → Nominatim (name words must appear in the result) →
    Nominatim on the Brickz street (result must be that exact street). Writes `geocode_overrides.json` with the source;
    anything still unplaceable gets `"hide": true` → listed in the app ("location unverified") but not drawn on the map.
    `GEO_ALIAS` holds a few hand-checked OSM names.
  - Landed rent: when a landed project has no own ads, `landed_estimate()` uses area-level Mudah `houses-for-rent` ads
    (`landed_q` searches) of the same house type — same USJ/SS neighbourhood if ≥3 ads, else the whole area if ≥5.
    Yield = median rent ×12 ÷ Brickz median price; `rent_method: "area_comps"`, confidence forced to low. Semi-D / bungalow
    have too few comps → left without yield rather than guessed.
  - `exclusions.json` — projects with no residential rental market (e.g. Sime UEP Industrial Park) keep prices but no yield.
  - Re-run order after adding areas: `run.sh` → `enrich_streets.py` → `enrich_geo.py` → `run.sh` (all cached, fast).
- **Full-coverage areas** (`full=True`: Bangsar South = Brickz town `kampung-kerinchi--bangsar-south-`, Subang Jaya = `subang-jaya`
  in Selangor): every Brickz page is walked, landed rows included (Mudah `houses-for-rent`, id suffix `-landed`), no Mudah sale
  search, no nearest-area relabel; geocoding uses the area's state (", Selangor" for Subang).
  The scraper parses whatever is cached. To automate: give the scraper an `APIFY_TOKEN` and call the
  web-fetch actor's HTTP API (not implemented yet), or license the data.
- Politeness: sequential, Brickz 30 s / Mudah 6 s / Nominatim 1.2 s per request, on-disk cache, page 1 only, no logins/CAPTCHA.
- Brickz `klcc` slug does not exist; the pilot uses town `kl-city-centre` (broad: includes TRX, Sunway Velocity…), so each
  geocoded project is relabelled to the nearest map area.

### ToS / robots notes (pilot = demo/internal research only)
| Source | robots / ToS | Status in pilot |
|---|---|---|
| Brickz.my | robots.txt `User-agent: * Disallow: /` (only named search bots allowed), Crawl-delay 120; data derived from JPPH/NAPIC | worked with curl_cffi; ~4 pages total. Needs permission/licence for production |
| Mudah.my | robots.txt comment: automated access "expressly forbidden" without permission; `/li` and `*.htm` allowed | worked (ld+json), ~100 search pages; very few listings per project. Needs permission |
| PropertyGuru / iProperty | ToS prohibit scraping; Cloudflare/403 to direct requests | only via Apify web-fetch (≈20 pages). Licence/API needed for production |
| EdgeProp | Cloudflare challenge (403) | not used |
| Bright Data | connector token invalid ("API_TOKEN is not a valid token") | not used — reconnect if needed |
| Nominatim | usage policy: ≤1 req/s, cache, identify | complied |
| NAPIC / JPPH | official, paid reports | recommended licensed base for production |

## Deploy target
Vercel (static, `vercel --prod`). Output `dist/`.
Live: https://my-property-intel.vercel.app (deployed 2026-11-12; real-data pilot + Positron/satellite + clustering 2026-11-14; Bangsar South / Subang Jaya full coverage + Airbnb-style UX 2026-11-14)

## Open questions
1. Real data sources & licensing: NAPIC (transactions), Brickz.my (transacted prices),
   PropertyGuru / iProperty (asking prices & rents), Mudah.my (rental listings) — scraping vs. partnership?
2. Yield definition: asking rent vs. achieved rent; net yield cost assumptions (maintenance, sinking fund, quit rent, assessment, vacancy).
3. Coverage scope for v1: Klang Valley only, or JB/Penang too?
4. Monetisation: freemium investor subscription, agent leads, developer listings?
5. Language: Chinese-first with English, add Bahasa Malaysia later?
6. Brand name & domain.

## Round 5 (2026-11-15): net-yield fix, photos, no sample data, Layers button
- **Net yield** is now computed in `scraper/scrape.py` on the SAME value basis as gross (transacted median psf × unit size):
  net = gross − vacancy (gross × 1/12) − assessment (gross × 4%, DBKL/MBSJ residential rate) − maintenance (maint_psf × 12 ÷ psf)
  − quit rent & insurance (RM250/yr strata, RM550/yr landed ÷ typical-unit value). Output: `net_yield`, `net_costs{maint_psf, ref_size, ref_value, ref_rent, pts{...}}`.
  Maintenance+sinking fund assumption (RM psf/month): KLCC/BB/MK/Bangsar 0.45 · Bangsar South 0.35 · Subang 0.35 · Brickz "Apartment" 0.25 · "Flat" 0.12 · landed 0.
  `src/data/real.js` no longer recomputes yields. Check: `python3 scripts/check_yields.py` (gross = per-ad median, net = gross − pts, gap 0–3, PG links search own name).
- PropertyGuru source link = `freetext=<project name>` (searched pages kept in `sources[].pages`).
- **Photos (superseded by Round 6 below)**: first pipeline accepted interiors and 800px listing thumbs. Do not reuse it.
- Sample projects removed (`properties.js` keeps only constants/helpers; `DetailPage.jsx` deleted; unknown ids redirect to the map). Heat circles = real area averages.
- Map: pills show yield only; Map/Satellite + Gross/Net + Heat live in one **Layers** popover. Review: `python3 scripts/review_v5.py [base] [prefix]`.

## Round 6 (2026-11-15): higher photo bar + KL/Selangor candidate list

Hero photos must be the **building exterior** of that specific project (a clearly identifiable pool/lobby only as second choice). Interiors, bathrooms, floor plans, brochures, text-heavy graphics, blurry/small sources, and heavy watermarks are rejected. If nothing passes, the typographic card is used — never a bad photo.

- Official PropertyGuru condo-directory galleries (`ZPPHO` at R2000) via Apify `web-fetch`, then visual review of contact sheets. Pipeline lives in `scraper/photo_upgrade/` (`curated_urls.py`, `download_official.py`, `hero_picks.json`, `export_heroes.py`).
- Exported heroes: `public/photos/<id>.webp` (~1000px) + `src/data/photos.json` with `source: "PropertyGuru project"`. `ProjectPhoto.jsx` labels these 照片：PropertyGuru 楼盘页 / Photo: PropertyGuru project page.
- Projects without an approved hero (including almost all landed townships) use the typographic fallback. Old Mudah/PG listing interiors and Esri aerials were removed from `photos.json`.
- Review: `python3 scripts/review_photos.py [base] [prefix]` (390px 中/EN, map peek + Kerinchi and other detail pages).
- **KL + Selangor expansion is not on the live site.** Reviewable list only: `data/kl_selangor_candidates.csv` (name, town, state, type, tenure, Brickz tx count, latest tx date = end of filed-transaction period, URL) and `data/kl_selangor_area_summary.csv`. Residential Brickz index only (KL 150 pages, Selangor 353 pages). The user will confirm this list before anything is added to the map.

## Round 7 (2026-11-15): Critiquito design-critique fixes

Implemented the 2026-11-15 critique (`/workspace/critique/property-intel/`) without adding KL/Selangor candidates.

- **F1 blocker:** removed the keyless Carto MiniMap. No-photo slots use the typographic name+area card; photos remain full-bleed. Never request `basemaps.cartocdn.com`.
- Cards: yield no longer in the hero; title keeps gross, footer shows net only. Mobile list uses 112px horizontal cards (about 2–3 per half-sheet).
- Mobile chrome: product name “租金回报地图” / “Yield map”; expanded sheet says “下拉回地图” / “Pull down for map” and keeps filter chips at the list top; chip row clips the next chip / fade as a scroll hint; Layers sits below the top bar.
- Map: no-yield points are hollow dots without “n/a”; Layers label is “图层：毛回报” / “Layers: Gross yield”; counts read “地图内 N / 共 143”.
- Detail: “数据更新于 2026-11-15 · 位置根据楼盘名称匹配”; sources only Brickz.my / PropertyGuru / Mudah.my; “出租 N · 出售 N”; low-sample warning beside 可信度 低 on the first screen; sticky project name when scrolling on mobile; no-rent detail uses “暂无在租样本，无法计算回报”.
- Calculator: default LTV 80%, thousand separators, upfront RM and cash-on-cash % in separate cells.
- Gateway: KL Gateway / Kuala Lumpur Gateway / Menara Suezcap kept as separate Brickz records (different prices/slugs) and labelled as the same precinct.
- MapLibre still logs 2 “Expected value to be of type number, but found null” warnings from the OpenFreeMap Positron worker (blob: URL) — not from our markers. Not patched.

## Round 8 (2026-11-15): Critiquito v2 + unit-type KPIs

- No-photo slots are a thin area-colour band (no repeated project name). Desktop no-photo cards ~150px tall.
- Map default view is zoom 11.75 (mobile 12) so markers stay inside the pane; the KLCC cluster can still cover the last letters of the “Kuala Lumpur” label because they share a location.
- EN: “1 sale” / “N sales”. “Kl Gateway” displays as “KL Gateway”.
- Rent samples ≤2: text line, not a scatter. No-yield KPI: light “暂无” / “N/A”.
- Detail KPIs state unit type: transacted price shows inferred size (price ÷ median psf) and bedrooms when a similar rent listing exists; asking rent shows beds + size. A “按户型对比” table pairs median rent with size-matched value (psf × size).
