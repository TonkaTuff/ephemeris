"""One-off: the Sun turns. Spin on the eclipse mode; 0.9.1."""
import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

def rep(s, a, b, count=1):
    assert s.count(a) == count, (a[:70], s.count(a)); return s.replace(a, b)

p = 'src/ephemeris.js'; s = open(p, encoding='utf-8').read()

s = rep(s, "  // A dotted sun with a corona of streamers; the moon crosses it on `period` seconds. The corona is\n"
           "  // only really visible near totality, and there is a diamond ring either side of it.",
           "  // A dotted sun with a corona of streamers; the moon crosses it on `period` seconds. The corona is\n"
           "  // only really visible near totality, and there is a diamond ring either side of it.\n"
           "  // The photosphere turns on `spin` (radians a second): dots, granulation and sunspots all ride the\n"
           "  // surface, so spots rise at one limb and set at the other. spin:0 holds it still.")

# rotation, and sunspots as longitude/latitude riding the surface
s = rep(s, """    // sunspots drift across the face with the rotation; dots inside are simply not drawn
    const spots = o.spots ? [0, 1, 2].map(k => ({ x: Rs * 0.85 * Math.sin(t * 0.04 + k * 2.1), y: Rs * (E(k, 52.3) - 0.5) * 0.9, r: Rs * (0.05 + 0.05 * E(k, 53.1)) })) : null;""",
"""    const spin = o.spin ?? 0.12, rot = t * spin, cr = Math.cos(rot), sr = Math.sin(rot);
    // sunspots sit at a fixed longitude and latitude and turn with the surface; dots inside are simply
    // not drawn. Anything on the far side is dropped, and what is near the limb is foreshortened.
    const spots = o.spots ? [0, 1, 2].map(k => {
      const lat = (E(k, 52.3) - 0.5) * 1.1, lon = E(k, 52.9) * TAU + rot, cl = Math.cos(lat);
      return { x: cl * Math.sin(lon) * Rs, y: Math.sin(lat) * Rs, z: cl * Math.cos(lon),
               r: Rs * (0.05 + 0.05 * E(k, 53.1)) };
    }).filter(sp => sp.z > 0.05).map(sp => ({ ...sp, r: sp.r * (0.4 + 0.6 * sp.z) })) : null;""")

# photosphere: turn the sphere, keep the near side, key granulation to the surface
s = rep(s, """    for (let i = 0; i < NS; i++) {
      const d = fib(i, NS); if (d[2] < 0) continue;
      const x = d[0] * Rs, y = d[1] * Rs, C = d[2];
      if (inMoon(x, y)) continue;
      let a = ink ? 1 : 0.6 + 0.4 * C;
      if (spots) {
        let pen = 1;
        for (const sp of spots) { const dd = Math.hypot(x - sp.x, y - sp.y); if (dd < sp.r) { pen = 0; break; } if (dd < sp.r * 1.9) pen = Math.min(pen, 0.45); }
        if (!pen) continue;
        a *= pen * (0.72 + 0.28 * noise(x / Rs * 4 + t * 0.1, y / Rs * 4));   // granulation
      }""",
"""    for (let i = 0; i < NS; i++) {
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
      }""")

# prominences drift with the surface too
s = rep(s, "        const a = E(k, 31.7) * TAU + t * 0.05, r = Rs * (1.02 + 0.08 * E(k, 32.9) * (0.7 + 0.3 * Math.sin(t * 1.3 + k)));",
           "        const a = E(k, 31.7) * TAU + rot * 0.4, r = Rs * (1.02 + 0.08 * E(k, 32.9) * (0.7 + 0.3 * Math.sin(t * 1.3 + k)));")

s = rep(s, '/*! ephemeris 0.9.0', '/*! ephemeris 0.9.1'); s = rep(s, "    version: '0.9.0',", "    version: '0.9.1',")
open(p, 'w', encoding='utf-8').write(s)

p = 'index.html'; h = open(p, encoding='utf-8').read()
h = rep(h, "galaxy: [], supernova: [], eclipse: [],", "galaxy: [], supernova: [], eclipse: ['spin'],")
h = rep(h, 'ephemeris 0.9.0 · celestial stipple', 'ephemeris 0.9.1 · celestial stipple')
open(p, 'w', encoding='utf-8').write(h)

p = 'README.md'; r = open(p, encoding='utf-8').read()
r = rep(r, "| `data-orb-spin` | number | pulsar spin (4.2), saturn rotation (0.35), binary orbit (0.9), comet flow (1), orrery and nebula time scale (1) |",
           "| `data-orb-spin` | number | pulsar spin (4.2), saturn rotation (0.35), sun rotation (0.12), binary orbit (0.9), comet flow (1), orrery and nebula time scale (1) |")
r = rep(r, "`moon`, `spots`, `radius` for eclipse;", "`moon`, `spots`, `radius`, `spin` for eclipse;")
r = r.replace('ephemeris@v0.9.0/', 'ephemeris@v0.9.1/')
open(p, 'w', encoding='utf-8').write(r)

j = open('package.json', encoding='utf-8').read()
j = rep(j, '"version": "0.9.0"', '"version": "0.9.1"'); open('package.json', 'w', encoding='utf-8').write(j)
print('patched')
