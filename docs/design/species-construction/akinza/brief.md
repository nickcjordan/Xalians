# Akinza construction pilot

Status: active experiment, 2026-09-27. Nick accepted probe-0003's tail shape while explicitly reserving pose. Construction images, modeling pose and final geometry package remain unapproved. See `tail-shape-acceptance.json` for the exact accepted aspects and artifact bindings.

## Evidence and identity

The abstract source is `apps/web/src/svg/species/akinza.svg`; species evidence is `docs/species-templates/akinza.json`. The current interpreted reading is `../../species-view-readings/akinza/reading.md`. Preserve two huge sideways furry ears, two large distinctive eyes, the slender upright feline body, two arms and legs, and three unequal leftward tail plumes.

Nick prefers the first image round's soft gray style. Run-0008 is a useful identity reference that he called a good start. It is not geometrically consistent or an approved complete pack. Run-0007's tail junction and restrained rear form were accepted with "yeah thats better, proceed". Source pixels and white squiggles are abstractions, not a required literal match.

Stable construction part IDs: head, ear-left, ear-right, eye-left, eye-right, muzzle, torso, pelvis, arm-left, arm-right, hand-left, hand-right, leg-left, leg-right, foot-left, foot-right, tail-root, plume-upper, plume-middle, plume-lower. The latest correction retires tail-trunk and merges tail-junction into the shared root at the body. These are art annotations, not edits to the creature contract or a decision about final mesh object separation.

## Pose and coordinates

`expressive-v1` retains the hands-on-hips attitude. `modeling-v1` proposes lowered arms clear of the torso and modestly separated planted feet. Study-0001 explores that pose; it does not replace the expressive reference or have Nick's approval yet.

The geometry probe uses +X toward the creature's left, +Y toward its rear and +Z upward, in arbitrary construction units. The creature faces -Y. The front camera sees +X on the viewer's right. The rear sees +X on the viewer's left. The left camera sees rearward extension on the viewer's right. In the true overhead camera, the creature's front points toward page top and its left toward page left. Earlier image prompt study-0002 incorrectly asked for left on page right in its above view; retain that prompt as provenance and correct the convention in further work.

## Questions exercised

| Question | Study | Current finding |
|---|---|---|
| Can the hands clear the torso while preserving identity? | study-0001 | Useful proposed pose; side tail projection remains inconsistent and fine fur obscures construction |
| Can generated close-ups establish one attachment from several angles? | study-0002 | Smooth masses show a fork, but side/top cameras are not reliable and rear shaping regresses |
| Can one trunk actually join all three plumes and remain plausible around the back? | probe-0001 | A single closed connected mesh exists; real side/top renders expose the shallow fan depth for review |
| Do the three plumes have full rounded volume? | probe-0002 | Replaces rejected flat blades with round cattail-like sweeps, soft tips and depth separation; awaiting Nick's review |
| Do three distinct pointed tails fuse directly at the body? | probe-0003 | Shape accepted by Nick; pose explicitly excluded |
| Which orientation better suits the accepted tail form? | probes 0004 and 0005 | Relaxed down/back and farther rearward options; analytic tail lengths, cross sections and relative spread preserved by rigid rotation |

The probe is only a local tail and pelvis study. Its simplified leg stubs, torso stub, plume widths and thicknesses are proposed construction aids, not approved final anatomy. No full-body reconstruction, facial geometry, rig, texture or production topology exists here.

## Next review

Probe-0003's full rounded tails, pointed taper and compact body fusion are accepted as shape. Nick declined the pose comparison and asked whether pose belongs later. Expressive posing is deferred until the complete creature is assembled. Use a neutral technical arrangement to inspect construction; do not require a selection between options A and B. Next resolve head and muzzle depth, ear thickness and roots, torso/pelvis volumes, limb attachments and hand/foot construction, carrying the accepted tail form into the whole-body references. These new volumes still need review. Consult `review.md`, `status.md` and the main work record for evidence and unfinished work.

## Whole-body follow-through

See [the current body review](body-study.md) for studies 0003 through 0010. Nick accepted the remaining design direction while requesting a centered spinal tail root, reduced rear contours and a forward gaze. The face correction is accepted; rear approval was withdrawn and study-0014 is the replacement candidate. Detail study-0005 proposes the ear shell and hand/foot construction; its older front-head gaze is superseded by study-0010. Historical sheets do not override these corrections or probe-0003 tail-shape acceptance.

## Central root correction and research

Nick retained study-0010 gaze approval but withdrew rear approval. The entire shared three-tail base must overlap both sides of the rear midline at the tailbone, not form a cascading seam on the left. [Research and latest candidate](tail-root-research.md) record the inspected animal references and study-0014. Studies 0012/0013 are rejected; prepared consolidation study-0011 was never generated. No complete rough creature is released while the root remains under review.

Latest refinement: Nick asked to combine the earlier proportions with the centered base, moderating the large blend and long lower tail. Study-0015 is the current rear candidate; study-0014 is an intermediate placement correction. Accepted gaze and other retained design aspects remain unchanged.
