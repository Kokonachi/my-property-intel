"""Self-review ranked home + frosted map panel at 390 and 1440, zh and en."""
import sys, json, asyncio
from pathlib import Path
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4174/'
PFX = sys.argv[2] if len(sys.argv) > 2 else 'nl-ia'
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
            await page.locator('[data-testid=score-card-nl-river-park-2b]').wait_for(timeout=15000)
            await page.wait_for_timeout(300)
            rec['pages']['home'] = {
                'html_lang': await page.evaluate('document.documentElement.lang'),
                'hscroll': await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2'),
                'cards': await page.locator('[data-testid^=score-card-]').count(),
                'first_id': await page.locator('[data-testid^=score-card-]').first.get_attribute('data-testid'),
                'river_chips': await page.locator('[data-testid=score-card-nl-river-park-2b] [data-testid=ltv-chips]').inner_text(),
                'aviera_chips': await page.locator('[data-testid=score-card-nl-aviera] [data-testid=ltv-chips]').inner_text(),
                'has_intro': await page.locator('text=先看新楼盘').count(),
                'scores': await page.locator('[data-testid=score-mark]').all_inner_texts(),
            }
            await snap(page, f'{label}-home')
            if mobile:
                await snap(page, f'{label}-home-full', full=True)

            # map with panel via URL
            await page.goto(BASE + '#/explore/nl-river-park-2b', wait_until='networkidle')
            await page.locator('[data-testid=launch-panel]').wait_for(timeout=15000)
            await page.wait_for_timeout(1800)
            rec['pages']['panel'] = {
                'panel': await page.locator('[data-testid=launch-panel]').count(),
                'pin': await page.locator('[data-testid=launch-pin-nl-river-park-2b]').count(),
                'active': await page.locator('.nl-pin.active').count(),
                'cta': await page.locator('[data-testid=panel-cta]').count(),
                'text': (await page.locator('[data-testid=launch-panel]').inner_text())[:700],
                'hscroll': await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2'),
                'stray_cluster': await page.locator('.marker-cluster').count(),
            }
            await snap(page, f'{label}-panel-river')

            # Aviera panel (direct URL so the pin does not have to be clicked if off-screen)
            await page.goto(BASE + '#/explore/nl-aviera', wait_until='networkidle')
            await page.locator('[data-testid=launch-panel]').wait_for(timeout=15000)
            await page.wait_for_timeout(1600)
            rec['pages']['panel_aviera'] = (await page.locator('[data-testid=launch-panel]').inner_text())[:400]
            rec['pages']['aviera_pin_visible'] = await page.locator('[data-testid=launch-pin-nl-aviera]').count()
            rec['pages']['river_pin_visible'] = await page.locator('[data-testid=launch-pin-nl-river-park-2b]').count()
            await snap(page, f'{label}-panel-aviera')

            rec['error_count'] = len(errs)
            rec['console_error_count'] = len([c for c in cons if 'OpenFreeMap' not in c])
            rec['console_sample'] = cons[:8]
            await ctx.close()
        await browser.close()
    Path(OUT / f'{PFX}-review.json').write_text(json.dumps(res, ensure_ascii=False, indent=2))
    for k, v in res.items():
        print('====', k, 'err', v['error_count'], 'con', v['console_error_count'])
        print('home', json.dumps(v['pages'].get('home'), ensure_ascii=False))
        print('panel', json.dumps({kk: vv if kk != 'text' else vv[:350] for kk, vv in (v['pages'].get('panel') or {}).items()}, ensure_ascii=False))
        print('aviera', v['pages'].get('panel_aviera'))

asyncio.run(main())
