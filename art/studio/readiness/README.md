# Readiness tools

## Rig test (experiment X31)

```
python art/studio/blockout/hypnopet/skeleton.py --out <skeleton.json> [--fit recon4]
python art/studio/runner.py blender --log rig-test art/studio/readiness/rig_test.py -- \
    --build <blockout build dir> --skeleton <skeleton.json> --out <dir> [--retopo <cache.npz>] [--weights-from <other out dir>]
python art/studio/readiness/rig_sheet.py --arms <out dir> [<out dir> ...] --kind clay|distort|bones|bleed --view side|threequarter|front --out <sheet.jpg>
```

- Skeleton file: `bones` (name, head, tail, parent, chain, mirror, snap, connect; left side at +x, `mirror` adds the right copy with `_L`/`_R` names), `separate` (separate object name to the bone it rides on), `poses` (name to a list of `[bone, axis, degrees]` about world axes at the bone's posed head, or `[bone, 'move', [dx, dy, dz]]`). A joint with `snap: {"tail": r}` moves to the centroid of the skin's cross-section there.
- The skeleton must fit the body it rigs. X31 found that joints and weights copied from an earlier blockout do not fit a reconstructed body; place the joints on the final body and check them on the `bones` sheet.
- Retopology: Quadriflow first, voxel remesh (`--voxel`, default 4 mm) when Blender refuses the skin; `metrics.json` records which.
- `metrics.json`: per pose crushed and stretched share of the surface, new self-intersecting face pairs (pose collisions count too), where they sit by limb; joint snap distances and depth; weight bleed between limbs.
