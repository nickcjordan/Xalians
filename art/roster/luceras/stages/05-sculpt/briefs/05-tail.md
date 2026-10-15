# Luceras stage 5, part 5: the tail (build B-e6bc)

You are the builder for the tail of Luceras, stage 5 of the Xalians creature pipeline. You are one of two builders working on this creature at the same time: another builder is fixing the hind paws right now on a copy of the same file. You must not touch anything but the tail, and you deliver the tail as a region delta that the orchestrator applies to whichever paw build is approved. The orchestrator (Claude) reads your pass and sends back defects; Nick (the art director) judges only whether the tail reads as the shaved clay's tail.

This part is: the tail from its root on the rump (a declared blend band where it leaves the body, between the tail root and the hip region) to its tip. Luceras has a "whip tail longer than the body, ending in a spiked plume" (species record). The plume is fur and comes in the surface stage; shaved, the tail is a long lean whip. Not this part: everything else (head, neck, trunk, legs and paws are approved or being built elsewhere).

## Inputs (blob store C:\dev\art-data\pipeline\blobs\<first two hex>\<sha256>; copy each to a named file with its extension; WSL sees C:\ as /mnt/c/)

- Base: hind-leg pass 1 file 0fffa66c7806c08ec385251af235505d224c2e8305b09ce7804850d9f0fab507 (also C:\dev\art-data\pipeline\codex-stream\luceras-hindlegs\pass1\hindlegs.blend). Whole creature bound to the 40-joint armature; meters, facing -Y, +X is the creature's left, origin at the ground point. Tail joints tail_01 to tail_06 from (0.0, 0.307, 0.502) at the root through (0.0, 0.378, 0.417), (0.0, 0.429, 0.350), (0.0, 0.493, 0.297), (0.0, 0.573, 0.276), (0.0, 0.651, 0.299) to the tip (0.0, 0.698, 0.365). The tail socket for the plume sits at the tip.
- Shape authority: shaved clay side d265b6fcbff2e1f3fdd994590fd8b884eca9397680c871d8ccfc3d9d6aec8ec9, three-quarter 352833b55a8c0f986f76f81e9c5d9389bfc2849a99ff4161507a78c920a40b99, front bc153b786d965458e78dab459cc8a9e6027a66b67dc3a38d58e61bccba570981. What the clay shows: a thick root that leaves the rump high and smoothly (no step or pinch), tapering steadily along its whole length to a fine point, laid in a long low curve that droops, runs back near the ground line and lifts at the end into an upward hook; the tail is longer than the body from chest to rump.
- Furred side for where the plume will sit: 8a78d9128f7aebb5c291f60cb70e0cfbec928fa357d1a91dff1eba27746286f9. Combined look, reference only: 56269a7be56c4020a23c08838c8eb84c5a9ac70730ada74c94db8ed04b8c5529.

Rulings in force (sourced): model shaved, fluff and the plume come from the fur stage (Nick 2026-10-13 and the stage 2 plume pick); the blockout proportions are approved (Nick, stage 4, 2026-10-14). Holds, inferred by the orchestrator (lift one if it blocks you and say why): tail joint positions unchanged; tail length along its centerline within 5 percent of the base; every vertex outside the tail and its declared root band unmoved, measured; topology outside the tail unchanged (no remesh outside the tail).

## Method

The tail is a precise tube along the joint chain: build it by editing the existing tail vertices in place where the topology allows (smoothing out reconstruction lumps, setting the cross-section radius along the length to a smooth taper measured from the clay side view, and reshaping the root blend), keeping the vertex count and order of the body unchanged. Only if the existing tail surface cannot carry a clean taper may you rebuild the tail region; then say so, keep the cut inside the tail band, and still deliver the delta format below by rebuilding only that region. Measure the clay tail's thickness at the root, at a third, at two thirds and near the tip as a fraction of the clay rump height, and match those fractions on the build.

## Self-review (as in every brief)

After every iteration, render the tail cameras, compare with the clay crops side by side, and write in iter_notes.json what still reads wrong and the change you will make, with numbers (thickness fractions, curve height). A change only counts if it is visible at the tail camera at 1024 px. Never a bare "accept" in the checks.

## Conventions (pinned)

- Blender 5.2.2 in WSL (`/home/njord/.local/opt/blender-5.2.2-linux-x64/blender -b --factory-startup --python-exit-code 1 <file.blend> --python <script> -- <args>`, --python-exit-code before --python, LF line endings). Every Blender launch through the slot lock with your own owner tag: from WSL `python3 /mnt/c/dev/src/xalians-creature-pipeline/art/pipeline/slot/slot.py run blender --wait 3600 --owner "codex B-e6bc tail" -- <command>`. The other builder holds the same lock; you will queue behind it at times. Never poll Blender yourself, never give up on a wait.
- Tooling into the pipeline: `art/pipeline/sculpt/build_tail.py`, `art/pipeline/sculpt/tailcam.py` (modeled on `torsocam.py`), `art/pipeline/sculpt/run_tail.sh` (modeled on `run_torso.sh`), and `art/pipeline/sculpt/apply_region_delta.py` (see the delta below) in the worktree C:\dev\src\xalians-creature-pipeline. Reuse `sculptkit.py` and `art/pipeline/roster/lookdev.py`; you may add helpers to sculptkit.py but not change existing ones. Do not edit `build_hindlegs.py`, `legcam.py` or `run_hindlegs.sh` (the other builder owns them) or any other file. No git.
- Renders: `lookdev.setup_scene(engine="CYCLES")`, the look-dev lights, ground and clay, orthographic cameras from `place_camera`. Tail cameras: side (azimuth 90, elevation 0), three-quarter rear (135, 10), top (0, 90), framed on the whole tail with the rump in view. Full body: the five standard cameras and a 192 px sprite side render. Name intermediate files `iter<N>_...`.
- Composites: build render left, clay crop right, same height, dark label bar on top, `composite_<view>_vs_clay.png`; plus `composite_full_side_vs_furred.png`; modeled on C:\dev\art-data\pipeline\claude-stream\luceras-torso\pass1\.

## The region delta (how your work joins the other builder's)

Deliver `tail_delta.npz` with two float arrays of the same length: `base_co` (the base file's body vertex coordinates for every body vertex you moved, exactly as read from the base) and `new_co` (their new coordinates), plus `meta.json` naming the base hash, the body object name and the count. Write `apply_region_delta.py`: a Blender script that opens a target file, matches each `base_co` to the target body's vertex at exactly that coordinate (tolerance 1e-6 m; the other builder's file keeps every vertex outside the paws at exactly the base coordinates), moves it to `new_co`, refuses and reports if any `base_co` has no exact match, and saves. Prove it: apply your delta to the untouched base and show the result equals your tail.blend (max distance 0). If you had to rebuild the tail region instead of editing in place, the delta cannot carry new topology: then also deliver `tail_part.glb` and a `splice` note, and the orchestrator will splice by hand.

## Deliverables, in C:\dev\art-data\pipeline\codex-stream\luceras-tail\pass1\

1. tail.blend (the whole creature with the new tail), tail_delta.npz, meta.json, tail_part.glb, delta_proof.json.
2. Renders: the three tail cameras, the five full-body cameras, the 192 px sprite; the composites.
3. progress.png (three intermediate tail side renders, captioned); iter_notes.json.
4. measurements.json: tail centerline length, length ratio to the body (chest front to rump back), thickness at root, a third, two thirds and near the tip (meters and as a fraction of rump height) beside the clay's fractions, lowest point of the tail curve above ground, tip lift; displacement outside the tail band (max and mean); vertices moved; triangle count of the creature.
5. report.json: build id B-e6bc, method in order, defects named and fixed per iteration, what remains, holds respected or lifted with why, wall minutes, Blender seconds, and `checks` (title, question, before, after, reference, sprite, recommended) for: tail root on the rump, taper along the length, curve and tip, body at sprite size.

Cap 40 minutes. Plain American English, no em dashes. Nothing that costs money, no installs, no GPU jobs. When done, print the path of report.json and stop.
