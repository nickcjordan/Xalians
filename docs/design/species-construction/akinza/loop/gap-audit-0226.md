# Akinza gap audit, assembled-0226

Independent critic audit, 2026-09-30. Target: the first grayscale turnaround sheet (`evidence/identity-run-0001.png`), with packet crops r01 to r04. Model: `untracked/species-construction/akinza/assembled-0226/render/` and packet sheets m01 to m11. Tails and fur strand texture are out of scope; coat mass that changes a silhouette is in scope.

**How the numbers were taken.** The m11 overlay was split back into two masks per view (grey plus orange is the sheet, grey plus blue is the model). Both figures are 497 px tall in that frame, so every width below is a fraction of figure height (H), read at the same height fraction from the top of the fan (0) to the floor (1). The two figures stand in different poses, so I only compare rows where both show the same part with nothing in front of it (no hands, arms or tails). The scale was also checked by eye with side-by-side crops at equal figure height.

**What the existing metrics hide.** The loop has fitted the model to the sheet at the rows it measures: fan span, neck, shoulders and front waist all sit within 1 to 5 percent, and the head band IoU is .87 to .90. The parts that are wrong are the rows and directions nobody measures: ankles and shins from the front, waist depth from the side, the base of the head from the side and back, and the construction of every surface inside the outline. A good outline with the wrong things inside it is the pattern across this whole model.

## 1. First glance

From the back or the rear three-quarter, the creature reads as a goblet or a mushroom: a smooth pale bowl on a thin stalk, with no head in it. From the front, the next things you notice are the googly eyes (round discs with thick black rims, sitting on the face like stickers) and an ear fan that reads as a thin crinkled leaf or a kale-edged dish, not a thick shaggy mass of fur with pale tufts inside. Then the body: it reads as a smooth vinyl toy with a long straight tube torso and a "shorts" pelvis with a belt line, standing on thick straight column legs with ankles as wide as the calves, ending in flat bricks with four bead toes. The arms hang out like noodles from a sloping shoulder web and end in tapered buds, not paws. In profile the trunk is a slab with no waist, the chest sits behind the chin, and the head is a box with a heavy lower back that swallows the neck. The sheet's creature is lithe, slender limbed and long necked, with a round fur-mop head; the model is a stocky toddler built from plain tubes.

## 2. Ranked gaps

Severity: 3 breaks identity, 2 clearly wrong, 1 refinement. Measured values are model / sheet as fractions of H unless stated.

| Rank | Part | What the model does | What the sheet shows | Sev | Kind | How to measure (model / sheet) |
|---|---|---|---|---|---|---|
| 1 | Fan rear and back of head | The fan's back is one smooth pale convex bowl spanning the whole width, with a crinkled rim on top; the head is invisible inside it; the neck rises from a disc at the bowl's bottom. Reads as a goblet. | A round furry head mass sits in the center; two shaggy wings grow out of its upper sides; the lower edges hang as a shaggy fringe; the head tapers smoothly into the neck. | 3 | construction method | Back-view width at 0.18H: **0.225 / 0.157** (1.43x). The sheet stays narrow (head only) until the wings start at about 0.16H; the model flares as one cone from the neck. Visual: is a head dome visible in the back view? model no, sheet yes. |
| 2 | Lower legs, ankles (front and back) | Columns: shin and ankle nearly as wide as the calf, a wavy outline with a knee lump and a second calf bulge. | Long slender shins tapering hard to very thin ankles, then a broad paw. | 3 | proportion and shape (cross section) | Front ankle width at 0.91H: **0.075 / 0.039** (1.9x). Back at 0.91H: **0.075 / 0.042**. Shin at 0.85H front: **0.096 / 0.067** (1.43x). Ankle over thigh (0.68H) front: **0.71 / 0.37**. Ankle front width over side depth at 0.91H: **1.2 / 0.5**: the model ankle is wide and shallow, the sheet ankle is narrow and deep. Profile-only checks (R08.4 today) pass because the side depth is close. |
| 3 | Eyes | Near-circular raised discs with a uniform thick black ring; in profile the eye bulges to the face's front line, level with the nose tip. Stare straight ahead. | Large tall ovals set into the face under a thicker upper lid line that thins toward the bottom; in profile the eye sits behind the brow and nose line; pupils glance to one side. | 3 | construction method | Profile: eye front behind the brow-to-nose line by about **0 / 0.01 to 0.015H**. Ring: uniform about 5.7 percent of eye width / upper lid about 4.5 percent tapering to about 1.5 percent at the bottom. Eye gap over eye width: **0.79 / 0.92**. Eye width over face width at eye level: **0.30 / 0.27**. |
| 4 | Fan front construction | A thin shell with a lettuce-crinkled rim, thorn spikes, flat facets, and a dark empty triangular inner hollow. From the front you see the curled top lip, so it reads tilted back like a dish. | A thick shaggy fur volume of long pointed locks radiating from the ear roots, with a large pale fluffy inner-ear tuft filling each cup near the skull. | 3 | construction method | Outline already matches (span 0.993, column heights within a few px). Visual only: inner-ear tuft present and filling at least half of the cup (model no, sheet yes); fan edge made of pointed locks, not crinkle or thorns. |
| 5 | Torso in profile | A slab of nearly constant depth from chest to hip; no waist in profile. | The trunk narrows clearly from rib cage to waist in profile too, then fills out at the rump. | 3 | proportion (cross section) | Side depth at the narrowest point between 0.42 and 0.46H: **0.115 / 0.082** (1.4x). Chest (0.32H) over waist depth: **1.07 / 1.56**. The measured R06.2 passes only because it samples 0.48H, where the sheet's hand sits on the hip and widens its row. Waist cross section front width over side depth: **0.84 / 0.62** (model is a cylinder). |
| 6 | Hind paws | A flat slab with four equal sausage toes in a straight row, claws as white spikes stuck on the front face; the paw is barely wider than the ankle; low toes. | Broad rounded paws with big toe lobes, middle toes leading, long curved claws coming out of the toe tips, a domed instep rising into a slim ankle. | 3 | shape and construction | Front paw width (0.98H) over ankle width (0.91H): **1.35 / 2.6**. Side width at 0.95H (instep height): **0.074 / 0.113**. Side paw length at 0.99H: **0.137 / 0.153** (0.9x). |
| 7 | Side posture (S curve) | Chest sits behind the chin; upper back and nape bulge back; the trunk looks set back under a forward head (turtle posture). | Chest well forward of the chin, a long smooth back with a lumbar sway, neck sloping forward from the shoulders into the head. | 2 | position and connection | Side, chest front edge (0.36H) relative to chin front (0.22H): **0.008 behind / 0.026 ahead**. Back edge at 0.26 to 0.30H: the model sits **0.025H further back** than the sheet. |
| 8 | Head base, side and nape | In profile the head is boxy with a flat back and a heavy lower-rear mass (fan shards and occiput) hanging down to the nape, which makes the neck look short and the head a block. | In profile the head is a round mop; the back of the skull curves in sharply to a slim nape; the neck reads long and slender. | 2 | shape | Side depth at 0.22H: **0.125 / 0.087** (1.44x). At 0.20H: 0.137 / 0.123. |
| 9 | Forepaws | Tapered buds (from the front they look like a thumb) with tiny claws; from the side a small mitten with faint lobes. | Substantial paws with four distinct digits and long visible white claws, a blunt rounded end wider than the wrist. | 3 | shape and construction | Front view: paw outline narrows to a point at the tip (model) versus a blunt end at least as wide as the wrist (sheet). Paw edge-on thickness over broad-face width: about **0.6 / 0.8** (estimate). Claw length over digit length: about **0.15 / 0.35** (estimate). |
| 10 | Shoulders and arm root | The arm grows out of a long sloped trapezius and lat web; there is no deltoid cap; the armpit is low; from behind a broad flat shoulder plate with a ledge. | A rounded shoulder cap at the top of the trunk; the arm drops from that cap; slim, smooth upper back. | 2 | position and connection | Front armpit (first row where the arm silhouette separates from the trunk): **0.40H / 0.36H**. Pose caveat: the sheet arms are akimbo, which raises the armpit slightly; with arms down it should still be at or above about 0.38H. Elbow height: model 0.50H; a hanging arm of the sheet's upper-arm length (about 0.12H from a 0.31H shoulder) puts it near 0.43H (estimate). |
| 11 | Upper arm surface | A lit flat strip runs down the outside of the upper arm in profile (a slab facet with an edge line); the arm also reads as a separate tube inset into the torso. | Round upper arm blending into the shoulder. | 2 | shape | Visual: in `left.png` the upper arm has a uniform bright vertical band with hard edges. |
| 12 | Pelvis shelf and belt line | A horizontal crease crosses the belly and back at about 0.47H; below it the pelvis steps out like a pair of shorts. | One smooth curve from a narrow waist out to the hips over a long height. | 2 | construction (part join) | Front flank: the outline steps out **0.030H within 0.02H** (0.48 to 0.50H). The sheet's waist-to-hip flare runs over about 0.12H of height. |
| 13 | Crotch and inner thighs | A tall rounded inverted U arch between straight parallel inner thighs (trouser legs). | Inner thighs close at the crotch in a narrow V, the gap opening below as the legs spread. | 2 | shape | Front gap width 0.02H below the crotch: about 0.048H / 0.026H (tail fills both, so visual check from the back view or a tail-hidden render). |
| 14 | Buttocks | No buttock from behind; the hip flows into the thigh with no fold. | Round buttocks with a clear fold under each where the thigh begins. | 2 | shape | Visual, back view with tails hidden: gluteal fold present (model no, sheet yes). |
| 15 | Cheeks and lower face | A crusty ring of small scale-like lumps around the lower face; a knob under the mouth. | A smooth broad face; soft cheek fur tufts flare out at the jaw sides; a small rounded chin. | 2 | construction and shape | Visual. Cheek tufts should break the front outline at about 0.17 to 0.20H as broad soft masses. |
| 16 | Nose and muzzle in profile | The nose is a tab perched on top of the muzzle; the muzzle bulges as a ball below it; chin knob. | A small seated nose, a short soft muzzle, a receding small chin, a smile line. | 2 | shape | Profile: the muzzle should stay behind the nose tip; model muzzle front is level with or ahead of the nose base. |
| 17 | Thighs and knees (front) | Slightly thick, with a knob at the knee and too little taper. | Full thighs tapering to slim knees. | 1 to 2 | proportion | Front knee width at 0.76H: **0.076 / 0.064**; thigh 0.70H: 0.100 / 0.087. Thigh-to-knee taper: **0.69 / 0.56**. |
| 18 | Back musculature | Heavy trapezius hump and a broad V back (athletic). | Slim, smooth back with modest shoulder blades. | 2 | shape | Visual, rear oblique. Ties to rank 10. |
| 19 | Fan sides in profile | The ear seen from the side is a ragged column of shards; no inner cup visible. | The ear reads as a round shaggy disc with the pale inner cup clearly visible from the side, because the cup opens forward and outward. | 2 | construction (ear orientation) | Side view: visible inner cup area over ear area: **0 / about 0.15 to 0.2**. |
| 20 | Gaze and expression | Pupils centered, staring. | Pupils glance to one side, with a soft smile. | 1 | refinement | Not geometry; cheap to set. |

## 3. Honest region scores

| Region | Last score | My score | What the region's criteria do not catch |
|---|---|---|---|
| R01 head silhouette | 6 | **3.5** | Ranks 1 and 8. All criteria are outline IoU or front views; nothing checks that a head exists inside the back view, or the head's depth at its base in profile. R01.4 names the problem but the outline still fits, so it gets argued as partial. |
| R02 face | 4 | **2.5** | Rank 3 is only partly covered: R02.1 says "no prouder than the brow" but nothing measures it, and no criterion checks lid weight tapering, eye spacing or eye-to-face ratio. Rank 15 crust is not named (R02.5 asks for tufts, not for the absence of a lump ring). Rank 20 is not covered. |
| R03 fan front | 5 | **2.5** | The pale inner-ear tuft filling the cup is never asked for (R03.5 asks for a hollow, which rewards the empty cavity the model has). The crinkle and kale rim is not named. Two measured criteria pass on outline and reward a shell that is the right size. Rank 19 (side view of the cup) is not covered. |
| R04 fan rear | 2 | **1** | The criteria describe locks and a crown tuft but not the absence of a head. Nothing measures the back-view width just above the neck (rank 1). R04.1 and R04.2 are outline metrics that a bowl can nearly pass. |
| R05 neck and shoulders | 7 | **3.5** | All three measured criteria pass and carry the score, yet the neck reads as a stalk under a disc from behind, the nape bulges, and the arm grows from a web instead of a shoulder cap. No criterion covers armpit or elbow height, the back-view collar ring, or the depth at the head base. |
| R06 torso | 7 | **3** | R06.2 samples the waist where the sheet's hand inflates its row, so the 1.4x profile depth passes. Nothing checks chest-to-waist taper in profile, chest forward of chin, the pelvis belt line as a measured step, buttocks, or crotch shape. R06.5 "slim, restrained rear" is too soft to fail a slab. |
| R07 arms and forepaws | 5 | **2.5** | Nothing checks where the arm leaves the trunk, deltoid cap, elbow height, forepaw width against the wrist, the blunt mitten end, or claw size. R07.3 and R07.4 are judged mostly from the profile close-up, where the paw looks best; from the front it is a bud. |
| R08 legs | 6.3 | **2.5** | The biggest leg fault, front and back width of shin and ankle (1.4x and 1.9x), is never measured, and R08.4 judges ankle thickness only in profile, the one view where the model's ankle is right. Nothing checks leg taper ratios or cross-section shape. |
| R09 hind paws | 5 | **2.5** | R09.4 "size reads right against the leg" passes by eye because the leg is just as wrong. Nothing measures paw width against ankle width, instep height, or paw length. Claw size and toe lobe size are not named. |
| R12 coherence | 1.3 | **1** | Accurate already. A noisy crinkled fan on a smooth vinyl body, stuck-on eyes, plus tube limbs. R12.4 should be backed by numbers (see below). |

## 4. Proposed new criteria

Measured criteria read from the silhouette masks the loop already builds (fractions of figure height at fixed height fractions). The gestalt criteria are each one concrete yes or no a critic can check on a named image; all of them fail on assembled-0226.

### R01 head
- **Gestalt:** In `back.png` a round head mass reads in the center of the fan as its own dome, narrower than the wings, with the neck tapering out of its bottom. Fails when the center of the back view is one continuous surface from tip to tip.
- **Measured:** back-view width at 0.18H at most 1.15x the sheet (sheet 0.157H; model 0.225H).
- **Measured:** side-view depth at 0.22H at most 1.15x the sheet (sheet 0.087H; model 0.125H).

### R02 face
- **Gestalt:** In true profile the brow and the nose tip both stand in front of the eye surface, and the black outline is heavier on the top lid than at the bottom. Fails on a disc eye at the front line or a uniform ring.
- **Measured (front close-up):** eye gap over eye width 0.85 to 1.0 (sheet 0.92; model 0.79). Eye height over width at least 1.35 (sheet 1.41).
- **Measured (profile):** the eye's frontmost point at least 0.01H behind the straight line from brow to nose tip.

### R03 fan front
- **Gestalt:** Each ear cup is filled by a pale, fluffy, pointed inner tuft that covers at least half of the cup's area in `front.png`, and the fan edge is a run of pointed locks, with no crinkled rim, thorn or flat leaf plane anywhere.
- **Visual (side):** in `left.png` the inner cup is visible as a recess or tuft occupying at least 15 percent of the ear's side-view area (sheet about 15 to 20 percent; model 0).

### R04 fan rear
- **Gestalt:** From `back.png` and `rear-oblique.png`, the fan's back is covered in down-and-outward locks with no smooth area larger than one lock, and nothing reads as a bowl or a basin rim. A stranger asked to name the shape would not say "bowl", "cup" or "mushroom".
- **Measured:** same back-view 0.18H width as R01, plus the back-view width at 0.20H must stay within 1.15x of the sheet's 0.127H.

### R05 neck and shoulders
- **Gestalt:** The arm leaves the trunk from a rounded shoulder cap at the top corner of the trunk, not from the side of a sloping web; from behind, there is no collar ring, disc or ledge on the neck or across the shoulders.
- **Measured:** front armpit height at or above 0.38H with arms down (model 0.40H; sheet 0.36H akimbo).
- **Measured:** side back edge at 0.26 to 0.30H no more than 0.01H behind the sheet (model 0.025H behind).

### R06 torso
- **Gestalt:** In `left.png` the trunk visibly narrows from rib cage to waist and fills out again at the rump, and no horizontal crease or belt line crosses the belly, flank or back.
- **Measured:** side waist depth (narrowest row from 0.42 to 0.46H) at most 1.1x the sheet (sheet 0.082H; model 0.115H). Sample rows the sheet's hands and arms do not cover.
- **Measured:** side chest depth (0.32H) over side waist depth at least 1.4 (sheet 1.56; model 1.07).
- **Measured:** side chest front edge at 0.36H at least 0.015H ahead of the chin front at 0.22H (sheet 0.026 ahead; model 0.008 behind).
- **Measured:** front flank outline steps out no more than 0.012H per 0.02H of height between the waist minimum and the hip maximum (model 0.030H at 0.48 to 0.50H).
- **Gestalt (rear):** with tails hidden, each buttock is a rounded mass with a fold under it.

### R07 arms and forepaws
- **Gestalt:** In `front.png` each forepaw ends in a blunt rounded mitten at least as wide as the wrist, with claws visible at the tip; nothing about it reads as a single finger or a bud.
- **Measured:** elbow height (narrowest arm row at the joint bend, front) within 0.03H of 0.43H for arms down (model 0.50H; estimate from sheet upper-arm length).
- **Measured:** forepaw broad-face width over wrist width at least 1.1 (sheet about 1.15 in r02).
- **Visual:** claw length at least a third of its digit's length (sheet about 0.35).

### R08 legs
- **Gestalt:** In `front.png` and `back.png` the ankle is plainly the thinnest point of the leg, less than half the thigh, and the outline between knee and ankle has exactly one gentle swell. Fails on a column leg or a wavy outline.
- **Measured:** front and back ankle width at 0.91H at most 1.15x the sheet (sheet 0.039 to 0.042H; model 0.075H).
- **Measured:** front and back shin width at 0.85H at most 1.1x the sheet (sheet 0.067 to 0.072H; model 0.096H).
- **Measured:** front ankle (0.91H) over thigh (0.68H) at most 0.45 (sheet 0.37; model 0.71).
- **Measured:** ankle front width over side depth at 0.91H at most 0.7 (sheet 0.5; model 1.2).

### R09 hind paws
- **Gestalt:** In `front.png` each hind paw is a broad rounded fan of large toe lobes, clearly wider than the ankle, with the middle toes leading and long curved claws coming out of the toe tips; in `left.png` the toes rise into a domed instep.
- **Measured:** front paw width at 0.98H over ankle width at 0.91H at least 2.2 (sheet 2.6; model 1.35).
- **Measured:** side width at 0.95H at least 0.10H (sheet 0.113H; model 0.074H).
- **Measured:** side paw length at 0.99H within 7 percent of the sheet's 0.153H (model 0.137H).

### R12 coherence
- **Gestalt:** Shown the model and the sheet side by side at equal height with no labels, a fresh reader picks the same three words for both bodies (for the sheet: slim, lithe, long limbed). Fails today on "stocky", "toy", "tube".
- **Measured:** a whole-figure profile check that adds the rows above (ankle, shin, side waist, head base) to the existing fit, so no region can be scored high while its unmeasured rows are 1.4x off.

## 5. Structural versus local

Most of what is wrong is structural. Local field-space sculpt edits cannot fix these, because each one is a wrong cross section, a wrong joint position, or a part built by the wrong method. Pushing a surface around inside a fitted outline keeps the outline and keeps the fault.

**Structural (rebuild the part or change lengths and joints):**
- **Fan and back of head (ranks 1, 4, 8, 19).** The fan is a displaced shell that wraps the skull. It needs a real skull ball that exists and shows from behind, with the ears built as separate cupped volumes rooted on its upper sides. Each cup should open forward and outward so it shows from the side, be filled with an inner tuft, and be covered in lock-shaped masses on both faces. The outline fit can be kept as the target envelope, but the inside must be rebuilt.
- **Eyes (rank 3).** Inset eyeballs under lid geometry with a tapered lid line, set behind the brow-to-nose plane. This replaces the current raised discs and is not a sculpt pass.
- **Legs (ranks 2, 17).** Rebuild along the leg skeleton with explicit widths and depths at hip, knee, mid-shin and ankle, using elliptical sections that are deeper than wide below the knee. The current mesh has the right lengths and stance but the wrong cross sections at every row below the mid-thigh.
- **Hind paws (rank 6).** A new part: toe lobes in an arch, a raised instep, claws from the toe tips, and a paw width about 2.5x the ankle.
- **Torso profile (ranks 5, 7, 12, 14).** Loft the trunk from front and side profile curves together, so the side waist pinches to about 0.08H, the chest moves forward about 0.03H and the upper back moves forward about 0.025H. The pelvis should blend into the trunk with no join line, and the buttocks need folds. The front outline can stay as it is; the side outline and cross sections must change.
- **Shoulder and arm root (ranks 10, 11, 18).** Move the shoulder joint up to a deltoid cap at the trunk's top corner, raise the armpit about 0.02 to 0.04H, and bring the elbow up to about 0.43H. The arm should be a round limb hung from that joint, not a tube grown out of a web.
- **Forepaws (rank 9).** A new part with four digits, a blunt mitten end wider than the wrist, and claws about a third of the digit's length.

**Local surface refinements (sculpt edits are appropriate once the structure is right):**
- Cheek crust replaced by two or three soft cheek tufts (rank 15).
- Chin knob removed, nose seated, muzzle kept behind the nose tip (rank 16).
- Knee knob softened and the second calf bulge removed (part of rank 2, but only after the rebuild).
- Crotch arch closed to a V (rank 13). This is borderline: it may follow from the leg rebuild.
- Pupil gaze and lid weight (rank 20, part of rank 3).

The pattern to break: twelve of the twenty gaps are wrong depths, cross sections or joint positions that a front-only outline fit cannot see. The checklist rewards the outline, so it scored the parts it measured highly and the parts it did not measure by eye, generously. Add the measured rows in section 4 before the next build round, so that a part cannot pass while its unmeasured rows are 40 to 90 percent off.
