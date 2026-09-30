"""Shape the front of the Akinza ear fan in field space: a cupped inner ear with a clean rim.

Run with Blender: -b --factory-startup --python shape_ear_front_field.py --
  --scene <head.blend> --out <new-dir> [--seed 7]

Steps (all on the one closed head skin; eyes, nose and mouth objects move only with the
lobe-height warp, which leaves them fixed):
  1. Lobe-height warp (ear_warp.py): the lower outer edge of each lobe climbs toward the tip.
  2. The skin becomes an OpenVDB level set.
  3. Fringe trim: within the front of the lobes, a morphological opening (erode then dilate
     by a small ball) shortens the narrow conical spikes into broad blunt leaf tips.
  4. Floor: for every (x, z) column the front of the solid run that holds the back-most solid
     is the skull or plate surface behind any forward spikes. A ramp blends the skull wall's
     front (at x .35) into the plate's front (at x .62), so the corner between them becomes a
     smooth slope.
  5. Cup: inside a rounded leaf outline (the inner ear, pointing up and out, its inner edge
     on the skull), everything in front of the ramp is cut with a smooth maximum and the
     hollow behind the spikes is filled up to it, so the spikes are cut off at the floor and
     the walls become a clean rim. The clumps outside the rim stay.
  6. Leaf locks: broad, flattened, tapered locks are laid on the floor in rows that
     radiate from the ear root, overlapping like shingles, and joined by a small smooth union.
  7. The field is meshed once. Fragments below a few voxels are removed and the skin must
     still be one closed connected solid.

Akinza-specific construction. The lock shape follows add_rear_coat_field.py.
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
import ear_warp
from blender_blockout import mesh_stats, remove_voxel_specks, require_single_closed_mesh, sha
from study_provenance import digest, snapshot

parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--seed', type=int, default=7)
parser.add_argument('--voxel', type=float, default=.0025)
parser.add_argument('--head-scale', type=float, default=.50)
parser.add_argument('--head-offset', type=float, nargs=3, default=[0, -.02, .635])
parser.add_argument('--no-warp', action='store_true')
parser.add_argument('--fringe-steps', type=int, default=4, help='fine opening steps (voxels) for the spike trim')
parser.add_argument('--cut-smooth', type=float, default=.008)
parser.add_argument('--cut-margin', type=float, default=.006)
parser.add_argument('--cup-open-steps', type=int, default=6, help='opening steps inside the cup outline')
parser.add_argument('--smooth-sigma', type=float, default=4.5, help='voxels; blur of the cut surface inside the outline')
parser.add_argument('--lock-spacing', type=float, default=.058)
parser.add_argument('--lock-min-floor', type=float, default=.02, help='locks only where the floor is on the plate (y above this)')
parser.add_argument('--root-blend', type=float, default=.008)
parser.add_argument('--no-locks', action='store_true')
parser.add_argument('--cup-lock-clear', type=float, default=None,
                    help='when set, drop every lock whose root is inside the cup outline or within this distance '
                         'of it (head-local units); off by default so earlier builds reproduce')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.scene])
shutil.copyfile(Path(__file__).resolve().parent/'ear_warp.py', args.out/'source-snapshot'/'ear_warp.py')

bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
head = max(meshes, key=lambda o: len(o.data.vertices))
require_single_closed_mesh(head, args.out, 'Head skin before ear front')
before = mesh_stats(head)
offset = np.array(args.head_offset)

# 1. Lobe-height warp of every head object, in the head's world frame.
warp_record = {'applied': not args.no_warp}
if not args.no_warp:
    worst = 0.0
    for obj in meshes:
        matrix = np.array(obj.matrix_world)
        inverse = np.array(obj.matrix_world.inverted())
        count = len(obj.data.vertices)
        flat = np.empty(count*3, dtype=np.float32)
        obj.data.vertices.foreach_get('co', flat)
        local = flat.reshape(-1, 3).astype(np.float64)
        world = (local@matrix[:3, :3].T+matrix[:3, 3])*args.head_scale+offset
        moved = ear_warp.warp_points(world)
        worst = max(worst, float(np.linalg.norm(moved-world, axis=1).max()))
        back = (moved-offset)/args.head_scale
        obj.data.vertices.foreach_set('co', (back@inverse[:3, :3].T+inverse[:3, 3]).astype(np.float32).ravel())
        obj.data.update()
    warp_record.update({'pivotZ': ear_warp.PIVOT_Z, 'scale': ear_warp.SCALE, 'sigma': ear_warp.SIGMA,
                        'maximumShiftWorldUnits': worst})
    require_single_closed_mesh(head, args.out, 'Head skin after lobe warp')

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
axes = [(lo[i]+np.arange(shape[i]))*VS for i in range(3)]
X, Y, Z = axes


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


def smin(a, b, k):
    h = np.clip(.5+.5*(b-a)/k, 0, 1)
    return b*(1-h)+a*h-k*h*(1-h)


def smax(a, b, k):
    return -smin(-a, -b, k)


def step_axis(a, axis, op):
    """One radius-1 step of a separable max or min filter along one axis."""
    b = np.moveaxis(a, axis, 0)
    o = b.copy()
    op(o[1:], b[:-1], out=o[1:])
    op(o[:-1], b[1:], out=o[:-1])
    return np.moveaxis(o, 0, axis)


def step_ball(a, op, cube):
    """Alternate cube and octahedron steps, which together approximate a ball."""
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
    """Erode then dilate a signed distance field by about `steps` voxels."""
    e = a
    for k in range(steps):
        e = step_ball(e, np.maximum, k % 2 == 0)
    for k in range(steps):
        e = step_ball(e, np.minimum, k % 2 == 0)
    return e


# 2-3. Fringe trim: opening of the front of the lobes, weighted by a smooth window.
wx = smoothstep((np.abs(X)-.28)/.06)
wy = 1-smoothstep((Y-.10)/.05)
wz = smoothstep((Z+.22)/.06)*(1-smoothstep((Z-.46)/.06))
window_fringe = (wx[:, None, None]*wy[None, :, None]*wz[None, None, :]).astype(np.float32)
opened = opening(field, args.fringe_steps)
trimmed = field+window_fringe*(opened-field)
del opened

# 4. Floor: a ramp from the skull wall to the front of the fan plate, read from the field.
# Per (x, z) column, the front of the solid run that holds the back-most solid is the surface of
# the skull or plate behind any forward spikes; spikes that stand in front of it are separate runs.
STRIDE = 1
coarse = field[::STRIDE, ::STRIDE, ::STRIDE]
cx, cy, cz = X[::STRIDE], Y[::STRIDE], Z[::STRIDE]
solid = coarse < 0
ncy = solid.shape[1]
has = solid.any(axis=1)
last = ncy-1-np.argmax(solid[:, ::-1, :], axis=1)
previous = np.concatenate([np.zeros_like(solid[:, :1, :]), solid[:, :-1, :]], axis=1)
starts = solid & ~previous
run_front_index = np.where(starts & (np.arange(ncy)[None, :, None] <= last[:, None, :]),
                           np.arange(ncy)[None, :, None], -1).max(axis=1)
run_front_index = np.clip(run_front_index, 1, ncy-1)
# Sub-voxel crossing between the last outside voxel and the first solid voxel of that run.
f_out = np.take_along_axis(coarse, (run_front_index-1)[:, None, :], axis=1)[:, 0, :]
f_in = np.take_along_axis(coarse, run_front_index[:, None, :], axis=1)[:, 0, :]
t_cross = np.clip(f_out/np.where(f_out != f_in, f_out-f_in, 1), 0, 1)
front_c = np.where(has, cy[run_front_index-1]+t_cross*(cy[run_front_index]-cy[run_front_index-1]), .30)
back_c = np.where(has, cy[last], -.50)
del coarse, solid, previous, starts, run_front_index, f_out, f_in


def gauss1d(a, sigma_voxels, axis=0):
    radius = int(math.ceil(3*sigma_voxels))
    kernel = np.exp(-.5*(np.arange(-radius, radius+1)/sigma_voxels)**2)
    kernel /= kernel.sum()
    padded = np.pad(a, [(radius, radius) if i == axis else (0, 0) for i in range(a.ndim)], mode='edge')
    return np.apply_along_axis(lambda v: np.convolve(v, kernel, mode='valid'), axis, padded)


def resample_axis(arr, axis, src, dst):
    idx = np.clip(np.searchsorted(src, dst)-1, 0, len(src)-2)
    w = np.clip((dst-src[idx])/(src[idx+1]-src[idx]), 0, 1)
    a = np.take(arr, idx, axis=axis)
    b = np.take(arr, idx+1, axis=axis)
    shape_w = [1]*arr.ndim
    shape_w[axis] = len(dst)
    return a*(1-w.reshape(shape_w))+b*w.reshape(shape_w)


# The surface the spikes grow from, at fine resolution, and a lightly smoothed copy for lock normals.
floor_raw = front_c.astype(np.float32)
floor = gauss1d(gauss1d(floor_raw, .012/VS, 0), .012/VS, 1).astype(np.float32)

# 5. Cup outline: a rounded leaf, inner edge on the skull, tip up and out (head-local, right side).
CUP = [(.309, -.014), (.528, .164), (.647, .345), (.50, .275), (.309, .24)]
cup_poly = np.array(CUP)


def polygon_sdf(px, pz):
    """Signed distance to the polygon CUP (negative inside)."""
    d = np.full(px.shape, 1e9)
    n = len(cup_poly)
    for i in range(n):
        a, b = cup_poly[i], cup_poly[(i+1) % n]
        e = b-a
        w = np.stack([px-a[0], pz-a[1]], axis=-1)
        h = np.clip((w@e)/(e@e), 0, 1)
        dist = np.linalg.norm(w-h[..., None]*e, axis=-1)
        d = np.minimum(d, dist)
    # winding-independent inside test by ray parity
    inside = np.zeros(px.shape, dtype=bool)
    for i in range(n):
        a, b = cup_poly[i], cup_poly[(i+1) % n]
        cond = ((a[1] > pz) != (b[1] > pz))
        xint = a[0]+(pz-a[1])*(b[0]-a[0])/np.where(b[1] != a[1], b[1]-a[1], 1)
        inside ^= cond & (px < xint)
    return np.where(inside, -d, d)


AX, AZ = np.meshgrid(np.abs(X), Z, indexing='ij')
psdf = polygon_sdf(AX, AZ).astype(np.float32)
Y32 = Y.astype(np.float32)
# Remove the solid that stands in front of the skull or plate surface inside the outline (the forward
# spikes), a prism along y, smoothly. Solid that belongs to the main run (the roof, the skull wall) stays.
removal = np.maximum(Y32[None, :, None]-(floor_raw-args.cut_margin)[:, None, :], psdf[:, None, :])
shaped = smax(trimmed, -removal, args.cut_smooth).astype(np.float32)
del removal


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


# Smooth the cut surface (voxel terraces) inside the outline, near the front only.
if args.smooth_sigma > 0:
    for side in (1, -1):
        cols = np.where((np.sign(X) == side) & (np.abs(X) > .27) & (np.abs(X) < .72))[0]
        rows = np.where((Y > -.36) & (Y < .30))[0]
        planes = np.where((Z > -.07) & (Z < .40))[0]
        c0, c1, r0, r1, p0, p1 = cols[0], cols[-1]+1, rows[0], rows[-1]+1, planes[0], planes[-1]+1
        sub = np.ascontiguousarray(shaped[c0:c1, r0:r1, p0:p1])
        inside = smoothstep(-psdf[c0:c1, p0:p1]/.02)
        near_front = 1-smoothstep((Y[r0:r1][None, :, None]-.09)/.04)
        weight = (inside[:, None, :]*near_front).astype(np.float32)
        if args.cup_open_steps > 0:
            # Trim remaining fins and stubs inside the outline; the thick skull and plate survive.
            sub = sub+weight*(opening(sub, args.cup_open_steps)-sub)
        blurred = blur3(sub, args.smooth_sigma)
        shaped[c0:c1, r0:r1, p0:p1] = sub+weight*(blurred-sub)
        del sub, blurred, weight

# 6. Leaf locks laid on the floor, radiating from the ear root.
rng = np.random.default_rng(args.seed)
locks = []
rejected = {'skullOrRoofOrEmpty': 0, 'tipLeavesPlate': 0, 'insideCup': 0}
if not args.no_locks:
    root_point = np.array([.31, -.03])
    gx = np.gradient(floor, VS, axis=0)
    gz = np.gradient(floor, VS, axis=1)

    def at(arr2, x, z):
        i = int(np.clip(round((x-X[0])/VS), 0, len(X)-1))
        k = int(np.clip(round((z-Z[0])/VS), 0, len(Z)-1))
        return float(arr2[i, k])

    # Jittered lattice over the front of the fan plate (the cup and the dish beyond it), ordered from the
    # ear root outward. Locks near the root are small, those toward the rim larger, so the rows read as
    # layers of leaves fanning out from the ear.
    spacing = args.lock_spacing
    for z0 in np.arange(-.05, .42, spacing):
        for x0 in np.arange(.33, .96, spacing):
            px = x0+rng.uniform(-.3, .3)*spacing
            pz = z0+rng.uniform(-.3, .3)*spacing
            offset = np.array([px, pz])-root_point
            distance = float(np.linalg.norm(offset))
            theta = math.atan2(offset[1], offset[0])
            for side in (1, -1):
                x = side*px
                y = at(floor, x, pz)
                if y < args.lock_min_floor or y > .22:
                    rejected['skullOrRoofOrEmpty'] += 1
                    continue  # skull wall, roof, or no solid in this column
                slope = np.array([at(gx, x, pz), -1.0, at(gz, x, pz)])
                normal = slope/np.linalg.norm(slope)
                direction_in_plane = np.array([side*math.cos(theta), 0.0, math.sin(theta)])
                direction = direction_in_plane-normal*direction_in_plane.dot(normal)
                direction /= np.linalg.norm(direction)
                length = float(np.clip(.14+.35*distance, .16, .30)*rng.uniform(.92, 1.08))
                width = float(np.clip(.045+.05*distance, .05, .08)*rng.uniform(.92, 1.08))
                thickness = float(.028+.008*distance*2)
                lift = float(.032+.02*distance)
                tip = np.array([x, 0.0, pz])+direction*length
                side_step = np.cross(direction, normal)
                # Drop a lock that would hang off the plate or lie on a steep part of it: its tip and both
                # flanks must land on plate that is close to the root's level, so the silhouette stays intact.
                probes = [tip, tip-direction*.03,
                          np.array([x, 0.0, pz])+direction*length*.6+side_step*width*.6,
                          np.array([x, 0.0, pz])+direction*length*.6-side_step*width*.6]
                levels = [at(floor, q[0], q[2]) for q in probes]
                slope_here = max(abs(at(gx, x, pz)), abs(at(gz, x, pz)))
                if slope_here > .6 or any(not (args.lock_min_floor <= v <= .22) or abs(v-y) > .10 for v in levels):
                    rejected['tipLeavesPlate'] += 1
                    continue
                # Applied last, after every draw and every other test, so the surviving locks outside the
                # cup are exactly the ones an earlier build (flag off) laid.
                if args.cup_lock_clear is not None and float(polygon_sdf(np.array([px]), np.array([pz]))[0]) < args.cup_lock_clear:
                    rejected['insideCup'] += 1
                    continue
                hit = np.array([x, y, pz])
                locks.append({'side': side, 'root': list(hit), 'normal': list(normal),
                              'direction': list(direction), 'length': length, 'width': width,
                              'thickness': thickness, 'lift': lift, 'distanceFromRoot': distance})

lock_field = np.full(shape, BAND, dtype=np.float32)
for lock in locks:
    r, n, d = (np.array(lock[k]) for k in ('root', 'normal', 'direction'))
    b = np.cross(d, n)
    L, W, T, lift = lock['length'], lock['width'], lock['thickness'], lock['lift']
    tip = r+d*L+n*lift
    reach = W+.03
    low = np.minimum(r, tip)-reach
    high = np.maximum(r, tip)+reach
    a = np.clip(np.floor(low/VS).astype(int)-lo, 0, np.array(shape)-1)
    z = np.clip(np.ceil(high/VS).astype(int)-lo+1, 0, np.array(shape))
    sl = tuple(slice(int(i), int(j)) for i, j in zip(a, z))
    grids = [(lo[i]+np.arange(s.start, s.stop))*VS for i, s in enumerate(sl)]
    GX, GY, GZ = np.meshgrid(*grids, indexing='ij')
    qx, qy, qz = GX-r[0], GY-r[1], GZ-r[2]
    u = qx*d[0]+qy*d[1]+qz*d[2]
    v = qx*n[0]+qy*n[1]+qz*n[2]
    w = qx*b[0]+qy*b[1]+qz*b[2]
    tt = np.clip(u/L, 0, 1)
    vv = v-lift*tt*tt
    # A leaf: narrow at the root, widest near two fifths of the way, a pointed tip; flat across the surface.
    omega = W*np.sin(np.pi*tt**.7)**.8+.004
    tau = T*(1-.55*tt)+.003
    ell = np.sqrt((w/omega)**2+(vv/tau)**2)
    value = (ell-1)*np.minimum(omega, tau)
    along = np.abs(u-np.clip(u, 0, L))
    value = np.where((value < 0) & (along == 0), value, np.hypot(np.maximum(value, 0), along))
    lock_field[sl] = np.minimum(lock_field[sl], value.astype(np.float32))

combined = np.minimum(smin(shaped, lock_field, args.root_blend), BAND).astype(np.float32)
del lock_field, shaped, trimmed

out_grid = vdb.FloatGrid()
out_grid.background = BAND
out_grid.copyFromArray(combined, ijk=(0, 0, 0))
vertices, tri_out, quads = out_grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
vertices = (vertices.astype(np.float64)+lo)*VS
faces = [tuple(t) for t in tri_out.tolist()]+[tuple(q) for q in quads.tolist()]
materials = list(head.data.materials)
mesh = bpy.data.meshes.new('Head skin with cupped ear front')
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
    """Delete whole disconnected pieces below a size (spike remnants the cup cut severed), recording them."""
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
            dropped.append({'vertices': len(group),
                            'bounds': [[min(v.co[i] for v in group) for i in range(3)],
                                       [max(v.co[i] for v in group) for i in range(3)]]})
            bmesh.ops.delete(bm, geom=list(group), context='VERTS')
    bm.to_mesh(obj.data)
    bm.free()
    return dropped


removed_pieces = remove_floating_pieces(head, 20000)
require_single_closed_mesh(head, args.out, 'Head skin with cupped ear front')
after = mesh_stats(head)

# Deviation from the warped input, outside the ear-front window (should be within about a voxel).
rng2 = np.random.default_rng(1)
sample = rng2.choice(len(mesh.vertices), size=min(60000, len(mesh.vertices)), replace=False)
outside, inside_edit = [], []
for index in sample:
    co = M@mesh.vertices[int(index)].co
    _, _, _, distance = old_tree.find_nearest(co)
    (inside_edit if (abs(co.x) > .26 and -.16 < co.z < .46) else outside).append(distance)
outside, inside_edit = np.array(outside), np.array(inside_edit)

bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
summary = {
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'earWarpSha256': digest(Path(__file__).resolve().parent/'ear_warp.py'),
    'scope': 'Ear fan front: lobe-height warp, fringe trim, cupped inner ear cut, leaf locks; face and other objects preserved',
    'parameters': {k: (str(v) if isinstance(v, Path) else v) for k, v in vars(args).items() if k not in ('scene', 'out')},
    'warp': warp_record, 'cupOutline': CUP, 'lockCount': len(locks), 'lockRejected': rejected, 'locks': locks,
    'removedFlecks': removed_flecks, 'removedFloatingPieces': removed_pieces, 'skinBefore': before, 'skinAfter': after,
    'deviationFromWarpedInput': {
        'outsideLobeWindow': {'samples': int(len(outside)), 'maximum': float(outside.max()) if len(outside) else None,
                              'p99': float(np.percentile(outside, 99)) if len(outside) else None},
        'insideLobeWindow': {'samples': int(len(inside_edit)), 'maximum': float(inside_edit.max()) if len(inside_edit) else None,
                             'p99': float(np.percentile(inside_edit, 99)) if len(inside_edit) else None}},
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']},
}
(args.out/'ear-front.json').write_text(json.dumps(summary, indent=2)+'\n')
print('ear front ok', json.dumps({'before': before, 'after': after, 'locks': len(locks)}))
