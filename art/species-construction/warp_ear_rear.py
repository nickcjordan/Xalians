"""Thin the rear of the Akinza ear fan by a smooth vertex warp (see ear_rear_warp.py).

Run with Blender: -b --factory-startup --python warp_ear_rear.py --
  --scene <head.blend> --out <new-dir> [--dmax .11 --x0 .26 --width .14 --ya .09 --yb .31]

Every mesh object of the head scene moves by the same map (only the lobes' rear wall is
non-zero, so the eyes, lids, mouth and nose do not move). Nothing is remeshed, so the skin
stays one closed connected solid. Records wall thickness before and after along y rays.
Akinza-specific.
"""
import argparse
import json
from pathlib import Path
import shutil
import sys

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ear_rear_warp as W
from blender_blockout import mesh_stats, require_single_closed_mesh, sha
from study_provenance import digest, snapshot

parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--x0', type=float, default=W.X0)
parser.add_argument('--width', type=float, default=W.WIDTH)
parser.add_argument('--dmax', type=float, default=W.DMAX)
parser.add_argument('--ya', type=float, default=W.YA)
parser.add_argument('--yb', type=float, default=W.YB)
parser.add_argument('--top-shrink', type=float, default=W.TOP_SHRINK)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.scene])
shutil.copyfile(Path(__file__).resolve().parent/'ear_rear_warp.py', args.out/'source-snapshot'/'ear_rear_warp.py')
KW = dict(x0=args.x0, width=args.width, dmax=args.dmax, ya=args.ya, yb=args.yb, top_shrink=args.top_shrink)
assert args.dmax*1.5/(args.yb-args.ya) < 1, 'warp would fold: dmax * 1.5 / (yb - ya) must stay below 1'

bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
skin = max(meshes, key=lambda o: len(o.data.vertices))
require_single_closed_mesh(skin, args.out, 'head skin before ear rear warp')
before = mesh_stats(skin)


def wall_sections(obj):
    """Solid y intervals along rays through the lobe wall, for a few x and z."""
    M = obj.matrix_world
    obj.data.calc_loop_triangles()
    tree = BVHTree.FromPolygons([tuple(M@v.co) for v in obj.data.vertices],
                                [tuple(t.vertices) for t in obj.data.loop_triangles])
    table = {}
    for x in (.4, .5, .6, .7):
        rows = []
        for z in (-.02, .06, .14, .22, .30):
            hits, o, d = [], Vector((x, -.6, z)), Vector((0, 1, 0))
            for _ in range(40):
                h = tree.ray_cast(o, d, 2.0)
                if h[0] is None:
                    break
                hits.append(round(h[0].y, 4))
                o = h[0]+d*1e-4
            # Thickness of the back-most solid run (the wall).
            run = (hits[-1]-hits[-2]) if len(hits) >= 2 else None
            rows.append({'z': z, 'rearRun': [hits[-2], hits[-1]] if len(hits) >= 2 else None, 'thickness': run})
        table[str(x)] = rows
    return table


wall_before = wall_sections(skin)
moved_total, worst = 0, 0.0
for obj in meshes:
    matrix = np.array(obj.matrix_world)
    inverse = np.array(obj.matrix_world.inverted())
    count = len(obj.data.vertices)
    flat = np.empty(count*3, dtype=np.float32)
    obj.data.vertices.foreach_get('co', flat)
    local = flat.reshape(-1, 3).astype(np.float64)
    world = local@matrix[:3, :3].T+matrix[:3, 3]
    moved = W.warp_points(world, **KW)
    shift = np.linalg.norm(moved-world, axis=1)
    moved_total += int((shift > 1e-6).sum())
    worst = max(worst, float(shift.max()))
    new_local = moved@inverse[:3, :3].T+inverse[:3, 3]
    obj.data.vertices.foreach_set('co', new_local.astype(np.float32).ravel())
    obj.data.update()
require_single_closed_mesh(skin, args.out, 'head skin after ear rear warp')
after = mesh_stats(skin)
wall_after = wall_sections(skin)
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
summary = {
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'earRearWarpSha256': digest(Path(__file__).resolve().parent/'ear_rear_warp.py'),
    'scope': 'Ear fan rear: forward shift and squeeze of the lobes\' rear wall (|x| beyond the skull side); no remesh',
    'parameters': KW, 'skinBefore': before, 'skinAfter': after, 'movedVertices': moved_total,
    'maximumShiftHeadLocal': worst, 'wallBefore': wall_before, 'wallAfter': wall_after,
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']},
}
(args.out/'ear-rear.json').write_text(json.dumps(summary, indent=2)+'\n')
print('ear rear warp ok', json.dumps({'before': before, 'after': after, 'moved': moved_total, 'worst': worst}))
