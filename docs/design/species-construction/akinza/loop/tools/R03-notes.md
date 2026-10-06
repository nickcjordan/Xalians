# R03 tool (finish_fan_assembled.py), session 1 notes

continue. The tool is built and runs as a post step; it is not reader-checked and the smoke checks are incomplete.

## What exists
- `art/species-construction/finish_fan_assembled.py` (Blender, post step A-fan) and `fan_lock_sweeps_assembled.py` (copy of fan_lock_sweeps_v3.py: cup carve and tuft off by default, a per-column `weight` that blends the edited crop back into the input crop). Spec `specs/r03_fan_assembled.json` (v3h levers plus voxel, coarseVoxel, window{uMin,yMax,cupMargin,cupInflate,sliver,seamBlend,patchMargin,paleTol,cropPad}, mode). Reused: the face tool's zipper and boundary-loop helpers (copied), the v3 lock sweeps, the v3h spec.
- Starter `recipes/tool-R03.json` (baseline recipe plus A-fan after the assembly), tools record `tools/R03.json` (ready false), check plan `plans/tool-check-R03.json`.
- Candidate assembled-2812 (packet in untracked/species-construction/akinza/loop/packets/assembled-2812) passes `loop_tools check`; A-fan took 8.3 min on a shared machine (about 110 s alone), 2.08M skin vertices.

## Design change from the method (say so in the review)
The method excluded each cup polygon plus .006 from the window. That makes the replaced region an annulus whose coarse and fine hole loops do not pair: the thin cup wall at the cup tip pinches the coarse loops (9 coarse against 8 fine loops, and inflating the exclusion made it worse). The tool now replaces every depth of the whole window (an axis box in head-local x and z, one loop per wing, pairs cleanly, zipper bridges verified manifold) and protects the cup and pale tuft by giving the edits weight 0 inside the measured cup hull plus cupMargin. The cup and tuft surfaces are therefore resampled from the .004 coarse level set at the fine voxel but not edited; the pale material is carried to fine polygons by distance to the old pale polygons (paleTol).

## Open defects (compare m04 with assembled-2811)
1. A straight vertical step at the window's inner edge (u .09) on both wings in the head-top view; the edit fade (seamBlend .03) or the strip start (strip.u .085 to .10) leaves a visible edge. Try uMin .075 (the strip then starts inside the fade) and seamBlend .05, or fade the strip weight with the window weight.
2. The lower fan edge reads as a fringe of needles (v3h tips at the .0016 voxel are sharper than the baseline). Sweep tips.leafA, tips.leafB, section.widthScale, layers[].lengthScale.
3. Figure height changed from .8973 to .8937 world (I09): the strip lowered the wing tops near the crown; check the ceiling and strip.yBlend top rows.
4. Build time and size: voxel .0016 gives 135M voxel crops; .0008 needs tiles.
5. Smoke checks not run: `recipe.py contain`, `loop_tools.py quick` against the baseline, `seam_check.py`, one sweep (sweep does not handle post steps; use plan variants with `set` edits on A-fan, `spec:` paths).
6. The reseal of the crinkled tuft and cup-wall seams (method) is not built; the tuft is only resampled.
7. When A-face is in the chain, this window overlaps the R02 face tool's window (|x| under .33 head-local) between x .29 and .33; A-fan runs after it and resamples that sliver at the .004 coarse level set.

## Next step
Fix 1 to 3 with direct `--p` runs: copy the assembly's akinza.glb, akinza.blend and assembly.json into a fresh out dir (source-snapshot is created fresh, so the out dir must be new each run), then `python art/species-construction/loop/loop_tools.py blender --log x art/species-construction/finish_fan_assembled.py -- --asm <asm> --out <out> --p window.uMin=.075`. Then run the smoke checks, update tools/R03.json and return the check plan.
