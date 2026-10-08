# Akinza surface phase: plan

2026-10-08. Nick ruled the construction phase at diminishing returns after round 33 and approved moving to textures (one capped ear-outline pass first, round 34 and at most 35), with no stop for review of this plan. This plan starts from `surface-backlog.md` and the surface row of `docs/design/species-construction-pipeline.md` (layer 6).

## What exists

- The construction model is a single remeshed skin with material slots per polygon: clay, the pale inner-ear coat (assigned by the fan step and carried by `carry_materials_field.py`), a separate nose object, and iris meshes with a per-corner `IrisColor` attribute. No UVs, no image textures, no shaders beyond flat Principled grays, no hair of any kind.
- The deliverable of a creature is rendered frames: both animation pipelines render transparent PNG sprite sheets in the `xalians-frame-atlas-v1` format, and games need no 3D runtime (`docs/design/creature-animation-agent-handoff.md`). The GLB handoff is a geometry reference with no final UVs.
- All references (the sheet, `r01` to `r04`, the studies) are grayscale. They show fine fur strands with fluffy, broken edges on every coat mass, a pale inner coat in the ear cups, a dark glossy nose, large dark irises with a catch light, and a bold dark eye outline.

## Decisions

| # | Decision | Why | Confidence |
|---|---|---|---|
| 1 | The surface is built at render time in Blender (Geometry Nodes hair curves plus procedural shaders on object and attribute coordinates), with no UV unwrap. | The deliverable is rendered frames, the skin is a remesh that would need a fresh unwrap after every geometry change, and procedural surfaces follow the mesh for free. A UV and baked-texture path can be added later for a real-time 3D target if one appears. | 80%, reverses if a game needs a real-time 3D creature |
| 2 | Fur is real strands (hair curves), not only a shader. | The references' defining surface feature is the broken, fluffy outline; a shader cannot change the silhouette. Nick's ruling moved the fur detail out of the modeled locks and into this phase. | 85% |
| 3 | First pass is grayscale, matched to the grayscale references. Coat color, markings and eye color are a separate pass with Nick, shown as rendered options. | No color reference exists, and color is a taste call the loop cannot make (the pipeline doc: a color pass needs its own agreed scope). | 90% |
| 4 | Regions come from the existing species zones (`loop/species.json` zones R01 to R12): each zone sets fur length, density, clumping and comb direction, blended across zone borders. | The zones already exist, are measured, and match the rubric regions the readers know. | 80% |
| 5 | Judged by the same blind readers against the references, plus a surface checklist, and by Nick on rendered pictures. No critic-score ratchet. | The reader keep worked; the critic scores proved noisy (round 33 moved parts 1 to 2 points with no change). | 75% |
| 6 | Render budget: a full packet of surface views must render in under 20 minutes on this laptop, and GPU memory stays under 6.5 GB. | The no-training-on-the-laptop rule and the loop's round times. Strand counts and render samples are capped to hold this. | 70%, set after the first measured render |

## Steps

1. **Surface rig script** (`art/species-construction/surface/build_surface.py`): loads an assembly's `akinza.blend`, writes per-vertex attributes from the zones (`fur_length`, `fur_density`, `clump`, `pale`, `comb` direction), adds a Geometry Nodes hair system (distribute on faces by density, curves combed along `comb` with noise and clumping, length from `fur_length`, thinning at the tips), a hair material (Principled Hair, grayscale melanin, pale where `pale` is set), a skin material under the fur (a little darker so gaps read), and the eye, nose and pad materials (dark glossy nose and pads; large dark iris with a catch light; the bold outline kept). Output: `surface.blend` beside the assembly. Never edits the construction mesh.
2. **Surface renders**: the packet cameras (`render_details.py` views and the sheet views) rendered with the surface, written as a surface packet beside the construction packet, with one fixed light rig and no lighting baked into albedo.
3. **Surface checklist** (`loop/surface-rubric.json`): S01 every coat mass has fine strands and a broken, soft outline; S02 the pale inner coat fills the ear cups and chest; S03 strands follow the reference flow (ears radiate from the roots, body and limbs fall downward, tails run along their length); S04 no bald patches, no strands through the eyes, nose or claws, no clumps poking through other parts; S05 eyes read as the reference (large dark iris, catch light, bold outline); S06 the fur adds at most a set margin to the clay silhouette (measured, not judged); S07 the render budget holds.
4. **First build and tune**: build on the current baseline, render, and tune by hand until S01 to S07 hold to my own check, then run three blind readers on surface packs against the references.
5. **Show Nick**: front, three-quarter, back and a close head view of the furred model on the artifact page, beside the clay model and the reference.
6. **Color pass with Nick**: three to four coat palettes (with Akinza's ice element in mind) rendered on the furred model, for him to pick from. Markings only if he wants them.
7. **Hand into the animation pipeline**: confirm the surface survives the rig's deformation and renders in the sprite-sheet cameras.

## Stop rules and cost

- The loop's automatic rounds stay off during this phase; surface work runs as directed builds with reader checks, each reported with its time and tokens.
- If strands cannot hold the render budget at a density that reads as fur, fall back to shell fur (stacked offset shells with a strand-masked shader) for the body and keep strands only on the ears, cheeks and tails.
- Geometry problems found while texturing (a part the fur makes worse) go back to the construction loop as a single order, not a reopened phase.
