"""One-off: bar / ring / scatter / plume knobs on the galaxy mode and eight named galaxies; 0.8.0."""
import os, re
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

def rep(s, a, b, count=1):
    assert s.count(a) == count, (a[:70], s.count(a)); return s.replace(a, b)

p = 'src/ephemeris.js'; s = open(p, encoding='utf-8').read()
s = rep(s, "  // turning slowly. `arms` picks the count (4 = Milky Way, 2 = a grand-design like M51).",
"""  // turning slowly. `arms` picks the count (4 = Milky Way, 2 = a grand-design like M51).
  // bar: length of a central bar as a fraction of the disk radius; arms start from its ends (M83, NGC 1300)
  // ring: width of a bright outer ring instead of arms, `spokes` = fraction of dots on radial spokes (Cartwheel)
  // scatter: across-arm spread multiplier, 2+ makes a loose flocculent spiral (Triangulum)
  // knots: fraction of arm dots that are bright H II knots, 0.07 default
  // plume: height of a vertical outflow from the core as a fraction of the radius (M82)""")
s = rep(s, "    const arms = o.arms ?? 4, k = o.wind ?? 3.4;         // wind = 1/tan(pitch angle) ≈ 16°",
"""    const arms = o.arms ?? 4, k = o.wind ?? 3.4;         // wind = 1/tan(pitch angle) ≈ 16°
    const bar = o.bar ?? 0, ring = o.ring ?? 0, spokes = o.spokes ?? 0.25, plume = o.plume ?? 0;
    const scat = o.scatter ?? 1, knotAt = 1 - (o.knots ?? 0.07), r0 = R * (bar || 0.13);""")
s = rep(s, """      if (i < NBULGE) {                                  // bulge: flattened spheroid, hot
        const p = fib(i, NBULGE), rb = R * 0.2 * E(i, 5.5) ** 0.6;""",
"""      if (i < NBULGE && bar && E(i, 7.7) < 0.6) {       // bar: a rod of bulge stars, turning with the pattern
        const L = (E(i, 5.5) - 0.5) * 2 * bar * R, wd = (E(i, 6.6) - 0.5) * 0.1 * R, n = Math.abs(L) / (bar * R);
        x = Math.cos(turn) * L - Math.sin(turn) * wd; z = Math.sin(turn) * L + Math.cos(turn) * wd; y = (E(i, 4.4) - 0.5) * 0.04 * R;
        heat = 0.8; a = 0.5 + 0.4 * (1 - n); white = 0.15 + 0.25 * n; rr = (0.8 + 0.8 * (1 - n)) * M;
      } else if (i < NBULGE) {                           // bulge: flattened spheroid, hot
        const p = fib(i, NBULGE), rb = R * (ring ? 0.1 : 0.2) * E(i, 5.5) ** 0.6;""")
s = rep(s, """      } else {                                           // arms: log spiral θ = θ0 + k·ln(r/r0), scattered
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
      }""",
"""      } else if (plume && E(i, 6.1) < 0.35) {           // plume: outflow above and below the core
        const sP = E(i, 1.3), up = E(i, 2.7) < 0.5 ? -1 : 1;
        y = up * plume * R * sP ** 0.8; x = (E(i, 3.9) - 0.5) * R * (0.12 + 0.3 * sP); z = (E(i, 4.1) - 0.5) * 0.15 * R;
        heat = 0.5; a = 0.1 + 0.5 * (1 - sP); white = 0.3 + 0.4 * sP; rr = (0.6 + 0.6 * (1 - sP)) * M;
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
      }""")
s = rep(s, "    'sombrero':     { mode: 'galaxy',    opts: { arms: 2, pitchAngle: 0.14, wind: 5 },    palette: P([150, 120, 200], [235, 215, 200], [255, 245, 225], [190, 160, 180]) },",
"""    'sombrero':     { mode: 'galaxy',    opts: { arms: 2, pitchAngle: 0.14, wind: 5 },    palette: P([150, 120, 200], [235, 215, 200], [255, 245, 225], [190, 160, 180]) },
    'pinwheel':     { mode: 'galaxy',    opts: { arms: 4, pitchAngle: 1.45, wind: 2.6, knots: 0.16, scatter: 1.3 }, palette: P([80, 130, 255], [190, 205, 255], [255, 240, 205], [110, 130, 240]) },
    'triangulum':   { mode: 'galaxy',    opts: { arms: 2, pitchAngle: 1.1, wind: 2.4, scatter: 2.2, knots: 0.18 }, palette: P([100, 150, 255], [200, 215, 255], [240, 245, 255], [120, 150, 240]) },
    'bodes':        { mode: 'galaxy',    opts: { arms: 2, pitchAngle: 1.0, wind: 3.8 },    palette: P([120, 130, 230], [230, 205, 170], [255, 235, 180], [200, 170, 140]) },
    'southern-pinwheel': { mode: 'galaxy', opts: { arms: 3, bar: 0.3, pitchAngle: 1.3, wind: 2.8, knots: 0.14 }, palette: P([90, 130, 255], [210, 200, 240], [255, 238, 200], [140, 130, 240]) },
    'ngc-1300':     { mode: 'galaxy',    opts: { arms: 2, bar: 0.5, pitchAngle: 1.2, wind: 2.2, scatter: 0.7 }, palette: P([90, 120, 255], [200, 190, 240], [255, 230, 190], [130, 120, 230]) },
    'magellanic':   { mode: 'galaxy',    opts: { arms: 1, bar: 0.45, pitchAngle: 1.2, wind: 1.5, scatter: 3, knots: 0.2, omega: 0.1 }, palette: P([110, 140, 255], [220, 200, 240], [255, 225, 235], [150, 130, 240]) },
    'cartwheel':    { mode: 'galaxy',    opts: { arms: 9, ring: 0.14, spokes: 0.3, pitchAngle: 1.2, omega: 0.08 }, palette: P([90, 140, 255], [180, 200, 255], [255, 230, 170], [120, 150, 255]) },
    'cigar':        { mode: 'galaxy',    opts: { arms: 2, pitchAngle: 0.1, wind: 5, plume: 0.75 }, palette: P([200, 150, 120], [255, 90, 60], [255, 240, 210], [220, 120, 90]) },""")
s = rep(s, "  BODIES.galilean = BODIES['jupiter-moons'];", "  BODIES.galilean = BODIES['jupiter-moons'];\n  BODIES.lmc = BODIES.magellanic; BODIES.m82 = BODIES.cigar; BODIES.m101 = BODIES.pinwheel; BODIES.m33 = BODIES.triangulum; BODIES.m81 = BODIES.bodes; BODIES.m83 = BODIES['southern-pinwheel'];")
s = rep(s, '/*! ephemeris 0.7.1', '/*! ephemeris 0.8.0'); s = rep(s, "    version: '0.7.1',", "    version: '0.8.0',")
open(p, 'w', encoding='utf-8').write(s)

p = 'index.html'; h = open(p, encoding='utf-8').read()
card = lambda key, nm, meta, w=150: f'      <div class="cell" data-pick="{key}" role="button" tabindex="0"><div class="orbwrap"><canvas class="orb" width="{w}" height="150" data-orb-body="{key}"></canvas></div><div class="nm">{nm}</div><div class="meta">{key} · galaxy<br>{meta}</div></div>\n'
somb = '<div class="nm">Sombrero</div><div class="meta">sombrero · galaxy<br>M104, edge-on</div></div>\n'
h = rep(h, somb, somb
  + card('pinwheel', 'Pinwheel', 'M101, face-on, knotted arms')
  + card('triangulum', 'Triangulum', 'M33, loose flocculent spiral')
  + card('bodes', "Bode's", 'M81, warm gold core')
  + card('southern-pinwheel', 'Southern Pinwheel', 'M83, three arms off a bar')
  + card('ngc-1300', 'NGC 1300', 'the classic barred spiral')
  + card('magellanic', 'Large Magellanic Cloud', 'irregular, a bar and a stub arm')
  + card('cartwheel', 'Cartwheel', 'a ring, spokes, a small nucleus')
  + card('cigar', 'Cigar', 'M82, edge-on, plumes off the core', 200))
h = rep(h, 'Ten kinds of body and thirty-four named ones', 'Ten kinds of body and forty-two named ones')
h = rep(h, 'ephemeris 0.7.1 · dot-celestials', 'ephemeris 0.8.0 · dot-celestials')
open(p, 'w', encoding='utf-8').write(h)

p = 'README.md'; r = open(p, encoding='utf-8').read()
r = rep(r, 'named presets for thirty-four real ones:', 'named presets for forty-two real ones:')
# append rows at the end of the body table
m = re.search(r"(\| body \| mode \| \| body \| mode \|\n\|---\|---\|---\|---\|---\|\n(?:\|.*\|\n)+)", r)
rows = ("| `pinwheel` | galaxy, M101, face-on, knotted | | | |\n| `triangulum` | galaxy, M33, loose flocculent | | | |\n"
        "| `bodes` | galaxy, M81, warm gold core | | | |\n| `southern-pinwheel` | galaxy, M83, three arms off a bar | | | |\n"
        "| `ngc-1300` | galaxy, barred spiral | | | |\n| `magellanic` | galaxy, LMC, irregular, a bar and a stub arm | | | |\n"
        "| `cartwheel` | galaxy, ring and spokes | | | |\n| `cigar` | galaxy, M82, edge-on with plumes | | | |\n")
r = r[:m.end()] + rows + r[m.end():]
r = rep(r, "| `data-orb-arms` | number | galaxy arm count (4 Milky Way, 2 grand-design) |",
           "| `data-orb-arms` | number | galaxy arm count (4 Milky Way, 2 grand-design, spoke count on a ring galaxy) |")
r = rep(r, "(`arms`, `wind`, `pitchAngle`, `omega` for galaxy;", "(`arms`, `wind`, `pitchAngle`, `omega`, `bar`, `ring`, `spokes`, `scatter`, `knots`, `plume` for galaxy;")
r = rep(r, 'ephemeris@v0.7.1/src/ephemeris.js', 'ephemeris@v0.8.0/src/ephemeris.js')
open(p, 'w', encoding='utf-8').write(r)
j = open('package.json', encoding='utf-8').read(); j = rep(j, '"version": "0.7.1"', '"version": "0.8.0"'); open('package.json', 'w', encoding='utf-8').write(j)

p = '../tonkatuff.com/index.html'; w = open(p, encoding='utf-8').read()
w = rep(w, 'ephemeris@v0.7.1/src/ephemeris.js', 'ephemeris@v0.8.0/src/ephemeris.js', 2)
w = rep(w, '<h3>Ephemeris <span class="ver mono">0.7.1</span></h3>', '<h3>Ephemeris <span class="ver mono">0.8.0</span></h3>')
w = rep(w, 'Ten kinds of body and thirty-four\n          named ones', 'Ten kinds of body and forty-two\n          named ones')
w = rep(w, '<span class="tag">34 named bodies</span>', '<span class="tag">42 named bodies</span>')
open(p, 'w', encoding='utf-8').write(w)
print('patched')
