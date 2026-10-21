// Admin mode: the lock from the Helsinki site, and dev tools beside the slideshow.
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ── the gate ──────────────────────────────────────────
  // Tap the logo 11 times (numbers start falling on the 4th tap) and the 11th opens a
  // "security question". The question is a decoy: answering it right earns applause and a
  // roast. The door opens for one word the dialog never asks for (konami), or for the Konami
  // code itself on a keyboard. This hides the dev tools from guests, nothing more.
  const GATE_WORD = 'konami';
  const DECOYS = [
    { q: 'On which day of the lunar month is Trung Thu?', a: ['15', 'fifteen', 'the 15th', '15th', 'rằm', 'ram'] },
    { q: 'Who sits under the banyan tree on the moon?', a: ['chú cuội', 'chu cuoi', 'cuội', 'cuoi', 'thằng cuội', 'thang cuoi'] },
    { q: 'How much is a year of membership, in kronor?', a: ['100', '100 kr', 'hundred', 'one hundred'] },
    { q: 'What does the jade rabbit dig up on this site?', a: ['carrot', 'carrots', 'a carrot', 'cà rốt', 'ca rot'] },
    { q: 'How many points does a đèn ông sao have?', a: ['5', 'five'] },
    { q: 'What is 7 × 8?', a: ['56', 'fifty six', 'fifty-six'] },
  ];
  const WRONG = [
    'Wrong. Chú Cuội would have got that one, and he has been stuck on the moon for centuries.',
    'No. The rabbit knew that. The RABBIT.',
    'Incorrect. Please return to the lantern parade.',
    'That is not it. Bold of you to try, though.',
    'Nope. Somewhere a mooncake just crumbled in disappointment.',
  ];
  const RIGHT = [
    'Correct! Gold star! …Also, that is not the password. You really thought the dev tools were guarded by a pub quiz?',
    'Right answer! Wrong door. A trivia question is not a lock.',
    'Correct, and completely useless. The password was never the question.',
  ];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const norm = s => s.trim().toLowerCase().replace(/\s+/g, ' ');

  const isAdmin = () => { try { return sessionStorage.getItem('tt_admin') === '1'; } catch { return false; } };

  let taps = 0, tapTimer;
  document.querySelector('.brand').addEventListener('click', e => {
    if (isAdmin()) return;
    taps++;
    clearTimeout(tapTimer); tapTimer = setTimeout(() => { taps = 0; }, 2500);
    if (taps >= 4) {
      const f = document.createElement('span');
      f.className = 'fall'; f.textContent = taps;
      f.setAttribute('aria-hidden', 'true');
      const r = e.currentTarget.getBoundingClientRect();
      f.style.left = (e.clientX || r.left + r.width / 2) - 8 + 'px';
      f.style.top = (e.clientY || r.top + r.height / 2) - 10 + 'px';
      f.style.setProperty('--dx', (Math.random() * 60 - 30) + 'px');
      f.style.setProperty('--r', (Math.random() * 90 - 45) + 'deg');
      document.body.append(f);
      setTimeout(() => f.remove(), 1200);
    }
    if (taps >= 11) { taps = 0; openGate(); }
  });

  const gate = $('gate');
  let decoy;
  function openGate() {
    decoy = pick(DECOYS);
    $('gate-q').textContent = decoy.q;
    $('gate-a').value = '';
    $('gate-msg').textContent = ''; $('gate-msg').className = 'gate-msg';
    gate.showModal();
    setTimeout(() => $('gate-a').focus(), 50);
  }
  $('gate-leave').onclick = () => gate.close();
  $('gate-a').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); $('gate-form').requestSubmit($('gate-go')); }
  });
  $('gate-form').addEventListener('submit', e => {
    e.preventDefault();
    const a = norm($('gate-a').value), msg = $('gate-msg');
    if (!a) return;
    if (a === GATE_WORD) { gate.close(); unlock(); return; }
    if (decoy.a.includes(a)) { msg.textContent = pick(RIGHT); msg.className = 'gate-msg'; }
    else { msg.textContent = pick(WRONG); msg.className = 'gate-msg bad'; gate.classList.remove('shake'); void gate.offsetWidth; gate.classList.add('shake'); }
    $('gate-a').select();
  });

  const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  let ki = 0;
  addEventListener('keydown', e => {
    if (e.target.matches?.('input, textarea')) return;
    const k = e.key.toLowerCase();
    if (k === KONAMI[ki]) { if (++ki === KONAMI.length) { ki = 0; if (!isAdmin()) unlock(); } }
    else ki = k === KONAMI[0] ? 1 : 0;
  });

  // ── dev tools ─────────────────────────────────────────
  const panel = $('devtools');
  const frame = document.querySelector('.embed iframe');
  const meadow = () => frame.contentWindow?.TTslides?.meadow;
  let poll = null;

  function unlock(quiet) {
    try { sessionStorage.setItem('tt_admin', '1'); } catch {}
    document.body.classList.add('admin');
    frame.loading = 'eager';
    build();
    panel.hidden = false;
    clearInterval(poll); poll = setInterval(render, 500);
    if (!quiet) document.getElementById('slideshow').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function lock() {
    try { sessionStorage.removeItem('tt_admin'); } catch {}
    meadow()?.live(); // drop any simulated clock with the rights
    clearInterval(poll);
    panel.hidden = true; panel.innerHTML = '';
    document.body.classList.remove('admin');
  }

  const SPEEDS = [1, 10, 60];
  const SPAWN = [['fly', 'Butterfly'], ['bee', 'Bee'], ['flower', 'Flower'], ['carrot', 'Carrot'], ['friend', 'Friend'], ['friendLeave', 'Friend leaves']];
  let built = false;
  function build() {
    panel.innerHTML = `
      <div class="dt-head"><span class="dt-kicker">Admin · meadow</span><button type="button" class="dt-link" id="dt-lock">Lock</button></div>
      <div class="dt-clock"><output id="dt-time">--:--</output><span id="dt-src" class="dt-badge"></span></div>
      <p class="dt-now" id="dt-now">Loading the slideshow…</p>
      <div class="dt-row">
        <button type="button" class="dt-btn" id="dt-prev" aria-label="Previous milestone">⏮</button>
        <button type="button" class="dt-btn dt-wide" id="dt-next">Next milestone ⏭</button>
      </div>
      <div class="dt-row" role="group" aria-label="Clock speed">
        ${SPEEDS.map(x => `<button type="button" class="dt-btn" data-speed="${x}" aria-pressed="false">${x}×</button>`).join('')}
        <button type="button" class="dt-btn dt-wide" id="dt-live">Real time</button>
      </div>
      <div class="dt-rabbit">
        <p id="dt-rabbit">Rabbit</p>
        <div class="dt-row dt-wrap">
          <button type="button" class="dt-btn dt-wide" id="dt-turn">End visit now</button>
          <button type="button" class="dt-btn" id="dt-guard">Pass guard</button>
        </div>
      </div>
      <ol class="dt-rail" id="dt-rail"></ol>
      <details class="dt-more">
        <summary>Spawn</summary>
        <div class="dt-row dt-wrap">${SPAWN.map(([k, l]) => `<button type="button" class="dt-btn" data-force="${k}">${l}</button>`).join('')}</div>
      </details>
      <a class="dt-doc" href="docs/meadow-plan.html" target="_blank" rel="noopener">Rabbit Meadow Plan ↗</a>`;
    $('dt-lock').onclick = lock;
    $('dt-prev').onclick = () => { meadow()?.step(-1); render(); };
    $('dt-next').onclick = () => { meadow()?.step(1); render(); };
    $('dt-live').onclick = () => { meadow()?.live(); render(); };
    $('dt-turn').onclick = () => { meadow()?.rabbitNow(); render(); };
    $('dt-guard').onclick = () => { const m = meadow(); if (m) { const r = m.rabbit(); m.guard(r.seen < r.of); render(); } };
    panel.querySelectorAll('[data-speed]').forEach(b => b.onclick = () => { meadow()?.setSpeed(Number(b.dataset.speed)); render(); });
    panel.querySelectorAll('[data-force]').forEach(b => b.onclick = () => meadow()?.force(b.dataset.force));
    $('dt-rail').addEventListener('click', e => {
      const b = e.target.closest('[data-min]');
      if (b) { meadow()?.setClock(Number(b.dataset.min)); render(); }
    });
    built = false;
  }

  function render() {
    const m = meadow();
    if (!m) return;
    const s = m.state();
    if (!built) { // milestones and the quiet stretch, in clock order
      const rows = [...m.phases.map(p => ({ min: p.min, html: `<button type="button" data-min="${p.min}"><time>${p.at}</time><span>${esc(p.name)}${p.stage ? `<small>Rabbit ${esc(p.stage)}</small>` : ''}</span></button>` })),
        ...m.quiet.map(q => ({ min: q.fromMin, html: `<span class="dt-quiet"><time>${q.from}–${q.to}</time><span>Quiet · ${esc(q.why)}<small>Rabbit ${esc(q.stage)}</small></span></span>` }))]
        .sort((a, b) => a.min - b.min);
      $('dt-rail').innerHTML = rows.map(r => `<li>${r.html}</li>`).join('');
      built = true;
    }
    $('dt-time').textContent = s.time;
    $('dt-src').textContent = { live: 'Live · Stockholm', play: 'Play time', sim: `Simulated · ${s.speed}×` }[s.source];
    $('dt-src').dataset.src = s.source;
    $('dt-now').innerHTML = `<b>${esc(s.phase)}</b>` + (s.next ? ` · next ${s.next.at} ${esc(s.next.name)}` : ' · last milestone') +
      `<br><span>Programme: ${esc(s.programme)}${s.quiet ? ' · quiet' : ''}</span>`;
    panel.querySelectorAll('[data-speed]').forEach(b => b.setAttribute('aria-pressed', String(s.source === 'sim' && s.speed === Number(b.dataset.speed))));
    $('dt-live').disabled = s.source !== 'sim';
    const r = m.rabbit(), left = r.nextIn != null ? ` · ${Math.floor(r.nextIn / 60)}:${String(Math.round(r.nextIn % 60)).padStart(2, '0')} left` : '';
    $('dt-rabbit').innerHTML = !r.on ? '<b>Rabbit off</b> (button in the slideshow)' :
      r.seen < r.of ? `<b>Rabbit waits for the first loop</b> · ${r.seen}/${r.of} slides seen 5 s` :
      `<b>Rabbit ${r.out ? 'out' : 'away'}</b>${left}<br><span>Now: ${esc(r.plan)}</span>`;
    $('dt-turn').textContent = r.out ? 'End visit now' : 'Bring it out now';
    $('dt-turn').disabled = !r.on || r.seen < r.of || r.nextIn == null;
    $('dt-guard').textContent = r.seen < r.of ? 'Pass guard' : 'Reset guard';
    panel.querySelectorAll('#dt-rail [data-min]').forEach((b, i) => {
      b.classList.toggle('on', i === s.idx);
      b.classList.toggle('past', i < s.idx);
    });
  }

  if (isAdmin()) unlock(true);
})();
