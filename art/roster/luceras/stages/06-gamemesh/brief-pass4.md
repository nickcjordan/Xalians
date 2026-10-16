# Pass 4 (build B-8xwt): three geometry faults and the fore paw facets

Base: your pass 3 result C:\dev\art-data\pipeline\codex-stream\luceras-gamemesh\pass3\gamemesh.blend (sha256 717ba697...). Output folder pass4\, build id B-8xwt. BRIEF.md holds.

The orchestrator read pass 3: no visible loss at sprite size or at the full-body cameras; ear rim and horn silhouette are fixed. Fix only these, and nothing else:

1. Tail root: a step on the underside where the tail leaves the rump (check_bend_tail_base.png, every pose, most visible in rest and landing). Make the underside one smooth curve from rump to tail, as on the sculpt, with enough rings across the root that it bends without a crease.
2. Ear root: the closed root has a flat bridge where the sculpt has a notch behind the ear, and a small dark patch in the normal bake there. Shape the root to follow the sculpt and re-bake so the patch is gone.
3. Fore paws: the claw seats and toe ends are faceted and the claws look angular and overexposed (check_fore_paw_l_three_quarter.png). Smooth the shading there (density or normals) so the toes read rounded like the sculpt.

Use the spare budget (about 500 triangles, total at most 12,000 hard and 11,800 target). Re-bake normal and AO, re-run the weights transfer, re-render all checks, the pose grid and the bend checks from one saved gamemesh.blend, run the checklist, and write report.json with its sha256. Name what remains.

Slot lock owner "codex B-8xwt gamemesh". Cap 30 minutes; stop editing at 22 and spend the rest on renders and the report. When done, print the path of report.json and stop.
