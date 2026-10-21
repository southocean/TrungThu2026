(() => {
  const $ = id => document.getElementById(id);
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const embed = new URLSearchParams(location.search).has('embed');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DELAY = 20000; // autoplay per slide: slow, the slideshow loops in the background of the event
  // a slide can ask for longer with data-seconds (the membership slide lingers with its rabbit)
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
  const dur = i => (Number(slides[i].dataset.seconds) * 1000) || DELAY;
  const startOf = i => slides.slice(0, i).reduce((t, _, j) => t + dur(j), 0);
  const LOOP = startOf(N);
  const pos = () => ((startOf(cur) + Math.min(elapsed, dur(cur))) / LOOP) * 100;

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
    shownFor = 0;
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
    const left = dur(cur) - elapsed, bar = $('bar');
    startedAt = performance.now();
    timer = setTimeout(next, left);
    bar.style.transition = 'none';
    bar.style.width = `${pos()}%`;
    if (reduced) return;
    void bar.offsetWidth; // commit the start position before animating
    bar.style.transition = `width ${left}ms linear`;
    bar.style.width = `${(startOf(cur + 1) / LOOP) * 100}%`;
  }
  function setPlay(on) {
    if (playing && !on) {
      elapsed += performance.now() - startedAt;
      clearTimeout(timer); timer = null;
      $('bar').style.transition = 'none';
      $('bar').style.width = `${pos()}%`; // freeze right here
      void $('bar').offsetWidth; // apply it now, even if a slide change follows at once
    }
    playing = on;
    if (on && cur >= 0) run();
    music.sync(on);
    $('play').setAttribute('aria-pressed', String(on));
    $('play').setAttribute('aria-label', on ? 'Tạm dừng' : 'Tự chạy');
    document.body.classList.toggle('playing', on);
  }
  const togglePlay = () => setPlay(!playing);

  // The site's jade rabbit keeps the slideshow company along the bottom of the stage, carrying on
  // from slide to slide. It comes and goes on its own schedule (the stage plan below), not with
  // play and pause; the rabbit button turns it off. Just to watch.
  window.slideRabbit = window.mountRabbit?.(stage, {
    scale: () => (document.body.classList.contains('portrait') ? 2.4 : 2),
    manual: true,
    interactive: false,
    enter: true,
    tune: { flies: 0, binky: false },
  });

  // ── Meadow phases ──
  // The scene grows on the event's clock, so it fits the programme: milestones land while the
  // slideshow is up and people are mingling, never in the quiet stretch when the room watches
  // the stage or the projector is taken for Kahoot. On the day (24/10, Stockholm time) the
  // clock is the real time, so pauses, reloads and other screens all agree. Any other day it
  // is play time counted from 14:00 (only time spent playing counts, kept per day).
  // `stage` is how much of the time the rabbit is out: visits of `on` seconds with breaks of `off`
  // seconds. It ramps up before the quiet stretch, drops right back in it (a rare visit, with
  // butterflies and the odd bee drifting through meanwhile), and from 15:30, when the grass marks
  // the new part of the afternoon, ramps up again until it stays.
  // Specs and reasoning: docs/meadow-plan.html. Each row applies on top of the ones before it.
  const EVENT_DAY = '2026-10-24', TZ = 'Europe/Stockholm', START = 14 * 60;
  const PHASES = [
    { at: '14:00', name: 'Just the rabbit', features: {}, tune: { // full baseline, so stepping back undoes later rows
      flies: 0, flyChance: 0.06, binky: false, flowers: 2, bees: 1, carrots: 1,
      friend: false, share: false, friendEvery: [540, 720], friendStay: [60, 100] },
      stage: { on: [60, 90], off: [120, 150] } },
    { at: '14:10', name: 'A butterfly', tune: { flies: 1, binky: true }, stage: { on: [90, 120], off: [90, 120] } },
    { at: '14:15', name: 'A friend visits', tune: { friend: true } },
    { at: '14:25', name: 'More butterflies', tune: { flies: 2, flyChance: 0.12 }, stage: { on: [120, 150], off: [60, 80] } },
    // 14:30–15:30 quiet stretch: see QUIET
    { at: '15:30', name: 'Grass grows in', features: { grass: true }, stage: { on: [120, 180], off: [60, 90] } },
    { at: '15:40', name: 'Carrots grow in the ground', features: { growCarrots: true }, stage: { on: [180, 240], off: [40, 60] } },
    { at: '15:50', name: 'Friends share', tune: { share: true, friendEvery: [360, 540], friendStay: [90, 150] }, stage: { on: [240, 300], off: [30, 45] } },
    { at: '16:00', name: 'First flowers', features: { flowers: true } },
    { at: '16:10', name: 'More flowers', tune: { flowers: 4, carrots: 2 }, stage: 'always' },
    { at: '16:20', name: 'A bee', features: { bees: true } },
    { at: '16:40', name: 'Full meadow', tune: { flowers: 8, flies: 3, bees: 2, flyChance: 0.18, friendEvery: [240, 360] } },
  ];
  // No milestones here; the rabbit drops back to a rare visit and insects pass by while it's away.
  const QUIET = [{ from: '14:30', to: '15:30', why: 'speeches, games, Kahoot', stage: { on: [60, 90], off: [480, 600] } }];
  const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const fmt = min => { const m = Math.floor(((min % 1440) + 1440) % 1440); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
  PHASES.forEach(p => { p.min = toMin(p.at); });
  QUIET.forEach(q => { q.fromMin = toMin(q.from); q.toMin = toMin(q.to); });
  const agendaMins = TT.agenda.map(a => ({ min: toMin(a.time), title: a.title.vi }));

  const stockholm = new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  function wallClock() {
    const p = Object.fromEntries(stockholm.formatToParts(new Date()).map(x => [x.type, x.value]));
    return { day: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute) + Number(p.second) / 60 };
  }

  const clockKey = `tt-playtime-${wallClock().day}`;
  let playMs = 0;
  try { playMs = Number(localStorage.getItem(clockKey)) || 0; } catch {}

  // Admin can run a simulated clock (any time, any speed). It lives in sessionStorage so the
  // home page's dev panel and this slideshow share it, and a reload keeps it.
  const isAdmin = () => { try { return sessionStorage.getItem('tt_admin') === '1'; } catch { return false; } };
  let sim = null; // { min, speed }
  try { sim = JSON.parse(sessionStorage.getItem('tt-sim')) || null; } catch {}
  const clockParam = new URLSearchParams(location.search).get('clock'); // QA: slides.html?clock=15:40
  if (clockParam && /^\d{1,2}:\d{2}$/.test(clockParam)) sim = { min: toMin(clockParam), speed: 1 };
  const saveSim = () => { try { sim ? sessionStorage.setItem('tt-sim', JSON.stringify(sim)) : sessionStorage.removeItem('tt-sim'); } catch {} };

  function clock() {
    if (sim) return { min: sim.min, source: 'sim', speed: sim.speed };
    const w = wallClock();
    if (w.day === EVENT_DAY) return { min: w.min, source: 'live', speed: 1 };
    return { min: START + playMs / 60000, source: 'play', speed: 1 };
  }

  let phaseKey = '';
  const phaseAt = min => PHASES.reduce((k, p, i) => (min >= p.min ? i : k), 0);
  const quietAt = min => QUIET.find(q => min >= q.fromMin && min < q.toMin) || null;
  function applyPhase() {
    const min = clock().min, idx = phaseAt(min), quiet = quietAt(min), key = `${idx}${quiet ? 'q' : ''}`;
    if (key === phaseKey || !window.slideRabbit) return;
    phaseKey = key;
    const features = { grass: false, flowers: false, growCarrots: false, bees: false }, tune = {};
    for (const p of PHASES.slice(0, idx + 1)) { Object.assign(features, p.features); Object.assign(tune, p.tune); }
    tune.ambient = !!quiet;
    slideRabbit.configure({ features, tune });
  }
  let lastTick = performance.now(), saveIn = 0;
  setInterval(() => {
    const now = performance.now(), dt = now - lastTick;
    if (playing) {
      playMs += dt;
      if ((saveIn -= 1) <= 0) { saveIn = 5; try { localStorage.setItem(clockKey, String(Math.round(playMs))); } catch {} }
    }
    if (sim) { sim.min += (dt / 60000) * sim.speed; saveSim(); }
    lastTick = now;
    applyPhase();
    stageTick(dt);
    if (!hud.hidden) showHud();
  }, 1000);

  // What the dev tools read and drive (the home page's admin panel, and T [ ] here).
  const meadow = {
    phases: PHASES.map(({ at, min, name, stage }) => ({ at, min, name,
      stage: !stage ? null : stage === 'always' ? 'always out' : `out ${stage.on.join('–')} s, away ${stage.off.join('–')} s` })),
    quiet: QUIET.map(q => ({ ...q, stage: `out ${q.stage.on.join('–')} s, away ${q.stage.off.join('–')} s, passers-by` })),
    fmt,
    state() {
      const c = clock(), idx = phaseAt(c.min), q = quietAt(c.min);
      const item = agendaMins.reduce((k, a) => (c.min >= a.min ? a : k), null);
      return { ...c, time: fmt(c.min), idx, phase: PHASES[idx].name, next: PHASES[idx + 1] || null, quiet: q || null, programme: item?.title || 'Before the start' };
    },
    setClock(min) { sim = { min, speed: sim?.speed || 1 }; saveSim(); applyPhase(); },
    step(dir) { // to the next or previous milestone
      const min = clock().min, idx = phaseAt(min);
      const to = dir > 0 ? PHASES[idx + 1] : (min - PHASES[idx].min > 0.5 ? PHASES[idx] : PHASES[idx - 1]);
      if (to) this.setClock(to.min);
    },
    setSpeed(speed) { sim = { min: clock().min, speed }; saveSim(); },
    live() { sim = null; saveSim(); applyPhase(); },
    force: what => window.slideRabbit?.force(what),
    rabbit() {
      const plan = planNow();
      return { on: rabbitOn, seen: seen.size, of: N, out, nextIn: turnAt ? Math.max(0, (turnAt - performance.now()) / 1000) : null,
        plan: plan === 'always' ? 'always out' : `out ${plan.on[0]}–${plan.on[1]} s, away ${plan.off[0]}–${plan.off[1]} s` };
    },
    rabbitNow() { if (turnAt) turnAt = 1; stageTick(0); }, // end the current visit or break now
    guard(pass) { seen = new Set(pass ? slides.map((_, i) => i) : []); saveSeen(); stageTick(0); },
  };

  // ── The rabbit on stage ──
  // Guard: it doesn't come out until every slide has been on screen for 5 s in one go, so the
  // first loop (autoplay or someone presenting) is clean, and flicking through doesn't count.
  // Kept per day, so a reload on the day doesn't make the room sit through another loop.
  // Then it follows the stage plan: visits and breaks, longer visits as the afternoon goes on,
  // rare in the quiet stretch, always out from 16:10. The rabbit button (or R) turns it off.
  const GUARD_MS = 5000;
  const seenKey = `tt-seen-${wallClock().day}`;
  let seen = new Set();
  try { seen = new Set(JSON.parse(localStorage.getItem(seenKey)) || []); } catch {}
  const saveSeen = () => { try { localStorage.setItem(seenKey, JSON.stringify([...seen])); } catch {} };
  let shownFor = 0; // how long the current slide has been on screen in one go
  let rabbitOn = true;
  try { rabbitOn = localStorage.getItem('tt-rabbit') !== 'off'; } catch {}
  let out = false, turnAt = 0, lastPlan = null; // turnAt: when the current visit or break ends (0: not timed yet)
  const secs = ([a, b]) => (a + Math.random() * (b - a)) * 1000;
  function planNow() {
    const c = clock();
    const q = quietAt(c.min);
    if (q) return q.stage;
    return PHASES.slice(0, phaseAt(c.min) + 1).reduce((st, p) => p.stage || st, null);
  }
  function stageTick(dt) {
    if (cur >= 0 && document.visibilityState === 'visible') {
      shownFor += dt;
      if (shownFor >= GUARD_MS && !seen.has(cur)) { seen.add(cur); saveSeen(); }
    } else shownFor = 0;
    const now = performance.now(), plan = planNow();
    if (plan !== lastPlan) { // the plan changed (a milestone, the quiet stretch): a long break or visit is cut to fit it
      if (turnAt && plan !== 'always') turnAt = Math.min(turnAt, now + secs(out ? plan.on : plan.off));
      lastPlan = plan;
    }
    let want;
    if (!rabbitOn || seen.size < N) { want = false; turnAt = 0; }
    else if (plan === 'always') { want = true; turnAt = 0; }
    else if (!turnAt) { want = true; turnAt = now + secs(plan.on); } // first time out, or coming off 'always'
    else if (now >= turnAt) { want = !out; turnAt = now + secs(want ? plan.on : plan.off); }
    else want = out;
    if (want !== out) { out = want; window.slideRabbit?.show(want); }
  }
  function setRabbit(on) {
    rabbitOn = on;
    try { localStorage.setItem('tt-rabbit', on ? 'on' : 'off'); } catch {}
    $('rabbit').setAttribute('aria-pressed', String(on));
    $('rabbit').setAttribute('aria-label', on ? 'Tắt thỏ' : 'Bật thỏ');
    $('rabbit').title = on ? 'Thỏ: bật (R)' : 'Thỏ: tắt (R)';
    stageTick(0);
  }
  $('rabbit').onclick = () => setRabbit(!rabbitOn);
  setRabbit(rabbitOn);

  // Admin only: T shows the event clock and phase, [ and ] step between milestones.
  const hud = document.createElement('p');
  hud.className = 'meadow-hud'; hud.hidden = true;
  document.body.append(hud);
  function showHud() {
    const s = meadow.state(), src = { live: 'live', play: 'play time', sim: `simulated ×${s.speed}` }[s.source];
    const rb = meadow.rabbit();
    const rab = !rb.on ? 'rabbit off' : rb.seen < rb.of ? `rabbit waits: ${rb.seen}/${rb.of} slides seen` :
      `rabbit ${rb.out ? 'out' : 'away'}` + (rb.nextIn != null ? ` ${Math.round(rb.nextIn)} s more` : '');
    hud.textContent = `${s.time} (${src}) · ${s.phase}` + (s.next ? ` · next ${s.next.at}: ${s.next.name}` : '') + (s.quiet ? ' · quiet' : '') + ` · ${rab}`;
  }
  applyPhase();

  // The home page puts this embed into fullscreen from its own buttons and tells us so.
  window.TTslides = {
    meadow,
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

  // The Konami code unlocks admin here too (same lock as the home page).
  const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  let ki = 0;
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (k === KONAMI[ki]) { if (++ki === KONAMI.length) { ki = 0; try { sessionStorage.setItem('tt_admin', '1'); } catch {} hud.hidden = false; showHud(); } }
    else ki = k === KONAMI[0] ? 1 : 0;
  }, true);

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
    else if (k === 'r' || k === 'R') setRabbit(!rabbitOn);
    else if (k === 'l' || k === 'L') I18N.set(I18N.next());
    else if ((k === 't' || k === 'T') && isAdmin()) { hud.hidden = !hud.hidden; showHud(); }
    else if (k === ']' && isAdmin()) { meadow.step(1); hud.hidden = false; showHud(); }
    else if (k === '[' && isAdmin()) { meadow.step(-1); hud.hidden = false; showHud(); }
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
