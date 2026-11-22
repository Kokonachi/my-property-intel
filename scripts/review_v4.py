"""Self-review v4 nits: top-pill clearance and frosted content-sized panel."""
import json, asyncio
from pathlib import Path
from playwright.async_api import async_playwright

BASE = 'http://127.0.0.1:4174/'
PFX = 'nl-v4'
OUT = Path('/workspace/my-property-intel/screenshots')
OUT.mkdir(exist_ok=True)

VIEWS = [
    ('m390-zh', {'width': 390, 'height': 844}, True, 'zh'),
    ('m390-en', {'width': 390, 'height': 844}, True, 'en'),
    ('d1440-zh', {'width': 1440, 'height': 900}, False, 'zh'),
    ('d1440-en', {'width': 1440, 'height': 900}, False, 'en'),
]

async def snap(page, name, full=False):
    path = OUT / f'{PFX}-{name}.png'
    await page.screenshot(path=str(path), full_page=full)
    return str(path)

async def measure(page):
    return await page.evaluate('''() => {
      const map = document.querySelector('.explore-map, [data-testid=explore-map]')
      const chrome = document.querySelector('[data-testid=explore-chrome]')
      const panel = document.querySelector('[data-testid=launch-panel]')
      const wr = map ? map.getBoundingClientRect() : null
      const cr = chrome ? chrome.getBoundingClientRect() : null
      const pr = panel ? panel.getBoundingClientRect() : null
      const pills = [...document.querySelectorAll('.ab-pill')].map(el => {
        const r = el.getBoundingClientRect()
        const text = (el.innerText || '').trim()
        const under = cr ? (r.bottom > cr.top && r.top < cr.bottom && r.right > cr.left && r.left < cr.right) : false
        return { text, top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), underChrome: under, gapBelowChrome: cr ? Math.round(r.top - cr.bottom) : null }
      })
      const clipped = pills.filter(p => p.underChrome || (p.gapBelowChrome != null && p.gapBelowChrome < 0))
      const cs = panel ? getComputedStyle(panel) : null
      return {
        hscroll: document.documentElement.scrollWidth > window.innerWidth + 2,
        chromeBottom: cr ? Math.round(cr.bottom) : null,
        mapH: wr ? Math.round(wr.height) : null,
        panel: pr && cs ? {
          top: Math.round(pr.top), height: Math.round(pr.height), bottom: Math.round(pr.bottom),
          bg: cs.backgroundColor, blur: cs.backdropFilter, maxH: cs.maxHeight, heightCss: cs.height,
          mapVisibleBelow: wr ? Math.round(wr.bottom - pr.bottom) : null,
        } : null,
        pillCount: pills.length,
        minPillTop: pills.length ? Math.min(...pills.map(p => p.top)) : null,
        clipped,
        northern: pills.slice().sort((a,b)=>a.top-b.top).slice(0,4),
      }
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
            errs = []
            page.on('pageerror', lambda e: errs.append(str(e)))
            await page.add_init_script(f"localStorage.setItem('mpi-lang', '{lang}')")
            rec = res[label] = {'errors': errs, 'pages': {}}

            await page.goto(BASE + '#/', wait_until='networkidle')
            await page.locator('[data-testid=score-card-nl-river-park-2b]').wait_for(timeout=15000)
            await page.wait_for_timeout(250)
            rec['pages']['home'] = {
                'hscroll': await page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 2'),
                'cards': await page.locator('[data-testid^=score-card-]').count(),
            }
            await snap(page, f'{label}-home')

            for key, url in [('river', '#/explore/nl-river-park-2b'), ('aviera', '#/explore/nl-aviera')]:
                await page.goto(BASE + url, wait_until='networkidle')
                await page.locator('[data-testid=launch-panel]').wait_for(timeout=15000)
                await page.wait_for_timeout(2000)
                rec['pages'][key] = await measure(page)
                rec['pages'][key]['panel_text'] = (await page.locator('[data-testid=launch-panel]').inner_text())[:280]
                rec['pages'][key]['active_pin'] = await page.locator('.nl-pin.active').count()
                rec['pages'][key]['stray_cluster'] = await page.locator('.marker-cluster').count()
                await snap(page, f'{label}-panel-{key}')

            rec['error_count'] = len(errs)
            await ctx.close()
        await browser.close()
    Path(OUT / f'{PFX}-review.json').write_text(json.dumps(res, ensure_ascii=False, indent=2))
    for k, v in res.items():
        print('====', k, 'err', v['error_count'])
        for pagek in ('home', 'river', 'aviera'):
            pv = v['pages'].get(pagek, {})
            if pagek == 'home':
                print(' home', pv)
                continue
            print(f' {pagek} clipped={pv.get("clipped")} minPillTop={pv.get("minPillTop")} chromeBottom={pv.get("chromeBottom")} panel={pv.get("panel")} northern={pv.get("northern")}')

asyncio.run(main())
