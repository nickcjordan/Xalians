"""Add overlapping coat locks to the rear of the head and ear fan in field space.

Run with Blender: -b --factory-startup --python add_rear_coat_field.py --
  --scene <head.blend> --out <new-dir> [--seed 7]

The largest mesh (the head skin) becomes an OpenVDB level set. Rear surface
points are sampled by ray casts from behind; at jittered sites a flattened,
tapered lock is laid along the surface, oriented outward from the head center,
with its root buried and its tip lifted so neighbors overlap like shingles.
Locks join the skin with a small smooth union and the field is meshed once.
Separate eye, nose and mouth objects are untouched. Akinza-specific.
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
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, remove_voxel_specks, require_single_closed_mesh, sha
from study_provenance import snapshot

parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--seed', type=int, default=7)
parser.add_argument('--voxel', type=float, default=.0025)
parser.add_argument('--spacing', type=float, default=.062)
parser.add_argument('--root-blend', type=float, default=.008)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.scene])
bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
head = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
require_single_closed_mesh(head, args.out, 'Head skin before rear coat')
before = mesh_stats(head)
VS = args.voxel
M = head.matrix_world.copy()
points = np.array([M @ v.co for v in head.data.vertices], dtype=np.float32)
head.data.calc_loop_triangles()
tris = np.empty(len(head.data.loop_triangles)*3, dtype=np.int32)
head.data.loop_triangles.foreach_get('vertices', tris)
tris = tris.reshape(-1, 3)
tree = BVHTree.FromPolygons([tuple(p) for p in points], tris.tolist())
HALF = 12
grid = vdb.FloatGrid.createLevelSetFromPolygons(points, triangles=tris,
                                                transform=vdb.createLinearTransform(voxelSize=VS), halfWidth=HALF)
BAND = HALF*VS
lo = np.floor(points.min(axis=0)/VS).astype(int)-30
hi = np.ceil(points.max(axis=0)/VS).astype(int)+30
shape = tuple(int(v) for v in hi-lo+1)
field = np.empty(shape, dtype=np.float32)
grid.copyToArray(field, ijk=tuple(int(v) for v in lo))
bounds_low, bounds_high = points.min(axis=0), points.max(axis=0)
center = Vector((0.0, 0.0, -.02))

# Sample the rear surface on a jittered lattice.
rng = np.random.default_rng(args.seed)
sites = []
step = args.spacing
# Start above the neck stub, which the assembly trims and bridges.
for z in np.arange(bounds_low[2]+.30, bounds_high[2]-.01, step*.8):
    offset = rng.uniform(0, step)
    for x in np.arange(bounds_low[0]+.02+offset, bounds_high[0]-.02, step):
        jx, jz = float(x+rng.uniform(-.25, .25)*step), float(z+rng.uniform(-.25, .25)*step*.8)
        hit, normal, _, _ = tree.ray_cast(Vector((jx, 3.0, jz)), Vector((0, -1, 0)))
        if hit is None or normal.y < .15:
            continue
        # Stay behind the face and cheek fringe: only the rear half of the head.
        if hit.y < -.02:
            continue
        sites.append((hit, normal.normalized()))

locks = []
for hit, normal in sites:
    # The coat parts at the vertical midline and flows sideways toward each wing
    # with a slight droop; near the part it falls downward.
    wing = min(1.0, abs(hit.x)/.8)
    side = 1 if hit.x >= 0 else -1
    part = min(1.0, abs(hit.x)/.10)
    flow = Vector((side*part, 0, -.28-.55*(1-part)+.10*wing))
    flow.normalize()
    direction = flow-normal*flow.dot(normal)
    if direction.length < 1e-6:
        continue
    direction.normalize()
    size = .55+.55*wing
    # Each lock spans about three rows so the coat reads as flowing strands.
    length = float(size*rng.uniform(.17, .25))
    width = float(size*rng.uniform(.040, .054))
    thickness = float(max(.016, width*rng.uniform(.30, .38)))
    lift = float(thickness*rng.uniform(.35, .6))
    root = hit-normal*thickness*.55
    tip = hit+direction*length
    # Keep the authored silhouette: a lock whose tip would leave the surface is dropped.
    nearest, _, _, gap = tree.find_nearest(tip)
    if nearest is None or gap > thickness*1.2:
        continue
    locks.append({'root': list(root), 'normal': list(normal), 'direction': list(direction),
                  'length': length, 'width': width, 'thickness': thickness, 'lift': lift})

lock_field = np.full(shape, BAND, dtype=np.float32)
for lock in locks:
    r, n, d = (np.array(lock[k]) for k in ('root', 'normal', 'direction'))
    b = np.cross(d, n)
    L, W, T, lift = lock['length'], lock['width'], lock['thickness'], lock['lift']
    tip = r+d*L+n*lift
    reach = W+.02
    low = np.minimum(r, tip)-reach
    high = np.maximum(r, tip)+reach
    a = np.clip(np.floor(low/VS).astype(int)-lo, 0, np.array(shape)-1)
    z = np.clip(np.ceil(high/VS).astype(int)-lo+1, 0, np.array(shape))
    sl = tuple(slice(int(i), int(j)) for i, j in zip(a, z))
    axes = [(lo[i]+np.arange(s.start, s.stop))*VS for i, s in enumerate(sl)]
    X, Y, Z = np.meshgrid(*axes, indexing='ij')
    qx, qy, qz = X-r[0], Y-r[1], Z-r[2]
    u = qx*d[0]+qy*d[1]+qz*d[2]
    v = qx*n[0]+qy*n[1]+qz*n[2]
    w = qx*b[0]+qy*b[1]+qz*b[2]
    t = np.clip(u/L, 0, 1)
    v = v-lift*t*t
    # Fur clump: widest just past the root, tapering to a soft point.
    radius = W*(1-t)**.9*np.minimum(1, .6+t*3)+.0025
    # Flatten across the surface normal: distance in (u, v*W/T, w) scaled back.
    along = u-np.clip(u, 0, L)
    distance = np.sqrt(along**2+(v*W/T)**2+w**2)-radius
    value = distance*(T/W)
    lock_field[sl] = np.minimum(lock_field[sl], value.astype(np.float32))


def smin(a, b, k):
    h = np.clip(.5+.5*(b-a)/k, 0, 1)
    return b*(1-h)+a*h-k*h*(1-h)


combined = np.minimum(smin(field, lock_field, args.root_blend), BAND).astype(np.float32)
out_grid = vdb.FloatGrid()
out_grid.background = BAND
out_grid.copyFromArray(combined, ijk=(0, 0, 0))
vertices, tri_out, quads = out_grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
vertices = (vertices.astype(np.float64)+lo)*VS
faces = [tuple(t) for t in tri_out.tolist()]+[tuple(q) for q in quads.tolist()]
materials = list(head.data.materials)
mesh = bpy.data.meshes.new('Head skin with rear coat locks')
mesh.from_pydata(vertices.tolist(), [], faces)
mesh.update()
bm = bmesh.new(); bm.from_mesh(mesh)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.000001)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(mesh); bm.free()
old = head.data
head.data = mesh
for material in materials:
    mesh.materials.append(material)
for polygon in mesh.polygons:
    polygon.use_smooth = True
# The field was built in world space; express vertices in the object's frame.
inverse = M.inverted()
for vertex in mesh.vertices:
    vertex.co = inverse @ vertex.co
bpy.data.meshes.remove(old)
# Lock tips thinner than the voxel can leave recorded flecks; larger pieces fail.
removed_flecks = remove_voxel_specks(head, max_extent=6*VS)
require_single_closed_mesh(head, args.out, 'Head skin with rear coat')
front_changes = []
sample = rng.choice(len(mesh.vertices), size=min(40000, len(mesh.vertices)), replace=False)
for index in sample:
    co = M @ mesh.vertices[int(index)].co
    if co.y < -.05:
        _, _, _, distance = tree.find_nearest(co)
        front_changes.append(distance)
front_changes = np.array(front_changes)
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'rear-coat.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'scope': 'Rear head and ear-fan coat locks added in field space; face and separate features preserved',
    'seed': args.seed, 'voxel': VS, 'spacing': args.spacing, 'rootBlend': args.root_blend,
    'lockCount': len(locks), 'locks': locks, 'removedFlecks': removed_flecks,
    'skinBefore': before, 'skinAfter': mesh_stats(head),
    'frontSurfaceDeviation': {'samples': int(len(front_changes)), 'maximum': float(front_changes.max()),
                              'p99': float(np.percentile(front_changes, 99))},
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']},
}, indent=2)+'\n')
