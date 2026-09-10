/*! ephemeris 0.9.3 — celestial stipple. Canvas 2D, no dependencies. MIT. */
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
  // dot-size rule shared with thinking-orbs, so sizes match
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
  // One dot. Colour modes use `col`; ink uses `white`, the thinking-orbs convention (0 = full ink,
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
  const frac = v => v - Math.floor(v);
  // 2-d value noise, smooth, for the drift
  const noise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y); let fx = x - xi, fy = y - yi;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const a = E(xi, yi), b = E(xi + 1, yi), c = E(xi, yi + 1), d = E(xi + 1, yi + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };

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
  // bar: length of a central bar as a fraction of the disk radius; arms start from its ends (M83, NGC 1300)
  // ring: width of a bright outer ring instead of arms, `spokes` = fraction of dots on radial spokes (Cartwheel)
  // scatter: across-arm spread multiplier, 2+ makes a loose flocculent spiral (Triangulum)
  // knots: fraction of arm dots that are bright H II knots, 0.07 default
  // plume: height of a vertical outflow from the core as a fraction of the radius (M82)
  const MILKYWAY = { cold: [77, 107, 255], mid: [201, 184, 255], hot: [255, 243, 214], glow: [138, 124, 255], ring: [255, 255, 255], shadow: [0, 0, 0] };
  function drawGalaxy(ctx, size, t, dark, o = {}) {
    const W = o.w ?? size, half = size / 2, cx = W / 2;
    const ink = !!o.ink, pal = buildPal(o.palette || MILKYWAY);
    const M = radiusScale(size), lite = o.lite ? 0.5 : 1;
    const R = Math.min(size * 0.47, W * 0.48);           // disk radius
    const arms = o.arms ?? 4, k = o.wind ?? 3.4;         // wind = 1/tan(pitch angle) ≈ 16°
    const bar = o.bar ?? 0, ring = o.ring ?? 0, spokes = o.spokes ?? 0.25, plume = o.plume ?? 0;
    const scat = o.scatter ?? 1, knotAt = 1 - (o.knots ?? 0.07), r0 = R * (bar || 0.13);
    // tilt is the camera elevation: 0 edge-on, about 1.5 face-on. pitchAngle is the old name for it.
    const pitch = (o.tilt ?? o.pitchAngle ?? 1.0) + 0.05 * Math.sin(t * 0.11);
    const proj = makeProj(0.25 + 0.06 * Math.sin(t * 0.05), pitch, 0, 0, 1);
    // Arms trail: the pattern turns against the way the spiral winds outward, so the tips sweep
    // backwards. Turning it the other way gives a leading spiral, which real galaxies do not do.
    const turn = -t * (o.omega ?? 0.18) * (o.spin ?? 1);  // pattern rotation; spin scales it
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
      if (i < NBULGE && bar && E(i, 7.7) < 0.6) {       // bar: a rod of bulge stars, turning with the pattern
        const L = (E(i, 5.5) - 0.5) * 2 * bar * R, wd = (E(i, 6.6) - 0.5) * 0.1 * R, n = Math.abs(L) / (bar * R);
        x = Math.cos(turn) * L - Math.sin(turn) * wd; z = Math.sin(turn) * L + Math.cos(turn) * wd; y = (E(i, 4.4) - 0.5) * 0.04 * R;
        heat = 0.8; a = 0.5 + 0.4 * (1 - n); white = 0.15 + 0.25 * n; rr = (0.8 + 0.8 * (1 - n)) * M;
      } else if (i < NBULGE) {                           // bulge: flattened spheroid, hot
        const p = fib(i, NBULGE), rb = R * (ring ? 0.1 : 0.2) * E(i, 5.5) ** 0.6;
        x = p[0] * rb; y = p[1] * rb * 0.55; z = p[2] * rb;
        heat = 0.85 + 0.15 * E(i, 9.1); a = 0.55 + 0.45 * (1 - rb / (R * 0.2)); white = 0.12 + 0.2 * rb / (R * 0.2);
        rr = (0.9 + 1.2 * (1 - rb / (R * 0.2))) * M;
      } else if (plume && E(i, 6.1) < 0.35) {           // plume: outflow above and below the core
        const sP = E(i, 1.3), up = E(i, 2.7) < 0.5 ? -1 : 1;
        y = up * plume * R * sP ** 0.8; x = (E(i, 3.9) - 0.5) * R * (0.12 + 0.3 * sP); z = (E(i, 4.1) - 0.5) * 0.15 * R;
        heat = 0.5; a = 0.15 + 0.55 * (1 - sP); white = 0.3 + 0.4 * sP; rr = (0.8 + 0.7 * (1 - sP)) * M;
      } else if (ring && E(i, 3.3) >= spokes) {         // ring: a hot band at the rim, all the way round
        const u = E(i, 1.3), r = R * (1 - ring * u), th = E(i, 9.9) * TAU + turn, knot = E(i, 8.3) > knotAt;
        x = Math.cos(th) * r; z = Math.sin(th) * r; y = (E(i, 4.1) - 0.5) * 0.05 * R;
        heat = knot ? 0.45 : 0.15; a = knot ? 0.9 : 0.55; white = knot ? 0.05 : 0.2; rr = (knot ? 1.5 : 0.9) * M;
      } else {                                           // arms: log spiral θ = θ0 + k·ln(r/r0), scattered
        const j = i - NBULGE, arm = j % arms, u = E(j, 1.3);
        const r = r0 + (R - r0) * u ** 0.75, n = r / R;
        const th = arm * TAU / arms + (ring ? 0 : k * Math.log(r / r0)) + turn;   // spokes run straight
        const off = (E(j, 2.7) - 0.5) * 2 * (0.06 + 0.14 * n) * R * (ring ? 0.3 : scat);   // across-arm scatter, wider outward
        const knot = !ring && E(j, 8.3) > knotAt;                      // bright H II knots
        const xa = Math.cos(th) * r - Math.sin(th) * off, za = Math.sin(th) * r + Math.cos(th) * off;
        x = xa; z = za; y = (E(j, 4.1) - 0.5) * 0.05 * R;
        const strength = ring ? 0.6 : (arm % 2 === 0) ? 1 : 0.7;       // two major, two minor
        heat = knot ? 0.95 : ring ? 0.5 : 0.62 - 0.55 * n;
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

  /* ================================================================== nebula */
  // An emission nebula: a few overlapping gas clouds drawn as soft, low-alpha dots that drift on a
  // slow noise field, lit from inside by a handful of young stars. Wisps come from stretching each
  // cloud along its own axis. Each cloud swirls slowly about its own centre while the field drifts.
  const ORION = { cold: [75, 63, 191], mid: [208, 90, 160], hot: [255, 217, 194], glow: [138, 79, 208], ring: [255, 255, 255], shadow: [0, 0, 0] };
  function drawNebula(ctx, size, t, dark, o = {}) {
    const W = o.w ?? size, half = size / 2, cx = W / 2;
    const ink = !!o.ink, pal = buildPal(o.palette || ORION);
    const M = radiusScale(size), lite = o.lite ? 0.5 : 1;
    const Rx = W * 0.46, Ry = size * 0.46, R = Math.min(Rx, Ry);
    const N = o.n ?? Math.round(360 * countScale(size, 1.3, 20) * Math.sqrt(Rx / Ry) * (ink ? 0.4 : 1) * lite);
    const K = o.clouds ?? 5, NS = o.starN ?? Math.max(3, Math.round(5 * countScale(size, 0.6, 4)));
    const slow = t * (o.omega ?? 0.18) * (o.spin ?? 1);   // drift rate; spin scales all the motion
    const rMin = 0.3;

    // clouds: centre, radius, stretch axis, base heat; centres wander, axes turn
    const clouds = [];
    for (let k = 0; k < K; k++) {
      const a = E(k, 11.3) * TAU + slow * 0.4;
      clouds.push({
        x: Math.cos(a) * Rx * (0.15 + 0.4 * E(k, 12.1)) + 0.1 * R * Math.sin(slow * 0.7 + k),
        y: Math.sin(a) * Ry * (0.15 + 0.4 * E(k, 13.7)) + 0.1 * R * Math.cos(slow * 0.5 + k * 1.3),
        r: R * (0.28 + 0.34 * E(k, 14.9)),
        ax: E(k, 15.2) * Math.PI + slow * (0.5 + 0.5 * E(k, 18.2)) * (E(k, 19.4) > 0.5 ? 1 : -1),   // the swirl
        st: 1.3 + 0.9 * E(k, 16.4),
        heat: 0.25 + 0.5 * E(k, 17.8)
      });
    }
    // stars: fixed inside the cloud, each lights what's near it
    const stars = [];
    for (let s = 0; s < NS; s++) {
      const c = clouds[s % K];
      stars.push({ x: c.x + (E(s, 21.1) - 0.5) * c.r * 0.9, y: c.y + (E(s, 22.3) - 0.5) * c.r * 0.9,
                   tw: 0.75 + 0.25 * Math.sin(t * (1.1 + E(s, 23.5)) + s * 2.1), big: E(s, 24.7) });
    }
    const lit = (x, y) => {   // 0..1, how close to the nearest star, in cloud radii
      let best = 0;
      for (const s of stars) { const d = Math.hypot(x - s.x, y - s.y) / (R * 0.45); const v = Math.max(0, 1 - d); if (v > best) best = v; }
      return best * best;
    };

    ctx.save();
    if (o.space) paintSpace(ctx, W, size, t, o);
    ctx.translate(cx, half);
    ctx.globalCompositeOperation = ink ? 'source-over' : 'lighter';
    const dot = dotPainter(ctx, ink, dark);

    if (!ink) {   // diffuse gas: one soft gradient per cloud, then a warm bloom per star
      for (const c of clouds) {
        const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r * 1.5);
        g.addColorStop(0, rgba(ramp(pal.ramp, c.heat), 0.16)); g.addColorStop(1, rgba(pal.glow, 0));
        ctx.fillStyle = g; ctx.fillRect(-W, -size, 2 * W, 2 * size);
      }
      for (const s of stars) {
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, R * (0.16 + 0.1 * s.big));
        g.addColorStop(0, rgba(pal.ramp[2], 0.35 * s.tw)); g.addColorStop(1, rgba(pal.ramp[2], 0));
        ctx.fillStyle = g; ctx.fillRect(-W, -size, 2 * W, 2 * size);
      }
    }

    // gas dots: gaussian around a cloud centre, stretched along the cloud's axis, drifting on noise
    for (let i = 0; i < N; i++) {
      const c = clouds[i % K];
      const u = Math.max(1e-4, E(i, 1.1)), v = E(i, 2.2) * TAU;
      const g = Math.min(2.6, Math.sqrt(-2 * Math.log(u))) * 0.42;          // radial gaussian
      let lx = Math.cos(v) * g * c.r * c.st, ly = Math.sin(v) * g * c.r / c.st;
      const ca = Math.cos(c.ax), sa = Math.sin(c.ax);
      let x = c.x + lx * ca - ly * sa, y = c.y + lx * sa + ly * ca;
      x += (noise(i * 0.37, slow + i * 0.011) - 0.5) * 0.32 * R;         // drift
      y += (noise(i * 0.53 + 40, slow * 0.8 + i * 0.013) - 0.5) * 0.32 * R;
      const edge = clamp01(g / 1.1);                                       // 0 core .. 1 fringe
      const L = lit(x, y);
      const heat = clamp01(c.heat * (1 - edge) + 0.6 * L);
      const a = ink ? 0.55 + 0.45 * (1 - edge) : (0.05 + 0.16 * (1 - edge) + 0.22 * L) * (0.65 + 0.35 * noise(i * 0.19, slow * 2.5));
      const rr = Math.max(rMin, (1.2 + 1.8 * (1 - edge) + 1.4 * L) * M);
      dot(x, y, rr, ink ? null : ramp(pal.ramp, heat), a, 0.34 + 0.34 * edge - 0.2 * L);
    }
    // the stars themselves
    for (const s of stars) {
      const rr = Math.max(rMin, (1.6 + 1.6 * s.big) * M);
      if (!ink && size >= 48) {   // faint diffraction spikes
        ctx.strokeStyle = rgba(pal.ramp[2], 0.18 * s.tw); ctx.lineWidth = Math.max(0.5, 0.6 * M);
        const L2 = rr * (4 + 3 * s.big);
        ctx.beginPath(); ctx.moveTo(s.x - L2, s.y); ctx.lineTo(s.x + L2, s.y); ctx.moveTo(s.x, s.y - L2); ctx.lineTo(s.x, s.y + L2); ctx.stroke();
      }
      dot(s.x, s.y, rr, pal.ramp[2], ink ? 1 : 0.95 * s.tw, 0.04);
      if (!ink) dot(s.x, s.y, rr * 0.55, [255, 255, 255], 0.9 * s.tw, 0.04);
    }
    ctx.restore();
    if (o.space) paintRim(ctx, W, size);
  }

  /* ================================================================== comet */
  // Nucleus down-left, two tails streaming up-right away from an off-canvas sun: a broad curved dust
  // tail and a narrow, faster, flickering ion tail. Particles are born at the nucleus and age out.
  const HALLEY = { cold: [47, 125, 255], mid: [159, 208, 255], hot: [255, 248, 230], glow: [111, 176, 255], ring: [255, 255, 255], shadow: [0, 0, 0] };
  function drawComet(ctx, size, t, dark, o = {}) {
    const W = o.w ?? size, half = size / 2, cx = W / 2;
    const ink = !!o.ink, pal = buildPal(o.palette || HALLEY);
    const M = radiusScale(size), lite = o.lite ? 0.5 : 1, rMin = 0.3;
    const Rn = size * 0.05;                                       // nucleus
    const L = Math.min(W * 0.9, size * 1.4) * 0.62;               // tail length
    const ang = -0.62 + 0.05 * Math.sin(t * 0.21);                // tail heading, up-right
    const dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx;
    const nx = -W * 0.22 + 0.02 * size * Math.sin(t * 0.5), ny = size * 0.2 + 0.02 * size * Math.cos(t * 0.37);
    const ND = Math.round(220 * countScale(size, 1.2, 12) * (ink ? 0.45 : 1) * lite);
    const NI = Math.round(110 * countScale(size, 1.2, 12) * (ink ? 0.45 : 1) * lite);
    const NC = Math.round(40 * countScale(size, 1.1, 8) * lite);
    const speed = o.spin ?? 1;

    ctx.save();
    if (o.space) paintSpace(ctx, W, size, t, o);
    ctx.translate(cx, half);
    ctx.globalCompositeOperation = ink ? 'source-over' : 'lighter';
    const dot = dotPainter(ctx, ink, dark);

    if (!ink) {   // coma
      const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, Rn * 5);
      g.addColorStop(0, rgba(pal.ramp[2], 0.55)); g.addColorStop(0.3, rgba(pal.glow, 0.22)); g.addColorStop(1, rgba(pal.glow, 0));
      ctx.fillStyle = g; ctx.fillRect(-W, -size, 2 * W, 2 * size);
    }
    // dust tail: broad, slow, curves to one side as it ages
    for (let i = 0; i < ND; i++) {
      const a = frac(E(i, 1.1) + t * 0.16 * speed * (0.6 + 0.8 * E(i, 2.2)));
      const d = a ** 0.85 * L;
      const lat = (E(i, 3.3) - 0.5) * 2 * (0.05 + 0.45 * a) * L * 0.36 + a * a * L * 0.22;
      const x = nx + dx * d + px * lat, y = ny + dy * d + py * lat;
      const f = (1 - a) ** 1.4;
      dot(x, y, Math.max(rMin, (0.7 + 1.5 * f) * M), ink ? null : ramp(pal.ramp, 0.5 + 0.3 * f),
          ink ? 0.4 + 0.6 * f : 0.08 + 0.55 * f, 0.3 + 0.5 * a);
    }
    // ion tail: narrow, fast, straight, flickers
    for (let i = 0; i < NI; i++) {
      const a = frac(E(i, 4.4) + t * 0.55 * speed * (0.8 + 0.4 * E(i, 5.5)));
      const d = a * L * 1.15;
      const lat = (E(i, 6.6) - 0.5) * 2 * (0.02 + 0.09 * a) * L * 0.36 - a * L * 0.04;
      const x = nx + dx * d + px * lat, y = ny + dy * d + py * lat;
      const f = (1 - a) ** 1.1 * (0.55 + 0.45 * noise(i * 0.31, t * 1.6));
      dot(x, y, Math.max(rMin, (0.5 + 1.0 * f) * M), ink ? null : ramp(pal.ramp, 0.05 + 0.2 * f),
          ink ? 0.35 + 0.5 * f : 0.1 + 0.6 * f, 0.4 + 0.4 * a);
    }
    // coma dots + nucleus
    for (let i = 0; i < NC; i++) {
      const u = Math.max(1e-4, E(i, 7.7)), v = E(i, 8.8) * TAU, g = Math.min(2.5, Math.sqrt(-2 * Math.log(u))) * Rn * 1.1;
      dot(nx + Math.cos(v) * g, ny + Math.sin(v) * g, Math.max(rMin, 0.9 * M), ink ? null : ramp(pal.ramp, 0.8),
          ink ? 0.5 : 0.18, 0.45);
    }
    const NN = Math.round(30 * countScale(size, 1, 6));
    for (let i = 0; i < NN; i++) {
      const p = fib(i, NN), z = p[2];
      if (z < -0.2) continue;
      const C = (z + 1) / 2;
      dot(nx + p[0] * Rn, ny + p[1] * Rn, Math.max(rMin, (0.8 + 1.2 * C) * M), ink ? null : ramp(pal.ramp, 0.85 + 0.15 * C),
          ink ? 1 : 0.6 + 0.4 * C, 0.25 - 0.18 * C);
    }
    ctx.restore();
    if (o.space) paintRim(ctx, W, size);
  }

  /* ================================================================== saturn */
  // A banded globe with three ring bands and the Cassini gap, tilted ~24°, rings on Keplerian
  // speeds. Back-side ring dots hide behind the planet and dim in its shadow.
  const SATURN = { cold: [176, 138, 90], mid: [232, 211, 168], hot: [255, 247, 232], glow: [217, 185, 122], ring: [255, 255, 255], shadow: [0, 0, 0] };
  function drawSaturn(ctx, size, t, dark, o = {}) {
    const W = o.w ?? size, half = size / 2, cx = W / 2;
    const ink = !!o.ink, pal = buildPal(o.palette || SATURN);
    const M = radiusScale(size), lite = o.lite ? 0.5 : 1, rMin = 0.3;
    // moons: [{ a (orbit, planet radii), r (moon radius, planet radii), T (seconds), heat, phase0 }]
    const moons = o.moons || null, maxA = moons ? Math.max(...moons.map(m => m.a)) : 0;
    const Rp = Math.min(size, W) * (moons ? 0.15 : o.rings === false ? 0.36 : 0.2);   // ringless globes fill the orb
    const ax = moons ? Math.min(1.8, Math.max(1, W * 0.47 / (maxA * Rp))) : 1;       // a wide canvas spreads the orbits
    const proj = makeProj(0.12 * Math.sin(t * 0.05), (o.tilt ?? 0.42) + 0.04 * Math.sin(t * 0.08), 0, 0, 1);
    const spin = t * (o.spin ?? 0.35);
    // surface: 'bands' (gas giant), 'moon' (maria + craters), 'mercury' (craters only), 'earth' (oceans, land, ice, clouds), 'mars' (rust, caps), 'pluto' (the heart)
    // bandAmp: contrast of the bands, 0.28 default; Venus runs low
    // spot: true adds a warm oval on the southern belt (Jupiter); 'dark' removes dots there instead (Neptune)
    // streaks: bright thin cloud streaks along a few latitudes (Neptune)
    const darkSpot = o.spot === 'dark';
    const surf = o.surface || 'bands';
    // phase: sun angle in camera space. undefined = lit from the camera; a number 0..1 (0 full, 0.5 new);
    // 'cycle' waxes and wanes over `period` seconds
    const phase = o.phase === 'cycle' ? frac(t / (o.period ?? 24)) : o.phase;
    const sunA = phase == null ? null : phase * TAU;
    const LAT = Math.min(40, Math.max(6, Math.round(15 * (size / 64) ** 0.5 * Math.sqrt(lite))));
    const LON = Math.min(120, Math.max(10, Math.round(42 * (size / 64) ** 0.6 * Math.sqrt(lite))));
    const BANDS = [[1.28, 1.55, 0.45], [1.58, 1.95, 1], [2.02, 2.32, 0.7]];       // inner, outer, brightness
    const NR = Math.round(420 * countScale(size, 1.2, 12) * (ink ? 0.4 : 1) * lite);

    ctx.save();
    if (o.space) paintSpace(ctx, W, size, t, o);
    ctx.translate(cx, half);
    ctx.globalCompositeOperation = ink ? 'source-over' : 'lighter';
    const dot = dotPainter(ctx, ink, dark);

    if (!ink) {
      const g = ctx.createRadialGradient(0, 0, Rp * 0.6, 0, 0, Rp * 2.6);
      g.addColorStop(0, rgba(pal.glow, 0.22)); g.addColorStop(1, rgba(pal.glow, 0));
      ctx.fillStyle = g; ctx.fillRect(-W, -size, 2 * W, 2 * size);
    }
    // rings, split by depth around the planet (o.rings === false for a Jupiter)
    const back = [], front = [];
    for (let i = 0; i < (o.rings === false ? 0 : NR); i++) {
      const u = E(i, 1.1) * 2.15, b = u < 0.45 ? 0 : u < 1.45 ? 1 : 2, band = BANDS[b];
      const r = Rp * (band[0] + (band[1] - band[0]) * E(i, 2.2));
      const a = E(i, 3.3) * TAU + t * 0.4 / (r / Rp) ** 1.5;
      const [x, y, z] = proj(Math.cos(a) * r, 0, Math.sin(a) * r);
      const inShadow = z < 0 && Math.abs(x) < Rp * 1.05;
      if (z < 0 && Math.hypot(x, y) < Rp) continue;                      // hidden behind the planet
      const bright = band[2] * (inShadow ? 0.25 : 1) * (0.85 + 0.15 * E(i, 4.4));
      (z < 0 ? back : front).push([x, y, Math.max(rMin, (0.6 + 0.8 * bright) * M), ink ? null : ramp(pal.ramp, 0.3 + 0.35 * bright),
        ink ? 0.5 + 0.5 * bright : 0.25 + 0.6 * bright, 0.62 - 0.3 * bright]);
    }
    if (moons) {   // each moon: a dot at small sizes, a mini sphere when there is room; hidden behind the planet
      for (const m of moons) {
        const th = t * TAU / m.T + (m.phase0 || 0), a = m.a * Rp * ax;
        const [x, y, z] = proj(Math.cos(th) * a, 0, Math.sin(th) * a);
        if (z < 0 && Math.hypot(x, y) < Rp) continue;
        const r = Math.max(1.1 * M, m.r * Rp), list = z < 0 ? back : front;
        const mc = m.col || null;
        if (r < 2.4 * M) list.push([x, y, r, ink ? null : (mc || ramp(pal.ramp, m.heat)), 1, 0.25]);
        else {
          const NM = Math.min(48, Math.round(r * r * 0.9));
          for (let i = 0; i < NM; i++) {
            const d = fib(i, NM); if (d[2] < 0) continue;
            list.push([x + d[0] * r, y + d[1] * r, Math.max(rMin, (0.5 + 0.6 * d[2]) * M), ink ? null : (mc || ramp(pal.ramp, m.heat + 0.08 * d[2])), 0.5 + 0.5 * d[2], 0.42 - 0.2 * d[2]]);
          }
        }
      }
    }
    for (const d of back) dot(...d);
    // planet, front hemisphere. Surface pattern is in body-fixed longitude so it turns with the spin.
    for (let la = 0; la <= LAT; la++) {
      const lat = -Math.PI / 2 + la / LAT * Math.PI, cl = Math.cos(lat), sl = Math.sin(lat);
      const n = Math.max(1, Math.round(Math.abs(cl) * LON));
      const amp = o.bandAmp ?? 0.28, band = (1 - amp) + amp * Math.sin(lat * 9 + E(la, 5.5) * 2);
      for (let lo = 0; lo < n; lo++) {
        const lon = lo / n * TAU, ph = lon + spin;
        const [x, y, z] = proj(cl * Math.cos(ph) * Rp, sl * Rp, cl * Math.sin(ph) * Rp);
        if (z < 0.02) continue;
        const C = z / Rp;
        const lit = sunA == null ? C : Math.max(0, (x / Rp) * Math.sin(sunA) + C * Math.cos(sunA));
        let heat, a, white, rr = 0.6 + 1.3 * C, pen = 1;
        if (darkSpot) {   // an oval of missing dots on the southern belt, with a dimmed edge
          const dlon = Math.atan2(Math.sin(lon - 1.2), Math.cos(lon - 1.2)), q = (dlon / 0.34) ** 2 + ((lat + 0.36) / 0.16) ** 2;
          if (q < 1) continue;
          if (q < 1.7) pen = 0.45;
        }
        const streak = o.streaks && Math.abs(lat) < 1 && noise(lat * 14 + 80, lon * 3) > 0.74;
        if (surf === 'moon' || surf === 'mercury') {
          const rocky = surf === 'mercury';
          const mare = !rocky && noise(lat * 2.4 + 7, lon * 2.4) > 0.58, crater = noise(lat * (rocky ? 11 : 9) + 3, lon * (rocky ? 11 : 9)) > (rocky ? 0.72 : 0.82);
          heat = mare ? 0.12 : crater ? 0.35 : 0.55 + 0.3 * noise(lat * 5, lon * 5);
          a = ink ? 0.25 + 0.75 * lit : 0.06 + 0.9 * lit;                                  // dark side = earthshine
          white = (mare ? 0.55 : 0.3) + 0.3 * (1 - lit);
        } else if (surf === 'earth') {
          const land = noise(lat * 1.8 + 11, lon * 1.8) > 0.53, ice = Math.abs(lat) > 1.15;
          heat = ice ? 0.95 : land ? 0.45 + 0.2 * noise(lat * 6, lon * 6) : 0.04 + 0.08 * noise(lat * 4, lon * 4);
          a = ink ? (land || ice ? 0.9 : 0.45) * (0.3 + 0.7 * lit) : 0.12 + 0.85 * lit;
          white = (ice ? 0.15 : land ? 0.3 : 0.62) + 0.25 * (1 - lit);
        } else if (surf === 'pluto') {
          const dlon = Math.atan2(Math.sin(lon - 0.8), Math.cos(lon - 0.8));
          const heart = (dlon / 0.5) ** 2 + ((lat + 0.12) / 0.42) ** 2 < 1;
          const dark = noise(lat * 2.6 + 70, lon * 2.6);
          heat = heart ? 0.95 : dark > 0.55 ? 0.12 + 0.15 * dark : 0.45 + 0.25 * dark;
          a = ink ? 0.4 + 0.6 * lit : 0.1 + 0.85 * lit;
          white = (heart ? 0.1 : dark > 0.55 ? 0.55 : 0.32) + 0.25 * (1 - lit);
        } else if (surf === 'mars') {
          const dark = noise(lat * 2.2 + 50, lon * 2.2), cap = Math.abs(lat) > 1.28;
          heat = cap ? 0.95 : 0.3 + 0.4 * dark;
          a = ink ? 0.4 + 0.6 * lit : 0.1 + 0.85 * lit;
          white = (cap ? 0.12 : 0.28 + 0.3 * (1 - dark)) + 0.25 * (1 - lit);
        } else {
          heat = 0.42 + 0.3 * band + 0.25 * C;
          a = ink ? 0.7 + 0.3 * C : 0.35 + 0.6 * C * band;
          white = 0.58 - 0.4 * C - 0.1 * band;
        }
        if (sunA != null && surf === 'bands') { a *= ink ? 0.4 + 0.6 * lit : 0.15 + 0.85 * lit; white += 0.25 * (1 - lit); }
        if (streak) { heat = 0.95; a = Math.min(1, a * 1.3 + 0.2); white = 0.12; rr *= 1.15; }
        dot(x, y, Math.max(rMin, rr * M), ink ? null : ramp(pal.ramp, heat), a * pen, white);
      }
    }
    if (surf === 'earth') {   // clouds: a sparser layer on its own drift, only where the cloud noise is thick
      const CL = Math.round(LAT * 0.7), CO = Math.round(LON * 0.7), cspin = spin * 1.12 + t * 0.03;
      for (let la = 0; la <= CL; la++) {
        const lat = -Math.PI / 2 + la / CL * Math.PI, cl = Math.cos(lat), sl = Math.sin(lat);
        const n = Math.max(1, Math.round(Math.abs(cl) * CO));
        for (let lo = 0; lo < n; lo++) {
          const lon = lo / n * TAU;
          if (noise(lat * 2.6 + 30, lon * 2.6 - t * 0.02) < 0.6) continue;
          const [x, y, z] = proj(cl * Math.cos(lon + cspin) * Rp * 1.02, sl * Rp * 1.02, cl * Math.sin(lon + cspin) * Rp * 1.02);
          if (z < 0.05) continue;
          const C = z / Rp, lit = sunA == null ? C : Math.max(0, (x / Rp) * Math.sin(sunA) + C * Math.cos(sunA));
          dot(x, y, Math.max(rMin, (0.9 + 1.2 * C) * M), pal.ramp[2], ink ? 0.5 * lit : 0.08 + 0.55 * lit, 0.1 + 0.3 * (1 - lit));
        }
      }
    }
    if (o.spot === true) {   // a great red spot: an oval of cold-colour dots riding the southern belt
      const NSp = Math.round(40 * countScale(size, 1, 6) * lite);
      for (let i = 0; i < NSp; i++) {
        const u = Math.sqrt(E(i, 41.1)), v = E(i, 42.2) * TAU;
        const dlon = Math.cos(v) * u * 0.34, dlat = Math.sin(v) * u * 0.16, lat = -0.36 + dlat, ph = 1.2 + spin + dlon;
        const cl = Math.cos(lat);
        const [x, y, z] = proj(cl * Math.cos(ph) * Rp, Math.sin(lat) * Rp, cl * Math.sin(ph) * Rp);
        if (z < 0.05) continue;
        dot(x, y, Math.max(rMin, (0.7 + 0.9 * (1 - u)) * M), ink ? null : ramp(pal.ramp, 0.05), ink ? 0.9 : 0.4 * z / Rp, 0.22);
      }
    }
    for (const d of front) dot(...d);
    ctx.restore();
    if (o.space) paintRim(ctx, W, size);
  }

  /* ================================================================== supernova */
  // A star collapses, blows a shell outward, and the shell fades into a filamentary remnant while
  // the core rebuilds. Loops on `period` seconds.
  const CRAB = { cold: [255, 90, 60], mid: [255, 179, 71], hot: [255, 255, 255], glow: [255, 122, 60], ring: [255, 255, 255], shadow: [0, 0, 0] };
  function drawSupernova(ctx, size, t, dark, o = {}) {
    const W = o.w ?? size, half = size / 2, cx = W / 2;
    const ink = !!o.ink, pal = buildPal(o.palette || CRAB);
    const M = radiusScale(size), lite = o.lite ? 0.5 : 1, rMin = 0.3;
    const R = Math.min(size * 0.47, W * 0.48);
    const period = o.period ?? 6, p = frac(t / period);
    const proj = makeProj(t * 0.08, 0.3, 0, 0, 1);
    const ease = p => 1 - (1 - p) ** 2.4;
    const coreR = R * (p < 0.1 ? 0.06 : p < 0.85 ? 0.06 + 0.1 * (p - 0.1) / 0.75 : 0.16 - 0.1 * (p - 0.85) / 0.15);
    const NS = Math.round(260 * countScale(size, 1.2, 12) * (ink ? 0.45 : 1) * lite);   // shell
    const NC = Math.round(70 * countScale(size, 1.1, 8) * lite);                          // core
    const NRm = Math.round(120 * countScale(size, 1.1, 8) * (ink ? 0.5 : 1) * lite);     // remnant

    ctx.save();
    if (o.space) paintSpace(ctx, W, size, t, o);
    ctx.translate(cx, half);
    ctx.globalCompositeOperation = ink ? 'source-over' : 'lighter';
    const dot = dotPainter(ctx, ink, dark);

    if (!ink) {
      const flash = p < 0.14 ? 1 - p / 0.14 : 0;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * (0.25 + 0.55 * flash));
      g.addColorStop(0, rgba(pal.ramp[2], 0.25 + 0.6 * flash)); g.addColorStop(0.4, rgba(pal.glow, 0.12 + 0.3 * flash)); g.addColorStop(1, rgba(pal.glow, 0));
      ctx.fillStyle = g; ctx.fillRect(-W, -size, 2 * W, 2 * size);
    }
    // remnant: last cycle's shell, filamentary, wobbling
    for (let i = 0; i < NRm; i++) {
      const d = fib(i, NRm), rr = R * (0.78 + 0.2 * E(i, 9.1)) * (0.94 + 0.06 * noise(i * 0.4, t * 0.3));
      const [x, y, z] = proj(d[0] * rr, d[1] * rr, d[2] * rr), C = (z / R + 1) / 2;
      dot(x, y, Math.max(rMin, 0.7 * M), ink ? null : ramp(pal.ramp, 0.05 + 0.15 * C), ink ? 0.45 + 0.3 * C : 0.06 + 0.1 * C, 0.66 - 0.08 * C);
    }
    // the shell
    const sr = R * 0.9 * ease(p), thick = R * (0.02 + 0.12 * p), fade = (1 - p) ** 1.3;
    for (let i = 0; i < NS; i++) {
      const d = fib(i, NS), v = 0.8 + 0.4 * E(i, 1.1);
      const rr = sr * v + (E(i, 2.2) - 0.5) * thick;
      if (rr < coreR) continue;
      const [x, y, z] = proj(d[0] * rr, d[1] * rr, d[2] * rr), C = (z / R + 1) / 2;
      const heat = clamp01(1 - p * 1.2 + 0.2 * C);
      dot(x, y, Math.max(rMin, (0.6 + 1.6 * fade) * M), ink ? null : ramp(pal.ramp, heat),
          ink ? 0.4 + 0.6 * fade : (0.15 + 0.75 * fade) * (0.6 + 0.4 * C), 0.15 + 0.5 * p);
    }
    // core
    const hot = p < 0.1 ? 1 : p > 0.85 ? 0.6 + 0.4 * (p - 0.85) / 0.15 : 0.6;
    for (let i = 0; i < NC; i++) {
      const d = fib(i, NC);
      const px = d[0] * Math.cos(t * 0.9) + d[2] * Math.sin(t * 0.9), pz = -d[0] * Math.sin(t * 0.9) + d[2] * Math.cos(t * 0.9);
      const [x, y, z] = proj(px * coreR, d[1] * coreR, pz * coreR), C = (z / coreR + 1) / 2;
      dot(x, y, Math.max(rMin, (0.8 + 1.2 * C) * M), ink ? null : ramp(pal.ramp, 0.55 + 0.45 * hot * C),
          ink ? 0.7 + 0.3 * C : (0.5 + 0.5 * C) * hot, 0.3 - 0.22 * C);
    }
    ctx.restore();
    if (o.space) paintRim(ctx, W, size);
  }

  /* ================================================================== binary */
  // Two stars round a barycentre on a tilted orbit, a hot primary and a cooler secondary, with a
  // stream of gas pulled off the secondary curling into the primary.
  const BINARY = { cold: [255, 140, 66], mid: [255, 217, 168], hot: [223, 241, 255], glow: [159, 198, 255], ring: [255, 255, 255], shadow: [0, 0, 0] };
  function drawBinary(ctx, size, t, dark, o = {}) {
    const W = o.w ?? size, half = size / 2, cx = W / 2;
    const ink = !!o.ink, pal = buildPal(o.palette || BINARY);
    const M = radiusScale(size), lite = o.lite ? 0.5 : 1, rMin = 0.3;
    const R = Math.min(size * 0.47, W * 0.48), A = R * 0.6;
    const proj = makeProj(0.1 * Math.sin(t * 0.06), 0.5, 0, 0, 1);
    const ph = t * (o.spin ?? 0.9), q = 0.45;                                   // mass ratio
    const c = Math.cos(ph), s = Math.sin(ph);
    const P1 = [-A * q / (1 + q) * c, 0, -A * q / (1 + q) * s], P2 = [A / (1 + q) * c, 0, A / (1 + q) * s];
    const R1 = R * 0.17, R2 = R * 0.105;
    const N1 = Math.round(80 * countScale(size, 1.1, 8) * lite), N2 = Math.round(50 * countScale(size, 1.1, 8) * lite);
    const NSt = Math.round(120 * countScale(size, 1.2, 10) * (ink ? 0.5 : 1) * lite);

    ctx.save();
    if (o.space) paintSpace(ctx, W, size, t, o);
    ctx.translate(cx, half);
    ctx.globalCompositeOperation = ink ? 'source-over' : 'lighter';
    const dot = dotPainter(ctx, ink, dark);

    const [x1, y1, z1] = proj(...P1), [x2, y2, z2] = proj(...P2);
    if (!ink) {
      for (const [x, y, r, col] of [[x1, y1, R1 * 3.2, pal.glow], [x2, y2, R2 * 3, pal.ramp[0]]]) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rgba(col, 0.45)); g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g; ctx.fillRect(-W, -size, 2 * W, 2 * size);
      }
    }
    // orbit trails
    for (let i = 0; i < 64; i++) {
      const a = i / 64 * TAU, f = 0.25 + 0.75 * frac((ph - a) / TAU);      // brighter just behind each star
      const [xa, ya] = proj(-A * q / (1 + q) * Math.cos(a), 0, -A * q / (1 + q) * Math.sin(a));
      const [xb, yb] = proj(A / (1 + q) * Math.cos(a), 0, A / (1 + q) * Math.sin(a));
      dot(xa, ya, Math.max(rMin, 0.5 * M), ink ? null : ramp(pal.ramp, 0.9), ink ? 0.35 * f : 0.12 * f, 0.7);
      dot(xb, yb, Math.max(rMin, 0.5 * M), ink ? null : ramp(pal.ramp, 0.1), ink ? 0.35 * f : 0.12 * f, 0.7);
    }
    const star = (P, Rr, N, heat, w0) => {
      const [sx, sy] = proj(...P);
      for (let i = 0; i < N; i++) {
        const d = fib(i, N); if (d[2] < -0.1) continue;
        const C = (d[2] + 1) / 2;
        dot(sx + d[0] * Rr, sy + d[1] * Rr, Math.max(rMin, (0.7 + 1.3 * C) * M), ink ? null : ramp(pal.ramp, heat + 0.1 * C),
            ink ? 0.7 + 0.3 * C : 0.5 + 0.5 * C, w0 - 0.2 * C);
      }
    };
    const stream = () => {   // gas from the secondary's inner face, curling into the primary
      for (let i = 0; i < NSt; i++) {
        const a = frac(E(i, 1.1) + t * 0.35 * (0.7 + 0.6 * E(i, 2.2)));
        const lx = P2[0] + (P1[0] - P2[0]) * a, lz = P2[2] + (P1[2] - P2[2]) * a;
        const curl = Math.sin(Math.PI * a) * A * 0.28 + a * a * A * 0.2;         // lags the orbit
        const wob = (E(i, 3.3) - 0.5) * A * (0.04 + 0.12 * a);
        const x = lx + (-s) * curl + c * wob, z = lz + c * curl + s * wob;
        const [sx, sy, sz] = proj(x, (E(i, 4.4) - 0.5) * A * 0.08, z), C = (sz / A + 1) / 2;
        const f = Math.sin(Math.PI * a) ** 0.6;
        dot(sx, sy, Math.max(rMin, (0.5 + 0.9 * f) * M), ink ? null : ramp(pal.ramp, 0.15 + 0.7 * a),
            ink ? 0.4 + 0.5 * f : (0.1 + 0.5 * f) * (0.6 + 0.4 * C), 0.55 - 0.3 * a);
      }
    };
    if (z1 < z2) { star(P1, R1, N1, 0.85, 0.32); stream(); star(P2, R2, N2, 0.08, 0.4); }
    else { star(P2, R2, N2, 0.08, 0.4); stream(); star(P1, R1, N1, 0.85, 0.32); }
    ctx.restore();
    if (o.space) paintRim(ctx, W, size);
  }

  /* ================================================================== eclipse */
  // A dotted sun with a corona of streamers; the moon crosses it on `period` seconds. The corona is
  // only really visible near totality, and there is a diamond ring either side of it.
  // The photosphere turns on `spin` (radians a second): dots, granulation and sunspots all ride the
  // surface, so spots rise at one limb and set at the other. spin:0 holds it still.
  const CORONA = { cold: [255, 179, 71], mid: [255, 232, 176], hot: [255, 255, 255], glow: [255, 195, 107], ring: [255, 255, 255], shadow: [0, 0, 0] };
  function drawEclipse(ctx, size, t, dark, o = {}) {
    const W = o.w ?? size, half = size / 2, cx = W / 2;
    const ink = !!o.ink, pal = buildPal(o.palette || CORONA);
    const M = radiusScale(size), lite = o.lite ? 0.5 : 1, rMin = 0.3;
    const Rs = Math.min(size, W) * (o.radius ?? 0.2), Rm = Rs * 1.03;
    const hasMoon = o.moon !== false;                                           // moon:false = just the Sun
    const period = o.period ?? 10, p = frac(t / period);
    const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;                 // ease in-out across
    const mx = hasMoon ? (e - 0.5) * Rs * 5.2 : 1e9, my = hasMoon ? -0.25 * Rs + 0.5 * Rs * (e - 0.5) : 1e9;
    const gap = Math.hypot(mx, my);
    const total = hasMoon ? clamp01(1 - gap / (Rs * 0.35)) : 0;
    const spin = o.spin ?? 0.12, rot = t * spin, cr = Math.cos(rot), sr = Math.sin(rot);
    // sunspots sit at a fixed longitude and latitude and turn with the surface; dots inside are simply
    // not drawn. Anything on the far side is dropped, and what is near the limb is foreshortened.
    const spots = o.spots ? [0, 1, 2].map(k => {
      const lat = (E(k, 52.3) - 0.5) * 1.1, lon = E(k, 52.9) * TAU + rot, cl = Math.cos(lat);
      return { x: cl * Math.sin(lon) * Rs, y: Math.sin(lat) * Rs, z: cl * Math.cos(lon),
               r: Rs * (0.05 + 0.05 * E(k, 53.1)) };
    }).filter(sp => sp.z > 0.05).map(sp => ({ ...sp, r: sp.r * (0.4 + 0.6 * sp.z) })) : null;
    const NS = Math.round(160 * countScale(size, 1.2, 12) * (ink ? 0.5 : 1) * lite);
    const NST = Math.round(22 * countScale(size, 0.7, 4)), NPER = Math.round(10 * countScale(size, 0.8, 5) * lite);
    const inMoon = hasMoon ? (x, y) => Math.hypot(x - mx, y - my) < Rm : () => false;

    ctx.save();
    if (o.space) paintSpace(ctx, W, size, t, o);
    ctx.translate(cx, half);
    ctx.globalCompositeOperation = ink ? 'source-over' : 'lighter';
    const dot = dotPainter(ctx, ink, dark);

    if (!ink) {
      const g = ctx.createRadialGradient(0, 0, Rs * 0.8, 0, 0, Rs * (1.8 + 1.4 * total));
      g.addColorStop(0, rgba(pal.glow, 0.35 + 0.25 * total)); g.addColorStop(1, rgba(pal.glow, 0));
      ctx.fillStyle = g; ctx.fillRect(-W, -size, 2 * W, 2 * size);
    }
    // corona streamers, mostly hidden by glare until the moon covers the disc
    const ca = hasMoon ? 0.12 + 0.88 * total * total : 0.42 + 0.18 * noise(1.3, t * 0.1);
    for (let k = 0; k < NST; k++) {
      const a = k / NST * TAU + 0.15 * Math.sin(t * 0.2 + k);
      const len = Rs * (0.45 + 1.4 * noise(k * 0.7, t * 0.08) ** 1.6);
      for (let j = 0; j < NPER; j++) {
        const f = (j + 0.5) / NPER, r = Rs * 1.06 + len * f, spread = (E(j, k + 0.3) - 0.5) * 0.08 * r;
        const x = Math.cos(a) * r - Math.sin(a) * spread, y = Math.sin(a) * r + Math.cos(a) * spread;
        if (inMoon(x, y)) continue;
        dot(x, y, Math.max(rMin, (0.5 + 1.0 * (1 - f)) * M), ink ? null : ramp(pal.ramp, 0.5 + 0.4 * (1 - f)),
            (ink ? 0.9 : 0.55) * (1 - f) ** 1.2 * ca, 0.3 + 0.4 * f);
      }
    }
    // photosphere with limb darkening
    for (let i = 0; i < NS; i++) {
      const d = fib(i, NS);
      const C = d[2] * cr - d[0] * sr; if (C < 0) continue;                    // turn, then drop the far side
      const x = (d[0] * cr + d[2] * sr) * Rs, y = d[1] * Rs;
      if (inMoon(x, y)) continue;
      let a = ink ? 1 : 0.6 + 0.4 * C;
      if (spots) {
        let pen = 1;
        for (const sp of spots) { const dd = Math.hypot(x - sp.x, y - sp.y); if (dd < sp.r) { pen = 0; break; } if (dd < sp.r * 1.9) pen = Math.min(pen, 0.45); }
        if (!pen) continue;
        a *= pen * (0.72 + 0.28 * noise(d[0] * 4 + d[2] * 4, d[1] * 4 + t * 0.06));   // granulation, riding the surface
      }
      dot(x, y, Math.max(rMin, (0.9 + 1.2 * C) * M), ink ? null : ramp(pal.ramp, 0.6 + 0.4 * C), a, 0.2 - 0.14 * C);
    }
    // prominences at the limb (always on a bare Sun, during totality otherwise), diamond ring just outside it
    if (!hasMoon || total > 0.2) {
      const pa = hasMoon ? total : 0.85;
      for (let k = 0; k < 4; k++) {
        const a = E(k, 31.7) * TAU + rot * 0.4, r = Rs * (1.02 + 0.08 * E(k, 32.9) * (0.7 + 0.3 * Math.sin(t * 1.3 + k)));
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (!inMoon(x, y)) dot(x, y, Math.max(rMin, 1.3 * M), pal.ramp[0], (ink ? 1 : 0.8) * pa, 0.2);
      }
    }
    const ring = clamp01(1 - Math.abs(gap - Rs * 0.32) / (Rs * 0.28));
    if (hasMoon && ring > 0 && gap > 0.05) {
      const ux = -mx / gap, uy = -my / gap, x = ux * Rs * 0.98, y = uy * Rs * 0.98;
      if (!ink) { const g = ctx.createRadialGradient(x, y, 0, x, y, Rs * 0.7); g.addColorStop(0, rgba(pal.ramp[2], 0.9 * ring)); g.addColorStop(1, rgba(pal.ramp[2], 0)); ctx.fillStyle = g; ctx.fillRect(-W, -size, 2 * W, 2 * size); }
      dot(x, y, Math.max(rMin, (1.6 + 1.2 * ring) * M), pal.ramp[2], ring, 0.04);
    }
    // the moon: a hard disc in colour, absence in ink
    if (hasMoon && !ink) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = pal.shadow; ctx.beginPath(); ctx.arc(mx, my, Rm, 0, TAU); ctx.fill(); }
    ctx.restore();
    if (o.space) paintRim(ctx, W, size);
  }

  /* ================================================================== orrery */
  // The solar system as a clockwork model: a small Sun, eight planets on compressed orbits with
  // their own colours and relative periods, a faint asteroid belt, dotted orbit rings, seen at a tilt.
  // spin scales time. The palette colours the Sun (hot), its glow (glow) and the orbit rings (cold).
  const SOLAR = { cold: [120, 130, 170], mid: [200, 205, 220], hot: [255, 240, 200], glow: [255, 200, 100], ring: [255, 255, 255], shadow: [0, 0, 0] };
  const PLANETS = [   // orbit (of R), radius (of R), period (s), colour, name
    [0.17, 0.028, 4,  [160, 150, 140], 'mercury'], [0.25, 0.045, 7,  [240, 220, 170], 'venus'],
    [0.33, 0.048, 10, [70, 130, 220],  'earth'],   [0.41, 0.036, 15, [215, 115, 60],  'mars'],
    [0.60, 0.10,  30, [225, 195, 160], 'jupiter'], [0.72, 0.085, 45, [236, 217, 178], 'saturn'],
    [0.84, 0.062, 65, [180, 230, 235], 'uranus'],  [0.95, 0.060, 90, [60, 110, 230],  'neptune']
  ];
  function drawOrrery(ctx, size, t, dark, o = {}) {
    const W = o.w ?? size, half = size / 2, cx = W / 2;
    const ink = !!o.ink, pal = buildPal(o.palette || SOLAR);
    const M = radiusScale(size), lite = o.lite ? 0.5 : 1, rMin = 0.3;
    const R = Math.min(size * 0.47, W * 0.48), tt = t * (o.spin ?? 1);
    const proj = makeProj(0.08 * Math.sin(t * 0.04), o.tilt ?? 0.6, 0, 0, 1);
    const Rs = R * 0.075;
    const NO = Math.round(40 * countScale(size, 0.8, 4)), NB = Math.round(90 * countScale(size, 1.1, 8) * lite);

    ctx.save();
    if (o.space) paintSpace(ctx, W, size, t, o);
    ctx.translate(cx, half);
    ctx.globalCompositeOperation = ink ? 'source-over' : 'lighter';
    const dot = dotPainter(ctx, ink, dark);

    if (!ink) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.5);
      g.addColorStop(0, rgba(pal.glow, 0.45)); g.addColorStop(0.25, rgba(pal.glow, 0.12)); g.addColorStop(1, rgba(pal.glow, 0));
      ctx.fillStyle = g; ctx.fillRect(-W, -size, 2 * W, 2 * size);
    }
    // orbit rings, dotted and faint
    for (const [orb] of PLANETS) {
      for (let i = 0; i < NO; i++) {
        const a = i / NO * TAU, [x, y, z] = proj(Math.cos(a) * orb * R, 0, Math.sin(a) * orb * R), C = (z / R + 1) / 2;
        dot(x, y, Math.max(rMin, 0.45 * M), pal.ramp[0], ink ? 0.25 + 0.15 * C : 0.1 + 0.08 * C, 0.75);
      }
    }
    // asteroid belt
    for (let i = 0; i < NB; i++) {
      const a = E(i, 61.1) * TAU + tt * TAU / 22, r = R * (0.47 + 0.07 * E(i, 62.2));
      const [x, y, z] = proj(Math.cos(a) * r, (E(i, 63.3) - 0.5) * R * 0.02, Math.sin(a) * r), C = (z / R + 1) / 2;
      dot(x, y, Math.max(rMin, 0.5 * M), pal.ramp[1], ink ? 0.4 + 0.3 * C : 0.12 + 0.18 * C, 0.6);
    }
    // planets, back to front, with the Sun slotted in by depth
    const items = [];
    PLANETS.forEach(([orb, pr, T, col, name], k) => {
      const a = E(k, 64.4) * TAU + tt * TAU / T, [x, y, z] = proj(Math.cos(a) * orb * R, 0, Math.sin(a) * orb * R);
      items.push({ z, x, y, r: Math.max(1.1 * M, pr * R), col, name });
    });
    items.push({ z: 0, sun: true });
    items.sort((p, q) => p.z - q.z);
    for (const it of items) {
      if (it.sun) {
        const NS = Math.round(36 * countScale(size, 1, 6));
        for (let i = 0; i < NS; i++) {
          const d = fib(i, NS); if (d[2] < 0) continue;
          dot(d[0] * Rs, d[1] * Rs, Math.max(rMin, (0.8 + 1.1 * d[2]) * M), pal.ramp[2], ink ? 1 : 0.6 + 0.4 * d[2], 0.06 + 0.1 * (1 - d[2]));
        }
        continue;
      }
      const C = (it.z / R + 1) / 2;
      if (it.r < 2.4 * M) dot(it.x, it.y, it.r, it.col, ink ? 0.8 + 0.2 * C : 0.75 + 0.25 * C, 0.2);
      else {
        const NM = Math.min(60, Math.round(it.r * it.r));
        for (let i = 0; i < NM; i++) {
          const d = fib(i, NM); if (d[2] < 0) continue;
          dot(it.x + d[0] * it.r, it.y + d[1] * it.r, Math.max(rMin, (0.5 + 0.6 * d[2]) * M), it.col, 0.5 + 0.5 * d[2], 0.42 - 0.2 * d[2]);
        }
      }
      if (it.name === 'saturn' && it.r >= 1.8 * M) {   // a ring, once there is room for one
        const NR = Math.round(it.r * 6);
        for (let i = 0; i < NR; i++) {
          const a = i / NR * TAU, [rx, ry] = proj(Math.cos(a) * it.r * 1.9, 0, Math.sin(a) * it.r * 1.9);
          dot(it.x + rx, it.y + ry, Math.max(rMin, 0.45 * M), it.col, ink ? 0.7 : 0.55, 0.4);
        }
      }
    }
    ctx.restore();
    if (o.space) paintRim(ctx, W, size);
  }

  /* ================================================================== registry + driver */
  const MODES = {
    blackhole: { draw: drawBlackHole, defaults: EMBER,    state: 'pondering' },
    pulsar:    { draw: drawPulsar,    defaults: COBALT,   state: 'pinging' },
    galaxy:    { draw: drawGalaxy,    defaults: MILKYWAY, state: 'swirling' },
    nebula:    { draw: drawNebula,    defaults: ORION,    state: 'dreaming' },
    comet:     { draw: drawComet,     defaults: HALLEY,   state: 'rushing' },
    saturn:    { draw: drawSaturn,    defaults: SATURN,   state: 'orbiting' },
    supernova: { draw: drawSupernova, defaults: CRAB,     state: 'erupting' },
    binary:    { draw: drawBinary,    defaults: BINARY,   state: 'pairing' },
    eclipse:   { draw: drawEclipse,   defaults: CORONA,   state: 'aligning' },
    orrery:    { draw: drawOrrery,    defaults: SOLAR,    state: 'revolving' }
  };
  const STATE_TO_MODE = Object.fromEntries(Object.entries(MODES).map(([m, v]) => [v.state, m]));

  // Named bodies: a mode plus the options and palette that make it that particular object.
  // <canvas class=orb data-orb-body=andromeda>. Data attributes still override the body's options.
  const P = (cold, mid, hot, glow, ring = [255, 255, 255], shadow = [0, 0, 0]) => ({ cold, mid, hot, glow, ring, shadow });
  const BODIES = {
    // galaxies
    'milky-way':    { mode: 'galaxy',    opts: { arms: 4 } },
    'andromeda':    { mode: 'galaxy',    opts: { arms: 2, tilt: 0.5, wind: 4.4 },   palette: P([90, 120, 255], [180, 190, 255], [255, 235, 200], [120, 120, 220]) },
    'whirlpool':    { mode: 'galaxy',    opts: { arms: 2, tilt: 1.35, wind: 3 },    palette: P([70, 110, 255], [215, 200, 255], [255, 240, 220], [150, 120, 255]) },
    'sombrero':     { mode: 'galaxy',    opts: { arms: 2, tilt: 0.14, wind: 5 },    palette: P([150, 120, 200], [235, 215, 200], [255, 245, 225], [190, 160, 180]) },
    'pinwheel':     { mode: 'galaxy',    opts: { arms: 4, tilt: 1.45, wind: 2.6, knots: 0.16, scatter: 1.3 }, palette: P([80, 130, 255], [190, 205, 255], [255, 240, 205], [110, 130, 240]) },
    'triangulum':   { mode: 'galaxy',    opts: { arms: 2, tilt: 1.1, wind: 2.4, scatter: 2.2, knots: 0.18 }, palette: P([100, 150, 255], [200, 215, 255], [240, 245, 255], [120, 150, 240]) },
    'bodes':        { mode: 'galaxy',    opts: { arms: 2, tilt: 1.0, wind: 3.8 },    palette: P([120, 130, 230], [230, 205, 170], [255, 235, 180], [200, 170, 140]) },
    'southern-pinwheel': { mode: 'galaxy', opts: { arms: 3, bar: 0.3, tilt: 1.3, wind: 2.8, knots: 0.14 }, palette: P([90, 130, 255], [210, 200, 240], [255, 238, 200], [140, 130, 240]) },
    'ngc-1300':     { mode: 'galaxy',    opts: { arms: 2, bar: 0.5, tilt: 1.2, wind: 2.2, scatter: 0.7 }, palette: P([90, 120, 255], [200, 190, 240], [255, 230, 190], [130, 120, 230]) },
    'magellanic':   { mode: 'galaxy',    opts: { arms: 1, bar: 0.45, tilt: 1.2, wind: 1.5, scatter: 2.4, knots: 0.2, omega: 0.1 }, palette: P([110, 140, 255], [220, 200, 240], [255, 225, 235], [150, 130, 240]) },
    'cartwheel':    { mode: 'galaxy',    opts: { arms: 9, ring: 0.14, spokes: 0.3, tilt: 1.2, omega: 0.08 }, palette: P([90, 140, 255], [180, 200, 255], [255, 230, 170], [120, 150, 255]) },
    'cigar':        { mode: 'galaxy',    opts: { arms: 2, tilt: 0.1, wind: 5, plume: 0.75 }, palette: P([200, 150, 120], [255, 90, 60], [255, 240, 210], [220, 120, 90]) },
    // nebulae
    'orion':        { mode: 'nebula' },
    'crab-nebula':  { mode: 'nebula',    opts: { clouds: 4, starN: 1 },                  palette: P([60, 180, 140], [255, 120, 80], [255, 240, 220], [200, 90, 120]) },
    'pillars':      { mode: 'nebula',    opts: { clouds: 3, starN: 2 },                  palette: P([30, 110, 120], [200, 150, 60], [255, 240, 200], [120, 120, 60]) },
    'carina':       { mode: 'nebula',    opts: { clouds: 6, starN: 6 },                  palette: P([120, 60, 160], [255, 140, 100], [255, 235, 210], [200, 100, 140]) },
    // black holes
    'gargantua':    { mode: 'blackhole' },
    'm87':          { mode: 'blackhole', opts: { reach: 2.6, omega: 1.2 },               palette: P([180, 60, 10], [255, 140, 30], [255, 230, 160], [255, 120, 20]) },
    // pulsars
    'crab-pulsar':  { mode: 'pulsar',    opts: { spin: 6.5, tilt: 0.5 } },
    'vela':         { mode: 'pulsar',    opts: { spin: 2.4, tilt: 0.9 },                 palette: P([120, 60, 220], [190, 160, 255], [240, 235, 255], [150, 100, 255]) },
    // comets
    'halley':       { mode: 'comet' },
    'hale-bopp':    { mode: 'comet',     opts: { spin: 0.7 },                            palette: P([60, 140, 255], [255, 220, 150], [255, 255, 240], [200, 190, 255]) },
    'neowise':      { mode: 'comet',     opts: { spin: 1.3 },                            palette: P([255, 180, 90], [255, 220, 170], [255, 250, 235], [255, 190, 110]) },
    // planets
    'saturn':       { mode: 'saturn' },
    'jupiter':      { mode: 'saturn',    opts: { rings: false, spot: true, spin: 0.55 }, palette: P([190, 90, 60], [225, 195, 160], [255, 242, 225], [210, 170, 130]) },
    'uranus':       { mode: 'saturn',    opts: { tilt: 1.35, spin: 0.25 },               palette: P([90, 170, 190], [180, 230, 235], [235, 250, 250], [120, 200, 210]) },
    'earth':        { mode: 'saturn',    opts: { rings: false, surface: 'earth', phase: 0.12, spin: 0.3, tilt: 0.4 },  palette: P([25, 80, 190], [80, 150, 80], [240, 245, 250], [90, 150, 255]) },
    'mars':         { mode: 'saturn',    opts: { rings: false, surface: 'mars', phase: 0.12, spin: 0.28, tilt: 0.35 }, palette: P([140, 55, 30], [215, 115, 60], [255, 240, 230], [220, 120, 70]) },
    'moon':         { mode: 'saturn',    opts: { rings: false, surface: 'moon', phase: 'cycle', period: 24, spin: 0.06, tilt: 0.05 }, palette: P([105, 105, 115], [190, 190, 195], [245, 245, 245], [120, 120, 135]) },
    'jupiter-moons': { mode: 'saturn',   opts: { rings: false, spot: true, spin: 0.55, tilt: 0.12,
                       moons: [{ a: 1.75, r: 0.085, T: 5, heat: 0.6, phase0: 0 }, { a: 2.15, r: 0.075, T: 10, heat: 0.95, phase0: 1.2 },
                               { a: 2.55, r: 0.125, T: 20, heat: 0.5, phase0: 2.6 }, { a: 2.95, r: 0.11, T: 46, heat: 0.15, phase0: 4.1 }] },
                      palette: P([190, 90, 60], [225, 195, 160], [255, 242, 225], [210, 170, 130]) },
    'venus':        { mode: 'saturn',    opts: { rings: false, bandAmp: 0.1, spin: -0.08, tilt: 0.15, phase: 0.18 }, palette: P([200, 160, 90], [240, 220, 170], [255, 250, 235], [240, 215, 150]) },
    'pluto':        { mode: 'saturn',    opts: { rings: false, surface: 'pluto', spin: 0.12, tilt: 0.3, phase: 0.14 }, palette: P([110, 60, 50], [190, 160, 140], [245, 235, 225], [180, 150, 140]) },
    'neptune':      { mode: 'saturn',    opts: { rings: false, spot: 'dark', streaks: true, spin: 0.4, tilt: 0.5, phase: 0.1 }, palette: P([30, 60, 180], [60, 110, 230], [200, 225, 255], [70, 120, 255]) },
    'mercury':      { mode: 'saturn',    opts: { rings: false, surface: 'mercury', phase: 0.22, spin: 0.05, tilt: 0.1 }, palette: P([90, 80, 75], [160, 150, 140], [225, 220, 210], [120, 110, 105]) },
    'earth-moon':   { mode: 'saturn',    opts: { rings: false, surface: 'earth', phase: 0.12, spin: 0.3, tilt: 0.35,
                       moons: [{ a: 2.7, r: 0.27, T: 14, heat: 0.5, col: [200, 200, 205], phase0: 0.8 }] },
                      palette: P([25, 80, 190], [80, 150, 80], [240, 245, 250], [90, 150, 255]) },
    // the whole thing
    'solar-system': { mode: 'orrery' },
    // the sun
    'sun':          { mode: 'eclipse',   opts: { moon: false, spots: true, radius: 0.24 } },
    // supernovae
    'sn1987a':      { mode: 'supernova' },
    'cassiopeia-a': { mode: 'supernova', opts: { period: 8 },                            palette: P([60, 200, 170], [255, 110, 90], [255, 245, 230], [90, 170, 190]) },
    // binaries
    'albireo':      { mode: 'binary' },
    'sirius':       { mode: 'binary',    opts: { spin: 0.7 },                            palette: P([200, 220, 255], [235, 240, 255], [255, 255, 255], [170, 200, 255]) },
    // eclipses
    'totality':     { mode: 'eclipse' }
  };
  BODIES.galilean = BODIES['jupiter-moons'];
  // named bodies by family, in display order (aliases left out)
  const GROUPS = {
    'Solar system': ['sun', 'mercury', 'venus', 'earth', 'moon', 'earth-moon', 'mars', 'jupiter', 'jupiter-moons', 'saturn', 'uranus', 'neptune', 'pluto', 'solar-system', 'totality'],
    'Comets': ['halley', 'hale-bopp', 'neowise'],
    'Stars': ['sirius', 'albireo', 'crab-pulsar', 'vela', 'sn1987a', 'cassiopeia-a'],
    'Black holes': ['gargantua', 'm87'],
    'Nebulae': ['orion', 'crab-nebula', 'pillars', 'carina'],
    'Galaxies': ['milky-way', 'andromeda', 'triangulum', 'magellanic', 'whirlpool', 'pinwheel', 'southern-pinwheel', 'bodes', 'sombrero', 'ngc-1300', 'cartwheel', 'cigar']
  };
  BODIES.lmc = BODIES.magellanic; BODIES.m82 = BODIES.cigar; BODIES.m101 = BODIES.pinwheel; BODIES.m33 = BODIES.triangulum; BODIES.m81 = BODIES.bodes; BODIES.m83 = BODIES['southern-pinwheel'];

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
    const body = BODIES[canvas.dataset.orbBody] || null;
    const modeName = canvas.dataset.orbMode || (body && body.mode) || STATE_TO_MODE[canvas.dataset.orbState] || 'blackhole';
    const mode = MODES[modeName] || MODES.blackhole;
    const defaults = (body && body.palette) || mode.defaults;
    const w = parseInt(canvas.getAttribute('width') || '', 10) || 64;
    const size = parseInt(canvas.getAttribute('height') || '', 10) || w;
    const dpr = Math.min(2, window.devicePixelRatio || 1);     // past 2 the dots cost more than they show
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(size * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = size + 'px';
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const ds = canvas.dataset;
    const own = { arms: num(ds.orbArms), spin: num(ds.orbSpin), tilt: num(ds.orbTilt),
                  clouds: num(ds.orbClouds), starN: num(ds.orbStars), period: num(ds.orbPeriod),
                  phase: ds.orbPhase === 'cycle' ? 'cycle' : num(ds.orbPhase), surface: ds.orbSurface };
    for (const k in own) if (own[k] === undefined) delete own[k];
    const opts = { ...(body ? body.opts : null), ...own, w, ink: ds.orbInk === '1', lite: ds.orbLite === '1', space: ds.orbSpace === '1' };
    const paint = t => {
      opts.palette = readPalette(canvas, defaults) || (body && body.palette) || null;   // every frame, so themes and :hover apply live
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
    version: '0.9.3',
    register, mount, MODES, STATE_TO_MODE, BODIES, GROUPS,
    draw: (mode, ctx, size, t, dark, opts) => MODES[mode].draw(ctx, size, t, dark, opts),
    // draw a named body: Ephemeris.body('andromeda', ctx, 64, t, dark, { lite: true })
    body: (name, ctx, size, t, dark, opts) => {
      const b = BODIES[name]; if (!b) throw new Error('ephemeris: unknown body ' + name);
      return MODES[b.mode].draw(ctx, size, t, dark, { ...b.opts, palette: b.palette || null, ...opts });
    },
    palette: { keys: KEYS, build: buildPal, read: readPalette, parse: parseCol, ramp },
    _: { E, fib, makeProj, paintSpace, paintRim, dotPainter }
  };
});
