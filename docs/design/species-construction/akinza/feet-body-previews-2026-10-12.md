# Akinza feet and body previews (2026-10-12)

Diagnosis and previews only. The recipe chain, references, rubric, invariants and specs are unchanged; every "after" picture is a temporary deformation of a copy of assembled-3179 (recipe `recipe-tails-v3.json`) held in memory and never saved to a blend. Pictures and numbers: `untracked/species-construction/akinza/surface/head-redesign/feet-body-previews/` (this file is also there as `findings.md`). Scripts: `art/species-construction/previews/feet_body/`. All measurements are from the mesh; fh means figure heights (the loop's fixed 1.8605 world units).

## Task 1: hind feet and ankles

Nick, 2026-10-12: "the three-quarter angle makes the feet and ankles specifically look very clunky, almost like clown shoes. Whereas the side view looks shorter and more in line with what I'm looking for ... from directly behind, it also has that kind of weird blocky-looking ankle."

### Physical cause (measured)

The foot is as wide as it is long, and most of that width hangs off the outside of the ankle. The side view sees only the foot's length, so it looks right there and wrong from everywhere else.

| Left hind foot, assembled-3179 | world | fh |
|---|---|---|
| Length, heel to toe (all the side view sees) | .207 | .112 |
| Widest width (ball and toes) | .213 | .114 |
| Heel width (y .02) | .126 | .068 |
| Ankle width / depth at z -.83 | .066 / .103 | .035 / .055 |
| Foot width over ankle width | 3.2 times | |
| Ball centre outward of the ankle axis | .051 | .027 |
| Foot overhang outside the ankle | .124 | .067 |
| Seen width from the front and from behind | .213 | .114 |
| Seen width at the full-body three-quarter and rear three-quarter cameras | .245 | .132 |

So:

1. **Three-quarter (clown shoes).** At 38 degrees the camera sees the foot's width and length together: .132 fh against .112 from the side, 18 percent more foot than the view Nick likes, on a foot that is already 3.2 times the ankle's width. The four toes sit in one flat row across the full .114 fh width.
2. **Behind (blocky ankle).** From behind the camera sees the full .114 fh width as a slab under a .035 fh ankle, with the ankle standing on the slab's inner edge (the slab sticks out .067 fh to the outside and only .01 to the inside). The heel's back face is vertical and flush with the back of the ankle column; the ankle at z -.83 even reaches a little behind the sole's heel line (see `feet-footprint-from-above.png`), so there is no rounded heel to soften the corner.
3. **Not the cause:** the foot is not rotated outward (the claw row is symmetric about the foot's own centre; the heel-to-toe axis turns out only about 14 degrees, mostly from the outer bulge) and the toes are not splayed; the ankle column is not thick sideways (.035 fh, close to the sheet's .034 to .043 at the same height).

For comparison: the accepted paw reference (r02) shows the paw at roughly 1.4 to 2 times the ankle's width from the front three-quarter, with the toes bunched; the sheet's six views all show the feet at about .08 to .125 fh whatever the angle (the sheet stands toe-out, so those numbers mix length and width); Nick's silhouette draws the feet low, flat and slim. Picture: `feet-diagnosis-current.png`.

### Hold check

| Hold | Source | Blocks the fix? |
|---|---|---|
| Hind paw as candidate B (assembled-2920) | Nick, 2026-10-08: "B looks fine" (as seen from the side) | No, if it protects the look: the proposal moves the foot only sideways, so the side view is unchanged by construction (`feet-front-side-before-after.png`). The round 30 packet he picked from also showed front and oblique crops, so if he meant those too, this is his call. |
| Every paw parameter at its baseline (the way approvals have been carried in the loop) | inferred | Yes, if applied: the width lives in the paw step B-21 (`rebuild_hind_paws_field.py`, spec `B-21-5273502d5ba4.json`). Lift it: protect the side look, not the parameters. |
| Hind legs stay fuller (I06) | Nick, 2026-09-28 | No (the ankle narrows 18 percent at most, the leg above z -.78 does not move). |

Blocked by: nothing Nick set, as long as "B looks fine" protects the side look.

### Proposal (smallest change)

Narrow each hind foot sideways about its own ankle axis to 74 percent of its width, move the ball and toes .025 world (.013 fh) inward so they sit under the ankle instead of off its outside, and round the lower side edges into the sole (the bottom narrows by up to 22 percent of the width below z -.905). Everything eases out between z -.86 and -.78, so the leg above the ankle does not move; the claws ride with their toes. The side view does not change at all.

| Left hind foot | current | proposal |
|---|---|---|
| Widest width | .114 fh | .084 fh (-27 percent) |
| Width over length | 1.02 | .75 |
| Ball centre outward of the ankle | .027 fh | .007 fh |
| Overhang outside the ankle | .067 fh | .034 fh |
| Seen width, three-quarter and rear three-quarter | .132 fh | .100 fh (less than the side view's .112) |
| Seen width, front and back | .114 fh | .084 fh |
| Seen length, side | .112 fh | .112 fh (unchanged) |
| Ankle width at z -.83 | .035 fh | .029 fh (inside the ease-out) |

Pictures: `feet-three-quarter-before-after.png`, `feet-back-before-after.png`, `feet-front-side-before-after.png`, `feet-footprint-from-above.png`. In the recipe this would be either a width and toe-spacing change in B-21 or a small post step like P-tails3; the preview's field is in `deform_feet.py` (scale .74, inward .025, roll .22).

Still visible after the proposal, not touched here: the soft bumps on the back of the heel (present before, visible from behind and the rear three-quarter), and the foot's height (about .045 fh at the ball against the flatter feet in Nick's silhouette), which shows in the side view he likes, so it was left alone.

## Task 2: slimmer and softer body (previews only)

Nick, 2026-10-12: "I do think it should look a little slimmer and softer."

Each variant changes only the trunk, shoulders, arms and legs. The head and neck (fade from z .34 to .42), the forepaws (below the wrist), the hind paws (below the ankle) and the tails stay as they are: measured displacement 0 on the head, hind paws and forepaw shapes, at most .0028 world on the tails where they meet the back. How it works: each part is slimmed toward its own axis by smooth weights (trunk width and depth separately by height, arms around the arm axis with more at the shoulder cap, legs around each leg's axis, so the stance and feet stay put); the arms move inward by the trunk's shoulder narrowing so the cap stays over the arm (the forepaw rides along unchanged); the outer top of each shoulder is lowered so it slopes instead of squaring off; then the muscle forms are softened by a volume-keeping Taubin smoothing over the whole changed region plus a shrinking smoothing on the shoulder cap only, which melts the deltoid knob and fills the notch above it. Checked clean at the shoulder, neck base, tail root and hip in close crops (no ridges, creases or seams added).

| Bare width (fh) | current | A | B | C | sheet (furred) | sheet minus fur (.025) |
|---|---|---|---|---|---|---|
| Shoulders, front | .319 | .295 (-7.5%) | .281 (-11.8%) | .265 (-16.7%) | .296 | .271 |
| Chest, front | .186 | .176 (-5.5%) | .169 (-9.0%) | .162 (-12.7%) | | |
| Waist, front | .143 | .137 (-3.8%) | .133 (-6.4%) | .130 (-9.0%) | .132 | .107 |
| Hips, front | .297 | .283 (-4.5%) | .275 (-7.2%) | .267 (-9.9%) | | |
| Chest depth, side | .137 | .132 (-3.2%) | .130 (-5.1%) | .128 (-6.4%) | .149 | .124 |
| Waist depth, side | .082 | .082 (0) | .082 (+0.6%) | .083 (+1.1%) | .102 | .077 |
| Upper arm | .054 | .049 (-8.2%) | .047 (-13.0%) | .044 (-17.7%) | | |
| Forearm | .038 | .036 (-6.8%) | .034 (-10.7%) | .033 (-14.8%) | | |
| Thigh | .066 | .062 (-5.1%) | .060 (-8.0%) | .058 (-11.1%) | | |
| Calf | .066 | .062 (-4.9%) | .060 (-7.9%) | .058 (-10.8%) | | |
| Shoulder top lowered | | .008 world | .014 | .018 | | |
| Arm moved inward | | .019 world | .029 | .041 | | |

- **A, slightly slimmer and softer:** shoulders 7.5 percent narrower and a little sloped, arms 7 to 8 percent thinner, everything else 4 to 6 percent; light softening. Reads as the same body, a touch leaner.
- **B, moderately:** shoulders 12 percent, arms 11 to 13, trunk and legs 6 to 9; the deltoid knob and the upper-back band are visibly softer.
- **C, close to the sheet:** shoulders 17 percent (now inside the sheet minus fur), arms 15 to 18, legs 11, trunk 9 to 13; the strongest softening, rounded caps and a smooth back.

Pictures: `body-front.png`, `body-back.png`, `body-three-quarter.png`, `body-side.png` (full-body cameras, current and A, B, C side by side), `body-torso-closeups.png`. Numbers: `measurements.json`, `body-A.json`, `body-B.json`, `body-C.json`.

### Friction (reported, not worked around)

1. **The waist.** "Softer" and "bare inside the sheet minus fur" pull against each other at the waist. The sheet's furred front waist is .132 fh; minus the assumed fur margin that is .107, which would make the bare waist 40 percent of the shoulder width (now 45) and pinch it more, the opposite of soft. I kept the waist reduction small in every variant (C's waist .130 is just inside the furred sheet, not inside it minus fur) and did not deepen the side-view waist (it is already thinner than the sheet: .082 against .102). Smallest fix: judge the waist by the furred result once the fur margin is measured (hold audit finding 6), not by the bare target.
2. **Fuller hind legs (I06, Nick 2026-09-28).** C slims the thighs and calves 11 percent; B 8 percent. That may strain "rabbit-like strength". If Nick likes C's trunk, the legs can be held at A's 5 percent without any seam (the leg amount is its own setting).
3. **Hips just reworked.** The hips step from today (P-hips1) is inside the changed region; every variant narrows the hips 4.5 to 10 percent with the same smooth taper. The tail join itself is held.
4. **Forepaw position.** The forepaws keep their shape but move inward with the arm (.019 to .041 world), since the arm hangs from a narrower shoulder.

## Wall time

20:59 to about 21:50 CDT, 2026-10-12.
