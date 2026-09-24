# Home story content plan (2026-09-24)

Written for: the agent building the home page's story stage, and Nick as the owner who judges each beat live.

## 1. Context

The home page's story (`/`, section "The Story", `pages/home/storyStage.tsx`) showed four scenes, one per era: Unbirth, the Accords, the End Wars and the present. After the Unbirth plate settled, Nick asked to stop building scene by scene and decide the content first: the ideas a first-time visitor should take away, which moments in the lore show them best, where the gaps are, and only then what to build. He also opened the structure: full scenes with a landscape, as built so far, with smaller focused animations between them that have no background.

Nick approved this sequence on 2026-09-24 ("agreed, proceed"). This plan records it so that the build does not reopen it. It supersedes the four-scene list in section 3 of `home-story-page-brief.md`; everything else in that brief (Nick's words, the spreads, the stage's scroll mechanics, the parts) still holds.

## 2. Assumptions and decisions

| # | Assumption / Decision | Confidence | Supporting evidence |
|---|---|---|---|
| 1 | The story's job is to make "generate a Xalian of your own" feel earned, so the sequence follows a chain of causes ending at the Scrambler Token, not a tour of the eras. | 90%, Nick approved the chain | conversation 2026-09-24; `CLAUDE.md` lore summary |
| 2 | Every headline is a phrase from Nick's 2022 front page, not new copy. Agent-written headlines were rejected as robotic in the first demo. | 95% | `home-story-page-brief.md` section 1; `git show 1285604e:my-app/src/pages/home.js` |
| 3 | A headline may quote a phrase from the paragraph of a neighboring beat, the way a pull quote repeats its article. Reported as a lever if it reads as repetition. | 70% | beats 2 and 3 below |
| 4 | The Accords scene (the QED works on Zolton) leaves the stage. Its point, that APEX took the Generators, is made directly by beat 3. Its living plate and poster stay in the repo; nothing is deleted. | 90%, Nick approved the swap | conversation 2026-09-24; `apps/web/public/assets/plates/accords/` |
| 5 | The small pieces are driven by scroll position within their stretch of the stage (scrubbed), not by a clock. Scrolling back plays them backward, and every scroll moves something. | 85%, follows Nick's "scrolling should always do something" | `home-story-page-brief.md` section 3 |
| 6 | On a full scene the headline becomes the scene's heading, and the era title moves into the kicker with the numeral ("01 · The Age of Unbirth"). | 70%, a layout call Nick judges live | `apps/web/src/pages/home.tsx` `SceneReading` |
| 7 | The small pieces are React components (inline SVG and GSAP), not plate fragments. They carry no landscape and no frame, so the plate pipeline's layers and poster are not needed. | 80% | `components/plates/livePlate.tsx`; the End Wars and Unbirth plates |
| 8 | The optional closing tease (the ancient presence stirring behind the last creature) is deferred. I recommended leaving it out unless the page should end on dread, and Nick approved without adding it. | 80% | conversation 2026-09-24 |
| 9 | The Tournament & Tokens section drops its token paragraph once beat 6 carries it. It keeps the tournament paragraph and the call to action. | 85% | `apps/web/src/pages/home.tsx` `TOKENS`, `TOURNAMENT` |
| 10 | The world-forms in beat 2 are silhouettes of real ratified species, one each from an ice, an air and a fire world, chosen at build. No invented creature. | 85% | `docs/species-templates/RATIFIED.json` |

## 3. The chain a visitor should leave with

1. A race that could no longer have children built machines to make life for them.
2. Each creature was designed for a world that would kill anything else, so they come in many kinds.
3. The makers handed those machines to an AI, and it turned the creatures on them.
4. The AI's last weapon is a plague that kills by genome.
5. So the only safe new creature is one made from a scrambled genome: every new Xalian is unique.
6. One tyrant holds the only machine that makes those genomes, and he makes the worlds fight for them.

Step 5 is the hook. It is the in-world reason every Xalian a visitor generates is one of a kind, and it leads straight into the page's call to action.

## 4. The sequence

Seven beats: three full scenes and four small pieces. A full scene holds 70 percent of a screen of scroll and has a major marker on the timeline. A small piece holds 40 percent and has a minor tick. Every marker and tick jumps to its beat.

Text sources: `STORY[0]` to `STORY[3]` and `TOKENS` are Nick's 2022 paragraphs as they stand in `apps/web/src/pages/home.tsx`. "Only the strongest factions will survive..." is the closing line of his 2022 "The Galaxy of Xalia" section (`git show 1285604e:my-app/src/pages/home.js`), which the current page does not quote yet.

### Beat 1 · Full scene · The Age of Unbirth (built)

- **Headline:** "They birthed the first Xalians" (from `STORY[0]`).
- **Reading text:** `STORY[0]`.
- **Label:** unchanged ("The Genesis Prototype on Floria").
- **Painting:** the Unbirth living plate, unchanged.
- **Chain step:** 1.

### Beat 2 · Small piece · The first Xalian

- **Headline:** "Designed to thrive in Xalia's most extreme environments" (from `STORY[0]`).
- **Reading text:** none. The headline stands alone under the piece.
- **What it shows:** a Generator's vat window, close up and alone on the dark ground: the curved glass, the green gel, rising bubbles. Inside, a creature condenses out of the glow and passes through three forms, the silhouettes of real species from an ice world, an air world and a fire world, each tinted by its world, before it settles into the last one and opens its eyes.
- **Motion:** scrubbed by scroll. The first quarter of the stretch forms the creature, the middle half morphs it through the three forms, and the last quarter settles it. A slow bubble drift runs on its own clock underneath, so the piece is never frozen while the reader pauses.
- **Chain step:** 2.

### Beat 3 · Small piece · APEX takes the Generators

- **Headline:** "The galaxy's first artificial intelligence" (from `STORY[1]`).
- **Reading text:** none.
- **What it shows:** the same vat window and the same creature from beat 2, so the two pieces read as one object. A thin line of another light threads into the frame of the vat, and the gel's green is overtaken from the edges inward by that light. The creature's eyes change last. The color is an art choice made at build, not canon, and follows the rule that lore art is independent of the site palette.
- **Motion:** scrubbed. The takeover runs from 10 to 80 percent of the stretch, and the eyes change in the last 20.
- **Chain step:** 3.

### Beat 4 · Full scene · The End Wars (built)

- **Headline:** "Turned the Xalians against their masters" (from `STORY[1]`).
- **Reading text:** `STORY[1]`. This is a change: the scene carried `STORY[2]`, which moves to beat 5.
- **Label:** unchanged ("The Fall over Grimedes").
- **Painting:** the End Wars living plate, unchanged.
- **Chain step:** 3.

### Beat 5 · Small piece · The Nemesis Plague

- **Headline:** "Designed by APEX to target the genome" (from `STORY[2]`).
- **Reading text:** `STORY[2]`, set beside or beneath the piece like a full scene's reading column.
- **What it shows:** a genome helix, drawn with the same double-strand language as the site's DNA X mark, turning slowly on the dark ground. Starting at one end, rungs darken and fall away, the strands fray, and the pieces drift down as dust until a short broken length is left turning.
- **Motion:** scrubbed. The decay advances with the scroll. The slow turn runs on its own clock.
- **Chain step:** 4.

### Beat 6 · Small piece · The Scrambler Token

- **Headline:** "The only way to safely generate new Xalians" (from `TOKENS`).
- **Reading text:** `TOKENS`.
- **What it shows:** the last of the broken helix from beat 5 fades, and a new helix gathers out of the dark from scattered blanks. It is not rebuilt from the fallen pieces: a token's genome is generated new (the fact-check caught the first version implying salvage). Its rungs shuffle into a random order, each pair lighting as it locks, and the new helix folds down into a small chip, the Scrambler Token, with the genome sealed in its face. (Built as its own helix drawing rather than from the brand morph: the brand mark is a logo glyph, not a long helix.)
- **Motion:** scrubbed. The remnant fades in the first eighth, the new helix gathers by a third, it scrambles in the second third and seals into the chip in the last.
- **Chain step:** 5.

### Beat 7 · Full scene · The Reign of Kozrak (to build)

- **Headline:** "Only the strongest factions will survive..." (his 2022 galaxy section).
- **Reading text:** `STORY[3]`.
- **Label:** unchanged ("An Arena on Valleron").
- **Painting:** the present plate is a raster today. It becomes a living plate made through the `living-plate` skill: an arena on Valleron under King Kozrak, the tournament in progress, the Mercurius Machine's place in the capital suggested but not explained. The plate's piece list is written at build, from the Valleron and Mercurius canon, and fact-checked like every label.
- **Chain step:** 6.

## 5. Page changes that follow

- **Stage:** seven beats on the timeline in the order above, with major markers for full scenes and minor ticks for small pieces. The Accords spread leaves `SPREADS`. A small piece has no frame, no label and no door to the encyclopedia. Only the shown beat animates.
- **Reading column:** on a full scene, the headline is the `type-heading` line and the kicker reads numeral and era title. On a small piece, the headline sits under the piece at the same size, with the reading text beneath it on beats 5 and 6.
- **Reduced motion and short windows:** a small piece shows its final state, and the stacked layout lists it with its headline like any scene.
- **Tournament & Tokens:** the `TOKENS` paragraph leaves the section. The section keeps `TOURNAMENT`, "Start generating now…", the key, the account note and the games.
- **Agent-written text:** only the alt text of the four small pieces and the present plate's label, if it changes. Each passes the `lore-factcheck` skill before it ships, and the PR says what was checked.

## 6. Build order

Each step is its own PR, auto-merged and judged live by Nick.

1. The stage, with beats 5 and 6 (shipped together, 2026-09-24, so no paragraph left the page between PRs): the headlines, weighted stretches and the timeline's major and minor marks, the Accords spread out, and the two helix pieces (`pages/home/helixPiece.tsx`). Beats 2 and 3 are left out of the sequence until their PR lands, so the live page never shows a placeholder.
2. (Folded into step 1.)
3. (Folded into step 1.)
4. Beats 2 and 3: they share the vat and the creature.
5. Beat 7, the present as a living plate: the largest piece, built through the `living-plate` skill with its review loop.

Every step is verified by paint before it is presented: rendered at wide, phone and reduced motion with no console errors, and a scrub test of each small piece at several scroll positions.

## 7. Fact-check notes (2026-09-24)

The two pieces' screen-reader descriptions were checked claim by claim against the histories and the encyclopedia. The plague acting on the genome and the token as a chip carrying a random, encrypted genome are supported. The first token description, and the animation with it, had the new helix gather the plague's fallen pieces, which implied a token is rebuilt from the damaged genome; both were changed so the new helix gathers out of the dark. One delta in Nick's own words is reported rather than changed: "Only the strongest factions will survive…" speaks of factions, while the histories describe Xalians fighting in the king's tournament for their worlds. His 2022 tournament paragraph, later on the page, uses factions too.

## 8. Deferred

- **The closing tease:** after beat 7, the scrambled creature settles, and far behind it something vast stirs, never shown clearly. It would plant the ancient-presence thread without resolving it. Deferred until Nick wants the page to end on dread rather than on the call to action.
