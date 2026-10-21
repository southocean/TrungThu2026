// Admin only: "How it works", a private look under the hood. Four tabs: the ecosystem (every element,
// its states, how they meet, and what each is doing right now), the timeline (the afternoon drawn from
// the slideshow's own tables), the design, and the repo (read live from GitHub, like the Callback CV's
// dev portal: numbers measured, never typed in).
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const frame = document.querySelector('.embed iframe');
  const meadow = () => frame.contentWindow?.TTslides?.meadow;
  const world = () => frame.contentWindow?.slideRabbit;
  const btn = $('nav-how'), dlg = $('how');
  const REPO = 'southocean/TrungThu2026';

  // ── tabs ──────────────────────────────────────────────
  const TABS = [['eco', 'The ecosystem'], ['time', 'The timeline'], ['design', 'The creatures'], ['repo', 'The repo']];
  let tab = 'eco', tick = null;
  dlg.innerHTML = `
    <div class="how-head">
      <div><p class="how-kicker">Admin · how it all works</p><h2 id="how-title">Log</h2></div>
      <button type="button" class="how-x" id="how-close" aria-label="Close"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>
    </div>
    <div class="how-tabs" role="tablist" aria-label="How it works">
      ${TABS.map(([k, l]) => `<button type="button" role="tab" id="how-t-${k}" aria-controls="how-p-${k}" aria-selected="false" tabindex="-1" data-tab="${k}">${l}</button>`).join('')}
    </div>
    ${TABS.map(([k]) => `<section class="how-panel" role="tabpanel" id="how-p-${k}" aria-labelledby="how-t-${k}" tabindex="0" hidden></section>`).join('')}`;
  // tidy up right away on every way out (button, click outside, Esc), with the close event as a backstop
  const closed = () => { clearInterval(tick); document.documentElement.classList.remove('how-open'); window.TTembedSeen?.(); };
  const closeLog = () => { dlg.close(); closed(); };
  $('how-close').onclick = closeLog;
  dlg.addEventListener('click', e => { if (e.target === dlg) closeLog(); });
  dlg.addEventListener('cancel', closed);
  dlg.addEventListener('close', closed);
  const tabsEl = dlg.querySelector('.how-tabs');
  tabsEl.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) show(b.dataset.tab); });
  tabsEl.addEventListener('keydown', e => {
    const i = TABS.findIndex(t => t[0] === tab), d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (d) { e.preventDefault(); show(TABS[(i + d + TABS.length) % TABS.length][0], true); }
  });
  const built = {};
  function show(k, focus) {
    tab = k;
    for (const [t] of TABS) {
      const on = t === k, b = $(`how-t-${t}`);
      b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1;
      $(`how-p-${t}`).hidden = !on;
      if (on && focus) b.focus();
    }
    if (!built[k]) { built[k] = true; ({ eco: buildEco, time: buildTime, design: buildDesign, repo: buildRepo })[k](); }
    clearInterval(tick);
    if (k === 'eco') { liveEco(); tick = setInterval(liveEco, 1000); }
    if (k === 'time') { liveTime(); tick = setInterval(liveTime, 1000); }
  }
  btn.onclick = () => {
    frame.loading = 'eager';
    dlg.showModal(); document.documentElement.classList.add('how-open'); window.TTembedSeen?.();
    show(tab);
  };
  window.TThow = { show(on) { btn.hidden = !on; if (!on && dlg.open) closeLog(); } };

  // ── The ecosystem ─────────────────────────────────────
  const chain = (...steps) => `<span class="how-chain">${steps.map(s => `<i>${esc(s)}</i>`).join('<b aria-hidden="true">→</b>')}</span>`;
  const ELEMENTS = [
    { id: 'jade', dot: '#fdfbff', name: 'Jade rabbit', what: 'The star. Comes and goes on the stage plan once every slide has been seen for 5 s; stays from 16:10.',
      states: [
        ['Resting', 'grooms its face · cleans one ear (sometimes then the other) · sniffs · stands up to look around · turns its head to the room (1 in 8 times it waves) · turns round · loafs'],
        ['Moving', 'hops (never more than 6 in a row) · strolls across the floor · binky (a happy twisting jump) · a startled leap away from a bee'],
        ['Doing', `chases a butterfly · ${chain('dig', 'pull', 'eat')} a carrot · nibbles a mushroom · plays catch with a falling leaf · smells a flower · ${chain('sleep', 'stretch')} · sploots flat on its tummy`],
        ['Weather', chain('hunker in the rain', 'shake the water off', 'often a binky')],
        ['On stage', `${chain('hop in from a side', 'live', 'finish what it’s doing', 'hop off the nearer side')}`],
      ] },
    { id: 'friend', dot: '#f3eadf', name: 'Friend rabbit', what: 'Cream with brown ears and a back patch, a little smaller. Same brain as the jade rabbit, plus visiting.',
      states: [
        ['Visitor (14:15–16:59)', `${chain('arrives with the jade rabbit out', 'walks up', 'nose-touch greeting', 'stays near and plays', 'goes home')}. From 16:50 it visits more and stays longer.`],
        ['Resident (17:00 on)', 'moves in for good and goes its own way: naps, digs, chases, cleans its ears, looks at the room. Meets up to play every 35–60 s at most.'],
      ] },
    { id: 'fly', dot: '#ff9a3c', name: 'Butterflies', what: 'Six colours, round wings, seen from above or side-on (switching now and then).',
      states: [['Life', `${chain('fly in from a side', 'seek a bloom', 'perch and sip', 'wander', 'next bloom', 'leave')} · with no flowers they flit round the rabbit · gone in the rain`]] },
    { id: 'bee', dot: '#ffcc33', name: 'Bees', what: 'Only come when flowers bloom (from 16:20).',
      states: [['Life', `${chain('dart in', 'buzz round a flower', 'park briefly to drink', 'buzz', 'next flower', 'leave')}`]] },
    { id: 'flower', dot: '#ffc2d4', name: 'Flowers', what: 'Daisy, pink daisy, star, tulip, bellflower. Sprout in grown grass.',
      states: [['Life', `${chain('sprout', 'bud', 'bloom 45–75 s', 'wilt', 'gone')} · growing is faster on wet ground`]] },
    { id: 'carrot', dot: '#ff8a2a', name: 'Carrots', what: 'Before 15:40 the rabbit digs one up on the spot; after, they grow in the ground.',
      states: [['In the ground', `${chain('sprout', 'ripen 38 s', 'a rabbit spots it', 'dig', 'pull', 'eat or share')} · faster on wet ground`]] },
    { id: 'grass', dot: '#4f9a5c', name: 'Grass', what: 'Clumps across the whole floor, each needing a grass level to show; each blade a little more.',
      states: [['Level', `${chain('bare', 'a few clumps (15:30)', 'patchy', 'thick', 'full meadow (after the heavy rain)')}`]] },
    { id: 'shroom', dot: '#c99256', name: 'Mushrooms', what: 'Brown, tan and golden caps in the grass, in season. After more flowers, right after a rain (event 16:30, visitors 3:10).',
      states: [['Life', `${chain('come up (about 20 s)', 'ready', 'a rabbit nibbles it down', 'gone')} · faster on wet ground`]] },
    { id: 'leaf', dot: '#e8722a', name: 'Autumn leaves', what: 'Maple-ish leaves in orange, red, gold and brown drift down now and then (event 16:15, visitors 0:40).',
      states: [['Life', `${chain('drift down, swaying and turning', 'lie on the ground', 'fade')} · or land on a rabbit's head or back and ride there until it shakes or hops`]] },
    { id: 'rain', dot: '#bcd4ff', name: 'Rain', what: 'Five showers on the clock. Each grows the grass a step and leaves the ground wet for a few minutes.',
      states: [['Levels', 'drizzle 0.25 · rain 0.55 · heavy 1.0 (grey wash low down) · faint at the top so slides stay readable']] },
    { id: 'firefly', dot: '#e8ff96', name: 'Fireflies', what: 'From 17:00, up to 8.',
      states: [['Life', `${chain('drift in', 'glow 1–2 s', 'dark 1.5–4 s', 'glow')} · they wait out the rain`]] },
  ];
  const MEETINGS = [
    ['Jade rabbit', 'Friend', 'Greet nose to nose, follow-the-leader, groom each other, sploot side by side; one bites the far end of the other’s carrot, a short tug, it snaps, a half each.'],
    ['Rabbits', 'Butterflies', 'Eyes follow them; chin up when one is right overhead; chases with chin and eyes on it, binkies when it dips low.'],
    ['Rabbits', 'Bees', 'Not trusted. Ears back and eyes on it, hops away; one at its face (or waking it) gets a startled high leap and a dash.'],
    ['Rabbits', 'Carrots', 'Dig up on the spot (early) or go for a ripe one they can see (within 260 units).'],
    ['Rabbits', 'Flowers', 'Now and then hop over and smell one.'],
    ['Rabbits', 'Mushrooms', 'A ready one in sight: hop over and nibble it, bite by bite, until it’s gone.'],
    ['Rabbits', 'Leaves', 'The catch game: see one coming, hop under it, stand up with eyes on it, jump to bat it. Sometimes it lands on the head (caught) or on the back; it rides there until a shake of the head or the next hop.'],
    ['Rabbits', 'Rain', 'Hunker until it’s over, then shake off with water flying, often a binky.'],
    ['Butterflies, bees', 'Flowers', 'Perch on or park at the middle of the top of a bloom; perched ones sit behind the rabbits like the flower.'],
    ['Rain', 'Insects', 'Everyone leaves; nothing flies until it stops.'],
    ['Rain', 'Plants', 'Grass steps up; for a few minutes flowers sprout and grow faster and carrots ripen faster.'],
    ['Grass', 'Flowers, carrots', 'They come up where grass has grown.'],
  ];
  const PRIORITY = [
    'Time to go (the stage plan says away): hop off.',
    'Rain just stopped: shake off. Raining: hunker.',
    'Friend things: greet, close a big gap, play.',
    'Food: a dropped carrot nearby, dig one up, a ripe one in sight, a mushroom in sight.',
    'A leaf drifting down nearby: go and play catch.',
    'Carry on to where it was going.',
    'Chase a butterfly, nap, sploot, binky, smell a flower.',
    'Otherwise: a short hop, a stroll or a rest (with its fidgets).',
  ];
  function buildEco() {
    $('how-p-eco').innerHTML = `
      <p class="how-lede">The bottom of the slideshow is a small world on the event clock. <code>rabbit.js</code> draws and runs every element; <code>slides.js</code> decides what’s switched on and when.</p>
      <h3>Right now</h3>
      <div class="how-live" id="how-live"><p class="how-dim">Waiting for the slideshow…</p></div>
      <h3>The elements</h3>
      <div class="how-cards">${ELEMENTS.map(e => `
        <article class="how-card">
          <h4><span class="how-dot" style="background:${e.dot}"></span>${esc(e.name)}</h4>
          <p>${esc(e.what)}</p>
          <dl>${e.states.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>
        </article>`).join('')}</div>
      <h3>How they meet</h3>
      <div class="how-table"><table><thead><tr><th>Between</th><th>What happens</th></tr></thead><tbody>
        ${MEETINGS.map(([a, b, t]) => `<tr><td><b>${esc(a)}</b> × ${esc(b)}</td><td>${esc(t)}</td></tr>`).join('')}
      </tbody></table></div>
      <h3>How a rabbit decides</h3>
      <p>When whatever it’s doing ends, it picks the next thing, first match wins. A bee close by interrupts anything except eating, digging and greeting.</p>
      <ol class="how-ol">${PRIORITY.map(p => `<li>${esc(p)}</li>`).join('')}</ol>`;
  }
  const flowerStage = f => {
    const bloomAge = f.age - f.growDur;
    return f.age < f.growDur ? (f.age / f.growDur > 0.6 ? 'bud' : 'sprout') : bloomAge > f.bloomDur ? 'wilting' : 'bloom';
  };
  const count = (list, fn) => list.reduce((m, x) => { const k = fn(x); m[k] = (m[k] || 0) + 1; return m; }, {});
  const fmtCount = m => Object.entries(m).map(([k, n]) => `${n} ${k}`).join(', ') || 'none';
  const rabbitState = (b, present) => {
    if (!b || !present) return 'away';
    const r = b.r, act = r.mode === 'rest' && r.act ? ` · ${{ earGroom: 'cleaning an ear', audience: r.waving ? 'facing the room, waving' : 'facing the room', groom: 'grooming', sniff: 'sniffing', rear: 'standing up', loaf: 'loafing', turn: 'turning' }[r.act] || r.act}` : '';
    return `${r.mode}${act}`;
  };
  function liveEco() {
    const m = meadow(), w = world(), el = $('how-live');
    if (!m || !w) return;
    const s = m.state(), rb = m.rabbit();
    const bugs = w.bugs, flies = bugs.filter(b => b.type === 'fly'), bees = bugs.filter(b => b.type === 'bee');
    const chips = [
      ['Clock', `${s.time} · ${{ live: 'live, Stockholm', visit: 'visitor, watched', sim: `simulated ${s.speed}×, ${s.timeline}` }[s.source]}`],
      ['Phase', s.phase + (s.quiet ? ' · quiet stretch' : '')],
      ['Jade rabbit', !rb.on ? 'switched off' : rb.waiting ? `waiting, ${rb.seen}/${rb.of} slides seen` : rabbitState(w.main, w.present)],
      ['Friend', w.friend ? `${rabbitState(w.friend, true)} · ${w.tune.resident ? 'resident' : 'visiting'}` : w.tune.friend ? 'not here' : 'not yet'],
      ['Butterflies', flies.length ? fmtCount(count(flies, b => (b.state === 'sip' ? 'perched' : b.state === 'leave' ? 'leaving' : 'flying'))) : 'none'],
      ['Bees', bees.length ? fmtCount(count(bees, b => (b.parked ? 'parked' : b.state === 'leave' ? 'leaving' : 'buzzing'))) : w.features.bees ? 'none right now' : 'not yet'],
      ['Flowers', w.features.flowers ? fmtCount(count(w.flowers, flowerStage)) : 'not yet'],
      ['Carrots', w.features.growCarrots ? fmtCount(count(w.planted, c => (c.ripe >= 1 ? 'ripe' : 'growing'))) : 'dug on the spot'],
      ['Grass', `${Math.round(w.grass * 100)}%`],
      ['Rain', w.rain > 0.02 ? `${Math.round(w.rain * 100)}% · ${s.rain || ''}` : 'dry'],
      ['Ground', w.wet > 0.02 ? `wet ${Math.round(w.wet * 100)}%, lush` : 'dry'],
      ['Mushrooms', w.features.mushrooms ? fmtCount(count(w.shrooms, x => (x.eaten > 0 ? 'being eaten' : x.grow >= 1 ? 'ready' : 'coming up'))) : 'not yet'],
      ['Leaves', w.features.leaves || w.leaves.length ? fmtCount(count(w.leaves, l => ({ fall: 'falling', ground: 'on the ground', on: 'on a rabbit' }[l.state]))) : 'not yet'],
      ['Fireflies', w.features.fireflies ? `${w.fireflies.length} (${w.fireflies.filter(f => f.on > 0.3).length} glowing)` : 'not yet'],
    ];
    el.innerHTML = chips.map(([k, v]) => `<div title="${esc(k)}: ${esc(v)}"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join(''); // one line each; the full text is in the tooltip
  }

  // ── The timeline ──────────────────────────────────────
  const T0 = 13 * 60 + 50, T1 = 17 * 60 + 30, VW = 1000, PADL = 92, PADR = 14;
  const X = min => PADL + ((min - T0) / (T1 - T0)) * (VW - PADL - PADR);
  const hhmm = min => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(Math.round(min % 60)).padStart(2, '0')}`;
  function buildTime() {
    const mm = meadow(), m = mm?.event;
    if (!m) { $('how-p-time').innerHTML = '<p class="how-dim">Waiting for the slideshow…</p>'; built.time = false; return; }
    const H = 340, rows = { prog: [18, 52], out: [78, 150], grass: [166, 218], rain: [232, 250], ms: [266, 330] };
    let svg = '';
    // hour grid
    for (let t = 14 * 60; t <= T1; t += 30) svg += `<line x1="${X(t)}" x2="${X(t)}" y1="10" y2="${H - 6}" class="tl-grid${t % 60 ? ' half' : ''}"/><text x="${X(t)}" y="${H}" class="tl-hour">${hhmm(t)}</text>`;
    // quiet stretch
    for (const q of m.quiet) svg += `<rect x="${X(q.fromMin)}" y="10" width="${X(q.toMin) - X(q.fromMin)}" height="${H - 16}" class="tl-quiet"/><text x="${(X(q.fromMin) + X(q.toMin)) / 2}" y="${rows.out[0] - 6}" class="tl-qlabel">quiet stretch</text>`;
    // programme blocks
    const ag = TT.agenda.map(a => { const [h, mm] = a.time.split(':').map(Number); return { min: h * 60 + mm, title: a.title.en }; });
    ag.forEach((a, i) => {
      const end = i + 1 < ag.length ? ag[i + 1].min : T1;
      const bw = X(end) - X(a.min) - 2, bh = rows.prog[1] - rows.prog[0];
      // the label is clipped to its block, so short items (Kahoot, the feast) don't run into the next one
      svg += `<g><rect x="${X(a.min) + 1}" y="${rows.prog[0]}" width="${bw}" height="${bh}" rx="6" class="tl-prog"><title>${hhmm(a.min)} ${esc(a.title)}</title></rect><svg x="${X(a.min) + 1}" y="${rows.prog[0]}" width="${bw - 4}" height="${bh}"><text x="5" y="21" class="tl-progt">${esc(a.title)}</text></svg></g>`;
    });
    // rabbit out share, grass level: sampled per minute
    let outPath = `M${X(T0)},${rows.out[1]}`, grassPath = `M${X(T0)},${rows.grass[1]}`;
    for (let t = T0; t <= T1; t += 1) {
      const a = m.at(t);
      outPath += ` L${X(t).toFixed(1)},${(rows.out[1] - a.out * (rows.out[1] - rows.out[0])).toFixed(1)}`;
      grassPath += ` L${X(t).toFixed(1)},${(rows.grass[1] - a.grass * (rows.grass[1] - rows.grass[0])).toFixed(1)}`;
    }
    svg += `<path d="${outPath} L${X(T1)},${rows.out[1]} Z" class="tl-out"/><path d="${grassPath} L${X(T1)},${rows.grass[1]} Z" class="tl-grass"/>`;
    // rains
    for (const r of m.rains) svg += `<rect x="${X(r.min)}" y="${rows.rain[0]}" width="${Math.max(3, X(r.min + r.secs / 60) - X(r.min))}" height="${(rows.rain[1] - rows.rain[0]) * (0.4 + 0.6 * r.level)}" class="tl-rain"><title>${esc(r.at)} ${esc(r.name)}</title></rect>`;
    // milestones: numbered markers (two lanes), with the names in the key under the chart
    m.phases.forEach((p, i) => {
      const x = X(p.min), y = rows.ms[0] + 22 + (i % 2) * 26;
      svg += `<g class="tl-ms"><title>${esc(p.at)} ${esc(p.name)}</title><line x1="${x}" x2="${x}" y1="${rows.ms[0] - 4}" y2="${y - 9}" class="tl-mtick"/><circle cx="${x}" cy="${y}" r="9" class="tl-mdot"/><text x="${x}" y="${y + 3.5}" class="tl-mnum">${i + 1}</text></g>`;
    });
    // row labels
    const lab = [['Programme', rows.prog], ['Rabbit out', rows.out], ['Grass', rows.grass], ['Rain', rows.rain], ['Milestones', rows.ms]];
    svg += lab.map(([t, [a, b]]) => `<text x="8" y="${t === 'Milestones' ? a + 4 : (a + b) / 2 + 4}" class="tl-row">${t}</text>`).join('');
    svg += `<g id="tl-now"><line y1="10" y2="${H - 14}" class="tl-now"/><text y="12" class="tl-nowt"></text></g>`;

    const featureText = p => [...Object.entries(p.features).filter(([, v]) => v).map(([k]) => k), ...Object.entries(p.tune).map(([k, v]) => `${k} ${Array.isArray(v) ? v.join('–') : v}`), ...(p.grass != null ? [`grass level ${p.grass}`] : [])].join(' · ');
    $('how-p-time').innerHTML = `
      <p class="how-lede">Two timelines: the event afternoon (from 13:00 on the day) and a seven-minute one for web visitors. Both are drawn from the slideshow’s own tables in <code>slides.js</code>, so they can’t drift from what runs. The red line is the event clock now.</p>
      <div class="how-chart"><svg viewBox="0 0 ${VW} ${H + 6}" role="img" aria-label="The afternoon from 13:50 to 17:30: programme, quiet stretch 14:30 to 15:30, how much of the time the rabbit is out, grass level, rains and milestones">${svg}</svg></div>
      <ol class="how-key">${m.phases.map(p => `<li><b>${esc(p.at)}</b> ${esc(p.name)}</li>`).join('')}</ol>
      <h3>The clock</h3>
      <h3>The event afternoon</h3>
      <p>On Saturday 24 October from 13:00 it’s the real time in Stockholm, so a pause, a reload or a second screen never puts the meadow out of step. Admin can run a simulated clock at 1×, 10× or 60× from the panel beside the slideshow; it lives only in that browser tab.</p>
      <h3>For web visitors: seven minutes, busy from the start</h3>
      <p>Before 13:00 on the day, and any other day, visitors get their own timeline on their own watching time: it only moves while at least 40% of the slideshow is on screen (scrolled past, the growth waits), and a reload carries on. Something new every ten seconds or so at first, while the meadow is empty; longer gaps once it keeps itself busy. The rabbit is out the whole time, grass grows three times as fast, and the friend comes round often.</p>
      <div class="how-table"><table><thead><tr><th>Watched</th><th>Milestone</th><th>Grass</th></tr></thead><tbody>
        ${[...mm.visitor.phases.map(p => ({ t: p.t, name: p.name })), ...mm.visitor.rains.map(r => ({ t: r.t, name: `☂ ${r.name} (${r.secs} s)` }))].sort((a, b) => a.t - b.t).map(x => `<tr><td class="num">${Math.floor(x.t / 60)}:${String(x.t % 60).padStart(2, '0')}</td><td>${esc(x.name)}</td><td>${Math.round(mm.visitor.grassAt(x.t) * 100)}%</td></tr>`).join('')}
      </tbody></table></div>
      <h3>Before anything: the guard</h3>
      <p>On the day, from 13:00 (an hour before the start, by the real Stockholm clock), the rabbit stays hidden until every slide has been on screen for 5 s in one go (remembered for the day), so the room sees the slides clean first. Before that, and after the day, there is no guard: anyone opening the site gets the rabbit straight away. Then the stage plan below takes over. The rabbit button in the slideshow (or <kbd>R</kbd>) turns it all off.</p>
      <h3>Every milestone</h3>
      <div class="how-table"><table><thead><tr><th>At</th><th>Milestone</th><th>Switches on / sets</th><th>Rabbit out / away</th></tr></thead><tbody>
        ${m.phaseDetail.map((p, i) => `<tr><td class="num">${esc(p.at)}</td><td>${esc(p.name)}</td><td><code>${esc(featureText(p))}</code></td><td>${esc(m.phases[i].stage || '')}</td></tr>`).join('')}
        ${m.quiet.map(q => `<tr class="how-q"><td class="num">${esc(q.from)}–${esc(q.to)}</td><td>Quiet stretch</td><td>${esc(q.why)}; no milestones, passers-by while away</td><td>${esc(q.stage)}</td></tr>`).join('')}
        ${m.rains.map(r => `<tr class="how-r"><td class="num">${esc(r.at)}</td><td>☂ ${esc(r.name)}</td><td>${Math.round(r.secs)} s, level ${r.level}${r.grass ? `, grass +${Math.round(r.grass * 100)}%` : ''}</td><td></td></tr>`).join('')}
      </tbody></table></div>`;
  }
  function liveTime() {
    if (!built.time || !$('tl-now')) { if (!$('tl-now')) buildTime(); return; }
    const m = meadow(); if (!m) return;
    const s = m.state(), x = X(Math.min(T1, Math.max(T0, s.min)));
    const g = $('tl-now'), line = g.querySelector('line'), t = g.querySelector('text');
    g.style.display = s.timeline === 'event' ? '' : 'none'; // the chart is the event's afternoon
    line.setAttribute('x1', x); line.setAttribute('x2', x);
    t.setAttribute('x', x + 4); t.textContent = s.time;
  }

  // ── The creatures ─────────────────────────────────────
  // Every tile is drawn by rabbit.js itself: a still mount of the meadow, posed, run for a moment so
  // the easing settles, then drawn once. No loop runs, so the gallery costs nothing after it opens.
  const flowerOf = (kind, x, h, age) => {
    const k = { daisy: ['#fffaf0', '#ffd34d'], pink: ['#ffc2d4', '#ffd34d'], star: ['#ffd34d', '#ff8a2a'], tulip: ['#ff5a6e', '#ff9dbb'], bell: ['#b48cff', '#e0ccff'] }[kind];
    return { x, kind: kind === 'pink' ? 'daisy' : kind, colors: k, h, lean: 0, age, growDur: 15, bloomDur: 60, wiltDur: 8 };
  };
  const BLOOM = 15 + 20;
  // a rabbit tile: centre it, put it in a mode, let it settle
  const pose = (mode, setup, secs = 1) => (h) => {
    const r = h.r; r.x = h.W / 2; r.y = h.groundY(r.d); r.face = 1;
    r.mode = mode; r.t = 0; r.until = 999; r.act = null; r.actT = 999;
    setup?.(h, r);
    return secs;
  };
  const act = (a, more) => pose('rest', (h, r) => {
    r.act = a;
    if (a === 'audience') { r.feT = [-0.16, 0.16]; r.fe = [-0.16, 0.16]; r.feIn = 999; r.lookTX = r.lookTY = 0; }
    more?.(h, r);
  }, 1.2);
  const hold = (h, b, x, y, extra) => () => { b.state = extra?.state || 'wander'; b.t = 0; b.wanderFor = 99; b.wx = b.x = x; b.wy = b.y = y; b.life = 999; extra?.each?.(); };
  const fly = (h, x, y, o = {}) => { const b = { type: 'fly', x, y, state: 'wander', t: 0, age: 0, flap: o.flap ?? 1.2, view: o.view || 'top', colors: o.colors || ['#ff9a3c', '#3a1f10', '#ffd9a8'], size: o.size || 1.15, wing: 'round', dir: o.dir || 1, life: 999, ...o }; h.bugs.push(b); return b; };
  const C = { orange: ['#ff9a3c', '#3a1f10', '#ffd9a8'], blue: ['#7cc6ff', '#1d3d73', '#e6f5ff'], yellow: ['#ffd34d', '#8a5a00', '#fff3c4'], pink: ['#ff9dbb', '#a8335c', '#ffe3ec'], white: ['#fff6e8', '#7a6a9a', '#ffffff'], violet: ['#b48cff', '#3d2470', '#efe5ff'] };
  const GALLERY = [
    ['The jade rabbit', 'Its moods and moves. Each pose is the real drawing code, frozen.', [
      ['Sitting', act(null)],
      ['Facing the room', act('audience')],
      ['A wave to the room', act('audience', (h, r) => { r.waving = true; })],
      ['Grooming its face', act('groom')],
      ['Cleaning the near ear', act('earGroom', (h, r) => { r.earSide = 1; })],
      ['Cleaning the far ear', act('earGroom', (h, r) => { r.earSide = 0; })],
      ['Sniffing', act('sniff')],
      ['Standing up', act('rear')],
      ['Loafing', act('loaf')],
      ['A hop', pose('rest', (h, r) => { r.x -= 20 * h.S; h.main.startHops(1, 1); }, 0.2)],
      ['A binky', pose('rest', (h, r) => { r.x -= 30 * h.S; h.main.startHops(1, 1, null, 'binky'); }, 0.36)],
      ['Startled by a bee', pose('rest', (h, r) => { r.x -= 20 * h.S; h.main.startHops(1, 1, null, 'leap'); h.force('bee'); const b = h.bugs.at(-1); h.hold = hold(h, b, r.x - 30 * h.S, r.y - 48 * h.S); }, 0.28)],
      ['Wary of a bee', act(null, (h, r) => { h.force('bee'); const b = h.bugs.at(-1); h.hold = hold(h, b, r.x + 42 * h.S, r.y - 50 * h.S, { each: () => { h.main.cool.avoid = 99; } }); })],
      ['Looking up at a butterfly', act(null, (h, r) => { const b = fly(h, 0, 0, { colors: C.blue }); h.hold = hold(h, b, r.x + 22 * h.S, r.y - 70 * h.S); })],
      ['Chasing a butterfly', act('rear', (h, r) => { const b = fly(h, 0, 0, { colors: C.yellow, view: 'side' }); h.hold = hold(h, b, r.x + 44 * h.S, r.y - 66 * h.S); r.lookTX = 1; r.lookTY = -1; })],
      ['Digging', pose('rest', (h) => { h.main.force.dig(); }, 0.8)],
      ['Eating a carrot', pose('rest', (h) => { h.main.force.dig(); }, 3.1)],
      ['Smelling a flower', pose('smell', (h, r) => { h.flowers.push(flowerOf('tulip', r.x + 34 * h.S, 22 * h.S, BLOOM)); })],
      ['Nibbling a mushroom', pose('nibble', (h, r) => { const m = { x: r.x + 30 * h.S, grow: 1, eaten: 0, size: 1.1, kind: { cap: '#c99256', dark: '#9a6a36', gill: '#f0dcbc', stem: '#f6ead6' }, by: null, byT: 0 }; h.shrooms.push(m); r.shroom = m; r.until = 4; }, 1.6)],
      ['Watching a falling leaf', pose('rest', (h, r) => { h.dropLeaf(r.x + 18 * h.S); const l = h.leaves.at(-1); r.mode = 'watchLeaf'; r.until = 99; r.leafAim = l; h.hold = () => { l.state = 'fall'; l.y = r.y - 72 * h.S; l.x = r.x + 16 * h.S; l.caught = true; }; }, 1)],
      ['A leaf on its head', act(null, (h, r) => { h.dropLeaf(r.x); const l = h.leaves.at(-1); h.main.wear(l, 14 * h.S, -48 * h.S); r.leafT = 99; })],
      ['A leaf on its back', act('loaf', (h, r) => { h.dropLeaf(r.x); const l = h.leaves.at(-1); h.main.wear(l, -14 * h.S, -27 * h.S); r.leafT = 99; })],
      ['Asleep', pose('sleep', null, 3)],
      ['Stretching awake', pose('stretch', (h, r) => { r.until = 1.3; }, 0.65)],
      ['A sploot', pose('sploot')],
      ['Sitting out the rain', pose('hunker', (h) => { h.weather({ rain: 0.55 }); }, 3)],
      ['Shaking off the water', pose('shakeoff', null, 0.32)],
    ]],
    ['The friend', 'Cream with brown ears and a back patch, a little smaller. The same brain.', [
      ['Sitting', act(null), 'friend'],
      ['Facing the room', act('audience'), 'friend'],
      ['Cleaning an ear', act('earGroom', (h, r) => { r.earSide = 1; }), 'friend'],
      ['Asleep', pose('sleep', null, 3), 'friend'],
    ]],
    ['Butterflies', 'Seen from above or side-on; perched at the middle of a bloom, a little tilted.', [
      ['From above, open', h => { fly(h, h.W / 2, 70, { colors: C.orange, flap: 1.57, size: 1.5 }); }],
      ['From above, closing', h => { fly(h, h.W / 2, 70, { colors: C.violet, flap: 0.5, size: 1.5 }); }],
      ['Side-on, wings up', h => { fly(h, h.W / 2, 78, { colors: C.blue, view: 'side', flap: 0, size: 1.5 }); }],
      ['Side-on, wings spread', h => { fly(h, h.W / 2, 74, { colors: C.pink, view: 'side', flap: 1.57, size: 1.5 }); }],
      ['Perched, side-on', h => { const f = flowerOf('daisy', h.W / 2, 30 * h.S, BLOOM); h.flowers.push(f); fly(h, f.x, h.soil() - f.h - 2.2 * h.S - 1.6 * 1.3 * 1.3 * h.S, { colors: C.yellow, view: 'side', flap: 0, size: 1.3, state: 'sip', perch: { view: 'side', tilt: -0.22, dx: 0, face: 1 } }); }],
      ['Perched, from above', h => { const f = flowerOf('star', h.W / 2, 30 * h.S, BLOOM); h.flowers.push(f); fly(h, f.x, h.soil() - f.h - 2.2 * h.S - 0.6 * h.S, { colors: C.white, flap: 0.6, size: 1.3, state: 'sip', perch: { view: 'top', tilt: 0.2, dx: 0, face: 1 } }); }],
    ], 2.2],
    ['Bees', 'Buzz round a flower, park on it briefly to drink, buzz again.', [
      ['Buzzing', h => { h.force('bee'); const b = h.bugs.at(-1); Object.assign(b, { x: h.W / 2, y: 70, state: 'wander', dir: 1, flap: 0.8 }); }],
      ['Parked on a flower', h => { const f = flowerOf('daisy', h.W / 2, 30 * h.S, BLOOM); h.flowers.push(f); h.force('bee'); const b = h.bugs.at(-1); Object.assign(b, { x: f.x, y: h.soil() - f.h - 2.2 * h.S - 3.4 * h.S, state: 'sip', parked: true, dir: 1, flap: 0 }); }],
    ], 2.2],
    ['Flowers', 'Five kinds; each sprouts, buds, blooms for about a minute, wilts.', [
      ['The five kinds', h => { ['daisy', 'pink', 'star', 'tulip', 'bell'].forEach((k, i) => h.flowers.push(flowerOf(k, h.W * (0.14 + i * 0.18), 30 * h.S, BLOOM))); }, null, true],
      ['Sprout, bud, bloom, wilting', h => { [3, 12, BLOOM, 15 + 60 + 5].forEach((age, i) => h.flowers.push(flowerOf('pink', h.W * (0.17 + i * 0.22), 30 * h.S, age))); }, null, true],
    ], 1.6],
    ['Mushrooms and leaves', 'Autumn: mushrooms come up in the grass; leaves drift down and lie for a while.', [
      ['Mushrooms coming up', h => { [[0.25, 0.35], [0.5, 0.7], [0.75, 1]].forEach(([x, g], i) => h.shrooms.push({ x: h.W * x, grow: g, eaten: 0, size: 1.15, kind: [{ cap: '#9a5a2e', dark: '#6e3d1c', gill: '#e8d3b0', stem: '#f1e4cc' }, { cap: '#c99256', dark: '#9a6a36', gill: '#f0dcbc', stem: '#f6ead6' }, { cap: '#e6b24a', dark: '#b8822a', gill: '#f6dfa0', stem: '#f8ecd2' }][i], by: null, byT: 0 })); }],
      ['Half eaten', h => { h.shrooms.push({ x: h.W / 2, grow: 1, eaten: 0.5, size: 1.3, kind: { cap: '#9a5a2e', dark: '#6e3d1c', gill: '#e8d3b0', stem: '#f1e4cc' }, by: null, byT: 0 }); }],
      ['Leaves falling', h => { [0.2, 0.45, 0.7, 0.88].forEach((x, i) => { h.dropLeaf(h.W * x); const l = h.leaves.at(-1); l.y = 30 + i * 22; l.rot = i * 1.3; }); }],
      ['Leaves on the ground', h => { h.configure({ features: { grass: true } }); h.weather({ grass: 0.5, snap: true }); [0.2, 0.4, 0.62, 0.8].forEach((x, i) => { h.dropLeaf(h.W * x); const l = h.leaves.at(-1); l.state = 'ground'; l.y = h.soil() - 1 * h.S; l.rot = (i - 1.5) * 0.4; }); }],
    ], 1.6],
    ['Carrots and grass', 'Carrots ripen in the ground; grass fills in with each rain.', [
      ['Carrots growing to ripe', h => { [0.25, 0.6, 1].forEach((k, i) => h.planted.push({ x: h.W * (0.25 + i * 0.25), ripe: k })); }],
      ['A few clumps (15:30)', h => { h.configure({ features: { grass: true } }); h.weather({ grass: 0.25, snap: true }); }],
      ['Patchy (after two rains)', h => { h.configure({ features: { grass: true } }); h.weather({ grass: 0.6, snap: true }); }],
      ['A full meadow', h => { h.configure({ features: { grass: true } }); h.weather({ grass: 1, snap: true }); }],
    ], 1.6],
    ['Rain and night', 'Drizzle, rain and a downpour; fireflies from 17:00.', [
      ['Drizzle', h => { h.configure({ features: { grass: true } }); h.weather({ grass: 1, rain: 0.25, snap: true }); return 4; }],
      ['Rain', h => { h.configure({ features: { grass: true } }); h.weather({ grass: 1, rain: 0.55, snap: true }); return 4; }],
      ['Heavy rain', h => { h.configure({ features: { grass: true } }); h.weather({ grass: 1, rain: 1, snap: true }); return 4; }],
      ['Fireflies', h => { h.configure({ features: { grass: true } }); h.weather({ grass: 1, snap: true }); [[0.2, 60, 1], [0.38, 95, 0.5], [0.55, 50, 1], [0.72, 110, 0.8], [0.86, 70, 0.3]].forEach(([x, y, on]) => h.fireflies.push({ x: h.W * x, y: h.soil() - y, vx: 0, vy: 0, on, onT: 0, offIn: 99, ph: 0 })); }],
    ], 1.6],
  ];
  function buildDesign() {
    const panel = $('how-p-design');
    panel.innerHTML = `<p class="how-lede">What lives in the meadow and every state it can be in, drawn by the real code. All of it is shapes on one canvas, no images.</p>` +
      GALLERY.map(([title, note, tiles], gi) => `<h3>${esc(title)}</h3><p class="how-dim">${esc(note)}</p><div class="how-gal">${tiles.map((t, ti) => `<figure class="${t[3] ? 'wide' : ''}"><div class="how-tile" data-g="${gi}" data-t="${ti}"></div><figcaption>${esc(t[0])}</figcaption></figure>`).join('')}</div>`).join('');
    for (const tile of panel.querySelectorAll('.how-tile')) {
      const [, , tiles, scale] = GALLERY[tile.dataset.g], [, fn, look] = tiles[tile.dataset.t];
      const h = window.mountRabbit(tile, { manual: true, gallery: true, interactive: false, look, scale: () => scale || 1.6, tune: { flies: 0, binky: true } });
      if (!h) continue;
      if (!GALLERY[tile.dataset.g][0].includes('rabbit') && GALLERY[tile.dataset.g][0] !== 'The friend') h.main.gone = true; // no rabbit in the other tiles
      const secs = fn(h) || 0;
      h.settle(secs, () => h.hold?.());
    }
  }

  // ── The repo ──────────────────────────────────────────
  const FILES = ['index.html', 'slides.html', 'site.js', 'slides.js', 'rabbit.js', 'admin.js', 'howto.js', 'lanterns.js', 'i18n.js', 'data.js', 'base.css', 'site.css', 'slides.css', 'docs/meadow-plan.html'];
  const sthlm = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' }); // YYYY-MM-DD, by Stockholm's calendar
  const day = d => sthlm.format(d);
  const nice = s => new Date(s + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  async function buildRepo() {
    const p = $('how-p-repo');
    p.innerHTML = `<p class="how-lede">Measured, not typed in: commits come live from GitHub, sizes from the site’s own files.</p><div id="how-repo-body"><p class="how-dim">Reading the repository…</p></div>`;
    const body = $('how-repo-body');
    let commits = [];
    try {
      for (let page = 1; page < 10; page++) {
        const r = await fetch(`https://api.github.com/repos/${REPO}/commits?per_page=100&page=${page}`);
        if (!r.ok) throw new Error(r.status);
        const batch = await r.json();
        commits.push(...batch);
        if (batch.length < 100) break;
      }
    } catch (e) { commits = null; }
    const files = await Promise.all(FILES.map(async f => {
      try { const t = await (await fetch(f, { cache: 'no-store' })).text(); return { f, lines: t.split('\n').length, kb: new Blob([t]).size / 1024 }; } catch { return { f, lines: 0, kb: 0 }; }
    }));
    const totalLines = files.reduce((a, b) => a + b.lines, 0), totalKb = files.reduce((a, b) => a + b.kb, 0), maxLines = Math.max(...files.map(x => x.lines));

    let commitHtml = '<p class="how-dim">GitHub didn’t answer (offline, or the hourly limit). The numbers below are from the files only.</p>';
    if (commits && commits.length) {
      const per = new Map();
      for (const c of commits) { const d = day(new Date(c.commit.author.date)); per.set(d, (per.get(d) || 0) + 1); }
      const daysSorted = [...per.keys()].sort(), first = daysSorted[0], last = daysSorted[daysSorted.length - 1];
      const span = Math.round((new Date(last) - new Date(first)) / 86400000) + 1;
      const [bd, bn] = [...per.entries()].reduce((a, b) => (b[1] > a[1] ? b : a));
      const peak = bn;
      // a GitHub-style board: twelve weeks ending this week, so the burst reads against the quiet before it
      const today = new Date(), weeks = 12, lastSun = new Date(today); lastSun.setDate(today.getDate() - today.getDay());
      const start = new Date(lastSun); start.setDate(lastSun.getDate() - (weeks - 1) * 7);
      let cols = '';
      for (let w = 0; w < weeks; w++) {
        let cells = '';
        for (let r = 0; r < 7; r++) {
          const d = new Date(start); d.setDate(start.getDate() + w * 7 + r);
          if (d > today) { cells += '<i class="out"></i>'; continue; }
          const n = per.get(day(d)) || 0, l = !n ? 0 : n / peak > 0.75 ? 4 : n / peak > 0.5 ? 3 : n / peak > 0.25 ? 2 : 1;
          cells += `<i data-l="${l}" title="${n} commit${n === 1 ? '' : 's'} on ${nice(day(d))}"></i>`;
        }
        cols += `<span>${cells}</span>`;
      }
      commitHtml = `
        <div class="how-stats">
          <div><b>${commits.length}</b><span>commits</span></div>
          <div><b>${span}</b><span>day${span === 1 ? '' : 's'}, ${nice(first)} to ${nice(last)}</span></div>
          <div><b>${bn}</b><span>on the busiest day, ${nice(bd)}</span></div>
          <div><b>${totalLines.toLocaleString('en-GB')}</b><span>lines of code</span></div>
        </div>
        <div class="how-board" role="img" aria-label="${commits.length} commits over ${span} days, ${nice(first)} to ${nice(last)}. Busiest day ${nice(bd)}, ${bn} commits.">${cols}</div>
        <p class="how-dim how-cap">Twelve weeks to today, a square a day: it didn’t exist, and then it did.</p>
`;
    }
    body.innerHTML = `${commitHtml}
      <h3>The code</h3>
      <div class="how-files">${files.sort((a, b) => b.lines - a.lines).map(x => `<div><code>${esc(x.f)}</code><i style="--w:${(x.lines / maxLines) * 100}%"></i><span>${x.lines.toLocaleString('en-GB')} lines · ${x.kb.toFixed(1)} KB</span></div>`).join('')}</div>
      <p class="how-dim">${totalLines.toLocaleString('en-GB')} lines, ${totalKb.toFixed(0)} KB of HTML, CSS and JavaScript. No build step, no framework, no dependencies: plain files served by GitHub Pages.</p>
      <h3>Links</h3>
      <ul class="how-links">
        <li><a href="https://github.com/${REPO}" target="_blank" rel="noopener">github.com/${REPO}</a></li>
        <li><a href="https://southocean.github.io/TrungThu2026/" target="_blank" rel="noopener">The live site</a> · <a href="slides.html" target="_blank" rel="noopener">the slideshow on its own</a></li>
        <li><a href="docs/meadow-plan.html" target="_blank" rel="noopener">Rabbit Meadow Plan</a></li>
      </ul>`;
  }
})();
