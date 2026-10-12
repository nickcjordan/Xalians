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
- `packet_render.py` runs inside Blender through `loop_tools.py blender`, so the slot lock applies. It gives the skin a neutral clay and keeps the eye, iris, nose, mouth, claw and inner-ear materials. The light rig is fixed in world space. CPU Cycles, seed 0, 48 samples: two runs give the same pixels (PNG bytes can differ by metadata; the pixels do not).
- Baseline renders are cached in `C:\dev\art-data\studio\packet-cache\<sha256 of the baseline blend>\` and reused while the cameras file and renderer are unchanged.
- Per camera: `<id>.png`, and with a baseline `<id>.baseline.png`, `<id>.compare.png` (before and after, labeled) and `<id>.diff.png`. In the diff, pale gray is unchanged (a change is a per-channel difference above 3 of 255) and changed pixels run along a blue (small) to amber (48 of 255 or more) ramp, with a text legend. `changedFraction` is changed pixels over the pixels covered by the figure in either render.
- With head directories: `heat.png` is the skin displacement of the head (gray is exactly zero, blue to amber by size, legend with max, median of moved and moved count). Same vertex count means vertex-to-vertex displacement; otherwise nearest vertex (scipy KD-tree, numpy chunks if scipy is missing). `perZone` is the largest displacement among head vertices inside each species zone (zones of `species.json`, placed as the assembly places the head). Units are head units.
- `packet.json` summarizes the packet; `raw/` keeps the transparent candidate renders.
- Timing on the dev PC for Akinza: about 1.2 minutes with a cold baseline cache, about 0.5 minutes with a warm one.

## Blockout framework

Authored, parametric parts assembled into one closed body for any creature. Part kinds and their parameters: `parts/README.md`.

```
python art/species-construction/loop/loop_tools.py --species akinza blender --log blockout \
    art/studio/blockout.py -- --spec art/studio/blockout/examples/biped-test.json --out <dir>
python art/studio/cameras_auto.py --build <dir> --out <cameras.json> --close tail --close head
python art/studio/packet.py --assembly <dir> [--baseline <older dir> --part tail] --cameras <cameras.json> --out <packet dir>
```

- `blockout.py` writes `blockout.blend`, `blockout.glb`, `blockout.npz` and `record.json` (spec sha256, counts, components, non-manifold edges, bounds, minutes). It refuses, exit status 2, unless the skin is one closed manifold component. The skin carries a per-vertex `part_id` (index into `record.json` `partKeys`) and `part_weight`; after meshing every vertex is projected onto the analytic surface, which removes the voxel ripple a grid mesher leaves.
- The grid is snapped to the world lattice, so rebuilding after changing one part samples every other part at identical points; the surface away from the change comes out the same.
- `--species akinza` on `loop_tools.py` only selects the config that owns the Blender slot lock and the log folder; it does not touch Akinza data.
- `cameras_auto.py` builds the standard eight whole-figure cameras from the blockout's bounds (one fixed scale; `--freeze-from` keeps an earlier file's frame) and close views framed on any `--close <part key>`. The light rig is the Akinza one scaled to the figure.
- `packet.py --part <key>` compares two blockouts: displacement inside versus outside that part (max, median, median of moved) in `packet.json` under `displacement.part`, and `part-heat.png`. Topology differs between builds, so each vertex is measured to the nearest vertex of the other build, in both directions; a vertex counts as inside the part when its own build assigns it to the part.
- Tests: `python -m unittest discover -s art/studio/tests -v` (numpy only; CI runs them).
