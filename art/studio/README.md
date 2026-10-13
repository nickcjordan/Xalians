# Creature Studio tools

## Packet

The packet is the standard set of review images and comparisons for one build.

```
python art/studio/packet.py --assembly assembled-3141 --baseline assembled-3101 \
    --cameras art/studio/cameras/akinza.json --out <dir> \
    --component head --head head-3140 --baseline-head head-3100
```

Directory names resolve under `untracked/species-construction/<species>` (create the junction to `C:\dev\art-data\species-construction\akinza` first, as `art/species-construction/PORT.md` describes) or may be full paths. `--baseline`, and the head options, are optional.

- `cameras/akinza.json` holds the standard cameras (8 whole figure, 6 head close), the clay and light settings, and the left/right convention (left and right are the creature's own side; its left is world +X). Camera, light and render settings live there, not in code.
- `packet_render.py` runs inside Blender through `runner.py blender` (or `loop_tools.py blender` when the cameras file names `lockSpecies`), so the slot lock applies. It gives the skin a neutral clay and keeps the eye, iris, nose, mouth, claw and inner-ear materials. The light rig is fixed in world space. CPU Cycles, seed 0, 48 samples: two runs give the same pixels (PNG bytes can differ by metadata; the pixels do not).
- Baseline renders are cached in `C:\dev\art-data\studio\packet-cache\<sha256 of the baseline blend>\` and reused while the cameras file and renderer are unchanged.
- Per camera: `<id>.png`, and with a baseline `<id>.baseline.png`, `<id>.compare.png` (before and after, labeled) and `<id>.diff.png`. In the diff, pale gray is unchanged (a change is a per-channel difference above 3 of 255) and changed pixels run along a blue (small) to amber (48 of 255 or more) ramp, with a text legend. `changedFraction` is changed pixels over the pixels covered by the figure in either render.
- With head directories: `heat.png` is the skin displacement of the head (gray is exactly zero, blue to amber by size, legend with max, median of moved and moved count). Same vertex count means vertex-to-vertex displacement; otherwise nearest vertex (scipy KD-tree, numpy chunks if scipy is missing). `perZone` is the largest displacement among head vertices inside each species zone (zones of `species.json`, placed as the assembly places the head). Units are head units.
- Part-only previews (X26): `--cameras-only front,side-left` renders just those camera ids (an unknown id is an error and `packet.json` lists only the requested ones, under `camerasOnly`); `--quick` renders at `--quick-samples` (default 12) Cycles samples with denoising on and is recorded in `packet.json` as `quick`; `--no-baseline` skips the baseline renders and every comparison even when `--baseline` is given (`--part` needs a baseline, so it is refused with it). Quick baselines are cached apart from full ones, so a quick run never poisons the cache. Use these for option previews of one part; render the full default packet only for the chosen build. `sprite_check.py` is unchanged and still runs on any packet view.
- `packet.json` summarizes the packet; `raw/` keeps the transparent candidate renders.
- Timing on the dev PC for Akinza: about 1.2 minutes with a cold baseline cache, about 0.5 minutes with a warm one.

## Blockout framework

Authored, parametric parts assembled into one closed body for any creature. Part kinds and their parameters: `parts/README.md`.

```
python art/studio/runner.py blender --log blockout \
    art/studio/blockout.py -- --spec art/studio/blockout/examples/biped-test.json --out <dir>
python art/studio/cameras_auto.py --build <dir> --out <cameras.json> --close tail --close head
python art/studio/packet.py --assembly <dir> [--baseline <older dir> --part tail] --cameras <cameras.json> --out <packet dir>
```

- `blockout.py` writes `blockout.blend`, `blockout.glb`, `blockout.npz` and `record.json` (spec sha256, counts, components, non-manifold edges, bounds, minutes). It refuses, exit status 2, unless the skin is one closed manifold component and every separate object is one closed manifold component.
- Separate objects: an instance with `"separate": true` (eyeballs, anything a rig must move on its own under the skin) is not unioned into the skin. It is meshed alone as its own closed object at the same world position, with its origin at its `pivot` (default the mass center), so a rig can rotate it in place. Optional fields: `"name"` (default `<part>-<n>`), `"mirrorName"` for the reflected copy of a mirrored instance (default the name plus `-mirror`), `"material"` (a material tag, below), `"shading"` (numbers that tag's review shader reads), `"pivot"` and `"gaze"` (world space; the reflection's are reflected). The object carries `material`, `part`, `pivot`, `gaze` and `shading` as custom properties (glTF extras in the glb). Carves apply to the skin only; `part_keys`, `part_id` and `blockout.npz` cover the skin alone; `record.json` lists the objects under `separate`.
- Material tags: `packet_render.py` gives an object with a `material` custom property the studio material for that tag, in every packet view and so in the sprite check. `eye` is a cartoon eye built procedurally from the object's local coordinates and its gaze (no UVs): by angle from the gaze, a near-black pupil, a warm amber iris (deep brown at the top to amber at the bottom, the Hypnopet sheet's eyes), a thin dark rim, and dark brown past it, so no white sclera shows, under a clear coat of very low roughness that gives a real catch light from the key lamp. `shading` sets `pupilDeg`, `irisDeg` (where the rim starts) and `rimDeg` (defaults 30, 58, 66). An empty or unknown tag gets the clay; the skin keeps the clay. The skin carries a per-vertex `part_id` (index into `record.json` `partKeys`) and `part_weight`; after meshing every vertex is projected onto the analytic surface, which removes the voxel ripple a grid mesher leaves.
- The grid is snapped to the world lattice, so rebuilding after changing one part samples every other part at identical points; the surface away from the change comes out the same.
- `runner.py` is the studio's own Blender runner (settings in `runner.json`: Blender from `XALIANS_BLENDER` or the default install, at most three processes by free memory, slot locks in `C:/dev/art-data/studio/blender/slots`, logs in `.../logs`). It needs no species config and no junction into the Akinza data folder. A cameras file that still names `lockSpecies` keeps the old `loop_tools.py` path.
- `cameras_auto.py` builds the standard eight whole-figure cameras from the blockout's bounds (one fixed scale; `--freeze-from` keeps an earlier file's frame) and close views framed on any `--close <part key>`. The light rig is the Akinza one scaled to the figure.
- `packet.py --part <key>` compares two blockouts: displacement inside versus outside that part (max, median, median of moved) in `packet.json` under `displacement.part`, and `part-heat.png`. Topology differs between builds, so each vertex is measured to the nearest vertex of the other build, in both directions; a vertex counts as inside the part when its own build assigns it to the part.
- `sprite_check.py` scales one packet view to game sprite height (default 192 pixels), so it shows the packet's materials, eyes included.
- Tests: `python -m unittest discover -s art/studio/tests -v` (numpy only; CI runs them).
