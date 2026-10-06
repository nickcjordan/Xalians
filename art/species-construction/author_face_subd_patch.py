"""Akinza face as a subdivision-surface patch, cut into the assembled creature after the assembly's voxel remesh (R02 tool, round 28).

A post-assembly recipe step (kind post, RECIPE.md section Post-assembly steps) that replaces finish_face_assembled.py's level-set window with an
authored quad cage that is Catmull-Clark subdivided and zipped into the assembled skin. finish_face_assembled.py is a script (it runs at import),
so its window replacement, zipper, seam checks, conformal globes, irises, mouth follow and face metrics are carried here as a copy of that
code, unchanged except where the notes below say; the fine level set, the orbit carve, the tuft and nose SDFs are what this tool replaces.

Run by recipe.py (the stage has already copied akinza.glb, akinza.blend and assembly.json from the input assembly into --out):
  blender -b --factory-startup --python author_face_subd_patch.py -- --asm <assembly dir> --out <new assembly dir> --donor <F-bulk dir>/head.blend
      --spec specs/r02_face_subd.json

Coordinates are head-local, as in finish_face_assembled.py (assembly.json headTransform: world = head-local * scale + offset).

The cage. One regular grid over the window (cage.cell, default .008) whose vertex positions are warped around the features so that grid rings
become concentric loops:
  - each eye is a ring block: rectangular grid levels become loops that are exact scaled copies of the aperture ellipse inside, and offset
    curves of it outside (eye.rings: the lid band loop, rim, lid fold, blend; offsets in head-local units from the aperture edge). The
    block half sizes follow from the ring offsets; the outermost cage.blendLevels levels blend back into the plain grid.
  - the nose is a ring block on the rounded-triangle pad outline (nose.pad), with its own rings.
Heights are set per loop, not by a field: the socket floor is the globe front plus floorBehind, the aperture loop sits edgeCover in front of the
globe edge, each ring has a rise over the donor surface (eye.rings[].rise, optionally times a table by angle: the upper lid fold is heavier at
the top), eye.orbit.lateralOpenDeg opens a sector of the lid rings on the outer side so the globe is not walled in from the side. Tufts, muzzle
lobes, the philtrum groove and the nose wedge are analytic height features sampled at the cage vertices. The donor (F-bulk) skin and the
assembled skin are read as ray heightfields; the cage surface fades from donor plus features to the assembled skin toward the window edge
(window.margin, window.fade), exactly as the field tool did. Creased edges (the aperture loop, the pad outline) stay sharp, the cage is
subdivided cage.levels times (Blender subsurf modifier, material per face inherited), and the quads go through the field tool's stitch: window
cut, margin, zipper, closed-solid checks.

Lid band: the faces between the aperture loop and the band loop are a material of the skin ('Upper emphasized eyelid'), width by angle from
eye.lid.bandPercent times bandScale. The nose pad is the skin faces inside the pad outline loop ('Rounded animal nose'); the old head_nose_finish
shell is removed. The globes and irises are retained objects as before (white to the aperture edge).
"""
import argparse
import copy
import json
import math
import sys
import time
from pathlib import Path

import bpy
import bmesh
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import material, mesh_stats, sha
from study_provenance import snapshot
import fan_clumps_fast_common as fc

T_START = time.time()


def tick(message):
    print(f'[{time.time()-T_START:7.1f}s] {message}', flush=True)


# ---------------------------------------------------------------------------------------------------------------------------------
# Defaults. specs/r02_face_subd.json carries every number explicitly (so recipe.py set spec:<path> reaches it); a key missing from the JSON
# takes its value from here. All lengths are head-local (fit units x 3.721).
DEFAULTS = {
    'window': {'x': 0.33, 'xByZ': [[-0.29, 0.10], [-0.24, 0.17], [-0.20, 0.22], [-0.14, 0.26], [-0.10, 0.29], [-0.02, 0.32], [0.10, 0.32], [0.14, 0.31], [0.18, 0.29], [0.215, 0.26]], 'z': [-0.29, 0.215], 'yCut': -0.05, 'yMin': -0.42, 'margin': 0.006, 'rayStep': 0.003, 'fade': 0.025,
               'faceSmooth': 3},
    'cage': {'cell': 0.005, 'levels': 2, 'pad': 0.04, 'blendLevels': 2, 'extendStep': 0.002, 'minRingGap': 0.0015,
             'creaseAperture': 1.0, 'creaseNose': 0.9, 'allowFolds': False},
    'eye': {
        'sides': [1, -1],
        'aperture': {'center': [0.1887, 0.0291], 'semi': [0.0965, 0.1335]},
        'globe': {'kind': 'conformal', 'edgeBehindTopBottom': [0.0045, 0.0028], 'mode': 'edge', 'edgeBehind': 0.0037, 'apexProud': 0.013, 'semi': 'auto', 'depthSemi': 0.06, 'margin': 1.0, 'minCurvature': 0.35,
                  'yawDeg': 'auto', 'pitchDeg': 'auto', 'hiddenRadius': 1.08, 'backOffset': 0.012, 'backCentre': 0.01,
                  'angular': 160, 'radial': [20, 3, 3]},
        'orbit': {'floorBehind': 0.0025, 'edgeCover': 0.0012, 'lateralOpenDeg': 0.0, 'lateralCenterDeg': 90.0, 'openFeather': 30.0,
                  'shear': 0.0, 'lateralShear': 0.0, 'floorBlend': 0.004, 'rimBlend': 0.005, 'extraCutters': []},
        'lid': {'bandPercent': [[0, 6.5], [30, 7.3], [60, 6.6], [90, 4.2], [120, 3.5], [150, 2.8], [180, 2.3], [-150, 1.5],
                                [-120, 1.4], [-90, 2.9], [-60, 3.7], [-30, 5.0]],
                'bandScale': 1.0, 'bandMode': 'skin',
                'fold': {'height': [], 'width': [], 'center': 0.0, 'blend': 0.003}},
        'rings': [{'offset': 'band', 'rise': 0.0010, 'crease': 0.0},
                  {'gap': 0.0030, 'rise': 0.0016, 'crease': 0.0},
                  {'gap': 0.0035, 'rise': 0.0012, 'crease': 0.0,
                   'byAngle': [[0, 1.5], [60, 1.3], [90, 0.8], [180, 0.2], [-90, 0.8], [-60, 1.3]]},
                  {'gap': 0.0040, 'rise': 0.0, 'crease': 0.0}],
        'iris': {'offset': [-0.0111, -0.0055], 'semi': [0.0555, 0.094], 'pupil': [0.0305, 0.0414], 'lensFront': 0.005,
                 'lensEdgeBehind': 0.0008, 'lensBack': 0.008},
        'rimProbe': 0.03,
    },
    'tufts': {'taperPower': 1.15, 'tipRadius': 0.0035, 'taperExponent': 0.85, 'thicknessExponent': 0.9, 'sectionPower': 0.5,
              'rootCap': 0.6,
              'list': [{'root': [0.246, -0.106], 'tip': [0.3, -0.158], 'length': 0.075, 'widthRoot': 0.062, 'thickRoot': 0.017,
                        'lift': 0.0004},
                       {'root': [0.212, -0.176], 'tip': [0.236, -0.232], 'length': 0.06, 'widthRoot': 0.05, 'thickRoot': 0.014,
                        'lift': 0.0004}]},
    'nose': {'replaceFinish': True,
             'pad': {'topZ': -0.11, 'apexZ': -0.148, 'halfWidth': 0.043, 'cornerRadius': 0.006, 'wrapUnder': 0.0, 'outlinePoints': 96,
                     'lift': 0.0006,
                     'blendLevels': 2, 'extendStep': 0.002,
                     'rings': [{'offset': 0.003, 'rise': 0.0003, 'crease': 0.0}, {'offset': 0.006, 'rise': 0.0, 'crease': 0.0}]},
             'wedge': {'lead': 0.0, 'center': [0.0, -0.13], 'half': [0.07, 0.06]}},
    'muzzle': {'lobeCenter': [0.03, -0.185], 'lobeRadius': 0.035, 'lobeLift': 0.0, 'philtrumDepth': 0.0, 'philtrumZ': [-0.21, -0.15],
               'philtrumWidth': 0.008},
    'mouth': {'follow': True},
    'maxIsland': 3000,
}


def merge(base, over):
    out = copy.deepcopy(base)
    for key, value in (over or {}).items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = merge(out[key], value)
        else:
            out[key] = copy.deepcopy(value)
    return out


parser = argparse.ArgumentParser()
parser.add_argument('--asm', type=Path, required=True, help='the input assembly directory (akinza.blend, assembly.json)')
parser.add_argument('--donor', type=Path, required=True, help='bulk face head: bridge, muzzle and lower smooth, no socket, tufts or pad')
parser.add_argument('--spec', type=Path, default=None)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--levels', type=int, default=None, help='subdivision levels; overrides the spec cage.levels')
parser.add_argument('--skin-only', action='store_true', help='skip the globes and irises (skin only)')
if '--' in sys.argv:
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
else:
    args = parser.parse_args()
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=True)
args.asm = args.asm.resolve()
args.scene = args.asm/'akinza.blend'
spec = merge(DEFAULTS, json.loads(args.spec.read_text()) if args.spec else {})
if args.levels:
    spec['cage']['levels'] = args.levels
provenance = snapshot(args.out, __file__, [args.scene, args.donor] + ([args.spec] if args.spec else []))
W = spec['window']
record = {'cage': {}, 'eyes': {}, 'tufts': [], 'nose': {}, 'seam': {}, 'checks': {}}


# ---------------------------------------------------------------------------------------------------------------------------------
# Small numeric helpers.
def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


def smin(a, b, k):
    h = np.clip(.5+.5*(b-a)/k, 0, 1)
    return b*(1-h)+a*h-k*h*(1-h)


def smax(a, b, k):
    return -smin(-a, -b, k)


def interp_angle(table_deg, table_val, alpha):
    """Periodic linear interpolation of a table given at angles in degrees (from the top, + toward the outer corner)."""
    d = np.array(table_deg, dtype=float)
    v = np.array(table_val, dtype=float)
    order = np.argsort(d)
    d, v = d[order], v[order]
    deg = (np.degrees(alpha)+180) % 360-180
    return np.interp(deg, np.concatenate([d-360, d, d+360]), np.concatenate([v, v, v]))


def smooth_periodic(values, passes):
    out = values.copy()
    for _ in range(passes):
        out = (np.roll(out, 1)+2*out+np.roll(out, -1))/4
    return out


def skin_object():
    return max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))


def read_skin(obj):
    """World-space points (n, 3) float32, triangles (m, 3) int32 of a skin object."""
    M = obj.matrix_world
    me = obj.data
    co = np.empty(len(me.vertices)*3, np.float32)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3).astype(np.float64)
    Mn = np.array(M)
    pts = (co@Mn[:3, :3].T+Mn[:3, 3]).astype(np.float32)
    me.calc_loop_triangles()
    tris = np.empty(len(me.loop_triangles)*3, np.int32)
    me.loop_triangles.foreach_get('vertices', tris)
    return pts, tris.reshape(-1, 3)


# ---------------------------------------------------------------------------------------------------------------------------------
# 1. The scene skin (read once, edited at the end) and the donor skin: ray heightfields over the window.
XW = float(W['x'])
ZW = [float(W['z'][0]), float(W['z'][1])]
YC = float(W['yCut'])
YMIN = float(W['yMin'])
MARGIN = float(W['margin'])
FADE = float(W['fade'])
RS = float(W['rayStep'])
_XBZ = np.array(W['xByZ'], float)
_XBZ = _XBZ[np.argsort(_XBZ[:, 0])]


def XLIM(z):
    """Half width of the window at height z (head-local): the window follows the front-facing part of the face, narrower toward the chin."""
    return np.minimum(np.interp(z, _XBZ[:, 0], _XBZ[:, 1]), XW)


hx = np.arange(-XW-.09, XW+.09+1e-9, RS)
hz = np.arange(ZW[0]-.09, ZW[1]+.09+1e-9, RS)


def cast_height(tree):
    """y of the first hit from the front (ray from y=-1 along +y) on the grid hx x hz; NaN where the ray misses."""
    H = np.full((len(hx), len(hz)), np.nan, np.float32)
    down = Vector((0, 1, 0))
    for i, x in enumerate(hx):
        for j, z in enumerate(hz):
            hit, _, _, _ = tree.ray_cast(Vector((float(x), -1.0, float(z))), down)
            if hit is not None:
                H[i, j] = hit.y
    return H


ASM = json.loads((args.asm/'assembly.json').read_text(encoding='utf-8'))
HT = ASM['headTransform']
HSCALE = float(HT['scale'])
HOFF = np.array(HT['translation'], dtype=np.float64)
record['asmTransform'] = {'scale': HSCALE, 'translation': HOFF.tolist()}


def _map_meshes(fn):
    for o_ in bpy.context.scene.objects:
        if o_.type != 'MESH' or not len(o_.data.vertices):
            continue
        assert np.allclose(np.array(o_.matrix_world), np.eye(4)), f'{o_.name}: the assembled objects must carry the identity transform'
        n_ = len(o_.data.vertices)
        buf = np.empty(n_*3, np.float64)
        buf32 = np.empty(n_*3, np.float32)
        o_.data.vertices.foreach_get('co', buf32)
        buf[:] = buf32
        o_.data.vertices.foreach_set('co', fn(buf.reshape(-1, 3)).astype(np.float32).reshape(-1))
        o_.data.update()


def localize():
    """World to head-local: (p - offset)/scale, every mesh object of the open scene."""
    _map_meshes(lambda p: (p-HOFF)/HSCALE)


def globalize():
    """Head-local to world: p*scale + offset."""
    _map_meshes(lambda p: p*HSCALE+HOFF)




bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
localize()
head = skin_object()
assert np.allclose(np.array(head.matrix_world), np.eye(4)), 'the head skin object transform must be the identity'
me = head.data
nv = len(me.vertices)
V = np.empty(nv*3, np.float32)
me.vertices.foreach_get('co', V)
V = V.reshape(-1, 3).astype(np.float64)
npoly = len(me.polygons)
nl = len(me.loops)
ls = np.empty(npoly, np.int32)
me.polygons.foreach_get('loop_start', ls)
lt = np.diff(np.append(ls, nl)).astype(np.int32)
loop_v = np.empty(nl, np.int32)
me.loops.foreach_get('vertex_index', loop_v)
mat_idx = np.empty(npoly, np.int32)
me.polygons.foreach_get('material_index', mat_idx)
materials = list(me.materials)
before_stats = fc.fast_mesh_stats(me)
tick(f'scene skin {nv} vertices, {npoly} polygons')
# the assembled skin as seen from the front, but only the polygons the window will replace (plus a little more): the fan locks in front of
# the cheek edge are part of the same skin and would otherwise be the first hit there
_cs = np.add.reduceat(V[loop_v], ls, axis=0)/lt[:, None]
_sel = np.nonzero((np.abs(_cs[:, 0]) < XLIM(_cs[:, 2])+.012) & (_cs[:, 2] > ZW[0]-.012) & (_cs[:, 2] < ZW[1]+.012) & (_cs[:, 1] < YC+.012))[0]
_used = np.unique(np.concatenate([loop_v[ls[p]:ls[p]+lt[p]] for p in _sel]))
_remap = {int(v): i for i, v in enumerate(_used)}
asm_tree = BVHTree.FromPolygons([tuple(map(float, V[v])) for v in _used],
                                [tuple(_remap[int(v)] for v in loop_v[ls[p]:ls[p]+lt[p]]) for p in _sel])
Ha = cast_height(asm_tree)
tick(f'assembled-skin heightfield {Ha.shape}, {int(np.isnan(Ha).sum())} misses')
_gx, _gz = np.gradient(np.nan_to_num(Ha, nan=0.0), RS)
_slope = np.hypot(_gx, _gz)
_diag = {}
for _z in np.arange(-.30, .22, .04):
    _j = int(round((_z-hz[0])/RS))
    _row = {}
    for _lim in (1.0, 2.0, 4.0):
        _ok = np.nonzero((_slope[:, _j] < _lim) & ~np.isnan(Ha[:, _j]) & (hx > 0))[0]
        _bad = [i for i in _ok if True]
        _xs = hx[_ok]
        # first x (from the centre outward) where the slope exceeds the limit
        _over = np.nonzero((_slope[:, _j] >= _lim) & (hx > 0) & (hx < .45))[0]
        _row[str(_lim)] = round(float(hx[_over[0]]), 3) if len(_over) else None
    _diag[f'{_z:.2f}'] = _row
record['cage']['slopeLimitX'] = _diag
tick('slope diag ' + str(_diag))

bpy.ops.wm.open_mainfile(filepath=str(args.donor.resolve()))
donor_obj = skin_object()
assert np.allclose(np.array(donor_obj.matrix_world), np.eye(4)), 'the head skin object transform must be the identity'
d_pts, d_tris = read_skin(donor_obj)
d_tree = BVHTree.FromPolygons([tuple(map(float, p)) for p in d_pts], d_tris.tolist())
tick(f'donor skin {len(d_pts)} vertices')
Hc = cast_height(d_tree)
tick(f'donor heightfield {Hc.shape}')
SMOOTH = int(W.get('faceSmooth', 1))


def smooth_height(H, radius, passes=2):
    valid = ~np.isnan(H)
    filled = np.where(valid, H, 0.0)
    wts = valid.astype(np.float64)
    for _ in range(passes):
        for axis in (0, 1):
            acc = np.zeros_like(filled)
            wacc = np.zeros_like(wts)
            for k in range(-radius, radius+1):
                acc += np.roll(filled*wts, k, axis=axis)
                wacc += np.roll(wts, k, axis=axis)
            filled = np.where(wacc > 0, acc/np.maximum(wacc, 1e-12), 0.0)
            wts = (wacc > 0).astype(np.float64)
    return np.where(valid, filled, np.nan).astype(np.float32)


Hs = smooth_height(Hc, SMOOTH) if SMOOTH > 0 else Hc


def face_h(x, z, Hs=Hs):
    """Bilinear heightfield of the donor skin (y of the first hit), NaN where the ray misses. x, z broadcast."""
    fx = (np.asarray(x, float)-hx[0])/RS
    fz = (np.asarray(z, float)-hz[0])/RS
    i0 = np.clip(np.floor(fx).astype(int), 0, len(hx)-2)
    j0 = np.clip(np.floor(fz).astype(int), 0, len(hz)-2)
    tx = np.clip(fx-i0, 0, 1)
    tz = np.clip(fz-j0, 0, 1)
    return ((Hs[i0, j0]*(1-tx)+Hs[i0+1, j0]*tx)*(1-tz)+(Hs[i0, j0+1]*(1-tx)+Hs[i0+1, j0+1]*tx)*tz)


def ray_hit(x, z, tree=None):
    hit, normal, _, _ = (tree or d_tree).ray_cast(Vector((float(x), -1.0, float(z))), Vector((0, 1, 0)))
    return hit, normal


# ---------------------------------------------------------------------------------------------------------------------------------
# 2. Feature descriptions (analytic, evaluated on any grid).
def plane_fit(side, center, semi, radius_scale=0.9):
    """Least-squares plane y = a + b x + c z through the donor skin inside the aperture (canonical left-eye coordinates)."""
    cx, cz = center
    pts = []
    for rr in np.linspace(0, radius_scale, 7):
        for t in np.linspace(0, 2*np.pi, 24, endpoint=False):
            x = cx+semi[0]*rr*math.sin(t)
            z = cz+semi[1]*rr*math.cos(t)
            y = float(face_h(side*x, z))
            if not np.isnan(y):
                pts.append((x, z, y))
    pts = np.array(pts)
    A = np.stack([np.ones(len(pts)), pts[:, 0], pts[:, 1]], axis=1)
    coef, *_ = np.linalg.lstsq(A, pts[:, 2], rcond=None)
    return coef, pts


def unit(v):
    return v/np.linalg.norm(v)


class Eye:
    """One eye in canonical coordinates (x outward positive: the left eye is +x; the right eye mirrors through s)."""

    def __init__(self, side, cfg):
        self.s = side
        ap, g, o = cfg['aperture'], cfg['globe'], cfg['orbit']
        self.cfg = cfg
        self.cx, self.cz = ap['center']
        self.ax, self.az = ap['semi']
        coef, self.fit_pts = plane_fit(side, ap['center'], ap['semi'])
        a0, b, c = coef
        n_out = unit(np.array([b, -1.0, c]))                         # outward normal of the face plane, canonical
        yaw = math.degrees(math.atan2(n_out[0], -n_out[1]))
        pitch = math.degrees(math.atan2(n_out[2], math.hypot(n_out[0], n_out[1])))
        self.yaw = yaw if g['yawDeg'] == 'auto' else float(g['yawDeg'])
        self.pitch = pitch if g['pitchDeg'] == 'auto' else float(g['pitchDeg'])
        ya, pi_ = math.radians(self.yaw), math.radians(self.pitch)
        f = np.array([math.sin(ya)*math.cos(pi_), -math.cos(ya)*math.cos(pi_), math.sin(pi_)])
        self.fp = -f                                                  # points back into the head
        self.u = unit(np.cross([0, 0, 1.0], f))
        self.w = np.cross(self.u, self.fp)
        # curvature of the donor skin across the aperture (quadratic fit in x, z): the globe's front cap follows it
        P_ = self.fit_pts
        Q = np.stack([np.ones(len(P_)), P_[:, 0], P_[:, 1], P_[:, 0]**2, P_[:, 1]**2, P_[:, 0]*P_[:, 1]], axis=1)
        q, *_ = np.linalg.lstsq(Q, P_[:, 2], rcond=None)
        hxx, hzz = 2*q[3], 2*q[4]
        slope = math.sqrt(1+q[1]**2+q[2]**2)
        self.kappa = (max(hxx*self.u[0]**2/slope, float(g.get('minCurvature', .35))), max(hzz*self.w[2]**2/slope, float(g.get('minCurvature', .35))))
        cover = [self.ax*float(g['hiddenRadius'])*float(g['margin'])/max(math.cos(ya), .3),
                 self.az*float(g['hiddenRadius'])*float(g['margin'])/max(math.cos(pi_), .3)]
        if g['semi'] == 'auto':
            gbd = float(g['depthSemi'])
            self.semi = np.array([max(math.sqrt(gbd/self.kappa[0]), cover[0]), gbd, max(math.sqrt(gbd/self.kappa[1]), cover[1])])
        else:
            self.semi = np.array(g['semi'], float)
        self.plane = (a0, b, c)
        self.kind = g.get('kind', 'conformal')
        self.edge_tb = g.get('edgeBehindTopBottom', [0.0045, 0.0028])
        self.apex_proud_c = float(g['apexProud'])
        # place the globe: its axis passes through the aperture centre on the face plane; grow the semis until the dome grid is covered
        self.mode = g['mode']
        self.hidden = float(g['hiddenRadius'])
        yface_c = float(face_h(side*self.cx, self.cz))
        self.A_ap = np.array([self.cx, yface_c, self.cz])
        self.grown = 0
        for _ in range(60 if self.kind == 'ellipsoid' else 0):
            self.place(float(g['apexProud']), g)
            if not np.isnan(self.front_y(*self.grid_probe())).any():
                break
            if g['semi'] != 'auto':
                raise RuntimeError(f"globe semis {self.semi.tolist()} do not cover the dome out to r={self.hidden}; raise them")
            self.semi[0] *= 1.03
            self.semi[2] *= 1.03
            self.grown += 1
        if self.kind == 'conformal':
            self.E = self.A_ap.copy()
            self.apex_proud = float(g['apexProud'])
        self.floor_behind = float(o['floorBehind'])
        self.shear = float(o['shear'])
        self.lat = float(o['lateralShear'])
        self.floor_blend = float(o['floorBlend'])
        self.rim_blend = float(o['rimBlend'])
        # gaze: iris centre relative to the aperture centre
        self.iris_c = (self.cx+cfg['iris']['offset'][0], self.cz+cfg['iris']['offset'][1])

    def grid_probe(self):
        a = np.linspace(0, 2*np.pi, 48, endpoint=False)
        r = np.linspace(0, self.hidden, 9)[:, None]
        return self.cx+self.ax*r*np.sin(a)[None, :], self.cz+self.az*r*np.cos(a)[None, :]

    def place(self, proud, g):
        for _ in range(8):
            self.E = self.A_ap+self.fp*(self.semi[1]-proud)
            if self.mode != 'edge':
                break
            depths = self.rim_depths(36)
            if np.isnan(depths).any():
                break
            shift = (float(np.mean(depths))-float(g['edgeBehind']))/max(abs(self.fp[1]), .3)
            if abs(shift) < 2e-5:
                break
            proud += shift
        self.apex_proud = proud

    def front_y(self, xc, zc):
        """y of the globe's front surface at canonical (xc, zc). conformal: the donor face surface plus the r10e dome profile (edge a little
        behind the skin rim, apex proud of it); ellipsoid: the analytic ellipsoid, NaN outside its footprint."""
        if self.kind == 'conformal':
            xc, zc = np.broadcast_arrays(np.asarray(xc, float), np.asarray(zc, float))
            u, v, r = self.aperture_polar(xc, zc)
            al = np.arctan2(u, v)
            top, bottom = self.edge_tb
            e_edge = bottom+(top-bottom)*(1+np.cos(al))/2
            e = e_edge-(e_edge+self.apex_proud_c)*(1-np.minimum(r, 1.3)**2)
            return face_h(self.s*xc, zc)+e
        return self.ellipsoid_y(xc, zc)

    def ellipsoid_y(self, xc, zc):
        xc, zc = np.broadcast_arrays(np.asarray(xc, float), np.asarray(zc, float))
        dx, dz = xc-self.E[0], zc-self.E[2]
        k0 = [dx*self.u[0]+dz*self.u[2], dx*self.fp[0]+dz*self.fp[2], dx*self.w[0]+dz*self.w[2]]
        k1 = [self.u[1], self.fp[1], self.w[1]]
        g = self.semi
        alpha = sum((k1[i]/g[i])**2 for i in range(3))
        beta = 2*sum(k0[i]*k1[i]/g[i]**2 for i in range(3))
        gamma = sum((k0[i]/g[i])**2 for i in range(3))-1
        disc = beta*beta-4*alpha*gamma
        with np.errstate(invalid='ignore'):
            t = (-beta-np.sqrt(disc))/(2*alpha)
        return np.where(disc >= 0, self.E[1]+t, np.nan)

    def rim_depths(self, n):
        """Globe front y minus donor skin y on the aperture outline: positive when the globe edge is behind the skin."""
        a = np.linspace(0, 2*np.pi, n, endpoint=False)
        x = self.cx+self.ax*np.sin(a)
        z = self.cz+self.az*np.cos(a)
        return self.front_y(x, z)-face_h(self.s*x, z)

    def aperture_polar(self, xc, zc):
        u = (xc-self.cx)/self.ax
        v = (zc-self.cz)/self.az
        return u, v, np.sqrt(u*u+v*v)

    def cutter(self, xc, Y, zc, yface):
        """Signed distance of the region the orbit removes (negative inside): the aperture column down to the globe floor."""
        fy = self.front_y(xc, zc)
        # lateral and vertical shear: the opening moves with depth, so the upper rim overhangs
        zs = zc-self.shear*(Y-yface)
        xs = xc-self.lat*(Y-yface)
        us = (xs-self.cx)/self.ax
        vs = (zs-self.cz)/self.az
        rs = np.sqrt(us**2+vs**2)
        grad = np.sqrt((us/self.ax)**2+(vs/self.az)**2)/np.maximum(rs, 1e-6)
        ell = ((rs-1)/np.maximum(grad, 1e-6)).astype(np.float32)
        floor_f = np.where(np.isnan(fy), 1.0, Y-(fy+self.floor_behind)).astype(np.float32)
        return smax(ell, floor_f, self.floor_blend)


tick('building eyes')
eyes = []
if spec['eye'] and spec['eye'].get('sides'):
    for side in spec['eye']['sides']:
        eyes.append(Eye(side, spec['eye']))
        e = eyes[-1]
        record['eyes'][str(side)] = {'yawDeg': e.yaw, 'pitchDeg': e.pitch, 'center': e.E.tolist(), 'semi': e.semi.tolist(),
                                     'apexProud': e.apex_proud, 'grown': e.grown, 'kappa': list(map(float, e.kappa)), 'planeFit': list(map(float, e.plane)),
                                     'rimDepthMeanEdge': float(np.nanmean(e.rim_depths(36))),
                                     'rimDepthRange': [float(np.nanmin(e.rim_depths(36))), float(np.nanmax(e.rim_depths(36)))]}

# ---------------------------------------------------------------------------------------------------------------------------------
# 3. The cage: a regular grid warped into ring blocks around the eyes and the nose, heights per loop, analytic tufts and lobes.
CG = spec['cage']
CELL = float(CG['cell'])
LB = int(CG['blendLevels'])
EXT = float(CG['extendStep'])
GAP = float(CG['minRingGap'])
IX = int(math.ceil((XW+.04)/CELL))
J0 = int(math.floor((ZW[0]-.04)/CELL))
J1 = int(math.ceil((ZW[1]+.04)/CELL))
gi = np.arange(-IX, IX+1)
gj = np.arange(J0, J1+1)
NXG, NZG = len(gi), len(gj)
GX = np.repeat((gi*CELL)[:, None], NZG, axis=1)
GZ = np.repeat((gj*CELL)[None, :], NXG, axis=0)
PX, PZ = GX.copy(), GZ.copy()
LVL = np.full((NXG, NZG), -1, np.int32)         # ring level inside a block (0 = block boundary), -1 outside every block
BLK = np.full((NXG, NZG), -1, np.int32)         # 0 left eye, 1 right eye, 2 nose
CLAIMED = np.zeros((NXG, NZG), bool)
blocks = {}
CORNER_VERTS = []
tick(f'cage grid {NXG} x {NZG} cells {CELL}')


def periodic_interp(theta, th_tab, val_tab):
    order = np.argsort(th_tab)
    th_tab, val_tab = np.asarray(th_tab)[order], np.asarray(val_tab)[order]
    return np.interp(theta, np.concatenate([th_tab-2*np.pi, th_tab, th_tab+2*np.pi]), np.concatenate([val_tab, val_tab, val_tab]))


def ring_offsets(entries, theta, band_fn):
    """Offsets (n_tab, n) of the table rings outward from the outline at each theta; each ring at least GAP beyond the one inside it."""
    out = []
    prev = np.zeros_like(theta)
    for e in entries:
        if e.get('offset') == 'band':
            raw = band_fn(theta)
        elif 'gap' in e:
            raw = prev+float(e['gap'])
        else:
            raw = np.full_like(theta, float(e['offset']))
        cur = np.maximum(raw, prev+GAP)
        out.append(cur)
        prev = cur
    return np.array(out)


def block_half_sizes(rshape, entries, band_fn, lb, ext, center, cell_center):
    """Half sizes (cells) of the block: the outermost ring (plus the blend levels) in every direction, plus the centre's offset from its cell."""
    th = np.linspace(-np.pi, np.pi, 721)
    rr = rshape(th)+ring_offsets(entries, th, band_fn)[-1]+lb*ext
    ex = float((rr*np.abs(np.sin(th))).max())+abs(center[0]-cell_center[0])
    ez = float((rr*np.abs(np.cos(th))).max())+abs(center[1]-cell_center[1])
    return int(math.ceil(ex/CELL)), int(math.ceil(ez/CELL))


def add_block(bid, mirror, icx, icz, Ka, Kb, C, rshape, entries, band_fn, LB, EXT, corners=None):
    """Warp the grid window of half sizes (Ka, Kb) cells around cell (icx, icz) into rings about C (canonical coordinates, x scaled by
    mirror). Level l = min(Ka-|a|, Kb-|b|); levels >= l_ap are inside the outline, level l_ap is the outline, the levels from l_ap-1 down
    to LB follow the ring table, the last LB levels blend back into the grid."""
    n_tab = len(entries)
    l_ap = n_tab+LB
    cxi = mirror*icx                                    # physical cell index of the block centre
    i0, i1, j0, j1 = cxi-Ka, cxi+Ka, icz-Kb, icz+Kb
    for cond, msg in ((i0+IX < 0 or i1+IX >= NXG, 'x'), (j0-J0 < 0 or j1-J0 >= NZG, 'z')):
        if cond:
            raise RuntimeError(f'cage block {bid} leaves the grid in {msg}: lower the ring offsets or raise cage.pad')
    sl = (slice(i0+IX, i1+IX+1), slice(j0-J0, j1-J0+1))
    if CLAIMED[sl].any():
        raise RuntimeError(f'cage block {bid} overlaps another block: move the eye or nose, shrink ring offsets, or change cage.cell')
    CLAIMED[sl] = True
    ii = np.arange(i0, i1+1)
    jj = np.arange(j0, j1+1)
    a = ((ii-cxi)*mirror)[:, None]*np.ones((1, len(jj)))
    b = (jj-icz)[None, :]*np.ones((len(ii), 1))
    lev = np.minimum(Ka-np.abs(a), Kb-np.abs(b)).astype(int)
    if Ka-l_ap < 3 or Kb-l_ap < 3:
        raise RuntimeError(f'cage block {bid}: only {Ka-l_ap} x {Kb-l_ap} cells inside the outline; lower cage.cell or the ring count')
    lc = np.minimum(lev, l_ap)
    u = a/(Ka-lc)
    v = b/(Kb-lc)
    xs = u*np.sqrt(np.maximum(1-v*v/2, 0))
    ys = v*np.sqrt(np.maximum(1-u*u/2, 0))
    rho = np.sqrt(xs*xs+ys*ys)
    theta = np.arctan2(xs, ys)
    corner_vertices = []
    if corners:
        # snap the ring vertex nearest to each outline corner onto the corner: a periodic piecewise-linear warp of theta applied at every level
        ring_th = np.sort(theta[lev == l_ap])
        src, dst = [], []
        for tc in corners:
            dd = np.abs((ring_th-tc+np.pi) % (2*np.pi)-np.pi)
            src.append(float(ring_th[int(np.argmin(dd))]))
            dst.append(float(tc))
        order = np.argsort(src)
        src, dst = np.array(src)[order], np.array(dst)[order]
        # unwrap dst to follow src around the circle
        dst = src+((dst-src+np.pi) % (2*np.pi)-np.pi)
        theta = periodic_interp(theta, src, dst-src)+theta
        for s_k in src:
            corner_vertices.append(int(np.argmin(np.where(lev == l_ap, np.abs((np.arctan2(xs, ys)-s_k+np.pi) % (2*np.pi)-np.pi), 9.0))))
    r0 = rshape(theta)
    radius = rho*r0
    outer = lev < l_ap
    if outer.any():
        offs = ring_offsets(entries, theta[outer], band_fn)
        k = (l_ap-lev[outer]).astype(int)                      # 1 .. l_ap
        d = np.where(k <= n_tab, offs[np.minimum(k, n_tab)-1, np.arange(len(k))], offs[-1]+(k-n_tab)*EXT)
        radius[outer] = r0[outer]+d
    cxc, czc = C
    px_c = cxc+radius*np.sin(theta)
    pz_c = czc+radius*np.cos(theta)
    gx_c = (ii*CELL)[:, None]*mirror*np.ones((1, len(jj)))
    gz_c = (jj*CELL)[None, :]*np.ones((len(ii), 1))
    t_ = np.clip((LB-lev)/LB, 0, 1)
    s = np.where(lev < LB, t_*t_*(3-2*t_), 0.0)
    px_c = (1-s)*px_c+s*gx_c
    pz_c = (1-s)*pz_c+s*gz_c
    PX[sl] = px_c*mirror
    PZ[sl] = pz_c
    LVL[sl] = lev
    BLK[sl] = bid
    flat_idx = np.nonzero(np.ones(lev.shape, bool).reshape(-1))[0]
    gidx = (np.arange(i0, i1+1)+IX)[:, None]*NZG+(np.arange(j0, j1+1)-J0)[None, :]
    CORNER_VERTS.extend(int(gidx.reshape(-1)[k]) for k in corner_vertices)
    blocks[bid] = {'slice': sl, 'l_ap': l_ap, 'n_tab': n_tab, 'K': [Ka, Kb], 'center': [icx, icz], 'mirror': mirror, 'entries': entries}


EYE = spec['eye']
ORB = EYE['orbit']
LID = EYE['lid']
APS = EYE['aperture']
ax_, az_ = APS['semi']
cx_, cz_ = APS['center']
band_deg = [r_[0] for r_ in LID['bandPercent']]
band_pct = [r_[1] for r_ in LID['bandPercent']]
BAND_SCALE = float(LID.get('bandScale', 1.0))


def band_fn_theta(theta):
    """Band width (head-local) at the polar angle theta from the top about the aperture centre, + toward the outer corner."""
    return interp_angle(band_deg, band_pct, theta)/100*(2*ax_)*BAND_SCALE


rings_e = EYE['rings']
for side_i, side in enumerate(EYE['sides']):
    icx_e = int(round(cx_/CELL))
    icz_e = int(round(cz_/CELL))
    rshape_e = (lambda th: 1/np.sqrt((np.sin(th)/ax_)**2+(np.cos(th)/az_)**2))
    Ka_e, Kb_e = block_half_sizes(rshape_e, rings_e, band_fn_theta, LB, EXT, (cx_, cz_), (icx_e*CELL, icz_e*CELL))
    add_block(side_i, side, icx_e, icz_e, Ka_e, Kb_e, (cx_, cz_), rshape_e, rings_e, band_fn_theta, LB, EXT)

NOSE = spec['nose']
NP_ = NOSE['pad']


def np_rounded_triangle(P):
    half, top_z, apex_z, rc = float(P['halfWidth']), float(P['topZ']), float(P['apexZ'])-float(P.get('wrapUnder', 0)), float(P['cornerRadius'])
    corners = np.array([(-half, top_z), (half, top_z), (0.0, apex_z)])
    sides_len = [np.linalg.norm(corners[(i+1) % 3]-corners[(i+2) % 3]) for i in range(3)]
    incentre = sum(sides_len[i]*corners[i] for i in range(3))/sum(sides_len)
    area = abs(np.cross(corners[1]-corners[0], corners[2]-corners[0]))/2
    inradius = 2*area/sum(sides_len)
    inner = incentre+(corners-incentre)*((inradius-rc)/inradius)
    return inner, rc, incentre


inner_n, rc_n, incentre_n = np_rounded_triangle(NP_)
outline = []
for ang in np.linspace(0, 2*np.pi, int(NP_['outlinePoints']), endpoint=False):
    direction = np.array([math.cos(ang), math.sin(ang)])
    outline.append(inner_n[int(np.argmax(inner_n@direction))]+rc_n*direction)
outline = np.array(outline)
n_th = np.arctan2(outline[:, 0]-incentre_n[0], outline[:, 1]-incentre_n[1])
n_r = np.hypot(outline[:, 0]-incentre_n[0], outline[:, 1]-incentre_n[1])
rshape_n = (lambda th: periodic_interp(th, n_th, n_r))
rings_n = NP_['rings']
LB_N = int(NP_.get('blendLevels', LB))
EXT_N = float(NP_.get('extendStep', EXT))
icz_n = int(round(incentre_n[1]/CELL))
band_n = (lambda th: np.full_like(th, .005))
corners_n = [float(math.atan2(p_[0]-incentre_n[0], p_[1]-incentre_n[1])) for p_ in inner_n]
Ka_n, Kb_n = block_half_sizes(rshape_n, rings_n, band_n, LB_N, EXT_N, (float(incentre_n[0]), float(incentre_n[1])), (0.0, icz_n*CELL))
add_block(2, 1, 0, icz_n, Ka_n, Kb_n, (float(incentre_n[0]), float(incentre_n[1])), rshape_n, rings_n,
          band_n, LB_N, EXT_N, corners_n)

# folded cage faces: the signed (x, z) area of every cell must stay positive
vid = np.arange(NXG*NZG).reshape(NXG, NZG)
cage_faces = np.stack([vid[:-1, :-1], vid[1:, :-1], vid[1:, 1:], vid[:-1, 1:]], axis=-1).reshape(-1, 4)
fx, fz = PX.reshape(-1)[cage_faces], PZ.reshape(-1)[cage_faces]
area2 = sum(fx[:, i]*fz[:, (i+1) % 4]-fx[:, (i+1) % 4]*fz[:, i] for i in range(4))
n_fold = int((area2 <= 1e-12).sum())
record['cage'].update({'grid': [NXG, NZG], 'cell': CELL, 'faces': int(len(cage_faces)), 'foldedFaces': n_fold,
                       'blocks': {str(k): {'halfSizes': v['K'], 'centerCell': v['center'], 'ringLevelOutline': v['l_ap']} for k, v in blocks.items()}})
tick(f"cage {len(cage_faces)} faces, {n_fold} folded, blocks {record['cage']['blocks']}")
if n_fold:
    bad = np.nonzero(area2 <= 1e-12)[0][:5]
    for i in bad[:3]:
        tick('fold ' + str([(round(float(PX.reshape(-1)[v]), 4), round(float(PZ.reshape(-1)[v]), 4), int(LVL.reshape(-1)[v]), int(BLK.reshape(-1)[v])) for v in cage_faces[i]]))
if n_fold and not CG.get('allowFolds'):
    raise RuntimeError(f'cage has {n_fold} folded faces (first at {[(float(fx[i].mean()), float(fz[i].mean())) for i in bad]}): '
                       f'fewer or tighter rings, a larger cage.blendLevels or a smaller cage.cell')

# ----- heights


def fill_nan(Y2):
    """Vertices outside the head's silhouette (no ray hit) take the mean of their valid neighbours, repeated outward."""
    for _ in range(120):
        bad = np.isnan(Y2)
        if not bad.any():
            break
        pad = np.pad(Y2, 1, constant_values=np.nan)
        nb = np.stack([pad[:-2, 1:-1], pad[2:, 1:-1], pad[1:-1, :-2], pad[1:-1, 2:]])
        cnt = (~np.isnan(nb)).sum(axis=0)
        mean = np.where(cnt > 0, np.nansum(nb, axis=0)/np.maximum(cnt, 1), np.nan)
        Y2 = np.where(bad, mean, Y2)
    return np.where(np.isnan(Y2), np.nanmedian(Y2), Y2)


def bicubic(H, x, z):
    """Catmull-Rom bicubic sample of the filled heightfield H on the grid hx x hz (C1, so the cage sees no kinks at the ray grid lines)."""
    fx = (np.asarray(x, float)-hx[0])/RS
    fz = (np.asarray(z, float)-hz[0])/RS
    i0 = np.clip(np.floor(fx).astype(int), 1, len(hx)-3)
    j0 = np.clip(np.floor(fz).astype(int), 1, len(hz)-3)
    tx = np.clip(fx-i0, 0, 1)
    tz = np.clip(fz-j0, 0, 1)

    def wts(t):
        return [(-t**3+2*t**2-t)/2, (3*t**3-5*t**2+2)/2, (-3*t**3+4*t**2+t)/2, (t**3-t**2)/2]
    wx, wz = wts(tx), wts(tz)
    out = 0.0
    for a_ in range(4):
        for b_ in range(4):
            out = out+wx[a_]*wz[b_]*H[i0+a_-1, j0+b_-1]
    return out


Hs_fill = fill_nan(Hs.astype(np.float64))
Ha_fill = fill_nan(Ha.astype(np.float64))
PXf, PZf = PX.reshape(-1), PZ.reshape(-1)
yasm = bicubic(Ha_fill, PXf, PZf)
ydon = bicubic(Hs_fill, PXf, PZf)


record['cage']['rayMisses'] = int(np.isnan(Ha).sum())
dwin = np.minimum(np.minimum(XLIM(PZf)-np.abs(PXf), np.minimum(PZf-ZW[0], ZW[1]-PZf)), YC-yasm)
wgt = smoothstep((dwin-MARGIN)/FADE)
YF = ydon.copy()                                   # the feature surface (before fading into the assembled skin)
LVLf, BLKf = LVL.reshape(-1), BLK.reshape(-1)
crease_v = np.zeros(NXG*NZG)
inside_eye = np.zeros(NXG*NZG, bool)


def angle_mult(table, alpha):
    if not table:
        return 1.0
    return interp_angle([r_[0] for r_ in table], [r_[1] for r_ in table], alpha)


def open_weight(alpha):
    half = float(ORB['lateralOpenDeg'])/2
    if half <= 0:
        return np.zeros_like(alpha)
    dd = np.abs((np.degrees(alpha)-float(ORB['lateralCenterDeg'])+180) % 360-180)
    return smoothstep(1-(dd-half)/max(float(ORB['openFeather']), 1e-6))


for bid in blocks:
    if bid > 1:
        continue
    blk = blocks[bid]
    mask = BLKf == bid
    idx_m = np.nonzero(mask)[0]
    s_ = blk['mirror']
    xc, zc = s_*PXf[mask], PZf[mask]
    lev = LVLf[mask]
    yb = ydon[mask]
    eye = eyes[bid]
    u_, v_, _ = eye.aperture_polar(xc, zc)
    alpha = np.arctan2(u_, v_)
    opn = open_weight(alpha)
    y = yb.copy()
    l_ap = blk['l_ap']
    ins = lev > l_ap
    gy = eye.front_y(xc, zc)
    y = np.where(ins & ~np.isnan(gy), gy+float(ORB['floorBehind']), y)
    ring0 = lev == l_ap
    y = np.where(ring0 & ~np.isnan(gy), gy-float(ORB['edgeCover']), y)
    cv = np.zeros(len(lev))
    cv[ring0] = float(CG['creaseAperture'])
    for k, e in enumerate(blk['entries'], start=1):
        sel = lev == l_ap-k
        if not sel.any():
            continue
        rise = float(e['rise'])*angle_mult(e.get('byAngle'), alpha)*(1-opn)
        y = np.where(sel, yb-rise, y)
        cv[sel] = np.maximum(cv[sel], float(e.get('crease', 0)))
    YF[idx_m] = y
    crease_v[idx_m] = cv
    inside_eye[idx_m[ins]] = True

mask = BLKf == 2
idx_m = np.nonzero(mask)[0]
l_pad = blocks[2]['l_ap']
lev = LVLf[mask]
y = ydon[mask].copy()
y = np.where(lev >= l_pad, y-float(NP_['lift']), y)
cv = np.zeros(len(lev))
cv[lev == l_pad] = float(CG['creaseNose'])
for k, e in enumerate(blocks[2]['entries'], start=1):
    sel = lev == l_pad-k
    y = np.where(sel, ydon[mask]-float(e['rise']), y)
    cv[sel] = np.maximum(cv[sel], float(e.get('crease', 0)))
YF[idx_m] = y
crease_v[idx_m] = cv

# tufts, muzzle lobes, philtrum groove, nose wedge: analytic outward height (positive = toward the viewer), sampled at the cage vertices
T = spec['tufts']
tuft_list = []
for tuft in (T.get('list') or []):
    for side in (1, -1):
        p0 = np.array([side*tuft['root'][0], tuft['root'][1]])
        p1 = np.array([side*tuft['tip'][0], tuft['tip'][1]])
        d = (p1-p0)/np.linalg.norm(p1-p0)
        tuft_list.append({'side': side, 'p0': p0, 'd': d, 'n': np.array([-d[1], d[0]]), **tuft})
        record['tufts'].append({'side': side, 'p0': p0.tolist(), 'd': d.tolist(), **tuft})


def tuft_delta(x, z):
    out = np.zeros_like(x)
    for t in tuft_list:
        qx, qz = x-t['p0'][0], z-t['p0'][1]
        u = qx*t['d'][0]+qz*t['d'][1]
        w_ = qx*t['n'][0]+qz*t['n'][1]
        L = float(t['length'])
        tt = np.clip(u/L, 0, 1)
        taper = np.maximum(1-tt**float(T['taperPower']), 0)**float(T['taperExponent'])
        Wt = np.maximum(float(t['widthRoot'])*taper, float(T['tipRadius']))
        Tt = float(t['thickRoot'])*taper**float(T['thicknessExponent'])
        prof = Tt*np.maximum(1-(w_/Wt)**2, 0)**float(T['sectionPower'])
        cap = float(t['widthRoot'])*float(T['rootCap'])
        capf = np.where(u < 0, np.maximum(1-(u/cap)**2, 0)**.5, 1.0)
        prof = prof*capf*(u <= L)
        prof = prof+float(t['lift'])*tt*tt*(prof > 0)
        out = np.maximum(out, prof)
    return out


MZ = spec['muzzle']
WD = NOSE['wedge']
extra = tuft_delta(PXf, PZf)
if float(MZ['lobeLift']) != 0:
    for sd in (1, -1):
        r2 = ((PXf-sd*float(MZ['lobeCenter'][0]))**2+(PZf-float(MZ['lobeCenter'][1]))**2)/float(MZ['lobeRadius'])**2
        extra = extra+float(MZ['lobeLift'])*np.maximum(1-r2, 0)**2
if float(MZ['philtrumDepth']) != 0:
    z0, z1 = MZ['philtrumZ']
    extra = extra-float(MZ['philtrumDepth'])*np.exp(-(PXf/float(MZ['philtrumWidth']))**2)*smoothstep((PZf-z0)/.01)*smoothstep((z1-PZf)/.01)
if float(WD['lead']) != 0:
    r2 = ((PXf-float(WD['center'][0]))/float(WD['half'][0]))**2+((PZf-float(WD['center'][1]))/float(WD['half'][1]))**2
    extra = extra+float(WD['lead'])*np.maximum(1-r2, 0)**2
extra = np.where(inside_eye, 0.0, extra)
YF = YF-extra
Y = yasm+wgt*(YF-yasm)
cage_xyz = np.stack([PXf, Y, PZf], axis=1)
# the border band (donor features faded out): put the vertices on the assembled skin itself (nearest point), not on its front heightfield,
# so that steep cheek polygons and anything the front rays cannot see still meet the old skin exactly
_band = np.nonzero(wgt < 0.999)[0]
_moved = 0.0
for _i in _band:
    _loc, _nrm, _idx, _dist = asm_tree.find_nearest(Vector(cage_xyz[_i].tolist()))
    if _loc is not None:
        _p = (1-wgt[_i])*np.array(_loc)+wgt[_i]*cage_xyz[_i]
        _moved = max(_moved, float(np.linalg.norm(_p-cage_xyz[_i])))
        cage_xyz[_i] = _p
record['cage']['borderProjected'] = {'vertices': int(len(_band)), 'maxMove': _moved}
record['cage'].update({'tuftCount': len(tuft_list), 'yRange': [float(Y.min()), float(Y.max())]})
tick(f'cage heights: y {Y.min():.4f} to {Y.max():.4f}')

# material per cage face: the lid band (faces between the aperture loop and the band loop) and the nose pad
cf = cage_faces
face_mat = np.zeros(len(cf), np.int32)
band_on = LID.get('bandMode', 'skin') == 'skin'
for bid in (0, 1):
    if bid not in blocks or not band_on:
        continue
    l_ap = blocks[bid]['l_ap']
    in_b = (BLKf[cf] == bid).all(axis=1)
    lv = LVLf[cf]
    face_mat[in_b & (lv >= l_ap-1).all(axis=1) & (lv <= l_ap).all(axis=1)] = 1
face_mat[(BLKf[cf] == 2).all(axis=1) & (LVLf[cf] >= blocks[2]['l_ap']).all(axis=1)] = 2
record['cage']['bandFaces'] = int((face_mat == 1).sum())
record['cage']['padFaces'] = int((face_mat == 2).sum())


def cage_subdivide():
    """Catmull-Clark the cage with Blender's subsurf modifier (edge creases from the ring loops, material per face inherited)."""
    me_c = bpy.data.meshes.new('face cage')
    me_c.from_pydata(cage_xyz.tolist(), [], cf.tolist())
    me_c.update()
    ne = len(me_c.edges)
    ev_ = np.empty(ne*2, np.int32)
    me_c.edges.foreach_get('vertices', ev_)
    ev_ = ev_.reshape(-1, 2)
    same = (BLKf[ev_[:, 0]] == BLKf[ev_[:, 1]]) & (BLKf[ev_[:, 0]] >= 0) & (LVLf[ev_[:, 0]] == LVLf[ev_[:, 1]])
    cr = np.where(same, np.minimum(crease_v[ev_[:, 0]], crease_v[ev_[:, 1]]), 0.0).astype(np.float32)
    attr = me_c.attributes.new('crease_edge', 'FLOAT', 'EDGE')
    attr.data.foreach_set('value', cr)
    if CORNER_VERTS:
        cvv = np.zeros(len(cage_xyz), np.float32)
        cvv[CORNER_VERTS] = 1.0
        attr_v = me_c.attributes.new('crease_vert', 'FLOAT', 'POINT')
        attr_v.data.foreach_set('value', cvv)
    me_c.polygons.foreach_set('material_index', face_mat)
    me_c.polygons.foreach_set('use_smooth', np.ones(len(cf), bool))
    me_c.update()
    ob_c = bpy.data.objects.new('face cage', me_c)
    bpy.context.scene.collection.objects.link(ob_c)
    md = ob_c.modifiers.new('subd', 'SUBSURF')
    md.levels = int(CG['levels'])
    md.render_levels = int(CG['levels'])
    md.use_creases = True
    md.boundary_smooth = 'PRESERVE_CORNERS'
    dg = bpy.context.evaluated_depsgraph_get()
    ev_o = ob_c.evaluated_get(dg)
    m2 = ev_o.to_mesh()
    nv2 = len(m2.vertices)
    co = np.empty(nv2*3, np.float32)
    m2.vertices.foreach_get('co', co)
    npoly2 = len(m2.polygons)
    ls2_ = np.empty(npoly2, np.int32)
    m2.polygons.foreach_get('loop_start', ls2_)
    lt2_ = np.diff(np.append(ls2_, len(m2.loops)))
    assert (lt2_ == 4).all(), 'subdivided cage must be all quads'
    lv2_ = np.empty(len(m2.loops), np.int32)
    m2.loops.foreach_get('vertex_index', lv2_)
    mt2 = np.empty(npoly2, np.int32)
    m2.polygons.foreach_get('material_index', mt2)
    ev_o.to_mesh_clear()
    result = (co.reshape(-1, 3).astype(np.float64), lv2_.reshape(-1, 4).astype(np.int64), np.zeros((0, 3), np.int64), mt2)
    try:
        bpy.data.libraries.write(str(args.out/'cage.blend'), {ob_c}, fake_user=True)
    except Exception as exc:
        record['cage']['cageBlendError'] = str(exc)
    bpy.data.objects.remove(ob_c, do_unlink=True)
    bpy.data.meshes.remove(me_c)
    return result


# ---------------------------------------------------------------------------------------------------------------------------------
# 4. Stitch into the scene skin.
bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
localize()
head = skin_object()
me = head.data
assert len(me.vertices) == nv and len(me.polygons) == npoly
materials = list(me.materials)
mat_band_skin = bpy.data.materials.get('Upper emphasized eyelid') or material('Upper emphasized eyelid', .03)
mat_nose_skin = bpy.data.materials.get('Rounded animal nose') or material('Rounded animal nose', .075)
SLOT = np.array([0, len(materials), len(materials)+1])
materials = materials+[mat_band_skin, mat_nose_skin]
fine_world, quads_f, tris_f, quad_mat = cage_subdivide()
record['cage']['subdivided'] = {'vertices': int(len(fine_world)), 'quads': int(len(quads_f)), 'levels': int(CG['levels'])}
tick(f"subdivided cage: {len(fine_world)} vertices, {len(quads_f)} quads")
# polygon centroids
cs = np.add.reduceat(V[loop_v], ls, axis=0)/lt[:, None]


def in_window(c, shrink):
    return ((np.abs(c[:, 0]) < XLIM(c[:, 2])-shrink) & (c[:, 2] > ZW[0]+shrink) & (c[:, 2] < ZW[1]-shrink) & (c[:, 1] < YC-shrink))


def centroid(vs, polys):
    return vs[polys].mean(axis=1)


delete = in_window(cs, 0.0)


def polys_area(vs, polys):
    a, b, c = vs[polys[:, 0]], vs[polys[:, 1]], vs[polys[:, 2]]
    area = .5*np.linalg.norm(np.cross(b-a, c-a), axis=1)
    if polys.shape[1] == 4:
        d = vs[polys[:, 3]]
        area += .5*np.linalg.norm(np.cross(c-a, d-a), axis=1)
    return float(area.sum())


quad_sel = np.nonzero(delete & (lt == 4))[0]
coarse_window_area = polys_area(V, loop_v[ls[quad_sel][:, None]+np.arange(4)[None, :]])
record['seam']['coarseWindowArea'] = coarse_window_area
record['seam']['fineArea'] = polys_area(fine_world, quads_f) if len(quads_f) else 0.0
tick(f"area coarse window {coarse_window_area:.4f} polygons {int(delete.sum())}; fine {record['seam']['fineArea']:.4f} quads {len(quads_f)}")


def boundary_edges(polys):
    """Directed boundary edges (a, b) of a list of vertex-index arrays (each (m, k)): edges with no opposite partner."""
    ea, eb = [], []
    for pa in polys:
        if len(pa) == 0:
            continue
        ea.append(pa.reshape(-1))
        eb.append(np.roll(pa, -1, axis=1).reshape(-1))
    if not ea:
        return np.zeros((0, 2), np.int64)
    a, b = np.concatenate(ea), np.concatenate(eb)
    big = int(max(a.max(), b.max()))+1
    fwd = a*big+b
    rev = b*big+a
    present = np.isin(fwd, rev)
    return np.stack([a[~present], b[~present]], axis=1)


def loops_from_edges(edges):
    """Chain directed boundary edges into closed vertex loops (lists in edge direction). Returns (loops, pinched vertices)."""
    nxt = {}
    pinch = set()
    for a, b in edges.tolist():
        if a in nxt:
            pinch.add(a)
        nxt[a] = b
    loops, seen = [], set()
    for start in list(nxt):
        if start in seen:
            continue
        loop, cur = [], start
        while cur not in seen and cur in nxt:
            seen.add(cur)
            loop.append(cur)
            cur = nxt[cur]
        loops.append(loop)
    return loops, pinch


# Coarse polygons kept (not deleted) as ragged vertex arrays; boundary check on the hole they leave.
keep_idx = np.nonzero(~delete)[0]
for attempt in range(8):
    polys_by_len = {}
    for k in (3, 4):
        sel = keep_idx[lt[keep_idx] == k]
        if len(sel):
            polys_by_len[k] = loop_v[ls[sel][:, None]+np.arange(k)[None, :]]
    edges = boundary_edges(list(polys_by_len.values()))
    # A vertex with two outgoing boundary edges pinches the hole: drop the polygons around it and retry.
    out_count = np.bincount(edges[:, 0], minlength=nv) if len(edges) else np.zeros(nv, int)
    pinched = np.nonzero(out_count > 1)[0]
    if len(pinched) == 0:
        break
    kill = np.isin(loop_v, pinched)
    owner = np.repeat(np.arange(npoly), lt)
    bad = np.unique(owner[kill])
    keep_idx = np.setdiff1d(keep_idx, bad)
else:
    raise RuntimeError('coarse hole boundary stays pinched')
coarse_loops, _ = loops_from_edges(edges)
tick(f'coarse hole boundary: {len(coarse_loops)} loops, sizes {[len(l) for l in coarse_loops]}')

# The fine patch is what lies inside the window and at least MARGIN (straight-line distance) from the coarse hole's boundary loop, so
# the two loops are parallel curves and bridge cleanly even around corners.
loop_pts = V[np.array(coarse_loops[0])]
loop_pts = np.concatenate([loop_pts, .5*(loop_pts+np.roll(loop_pts, -1, axis=0))])


def fine_keep(polys):
    if len(polys) == 0:
        return np.zeros(0, bool)
    cen_ = fine_world[polys].mean(axis=1)
    keep_ = in_window(cen_, 0.0)
    phi = np.minimum(np.minimum(XLIM(cen_[:, 2])-np.abs(cen_[:, 0]), np.minimum(cen_[:, 2]-ZW[0], ZW[1]-cen_[:, 2])), YC-cen_[:, 1])
    near = np.nonzero(keep_ & (phi < MARGIN+.03))[0]
    for a_ in range(0, len(near), 4000):
        part = near[a_:a_+4000]
        d2 = ((cen_[part][:, None, :]-loop_pts[None, :, :])**2).sum(axis=2).min(axis=1)
        keep_[part[d2 < MARGIN**2]] = False
    return keep_


_kq = fine_keep(quads_f)
quads_k, tris_k = quads_f[_kq], tris_f[fine_keep(tris_f)]
qmat_k = quad_mat[_kq]
# Fine patch: boundary loops of the kept fine polygons, with the same pinch repair.
fq, ft, fm = quads_k, tris_k, qmat_k
for attempt in range(20):
    fedges = boundary_edges([fq, ft])
    out_count = np.bincount(fedges[:, 0], minlength=len(fine_world)) if len(fedges) else np.zeros(len(fine_world), int)
    pinched = np.nonzero(out_count > 1)[0]
    if len(pinched) == 0:
        break
    qk = ~np.isin(fq, pinched).any(axis=1) if len(fq) else np.zeros(0, bool)
    tk = ~np.isin(ft, pinched).any(axis=1) if len(ft) else np.zeros(0, bool)
    fq, ft, fm = fq[qk], ft[tk], fm[qk]
else:
    raise RuntimeError('fine patch boundary stays pinched')
fine_loops, _ = loops_from_edges(fedges)
# Small extra loops are holes the pinch repair left (a vertex where the iso-surface touches itself): fill each with a fan.
if len(fine_loops) > 1:
    fine_loops.sort(key=len, reverse=True)
    fill_tris, extra_v = [], []
    for lp_ in fine_loops[1:]:
        if len(lp_) > 120:
            raise RuntimeError(f'fine patch has a hole of {len(lp_)} edges that is not a pinch repair, at {fine_world[lp_].mean(axis=0).round(4).tolist()}')
        centre_ = fine_world[lp_].mean(axis=0)
        cid = len(fine_world)+len(extra_v)
        extra_v.append(centre_)
        for a_, b_ in zip(lp_, lp_[1:]+lp_[:1]):
            fill_tris.append((b_, a_, cid))
        record['seam'].setdefault('filledPinchHoles', []).append({'edges': len(lp_), 'at': centre_.tolist()})
    fine_world = np.concatenate([fine_world, np.array(extra_v)])
    ft = np.concatenate([ft, np.array(fill_tris, dtype=ft.dtype if len(ft) else np.int64).reshape(-1, 3)]) if len(ft) else np.array(fill_tris, dtype=np.int64)
    fine_loops = fine_loops[:1]
if len(coarse_loops) != 1 or len(fine_loops) != 1:
    raise RuntimeError(f'seam: expected one coarse and one fine boundary loop, got {[len(l) for l in coarse_loops]} and {[len(l) for l in fine_loops]}')

# Orientation of the fine polygons: outward is toward the front of the head (-y) on the face.
def mean_front_normal(vs, polys):
    a, b, c = vs[polys[:, 0]], vs[polys[:, 1]], vs[polys[:, 2]]
    n = np.cross(b-a, c-a)
    return float((n[:, 1]/np.maximum(np.linalg.norm(n, axis=1), 1e-30)).mean())


flip = mean_front_normal(fine_world, fq if len(fq) else ft) > 0
if flip:
    fq, ft = fq[:, ::-1].copy(), ft[:, ::-1].copy()
    fine_loops = [list(reversed(fine_loops[0]))]
    record['seam']['fineFlipped'] = True
# compact the fine vertices to those the kept polygons use (the margin ring was dropped)
used_f = np.zeros(len(fine_world), bool)
used_f[fq.reshape(-1)] = True
used_f[ft.reshape(-1)] = True
remap_f = np.cumsum(used_f)-1
fine_world = fine_world[used_f]
fq, ft = remap_f[fq], remap_f[ft]
fine_loop = remap_f[np.array(fine_loops[0])]
coarse_loop = np.array(coarse_loops[0])


def zipper(outer, inner, cv, fv):
    """Triangles bridging two closed loops that run the same way round: outer (coarse vertex ids into cv) and inner (fine ids into fv).
    Dynamic programming over monotone pairings (each rung joins an outer and an inner vertex) minimizes the total rung length, so the
    pairing cannot drift where the loops differ in length, as a greedy shortest-diagonal zipper does. Returns triples of ('c'|'f', id)."""
    po, pi = cv[outer], fv[inner]
    nO, nI = len(outer), len(inner)
    j0 = int(np.argmin(np.linalg.norm(pi-po[0], axis=1)))
    inner = np.roll(inner, -j0)
    pi = np.roll(pi, -j0, axis=0)
    idx = np.arange(nI)
    cost = np.empty(nI)
    came = np.zeros((nO, nI), np.int32)          # column where the path entered row i
    rung = np.linalg.norm(pi-po[0], axis=1)
    cost[:] = np.cumsum(rung)
    for i in range(1, nO):
        rung = np.linalg.norm(pi-po[i], axis=1)
        S = np.cumsum(rung)
        val = cost-(S-rung)                      # entering at column k costs cost_prev[k] - S[k-1]
        rm = np.minimum.accumulate(val)
        k = np.maximum.accumulate(np.where(val <= rm, idx, 0))
        came[i] = k
        cost = rm+S
    # backtrack from (nO-1, nI-1)
    moves = []                                   # ('o', i, j): outer advance from (i-1, j) to (i, j); ('i', i, t): inner advance (i, t-1) -> (i, t)
    i, j = nO-1, nI-1
    while i > 0:
        k = int(came[i, j])
        for t in range(j, k, -1):
            moves.append(('i', i, t))
        moves.append(('o', i, k))
        j = k
        i -= 1
    for t in range(j, 0, -1):
        moves.append(('i', 0, t))
    moves.reverse()
    tris = []
    for kind, i, t in moves:
        if kind == 'o':
            tris.append((('c', outer[i-1]), ('c', outer[i]), ('f', inner[t])))
        else:
            tris.append((('f', inner[t]), ('f', inner[t-1]), ('c', outer[i])))
    # close the cycle: advance the outer pointer to the start, then the inner one
    tris.append((('c', outer[nO-1]), ('c', outer[0]), ('f', inner[nI-1])))
    tris.append((('f', inner[0]), ('f', inner[nI-1]), ('c', outer[0])))
    return tris


# Final vertex array: used coarse vertices first, then the fine ones.
lens = lt[keep_idx]
starts = ls[keep_idx]
cum = np.cumsum(lens)
loop_idx = np.arange(cum[-1])-np.repeat(cum-lens, lens)+np.repeat(starts, lens)
coarse_loops_v = loop_v[loop_idx]
used_c = np.zeros(nv, bool)
used_c[coarse_loops_v] = True
remap_c = np.cumsum(used_c)-1
n_c = int(used_c.sum())
n_f = len(fine_world)
V_out = np.concatenate([V[used_c], fine_world], axis=0)


def build_polys(band):
    """All polygons as one flat loop array with offsets, in the final vertex numbering."""
    loops, offs, mats = [remap_c[coarse_loops_v]], [np.cumsum(np.r_[0, lens])[:-1]], [mat_idx[keep_idx]]
    count = int(lens.sum())
    for polys in (fq, ft):
        if len(polys):
            k = polys.shape[1]
            loops.append((polys+n_c).reshape(-1))
            offs.append(count+np.arange(len(polys))*k)
            mats.append(SLOT[fm] if polys is fq else np.zeros(len(polys), np.int32))
            count += polys.size
    if len(band):
        loops.append(band.reshape(-1))
        offs.append(count+np.arange(len(band))*3)
        mats.append(np.zeros(len(band), np.int32))
    return np.concatenate(loops), np.concatenate(offs), np.concatenate(mats)


def orientation_report(loops, offs, nvert):
    """Directed-edge check: every directed edge once, its reverse once. Returns (duplicates, unpaired)."""
    ends = np.r_[offs[1:], len(loops)]
    nxt = np.roll(loops, -1)
    nxt[ends-1] = loops[offs]
    fwd = loops.astype(np.int64)*nvert+nxt
    rev = nxt.astype(np.int64)*nvert+loops
    uf, cf = np.unique(fwd, return_counts=True)
    return int((cf > 1).sum()), int((~np.isin(rev, uf)).sum())


chosen = None
for variant in range(2):
    # variant 0: outer = the coarse loop reversed (it runs the other way round the hole), inner = fine loop as is
    outer = coarse_loop[::-1] if variant == 0 else coarse_loop
    inner = fine_loop if variant == 0 else fine_loop[::-1]
    ring = zipper(outer, inner, V, fine_world)
    band = np.array([[remap_c[i] if kind == 'c' else n_c+i for kind, i in tri] for tri in ring], dtype=np.int64)
    loops_all, offs_all, mats_all = build_polys(band)
    dup, unpaired = orientation_report(loops_all, offs_all, len(V_out))
    record['seam'][f'variant{variant}'] = {'duplicateDirectedEdges': dup, 'unpairedEdges': unpaired, 'bridgeTriangles': len(band)}
    if dup == 0 and unpaired == 0:
        chosen = variant
        break
tick(f"zipper {record['seam']}")
if chosen is None:
    raise RuntimeError(f"seam bridge is not manifold: {record['seam']}")
mean_edge_bridge = float(np.mean([np.linalg.norm(V_out[t[0]]-V_out[t[1]]) for t in band[:200]]))

# Heights of the old skin under points (mouth curves follow the skin), read before the swap.
old_tree = BVHTree.FromObject(head, bpy.context.evaluated_depsgraph_get())

bt = V_out[band]
bn = np.cross(bt[:, 1]-bt[:, 0], bt[:, 2]-bt[:, 0])
bl = np.linalg.norm(bn, axis=1)
bn = bn/np.maximum(bl[:, None], 1e-30)
rs_ = np.random.default_rng(3).choice(len(fq), size=min(1500, len(fq)), replace=False)
fqq = fine_world[fq[rs_]]
fn = np.cross(fqq[:, 1]-fqq[:, 0], fqq[:, 2]-fqq[:, 0])
fn = fn/np.maximum(np.linalg.norm(fn, axis=1), 1e-30)[:, None]
fdots = np.array([float(np.dot(n_, np.array(old_tree.find_nearest(Vector(c_.tolist()))[1]))) for c_, n_ in zip(fqq.mean(axis=1), fn)])
record['seam']['fineVsOldNormal'] = {'flipped': int((fdots < 0).sum()), 'of': int(len(fdots)), 'fineFlipApplied': bool(flip)}
cen_b = bt.mean(axis=1)
dots = []
for c_, n_ in zip(cen_b, bn):
    loc_, nrm_, _, dist_ = old_tree.find_nearest(Vector(c_.tolist()))
    dots.append(float(np.dot(n_, np.array(nrm_))))
dots = np.array(dots)
record['seam']['bandVsOldNormal'] = {'flipped': int((dots < 0).sum()), 'under0.7': int((dots < 0.7).sum()), 'of': int(len(dots)), 'min': float(dots.min())}
record['seam']['bandNormalFrontness'] = {'min': float(bn[:, 1].min()), 'negative': int((bn[:, 1] > 0).sum()), 'minArea': float(bl.min()/2), 'medianArea': float(np.median(bl)/2)}
d_f = np.array([old_tree.find_nearest(Vector(v.tolist()))[3] for v in fine_world[fine_loop]])
record['seam']['fineLoopToOldSkin'] = {'mean': float(d_f.mean()), 'max': float(d_f.max()),
    'worst': [[round(float(v_), 4) for v_ in fine_world[fine_loop][i_]] + [round(float(d_f[i_]), 4)] for i_ in np.argsort(-d_f)[:6]],
    'over0.002': int((d_f > .002).sum()), 'of': int(len(d_f))}
tick(f"fine loop distance to the old skin: mean {d_f.mean():.6f} max {d_f.max():.6f}")

# Write the mesh.
new_mesh = bpy.data.meshes.new('Head skin with fine face')
new_mesh.vertices.add(len(V_out))
new_mesh.vertices.foreach_set('co', V_out.astype(np.float32).reshape(-1))
new_mesh.loops.add(len(loops_all))
new_mesh.loops.foreach_set('vertex_index', loops_all.astype(np.int32))
new_mesh.polygons.add(len(offs_all))
new_mesh.polygons.foreach_set('loop_start', offs_all.astype(np.int32))
new_mesh.polygons.foreach_set('material_index', mats_all.astype(np.int32))
new_mesh.polygons.foreach_set('use_smooth', np.ones(len(offs_all), bool))
new_mesh.update(calc_edges=True)
for m_ in materials:
    new_mesh.materials.append(m_)
old_mesh = head.data
head.data = new_mesh
bpy.data.meshes.remove(old_mesh)
# Islands (a tuft tip that lets go of the skin, a sliver the opening cutter splits off): drop up to MAX_ISLAND vertices each and record them.
groups_ = fc.small_components(head.data, int(spec.get('maxIsland', 3000)))
if groups_:
    co_all = fc.mesh_arrays(head.data)[0]
    record['islandsRemoved'] = [{'vertices': int(len(g_)), 'bounds': [co_all[g_].min(axis=0).tolist(), co_all[g_].max(axis=0).tolist()]}
                                for g_ in groups_]
    fc._delete_vertices(head, groups_)
    tick(f"removed islands {record['islandsRemoved']}")
after_stats = fc.fast_mesh_stats(head.data)
tick(f'skin after stitch {after_stats} (before {before_stats})')
record['skin'] = {'before': before_stats, 'after': after_stats}
if after_stats['components'] != 1 or after_stats['nonManifoldEdges'] != 0:
    bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'geometry-failure.blend'))
    raise RuntimeError(f'skin after stitch is not one closed solid: {after_stats}')

depsgraph = bpy.context.evaluated_depsgraph_get()
new_tree = BVHTree.FromObject(head, depsgraph)
scene_objects = {o.name: o for o in bpy.context.scene.objects}


def get_material(name, gray):
    return bpy.data.materials.get(name) or material(name, gray)


# ---------------------------------------------------------------------------------------------------------------------------------
# 5. Eyes: analytic globe (polar dome grid), band as a material zone, conformal iris lens.
checks = {}
if eyes and not args.skin_only:
    E = spec['eye']
    G, IR = E['globe'], E['iris']
    mat_white = get_material('Ocular white', .9)
    mat_iris = get_material('Charcoal iris and black pupil', .02)
    mat_band = get_material('Upper emphasized eyelid', .03)
    for name in list(scene_objects):
        if name.startswith(('head_eye_globe_', 'head_iris_and_pupil_', 'head_upper_emphasized_lid_')):
            bpy.data.objects.remove(scene_objects[name], do_unlink=True)
    STRIP = LID.get('strip') or {}
    STRIP = STRIP if STRIP.get('mode') == 'shell' else {}
    STRIP = {} if band_on else STRIP
    band_deg = [r_[0] for r_ in LID['bandPercent']]
    band_pct = [r_[1] for r_ in LID['bandPercent']]
    NA, NR = int(G['angular']), G['radial']
    for eye in eyes:
        s_ = eye.s
        cx, cz, ax, az = eye.cx, eye.cz, eye.ax, eye.az
        alphas = np.linspace(0, 2*np.pi, NA, endpoint=False)
        band_width = smooth_periodic(interp_angle(band_deg, band_pct, alphas), 3)/100*(2*ax)*float(LID.get('bandScale', 1.0))
        rho_edge = np.sqrt((ax*np.sin(alphas))**2+(az*np.cos(alphas))**2)
        rb = 1-band_width/np.maximum(rho_edge, 1e-6)
        hidden = float(G['hiddenRadius'])
        radial = []
        for j in range(NA):
            row = list(np.linspace(0, rb[j], NR[0]+1))
            row += list(np.linspace(rb[j], 1.0, NR[1]+1)[1:])
            row += list(np.linspace(1.0, hidden, NR[2]+1)[1:])
            radial.append(row)
        radial = np.array(radial)
        K = radial.shape[1]
        rr = radial.ravel()
        al = np.repeat(alphas, K)
        xc = cx+ax*rr*np.sin(al)
        zz = cz+az*rr*np.cos(al)
        yy = eye.front_y(xc, zz)
        if np.isnan(yy).any():
            raise RuntimeError(f'globe semis {eye.semi.tolist()} do not cover the dome out to r={hidden}; raise them')
        dome = np.stack([s_*xc, yy, zz], axis=1)
        back_ring = dome[np.arange(NA)*K+(K-1)].copy()
        back_ring[:, 1] += float(G['backOffset'])
        centre = np.array([[s_*cx, float(dome[0, 1])+float(G['backOffset'])+float(G['backCentre']), cz]])
        verts = np.concatenate([dome, back_ring, centre])
        faces = []
        for j in range(NA):
            j2 = (j+1) % NA
            for k in range(K-1):
                a_, b_, c_, d_ = j*K+k, j2*K+k, j2*K+k+1, j*K+k+1
                faces.append((b_, c_, d_) if k == 0 else (a_, b_, c_, d_))
            bj, bj2 = len(dome)+j, len(dome)+j2
            faces.append((j*K+K-1, j2*K+K-1, bj2, bj))
            faces.append((bj, bj2, len(dome)+NA))
        mesh_g = bpy.data.meshes.new(f'head_eye_globe_{s_}')
        mesh_g.from_pydata(verts.tolist(), [], faces)
        mesh_g.update()
        bmg = bmesh.new()
        bmg.from_mesh(mesh_g)
        bmesh.ops.remove_doubles(bmg, verts=list(bmg.verts), dist=1e-7)
        bmesh.ops.recalc_face_normals(bmg, faces=list(bmg.faces))
        bmg.to_mesh(mesh_g)
        bmg.free()
        globe = bpy.data.objects.new(f'head_eye_globe_{s_}', mesh_g)
        bpy.context.scene.collection.objects.link(globe)
        mesh_g.materials.append(mat_white)
        mesh_g.materials.append(mat_band)
        for poly in mesh_g.polygons:
            poly.use_smooth = True
            c = poly.center
            u = (s_*c.x-cx)/ax
            v = (c.z-cz)/az
            r = math.hypot(u, v)
            a = math.atan2(u, v) % (2*math.pi)
            idx = int(round(a/(2*math.pi)*NA)) % NA
            poly.material_index = 1 if (r >= rb[idx]-1e-6 and not STRIP and not band_on) else 0
        if STRIP:
            # lid band as its own thin closed shell on the aperture curve: rings from the band's inner edge (rb) to the aperture edge (1),
            # the top surface STRIP.thickness in front of the globe surface, the bottom STRIP.bury behind it, walls at both edges
            thick, bury_s = float(STRIP.get('thickness', .001)), float(STRIP.get('bury', .0003))
            inset = float(STRIP.get('inset', 0.0))
            NSR = int(STRIP.get('radial', 6))
            tops, bots = [], []
            for j in range(NA):
                for k in range(NSR+1):
                    rho_ = rb[j]+(1-inset/max(rho_edge[j], 1e-6)-rb[j])*k/NSR
                    px_ = cx+ax*rho_*math.sin(alphas[j])
                    pz_ = cz+az*rho_*math.cos(alphas[j])
                    yg_ = float(eye.front_y(px_, pz_))
                    if math.isnan(yg_):
                        raise RuntimeError('lid strip leaves the globe footprint')
                    tops.append((s_*px_, yg_-thick, pz_))
                    bots.append((s_*px_, yg_+bury_s, pz_))
            nb_ = len(tops)
            sf = []
            for j in range(NA):
                j2 = (j+1) % NA
                for k in range(NSR):
                    a_, b_, c_, d_ = j*(NSR+1)+k, j2*(NSR+1)+k, j2*(NSR+1)+k+1, j*(NSR+1)+k+1
                    sf.append((a_, b_, c_, d_))
                    sf.append((nb_+d_, nb_+c_, nb_+b_, nb_+a_))
                sf.append((j*(NSR+1)+NSR, j2*(NSR+1)+NSR, nb_+j2*(NSR+1)+NSR, nb_+j*(NSR+1)+NSR))
                sf.append((j*(NSR+1), nb_+j*(NSR+1), nb_+j2*(NSR+1), j2*(NSR+1)))
            mesh_s = bpy.data.meshes.new(f'head_upper_emphasized_lid_{s_}')
            mesh_s.from_pydata(tops+bots, [], sf)
            mesh_s.update()
            bms = bmesh.new()
            bms.from_mesh(mesh_s)
            bmesh.ops.remove_doubles(bms, verts=list(bms.verts), dist=1e-7)
            bmesh.ops.recalc_face_normals(bms, faces=list(bms.faces))
            bms.to_mesh(mesh_s)
            bms.free()
            strip_obj = bpy.data.objects.new(f'head_upper_emphasized_lid_{s_}', mesh_s)
            bpy.context.scene.collection.objects.link(strip_obj)
            mesh_s.materials.append(mat_band)
            for poly in mesh_s.polygons:
                poly.use_smooth = True
            record['eyes'][str(s_)] = {'strip': {'thickness': thick, 'bury': bury_s, 'radial': NSR, 'stats': mesh_stats(strip_obj)}}
        # iris lens, conformal to the ellipsoid, centred at the gaze offset
        icx, icz = eye.iris_c
        ia, ib = IR['semi']
        pa, pb = IR['pupil']
        NI = (96, 18)
        top, bottom = [], []
        for j in range(NI[0]):
            ang = 2*math.pi*j/NI[0]
            for k in range(NI[1]+1):
                t = k/NI[1]
                px = icx+ia*t*math.sin(ang)
                pz = icz+ib*t*math.cos(ang)
                yg = float(eye.front_y(px, pz))
                if math.isnan(yg):
                    raise RuntimeError('iris lens leaves the globe footprint; shrink the iris or raise the globe semis')
                top.append((s_*px, yg-(IR['lensFront']*(1-t**2)-IR['lensEdgeBehind']), pz))
                bottom.append((s_*px, yg+IR['lensBack'], pz))
        base = len(top)
        lens_faces = []
        for j in range(NI[0]):
            j2 = (j+1) % NI[0]
            for k in range(NI[1]):
                a_, b_, c_, d_ = j*(NI[1]+1)+k, j2*(NI[1]+1)+k, j2*(NI[1]+1)+k+1, j*(NI[1]+1)+k+1
                lens_faces.append((a_, b_, c_, d_))
                lens_faces.append((base+d_, base+c_, base+b_, base+a_))
            lens_faces.append((j*(NI[1]+1)+NI[1], base+j*(NI[1]+1)+NI[1], base+j2*(NI[1]+1)+NI[1], j2*(NI[1]+1)+NI[1]))
        mesh_i = bpy.data.meshes.new(f'head_iris_and_pupil_{s_}')
        mesh_i.from_pydata(top+bottom, [], lens_faces)
        mesh_i.update()
        bmi = bmesh.new()
        bmi.from_mesh(mesh_i)
        bmesh.ops.remove_doubles(bmi, verts=list(bmi.verts), dist=1e-7)
        bmesh.ops.recalc_face_normals(bmi, faces=list(bmi.faces))
        bmi.to_mesh(mesh_i)
        bmi.free()
        iris = bpy.data.objects.new(f'head_iris_and_pupil_{s_}', mesh_i)
        bpy.context.scene.collection.objects.link(iris)
        mesh_i.materials.append(mat_iris)
        colors = mesh_i.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='CORNER')
        for poly in mesh_i.polygons:
            poly.use_smooth = True
        for loop in mesh_i.loops:
            px, _, pz = mesh_i.vertices[loop.vertex_index].co
            pr = math.hypot((s_*px-icx)/pa, (pz-icz)/pb)
            t = max(0, min(1, (pr-.96)/.08))
            blend = t*t*(3-2*t)
            radial_i = min(1, ((s_*px-icx)/ia)**2+((pz-icz)/ib)**2)
            charcoal = .004+.011*(1-radial_i)
            gray = .0007*(1-blend)+charcoal*blend
            colors.data[loop.index].color = (gray, gray, gray, 1)
        gv = np.array([v.co for v in mesh_g.vertices])
        iv = np.array([v.co for v in mesh_i.vertices])
        edge_ring = [j*K+NR[0]+NR[1] for j in range(NA)]
        # rim depth at 12 angles: skin front y just outside the aperture against the globe's own front surface there
        depths = []
        for deg in range(0, 360, 30):
            a = math.radians(deg)
            rho = 1.0+float(E['rimProbe'])
            px = cx+ax*rho*math.sin(a)
            pz = cz+az*rho*math.cos(a)
            hit, _ = ray_hit(s_*px, pz, new_tree)
            ge = float(eye.front_y(cx+ax*math.sin(a), cz+az*math.cos(a)))
            depths.append({'deg': deg, 'skinY': None if hit is None else float(hit.y), 'globeEdgeY': ge,
                           'rimInFrontOfGlobe': None if hit is None else ge-float(hit.y)})
        checks.setdefault('eyes', {})[str(s_)] = {
            'frontmostGlobeY': float(gv[:, 1].min()), 'frontmostIrisY': float(iv[:, 1].min()),
            'frontmostWorldY': float(min(gv[:, 1].min(), iv[:, 1].min())*.5-.02),
            'apertureX': sorted([float(dome[edge_ring, 0].min()), float(dome[edge_ring, 0].max())]),
            'apertureZ': [float(dome[edge_ring, 2].min()), float(dome[edge_ring, 2].max())],
            'globe': mesh_stats(globe), 'iris': mesh_stats(iris), 'rimDepth': depths,
            'yawDeg': eye.yaw, 'pitchDeg': eye.pitch, 'apexProud': eye.apex_proud}
tick('eyes authored')


# ---------------------------------------------------------------------------------------------------------------------------------
# 6. The nose pad is skin faces now; the assembly's separate head_nose_finish shell is removed.
if NOSE.get('replaceFinish', True) and 'head_nose_finish' in scene_objects and not args.skin_only:
    bpy.data.objects.remove(scene_objects['head_nose_finish'], do_unlink=True)
    tick('old nose shell removed')

# ---------------------------------------------------------------------------------------------------------------------------------
# 7. Mouth curves follow the skin displacement in y.
follow = {}
if spec['mouth'].get('follow'):
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH' or not obj.name.startswith('head_closed_mouth') or not len(obj.data.vertices):
            continue
        deltas = []
        for vertex in obj.data.vertices:
            wco = obj.matrix_world @ vertex.co
            a_, b_ = ray_hit(wco.x, wco.z, old_tree)[0], ray_hit(wco.x, wco.z, new_tree)[0]
            deltas.append(0.0 if a_ is None or b_ is None else float(b_.y-a_.y))
        deltas = np.array(deltas)
        for vertex, delta in zip(obj.data.vertices, deltas):
            vertex.co.y += float(delta)
        follow[obj.name] = {'maxDelta': float(deltas.max()), 'minDelta': float(deltas.min())}

# ---------------------------------------------------------------------------------------------------------------------------------
# 8. Checks and outputs.
sk = head.data
cp = np.empty(len(sk.vertices)*3, np.float32)
sk.vertices.foreach_get('co', cp)
cp = cp.reshape(-1, 3)
rng = np.random.default_rng(1)
sample = rng.choice(len(cp), size=min(40000, len(cp)), replace=False)
dev = []
for index in sample:
    co = cp[int(index)]
    if abs(co[0]) < XW-.02 and ZW[0]+.02 < co[2] < ZW[1]-.02 and co[1] < YC-.02:
        _, _, _, distance = old_tree.find_nearest(Vector(co.tolist()))
        dev.append(distance)
dev = np.array(dev)
checks['skinDeviationInWindow'] = {'samples': int(len(dev)), 'p50': float(np.percentile(dev, 50)) if len(dev) else None,
                                   'p99': float(np.percentile(dev, 99)) if len(dev) else None,
                                   'max': float(dev.max()) if len(dev) else None}
mid = {}
for z in (.128, .0905, .053, .016, -.021, -.058, -.095, -.118, -.133, -.155, -.1737, -.19, -.21):
    hit, _ = ray_hit(1e-4, z, new_tree)
    mid[f'{z:.4f}'] = None if hit is None else float(hit.y)
checks['midlineFrontY'] = mid
checks['mouthFollow'] = follow
# ---------------------------------------------------------------------------------------------------------------------------------
# Face metrics in the units of specs/R02.md (fit units: head-local divided by 3.721) and the sweep score built from them.
FIT = 3.721
metrics = {}
eye_checks = checks.get('eyes', {})
if eye_checks:
    widths = [(e_['apertureX'][1]-e_['apertureX'][0])/FIT for e_ in eye_checks.values()]
    heights = [(e_['apertureZ'][1]-e_['apertureZ'][0])/FIT for e_ in eye_checks.values()]
    width, height = float(np.mean(widths)), float(np.mean(heights))
    metrics['eyeApertureWidth'] = width
    metrics['eyeApertureHeight'] = height
    metrics['eyeHeightOverWidth'] = height/width
    inner = sorted(min(abs(e_['apertureX'][0]), abs(e_['apertureX'][1])) for e_ in eye_checks.values())
    metrics['eyeGapOverWidth'] = (2*inner[0]/FIT)/width
    front = min(e_['frontmostGlobeY'] for e_ in eye_checks.values())
    front = min(front, min(e_['frontmostIrisY'] for e_ in eye_checks.values()))
    metrics['eyeFrontY'] = float(front)
    rim = [r_['rimInFrontOfGlobe'] for e_ in eye_checks.values() for r_ in e_['rimDepth'] if r_['rimInFrontOfGlobe'] is not None]
    metrics['rimInFrontOfGlobeFit'] = {'mean': float(np.mean(rim)/FIT), 'min': float(np.min(rim)/FIT), 'max': float(np.max(rim)/FIT)}
hit_brow, _ = ray_hit(1e-4, .537-FIT*.110, new_tree)
mid_pts = cp[(np.abs(cp[:, 0]) < .02) & (cp[:, 2] < -.10) & (cp[:, 2] > -.17) & (cp[:, 1] < -.25)]
nose_pts = []
if 'head_nose_finish' in bpy.data.objects:
    nm = bpy.data.objects['head_nose_finish'].data
    nco = np.empty(len(nm.vertices)*3, np.float32)
    nm.vertices.foreach_get('co', nco)
    nose_pts = nco.reshape(-1, 3)
    nose_pts = nose_pts[np.abs(nose_pts[:, 0]) < .02]
tip_y = float(min(mid_pts[:, 1].min() if len(mid_pts) else 0, nose_pts[:, 1].min() if len(nose_pts) else 0))
pads = cp[(np.abs(cp[:, 0]) > .01) & (np.abs(cp[:, 0]) < .10) & (cp[:, 2] < -.17) & (cp[:, 2] > -.222) & (cp[:, 1] < -.25)]
metrics['noseTipY'] = tip_y
metrics['noseTipLeadOverPadsFit'] = float((pads[:, 1].min()-tip_y)/FIT) if len(pads) else None
if hit_brow is not None and eye_checks:
    zb, yb = .537-FIT*.110, float(hit_brow.y)
    zt = float(mid_pts[np.argmin(mid_pts[:, 1]), 2]) if len(mid_pts) else -.15
    ze = float(np.mean([(e_['apertureZ'][0]+e_['apertureZ'][1])/2 for e_ in eye_checks.values()]))
    y_line = yb+(tip_y-yb)*(ze-zb)/(zt-zb)
    metrics['eyeFrontBehindBrowNoseLineFit'] = float((front-y_line)*-1/FIT)      # positive: the eye front is behind the line
rows = {}
for y_fit in (.175, .178, .183, .19, .195, .201, .206, .21):
    z = .537-FIT*y_fit
    sel = (np.abs(cp[:, 2]-z) < .004) & (cp[:, 1] < .05) & (np.abs(cp[:, 0]) < .34)
    rows[f'{y_fit:.3f}'] = float(np.abs(cp[sel, 0]).max()/FIT) if sel.any() else None
metrics['frontHalfWidthFit'] = rows
checks['metrics'] = metrics
# sweepScore (recipe.py sweep reads a top-level number from this record): minus the weighted distance of the face metrics from the R02 spec
terms = {}
if 'eyeHeightOverWidth' in metrics:
    terms['eyeAspect'] = -abs(metrics['eyeHeightOverWidth']-1.36)
    terms['eyeGap'] = -abs(metrics['eyeGapOverWidth']-.90)
    terms['rimUniform'] = -float(np.std(rim)/FIT)*20
if metrics.get('eyeFrontBehindBrowNoseLineFit') is not None:
    terms['eyeBehindLine'] = -max(0.0, .015-metrics['eyeFrontBehindBrowNoseLineFit'])*20
if metrics.get('noseTipLeadOverPadsFit') is not None:
    terms['noseLead'] = -max(0.0, .008-metrics['noseTipLeadOverPadsFit'])*20
sweep_score = float(sum(terms.values()))
checks['sweepTerms'] = terms

globalize()
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(args.out/'akinza.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'akinza.blend'))
# assembly.json: re-count the skin and the replaced objects
asm_record = json.loads((args.out/'assembly.json').read_text(encoding='utf-8'))
objs = asm_record['objects']
REPLACED = ('head_eye_globe_', 'head_iris_and_pupil_', 'head_upper_emphasized_lid_', 'head_nose_finish')
for key in [k for k in objs if k.startswith(REPLACED)]:
    del objs[key]
for o_ in bpy.context.scene.objects:
    if o_.type == 'MESH' and (o_.name.startswith(REPLACED) or o_.name in objs):
        st_ = mesh_stats(o_)
        objs[o_.name] = {'components': st_['components'], 'nonManifoldEdges': st_['nonManifoldEdges'], 'vertices': st_['vertices']}
asm_record['outputs'] = {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']}
(args.out/'assembly.json').write_text(json.dumps(asm_record, indent=1)+'\n', encoding='utf-8')
record.update({'sweepScore': sweep_score, 'sweepTerms': terms, 'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene), 'donorSha256': sha(args.donor),
               'spec': spec, 'checks': checks, 'skinAfter': after_stats,
               'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']}})
(args.out/'face-parts.json').write_text(json.dumps(record, indent=1, default=float)+'\n')
