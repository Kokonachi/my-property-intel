"""Self-review: basemaps (Positron + satellite), clusters, real markers, real detail page, console errors.
Usage: python3 scripts/review_real.py [base_url] [shot_prefix]"""
import sys, json, asyncio
from playwright.async_api import async_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4173/'
PFX = sys.argv[2] if len(sys.argv) > 2 else 'v2'
OUT = '/workspace/my-property-intel/screenshots'

async def wait_gl(page):
    # wait until MapLibre canvas exists and has painted
    for _ in range(40):
        ok = await page.evaluate("""() => { const c = document.querySelector('.leaflet-gl-layer, canvas.maplibregl-canvas'); return !!c }""")
        if ok: break
        await page.wait_for_timeout(250)
    await page.wait_for_timeout(2500)

async def main():
    res = {}
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        for label, vp, mobile in [('desktop', {'width': 1440, 'height': 900}, False), ('mobile', {'width': 390, 'height': 844}, True)]:
            ctx = await b.new_context(viewport=vp, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile)
            page = await ctx.new_page()
            errs, failed = [], []
            page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
            page.on('pageerror', lambda e: errs.append(str(e)))
            page.on('requestfailed', lambda r: failed.append(r.url[:120]))
            ofm = []
            page.on('response', lambda r: ofm.append(r.status) if 'openfreemap' in r.url else None)
            await page.goto(BASE, wait_until='networkidle')
            await wait_gl(page)
            r = res[label] = {}
            r['gl_canvas'] = await page.locator('canvas.maplibregl-canvas').count()
            r['ofm_responses_ok'] = sum(1 for s in ofm if s == 200)
            r['clusters'] = await page.locator('.yield-cluster').count()
            r['pills'] = await page.locator('.yield-pill').count()
            r['attribution'] = await page.locator('.leaflet-control-attribution').inner_text()
            await page.screenshot(path=f'{OUT}/{PFX}-{label}-positron.png')
            # real only
            await page.locator('[data-testid=source-toggle] button:has-text("Real")').click()
            await page.wait_for_timeout(800)
            r['real_only_clusters'] = await page.locator('.yield-cluster').count()
            r['real_only_pills'] = await page.locator('.yield-pill').count()
            # zoom into Mont Kiara so real pills show
            await page.evaluate("() => { const m = document.querySelector('.leaflet-container'); }")
            await page.locator('[data-testid=source-toggle] button:has-text("All")').click()
            # satellite
            await page.locator('[data-testid=basemap-toggle] button:has-text("Satellite")').click()
            await page.wait_for_timeout(3000)
            r['sat_tiles'] = await page.evaluate("[...document.querySelectorAll('img.leaflet-tile')].filter(i=>i.src.includes('World_Imagery')&&i.complete&&i.naturalWidth>0).length")
            r['label_tiles'] = await page.evaluate("[...document.querySelectorAll('img.leaflet-tile')].filter(i=>i.src.includes('Boundaries_and_Places')&&i.complete&&i.naturalWidth>0).length")
            r['gl_after_sat'] = await page.locator('canvas.maplibregl-canvas').count()
            r['sat_attr'] = await page.locator('.leaflet-control-attribution').inner_text()
            await page.screenshot(path=f'{OUT}/{PFX}-{label}-satellite.png')
            await page.locator('[data-testid=basemap-toggle] button:has-text("Map")').click()
            await wait_gl(page)
            # open a real project via list (mobile: open list first)
            await page.goto(BASE + '#/', wait_until='networkidle'); await page.reload(wait_until='networkidle')
            await wait_gl(page)
            # zoom to Mont Kiara
            await page.evaluate("() => window.__map && window.__map.setView([3.1695, 101.654], 16)")
            await page.wait_for_timeout(2500)
            r['mk_real_pills'] = await page.locator('.yield-pill [data-real]').count()
            await page.screenshot(path=f'{OUT}/{PFX}-{label}-montkiara-real.png')
            pill = page.locator('[data-pid=real-pavilion-hilltop]')
            if await pill.count():
                await pill.click(); await page.wait_for_timeout(700)
                await page.screenshot(path=f'{OUT}/{PFX}-{label}-real-card.png')
                await page.locator('.leaflet-popup a:has-text("View details")').click()
            else:
                await page.goto(BASE + '#/property/real-pavilion-hilltop')
            await page.wait_for_timeout(1500)
            r['detail_name'] = await page.locator('[data-testid=prop-name]').inner_text()
            r['sources'] = await page.locator('[data-testid=sources] a').count()
            r['scrape_date'] = await page.locator('[data-testid=scrape-date]').inner_text()
            r['scatter_pts'] = await page.locator('[data-testid=rent-samples] .recharts-scatter-symbol').count()
            r['hscroll'] = await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 1')
            await page.screenshot(path=f'{OUT}/{PFX}-{label}-real-detail.png', full_page=True)
            # sample detail still works
            await page.goto(BASE + '#/property/bangsar-hill-park'); await page.wait_for_timeout(1200)
            r['sample_detail'] = await page.locator('[data-testid=prop-name]').inner_text()
            r['errors'] = [e for e in errs][:10]
            r['failed_requests'] = failed[:10]
            await ctx.close()
        await b.close()
    print(json.dumps(res, indent=1, ensure_ascii=False))
asyncio.run(main())
