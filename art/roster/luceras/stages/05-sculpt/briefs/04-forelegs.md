# Luceras stage 5, part 4: the forelegs above the paw (build B-t5qe)

You are the builder for the forelegs of Luceras, stage 5 of the Xalians creature pipeline. Another builder is fixing the hind paws at the same time on a copy of the same file, so you touch nothing but the forelegs, and you deliver your work as a region delta that the orchestrator applies to whichever hind paw build is approved. The fore paws themselves (below 65 mm) are not in this part: they get the hind paw's proven method in a short follow-up pass. The orchestrator (Claude) reads your pass and sends back defects; Nick (the art director) judges only whether the forelegs read as the shaved clay's forelegs.

This part is, on both sides (build the left, mirror to the right exactly): the foreleg from the shoulder joint down to 65 mm above the ground: the upper arm where it leaves the approved shoulder, the elbow with its point behind, the forearm, the wrist (carpus) and the pastern down to the top of the paw. Not this part: the paw below 65 mm, the shoulder and trunk above the shoulder joint (approved), the head, the hind legs, the tail.

## Inputs (blob store C:\dev\art-data\pipeline\blobs\<first two hex>\<sha256>; copy each to a named file with its extension; WSL sees C:\ as /mnt/c/)

- Base: hind-leg pass 2 file 2bed33840d829d8a2c7cb57c0ccae5c2ee7a88dcdef7793ea3ee3fe22ff1acd1 (also C:\dev\art-data\pipeline\codex-stream\luceras-hindlegs\pass2\hindlegs.blend). Whole creature bound to the 40-joint armature; meters, facing -Y, +X is the creature's left, origin at the ground point.
- Foreleg joints (left, from the rig spec): shoulder (0.0428, -0.1231, 0.3876), elbow (0.0438, -0.0663, 0.2622), wrist (0.0253, -0.1027, 0.0684), toe tip on the ground (0.0382, -0.1854, 0.0100). Bones leg_fl_01 (upper arm), leg_fl_02 (forearm), leg_fl_03 (pastern and paw); right side leg_fr_*.
- Shape authority: shaved clay side d265b6fcbff2e1f3fdd994590fd8b884eca9397680c871d8ccfc3d9d6aec8ec9, front bc153b786d965458e78dab459cc8a9e6027a66b67dc3a38d58e61bccba570981, three-quarter 352833b55a8c0f986f76f81e9c5d9389bfc2849a99ff4161507a78c920a40b99. What the clay shows on the forelegs: lean, nearly straight columns, much lighter than the hind legs; a muscled upper arm that tucks under the shoulder; a clear elbow point at the back; a forearm that is fuller at the top and tapers to the wrist, with tendon lines down its front and back; a knobbly wrist with a small bump at the back; a short, slightly sloped pastern into the paw. From the front the forelegs stand close and parallel.
- Furred side, placement only: 8a78d9128f7aebb5c291f60cb70e0cfbec928fa357d1a91dff1eba27746286f9. Combined look, reference only: 56269a7be56c4020a23c08838c8eb84c5a9ac70730ada74c94db8ed04b8c5529.

Rulings in force (sourced): model shaved (Nick 2026-10-13); the blockout proportions are approved (Nick, stage 4, 2026-10-14); head and torso approved (Nick 2026-10-14, 2026-10-15). Holds, inferred by the orchestrator (lift one if it blocks you and say why): joint positions unchanged; upper arm, forearm and pastern lengths within 5 percent; every vertex outside the forelegs between the shoulder joint and 65 mm unmoved, measured (a declared blend band at the shoulder seam is allowed); topology unchanged everywhere (edit vertices in place, no remesh), so the delta can carry your work.

## Method

The leg's soft forms start from the base surface (the body reconstruction). Refine by brush work in numpy against the clay views: smooth reconstruction lumps, set the column's cross-sections to the clay's widths (measure them from the side and front clay at the elbow, mid forearm, wrist and pastern as fractions of the rump height, and match within 10 percent), and carve the landmarks the clay shows (elbow point, forearm taper and tendon lines, wrist knob and its back bump). Do not build from primitives or metaballs.

## Self-review

After every iteration, render the foreleg cameras, compare with the clay crops side by side, and write in iter_notes.json what still reads wrong and the change you will make, with numbers. A landmark counts only if it is visible as a shading change at the foreleg camera at 1024 px. Never a bare "accept" in the checks.

## Conventions (pinned)

- Blender 5.2.2 in WSL (`/home/njord/.local/opt/blender-5.2.2-linux-x64/blender -b --factory-startup --python-exit-code 1 <file.blend> --python <script> -- <args>`, --python-exit-code before --python, LF line endings). Every Blender launch through the slot lock: from WSL `python3 /mnt/c/dev/src/xalians-creature-pipeline/art/pipeline/slot/slot.py run blender --wait 3600 --owner "codex B-t5qe forelegs" -- <command>`. You will sometimes queue behind the other builder. Never poll Blender yourself, never give up on a wait.
- Your tooling, in the worktree C:\dev\src\xalians-creature-pipeline: `art/pipeline/sculpt/build_forelegs.py`, `art/pipeline/sculpt/forecam.py` (modeled on `legcam.py`), `art/pipeline/sculpt/run_forelegs.sh` (modeled on `run_tail.sh`). Use `art/pipeline/sculpt/apply_region_delta.py` as it is for your delta proof. Reuse `sculptkit.py` and `art/pipeline/roster/lookdev.py`; you may add helpers to sculptkit.py but not change existing ones. Do not edit `build_hindpaw.py`, `build_hindlegs.py`, `legcam.py`, `run_hindlegs.sh` (the other builder's) or any other file. No git.
- Renders: `lookdev.setup_scene(engine="CYCLES")`, the look-dev lights, ground and clay, orthographic cameras from `place_camera`. Foreleg cameras: side (azimuth 90, elevation 0), front (0, 4), front three-quarter (45, 10), framed from the shoulder to the ground. Full body: the five standard cameras and a 192 px sprite side render. Name intermediate files `iter<N>_...`.
- Composites: build render left, clay crop right, same height, dark label bar, `composite_<view>_vs_clay.png`, plus `composite_full_side_vs_furred.png`.

## The region delta

Deliver `forelegs_delta.npz` (`base_co`, `new_co` for every body vertex you moved, exactly as read from the base) and `meta.json` (base hash, body object name, count), as the tail part did (see C:\dev\art-data\pipeline\codex-stream\luceras-tail\pass1\ for the format). Prove it with `apply_region_delta.py`: applied to the untouched base it must equal your forelegs.blend (max distance 0), and write delta_proof.json.

## Deliverables, in C:\dev\art-data\pipeline\codex-stream\luceras-forelegs\pass1\

1. forelegs.blend, forelegs_delta.npz, meta.json, delta_proof.json, forelegs_part.glb.
2. Renders: the three foreleg cameras, the five full-body cameras, the 192 px sprite; the composites.
3. progress.png (three intermediate foreleg side renders, captioned); iter_notes.json.
4. measurements.json: upper arm, forearm and pastern lengths; widths at elbow, mid forearm, wrist and pastern (meters and as fractions of rump height) beside the clay's fractions; elbow point offset behind the joint; stance width at the wrists; displacement outside the forelegs and its declared band (max, mean); vertices moved; left-right asymmetry; topology unchanged (true or false).
5. report.json: build id B-t5qe, method in order, defects named and fixed per iteration, what remains, holds respected or lifted with why, wall minutes, Blender seconds, and `checks` (title, question, before, after, reference, sprite, recommended) for: upper arm and elbow, forearm and wrist, pastern, forelegs from the front, body at sprite size.

Cap 45 minutes. Plain American English, no em dashes. Nothing that costs money, no installs, no GPU jobs. When done, print the path of report.json and stop.
