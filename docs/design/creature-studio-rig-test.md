# Creature Studio: rig and pose test of an authored body against a reconstructed one (experiment X31)

Nick, 2026-10-14, after asking whether hand-built shapes make animation easier than the reconstruction: "Yes. Run that experiment and make sure to document your results throughout."

The question: does a body taken from the image-to-3D reconstruction (body-recon-4, experiment X30) make rigging and animation harder than the hand-built blockout (v5)? My prediction before the test: no, because both need the same retopology, skeleton and skin weights; the reconstruction would cost a few named fixes (fused parts, baked expression, no joint hints), and the authored blockout's joints and regions could be copied onto it.

## Method

Tools: `art/studio/readiness/rig_test.py` (runs in Blender), `art/studio/readiness/rig_sheet.py` (comparison sheets), `art/studio/blockout/hypnopet/skeleton.py` (the test skeleton and poses). Outputs: `C:\dev\art-data\studio\readiness\hypnopet\x31\`. Evidence images: `creature-studio-rig-test/`.

1. **Same surface treatment.** Both skins are remeshed the same way (Blender voxel remesh at 4 mm, about 83,000 and 90,000 quads). Quadriflow was planned but Blender 5.2 refused both skins with its "must be manifold with consistent normals" check, although an edge-by-edge check found both closed, manifold and consistently wound; it accepts test spheres. The cause was not found, so the tool falls back to the voxel remesh and records which one it used. Neither body got artist edge loops at the joints, so this tests the shapes, not hand topology.
2. **Same skeleton.** A quadruped skeleton of 31 bones: spine, neck, head, jaw, hip to knee to hock to heel to foot to toes, shoulder to elbow to wrist to paw, a three-bone tail, three bones per ear, and the eyes parented rigidly to the head. Joint positions come from the authored blockout's sweep points. Limb joints are then moved to the centroid of the skin's cross-section at that point (a flood fill inside the skin, so a neighboring part in the same slice is not counted).
3. **Weights.** Blender's automatic (heat) weights, the standard first pass a rigger starts from.
4. **Four fixed poses.** Stride (one hind leg forward, one back, a foreleg reaching), crouch (both hind legs folded, the body lowered, tail down), look (head turned and raised, jaw open, ears swung, a forepaw raised) and extreme (a knee folded 110 degrees, an elbow 120 degrees, the neck turned 50 degrees, the tail swung 75 degrees).
5. **Measures per pose.** The share of surface crushed (a face shrinks below a quarter of its rest area) or stretched (grows past four times). New self-intersections: pairs of faces that pass through each other in the pose but not at rest. A face pair counts once, and the count includes an ear swinging through a leg, which is a pose collision rather than a skinning failure. Weight bleed: vertices carrying more than 0.1 weight from two limbs at once.

## Arms

| Arm | Body | Joints | Weights |
|---|---|---|---|
| A | authored v5 blockout | authored joint points | automatic |
| B0 | reconstruction | authored joint points (snapped) | automatic |
| B | reconstruction | hind legs and ears placed by hand on it | automatic |
| C | reconstruction | as B | copied from A by nearest face |

## Log

- **Run 1.** The first renders were black-backed and the bone overlay unreadable. The skeleton showed the first real finding: the joint snap pulled the reconstruction's hind leg and ear bones out of their limbs (`joints-side.jpg`, middle). The fix was a cross-section flood fill instead of a radius cut, transparent renders composited on white, a separate bone pass, and a deeper crouch.
- **Joint transfer fails on the reconstruction.** Even with the better snap, the authored joints do not fit the reconstructed body. Its haunch sits about 4 cm further forward and is larger. Its shin drops nearly straight to a hock at the back. Its ears hang almost straight down (principal axis 0.97 vertical) where the authored ears sweep back (0.91), and they are cupped, about 5 cm deep against 2 cm. The snap moved the hind joints 40 to 95 mm. I placed the reconstruction's hind leg and ear joints by hand from side slices (`skeleton.py` `RECON4`), about 20 minutes of work with the slice plots. That is the "no joint hints" cost, measured.
- **Arms A, B0, B, C run.** Each Blender run takes under a minute.

## Results

| Arm | Stride crushed / new intersections | Crouch | Look | Extreme | Weight bleed |
|---|---|---|---|---|---|
| A authored | 0.00% / 0 | 0.00% / 0 | 0.04% / 302 | 0.41% / 1,057 | 9.2% of vertices |
| B0 recon, authored joints | 0.00% / 2 | 0.41% / 61 | 0.12% / 1 | 0.54% / 821 | 3.7% |
| B recon, its own joints | 0.00% / 2 | 0.10% / 82 | 0.12% / 1 | 0.31% / 1,155 | 3.9% |
| C recon, copied weights | 0.03% (+0.22% stretched) / 114 | 0.25% (+0.19%) / 430 | 0.03% (+0.57%) / 1,035 | 0.32% (+0.62%) / 2,784 | 7.4% |

Nothing stretched past four times except in arm C.

What the numbers and pictures say (`poses-threequarter.jpg`, `extreme-side.jpg`):

1. **The reconstruction deforms as well as the authored body.** In every pose, B's crushed share is within a few tenths of a percent of A's, and below it in the extreme pose. Both show the same small crush spots, at the inside of the folded knee and elbow. Intersections are of the same order. In the look pose, A's thin ear plate swings through its body and leg (302 pairs), while B's thicker ear clears it (1). In the extreme pose, the knee fold and the ear collision dominate both.
2. **Automatic weights bleed less on the reconstruction** (3.9% against 9.2% of vertices weighted to two limbs). The authored body's tall haunch mass sits between the tail and both hind legs, and its legs meet under the belly, so heat weighting spreads across them (`bleed-side.jpg`).
3. **Copying weights from the authored body fails** (arm C). Where the two bodies differ (the ears, the haunch, the hind legs), nearest-face copying gives faces to the wrong bones. Faces tear and stretch: 0.6% of the surface past four times, and 2.5 times A's intersections in the extreme pose (`copied-weights.jpg`). My proposed "best of both", copying regions and joints from the authored blockout, does not work. The reconstruction needs its own joints and its own weights.
4. **Joints are the real extra cost.** The authored blockout carries its joints; the reconstruction needed them placed (about 20 minutes here, by slices). A pipeline step can do that: place joints by measuring the reconstruction's limbs, then review them on a bone render like `joints-side.jpg`.
5. **Fused parts did not show up as a problem in these poses.** The ears lifted cleanly off the cheeks and shoulders, and the forelegs separated from the chest. The toes are one mass on both bodies (neither has toe bones). The mouth is open at rest on the reconstruction, so the jaw opens from an open mouth (look and extreme poses). A closed rest mouth still needs a neutral-expression head, as X30 already says.

## Verdict

My prediction was half right. The reconstruction is not harder to deform: with its own joints and automatic weights, it matched or beat the authored body on every measure. The cheap shortcut I proposed, copying joints and weights from the authored blockout, failed and should not be used. The pipeline change: the readiness stage places joints on the final body itself (measured, then reviewed on a bone render), never inherits them from an earlier blockout.

Limits: no artist retopology (edge loops would improve both bodies equally); automatic weights only; four poses on one creature; intersection counts include pose collisions as well as skinning faults.
