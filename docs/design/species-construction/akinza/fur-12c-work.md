# Akinza fur step 12c work record

Outcome: natural continuous growth from the approved rear-head flow outward toward the ears, through the ear-head junction and along the ear surfaces; inspect and repair body direction seams.
Authorization: execute briefs/12c.md exactly. Build on s12b (13fbcb90), at most four tries. Direction only. Hold assembled-3300 geometry, T7, soles, muzzle, eye/nose coverage, central rear-head flow, inner-ear blue mask, chest/armpit/rib texture and tail plume volume. Commit explicit paths only, no push. Claude reviews the result afterward; this record does not approve the art or close the broader Akinza project.

## Current result and remaining work

Four builds exhausted. The result is a visible partial improvement with unresolved direction defects and a visible ear regression. All four requested before/after pairs are present, before left and now right, 1024 pixels per close view and 768 by1024 per full-body view. The builder and an independent scoped reviewer inspected every view at full size.

Surface: `untracked/species-construction/akinza/surface/fur-steps/s12c/surface.blend`.
Pairs in that parent fur-steps directory: `12c-head-backq.png`, `12c-head-side.png`, `12c-ear-back-close.png`, `12c-body-backq.png`.
Metrics: `fur-12c-direction-clashes.json` beside this record, also in fur-steps.

Changed regions: lateral skull, ear roots, ear fronts and backs, thick hip skin above the tail roots. The broad hip mask also makes small incidental direction shifts on rear forearms; no arm improvement is claimed.

The upper ear-root curtain visibly blends outward more naturally, and the lower temple fork is less pinched. The hip coat lies downward more coherently. Central crown/nape flow, color, muzzle, eye border, paws, established tail plumes and forearm appearance show no visible regression.

Unresolved findings:
- F002: lower diagonal ear-root part, crossed ear-back strands and upright rim bristles remain. Further correction needs another explicitly authorized build after review.
- F003: the central hip radial bloom remains visible despite the large reduction in upward-pointing roots. Do not use that metric as proof of a complete visual repair. Further direction refinement needs another authorized build.
- F004: new regression, several long white hairs cross the upper blue ear cup and the white rim looks bristlier. The blue sheet mask itself is unchanged. Further correction needs another authorized build.
- F005: bulky tail-root transition remains; volume work belongs to step12e and was explicitly held here.

The four-try limit prevents another corrective surface build. No fifth try was made. Delivery work completed: the eight explicit step paths were committed separately with subject `Akinza fur step 12c: fan head fur toward ears and comb hip roots downward`; s12b was archived after that commit. The final audit verifies this capped, visually blocked result. No surface repair remains authorized within this brief. Next is orchestrator review; further repair needs authorization beyond the four-try cap.

## Attempts and evidence

| Try | Change | Actual result |
|---|---|---|
|1|Laterally varying source field and tangent diffusion across skull and ears.|Upper root curtain improved, but ear-back clash rose25.605% to49.559%. Rejected. One rear-head image retained in archive.|
|2|Rotate copied guided curves toward their comb using sampled first tangent.|Ear-back clash23.724%, but709 actual strands still substantially reverse. No completed render claimed.|
|3|Explicit first-point ordering; downward thick-hip flow using the existing tail tube thickness mask.|Ordering change did not improve the head. Hip upward roots13.549% to.0137%. No completed render claimed.|
|4|Correct only guided points30 to60 degrees against the comb, using their carried root/normal; fade hip correction to zero by tube factor.99.|Final four views rendered. Head and hip improve partially, but the defects and regression above remain.|

Rejected candidates1 to3 are under `C:/Users/njord/.claude/scratch-archive/Xalians/2026-10-15/s12c-try1`, `s12c-try2`, `s12c-try3`. After the step commit, the original s12b was moved to `C:/Users/njord/.claude/scratch-archive/Xalians/2026-10-15/s12b`; its63397479-byte surface.blend was verified there. No reference files, lore, creature facts, abilities or unrelated source were changed.

The independent audit identified opposite-sheet neighbor slot exhaustion in the first metric, leading to overquerying and tangent parallel transport. It also localized reversed guided strands despite a smooth mesh comb. A focused evaluated-curve export confirmed carried normals and targets were correct; adding first-point sort weights did not solve the remaining interpolation/evaluation problem. The final narrow point correction preserves per-point root distance and normal height, not necessarily whole-curve arc length. It does not justify a seamless-flow claim.

## Final measurement

Every fifth actual strand root; query48 neighbors within.012 world units, retain nearest12 with normal dot>.25; compare first-segment tangents after parallel transport between tangent planes. Clash is more than60 degrees. Opposite sheet faces are excluded; sharp folds were also inspected visually. Coordinate bins overlap. Full JSON includes sample counts, neighbor-pair fractions and changed-root counts.

| Region | Roots with a clashing neighbor, before | After |
|---|---:|---:|
|Central occiput|0%|0%|
|Lateral skull|0.894%|0.602%|
|Ear-head junction|2.782%|2.378%|
|Ear backs|25.605%|23.666%|
|Ear fronts|4.774%|4.284%|
|Back/flanks|0.730%|0.756%|
|Chest/armpit/rib coordinate bin|0.160%|0.196%|
|Arms|0.065%|0.065%|
|Legs/paws|0.166%|0.166%|
|Tails including root transitions|0.736%|0.782%|
|Thick hip-root patch|0.178%|0.137%|

Hip upstream fraction13.549% to0.0137%. Some broad-bin clash fractions slightly worsen. These are not omitted or described as improvements.

Geometry, topology edges and420420 strand-root positions match12b exactly. Every pre-existing non-comb skin attribute matches exactly, including color masks, length, density, clumping, curl and lift. Every control point of4052 muzzle,2098 eye/nose-edge and42064 paw/sole strands is unchanged. Established tail tubes47201 strands differ at most5.37e-8 world units, floating-point noise. Legs are unchanged. Rear forearm shifts have median0.000023,99th percentile0.000265 and maximum0.001359 world units; neither reviewer sees a forearm appearance regression. The chest/rib coordinate bin also reaches low hip-side roots; its changes are low-body direction, with texture settings held.

## Verification and operational notes

Python compilation, git diff whitespace check, WSL Blender builds, actual evaluated strand export, exact attribute/geometry comparison, all four rendered comparisons and independent adversarial audit completed. Final visual judgment remains partial/blocked, not approved.

Each Blender was started only after checking for other Blender processes. Another task repeatedly launched Blender while these renders were active. Only this task's processes were paused/resumed to avoid active overlap; other task processes were not changed. Rendering delays do not excuse or erase defects.

The existing untracked/species-construction junction resolves to C:/dev/art-data/species-construction, outside this repository. The completion gate rejects such paths. Required delivery outputs remain at the brief's locations; byte-identical evidence mirrors under ignored `.codex/audit-state/fur-12c-evidence` bind the audit. Final mirror/source SHA-256 equality is checked. No audit-gate code was changed.

Started about10:03 CDT on2026-10-15. Delivery and archive verified about11:01 CDT, approximately58 minutes. No push.
