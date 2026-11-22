"""Self-review redesigned completed-project detail pages at 390/1440, zh/en."""
import sys, json, asyncio
from pathlib import Path
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4177/'
PFX = sys.argv[2] if len(sys.argv) > 2 else 'detail-v6'
OUT = Path('/workspace/my-property-intel/screenshots')
OUT.mkdir(exist_ok=True)

PROJECTS = [
    ('camellia', 'real-camellia-serviced-suites'),
    ('southlink', 'real-southlink'),
]
VIEWS = [
    ('m390-zh', {'width': 390, 'height': 844}, True, 'zh'),
    ('m390-en', {'width': 390, 'height': 844}, True, 'en'),
    ('d1440-zh', {'width': 1440, 'height': 900}, False, 'zh'),
    ('d1440-en', {'width': 1440, 'height': 900}, False, 'en'),
]
BANNED = ('Confidence: Low', '可信度 低', '⚠', '⛔')

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
            await page.add_init_script(f"localStorage.setItem('mpi-lang', '{lang}'); localStorage.removeItem('mpi-loan');")
            rec = res[label] = {'errors': errs, 'console': cons, 'projects': {}}
            for slug, pid in PROJECTS:
                await page.goto(BASE + f'#/property/{pid}', wait_until='networkidle')
                await page.locator('[data-testid=prop-name]').wait_for(timeout=15000)
                await page.wait_for_timeout(400)
                body = await page.inner_text('body')
                info = {
                    'name': await page.locator('[data-testid=prop-name]').inner_text(),
                    'meta': await page.locator('[data-testid=prop-meta]').inner_text(),
                    'back_href': await page.locator('[data-testid=back]').get_attribute('href'),
                    'photo': await page.locator('[data-testid=photo]').count(),
                    'fallback': await page.locator('[data-testid=photo-fallback]').count(),
                    'confidence': await page.locator('[data-testid=confidence]').inner_text() if await page.locator('[data-testid=confidence]').count() else None,
                    'red_banner': await page.locator('[data-testid=low-sample-warning]').count(),
                    'key_facts': await page.locator('[data-testid=key-facts]').inner_text() if await page.locator('[data-testid=key-facts]').count() else None,
                    'mortgage': await page.locator('[data-testid=mortgage-vs-rent]').count(),
                    'verdict': await page.locator('[data-testid=loan-verdict]').inner_text() if await page.locator('[data-testid=loan-verdict]').count() else None,
                    'loan_pct': await page.locator('[data-testid=loan-pct-input]').input_value() if await page.locator('[data-testid=loan-pct-input]').count() else None,
                    'how': await page.locator('[data-testid=how-calculated]').count(),
                    'how_open': await page.locator('[data-testid=how-calculated][open]').count(),
                    'hscroll': await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2'),
                    'banned': [w for w in BANNED if w in body],
                    'empty_dash_tiles': '—' in (await page.locator('[data-testid=key-facts]').inner_text() if await page.locator('[data-testid=key-facts]').count() else ''),
                }
                rec['projects'][slug] = info
                await snap(page, f'{label}-{slug}')
                if slug == 'camellia' and mobile:
                    await snap(page, f'{label}-{slug}-full', full=True)
                # open data section on camellia once
                if slug == 'camellia':
                    await page.locator('[data-testid=how-calculated] summary').click()
                    await page.wait_for_timeout(200)
                    await page.locator('[data-testid=how-calculated]').scroll_into_view_if_needed()
                    await snap(page, f'{label}-{slug}-data')
            rec['errors'] = errs[:8]
            rec['console'] = cons[:8]
            await ctx.close()
        await browser.close()
    print(json.dumps(res, indent=1, ensure_ascii=False))

asyncio.run(main())
