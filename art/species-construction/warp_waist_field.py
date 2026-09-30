"""Narrow the Akinza waist in the front view and taper the ribcage into it, in field space.

Run with Blender: -b --factory-startup --python warp_waist_field.py --
  --scene <body.blend> --fairing <fairing.json> --spec <waist-warp.json> --out <new-dir> [--voxel .0025]

The body is converted to an OpenVDB level set and the field is resampled along x only:
F'(x, y, z) = F(x + s, y, z) with s = shift * K(z) * wy(y) * profile(x). K(z) is a smooth bump that
rises from 0 at zTop to 1 at zPeak, holds to zHold and falls back to 0 at zBottom. profile(x) is
x/xFull inside xFull (a linear compression of the core, so the shift is odd and continuous at the
midline) and fades to 0 at xZero, so the flank of the torso moves inward by about `shift` at the waist
while depth (y) does not change and the hanging arms, which start outside xZero at the waist rows,
keep their surface. wy fades the warp out behind the torso (yFull to yZero) so the tail root is
not squeezed. The sampling map is checked for monotonicity. The result is meshed once.

Every parameter lives in the spec JSON. Akinza-specific.
"""
import argparse
import copy
import json
import math
from pathlib import Path
import sys

import bpy
import bmesh
import numpy as np
import openvdb as vdb
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, require_single_closed_mesh, sha
from study_provenance import snapshot

parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--fairing', type=Path, required=True)
parser.add_argument('--spec', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--voxel', type=float, default=.0025)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)

spec = json.loads(args.spec.read_text())
provenance = snapshot(args.out, __file__, [args.scene, args.fairing, args.spec])
record = json.loads(args.fairing.read_text())
VS = args.voxel

bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
skin = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
if any(abs(skin.matrix_world[i][j]-(1 if i == j else 0)) > 1e-9 for i in range(4) for j in range(4)):
    raise ValueError('The skin has a non-identity object transform')
require_single_closed_mesh(skin, args.out, 'Body before waist warp')
source_stats = mesh_stats(skin)
material = skin.data.materials[0] if skin.data.materials else None

skin.data.calc_loop_triangles()
points = np.empty(len(skin.data.vertices)*3, dtype=np.float32)
skin.data.vertices.foreach_get('co', points)
points = points.reshape(-1, 3)
triangles = np.empty(len(skin.data.loop_triangles)*3, dtype=np.int32)
skin.data.loop_triangles.foreach_get('vertices', triangles)
triangles = triangles.reshape(-1, 3)
old_tree = BVHTree.FromPolygons([tuple(p) for p in points], triangles.tolist())

HALF_WIDTH = 18
BAND = HALF_WIDTH*VS
grid = vdb.FloatGrid.createLevelSetFromPolygons(
    points, triangles=triangles, transform=vdb.createLinearTransform(voxelSize=VS), halfWidth=HALF_WIDTH)
PAD = int(math.ceil(.05/VS))
lo_index = np.floor(points.min(axis=0)/VS).astype(int)-PAD
hi_index = np.ceil(points.max(axis=0)/VS).astype(int)+PAD
shape = tuple(int(v) for v in hi_index-lo_index+1)
field = np.empty(shape, dtype=np.float32)
grid.copyToArray(field, ijk=tuple(int(v) for v in lo_index))
if not (field.min() < 0 < field.max()):
    raise ValueError('Level set conversion produced no interior')


def smooth(t):
    t = np.clip(t, 0, 1)
    return t*t*t*(10+t*(-15+6*t))


xs = (lo_index[0]+np.arange(shape[0]))*VS
ys = (lo_index[1]+np.arange(shape[1]))*VS
zs = (lo_index[2]+np.arange(shape[2]))*VS
shift, zt, zp, zh, zb = (spec[n] for n in ['shift', 'zTop', 'zPeak', 'zHold', 'zBottom'])
K = np.where(zs >= zp, smooth((zt-zs)/(zt-zp)), smooth((zs-zb)/(zh-zb)))
K = np.where((zs > zt) | (zs < zb), 0.0, K)
K = np.where((zs < zp) & (zs > zh), 1.0, K)
xa_, xb_ = spec['xFull'], spec['xZero']
u = np.clip((np.abs(xs)-xa_)/(xb_-xa_), 0, 1)
profile = np.where(np.abs(xs) < xa_, xs/xa_, np.sign(xs)*(1-(3*u*u-2*u**3)))
wy = 1-smooth((ys-spec['yFull'])/(spec['yZero']-spec['yFull']))

active = np.where(K > 0)[0]
xa = np.where(np.abs(xs) <= spec['xZero']+.02)[0]
x0, x1, z0, z1 = xa[0], xa[-1]+1, active[0], active[-1]+1
sub = field[x0:x1, :, z0:z1]
X = xs[x0:x1][:, None, None]
src = X+shift*K[None, None, z0:z1]*profile[x0:x1][:, None, None]*wy[None, :, None]
# The sampling map must stay monotonic in x at every (y, z), or the warp folds the surface.
derivative = np.diff(src, axis=0)/VS
if derivative.min() <= .1:
    raise ValueError(f'Warp folds: minimum dx_src/dx {derivative.min():.3f}')
idx = np.clip((src-xs[x0])/VS, 0, sub.shape[0]-1.000001)
i0 = np.floor(idx).astype(np.int64)
frac = (idx-i0).astype(np.float32)
warped = (np.take_along_axis(sub, i0, axis=0)*(1-frac)+np.take_along_axis(sub, i0+1, axis=0)*frac).astype(np.float32)
field[x0:x1, :, z0:z1] = warped

edited = vdb.FloatGrid()
edited.background = BAND
edited.copyFromArray(field, ijk=(0, 0, 0))
vertices, tris, quads = edited.convertToPolygons(isovalue=0.0, adaptivity=0.0)
vertices = (vertices.astype(np.float64)+lo_index)*VS
faces = [tuple(t) for t in tris.tolist()]+[tuple(q) for q in quads.tolist()]
mesh = bpy.data.meshes.new('Waist warped body')
mesh.from_pydata(vertices.tolist(), [], faces)
mesh.update()
rebuilt = bpy.data.objects.new(skin.name, mesh)
bpy.context.collection.objects.link(rebuilt)
bm = bmesh.new(); bm.from_mesh(mesh)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.000001)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(mesh); bm.free()
if material:
    rebuilt.data.materials.append(material)
for polygon in rebuilt.data.polygons:
    polygon.use_smooth = True
after = require_single_closed_mesh(rebuilt, args.out, 'Body after waist warp')
old_name = skin.name
bpy.data.objects.remove(skin, do_unlink=True)
rebuilt.name = old_name

# Deviation from the input surface, inside and outside the warped box.
rng = np.random.default_rng(7)
sample = rng.choice(len(rebuilt.data.vertices), size=min(80000, len(rebuilt.data.vertices)), replace=False)
outside, inside = [], []
zlo, zhi = zs[z0], zs[z1-1]
for index in sample:
    co = rebuilt.data.vertices[int(index)].co
    _, _, _, distance = old_tree.find_nearest(co)
    is_in = abs(co[0]) < spec['xZero']+.03 and zlo-.02 < co[2] < zhi+.02 and co[1] < spec['yZero']+.02
    (inside if is_in else outside).append(distance)
outside, inside = np.array(outside), np.array(inside)

bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'body.blend'))
outputs = {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']}
summary = {
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'scope': 'Field-space x warp narrowing the waist and tapering the ribcage; one meshing', 'spec': spec,
    'voxel': VS, 'minimumSamplingDerivative': float(derivative.min()), 'skinBefore': source_stats, 'skinAfter': after,
    'deviationOutsideWarpBox': {'sampled': int(len(outside)), 'maximum': float(outside.max()),
                                'p99': float(np.percentile(outside, 99))},
    'deviationInsideWarpBox': {'sampled': int(len(inside)), 'maximum': float(inside.max()),
                               'p99': float(np.percentile(inside, 99)), 'mean': float(inside.mean())},
    'outputs': outputs,
}
(args.out/'waist-warp.json').write_text(json.dumps(summary, indent=2)+'\n')
updated = copy.deepcopy(record)
updated.update({'approval': None, 'stageProvenanceSha256': provenance,
                'scope': record.get('scope', '')+'; waist warp',
                'body': after, 'waistWarp': summary,
                'outputs': outputs})
(args.out/'fairing.json').write_text(json.dumps(updated, indent=2)+'\n')
print('warp ok', json.dumps({'before': source_stats, 'after': after, 'outside': summary['deviationOutsideWarpBox']}))
