# Pass 6 (build B-csbd): two local faults on the decimated mesh, nothing else

Base: your pass 5 result C:\dev\art-data\pipeline\codex-stream\luceras-gamemesh\pass5\gamemesh.blend (sha256 93228f29...). Output folder pass6\, build id B-csbd. BRIEF.md holds.

The orchestrator read pass 5: the decimation method worked. Ears, tail root, paws, toes and claws now match the sculpt with no seams, and the full body reads the same. Keep all of that exactly. Fix only:

1. The dark slit on the upper hind thigh (pass5\check_bend_tail_base.png, rest and landing columns, and the small mark in crouch): a geometric slit or folded sliver. Find the faces (zero-area, flipped, folded or overlapping), dissolve or rebuild just them so the surface is continuous, and check both thighs.
2. The small dark mark on the lower neck (check_head_three_quarter.png), at the one non-manifold edge your report found near the lower neck. Make the body one closed manifold with zero non-manifold edges.

Then scan the whole body for any other zero-area, flipped or folded faces and non-manifold edges and fix those the same way (report the counts before and after). Do not decimate again, do not smooth broadly, do not touch the horns, ears, paws or tail. Re-bake only if the fix changes the surface under the bake, re-run the weights on changed vertices, re-render all checks and bend checks from one saved gamemesh.blend, run the checklist, and write report.json with its sha256.

Slot lock owner "codex B-csbd gamemesh". Cap 20 minutes; stop editing at 13. When done, print the path of report.json and stop.
