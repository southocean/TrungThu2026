// Thỏ ngọc: a jade rabbit that lives at the bottom of a box (the membership box on the site,
// and, look-only, along the bottom of the slideshow: it hops in from the side the first time
// the show plays, freezes mid-action on pause and carries on when play resumes).
//
// It rests and fidgets (blinks, glances, twitches its ears, grooms, sniffs, stands up to look
// around), takes short hops that lean toward open space, sometimes strolls across to a far
// spot, digs up and eats carrots, naps (and stretches on waking), sploots, rolls over, does
// the odd binky, and chases a butterfly when one drifts by. Each of the bigger things has its
// own cooldown, so a long-running loop keeps varying.
//
// On the site you can press and hold to pick it up by the scruff; it dangles from the pointer
// until you let go or leave the box, then drops and shakes itself off. A carrot it was busy
// with stays on the ground until it hops close enough to notice it again.
//
// mountRabbit(box, { scale(W), active(), watch, interactive, enter }):
//   scale    rabbit size for a box this wide (default: 1, or 1.25 on wide boxes)
//   active   when given, the rabbit only runs while this returns true (re-checked when the
//            class of opt.watch, default the box, changes); otherwise it runs while on screen
//   interactive  false for a rabbit you can only watch
//   enter    true: stay out of sight until the first start, then hop in from a side
window.mountRabbit = (box, opt = {}) => {
  if (!box) return;
  const interactive = opt.interactive !== false;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cv = document.createElement('canvas');
  cv.className = 'rabbit-pen';
  cv.setAttribute('aria-hidden', 'true');
  box.append(cv);
  if (!opt.enter) cv.classList.add('out'); // .out = on stage and visible
  const g = cv.getContext('2d');

  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (v, target, rate, dt) => v + (target - v) * Math.min(1, rate * dt);

  let W = 0, H = 0, dpr = 1, S = 1;
  function size() {
    W = box.clientWidth; H = box.clientHeight;
    // a box inside a scaled stage (the slideshow) renders at its on-screen size
    const view = box.getBoundingClientRect().width / W || 1;
    dpr = Math.min(devicePixelRatio || 1, 2) * view;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    S = opt.scale ? opt.scale(W) : W < 520 ? 1 : 1.25;
  }
  // Feet sit right on the bottom edge; depth (0 back … 1 front) only shifts a few pixels.
  const groundY = d => H - 7 * S - (1 - d) * 6 * S;
  const margin = () => 46 * S;
  const HANG = 60; // scruff to the bottom of the dangling hind feet, unscaled

  // ── State ──
  const r = {
    x: 0, y: 0, d: 0.6, face: 1,
    mode: 'rest', t: 0, until: 2, after: null,
    hops: 0, hopT: 0, hopFrom: 0, hopTo: 0, pause: 0, chaseX: null, entering: false,
    hopDur: 0.42, hopH: 11, binky: false, twist: 0,
    // pose, eased toward targets every frame
    air: 0, squash: 0, rear: 0, headDown: 0, paw: 0, dig: 0, chew: 0, shake: 0,
    flat: 0, stretch: 0, roll: 0, eyesShut: false,
    earA: -0.45, earB: -0.2, earAT: -0.45, earBT: -0.2,
    lookX: 0, lookY: 0, lookTX: 0, lookTY: 0, blink: 0, nose: 0, noseRate: 8,
    act: null, actT: 0, // small things to do while resting
    blinkIn: 2, earIn: 1, glanceIn: 1.5, zIn: 0, jumpIn: 0,
    vx: 0, vy: 0, swing: 0, kick: 0, // held / falling
  };
  // seconds until each bigger behaviour may happen again
  const cool = { carrot: rand(6, 12), fly: rand(25, 45), sleep: rand(45, 80), flop: rand(12, 25), binky: rand(8, 20) };
  let carrot = null; // the one being dug up or eaten: { x, len 0..1, state: 'buried' | 'mouth', out 0..1 }
  const lying = []; // carrots left on the ground after a grab: { x, len, tilt }
  const MAX_LYING = 5; // with this many about, it finishes leftovers before digging more
  let fly = null; // a butterfly: { x, y, tx, ty, t, life, retarget, leaving, flap, hue }
  const zs = []; // floating z's while it sleeps
  const pointer = { x: -1e3, y: -1e3, inside: false };
  let held = null;

  const setMode = (m, until = 0) => { r.mode = m; r.t = 0; r.until = until; };
  const mouthX = () => r.x + r.face * 28 * S;
  // which way to go: a coin toss weighted toward the roomier side, so it uses the whole floor
  const roomyDir = () => (Math.random() < 0.5 - 0.42 * ((r.x - W / 2) / (W / 2)) ? 1 : -1);

  function rest(min = 2, max = 5) { setMode('rest', rand(min, max)); r.act = null; r.actT = rand(0.6, 1.6); }

  function startHops(n, dir, toX = null, kind = 'hop') {
    r.hops = n; r.pause = 0; r.face = dir; r.chaseX = toX;
    r.binky = kind === 'binky';
    r.hopDur = r.binky ? 0.62 : 0.42;
    r.hopH = r.binky ? 30 : 11;
    setMode('hop');
    nextHop();
  }
  function nextHop() {
    const m = margin();
    let dist = (r.binky ? rand(22, 34) : rand(16, 28)) * S;
    if (r.chaseX != null) dist = Math.min(dist * 1.2, Math.abs(r.chaseX - r.x));
    let to = r.x + r.face * dist;
    if (!r.entering && (to < m || to > W - m)) { r.face *= -1; to = clamp(r.x + r.face * dist, m, W - m); }
    r.hopFrom = r.x; r.hopTo = to; r.hopT = 0;
  }
  function stroll() { // a walk across to somewhere well away from here
    const m = margin();
    let tx = rand(m, W - m);
    for (let i = 0; i < 5 && Math.abs(tx - r.x) < W * 0.3; i++) tx = rand(m, W - m);
    startHops(Math.ceil(Math.abs(tx - r.x) / (20 * S)) + 1, Math.sign(tx - r.x) || 1, tx);
  }
  function eatLying(dir, c) {
    lying.splice(lying.indexOf(c), 1);
    carrot = { x: c.x, len: c.len, state: 'mouth', out: 1 };
    r.face = dir; setMode('eat');
  }
  const nearestLying = within => lying.reduce((best, c) => {
    const d = Math.abs(c.x - r.x);
    return d < within && (!best || d < Math.abs(best.x - r.x)) ? c : best;
  }, null);
  // somewhere on the floor near x that isn't right on top of another carrot
  function freeSpot(x) {
    const m = margin(), gap = 40 * S; // about a carrot-length apart
    for (const off of [0, 1, -1, 2, -2, 3, -3]) {
      const tx = clamp(x + off * gap, m, W - m);
      if (lying.every(c => Math.abs(c.x - tx) >= gap)) return tx;
    }
    return clamp(x, m, W - m);
  }

  function spawnFly() {
    const fromLeft = Math.random() < 0.5, gy = groundY(r.d);
    fly = {
      x: fromLeft ? -20 * S : W + 20 * S, y: gy - rand(100, 150) * S,
      tx: r.x, ty: gy - 90 * S, t: 0, life: rand(10, 16), retarget: 0, leaving: false,
      flap: 0, hue: Math.random() < 0.5 ? ['#ff9dbb', '#ffd34d'] : ['#9fd8ff', '#ffe08a'],
    };
    cool.fly = rand(50, 100);
    setMode('chase');
  }

  function decide() {
    // a carrot left on the ground nearby gets noticed
    const near = nearestLying(170 * S);
    if (near) {
      const dir = Math.sign(near.x - r.x) || r.face;
      const standX = near.x - dir * 28 * S;
      if (Math.abs(standX - r.x) < 6 * S) { eatLying(dir, near); return; }
      startHops(Math.ceil(Math.abs(standX - r.x) / (24 * S)) + 1, dir, standX);
      return;
    }
    const chance = p => Math.random() < p;
    if (!fly && cool.fly <= 0 && chance(0.3)) { spawnFly(); return; }
    if (cool.sleep <= 0 && chance(0.25)) { cool.sleep = rand(80, 150); setMode('sleep', rand(8, 15)); return; }
    if (!carrot && lying.length < MAX_LYING && cool.carrot <= 0 && chance(0.22)) {
      carrot = { x: mouthX(), len: 1, state: 'buried', out: 0, tilt: 0 };
      setMode('dig', rand(1.4, 2));
      return;
    }
    if (cool.flop <= 0 && chance(0.25)) {
      cool.flop = rand(20, 40);
      if (chance(0.55)) setMode('sploot', rand(3, 6)); else setMode('roll', 0.95);
      return;
    }
    if (cool.binky <= 0 && chance(0.25)) { cool.binky = rand(15, 35); startHops(chance(0.6) ? 1 : 2, roomyDir(), null, 'binky'); return; }
    const roll = Math.random();
    if (roll < 0.6) startHops(chance(0.6) ? 1 : 2, roomyDir());
    else if (roll < 0.82) stroll();
    else rest(1.5, 3.5);
  }

  // ── Update ──
  function fidgets(dt) {
    r.blinkIn -= dt;
    if (r.blinkIn < 0) { r.blink = 1; r.blinkIn = Math.random() < 0.2 ? 0.25 : rand(2, 5.5); } // sometimes a double blink
    r.blink = Math.max(0, r.blink - dt * 7);
    // ears twitch on their own
    r.earIn -= dt;
    if (r.earIn < 0) {
      r.earIn = rand(0.6, 2.8);
      const which = Math.random();
      if (which < 0.45) r.earA = r.earAT + rand(-0.5, 0.25);
      else if (which < 0.9) r.earB = r.earBT + rand(-0.45, 0.3);
      else { r.earA -= 0.4; r.earB -= 0.4; }
    }
    // eyes: on the butterfly, else on a nearby pointer, else glancing about
    r.glanceIn -= dt;
    const near = pointer.inside && Math.hypot(pointer.x - r.x, pointer.y - r.y) < 220 * S;
    if (fly && r.mode !== 'held') {
      r.lookTX = clamp((fly.x - r.x) * r.face / 50, -1, 1);
      r.lookTY = clamp((fly.y - (r.y - 30 * S)) / 50, -1, 1);
    } else if (near && r.mode !== 'held') {
      r.lookTX = clamp((pointer.x - r.x) * r.face / 60, -1, 1);
      r.lookTY = clamp((pointer.y - (r.y - 30 * S)) / 60, -1, 1);
    } else if (r.glanceIn < 0) {
      r.glanceIn = rand(0.8, 3);
      [r.lookTX, r.lookTY] = Math.random() < 0.4 ? [0, 0] : [rand(-1, 1), rand(-0.8, 0.6)];
    }
    r.lookX = ease(r.lookX, r.lookTX, 10, dt);
    r.lookY = ease(r.lookY, r.lookTY, 10, dt);
    r.earA = ease(r.earA, r.earAT, 5, dt);
    r.earB = ease(r.earB, r.earBT, 5, dt);
    r.nose += dt * r.noseRate;
  }

  function stepFly(dt) {
    if (!fly) return;
    const gy = groundY(r.d);
    fly.t += dt; fly.flap += dt * 22; fly.retarget -= dt;
    if (!fly.leaving && fly.t > fly.life) {
      fly.leaving = true;
      fly.tx = fly.x < W / 2 ? -80 * S : W + 80 * S; fly.ty = Math.max(10 * S, gy - 280 * S);
    }
    if (!fly.leaving && fly.retarget < 0) { // flit about near the rabbit, sometimes dipping low
      fly.retarget = rand(0.9, 1.6);
      fly.tx = clamp(r.x + rand(-170, 170) * S, 20 * S, W - 20 * S);
      fly.ty = gy - rand(30, 130) * S;
    }
    fly.x += (fly.tx - fly.x) * Math.min(1, 0.9 * dt) + Math.sin(fly.t * 3.1) * 26 * S * dt;
    fly.y += (fly.ty - fly.y) * Math.min(1, 1.1 * dt) + Math.cos(fly.t * 4.3) * 34 * S * dt;
    if (fly.leaving && (fly.x < -60 * S || fly.x > W + 60 * S)) fly = null;
  }

  function step(dt) {
    r.t += dt;
    for (const k in cool) cool[k] -= dt;
    fidgets(dt);
    stepFly(dt);
    for (const z of zs) { z.t += dt; z.y -= 14 * S * dt; z.x += Math.sin(z.t * 2 + z.p) * 6 * S * dt; }
    while (zs.length && zs[0].t > 2.4) zs.shift();
    r.squash = Math.max(0, r.squash - dt * 3);
    r.shake = Math.max(0, r.shake - dt * 1.8);
    let earsT = [-0.45, -0.2], headDown = 0, rear = 0, paw = 0, dig = 0, chew = 0, noseRate = 8, flat = 0, stretch = 0;
    r.eyesShut = false;
    if (r.mode !== 'roll') r.roll = 0; // never stay tipped over if something cut a roll short
    if (r.mode !== 'hop') r.twist = 0;

    switch (r.mode) {
      case 'held': {
        const hx = clamp(pointer.x, 0, W), hy = clamp(pointer.y, 0, groundY(r.d) - HANG * S);
        held.vx = (hx - held.lastX) / Math.max(dt, 1 / 120); held.lastX = hx;
        held.vy = (hy - held.lastY) / Math.max(dt, 1 / 120); held.lastY = hy;
        r.x = hx; r.y = hy;
        r.swing = ease(r.swing, clamp(-held.vx * 0.0015, -0.6, 0.6), 6, dt);
        r.kick += dt * (5 + Math.min(10, Math.abs(held.vx) / 80));
        r.lookTX = 0.4; r.lookTY = -0.5;
        return;
      }
      case 'fall': {
        r.vy += 2200 * dt;
        r.x += r.vx * dt; r.y += r.vy * dt;
        r.vx *= Math.pow(0.6, dt);
        const m = margin();
        if (r.x < m) { r.x = m; r.vx = Math.abs(r.vx) * 0.4; }
        if (r.x > W - m) { r.x = W - m; r.vx = -Math.abs(r.vx) * 0.4; }
        r.swing *= Math.pow(0.05, dt);
        const gy = groundY(r.d);
        if (r.y + HANG * S >= gy) { r.y = gy; r.squash = clamp(r.vy / 1500, 0.3, 1); r.vx = 0; setMode('land', 0.3); }
        return;
      }
      case 'land':
        r.y = groundY(r.d); earsT = [-1.1, -0.9];
        if (r.t > r.until) { r.shake = 1; setMode('shaken', 0.7); }
        break;
      case 'shaken': // a good shake to put the fur back in order, then a couple of hops away
        r.y = groundY(r.d);
        if (r.t > r.until) startHops(2, roomyDir());
        break;
      case 'hop': {
        r.y = groundY(r.d);
        if (r.pause > 0) { r.pause -= dt; earsT = [-0.5, -0.25]; break; }
        r.hopT += dt / r.hopDur;
        const k = Math.min(1, r.hopT);
        r.air = Math.sin(k * Math.PI);
        r.x = r.hopFrom + (r.hopTo - r.hopFrom) * (k * k * (3 - 2 * k));
        r.y = groundY(r.d) - r.air * r.hopH * S;
        r.twist = r.binky ? Math.sin(k * TAU) * 0.45 : 0; // the happy mid-air twist
        earsT = r.binky ? [-0.2 + Math.sin(k * 9) * 0.4, 0.1 - Math.sin(k * 9) * 0.4] : [-0.75, -0.5];
        if (k >= 1) {
          r.air = 0; r.twist = 0; r.squash = r.binky ? 0.45 : 0.25; r.hops -= 1;
          const arrived = r.chaseX != null && Math.abs(r.chaseX - r.x) < 6 * S;
          if (r.hops > 0 && !arrived) { r.pause = rand(0.12, 0.3); nextHop(); }
          else {
            r.chaseX = null; r.entering = false; r.binky = false;
            const c = lying.find(c => Math.abs(c.x - mouthX()) < 22 * S);
            if (r.after) { const a = r.after; r.after = null; setMode(a); }
            else if (c) eatLying(r.face, c);
            else rest();
          }
        }
        break;
      }
      case 'chase': { // a butterfly is about: watch it, hop after it, jump when it comes low
        r.y = groundY(r.d);
        if (!fly) { rest(1, 2.5); break; }
        const dx = fly.x - r.x, high = groundY(r.d) - fly.y;
        if (Math.abs(dx) > 12 * S) r.face = Math.sign(dx);
        rear = clamp(high / (130 * S), 0.2, 1); earsT = [0.05, 0.2]; noseRate = 16;
        r.jumpIn -= dt;
        if (fly.leaving || r.t < 0.5) break; // watching it go, or just noticed it
        if (Math.abs(dx) > 70 * S) {
          r.after = 'chase';
          startHops(1, Math.sign(dx), clamp(fly.x - Math.sign(dx) * 30 * S, margin(), W - margin()));
        } else if (high < 80 * S && r.jumpIn < 0) {
          r.jumpIn = rand(1.2, 2.4); r.after = 'chase';
          startHops(1, Math.sign(dx) || r.face, null, 'binky');
        }
        break;
      }
      case 'sleep': // lies flat, eyes shut, slow breaths, z's drifting up
        r.y = groundY(r.d);
        flat = 1; headDown = 0.35; earsT = [-1.3, -1.15]; noseRate = 1.5; r.eyesShut = true;
        r.zIn -= dt;
        if (r.zIn < 0) { r.zIn = 1.3; zs.push({ x: r.x + r.face * 22 * S, y: r.y - 34 * S, t: 0, p: Math.random() * TAU }); }
        if (fly && !fly.leaving) setMode('chase'); // woken by a butterfly
        else if (r.t > r.until) setMode('stretch', 1.3);
        break;
      case 'stretch': // a long stretch on waking: front paws out, back low, then up
        r.y = groundY(r.d);
        stretch = Math.sin(Math.min(1, r.t / r.until) * Math.PI); flat = 0.5 * stretch; earsT = [-0.9, -0.7];
        r.eyesShut = r.t < r.until * 0.5;
        if (r.t > r.until) rest(1, 2);
        break;
      case 'sploot': // sprawled flat on its tummy, hind legs out behind, very relaxed
        r.y = groundY(r.d);
        flat = 1; headDown = 0.55; earsT = [-1.15, -1]; noseRate = 4;
        if (r.t > r.until) rest(1, 2);
        break;
      case 'roll': { // a happy roll-over, moving forward a little as it goes
        r.y = groundY(r.d);
        const k = Math.min(1, r.t / r.until);
        r.roll = (k * k * (3 - 2 * k)) * TAU;
        r.x = clamp(r.x + r.face * 50 * S * dt / r.until, margin(), W - margin());
        earsT = [-1, -0.8];
        if (k >= 1) { r.roll = 0; r.squash = 0.3; r.shake = 0.6; rest(1, 2); }
        break;
      }
      case 'dig': // paws scrabble at the ground and the leaves of a carrot appear
        headDown = 1; dig = 1; noseRate = 22; earsT = [-0.3, -0.05];
        carrot.out = Math.min(0.12, (r.t / r.until) * 0.12);
        if (r.t > r.until) setMode('pull', 0.9);
        break;
      case 'pull': // lean back and tug it out
        headDown = 0.7 - (r.t / r.until) * 0.7; earsT = [-0.6, -0.35];
        carrot.out = 0.12 + (r.t / r.until) * 0.88;
        if (r.t > r.until) { carrot.state = 'mouth'; setMode('eat'); }
        break;
      case 'eat': // munch from the tip until it's gone
        chew = 1; noseRate = 18; earsT = [-0.55, -0.3];
        carrot.len -= dt / 5.5;
        if (carrot.len <= 0) { carrot = null; cool.carrot = rand(10, 20); rest(1.5, 3); }
        break;
      default: { // rest
        r.y = groundY(r.d);
        if (pointer.inside && !r.act && Math.abs(pointer.x - r.x) < 140 * S && Math.abs(pointer.x - r.x) > 12 * S) r.face = pointer.x > r.x ? 1 : -1;
        r.actT -= dt;
        if (r.actT < 0) {
          if (r.act) { r.act = null; r.actT = rand(0.8, 2); }
          else {
            const a = Math.random();
            r.act = a < 0.3 ? 'groom' : a < 0.55 ? 'sniff' : a < 0.75 ? 'rear' : a < 0.9 ? 'turn' : 'loaf';
            r.actT = { groom: rand(1.4, 2.4), sniff: rand(0.8, 1.6), rear: rand(1.2, 2), turn: 0.01, loaf: rand(1.5, 3) }[r.act];
            if (r.act === 'turn') r.face *= -1;
          }
        }
        if (r.act === 'groom') { paw = 1; headDown = 0.25 + Math.sin(r.t * 9) * 0.12; earsT = [-0.7, -0.5]; }
        if (r.act === 'sniff') { headDown = 0.75; noseRate = 24; }
        if (r.act === 'rear') { rear = 1; earsT = [0.05, 0.15]; noseRate = 16; }
        if (r.act === 'loaf') { earsT = [-1, -0.85]; }
        if (fly && !fly.leaving) setMode('chase');
        else if (r.t > r.until && (!r.act || r.act === 'loaf')) decide();
      }
    }
    r.earAT = earsT[0]; r.earBT = earsT[1];
    r.headDown = ease(r.headDown, headDown, 6, dt);
    r.rear = ease(r.rear, rear, 5, dt);
    r.paw = ease(r.paw, paw, 8, dt);
    r.dig = ease(r.dig, dig, 8, dt);
    r.chew = ease(r.chew, chew, 8, dt);
    r.flat = ease(r.flat, flat, 4, dt);
    r.stretch = ease(r.stretch, stretch, 8, dt);
    r.noseRate = noseRate;
  }

  // ── Drawing ──
  // Shapes: ['c', x, y, r] circle or ['e', x, y, rx, ry, rot] ellipse. An outline pass then a
  // fill pass, so overlapping parts read as one soft silhouette.
  function shape(p) {
    g.beginPath();
    if (p[0] === 'c') g.arc(p[1], p[2], p[3], 0, TAU);
    else g.ellipse(p[1], p[2], p[3], p[4], p[5] || 0, 0, TAU);
  }
  function silhouette(list) {
    g.lineWidth = 2.6; g.strokeStyle = 'rgba(40, 20, 70, .55)';
    for (const p of list) { shape(p); g.stroke(); }
    g.fillStyle = '#fdfbff';
    for (const p of list) { shape(p); g.fill(); }
  }
  const ear = (base, a) => ['e', base[0] + Math.sin(a) * 12, base[1] - Math.cos(a) * 12, 4.6, 13.5, a];
  function innerEar(base, a) { g.beginPath(); g.ellipse(base[0] + Math.sin(a) * 12.5, base[1] - Math.cos(a) * 12.5, 2.1, 9.5, a, 0, TAU); g.fill(); }
  function face(hx, hy, wide) {
    const ex = hx + 4, ey = hy - 2;
    if (r.blink > 0.3 || r.eyesShut) {
      g.strokeStyle = '#1b1b2f'; g.lineWidth = 1.6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(ex - 2.2, ey); g.quadraticCurveTo(ex, ey + 1.4, ex + 2.2, ey); g.stroke();
    } else {
      const px = ex + r.lookX * 0.8, py = ey + r.lookY * 0.7;
      g.fillStyle = '#1b1b2f'; g.beginPath(); g.arc(px, py, wide ? 2.7 : 2.3, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(px + 0.8, py - 0.9, 0.8, 0, TAU); g.fill();
    }
    g.fillStyle = 'rgba(255, 140, 170, .5)'; g.beginPath(); g.ellipse(hx + 4, hy + 4.5, 3.2, 2, 0, 0, TAU); g.fill();
    g.fillStyle = '#ff7aa2'; g.beginPath(); g.arc(hx + 10, hy + 1 + Math.sin(r.nose) * 0.6, 1.6, 0, TAU); g.fill();
  }

  function drawCarrot(x, y, ang, len, sc) {
    // origin at the leafy end, root along +x
    const L = 30 * len, w = 5.2;
    g.save(); g.translate(x, y); g.rotate(ang); g.scale(sc, sc);
    g.fillStyle = '#3f9a4a';
    for (const a of [-0.5, 0, 0.5]) { g.beginPath(); g.ellipse(-6 * Math.cos(a), -6 * Math.sin(a), 7, 2.4, a, 0, TAU); g.fill(); }
    if (L > 1) {
      const bitten = len < 0.98, tipW = bitten ? w * (1 - len) + 1.2 : 0.6; // a bitten end is blunt
      g.fillStyle = '#ff8a2a';
      g.beginPath(); g.moveTo(0, -w); g.lineTo(L, -tipW); g.lineTo(L, tipW); g.lineTo(0, w); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(160, 60, 10, .45)'; g.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const px = (L / 4) * i, edge = -w + (w - tipW) * (px / L);
        g.beginPath(); g.moveTo(px, edge + 1); g.lineTo(px + 2, edge + 3); g.stroke();
      }
      if (bitten) { g.fillStyle = '#ffd08a'; g.beginPath(); g.ellipse(L, 0, 1.2, tipW, 0, 0, TAU); g.fill(); }
    }
    g.restore();
  }

  function drawFly() {
    const open = 0.25 + 0.75 * Math.abs(Math.sin(fly.flap)); // wings flapping
    g.save();
    g.translate(fly.x, fly.y);
    g.scale(S * 1.3, S * 1.3);
    g.rotate(Math.sin(fly.t * 3) * 0.2);
    g.fillStyle = fly.hue[0]; g.strokeStyle = 'rgba(40, 20, 70, .5)'; g.lineWidth = 1;
    for (const side of [-1, 1]) {
      g.save(); g.scale(side * open, 1);
      g.beginPath(); g.ellipse(6, -4, 7, 5.5, -0.5, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = fly.hue[1];
      g.beginPath(); g.ellipse(5, 4, 4.5, 3.5, 0.5, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = fly.hue[0];
      g.restore();
    }
    g.fillStyle = '#2a1840';
    g.beginPath(); g.ellipse(0, 0, 1.4, 5, 0, 0, TAU); g.fill();
    g.strokeStyle = '#2a1840'; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(0, -4); g.quadraticCurveTo(-2, -9, -4, -10); g.moveTo(0, -4); g.quadraticCurveTo(2, -9, 4, -10); g.stroke();
    g.restore();
  }

  function drawGround() {
    const air = r.air, rear = r.rear, hd = r.headDown, f = r.flat, st = r.stretch;
    const breath = r.mode === 'sleep' ? Math.sin(r.t * 2.2) * 0.6 : 0;
    const backFoot = -6 - air * 7 - f * 9;
    let pawX = 13 + air * 5 + f * 6 + st * 9, pawY = -3;
    if (r.dig > 0.01) { pawX = 14 + Math.sin(r.t * 22) * 4 * r.dig; pawY = -3 - Math.abs(Math.cos(r.t * 22)) * 2 * r.dig; }
    // standing up: the upper body rotates back around the hips
    const piv = [-6, -8], ang = -0.95 * rear, c = Math.cos(ang), s = Math.sin(ang);
    const rot = (x, y) => [piv[0] + (x - piv[0]) * c - (y - piv[1]) * s, piv[1] + (x - piv[0]) * s + (y - piv[1]) * c];
    const [hx, hy] = rot(17 + hd * 5 + f * 7 + st * 4, -27 + hd * 11 + f * 11 + r.chew * Math.sin(r.t * 16) * 0.8);
    const body = rot(2, -16 + f * 6 + st * 2);
    let paw = rot(pawX, pawY);
    if (r.paw > 0.01) { // grooming: paws come up to the face
      const p2 = [hx + 5, hy + 6 + Math.sin(r.t * 9) * 2];
      paw = [paw[0] + (p2[0] - paw[0]) * r.paw, paw[1] + (p2[1] - paw[1]) * r.paw];
    }
    const baseFar = [hx - 6, hy - 8], baseNear = [hx - 3, hy - 9];
    silhouette([
      ['e', backFoot, -2, 9 + f * 2, 3.4],
      ['c', -22 - f * 4, -17 + f * 7, 5.5],
      ear(baseFar, r.earA + ang),
      ['c', -8 - f * 2, -14 + f * 5, 12.5 - f * 1.5],
      ['e', body[0], body[1], 18 + f * 5 + st * 3, 13 - f * 3 + breath, ang],
      ['e', paw[0], paw[1], 4.5, 3],
      ['c', hx, hy, 10.5],
      ear(baseNear, r.earB + ang),
    ]);
    g.fillStyle = 'rgba(150, 130, 190, .14)';
    g.beginPath(); g.ellipse(-6 - f * 2, -8 + f * 4, 12, 6 - f * 2, 0, 0, TAU); g.fill();
    g.fillStyle = '#ffb3c7'; innerEar(baseNear, r.earB + ang);
    face(hx, hy, false);
    return [hx + 10, hy + 2]; // mouth
  }

  // Held by the scruff: the pinch is at (0, 0), the head just in front of it, the body, paws
  // and hind legs hanging straight down.
  function drawHeld() {
    const k = r.kick, sw = Math.sin(k) * 0.25;
    silhouette([
      ['e', -7, 50 + Math.sin(k) * 2, 4.2, 9, 0.15 + sw],
      ['e', 2, 51 + Math.sin(k + 1.6) * 2, 4.2, 9, -0.1 - sw],
      ['c', -12, 44, 5.5],
      ['e', -2, 29, 13, 21, 0.05],
      ['e', 9, 31, 3, 6, 0.2],
      ['e', 5, 33, 3, 6, 0.1],
      ['c', 9, 4, 10.5],
      ear([2, -2], -2.1 + Math.sin(k * 0.5) * 0.05), // ears pinned back along the neck
      ear([5, -3], -1.85),
    ]);
    // fur pulled taut at the back of the neck, where it's held
    g.strokeStyle = 'rgba(40, 20, 70, .3)'; g.lineWidth = 1.1; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-6, 14); g.quadraticCurveTo(-4, 9, -2, 6); g.moveTo(-2, 15); g.quadraticCurveTo(-1, 10, 0, 7); g.stroke();
    g.fillStyle = 'rgba(150, 130, 190, .18)';
    g.beginPath(); g.ellipse(-2, 34, 9, 12, 0.05, 0, TAU); g.fill();
    g.fillStyle = '#ffb3c7'; innerEar([5, -3], -1.85);
    face(9, 4, true);
  }

  function render() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const gy = groundY(r.d), sc = S * (0.9 + r.d * 0.1);
    const heldish = r.mode === 'held' || r.mode === 'fall';

    const feetY = heldish ? r.y + HANG * S : r.y;
    const lift = clamp((gy - feetY) / (140 * S), 0, 1);
    g.fillStyle = `rgba(0, 0, 0, ${0.3 * (1 - lift * 0.7)})`;
    g.beginPath(); g.ellipse(r.x, gy + 1, (22 + r.flat * 6) * sc * (1 - lift * 0.5), 4.5 * sc * (1 - lift * 0.5), 0, 0, TAU); g.fill();

    for (const c of lying) drawCarrot(c.x, gy - 4 * S, c.tilt, c.len, S);
    if (carrot?.state === 'buried') { // in the ground: upright, clipped at the ground line
      g.save(); g.beginPath(); g.rect(0, 0, W, gy); g.clip();
      drawCarrot(carrot.x, gy - (carrot.out * 30 + 4) * S, Math.PI / 2, 1, S);
      g.restore();
    }

    g.save();
    g.translate(r.x, r.y);
    g.scale(sc * r.face, sc);
    if (heldish) {
      g.rotate(r.swing);
      drawHeld();
    } else {
      if (r.squash) g.scale(1 + r.squash * 0.22, 1 - r.squash * 0.22);
      if (r.air) g.rotate(-0.16 * r.air);
      if (r.twist) g.rotate(r.twist);
      if (r.roll) { // roll over around the middle of the body, lifted so it stays on the ground
        g.translate(0, -16 - Math.sin(r.roll / 2) * 6); g.rotate(r.roll); g.translate(0, 16);
      }
      if (r.shake) g.rotate(Math.sin(r.shake * 40) * 0.08 * r.shake);
      const mouth = drawGround();
      if (carrot?.state === 'mouth') drawCarrot(mouth[0] + 30 * carrot.len + 2, mouth[1] + 1, Math.PI + 0.12, carrot.len, 1);
    }
    g.restore();

    // z's over a sleeping rabbit
    if (zs.length) {
      g.save();
      g.textAlign = 'center';
      for (const z of zs) {
        g.fillStyle = `rgba(255, 255, 255, ${0.85 * Math.max(0, 1 - z.t / 2.4)})`;
        g.font = `700 ${Math.round((9 + z.t * 3) * S)}px "Be Vietnam Pro", system-ui, sans-serif`;
        g.fillText('z', z.x, z.y);
      }
      g.restore();
    }
    if (fly) drawFly();
  }

  // ── Pointer: grab, carry, drop ──
  function local(e) {
    const b = box.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top, inside: e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom };
  }
  function hit(p) {
    if (r.mode === 'held' || r.mode === 'fall') return false;
    const cx = r.x + 2 * S * r.face, cy = r.y - 22 * S;
    return Math.abs(p.x - cx) < 32 * S && Math.abs(p.y - cy) < 30 * S;
  }
  function grab(p) {
    // the carrot it was busy with stays behind on the ground
    if (carrot) {
      if (carrot.out >= 0.3) lying.push({ x: freeSpot(mouthX()), tilt: rand(-0.15, 0.15), len: Math.max(carrot.len, 0.2) });
      carrot = null; // one still in the ground is forgotten for now
    }
    if (fly) { fly.t = fly.life; } // the butterfly takes fright and leaves
    zs.length = 0;
    held = { lastX: p.x, lastY: p.y, vx: 0, vy: 0 };
    Object.assign(r, {
      air: 0, squash: 0, swing: 0, shake: 0, rear: 0, headDown: 0, paw: 0, dig: 0, chew: 0, flat: 0, stretch: 0,
      roll: 0, twist: 0, binky: false, act: null, chaseX: null, after: null,
    });
    box.classList.add('rabbit-grabbing');
    setMode('held', Infinity);
  }
  function drop() {
    if (r.mode !== 'held') return;
    r.vx = clamp(held.vx, -1400, 1400); r.vy = clamp(held.vy, -1400, 800);
    held = null;
    box.classList.remove('rabbit-grabbing');
    setMode('fall');
  }
  if (interactive) {
    box.addEventListener('pointermove', e => {
      Object.assign(pointer, local(e));
      if (r.mode === 'held') { if (!pointer.inside) drop(); return; }
      box.classList.toggle('rabbit-hover', hit(pointer));
    });
    box.addEventListener('pointerleave', () => { pointer.inside = false; box.classList.remove('rabbit-hover'); drop(); });
    box.addEventListener('pointerdown', e => {
      const p = local(e);
      if (!hit(p)) return;
      e.preventDefault();
      Object.assign(pointer, p);
      try { box.setPointerCapture(e.pointerId); } catch {} // keep getting moves even over the QR image
      grab(p);
      if (still) render();
    });
    addEventListener('pointerup', drop);
    addEventListener('pointercancel', drop);
    // On touch screens a press on the rabbit picks it up instead of scrolling the page.
    box.addEventListener('touchstart', e => { const t = e.touches[0]; if (t && hit(local(t))) e.preventDefault(); }, { passive: false });
  }

  // ── Loop, only while the box is on screen (or the slideshow is playing) ──
  let running = false, last = 0;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    render();
    requestAnimationFrame(frame);
  }
  let entered = false;
  function enterStage() { // from just off one side, hop in to a spot not far from that edge
    entered = true;
    const fromLeft = Math.random() < 0.5;
    r.x = fromLeft ? -50 * S : W + 50 * S;
    r.y = groundY(r.d); r.entering = true;
    startHops(99, fromLeft ? 1 : -1, fromLeft ? rand(margin() + 20 * S, W * 0.3) : rand(W * 0.7, W - margin() - 20 * S));
    cv.classList.add('out');
  }
  function start() {
    if (running || still) return;
    if (opt.enter && !entered) enterStage();
    running = true; last = performance.now(); requestAnimationFrame(frame);
  }
  if (opt.active) {
    const check = () => { if (opt.active()) start(); else running = false; };
    new MutationObserver(check).observe(opt.watch || box, { attributes: true, attributeFilter: ['class'] });
    check();
  } else new IntersectionObserver(([e]) => { if (e.isIntersecting) start(); else running = false; }).observe(box);
  const fitBox = () => {
    size();
    if (!r.entering) r.x = clamp(r.x || W * 0.25, margin(), W - margin());
    if (r.mode !== 'held' && r.mode !== 'fall') r.y = groundY(r.d);
    for (const c of lying) c.x = clamp(c.x, margin(), W - margin());
    render();
  };
  new ResizeObserver(fitBox).observe(box);
  addEventListener('resize', fitBox); // a scaled stage changes size without the box resizing

  size();
  r.x = clamp(W * 0.25, margin(), W - margin()); r.y = groundY(r.d);
  rest(1, 2);
  render();
  if (still && interactive) { // reduced motion: it sits quietly, but can still be picked up and put down
    addEventListener('pointermove', () => { if (r.mode === 'held') { r.x = clamp(pointer.x, 0, W); r.y = clamp(pointer.y, 0, groundY(r.d) - HANG * S); render(); } });
    addEventListener('pointerup', () => { r.mode = 'rest'; r.y = groundY(r.d); r.x = clamp(r.x, margin(), W - margin()); render(); });
  }

  // test hook: force a behaviour (only used while developing)
  return { r, force(what) { ({ fly: spawnFly, sleep: () => setMode('sleep', 8), sploot: () => setMode('sploot', 4), roll: () => setMode('roll', 0.95), binky: () => startHops(1, roomyDir(), null, 'binky'), stroll })[what]?.(); } };
};

window.siteRabbit = mountRabbit(document.querySelector('.member'));
