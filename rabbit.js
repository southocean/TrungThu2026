// Thỏ ngọc: a jade rabbit that lives in the membership box.
// It sits and twitches, hops about, sometimes gets the zoomies. Press and hold on it to pick
// it up by the scruff; it dangles from the pointer until you let go or leave the box, then it
// drops, lands with a squish and dashes off.
(() => {
  const box = document.querySelector('.member');
  if (!box) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cv = document.createElement('canvas');
  cv.className = 'rabbit-pen';
  cv.setAttribute('aria-hidden', 'true');
  box.append(cv);
  const g = cv.getContext('2d');

  let W = 0, H = 0, dpr = 1, S = 1;
  function size() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = box.clientWidth; H = box.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    S = W < 520 ? 1 : 1.25; // rabbit scale
  }

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // The rabbit roams a shallow strip along the bottom of the box (depth 0 = back, 1 = front).
  const groundY = d => H - 46 * S + d * 30 * S;
  const margin = () => 34 * S;
  const HANG = 40; // scruff to tail tip while dangling

  const r = {
    x: 120, d: 0.5, y: 0, face: 1,
    state: 'sit', t: 0, until: 2,
    tx: 0, td: 0, speed: 0, phase: 0, air: 0,
    vx: 0, vy: 0, swing: 0, kick: 0, squash: 0,
    ear: 0, earT: 1, nose: 0,
  };
  const pointer = { x: -1e3, y: -1e3, inside: false };
  let held = null; // { id, lastX, lastY, vx, vy }

  function setState(s, until) { r.state = s; r.t = 0; r.until = until; }
  function pickTarget(far) {
    const m = margin();
    let x;
    do { x = rand(m, W - m); } while (far && Math.abs(x - r.x) < W * 0.3 && W > 200);
    r.tx = x; r.td = rand(0, 1);
    r.face = r.tx > r.x ? 1 : -1;
  }
  function think() {
    const roll = Math.random();
    if (roll < 0.12) { pickTarget(true); r.speed = 260 * S; setState('zoom', rand(1.6, 2.8)); }
    else if (roll < 0.62) { pickTarget(false); r.speed = 75 * S; setState('hop', 8); }
    else setState('sit', rand(1.5, 4));
  }

  // ── Update ──
  function step(dt) {
    r.t += dt;
    r.nose += dt * (r.state === 'sit' ? 14 : 6);
    r.earT -= dt;
    if (r.earT < 0) { r.ear = 1; r.earT = rand(1.5, 5); }
    r.ear = Math.max(0, r.ear - dt * 4);

    if (r.state === 'held') {
      // hang below the pointer, swinging with the hand's motion and kicking
      const hx = clamp(pointer.x, 0, W), hy = clamp(pointer.y, 0, groundY(r.d) - HANG * S); // can't push it into the floor
      held.vx = (hx - held.lastX) / Math.max(dt, 1 / 120);
      held.vy = (hy - held.lastY) / Math.max(dt, 1 / 120);
      held.lastX = hx; held.lastY = hy;
      r.x = hx; r.y = hy;
      r.swing += (clamp(-held.vx * 0.0016, -0.7, 0.7) - r.swing) * Math.min(1, dt * 8);
      r.kick += dt * 18;
      return;
    }
    if (r.state === 'fall') {
      r.vy += 2200 * dt;
      r.x += r.vx * dt; r.y += r.vy * dt;
      r.vx *= Math.pow(0.6, dt);
      const m = margin();
      if (r.x < m) { r.x = m; r.vx = Math.abs(r.vx) * 0.5; }
      if (r.x > W - m) { r.x = W - m; r.vx = -Math.abs(r.vx) * 0.5; }
      r.swing *= Math.pow(0.02, dt);
      // r.y is still the scruff while falling; the hanging body reaches ~40 px below it
      const gy = groundY(r.d);
      if (r.y + HANG * S >= gy) {
        r.y = gy;
        r.squash = clamp(r.vy / 1400, 0.35, 1);
        r.face = r.vx >= 0 ? 1 : -1;
        setState('land', 0.35);
      }
      return;
    }
    r.squash = Math.max(0, r.squash - dt * 3);
    if (r.state === 'land') {
      r.y = groundY(r.d);
      if (r.t > r.until) { pickTarget(true); r.speed = 300 * S; setState('zoom', rand(1.2, 2)); } // startled dash
      return;
    }

    if (r.state === 'hop' || r.state === 'zoom') {
      const zoom = r.state === 'zoom';
      r.phase += dt * (zoom ? 5.5 : 2.6);
      const dx = r.tx - r.x;
      // move only while airborne, like a real hop
      const airborne = Math.sin(r.phase * Math.PI) > 0;
      r.air = Math.max(0, Math.sin(r.phase * Math.PI));
      if (airborne) {
        r.x += Math.sign(dx) * Math.min(Math.abs(dx), r.speed * dt * 1.6);
        r.d += (r.td - r.d) * Math.min(1, dt * 1.5);
      }
      r.face = dx === 0 ? r.face : Math.sign(dx);
      r.y = groundY(r.d) - r.air * (zoom ? 22 : 14) * S;
      if (Math.abs(dx) < 2 && !airborne) {
        if (zoom && r.t < r.until) { pickTarget(true); if (Math.random() < 0.35) r.binky = 1; } // keep zooming, sometimes a binky
        else { r.air = 0; setState('sit', rand(1.2, 3.5)); }
      }
      if (r.binky) { r.binky -= dt * 2.5; if (r.binky < 0) r.binky = 0; }
      return;
    }

    // sit: settle, look at a nearby pointer, then decide what to do next
    r.air = 0;
    r.y = groundY(r.d);
    if (pointer.inside && Math.abs(pointer.x - r.x) < 160 * S && Math.abs(pointer.x - r.x) > 8) r.face = pointer.x > r.x ? 1 : -1;
    if (r.t > r.until) think();
  }

  // ── Drawing: a side-view rabbit facing +x, feet at (0, 0) ──
  function parts(pose) {
    const { air, held, kick, ear, nose } = pose;
    const backFoot = held ? -4 + Math.sin(kick) * 5 : -6 - air * 7;
    const frontPaw = held ? 16 + Math.sin(kick + 2) * 3 : 13 + air * 5;
    const earLift = held ? -0.5 : 0;
    return [
      ['ellipse', backFoot, -2, 9, 3.4, 0],
      ['circle', -22, -17, 5.5],
      ['ellipse', 7, -42, 4.6, 13.5, -0.45 + earLift - ear * 0.5], // far ear
      ['circle', -8, -14, 12.5],
      ['ellipse', 2, -16, 18, 13, 0],
      ['ellipse', frontPaw, -3, 4.5, 3, 0],
      ['circle', 17, -27, 10.5],
      ['ellipse', 12, -43, 4.8, 14, -0.2 + earLift + ear * 0.25], // near ear
      ['nose', 27, -26 + Math.sin(nose) * 0.6],
    ];
  }
  function shape(p) {
    g.beginPath();
    if (p[0] === 'circle') g.arc(p[1], p[2], p[3], 0, Math.PI * 2);
    else if (p[0] === 'ellipse') g.ellipse(p[1], p[2], p[3], p[4], p[5], 0, Math.PI * 2);
    else return false;
    return true;
  }
  function drawRabbit(pose) {
    const ps = parts(pose);
    // outline pass then fill pass gives one clean silhouette
    g.lineWidth = 2.6; g.strokeStyle = 'rgba(40, 20, 70, .55)';
    for (const p of ps) if (shape(p)) g.stroke();
    g.fillStyle = '#fdfbff';
    for (const p of ps) if (shape(p)) g.fill();
    // soft shading on haunch and belly
    g.fillStyle = 'rgba(150, 130, 190, .14)';
    g.beginPath(); g.ellipse(-6, -8, 12, 6, 0, 0, Math.PI * 2); g.fill();
    // inner ears
    g.fillStyle = '#ffb3c7';
    g.beginPath(); g.ellipse(12, -44, 2.2, 9.5, ps[7][5], 0, Math.PI * 2); g.fill();
    // eye, cheek, nose
    const wide = pose.held ? 2.5 : 2;
    g.fillStyle = '#1b1b2f'; g.beginPath(); g.arc(21, -29, wide, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(21.8, -29.8, 0.8, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255, 140, 170, .55)'; g.beginPath(); g.ellipse(21, -23, 3.2, 2, 0, 0, Math.PI * 2); g.fill();
    const n = ps[8];
    g.fillStyle = '#ff7aa2'; g.beginPath(); g.arc(n[1], n[2], 1.6, 0, Math.PI * 2); g.fill();
  }

  function render() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const gy = groundY(r.d), sc = S * (0.88 + r.d * 0.12);

    // shadow on the ground, smaller the higher the rabbit is
    const lift = clamp((gy - r.y) / (120 * S), 0, 1);
    g.fillStyle = `rgba(0, 0, 0, ${0.28 * (1 - lift * 0.7)})`;
    g.beginPath(); g.ellipse(r.x, gy + 1, 22 * sc * (1 - lift * 0.5), 5 * sc * (1 - lift * 0.5), 0, 0, Math.PI * 2); g.fill();

    g.save();
    g.translate(r.x, r.y);
    if (r.state === 'held' || r.state === 'fall') {
      // held by the scruff: head up, body hanging below the hand
      g.scale(sc * r.face, sc);
      g.rotate(-Math.PI / 2 + r.swing * r.face);
      g.translate(-14, 38);
    } else {
      g.scale(sc * r.face, sc);
      if (r.squash) g.scale(1 + r.squash * 0.28, 1 - r.squash * 0.28);
      if (r.air) g.rotate(-0.18 * r.air);
      if (r.binky) g.rotate(Math.sin(r.binky * Math.PI) * 0.6); // mid-air twist of joy
    }
    drawRabbit({ air: r.air, held: r.state === 'held' || r.state === 'fall', kick: r.kick, ear: r.ear, nose: r.nose });
    g.restore();
  }

  // ── Pointer: grab, carry, drop ──
  function local(e) { const b = box.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top, inside: e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom }; }
  function hit(p) {
    if (r.state === 'held' || r.state === 'fall') return false;
    const sc = S, cx = r.x + 2 * sc * r.face, cy = r.y - 22 * sc;
    return Math.abs(p.x - cx) < 30 * sc && Math.abs(p.y - cy) < 28 * sc;
  }
  function drop() {
    if (r.state !== 'held') return;
    r.vx = clamp(held.vx, -1400, 1400); r.vy = clamp(held.vy, -1400, 800);
    held = null;
    box.classList.remove('rabbit-grabbing');
    setState('fall', 9);
  }
  box.addEventListener('pointermove', e => {
    Object.assign(pointer, local(e));
    if (r.state === 'held') { if (!pointer.inside) drop(); return; }
    box.classList.toggle('rabbit-hover', hit(pointer));
  });
  box.addEventListener('pointerleave', () => { pointer.inside = false; box.classList.remove('rabbit-hover'); drop(); });
  box.addEventListener('pointerdown', e => {
    const p = local(e);
    if (!hit(p)) return;
    e.preventDefault();
    Object.assign(pointer, p);
    try { box.setPointerCapture(e.pointerId); } catch {} // keep getting moves even over the QR image
    held = { lastX: p.x, lastY: p.y, vx: 0, vy: 0 };
    r.air = 0; r.binky = 0; r.squash = 0; r.swing = 0;
    box.classList.add('rabbit-grabbing');
    setState('held', Infinity);
    if (still) render();
  });
  addEventListener('pointerup', drop);
  addEventListener('pointercancel', drop);
  // On touch screens a press on the rabbit picks it up instead of scrolling the page.
  box.addEventListener('touchstart', e => { const t = e.touches[0]; if (t && hit(local(t))) e.preventDefault(); }, { passive: false });

  // ── Loop, only while the box is on screen ──
  let running = false, last = 0;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    render();
    requestAnimationFrame(frame);
  }
  function start() { if (running || still) return; running = true; last = performance.now(); requestAnimationFrame(frame); }
  new IntersectionObserver(([e]) => { if (e.isIntersecting) start(); else running = false; }).observe(box);
  new ResizeObserver(() => { size(); r.x = clamp(r.x, margin(), W - margin()); r.y = groundY(r.d); render(); }).observe(box);

  size();
  r.x = W * 0.25; r.y = groundY(r.d);
  render();
  if (still) { // reduced motion: a rabbit sitting quietly, still happy to be picked up and dropped
    addEventListener('pointermove', () => { if (r.state === 'held') { r.x = clamp(pointer.x, 0, W); r.y = clamp(pointer.y, 0, H); render(); } });
    addEventListener('pointerup', () => { r.state = 'sit'; r.y = groundY(r.d); r.x = clamp(r.x, margin(), W - margin()); render(); });
  }
})();
