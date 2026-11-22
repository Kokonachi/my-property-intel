# New-launch candidates — methodology (research only)

**Research date:** 20 Nov 2026 (Asia/Saigon / UTC+7)  
**Status:** Research inventory only. The live site was not changed and nothing was deployed. The list is for the user to confirm before any ingest or go-live. The unreviewed KLCC map-label patch was left alone.

## Scope

Only areas already covered by the 143 projects in `data/real_projects.json`:

| Map area | Code | Existing projects | Brickz town / notes |
|---|---|---:|---|
| Subang Jaya | sj | 103 | Brickz town “Subang Jaya”. Includes USJ, SS12–19, SJCC, Putra Heights, and some Sunway / Lagoon Perdana names already on the map. |
| Bangsar South | bss | 16 | Includes KL Eco City, Kerinchi, KL Gateway, Camellia, Laurel, etc. |
| Mont Kiara | mk | 10 | Mont Kiara only. |
| KLCC / KL City Centre | klcc | 8 | |
| Bangsar | bs | 4 | |
| Bukit Bintang | bb | 2 | Residensi TRX 1 and Sunway Velocity Two (TRX / BB fringe). |

Included when they sit inside that footprint: Putra Heights (The Glades, Sri Mutiara, Putra Residence already on the map) and Bandar Sunway / Tropicana Metropark / Batu Tiga **edge** names that PropLaunch files under Subang Jaya and that sit next to map projects (e.g. SouthPlace 2, Residensi Amika, Residensi Galaksi).

**Explicitly out of scope** (even if a “Subang Jaya” or “Mont Kiara” city guide lists them): Puchong, Kinrara, Serdang, Seri Kembangan, Putra Permai, Taman D’Kayangan / Juvela (Shah Alam), TWL Gemilang/Harmoni at Batu Tiga, Papyrus North Kiara (Segambut), Dutamas / Segambut “Mont Kiara” marketing names, Divine KLCC / Menara Senja (Kampung Baru), Pantai Sentral Park / Enlace, and completed projects already in `real_projects.json` (Laurel Residence, Residensi 38 Bangsar, Residensi TRX 1, etc.).

A launch is included if, as of 20 Nov 2026, it is under construction, newly launched, launching soon (permit issued, sales not open), or remaining developer stock with a completion year of 2025 or later. Almost-sold schemes (a handful of units left) are kept and flagged.

## Sources

Primary structured source: PropLaunch.my area guides and project pages (data timestamped 20 Nov 2026 on the guides). Cross-checks, where opened: EdgeProp new-launch pages (used for SouthPlace 2 permit prices), PropertyGuru agent listings, official developer pages (Aviera, UEM Sunrise MAIA release).

No Apify or Bright Data run was needed. **Spend: US$0.**

Values are copied from those sources. If a source did not state a field, it is left blank. Conflicts are recorded in `price_note` / `handover_note` rather than averaged or guessed. Coordinates were not geocoded in this pass (left blank) so no invented points appear on a future map.

## Fields

- **List price min/max:** PropLaunch (or advertising-permit) licensed range. This often includes SAMM / Bumi / affordable typologies around RM250k–RM330k.
- **Open-market from-price / size / typ:** The cheapest typ we could reasonably treat as an investor entry, when a typ+price pair could be sourced. If the only “from” figure is a likely scheme price, `open_market_from_rm` may still store the headline number but the project-level yield is left blank or heavily caveated.
- **PSF:** Stated, or derived as price ÷ size only when that typ and that price belong together. Estimated pairings (smallest typ × list minimum) are labelled as estimates.
- **Render URL:** PropLaunch / KPKT hero images when a URL was found. These are listing-site heroes, not independently confirmed brochure art.
- **Developer:** Legal entity on the PropLaunch/permit row. A parent brand is added only when a source named it (Gamuda Land, Sime Darby Property, IGB, UEM Sunrise, Tropicana, Berjaya, TA Global, SP Setia).

## Indicative gross yield (not the live-site method)

This is a **planning figure**, not the same as the map’s project gross yield (which is the median of each listing’s own `rent × 12 ÷ (median transacted psf × that listing’s size)`).

For each new launch typ that has both a size and a price:

`indicative gross % = comparable median rent psf × size × 12 ÷ launch typ price`

Comparables are **completed projects already in `real_projects.json`**, same map area, same type family (Condo and Serviced Residence are grouped as high-rise; landed is only matched to landed), not excluded, and with an `ask_rent.rent_psf_median`. The comparable rent psf used is the **median** of those projects’ `rent_psf_median` values.

| Area | Type family | n comps | Median rent psf (RM) |
|---|---|---:|---:|
| Subang Jaya | high-rise | 51 | 2.25 |
| Subang Jaya | landed | 21 | 1.39 |
| Bangsar South | high-rise | 15 | 3.64 |
| Mont Kiara | high-rise | 10 | 4.92 |
| KLCC | high-rise | 6 | 5.70 |
| Bangsar | high-rise | 3 | 4.36 |
| Bukit Bintang | high-rise | 2 | 7.81 |

Project-level `indicative_gross_pct` uses the open-market entry typ (size + price) when both exist. It is left blank when there is no size, when the product is a scheme-only price (SAMM / PPAM / RSKU / eligibility-priced), or when typ and price cannot be paired.

## Caveats (read before using any yield)

1. **“From RM250k / RM270k / RM330k” is often not an investor entry.** Many charts still show sold-out or restricted SAMM/Bumi/affordable stacks. Using that headline price would invent a 7–8% yield that a cash buyer cannot actually get.
2. **Typ-to-price pairing is sometimes an estimate** (smallest listed typ × official from-price). Those rows are labelled. Do not treat them as a confirmed SPA price.
3. **Published prices conflict** on several projects (Aviera official “from RM326,000” vs PropLaunch typ chart from RM666,000; MAIA UEM “from RM1.54m” vs PropLaunch from RM1.84m; Branniganz agent from ~RM748k vs PropLaunch ~RM1.7m and nearly sold out; Arte Solaris third-party from ~RM550k vs PropLaunch from RM1.05m). This file keeps the licensed/list figure for the project yield and notes the other figure.
4. **Bukit Bintang comparables are weak.** The map only has Residensi TRX 1 (rent psf 9.81) and Sunway Velocity Two (5.81). Neither is a classic Imbi / Jalan Raja Chulan building. A 7.81 median rent psf can overstate yields (e.g. Times Square 2).
5. **Bangsar has only three rental comps** (Residensi 38, Sri Penaga, Bangsar Permai). Federal Hill / Jalan Bangsar launches (Khaya, Parkside, Lentera) are a slightly different pocket from old Bangsar condos.
6. **Size mismatch.** Armani Prestige (273–330 sqft) is far smaller than typical KLCC comps. Applying the area rent psf can misstate the rent those suites would actually achieve.
7. **New-launch prices are not transacted prices.** Indicative yield uses the list/from price, not a Brickz median, and ignores vacancy, service charges, assessment, and quit rent (those belong to a later net-yield step).
8. **Residensi Lentera Bangsar vs The Lantern Bangsar** may be the same 180-unit project or two neighbours. They were not merged.
9. **River Park developer** is Kumpulan Gapadu on PropLaunch; some PropertyGuru copy still says Malton. Not resolved.
10. **Progress and “units left”** are snapshots (often 15–20 Nov 2026) from PropLaunch, not a live inventory feed.

## Files

- `data/new_launches_candidates.csv` — one row per launch, project-level fields and indicative yield.
- `data/new_launches_candidates.json` — same records plus typ-level yields, comparable names, and notes.
- This note.

Nothing in these files is a recommendation to buy. It is a candidate list for the user to confirm.
