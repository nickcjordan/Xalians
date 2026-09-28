# Akinza construction handoff candidate

This is a proposed layer-6 handoff built from the same geometry as the review renders. It does not grant Nick's approval. The preferred first-round sheet remains the appearance target; later tail, gaze and paw directions retain precedence. The editable construction surface is the starting reference for the downstream model, so that its builder does not have to infer the same hidden shapes again from pictures.

## Surface direction

Keep the current gray-only scope. Use the first-round identity sheet for the final coat character and the accepted face/paw studies for their scoped details. Head-clay study-0021 is a proposed explanation of broad coat masses only. Its inward pupils and excessive small locks are excluded.

| Region | Geometry to retain | Later surface treatment |
|---|---|---|
| Ear | Smooth cupped tissue, substantial depth, rooted overlapping broad coat locks and curved tapered ends | Fine hair flows outward across the upper edge and outward/down across the lower edge. No serrated cartilage, ribs, bead rows or uniform sawtooth fringe. |
| Head | Rounded wedge cheeks, shallow paired muzzle, integrated oval eyes, small triangular nose | Short fur lies along the forehead and cheeks. Keep the muzzle, eye outlines and centered pupil positions legible. Fine fur must not enlarge the skull or hide eye integration. |
| Neck and torso | Continuous shoulder/neck transition, slender waist, restrained pelvis | Short laid coat follows each region. Do not use fur volume to replace missing shoulder or pelvic construction. |
| Limbs and paws | Fuller thighs, articulated knee, straight shin, local ankle transition, compact toe cluster and short hooked claws | Shorter coat around articulation and toes. No long fingers, opposed human thumb, ground-level human heel or hidden toe separation. |
| Tails | Three full pointed forms fusing directly with one another at the centered spinal base | Hair follows each tail independently. Preserve the three bodies and pointed taper. No common projecting stalk, extra root lobe or fur bridge that obscures the direct three-way fusion. |

Fine strands, small fur grooves, material roughness detail and any later color design are downstream work. The construction review must stand on the clay geometry. Surface treatment is not permission to conceal a shape mismatch. The candidate has no final UVs, deformation topology, skeleton or animation.

## Files the next builder consumes

The portable candidate bundle contains six actual orthographic gray views, alpha-derived occupancy masks, proposed front feature cutouts, all six camera transforms, projected landmark rows, measured depth and normals, object identity arrays, the editable Blender scene and a GLB. It also includes its source references, interpretation, accepted corrections and exact authoring inputs. Its manifest binds every file by SHA-256 and keeps approval empty.

Depth and normals are measured from the current geometry. Object identity is exact render-object identity, not anatomical segmentation of the fused body. Shoulder, hip and knee landmark locations remain authored construction interpretations; their image rows are exact camera projections. They are not recovered biological measurements.

The front feature mask makes the visible eye whites, nose and mouth white using their own geometry. This is a proposed graphic interpretation and needs Nick's visual review. It is not a literal match to the source's abstract cutouts. Other view masks are pure occupancy.

## Consumer contract

Use the GLB as a geometry reference or the Blender scene for further sculpting. Preserve the supplied coordinate transform, body proportions, attachments and named camera set. Render the imported result from those same cameras and compare it with the provided images before detailing. The GLB export is round-trip checked for triangle count and world bounds; an import does not certify artistic quality or animation readiness.

The existing numeric template builder in `art/creature-motion-comparison/blender/build_species.py` cannot represent the authored ear coat and face surfaces through its existing proportion fields. Do not silently reduce this candidate to those fields and call that a faithful conversion. The bundle's `construction-import.json` selects direct geometry-reference consumption and explicitly records that limitation. Runtime integration and production retopology remain downstream.

## Release and approval

The bundle is a review candidate. Automated checks cover file integrity, camera agreement, unclipped images, alpha/ray occupancy agreement, valid unit normals, depth coverage, feature containment, landmark registration and GLB round-trip integrity. Independent visual review and Nick's approval remain separate. Neither a successful export nor a merged PR approves the creature.

Any geometry edit invalidates the derived render/measurement bundle. Rebuild it from the changed scene rather than patching one view. Preserve the prior run, its review and any approval scope. Only a bundle that Nick approves in his own words can be promoted as approved construction input.
