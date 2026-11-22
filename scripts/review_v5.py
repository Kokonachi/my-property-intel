"""Round-5 review: 375/390 × zh/en + desktop. Top-bar fit, Layers popover, pills w/o ✓, photos, net breakdown.
Usage: python3 scripts/review_v5.py [base] [prefix]"""
import sys, json, asyncio
from playwright.async_api import async_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4173/'
PFX = sys.argv[2] if len(sys.argv) > 2 else 'v5'
OUT = '/workspace/my-property-intel/screenshots'
DETAIL = 'real-laurel-residence'
async def main():
    res = {}
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        runs = [(f'm{w}-{lg}', {'width': w, 'height': 812 if w == 375 else 844}, True, lg) for w in (375, 390) for lg in ('zh', 'en')] + [('desktop-en', {'width': 1440, 'height': 900}, False, 'en')]
        for label, vp, mobile, lg in runs:
            ctx = await b.new_context(viewport=vp, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile, locale='zh-CN' if lg == 'zh' else 'en-US')
            page = await ctx.new_page(); errs = []
            page.on('pageerror', lambda e: errs.append(str(e)))
            page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
            await page.goto(BASE, wait_until='networkidle'); await page.wait_for_timeout(2500)
            r = res[label] = {}
            await page.evaluate("() => window.__map.setView([3.112, 101.666], 15)"); await page.wait_for_timeout(2500)
            await page.screenshot(path=f'{OUT}/{PFX}-{label}-map.png')
            r['pill_check_marks'] = await page.locator('.ab-pill b').count()
            r['source_toggle'] = await page.locator('[data-testid=source-toggle]').count()
            r['sample_text'] = ('Sample' in await page.inner_text('body')) or ('示例' in await page.inner_text('body'))
            # everything in the top bar inside the viewport
            r['topbar_overflow'] = await page.evaluate('''() => [...document.querySelectorAll('[data-testid=search],[data-testid=lang-toggle],[data-testid=layers-btn]')]
                .filter(e => e.offsetParent).map(e => e.getBoundingClientRect()).some(b => b.right > window.innerWidth + 0.5 || b.left < 0)''')
            await page.locator('[data-testid=layers-btn]').first.click(); await page.wait_for_timeout(400)
            panel = page.locator('[data-testid=layers-panel]')
            r['layers_in_view'] = await page.evaluate('''() => { const b = document.querySelector('[data-testid=layers-panel]').getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth }''')
            await panel.get_by_role('button', name='Net' if lg == 'en' else '净回报').click(); await page.wait_for_timeout(500)
            await page.screenshot(path=f'{OUT}/{PFX}-{label}-layers.png')
            r['net_pills_sample'] = (await page.locator('.ab-pill').all_inner_texts())[:6]
            await page.locator('[data-testid=layers-btn]').first.click(); await page.wait_for_timeout(300)
            pt = await page.evaluate('''() => { for (const e of document.querySelectorAll('.ab-pill > div')) { const b = e.getBoundingClientRect();
                if (b.width && b.top > 180 && b.bottom < innerHeight - 160 && b.left > 10 && b.right < innerWidth - 10) return [b.left + b.width / 2, b.top + b.height / 2] } return null }''')
            if pt:
                await page.mouse.click(*pt); await page.wait_for_timeout(700)
                r['peek'] = await page.locator('[data-testid=peek-card]').count()
                await page.screenshot(path=f'{OUT}/{PFX}-{label}-peek.png')
            if mobile:
                await page.mouse.click(vp['width'] // 2, 300); await page.wait_for_timeout(300)
                await page.locator('[data-testid=sheet-handle]').click(); await page.wait_for_timeout(800)
                await page.screenshot(path=f'{OUT}/{PFX}-{label}-sheet.png')
            r['photos_on_cards'] = await page.locator('[data-testid=property-list] [data-testid=photo], [data-testid=sheet] [data-testid=photo]').count()
            r['fallback_on_cards'] = await page.locator('[data-testid=property-list] [data-testid=photo-fallback], [data-testid=sheet] [data-testid=photo-fallback]').count()
            await page.goto(BASE + '#/property/' + DETAIL, wait_until='networkidle'); await page.wait_for_timeout(1500)
            await page.screenshot(path=f'{OUT}/{PFX}-{label}-detail.png')
            w = page.locator('[data-testid=yield-working]'); await w.scroll_into_view_if_needed(); await page.wait_for_timeout(300)
            await w.screenshot(path=f'{OUT}/{PFX}-{label}-net-breakdown.png')
            r['net_total'] = await page.locator('[data-testid=net-total]').inner_text()
            r['hscroll'] = await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 1')
            r['pg_links'] = [await a.get_attribute('href') for a in await page.locator('[data-testid=sources] a').all() if 'propertyguru' in (await a.get_attribute('href'))]
            r['errors'] = errs[:5]
            await ctx.close()
        await b.close()
    print(json.dumps(res, indent=1, ensure_ascii=False))
asyncio.run(main())
