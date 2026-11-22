"""Self-review v8 holder onboarding and segment homes at 390/1440, zh/en."""
import json, sys, asyncio
from pathlib import Path
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4180/'
PFX = sys.argv[2] if len(sys.argv) > 2 else 'v8'
OUT = Path('/workspace/my-property-intel/screenshots')
OUT.mkdir(exist_ok=True)

VIEWS = [
    ('m390-zh', {'width': 390, 'height': 844}, True, 'zh'),
    ('m390-en', {'width': 390, 'height': 844}, True, 'en'),
    ('d1440-zh', {'width': 1440, 'height': 900}, False, 'zh'),
    ('d1440-en', {'width': 1440, 'height': 900}, False, 'en'),
]
BANNED = ('第一套', '第二套', '第三套', '1st home', '2nd home', '3rd home', 'first home', 'second home', 'third home')
SEGMENTS = [
    ('zero', 0, 90),
    ('few', 2, 90),
    ('many', 5, 70),
]

async def snap(page, name, full=False):
    path = OUT / f'{PFX}-{name}.png'
    await page.screenshot(path=str(path), full_page=full)
    return str(path)

def storage_script(lang, asked=False, count=None, skipped=False, ltv=None, ltv_manual=False):
    holder = json.dumps({
        'asked': asked,
        'skipped': skipped,
        'count': count,
        'sortBy': {'zero': 'entry', 'few': 'score', 'many': 'net'},
    })
    lines = [f"localStorage.setItem('mpi-lang', '{lang}');"]
    if asked:
        lines.append(f"localStorage.setItem('mpi-holder', {json.dumps(holder)});")
    else:
        lines.append("localStorage.removeItem('mpi-holder');")
    if ltv is None:
        lines.append("localStorage.removeItem('mpi-loan');")
    else:
        loan = json.dumps({'rate': 4.3, 'years': 35, 'ltv': int(ltv), 'ltvManual': ltv_manual})
        lines.append(f"localStorage.setItem('mpi-loan', {json.dumps(loan)});")
    return '\n'.join(lines)

async def open_page(browser, vp, mobile, lang, script, hashpath='#/'):
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
    await page.add_init_script(script)
    await page.goto(BASE + hashpath, wait_until='networkidle')
    await page.wait_for_timeout(400)
    return ctx, page, errs, cons

async def main():
    res = {}
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            executable_path='/usr/bin/google-chrome',
            args=['--no-sandbox', '--use-gl=swiftshader', '--ignore-gpu-blocklist'],
        )
        for label, vp, mobile, lang in VIEWS:
            rec = res[label] = {'errors': [], 'console': [], 'pages': {}}

            ctx, page, errs, cons = await open_page(browser, vp, mobile, lang, storage_script(lang, asked=False))
            await page.locator('[data-testid=holder-sheet]').wait_for(timeout=15000)
            body = await page.inner_text('[data-testid=holder-sheet]')
            rec['pages']['onboard'] = {
                'visible': await page.locator('[data-testid=holder-sheet]').count(),
                'continue': await page.locator('[data-testid=holder-continue]').count(),
                'skip': await page.locator('[data-testid=holder-skip]').count(),
                'value': await page.locator('[data-testid=holder-count-input]').input_value(),
                'banned': [w for w in BANNED if w.lower() in body.lower()],
                'hscroll': await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2'),
            }
            await snap(page, f'{label}-onboard')
            rec['errors'].extend(errs)
            rec['console'].extend(cons)
            await ctx.close()

            for slug, count, ltv in SEGMENTS:
                ctx, page, errs, cons = await open_page(
                    browser, vp, mobile, lang,
                    storage_script(lang, asked=True, count=count, ltv=ltv),
                    '#/',
                )
                await page.locator('[data-testid=launch-home]').wait_for(timeout=15000)
                await page.wait_for_timeout(200)
                body = await page.inner_text('body')
                rec['pages'][f'home-{slug}'] = {
                    'segment': await page.get_attribute('[data-testid=launch-home]', 'data-segment'),
                    'chip': await page.locator('[data-testid=holder-chip]').inner_text(),
                    'loan_pct': await page.locator('[data-testid=loan-pct-input]').first.input_value(),
                    'sort': await page.locator('[data-testid=sort-chips] [aria-selected=true]').get_attribute('data-testid') if await page.locator('[data-testid=sort-chips] [aria-selected=true]').count() else None,
                    'intro': await page.locator('[data-testid=sort-intro]').inner_text(),
                    'first_card': await page.locator('[data-testid^=score-card-]').first.inner_text() if await page.locator('[data-testid^=score-card-]').count() else None,
                    'explainer': await page.locator('[data-testid=first-buyer-note]').count(),
                    'sheet': await page.locator('[data-testid=holder-sheet]').count(),
                    'banned': [w for w in BANNED if w.lower() in body.lower()],
                    'hscroll': await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2'),
                }
                await snap(page, f'{label}-home-{slug}')
                if mobile:
                    await snap(page, f'{label}-home-{slug}-full', full=True)
                rec['errors'].extend(errs)
                rec['console'].extend(cons)
                await ctx.close()

            ctx, page, errs, cons = await open_page(
                browser, vp, mobile, lang,
                storage_script(lang, asked=True, count=5, ltv=70),
                '#/launch/nl-aviera',
            )
            await page.wait_for_timeout(400)
            body = await page.inner_text('body')
            rec['pages']['detail-many'] = {
                'title': await page.locator('h1').first.inner_text() if await page.locator('h1').count() else None,
                'loan_pct': await page.locator('[data-testid=loan-pct-input]').first.input_value() if await page.locator('[data-testid=loan-pct-input]').count() else None,
                'loan_fold': await page.locator('[data-testid=loan-assumptions-fold]').count(),
                'loan_fold_open': await page.locator('[data-testid=loan-assumptions-fold][open]').count(),
                'investor_metrics': await page.locator('[data-testid=investor-metrics]').inner_text() if await page.locator('[data-testid=investor-metrics]').count() else None,
                'entry_cost': await page.locator('[data-testid=entry-cost]').count(),
                'chip': await page.locator('[data-testid=holder-chip]').inner_text() if await page.locator('[data-testid=holder-chip]').count() else None,
                'banned': [w for w in BANNED if w.lower() in body.lower()],
                'hscroll': await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2'),
            }
            await snap(page, f'{label}-detail-many')
            if mobile:
                await snap(page, f'{label}-detail-many-full', full=True)
            rec['errors'].extend(errs)
            rec['console'].extend(cons)
            rec['errors'] = rec['errors'][:8]
            rec['console'] = rec['console'][:8]
            await ctx.close()
        await browser.close()
    print(json.dumps(res, indent=1, ensure_ascii=False))

asyncio.run(main())
