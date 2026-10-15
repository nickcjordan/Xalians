# Akinza fur step 12d review

Scope: the original brief plus the body-wide artifact addendum. Current surface is `fur-steps/s12d/surface.blend`, built from 12b2. Three saved builds and one rejected pre-save cull invocation; four of six allowed invocations. No user approval is claimed.

The R11 tail box reached the rear arm through its blend margin. Worst arm clusters at approximately (0.261, -0.006, 0.181) and (0.298, 0.008, 0.100) had median tail weights .484 and .500, with hair paths reaching .117 to .120 world units. Existing `tails.cut` now excludes all 6,143 contaminated arm roots before group normalization while retaining full weight on every connected true-tail vertex. The saved coat is patched locally so all skin, stripe and material inputs stay unchanged.

Actual strand measurements (world units; model height 1.8605):

| Region | Median reach before / now | 95th-percentile reach before / now | Median lift before / now |
| --- | --- | --- | --- |
| chest | 0.02754 / 0.01617 | 0.07302 / 0.02009 | 9.80 / 1.18 degrees |
| rib-flank | 0.01779 / 0.01297 | 0.06356 / 0.01732 | 6.01 / 1.93 degrees |
| inner-arm | 0.01878 / 0.01001 | 0.09383 / 0.01199 | 6.53 / 3.14 degrees |
| outer-upper-arm-control | 0.01655 / 0.01528 | 0.07755 / 0.02412 | 2.18 / 2.42 degrees |

Every actual curve and all 3,351,848 centerline segments were tested. The skin test combines segment intersections with signed endpoint/midpoint distance, using .0006 as the penetration flag threshold. Neighbor length uses 24 nearby same-region, similarly oriented roots within .014 and a 2.2 ratio with .022 minimum length. Lift uses local same-region median clearance and a .006 body floor. Spatial part-transfer labels are diagnostics, not rig bones.

Skin flags before / now:

| Region | Skin collision | Neighbor length | Regional length | Part transfer | Lift |
| --- | --- | --- | --- | --- | --- |
| chest-ribs | 13514 / 0 | 14 / 0 | 20751 / 0 | 344 / 0 | 237 / 0 |
| neck | 1532 / 0 | 0 / 0 | 7 / 0 | 3 / 0 | 15 / 0 |
| head | 3826 / 0 | 31 / 31 | 1965 / 2103 | 1694 / 1700 | 16 / 16 |
| ears | 7408 / 0 | 172 / 176 | 0 / 0 | 20 / 20 | 94 / 95 |
| arms | 9255 / 0 | 2 / 0 | 5692 / 0 | 19 / 0 | 83 / 1 |
| hands | 871 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| hips | 3875 / 0 | 1 / 0 | 671 / 0 | 380 / 0 | 113 / 0 |
| legs | 1566 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 350 / 0 |
| feet | 2417 / 0 | 0 / 0 | 207 / 0 | 0 / 0 | 71 / 0 |
| tails | 43 / 0 | 0 / 0 | 0 / 0 | 155 / 155 | 1 / 1 |

The retained head/ear/tail length and transfer flags include intentional plume overhangs across spatial bins. They are visible in the red diagnostic overlay and are not a license to shorten held plumes. The single isolated arm lift advisory has improved actual arc length .03190 to .02096 and clearance .01413 to .006615; no visible spike appears there in the native-size underarm view. Full per-region worst-cluster root locations and all thresholds are retained in `fur-12d-metrics.json`.

Builder and independent `/root/review_12d` inspected all three chest pairs, the worst-spot crop, body front/back, held head side, ear front and sole at native size. The rear-arm curtain, rib shelf and bristled armpit bridge are visibly removed. Fur now lies down and outward in short independent wavy strands. No replacement spikes, bald patch or abrupt chest-mask seam was found. Held blue cup/base tuft, head/cheek flow, muzzle/nose edge, pad/groove/perimeter appearance and long-tail volume remain visually consistent. Saved-file hashes additionally verify every mesh attribute/topology, material node graph/link/socket data, fur transform, roots and all unselected curve attributes. All 48,797 noncolliding true-tail curves remain bit-identical; only 43 true-tail collision paths were repaired.

Still off: the inherited fluffy lower-back/tail-root mound transitions abruptly into the shorter waist coat; long-tail flyaways and small pointed sole-fringe hairs are also baseline appearances held by this step. Tail volume belongs to later tail work.

Solid-object validation: nearest-normal signs falsely flagged nose/toe points. A single BVH parity direction then falsely flagged three eye candidates. The guarded fourth invocation rejected culling before any save. Both globes have coherent closed triangle orientation and interior winding 1; every suspect root/control point/midpoint has double-precision winding within +/-7.1e-17, independently reproduced within +/-2.7e-16. Current build 3 remains unchanged. The exhaustive closed-object sweep now completes with 0 ray-crossing strands and 0 strands inside over threshold. All obstacle meshes have coherent triangle orientation. No additional model edit was needed.
