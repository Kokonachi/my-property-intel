"""Self-review v14 critique fixes at 390/1440, zh/en."""
import json, re, sys, asyncio
from pathlib import Path
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4195/'
PFX = sys.argv[2] if len(sys.argv) > 2 else 'v14'
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

def storage_script(lang, rent=None, salary=8000, count=0):
    holder = {
        'asked': True,
        'skipped': False,
        'count': count,
        'currentRent': rent,
        'salary': salary,
        'city': 'kl-bss',
        'sortBy': {'zero': 'entry', 'few': 'score', 'many': 'net'},
    }
    ltv = 70 if count >= 3 else 90
    loan = json.dumps({'rate': 4.3, 'years': 35, 'ltv': ltv, 'ltvManual': False})
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

async def inspect(page, kind, lang):
    body = await page.inner_text('body')
    first = page.locator('[data-testid^=score-card-]').first
    river = page.locator('[data-testid=score-card-nl-river-park-2b]')
    toggle = page.locator('[data-testid=lang-toggle]')
    toggle_box = await toggle.bounding_box() if await toggle.count() else None
    vw = await page.evaluate('window.innerWidth')
    toggle_clipped = False
    if toggle_box:
        toggle_clipped = (toggle_box['x'] + toggle_box['width']) > vw + 1 or toggle_box['x'] < -1
    restart = page.locator('[data-testid=hold-restart-home]')
    note = page.locator('[data-testid=first-buyer-note]')
    note_with_restart = False
    if await restart.count() and await note.count():
        rb, nb = await restart.bounding_box(), await note.bounding_box()
        if rb and nb:
            note_with_restart = abs((nb['y'] + nb['height']/2) - (rb['y'] + rb['height']/2)) < 20
    return {
        'tile_rent': await txt(page, '[data-testid=tile-rent]'),
        'tile_rental': await txt(page, '[data-testid=tile-rental]'),
        'metric_entry': await txt(page, '[data-testid=metric-entry]'),
        'metric_inst': await txt(page, '[data-testid=metric-inst]'),
        'entry_stack': await txt(page, '[data-testid=entry-stack]') if kind == 'detail' else None,
        'first_card': await first.inner_text() if kind.startswith('home') and await first.count() else None,
        'river_rent': await river.locator('[data-testid=tile-rent]').inner_text() if kind.startswith('home') and await river.count() and await river.locator('[data-testid=tile-rent]').count() else None,
        'river_rental': await river.locator('[data-testid=tile-rental]').inner_text() if kind.startswith('home') and await river.count() and await river.locator('[data-testid=tile-rental]').count() else None,
        'banned': [w for w in BANNED if w.lower() in body.lower()],
        'hscroll': await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2'),
        'toggle_clipped': toggle_clipped,
        'toggle_box': toggle_box,
        'note_with_restart': note_with_restart,
        'plus_on_wallet': bool(re.search(r'\+RM163', await txt(page, '[data-testid=tile-rent]') or '')),
        'errors_signs': None,
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
            ctx, page, errs, cons = await open_page(browser, vp, mobile, lang, storage_script(lang, rent=2600, count=0), '#/')
            await page.locator('[data-testid=launch-home]').wait_for(timeout=15000)
            rec['pages']['home-zero-rent'] = await inspect(page, 'home', lang)
            await snap(page, f'{label}-home-zero-rent')
            if mobile:
                await snap(page, f'{label}-home-zero-rent-full', full=True)
            rec['errors'].extend(errs); rec['console'].extend(cons)
            await ctx.close()

            ctx, page, errs, cons = await open_page(browser, vp, mobile, lang, storage_script(lang, rent=2600, count=0), '#/launch/nl-aviera')
            await page.wait_for_timeout(400)
            rec['pages']['detail-zero-rent'] = await inspect(page, 'detail', lang)
            await snap(page, f'{label}-detail-zero-rent')
            if mobile:
                await snap(page, f'{label}-detail-zero-rent-full', full=True)
            rec['errors'].extend(errs); rec['console'].extend(cons)
            await ctx.close()

            # one 3+ home per viewport (required: at least one; we do all for visual check)
            ctx, page, errs, cons = await open_page(browser, vp, mobile, lang, storage_script(lang, rent=None, count=5), '#/')
            await page.locator('[data-testid=launch-home]').wait_for(timeout=15000)
            rec['pages']['home-many'] = await inspect(page, 'home-many', lang)
            await snap(page, f'{label}-home-many')
            rec['errors'].extend(errs); rec['console'].extend(cons)
            await ctx.close()

            rec['errors'] = rec['errors'][:10]
            rec['console'] = rec['console'][:10]
        await browser.close()
    print(json.dumps(res, indent=1, ensure_ascii=False))

asyncio.run(main())
