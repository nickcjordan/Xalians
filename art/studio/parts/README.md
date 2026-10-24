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
| `op` | `"add"` (default), `"carve"` or `"add-after"`; see Carving below |
| `separate` | `true` makes the instance its own closed object (an eyeball), left out of the skin's field entirely; with optional `name`, `mirrorName`, `material`, `shading`, `pivot` and `gaze`. See `art/studio/README.md`, Separate objects |

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
| `closed` | `false` | `true` loops the spine back to the first point (three or more points): a ring or collar, with no seam at the join |

`ratio` is thickness along `up` over width (1 is round). A ratio other than 1 anywhere switches the sweep to an approximate ellipse distance: it builds the same shape but its field is less exact, so keep it for flattened tails and fins and expect slightly more ripple under grazing light.

Where the spine runs along `up` an elliptical cross-section has no defined thickness direction, so there the frame is carried along the curve without twist and blended into the `up` frame as the spine turns away from `up` (a vertical elliptical leg is a smooth ellipse of constant size; it used to leave thin discs). Round sweeps do not use the frame and are unchanged.

```json
{"part": "lid", "kind": "sweep", "op": "add-after", "params": {"closed": true, "points": [{"p": [0.07, -0.17, 0.42], "r": 0.011}, {"p": [0, -0.2, 0.49], "r": 0.009}, {"p": [-0.07, -0.17, 0.42], "r": 0.011}, {"p": [0, -0.2, 0.35], "r": 0.009}]}}
```

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

Curved plate: give `spine` (three or more `[x, y, z]` points) instead of `bend`. The outline is laid along that center line: local v is arclength from the first spine point (the spine is extended straight past both ends so an outline may start before 0 or run past the end, which is how a root sinks into the skull), local u is across. `normal` is the plate's normal at the start and is carried along the curve without twist; `center`, `up`, `bend` and `bendAxis` are ignored; `samples` (default 24) is spine samples per segment. The plate arcs and hangs as one thin sheet with the same rolled rim, with no bridging knob.

```json
{"part": "ear", "kind": "shell", "params": {"spine": [[0.1, 0.03, 0.55], [0.12, 0.03, 0.78], [0.24, 0.03, 0.9], [0.34, 0.03, 0.76], [0.36, 0.03, 0.62]], "normal": [-1, 0, 0], "outline": [[-0.05, -0.04], [0.05, -0.04], [0.04, 0.6], [0, 0.75], [-0.04, 0.6]], "thickness": 0.026, "rimThickness": 0.012}}
```

A shell must overlap or come within its `blend` of another part, or the skin is two components and the build refuses.

## spiral

A tapered horn or tusk with helical ridges (Hypnopet's unicorn horn, 2026-10-23). A straight axis from `base` to `tip`, a core radius `profile` of `[t, r]` pairs from 0 (base) to 1 (tip, the rounding radius), and ridges: the surface radius is `r(t) * (1 + depth * cos(ridges * angle - 2 pi * turns * t - phase))`, faded out over the last tenth so the tip is a clean point. `turns` (default 4.5), `ridges` (default 1: one strand coiled like a soft-serve swirl), `depth` (default 0.16 of the core radius), `handed` (`right` or `left`), `phase` in degrees, `embed` (meters the base continues into the body at the base radius). The distance is the radial gap divided by the ridged radius' gradient norm, about 1 near the surface (checked in the tests), so it meshes cleanly. Method rule (alignment decision 3): precise tubes such as horns are swept, never reconstructed.

## Carving

`"op": "carve"` smoothly subtracts the instance's shape from the union of everything added, with its own `blend` radius (polynomial smooth max of the union and the negated shape). Order of evaluation, whatever the spec order: all `add` instances (spec order), then every `carve` (spec order), then every `"add-after"` instance, which is added on top and is not carved, so an eyeball can sit inside a carved socket. Use it for eye sockets, mouth openings and ear cups. A carve never enlarges the grid. Ownership: the carved wall belongs to the carving instance's part, within half its blend of its shape's surface.

```json
{"part": "socket", "kind": "mass", "op": "carve", "blend": 0.02, "params": {"center": [0, -0.17, 0.42], "radii": [0.06, 0.06, 0.06]}}
```

`art/studio/blockout/examples/blocks-demo.json` uses all four blocks.

## Smooth union and ownership

`smin(a, b, k)` is the polynomial smooth minimum: it equals `min(a, b)` wherever `|a - b| >= k` and rounds the crease where they are closer. It is applied instance by instance in spec order, each with its own `blend` (the polynomial form is not associative, so spec order is part of the shape).

`ownership` gives each point the index of the part with the smallest distance and a weight in [0, 1], `(second smallest - smallest) / blend`, clamped: 1 deep in one part's own territory, 0 on the seam between two parts.
