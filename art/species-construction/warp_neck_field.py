"""Narrow the Akinza neck and shoulders by a smooth vertex warp (see neck_warp.py).

Run with Blender: -b --factory-startup --python warp_neck_field.py --
  --scene <body.blend | head.blend> --kind body|head --out <new-dir> [--fairing <fairing.json>]

body: warps the body skin between z .20 and .44 (neck base, shoulders, upper chest);
      copies fairing.json with the new output hash so the assembly accepts it.
head: warps the neck stub below the jaw. The head is modeled in its own frame and
      placed at scale .50 with offset (0, -.02, .635), so vertices are warped in
      that world frame and mapped back. Eyes, nose and coat are outside the warp.
Nothing is remeshed: every vertex moves by a smooth monotone map, so the surface
stays one closed connected solid. Akinza-specific.
"""
import argparse
import copy
import json
from pathlib import Path
import shutil
import sys

import bpy
import numpy as np
from mathutils import Matrix

sys.path.insert(0, str(Path(__file__).resolve().parent))
import neck_warp
from blender_blockout import mesh_stats, require_single_closed_mesh, sha
from study_provenance import digest, snapshot

parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--kind', choices=['body', 'head'], required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--fairing', type=Path)
parser.add_argument('--head-scale', type=float, default=.50)
parser.add_argument('--head-offset', type=float, nargs=3, default=[0, -.02, .635])
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
inputs = [args.scene] + ([args.fairing] if args.fairing else [])
provenance = snapshot(args.out, __file__, inputs)
shutil.copyfile(Path(__file__).resolve().parent/'neck_warp.py', args.out/'source-snapshot'/'neck_warp.py')
if args.kind == 'body' and not args.fairing:
    raise ValueError('The body warp needs its fairing.json')

bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
skin = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
require_single_closed_mesh(skin, args.out, f'{args.kind} skin before neck warp')
before = mesh_stats(skin)
M = skin.matrix_world.copy()
count = len(skin.data.vertices)
local = np.empty(count*3, dtype=np.float64)
flat = np.empty(count*3, dtype=np.float32)
skin.data.vertices.foreach_get('co', flat)
local = flat.reshape(-1, 3).astype(np.float64)
matrix = np.array(M)
world_of_local = local @ matrix[:3, :3].T + matrix[:3, 3]
if args.kind == 'body':
    world = world_of_local
    spec = neck_warp.BODY
else:
    offset = np.array(args.head_offset)
    world = world_of_local*args.head_scale+offset
    spec = neck_warp.HEAD
moved_world = neck_warp.warp_points(world, spec)
if args.kind == 'head':
    moved_world = (moved_world-offset)/args.head_scale
inverse = np.array(M.inverted())
moved_local = moved_world @ inverse[:3, :3].T + inverse[:3, 3]
skin.data.vertices.foreach_set('co', moved_local.astype(np.float32).ravel())
skin.data.update()
require_single_closed_mesh(skin, args.out, f'{args.kind} skin after neck warp')
after = mesh_stats(skin)
shift = np.linalg.norm(moved_world-(world if args.kind == 'body' else world_of_local), axis=1)
moved = shift > 1e-6
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/f'{args.kind}.blend'))
outputs = {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']}
summary = {
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'neckWarpSha256': digest(Path(__file__).resolve().parent/'neck_warp.py'),
    'scope': f'Neck and shoulder silhouette warp of the {args.kind}; no remesh',
    'kind': args.kind, 'table': spec, 'skinBefore': before, 'skinAfter': after,
    'movedVertices': int(moved.sum()),
    'maximumShiftLocalUnits': float(shift.max()),
    'movedBoundsZ': [float(world[moved][:, 2].min()), float(world[moved][:, 2].max())] if moved.any() else None,
    'outputs': outputs,
}
(args.out/'neck-warp.json').write_text(json.dumps(summary, indent=2)+'\n')
if args.fairing:
    record = json.loads(args.fairing.read_text())
    updated = copy.deepcopy(record)
    updated.update({'approval': None, 'stageProvenanceSha256': provenance,
                    'scope': record.get('scope', '')+'; neck and shoulder silhouette warp',
                    'body': after, 'neckWarp': {k: v for k, v in summary.items() if k != 'table'},
                    'outputs': outputs})
    (args.out/'fairing.json').write_text(json.dumps(updated, indent=2)+'\n')
print('warp ok', json.dumps({'before': before, 'after': after, 'moved': int(moved.sum())}))
