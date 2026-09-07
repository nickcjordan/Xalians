# Xalians Design System, version 3: one relay, many terminals

**Every agent that touches anything visual reads this file first, then loads the `build-ui` skill (`.claude/skills/build-ui/SKILL.md`), which walks through the decisions below in order.** The living reference is `/styleguide`, rendered from the same tokens and classes the pages use. The reference mockups that ratified this direction are in `docs/design/terminal-mockups.html` (open it in a browser).

Version 3 replaces the version 2 premise ("the whole site is the control panel of one Xalian Generator"). That premise had no support in canon: the lore never shows anyone operating a Generator. It also broke a rule it did not know it had, which is described under **The medium rule** below.

## 1. The umbrella: the site is a relay

The lore has an object that connects many machines into one view: the Zolto rebuilding the QED network, the galaxy's only instant link, while King Kozrak tries to keep the galaxy in the dark. That is xalians.com.

- The **site shell** (navbar, sign-in, account, home) is **a relay**: a hand-built Zolto QED unit. It is the one constant object.
- Each **area** of the site is **a remote terminal** the relay has patched you into: a Poseidas archive for the encyclopedia, a Kozrak arena registry for the duel, a salvaged ECHELON-era field terminal for the generator and Reclamation.
- Each terminal is a **different piece of hardware from a different faction and era**, and is allowed to look like it. Holism is required *within* an area, not across the whole site.

This is the same structure that multi-product design systems use: a **core layer** nobody may change per area, and a **material layer** each area sets.

### The aesthetic in one line

Used-universe cassette futurism, Alien's Nostromo strain rather than Fallout's. Worn corporate hardware kept running in a salvage era. No 1950s Americana: no atomic starbursts, chrome fins, cheerful ad typefaces, Pip-Boy green, or yellow-and-black chevrons. Radiation exists in the fiction as a hazard, never as a period style.

## 2. The three rules

Every terminal obeys all three. The `build-ui` skill checks them in this order.

### Rule A: core and material

**Core** (shared, never overridden per terminal): spacing scale, type scale, the 14 element hues, stat colors, meter and chip semantics, the contrast floor (4.5:1), one primary action per screen, only screens and lamps emit, motion is mechanical, tabular numerals, and rules B and C.

**Material** (set once per terminal, in `system.css` under `[data-terminal="..."]`): hull and face colors, ink on the hull, paper stock and its typewriter face, glass and phosphor, the accent (the committing color), the trim (bezel, seal, rule), legend typeface, output typeface, corner radius, bevel depth, wear level, and the terminal's diegetic furniture (tape, clip, stamp, cover plate).

### Rule B: the medium rule

Every piece of content lives in exactly one of three media. A hull is painted once at the factory: it can carry the word INDEX but it cannot carry `#00015`, because the next creature has a different number.

| Medium | What it is | Carries | Never carries |
|---|---|---|---|
| **Hull** | Painted metal, matte, never emits | Fixed legends, key caps, lamps, bezels, asset plates, warning livery. Anything identical for every creature and visitor. | Variable data. Anything that changes per record or per user. |
| **Paper** | Printed once, matte, variable but committed | A minted creature's slip, a ledger docket, an archive card. Typewriter or line-printer face. Stamps and colored tabs are how paper carries state and element color. | Buttons. You cannot press paper. Live state. |
| **Screen** | Live, variable, the only thing that emits | Anything that can still change: a record being generated, link status, a battle in progress, a cursor. A color raster CRT can carry a full record in element color; an amber or green strip carries only the machine's own status. | Fixed legends (those are painted on the bezel). |

Consequence: **the specimen record is not a restyled panel.** `components/xalianRecord.js` renders the record's content only; the page wraps it in the medium its terminal uses: `.g-crt` on the Field Terminal, `.g-paper--card` in the Archive, `.g-paper--docket` in the Registry. Version 2 printed creature data in monospace on the matte hull everywhere (`.specimen-panel` in `style.css`); that is the single largest thing version 3 changes.

### Rule C: the anchoring rule

An object shows how it is attached to the world, or the viewer cannot tell a surface from a screen from empty space. Paper is clipped, pinned, or lies slightly askew, and it ages. A screen sits in a bezel with screws and a curved-glass highlight. Keys sit in a recessed bank and have travel. A plate has screws and vents. A counter has a lit top edge and a dark front lip. **Use the fewest cues that make the object read.** Revision 4 of the relay mockup drew a whole circuit board and was rejected as too much; revision 5 covered it with a screwed-on plate. Cues carry belief, not information, and every one of them is a pixel that can also make the design look overdone.

## 3. The terminals

| `data-terminal` | Object | Faction and era | Hull | Paper | Screen | Accent | Legend face |
|---|---|---|---|---|---|---|---|
| `relay` | Hand-built Zolto QED unit: sheet-steel cover plate with screws and vents, a salvaged color tube in a frame on standoffs, one cable, a tape label | Zolto rebels, present day | Blue-black steel | None. A relay does not print. | Color CRT; record and packet state together | Bloodstorm crimson; copper-yellow silkscreen | Chakra Petch (condensed technical) |
| `field` | ECHELON-era portable survey unit: gunmetal case, off-white enamel face, hinge, four screws, a color CRT under dark glass, a one-line amber VFD status strip, reconditioning tape, asset plate | ECHELON corporations, pre-End Wars, salvaged now | Gunmetal case, off-white enamel face | Tape and asset label only (a slip may print on mint) | Color CRT carries the record; amber VFD carries battery, link, job | Signal orange (company livery) | Michroma (stands in for Eurostile Extended) |
| `readout` | The Generator's own voice: paper-white text on dark glass, no legends, one key. **A mode, not a place**: the Field Terminal's CRT switches to it while a creature prints. | The Generator, autonomous | Whatever terminal is hosting it | None | Everything, monochrome, no element color | Paper-white | IBM Plex Mono only |
| `registry` | Clerk's counter at the Valleron arena: black lacquer with gold rule, lit top edge and dark front lip, a paper docket under a steel clip, a one-line amber ledger display in a screwed bezel, two moulded bakelite keys in sockets | Kozrak's regime, present day | Black lacquer, gold leaf | The docket: typewritten, red margin rule, black-and-white ID photo, element marks as inked stamp outlines, stats as ink bars, admission stamp | Single amber ledger line: entry, fee, bracket | Regime crimson | Cinzel (engraved serif) for hull legends; typewriter on paper |
| `archive` | Reading desk in the Poseidas Deep Archive: dark sea-slate desk under one warm lamp pool, a yellowed catalogue card with foxing, faded typewriter ink, a sepia plate on corner mounts, colored classification tabs, a pencil note, the drawer-rod hole; two enamel keys on the desk | Poseidas, neutral, science and arbitration | Dark sea-slate under lamp light | The card carries the whole record | **None.** The archive has no live display. | Sea teal | Spectral (serif) for the archive's name; typewriter on the card |
| `panel` | The version 2 olive-enamel instrument panel, kept only as the migration baseline | (none) | Olive enamel, brass | None | Small green CRT | Hazard yellow | Oswald |

`panel` is the default when a page sets nothing, so unmigrated pages keep working. **New pages must set a terminal explicitly**; the design-system test fails if a page under `src/pages/` has no `data-terminal`.

## 4. Which terminal does my page use

The rule: match the machine to **who, in the fiction, would own that part of the experience**. If the area is new, answer that question from the lore (`CLAUDE.md` lore summary, `docs/encyclopedia/`) before choosing, and record the answer in the page file's header comment.

| Area | Terminal | Why, in the fiction |
|---|---|---|
| Shell: navbar, sign-in, account, home | `relay` | The connection itself. The Zolto network is the only thing that reaches every other machine. Home is the relay patching you through: which terminals are up, where you left off. |
| Encyclopedia: story, worlds, bestiary, powers, index, codex | `archive` | Poseidas is the neutral seat of science and arbitration. Reading is calm, paper under a lamp, no screens. |
| Generator | `field`, with `readout` as its print mode | Salvaged company hardware pointed at a Generator. The CRT goes to the machine's own voice while it prints, then shows the record in color. |
| Reclamation | `field` | Worlds, sites and deploy orders are survey work on salvaged gear. Same hardware as the generator, different program. |
| Training games | `field`, or a game's own terminal if its fiction demands one | Small diagnostic programs. A game set in the Vallerii golden age could open an aristocratic Krystos register the lore also supports; add it here first. |
| Duel | `registry` for setup, roster and results; the board itself may go dark and clinical within the registry material | Kozrak runs the arenas. Every duel is a ledger entry, every token a fee. |
| Styleguide | renders every terminal | Developer tool. |

Adding a terminal is a design decision, not an implementation detail: add a row to section 3 with its object, faction and media, add the material block in `system.css`, add a section to `/styleguide`, and update the terminal list in `src/__tests__/designSystem.test.js`.

## 5. Where things live

| File | Role |
|---|---|
| `my-app/public/assets/css/system.css` | **The design system.** Core tokens in `:root`, one `[data-terminal="..."]` material block per terminal, every `.g-*` component. |
| `my-app/src/constants/designTokens.js` | **The JS half of the palette** for recharts, GSAP and SVG, which cannot read a CSS variable. Mirrors core tokens and each terminal's material tokens. |
| `my-app/src/__tests__/designTokens.test.js` | Fails if CSS and JS palettes disagree. |
| `my-app/src/__tests__/designSystem.test.js` | Fails if a page lacks `data-terminal`, if a terminal in CSS is missing from the styleguide, or if raw hex is added to CSS outside `system.css`. |
| `my-app/public/assets/css/pages/*.css` | One file per page or area for compositions specific to that page. No colors: everything reads a token. |
| `my-app/public/assets/css/style.css`, `encyclopedia.css`, `reclamation.css`, `duel*.css` | Legacy. Shrinking. Do not add colors to them; move rules out as pages migrate. |
| `my-app/public/assets/css/tokens.css` | Temporary shim mapping old `--x-*` names onto `--g-*`. Delete rules as pages migrate; never add. |
| `my-app/src/pages/styleGuidePage.js` | `/styleguide`, one section per terminal, rendered from the real classes. |
| `docs/design/terminal-mockups.html` | The ratified mockups with their object descriptions. Open in a browser. |
| `scripts/design/snap.js` | Screenshot harness: every route at desktop and phone, with overflow and console-error checks. Run it before claiming visual work is done. |

## 6. How a terminal is applied

One attribute on the page's root element selects the material layer; everything inside retunes.

```jsx
// src/pages/generatorPage.js
// Terminal: field (salvaged ECHELON survey unit pointed at a Generator); readout while printing.
<main className="g-console" data-terminal="field">
  <section className="g-case">                 {/* the unit's face: hull */}
    <div className="g-vfd">PSU-7  BATT 61%  LINK HELD</div>
    <div className="g-crt g-el-psychic">        {/* screen: the record lives here */}
      <SpecimenRecord xalian={x} />
    </div>
    <div className="g-keybank">
      <button className="g-key g-key--primary">Generate</button>
      <button className="g-key">Release</button>
    </div>
    <div className="g-asset-plate">Property of Echelon Bioworks · Asset 0419-PSU</div>
  </section>
</main>
```

Components read material tokens and never name a color. `--g-el` is still the element in scope: `.g-el-fire` on any container retunes meters, chips and tabs inside it, on every terminal.

### Material tokens (every terminal block sets all of these)

| Token | Meaning |
|---|---|
| `--g-void`, `--g-hull-lo`, `--g-hull`, `--g-hull-hi`, `--g-seam` | The room and the terminal's body. |
| `--g-face`, `--g-face-ink`, `--g-face-ink-mid` | A lighter face plate on the body (the field unit's enamel) and the legends printed on it. Same as hull/ink where the terminal has no face. |
| `--g-ink`, `--g-ink-mid`, `--g-ink-low`, `--g-ink-invert` | Legends painted on the hull. |
| `--g-trim`, `--g-trim-dark`, `--g-trim-light` | Bezels, seals, rules, fasteners. (`--g-brass*` are aliases kept for legacy CSS.) |
| `--g-accent`, `--g-accent-ink` | The committing color and the ink printed on it. (`--g-hazard*` are aliases kept for legacy CSS.) |
| `--g-glass`, `--g-phosphor`, `--g-phosphor-dim`, `--g-phosphor-a20`, `--g-screen-glass` | The screen. On a color CRT, phosphor is the text color and element hues carry the rest. |
| `--g-vfd`, `--g-vfd-glass` | The one-line status strip, where the terminal has one. |
| `--g-paper`, `--g-paper-ink`, `--g-paper-ink-faint`, `--g-paper-rule` | Paper stock, its ink, and its ruled lines. |
| `--g-font-legend`, `--g-font-out`, `--g-font-paper`, `--g-font-ui` | Legends on the hull, the machine's output, the typewriter on paper, prose. (`--g-font-stencil` and `--g-font-mono` are aliases for the first two.) |
| `--g-radius`, `--g-radius-panel`, `--g-radius-housing` | Corner geometry. |
| `--g-wear` | 0 to 1. How much scuff, tape shadow and fade the terminal's furniture shows. |
| `--g-lamp-amber`, `--g-lamp-red`, `--g-lamp-off`, `--g-lamp-on` | Indicator bulbs. `--g-lamp-on` is the terminal's live color. |

### Medium components

| Class | Medium | What it is |
|---|---|---|
| `.g-case`, `.g-counter`, `.g-desk`, `.g-cover-plate` | Hull | The terminal's body. Each carries its anchoring cues (hinge and screws, lip and clip well, lamp pool, vents). |
| `.g-legend`, `.g-asset-plate`, `.g-lamp`, `.g-key`, `.g-keybank`, `.g-tape` | Hull | Fixed legends, fasteners, lamps, keys with travel, tape labels. |
| `.g-paper`, `--card`, `--docket`, `--slip`; `.g-stamp`, `.g-tab`, `.g-clip`, `.g-meter--ink`, `.g-plate--photo` | Paper | A printed record and the things that sit on it. No buttons inside `.g-paper`. |
| `.g-crt`, `.g-vfd`, `.g-screen`, `.g-readout`, `.g-meter` (lit), `.g-chip` | Screen | Live displays. Only these and lamps emit. |

### Legacy components still valid on every terminal

`.g-panel`, `.g-panel-head`, `.g-btn` (use `.g-key` for physical keys on hull), `.g-input`, `.g-select`, `.g-segmented`, `.g-check`, `.g-range`, `.g-notice`, `.g-working`, `.g-empty`, `.g-specimen`, `.g-tile`, `.g-record`, `.g-spec`, `.g-data`, `.g-hazard-strip`, `.g-seam-rule`, `.g-rivet-rule`, `.g-shell`, `.g-measure`. They read material tokens, so they retune per terminal.

## 7. Rules for new work

1. **Pick the terminal first** (section 4) and write it in the page file's header comment with the lore reason. Set `data-terminal` on the page root.
2. **Sort every element into hull, paper or screen** before styling it. If it is variable data, it is not on the hull.
3. **Anchor it with the fewest cues** that make the object read. If you are adding a third fastener, stop.
4. **No raw hex.** A new color is a token, added to `system.css` and `designTokens.js` and to `PAIRINGS` in the test. Material colors go in the terminal's block, never in `:root`.
5. **Element hues are fixed points.** Fire is red on every planet. Do not restyle them per terminal.
6. **Use the spacing scale** (`--g-1` to `--g-9`), cap prose at `--g-measure`, keep the contrast floor at 4.5:1, one primary action per screen, tabular numerals for anything that counts.
7. **Motion is mechanical.** Keys travel, switches throw, a CRT hands over with a cut, not a fade. Decorative motion is off under `prefers-reduced-motion`.
8. **Verify by paint.** Run `node scripts/design/snap.js` against your dev server and look at the PNGs at both widths. A check that could not have failed is not a check.
9. **Report friction in the moment.** If a page's fiction does not fit any terminal, or a rule forces something absurd, say so in the same message with the concrete case and the smallest change. Terminals and rules are levers, not stone (see `CLAUDE.md`).

## 8. Deliberately avoided

- A whole-page scanline, vignette, or noise overlay. Texture belongs on the object that has it: a CRT, a card, a plate.
- Pulsing lamps, animated scan sweeps, glow on the hull, marker glyphs before every label, chamfers on every corner.
- Exposed electronics as decoration. The relay's circuit board was drawn and rejected; a cover plate does the job.
- Fallout signals: Pip-Boy green as the phosphor of record, hazard yellow as the accent, atomic-age iconography.
- Fake precision. `.g-working` shows the machine working; it does not invent a percentage.

## 9. Migration state

| Area | Terminal | Status |
|---|---|---|
| Generator | field + readout | migrated 2026-09-07 |
| Shell: navbar, home, account | relay | migrated 2026-09-07 |
| Encyclopedia (all sections) | archive | migrated 2026-09-07 |
| Duel setup and roster | registry | migrated 2026-09-07; the live board (`duelPage.js`) stays on `panel` |
| Styleguide | relay, renders every terminal | migrated 2026-09-07 |
| Reclamation | field | not started; on explicit `panel` baseline |
| Training games, Long Return, duel playground, user details | field / registry / relay | not started; on explicit `panel` baseline |

Update this table in the PR that migrates a page.

## 10. Lessons recorded during the version 3 build

- A custom property that references another custom property with `var()` resolves once, on the element that declares it. `--g-font-stencil: var(--g-font-legend)` declared only in `:root` therefore never retunes per terminal. Every alias and every derived token (`--g-screen-bloom`) is redeclared inside each `[data-terminal]` block for this reason. Keep doing that when adding one.
- `.g-console::before` (the paint tooth) must be `position: absolute`, not `fixed`, or it clips at one viewport height and paints a seam on every tall page.
- The navbar declares `data-terminal="relay"` on itself so it stays the relay on every page. Because it is on every page, it may not carry the page's single primary key.
- Modifier classes (`.g-paper--card`) do not work without their base class (`.g-paper`); the remaps live on the base.
