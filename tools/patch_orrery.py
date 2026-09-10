"""One-off: orrery mode (solar-system body) and earth-moon; per-moon colour; 0.7.0."""
import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

def rep(s, a, b, count=1):
    assert s.count(a) == count, (a[:70], s.count(a)); return s.replace(a, b)

p = 'src/ephemeris.js'; s = open(p, encoding='utf-8').read()

# per-moon colour override
s = rep(s, "        if (r < 2.4 * M) list.push([x, y, r, ink ? null : ramp(pal.ramp, m.heat), 1, 0.25]);",
           "        const mc = m.col || null;\n        if (r < 2.4 * M) list.push([x, y, r, ink ? null : (mc || ramp(pal.ramp, m.heat)), 1, 0.25]);")
s = rep(s, "            list.push([x + d[0] * r, y + d[1] * r, Math.max(rMin, (0.5 + 0.6 * d[2]) * M), ink ? null : ramp(pal.ramp, m.heat + 0.08 * d[2]), 0.5 + 0.5 * d[2], 0.42 - 0.2 * d[2]]);",
           "            list.push([x + d[0] * r, y + d[1] * r, Math.max(rMin, (0.5 + 0.6 * d[2]) * M), ink ? null : (mc || ramp(pal.ramp, m.heat + 0.08 * d[2])), 0.5 + 0.5 * d[2], 0.42 - 0.2 * d[2]]);")

# orrery mode before the registry
s = rep(s, "  /* ================================================================== registry + driver */", r"""  /* ================================================================== orrery */
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

  /* ================================================================== registry + driver */""")
s = rep(s, "    eclipse:   { draw: drawEclipse,   defaults: CORONA,   state: 'aligning' }\n  };",
           "    eclipse:   { draw: drawEclipse,   defaults: CORONA,   state: 'aligning' },\n    orrery:    { draw: drawOrrery,    defaults: SOLAR,    state: 'revolving' }\n  };")
s = rep(s, "    // the sun\n    'sun':", """    'earth-moon':   { mode: 'saturn',    opts: { rings: false, surface: 'earth', phase: 0.12, spin: 0.3, tilt: 0.35,
                       moons: [{ a: 2.7, r: 0.27, T: 14, heat: 0.5, col: [200, 200, 205], phase0: 0.8 }] },
                      palette: P([25, 80, 190], [80, 150, 80], [240, 245, 250], [90, 150, 255]) },
    // the whole thing
    'solar-system': { mode: 'orrery' },
    // the sun
    'sun':""")
s = rep(s, '/*! ephemeris 0.6.0', '/*! ephemeris 0.7.0'); s = rep(s, "    version: '0.6.0',", "    version: '0.7.0',")
open(p, 'w', encoding='utf-8').write(s)

# demo: cards + playground knobs for orrery
p = 'index.html'; h = open(p, encoding='utf-8').read()
pluto = '<div class="nm">Pluto</div><div class="meta">pluto · saturn<br>tan, maroon, and the heart</div></div>'
h = rep(h, pluto, pluto + '\n' +
  '      <div class="cell" data-pick="earth-moon" role="button" tabindex="0"><div class="orbwrap"><canvas class="orb" width="200" height="150" data-orb-body="earth-moon"></canvas></div><div class="nm">Earth and Moon</div><div class="meta">earth-moon · saturn<br>the pair, moon on a 14 s orbit</div></div>\n'
  '      <div class="cell" data-pick="solar-system" role="button" tabindex="0"><div class="orbwrap"><canvas class="orb" width="200" height="150" data-orb-body="solar-system"></canvas></div><div class="nm">The Solar System</div><div class="meta">solar-system · orrery<br>eight planets, the belt, Saturn\'s ring</div></div>')
h = rep(h, """  const MODE_KNOBS = { pulsar: ['spin', 'tilt'], saturn: ['spin', 'tilt', 'phase', 'period'], galaxy: ['arms'], nebula: ['clouds', 'stars'],
                       supernova: ['period'], eclipse: ['period'], binary: ['spin'], comet: ['spin'], blackhole: [] };""",
           """  // only spin and tilt get sliders; period, phase, arms, clouds, stars stay in the README for people to find
  const MODE_KNOBS = { pulsar: ['spin', 'tilt'], saturn: ['spin', 'tilt'], galaxy: [], nebula: [], supernova: [], eclipse: [],
                       binary: ['spin'], comet: ['spin'], blackhole: [], orrery: ['spin', 'tilt'] };""")
h = rep(h, 'Nine kinds of body and thirty-two named ones', 'Ten kinds of body and thirty-four named ones')
h = rep(h, 'ephemeris 0.6.0 · dot-celestials', 'ephemeris 0.7.0 · dot-celestials')
h = rep(h, '        <li><b>data-orb-mode</b> blackhole · pulsar · galaxy · nebula · comet · saturn · supernova · binary · eclipse, or the matching <b>data-orb-state</b></li>',
           '        <li><b>data-orb-mode</b> blackhole · pulsar · galaxy · nebula · comet · saturn · supernova · binary · eclipse · orrery, or the matching <b>data-orb-state</b></li>')
open(p, 'w', encoding='utf-8').write(h)

p = 'README.md'; r = open(p, encoding='utf-8').read()
r = rep(r, 'Nine kinds of body, and named presets for thirty-two real ones:', 'Ten kinds of body, and named presets for thirty-four real ones:')
r = rep(r, "| `eclipse` | aligning | a dotted sun with a corona of streamers; the moon crosses it, corona and prominences show near totality, diamond ring either side |",
           "| `eclipse` | aligning | a dotted sun with a corona of streamers; the moon crosses it, corona and prominences show near totality, diamond ring either side |\n| `orrery` | revolving | the solar system as a clockwork model: a small Sun, eight planets on compressed orbits at their relative periods, the asteroid belt, Saturn's ring, dotted orbits, seen at a tilt |")
r = rep(r, "| | | | `pluto` | saturn, tan and maroon, the heart |",
           "| | | | `pluto` | saturn, tan and maroon, the heart |\n| | | | `earth-moon` | saturn, Earth with the Moon in orbit |\n| | | | `solar-system` | orrery |")
r = rep(r, "| `data-orb-mode` | `blackhole` `pulsar` `galaxy` `nebula` `comet` `saturn` `supernova` `binary` `eclipse` | which kind of body |",
           "| `data-orb-mode` | `blackhole` `pulsar` `galaxy` `nebula` `comet` `saturn` `supernova` `binary` `eclipse` `orrery` | which kind of body |")
r = rep(r, "| `data-orb-state` | `pondering` `pinging` `swirling` `dreaming` `rushing` `orbiting` `erupting` `pairing` `aligning` | same thing, as a state name |",
           "| `data-orb-state` | `pondering` `pinging` `swirling` `dreaming` `rushing` `orbiting` `erupting` `pairing` `aligning` `revolving` | same thing, as a state name |")
r = rep(r, "| `data-orb-spin` | number | pulsar spin (4.2), saturn rotation (0.35), binary orbit (0.9), comet flow (1) |",
           "| `data-orb-spin` | number | pulsar spin (4.2), saturn rotation (0.35), binary orbit (0.9), comet flow (1), orrery time scale (1) |")
r = rep(r, 'ephemeris@v0.6.0/src/ephemeris.js', 'ephemeris@v0.7.0/src/ephemeris.js')
open(p, 'w', encoding='utf-8').write(r)
j = open('package.json', encoding='utf-8').read(); j = rep(j, '"version": "0.6.0"', '"version": "0.7.0"'); open('package.json', 'w', encoding='utf-8').write(j)

p = '../tonkatuff.com/index.html'; w = open(p, encoding='utf-8').read()
w = rep(w, 'ephemeris@v0.6.0/src/ephemeris.js', 'ephemeris@v0.7.0/src/ephemeris.js', 2)
w = rep(w, '<h3>Ephemeris <span class="ver mono">0.6.0</span></h3>', '<h3>Ephemeris <span class="ver mono">0.7.0</span></h3>')
w = rep(w, 'Nine kinds of body and thirty-two\n          named ones', 'Ten kinds of body and thirty-four\n          named ones')
w = rep(w, '<span class="tag">32 named bodies</span>', '<span class="tag">34 named bodies</span>')
w = rep(w, '<canvas class="orb" width="88" height="88" data-orb-body="jupiter"></canvas></div>', '<canvas class="orb" width="88" height="88" data-orb-body="solar-system"></canvas></div>')
open(p, 'w', encoding='utf-8').write(w)
print('patched')
