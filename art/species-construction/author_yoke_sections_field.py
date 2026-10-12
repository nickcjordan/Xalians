"""Author Akinza's yoke (R05: neck base, trapezius slopes, upper back, shoulder caps) from parameters.

Sibling of author_trunk_sections_field_r20.py (same loader, same OpenVDB level-set blend, same PCHIP section tables, one
meshing pass). The closed body is converted to a level set and blended toward a lofted yoke inside a weight mask:

  SDF = (1 - w) SDF_native + w SDF_loft,     w = w_y * w_arm * w_reach

then meshed once.

Run with Blender (through loop_tools.py blender, or as a recipe step):
  --python author_yoke_sections_field.py -- --body <B-23 shape.glb> --fairing <fairing.json> --spec <yoke-sections.json>
      --out <new-dir> [--voxel .0025]

Units are the loop's fit units (fractions of the figure height H; y down from the crown): world z = floorZ + H (1 - y);
section front/back are fit side-view x (negative forward): world y = sideOffset + H x; half widths are fit units about
world x = centerX.

The loft (SDF_loft) at height z is the smooth union of
  * a two-half superellipse section (stations, PCHIP over y: front, back, halfWidth, split, expFront, expBack) whose back
    edge falls off with |x| (the "rear" block) and
  * one ball per shoulder (the "caps" block) centred on the fairing armJoints shoulder plus an offset.
Spec blocks:
  stations   [{y, front, back, halfWidth|null, split, expFront, expBack}] in increasing y. A null halfWidth is filled by
             topLine: the trapezius slope halfWidth(y) = neckHalf + (y - neckY) / tan(angleDeg), softly clamped at
             capHalf (smooth minimum of radius round, all fit units); angleDeg is the line's angle from the horizontal.
  topLine    {neckY, neckHalf, angleDeg, capHalf, round}
  rear       {capX, drop, exponent}: the section's back edge at |x| is back(y) - drop * (|x| / capX)^exponent for
             |x| <= capX, back(y) - drop beyond (world units for capX and drop). drop 0 is the plain superellipse.
  caps       {radius (fit), offset [dx, dy, dz] (world; dx points outward from the body axis), blend (world, smooth union
             radius)}
  weights    y {topZ, topRamp, bottom [y0, y1]}: 0 at world z >= topZ (the join's neck column is untouched), rises over
             topRamp (world) and fades to 0 between fit y bottom[0] and bottom[1] (B-20T owns the trunk below).
             arm {radius, zeroMargin, fullMargin, startAlong}: 0 inside the upper-arm tube below the cap (the tube starts
             startAlong world below the shoulder joint along the shoulder-elbow line), 1 beyond radius + fullMargin.
             reach [r0, r1]: the loft never reaches out to anything that is not the yoke.
             front [yA, yB] (optional, world y): 0 in front of yA, 1 behind yB (smoothstep), so the chest front stays native
             and the yoke only works on the top and the rear.
Every ramp must be at least ten times longer than the relief it carries; the tool records the largest field change per
station and the achieved against target for the top line and the rear.

Records: yoke-sections.json beside the output and `yokeSections` in the new fairing.json. Akinza-specific construction.
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
    'topLine': {'neckY': .26, 'neckHalf': .059, 'angleDeg': 24., 'capHalf': .13, 'round': .01},
    'rear': {'capX': .21, 'drop': 0., 'exponent': 2.},
    'caps': {'radius': .022, 'offset': [0., 0., 0.], 'blend': .03},
    'weights': {
        'y': {'topZ': .45, 'topRamp': .08, 'bottom': [.31, .36]},
        'arm': {'radius': .04, 'zeroMargin': .01, 'fullMargin': .07, 'startAlong': .03},
        'reach': [.03, .09],
        'front': None,
    },
    'box': {'x': [-.36, .36], 'y': [-.22, .12], 'padZ': .03},
    'measure': {'topX': [.06, .08, .10, .12, .14, .16, .18, .20, .22, .24], 'rearX': [.16, .18, .20, .22, .24, .26, .27],
                'rearY': [.30, .32]},
    'smoothness': {'y0': .25, 'y1': .38, 'step': .005, 'window': 9, 'limit': .0002, 'frontX': [0, .03, .05],
                   'backX': [0, .08, .16]},
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
TL, REAR, CAPS = SPEC['topLine'], SPEC['rear'], SPEC['caps']


# ---- numeric helpers ----------------------------------------------------------------------------------
def smooth(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


def smin(a, b, k):
    """Polynomial smooth minimum of radius k (k <= 0: plain minimum)."""
    if k <= 0:
        return np.minimum(a, b)
    h = np.maximum(k-np.abs(a-b), 0)/k
    return np.minimum(a, b)-h*h*k/4


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


def fit_y(z):
    return 1-(z-FLOOR)/H


def world_z(y):
    return FLOOR+H*(1-y)


def top_line_half(y):
    """Trapezius slope in fit units: half width at fit y, from the neck base out to the cap, softly clamped."""
    slope = 1/math.tan(math.radians(TL['angleDeg']))
    raw = TL['neckHalf']+(np.asarray(y, float)-TL['neckY'])*slope
    raw = np.maximum(raw, TL['neckHalf'])
    return smin(raw, TL['capHalf'], TL['round'])


# ---- stations -> section parameter functions --------------------------------------------------------------
stations = SPEC['stations']
if len(stations) < 3:
    raise ValueError('The spec needs at least three stations')
ys_st = np.array([s['y'] for s in stations], float)
if np.any(np.diff(ys_st) <= 0):
    raise ValueError('Stations must be in increasing y')
st_front = [OFF+H*s['front'] for s in stations]
st_back = [OFF+H*s['back'] for s in stations]
st_half_fit = [float(top_line_half(s['y'])) if s.get('halfWidth') is None else s['halfWidth'] for s in stations]
st_half = [H*v for v in st_half_fit]
st_split = [s.get('split', .58) for s in stations]
st_nf = [s.get('expFront', 2.0) for s in stations]
st_nb = [s.get('expBack', 2.0) for s in stations]
fn_front, fn_back, fn_half = pchip(ys_st, st_front), pchip(ys_st, st_back), pchip(ys_st, st_half)
fn_split, fn_nf, fn_nb = pchip(ys_st, st_split), pchip(ys_st, st_nf), pchip(ys_st, st_nb)


def y_weight(z):
    y = fit_y(z)
    b0, b1 = W['y']['bottom']
    up = smooth((W['y']['topZ']-z)/W['y']['topRamp'])
    return up*(1-smooth((y-b0)/(b1-b0)))


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
require_single_closed_mesh(body, args.out, 'Yoke sections input')
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
z_top = W['y']['topZ']+pad_z
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

# ---- masks and caps -------------------------------------------------------------------------------------------
joints = record.get('armJoints', {})
arm_lines, cap_centers = [], []
for side_key in ('R', 'L'):
    chain = [joints.get(f'{n}.{side_key}') for n in ('shoulder', 'elbow', 'wrist')]
    sgn_flip = 1.
    if any(p is None for p in chain):
        mirror = [joints.get(f'{n}.{"L" if side_key == "R" else "R"}') for n in ('shoulder', 'elbow', 'wrist')]
        if any(p is None for p in mirror):
            continue
        chain = [[-p[0], p[1], p[2]] for p in mirror]
    chain = np.asarray(chain, float)
    sgn = 1. if chain[0][0] >= 0 else -1.
    d = chain[1]-chain[0]
    d = d/np.linalg.norm(d)
    start = chain[0]+d*float(W['arm']['startAlong'])
    arm_lines.append(np.vstack([start, chain[1:]]))
    off = CAPS['offset']
    cap_centers.append(chain[0]+np.array([sgn*off[0], off[1], off[2]]))
CAP_R = H*CAPS['radius']


def segment_distance(Xg, Yg, z, a, b):
    ba = b-a
    qx, qy, qz = Xg-a[0], Yg-a[1], z-a[2]
    h = np.clip((qx*ba[0]+qy*ba[1]+qz*ba[2])/float(ba@ba), 0, 1)
    return np.sqrt((qx-ba[0]*h)**2+(qy-ba[1]*h)**2+(qz-ba[2]*h)**2)


def polyline_distance(Xg, Yg, z, pts):
    return np.minimum.reduce([segment_distance(Xg, Yg, z, pts[i], pts[i+1]) for i in range(len(pts)-1)])


def arm_weight(z):
    r, z0, z1 = W['arm']['radius'], W['arm']['zeroMargin'], W['arm']['fullMargin']
    d = np.full((len(xs), len(ys)), 9.)
    for line in arm_lines:
        d = np.minimum(d, polyline_distance(X2, Y2, z, line))
    return smooth((d-(r+z0))/(z1-z0))


def ball_field(Xg, Yg, z):
    d = np.full((len(xs), len(ys)), 9.)
    for c in cap_centers:
        d = np.minimum(d, np.sqrt((Xg-c[0])**2+(Yg-c[1])**2+(z-c[2])**2)-CAP_R)
    return d


# ---- the loft -------------------------------------------------------------------------------------------------------
def section_params(z):
    y = fit_y(z)
    return (float(fn_front(y)), float(fn_back(y)), float(fn_split(y)), float(fn_half(y)),
            float(fn_nf(y)), float(fn_nb(y)))


def back_edge_at(back, ax):
    """The section's back edge (world y) at |x| = ax (array), the rear block's fall-off."""
    ax = np.asarray(ax, float)
    if REAR['drop'] <= 0:
        return back+0*ax
    return back-REAR['drop']*np.minimum(ax/REAR['capX'], 1.)**REAR['exponent']


def loft_k(z, Xg, Yg):
    front, back, split, half, nf, nb = section_params(z)
    dw = front+split*(back-front)
    u = (Xg-CX)/half
    dd = Yg-dw
    front_half = dd < 0
    h = np.where(front_half, dw-front, np.maximum(back_edge_at(back, np.abs(Xg-CX))-dw, .004))
    v = dd/h
    n = np.where(front_half, nf, nb)
    au, av = np.abs(u)+1e-12, np.abs(v)+1e-12
    return (au**n+av**n)**(1/n)


def loft_field(z):
    """(k - 1) / |grad k| with numerical gradients: the 3D estimate (merging) and the in-plane one (reach), both joined to
    the cap balls by a smooth minimum (the balls are exact distances)."""
    k0 = loft_k(z, X2, Y2)
    kxp, kxn = loft_k(z, X2+VS, Y2), loft_k(z, X2-VS, Y2)
    kyp, kyn = loft_k(z, X2, Y2+VS), loft_k(z, X2, Y2-VS)
    kzp, kzn = loft_k(z+VS, X2, Y2), loft_k(z-VS, X2, Y2)
    gx, gy, gz = (kxp-kxn)/(2*VS), (kyp-kyn)/(2*VS), (kzp-kzn)/(2*VS)
    planar = np.sqrt(gx*gx+gy*gy)
    grad = np.sqrt(planar*planar+gz*gz)
    sec3 = (k0-1)/np.maximum(grad, 1e-6)
    sec2 = (k0-1)/np.maximum(planar, 1e-6)
    ball = ball_field(X2, Y2, z)
    return smin(sec3, ball, CAPS['blend']), smin(sec2, ball, CAPS['blend'])


# ---- the morph ---------------------------------------------------------------------------------------------------
final = native.copy()
reach0, reach1 = W['reach']
biggest, slice_weight = [], {}
for kz_i, z in enumerate(zs):
    wy = float(y_weight(z))
    if wy <= 1e-9:
        continue
    loft, loft_plane = loft_field(z)
    w_arm = arm_weight(z)
    w_reach = 1-smooth((loft_plane-reach0)/(reach1-reach0))
    w = wy*w_arm*w_reach
    if W.get('front'):
        w = w*smooth((Y2-W['front'][0])/(W['front'][1]-W['front'][0]))
    merged = (1-w)*native[:, :, kz_i]+w*np.clip(loft, -BAND, BAND)
    big = np.abs(merged-native[:, :, kz_i])
    ii, jj = np.unravel_index(np.argmax(big), big.shape)
    biggest.append({'change': float(big[ii, jj]), 'x': float(xs[ii]), 'y': float(ys[jj]), 'z': float(z), 'fitY': float(fit_y(z)),
                    'native': float(native[ii, jj, kz_i]), 'loft': float(loft[ii, jj]), 'wArm': float(w_arm[ii, jj]),
                    'wReach': float(w_reach[ii, jj])})
    final[:, :, kz_i] = merged
    slice_weight[kz_i] = float(w.max())
final = np.clip(final, -BAND, BAND)
change = np.abs(final-native)
flip_report, edge_change = {}, {}
for s_ in stations:
    k_i = int(round((world_z(s_['y'])-zs[0])/VS))
    if not 0 <= k_i < shape[2]:
        continue
    a_, b_ = native[:, :, k_i] < 0, final[:, :, k_i] < 0
    entry = {}
    for name, sel in (('removed', a_ & ~b_), ('added', ~a_ & b_)):
        ii, jj = np.nonzero(sel)
        entry[name] = {'voxels': int(len(ii))}
        if len(ii):
            entry[name].update({'x': [float(xs[ii].min()), float(xs[ii].max())], 'y': [float(ys[jj].min()), float(ys[jj].max())]})
    flip_report[str(s_['y'])] = entry
    edge_change[str(s_['y'])] = float(change[:, :, k_i].max())


# ---- measurement of the final (or native) field -------------------------------------------------------------------
def crossings(line, coords):
    out = []
    s = line < 0
    for i in np.nonzero(s[:-1] != s[1:])[0]:
        t = line[i]/(line[i]-line[i+1])
        out.append((coords[i]+t*(coords[i+1]-coords[i]), bool(s[i+1])))
    return out


def column_at(S, x):
    f = (x-xs[0])/VS
    i = int(np.clip(math.floor(f), 0, len(xs)-2))
    t = f-i
    return S[i]*(1-t)+S[i+1]*t


def front_edge(S, x):
    c = [p for p, going_in in crossings(column_at(S, x), ys) if going_in]
    return c[0] if c else None


def back_edge_field(S, x):
    """The last exit along y at world x (the rear edge of the trunk or of the arm root, whichever is further back)."""
    c = [p for p, going_in in crossings(column_at(S, x), ys) if not going_in]
    return c[-1] if c else None


def top_z(field, ax):
    """Highest inside voxel centre at |x| = ax over every y (the front view's top line), world z."""
    i = int(round((ax-xs[0])/VS))
    zz = np.nonzero((field[i] < 0).any(axis=0))[0]
    return float(zs[zz.max()]) if len(zz) else None


def line_profiles(field):
    cfg = SPEC['smoothness']
    rows = np.arange(cfg['y0'], cfg['y1']+1e-9, cfg['step'])
    lines = {f'front|x|={fx:g}': [] for fx in cfg['frontX']}
    lines.update({f'back|x|={bx_:g}': [] for bx_ in cfg['backX']})
    for y in rows:
        S = field[:, :, int(round((world_z(y)-zs[0])/VS))]
        for fx in cfg['frontX']:
            v = front_edge(S, CX+fx)
            lines[f'front|x|={fx:g}'].append(None if v is None else (v-OFF)/H)
        for bx_ in cfg['backX']:
            v = back_edge_field(S, CX+bx_)
            lines[f'back|x|={bx_:g}'].append(None if v is None else (v-OFF)/H)
    return rows, lines


def quadratic_deviation(rows, values, window):
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
    out = {}
    for name, values in lines.items():
        dev, at = quadratic_deviation(rows, values, SPEC['smoothness']['window'])
        out[name] = {'maxDeviation': dev, 'atY': at, 'valid': int(sum(v is not None for v in values))}
    return out


report_stations = []
for i, s in enumerate(stations):
    z = world_z(s['y'])
    k_i = int(round((z-zs[0])/VS))
    if not 0 <= k_i < shape[2]:
        continue
    row = {'y': s['y'], 'z': z, 'weightY': float(y_weight(z)),
           'target': {'front': s['front'], 'back': s['back'], 'halfWidth': st_half_fit[i]},
           'params': {'split': st_split[i], 'expFront': st_nf[i], 'expBack': st_nb[i]}, 'maxFieldChange': edge_change.get(str(s['y']))}
    for tag, field in (('achieved', final), ('native', native)):
        S = field[:, :, k_i]
        f, b = front_edge(S, CX), back_edge_field(S, CX)
        row[tag] = {'front': None if f is None else (f-OFF)/H, 'back': None if b is None else (b-OFF)/H}
    report_stations.append(row)

cfg_m = SPEC['measure']
top_target = {}
for ax in cfg_m['topX']:
    yy = np.linspace(.20, .45, 2001)
    hh = np.asarray(top_line_half(yy))*H
    j = int(np.argmin(np.abs(hh-ax)))
    top_target[f'{ax:g}'] = float(world_z(yy[j])) if hh.min() <= ax <= hh.max() else None
top_line = {'target': top_target,
            'achieved': {f'{ax:g}': top_z(final, ax) for ax in cfg_m['topX']},
            'native': {f'{ax:g}': top_z(native, ax) for ax in cfg_m['topX']}}
ach = [(ax, top_line['achieved'][f'{ax:g}']) for ax in cfg_m['topX'] if top_line['achieved'][f'{ax:g}'] is not None]
if len(ach) >= 3:
    sl = np.polyfit([a for a, _ in ach], [z for _, z in ach], 1)[0]
    top_line['achievedAngleDeg'] = float(math.degrees(math.atan(-sl)))
top_line['targetAngleDeg'] = float(TL['angleDeg'])
rear_depth = {}
for yy in cfg_m['rearY']:
    k_r = int(round((world_z(yy)-zs[0])/VS))
    S_f, S_n = final[:, :, k_r], native[:, :, k_r]
    sec = {'target': {}, 'achieved': {}, 'native': {}}
    for ax in cfg_m['rearX']:
        sec['achieved'][f'{ax:g}'] = back_edge_field(S_f, ax)
        sec['native'][f'{ax:g}'] = back_edge_field(S_n, ax)
        sec['target'][f'{ax:g}'] = float(back_edge_at(float(fn_back(yy)), ax))
    rear_depth[f'{yy:g}'] = sec
smooth_before, smooth_after = smoothness(native), smoothness(final)
limit = SPEC['smoothness']['limit']
smooth_report = {'limit': limit, 'native': smooth_before, 'final': smooth_after,
                 'finalWithinLimit': all(v['maxDeviation'] <= limit for v in smooth_after.values())}
zz_fade = np.arange(W['y']['topZ']-W['y']['topRamp'], W['y']['topZ']+1e-9, VS)
k_ramp = max(0, int(round((W['y']['topZ']-W['y']['topRamp']-zs[0])/VS)))
fade_report = {'topRampWorld': W['y']['topRamp'], 'bottomRampFit': W['y']['bottom'],
               'maxWeightSlopePerWorldTop': float(np.max(np.abs(np.diff(y_weight(zz_fade)))/VS)) if len(zz_fade) > 1 else None,
               'maxFieldChangeInTopRamp': float(change[:, :, k_ramp:].max()),
               'maxFieldChange': float(change.max())}
yoke_report = {'topLine': top_line, 'rearDepth': rear_depth,
               'capRadiusFit': CAPS['radius'], 'capCentersWorld': [c.tolist() for c in cap_centers],
               'maxFieldChangePerStation': edge_change, 'smoothnessAtFades': smooth_report, 'fades': fade_report}

# ---- mesh once ---------------------------------------------------------------------------------------------------
grid.copyFromArray(final.astype(np.float32), ijk=tuple(int(v) for v in lo_idx))
vertices, tris, quads = grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
faces = [tuple(t) for t in tris.tolist()]+[tuple(q) for q in quads.tolist()]
mesh = bpy.data.meshes.new('Yoke sections body')
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
after = require_single_closed_mesh(rebuilt, args.out, 'Yoke sections rebuilt body')
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
    'scope': 'Yoke (neck base, trapezius, upper back, shoulder caps) authored from a station table, top line, rear block and cap balls; weighted-morphed into the native field; one meshing',
    'voxel': VS, 'source': source_stats, 'body': after, 'spec': SPEC, 'removedIslands': removed,
    'stations': report_stations, 'flips': flip_report, 'yokeSections': yoke_report,
    'maxSliceWeight': {f'{zs[k]:.4f}': v for k, v in list(slice_weight.items())[::10]},
    'maxFieldChange': float(change.max()), 'largestChanges': sorted(biggest, key=lambda r: -r['change'])[:8],
}
(args.out/'yoke-sections.json').write_text(json.dumps(summary, indent=2)+'\n')
updated = copy.deepcopy(record)
updated.update({'approval': None, 'stageProvenanceSha256': provenance,
                'scope': record.get('scope', '')+'; yoke sections',
                'body': after, 'yokeSections': {**yoke_report, 'stations': report_stations, 'flips': flip_report},
                'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']}})
(args.out/'fairing.json').write_text(json.dumps(updated, indent=2)+'\n')
print('yoke sections done', json.dumps({'maxChange': summary['maxFieldChange'], 'smoothWithinLimit': smooth_report['finalWithinLimit']}))
