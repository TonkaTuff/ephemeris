/*! ephemeris 0.1.0 — celestial thinking-orbs. Canvas 2D, no dependencies. MIT. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Ephemeris = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ helpers */
  const TAU = Math.PI * 2;
  const E = (n, s) => { const t = Math.sin(n * 12.9898 + s * 78.233) * 43758.5453; return t - Math.floor(t); };
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  // point i of n on a fibonacci sphere
  const fib = (i, n) => {
    const g = Math.PI * (3 - Math.sqrt(5)), y = 1 - 2 * (i + 0.5) / n, r = Math.sqrt(1 - y * y), a = i * g;
    return [r * Math.cos(a), y, r * Math.sin(a)];
  };
  // camera: yaw about y, pitch about x, scale, translate. Returns [x, y, z], z toward the viewer.
  const makeProj = (yaw, pitch, cx, cy, s) => {
    const sy = Math.sin(yaw), cy_ = Math.cos(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch);
    return (x, y, z) => {
      const x1 = x * cy_ + z * sy, z1 = -x * sy + z * cy_;
      const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      return [cx + x1 * s, cy - y2 * s, z2];
    };
  };
  // engine dot-size rule, from thinking-orbs
  const radiusScale = size => (size / 300) ** 0.6;
  const countScale = (size, pow, cap) => Math.min(cap, Math.max(0.25, (size / 64) ** pow));

  /* ------------------------------------------------------------------ colour */
  // Six base colours make a palette. Read off CSS custom properties (--orb-cold … --orb-shadow)
  // or passed as opts.palette = { cold, mid, hot, glow, ring, shadow } as [r, g, b].
  const KEYS = ['cold', 'mid', 'hot', 'glow', 'ring', 'shadow'];
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const buildPal = q => ({
    ramp: [q.cold, q.mid, q.hot],
    halo: [rgba(q.glow, 0.42), rgba(q.glow, 0.12), rgba(q.glow, 0)],
    haze: [rgba(q.glow, 0.5), rgba(q.glow, 0)],
    ring: [rgba(q.mid, 0.5), rgba(q.ring, 1)],
    shadow: rgba(q.shadow, 1),
    glow: q.glow
  });
  // colour at heat h in [0,1]: cold → mid → hot
  const ramp = (r, h) => {
    const [a, b, k] = h < 0.5 ? [r[0], r[1], h * 2] : [r[1], r[2], h * 2 - 1];
    return [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k), Math.round(a[2] + (b[2] - a[2]) * k)];
  };
  const parseCol = v => {
    v = (v || '').trim(); let m;
    if ((m = /^#([0-9a-f]{3})$/i.exec(v))) return [...m[1]].map(h => parseInt(h + h, 16));
    if ((m = /^#([0-9a-f]{6})$/i.exec(v))) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
    if ((m = /^rgba?\(([^)]+)\)$/i.exec(v))) return m[1].split(/[\s,\/]+/).slice(0, 3).map(Number);
    return null;
  };
  // A palette if any --orb-* variable reaches the element (inherited counts), else null.
  const readPalette = (el, defaults) => {
    const cs = getComputedStyle(el), q = {}; let any = false;
    for (const k of KEYS) { const c = parseCol(cs.getPropertyValue('--orb-' + k)); q[k] = c || defaults[k]; if (c) any = true; }
    return any ? q : null;
  };

  /* ------------------------------------------------------------------ shared painters */
  // One dot. Colour modes use `col`; ink uses `white` with the thinking-orbs convention (0 = full ink,
  // inverted on a dark ground).
  const dotPainter = (ctx, ink, dark) => (x, y, r, col, a, white) => {
    if (a < 0.02) return;
    if (a > 1) a = 1;
    if (ink) { const v = Math.round((dark ? 1 - white : white) * 255); ctx.fillStyle = `rgba(${v},${v},${v},${a.toFixed(3)})`; }
    else ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a.toFixed(3)})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  };
  // Optional space ground: pill-clipped dark gradient with hashed, twinkling stars. Leaves the clip set.
  function paintSpace(ctx, W, size, t, o) {
    const half = size / 2, cx = W / 2, R = half * 0.98;
    ctx.beginPath(); ctx.roundRect(cx - W / 2 + half - R, half - R, W - 2 * (half - R), 2 * R, R); ctx.clip();
    const bg = ctx.createRadialGradient(cx, half * 0.85, 0, cx, half, Math.max(R, W / 2));
    bg.addColorStop(0, '#0e1122'); bg.addColorStop(1, '#03040a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, size);
    const NS = o.stars ?? Math.round(40 * Math.min(5, Math.max(0.3, size / 64)) * (W / size)), sz = Math.sqrt(size / 64);
    for (let i = 0; i < NS; i++) {
      const tw = 0.6 + 0.4 * Math.sin(t * 0.9 + i * 1.7);
      ctx.fillStyle = `rgba(220,228,255,${((0.2 + 0.6 * E(i, 6.1)) * tw).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(E(i, 3.3) * W, E(i, 4.4) * size, (0.25 + 0.45 * E(i, 7.2)) * sz, 0, TAU);
      ctx.fill();
    }
  }
  function paintRim(ctx, W, size) {
    const half = size / 2, cx = W / 2, R = half * 0.98;
    ctx.strokeStyle = 'rgba(160,170,210,0.18)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(cx - W / 2 + half - R + 0.5, half - R + 0.5, W - 2 * (half - R) - 1, 2 * R - 1, R - 0.5); ctx.stroke();
  }

  /* ================================================================== blackhole */
  // Interstellar's Gargantua. Edge-on accretion disk on Keplerian orbits, far side lensed over the top
  // and under the bottom, photon ring, Doppler-bright on the approaching side. Parametric lensing,
  // not ray marching. Everything scales off the shadow radius Rs = 0.13 · size.
  const EMBER = { cold: [255, 120, 30], mid: [255, 183, 130], hot: [255, 246, 230], glow: [255, 165, 70], ring: [255, 255, 245], shadow: [0, 0, 0] };
  // the shipped ember look, kept literal so the default is pixel-stable
  const EMBER_PAL = {
    ramp: [EMBER.cold, EMBER.mid, EMBER.hot],
    halo: ['rgba(255,165,70,0.42)', 'rgba(255,135,50,0.12)', 'rgba(255,120,40,0)'],
    haze: ['rgba(255,160,70,0.5)', 'rgba(255,120,40,0)'],
    ring: ['rgba(255,190,110,0.5)', 'rgba(255,255,245,1)'],
    shadow: '#000', glow: EMBER.glow
  };
  function drawBlackHole(ctx, size, t, dark, o = {}) {
    const W = o.w ?? size, half = size / 2, cx = W / 2;
    const Rs = size * (o.shadow ?? 0.13);
    // the disk fills whatever width the canvas gives, out to `reach` shadow radii: square caps at 3.7,
    // a 2:1 canvas reaches 6.5 like the film
    const rIn = Rs * 1.04, rOut = Math.min(Rs * (o.reach ?? 6.5), W * 0.48);
    const M = radiusScale(size);
    const N = o.n ?? Math.round(380 * countScale(size, 1.3, 20) * (rOut / (Rs * 3.7)) * (o.ink ? 0.225 : 1) * (o.lite ? 0.5 : 1));
    const tilt = 0.17 + 0.03 * Math.sin(t * 0.13);   // sin(inclination), ~10° above the plane
    const roll = 0.05 * Math.sin(t * 0.09);          // slow camera drift
    const ink = !!o.ink;
    const pal = o.palette ? buildPal(o.palette) : EMBER_PAL;
    const rBase = (o.rBase ?? (ink ? 1.3 : 1.1)) * M, rDepth = (o.rDepth ?? (ink ? 1.7 : 1.6)) * M, rMin = 0.3;

    ctx.save();
    if (o.space) paintSpace(ctx, W, size, t, o);
    ctx.translate(cx, half); ctx.rotate(roll);
    ctx.globalCompositeOperation = ink ? 'source-over' : 'lighter';
    const dot = dotPainter(ctx, ink, dark);

    if (!ink) {
      let g = ctx.createRadialGradient(0, 0, Rs * 0.9, 0, 0, Rs * 3.2);
      g.addColorStop(0, pal.halo[0]); g.addColorStop(0.4, pal.halo[1]); g.addColorStop(1, pal.halo[2]);
      ctx.fillStyle = g; ctx.fillRect(-W, -size, 2 * W, 2 * size);
      ctx.save(); ctx.scale(1, 0.22);
      g = ctx.createRadialGradient(0, 0, Rs, 0, 0, rOut * 1.05);
      g.addColorStop(0, pal.haze[0]); g.addColorStop(1, pal.haze[1]);
      ctx.fillStyle = g; ctx.fillRect(-W, -size / 0.22, 2 * W, 2 * size / 0.22);
      ctx.restore();
    }

    const front = [];
    for (let i = 0; i < N; i++) {
      const r = rIn + (rOut - rIn) * E(i, 1.1) ** 1.6;
      const n = (r - rIn) / (rOut - rIn);
      const ph = E(i, 2.2) * TAU - t * (o.omega ?? 2.4) / (r / Rs) ** 1.5;   // Keplerian
      const c = Math.cos(ph), s = Math.sin(ph);
      const th = (E(i, 3.7) - 0.5) * 0.07 * r;
      const rad = (1 - n) ** 1.4;
      const heat = clamp01((1 - 0.55 * c - 0.45) / 1.1);   // Doppler: approaching (left) runs hot
      const col = ink ? null : ramp(pal.ramp, heat);
      const A = (0.2 + 0.8 * rad) * (0.5 + 0.5 * heat);
      const W1 = 0.32 - 0.24 * heat + 0.12 * n;            // ink primaries
      const W2 = 0.56 + 0.08 * n;                          // ink secondary images
      const rr = Math.max(rMin, rBase + rDepth * rad);
      if (s > 0) {
        front.push([r * c, r * s * tilt + th, rr, col, ink ? 1 : A, W1]);
        const w = s ** 0.6, rho = Rs * (1.06 + 0.1 * n);              // near side, secondary image above
        dot(c * ((1 - w) * r + w * rho), -w * rho * s, ink ? rr * 0.9 : rr * 0.8, col, ink ? 0.9 : A * 0.35, W2);
      } else {
        const as = -s;
        let w = as ** 0.5, rho = Rs * (1.18 + 0.45 * n);              // far side, primary arch over the top
        dot(c * ((1 - w) * r + w * rho), -((1 - w) * r * as * tilt + w * rho * as) + th * (1 - w), rr, col, ink ? 1 : A * 0.9, W1);
        w = as ** 0.35; rho = Rs * (1.06 + 0.16 * n);                 // far side, secondary under the bottom
        dot(c * ((1 - w) * r + w * rho), w * rho * as, ink ? rr * 0.9 : rr * 0.8, col, ink ? 0.9 : A * 0.4, W2);
      }
    }

    if (!ink) {   // ink draws no ring; the shadow is the gap the lensed images leave
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = pal.shadow; ctx.beginPath(); ctx.arc(0, 0, Rs, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      let pg = pal.ring[0];
      if (ctx.createConicGradient) {
        pg = ctx.createConicGradient(0, 0, 0);
        pg.addColorStop(0, pal.ring[0]); pg.addColorStop(0.5, pal.ring[1]); pg.addColorStop(1, pal.ring[0]);
      }
      ctx.strokeStyle = pg; ctx.lineWidth = Math.max(0.5, 1.6 * M);
      ctx.beginPath(); ctx.arc(0, 0, Rs * 1.05, 0, TAU); ctx.stroke();
    }
    for (const d of front) dot(...d);
    ctx.restore();
    if (o.space) paintRim(ctx, W, size);
  }

  /* ================================================================== pulsar */
  // A neutron star as a lighthouse: dense spinning core, two beams on a magnetic axis tilted off the
  // spin axis, dipole field lines riding along. When a beam sweeps the camera the whole thing flares.
  const COBALT = { cold: [30, 86, 216], mid: [127, 176, 255], hot: [234, 243, 255], glow: [61, 123, 255], ring: [242, 248, 255], shadow: [0, 0, 0] };
  function drawPulsar(ctx, size, t, dark, o = {}) {
    const W = o.w ?? size, half = size / 2, cx = W / 2;
    const ink = !!o.ink, pal = buildPal(o.palette || COBALT);
    const M = radiusScale(size), lite = o.lite ? 0.5 : 1;
    const Rc = size * 0.11;                              // core radius
    const L = Math.min(size * 0.47, W * 0.48);           // beam reach
    const spin = t * (o.spin ?? 4.2);                    // ~1.5 s per turn
    const alpha = o.tilt ?? 0.62;                        // magnetic axis off the spin axis
    const proj = makeProj(0.4 + 0.12 * Math.sin(t * 0.07), 0.35, 0, 0, 1);
    const sa = Math.sin(alpha), ca = Math.cos(alpha), st = Math.sin(spin), ct = Math.cos(spin);
    const m = [sa * st, ca, sa * ct];                    // magnetic axis, body frame
    const a = [ct, 0, -st];                              // ⟂ m
    const b = [m[1] * a[2] - m[2] * a[1], m[2] * a[0] - m[0] * a[2], m[0] * a[1] - m[1] * a[0]];
    const toWorld = (x, y, z) => [x * a[0] + y * m[0] + z * b[0], x * a[1] + y * m[1] + z * b[1], x * a[2] + y * m[2] + z * b[2]];
    const mz = proj(m[0], m[1], m[2])[2];                // how squarely the axis points at the camera
    const pulse = Math.max(0, mz) ** 6 + Math.max(0, -mz) ** 6;

    const NB = Math.round(44 * countScale(size, 1.1, 6) * lite);   // per beam
    const NC = Math.round(56 * countScale(size, 1.1, 6) * lite);   // core
    const NF = Math.round(14 * countScale(size, 0.8, 4));          // per field-line arc
    const rMin = 0.3;

    ctx.save();
    if (o.space) paintSpace(ctx, W, size, t, o);
    ctx.translate(cx, half);
    ctx.globalCompositeOperation = ink ? 'source-over' : 'lighter';
    const dot = dotPainter(ctx, ink, dark);

    if (!ink) {   // halo breathes with the pulse
      const g = ctx.createRadialGradient(0, 0, Rc * 0.5, 0, 0, Rc * (3 + 3 * pulse));
      g.addColorStop(0, rgba(pal.glow, 0.25 + 0.45 * pulse)); g.addColorStop(1, rgba(pal.glow, 0));
      ctx.fillStyle = g; ctx.fillRect(-W, -size, 2 * W, 2 * size);
    }

    // dipole field lines: 3 shells × 4 meridians, r = r0 sin²φ
    const fieldCol = ink ? null : ramp(pal.ramp, 0.15);
    for (let sh = 0; sh < 3; sh++) {
      const r0 = Rc * (2.2 + 1.3 * sh);
      for (let me = 0; me < 4; me++) {
        const ps = me * Math.PI / 2;
        for (let k = 0; k < NF; k++) {
          const ph = 0.3 + (Math.PI - 0.6) * (k + 0.5) / NF, r = r0 * Math.sin(ph) ** 2;
          const [wx, wy, wz] = toWorld(r * Math.sin(ph) * Math.cos(ps), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(ps));
          const [x, y, z] = proj(wx, wy, wz), C = (z / r0 + 1) / 2;
          dot(x, y, Math.max(rMin, 0.7 * M), fieldCol, ink ? 0.55 + 0.35 * C : 0.12 + 0.2 * C, 0.62 - 0.1 * C);
        }
      }
    }
    // beams
    for (const sgn of [1, -1]) {
      const own = Math.max(0, sgn * mz) ** 6;
      for (let k = 0; k < NB; k++) {
        const d = (k + 0.5) / NB, r = Rc * 0.8 + d * (L - Rc * 0.8);
        const j1 = (E(k, 3.1 + sgn) - 0.5) * 2, j2 = (E(k, 7.7 + sgn) - 0.5) * 2, spread = r * 0.11;
        const [wx, wy, wz] = toWorld(j1 * spread, sgn * r, j2 * spread);
        const [x, y, z] = proj(wx, wy, wz), C = (z / L + 1) / 2;
        const fade = (1 - d) ** 1.3;
        dot(x, y, Math.max(rMin, (0.6 + 1.6 * fade) * M), ink ? null : ramp(pal.ramp, 0.35 + 0.65 * fade),
            ink ? 0.45 + 0.55 * fade : (0.18 + 0.7 * fade) * (0.55 + 0.45 * C) * (1 + 0.8 * own), 0.12 + 0.5 * d);
      }
    }
    // core, spinning with the beams
    for (let i = 0; i < NC; i++) {
      const p = fib(i, NC);
      const px = p[0] * ct + p[2] * st, pz = -p[0] * st + p[2] * ct;
      const [x, y, z] = proj(px * Rc, p[1] * Rc, pz * Rc), C = (z / Rc + 1) / 2;
      dot(x, y, Math.max(rMin, (0.9 + 1.4 * C) * M), ink ? null : ramp(pal.ramp, 0.7 + 0.3 * C),
          ink ? 0.7 + 0.3 * C : (0.5 + 0.5 * C) * (1 + 0.6 * pulse), 0.3 - 0.22 * C);
    }
    ctx.restore();
    if (o.space) paintRim(ctx, W, size);
  }

  /* ================================================================== galaxy */
  // A spiral seen at a tilt: logarithmic arms, a bright flattened bulge, dust scatter, the pattern
  // turning slowly. `arms` picks the count (4 = Milky Way, 2 = a grand-design like M51).
  const MILKYWAY = { cold: [77, 107, 255], mid: [201, 184, 255], hot: [255, 243, 214], glow: [138, 124, 255], ring: [255, 255, 255], shadow: [0, 0, 0] };
  function drawGalaxy(ctx, size, t, dark, o = {}) {
    const W = o.w ?? size, half = size / 2, cx = W / 2;
    const ink = !!o.ink, pal = buildPal(o.palette || MILKYWAY);
    const M = radiusScale(size), lite = o.lite ? 0.5 : 1;
    const R = Math.min(size * 0.47, W * 0.48);           // disk radius
    const arms = o.arms ?? 4, k = o.wind ?? 3.4;         // wind = 1/tan(pitch angle) ≈ 16°
    const pitch = (o.pitchAngle ?? 1.0) + 0.05 * Math.sin(t * 0.11);   // camera elevation, 0 = edge-on
    const proj = makeProj(0.25 + 0.06 * Math.sin(t * 0.05), pitch, 0, 0, 1);
    const turn = t * (o.omega ?? 0.18);                  // pattern rotation
    const N = o.n ?? Math.round(420 * countScale(size, 1.3, 20) * (o.ink ? 0.45 : 1) * lite);
    const rMin = 0.3;

    ctx.save();
    if (o.space) paintSpace(ctx, W, size, t, o);
    ctx.translate(cx, half);
    ctx.globalCompositeOperation = ink ? 'source-over' : 'lighter';
    const dot = dotPainter(ctx, ink, dark);

    if (!ink) {   // core glow, plus a disk haze squashed to the viewing angle
      let g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.55);
      g.addColorStop(0, rgba(pal.ramp[2], 0.5)); g.addColorStop(0.3, rgba(pal.glow, 0.22)); g.addColorStop(1, rgba(pal.glow, 0));
      ctx.fillStyle = g; ctx.fillRect(-W, -size, 2 * W, 2 * size);
      const sq = Math.max(0.12, Math.sin(pitch));
      ctx.save(); ctx.scale(1, sq);
      g = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 1.05);
      g.addColorStop(0, rgba(pal.glow, 0.28)); g.addColorStop(1, rgba(pal.glow, 0));
      ctx.fillStyle = g; ctx.fillRect(-W, -size / sq, 2 * W, 2 * size / sq);
      ctx.restore();
    }

    const NBULGE = Math.round(N * 0.22);
    for (let i = 0; i < N; i++) {
      let x, y, z, heat, a, white, rr;
      if (i < NBULGE) {                                  // bulge: flattened spheroid, hot
        const p = fib(i, NBULGE), rb = R * 0.2 * E(i, 5.5) ** 0.6;
        x = p[0] * rb; y = p[1] * rb * 0.55; z = p[2] * rb;
        heat = 0.85 + 0.15 * E(i, 9.1); a = 0.55 + 0.45 * (1 - rb / (R * 0.2)); white = 0.12 + 0.2 * rb / (R * 0.2);
        rr = (0.9 + 1.2 * (1 - rb / (R * 0.2))) * M;
      } else {                                           // arms: log spiral θ = θ0 + k·ln(r/r0), scattered
        const j = i - NBULGE, arm = j % arms, u = E(j, 1.3);
        const r = R * (0.13 + 0.87 * u ** 0.75), n = r / R;
        const th = arm * TAU / arms + k * Math.log(r / (R * 0.13)) + turn;
        const off = (E(j, 2.7) - 0.5) * 2 * (0.06 + 0.14 * n) * R;   // across-arm scatter, wider outward
        const knot = E(j, 8.3) > 0.93;                                 // bright H II knots
        const xa = Math.cos(th) * r - Math.sin(th) * off, za = Math.sin(th) * r + Math.cos(th) * off;
        x = xa; z = za; y = (E(j, 4.1) - 0.5) * 0.05 * R;
        const strength = (arm % 2 === 0) ? 1 : 0.7;                     // two major, two minor
        heat = knot ? 0.95 : 0.62 - 0.55 * n;
        a = (knot ? 0.9 : (0.25 + 0.55 * (1 - n) ** 1.2)) * strength;
        white = knot ? 0.08 : 0.28 + 0.4 * n;
        rr = (knot ? 1.6 : 0.6 + 0.9 * (1 - n)) * M;
      }
      const [sx, sy, sz] = proj(x, y, z), C = (sz / R + 1) / 2;
      dot(sx, sy, Math.max(rMin, rr), ink ? null : ramp(pal.ramp, heat), ink ? Math.min(1, a + 0.3) : a * (0.7 + 0.3 * C), white);
    }
    ctx.restore();
    if (o.space) paintRim(ctx, W, size);
  }

  /* ================================================================== registry + driver */
  const MODES = {
    blackhole: { draw: drawBlackHole, defaults: EMBER,    state: 'pondering' },
    pulsar:    { draw: drawPulsar,    defaults: COBALT,   state: 'pinging' },
    galaxy:    { draw: drawGalaxy,    defaults: MILKYWAY, state: 'swirling' }
  };
  const STATE_TO_MODE = Object.fromEntries(Object.entries(MODES).map(([m, v]) => [v.state, m]));

  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDark = () => {
    const st = document.documentElement.getAttribute('data-theme');
    if (st === 'dark') return true;
    if (st === 'light') return false;
    return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
  };
  const num = v => (v == null || v === '' ? undefined : Number(v));

  // Markup contract: <canvas class=orb width=64 height=64 data-orb-mode=pulsar> (or data-orb-state=pinging).
  // Height is the preset; width lets wide modes stretch. Flags: data-orb-ink, -lite, -space (=1),
  // data-orb-arms / -spin / -tilt for mode options. Colours via --orb-* custom properties.
  function mount(canvas) {
    if (canvas.dataset.orbReady === '1') return;
    canvas.dataset.orbReady = '1';
    const modeName = canvas.dataset.orbMode || STATE_TO_MODE[canvas.dataset.orbState] || 'blackhole';
    const mode = MODES[modeName] || MODES.blackhole;
    const w = parseInt(canvas.getAttribute('width') || '', 10) || 64;
    const size = parseInt(canvas.getAttribute('height') || '', 10) || w;
    const dpr = Math.min(2, window.devicePixelRatio || 1);     // past 2 the dots cost more than they show
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(size * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = size + 'px';
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const ds = canvas.dataset;
    const opts = { w, ink: ds.orbInk === '1', lite: ds.orbLite === '1', space: ds.orbSpace === '1',
                   arms: num(ds.orbArms), spin: num(ds.orbSpin), tilt: num(ds.orbTilt) };
    const paint = t => {
      opts.palette = readPalette(canvas, mode.defaults);     // every frame, so themes and :hover apply live
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, size);
      mode.draw(ctx, size, t, isDark(), opts);
    };
    if (reduced()) {   // one still frame, repainted on theme change
      paint(0.6);
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => paint(0.6));
      new MutationObserver(() => paint(0.6)).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      return;
    }
    let raf = 0, running = false, visible = true;
    const tick = () => { paint(performance.now() / 1000); if (running) raf = requestAnimationFrame(tick); };
    const start = () => { if (!running) { running = true; raf = requestAnimationFrame(tick); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    paint(0);
    if (typeof IntersectionObserver !== 'undefined') {   // no rAF for orbs scrolled off or on hidden tabs
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        (visible && document.visibilityState !== 'hidden') ? start() : stop();
      }).observe(canvas);
    } else start();
    document.addEventListener('visibilitychange', () => (document.visibilityState === 'hidden' ? stop() : visible && start()));
  }
  const register = root => (root || document).querySelectorAll('canvas.orb').forEach(mount);

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => register());
    else register();
  }

  return {
    version: '0.1.0',
    register, mount, MODES, STATE_TO_MODE,
    draw: (mode, ctx, size, t, dark, opts) => MODES[mode].draw(ctx, size, t, dark, opts),
    palette: { keys: KEYS, build: buildPal, read: readPalette, parse: parseCol, ramp },
    _: { E, fib, makeProj, paintSpace, paintRim, dotPainter }
  };
});
