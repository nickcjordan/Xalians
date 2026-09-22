# Living plate playbook (2026-09-22)

Written for: the agent building the next living era plate on the home page, and Nick as the owner who judges each one.

## 1. Context

The End Wars panel on the home page is a living painting: the raster era plate recreated as stacked SVG layers with raster surface sheets and subtle animation (`components/plates/livePlate.tsx`, `public/assets/plates/end-wars/`). It took about seventeen independent review rounds and a dozen owner corrections to get right, and most of the rework came from the same few mistakes. Nick asked for the remaining four home plates (Unbirth, Accords, Present, Generation) to be built with as little rework as possible. This document is the process, the rules and the per-plate briefs that make that possible. Read it end to end before drawing anything.

## 2. Assumptions and decisions

| # | Assumption / Decision | Confidence | Supporting evidence |
|---|---|---|---|
| 1 | Each plate's source lives in the repo at `art/plates/<era>/source.html`, not in a session scratchpad. The End Wars source spent its whole life in a temporary folder and would have been lost with the session. | 95% | `art/plates/end-wars/source.html` |
| 2 | The site fragment is always exported, never edited by hand: `python scripts/plates/export-plate.py <era>`. | 95% | `scripts/plates/export-plate.py` |
| 3 | The two surface sheets (paper and brush strokes) are shared by every plate from `art/plates/_textures/`; a plate may darken or mask them differently but should not need new ones. | 80%, the sheets are neutral grain, not subject matter | `art/plates/_textures/` |
| 4 | Each plate is authored at its painting's 2:1 viewBox (1536 by 768) with the raster painting as its poster. End Wars changed its panel to 2:1; the other panels are 21:9, 4:5, 4:3 and 16:9 by design, so those plates set `preserveAspectRatio="xMidYMid slice"` on every layer to crop like the poster's `object-cover`, and keep every important piece inside the crop. Changing the spreads' aspects instead is Nick's call. | 75%, the crop is untested on a living plate | `pages/home.tsx` (`ART`, panel aspects); `docs/design/home-story-page-brief.md` section 3 |
| 5 | More than one living plate on the page is acceptable because each plays only while in view and pauses off screen; the spreads are far enough apart that at most one is normally visible. Measure it when the second plate lands. | 70%, not yet measured with two | `livePlate.tsx` IntersectionObserver |

## 3. The process, in order

The End Wars plate went wrong most often when a step here was skipped. Do them in order and do not start drawing before step 2 is written down.

1. **Copy the skeleton.** Start `art/plates/<era>/source.html` from the End Wars source: keep the page shell, the definitions block, the layer structure, the surface sheets, the controls script and the notes; delete the End Wars content inside the layers.
2. **Write the piece list before drawing.** Study the reference painting (`public/assets/img/lore/eras/<era>.jpg`) and write, as comments in the source, every object in it: what it is in the world, where it sits in depth, what light falls on it, and whether and how it moves. The section 10 briefs are the starting point. Every element you draw must trace to a line in this list; anything that does not is decoration and gets cut. The End Wars beam, the floating mast, the orphan tower flank and the stripe on the hull were all pieces nobody could have named.
3. **Block in the static layers at full frame**, darkest to lightest, far to near. Judge at the size the site shows it (about 1160 pixels wide), not zoomed in.
4. **Add motion last, one system at a time**, following section 5.
5. **Run the piece audit** (section 7) and fix every piece that fails alone or in context.
6. **Run the reviewer loop** (section 8) until the reviewer finds nothing worth a round.
7. **Export, wire the panel, verify on the page** (section 9), open the PR with auto-merge.

## 4. Composition rules

- **Designed shapes, never traced ones.** Build every object from clean geometry that describes what it is: a spire is faces and ribs, a ship is hull sections, a bunk is a frame and a mattress. Never run a displacement filter over architecture; it reads as melting.
- **Fill the depth.** Foreground, middle distance and far distance each need their own layer of content, and the middle distance must be large and contrasty enough to read at normal size. The End Wars plate had nothing between its foreground and its skyline until Nick pointed it out, and the first fix was too faint to notice.
- **Fill the width.** A city, a crowd, a landscape runs to the edges of the frame. Content that stops short of the edges implies it exists only where the camera is looking.
- **Nothing ends in the air.** Every road reaches an edge or a building; every bridge lands on a road; every mast stands on a roof; every pipe starts somewhere. Before finishing, walk each linear element to both of its ends.
- **Distance is haze, not a cut.** Anything receding (a river, a corridor, a road) dissolves into mist or darkness at its far end. A hard edge where two planes meet reads as the picture stopping.
- **Aerial perspective carries depth.** Each row back is smaller, paler, lower in contrast and has fewer and dimmer lights.
- **One coherent light.** Name the key light (the blaze, the portal, the furnace) and light every face from it; rim-light the edges that face it and let the shadow side go dark. A glow that has no source is a bug.
- **Layer order is depth order.** Before adding anything that spans the frame (fog, haze, washes), decide which layer it lives in; the End Wars ground fog once painted over the mid towers because it was drawn after them.

## 5. Motion rules

- **Every animation starts mid-cycle.** Use negative `begin` values only. A positive begin leaves the element in its resting state until it fires, and the reduced-motion still frame is that resting state.
- **Nothing teleports.** Anything that moves and repeats fades out before the end of its path and in after the start.
- **Constant speed for things in flight.** Projectiles, cars and debris in free flight move linearly; debris that falls uses a gravity ease (`.4 0 1 1`). Never ease a bolt's travel.
- **Noise moves by offset, never by rescaling.** Never animate `baseFrequency` (it slides the texture toward a distant origin) and never step `seed` (it reshuffles the outline several times a second). For flame, water or smoke, drift two noise fields with `feOffset` and crossfade them with `feComposite operator="arithmetic"` so each resets only while its weight is zero; use linear crossfade weights for anything that flows continuously.
- **Displacing a smooth gradient is invisible motion.** Water needs a thresholded streak-noise glitter mask to show movement.
- **Match the motion to the thing.** Flames lick fast and sag slowly (keyTimes `0;.22;.55;1`). Cores and lamps pulse on uneven multi-key patterns on 2 to 3 second clocks. Detonations flash and die. Obstruction lights blink. Failing power stutters. Nothing pulses in lockstep with its neighbor.
- **Speed cues must agree.** Something that holds still in the frame cannot shed fast sparks; the End Wars bow sparks implied a speed the ship did not have.
- **Subtle first.** The anti-air fire landed at the right strength only after it was cut to about two thirds of its first size. Start smaller than feels right.
- **Dashed-stroke streaks are a trap.** If a moving streak is ever needed, animate a shape along a path with `animateMotion rotate="auto"` instead of sliding a dash; dashes make hard starts, phantom repeats and speed changes.

## 6. Performance rules

- Stack the plate as separate inline SVG layers sharing one hidden definitions SVG. Static layers paint once, so their filters are free; only animated layers repaint. Keep animated elements out of static layers.
- Surface sheets are HTML overlay divs with `mix-blend-mode: overlay` over the whole stack, because a blend inside an SVG only sees its own layer.
- Measure in headed Chrome with the GPU (`scripts/plates/measure-gpu.cjs`), always against the previous version in the same run. Headless numbers are meaningless, and absolute numbers drift with machine load; the comparison is what counts.

## 7. The piece audit

`node scripts/plates/pieces-audit.cjs <absolute path to source.html>` tags every commented piece and every shape inside the major groups, renders each one alone on a neutral ground and again in its surroundings with an outline, and writes contact sheets to `untracked/snaps/pieces/`. Read every sheet. For each piece ask: what is this, is that what it reads as, and does it touch what it should touch. This is the check that found the floating mast, the searchlight beam, the debris perched on spire tips, the pipe starting in the river and the slab floating in the water, none of which a full-frame look or a reviewer round had caught.

## 8. The reviewer loop

Resume or start an Opus reviewer subagent with a brief that names the file, the capture tools and the owner's concern for the round, and asks for ranked findings with concrete fixes and a score. Implement what it ranks, deviate only when a render shows its suggestion fails, and say so. Stop only when the reviewer finds nothing worth a round, not when the findings feel marginal. The reviewer judges pixels; it does not know intent, so the piece list from step 2 stays your job.

Capture tools, all under `scripts/plates/` (outputs in `untracked/snaps/`; create the folder first):

| Script | Use |
|---|---|
| `snap-zoom.cjs <file> <name> [x y w h ...]` | full frame, or zooms in plate units |
| `snap-time.cjs <file> <name> x y w h t1 t2 ...` | frames at given times, for motion |
| `snap-layer.cjs <file> <name> <layer ids or all> [x y w h]` | one or more layers alone |
| `pieces-audit.cjs <file>` | every piece alone and in context |
| `measure-gpu.cjs <file> [file ...]` | headed GPU frame rate, compare versions |
| `snap-home-plate.cjs` | the panel on the running dev server (port 3012) at desktop, phone and reduced motion |
| `gen-texture.cjs <out dir>` | regenerate the surface sheets if ever needed |

## 9. Shipping a plate

1. `python scripts/plates/export-plate.py <era>` writes `public/assets/plates/<era>/`.
2. In `pages/home.tsx`, add `live: '/assets/plates/<era>/plate.html'` to that era's entry in `ART`. If the panel is not 2:1, the layers must use `slice` (assumption 4); check that the brush-stroke sheet, which is sized to the panel, does not visibly stretch, and that no poster shows at the edges.
3. Start the dev server on 3012, run `snap-home-plate.cjs`, and confirm the plate is ready, plays in view, pauses off screen, and has no console errors at both widths.
4. Publish the source to the review artifact if one exists, open the PR from a fresh branch off main, and enable auto-merge.
5. Update the page's text in the source (the kicker line and notes) whenever the plate changes; the End Wars page carried a stale "pass" label for many rounds.

## 10. Per-plate briefs

Each brief is the starting piece list for step 2, read from the reference painting. Verify it against the painting before drawing; add what it misses.

### Unbirth (`unbirth.jpg`, spread 1, panel 21:9)

A vaulted underground ward seen straight down its axis. **Key light:** a cold blue-white ring of light around the great vault door at the far end, plus one pendant lamp hanging from the crown of the vault. **Pieces:** the barrel vault of worn stone blocks with a pipe run along each spring line; the circular vault door with its riveted rings, four radial locking bars with bolt heads, and the round hub; the ring of light leaking around the door's rim; the pendant lamp on its cord; flagstone floor in perspective; two rows of iron-framed bunks with pillows and sheets receding toward the door, one sheet stained; plaster walls with patches of warm and cool light. **Motion, all subtle:** the ring of light around the door breathes slowly and unevenly; the pendant lamp sways a few degrees on a long clock with its light pool following; dust motes drift in the lamp's cone; one bunk's sheet stirs once in a long while as if from a draft under the door. **Watch for:** the panel is 21:9, not 2:1, so decide whether the plate is authored at 21:9 or cropped; the bunks must sit on the floor with contact shadows; the vault must recede into the door's glow rather than end at it.

### Accords (`accords.jpg`, spread 2, panel 4:5)

A tall pylon on a mountain summit drawing power from a storm. **Key light:** the three vertical white beams linking the storm to the ground, and lightning. **Pieces:** a vortex of storm cloud in painterly swirled masses, brightest at its center above the pylon; the thin pylon rising from a dark machine base on the summit; three straight beams, one down the pylon and two to the slopes either side; branching lightning on left and right reaching down to the ridges; dark angular mountain ridges framing the valley; violet-grey sky. **Motion:** the cloud vortex turns very slowly; the beams hum with a faint uneven flicker along their length, never a strobe; lightning strikes are rare, fast and branch in over a few frames, flash once and fade with an afterglow on the ridges; a faint glow pulses at the base of the pylon. **Watch for:** the panel is portrait 4:5, so author for the crop; lightning must end on a ridge, not in air; the beams need a soft glow falloff, not hard white bars; flashes must be brief and infrequent enough to stay subtle.

### Present (`present.jpg`, spread 4, panel 4:3)

An empty circular stone amphitheater, a court or council chamber, with a copper disc set in its floor. **Key light:** warm light reflected off the copper disc into the chamber, and a cold wash from an opening high above. **Pieces:** tiers of stone benches curving around the floor, broken by stairs; a tall curved wall of stone panels behind; a pale ceiling edge at the top; the flagstone floor with radial joints; the large copper disc with a raised rim, radial seams and a central boss, glowing warm. **Motion, minimal:** a slow warm shimmer across the copper, as if lit by something unseen; motes drifting in the cold light from above; the light on the wall shifting a little over a long clock. **Watch for:** this is the stillest plate and should stay so; the tiers must follow the same ellipse consistently; the disc's reflection must fall on the nearby floor and bench faces.

### Generation (`generation.jpg`, the Tournament and Tokens spread, panel 16:9)

An industrial plain of forges and smokestacks with a channel of molten metal running from the horizon toward the viewer. **Key light:** the molten channel, hot yellow at its core to red at its edges, lighting the pipes and building faces along it. **Pieces:** the molten channel in perspective, walled, glowing; heavy pipes running along both walls and turning away at right angles; rows of long low factory halls with small windows on both sides; tall banded smokestacks, largest near, receding in rows on both sides; smoke plumes from every stack leaning with the same wind; a flat dark wasteland with slag heaps to the horizon; pale overcast sky. **Motion:** the molten channel flows toward the viewer, done with the two-field crossfade and a bright glitter crust, never a sliding texture; smoke rises and leans from each stack on its own clock using drifting noise, not rescaling; heat shimmer above the channel; an occasional flare of sparks from the channel's edge. **Watch for:** the channel must recede into haze at the horizon, not end at a line; the smoke must all lean one way; the halls, stacks and pipes must fill the frame to both edges and sit in rows consistent with the channel's perspective.
