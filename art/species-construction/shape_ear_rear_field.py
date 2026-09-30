"""Give the Akinza ear fan a rounded skull dome at the back and an open cup in profile.

Run with Blender: -b --factory-startup --python shape_ear_rear_field.py --
  --scene <head.blend> --out <new-dir> [options]

Steps, all on the one closed head skin (eyes, nose and mouth do not move):
  1. Dome warp (ear_rear_warp.py, vertex map, no remesh): the lobes' rear wall moves forward and is
     squeezed, starting on an ellipse (the skull dome seen from behind), so the two lobes step down
     from a rounded skull with a crown between them.
  2. The skin becomes an OpenVDB level set.
  3. Dome de-coat: inside the dome ellipse, on the rear half, the coat locks are stripped by a
     weighted morphological opening and a light blur, so the skull reads as a smooth rounded mass
     against the coated lobes (as in the first sheet's back view).
  4. Cup: inside the inner-ear outline the shingled plates are stripped by a weighted opening, then
     the floor is recessed by --cup-recess with a smooth maximum and blurred.
  5. Meshed once; fragments removed; the skin must still be one closed connected solid.

Akinza-specific. Every parameter is recorded in ear-rear-field.json.
"""
import argparse
import json
import math
from pathlib import Path
import shutil
import sys

import bpy
import bmesh
import numpy as np
import openvdb as vdb
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ear_rear_warp as W
from blender_blockout import mesh_stats, remove_voxel_specks, require_single_closed_mesh, sha
from study_provenance import digest, snapshot

parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--voxel', type=float, default=.0025)
parser.add_argument('--dome', type=float, nargs=3, default=[.27, .08, .40], help='ellipse half-width, center z, half-height')
parser.add_argument('--dmax', type=float, default=.11)
parser.add_argument('--width', type=float, default=.07)
parser.add_argument('--ya', type=float, default=.09)
parser.add_argument('--yb', type=float, default=.31)
parser.add_argument('--dome-open-steps', type=int, default=9, help='opening steps (voxels) that strip coat locks from the dome')
parser.add_argument('--dome-blur', type=float, default=2.0, help='voxels')
parser.add_argument('--dome-inset', type=float, default=.02, help='the de-coat window ends this far inside the ellipse')
parser.add_argument('--cup-open-steps', type=int, default=10)
parser.add_argument('--cup-recess', type=float, default=.03)
parser.add_argument('--cup-smooth', type=float, default=.008)
parser.add_argument('--cup-blur', type=float, default=3.0, help='voxels')
parser.add_argument('--no-dome-coat-strip', action='store_true')
parser.add_argument('--no-cup', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.scene])
shutil.copyfile(Path(__file__).resolve().parent/'ear_rear_warp.py', args.out/'source-snapshot'/'ear_rear_warp.py')
KW = dict(x0=W.X0, width=args.width, dmax=args.dmax, ya=args.ya, yb=args.yb, dome=tuple(args.dome))
assert args.dmax*1.5/(args.yb-args.ya) < 1, 'warp would fold'

bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
head = max(meshes, key=lambda o: len(o.data.vertices))
require_single_closed_mesh(head, args.out, 'Head skin before ear rear field')
before = mesh_stats(head)

# 1. Dome warp of every head object.
worst = 0.0
for obj in meshes:
    matrix = np.array(obj.matrix_world)
    inverse = np.array(obj.matrix_world.inverted())
    flat = np.empty(len(obj.data.vertices)*3, dtype=np.float32)
    obj.data.vertices.foreach_get('co', flat)
    local = flat.reshape(-1, 3).astype(np.float64)
    world = local@matrix[:3, :3].T+matrix[:3, 3]
    moved = W.warp_points(world, **KW)
    worst = max(worst, float(np.linalg.norm(moved-world, axis=1).max()))
    obj.data.vertices.foreach_set('co', (moved@inverse[:3, :3].T+inverse[:3, 3]).astype(np.float32).ravel())
    obj.data.update()
require_single_closed_mesh(head, args.out, 'Head skin after dome warp')

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


def smin(a, b, k):
    h = np.clip(.5+.5*(b-a)/k, 0, 1)
    return b*(1-h)+a*h-k*h*(1-h)


def smax(a, b, k):
    return -smin(-a, -b, k)


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


def edit_window(a, box, weight, steps, sigma):
    """Blend `a` toward its opened and blurred copy inside a sub-box, weighted; returns nothing (in place)."""
    (i0, i1), (j0, j1), (k0, k1) = box
    sub = np.ascontiguousarray(a[i0:i1, j0:j1, k0:k1])
    if steps > 0:
        sub = sub+weight*(opening(sub, steps)-sub)
    if sigma > 0:
        sub = sub+weight*(blur3(sub, sigma)-sub)
    a[i0:i1, j0:j1, k0:k1] = sub


def index_range(axis_values, low, high):
    idx = np.where((axis_values >= low) & (axis_values <= high))[0]
    return int(idx[0]), int(idx[-1])+1


shaped = field.copy()
record = {}

# 3. Dome de-coat.
if not args.no_dome_coat_strip:
    a, zc, b = args.dome
    box = (index_range(X, -a-.06, a+.06), index_range(Y, -.02, .55), index_range(Z, -.30, zc+b+.05))
    (i0, i1), (j0, j1), (k0, k1) = box
    gx, gy, gz = X[i0:i1], Y[j0:j1], Z[k0:k1]
    edge = a*np.sqrt(np.clip(1-((gz-zc)/b)**2, 0, 1))-args.dome_inset
    wx = 1-smoothstep((np.abs(gx)[:, None]-edge[None, :])/.03)          # (x, z)
    wy = smoothstep((gy-.02)/.05)                                        # rear half only
    wz = smoothstep((gz+.14)/.06)*(1-smoothstep((gz-(zc+b-.04))/.05))    # not the neck, not the top rim
    weight = (wx*wz[None, :])[:, None, :]*wy[None, :, None]
    edit_window(shaped, box, weight.astype(np.float32), args.dome_open_steps, args.dome_blur)
    record['domeStrip'] = {'box': [[int(u), int(v)] for u, v in box]}

# 4. Cup: strip the plates, then recess the floor.
CUP = [(.309, -.014), (.528, .164), (.647, .345), (.50, .275), (.309, .24)]
cup_poly = np.array(CUP)


def polygon_sdf(px, pz):
    d = np.full(px.shape, 1e9)
    n = len(cup_poly)
    for i in range(n):
        p, q = cup_poly[i], cup_poly[(i+1) % n]
        e = q-p
        w = np.stack([px-p[0], pz-p[1]], axis=-1)
        h = np.clip((w@e)/(e@e), 0, 1)
        d = np.minimum(d, np.linalg.norm(w-h[..., None]*e, axis=-1))
    inside = np.zeros(px.shape, dtype=bool)
    for i in range(n):
        p, q = cup_poly[i], cup_poly[(i+1) % n]
        cond = ((p[1] > pz) != (q[1] > pz))
        xint = p[0]+(pz-p[1])*(q[0]-p[0])/np.where(q[1] != p[1], q[1]-p[1], 1)
        inside ^= cond & (px < xint)
    return np.where(inside, -d, d)


if not args.no_cup:
    for side in (1, -1):
        box = (index_range(X, .26, .75) if side > 0 else index_range(X, -.75, -.26),
               index_range(Y, -.40, .32), index_range(Z, -.08, .42))
        (i0, i1), (j0, j1), (k0, k1) = box
        gx, gy, gz = X[i0:i1], Y[j0:j1], Z[k0:k1]
        AX, AZ = np.meshgrid(np.abs(gx), gz, indexing='ij')
        psdf = polygon_sdf(AX, AZ).astype(np.float32)
        inside = smoothstep(-psdf/.02)
        # Plates stand in front of the floor: strip them with an opening, then blur.
        near = 1-smoothstep((gy-.10)/.05)
        weight = (inside[:, None, :]*near[None, :, None]).astype(np.float32)
        edit_window(shaped, box, weight, args.cup_open_steps, 0)
        sub = np.ascontiguousarray(shaped[i0:i1, j0:j1, k0:k1])
        # Floor per column: front of the solid run that holds the back-most solid.
        solid = sub < 0
        n = solid.shape[1]
        has = solid.any(axis=1)
        last = n-1-np.argmax(solid[:, ::-1, :], axis=1)
        previous = np.concatenate([np.zeros_like(solid[:, :1, :]), solid[:, :-1, :]], axis=1)
        starts = solid & ~previous
        front_idx = np.where(starts & (np.arange(n)[None, :, None] <= last[:, None, :]), np.arange(n)[None, :, None], -1).max(axis=1)
        front_idx = np.clip(front_idx, 1, n-1)
        f_out = np.take_along_axis(sub, (front_idx-1)[:, None, :], axis=1)[:, 0, :]
        f_in = np.take_along_axis(sub, front_idx[:, None, :], axis=1)[:, 0, :]
        t = np.clip(f_out/np.where(f_out != f_in, f_out-f_in, 1), 0, 1)
        floor = np.where(has, gy[front_idx-1]+t*(gy[front_idx]-gy[front_idx-1]), .30).astype(np.float32)
        if args.cup_recess > 0:
            removal = np.maximum(gy[None, :, None]-(floor+args.cup_recess)[:, None, :], psdf[:, None, :]+.004)
            sub = smax(sub, -removal, args.cup_smooth).astype(np.float32)
        if args.cup_blur > 0:
            w2 = (inside[:, None, :]*(1-smoothstep((gy-.14)/.05))[None, :, None]).astype(np.float32)
            sub = sub+w2*(blur3(sub, args.cup_blur)-sub)
        shaped[i0:i1, j0:j1, k0:k1] = sub

combined = np.minimum(shaped, BAND).astype(np.float32)
out_grid = vdb.FloatGrid()
out_grid.background = BAND
out_grid.copyFromArray(combined, ijk=(0, 0, 0))
vertices, tri_out, quads = out_grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
vertices = (vertices.astype(np.float64)+lo)*VS
faces = [tuple(t) for t in tri_out.tolist()]+[tuple(q) for q in quads.tolist()]
materials = list(head.data.materials)
mesh = bpy.data.meshes.new('Head skin with ear rear field')
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
require_single_closed_mesh(head, args.out, 'Head skin with ear rear field')
after = mesh_stats(head)


def wall_sections(obj):
    """Solid y intervals along rays through the lobes, back-most run thickness."""
    Mw = obj.matrix_world
    obj.data.calc_loop_triangles()
    tree = BVHTree.FromPolygons([tuple(Mw@v.co) for v in obj.data.vertices],
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
            rows.append({'z': z, 'hits': hits[-4:], 'thickness': round(hits[-1]-hits[-2], 4) if len(hits) >= 2 else None})
        table[str(x)] = rows
    return table


walls = wall_sections(head)
rng2 = np.random.default_rng(1)
sample = rng2.choice(len(mesh.vertices), size=min(60000, len(mesh.vertices)), replace=False)
outside, inside_edit = [], []
for index in sample:
    co = M@mesh.vertices[int(index)].co
    _, _, _, distance = old_tree.find_nearest(co)
    (inside_edit if (abs(co.x) > .2 and co.y > -.4 and -.3 < co.z < .55) else outside).append(distance)
outside = np.array(outside)

bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
summary = {
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'earRearWarpSha256': digest(Path(__file__).resolve().parent/'ear_rear_warp.py'),
    'scope': 'Ear fan rear and profile: dome warp, dome de-coat, cup plate strip and recess; face objects preserved',
    'parameters': {k: (str(v) if isinstance(v, Path) else v) for k, v in vars(args).items() if k not in ('scene', 'out')},
    'warpMaximumShift': worst, 'record': record, 'skinBefore': before, 'skinAfter': after,
    'removedFlecks': removed_flecks, 'removedFloatingPieces': removed_pieces, 'wallAfter': walls,
    'deviationOutsideEditWindow': {'samples': int(len(outside)),
                                   'maximum': float(outside.max()) if len(outside) else None,
                                   'p99': float(np.percentile(outside, 99)) if len(outside) else None},
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']},
}
(args.out/'ear-rear-field.json').write_text(json.dumps(summary, indent=2)+'\n')
print('ear rear field ok', json.dumps({'before': before, 'after': after}))
