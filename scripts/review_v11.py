"""Self-review v11 compare bars at 390/1440, zh/en, with and without current rent."""
import json, sys, asyncio
from pathlib import Path
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4192/'
PFX = sys.argv[2] if len(sys.argv) > 2 else 'v11'
OUT = Path('/workspace/my-property-intel/screenshots')
OUT.mkdir(exist_ok=True)

VIEWS = [
    ('m390-zh', {'width': 390, 'height': 844}, True, 'zh'),
    ('m390-en', {'width': 390, 'height': 844}, True, 'en'),
    ('d1440-zh', {'width': 1440, 'height': 900}, False, 'zh'),
    ('d1440-en', {'width': 1440, 'height': 900}, False, 'en'),
]
BANNED = ('第一套', '第二套', '第三套', '1st home', '2nd home', '3rd home', 'first home', 'second home', 'third home')
SENTENCES = (
    'Each month is',
    'If rented out',
    'Renting it out',
    '每月要比你现在付的租金',
    '租出去每月',
)

async def snap(page, name, full=False):
    path = OUT / f'{PFX}-{name}.png'
    await page.screenshot(path=str(path), full_page=full)
    return str(path)

def storage_script(lang, rent=None, salary=8000):
    holder = {
        'asked': True,
        'skipped': False,
        'count': 0,
        'currentRent': rent,
        'salary': salary,
        'city': 'kl-bss',
        'sortBy': {'zero': 'entry', 'few': 'score', 'many': 'net'},
    }
    loan = json.dumps({'rate': 4.3, 'years': 35, 'ltv': 90, 'ltvManual': False})
    return '\n'.join([
        f"localStorage.setItem('mpi-lang', '{lang}');",
        f"localStorage.setItem('mpi-holder', {json.dumps(json.dumps(holder))});",
        f"localStorage.setItem('mpi-loan', {json.dumps(loan)});",
    ])

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

def leftover_sentences(body):
    return [s for s in SENTENCES if s.lower() in (body or '').lower()]

async def inspect(page, kind):
    body = await page.inner_text('body')
    first = page.locator('[data-testid^=score-card-]').first
    return {
        'bars': await page.locator('[data-testid=compare-bars]').count(),
        'bar_inst': await txt(page, '[data-testid=bar-inst]'),
        'bar_now': await txt(page, '[data-testid=bar-now]'),
        'bar_rental': await txt(page, '[data-testid=bar-rental]'),
        'entry_stack': await page.locator('[data-testid=entry-stack]').count(),
        'first_card': await first.inner_text() if kind == 'home' and await first.count() else None,
        'entry': await txt(page, '[data-testid=entry-cost]') if kind == 'detail' else None,
        'sentences': leftover_sentences(body),
        'banned': [w for w in BANNED if w.lower() in body.lower()],
        'hscroll': await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2'),
        'aria': await page.locator('[data-testid=compare-bars]').first.get_attribute('aria-label') if await page.locator('[data-testid=compare-bars]').count() else None,
    }

async def main():
    res = {}
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            executable_path='/usr/bin/google-chrome',
            args=['--no-sandbox', '--use-gl=swiftshader', '--ignore-gpu-blocklist'],
        )
        for label, vp, mobile, lang in VIEWS:
            rec = res[label] = {'errors': [], 'console': [], 'pages': {}}
            for suffix, rent in (('rent', 2600), ('norent', None)):
                ctx, page, errs, cons = await open_page(browser, vp, mobile, lang, storage_script(lang, rent=rent), '#/')
                await page.locator('[data-testid=launch-home]').wait_for(timeout=15000)
                rec['pages'][f'home-zero-{suffix}'] = await inspect(page, 'home')
                await snap(page, f'{label}-home-zero-{suffix}')
                if mobile:
                    await snap(page, f'{label}-home-zero-{suffix}-full', full=True)
                rec['errors'].extend(errs)
                rec['console'].extend(cons)
                await ctx.close()

                ctx, page, errs, cons = await open_page(browser, vp, mobile, lang, storage_script(lang, rent=rent), '#/launch/nl-aviera')
                await page.wait_for_timeout(400)
                rec['pages'][f'detail-zero-{suffix}'] = await inspect(page, 'detail')
                await snap(page, f'{label}-detail-zero-{suffix}')
                if mobile:
                    await snap(page, f'{label}-detail-zero-{suffix}-full', full=True)
                rec['errors'].extend(errs)
                rec['console'].extend(cons)
                await ctx.close()

            rec['errors'] = rec['errors'][:10]
            rec['console'] = rec['console'][:10]
        await browser.close()
    print(json.dumps(res, indent=1, ensure_ascii=False))

asyncio.run(main())
