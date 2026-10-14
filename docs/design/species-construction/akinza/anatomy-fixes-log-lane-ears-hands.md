# Akinza anatomy fixes log, lane: ear roots and hands (2026-10-13)

Findings 10 (ear roots) and 8 (hands) of `anatomy-review-2026-10-13.md`, built in parallel with the neck, shoulders, lower legs and rear lanes (Nick, 2026-10-13: "Yes, fix all ten of them."). Same method as `anatomy-fixes-log.md`: each fix is its own region-masked post step with its own spec and recipe. This lane's build numbers are assembled-3230 to assembled-3239. Check images (before left, after right, same camera) are in `untracked/species-construction/akinza/surface/anatomy-fixes/`; working views are in `anatomy-fixes/work/10-earroot/` and `work/08-hands/`.

Base: assembled-3199 (`recipe-neck-v3.json`), as briefed. The neck lane has since committed neck v4 (assembled-3201, `recipe-neck-v4.json`). This lane's masks do not overlap the neck lane's part box (z .32 to .555): the ear-root mask starts at z .5725 and the hand mask is below the wrist. So each step can be re-cut onto the newer base with `recipe.py rebase` without changing what it does.

Holds for this lane:

| Hold | Source | Why |
|---|---|---|
| Ear shape, size, angle, inner ear | Nick approved the ears (`approved-looks.json`) | approved part |
| Head, face, eyes, nose, mouth | Nick approved each | approved parts |
| Wrist and arm above the wrist | inferred: later items (shoulders, elbows) and a parallel lane | avoid collisions |
| Bare anatomy only, no fur volume | Nick, 2026-10-13, REFINEMENT rule 7 | standing rule |

## 10. Ear roots

- **Base:** assembled-3199 (`recipe-neck-v3.json`). **Output:** assembled-3230, recipe `recipe-earroot-v1.json` (chain ... P-neck3, P-earroot1; step `art/species-construction/earroot_v1_post.py` with `earroot_v1_field.py`, spec `specs/earroot-v1.json`).
- **Cause, measured:** in horizontal sections the skull's side (normal about 40 degrees off the back axis, toward +x) and the ear's rear face (about -30 degrees) are both close to flat, and they meet in a concave valley at |x| about .19 to .21, y about .025, running from z .60 up over the top of the root to z .84. The whole turn of about 60 to 70 degrees happens within about .03, and most of it within .01 at x about .205 (20 to 26 degrees per .01, a fillet radius of about .02). From behind, that valley prints a vertical tone edge: the ear's back reads as a flat plate set onto the skull.
- **What did not work (development a to d):** a fill-only masked blur of the signed distance moved at most .002. A wider blur moved less, because the thin ear blade beside the valley (about .03 thick) lifts the blurred field there and cancels the fill.
- **What changed:** a morphological closing of radius .085 of the skin's signed distance, fill only. It rounds the valley into a wide fillet and cannot erode anything: the thin ear blade, its rim, the convex skull and the broad inner-ear bowl are unchanged by a closing. The dilated surface is sampled as a projected point cloud. A whole-cell search left .0025 terraces that printed as horizontal ripple bands (variant h). The fill is smoothed lightly (sigma .005), and then a light fill-only blur (sigma .007) takes out the small kink the smoothing left at the old crease line. A rear-facing gate (y component of the unit normal above .05 to .35) keeps the fill on backward-facing surface only. Fill depth up to .0126 at the old valley.
- **Before / after:** the largest normal turn per .01 across the root, sampled every .02 of height from z .62 to .82, went from 21 to 39 degrees (one sample 107 at the sharpest point) to 12 to 19 degrees (27 at z .62, the bottom of the root). At z .72 the turn now runs 19, 13, 8, -1, -9, -14, -21 degrees at x .17 to .23, an even 5 to 9 degrees per .01, where before it ran 36, 26, 15, -5, -31, -34.
- **Mask bounding box (field weight above 0):** |x| about .09 to .2825 on each side (one ellipsoid per side centered at (±.19, .03, .73), semi-axes .10 by .065 by .16, times the rear-facing gate), y -.0125 to .0925, z .5725 to .8875. The vertices that moved lie in |x| up to .2817, y -.0146 to .079, z .5879 to .8649. The mask sits on the top and back of the skull at the ear roots. The jaw (front, y below -.05), throat and nape (z below .555) are outside it.
- **Displacement outside the region:** 0.0 exactly. 17,545 of 547,455 skin vertices move (8,772 on +x, 8,773 on -x), max .0129, median .00085, 95th percentile .0088. Outside the mask: 0 vertices. Every other object (eyes, irises, nose, mouth line, all 16 claws) 0.0 (object diff 3199 against 3230). Front-facing surface (the inner ear and the ear's front face): 24 vertices moved, at most .0000004. Ear blade beyond the root (|x| over .26): 1,279 vertices by at most .0011 (the tail of the fillet on the ear's back). Front-view silhouette (largest |x| at z .62, .70, .78 and .84) unchanged to .0001. Check passes: one component, no non-manifold edges, no folded faces, no faces turned over 72 degrees.
- **Images:** `10-earroot-back-check.png` (back, shadows off) and `10-earroot-rear-three-quarter-check.png` (rear three-quarter from the +x side, shadows off). Working views are in `work/10-earroot/` (`cmp-*.png` variant pairs, `sec-*.png` sections, `prof.py` normal profiles).
- **My own look (back, both rear three-quarters, top, side, front):** from behind the hard edge is gone. The skull now rounds into the back of each ear over a band about three times wider, and the ear's back no longer reads as a separate plate. A faint soft vertical tone line remains where the ear's flat back begins (most visible in the +x rear three-quarter close-up). The ears' outline, rim and inner ear look the same from the front and side.
- **Wall time:** about 2 hours 20 minutes (18:25 to 20:46), including a session restart. Variants a to n are in `work/10-earroot/specs/`. Variant n (radius .12) folded 588 faces and was rejected. Each closing run takes about 10 minutes of Blender.
- **Blocked by:** partly by the ear-shape hold (Nick approved the ears). The faint line left is where the ear's back is a flat plane: the curvature jumps from the new fillet to zero on the plate. Removing the last of it would need a slight convex roll on the back of the ear near its root, the way a real ear's cartilage curves into its base. That changes the ear's back surface a little, though not its outline, rim, angle or inner ear. Not done; it is Nick's call whether that counts as ear shape.

## 8. Hands

- **Base:** assembled-3230 (`recipe-earroot-v1.json`). **Output:** assembled-3231, recipe `recipe-hands-v1.json` (chain ... P-neck3, P-earroot1, P-hands1; step `art/species-construction/hands_v1_post.py` with `hands_v1_field.py`, spec `specs/hands-v1.json`). The step runs one grid per paw (step .0015) and mirrors every mass to the -x paw.
- **Where the claws are placed:** the fore claws are separate objects, `body_Curved fore claw ±1 1` to `4`, at the identity transform. They were placed on a fixed arc by the body build and carried rigidly by body B (`body_b_v1_post.py`). This step moves them by a rigid translation per claw (`claws` in the spec, mirrored in x for the -1 claws).
- **Cause, measured:** the paw hangs with the palm toward the body (-x on the +x paw), the back of the hand outward and the digit row along y. The old digits were lumps at the very end: along the row the bottom of the paw ran -.185 to -.206 with no regular dips, and the back of the hand at z -.19 had irregular bumps. The claws sat off the digits: bases at y -.1373, -.1213, -.1008, -.0796 (uneven spacing, .016 to .021), and claw 1's base was .014 up the side of the paw (z -.1836) where the others are at the bottom. The palm carried four ridges running up it, and a crease band crossed both faces at z about -.14 to -.165.
- **What changed:** a masked blur (sigma .008) takes out the old lumps, palm ridges and crease band first, so none of them survives under the new forms. The paw end is pulled in by .003 with a taper over a full ellipsoid; an erode with a narrow taper printed its own band (variant d). Four digits are built as elliptic tapered capsules (knuckle z -.172 to the tip; tips at z -.197, -.2035, -.2035, -.196, so the middle two are longest; radius .015, narrower across the row than front to back), each on the paw's own measured center line at its y, and joined by a smooth minimum (k .006). Where two neighbors meet, a shallow valley is left between them. Then come one palm pad (a dome .0048 high, footprint .028 by .017, set just above the toe pads), a toe pad under each digit tip (.0028 high) and a small nail-bed dome on the back of each tip (.0016 high). Each claw is moved so its base sits .003 inside its digit tip, under the nail bed. The wrist and everything above it do not move.
- **Before / after:** bottom of the paw along the row (z in thousandths, y -.14 to -.06): before -185 -187 -188 -194 -200 -202 -202 -202 -200 -204 -206 -205 -203 -197 -196 -197 -196 -195 -186 -175 (no regular pattern). After it runs in four lobes with valleys between them: tips -.197, -.204, -.204, -.197 and valleys -.195, -.198, -.194 (2 to 6 thousandths deep, the shallow separations asked for). Claw bases are now at y -.1305, -.1115, -.0925, -.0735, one on each digit's center line (spacing .019). Their z is -.1933, -.1998, -.1998, -.1923, each at its digit tip, with base-to-skin distance .003. Claw tips z -.2146, -.2210, -.2210, -.2134. Paw extent is unchanged within .002 (y -.143 to -.048, x .288 to .369, lowest point -.2041 against -.2056).
- **Box bounding box (field weight above 0), per paw:** |x| .2625 to .3945, y -.17 to -.0305, z -.24 to -.111 (full below z -.125, zero above -.11). The vertices that moved lie in |x| .2943 to .3693, y -.145 to -.0542, z -.2056 to -.1161.
- **Displacement outside the region:** 0.0 exactly. 7,998 of 547,455 skin vertices move (step log; 7,900 measurable in the saved file, the rest below float32 precision), max .0092, median .0014, 3,955 on the +x paw and 3,945 on the -x paw in the saved file. Above z -.1156: 0 vertices; the wrist (z -.09) and the arm above it: 0. Every other object 0.0 except the eight fore claws, which moved rigidly by .0061 to .0129 (object diff 3230 against 3231). The ear-root step's result is unchanged. Check passes: one component, no non-manifold edges, untangle found no folded faces. 280 faces turn more than 72 degrees against their old orientation; all are at the digit tips, where the old lumps faced other ways.
- **Images:** `08-hand-front-check.png` (from the front), `08-hand-below-check.png` (from straight below), `08-hand-side-check.png` (from the +x side, the back of the hand), plus `08-hand-palm-check.png` (palm and toe pads, oblique from below on the body side, near-clipped so the trunk does not hide it) and `08-hand-wrist-check.png` (wrist and forearm, unchanged). All shadows off, +x paw, before 3230 left, after 3231 right.
- **My own look (front, back of hand, palm, below, three-quarter):** from the back the paw now reads as four toes with shallow valleys between them and a claw at the tip of each, in place of a mitten with a row of lumps. From the palm side it shows one palm pad and four toe pads, and the ridges and crevices are gone. From below, the four toe tips each carry a claw. Two things I can still see. Seen from below, the palm pad's lower edge reads as a curved fold; it is the crease between the palm pad and the toe pads, which a real paw has, but it reads a little like a lip. Where each claw enters the skin there is a straight cut line, because the claws are separate objects (as before this step).
- **Wall time:** about 30 minutes (20:50 to 21:20). Variants a to g are in `work/08-hands/specs/` (generator `gen2.py`). Variant a (grooves only) lost the digits. Variant c's digit capsules pushed out of the back of the hand. Variant d left a band at the erode's edge.
- **Blocked by:** nothing for the finding as written. The claw cut line would need the claws merged into the skin or given a sheath, which is a separate claw-representation decision, not this step.

## Second pass (coordinator review, 2026-10-13)

The coordinator judged neither v1 ready for Nick. Ear roots: the vertical line where the ear's flat back begins was still clearly visible on both ears from behind. Hands: from the side the claws stuck out of the gaps beside the digits with their cut tops showing, from the front the claws bunched and the digits were small lumps, and the palm pad had a lip edge. v2 of each replaces v1 in the chain: P-neck3, P-earroot2, P-hands2 (`recipe-hands-v2.json`, built on assembled-3199). v1 (assembled-3230 and 3231, `recipe-earroot-v1.json`, `recipe-hands-v1.json`) is superseded. Its builds are archived (see Cleanup); its recipes stay in the repository as the record. The check images named in sections 10 and 8 were overwritten by this pass's versions (3199 left, v2 right).

Holds added or changed this pass:

| Hold | Source | Why |
|---|---|---|
| Ear front-view outline unchanged to .0005; rim, angle and inner ear unchanged | coordinator, 2026-10-13 | protects the approved ear look |
| Convex roll on the back of the ear near its root allowed | coordinator, 2026-10-13, under REFINEMENT rule 1 (Nick's approval of the ears protects their look, not their implementation) | lifts v1's "Blocked by" |
| Claw joins sheathed: skin wraps over the claw base in a small nail-bed fold, so no cut line or claw top is visible | the coordinator's call, 2026-10-13, overridable by Nick | design decision, not Nick's |

## 10b. Ear roots v2

- **Base:** assembled-3199 (`recipe-neck-v3.json`). **Output:** assembled-3232, recipe `recipe-earroot-v2.json` (step P-earroot2, `art/species-construction/earroot_v2_post.py`; stage 1 `earroot_v1_field.py`, stage 2 `earroot_v2_fair.py`; spec `specs/earroot-v2.json`), in place of P-earroot1.
- **Cause of the line v1 left, measured:** two things.
  - v1 blurred its fill (fillSigma .005). The fill (closed surface minus skin) carries the old crease's kink with the opposite sign, so a blurred fill added back to the creased skin leaves part of the crease. At z .66 and .78 a turn of 13 to 14 degrees within .01 remained at x about .205.
  - The closing's circular fillet meets flat surfaces on both sides, so the curvature steps at the fillet's edges. One is the ear's flat back. The other is a flat band on the skull's side that ends at x about .175 in 3199 (16 degrees within .0075). That second step is the line a grazing rear three-quarter view shows on the far ear.
- **What changed:**
  - Stage 1 is v1's closing (radius .085, rear-facing gate, mask as v1) without the fill blur.
  - Stage 2 is the convex roll: a weighted umbrella smoothing of backward-facing vertices (normal y component above .3 to .6), 300 passes at step .5. It covers one ellipsoid per side centered at (±.195, .04, .73) with semi-axes .085 by .06 by .15, from the skull's flat band across the fillet to the ear's back. A plane is a fixed point of it, so the ear's back away from the root, the rim and the front face (never selected) stay put. Only the curvature steps spread, so the back of the ear rolls into the skull.
- **Before / after:**
  - At z .72, x .17 to .23, the normal turn across the root ran 36, 26, 15, -5, -31, -34 degrees in 3199 and 19, 13, 8, -1, -9, -14, -21 in v1. It is now 20, 12, 5, -1, -8, -14, -21: 5 to 8 degrees per .01, with no jump.
  - On the -x root at z .74, x .15 to .21 every .0075: 3199 ran 35, 37, 36, 31, 24, 11, 3, -21; v2 runs 31, 24, 16, 11, 7, 3, -2, -6.
- **Front-view outline (verified in the step against 3199, outlineTol .0005):** top contour per |x| at most .00041, side contour per z at most .00001, bottom contour .000003.
- **Mask bounding boxes:**
  - Stage 1: |x| about .09 to .2825, y -.0125 to .0925, z .5725 to .8875.
  - Stage 2: 14,527 vertices in |x| up to .2745, y -.0032 to .0742, z .5978 to .8564.
  - Both sit on the top and back of the skull at the ear roots, clear of the jaw, throat and nape (z below .555).
- **Displacement outside the region:** 0.0 exactly. 17,551 of 547,455 skin vertices move, max .0140. Every other object is 0.0 (object diff 3199 against 3232). Check passes: one component, no non-manifold edges, no folded faces, no faces turned over 72 degrees.
- **Images (3199 left, v2 right, shadows off):**
  - `10-earroot-back-check.png` (from behind).
  - `10-earroot-rear-three-quarter-check.png` (from the +x side).
  - `10-earroot-rear-three-quarter-left-check.png` (from the -x side).
  - `10-earroot-far-ear-root-check.png` (the far ear's root at a grazing angle, the view the review cited).
- **My own look (back, both rear three-quarters, top, grazing far-ear view):** from behind and from both rear three-quarters the skull now rounds into the back of each ear with no line; the root shades as one broad soft hollow. At the grazing far-ear angle a soft fold remains where the root turns. It is much fainter than in 3199 and has no sharp edge.
- **Wall time:** about 35 minutes of this pass (variants o to r, plus the 9-minute build).
- **Blocked by:** nothing.

## 8b. Hands v2

- **Base:** assembled-3232 (`recipe-earroot-v2.json`). **Output:** assembled-3233, recipe `recipe-hands-v2.json` (step P-hands2, `art/species-construction/hands_v2_post.py` with `hands_v2_field.py`, spec `specs/hands-v2.json`), in place of P-hands1.
- **What changed:**
  - **Toes:** each is a bean, a tapered capsule fuller at the tip (radius .017) than at the knuckle (.013), on its paw's own center line, narrower across the row than front to back (squash 1.95). They are splayed -9, -3, 3 and 9 degrees so the four fan out a little, and joined toe to toe and to the paw by smooth minimums, leaving clear shallow valleys.
  - **Claws:** each fore claw is rotated about its own base so it points along its toe, curled 15 degrees toward the palm (down and toward the palm, like a cat's at rest with the arm hanging). It is then seated with its base .0075 inside the tip of its own toe, centered on it, 30 degrees toward the back of the toe.
  - **Sheath:** a nail-bed hood of skin (a flattened ellipsoid joined by a smooth minimum) sits over each claw's root on the back of the toe tip. The flat claw top is inside the toe, and the skin folds over the claw's base.
  - **Pads:** one palm pad and four toe pads are flattened ellipsoids joined by smooth minimums (palm pad blend radius .008), so each is a dome that rolls into the skin with no edge.
  - **What did not work:** joining a claw-shaped collar to the skin (v2a to v2h) folded the skin mesh in the valleys next to each claw. The paw's vertex spacing is about .002, so the collar was only about four edges across. With it off there are no folds at all (v2i), and the hood replaces it.
  - **Vertex mover:** this step's mover (`move_vertices_from`) adds three things. A pre-smoothing of the starting positions with a move along the smoothed normals (gradient projection had focused vertices into the valleys). A final local unfold. And a short Taubin smoothing (60 passes) that takes the fine waviness off the small toe forms.
- **Before / after:**
  - **Bottom of the paw along the row** (z in thousandths, y -.14 to -.06 every .0025):
    - before -185 -187 -187 -188 -194 -197 -200 -202 -202 -202 -202 -202 -200 -202 -204 -205 -206 -206 -205 -204 -203 -200 -197 -196 -197 -197 -196 -196 -195 -192 -186 -180 -175
    - after -195 -195 -196 -194 -194 -193 -191 -192 -200 -202 -203 -204 -203 -199 -197 -194 -195 -201 -203 -203 -204 -203 -201 -196 -191 -192 -195 -196 -196 -196 -195 -192 -170
    - Four toes with tips at -.196, -.204, -.204, -.196 and valleys 5, 10 and 5 thousandths deep (v1: 2 to 6).
  - **Claw bases:** before at y -.1373, -.1213, -.1008, -.0796 (off the digits, claw 1 up the side). Now at y -.1361, -.1144, -.0906, -.0685, each within .0015 of its toe tip's center (toe tip centers y -.1337, -.1129, -.0911, -.0705). Base z -.1877, -.1943, -.1946, -.1872.
  - **Claw tops:** each flat top is .0037 to .0067 inside the skin (v1: about .003, with the rim showing).
  - **Claw tips:** z -.2097, -.2164, -.2162, -.2083, spread over y -.1387 to -.0655.
  - **Paw extent:** within .002 of before (lowest point -.2037 against -.2056).
- **Box bounding box, per paw:** |x| .2625 to .3945, y -.17 to -.0305, z -.245 to -.1115. The vertices that moved lie in |x| up to .3693, y -.145 to -.0542, z -.2056 to -.1147.
- **Displacement outside the region:** 0.0 exactly. 8,001 skin vertices move (step log; 3,962 on +x and 3,949 on -x in the saved file), max .0116. Above z -.1147: 0, so the wrist (z -.09) and the arm are untouched. Every other object is 0.0 except the eight fore claws, which moved rigidly by .010 to .016 (object diff 3232 against 3233). Check passes: one component, no non-manifold edges, no folded faces. 657 faces turn more than 72 degrees against their old orientation, all on the toes, where the old lumps faced other ways.
- **Images (3199 left, v2 right, +x paw, shadows off):**
  - `08-hand-front-check.png`
  - `08-hand-below-check.png`
  - `08-hand-side-check.png` (from +x, the back of the hand)
  - `08-hand-back-check.png` (from behind, near-clipped past the tail)
  - `08-hand-palm-check.png` (palm and pads, near-clipped past the trunk)
  - `08-hand-wrist-check.png`
- **My own look (side, front, back, below, palm, three-quarter):**
  - From the side, front and back: four distinct bean-shaped toes with clear shallow valleys.
  - Claws: each comes out of the tip of its own toe, centered, angled down along the toe and curling toward the palm, under a small hood of skin. No claw top or cut is visible. From the front the claws still line up behind one another, as four claws in a row along the line of sight must, but they now fan slightly.
  - Palm: one smooth palm dome and four toe pads, with no lip.
  - What I can still see: up close from below, a slight unevenness on the surface of the two back toes; and seen from behind, a small soft step behind the back toe. Both are much smaller than the v1 defects.
- **Wall time:** about 50 minutes of this pass (variants v2a to v2l).
- **Blocked by:** nothing.

## Cleanup

Superseded by v2 and archived to `C:\Users\njord\.claude\scratch-archive\Xalians\2026-10-13\akinza-builds\` (purged after 30 days): assembled-3230 and assembled-3231, with their `assembled-3230*` and `assembled-3231*` log files. Scratch dumps in the work folders are deleted.

## Third pass on the hands (coordinator review of hands v2, 2026-10-13)

Ear roots v2 were accepted and posted to Nick. Hands v2 were not: claw 1 still showed its flat top from the side, the front toe's nail-bed hood read as a big lump with a lip, the toes looked like rectangular sausages with lumpy edges from below, and the palm pad read as a slab. This was the second pass on the same defects, so under REFINEMENT rule 3 the cause came first: the paw's vertex spacing (median edge .00246) was too coarse for toes, hoods and pad edges. The coordinator asked for a local refinement to about .0007, then hands v3 on the finer mesh.

**Dependency check before refining (as asked):** nothing downstream depends on the skin's vertex count, vertex order, topology or UVs.
- The skin has no UVs. The surface plan uses procedural shaders on object and attribute coordinates (`surface-plan.md:15`).
- `build_surface.py` rebuilds every fur attribute from positions, normals and edges on each run. Its vertex-count assertion (`build_surface.py:992,1034`) compares the mesh with itself within one run.
- `rig_core` and `loop_tools.py posed` compute weights fresh per run. `rig_akinza.py:82` checks counts within the same run.
- `recipe.py` `expect` blocks compare counts, but no step of these recipes has one. `contain` and `regionShift` match by nearest vertex.
- The post chain already changes the vertex count mid-chain: P-tails7 remeshes the tails.
- The two invariants that matter: the skin stays one closed component, and every face keeps its material index (the fur stage reads the pale area from it). Both hold.
- Two things are worth re-running later, not broken: the surface build's edge-hop smoothing passes and `rig_core.smooth_weights` (24 nearest neighbors) cover a shorter distance on a denser paw.

## 8c. Fore paws refine v1 and hands v3

- **Chain:** P-neck3, P-earroot2, P-pawrefine1, P-hands3 (`recipe-pawrefine-v1.json` for the chain up to P-pawrefine1, `recipe-hands-v3.json` for the whole chain, built on assembled-3199).
- **Refine (assembled-3234, step P-pawrefine1, `art/species-construction/paws_refine_v1_post.py`, spec `specs/paws-refine-v1.json`):**
  - Every skin edge inside each fore paw is cut once at its midpoint: one level below z -.115 (the wrist is at z -.09), and a second below z -.15 (toes and pads). Regions are |x| above .265 (.27), y -.17 to -.03, z above -.26 (which keeps the hind feet out).
  - Cuts are flat (smooth 0) and conforming. bmesh's fill patterns split the faces at each region edge, so there are no T-junctions. Only the n-gons those patterns leave (674) are triangulated, and the skin's own quads stay. smooth 1 was tried and amplified the old lumps' uneven normals into bumps.
  - 547,455 vertices become 634,526 (87,071 new, all inside the paws: |x| .2943 to .3686, y -.1434 to -.0547, z -.2036 to -.1153). Faces go from 548,423 to 636,563.
  - Median edge in the toe zone goes from .00246 to .00064 (90th percentile .00091). Old vertices moved 0.0, materials stay [0, 1], and the skin is one component with 0 non-manifold edges.
  - The wrist render shows no seam above the toe zone.
- **Hands v3 (assembled-3235, step P-hands3, `art/species-construction/hands_v3_post.py` with `hands_v3_field.py`, spec `specs/hands-v3.json`):** hands v2's method on the finer mesh, with these changes.
  - **Toes:** rounder beans (tip radius .0145, knuckle .011, squash 1.3, knuckle z -.172) instead of v2's long narrow capsules, so from below each toe is nearly round.
  - **Claws:** sunk .009 (v2 .0075) under a smaller nail-bed hood (.001 proud, footprint .005 by .0055, smaller than the toe tip).
  - **Palm pad:** an ellipsoid .016 deep standing .004 proud, a true dome.
  - **Toe pads:** flatter (.0016 proud) and more blended.
  - **Field grid:** step .001.
  - **Mover:** vertices land on the new surface itself inside the part box (`levelZeroInside`), so the refinement's flat chords do not carry over. Pre-smoothing (400 passes), relax (300) and Taubin (150) are scaled to the finer mesh: 60 pre-smoothing passes left valley pleats, because they spread the start positions over only about .005 where the old lumps are about .01 across.
- **Before / after (3199 against 3235):**
  - **Bottom of the paw along the row** (z in thousandths, y -.14 to -.06 every .0025):
    - before -185 -186 -187 -188 -194 -197 -200 -201 -201 -201 -201 -201 -200 -202 -204 -205 -206 -205 -204 -204 -202 -200 -196 -196 -197 -197 -196 -196 -193 -190 -186 -180 -172
    - after -194 -196 -197 -197 -197 -196 -194 -197 -200 -202 -203 -204 -203 -203 -201 -197 -200 -202 -203 -204 -204 -203 -201 -199 -193 -195 -196 -196 -196 -195 -194 -191 -182
    - Four toes with tips at -.197, -.204, -.204, -.196; the valleys between them sit 3 to 11 thousandths above the neighboring toe tips.
  - **Claw bases:** y -.1343, -.1141, -.0925, -.0709, centered on their toes. Base z -.1864 to -.1934.
  - **Claw tops:** each claw's top rim is .0037 to .0063 inside the skin (signed distance to the nearest skin vertex along its normal).
  - **Claw tips:** z -.2074 to -.2154.
  - **Paw extent:** within .002 (lowest point -.2036 against -.2056).
- **Box bounding box, per paw:** |x| .263 to .395, y -.17 to -.031, z -.245 to -.111. The vertices that moved lie in |x| up to .3693, y -.145 to -.0542, z -.2056 to -.116.
- **Displacement outside the region:**
  - Skin: 93,434 vertices move in the hands step, max .0108, and 0 outside the box. Against 3199, no old vertex above z -.116 moved anywhere below the head (the head changes are the ear-root step), and the wrist band (z -.115 to -.09) moved 0.0.
  - Objects: every other object is 0.0 except the eight fore claws, which moved rigidly by .0096 to .0142 (object diff 3232 against 3235).
  - Mesh checks: one component, 0 non-manifold edges, no folded faces after the untangle and final unfold. 6,005 faces turn more than 72 degrees, all on the reshaped toes.
- **Images (3199 left, v3 right, +x paw, shadows off; the 08 files are overwritten):** `08-hand-front-check.png`, `08-hand-below-check.png`, `08-hand-side-check.png`, `08-hand-back-check.png`, `08-hand-palm-check.png`, `08-hand-wrist-check.png`.
- **My own look (side, front, back, below, palm, three-quarter):**
  - From the side: four round toe beans with clear valleys, and each claw comes out of the bottom of its own toe tip. No claw top shows from any angle I checked.
  - From the palm: a domed palm pad above four round toes with their pads.
  - From the front and back: the end toe reads as a rounded bean with its claw below.
  - Surfaces are even.
  - What I can still see:
    - From below, each toe has a faint raised outline where its pad meets the side of the toe.
    - A couple of very faint pleats remain in the valley bottoms between the back toes.
    - With the claws buried deeper, less of each claw shows (claw tips about .011 below the toe bottoms, against about .015 in 3199).
- **Wall time:** about 45 minutes (22:30 to 23:16): the dependency check, the refinement (three dry runs), variants v3a to v3d, and the two builds.
- **Blocked by:** nothing. If Nick wants longer visible claws, the claw objects themselves would have to be lengthened (or the sink reduced, at the risk of the top showing again).

## Cleanup (third pass)

Superseded by hands v3 and archived to `C:\Users\njord\.claude\scratch-archive\Xalians\2026-10-13\akinza-builds\`: assembled-3233 and its `assembled-3233*` log files. assembled-3232 (ear roots v2, posted to Nick) stays as the base of 3234. Scratch dumps and the refinement's dry-run blend are deleted.
