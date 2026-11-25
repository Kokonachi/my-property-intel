// Mudah rent search runner · 在浏览器里逐个楼盘搜 Mudah 租房广告
// Run on a https://www.mudah.my page. mudahKlRun(terms) fetches
// /kuala-lumpur/apartment-condominium-for-rent?q=<term> one at a time (DELAY_MS apart) and keeps the
// schema.org ItemList items in localStorage['mudah_kl'] = {term: {items:[{title,price,size,rooms}], at, status}}.
// Matching listings to projects (title must name the project) is done later in Python (scrape.title_matches).
async function mudahKlRun(terms, delayMs = 6000) {
  const store = JSON.parse(localStorage.getItem('mudah_kl') || '{}');
  const num = (s) => { const m = String(s || '').replace(/,/g, '').match(/\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; };
  for (const t of terms) {
    if (store[t]) continue;
    const rec = {items: [], at: new Date().toISOString(), status: 'ok'};
    try {
      const r = await fetch('/kuala-lumpur/apartment-condominium-for-rent?q=' + encodeURIComponent(t));
      const h = await r.text();
      if (!r.ok) rec.status = 'http_' + r.status;
      if (/cf-chl|challenge-platform|captcha/i.test(h) && !/ItemList/.test(h)) rec.status = 'challenge';
      const doc = new DOMParser().parseFromString(h, 'text/html');
      for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
        let d; try { d = JSON.parse(s.textContent); } catch (e) { continue; }
        for (const b of (Array.isArray(d) ? d : [d])) {
          if (b['@type'] !== 'ItemList') continue;
          for (const el of b.itemListElement || []) {
            const it = el.item || {}, pl = it.itemOffered || {};
            const pr = Object.fromEntries((pl.additionalProperty || []).map((p) => [p.name, p.value]));
            rec.items.push({title: pl.name || '', price: num(it.price), size: num(pr['Floor Size']), rooms: num(pr['Number of Rooms']),
                            url: it.url || pl.url || null});
          }
        }
      }
    } catch (e) { rec.status = 'error: ' + e.message; }
    store[t] = rec; localStorage.setItem('mudah_kl', JSON.stringify(store));
    window.__mudahProgress = Object.keys(store).length;
    if (rec.status === 'challenge') { window.__mudahStopped = 'challenge'; return; }  // never try to get past a challenge
    await new Promise((res) => setTimeout(res, delayMs));
  }
  window.__mudahDone = true;
}
