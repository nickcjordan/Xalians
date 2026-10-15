# Pass 2 (build B-jas4): paws as swept-tube digits, after audit N-a4z4

This addendum replaces the method section of BRIEF.md. Scope, inputs, holds, conventions, self-review and deliverables stay as BRIEF.md says, with build id B-jas4 and output folder C:\dev\art-data\pipeline\codex-stream\luceras-paws\pass2\.

## Why

Three paw methods have now fallen short. Brushing the existing slab gave thin pads (hind pass 2) and then boxes (hind pass 3). Reconstruction of the small paw crops (your pass 1) gave a flange at the graft, a bag heel and rail toes with invented nail sleeves; you held it yourself, correctly. On this creature the method that has matched the clay first time for precise organic tubes is the swept tube with a measured radius profile: the tail (passed on its first pass) and the horns. A digit is such a tube.

## Method

Start from the merged file again (C:\dev\art-data\pipeline\codex-stream\luceras-merge\merged.blend), whose hind paws are the pass 3 paws and whose fore paws are the original blockout paws.

1. Measure each digit from the clay paw crops (hind: paw_side_clay_crop.png and paw_front_three_quarter_clay_crop.png in C:\dev\art-data\pipeline\codex-stream\luceras-hindlegs\pass2\references\; fore: your own crops from pass 1 in pass1\references\). For one hind digit and one fore digit write down, as fractions of paw length: the centerline (it rises from the pad, arches over two knuckles and dips to the tip), the radius at the root, at each knuckle (local maxima), between knuckles (local minima) and at the tip, and the digit's spread angle from the paw axis. Put the numbers in iter_notes.json before building.
2. Build each digit as a swept tube along its centerline with that radius profile (use `sculptkit.sweep` as the horns and the tail did, with a slightly flattened cross-section, wider than tall near the pad, and a rounded cap at the tip). Four digits per paw, the middle two longest, spread as measured, side by side with only a few millimeters between them so the clefts read as dark lines.
3. Build the pad mass the digits grow from (the metatarsal pad on the hind paw, the metacarpal pad on the fore paw) as one more swept tube or a lofted section continuing the leg's lower line, so the top line runs in one slope from the leg down over the digits with no corner and no flange.
4. Join the digits and pad by a local voxel remesh (paw region only, fine voxel, about 1.5 mm), smooth lightly (Taubin, a few passes, no shrinking), cut the current paw below 65 mm, and graft the new paw on with the bridged seam as before. Skin weights by nearest surface from the base, at most 4 influences. Mirror left to right.
5. Seat the dark claws on the digit tips (keep the current hind claws; make the fore claws the same way, a little shorter), and the two dewclaws on the back of the fore wrists as the clay front view shows. No nail sleeves: the claw grows straight out of the rounded digit tip.

## Bar for this pass

At the paw cameras at 1024 px, beside the clay: four rounded digits with two knuckle bumps each, tight dark clefts, one continuous top slope from the leg over the digits, a clean heel with no bag and no flange, claws growing from the tips. Knuckle height and digit width within 15 percent of the clay fractions you measured. Fix by changing the profile numbers and rebuilding, not by brushing on top.

Use the slot lock with owner "codex B-jas4 paws". Cap 50 minutes. When done, print the path of report.json and stop.
