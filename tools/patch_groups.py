"""One-off: GROUPS table (bodies by family) and grouped demo grid, select, README; 0.8.1."""
import os, re
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

def rep(s, a, b, count=1):
    assert s.count(a) == count, (a[:70], s.count(a)); return s.replace(a, b)

GROUPS = [
    ('Solar system', ['sun', 'mercury', 'venus', 'earth', 'moon', 'earth-moon', 'mars', 'jupiter', 'jupiter-moons', 'saturn', 'uranus', 'neptune', 'pluto', 'solar-system', 'totality']),
    ('Comets', ['halley', 'hale-bopp', 'neowise']),
    ('Stars', ['sirius', 'albireo', 'crab-pulsar', 'vela', 'sn1987a', 'cassiopeia-a']),
    ('Black holes', ['gargantua', 'm87']),
    ('Nebulae', ['orion', 'crab-nebula', 'pillars', 'carina']),
    ('Galaxies', ['milky-way', 'andromeda', 'triangulum', 'magellanic', 'whirlpool', 'pinwheel', 'southern-pinwheel', 'bodes', 'sombrero', 'ngc-1300', 'cartwheel', 'cigar']),
]
ALL = [n for _, ns in GROUPS for n in ns]
assert len(ALL) == 42 == len(set(ALL)), len(ALL)

# engine
p = 'src/ephemeris.js'; s = open(p, encoding='utf-8').read()
js_groups = ",\n".join(f"    '{g}': [{', '.join(repr(n) for n in ns)}]" for g, ns in GROUPS)
s = rep(s, "  BODIES.lmc = BODIES.magellanic;", "  // named bodies by family, in display order (aliases left out)\n  const GROUPS = {\n" + js_groups + "\n  };\n  BODIES.lmc = BODIES.magellanic;")
s = rep(s, "    register, mount, MODES, STATE_TO_MODE, BODIES,", "    register, mount, MODES, STATE_TO_MODE, BODIES, GROUPS,")
s = rep(s, '/*! ephemeris 0.8.0', '/*! ephemeris 0.8.1'); s = rep(s, "    version: '0.8.0',", "    version: '0.8.1',")
open(p, 'w', encoding='utf-8').write(s)

# demo: regroup the cards under headings, optgroups in the select
p = 'index.html'; h = open(p, encoding='utf-8').read()
m = re.search(r'(    <div class="bodies">\n)((?:      <div class="cell" data-pick=.*\n)+)(    </div>\n)', h)
cards = {re.match(r'      <div class="cell" data-pick="([^"]+)"', ln).group(1): ln for ln in m.group(2).splitlines(keepends=True)}
assert set(cards) == set(ALL), set(cards) ^ set(ALL)
body = ''.join(f'      <h3 class="grp">{g}</h3>\n' + ''.join(cards[n] for n in ns) for g, ns in GROUPS)
h = h[:m.start()] + m.group(1) + body + m.group(3) + h[m.end():]
h = rep(h, ".bodies .orbwrap{min-height:180px}", ".bodies .orbwrap{min-height:180px}\n.bodies .grp{grid-column:1/-1;margin:14px 0 -4px;font-size:13px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;opacity:.65}\n.bodies .grp:first-child{margin-top:0}")
h = rep(h, "  for (const name of Object.keys(Ephemeris.BODIES)) { if (name === 'galilean') continue; const o = document.createElement('option'); o.value = name; o.textContent = name + '  ·  ' + Ephemeris.BODIES[name].mode; sel.appendChild(o); }",
           "  for (const [grp, names] of Object.entries(Ephemeris.GROUPS)) {\n    const og = document.createElement('optgroup'); og.label = grp; sel.appendChild(og);\n    for (const name of names) { const o = document.createElement('option'); o.value = name; o.textContent = name + '  ·  ' + Ephemeris.BODIES[name].mode; og.appendChild(o); }\n  }")
h = rep(h, "(23, listed above)", "(42, grouped above)")
h = rep(h, 'ephemeris 0.8.0 · dot-celestials', 'ephemeris 0.8.1 · dot-celestials')
open(p, 'w', encoding='utf-8').write(h)

# README: one table, grouped
p = 'README.md'; r = open(p, encoding='utf-8').read()
m = re.search(r"\| body \| mode \| \| body \| mode \|\n\|---\|---\|---\|---\|---\|\n(?:\|.*\|\n)+", r)
notes = dict(re.findall(r"\| `([^`]+)` \| ([^|]*?) \|", m.group(0)))
assert set(notes) == set(ALL), set(notes) ^ set(ALL)
NEW = {'sun': 'eclipse, no moon, sunspots, corona', 'milky-way': 'galaxy, four arms', 'andromeda': 'galaxy, M31, tilted grand design', 'whirlpool': 'galaxy, M51, face-on', 'sombrero': 'galaxy, M104, edge-on',
       'orion': 'nebula', 'crab-nebula': 'nebula', 'pillars': 'nebula', 'carina': 'nebula', 'gargantua': 'blackhole, Interstellar', 'm87': 'blackhole, the EHT one',
       'crab-pulsar': 'pulsar', 'vela': 'pulsar', 'sn1987a': 'supernova', 'cassiopeia-a': 'supernova', 'albireo': 'binary, gold and blue', 'sirius': 'binary, A and the white dwarf', 'totality': 'eclipse'}
tbl = "| family | body | mode, notes |\n|---|---|---|\n"
for g, ns in GROUPS:
    for i, n in enumerate(ns):
        tbl += f"| {g if i == 0 else ''} | `{n}` | {NEW.get(n, notes[n]).strip()} |\n"
r = r[:m.start()] + tbl + "\n`Ephemeris.GROUPS` is the same list as an object, family name to body names, in this order.\n" + r[m.end():]
r = rep(r, 'ephemeris@v0.8.0/src/ephemeris.js', 'ephemeris@v0.8.1/src/ephemeris.js')
open(p, 'w', encoding='utf-8').write(r)
j = open('package.json', encoding='utf-8').read(); j = rep(j, '"version": "0.8.0"', '"version": "0.8.1"'); open('package.json', 'w', encoding='utf-8').write(j)

p = '../tonkatuff.com/index.html'; w = open(p, encoding='utf-8').read()
w = rep(w, 'ephemeris@v0.8.0/src/ephemeris.js', 'ephemeris@v0.8.1/src/ephemeris.js', 2)
w = rep(w, '<h3>Ephemeris <span class="ver mono">0.8.0</span></h3>', '<h3>Ephemeris <span class="ver mono">0.8.1</span></h3>')
open(p, 'w', encoding='utf-8').write(w)
print('patched')
