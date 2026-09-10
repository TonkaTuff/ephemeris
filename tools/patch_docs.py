"""One-off: add the five new mode sections, the named-bodies section and README rows."""
import os, re
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

def rep(s, old, new, count=1):
    assert s.count(old) == count, (old[:70], s.count(old))
    return s.replace(old, new)

# ---------------- index.html
p = 'index.html'; s = open(p, encoding='utf-8').read()

def cell(w, h, attrs, nm, meta, big=False):
    return f'      <div class="cell{" big" if big else ""}"><div class="orbwrap"><canvas class="orb" width="{w}" height="{h}" {attrs}></canvas></div><div class="nm">{nm}</div><div class="meta">{meta}</div></div>'

def mode_section(mode, state, note, extras):
    m = f'data-orb-mode="{mode}"'
    hero = '\n'.join([cell(160, 160, m, f'{mode} · 160', 'colour', True), cell(88, 88, m, '88', 'colour'),
                      cell(64, 64, m, '64', 'the preset'), cell(20, 20, m, '20', 'inline')])
    row = '\n'.join(cell(w, h, m + ' ' + a, nm, meta) for (w, h, a, nm, meta) in extras)
    return f'''  <section>
    <div class="head"><h2>{mode[0].upper() + mode[1:]}</h2><span class="tag">mode {mode} · state {state}</span></div>
    <p class="note">{note}</p>
    <div class="hero">
{hero}
    </div>
    <div class="row">
{row}
    </div>
  </section>

'''

new_sections = ''.join([
  mode_section('comet', 'rushing',
    'Nucleus down-left, two tails streaming up-right away from an off-canvas sun: a broad curved dust tail and a narrow, faster, flickering ion tail. Particles are born at the nucleus and age out. <code>data-orb-spin</code> scales the flow.',
    [(88, 88, 'data-orb-ink="1"', 'ink', 'data-orb-ink=1'), (88, 88, 'data-orb-lite="1"', 'lite', 'data-orb-lite=1'),
     (88, 88, 'data-orb-space="1"', 'space', 'data-orb-space=1'), (160, 88, '', 'wide', '160×88 · longer tail')]),
  mode_section('saturn', 'orbiting',
    'A banded globe with three ring bands and the Cassini gap, tilted about 24°, rings on Keplerian speeds. Back-side ring dots hide behind the planet and dim in its shadow. <code>data-orb-tilt</code> for the ring angle, <code>data-orb-spin</code> for rotation.',
    [(88, 88, 'data-orb-ink="1"', 'ink', 'data-orb-ink=1'), (88, 88, 'data-orb-tilt="1.35"', 'rings on edge', 'data-orb-tilt=1.35'),
     (88, 88, 'data-orb-space="1"', 'space', 'data-orb-space=1'), (88, 88, 'data-orb-body="jupiter"', 'jupiter', 'data-orb-body=jupiter · no rings, a spot')]),
  mode_section('supernova', 'erupting',
    'A star collapses, blows a shell outward, and the shell fades into a filamentary remnant while the core rebuilds. Loops every <code>data-orb-period</code> seconds, default 6.',
    [(88, 88, 'data-orb-ink="1"', 'ink', 'data-orb-ink=1'), (88, 88, 'data-orb-period="3"', 'fast', 'data-orb-period=3'),
     (88, 88, 'data-orb-space="1"', 'space', 'data-orb-space=1'), (88, 88, 'data-orb-lite="1"', 'lite', 'data-orb-lite=1')]),
  mode_section('binary', 'pairing',
    'Two stars round a barycentre on a tilted orbit, a hot primary and a cooler secondary, with a stream of gas pulled off the secondary curling into the primary. Faint orbit trails. <code>data-orb-spin</code> sets the period.',
    [(88, 88, 'data-orb-ink="1"', 'ink', 'data-orb-ink=1'), (88, 88, 'data-orb-spin="0.4"', 'slow', 'data-orb-spin=0.4'),
     (88, 88, 'data-orb-space="1"', 'space', 'data-orb-space=1'), (88, 88, 'data-orb-body="sirius"', 'sirius', 'data-orb-body=sirius · white pair')]),
  mode_section('eclipse', 'aligning',
    'A dotted sun with a corona of streamers; the moon crosses it every <code>data-orb-period</code> seconds, default 10. The corona only shows near totality, with prominences at the limb and a diamond ring either side.',
    [(88, 88, 'data-orb-ink="1"', 'ink', 'data-orb-ink=1 · the moon is absence'), (88, 88, 'data-orb-period="5"', 'fast', 'data-orb-period=5'),
     (88, 88, 'data-orb-space="1"', 'space', 'data-orb-space=1'), (88, 88, 'data-orb-lite="1"', 'lite', 'data-orb-lite=1')]),
])

bodies = [('milky-way','galaxy'),('andromeda','galaxy'),('whirlpool','galaxy'),('sombrero','galaxy'),
          ('orion','nebula'),('crab-nebula','nebula'),('pillars','nebula'),('carina','nebula'),
          ('gargantua','blackhole'),('m87','blackhole'),('crab-pulsar','pulsar'),('vela','pulsar'),
          ('halley','comet'),('hale-bopp','comet'),('neowise','comet'),
          ('saturn','saturn'),('jupiter','saturn'),('uranus','saturn'),
          ('sn1987a','supernova'),('cassiopeia-a','supernova'),('albireo','binary'),('sirius','binary'),('totality','eclipse')]
pretty = {'milky-way':'Milky Way','andromeda':'Andromeda','whirlpool':'Whirlpool (M51)','sombrero':'Sombrero (M104)',
          'orion':'Orion Nebula','crab-nebula':'Crab Nebula','pillars':'Pillars of Creation','carina':'Carina Nebula',
          'gargantua':'Gargantua','m87':'M87*','crab-pulsar':'Crab Pulsar','vela':'Vela Pulsar',
          'halley':'Halley','hale-bopp':'Hale-Bopp','neowise':'NEOWISE','saturn':'Saturn','jupiter':'Jupiter','uranus':'Uranus',
          'sn1987a':'SN 1987A','cassiopeia-a':'Cassiopeia A','albireo':'Albireo','sirius':'Sirius A/B','totality':'Totality'}
body_cells = '\n'.join(cell(88, 88, f'data-orb-body="{b}"', pretty[b], f'{b} · {m}') for b, m in bodies)
bodies_section = f'''  <section id="bodies">
    <div class="head"><h2>Named bodies</h2><span class="tag now">data-orb-body</span></div>
    <p class="note">Recognisable objects, each a mode plus the options and palette that make it that thing.
      <code>&lt;canvas class=orb data-orb-body=andromeda&gt;</code>. Any data attribute still overrides the body's
      own settings, and the six CSS variables still recolour it.</p>
    <div class="row">
{body_cells}
    </div>
  </section>

'''

s = rep(s, '''  <section>
    <div class="head"><h2>Pulsar</h2>''', bodies_section + '''  <section>
    <div class="head"><h2>Pulsar</h2>''')
s = rep(s, '''  <section>
    <div class="head"><h2>Theme it</h2>''', new_sections + '''  <section>
    <div class="head"><h2>Theme it</h2>''')
s = rep(s, 'Four bodies so far: a black hole,\n      a pulsar, a galaxy, a nebula. Colour them with six CSS variables, or run them monochrome.',
        'Nine kinds of body and twenty-three named ones, from the Milky Way to Halley\'s comet. Colour them with six CSS variables, or run them monochrome.')
s = rep(s, '        <li><b>data-orb-mode</b> blackhole · pulsar · galaxy, or <b>data-orb-state</b> pondering · pinging · swirling</li>',
        '        <li><b>data-orb-body</b> milky-way · andromeda · orion · saturn · halley … (23, listed above)</li>\n        <li><b>data-orb-mode</b> blackhole · pulsar · galaxy · nebula · comet · saturn · supernova · binary · eclipse, or the matching <b>data-orb-state</b></li>')
s = rep(s, '        <li><b>data-orb-arms</b> (galaxy) · <b>data-orb-spin</b>, <b>data-orb-tilt</b> (pulsar)</li>',
        '        <li><b>data-orb-arms</b> · <b>data-orb-clouds</b>, <b>data-orb-stars</b> · <b>data-orb-spin</b>, <b>data-orb-tilt</b> · <b>data-orb-period</b></li>')
s = rep(s, '    <p>Roadmap: comet (rushing), saturn (orbiting), supernova (erupting), binary (pairing), eclipse (aligning).</p>',
        '    <p>Want another object? Open an issue with a photo.</p>')
open(p, 'w', encoding='utf-8').write(s)

# ---------------- README.md
p = 'README.md'; r = open(p, encoding='utf-8').read()
r = rep(r, 'Three bodies so far:', 'Nine kinds of body, and named presets for twenty-three real ones:')
r = rep(r, '| `nebula` | dreaming | an emission nebula: overlapping gas clouds as soft drifting dots, stretched into wisps, lit from inside by a few young stars |',
'''| `nebula` | dreaming | an emission nebula: overlapping gas clouds as soft drifting dots, stretched into wisps, lit from inside by a few young stars |
| `comet` | rushing | nucleus and coma, a broad curved dust tail and a narrow flickering ion tail streaming away from an off-canvas sun |
| `saturn` | orbiting | a banded globe with three ring bands and the Cassini gap, tilted, rings on Keplerian speeds, planet shadow on the rings |
| `supernova` | erupting | a star collapses, blows a shell outward, the shell fades into a filamentary remnant, the core rebuilds; loops |
| `binary` | pairing | two stars round a barycentre on a tilted orbit, a gas stream pulled off the secondary curling into the primary |
| `eclipse` | aligning | a dotted sun with a corona of streamers; the moon crosses it, corona and prominences show near totality, diamond ring either side |

### Named bodies

`data-orb-body` picks a mode plus the options and palette that make it that object. Data attributes
still override, and the CSS variables still recolour.

| body | mode | | body | mode |
|---|---|---|---|---|
| `milky-way` | galaxy | | `halley` | comet |
| `andromeda` | galaxy | | `hale-bopp` | comet |
| `whirlpool` | galaxy | | `neowise` | comet |
| `sombrero` | galaxy | | `saturn` | saturn |
| `orion` | nebula | | `jupiter` | saturn, no rings, a red spot |
| `crab-nebula` | nebula | | `uranus` | saturn, rings on edge |
| `pillars` | nebula | | `sn1987a` | supernova |
| `carina` | nebula | | `cassiopeia-a` | supernova |
| `gargantua` | blackhole | | `albireo` | binary |
| `m87` | blackhole | | `sirius` | binary |
| `crab-pulsar` | pulsar | | `totality` | eclipse |
| `vela` | pulsar | | | |''')
r = rep(r, '''<canvas class="orb" width="64" height="64" data-orb-mode="pulsar"></canvas>
```

Every `canvas.orb`''', '''<canvas class="orb" width="64" height="64" data-orb-body="andromeda"></canvas>
<canvas class="orb" width="64" height="64" data-orb-mode="pulsar"></canvas>
```

Every `canvas.orb`''')
r = rep(r, '| `data-orb-mode` | `blackhole` `pulsar` `galaxy` | which body |\n| `data-orb-state` | `pondering` `pinging` `swirling` | same thing, thinking-orbs style |',
'''| `data-orb-body` | `andromeda` `orion` `saturn` … | a named object, see the table above |
| `data-orb-mode` | `blackhole` `pulsar` `galaxy` `nebula` `comet` `saturn` `supernova` `binary` `eclipse` | which kind of body |
| `data-orb-state` | `pondering` `pinging` `swirling` `dreaming` `rushing` `orbiting` `erupting` `pairing` `aligning` | same thing, thinking-orbs style |''')
r = rep(r, '| `data-orb-spin` | number | pulsar spin rate, rad/s (default 4.2) |\n| `data-orb-tilt` | number | pulsar magnetic-axis tilt, rad (default 0.62) |',
'''| `data-orb-spin` | number | pulsar spin (4.2), saturn rotation (0.35), binary orbit (0.9), comet flow (1) |
| `data-orb-tilt` | number | pulsar magnetic-axis tilt (0.62), saturn ring tilt (0.42) |
| `data-orb-period` | seconds | supernova cycle (6), eclipse crossing (10) |''')
r = rep(r, '''## Roadmap

comet (rushing) · saturn (orbiting) · supernova (erupting) · binary (pairing) · eclipse (aligning)
''', '''## Want another object?

Open an issue with a photo. A named body is a dozen lines: a mode, a few options and six colours.
''')
r = rep(r, '''`opts`: `w` canvas width (default = size), `ink`, `lite`, `space`, `palette`, plus per-mode knobs
(`arms`, `wind`, `omega` for galaxy; `spin`, `tilt` for pulsar; `reach`, `omega` for blackhole).''',
'''`opts`: `w` canvas width (default = size), `ink`, `lite`, `space`, `palette`, plus per-mode knobs
(`arms`, `wind`, `pitchAngle`, `omega` for galaxy; `clouds`, `starN` for nebula; `spin`, `tilt` for
pulsar and saturn, `rings`, `spot` for saturn; `period` for supernova and eclipse; `reach`, `omega`
for blackhole). Named bodies: `Ephemeris.body('andromeda', ctx, 64, t, dark, { lite: true })`.''')
open(p, 'w', encoding='utf-8').write(r)

# ---------------- package.json
p = 'package.json'; j = open(p, encoding='utf-8').read()
j = rep(j, '"Celestial thinking-orbs: black hole, pulsar, galaxy, nebula. Canvas 2D dots, no dependencies."',
        '"Celestial thinking-orbs: black hole, pulsar, galaxy, nebula, comet, saturn, supernova, binary, eclipse, with named bodies from the Milky Way to Halley. Canvas 2D dots, no dependencies."')
j = rep(j, '"version": "0.1.0"', '"version": "0.2.0"')
open(p, 'w', encoding='utf-8').write(j)
e = open('src/ephemeris.js', encoding='utf-8').read()
e = rep(e, "/*! ephemeris 0.1.0", "/*! ephemeris 0.2.0")
e = rep(e, "    version: '0.1.0',", "    version: '0.2.0',")
open('src/ephemeris.js', 'w', encoding='utf-8').write(e)
print('docs ok', s.count('<canvas'), 'canvases')
