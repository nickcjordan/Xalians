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
| 6 | Beat 2 names no world. A first-time visitor does not know one world from another; the worlds are told by their look (storm, lava, ice, sea). The label says each world had its own Generator, so the passing worlds read as a montage and not one machine serving many. | 85%, Nick agreed to go general | conversation 2026-09-28; the 2026-09-27 fact-check (one Generator per world) |
| 7 | APEX is a signal, not a thing: a see-through lattice with scanlines over many Generators, linked to them by dashed data lines. Nothing hangs over a single machine and nothing physically grips it. Its name appears once, small, beside it. | 90%, Nick's ruling | conversation 2026-09-29 ("I don't want it to look like the orb is a physical thing hovering over the generator") |
| 8 | APEX's arrival is dramatic: a power dip, a pull-back to many Generators, the lattice resolving out of interference, a closing vignette. | 85%, Nick asked for more drama | conversation 2026-09-28 |
| 9 | Under APEX a machine stops reading its world and its seeds line up and pulse together: APEX controls the machines. Nothing marches out as an army; turning the Xalians against their masters is beat 4's story. | 85% | conversation 2026-09-28; `STORY[1]` |
| 10 | Figures draw on one canvas over the viewer's box (the figure stage), so one figure can run on from one beat into the next without being cut by the change. Each beat still renders its own place for the figure (`[data-figure-slot]`), which carries the screen-reader description. | 80% | `figureStage.tsx` |

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
