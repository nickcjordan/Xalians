# Site audit, first-time visitor pass (2026-09-18)

## Context

A full pass over the deployed site at https://www.xalians.com as a visitor with no knowledge of the project or the lore. Scope: every non-game page. Home, Generator, the Encyclopedia and all of its sub-pages (Reading Room, The Story and its parts, Worlds and every world record, Bestiary and every species record, Powers, Index and entry pages, search), Account, Trade, the Arcade hub as a landing surface only, and the not-found states. The games themselves (Duel, Reclamation, Expedition, Powerworks, the five arcade games) were not evaluated.

Method: a manual walk of about twenty pages in Chrome at 1440x900, with the a11y tree, console and network inspected on each, plus interaction checks (sign in, create account, generate, range switch, trait expander, bestiary filters, search, random entry, mobile menu). In parallel a scripted sweep loaded 70 routes at 1440 and at 390 (mobile emulation) and recorded status, title, crashes, console errors, failed requests, overflow, broken images and placeholder text. Screenshots for both widths live in the session scratchpad under `shots/1440` and `shots/390`.

Build audited: the deployed main at commit fc274ec or later (bundle `index-17r_i_hg.js`).

## What is solid

- No JavaScript crashes, no console errors, no failed asset requests, no broken images, no horizontal overflow at either width, on any of the 140 page loads.
- Bad ids on `/trade/:id` and `/xalian/:id` render clean empty states rather than raw errors.
- Keyboard focus is visible on every tab stop checked (six pages, 25 stops each).
- Load is fast and the visual system is coherent: one type system, one palette, element colors used consistently across chips, map, bars and cards.
- The Encyclopedia search is excellent: instant, ranked, with snippets across entries, worlds and chapters.
- World landscape art and the species lore fields (appearance list plus five short fields) are the strongest content on the site.

## Findings

Severity: **B** bug, **U** unclear or confusing to a newcomer, **P** looks unfinished or unprofessional, **C** copy or content, **A** accessibility.

### Site-wide

| # | Sev | Finding | Evidence |
|---|---|---|---|
| S1 | P | Every route has the document title `Xalians` and meta description `Xalians`. No page-specific titles in tabs, history, or search results. `theme-color` is `#ffffff`, so mobile browser chrome goes white over a near-black site. | Sweep: 70 routes, all titled `Xalians`; `index.html` head |
| S2 | P | No footer on any page. Pages simply stop. No about line, no contact, no legal, no build or version, no secondary navigation. | Home, Generator, all Encyclopedia pages |
| S3 | U | Primary nav is seven items, five of them games, two of them content. The home page directory lists Generator, Encyclopedia, Duel, Reclamation, Arcade and omits Expedition and Powerworks, so the two lists disagree. | `navbar.tsx` NAV_LINKS vs home directory |
| S4 | P | The desktop nav collapses to a hamburger below 1180px. A 1100px laptop window or an iPad in landscape gets the phone menu. | Verified at 1100x800 |
| S5 | U | Internal vocabulary reaches the visitor: Ratified, Generator template, Generator survey, Trace, Beat, Chirality, Ambient media, Corporeality, Registry distinction, finish, affinity, pull, binder, calibrated generations. None is defined where it appears. | Bestiary, species pages, world pages, Generator, Trade |
| S6 | C | Em-dashes in UI strings: the percentile gloss on the record ("...calibrated generations—not combat power"), the sign-up username helper ("Must be unique — can contain..."), the Generator survey readout ("VIABLE — ash storm..."). Legacy lore prose mixes en dashes, hyphens used as dashes, and straight quotes. | `RecordView.tsx`, sign-up dialog, `WorldView` survey, world histories |
| S7 | U | Sign-in dialog has no forgot-password path and no link to create an account. Create-account dialog has no link back to sign in and shows password rules only as a post-submit error. No terms or privacy line. Inputs lack `autocomplete` (console issue). | Home, both dialogs |
| S8 | P | All creature art is a solid black silhouette on a flat element-colored card. It is consistent, but to a newcomer it reads as placeholder art, especially in the home strip where eight identical-style black shapes sit side by side with no caption. | Home, Bestiary, species pages, Generator |
| S9 | A | A "Skip to content" link exists only on the Arcade page. | Sweep a11y trees |
| S10 | U | Hero wordmark's accessible name is "Xalians ALIANS" because the X is a separate SVG. Screen readers read the brand twice above the fold with a broken second copy. | Home a11y tree |

### Home

| # | Sev | Finding |
|---|---|---|
| H1 | U | The hero explains the site with four proper nouns in two sentences (Vallerii, King Kozrak, Mercurius Machine, Scrambler Tokens) before saying what the site is or what a visitor can do here. The eyebrow "XALIA" is unexplained. |
| H2 | P | Logo plus wordmark appear twice above the fold (navbar and hero). |
| H3 | P | The fourteen-world grid and the featured-species strip have no visible headings, only aria-labels. The grid is five wide, so the last row has an empty slot. |
| H4 | C | Directory copy "keep it to your account" is awkward. "Open" is the only action word on each row. |
| H5 | P | Mobile: "Read the story" is indented relative to the button above it; the species strip is cut mid-card with no scroll affordance; the world grid ends with a half row. |

### Generator

| # | Sev | Finding |
|---|---|---|
| G1 | U | Two "Generate another" buttons are on screen at once (page header and the Not-saved panel), plus "Sign in to generate", which is a third generate-flavored button. |
| G2 | C | Not-saved copy: "gone the moment the lever turns again." There is no lever on the page. |
| G3 | B | Every unowned preview shows `SERIAL No. 1`. The preview is not serialized; the number is misleading. (`RecordView.tsx` renders `provenance.serial` unconditionally.) |
| G4 | P | The 32-character seed wraps mid-string onto a second line in the header grid. |
| G5 | U | "Registry distinction: 7th percentile / 31st / 47th" with the gloss "How unusual this record is." A newcomer cannot tell whether a low number means rare or common. |
| G6 | C | "Standard finish." sits as a dangling one-line paragraph under the Appearance list. Switching to Full spectrum produced the same line on every pull I made, so the range choice showed no visible effect. |
| G7 | U | Range chooser copy defines Commoner as "Standard finish, one affinity, and no rare traits" and Full spectrum as "Every finish, affinity combination, and trait outcome". Finish, affinity and pull are not defined anywhere. |
| G8 | U | Action lines are machine-assembled: "discrete · projectile: harm with its spines, through rock." The magnitude words (Faint, Slight, Measured, Strong, Overwhelming) and numbers are not explained. |
| G9 | P | Below the bars, Affinity, Traits, Appearance and Temperament occupy the left half with the right half empty. The eyebrow "GENERATOR" sits directly above the h1 "GENERATOR". |
| G10 | U | Nothing on the record says what a visitor can do with a Xalian. "Sign in to make the next one yours" gives no reason to want one. |
| G11 | P | Generate swaps the record instantly with no state change. The Generator does not feel like a machine doing anything. |

### Encyclopedia: Reading Room (`/encyclopedia`)

| # | Sev | Finding |
|---|---|---|
| E1 | B | The page scrolls itself to about 717px on every load, hiding the title, the intro and the "Begin Part 1" button. Reproduced on a fresh tab, on reload, and in the phone sweep. Cause: `EraScrubber.js` calls `scrollIntoView({ block: 'nearest', inline: 'center' })` on mount to center the active era chip; when the rail is below the fold, `block: 'nearest'` scrolls the document. The comment on that effect says "without scrolling the page itself", which is not what the call does. `Bestiary.js` has the same pattern on the element row. |
| E2 | P | The four section panels at the bottom (Worlds, Bestiary, Powers, Index) are each about 190px tall and contain only a label and a count. Roughly 770px of near-empty boxes. |
| E3 | C | Two near-identical intro paragraphs: "Every record the Generator holds on the galaxy it serves is here..." above the CTA and "Every record the Generator has on the galaxy it serves..." under the map. |
| E4 | U | The galaxy map shows Wraithix and Cybele with no legend; neither is one of the fourteen worlds. The era buttons under the map do not say what they change. |
| E5 | C | Contents blurbs contain editor's notes: "(Endessa's glass took "thousands of years" to erode before the Accords)", "Short hinge era.", and Part 6 is the fragment "APEX turns through the Battle of Grimedes." |
| E6 | U | Every part shows "0 read" in mono on a first visit. |
| E7 | P | The Story tab is the same Contents table again. |

### Encyclopedia: story parts

| # | Sev | Finding |
|---|---|---|
| T1 | B | "Records consulted" chips are duplicated: Stonera, Telypso and Veridium appear twice, once linking to the world and once to the index entry, visually identical. |
| T2 | B | "Fixed points" heading shows a count of 2 while four are listed (one plus three "contemporaneous, unordered"). The first fixed point is plain text while the others are h4. |
| T3 | U | The "From the records" list opens with "But the discovery of Shadharam IV would forever change that narrative." There is no antecedent for "that narrative". |
| T4 | U | "Stonera CH. 00" as a chapter reference. Zero-based chapter numbering is visible to readers. |
| T5 | U | The Trace bar (Era, Beat, Story, Clear) is never explained. "Beat" is production vocabulary. |

### Encyclopedia: worlds

| # | Sev | Finding |
|---|---|---|
| W1 | C | Typo "flourescent" in the Telypso blurb. In world histories: "replate" for replete, "overtime" for over time (Magmuth). Powers page: "Rogueish". |
| W2 | C | "Temperature range 65 to 355 C" has no degree sign; species pages print "°C". |
| W3 | U | "Size vs Earth" and "Gravity vs Earth" reference Earth inside a fiction with no Earth. |
| W4 | B | "Continue the story: Part 1, The Deep Past" appears on every world and species page regardless of where that world enters the story. Magmuth's own "In the story" chips start at Part 3. |
| W5 | P | Home tiles carry an element chip; world cards on the Worlds page do not. Same content, different card. |

### Encyclopedia: bestiary and species

| # | Sev | Finding |
|---|---|---|
| B1 | U | The "Ratified" toggle is an internal term and a no-op for visitors: it filters species whose source is a template, which is all 32, so the count never changes. |
| B2 | P | Species page: the first heading is "Name origin" but the general description paragraph beneath it has no heading. The description repeats the Feeding and Behavior fields nearly verbatim (Graviclaw: "snap them shut with a force many times" appears in both). |
| B3 | U | The signature-ability panel is six machine fields (Instrument, Activation, Delivery, Effects, Medium, Intensity 55 to 85) with no gloss. |
| B4 | P | Desktop layout leaves the right third empty below the art. "Generator template" and "Cross references" are collapsed expanders at the bottom with no hint of what they hold. |

### Encyclopedia: powers, index, entries, search

| # | Sev | Finding |
|---|---|---|
| X1 | P | Powers is a text list in the left 60% of the page with the right 40% empty. |
| X2 | P | The Index header count renders in the mono face with slashed zeros ("1Ø7 entries"). The Index page replaces the global search with a different "Search entries" box. |
| X3 | U | Core entities (Vallerii, APEX, King Kozrak, the Generators) get a one-sentence definition followed by chapter excerpts. A newcomer who clicks "Vallerii" from the hero learns one sentence. |
| X4 | B | Some chapter search snippets end with the world key appended: "...cracks down on QED access. zolton", "...Kozrak's tournament. endessa". The indexed paragraph text carries the key. |

### Arcade hub, Account, Trade, not found

| # | Sev | Finding |
|---|---|---|
| N1 | B | Arcade hub meter reads "0 credits to token" when the meter is at zero; it should read the remaining amount. (Hub only; games not evaluated.) |
| N2 | B | The not-found page uses the raw URL path as its h1 in large mono, wrapping mid-word ("/this-page-does-not-ex / ist"). `/user/:id` not-found does the same. |
| N3 | U | Trade gate says "binders". Account and Trade gates are otherwise fine. |

## Analysis

1. **Orientation deficit.** The site never says in plain words what it is. The hero, the Generator and the Reading Room all speak from inside the fiction (H1, G2, G10, E4). That voice is an asset once a visitor is in, but there is no doorway: no one-line "creatures you generate, read about, and play with", no footer, no per-page titles (S1, S2). A newcomer's first three questions (what is this, what do I do, why sign in) go unanswered.
2. **Internal vocabulary leaking into the UI.** Ratified, template, survey, trace, beat, chirality, registry distinction, finish, affinity, serial (S5, B1, B3, T5, G5, G7). These are correct terms in the design docs and the record schema, and they arrived on the page because the record and the docs share one source. The fix is a presentation layer, not a schema change.
3. **Two visible bugs and a set of small data bugs.** The Reading Room auto-scroll (E1) is the single worst first impression on the site because it hides the page's own headline and CTA. The 404 heading (N2) is the second. Then the serial number on previews (G3), the arcade meter (N1), the snippet key leak (X4), duplicate chips and the wrong fixed-point count (T1, T2), and the always-Part-1 continue link (W4).
4. **Surfaces that look unfinished.** Empty panels on the Reading Room (E2), empty right columns on the Generator, species and Powers pages (G9, B4, X1), no footer (S2), five-column grids of fourteen (H3). These are layout decisions, not missing content, and they are cheap to correct.
5. **Copy hygiene.** Editor's notes in reader-facing blurbs (E5), duplicated paragraphs (E3, E7, B2), typos (W1), em-dashes and mixed dashes (S6), degree signs (W2). A single content pass with a checklist clears most of it.
6. **Information architecture.** The nav gives games five of seven slots while the content is two, the home directory disagrees with the nav, and the breakpoint pushes laptops into the phone menu (S3, S4). Grouping the games fixes all three.
7. **Art perception.** The silhouette system is deliberate and consistent, but nothing on the page signals that it is deliberate (S8). Framing and a caption do more than new art would.

## Proposals

Ordered by impact per unit of work. P1 items are bugs and one-line fixes; P2 items are orientation and structure; P3 items are polish.

### P1

1. **Fix the Reading Room auto-scroll.** In `EraScrubber.js` replace the mount-time `scrollIntoView` with a horizontal-only adjustment of the rail's `scrollLeft`, or guard it on `rail.scrollWidth > rail.clientWidth`. Apply the same to the element row in `Bestiary.js`. Add a test that mounts the Reading Room and asserts `window.scrollY` stays 0.
2. **Human not-found pages.** Heading "Nothing at this address", the path in small mono beneath, same two buttons. Same treatment for `/user/:id` and `/trade/:id`.
3. **Hide the serial on unowned previews** or print "Preview, not serialized".
4. **Arcade meter remaining count**: show credits remaining to the next token, not credits earned.
5. **Strip the world key from indexed paragraph text** so snippets end on prose.
6. **Dedupe "Records consulted" by name** and make the "Fixed points" count match the list; give the first fixed point the same heading level as the rest.
7. **Continue-the-story links** should point at the first part where that world or species appears, using the same data as the "In the story" chips.
8. **Per-route document titles and descriptions** via a small hook on each page, and set `theme-color` to the hull color.
9. **Copy fixes**: flourescent, replate, overtime, Rogueish; degree sign on world temperatures; remove em-dashes from `RecordView`, the sign-up helper and the survey readout; delete the duplicate Reading Room paragraph; rewrite the seven contents blurbs as reader-facing sentences with no parentheticals.

### P2

10. **Orientation line on the home page.** Replace the "XALIA" eyebrow or add one plain sentence under the headline: what Xalians are in ordinary words, and the three things a visitor can do (generate, read, play). Give the worlds grid and the species strip visible headings. Consider a three-step "Generate, keep, play" strip under the hero.
11. **Footer on every page**: one line about the project, links to Encyclopedia, Generator, Account and a contact or repository link, build version, copyright.
12. **Group the games in the nav** under one "Play" item (dropdown or a `/play` hub) so the bar is Home, Encyclopedia, Generator, Play, Arcade. This also lets the desktop nav survive down to about 900px and makes the home directory match the nav (or fold Expedition and Powerworks into the Play row).
13. **Reading Room bottom panels**: make the four section panels real cards (thumbnail, one line of copy, count) or collapse them to a compact row. Hide "0 read" counters until at least one chapter is read. Either make The Story tab distinct from the landing's Contents or point the tab straight at Part 1. Add a two-item legend to the map for Wraithix and Cybele, or drop those labels from the default view.
14. **Generator as a machine**: one Generate button; rewrite the Not-saved panel without the lever; define Commoner and Full spectrum in one sentence each in terms a visitor can see (rarer finishes, a second element, rare traits); only print a finish line when the finish is not standard; gloss the percentile ("rarer than 93 of 100 records") or drop it; keep the seed on one line with a copy button; add a brief print state (a beat of animation or a stamped "printed" mark) so a pull feels like an event; add a line under the record on what owning a Xalian lets a player do.
15. **Species and world records for readers**: give the lead description its own heading; drop the sentences that duplicate Feeding and Behavior (this is the lore-fields rule already ratified); add a one-line gloss to the signature-ability panel or collapse its six fields under the plain description; rename "Generator template" and "Generator survey" to something like "Record data" under a "For builders" fold; remove the "Ratified" toggle until an unratified species exists.
16. **Define the vocabulary where it appears.** The hover-card component already exists for entries; use it, or a tooltip, for Trace, Chirality, Registry distinction, Affinity, Finish. Rename Trace to "Recently viewed" and Beat to "Section" in visitor-facing text.
17. **Auth dialogs**: forgot-password link, cross-links between sign in and create account, password rules shown before submit, `autocomplete` attributes.

### P3

18. **Desktop layout balance**: cap the reading width or run two columns for the lower half of the record, the species page and the Powers list so no page leaves a third of the width empty.
19. **Grids**: fourteen worlds in seven columns on desktop, four at laptop width, two on phones, so no row is ragged. Show the element chip on the Worlds page cards as on home.
20. **Silhouettes read as intentional**: a consistent plate frame, a world-tinted backdrop, and a caption on the home strip ("Silhouettes from the species record") so the style reads as a choice. If shaded art ever arrives, the home strip is the first place for it.
21. **No Earth anywhere** (ruled by Nick 2026-09-18, replacing the footnote idea): the site speaks from inside the universe, so remove the Earth-relative rows and print absolute figures (radius in km, surface gravity in m/s²), strip the legacy "x Earth" strings from the planet data, and add a test that forbids the word.
22. **Core-entity entries**: give Vallerii, APEX, King Kozrak, the Generators, Scrambler Tokens and the Nemesis Plague a real three-paragraph article above the excerpts.
23. **Skip-to-content link** on every page, and mobile polish on home (align the story link with the button, add a scroll hint to the species strip).

## Assumptions

| # | Assumption | Confidence | Evidence |
|---|---|---|---|
| 1 | The deployed site reflects origin/main as of 2026-09-18 and is what a first-time visitor sees. | 95% | CI deploys main to S3 and CloudFront; bundle hash on the live index differs from the stale local checkout |
| 2 | The auto-scroll comes from `EraScrubber` and not from a router effect. | 90% | `encyclopediaPage.js` returns early on cold load without a hash; the scrubber's effect runs on mount with `block: 'nearest'`; scroll offset lands the rail at the viewport bottom |
| 3 | All 32 species are ratified today, so the Ratified toggle cannot change the count. | 95% | Bestiary filters on `source === 'template'`; count stayed 32 of 32 with the toggle in both states |
| 4 | The Arcade hub counts as a non-game landing page for this audit. | 80% | Nick excluded the games; the hub is navigation, not play |
| 5 | Silhouette art is a settled style rather than a placeholder. | 85% | Species art system memory and the consistent treatment across every surface |
