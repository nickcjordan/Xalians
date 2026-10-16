# Luceras stage 7, pass 1: the surface (build B-rmyz)

You are the builder for stage 7 of the Xalians creature pipeline: give the approved game mesh of Luceras its look, for the standard finish. The asset ships as a live three.js glTF on mobile browsers, so the look is judged in a three.js render, not only in Blender. The orchestrator (Claude) reads your pass; Nick (the art director) approves the look.

## Inputs (blob store C:\dev\art-data\pipeline\blobs\<first two hex>\<sha256>)

- Approved game mesh: C:\dev\art-data\pipeline\codex-stream\luceras-gamemesh\pass6\gamemesh.blend (11,478 triangles, 40 joints, UVs, baked normal_2048/1024.png and ao_2048/1024.png in the same folder). The approved sculpt behind it: C:\dev\art-data\pipeline\codex-stream\luceras-merge\revert-forelegs\luceras_sculpt.blend.
- Nick's picks from the vision board (the look authority for each element): coat "storm slate" c6a7f14d19d2d672268e9853110e00972494074e186a2775d7712879f9bd9d00; horns "ridged dark" 574891431107799d9b5c8547377c6676fc51290e21d6aa72fa3a97251d24ec55; eyes "amber goat" (horizontal pupil) c63ee53190401d62bb1b96633b379674eb8b2dc6097d91ac236ad890047068e8; fur "feathered hind legs" 407ee6f4474bd65f793f99b0e8dc62c5968a767c491dd8534e2d5df52272aac9; tail plume "base plume, pointed tips" 5df59e85ea7045c29f17b2cc3741246cf5e8b9c3806c522ced8c7e86f86d3ddd.
- The approved model sheet, combining all picks: combined look 56269a7be56c4020a23c08838c8eb84c5a9ac70730ada74c94db8ed04b8c5529; furred turnaround side 8a78d9128f7aebb5c291f60cb70e0cfbec928fa357d1a91dff1eba27746286f9, front c96afd98e282fa5abaee6f1aed3245e0892be71998e1ade914c7c3af4f108178, three-quarter ee0d82e980b576199a8d8bdd66463ff92c5175771c6ea12a013afba580f89de4; head close-up dd345a46081ff9cfe97e3f4db380ae45a249a55322e0b15ea54b28846af6c4a9.

Rulings in force (sourced): coats fit the home world and carry a pattern, never one flat color (Nick 2026-10-08); fur length varies by region, short on the face, head and neck, longer where the sheet shows it; spiky edges are hair tufts, not feathers (Nick 2026-10-09); fur on the game asset is texture fur (baked color and normal) with a short silhouette fringe only where the sheet demands one, because alpha overdraw is the known mobile killer (design decision 11); claws are small and quiet, not a defining feature (Nick 2026-10-15); Luceras's home world is Saiphus (air element), a gas giant with floating islands, so the coat reads as a storm-cloud gray.

## What to build

1. Base color (one 1024 texture, authored at 2048): the storm slate coat as the sheet paints it: dark slate gray back, flanks, legs and tail, a white blaze down the face to the nose, a white muzzle and chin, white throat, chest and belly, white inner legs and the lighter feathering on the hind legs; the plume dark at the base, white toward the tips as the sheet shows. Paint it procedurally in Blender (projected masks from the sheet views, noise for fur clumping, a little value variation so the coat is not flat), in the existing UV layout.
2. Texture fur: a fur strand pattern in the normal map (combine with the baked sculpt normal) and in the base color, short and tight on the face, head and neck, longer on the body, longest on the hind leg feathering and the chest, flowing from head to tail and down the legs.
3. Fringe cards (alpha-tested, not alpha-blended): the tail plume (the spiked plume with pointed tips, the most important), the feathered fringe on the back of each hind leg, and a short chest ruff if the sheet demands it. Budget: the whole creature at most 12,000 triangles (hard). You may free triangles by decimating flat body regions further (flank, back, belly) as long as the silhouette does not change; report it. Cards weighted to the right bones (tail cards to the tail chain).
4. Horns: dark, near-black brown, ridged (the ridges are in the baked normal), slightly glossy, lighter at the ridge crests. Eyes: amber iris with a horizontal goat pupil, a glossy cornea look, on the eye material. Claws: dark gray, quiet. Nose: dark.
5. Whiskers: a few thin alpha-tested cards per side (about 6 to 8 whiskers each), white, long as on the sheet, weighted to the head.
6. Materials stay at most 2 (body plus horns, claws and cards in one; eyes in the other), glTF metallic-roughness: base color, normal, ORM (occlusion in R from the AO bake, roughness in G, metal 0 in B).

## Proof

- Look-dev renders (Cycles, the look-dev scene) of the full body side, three-quarter and front, head close, hind leg close, tail plume close, and a 192 px sprite side. Beside each, the matching sheet view at the same height (composite_<view>_vs_sheet.png).
- The same views rendered in three.js from your exported glb, since that is what ships: use the repo viewer at C:\dev\src\xalians-creature-pipeline\art\pipeline\viewer\ (serve.mjs, index.html, three 0.160) with a headless browser (playwright-core is installed in C:\dev\src\Xalians\node_modules), or a small three.js page of your own with the same version, a neutral light rig close to the look-dev scene, and screenshots saved as runtime_<view>.png.
- measurements.json: triangles per object and total, cards count, texture sizes, materials, influences, the glb size in bytes.
- report.json: build id B-rmyz, method in order, what you fixed per iteration, what remains, budgets each beside its limit, and checks.

## Self-review and conventions

After every iteration compare your renders with the sheet views and write in iter_notes.json what reads differently (color, pattern placement, fur length by region, plume shape, eye color and pupil) and what you changed. Run the checklist before you stop: holes, dark spots, stretched or seamed texture, cards that float or flicker, wrong part counts. Blender 5.2.2 in WSL through the slot lock (owner "codex B-rmyz surface"); tooling into `art/pipeline/surface/` in the worktree C:\dev\src\xalians-creature-pipeline; no git. Output folder C:\dev\art-data\pipeline\codex-stream\luceras-surface\pass1\ with surface.blend and luceras_surface.glb.

Cap 75 minutes; stop editing at 60 and spend the rest on the final renders, the runtime screenshots and the report. Plain American English, no em dashes. Nothing that costs money, no installs. When done, print the path of report.json and stop.
