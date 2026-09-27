# Species view packs: active work

Updated 2026-09-27.

## Intended outcome and authorized scope

Nick requested the layer described in `species-view-packs-brief.md`: tooling and individually approved registered view packs for 30 species. Start with the plan PR, then Akinza's written reading and Nick's approval before generating any image. Subscription generation only, no paid API or key, no coauthor trailers, American English, no em dashes. Approval must be in Nick's own words.

Scope extension, 2026-09-27: Nick approved implementing the proposed layered system and exercising it with Akinza: "Sounds great. Can you put that system in place via Markdown files and whatever else you feel makes sense? Then dive in and see if you can exercise it with this creature". This includes construction documentation, structured decisions, dependency checks, new image studies and a provisional rough-geometry checkpoint. It does not approve their subjective quality. Operational entry point: `species-construction/WORKFLOW.md`.

## Completion criteria

- The plan describes workflow, folder layout, manifest contract, checks and thresholds and is submitted in a ready PR.
- Akinza's reading is explicitly approved before generation.
- Tools have focused tests; each candidate has provenance, derived masks, geometry, check report and overlays.
- Akinza and a contrasting body-plan pilot pass all checks and each receive explicit pack approval before batching.
- Each of the remaining packs passes and receives individual approval. Only approved packs enter `docs/species-templates/views/`.
- The construction system has reusable instructions, a safe species initializer, evidence/dependency tracking and an exercised Akinza path from images through a local geometry probe. Final creature modeling remains gated by approved coherent construction evidence.

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
- Nick rejected the clarity of run-0005's junction: two plumes seem to appear behind the attached tail. He requested a blended trunk-and-branches connection and less pronounced buttock form. Updated the reading directly from this instruction, without reopening the already approved spinal attachment.
- Run-0006 made only a modest improvement, so continued to run-0007. The latest study has three visible plume stems joining a common trunk and a narrower, flatter rear pelvis. Saved both attempts with prompts, input/output hashes, masks, registration and diagnostic reports. No final approval or full-pack pass is claimed.
- Added initial crop, mask, uniform registration, diagnostic check, and gated contact tools under `art/species-views/`. Nine focused tests pass. White-background occupancy fills only explicitly annotated surface regions, preserving arm gaps.
- These are diagnostic tools, not a complete production validator. Draft strict schemas, manifest validation, replay checks, part inventories, and body-axis checks now exist locally but are not fully tested or integrated. Reconcile their old source-feature exception logic with Nick's general interpretive ruling before promoting them. The checker explicitly blocks promotion until production gaps are resolved.
- The first two sheets have cross-view pose problems and overlapping view bounds that prevent trustworthy rectangular crops. Source-overlap scores from the front experiments are historical diagnostics only after Nick removed the exact-source requirement. No eligible final contact sheet or approved pack exists.
- Nick accepted run-0007's tail junction and reduced rear-form direction with "yeah thats better, proceed". This authorizes carrying that direction forward, not marking a complete six-view pack approved.
- Generated run-0008, a six-view gray sheet using the preferred style and accepted back study. Saved the prompt, input snapshots, crops, derived masks, registration and diagnostic report locally. Nick called the six-image strip a good start. Cross-view tail direction, occlusion, and pose still need reconciliation.
- Generated run-0009 as a tighter source-front experiment before Nick removed the exact-source rule. Preserve its provenance as an experiment, not a new preferred design. Do not continue optimizing source overlap.
- Nick said, "I don't think we should keep that rule in place because my images are always going to be an abstraction of what I actually want". Updated the brief, plan, reading and source-comparison checks so source IoU and literal feature positions are diagnostic only. Identity and generated-view consistency still matter.
- Nick requested recommendations for defined iterative layers from the silhouette through visual references to 3D. Inspected the checked-in spec-driven Blender builder and saved `species-construction-pipeline.md` as a proposal. It adds construction views, attachment studies, structured decisions, and a proposed rough-model render/compare loop. No new 3D scope or pipeline implementation is approved by this document.
- No creature record, source silhouette, platform policy, or approved-pack directory was changed.
- Implemented `art/species-construction/`: species initialization, six-stage tracking, hash-bound reviews/approvals, input-change invalidation, a parameterized Blender attachment probe, and review/mask export. Added workflow, species brief template, handoff contract, Akinza decision register, attachment graph, versioned probe spec and review notes.
- Generated construction study-0001 and attachment study-0002 through the subscription tool. Both are retained with exact prompts and immutable input snapshots. Visual review rejected them as coherent geometric constraints: profile/top projections are unreliable, and the second study regresses on rear-body shaping. The first remains a useful modeling-pose proposal.
- Built Akinza probe-0001 with the existing local Blender 5.2.2 installation. It is one connected closed tail/pelvis mesh with 16,778 vertices and zero nonmanifold edges. Exported eleven actual camera renders, eleven alpha-derived occupancy masks, camera matrices, a three-view contact and eight-angle turntable. Volumes use arbitrary provisional dimensions. No full creature, final topology or approved art is claimed.
- Committed-design preview locations are `species-construction/akinza/evidence/`; these are labeled provisional technical review artifacts. Full working images and the Blender scene remain under gitignored `untracked/species-construction/akinza/`. Committed provenance explicitly records these local dependencies; missing local originals block integrity checks on another checkout.
- Validation: 12 construction tracker/initializer tests and 10 existing view-tool tests pass. The source-overlap regression confirms that low source IoU is diagnostic only; a portability test covers Git line-ending conversion. Live Akinza artifact integrity passes while every release gate remains blocked, as intended. Prior untracked production-validator drafts and their dependency edit remain preserved locally and excluded from this system PR until completed and tested.
- Opened ready PR #707, https://github.com/nickcjordan/Xalians/pull/707, and enabled auto-merge. Repository CI is checking the implementation. A PR merge is not art approval.
- PR #707 merged. Continued on `codex/akinza-fuller-tails` from fresh main, preserving the prior unfinished validator drafts locally.
- Nick rejected probe-0001's flat volume: "It should feel fuller what you built is too flat, It should look closer to three cattails than whatever fork-looking thing you have there". Updated the reading and `tail-depth` decision to require fuller rounded volumes. Root, common junction and restrained pelvis remain the accepted direction.
- Built probe-0002 from a separate versioned spec, using round cross sections, sustained thickness, softer tips and front-back separation. Preserved the rejected earlier probe. The new mesh has one connected component, zero nonmanifold edges and 36,834 vertices. Eleven renders and eleven derived masks are unclipped. Whole-probe side width and overhead depth are each about 1.58 times the earlier probe at the same orthographic scale; these are screen-space diagnostics, not anatomy measurements.
- Saved new camera/connectivity records, masks, technical contact and turntable. All new geometry artifact hashes verify. Earlier image-study snapshots remain stale under the changed tail direction, and production release remains blocked. No new artwork is marked approved.

## Next unfinished action

Present probe-0002's full rounded cattail-like volumes for Nick's review. Do not reopen the rejected flat-fan option or ask again where the root attaches. Carry accepted shape feedback into corrected construction references and the full rough-model loop; the proposed modeling pose also still needs review. Finish production-pack validation before presenting an eligible final pack; prior draft validator code remains unfinished local work. The full pack and overall 30-species task remain incomplete until their explicit approvals.
