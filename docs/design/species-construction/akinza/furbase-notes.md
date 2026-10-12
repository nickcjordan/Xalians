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

# Head v6: eye surround, muzzle and mouth rebuilt (2026-10-09)

Nick on assembled-3071: "much better ... still not what I want"; "weird artifacts left in place from what I'm interpreting as leftover eye sockets that got moved outward ... almost on the outside of the eyeballs", and "a weird divot in the middle of the mouth that makes the whole thing look a little disturbing". Both were H37 skin that v5 kept: the old socket rims around each eye (they sat on the old wide face and now lay outside the new head's eyes) and the pit at the mouth centre under the nose.

## What was built

- Step H40 (`art/species-construction/analytic_head_v6_field.py`, spec `specs/head-analytic-v6.json`, ears `specs/ears-analytic-F6.json`), in place of H39 after H37; recipe `recipe-furbase-v6.json` (v3 plus H40). v5's script, spec, F ears and recipe are untouched (`recipe.py status` on v5 still reports every step cached).
- Eyes: no H37 skin is kept around them. Per eye globe a frame from its vertices (forward normal, in-plane axes); the opening outline lies a third of the way from the edge of the white to the outer edge of the globe's dark outline band (its own two materials), smoothed; inside it everything in front of the globe is cut. The skin around each eye is a radial thin plate (as in H37): pinned .008 over the globe in a ring .008 wide just outside the opening (the lid edge), pinned to the head mass where the mass is more than .10 from the globes, and free in between with a light pull toward the mass, so the head runs into the lid in the smoothest surface the two allow. Tried and dropped on the way: a lid bead tube (read as a ring around the eye), a lid shell on the whole covered rim (pulled the skin into a deep socket), a blur of the ring (left concentric ripples), a mass refit to the globe rims (puffy bags); the nearest-globe distance had a kink at the midline, so the plate's weight is blurred (it left a line between the eyes).
- Muzzle, mouth and chin: the H37 face-front keep and mouth keep are off; the nose pad is kept only within .002 to .008 of the nose object (a wider keep carried the H37 pit under it, and none let the skin through the nose). The mass is refit (`fit_head_mass.py`, new optional keys, v5's fit reproduces exactly) on `specs/head-targets-v6.json`: the H37 face points below the nose lifted .025, the jaw rows the sheet's own taper aligned on the eyes, the H37 skin within .035 of the mouth no target. The mouth line objects (the existing curves and material) are lifted .025 and keep their depth from the new skin. Raising the mouth and chin by .025 is my call from the sheet measurement, overridable by Nick.
- Ears: the back flare is off (fillet .20 behind), and the buried inner end of the outline is lowered (F6: [.10, .16] and [.32, .33] for F's [.10, .20] and [.28, .35], tips .01 shorter), so the ear tops leave the crown lower; the two humps on the back of the crown go. The neck is kept below z -.38 to -.33 (v5: -.36 to -.30).
- Output: head-3076, assembled-3077, packet `untracked/species-construction/akinza/loop/packets/assembled-3077`. Superseded: assembled-3073 (ear span 1.037), 3075 (lid .004 flickered against the globe, wider nose keep).

## Measures (packet against assembled-3071)

| Measure | v5 3071 | v6 3077 |
|---|---|---|
| R03.1 ear span (.97 to 1.03) | 1.029 | 1.026 |
| R01.1 front head IoU (min .90) | .785 | .793 |
| R01.2 side head IoU (min .90) | .869 | .853 |
| R04.1 back head IoU (min .90) | .835 | .840 |
| R03.2 fan area missing (max .06) | .160 | .153 |
| R01.6 back width at .18 (max 1.15) | 1.025 | 1.108 |
| R01.7 side depth at .22 (max 1.15) | 1.085 | .637 |
| R06.8 chest ahead of chin at .22 (within .01) | -.002 | -.039 (newly fails) |
| I09 figure height | 1.859 | 1.862 |
| Face measure | second eye unmeasurable | both eyes measured: aspect 1.20 / 1.23, iris offset .053 / .044, band top over bottom 1.27 / .85 |

Technical check passes; no new seams (the ear-root crease flag of A to v5 is gone); regionShift .012 at most, inside R01 to R04, 0 elsewhere; body unchanged. Containment flags outside-all-zones .030 against .015: the raised chin and throat, which sit below the head zones. R06.8 and R01.7 measure the chin row at .22 of the figure: the sheet's chin, placed by the fit frame, sits there, so raising the chin by the eye-aligned .025 costs R06.8. Both follow from the raise; reverting it (liftFace and mouthLift to 0) would restore them.

Comparisons (bare clay, v5 against v6): `untracked/species-construction/akinza/surface/head-redesign/v6/clay-3071-vs-v6-{head,face,threequarter,side,back}.png` at the fur cameras, `heads-3070-vs-v6-{eyes-close,eye-close-q,mouth-close,mouth-close-q,face,face-q,w-front,w-side,w-back,w-rq}.png` of the head components (the first four are the close eye and mouth crops).

## Looked at honestly

- The socket marks are gone: no rim, cushion or hollow outside the eyes in the front, three-quarter or close views; the skin runs smoothly into an even lid edge on the globe.
- The mouth divot is gone: the muzzle under the nose is one smooth surface, the mouth line sits on it as a clean shallow curve (its own V where the two halves meet, as drawn), the chin is a small rounded form.
- The crown humps at the back are gone.

## Still open

- The dark outline band now shows about evenly all round the eye (band top over bottom about 1); v5 and H37 had a heavier upper line. The upper emphasis could come back with an outline set higher on the globe at the top.
- A slight fuzzy fringe at the lower outer edge of each eye in close views, where the lid lies within a voxel or two of the globe.
- A faint diagonal fold behind the outer eye corner in the side view (much softer than v5), and the face outline has a slight corner where the cheek meets each ear's lower root in the front view.
- The back of each ear root still shows a soft vertical shading line.
- A soft horizontal line at the jaw and neck junction (the kept neck stub meets the raised chin), visible in the close mouth views.

# Head v6b: v5's round head under v6's eyes and mouth (2026-10-09/10)

Coordinator on v6 (assembled-3077): the head lost v5's roundness (flatter top, temple corners where the ears meet, flat cheeks with a corner at each lower ear root, a square jaw, a line where the jaw meets the neck); the upper eye outline had gone even. Then, as Nick's calls: keep the .025 mouth and chin raise but bring the chin-to-chest check and containment back within limits, and sweep the ears' lower edge about halfway toward Nick's silhouette.

## What was built

- Step H41 (`art/species-construction/analytic_head_v6b_field.py`, spec `specs/head-analytic-v6b.json`, ears `specs/ears-analytic-F7.json`) in place of H40 after H37; recipe `recipe-furbase-v6b.json`. v5 and v6 files are untouched.
- Head: v5's mass and v5's face-front keep again (v6's refit mass was the cause of the squarer head), with the muzzle and mouth left to the mass by a window (no H37 pit). The mouth, muzzle and upper chin are raised .025 by a smooth warp of the field (full between z -.19 and -.24, none above -.15 or below -.30, front only, held at 0 round the nose) instead of a refit, so the chin underside and throat stay where v5 had them: chin-to-chest R06.8 -.005 (v6 -.039, limit .01) and containment within allowance.
- Face: one radial thin plate over the whole face front, temples, cheeks and jaw (`faceFair`, data .2, grid -70 to 80 by -110 to 110 degrees), fairing the composite head itself, pinned at a narrow lid ring on each eye globe, its border and the nose. It removes the soft lumps of the ellipsoid unions and blends and the corners at the lower ear roots without changing the outline. A wider grid with a lighter data weight filled the notch under the ears and widened the jaw; one ending at -45 degrees left a crease under the chin.
- Eyes: v6's opening and lid, with the opening reaching .75 into the dark outline band at the top (.35 at the bottom), so the upper outline is heavier: band top over bottom 2.8 / 1.6 (v5 6.1, v6 1.3 / .9). The opening edge is rounded .008, which removed v6's fuzzy fringe.
- Ears F7: F6b with the lower edge swept toward Nick's silhouette: about .04 lower at u .6, .06 at .8, .07 at .9, about .01 at the root (a root swept as far as the rest widened the back view at the jaw row, R01.6 1.22). F6b is F6 with the upper edge control .01 lower (F6's lowered root had lifted the upper edge just past the head's top row, the containment flag of v6). Back flare .03, front fillet .10.
- Output: head-3094, assembled-3095, packet `untracked/species-construction/akinza/loop/packets/assembled-3095`. Superseded builds of the same recipe file: 3079, 3081, 3083, 3085, 3087, 3089, 3091, 3093.

## Measures (packet against assembled-3071)

| Measure | v5 3071 | v6 3077 | v6b 3095 |
|---|---|---|---|
| R03.1 ear span (.97 to 1.03) | 1.029 | 1.026 | 1.026 |
| R01.1 front head IoU (min .90) | .785 | .793 | .826 |
| R01.2 side head IoU (min .90) | .869 | .853 | .860 |
| R04.1 back head IoU (min .90) | .835 | .840 | .868 |
| R03.2 fan area missing (max .06) | .160 | .153 | .112 |
| R01.6 back width at .18 (max 1.15) | 1.025 | 1.108 | 1.145 |
| R06.8 chest ahead of chin (within .01) | -.002 | -.039 (fail) | -.005 |
| Containment outside all zones | within | .030 (flag) | within |
| I09 figure height | 1.859 | 1.862 | 1.859 |
| Eye band top over bottom | one eye 6.1 | 1.3 / .9 | 2.8 / 1.6 |

Technical check passes, no new seams, no face guard broken, regionShift .028 at most inside R01 to R04 and 0 elsewhere; body unchanged.

Comparisons: `untracked/species-construction/akinza/surface/head-redesign/v6b/clay-v5-v6-v6b-{head,face,threequarter,side,back}.png` (fur cameras, v5 3071, v6 3077, v6b 3095), `heads-v5-v6-v6b-{eyes-close,eye-close-q,mouth-close,mouth-close-q,face,face-q,w-front,w-side,w-back,w-rq}.png` (head components; the first four are the close eye and mouth crops), `overlay-v6b.png` (drawing over the new outline).

## Still open (my own look)

- A small light sliver at the tip of the nose in the assembled face view, and a slight notch in the muzzle just under it: the nose object's tip and the skin meet there within a voxel or two. Keeping no skin round the nose and cutting a seat behind it instead was tried and broke the skin through the nose (dev-u); not solved.
- R01.6 back width at .18 is 1.145 against 1.15: the swept ears' lower roots widen the back view just under them. A further sweep at the root would fail it.
- The jaw below the cheeks is a little fuller than the sheet's taper (the fairing plate rounds it); the face is round, not square, but the chin could taper more.
- The back of each ear root still shows a soft shading line in the back and rear three-quarter views (much fainter than v5's).
- The side view keeps a faint soft fold behind the outer eye corner.

# Head v6c: even eye outline, smooth muzzle (2026-10-10)

Coordinator on v6b: the dark band bulged into thick crescents at the outer sides of the eyes (and the inner side of the left eye), a groove crossed the muzzle under the nose, and a light sliver showed at the nose tip.

- Step H42 (`art/species-construction/analytic_head_v6c_field.py`, spec `specs/head-analytic-v6c.json`, ears F7), recipe `recipe-furbase-v6c.json`; v6b untouched. Output head-3096, assembled-3097.
- Eye outline: the opening is the white plus an absolute band (`openBand`: .007 at the sides and bottom, .018 along the top lid, sine taper) instead of a fraction of the globe's band, whose outer sides are wide; and v6's globe-hugging lid shell is back on (.006 thick, blend .006, ending .03 beyond the outline with a .02 round), so the skin covers the globe's band outside the opening. A wider shell blend (.012 to .02) left concentric ripples round the eyes. Band top over bottom 2.3 / 1.1.
- Muzzle: inside an ellipsoid between nose and mouth the face plate's data weight falls to .05 of its own (`faceFairSoft`), so the plate bridges the groove; skin standing in front of the nose's front surface is cut (`noseSeat` front).

| Measure | v6b 3095 | v6c 3097 |
|---|---|---|
| R03.1 ear span | 1.026 | 1.026 |
| R01.1 / R01.2 / R04.1 head IoU | .826 / .860 / .868 | .826 / .861 / .868 |
| R01.6 back width at .18 (max 1.15) | 1.145 | 1.145 |
| R06.8 chest ahead of chin | -.005 | -.003 |
| Containment | within | within |

Check passes, no new seams, no face guard broken. Comparisons: `untracked/species-construction/akinza/surface/head-redesign/v6c/clay-v5-v6b-v6c-{head,face,threequarter,side}.png`, `heads-v5-v6b-v6c-{eyes-close,eye-close-q,mouth-close,mouth-close-q,face,face-q}.png`, `face-crops-v5-v6b-v6c.png`.

## Still open (my own look)

- The crescents are much smaller but not gone: a narrow dark wedge remains at the outer side of the right eye and the inner side of the left eye in the assembled face view (the globe's band is widest there and the shell does not fully reach it).
- The light sliver under the nose tip still shows in the assembled fur-camera face view, though not in the head-component renders; the skin cut in front of the nose did not change it, so it is likely the nose object's own lower tip or how the surface scene shades it, not the skin. Not resolved.
- A faint horizontal shading line remains above the centre of the mouth line, much softer than v6b's groove.
- A faint ring of shading below each eye where the lid shell ends.

# Head v5m: v5 with only the mouth changed (2026-10-10)

Nick rejected v6, v6b and v6c (skull shape, uncanny lumps); the one change he liked was the mouth. His rule: one part at a time, nothing else changes. v5m is v5 exactly (recipe-furbase-v5, head-3070) plus one step after H39 that changes only the muzzle, mouth and chin.

- Step H43 (`art/species-construction/mouth_v5m_field.py`, spec `specs/head-mouth-v5m.json`, reads v5's mass from `specs/head-analytic-v5.json`), recipe `recipe-furbase-v5m.json` (v5 plus H43; every v5 step cached). It does not rebuild a field or remesh: it moves vertices of the v5 skin in place (same 689,832 vertices and faces), so nothing outside the mask can move.
- Divot: inside v6b's mouth window the skin is moved onto the v5 head mass (the pit was H37 skin that v5 kept), held near the nose and none above z -.14.
- Raise: the mouth, muzzle and upper chin rise .025 by v6b's warp, applied as its inverse map per vertex; the chin underside and throat stay (front weight y -.28 to -.10, none beyond |x| .26, held round the nose).
- Upper lip: the warp squeezes the lip between the fixed nose and the raised mouth, which left a shelf above the mouth; the lip's front depth is refit as a thin plate on a .002 grid (low data weight between nose and mouth, nose pinned with a soft edge, cubic B-spline lookup; a bilinear lookup and a hard pin left fine ripples under the nose).
- Mouth line: closed_mouth_0 and _1 lifted with the skin, depth to the skin unchanged (proud -.0048 to .0030, as v5); closed_mouth_2 (the short stroke that sat in the pit, never visible) set .003 under the new skin.
- Output: head-3098, assembled-3099, packet `untracked/species-construction/akinza/loop/packets/assembled-3099`.

## Measures

Per-vertex displacement of head-3098 against head-3070 (head units): outside the mask box (|x| < .28, z -.37 to -.10, y < .06) the maximum is 0.0 exactly; above z -.10 it is 0.0; the eye globes, irises and nose object do not move (0.0). Inside, the maximum is .0276 (median of moved vertices .0041); moved vertices span |x| up to .258 and z -.308 to -.111. By band: |x| under .12 up to .0276, .12 to .16 .023, .16 to .20 .015, .20 to .24 .0044, beyond .24 .0002. Assembly regionShift: R02 .0059 figure heights, every other region 0.0. Check passes, no new seams, face guards unchanged, containment within allowance. Measured changes: R01.7 1.085 to .999, R04.2 .030 to .028, R06.8 chest ahead of chin -.002 to -.009 (limit -.01, still passing, close), R01.1 and R01.2 change in the fourth decimal (both failing as on v5).

Images in `untracked/species-construction/akinza/surface/head-redesign/v5m/`: `clay-3071-vs-v5m-{face,head,threequarter,side}.png` (bare clay, fur cameras), `clay-3071-vs-v5m-mouth-crop.png`, `heads-3070-vs-3098-{mouth-close,mouth-close-q,eyes-close,eye-close-q,face-q,w-side}.png` (head components), `v5m-3098-heat.png` and `v5m-3098-heat-close.png` (displacement heat maps, front and side), `pixel-diff-{face,head,threequarter,side}.png` (render difference), `v5m-3098-numbers.json`.

## Still open (my own look)

- A soft shading band remains just above the mouth line, where the raised mouth sits closer under the fixed nose: much smoother than the warp alone left it, but visible on bare clay.
- The jaw sides below the mouth corners move up to .015 at |x| .16 to .20 (the chin raise fades out across them); the jaw outline keeps its shape in the front and three-quarter views.
- The lower face reads slightly darker on clay, because the raised chin front faces a little more downward; the pixel difference on the neck and chest is the chin's shadow, not geometry (regionShift 0 there).

# Head v5m2: smooth upper lip, one mouth line (2026-10-10)

Coordinator on v5m: remove the soft band above the mouth line so the lip from the nose pad down to the mouth is one gently convex slope, and join the two mouth curves into one continuous line with a soft centre point; same mask only. v5m is kept.

- Step H44 (`art/species-construction/mouth_v5m2_field.py`, spec `specs/head-mouth-v5m2.json`) in place of H43 after H39; recipe `recipe-furbase-v5m2.json`. v5m's script, spec and recipe are untouched.
- Upper lip: the lifted lower face also moves .02 forward (by the lift's own fraction, front-facing skin), so the lip is not squeezed into a steep band between the fixed nose and the raised mouth; the thin plate's target gets a .006 forward bump between nose and mouth, with a softer nose pin. The centre slope (depth over height) now rises steadily, .31 / .47 / .61 / .71 / .92 at z -.16 / -.17 / -.18 / -.19 / -.20 (v5m: .46 / .72 / 1.00 / 1.22 / 1.35). The mouth itself stays at +.025.
- Mouth line: the two curves already met at x 0 in the mesh, but their inner ends sat .003 buried in the old pit; their tube centres within .02 of the middle now come forward to the line's own depth (.0009 proud), and the V's corner is rounded (.008), so they read as one line with a soft centre point.
- Output: head-3100, assembled-3101, packet `untracked/species-construction/akinza/loop/packets/assembled-3101`.

Displacement against head-3070: outside the mask box 0.0 exactly, above z -.10 0.0, eyes, irises and nose 0.0; inside max .0358 (median .0046), moved vertices within |x| .259, z -.308 to -.110. regionShift R02 .0052 figure heights, every other region 0.0. Check passes, no new seams, face guards unchanged, containment within allowance; R06.8 -.0077 (v5m -.0091, limit -.01), R01.7 1.016.

Images in `untracked/species-construction/akinza/surface/head-redesign/v5m2/`: `clay-3071-vs-v5m-vs-v5m2-{face,head,threequarter,side}.png`, `clay-3071-vs-v5m-vs-v5m2-mouth-crop.png`, `heads-3070-3098-3100-{mouth-close,mouth-close-q,eyes-close,eye-close-q,face-q,w-side}.png`, `v5m2-3100-heat.png`, `v5m2-3100-heat-close.png`, `pixel-diff-*.png`, `v5m2-3100-numbers.json`.

Still open (my own look): the chin front below the mouth still reads a little darker than v5 on clay (it faces slightly more downward after the raise); a very faint shading crescent remains just under the nose tip.

# Head v5e: eye surround cleaned (2026-10-11)

Nick approved the mouth (v5m2, assembled-3101). Next single part: the eye surround, from Nick's note on v5 ("leftover eye sockets that got moved outward ... almost on the outside of the eyeballs"): the cushion ring round each eye, the old socket rim and fold at the outer sides, the halo bands.

- Step H45 (`art/species-construction/eye_v5e_field.py`, spec `specs/head-eye-v5e.json`) after H44; recipe `recipe-furbase-v5e.json` (v5m2 plus H45). Vertices of the v5m2 skin move in place (same topology), only along each eye's axis and only within .075 of a globe.
- Per eye, a frame on the plane of the opening (PCA of the lid edge). The skin depth along the eye axis is sampled on a .003 grid and refit as a thin plate, held exactly within .006 of the opening (the lid edge: opening shape, dark outline and the heavier upper line unchanged) and beyond .05 to .075 from the globe, free in between, so the ring between lid and face becomes the smoothest surface that meets both. No vertex moves closer than .001 to a globe; nothing is wrapped over the eye and the opening is not widened.
- Output: head-3104, assembled-3105, packet `untracked/species-construction/akinza/loop/packets/assembled-3105`. Superseded: assembled-3103 (held by closeness to the globe, which kept the old hollow over the buried outer part of the globe).

Displacement against head-3100: outside the eye mask (skin within .08 of a globe vertex) 0.0 exactly; inside max .0056, median .0001; globes, irises, nose and mouth objects 0.0. Moved vertices lie within |x| .344 and z -.200 to .257; 4,108 of them are cheek vertices above the mouth corners that the mouth step had also moved (max .0041 there); the mouth line and muzzle are untouched. regionShift R02 .0014 figure heights, all else 0.0. Check passes, no new seams, no measured criterion changed, containment within allowance. The face measure's sclera width reads 256 px against 260 (the skin shading next to the lid edge changed; dark outline pixels in the close renders differ by about 30 of 88,000).

Images in `untracked/species-construction/akinza/surface/head-redesign/v5e/`: `clay-3101-vs-v5e-{face,head,threequarter,side}.png`, `clay-3101-vs-v5e-eye-crop-front.png`, `clay-3101-vs-v5e-eye-crop-threequarter.png`, `heads-3100-vs-3104-{eyes-close,eye-close-q,face-q,face,mouth-close,w-side,w-front}.png`, `v5e-3104-heat.png`, `v5e-3104-heat-close.png`, `v5e-3104-heat-eyes.png`, `pixel-diff-*.png`, `v5e-3104-numbers.json`.

Still open (my own look): a soft darker area remains just outside the outer corner of each eye, strongest beside the left eye in the face view and behind the right eye in the three-quarter view. Measured there the head's side is only about .04 beyond the globe's outer edge and turns sharply toward the ear root, so this is the temple and head side turning, not skin left from the old socket; widening the mask to .09 did not change it. Softening it would mean reshaping the temple, which is outside this part.

# Head v5t: outer eye corner dent (2026-10-11)

Nick approved v5e and asked for the dark indentation outside each outer eye corner to be filled, as a dent, not as the temple's natural shape.

- What it is (sections and depth profiles of head-3104): the eye globe's outer tip runs back toward the side of the head under the skin, and the skin follows it, so between the upper and lower lid ends there is a concave pocket beyond the outer corner, about .05 deep at |x| .30 (front depth -.143 at the corner's height against -.19 to -.22 above and below).
- Step H46 (`art/species-construction/outer_corner_v5t_field.py`, spec `specs/head-outer-corner-v5t.json`) after H45; recipe `recipe-furbase-v5t.json`. An outward-only curvature flow on the mesh moves each concave vertex out along its normal toward the average of its neighbours (rate .9, 3000 passes; it converges), inside an ellipsoid round each outer corner (centre |x| .31, y -.15, z .05, radii .055, .07, .10). Held within .004 of the exposed globe (the opening; the dark outline differs by about 10 of 88,000 pixels) and beyond |x| .345 (ear root and head side). The buried tip under the pocket is not held, so its skin can fill.
- Output: head-3106, assembled-3107, packet `untracked/species-construction/akinza/loop/packets/assembled-3107`.
- Tried and dropped: height-field closings and thin plates seen from the side or the front (a ridge, torn edges near the silhouette, or no visible change), a hold by distance to the whole globe (it held the pocket, which lies over the buried tip), outward pushes and swells on the lid end (made the front shadow darker).

Displacement against head-3104: outside the two ellipsoids 0.0 exactly; inside max .0072, median .0011; globes, irises, nose and mouth 0.0; skin only moves outward. The face outline half width (skin in front of y -.05, ears excluded) is unchanged at every height from z -.06 to .16 (max change 0.0). regionShift R02 .0020 figure heights, else 0.0; check passes, no new seams, no measured change; the face measure's band at 270 degrees reads .79 against 1.17 (the skin shading by the outer edge changed).

Images in `untracked/species-construction/akinza/surface/head-redesign/v5t/`: `clay-3105-vs-v5t-{face,head,threequarter,side}.png`, `clay-3105-vs-v5t-eye-crop-{front,threequarter,side}.png`, `heads-3104-vs-3106-*.png`, `v5t-3106-heat.png`, `v5t-3106-heat-corners.png`, `pixel-diff-*.png`, `v5t-3106-numbers.json`, `sections-3104.png`.

Still open (my own look): the pocket is shallower and lighter in the three-quarter view, and the front shadow beside the left eye is fainter, but neither is gone. The flow has converged: what is left is no longer concave. It is the lid's end sloping down into the deep outer corner, where the globe's own edge sits about .05 behind the lids, inside the held edge of the opening. Removing it needs either a free edge at the outer corner (skin moving within .004 of the visible globe, which changes how the outline ends there) or a shallower globe tip (an eye change). Both are outside this part's rules.

# Head v5t2: buried globe tip trimmed, outer corner raised (2026-10-11)

Nick wants the outer-corner shadow gone. v5t2 builds on v5t (assembled-3107).

- Step H47 (`art/species-construction/corner_v5t2_field.py`, spec `specs/head-corner-v5t2.json`) after H46; recipe `recipe-furbase-v5t2.json`. Two parts, both in place:
  - Globe trim: globe vertices covered by skin and at least .008 to .025 from any exposed globe vertex, on the outer side, move toward the globe's centre by up to .03 (201 and 220 vertices, max .027). The visible white, iris and outline do not move.
  - Skin: in the plane of each opening, the skin depth along the eye axis inside an ellipse .06 by .09 just outside the outer corner is raised by an upper closing (each spot raised to its neighbours' blur when below it, rise capped at .04, smoothed 60 passes), held within .004 of the opening. No skin vertex comes within .001 of the trimmed globe; nothing beyond |x| .35 moves.
- Output: head-3110, assembled-3111, packet `untracked/species-construction/akinza/loop/packets/assembled-3111`. Superseded: assembled-3109 (opening hold relaxed to .002 in the corner, which left a jagged dark streak where the skin edge crossed the globe's dark band).
- Tried and dropped: a thin plate in the opening's frame (no change, because the corner is a smooth saddle, not a dent); the opening hold relaxed to 0 to .006 inside the corner (jagged dark streaks at the skin and globe edge); less smoothing (small dark smudges).

Against v5e (head-3104, so H46 and H47 together): skin max move .012, median .0003, all within |x| .268 to .342, z -.073 to .119, y -.207 to -.104; 0 elsewhere; irises, nose and mouth 0; face outline half width unchanged at every height (max change 0.0). Eye-region pixels against v5e at the fur cameras (white L > 215, dark L < 70): face white 66,348 vs 66,343 (9 differ), dark 32,659 vs 32,620 (61 differ); three-quarter white 3 differ, dark 1; side white 0, dark 3. regionShift R02 .0031 figure heights, else 0.0; check passes, no new seams, no measured change.

Images in `untracked/species-construction/akinza/surface/head-redesign/v5t2/`: `clay-3105-vs-v5t2-eye-crop-{front,threequarter,side}.png`, `clay-3105-vs-v5t2-{face,head,threequarter,side}.png`, `heads-3104-vs-3110-*.png`, `v5t2-3110-heat.png`, `v5t2-3110-heat-corners.png`, `eye-region-diff-{face,threequarter,side}.png`, `v5t2-3110-numbers.json`.

Still open (my own look): the soft pocket beside each outer corner is lighter in the three-quarter view, and the broad smudge beside the left eye in the face view is mostly gone. But a short, sharper dark mark remains at the left eye's outer edge in the face view, and a narrow crescent of shade still sits right at the lid end in the close three-quarter view. Both lie inside the held .004 of the opening: they are the lid end itself and the globe's dark band where it ends. Freeing that band moves the visible outline end and gave jagged edges. Clearing them needs the outline band's outer end itself redrawn (the eye globe's dark-band material at the outer corner), which this part did not change.

# Head v5t3: outer corner lid end faired (2026-10-11)

Coordinator: redraw the end of the dark band at the outer corner so it tapers cleanly, with no sharp mark and no crescent.

- Close look first: the short dark mark at the left eye's outer edge (front) is not band material. It is skin shading, a small notch where v5t2's raised skin met the held lid edge. The band itself ends cleanly. So no band faces were reassigned.
- Step H48 (`art/species-construction/corner_v5t3_field.py`, spec `specs/head-corner-v5t3.json`) after H47; recipe `recipe-furbase-v5t3.json`. Taubin smoothing (60 passes) of the skin inside an ellipsoid at each outer corner (centre |x| .31, y -.145, z .035, radii .035, .05, .08), weighted 0 within .0015 of the exposed globe and full beyond .006.
- Output: head-3112, assembled-3113.
- Tried and dropped: a lid roll lifting the skin .002 to .004 along its normal just outside the opening, with and without pushing vertices back out of the globe. It lightened the crescent, but left speckles and jagged spots where the lifted skin crossed the dark band.

Against head-3110 (v5t2): outside the two ellipsoids 0.0 exactly; inside max .0009, median .00008; globes, irises, nose and mouth 0.0. Eye-region pixels against v5t2: face 1 white and 3 dark differ, three-quarter 1 and 0, side 0 and 0. Against v5e: face 10 and 60, three-quarter 4 and 1, side 0 and 3. regionShift R02 .0003 figure heights; check passes, no new seams, no measured change.

Images in `untracked/species-construction/akinza/surface/head-redesign/v5t3/`: `eye-crop-{front,threequarter,side}.png` (v5e, v5t2, v5t3), `clay-v5e-v5t2-v5t3-{face,head,threequarter,side}.png`, `v5t3-3112-heat.png`, `v5t3-3112-heat-corners.png`, `eye-region-diff-*.png` (against v5e), `v5t3-3112-numbers.json`, `mark-zoom.png`.

Still open (my own look): the mark at the left eye's outer edge is softer, but a faint dark sliver remains. The shaded crescent at the lid end in the three-quarter close view is unchanged. It is the skin turning in to meet the globe along the held .0015 of the opening. Every way I found to lift that edge out over the globe broke the band's clean edge. The next lever is the opening itself at the outer corner: a slightly shorter, rounder outer end of the visible opening, so the skin meets the globe where the globe faces forward instead of where it curves away. That changes the eye opening's shape, which this part was told to keep.

# Head v5eye2: face surface first, eyes fitted to it (2026-10-12)

Nick on v5e to v5t3 and the eyes-outer previews: no divot round the eye socket, and the globes may change ("you can adjust the eyeballs, I don't care"); every pass that trimmed the skull let globe show through. Every earlier pass held the globes and moved skin round them. This one inverts the order. Base: v5m2 (assembled-3101); v5e, v5t, v5t2, v5t3 and the previews are not in the chain.

- Step H49 (`art/species-construction/eye_v5eye2_field.py`, spec `specs/head-eye-v5eye2.json`) after H44; recipe `recipe-furbase-v5eye2.json` (v5m2 plus H49).
- Face surface: per eye, a spherical grid of directions from (0, 0, .03), radius of the first skin hit. Cells inside the old opening or within .06 (3D, to the old opening outline on the skin; .025 toward the nose) are free, the rest held; the radius is refit as a thin plate, so sockets, pockets, rims, cushion rings and the outer fold become the smooth continuation of forehead, bridge, cheek, temple and head side. Skin vertices in that region keep their own direction and take the filled radius, blended back to the original surface over the next .035 (.02 toward the nose). The radial parametrization of the v5m2 eye region had no folds, so no vertex is re-spread (a Tutte re-spread was tried and folded 13 faces). Same vertices and faces.
- Eyes: each globe is rebuilt as a closed lens on the new skin (20,482 vertices, was 4,322): rings in the front view at fractions of v5m2's own opening outline; the front sheet stands .010 proud along the face normal inside the outline, meets the skin exactly on it and runs under it to 1.14; a back sheet .010 behind the skin and a rim close it. The base inside the opening is eased toward a quadratic fit of the face and the front sheet is smoothed over its ring grid, so the white and iris are smooth domes. A ring lies on the band's inner edge, so the dark band keeps v5m2's front-view width per angle (heavier on top). Iris and pupil keep their front-view place and their depth offset from the globe front.
- Surface tool (`surface/build_surface.py`): catch lights now sit on the iris front under their own spot and are camera-visible only (no shadow, no light on the iris). The old rule put the light at the iris's front-most depth; on a tilted iris it floated and cast a gray crescent (v5m2's left eye already showed a ghost dot from it).
- Output: head-3122, assembled-3123, packet `untracked/species-construction/akinza/loop/packets/assembled-3123`. Development builds: assembled-3115 (first recipe build), 3117 (base easing), 3119 (cap smoothing with a .012 bulge, which put a sharp glint on the right iris's rim), 3121 (.010 check).

Measures (head-3122 against head-3100): 69,068 of 689,832 skin vertices move, max .0317, median .0019; every moved vertex lies within .0757 of a v5m2 globe vertex, and outside the stated mask (skin within .10 of a v5m2 globe vertex) the displacement is 0.0 exactly; nose, mouth line objects and every other object 0.0. The lowest moved skin is at z -.20 at |x| .16 and beyond (the cheek above the mouth corners, under .0023 below z -.15, 0 below -.17); the mouth line and muzzle are untouched (nearest moved vertex .053 from the nose). Front view: the opening, white, band and iris classes differ from v5m2 in about 1,100 of 325,000 cells, all along their edges. Filled surface curvature in the free region: the strongest concave curvature is 17 per head unit (radius .06, the soft saddle between the brow and the muzzle below the inner corner; v5m2 had 180 there). Assembly: check passes, regionShift R02 .0092 figure heights and 0.0 in every other region, no new seams, no measured criterion changed, face guards clear (the face measure still reads the two eyes differently, as on v5m2, where it failed on one eye).

Images in `untracked/species-construction/akinza/surface/head-redesign/eyes-v2/`: `clay-3101-vs-v5eye2-{face,head,threequarter,side,top,faceq,faceside}.png` (bare clay at the fur cameras; both surfaces built with the new catch light rule), `eye-crop-{front,threequarter,side}.png`, `heads-3100-vs-3122-*.png` (head clay, front, three-quarter both eyes, side both eyes, top, from below), `v5eye2-3122-heat.png` (displacement, front, three-quarter, side, top), `v5eye2-3122-numbers.json`. Work files and development renders in `eyes-v2/work/`; the superseded 3119 sheets in `eyes-v2/superseded-3119/`.

Still open (my own look): no globe shows outside any opening and I see no dent, crease, rim or pocket in any view. What remains: a soft, broad shading below the inner lower corner of each eye (the saddle above the muzzle, which the held muzzle and cheek keep); in the side views the eye reads as a tall leaf with a pointed lower end and the outer dark band edge is slightly uneven (smoothing the outline and band further changed little); a faint gleam at the top of the right iris, as on v5m2; the outer end of the band reads wide and dark in three-quarter, as on v5m2. The outer end of the opening was not pulled in: a 12 percent trim squared the eye's outer side in the front view, and from three-quarter the outer end now rounds off on the face without the old wrap.

# Head v5eye3: regular eyeballs in a cradling socket (2026-10-12)

Nick on v5eye2: "much better ... but it still seems to be causing the eyeball shape to warp into this odd organic shape that looks like Salvador Dali's melting clocks". Two restrictions caused it: the opening was v5m2's front-view outline traced angle by angle onto a curved face (a warped curve in 3D), and the lens was an offset of the face (it inherited the face's curvature). Both are gone. Base: v5eye2 (assembled-3123).

- Step H50 (`art/species-construction/eye_v5eye3_field.py`, spec `specs/head-eye-v5eye3.json`) after H49; recipe `recipe-furbase-v5eye3.json` (v5eye2 plus H50).
- Eyeball: one regular ellipsoid per eye, exact mirror. Semi-axes .1424 wide, .1833 tall, .080 deep (head units; the assembly halves them). Axis 21.5 degrees outward and 6 degrees down (the orientation whose planar rim stays closest to the v5eye2 face; the rim clears the face everywhere and stands at most .017 above it). Right-eye centre (.169, -.215, .035), .051 behind the rim plane.
- Opening: the plane cut of the ball at polar angle 50 degrees, a planar ellipse .109 by .140 (semi-axes) centred at (.188, -.263, .030). Its front projection is a regular ellipse, centre (+-.188, .0295), semi-axes .1015 by .1396, fitted by second moments to the v5eye2 opening and averaged over both eyes; no outline is traced. Cap height above the rim .029.
- Lids and socket: within .012 of the rim (measured on the ball) the skin is the ball plus t tanh(d / .006), t .004 at the top easing to .0015 at the bottom, so the upper lid hugs the ball as an even rim and the lower lid lies flatter into the cheek; inside the opening the skin dives under the ball. The socket (within .08 of the old opening, .06 below, .04 toward the nose) is a thin plate between the lids and the held face with the ball as an obstacle (61 cells held where the plate would have touched the ball), blended back over .04 (.02 toward the nose). Same skin vertices and faces; each vertex keeps its direction from the head centre.
- Band: the dark outline is a band on the ball just inside the lid edge, .0015 wide at the bottom to .013 at the top. Iris and pupil keep their front-view place and their depth above the globe front.
- Output: head-3140, assembled-3141, packet `untracked/species-construction/akinza/loop/packets/assembled-3141`. Development assemblies: 3125, 3127 (lid lines split before moving, lost in the assembly remesh), 3130, 3131, 3133, 3136, 3137, 3139.
- What limited the lid: the assembly voxel-remeshes the head at .0028 world units (.0056 head units). A lid roll sharper than that came out as a sawtooth edge and short dashes along the lower lid fold; a .006 roll and the thin lower lid are what the remesh keeps clean.

Measures (head-3140 against head-3122): 77,216 of 689,832 skin vertices move, max .0354; every moved vertex lies within .097 of a v5m2 globe vertex, and outside the stated mask (skin within .12 of a v5m2 globe vertex) the displacement is 0.0 exactly. Skin within .05 of the nose moves at most .00002 and the mouth area at most .0001 (the tail of the socket blend); the nose and mouth line objects do not move. Front view against v5eye2: 6,063 of 441,351 cells change class, the opening covers 89,003 cells (89,316), band 8,057 (7,754), iris 27,528 (27,586). Assembly: check passes, regionShift R02 .0327 figure heights (the eye globes changed shape) and 0.0 in every other region, no new seams, no measured criterion changed, face guards clear.

Images in `untracked/species-construction/akinza/surface/head-redesign/eyes-v3/`: `clay-3123-vs-v5eye3-{face,head,threequarter,side,top,faceq,faceside}.png` (bare clay at the fur cameras), `eye-crop-{front,threequarter,side,top,below}.png`, `heads-3122-vs-3140-*.png` (head clay), `v5eye3-3140-heat.png`, `v5eye3-3140-numbers.json`.

Still open (my own look): the eye is a regular oval in every view; no globe shows outside the opening and I see no pocket, crease, wedge or melt. Remaining: a sharp elongated highlight on the upper right of the character's left iris in the front views (the domed iris catches the key lamp; the other eye does not); a soft shading ring round each eye where the lid rolls into the socket, slightly darker under the outer lower lid; a few very faint dashes along the lower lid of the character's right eye left by the assembly remesh; the eye stands about .029 proud of its rim, so in profile the white dome is visible at the face line.
