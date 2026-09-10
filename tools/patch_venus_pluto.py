"""One-off: Venus (soft bands, retrograde) and Pluto (the heart) on the planet mode; 0.6.0."""
import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

def rep(s, a, b, count=1):
    assert s.count(a) == count, (a[:70], s.count(a)); return s.replace(a, b)

p = 'src/ephemeris.js'; s = open(p, encoding='utf-8').read()
s = rep(s, "    // surface: 'bands' (gas giant), 'moon' (maria + craters), 'mercury' (craters only), 'earth' (oceans, land, ice, clouds), 'mars' (rust, caps)",
           "    // surface: 'bands' (gas giant), 'moon' (maria + craters), 'mercury' (craters only), 'earth' (oceans, land, ice, clouds), 'mars' (rust, caps), 'pluto' (the heart)\n"
           "    // bandAmp: contrast of the bands, 0.28 default; Venus runs low")
s = rep(s, "      const band = 0.72 + 0.28 * Math.sin(lat * 9 + E(la, 5.5) * 2);",
           "      const amp = o.bandAmp ?? 0.28, band = (1 - amp) + amp * Math.sin(lat * 9 + E(la, 5.5) * 2);")
s = rep(s, """        } else if (surf === 'mars') {""", """        } else if (surf === 'pluto') {
          const dlon = Math.atan2(Math.sin(lon - 0.8), Math.cos(lon - 0.8));
          const heart = (dlon / 0.5) ** 2 + ((lat + 0.12) / 0.42) ** 2 < 1;
          const dark = noise(lat * 2.6 + 70, lon * 2.6);
          heat = heart ? 0.95 : dark > 0.55 ? 0.12 + 0.15 * dark : 0.45 + 0.25 * dark;
          a = ink ? 0.4 + 0.6 * lit : 0.1 + 0.85 * lit;
          white = (heart ? 0.1 : dark > 0.55 ? 0.55 : 0.32) + 0.25 * (1 - lit);
        } else if (surf === 'mars') {""")
s = rep(s, "    'neptune':      { mode: 'saturn',", """    'venus':        { mode: 'saturn',    opts: { rings: false, bandAmp: 0.1, spin: -0.08, tilt: 0.15, phase: 0.18 }, palette: P([200, 160, 90], [240, 220, 170], [255, 250, 235], [240, 215, 150]) },
    'pluto':        { mode: 'saturn',    opts: { rings: false, surface: 'pluto', spin: 0.12, tilt: 0.3, phase: 0.14 }, palette: P([110, 60, 50], [190, 160, 140], [245, 235, 225], [180, 150, 140]) },
    'neptune':      { mode: 'saturn',""")
s = rep(s, '/*! ephemeris 0.5.0', '/*! ephemeris 0.6.0'); s = rep(s, "    version: '0.5.0',", "    version: '0.6.0',")
open(p, 'w', encoding='utf-8').write(s)

p = 'index.html'; h = open(p, encoding='utf-8').read()
merc = '<div class="nm">Mercury</div><div class="meta">mercury · saturn<br>cratered, lit from the side</div></div>'
h = rep(h, merc, merc + '\n' +
  '      <div class="cell" data-pick="venus" role="button" tabindex="0"><div class="orbwrap"><canvas class="orb" width="150" height="150" data-orb-body="venus"></canvas></div><div class="nm">Venus</div><div class="meta">venus · saturn<br>cream clouds, faint bands, spins backwards</div></div>\n'
  '      <div class="cell" data-pick="pluto" role="button" tabindex="0"><div class="orbwrap"><canvas class="orb" width="150" height="150" data-orb-body="pluto"></canvas></div><div class="nm">Pluto</div><div class="meta">pluto · saturn<br>tan, maroon, and the heart</div></div>')
h = rep(h, 'Nine kinds of body and thirty named ones', 'Nine kinds of body and thirty-two named ones')
h = rep(h, 'ephemeris 0.5.0 · dot-celestials', 'ephemeris 0.6.0 · dot-celestials')
open(p, 'w', encoding='utf-8').write(h)

p = 'README.md'; r = open(p, encoding='utf-8').read()
r = rep(r, 'named presets for thirty real ones:', 'named presets for thirty-two real ones:')
r = rep(r, "| | | | `mercury` | saturn, cratered, lit from the side |",
           "| | | | `mercury` | saturn, cratered, lit from the side |\n| | | | `venus` | saturn, cream clouds, retrograde |\n| | | | `pluto` | saturn, tan and maroon, the heart |")
r = rep(r, "| `data-orb-surface` | `bands` `moon` `mercury` `earth` `mars` | planet surface on the saturn mode |",
           "| `data-orb-surface` | `bands` `moon` `mercury` `earth` `mars` `pluto` | planet surface on the saturn mode |")
r = rep(r, "`rings`, `spot` (true or `dark`), `streaks`, `surface`, `phase`, `moons` for saturn;", "`rings`, `spot` (true or `dark`), `streaks`, `bandAmp`, `surface`, `phase`, `moons` for saturn;")
r = rep(r, 'ephemeris@v0.5.0/src/ephemeris.js', 'ephemeris@v0.6.0/src/ephemeris.js')
open(p, 'w', encoding='utf-8').write(r)
j = open('package.json', encoding='utf-8').read(); j = rep(j, '"version": "0.5.0"', '"version": "0.6.0"'); open('package.json', 'w', encoding='utf-8').write(j)

p = '../tonkatuff.com/index.html'; w = open(p, encoding='utf-8').read()
w = rep(w, 'ephemeris@v0.5.0/src/ephemeris.js', 'ephemeris@v0.6.0/src/ephemeris.js', 2)
w = rep(w, '<h3>Ephemeris <span class="ver mono">0.5.0</span></h3>', '<h3>Ephemeris <span class="ver mono">0.6.0</span></h3>')
w = rep(w, 'Nine kinds of body and thirty\n          named ones', 'Nine kinds of body and thirty-two\n          named ones')
w = rep(w, '<span class="tag">30 named bodies</span>', '<span class="tag">32 named bodies</span>')
open(p, 'w', encoding='utf-8').write(w)
print('patched')
