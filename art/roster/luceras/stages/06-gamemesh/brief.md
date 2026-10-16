# Luceras stage 6: the game mesh (build B-8ezj)

You are the builder for stage 6 of the Xalians creature pipeline: turn the approved sculpt of Luceras into the mesh that ships in the game (a live three.js glTF on mobile browsers; sprites are rendered from it later). The orchestrator (Claude) reads your result; Nick (the art director) sees one check at the end: the sculpt beside the game mesh at game size, "any visible loss?". Everything else is technical and decided here.

## Input

The approved sculpt: C:\dev\art-data\pipeline\codex-stream\luceras-merge\revert-forelegs\luceras_sculpt.blend (blob d1203576f1f786fb8ae68097dde1e9fe344db0c6108b5077c0f9524d58a35754). It holds the body mesh (luceras_blockout, about 300K triangles, bound to the 40-joint armature luceras_rig), rigid horn_l and horn_r, eye_l and eye_r, whisker meshes, and the claw and dewclaw objects, all bone-parented. Meters, facing -Y, +X is the creature's left, origin at the ground point.

Nick approved every part of this shape (head, torso, legs, paws, tail). The game mesh must keep it: no visible change of shape at the close cameras or at sprite size.

## Budgets (from the measured design; hard limits are marked)

- Whole creature at most 12,000 triangles (hard), target 10,000.
- Joints: the existing 40 (hard at most 60); at most 4 influences per vertex (hard); every vertex weighted (hard).
- Materials: at most 2 (hard): one for the body, horns and claws together; one for the eyes.
- One texture set for the body material: base color later (stage 7), normal and occlusion now, baked at 2048 and saved at 1024 (and at 2048 for review). Texel density even across the body (report the min and max ratio between parts; aim within a factor of 2).
- One closed manifold for the body; rigid parts may stay separate objects but are merged into one mesh object per material at the end if the exporter needs it (keep their bone binding).

## Step 0: check the sculpt (closes stage 5 technically)

Before anything else, report on the sculpt: object list (exactly one body mesh plus the named rigid objects; flag anything else), body manifold (non-manifold edge count), influences per vertex (max), unweighted vertices, triangle counts per object. Write sculpt_check.json. Do not edit the sculpt file.

## Method (the slice answer, decided by the orchestrator)

1. Body: retopologize with QuadriFlow (Blender's remesh, quadriflow mode) with symmetry on X, preserving the silhouette, to a budget of about 8,500 triangles. Where QuadriFlow loses a shape that matters (horn bases, ears, toes, the tail tip, the thin lower legs), add density there by a density guide or by a second remesh of that region joined back; report what you did. Loops do not need to be perfect, but every joint region (shoulder, elbow, wrist, hip, stifle, hock, neck, tail) must have at least three edge rings across the bend so it deforms.
2. Rigid parts: horns decimated to about 500 triangles each keeping their curl, ridges left to the normal map; eyes as low spheres (about 120 triangles each); claws and dewclaws decimated to about 24 triangles each; whiskers removed from the mesh (they become a texture or card decision in stage 7; note it).
3. UVs: one 0 to 1 layout for body, horns and claws together, seams on the underside and inner legs where possible, islands packed with a margin of at least 8 pixels at 1024. Eyes on their own small layout.
4. Bakes from the sculpt to the game mesh: tangent-space normal map and ambient occlusion (cage or ray distance set so nothing misses; report the settings). Check the normal map for seams, ray misses and inverted patches in a render.
5. Skinning: transfer the weights from the sculpt body (nearest face interpolated), then limit to 4 influences and normalize; rigid parts keep their single-bone parenting as weights. Every vertex weighted.
6. Deformation test: pose the rig in the four proxy poses from the blockout stage (rest, crouch, leap, landing; see C:\dev\src\xalians-creature-pipeline\art\pipeline\blockout\build_blockout.py, POSES) and render each pose from the side for both the sculpt-weighted body and the game mesh. Measure volume change per joint region (fraction) and flag any region losing more than 30 percent or any visible collapse, pinch or tearing.

## Conventions (pinned)

- Blender 5.2.2 in WSL, every launch through the slot lock with owner "codex B-8ezj gamemesh" (`python3 /mnt/c/dev/src/xalians-creature-pipeline/art/pipeline/slot/slot.py run blender --wait 3600 --owner "codex B-8ezj gamemesh" -- <command>`).
- Tooling into the pipeline: `art/pipeline/gamemesh/build_gamemesh.py` and `art/pipeline/gamemesh/run_gamemesh.sh` in the worktree C:\dev\src\xalians-creature-pipeline (new folder). Reuse `art/pipeline/roster/lookdev.py` and `art/pipeline/sculpt/compare_render.py`. No git.
- Renders: Cycles, look-dev scene. Name intermediate files iter<N>_....

## Deliverables, in C:\dev\art-data\pipeline\codex-stream\luceras-gamemesh\pass1\

1. sculpt_check.json; gamemesh.blend (rig, game mesh objects, materials with the baked maps assigned); gamemesh.glb (glTF binary from the game mesh with skin, no animations); normal_1024.png, ao_1024.png and the 2048 versions; uv_layout.png.
2. The check for Nick: the sculpt and the game mesh side by side at sprite size (192 px side view) and at the close cameras (full side, full three-quarter, head three-quarter, hind paw side), each with the game mesh rendered with its baked normal map, labeled "sculpt" and "game mesh". Name them check_<view>.png.
3. A wireframe render of the game mesh (side and three-quarter) and the four pose renders as a grid (pose_grid.png).
4. measurements.json: triangles per object and total; vertices; materials; texture sizes; texel density ratio; max influences; unweighted count; non-manifold count; Hausdorff-style distance from game mesh to sculpt per region (mean and max, meters); volume change per joint region per pose.
5. report.json: build id B-8ezj, method in order, budgets (each number beside its limit), what you fixed per iteration, what remains, and checks.

## Self-review

After every iteration compare the game mesh and the sculpt at the check cameras and the pose grid, and write in iter_notes.json what reads differently and what you changed, with numbers. Stop when at sprite size and at the close cameras you can name no visible loss, or at the cap.

Cap 60 minutes. Plain American English, no em dashes. Nothing that costs money, no installs. When done, print the path of report.json and stop.
