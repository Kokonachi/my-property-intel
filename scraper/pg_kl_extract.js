// PropertyGuru per-condo extractor · 在浏览器里逐个楼盘抓 PropertyGuru
// Paste into a page on https://www.propertyguru.com.my (same-origin fetch, no login), after setting
// window.PG_QUEUE = [{condo_id, condo_url, rent_url}, ...] (from scraper/kl_fetch_queue.json).
// Sequential, DELAY_MS between requests, first rent page only. Results accumulate in
// localStorage['pg_kl_results'] so a closed tab can resume; the returned value is the compact JSON that
// scraper/kl_expand.py reads from cache/pg_kl/<condo_id>.json:
//   {condo_id, condo_url, lat, lng, rent_count, listings:[{url,title,price,size,beds}], fetched_at, status}
async function pgKlRun(queue, {delayMs = 4000, limit = 20} = {}) {
  const store = JSON.parse(localStorage.getItem('pg_kl_results') || '{}');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const num = (s) => { const m = String(s || '').replace(/,/g, '').match(/\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; };
  const out = [];
  for (const q of queue) {
    if (store[q.condo_id]) continue;
    if (out.length >= limit) break;
    const rec = {condo_id: q.condo_id, condo_url: q.condo_url, lat: null, lng: null, rent_count: null, listings: [],
                 fetched_at: new Date().toISOString(), status: 'ok'};
    try {
      const r1 = await fetch(q.condo_url, {credentials: 'same-origin'});
      const h1 = await r1.text();
      if (!r1.ok) rec.status = 'condo_http_' + r1.status;
      const g = h1.replace(/\\"/g, '"').match(/"latitude"\s*:\s*(-?[\d.]+)\s*,\s*"longitude"\s*:\s*(-?[\d.]+)/);
      if (g) { rec.lat = parseFloat(g[1]); rec.lng = parseFloat(g[2]); }
      const rc = h1.match(/For Rent\s*\((\d+)\)/i);
      rec.rent_count = rc ? parseInt(rc[1], 10) : null;
      await sleep(delayMs);
      const r2 = await fetch(q.rent_url, {credentials: 'same-origin'});
      const h2 = await r2.text();
      if (!r2.ok) rec.status = 'rent_http_' + r2.status;
      const doc = new DOMParser().parseFromString(h2, 'text/html');
      const txt = (el, k) => { const e = el.querySelector(`[da-id="${k}"]`); return e ? e.textContent.trim() : null; };
      for (const card of doc.querySelectorAll('[da-id="parent-listing-card-v2-regular"]')) {
        const price = txt(card, 'listing-card-v2-price'), area = txt(card, 'listing-card-v2-area');
        if (!price || !area || !/\/mo/.test(price)) continue;
        const a = card.querySelector('a[href*="/property-listing/"]');
        rec.listings.push({url: a ? a.href.split('?')[0] : null, title: txt(card, 'listing-card-v2-title'),
                           price: num(price.split('/')[0]), size: num(area.split('sqft')[0]),
                           beds: num((txt(card, 'listing-card-v2-bedrooms') || '').split('+')[0])});
      }
      if (/cf-chl|challenge-platform/i.test(h1 + h2) && !rec.listings.length) rec.status = 'cloudflare';
    } catch (e) { rec.status = 'error: ' + e.message; }
    store[q.condo_id] = rec; out.push(rec);
    localStorage.setItem('pg_kl_results', JSON.stringify(store));
    if (rec.status === 'cloudflare') break;   // stop on a challenge; never try to get around it
    await sleep(delayMs);
  }
  return {done: Object.keys(store).length, batch: out};
}
