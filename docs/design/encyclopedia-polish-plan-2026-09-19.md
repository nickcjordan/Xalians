# Encyclopedia polish pass: one book, three page shapes

## Context

Nick asked (2026-09-19) for a design and UX polish pass over every page of the Encyclopedia. His diagnosis: the Encyclopedia was built, the version 4 design system landed and was only half applied to it, then feature rounds (story pass, ux pass, era plates, pronunciation, articles, the site-audit remediation) each added value in one place while pushing the whole toward a segmented, incohesive feel with spacing and structure problems. He wants a full plan that fixes the pages for user experience, polish and cohesion, judged at the level of the whole section rather than one nit at a time.

This plan comes from reading every component under `apps/web/src/components/encyclopedia/`, the shell and page, the design contract (`docs/DESIGN_SYSTEM.md`), the three earlier Encyclopedia contracts (`xalian-encyclopedia-page.md`, `-ux-pass.md`, `-story-pass.md`), the site audit of 2026-09-18 and its closed issues, and a paint pass over the deployed site at 1440 and 390 (Reading Room, The Story contents, a story part, Worlds, a world, Bestiary, two species, Powers, Index, two entries, plus the Generator for comparison).

The short diagnosis: the Encyclopedia has no page grammar. Each route was composed by hand from the design system's parts, so the same job is done a different way on every page. Records use three unrelated skeletons and none of them matches the site's own record (the Generator). Reading pages leave a third to a half of the desktop empty and park a stranded rail at the far edge. Uppercase legend type is used for kickers, section heads, card labels, chip text, rail entries and whole-sentence event titles alike. Six kinds of chip and five link stylings appear on one page. Folds nest two deep and are styled three ways. None of it breaks a design-system rule; all of it breaks cohesion. The fix is a small grammar (three page shapes, one vocabulary table) applied to every route, not another round of local fixes.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | The Generator's record is the site's reference document for a creature, so the species record should be the same instrument (identity strip, field grid, readouts), not a separate composition. | 80% | `apps/web/src/components/record/RecordView.tsx` on the live `/generator` page vs `SpeciesView.js`; DESIGN_SYSTEM section 10.1 `RecordPage`, "the same document in different widths" |
| 2 | Reading routes keep the 1440 shell and fill it with a three-track grid (rail, text, marginalia) rather than narrowing the shell to a book width. | 70% | Story part at 1440: 220px rail + 62ch text, right 40% empty (`Story.js` line 447); world History: 68ch text with a 20rem rail at the far edge (`WorldView.js` line 804) |
| 3 | On a story part, the "From the records" paragraphs fold by world by default, with the first sentence as a teaser and an expand-all control, so a part reads at 3 to 4k px instead of 15k. | 60% | Live `/encyclopedia/story/end-wars` is 14,773 px at 1440 and 22,463 CSS px on the phone; Part 4 carries 50 chapters. This is a lever: it changes how much of the histories a reader meets on the part page. |
| 4 | The section tabs stay on every route; the "Back to X" link is replaced by a breadcrumb above the masthead on record routes. | 75% | `EncyclopediaShell.js` lines 209 to 213; `RecordPage` already has a `breadcrumb` slot and a `Breadcrumb` primitive exists |
| 5 | The Index page drops its own search box and uses the masthead search, which already routes to `/encyclopedia/index?q=`. | 85% | `LoreSearch.js` line 820; `Index.js` lines 283 to 289 read `q`; audit X2 |
| 6 | Full-sentence titles (fixed points, event bullets) set in body 700 sentence case, not legend uppercase; uppercase is kept for labels of four words or fewer. | 80% | DESIGN_SYSTEM section 9 "Sentence case everywhere except legends"; live fixed-point titles run three lines of uppercase |
| 7 | Fixed points render on the house `Timeline` component rather than as stacked cards with quoted anchors in the data face. | 75% | `readouts.tsx` exports `Timeline`, `TimelineItem`; `Story.js` `FixedPointCard`, `ContemporaneousCard` |
| 8 | The beat kicker ("Beat 1 of 2") and the "Contemporaneous, unordered" legend are dropped; narrator beats become open prose under subheads. | 85% | Audit T5 (production vocabulary); story-pass contract already limits the kicker to multi-beat parts |
| 9 | Species and world tiles share one minimum width and an auto-fill grid, ending the per-page column counts. | 75% | `Worlds.js` line 371 (7 columns), `Bestiary.js` line 519 (6 columns), `WorldView.js` line 864 (6 columns) |
| 10 | The silhouette art stays as is; the Shuntara defect is an asset fix, not a style change. | 90% | `apps/web/public/assets/img/species/shuntara.png` renders on a white ground while every other species is a black silhouette on its element wash |
| 11 | The "Recently viewed" strip stays, as a quiet row above the footer with the kind label dropped on desktop too. | 70% | `TrailStrip.js`; it is the only cross-record history the reader has |
| 12 | The read-progress dots and "Reviewed" badges stay; they are content state, not ticketing vocabulary. | 70% | `trail.js`; DESIGN_SYSTEM section 6 chips-are-content, badges-are-state |
| 13 | The immersive-tier parking rule does not touch this work; the whole Encyclopedia is chrome with two featured components (galaxy map, plates). | 95% | DESIGN_SYSTEM section 1, ruled 2026-09-08 |

## What the paint pass found

Findings are grouped by the cohesion problem they belong to, not by page, because the fix is one grammar and the pages are its consumers. Page-level evidence is listed under each.

### 1. Three record skeletons, none of them the site's record

- The world record: two art plates across the top at a third width (984px) that matches nothing else on the page, then a 360px spec plate beside the lede, then History as a 68ch column with a chapter rail stranded 500px away at the right edge, then fauna tiles, then entry rows in a card, then two folds.
- The species record: art, signature card and physiology plate stacked in a 360px left column, seven stacked h3 blocks in a 62ch right column, the right third of the screen empty from the top of the page to the folds.
- The entry record: a sticky 40ch definition at left, article and story excerpts at right, again a third empty.
- The Generator record, for the same creature the species page describes: a full-width identity strip (art, name, chips, teaser, key facts in two columns), a brief with stat tiles, readouts below. It is the best-composed record on the site and the species page does not resemble it.

### 2. Width used by accident

- Every reading route (story part, world History, entry) caps text at 62ch inside a 1440 shell and puts the leftover on the right. A rail that should be next to the text is at the far edge.
- The Reading Room's galaxy map is 1392px wide and 800px tall, mostly dark space around fourteen dots, followed by three separate explanatory paragraphs (a legend, a "Lit: worlds with chapters" line in the data face, and "Pick an era to light the worlds").
- Powers uses CSS columns so the two columns end unevenly; Index uses a two-column grid; the Reading Room rows and The Story contents are two different row layouts (px-4 py-2 with legend plus copy, versus px-6 py-4 with number, title, prose and a meta column).

### 3. One type role doing every job

- Uppercase legend type (11.5px, tracked) is the kicker, the section head ("FROM THE RECORDS", "RECORDS CONSULTED", "IN THE STORY"), the card label, the rail entry, the tab label, the chip text and the plate key. On the same page `type-heading` 24 uppercase heads "HISTORY" and "FIXED POINTS". Two heading systems coexist on every record.
- Fixed-point titles are full sentences set in 19px uppercase heading type, three lines long ("ECHELON AND THE THOUSAND FAMILIES BOMBARD ZOLTON, BLACKING OUT GALACTIC COMMS, LONG BEFORE SOURCE CODE 606 OR THE NEMESIS PLAGUE").
- The data face carries sentences: the quoted anchors under each fixed point, "and 28 more in Part 2", "Lit: worlds with chapters in this era. Pins: events fixed to a world.", "No entry on file; see Magmuth.", the whole survey-data block. The contract reserves it for values.

### 4. Six chips, five links

- Chips on one story part: filled element chip (masthead), outline world chip in its element hue (records consulted, margin notes, fixed points, rail), outline neutral entry chip (records consulted), Badge default era tag on every chapter ("NATURAL HISTORY", "THE AGE OF GENERATORS"), status badge ("Reviewed"), and on the world page a custom bordered station link with a mono "2 CH" suffix for "In the story". The reader cannot learn what a chip means because it means six things.
- Links: prose links (underline, ink-3 decoration), "Read in Part 1" inline at the end of an excerpt, "Entry: ION-9" underlined inside a card, "and 3 more in Part 1" in the data face, heading links (era names) with no underline, chip links, rail links. Five stylings for "go somewhere" on the entry page alone.

### 5. Folds and boxes without a rule

- Folds: "Cross references" and "For builders" (bordered accordion items on level 1, px-5); "What these mean" (border-top inside a card); "Survey data" and "Record data" (a second accordion nested inside "For builders"); the phone "Part 6 of 7" and "Chapters (8)" accordions (level 0, px-4). Four fold styles, two levels deep.
- Boxes: narrator beats are in level-1 cards, the records paragraphs are unboxed, fixed points are boxed again, the era plate has a float shadow and a p-2 frame, world art plates have no frame. The alternation of boxed and unboxed prose is most of what reads as "segmented".

### 6. Chrome stacked on chrome

- A record page shows, before any content: navbar, kicker, title, pronunciation, search field, six tabs, a "« Back to Worlds" link floated to the tab row's right end. About 250px of frame at 1440.
- The Index page hides the masthead search and shows its own, then a Random entry ghost button, a nine-item category tab row and a 26-letter jump row, three rows of controls stacked and made sticky.
- The Bestiary shows a fifteen-item element toggle row, then a world select, a sort toggle and a count on a second row.

### 7. Copy and data leftovers

- "Beat 1 of 2" (production vocabulary), "32 of 32 specimens" (the masthead says species), "Contemporaneous, unordered" as a card legend, "RECEIPT UNCONFIRMED, filed by hand: archivist" in the survey block (a version 3 prop), "Record ratified" and "Record pending migration" badges (internal state shown to a visitor), "Pending record" on legacy tiles.
- Shuntara's species art is a raster with a white ground; every other species is a black silhouette on its element wash. Visible on the Bestiary grid and the species page.
- The Index letter headings are `aria-hidden`, so assistive tech gets a flat list of 107 rows with no group structure.
- The era scrubber prints "Pick an era to light the worlds that appear in it" under the footprint line even after an era is picked.

## The grammar

Three page shapes and one vocabulary table. Every Encyclopedia route is one of the three shapes; every element on a route is one row of the table. Nothing else is allowed on a chrome route in this section. The shapes are built once as house pieces in `apps/web/src/components/system/` (they are patterns used three or more times, which is the contract's test) and rendered on `/styleguide`.

### Shape A: the catalogue

Used by the Reading Room, The Story contents, Worlds, Bestiary, Powers and Index. Masthead, one filter bar, one body, the recently-viewed row, the footer.

- **Filter bar**: the house `FilterBar` with `SearchField` where a page has search, one row, count at the right end. It folds into a Sheet under `sm` as the component already does. Bestiary: element as a chip row that wraps (content, in element hue, pressed state per the contract), world select, sort toggle, count. Index: category tabs, letter rail, count only when filtered. No page builds its own bar.
- **Tile grid**: one `Tile` grammar with a minimum tile width (about 180px) on `grid-cols-[repeat(auto-fill,minmax(…,1fr))]`. Species tile: art on the element wash, name, world in the data face. World tile: 3:2 art, name, terrain line, element chip. Same tile on the Bestiary, the Worlds page, a world's Native fauna and the new "Also from this world" strip on a species page.
- **Index row**: one `IndexRow` grammar for lists of records: a narrow first column (number or kicker), title in subhead type, one line of copy in body, a meta column at the right in the data face, a chevron when the row is a link. The Reading Room's four rows and The Story's seven parts use it; Powers and the Index use the two-column `RecordRow` grid (term left, definition right) with a real grid rather than CSS columns so column ends align.

### Shape B: the record

Used by a world, a species and an entry. Breadcrumb, masthead, identity strip, body, readouts, folds, recently viewed, footer.

- **Breadcrumb** above the masthead (Encyclopedia / Worlds / Magmuth) replaces the "« Back to Worlds" link at the tab row's end. The tabs stay.
- **Identity strip**: full shell width, level-1 panel, exactly the Generator record's header: the plate at left (species silhouette on its wash, or the world's hero art at 3:2), then name is already in the masthead so the strip carries the lede (the narrator's lede for a world, the "In brief" teaser for a species, the definition for an entry), the key facts as a two-column `SpecPlate` (a world: terrain, radius, gravity, temperature; a species: height, weight, diet, lifespan, home world; an entry: category, era, pronunciation), and the "Records consulted" chips under the lede. On a species page this makes the Encyclopedia record and the Generator record the same instrument.
- **Body**: two tracks, text at 62ch and a second column that is filled on purpose, never left over. World: History in the reading layout (Shape C) with the chapter rail beside the text and the second art plate in the margin at the chapter it illustrates. Species: the five fields (Origin, Habitat, Feeding, Behavior, Company) plus Name origin and Appearance as a `RecordRow` definition grid in the text track, and the Signature ability and Physiology plate in the second track. Entry: the article in the text track, Related as a term list with hover cards in the second track.
- **Readouts**: a tile strip of related records (a world's Native fauna, a species' "Also from Magmuth", an entry's Related worlds when it has an element), then "In the story" for an entry as Shape C rows.
- **Folds**: one `Fold` component (level 0, legend label, count at right, chevron, one level deep). Two per record: Cross references, and For builders holding the machine data flat (no nested accordion). "Record data" and "Survey data" become the fold's content directly.
- **Foot**: "This world in the story: Part 4, The Age of Generators" as an `IndexRow`, not a bare `RecordRow`.

### Shape C: the reading layout

Used by a story part and by a world's History section. A three-track grid across the shell: a sticky rail (240px), the text (62ch), and a marginalia column that takes the rest.

- **Rail**: the part list (story) or the chapter list (world), each entry a nav link in legend type with its number in the data face, the active one marked by the viable left rule the current rail already uses. Under `lg` the rail becomes one `Fold` above the text. The rail carries nothing but navigation: "Worlds in this part" and the fixed-point list move out of it.
- **Text**: prose is never boxed. A story part opens with the era plate spanning text and margin (it is 2:1, so it reads as a chapter frontispiece), then the era definition at lead size, then each narrator beat as an `h2` subhead over open prose. The "From the records" paragraphs follow under an `h2` section head, grouped by world with the world's chip as the group label. Each group is a `Fold` open on request with the paragraph count and first sentence as its teaser, and an "Expand all" control at the section head (assumption 3; the current always-open form stays available if Nick rules the other way, and the layout does not depend on it).
- **Marginalia**: what today interrupts the text. Beside a beat: its Records consulted chips. Beside a records paragraph: the world chip and chapter number (the current margin note, moved to the margin track proper), and the read dot. Beside a chapter in a world's History: the era tag as legend text, not a badge. Beside the chapter that has one, the second art plate with its caption.
- **Fixed points**: a `Timeline` under its own `h2`, one item per event: title in body 700 sentence case, the world chips, the entry link as a nav link, the anchor quote in body small with its chapter as a nav link. Events that share an order are one item with a "Around the same time" sub-label in body, not a separate card.
- **Prev and next**: the current pair of keys at the end of the text track. The one primary is the "Continue to Part n" key, as now.

### The vocabulary table

| Thing | The one way it is done | Replaces |
|---|---|---|
| Kicker | `type-legend` above a title or a plate key | legends used as section heads |
| Section head | `SectionHead` (`h2`, heading 24, count in data face) | "FROM THE RECORDS", "RECORDS CONSULTED", "IN THE STORY" as legends; "Chapters" as a card header |
| Subhead | `h3` subhead 19 uppercase, only for labels of four words or fewer | "In brief", "Name origin", "Appearance" stacked h3s on the species page (they become RecordRow terms) |
| Sentence title | body 15 weight 700, sentence case | fixed-point titles in uppercase heading type; event bullets |
| Running text | `font-body text-body`, 62ch, never inside a Card | narrator beats in panels; fixed points in panels |
| Lede | `text-lead` (17) | the era definition, the world lede, the "In brief" teaser at body size |
| Value | `type-data`, values only: counts, chapter numbers, pronunciation, measurements | quotes, "and 3 more in Part 1", "Lit: …", survey sentences in mono |
| Element | `Badge variant="chip"` in the element scope | |
| World | `Badge variant="chip-outline"` in the world's element scope | custom station links on the world page |
| Entry, era, event | a link, never a chip | outline neutral entry chips in Records consulted; era Badge on every chapter; "Entry: ION-9" |
| Era tag on a chapter | legend text in the margin | Badge default |
| Prose link | underline, `decoration-ink-3`, hover `decoration-ink` (the current `TERM_LINK_CLASS`) | |
| Nav link | legend type, no underline, hover to ink (the current rail link) | "Read in Part 1" inline, mono "and n more", underlined "Entry:" links, heading links |
| Status | `Badge variant="ok"` Reviewed only | Pending record, Record ratified, Record pending migration |
| Fold | `Fold` house piece, level 0, one level deep | four accordion stylings, nested accordions |
| Station row | the tab trigger row (`tabTriggerClass`), pressed state underline | the era scrubber, the world's In-the-story stations, the Index category row (three rows that already are this, made one component) |
| Boxed object | `Card` level 1 only for a distinct object: the Begin card, search results, the map, the identity strip, a tile | prose in cards |
| Art | `WorldArt` figure: image, subhead title, small caption, hairline under; the era plate uses the same figure without the float shadow and the p-2 frame | two plate stylings |

## Route by route

What each route becomes under the grammar. Everything not named stays as it is.

- **Reading Room** (Shape A): intro paragraph at lead size, the Begin or Resume card (unchanged; it holds the one primary), the galaxy map as a featured component at a maximum width of about 1000px centered, with the era station row and one caption line inside the map card as its footer and a two-item legend (Cybele, Wraithix) drawn in the map's corner. The three explanatory paragraphs become one caption that changes with the era ("The End Wars: 14 worlds, 9 fixed events"). The four section rows become `IndexRow`s.
- **The Story contents** (Shape A): the seven parts as `IndexRow`s (number, title, era definition, "21 chapters, 14 worlds, 6 read"). Same row as the Reading Room's, same padding.
- **Story part** (Shape C): as described above. Target height at 1440 for Part 6: under 5k px with records folded, under 10k with them open.
- **Worlds** (Shape A): auto-fill tile grid. No other change.
- **World record** (Shape B plus C): breadcrumb; identity strip with the hero art, the lede, records consulted, the four physical facts as a two-column plate, and the "In the story" station row under the facts; History in the reading layout with the chapter rail at left, era tags and the second plate in the margin; Native fauna as the tile strip; Entries naming this world as the two-column RecordRow grid; the story foot row; two folds with the survey data flat inside For builders and the "RECEIPT UNCONFIRMED" line removed.
- **Bestiary** (Shape A): one filter bar (element chip row, world select, sort, count reading "32 of 32 species"); auto-fill tiles; the Pending record badge dropped (every species is ratified). Shuntara's asset regenerated as a silhouette.
- **Species record** (Shape B): breadcrumb; identity strip mirroring the Generator record (silhouette on wash, teaser, five key facts in two columns, world link); body with the definition grid in the text track (Name origin, Appearance as a list, Origin, Habitat, Feeding, Behavior, Company) and the Signature ability plus Physiology in the second track; Signature ability as a level-1 panel with the description first, then the six fields as a two-column plate with humanized values ("Ongoing", "By contact", "Restrain", "Dark") and the "What these mean" glosses as `Term` tooltips on the keys instead of a fold; "Also from Grimedes" tile strip; the story foot row; two folds, record data flat inside For builders, the ratified badge removed.
- **Powers** (Shape A): the three groups as two-column RecordRow grids so column ends align; the demonym rows keep the world chip.
- **Index** (Shape A): the masthead search returns and the page's own box goes; one filter bar with the category station row and the letter rail; count only when filtered; letter headings as real `h2`s at subhead size with a hairline, not `aria-hidden`; Random entry as a secondary key at the bar's right; the "whole archive as one document" row stays at the foot as an `IndexRow`.
- **Entry record** (Shape B): breadcrumb; identity strip with the definition as lede, category and era in the plate, art at left when the entry has it; the article in the text track; Related in the second track as nav links with hover cards; "In the story" as Shape C rows (world chip and chapter in the margin track, excerpt in text, "Read in Part 2" as a nav link at the row's end, "3 more in Part 2" as a nav link under the group); one fold for Cross references.
- **Search results** (all routes): the results card keeps its grouping; hit rows get the subhead title and small snippet they have, with the kind label as a section kicker. No change beyond the vocabulary.
- **Recently viewed** (all routes): one quiet row above the footer, chips as world chips or nav links per the table, the kind label dropped, Clear as a ghost key.

## Sequencing

Five PRs, each one shape or one record, each verified by paint at 1440 and 390 with `scripts/design/snap.js`, tests and `tsc`, then auto-merged. Foundations land with their first consumer so nothing sits unused.

1. **Shape A and the shell**: `Fold`, `IndexRow`, the station row and the auto-fill tile grid as house pieces with styleguide sections; breadcrumb in the shell, back link removed, one search on every route; Reading Room, The Story contents, Worlds, Bestiary, Powers, Index restyled; the Shuntara asset; copy fixes on these routes.
2. **Species record**: identity strip mirrored from the Generator record (extracted into a shared house piece if `RecordView.tsx` allows it without touching the Generator's behavior), the definition grid, signature and physiology in the second track, the "Also from" strip, flat folds, badges removed.
3. **World record**: identity strip, the reading layout for History with the chapter rail and marginalia, fauna strip, entries grid, flat survey fold.
4. **Story part**: the reading layout, open beats, records grouped by world (folded per assumption 3), the fixed-points timeline, marginalia, the plate as frontispiece.
5. **Entry record, search, trail, sweep**: entry on Shape B, the vocabulary applied to search results and the recently-viewed row, a final pass over every route for any legend used as a heading, any sentence in the data face, any chip that should be a link.

Each PR is small enough for a Sonnet implementer working from this document and the vocabulary table, with the paint check and the styleguard tests as the gate. Fable reviews the PNGs against the table before merge.

## What this does not do

- It does not change any lore text, entry definition, narration or caption. The fact-check gate is untouched.
- It does not restyle the galaxy map's drawing or the silhouette art system.
- It does not add articles, entries or species; the six core-entity articles from the audit already landed.
- It does not touch the Generator record beyond extracting its header into a shared piece if that is clean; if it is not, the species strip is built to match it visually and the two are reconciled later.

## Levers

Nick decides; the plan proceeds on the assumption in each case.

- Records folded by world on a story part (assumption 3). The alternative is the current always-open book at 15k px.
- Tabs on record routes (assumption 4). The alternative is tabs only on catalogue routes with the breadcrumb carrying the way back; it would save 44px on records and lose the section switch.
- The reading layout across the full 1440 shell (assumption 2). The alternative is a 1120px book width with the shell's whitespace at the right; it reads more like a book and less like the rest of the site.

## What shipped (2026-09-19)

All five PRs landed the same day, each built by a Sonnet implementer from this document, reviewed by paint at 1440 and 390 before merge, and deployed: #502 (Shape A and the shell: `Fold`, `IndexRow`, `StationRow`, `TileGrid`, breadcrumb, one search, the six catalogue routes, the Shuntara asset), #503 (the species record as Shape B, `SpeciesTile`, `Connections bare`), #504 (Shape C: `ReadingLayout`, the story part with records folded by world, the fixed-points timeline, `Fold hint`, `TimelineItem titleAs`), #505 (the world record as Shape B with History on Shape C, the survey fold flattened, the receipt line gone), #507 (the entry record as Shape B, `Prose size`, the `IndexRow` leading column, the vocabulary sweep over search, hover card, trail, map captions and connections).

Levers taken as the plan assumed: records fold by world on a story part (Part 6 now measures about 6,250 px at 1440 with folds closed, against 14,773 before; the fixed-points timeline is what remains above the 5,000 target), tabs stay on record routes with the breadcrumb above the masthead, and the reading layout runs across the full shell. Each is reversible on a ruling.

Found on the way: `ReadingBlock` first shipped as `display: contents`, which let a block's margin auto-place into the previous row and reordered blocks on the phone; it is now a real row with its own inner grid. Two agents working in one worktree reverted each other's edits (the lesson in DESIGN_SYSTEM section 14 holds); one agent per worktree from here on.
