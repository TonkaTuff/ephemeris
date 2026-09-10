"""One-off: visible motion in the nebula; 0.7.1."""
import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

def rep(s, a, b, count=1):
    assert s.count(a) == count, (a[:70], s.count(a)); return s.replace(a, b)

p = 'src/ephemeris.js'; s = open(p, encoding='utf-8').read()
s = rep(s, "  // cloud along its own axis. Dreamy by design: nothing here moves fast.",
           "  // cloud along its own axis. Each cloud swirls slowly about its own centre while the field drifts.")
s = rep(s, "    const slow = t * (o.omega ?? 0.05);\n    const rMin = 0.3;\n\n    // clouds: centre, radius, stretch axis, base heat; centres breathe slowly",
           "    const slow = t * (o.omega ?? 0.18);                 // drift rate; omega scales all the motion\n    const rMin = 0.3;\n\n    // clouds: centre, radius, stretch axis, base heat; centres wander, axes turn")
s = rep(s, """        x: Math.cos(a) * Rx * (0.15 + 0.4 * E(k, 12.1)) + 0.06 * R * Math.sin(t * 0.07 + k),
        y: Math.sin(a) * Ry * (0.15 + 0.4 * E(k, 13.7)) + 0.06 * R * Math.cos(t * 0.05 + k * 1.3),
        r: R * (0.28 + 0.34 * E(k, 14.9)),
        ax: E(k, 15.2) * Math.PI, st: 1.3 + 0.9 * E(k, 16.4),""",
"""        x: Math.cos(a) * Rx * (0.15 + 0.4 * E(k, 12.1)) + 0.1 * R * Math.sin(slow * 0.7 + k),
        y: Math.sin(a) * Ry * (0.15 + 0.4 * E(k, 13.7)) + 0.1 * R * Math.cos(slow * 0.5 + k * 1.3),
        r: R * (0.28 + 0.34 * E(k, 14.9)),
        ax: E(k, 15.2) * Math.PI + slow * (0.5 + 0.5 * E(k, 18.2)) * (E(k, 19.4) > 0.5 ? 1 : -1),   // the swirl
        st: 1.3 + 0.9 * E(k, 16.4),""")
s = rep(s, """      x += (noise(i * 0.37, slow + i * 0.011) - 0.5) * 0.28 * R;         // drift
      y += (noise(i * 0.53 + 40, slow * 0.8 + i * 0.013) - 0.5) * 0.28 * R;""",
"""      x += (noise(i * 0.37, slow + i * 0.011) - 0.5) * 0.32 * R;         // drift
      y += (noise(i * 0.53 + 40, slow * 0.8 + i * 0.013) - 0.5) * 0.32 * R;""")
s = rep(s, "(0.7 + 0.3 * noise(i * 0.19, t * 0.15));", "(0.65 + 0.35 * noise(i * 0.19, slow * 2.5));")
s = rep(s, '/*! ephemeris 0.7.0', '/*! ephemeris 0.7.1'); s = rep(s, "    version: '0.7.0',", "    version: '0.7.1',")
open(p, 'w', encoding='utf-8').write(s)

p = 'index.html'; h = open(p, encoding='utf-8').read()
h = rep(h, "stretched into wisps, lit from inside by a few young stars with faint diffraction spikes. Nothing\n      here moves fast.",
           "stretched into wisps, lit from inside by a few young stars with faint diffraction spikes. Each cloud\n      swirls slowly about its own centre while the whole field drifts; <code>data-orb-spin</code> scales it.")
h = rep(h, 'ephemeris 0.7.0 · dot-celestials', 'ephemeris 0.7.1 · dot-celestials')
h = rep(h, "binary: ['spin'], comet: ['spin'], blackhole: [], orrery: ['spin', 'tilt'] };",
           "binary: ['spin'], comet: ['spin'], blackhole: [], orrery: ['spin', 'tilt'], nebula: ['spin'] };")
h = rep(h, "const MODE_KNOBS = { pulsar: ['spin', 'tilt'], saturn: ['spin', 'tilt'], galaxy: [], nebula: [], supernova: [], eclipse: [],",
           "const MODE_KNOBS = { pulsar: ['spin', 'tilt'], saturn: ['spin', 'tilt'], galaxy: [], supernova: [], eclipse: [],")
open(p, 'w', encoding='utf-8').write(h)

# nebula: let data-orb-spin drive omega so the playground slider works
s = open('src/ephemeris.js', encoding='utf-8').read()
s = rep(s, "    const slow = t * (o.omega ?? 0.18);                 // drift rate; omega scales all the motion",
           "    const slow = t * (o.omega ?? 0.18) * (o.spin ?? 1);   // drift rate; spin scales all the motion")
open('src/ephemeris.js', 'w', encoding='utf-8').write(s)

p = 'README.md'; r = open(p, encoding='utf-8').read()
r = rep(r, "| `data-orb-spin` | number | pulsar spin (4.2), saturn rotation (0.35), binary orbit (0.9), comet flow (1), orrery time scale (1) |",
           "| `data-orb-spin` | number | pulsar spin (4.2), saturn rotation (0.35), binary orbit (0.9), comet flow (1), orrery and nebula time scale (1) |")
r = rep(r, 'ephemeris@v0.7.0/src/ephemeris.js', 'ephemeris@v0.7.1/src/ephemeris.js')
open(p, 'w', encoding='utf-8').write(r)
j = open('package.json', encoding='utf-8').read(); j = rep(j, '"version": "0.7.0"', '"version": "0.7.1"'); open('package.json', 'w', encoding='utf-8').write(j)
p = '../tonkatuff.com/index.html'; w = open(p, encoding='utf-8').read()
w = rep(w, 'ephemeris@v0.7.0/src/ephemeris.js', 'ephemeris@v0.7.1/src/ephemeris.js', 2)
w = rep(w, '<h3>Ephemeris <span class="ver mono">0.7.0</span></h3>', '<h3>Ephemeris <span class="ver mono">0.7.1</span></h3>')
open(p, 'w', encoding='utf-8').write(w)
print('patched')
