"""Lean visual self-review for critique fixes. 1440 + 390, zh + en."""
import json, re, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:4173'
OUT = Path('/workspace/my-property-intel/screenshots')
OUT.mkdir(exist_ok=True)
PREFIX = 'critique-fix'
CART = re.compile(r'cartocdn|API KEY REQUIRED|carto\.com/basemaps', re.I)

log = []
def note(msg):
    print(msg, flush=True)
    log.append(msg)

def shot(page, name):
    p = OUT / f'{PREFIX}-{name}.png'
    page.screenshot(path=str(p), full_page=False)
    note(f'SHOT {p}')
    return p

def new_ctx(pw, w, h, lang, mobile=False):
    ctx = pw.chromium.launch(headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
    # oops that's a browser not context. We'll manage browser outside.
    raise RuntimeError('use browser')

def attach(page, bag):
    def on_console(m):
        loc = {}
        try:
            loc = m.location
        except Exception:
            pass
        bag['console'].append({'type': m.type, 'text': m.text, 'loc': loc})
    page.on('console', on_console)
    page.on('request', lambda r: bag['reqs'].append(r.url))
    page.on('pageerror', lambda e: bag['errors'].append(str(e)))

def goto_lang(page, path, lang):
    page.add_init_script(f"localStorage.setItem('mpi-lang', '{lang}')")
    page.goto(BASE + path, wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(1800)

def text_has_carto(page):
    body = page.inner_text('body')
    hits = CART.findall(body) + CART.findall(page.content())
    return hits

def main():
    findings = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])

        # ---- Desktop 1440 zh home ----
        bag = {'console': [], 'reqs': [], 'errors': []}
        ctx = browser.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1, locale='zh-CN')
        page = ctx.new_page(); attach(page, bag)
        goto_lang(page, '/#/', 'zh')
        shot(page, 'd1440-zh-home')
        carto_req = [u for u in bag['reqs'] if CART.search(u)]
        note(f'Carto requests (d1440 zh home): {len(carto_req)} {carto_req[:3]}')
        if carto_req: findings.append('BLOCKER carto request on desktop home')
        hits = text_has_carto(page)
        if hits: findings.append(f'CART text desktop home: {hits}')
        # first cards
        cards = page.locator('[data-testid="property-list"] a, [data-testid="property-list"] [data-card]')
        note(f'desktop cards visible count ~ {cards.count()}')
        # layers label
        layers = page.locator('[data-testid="layers-btn"]')
        note(f'layers btn zh: {layers.inner_text()!r}')
        if '图层：毛回报' not in layers.inner_text().replace(' ', ''):
            # button text is '图层：' + '毛回报' maybe with newline
            txt = layers.inner_text().replace('\n', '')
            note(f'layers compact {txt!r}')
            if '图层' not in txt or '毛回报' not in txt:
                findings.append(f'layers label unexpected: {txt!r}')
        count = page.locator('h2').first.inner_text()
        note(f'count label zh: {count!r}')
        # null warnings
        nulls = [c for c in bag['console'] if 'Expected value to be of type number' in c['text'] or 'found null' in c['text']]
        note(f'console null-number warnings home: {len(nulls)}')
        for c in nulls[:8]:
            note(f'  WARN {c["type"]}: {c["text"][:240]}')
        other = [c for c in bag['console'] if c['type'] in ('error', 'warning') and c not in nulls]
        for c in other[:8]:
            note(f'  {c["type"]}: {c["text"][:240]}')
        ctx.close()

        # ---- Desktop 1440 en home ----
        bag = {'console': [], 'reqs': [], 'errors': []}
        ctx = browser.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1, locale='en-US')
        page = ctx.new_page(); attach(page, bag)
        goto_lang(page, '/#/', 'en')
        shot(page, 'd1440-en-home')
        layers = page.locator('[data-testid="layers-btn"]').inner_text().replace('\n', '')
        note(f'layers btn en: {layers!r}')
        if 'Layers' not in layers or 'Gross' not in layers:
            findings.append(f'EN layers unexpected: {layers!r}')
        count = page.locator('h2').first.inner_text()
        note(f'count label en: {count!r}')
        # open a no-photo card area - scroll first card? D'Seven may not be in first fold
        carto_req = [u for u in bag['reqs'] if CART.search(u)]
        if carto_req: findings.append(f'carto on en home {carto_req[:2]}')
        ctx.close()

        # ---- Desktop D'Seven (no photo) + Laurel (photo) + calculator ----
        bag = {'console': [], 'reqs': [], 'errors': []}
        ctx = browser.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1, locale='zh-CN')
        page = ctx.new_page(); attach(page, bag)
        goto_lang(page, '/#/property/real-d-seven-lagoon-perdana', 'zh')
        # wait hero
        page.wait_for_timeout(800)
        shot(page, 'd1440-zh-dseven')
        if page.locator('[data-testid="photo-fallback"]').count() == 0:
            findings.append('DSeven should use typographic fallback')
        if page.locator('[data-testid="photo"]').count():
            findings.append('DSeven unexpectedly has a photo')
        scrape = page.locator('[data-testid="scrape-date"]').inner_text()
        note(f'scrape-date zh: {scrape!r}')
        if 'Apify' in scrape or '地理编码' in scrape or '抓取' in scrape:
            findings.append(f'scrape process leaked: {scrape}')
        if '数据更新于 2026-11-15' not in scrape:
            findings.append(f'scrape date missing: {scrape}')
        srcs = page.locator('[data-testid="sources"]').inner_text()
        note(f'sources zh:\n{srcs[:500]}')
        if 'Apify' in srcs or '地理编码' in srcs:
            findings.append('sources still mention scrape process')
        samples = page.get_by_text('出租', exact=False).first
        # sample stat
        body = page.inner_text('body')
        if '样本数' in body:
            findings.append('old 样本数 label still present')
        if 'via Apify' in body:
            findings.append('via Apify still on DSeven page')
        carto_req = [u for u in bag['reqs'] if CART.search(u)]
        if carto_req: findings.append(f'carto on DSeven {carto_req}')
        if CART.search(body): findings.append('API KEY text on DSeven')
        # sticky name is md:hidden so not on 1440
        # walk to calculator on Laurel
        page.goto(BASE + '/#/property/real-laurel-residence', wait_until='domcontentloaded')
        page.wait_for_timeout(1500)
        shot(page, 'd1440-zh-laurel-hero')
        if page.locator('[data-testid="photo"]').count() == 0:
            findings.append('Laurel should have a photo')
        page.locator('[data-testid="calculator"]').scroll_into_view_if_needed()
        page.wait_for_timeout(200)
        shot(page, 'd1440-zh-calculator')
        if page.locator('[data-testid="upfront"]').count() != 1 or page.locator('[data-testid="cash-on-cash"]').count() != 1:
            findings.append('calculator cells missing')
        # price field should have thousands sep
        price_val = page.locator('[data-testid="calculator"] input').first.input_value()
        note(f'price input display: {price_val!r}')
        ctx.close()

        # ---- Mobile 390 zh home ----
        bag = {'console': [], 'reqs': [], 'errors': []}
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='zh-CN')
        page = ctx.new_page(); attach(page, bag)
        goto_lang(page, '/#/', 'zh')
        page.wait_for_timeout(800)
        shot(page, 'm390-zh-home')
        header = page.locator('a:has-text("租金回报地图")')
        note(f'mobile product name visible: {header.count()}')
        if header.count() == 0:
            findings.append('mobile top bar missing 租金回报地图')
        layers = page.locator('[data-testid="layers-btn"]').inner_text().replace('\n', '')
        note(f'mobile layers zh: {layers!r}')
        hint = page.locator('[data-testid="sheet-handle"]').inner_text()
        note(f'sheet hint peek: {hint!r}')
        if '上拉查看列表' not in hint:
            findings.append(f'peek hint unexpected: {hint}')
        carto_req = [u for u in bag['reqs'] if CART.search(u)]
        if carto_req: findings.append(f'carto on mobile home {carto_req}')
        if CART.search(page.content()): findings.append('API KEY on mobile home html')

        # expand list
        page.locator('[data-testid="sheet-handle"]').click()
        page.wait_for_timeout(600)
        hint2 = page.locator('[data-testid="sheet-handle"]').inner_text()
        note(f'sheet hint after click: {hint2!r}')
        if '下拉回地图' not in hint2:
            findings.append(f'expanded hint unexpected: {hint2}')
        shot(page, 'm390-zh-list-half')
        # click again to full if needed
        snap = page.locator('[data-testid="sheet"]').get_attribute('data-snap')
        note(f'sheet snap after 1 click: {snap}')
        if snap != 'full':
            page.locator('[data-testid="sheet-handle"]').click()
            page.wait_for_timeout(500)
            snap = page.locator('[data-testid="sheet"]').get_attribute('data-snap')
            note(f'sheet snap after 2 clicks: {snap}')
        shot(page, 'm390-zh-list-full')
        # filters in list?
        filt_in_sheet = page.locator('[data-testid="sheet"] [data-testid="filters-btn"]').count()
        note(f'filters in expanded sheet: {filt_in_sheet}')
        if filt_in_sheet == 0:
            findings.append('filters not reachable at list top when expanded')
        # compact cards height: first yield card
        first = page.locator('[data-testid="sheet"] [data-testid="property-list"] a').first
        box = first.bounding_box()
        note(f'first compact card box: {box}')
        nog = page.locator('[data-testid="sheet"] [data-testid="no-rent-group"]')
        if nog.count():
            nog.first.scroll_into_view_if_needed()
            page.wait_for_timeout(200)
            shot(page, 'm390-zh-norent')
            txt = nog.first.inner_text()
            if '暂无在租样本，无法计算回报' not in txt:
                findings.append('no-rent compact line missing in group')
        else:
            findings.append('no-rent group missing in mobile sheet')
        ctx.close()

        # ---- Mobile 390 en home ----
        bag = {'console': [], 'reqs': [], 'errors': []}
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='en-US')
        page = ctx.new_page(); attach(page, bag)
        goto_lang(page, '/#/', 'en')
        shot(page, 'm390-en-home')
        if page.locator('a:has-text("Yield map")').count() == 0:
            findings.append('mobile EN top bar missing Yield map')
        layers = page.locator('[data-testid="layers-btn"]').inner_text().replace('\n', '')
        note(f'mobile layers en: {layers!r}')
        page.locator('[data-testid="sheet-handle"]').click()
        page.wait_for_timeout(500)
        hint = page.locator('[data-testid="sheet-handle"]').inner_text()
        note(f'EN expanded hint: {hint!r}')
        if 'Pull down for map' not in hint:
            findings.append(f'EN expanded hint: {hint}')
        shot(page, 'm390-en-list-half')
        carto_req = [u for u in bag['reqs'] if CART.search(u)]
        if carto_req: findings.append(f'carto on mobile en {carto_req}')
        ctx.close()

        # ---- Mobile D'Seven + warning + sticky name ----
        bag = {'console': [], 'reqs': [], 'errors': []}
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='zh-CN')
        page = ctx.new_page(); attach(page, bag)
        goto_lang(page, '/#/property/real-d-seven-lagoon-perdana', 'zh')
        page.wait_for_timeout(800)
        shot(page, 'm390-zh-dseven-fold')
        sticky = page.locator('[data-testid="sticky-name"]')
        note(f'sticky name at top: {sticky.inner_text()!r} visible={sticky.is_visible()}')
        warn = page.locator('[data-testid="low-sample-warning"]')
        note(f'low-sample warning count={warn.count()} visible={warn.count() and warn.is_visible()}')
        if warn.count() == 0:
            findings.append('low-sample warning missing on DSeven (confidence may not be low)')
        else:
            # is it in first screen?
            wb = warn.bounding_box()
            note(f'warning box {wb}')
            if wb and wb['y'] > 844:
                findings.append('warning below first mobile screen')
        if page.locator('[data-testid="photo-fallback"]').count() == 0:
            findings.append('mobile DSeven missing typographic hero')
        if CART.search(page.content()): findings.append('API KEY on mobile DSeven')
        carto_req = [u for u in bag['reqs'] if CART.search(u)]
        if carto_req: findings.append(f'carto on mobile DSeven {carto_req}')
        # scroll to hide h1, sticky should remain
        page.evaluate('window.scrollTo(0, 600)')
        page.wait_for_timeout(200)
        shot(page, 'm390-zh-dseven-scrolled')
        note(f'sticky after scroll still visible: {sticky.is_visible()} text={sticky.inner_text()!r}')

        # samples / scatter
        page.locator('[data-testid="rent-samples"]').scroll_into_view_if_needed()
        page.wait_for_timeout(400)
        shot(page, 'm390-zh-dseven-scatter')

        # The Park Residences 1: confidence low — warning must sit on first screen
        page.goto(BASE + '/#/property/real-the-park-residences-1', wait_until='domcontentloaded')
        page.wait_for_timeout(1000)
        shot(page, 'm390-zh-park-fold')
        warn = page.locator('[data-testid="low-sample-warning"]')
        conf = page.locator('[data-testid="confidence"]').inner_text()
        note(f'Park confidence={conf!r} warn={warn.count()}')
        if warn.count() == 0:
            findings.append('low-sample warning missing on The Park Residences 1')
        else:
            wb = warn.bounding_box()
            cb = page.locator('[data-testid="confidence"]').bounding_box()
            note(f'Park warning box {wb} confidence box {cb}')
            if wb and wb['y'] > 700:
                findings.append('Park warning below first mobile screen')

        # photo project
        page.goto(BASE + '/#/property/real-pantai-panorama', wait_until='domcontentloaded')
        page.wait_for_timeout(1200)
        shot(page, 'm390-zh-pantai')
        if page.locator('[data-testid="photo"]').count() == 0:
            findings.append('Pantai should have photo')
        if CART.search(page.content()): findings.append('API KEY on pantai')

        # Indera no rent detail
        page.goto(BASE + '/#/property/real-indera-subang', wait_until='domcontentloaded')
        page.wait_for_timeout(800)
        shot(page, 'm390-zh-indera')
        body = page.inner_text('body')
        if 'via Apify' in body or '地理编码' in body:
            findings.append('process text on Indera')
        ctx.close()

        # ---- Mobile EN DSeven for copy ----
        ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='en-US')
        page = ctx.new_page()
        goto_lang(page, '/#/property/real-d-seven-lagoon-perdana', 'en')
        shot(page, 'm390-en-dseven-fold')
        scrape = page.locator('[data-testid="scrape-date"]').inner_text()
        note(f'scrape-date en: {scrape!r}')
        srcs = page.locator('[data-testid="sources"]').inner_text()
        note(f'sources en:\n{srcs[:400]}')
        if 'Apify' in srcs:
            findings.append('EN sources mention Apify')
        ctx.close()

        browser.close()

    note('==== FINDINGS ====')
    if not findings:
        note('NONE')
    else:
        for f in findings:
            note('! ' + f)
    Path('/tmp/critique-review-log.txt').write_text('\n'.join(log))
    return 1 if findings else 0

if __name__ == '__main__':
    sys.exit(main())
