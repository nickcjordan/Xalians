"""Grow the ear fan's rear as a volume of coat clumps, in field space (R04, loop v3 round 17).

Run with Blender (through loop_tools.py blender):
  blender -b --factory-startup --python author_fan_clumps_field.py --
    --scene <head.blend> --out <new-dir> [--table art/species-construction/specs/r04_clumps.json] [options]

Implements specs/R04.md sections 2 and 3 (--part rear):

  1. The head skin becomes an OpenVDB level set.
  2. Strip: everything of the old fan behind S(u, y) = max(rear(u, y) - strip-depth, M(u)) is cleared (a heightfield cut,
     faded in from the ear-root crease and out toward the lower edge near the nape). This removes the old shell, the plate and
     the H27/H31 lock rows behind the shared mid-surface M.
  3. Dome blur (--dome-blur): the kept dome surface inside the crease is replaced by a blurred heightfield so the seams of the
     old cuts drop to nothing (crest held).
  4. Core: a slab whose rear face is rear(u, y) - core-back, inside the sheet's fan envelope inset along the edges, is
     smooth-unioned back (the wing needs a body for the clumps to grow from).
  5. Clumps: every row of the table (K crown line, I root band, M middle, T top edge, E edge row, C crown tuft) is a tapered
     rounded section swept along a Catmull-Rom axis through the table's four control points; its thickness axis follows the
     rear envelope's surface normal. All are smooth-unioned and the field is meshed once.

Coordinates are the spec's back-view fit units; the head is placed at scale .50 with offset (0, -.02, .635), so
head-local = (-S x_back, S df + .04, .537 - S y) with S = 3.721. Eyes, nose and mouth are separate objects and do not move.
Akinza-specific. Every parameter is recorded in fan-clumps.json.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys

import bpy
import bmesh
import numpy as np
import openvdb as vdb

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, remove_voxel_specks, require_single_closed_mesh, sha
from study_provenance import snapshot

S = 3.721           # figure units to head-local units
DF0 = .04           # head-local y of df 0
Z0 = .537           # head-local z of figure y 0

parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--part', default='rear', choices=['rear', 'front'])
parser.add_argument('--table', type=Path, default=Path(__file__).resolve().parent/'specs/r04_clumps.json')
parser.add_argument('--voxel', type=float, default=.0025)
parser.add_argument('--bandwidth', type=int, default=12)
parser.add_argument('--strip-depth', type=float, default=.030, help='the strip keeps rear(u, y) minus this (figure units), never in front of M')
parser.add_argument('--no-strip', action='store_true')
parser.add_argument('--strip-edge', type=float, default=.012, help='near the nape (u under .10) the strip stops this far above the envelope lower edge (figure units)')
parser.add_argument('--strip-crown', type=float, default=.052, help='near the crown (u under .09) the strip fades in below this figure y')
parser.add_argument('--strip-cut-smooth', type=int, default=2, help='box-blur radius (voxels, 3 passes) where the strip changed the field')
parser.add_argument('--core-back', type=float, default=.012, help='core rear face lies this far in front of the rear envelope (figure units)')
parser.add_argument('--core-front', type=float, default=.012, help='core front face lies this far in front of M (figure units)')
parser.add_argument('--core-inset', type=float, nargs=2, default=[.012, .015], help='core inset from the envelope: top edge, other edges (figure units)')
parser.add_argument('--core-blend', type=float, default=.005, help='core to skin smooth union (figure units)')
parser.add_argument('--no-core', action='store_true')
parser.add_argument('--core-crown', type=float, default=0., help='beside the dome (u under .09) the core starts below this figure y (0 = off)')
parser.add_argument('--core-dome', type=float, default=-1., help='negative = off; beside the dome (u under .09) the core is this thick behind its rear face (figure units)')
parser.add_argument('--clump-blend', type=float, default=.004, help='clump to clump smooth union (figure units)')
parser.add_argument('--skin-blend', type=float, default=.004, help='clumps to skin smooth union (figure units)')
parser.add_argument('--blur', type=int, default=1, help='box-blur radius (voxels, 2 passes) of each clump field before fusing; 0 = off')
parser.add_argument('--dome-blur', type=int, default=6, help='dome heightfield blur radius in voxels (2 passes); 0 = off')
parser.add_argument('--dome-ymin', type=float, default=.050)
parser.add_argument('--dome-ymax', type=float, default=.176)
parser.add_argument('--samples', type=int, default=40, help='axis samples per clump')
parser.add_argument('--width-scale', type=float, default=1.)
parser.add_argument('--thick-scale', type=float, default=1.)
parser.add_argument('--taper-exp', type=float, default=1.3)
parser.add_argument('--thick-exp', type=float, default=1.1)
parser.add_argument('--rows', default='K,I,M,T,E,C')
parser.add_argument('--skip', default='', help='comma list of clump names to drop')
parser.add_argument('--tip-min', type=float, default=.0012, help='smallest tip half width and half thickness (figure units)')
parser.add_argument('--ceiling', type=float, default=.0004, help='nothing rises above the baseline skin top plus this (head-local)')
parser.add_argument('--max-island', type=int, default=5000)
# --part front (R03; the implementation is fan_clumps_front.py and fan_clumps_front_run.py, the interface is documented there)
parser.add_argument('--spec', type=Path, default=None, help='--part front: spec JSON {params, cups, clumps, pale, voxel}; the tunable levers (see fan_clumps_front_run.py)')
parser.add_argument('--front-table', type=Path, default=Path(__file__).resolve().parent/'specs/r03_clumps.json', help='--part front: clump table made by loop/r03_clump_table.py')
parser.add_argument('--envelope', type=Path, default=Path(__file__).resolve().parent/'specs/r03_envelope.npz', help='--part front: sheet fan envelope made by loop/r03_envelope.py')
parser.add_argument('--p', action='append', help='--part front: a fan_clumps_front.DEFAULTS key as key=value (python literal), repeatable')
parser.add_argument('--sides', default='L,R', help='--part front: wings to build')
parser.add_argument('--pale-tol', type=float, default=.0015, help='--part front: faces within this much (figure heights) of a tuft clump field get the pale material')
parser.add_argument('--pale-gray', type=float, default=.58)
parser.add_argument('--pale-smooth', type=int, default=3, help='--part front: majority-vote passes over face neighbours that smooth the pale boundary')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
if args.part == 'front':
    import fan_clumps_front_run
    args.entry = __file__
    fan_clumps_front_run.run(args)
    raise SystemExit(0)
args.out = args.out.resolve()
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.scene, args.table])
table = json.loads(args.table.read_text())['clumps']
rows = set(args.rows.split(','))
skip = set(n.strip() for n in args.skip.split(',') if n.strip())

bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
head = max((o for o in bpy.context.scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
require_single_closed_mesh(head, args.out, 'Head skin before fan clumps')
before = mesh_stats(head)
VS = args.voxel
M = head.matrix_world.copy()
points = np.array([M @ v.co for v in head.data.vertices], dtype=np.float32)
ZTOP = float(points[:, 2].max())+args.ceiling
head.data.calc_loop_triangles()
tris = np.empty(len(head.data.loop_triangles)*3, dtype=np.int32)
head.data.loop_triangles.foreach_get('vertices', tris)
tris = tris.reshape(-1, 3)
HALF = args.bandwidth
grid = vdb.FloatGrid.createLevelSetFromPolygons(points, triangles=tris, transform=vdb.createLinearTransform(voxelSize=VS), halfWidth=HALF)
BAND = HALF*VS
lo = np.floor(points.min(axis=0)/VS).astype(int)-30
hi = np.ceil(points.max(axis=0)/VS).astype(int)+30
shape = tuple(int(v) for v in hi-lo+1)
field = np.empty(shape, dtype=np.float32)
grid.copyToArray(field, ijk=tuple(int(v) for v in lo))
del grid
XS = ((lo[0]+np.arange(shape[0]))*VS).astype(np.float32)
YS = ((lo[1]+np.arange(shape[1]))*VS).astype(np.float32)
ZS = ((lo[2]+np.arange(shape[2]))*VS).astype(np.float32)
print('grid', shape, 'band', BAND, flush=True)


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


def smin(a, b, k):
    h = np.clip(.5+.5*(b-a)/k, 0, 1)
    return b*(1-h)+a*h-k*h*(1-h)


def interp(xs, ys):
    xs, ys = np.array(xs, float), np.array(ys, float)
    return lambda v: np.interp(v, xs, ys)


# ---- plans from the spec (figure units; u = |x_back|) ---------------------------------------------------------------
TOP_PTS = {'L': ([.080, .140, .200, .240, .279], [.019, .006, .001, .006, .029]),
           'R': ([.080, .140, .200, .240, .275], [.030, .024, .020, .026, .049])}
BOT_PTS = {'L': ([.085, .120, .160, .200, .240, .279], [.175, .174, .156, .136, .094, .029]),
           'R': ([.085, .120, .160, .200, .240, .275], [.175, .178, .167, .140, .111, .049])}
TOP = {k: interp(*v) for k, v in TOP_PTS.items()}
BOTTOM = {k: interp(*v) for k, v in BOT_PTS.items()}
TIP_U = {'L': .279, 'R': .275}
PU = interp([.06, .08, .10, .13, .16, .19, .22, .25, .27, .285], [.064, .066, .068, .066, .066, .070, .074, .074, .070, .060])
CU = interp([0., .10, .16, .20, .24, .27], [.020, .020, .025, .030, .034, .034])
MU = interp([.08, .10, .13, .16, .19, .22, .25, .27, .285], [.020, .022, .026, .032, .044, .056, .060, .060, .058])
CREASE = interp([.05, .10, .175], [.044, .068, .085])


def rear_plan(u, y, side):
    """Outer rear surface df of the wing at (u, y), spec section 3."""
    top, bottom = TOP[side](u), BOTTOM[side](u)
    topr = CU(u)+np.sqrt(np.maximum(y-top, 0)/15.)
    s = np.maximum(bottom-y, 0)
    wedge_on = smoothstep((u-.08)/.03)
    wedge = MU(u)+.004+.6*s
    wedge = wedge_on*wedge+(1-wedge_on)*1.
    return np.minimum(np.minimum(PU(u), topr), wedge)


def chain_distance(u, y, pts_u, pts_y):
    """Distance from points to a polyline (vectorized over u, y of equal shape)."""
    best = np.full(np.shape(u), 1e9)
    for i in range(len(pts_u)-1):
        ax, ay, bx, by = pts_u[i], pts_y[i], pts_u[i+1], pts_y[i+1]
        dx, dy = bx-ax, by-ay
        t = np.clip(((u-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy), 0, 1)
        best = np.minimum(best, np.hypot(u-(ax+t*dx), y-(ay+t*dy)))
    return best


# ---- strip ----------------------------------------------------------------------------------------------------------
field0 = field.copy() if args.strip_cut_smooth else None
if not args.no_strip:
    for sign, side in ((1, 'L'), (-1, 'R')):
        xi = np.where(XS*sign > 0)[0]
        for chunk in np.array_split(xi, max(1, len(xi)//40)):
            x = XS[chunk][:, None, None]
            y = YS[None, :, None]
            z = ZS[None, None, :]
            u = np.abs(x)/S
            yf = (Z0-z)/S
            sl = field[chunk]
            plan = np.maximum(rear_plan(u, yf, side)-args.strip_depth, MU(u))
            plate_y = (plan*S+DF0).astype(np.float32)
            w = smoothstep((u-CREASE(np.clip(yf, .05, .175))+.004)/.008)
            margin = np.interp(u, [.10, .14], [-args.strip_edge, .012])
            w = w*smoothstep((BOTTOM[side](u)+margin-yf)/.010)*smoothstep((yf+.04)/.02)
            # near the crown (u under .09) the strip stays below the crown line: the core does not rebuild above it
            crown = smoothstep((yf-args.strip_crown-.012)/.012)
            w = w*(crown+(1-crown)*smoothstep((u-.08)/.012))
            w = w.astype(np.float32)
            dy = np.gradient(plate_y[:, 0, :], VS, axis=0)
            dz = np.gradient(plate_y[:, 0, :], VS, axis=1)
            scale = (1/np.sqrt(1+dy**2+dz**2))[:, None, :].astype(np.float32)
            g = (y-plate_y)*scale
            cut = np.maximum(sl, g)
            field[chunk] = sl+w*(cut-sl)
    print('strip done', flush=True)


def box(a, r):
    for ax_ in range(3):
        n_ = a.shape[ax_]
        c = np.cumsum(np.pad(a, [(r+1, r) if i == ax_ else (0, 0) for i in range(3)], mode='edge'), axis=ax_, dtype=np.float64)
        a = ((np.take(c, np.arange(2*r+1, n_+2*r+1), axis=ax_)-np.take(c, np.arange(0, n_), axis=ax_))/(2*r+1)).astype(np.float32)
    return a


if args.strip_cut_smooth and not args.no_strip:
    changed = (np.abs(field-field0) > 1e-5).astype(np.float32)
    del field0
    idx_ = np.argwhere(changed > 0)
    if len(idx_):
        r_ = args.strip_cut_smooth
        a_ = np.maximum(idx_.min(axis=0)-r_*4, 0)
        b_ = np.minimum(idx_.max(axis=0)+r_*4+1, np.array(shape))
        sl_ = tuple(slice(int(i), int(j)) for i, j in zip(a_, b_))
        sub = field[sl_]
        weight = np.clip(box(box(changed[sl_], r_), r_)*4, 0, 1)
        blur = sub
        for _ in range(3):
            blur = box(blur, r_)
        field[sl_] = sub+weight*(blur-sub)
    del changed
    print('strip smoothing done', flush=True)


# ---- dome blur --------------------------------------------------------------------------------------------------------
def box2d_masked(val, valid, r, passes=2):
    num = np.where(valid, val, 0.).astype(np.float64)
    den = valid.astype(np.float64)
    for _ in range(passes):
        for ax_ in (0, 1):
            n_ = num.shape[ax_]
            outs = []
            for a in (num, den):
                c = np.cumsum(np.pad(a, [(r+1, r) if i == ax_ else (0, 0) for i in range(2)], mode='edge'), axis=ax_)
                outs.append(np.take(c, np.arange(2*r+1, n_+2*r+1), axis=ax_)-np.take(c, np.arange(0, n_), axis=ax_))
            num, den = outs
    return np.where(den > 1e-6, num/np.maximum(den, 1e-6), np.nan)


if args.dome_blur > 0:
    inside_ = field < 0
    ny_ = inside_.shape[1]
    has_ = inside_.any(axis=1)
    yrear = YS[ny_-1-inside_[:, ::-1, :].argmax(axis=1)].astype(np.float64)
    del inside_
    blur_ = box2d_masked(yrear, has_, args.dome_blur)
    u_ = np.abs(XS)[:, None]/S
    zf_ = (Z0-ZS[None, :])/S
    crease_ = CREASE(np.clip(zf_, .05, .175))
    wd = (smoothstep((crease_-.004-u_)/.012)*smoothstep((zf_-args.dome_ymin+.02)/.02)*smoothstep((args.dome_ymax-zf_)/.02)).astype(np.float32)
    target = np.where(np.isnan(blur_), yrear, blur_).astype(np.float32)
    gy = YS[None, :, None]-target[:, None, :]
    slope = np.hypot(np.gradient(target, VS, axis=0), np.gradient(target, VS, axis=1))
    gy = gy/np.sqrt(1+slope**2)[:, None, :]
    cut_ = np.maximum(field, gy.astype(np.float32))
    slab_ = np.maximum(gy.astype(np.float32), (yrear.astype(np.float32)-.03*S)[:, None, :]-YS[None, :, None])
    cut_ = np.minimum(cut_, slab_)
    del slab_
    field = np.where(((wd > 1e-3) & has_)[:, None, :], field+wd[:, None, :]*(cut_-field), field).astype(np.float32)
    del gy, cut_
    print('dome blurred', flush=True)


# ---- core ---------------------------------------------------------------------------------------------------------------
if not args.no_core:
    for sign, side in ((1, 'L'), (-1, 'R')):
        xi = np.where(XS*sign > 0)[0]
        tu, ty = TOP_PTS[side]
        bu, by_ = BOT_PTS[side]
        for chunk in np.array_split(xi, max(1, len(xi)//40)):
            x = XS[chunk][:, None]
            z = ZS[None, :]
            u = np.abs(x)/S                                   # (nx,1)
            yf = (Z0-z)/S                                     # (1,nz)
            uu, yy = np.broadcast_arrays(u, yf)
            d_top = chain_distance(uu, yy, tu, ty)
            d_bot = chain_distance(uu, yy, bu, by_)
            inside_t = (yy >= TOP[side](uu)) & (uu <= TIP_U[side])
            inside_b = (yy <= BOTTOM[side](uu)) & (uu <= TIP_U[side])
            sd_t = np.where(inside_t, d_top, -d_top)
            sd_b = np.where(inside_b, d_bot, -d_bot)
            sd2 = np.maximum(args.core_inset[0]-sd_t, args.core_inset[1]-sd_b)
            sd2 = np.maximum(sd2, CREASE(np.clip(yy, .05, .175))-.004-uu)
            if args.core_crown > 0:
                # beside the dome (u under .09) the crown top is the head's own: the core only starts below this figure y
                sd2 = np.maximum(sd2, (args.core_crown-yy)-1.*smoothstep((uu-.085)/.015))
            sd2 = (sd2*S).astype(np.float32)                  # (nx,nz), positive outside
            dfb = ((rear_plan(uu, yy, side)-args.core_back)*S+DF0).astype(np.float32)
            near = (1-smoothstep((uu-.09)/.02))*(1-smoothstep((yy-.062)/.012)) if args.core_dome >= 0 else 0.*uu                   # beside the dome the core is a thin shell behind the old surface
            dfa_fig = (1-near)*(MU(uu)-args.core_front)+near*(rear_plan(uu, yy, side)-args.core_back-args.core_dome)
            dfa = (dfa_fig*S+DF0).astype(np.float32)
            sb = (1/np.sqrt(1+np.gradient(dfb, VS, axis=0)**2+np.gradient(dfb, VS, axis=1)**2)).astype(np.float32)
            y = YS[None, :, None]
            g1 = (y-dfb[:, None, :])*sb[:, None, :]
            g2 = (dfa[:, None, :]-y)
            core = np.maximum(np.maximum(sd2[:, None, :], g1), g2)
            core = np.clip(core, -BAND, BAND)
            kc = args.core_blend*S
            sl = field[chunk]
            field[chunk] = np.minimum(smin(sl, core, kc), BAND).astype(np.float32)
    print('core done', flush=True)


# ---- clumps -----------------------------------------------------------------------------------------------------------
def catmull(p):
    p = np.array(p, float)
    q = np.vstack([2*p[0]-p[1], p, 2*p[-1]-p[-2]])
    out = []
    for i in range(1, 4):
        p0, p1, p2, p3 = q[i-1], q[i], q[i+1], q[i+2]
        for t in np.linspace(0, 1, 40, endpoint=False):
            out.append(.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t**3))
    out.append(p[-1])
    return np.array(out)


def resample(path, n):
    seg = np.linalg.norm(np.diff(path, axis=0), axis=1)
    arc = np.r_[0, np.cumsum(seg)]
    t = np.linspace(0, arc[-1], n)
    return np.stack([np.interp(t, arc, path[:, i]) for i in range(3)], axis=1)


def jitter_of(name):
    return int(hashlib.md5(name.encode()).hexdigest()[:8], 16)/0xffffffff*2-1


def rear_normal(xb, y):
    """Surface normal (head-local) of the rear envelope at back-view (xb, y)."""
    side = 'L' if xb < 0 else 'R'
    h = .003
    sg = -1. if xb < 0 else 1.
    u = abs(xb)
    drdu = (float(rear_plan(u+h, y, side))-float(rear_plan(max(u-h, 0.), y, side)))/(u+h-max(u-h, 0.))
    drdy = (float(rear_plan(u, y+h, side))-float(rear_plan(u, y-h, side)))/(2*h)
    n = np.array([sg*drdu, 1., drdy])
    return n/np.linalg.norm(n)


def clump_field(c):
    ps = catmull(c['path'])
    ps = resample(ps, args.samples)
    ax = np.stack([-S*ps[:, 0], S*ps[:, 2]+DF0, Z0-S*ps[:, 1]], axis=1)
    seg = np.linalg.norm(np.diff(ax, axis=0), axis=1)
    arc = np.r_[0, np.cumsum(seg)]
    L = float(arc[-1])
    tang = np.gradient(ax, axis=0)
    tang /= np.linalg.norm(tang, axis=1)[:, None]
    nrm = np.zeros_like(tang)
    for k in range(len(ax)):
        n = rear_normal(float(ps[k, 0]), float(ps[k, 1]))
        n = n-(n@tang[k])*tang[k]
        if np.linalg.norm(n) < 1e-3:
            n = np.array([0., 1., 0.])-tang[k][1]*tang[k]
        nrm[k] = n/np.linalg.norm(n)
    bin_ = np.cross(tang, nrm)
    row = c['row']
    tipr = (.0012 if row == 'C' else (.0015 if row in 'TE' else .002))
    tipr = max(tipr, args.tip_min)*S
    wm, wr = c['widthMid']*S*args.width_scale, c['widthRoot']*S*args.width_scale
    thm = c['thick']*S*args.thick_scale
    p = 2*(1.0 if row in 'KC' else (1.2 if row in 'TE' else 1.3))
    tw = math.radians(8*abs(jitter_of(c['name'])))

    def half_width(t):
        rise = np.where(t < .4, wr/2+(wm/2-wr/2)*np.clip(t/.4, 0, 1), wm/2*np.clip(1-(t-.4)/.6, 0, 1)**args.taper_exp)
        return np.maximum(rise, tipr)

    def half_thick(t):
        h = np.where(t < .4, thm*(.7+.3*np.clip(t/.4, 0, 1)), thm*np.clip(1-(t-.4)/.6, 0, 1)**args.thick_exp)
        return np.maximum(h/2, tipr)

    reach = wm/2+thm/2+.025
    low = ax.min(axis=0)-reach
    high = ax.max(axis=0)+reach
    a = np.clip(np.floor(low/VS).astype(int)-lo, 0, np.array(shape)-1)
    z = np.clip(np.ceil(high/VS).astype(int)-lo+1, 0, np.array(shape))
    sl = tuple(slice(int(i), int(j)) for i, j in zip(a, z))
    if any(s.stop <= s.start for s in sl):
        return None
    xs, ys, zs = (np.arange(s.start, s.stop) for s in sl)
    X, Y, Z = np.meshgrid((lo[0]+xs)*VS, (lo[1]+ys)*VS, (lo[2]+zs)*VS, indexing='ij')
    P = np.stack([X, Y, Z], axis=-1).reshape(-1, 3).astype(np.float32)
    del X, Y, Z
    best = np.full(len(P), 1e9, np.float32)
    idx = np.zeros(len(P), np.int32)
    for k in range(len(ax)):
        d2 = ((P-ax[k].astype(np.float32))**2).sum(axis=1)
        m = d2 < best
        best[m] = d2[m]
        idx[m] = k
    q = P-ax[idx].astype(np.float32)
    s_loc = (q*tang[idx]).sum(axis=1)
    length = arc[idx]+s_loc
    aa = (q*bin_[idx]).sum(axis=1)
    cc = (q*nrm[idx]).sum(axis=1)
    t = np.clip(length/L, 0, 1)
    if tw:
        ang = (tw*t).astype(np.float32)
        aa, cc = aa*np.cos(ang)-cc*np.sin(ang), aa*np.sin(ang)+cc*np.cos(ang)
    wh = half_width(t).astype(np.float32)
    hh = half_thick(t).astype(np.float32)
    e = ((np.abs(aa)/wh)**p+(np.abs(cc)/hh)**p)**(1./p)
    e = np.sqrt(e**2+(np.maximum(length-L, 0)/np.maximum(np.minimum(wh, hh), tipr))**2*.5
                +(np.maximum(-length, 0)/.02)**2)
    d = (e-1)*np.minimum(wh, hh)
    d = np.clip(d, -BAND, BAND).reshape(tuple(s.stop-s.start for s in sl)).astype(np.float32)
    if args.blur:
        for _ in range(2):
            d = box(d, args.blur)
    # nothing above the baseline's top
    zz = (ZS[sl[2]])[None, None, :]
    d = np.maximum(d, np.clip(zz-ZTOP, -BAND, BAND).astype(np.float32))
    info = {'name': c['name'], 'length': round(L/S, 4), 'axisRoot': [round(float(v), 4) for v in ps[0]],
            'axisTip': [round(float(v), 4) for v in ps[-1]], 'widthMid': round(wm/S, 4), 'thick': round(thm/S, 4)}
    return sl, d, info


clump_arr = np.full(shape, BAND, dtype=np.float32)
built = []
kc = args.clump_blend*S
for c in sorted(table, key=lambda r: r['layer']):
    if c['row'] not in rows or c['name'] in skip:
        continue
    r = clump_field(c)
    if r is None:
        built.append({'name': c['name'], 'skipped': 'outside grid'})
        continue
    sl, d, info = r
    cur = clump_arr[sl]
    clump_arr[sl] = np.where(cur >= BAND*.9, np.minimum(cur, d), smin(cur, d, kc)).astype(np.float32)
    built.append(info)
print('clumps', len(built), flush=True)

combined = np.minimum(smin(field, clump_arr, args.skin_blend*S), BAND).astype(np.float32)
del clump_arr, field
combined = np.maximum(combined, np.clip(ZS[None, None, :]-ZTOP, -BAND, BAND).astype(np.float32))
out_grid = vdb.FloatGrid()
out_grid.background = BAND
out_grid.copyFromArray(combined, ijk=(0, 0, 0))
vertices, tri_out, quads = out_grid.convertToPolygons(isovalue=0.0, adaptivity=0.0)
vertices = (vertices.astype(np.float64)+lo)*VS
faces = [tuple(t) for t in tri_out.tolist()]+[tuple(q) for q in quads.tolist()]
materials = list(head.data.materials)
mesh = bpy.data.meshes.new('Head skin with fan clumps')
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
removed_islands = []
if args.max_island:
    bmi = bmesh.new(); bmi.from_mesh(head.data)
    unseen, groups = set(bmi.verts), []
    while unseen:
        queue = [unseen.pop()]
        group = set(queue)
        while queue:
            for edge in queue.pop().link_edges:
                for vertex in edge.verts:
                    if vertex in unseen:
                        unseen.remove(vertex); group.add(vertex); queue.append(vertex)
        groups.append(group)
    biggest = max(groups, key=len)
    for group in groups:
        if group is not biggest and len(group) <= args.max_island:
            removed_islands.append({'vertices': len(group),
                                    'bounds': [[round(min(v.co[i] for v in group), 4) for i in range(3)],
                                               [round(max(v.co[i] for v in group), 4) for i in range(3)]]})
            bmesh.ops.delete(bmi, geom=list(group), context='VERTS')
    bmi.to_mesh(head.data); bmi.free()
require_single_closed_mesh(head, args.out, 'Head skin with fan clumps')
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
params = {k: (str(v) if isinstance(v, Path) else v) for k, v in vars(args).items()}
(args.out/'fan-clumps.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'scope': 'R04: ear fan rear stripped behind the mid-surface and regrown as a clump volume (K, I, M, T, E, C), field space; face untouched',
    'parameters': params, 'clumpCount': len(built), 'clumps': built, 'skinTopZ': ZTOP,
    'removedFlecks': removed_flecks, 'removedIslands': removed_islands,
    'skinBefore': before, 'skinAfter': mesh_stats(head),
    'outputs': {p.name: sha(p) for p in args.out.iterdir() if p.suffix in ['.glb', '.blend']},
}, indent=2)+'\n')
