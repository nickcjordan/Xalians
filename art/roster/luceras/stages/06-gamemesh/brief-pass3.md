# Pass 3 (build B-db8w): finish pass 2

Your pass 2 was cut off by a usage limit after saving C:\dev\art-data\pipeline\codex-stream\luceras-gamemesh\pass2\gamemesh.blend (11,492 triangles, re-baked normal and AO at 21:53), but before re-rendering the checks: the check_*.png, pose_grid.png and report.json in pass2\ are from an earlier iteration. Work in pass3\ with build id B-db8w. BRIEF.md and PASS2.md still hold.

1. Copy pass2\gamemesh.blend into pass3\ and render every check from it first (check_sprite, check_full_side, check_full_three_quarter, check_head_three_quarter, check_hind_paw_side, check_ear_three_quarter, check_ear_side, check_horn_silhouette_side, pose_grid, wire_full_side, wire_full_three_quarter), with the game mesh using its baked normal map.
2. Run the critic checklist on them and write it into iter_notes.json: ear rim smooth and root closed; horn silhouette smooth; four toe tips and four claws per paw readable; muzzle; any hole, spike, dark spot or floating piece; anything else that reads differently from the sculpt at the close cameras or at sprite size.
3. Fix what the checklist finds, if anything, within the 11,500 triangle budget, re-bake and re-render.
4. Joints: the mesh is triangulated, so instead of counting edge rings, verify deformation directly: render the four poses close on each bend (shoulder, elbow, wrist, hip, stifle, hock, neck, tail base) for the game mesh beside the sculpt, measure volume change per joint region, and fix any pinch, collapse or spike by adding density across that bend.
5. Deliver everything BRIEF.md lists in pass3\, all from one saved gamemesh.blend (state its sha256 in report.json), and a complete report.json.

Slot lock owner "codex B-db8w gamemesh". Cap 45 minutes; stop editing at 35 and spend the rest on the final renders and the report. When done, print the path of report.json and stop.
