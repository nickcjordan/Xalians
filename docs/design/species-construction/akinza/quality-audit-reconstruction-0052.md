# Akinza reconstruction audit 0052

Internal failed comparison, 2026-09-28. No art approval is requested. Layers 3 and 4 remain open; layer 5 is provisional reconciliation. Local improvements do not release the whole model.

Evidence: [six actual views](evidence/reconstruction-0052-contact.png), [regional closeups](evidence/reconstruction-0052-details.png), and [reference comparison](evidence/reconstruction-0052-reference-comparison.png). The historical comparison incorrectly labels panel fitting as equal height; that caption is corrected in 0063. The reference pose differs and later scoped corrections remain authoritative. These are actual geometry renders, not generated design images.

Primary and independent review identified five immediate construction failures: insufficient paw depth and a pinched ankle splice, flat shoulder transitions, lower-thigh scan distortions, a folded muzzle underside, and overly recessed eye sockets. Forepaw grouping and the rear coat also remain open. The chronological method ledger is [head-method-audit-0022-0024.md](head-method-audit-0022-0024.md).

| Criterion | Internal assessment | Observation |
|---|---|---|
| C01: Overall finish of the form | fail | 0052 improves the reconstructed head, overall scale and torso, but has major muzzle, shoulder, knee and paw failures. Internal work continues. |
| C02: Head proportions and silhouette | pass | 0052 retains a rounded reconstructed cranium and cheeks with a smaller head-to-body ratio. Front and profile improve over the rejected wedge-shaped 0020. Subjective likeness remains unapproved. |
| C03: Eye shape and integration | fail | Closed curved eyes and annular sockets remove intersecting spikes, but broad upper socket bowls and regular small openings still differ from the accepted face. |
| C04: Gaze and eye finish | pass | Forward-centered glossy ocular volumes retain balanced pupils without the earlier inward gaze. This is a construction comparison, not Nick approval. |
| C05: Muzzle, nose and mouth | fail | Native pads retain a folded underside. Displacement tests 0050 and 0053 create a hollow; they are rejected. A bounded topology replacement is in progress. |
| C06: Cheeks and crown coat | fail | Native cheeks and crown have useful connected mass, but residual cheek spikes and heavy repeated rear locks require further comparison and refinement. |
| C07: Ear silhouette and clump shape | fail | Reconstructed broad overlapping ear forms improve volume, but their thick pointed clumps still need comparison with the softer preferred envelope. |
| C08: Ear tissue and cavity | pass | The reconstructed ear has continuous cupped tissue and a rounded shared rim. Front and profile no longer expose the old beaded shell construction. |
| C09: Ear depth, rear surfaces and roots | fail | Native ear depth and root continuity improve over the bare rear shell; rear coat organization remains a separate open finding. |
| C10: Neck and shoulders | fail | Neck cutoff lips were removed. Flat shoulder corners and mechanical root transitions remain visible in 0052; a rounded local root correction is being tested. |
| C11: Chest, waist and pelvis | pass | Coarser local relaxation removes paired chest bulges and rounds the crotch transition while preserving a slender torso and restrained pelvis. No separate human-like rear forms were added. |
| C12: Arms, elbows and wrists | fail | Wrist ledges are removed, but the current distal forearm/paw transition is over-smoothed and needs local articulation and grouped digits. |
| C13: Forepaws and claws | fail | Forepaws remain mitten-like, with blunt oval claw ends. Rebuild compact distal digit grouping and short tapered claws without human fingers or thumb. |
| C14: Thighs and knees | fail | Strong thighs remain, but isolated front dimples and knee swellings are visible. Current local cleanup targets these distortions without thinning the whole leg. |
| C15: Calves and shins | fail | The retained lower leg is more anatomical than the earlier sweep, but its contour must be checked with the rebuilt ankle in profile before closure. |
| C16: Ankles | fail | Measured paw alignment improves placement, but a pinched transition and inadequate paw-bridge thickness remain. A wider continuous splice is in progress. |
| C17: Hind paws and ground contact | fail | Four toes replace the six invented by reconstruction. Paw depth is insufficient and a cap ridge remains behind the toes; increase the shared paw volume and inspect contact. |
| C18: Tail volume, sweep and taper | fail | Three full rounded tails taper to pointed ends and retain one pose across all views. Final comparison with the accepted smooth tail remains required. |
| C19: Tail fusion and surrounding pelvis | fail | Architecture remains centered at the body-level spinal base, with restrained surrounding pelvis. Root crease quality still requires closeup review. |
| C20: Secondary form across the body | fail | Head, limbs and paws do not yet share a consistent level of medium-form resolution. Surface detail cannot close the identified construction defects. |

The body is connected and closed, and the six principal projections share height, scale and pose. In 0052 the measured figure-height and ground-row spread are both zero. Those technical passes did not catch the visually poor ankle join or shallow paw. They are evidence of reproducibility, not artistic readiness.

The next changes are bounded muzzle topology repair, a fuller four-toe paw body, a continuous ankle transition, removal of thigh distortions, and rounded native shoulder transitions. Failed analytic torso replacements and muzzle displacements are retained as rejected experiments. Do not promote a newer version merely because it is newer. Preserve better regions independently.

## Follow-up comparison: 0063

The native torso and head balance remain better than rejected 0020. Smooth spatial fairing removes the conspicuous shoulder shelf and ankle cuff in the current whole-body views. These are scoped improvements, not a pass for the complete joints or creature. Independent visual review still finds thin hindpaw support, mitten-like forepaws at body scale, a tail fan that sweeps too high relative to accepted rear study 0018, and the wrong muzzle/eye expression. The head/body scale should be retained while these local forms are corrected.

Actual portable evidence: [0063 six-view sheet](evidence/reconstruction-0063-contact.png) and [0063 reference comparison](evidence/reconstruction-0063-reference-comparison.png). The reference and render preserve their aspect ratios and fit separate panels; they are not calibrated equal-height views. The six actual orthographic projections pass source-hash, image-dimension, camera and occupancy checks with zero height/ground spread.

The code audit found a hard smoothing-mask boundary, noisy per-column muzzle interpolation, wrong tangent signs, incomplete imported-helper provenance and missing image-dimension/source checks. Current builders and review tooling address those defects. The failed muzzle patch is retired rather than treated as an approved correction. Studies 0064 and 0067 are facial method tests, and 0066/0068 test fuller paws and fan balance. None is an approval candidate.

## Follow-up comparison: 0077 and rejected regressions

The retained partial baseline is now [0077 six views](evidence/reconstruction-0077-contact.png), with [regional closeups](evidence/reconstruction-0077-details.png) and a [reference comparison](evidence/reconstruction-0077-reference-comparison.png). Independent review supports scoped internal passes for neck/shoulder continuity (C10), shin alignment (C15), and central three-way tail fusion with restrained pelvis (C19). Seven criteria have scoped internal passes; 13 remain open. These passes do not imply Nick's approval or an acceptable whole creature.

The next local body findings were inner-arm dents, a knee depression, blunt distal tail tips, buried foredigits and an exposed hindpaw cut edge. The attempted paw correction in 0079 broke the mesh before remeshing, leaving 3,334 separate components. Its descendants 0080/0081 and 0083/0084 are rejected. An instrumented replay traced the cause to an arbitrary vertex deletion at the forepaw followed by incomplete hole filling. A new guard rejects a disconnected or open skin before assembly and after final corrections. Negative replay 0089 fails before head import as intended. This is a technical regression repair, not an art milestone.

The isolated 0088 tip test uses valid body 0075 and retained head 0046. All three tips narrow after the final remesh while the root and fan remain fixed. The body remains one closed component and six-view height/ground spread remains zero. It retains the known head and paw failures. Full-head study 0082 improves the lateral muzzle repair boundary but still has a blank downward ramp rather than the reference's soft paired pads and closed smile. Face study 0010 remains the expression target.

## Follow-up comparison: partial components 0100 through 0112

Original-resolution comparison reopened C02: the .60 head scale remained too large. Uniform .50 scale in 0101 is closer to the preferred first front. Facial head 0100 supplies a better paired muzzle and closed mouth from a bounded native transplant, preserving all ocular coordinates. It is a partial component, not an approved head. Its landmark record has a separately documented correction rather than a rewritten history.

C10 is also reopened for integration. Assembly 0105 joined the new head to the old bridge dimensions and created a shelf. Measured native sections remove that shelf in 0107. Shortening the neck in 0108 improves the front proportion but exposes a rear neck-to-shoulder ramp due to the inherited forward head offset. Adjusting that placement and reviewing the complete transition remain executable work. Historical neck success does not carry over automatically to a different head.

Body 0100, attempt 02, restores one closed skin and shared toe/pad contact without collapsed faces or edges. Its closeups still show a shallow blocky hind-toe group, a ridge behind the toes and an angular support transition. The foredigits also look attached to the front of the palm in profile. These remain C13, C16 and C17 work despite the successful contact test.

Independent review retains eye finish 0112 as an improvement: measured iris coverage, a distinguishable pupil, coherent convex reflections and forward gaze. The aperture remains more regular than the reference. Rear scalp cleanup 0109 removes the central spike and lower hooks, but the transition into ear-root locks and a lower posterior bump still need work. The nose is still too narrow and angular. No whole-creature readiness or user approval is implied by these local findings.

The 0115 placement test resolves the shortened neck's rear ramp. Independent review retains its uniform head scale .50, jaw anchor .500 and depth offset -.020 for the next integration. Torso, upper arms, thighs and shin structure have no newly identified broad-form defect in this review; preserve their corrections. The opposite-side tail-root closeup, however, exposes a sharp vertical crease and a small ledge where the fan meets the pelvis. Reopen C19 for this local tangent transition while preserving the centered root and three body-level branches. Actual full pointed tips are present; the top tail's rounded profile is partly foreshortening. Approximate fan-size differences need normalized comparison before any global change.

## Combined comparison: 0149

Evidence: [0149 six views](evidence/reconstruction-0149-contact.png), [regional closeups](evidence/reconstruction-0149-details.png), [turntable](evidence/reconstruction-0149-turntable.png) and [reference comparison](evidence/reconstruction-0149-reference-comparison.png). All come from one geometry: retained head 0110 with the 0112 eye finish and conformal nose 0146, joined to field-rebuilt body 0148 at head scale .50, jaw anchor .500 and depth offset -.020. The body is one closed component with zero nonmanifold edges; the six principal projections have zero figure-height and ground-row spread.

The three unreviewed experiments were inspected in their own closeups first and rejected. Nose 0127 sat on a fitted plane pushed forward for clearance, so it projected as a dark wedge in profile and floated as a plate from below. Tail root 0129 used equal and opposite smoothing passes that cancel; its maximum displacement was .003 and the crease was unchanged. Paws 0130 kept distinct toes for the first time but attached them as four balls to a stump, and the forepaws remained stumps.

Their replacements change method rather than parameters. The nose is now a convex pad over a smooth fit of the actual muzzle skin, seated on a bounded recess of the old nasal knob. The body is converted to a signed-distance field: the native leg morphs into analytic paws with a heel, sloped roof, pad mass and four toe lobes planted on the floor; forepaws follow study 0020 with the palm toward the thigh and four digits spread front to back; a fill-only fillet, placed by ray casts on the measured corner, turns the tail-root wall into a rounded overlap edge. Knees, calves and forearms receive bounded, volume-compensated smoothing. The claws are pale, as in both references.

The tails were also rebuilt. Back study 0018, which Nick accepted for tail shape and positioning, shows crescents whose tips curl up. The model's tips turned down. The first three controls of each tail are unchanged, preserving the accepted root and proximal fan. The distal controls now curl up and out with a longer taper, on the tail-free torso from body 0086. This departs from the first sheet's drooping plumes, deliberately and by the reference that governs tail shape, and is reported to Nick as a visible change.

Two independent Opus reviews examined 0139 and 0149. The first miscounted the tails; the closeup shows three. Its correct findings led to the crescent rebuild and nose recess. The second counted three tails and four toes correctly and fails 19 of 20 criteria. Only C04 passes. It reopens C08, C11 and C15, whose earlier local passes do not survive combined review. Its tail-tip nub is the forepaw claw seen past the tail, confirmed by ray cast.

Current priority, most damaging to likeness first:

1. The ear fan reads as one smooth dish from behind and a thin plate with a deep slot in profile. It needs two thick wings over a central crown, rear coat masses, a wider span and a cup that reads from the front.
2. In profile and three-quarter views the tails read as inflated radial balloons with pinched tips, not three layered crescents. The root meets in a narrow creased knot.
3. The eyes stand proud as rimmed disks in profile, without sockets.
4. The hind toes are a row of equal beads with no sole pads; the forepaw reads as a stump from the front.
5. The legs still carry knee and calf lumps, the trunk lacks a waist, and the skull underside forms a shelf on a narrow neck.

There is still no approval candidate. These are the next executable corrections.

## Follow-up comparison: 0156

Evidence: [0156 six views](evidence/reconstruction-0156-contact.png), [closeups](evidence/reconstruction-0156-details.png), [turntable](evidence/reconstruction-0156-turntable.png) and [reference comparison](evidence/reconstruction-0156-reference-comparison.png), all from one geometry: head 0152 (rear coat on nose head 0146) with body 0155 (deeper crescent tails), at the tested placement. One closed skin, zero height and ground spread.

`add_rear_coat_field.py` replaces the bald rear dish with locks laid in field space on ray-cast rear surface points. The first attempt radiated spines from one point like a sea urchin; the second laid rounded shingles that read as feathers. The retained 0152 parts the coat at the midline and flows long tapered clumps sideways toward each wing, each spanning about three rows, with locks whose tips would leave the surface dropped so the front silhouette is unchanged. The tails' distal rows sweep about 25 percent farther back, matching the first sheet's profile depth; body 0154 exposed a grid-bounds bug that sliced the new tips flat, fixed in 0155 by padding the field.

Height-normalized silhouette measurement corrects a shared misreading. The ear fan's width matches the first sheet within about .02 of figure height at every level from 3 to 15 percent; it only reads narrow because the neck is about 40 percent and the shoulders and waist about 30 to 40 percent wider than the reference. Widening the fan would be wrong. The first sheet's torso is also pear-shaped, with hips a little wider than shoulders, where the model is the reverse.

The third independent review verified three tails and four toes and passes C04, C06, C12 and C19. It fails the ear rear (still one dish with pinched tips and no head visible between wings), the inner ear cup, eyes proud of the face, the body's missing coat masses and muscle knots, leg lumps, paw toe rows and claw placement, and tail pods in profile.

Next, in order: slim the neck and torso toward the measured reference widths without moving the accepted tail root; notch the fan above the skull and carve a cupped inner ear; sink the eyes; then paws, legs and tail girth. Still no approval candidate.
