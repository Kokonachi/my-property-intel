"""Self-review v10 restart control and 0-segment entry placement at 390/1440, zh/en."""
import json, sys, asyncio
from pathlib import Path
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4191/'
PFX = sys.argv[2] if len(sys.argv) > 2 else 'v10'
OUT = Path('/workspace/my-property-intel/screenshots')
OUT.mkdir(exist_ok=True)

VIEWS = [
    ('m390-zh', {'width': 390, 'height': 844}, True, 'zh'),
    ('m390-en', {'width': 390, 'height': 844}, True, 'en'),
    ('d1440-zh', {'width': 1440, 'height': 900}, False, 'zh'),
    ('d1440-en', {'width': 1440, 'height': 900}, False, 'en'),
]
BANNED = ('第一套', '第二套', '第三套', '1st home', '2nd home', '3rd home', 'first home', 'second home', 'third home')

async def snap(page, name, full=False):
    path = OUT / f'{PFX}-{name}.png'
    await page.screenshot(path=str(path), full_page=full)
    return str(path)

def storage_script(lang, asked=False, count=None, ltv=None, ltv_manual=False, rent=None, salary=None, city='kl-bss'):
    holder = {
        'asked': asked,
        'skipped': False,
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

            # Home with an existing 3+ profile: restart is visible near the list
            ctx, page, errs, cons = await open_page(
                browser, vp, mobile, lang,
                storage_script(lang, asked=True, count=5, ltv=70),
                '#/',
            )
            await page.locator('[data-testid=launch-home]').wait_for(timeout=15000)
            rec['pages']['home-restart-location'] = {
                'home_btn': await txt(page, '[data-testid=hold-restart-home]'),
                'sheet_btn': await page.locator('[data-testid=hold-restart]').count(),
                'chip': await txt(page, '[data-testid=hold-chip]'),
                'loan_pct': await page.locator('[data-testid=loan-pct-input]').first.input_value(),
                'hscroll': await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2'),
            }
            await snap(page, f'{label}-home-restart')

            # Open the chip editor: restart is in the sheet at step 1
            await page.locator('[data-testid=hold-chip]').click()
            await page.locator('[data-testid=holder-sheet]').wait_for(timeout=8000)
            rec['pages']['editor-restart'] = {
                'sheet': await page.locator('[data-testid=holder-sheet]').count(),
                'restart': await txt(page, '[data-testid=hold-restart]'),
                'count': await txt(page, '[data-testid=hold-count]'),
                'step1': await page.locator('[data-testid=hold-continue]').count(),
            }
            await snap(page, f'{label}-editor-restart')

            # Tap restart: back to step 1 as a first visit, answers cleared, loan 90
            await page.locator('[data-testid=hold-restart]').evaluate('el => el.click()')
            await page.locator('[data-testid=holder-sheet]').wait_for(timeout=8000)
            await page.wait_for_timeout(300)
            lang_ls = await page.evaluate("localStorage.getItem('mpi-lang')")
            loan_ls = await page.evaluate("(() => { try { return JSON.parse(localStorage.getItem('mpi-loan') || '{}') } catch { return {} } })()")
            holder_ls = await page.evaluate("(() => { try { return JSON.parse(localStorage.getItem('mpi-holder') || '{}') } catch { return {} } })()")
            rec['pages']['after-restart'] = {
                'count': await txt(page, '[data-testid=hold-count]'),
                'continue': await page.locator('[data-testid=hold-continue]').count(),
                'budget': await page.locator('[data-testid=hold-rent]').count(),
                'sheet_restart': await page.locator('[data-testid=hold-restart]').count(),
                'lang': lang_ls,
                'loan': loan_ls,
                'holder': holder_ls,
                'hscroll': await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2'),
            }
            await snap(page, f'{label}-after-restart')
            rec['errors'].extend(errs)
            rec['console'].extend(cons)
            await ctx.close()

            # Also from the home list button
            ctx, page, errs, cons = await open_page(
                browser, vp, mobile, lang,
                storage_script(lang, asked=True, count=5, ltv=70, ltv_manual=True),
                '#/',
            )
            await page.locator('[data-testid=hold-restart-home]').evaluate('el => el.click()')
            await page.locator('[data-testid=holder-sheet]').wait_for(timeout=8000)
            await page.wait_for_timeout(200)
            rec['pages']['home-btn-restart'] = {
                'count': await txt(page, '[data-testid=hold-count]'),
                'continue': await page.locator('[data-testid=hold-continue]').count(),
                'loan_pct': await page.locator('[data-testid=loan-pct-input]').first.input_value() if await page.locator('[data-testid=loan-pct-input]').count() else None,
            }
            rec['errors'].extend(errs)
            rec['console'].extend(cons)
            await ctx.close()

            # 0-segment detail: cash-to-prepare sits under the photo, above facts
            ctx, page, errs, cons = await open_page(
                browser, vp, mobile, lang,
                storage_script(lang, asked=True, count=0, ltv=90, rent=2500, salary=8000),
                '#/launch/nl-aviera',
            )
            await page.wait_for_timeout(400)
            body = await page.inner_text('body')
            order = await page.evaluate('''() => {
              const hero = document.querySelector('h1');
              const entry = document.querySelector('[data-testid=entry-cost]');
              const facts = document.querySelector('[data-testid=key-facts]');
              if (!hero || !entry || !facts) return null;
              const pos = n => n.compareDocumentPosition;
              return {
                entryAfterTitle: !!(hero.compareDocumentPosition(entry) & Node.DOCUMENT_POSITION_FOLLOWING),
                entryBeforeFacts: !!(entry.compareDocumentPosition(facts) & Node.DOCUMENT_POSITION_FOLLOWING),
                entryTop: entry.getBoundingClientRect().top,
                factsTop: facts.getBoundingClientRect().top,
                heroBottom: hero.getBoundingClientRect().bottom,
              };
            }''')
            rec['pages']['detail-zero'] = {
                'title': await txt(page, 'h1'),
                'entry': await txt(page, '[data-testid=entry-cost]'),
                'order': order,
                'salary': await page.locator('[data-testid=salary-box]').count(),
                'banned': [w for w in BANNED if w.lower() in body.lower()],
                'hscroll': await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2'),
            }
            await snap(page, f'{label}-detail-zero')
            if mobile:
                await snap(page, f'{label}-detail-zero-full', full=True)
            rec['errors'].extend(errs)
            rec['console'].extend(cons)
            rec['errors'] = rec['errors'][:10]
            rec['console'] = rec['console'][:10]
            await ctx.close()

        await browser.close()
    print(json.dumps(res, indent=1, ensure_ascii=False))

asyncio.run(main())
