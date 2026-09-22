# Creature animation exploration: agent handoff

Updated 2026-09-21 after the render style board (see "Third pass" below); the 2026-09-20 text is kept beneath it. This is a self-contained continuation brief for the current Xalians creature-art and animation exploration. It records the user's intent, current evidence, implementation locations, constraints, and the next useful work. It does not select a permanent visual style or authorize integration into a game.

## Paste this into the next agent

You are continuing an active exploration of a reusable creature-art and animation pipeline for Xalians. Work in the existing repository and continue building rather than restarting the discussion.

### User intent and working style

The user is a full stack engineer, not a game artist, and wants help discovering the correct vocabulary, production practices, tools, and tradeoffs for reusable 2D game artwork. The long-term goal is an independent creature art library and build flow that can serve multiple games without making every game invent its own pipeline.

Use established free and open source tools where they improve the work. Do not introduce paid tools or require a Spine license. The user is open to illustrated cutout, drawn animation, pixel art, and stylized 3D rendered into 2D. They have not selected a permanent style. They prefer concrete prototypes and continued iteration over frequent checkpoints. Make reversible progress autonomously, show the moving result at actual stage size, and ask only one consequential design question at a time when a real decision is needed.

Do not focus this effort on the old compact SVG token. The portrait is useful as a visual reference, while the ratified species template and lore remain authoritative. The current subject is animated stage characters, their production pipeline, and their use in games.

### Repository rules and safety

Read `AGENTS.md` first. Then read these files in order:

1. `docs/design/generation-economy-open-threads.md`
2. `docs/design/xalian-generation-system.md`
3. `docs/design/species-art-system.md`
4. `docs/design/2d-creature-art-pipeline-research.md`
5. `docs/design/creature-art-direction-review.md`
6. `docs/design/avilily-motion-comparison-brief.md`
7. `art/creature-motion-comparison/README.md`

Use American English and no em dash in new prose, comments, commits, or pull request text. Distinguish agreed direction from experiments and recommendations. Do not call an art style settled without explicit user agreement.

Do not integrate this work into a local game, extract a game engine, add deterministic replay, create reward receipts, or change platform economy behavior unless the user explicitly requests that game's cutover. Animation markers describe visual timing only. The consuming game owns gameplay outcomes.

The art and design work lives on the branch `feat/creature-animation-rig`, cut from `main` on 2026-09-20 at Nick's request, in the worktree `C:\dev\src\xalians-creature-animation` (created with `npm run wt -- new creature-animation feat/creature-animation-rig` from `C:\dev\src\Xalians`). The detached Codex worktree at `C:\Users\njord\.codex\worktrees\36d3\Xalians` still holds the original uncommitted copy; leave it alone until Nick removes it. Nick closed the proof of concept on 2026-09-20 and asked for it to be merged, so the branch went to `main` through a pull request. Any further work starts a fresh worktree off `main`.

### Third pass, 2026-09-21: the render style board

Nick reopened the work on 2026-09-21 with the animation pipeline under Claude's ownership. His direction: quality first, keep both the 2D (Godot cutout) and 3D (Blender rig library) paths alive and push each to its ceiling on the few demo pieces, as deterministic as possible but tokens are acceptable where they buy quality, and the silhouette-with-incision portraits are a reference only, not a house style he is attached to ("if I'm having AI generate me the art, then I'm cool with pivoting").

Built in that session, on branch `anim/style-board`: render styles as a library lever (`blender/xalians_rig/styles.py`: `plain`, `toon`, `flat`, `ink`), the `--style` override on `build_species.py`, `styles.html` playing every style of one species in lockstep, `preview/style-board-<export>.png` from the packer, `-Styles` and a pixel-level `-Verify` on `build-blender.ps1`, `blender/compare_frames.py`, and eight styled tests in `comparison.test.mjs`. All four spec-built species were rendered in toon and flat, Akinza also in ink. The README's "Render styles" section holds the observations and the corrected reproducibility claim (pixels, not bytes).

What the board says, as observation: toon and flat both leave the plastic-toy register without changing a spec; toon is the stronger candidate on Dromeus and Avilily, flat the closest to the pilot cutout; the ink homage needs authored edge marks and is parked; the contour makes template faults visible (Akinza muzzle and hands, Dromeus feet, Bioflim crease rings). Nick had not reviewed the board when this was written.

Nick then looked at the toon Dromeus on the light stage and rejected it ("this looked good to you?"). He was right: the render style could not hide that the bodies are primitive assemblies. He gave the pipeline owner freedom to change anything, one creature at a time, quality first, determinism second. Dromeus became that creature. The same session added `blender/xalians_rig/skin.py` (one smooth Skin-modifier body over the posed joints, one shape key per frame) and `species/dromeus-skin.json`; the README's "One body, not an assembly" section holds the before and after and what still fails. The lesson for every later species: the performance can stay data, but the body must be one designed surface, and the light stage at 1x is the only honest check.

The pending second half of the program is the 2D ceiling test: one pilot cutout (Akinza) pushed with hand-drawn replacement cels at the strike, face and landing, judged beside the toon render on the same stage, with cost recorded. Then the two paths are compared on the moving result and the finding written into `creature-art-direction-review.md` as observation versus decision.

### What is already built

There are two related implementations under `art/`:

- `art/creature-motion-pilot/` is a three-species illustrated cutout pipeline for Akinza, Avilily, and Frackworm. It includes editable SVG parts, Godot rigs, keyed `idle`, `action`, and `hit` performances, transparent frame renders, atlases, manifests, previews, a workbench, and a battle-style demo.
- `art/creature-motion-comparison/` is the Avilily comparison, now eight moving implementations on one synchronized stage contract:
  1. Existing illustrated Godot cutout.
  2. Cutout with a replacement drawn flower bloom.
  3. Purpose-drawn 96 px pixel frames.
  4. Godot 3D primitive blockout rendered into 2D frames.
  5. Blender 3D character, pass 1 (kept unchanged as the before).
  6. Blender 3D character, pass 2 (the 2026-09-20 revision), now built from `blender/species/avilily.json` through the `avian` template.
  7. Bioflim, the amorphous stress test, from `blender/species/bioflim.json` through the `amorphous` template.
  8. Dromeus, the first biped, from `blender/species/dromeus.json` through the `biped` template.
  9. Akinza, the second biped, from `blender/species/akinza.json` through the same template, played beside the pilot's hand-keyed cutout of the same species on `study.html?study=akinza-blender`.

Every export uses the game-neutral `xalians-frame-atlas-v1` contract: a transparent `idle` loop and `action` clip, a shared origin, an emitter point, timing, one visual marker (`bloom_open`, `reach_peak`, `bite`), and since 2026-09-20 a `provenance` block (Blender build, spec hash, library hash, seed, samples) plus the projected `points`. Three pages read them through one generic Canvas reader: `index.html` (the six-way Avilily grid), `pass2.html` (pass 1 against pass 2 on two 390 px stages with frame strips), and `study.html?study=<export>` (any spec-built study with its provenance line). `stage.mjs` holds the canopy, swamp, and ash-field stages and the cue drawings.

**The rig library** (`blender/xalians_rig/`, entry `blender/build_species.py`) is the deterministic half of the pipeline. A species is a JSON spec in `blender/species/` (palette, proportions, anatomy switches, clip ranges, markers with the cue flagged, projected points, and the performance as a key track). A body-plan template (`templates/avian.py`, `amorphous.py`, `biped.py`, chosen by the ratified record's `bodyPlan`) builds the parts and poses them. Shared modules hold materials, builders, the eased key track with lag, the two-link leg solver, the fixed stage, projection, and provenance. The Cycles seed is pinned, PNG stamp metadata is off, and every frame is baked, so two renders of one spec are byte-identical (verified for Avilily and Bioflim: 42 of 42 frames and the meta file). The library reproduced the earlier hand-scripted pass 2 and Bioflim renders pixel for pixel before those scripts were deleted; only `build_avilily.py` (pass 1) remains as a standalone script. `build-blender.ps1 -Verify` repeats the byte check. Full detail is in `art/creature-motion-comparison/README.md` under "The rig library".

Blender sources, all real and editable: `blender/avilily_motion.blend` (pass 1, from `build_avilily.py`), and `avilily_motion_v2.blend`, `bioflim_motion.blend`, `dromeus_motion.blend`, each regenerated from its spec by `build_species.py`.

Blender 5.2.2 runs through Ubuntu in WSL at `/home/njord/.local/opt/blender-5.2.2-linux-x64/blender`. The Windows Blender package failed because of a side-by-side runtime problem, so do not repeat that installation attempt unless the environment has changed. The Windows Python 3.14 can no longer load a cairo DLL for CairoSVG, so `build-blender.ps1` packs the atlases with Blender's bundled Python inside WSL (Pillow and CairoSVG installed into `~/.local/lib/xalians-art-py`).

### Running and validating the work

From `art/creature-motion-comparison/`:

```powershell
./start-comparison.ps1                  # http://127.0.0.1:8766/creature-motion-comparison/
./build-blender.ps1                     # avilily, bioflim, dromeus, akinza from their specs, then all atlases
./build-blender.ps1 -Species dromeus    # one spec
./build-blender.ps1 -Verify             # render each spec twice; byte-identical frames required
./build-blender.ps1 -Pass1              # also rerun pass 1, which replaces avilily_motion.blend
node --test ./comparison.test.mjs       # 14 tests
node --check ./viewer.mjs; node --check ./pass2.mjs; node --check ./study.mjs; node --check ./stage.mjs
git diff --check
```

If port 8766 is occupied the existing server may still be running; use it or pass `-Port 8767`. For a quick pose check while editing a spec or template, run `build_species.py` with `--frames=21,30,36 --out=/home/njord/inspect`; it renders those frames into `<out>/inspect/` in a few seconds (write inspection output outside the repository). The full Godot-dependent rebuild remains `./build.ps1 -GodotPath 'C:\path\to\Godot_v4.7.2-stable_win64.exe'`.

### What the current evidence says

Observations from inspecting frames at 384 px and the 390 px stages; none of this is viewer research.

- Pass 2 fixes the concrete pass 1 failures: the near wing no longer crosses the chest or flower, the action has two readable preparation beats (head snap, then crouch) before a real hop, the beak is one radial mechanism from sealed cone to open flower and back, and the landing takes the weight before the recovery. Feet fold, leave, and retake the perch because the legs are solved, not keyed.
- Pass 2 still fails in places: the dark throat reads as a berry at phone size and the open petals are foreshortened from the three-quarter camera; the half-closed petals read as a claw for two or three frames; the surfaces are plain shaded plastic with no feather texture or line, so the render is far from the portrait's graphic language; the quiet loop is nearly invisible; the head is large for the ratified body.
- Armature versus shape deformation, decided by building: for a rigid-feathered avian at this size, solved pivots did the acting and the shape keys were barely visible. An armature would add setup cost without visible gain here. That is a statement about bodies made of rigid parts only.
- Bioflim showed that an implicit surface handles merging, reaching, and sagging with no rig, in less authoring time than the avian revision. The open risk it exposed is attaching rigid features (plates, eye) to a deforming surface; they currently ride pivots and can float slightly. Metaballs also take one material and no UVs.
- Rendering a 3D source into the shared 2D atlas continues to prove that individual games need no 3D runtime or Blender dependency. Pass 2 atlases are smaller than pass 1 (1.69 MB and 0.65 MB against 2.18 MB and 0.83 MB) because the silhouette is tighter.
- Dromeus, the first biped, was built through the library as a new template plus a spec in about 35 minutes of agent time. It reads as notice, crouch, lunge with jaws open, snap, landing, and a step back; its legs are thin, its feet are a cluster of tubes, and its folded wing hangs under the chest. The biped family covers eleven ratified species, so the next biped should cost a spec and a visual check, plus any signature hook (fists, horns, tusks, shell) the record demands.
- The second-biped test: Akinza needed twelve new template proportions and switches because Dromeus is horizontal and Akinza upright; all default to the Dromeus values and a pixel regression showed Dromeus unchanged. Akinza itself is spec only, about 30 minutes across two rounds. Weak: ears merge from this camera, the strike lifts the hands to face height, the muzzle reads as a bill. The third biped is the real test of "spec alone".
- Determinism, measured: the same spec renders byte-identically across runs; the library reproduced the hand-scripted renders pixel for pixel; provenance travels in every manifest. What remains hand-authored is template code per body plan, the numbers in a spec, and the judgment of whether a pose reads.
- Production cost is in `art/creature-motion-comparison/README.md`: 42 frames render in 18 to 45 s per study depending on load, packing all nine atlases takes 12 to 28 s, an inspection loop takes 3 to 15 s, and the per-anatomy custom work was a leg solver and petal hinge for the avian (solver reused by the biped), a metaball track and plate lift for the slime, and a jaw hinge, arm-wing fold, tail chain, and stepping feet for the biped.

### Continue from here

Start by opening `pass2.html`, `study.html?study=bioflim-blender`, and `study.html?study=dromeus-blender`, watching each at 1× on both stages, then the six-way page. Read `xalians_rig/templates/avian.py` and `species/avilily.json` together to see how a spec drives a template before changing either.

The strongest next experiments, in order of what they would settle:

1. **Third biped from a spec alone.** Akinza (upright) forced twelve switches onto the Dromeus (horizontal) template. Codazzo or Tizzie should now cost only a spec; if either needs code, add it as a default-preserving switch and rerun the Dromeus and Akinza pixel regressions. Then judge Akinza against its pilot cutout on `study.html?study=akinza-blender`: which method reads better at 1× and what did each cost.
2. **Add a render preset, not a new model, for the look.** Render the same specs through a toon or flat treatment with an outline (Freestyle or shader-to-RGB, both free) as a `render.style` option in the library, and compare beside the plain Cycles render on the same stage. The remaining distance to the portrait is line and surface language rather than motion.
3. **Fix the bloom at phone size** as a spec and template change: curl petal tips forward, light the throat, shorten the claw-like closing frames. Verify at 390 px before and after.
4. **Test the swarm.** Vespersyn is the body plan neither pivots nor metaballs have touched: distributed identity, instancing, a lead figure. It needs a fourth template.
5. **Read the record, not the spec, for what can be read.** Palette by element, scale by size band, template by `bodyPlan`, part switches by `anatomy`, and the four finishes as material variants at render time. Keep proportions and the performance track as authored spec data.
6. **Trim the atlases** with per-frame offsets and record the change in transfer and decoded area, keeping the fixed-cell exporter as the baseline.

Do not equate more polygons or samples with a better result. A pass succeeds when a viewer can predict the action before the peak, locate the emission source at the peak, recognize the species at phone size, and understand the recovery without pausing. Record setup time, revision time, render time, output size, source limitations, and what had to be custom-built for each anatomy.

### Definition of a useful next handoff

Leave the next reviewer with:

- an improved moving implementation visible in the local pages at normal speed, with the earlier version kept beside it;
- editable source and a repeatable build command;
- the same portable atlas interface unless concrete evidence requires a versioned change;
- passing reader and viewer checks;
- updated design notes that distinguish observation, recommendation, and explicit user decision;
- a short explanation of what improved, what still fails, and the measured production cost.

Do not stop after proposing the next pass. Build it, inspect the rendered motion, fix obvious problems, and present the result for review.

## Handoff status

Animated stage performance is an agreed additional art-library role. The portrait remains a reference baseline. Nick agreed on 2026-09-20 to iterate toward a process that is as deterministic as possible without losing quality, accepting that it may never be fully deterministic; the rig library is the first step of that. The final style, required camera views, universal clip set, resource budget, and preferred authoring method remain open. The nine moving implementations are evidence for those decisions, not the decision itself. Nick saw pass 2 and Bioflim and called the result good for the number of passes. On 2026-09-20, after watching the spec-built Akinza beside the pilot cutout, he said he leans toward the 3D look but is not ready to decide either way, and he closed this proof of concept at that point. That lean is recorded here as an observation, not a ruling: the cutout, the pixel cels, and the toon or outlined render remain live candidates until Nick decides. When the work resumes, the first items are the ones listed under next steps above.
