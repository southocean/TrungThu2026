(() => {
  const $ = id => document.getElementById(id);
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const embed = new URLSearchParams(location.search).has('embed');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DELAY = 9000;
  if (embed) document.body.classList.add('embed');

  // Programme slides from data.js
  document.querySelectorAll('[data-agenda]').forEach(s => {
    const [a, b] = s.dataset.agenda.split('-').map(Number);
    s.querySelector('.prog').innerHTML = TT.agenda.slice(a, b).map(x => `
      <li><time>${x.time}</time><div><h3>${esc(x.title)}</h3>
      ${x.items.length ? `<ul>${x.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}</div></li>`).join('');
  });

  // Entrance animation hooks
  document.querySelectorAll('.t-body > *, .about-text > *, .acts > li, .m-text > *, .prog > li, .e-body > *').forEach(el => el.classList.add('rise'));
  document.querySelectorAll('.acts img').forEach(el => el.classList.add('zoom'));

  // Decorations are not content
  document.querySelectorAll('.hang, .moon').forEach(el => el.setAttribute('aria-hidden', 'true'));

  const stage = $('stage');
  const slides = [...stage.querySelectorAll('.slide')];
  const N = slides.length;
  slides.forEach((s, i) => s.setAttribute('aria-label', `${i + 1} / ${N}`));

  function fit() {
    const k = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transformOrigin = '50% 50%';
    stage.style.transform = `translate(-50%, -50%) scale(${k})`;
  }
  addEventListener('resize', fit);
  fit();

  let cur = -1;
  function go(i, announce = true) {
    i = (i + N) % N;
    if (i === cur) return;
    slides.forEach((s, j) => {
      const on = j === i;
      s.classList.toggle('on', on);
      s.inert = !on;
      s.setAttribute('aria-hidden', String(!on));
    });
    cur = i;
    $('count').textContent = `${i + 1} / ${N}`;
    $('bar').style.width = `${((i + 1) / N) * 100}%`;
    if (announce) $('live').textContent = `Slide ${i + 1} / ${N}: ${slides[i].querySelector('h1, h2').textContent}`;
    if (!embed) history.replaceState(null, '', `#${i + 1}`);
    if (timer) restart();
  }
  const next = () => go(cur + 1);
  const prev = () => go(cur - 1);

  // Autoplay (loops; good for leaving on the projector)
  let timer = null;
  function restart() { clearInterval(timer); timer = setInterval(next, DELAY); }
  function setPlay(on) {
    clearInterval(timer); timer = null;
    if (on) restart();
    $('play').setAttribute('aria-pressed', String(on));
    $('play').setAttribute('aria-label', on ? 'Tạm dừng' : 'Tự chạy');
    document.body.classList.toggle('playing', on);
  }
  const togglePlay = () => setPlay(!timer);

  function toggleFs() {
    if (document.fullscreenElement) document.exitFullscreen();
    else (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)?.call(document.documentElement);
  }

  $('next').onclick = next;
  $('prev').onclick = prev;
  $('play').onclick = togglePlay;
  $('fs').onclick = toggleFs;

  addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key;
    if (['ArrowRight', 'ArrowDown', 'PageDown', 'Enter', ' '].includes(k)) {
      if ((k === 'Enter' || k === ' ') && e.target.closest('button, a')) return;
      e.preventDefault(); next();
    } else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'Home') go(0);
    else if (k === 'End') go(N - 1);
    else if (k === 'f' || k === 'F') toggleFs();
    else if (k === 'p' || k === 'P') togglePlay();
    else if (/^[1-9]$/.test(k)) go(Number(k) - 1);
    else return;
    wake();
  });

  // Click: right two-thirds forward, left third back (like a clicker)
  stage.addEventListener('click', e => {
    if (e.target.closest('a, button')) return;
    (e.clientX < innerWidth / 3 ? prev : next)();
  });

  // Swipe
  let sx = null, sy = null;
  stage.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? next : prev)();
    sx = null;
  });

  // Hide controls and cursor when idle
  let idle;
  function wake() {
    document.body.classList.remove('idle');
    clearTimeout(idle);
    idle = setTimeout(() => {
      if (!document.querySelector('.controls:hover, .controls :focus-visible')) document.body.classList.add('idle');
    }, 2500);
  }
  ['mousemove', 'pointerdown', 'focusin'].forEach(t => addEventListener(t, wake));

  const fromHash = () => { const n = parseInt(location.hash.slice(1), 10); return Number.isFinite(n) ? n - 1 : 0; };
  addEventListener('hashchange', () => go(fromHash()));
  go(fromHash(), false);
  if (embed && !reduced) setPlay(true);
  wake();
})();
