# Creature Studio: Hypnopet sculpt stage and deformation audit (experiment X33)

Nick, 2026-10-23, before an overnight run: "Familiarize with some of the other efforts going on in the other claude sessions using their own animation pipelines systems and make updates to your pipeline to match the others and run your model through a full round of changes based on what the new adjustments to the pipeline recommend. ... I'd like to wake up in the morning and see you have completed the updates to the pipeline and have gotten the model to a spot that you're proud of and that there's no other adjustments that you're aware of that need work."

The pipeline changes are in [creature-studio-alignment.md](creature-studio-alignment.md). This record is the full round on Hypnopet that followed: the sculpt stage run as a repair list on the reconstruction (track R, body-recon-5), judged on the view board in three looks, every round reviewed by an independent blind critic (Opus) against the sheet, and a deformation audit of a test rig on the same body with its own independent critic. Sculpt critics and deformation critics are numbered separately. Evidence images: [creature-studio-hypnopet-sculpt/](creature-studio-hypnopet-sculpt/). Builds: `C:\dev\art-data\studio\blockout\hypnopet\sculpt-N\`; audits: `C:\dev\art-data\studio\readiness\hypnopet\x33\audit-N\`.

## Method

- **Repairs, not re-sculpting.** `art/studio/blockout/hypnopet/sculpt.py` applies named repairs to the reconstruction's spec, each with its anatomy spec and the critic item it answers in its docstring. Rigid precise parts (horn, eyes, lids, mouth parts, nose, toes, tail ball) are authored parts; regions the reconstruction got wrong are fixed by field edits on the grid (`art/studio/recon/`: bake, merge, mask, warp, soften), recorded step by step in `prep_grids.sh`.
- **Measured against the sheet.** Positions and sizes come from the bare sheet views (flesh-front, flesh-side, flesh-back, ground-to-horn-tip scale) and, from round 3 on, metric overlays of the clay render on the sheet at the same scale (front, side anchored on the eye center, back).
- **Review gate.** Each round: the view board (whole figure, head and horn close-ups, feet close-ups, in clay, curvature and grazing light), then a blind critic who sees only the board, the raw renders and the sheet, and returns a point check of the previous list plus new defects with pixel coordinates. Pixel locations are mapped back to the model with a pick tool (a ray through the board camera).
- **Deformation audit.** `art/studio/readiness/rig_test.py --audit`: five poses (stride, crouch, look, extreme, mouth-closed) under eight cameras in clay, curvature and flags (crushed, stretched, self-intersecting), plausibility limits from the skeleton file, the floor check, and an independent critic of its own.

## Sculpt rounds

| Round | Builds | Critic | Main changes |
|---|---|---|---|
| 1 | sculpt-1 to 16 | critic 1 (14 items) | spiral horn; one skin field (head morphed into the body grid); face creases softened; traced D mouth; nose button; eyes set back; torso 3.3 cm longer, ears raked back, hind foot longer, forepaw shorter; blemishes softened; round tail ball |
| 2 | sculpt-17 to 29 | critic 2 (14 items, 10 new defects) | eyes rebuilt (3.9 cm balls, gaze 28 degrees, lid rims); mouth with a side opening, chin, tongue inside, rounded corners; bridge; narrower nose; horn tightening to the tip; domed toes with splits on every foot; ear rake bend spread from 7 to 12 cm; tail stem flattened |
| 3 | sculpt-30 to 36 | critic 3 (14 items, 10 new defects) | ears swung 6 degrees in and hind feet moved 15 percent in (metric overlays); jowls tapered to the heart-shaped lower face (a soft ellipsoid; a box left a ledge across the cheek); forepaw shortened; muzzle pads; lower lip and chin set back; bridge ends above the nose (a stop behind the button); eyes 3.75 cm, closer, gaze 20 degrees; lids thick over the top; horn forward, leaning 15 degrees, fuller; tail lower; ear dimple and wrists softened |
| 4 | sculpt-37 to 40 | critic 4 (14 items, 12 new defects) | ears raked 15 and swung in 3 (6 hung them against the body); hind feet narrowed about their own line; deeper round U to the mouth with the pads dipping below the corners; cheeks; wider nose with nostril wings; eyes 4 mm closer; taller toes; chest arch carve; horn six turns tightening to the tip (two twisted strands read as a blade and were undone) |
| 5 | sculpt-41 to 53 | critics 5, 6 and 7 (14 items each) | the mouth outline drawn as a smooth spline (no spike corners) and 4 mm narrower at the corners; one tongue lobe forward onto the lip; the lower face 12 percent shorter about the eyes' lower edge (warps-10), with every authored mouth part moved by the same map so the carved opening keeps its walls; taller toes with wider splits; one tail ball (lowering it had uncovered the reconstruction's own stub as a second bulb); horn blend halved. Tried and undone: raising the mouth by moving its carves alone (thin blades of muzzle wall), a bigger tongue (a ball with a slot under it), a horn of two or three twisted strands (a blade, a smooth goat horn), toes 1 to 1.4 cm taller (the hind toes became fins). After critic 6: a fuller upper muzzle under the nose and fuller pads, the tongue 4 mm back. After critic 7 (sculpt-52): the pads 4 mm further forward and a rolled lower lip that frames the tongue from the front. Sculpt-53 is the build at the end of the night |

## Deformation audits

| Audit | Build | Skeleton and weights | Result |
|---|---|---|---|
| 1, 2 | sculpt-14, 16 | the X31 skeleton refit | deformation critic 1: 14 defects (backward elbows, the jaw carrying the muzzle, forepaws through the floor, rigid paddle ears, the knee too low, limits wider than sources) |
| 3 | sculpt-21 | `rig_sculpt.py`: joints placed on this body over slices, the crouch solved so all four feet stay planted | crouch planted; a paw raised into the face; 3 percent of the skin shared by two limbs |
| 4, 5 | sculpt-21 | ear chain on the blade's thickest line; weights cleaned (nearest-chain margin); jaw kept below the lip line | bleed 3.0 to 0.34 percent; the upper-lip tear gone at rest |
| 6 to 9 | sculpt-29 | posed on the build skin itself (weights carried from the 2.5 mm proxy), cleaned again there, the jaw's fade 7 mm | the proxy's stair-steps gone; deformation critic 2 (audit-9): feet planted, elbows, neck and jaw right; the haunch seam, the shin crossing the air under the haunch, ear root in the notch, chest and throat creases, a sit-back crouch |
| 10, 11 | sculpt-31, 36 | hind joints re-placed (hock at the foot of the shank), ear root in the root, an occiput bone, the jaw hinge higher and further back, the jaw kept above a throat line, sided limbs fading at the midline, 60 smoothing passes on the build skin before cleaning; level crouch; mid-stance hind in the stride; ear blades bend | bleed 0.01 percent; the midline fade, applied everywhere, tore the forepaws' inner edges into spikes (they stand 1.5 cm from the midline) |
| 12 | sculpt-36 | the midline fade only near each limb's root | deformation critic 3: setup sound; the shin skimming the air notch, ear1 low in its tube, the spine deep, a seam around the haunch, the wrist curling with the wrong sign, the folded forearm fused into the breastbone, the crouch hock a box corner |
| 13 to 20 | sculpt-36 to 50 | knee 1 cm higher, ear1 on the tube's center line, spine 1.5 cm higher, the crouch's hock lowered, wrists curling with +x (limit 100 degrees, sourced), wider midline fades (3 cm, 4 to 9 cm from the root), the jaw tip in the chin and the tail stub in the ball as the sculpt moved | deformation critic 4 (audit-17): setup sound; the stride paw, the chest ridge, the deep spine and ear1 fixed; the tail's weight dragging a 13 cm patch of rump (the source of the haunch seam), the grooming paw held out pointing up with the elbow collapsing into the chest, a V crease across the throat in the 50 degree turn, the far ear splaying in the look, the crouch's hind leg still a bracket |
| 21 to 24 | sculpt-50, 52, 53 | tail weight kept to the stub (`weightNear`) and its chain centered in the ball; the grooming tuck 30 degrees at the shoulder, 75 at the elbow, the paw curled to hang; the 50 degree turn mostly in the neck; the far ear held in during the look | see the table below |

**First and last audit** (audit-2 on sculpt-14, audit-24 on sculpt-53; audit-23 on sculpt-52 gave the same counts):

| Measure | audit-2 | audit-24 |
|---|---|---|
| Weight shared by two limbs | 3.6 percent of the skin | 0.04 percent |
| Joints outside the skin | 6 | 0 (one shaft, the jaw's, crosses the open mouth by 3 mm) |
| Stride: new self-intersecting face pairs | 176 | 3 |
| Crouch | 0, but the forepaws went through the floor (not measured then; critic 1) | 20 (the forearms pressing the chest as the elbows fold), feet planted within 1 mm |
| Look | 1 | 0 |
| Extreme | 2,383 | 431 (the tucked forearm against the chest and the folded hind leg against the haunch) |
| Mouth closed | 9 | 0 |
| Limit violations | not checked | 0 |

## State at the end of the night

Sculpt-53 with audit-24 (`sculpt.py` reproduces the build's spec exactly from body-recon-5 with the repairs `skin,face,proportions,details,smooth,horn,mouth,nose,eyes,lids,tail,bridge,toes,chest,lowerface`). The figure, the eyes, the horn, the ears and the stance are closer to the sheet than at the start of the night, and the rig no longer has a defect that a pose shows at sprite size. The face is not at standard: from the front the start of the night read softer, because its mouth was smaller and its muzzle rounder, even though its proportions were further from the sheet. Fur should not go on this body yet.

## Still open

Critic 7 (sculpt-52, ranked for sprites), with what sculpt-53 changed:

1. **Muzzle in profile.** The sheet's muzzle is deep and round from nose to chin with the upper lip pads under the nose; ours is a thinner tube with the lip 3 to 4 cm behind the nose tip. The nose's own projection matches. Sculpt-53 moved the pads 4 mm forward, which does not show at sprite size.
2. **The mouth is not the sheet's happy D.** The sheet opens about 3.7 cm tall with the tongue framed by the lower lip; ours is a slot about 1.2 cm tall with corners that read as knobs and a square chin block. Sculpt-53 added the lower lip rim around the tongue (visible from the front and the three-quarter view); the opening's height and corners are unchanged.
3. **Toes.** The hind toes stand 3.9 cm against the sheet's 6.4 cm, read as slots, and cover only the inner half of the foot.
4. **Ear.** A waist on the back edge (2.3 to 3.1 cm forward of the sheet between z 0.41 and 0.50) and a small bump.
5. **Horn.** Reads as stacked rings rather than a twisted cone; the tip is a ledge with a knob.
6. **Chest.** 0.9 to 1.4 cm behind the sheet, and its bottom 2.2 cm low; the chest carve had no measurable effect.
7. **Rump.** 1.5 to 2.1 cm high; hips 27 cm wide.
8. **Head** 14 percent wide at the eyes; the eyes 9 mm further apart than the sheet's.
9. **Tail** reads as a thumb.
10. Close-up only: the lower lid gap, the nose's shape, small face lumps, the wrists.

Sheet disagreements: the eye in profile, ruled by Nick on 2026-10-25: "front view for eyes is what we want but the face still needs work" (the front view wins; the eyes keep their 20 degree gaze and the side sprite's lens-shaped eye is accepted). Still unruled: the face height, the tail height.

Deformation critic 4 (audit-17), with what audits 18 to 24 changed: the tail's drag on the rump, the grooming paw, the throat V and the far ear in the look were fixed. Open: the crouch's folded hind leg reads as a bracket in the side view; no scapula, so the shoulder does not slide; a ring crease on the stride's forearm; a slot of lip lining when the jaw opens past the rest pose; shallow grooves across the skull in the look; ear joints 2 to 4 on the back rim of the blade rather than its center.

The next step for the face is the one in lesson 20: rebuild the lower face around the target mouth instead of carving it further.

## Lower face rebuild (2026-10-25)

Nick: "front view for eyes is what we want but the face still needs work". Following lesson 20, the repair `mouthrebuild` (run last) drops every mouth, tongue and chin part and authors a lower face of its own over the reconstruction's, in final coordinates measured on metric overlays (front and side, one scale): an upper muzzle mass, a lower jaw mass shaped as the sheet's U, cheeks behind the corners, one smooth D carved to the corners, a side wedge through the jaw walls so the profile opens, a carve at each corner that rounds away the wall the two carves leave, the pads added after the carve, the tongue tilted so its tip lies on the lower lip and its back rises, a carve rounding the jaw's flat underside. The nose was rebuilt as a wider button with its point toward the pads' notch, and a fill on the muzzle top behind it. Builds sculpt-54 to 70; sculpt-69 kept (sculpt-70's bigger muzzle fill read as a separate block). Blind critics 8 to 10: 4, 4 and 5 of 10 for the lower face against the sheet (critic 10 on sculpt-68), each judging it better than sculpt-53 from the front and three-quarter. Audit-25 (jaw weight line moved to the new opening): every count as audit-24 except mouth-closed, 135 intersecting pairs, the tongue passing into the inside of the upper lip as the jaw closes; a production rig needs a tongue bone.

Lessons: two carves that meet leave a wall that floats free once anything else moves (the blockout refuses the islands, which found them); a lip roll swept along a carved edge floats as a rod wherever the side opening passes it, so the jaw's own edge makes the lip; a chin mass plus corner carves made a peg, one U-shaped jaw mass made a chin.

Open: the snout in profile is a longer tube than the sheet's; the nose is not yet a separate triangular button (no crease, nostrils facing forward); the tongue has no center groove; the upper lip follows the front view's height, 1.5 cm above the side view's (the same rule as the eyes).

## Face pass 2 (2026-10-25)

Nick on sculpt-69: "that is much better". Builds sculpt-71 to 80, sculpt-80 kept. The nose is a rounded inverted triangle of three lobes and a point, added after a carve 1.5 mm bigger than itself (a crease around its base), with nostril slits cut into it by a new op, `carve-after` (`parts/field.py`: carves applied after the add-afters, tested in `test_parts.py`); one superellipsoid read as a pig's oval at exponent 2.6 and a box at 3. The bridge sweep runs on toward the nose and stops short of its socket (reaching into it left a floating sliver the blockout refused); a separate fill mass behind the nose read as a block (sculpt-70). The tongue has a center groove (carve-after). Critics 11 and 12: 5 and 4 of 10, both about the same as sculpt-69 overall; flat for four rounds, so handed to Nick. Audit-27: unchanged except mouth-closed, 337 pairs inside the mouth (the tongue into the upper lip; a tongue bone is needed). Open: the snout reads longer than the pick in three-quarter and the sheet's nose is a rounder ball in profile (shortening means moving the whole lower face back, not done without asking); one critic read the pads as a moustache; small nubs under the tongue.

## Tools added in this round

- `parts/spiral.py`: `twist` (turns tighten toward the tip), `depthTip` (ridge depth growing toward the tip) and `fade` (how far below the tip the ridges fade).
- `parts/field.py`: the `carve-after` op (a groove or hole cut into an add-after part).
- `parts/stencil.py`: `smooth` (the outline points are control points of a closed spline, so a carved opening has no corners).
- `blockout/hypnopet/sculpt.py` `lowerface`: a grid warp and the authored parts in it moved by one map, so carved openings keep their walls.
- `readiness/rig_test.py`: weight cleanup (nearest-chain margin, sided chains fade at the midline, `weightBelow` and `weightAbove` side-view lines with a ramp), Laplacian weight smoothing, `--dense` (pose and render the build skin with the proxy's weights carried over), the shaft check (`shaftsOutsideSkin`: a bone can leave the skin between two joints that are inside it).
- `blockout/hypnopet/rig_sculpt.py`: the test skeleton fitted to the sculpt, forward kinematics and a Gauss-Newton solve that keeps planted feet planted, limits derived from the rest joint angles and their sources.
- Board cameras for the feet (front, forepaw and hind foot three-quarter, below); a pick tool (render pixel to model point); metric overlays of the clay render on the sheet.

## Lessons

1. **A smooth union of two fields inflates their overlap**; morph one field into the other inside a region instead (`grid_merge.py`).
2. **A mask must not weight a large displacement.** A rotation weighted by a millimeter-sharp mask folded the map and left ghosts; a detached piece moves whole with a taper weight only.
3. **Warp boxes need fades longer than the feature.** A 7 cm bend left a crease across the ear; a box faded over 2.5 cm left a ledge across the cheek; a soft ellipsoid fading over most of its radius left neither. Order matters too: narrowing the feet after the ears had been swung in caught the ear tips.
4. **Trace an outline that must match a drawing** (the mouth) with a stencil; ellipsoids put the widest point at mid-height.
5. **Two carved openings meeting at a corner leave a flap.** The front D and the side wedge each left a sliver of lip wall that read as a fang or a tooth; a smooth carve at the corner removed it where widening either stencil cut slots into the cheek.
6. **A center point lower than its neighbours reads as a tooth** in three-quarter view; the top edge of a smile notches up between the muzzle pads.
7. **Old joints do not fit a new body.** Joints are placed on each body over its slices; the knee belongs at the front of the haunch, the hock at the foot of the shank where it meets the foot, the ear chain on the blade's thickest line (a cupped ear's centroid is in the cup, outside the skin), the ear root in the root.
8. **Check shafts, not only joints.** The shin crossed the air under the haunch with both ends inside the skin.
9. **Solve planted limbs per skeleton**, and check what a pose can be: a push-off that extends every joint needs the foot behind the hip, which a still body cannot give.
10. **Audit the surface that ships.** A 2.5 mm proxy stair-stepped the lips and lids and, by closing thin gaps, handed one lip the other's weights; pose the build skin with weights carried from the proxy and clean them again there.
11. **Heat weights need rules.** Limbs share vertices (forelegs down the chest, tail and haunches, jaw and shoulders); keep each limb to where its own bones are nearest, fade sided limbs to nothing at the midline, bound the jaw above and below by side-view lines, and smooth before cleaning so the edges are not seams.
12. **A shared lock left held blocks other sessions**; the runner warns when a release fails.
13. **Metric overlays find what point checks miss.** The ear splay, the hind feet's stance and the jowl width were each 2 to 4 cm off and plain once the render and the sheet sat at one scale.
14. **An authored part placed in world coordinates must move with every warp of the field under it.** Toes, lids, joints and the mouth parts were re-measured or re-mapped after each warp; moving a carved opening without moving the field around it left blades of wall.
15. **Lowering a part can uncover what it covered.** The tail ball, moved down, left the reconstruction's own tail stub showing above it as a second bulb.
16. **Draw a carved outline as a spline, not a polygon.** A polygon's corners carved spikes at the mouth's ends at every resolution.
17. **A rig's sign conventions belong beside its poses.** The wrist curls with +x; a paw's angle is the sum of shoulder, elbow and wrist. The critic found the sign error by summing the angles.
18. **A limb's midline rule must stop near its root.** Faded everywhere, it handed the inner edges of forepaws standing 1.5 cm from the midline to the chest, and they tore into spikes in the crouch.
19. **Critics disagree with each other and the sheet's views disagree with one another.** Record the sheet's disagreements (head height, eye shape in profile, ear and hip widths, tail height) and judge by the views the sprites use; a trial that a critic asked for and that read worse on the board was undone and recorded (the two- and three-strand horns).
20. **Some shapes resist this toolset.** Five rounds of carves and masses moved the mouth toward the sheet but never matched it: the reconstruction's muzzle walls fight every carved opening near its sides. The next attempt should rebuild the lower face around the target mouth (a fresh face reconstruction from the sheet, or a lip loop built as one swept part around a cavity) rather than carve further.
