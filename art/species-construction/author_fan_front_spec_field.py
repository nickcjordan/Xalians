"""Rebuild the Akinza ear fan front from the R03 spec's structure tables, in field space.

Run with Blender: -b --factory-startup --python author_fan_front_spec_field.py --
  --scene <head.blend> --out <new-dir> --spec docs/design/species-construction/akinza/loop/specs/R03.md [options]

The spec (specs/R03.md, section 2) lists, for each ear, 24 coat locks (10 primary edge locks P, 9 fill locks F,
5 cup-rim locks M) and 5 pale inner-ear tuft locks T, each with root, tip, length, width, thickness and front depth.
The tables are parsed from the spec itself, so a corrected spec is rebuilt without editing this script. This stage:

  1. Converts the closed skin to an OpenVDB level set and reads, per (x, z) column, the front and rear surface.
  2. Resets the fan's front to the spec's depth plan (section 3): a plate whose front lies .010 behind the coat
     locks, a smooth concave cup floor inside the cup polygon, and no rolled top lip. Material in front of the
     plan is cut away; the cup pit is filled forward to the floor. The rear is never touched.
  3. Insets the fan's in-plane outline (default .008 figure heights outer and lower, .003 on top) so thorns and
     crinkle disappear and the locks' tips become the outline.
  4. Adds every lock as a distance-field leaf (soft lens section, pointed tip) with the table's sizes, directions
     and depths, then the tuft locks with a smaller blend so their tips stay separate.
  5. Meshes the union once. Faces on the tuft locks receive the material `Pale inner-ear coat` (assign only; the
     skin stays one closed mesh). The assembly script carries that material through its remesh.

Coordinates. Head-local (x, y, z) maps to world (.5x, .5y-.02, .5z+.635). The spec's fit frame (x across and y
down from the crown, in figure heights of 1.8605; df = world y / 1.8605, front negative) maps to head-local as
x = 3.721 xf, z = .537-3.721 yf, y = 3.721 df+.04. Eyes, lids, nose and mouth are separate objects and do not move.
Akinza-specific. Every parameter, lock and measurement is recorded in fan-front.json.
"""
import argparse
import json
import math
import re
from pathlib import Path
import sys

import bpy
import bmesh
import numpy as np
import openvdb as vdb
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import material, mesh_stats, remove_voxel_specks, require_single_closed_mesh, sha
from study_provenance import snapshot

parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--spec', type=Path, required=True)
parser.add_argument('--voxel', type=float, default=.0025)
# Depth plan and plate.
parser.add_argument('--plate-offset', type=float, default=.006, help='plate front behind the coat-front plan, figure heights')
parser.add_argument('--min-thickness', type=float, default=.010, help='the plate keeps at least this much behind its front, figure heights')
parser.add_argument('--no-plan', action='store_true', help='skip the depth plan (cut and fill)')
parser.add_argument('--plan-u0', type=float, default=.090, help='depth plan starts to apply here (|x|, figure heights)')
parser.add_argument('--plan-ramp', type=float, default=.010)
parser.add_argument('--plan-y-full', type=float, default=.165, help='below this y (down from crown) the plan applies fully')
parser.add_argument('--plan-y-end', type=float, default=.192)
parser.add_argument('--cup-edge', type=float, default=.012, help='transition width from plate to cup floor, figure heights')
parser.add_argument('--plan-smooth', type=float, default=.008, help='gaussian sigma of the cut surface and the rear map, head-local')
parser.add_argument('--clamp', type=float, default=.030, help='below this y (down from the crown) the plan keeps min-thickness of body behind it')
parser.add_argument('--backing-thick', type=float, default=.03, help='thickness (figure heights) of the plate slab that keeps the old silhouette where the cut emptied a column (0 = off)')
parser.add_argument('--fill-depth', type=float, default=.25, help='thickness of the cup fill slab behind the cut surface, head-local')
# Outline inset.
parser.add_argument('--inset-outer', type=float, default=0., help='in-plane inset of the fan outline, figure heights (0 = off); it also trims the fan rear, so the first build left it off')
parser.add_argument('--inset-top', type=float, default=.003)
parser.add_argument('--inset-top-band', type=float, default=.03)
parser.add_argument('--inset-x-min', type=float, default=.100, help='the inset starts at this |x|, figure heights')
# Locks.
parser.add_argument('--blend-coat', type=float, default=.020, help='smooth union radius, coat locks, head-local')
parser.add_argument('--blend-tuft', type=float, default=.012)
parser.add_argument('--length-scale', type=float, default=1.0)
parser.add_argument('--width-scale', type=float, default=1.0)
parser.add_argument('--thick-scale', type=float, default=1.0)
parser.add_argument('--tuft-width-scale', type=float, default=1.4)
parser.add_argument('--tuft-length-scale', type=float, default=1.15)
parser.add_argument('--tuft-thick-scale', type=float, default=1.3)
parser.add_argument('--tuft-root-extend', type=float, default=.012, help='tuft roots start this far inside the skull side, figure heights')
parser.add_argument('--tuft-depth-shift', type=float, default=0., help='shift tuft depth, figure heights (positive = rearward)')
parser.add_argument('--min-half', type=float, default=.0035, help='smallest half width and half thickness of a lock, head-local')
parser.add_argument('--no-coat', action='store_true')
parser.add_argument('--no-tuft', action='store_true')
parser.add_argument('--keep', type=str, default='PFM', help='coat lock families to build')
parser.add_argument('--rear-margin', type=float, default=.004, help='locks are clipped this far in front of the old rear, head-local')
parser.add_argument('--pale-tol', type=float, default=.006)
parser.add_argument('--pale-gray', type=float, default=.58)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.scene, args.spec])

K = 3.721          # figure heights to head-local (2 x 1.8605)
Z0 = .537          # head-local z of the crown line (y = 0 in the fit frame)
Y0 = .04           # head-local y offset (df = 0)


def to_local(xf, yf, df):
    return K*xf, Z0-K*yf, K*df+Y0


# ---------------------------------------------------------------------------------------------- spec tables
spec_text = args.spec.read_text(encoding='utf-8')
NUM = r'([+-]?\d*\.\d+)'
row_re = re.compile(r'^\|\s*([LR][PFMT]\d+)\s*\|\s*\(' + NUM + r',\s*' + NUM + r'\)\s*\|\s*\(' + NUM + r',\s*' + NUM +
                    r'\)\s*\|\s*' + NUM + r'\s*\|\s*' + NUM + r'\s*/\s*' + NUM + r'\s*\|\s*' + NUM + r'\s*\|\s*([+-]?\d+)\s*\|\s*'
                    + NUM + r'\s*/\s*' + NUM + r'\s*\|', re.M)
spec_locks = []
for m in row_re.finditer(spec_text):
    v = [float(g) if i else g for i, g in enumerate(m.groups())]
    name = v[0]
    spec_locks.append({'name': name, 'side': 1 if name[0] == 'L' else -1, 'family': name[1],
                       'root': (v[1], v[2]), 'tip': (v[3], v[4]), 'length': v[5], 'width_root': v[6], 'width_mid': v[7],
                       'thick': v[8], 'dir': v[9], 'depth_root': v[10], 'depth_tip': v[11]})
if len(spec_locks) != 58:
    raise ValueError(f'expected 58 lock rows in the spec, parsed {len(spec_locks)}')
cup_points = {}
for side, label in ((1, 'L'), (-1, 'R')):
    m = re.search(r'^- ' + label + r': (\(.*?)Area', spec_text, re.M | re.S)
    pts = re.findall(r'\(' + NUM + r',\s*' + NUM + r'\)', m.group(1))
    cup_points[side] = np.array([(float(a), float(b)) for a, b in pts])
    if len(pts) < 8:
        raise ValueError('cup polygon not parsed')

# Depth plan (spec section 3): front depth df against |x| in figure heights.
PLAN_U = np.array([.10, .13, .16, .19, .23, .27])
PLAN_COAT = np.array([-.040, -.030, -.014, .008, .016, .010])
FLOOR_U = np.array([.10, .13, .16, .19])
FLOOR_DF = np.array([-.026, -.010, .006, .020])

# ---------------------------------------------------------------------------------------------- skin
bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
head = max(meshes, key=lambda o: len(o.data.vertices))
require_single_closed_mesh(head, args.out, 'Head skin before the R03 fan front')
before = mesh_stats(head)
M = head.matrix_world.copy()
VS = args.voxel
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
hi[0] += int(round(.06/VS))       # room for the tips that stand beyond the old span
lo[0] -= int(round(.06/VS))
shape = tuple(int(v) for v in hi-lo+1)
field = np.empty(shape, dtype=np.float32)
grid.copyToArray(field, ijk=tuple(int(v) for v in lo))
X, Y, Z = [(lo[i]+np.arange(shape[i]))*VS for i in range(3)]
print('field', shape, 'voxel', VS)


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


def smin(a, b, k):
    h = np.clip(.5+.5*(b-a)/k, 0, 1)
    return b*(1-h)+a*h-k*h*(1-h)


def polygon_sdf(px, pz, poly):
    px = np.asarray(px, dtype=float)
    pz = np.asarray(pz, dtype=float)
    d = np.full(px.shape, 1e9)
    inside = np.zeros(px.shape, dtype=bool)
    n = len(poly)
    for i in range(n):
        a, b = poly[i], poly[(i+1) % n]
        e = b-a
        w = np.stack([px-a[0], pz-a[1]], axis=-1)
        h = np.clip((w@e)/(e@e), 0, 1)
        d = np.minimum(d, np.linalg.norm(w-h[..., None]*e, axis=-1))
        cond = ((a[1] > pz) != (b[1] > pz))
        xint = a[0]+(pz-a[1])*(b[0]-a[0])/np.where(b[1] != a[1], b[1]-a[1], 1)
        inside ^= cond & (px < xint)
    return np.where(inside, -d, d)


def gauss2d(a, sigma):
    radius = int(math.ceil(3*sigma))
    kernel = np.exp(-.5*(np.arange(-radius, radius+1)/sigma)**2)
    kernel /= kernel.sum()
    for axis in (0, 1):
        moved = np.moveaxis(a, axis, 0)
        padded = np.pad(moved, [(radius, radius), (0, 0)], mode='edge')
        out = np.zeros_like(moved)
        for k, w in enumerate(kernel):
            out += w*padded[k:k+moved.shape[0]]
        a = np.moveaxis(out, 0, axis)
    return a


def propagate(values, known):
    """Fill unknown cells from their nearest known neighbors (iterated), for smooth floor and rear maps."""
    filled = np.where(known, values, 0.0).astype(np.float64)
    known = known.copy()
    for _ in range(600):
        if known.all():
            break
        s = np.zeros_like(filled)
        c = np.zeros(filled.shape)
        base = np.where(known, filled, 0.0)
        for axis in (0, 1):
            for shift in (1, -1):
                s += np.roll(base, shift, axis=axis)
                c += np.roll(known.astype(float), shift, axis=axis)
        fresh = (~known) & (c > 0)
        filled = np.where(fresh, s/np.maximum(c, 1), filled)
        known |= fresh
    return filled


# ---------------------------------------------------------------------------------------------- front and rear maps
side_cols = {1: np.where(X > .26)[0], -1: np.where(X < -.26)[0]}
rows_z = np.where((Z > -.34) & (Z < .62))[0]
r0, r1 = rows_z[0], rows_z[-1]+1
SZ = Z[r0:r1]
maps = {}
for side, cols in side_cols.items():
    c0, c1 = cols[0], cols[-1]+1
    sub = field[c0:c1, :, r0:r1]
    solid = sub < 0
    has = solid.any(axis=1)
    first = np.clip(np.argmax(solid, axis=1), 1, len(Y)-1)
    last = np.clip(len(Y)-1-np.argmax(solid[:, ::-1, :], axis=1), 0, len(Y)-2)
    f_out = np.take_along_axis(sub, (first-1)[:, None, :], axis=1)[:, 0, :]
    f_in = np.take_along_axis(sub, first[:, None, :], axis=1)[:, 0, :]
    t1 = np.clip(f_out/np.where(f_out != f_in, f_out-f_in, 1), 0, 1)
    front = np.where(has, Y[first-1]+t1*(Y[first]-Y[first-1]), np.nan)
    r_in = np.take_along_axis(sub, last[:, None, :], axis=1)[:, 0, :]
    r_out = np.take_along_axis(sub, (last+1)[:, None, :], axis=1)[:, 0, :]
    t2 = np.clip(r_in/np.where(r_in != r_out, r_in-r_out, 1), 0, 1)
    rear = np.where(has, Y[last]+t2*(Y[last+1]-Y[last]), np.nan)
    del solid, f_out, f_in, r_in, r_out
    maps[side] = {'c0': c0, 'c1': c1, 'has': has, 'front': front, 'rear': rear,
                  'front_f': propagate(front, has), 'rear_f': propagate(rear, has)}
    print('maps', side, has.shape, 'footprint voxels', int(has.sum()))


def edt_inside(has, weight_mask=None):
    """Signed distance to the footprint boundary: negative inside. Brute force over boundary cells, in chunks."""
    inner = has.copy()
    inner[1:] &= has[:-1]
    inner[:-1] &= has[1:]
    inner[:, 1:] &= has[:, :-1]
    inner[:, :-1] &= has[:, 1:]
    edge = has & ~inner
    ei, ek = np.nonzero(edge)
    # Boundary samples between has and not-has: use the edge cells themselves (half-voxel bias is below tolerance).
    bpts = np.stack([ei, ek], axis=1).astype(np.float32)
    ii, kk = np.meshgrid(np.arange(has.shape[0]), np.arange(has.shape[1]), indexing='ij')
    flat = np.stack([ii.ravel(), kk.ravel()], axis=1).astype(np.float32)
    dist = np.empty(len(flat), dtype=np.float32)
    for s in range(0, len(flat), 4000):
        part = flat[s:s+4000]
        d2 = ((part[:, None, 0]-bpts[None, :, 0])**2+(part[:, None, 1]-bpts[None, :, 1])**2).min(axis=1)
        dist[s:s+4000] = np.sqrt(d2)
    dist = dist.reshape(has.shape)*VS
    return np.where(has, -(dist+.5*VS), dist-.5*VS)


# ---------------------------------------------------------------------------------------------- 1. plan: cut and fill
# The cut surface is a smooth function of (x, z) built from the depth plan, never from the noisy old front: everything
# in front of it goes. A fill slab behind the same surface is added only inside the cup mask, where the old cup is a pit.
plan_record = {'applied': not args.no_plan}
BIG = 1.0
sm = args.plan_smooth/VS
for side, mp in maps.items():
    c0, c1 = mp['c0'], mp['c1']
    SXs = X[c0:c1]
    xf = SXs[:, None]/K*np.ones((1, len(SZ)))
    yf = (Z0-SZ[None, :])/K*np.ones((len(SXs), 1))
    u = np.abs(xf)
    rear_f, front_f, has = mp['rear_f'], mp['front_f'], mp['has']
    plate_df = np.interp(u, PLAN_U, PLAN_COAT)+args.plate_offset
    slope = (FLOOR_DF[-1]-FLOOR_DF[-2])/(FLOOR_U[-1]-FLOOR_U[-2])
    floor_df = np.where(u > FLOOR_U[-1], FLOOR_DF[-1]+slope*(u-FLOOR_U[-1]), np.interp(u, FLOOR_U, FLOOR_DF))
    cup_sdf = polygon_sdf(xf, yf, cup_points[side])
    c = smoothstep((-cup_sdf+.5*args.cup_edge)/args.cup_edge)
    target = K*(plate_df*(1-c)+floor_df*c)+Y0
    rear_s = gauss2d(rear_f, sm)
    # Keep material behind the plan in the wing and cup rows; the top band has no clamp (its slivers and lip go).
    wcl = smoothstep((yf-args.clamp-.0)/.02)
    target = target+wcl*(np.minimum(target, rear_s-K*args.min_thickness)-target)
    target = gauss2d(target, sm)
    w = smoothstep((u-args.plan_u0)/args.plan_ramp)*(1-smoothstep((yf-args.plan_y_full)/(args.plan_y_end-args.plan_y_full)))
    y_cut = target-(1-w)*.6
    fill_back = np.minimum(y_cut+args.fill_depth, rear_s-2*VS)
    mp.update({'w': w, 'y_cut': y_cut, 'fill_back': fill_back, 'c': c, 'u': u, 'xf': xf, 'yf': yf, 'cup_sdf': cup_sdf, 'target': target})
    plan_record[str(side)] = {
        'cutMax': float(np.nanmax(np.where((w > .5) & has, y_cut-front_f, np.nan)))/K,
        'fillMax': float(np.nanmax(np.where((w > .5) & has, front_f-y_cut, np.nan)))/K}

for side, mp in maps.items():
    c0, c1 = mp['c0'], mp['c1']
    piece = field[c0:c1, :, r0:r1]
    yy = Y[None, :, None]
    if not args.no_plan:
        y_cut = mp['y_cut'][:, None, :]
        w = mp['w'][:, None, :]
        c = mp['c'][:, None, :]
        fill = np.maximum(y_cut-yy, yy-mp['fill_back'][:, None, :])
        want = (c > .02) & (w > .95) & (mp['has'][:, None, :])
        fill = np.where(want, fill, BAND)
        piece = np.minimum(piece, fill)
        cut = np.where(w > .02, y_cut-yy, -BAND)
        piece = np.maximum(piece, cut)
        del fill, cut
    if args.inset_outer > 0:
        dfoot = edt_inside(mp['has'])             # negative inside
        inside = -dfoot
        xf, yf, u = mp['xf'], mp['yf'], mp['u']
        top_z = np.full(len(X[c0:c1]), np.nan)
        for i in range(len(top_z)):
            ks = np.where(mp['has'][i])[0]
            if len(ks):
                top_z[i] = SZ[ks[-1]]
        top_dist = (top_z[:, None]-SZ[None, :])/K
        near_top = (np.nan_to_num(top_dist, nan=9) < args.inset_top_band) & (u < .25)
        near_top = gauss2d(near_top.astype(np.float64), .006/VS)
        r = (args.inset_outer+(args.inset_top-args.inset_outer)*np.clip(near_top, 0, 1))*K
        w_er = smoothstep((u-args.inset_x_min)/.02)*(1-smoothstep((yf-args.plan_y_full)/(args.plan_y_end-args.plan_y_full)))
        g = np.where(w_er > .02, (r-inside)*np.clip(w_er*2, 0, 1)+(-.2)*(1-np.clip(w_er*2, 0, 1)), -.2)
        piece = np.maximum(piece, g[:, None, :].astype(np.float32))
        mp['inset'] = {'meanInset': float(np.mean(r))/K}
    field[c0:c1, :, r0:r1] = np.clip(piece, -BAND, BAND)
    del piece

# ---------------------------------------------------------------------------------------------- 2. locks
def lock_leaf(spec, scale_w, scale_t, root_extend=0., scale_l=None):
    """Return (box slices, values) for one lock: a soft lens along an in-plane axis, depth sheared root to tip."""
    side = spec['side']
    rx, rz, ry = to_local(spec['root'][0], spec['root'][1], spec['depth_root'])
    tx, tz, ty = to_local(spec['tip'][0], spec['tip'][1], spec['depth_tip'])
    d2 = np.array([tx-rx, tz-rz])
    L0 = float(np.hypot(*d2))
    e1 = d2/L0
    if root_extend > 0:
        ext = K*root_extend
        rx, rz = rx-e1[0]*ext, rz-e1[1]*ext
        ry = ry-(ty-ry)/L0*ext
        L0 += ext
    L = L0*(args.length_scale if scale_l is None else scale_l)
    tx, tz = rx+e1[0]*L, rz+e1[1]*L
    e2 = np.array([-e1[1], e1[0]])
    Wr, Wm, T = K*spec['width_root']*scale_w, K*spec['width_mid']*scale_w, K*spec['thick']*scale_t
    reach = max(Wm, T)+.04
    low = np.array([min(rx, tx)-reach, min(ry, ty)-.03-T, min(rz, tz)-reach])
    high = np.array([max(rx, tx)+reach, max(ry, ty)+.03+2*T, max(rz, tz)+reach])
    a = np.clip(np.floor(low/VS).astype(int)-lo, 0, np.array(shape)-1)
    z = np.clip(np.ceil(high/VS).astype(int)-lo+1, 0, np.array(shape))
    sl = tuple(slice(int(i), int(j)) for i, j in zip(a, z))
    grids = [(lo[i]+np.arange(s.start, s.stop))*VS for i, s in enumerate(sl)]
    GX, GY, GZ = np.meshgrid(*grids, indexing='ij')
    qx, qz = GX-rx, GZ-rz
    s_ = qx*e1[0]+qz*e1[1]
    w_ = qx*e2[0]+qz*e2[1]
    t = np.clip(s_/L, 0, 1)
    y_front = ry+(ty-ry)*t
    vv = GY-y_front
    prof = np.where(t < .4, Wr+(Wm-Wr)*smoothstep(t/.4), Wm*np.clip(1-(t-.4)/.6, 0, 1)**1.4)
    half_w = np.maximum(.5*prof, args.min_half)
    half_t = np.maximum(.5*T*np.interp(t, [0, .4, .9, 1], [.8, 1., .4, .08]), args.min_half)
    ell = np.sqrt((w_/half_w)**2+((vv-half_t)/half_t)**2)
    value = (ell-1)*np.minimum(half_w, half_t)
    along = np.maximum(-s_, s_-L)
    along = np.maximum(along, 0)
    value = np.where((value < 0) & (along == 0), value, np.hypot(np.maximum(value, 0), along))
    return sl, value.astype(np.float32), GX, GY, GZ, {
        'name': spec['name'], 'rootLocal': [rx, ry, rz], 'tipLocal': [tx, ty, tz], 'length': L, 'halfWidthMid': float(.5*Wm),
        'halfThickMid': float(.5*T)}


# Rear map over the whole box, for clipping locks to the old rear (nearest column value outside the footprint).
rear_all = np.zeros((shape[0], len(SZ)), dtype=np.float32)
for side, mp in maps.items():
    rear_all[mp['c0']:mp['c1']] = mp['rear_f']


def rear_limit(GX, GZ):
    i = np.clip(np.round((GX[:, 0, :]-X[0])/VS).astype(int), 0, shape[0]-1)
    k = np.clip(np.round((GZ[:, 0, :]-SZ[0])/VS).astype(int), 0, len(SZ)-1)
    return rear_all[i, k][:, None, :]


coat_field = np.full(shape, BAND, dtype=np.float32)
tuft_field = np.full(shape, BAND, dtype=np.float32)
records, tuft_boxes = [], []
for spec in spec_locks:
    fam = spec['family']
    if fam == 'T':
        if args.no_tuft:
            continue
        spec = dict(spec)
        spec['depth_root'] += args.tuft_depth_shift
        spec['depth_tip'] += args.tuft_depth_shift
        sl, val, GX, GY, GZ, rec = lock_leaf(spec, args.tuft_width_scale, args.tuft_thick_scale, args.tuft_root_extend, args.tuft_length_scale)
        target_field = tuft_field
    else:
        if args.no_coat or fam not in args.keep:
            continue
        sl, val, GX, GY, GZ, rec = lock_leaf(spec, args.width_scale, args.thick_scale)
        target_field = coat_field
    # Rear clip: no lock stands behind the old rear surface.
    clip = GY-(rear_limit(GX, GZ)-args.rear_margin)
    val = np.maximum(val, clip.astype(np.float32))
    target_field[sl] = np.minimum(target_field[sl], val)
    if fam == 'T':
        tuft_boxes.append((sl, val))
    records.append(rec)
print('locks built', len(records))

combined = smin(field, coat_field, args.blend_coat) if not args.no_coat else field
combined = np.minimum(combined, BAND)
if not args.no_tuft:
    combined = smin(combined, tuft_field, args.blend_tuft)
combined = np.minimum(combined, BAND).astype(np.float32)
del coat_field

# 3. Backing: every (x, z) column of the old silhouette that the cut emptied (thin lips, slivers, thorns) gets a thin slab
# on the plate plane, so the silhouette never shrinks (the back-view and side fits are measured on it) and the notches
# between locks show the plate, as the spec's fan body does.
backing_record = {'applied': args.backing_thick > 0}
if args.backing_thick > 0 and not args.no_plan:
    for side, mp in maps.items():
        c0, c1 = mp['c0'], mp['c1']
        sub = combined[c0:c1, :, r0:r1]
        has_new = (sub < 0).any(axis=1)
        lost = mp['has'] & ~has_new & (mp['w'] > .5)
        y0 = (mp['target'])[:, None, :]
        yy = Y[None, :, None]
        slab = np.maximum(y0-yy, yy-(y0+K*args.backing_thick))
        sub = np.minimum(sub, np.where(lost[:, None, :], slab, BAND).astype(np.float32))
        combined[c0:c1, :, r0:r1] = sub
        backing_record[str(side)] = {'columns': int(lost.sum()), 'footprint': int(mp['has'].sum())}
        del sub, slab
    print('backing', backing_record)

out_grid = vdb.FloatGrid()
out_grid.background = BAND
out_grid.copyFromArray(combined, ijk=(0, 0, 0))
vertices, tri_out, quads = out_grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
vertices = (vertices.astype(np.float64)+lo)*VS
faces = [tuple(t) for t in tri_out.tolist()]+[tuple(q) for q in quads.tolist()]
materials = list(head.data.materials)
mesh = bpy.data.meshes.new('Head skin with spec fan front')
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
for mat in materials:
    mesh.materials.append(mat)
pale = material('Pale inner-ear coat', args.pale_gray)
mesh.materials.append(pale)
pale_index = len(mesh.materials)-1
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

# Pale material: faces whose centre lies on a tuft lock's surface.
pale_count = 0
if tuft_boxes:
    count = len(head.data.polygons)
    centers = np.empty(count*3, dtype=np.float32)
    head.data.polygons.foreach_get('center', centers)
    centers = centers.reshape(-1, 3).astype(np.float64)
    world = centers@np.array(M)[:3, :3].T+np.array(M)[:3, 3]
    index = np.round(world/VS).astype(int)-lo
    marked = np.zeros(count, dtype=bool)
    for sl, val in tuft_boxes:
        inside = np.ones(count, dtype=bool)
        for ax in range(3):
            inside &= (index[:, ax] >= sl[ax].start) & (index[:, ax] < sl[ax].stop)
        ids = np.nonzero(inside)[0]
        if not len(ids):
            continue
        loc = index[ids]-np.array([sl[0].start, sl[1].start, sl[2].start])
        v = val[loc[:, 0], loc[:, 1], loc[:, 2]]
        marked[ids[v <= args.pale_tol]] = True
    mats = np.zeros(count, dtype=np.int32)
    head.data.polygons.foreach_get('material_index', mats)
    mats[marked] = pale_index
    head.data.polygons.foreach_set('material_index', mats)
    head.data.update()
    pale_count = int(marked.sum())
require_single_closed_mesh(head, args.out, 'Head skin with spec fan front')
after = mesh_stats(head)

rng2 = np.random.default_rng(1)
sample = rng2.choice(len(mesh.vertices), size=min(60000, len(mesh.vertices)), replace=False)
outside = []
for idx in sample:
    co = M@mesh.vertices[int(idx)].co
    _, _, _, distance = old_tree.find_nearest(co)
    if abs(co.x) <= .30 or co.z <= -.12:
        outside.append(distance)
outside = np.array(outside)
top_after = float(max((M@v.co).z for v in mesh.vertices))
top_before = float(points[:, 2].max())
xs_after = np.array([(M@v.co).x for v in mesh.vertices])

bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
summary = {
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene), 'specSha256': sha(args.spec),
    'scope': 'Ear fan front rebuilt from the R03 spec tables: depth plan, outline inset, 24 coat locks and 5 tuft locks per side, pale tuft material',
    'parameters': {k: (str(v) if isinstance(v, Path) else v) for k, v in vars(args).items() if k not in ('scene', 'out')},
    'plan': plan_record, 'backing': backing_record, 'insetMean': {str(s): mp.get('inset') for s, mp in maps.items()},
    'skinTopZ': {'before': top_before, 'after': top_after}, 'spanX': {'after': [float(xs_after.min()), float(xs_after.max())]},
    'lockCount': len(records), 'paleFaces': pale_count, 'paleMaterialIndex': pale_index, 'locks': records,
    'removedFlecks': removed_flecks, 'removedFloatingPieces': removed_pieces, 'skinBefore': before, 'skinAfter': after,
    'deviationOutsideFanWindow': {'samples': int(len(outside)), 'maximum': float(outside.max()) if len(outside) else None,
                                  'p99': float(np.percentile(outside, 99)) if len(outside) else None},
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']},
}
(args.out/'fan-front.json').write_text(json.dumps(summary, indent=2)+'\n')
print('fan front ok', json.dumps({'before': before, 'after': after, 'locks': len(records), 'paleFaces': pale_count}))
