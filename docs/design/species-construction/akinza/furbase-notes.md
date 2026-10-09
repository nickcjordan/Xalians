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
