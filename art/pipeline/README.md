# Creature pipeline: walking skeleton

The first technical chain of the creature pipeline (docs/design/creature-pipeline-design.md, docs/design/creature-asset-contract.md). It proves that rig modules, automatic skinning, parametric clips, glTF export, meshopt compression, a contract manifest, a validator and a browser viewer connect, on a procedurally generated stand-in quadruped. The stand-in is not a creature and carries no art judgment.

## Run it

One-time: `npm install` inside `art/pipeline` (its own `package.json`, not a workspace package).

```
powershell -ExecutionPolicy Bypass -File art\pipeline\run.ps1     # from PowerShell
bash art/pipeline/run.sh                                          # from Git Bash
```

Both do the same three steps and exit nonzero if any fails:

1. Blender 5.2.2 in WSL Ubuntu (`blender/blender_stage.sh` runs `blender -b --factory-startup --python blender/export_asset.py --python-exit-code 1`): armature from the class spec, stand-in body, automatic weights, eleven baked clips, a `low` tier (collapse-decimated copy, weights re-limited), the side-view token, export to `out/standin.build/standin.raw.glb` plus `blender_facts.json`, `token.png`, `token.svg`.
2. Node (`contract/write_manifest.mjs`): lossless clip clean-up (`contract/lean_clips.mjs`), optional KTX2 (skipped unless `toktx` is on PATH), `gltf-transform meshopt --level high`, then `out/standin/standin.glb`, `token.png`, `token.svg` and `manifest.json`. The build record (Blender facts, timings) goes to `out/standin.build/build_record.json`, referenced by the manifest's `build` id.
3. `node contract/validate.mjs out/standin`.

Viewer: `node viewer/serve.mjs` then open `http://localhost:8765/viewer/?asset=../out/standin`. URL parameters: `asset` (folder relative to the page), `clip` (initial clip), `tier` (`full` or `low`; also the Tier selector, which shows the active tier's triangles), `t` (freeze at this many ms, for stills). The Phone button sets the canvas to 390 x 700. `node viewer/check.mjs` is the node-only check of the page's config and import map.

`out/` and `node_modules/` are gitignored.

## Files

| Path | What it is |
|---|---|
| `roster/classes/quadruped.json` | Skeleton class spec: modules (root, spine 5, neck_head 2+1, jaw, four 3-joint legs, tail 4, ears 2 each side, horn, sockets) with their parameters, plus stand-in body radii |
| `roster/README.md` | Joint naming rule, rest pose, axes, module parameters |
| `blender/rig_modules.py` | Module builders (pure Python plan) and `build_armature` (bpy). Sockets get custom property `xalians = {"socket": ...}` |
| `blender/standin_body.py` | Metaball capsules along the deform joints, converted, decimated to 6,000 triangles, smart UV, generated 1024 noise texture, heat weights limited to 4 and normalized; `make_low_tier` (Decimate COLLAPSE on a duplicate to 3,000 triangles, vertex groups kept, re-limited to 4 and normalized) |
| `blender/silhouette_token.py` | Token: rest-pose triangles rasterized side-on at 1024, filtered to 512, PNG written by hand (zlib), marching-squares contour simplified into the SVG path. numpy only |
| `blender/clips.py` | Eased key tracks and wave functions as clip code; `Poser` maps body parameters to joints and plants feet with an analytic two-joint solve; `bake_clip` keys every deform joint at 30 fps |
| `blender/export_asset.py` | Blender driver: build, bake, measure (bounds, max extent, reach at `hit`), export glb, write facts |
| `blender/blender_stage.sh` | WSL wrapper for the Blender step |
| `contract/manifest.schema.json` | JSON Schema 2020-12 for the manifest (contract section 3) |
| `contract/glb.mjs` | glb JSON-chunk reader and `measured` calculator (per tier, by tier node name) shared by the writer and the validator |
| `contract/png.mjs` | Minimal 8-bit RGBA PNG decoder for the token check |
| `contract/lean_clips.mjs` | Drops animation channels equal to the rest pose, resamples, moves the skinned mesh to the scene root |
| `contract/write_manifest.mjs` | KTX2 (when available), meshopt, token copy and manifest writer |
| `contract/validate.mjs` | The contract validator |
| `viewer/index.html`, `viewer/serve.mjs`, `viewer/check.mjs` | three.js 0.160.0 viewer, static server, node-only check |
| `run.ps1`, `run.sh` | Whole chain |

## What the validator checks

Schema (ajv, strict); sha256 of every listed file (glb, token.png, token.svg); Khronos glTF validator (zero errors; warnings printed); every manifest clip is an animation in the glb and the reverse; the ten required clips; every manifest socket is tagged on exactly one node (`extras.xalians.socket`); tier nodes have meshes; finish variants exist when `variants` is true; events inside their clip; archetype clips carry their section 6 events; every archetype in section 6 maps to an existing clip (warns when the mapped clip lacks that archetype's events); signatures name existing clips; every `measured` number equals what the file says; the root joint is at the origin and never translates in any clip (meshopt-decoded); glb clip durations match `durationMs`; the skinned rest mesh matches `bounds.rest` within 1 cm, nothing is below the ground, the built height matches `referenceCm` within 1 cm and sits in `bandCm`; the head socket is up (+Y) and forward (+Z) and `eye_l` is on +X; the low tier's bounds match the full tier within 2 cm and its skin weights sum to 1; `token.png` is 512 x 512 RGBA with transparent corners, 3 to 80 percent covered by a dark fill; `token.svg` has a traced path.

Negative tests run by hand on copies: a tampered manifest (wrong triangle count, missing `hurt`, duplicate socket, missing `launch`, archetype pointing at a missing clip) failed with 7 named failures; one appended byte failed on sha256 and fileBytes; a root translation injected into `sig.lunge` failed with "root translates by up to 0.3000 m". Each exited 1.

## Measured (2026-10-14, this laptop)

| | |
|---|---|
| Triangles | full 5,998, low 3,000 (1 draw call each, one shared material and texture) |
| Joints | 37 (29 deform; 8 non-deform: root, horn_01 and six socket joints) |
| Influences per vertex | 4 |
| glb | 333,164 bytes final (raw Blender export 863,816; both tiers included, 292,208 with full only) |
| Texture | 128,155 bytes (PNG 1024, not KTX2) |
| Clips | 11 clips, 32,491 bytes compressed |
| Size | built height 61 cm, `referenceCm` 61, band 48 to 66 |
| Blender | about 2.0 to 2.6 s inside Blender (build 0.25, bake 0.6, measure 0.35, export 0.8 to 1.2); about 7 s wall for the WSL call |
| Whole chain | 11.8 s via run.ps1 (including WSL start), 3 s via run.sh on a warm WSL |
| Token | `token.png` 3,260 bytes, `token.svg` 1,797 bytes (one loop, 128 points), 17 percent covered; read at 48 px as a four-legged animal with a tail and ears |
| Validator | PASS, 76 checks, 0 warnings |
| Determinism | two runs produced byte-identical glb (same sha256) |
| Viewer | headless Chrome 1200 x 800: loads both tiers (`?tier=low` shows 3,000 creature triangles, the selector switches back to 5,998), the low tier deforms with the same clips (checked in `sig.lunge` at 700 ms); earlier run at 390 x 700: 11 clips, 7 socket markers, 37 joints, 5,998 creature triangles, about 4.2 ms frame (vsync-capped 240 fps), events fire at their times |

## Does not work yet, or approximated

- **No KTX2 yet (step wired, skipped).** `write_manifest.mjs` runs `gltf-transform etc1s` before meshopt when `toktx` is on PATH and otherwise logs `KTX2: SKIPPED, toktx not found on PATH`. `toktx` is not installed on this machine (neither Windows nor WSL), and `@gltf-transform/cli` etc1s/uastc call it as an external program. Nothing was installed. See "KTX2" below. The viewer already loads `KHR_texture_basisu` through `KTX2Loader` with the transcoder at `cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/basis/`, but that path is untested because no KTX2 file exists yet; `--no-ktx2` forces the skip.
- **No preview, no sprites.** `preview.png` and atlases are absent; the manifest lists the glb, `token.png` and `token.svg`.
- **Low tier is plain decimation.** Collapse decimation to 3,000 triangles with interpolated weights, re-limited to 4 influences and normalized; shared UVs and texture. Not checked for deformation quality beyond a viewer look at one lunge pose, and no silhouette or UV-seam tuning.
- **Token is geometry-derived, not rendered.** Side view of the rest pose, facing right, rasterized in numpy from the full mesh triangles (no GPU, no Blender render), fit to 512 with a 28 px margin. The SVG is a Douglas-Peucker simplified (0.6 px) 50 percent contour, so it is a faithful but not smoothed outline. Near and far legs overlap in the side view, so the token shows two legs.
- **No finish variants.** `parameters.finish` declares only `standard` with `variants: false`; the contract's four `KHR_materials_variants` finishes are not built.
- **Act resolver totality is not checked.** The validator does not run section 6 over every compiled species; that needs `packages/content` and is listed as "not checked yet" on every run.
- **Socket tag shape.** The brief said a custom property `xalians_socket`; the contract (decision 4) says `extras.xalians.socket`. I followed the contract: the property is a group `xalians = {"socket": ...}`, which exports as `extras.xalians.socket`.
- **Archetype mappings are borrowed.** spit, spray, burst and aura play `act.light` or `act.heavy`, and brace, mend and focus play `guard`. Those clips now carry the events (`emit` at the same time as `hit` on both act clips; `recover` at 800 ms on `guard`), so there are no warnings, but the motion is the strike or guard motion, not a spit or a mend. Sustained `.start/.loop/.end` triplets do not exist.
- **Placeholder clip quality.** Every clip is a few eased keys, feet are planted by an analytic solve that is not a full IK (foot roll and toe contact are approximations), `faint` lets the legs pass through the floor, `move` is a treadmill walk with no foot-lock check, and nothing was judged for look.
- **Root channels are removed, not zero.** Channels identical to the rest pose (999 of 1,221, including every root channel) are dropped before compression, so "the root never translates" is true because the root has no translation track at all. The check would still catch a translating root (tested by injection).
- **reachM** is the horizontal distance of the `emitter` (mouth tip) socket at the `hit` frame, in place; `travel` distances (1.6 m lunge, 1.1 m per walk cycle) are chosen numbers, not measured.
- **footprintRadiusM** is the largest horizontal distance of any rest vertex from the origin (0.533 m, the tail tip), so it is generous for spacing.
- **three.js addons from jsDelivr.** cdnjs hosts three.js 0.160.0 core but not `examples/jsm` (404), so the import map takes `three` from cdnjs and `three/addons/` from `cdn.jsdelivr.net/npm/three@0.160.0`.
- **Frame time in the viewer** is a laptop number (Intel integrated graphics, vsync-capped) and says nothing about phones.
- The Blender exporter in 5.2 has built-in meshopt support; the chain uses gltf-transform as briefed.

## KTX2

KTX2 (etc1s) needs KTX-Software's `toktx` on PATH. It is a free download but a system install, so it was not installed here. To enable it: install KTX-Software v4.x from https://github.com/KhronosGroup/KTX-Software/releases (the Windows installer adds `toktx.exe` to PATH), open a new shell, check `toktx --version`, and run the chain again. `write_manifest.mjs` then runs `gltf-transform etc1s --quality 128` before meshopt, `textureBytes` is measured from the KTX2 image, and the viewer's KTX2Loader decodes it. The validator would also need a check that the glb declares `KHR_texture_basisu` (listed as "not checked yet").
