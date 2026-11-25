"""Self-review v9 onboarding, segment granularity, and compare at 390/1440, zh/en."""
import json, sys, asyncio
from pathlib import Path
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4190/'
PFX = sys.argv[2] if len(sys.argv) > 2 else 'v9'
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
    ('zero', 0, 90, 2500, 8000),
    ('few', 2, 90, None, None),
    ('many', 5, 70, None, None),
]

async def snap(page, name, full=False):
    path = OUT / f'{PFX}-{name}.png'
    await page.screenshot(path=str(path), full_page=full)
    return str(path)

def storage_script(lang, asked=False, count=None, skipped=False, ltv=None, ltv_manual=False, rent=None, salary=None, city='kl-bss'):
    holder = {
        'asked': asked,
        'skipped': skipped,
        'count': count,
        'currentRent': rent,
        'salary': salary,
        'city': city,
        'sortBy': {'zero': 'entry', 'few': 'score', 'many': 'net'},
    }
    lines = [f"localStorage.setItem('mpi-lang', '{lang}');"]
    if asked:
        lines.append(f"localStorage.setItem('mpi-holder', {json.dumps(json.dumps(holder))});")
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

async def txt(page, sel):
    loc = page.locator(sel)
    if await loc.count():
        return await loc.first.inner_text()
    return None

async def main():
    res = {}
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            executable_path='/usr/bin/google-chrome',
            args=['--no-sandbox', '--use-gl=swiftshader', '--ignore-gpu-blocklist'],
        )
        for label, vp, mobile, lang in VIEWS:
            rec = res[label] = {'errors': [], 'console': [], 'pages': {}}

            # --- onboarding steps for 0 properties ---
            ctx, page, errs, cons = await open_page(browser, vp, mobile, lang, storage_script(lang, asked=False))
            await page.locator('[data-testid=holder-sheet]').wait_for(timeout=15000)
            body = await page.inner_text('[data-testid=holder-sheet]')
            rec['pages']['onboard-count'] = {
                'visible': await page.locator('[data-testid=holder-sheet]').count(),
                'count': await txt(page, '[data-testid=hold-count]'),
                'continue': await page.locator('[data-testid=hold-continue]').count(),
                'skip': await page.locator('[data-testid=hold-skip]').count(),
                'banned': [w for w in BANNED if w.lower() in body.lower()],
                'hscroll': await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2'),
            }
            await snap(page, f'{label}-onboard-count')

            # count is already 0; continue to budget
            await page.locator('[data-testid=hold-continue]').click()
            await page.locator('[data-testid=hold-rent]').wait_for(timeout=8000)
            await page.fill('[data-testid=hold-rent]', '2500')
            await page.fill('[data-testid=hold-salary]', '8000')
            rec['pages']['onboard-budget'] = {
                'rent': await page.locator('[data-testid=hold-rent]').input_value(),
                'salary': await page.locator('[data-testid=hold-salary]').input_value(),
                'hscroll': await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2'),
            }
            await snap(page, f'{label}-onboard-budget')

            await page.locator('[data-testid=hold-budget-continue]').click()
            await page.locator('[data-testid=hold-cities]').wait_for(timeout=8000)
            coming = await page.locator('[data-testid=hold-city-penang]').is_disabled()
            pj = await page.locator('[data-testid=hold-city-selangor-pj]').is_disabled()
            jb = await page.locator('[data-testid=hold-city-jb]').is_disabled()
            live = await page.locator('[data-testid=hold-city-kl-bss]').is_enabled()
            rec['pages']['onboard-city'] = {
                'live_enabled': live,
                'coming_soon_disabled': coming and pj and jb,
                'hscroll': await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2'),
            }
            await snap(page, f'{label}-onboard-city')
            rec['errors'].extend(errs)
            rec['console'].extend(cons)
            await ctx.close()

            # 1-2 / 3+ also have a city step: quick check on 2 properties
            ctx, page, errs, cons = await open_page(browser, vp, mobile, lang, storage_script(lang, asked=False))
            await page.locator('[data-testid=holder-sheet]').wait_for(timeout=15000)
            await page.locator('[data-testid=hold-plus]').click()
            await page.locator('[data-testid=hold-plus]').click()
            await page.locator('[data-testid=hold-continue]').click()
            await page.locator('[data-testid=hold-cities]').wait_for(timeout=8000)
            rec['pages']['onboard-few-city'] = {
                'skipped_budget': await page.locator('[data-testid=hold-rent]').count() == 0,
                'cities': await page.locator('[data-testid=hold-cities]').count(),
            }
            await snap(page, f'{label}-onboard-few-city')
            rec['errors'].extend(errs)
            rec['console'].extend(cons)
            await ctx.close()

            # --- homes and details per segment ---
            for slug, count, ltv, rent, salary in SEGMENTS:
                ctx, page, errs, cons = await open_page(
                    browser, vp, mobile, lang,
                    storage_script(lang, asked=True, count=count, ltv=ltv, rent=rent, salary=salary),
                    '#/',
                )
                await page.locator('[data-testid=launch-home]').wait_for(timeout=15000)
                await page.wait_for_timeout(250)
                body = await page.inner_text('body')
                rec['pages'][f'home-{slug}'] = {
                    'segment': await page.get_attribute('[data-testid=launch-home]', 'data-segment'),
                    'chip': await txt(page, '[data-testid=hold-chip]'),
                    'loan_pct': await page.locator('[data-testid=loan-pct-input]').first.input_value() if await page.locator('[data-testid=loan-pct-input]').count() else None,
                    'sort_chips': await page.locator('[data-testid=sort-chips]').count(),
                    'score_marks': await page.locator('[data-testid=score-mark]').count(),
                    'plain_lines': await txt(page, '[data-testid=plain-lines]'),
                    'first_card': await txt(page, '[data-testid^=score-card-]'),
                    'explainer': await page.locator('[data-testid=first-buyer-note]').count(),
                    'sheet': await page.locator('[data-testid=holder-sheet]').count(),
                    'compare_toggles': await page.locator('[data-testid^=compare-toggle-]').count(),
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
                    storage_script(lang, asked=True, count=count, ltv=ltv, rent=rent, salary=salary),
                    '#/launch/nl-aviera',
                )
                await page.wait_for_timeout(400)
                body = await page.inner_text('body')
                rec['pages'][f'detail-{slug}'] = {
                    'title': await txt(page, 'h1'),
                    'loan_pct': await page.locator('[data-testid=loan-pct-input]').first.input_value() if await page.locator('[data-testid=loan-pct-input]').count() else None,
                    'entry_cost': await txt(page, '[data-testid=entry-cost]'),
                    'salary_box': await txt(page, '[data-testid=salary-box]'),
                    'score': await page.locator('[data-testid=launch-score]').count(),
                    'score_breakdown': await txt(page, '[data-testid=score-breakdown]'),
                    'net_breakdown': await page.locator('[data-testid=net-breakdown]').count(),
                    'comp_list': await page.locator('[data-testid=comp-list]').count(),
                    'data_as_of': await txt(page, '[data-testid=data-as-of]'),
                    'how_open': await page.locator('[data-testid=how-calculated][open]').count(),
                    'first_buyer': await page.locator('[data-testid=first-buyer-note]').count(),
                    'banned': [w for w in BANNED if w.lower() in body.lower()],
                    'hscroll': await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2'),
                }
                await snap(page, f'{label}-detail-{slug}')
                if mobile:
                    await snap(page, f'{label}-detail-{slug}-full', full=True)
                rec['errors'].extend(errs)
                rec['console'].extend(cons)
                await ctx.close()

            # --- compare table (3+ home) ---
            ctx, page, errs, cons = await open_page(
                browser, vp, mobile, lang,
                storage_script(lang, asked=True, count=5, ltv=70),
                '#/',
            )
            await page.locator('[data-testid=launch-home]').wait_for(timeout=15000)
            toggles = page.locator('[data-testid^=compare-toggle-]')
            n = await toggles.count()
            if n >= 2:
                await toggles.nth(0).click()
                await toggles.nth(1).click()
            await page.locator('[data-testid=compare-bar]').wait_for(timeout=8000)
            await snap(page, f'{label}-compare-bar')
            await page.locator('[data-testid=compare-bar-open]').click()
            await page.locator('[data-testid=compare-sheet]').wait_for(timeout=8000)
            await page.wait_for_timeout(200)
            rec['pages']['compare'] = {
                'sheet': await page.locator('[data-testid=compare-sheet]').count(),
                'cols': await page.locator('[data-testid=compare-sheet] thead th').count(),
                'table_scroll': await page.locator('[data-testid=compare-table-scroll]').evaluate(
                    'el => el.scrollWidth >= el.clientWidth'
                ),
                'hscroll_page': await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2'),
            }
            await snap(page, f'{label}-compare')
            rec['errors'].extend(errs)
            rec['console'].extend(cons)
            rec['errors'] = rec['errors'][:10]
            rec['console'] = rec['console'][:10]
            await ctx.close()

        await browser.close()
    print(json.dumps(res, indent=1, ensure_ascii=False))

asyncio.run(main())
