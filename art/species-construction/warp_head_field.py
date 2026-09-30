"""Round the Akinza head silhouette by a smooth vertex warp (see head_warp.py).

Run with Blender: -b --factory-startup --python warp_head_field.py --
  --scene <head.blend> --out <new-dir>

Every mesh object of the head scene (skin, eyes, lids, mouth, nose) moves by the
same world-frame map, so the small parts stay seated on the skin. The head is
modeled in its own frame and placed at scale .50 with offset (0, -.02, .635), so
vertices are warped in that world frame and mapped back. Nothing is remeshed: the
skin stays one closed connected solid. Akinza-specific.
"""
import argparse
import json
from pathlib import Path
import shutil
import sys

import bpy
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import head_warp
from blender_blockout import mesh_stats, require_single_closed_mesh, sha
from study_provenance import digest, snapshot

parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--head-scale', type=float, default=.50)
parser.add_argument('--head-offset', type=float, nargs=3, default=[0, -.02, .635])
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.scene])
shutil.copyfile(Path(__file__).resolve().parent/'head_warp.py', args.out/'source-snapshot'/'head_warp.py')

bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
skin = max(meshes, key=lambda o: len(o.data.vertices))
require_single_closed_mesh(skin, args.out, 'head skin before head warp')
before = mesh_stats(skin)
offset = np.array(args.head_offset)
moved_total, worst = 0, 0.0
for obj in meshes:
    matrix = np.array(obj.matrix_world)
    inverse = np.array(obj.matrix_world.inverted())
    count = len(obj.data.vertices)
    flat = np.empty(count*3, dtype=np.float32)
    obj.data.vertices.foreach_get('co', flat)
    local = flat.reshape(-1, 3).astype(np.float64)
    world = (local @ matrix[:3, :3].T+matrix[:3, 3])*args.head_scale+offset
    moved = head_warp.warp_points(world)
    shift = np.linalg.norm(moved-world, axis=1)
    moved_total += int((shift > 1e-6).sum())
    worst = max(worst, float(shift.max()))
    back = (moved-offset)/args.head_scale
    new_local = back @ inverse[:3, :3].T+inverse[:3, 3]
    obj.data.vertices.foreach_set('co', new_local.astype(np.float32).ravel())
    obj.data.update()
require_single_closed_mesh(skin, args.out, 'head skin after head warp')
after = mesh_stats(skin)
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
summary = {
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'headWarpSha256': digest(Path(__file__).resolve().parent/'head_warp.py'),
    'scope': 'Head silhouette warp (rear depth of skull and fan, jaw taper); no remesh',
    'depth': head_warp.DEPTH, 'taper': head_warp.TAPER,
    'skinBefore': before, 'skinAfter': after, 'movedVertices': moved_total,
    'maximumShiftWorldUnits': worst,
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']},
}
(args.out/'head-warp.json').write_text(json.dumps(summary, indent=2)+'\n')
print('warp ok', json.dumps({'before': before, 'after': after, 'moved': moved_total}))
