"""Author Akinza's trunk (R06) from parameters: lofted superellipse sections morphed into the native trunk field.

Run with Blender (through loop_tools.py blender, or as a recipe step):
  --python author_trunk_sections_field.py -- --body <shape.glb> --fairing <fairing.json> --spec <trunk-sections.json>
      --out <new-dir> [--voxel .0025]

Why this exists. reshape_torso_field.py resamples the trunk by mapping the measured edges of the previous mesh, so
every depth change also carries the old surface's belts and ledges (rounds 3, 9, 15). This tool sets the depth and
the cross section directly. Per height z a two-half superellipse is lofted from a station table (spec JSON), the
table is interpolated over figure height with a monotone cubic (PCHIP), and the closed body, as an OpenVDB level set,
is blended toward that loft inside a weight mask:

  SDF = (1 - w) SDF_native + w SDF_loft,     w = w_y * w_lat * w_arm * w_tail * w_reach

then meshed once. Units are the loop's fit units (fractions of the figure height H; y down from the crown, side view
facing image-left so a negative side x is forward; see specs/R06.md). Conversions, all parameters in the spec:
world z = floorZ + H (1 - y); world side y = sideOffset + H x; front half width about world x = centerX is H * half.

Section at height z (every value PCHIP-interpolated over y from the stations):
  front, back   side edges at the midline (fit x)
  split         where the widest line sits between them: d_w = front + split (back - front)
  halfWidth     front view half width of the widest line
  expFront, expBack  superellipse exponents of the front and back halves (2 = ellipse, 1.7 = keel, 2.5 = boxy)
  a station value of null means "not authored"; the nearest authored value is carried so the interpolation has data.
  fitNative true: the exponents and split are fitted by least squares to the native section at that row, outside the
  arm and tail-root masks (rump rows, where the spec only knows the edges). Rows with zero weight copy the row above.
  Front half: |x/a|^nF + |(d - d_w)/(d_w - front)|^nF = 1; back half the same with back - d_w and nB.

Weights (spec "weights"):
  y        smoothstep up between weights.y.top (default .26 to .32), 1, smoothstep down between weights.y.bottom
           (.50 to .58): R05 owns the neck above, R08 the thigh below.
  lateral  smoothstep from 1 at |x| = inner(y) to 0 at outer(y) (fit units, tables of [y, value] pairs, linear in y):
           the shoulders and arm root keep the native field above .36, the whole trunk is free from .40.
  arm      0 within armRadius + zeroMargin (world) of each arm's shoulder-elbow-wrist polyline (fairing armJoints,
           mirrored), 1 beyond armRadius + fullMargin.
  tail     0 within tail.zeroWithin of the first `segments` points of each fairing tailControls entry (tube along the
           control polyline, `segments` 1 = the first point only, the spec's rule), 1 beyond tail.fullAt.
  reach    1 within reach[0] of the loft surface, 0 beyond reach[1] outside it (world): the loft never reaches out to
           the tails, the arms or anything else that is not the trunk, so no field there is replaced by "outside".
Every ramp must be at least ten times longer than the relief change it carries (spec section 3); the tool records the
largest edge change per station so that can be checked.

Records: trunk-sections.json beside the output and `trunkSections` in the new fairing.json: per station the target and
the achieved front, back, depth and half width read from the final field, the fitted exponents, the weight, the profile
smoothness check (spec section 3: front edge at the midline, |x| .03 and .05, half width on the lines .05 and .10 world
behind the front; deviation from a local quadratic over nine samples at .005 spacing, before and after) and the largest
field change per station. Akinza-specific construction, not a species-general backend.
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
from mathutils import Matrix

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import material, mesh_stats, require_single_closed_mesh, sha
from study_provenance import snapshot

DEFAULTS = {
    'figureHeight': 1.8605, 'floorZ': -.957, 'sideOffset': -.0125, 'centerX': 0.0,
    'stations': [],
    'weights': {
        'y': {'top': [.26, .32], 'bottom': [.50, .58]},
        'lateral': {'inner': [[.36, .06], [.40, .30]], 'outer': [[.36, .10], [.40, .34]]},
        'arm': {'radius': .04, 'zeroMargin': .01, 'fullMargin': .07},
        'tail': {'zeroWithin': .09, 'fullAt': .14, 'segments': 1},
        'reach': [.03, .09],
    },
    'fitNative': {'expRange': [1.4, 3.2], 'expStep': .1, 'splitRange': [.40, .70], 'splitStep': .025, 'pointsMaxX': 1.15},
    'box': {'x': [-.30, .30], 'y': [-.30, .22], 'padZ': .03},
    'measure': {'stripFromY': .51, 'tailMask': False, 'maskOk': .9, 'stripX': [-.13, -.04], 'lines': [.05, .10]},
    'smoothness': {'y0': .30, 'y1': .56, 'step': .005, 'window': 9, 'limit': .0002, 'frontX': [0, .03, .05]},
}


def merge(base, extra):
    for key, value in extra.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            merge(base[key], value)
        else:
            base[key] = value
    return base


parser = argparse.ArgumentParser()
parser.add_argument('--body', type=Path, required=True)
parser.add_argument('--fairing', type=Path, required=True)
parser.add_argument('--spec', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--voxel', type=float, default=.0025)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
SPEC = merge(copy.deepcopy(DEFAULTS), json.loads(args.spec.read_text()))
record = json.loads(args.fairing.read_text())
if record['outputs']['shape.glb'] != sha(args.body):
    raise ValueError('Fairing record does not describe the supplied body')
provenance = snapshot(args.out, __file__, [args.body, args.fairing, args.spec])
H, FLOOR, OFF, CX = SPEC['figureHeight'], SPEC['floorZ'], SPEC['sideOffset'], SPEC['centerX']
VS = args.voxel
HALF_WIDTH = 18
BAND = HALF_WIDTH*VS
W = SPEC['weights']


# ---- numeric helpers ----------------------------------------------------------------------------------
def smooth(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


def pchip(xs, ys):
    """Monotone cubic Hermite interpolant (Fritsch-Carlson, as scipy's PchipInterpolator); constant outside the range."""
    xs, ys = np.asarray(xs, float), np.asarray(ys, float)
    h, delta = np.diff(xs), np.diff(ys)/np.diff(xs)
    n = len(xs)
    d = np.zeros(n)
    if n == 2:
        d[:] = delta[0]
    else:
        for k in range(1, n-1):
            if delta[k-1]*delta[k] > 0:
                w1, w2 = 2*h[k]+h[k-1], h[k]+2*h[k-1]
                d[k] = (w1+w2)/(w1/delta[k-1]+w2/delta[k])

        def end(h0, h1, d0, d1):
            e = ((2*h0+h1)*d0-h0*d1)/(h0+h1)
            if np.sign(e) != np.sign(d0):
                return 0.0
            if np.sign(d0) != np.sign(d1) and abs(e) > 3*abs(d0):
                return 3*d0
            return e
        d[0] = end(h[0], h[1], delta[0], delta[1])
        d[-1] = end(h[-1], h[-2], delta[-1], delta[-2])

    def f(x):
        x = np.clip(np.asarray(x, float), xs[0], xs[-1])
        i = np.clip(np.searchsorted(xs, x, side='right')-1, 0, n-2)
        t = (x-xs[i])/h[i]
        t2, t3 = t*t, t*t*t
        return ((2*t3-3*t2+1)*ys[i]+(t3-2*t2+t)*h[i]*d[i]+(-2*t3+3*t2)*ys[i+1]+(t3-t2)*h[i]*d[i+1])
    return f


def table_interp(table, y):
    """Linear interpolation of a [[y, value], ...] table, constant outside."""
    t = np.asarray(table, float)
    return float(np.interp(y, t[:, 0], t[:, 1]))


def fit_y(z):
    return 1-(z-FLOOR)/H


def world_z(y):
    return FLOOR+H*(1-y)


# ---- stations -> section parameter functions --------------------------------------------------------------
stations = SPEC['stations']
if len(stations) < 3:
    raise ValueError('The spec needs at least three stations')
ys_st = np.array([s['y'] for s in stations], float)
if np.any(np.diff(ys_st) <= 0):
    raise ValueError('Stations must be in increasing y')


def y_weight(y):
    t0, t1 = W['y']['top']
    b0, b1 = W['y']['bottom']
    return smooth((y-t0)/(t1-t0))*(1-smooth((y-b0)/(b1-b0)))


def carried(key, default=None):
    """Station values with nulls replaced by the nearest authored value (up, then down)."""
    vals = [s.get(key) for s in stations]
    if all(v is None for v in vals):
        return [default]*len(vals)
    out = list(vals)
    for i in range(len(out)):
        if out[i] is None:
            j = min((k for k, v in enumerate(vals) if v is not None), key=lambda k: abs(k-i))
            out[i] = vals[j]
    return out


# ---- native field ------------------------------------------------------------------------------------------
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(args.body.resolve()))
objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for obj in objects:
    transform = obj.matrix_world.copy()
    for vertex in obj.data.vertices:
        vertex.co = transform @ vertex.co
    obj.parent = None
    obj.matrix_world = Matrix.Identity(4)
    bm = bmesh.new(); bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.000001)
    bm.to_mesh(obj.data); bm.free()
body = max(objects, key=lambda o: len(o.data.vertices))
require_single_closed_mesh(body, args.out, 'Trunk sections input')
source_stats = mesh_stats(body)
body_material = body.data.materials[0] if body.data.materials else material('Continuous construction clay', .38)
body_name = body.name

body.data.calc_loop_triangles()
points = np.empty(len(body.data.vertices)*3, dtype=np.float32)
body.data.vertices.foreach_get('co', points)
points = points.reshape(-1, 3)
triangles = np.empty(len(body.data.loop_triangles)*3, dtype=np.int32)
body.data.loop_triangles.foreach_get('vertices', triangles)
triangles = triangles.reshape(-1, 3)
grid = vdb.FloatGrid.createLevelSetFromPolygons(
    points, triangles=triangles, transform=vdb.createLinearTransform(voxelSize=VS), halfWidth=HALF_WIDTH)

bx, by = SPEC['box']['x'], SPEC['box']['y']
pad_z = SPEC['box']['padZ']
z_top = world_z(W['y']['top'][0])+pad_z
z_bot = world_z(W['y']['bottom'][1])-pad_z
low = np.array([bx[0], by[0], z_bot])
high = np.array([bx[1], by[1], z_top])
lo_idx = np.floor(low/VS).astype(int)
hi_idx = np.ceil(high/VS).astype(int)
shape = tuple(int(v) for v in hi_idx-lo_idx+1)
native = np.empty(shape, dtype=np.float32)
grid.copyToArray(native, ijk=tuple(int(v) for v in lo_idx))
native = native.astype(np.float64)
xs = (lo_idx[0]+np.arange(shape[0]))*VS
ys = (lo_idx[1]+np.arange(shape[1]))*VS
zs = (lo_idx[2]+np.arange(shape[2]))*VS
X2, Y2 = xs[:, None], ys[None, :]

# ---- masks ---------------------------------------------------------------------------------------------------
joints = record.get('armJoints', {})
arm_lines = []
for side_key, sign in (('R', 1), ('L', -1)):
    chain = [joints.get(f'{n}.{side_key}') for n in ('shoulder', 'elbow', 'wrist')]
    if any(p is None for p in chain):
        mirror = [joints.get(f'{n}.{"L" if side_key == "R" else "R"}') for n in ('shoulder', 'elbow', 'wrist')]
        if any(p is None for p in mirror):
            continue
        chain = [[-p[0], p[1], p[2]] for p in mirror]
    arm_lines.append(np.asarray(chain, float))
tail_points = []
for control in record.get('tailControls', []):
    tail_points.append(np.asarray([c[:3] for c in control[:max(1, int(W['tail']['segments']))]], float))


def segment_distance(Xg, Yg, z, a, b):
    ba = b-a
    qx, qy, qz = Xg-a[0], Yg-a[1], z-a[2]
    h = np.clip((qx*ba[0]+qy*ba[1]+qz*ba[2])/float(ba@ba), 0, 1)
    return np.sqrt((qx-ba[0]*h)**2+(qy-ba[1]*h)**2+(qz-ba[2]*h)**2)


def polyline_distance(Xg, Yg, z, pts):
    if len(pts) == 1:
        return np.sqrt((Xg-pts[0][0])**2+(Yg-pts[0][1])**2+(z-pts[0][2])**2)
    return np.minimum.reduce([segment_distance(Xg, Yg, z, pts[i], pts[i+1]) for i in range(len(pts)-1)])


def arm_weight(z):
    r, z0, z1 = W['arm']['radius'], W['arm']['zeroMargin'], W['arm']['fullMargin']
    d = np.full((len(xs), len(ys)), 9.)
    for line in arm_lines:
        d = np.minimum(d, polyline_distance(X2, Y2, z, line))
    return smooth((d-(r+z0))/(z1-z0))


def tail_weight(z):
    z0, z1 = W['tail']['zeroWithin'], W['tail']['fullAt']
    d = np.full((len(xs), len(ys)), 9.)
    for pts in tail_points:
        d = np.minimum(d, polyline_distance(X2, Y2, z, pts))
    return smooth((d-z0)/(z1-z0))


def lateral_weight(y):
    inner, outer = table_interp(W['lateral']['inner'], y), table_interp(W['lateral']['outer'], y)
    ax = np.abs(X2-CX)/H
    return smooth((outer-ax)/(outer-inner))*np.ones((1, len(ys)))


# ---- fit exponents to the native section where the spec asks (fitNative) -------------------------------------
def native_slice(z):
    k = int(round((z-zs[0])/VS))
    return native[:, :, k]


def contour_points(S, mask_ok, xlim):
    """Sub-voxel zero crossings of the slice along x and y, away from masked voxels, inside |x - CX| <= xlim."""
    pts = []
    for axis in (0, 1):
        A = S if axis == 0 else S.T
        M = mask_ok if axis == 0 else mask_ok.T
        sign = A[:-1] < 0
        flip = sign != (A[1:] < 0)
        ii, jj = np.nonzero(flip & M[:-1] & M[1:])
        for i, j in zip(ii, jj):
            t = A[i, j]/(A[i, j]-A[i+1, j])
            if axis == 0:
                pts.append((xs[i]+t*VS, ys[j]))
            else:
                pts.append((xs[j], ys[i]+t*VS))
    pts = np.array(pts) if pts else np.zeros((0, 2))
    return pts[np.abs(pts[:, 0]-CX) <= xlim] if len(pts) else pts


def superellipse_k(px, pd, front, back, split, half, nf, nb, cx):
    dw = front+split*(back-front)
    u = np.abs(px-cx)/half
    front_half = pd < dw
    v = np.where(front_half, np.abs(pd-dw)/max(dw-front, 1e-6), np.abs(pd-dw)/max(back-dw, 1e-6))
    n = np.where(front_half, nf, nb)
    return (u**n+v**n)**(1/n)


fit_cfg = SPEC['fitNative']
fit_report = {}
st_front = [OFF+H*v for v in carried('front')]
st_back = [OFF+H*v for v in carried('back')]
st_half = [H*v for v in carried('halfWidth')]
st_split = carried('split', .58)
st_nf = carried('expFront', 2.0)
st_nb = carried('expBack', 2.0)
st_cx = [CX+H*(s.get('centerX') or 0) for s in stations]
prev = None
for i, s in enumerate(stations):
    if not s.get('fitNative'):
        prev = i
        continue
    z = world_z(s['y'])
    if y_weight(s['y']) <= 1e-6 and prev is not None:
        st_split[i], st_nf[i], st_nb[i] = st_split[prev], st_nf[prev], st_nb[prev]
        fit_report[str(s['y'])] = {'copiedFrom': stations[prev]['y'], 'reason': 'zero weight'}
        continue
    S = native_slice(z)
    ok = (arm_weight(z) > .999) & (tail_weight(z) > .999)
    pts = contour_points(S, ok, st_half[i]*fit_cfg['pointsMaxX'])
    inside_band = (pts[:, 1] > st_front[i]-.04) & (pts[:, 1] < st_back[i]+.06) if len(pts) else np.array([], bool)
    pts = pts[inside_band] if len(pts) else pts
    if len(pts) < 20:
        raise ValueError(f"fitNative: only {len(pts)} native contour points at y {s['y']}")
    e0, e1 = fit_cfg['expRange']
    exps = np.arange(e0, e1+1e-9, fit_cfg['expStep'])
    sp0, sp1 = fit_cfg['splitRange']
    splits = np.arange(sp0, sp1+1e-9, fit_cfg['splitStep'])
    best = None
    for sp in splits:
        for nf in exps:
            for nb in exps:
                k = superellipse_k(pts[:, 0], pts[:, 1], st_front[i], st_back[i], sp, st_half[i], nf, nb, st_cx[i])
                loss = float(np.mean((k-1)**2))
                if best is None or loss < best[0]:
                    best = (loss, sp, nf, nb)
    st_split[i], st_nf[i], st_nb[i] = best[1], best[2], best[3]
    fit_report[str(s['y'])] = {'split': best[1], 'expFront': best[2], 'expBack': best[3],
                               'rms': math.sqrt(best[0]), 'points': int(len(pts))}
    prev = i

fn_front = pchip(ys_st, st_front)
fn_back = pchip(ys_st, st_back)
fn_half = pchip(ys_st, st_half)
fn_split = pchip(ys_st, st_split)
fn_nf = pchip(ys_st, st_nf)
fn_nb = pchip(ys_st, st_nb)
fn_cx = pchip(ys_st, st_cx)


def section_params(z):
    y = fit_y(z)
    return (float(fn_front(y)), float(fn_back(y)), float(fn_split(y)), float(fn_half(y)),
            float(fn_nf(y)), float(fn_nb(y)), float(fn_cx(y)))


def loft_k(z):
    """k(x, y) of the section at z on the slice grid (k < 1 inside), with the section's own derivatives dk/dx, dk/dd."""
    front, back, split, half, nf, nb, cx = section_params(z)
    dw = front+split*(back-front)
    u = (X2-cx)/half
    dd = Y2-dw
    front_half = dd < 0
    h = np.where(front_half, dw-front, back-dw)
    v = dd/h
    n = np.where(front_half, nf, nb)
    au, av = np.abs(u)+1e-12, np.abs(v)+1e-12
    k = (au**n+av**n)**(1/n)
    kp = k**(1-n)
    kx = kp*au**(n-1)*np.sign(u)/half
    kd = kp*av**(n-1)*np.sign(v)/h
    return k, kx, kd


def loft_field(z):
    """Signed distance estimates to the loft surface at slice z, both (k - 1) / |grad k|: the first with the z change of
    the section in the gradient (the true normal distance near the surface, used to merge) and the second in the slice
    plane only (robust far from the surface, where fast-changing section parameters make the first collapse; used for
    the reach weight). Both unclamped."""
    k, kx, kd = loft_k(z)
    k_up, _, _ = loft_k(z+VS)
    k_dn, _, _ = loft_k(z-VS)
    kz = (k_up-k_dn)/(2*VS)
    planar = np.sqrt(kx*kx+kd*kd)
    grad = np.sqrt(planar*planar+kz*kz)
    return (k-1)/np.maximum(grad, 1e-6), (k-1)/np.maximum(planar, 1e-6)


# ---- the morph ---------------------------------------------------------------------------------------------------
final = native.copy()
reach0, reach1 = W['reach']
edge_change = {}
biggest = []
slice_weight = {}
for kz_i, z in enumerate(zs):
    y = fit_y(z)
    wy = float(y_weight(y))
    if wy <= 1e-9:
        continue
    loft, loft_plane = loft_field(z)
    w_lat, w_arm, w_tail = lateral_weight(y), arm_weight(z), tail_weight(z)
    w_reach = 1-smooth((loft_plane-reach0)/(reach1-reach0))   # reach reads the in-plane loft distance
    w = wy*w_lat*w_arm*w_tail*w_reach
    merged = (1-w)*native[:, :, kz_i]+w*np.clip(loft, -BAND, BAND)
    big = np.abs(merged-native[:, :, kz_i])
    ii, jj = np.unravel_index(np.argmax(big), big.shape)
    biggest.append({'change': float(big[ii, jj]), 'x': float(xs[ii]), 'y': float(ys[jj]), 'z': float(z), 'fitY': float(y),
                    'native': float(native[ii, jj, kz_i]), 'loft': float(loft[ii, jj]), 'loftPlane': float(loft_plane[ii, jj]),
                    'wLat': float(w_lat[ii, jj]), 'wArm': float(w_arm[ii, jj]), 'wTail': float(w_tail[ii, jj]),
                    'wReach': float(w_reach[ii, jj])})
    final[:, :, kz_i] = merged
    slice_weight[kz_i] = float(w.max())
final = np.clip(final, -BAND, BAND)
change = np.abs(final-native)
# where the surface moved: voxels that flipped sign (material removed or added), per station row and overall
flip_report = {}
for s_ in stations:
    k_i = int(round((world_z(s_['y'])-zs[0])/VS))
    a_, b_ = native[:, :, k_i] < 0, final[:, :, k_i] < 0
    entry = {}
    for name, sel in (('removed', a_ & ~b_), ('added', ~a_ & b_)):
        ii, jj = np.nonzero(sel)
        entry[name] = {'voxels': int(len(ii))}
        if len(ii):
            entry[name].update({'x': [float(xs[ii].min()), float(xs[ii].max())], 'y': [float(ys[jj].min()), float(ys[jj].max())]})
    flip_report[str(s_['y'])] = entry
for s in stations:
    k_i = int(round((world_z(s['y'])-zs[0])/VS))
    if 0 <= k_i < shape[2]:
        edge_change[str(s['y'])] = float(change[:, :, k_i].max())


# ---- measurement of the final (or native) field, in fit units -----------------------------------------------------
def crossings(line, coords):
    """Sub-voxel zero crossings of a 1-D field: list of (position, going_in) where going_in is outside -> inside."""
    out = []
    s = line < 0
    for i in np.nonzero(s[:-1] != s[1:])[0]:
        t = line[i]/(line[i]-line[i+1])
        out.append((coords[i]+t*(coords[i+1]-coords[i]), bool(s[i+1])))
    return out


def column_at(S, x):
    """Slice values along y at world x (linear in x)."""
    f = (x-xs[0])/VS
    i = int(np.clip(math.floor(f), 0, len(xs)-2))
    t = f-i
    return S[i]*(1-t)+S[i+1]*t


def row_at(S, y):
    f = (y-ys[0])/VS
    j = int(np.clip(math.floor(f), 0, len(ys)-2))
    t = f-j
    return S[:, j]*(1-t)+S[:, j+1]*t


def front_edge(S, x):
    c = [p for p, going_in in crossings(column_at(S, x), ys) if going_in]
    return c[0] if c else None


def back_edge(S, x, ok_at):
    """First exit behind the front edge; None if the exit lies in a masked voxel (arm or tail)."""
    col = column_at(S, x)
    cs = crossings(col, ys)
    f = next((i for i, (p, gi) in enumerate(cs) if gi), None)
    if f is None:
        return None
    for p, gi in cs[f+1:]:
        if not gi:
            return p if ok_at(x, p) else None
    return None


def half_extent(S, y, cx, ok_at):
    """Distance from cx to the first exit along +x and -x at world y; None when a masked voxel is reached first."""
    line = row_at(S, y)
    i0 = int(round((cx-xs[0])/VS))
    if line[i0] >= 0:
        return [None, None]
    out = []
    for step in (1, -1):
        i = i0
        found = None
        while 0 < i < len(xs)-1:
            if line[i] < 0 <= line[i+step]:
                t = line[i]/(line[i]-line[i+step])
                found = abs((xs[i]+t*step*VS)-cx)
                break
            if not ok_at(xs[i], y):
                break
            i += step
        out.append(found)
    return out


def make_ok(z):
    thr = SPEC['measure'].get('maskOk', .9)
    ok = arm_weight(z) > thr
    if SPEC['measure'].get('tailMask', False):
        ok = ok & (tail_weight(z) > thr)

    def ok_at(x, y):
        i = int(np.clip(round((x-xs[0])/VS), 0, len(xs)-1))
        j = int(np.clip(round((y-ys[0])/VS), 0, len(ys)-1))
        return bool(ok[i, j])
    return ok_at


def measure_station(field, s):
    z = world_z(s['y'])
    S = field[:, :, int(round((z-zs[0])/VS))]
    ok_at = make_ok(z)
    cfg = SPEC['measure']
    cx = float(fn_cx(s['y']))
    front = front_edge(S, cx)
    if front is None:
        return None
    if s['y'] <= cfg['stripFromY']:
        back = back_edge(S, cx, ok_at)
    else:
        cand = []
        for x in np.arange(cfg['stripX'][0], cfg['stripX'][1]+1e-9, VS*2):
            b = back_edge(S, x, ok_at)
            if b is not None:
                cand.append(b)
        back = max(cand) if cand else None
    half = None
    flagged = False
    if back is not None:
        widest = 0.0
        for y in np.arange(front+.02, back-.02, VS*2):
            e = half_extent(S, y, cx, ok_at)
            if None in e:
                flagged = True
                e = [v for v in e if v is not None]
            if e:
                widest = max(widest, sum(e)/len(e))
        half = widest
    to_fit_y = lambda w_: None if w_ is None else (w_-OFF)/H
    return {'front': to_fit_y(front), 'back': to_fit_y(back),
            'depth': None if back is None else (back-front)/H,
            'halfWidth': None if half is None else half/H, 'armOrTailMaskHit': flagged}


def line_profiles(field):
    """The smoothness-check lines, one value per sample row, in fit units (None where not measurable)."""
    cfg = SPEC['smoothness']
    rows = np.arange(cfg['y0'], cfg['y1']+1e-9, cfg['step'])
    lines = {f'front|x|={fx:g}': [] for fx in cfg['frontX']}
    for off in SPEC['measure']['lines']:
        lines[f'halfWidth@{off:g}behindFront'] = []
    for y in rows:
        z = world_z(y)
        S = field[:, :, int(round((z-zs[0])/VS))]
        ok_at = make_ok(z)
        cx = float(fn_cx(y))
        front0 = front_edge(S, cx)
        for fx in cfg['frontX']:
            v = front_edge(S, cx+fx*H)
            lines[f'front|x|={fx:g}'].append(None if v is None else (v-OFF)/H)
        for off in SPEC['measure']['lines']:
            if front0 is None:
                lines[f'halfWidth@{off:g}behindFront'].append(None)
                continue
            e = half_extent(S, front0+off, cx, ok_at)
            lines[f'halfWidth@{off:g}behindFront'].append(None if None in e else float(sum(e)/2/H))
    return rows, lines


def quadratic_deviation(rows, values, window):
    """Largest departure of a sample from the quadratic fitted over its centred window (None entries break windows)."""
    half = window//2
    worst, at = 0.0, None
    for i in range(half, len(rows)-half):
        seg = values[i-half:i+half+1]
        if any(v is None for v in seg):
            continue
        coef = np.polyfit(rows[i-half:i+half+1]-rows[i], seg, 2)
        dev = abs(seg[half]-coef[2])
        if dev > worst:
            worst, at = dev, float(rows[i])
    return worst, at


def smoothness(field):
    rows, lines = line_profiles(field)
    window = SPEC['smoothness']['window']
    out = {}
    for name, values in lines.items():
        dev, at = quadratic_deviation(rows, values, window)
        out[name] = {'maxDeviation': dev, 'atY': at, 'valid': int(sum(v is not None for v in values))}
    return out


report_stations = []
for i, s in enumerate(stations):
    target = {'front': s.get('front'), 'back': s.get('back'), 'halfWidth': s.get('halfWidth')}
    target['depth'] = None if None in (target['front'], target['back']) else target['back']-target['front']
    achieved = measure_station(final, s)
    before = measure_station(native, s)
    row = {'y': s['y'], 'weightY': float(y_weight(s['y'])), 'target': target, 'achieved': achieved, 'native': before,
           'params': {'split': st_split[i], 'expFront': st_nf[i], 'expBack': st_nb[i]},
           'maxFieldChange': edge_change.get(str(s['y']))}
    if achieved and before:
        row['deltaFromNative'] = {k: (None if achieved[k] is None or before[k] is None else achieved[k]-before[k])
                                  for k in ('front', 'back', 'depth', 'halfWidth')}
    report_stations.append(row)
# Sweep score (recipe.py sweep reads a top-level sweepScore, higher is better): the negative weighted RMS of achieved minus
# target over the station rows and the quantities the spec targets (front, back, depth, half width), in fit units, each row
# weighted by its loft weight weightY (a row the loft does not touch, weight 0, cannot be achieved and is left out; the rump
# rows .58 to .62 sit .06 to .12 off their targets by construction and would swamp the rest). The quick silhouette cannot see
# the waist (the hanging arm is the side edge there), so the score reads the mesh instead.
# Achieved minus target measures how well the build realizes the table, so it ranks changes to weights, exponents, reach
# and voxel size. A sweep that moves the targets themselves moves the yardstick with them: give the spec an optional
# `sweepReference` ({"<y>": {"front": .., "back": .., "depth": .., "halfWidth": ..}}, fit units) and the score measures
# achieved against that fixed table instead, for the quantities it names.
sweep_ref = {float(k): v for k, v in (SPEC.get('sweepReference') or {}).items()}
sweep_sums = {k: [0.0, 0.0] for k in ('front', 'back', 'depth', 'halfWidth')}  # [weighted squared error, weight]
for row in report_stations:
    w = float(row['weightY'])
    if w <= 0:
        continue
    for k, acc in sweep_sums.items():
        want = (sweep_ref.get(float(row['y'])) or {}).get(k, row['target'].get(k))
        got = (row['achieved'] or {}).get(k)
        if want is not None and got is not None:
            acc[0] += w*(got-want)**2
            acc[1] += w
sweep_total, sweep_weight = sum(a[0] for a in sweep_sums.values()), sum(a[1] for a in sweep_sums.values())
sweep_score = -float(np.sqrt(sweep_total/sweep_weight)) if sweep_weight else None
sweep_terms = {f'rms_{k}': (float(np.sqrt(a[0]/a[1])) if a[1] else None) for k, a in sweep_sums.items()}
sweep_terms['weight'] = sweep_weight
sweep_terms['against'] = 'sweepReference where named, else the spec targets' if sweep_ref else 'the spec targets'
smooth_before, smooth_after = smoothness(native), smoothness(final)
limit = SPEC['smoothness']['limit']
smooth_report = {'limit': limit, 'native': smooth_before, 'final': smooth_after,
                 'finalWithinLimit': all(v['maxDeviation'] <= limit for v in smooth_after.values())}

# ---- mesh once ---------------------------------------------------------------------------------------------------
grid.copyFromArray(final.astype(np.float32), ijk=tuple(int(v) for v in lo_idx))
vertices, tris, quads = grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
faces = [tuple(t) for t in tris.tolist()]+[tuple(q) for q in quads.tolist()]
mesh = bpy.data.meshes.new('Trunk sections body')
mesh.from_pydata(vertices.astype(np.float64).tolist(), [], faces)
mesh.update()
rebuilt = bpy.data.objects.new(body_name, mesh)
bpy.context.collection.objects.link(rebuilt)
bm = bmesh.new(); bm.from_mesh(mesh)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.000001)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(mesh); bm.free()
rebuilt.data.materials.append(body_material)
for polygon in rebuilt.data.polygons:
    polygon.use_smooth = True
# drop small closed islands (a thin remnant of removed material) and record them
bm = bmesh.new(); bm.from_mesh(rebuilt.data)
bm.verts.ensure_lookup_table()
seen, islands = set(), []
for start in bm.verts:
    if start in seen:
        continue
    comp, queue = [start], [start]
    seen.add(start)
    while queue:
        a = queue.pop()
        for e in a.link_edges:
            b_ = e.other_vert(a)
            if b_ not in seen:
                seen.add(b_); queue.append(b_); comp.append(b_)
    islands.append(comp)
islands.sort(key=len, reverse=True)
removed = []
for comp in islands[1:]:
    if len(comp) <= 5000:
        xs_ = [v.co.x for v in comp]; ys_ = [v.co.y for v in comp]; zs_ = [v.co.z for v in comp]
        removed.append({'vertices': len(comp), 'x': [min(xs_), max(xs_)], 'y': [min(ys_), max(ys_)], 'z': [min(zs_), max(zs_)]})
        bmesh.ops.delete(bm, geom=comp, context='VERTS')
bm.to_mesh(rebuilt.data); bm.free()
after = require_single_closed_mesh(rebuilt, args.out, 'Trunk sections rebuilt body')
bpy.data.objects.remove(body, do_unlink=True)
rebuilt.name = body_name

bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.film_transparent = True
scene.view_settings.view_transform = 'Standard'
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'body.blend'))

summary = {
    'approval': None, 'stageProvenanceSha256': provenance,
    'sweepScore': sweep_score, 'sweepTerms': sweep_terms,
    'scope': 'Trunk authored from a station table: lofted superellipse sections weighted-morphed into the native field; one meshing',
    'voxel': VS, 'source': source_stats, 'body': after, 'spec': SPEC, 'removedIslands': removed,
    'fitNative': fit_report, 'stations': report_stations, 'flips': flip_report, 'smoothness': smooth_report,
    'maxSliceWeight': {f'{zs[k]:.4f}': v for k, v in list(slice_weight.items())[::10]},
    'maxFieldChange': float(change.max()), 'largestChanges': sorted(biggest, key=lambda r: -r['change'])[:8],
}
(args.out/'trunk-sections.json').write_text(json.dumps(summary, indent=2)+'\n')
updated = copy.deepcopy(record)
updated.update({'approval': None, 'stageProvenanceSha256': provenance,
                'scope': record.get('scope', '')+'; trunk sections',
                'body': after, 'trunkSections': {k: v for k, v in summary.items() if k not in ('spec', 'maxSliceWeight')},
                'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']}})
(args.out/'fairing.json').write_text(json.dumps(updated, indent=2)+'\n')
print('trunk sections done', json.dumps({'maxChange': summary['maxFieldChange'], 'smoothWithinLimit': smooth_report['finalWithinLimit']}))
