"""Photo-upgrade review: 390px zh & en, map peek + detail pages including Residensi Kerinchi.
Usage: python3 scripts/review_photos.py [base] [prefix]
"""
import sys, json, asyncio
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4173/'
PFX = sys.argv[2] if len(sys.argv) > 2 else 'photos'
OUT = '/workspace/my-property-intel/screenshots'
DETAILS = [
    'real-residensi-kerinchi',
    'real-laurel-residence',
    'real-arcoris-residences',
    'real-trinity-pentamont-mont-kiara',  # expected typographic card
]

async def main():
    res = {}
    async with async_playwright() as pw:
        b = await pw.chromium.launch(
            executable_path='/usr/bin/google-chrome',
            args=['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl',
                  '--ignore-gpu-blocklist', '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=256'],
        )
        for label, loc in [('mobile-zh', 'zh-CN'), ('mobile-en', 'en-US')]:
            ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2,
                                      is_mobile=True, has_touch=True, locale=loc)
            page = await ctx.new_page()
            errs = []
            page.on('pageerror', lambda e: errs.append(str(e)))
            page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
            r = res[label] = {}
            await page.goto(BASE, wait_until='networkidle')
            await page.wait_for_timeout(2500)
            # Bangsar South so Kerinchi is in view
            await page.evaluate("() => window.__map && window.__map.setView([3.1115, 101.6655], 15)")
            await page.wait_for_timeout(2500)
            await page.screenshot(path=f'{OUT}/{PFX}-{label}-map.png')
            # tap a visible pill for peek card
            pt = await page.evaluate('''() => {
                for (const e of document.querySelectorAll('.ab-pill > div, .ab-pill')) {
                    const b = e.getBoundingClientRect();
                    if (b.width && b.top > 160 && b.bottom < innerHeight - 140 && b.left > 8 && b.right < innerWidth - 8)
                        return [b.left + b.width/2, b.top + b.height/2];
                }
                return null;
            }''')
            r['peek_click'] = bool(pt)
            if pt:
                await page.mouse.click(*pt)
                await page.wait_for_timeout(800)
                r['peek'] = await page.locator('[data-testid=peek-card]').count()
                r['peek_photo'] = await page.locator('[data-testid=peek-card] [data-testid=photo]').count()
                r['peek_fallback'] = await page.locator('[data-testid=peek-card] [data-testid=photo-fallback]').count()
                await page.screenshot(path=f'{OUT}/{PFX}-{label}-peek.png')
            r['details'] = {}
            for pid in DETAILS:
                await page.goto(BASE + '#/property/' + pid, wait_until='networkidle')
                await page.wait_for_timeout(1200)
                await page.screenshot(path=f'{OUT}/{PFX}-{label}-{pid}.png')
                info = {
                    'photo': await page.locator('[data-testid=photo]').count(),
                    'fallback': await page.locator('[data-testid=photo-fallback]').count(),
                    'kind': await page.locator('[data-testid=photo]').first.get_attribute('data-kind') if await page.locator('[data-testid=photo]').count() else None,
                    'credit': await page.locator('[data-testid=photo-credit]').inner_text() if await page.locator('[data-testid=photo-credit]').count() else None,
                }
                r['details'][pid] = info
            r['hscroll'] = await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 1')
            r['errors'] = errs[:8]
            await ctx.close()
        await b.close()
    print(json.dumps(res, indent=1, ensure_ascii=False))

asyncio.run(main())
