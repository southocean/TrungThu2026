(() => {
  const $ = id => document.getElementById(id);
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const embed = new URLSearchParams(location.search).has('embed');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DELAY = 20000; // autoplay: slow, the slideshow loops in the background of the event
  if (embed) document.body.classList.add('embed');
  const sticker = id => `<svg class="stk"><use href="img/stickers.svg#${id}"/></svg>`;

  const { pick } = I18N;

  // Programme slides from data.js
  function renderProgramme() {
    document.querySelectorAll('[data-agenda]').forEach(s => {
      const [a, b] = s.dataset.agenda.split('-').map(Number);
      s.querySelector('.prog').innerHTML = TT.agenda.slice(a, b).map(x => `
        <li class="rise"><time>${x.time}</time><div><h3>${esc(pick(x.title))}</h3>
        ${x.items.length ? `<ul>${x.items.map(i => `<li><span class="li-stk">${i.s.map(sticker).join('')}</span><span>${esc(pick(i.t))}</span></li>`).join('')}</ul>` : ''}</div>
        <span class="row-stk">${x.stickers.map(sticker).join('')}</span></li>`).join('');
    });
  }
  I18N.apply();
  renderProgramme();

  // Language: the flag button cycles Tiếng Việt → Svenska → English (also the L key).
  const langBtn = $('lang');
  const markLang = () => {
    const now = I18N.LANGS.find(l => l.code === I18N.lang), nxt = I18N.LANGS.find(l => l.code === I18N.next());
    langBtn.innerHTML = I18N.FLAGS[now.code];
    langBtn.title = `${now.name} → ${nxt.name} (L)`;
    langBtn.setAttribute('aria-label', `${now.name} → ${nxt.name}`);
  };
  markLang();
  langBtn.onclick = () => I18N.set(I18N.next());
  addEventListener('langchange', () => { renderProgramme(); markLang(); });

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
    const portrait = innerHeight > innerWidth; // the embed is always wide, unless it's fullscreen on an upright phone
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
  // the corner only while a YouTube song is playing). Browsers block sound until the visitor
  // clicks, taps or presses a key, so music starts with that first interaction; the note
  // button or M turns it off (and it stays off) or back on.
  const music = (() => {
    const btn = $('music');
    const api = { ready: false, on: false, toggle() {} };
    const list = (TT.music || []).filter(t => t.src || t.youtube);
    if (!list.length) return api;

    const audio = new Audio();
    let volume = 0.8;
    try { const v = parseFloat(localStorage.getItem('tt-volume')); if (v >= 0 && v <= 1) volume = v; } catch {}
    audio.volume = volume;
    audio.preload = embed ? 'metadata' : 'auto'; // the home-page embed shouldn't pull songs up front
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
              onReady: () => { box.querySelector('iframe').tabIndex = -1; yt.setVolume(volume * 100); resolve(); },
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

    audio.addEventListener('loadedmetadata', () => { skips = 0; ready(); });
    audio.addEventListener('playing', () => { skips = 0; });
    audio.addEventListener('ended', next);
    audio.addEventListener('error', () => { if (source === 'file') fallBack(api.on); });

    function set(on) {
      api.on = on;
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', on ? 'Tắt nhạc' : 'Bật nhạc');
      if (source === 'youtube' && yt) {
        if (on) { yt.playVideo(); showBox(true); } else { yt.pauseVideo(); showBox(false); }
      } else if (on) audio.play().catch(e => { if (e.name === 'NotAllowedError') set(false); }); // no gesture yet
      else audio.pause();
      label();
    }
    api.toggle = () => { if (!api.ready) return; api.userOff = api.on; set(!api.on); };
    api.start = () => { if (api.ready && !api.on && !api.userOff) set(true); };
    // Play and pause on the slideshow carry the music with them; the note button and M can
    // still change it on its own until the next play or pause.
    api.sync = on => { if (!api.ready) return; api.userOff = !on; if (api.on !== on) set(on); };
    api.volume = () => volume;
    api.setVolume = v => {
      volume = v;
      audio.volume = v;
      yt?.setVolume(v * 100);
      try { localStorage.setItem('tt-volume', String(v)); } catch {}
    };

    // First click, tap or key anywhere in the slideshow starts the music, unless the visitor
    // has switched it off. The note button and M are left to toggle it themselves.
    const kick = e => {
      if (e.target.closest?.('#music') || /^m$/i.test(e.key || '')) return;
      if (api.ready && !api.on && !api.userOff) set(true);
    };
    addEventListener('pointerdown', kick, true);
    addEventListener('keydown', kick, true);
    load(false);
    return api;
  })();

  // Autoplay runs like a video and the bar is its timeline: each slide owns an equal stretch of
  // the loop. Pausing freezes the bar (and the slide's remaining time) where it is, play carries
  // on from there, and stepping by hand jumps to the start of that slide's stretch.
  let cur = -1;
  let playing = false, timer = null, elapsed = 0, startedAt = 0;
  const pos = () => ((cur + Math.min(1, elapsed / DELAY)) / N) * 100;

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
    elapsed = 0;
    $('count').textContent = `${i + 1} / ${N}`;
    if (announce) $('live').textContent = `Slide ${i + 1} / ${N}: ${slides[i].querySelector('h1, h2').textContent}`;
    if (!embed) history.replaceState(null, '', `#${i + 1}`);
    if (playing) run();
    else { $('bar').style.transition = ''; $('bar').style.width = `${pos()}%`; }
  }
  const next = () => go(cur + 1);
  const prev = () => go(cur - 1);

  // Run the clock for whatever is left of the current slide, and let the bar crawl with it.
  function run() {
    clearTimeout(timer);
    const left = DELAY - elapsed, bar = $('bar');
    startedAt = performance.now();
    timer = setTimeout(next, left);
    bar.style.transition = 'none';
    bar.style.width = `${pos()}%`;
    if (reduced) return;
    void bar.offsetWidth; // commit the start position before animating
    bar.style.transition = `width ${left}ms linear`;
    bar.style.width = `${((cur + 1) / N) * 100}%`;
  }
  function setPlay(on) {
    if (playing && !on) {
      elapsed += performance.now() - startedAt;
      clearTimeout(timer); timer = null;
      $('bar').style.transition = 'none';
      $('bar').style.width = `${pos()}%`; // freeze right here
    }
    playing = on;
    if (on && cur >= 0) run();
    music.sync(on);
    $('play').setAttribute('aria-pressed', String(on));
    $('play').setAttribute('aria-label', on ? 'Tạm dừng' : 'Tự chạy');
    document.body.classList.toggle('playing', on);
  }
  const togglePlay = () => setPlay(!playing);

  // The home page puts this embed into fullscreen from its own buttons and tells us so.
  window.TTslides = {
    setFull(on) { fullFromParent = on; syncFs(); },
    fullscreenStart() { this.setFull(true); if (!reduced) { if (playing) music.sync(true); else setPlay(true); } },
  };

  // Fullscreen can come from this page (button, F) or from the home page putting the whole
  // embed into fullscreen; either way the button shows "exit" and leaves it.
  let fullFromParent = false;
  const fsDoc = () => (document.fullscreenElement || document.webkitFullscreenElement ? document : parent.document);
  const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement) || fullFromParent;
  function syncFs() {
    const on = isFull();
    document.body.classList.toggle('full', on);
    $('fs').setAttribute('aria-pressed', String(on));
    $('fs').setAttribute('aria-label', on ? 'Thoát toàn màn hình' : 'Toàn màn hình');
    fit();
  }
  document.addEventListener('fullscreenchange', syncFs);
  document.addEventListener('webkitfullscreenchange', syncFs);
  function toggleFs() {
    if (isFull()) { const d = fsDoc(); (d.exitFullscreen || d.webkitExitFullscreen)?.call(d); }
    else (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)?.call(document.documentElement);
  }

  $('next').onclick = next;
  $('prev').onclick = prev;
  $('play').onclick = togglePlay;
  $('fs').onclick = toggleFs;
  $('music').onclick = () => music.toggle();

  // Volume: hover the note button for a moment (or tap it on a phone) and a vertical
  // slider opens above it.
  {
    const wrap = $('music').parentElement, range = $('volume');
    range.value = Math.round(music.volume?.() * 100 || 80);
    let openT, closeT;
    const open = () => { clearTimeout(closeT); wrap.classList.add('open'); };
    const close = ms => { clearTimeout(openT); clearTimeout(closeT); closeT = setTimeout(() => { wrap.classList.remove('open'); if (document.activeElement === range) range.blur(); }, ms); };
    wrap.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { clearTimeout(closeT); openT = setTimeout(open, 400); } });
    wrap.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') close(300); });
    $('music').addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') { open(); close(4000); } });
    range.addEventListener('input', () => { music.setVolume?.(range.value / 100); if (!wrap.matches(':hover')) close(4000); });
    wrap.addEventListener('focusin', open);
    wrap.addEventListener('focusout', () => close(300));
    addEventListener('pointerdown', e => { if (!wrap.contains(e.target)) close(0); });
  }

  addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.id === 'volume' && /^(Arrow|Page|Home|End)/.test(e.key)) return; // the slider's own keys
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
    else if (k === 'l' || k === 'L') I18N.set(I18N.next());
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
      if (!document.querySelector('.controls:hover, .controls :focus-visible, .vol-wrap.open')) document.body.classList.add('idle');
    }, 2500);
  }
  ['mousemove', 'pointerdown', 'focusin'].forEach(t => addEventListener(t, wake));

  const fromHash = () => { const n = parseInt(location.hash.slice(1), 10); return Number.isFinite(n) ? n - 1 : 0; };
  addEventListener('hashchange', () => go(fromHash()));
  go(fromHash(), false);
  if (embed && !reduced) setPlay(true);
  wake();
})();
