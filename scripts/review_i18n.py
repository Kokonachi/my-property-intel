"""Bilingual + detail-page review at 390 (zh & en) and 1440 (en). Usage: python3 scripts/review_i18n.py [base] [prefix]"""
import sys, json, asyncio
from playwright.async_api import async_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4173/'
PFX = sys.argv[2] if len(sys.argv) > 2 else 'i18n'
OUT = '/workspace/my-property-intel/screenshots'
DETAIL = 'real-subang-perdana-goodyear-court-8'
async def main():
    res = {}
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        for label, vp, mobile, loc in [('mobile-zh', {'width': 390, 'height': 844}, True, 'zh-CN'), ('mobile-en', {'width': 390, 'height': 844}, True, 'en-US'), ('desktop-en', {'width': 1440, 'height': 900}, False, 'en-US')]:
            ctx = await b.new_context(viewport=vp, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile, locale=loc)
            page = await ctx.new_page(); errs = []
            page.on('pageerror', lambda e: errs.append(str(e)))
            page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
            await page.goto(BASE, wait_until='networkidle'); await page.wait_for_timeout(3000)
            r = res[label] = {}
            r['html_lang'] = await page.evaluate('document.documentElement.lang')
            r['toggle'] = await page.locator('[data-testid=lang-toggle]').count()
            await page.evaluate("() => window.__map.setView([3.06, 101.59], 13)"); await page.wait_for_timeout(3000)
            await page.screenshot(path=f'{OUT}/{PFX}-{label}-map.png')
            body = await page.inner_text('body')
            r['has_cjk'] = any('\u4e00' <= ch <= '\u9fff' for ch in body)
            if mobile:
                await page.locator('[data-testid=sheet-handle]').click(); await page.wait_for_timeout(700)
                await page.screenshot(path=f'{OUT}/{PFX}-{label}-sheet.png')
            await page.goto(BASE + '#/property/' + DETAIL, wait_until='networkidle'); await page.wait_for_timeout(1500)
            await page.screenshot(path=f'{OUT}/{PFX}-{label}-detail.png')
            peer = page.locator('[data-testid=peer-cards]' if mobile else '[data-testid=peer-table]')
            await peer.scroll_into_view_if_needed(); await page.wait_for_timeout(400)
            await page.screenshot(path=f'{OUT}/{PFX}-{label}-detail-peers.png')
            r['peer_visible'] = await peer.is_visible()
            r['hscroll'] = await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 1')
            dbody = await page.inner_text('main')
            r['detail_cjk_chars'] = sum(1 for ch in dbody if '\u4e00' <= ch <= '\u9fff')
            r['detail_has_english_labels'] = 'Transactions' in dbody
            # persistence: toggle and reload
            await page.locator('[data-testid=lang-toggle]').click(); await page.wait_for_timeout(300)
            await page.reload(wait_until='networkidle'); await page.wait_for_timeout(800)
            r['after_toggle_reload_lang'] = await page.evaluate("localStorage.getItem('mpi-lang')")
            r['errors'] = errs[:5]
            await ctx.close()
        await b.close()
    print(json.dumps(res, indent=1, ensure_ascii=False))
asyncio.run(main())
