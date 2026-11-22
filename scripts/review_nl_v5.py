"""v5 self-review: compact ranked home + single editable loan % at 390/1440, zh/en."""
import sys, json, asyncio, re
from pathlib import Path
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4174/'
PFX = sys.argv[2] if len(sys.argv) > 2 else 'nl-v5'
OUT = Path('/workspace/my-property-intel/screenshots')
OUT.mkdir(exist_ok=True)

VIEWS = [
    ('m390-zh', {'width': 390, 'height': 844}, True, 'zh'),
    ('m390-en', {'width': 390, 'height': 844}, True, 'en'),
    ('d1440-zh', {'width': 1440, 'height': 900}, False, 'zh'),
    ('d1440-en', {'width': 1440, 'height': 900}, False, 'en'),
]

BANNED = ('第1', '第3', '第一套', '第二套', '第三套', '1st–2nd', '1st-2nd', '3rd+', '1st or 2nd')

async def snap(page, name, full=False):
    path = OUT / f'{PFX}-{name}.png'
    await page.screenshot(path=str(path), full_page=full)
    return str(path)

async def set_ltv(page, target):
    cur = int(await page.locator('[data-testid=loan-pct-input]').first.input_value())
    if cur == target:
        return cur
    # type the value
    inp = page.locator('[data-testid=loan-pct-input]').first
    await inp.click()
    await inp.fill(str(target))
    await inp.press('Enter')
    await page.wait_for_timeout(200)
    # if still not, bump
    cur = int(await inp.input_value())
    while cur > target:
        await page.locator('[data-testid=loan-pct-dec]').first.click()
        await page.wait_for_timeout(80)
        cur = int(await inp.input_value())
        if cur <= target:
            break
    while cur < target:
        await page.locator('[data-testid=loan-pct-inc]').first.click()
        await page.wait_for_timeout(80)
        cur = int(await inp.input_value())
        if cur >= target:
            break
    await page.wait_for_timeout(200)
    return int(await inp.input_value())

async def banned_in(text):
    return [w for w in BANNED if w in (text or '')]

async def pill_clip(page):
    return await page.evaluate('''() => {
      const chrome = document.querySelector('[data-testid=explore-chrome]')
      if (!chrome) return { chrome: false }
      const cr = chrome.getBoundingClientRect()
      const pills = [...document.querySelectorAll('.ab-pill, .nl-pin')].map(el => {
        const r = el.getBoundingClientRect()
        const vis = r.width && r.bottom > 0 && r.top < innerHeight
        return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left),
                 clipped: vis && r.top < cr.bottom - 2 && r.bottom > cr.top }
      })
      return { chromeBottom: Math.round(cr.bottom), clipped: pills.filter(p => p.clipped), count: pills.length }
    }''')

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
            await page.add_init_script(f"""
              localStorage.setItem('mpi-lang', '{lang}');
              localStorage.removeItem('mpi-loan');
            """)
            rec = res[label] = {'errors': errs, 'console': cons, 'pages': {}}

            await page.goto(BASE + '#/', wait_until='networkidle')
            await page.locator('[data-testid=score-card-nl-river-park-2b]').wait_for(timeout=15000)
            await page.wait_for_timeout(400)
            home90 = {
                'html_lang': await page.evaluate('document.documentElement.lang'),
                'hscroll': await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2'),
                'cards': await page.locator('[data-testid^=score-card-]').count(),
                'first_id': await page.locator('[data-testid^=score-card-]').first.get_attribute('data-testid'),
                'loan_pct': await page.locator('[data-testid=loan-pct-input]').first.input_value(),
                'loan_control': await page.locator('header [data-testid=loan-pct]').count(),
                'river': await page.locator('[data-testid=score-card-nl-river-park-2b]').inner_text(),
                'aviera': await page.locator('[data-testid=score-card-nl-aviera]').inner_text(),
                'scores': await page.locator('[data-testid=score-mark]').all_inner_texts(),
                'verdicts': await page.locator('[data-testid=loan-verdict]').count(),
                'body_banned': await banned_in(await page.inner_text('body')),
            }
            rec['pages']['home90'] = home90
            await snap(page, f'{label}-home-90')
            if mobile:
                await snap(page, f'{label}-home-90-full', full=True)

            got = await set_ltv(page, 70)
            home70 = {
                'set_ltv': got,
                'loan_pct': await page.locator('[data-testid=loan-pct-input]').first.input_value(),
                'first_id': await page.locator('[data-testid^=score-card-]').first.get_attribute('data-testid'),
                'river': await page.locator('[data-testid=score-card-nl-river-park-2b]').inner_text(),
                'aviera': await page.locator('[data-testid=score-card-nl-aviera]').inner_text(),
                'scores': await page.locator('[data-testid=score-mark]').all_inner_texts(),
                'body_banned': await banned_in(await page.inner_text('body')),
                'changed_from_90': (await page.locator('[data-testid=score-card-nl-river-park-2b]').inner_text()) != home90['river'],
            }
            rec['pages']['home70'] = home70
            await snap(page, f'{label}-home-70')

            await set_ltv(page, 90)
            await page.goto(BASE + '#/explore/nl-river-park-2b', wait_until='networkidle')
            await page.locator('[data-testid=launch-panel]').wait_for(timeout=15000)
            await page.wait_for_timeout(1800)
            rec['pages']['panel_river_90'] = {
                'panel': await page.locator('[data-testid=launch-panel]').count(),
                'loan_in_panel': await page.locator('[data-testid=launch-panel] [data-testid=loan-pct]').count(),
                'text': (await page.locator('[data-testid=launch-panel]').inner_text())[:900],
                'verdict': await page.locator('[data-testid=launch-panel] [data-testid=loan-verdict]').inner_text(),
                'banned': await banned_in(await page.locator('[data-testid=launch-panel]').inner_text()),
                'hscroll': await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2'),
                'stray_cluster': await page.locator('.marker-cluster').count(),
                'pill_clip': await pill_clip(page),
                'panel_bg': await page.evaluate('''() => {
                  const el = document.querySelector('[data-testid=launch-panel]')
                  const s = getComputedStyle(el)
                  return { bg: s.backgroundColor, filter: s.backdropFilter || s.webkitBackdropFilter, h: Math.round(el.getBoundingClientRect().height) }
                }'''),
            }
            await snap(page, f'{label}-panel-river-90')

            got = await set_ltv(page, 70)
            rec['pages']['panel_river_70'] = {
                'set_ltv': got,
                'verdict': await page.locator('[data-testid=launch-panel] [data-testid=loan-verdict]').inner_text(),
                'text_head': (await page.locator('[data-testid=launch-panel]').inner_text())[:400],
                'changed': (await page.locator('[data-testid=launch-panel] [data-testid=loan-verdict]').inner_text()) != rec['pages']['panel_river_90']['verdict'],
            }
            await snap(page, f'{label}-panel-river-70')

            await set_ltv(page, 90)
            await page.goto(BASE + '#/explore/nl-aviera', wait_until='networkidle')
            await page.locator('[data-testid=launch-panel]').wait_for(timeout=15000)
            await page.wait_for_timeout(1600)
            rec['pages']['panel_aviera_90'] = {
                'verdict': await page.locator('[data-testid=launch-panel] [data-testid=loan-verdict]').inner_text(),
                'text': (await page.locator('[data-testid=launch-panel]').inner_text())[:500],
                'banned': await banned_in(await page.locator('[data-testid=launch-panel]').inner_text()),
                'pill_clip': await pill_clip(page),
            }
            await snap(page, f'{label}-panel-aviera-90')
            await set_ltv(page, 70)
            rec['pages']['panel_aviera_70'] = {
                'verdict': await page.locator('[data-testid=launch-panel] [data-testid=loan-verdict]').inner_text(),
            }
            await snap(page, f'{label}-panel-aviera-70')

            await page.goto(BASE + '#/launch/nl-river-park-2b', wait_until='networkidle')
            await page.wait_for_timeout(800)
            rec['pages']['detail'] = {
                'assumptions': await page.locator('[data-testid=loan-assumptions]').count(),
                'loan_pct': await page.locator('[data-testid=loan-assumptions] [data-testid=loan-pct-input]').count(),
                'score': await page.locator('[data-testid=launch-score]').inner_text(),
                'banned': await banned_in(await page.inner_text('body')),
                'hscroll': await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2'),
            }
            await snap(page, f'{label}-detail-river')

            rec['errors'] = errs[:8]
            rec['console'] = cons[:8]
            await ctx.close()
        await browser.close()
    print(json.dumps(res, indent=1, ensure_ascii=False))

asyncio.run(main())
