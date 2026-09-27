# Akinza construction pilot

Status: active experiment, 2026-09-27. Nick authorized implementing and exercising the layered system. New construction images, modeling pose and geometry remain unapproved.

## Evidence and identity

The abstract source is `apps/web/src/svg/species/akinza.svg`; species evidence is `docs/species-templates/akinza.json`. The current interpreted reading is `../../species-view-readings/akinza/reading.md`. Preserve two huge sideways furry ears, two large distinctive eyes, the slender upright feline body, two arms and legs, and three unequal leftward tail plumes.

Nick prefers the first image round's soft gray style. Run-0008 is a useful identity reference that he called a good start. It is not geometrically consistent or an approved complete pack. Run-0007's tail junction and restrained rear form were accepted with "yeah thats better, proceed". Source pixels and white squiggles are abstractions, not a required literal match.

Stable construction part IDs: head, ear-left, ear-right, eye-left, eye-right, muzzle, torso, pelvis, arm-left, arm-right, hand-left, hand-right, leg-left, leg-right, foot-left, foot-right, tail-root, tail-trunk, tail-junction, plume-upper, plume-middle, plume-lower. These are art annotations, not edits to the creature contract or a decision about final mesh object separation.

## Pose and coordinates

`expressive-v1` retains the hands-on-hips attitude. `modeling-v1` proposes lowered arms clear of the torso and modestly separated planted feet. Study-0001 explores that pose; it does not replace the expressive reference or have Nick's approval yet.

The geometry probe uses +X toward the creature's left, +Y toward its rear and +Z upward, in arbitrary construction units. The creature faces -Y. The front camera sees +X on the viewer's right. The rear sees +X on the viewer's left. The left camera sees rearward extension on the viewer's right. In the true overhead camera, the creature's front points toward page top and its left toward page left. Earlier image prompt study-0002 incorrectly asked for left on page right in its above view; retain that prompt as provenance and correct the convention in further work.

## Questions exercised

| Question | Study | Current finding |
|---|---|---|
| Can the hands clear the torso while preserving identity? | study-0001 | Useful proposed pose; side tail projection remains inconsistent and fine fur obscures construction |
| Can generated close-ups establish one attachment from several angles? | study-0002 | Smooth masses show a fork, but side/top cameras are not reliable and rear shaping regresses |
| Can one trunk actually join all three plumes and remain plausible around the back? | probe-0001 | A single closed connected mesh exists; real side/top renders expose the shallow fan depth for review |

The probe is only a local tail and pelvis study. Its simplified leg stubs, torso stub, plume widths and thicknesses are proposed construction aids, not approved final anatomy. No full-body reconstruction, facial geometry, rig, texture or production topology exists here.

## Next review

Review the modeling pose and actual tail probe with Nick. Resolve whether the shallow fan depth and shared junction are the intended interpretation before building a complete rough creature. Production remains blocked. Consult `review.md`, `status.md` and the main `../../species-view-packs-active-work.md` record for current evidence and unfinished work.
