"""Self-review for the data-gap fill: new user from the home URL (zh), map counts, new project detail pages, 1440 map.
Usage: python3 scripts/review_datagaps.py <base url> <id1,id2,id3>"""
import sys, asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

BASE = sys.argv[1]
IDS = sys.argv[2].split(",")
OUT = Path('/workspace/my-property-intel/screenshots'); OUT.mkdir(exist_ok=True)
LANG = "localStorage.setItem('mpi-lang', 'zh');"
report = {}


async def ctx_page(b, w, h, mobile):
    ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2 if mobile else 1,
                              is_mobile=mobile, has_touch=mobile, locale='zh-CN')
    page = await ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    page.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' else None)
    page.on('requestfailed', lambda r: errs.append('reqfail: ' + r.url) if 'tile' not in r.url and 'basemap' not in r.url else None)
    await page.add_init_script(LANG)
    return ctx, page, errs


async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        ctx, page, errs = await ctx_page(b, 390, 844, True)
        await page.goto(BASE + '#/', wait_until='networkidle'); await page.wait_for_timeout(800)
        await page.screenshot(path=str(OUT / 'datagaps-390-zh-1-home-onboarding.png'))
        if await page.locator('[data-testid=goal-prompt-invest]').count():
            await page.locator('[data-testid=goal-prompt-invest]').click(); await page.wait_for_timeout(500)
        await page.screenshot(path=str(OUT / 'datagaps-390-zh-2-home-invest.png'))
        nav = page.locator('[data-testid=nav-map]:visible, [data-testid=to-map]:visible')
        if await nav.count():
            await nav.first.click()
        else:
            await page.goto(BASE + '#/map')
        await page.wait_for_timeout(2500)
        await page.screenshot(path=str(OUT / 'datagaps-390-zh-3-map.png'))
        report['map_390_text'] = (await page.inner_text('body'))[:400]
        for i, pid in enumerate(IDS):
            await page.goto(BASE + f'#/property/{pid}', wait_until='networkidle'); await page.wait_for_timeout(1500)
            await page.screenshot(path=str(OUT / f'datagaps-390-zh-{4 + i}-detail-{pid}.png'))
            await page.screenshot(path=str(OUT / f'datagaps-390-zh-{4 + i}-detail-{pid}-full.png'), full_page=True)
        report['errs_390'] = errs
        await ctx.close()
        ctx, page, errs = await ctx_page(b, 1440, 900, False)
        await page.goto(BASE + '#/map', wait_until='networkidle'); await page.wait_for_timeout(2500)
        await page.screenshot(path=str(OUT / 'datagaps-1440-zh-map.png'))
        # zoom out one step to show the whole Klang Valley
        for _ in range(1):
            btn = page.locator('.leaflet-control-zoom-out, [aria-label*="缩小"], [aria-label*="Zoom out"]')
            if await btn.count():
                await btn.first.click(); await page.wait_for_timeout(700)
            else:
                await page.mouse.move(900, 450); await page.mouse.wheel(0, 300); await page.wait_for_timeout(700)
        await page.wait_for_timeout(1500)
        await page.screenshot(path=str(OUT / 'datagaps-1440-zh-map-kv.png'))
        report['map_1440_text'] = (await page.inner_text('body'))[:400]
        report['errs_1440'] = errs
        await b.close()
    print(json.dumps(report, ensure_ascii=False, indent=1))

asyncio.run(main())
