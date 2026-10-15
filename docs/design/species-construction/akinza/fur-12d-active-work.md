# Akinza fur step 12d active work

Outcome: visibly natural chest, armpit and rib fur, with flatter down/outward flow and soft silhouette, compared with s12b2. Only this region may change. Fixed geometry, T7, stripe inputs, head, ears, hips, soles and all unrelated fur are held.

Scope: brief 12d only, maximum four builds, WSL Blender one process at a time, original 10f cameras at 1024 px, three comparison pairs plus worst-spot crop and before/after diagnosis numbers. Commit explicit paths, do not push. Claude reviews afterward; no user approval inferred.

Completion: diagnose actual saved strands against an unaffected upper-arm region; patch actual cause; inspect all pairs at full size; verify geometry, material/pattern inputs and unselected strands unchanged; independent adversarial review; update logs and commit. Preserve baseline until commit, then archive superseded s12b2 under the specified scratch archive.

Evidence so far: recovered exact 10f cameras from its original render script in local task history. Earlier 10f only lowered procedural lift/clump parameters and retained the visible straight fringe. Baseline is s12b2 at 8e3abbc8.

Next unfinished action: render/export baseline, quantify shape and direction, inspect worst-spot crop before changing strands.

## Addendum priority (2026-10-15)

The user explicitly widened 12d: body-wide automated segment/skin, neighbor-length, part-transfer and lift sweep, flag overlays front/back, then repair all artifact clusters starting with the rear arm chunk, then chest grooming. Up to six builds. Preserve legitimate tail volume and held looks; tail edits only for body/leg penetration. Add body-backq and body-front comparisons. Baseline extraction exists; interrupted baseline renders produced no images. No build yet. Next: complete automated sweep and baseline views before mutation.

## Baseline sweep diagnosis

420,420 actual curves and 3,351,848 segments tested, with endpoint/midpoint signed-distance checks and segment rays. Baseline per-region counts and worst 0.04-unit root clusters are in `12d-before/sweep-metrics.json`. A connected thin-tube mask seeded on distal tails separates legitimate tails from thin arms and body folds. The old R11 tail box extends to world x +0.335 and y 0 with a 0.037-unit blend margin, so it reaches the rear arm. Worst arm root clusters at approximately (0.261, -0.006, 0.181) and (0.298, 0.008, 0.100) have median tail weight 0.484 and 0.5; strands reach 0.117 to 0.120. This is the same tail-setting contamination found on the ribs. Neighbor ratios alone miss these broad bands because neighboring hairs are all long.

Current baseline flags: chest/ribs regional-long 20,751; arms 5,413; collisions chest/ribs 13,514, arms 7,934, neck 1,532, head 3,826, ears 7,408, hips 5,921, legs 1,566, feet 2,417, hands 146, true tails 43. Collision includes any segment ray hit or penetration over 0.0006; this intentionally includes shallow skimming, and deeper penetrations are separately available. Head/ear/tail length and transfer flags remain advisory because overhang can be intentional. Raw flags are not automatic proof that an approved plume should be shortened.

Next unfinished action: inspect baseline native-size chest crop and back-arm view, complete flag overlays, then build first repair. No build used.

## Pre-build adversarial review

Reviewer `review_12d` found a spatial-region precedence error that overwrote lower arms/hands with hips. Fixed precedence and recomputed all baseline flags before building: arms 38,061 strands, 5,692 regional-long, 9,255 collisions; hands 4,940 strands, 871 collisions. Prior arm/hip totals above are superseded by `12d-before/sweep-metrics.json`. Reviewer also required point-local collision repair, displacement caps, after-sweep verification, held-region movement evidence and material-graph checks. Collision repair now leaves already exterior points alone except endpoints of proven colliding segments; root-side projection has a total .025 head/ear or .03 other-region displacement cap. Material graphs and fur transform added to saved-data checks.

Smallest source recurrence fix: existing tails.cut support now gates the tail group at y=.105 with .015 smooth transition before weight normalization. `12d-root-mask-proof.json` proves full gate=1 for all connected genuine-tail vertices (minimum y=.12310335), 6,143 contaminated arm roots before and zero afterward. The saved skin and stripe inputs will remain unchanged because this step patches actual fur locally rather than regenerating the entire coat.

Baseline chest front, three-quarter, underarm and body-backq inspected at native size. Visible failures: straight rib/inner-arm fringe, rear arm sheet, broad long-fur back/hip bands. No repair build yet.

## Build 1 audit and executable follow-through

First saved surface patches 125,507 curves. Full saved-file checks pass for every mesh attribute/topology, all material node graphs and links, fur transform, roots, strand topology, every untouched curve attribute, and every non-shape hair input. 48,797 true-tail curves without collisions are bit-identical. Chest median reach .027538 to .016172; median lift 9.803 to 1.180 degrees; inner-arm p95 reach .093832 to .011987.

Complete after-sweep: collisions 44,307 to 168; total regional-length flags 29,293 to 2,219 (most retained head/ear advisory plume flags). Artifact bands removed numerically, but visual acceptance is still pending. Findings: F001 rear-arm curtain/back shelf and F002 chest/inner-arm fringe await native-size final renders; F003 remaining collisions (head 85, ears 19, arms 17, hands 40, feet 5, chest 1, leg 1) and 373 total actionable residual curves require correction. Some push-out curves on the feet grew to .072 units, which is a new defect. F004 region-label overwrite and F005 verification-coverage gaps were fixed before/after first build; held-look visual checks remain mandatory because ear p95 movement is .00466 and sole hairs also moved.

Second build is a focused bounded shortening of the 373 residual curves, preserving all other first-build results. It has saved and is undergoing the complete sweep and saved-data checks. No final render or completion claim yet. Two of six builds used. Next unfinished action: evaluate second sweep, then render matched main/held views and flag overlays, inspect native size, obtain independent final visual review, and repair any remaining substantive result within the cap.

Concurrency evidence: another task admitted itself as Blender slot 1 while this task held slot 0. Only our process was paused/resumed with a serial guard; no other task was modified. Subsequent Blender runs use the slot service gpu class as its exclusive compute mutex, which excludes all other Blender holders. This is a CPU Blender job using the exclusive lock, not a GPU rendering claim.

## Build 2 and 3 audit

Build 2 shortened only 373 residual curves rather than pushing them farther through nearby parts. All skin crossings fell to zero; eight isolated body outliers remained. Build 3 shortened those eight with an explicit .004 surface-clearance bound. Three of six builds used. All skin crossings remain zero, all body regional-length/part-transfer flags are zero, and one newly exposed relative-neighbor upper-arm lift warning remains. Its actual length and clearance improved from .03190/.01413 to .02096/.006615, so it is not a newly growing spike. Native-size images show no visible spike there; independent review agrees it can be reported as an isolated advisory.

Superseded build folders were moved, not deleted, to the requested scratch archive as s12d-try1 and s12d-try2. Build 3 is the current s12d/surface.blend. Original s12b2 is still retained until commit. Saved-file protection passes against that original baseline.

Builder and independent reviewer have inspected all three native-size chest pairs, worst crop, front/back body pairs, ears-front and head-side. The rear arm curtain, rib shelf and bristled bridge are visibly gone at a glance; short down/outward wavy chest growth is continuous across the armpit, without a new bald patch or grooming boundary. Head/ear overall looks and genuine tail silhouettes remain consistent. Visible Still off: inherited fluffy lower-back/tail-root mound and abrupt transition into the short waist coat. This is preserved plume/root grooming, with volume owned by later tail work.

Separate-object sweep adds eyes, nose and claws. Actual ray crossings on eyes fell 14 to 0; nose/claw ray crossings are zero. Signed-distance-only warnings at 33 muzzle and 5 toe roots require validation of mesh closure and solid parity before being called real penetrations; no held fur will be changed based on unverified open-mesh signs. Validation is queued after current render job. Next unfinished action: inspect matched sole pair and final overlays, complete solid-object topology/parity checks, resolve any genuine finding, obtain final scoped review, update proof/audit/logs, commit explicit paths, archive s12b2, and seal the current audit.

## Final technical and visual audit

Four build invocations total: three saved surfaces, then one guarded eye-cull attempt rejected before saving. Full coherent double-precision solid-angle winding disproved single-direction parity flags on three eye hairs; independent reviewer reproduced the outside result. Final separate-object segment and inside sweep is zero. All skin collisions remain zero, held protection checks pass, and all ten native-size comparisons plus flag overlays were reviewed by builder and independent review_12d. Sole look is consistent. The isolated arm advisory is shorter and closer to skin than baseline, without a visible spike. All in-scope visual and technical findings are resolved; subjective user approval is not claimed.

Next unfinished action: commit explicit source/docs paths, archive baseline s12b2 after that commit, verify source/destination hashes, bind delivery receipt, amend the audit into the same step commit, and seal. No push.

## Delivery completed

Committed the explicit 12d source and documentation paths before moving s12b2. Baseline now lives at `C:/Users/njord/.claude/scratch-archive/Xalians/2026-10-15/s12b2`; all ten archived files match the pre-move SHA-256 manifest. Superseded tries remain archived. Final model is unchanged, every delivered image mask matches the final validated flags, and the audit evidence copies match their source hashes. Independent final source review also confirmed archived reruns using the verifier baseline argument and patch --sweep argument. No push performed. The final audit and this delivery evidence are amended into the same step commit.

Next unfinished action: none within step 12d. All authorized build, review and delivery work is complete; subjective acceptance remains with Nick and orchestrator review. Still off remains the inherited tail-root mound/short-waist transition and held baseline tail flyaways/sole fringe.
