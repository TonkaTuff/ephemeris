"""One-off: Neptune (dark spot, streaks) and Mercury (crater-heavy) on the planet mode; 0.5.0."""
import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

def rep(s, a, b, count=1):
    assert s.count(a) == count, (a[:70], s.count(a)); return s.replace(a, b)

p = 'src/ephemeris.js'; s = open(p, encoding='utf-8').read()
# surface doc + dark spot + streaks in the planet loop
s = rep(s, "    // surface: 'bands' (gas giant), 'moon' (maria + craters), 'earth' (oceans, land, ice, clouds), 'mars' (rust, caps)",
"    // surface: 'bands' (gas giant), 'moon' (maria + craters), 'mercury' (craters only), 'earth' (oceans, land, ice, clouds), 'mars' (rust, caps)\n"
"    // spot: true adds a warm oval on the southern belt (Jupiter); 'dark' removes dots there instead (Neptune)\n"
"    // streaks: bright thin cloud streaks along a few latitudes (Neptune)\n"
"    const darkSpot = o.spot === 'dark';")
s = rep(s, """        const lit = sunA == null ? C : Math.max(0, (x / Rp) * Math.sin(sunA) + C * Math.cos(sunA));
        let heat, a, white, rr = 0.6 + 1.3 * C;
        if (surf === 'moon') {""",
"""        const lit = sunA == null ? C : Math.max(0, (x / Rp) * Math.sin(sunA) + C * Math.cos(sunA));
        let heat, a, white, rr = 0.6 + 1.3 * C, pen = 1;
        if (darkSpot) {   // an oval of missing dots on the southern belt, with a dimmed edge
          const dlon = Math.atan2(Math.sin(lon - 1.2), Math.cos(lon - 1.2)), q = (dlon / 0.34) ** 2 + ((lat + 0.36) / 0.16) ** 2;
          if (q < 1) continue;
          if (q < 1.7) pen = 0.45;
        }
        const streak = o.streaks && Math.abs(lat) < 1 && noise(lat * 14 + 80, lon * 3) > 0.74;
        if (surf === 'moon' || surf === 'mercury') {
          const rocky = surf === 'mercury';""")
s = rep(s, """          const mare = noise(lat * 2.4 + 7, lon * 2.4) > 0.58, crater = noise(lat * 9 + 3, lon * 9) > 0.82;""",
"""          const mare = !rocky && noise(lat * 2.4 + 7, lon * 2.4) > 0.58, crater = noise(lat * (rocky ? 11 : 9) + 3, lon * (rocky ? 11 : 9)) > (rocky ? 0.72 : 0.82);""")
s = rep(s, """        } else {
          heat = 0.42 + 0.3 * band + 0.25 * C;
          a = ink ? 0.7 + 0.3 * C : 0.35 + 0.6 * C * band;
          white = 0.58 - 0.4 * C - 0.1 * band;
        }
        dot(x, y, Math.max(rMin, rr * M), ink ? null : ramp(pal.ramp, heat), a, white);""",
"""        } else {
          heat = 0.42 + 0.3 * band + 0.25 * C;
          a = ink ? 0.7 + 0.3 * C : 0.35 + 0.6 * C * band;
          white = 0.58 - 0.4 * C - 0.1 * band;
        }
        if (sunA != null && surf === 'bands') { a *= ink ? 0.4 + 0.6 * lit : 0.15 + 0.85 * lit; white += 0.25 * (1 - lit); }
        if (streak) { heat = 0.95; a = Math.min(1, a * 1.3 + 0.2); white = 0.12; rr *= 1.15; }
        dot(x, y, Math.max(rMin, rr * M), ink ? null : ramp(pal.ramp, heat), a * pen, white);""")
s = rep(s, "    if (o.spot) {   // a great red spot: an oval of cold-colour dots riding the southern belt",
           "    if (o.spot === true) {   // a great red spot: an oval of cold-colour dots riding the southern belt")
# bodies
s = rep(s, "    // the sun\n    'sun':", """    'neptune':      { mode: 'saturn',    opts: { rings: false, spot: 'dark', streaks: true, spin: 0.4, tilt: 0.5, phase: 0.1 }, palette: P([30, 60, 180], [60, 110, 230], [200, 225, 255], [70, 120, 255]) },
    'mercury':      { mode: 'saturn',    opts: { rings: false, surface: 'mercury', phase: 0.22, spin: 0.05, tilt: 0.1 }, palette: P([90, 80, 75], [160, 150, 140], [225, 220, 210], [120, 110, 105]) },
    // the sun
    'sun':""")
s = rep(s, '/*! ephemeris 0.4.0', '/*! ephemeris 0.5.0'); s = rep(s, "    version: '0.4.0',", "    version: '0.5.0',")
open(p, 'w', encoding='utf-8').write(s)

# demo cards after the moon card
p = 'index.html'; h = open(p, encoding='utf-8').read()
moon = '<div class="nm">The Moon</div><div class="meta">moon · saturn<br>maria, craters, phases</div></div>'
h = rep(h, moon, moon + '\n' +
  '      <div class="cell" data-pick="neptune" role="button" tabindex="0"><div class="orbwrap"><canvas class="orb" width="150" height="150" data-orb-body="neptune"></canvas></div><div class="nm">Neptune</div><div class="meta">neptune · saturn<br>the dark spot, cloud streaks</div></div>\n'
  '      <div class="cell" data-pick="mercury" role="button" tabindex="0"><div class="orbwrap"><canvas class="orb" width="150" height="150" data-orb-body="mercury"></canvas></div><div class="nm">Mercury</div><div class="meta">mercury · saturn<br>cratered, lit from the side</div></div>')
h = rep(h, 'Nine kinds of body and twenty-eight named ones', 'Nine kinds of body and thirty named ones')
h = rep(h, 'ephemeris 0.4.0 · dot-celestials', 'ephemeris 0.5.0 · dot-celestials')
open(p, 'w', encoding='utf-8').write(h)

p = 'README.md'; r = open(p, encoding='utf-8').read()
r = rep(r, 'named presets for twenty-eight real ones:', 'named presets for thirty real ones:')
r = rep(r, "| `sun` | eclipse, no moon, sunspots, corona | | `jupiter-moons` | saturn, Io, Europa, Ganymede, Callisto |",
           "| `sun` | eclipse, no moon, sunspots, corona | | `jupiter-moons` | saturn, Io, Europa, Ganymede, Callisto |\n| | | | `neptune` | saturn, dark spot, cloud streaks |\n| | | | `mercury` | saturn, cratered, lit from the side |")
r = rep(r, "| `data-orb-surface` | `bands` `moon` `earth` `mars` | planet surface on the saturn mode |",
           "| `data-orb-surface` | `bands` `moon` `mercury` `earth` `mars` | planet surface on the saturn mode |")
r = rep(r, '`rings`, `spot`, `surface`, `phase`, `moons` for saturn;', '`rings`, `spot` (true or `dark`), `streaks`, `surface`, `phase`, `moons` for saturn;')
r = rep(r, 'ephemeris@v0.4.0/src/ephemeris.js', 'ephemeris@v0.5.0/src/ephemeris.js')
open(p, 'w', encoding='utf-8').write(r)
j = open('package.json', encoding='utf-8').read(); j = rep(j, '"version": "0.4.0"', '"version": "0.5.0"'); open('package.json', 'w', encoding='utf-8').write(j)

p = '../tonkatuff.com/index.html'; w = open(p, encoding='utf-8').read()
w = rep(w, 'ephemeris@v0.4.0/src/ephemeris.js', 'ephemeris@v0.5.0/src/ephemeris.js', 2)
w = rep(w, '<h3>Ephemeris <span class="ver mono">0.4.0</span></h3>', '<h3>Ephemeris <span class="ver mono">0.5.0</span></h3>')
w = rep(w, 'Nine kinds of body and twenty-eight\n          named ones', 'Nine kinds of body and thirty\n          named ones')
w = rep(w, '<span class="tag">28 named bodies</span>', '<span class="tag">30 named bodies</span>')
open(p, 'w', encoding='utf-8').write(w)
print('patched')
