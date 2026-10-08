# Living planets: builder brief

You are building one animated SVG planet for the galaxy map on xalians.com's home page. The owner approved the first one, Zolton (`art/planets/zolton/`), as the quality bar. Your planet must reach the same bar: it should read at a glance as its world, from its written history, at 600 px and still at 150 px and 76 px.

## Start from Zolton, do not start from nothing

Copy `art/planets/zolton/` to `art/planets/<world>/` (not `out/`, `demo.html`, `planet.svg`, `__pycache__`) and change it. Read all three Python files first, and `art/planets/zolton/review-log.md` end to end: it records every mistake the first planet made and how each was fixed. Keep what is world-independent:

- the sphere sampling (`CX, CY, CZ`, `S(k)`), `rnoise`/`fbm` with the per-octave rotated lattice (an unrotated lattice leaves horizontal creases), `pct`, `smooth`, `swirl`, `wblur` (every blur of a map must wrap east to west, or a vertical seam shows);
- the lens (`lens.png`, dithered, softened by `feGaussianBlur stdDeviation 1` inside the filter), the night overlay and night mask, the air rim, the limb hairline;
- `strip`/`spin`/`tiles` with the `PAD` wrapped columns, `full_at`, the film-rate (20 fps) player in `demo.py`;
- relief shading: the sun is upper left, so a slope is lit where height RISES to the right and down: `1 + (gx * .55 + gy * .45) * k * K`. Zolton had this backwards for three rounds;
- one switchable group per visible phenomenon, each with its own checkbox on the demo page, so a merged layer never vanishes with a neighbor.

Replace what is Zolton's: the surface, its emissive layer, the weather, the signature events, the colors, the clocks, the page text and the docstring's fact list.

## Rules

- Draw only what the world's history says. Put each fact you draw in the build.py docstring with a short quote from `packages/content/json/planets.json` (read it with `node -e`). No invented landmarks.
- No game mechanics, no labels, no text on the planet.
- Every `keyTimes` list starts at 0, ends at 1 and never decreases (a value past 1 is silently rejected by Chrome). Check every animation after each build with a script, not by eye.
- Clocks never line up: give every repeating thing its own odd period and its own `begin` offset.
- Nothing pops: every flash fades or steps on a reason; nothing appears in clear air that belongs in cloud.
- Lightning, fire and glow are drawn in map units inside the spinning, lensed group so they ride the surface; anything that should be hidden at night goes under the night overlay; anything that makes its own light goes above it with `mix-blend-mode:screen`.
- Keep the page under 5 MB and the map-size planets (150 and 76 px) built from 1024-wide maps.
- Python and numpy only for textures (scipy is available). No downloaded images.

## Verify by pixels, every round

Render and LOOK at the images before you report:

- `node untracked/tools/snap-svg.cjs C:/dev/src/xalians-outbreak/art/planets/<world>/planet.svg <world>-r<n> 600 t1 t2 t3 t4` writes paused frames to `untracked/snaps/<world>-r<n>-t<t>.png`. Pick times that show each signature event and both sides of a full turn.
- `python untracked/tools/sheet.py untracked/snaps/<world>-r<n>-sheet.png 2 1200 <images...>` makes a contact sheet; open it with the Read tool.
- `node untracked/tools/snap-page.cjs C:/dev/src/xalians-outbreak/art/planets/<world>/demo.html <world>-page` renders the demo page at 1366 and 390 and prints console errors; there must be none.
- Downscale a frame to 150 and 76 px with PIL and look at those too.

## Report

Write `art/planets/<world>/review-log.md` (what you drew and why, from which quote; what you checked; what you know is still weak). In your final message give: the files you made, the frames you looked at (paths), every check you ran and its result, and an honest list of what still looks wrong. Do not claim something looks right unless you opened the image.

## The worlds

**Magmuth (Fire).** From its history: "boiling oceans of lava and molten rock pocked with obsidian islands and jagged spires of volcanic glass"; "orbits a red dwarf star, bringing hellish heat"; islands of "hardened lava flows ... obsidian and basalt filled with fields of ash and bubbling tar-pits"; "Almost everything on Magmuth is covered in a thick layer of ash, and the cracks in the earth glow an eerie red from the magma"; "The acrid air is thick with volcanic smoke, staining the sky crimson"; "Rivers of fire flash across the wastes"; "violent ash storms"; "Erratic volcanic eruptions create pyroclastic flows". Its sun is a red dwarf: the day side is lit red-orange, not white. Night side: lava seas and cracks glowing. Weather: drifting ash and smoke plumes, not white cloud. Signature events: a volcano erupting (a bright plume and a spreading glow), rivers of fire brightening across a crack network, lava seas slowly churning.

**Saiphus (Air).** From its history: "A hydrogen-helium gas giant"; a "thin life band in its upper atmosphere" where "islands of floating landmass appear to hover across the sky. Separated by a sea of clouds and dense fog"; islands "range in size from little more than flying boulders to landmasses that are hundreds of miles across"; "Sulfuric acid clouds sweep haphazardly across the sky"; "violent and relentless storms"; "savage gravel-storms". It is a gas giant: banded atmosphere (zones and belts flowing at different speeds, with turbulent eddies where they shear), no solid surface. The floating islands are tiny at planet scale: specks and small flecks of land in the life band, best seen as a scatter of small dark-green and brown fleck clusters drifting in one band with cloud between. Weather: yellowish sulfuric acid cloud sweeps; storms as eddies. Signature events: a storm flaring in a shear zone, lightning in it, islands drifting slowly against the band.
