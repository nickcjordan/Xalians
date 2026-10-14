# Budget scene (part 2 of the creature pipeline design)

`budget-scene.html` is a throwaway load test, not art: twelve procedurally built skinned stand-in creatures (six-joint spine, four rigid legs, a tail, a procedural texture) animated every frame with three.js 0.152.2 from cdnjs. Its sweep steps through nine presets (creature count, triangles each, lit or toon shading, inverted-hull outline, texture size) for four seconds each and reports the median frame time, draw calls and triangle count, plus the device's GPU string. It is published as an Artifact page for Nick's phone; the numbers it returns set the per-creature budgets in `docs/design/creature-pipeline-design.md` decision 2.

Measured on this laptop in headless Chrome (ANGLE on Intel integrated graphics, pixel ratio 1, 500 by 635): every preset held the 238 fps cap, including 24 creatures at 10K triangles (425K triangles, 145 draw calls). The phone numbers are the ones that matter.
