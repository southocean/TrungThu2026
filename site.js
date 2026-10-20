(() => {
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const sticker = (id, cls = '') => `<svg class="stk ${cls}" aria-hidden="true"><use href="img/stickers.svg#${id}"/></svg>`;

  const { t, pick } = I18N;

  // Language flags in the header
  const langs = document.querySelector('.langs');
  langs.innerHTML = I18N.LANGS.map(l => `<button type="button" data-lang="${l.code}" title="${l.name}" aria-label="${l.name}" lang="${l.code}">${I18N.FLAGS[l.code]}</button>`).join('');
  const markLang = () => langs.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === I18N.lang)));
  langs.addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (b) I18N.set(b.dataset.lang); });

  // The embedded slideshow follows the page's language.
  const frame = document.querySelector('.embed iframe');
  frame.src = `slides.html?embed&lang=${I18N.lang}`;

  const renderAgenda = () => document.getElementById('agenda').innerHTML = TT.agenda.map(a => `
    <li>
      <time>${a.time}</time>
      <div class="card">
        <span class="card-stk" aria-hidden="true">${a.stickers.map(id => sticker(id)).join('')}</span>
        <h3>${esc(pick(a.title))}</h3>
        ${a.items.length ? `<ul>${a.items.map(i => `<li><span class="li-stk">${i.s.map(id => sticker(id)).join('')}</span><span>${esc(pick(i.t))}</span></li>`).join('')}</ul>` : ''}
      </div>
    </li>`).join('');

  I18N.apply();
  markLang();
  renderAgenda();
  addEventListener('langchange', () => {
    markLang();
    renderAgenda();
    frame.contentWindow?.I18N?.set(I18N.lang);
  });

  // String of đèn ông sao across the page
  const bunting = document.querySelector('.bunting');
  if (bunting) bunting.innerHTML = '<svg class="b-line" viewBox="0 0 1000 60" preserveAspectRatio="none"><path d="M0 4Q500 70 1000 4" fill="none" stroke="#ffd77a" stroke-opacity=".5" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>' +
    Array.from({ length: 9 }, (_, i) => {
      const x = (i + 1) / 10, sag = 4 + 66 * 4 * x * (1 - x) * 0.5; // follow the quadratic curve
      return `<span style="left:${x * 100}%;top:${sag}px;--dur:${3.6 + (i % 3) * .7}s;--d:${-i * .4}s"><svg><use href="img/stickers.svg#${i % 4 === 2 ? 'carp' : 'starlantern'}"/></svg></span>`;
    }).join('');

  // The moon is very far away: it stays put on screen and only drifts up a touch as the page
  // scrolls, fading back a little once the hero is passed so it doesn't fight the text.
  // The stars are further still: three layers, each drifting a different, smaller amount.
  const moon = document.querySelector('.hero-moon');
  const field = document.querySelector('.starfield');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STAR_LAYERS = [ // drift per scrolled px, stars per 10 000 px² of screen, size range, twinkling stars
    { k: 0.012, density: 1.1, r: [0.4, 0.9], twinkle: 0 },
    { k: 0.025, density: 0.45, r: [0.7, 1.3], twinkle: 4 },
    { k: 0.04, density: 0.14, r: [1, 1.8], twinkle: 6 },
  ];
  let layers = [];
  function buildStars() {
    const W = innerWidth, H = innerHeight, docH = document.documentElement.scrollHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    field.innerHTML = '';
    layers = STAR_LAYERS.map(L => {
      // tall enough that drifting up never shows an empty strip at the bottom
      const h = Math.ceil(H + Math.max(0, docH - H) * L.k) + 140; // + room for a phone toolbar collapsing
      const div = document.createElement('div');
      const c = document.createElement('canvas');
      c.width = W * dpr; c.height = h * dpr; c.style.height = h + 'px';
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      const n = Math.round(W * h / 10000 * L.density);
      for (let i = 0; i < n; i++) {
        const x = Math.random() * W, y = Math.random() * h, r = L.r[0] + Math.random() * (L.r[1] - L.r[0]);
        g.globalAlpha = 0.35 + Math.random() * 0.6;
        g.fillStyle = Math.random() < 0.15 ? '#ffe9b0' : '#fff'; // a few warm stars
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      }
      div.append(c);
      for (let i = 0; i < Math.round(L.twinkle * W / 1200 + 2); i++) {
        const s = document.createElement('i');
        s.style.cssText = `left:${(Math.random() * 100).toFixed(2)}%;top:${(Math.random() * h).toFixed(0)}px;--t:${(2 + Math.random() * 3).toFixed(1)}s;--d:${(-Math.random() * 5).toFixed(1)}s`;
        div.append(s);
      }
      field.append(div);
      return { div, k: L.k };
    });
    drift();
  }
  let queued = false;
  function drift() {
    queued = false;
    const y = still ? 0 : scrollY;
    if (moon) {
      moon.style.transform = `translate3d(0, ${(-y * 0.05).toFixed(1)}px, 0)`;
      moon.style.opacity = (1 - Math.min(1, y / innerHeight) * 0.5).toFixed(3);
    }
    for (const l of layers) l.div.style.transform = `translate3d(0, ${(-y * l.k).toFixed(1)}px, 0)`;
  }
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(drift); } }, { passive: true });
  let rebuild;
  const soon = () => { clearTimeout(rebuild); rebuild = setTimeout(buildStars, 300); };
  addEventListener('resize', () => { if (Math.abs(innerWidth * dpr0 - lastW) > 1) { lastW = innerWidth * dpr0; soon(); } });
  const dpr0 = devicePixelRatio || 1;
  let lastW = innerWidth * dpr0, lastDocH = 0;
  new ResizeObserver(() => { // page grows as images load
    const h = document.documentElement.scrollHeight;
    if (Math.abs(h - lastDocH) > 200) { lastDocH = h; soon(); }
  }).observe(document.body);
  buildStars();

  // Swish payment link with number and amount filled in.
  const q = new URLSearchParams({ sw: TT.swish, amt: '100.00', msg: 'Hoi vien 2026' });
  document.getElementById('swish-open').href = 'https://app.swish.nu/1/p/sw/?' + q.toString().replace(/\+/g, '%20');

  const status = document.getElementById('copy-status');
  document.querySelectorAll('.copy').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); status.textContent = t('copied'); }
    catch { status.textContent = t('swish-no') + TT.swishPretty; }
    setTimeout(() => (status.textContent = ''), 3000);
  }));
})();
