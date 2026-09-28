# Akinza reconstruction audit 0052

Internal failed comparison, 2026-09-28. No art approval is requested. Layers 3 and 4 remain open; layer 5 is provisional reconciliation. Local improvements do not release the whole model.

Evidence: [six actual views](evidence/reconstruction-0052-contact.png), [regional closeups](evidence/reconstruction-0052-details.png), and [equal-height reference comparison](evidence/reconstruction-0052-reference-comparison.png). The reference pose differs and later scoped corrections remain authoritative. These are actual geometry renders, not generated design images.

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
