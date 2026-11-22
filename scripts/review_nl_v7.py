"""Self-review v7 new-launch detail pages (and Camellia completed detail) at 390/1440, zh/en."""
import sys, json, asyncio, re
from pathlib import Path
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4178/'
PFX = sys.argv[2] if len(sys.argv) > 2 else 'v7'
OUT = Path('/workspace/my-property-intel/screenshots')
OUT.mkdir(exist_ok=True)

PAGES = [
    ('aviera', '#/launch/nl-aviera'),
    ('river', '#/launch/nl-river-park-2b'),
    ('camellia', '#/property/real-camellia-serviced-suites'),
]
VIEWS = [
    ('m390-zh', {'width': 390, 'height': 844}, True, 'zh'),
    ('m390-en', {'width': 390, 'height': 844}, True, 'en'),
    ('d1440-zh', {'width': 1440, 'height': 900}, False, 'zh'),
    ('d1440-en', {'width': 1440, 'height': 900}, False, 'en'),
]
# These must not appear in the folded (default) viewport body.
BANNED_ALWAYS = (
    '第一套', '第二套', '第三套', '1st home', '2nd home', '3rd home',
    'first home', 'second home', 'Confidence: Low', '可信度 低',
)
BANNED_FOLDED = (
    'Indicative gross', '参考毛回报 =', 'Bank Negara', '隔夜政策利率',
    '标准化基准利率', 'The official', 'The Edge', '“from RM',
    'Not enough nearby listings', '附近没有足够',
    'Loan assumptions (editable)', '房贷假设（可改）',
    'Developer discount (not published', '开发商折扣（网上查不到',
    'Rent-to-price', '租售比',
)

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
            rec = res[label] = {'errors': errs, 'console': cons, 'pages': {}}
            for slug, hashpath in PAGES:
                await page.goto(BASE + hashpath, wait_until='networkidle')
                await page.wait_for_timeout(500)
                body = await page.inner_text('body')
                how = page.locator('[data-testid=how-calculated]')
                score = page.locator('[data-testid=launch-score]')
                info = {
                    'title': await page.locator('h1').first.inner_text() if await page.locator('h1').count() else None,
                    'loan_pct': await page.locator('[data-testid=loan-pct-input]').first.input_value() if await page.locator('[data-testid=loan-pct-input]').count() else None,
                    'loan_rate': await page.locator('[data-testid=loan-rate]').first.input_value() if await page.locator('[data-testid=loan-rate]').count() else None,
                    'loan_years': await page.locator('[data-testid=loan-years]').first.input_value() if await page.locator('[data-testid=loan-years]').count() else None,
                    'score': (await score.inner_text()) if await score.count() else None,
                    'score_breakdown': await page.locator('[data-testid=score-breakdown]').count(),
                    'price_conflict_chip': await page.locator('[data-testid=price-conflict]').count(),
                    'price_conflict_open': await page.locator('[data-testid=price-conflict-note]').count(),
                    'thin_sample': await page.locator('[data-testid^=thin-sample-]').count(),
                    'disc_toggle': await page.locator('[data-testid^=disc-toggle-]').count(),
                    'disc_box_open': await page.locator('[data-testid^=disc-box-]').count(),
                    'loan_verdict': await page.locator('[data-testid=loan-verdict]').count(),
                    'how': await how.count(),
                    'how_open': await page.locator('[data-testid=how-calculated][open]').count(),
                    'facilities_open': await page.locator('[data-testid=facilities][open]').count(),
                    'key_facts': await page.locator('[data-testid=key-facts]').inner_text() if await page.locator('[data-testid=key-facts]').count() else None,
                    'mortgage_basis': await page.locator('[data-testid=mortgage-basis]').inner_text() if await page.locator('[data-testid=mortgage-basis]').count() else None,
                    'amber_boxes': await page.locator('.bg-amber-50, .text-amber-800').count(),
                    'empty_slash_tiles': await page.evaluate("() => Array.from(document.querySelectorAll('section,div')).some(el => /—\\s*\\/\\s*—/.test(el.innerText) && el.innerText.length < 80)"),
                    'hscroll': await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2'),
                    'banned_always': [w for w in BANNED_ALWAYS if w.lower() in body.lower()],
                    'banned_folded': [w for w in BANNED_FOLDED if w in body],
                    'body_chars': len(body),
                }
                rec['pages'][slug] = info
                await snap(page, f'{label}-{slug}')
                if mobile:
                    await snap(page, f'{label}-{slug}-full', full=True)

                # One Aviera pass at 70% to match the user's screenshot, EN only once
                if slug == 'aviera' and label == 'm390-en':
                    if await page.locator('[data-testid=loan-pct-input]').count():
                        inp = page.locator('[data-testid=loan-pct-input]').first
                        await inp.fill('70')
                        await inp.blur()
                        await page.wait_for_timeout(300)
                        rec['pages']['aviera70'] = {
                            'loan_pct': await inp.input_value(),
                            'score': await score.inner_text() if await score.count() else None,
                            'verdict': await page.locator('[data-testid=loan-verdict]').nth(1).inner_text() if await page.locator('[data-testid=loan-verdict]').count() > 1 else None,
                        }
                        await snap(page, f'{label}-aviera-70')
                        await snap(page, f'{label}-aviera-70-full', full=True)
                        # reset to default for subsequent pages in this context
                        await inp.fill('90')
                        await inp.blur()
                        await page.wait_for_timeout(200)
            rec['errors'] = errs[:8]
            rec['console'] = cons[:8]
            await ctx.close()
        await browser.close()
    print(json.dumps(res, indent=1, ensure_ascii=False))

asyncio.run(main())
