# Xalian Generator — Design System

The site is not a website about creatures. It is **the control panel of a Xalian Generator**: a machine that can bioengineer life on a dead world, built by an industrial empire during its atomic age. Star Wars by way of Fallout — the capability is centuries ahead, the interface is decades behind. Enamelled steel, brass bezels, bakelite keys, and a small green CRT bolted into the hull.

The live reference is **`/styleguide`**, rendered from the same tokens and classes the pages use, so it cannot go stale. Read it before designing anything new.

## The four rules

1. **Panels are matte objects.** Pressed steel under olive enamel. Depth is a bevel — light along the top edge, shadow underneath — plus rivets where a real panel would need them. **No panel ever glows.**
2. **Only screens and lamps emit.** Phosphor, scanlines and bloom live strictly inside `.g-screen`. A CRT behind glass is the one lit thing in the room, which is precisely why the eye goes to it. Putting a glow on the hull spends that.
3. **Colour is energy or a warning.** The hull is olive, bone and gunmetal. The fourteen element hues and the hazard livery are the only saturated things in the system, so they read instantly.
4. **Legends are stencilled, output is monospaced.** Condensed caps (Oswald) for anything painted on the hull; IBM Plex Mono for anything the machine itself prints. Numbers are always tabular so a changing value never shifts the layout.

## Where things live

| File | Role |
|---|---|
| `my-app/public/assets/css/system.css` | **The design system.** All `--g-*` tokens and every `.g-*` component. |
| `my-app/src/constants/designTokens.js` | **The JS half of the palette.** For recharts / GSAP / SVG, which cannot read a CSS variable. |
| `my-app/src/constants/colorConstants.js` | The 14 element colours. Re-exported through `designTokens.js` as `themeColors`. |
| `my-app/src/__tests__/designTokens.test.js` | Fails the build if the CSS and JS palettes disagree. |
| `my-app/public/assets/css/tokens.css` | **Temporary compatibility shim** mapping the old `--x-*` names onto the new ones. Delete when nothing references `--x-*`. |
| `my-app/public/assets/css/style.css` | Page-specific layout. Should not define new colours. |
| `my-app/src/pages/styleGuidePage.js` | The living reference at `/styleguide`. |

## The palette

Structure is deliberately desaturated so the element hues own every saturated pixel.

| Group | Tokens | Use |
|---|---|---|
| Hull | `--g-void`, `--g-hull-lo`, `--g-hull`, `--g-hull-hi`, `--g-seam` | The room and the panels bolted to it |
| Brass | `--g-brass`, `--g-brass-dark`, `--g-brass-light` | Bezels, trim rings, fasteners |
| Ink | `--g-ink`, `--g-ink-mid`, `--g-ink-low`, `--g-ink-invert` | Silkscreen legends. Never pure white — paint yellows |
| Phosphor | `--g-phosphor`, `--g-screen-glass` | The CRT, and **only** the CRT |
| Lamps | `--g-lamp-amber`, `--g-lamp-red`, `--g-lamp-off` | Indicator bulbs behind coloured plastic |
| Hazard | `--g-hazard`, `--g-hazard-dark` | The committing action, and warning livery |
| Elements | `--g-el-fire` … `--g-el-sand` | The 14 element hues. **Fixed points — do not restyle these.** |
| Stats | `--g-stat-*` | Semantic stat colours for charts |

### `--g-el` — the element in scope

The single most useful thing in the system. Put `.g-el-fire` (or any element) on a container and **everything inside it retunes**: meters light in fire, chips print in fire, tagged panels take a fire band. Components read `--g-el` rather than naming a colour.

```html
<div class="g-panel g-panel--tagged g-el-psychic">
  <span class="g-chip">Psychic</span>
  <div class="g-meter"><div class="g-meter-fill" style="width:64%"></div></div>
</div>
```

## Components

| Class | What it is |
|---|---|
| `.g-console` | The page. Warm near-black with paint tooth. Wraps everything. |
| `.g-panel` | An enamelled steel panel. `--raised`, `--recessed`, `--bolted` (rivets), `--tagged` (element colour band). |
| `.g-panel-head` | The stencilled title strip across the top of a panel. |
| `.g-screen` | **A CRT.** Phosphor text on glass, scanlines, brass bezel. The only thing that emits. |
| `.g-screen-line`, `--dim` | A line of terminal output. |
| `.g-readout`, `.g-readout-unit` | A large machine-reported number. Belongs inside a screen. |
| `.g-meter` + `-track` / `-ghost` / `-fill` | Segmented bulb strip. Lit = current, dim = growth potential, dead = unreachable ceiling. |
| `.g-chip`, `--outline` | A printed classification label. |
| `.g-btn`, `--primary`, `--danger` | Moulded keys that travel when pressed. Primary wears hazard paint; **one per screen**. |
| `.g-input`, `.g-select` | Text entry is a screen: phosphor on glass in a brass bezel. |
| `.g-segmented` + `.g-segment` | A bank of selector keys. Use `aria-pressed`. |
| `.g-check` + `.g-check-box` | A toggle with a real throw. |
| `.g-lamp`, `--amber` / `--red` / `--off` | Indicator bulbs. Static — they do not pulse. |
| `.g-notice`, `--alert` / `--ok` / `--inert` | An inline notice with a painted edge. |
| `.g-working` | Indeterminate progress. The machine will not fake a percentage. |
| `.g-empty` | Nothing here yet. |
| `.g-specimen` + `.g-specimen-inner` | Artwork behind glass in a brass housing. |
| `.g-tile` | A catalogue tile for grids. |
| `.g-record` | A row in a list — glossary terms, search results. |
| `.g-spec` + `-key` / `-val` | Key/value pairs, as printed on a spec plate. |
| `.g-data` | A data table. |
| `.g-hazard-strip`, `.g-seam-rule`, `.g-rivet-rule` | Livery and dividers. |
| `.g-shell`, `.g-measure` | Layout: page width, readable line length. |

## Rules for new work

1. **No raw hex.** If you are typing `#`, you want an existing token or you are adding one. Add it to *both* sides and to `PAIRINGS` in the test.
2. **Never glow the hull.** If something needs to draw the eye, make it a screen or give it a lamp.
3. **Use the spacing scale** (`--g-1` … `--g-9`, 4px based), not arbitrary pixels.
4. **Cap prose at `--g-measure`.** Long lines across a wide viewport are unreadable.
5. **One `--primary` button per screen.** It is the committing action.
6. **Contrast floor is 4.5:1.** `--g-ink-low` is the faintest step that clears it against the hull; anything fainter is decoration and must not carry meaning.
7. **Disabled means unpowered, not faded.** The legend stays legible.
8. **Motion is mechanical.** Switches throw, keys travel. Nothing drifts or eases lazily. Everything decorative is disabled under `prefers-reduced-motion`.

## Deliberately avoided

These were tried and removed, because stacking every effect at once is what makes an interface look generated rather than designed:

- A scanline/vignette/grid overlay across the whole page — the CRT texture belongs on the CRT.
- An animated scan sweep over artwork.
- Pulsing status dots.
- A marker glyph before every label.
- Glow on large readouts that were already the biggest, most colourful thing present.
- Chamfered corners on every component — the chamfer survives on the specimen mount alone, where it reads as a machined bezel rather than as wallpaper.

## Adding a colour

1. Add the CSS token to `:root` in `system.css`.
2. Add the matching value to `designTokens.js`.
3. Add the pair to `PAIRINGS` in `designTokens.test.js`.
4. Run the tests. If you skipped step 2 or 3, they will tell you.

## Known debt

- `tokens.css` is a temporary shim. Every page migrated to `.g-*` should shrink it; delete it when nothing references `--x-*`.
- `style.css` is a 3504-line BootstrapMade template ("Gp v4.7.0") with many unused rules. A naive scan says ~115 of 293 class names are unreferenced, **but that has false positives**: `btn-xalianGreen` *is* used, composed by bootstrap from `variant='xalianGreen'`. Do not bulk-delete on that signal.
