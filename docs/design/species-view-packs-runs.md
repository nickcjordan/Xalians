# Species view pack run log

All four initial attempts used the built-in `image_gen.imagegen` tool through the Codex subscription on 2026-09-27. Model and seed were not exposed. No paid API or key was used. Each local run contains its exact prompt, input snapshots, manifest and report under `untracked/species-views/akinza/`. Committed metadata snapshots are in `species-view-run-records/`. Images remain working candidates, not approved pack assets.

| Run | Experiment | Evidence and verdict |
|---|---|---|
| akinza/run-0001 | Six-view sheet from the SVG-derived reference, incorporating the approved shaggy-ear and abstract-eye correction | Nick preferred this style over run-0002. Rejected as a registered pack: plume proportions differ from the source, pose changes across angles, and neighboring view bounds overlap. Later back-view feedback identifies an odd tail attachment. |
| akinza/run-0002 | Six-slot template with the source silhouette anchoring the front | Source proportions and pose still drift. Tail fan and body relationship remain incorrect. Nick explicitly prefers run-0001. Rejected. |
| akinza/run-0003 | Front-only contour-preservation diagnostic | Closer to the source shape, but normalized occupancy IoU is 0.9264, below 0.95. Output touches the original canvas edges. This is not an accepted front, and its style is not the selected style reference. |
| akinza/run-0004 | Front-only correction using run-0001 as the preferred style and a padded source-shape reference | Generated before Nick's root-placement feedback, so it is not the corrected back view. Diagnostic occupancy IoU is 0.7042. Rejected; no pack approval. |

The standalone front comparisons use uniform scale and translation only, with explicit source head-surface regions for occupancy and no mask replacement from the reference. These preliminary measurements do not certify feature identity or correct mask semantics. Exact settings and overlays stay with each local diagnostic folder. Raw subscription-tool results appeared in the chat as generation previews; no passing review contact sheet was produced.

Current design correction: distinguish the central rear tail attachment from the lateral point where its plume fan emerges from behind the hip in the front silhouette. The reading contains the proposed correction and Nick's exact feedback. Await its confirmation before generating a corrected back view.
