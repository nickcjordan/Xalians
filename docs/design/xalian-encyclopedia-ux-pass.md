# Encyclopedia Xalia: UX pass (September 2026)

## Context

The first Encyclopedia page shipped 2026-09-02 (PR #60, contract in `xalian-encyclopedia-page.md`). Nick reviewed it as a good first pass and asked for a UX pass with creative freedom. The pass was presented as six ranked recommendations and he approved all six on 2026-09-02, with the guided tour written in the warmer historian's voice the planet histories use. This document is the build contract for that pass. It extends the first contract; where the two disagree, this one wins.

The theme of the pass: the first build is a set of catalogs. This pass gives the reader time as a dimension they can move through, a beginning they can follow, and a trail they can retrace.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | The tour is canon-derived prose in the historian's voice (planet-history register, rule set in `.claude/skills/lore-voice/SKILL.md`), not a new canon source. It restates; it never adds facts, dates, or resolutions. Nick signs off on the text in the PR. | 90%: his words were "the warmer historian's voice" | `.claude/skills/lore-voice/SKILL.md`, `docs/encyclopedia/ENCYCLOPEDIA-INTERNAL.md` |
| 2 | The era scrubber lights worlds by chronicle footprint: a world is lit in an era when it has at least one history paragraph tagged with that era (primary or alsoEras) or appears in an event of that era. | 85%: this is the only data the chronicle carries | `docs/encyclopedia/chronicle.json` paragraphs and events |
| 3 | "Read as one story" orders paragraphs by the first chronicle event they are tagged with (event order within the era), then planet order, then paragraph index; untagged-in-era paragraphs trail in planet order. No new editorial ordering is invented. | 80%: events are the only cross-world ordering the canon supports | `chronicle.json` events[].order, paragraphs[].events |
| 4 | Trail and read marks are per-browser (localStorage), never synced and never sent anywhere. The lore layer stays pure; the marks live in a UI utility. | 95% | `my-app/src/lore/index.js` header comment |
| 5 | Powers: the three demonym entries currently categorized `factions` (magmuthites, the-zolto, veridians) are shown only under Xalian Peoples, not Factions; `vallerii` and `king-kozrak` render under a section titled "The Vallerii". Categories in `encyclopedia.json` are left as they are (keys and categories are append-only per the internal doc); the page groups them. | 85% | `my-app/src/lore/entries.js` getPowers, `encyclopedia.json` categories |
| 6 | Four short entries are written for Grimedites, Luminarii, Krystians, and the Xalians of Phantiri so no people reads "no entry on file". Glossary register, one or two sentences, from the planets' present-day paragraphs only. Nick signs off in the PR. | 80% | `entries.js` PEOPLES table, planet histories |
| 7 | The Bestiary keeps every species visible by default and adds a "Ratified" filter; the pending lamps stay (they are honest). | 90% | Nick's steer that species detail builds on the template model |

## What ships

1. **Galaxy map as instrument.** Full-width hero on the reading room. Hover lights a world and shows a card (name, element, terrain line, native species count). Beneath it an era scrubber: seven stations, keyboard and pointer, plus "All". Selecting an era dims worlds outside its footprint, lights the ones inside, and pins that era's firm events to their anchor worlds (pin shows the event title on hover, click goes to the era page with the event's hash). The map accepts an `era` prop so other sections can reuse it.
2. **First Survey (guided tour).** `/encyclopedia/tour` and `/encyclopedia/tour/:beat`. Eight beats, each one screen: kicker (beat n of 8, era name), title, prose in the historian's voice (linkified), the era's mini map (map with `era` fixed, no scrubber), and a "Records consulted" row of links (entries, worlds). Previous, next, and a progress rail. The final beat ends on Kozrak's tournament and hands off to the Chronicle and the Bestiary. Reading room gets a "First Survey" call to action above the fold.
3. **Era reading mode.** Era page becomes: sticky left rail (the seven eras with the current one lit, and under it the worlds in this era as element chips that filter); main column with two modes toggled by a `.g-segmented`: "By world" (current behavior, panels per world) and "As one story" (paragraphs interleaved in event order, each paragraph headed by its world chip and chapter number, with the governing event title printed as a running head when it changes). Events render as compact cards (title, world chips) that expand on click to show anchor quotes; the first firm event is open by default. Chronicle page: replace the per-era world chip rows with a 14-cell footprint strip (one small element-colored cell per world, lit if in the era, dim if not, tooltip with the world name).
4. **World record reshaped.** Chapter list becomes a sticky rail beside the prose with era tags and read marks. Native fauna and "entries naming this world" move up into the record grid beside the plate. New "In the Chronicle" strip under the designation: the seven eras as a rail, lit where this world has chapters or events, each lit station linking to the era page.
5. **Trail.** A "Trace" strip at the bottom of the shell showing the last eight records visited (kind, name, element-scoped chip), newest first, click to return, clear button. Read marks: a small lamp on chapters, entries, species, and worlds already opened. All localStorage, guarded with try/catch, first paint works with nothing stored.
6. **Small fixes.** "Pull a record" button in the masthead (random entry, world, species, or era). Slash key focuses search from anywhere on the page unless an input has focus. Alphabet rail on the Index (letters with entries are live, others dim; click scrolls). Powers regrouped per decision 5 and 6. Bestiary "Ratified" filter chip.

## Data layer additions (`my-app/src/lore/`)

All pure, synchronous, no React. Every function has a test in `__tests__/`.

- `getEraFootprint(eraKey)` returns `{ era, worlds: [{ world: PlanetView, chapterCount, events: [{ key, title, firmness }] }] }` for every world in planet order, including worlds with `chapterCount 0` and no events (so callers can dim them). A world is "in" the era when `chapterCount > 0` or `events.length > 0`.
- `getEraStory(eraKey)` returns `[{ world: PlanetView, index, text, events: [EventView], eventTitle }]` ordered per decision 3. `eventTitle` is the title of the first event the paragraph is tagged with in this era, or null.
- `getWorldTimeline(worldKey)` returns `[{ era: EraView, chapters: [chapterIndex...], events: [EventView] }]` for all seven eras in order, empty arrays where the world is absent.
- `getTour()` returns `{ title, note, beats: [{ key, order, title, era: EraView, worlds: [PlanetView], entries: [Entry], prose }] }` from `tour.json`.
- `getRandomRecord(rng = Math.random)` returns `{ kind, key, name }` drawn from entries, worlds, species, and eras with equal weight per kind.
- `getPowers()` changes shape: `{ factions, vallerii, peoples }`. `factions` excludes the demonym keys; `vallerii` is `[vallerii entry, king-kozrak entry]`; `peoples` gains an `entry` for all seven.
- `routeFor('tour', beatKey)` returns `/encyclopedia/tour/<beatKey>`; `routeFor('event', '<era>:<eventKey>')` returns `/encyclopedia/chronicle/<era>#event-<eventKey>`.
- `loaders.js` imports `tour.json`; `scripts/bundleLore.js` copies `docs/encyclopedia/tour.json` to `lambda/src/json/tour.json`.

## Content (`docs/encyclopedia/`)

- `tour.json`: `{ version, note, title: "First Survey", beats: [{ key, order, title, era, worlds: [planetKey], entries: [entryKey], prose }] }`. Eight beats: the Vallerii and the Tachyon Drive; the Age of Unbirth; the Generators and the first Xalians; the company wars; the APEX Accords; the End Wars; the Nemesis Plague; Kozrak, the Mercurius Machine, and the tournament. Prose 120 to 200 words per beat, historian's voice, past tense for history and present for the present, no em-dashes, no dates, no invented facts, no resolution of the ancient-presence thread, no NFT framing. Each beat's prose must be traceable to the planet histories or existing entries; the writer lists the anchor paragraphs in a `sources` array on each beat (planet key and paragraph index) so a reviewer can check.
- Four new entries appended to `encyclopedia.json` under `factions` (the existing convention for demonyms): `grimedites`, `luminarii`, `krystians`, `phantiri-xalians` (title "Phantiri (Xalians of)"; the key `phantiri` is the planet). Glossary register. `related` links to the planet and to the entries the definition names. The PEOPLES table in `entries.js` picks them up by key.

## UI ownership (one agent per row, no shared files)

| Owner | Files | Consumes |
|---|---|---|
| map | `GalaxyMap.js/.css`, new `EraScrubber.js/.css`, `ReadingRoom.js/.css` | getEraFootprint, getEras, getTour (for the call to action) |
| tour | new `Tour.js/.css` | getTour, GalaxyMap with `era` prop (import only; if the map agent is not done, render a placeholder div with class `enc-tour-map` and note it) |
| era | `EraView.js/.css`, `Chronicle.js/.css` | getEraFootprint, getEraStory, getEra, trail marks |
| world | `WorldView.js/.css` | getWorldTimeline, trail marks |
| shell | `EncyclopediaShell.js`, `LoreSearch.js`, new `TrailStrip.js/.css`, `encyclopedia.css`, `pages/encyclopediaPage.js` (adds the tour routes) | trail util, getRandomRecord |
| catalogs | `Index.js/.css`, `Powers.js/.css`, `Bestiary.js/.css`, `EntryView.js/.css`, `SpeciesView.js/.css` (read marks only on the last two) | getPowers new shape, trail marks |

The trail utility is `my-app/src/components/encyclopedia/trail.js` (written by the orchestrator before fan-out): `recordVisit({ kind, key, name, element })`, `getTrail()`, `clearTrail()`, `markRead(kind, key)`, `isRead(kind, key)`, `useTrail()` hook returning `[trail, clear]`, `useVisit({ kind, key, name, element })` hook that records the visit and marks read on mount and returns whether it was already read, `useReadMark(kind, key)` read-only hook that re-renders when marks change. Kinds: `entry`, `world`, `species`, `era`, `chapter` (key `<planet>:<index>`), `beat`.

## Design system

Everything from the first contract still binds: `.g-*` parts only, `--g-*` tokens only, matte panels, only `.g-screen` emits, element scoping through `.g-el-<element>`, no new dependencies, no drifting animation, transitions on hover and focus only. The era scrubber is a `.g-segmented` or a rail built from `.g-lamp` stations; a lit world on the map is a disc at full opacity with its ring, a dimmed one is the disc at low opacity with no label at compact sizes. Read marks are `.g-lamp` at the smallest size. Reduced motion is already handled globally.

## Verification

- `yarn test --run` green, including new lore tests.
- Playwright-core render of every route at 1600 and 390 (`scratchpad/pw/check.js` pattern: `isMobile`, `pageerror` capture, `scrollWidth === innerWidth`).
- A separate critic pass (no code) scores each of the six items against this document and the design system before the PR opens.

## Round 2 (2026-09-03, PR after #62)

Nick merged round 1 unread and asked for another pass plus a lore validation gate. Shipped: scroll restoration on route change (hash targets honored on cold loads); the Trace strip moved under the section bank as a thin line; search keyboard navigation (arrow keys, Enter, Escape, combobox aria); scrubber numbering 01 to 07, event pins as brass rings with counts, a legend line, lit worlds linking into the era page filtered by world, the Story of Xalia list tied to the scrubber; the era page reads and writes `?world=`, narrows events to the filtered world, and has Expand all; Chronicle footprint cells link into eras; entry pages carry "In the Chronicle" (events by `entry` key or by title, via `getEventsForEntry`) and use the record grid with a sticky definition; species readouts sit in a two-column dossier; world search snippets read as prose and paragraph hits are titled "World, Ch. nn". `.enc-console` uses `overflow-x: clip`, not `hidden`, because `hidden` silently disables every sticky rail inside it.

Lore gate: `.claude/skills/lore-factcheck/SKILL.md` (independent claim-by-claim check) and `my-app/src/lore/__tests__/lore.tour.test.js` (structural validator). The first independent check of the round-1 tour found nine unsupported claims (superlatives, invented causation, an unstated timeframe, one phrase against the Unbirth ruling); all were rewritten to the source. The four peoples entries passed; one place name was made precise (City of Wraiths beneath the Dreadscape).

## Mobile pass (2026-09-03)

Audited at 390x844 with touch emulation (`scratchpad/pw/mobile-audit.js`: tap targets under 32px, type under 12px, elements past the viewport edge, sticky elements). Findings and fixes: the masthead, search, "Pull a record", the three-row section bank, and the Trace strip filled the first 1400px before any content (now: compact masthead under 140px, section bank and Trace as single scrollable rows with a trailing fade via the shared `.enc-scrollrow` helper in `encyclopedia.css`, content within the first viewport); the galaxy map shrank to 330px with 12px world targets and 6px pins (now: pans at 640px minimum width on phones with invisible 30 and 22 unit hit circles, a "Drag to pan" line, and a chip row of the fourteen worlds under the map that mirrors the disc links); the Bestiary's 15-segment element filter was clipped and unreachable (now a scroll row, as are the Index category chips and alphabet rail); the Chronicle footprint cells were 14px (now 24px tall and full width on phones); the world page's chapter index stayed sticky at phone width and covered the prose (now a collapsed `<details>` on phones); chips, back links, era rail chips, tour stations, and story index buttons are at least 32px tall on phones; `--g-size-tiny` and `--g-size-micro` are raised on phones inside `.enc-console`; a Back to top button appears after two screens on phones. Rule learned: component stylesheets load after `encyclopedia.css`, so shared phone helpers need the `.enc-console` prefix to win at equal specificity; and hide only `.enc-masthead .g-kicker` on phones, never `.g-kicker` globally.
