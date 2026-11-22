import sys, json, asyncio
from playwright.async_api import async_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4173/'
OUT = '/workspace/my-property-intel/screenshots'
async def main():
    res = {}
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for label, vp, mobile in [('desktop', {'width': 1440, 'height': 900}, False), ('mobile', {'width': 390, 'height': 844}, True)]:
            ctx = await b.new_context(viewport=vp, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile)
            page = await ctx.new_page()
            errs = []
            page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
            page.on('pageerror', lambda e: errs.append(str(e)))
            await page.goto(BASE, wait_until='networkidle')
            await page.wait_for_timeout(1500)
            tiles = await page.evaluate("[...document.querySelectorAll('img.leaflet-tile')].filter(i=>i.complete&&i.naturalWidth>0).length")
            markers = await page.locator('.yield-pill').count()
            res[label] = {'tiles_loaded': tiles, 'markers': markers}
            await page.screenshot(path=f'{OUT}/{label}-map.png')
            # click a marker
            pill = page.locator('[data-pid=bangsar-hill-park]')
            await pill.click()
            await page.wait_for_timeout(700)
            popup = await page.locator('.leaflet-popup').count()
            res[label]['popup'] = popup
            await page.screenshot(path=f'{OUT}/{label}-marker-card.png')
            await page.locator('.leaflet-popup a:has-text("View details")').click()
            await page.wait_for_timeout(1200)
            res[label]['url_after'] = page.url
            res[label]['detail_name'] = await page.locator('[data-testid=prop-name]').inner_text()
            res[label]['svg_paths'] = await page.locator('[data-testid=trend-chart] .recharts-area-area, [data-testid=trend-chart] .recharts-line-curve').count()
            res[label]['radar'] = await page.locator('[data-testid=radar] .recharts-radar-polygon').count()
            res[label]['nearby_rows'] = await page.locator('[data-testid=nearby-table] tbody tr').count()
            res[label]['cashflow'] = await page.locator('[data-testid=cashflow]').inner_text()
            for t in ['1Y', '5Y']:
                await page.locator(f'[data-testid=trend-chart] button:has-text("{t}")').click()
            await page.locator('[data-testid=trend-chart] button:has-text("Yield")').click()
            await page.wait_for_timeout(300)
            res[label]['yield_lines'] = await page.locator('[data-testid=trend-chart] .recharts-line-curve').count()
            await page.locator('[data-testid=trend-chart] button:has-text("Value")').click()
            await page.locator('[data-testid=trend-chart] button:has-text("3Y")').click()
            await page.wait_for_timeout(400)
            await page.screenshot(path=f'{OUT}/{label}-detail.png', full_page=True)
            # horizontal overflow check
            res[label]['hscroll'] = await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 1')
            await page.locator('[data-testid=back]').click()
            await page.wait_for_timeout(1200)
            res[label]['back_markers'] = await page.locator('.yield-pill').count()
            if mobile:
                await page.locator('button:has-text("列表")').click()
                await page.wait_for_timeout(400)
                await page.screenshot(path=f'{OUT}/mobile-list.png')
            else:
                await page.locator('button:has-text("Area heat")').click()
                await page.locator('button:has-text("新山")').first.click()
                await page.wait_for_timeout(2000)
                res[label]['jb_list'] = await page.locator('[data-testid=property-list] li').count()
                await page.screenshot(path=f'{OUT}/desktop-jb-heat.png')
            res[label]['errors'] = errs
            await ctx.close()
        await b.close()
    print(json.dumps(res, indent=1, ensure_ascii=False))
asyncio.run(main())
