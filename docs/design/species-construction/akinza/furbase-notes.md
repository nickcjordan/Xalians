# Akinza fur base head (2026-10-08)

Nick, 2026-10-08, approved: "I'd like for you to adjust the model to make this texture look better." The fur pass on assembled-2999 read 4/10 from three blind readers three times; on the clay the ear fans carried lock plates with ledges, rear ridges, rim needles and dark grooves, pins and tufts stood on the crown between the ears, and the skin at each eye outline sat in a shallow gutter. This variant keeps the outline and lets the fur do the detail.

## What was built

- Recipe: `recipe-furbase.json` is `recipe.json` plus one head step, H36, after H35 (`recipe.py add`). Every other step, the body and the join are the baseline's; the assembly reads H36.
- Step: `art/species-construction/fur_base_head_field.py` with `art/species-construction/specs/fur-base-v1.json` (all parameters, head-local units). It works on the skin's level set at voxel .0025 like the other field stages, in x slabs, and leaves the eye globes, irises, nose and mouth objects alone.
- Output: head-3018, assembled-3019, packet `untracked/species-construction/akinza/loop/packets/assembled-3019`. Earlier tuning builds of the same recipe file (head-3014/assembled-3015, head-3016/assembled-3017) are superseded.

Per part:

1. Ear fans: each wing rebuilt as one shell from heightfields over the front projection (front surface, back surface, outline). The outline is opened (drops rim needles), closed, blurred and inset half a voxel; both surfaces get a masked blur taken from cells clear of the rim band, so plate ledges, rear ridges and grooves become gentle slopes and the inner cup stays. Rim: elliptical profile .04 wide, smooth apex, light 3D blur of the shell field. Gaps between stacked plates are filled with the column hull before blending, so the blend never mixes two layers.
2. Crown: top heightfield opened with a .06 disk (pins and tufts gone), closed, blurred; near the top outline it may not rise above the original or closed top (otherwise it builds a lip over the rear wall). The skull runs from the forehead over the crown into the ear roots.
3. Back of skull: back heightfield blurred (.03) between heights -.15 and .38, so the rear plate's seam ledges go.
4. Eyes: in a ring 1.0 to 1.6 outline radii outside each globe (outline measured per angle about the globe's own axis), the skin is united with a blurred copy of itself, which fills concave gutter skin only. Nothing inside the outline moves.
5. Pale inner-ear slot: the input's pale area projected onto the front view, smoothed there, given to the front-facing faces of the new shell (slot list and index unchanged, `Pale inner-ear coat.001`).

## Measures (assembled-3019 against assembled-2999)

Front occupancy renders, fixed frame; head band is everything above the narrowest neck row.

| Measure | Value |
|---|---|
| Whole figure front IoU | .982 (back .982, left .995) |
| Head band front IoU, raw | .938 (area .949) |
| Outer fans (head-local abs x .6 and more), raw | IoU .921, area .941 |
| Outer fans against the baseline with features under about 4 px opened away (the rim needles) | IoU .968, area .989 |
| Fan span, front | 364 px; baseline 393 px with needles, 370 px with needles opened (-1.6 percent) |
| Crown band (abs x under .6) | IoU .946, 5.1 percent of its area lost: the removed crown tufts and the upright tufts at the inner fan tops |
| Eye ring gutter, 10th percentile offset from a smoothed surface, ring 1.0 to 1.15 | -.0029 / -.0032 to -.0021 / -.0023 head units |

Candidate summary: technical check passes (one component, no non-manifold edges), no new seams, containment within allowance (H36 judged against H33), no face guard broken. R04.1 newly passes (.891 to .900); R01.1, R01.2, R01.6, R03.1, R03.2, R04.2 and I09 moved without changing result.

## Still open

- The whole front outline is within 2 percent only once the needles and crown tufts are discounted (both were asked to go); the raw head band differs by about 6 percent.
- The eye hollow is mostly the broad dish the globe sits in, not a deep gutter; filling that dish would raise the skin past the fixed globe, so only the narrow gutter was filled. The gray around the eye in eyes-front is lighter, not gone.
- The rim of each wing still has soft lumps seen edge-on, and the back-top corner beside each ear root shades a little unevenly; both are smooth (no ledge, crease or groove) and well under fur length.
- `recipe.py pin` reports two open items on B-23 (a body step); they are on the baseline `recipe.json` too and were left alone.

# Fur base v2: authored ears (2026-10-09)

Nick on fur over v1 (assembled-3019): the plush ears "look like a weird poorly molded piece of play-doh". v1 smoothed the old fan and kept its blobby volume, so the ear had no designed shape. v2 authors each ear.

## What was built

- Recipe: `recipe-furbase-v2.json` is `recipe.json` plus H36 after H35, now `art/species-construction/fur_base_head_field_v2.py` with `specs/fur-base-v2.json` and the sheet envelope `specs/r03_envelope.npz` as a pinned file argument. Every other step is the baseline's.
- Output: head-3022, assembled-3023, packet `untracked/species-construction/akinza/loop/packets/assembled-3023`. Side-by-side m04 and m05 of v1 and v2: `untracked/species-construction/akinza/loop/scratch/furbase/compare/`. head-3020/assembled-3021 is a superseded build of the same recipe file (its ear root bridged the jaw notch).
- The step runs the whole v1 pipeline on the skull (crown, back of skull with a wider blur, eye fill), cuts the old fan off outside a superellipse skull section, and unions two authored ears with a fillet:
  - Outline: the first sheet's closed front fan outline mapped into head-local space as `fan_clumps_front.py` does, blurred .02 and inset .008, so it is one clean curve with the sheet's gentle scallops.
  - Profile: one quadratic mid-surface in |x| and z, fitted to the old fan over both wings at once; the old V sweep with a gentle forward curve toward the tips, identical on both sides, no ripples.
  - Thickness: .03 head units (about 5 percent of a wing's width), a rolled rim, and a root flare front and back so the ear grows out of the head side; the back of the ear is one convex surface into the back of the skull. The ear's lower edge rises near the root, keeping the sheet's notch between ear bottom and jaw.
  - Cup: the R03 cup polygons push the shell back .045 with a raised front rim around them; the pale slot is drawn from the same cup.
  - Clean-up: a blur on each forehead top corner (a knob where the old fan met the forehead) and a light polish over the back of the skull.

## Measures (assembled-3023)

| Measure | 2999 | v1 (3019) | v2 (3023) |
|---|---|---|---|
| R01.1 front head band IoU against the sheet | .886 | .892 | .916 (now passes) |
| R04.1 back head band IoU against the sheet | .891 | .900 | .909 (now passes) |
| R01.2 left head band IoU against the sheet | .929 | .933 | .914 |
| R03.1 ear span against the sheet | 1.029 | .993 | 1.021 |
| Front head band IoU against 2999 | 1 | .938 | .906 |
| Outer fans IoU against 2999 (needles opened) | 1 | .968 | .868 |
| Whole figure front IoU against 2999 | 1 | .982 | .972 |

v2 follows the sheet, not 2999, where the two differ, so it is closer to the sheet and further from 2999. Technical check passes, no new seams, containment within allowance, no face guard broken, nothing in R01 to R04 fails (R01.6 1.043, R04.2 .039, R03.2 .045).

## Still open

- A faint rectangular panel edge shows on the back of the skull in the rear-oblique view; it is the old rear plate, softened by the wider back blur and the polish but not removed.
- The cheek ruff under each ear (inside the face guard) and the nape locks above the neck are unchanged from 2999.
- The pale cup boundary follows the voxel grid (fine stair-step at render size); the fur pass smooths the slot anyway.

# Smooth face v1 (2026-10-09)

Nick, after fur on assembled-3023: fix the model before more texture work, the face looks lumpy under fur. A bare-skin render at the fur cameras (`untracked/species-construction/akinza/surface/assembled-3023/diagnosis/clay-vs-fur-face.png`, `clay-vs-fur-head.png`) showed six faults in the model: a forehead ridge above the eyes; bulges under and beside the eyes with creases toward the mouth; a lumpy, pinched muzzle; a faceted jaw edge with corners at the hinge; a diagonal fold on the throat; wavy ear rims.

## What was built

- Recipe: `recipe-furbase-v3.json` is `recipe-furbase-v2.json` plus head step H37 after H36, `art/species-construction/smooth_face_field.py` with `specs/face-smooth-v1.json` and the sheet envelope. Every other step is v2's.
- Output: head-3030, assembled-3031, packet `untracked/species-construction/akinza/loop/packets/assembled-3031`. Bare-skin comparisons at the fur cameras: `untracked/species-construction/akinza/surface/assembled-3031/diagnosis/clay-3023-vs-3031-{face,head,side,threequarter}.png`. head-3024/assembled-3025, head-3026/assembled-3028 and head-3027/assembled-3029 are superseded builds (ear outline too smooth for the front outline, before the crown dome).
- Face: the face is a radial height about (0, 0, -.12), sampled by ray casts. It is refaired as a thin plate on the sphere that follows the input with lumps down-weighted (three reweighting passes) and an authored ellipsoid mass (cranium, cheeks, muzzle, chin, throat; `fit_face_mass.py`, fitted once with the eye rings, nose and mouth weighted up). It is pinned on the eye globes and 4 degrees around them, on the nose and mouth footprints and outside the face region, and blended in field space. Rays that cross the skin more than once (under the ears) are left out.
- Crown: the two dips between the crown centre and the ear roots are raised by at most .02 toward a smooth arch (top-facing columns only). Without it the smoother ear outline cost front outline (R01.1 .9147 to .9159 in the superseded builds).
- Ears: the v2 shell is built on its own outline and on an outline blurred .03 (v2 .02), inset .006 (v2 .008) and held below the frame top, and only the difference is added, so nothing moves where the outlines agree.

## Measures (assembled-3031 against assembled-3023)

| Measure | 3023 | 3031 |
|---|---|---|
| R01.1 front head band IoU against the sheet | .9164 | .9179 |
| R01.2 left head band IoU against the sheet | .9135 | .9166 |
| R04.1 back head band IoU against the sheet | .9086 | .9113 |
| R03.1 ear span against the sheet | 1.021 | 1.024 |
| Face move, 95th percentile / out / in (head units) | | .012 / .020 / -.021 |

Technical check passes (one component, no non-manifold edges), no face guard broken, no new seams, containment within allowance (H37 against H33), regionShift .005 figure heights at most (R01 to R04), R05 and below 0.

## Still open

- A soft diagonal shadow line remains on the neck at the head trim and below it (world z about .45). The hard fold under the left jaw is gone; what is left lies in the assembly's neck loft and the body, outside this head-only step.
- The cheek ruff under each ear (outside the face region: rays there cross the skin twice) and the faint panel at the back of the skull are unchanged.

# Analytic ears H38, three outlines (2026-10-09)

Nick on the H36/H37 ears: "the ears still have an odd shape ... like you took a piece of Play-Doh and smashed it and then tried to mold it back to the right shape"; he wants "a smooth, defined, symmetrical, clean, rounded ear shape, as you would expect in a small animal like this". Every earlier ear was derived from the old sculpted fan (traced outline, profile fitted to the old sweep), so it inherited its irregularities. H38 builds the ears from a few parameters and reads nothing from the old ear.

## What was built

- Step H38 after H37: `art/species-construction/analytic_ears_field.py` with `specs/ears-analytic-{A,B,C}.json` (each spec holds only the outline; every construction key is a script default). Recipes `recipe-furbase-v4{A,B,C}.json` are `recipe-furbase-v3.json` plus H38 (`recipe.py add`).
- Outputs: A head-3044 / assembled-3047, B head-3045 / assembled-3048, C head-3046 / assembled-3049; packets under `untracked/species-construction/akinza/loop/packets/`. Superseded builds of the same recipe files: assembled-3035 to 3037 and 3041 to 3043 (ear bottoms closed the notch under the fan, a dip between crown and ear tops, A below the figure-height invariant).
- One ear in u = |x|, so the other is its exact mirror (pale faces per side: 26397/26397, 24801/24801, 29933/29933).
  - Outline: a closed uniform cubic B-spline through six control points (C2 smooth, no scallops or dents). A: the sheet's broad fan as a rounded triangle. B: narrower and taller with a rounder tip. C: a broad wide oval.
  - Form: one analytic mid-surface (a backward sweep with one constant gentle curvature, a funnel that brings the edges forward, deepest at the base, opening forward), an even .03 shell with a rolled rim bead, a smooth back flare at the root and a .10 fillet into the skull.
  - Cup: an elliptical bowl concentric with the visible outline (moment ellipse times .62) with a smooth raised rim; `Pale inner-ear coat.001` is given to the front faces inside that ellipse, so its edge is the ellipse.
  - Skull under the ears: H37 beyond |x| .24 (where the old ear roots begin) is replaced by an ellipsoidal end cap grown from H37's own section at |x| .24 (both sides averaged, hollows closed, shorter toward the jaw). H37 is kept exactly inside |x| .18, and kept around each eye globe (exact within .012 to .03 of the globe, lightly blurred out to .12).

## Measures (against assembled-3031)

| Measure | 3031 | A 3047 | B 3048 | C 3049 |
|---|---|---|---|---|
| R03.1 ear span (.97 to 1.03) | 1.024 | 1.004 | .993 | 1.004 |
| R01.1 front head IoU (min .90) | .918 | .846 | .785 | .840 |
| R01.2 left head IoU (min .90) | .917 | .908 | .909 | .908 |
| R04.1 back head IoU (min .90) | .911 | .884 | .829 | .848 |
| R03.2 fan area missing (max .06) | .042 | .105 | .155 | .069 |
| R04.2 side extra (max .06) | .035 | .024 | .027 | .024 |
| R01.6 back width at .18 (max 1.15) | 1.043 | 1.043 | 1.043 | 1.043 |
| I09 figure height (1.8605 within 1 percent) | 1.859 | 1.848 | 1.866 | 1.849 |

All three pass the technical check (one component, no non-manifold edges); containment is within allowance for A and C, and B is flagged outside all zones (.031 against .015, its taller ears). Each packet flags a front crease at the ear-fan root seam joint.

R01.1, R04.1 and R03.2 fail for all three, and they cannot all pass with exact mirror ears: the first sheet's right ear stands higher than its left (its tip reaches the frame top, the left about .08 head units lower), so the sheet against its own mirror reads IoU .79 over the head band and the best symmetric shape about .88 to .89. That is a lever case for Nick: symmetry (his ruling) against the sheet-overlap bar of .90.

Bare-skin comparisons (3031, A, B, C): `untracked/species-construction/akinza/surface/ears-analytic-compare/` (`clay-3031-vs-A-B-C-{head,threequarter,side,back,face}.png` at the fur cameras, `heads-3030-vs-A-B-C-{head-front,head-back,head-side,head-top,q-L,q-R}.png` of the head components).

## Still open

- Uncovered side of the head. The old ears wrapped the head side right beside the eyes, so H38 exposes skin H37 never had to show: a faint vertical line on the forehead and crown at |x| about .24 where the cap blends in, soft dents and folds beside the outer eye corners and on the temple, small bumps at the jaw corners, and soft planes on the temple in the side view. They are smooth (no ledge or crease), but visible on the bare skin.
- At the inner (root) end of the cup, a small shelf where the bowl meets the funnel and root flare (close view `cup-L` of head-3044).
- The pale cup edge is the ellipse itself; a very close view shows only face-size steps.

# Analytic ears pass 2: Grogu-like D and E, head-side fixes (2026-10-09)

Nick on A to C: "going in the better direction, although my original design had them a bit closer to the shape of Grogu's ears." Two more outlines and a clean-up pass on the skin the new ears uncover.

## What was built

- Same H38 script (`analytic_ears_field.py`, updated); specs `ears-analytic-D.json`, `ears-analytic-E.json`; recipes `recipe-furbase-v4D.json`, `-v4E.json`; `recipe-furbase-v4A.json` rebuilt on the updated script. B and C keep the pass 1 script, frozen as `analytic_ears_field_p4be809d4.py` (their recipes point to it).
- Outputs: A head-3062 / assembled-3065, D head-3063 / assembled-3066, E head-3064 / assembled-3067. Superseded: assembled-3053, 3054, 3057 (same recipes, before the back blur and the cup-rim change).
- D: seven-point outline, set mostly sideways and a little up, widest at the root, tapering to a softly rounded tip that lifts at the end; length about 2.4 times the root width. E: same set and taper, shorter and broader (about 1.8). Both have an elongated cup (`earCupScale` per axis) that is deepest near the root and fades toward the tip (`earCupTaper`).
- Script changes, all on the skull side (H37 kept exactly inside |x| .18):
  - the eye-globe distance is blurred, the band around the eyes is blurred wider (.04), and the face is kept exactly at the keep line (no step there);
  - the cap's smoothed section gets back its difference from H37 near |x| .24, so the cap leaves H37 without a line;
  - the fillet is smaller in front of the ear's mid-surface (.05 against .10 behind), so it no longer builds a shelf at the cup's root side;
  - the cap shortens more gradually toward the jaw;
  - the back of the skull is blurred (.05) below the crown, for the panel edge and the nape lumps;
  - the raised cup rim is lower and wider.
- Nick's silhouette (`apps/web/src/svg/species/akinza.svg`, rasterized): its ears are one broad fan per side, nearly horizontal, the upper edge almost level with the crown and the lower edge falling from the tip to the jaw, length about 1.5 times the root height, each with a large inner notch (the cup). That sits between A and E: wider sideways than A and more level, not as long and thin as D.
- Neck: rendering assembled-3031's clay with every rig light's shadow off removes the diagonal line on the neck completely, so it is the head's cast shadow on the neck, not a fold. A Taubin relax of the neck window (tried as a post step) changed nothing visible and was dropped; the join is unchanged and has no containment to report.

## Measures (against assembled-3031)

| Measure | 3031 | A 3065 | D 3066 | E 3067 |
|---|---|---|---|---|
| R03.1 ear span (.97 to 1.03) | 1.024 | 1.004 | 1.068 | 1.046 |
| R01.1 front head IoU (min .90) | .918 | .847 | .627 | .691 |
| R01.2 side head IoU (min .90) | .917 | .897 | .879 | .887 |
| R04.1 back head IoU (min .90) | .911 | .886 | .671 | .738 |
| R03.2 fan area missing (max .06) | .042 | .103 | .329 | .259 |
| R04.2 side extra | .035 | .024 | .024 | .025 |
| R01.6 back width at .18 | 1.043 | 1.071 | 1.071 | 1.071 |
| I09 figure height | 1.859 | 1.848 | 1.852 | 1.853 |

All three pass the technical check; containment is within allowance (worst R05/R06 .0004 against .002); R05 regionShift .007 (the jaw cap). D and E are far from the sheet's fan by design (the fan was the old outline). The seam check flags the ear-root crease for all three; D and E add a front and back outline kink at the ear-root row, where their narrow root meets the head.

Comparisons: `untracked/species-construction/akinza/surface/ears-analytic-compare2/` (`clay-3031-A-D-E-{head,threequarter,side,back,face}.png`, `heads-3030-A-D-E-{head-front,head-back,head-side,head-top,q-L,q-R,face-F,cup-L}.png`).

## Still open

- A faint vertical line on the forehead and back of the skull at |x| about .24 (lighter than in pass 1, still visible in face-F and head-back).
- Soft folds beside the outer eye corners remain (softer than pass 1).
- D and E side view: a small ring mark on the skull side where the old ear root sat.
- A: a small knob at the root end of the cup (cup-L).
- The packet's ear-root crease flag is not cleared.

# Head redesign around the ears, v5 (2026-10-09)

Nick on A, D and E: "Prefer something between A and E, but it looks like you added some bulk to the head ... take the new version between A and E of the ears, and then completely rethink the head shape and how it should be as the ears attach to it. Maybe go back and look at the original reference drawing."

## What the drawings show, and where the H38 head went wrong

Measured on the first sheet (`evidence/identity-run-0001.png`; front 628 px and side 637 px per figure height, so about .0059 head units per pixel), with the face aligned on the eye centre (model z .028), and on Nick's silhouette (`apps/web/src/svg/species/akinza.svg`, rasterized, scaled to the sheet's ear span). Head-local units throughout (the head is assembled at half scale). The sheet's skull above the ear roots is hidden by fur; its head is read from the face below the ears, the back view and the head clay study (r04).

- The sheet's head is a small round ball. Below the ear roots its front outline (fur included) is .30 half wide at .13 below the eye centre, .25 at .20 below, .19 at .25 below, and closes into a small chin about .29 below the eye centre. The back view shows the same round ball (.295 half wide just under the ears) narrowing into the neck.
- The ears leave the upper sides of that ball. Their lower edge meets the cheek right beside the outer eye corner, .12 below the eye centre at |x| .30; their upper edge runs into the crown, which dips between the ears in a shallow V (crown about .38 to .41 above the eye centre with fur). In the side view the ear rises from the top back of the skull and the nape below it is tucked in (at .19 below the eye centre the back of the head is .07 further forward than the model's).
- Nick's silhouette has the same arrangement: broad fans from the top sides, the lower edge falling from the tip to the jaw, the upper edge level with the crown, a round face below. It is drawn with taller eyes and a longer face (eye centre to chin 1.25 times the eye spacing; the sheet .80, the model .88), so it confirms the arrangement, not the exact proportions.
- H37 and H38 kept the skull that was built while the old fan ears covered the head sides, and H38 grew an end cap from H37's section at |x| .24. Sections of head-3064 (E): straight parallel skull sides at |x| .41 from the eyes to the crown, a flat back with corners, temples .39 to .41 half wide (the sheet about .34 to .35), the back of the skull .36 to .39 half wide at y .20. The E ears start from that wall at z .12, about .2 higher and .1 further out than the sheet's root, so a tall plane of bare skull side shows between the eye and the ear: that is the bulk and the boxy side. The jaw and chin (H37) are only about .02 wider than the sheet, and the eyes, nose and mouth sit where the sheet has them (the sheet's mouth and chin are about .025 higher; left as is, see Still open).

Picture: `untracked/species-construction/akinza/surface/head-redesign/overlay-current.png` (gray: sheet outline; amber: Nick's silhouette; blue: E 3067; light blue: A 3065; dotted: 3031; front and side). Sections: `sections-current.png` (E against 3031).

## What was built

- Ears F (`specs/ears-analytic-F.json`): an eight-point closed cubic B-spline between A and E, same H38 construction (exact mirror, .03 shell, funnel root, elliptic cup, rolled rim). The lower edge lies between A's and E's and leaves the head beside the outer eye corner (visible junction z -.09 at |x| .32, the sheet's place); the upper edge rises from the crown to the tip; the tip is slimmer than A's. Cup elongated, deepest toward the root (scale .66 by .60, taper .4).
- Head step H39 (`art/species-construction/analytic_head_field.py`, spec `specs/head-analytic-v5.json`), in place of H38 after H37. Recipe `recipe-furbase-v5.json` (v3 plus H39). The whole skull is one authored mass: a smooth union of ellipsoids (cranium, mirrored jaw, muzzle, chin, throat, mirrored eye socket) fitted by `fit_head_mass.py` to the sheet targets in `specs/head-targets-v5.json` (front half widths, midline back of head, rear half widths behind y .12, crown height) and to the H37 face around the eyes, nose and mouth (input: the head-3030 dump written by `dump_head_mesh.py`). The face points fit within .0015 (median) and .005 (90th percentile). Kept from H37: the lid band and the skin the globes sit in (within .02 of the globe, fading out by .06), the nose pad and mouth line, the face front between and below the eyes, and the neck stub below z -.30, so the join meets the same neck. The blend weights are C2 (smootherstep, keep distances resampled by a cubic B-spline); C1 weights and trilinear distances left shading lines and a dimpled face in the development builds. A ring around each eye is blended toward a blurred field, so the seam between the kept lid band and the mass leaves no fold. The buried inner part of each ear stays flat behind the brow (`earInnerFlat`; with the root moved in, H38's sweep swung it out of the forehead) and the start cut is buried inside the skull; fillets .16 behind and .08 in front.
- Output: head-3070, assembled-3071, packet `untracked/species-construction/akinza/loop/packets/assembled-3071`. Superseded: head-3068 / assembled-3069 (ear tips .02 longer, R03.1 1.048).

## Measures

Head numbers (head-local, from the head components):

| | 3031 | A 3065 | E 3067 | v5 3071 | sheet |
|---|---|---|---|---|---|
| Temple half width at y -.12, z .03 / .15 / .27 | .41 / .37 / .40 | .39 / .41 / .38 | .39 / .41 / .38 | .34 / .33 / .29 | about .34 / .34 / .29 (round head under fur) |
| Back of skull half width at y +.20, z .03 / .15 / .27 | (old fan) | .36 / .39 / .37 | .36 / .39 / .37 | .25 / .24 / .18 | |
| Crown at the midline | .41 | .41 | .41 | .42 | about .41 (with fur) |
| Ear lower edge meets the head | (old fan) | z -.08 to -.14 | z .12 | z -.09 at x .32 | z -.09 at x .30 |

Loop measures (packet against assembled-3031):

| Measure | 3031 | A 3065 | E 3067 | v5 3071 |
|---|---|---|---|---|
| R03.1 ear span (.97 to 1.03) | 1.024 | 1.004 | 1.046 | 1.029 |
| R01.1 front head IoU (min .90) | .918 | .847 | .691 | .785 |
| R01.2 side head IoU (min .90) | .917 | .897 | .887 | .869 |
| R04.1 back head IoU (min .90) | .911 | .886 | .738 | .835 |
| R03.2 fan area missing (max .06) | .042 | .103 | .259 | .160 |
| R04.2 side extra (max .06) | .035 | .024 | .025 | .030 |
| R01.6 back width at .18 (max 1.15) | 1.043 | 1.071 | 1.071 | 1.025 |
| I09 figure height (1.8605 within 1 percent) | 1.859 | 1.848 | 1.853 | 1.859 |

Technical check passes (one component, no non-manifold edges); containment within allowance (R05 and R06 .0004 against .002); regionShift .057 figure heights at most, all inside the head regions R01 to R04 and 0 elsewhere; the body is unchanged (body-2960). R01.1, R01.2, R04.1 and R03.2 fail as for every H38 variant: they compare with the sheet's fur fan, which is wider and taller than a clean shell ear, and the small head now also leaves out the sheet's fur crest (R01.2 falls for that). The seam check flags the ear-root crease (front), as for A to E. The face guard reports `measureFailed` (one eye measured); E 3067 already failed the same way ("only 7 of 12 rays crossed sclera and band" on the second eye). The measured eye reads aspect 1.39, iris offset .087, band top over bottom 6.1, within the guards.

Comparisons (bare clay): `untracked/species-construction/akinza/surface/head-redesign/clay-3031-A-E-new-{head,threequarter,side,back,face}.png` at the fur cameras and `heads-3030-A-E-new-{w-front,w-tq,w-side,w-back,w-top,face,face-q,w-rq}.png` of the head components. The drawing over the new outline: `overlay-new.png`; sections against E: `sections-new.png`.

## Still open

- The sheet's mouth and chin sit about .025 higher on the face than the model's (eye centre to mouth .22 against .24). The mouth line was kept and the jaw taper was hung from the model's chin; moving the mouth and chin up is Nick's call.
- The back of the skull narrows toward the nape (.24 half wide at y .20, where a round ball would be about .27), so in the back view the head runs into the neck in a gentle V. The ellipsoid fit did not fully meet the rear targets.
- A soft cushion remains around each eye just outside the lid band, and a faint fold behind the outer eye corner in the side view: much softer than A to E, still visible on bare clay.
- The back of each ear root shows a soft vertical line where the back flare meets the skull (back view), and the ear top meets the crown with a small step in the rear three-quarter view (`w-rq`).
- The cheeks below the eyes are H37's, about .02 wider per side than the sheet.
