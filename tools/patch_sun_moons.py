"""One-off: Sun (eclipse mode without a moon) and Galilean moons on the planet mode."""
import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
p = 'src/ephemeris.js'; s = open(p, encoding='utf-8').read()

def rep(a, b, count=1):
    global s
    assert s.count(a) == count, (a[:70], s.count(a)); s = s.replace(a, b)

# ---- eclipse: optional moon, sunspots, granulation, radius
rep("""    const Rs = Math.min(size * 0.2, W * 0.2), Rm = Rs * 1.03;
    const period = o.period ?? 10, p = frac(t / period);
    const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;                 // ease in-out across
    const mx = (e - 0.5) * Rs * 5.2, my = -0.25 * Rs + 0.5 * Rs * (e - 0.5);
    const gap = Math.hypot(mx, my), cover = clamp01(1 - gap / (Rs + Rm));
    const total = clamp01(1 - gap / (Rs * 0.35));""",
"""    const Rs = Math.min(size, W) * (o.radius ?? 0.2), Rm = Rs * 1.03;
    const hasMoon = o.moon !== false;                                           // moon:false = just the Sun
    const period = o.period ?? 10, p = frac(t / period);
    const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;                 // ease in-out across
    const mx = hasMoon ? (e - 0.5) * Rs * 5.2 : 1e9, my = hasMoon ? -0.25 * Rs + 0.5 * Rs * (e - 0.5) : 1e9;
    const gap = Math.hypot(mx, my);
    const total = hasMoon ? clamp01(1 - gap / (Rs * 0.35)) : 0;
    // sunspots drift across the face with the rotation; dots inside are simply not drawn
    const spots = o.spots ? [0, 1, 2].map(k => ({ x: Rs * 0.85 * Math.sin(t * 0.04 + k * 2.1), y: Rs * (E(k, 52.3) - 0.5) * 0.9, r: Rs * (0.05 + 0.05 * E(k, 53.1)) })) : null;""")
rep("    const inMoon = (x, y) => Math.hypot(x - mx, y - my) < Rm;",
    "    const inMoon = hasMoon ? (x, y) => Math.hypot(x - mx, y - my) < Rm : () => false;")
rep("    const ca = 0.12 + 0.88 * total * total;",
    "    const ca = hasMoon ? 0.12 + 0.88 * total * total : 0.42 + 0.18 * noise(1.3, t * 0.1);")
rep("""      const d = fib(i, NS); if (d[2] < 0) continue;
      const x = d[0] * Rs, y = d[1] * Rs, C = d[2];
      if (inMoon(x, y)) continue;
      dot(x, y, Math.max(rMin, (0.9 + 1.2 * C) * M), ink ? null : ramp(pal.ramp, 0.6 + 0.4 * C), ink ? 1 : 0.6 + 0.4 * C, 0.2 - 0.14 * C);""",
"""      const d = fib(i, NS); if (d[2] < 0) continue;
      const x = d[0] * Rs, y = d[1] * Rs, C = d[2];
      if (inMoon(x, y)) continue;
      let a = ink ? 1 : 0.6 + 0.4 * C;
      if (spots) {
        let pen = 1;
        for (const sp of spots) { const dd = Math.hypot(x - sp.x, y - sp.y); if (dd < sp.r) { pen = 0; break; } if (dd < sp.r * 1.9) pen = Math.min(pen, 0.45); }
        if (!pen) continue;
        a *= pen * (0.72 + 0.28 * noise(x / Rs * 4 + t * 0.1, y / Rs * 4));   // granulation
      }
      dot(x, y, Math.max(rMin, (0.9 + 1.2 * C) * M), ink ? null : ramp(pal.ramp, 0.6 + 0.4 * C), a, 0.2 - 0.14 * C);""")
rep("""    // prominences at the limb during totality, diamond ring just outside it
    if (total > 0.2) {
      for (let k = 0; k < 4; k++) {
        const a = E(k, 31.7) * TAU + t * 0.05, r = Rs * (1.02 + 0.08 * E(k, 32.9) * (0.7 + 0.3 * Math.sin(t * 1.3 + k)));
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (!inMoon(x, y)) dot(x, y, Math.max(rMin, 1.3 * M), pal.ramp[0], (ink ? 1 : 0.8) * total, 0.2);
      }
    }""",
"""    // prominences at the limb (always on a bare Sun, during totality otherwise), diamond ring just outside it
    if (!hasMoon || total > 0.2) {
      const pa = hasMoon ? total : 0.85;
      for (let k = 0; k < 4; k++) {
        const a = E(k, 31.7) * TAU + t * 0.05, r = Rs * (1.02 + 0.08 * E(k, 32.9) * (0.7 + 0.3 * Math.sin(t * 1.3 + k)));
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (!inMoon(x, y)) dot(x, y, Math.max(rMin, 1.3 * M), pal.ramp[0], (ink ? 1 : 0.8) * pa, 0.2);
      }
    }""")
rep("    if (ring > 0 && gap > 0.05) {", "    if (hasMoon && ring > 0 && gap > 0.05) {")
rep("    if (!ink) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = pal.shadow; ctx.beginPath(); ctx.arc(mx, my, Rm, 0, TAU); ctx.fill(); }",
    "    if (hasMoon && !ink) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = pal.shadow; ctx.beginPath(); ctx.arc(mx, my, Rm, 0, TAU); ctx.fill(); }")

# ---- saturn: moons
rep("    const Rp = Math.min(size, W) * (o.rings === false ? 0.36 : 0.2);          // ringless globes fill the orb",
"""    // moons: [{ a (orbit, planet radii), r (moon radius, planet radii), T (seconds), heat, phase0 }]
    const moons = o.moons || null, maxA = moons ? Math.max(...moons.map(m => m.a)) : 0;
    const Rp = Math.min(size, W) * (moons ? 0.15 : o.rings === false ? 0.36 : 0.2);   // ringless globes fill the orb
    const ax = moons ? Math.min(1.8, Math.max(1, W * 0.47 / (maxA * Rp))) : 1;       // a wide canvas spreads the orbits""")
rep("""    for (const d of back) dot(...d);
    // planet, front hemisphere.""",
"""    if (moons) {   // each moon: a dot at small sizes, a mini sphere when there is room; hidden behind the planet
      for (const m of moons) {
        const th = t * TAU / m.T + (m.phase0 || 0), a = m.a * Rp * ax;
        const [x, y, z] = proj(Math.cos(th) * a, 0, Math.sin(th) * a);
        if (z < 0 && Math.hypot(x, y) < Rp) continue;
        const r = Math.max(1.1 * M, m.r * Rp), list = z < 0 ? back : front;
        if (r < 2.4 * M) list.push([x, y, r, ink ? null : ramp(pal.ramp, m.heat), 1, 0.25]);
        else {
          const NM = Math.min(48, Math.round(r * r * 0.9));
          for (let i = 0; i < NM; i++) {
            const d = fib(i, NM); if (d[2] < 0) continue;
            list.push([x + d[0] * r, y + d[1] * r, Math.max(rMin, (0.5 + 0.6 * d[2]) * M), ink ? null : ramp(pal.ramp, m.heat + 0.08 * d[2]), 0.5 + 0.5 * d[2], 0.42 - 0.2 * d[2]]);
          }
        }
      }
    }
    for (const d of back) dot(...d);
    // planet, front hemisphere.""")

# ---- bodies
rep("    'moon':         { mode: 'saturn',    opts: { rings: false, surface: 'moon', phase: 'cycle', period: 24, spin: 0.06, tilt: 0.05 }, palette: P([105, 105, 115], [190, 190, 195], [245, 245, 245], [120, 120, 135]) },",
"""    'moon':         { mode: 'saturn',    opts: { rings: false, surface: 'moon', phase: 'cycle', period: 24, spin: 0.06, tilt: 0.05 }, palette: P([105, 105, 115], [190, 190, 195], [245, 245, 245], [120, 120, 135]) },
    'jupiter-moons': { mode: 'saturn',   opts: { rings: false, spot: true, spin: 0.55, tilt: 0.12,
                       moons: [{ a: 1.75, r: 0.085, T: 5, heat: 0.6, phase0: 0 }, { a: 2.15, r: 0.075, T: 10, heat: 0.95, phase0: 1.2 },
                               { a: 2.55, r: 0.125, T: 20, heat: 0.5, phase0: 2.6 }, { a: 2.95, r: 0.11, T: 46, heat: 0.15, phase0: 4.1 }] },
                      palette: P([190, 90, 60], [225, 195, 160], [255, 242, 225], [210, 170, 130]) },
    // the sun
    'sun':          { mode: 'eclipse',   opts: { moon: false, spots: true, radius: 0.24 } },""")
rep("    'totality':     { mode: 'eclipse' }\n  };", "    'totality':     { mode: 'eclipse' }\n  };\n  BODIES.galilean = BODIES['jupiter-moons'];")
open(p, 'w', encoding='utf-8').write(s); print('engine patched')
