"""One-off: playground at the top of the demo, bigger clickable body cards, sun + jupiter-moons, 0.4.0."""
import os, re
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

def rep(s, a, b, count=1):
    assert s.count(a) == count, (a[:70], s.count(a)); return s.replace(a, b)

p = 'index.html'; s = open(p, encoding='utf-8').read()

# ---- CSS for playground + bigger cards
s = rep(s, ".row{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(178px,1fr))}",
""".row{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(178px,1fr))}
.bodies{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}
.bodies .cell{cursor:pointer;transition:border-color .15s ease,transform .15s ease}
.bodies .cell:hover{border-color:var(--probe);transform:translateY(-2px)}
.bodies .cell.on{border-color:var(--probe);box-shadow:0 0 0 3px var(--probe-soft)}
.bodies .orbwrap{min-height:180px}
.bodies .meta{max-width:34ch}
.pg{display:grid;gap:14px;grid-template-columns:minmax(300px,1fr) minmax(300px,1fr)}
@media (max-width:760px){.pg{grid-template-columns:1fr}}
.pg .stage{background:var(--panel);border:1px solid var(--line);border-radius:6px;display:flex;align-items:center;justify-content:center;min-height:360px;overflow:auto;padding:16px}
.pg .ctl{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:16px 18px;display:flex;flex-direction:column;gap:12px}
.pg label{display:grid;grid-template-columns:82px 1fr 52px;align-items:center;gap:10px;font-size:13px;color:var(--ink-2)}
.pg label b{color:var(--ink);font-weight:600}
.pg label output{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:11.5px;color:var(--ink-3);text-align:right}
.pg input[type=range]{width:100%;accent-color:var(--probe)}
.pg select{font:inherit;font-size:13px;padding:6px 8px;border-radius:4px;border:1px solid var(--line-2);background:var(--ground);color:var(--ink)}
.pg .flags{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;color:var(--ink-2)}
.pg .flags label{display:inline-flex;grid-template-columns:none;gap:6px;align-items:center}
.pg .swatches{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}
.pg .swatches label{display:flex;flex-direction:column;gap:4px;grid-template-columns:none;font-size:10.5px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.06em}
.pg input[type=color]{width:100%;height:28px;border:1px solid var(--line-2);border-radius:4px;background:none;padding:2px;cursor:pointer}
.pg .snip{position:relative}
.pg .snip pre{padding-right:70px;white-space:pre-wrap;word-break:break-all}
.pg .snip button,.pg .reset{position:absolute;top:8px;right:8px;font:inherit;font-size:12px;padding:4px 10px;border-radius:4px;border:1px solid var(--line-2);background:var(--panel);color:var(--ink);cursor:pointer}
.pg .reset{position:static}
.pg .snip button:hover,.pg .reset:hover{border-color:var(--probe);color:var(--probe)}
.pg .knobs:empty{display:none}""")

# ---- playground markup after the header
s = rep(s, """  <section id="bodies">""", """  <section id="play">
    <div class="head"><h2>Playground</h2><span class="tag now">click a body below, or pick one</span></div>
    <p class="note">Every control writes the tag on the right. Copy it, paste it, done. Colours only appear in the tag
      once you change one; everything else is the body's own default.</p>
    <div class="pg">
      <div class="stage" id="pgStage"></div>
      <div class="ctl">
        <label><b>Body</b><select id="pgBody"></select><span></span></label>
        <label><b>Size</b><input type="range" id="pgSize" min="20" max="640" step="4" value="240"><output id="pgSizeOut">240</output></label>
        <label><b>Shape</b><select id="pgRatio"><option value="1">square</option><option value="2">2:1 wide</option><option value="1.333">4:3</option></select><span></span></label>
        <div class="flags">
          <label><input type="checkbox" id="pgInk"> ink</label>
          <label><input type="checkbox" id="pgLite"> lite</label>
          <label><input type="checkbox" id="pgSpace"> space</label>
        </div>
        <div class="knobs" id="pgKnobs"></div>
        <div class="swatches" id="pgColors"></div>
        <div style="display:flex;gap:8px;align-items:center;justify-content:space-between"><span class="meta" style="text-align:left">six css variables, read live</span><button class="reset" id="pgReset">reset colours</button></div>
        <div class="snip"><pre id="pgSnip"></pre><button id="pgCopy">Copy</button></div>
        <div class="snip"><pre id="pgJs"></pre><button id="pgCopyJs">Copy</button></div>
      </div>
    </div>
  </section>

  <section id="bodies">""")

# ---- bigger clickable body cards, with sun and jupiter-moons
bodies = [('milky-way','galaxy','four arms, a barred bulge'),('andromeda','galaxy','two arms, tilted, golden core'),('whirlpool','galaxy','M51, face-on grand design'),('sombrero','galaxy','M104, edge-on'),
          ('orion','nebula','pink emission nebula'),('crab-nebula','nebula','filaments, one pulsar inside'),('pillars','nebula','Hubble palette, three columns'),('carina','nebula','six clouds, six stars'),
          ('gargantua','blackhole','Interstellar, ember disk'),('m87','blackhole','the EHT orange ring'),('crab-pulsar','pulsar','30 turns a second, slowed'),('vela','pulsar','slower, wide tilt, violet'),
          ('sun','eclipse','sunspots, granulation, corona'),('totality','eclipse','the moon crosses, diamond ring'),
          ('halley','comet','blue ion tail, dust tail'),('hale-bopp','comet','two-tone tails'),('neowise','comet','golden, fast'),
          ('saturn','saturn','rings and the Cassini gap'),('jupiter','saturn','belts and the red spot'),('jupiter-moons','saturn','Io, Europa, Ganymede, Callisto'),('uranus','saturn','rings on edge, teal'),
          ('earth','saturn','oceans, land, ice, clouds'),('mars','saturn','rust and polar caps'),('moon','saturn','maria, craters, phases'),
          ('sn1987a','supernova','shell out, remnant, again'),('cassiopeia-a','supernova','teal and red, slower'),('albireo','binary','gold and blue pair'),('sirius','binary','white pair, gas stream')]
pretty = {'milky-way':'Milky Way','andromeda':'Andromeda','whirlpool':'Whirlpool','sombrero':'Sombrero','orion':'Orion Nebula','crab-nebula':'Crab Nebula',
          'pillars':'Pillars of Creation','carina':'Carina Nebula','gargantua':'Gargantua','m87':'M87*','crab-pulsar':'Crab Pulsar','vela':'Vela Pulsar','sun':'The Sun','totality':'Totality',
          'halley':'Halley','hale-bopp':'Hale-Bopp','neowise':'NEOWISE','saturn':'Saturn','jupiter':'Jupiter','jupiter-moons':'Jupiter and the Galilean moons','uranus':'Uranus',
          'earth':'Earth','mars':'Mars','moon':'The Moon','sn1987a':'SN 1987A','cassiopeia-a':'Cassiopeia A','albireo':'Albireo','sirius':'Sirius A/B'}
cells = '\n'.join(f'      <div class="cell" data-pick="{b}" role="button" tabindex="0"><div class="orbwrap"><canvas class="orb" width="{200 if b in ("jupiter-moons","gargantua","sombrero") else 150}" height="150" data-orb-body="{b}"></canvas></div><div class="nm">{pretty[b]}</div><div class="meta">{b} · {m}<br>{d}</div></div>' for b, m, d in bodies)
a = s.index('  <section id="bodies">'); b = s.index('  </section>', a) + len('  </section>\n')
s = s[:a] + f'''  <section id="bodies">
    <div class="head"><h2>Named bodies</h2><span class="tag now">data-orb-body</span></div>
    <p class="note">Recognisable objects, each a mode plus the options and palette that make it that thing.
      Click one to load it into the playground. Any data attribute still overrides the body's own settings,
      and the six CSS variables still recolour it.</p>
    <div class="bodies">
{cells}
    </div>
  </section>
''' + s[b:]

# ---- copy tweaks
s = rep(s, 'Nine kinds of body and twenty-six named ones', 'Nine kinds of body and twenty-eight named ones')
s = rep(s, 'ephemeris 0.3.0 · dot-celestials', 'ephemeris 0.4.0 · dot-celestials')

# ---- playground script before </body>
script = r'''<script>
(() => {
  const $ = id => document.getElementById(id);
  const KNOBS = { spin: [0.05, 8, 0.05, 'spin'], tilt: [0, 1.5, 0.01, 'tilt'], period: [2, 40, 1, 'period'],
                  arms: [1, 6, 1, 'arms'], clouds: [1, 8, 1, 'clouds'], stars: [0, 12, 1, 'stars'], phase: [0, 1, 0.01, 'phase'] };
  const MODE_KNOBS = { pulsar: ['spin', 'tilt'], saturn: ['spin', 'tilt', 'phase', 'period'], galaxy: ['arms'], nebula: ['clouds', 'stars'],
                       supernova: ['period'], eclipse: ['period'], binary: ['spin'], comet: ['spin'], blackhole: [] };
  const hex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  const st = { body: 'andromeda', size: 240, ratio: 1, ink: false, lite: false, space: false, knobs: {}, colors: {} };

  const sel = $('pgBody');
  for (const name of Object.keys(Ephemeris.BODIES)) { if (name === 'galilean') continue; const o = document.createElement('option'); o.value = name; o.textContent = name + '  ·  ' + Ephemeris.BODIES[name].mode; sel.appendChild(o); }
  const defaults = () => { const b = Ephemeris.BODIES[st.body]; return b.palette || Ephemeris.MODES[b.mode].defaults; };
  const modeOf = () => Ephemeris.BODIES[st.body].mode;

  function buildKnobs() {
    const wrap = $('pgKnobs'); wrap.innerHTML = '';
    const bopts = Ephemeris.BODIES[st.body].opts || {};
    for (const k of MODE_KNOBS[modeOf()]) {
      if (k === 'phase' && bopts.phase === 'cycle') continue;
      const [min, max, step, label] = KNOBS[k];
      const cur = st.knobs[k] ?? bopts[k];
      const l = document.createElement('label');
      l.innerHTML = `<b>${label}</b><input type="range" min="${min}" max="${max}" step="${step}"><output></output>`;
      const r = l.querySelector('input'), out = l.querySelector('output');
      if (cur != null) r.value = cur; out.value = cur != null ? cur : 'default';
      r.addEventListener('input', () => { st.knobs[k] = +r.value; out.value = r.value; render(); });
      wrap.appendChild(l);
    }
  }
  function buildColors() {
    const wrap = $('pgColors'); wrap.innerHTML = '';
    const d = defaults();
    for (const k of Ephemeris.palette.keys) {
      const l = document.createElement('label');
      l.innerHTML = `${k}<input type="color" value="${st.colors[k] || hex(d[k])}">`;
      l.querySelector('input').addEventListener('input', e => { st.colors[k] = e.target.value; render(); });
      wrap.appendChild(l);
    }
  }
  function tag() {
    const w = Math.round(st.size * st.ratio), h = st.size;
    let a = `<canvas class="orb" width="${w}" height="${h}" data-orb-body="${st.body}"`;
    if (st.ink) a += ' data-orb-ink="1"'; if (st.lite) a += ' data-orb-lite="1"'; if (st.space) a += ' data-orb-space="1"';
    for (const k in st.knobs) a += ` data-orb-${KNOBS[k][3]}="${st.knobs[k]}"`;
    const cs = Object.entries(st.colors).map(([k, v]) => `--orb-${k}:${v}`).join(';');
    if (cs) a += ` style="${cs}"`;
    return a + '></canvas>';
  }
  function js() {
    const w = Math.round(st.size * st.ratio), h = st.size;
    const o = { ...st.knobs }; if (st.ink) o.ink = true; if (st.lite) o.lite = true; if (st.space) o.space = true; if (st.ratio !== 1) o.w = w;
    if (Object.keys(st.colors).length) { const d = defaults(); o.palette = {}; for (const k of Ephemeris.palette.keys) o.palette[k] = st.colors[k] ? Ephemeris.palette.parse(st.colors[k]) : d[k]; }
    return `Ephemeris.body('${st.body}', ctx, ${h}, t, dark, ${JSON.stringify(o).replace(/"([a-z]+)":/g, '$1: ').replace(/,/g, ', ')});`;
  }
  function render() {
    const stage = $('pgStage'); stage.innerHTML = tag(); Ephemeris.register(stage);
    $('pgSnip').textContent = tag(); $('pgJs').textContent = js();
    document.querySelectorAll('.bodies .cell').forEach(c => c.classList.toggle('on', c.dataset.pick === st.body));
  }
  function pick(name, scroll) {
    st.body = name; st.knobs = {}; st.colors = {}; sel.value = name;
    buildKnobs(); buildColors(); render();
    if (scroll) $('play').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  sel.addEventListener('change', () => pick(sel.value));
  $('pgSize').addEventListener('input', e => { st.size = +e.target.value; $('pgSizeOut').value = e.target.value; render(); });
  $('pgRatio').addEventListener('change', e => { st.ratio = +e.target.value; render(); });
  for (const f of ['ink', 'lite', 'space']) $('pg' + f[0].toUpperCase() + f.slice(1)).addEventListener('change', e => { st[f] = e.target.checked; render(); });
  $('pgReset').addEventListener('click', () => { st.colors = {}; buildColors(); render(); });
  const copy = (id, btn) => () => navigator.clipboard.writeText($(id).textContent).then(() => { btn.textContent = 'Copied'; setTimeout(() => btn.textContent = 'Copy', 1200); });
  $('pgCopy').addEventListener('click', copy('pgSnip', $('pgCopy'))); $('pgCopyJs').addEventListener('click', copy('pgJs', $('pgCopyJs')));
  document.querySelectorAll('.bodies .cell').forEach(c => { const go = () => pick(c.dataset.pick, true); c.addEventListener('click', go); c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }); });
  pick('andromeda');
})();
</script>
</body>'''
s = rep(s, '</body>', script)
open(p, 'w', encoding='utf-8').write(s)

# ---- README
p = 'README.md'; r = open(p, encoding='utf-8').read()
r = rep(r, 'Nine kinds of body, and named presets for twenty-six real ones:', 'Nine kinds of body, and named presets for twenty-eight real ones:')
r = rep(r, "| `vela` | pulsar | | `earth` | saturn, oceans, land, ice, clouds |",
           "| `vela` | pulsar | | `earth` | saturn, oceans, land, ice, clouds |\n| `sun` | eclipse, no moon, sunspots, corona | | `jupiter-moons` | saturn, Io, Europa, Ganymede, Callisto |")
r = rep(r, "**Demo:** open `index.html`, or https://tonkatuff.github.io/ephemeris once Pages is on.",
           "**Demo and playground:** https://tonkatuff.github.io/ephemeris/ (click a body, drag the sliders, copy the tag).")
r = rep(r, "pulsar and saturn, `rings`, `spot`, `surface`, `phase` for saturn;", "pulsar and saturn, `rings`, `spot`, `surface`, `phase`, `moons` for saturn; `moon`, `spots`, `radius` for eclipse;")
r = rep(r, 'ephemeris@v0.3.0/src/ephemeris.js', 'ephemeris@v0.4.0/src/ephemeris.js')
open(p, 'w', encoding='utf-8').write(r)
for f, a, b in [('package.json', '"version": "0.3.0"', '"version": "0.4.0"'), ('src/ephemeris.js', '/*! ephemeris 0.3.0', '/*! ephemeris 0.4.0'), ('src/ephemeris.js', "    version: '0.3.0',", "    version: '0.4.0',")]:
    x = open(f, encoding='utf-8').read(); assert x.count(a) == 1, (f, a); open(f, 'w', encoding='utf-8').write(x.replace(a, b))

# ---- site
p = '../tonkatuff.com/index.html'; w = open(p, encoding='utf-8').read()
w = rep(w, 'ephemeris@v0.3.0/src/ephemeris.js', 'ephemeris@v0.4.0/src/ephemeris.js', 2)
w = rep(w, '<h3>Ephemeris <span class="ver mono">0.3.0</span></h3>', '<h3>Ephemeris <span class="ver mono">0.4.0</span></h3>')
w = rep(w, 'Nine kinds of body and twenty-six\n          named ones, from the Milky Way and Andromeda to Saturn, the Moon, Halley and a total eclipse.',
           'Nine kinds of body and twenty-eight\n          named ones, from the Milky Way and Andromeda to Saturn, the Sun, the Moon and Halley. A playground\n          writes the tag for you.')
w = rep(w, '<span class="tag">26 named bodies</span>', '<span class="tag">28 named bodies</span>')
w = rep(w, '<a class="btn small" href="https://tonkatuff.github.io/ephemeris/">Demo</a>', '<a class="btn small" href="https://tonkatuff.github.io/ephemeris/">Playground</a>')
open(p, 'w', encoding='utf-8').write(w)
print('ok', s.count('<canvas'), 'canvases')
