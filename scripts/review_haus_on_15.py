"""Self-review for HAUS ON 15: new user from the home URL (onboarding -> goal -> list -> launch page), zh + en at 390, 1440 maps.
Usage: python3 scripts/review_haus_on_15.py <base url> <out dir>"""
import sys, asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright

BASE = sys.argv[1]
OUT = Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
ID = 'nl-haus-on-15'
report = {}


async def newpage(b, w, h, mobile, lang):
    ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2 if mobile else 1,
                              is_mobile=mobile, has_touch=mobile, locale='zh-CN' if lang == 'zh' else 'en-US')
    page = await ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    page.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' else None)
    await page.add_init_script(f"if(!sessionStorage.getItem('seeded')){{localStorage.setItem('mpi-lang','{lang}');sessionStorage.setItem('seeded','1')}}")
    return ctx, page, errs


async def walk(b, lang, goal):
    ctx, page, errs = await newpage(b, 390, 844, True, lang)
    pre = f'390-{lang}-{goal}'
    await page.goto(BASE + '#/', wait_until='networkidle'); await page.wait_for_timeout(900)
    await page.screenshot(path=str(OUT / f'{pre}-1-home-onboarding.png'))
    btn = page.locator(f'[data-testid=goal-prompt-{goal}]')
    if await btn.count():
        await btn.click(); await page.wait_for_timeout(600)
    await page.screenshot(path=str(OUT / f'{pre}-2-home-list.png'))
    await page.screenshot(path=str(OUT / f'{pre}-2-home-list-full.png'), full_page=True)
    card = page.locator(f'[data-testid=score-card-{ID}] a').first
    await card.scroll_into_view_if_needed(); await page.wait_for_timeout(300)
    await page.screenshot(path=str(OUT / f'{pre}-3-home-haus-card.png'))
    await card.click(); await page.wait_for_timeout(1500)
    assert '#/launch/' + ID in page.url, page.url
    await page.screenshot(path=str(OUT / f'{pre}-4-launch.png'))
    await page.screenshot(path=str(OUT / f'{pre}-4-launch-full.png'), full_page=True)
    report[pre] = {'text': (await page.inner_text('body'))[:2500], 'overflowX': await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 1')}
    report[pre + '_errs'] = errs
    await ctx.close()


async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        for lang in ('zh', 'en'):
            await walk(b, lang, 'invest')
        await walk(b, 'zh', 'home')
        # other typ tab (dual-key 830, no-price 980)
        ctx, page, errs = await newpage(b, 390, 844, True, 'zh')
        await page.goto(BASE + '#/', wait_until='networkidle')
        btn = page.locator('[data-testid=goal-prompt-invest]')
        if await btn.count(): await btn.click()
        await page.goto(BASE + f'#/launch/{ID}', wait_until='networkidle'); await page.wait_for_timeout(1000)
        for tid in ('haus-b', 'haus-e'):
            await page.locator(f'[data-testid=typ-tab-{tid}]').click(); await page.wait_for_timeout(500)
            el = page.locator(f'[data-testid=typ-{tid}]'); await el.scroll_into_view_if_needed()
            await page.screenshot(path=str(OUT / f'390-zh-invest-5-typ-{tid}.png'))
        report['typ_errs'] = errs
        await ctx.close()
        for lang in ('zh', 'en'):
            ctx, page, errs = await newpage(b, 1440, 900, False, lang)
            for route, name in (('#/map', 'map'), ('#/explore', 'explore'), (f'#/launch/{ID}', 'launch')):
                await page.goto(BASE + route, wait_until='networkidle'); await page.wait_for_timeout(2500)
                await page.screenshot(path=str(OUT / f'1440-{lang}-{name}.png'))
            report[f'1440-{lang}_errs'] = errs
            await ctx.close()
        await b.close()
    (OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=1))
    print({k: v for k, v in report.items() if k.endswith('_errs')})

asyncio.run(main())
