# Akinza construction pilot: current handoff

Updated 2026-09-28. Current geometry candidate: blockout-0006. Nick found the increased leg fullness a little better, but rejected the bowed shin in blockout-0005. See [shin-feedback.json](shin-feedback.json). This does not approve the revised geometry.

Nick approved the animal-paw direction in study-0020 with "looks good, proceed" and requested an audit of the layered plan and lessons. Full words and image hash: [paw acceptance](paw-acceptance.json).

## Where we are

| Layer | Working state | Still required |
|---|---|---|
| 1. Interpretation | Source abstraction and corrections established | Carry scoped decisions into the final manifest |
| 2. Identity | First-round style preferred; working creature direction retained | Complete integrated likeness review |
| 3. Construction | Body direction and animal paws selected | Whole-body scale, depth and limb posture reconciliation |
| 4. Connections/detail | Tail form and central attachment accepted; gaze corrected | Verify their modeled equivalents and other connections around the body |
| 5. Geometric reconciliation | Provisional whole-body blockout now being exercised, after local tail probes | Matched-view comparison, unseen-angle review and Nick's rough-form approval |
| 6. Surface/handoff | Not started | Coat, final views, masks, measurements, manifest, consumer adapter and approval |

These are progress states, not whole-stage approvals. Production release remains blocked. Rigging and animation follow the approved handoff and are outside this construction exercise.

## Current reference precedence

Read [current-references.json](current-references.json) before modeling or prompting. It binds exact images, allowed roles, exclusions and scoped approvals. Do not treat a historical full-body sheet as an approved master.

- Body study-0003 supplies retained head, torso and limb proportion direction only. Its gaze, tail junction and extremities are superseded. Nick subsequently requested modestly beefier hind legs that imply bounding strength, using rabbit power as a reference without literal rabbit legs. Concentrate fullness in thighs and upper calves, preserving the thigh shape, knee and ankle positions, stance and compact paws. His next correction straightens the intervening shin path; the lower leg must not curve like a flexible tube.
- Tail study-0018 supplies accepted shape, junction and central positioning. Three full rounded tails taper to points and fuse directly together at the body-level spinal base. No delayed trident branch, left-hip attachment or extra root lobe. Keep rear contours restrained.
- Face study-0010 supplies accepted large distinctive eyes and forward gaze.
- Paw study-0020 supplies compact furry animal forepaws and hind paws with short clustered clawed digits. No long human fingers, opposed human thumb or human heel. Four visible digits are an illustration-level arrangement, not a species-record ruling.
- Detail study-0005 supplies only the smooth cupped ear tissue and shaggy hair-rim interpretation. Hair creates the ragged edge; the tissue is continuous. Its other panels are superseded.

The source remains `apps/web/src/svg/species/akinza.svg`, species evidence remains `docs/species-templates/akinza.json`, and the interpreted reading is `../../species-view-readings/akinza/reading.md`. No source-pixel overlap acceptance rule. No changes to defining species facts or abilities.

## Technical arrangement and unknowns

The agent chooses a neutral inspection arrangement with arms lowered clear of the body and feet modestly separated. Nick does not need to coach this pose. Expressive posing remains deferred. The new animal paws' scale and ankle transition must be judged with the complete body. Depth and hidden surfaces are proposed geometry, not measurements recovered from generated pictures.

Coordinates: +X creature left, +Y rear, +Z up; faces -Y. Units are arbitrary construction units. All six principal cameras share one orthographic scale, height and pose. Elevated turntable views are separate inspection evidence, not registered principal views.

Stable annotation IDs include head, ear-left/right, eye-left/right, muzzle, torso, pelvis, arm-left/right, hand-left/right, leg-left/right, foot-left/right, tail-root and plume-upper/middle/lower. The hand IDs do not imply human anatomy. There is no projecting tail-trunk.

## Next checkpoint and operator lessons

Use [reconciliation.md](reconciliation.md) for the current whole-body experiment and actual discrepancies. Scoped component approval permits a provisional geometry experiment; it does not approve the newly modeled result. Keep accepted originals intact and compare their modeled equivalents. Do not regenerate all components to obtain another attractive sheet.

Follow [WORKFLOW.md](../WORKFLOW.md) and [LESSONS.md](../LESSONS.md). Repeated geometry errors trigger a method change after two targeted image attempts. Check known regressions before involving Nick. Separate provenance checks, topology checks, likeness review and Nick's approval.

Historical studies, failed candidates and feedback remain in [review.md](review.md), numbered `records/`, `correction-review.json` and the main work record. Historical references do not override this current map. Older stage snapshots remain stale deliberately; do not refresh rejected studies to make a release report green.
