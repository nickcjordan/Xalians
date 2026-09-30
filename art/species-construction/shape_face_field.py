"""Muzzle pads, chin bulge and broad cheek locks for the Akinza face, in field space (round 14, R02).

Run with Blender: -b --factory-startup --python shape_face_field.py --
  --scene <head.blend> --spec <face.json> --out <new-dir>

The head skin (the largest mesh) becomes an OpenVDB level set in head-local coordinates. Three edits change the
field and it is meshed once, so there are no seams:
  1. muzzle pads and a chin bulge: the field is offset outward by amplitude*w(p), w a smooth ellipsoidal bump;
  2. the small serrations along the jaw corners are blurred away by a weighted morph to a Gaussian-blurred field
     inside a windowed box that stays clear of the eye sockets;
  3. a few broad rounded cheek locks per side are joined with a small smooth union.
The mouth curves are separate objects; their vertices follow the surface displacement in y so the line stays on
the surface. Eyes and nose are untouched. Akinza-specific.
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
parser.add_argument('--spec', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
spec = json.loads(args.spec.read_text())
provenance = snapshot(args.out, __file__, [args.scene, args.spec])
bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
head = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
require_single_closed_mesh(head, args.out, 'Head skin before face shaping')
before = mesh_stats(head)
VS = spec['voxel']
M = head.matrix_world.copy()
points = np.array([M @ v.co for v in head.data.vertices], dtype=np.float32)
head.data.calc_loop_triangles()
tris = np.empty(len(head.data.loop_triangles)*3, dtype=np.int32)
head.data.loop_triangles.foreach_get('vertices', tris)
tris = tris.reshape(-1, 3)
old_tree = BVHTree.FromPolygons([tuple(p) for p in points], tris.tolist())
HALF = 12
grid = vdb.FloatGrid.createLevelSetFromPolygons(points, triangles=tris,
                                                transform=vdb.createLinearTransform(voxelSize=VS), halfWidth=HALF)
BAND = HALF*VS
lo = np.floor(points.min(axis=0)/VS).astype(int)-30
hi = np.ceil(points.max(axis=0)/VS).astype(int)+30
shape = tuple(int(v) for v in hi-lo+1)
field = np.empty(shape, dtype=np.float32)
grid.copyToArray(field, ijk=tuple(int(v) for v in lo))
del grid


def box_slices(low, high):
    a = np.clip(np.floor(np.array(low)/VS).astype(int)-lo, 0, np.array(shape)-1)
    b = np.clip(np.ceil(np.array(high)/VS).astype(int)-lo+1, 0, np.array(shape))
    return tuple(slice(int(i), int(j)) for i, j in zip(a, b))


def coordinates(slices):
    axes = [(lo[i]+np.arange(s.start, s.stop))*VS for i, s in enumerate(slices)]
    return np.meshgrid(*axes, indexing='ij')


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


def smin(a, b, k):
    h = np.clip(.5+.5*(b-a)/k, 0, 1)
    return b*(1-h)+a*h-k*h*(1-h)


def gaussian(volume, sigma):
    radius = int(math.ceil(3*sigma/VS))
    offsets = np.arange(-radius, radius+1)
    kernel = np.exp(-.5*(offsets*VS/sigma)**2)
    kernel /= kernel.sum()
    out = volume.astype(np.float32)
    for axis in range(3):
        padded = np.pad(out, [(radius, radius) if a == axis else (0, 0) for a in range(3)], mode='edge')
        acc = np.zeros_like(out)
        for k, w in zip(offsets, kernel):
            index = [slice(None)]*3
            index[axis] = slice(radius+int(k), radius+int(k)+out.shape[axis])
            acc += np.float32(w)*padded[tuple(index)]
        out = acc
    return out


record = {}

# 2. Blur the jaw-corner serrations away first, so the pads and locks are laid on the smoothed surface.
cs = spec['cheek_smooth']
for side in (1, -1):
    xs = sorted([side*cs['x'][0], side*cs['x'][1]])
    pad = 3*cs['sigma']+cs['x_fade']
    sl = box_slices([xs[0]-pad, -0.6, cs['z'][0]-pad], [xs[1]+pad, cs['y_max']+pad, cs['z'][1]+pad])
    X, Y, Z = coordinates(sl)
    native = field[sl].copy()
    blurred = gaussian(native, cs['sigma'])
    ax = np.abs(X)
    wx = smoothstep((ax-cs['x'][0])/cs['x_fade'])*smoothstep((cs['x'][1]-ax)/cs['x_fade'])
    wz = smoothstep((Z-cs['z'][0])/cs['z_fade'])*smoothstep((cs['z'][1]-Z)/cs['z_fade'])
    wy = smoothstep((cs['y_max']-Y)/.03)
    w = (wx*wz*wy).astype(np.float32)
    change = w*(blurred-native)
    field[sl] = native+change
    record.setdefault('cheekSmooth', []).append({'side': side, 'maximumFieldChange': float(np.abs(change).max())})


# 1. Muzzle pads and chin: outward offset by a smooth ellipsoidal bump.
def inflate(center, radii, amplitude, mirror):
    centers = [np.array(center)]
    if mirror:
        centers.append(np.array([-center[0], center[1], center[2]]))
    for c in centers:
        r = np.array(radii)
        sl = box_slices(c-r, c+r)
        X, Y, Z = coordinates(sl)
        r2 = ((X-c[0])/r[0])**2+((Y-c[1])/r[1])**2+((Z-c[2])/r[2])**2
        w = (np.maximum(0, 1-r2)**2).astype(np.float32)
        field[sl] = field[sl]-np.float32(amplitude)*w


def advect_forward(center, radii, amplitude, mirror):
    """Push the surface toward -y by amplitude*w(p) (F'(x,y,z) = F(x,y+s,z)), so the front view's outline does not
    grow the way a normal-direction offset does on a downward-facing part such as the chin."""
    global field
    centers = [np.array(center)]
    if mirror:
        centers.append(np.array([-center[0], center[1], center[2]]))
    for c in centers:
        r = np.array(radii)
        margin = amplitude+2*VS
        sl = box_slices(c-r-np.array([0, margin, 0]), c+r+np.array([0, margin, 0]))
        X, Y, Z = coordinates(sl)
        r2 = ((X-c[0])/r[0])**2+((Y-c[1])/r[1])**2+((Z-c[2])/r[2])**2
        s = (amplitude*np.maximum(0, 1-r2)**2).astype(np.float32)
        sub = field[sl].copy()
        j = np.arange(sub.shape[1], dtype=np.float32)[None, :, None]+s/VS
        j = np.clip(j, 0, sub.shape[1]-1)
        j0 = np.minimum(np.floor(j).astype(np.int64), sub.shape[1]-2)
        f = (j-j0).astype(np.float32)
        a = np.take_along_axis(sub, j0, axis=1)
        b = np.take_along_axis(sub, j0+1, axis=1)
        field[sl] = a*(1-f)+b*f


p = spec['pads']
inflate(p['center'], p['radii'], p['amplitude'], True)
c = spec['chin']
if c.get('mode', 'inflate') == 'advect':
    advect_forward(c['center'], c['radii'], c['amplitude'], False)
else:
    inflate(c['center'], c['radii'], c['amplitude'], False)


# 3. Broad cheek locks.
def lock_field_for(lock, side):
    x, z = lock['root'][0], lock['root'][-1]
    d = np.array(lock['direction'], dtype=float)
    if side < 0:
        x = -x
        d[0] = -d[0]
    # Root: where a ray from the front meets the skin at (x, z); fall back to the nearest surface point.
    hit, normal, _, _ = old_tree.ray_cast(Vector((x, -3.0, z)), Vector((0, 1, 0)))
    if hit is None:
        hit, normal, _, _ = old_tree.find_nearest(Vector((x, -0.1, z)))
    nearest = hit
    n = np.array(normal)/np.linalg.norm(np.array(normal))
    d = d-n*d.dot(n)
    d /= np.linalg.norm(d)
    root = np.array(nearest)-n*lock['thickness']*.5
    b = np.cross(d, n)
    L, W, T, lift = lock['length'], lock['width'], lock['thickness'], lock['lift']
    tip = root+d*L+n*lift
    reach = W+.02
    sl = box_slices(np.minimum(root, tip)-reach, np.maximum(root, tip)+reach)
    X, Y, Z = coordinates(sl)
    qx, qy, qz = X-root[0], Y-root[1], Z-root[2]
    u = qx*d[0]+qy*d[1]+qz*d[2]
    v = qx*n[0]+qy*n[1]+qz*n[2]
    w = qx*b[0]+qy*b[1]+qz*b[2]
    t = np.clip(u/L, 0, 1)
    v = v-lift*t*t
    if lock.get('round_tip'):
        # Spatulate leaf: broad through the middle and ending in a rounded, not pointed, tip.
        radius = W*np.sqrt(np.maximum(0, 1-t**lock['round_tip']))*np.minimum(1, .7+t*3)+.004
    else:
        radius = W*(1-t)**.75*np.minimum(1, .7+t*3)+.004
    along = u-np.clip(u, 0, L)
    distance = np.sqrt(along**2+(v*W/T)**2+w**2)-radius
    value = (distance*(T/W)).astype(np.float32)
    return sl, value, {'root': root.tolist(), 'normal': n.tolist(), 'direction': d.tolist(), 'side': side, **lock}


lock_records = []
lock_field = np.full(shape, BAND, dtype=np.float32)
for lock in spec['cheek_locks']:
    for side in (1, -1):
        sl, value, info = lock_field_for(lock, side)
        lock_field[sl] = np.minimum(lock_field[sl], value)
        lock_records.append(info)
combined = np.minimum(smin(field, lock_field, spec['lock_blend']), BAND).astype(np.float32)
del lock_field

out_grid = vdb.FloatGrid()
out_grid.background = BAND
out_grid.copyFromArray(combined, ijk=(0, 0, 0))
vertices, tri_out, quads = out_grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
vertices = (vertices.astype(np.float64)+lo)*VS
faces = [tuple(t) for t in tri_out.tolist()]+[tuple(q) for q in quads.tolist()]
materials = list(head.data.materials)
mesh = bpy.data.meshes.new('Head skin with shaped face')
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
inverse = M.inverted()
for vertex in mesh.vertices:
    vertex.co = inverse @ vertex.co
bpy.data.meshes.remove(old)
removed_flecks = remove_voxel_specks(head, max_extent=6*VS)
require_single_closed_mesh(head, args.out, 'Head skin with shaped face')

# Let the mouth curves follow the surface displacement in y.
mesh = head.data
mesh.calc_loop_triangles()
new_points = np.array([M @ v.co for v in mesh.vertices], dtype=np.float32)
new_tris = np.empty(len(mesh.loop_triangles)*3, dtype=np.int32)
mesh.loop_triangles.foreach_get('vertices', new_tris)
new_tree = BVHTree.FromPolygons([tuple(q) for q in new_points], new_tris.reshape(-1, 3).tolist())


def front_y(tree, x, z):
    hit, _, _, _ = tree.ray_cast(Vector((x, -3.0, z)), Vector((0, 1, 0)))
    return None if hit is None else hit.y


follow = {}
for obj in bpy.context.scene.objects:
    if obj.type != 'MESH' or not (obj.name.startswith('closed_mouth') or obj.name == 'nose_finish'):
        continue
    deltas = []
    for vertex in obj.data.vertices:
        w = obj.matrix_world @ vertex.co
        a, b = front_y(old_tree, w.x, w.z), front_y(new_tree, w.x, w.z)
        deltas.append(0.0 if a is None or b is None else b-a)
    deltas = np.array(deltas)
    follow[obj.name] = {'maxDelta': float(deltas.max()), 'minDelta': float(deltas.min())}
    if obj.name.startswith('closed_mouth'):
        for vertex, delta in zip(obj.data.vertices, deltas):
            vertex.co.y += float(delta)
        follow[obj.name]['moved'] = True

# Deviation of the new skin from the old outside the edited zone.
rng = np.random.default_rng(1)
sample = rng.choice(len(new_points), size=min(60000, len(new_points)), replace=False)
outside = []
for index in sample:
    co = Vector(new_points[int(index)])
    if abs(co.x) > .5 or co.z > -.02 or co.y > .05:
        _, _, _, distance = old_tree.find_nearest(co)
        outside.append(distance)
outside = np.array(outside)
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'face-shape.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'scope': 'Muzzle pads, chin bulge, jaw-corner smoothing and broad cheek locks added in field space; eyes and nose preserved',
    'spec': spec, 'record': record, 'locks': lock_records, 'follow': follow, 'removedFlecks': removed_flecks,
    'skinBefore': before, 'skinAfter': mesh_stats(head),
    'deviationOutsideFace': {'samples': int(len(outside)), 'maximum': float(outside.max()),
                             'p99': float(np.percentile(outside, 99))},
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']},
}, indent=2)+'\n')
