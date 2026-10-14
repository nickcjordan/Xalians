# Roster layer: skeleton classes

A skeleton class (`classes/<class>.json`, format `xalians-skeleton-class-v1`) is a list of rig modules with parameters. `blender/rig_modules.py` turns it into a Blender armature. Classes are assembled per species later; `quadruped.json` here is the stand-in used by the walking skeleton.

## Joint naming rule

- `root` is the single top joint, at the ground origin. It never translates in any clip (contract section 4) and carries the `ground` socket tag.
- Every other joint is `<module>_<side>_<nn>` or, for modules on the midline, `<module>_<nn>`. `nn` is two digits counting from the joint nearest the body, starting at `01`.
- `side` is `l` or `r` (the creature's own left and right; left is Blender +X, glTF +X). Paired limbs use a front or hind letter before it: `fl`, `fr`, `hl`, `hr` (`leg_fl_01` is the front left upper leg). More pairs later take `m1l`, `m1r` and so on, counting from the front.
- Module names: `spine`, `neck`, `head`, `jaw`, `leg`, `arm`, `wing`, `tail`, `ear`, `horn`, `socket`. The neck_head module emits `neck_01..nn` and `head_01`.
- Socket joints are `socket_<socket>` (`socket_eye_l`), non-deforming, and carry a custom property `xalians` = `{"socket": "<name>"}` that the glTF exporter writes as node extras (`extras.xalians.socket`). A game resolves sockets by that tag, never by joint name (contract decision 4). `root` carries `{"socket": "ground"}`.
- `horn_01` is a non-deforming attachment joint for a horn or crest mesh; it is not a contract socket.

## Rest pose and space

- Meters. Blender +Z up; the creature faces Blender -Y, which the glTF exporter maps to +Z (contract section 4: Y up, +Z forward).
- Origin at the ground point under the body center; feet touch z = 0.
- Rest pose is standing, legs slightly apart (x = +-0.085 to 0.095 m), head up, tail drooping. Clips are authored as offsets from this pose.
- Built height (top of the mesh at rest) is the size reference (`size.referenceCm`).

## Module parameters (quadruped.json)

| Module | Parameters |
|---|---|
| `root` | `socket` tag |
| `spine` | `count` joints, `from`/`to` points, `arch` (upward bow at the middle, meters) |
| `neck_head` | `neckCount`, `neck` points (count + 1), `head` start and end |
| `jaw`, `horn` | `from`, `to`, `parent` |
| `limb` | `name`, `side`, `points` (joint count + 1), or `mirror` of another side (x negated) |
| `tail` | `count`, `from`, `to`, `droop` (downward sag at the middle) |
| `ear` | `side`, `count`, `points`, or `mirror` |
| `sockets` | `items`: `socket` tag, joint `name`, `parent`, `at` |

`body.radius` holds stand-in body radii (start and end of each module) and is not part of the class contract.
