// Thỏ ngọc's meadow: a jade rabbit living along the bottom of a box (the membership box on the
// site, and, look-only, the bottom of the slideshow, where it hops in from the side the first
// time the show plays).
//
// The meadow: low grass patches; flowers that sprout among them, bud, bloom, wilt and go;
// carrots that grow in the ground until they're ripe; butterflies (assorted wing shapes and
// colours) that drift in looking for flowers, land to sip, move on and leave; and bees that
// zig-zag between blooms and hover rather than land.
//
// The rabbit rests and fidgets (blinks, glances, ear twitches, grooming, sniffing, standing up
// to look around), hops in short runs (never more than MAX_HOPS before a rest) leaning toward
// open space, strolls to far spots, smells flowers, digs up ripe carrots it sees and eats them,
// naps, sploots, rolls over, binkies, chases butterflies (one at a time, switching now and
// then) and backs away from bees. On the site you can pick it up by the scruff.
//
// When the slideshow pauses, everything on the ground freezes and the insects fly away.
//
// mountRabbit(box, { scale(W), active(), watch, interactive, enter }):
//   scale    rabbit size for a box this wide (default: 1, or 1.25 on wide boxes)
//   active   when given, the meadow only runs while this returns true (re-checked when the
//            class of opt.watch, default the box, changes); otherwise while on screen
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
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (v, target, rate, dt) => v + (target - v) * Math.min(1, rate * dt);
  const smooth = k => k * k * (3 - 2 * k);

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
  const soil = () => groundY(0.6) + 1 * S; // where plants come out of the ground
  const margin = () => 46 * S;
  const HANG = 60; // scruff to the bottom of the dangling hind feet, unscaled
  const MAX_HOPS = 6; // hops in a row before it stops for a rest
  const VISION = 260; // how far (× S) it notices a ripe carrot

  // ── The meadow ──
  let T = 0; // meadow time; stands still while paused
  let grass = [];
  const flowers = []; // { x, kind, colors, h, lean, age, growDur, bloomDur, wiltDur }
  const planted = []; // carrots in the ground: { x, ripe 0..1 }
  const lying = []; // carrots dropped after a grab (site): { x, len, tilt }
  const bugs = []; // butterflies and bees
  const zs = []; // floating z's while the rabbit sleeps
  const maxFlowers = () => clamp(Math.round(W / (230 * S)), 2, 8);
  const maxCarrots = () => clamp(Math.round(W / (500 * S)), 1, 3);
  const FLOWER_KINDS = [
    { kind: 'daisy', colors: ['#fffaf0', '#ffd34d'] },
    { kind: 'daisy', colors: ['#ffc2d4', '#ffd34d'] },
    { kind: 'star', colors: ['#ffd34d', '#ff8a2a'] },
    { kind: 'tulip', colors: ['#ff5a6e', '#ff9dbb'] },
    { kind: 'bell', colors: ['#b48cff', '#e0ccff'] },
  ];
  const WINGS = ['round', 'pointy', 'swallow'];
  const WING_COLORS = [
    ['#ff9a3c', '#3a1f10', '#ffd9a8'], // monarch-ish orange
    ['#7cc6ff', '#1d3d73', '#e6f5ff'], // blue
    ['#ffd34d', '#8a5a00', '#fff3c4'], // yellow
    ['#ff9dbb', '#a8335c', '#ffe3ec'], // pink
    ['#fff6e8', '#7a6a9a', '#ffffff'], // white
    ['#b48cff', '#3d2470', '#efe5ff'], // violet
  ];

  function makeGrass() {
    grass = [];
    const n = Math.max(3, Math.round(W / (150 * S)));
    for (let i = 0; i < n; i++) {
      const cx = ((i + rand(0.2, 0.8)) / n) * W, w = rand(26, 70) * S;
      const blades = [];
      for (let b = 0, m = Math.round(w / (4 * S)); b < m; b++) {
        blades.push({ x: cx - w / 2 + rand(0, w), h: rand(5, 14) * S, lean: rand(-4, 4) * S, ph: rand(0, TAU), dark: Math.random() < 0.5, front: Math.random() < 0.22 });
      }
      grass.push({ x: cx, w, blades });
    }
  }
  const spotFree = (x, gap) => flowers.every(f => Math.abs(f.x - x) > gap) && planted.every(c => Math.abs(c.x - x) > gap);
  function freeGroundSpot() { // somewhere in a grass patch, not crowding other plants
    for (let i = 0; i < 12; i++) {
      const p = pick(grass), x = clamp(p.x + rand(-p.w / 2, p.w / 2), 20 * S, W - 20 * S);
      if (spotFree(x, 26 * S)) return x;
    }
    return null;
  }
  function sproutFlower(inBloom = false) {
    const x = freeGroundSpot();
    if (x == null) return;
    const f = { x, ...pick(FLOWER_KINDS), h: rand(18, 34) * S, lean: rand(-0.12, 0.12), age: 0, growDur: rand(12, 18), bloomDur: rand(45, 75), wiltDur: rand(7, 10) };
    if (inBloom) f.age = f.growDur + rand(3, 20); // seeded already in bloom
    flowers.push(f);
  }
  function plantCarrot(ripe = 0) {
    const x = freeGroundSpot();
    if (x != null) planted.push({ x, ripe });
  }
  // a flower's state at its age: grow 0..1, open 0..1 (bloom), wilt 0..1
  function flowerState(f) {
    const bloomAge = f.age - f.growDur;
    return {
      grow: clamp(f.age / f.growDur, 0, 1),
      open: bloomAge > 0 ? clamp(bloomAge / 3, 0, 1) : 0,
      wilt: clamp((bloomAge - f.bloomDur) / f.wiltDur, 0, 1),
      dead: bloomAge > f.bloomDur + f.wiltDur,
    };
  }
  const blooming = f => { const s = flowerState(f); return s.open > 0.6 && s.wilt < 0.3; };
  function flowerHead(f) {
    const s = flowerState(f);
    const len = f.h * smooth(s.grow) * (1 - s.wilt * 0.25);
    const lean = f.lean + s.wilt * 0.7 + Math.sin(T * 1.3 + f.x) * 0.04;
    return { x: f.x + Math.sin(lean) * len, y: soil() - Math.cos(lean) * len, lean, s };
  }

  // ── The rabbit ──
  const r = {
    x: 0, y: 0, d: 0.6, face: 1,
    mode: 'rest', t: 0, until: 2, then: null, goal: null, afterChase: false,
    hops: 0, hopsInRow: 0, hopT: 0, hopFrom: 0, hopTo: 0, pause: 0, crouch: 0, chaseX: null, entering: false,
    hopDur: 0.4, hopH: 11, binky: false, twist: 0, tilt: 0,
    air: 0, squash: 0, rear: 0, headDown: 0, paw: 0, dig: 0, chew: 0, shake: 0,
    flat: 0, stretch: 0, roll: 0, eyesShut: false,
    earA: -0.45, earB: -0.2, earAT: -0.45, earBT: -0.2,
    lookX: 0, lookY: 0, lookTX: 0, lookTY: 0, blink: 0, nose: 0, noseRate: 8,
    act: null, actT: 0,
    blinkIn: 2, earIn: 1, glanceIn: 1.5, zIn: 0, jumpIn: 0,
    focus: null, focusT: 0, chaseLeft: 0,
    vx: 0, vy: 0, swing: 0, kick: 0, // held / falling
  };
  // seconds until each bigger behaviour may happen again
  const cool = { chase: rand(6, 14), sleep: rand(45, 80), flop: rand(12, 25), binky: rand(8, 20), smell: rand(5, 12), avoid: 0, plant: rand(4, 10), bug: rand(3, 8) };
  let carrot = null; // the one being dug up or eaten: { x, len, state: 'buried' | 'mouth', out }
  const pointer = { x: -1e3, y: -1e3, inside: false };
  let held = null;

  const setMode = (m, until = 0) => { r.mode = m; r.t = 0; r.until = until; };
  const mouthX = () => r.x + r.face * 28 * S;
  const headPos = () => ({ x: r.x + r.face * 18 * S, y: r.y - 28 * S });
  // which way to go: a coin toss weighted toward the roomier side, so it uses the whole floor
  const roomyDir = () => (Math.random() < 0.5 - 0.42 * ((r.x - W / 2) / (W / 2)) ? 1 : -1);

  function rest(min = 2, max = 5) { setMode('rest', rand(min, max)); r.act = null; r.actT = rand(0.6, 1.6); }

  function startHops(n, dir, toX = null, kind = 'hop') {
    r.hops = n; r.pause = 0; r.face = dir; r.chaseX = toX;
    r.binky = kind === 'binky';
    r.hopDur = r.binky ? 0.7 : 0.4;
    r.hopH = r.binky ? 34 : 11;
    setMode('hop');
    nextHop();
  }
  function nextHop() {
    const m = margin();
    let dist = (r.binky ? rand(18, 30) : rand(16, 28)) * S;
    if (r.chaseX != null) dist = Math.min(dist * 1.2, Math.abs(r.chaseX - r.x));
    let to = r.x + r.face * dist;
    if (!r.entering && (to < m || to > W - m)) { r.face *= -1; to = clamp(r.x + r.face * dist, m, W - m); }
    r.hopFrom = r.x; r.hopTo = to; r.hopT = 0; r.crouch = 0.08; // a little crouch before take-off
  }
  // Head for x, then do `then` on arrival. Long trips are walked in runs of MAX_HOPS with a
  // rest in between; the goal is remembered and picked up again after the rest.
  function goTo(x, then = null) {
    x = clamp(x, margin(), W - margin());
    if (Math.abs(x - r.x) < 6 * S) { r.goal = null; if (then) then(); else rest(); return; }
    r.goal = { x, then };
    r.then = then;
    startHops(Math.ceil(Math.abs(x - r.x) / (18 * S)) + 1, Math.sign(x - r.x), x);
  }
  function stroll() { // a walk across to somewhere well away from here
    const m = margin();
    let tx = rand(m, W - m);
    for (let i = 0; i < 5 && Math.abs(tx - r.x) < W * 0.3; i++) tx = rand(m, W - m);
    goTo(tx);
  }
  function eatLying(dir, c) {
    lying.splice(lying.indexOf(c), 1);
    carrot = { x: c.x, len: c.len, state: 'mouth', out: 1 };
    r.face = dir; setMode('eat');
  }
  const nearest = (list, within, ok = () => true) => list.reduce((best, c) => {
    const d = Math.abs(c.x - r.x);
    return ok(c) && d < within && (!best || d < Math.abs(best.x - r.x)) ? c : best;
  }, null);
  function freeSpot(x) { // for a dropped carrot: not right on top of another
    const m = margin(), gap = 40 * S;
    for (const off of [0, 1, -1, 2, -2, 3, -3]) {
      const tx = clamp(x + off * gap, m, W - m);
      if (lying.every(c => Math.abs(c.x - tx) >= gap)) return tx;
    }
    return clamp(x, m, W - m);
  }
  const butterflies = () => bugs.filter(b => b.type === 'fly' && b.state !== 'leave');

  function decide() {
    const chance = p => Math.random() < p;
    // food first: a dropped carrot nearby, then a ripe one in the ground it can see
    const drop = nearest(lying, 170 * S);
    if (drop) {
      const dir = Math.sign(drop.x - r.x) || r.face;
      goTo(drop.x - dir * 28 * S, () => (lying.includes(drop) ? eatLying(dir, drop) : rest(1, 2)));
      return;
    }
    const ripe = nearest(planted, VISION * S, c => c.ripe >= 1);
    if (ripe && chance(0.7)) {
      const dir = Math.sign(ripe.x - r.x) || r.face;
      goTo(ripe.x - dir * 28 * S, () => {
        if (!planted.includes(ripe)) { rest(1, 2); return; }
        r.face = dir; planted.splice(planted.indexOf(ripe), 1);
        carrot = { x: ripe.x, len: 1, state: 'buried', out: 0.15 };
        setMode('dig', rand(1.2, 1.8));
      });
      return;
    }
    if (r.goal && chance(0.85)) { goTo(r.goal.x, r.goal.then); return; } // carry on where it was going
    r.goal = null;
    const flies = butterflies();
    if (flies.length && cool.chase <= 0 && chance(0.5)) { startChase(flies); return; }
    if (cool.sleep <= 0 && chance(0.25)) { cool.sleep = rand(80, 150); setMode('sleep', rand(8, 15)); return; }
    if (cool.flop <= 0 && chance(0.25)) {
      cool.flop = rand(20, 40);
      if (chance(0.55)) setMode('sploot', rand(3, 6)); else setMode('roll', 0.95);
      return;
    }
    if (cool.binky <= 0 && chance(0.25)) { cool.binky = rand(15, 35); startHops(chance(0.6) ? 1 : 2, roomyDir(), null, 'binky'); return; }
    const flower = nearest(flowers, 150 * S, f => flowerState(f).open > 0.5);
    if (flower && cool.smell <= 0 && chance(0.35)) {
      cool.smell = rand(10, 20);
      const dir = Math.sign(flower.x - r.x) || r.face;
      goTo(flower.x - dir * 24 * S, () => { r.face = dir; setMode('smell', rand(1.5, 3)); });
      return;
    }
    const roll = Math.random();
    if (roll < 0.6) startHops(chance(0.6) ? 1 : 2, roomyDir());
    else if (roll < 0.8) stroll();
    else rest(1.5, 3.5);
  }
  function startChase(flies) {
    r.focus = flies.reduce((a, b) => (Math.abs(b.x - r.x) < Math.abs(a.x - r.x) ? b : a));
    r.focusT = rand(4, 7);
    r.chaseLeft = rand(8, 14);
    setMode('chase');
  }

  // ── Insects ──
  function spawnBug(type) {
    const fromLeft = Math.random() < 0.5;
    const b = {
      type, x: fromLeft ? -20 * S : W + 20 * S, y: soil() - rand(70, 160) * S, dir: fromLeft ? 1 : -1,
      state: 'seek', target: null, t: 0, age: 0, visits: 0, wantVisits: type === 'bee' ? Math.floor(rand(3, 7)) : Math.floor(rand(2, 5)),
      life: type === 'bee' ? rand(25, 40) : rand(30, 55), flap: rand(0, TAU), wx: 0, wy: 0, zig: 0,
    };
    if (type === 'fly') { b.wing = pick(WINGS); b.colors = pick(WING_COLORS); b.size = rand(0.9, 1.25); }
    bugs.push(b);
  }
  function chooseFlower(b) {
    const open = flowers.filter(f => blooming(f) && f !== b.target && !bugs.some(o => o !== b && o.target === f && o.state === 'sip'));
    return open.length ? pick(open) : null;
  }
  function moveBug(b, tx, ty, speed, dt) {
    const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy) || 1, stepLen = Math.min(d, speed * dt);
    b.x += (dx / d) * stepLen; b.y += (dy / d) * stepLen;
    if (Math.abs(dx) > 2) b.dir = Math.sign(dx);
    return d;
  }
  function wander(b, rise = 0) {
    b.state = 'wander'; b.t = 0; b.wanderFor = rand(1.5, 3.5);
    b.wx = clamp(b.x + rand(-220, 220) * S, 30 * S, W - 30 * S); b.wy = soil() - rand(60 + rise, 160 + rise) * S;
  }
  function stepBugs(dt, fleeing) {
    for (let i = bugs.length - 1; i >= 0; i--) {
      const b = bugs[i], bee = b.type === 'bee';
      b.t += dt; b.age += dt;
      b.flap += dt * (bee ? 60 : b.state === 'sip' ? 3 : 20);
      if (fleeing || (b.age > b.life && b.state !== 'sip')) b.state = 'leave';
      if (b.state === 'leave') {
        if (b.exitX == null) { b.exitX = b.x < W / 2 ? -60 * S : W + 60 * S; b.exitY = -40 * S; }
        moveBug(b, b.exitX, b.exitY, (bee ? 220 : 130) * S * (fleeing ? 2 : 1), dt);
        b.y += Math.sin(b.t * (bee ? 14 : 5)) * (bee ? 20 : 30) * S * dt;
        if (b.x < -50 * S || b.x > W + 50 * S || b.y < -30 * S) bugs.splice(i, 1);
        continue;
      }
      if (b.state === 'seek') {
        if (!b.target || !blooming(b.target)) b.target = chooseFlower(b);
        if (!b.target) { wander(b); continue; }
        const h = flowerHead(b.target), ty = h.y - (bee ? 10 : 3) * S;
        if (bee) { // straight darts with sharp little zig-zags
          b.zig -= dt;
          if (b.zig < 0) { b.zig = rand(0.18, 0.32); b.wx = rand(-22, 22) * S; b.wy = rand(-16, 16) * S; }
          const close = Math.hypot(h.x - b.x, ty - b.y) < 30 * S;
          const d = moveBug(b, h.x + (close ? 0 : b.wx), ty + (close ? 0 : b.wy), 150 * S, dt);
          if (d < 3 * S) { b.state = 'sip'; b.t = 0; b.sipFor = rand(1.5, 3); }
        } else { // a fluttery, bobbing drift
          const d = moveBug(b, h.x, ty, 70 * S, dt);
          b.y += Math.sin(b.t * 6) * 26 * S * dt;
          if (d < 4 * S) { b.state = 'sip'; b.t = 0; b.sipFor = rand(3, 7); }
        }
        continue;
      }
      if (b.state === 'sip') {
        if (!blooming(b.target)) { b.state = 'seek'; b.target = null; continue; }
        const h = flowerHead(b.target);
        if (bee) { b.x = h.x + Math.sin(b.t * 31) * 1.6 * S; b.y = h.y - 10 * S + Math.cos(b.t * 27) * 1.6 * S; } // hovering, not landing
        else { b.x = h.x; b.y = h.y - 3 * S; }
        if (b.t > b.sipFor) {
          b.visits++;
          if (b.visits >= b.wantVisits) { b.state = 'leave'; continue; }
          if (!bee && Math.random() < 0.3) wander(b);
          else { b.state = 'seek'; b.target = chooseFlower(b) || b.target; }
        }
        continue;
      }
      if (b.state === 'wander') {
        moveBug(b, b.wx, b.wy, (bee ? 120 : 60) * S, dt);
        b.y += Math.sin(b.t * (bee ? 12 : 5)) * (bee ? 16 : 30) * S * dt;
        if (b.t > b.wanderFor) { b.state = 'seek'; b.target = null; }
      }
    }
  }
  function startle(nearX, nearY, radius) { // butterflies sipping close by take off
    for (const b of bugs) if (b.type === 'fly' && b.state === 'sip' && Math.hypot(b.x - nearX, b.y - nearY) < radius) wander(b, 50);
  }

  // ── Update ──
  function fidgets(dt) {
    r.blinkIn -= dt;
    if (r.blinkIn < 0) { r.blink = 1; r.blinkIn = Math.random() < 0.2 ? 0.25 : rand(2, 5.5); } // sometimes a double blink
    r.blink = Math.max(0, r.blink - dt * 7);
    r.earIn -= dt;
    if (r.earIn < 0) { // ears twitch on their own
      r.earIn = rand(0.6, 2.8);
      const which = Math.random();
      if (which < 0.45) r.earA = r.earAT + rand(-0.5, 0.25);
      else if (which < 0.9) r.earB = r.earBT + rand(-0.45, 0.3);
      else { r.earA -= 0.4; r.earB -= 0.4; }
    }
    // eyes: on the butterfly it's after, else a nearby pointer, else glancing about
    r.glanceIn -= dt;
    const near = pointer.inside && Math.hypot(pointer.x - r.x, pointer.y - r.y) < 220 * S;
    const watch = r.mode === 'chase' && r.focus ? r.focus : null;
    if (watch) {
      r.lookTX = clamp((watch.x - r.x) * r.face / 50, -1, 1);
      r.lookTY = clamp((watch.y - (r.y - 30 * S)) / 50, -1, 1);
    } else if (near && r.mode !== 'held') {
      r.lookTX = clamp((pointer.x - r.x) * r.face / 60, -1, 1);
      r.lookTY = clamp((pointer.y - (r.y - 30 * S)) / 60, -1, 1);
    } else if (r.glanceIn < 0) {
      r.glanceIn = rand(0.8, 3);
      const bug = bugs.length && Math.random() < 0.5 ? pick(bugs) : null; // glances at passing insects
      if (bug) { r.lookTX = clamp((bug.x - r.x) * r.face / 50, -1, 1); r.lookTY = clamp((bug.y - (r.y - 30 * S)) / 50, -1, 1); }
      else [r.lookTX, r.lookTY] = Math.random() < 0.4 ? [0, 0] : [rand(-1, 1), rand(-0.8, 0.6)];
    }
    r.lookX = ease(r.lookX, r.lookTX, 10, dt);
    r.lookY = ease(r.lookY, r.lookTY, 10, dt);
    r.earA = ease(r.earA, r.earAT, 5, dt);
    r.earB = ease(r.earB, r.earBT, 5, dt);
    r.nose += dt * r.noseRate;
  }

  function stepMeadow(dt) {
    T += dt;
    for (const k in cool) cool[k] -= dt;
    // flowers age; new ones sprout in the grass
    for (let i = flowers.length - 1; i >= 0; i--) { flowers[i].age += dt; if (flowerState(flowers[i]).dead) flowers.splice(i, 1); }
    if (flowers.length < maxFlowers() && Math.random() < dt / 6) sproutFlower();
    // carrots ripen over about 50 s; a new one is planted every 20–35 s while there's room
    for (const c of planted) c.ripe = Math.min(1, c.ripe + dt / 50);
    if (planted.length < maxCarrots() && cool.plant <= 0) { plantCarrot(); cool.plant = rand(20, 35); }
    // insects come for the flowers (a lone butterfly sometimes passes even without any)
    const blooms = flowers.filter(blooming).length;
    const flies = bugs.filter(b => b.type === 'fly').length, bees = bugs.length - flies;
    if (cool.bug <= 0) {
      if (flies < Math.min(3, 1 + Math.floor(blooms / 2)) && Math.random() < (blooms ? 0.45 : 0.12)) spawnBug('fly');
      else if (blooms && bees < 2 && Math.random() < 0.3) spawnBug('bee');
      cool.bug = rand(4, 9);
    }
    stepBugs(dt, false);
    for (const z of zs) { z.t += dt; z.y -= 14 * S * dt; z.x += Math.sin(z.t * 2 + z.p) * 6 * S * dt; }
    while (zs.length && zs[0].t > 2.4) zs.shift();
  }

  function step(dt) {
    r.t += dt;
    stepMeadow(dt);
    fidgets(dt);
    r.squash = Math.max(0, r.squash - dt * 3);
    r.shake = Math.max(0, r.shake - dt * 1.8);
    let earsT = [-0.45, -0.2], headDown = 0, rear = 0, paw = 0, dig = 0, chew = 0, noseRate = 8, flat = 0, stretch = 0;
    r.eyesShut = false;
    if (r.mode !== 'roll') r.roll = 0; // never stay tipped over if something cut a roll short
    if (r.mode !== 'hop') { r.twist = 0; r.tilt = 0; }

    // a bee buzzing right at its face: ears back and hop away
    if (cool.avoid <= 0 && !['held', 'fall', 'land', 'hop', 'sleep', 'dig', 'pull', 'eat'].includes(r.mode)) {
      const hp = headPos();
      const bee = bugs.find(b => b.type === 'bee' && Math.hypot(b.x - hp.x, b.y - hp.y) < 45 * S);
      if (bee) { cool.avoid = 5; r.earA = r.earB = -1.3; r.goal = null; r.then = null; r.afterChase = false; startHops(2, bee.x > r.x ? -1 : 1); }
    }

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
        if (r.crouch > 0) { r.crouch -= dt; r.squash = Math.max(r.squash, r.binky ? 0.35 : 0.18); earsT = [-0.6, -0.4]; break; }
        r.hopT += dt / r.hopDur;
        const k = Math.min(1, r.hopT);
        // a real arc: steady sideways speed, height a parabola, nose up going up and down coming down
        r.x = r.hopFrom + (r.hopTo - r.hopFrom) * k;
        r.air = 4 * k * (1 - k);
        r.y = groundY(r.d) - r.air * r.hopH * S;
        r.tilt = (r.binky ? -0.35 : -0.22) * (1 - 2 * k);
        r.twist = r.binky ? Math.sin(clamp((k - 0.25) / 0.5, 0, 1) * TAU) * 0.5 : 0; // the happy mid-air twist
        earsT = r.binky ? [-0.2 + Math.sin(k * 9) * 0.4, 0.1 - Math.sin(k * 9) * 0.4] : [-0.75 + r.air * 0.25, -0.5 + r.air * 0.25];
        if (r.binky && k > 0.4 && k < 0.6) startle(r.x, r.y - 30 * S, 60 * S);
        if (k >= 1) {
          r.air = 0; r.twist = 0; r.tilt = 0; r.squash = r.binky ? 0.5 : 0.28;
          r.hops -= 1; r.hopsInRow += 1;
          const arrived = r.chaseX != null && Math.abs(r.chaseX - r.x) < 6 * S;
          const tired = r.hopsInRow >= MAX_HOPS && !r.entering;
          if (r.hops > 0 && !arrived && !tired) { r.pause = rand(0.1, 0.25); nextHop(); break; }
          r.hopsInRow = 0; r.chaseX = null; r.entering = false; r.binky = false;
          const then = r.then; r.then = null;
          if (arrived) r.goal = null;
          if (then && arrived) { then(); break; }
          const c = lying.find(c => Math.abs(c.x - mouthX()) < 22 * S);
          if (c) eatLying(r.face, c);
          else if (r.afterChase) { r.afterChase = false; setMode('chase'); }
          else rest(tired ? 1.5 : 2, tired ? 3 : 5);
        }
        break;
      }
      case 'chase': { // following one butterfly, now and then switching to another
        r.y = groundY(r.d);
        r.chaseLeft -= dt; r.focusT -= dt;
        const flies = butterflies();
        if (!r.focus || r.focus.state === 'leave' || !bugs.includes(r.focus) || r.focusT < 0) {
          const others = flies.filter(b => b !== r.focus);
          r.focus = others.length ? pick(others) : flies.includes(r.focus) ? r.focus : null;
          r.focusT = rand(4, 7);
        }
        if (!r.focus || r.chaseLeft < 0) { r.focus = null; cool.chase = rand(15, 30); rest(1.5, 3); break; }
        const f = r.focus, dx = f.x - r.x, high = groundY(r.d) - f.y;
        if (Math.abs(dx) > 12 * S) r.face = Math.sign(dx);
        rear = clamp(high / (130 * S), 0.2, 1); earsT = [0.05, 0.2]; noseRate = 16;
        r.jumpIn -= dt;
        if (r.t < 0.5) break; // just looked up at it
        if (Math.abs(dx) > 70 * S) {
          r.afterChase = true;
          startHops(Math.min(3, Math.ceil(Math.abs(dx) / (22 * S))), Math.sign(dx), clamp(f.x - Math.sign(dx) * 30 * S, margin(), W - margin()));
        } else if (high < 90 * S && r.jumpIn < 0) {
          r.jumpIn = rand(1.4, 2.6); r.afterChase = true;
          startHops(1, Math.sign(dx) || r.face, null, 'binky');
        }
        break;
      }
      case 'smell': // nose to a flower
        r.y = groundY(r.d); headDown = 0.55; noseRate = 26; earsT = [-0.2, 0.05];
        if (r.t > r.until) rest(1, 2.5);
        break;
      case 'sleep': // lies flat, eyes shut, slow breaths, z's drifting up
        r.y = groundY(r.d);
        flat = 1; headDown = 0.35; earsT = [-1.3, -1.15]; noseRate = 1.5; r.eyesShut = true;
        r.zIn -= dt;
        if (r.zIn < 0) { r.zIn = 1.3; zs.push({ x: r.x + r.face * 22 * S, y: r.y - 34 * S, t: 0, p: Math.random() * TAU }); }
        if (r.t > r.until) setMode('stretch', 1.3);
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
        r.roll = smooth(k) * TAU;
        r.x = clamp(r.x + r.face * 50 * S * dt / r.until, margin(), W - margin());
        earsT = [-1, -0.8];
        if (k >= 1) { r.roll = 0; r.squash = 0.3; r.shake = 0.6; rest(1, 2); }
        break;
      }
      case 'dig': // paws scrabble at the leaves of a ripe carrot
        r.y = groundY(r.d);
        headDown = 1; dig = 1; noseRate = 22; earsT = [-0.3, -0.05];
        if (r.t > r.until) setMode('pull', 0.9);
        break;
      case 'pull': // lean back and tug it out
        r.y = groundY(r.d);
        headDown = 0.7 - (r.t / r.until) * 0.7; earsT = [-0.6, -0.35];
        carrot.out = 0.15 + (r.t / r.until) * 0.85;
        if (r.t > r.until) { carrot.state = 'mouth'; setMode('eat'); }
        break;
      case 'eat': // munch from the tip until it's gone
        r.y = groundY(r.d);
        chew = 1; noseRate = 18; earsT = [-0.55, -0.3];
        carrot.len -= dt / 5.5;
        if (carrot.len <= 0) { carrot = null; rest(1.5, 3); }
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
        if (r.t > r.until && (!r.act || r.act === 'loaf')) decide();
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
  // Rabbit shapes: ['c', x, y, r] circle or ['e', x, y, rx, ry, rot] ellipse. An outline pass
  // then a fill pass, so overlapping parts read as one soft silhouette.
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
  function drawPlanted(c) { // a growing carrot: leaves fill out, the orange shoulder shows as it ripens
    const y = soil(), k = c.ripe, n = k < 0.3 ? 2 : k < 0.7 ? 3 : 5, L = (4 + 11 * k) * S;
    g.fillStyle = k >= 1 ? '#4caf50' : '#5fae6a';
    for (let i = 0; i < n; i++) {
      const a = (i / (n - 1 || 1) - 0.5) * 1.1 + Math.sin(T * 1.6 + c.x + i) * 0.05;
      g.beginPath(); g.ellipse(c.x + Math.sin(a) * L * 0.5, y - Math.cos(a) * L * 0.5, 1.6 * S, L * 0.55, a, 0, TAU); g.fill();
    }
    if (k > 0.6) { g.fillStyle = '#ff8a2a'; g.beginPath(); g.ellipse(c.x, y, 4.5 * S * k, 2.6 * S * k, 0, Math.PI, TAU); g.fill(); }
  }

  function drawGrass(front) {
    const y = soil() + 2 * S;
    for (const p of grass) {
      for (const b of p.blades) {
        if (b.front !== front) continue;
        const sway = Math.sin(T * 1.4 + b.ph) * 1.4 * S;
        g.fillStyle = b.dark ? '#2f6b45' : '#4f9a5c';
        g.beginPath();
        g.moveTo(b.x - 1.5 * S, y);
        g.quadraticCurveTo(b.x + b.lean * 0.4 + sway * 0.5, y - b.h * 0.6, b.x + b.lean + sway, y - b.h);
        g.quadraticCurveTo(b.x + b.lean * 0.4 + sway * 0.5 + 0.6 * S, y - b.h * 0.6, b.x + 1.5 * S, y);
        g.fill();
      }
    }
  }

  function drawFlower(f) {
    const h = flowerHead(f), s = h.s;
    if (s.grow <= 0) return;
    const base = soil();
    // stem and a pair of leaves
    g.strokeStyle = s.wilt > 0.5 ? '#7a8a4a' : '#3f8a52'; g.lineWidth = 1.6 * S; g.lineCap = 'round';
    g.beginPath(); g.moveTo(f.x, base); g.quadraticCurveTo(f.x, base - (base - h.y) * 0.5, h.x, h.y); g.stroke();
    if (s.grow > 0.35) {
      g.fillStyle = '#4f9a5c';
      const ly = base - (base - h.y) * 0.35, lk = Math.min(1, (s.grow - 0.35) / 0.4);
      g.beginPath(); g.ellipse(f.x - 4 * S * lk, ly, 4.5 * S * lk, 1.6 * S, -0.5, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(f.x + 4 * S * lk, ly - 4 * S, 4.5 * S * lk, 1.6 * S, 0.5, 0, TAU); g.fill();
    }
    g.save(); g.translate(h.x, h.y); g.rotate(h.lean * 1.6); g.scale(S, S);
    if (s.open <= 0) { // a bud
      if (s.grow > 0.6) { const b = (s.grow - 0.6) / 0.4; g.fillStyle = '#5fae6a'; g.beginPath(); g.ellipse(0, -2 * b, 2.2 * b, 3.2 * b, 0, 0, TAU); g.fill(); }
      g.restore(); return;
    }
    const o = s.open, [c1, c2] = f.colors;
    g.globalAlpha = 1 - s.wilt * 0.6;
    if (f.kind === 'daisy') {
      g.fillStyle = c1;
      for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; g.beginPath(); g.ellipse(Math.cos(a) * 4 * o, Math.sin(a) * 4 * o - 1, 1.7 * o + 0.4, 3.6 * o, a + Math.PI / 2, 0, TAU); g.fill(); }
      g.fillStyle = c2; g.beginPath(); g.arc(0, -1, 2.4, 0, TAU); g.fill();
    } else if (f.kind === 'star') {
      g.fillStyle = c1;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU - Math.PI / 2;
        g.beginPath(); g.moveTo(0, -1);
        g.quadraticCurveTo(Math.cos(a - 0.5) * 4 * o, Math.sin(a - 0.5) * 4 * o - 1, Math.cos(a) * 7 * o, Math.sin(a) * 7 * o - 1);
        g.quadraticCurveTo(Math.cos(a + 0.5) * 4 * o, Math.sin(a + 0.5) * 4 * o - 1, 0, -1); g.fill();
      }
      g.fillStyle = c2; g.beginPath(); g.arc(0, -1, 1.8, 0, TAU); g.fill();
    } else if (f.kind === 'tulip') {
      const sp = 1.5 * o;
      g.fillStyle = c2; g.beginPath(); g.ellipse(-2 - sp, -4, 2.8, 5, -0.25 - o * 0.25, 0, TAU); g.fill(); g.beginPath(); g.ellipse(2 + sp, -4, 2.8, 5, 0.25 + o * 0.25, 0, TAU); g.fill();
      g.fillStyle = c1; g.beginPath(); g.ellipse(0, -4, 3.2, 5.6, 0, 0, TAU); g.fill();
    } else { // bell, hanging from the stem tip
      g.fillStyle = c1;
      g.beginPath(); g.moveTo(-1.5, 0); g.quadraticCurveTo(-4.5 - o, 5, -4 - o * 1.6, 8); g.lineTo(4 + o * 1.6, 8); g.quadraticCurveTo(4.5 + o, 5, 1.5, 0); g.closePath(); g.fill();
      g.fillStyle = c2; g.beginPath(); g.ellipse(0, 8, 4 + o * 1.6, 1.2, 0, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    g.restore();
  }

  function drawButterfly(b) {
    const sipping = b.state === 'sip';
    const open = sipping ? 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(b.flap)) : 0.2 + 0.8 * Math.abs(Math.sin(b.flap));
    const [c1, c2, c3] = b.colors;
    g.save(); g.translate(b.x, b.y); g.scale(S * 1.3 * b.size, S * 1.3 * b.size);
    g.rotate(sipping ? 0 : Math.sin(b.t * 3) * 0.2);
    g.strokeStyle = 'rgba(40, 20, 70, .45)'; g.lineWidth = 0.8;
    for (const side of [-1, 1]) {
      g.save(); g.scale(side * open, 1);
      g.fillStyle = c1;
      g.beginPath();
      if (b.wing === 'round') g.ellipse(6, -4, 7, 5.5, -0.5, 0, TAU);
      else { g.moveTo(0, -1); g.quadraticCurveTo(5, -10, 14, -8); g.quadraticCurveTo(10, -2, 1, 1); g.closePath(); } // pointed forewing, swept out
      g.fill(); g.stroke();
      g.beginPath();
      if (b.wing === 'swallow') { g.moveTo(0, 1); g.quadraticCurveTo(9, 3, 7, 8); g.lineTo(9, 15); g.lineTo(4.5, 9); g.quadraticCurveTo(1.5, 7, 0, 2); g.closePath(); } // tailed hindwing
      else if (b.wing === 'pointy') { g.moveTo(0, 1); g.quadraticCurveTo(8, 3, 7, 9); g.quadraticCurveTo(3, 8, 0, 2); g.closePath(); }
      else g.ellipse(5, 4, 4.5, 3.5, 0.5, 0, TAU);
      g.fillStyle = c3; g.fill(); g.stroke();
      g.fillStyle = c2; g.beginPath(); g.arc(b.wing === 'round' ? 7 : 9, b.wing === 'round' ? -5 : -6, 1.4, 0, TAU); g.fill(); // wing spot
      g.restore();
    }
    g.fillStyle = '#2a1840'; g.beginPath(); g.ellipse(0, 0, 1.3, 5, 0, 0, TAU); g.fill();
    g.strokeStyle = '#2a1840'; g.lineWidth = 0.7;
    g.beginPath(); g.moveTo(0, -4); g.quadraticCurveTo(-2, -9, -4, -10); g.moveTo(0, -4); g.quadraticCurveTo(2, -9, 4, -10); g.stroke();
    g.restore();
  }
  function drawBee(b) {
    g.save(); g.translate(b.x, b.y); g.scale(S * 1.2 * b.dir, S * 1.2);
    g.rotate(Math.sin(b.t * 9) * 0.12);
    const w = 0.4 + 0.6 * Math.abs(Math.sin(b.flap)); // wings: a fast blur
    g.fillStyle = 'rgba(230, 245, 255, .7)';
    g.beginPath(); g.ellipse(-1, -4.5 * w - 1, 2.6, 4.5 * w, -0.4, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(1.5, -4 * w - 1, 2.2, 4 * w, 0.3, 0, TAU); g.fill();
    g.fillStyle = '#ffcc33'; g.beginPath(); g.ellipse(0, 0, 5, 3.4, 0, 0, TAU); g.fill();
    g.fillStyle = '#2a1840';
    g.beginPath(); g.rect(-2.2, -3.3, 1.4, 6.6); g.fill(); g.beginPath(); g.rect(0.6, -3.3, 1.4, 6.6); g.fill();
    g.beginPath(); g.arc(5, -0.5, 2.1, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(-5, 0); g.lineTo(-7, 0.6); g.lineTo(-5, 1.2); g.fill(); // sting
    g.restore();
  }

  function drawGround() {
    const air = r.air, rear = r.rear, hd = r.headDown, f = r.flat, st = r.stretch;
    const breath = r.mode === 'sleep' ? Math.sin(r.t * 2.2) * 0.6 : 0;
    // in the air the hind legs push out behind and the front paws reach forward
    const backFoot = -6 - air * 9 - f * 9;
    let pawX = 13 + air * 6 + f * 6 + st * 9, pawY = -3 - air * 2;
    if (r.dig > 0.01) { pawX = 14 + Math.sin(r.t * 22) * 4 * r.dig; pawY = -3 - Math.abs(Math.cos(r.t * 22)) * 2 * r.dig; }
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
      ['e', backFoot, -2 - air * 2, 9 + f * 2 + air * 2, 3.4, air * 0.25],
      ['c', -22 - f * 4, -17 + f * 7, 5.5],
      ear(baseFar, r.earA + ang),
      ['c', -8 - f * 2, -14 + f * 5, 12.5 - f * 1.5],
      ['e', body[0], body[1], 18 + f * 5 + st * 3 + air * 2, 13 - f * 3 + breath - air, ang],
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

    drawGrass(false);
    for (const f of flowers) drawFlower(f);
    for (const c of planted) drawPlanted(c);

    const feetY = heldish ? r.y + HANG * S : r.y;
    const lift = clamp((gy - feetY) / (140 * S), 0, 1);
    g.fillStyle = `rgba(0, 0, 0, ${0.3 * (1 - lift * 0.7)})`;
    g.beginPath(); g.ellipse(r.x, gy + 1, (22 + r.flat * 6) * sc * (1 - lift * 0.5), 4.5 * sc * (1 - lift * 0.5), 0, 0, TAU); g.fill();

    for (const c of lying) drawCarrot(c.x, gy - 4 * S, c.tilt, c.len, S);
    if (carrot?.state === 'buried') { // being pulled: upright, clipped at the ground line
      g.save(); g.beginPath(); g.rect(0, 0, W, soil()); g.clip();
      drawCarrot(carrot.x, soil() - (carrot.out * 30 + 4) * S, Math.PI / 2, 1, S);
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
      if (r.tilt) g.rotate(r.tilt);
      if (r.twist) { g.translate(0, -16); g.rotate(r.twist); g.translate(0, 16); }
      if (r.roll) { // roll over around the middle of the body, lifted so it stays on the ground
        g.translate(0, -16 - Math.sin(r.roll / 2) * 6); g.rotate(r.roll); g.translate(0, 16);
      }
      if (r.shake) g.rotate(Math.sin(r.shake * 40) * 0.08 * r.shake);
      const mouth = drawGround();
      if (carrot?.state === 'mouth') drawCarrot(mouth[0] + 30 * carrot.len + 2, mouth[1] + 1, Math.PI + 0.12, carrot.len, 1);
    }
    g.restore();

    drawGrass(true); // a few blades in front, so the rabbit sits in the grass

    if (zs.length) { // z's over a sleeping rabbit
      g.save(); g.textAlign = 'center';
      for (const z of zs) {
        g.fillStyle = `rgba(255, 255, 255, ${0.85 * Math.max(0, 1 - z.t / 2.4)})`;
        g.font = `700 ${Math.round((9 + z.t * 3) * S)}px "Be Vietnam Pro", system-ui, sans-serif`;
        g.fillText('z', z.x, z.y);
      }
      g.restore();
    }
    for (const b of bugs) (b.type === 'bee' ? drawBee : drawButterfly)(b);
  }

  // ── Pointer: grab, carry, drop (site only) ──
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
    if (carrot) { // the carrot it was busy with stays behind on the ground
      lying.push({ x: freeSpot(mouthX()), tilt: rand(-0.15, 0.15), len: Math.max(carrot.len, 0.2) });
      carrot = null;
    }
    startle(r.x, r.y - 30 * S, 200 * S);
    zs.length = 0;
    held = { lastX: p.x, lastY: p.y, vx: 0, vy: 0 };
    Object.assign(r, {
      air: 0, squash: 0, swing: 0, shake: 0, rear: 0, headDown: 0, paw: 0, dig: 0, chew: 0, flat: 0, stretch: 0,
      roll: 0, twist: 0, tilt: 0, binky: false, act: null, chaseX: null, then: null, goal: null, focus: null, afterChase: false, hopsInRow: 0,
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

  // ── Loop ──
  // Runs while active. When it stops being active (the slideshow pauses) the ground freezes
  // but the loop keeps going just long enough for the insects to fly off.
  let running = false, fleeing = false, last = 0;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (fleeing) {
      stepBugs(dt, true);
      if (!bugs.length) { fleeing = false; running = false; render(); return; }
    } else step(dt);
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
    if (still) return;
    fleeing = false;
    if (running) return;
    if (opt.enter && !entered) enterStage();
    running = true; last = performance.now(); requestAnimationFrame(frame);
  }
  function stop() {
    if (!running) return;
    if (bugs.length) fleeing = true; // let them fly off first
    else running = false;
  }
  if (opt.active) {
    const check = () => (opt.active() ? start() : stop());
    new MutationObserver(check).observe(opt.watch || box, { attributes: true, attributeFilter: ['class'] });
    check();
  } else new IntersectionObserver(([e]) => { if (e.isIntersecting) start(); else running = false; }).observe(box);
  let lastW = 0;
  const fitBox = () => {
    size();
    if (Math.abs(W - lastW) > 40) { lastW = W; makeGrass(); }
    if (!r.entering) r.x = clamp(r.x || W * 0.25, margin(), W - margin());
    if (r.mode !== 'held' && r.mode !== 'fall') r.y = groundY(r.d);
    for (const c of [...lying, ...flowers, ...planted]) c.x = clamp(c.x, 20 * S, W - 20 * S);
    render();
  };
  new ResizeObserver(fitBox).observe(box);
  addEventListener('resize', fitBox); // a scaled stage changes size without the box resizing

  size(); lastW = W; makeGrass();
  // the meadow starts lived-in: a couple of flowers out, one coming up, a carrot on its way
  for (let i = 0; i < Math.min(2, maxFlowers()); i++) sproutFlower(true);
  sproutFlower();
  plantCarrot(rand(0.3, 0.7));
  r.x = clamp(W * 0.25, margin(), W - margin()); r.y = groundY(r.d);
  rest(1, 2);
  render();
  if (still && interactive) { // reduced motion: it sits quietly, but can still be picked up and put down
    addEventListener('pointermove', () => { if (r.mode === 'held') { r.x = clamp(pointer.x, 0, W); r.y = clamp(pointer.y, 0, groundY(r.d) - HANG * S); render(); } });
    addEventListener('pointerup', () => { r.mode = 'rest'; r.y = groundY(r.d); r.x = clamp(r.x, margin(), W - margin()); render(); });
  }

  // a handle for poking at the meadow from the console
  return {
    r, bugs, flowers, planted,
    force(what) {
      ({
        fly: () => spawnBug('fly'), bee: () => spawnBug('bee'), flower: () => sproutFlower(true), carrot: () => plantCarrot(1),
        sleep: () => setMode('sleep', 8), sploot: () => setMode('sploot', 4), roll: () => setMode('roll', 0.95),
        binky: () => startHops(1, roomyDir(), null, 'binky'), stroll, chase: () => butterflies().length && startChase(butterflies()),
      })[what]?.();
    },
  };
};

window.siteRabbit = mountRabbit(document.querySelector('.member'));
