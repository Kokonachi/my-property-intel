"""Self-review mortgage-vs-rent chips at 390 and 1440, zh and en."""
import sys, json, asyncio
from pathlib import Path
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4174/'
PFX = sys.argv[2] if len(sys.argv) > 2 else 'nl-ltv'
OUT = Path('/workspace/my-property-intel/screenshots')
OUT.mkdir(exist_ok=True)

VIEWS = [
    ('m390-zh', {'width': 390, 'height': 844}, True, 'zh'),
    ('m390-en', {'width': 390, 'height': 844}, True, 'en'),
    ('d1440-zh', {'width': 1440, 'height': 900}, False, 'zh'),
    ('d1440-en', {'width': 1440, 'height': 900}, False, 'en'),
]

async def snap(page, name, full=False):
    path = OUT / f'{PFX}-{name}.png'
    await page.screenshot(path=str(path), full_page=full)
    return str(path)

async def main():
    res = {}
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            executable_path='/usr/bin/google-chrome',
            args=['--no-sandbox', '--use-gl=swiftshader', '--ignore-gpu-blocklist'],
        )
        for label, vp, mobile, lang in VIEWS:
            ctx = await browser.new_context(
                viewport=vp,
                device_scale_factor=2 if mobile else 1,
                is_mobile=mobile,
                has_touch=mobile,
                locale='zh-CN' if lang == 'zh' else 'en-US',
            )
            page = await ctx.new_page()
            errs, cons = [], []
            page.on('pageerror', lambda e: errs.append(str(e)))
            page.on('console', lambda m: cons.append(m.text) if m.type == 'error' else None)
            await page.add_init_script(f"localStorage.setItem('mpi-lang', '{lang}')")
            rec = res[label] = {'errors': errs, 'console': cons, 'pages': {}}

            await page.goto(BASE + '#/', wait_until='networkidle')
            await page.locator('[data-testid=launch-card-nl-aviera]').wait_for(timeout=15000)
            await page.wait_for_timeout(1800)
            rec['pages']['hub'] = {
                'html_lang': await page.evaluate('document.documentElement.lang'),
                'hscroll': await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2'),
                'chips_on_card': await page.locator('[data-testid=launch-card-nl-aviera] [data-testid=ltv-chips]').count(),
                'aviera_chips': (await page.locator('[data-testid=launch-card-nl-aviera] [data-testid=ltv-chips]').inner_text()) if await page.locator('[data-testid=launch-card-nl-aviera] [data-testid=ltv-chips]').count() else None,
                'river_chips': (await page.locator('[data-testid=launch-card-nl-river-park-2b] [data-testid=ltv-chips]').inner_text()) if await page.locator('[data-testid=launch-card-nl-river-park-2b] [data-testid=ltv-chips]').count() else None,
                'yellow_banner': await page.locator('text=开发商折扣').count(),
                'intro': await page.locator('text=先看新楼盘').count(),
                'pin_aviera': await page.locator('[data-testid=launch-pin-nl-aviera]').count(),
                'pin_group': await page.locator('[data-testid=launch-pin-group]').count(),
                'stray_cluster': await page.locator('.marker-cluster, .leaflet-marker-icon.marker-cluster').count(),
            }
            await snap(page, f'{label}-hub')

            # Select Aviera pin
            pin = page.locator('[data-testid=launch-pin-nl-aviera]')
            if await pin.count():
                await pin.click(force=True)
                await page.wait_for_timeout(600)
            rec['pages']['selected'] = {
                'active_pin': await page.locator('.nl-pin.active').count(),
            }
            await snap(page, f'{label}-selected')

            # Aviera detail typ B + loan bar
            await page.goto(BASE + '#/launch/nl-aviera', wait_until='networkidle')
            typ = page.locator('[data-testid=typ-aviera-b]')
            await typ.wait_for(timeout=15000)
            await typ.scroll_into_view_if_needed()
            await page.wait_for_timeout(300)
            rec['pages']['aviera_b'] = (await typ.inner_text())[:800]
            rec['pages']['loan_bar'] = await page.locator('[data-testid=loan-assumptions]').count()
            rec['pages']['ltv_compare'] = await typ.locator('[data-testid=ltv-compare]').count()
            await snap(page, f'{label}-aviera-b')

            # studio typ (both LTVs short)
            typa = page.locator('[data-testid=typ-aviera-a]')
            if await typa.count():
                await typa.scroll_into_view_if_needed()
                await page.wait_for_timeout(200)
                rec['pages']['aviera_a'] = (await typa.locator('[data-testid=ltv-chips]').inner_text())
                await snap(page, f'{label}-aviera-a')

            rec['pages']['hscroll_detail'] = await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2')
            rec['error_count'] = len(errs)
            rec['console_error_count'] = len([c for c in cons if 'OpenFreeMap' not in c])
            rec['console_sample'] = cons[:8]
            await ctx.close()
        await browser.close()
    Path(OUT / f'{PFX}-review.json').write_text(json.dumps(res, ensure_ascii=False, indent=2))
    for k, v in res.items():
        print('====', k, 'err', v['error_count'], 'con', v['console_error_count'])
        print('hub', json.dumps(v['pages'].get('hub'), ensure_ascii=False))
        print('selected', v['pages'].get('selected'))
        print('aviera_b', (v['pages'].get('aviera_b') or '')[:400])
        print('aviera_a', v['pages'].get('aviera_a'))

asyncio.run(main())
