# Akinza crouch: why passes 1 to 5 failed and passes 6 to 7 worked

2026-10-22. Nick on the pass 7 crouch (F38): "Yes, that is much better... this is light years better." He asked what was different. Short answer: the early passes fixed symptoms at the wrong layer and graded themselves. The later passes found the causes first, fixed them at the layer where they lived, and were judged by someone other than the builder.

## What the two runs did

| | Passes 1 to 5 (rig-b3 to rig-p5) | Passes 6 to 7 (rig-p6 to rig-p7r) |
|---|---|---|
| Starting point | Nick's complaint, turned straight into a fix list | A no-build diagnosis first (`anim/diag/crouch-diagnosis.md`): joints and weights drawn over the bare rest mesh, measured against real hind-leg anatomy |
| Layer fixed | Corrective shape keys and weight smoothing on top of the existing skeleton | The skeleton (knee moved 5 cm up to the sculpt's knee, fixed knee hinge plane, tail base as a spine continuation), then the weights (pelvis-to-thigh boundary on the groin crease and gluteal fold), then the geometry (calf, Achilles, kneecap, thigh muscles), and only then small correctives |
| Why the fixes moved problems around | Each corrective canceled mass that the weights had put in the wrong place. The hip_flex key pushed the ball from under the rump into the crotch, and the knee keys rounded a fold caused by a knee joint 5 cm too low | With joints and weights right there was little left to cancel, so the correctives stayed small |
| Knees swinging inward | The IK pole was read from the sculpt's knock-knee, so the planted-feet change itself introduced the swing | A fixed hinge plane through hip and ankle, with the pole forward for the whole motion |
| "Boneless noodles" | Treated as a skinning problem | Found to be the mesh itself (no calf, no kneecap, a straight-line back of the leg). Fixed in geometry, because a rig cannot show bones the mesh does not have |
| Research | None, or generic | Per anatomy part (hip socket, knee hinge, calf and Achilles, tail base), with a short mechanism note, references beside every render |
| Who said "fixed" | The builder, from its own numbers (fold counts, convexity checks); I relayed it | Per-point before/after crops at Nick's own framing, judged by a blind critic that saw only his words and the crops. It sent work back twice before Nick saw it |
| How Nick saw it | Stills, then clips | Clips from the views that matter, plus the deepest frame beside the references |

## The underlying mistakes

1. **Nobody checked the setup.** The knee came from a curve-fit heuristic in `derive_joints`, and no pass drew it on the body. The one picture that would have shown it (joints over the rest mesh) was not made until the diagnosis. Checking it is my job (REVIEW-GATE.md step 1).
2. **Briefs named symptoms, so builders patched symptoms.** "Soften the knee-pit pinch" invites a corrective. "The knee sits at z .36 on the hip-ankle line; the knee blend is 2.5 cm centred on it" fixes the cause. Briefs now state the cause and the target setup.
3. **Self-grading.** A builder's metric passing is not evidence that the look changed. Three "fixed" claims went to Nick that he could see were false.
4. **No stop rule.** After the first "nothing was fixed" from Nick, the next step should have been a diagnosis, not another fix pass (REVIEW-GATE.md step 5).

## Cost

- Passes 3 to 5 plus fixes: about 5 hours of builds.
- The diagnosis ran about 12 hours of wall time and passes 6 to 7 about 11. Much of that was waiting for the shared Blender slot while the Luceras session held it. The Mac mini that should have taken the overflow was unusable: its CI VM had been Broken since 2026-10-16 and its compute VM was stopped (fixed in Xalians #816/#817 and surfaced-art #1991).
- A setup check and diagnosis at the start would have saved most of passes 3 to 5.

## Still open after pass 7 (accepted by Nick for now)

The blind critic, stricter than Nick at this stage, still lists these in the bare body:
- soft thigh and shin forms with only a weak ankle;
- a knee-pit pinch;
- a slight inward knee from the front;
- a faint groin band;
- calf ripples at rest;
- a bump behind the far knee;
- a slit between the tail roots, and the furred tail roots bunching from behind.

If any of these show in the sprites, the proper fix is an animation mesh with joint edge loops, retraced over the approved body.
