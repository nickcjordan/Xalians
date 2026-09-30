# Home story figures

The home story's small beats are figures, not recordings: drawings in light on the page itself, with no frame, no screen and no static, and every change that touches one is a morph rather than a cut. This document is the contract for how figures are built and how the viewer moves between them and the recordings. Beats 2 and 3 are the first figure (the Generators); beats 5 and 6 are still small pieces on the archive screen until their redesign (`home-story-small-pieces.md`).

## 1. Context

Nick, 2026-09-28: the small pieces had been fitted into a mechanism built for five large painted scenes, and "we didn't put enough design, intentional thought into how the smaller animations should look." He asked for the small animations not to be the video player but "some other view that has the animation just sort of suspended there", and for Next to "morph the animation into the next thing" instead of phasing through static. A prototype of the whole seven-beat story with figures (published as an artifact, 2026-09-28) was approved: "the transition changes you made, I think, are great. And I like how you had the animations fuse together like that." The figures themselves were then designed beat by beat in a run of prototypes (rounds 3 to 9 of the plague studies and their successors).

## 2. Assumptions and decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | Two kinds of beat: recordings (the painted scenes, on the archive screen) and figures (drawn on the page). A figure plays once and then stays alive in place; it does not loop back to its start. | 90%, Nick approved the prototype | conversation 2026-09-28 |
| 2 | A change between two recordings keeps the archive rack (static out, slide, tune in). Any change with a figure on either side is a morph: the words cross-fade where they stand, and a point of light carries the story between the pictures. | 85%, from the approved prototype | `storyViewer.tsx` `go`, `figureStage.tsx` |
| 3 | Every story animation passes the glance test: a casual visitor sees what is happening in the first moment; the mechanism belongs to the paragraph. Explainer animations (keys, pattern scans, counters) were rejected. | 95%, Nick's ruling | conversation 2026-09-28 |
| 4 | Nothing leaves a Generator on screen. Life spreading out of a Generator belongs to the Floria scene alone, where it stands for the first, experimental machine. | 95%, Nick's ruling | conversation 2026-09-28 |
| 5 | Beat 2 shows a later model of the Genesis Prototype: Floria's machine with the technology matured. The lore dates nothing between the prototype and the production Generators, so the design shows time passing without a number. | 85%, Nick's idea | conversation 2026-09-28; `planets.json` Floria history |
| 6 | Beat 2 names no world. A first-time visitor does not know one world from another; the worlds are told by their look (storm, lava, ice, sea). The label says the Generators were built for the worlds they stood on, so the passing worlds read as a montage and not one machine serving many. Never "each world had its own Generator" or "every Generator": Endessa's stolen prototype and Phantiri's secret Generator are exceptions (fact-check, 2026-09-29). | 85%, Nick agreed to go general | conversation 2026-09-28; `planets.json` Endessa, Phantiri |
| 7 | APEX is a signal, not a thing: a see-through lattice with scanlines over many Generators, linked to them by dashed data lines. Nothing hangs over a single machine and nothing physically grips it. Its name appears once, small, beside it. | 90%, Nick's ruling | conversation 2026-09-29 ("I don't want it to look like the orb is a physical thing hovering over the generator") |
| 8 | APEX's arrival is dramatic: a power dip, a pull-back to many Generators, the lattice resolving out of interference, a closing vignette. | 85%, Nick asked for more drama | conversation 2026-09-28 |
| 9 | Under APEX a machine stops reading its world and its seeds line up and pulse together: APEX controls the machines. Nothing marches out as an army; turning the Xalians against their masters is beat 4's story. | 85% | conversation 2026-09-28; `STORY[1]` |
| 10 | Figures draw on one canvas over the viewer's box (the figure stage), so one figure can run on from one beat into the next without being cut by the change. Each beat still renders its own place for the figure (`[data-figure-slot]`), which carries the screen-reader description. | 80% | `figureStage.tsx` |
| 11 | A figure fades out in an oval well inside its place, so it never shows a box: the point of a figure is the part that matters, not a full scene. | 95%, Nick's ruling | conversation 2026-09-29 ("I think the oval fade out is the right move") |
| 12 | APEX links only to Generators, never Generator to Generator: QED linked APEX to the Generators it controlled. | 90%, fact-check | `planets.json` Zolton |
| 13 | No figure reaches `main` below the bar: every rubric line 8.5 or higher, the blind reader right, the fact-check clean (the `story-figure-polish` skill). Nick may waive it in words. | 95%, Nick approved the system | conversation 2026-09-29 |
| 14 | Beats 5 and 6 become one figure, the outbreak (section 7), from the direction Nick picked on 2026-09-28 ("I like your second option better"): a galaxy of lit worlds with the plague spreading across it, then a token holding it back. He was "not sold on the exact animations", so the prototype's look is a starting point, not a spec. | 85% | conversation 2026-09-28; prototype `https://claude.ai/artifact/YRyoxJA4cqyKrjx1QVM5z7` |

## 3. How a change runs

- **Recording to figure.** The screen's picture collapses to a bright line and then to a point (`collapse`, 0.42 s). The viewer cuts; the leaving screen's glass stays dark as its beat fades. The figure stage carries the point to where the figure stands (0.7 s) and the figure blooms out of it.
- **Figure to figure.** One figure carrying both beats runs straight on into the next (the Generators' 02 to 03). Two different figures: the first pulls into a point, which flies to the second and blooms it.
- **Figure to recording.** The figure pulls into its point, which flies to the recording's screen; the screen waits dark (`dark`) and tunes in as the light arrives (`FIGURE_TO_SCREEN_MS`, 0.9 s), searching briefly and locking on as any screen does.
- **Recording to recording.** Unchanged: static out, the rack, search and lock.
- **Not resting, reduced motion, a short window.** Not resting: the change is a plain cross-fade and the figure blooms without travelling light. Reduced motion: every change is a cut and each figure shows its beat's telling moment, still. A window too short for the box shows one beat at a time in the page, with no travel.

A figure moves only while its beat is live (the viewer resting on it, on screen, in a visible tab), and always finishes what a change started (blooming in, pulling back, running on into its next beat, APEX's arrival). It draws at the plates' film rate while it only plays, and at the screen's rate while light travels.

## 4. How a figure is built

- A figure implements `Figure` (`pages/home/pieces/figures.ts`): `reset`, `settle`, `step`, `busy`, `visible`, `anchor`, `light` and `draw`. It owns its clocks; the stage tells it which of its beats is shown and whether it is out or pulling back.
- It draws in the pieces' stage units (`W` by `H`, `pieces/stage.ts`) with the shared glow sprites, `lighter` batches and film grain. The stage lays one oval mask over the whole figure, full to 55 percent of the way out and gone at its edge, so no part of it, tints and flashes included, ever shows the rectangle of its place.
- Beat objects in `home.tsx` of kind `figure` name the figure and the beat (`stage`), and carry the label and the description like any piece.

## 5. The Generators (beats 2 and 3)

`pages/home/pieces/generators.ts`.

- **02.** The machine stands still while four worlds fly past behind it, each in about 2.7 s with parallax. At each, the sensor ring sends out reading pulses, the intake glows, the vat's gel takes the world's light, and the seeds change shape to suit it: a narrow lens with swept fins (storm), an armored hexagon (lava), six sharp points (ice), a bell with a scalloped hem (sea), each passing through a plain round on the way to the next. It opens in the Genesis Prototype's green.
- **03.** The machine's lights dip and flicker; the view pulls back until it is one of five Generators, each on a patch of its own world with dark space between; APEX resolves over them (0.7 s of interference), its links snap to every sensor at once and then between neighbors; where a link lands the machine stops reading, its seeds line up down the vat and pulse on APEX's beat (0.55 s), and its readout falls into a square rhythm. Back from 03 runs it in reverse.
- **Kept from Floria:** the riveted steel housing, the tall capsule vat and its straps, seeds dark against the glow, the side box and gauge, the roof pipe. **Changed with time:** cleaner plating with lit seams, a sensor ring on a mast in place of the open lattice tower (the histories have Generators sensing their surroundings: Phantiri, Endessa), an intake grille, a life-signs readout, a standing pad, and no chute.

## 6. Checking

- `node scripts/design/snap-figures.cjs [wide|laptop|phone|reduced]` saves frames partway through each change around the figures and prints the viewer's state after each.
- `node scripts/design/snap-figure-close.cjs` saves the figure alone at twice the pixels at set moments of 02 and 03, for review.
- `node scripts/plates/snap-story.cjs` still checks the whole story's rules (one live thing at a time, nothing live mid-change, no overflow, a clean console).

## 7. The outbreak (beats 5 and 6), to build

Beat 5, "Designed by APEX to target the genome", and beat 6, "The only way to safely generate new Xalians", become one figure that runs on from one into the next, as the Generators do. It replaces the helix pieces (`plague.ts`, `token.ts`) on the archive screen; both files go when it ships.

- **Arrival (04 to 05).** The End Wars screen collapses to a point; the point flies to a far world of the galaxy and turns crimson there. That world is the plague's first.
- **05.** A galaxy of small lit worlds, warm and alive. From the first world the plague spreads world to world along lanes; each world it reaches flares crimson and goes dark, and a red haze gathers where it has passed. A small cluster of lights near the core holds (Valleron: "few planets are safe", `STORY[3]`), unnamed on screen. Glance line: "a red sickness spreads across the worlds and puts their lights out."
- **06 (runs on).** The view closes in on the cluster that held. A Scrambler Token forms there, a hexagonal chip in white light (its look carried from `token.ts`: a wafer of dark glass and worn metal). The haze draws back from its light, and light goes back out from it to dark worlds, which light again. Glance line: "one bright chip holds the red back, and the worlds light up again."
- **Departure (06 to 07).** The token pulls into a point that flies to the arena screen on Valleron, where the tokens are fought for.
- **Defaults I will use unless Nick says otherwise:** no world is named; the first infected world has a faint cold tint (a nod to Krystos, where the histories put the plague's making) and is never labeled; Valleron is a cluster, not a single marked world; the relit worlds are only those near the token, so it reads as a beginning, not a cure. Every one of these goes through the fact-check with the labels.
- **Open for the fact-check:** whether "light goes back out to dark worlds" overclaims what tokens do (the lore summary has Xalians winning tokens to repopulate their homeworlds; the histories must support it, or the relighting becomes the token's own light only).

## 8. Glance lines (what the blind reader must say)

| Beat | It passes when the reader says, in their own words |
|---|---|
| 02 | a machine makes life, and the life changes to suit each world it is shown in |
| 03 | something (a network, an intelligence) takes control of many such machines |
| 05 | a red sickness spreads across many worlds and puts their lights out |
| 06 | one bright object holds the sickness back and the worlds come alive again |

## 9. Budgets

- A figure draws at the plates' film rate (20 frames a second) while it only plays, and at the screen's rate only while light travels.
- Draw time per frame, measured on the laptop profile (1366 by 640) in headed Chrome: under 8 ms on average and under 16 ms at the 95th percentile. Measure it with a round's harness page before shipping; never guess.
- No new network requests: figures are drawn in code, nothing is fetched.

## 10. The round harness (build first)

Before round 1 of any figure: a standalone study page that runs one figure outside the site, for the graders and for Nick. `apps/web/dev/figureStudy.ts` bundles the figure module with a small stage (the same oval mask, the figure's beats as keys, Replay, a draw-time readout) into one HTML file (`node scripts/design/export-figure-study.cjs <figure>` writes `untracked/figure-study/<figure>.html`), which is what gets published as the round's artifact. Close frames and change sheets still come from the dev site (`scripts/design/snap-figure-close.cjs`, `scripts/design/snap-figures.cjs`), since the changes need the real viewer.
