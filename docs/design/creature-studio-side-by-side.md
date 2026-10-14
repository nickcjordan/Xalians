# Creature Studio: hand-built and reconstructed Hypnopet, side by side (experiment X32)

Nick, 2026-10-14, after the rig test (X31): "I'm not sure if I'm ready to move forward with accepting anything. I think we should continue with the experiment side by side."

## Setup

Two tracks carry Hypnopet forward through the same stages. Neither is adopted until Nick picks one.

| Track | Body | Head | Starting build |
|---|---|---|---|
| A, hand-built | authored parts (v5 torso, legs, tail, ears, horn) | the chosen head, B-a5jr | `face-recon6-R1` (B-a5jr) |
| R, reconstructed | the reconstruction's body as one mirrored grid part | the same head | `body-recon-4` |

The head is the same on both, so differences are the body's.

Rules for the comparison:

1. **Same cameras, same light.** One cameras file for both (`C:\dev\art-data\studio\blockout\hypnopet\side-by-side\cameras.json`).
2. **Same defect list.** Every defect is checked on both tracks and fixed on each in that track's own way. Track A edits authored parts. Track R changes only whole regions (cuts, softening, input views) and never edits the reconstruction's details (X30 rule).
3. **Same measures.** For each track and stage: rounds, minutes and tokens; outline fit against the sheet's bare views; the rig and pose test (X31) when the body changes much; and Nick's look at the review points.
4. **The surface, color and readiness stages are built once and run on both,** so Nick can judge each track close to its final look.

## Open defects by track (start)

| Defect | Track A | Track R |
|---|---|---|
| D-fm64 hind feet: no heel or toes, plain shank join | open | not present: heel, hock and three toes come from the sheet |
| Plate rim around the feet (from the drawn ground shadow) | not present | open |
| D-tsgu ears stick out sideways from above instead of arcing over the crown | closed in round 2: the sheet's top view spreads them too | same |
| D-bg6z head dog-like, D-nxnn eyes without sockets | shared head; sockets fixed by the reconstruction head | same |

## Round 1 (2026-10-14)

- **R, feet.** `grid_soften.py --below 0.018,0.012,0.0025` blurs the grid only in the bottom 18 mm and fades it out over the next 12 mm, which rounds off the jagged edge the plate cut left. Result: `body-recon-5`. One round, a few minutes. The rim is gone in the side view (`creature-studio-side-by-side/round1-r-soles.jpg`), and the toes keep their shape.
- **A, hind legs (D-fm64).** Hand-authored haunch, a hip-knee-hock-heel sweep, a long foot pad and three toes, placed by eye from the sheet's bare side view, with side slices of the reconstruction as a measuring reference. Round 1 read thin: a small haunch, a skinny leg and tiny toes. Round 2 (`authored-hind-2`) has a full haunch, a thicker leg, a taller foot and bigger toes. It now has a hock, a raised heel and toes. The foot is still slimmer and lower than the sheet's, and moving the haunch forward uncovered more of the tail, which now reads as a dog's tail rather than the sheet's nub. Two rounds, about 20 minutes.
- **Outline fit** against the sheet's bare views (IoU, front / side / back): A before 0.83 / 0.80 / 0.81; A round 2 0.81 / 0.79 / 0.78; R 0.86 / 0.75 / 0.72. Track A's new legs read closer to the sheet's structure but score slightly lower, because the foot is thinner than the sheet's (`round1-fit-side.jpg`). The outline is a check, not a gate.

## Round 2 (2026-10-14)

- **D-tsgu (ears stick out sideways from above) checked against the sheet's top view** (`turnaround-v2.png`, the fifth view): the sheet's ears also spread sideways from above as broad leaves. Both tracks match it. Closed for both tracks; it was written against the v1 ears.
- **A, tail and foot (round 3, `authored-hind-3`).** The tail is shortened to a stub; the sheet's bare views have a small nub, and its round tuft is fur. The foot and toes are larger and taller, and the heel is thicker. Outline fit 0.81 / 0.80 / 0.78.
- **A, forepaw toes (round 4, `authored-4`).** Track A's forepaws were plain balls (track R's have toes). Three toe masses per forepaw give soft bumps.
- **A, toe creases (rounds 5 to 7, rejected).** Thin carved slits read as black slashes from the front (round 5); wider slits still read as slots (round 6); shallow grooves over the paw read as pig nostrils (round 7). All three are dropped; track A keeps round 4's bumps (`round2-paws.jpg`). Fur will cover most of this, but the clay shows that authored masses do not easily make the sheet's toe creases, which the reconstruction has from the start.
- **Rig test on both current bodies (X31 method).** Track A's joints are the new leg sweep's own control points, read off the spec with no measuring, which shows the authored track's advantage. Track R uses the joints placed in X31. Extreme pose: A crushed 1.06% and stretched 0.12%; R crushed 0.31% and stretched 0%. In the look pose, A's thin ear plate stretches (0.26%), because the haunch moved forward under the hanging ear and automatic weights now tie the ear's lower edge to the body. Weight bleed: A 9.6%, R 3.9% (`round2-rig.jpg`).

**Track A cost so far:** 7 rounds (3 kept for the hind legs and tail, 1 for the forepaws, 3 rejected for creases), about an hour. **Track R:** 1 round, a few minutes.

**Body comparison at the end of round 2** (`round2-bodies.jpg`): A `authored-4`, R `body-recon-5`. Outline fit A 0.81 / 0.80 / 0.78, R 0.86 / 0.75 / 0.72.

Next: the surface stage (fur by region, glTF-safe for live 3D in mobile browsers), built once and run on both tracks, then color.
