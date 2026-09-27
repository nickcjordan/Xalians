# Species view packs

Status: proposed implementation plan, 2026-09-27. Nick has authorized planning and the Akinza reading, not approved their subjective interpretation. The [brief](species-view-packs-brief.md) governs this work. Progress and approval gates live in [the work record](species-view-packs-active-work.md).

Akinza pilot correction, 2026-09-27: Nick approved proceeding with shaggy ear hair and large, distinctive eyes interpreting the abstract squiggles. Its [reading](species-view-readings/akinza/reading.md) records his words. The later ruling below extends interpretive freedom to the full drawing; pack approval is still pending.

Superseding ruling, 2026-09-27: Nick said, "I don't think we should keep that rule in place because my images are always going to be an abstraction of what I actually want" in response to the exact source-overlap gate. Remove that gate and literal source-feature placement requirements for all species. The earlier 0.95 source score and 2% source-feature distance are diagnostic history only. The approved reading interprets the source. Continue enforcing consistency among generated views, artifact integrity, derived masks, and explicit approval. Do not spend further generation attempts optimizing source IoU.

## Outcome and boundaries

Produce registered, shaded gray references for all 30 species, with image-derived masks, reproducible checks, generation provenance, and Nick's explicit approval for each pack. Nick subsequently authorized the layered construction workflow in `species-construction-pipeline.md`, including provisional geometry probes and a rough-model checkpoint. This work does not create finished production models, animation, gameplay integration, or revised creature facts and abilities.

Use six views by default: front 0 degrees, front-left 45, left 90, back 180, right 270, front-right 315. Angles locate the camera around the stationary creature. Left and right always mean its own sides. Cameras remain level; one pose, scale, lighting treatment, and canvas size apply throughout a pack.

Generate only through Nick's subscription-backed ChatGPT or Codex image tool. No API key, paid image endpoint, local model fallback, or separate billing is part of this plan. If the subscription tool is unavailable or reaches a limit, retain the exact prompt and references and report the blocker. Read the image generation skill before the first generation call. Unknown model names or seeds remain null with an explanation, never invented.

## Source preparation and interpretation

The source SVG at `apps/web/src/svg/species/<key>.svg` wins over text and cached renders. Inspect it and `docs/species-templates/art/<key>.png`, plus the species record's appearance and lore. Hash all inputs with SHA-256. Rasterize the SVG without stretching, preserving its viewBox aspect ratio, and record the renderer and settings. A cached PNG is not automatically the measurement reference: verify it against the SVG first.

Before generation, write a short reading identifying observed features, proposed depth, attachment and overlap, and what each camera sees. This proposes an art interpretation, not new canon. Annotate each drawn feature and each visible part with a stable ID. Separate surface markings from background gaps between limbs or plumes. A white mark is not a hole through the body merely because the SVG renders it white.

Akinza's reading requires Nick's explicit approval before any image generation. Preserve the approved text and its hash. A material later change in attachment, pose, or anatomy reopens that approval. Plan merging, silence, tool success, and passing checks never count as approval.

## Folder layout

```text
art/species-views/
  README.md
  requirements.txt                 # Pillow and numpy; pin tested versions
  split_sheet.py
  mask.py
  register.py
  check.py
  contact.py
  manifest.schema.json
  tests/                          # synthetic fixtures, no generated candidates
docs/design/species-view-packs.md
docs/design/species-view-packs-active-work.md
docs/design/species-view-readings/<key>/reading.md
docs/design/species-view-packs-runs.md
untracked/species-views/<key>/run-0001/
  inputs/                         # immutable copies, reference raster, guides
  prompt.txt
  sheet.png                       # untouched tool output
  crops/                          # exact crops before registration
  views/                          # processed images and derived masks
  annotations.json
  manifest.json
  report.json
  overlays/
  contact.png
docs/species-templates/views/<key>/ # populated only after pack approval
  reading.md
  manifest.json
  annotations.json
  front.png                       # likewise for the other five views
  front.mask.png
  front.occupancy.png
  report.json
  overlays/
  contact.png
```

`untracked/` is already gitignored. The reviewable draft reading lives under design until a pack is approved, then the exact approved text is copied into its pack. No unapproved images enter the approved-pack directory. The committed run log retains every attempt's run number, date, tool metadata, settings, input/output hashes, result, and rejection reason; working image files remain local. Preserve the accepted original sheet, prompt, and processing recipe with the approved pack under `provenance/` so its derivation can be inspected without the local work folder.

## Generation and processing

1. Prepare one turnaround sheet with six fixed slots, enough horizontal room for the widest view, and alignment guides outside creature regions. Attach the source reference and the approved reading. Default final view canvas is 1024 by 1024, but retain the actual tool output size and avoid claiming that upscaling adds detail. Use a larger common canvas if a species cannot fit without clipping.
2. Request neutral mid-gray form, soft even light, orthographic views, no cast shadow, props, labels, or background. Use the brief's prompt skeleton with the interpreted pose and approved view notes. Anchor the design to the approved reading and accepted visual studies, without freezing the source outline. Guides are processing aids, not final image content.
3. Generate a small round of two candidates, one sheet per call if necessary. Each call gets its own provenance and verdict. Inspect failures before another round; change one documented cause where practical. Never borrow another species' anatomy as a style reference. The older art log demonstrates both reference leakage and why every failed run needs a record.
4. `split_sheet` uses explicit crop rectangles recorded against the original sheet. It rejects overlapping, out-of-bounds, clipped, missing, or duplicate slots. It does not infer that an arbitrary six-panel image has the correct angle order.
5. `mask` derives occupancy from alpha when trustworthy, otherwise from separation from the pure white background. Background threshold and cleanup settings are recorded. A second feature mask preserves the white drawn markings extracted from the candidate image. Keep occupancy and feature masks separate so eyes are not treated as empty anatomy. Reject ambiguous shading/mark separation for inspection rather than silently filling or deleting details.
6. `register` applies only uniform scale and translation to a view and all its annotations/masks together. It aligns height and the common ground row, recording the transform. It measures residual landmark mismatch; it cannot independently move head, limbs, or tail to force a pass. No rotation, mirroring, anisotropic stretch, or warping. Fit the full creature with margins; never crop an ear or tail to meet geometry.
7. `check` recomputes geometry from output pixels, validates measurements and evidence, and writes JSON plus overlays. It must not trust claimed success or target coordinates copied into a manifest. Preserve unregistered measurements alongside final ones.
8. Inspect every candidate for anatomy, feature identity, pose, shading, and occlusion. Only candidates that pass both numeric checks and evidence-backed inspection can reach Nick through `contact`. Failed and unresolved candidates stay in the work folder with their verdicts.
9. Present the source, six equal-scale views, masks, and overlays on a contact sheet. Labels belong on this review artifact, never on the deliverable views. Record Nick's response verbatim. Promote only the exact approved artifact hashes.

Do not paste the source silhouette or its feature cut-outs over a failed generated front mask to manufacture a pass. Masks must describe the delivered shaded image. Any image edit becomes a new candidate with provenance and all checks rerun.

## Geometry and checks

Pixel coordinates use the top-left origin, x rightward, y downward, zero-based rows, and inclusive occupied bounds. Figure height is `bottom - top + 1` of occupancy; ground row is the lowest supporting sole row for Akinza. Use the pack's common target figure height H as the tolerance denominator, independent of the abstract source proportions. For floating or limbless pilots, define the equivalent baseline and homologous landmarks in the reading; do not invent feet or knees.

| Check | Acceptance and evidence |
|---|---|
| File integrity | All six names and angles present exactly once; same canvas; valid nonempty PNGs and binary masks; no clipping; hashes match. |
| Front interpretation | Visual review against the source and approved reading. Source IoU is optional diagnostic data, never an acceptance gate. |
| Drawn features | Review the intended feature inventory against the approved reading. Interpret abstract marks; do not require exact source cutout shapes or source-feature positions. |
| Heights | Maximum minus minimum measured height across views is at most 0.01 H. |
| Landmark rows | For each homologous landmark, maximum minus minimum visible row is at most 0.015 H. Measure left and right shoulders, hips, knees, and soles separately when the pose is asymmetric, plus head/ear top and eye line. Occluded landmarks are explicitly marked occluded, not fabricated. |
| Ground row | All supporting sole rows share the target row after registration, allowing at most one pixel of raster rounding as a proposed implementation tolerance. Reject shifted or floating feet. |
| Front/back outline | Compare back occupancy with the horizontally reflected front occupancy, about the registered body axis, not independent bounding-box centers. Proposed conservative screen: IoU at least 0.95 and width differences at the annotated landmark rows at most 0.02 H. This extra threshold is provisional, not a new brief ruling. Any asymmetric exception needs a bounded region, source/reading evidence, and a specific expected projection before scoring; report full and region scores. |
| Counts and occlusion | The part inventory is constant. Per-view visible IDs plus explicitly occluded IDs reconcile with it. Missing, duplicated, or unexplained parts fail. A hidden part needs an identified occluder and image evidence. Do not demand both eyes in a profile. |
| Identity and pose | Evidence-backed visual review confirms the reading, no invented anatomy or recognizable substitute character, and no rearranged limbs, tail sweep, or ear attitude. |
| Rendering | Visual review checks gray form, even light, no cast shadow, text, props, guide remnants, perspective, or unexplained background. |
| Approval | Separate from candidate eligibility. Final pack completion requires Nick's dated, verbatim approval of the exact pack. |

The front overlay is red for source only, blue for candidate only, gray for overlap, and white for neither. Include a separate occupancy overlay and annotated feature correspondences so a high overall IoU cannot hide lost small features.

Pillow and numpy cannot reliably infer semantic anatomy from arbitrary generated shading. The automated gate therefore combines computed measurements with required image-linked annotations and a recorded visual inspection. Semantic claims are labeled reviewed, never machine-proven. Missing or uncertain evidence produces `blocked`, not `pass`; any `fail` or `blocked` result prevents review-sheet release. If reliable extraction or correspondence cannot be achieved during the pilot, report that concrete tooling limitation without relaxing the brief's thresholds.

## Manifest schema contract

Implement strict JSON Schema validation with required keys, closed view names, unique angles, bounded coordinates, lowercase 64-character SHA-256 strings, and explicit nullable metadata. The schema below is the field contract, not an already implemented validator.

| Field | Type and meaning |
|---|---|
| `schemaVersion`, `species`, `candidateId`, `status` | Strings; status is working, rejected, reviewable, or approved. |
| `sources` | Array of path, SHA-256, role, repository commit, and rasterization metadata when applicable. Includes SVG, record, and reading. |
| `reading` | Path, SHA-256, proposed/approved status, and `approval` (null until explicit approval). |
| `canvas` | Integer width and height; common ground row and reference figure height. |
| `generation` | Tool, model (nullable), model availability explanation, timestamp with timezone, exact prompt, input files and hashes in order, seed (nullable) and availability explanation, returned image path/hash, actual dimensions, and subscription route. Each view references the generation record that produced it. Edits append records. |
| `processing` | Tool code commit/hash, runtime and dependency versions, commands/settings, sheet crop rectangles, source and destination dimensions, per-view uniform scale and translation, mask thresholds and cleanup, all intermediate hashes. |
| `views` | Array of six objects: name, angle, image/mask/occupancy paths and hashes, canvas dimensions, ground row, measured figure height, bounding box, named landmark rows with visibility and evidence, feature correspondences, part IDs/occlusions, generation reference, and check results. |
| `checks` | Checker version, input hashes, timestamp, and per-check status (pass/fail/blocked), measured values, threshold, method (computed/reviewed), reviewer when relevant, and evidence paths/hashes. Includes report and overlay hashes. |
| `approval` | Null until Nick approves; then reviewer, exact words, date/time, message reference if available, approved reading hash, and digest of the immutable pack artifact inventory. |

Approval is not self-authenticating text generated by a script. Populate it only from Nick's actual response identifying the candidate. Any change to approved images, masks, reading, or relevant evidence invalidates the approval and creates a fresh candidate. Compute the inventory digest without mutable status/approval fields to avoid a circular manifest hash. Missing tool metadata is honestly unavailable; missing geometry or check evidence blocks review.

## Implementation and verification sequence

First submit this plan as a ready-for-review PR with auto-merge as the brief requests. Then submit the Akinza reading for Nick's approval. This initial handoff contains documents only, not a completed pipeline or pack.

After the reading gate, implement the five tools and schema together with small tests before evaluating the first generated candidates. Tests cover crop bounds and angle mapping; transparent and white backgrounds; preservation of feature cut-outs and narrow gaps; known scale/translation and rejection of warped geometry; IoU and tolerance boundaries; missing landmarks and unsupported occlusion claims; empty masks; reflected back comparison; stale hashes and approvals; and refusal to produce a review contact sheet for a failed candidate. Test contact-sheet layout with synthetic labeled fixtures. Inspect the real pilot output visually as well as running tests.

Akinza must pass the checks and receive Nick's approval. Only then select and read a contrasting body plan such as Thirstaserp or Neph, adapt the baseline/landmark handling with tests, and complete its pack. Only after both approved pilots, process remaining species in small groups with individual approval. Update the run log and work record at every round. No batch acceptance by silence and no claim of completion based on a passing test suite.
