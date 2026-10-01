# Akinza build lineage: head-0455 + body-0448 = assembled-0458

Written 2026-10-01 from a read-only walk of `untracked/species-construction/akinza/` (a junction to `C:\dev\art-data\species-construction\akinza`), `docs/design/species-construction/akinza/rebuild-plan.json`, the rebuild logs in `C:\dev\art-data\rebuild\log`, the loop packets' `build.json` files and git history on `akinza/construction-loop`. Nothing was run or changed.

How the chains were walked: every output directory's `stage-start.json` lists the input files with sha256 and the script files with sha256. Each recorded input hash was compared with the file as it exists today, and each recorded script hash was compared with every committed version of that script (LF and CRLF forms, because the checkout has `core.autocrlf=true` and the hashes are of the CRLF bytes). All input hashes below match the current files unless stated otherwise.

Round numbers are the loop rounds (R-codes are the regions: R01 head silhouette, R02 face, R03 ear fan front, R04 ear fan rear, R05 neck and shoulders, R06 torso, R07 arms, R08 legs, R09 hind paws, R10 tails). `S` and `B` ids are the rebuild-plan steps. Short hashes are git commits.

## Root of both chains

The loop did not start from the original session outputs. On 2026-09-30 16:22 to 16:54 `run_rebuild.py` replayed the whole trunk (steps S01 to S23 and B01 to B13, plus A01 = assembled-0205) into the same data directory, and loop round 1 (17:30 onward) took `head-0204` and `body-0195` from that replay. The recorded input hashes of `head-0223` and `body-0212` match the replayed files, so the real roots are:

* Head: `docs/design/species-construction/akinza/evidence/head-clay-study-0021.png` and `face-study-0010.png`, through two Hunyuan3D-2 runs.
* Body: `evidence/body-study-0003.png` and `paws-study-0020.png`, through two more Hunyuan3D-2 runs (one on the mini weights).

Everything below that is Blender or Python scripts.

## 1. Head chain (head-0455), root first

Columns: step id in this document, output, script and the commit whose bytes the run used, input(s), parameters, produced by, whether the parameters are fully recorded. Observed time is `stage-start.json` to last output file mtime for loop steps and the runner's recorded elapsed seconds for trunk steps.

| # | Output dir | Script (repo path) @ commit | Input dir(s) / files | Parameters | Produced by | Params recorded | Time |
|---|---|---|---|---|---|---|---|
| H01 | `head-0024/input.png` | inline snippet, saved by the runner as `rebuild/S01_input.py` (shape-env python) | `evidence/head-clay-study-0021.png` | crop rect (0,120,853,653) and threshold in the step's `command` in rebuild-plan.json | rebuild S01 | yes (output hash matched) | 1 s |
| H02 | `head-full-0058` | `art/species-construction/reconstruct_shape.py` (Hunyuan3D-2 full, `--cpu-offload`) | `head-0024/input.png`, `untracked/tools/Hunyuan3D-2`, `hunyuan-full-weights` | `--subfolder hunyuan3d-dit-v2-0 --model-id tencent/Hunyuan3D-2` | rebuild S02 | yes (shape.glb hash matched bit for bit) | 247 s, GPU |
| H03 | `face-source-0095/input.png` | inline snippet `rebuild/S03_input.py` (system Python, not shape-env) | `evidence/face-study-0010.png` | flood-fill crop in the step `command` | rebuild S03 | partial: the original crop hash was never recorded; the downstream Hunyuan hash match (H04) confirms it | 1 s |
| H04 | `face-source-0095/reconstruction` | `reconstruct_shape.py` @ ba7cd0e3 | `face-source-0095/input.png` | as H02 | rebuild S04 | yes (hash matched) | 251 s, GPU |
| H05 | `head-0095` | `refine_reconstructed_head.py` (recovered by edit replay, `rebuild/recovered-scripts/S05`) | `head-full-0058/shape.glb` | `--mesh --out` only | rebuild S05, WSL Blender | partial: script bytes have no run-time hash; replay verdict drift | 95 s |
| H06 | `head-0100` | `transplant_reconstructed_muzzle.py` (recovered-scripts/S06) | `head-0095/head.blend`, `face-source-0095/reconstruction/shape.glb` | `--base --donor --out` | rebuild S06, WSL Blender | yes | 45 s |
| H07 | `head-0109` | `refine_reconstructed_coat.py` (recovered-scripts/S07) | `head-0100/shape.glb` | `--mesh --out`; fails the closed-solid guard on purpose and leaves `geometry-failure.blend` | rebuild S07, WSL Blender | partial: replay-only script bytes; step exits non-zero by design | 68 s |
| H08 | `head-0109/recovered-02` | `recover_0109_flakes.py` (untracked, lost; replay-recovered, root path patched by the runner) | `head-0109/geometry-failure.blend` | none (hard-coded in the script) | rebuild S08, WSL Blender | partial: replay-only bytes | 12 s |
| H09 | `head-0110/attempt-02` | `refine_reconstructed_cheek.py` @ 46dbc305 | `head-0109/recovered-02/head.blend` | `--base --out` | rebuild S09, WSL Blender | yes | 28 s |
| H10 | `head-0110/posterior-pass` | `fair_reconstructed_transitions.py` @ 46dbc305 | `head-0110/attempt-02/head.blend` | `--base --out` | rebuild S10, WSL | yes | 49 s |
| H11 | `head-0110/cranial-volume` | `reshape_reconstructed_occiput.py` @ 46dbc305 | `head-0110/posterior-pass/head.blend` | `--base --out` | rebuild S11, WSL | yes | 19 s |
| H12 | `head-0110/lower-ear-taper` | `refine_lower_ear_web.py` @ 46dbc305 | `head-0110/cranial-volume/head.blend` | `--base --out` | rebuild S12, WSL | yes | 23 s |
| H13 | `head-0131` | `refine_reconstructed_eyes.py` @ 46dbc305 | `head-0110/lower-ear-taper/head.blend` | `--scene --out` | rebuild S13, Windows Blender | yes | 10 s |
| H14 | `head-0146` | `refine_reconstructed_nose.py` @ 46dbc305 | `head-0131/head.blend` | `--relax-native-relief --method conformal --dome-height .006 --rim-height .0015 --recess-muzzle .012 --lower-point-z -.148`; the transcript's sed edit is already inside the commit | rebuild S14 | yes | 55 s |
| H15 | `head-0152` | `add_rear_coat_field.py` @ 755e1d84 | `head-0146/head.blend` | defaults (seeded `default_rng(args.seed)`) | rebuild S15 | yes | 38 s |
| H16 | `head-0158` | `warp_neck_field.py` (+ `neck_warp.py`) @ 691ddddd | `head-0152/head.blend` | `--kind head` | rebuild S16, loop_tools | yes | 13 s |
| H17 | `head-0160` | `warp_head_field.py` (+ `head_warp.py`) @ d2987690 | `head-0158/head.blend` | defaults | rebuild S17 | yes | 13 s |
| H18 | `head-0162` | `shape_ear_front_field.py` (+ `ear_warp.py`) @ 26c906f9 | `head-0160/head.blend` | `--lock-spacing .058` (sed edit in transcript, recorded in the plan) plus the plan's flags | rebuild S18 | yes (note: today's working copy differs from the run-time blob, use 26c906f9) | 97 s |
| H19 | `head-0170` | `shape_ear_rear_field.py` (+ `ear_rear_warp.py`) @ 17a683c5 | `head-0162/head.blend` | `--dome .30 .10 .32 --dome-blur 6 ...` (full line in plan) | rebuild S19 | yes | 70 s |
| H20 | `head-0182` | `simplify_fan_field.py` @ 20d0887b | `head-0170/head.blend` | `--close-steps 8 --open-steps 3 --blur 3 --crown-z .20 --crown-y-min -.34 ...` | rebuild S20 | yes | 83 s |
| H21 | `head-0187` | `author_fan_locks_field.py` @ 58b5a28e | `head-0182/head.blend` | `--tilt .06 --tilt-x0 .80 --tilt-x1 1.0 --sink .055 ...` | rebuild S21 | yes | 62 s |
| H22 | `head-0203` | `author_rear_locks_field.py` @ 2f8505d5 | `head-0187/head.blend` | `--bevel .03 --swell .11 --lock-cap .520 ...` | rebuild S22 | yes | 54 s |
| H23 | `head-0204` | `shape_face_field.py` @ 2f8505d5 | `head-0203/head.blend`, `face-r16.json` (committed) | `--spec docs/design/species-construction/akinza/face-r16.json` | rebuild S23 (matched the recorded counts exactly) | yes | 48 s |
| H24 | `head-0223` | `shape_head_silhouette_field.py` @ 1d124529 | `head-0204/head.blend`, `silhouette-spec-0223.json` | spec embedded in `head-0223/silhouette-shape.json` key `spec`; the same JSON is committed as `akinza/head-silhouette-0223.json` | loop round 1, R01, order for assembled-0225 | yes | 219 s |
| H25 | `head-0260` | `shape_head_silhouette_field.py` @ ff429ee9 (plus unhashed helper `head_r01_ops.py`, assumed ff429ee9) | `head-0223/head.blend`, `silhouette-spec-0260.json` | spec embedded in `head-0260/silhouette-shape.json` | loop round 2 retry, R01 (assembled-0262) | partial: spec file exists only in the data dir (embedded copy is identical); `head_r01_ops.py` is imported but not hashed in stage-start | 41 s |
| H26 | `head-0281` | `rebuild_face_features_field.py` @ 6a3137a8 | `head-0260/head.blend`, `face-features-spec-r4c.json` | spec embedded in `head-0281/face-features.json`; script uses `default_rng(1)` | loop round 4, R02 (assembled-0285) | partial: spec file is data-dir only, embedded copy identical | 33 s |
| H27 | `head-0318` | `author_rear_lock_table_field.py` @ 74add159 | `head-0281/head.blend`, `art/species-construction/specs/r04_locks.json` (committed, made by `loop/r04_table.py` from `specs/R04.md`) | argv in `loop/packets/assembled-0319/build.json` (`--plate 0.014 --dome-cut --lock-blend .006 ...`) and the full namespace in `head-0318/rear-lock-table.json` key `parameters` | loop round 6, R04 (assembled-0319) | yes (argv is in a data-dir packet file; the record holds the namespace) | 293 s |
| H28 | `head-0333` | `author_fan_front_lock_system_field.py` @ 404c0e22 | `head-0318/head.blend`, `loop/specs/R03.md` (committed) | all defaults (`build.json` of assembled-0335 says so); namespace in `head-0333/fan-front-lock-system.json` | loop round 7, R03 (assembled-0335) | yes | 275 s |
| H29 | `loop/scratch/r10/x-e` (donor, scratch) | `rebuild_face_features_field.py` @ 334b5926 | `head-0260/head.blend` (note: 0260, not 0281), `art/species-construction/specs/face-features-r10e.json` (committed, hash equals the scratch `spec-e.json`) | spec file | loop round 10, R02; iterations a to e of the same script, only e is used | yes | 37 s |
| H30 | `head-0375` | `graft_face_field.py` @ 334b5926 | `head-0333/head.blend` (base), `loop/scratch/r10/x-e/head.blend` (donor) | no `--spec`, so the script's default window (x .30 to .335, z -.30 to .30, zfade .02, y .02 to .06), recorded in `head-0375/graft.json` | loop round 10, R02 (assembled-0376) | yes | 36 s |
| H31 | `head-0387` | `author_rear_lock_table_field.py`, bytes only in `head-0387/source-snapshot/` (sha 6cca2ce7); not any committed blob (closest 9e8e57e5 and f88a358f differ by 27 and 16 changed lines, additive options) | `head-0375/head.blend`, `r04_locks.json` | argv in `loop/packets/assembled-0396/build.json` (`--rows T,B1,B2,B3 --plate .014 --plate-fade -.002 .016 ... --yaw T=.006,B2=.010,B3=.008`); namespace in `head-0387/rear-lock-table.json` | loop round 11, R04 | partial: script version is not in git | 324 s |
| H32 | `head-0395` | `carry_materials_field.py` @ f88a358f | `head-0387/head.blend` (scene), `head-0375/head.blend` (material source) | `--scene --source --out`, no tunables | loop round 11, R04 (assembled-0396) | yes | 11 s |
| H33 | `head-0455` | `author_fan_front_lock_system_field.py` @ 4770edb6 | `head-0395/head.blend` (not head-0440), `loop/specs/R03.md` | full argv in `scratch-r16/cmd0455.json` (data dir) and the namespace in `head-0455/fan-front-lock-system.json`; produced by `loop/r03_lock_try.py 0455 key=value ...` with `R03_BASE=0453`, chain 0443, 0447, 0451, 0453, 0455 inheriting parameters only | loop round 16, R03 (assembled-0457) | yes | 272 s |

Note on H33: the 0443 to 0455 chain inherits parameters, not geometry. Every R03 build in rounds 12 to 16 starts from `head-0395`. The parent of head-0455 is head-0395, so the geometric chain is H01 to H32 then H33. The stage-start files record `head-0395/head.blend` (sha 28f07ba7) as the only mesh input.

Shape of the head DAG: H32 (head-0395) also reads H30 (head-0375) as a material source, H30 reads H29 as a donor, and H29 branches from H25 (head-0260). Everything else is linear.

## 2. Body chain (body-0448), root first

| # | Output dir | Script @ commit | Input dir(s) / files | Parameters | Produced by | Params recorded | Time |
|---|---|---|---|---|---|---|---|
| B-01 | `body-reconstruction-0028/input.png` | inline snippet `rebuild/B01_input.py` | `evidence/body-study-0003.png` | crop rect (0,0,650,810), white threshold 235 | rebuild B01 | yes (hash matched) | 1 s |
| B-02 | `body-reconstruction-0028/attempt-01` | `reconstruct_shape.py`, mini weights, no `--cpu-offload` | B-01 | `--weights hunyuan-mini-weights` | rebuild B02 | yes (hash matched) | 123 s, GPU |
| B-03 | `paw-reconstruction-0041/input.png` | inline snippet `rebuild/B03_input.py` | `evidence/paws-study-0020.png` | crop rect (175,480,590,980) | rebuild B03 | yes | 1 s |
| B-04 | `paw-reconstruction-0041/attempt-01` | `reconstruct_shape.py`, full weights | B-03 | as H02 | rebuild B04 | yes (hash matched) | 265 s, GPU |
| B-05 | `body-0072/attempt-02` | `refine_reconstructed_body.py` (recovered-scripts/B05) | `body-reconstruction-0028/attempt-01/shape.glb` | `--omit-tails` | rebuild B05, Windows Blender | yes | 10 s |
| B-06 | `body-0073` | `reconcile_reconstructed_body.py` @ ba7cd0e3 | `body-0072/attempt-02/shape.glb` | `--mesh --out` | rebuild B06 | yes | 9 s |
| B-07 | `body-0086/attempt-03` | `integrate_reconstructed_paws.py` (recovered-scripts/B07) | `body-0073/shape.glb`, `paw-reconstruction-0041/attempt-01/shape.glb` | `--body --paw --out` | rebuild B07 | yes | 33 s |
| B-08 | `body-0100/attempt-02` | `fair_reconstruction_joints.py` (recovered-scripts/B08) | `body-0086/attempt-03/shape.glb` | `--tail-free-input` | rebuild B08 | yes | 35 s |
| B-09 | `body-0172` | `rebuild_body_field.py` @ d8b37f08 | `body-0100/attempt-02/{shape.glb,fairing.json}`, `body-0086/attempt-03/shape.glb` (tail-free torso), `tail-controls-blades.json` | `--tail-controls`, `--tail-free-body`, `--tail-record` (full line in plan) | rebuild B09 | yes | 85 s |
| B-10 | `body-0173` | `warp_neck_field.py` @ 691ddddd | `body-0172/{body.blend,fairing.json}` | `--kind body` | rebuild B10 | yes | 9 s |
| B-11 | `body-0177` | `smooth_torso_field.py` @ 330692bd | `body-0173/{body.blend,fairing.json}`, `torso-smooth-regions-r7.json` (the transcript wrote it from `C:/tmp`, bytes equal the committed file) | `--regions` | rebuild B11 | yes | 23 s |
| B-12 | `body-0183` | `smooth_torso_field.py` @ 20d0887b | `body-0177/...`, `torso-smooth-none.json`, `chest-ease-r8.json` | `--regions --chest-ease` | rebuild B12 | yes | 16 s |
| B-13 | `body-0195` | `warp_waist_field.py` @ a658bc9d | `body-0183/...`, `waist-warp-r13.json` | `--spec` (the sed `zTop .24` is inside the committed JSON) | rebuild B13 (exact counts matched) | yes | 16 s |
| B-14 | `body-0212` | `rebuild_body_field.py` @ 3ea13785 | `body-0195/{shape.glb,fairing.json}`, `body-0086/attempt-03/shape.glb`, `tail-controls-stack-b.json` (committed) | `--tails-only --tail-controls ... --tail-free-body ... --tail-sweep-sigma .009` | loop round 1, R10 (assembled-0219) | yes | 54 s |
| B-15 | `body-0263` | `reshape_legs_field.py` @ 91d9b9b0 | `body-0212/{body.blend,fairing.json}`, `specs/leg-reshape-r08-v5.json` (committed) | `--spec`; also in `body-0263/leg-reshape.json` | loop round 2, R08 (assembled-0264) | yes | 38 s |
| B-16 | `body-0288` | `reshape_torso_field.py` @ 32a4e726 | `body-0263/...`, `specs/torso-reshape-r06-v5.json` | `--spec` | loop round 4, R06 (assembled-0290) | yes | 21 s |
| B-17 | `body-0303` | `rebuild_arms_field.py`, bytes only in `body-0303/source-snapshot/` (sha cb7d89b1); not a committed blob (closest 5a8f6a47, 18 changed lines; the snapshot lacks `stationSmoothing`) | `body-0288/{shape.glb,fairing.json}` | default ARM dict, no `--spec`; merged dict in `body-0303/arm-field.json` | loop round 5, R07 (assembled-0305) | partial: script version is not in git | 67 s |
| B-18 | `body-0310` | `rebuild_hind_paws_field.py` @ d19eb22c | `body-0303/{shape.glb,fairing.json}` | default PAW dict; merged dict in `hind-paw-field.json` | loop round 6, R09 (assembled-0312) | yes | 15 s |
| B-19 | `body-0325` | `shape_neck_shoulders_field.py` @ a784db6f | `body-0310/{shape.glb,fairing.json}`, `spec-0325.json` | `--spec spec-0325.json`; merged namespace in `shoulder-field.json` key `ns` | loop round 7, R05 (assembled-0327) | partial: spec file is data-dir only (not in git); the record holds the merged dict, not the file | 19 s |
| B-20 | `body-0369` | `reshape_torso_field.py` @ 56412979 | `body-0325/...`, `specs/torso-reshape-r06-v7d.json` (committed; generated by `loop/make_torso_spec.py` from `trunk-measure-0325s.json`, but the spec itself is committed) | `--spec` | loop round 10, R06 (assembled-0371) | yes | 27 s |
| B-21 | `body-0400` | `rebuild_hind_paws_field.py` @ b8e6f6cc | `body-0369/{shape.glb,fairing.json}`, `loop/scratch/r12/v3.json` (same bytes as `body-0400/paw-spec-v3.json`) | `--spec paw-spec-v3.json` | loop round 12, R09 (assembled-0402) | partial: spec lives in the data dir only; merged dict in `hind-paw-field.json` | 19 s |
| B-22 | `body-0426` | `reshape_legs_field.py` @ 808660d7 | `body-0400/{body.blend,fairing.json}`, `specs/leg-reshape-r08-v11.json` | `--spec` | loop round 14, R08 (assembled-0428) | yes | 28 s |
| B-23 | `body-0448` | `rebuild_arms_field.py` @ 5aa1b2f3 | `body-0426/{shape.glb,fairing.json}`, `specs/arms-r07-v10.json` (committed) | `--spec`; new option `clawEach` | loop round 16, R07 (assembled-0450p) | yes | 76 s |

The body's `fairing.json` is passed down every step and accumulates one record per stage (`fieldRebuild`, `neckWarp`, `torsoSmoothing`, `waistWarp`, `legReshape`, `torsoReshape`, `armRebuild`, `hindPawRebuild`, `neckShoulderReshape`, plus `tailControls` and `groundContact`). It is the closest thing to an embedded body lineage. Its `outputs.shape.glb` hash must equal the body's glb: the assembler refuses a mismatch.

## 3. How `assemble_reconstructed_creature.py` combines a head and a body

Invocation (what `loop_tools.py assemble <head> <body> <out>` runs, Windows Blender, `--factory-startup`):

```
--body <body>/shape.glb --head <head>/shape.glb --tail-record <body>/fairing.json --out <out>
--head-scale .50 --jaw-anchor-z .500 --head-depth-offset -.020 --fragment-voxels 5
```

The placement constants are hard-coded as `PLACEMENT` in `loop/loop_tools.py`. A body with `retarget.json` (`headShiftZ`) would raise the jaw anchor and neck trim; body-0448 has none, so the defaults apply (`--body-trim .425`). assembled-0458 is `head-0455` + `body-0448`: the three recorded inputs in its `stage-start.json` are `head-0455/shape.glb`, `body-0448/shape.glb` and `body-0448/fairing.json`. The script is the committed blob bc9002ef.

What it does, in order:

1. Imports both glbs, welds seams at 1e-6, and requires each to be one closed solid. The head is scaled by .50 and translated to (0, -.02, jaw-anchor-z + .27 * .50 = .635).
2. Measures four horizontal neck sections (two on the body below the trim at z .425, two on the head above `jaw-anchor-z - .048`) and builds a Hermite-lofted bridge ring stack between them.
3. Bisects the head and body at the neck planes, fills the holes, joins head, body and bridge, voxel-remeshes at .0028, and blends a "Neck fusion" vertex group with a SMOOTH modifier (90 iterations, .6).
4. Reads the body's `fairing.json`: it checks that `outputs['shape.glb']` equals the body glb's sha, corrects each recorded tail tip (`tailControls`) after the remesh, and flattens the floor contact from `groundContact` (floorZ -.957, blend .01).
5. Rebuilds materials (clay, plus the head's nose material and pale inner-ear coat transferred by nearest polygon within .0075 and .006) and removes tiny head fragments up to `fragment-voxels * .0028` above z .49.
6. Writes `akinza.glb`, `akinza.blend`, `assembly.json` (inputs, hashes, neck sections, tip corrections, per-object stats) and `assembly_source.py`. `loop_tools.py assemble` then renders views and detail sheets (`cmd_render`), which is the bulk of the wall time.

Inputs needed: head `shape.glb` (with its materials, including the separate `head_nose_finish` object), body `shape.glb`, body `fairing.json` whose hash binds to that glb, and nothing from the head's records. It writes a new directory and refuses an existing one.

## 4. Step counts and wall time

| Chain | Steps | Breakdown | Compute time |
|---|---|---|---|
| Head (to head-0455) | 33 | 2 input crops, 2 Hunyuan runs, 19 trunk Blender steps (S05 to S23), 10 loop Blender steps (including the scratch donor x-e) | trunk 1,381 s (23.0 min, of which Hunyuan 498 s); loop 1,541 s (25.7 min); total 2,922 s, about 49 min |
| Body (to body-0448) | 23 | 2 input crops, 2 Hunyuan runs, 9 trunk Blender steps (B05 to B13), 10 loop Blender steps | trunk 626 s (10.4 min, of which Hunyuan 388 s); loop 364 s (6.1 min); total 990 s, about 16.5 min |
| Assembly 0458 | 1 | assemble 49 s, then render and six detail sheets to about 281 s end to end | about 4.7 min |

Total distinct steps: 57 (33 + 23 + 1). Sources of the numbers: `C:\dev\art-data\rebuild\log\<step>.json` (`elapsedSeconds`) for S and B steps; for loop steps the delta between `stage-start.json` and the last output file mtime, because the `*.log` files in the akinza folder hold only a few Blender timestamps (blend read, glTF export), not step durations; for assembly the mtimes inside `assembled-0458/`.

Estimate for a full replay: with the two lanes run in parallel (the loop's two-slot Blender limit; Hunyuan has its own one-slot GPU lock, 886 s serial in total) the head lane dominates at roughly 50 min, so about 55 min plus about 5 min for the assembly and its renders; run serially it is about 70 min plus assembly. Add tree preparation (38 `git archive` trees, 1.4 GB, minutes) and any retries. These are the compute figures from the recorded run on one machine, not a measured replay.

## 5. Replayability today

### Deterministic and replayable from git plus recorded parameters

* Hunyuan roots (H02, H04, B-02, B-04): `shape.glb` reproduced bit for bit by the 2026-09-30 replay (verdict match). Needs the installed toolchain under `C:\dev\art-data\tools`.
* Trunk steps H09 to H23 and B-05 to B-13: scripts are committed or in `rebuild/recovered-scripts/`, parameters are verbatim in rebuild-plan.json, `run_rebuild.py` has already run them once. Counts matched; `.blend` and `.glb` bytes drifted on most (see gaps).
* Loop steps whose script bytes equal a committed blob and whose spec is committed or embedded in a record: H24, H26 (spec in data dir but embedded), H27, H28, H29, H30, H32, H33 and B-14, B-15, B-16, B-18, B-20, B-22, B-23. The seeded RNGs (`default_rng(1)`, `default_rng(7)`, seeded coat) and the md5 lock jitter are deterministic.
* Assembly: `assemble_reconstructed_creature.py` @ bc9002ef with the fixed placement constants.

### Not replayable, or replayable only with a repair

1. No plan or runner covers the loop rounds. `rebuild-plan.json` and `run_rebuild.py` end at assembled-0205 (X01). The 10 head and 10 body loop steps above exist only as the commands in `loop/packets/*/build.json`, `scratch-r16/cmd0455.json` and the records.
2. Two steps ran on script versions that are not in git: `head-0387` (`author_rear_lock_table_field.py`, mid round 11) and `body-0303` (`rebuild_arms_field.py`, mid round 5). The exact bytes survive only in the `source-snapshot/` folder of those outputs, in the data directory. Committed neighbours add options but differ, so using them is unverified.
3. Spec or parameter files that exist only in the untracked data directory (not in git): `silhouette-spec-0260.json`, `face-features-spec-r4c.json`, `spec-0325.json`, `paw-spec-v3.json` (also under `loop/scratch/r12/v3.json`). Each is embedded in the step's record JSON (identical for 0223, 0260, 0281 and x-e; merged with defaults for 0325 and the paw dict), so they can be re-extracted and committed, but today a clean clone cannot replay H25, H26, B-19 or B-21. `silhouette-spec-0223.json` is committed as `akinza/head-silhouette-0223.json`.
4. Unhashed helper modules: `head_r01_ops.py` (imported by the H25 script, introduced in round 2 and changed in the ff429ee9 commit that came 14 minutes after the 0260 run) and the trunk's `neck_warp.py`, `head_warp.py`, `ear_warp.py`, `ear_rear_warp.py`. `stage-start.json` hashes only the entry script and five base helpers (`study_provenance.py`, `blender_blockout.py`, `blender_probe.py`, `authored_surfaces.py`, `surface_math.py`, which are constant across all 35 steps and match git).
5. Command lines for the rear lock table (H27, H31) live only in data-dir `build.json` files; the records hold the argparse namespace with Python key names, and there is no helper that turns it back into a command. Only the fan front has one (`loop/r03_lock_try.py`, plus `cmd0455.json`).
6. Byte reproducibility is not established. The runner's replay of the trunk gave `drift` on 23 of its 28 Blender steps (counts matched, `.blend` and `.glb` hashes differed) and the loop then ran on those replayed outputs. The recorded input hash of every loop step matches today's trunk files, so a fresh replay must either reproduce those exact bytes (unproven: a second replay was never compared with the first) or accept a drifted chain verified by statistics only. H05, H07 and H08 also rest on replay-recovered script bytes.
7. Toolchain locations are hard-coded: Windows Blender 5.2.2 (`d13f752e3b9c`) under the OpenAI.Codex package `LocalCache` path (overridable with `XALIANS_BLENDER`), a WSL Linux Blender 5.2.2 for H05 to H12, a Hunyuan3D-2 checkout at HEAD f8db6309 with a `shape-env` virtualenv, and `C:\dev\art-data` paths in `run_rebuild.py`. Record JSONs embed absolute paths of `C:\dev\src\xalians-akinza-loop`.
8. Hash gating assumes the CRLF checkout (`core.autocrlf=true`); on an LF checkout every `stage-start.json` script hash will differ while behavior should not.
9. Manual or one-off pieces: S07 is expected to fail and leaves `geometry-failure.blend` for S08; S08 uses a lost script recovered by replay; the scratch donor x-e is a scratch directory (reproducible, but nothing records its build as a step); body packets mention a pose cache seeded by hand (not geometry).
10. Stray untracked directories `body-0252/` and `loop/` sit at the repo root (a relative-path accident from a run); they are not part of the lineage.

## 6. Part generators that rebuild a part from parameters

None builds a part from nothing: every one reads the previous head or body (the Hunyuan-derived trunk is always the base). The distinction that matters for a recipe is between generators that author the geometry of a region from parameters and then union or morph it into the existing field, and tools that only warp or resample what is already there.

| Script | Takes as input | Part geometry comes from | Still depends on the previous mesh for |
|---|---|---|---|
| `rebuild_arms_field.py` | `--body shape.glb --fairing fairing.json --out [--spec]` | the ARM dict: shoulder, elbow, wrist, digit-tip chain, radii, lobes, claws (merged dict saved in `arm-field.json`) | the trunk: the native arm is removed by a morphological opening, then the new arm is smooth-unioned; shoulder and fillet blend with the existing field |
| `rebuild_hind_paws_field.py` | `--body shape.glb --fairing fairing.json --out [--spec]` | the PAW dict: toe arch, instep, dorsum, heel, claws (saved in `hind-paw-field.json`) | the leg above the morph band; the ankle column is measured from the input leg |
| `author_fan_front_lock_system_field.py` | `--scene head.blend --out --spec R03.md` plus about 90 options | the 58 lock rows of `R03.md` and the option set (saved in `fan-front-lock-system.json`); `r03_lock_try.py` can rebuild the command from any head's record | the existing head field: a plan morph blends toward the target surface, and locks are unioned into it. Rounds 12 to 16 all start from head-0395 |
| `rebuild_face_features_field.py` | `--scene head.blend --spec --out` | eyes, nose pad, bridge advection and tufts from the spec | the head skin and its original eye pocket (the script "must run on the head it was written for", which is why `graft_face_field.py` exists) |
| `author_rear_lock_table_field.py` | `--scene head.blend --out`, about 60 options, `r04_locks.json` | the 114-row R04 lock table (T, B1, B2, B3, D, C rows) | the head skin: plate cut and dome cut are heightfield edits of the existing field |
| `reshape_legs_field.py` | `--scene body.blend --fairing --spec --out` | station table in the spec | measures the existing leg silhouette slice by slice and resamples it; a pure warp |
| `reshape_torso_field.py` | `--scene body.blend --fairing --spec --out` | station table in the spec | measures the existing trunk and resamples it; a pure warp |
| `shape_neck_shoulders_field.py` | `--body shape.glb --fairing --out [--spec]` | target outline in the spec | cuts and blurs the existing neck and shoulders |
| `rebuild_body_field.py` | `--body shape.glb --tail-record --out` plus tail controls and the tail-free torso | tail sweeps from `tail-controls-*.json`, analytic paws | the whole torso (it also needs `body-0086/attempt-03` as the tail-free reference) |
| `shape_head_silhouette_field.py` | `--scene head.blend --spec --out` | skull ellipsoid and warp from the spec | the head skin |
| `graft_face_field.py` | `--base head.blend --donor head.blend --out [--spec window]` | the donor's face field | both heads; blends the donor into the base inside a window |
| `carry_materials_field.py` | `--scene --source --out` | none (copies per-polygon materials by nearest polygon) | both heads |

For a recipe that is robust to a changed trunk, the best candidates are arms, hind paws and the fan front: their parameters (ARM, PAW, R03 option set) are fully recorded in the part records and the region geometry is authored analytically. The reshape and shoulder tools are not: their targets are tables, but the result is defined as a mapping of the previous mesh.

## Recipe skeleton for a later engineer

1. Provision the toolchain (Windows and WSL Blender 5.2.2, Hunyuan environment) and set `XALIANS_BLENDER`.
2. Run `run_rebuild.py --lane head` and `--lane body` (S01 to S23 and B01 to B13) and accept the replayed trunk, or compare against the recorded input hashes of H24 and B-14.
3. Commit the data-dir-only specs (re-extracted from the records) and the two snapshot-only scripts as their own named versions, then write a loop-era plan with the ten head and ten body steps in this document and run them in order, verifying each against the step's record statistics.
4. Run `loop_tools.py assemble head-0455 body-0448 assembled-0458` and compare with `assembly.json` (688,804 vertices in the continuous skin, 1 component, 0 non-manifold edges).
