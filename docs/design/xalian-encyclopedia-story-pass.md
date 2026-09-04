# Encyclopedia Xalia, story pass: the archive told as one book

Status: contract, 2026-09-04. Nick: "It doesn't feel too cohesive right now. I want it to feel like you're being told a story. Dive in and make changes to fix this." Wins over `xalian-encyclopedia-ux-pass.md` and `xalian-encyclopedia-page.md` where they disagree. Fable orchestrates and verifies; Sonnet agents build, one ownership row each.

## Context

What the archive looks like today, from a full desktop sweep of every route:

- Eight sections in the bank. Three of them (First Survey, Chronicle, Read) are three views of the same timeline with three different chromes. The visitor lands on a map, an era list, a tour banner and four counters, with no single "start here and keep reading" path.
- Every page opens with the same masthead, bank and Trace strip. On the Bestiary the Trace strip is two rows of chips before the title. The masthead speaks in machine voice ("XALIAN GENERATOR / ARCHIVE", "CANON REV. 1.0.0"); the content speaks in the historian's voice. Two voices on every page.
- Records lead with data and bury the story. A world page shows a green terminal report, a chapter index and fourteen Connections rows before its history. A species page follows one paragraph of lore with six blocks of mechanics. An entry page is a two-line definition followed by three machine-derived lists (In the Chronicle, Connections, Appears In) with no narrative.
- No page hands the reader onward. Only the tour and the reader have next links; worlds, species and entries end on lists.

The story exists. The eight First Survey beats are the narrator's voice; the reader already assembles every history paragraph into seven era parts; the chronicle fixes events to quotes. The material is written and ratified. What is missing is one spine, one voice per page, story before data, and a hand on the reader's back at the end of every page.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | First Survey, Chronicle and Read collapse into one section, The Story: seven parts, one per era, each opening with the narrator's beats and continuing with the era's records. The three old routes redirect into it. | 85%, three views of one timeline is the incoherence Nick is naming | `EncyclopediaShell.js` SECTIONS; sweep screenshots of `/tour`, `/chronicle`, `/read` |
| 2 | The Deep Past has no beat today, so the narrator is silent for Part 1. One new beat is written for it, through the lore fact-check gate, so every part opens in the same voice. | 90% | `docs/encyclopedia/tour.json` (eras covered: ascendancy, unbirth x2, generation, accords, end-wars x2, present) |
| 3 | Every world gets a short narrator's lede (50 to 110 words) placing it in the story, kept in a new source file `docs/encyclopedia/narration.json`, validated like the tour and fact-checked before it ships. This is the only new lore prose besides the beat. | 80%, the ledes are what make a world page read as a chapter rather than a dossier | lore-factcheck gate ruling 2026-09-03; `lore.tour.test.js` validator |
| 4 | Species mechanics (capabilities, senses, attributes, traits, archetypes, instruments, legacy ratings) fold into one closed panel, "Generator template". They stay one click away; the page reads lore first. Overridable. | 70%, Nick approved the mechanics blocks on the first build, but the ruling that mechanics never leak into lore prose points this way | `ENCYCLOPEDIA-INTERNAL.md` precedence item 4; `SpeciesView.js` lines 120 to 218 |
| 5 | The environmental report and Connections fold into closed panels at the foot of a world page; Connections folds on species and entry pages too. Nothing is deleted. | 85% | sweep screenshot `worlds/magmuth` (report and Connections above History) |
| 6 | The entry page's "In the Chronicle" and "Appears In" lists merge into one chronological reading, "In the story": era by era, the fixed points and the excerpts that name the entry, each linking into the story part. That is the story of the entry. | 85% | `EntryView.js` lines 85 to 174; `chronicle.getEventsForEntry`, `entries.getAppearances` |
| 7 | The Trace strip moves to the foot of the page and the masthead compresses on every route but the Reading Room. Search and Pull a record stay in the masthead. | 80% | sweep screenshots (Trace strip above every title) |
| 8 | Every world, species and entry page ends with "Continue the story", pointing at the reader's last story part (or Part 1). Position is remembered per browser in localStorage, same policy as the trail. | 85% | `trail.js` |
| 9 | Routes for eras, beats and events change to `/encyclopedia/story/...`; every link goes through `routeFor`, so only `routeFor.js` and the redirects know the new shapes. | 90% | `routeFor.js` header comment |
| 10 | The Codex gains the world ledes and, automatically, the new beat. | 95% | `scripts/buildCodex.js` |

## The shape after the pass

Bank: **Reading Room · The Story · Worlds · Bestiary · Powers · Index** (six).

**Reading Room** is the front matter. Intro paragraph in the narrator's voice, a Begin or Resume card, the galaxy map with its era scrubber (unchanged), then Contents (the seven parts with a one-sentence teaser and a read-progress figure each), then the reference shelf (Worlds, Bestiary, Powers, Index tiles with counts). The First Survey card and the old "Story of Xalia" era list are gone; Contents replaces both.

**The Story** at `/encyclopedia/story` is the contents page; `/encyclopedia/story/:era` is a part. A part reads top to bottom: kicker "Part n of 7", the era name, the era definition as standfirst; then the narrator (each beat: title, prose, Records consulted chips); a rule and the kicker "From the records"; then the era's history paragraphs in story order with world margin notes, read lamps and event running heads (the current Reader body); then "Fixed points" (the era's events with their anchor quotes, the current EraView cards, simplified); then previous and next part. A sticky rail at desktop lists the parts, the progress figure, the worlds in this part and the fixed points as jump links; on phones it is a `<details>` at the top, like the world chapter index.

**World** reads: plate and physical data on the left; on the right the name, chips, the narrator's lede with its Records consulted chips; the era footprint strip; History with its chapter rail; Native fauna; Entries naming this world; Continue the story; then two closed folds, "Cross references (n)" holding Connections and "Generator survey" holding the environmental report.

**Species** reads: header; plate, description, niche, encyclopedia entry; Signature; the physiology record table; Continue the story; then two closed folds, "Generator template" holding the mechanics and "Cross references (n)" holding Connections.

**Entry** reads: header and definition; "In the story" (era by era: era name linking to its part; fixed points as a compact list; excerpts as reader paragraphs with the world margin note, the entry name marked, and a "Read in Part n" link into the story part's paragraph anchor); Related; Continue the story; a closed "Cross references (n)" fold.

## Data layer (agent A1, owns `my-app/src/lore/`, `scripts/`, `docs/encyclopedia/narration.json` loading only, and the lore tests)

New `my-app/src/lore/story.js`:

- `getStory()` returns `{ title: 'The Story of Xalia', parts, totalParagraphs }`. Each part: `{ order (1-based), era (EraView), title (era.name), beats (BeatView[] from tour.json filtered by era, in tour order), opening (first sentence of the first beat's prose, or the era definition when the part has no beat), sections (from reader.js, unchanged shape), paragraphCount, worlds (WorldView[] with chapters in this era, in planet order), fixedPoints (the era's events with anchors resolved to `{ world, index, quote }`, the same data EraView uses today) }`.
- `getStoryPart(eraKey)` returns the part plus `prev` and `next` era keys, or undefined.
- `getEraForBeat(beatKey)` returns the era key, or undefined.
- `reader.js` stays as the paragraph assembler; `story.js` composes it. `tour.js` stays.

New `my-app/src/lore/narration.js`: `getWorldLede(worldKey)` returns `{ prose, sources: [{ world (WorldView), index }], entries (EntryView[]) }` or undefined. Loads `narration.json` through `loaders.js` (the file is bundled by `scripts/bundleLore.js` into `lambda/src/json/narration.json` and mirrored by copy-json like every other lore file; add it to the bundler and to the copy the same way `tour.json` is handled). A missing world simply returns undefined; the page renders without a lede.

New in `entries.js` or `chronicle.js`: `getEntryStory(entryKey)` returns `[{ era, events, excerpts }]` for eras in order, only eras that have at least one event or excerpt. `events` are `getEventsForEntry` rows for that era. `excerpts` are the history paragraphs that name the entry (title or alias, whole word, the same match `getAppearances` uses) tagged with that era in `chronicle.paragraphs`, ordered as `getEraStory` orders them, each `{ world, index, text }`.

`routeFor.js`: `era` becomes `/encyclopedia/story/<key>`; `event` becomes `/encyclopedia/story/<era>#event-<eventKey>`; `tour` becomes `/encyclopedia/story/<era>#beat-<beatKey>` (resolve the era through the tour data; throw on an unknown beat); add `story` (no key) returning `/encyclopedia/story`. `paragraph` is unchanged (it points at the world page).

`trail.js`: add `recordStoryPosition(eraKey)` and `getResume()` returning `{ eraKey } | null` (key `enc.story.v1`, same guards as the rest of the file), and `useResume()` that re-renders on the storage event.

Validators:

- `lore.tour.test.js`: the order rule becomes "0..N-1 contiguous and unique" with N the beat count, and beat count is at least 9 once the Deep Past beat lands (assert at least 8 now; Fable tightens at integration).
- New `lore.narration.test.js`: every world key real and unique, at most 14 (Fable tightens to exactly 14 at integration), prose 50 to 110 words, at least two sources each resolving to a paragraph of that same world, no em or en dash, no four-digit number, no banned word (same list as the tour test), the prose names the world, every consulted entry key real.
- New `lore.story.test.js`: seven parts in era order; every beat lands in exactly one part in tour order; at most one part without a beat (Fable tightens to zero); `getStoryPart` prev and next chain end to end; `getEraForBeat` round-trips every beat; `getEntryStory('apex')` spans at least three eras in order with both events and excerpts; `routeFor` shapes above.
- `buildCodex.js`: print the lede under each world after the data line (kicker "Narrator" is not needed; just the paragraph), and adjust the codex test only if it breaks. The new beat flows through on its own.

## Story section, room and shell (agent A2, owns `Story.js`, `Story.css`, `StoryContents.js`, `ReadingRoom.js` and css, `EncyclopediaShell.js`, `TrailStrip.css` placement, `encyclopediaPage.js`, and deletes `Reader.*`, `Tour.*`, `EraView.*`, `Chronicle.*`)

- Build `Story.js` against the data contract above. Reuse the Reader's paragraph, margin note, read-mark observer and progress rail code and the Tour's beat prose and Records consulted chips and EraView's event card by moving them into `Story.js` (or small files it owns); then delete the four old components and their CSS. `EraScrubber` and `GalaxyMap` stay (the room uses them); their era links go through `routeFor('era', key)`.
- `StoryContents.js` renders the seven parts (number, title, teaser from `opening`, "n chapters · n worlds", chapters-read fraction from read marks) and is used by both the Reading Room and the Story contents page.
- Part page anchors: `#beat-<key>`, `#event-<key>`, `#chapter-<planet>-<index>`. `useVisit({ kind: 'era' })` and `recordStoryPosition` on mount.
- Reading Room: the intro text is exactly: "Every record the Generator holds on the galaxy it serves is here: the worlds, the fauna printed for them, the powers that ordered the printing, and the sequence of events that left Xalia as it is. Nothing is dated. The archive knows only what came before what. Read it as one story from the first part, or open any record and follow it back into the story." Then the Begin or Resume card (`useResume`: "Resume Part n, <era>" when set, else "Begin Part 1, The Deep Past"), the map, Contents, the shelf.
- Shell: six sections; `TrailStrip` renders after `.enc-body`; masthead gets `enc-masthead--compact` on every route except the room (kicker and version hidden, title one step smaller; phones already hide the kicker).
- `encyclopediaPage.js`: routes `story`, `story/:era`; redirects for `tour`, `tour/:beat` (to `routeFor('tour', beat)`), `chronicle`, `chronicle/:era`, `read`, `read/:era` (preserve the hash). Grep the whole of `my-app/src` for `/encyclopedia/tour`, `/encyclopedia/chronicle`, `/encyclopedia/read` and route every hit through `routeFor`. `home.js` has an Encyclopedia section with three entry points; its story link goes to `/encyclopedia/story`.
- Design system rules bind: `.g-*` parts, `--g-*` tokens, no raw hex, no glow, phones at 390 must not overflow, and the `.enc-scrollrow` helper for chip rows.

## Record pages (agent B, owns `WorldView.*`, `SpeciesView.*`, `EntryView.*`, `Connections.css` only if a fold needs it, and a shared `.enc-fold` rule block in `public/assets/css/encyclopedia.css`)

- Fold: `<details class="g-panel enc-fold"><summary class="enc-fold-summary">` with the label as a `.g-kicker`, a mono count where there is one, and a chevron drawn in CSS. Closed by default. Matte, bevel, no glow. Keyboard reachable by nature of `<details>`.
- WorldView, SpeciesView, EntryView in the orders given in "The shape after the pass". The lede renders with the tour's prose styling and its Records consulted chips (entries only). When `getWorldLede` returns undefined, nothing renders in its place.
- "In the story" on EntryView uses `getEntryStory`. Era headings link to `routeFor('era', era.key)`; each excerpt links "Read in Part n" to `routeFor('era', era.key) + '#chapter-<planet>-<index>'`; fixed points link to `routeFor('event', era.key + ':' + event.key)`. Mark the entry's name in excerpt text the way Connections marks its term today.
- "Continue the story" foot: one `.g-record` line, "Continue the story" as the term and "Part n, <era name>" as a link, from `useResume()` (Part 1 when nothing is stored).
- Code against the A1 API names above exactly; Fable integrates.

## Narration (agent C, writer, owns `docs/encyclopedia/tour.json` beat 0 and `docs/encyclopedia/narration.json` content; agent D fact-checks)

- Beat 0, "Before the Vallerii", era `deep-past`, 120 to 220 words, worlds from {phantiri, veridium, telypso, stonera}, at least two sources, consulted entries named in the prose. Renumber the existing beats 1 to 8. Hedge the deep past; do not connect the three open threads; do not explain anything the records leave unexplained.
- Fourteen ledes in `narration.json`: `{ version, note, worlds: [{ key, prose, sources: [{ planet, paragraph }], entries: [keys] }] }`. Each 50 to 110 words, names the world, tells what the Vallerii wanted from it, what its Generator came to make, and where it stands now, in that order where the record supports it, ending on a plain present-tense fact. Lore-voice register; American English; no dashes; no digits except numbers the histories themselves use; nothing the cited paragraphs do not say.
- Agent D runs the `lore-factcheck` skill on all fifteen texts, claim by claim against the cited paragraphs, and returns a fix list. Fixes land in the source files; nothing ships with an open finding.

## Verification (Fable)

- `yarn test --run` green with the validators tightened (9 beats, 14 ledes, 0 parts without a beat).
- Route sweep at 1600 and 390: no overflow, no console errors, every old route redirects to its story address and lands on the anchor.
- Mobile audit at 390 (tap targets, tiny text, sticky rails).
- A critic pass on screenshots of the room, a story part, a world, a species and an entry, scored against this document's "shape after the pass".
- Codex rebuilt and its test green; the Deep Past beat and the ledes appear.
- Contract doc appended with what shipped and what was overridden.

## What shipped (2026-09-04)

Everything in "The shape after the pass", with these integration changes and overrides:

- Contents teasers use the era definition, not the first sentence of the first beat. First sentences read as non sequiturs out of context ("Magmuth shows what the Generator economy became."); the era definitions were written as synopses.
- Entry page excerpts are windows, not whole paragraphs: the sentence that names the entry plus one sentence either side, with an ellipsis mark where trimmed, and the "Read in Part n" link into the story part's paragraph anchor. A full-paragraph APEX page ran to fourteen thousand pixels and re-read most of the book.
- The beat kicker ("Beat 1 of 2") appears only on parts with more than one beat. The Fixed points section has no "From the records" kicker; that kicker belongs to the paragraphs.
- The masthead is compact on every route but the room, with a trailing slash tolerated on the room route.
- The fact-check gate found and fixed in the new prose: one fabricated clause in the Deep Past beat ("abandoned mid-flight"), two ellipses (beat 0 and beat 8), one relation claim ("unrelated" to "separate"), one over-broad Nightcap claim in the Endessa lede ("anyone" to "the Vallerii"), and twenty-seven missing citations across eleven ledes. No contradictions.
- Validators tightened: nine beats, fourteen ledes, every part opens with a beat.
- Flagged, not fixed: `planets.json` and `planetRecords.json` both carry the fourteen histories (one-source ruling); the Bootstrap template's `main.js` throws an intermittent `scrollto` TypeError on hash navigation that predates this pass.
