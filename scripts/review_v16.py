"""Screenshot v16 L/D skins at 390px."""
import json, sys, asyncio
from pathlib import Path
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4196/'
OUT = Path('/workspace/my-property-intel/screenshots')
OUT.mkdir(exist_ok=True)

def storage(lang, rent=None, salary=8000, count=0):
    holder = {
        'asked': True, 'skipped': False, 'count': count,
        'currentRent': rent, 'salary': salary, 'city': 'kl-bss',
        'sortBy': {'zero': 'entry', 'few': 'score', 'many': 'net'},
    }
    ltv = 70 if count >= 3 else 90
    loan = json.dumps({'rate': 4.3, 'years': 35, 'ltv': ltv, 'ltvManual': False})
    return '\n'.join([
        f"localStorage.setItem('mpi-lang', '{lang}');",
        f"localStorage.setItem('mpi-holder', {json.dumps(json.dumps(holder))});",
        f"localStorage.setItem('mpi-loan', {json.dumps(loan)});",
    ])

async def open_page(browser, lang, script, hashpath, height=844):
    ctx = await browser.new_context(
        viewport={'width': 390, 'height': height},
        device_scale_factor=2, is_mobile=True, has_touch=True,
        locale='zh-CN' if lang == 'zh' else 'en-US',
    )
    page = await ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    await page.add_init_script(script)
    await page.goto(BASE + hashpath, wait_until='networkidle')
    await page.wait_for_timeout(500)
    return ctx, page, errs

async def crop_cards(page, path):
    cards = page.locator('[data-testid^=score-card-]')
    n = await cards.count()
    if n < 2:
        return
    box1 = await cards.nth(0).bounding_box()
    box2 = await cards.nth(1).bounding_box()
    if not box1 or not box2:
        return
    x = min(box1['x'], box2['x']) - 8
    y = min(box1['y'], box2['y']) - 8
    w = max(box1['x']+box1['width'], box2['x']+box2['width']) - x + 8
    h = max(box1['y']+box1['height'], box2['y']+box2['height']) - y + 8
    await page.screenshot(path=str(path), clip={
        'x': max(0, x), 'y': max(0, y),
        'width': min(w, 390), 'height': min(h, 1600),
    })

async def crop_hero(page, path):
    loc = page.locator('[data-testid=detail-hero]')
    if await loc.count():
        await loc.screenshot(path=str(path))

async def card_text(page, id):
    loc = page.locator(f'[data-testid=score-card-{id}]')
    if not await loc.count():
        return None
    return {
        'text': (await loc.inner_text()).replace('\n', ' | ')[:400],
        'rental': await loc.locator('[data-testid=tile-rental]').inner_text() if await loc.locator('[data-testid=tile-rental]').count() else None,
        'inst': await loc.locator('[data-testid=tile-inst]').inner_text() if await loc.locator('[data-testid=tile-inst]').count() else None,
        'delta': await loc.locator('[data-testid=tile-rent]').inner_text() if await loc.locator('[data-testid=tile-rent]').count() else None,
    }

async def main():
    res = {}
    jobs = [
        ('L', 'zh', 'zero', '#/?skin=l', 'v16L-m390-zh-home-zero-rent.png', 'home'),
        ('L', 'en', 'zero', '#/?skin=l', 'v16L-m390-en-home-zero-rent.png', 'home'),
        ('D', 'zh', 'zero', '#/?skin=d', 'v16D-m390-zh-home-zero-rent.png', 'home'),
        ('L', 'zh', 'zero', '#/launch/nl-aviera?skin=l', 'v16L-m390-zh-detail-zero-rent.png', 'detail'),
        ('L', 'en', 'zero', '#/launch/nl-aviera?skin=l', 'v16L-m390-en-detail-zero-rent.png', 'detail'),
        ('D', 'zh', 'zero', '#/launch/nl-aviera?skin=d', 'v16D-m390-zh-detail-zero-rent.png', 'detail'),
        ('L', 'zh', 'many', '#/?skin=l', 'v16L-m390-zh-home-many.png', 'home'),
        ('D', 'zh', 'many', '#/?skin=d', 'v16D-m390-zh-home-many.png', 'home'),
    ]
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            executable_path='/usr/bin/google-chrome',
            args=['--no-sandbox', '--use-gl=swiftshader', '--ignore-gpu-blocklist'],
        )
        for skin, lang, kind, hashpath, name, page_kind in jobs:
            count = 5 if kind == 'many' else 0
            rent = None if kind == 'many' else 2600
            height = 1300 if page_kind == 'home' else 844
            ctx, page, errs = await open_page(browser, lang, storage(lang, rent=rent, count=count), hashpath, height=height)
            rec = {'errors': errs, 'skin': skin, 'kind': kind, 'hscroll': await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2')}
            if page_kind == 'home':
                await page.locator('[data-testid=launch-home]').wait_for(timeout=15000)
                rec['aviera'] = await card_text(page, 'nl-aviera')
                rec['river'] = await card_text(page, 'nl-river-park-2b')
                await page.screenshot(path=str(OUT / name))
                await crop_cards(page, OUT / name.replace('.png', '-cards.png'))
            else:
                rec['hero'] = (await page.locator('[data-testid=detail-hero]').inner_text()).replace('\n',' | ')[:500] if await page.locator('[data-testid=detail-hero]').count() else None
                rec['entry'] = (await page.locator('[data-testid=entry-cost]').inner_text()).replace('\n',' | ')[:500] if await page.locator('[data-testid=entry-cost]').count() else None
                await page.screenshot(path=str(OUT / name))
                await crop_hero(page, OUT / name.replace('.png', '-hero.png'))
            res[name] = rec
            await ctx.close()
        await browser.close()
    print(json.dumps(res, indent=1, ensure_ascii=False))

asyncio.run(main())
