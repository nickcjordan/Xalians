# Akinza: rig, animation and sprite stage plan

## Context

The fur stage is closed (Nick, F32). Fur of record: `untracked/species-construction/akinza/surface/fur-steps/s12-29c/surface.blend` (426,693 strands, 3.87M points, skin `akinza_continuous_construction`, 621,482 vertices, model assembled-3300, palette T7). Delivery (Nick 2026-10-16): Cycles sprite atlases with strand fur first, a live glTF kept alive but not polished; skeleton, weights and clips are shared work and go first. The slice is idle plus the signature act, side facing only.

## Assumptions and Decisions

| # | Assumption or decision | Confidence | Evidence |
|---|---|---|---|
| 1 | Signature act is Night Stalk, the record's only authored action and its `signature` key. It also exercises a self/status archetype that the Luceras lunge did not | 95% | `docs/species-templates/v5/akinza.json` (`signature.key` = `akinza-defining`) |
| 2 | The shaved mesh to rig is the skin object inside the fur of record, not a fresh export | 80% | `s12-29c/surface-info.json` (`skin`) |
| 3 | Fur follows by strand root (triangle, barycentrics) plus points stored in the root triangle's frame, rebuilt per frame, not Blender's Deform Curves on Surface, because the skin has no UVs | 75% | Luceras `art/pipeline/groom/build_pass6.py:53`; Akinza `surface/build_fix_28.py`; `surface-plan.md` decision 1 |
| 4 | Luceras tooling is copied from branch `creature-pipeline` at `ae9c5e02`; the akinza branch has no `art/pipeline/` | 85% | `git merge-base` check |
| 5 | Tails rig as one root chain forking into three chains | 85% | Nick 2026-10-13 (memory model-shaved-anatomy) |
| 6 | Atlas format `xalians-frame-atlas-v2` must be built; nothing writes it yet | 85% | `docs/design/creature-asset-contract.md` decision 12; `validate.mjs:281` |
| 7 | Render time estimate below | 55% | figures in Risks |

## 1. Reused from the Luceras pipeline (`C:\dev\src\xalians-creature-pipeline`)

- `art/pipeline/slot/slot.py`: Blender and GPU slot lock (fur renders take their own slot, lesson 37).
- `art/pipeline/roster/lookdev.py`: look-dev scene, `side_left` and `sprite` (192 px) cameras.
- `art/pipeline/animate/luceras_clips.py`: clip primitives (`Track`, `ease`, `wave`, `lagged`, `damped`, breath cycle). `pose_rig.py`: bake every deform joint at 30 fps, two-link foot solver, per-frame checks. `compose.py`: contact sheets, 192 px strips, animated WebP. `finalize.py`: contract-shaped `clips.json`.
- `art/pipeline/animate/posed_tailflight.py` and `groom/deform_pass7.py`: render posed strand fur, measure root error per frame.
- `art/pipeline/rig/` (`build_rig.py`, `measure.py`, `check_glb_skinning.py`, `controls.py`): review poses, weight checks, glb skinning check.
- `art/pipeline/gamemesh/build_gamemesh.py` and `contract/` (`write_manifest.mjs`, `validate.mjs`): game mesh and export path.
- Atlas base: `art/creature-motion-pilot/tools/package_frames.py` and `runtime/atlas-player.mjs` (v1), extended to v2.
- Akinza's own `art/species-construction/rig_core.py` (joint derivation, distance-falloff weights, LBS) and `rig_write_glb.py`.

## 2. Steps

1. **Rig and weights.** Re-origin to the ground (`FLOOR_Z` -0.957) and scale to the record's height band. Extend `rig_core.BONES`: ears (three per side), jaw, tail root plus three fork chains (five each). Weights from `compute_weights` on the 621K-vertex skin, with rigid ear blades and blended weights at the tail fork. Pose eight biped review poses.
2. **Fur follows the rig.** Freeze the fur of record's curves in their current order (the 29c culls are index-based). Bind each root, then rebuild per frame from the deformed skin. Pattern and tail rings must read the stored `rest` attribute, never live position.
3. **Clips.** `akinza_clips.py` on the shared primitives. Idle: a 3 s loop with breath, weight shift, ear flicks, and the three tails swaying with a lag and a phase offset each. Night Stalk: 1.5 s in place: sinks into a low crouch, ears swept back flat, tails drawn low and close, head down and level, hold, brief recovery. Events `conceal` at the settled crouch and `recover`.
4. **Sprites and atlas.** Cycles CPU, palette T7, `side_left` in place, 30 fps. Test 192 px direct against 384 px downsampled on three frames, then render both clips and pack v2 (trimmed frames, offsets, event markers, per-frame sockets), with a v2 check added to `validate.mjs`.
5. **Game mesh, secondary.** Luceras gamemesh method (retopology, weight transfer), same skeleton and clips, glb through `write_manifest.mjs` and `validate.mjs`. Nick sees it only to confirm that it plays.

## 3. Checks for Nick

1. Clay posed board: eight poses, crops of shoulders, hips, ear roots and tail fork, rest beside.
2. Furred posed frames at the crouch and an ear-fold pose: tails, ears, armpits and groin, with no bald stretch, no strands through skin.
3. Clips on a moving clay page at 1x and at 192 px, never stills: does Night Stalk read as stalking?
4. The furred atlas playing in the atlas player at game size on his phone.

## 4. Risks

- **Three tails under deformation.** 48,840 tail strands share one root. Fork-crotch triangles shear, and the forks can pass through one another (Cycles has no collision). Measure tail-to-tail clearance per frame and crop the crotch at every pose.
- **Long locks.** Ear fan and tail locks of several centimeters rotate rigidly with their root triangle, and the ear fold can push them into the crown fur.
- **Render time.** Known figures: the Akinza static body view takes 27 s at 768 x 1024 (32 samples, CPU). Luceras: 1.7 s per static 192 px frame (360K strands), 19 to 22 s per posed 800 px frame (48 samples, fur rebuilt each frame). Estimate for Akinza posed: 4 to 8 s per frame at 192 px, 6 to 12 s at 384 px downsampled, most of it scene rebuild. Slice: 135 frames, 10 to 27 minutes. Production (ten clips, about 12 s of action, two facings): about 720 frames, 1 to 2.5 hours per species. Measure frame 1 first.
- **Weak read.** A stationary self act may read as "sits down" at 192 px.

## 5. Questions for Nick

| Question | Production answer (proposed) | Slice answer (proposed) |
|---|---|---|
| How does "concealed" show? | The game draws one concealed effect for every creature; the sprite shows only the body motion | Motion only, no baked fade |
| How tall is a sprite cell? | One cell height per game profile, shared by all species so sizes compare | 192 px like Luceras (Akinza's face is then about 30 px) |

## Decisions (Nick, 2026-10-21, "sure" to the recommendations on F33)
- Concealed: production, the game draws one shared concealed effect for every creature and the sprite carries only body motion; slice, motion only, nothing baked in.
- Sprite cell height: production, one height per game shared by every species; slice, 192 px like Luceras.
- Slice: idle (3 s loop) and Night Stalk (1.5 s), side facing.

## Rig stage log
- 2026-10-21: ears as a rigid whole-ear swing from the base approved (F36/F37).
- 2026-10-22: crouch approved (Nick, F38: "Yes, that is much better... this is light years better"), rig-p7r; why the earlier passes failed is in crouch-retrospective.md.
- 2026-10-23: all three tails move with the crouch approved (Nick, F39: "looks good, proceed"), rig-p8b. Rig stage done; rig of record anim/rig-p8b on surface fur-steps/s12-29c-legs3b. Next: step 3, the idle and Night Stalk clips (brief anim/clips-pass1-brief.md).
- 2026-10-24: idle (3 s loop) and Night Stalk (1.5 s) approved (Nick, F40: "looks good"), clips pass 4 (anim/clips4, akinza_clips.py at 8e3286ad). Four passes, each judged by a blind critic before Nick (lessons: judge clips by their in-between frames and amplitude at game size; measure targets in the render). Known and accepted: from the side the lower two fur plumes mostly read as one (as on F39); a faint fur shimmer at 192 px. Next: step 4, sprite renders and the v2 atlas (brief anim/sprites-pass1-brief.md).
