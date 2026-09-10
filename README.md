# Ephemeris

Small animated orbs of things in the sky, drawn as dots on one `<canvas>`. No dependencies, one
script, the same draw contract as [thinking-orbs](https://www.npmjs.com/package/thinking-orbs).

Three bodies so far:

| mode | state | what you see |
|---|---|---|
| `blackhole` | pondering | Interstellar's Gargantua: edge-on accretion disk, far side lensed over the top and under the bottom, photon ring, Doppler-bright on the approaching side |
| `pulsar` | pinging | a neutron star as a lighthouse: spinning core, two beams on a tilted magnetic axis, dipole field lines, a flare each time a beam sweeps the camera |
| `galaxy` | swirling | a spiral at a tilt: logarithmic arms, bright flattened bulge, dust scatter, bright knots, the pattern turning slowly |
| `nebula` | dreaming | an emission nebula: overlapping gas clouds as soft drifting dots, stretched into wisps, lit from inside by a few young stars |

**Demo:** open `index.html`, or https://tonkatuff.github.io/ephemeris once Pages is on.

## Use

```html
<script src="src/ephemeris.js"></script>

<canvas class="orb" width="64" height="64" data-orb-mode="pulsar"></canvas>
```

Every `canvas.orb` on the page is wired up on load. For canvases added later:

```js
Ephemeris.register(someRoot);   // default: document
```

Or from a CDN, pinned to a commit or tag:

```html
<script src="https://cdn.jsdelivr.net/gh/TonkaTuff/ephemeris@main/src/ephemeris.js"></script>
```

### Markup

Height is the preset: it sets dot size, particle count and speed. Width lets a mode stretch, so a
`128×64` black hole gets a disk twice as long as a `64×64`.

| attribute | values | does |
|---|---|---|
| `data-orb-mode` | `blackhole` `pulsar` `galaxy` | which body |
| `data-orb-state` | `pondering` `pinging` `swirling` | same thing, thinking-orbs style |
| `data-orb-ink` | `1` | monochrome dots, follows the page theme like thinking-orbs |
| `data-orb-lite` | `1` | half the particles |
| `data-orb-space` | `1` | dark pill ground with stars |
| `data-orb-arms` | number | galaxy arm count (4 Milky Way, 2 grand-design) |
| `data-orb-spin` | number | pulsar spin rate, rad/s (default 4.2) |
| `data-orb-tilt` | number | pulsar magnetic-axis tilt, rad (default 0.62) |
| `data-orb-clouds` | number | nebula cloud count (default 5) |
| `data-orb-stars` | number | nebula star count (default scales with size, 3 at 64) |

Flags stack: `data-orb-lite=1 data-orb-space=1` on a `320×160` is fine.

### Colour

Six CSS custom properties on the canvas or any ancestor. They are read every frame, so a theme switch
or a `:hover` rule applies live. Each mode has its own defaults; set one variable and the rest keep
the mode's default. Ink ignores them.

```css
canvas.orb {
  --orb-cold:   #1E56D8;   /* far / receding / outer    */
  --orb-mid:    #7FB0FF;   /* mid                       */
  --orb-hot:    #EAF3FF;   /* near / approaching / core */
  --orb-glow:   #3D7BFF;   /* halo + haze               */
  --orb-ring:   #F2F8FF;   /* photon ring (blackhole)   */
  --orb-shadow: #000000;   /* the hole (blackhole)      */
}
```

Defaults per mode: blackhole is ember (`#FF781E` → `#FFB782` → `#FFF6E6`, glow `#FFA546`), pulsar is
cobalt (above), galaxy is milky way (`#4D6BFF` → `#C9B8FF` → `#FFF3D6`, glow `#8A7CFF`), nebula is
orion (`#4B3FBF` → `#D05AA0` → `#FFD9C2`, glow `#8A4FD0`).

### JavaScript

Every mode is a plain function with the thinking-orbs signature, so you can drive it from your own
loop or drop it into an existing engine.

```js
Ephemeris.draw('galaxy', ctx, 64, t, dark, {
  arms: 2, lite: true, w: 128,
  palette: { cold: [10,122,90], mid: [95,216,176], hot: [232,255,246],
             glow: [32,180,138], ring: [255,255,255], shadow: [0,0,0] }
});

// into thinking-orbs
Orbs.MODE_DRAWS.pulsar = Ephemeris.MODES.pulsar.draw;
Orbs.STATE_TO_MODE.pinging = 'pulsar';
```

`opts`: `w` canvas width (default = size), `ink`, `lite`, `space`, `palette`, plus per-mode knobs
(`arms`, `wind`, `omega` for galaxy; `spin`, `tilt` for pulsar; `reach`, `omega` for blackhole).

### Behaviour

- Paused when scrolled off-screen and on hidden tabs, so a page full of them costs nothing idle.
- Device pixel ratio capped at 2.
- `prefers-reduced-motion` draws one still frame, repainted on theme change.
- Dot radius follows the engine's `(size/300)^0.6`; particle counts follow size.

## Roadmap

comet (rushing) · saturn (orbiting) · supernova (erupting) · binary (pairing) · eclipse (aligning)

## Name

An ephemeris is the table that tells you where every body in the sky is at a given time.

## Licence

MIT
