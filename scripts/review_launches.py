"""Self-review new-launch pages at 390 and 1440, zh and en."""
import sys, json, asyncio
from pathlib import Path
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4174/'
PFX = sys.argv[2] if len(sys.argv) > 2 else 'nl-bss'
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
    return path

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

            async def visit(key, url, wait=None):
                await page.goto(BASE + url, wait_until='networkidle')
                if wait:
                    await page.locator(wait).wait_for(timeout=15000)
                await page.wait_for_timeout(400)
                body = await page.inner_text('body')
                rec['pages'][key] = {
                    'html_lang': await page.evaluate('document.documentElement.lang'),
                    'has_cjk': any('\u4e00' <= ch <= '\u9fff' for ch in body),
                    'hscroll': await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2'),
                    'toggle': await page.locator('[data-testid=lang-toggle]').count(),
                }
                await snap(page, f'{label}-{key}', full=False)

            await visit('hub', '#/', '[data-testid=launch-card-nl-aviera]')
            if mobile:
                # full hub is short enough
                await snap(page, f'{label}-hub-full', full=True)
            await visit('aviera', '#/launch/nl-aviera', '[data-testid=typ-aviera-b]')
            await page.locator('[data-testid=price-conflict]').scroll_into_view_if_needed()
            await snap(page, f'{label}-aviera-conflict')
            typ = page.locator('[data-testid=typ-aviera-b]')
            await typ.scroll_into_view_if_needed()
            await typ.locator('[data-testid=disc-pct-aviera-b]').fill('8')
            await page.wait_for_timeout(250)
            rec['pages']['aviera_discount'] = (await typ.inner_text())[:600]
            await snap(page, f'{label}-aviera-discount')

            await visit('river', '#/launch/nl-river-park-2b', '[data-testid=typ-rp-a12]')
            typ = page.locator('[data-testid=typ-rp-a12]')
            await typ.scroll_into_view_if_needed()
            await snap(page, f'{label}-river-a12')
            typ3 = page.locator('[data-testid=typ-rp-a34]')
            await typ3.scroll_into_view_if_needed()
            await typ3.locator('[data-testid=disc-price-rp-a34]').fill('850000')
            await page.wait_for_timeout(250)
            rec['pages']['river_quote'] = (await typ3.inner_text())[:600]
            await snap(page, f'{label}-river-quote')

            await visit('map', '#/map', '[data-testid=lang-toggle]')
            await page.wait_for_timeout(1500)
            await snap(page, f'{label}-map')

            rec['error_count'] = len(errs)
            rec['console_error_count'] = len([c for c in cons if 'OpenFreeMap' not in c])
            rec['console_sample'] = cons[:8]
            await ctx.close()
        await browser.close()
    Path(OUT / f'{PFX}-review.json').write_text(json.dumps(res, ensure_ascii=False, indent=2))
    # compact print
    for k, v in res.items():
        pages = {pk: {sk: sv for sk, sv in pv.items() if sk in ('has_cjk','hscroll','html_lang')} if isinstance(pv, dict) else pv[:180] for pk, pv in v['pages'].items()}
        print(k, 'err', v['error_count'], 'con', v['console_error_count'], json.dumps(pages, ensure_ascii=False)[:500])

asyncio.run(main())
