// Thỏ ngọc's meadow: a jade rabbit living along the bottom of a box (the membership box on the
// site, and, look-only, the bottom of the slideshow, where it hops in from the side the first
// time the show plays).
//
// The rabbit rests and fidgets (blinks, glances, ear twitches, grooming, sniffing, standing up
// to look around), hops in short runs (never more than MAX_HOPS before a rest) leaning toward
// open space, strolls to far spots, digs up carrots and eats them, naps, sploots, binkies,
// chases butterflies (one at a time, switching now and then) and backs away from bees. On the
// site you can pick it up by the scruff.
//
// A friend rabbit (smaller, cream with brown ears) can visit: it hops in, the two touch noses,
// stay near each other, play follow-the-leader, groom each other or sploot side by side, may
// share a carrot from both ends, and after a while the friend hops off again.
//
// The ecosystem parts can be switched on as the show runs longer (docs/meadow-plan.html, and
// PHASES in slides.js): grass that grows in, flowers with a life cycle, carrots that grow in
// the ground and ripen, butterflies that visit flowers, and bees. With them off the rabbit
// digs up carrots wherever it is and plays with the odd butterfly.
//
// In the slideshow the rabbit comes and goes on a schedule (see slides.js); while it's away
// the friend goes home, the insects fly off and the ground rests.
//
// mountRabbit(box, { scale(W), active(), watch, manual, interactive, enter, features, tune }):
//   scale    rabbit size for a box this wide (default: 1, or 1.25 on wide boxes)
//   active   when given, the meadow only runs while this returns true (re-checked when the
//            class of opt.watch, default the box, changes); otherwise while on screen
//   manual   true: out of sight until show(true); show(false) sends it off stage again
//   interactive  false for rabbits you can only watch
//   enter    true: stay out of sight until the first start, then hop in from a side
//   features { grass, flowers, growCarrots, bees }: ecosystem parts to switch on (all off)
//   tune     how busy it gets; see `tune` below
// Returns a handle with configure({ features, tune }), show(on) and console helpers.
window.mountRabbit = (box, opt = {}) => {
  if (!box) return;
  const interactive = opt.interactive !== false;
  const F = { grass: false, flowers: false, growCarrots: false, bees: false, ...opt.features };
  // How busy it gets; the slideshow raises these over play time (PHASES in slides.js).
  //   flies: most butterflies at once · flyChance: odds one turns up per check (every 4–9 s)
  //   binky: allowed · flowers / bees / carrots: most at once (also capped by the box's width)
  //   friend: a friend rabbit visits · friendEvery: seconds between visits · friendStay: visit length
  //   share: the two rabbits may share a carrot
  //   ambient: with the rabbit away, now and then a butterfly or a bee drifts through
  const tune = {
    flies: 1, flyChance: 0.1, binky: true, flowers: 8, bees: 2, carrots: 3,
    friend: false, friendEvery: [540, 720], friendStay: [60, 110], share: false, ambient: false, ...opt.tune,
  };
  let grassGrow = F.grass ? 1 : 0; // grass rises out of the soil over a couple of minutes when switched on
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
  const chance = p => Math.random() < p;

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
  const MAX_HOPS = 6; // hops in a row before a rest
  const VISION = 260; // how far (× S) a rabbit notices a ripe carrot

  // ── The meadow ──
  let T = 0; // meadow time; stands still while paused
  let grass = [];
  const flowers = []; // { x, kind, colors, h, lean, age, growDur, bloomDur, wiltDur }
  const planted = []; // carrots in the ground: { x, ripe 0..1 }
  const lying = []; // carrots dropped after a grab (site): { x, len, tilt }
  const bugs = []; // butterflies and bees
  const zs = []; // floating z's over sleeping rabbits
  const worldCool = { plant: rand(4, 10), bug: rand(3, 8), friend: rand(30, 60) };
  const maxFlowers = () => Math.min(tune.flowers, clamp(Math.round(W / (230 * S)), 2, 8));
  const maxCarrots = () => Math.min(tune.carrots, clamp(Math.round(W / (500 * S)), 1, 3));
  const MAX_LYING = 5;
  const FLOWER_KINDS = [
    { kind: 'daisy', colors: ['#fffaf0', '#ffd34d'] },
    { kind: 'daisy', colors: ['#ffc2d4', '#ffd34d'] },
    { kind: 'star', colors: ['#ffd34d', '#ff8a2a'] },
    { kind: 'tulip', colors: ['#ff5a6e', '#ff9dbb'] },
    { kind: 'bell', colors: ['#b48cff', '#e0ccff'] },
  ];
  const WINGS = ['round']; // 'pointy' and 'swallow' are drawn too, but round ones look best
  const WING_COLORS = [
    ['#ff9a3c', '#3a1f10', '#ffd9a8'], // monarch-ish orange
    ['#7cc6ff', '#1d3d73', '#e6f5ff'], // blue
    ['#ffd34d', '#8a5a00', '#fff3c4'], // yellow
    ['#ff9dbb', '#a8335c', '#ffe3ec'], // pink
    ['#fff6e8', '#7a6a9a', '#ffffff'], // white
    ['#b48cff', '#3d2470', '#efe5ff'], // violet
  ];
  const LOOKS = {
    jade: { fur: '#fdfbff', shade: 'rgba(150, 130, 190, .14)', inner: '#ffb3c7', ears: null, spot: null, scale: 1 },
    friend: { fur: '#f3eadf', shade: 'rgba(150, 110, 80, .16)', inner: '#f2a7b8', ears: '#b98a62', spot: '#c99a72', scale: 0.86 },
  };

  function makeGrass() {
    grass = [];
    const n = Math.max(3, Math.round(W / (150 * S)));
    for (let i = 0; i < n; i++) {
      const cx = ((i + rand(0.2, 0.8)) / n) * W, w = rand(26, 70) * S;
      const blades = [];
      for (let b = 0, m = Math.round(w / (4 * S)); b < m; b++) {
        blades.push({ x: cx - w / 2 + rand(0, w), h: rand(5, 14) * S, lean: rand(-4, 4) * S, ph: rand(0, TAU), dark: chance(0.5), front: chance(0.22) });
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
    if (inBloom) f.age = f.growDur + rand(3, 20);
    flowers.push(f);
  }
  function plantCarrot(ripe = 0) {
    const x = freeGroundSpot();
    if (x != null) planted.push({ x, ripe });
  }
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
  function freeSpot(x) { // for a dropped carrot: not right on top of another
    const m = margin(), gap = 40 * S;
    for (const off of [0, 1, -1, 2, -2, 3, -3]) {
      const tx = clamp(x + off * gap, m, W - m);
      if (lying.every(c => Math.abs(c.x - tx) >= gap)) return tx;
    }
    return clamp(x, m, W - m);
  }

  // ── Insects ──
  const butterflies = () => bugs.filter(b => b.type === 'fly' && b.state !== 'leave');
  function spawnBug(type) {
    const fromLeft = chance(0.5);
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
    const around = flowers.length ? b.x : main.gone ? rand(W * 0.2, W * 0.8) : main.r.x; // with no flowers about, it flits around the rabbit
    b.wx = clamp(around + rand(-220, 220) * S, 30 * S, W - 30 * S); b.wy = soil() - rand(60 + rise, 160 + rise) * S;
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
          if (!bee && chance(0.3)) wander(b);
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

  // ── Drawing helpers shared by the scene ──
  function drawCarrot(x, y, ang, len, sc, leaves = true) {
    // origin at the leafy end (or the broken end of a snapped-off piece), root along +x
    const L = 30 * len, w = 5.2;
    g.save(); g.translate(x, y); g.rotate(ang); g.scale(sc, sc);
    g.fillStyle = '#3f9a4a';
    if (leaves) for (const a of [-0.5, 0, 0.5]) { g.beginPath(); g.ellipse(-6 * Math.cos(a), -6 * Math.sin(a), 7, 2.4, a, 0, TAU); g.fill(); }
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
      if (!leaves) { g.fillStyle = '#ffd08a'; g.beginPath(); g.ellipse(0, 0, 1.4, w, 0, 0, TAU); g.fill(); } // the snapped face
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
    if (!F.grass || grassGrow <= 0) return;
    const y = soil() + 2 * S;
    for (const p of grass) {
      for (const b of p.blades) {
        if (b.front !== front) continue;
        const sway = Math.sin(T * 1.4 + b.ph) * 1.4 * S;
        const h = b.h * smooth(clamp(grassGrow * 1.6 - (b.ph / TAU) * 0.6, 0, 1)); // blades come up a few at a time
        g.fillStyle = b.dark ? '#2f6b45' : '#4f9a5c';
        g.beginPath();
        g.moveTo(b.x - 1.5 * S, y);
        g.quadraticCurveTo(b.x + b.lean * 0.4 + sway * 0.5, y - h * 0.6, b.x + b.lean + sway, y - h);
        g.quadraticCurveTo(b.x + b.lean * 0.4 + sway * 0.5 + 0.6 * S, y - h * 0.6, b.x + 1.5 * S, y);
        g.fill();
      }
    }
  }
  function drawFlower(f) {
    const h = flowerHead(f), s = h.s;
    if (s.grow <= 0) return;
    const base = soil();
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
      else { g.moveTo(0, -1); g.quadraticCurveTo(5, -10, 14, -8); g.quadraticCurveTo(10, -2, 1, 1); g.closePath(); } // pointed forewing
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

  // ── A rabbit ──
  const pointer = { x: -1e3, y: -1e3, inside: false };
  let main = null, friend = null;

  // ear poses when facing the room: [left, right] tilt. Upright V, side by side (just touching), wide, one out, one flopped.
  // Left never tilts past 0 and right never below 0, so the ears can touch but never cross.
  const FRONT_EARS = [[-0.16, 0.16], [-0.16, 0.16], [0, 0], [-0.04, 0.06], [-0.38, 0.36], [-0.12, 0.42], [-0.45, 0.1], [-0.75, 0.18], [-0.15, 0.7]];
  function Bunny(look, depth) {
    const me = {};
    const r = {
      x: 0, y: 0, d: depth, face: 1,
      mode: 'rest', t: 0, until: 2, then: null, goal: null, afterChase: false,
      hops: 0, hopsInRow: 0, hopT: 0, hopFrom: 0, hopTo: 0, pause: 0, crouch: 0, chaseX: null, entering: false,
      hopDur: 0.4, hopH: 11, binky: false, twist: 0, tilt: 0,
      air: 0, squash: 0, rear: 0, headDown: 0, paw: 0, dig: 0, chew: 0, shake: 0, flat: 0, stretch: 0, eyesShut: false,
      earA: -0.45, earB: -0.2, earAT: -0.45, earBT: -0.2,
      lookX: 0, lookY: 0, lookTX: 0, lookTY: 0, blink: 0, nose: 0, noseRate: 8,
      act: null, actT: 0, blinkIn: 2, earIn: 1, glanceIn: 1.5, zIn: 0, jumpIn: 0, toCam: 0,
      fe: [-0.16, 0.16], feT: [-0.16, 0.16], feIn: 0, // ear pose while facing the room
      focus: null, focusT: 0, chaseLeft: 0,
      greeted: false, visit: null, stayLeft: 0, shareWith: null, // the friend's visit
      vx: 0, vy: 0, swing: 0, kick: 0, // held / falling
    };
    // seconds until each bigger behaviour may happen again
    const cool = { carrot: rand(6, 12), chase: rand(6, 14), sleep: rand(45, 80), flop: rand(12, 25), binky: rand(8, 20), smell: rand(5, 12), avoid: 0, social: rand(3, 6) };
    let carrot = null; // the one being dug up or eaten: { x, len, state: 'buried' | 'mouth', out }
    let held = null;
    const sc = () => S * (0.9 + r.d * 0.1) * look.scale;
    const partner = () => (me === main ? friend : main);
    const setMode = (m, until = 0) => { r.mode = m; r.t = 0; r.until = until; };
    const mouthX = () => r.x + r.face * 28 * sc() / (0.9 + r.d * 0.1);
    const headPos = () => ({ x: r.x + r.face * 18 * S * look.scale, y: r.y - 28 * S * look.scale });
    // which way to go: weighted toward the roomier side so it uses the whole floor; with a
    // visitor around, toward each other when they've drifted apart
    function roomyDir() {
      const p = partner();
      if (p && r.greeted && Math.abs(p.r.x - r.x) > 160 * S && chance(0.7)) return Math.sign(p.r.x - r.x);
      return chance(0.5 - 0.42 * ((r.x - W / 2) / (W / 2))) ? 1 : -1;
    }
    const free = () => r.mode === 'rest' && r.act !== 'groom';
    // can drop what it's doing to come and share (not mid-meal, asleep, greeting or leaving)
    const available = () => r.visit !== 'leave' && !r.entering && !['held', 'fall', 'land', 'sleep', 'dig', 'pull', 'eat', 'share', 'greet', 'groomOther', 'enjoy'].includes(r.mode);
    function rest(min = 2, max = 5) {
      if (carrot) { if (carrot.state === 'mouth') { setMode('eat'); return; } carrot = null; } // never left holding a half-done carrot
      setMode('rest', rand(min, max)); r.act = null; r.actT = rand(0.6, 1.6);
    }

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
      let dist = (r.binky ? rand(18, 30) : rand(16, 28)) * S * look.scale;
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
    function stroll() {
      const m = margin();
      let tx = rand(m, W - m);
      for (let i = 0; i < 5 && Math.abs(tx - r.x) < W * 0.3; i++) tx = rand(m, W - m);
      goTo(tx);
    }
    function enterFrom(fromLeft, toX) { // hop in from just off one side
      r.x = fromLeft ? -50 * S : W + 50 * S;
      r.y = groundY(r.d); r.entering = true;
      startHops(99, fromLeft ? 1 : -1, toX);
    }
    function exit() { // hop off the nearest side (the friend going home)
      const dir = r.x < W / 2 ? -1 : 1;
      r.visit = 'leave'; r.entering = true; r.goal = null; r.then = null;
      startHops(99, dir, dir < 0 ? -60 * S : W + 60 * S);
    }
    function eatLying(dir, c) {
      lying.splice(lying.indexOf(c), 1);
      carrot = { x: c.x, len: c.len, state: 'mouth', out: 1 };
      r.face = dir; startEating();
    }
    function startEating() {
      setMode('eat');
      // with a friend about, it may come and nibble the other end
      const p = partner();
      if (tune.share && p && r.greeted && p.available() && Math.abs(p.r.x - r.x) < 320 * S && chance(0.65)) {
        p.r.then = null; p.r.goal = null; p.r.afterChase = false;
        p.r.shareWith = me;
        const side = r.face, spot = mouthX() + side * (30 * carrot.len + 30) * S;
        p.goTo(spot, () => { if (carrot && r.mode === 'eat') p.setMode('share'); else { p.r.shareWith = null; p.rest(1, 2); } });
      }
    }
    const nearest = (list, within, ok = () => true) => list.reduce((best, c) => {
      const d = Math.abs(c.x - r.x);
      return ok(c) && d < within && (!best || d < Math.abs(best.x - r.x)) ? c : best;
    }, null);

    // things to do together while a friend is visiting
    function play(p) {
      const side = Math.sign(p.r.x - r.x) || 1;
      const kind = pick(['follow', 'follow', 'groom', 'snuggle']);
      cool.social = rand(14, 24); p.cool.social = rand(10, 18);
      if (kind === 'follow') { // follow-the-leader: off it goes, the other hops after
        const dir = chance(0.5 - 0.42 * ((r.x - W / 2) / (W / 2))) ? 1 : -1;
        const tx = clamp(r.x + dir * rand(4, 6) * 22 * S, margin(), W - margin());
        goTo(tx);
        p.setMode('rest', 0.5); p.r.act = null;
        setTimeoutish(p, 0.5, () => p.goTo(tx - Math.sign(tx - r.x || 1) * 52 * S));
      } else if (kind === 'groom') { // hop up close and groom the other's head
        p.setMode('rest', 6); p.r.act = null;
        goTo(p.r.x - side * 36 * S, () => {
          r.face = side; setMode('groomOther', rand(2.5, 4));
          p.r.face = -side; p.setMode('enjoy', r.until + 0.5);
        });
      } else { // lie down side by side for a bit
        p.setMode('rest', 6); p.r.act = null;
        goTo(p.r.x - side * 44 * S, () => {
          const t = rand(5, 8);
          r.face = p.r.face = chance(0.5) ? 1 : -1;
          setMode('sploot', t); p.setMode('sploot', t + rand(-1, 1));
        });
      }
    }
    // a tiny scheduler so the follower starts a beat after the leader
    function setTimeoutish(b, secs, fn) { b.r.pending = { in: secs, fn }; }

    function decide() {
      const p = partner();
      r.shareWith = null; // whatever sharing it was heading for is over by now
      if (r.visit === 'leave') return;
      if (!wantOut) { exit(); return; } // time to go: it has finished what it was doing, so off it hops
      if (r.visit === 'stay' && r.greeted && r.stayLeft <= 0) { exit(); return; }
      // a visitor: first say hello, then stay close and sometimes play
      if (p && p.r.visit !== 'leave') {
        const dist = Math.abs(p.r.x - r.x);
        if (!r.greeted) {
          if (dist < 90 * S && p.free()) { greet(me, p); return; }
          // the visitor walks up to say hello; the host just carries on until it arrives
          if (me === friend) { const side = r.x < p.r.x ? -1 : 1; goTo(p.r.x + side * 52 * S); return; }
        } else if (dist > 300 * S && p.r.mode !== 'hop' && chance(0.6)) { // drifted apart: close the gap
          const side = r.x < p.r.x ? -1 : 1; goTo(p.r.x + side * rand(50, 90) * S); return;
        }
        if (cool.social <= 0 && p.free() && dist < 400 * S && chance(0.5)) { play(p); return; }
      }
      // food: a dropped carrot nearby, a ripe one in the ground it can see, or dig one up here
      const drop = nearest(lying, 170 * S);
      if (drop) {
        const dir = Math.sign(drop.x - r.x) || r.face;
        goTo(drop.x - dir * 28 * S, () => (lying.includes(drop) ? eatLying(dir, drop) : rest(1, 2)));
        return;
      }
      if (!F.growCarrots && !carrot && cool.carrot <= 0 && !firstVisit() && chance(0.22)) {
        carrot = { x: mouthX(), len: 1, state: 'buried', out: 0 };
        setMode('dig', rand(1.4, 2));
        return;
      }
      const ripe = F.growCarrots && !firstVisit() && nearest(planted, VISION * S, c => c.ripe >= 1);
      if (ripe && chance(0.7)) {
        const dir = Math.sign(ripe.x - r.x) || r.face;
        goTo(ripe.x - dir * 28 * S, () => {
          if (!planted.includes(ripe)) { rest(1, 2); return; }
          r.face = dir; planted.splice(planted.indexOf(ripe), 1);
          carrot = { x: ripe.x, len: 1, state: 'buried', out: 0.12 };
          setMode('dig', rand(1.2, 1.8));
        });
        return;
      }
      if (r.goal && chance(0.85)) { goTo(r.goal.x, r.goal.then); return; } // carry on where it was going
      r.goal = null;
      const flies = butterflies();
      if (flies.length && cool.chase <= 0 && chance(0.5)) { startChase(flies); return; }
      if (cool.sleep <= 0 && chance(0.25)) { cool.sleep = rand(80, 150); setMode('sleep', rand(8, 15)); return; }
      if (cool.flop <= 0 && chance(0.25)) { cool.flop = rand(20, 40); setMode('sploot', rand(3, 6)); return; }
      if (tune.binky && cool.binky <= 0 && chance(0.25)) { cool.binky = rand(15, 35); startHops(chance(0.6) ? 1 : 2, roomyDir(), null, 'binky'); return; }
      const flower = nearest(flowers, 150 * S, f => flowerState(f).open > 0.5);
      if (flower && cool.smell <= 0 && chance(0.35)) {
        cool.smell = rand(10, 20);
        const dir = Math.sign(flower.x - r.x) || r.face;
        goTo(flower.x - dir * 24 * S, () => { r.face = dir; setMode('smell', rand(1.5, 3)); });
        return;
      }
      const roll = Math.random();
      if (roll < 0.6) startHops(chance(0.6) ? 1 : 2, roomyDir());
      else if (roll < 0.8 && !p) stroll(); // with a friend over, it stays closer
      else rest(1.5, 3.5);
    }
    function startChase(flies) {
      r.focus = flies.reduce((a, b) => (Math.abs(b.x - r.x) < Math.abs(a.x - r.x) ? b : a));
      r.focusT = rand(4, 7);
      r.chaseLeft = rand(8, 14);
      setMode('chase');
    }

    function fidgets(dt) {
      r.blinkIn -= dt;
      if (r.blinkIn < 0) { r.blink = 1; r.blinkIn = chance(0.2) ? 0.25 : rand(2, 5.5); } // sometimes a double blink
      r.blink = Math.max(0, r.blink - dt * 7);
      r.earIn -= dt;
      if (r.earIn < 0) { // ears twitch on their own
        r.earIn = rand(0.6, 2.8);
        const which = Math.random();
        if (which < 0.45) r.earA = r.earAT + rand(-0.5, 0.25);
        else if (which < 0.9) r.earB = r.earBT + rand(-0.45, 0.3);
        else { r.earA -= 0.4; r.earB -= 0.4; }
      }
      // eyes: on the butterfly it's after, its friend, a nearby pointer, or glancing about
      r.glanceIn -= dt;
      const p = partner();
      const near = pointer.inside && Math.hypot(pointer.x - r.x, pointer.y - r.y) < 220 * S;
      const watch = r.mode === 'chase' && r.focus ? r.focus : ['greet', 'groomOther', 'share'].includes(r.mode) && p ? { x: p.r.x, y: p.r.y - 25 * S } : null;
      if (watch) {
        r.lookTX = clamp((watch.x - r.x) * r.face / 50, -1, 1);
        r.lookTY = clamp((watch.y - (r.y - 30 * S)) / 50, -1, 1);
      } else if (near && r.mode !== 'held') {
        r.lookTX = clamp((pointer.x - r.x) * r.face / 60, -1, 1);
        r.lookTY = clamp((pointer.y - (r.y - 30 * S)) / 60, -1, 1);
      } else if (r.glanceIn < 0) {
        r.glanceIn = rand(0.8, 3);
        const thing = p && chance(0.35) ? { x: p.r.x, y: p.r.y - 25 * S } : bugs.length && chance(0.5) ? pick(bugs) : null;
        if (thing) { r.lookTX = clamp((thing.x - r.x) * r.face / 50, -1, 1); r.lookTY = clamp((thing.y - (r.y - 30 * S)) / 50, -1, 1); }
        else if (r.act === 'audience') [r.lookTX, r.lookTY] = chance(0.6) ? [0, 0] : [rand(-0.7, 0.7), rand(-0.5, 0.4)]; // mostly straight at the room
        else [r.lookTX, r.lookTY] = chance(0.4) ? [0, 0] : [rand(-1, 1), rand(-0.8, 0.6)];
      }
      r.lookX = ease(r.lookX, r.lookTX, 10, dt);
      r.lookY = ease(r.lookY, r.lookTY, 10, dt);
      r.earA = ease(r.earA, r.earAT, 5, dt);
      r.earB = ease(r.earB, r.earBT, 5, dt);
      r.nose += dt * r.noseRate;
    }

    function step(dt) {
      r.t += dt;
      for (const k in cool) cool[k] -= dt;
      if (r.visit === 'stay' && r.greeted) r.stayLeft -= dt;
      if (r.pending) { r.pending.in -= dt; if (r.pending.in <= 0) { const fn = r.pending.fn; r.pending = null; fn(); } }
      fidgets(dt);
      r.squash = Math.max(0, r.squash - dt * 3);
      r.shake = Math.max(0, r.shake - dt * 1.8);
      let earsT = [-0.45, -0.2], headDown = 0, rear = 0, paw = 0, dig = 0, chew = 0, noseRate = 8, flat = 0, stretch = 0;
      r.eyesShut = false;
      if (r.mode !== 'hop') { r.twist = 0; r.tilt = 0; }

      // a bee buzzing right at its face: ears back and hop away
      if (cool.avoid <= 0 && !['held', 'fall', 'land', 'hop', 'sleep', 'dig', 'pull', 'eat', 'share', 'greet'].includes(r.mode)) {
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
          r.y = groundY(r.d) - r.air * r.hopH * S * look.scale;
          r.tilt = (r.binky ? -0.35 : -0.22) * (1 - 2 * k);
          r.twist = r.binky ? Math.sin(clamp((k - 0.25) / 0.5, 0, 1) * TAU) * 0.5 : 0; // the happy mid-air twist
          earsT = r.binky ? [-0.2 + Math.sin(k * 9) * 0.4, 0.1 - Math.sin(k * 9) * 0.4] : [-0.75 + r.air * 0.25, -0.5 + r.air * 0.25];
          if (r.binky && k > 0.4 && k < 0.6) startle(r.x, r.y - 30 * S, 60 * S);
          if (k >= 1) {
            r.air = 0; r.twist = 0; r.tilt = 0; r.squash = r.binky ? 0.5 : 0.28;
            r.hops -= 1; r.hopsInRow += 1;
            const arrived = r.chaseX != null && Math.abs(r.chaseX - r.x) < 6 * S;
            const tired = r.hopsInRow >= MAX_HOPS && !r.entering && !r.shareWith; // no rest stop on the way to a shared carrot
            if (r.hops > 0 && !arrived && !tired) { r.pause = rand(0.1, 0.25); nextHop(); break; }
            r.hopsInRow = 0; r.chaseX = null; r.entering = false; r.binky = false;
            if (r.visit === 'leave') { me.gone = r.x < -40 * S || r.x > W + 40 * S; if (!me.gone) exit(); break; }
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
        case 'greet': { // noses together, a little sniff
          r.y = groundY(r.d);
          const p = partner();
          if (p) { r.face = Math.sign(p.r.x - r.x) || r.face; r.x = ease(r.x, p.r.x - r.face * 50 * S, 3, dt); }
          headDown = 0.2; noseRate = 28; earsT = [-0.05, 0.12];
          if (r.t > r.until) rest(1, 2.5);
          break;
        }
        case 'groomOther': // licking the friend's head
          r.y = groundY(r.d);
          headDown = 0.35 + Math.sin(r.t * 8) * 0.12; paw = 0.3; noseRate = 20; earsT = [-0.4, -0.2];
          if (r.t > r.until) rest(1, 2.5);
          break;
        case 'enjoy': // being groomed: eyes shut, ears flat, very still
          r.y = groundY(r.d);
          flat = 0.35; r.eyesShut = true; earsT = [-1.2, -1.05]; noseRate = 3;
          if (r.t > r.until) rest(1, 2.5);
          break;
        case 'share': { // bites the far end of the other's carrot; a short tug, it snaps, each keeps a half
          r.y = groundY(r.d);
          const o = r.shareWith, c = o && o.carrot;
          if (!o || !c || o.r.mode !== 'eat' || c.len < 0.4) { r.shareWith = null; rest(1, 2.5); break; }
          r.face = -o.r.face;
          if (r.t < 0.3) { // lean in to the end (the carrot holds still during the tug, so nothing drifts)
            const far = o.mouthX() + o.r.face * (30 * c.len + 2) * o.sc();
            r.x = ease(r.x, far + o.r.face * 28 * sc() / (0.9 + r.d * 0.1), 10, dt);
          }
          headDown = 0.1 - Math.min(1, r.t / 0.9) * 0.25; earsT = [-0.35, -0.1]; noseRate = 24; // pulling back a touch
          if (r.t > 0.9) { // snap
            const half = c.len / 2;
            c.len = half; c.top = false; // the eater keeps the root half; its far end is now broken
            o.r.shake = r.shake = 0.5; o.r.squash = r.squash = 0.15;
            r.shareWith = null;
            carrot = { x: mouthX(), len: half, state: 'mouth', out: 1 }; // the leafy half, broken end in its mouth
            setMode('eat');
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
          headDown = -clamp(high / (160 * S), 0, 0.5); // chin up toward it (the eyes follow it in fidgets)
          r.jumpIn -= dt;
          if (r.t < 0.5) break; // just looked up at it
          if (Math.abs(dx) > 70 * S) {
            r.afterChase = true;
            startHops(Math.min(3, Math.ceil(Math.abs(dx) / (22 * S))), Math.sign(dx), clamp(f.x - Math.sign(dx) * 30 * S, margin(), W - margin()));
          } else if (tune.binky && high < 90 * S && r.jumpIn < 0) {
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
        case 'dig': // paws scrabble at the ground, the leaves show
          r.y = groundY(r.d);
          headDown = 1; dig = 1; noseRate = 22; earsT = [-0.3, -0.05];
          carrot.out = Math.max(carrot.out, Math.min(0.12, (r.t / r.until) * 0.12));
          if (r.t > r.until) setMode('pull', 0.9);
          break;
        case 'pull': // lean back and tug it out
          r.y = groundY(r.d);
          headDown = 0.7 - (r.t / r.until) * 0.7; earsT = [-0.6, -0.35];
          carrot.out = 0.12 + (r.t / r.until) * 0.88;
          if (r.t > r.until) { carrot.state = 'mouth'; startEating(); }
          break;
        case 'eat': { // munch from the tip until it's gone (holding still while the other tugs to share)
          r.y = groundY(r.d);
          const p = partner(), tug = p && p.r.mode === 'share' && p.r.shareWith === me;
          chew = tug ? 0 : 1; noseRate = 18; earsT = tug ? [-0.3, -0.1] : [-0.55, -0.3];
          if (!tug) carrot.len -= dt / 5.5;
          if (carrot.len <= 0) { carrot = null; cool.carrot = rand(10, 20); rest(1.5, 3); }
          break;
        }
        default: { // rest
          r.y = groundY(r.d);
          if (pointer.inside && !r.act && Math.abs(pointer.x - r.x) < 140 * S && Math.abs(pointer.x - r.x) > 12 * S) r.face = pointer.x > r.x ? 1 : -1;
          r.actT -= dt;
          if (r.actT < 0) {
            if (r.act) { r.act = null; r.actT = rand(0.8, 2); }
            else {
              const a = Math.random();
              r.act = a < 0.26 ? 'groom' : a < 0.48 ? 'sniff' : a < 0.66 ? 'rear' : a < 0.8 ? 'audience' : a < 0.9 ? 'turn' : 'loaf';
              r.actT = { groom: rand(1.4, 2.4), sniff: rand(0.8, 1.6), rear: rand(1.2, 2), audience: rand(1.8, 3.2), turn: 0.01, loaf: rand(1.5, 3) }[r.act];
              if (r.act === 'turn') r.face *= -1;
              if (r.act === 'audience') { // first a straight look, ears straight into a pose
                r.lookTX = r.lookTY = 0; r.glanceIn = rand(0.8, 1.6);
                r.feT = pick(FRONT_EARS); r.fe = [...r.feT]; r.feIn = rand(0.9, 2);
              }
            }
          }
          if (r.act === 'groom') { paw = 1; headDown = 0.25 + Math.sin(r.t * 9) * 0.12; earsT = [-0.7, -0.5]; }
          if (r.act === 'sniff') { headDown = 0.75; noseRate = 24; }
          if (r.act === 'rear') { rear = 1; earsT = [0.05, 0.15]; noseRate = 16; }
          if (r.act === 'loaf') { earsT = [-1, -0.85]; }
          if (r.act === 'audience') { // turns its head to the room; the ears settle into a pose, now and then another
            earsT = [0, 0.12]; noseRate = 10;
            r.feIn -= dt;
            if (r.feIn < 0) { r.feIn = rand(0.9, 2); r.feT = pick(FRONT_EARS); }
          }
          // a butterfly right overhead: chin up, eyes up at it
          const hp = headPos(), above = r.act !== 'groom' && bugs.find(b => b.type === 'fly' && Math.abs(b.x - hp.x) < 70 * S && b.y < hp.y - 15 * S && b.y > hp.y - 200 * S);
          if (above) { r.act = r.act === 'audience' ? null : r.act; headDown = -0.6; rear = Math.max(rear, 0.25); earsT = [0.05, 0.15]; r.lookTX = clamp((above.x - r.x) * r.face / 50, -1, 1); r.lookTY = -1; }
          if (r.t > r.until && (!r.act || r.act === 'loaf')) decide();
        }
      }
      r.earAT = earsT[0]; r.earBT = earsT[1];
      const wasFront = r.toCam > 0.5;
      r.toCam = ease(r.toCam, r.mode === 'rest' && r.act === 'audience' ? 1 : 0, 6, dt);
      r.fe[0] = ease(r.fe[0], r.feT[0], 7, dt); r.fe[1] = ease(r.fe[1], r.feT[1], 7, dt);
      if (wasFront !== r.toCam > 0.5) r.squash = Math.max(r.squash, 0.18); // the turn reads as a little bounce
      r.headDown = ease(r.headDown, headDown, 6, dt);
      r.rear = ease(r.rear, rear, 5, dt);
      r.paw = ease(r.paw, paw, 8, dt);
      r.dig = ease(r.dig, dig, 8, dt);
      r.chew = ease(r.chew, chew, 8, dt);
      r.flat = ease(r.flat, flat, 4, dt);
      r.stretch = ease(r.stretch, stretch, 8, dt);
      r.noseRate = noseRate;
    }

    // drawing: ['c', x, y, r] circle or ['e', x, y, rx, ry, rot] ellipse; an outline pass then
    // a fill pass, so overlapping parts read as one soft silhouette
    function shape(p) {
      g.beginPath();
      if (p[0] === 'c') g.arc(p[1], p[2], p[3], 0, TAU);
      else g.ellipse(p[1], p[2], p[3], p[4], p[5] || 0, 0, TAU);
    }
    function silhouette(list, earsIdx) {
      g.lineWidth = 2.6; g.strokeStyle = 'rgba(40, 20, 70, .55)';
      for (const p of list) { shape(p); g.stroke(); }
      g.fillStyle = look.fur;
      for (const p of list) { shape(p); g.fill(); }
      if (look.ears) { g.fillStyle = look.ears; for (const i of earsIdx) { shape(list[i]); g.fill(); } }
    }
    const ear = (base, a) => ['e', base[0] + Math.sin(a) * 12, base[1] - Math.cos(a) * 12, 4.6, 13.5, a];
    function innerEar(base, a) { g.beginPath(); g.ellipse(base[0] + Math.sin(a) * 12.5, base[1] - Math.cos(a) * 12.5, 2.1, 9.5, a, 0, TAU); g.fill(); }
    // toCam 0 = profile, 1 = face turned to the room: both eyes show and the nose comes to the middle
    function face(hx, hy, wide) {
      const t = r.toCam, ey = hy - 2;
      const eye = (ex, alpha) => {
        g.globalAlpha = alpha;
        if (r.blink > 0.3 || r.eyesShut) {
          g.strokeStyle = '#1b1b2f'; g.lineWidth = 1.6; g.lineCap = 'round';
          g.beginPath(); g.moveTo(ex - 2.2, ey); g.quadraticCurveTo(ex, ey + 1.4, ex + 2.2, ey); g.stroke();
        } else {
          const px = ex + r.lookX * 1.4 * (1 - t), py = ey + r.lookY * (r.lookY < 0 ? 2.3 : 1.5) * (1 - t); // eyes roll well up at things overhead
          g.fillStyle = '#1b1b2f'; g.beginPath(); g.arc(px, py, wide || t > 0.5 ? 2.7 : 2.3, 0, TAU); g.fill();
          g.fillStyle = '#fff'; g.beginPath(); g.arc(px + 0.8, py - 0.9, 0.8, 0, TAU); g.fill();
        }
        g.fillStyle = 'rgba(255, 140, 170, .5)'; g.beginPath(); g.ellipse(ex, hy + 4.5 + t * 0.5, 3.2 - t * 0.6, 2, 0, 0, TAU); g.fill();
        g.globalAlpha = 1;
      };
      eye(hx + 4 - 3 * t, 1);
      if (t > 0.02) eye(hx + 4 + 4.5 * t, t);
      g.fillStyle = '#ff7aa2'; g.beginPath(); g.arc(hx + 10 - 5.25 * t, hy + 1 + 2 * t + Math.sin(r.nose) * 0.6, 1.6, 0, TAU); g.fill();
    }
    function drawGround() {
      const air = r.air, rear = r.rear, hd = r.headDown, f = r.flat, st = r.stretch;
      const breath = r.mode === 'sleep' ? Math.sin(r.t * 2.2) * 0.6 : 0;
      const backFoot = -6 - air * 9 - f * 9; // in the air the hind legs push out behind
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
      const front = r.toCam > 0.5; // head turned to the room
      silhouette(front ? [
        ['e', backFoot, -2 - air * 2, 9 + f * 2 + air * 2, 3.4, air * 0.25],
        ['c', -22 - f * 4, -17 + f * 7, 5.5],
        ['c', -8 - f * 2, -14 + f * 5, 12.5 - f * 1.5],
        ['e', body[0], body[1], 18 + f * 5 + st * 3 + air * 2, 13 - f * 3 + breath - air, ang],
        ['e', paw[0], paw[1], 4.5, 3],
        ...frontHeadShapes(hx - 3, hy - 1),
      ] : [
        ['e', backFoot, -2 - air * 2, 9 + f * 2 + air * 2, 3.4, air * 0.25],
        ['c', -22 - f * 4, -17 + f * 7, 5.5],
        ear(baseFar, r.earA + ang),
        ['c', -8 - f * 2, -14 + f * 5, 12.5 - f * 1.5],
        ['e', body[0], body[1], 18 + f * 5 + st * 3 + air * 2, 13 - f * 3 + breath - air, ang],
        ['e', paw[0], paw[1], 4.5, 3],
        ['c', hx, hy, 10.5],
        ear(baseNear, r.earB + ang),
      ], front ? [5, 6] : [2, 7]); // which shapes are ears (for ear colour)
      if (look.spot) { g.fillStyle = look.spot; g.beginPath(); g.ellipse(-6 - f * 2, -20 + f * 6, 8, 5, -0.2, 0, TAU); g.fill(); }
      g.fillStyle = look.shade;
      g.beginPath(); g.ellipse(-6 - f * 2, -8 + f * 4, 12, 6 - f * 2, 0, 0, TAU); g.fill();
      if (front) { frontHead(hx - 3, hy - 1); return [hx + 10, hy + 2]; }
      g.fillStyle = look.inner; innerEar(baseNear, r.earB + ang);
      face(hx, hy, false);
      return [hx + 10, hy + 2]; // mouth
    }
    // the head turned to the room (the 'audience' look) on the side-on body: both ears, both eyes
    // and a little smile, still alive: blinks, small glances, ear twitches, a twitching nose and mouth
    const frontEars = () => { const tw = (r.earA + 0.45) * 0.6, tw2 = (r.earB + 0.2) * 0.6; return [[-4.5, Math.min(0, r.fe[0] + tw)], [4.5, Math.max(0, r.fe[1] - tw2)]]; }; // pose + twitches, never crossing
    // head and ears as shapes, so they go into the body's outline pass and the neck has no seam
    const frontHeadShapes = (cx, cy) => [
      ...frontEars().map(([x, a]) => ['e', cx + x + Math.sin(a) * 12, cy - 9 - Math.cos(a) * 12, 4.6, 13.5, a]),
      ['c', cx, cy, 11.5],
    ];
    function frontHead(cx, cy) {
      const ears = frontEars();
      g.save(); g.translate(cx, cy);
      g.fillStyle = look.inner;
      for (const [x, a] of ears) { g.beginPath(); g.ellipse(x + Math.sin(a) * 12.5, -9 - Math.cos(a) * 12.5, 2.1, 9.5, a, 0, TAU); g.fill(); }
      const lx = r.lookX * 1.2, ly = r.lookY * 1.2; // the eyes still glance about a little
      for (const side of [-1, 1]) {
        const ex = side * 4.6, ey = -2;
        if (r.blink > 0.3 || r.eyesShut) {
          g.strokeStyle = '#1b1b2f'; g.lineWidth = 1.6; g.lineCap = 'round';
          g.beginPath(); g.moveTo(ex - 2.2, ey); g.quadraticCurveTo(ex, ey + 1.4, ex + 2.2, ey); g.stroke();
        } else {
          g.fillStyle = '#1b1b2f'; g.beginPath(); g.arc(ex + lx, ey + ly, 2.6, 0, TAU); g.fill();
          g.fillStyle = '#fff'; g.beginPath(); g.arc(ex + lx + 0.8, ey + ly - 0.9, 0.85, 0, TAU); g.fill();
        }
        g.fillStyle = 'rgba(255, 140, 170, .5)'; g.beginPath(); g.ellipse(side * 7.6, 3.5, 2.8, 1.8, 0, 0, TAU); g.fill();
      }
      const twitch = Math.sin(r.nose) * 0.35; // nose and mouth twitch together
      g.fillStyle = '#ff7aa2'; g.beginPath(); g.ellipse(0, 1.5 + twitch, 1.5, 1.1, 0, 0, TAU); g.fill();
      g.strokeStyle = '#1b1b2f'; g.lineWidth = 0.9; g.lineCap = 'round'; // a small 'w' smile
      const my = 3.6 + twitch * 0.8, open = Math.max(0, Math.sin(r.nose * 0.5)) * 0.5;
      g.beginPath(); g.moveTo(-2.2, my); g.quadraticCurveTo(-1.1, my + 1.2 + open, 0, my - 0.2); g.quadraticCurveTo(1.1, my + 1.2 + open, 2.2, my); g.stroke();
      g.restore();
    }
    // held by the scruff: the pinch is at (0, 0), the body, paws and hind legs hanging down
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
      ], [7, 8]);
      g.strokeStyle = 'rgba(40, 20, 70, .3)'; g.lineWidth = 1.1; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-6, 14); g.quadraticCurveTo(-4, 9, -2, 6); g.moveTo(-2, 15); g.quadraticCurveTo(-1, 10, 0, 7); g.stroke();
      g.fillStyle = look.shade;
      g.beginPath(); g.ellipse(-2, 34, 9, 12, 0.05, 0, TAU); g.fill();
      g.fillStyle = look.inner; innerEar([5, -3], -1.85);
      face(9, 4, true);
    }
    function draw() {
      const gy = groundY(r.d), k = sc();
      const heldish = r.mode === 'held' || r.mode === 'fall';
      const feetY = heldish ? r.y + HANG * S : r.y;
      const lift = clamp((gy - feetY) / (140 * S), 0, 1);
      g.fillStyle = `rgba(0, 0, 0, ${0.3 * (1 - lift * 0.7)})`;
      g.beginPath(); g.ellipse(r.x, gy + 1, (22 + r.flat * 6) * k * (1 - lift * 0.5), 4.5 * k * (1 - lift * 0.5), 0, 0, TAU); g.fill();
      if (carrot?.state === 'buried') { // being pulled: upright, clipped at the ground line
        g.save(); g.beginPath(); g.rect(0, 0, W, soil()); g.clip();
        drawCarrot(carrot.x, soil() - (carrot.out * 30 + 4) * S, Math.PI / 2, 1, S);
        g.restore();
      }
      g.save();
      g.translate(r.x, r.y);
      g.scale(k * r.face, k);
      if (heldish) { g.rotate(r.swing); drawHeld(); }
      else {
        if (r.squash) g.scale(1 + r.squash * 0.22, 1 - r.squash * 0.22);
        if (r.tilt) g.rotate(r.tilt);
        if (r.twist) { g.translate(0, -16); g.rotate(r.twist); g.translate(0, 16); }
        if (r.shake) g.rotate(Math.sin(r.shake * 40) * 0.08 * r.shake);
        const mouth = drawGround();
        if (carrot?.state === 'mouth') drawCarrot(mouth[0] + 30 * carrot.len + 2, mouth[1] + 1, Math.PI + 0.12, carrot.len, 1, carrot.top !== false);
      }
      g.restore();
    }

    // picked up (site only)
    function hit(p) {
      if (r.mode === 'held' || r.mode === 'fall') return false;
      const cx = r.x + 2 * S * r.face, cy = r.y - 22 * S;
      return Math.abs(p.x - cx) < 32 * S && Math.abs(p.y - cy) < 30 * S;
    }
    function grab(p) {
      if (carrot) { // the carrot it was busy with stays behind on the ground
        if (lying.length < MAX_LYING) lying.push({ x: freeSpot(mouthX()), tilt: rand(-0.15, 0.15), len: Math.max(carrot.len, 0.2) });
        carrot = null;
      }
      startle(r.x, r.y - 30 * S, 200 * S);
      zs.length = 0;
      held = { lastX: p.x, lastY: p.y, vx: 0, vy: 0 };
      Object.assign(r, {
        air: 0, squash: 0, swing: 0, shake: 0, rear: 0, headDown: 0, paw: 0, dig: 0, chew: 0, flat: 0, stretch: 0,
        twist: 0, tilt: 0, binky: false, act: null, chaseX: null, then: null, goal: null, focus: null, afterChase: false, hopsInRow: 0,
      });
      setMode('held', Infinity);
    }
    function drop() {
      if (r.mode !== 'held') return;
      r.vx = clamp(held.vx, -1400, 1400); r.vy = clamp(held.vy, -1400, 800);
      held = null;
      setMode('fall');
    }

    Object.assign(me, {
      r, look, cool, step, draw, setMode, rest, goTo, startHops, mouthX, sc, free, available, enterFrom, exit,
      hit, grab, drop, decide, startChase, stroll,
      force: {
        sleep: () => setMode('sleep', 8), sploot: () => setMode('sploot', 4), binky: () => startHops(1, roomyDir(), null, 'binky'),
        stroll, chase: () => butterflies().length && startChase(butterflies()),
        dig: () => { if (!carrot) { carrot = { x: mouthX(), len: 1, state: 'buried', out: 0 }; setMode('dig', 1.6); } },
      },
    });
    Object.defineProperty(me, 'carrot', { get: () => carrot }); // live, not a copy
    return me;
  }

  function greet(a, b) {
    for (const [x, y] of [[a, b], [b, a]]) {
      x.r.face = Math.sign(y.r.x - x.r.x) || 1;
      x.r.greeted = true; x.r.act = null;
      x.setMode('greet', 2.4);
    }
    const f = a === friend ? a : b;
    f.r.stayLeft = rand(...tune.friendStay);
  }
  function friendArrives() {
    friend = Bunny(LOOKS.friend, rand(0.25, 0.45));
    friend.r.visit = 'stay';
    main.r.greeted = false;
    const fromLeft = main.r.x < W * 0.4 ? true : main.r.x > W * 0.6 ? false : chance(0.5); // from the nearer side
    friend.enterFrom(fromLeft, clamp(main.r.x + (fromLeft ? -1 : 1) * rand(120, 200) * S, margin(), W - margin()));
  }

  // ── The scene ──
  function stepWorld(dt) {
    T += dt;
    for (const k in worldCool) worldCool[k] -= dt;
    if (F.grass && grassGrow < 1) grassGrow = Math.min(1, grassGrow + dt / 150);
    for (let i = flowers.length - 1; i >= 0; i--) { flowers[i].age += dt; if (flowerState(flowers[i]).dead) flowers.splice(i, 1); }
    if (F.flowers && flowers.length < maxFlowers() && Math.random() < dt / 6) sproutFlower();
    // carrots ripen over about 50 s; a new one is planted every 20–35 s while there's room
    for (const c of planted) c.ripe = Math.min(1, c.ripe + dt / 50);
    if (F.growCarrots && planted.length < maxCarrots() && worldCool.plant <= 0) { plantCarrot(); worldCool.plant = rand(20, 35); }
    // insects come for the flowers (a lone butterfly sometimes passes even without any)
    const blooms = flowers.filter(blooming).length;
    const flies = bugs.filter(b => b.type === 'fly').length, bees = bugs.length - flies;
    // going away: the insects fly off (the rabbits go at their next decision, see decide())
    if (!wantOut && !tune.ambient) for (const b of bugs) b.state = 'leave';
    if (main.gone && tune.ambient) { // nobody home in the quiet stretch: now and then a butterfly or a bee drifts through
      if (worldCool.bug <= 0) { if (!bugs.length && chance(0.3)) spawnBug(chance(0.3) ? 'bee' : 'fly'); worldCool.bug = rand(15, 30); }
    } else if (wantOut && worldCool.bug <= 0 && !main.gone) {
      if (flies < Math.min(tune.flies, 1 + Math.floor(blooms / 2)) && Math.random() < (blooms ? Math.max(0.45, tune.flyChance) : tune.flyChance)) spawnBug('fly');
      else if (F.bees && blooms && bees < tune.bees && chance(0.3)) spawnBug('bee');
      worldCool.bug = rand(4, 9);
    }
    stepBugs(dt, false);
    // the friend comes over now and then, and goes home again
    if (tune.friend && wantOut && !main.gone && !main.r.entering && !friend && worldCool.friend <= 0 && !['held', 'fall'].includes(main.r.mode)) friendArrives();
    if (friend?.gone) { friend = null; main.r.greeted = false; worldCool.friend = rand(...tune.friendEvery); }
    for (const z of zs) { z.t += dt; z.y -= 14 * S * dt; z.x += Math.sin(z.t * 2 + z.p) * 6 * S * dt; }
    while (zs.length && zs[0].t > 2.4) zs.shift();
  }
  function step(dt) {
    stepWorld(dt);
    if (!main.gone) main.step(dt);
    friend?.step(dt);
  }

  function render() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    drawGrass(false);
    for (const f of flowers) drawFlower(f);
    for (const c of planted) drawPlanted(c);
    for (const c of lying) drawCarrot(c.x, groundY(0.6) - 4 * S, c.tilt, c.len, S);
    for (const b of [main, friend].filter(b => b && !b.gone).sort((a, b) => a.r.d - b.r.d)) b.draw(); // back rabbit first
    drawGrass(true); // a few blades in front, so the rabbits sit in the grass
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

  main = Bunny(LOOKS.jade, 0.6);

  // ── Pointer: pick up the jade rabbit (site only) ──
  function local(e) {
    const b = box.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top, inside: e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom };
  }
  const drop = () => { if (main.r.mode === 'held') { main.drop(); box.classList.remove('rabbit-grabbing'); } };
  if (interactive) {
    box.addEventListener('pointermove', e => {
      Object.assign(pointer, local(e));
      if (main.r.mode === 'held') { if (!pointer.inside) drop(); return; }
      box.classList.toggle('rabbit-hover', main.hit(pointer));
    });
    box.addEventListener('pointerleave', () => { pointer.inside = false; box.classList.remove('rabbit-hover'); drop(); });
    box.addEventListener('pointerdown', e => {
      const p = local(e);
      if (!main.hit(p)) return;
      e.preventDefault();
      Object.assign(pointer, p);
      try { box.setPointerCapture(e.pointerId); } catch {} // keep getting moves even over the QR image
      main.grab(p);
      box.classList.add('rabbit-grabbing');
      if (still) render();
    });
    addEventListener('pointerup', drop);
    addEventListener('pointercancel', drop);
    // On touch screens a press on the rabbit picks it up instead of scrolling the page.
    box.addEventListener('touchstart', e => { const t = e.touches[0]; if (t && main.hit(local(t))) e.preventDefault(); }, { passive: false });
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
    if (!wantOut && main.gone && !friend && !bugs.length && !tune.ambient) { running = false; return; } // all gone: the ground rests
    requestAnimationFrame(frame);
  }
  let entered = false;
  function start() {
    if (still) return;
    fleeing = false;
    if (running) return;
    if (opt.enter && !entered && wantOut) comeIn();
    running = true; last = performance.now(); requestAnimationFrame(frame);
  }

  // ── On stage or away ──
  // With opt.manual the owner decides when the rabbit is out (the slideshow's stage schedule).
  // Going away, it finishes what it's doing and hops off the nearer side; coming back, it hops
  // in from a side, or turns round if it hadn't quite left yet.
  let wantOut = !opt.manual;
  let visitNo = 0;
  const firstVisit = () => opt.manual && visitNo <= 1; // no carrots on the first visit: saved as a later surprise
  const spotNear = fromLeft => (fromLeft ? rand(margin() + 20 * S, W * 0.3) : rand(W * 0.7, W - margin() - 20 * S));
  function comeIn() {
    const r = main.r;
    cv.classList.add('out');
    if (entered && !main.gone) {
      if (r.visit === 'leave') { r.visit = null; r.entering = false; main.goTo(spotNear(r.x < W / 2)); }
      return;
    }
    entered = true; main.gone = false; r.visit = null; visitNo++;
    const fromLeft = chance(0.5);
    main.enterFrom(fromLeft, spotNear(fromLeft));
    if (tune.friend && chance(0.6)) worldCool.friend = Math.min(worldCool.friend, rand(20, 50)); // often the friend tags along
  }
  function show(on) {
    if (still || on === wantOut) return;
    wantOut = on;
    if (on) comeIn();
    start();
  }
  function stop() {
    if (!running) return;
    if (bugs.length) fleeing = true; // let them fly off first
    else running = false;
  }
  if (opt.manual) { /* show() drives it */ } else if (opt.active) {
    const check = () => (opt.active() ? start() : stop());
    new MutationObserver(check).observe(opt.watch || box, { attributes: true, attributeFilter: ['class'] });
    check();
  } else new IntersectionObserver(([e]) => { if (e.isIntersecting) start(); else running = false; }).observe(box);
  let lastW = 0;
  const fitBox = () => {
    size();
    if (Math.abs(W - lastW) > 40) { lastW = W; makeGrass(); }
    for (const b of [main, friend].filter(Boolean)) {
      if (!b.r.entering) b.r.x = clamp(b.r.x || W * 0.25, margin(), W - margin());
      if (b.r.mode !== 'held' && b.r.mode !== 'fall') b.r.y = groundY(b.r.d);
    }
    for (const c of [...lying, ...flowers, ...planted]) c.x = clamp(c.x, 20 * S, W - 20 * S);
    render();
  };
  new ResizeObserver(fitBox).observe(box);
  addEventListener('resize', fitBox); // a scaled stage changes size without the box resizing

  size(); lastW = W; makeGrass();
  if (F.flowers) { for (let i = 0; i < Math.min(2, maxFlowers()); i++) sproutFlower(true); sproutFlower(); }
  if (F.growCarrots) plantCarrot(rand(0.3, 0.7));
  main.r.x = clamp(W * 0.25, margin(), W - margin()); main.r.y = groundY(main.r.d);
  main.rest(1, 2);
  render();
  if (still && interactive) { // reduced motion: it sits quietly, but can still be picked up and put down
    addEventListener('pointermove', () => { if (main.r.mode === 'held') { main.r.x = clamp(pointer.x, 0, W); main.r.y = clamp(pointer.y, 0, groundY(main.r.d) - HANG * S); render(); } });
    addEventListener('pointerup', () => { main.r.mode = 'rest'; main.r.y = groundY(main.r.d); main.r.x = clamp(main.r.x, margin(), W - margin()); render(); });
  }

  // the slideshow's phases switch parts on and turn things up through this
  function configure({ features = {}, tune: t = {} } = {}) {
    if (features.grass && !F.grass) grassGrow = 0;
    const friendWasOn = tune.friend;
    Object.assign(F, features);
    Object.assign(tune, t);
    if (!F.grass) grassGrow = 0;
    if (!F.flowers) flowers.length = 0;
    if (!F.growCarrots) planted.length = 0;
    if (!F.bees) for (const b of bugs) if (b.type === 'bee') b.state = 'leave';
    if (tune.friend && !friendWasOn) worldCool.friend = rand(20, 45); // first visit soon after it unlocks
    if (!tune.friend && friend && friend.r.visit !== 'leave') friend.exit();
    if (tune.ambient && entered) start(); // passers-by need the scene running while the rabbit is away
    render();
  }

  // a handle for poking at the meadow from the console
  return {
    configure, show, features: F, tune, bugs, flowers, planted,
    get out() { return wantOut; }, get present() { return entered && !main.gone; },
    get r() { return main.r; }, get main() { return main; }, get friend() { return friend; },
    force(what) {
      const extra = {
        fly: () => spawnBug('fly'), bee: () => spawnBug('bee'), flower: () => sproutFlower(true), carrot: () => plantCarrot(1),
        friend: () => { if (!friend) friendArrives(); }, friendLeave: () => friend?.exit(),
      };
      (extra[what] || main.force[what])?.();
    },
  };
};

window.siteRabbit = mountRabbit(document.querySelector('.member'));
