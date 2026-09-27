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

Probe-0003's full rounded tails, pointed taper and compact body fusion are accepted as shape. Its pose is not selected. Compare option A (probe-0004, relaxed down and back) with option B (probe-0005, swept farther behind); both preserve the same analytic tail forms and change orientation only. Remeshing at the body means the resulting mesh is not byte-identical, so these are new pose candidates. Do not reopen accepted shape decisions. The complete creature modeling pose remains unapproved. Consult `review.md`, `status.md` and the main work record for evidence and unfinished work.
