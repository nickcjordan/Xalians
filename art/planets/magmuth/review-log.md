# Magmuth living planet: review log

Built from Zolton's scripts (art/planets/zolton/), keeping the world-independent machinery: the sphere sampling, the rotated-lattice noise, the wrapped blurs, the lens displacement, the night overlay, the film-rate player and the per-phenomenon switches. Facts are drawn from Magmuth's history in packages/content/json/planets.json (listed in the build.py docstring).

## Round 1

Surface: black glass spires with a violet sheen, basalt and grey ash in the lows, tar-pits, and a fissure network cut into the ground (the same canyon construction as Zolton, narrower). Lava seas: the low basins crusted over, with cracks glowing. Rivers of fire: a hot core down each fissure with a red halo, dimmer by day. Smoke: dark ash wound into a few slow storms, lit by a red-orange wash over the day side (the red dwarf). Eruptions: three vents, each on a fissure, erupting in turn, with a bright core, a spreading glow and a dark plume. Fire flashes: blooms on the fissures that fade in and out, plus surge bands running east along them. Churn: a slowly sliding mask over the lava seas.

## Round 2 (coordinator's list)

1. Land darkened to basalt #2a2224 and ash #6b5e58, lit by the red sun; the bright tones come only from glowing cracks and lava.
2. Lava seas enlarged to about 40 percent of the surface, with ragged shores; a dull molten body, bright yellow-orange seams between crust plates, and the shoreline lit. They glow on the night side as well.
3. Smoke made dark brown-grey (#3a302c to #7a6a60 on the lit tops), thinner (alpha 170 of 255) and banded in latitude for an east-west streak; plumes rise from the vents as dark blobs.
4. The vent burst is now short and orange (about 2 s), with a faint orange glow on the ground around it, and the ash plume is taller.

## What I checked

- Planet SVG parses as XML; 330 animate `keyTimes` lists start at 0, end at 1 and never decrease; every `keyTimes` list matches its `values` count.
- Demo page (demo.html, 4.5 MB): snap-page.cjs at 1366 and 390 px, zero console errors, no horizontal overflow.
- Frames at 600 px: untracked/snaps/magmuth-r1-sheet.png and magmuth-r2-sheet.png (t = 10, 25, 40, 55 s).
- 150 px and 76 px: PIL downscales of the t=25 frame, untracked/snaps/magmuth-r2-150px.png and magmuth-r2-76px.png, with a side-by-side sheet magmuth-r2-small-sheet.png.

## Known weak points

- The lit land still reads tan-pink-brown rather than near-black basalt and ash. The darker constants went in, but the day wash and the pink haze keep it warm. A next pass should lower the day tint and the haze colour, not the ground.
- The smoke is faint in the frames; the plumes and the vent burst were not confirmed in the round-2 frames, so the eruption item is not verified.
- The fire flashes and the surge are small at map size and mostly read as the fissures themselves.
- The seams and shores read well at 150 px; the sea outlines are still a little uniform.
- No downscale of the actual 150 px SVG render was made; the downscales are of the 600 px frame, as the brief specifies.

## Round 3 (orchestrator's list)

1. Land colour: sampled the lit land in the 600 px frame (untracked/snaps/magmuth-r3-t25.png). Median RGB (97, 52, 41) on the lit left, (85, 43, 33) upper-left, both inside the target box (70-110, 45-60, 40-50). The pink impression comes from the highlights (90th percentile about 133, 79, 65) and the warm haze rim. No layer was cut.
2. Lava seas rebuilt: the yellow noodle lines were contour lines of a noise field. Replaced with cellular (Voronoi) plates on the sphere: dark crust plates (surface colour #28100a with a per-plate shade), thin seams one to two map pixels wide where the two nearest plate points are equidistant, and the crust breaking up orange toward the shore. Sampled: seam pixels about 1.4 percent of the disc, median RGB (199, 143, 96); the dark crust median (82, 41, 31), lighter than the brief's (40, 15, 10) because the day wash and the surface shade lift it.
3. Eruption: the full-composite burst is small at 600 px and is hard to pick out under the bright disc. Isolated (surface and seas hidden, test SVG in untracked/magmuth-erupt-only2.svg): burst from about t=7.4 s, a dark plume rising from t=8.0 s. Sheet: untracked/snaps/magmuth-eruption-burst-sheet.png. Full-composite 8-frame sheet: untracked/snaps/magmuth-r3-burst-sheet.png.

## Still weak after round 3

- Crust reads lighter than the brief's dark target because of the day wash.
- The vent burst is small in the full composite; it needs a larger, brighter ember or a longer glow to read at 600 px.
- The plume is thin in the isolated frames.
