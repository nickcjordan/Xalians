"""Merge the small coat shards of the Akinza ear fan into larger, calmer locks in field space.

Run with Blender: -b --factory-startup --python simplify_fan_field.py --
  --scene <head.blend> --out <new-dir> [options]

The fan and crown carry many small leaf shards; the body is smooth clay, so the figure reads at
two levels of development. This stage converts the closed head skin to an OpenVDB level set and,
inside a weighted window (fan sides and crown, never the face, eye sockets, nose or jaw):
  1. closing (dilate then erode): fills the crevices between neighboring shards so they merge
     into broader locks; the outer envelope of the fan is not eroded;
  2. optional opening (--open-steps): removes the finest spikes;
  3. a Gaussian blur of --blur voxels to round the merged edges.
The skin is meshed once and must still be one closed connected solid. Eyes, lids, nose and mouth
are separate objects and do not move. Akinza-specific. Every parameter is recorded in
fan-simplify.json.
"""
import argparse
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
from blender_blockout import mesh_stats, remove_voxel_specks, require_single_closed_mesh, sha
from study_provenance import snapshot

parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--voxel', type=float, default=.0025)
parser.add_argument('--close-steps', type=int, default=6, help='closing steps in voxels (fills crevices about twice this wide)')
parser.add_argument('--open-steps', type=int, default=0, help='opening steps in voxels (removes spikes)')
parser.add_argument('--blur', type=float, default=2.5, help='voxels')
parser.add_argument('--fan-x0', type=float, default=.30, help='|x| where the fan window starts')
parser.add_argument('--fan-ramp', type=float, default=.10)
parser.add_argument('--z-min', type=float, default=-.10, help='nothing below this z is touched')
parser.add_argument('--z-ramp', type=float, default=.10)
parser.add_argument('--crown-z', type=float, default=.30, help='crown window starts at this z')
parser.add_argument('--crown-y-min', type=float, default=-.16, help='the crown window stops short of the brow')
parser.add_argument('--no-crown', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.scene])

bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
head = max(meshes, key=lambda o: len(o.data.vertices))
require_single_closed_mesh(head, args.out, 'Head skin before fan simplification')
before = mesh_stats(head)

VS = args.voxel
M = head.matrix_world.copy()
points = np.array([M@v.co for v in head.data.vertices], dtype=np.float32)
head.data.calc_loop_triangles()
tris = np.empty(len(head.data.loop_triangles)*3, dtype=np.int32)
head.data.loop_triangles.foreach_get('vertices', tris)
tris = tris.reshape(-1, 3)
old_tree = BVHTree.FromPolygons([tuple(p) for p in points], tris.tolist())
HALF = 16
grid = vdb.FloatGrid.createLevelSetFromPolygons(points, triangles=tris,
                                                transform=vdb.createLinearTransform(voxelSize=VS), halfWidth=HALF)
BAND = HALF*VS
lo = np.floor(points.min(axis=0)/VS).astype(int)-30
hi = np.ceil(points.max(axis=0)/VS).astype(int)+30
shape = tuple(int(v) for v in hi-lo+1)
field = np.empty(shape, dtype=np.float32)
grid.copyToArray(field, ijk=tuple(int(v) for v in lo))
X, Y, Z = [(lo[i]+np.arange(shape[i]))*VS for i in range(3)]


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


def step_axis(a, axis, op):
    b = np.moveaxis(a, axis, 0)
    o = b.copy()
    op(o[1:], b[:-1], out=o[1:])
    op(o[:-1], b[1:], out=o[:-1])
    return np.moveaxis(o, 0, axis)


def step_ball(a, op, cube):
    if cube:
        for axis in range(3):
            a = step_axis(a, axis, op)
        return a
    o = a.copy()
    for axis in range(3):
        b = np.moveaxis(a, axis, 0)
        t = np.moveaxis(o, axis, 0)
        op(t[1:], b[:-1], out=t[1:])
        op(t[:-1], b[1:], out=t[:-1])
    return o


def opening(a, steps):
    e = a
    for k in range(steps):
        e = step_ball(e, np.maximum, k % 2 == 0)
    for k in range(steps):
        e = step_ball(e, np.minimum, k % 2 == 0)
    return e


def closing(a, steps):
    e = a
    for k in range(steps):
        e = step_ball(e, np.minimum, k % 2 == 0)
    for k in range(steps):
        e = step_ball(e, np.maximum, k % 2 == 0)
    return e


def blur3(a, sigma_voxels):
    radius = int(math.ceil(3*sigma_voxels))
    weights = np.exp(-.5*(np.arange(-radius, radius+1)/sigma_voxels)**2)
    weights /= weights.sum()
    for axis in range(3):
        moved = np.moveaxis(a, axis, 0)
        padded = np.pad(moved, [(radius, radius)]+[(0, 0)]*2, mode='edge')
        out = np.zeros_like(moved)
        for k, w in enumerate(weights):
            out += w*padded[k:k+moved.shape[0]]
        a = np.moveaxis(out, 0, axis)
    return np.ascontiguousarray(a)


def index_range(axis_values, low, high):
    idx = np.where((axis_values >= low) & (axis_values <= high))[0]
    return int(idx[0]), int(idx[-1])+1


# Window: fan sides (|x| beyond fan-x0) and the crown, above z-min.
pad = args.close_steps+args.open_steps+int(3*args.blur)+2
box = (index_range(X, -1.1, 1.1), index_range(Y, -.36, .40), index_range(Z, args.z_min-args.z_ramp-pad*VS, .62))
(i0, i1), (j0, j1), (k0, k1) = box
gx, gy, gz = X[i0:i1], Y[j0:j1], Z[k0:k1]
wx = smoothstep((np.abs(gx)-args.fan_x0)/args.fan_ramp)
wz = smoothstep((gz-args.z_min)/args.z_ramp)
weight = (wx[:, None, None]*wz[None, None, :])*np.ones((1, len(gy), 1))
if not args.no_crown:
    wc = smoothstep((gz-args.crown_z)/.06)[None, None, :]*smoothstep((gy-args.crown_y_min)/.06)[None, :, None]
    weight = np.maximum(weight, wc*np.ones((len(gx), 1, 1)))
weight = weight.astype(np.float32)

sub = np.ascontiguousarray(field[i0:i1, j0:j1, k0:k1])
edited = sub
if args.close_steps > 0:
    edited = closing(edited, args.close_steps)
if args.open_steps > 0:
    edited = opening(edited, args.open_steps)
if args.blur > 0:
    edited = blur3(edited, args.blur)
field[i0:i1, j0:j1, k0:k1] = sub+weight*(edited-sub)
maximum_change = float(np.abs(weight*(edited-sub)).max())
del sub, edited, weight

combined = np.minimum(field, BAND).astype(np.float32)
out_grid = vdb.FloatGrid()
out_grid.background = BAND
out_grid.copyFromArray(combined, ijk=(0, 0, 0))
vertices, tri_out, quads = out_grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
vertices = (vertices.astype(np.float64)+lo)*VS
faces = [tuple(t) for t in tri_out.tolist()]+[tuple(q) for q in quads.tolist()]
materials = list(head.data.materials)
mesh = bpy.data.meshes.new('Head skin with simplified fan')
mesh.from_pydata(vertices.tolist(), [], faces)
mesh.update()
bm = bmesh.new()
bm.from_mesh(mesh)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.000001)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(mesh)
bm.free()
old = head.data
head.data = mesh
for material in materials:
    mesh.materials.append(material)
for polygon in mesh.polygons:
    polygon.use_smooth = True
inverse = M.inverted()
for vertex in mesh.vertices:
    vertex.co = inverse@vertex.co
bpy.data.meshes.remove(old)
removed_flecks = remove_voxel_specks(head, max_extent=6*VS)


def remove_floating_pieces(obj, min_vertices):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    unseen, dropped = set(bm.verts), []
    while unseen:
        queue = [unseen.pop()]
        group = set(queue)
        while queue:
            for edge in queue.pop().link_edges:
                for vertex in edge.verts:
                    if vertex in unseen:
                        unseen.remove(vertex)
                        group.add(vertex)
                        queue.append(vertex)
        if len(group) < min_vertices:
            dropped.append({'vertices': len(group)})
            bmesh.ops.delete(bm, geom=list(group), context='VERTS')
    bm.to_mesh(obj.data)
    bm.free()
    return dropped


removed_pieces = remove_floating_pieces(head, 20000)
require_single_closed_mesh(head, args.out, 'Head skin with simplified fan')
after = mesh_stats(head)

rng = np.random.default_rng(3)
sample = rng.choice(len(mesh.vertices), size=min(60000, len(mesh.vertices)), replace=False)
outside, inside = [], []
for index in sample:
    co = M@mesh.vertices[int(index)].co
    _, _, _, distance = old_tree.find_nearest(co)
    in_window = (abs(co.x) > args.fan_x0-.02 and co.z > args.z_min-.02) or \
        (not args.no_crown and co.z > args.crown_z-.02 and co.y > args.crown_y_min-.02)
    (inside if in_window else outside).append(distance)
outside, inside = np.array(outside), np.array(inside)

bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
summary = {
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'scope': 'Ear fan and crown: closing, optional opening and blur in a weighted window; face objects preserved',
    'parameters': {k: (str(v) if isinstance(v, Path) else v) for k, v in vars(args).items() if k not in ('scene', 'out')},
    'maximumFieldChange': maximum_change, 'skinBefore': before, 'skinAfter': after,
    'removedFlecks': removed_flecks, 'removedFloatingPieces': removed_pieces,
    'deviationOutsideWindow': {'samples': int(len(outside)), 'maximum': float(outside.max()) if len(outside) else None,
                               'p99': float(np.percentile(outside, 99)) if len(outside) else None},
    'deviationInsideWindow': {'samples': int(len(inside)), 'maximum': float(inside.max()) if len(inside) else None,
                              'mean': float(inside.mean()) if len(inside) else None},
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']},
}
(args.out/'fan-simplify.json').write_text(json.dumps(summary, indent=2)+'\n')
print('fan simplify ok', json.dumps({'before': before, 'after': after, 'inside': summary['deviationInsideWindow']}))
