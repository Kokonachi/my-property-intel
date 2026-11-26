# Klang Valley batch 2 · 巴生谷第二批（scraper/kv_batch2.py）

**Why:** before this batch the site covered 19 areas (Subang Jaya + 18 central-KL towns). Brickz lists ~1,450
non-landed projects with ≥5 transactions in KL + Selangor; whole towns such as Cheras, Setapak, Sentul, Kepong,
Ampang, Petaling Jaya, Puchong, Shah Alam, Klang and Kajang had zero projects on the map.

**Scope:** 54 more Brickz towns (20 KL, 34 Selangor), non-landed, ≥5 transactions (same floor as batch 1),
projects already on the site skipped → 1,014 candidates.

| Field | Source | Rule |
|---|---|---|
| Transacted psf / price / tx count / tenure | Brickz state index pages already cached in `scraper/photo_upgrade/sitemaps/brickz_pages/` | no new Brickz requests |
| Rents | Mudah first-page keyword search, one request per project, 15 s apart, highest-transaction projects first | ad title must name the project (`scrape.title_matches` + numbers next to the same word), room rentals dropped (`room_filter`), names with no distinctive word not searched |
| Yield | `kl_expand.yield_block` (same gross method as `scrape.py`) | shown only with ≥4 own ads |
| Coordinates | OpenStreetMap: Nominatim (bounded to the town) + one Overpass extract of named residential landuse / buildings | OSM object's own name must match; stations, mosques, schools, car parks rejected; several far-apart hits = ambiguous → not drawn; no town-centre guesses |
| Photos | none added | site uses official photos only |

PropertyGuru answers HTTP 403 (challenge) to scripted requests from this machine, so it was not used; the
challenge was not bypassed. Mudah answered HTTP 429 at 6 s spacing, so the run uses 15 s and stops after three
429s; `kv_batch2.py mudah` resumes where it stopped.

Batch-1 projects that had no coordinates were matched the same way (`kv_batch2.py patch-b1`, then
`kl_expand.py site`). KL Gateway is skipped (its location fix is in PR #5).

Rebuild: `kv_batch2.py towns → mudah → geo → osm → patch-b1 → build`, then `kl_expand.py site`.
