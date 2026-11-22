"""Airbnb-style UX review at 1440 & 390. Usage: python3 scripts/review_ab.py [base] [prefix]"""
import sys, json, asyncio
from playwright.async_api import async_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4173/'
PFX = sys.argv[2] if len(sys.argv) > 2 else 'after'
OUT = '/workspace/my-property-intel/screenshots'
async def settle(page, ms=2500):
    for _ in range(40):
        if await page.locator('canvas.maplibregl-canvas').count(): break
        await page.wait_for_timeout(250)
    await page.wait_for_timeout(ms)
async def main():
    res = {}
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        for label, vp, mobile in [('desktop', {'width': 1440, 'height': 900}, False), ('mobile', {'width': 390, 'height': 844}, True)]:
            ctx = await b.new_context(viewport=vp, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile)
            page = await ctx.new_page(); errs = []
            page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
            page.on('pageerror', lambda e: errs.append(str(e)))
            await page.goto(BASE, wait_until='networkidle'); await settle(page)
            r = res[label] = {}
            r['gl'] = await page.locator('canvas.maplibregl-canvas').count()
            r['pills'] = await page.locator('.ab-pill').count(); r['clusters'] = await page.locator('.yield-cluster').count()
            await page.screenshot(path=f'{OUT}/{PFX}-{label}-map.png')
            # zoom to Mont Kiara to show real pills
            await page.evaluate("() => window.__map.setView([3.1695, 101.654], 15)"); await page.wait_for_timeout(2500)
            r['mk_real_pills'] = await page.locator('.ab-pill [data-real]').count()
            if not mobile:
                card = page.locator('[data-card=real-pavilion-hilltop]').first
                await card.hover(); await page.wait_for_timeout(400)
                r['hover_highlight'] = await page.locator('.ab-pill.active [data-pid=real-pavilion-hilltop]').count()
                await page.screenshot(path=f'{OUT}/{PFX}-desktop-hover.png')
            pill = page.locator('[data-pid=real-pavilion-hilltop]').first
            await pill.click(); await page.wait_for_timeout(600)
            r['peek_card'] = await page.locator('[data-testid=peek-card]').count()
            await page.screenshot(path=f'{OUT}/{PFX}-{label}-selected.png')
            # satellite
            await page.locator('[data-testid=basemap-toggle] button:has-text("Satellite")').click(); await page.wait_for_timeout(3000)
            r['sat_tiles'] = await page.evaluate("[...document.querySelectorAll('img.leaflet-tile')].filter(i=>i.src.includes('World_Imagery')&&i.complete&&i.naturalWidth>0).length")
            r['label_tiles'] = await page.evaluate("[...document.querySelectorAll('img.leaflet-tile')].filter(i=>i.src.includes('Boundaries_and_Places')&&i.complete&&i.naturalWidth>0).length")
            r['attr_sat'] = await page.locator('.leaflet-control-attribution').inner_text()
            await page.screenshot(path=f'{OUT}/{PFX}-{label}-satellite.png')
            await page.locator('[data-testid=basemap-toggle] button:has-text("Map")').click(); await settle(page, 1500)
            r['attr_map'] = await page.locator('.leaflet-control-attribution').inner_text()
            if mobile:
                await page.locator('[data-testid=peek-card] button[aria-label=close]').click()
                await page.evaluate("() => window.__map.setView([3.12, 101.68], 12)"); await page.wait_for_timeout(1500)
                h = page.locator('[data-testid=sheet-handle]')
                await h.click(); await page.wait_for_timeout(600)
                r['sheet_after_tap'] = await page.locator('[data-testid=sheet]').get_attribute('data-snap')
                await page.screenshot(path=f'{OUT}/{PFX}-mobile-sheet-half.png')
                # drag up to full
                bb = await h.bounding_box()
                await page.mouse.move(bb['x'] + bb['width'] / 2, bb['y'] + 10); await page.mouse.down()
                await page.mouse.move(bb['x'] + bb['width'] / 2, 60, steps=8); await page.mouse.up(); await page.wait_for_timeout(600)
                r['sheet_after_drag'] = await page.locator('[data-testid=sheet]').get_attribute('data-snap')
                await page.screenshot(path=f'{OUT}/{PFX}-mobile-sheet-full.png')
                r['sheet_cards'] = await page.locator('[data-testid=sheet] [data-card]').count()
                await page.locator('[data-testid=sheet] [data-card]').first.click(); await page.wait_for_timeout(1200)
            else:
                await page.locator('[data-testid=peek-card] a').click(); await page.wait_for_timeout(1200)
            r['detail'] = await page.locator('[data-testid=prop-name]').inner_text()
            r['hscroll'] = await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 1')
            r['errors'] = errs[:8]
            await ctx.close()
        await b.close()
    print(json.dumps(res, indent=1, ensure_ascii=False))
asyncio.run(main())
