# Fur step 12f independent review

Scope: review the 12f brief, saved renders and implementation without modifying the model or running Blender. This is an agent review, not Nick's approval.

## First saved candidate

Inspected the first candidate's `ears-front.png` and `ear-root-close.png` at their full 1024-pixel size against the right panel of `12b2-ears-front.png`. Those candidate images are preserved in `untracked/species-construction/akinza/surface/fur-steps/12f-initial-review/`. The exact s12e-fix comparison and saved artifact sweep were pending at this inspection.

- F12F-R1, open: The tuft is clearly visible at normal framing, but reads as a broad triangular white insert with a nearly straight blue/white frontier, especially on image-left. The close render shows a dense, nearly planar curtain of parallel strands with a sharply curled lower edge. This does not yet express separated soft locks with blue visible between their thinning tips. Correction: vary length and curvature in spatial groups, creating gaps between long tips while retaining a dense root. Acceptance: visible white lower-ear furnishing at normal framing, with irregular soft locks and blue visible between their tips.
- No blue temple leak is visible in these two renders. Upper ear blue remains visible. This visual observation does not replace saved held-data equality.
- Artifact guard remains unverified until full saved skin and obstacle evidence, the unchanged 12d analyzer and before/after per-region comparison complete. No result should be inferred from the builder's exact centerline crossing rejection alone.

Subsequently inspected exact s12e-fix native before images in `fur-steps/12f-before/` at full size. They confirm the visible broad fan is new and localized to the lower inner-ear furnishing area. The sparse baseline root hairs do not read as a tuft at normal framing. F12F-R1 remains open.

## Guard code review

Reviewed `guard_tuft_paths_12f.py` and the revised builder before their third invocation. The guard recomputes selected skin path evidence, compares unchanged analyzer flags per curve and per flag, restores selected paths and nearby selected causes, and repeats. The caller restores their radius, color-mask and strand-length attributes too. No blocking static defect found. Obstacle evidence is copied from baseline during this preliminary guard, so the required final saved sweep must independently recompute obstacle evidence. The fixed spatial region classifier labels ears at z above .65; the narrower band reduces head-limit conflicts, and the guard still checks actual nearest-skin classifications.

Next review: inspect the guarded revised surface at normal and close framing, exact before/after panels and current-state views; verify the final saved artifact result and held-data check.

## Third invocation

Inspected revised native `ears-front.png` and `ear-root-close.png` at full size against the exact before images. F12F-R1 remains open: irregular tip boundaries and blue gaps improve on the first candidate, but the close still shows nearly parallel vertical columns, a blunt lower shelf and a faint rectangular curtain footprint. At normal framing the reduced furnishing is visible as a narrow pale strip immediately alongside the head, rather than a substantial fan across the lower blue cup. The temples remain white. The builder queued a fourth invocation to address coverage and planarity; that result requires a fresh review.

## Fourth and final permitted invocation

Inspected final `s12f/r/ears-front.png` and `s12f/r/ear-root-close.png` at full 1024-pixel size against exact s12e-fix before images. These observations supersede the earlier candidate assessments for the deliverable.

- F12F-R1, still open: The white furnishing is visible at normal framing and is broader and denser than invocation three. It remains a compact pleated wedge alongside the head, especially on image-right, rather than long soft locks broadly fanning across the lower blue cup. In the close view, wispy tips and blue gaps improve the fringe, but the central mass retains nearly parallel strands and a blunt horizontal lower edge, giving a translucent curtain or brush footprint. The requested soft lock structure is only partly achieved. A future authorized revision would need true spatial clumping with irregular root-band boundaries and a broader outward fan, followed by another unchanged artifact sweep. The brief permits no more model tries in this step, and all four invocations have been used.
- The new furnishing is visible without a close crop. Blue still shows between irregular thin tips. The upper blue ear and white temples remain visible. No blue skull leak is apparent in these two views.
- This is a partial visual result at the explicit try cap, not a quality approval. Saved protection, final artifact metrics and remaining current-state renders are being completed by the builder; they were not inferred from these two views.

## Complete image-delivery review

Inspected final native head-side, head-backq, body-backq, body-front and tails-side images at full size, then inspected both exact delivered before/after pairs at original size. The head-side tuft presents an upright narrow ribbon, supporting F12F-R1. No additional visible regression in the held face, skull, neck, chest, body, feet or tails was identified. Existing tail volume differences and root transitions remain held work, not a new 12f correction or a whole-creature approval.

Verified all eight exact requested output filenames under `untracked/species-construction/akinza/surface/fur-steps/`:

| File | Dimensions | Verification |
| --- | --- | --- |
| `12f-ears-front.png` | 2048 x 703 | Exact s12e-fix native pixels left, final native pixels right, 36-pixel label band |
| `12f-ear-root-close.png` | 2048 x 1060 | Exact s12e-fix native pixels left, final native pixels right, 36-pixel label band |
| `current-ears-front.png` | 1024 x 667 | Pixel-identical to final native render |
| `current-head-side.png` | 1024 x 1024 | Pixel-identical to final native render |
| `current-head-backq.png` | 1024 x 1024 | Pixel-identical to final native render |
| `current-body-backq.png` | 768 x 1024 | Pixel-identical to final native render |
| `current-body-front.png` | 768 x 1024 | Pixel-identical to final native render |
| `current-tails-side.png` | 1024 x 1024 | Pixel-identical to final native render |

The current-state images are single panels. The two pairs identify before and now correctly. Image-delivery review is complete; final saved metrics and protection evidence remain pending.

## Final saved verification

Read `s12f/metrics.json`, the saved protection report and final protection/obstacle logs. Independently compared final and s12e-fix saved `sweep-flags.npz` arrays with Python. Every unchanged 12d flag has zero newly flagged curve IDs, the spatial region arrays are identical and all per-region counts are equal or lower. Because there are no newly flagged curves, the final result cannot introduce a new flagged spatial cluster under those rules. Collision flags remain zero. The final obstacle sweep completed independently of the preliminary guard.

| Flag | Before | Final | Newly flagged curves |
| --- | ---: | ---: | ---: |
| Collision | 0 | 0 | 0 |
| Neighbor length | 207 | 76 | 0 |
| Regional length | 2103 | 2067 | 0 |
| Part transfer | 1720 | 1707 | 0 |
| Lift | 112 | 104 | 0 |

The saved patch contains 2,689 changed furnishing curves. `saved-protection-check.json` reports held-data equality and the final log records `SAVED_PROTECTION_PASS`; the reviewed verifier compares held mesh geometry/attributes/topology/materials, material graphs, roots, curve layout and unmodified hair attributes between saved files. These checks support preserved scope and the artifact gate, not soft-fur quality.

Final assessment: all requested images are present, correctly assembled and inspected; held-data and no-new-artifact checks pass. F12F-R1 remains open at the explicit four-invocation limit. The final tuft is visible and has thin blue-separated tips, but retains a compact curtain-like central structure and limited fan coverage. This is a documented partial visual outcome with no further model save authorized by this brief, not an agent approval of the requested fennec quality.
