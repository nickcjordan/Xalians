# Xalians Design System, version 4: one site, featured components, immersive experiences

**Every agent that touches anything visual reads this file first, then loads the `build-ui` skill (`.claude/skills/build-ui/SKILL.md`), which walks the decisions below in order.** The living reference is `/styleguide`. The ratified proposal pages are `docs/design/v4-foundations.html` (every token, control state, the wordmark and spinner) and `docs/design/v4-chrome.html` (the chrome on real pages); open them in a browser.

Version 4 was ruled by Nick on 2026-09-08 and 2026-09-09 after the version 3 "one relay, many terminals" release was judged cheesy: every page had become a prop (cases, counters, desks, tape, screws, stamps, fake readouts, in-world button copy) and the site read as cosplay. Version 4 keeps what version 3 got right (one room, one type system, one frame, element hues as the only saturated color, tokens mirrored in CSS and JavaScript with tests) and removes the props. The world lives in the content. The interface stays quiet so the content can be loud.

**Implementation state (2026-09-09): steps 1 and 2 of the migration have landed.** The v4 token layer, the restyled primitives, the new components and the brand pieces are in `system.css`, and every chrome page (navbar, home, account, user details, encyclopedia, generator, duel setup, training menu, styleguide) sets `data-tier="chrome"`. The version 3 terminal blocks and furniture classes are still in `system.css` only because the immersive experiences (duel board and playground, Reclamation, the training games, Long Return) still use them; they are deleted as each immersive brief lands. Do not use a version 3 class on a chrome page.

For interaction vocabulary, game-feel standards, quality scoring, playtest questions, and the living decision registry, also read [`GAME_EXPERIENCE_QUALITY_GUIDE.md`](./GAME_EXPERIENCE_QUALITY_GUIDE.md). This document defines how the interface looks; that guide defines how a game experience should communicate and behave.

## 1. The three tiers

Every visual thing on the site belongs to exactly one tier. Decide the tier before anything else.

| Tier | What it is | Rule | Examples |
|---|---|---|---|
| **Site chrome** | Everything that reads, browses, configures or manages. One design system for all of it. | Uses only the tokens and components in this document. No custom look. No in-world furniture. | Navbar, home, sign-in, account, user details, encyclopedia, generator, duel setup and results, Reclamation lobby and reports, training menu, styleguide. |
| **Featured component** | A richer piece that lives inside the chrome and gives an area character. | Built from the same tokens, type, spacing and corner rules as the chrome. May be large, animated, illustrated, interactive. May not change the page around it. | The galaxy map, a species plate with its element wash, the story reader, the stat chart, the splash animation, the planet field on the home page. |
| **Immersive experience** | A game in progress. Entered deliberately. | May replace the chrome. Keeps the core (section 2). Always has a visible way back out. Gets its own short design brief, approved before it is built. | The duel board, the Reclamation match, the training minigames, Long Return. |

The classification test: **lobbies, setup, results and reference are chrome; play itself is immersive.** If a screen is both (a duel results overlay on the board), the play surface is immersive and the overlay is chrome.

**Ruled 2026-09-08:** the generator and the encyclopedia are chrome for now. Either may later gain featured components or an immersive mode, but that is a separate decision.

## 2. The core

The core is shared by all three tiers and is never overridden, not even by an immersive experience.

- The **type scale** and the three faces (section 4).
- The **14 element hues** (section 3.4). Fire is red on every planet and on every board.
- **Stat semantics**: the stat colors and the meter, chip and badge meanings.
- The **contrast floor**, 4.5:1 for text against whatever it sits on.
- **Focus** is always visible, always the emitter ring (section 6).
- **Reduced motion** is honored everywhere.
- The **way out**: an immersive experience always shows how to leave it.

Everything else (room, surfaces, corners, furniture) is chrome, and an immersive experience may set its own.

## 3. Color

### 3.1 The accent: the viable signal

The accent is the logo's mint. Its meaning is fixed: **it is the color a Generator shows when a genome is alive and printable.** On the site it marks exactly two things: a living Xalian's presence, and the one action that moves the person forward.

The test any agent can apply: *is this thing alive, or is it the one action that moves the person forward?* If neither, it is not accent-colored. Headings, icons, dividers, decorative rules, section markers and kickers never wear it. One primary action per screen.

Three tiers of one hue. The bright one is only ever small.

| Token | Value | Role |
|---|---|---|
| `--g-viable-hi` | `#86ffb5` | **Emitter.** The logo, a live value on glass, a status dot, the focus ring, the active toggle knob. Small, on dark, never a fill wider than a line of text. |
| `--g-viable` | `#4fc98d` | **Fill.** The one primary button on a screen, the selected segment, the active tab underline. |
| `--g-viable-lo` | `#2f8f63` | **Pressed and border.** Pressed primary, the on-state of a toggle track, a selected row's border. |
| `--g-viable-tint` | `rgba(134,255,181,.10)` | Selected backgrounds. |
| `--g-viable-ink` | `#08150e` | Text on a viable fill. |

Why this is grounded: Xalians are engineered life; the Generators, the Scrambler Tokens, the tournament loop and the Plague are all about genomes, and the helix in the logo already says so. The accent and the good outcome are one color for one reason. Orange was tried and withdrawn because it had no story and collided with Fire.

### 3.2 Semantic colors

Status colors say what state something is in. They appear only on interface state (badges, borders, toasts, validation). Content never borrows them.

| Role | Token | Value | Meaning |
|---|---|---|---|
| Viable | the accent tiers | | Success, alive, connected, saved. Shares the accent hue on purpose. |
| Plague | `--g-plague`, `--g-plague-tint`, `--g-plague-ink` | `#b5566c`, `rgba(181,86,108,.14)`, `#fff1f3` | Error, failure, destructive. A sick raspberry, kept away from Fire's orange-red. Never a highlight, so the two ends of the lore's conflict are the two ends of the palette. |
| Caution | `--g-caution`, `--g-caution-tint` | `#cfa54a`, `rgba(207,165,74,.14)` | Warning, unsaved, expiring. Rare by design. |
| Neutral | `--g-neutral-status` | `#8a97a6` | Information, idle, offline, not set. Clearly not a verdict. |

### 3.3 Neutrals

The room is a warm near-black and the ink is bone rather than white. Mint on a warm dark reads as a light in a room; mint on cool grey reads as software. Surfaces step up in tone; glass is darker than the room and holds only live data.

| Token | Value | Role |
|---|---|---|
| `--g-room` | `#121110` | Page ground. |
| `--g-s0` | `#191816` | Level 0: navbar, footer, sidebars. |
| `--g-s1` | `#201f1c` | Level 1: cards and panels, the default container. |
| `--g-s2` | `#282723` | Level 2: controls resting on a panel. |
| `--g-s3` | `#31302b` | Hover on level 2. |
| `--g-glass` | `#0e100f` | Live data only: a fresh record, a match summary, a live figure. |
| `--g-edge`, `--g-edge-hi`, `--g-edge-strong`, `--g-glass-edge` | `rgba(217,210,192,.10)`, `rgba(255,244,214,.07)`, `rgba(217,210,192,.22)`, `rgba(217,210,192,.14)` | Hairlines, the one inset top highlight, strong borders, glass edges. |
| `--g-ink`, `--g-ink-2`, `--g-ink-3`, `--g-ink-4` | `#d9d2c0`, `#9a9382`, `#6c6659`, `#4a4640` | Text, secondary text, labels and kickers, disabled. |

### 3.4 Element hues (revised 2026-09-08)

Nick's original fourteen were measured in OKLCH and scored for contrast under dark text (they are backgrounds under dark foregrounds) and for distance to their nearest neighbor. Three failed contrast (Dark 3.2:1, Ghost 4.0:1, Rock 4.1:1) and five pairs were near-identical (Electric and Sand, Air and Light, Dark and Ghost, Plant and Rock, Water and Metal). The revised set has no contrast failure, its closest pair is 60 percent further apart, and the hues sit about 26 degrees apart around the wheel, which is as far as fourteen can be spread. Each keeps its meaning.

| Element | Was | Now | Why |
|---|---|---|---|
| Fire | `#df6d5e` | `#e5735f` | A hair more light. Still the hottest thing in the set. |
| Sand | `#e6b26f` | `#dba873` | Was almost Electric. Pulled to peach-tan, less saturated. |
| Electric | `#e2bd43` | `#e9c93a` | Cleaner lemon, brighter, 30 degrees from Sand. |
| Rock | `#8d7050` | `#a98a6a` | Failed contrast and sat on Plant. Lifted to warm stone; the only earthy neutral. |
| Plant | `#708844` | `#83a44b` | Was borderline. Lifted, greener, 30 degrees from the accent. |
| Chemical | `#64bd9f` | `#58c3ba` | Was the nearest color to the accent. Pushed to a toxic teal so mint stays the signal. |
| Ice | `#85dde4` | `#8fd6ee` | A touch more blue, away from Chemical. |
| Water | `#60a0c5` | `#6a9fd8` | Deeper and more saturated, away from Metal. |
| Air | `#ffffff` | `#d8e6ee` | Was pure white and the same as Light. Now a pale cool sky. |
| Light | `#ffffc7` | `#f5ec9a` | Now a clear pale gold rather than paper. |
| Dark | `#57619c` | `#7378c4` | The one clearly failing color. Lifted to dusky indigo at 4.7:1; still the deepest, coolest hue. |
| Ghost | `#8764a8` | `#a886cf` | Failed contrast and sat on Dark. Wraith lavender, 26 degrees from Dark, 27 from Psychic. |
| Psychic | `#d39bcb` | `#dc9fd2` | A touch brighter. |
| Metal | `#8d8d8d` | `#a4a8ad` | Dead grey given a cool steel tint; lightened away from Water. |

Element hues appear only on element-tagged content: chips, plates, tiles, meters, map points, board pieces. Interface state never uses them. `.g-el-<element>` on a container sets `--g-el` for everything inside it. The revised values go into `system.css`, `colorConstants.js` and `designTokens.js` together in the migration PR; the lore art pipeline does not use them (see `lore-art-independent-of-design-system`).

### 3.5 Token layers

Tokens are declared in three layers so a component never names a hex and a page never names a primitive.

1. **Primitive**: the values above, in `:root` of `system.css`, mirrored in `designTokens.js`, paired in `designTokens.test.js`.
2. **Semantic**: `--g-surface-page`, `--g-surface-0` to `--g-surface-2`, `--g-surface-live`, `--g-surface-float`, `--g-text`, `--g-text-2`, `--g-text-3`, `--g-accent`, `--g-accent-ink`, `--g-focus`, `--g-status-ok`, `--g-status-danger`, `--g-status-warn`, `--g-status-info`, each an alias of a primitive.
3. **Component**: `--g-btn-primary-bg`, `--g-input-border`, and so on, declared on the component's base class, each an alias of a semantic token.

Adding a color means adding a primitive to both mirrors and the pairing test, then a semantic alias if it has a role. Page CSS reads semantic or component tokens only.

## 4. Type

Three faces, chosen by role, never by page. Ruled 2026-09-09 (pairing A).

| Role | Face | Fallback | Use |
|---|---|---|---|
| Legend and heading | **Saira** 500 and 600 | Barlow Condensed, Impact | Everything that labels or heads: titles, section heads, card heads, kickers, table heads, nav, buttons, chips, badges. Uppercase with tracking at legend size. Saira's squared bowls are the Eurostile lineage of spacecraft placards, drawn modern; they echo the cut corners in the logo. |
| Body | **Atkinson Hyperlegible** 400 and 700 | Barlow, system-ui | Everything read as prose. Designed for low vision; odd, memorable letterforms at text size. |
| Data | **Martian Mono** 400 and 500 | IBM Plex Mono, ui-monospace | Everything that is a value. Always `tabular-nums`. |

The scale, in pixels: display 40, title 32, heading 24, subhead 19, legend 11.5 (tracked .1em), lead 17, body 15, small 13.5, data 15, figure 24. Running text is capped at 62 characters. Digits are always tabular.

The version 3 faces (Barlow Condensed, Barlow, IBM Plex Mono, Special Elite and the five nameplate faces) are removed in the migration.

## 5. Space, corners, depth

- **Space** is a 4 point scale: 4, 8, 12, 16, 24, 32, 48, 64 (`--g-1` to `--g-8`).
- **Corners are square.** No radius anywhere except dots and toggles. Ruled 2026-09-09.
- **The chamfer is the signature shape**, reserved for emphasis: a twelve pixel cut at top left and bottom right on the **glass tier** (live data), and an eight pixel cut on the **one primary key** per screen. Nothing else is cut. The cut echoes the logo's corners, and because it is rare it marks what is live and what is next. It is drawn as two clipped layers (an edge-colored layer and a one pixel inset surface layer) so the hairline follows the contour; `.g-glass` and `.g-key--primary` carry this and nothing else needs to.
- **Depth is low.** Surfaces are told apart by tone and a hairline edge with one inset top highlight. Levels: page (`--g-room`), 0, 1, 2, glass, floating. Drop shadows exist only on things that float over the page: modal, drawer, popover, toast, menu, search results. The one shadow they cast is `--g-shadow-float`; no page CSS writes a literal shadow.
- The room keeps a very faint grain and edge vignette. It is not a flat fill.

## 6. Controls and states

Four ranks of button, five states each. Focus is always a two pixel ring in `--g-viable-hi`, offset two.

| Rank | Rest | Hover | Pressed | Disabled |
|---|---|---|---|---|
| Primary (one per screen) | `--g-viable` fill, `--g-viable-ink` text, chamfered | lighter fill | `--g-viable-lo` fill | 40 percent opacity |
| Secondary | `--g-s2` fill, hairline edge, inset highlight | `--g-s3` | `--g-s1`, inset shadow, 1px down | 40 percent |
| Quiet | no fill, no edge, `--g-ink-2` | `--g-s1`, `--g-ink` | `--g-s0` | 40 percent |
| Destructive | no fill, `--g-plague` edge and text | `--g-plague-tint` | `--g-plague` fill, `--g-plague-ink` | 40 percent |

Destructive is an outline at rest so a page with a delete button does not shout; it fills only when the person is already reaching for it. Solid Plague at rest belongs only inside a confirmation dialog.

Inputs: `--g-s0` fill, `--g-edge-strong` border; hover brightens the border; focus is the ring; error is a `--g-plague` border on `--g-plague-tint` with a message that says what is wrong and how to fix it. Segmented control, toggle, checkbox and range follow the same fills and states. A pressed segment is a selected filter, not the forward action: it sits on `--g-s0` with a 2px `--g-viable` underline, the same mark the tabs use, never an accent fill (ruled 2026-09-09; filter rows were drawing more accent than the primary).

**Chips are content, badges are state.** A chip carries an element hue and names an element. A badge carries a status color and names a state, in the world's own words: a Xalian is kept, released or unclaimed; a match is won, lost or abandoned. Never "draft", "pending" or other ticketing vocabulary.

**Loading is the helix spinner, never a skeleton.** The DNA mark with its strands at low opacity and its six rungs lighting in sequence from top to bottom, in three sizes (20, 32, 56). Under reduced motion it holds a still frame at 70 percent. Skeleton screens are banned site-wide (ruled 2026-09-08: they read as software-as-a-service and people are tired of them).

Empty states are a solid hairline box on `--g-s0` with a legend line and one sentence that says what to do (dashed borders retired 2026-09-09; they read as a drop target). Toasts are level 2 with a strong edge, a status dot, and one sentence.

## 7. Motion

- Durations: 120 ms for a control changing state, 200 ms for something appearing or moving within a panel, 320 ms for a panel or modal entering. Nothing in the chrome is longer.
- Enter eases out (`cubic-bezier(.2,.7,.2,1)`); exit eases in (`cubic-bezier(.6,0,.8,.4)`).
- What may move: a control changing state, a panel entering, a value updating on glass, the splash animation once on arrival. Nothing loops, nothing pulses, nothing glows on a timer.
- Under `prefers-reduced-motion`, every transition is instant and the splash shows its resting frame.
- Immersive experiences set their own motion within the core.

**The motion catalog.** Everything in the chrome that moves, and nothing else:

| Motion | Duration | Where it lives |
|---|---|---|
| Control state (hover, press, focus ring) | 120 ms | `transition-colors` on every ui component |
| Chevron rotating on a collapsible or accordion | 200 ms | the component |
| Popover, dropdown, tooltip, hover card entering | 200 ms | `tw-animate-css` fade and zoom on the content |
| Dialog, sheet, drawer, alert dialog entering | 320 ms | fade on the overlay, slide or zoom on the content |
| Toast entering and leaving | 320 ms | sonner |
| Helix spinner rungs lighting in sequence | 1.2 s cycle | `.helix-spinner` in `globals.css`; the one loop, because it is loading |
| The home splash morph, once on arrival | GSAP timeline | `xaliansLogoDnaAnimated.js` |
| A value updating on glass | 200 ms | the component |

Under reduced motion `globals.css` sets every animation and transition to near zero, the spinner holds its 70 percent frame and the splash shows its resting frame. Nothing in the catalog is added without a row here.

## 8. Brand

- **The mark is the DNA X** (`apps/web/src/svg/logo/xalians_dna_logo.svg`), drawn in `--g-viable-hi`. It stays. It is also the favicon and the app icon.
- **The wordmark is "XALIANS" set in Iceland** (Google Fonts, by Ivan Gladkikh), ruled 2026-09-09 after a scan of thirty-two free faces with designer-made cuts or engineered character. Iceland is squared like Saira with its joins broken open at the corners, the way the original wordmark's were, and it is calm enough for a navbar. It is used only in the lockup; nowhere else on the site.
- **The lockup** is the helix at left, then the word, in `--g-viable-hi`. In the navbar the helix is 28 pixels tall and the word 22; on the home splash the helix is 84 and the word 64. A stacked form (helix over the word, small and wide) is the app-icon and splash form.
- **The morph stays.** On the home splash the word arrives, its X is an SVG path, and GSAP MorphSVG morphs that path into the helix's strands as the rungs fade in; the helix then holds as the mark. Iceland's X is converted to a path once (opentype.js) and split at its crossing so the three-piece morph from the current build still works. In the navbar the resting state is the word with its letter X.
- The old custom wordmark (`xalians_logo.svg`, `xalians_logo_and_dna_logo.svg`, the PNGs) is retired in the migration.

## 9. Content

- Controls say what happens, in plain words: Generate, Keep, Release, Start match, Read the story. No in-world copy on controls (no "Print", "Transmit", "File", "Admit").
- In-world voice belongs to content: species descriptions, world histories, the story, results narration. Section headings are plain.
- Sentence case everywhere except legends, which are uppercase.
- Numbers: tabular, thousands separated, units after a space (`93 in / 236 cm`). Dates are absolute.
- Errors say what went wrong and how to fix it. No apologies.

## 10. Where things live

The vehicle changed on 2026-09-09 (Nick: strip all Bootstrap; shadcn on Tailwind 4 with Lucide). `docs/design/frontend-stack-migration.md` is the contract for the build; this section is the map.

| File | Role |
|---|---|
| `apps/web/src/styles/tokens.css` | **The tokens**, as the Tailwind theme. The only file in the app holding a raw color, font name or size: the room and surfaces, edges, ink, the viable signal, status, the 14 element hues, the four faces, the type scale, radius 0, the one float shadow, the breakpoints. |
| `apps/web/src/styles/globals.css` | The semantic layer over the tokens: shadcn's variables mapped onto the contract, the `el-*` element scope, the chamfer and cut utilities, the `type-*` roles, the helix strokes and keyframes. No values, only references. |
| `apps/web/src/constants/designTokens.js`, `colorConstants.js` | The JavaScript half of the palette for recharts, GSAP and SVG. Must equal the tokens. |
| `apps/web/src/__tests__/tokens.test.js` | Fails if `tokens.css` and `designTokens.js` disagree, or if any other stylesheet under `src` carries a raw hex. |
| `apps/web/src/components/ui/*.tsx` | shadcn components restyled to the contract (the inventory below). Add one with `npx shadcn@latest add <name>` and restyle it here. |
| `apps/web/src/components/system/*.tsx` | House components and page templates (the inventory below). |
| `apps/web/src/pages/styleGuidePage.tsx`, `apps/web/src/pages/styleguide/*.tsx` | `/styleguide`: every component in every state, rendered from the real code. The reference an agent checks before building anything. The page holds the foundations; the section files hold the rest. |
| `apps/web/src/pages/system/*.tsx` | The status pages: `/404` and the router fallback, `/dev/error` for the boundary. |
| `apps/web/src/__tests__/designSystem.test.js`, `systemGuards.test.js` | Fail if a page is unclassified (`data-tier`), if a component under `ui` or `system` is not on the style guide, or if a chrome file carries a raw hex, a version 3 class or a Bootstrap import. |
| `apps/web/public/assets/css/legacy/*` | Legacy: the version 3 system (`system.css`), the old template (`style.css`), and the immersive pages' own stylesheets. Read only by the immersive pages until each gets its brief, which deletes its share. Never add a rule; never load on a chrome page. |
| `docs/design/v4-foundations.html`, `docs/design/v4-chrome.html` | The ratified proposal pages. |
| `docs/design/terminal-mockups.html` | Version 3, kept as the record of what was tried. |
| `scripts/design/snap.js` | Screenshot harness: every route at desktop and phone with overflow and console-error checks. Run it before claiming visual work is done. |

### 10.1 The component inventory

Everything the chrome tier may be built from, as of 2026-09-10. Each is on `/styleguide` with its states; `systemGuards.test.js` fails if one is added without a section.

**Primitives** (`src/components/ui`, shadcn restyled)

| Group | Components |
|---|---|
| Actions | Button (ranks: `default` the one primary, `secondary`, `outline`, `ghost`, `destructive`, `link`; sizes incl. `icon`), ButtonGroup, Toggle, ToggleGroup |
| Inputs | Input, Textarea, InputGroup (leading icon, trailing addon or clear), NativeSelect, Select, Checkbox, RadioGroup, Switch, Slider, Label, Form (react-hook-form + zod), Field set (FieldSet, FieldLegend, FieldGroup, Field, FieldLabel, FieldDescription, FieldError) |
| Choosing | Command (palette, CommandDialog), Combobox, Tabs (`tabTriggerClass` for router links) |
| Content | Card (`panel`, `recessed`, `raised`, `glass`, `link`), Badge (`chip`, `chip-outline` for elements; `default`, `ok`, `warn`, `danger`, `info` for state), Avatar (sm 24, md 32, lg 48; AvatarGroup), AspectRatio, Separator, ScrollArea, Collapsible, Accordion, Alert, Kbd, Progress |
| Overlays | Dialog, AlertDialog (destructive confirm), Sheet (desktop side panel), Drawer (phone bottom sheet), Popover, HoverCard, DropdownMenu, Tooltip, sonner `toast` |
| Data | Table, Chart (recharts themed from the tokens; `ChartContainer`, `ChartTooltip`, `ChartLegend`), Pagination, Breadcrumb |

**House pieces** (`src/components/system`)

| File | Components | For |
|---|---|---|
| `masthead.tsx` | Shell, Masthead, SectionHead | The core frame of every page |
| `brand.tsx` | HelixMark, HelixSpinner, BrandLockup | The mark, loading, the lockup |
| `record.tsx` | SpecPlate, RecordRow, Meter, MoveSet, EmptyState, Tile, TileBar, TileArt, TileMeta | Records and catalog tiles |
| `layout.tsx` | IndexPage, RecordPage, FormPage, ResultsPage | The four page shapes: an index with filter bar and pagination, a record with plate and readouts, a single-column form with the keys pinned on the phone, a result with an outcome badge and stat tiles |
| `status.tsx` | NotFoundPage, ErrorPage, OfflinePage, ErrorBoundary | The pages a site needs before it has content |
| `a11y.tsx` | SkipLink, VisuallyHidden, LiveRegion | Section 15 |
| `stepper.tsx` | Stepper, Step | Multi-step flows: squad, board, confirm |
| `readouts.tsx` | StatTile, KeyValueList, Timeline, TimelineItem, Callout (`note`, `caution`, `plague`, `viable`), DataBlock | Numbers, facts, eras, asides, raw data |
| `filters.tsx` | SearchField, FilterBar | Index pages; the bar folds into a Sheet under `sm` |
| `data-table.tsx` | DataTable | Sortable, linkable, selectable rows on the Table primitive; never collapses into cards |
| `identity.tsx` | IdentityRow | A person or account: Avatar, name, detail |

Deliberately absent: Skeleton (section 6), Calendar and date pickers, Carousel, Resizable, Sidebar, Menubar, ContextMenu, NavigationMenu, InputOTP. Add one only when a page needs it, through step 2 of the build-ui skill.

Page classification is declared on the page root: `data-tier="chrome"`, `data-tier="immersive"`, and a featured component declares `data-tier="featured"` on its own root. The test fails if a page has neither this nor the legacy `data-terminal`.

## 11. Migration from version 3, in order

Each step is one PR, verified by paint with `scripts/design/snap.js`, auto-merged.

1. **Done 2026-09-09 (PR: design/v4-migration).** Tokens and components. Rewrite `system.css` to the version 4 primitives, semantic aliases and component set; remove every terminal material block and every piece of terminal furniture (`.g-case`, `.g-counter`, `.g-desk`, `.g-cover-plate`, `.g-tube`, `.g-standoff`, `.g-keybank`, `.g-tape`, `.g-asset-plate`, `.g-nameplate`, `.g-stamp`, `.g-clip`, `.g-pencil`, `.g-vfd`, `.g-crt`, `.g-ledger`, `.g-paper*`, `.g-plate--photo`, `.g-meter--ink`, `.g-readout-mode`). Update `designTokens.js`, `colorConstants.js`, both tests, the fonts in `index.html`. Rebuild `/styleguide`. Add the spinner and the lockup components.
2. **Done 2026-09-09, same PR, except the Reclamation lobby, which lives on the same page as the match and moves with it.** Chrome pages. Navbar and home (with the new lockup, the morph and the planet field replacing the stat tiles and equal destination cards), account, user details, encyclopedia, generator, duel setup, Reclamation lobby, training menu. Delete the terminal furniture and in-world copy from each. Set `data-tier`.
3. **Immersive experiences**, one at a time, each with a short brief approved first: duel board, then Reclamation match, then the training games and Long Return.

## 12. Rules for new work

1. **Classify first.** Chrome, featured component, or immersive experience (section 1). Write it in the page file's header comment and set `data-tier`.
2. **Chrome uses only what is in `/styleguide`.** If the component you need is not there, add it to the system (tokens, states, styleguide section, test) rather than styling it inline. A featured component may be new, but it is built from the tokens.
3. **Accent test.** Alive, or the one forward action. Otherwise no accent. One primary per screen.
4. **Status by role, element by content.** Never the other way.
5. **No raw hex.** A new color is a primitive in both mirrors and the pairing test, then a semantic alias.
6. **Square corners; chamfer only on glass and the primary key.**
7. **No skeletons; the helix spinner.** No pulsing, no loops.
8. **Plain copy on controls.** The world speaks in the content.
9. **Contrast 4.5:1, visible focus, keyboard order, 44 pixel touch targets, reduced motion honored.**
10. **Verify by paint.** Run the harness, open the PNGs at both widths. A check that could not have failed is not a check.
11. **Report friction in the moment.** If a rule forces something absurd or a page fits no tier, say so with the concrete case and the smallest change. These are levers, not stone.

## 13. Deliberately avoided

- Terminal props of any kind: cases, counters, desks, tape, screws, hinges, clips, stamps, nameplates, VFD strips, fake readouts, asset plates, hazard livery. Version 3 built all of them and they made the site cheesy.
- In-world copy on controls.
- Per-area typefaces or accents. One system.
- Stat tile rows and equal-card feature grids on the home page. They are dashboard and marketing shapes.
- Skeleton screens.
- Rounded corners, pills (except dots and toggles), drop shadows on things that do not float.
- Whole-page scanlines, noise overlays, glow on surfaces, pulsing anything.
- Fallout signals: Pip-Boy green as a screen wash, hazard yellow, atomic iconography. The mint is an accent on a full-color site, never a monochrome screen.
- Orange as the accent. Withdrawn 2026-09-08.

## 14. Lessons carried forward

- A `var()` alias declared only in `:root` resolves once; every derived token must be redeclared wherever its inputs change. With version 4 there are no per-area blocks, so this mostly goes away, but it still applies to `.g-el-*` scoping.
- `.g-console::before` (now `.g-page::before`) must be `position: absolute`, never `fixed`.
- React-Bootstrap modals portal to `body`; pass `container` so tokens scoped to the page apply.
- A `clip-path` cuts the border off with the corner; a chamfered surface is two clipped layers.
- Class selectors are case-insensitive in quirks mode; do not rely on `.LG` and `.lg` being different.
- When fanning out agents on visual work, one shared worktree is unsafe (an agent ran `git stash` and wiped others' work). One agent at a time on shared files, or separate worktrees.

## 15. Accessibility

Part of done, checked on every component before it is on `/styleguide` and on every page before its paint check.

- **Keyboard.** Every control reachable by Tab in reading order, operable with Enter, Space and the arrow keys Radix gives it. Overlays trap focus and return it to the trigger on close. Escape closes every overlay.
- **Focus.** One visible focus ring, two pixels in `--color-viable`, offset two on the surface behind it (`focus-visible:ring-2 ring-viable ring-offset-2 ring-offset-s0`). Never removed, never replaced by a color change alone.
- **Skip link.** Every page's `<main>` carries `id="main"` and renders `SkipLink` first, so the first Tab lands on "Skip to content".
- **Names.** Every control has a name: visible label, `aria-label` on icon-only keys, `Label htmlFor` on every input. Icons are decorative (`aria-hidden`) unless they are the whole control.
- **Announcements.** Loading and result changes that the eye would catch are announced through the `LiveRegion` (`aria-live="polite"`); toasts announce themselves.
- **Contrast.** Text 4.5:1 against its surface, legends and data included; the ink scale on the surface scale holds this by construction, an element hue as text does not, so element hues color chips and plates, never body text.
- **Targets.** 44 by 44 pixels on the phone layout for anything tapped; a 32 pixel icon key gets its hit area from padding, not from a bigger glyph.
- **Motion.** `prefers-reduced-motion` is honored by the theme (section 7). Nothing autoplays with sound; nothing flashes.
- **Structure.** One `h1` per page, in the masthead. Sections head with `h2`, subsections `h3`; the type roles (`type-title`, `type-heading`, `type-subhead`) never substitute for the element. Lists are lists, tables are tables (`DataTable` on the `Table` primitive; never a grid of divs pretending).
- **Language.** Errors say what went wrong and how to fix it, next to the field, and are linked to it (`aria-describedby`, which `Form` does). Placeholder text is never the only label.

## 16. Icons

- **Lucide only** (`lucide-react`), at four sizes: `size-3.5` inline with small text and in badges, `size-4` inline with body text and inside buttons, `size-5` on icon keys and section heads, `size-6` on the phone menu key and empty states. No other size, no other set, no emoji.
- **Stroke** stays at Lucide's default; icons take `currentColor` and so wear the ink of the text they sit in. An icon never wears the accent or a status hue on its own; it inherits from a badge, a callout or a key that already does.
- **Meaning.** One icon per meaning across the site (search is `Search`, close is `X`, more is `MoreHorizontal`, remove is `Trash2`, sort is `ArrowUpDown`, expand is `ChevronDown`, external is `ArrowUpRight`). A new meaning gets a row in the style guide's icon section before it is used twice.
- **Never alone in chrome copy.** An icon beside a word, or an icon-only key with `aria-label`; an icon standing in for a word in prose is a picture, not a word.
- Species, planets and elements are art, not icons: `XalianImage` and the planet renders, never a Lucide glyph.

