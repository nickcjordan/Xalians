# Akinza anatomy fixes log, lower legs and hind feet lane (2026-10-13)

Findings 4, 7 and 13 of `anatomy-review-2026-10-13.md`, fixed one at a time in the lower-leg and hind-foot lane while other builders work the neck and shoulders, the rear, and the ears and hands in parallel (Nick, 2026-10-13: "Yes, fix all ten of them."). Each fix is its own region-masked post step appended to the chain on top of the previous one, starting from assembled-3199 (`recipe-neck-v3.json`). This lane uses only build numbers assembled-3210 to 3219. Check images (before left, after right, same camera, shadows off) are in `untracked/species-construction/akinza/surface/anatomy-fixes/`; working views are in `anatomy-fixes/work/<NN-item>/`.

Holds for every item in this lane:

| Hold | Source | Why |
|---|---|---|
| Foot width and length (feet v2/v3 proportions, no clown shoe) | Nick approved the feet (2026-10-12) | approved part |
| Knee and everything above the knee | Nick approved the area above the knee and hips/legs front (2026-10-13) | approved |
| Everything outside the lower leg and foot | inferred: parallel lanes own those regions | avoid collisions |
| Bare anatomy only, no fur volume | Nick, 2026-10-13, REFINEMENT rule 7 | standing rule |

Mask for every step in this lane: |x| above .18 (full weight from .20), z below -.66 (full weight below -.70). The knee joint is at z -.557, so the mask stays at least .10 below it. Below z -.64 the skin holds nothing but the two lower legs and feet.

## 4 and 13. Ankles, with the shin's rope ridge

- **Base:** assembled-3199 (`recipe-neck-v3.json`). **Output:** assembled-3211, recipe `recipe-ankle-v1.json` (step P-ankle1 after P-neck3, `art/species-construction/ankle_v1_post.py` with `ankle_v1_field.py`, spec `specs/ankle-v1.json`). assembled-3210 is an interrupted build of the same step (the session ended mid-run); it is incomplete and nothing points at it.
- **Cause, measured:** the shin taper ran to its minimum just above the foot: .061 wide at z -.80, .052 at -.83, .050 at -.84 (depth .082, .100, .107), against .107 just below the knee and .156 across the foot. The leg is slanted in the A stance (its center moves from x .281 at z -.70 to .341 at -.84), so from behind the thin inner side met the heel top at an acute notch. In the side view the shin front came down to a small knob and a step at the top of the instep (z about -.85 to -.87). A thin ridge ran down the front of the lower shin into the instep.
- **What changed:** a sweep of elliptic tapered capsules through the shin's measured center line (z -.69 to -.885; half widths across .026 to .033, front to back .036 to .042; the last segment near vertical, so the leg comes down onto the heel centered), hard-unioned so the segment joints add no bulge, joined to the skin by a smooth minimum (it only adds where the old ankle is thinner); a z-only blur over the ankle that evens the radius profile; masked blurs at the shin-to-instep corner (sigma .016), round the ring where shin meets foot (sigma .014), and down the front of the lower shin (sigma .006, the rope ridge). Width / depth, both legs the same to .001:

  | z | -.74 | -.77 | -.80 | -.83 | -.86 |
  |---|---|---|---|---|---|
  | before | .070 / .082 | .065 / .078 | .061 / .082 | .052 / .100 | .068 / .113 |
  | after | .076 / .088 | .074 / .087 | .074 / .090 | .071 / .102 | .073 / .116 |

  The review asked for about .07 wide and .09 deep; the ankle now tapers smoothly from the shin to its narrowest (.071) just above the foot, then flares into it.
- **Holds:** foot width and length unchanged (at z -.87 and below every section's width is within .003 of before; the widest foot section, .156 at z -.92, and the toe-to-heel length, y -.142 to +.065, are unchanged; the toes moved at most .0019 and nothing below z -.932 moved). Knee and above: no vertex above z -.66 moved.
- **Displacement outside the region (against 3199):** 0.0 exactly outside the mask. 34,572 of 547,455 skin vertices move, max .0143 (inner side of the ankle at z -.84), median .0012; moved vertices lie within |x| .229 to .424, z -.931 to -.660. Every other object (eyes, irises, nose, mouth line, all fore and hind claws) 0.0. Check passes: one component, no non-manifold edges, no faces turned more than 72 degrees, no folds.
- **Images:** `04-ankle-front-check.png` (front of the figure's left leg), `04-ankle-side-check.png` (outer side), `04-ankle-back-check.png` (from behind; the Achilles join changed visibly). Working views and the development variants a to k in `work/04-ankle/`.
- **My own look (front, three-quarter, side, back, rear three-quarter, below, the other leg from outside):** from the front the lower leg now tapers as one column into the foot, no stilt; the knob and step at the front of the ankle are gone, and the shin front is smooth. From the side the front line runs from shin into instep as one curve, and the back of the leg is straight down to the heel. From behind the inner-side notch is gone and the leg lands on the heel. Two things remain, both in item 7: the back of the foot is still a wall straight to the floor, and the heel's back shows the outline of the leg column with a soft groove either side, which reads as the small bumps on the sides of the heel. A soft edge also remains on the outer side of the foot where the foot block meets the heel column (side view, a vertical shading edge below the ankle); it belongs with the heel.
- **Development notes:** capsules joined one by one with a smooth union printed a bulge at every joint (variants a to c); a heel-back blur and two heel masses (e, f, g) made a dent or a ball on the heel and were dropped; a slope-plane fillet wedge (i, j) left a hard shelf and was dropped.
- **Wall time:** about 1 hour 25 minutes (18:37 to 20:05), including the interrupted build.
- **Blocked by:** nothing.
