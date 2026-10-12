# Parts

Authored, parametric parts as signed distance functions (negative inside), pure numpy so they import inside Blender's Python and are testable outside it. A part kind is a module with `sdf(params, pts)` for an (N,3) array and `bounds(params)` for the solid's box. `Instance` (in `__init__.py`) wraps one entry of a blockout spec and adds mirroring and the blend radius.

Convention: the creature faces -y, its left is +x, up is +z (the same as `cameras/akinza.json`). Units are the spec's world units. Every instance has:

| field | meaning |
|---|---|
| `part` | the part key. Instances with the same key (for example the two sides of a mirrored leg, or several instances you want to measure as one part) share one `part_id` |
| `kind` | `mass`, `sweep` or `shell` |
| `params` | the kind's parameters, below |
| `mirror` | `"x"` adds the copy reflected through the plane x = 0; `null` for none |
| `blend` | smooth union radius (default 0.03). Where this part meets another closer than `blend` the two fields blend; farther apart they are untouched. The part being added uses its own value |

## mass

A superellipsoid: `|x/rx|^n + |y/ry|^n + |z/rz|^n = 1`.

| param | default | meaning |
|---|---|---|
| `center` | `[0,0,0]` | world position |
| `radii` | `[0.1,0.1,0.1]` | semi-axes along the local x, y, z |
| `exponent` | `2` | 2 is an ellipsoid; larger is boxier (1.5 to 12) |
| `rotation` | `[0,0,0]` | Blender XYZ Euler angles in degrees (R = Rz Ry Rx) |

```json
{"part": "torso", "kind": "mass", "params": {"center": [0, 0.02, 0.95], "radii": [0.2, 0.3, 0.24], "exponent": 2.4, "rotation": [12, 0, 0]}}
```

## sweep

A smooth tube through control points. The spine is a centripetal Catmull-Rom curve through the points (no overshoot or loops, ends extrapolated); the radius is a monotone cubic (PCHIP) through the control radii, so a control list that tapers gives a profile that tapers and never swells or overshoots. The tube is a chain of exact round cones (hulls of consecutive spheres), whose envelope is smooth at every sample. Ends are round, with the end control's radius.

| param | default | meaning |
|---|---|---|
| `points` | required, 2 or more | each `{"p": [x,y,z], "r": radius, "ratio": 1.0}` or `[x, y, z, r]` / `[x, y, z, r, ratio]` |
| `samples` | `14` | spine samples per control segment |
| `up` | `[0,0,1]` | only used with `ratio`: the cross-section's thickness direction |

`ratio` is thickness along `up` over width (1 is round). A ratio other than 1 anywhere switches the sweep to an approximate ellipse distance: it builds the same shape but its field is less exact, so keep it for flattened tails and fins and expect slightly more ripple under grazing light.

Taper over several controls. A radius that collapses over one short segment ends in a blunt nub; give the last three or four controls steadily smaller radii (for example 0.034, 0.026, 0.018, 0.010) so the tip draws to a point.

```json
{"part": "tail", "kind": "sweep", "params": {"points": [{"p": [0, 0.26, 1.0], "r": 0.11}, {"p": [0, 0.55, 1.04], "r": 0.082}, {"p": [0, 0.85, 1.0], "r": 0.055}, {"p": [0, 1.15, 0.9], "r": 0.034}, {"p": [0, 1.40, 0.78], "r": 0.018}]}}
```

## shell

A thin curved plate for ears, wing membranes and fins.

| param | default | meaning |
|---|---|---|
| `center` | `[0,0,0]` | world position of the plate's local origin |
| `normal` | `[0,1,0]` | the plate's normal (local w) |
| `up` | `[0,0,1]` | hint for the plate's local v axis (made perpendicular to `normal`); local u is `v x normal`, so with normal +x and up +z, u points +y |
| `outline` | a 0.2 square | closed polygon `[[u,v], ...]` in the local frame |
| `smooth` | `2` | Chaikin corner-cutting passes on the outline (each pass doubles the points and rounds the corners) |
| `thickness` | `0.02` | full thickness in the interior |
| `rimThickness` | `0.008` | full thickness at the rim; the rim is rounded. Keep it at least 2 voxels or the meshed rim can open |
| `rimWidth` | `0.04` | how far in from the rim the plate takes to reach full thickness (smoothstep profile) |
| `bend` | `0` | curvature: the mid surface is offset along the normal by `bend * s^2 / 2`, s measured from the center along `bendAxis` |
| `bendAxis` | `"u"` | `"u"` or `"v"` |

```json
{"part": "wing", "kind": "shell", "mirror": "x", "params": {"center": [0.19, 0.12, 1.15], "normal": [1, 0, 0.18], "up": [0, 0, 1], "outline": [[-0.12, 0.02], [0, 0.2], [0.26, 0.3], [0.46, 0.16], [0.36, -0.14], [0.14, -0.34], [-0.1, -0.22]], "smooth": 3, "thickness": 0.04, "rimThickness": 0.014, "rimWidth": 0.07, "bend": 1.2}}
```

A shell must overlap or come within its `blend` of another part, or the skin is two components and the build refuses.

## Smooth union and ownership

`smin(a, b, k)` is the polynomial smooth minimum: it equals `min(a, b)` wherever `|a - b| >= k` and rounds the crease where they are closer. It is applied instance by instance in spec order, each with its own `blend` (the polynomial form is not associative, so spec order is part of the shape).

`ownership` gives each point the index of the part with the smallest distance and a weight in [0, 1], `(second smallest - smallest) / blend`, clamped: 1 deep in one part's own territory, 0 on the seam between two parts.
