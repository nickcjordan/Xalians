# Encyclopedia Xalia: Page Architecture

## Context

Nick asked for one unified lore page on the site (2026-09-02): a storytelling guide to the whole of Xalia that will eventually replace the separate glossary, planets, and species pages. The source material is the ratified Encyclopedia bundle (`docs/encyclopedia/encyclopedia.json`, 72 entries in 8 categories, definitions verbatim from the glossary), the new Chronicle (`docs/encyclopedia/chronicle.json`: 7 eras, 61 ordered events with source anchors, an era tag on every one of the 163 planet-history paragraphs, ratified undated on 2026-09-02), the 14 planet histories, the 29 legacy species and the species templates migrating them one at a time (2 of 29 ratified as of 2026-09-02), and the species artwork already in the frontend (30 SVG portraits).

This document is the contract for the build. It fixes the routes, the data bundle, the module boundaries, the public API of the data layer, the section-by-section behavior, and the verification harness, so that each section can be built by an independent agent and integrated once. Nothing visual is specified beyond what the design system already fixes; the compositions are new, built from `.g-*` parts.

Nick's steers that shape this design: species detail is built on the creature template and registry model, not the legacy species stub; the planet data is mid-redesign, so the Worlds section is a light touch that reads through one adapter; third-party libraries are welcome; the planet GIF animations are liked and reusable, the static landscape images are old AI renders used only as references; an SVG galaxy map is worth attempting but the GIFs may win.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | The page ships as one route family under `/encyclopedia`, and the old `/glossary`, `/planets`, `/species` pages stay untouched until Nick says swap. | 95%: Nick said he will "probably end up scrapping all that" but did not say when. | Nick, 2026-09-02 |
| 2 | Every data file the page reads lives in `lambda/src/json/` and reaches the frontend through the existing `copy-json` step; no new build plumbing. | 95%: the internal companion already names this as the flip plan. | `docs/encyclopedia/ENCYCLOPEDIA-INTERNAL.md` "Relationship to the shipped bundle"; `my-app/package.json` `copy-json` |
| 3 | `planetRecords.json` (untracked on every branch, one reverted commit) is committed as-is and read through a single adapter, so the planet redesign can replace its physical block without touching the UI. | 85%: the planet redesign doc says it supersedes and extends this file rather than replacing it, and Nick asked for a light touch on planets. | `docs/design/xalian-planet-system-redesign.md` Context; Nick, 2026-09-02 |
| 4 | Migrated species records are bundled by a script into one `speciesRecords.json` (ratified templates only, never the `*-run.*` files), and the Bestiary renders a unified view from either a template or a legacy stub. | 85%: 27 of 29 species are still stubs; the page must not wait for migration. | `docs/species-templates/` listing; `.claude/skills/migrate-species/SKILL.md` §7 outputs |
| 5 | Registry vocabularies (traits, archetypes, physiology enums, capabilities, instruments, actions, special senses) are extracted into `registries.json` as key, display name, and one-line nature, generated from the ratified definitions in the migrate-species skill. | 80%: the creature redesign ratified "vocabularies are registry data" but no machine-readable file exists yet. | `docs/design/xalian-creature-system-redesign.md` §2 "Vocabularies are registry data"; skill §5.2, 5.3, 5.5, 5.6, 5.7 |
| 6 | The species record's graded readouts (attribute bands, capability bands, trait percents, archetype weights) are shown on the public species page as Generator readouts, since the existing species page already shows stats and the site's premise is the Generator's own console. Prose never carries mechanics; readouts are not prose. | 75%: the internal companion says "mechanics never leak into Encyclopedia prose", which this reading respects, but Nick has not ruled on readouts specifically. | `ENCYCLOPEDIA-INTERNAL.md` Source precedence #4; `docs/DESIGN_SYSTEM.md` `.specimen-record` |
| 7 | The Chronicle renders from `chronicle.json` era tags: an era view lists the era's events and every history paragraph tagged to it, grouped by world. Paragraphs tagged `natural` appear only on the world's own page. | 90%: this is what the data was built for. | `docs/encyclopedia/chronicle.json` |
| 8 | Search is client-side over the whole corpus (under 400 KB of JSON) using MiniSearch; no backend. | 90%: corpus size measured; MiniSearch is dependency-free and works with React 17. | `wc -c` of the JSON files; MiniSearch README |
| 9 | Auto-linking of entry titles in prose is deterministic and mechanical (longest title first, whole-word, first occurrence per paragraph), consistent with the encyclopedia's rule that `related` links are mechanical, never thematic. | 85% | `docs/encyclopedia/README.md` "Rules of the road" |
| 10 | The galaxy map is an inline SVG whose positions come from canon (Telypso at the core, Grimedes and Zolton on the rim, Stonera in Cybele, Phantiri in Wraithix) and is otherwise arranged for legibility; it is a locator, not a star chart. Planet GIFs are the fallback and the detail-page globe. | 70%: Nick wants to see it and may prefer the GIFs. | Nick, 2026-09-02; `planets.json` histories |
| 11 | Shared page CSS goes in `public/assets/css/encyclopedia.css` (shell, search, prose, layout helpers); each section component imports its own `<Component>.css` beside it so parallel agents never edit one file. All prefixed `.enc-`, only `--g-*` tokens, no new hex. | 95% | `docs/DESIGN_SYSTEM.md` "Rules for new work"; build day 2026-09-02 |
| 12 | React Router v5 nested routes under one lazy page; no router upgrade. | 95% | `my-app/src/App.js` |
| 13 | The work happens on `feat/encyclopedia`, branched from `data/ability-catalog` (which contains master), in the worktree `C:/dev/src/xalians-encyclopedia`, because the encyclopedia and chronicle data live on the catalog branch. | 90% | `git merge-base` check, 2026-09-02 |

## 1. Information architecture and routes

The page is the archive of a Xalian Generator: the machine's own records of the galaxy it serves. Masthead: Encyclopedia Xalia. One persistent search field on every screen.

| Route | Section | What it shows |
|---|---|---|
| `/encyclopedia` | Reading room | The galaxy map, the story of Xalia in the seven eras (one paragraph each, linking into the Chronicle), and entry points to every section. |
| `/encyclopedia/chronicle` | Chronicle | The seven eras on a vertical rail. Landing shows every era collapsed with its name, definition, and event count. |
| `/encyclopedia/chronicle/:era` | Era | The era's galaxy narrative is not stored (the Chronicle doc's prose is a review draft, not shipped canon); the page shows the era definition, the ordered events with their anchor quotes and the worlds involved, and the world-by-world history paragraphs tagged to the era, filterable by world. |
| `/encyclopedia/worlds` | Worlds | Fourteen survey tiles keyed by element, sorted as in `planetRecords.json`. |
| `/encyclopedia/worlds/:key` | World | Survey record: designation, element, animated globe (GIF), physical plate, the Generator environmental report printed on a screen, the full history as numbered chapters with era tags, native species, and every entry that names the world. |
| `/encyclopedia/species` | Bestiary | Tile grid of all 29 species, filter by world and element, sort by name or world. |
| `/encyclopedia/species/:key` | Species | Specimen record built from the template when one exists, from the legacy stub otherwise (see §4). |
| `/encyclopedia/powers` | Powers and peoples | Entries from the `factions` and `people` categories, plus the Xalian peoples (demonyms) with their worlds. |
| `/encyclopedia/index` | Index | All entries, search, category chips, alphabetical. |
| `/encyclopedia/index/:key` | Entry | One entry: definition, category, element chip if any, related entries, and "appears in" (every world history paragraph and species description that names it). |

Navigation: the navbar gains an "Encyclopedia" link between Home and Species. The old links stay until the swap.

## 2. Data bundle (files in `lambda/src/json/`)

| File | Origin | Shape | Status |
|---|---|---|---|
| `encyclopedia.json` | copied from `docs/encyclopedia/encyclopedia.json` by `scripts/bundleLore.js` | `{ masthead, version, note, categories, entries: [{ key, title, category, definition, related, element? }] }` | exists in docs |
| `chronicle.json` | same script | `{ version, note, eras: [{ key, name, order, definition }], events: [{ key, title, era, order, firmness, anchors: [{ planet, paragraph, quote }], planets, entry }], paragraphs: [{ planet, index, era, alsoEras, events, confidence, summary }] }` | exists in docs |
| `planetRecords.json` | committed as-is | `[{ key, name, element, images: { landscape, planet }, physical: { terrainLabel, sizeVsEarth, radiusKm, gravityVsEarth, temperatureC: { low, high } }, report: { unit, protocol, cycle, terrain, mobility, fauna, hazards, outputPriorities }, history: [string] }]` | untracked today |
| `species.json` | unchanged | legacy 29 | exists |
| `speciesRecords.json` | `scripts/bundleLore.js` gathers `docs/species-templates/<key>.json` for keys listed in a manifest of ratified species, plus each `<key>.encyclopedia.json` entry | `{ version, records: [template], entries: [encyclopedia entry] }` | new |
| `registries.json` | transcribed once by an agent from the ratified definition text in the migrate-species skill (`docs/species-templates/registries.json`), copied by `bundleLore.js`; sight, hearing, smell added as graded senses | `{ attributes, archetypes (with favors), traits, elements, physiology: { corporeality, composition, bodyPlan, covering, diet, communication, media, lifespan, chirality, descriptionStatus }, capabilities, senses, anatomy, channels, actions, instrumentActions }`, each an array of `{ key, name, nature }` | new |

`scripts/bundleLore.js` is idempotent and run by hand after lore changes, like `buildCanonCompendium.js`. The frontend never imports from `docs/`.

Species encyclopedia entries from `speciesRecords.json` are merged into the index at load time under category `xalians`; they are not written into `encyclopedia.json` until the flip.

## 3. Module layout (one folder per agent)

```
my-app/src/lore/                    data layer, no React, fully unit-tested
  index.js                          public API (below); the only import the UI uses
  loaders.js                        imports the JSON, builds the maps once
  entries.js                        entry index, related resolution, appears-in
  worlds.js                         planet adapter (PlanetView), native species, era-tagged chapters
  species.js                        SpeciesView from template or legacy stub; registry lookups
  chronicle.js                      EraView: events, paragraphs by world
  search.js                         MiniSearch index over entries, worlds, species, paragraphs
  linkify.js                        prose -> segments with entry links
  routeFor.js                       the one route convention (re-exported)
  __tests__/                        vitest: integrity + behavior

my-app/src/components/encyclopedia/ UI, one file per section plus shared parts
  EncyclopediaShell.js              masthead, section tabs, search field, outlet
  ReadingRoom.js
  GalaxyMap.js                      inline SVG, element-scoped worlds, hover cards
  Chronicle.js  EraView.js
  Worlds.js  WorldView.js
  Bestiary.js  SpeciesView.js
  Powers.js
  Index.js  EntryView.js
  Prose.js                          renders linkified prose; the only place links are made
  EntryHoverCard.js
  LoreSearch.js

my-app/src/pages/encyclopediaPage.js   lazy route shell with the nested <Switch>
my-app/public/assets/css/encyclopedia.css
scripts/bundleLore.js  scripts/extractRegistries.js
```

Rule: UI components never import JSON. They call `lore`. The integrator (Fable) alone touches `App.js`, `navbar.js`, `index.js` of the lore module, and `encyclopedia.css` shared rules; section agents own their component file and their `.enc-<section>-*` CSS block.

## 4. Data layer public API (`src/lore/index.js`)

All functions are synchronous and pure after first load. Keys are lowercase kebab-case throughout; planet keys are the lowercase planet name; species keys are the lowercase species name; entry keys are the encyclopedia keys.

```
getMasthead() -> { title, version }
getCategories() -> [key]
getEntry(key) -> Entry | undefined
getEntries({ category?, element? }) -> [Entry]           sorted by title
getRelated(key) -> [Entry]                                resolved, in the stored order
getAppearances(key) -> [{ kind: 'world'|'species', key, name, paragraph?: number, excerpt }]

getWorlds() -> [PlanetView]                                in file order
getWorld(key) -> PlanetView | undefined
PlanetView = { key, name, element, images, physical, report, chapters: [{ index, text, era, alsoEras, events }], nativeSpecies: [SpeciesView], entries: [Entry], entry: Entry }

getSpeciesList() -> [SpeciesView]                          sorted by name
getSpecies(key) -> SpeciesView | undefined
SpeciesView = {
  key, name, element, homePlanet, planet: PlanetView,
  source: 'template' | 'legacy',
  portrait: { svgName },                                   the name XalianImage expects
  description, biomeNiche?, entry?: Entry,
  legacy?: { height, weight, statRatings, traits },        only when source is legacy
  record?: {                                               only when source is template
    physiology, traits: [{ key, name, nature, percent }],  sorted percent desc, zeros dropped
    archetypes: [{ key, name, nature, weight }],
    attributes: [{ key, name, band: [lo, hi] }],
    capabilities: [{ key, name, band }], senses, instruments: [{ key, name }],
    signature: { name, instrument, action, medium, intensity, description }
  }
}

getEras() -> [EraView]                                     ordered
getEra(key) -> EraView | undefined
EraView = { key, name, order, definition, events: [EventView], worlds: [{ planet: PlanetView, paragraphs: [chapter] }] }
EventView = { key, title, firmness, order, anchors: [{ planet: PlanetView, paragraph, quote }], planets: [PlanetView], entry?: Entry }
getOverview() -> [{ era: EraView, blurb }]                 the reading-room beats; blurbs are the era definitions

getPowers() -> { factions: [Entry], people: [Entry], peoples: [{ name, planet: PlanetView, entry?: Entry }] }

search(query, { limit = 20 }) -> [{ kind: 'entry'|'world'|'species'|'paragraph'|'era', key, title, snippet, score, route }]
linkify(text, { except?: key }) -> [{ text } | { text, key, title }]
routeFor(kind, key) -> string
```

Demonyms for `getPowers().peoples` come from the Chronicle doc's ratified list: Magmuthites, Grimedites, Luminarii, Zolto, Krystians, Veridians, and the Phantiri. Those with encyclopedia entries (Magmuthites, The Zolto, Veridians) link to them; the rest carry only their world. No demonym is invented for the other seven worlds.

## 5. Section behavior

### Reading room
The galaxy map on the left rail, the seven-era story beside it as a numbered stack of `.g-record` rows (era name stencilled, definition in prose, a "read this era" key), and a bottom strip of four tiles into Worlds, Bestiary, Powers, Index. The map's hover card shows the world's name, element chip, and terrain label; click goes to the world.

### Galaxy map
Inline SVG, 14 worlds as element-colored discs on a dark field with faint concentric guides. Positions are a hand-authored constant in `GalaxyMap.js` honoring canon: Telypso at the center; Veridium near the core; Grimedes at the far rim beside a drawn black hole; Zolton on the rim; Stonera inside a drawn belt (Cybele); Phantiri off in its own system (Wraithix) with a moon; the rest spaced for legibility. Motion is mechanical: a disc lights when hovered, nothing drifts. Under `prefers-reduced-motion` nothing animates. If Nick prefers the GIFs, the map swaps its discs for clipped GIF globes without changing the component API.

### Chronicle and era
The rail lists eras top to bottom. An era page shows: the definition; the events in order as `.g-record` rows, firm events with a solid rule and contemporaneous events grouped under a "contemporaneous, unordered" legend; each anchor quote printed in mono on a screen line with its world and chapter number, linking to the world's chapter; the world-by-world paragraphs beneath, one `.g-panel--tagged` per world scoped to its element, with the paragraph text linkified; a world filter as a `.g-segmented` bank. Adjacent-era keys at the bottom.

### Worlds and world
Tiles: GIF globe in a `.g-specimen` housing, name plate, element chip, terrain label. World page: the animated globe in a brass porthole, the physical plate as `.g-spec` pairs (terrain, size, radius, gravity, temperature), the environmental report on a `.g-screen` as machine output (unit, protocol, cycle, terrain features, mobility ratings as lamps, fauna observations, hazards, output priorities), then the history as chapters with a stencilled era tag on each, then native species tiles, then related entries. Because the physical block is mid-redesign, the plate reads a display-set array from `worlds.js` so fields can change without touching the component.

### Bestiary and species
Tiles reuse `XalianImage` inside `.g-tile`, scoped `.g-el-<element>`, with filters for world and element. Species page, template source: designation across the top (name, element chip, home world link, "record ratified" lamp), portrait in the specimen mount, the description and biome niche as prose, the physiology as `.g-spec` pairs using registry display names (corporeality, composition, body plan, covering, size band, diet, communication, breathes, ambient media, temperature band, lifespan), capabilities and senses as `.g-meter` bands (ghost = band ceiling, fill = band floor), attributes as bands the same way, traits as chips with their percent, archetype weights as a short ranked list, instruments as chips, and the signature ability on a screen. Legacy source: the same designation and portrait, the description, a compact plate (height, weight, attack range, flies), the legacy ratings as meters, and an inert lamp reading "record pending migration". The encyclopedia entry, when present, prints beneath the description.

### Powers and peoples
Three groups: Factions, People, Xalian peoples. Each row is an entry record with its definition linkified; peoples rows carry the world's element chip.

### Index and entry
A `.g-input` search, category chips, alphabetical records. Entry page: definition, category and element chips, related entries as records, "appears in" as a list of world chapters and species with excerpts, each linking into place.

### Search
One field in the shell. Typing opens a results panel (a screen) grouped by kind; enter goes to the Index with the query applied. MiniSearch fields: title (boost 3), definition, summary, text; prefix and fuzzy 0.2.

## 6. Design system usage

Only `.g-*` components and `--g-*` tokens. Panels matte, screens the only lit thing, lamps static. Element scoping via `.g-el-<element>` on every world- or species-scoped container. Type: Oswald for legends and era names, Barlow for prose, IBM Plex Mono for anchor quotes, report output, and any number. Prose capped at `--g-measure`. Page is a full-width left-rail layout for catalogues and the era rail, and a centered document for a single entry. Contrast floor 4.5:1. Nothing in `style.css` is touched. Old `--x-*` tokens are not used.

## 7. Libraries

- `minisearch` (client search, no dependencies, MIT). Added to `my-app`.
- No icon library: the system has no glyph vocabulary and adding one would introduce a second visual voice.
- No new animation library: GSAP is already present; the map and rail need only CSS transitions.

## 8. Verification harness

Unit tests (vitest, run in CI):

- `lore.integrity.test.js`: every `related` key resolves; every planet entry has an element; every chronicle paragraph index exists in the planet history; every event anchor quote is found verbatim in the planet history; every species has a home planet that exists; every template species key has a legacy species; every registry key referenced by a template exists in `registries.json`.
- `lore.species.test.js`: SpeciesView from a template and from a stub; zero-percent traits dropped; registry names resolved.
- `lore.chronicle.test.js`: eras ordered; an era's world groups contain exactly the paragraphs tagged to it (primary or also); firm and contemporaneous ordering preserved.
- `lore.linkify.test.js`: longest title wins; whole-word only; one link per title per paragraph; `except` suppresses self-links.
- `lore.search.test.js`: a title query ranks its entry first; a history phrase finds its paragraph.

Visual verification (Fable, before anything is shown to Nick): each route rendered in Chrome at 1600 and 390 px widths, screenshots checked for the left-rail rule, contrast, no horizontal scroll, and that element scoping paints. A critic pass (separate Sonnet agent, no code) scores each section against this document and the design system on a 1 to 10 bar and lists defects; the builder never self-grades.

## 9. Build order and delegation

0. Fable: commit `planetRecords.json`; write `scripts/bundleLore.js` and the ratified-species manifest; Haiku extracts `registries.json` from the skill text; Fable checks it against the skill.
1. Sonnet: `src/lore/` with all tests green, against this API. Fable reviews the API surface.
2. Sonnet, in parallel, one agent each: shell plus search plus index plus entry; reading room plus galaxy map; chronicle plus era; worlds plus world; bestiary plus species; powers. Each agent gets this doc, the design system doc, the styleguide page as the class reference, and its section's contract, and must render its section in the dev server and screenshot it before reporting.
3. Fable integrates routes, navbar, CSS, and runs the visual pass.
4. Sonnet critic scores; Fable fixes or reassigns; repeat until the weakest section clears 8.
5. Nick reviews on the dev server.

## 10. Open items for Nick

1. Readouts on the public species page (assumption 6): keep the graded bands and trait percents visible, or restrict the public page to prose, portrait, and physiology?
2. The galaxy map versus the GIFs (assumption 10): the map will be built; the decision to keep it can wait until it is seen.
