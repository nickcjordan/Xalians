# Akinza 3D build chain, ported to main

Ported from branch `akinza/construction-loop` at commit `657cf0670724d921c0f8819dbdbdd68d5e963d08` (the working tree had unrelated uncommitted edits to `surface/` and a v2 nose/mouth experiment; none of the ported files were among them, and all were copied byte for byte from the working tree, which equals that commit for these paths).

## What was ported (98 files added or changed in the commit, plus this note; 9 of the closure files were already identical on main)

- The approved recipe `docs/design/species-construction/akinza/recipe-furbase-v5eye3.json` and its re-keyed sibling `recipe-studio-v5eye3.json` (see below).
- The recipe engine and loop tooling: `art/species-construction/loop/` (`recipe.py`, `recipe_steps.py`, `loop_tools.py`, `species.py`, `RECIPE.md` and every module they import, recursively).
- Every step script, every module the step scripts import, every `{repo}` spec the recipe reads (all 30 steps plus the assembly `assemble_reconstructed_creature_r27.py`), the neck table `specs/neck-r27-v2.json`.
- The Blender scripts `loop_tools.py` launches for `render`, `check`, `packet` and `measured` and their imports (`render_shape_study`, `torso_sections`, `render_details`, `review_shape_study`, `quick_silhouette`, `trunk_edge_sections`, `rig_*`), the rig pose `rig/akinza-sheet-pose.json`.
- `docs/design/species-construction/akinza/loop/species.json`, `rubric.json`, `sheet.json` and `cameras/*.json`. The evidence PNGs the species config names were already on main.

Step cache keys are a hash of script bytes (LF-normalized), args, input keys and `{repo}` file contents, so these byte-identical copies reproduce the same keys. `recipe.py status` on `recipe-furbase-v5eye3.json` prints the same keys from this branch as on the akinza worktree.

## The three re-keyed specs

The recipe's B-20T, B-21 and B-23 steps read specs from the gitignored data folder (`untracked/species-construction/akinza/sweep_specs/`). They are now committed at `art/species-construction/specs/sweep/` (`B-20T-3cbdf43ea7cd.json`, `B-21-5273502d5ba4.json`, `B-23-c9eb62b61097.json`; sha256 verified equal to the originals). `recipe-studio-v5eye3.json` differs from `recipe-furbase-v5eye3.json` only in those three `--spec` args and the three matching `pins` keys (now repo-relative). The path is part of the cache key, so B-20T, B-21, B-22, B-23, B-24Y and the assembly got new keys. Those six keys were mapped to the existing outputs (`body-2647`, `body-2913`, `body-2916`, `body-2918`, `body-2960`, `assembled-3141`) with `recipe.py seed` in strict mode, which maps a key only when every file the step reads equals the bytes the output recorded in its `stage-start.json`. The entries are marked `seeded` and are re-checked on every use. `seed` was run on a scratch copy of the recipe that carried the correct `existing` directories (the committed recipe's `existing` fields for B-22 and B-23 are stale history), with writes limited to those six keys so the other 24 cache entries were not touched.

## Main files replaced by the branch version

`art/species-construction/assemble_reconstructed_creature.py`, `rebuild_body_field.py`, `render_shape_study.py`. Main had not changed them since the branch point (`43378daa`), so the branch version is a strict superset. Nothing else on main imports them; only `README.md`, `docs/design/creature-studio.md` and the old `reconstruction-recipe.json` mention them.

## Running it from main

The data store is linked, not copied: `untracked/species-construction/akinza` is a directory junction to `C:\dev\art-data\species-construction\akinza` (create it in any new worktree; `untracked/` is gitignored).

```
python art/species-construction/loop/recipe.py status docs/design/species-construction/akinza/recipe-studio-v5eye3.json
python art/species-construction/loop/recipe.py build  docs/design/species-construction/akinza/recipe-studio-v5eye3.json --from H50 --dry-run
```

Blender is found through `XALIANS_BLENDER` or the default path in `loop_tools.py`. Status reports 30 of 30 steps cached and assembly `assembled-3141`.

## Left behind on the branch

The rest of the loop: `plans/`, `recipes/`, `rounds/`, `digests/`, `loop/tools/`, the other recipes (`recipe-furbase-*`, nose/mouth v1 and v2), the loop state, planner and page-builder scripts, the surface pipeline under `art/species-construction/surface/`, and the round-by-round design docs. Only what the approved v5eye3 chain needs to build, render and check from main was brought over.

## Replay check

H50 (the final head step) was replayed from main into a fresh output (`head-3164`, 17 s) without registering it in the cache. Its vertices (732526), faces (1459560), bounds and skin record (689832 vertices, 1 component, 0 non-manifold edges) equal the original `head-3140` exactly. H50 has no `expect` block, so the original output was the reference.
