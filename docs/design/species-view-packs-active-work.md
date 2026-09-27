# Species view packs: active work

Updated 2026-09-27.

## Intended outcome and authorized scope

Nick requested the layer described in `species-view-packs-brief.md`: tooling and individually approved registered view packs for 30 species. Start with the plan PR, then Akinza's written reading and Nick's approval before generating any image. Subscription generation only, no paid API or key, no coauthor trailers, American English, no em dashes. Approval must be in Nick's own words.

## Completion criteria

- The plan describes workflow, folder layout, manifest contract, checks and thresholds and is submitted in a ready PR.
- Akinza's reading is explicitly approved before generation.
- Tools have focused tests; each candidate has provenance, derived masks, geometry, check report and overlays.
- Akinza and a contrasting body-plan pilot pass all checks and each receive explicit pack approval before batching.
- Each of the remaining packs passes and receives individual approval. Only approved packs enter `docs/species-templates/views/`.

## Evidence and current status

- Read the full brief from `docs/species-view-packs-brief`; verified PR #696 merged into main.
- Reused the clean session checkout and branched `codex/species-view-packs` from freshly fetched `origin/main`.
- Read repository guidance, species record and source SVG; inspected the existing Akinza PNG. Read the earlier art pipeline log for run tracking and failure lessons.
- Wrote the proposed plan in `species-view-packs.md`. Numeric checks and reviewed semantic evidence are explicitly distinguished.
- Opened ready-for-review PR #697, https://github.com/nickcjordan/Xalians/pull/697, and enabled auto-merge as requested by the brief. Merging documents is not art approval.
- PR #697 merged. Continued from fresh main on `codex/akinza-view-pilot`.
- Nick approved trying the initial reading with corrections: the ear outline means shaggy hair, and the eye squiggles are an abstraction for large, distinctive eyes. His exact words are recorded in the reading.
- Generated two six-view sheets and two front-only diagnostic experiments through the built-in subscription tool. No paid API, key, or local image model was used. Working outputs and exact prompt/input records are under `untracked/species-views/akinza/run-0001` through `run-0004`.
- Nick prefers run-0001 over run-0002. This is a style preference, not pack approval. Continue from the first round's softer appearance and large oval eyes.
- Nick identified an odd tail attachment in the back view, then explicitly confirmed the correction: "yes The tail should be coming from the base of the spine, like every real animal's tail does". The reading records one root on the rear centerline at the base of the spine, with a short common base bending left before the three plumes fan out.
- Generated run-0005 as a single corrected back-view study using the preferred first sheet as its only image reference. Visual inspection finds a shared central spinal root and three plumes. Saved the original, derived masks, registered back, exact prompt, input hashes and diagnostic report locally, with a committed run metadata snapshot. This is not a passing pack or an approved image.
- Added initial crop, mask, uniform registration, diagnostic check, and gated contact tools under `art/species-views/`. Nine focused tests pass. White-background occupancy fills only explicitly annotated surface regions, preserving arm gaps.
- These are diagnostic tools, not a complete production validator. Strict manifest validation, independent source annotation inventories, binding the eye exception, part inventory validation, and body-axis projection checks remain unfinished. The checker explicitly blocks promotion until those gaps are resolved.
- The first two sheets fail visual checks for source proportions and cross-view pose; overlapping view bounds prevent trustworthy rectangular crops. The front-only experiments score approximately 0.9264 and 0.7042 occupancy IoU under the recorded normalization, below the required 0.95. These are diagnostic scores, not final certified comparisons. No reviewable contact sheet or approved pack exists.
- No creature record, source silhouette, platform policy, or approved-pack directory was changed.

## Next unfinished action

The corrected attachment study is available for Nick's image feedback; the attachment interpretation itself is explicitly approved and must not be asked again. Preserve run-0001's preferred style and the spinal root while reconciling the front source proportions and all six views. Complete the production validation gaps listed above before presenting an eligible contact sheet. No image or pack is approved yet. The overall task remains incomplete until all required individual approvals.
