"""Screenshot v15 card alternatives at 390px."""
import json, sys, asyncio
from pathlib import Path
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4195/'
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

async def open_page(browser, lang, script, hashpath):
    ctx = await browser.new_context(
        viewport={'width': 390, 'height': 844},
        device_scale_factor=2, is_mobile=True, has_touch=True,
        locale='zh-CN' if lang == 'zh' else 'en-US',
    )
    page = await ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    await page.add_init_script(script)
    await page.goto(BASE + hashpath, wait_until='networkidle')
    await page.wait_for_timeout(400)
    return ctx, page, errs

async def inspect(page):
    av = page.locator('[data-testid=score-card-nl-aviera]')
    rp = page.locator('[data-testid=score-card-nl-river-park-2b]')
    async def bits(card):
        if not await card.count():
            return None
        return {
            'text': await card.inner_text(),
            'rent': await card.locator('[data-testid=tile-rent]').inner_text() if await card.locator('[data-testid=tile-rent]').count() else None,
            'rental': await card.locator('[data-testid=tile-rental]').inner_text() if await card.locator('[data-testid=tile-rental]').count() else None,
        }
    body = await page.inner_text('body')
    return {
        'aviera': await bits(av),
        'river': await bits(rp),
        'hscroll': await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2'),
        'banned': [w for w in ('第一套','1st home','first home') if w.lower() in body.lower()],
    }

async def main():
    res = {}
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            executable_path='/usr/bin/google-chrome',
            args=['--no-sandbox', '--use-gl=swiftshader', '--ignore-gpu-blocklist'],
        )
        jobs = []
        for alt in 'abc':
            for lang in ('zh', 'en'):
                jobs.append((alt, lang, 'zero', 0, 2600, f'v15{alt.upper()}-m390-{lang}-home-zero-rent.png'))
            jobs.append((alt, 'zh', 'many', 5, None, f'v15{alt.upper()}-m390-zh-home-many.png'))

        for alt, lang, kind, count, rent, name in jobs:
            ctx, page, errs = await open_page(
                browser, lang, storage(lang, rent=rent, count=count), f'#/?alt={alt}',
            )
            await page.locator('[data-testid=launch-home]').wait_for(timeout=15000)
            rec = await inspect(page)
            rec['errors'] = errs
            rec['alt'] = alt
            rec['kind'] = kind
            rec['lang'] = lang
            await page.screenshot(path=str(OUT / name))
            # also crop just the two cards for tighter review
            cards = page.locator('[data-testid^=score-card-]')
            if await cards.count() >= 2:
                box1 = await cards.nth(0).bounding_box()
                box2 = await cards.nth(1).bounding_box()
                if box1 and box2:
                    x = min(box1['x'], box2['x']) - 8
                    y = min(box1['y'], box2['y']) - 8
                    w = max(box1['x']+box1['width'], box2['x']+box2['width']) - x + 8
                    h = max(box1['y']+box1['height'], box2['y']+box2['height']) - y + 8
                    await page.screenshot(path=str(OUT / name.replace('.png', '-cards.png')), clip={
                        'x': max(0, x), 'y': max(0, y),
                        'width': min(w, 390), 'height': min(h, 700),
                    })
            res[name] = rec
            await ctx.close()
        await browser.close()
    print(json.dumps(res, indent=1, ensure_ascii=False))

asyncio.run(main())
