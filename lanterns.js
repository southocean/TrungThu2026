// Đèn trời (sky lanterns) rising through the whole page.
//
// Each lantern lives in "layer space": a vertical track as tall as the part of the page its
// layer can show. It rises at its own speed whether or not it is on screen; we only draw it
// when it overlaps the viewport. On screen, y = trackY - scrollY * depth, so scrolling down
// pushes lanterns up faster (and scrolling up holds them back). Depth < 1 sits behind the
// content and moves slower than the page (parallax); depth > 1 drifts in front, faster.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const back = document.querySelector('.lanterns-back');
  const front = document.querySelector('.lanterns-front');
  if (!back || !front) return;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const TAU = Math.PI * 2;

  // ── Sprites: one design (a paper sky lantern), drawn a dozen times with small differences
  // in hue, proportions and crumple so no two look stamped out of the same mould. ──
  const SW = 120, SH = 170;
  const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;

  function makeSprite(blur) {
    const c = document.createElement('canvas');
    c.width = SW; c.height = SH;
    const g = c.getContext('2d');
    if (blur) g.filter = `blur(${blur}px)`;

    const hue = rand(-7, 7);          // warmer ↔ yellower paper
    const lit = rand(-4, 4);          // a touch brighter or dimmer
    const topW = rand(25, 31);        // half-width at the top
    const botW = rand(15, 20);        // half-width at the open bottom
    const topY = rand(43, 49), botY = rand(124, 131), crown = rand(26, 34);
    const lean = rand(-3, 3);         // bottom pulled a little to one side
    const dl = rand(-2.5, 2.5), dr = rand(-2.5, 2.5); // uneven top corners
    const bulge = rand(-2, 3);        // paper sagging out (or in) along the sides

    const bx = 60 + lean, fy = botY - 6;
    const h = g.createRadialGradient(60, 96, 4, 60, 96, 60);
    h.addColorStop(0, hsl(34 + hue, 100, 62, .5));
    h.addColorStop(1, hsl(28 + hue, 100, 55, 0));
    g.fillStyle = h;
    g.fillRect(0, 0, SW, SH);

    g.beginPath();
    g.moveTo(60 - topW, topY + dl);
    g.quadraticCurveTo(60, crown, 60 + topW, topY + dr);
    g.quadraticCurveTo(60 + (topW + botW) / 2 + bulge, (topY + botY) / 2, bx + botW, botY);
    g.quadraticCurveTo(bx, botY + 6, bx - botW, botY);
    g.quadraticCurveTo(60 - (topW + botW) / 2 - bulge, (topY + botY) / 2, 60 - topW, topY + dl);
    const body = g.createLinearGradient(0, topY, 0, botY);
    body.addColorStop(0, hsl(22 + hue, 100, 62 + lit));
    body.addColorStop(.55, hsl(40 + hue, 100, 68 + lit));
    body.addColorStop(1, hsl(48 + hue * .5, 100, 86 + lit / 2));
    g.fillStyle = body;
    g.fill();

    // ribs, following the lantern's lean
    g.strokeStyle = hsl(20 + hue, 80, 42, .33);
    g.lineWidth = 1.5;
    g.beginPath();
    for (const k of [-.5, 0, .5]) {
      g.moveTo(60 + k * topW, topY - (k ? 3 : 7) + rand(-1, 1));
      g.lineTo(bx + k * botW * 1.1, botY + 2);
    }
    g.stroke();

    const f = g.createRadialGradient(bx, fy, 1, bx, fy, 10);
    f.addColorStop(0, '#fffbe6');
    f.addColorStop(1, 'rgba(255,200,80,0)');
    g.fillStyle = f;
    g.beginPath(); g.arc(bx, fy, 10, 0, Math.PI * 2); g.fill();
    return c;
  }
  const sharpSet = Array.from({ length: 12 }, () => makeSprite(0));
  const softSet = Array.from({ length: 6 }, () => makeSprite(3)); // near, out-of-focus layer (no-op where canvas filter is unsupported)

  // ── Motion ──
  let W = 0, H = 0, docH = 0, dpr = 1;

  function layer(canvas, count, depth, size, set, alpha) {
    return { canvas, ctx: canvas.getContext('2d'), count, depth, size, set, alpha, items: [] };
  }
  const layers = [
    layer(back, () => Math.min(40, Math.round(docH / 240)), [.35, .9], [16, 50], sharpSet, [.6, .95]),
    layer(front, () => Math.max(2, Math.min(4, Math.round(docH / 1800))), [1.25, 1.5], [70, 110], softSet, [.35, .55]),
  ];

  // Track length for a lantern of this depth: from just above the page top to just below
  // the bottom of the furthest-scrolled viewport.
  const trackBottom = l => H + Math.max(0, docH - H) * l.d + l.h;

  function spawn(L, anywhere) {
    const d = rand(...L.depth);
    const t = (d - L.depth[0]) / (L.depth[1] - L.depth[0] || 1); // 0 far … 1 near
    const sprite = pick(L.set);
    const w = (L.size[0] + (L.size[1] - L.size[0]) * (t * .7 + Math.random() * .3)) * rand(.8, 1.15);
    const l = {
      d, w, h: w * SH / SW, sprite,
      x: rand(.02, .98),
      speed: (14 + 30 * t) * rand(.75, 1.25), // px/s; nearer lanterns climb faster
      sway: rand(5, 20), swayF: rand(.12, .35), ph: rand(0, TAU),
      angle: rand(-.12, .12), tilt: rand(.03, .07), // each rests at its own slight angle
      a: rand(...L.alpha), flick: rand(2, 6),
    };
    l.y = anywhere ? rand(-l.h, trackBottom(l)) : trackBottom(l) + rand(0, H * .5);
    return l;
  }

  function measure() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    docH = document.documentElement.scrollHeight;
    for (const L of layers) {
      L.canvas.width = Math.round(W * dpr);
      L.canvas.height = Math.round(H * dpr);
      const n = L.count();
      while (L.items.length < n) L.items.push(spawn(L, true));
      L.items.length = n;
    }
  }

  let last = performance.now();
  function frame(now) {
    if (document.documentElement.classList.contains('how-open')) { last = now; requestAnimationFrame(frame); return; } // the admin Log covers the page: don't draw what nobody sees
    const dt = Math.min(.1, (now - last) / 1000);
    last = now;
    const sy = scrollY, t = now / 1000;
    for (const L of layers) {
      const g = L.ctx;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      for (let i = 0; i < L.items.length; i++) {
        const l = L.items[i];
        l.y -= l.speed * dt;
        if (l.y < -l.h) { L.items[i] = spawn(L, false); continue; }
        const y = l.y - sy * l.d;
        if (y > H || y < -l.h) continue; // off screen: position kept, nothing drawn
        const s = Math.sin(t * l.swayF * TAU + l.ph);
        const x = l.x * W + s * l.sway;
        g.globalAlpha = l.a * (.86 + .14 * Math.sin(t * l.flick + l.ph));
        // lean into the sway, as if the breeze were pushing them
        g.setTransform(dpr, 0, 0, dpr, x * dpr, (y + l.h / 2) * dpr);
        g.rotate(l.angle + s * l.tilt);
        g.drawImage(l.sprite, -l.w / 2, -l.h / 2, l.w, l.h);
      }
    }
    requestAnimationFrame(frame);
  }

  measure();
  addEventListener('resize', measure);
  // Page height changes as images and the map load.
  new ResizeObserver(() => {
    if (Math.abs(document.documentElement.scrollHeight - docH) > 40) measure();
  }).observe(document.body);
  requestAnimationFrame(frame);
})();
