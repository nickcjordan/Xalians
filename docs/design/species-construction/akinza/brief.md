# Akinza construction pilot: current handoff

Updated 2026-09-28. **Candidate 0020 is rejected for visual quality. No current model is ready for likeness approval.** Nick rejected recognizable resemblance as insufficient. The prior independent readiness verdict was wrong. See [the complete audit](quality-audit-0020.md), [exact feedback](quality-rejection-0020.json) and [current reconciliation](reconciliation.md).

Nick approved the animal-paw direction in study-0020 with "looks good, proceed" and requested an audit of the layered plan and lessons. Full words and image hash: [paw acceptance](paw-acceptance.json).

## Where we are

| Layer | Working state | Still required |
|---|---|---|
| 1. Interpretation | Reading and scoped corrections carried forward | Complete package approval |
| 2. Identity | Preferred first-round reference retained | Nick's integrated likeness judgment |
| 3. Construction | Candidate 0020 failed quality | Substantial face, ear, body and limb reconstruction |
| 4. Connections/detail | Closeups expose unresolved attachments and joints | Correct modeled integration against scoped references |
| 5. Geometric reconciliation | Technical consistency passes; likeness fails | Demonstrate reference-level form before user review |
| 6. Surface/handoff | Export infrastructure exercised; art bundle rejected | Acceptable construction first, then rebuild derived assets |

These are progress states, not whole-stage approvals. Production release remains blocked. Rigging and animation follow the approved handoff and are outside this construction exercise.

## Current reference precedence

Read [current-references.json](current-references.json) before modeling or prompting. It binds exact images, allowed roles, exclusions and scoped approvals. Do not treat a historical full-body sheet as an approved master.

- First grayscale run-0001 is the primary whole-creature likeness target, reaffirmed by Nick. Preserve later accepted corrections when reconciling it; it is not a calibrated geometry master.
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

Use [reconciliation.md](reconciliation.md) for the current whole-body experiment and actual discrepancies. Scoped component approval permits experiments. Earlier primitive models and rebuilt candidate 0020 failed whole-creature quality. The new audit is an internal correction list, not an approval request. Do not infer approval or defer newly identified structural differences to texture. Keep accepted originals intact and compare their modeled equivalents. Do not regenerate all components to obtain another attractive sheet.

Follow [WORKFLOW.md](../WORKFLOW.md) and [LESSONS.md](../LESSONS.md). Repeated geometry errors trigger a method change after two targeted image attempts. Check known regressions before involving Nick. Separate provenance checks, topology checks, likeness review and Nick's approval.

Historical studies, failed candidates and feedback remain in [review.md](review.md), numbered `records/`, `correction-review.json` and the main work record. Historical references do not override this current map. Older stage snapshots remain stale deliberately; do not refresh rejected studies to make a release report green.
