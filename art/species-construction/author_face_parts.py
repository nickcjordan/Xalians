"""Akinza face parts authored at mesh precision after the last head step (R02 tool, loop v3.5, round 22).

Run with Blender (through loop_tools.py blender or recipe.py):
  blender -b --factory-startup --python author_face_parts.py --
    --scene <last head.blend> --donor <bulk face head.blend> --spec specs/r02_face_parts.json --out <new-dir> [--voxel .0008]

Why this exists. The face parts (socket and eye, nose pad, cheek tufts) were built inside the field rebuild at H29 and grafted at H30, at a
voxel of .0025 head-local. Everything that makes them look right is one to two voxels deep at that size (pad dome, tuft tips, the inlay
wall, the socket lip), and every change meant replaying H29, H30 and the whole fan chain after them. This step runs last, so nothing after
it rewrites the face, and it works at a voxel of .001 or finer (.0006 for a final; the default keeps a build near a minute).

Inputs. --scene is the last head step (H35): the skin with the old eyes, tufts and pad. --donor is the bulk face (recipe step F-bulk:
rebuild_face_features_field.py on H25 with specs/face-bulk-r10e.json, the r10e bridge, lower smooth, chin smooth and old-pocket fill, but no
socket, no tufts and no nose pad). Only the donor's skin is read.

What it does.
  1. Level sets of both skins at the coarse voxel (.0025) over the face window (x +-.33, z -.29 to .215, in front of y -.05), and a ray
     heightfield of the donor skin.
  2. The fine skin of the window is built in tiles written into one sparse OpenVDB grid: per tile the donor field is interpolated
     (trilinear) to the fine lattice, the face parts are applied as analytic signed-distance edits, and the result is blended back to the
     scene skin's own field toward the window edge (weight 0 at margin, 1 at margin + fade), so the new skin meets the old one exactly.
     The grid is meshed once; there are no tile seams.
  3. The scene skin's faces inside the window are removed by centroid and the fine skin (everything at least margin from the hole's
     boundary loop) takes their place; the ring between the two boundary loops is bridged by a minimum-rung-length zipper (dynamic
     programming over monotone pairings), so the result is one closed solid and nothing outside the window moves.
  4. Parts that are not skin: each eye is a polar dome grid on a front surface (conformal: the donor face plus the r10e dome profile, or an
     analytic ellipsoid fitted to the aperture, see eye.globe.kind), its lid band a material zone on the dome, and a conformal iris lens at a
     gaze offset; the nose pad is a thin conformal shell over the skin wedge, its rim sunk into the skin.
  5. The skin parts: the orbit carved around each globe (aperture column down to a floor that follows the globe, vertical and lateral
     shear, optional extra opening ellipsoids, optional lid fold swept on the aperture curve) and cheek tufts as swept lens solids joined
     by a smooth union.

Every part is opt-in: an absent or empty block does nothing, and every default reproduces the r10e face (specs/face-features-r10e.json) as
closely as the new construction allows, so the first run is a control. Coordinates are head-local (the assembly places the head at scale
.50, offset (0, -.02, .635)); the left eye is +x. Records go to face-parts.json with a top-level sweepScore (minus the distance of the face
metrics from the R02 spec) for recipe.py sweep. Akinza specific.
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
import openvdb as vdb
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
# Defaults. specs/r02_face_parts.json carries every number explicitly (so recipe.py set spec:<path> reaches it); a key missing from the
# JSON takes its value from here.
DEFAULTS = {
    'voxel': 0.001,
    'coarseVoxel': 0.0025,
    'window': {'x': 0.33, 'z': [-0.29, 0.215], 'yCut': -0.05, 'yMin': -0.42, 'margin': 0.006, 'tile': 56, 'yPad': 0.03,
               'rayStep': 0.002, 'fade': 0.025, 'faceSmooth': 3},
    'eye': {
        'sides': [1, -1],
        'aperture': {'center': [0.1887, 0.0291], 'semi': [0.105, 0.1433]},
        'globe': {'kind': 'conformal', 'edgeBehindTopBottom': [0.0045, 0.0028], 'mode': 'edge', 'edgeBehind': 0.0037, 'apexProud': 0.013, 'semi': 'auto', 'depthSemi': 0.06, 'margin': 1.0, 'minCurvature': 0.35,
                  'yawDeg': 'auto', 'pitchDeg': 'auto', 'hiddenRadius': 1.08, 'backOffset': 0.012, 'backCentre': 0.01,
                  'angular': 160, 'radial': [20, 3, 3]},
        'orbit': {'floorBehind': 0.0025, 'shear': 0.1, 'lateralShear': 0.0, 'floorBlend': 0.008, 'rimBlend': 0.012,
                  'extraCutters': []},
        'lid': {'bandPercent': [[0, 6.5], [30, 7.3], [60, 6.6], [90, 4.2], [120, 3.5], [150, 2.8], [180, 2.3], [-150, 1.5],
                                [-120, 1.4], [-90, 2.9], [-60, 3.7], [-30, 5.0]],
                'fold': {'height': [], 'width': [], 'center': 0.0, 'blend': 0.003}},
        'iris': {'offset': [-0.0111, -0.0055], 'semi': [0.0555, 0.094], 'pupil': [0.0305, 0.0414], 'lensFront': 0.005,
                 'lensEdgeBehind': 0.0008, 'lensBack': 0.008},
        'rimProbe': 0.03,
    },
    'tufts': {'bury': 0.003, 'taperPower': 1.15, 'tipRadius': 0.0035, 'blend': 0.03, 'taperExponent': 0.85,
              'thicknessExponent': 0.9,
              'list': [{'root': [0.246, -0.106], 'tip': [0.3, -0.158], 'length': 0.075, 'widthRoot': 0.062, 'thickRoot': 0.017,
                        'lift': 0.0004},
                       {'root': [0.212, -0.176], 'tip': [0.236, -0.232], 'length': 0.06, 'widthRoot': 0.05, 'thickRoot': 0.014,
                        'lift': 0.0004}]},
    'nosePad': {'mode': 'shell', 'topZ': -0.11, 'apexZ': -0.148, 'halfWidth': 0.043, 'cornerRadius': 0.006, 'wrapUnder': 0.0,
                'outlinePoints': 96, 'rings': 14, 'lift': 0.0006, 'dome': 0.0, 'sinkRim': 0.0015, 'bury': 0.0015,
                'buryStart': 0.82, 'yLimit': -0.25, 'normalSigma': 0.004},
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
parser.add_argument('--scene', type=Path, required=True, help='the last head step (skin with the old face parts)')
parser.add_argument('--donor', type=Path, required=True, help='bulk face head: bridge, muzzle and lower smooth, no socket, tufts or pad')
parser.add_argument('--spec', type=Path, default=None)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--voxel', type=float, default=None, help='fine voxel (head-local); overrides the spec')
parser.add_argument('--skin-only', action='store_true', help='skip the globes, irises and nose shell (skin parts only)')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
spec = merge(DEFAULTS, json.loads(args.spec.read_text()) if args.spec else {})
if args.voxel:
    spec['voxel'] = args.voxel
provenance = snapshot(args.out, __file__, [args.scene, args.donor] + ([args.spec] if args.spec else []))
VF = float(spec['voxel'])
VC = float(spec['coarseVoxel'])
W = spec['window']
record = {'voxel': VF, 'tiles': {}, 'eyes': {}, 'tufts': [], 'nose': {}, 'seam': {}, 'checks': {}}
BANDF = 4*VF


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
# 1. The scene skin (read once, edited at the end) and the donor skin: coarse level sets in the window, ray heightfield, BVH.
XW = float(W['x'])
ZW = [float(W['z'][0]), float(W['z'][1])]
YC = float(W['yCut'])
YMIN = float(W['yMin'])
MARGIN = float(W['margin'])
FADE = float(W['fade'])
wmin = np.array([-XW-.03, YMIN, ZW[0]-.03])
wmax = np.array([XW+.03, YC+.04, ZW[1]+.03])
HALF = 12
lo_c = np.floor(wmin/VC).astype(int)-6
hi_c = np.ceil(wmax/VC).astype(int)+6


def coarse_field(pts, tris):
    grid = vdb.FloatGrid.createLevelSetFromPolygons(pts, triangles=tris, transform=vdb.createLinearTransform(voxelSize=VC),
                                                    halfWidth=HALF)
    arr = np.full(tuple(int(v) for v in hi_c-lo_c+1), HALF*VC, np.float32)
    grid.copyToArray(arr, ijk=tuple(int(v) for v in lo_c))
    return arr


bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
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
s_tris = []
for k in (3, 4):
    sel = np.nonzero(lt == k)[0]
    if len(sel):
        quad = loop_v[ls[sel][:, None]+np.arange(k)[None, :]]
        s_tris.append(quad[:, :3])
        if k == 4:
            s_tris.append(quad[:, [0, 2, 3]])
C35 = coarse_field(V.astype(np.float32), np.concatenate(s_tris).astype(np.int32))
del s_tris
tick(f'scene coarse field {C35.shape}')

bpy.ops.wm.open_mainfile(filepath=str(args.donor.resolve()))
donor_obj = skin_object()
assert np.allclose(np.array(donor_obj.matrix_world), np.eye(4)), 'the head skin object transform must be the identity'
d_pts, d_tris = read_skin(donor_obj)
d_tree = BVHTree.FromPolygons([tuple(map(float, p)) for p in d_pts], d_tris.tolist())
tick(f'donor skin {len(d_pts)} vertices')
Cd = coarse_field(d_pts, d_tris)
tick(f'donor coarse field {Cd.shape}')


# Ray heightfield of the donor skin (first hit from the front) over the window, used for tile y ranges and the face plane.
RS = float(W['rayStep'])
hx = np.arange(-XW-.06, XW+.06+1e-9, RS)
hz = np.arange(ZW[0]-.06, ZW[1]+.06+1e-9, RS)
Hc = np.full((len(hx), len(hz)), np.nan, np.float32)
for i, x in enumerate(hx):
    for j, z in enumerate(hz):
        hit, _, _, _ = d_tree.ray_cast(Vector((float(x), -1.0, float(z))), Vector((0, 1, 0)))
        if hit is not None:
            Hc[i, j] = hit.y
tick(f'heightfield {Hc.shape}')
# The donor skin is a marching-cubes mesh at the coarse voxel, so its first-hit heights carry facet ripple of a few 1e-5; the dome front,
# the orbit floor and the fold read a lightly smoothed copy so the rim they shape does not scallop.
SMOOTH = int(W.get('faceSmooth', 3))


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


def face_h(x, z):
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


def sample_coarse(C, xs, ys, zs):
    """Trilinear sample of a coarse field on the grid xs x ys x zs (1-D world coordinates). float32 C-contiguous (nx, ny, nz)."""
    def weights(v, axis):
        f = np.clip(v/VC-lo_c[axis], 0, C.shape[axis]-1.001)
        i0 = np.floor(f).astype(int)
        return i0, (f-i0).astype(np.float32)
    ix, tx = weights(xs, 0)
    iy, ty = weights(ys, 1)
    iz, tz = weights(zs, 2)
    x0, y0, z0 = ix.min(), iy.min(), iz.min()
    sub = C[x0:ix.max()+2, y0:iy.max()+2, z0:iz.max()+2]
    a = sub[ix-x0]*(1-tx)[:, None, None]+sub[ix-x0+1]*tx[:, None, None]
    a = a[:, iy-y0, :]*(1-ty)[None, :, None]+a[:, iy-y0+1, :]*ty[None, :, None]
    a = a[:, :, iz-z0]*(1-tz)[None, None, :]+a[:, :, iz-z0+1]*tz[None, None, :]
    return np.ascontiguousarray(a, dtype=np.float32)


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

# Tufts: roots on the donor skin, tangent frame from its normal, closed swept lens in the (width, thickness) section.
T = spec['tufts']
tufts = []
for tuft in (T.get('list') or []):
    for side in (1, -1):
        x0, z0 = side*tuft['root'][0], tuft['root'][1]
        x1, z1 = side*tuft['tip'][0], tuft['tip'][1]
        hit, normal = ray_hit(x0, z0)
        if hit is None:
            continue
        n = np.array(normal, float)
        n /= np.linalg.norm(n)
        if n[1] > 0:
            n = -n
        d = np.array([x1-x0, 0.0, z1-z0])
        d = d-n*d.dot(n)
        d /= np.linalg.norm(d)
        b = np.cross(d, n)
        root = np.array([x0, hit.y, z0])-n*T['bury']
        L, Wr, Tr, lift = tuft['length'], tuft['widthRoot'], tuft['thickRoot'], tuft['lift']
        tip = root+d*L+n*lift
        reach = Wr+lift+2*T['blend']+.03
        tufts.append({'side': side, 'root': root, 'n': n, 'd': d, 'b': b, 'L': L, 'Wr': Wr, 'Tr': Tr, 'lift': lift,
                      'lo': np.minimum(root, tip)-reach, 'hi': np.maximum(root, tip)+reach})
        record['tufts'].append({'side': side, 'root': root.tolist(), 'normal': n.tolist(), 'direction': d.tolist(), **tuft})


def tuft_sdf(t, X, Y, Z):
    qx, qy, qz = X-t['root'][0], Y-t['root'][1], Z-t['root'][2]
    uu = qx*t['d'][0]+qy*t['d'][1]+qz*t['d'][2]
    vv = qx*t['n'][0]+qy*t['n'][1]+qz*t['n'][2]
    ww = qx*t['b'][0]+qy*t['b'][1]+qz*t['b'][2]
    tt = np.clip(uu/t['L'], 0, 1)
    vv = vv-t['lift']*tt*tt
    taper = np.maximum(1-tt**T['taperPower'], 0)**T['taperExponent']
    Wt = np.maximum(t['Wr']*taper, T['tipRadius'])
    Tt = np.maximum(t['Tr']*taper**T['thicknessExponent'], T['tipRadius'])
    rho = np.sqrt((ww/Wt)**2+(vv/Tt)**2)
    gradient = np.sqrt((ww/Wt**2)**2+(vv/Tt**2)**2)/np.maximum(rho, 1e-6)
    sdf = (rho-1)/np.maximum(gradient, 1e-6)
    along = uu-np.clip(uu, 0, t['L'])
    sdf = np.where(along != 0, np.sqrt(np.maximum(sdf, 0)**2+along**2), sdf)
    return sdf.astype(np.float32)


# Lid fold (optional): a swept lens on the aperture curve, half buried in the skin. Heights and widths are tables by angle.
LID = spec['eye']['lid'] if spec['eye'] else {'fold': {}}
fold = LID.get('fold') or {}
fold_on = bool(fold.get('height')) and max(r[1] for r in fold['height']) > 0


def fold_sdf(eye, xc, Y, zc, yface):
    u, v, r = eye.aperture_polar(xc, zc)
    alpha = np.arctan2(u, v)
    grad = np.sqrt((u/eye.ax)**2+(v/eye.az)**2)/np.maximum(r, 1e-6)
    dc = (r-1)/np.maximum(grad, 1e-6)
    hgt = interp_angle([r_[0] for r_ in fold['height']], [r_[1] for r_ in fold['height']], alpha)
    wid = interp_angle([r_[0] for r_ in (fold.get('width') or fold['height'])],
                       [r_[1] for r_ in (fold.get('width') or fold['height'])], alpha)
    q = yface-Y
    sec = np.sqrt(((dc-fold.get('center', 0.0))/np.maximum(wid, 1e-6))**2+(q/np.maximum(hgt, 1e-6))**2)
    return ((sec-1)*np.minimum(wid, hgt)).astype(np.float32)


# ---------------------------------------------------------------------------------------------------------------------------------
# 3. Fine tiles.
def apply_features(F, xs, ys, zs):
    """Edit the base field F (nx, ny, nz) on the world axes xs, ys, zs."""
    Xg = xs[:, None, None]
    Zg = zs[None, None, :]
    Yg = ys[None, :, None]
    for eye in eyes:
        s = eye.s
        lo = np.array([s*(eye.cx-eye.ax*1.7), -1, eye.cz-eye.az*1.7])
        hi = np.array([s*(eye.cx+eye.ax*1.7), 1, eye.cz+eye.az*1.7])
        xl, xh = min(lo[0], hi[0]), max(lo[0], hi[0])
        ix = np.nonzero((xs >= xl) & (xs <= xh))[0]
        iz = np.nonzero((zs >= lo[2]) & (zs <= hi[2]))[0]
        if len(ix) == 0 or len(iz) == 0:
            continue
        sx = slice(ix[0], ix[-1]+1)
        sz = slice(iz[0], iz[-1]+1)
        xc = s*xs[sx]
        zz = zs[sz]
        yface = face_h(s*xc[:, None], zz[None, :])
        a_, b_, c_ = eye.plane
        yface = np.where(np.isnan(yface), a_+b_*xc[:, None]+c_*zz[None, :], yface)[:, None, :]
        xcg = xc[:, None, None]
        zg = zz[None, None, :]
        Y3 = Yg
        sub = F[sx, :, sz]
        cut = eye.cutter(xcg, Y3, zg, yface)
        sub = smax(sub, -cut, eye.rim_blend).astype(np.float32)
        for oc in eye.cfg['orbit'].get('extraCutters') or []:
            sub = smax(sub, -ellipsoid_sdf(oc, s, xcg, Y3, zg), float(oc.get('blend', .005))).astype(np.float32)
        if fold_on:
            sub = smin(sub, fold_sdf(eye, xcg, Y3, zg, yface), float(fold.get('blend', .003))).astype(np.float32)
        F[sx, :, sz] = sub
    if tufts:
        for t in tufts:
            ix = np.nonzero((xs >= t['lo'][0]) & (xs <= t['hi'][0]))[0]
            iy = np.nonzero((ys >= t['lo'][1]) & (ys <= t['hi'][1]))[0]
            iz = np.nonzero((zs >= t['lo'][2]) & (zs <= t['hi'][2]))[0]
            if len(ix) == 0 or len(iy) == 0 or len(iz) == 0:
                continue
            sl = (slice(ix[0], ix[-1]+1), slice(iy[0], iy[-1]+1), slice(iz[0], iz[-1]+1))
            xb, yb, zb = xs[sl[0]], ys[sl[1]], zs[sl[2]]
            sdf = tuft_sdf(t, xb[:, None, None], yb[None, :, None], zb[None, None, :])
            sub = F[sl]
            new = smin(sub, sdf, T['blend'])
            # fade the edit out toward the box faces so the box never shows
            fb = float(T.get('boxFade', 0.02))
            dbox = np.minimum(np.minimum(np.minimum(xb-t['lo'][0], t['hi'][0]-xb)[:, None, None],
                                         np.minimum(yb-t['lo'][1], t['hi'][1]-yb)[None, :, None]),
                              np.minimum(zb-t['lo'][2], t['hi'][2]-zb)[None, None, :])
            F[sl] = (sub+smoothstep(dbox/fb)*(new-sub)).astype(np.float32)
    return F


def ellipsoid_sdf(oc, s, xc, Y, zc):
    """Approximate signed distance of an oriented ellipsoid given in canonical coordinates (yawDeg about z)."""
    c = np.array(oc['center'], float)
    g = np.array(oc['semi'], float)
    ya = math.radians(oc.get('yawDeg', 0.0))
    dx, dy, dz = xc-c[0], Y-c[1], zc-c[2]
    a = dx*math.cos(ya)+dy*math.sin(ya)
    b = -dx*math.sin(ya)+dy*math.cos(ya)
    r = np.sqrt((a/g[0])**2+(b/g[1])**2+(dz/g[2])**2)
    grad = np.sqrt((a/g[0]**2)**2+(b/g[1]**2)**2+(dz/g[2]**2)**2)/np.maximum(r, 1e-6)
    return ((r-1)/np.maximum(grad, 1e-6)).astype(np.float32)


I0 = np.floor(wmin/VF).astype(int)
N = np.ceil((wmax-wmin)/VF).astype(int)+2
# the rectangle the fine skin must cover (index ranges), plus the bridging margin
r_lo = np.floor(np.array([-XW-MARGIN, YMIN, ZW[0]-MARGIN])/VF).astype(int)-I0
r_hi = np.ceil(np.array([XW+MARGIN, YC, ZW[1]+MARGIN])/VF).astype(int)-I0+1
T_COLS = int(W['tile'])
YPAD = float(W['yPad'])
EXTRA = 2                       # tile overlap in nodes (the overlapped nodes get identical values from both tiles)
J_TOP = min(int(math.ceil((YC+3*MARGIN)/VF))-I0[1]+1, N[1])
# One sparse grid for the whole window: each tile writes its (x, z) block from just in front of the skin down to the cut plane,
# so there is no tile seam to weld and the mesher sees one field. The interior below the skin is a constant, pruned away.
G = vdb.FloatGrid()
G.background = BANDF
n_tiles = 0
tile_nodes = 0
for i0 in range(int(r_lo[0]), int(r_hi[0]), T_COLS):
    for k0 in range(int(r_lo[2]), int(r_hi[2]), T_COLS):
        i1, k1 = min(i0+T_COLS, int(r_hi[0])), min(k0+T_COLS, int(r_hi[2]))
        ia, ib = max(i0-EXTRA, 0), min(i1+EXTRA, N[0])
        ka, kb = max(k0-EXTRA, 0), min(k1+EXTRA, N[2])
        xs = (np.arange(ia, ib)+I0[0])*VF
        zs = (np.arange(ka, kb)+I0[2])*VF
        gi = slice(max(int(math.floor((xs[0]-.03-hx[0])/RS)), 0), int(math.ceil((xs[-1]+.03-hx[0])/RS))+1)
        gk = slice(max(int(math.floor((zs[0]-.03-hz[0])/RS)), 0), int(math.ceil((zs[-1]+.03-hz[0])/RS))+1)
        patch = Hc[gi, gk]
        if np.isnan(patch).all():
            continue
        ylo = float(np.nanmin(patch))-YPAD
        ja = max(int(math.floor(ylo/VF))-I0[1], 0)
        jb = min(int(math.ceil((float(np.nanmax(patch))+YPAD)/VF))-I0[1]+1, J_TOP)
        if jb-ja < 4:
            continue
        if jb < J_TOP:
            # deep interior below this block down to the cut plane: one constant fill, no array
            G.fill((int(ia), int(jb), int(ka)), (int(ib-1), int(J_TOP-1), int(kb-1)), -BANDF, True)
        ys = (np.arange(ja, jb)+I0[1])*VF
        F35 = sample_coarse(C35, xs, ys, zs)
        F = apply_features(sample_coarse(Cd, xs, ys, zs), xs, ys, zs)
        # the new skin replaces the old only inside the window, and fades back to the old field toward its edge so the two meet exactly
        dwin = np.minimum(np.minimum((XW-np.abs(xs))[:, None, None], np.minimum(zs-ZW[0], ZW[1]-zs)[None, None, :]),
                          (YC-ys)[None, :, None])
        wgt = smoothstep((dwin-MARGIN)/FADE).astype(np.float32)
        F = F35+wgt*(F-F35)
        F = np.ascontiguousarray(np.clip(F, -BANDF, BANDF), dtype=np.float32)      # vdb reads C order
        G.copyFromArray(F, ijk=(int(ia), int(ja), int(ka)))
        n_tiles += 1
        tile_nodes += F.size
G.prune()
tick(f'{n_tiles} tiles, {tile_nodes/1e6:.1f}M nodes, {G.activeVoxelCount()/1e6:.1f}M active voxels')
record['tiles'] = {'count': n_tiles, 'nodes': int(tile_nodes)}
verts, tri_o, quad_o = G.convertToPolygons(isovalue=0.0, adaptivity=0.0)
del G
fine_world = (verts.astype(np.float64)+I0)*VF
quads_f = np.asarray(quad_o, np.int64).reshape(-1, 4)
tris_f = np.asarray(tri_o, np.int64).reshape(-1, 3)
tick(f'fine skin {len(fine_world)} vertices, {len(quads_f)} quads, {len(tris_f)} tris')

# ---------------------------------------------------------------------------------------------------------------------------------
# 4. Stitch into the scene skin.
bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
head = skin_object()
me = head.data
assert len(me.vertices) == nv and len(me.polygons) == npoly
materials = list(me.materials)
# polygon centroids
cs = np.add.reduceat(V[loop_v], ls, axis=0)/lt[:, None]


def in_window(c, shrink):
    return ((np.abs(c[:, 0]) < XW-shrink) & (c[:, 2] > ZW[0]+shrink) & (c[:, 2] < ZW[1]-shrink) & (c[:, 1] < YC-shrink))


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
    phi = np.minimum(np.minimum(XW-np.abs(cen_[:, 0]), np.minimum(cen_[:, 2]-ZW[0], ZW[1]-cen_[:, 2])), YC-cen_[:, 1])
    near = np.nonzero(keep_ & (phi < MARGIN+.03))[0]
    for a_ in range(0, len(near), 4000):
        part = near[a_:a_+4000]
        d2 = ((cen_[part][:, None, :]-loop_pts[None, :, :])**2).sum(axis=2).min(axis=1)
        keep_[part[d2 < MARGIN**2]] = False
    return keep_


quads_k, tris_k = quads_f[fine_keep(quads_f)], tris_f[fine_keep(tris_f)]
# Fine patch: boundary loops of the kept fine polygons, with the same pinch repair.
fq, ft = quads_k, tris_k
for attempt in range(20):
    fedges = boundary_edges([fq, ft])
    out_count = np.bincount(fedges[:, 0], minlength=len(fine_world)) if len(fedges) else np.zeros(len(fine_world), int)
    pinched = np.nonzero(out_count > 1)[0]
    if len(pinched) == 0:
        break
    qk = ~np.isin(fq, pinched).any(axis=1) if len(fq) else np.zeros(0, bool)
    tk = ~np.isin(ft, pinched).any(axis=1) if len(ft) else np.zeros(0, bool)
    fq, ft = fq[qk], ft[tk]
else:
    raise RuntimeError('fine patch boundary stays pinched')
fine_loops, _ = loops_from_edges(fedges)
# Small extra loops are holes the pinch repair left (a vertex where the iso-surface touches itself): fill each with a fan.
if len(fine_loops) > 1:
    fine_loops.sort(key=len, reverse=True)
    fill_tris, extra_v = [], []
    for lp_ in fine_loops[1:]:
        if len(lp_) > 24:
            raise RuntimeError(f'fine patch has a hole of {len(lp_)} edges that is not a pinch repair')
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
            mats.append(np.zeros(len(polys), np.int32))
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
record['seam']['fineLoopToOldSkin'] = {'mean': float(d_f.mean()), 'max': float(d_f.max())}
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
        if name.startswith(('eye_globe_', 'iris_and_pupil_', 'upper_emphasized_lid_')):
            bpy.data.objects.remove(scene_objects[name], do_unlink=True)
    band_deg = [r_[0] for r_ in LID['bandPercent']]
    band_pct = [r_[1] for r_ in LID['bandPercent']]
    NA, NR = int(G['angular']), G['radial']
    for eye in eyes:
        s_ = eye.s
        cx, cz, ax, az = eye.cx, eye.cz, eye.ax, eye.az
        alphas = np.linspace(0, 2*np.pi, NA, endpoint=False)
        band_width = smooth_periodic(interp_angle(band_deg, band_pct, alphas), 3)/100*(2*ax)
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
        mesh_g = bpy.data.meshes.new(f'eye_globe_{s_}')
        mesh_g.from_pydata(verts.tolist(), [], faces)
        mesh_g.update()
        bmg = bmesh.new()
        bmg.from_mesh(mesh_g)
        bmesh.ops.remove_doubles(bmg, verts=list(bmg.verts), dist=1e-7)
        bmesh.ops.recalc_face_normals(bmg, faces=list(bmg.faces))
        bmg.to_mesh(mesh_g)
        bmg.free()
        globe = bpy.data.objects.new(f'eye_globe_{s_}', mesh_g)
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
            poly.material_index = 1 if r >= rb[idx]-1e-6 else 0
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
        mesh_i = bpy.data.meshes.new(f'iris_and_pupil_{s_}')
        mesh_i.from_pydata(top+bottom, [], lens_faces)
        mesh_i.update()
        bmi = bmesh.new()
        bmi.from_mesh(mesh_i)
        bmesh.ops.remove_doubles(bmi, verts=list(bmi.verts), dist=1e-7)
        bmesh.ops.recalc_face_normals(bmi, faces=list(bmi.faces))
        bmi.to_mesh(mesh_i)
        bmi.free()
        iris = bpy.data.objects.new(f'iris_and_pupil_{s_}', mesh_i)
        bpy.context.scene.collection.objects.link(iris)
        mesh_i.materials.append(mat_iris)
        colors = mesh_i.color_attributes.new(name='IrisColor', type='FLOAT_COLOR', domain='CORNER')
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
# 6. Nose pad: a thin conformal shell wrapped over the wedge tip, its rim sunk into the skin.
NP = spec['nosePad']
if NP and NP.get('mode') == 'shell' and not args.skin_only:
    mat_nose = get_material('Rounded animal nose', .075)
    if 'nose_finish' in scene_objects:
        bpy.data.objects.remove(scene_objects['nose_finish'], do_unlink=True)
    me2 = head.data
    co2 = np.empty(len(me2.vertices)*3, np.float32)
    me2.vertices.foreach_get('co', co2)
    co2 = co2.reshape(-1, 3).astype(np.float64)
    n2 = len(me2.loops)
    ls2 = np.empty(len(me2.polygons), np.int32)
    me2.polygons.foreach_get('loop_start', ls2)
    lt2 = np.diff(np.append(ls2, n2))
    lv2 = np.empty(n2, np.int32)
    me2.loops.foreach_get('vertex_index', lv2)
    half, top_z = float(NP['halfWidth']), float(NP['topZ'])
    apex_z, rc = float(NP['apexZ'])-float(NP['wrapUnder']), float(NP['cornerRadius'])
    corners = np.array([(-half, top_z), (half, top_z), (0.0, apex_z)])
    sides_len = [np.linalg.norm(corners[(i+1) % 3]-corners[(i+2) % 3]) for i in range(3)]
    incentre = sum(sides_len[i]*corners[i] for i in range(3))/sum(sides_len)
    e1_, e2_ = corners[1]-corners[0], corners[2]-corners[0]
    area_t = abs(e1_[0]*e2_[1]-e1_[1]*e2_[0])/2
    inradius = 2*area_t/sum(sides_len)
    inner = incentre+(corners-incentre)*((inradius-rc)/inradius)

    def sdf_triangle(px, pz, tri):
        d = np.full(px.shape, np.inf)
        inside = np.ones(px.shape, dtype=bool)
        orient = np.sign((tri[1][0]-tri[0][0])*(tri[2][1]-tri[0][1])-(tri[1][1]-tri[0][1])*(tri[2][0]-tri[0][0]))
        for i in range(3):
            a, b = tri[i], tri[(i+1) % 3]
            ex, ez = b[0]-a[0], b[1]-a[1]
            wx, wz = px-a[0], pz-a[1]
            t = np.clip((wx*ex+wz*ez)/(ex*ex+ez*ez), 0, 1)
            d = np.minimum(d, np.hypot(wx-ex*t, wz-ez*t))
            inside &= (ex*wz-ez*wx)*orient >= 0
        return d*np.where(inside, -1.0, 1.0)

    s2d = sdf_triangle(co2[:, 0], co2[:, 2], inner)-rc
    feather = float(NP.get('feather') or 0) or inradius*(1-float(NP['buryStart']))
    cand = (s2d < feather) & (co2[:, 1] < float(NP['yLimit'])) & (np.abs(co2[:, 0]) < half+feather+rc)
    owner = np.repeat(np.arange(len(lt2)), lt2)
    fully = np.bincount(owner, weights=(~cand[lv2]).astype(float), minlength=len(lt2)) == 0
    sel = np.nonzero(fully)[0]
    vn = np.zeros((len(co2), 3))
    face_polys = []
    for k in (3, 4):
        ss = sel[lt2[sel] == k]
        if len(ss) == 0:
            continue
        pv = lv2[ls2[ss][:, None]+np.arange(k)[None, :]]
        face_polys.append(pv)
        nrm = np.cross(co2[pv[:, 1]]-co2[pv[:, 0]], co2[pv[:, 2]]-co2[pv[:, 0]])
        for c_ in range(k):
            np.add.at(vn, pv[:, c_], nrm)
    vn = vn/np.maximum(np.linalg.norm(vn, axis=1), 1e-12)[:, None]
    used_ids = np.unique(np.concatenate([p_.reshape(-1) for p_ in face_polys]))
    local = np.full(len(co2), -1, np.int64)
    local[used_ids] = np.arange(len(used_ids))
    w = smoothstep(-s2d[used_ids]/feather)                    # 0 at the outline, 1 inside by the feather width
    t_top = -float(NP['sinkRim'])+(float(NP['lift'])+float(NP['sinkRim']))*w
    if float(NP['dome']) > 0:
        t_top = t_top+float(NP['dome'])*w*w*w
    t_bot = -float(NP['bury'])*np.ones(len(used_ids))
    P0 = co2[used_ids]
    N0 = vn[used_ids]
    topv = P0+N0*t_top[:, None]
    botv = P0+N0*t_bot[:, None]
    nu = len(used_ids)
    shell_faces = []
    for pa in face_polys:
        lp = local[pa]
        shell_faces += [tuple(f) for f in lp.tolist()]
        shell_faces += [tuple(nu+i for i in reversed(f)) for f in lp.tolist()]
    be = boundary_edges([local[pa] for pa in face_polys])
    for a_, b_ in be.tolist():
        shell_faces.append((b_, a_, nu+a_, nu+b_))
    mesh_n = bpy.data.meshes.new('nose_finish')
    mesh_n.from_pydata(np.concatenate([topv, botv]).tolist(), [], shell_faces)
    mesh_n.update()
    bmn = bmesh.new()
    bmn.from_mesh(mesh_n)
    bmesh.ops.remove_doubles(bmn, verts=list(bmn.verts), dist=1e-7)
    bmesh.ops.recalc_face_normals(bmn, faces=list(bmn.faces))
    bmn.to_mesh(mesh_n)
    bmn.free()
    nose = bpy.data.objects.new('nose_finish', mesh_n)
    bpy.context.scene.collection.objects.link(nose)
    mesh_n.materials.append(mat_nose)
    for poly in mesh_n.polygons:
        poly.use_smooth = True
    checks['nose'] = {'shellFaces': len(shell_faces), 'skinVertices': nu, 'feather': float(feather), 'stats': mesh_stats(nose),
                      'yRange': [float(topv[:, 1].min()), float(topv[:, 1].max())]}
tick('nose pad authored')

# ---------------------------------------------------------------------------------------------------------------------------------
# 7. Mouth curves follow the skin displacement in y.
follow = {}
if spec['mouth'].get('follow'):
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH' or not obj.name.startswith('closed_mouth') or not len(obj.data.vertices):
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
if 'nose_finish' in bpy.data.objects:
    nm = bpy.data.objects['nose_finish'].data
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

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
record.update({'sweepScore': sweep_score, 'sweepTerms': terms, 'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene), 'donorSha256': sha(args.donor),
               'spec': spec, 'checks': checks, 'skinAfter': after_stats,
               'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']}})
(args.out/'face-parts.json').write_text(json.dumps(record, indent=1, default=float)+'\n')
tick('done')
