# Pass 5 (build B-sgkc): method change, decimate the sculpt instead of remeshing it

Output folder C:\dev\art-data\pipeline\codex-stream\luceras-gamemesh\pass5\, build id B-sgkc. BRIEF.md holds (budgets, bakes, weights, deliverables, checks, pose and bend renders), except the method below replaces its step 1.

## Why (audit N-kfhy)

Four passes of QuadriFlow plus local patches kept the overall shape, but every local repair (ear root, tail root, toe ends) added seams, pinches and dark bake artifacts: pass 4 has dark gashes at the tail root, a dark crack at the ear root and dark holes at two fore claw seats. QuadriFlow resamples the surface and the patches are joined back by hand. This pass does not remesh at all.

## Method

1. Start again from the approved sculpt C:\dev\art-data\pipeline\codex-stream\luceras-merge\revert-forelegs\luceras_sculpt.blend (blob d1203576...). Not from any earlier game mesh.
2. Body: reduce it with Blender's Decimate modifier in Collapse mode, symmetric on X, triangulate on, with a vertex-group density map so detail goes where the eye looks: weight 1.0 on the head, ears, horn bases, eyes' surroundings, muzzle, paws and toes, tail root and the first third of the tail; about 0.4 on the joints (shoulder, elbow, wrist, hip, stifle, hock, neck); about 0.1 on the flat flank, back, belly and thigh sides. Iterate the ratio until the whole creature is at or under 11,500 triangles (body about 9,000). Do not smooth, remesh or patch afterwards except to fix a clear fault, which you must name.
3. Horns, eyes, claws and dewclaws: decimate the same way (horns about 600 triangles each, silhouette first), whiskers removed as before.
4. Check the decimated body is still one closed manifold with no flipped or zero-area faces; fix only those.
5. Then UVs, bakes (normal and AO, with a cage or ray distance that leaves no dark misses; inspect the maps for dark patches and fix the bake, not the mesh), weights transfer with 4 influences, poses and bend checks, exactly as BRIEF.md says.

## Bar

At sprite size and the full-body cameras no visible loss; at the close cameras no dark spots, gashes, cracks, holes or pinches anywhere (ear root, tail root, claw seats included), and the ear, horn, toe and tail-root shapes match the sculpt. Render all checks from one saved gamemesh.blend, run the checklist, state the sha256, name what remains.

Slot lock owner "codex B-sgkc gamemesh". Cap 40 minutes; stop editing at 30 and spend the rest on renders and the report. When done, print the path of report.json and stop.
