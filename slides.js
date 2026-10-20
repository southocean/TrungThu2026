(() => {
  const $ = id => document.getElementById(id);
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const embed = new URLSearchParams(location.search).has('embed');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DELAY = 9000;
  if (embed) document.body.classList.add('embed');
  const sticker = id => `<svg class="stk"><use href="img/stickers.svg#${id}"/></svg>`;

  // Programme slides from data.js
  document.querySelectorAll('[data-agenda]').forEach(s => {
    const [a, b] = s.dataset.agenda.split('-').map(Number);
    s.querySelector('.prog').innerHTML = TT.agenda.slice(a, b).map(x => `
      <li><time>${x.time}</time><div><h3>${esc(x.title)}</h3>
      ${x.items.length ? `<ul>${x.items.map(i => `<li><span class="li-stk">${i.s.map(sticker).join('')}</span><span>${esc(i.t)}</span></li>`).join('')}</ul>` : ''}</div>
      <span class="row-stk">${x.stickers.map(sticker).join('')}</span></li>`).join('');
  });

  // Entrance animation hooks
  document.querySelectorAll('.t-body > *, .about-text > *, .acts > li, .m-text > *, .prog > li, .e-body > *').forEach(el => el.classList.add('rise'));
  document.querySelectorAll('.acts img').forEach(el => el.classList.add('zoom'));

  // Decorations are not content
  document.querySelectorAll('.hang, .moon, .float, .stk, .tile-stk, .e-rabbit').forEach(el => el.setAttribute('aria-hidden', 'true'));

  const stage = $('stage');
  const slides = [...stage.querySelectorAll('.slide')];
  const N = slides.length;
  slides.forEach((s, i) => s.setAttribute('aria-label', `${i + 1} / ${N}`));

  // Landscape 1920×1080 stage; on a portrait phone the slides re-flow onto a 1080×1920 stage.
  function fit() {
    const portrait = !embed && innerHeight > innerWidth;
    document.body.classList.toggle('portrait', portrait);
    // Portrait stretches to the phone's real height (most phones are taller than 9:16);
    // slide content stays in a centred 1080×1920 frame and backgrounds fill the rest.
    const w = portrait ? 1080 : 1920;
    const h = portrait ? Math.max(1920, Math.round(1080 * innerHeight / innerWidth)) : 1080;
    stage.style.height = portrait ? h + 'px' : '';
    stage.style.setProperty('--dy', portrait ? (h - 1920) / 2 + 'px' : '0px');
    const k = Math.min(innerWidth / w, innerHeight / h);
    stage.style.transformOrigin = '50% 50%';
    stage.style.transform = `translate(-50%, -50%) scale(${k})`;
  }
  addEventListener('resize', fit);
  fit();

  // Music: TT.music played in order, looping. Each song plays from its file in audio/; if
  // that file is missing or fails, the same song streams through YouTube's embedded player
  // instead (YouTube requires that player to stay visible, so it shows as a small card in
  // the corner only while a YouTube song is playing). Browsers only allow sound after a
  // click or key, so it starts from the button, M, or P (autoplay). Not on the home-page embed.
  const music = (() => {
    const btn = $('music');
    const api = { ready: false, on: false, toggle() {} };
    const list = (TT.music || []).filter(t => t.src || t.youtube);
    if (embed || !list.length) return api;

    const audio = new Audio();
    audio.preload = 'auto';
    let i = 0, source = 'file'; // which engine the current song is using
    let yt = null, ytReady = null, box = null;

    const ready = () => { if (!api.ready) { api.ready = true; btn.hidden = false; } };
    const label = () => { btn.title = api.on ? `♪ ${list[i].title}` : 'Nhạc (M)'; };
    const showBox = on => document.body.classList.toggle('yt-on', on);

    // YouTube is loaded only the first time a song needs it.
    function youtube() {
      if (ytReady) return ytReady;
      box = document.createElement('div');
      box.className = 'yt-box';
      box.innerHTML = '<div id="yt-player"></div>';
      document.querySelector('.viewer').append(box);
      // The player iframe grabs keyboard focus when it starts; hand it back so the arrow
      // keys, P and M keep driving the slideshow.
      addEventListener('blur', () => setTimeout(() => {
        if (document.activeElement?.closest?.('.yt-box')) { document.activeElement.blur(); window.focus(); }
      }));
      ytReady = new Promise(resolve => {
        window.onYouTubeIframeAPIReady = () => {
          yt = new YT.Player('yt-player', {
            width: '100%', height: '100%',
            playerVars: { playsinline: 1, rel: 0 },
            events: {
              onReady: () => { box.querySelector('iframe').tabIndex = -1; resolve(); },
              onStateChange: e => { if (e.data === YT.PlayerState.ENDED) next(); },
              onError: () => skip(), // video removed or embedding turned off
            },
          });
        };
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        s.onerror = () => resolve(); // offline: yt stays null and the song is skipped
        document.head.append(s);
      });
      return ytReady;
    }

    // Start song i from its file; the 'error' handler below falls through to YouTube.
    function load(play) {
      source = 'file';
      showBox(false);
      if (yt) yt.pauseVideo();
      const t = list[i];
      if (!t.src) return fallBack(play);
      audio.src = t.src;
      if (play) audio.play().catch(() => {}); // a missing file surfaces as an 'error' event
    }
    async function fallBack(play) {
      const t = list[i];
      if (!t.youtube) return skip();
      source = 'youtube';
      await youtube();
      if (!yt || list[i] !== t) return yt ? undefined : skip();
      ready();
      if (play && api.on) { yt.loadVideoById(t.youtube); showBox(true); } else yt.cueVideoById(t.youtube);
    }
    let skips = 0;
    function skip() {
      if (++skips > list.length) { btn.hidden = true; api.ready = false; set(false); return; } // nothing playable
      next();
    }
    function next() { i = (i + 1) % list.length; load(api.on); label(); }

    audio.addEventListener('canplay', () => { skips = 0; ready(); });
    audio.addEventListener('playing', () => { skips = 0; });
    audio.addEventListener('ended', next);
    audio.addEventListener('error', () => { if (source === 'file') fallBack(api.on); });

    function set(on) {
      api.on = on;
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', on ? 'Tắt nhạc' : 'Bật nhạc');
      if (source === 'youtube' && yt) {
        if (on) { yt.playVideo(); showBox(true); } else { yt.pauseVideo(); showBox(false); }
      } else if (on) audio.play().catch(() => {});
      else audio.pause();
      label();
    }
    api.toggle = () => api.ready && set(!api.on);
    load(false);
    return api;
  })();

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
    if (on && !embed && music.ready && !music.on) music.toggle(); // autoplay brings the music
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
  $('music').onclick = () => music.toggle();

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
    else if (k === 'm' || k === 'M') music.toggle();
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
