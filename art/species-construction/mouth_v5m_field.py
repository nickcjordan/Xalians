"""Mouth v5m (Nick 2026-10-10): the v5 head (H39) with only the muzzle, mouth and chin changed.

Run with Blender (through loop_tools.py blender or a recipe step), on the v5 analytic head (H39 output):
  --python mouth_v5m_field.py -- --scene <head.blend> --out <new-dir> --spec <mouth spec json> --mass <v5 head spec json>

Nick rejected v6, v6b and v6c for the skull and the lumps; the one change he liked was the mouth: the muzzle without the
divot where the two mouth curves meet, one smooth surface under the nose, a clean shallow mouth line, a small rounded chin,
mouth and chin raised .025. His rule: one part at a time, nothing else changes. So this step does not rebuild the field or
remesh. It moves vertices of the existing v5 skin in place (same vertex count, order and faces), and only inside a stated
muzzle mask, so every vertex outside the mask keeps its exact v5 position.

1. Divot fill (`window` [cx, cy, cz, rx, ry, rz], `windowBlend` [q0, q1]): inside the ellipsoid window (full to q0, C2
   fade out by q1) each skin vertex is moved toward the v5 head mass (the `mass` of the v5 head spec, the same surface
   v6b used in its mouth window) by Newton projection along the mass gradient. The H37 skin v5 kept there carried the pit;
   the mass has none. Held near the nose object (`noseHold` [d0, d1]: no move within d0 of it, full beyond d1) so the nose
   pad stays seated, none above z `fillTop` (full below the first, none above the second: the bridge between the
   eyes stays), and only where the skin lies within `fillReach` of the mass.
2. Lift (`lift`, `liftZ` [z0, z1, z2, z3], `liftY` [y0, y1], `liftX` [x0, x1], `liftNose` [cx, cy, cz, rx, ry, rz, fade]):
   as v6b's faceLift, the mouth, muzzle and upper chin rise by `lift` (full between z1 and z2, none above z0 or below z3,
   so the chin underside and throat stay where v5 had them), front only (full in front of y0, none behind y1), none beyond
   |x| x1 (full inside x0), held at 0 round the nose. Done as the inverse map of v6b's field warp f(x, y, z - L): each
   vertex goes to the z' with z' - L(x, y, z') = z (monotone, solved by bisection), so the surface is the warped one.
2b. Fairing (`fair` [cx, cy, cz, rx, ry, rz], `fairBlend`, `fairIters`, `fairLambda`, `fairMu`, `fairNose`): Taubin
   smoothing of the moved skin, weighted by an ellipsoid (full to the first q, none beyond the second), none near the nose
   and above `fillTop`, so the step the lift's upper ramp leaves above the mouth fairs out; vertices outside stay fixed.
2c. Plate (`plate`: x, z, step, core, coreData, pinData, noseMargin, alpha, applyMask, facing, maxY): the front depth of
   the moved skin is sampled on an (x, z) grid and refit as a thin plate (data weight 1, falling to coreData inside the
   core ellipse between the nose and the mouth, pinned where the nose covers the face), so the compressed upper lip
   becomes one smooth surface; the change is applied to front-facing vertices of the front sheet inside applyMask.
   `liftXLow` [x0, x1, za, zb] narrows the x fade toward the chin bottom, so the jaw outline beside the chin stays.
3. Mouth line: the closed_mouth objects are lifted by the same L and keep their depth from the skin front (as v6b);
   `mouthSink` {object: depth} sets a piece that sat in the old pit (closed_mouth_2, the short stroke under the nose, not
   visible on v5) that far under the new skin, so it does not stand out of the filled muzzle.

Writes head.blend, shape.glb, mouth-v5m.json (per-part maxima and the displacement inside and outside the mask box).
"""
import argparse
import json
from pathlib import Path
import sys

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_blockout import mesh_stats, require_single_closed_mesh, sha
from study_provenance import snapshot

DEFAULTS = {
    'window': [0., -.33, -.19, .12, .10, .07], 'windowBlend': [1., 1.63],
    'noseHold': [.004, .02], 'fillTop': [-.13, -.10], 'fillReach': [.03, .045], 'fillIters': 6,
    'lift': .025, 'liftZ': [-.15, -.19, -.24, -.30], 'liftY': [-.26, -.18], 'liftX': [.11, .19],
    'liftNose': [0., -.35, -.13, .05, .05, .03, 1.8],
    'fair': [0., -.31, -.22, .15, .11, .10], 'fairBlend': [.6, 1.], 'fairNose': [.003, .015], 'fairIters': 0,
    'fairLambda': .5, 'fairMu': -.53, 'plate': None, 'mouthSink': None, 'liftXLow': None,
    'maskBox': [.28, -.36, -.10, .06],
}

argv = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--spec', type=Path, required=True, help='mouth spec (window, lift)')
parser.add_argument('--mass', type=Path, required=True, help='the v5 head spec (its "mass")')
args = parser.parse_args(argv)
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.scene, args.spec, args.mass])
P = dict(DEFAULTS)
P.update({k: v for k, v in json.loads(args.spec.read_text()).items() if k != 'note'})
MASS = json.loads(args.mass.read_text())['mass']


def ss2(t, a, b):
    t = np.clip((t-a)/(b-a), 0, 1)
    return t*t*t*(t*(6*t-15)+10)


def smin(a, b, k):
    h = np.clip(.5+.5*(b-a)/k, 0, 1)
    return b*(1-h)+a*h-k*h*(1-h)


def ell(p, c, r):
    return (np.sqrt(((p[:, 0]-c[0])/r[0])**2+((p[:, 1]-c[1])/r[1])**2+((p[:, 2]-c[2])/r[2])**2)-1)*min(r)


def mass_field(p):
    f = None
    for part in MASS['parts']:
        g = ell(p, part['c'], part['r'])
        if part.get('mirror'):
            g = smin(g, ell(p, [-part['c'][0], part['c'][1], part['c'][2]], part['r']), part['k'])
        f = g if f is None else smin(f, g, part['k'])
    return f


def mass_grad(p, h=1e-4):
    g = np.empty_like(p)
    for a in range(3):
        d = np.zeros(3)
        d[a] = h
        g[:, a] = (mass_field(p+d)-mass_field(p-d))/(2*h)
    return g


def qell(p, c, r):
    return np.sqrt(((p[:, 0]-c[0])/r[0])**2+((p[:, 1]-c[1])/r[1])**2+((p[:, 2]-c[2])/r[2])**2)


def lift_of(p):
    z0, z1, z2, z3 = P['liftZ']
    z = p[:, 2]
    prof =ss2(-z, -z0, -z1)*(1-ss2(-z, -z2, -z3))
    ax = np.abs(p[:, 0])
    xf = 1-ss2(ax, *P['liftX'])
    if P['liftXLow']:   # [x0, x1, za, zb]: the x fade narrows to [x0, x1] from za down to zb (the jaw outline below the mouth stays)
        lo_ = P['liftXLow']
        xf = xf+(1-ss2(ax, lo_[0], lo_[1])-xf)*ss2(-z, -lo_[2], -lo_[3])
    L = P['lift']*prof*(1-ss2(p[:, 1], *P['liftY']))*xf
    n = P['liftNose']
    if n:
        L = L*ss2(qell(p, n[:3], n[3:6]), 1., n[6])
    return L


def lift_points(p):
    """Each point to z' with z' - L(x, y, z') = z (the inverse of the field warp f(x, y, z - L))."""
    lo, hi = p[:, 2].copy(), p[:, 2]+P['lift']+1e-6
    for _ in range(40):
        mid = .5*(lo+hi)
        q = p.copy()
        q[:, 2] = mid
        g = mid-lift_of(q)-p[:, 2]
        hi = np.where(g > 0, mid, hi)
        lo = np.where(g > 0, lo, mid)
    out = p.copy()
    zn = .5*(lo+hi)
    out[:, 2] = np.where(zn-p[:, 2] < 1e-7, p[:, 2], zn)   # no lift: exactly the input (no bisection residue)
    return out


# ---- input ----------------------------------------------------------------------------------------------------------
bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
head = max(meshes, key=lambda o: len(o.data.vertices))
require_single_closed_mesh(head, args.out, 'Head skin before mouth v5m')
before = mesh_stats(head)
M = np.array(head.matrix_world)
nv = len(head.data.vertices)
co = np.empty(nv*3)
head.data.vertices.foreach_get('co', co)
local = co.reshape(-1, 3)
pts = local@M[:3, :3].T+M[:3, 3]
nose_objs = [o for o in meshes if o.name.startswith('nose')]


def tree_of(objs):
    V, F = [], []
    for o in objs:
        Mo = o.matrix_world
        b = len(V)
        V += [tuple(Mo @ v.co) for v in o.data.vertices]
        F += [tuple(b+i for i in p.vertices) for p in o.data.polygons]
    return BVHTree.FromPolygons(V, F)


nose_tree = tree_of(nose_objs)

# ---- 1. divot fill ----------------------------------------------------------------------------------------------------
W = P['window']
qw = qell(pts, W[:3], W[3:6])
cand = np.where(qw < P['windowBlend'][1])[0]
p = pts[cand].copy()
w_fill = 1-ss2(qw[cand], *P['windowBlend'])
dn = np.array([nose_tree.find_nearest(Vector(v))[3] for v in p])
w_fill *= ss2(dn, *P['noseHold'])*(1-ss2(p[:, 2], *P['fillTop']))
f0 = mass_field(p)
w_fill *= 1-ss2(np.abs(f0), *P['fillReach'])
proj = p.copy()
for _ in range(P['fillIters']):
    g = mass_grad(proj)
    proj = proj-(mass_field(proj)/np.maximum((g*g).sum(1), 1e-9))[:, None]*g
p1 = p+w_fill[:, None]*(proj-p)
filled = pts.copy()
filled[cand] = p1

# ---- 2. lift ----------------------------------------------------------------------------------------------------------
L0 = lift_of(filled)
zl = P['liftZ']
lcand = np.where((filled[:, 2] < zl[0]+1e-6) & (filled[:, 2] > zl[3]-P['lift']-1e-3)
                 & (filled[:, 1] < P['liftY'][1]) & (np.abs(filled[:, 0]) < P['liftX'][1]))[0]
new = filled.copy()
new[lcand] = lift_points(filled[lcand])

# ---- 2b. fairing inside the mask ---------------------------------------------------------------------------------------
fair_rec = None
if P['fairIters']:
    FC, FR = P['fair'][:3], P['fair'][3:6]
    qf = qell(new, FC, FR)
    fc = np.where(qf < P['fairBlend'][1])[0]
    wf = 1-ss2(qf[fc], *P['fairBlend'])
    dnf = np.array([nose_tree.find_nearest(Vector(v))[3] for v in new[fc]])
    wf *= ss2(dnf, *P['fairNose'])*(1-ss2(new[fc, 2], *P['fillTop']))
    keep = wf > 0
    fc, wf = fc[keep], wf[keep]
    ne = len(head.data.edges)
    ev = np.empty(ne*2, dtype=np.int64)
    head.data.edges.foreach_get('vertices', ev)
    ev = ev.reshape(-1, 2)
    infc = np.zeros(nv, bool)
    infc[fc] = True
    ev = ev[infc[ev[:, 0]] | infc[ev[:, 1]]]
    loc = -np.ones(nv, np.int64)
    loc[fc] = np.arange(len(fc))
    deg = np.zeros(len(fc))
    for a, b in ((0, 1), (1, 0)):
        m_ = infc[ev[:, a]]
        np.add.at(deg, loc[ev[m_, a]], 1)
    start = new[fc].copy()
    for it in range(P['fairIters']):
        for step in (P['fairLambda'], P['fairMu']):
            acc = np.zeros((len(fc), 3))
            for a, b in ((0, 1), (1, 0)):
                m_ = infc[ev[:, a]]
                np.add.at(acc, loc[ev[m_, a]], new[ev[m_, b]])
            lap = acc/np.maximum(deg, 1)[:, None]-new[fc]
            new[fc] = new[fc]+(step*wf)[:, None]*lap
    fair_rec = {'vertices': int(len(fc)), 'maxMove': round(float(np.linalg.norm(new[fc]-start, axis=1).max()), 5)}

# ---- 2c. heightfield plate over the upper lip ---------------------------------------------------------------------------
plate_rec = None
if P['plate']:
    PL = P['plate']
    gx = np.arange(PL['x'][0], PL['x'][1]+1e-9, PL['step'])
    gz = np.arange(PL['z'][0], PL['z'][1]+1e-9, PL['step'])
    head.data.calc_loop_triangles()
    tri_ = np.empty(len(head.data.loop_triangles)*3, dtype=np.int32)
    head.data.loop_triangles.foreach_get('vertices', tri_)
    tr_new = BVHTree.FromPolygons(new.tolist(), tri_.reshape(-1, 3).tolist())
    H0 = np.full((len(gx), len(gz)), np.nan)
    for i, xv in enumerate(gx):
        for j, zv in enumerate(gz):
            hit = tr_new.ray_cast(Vector((xv, -2., zv)), Vector((0., 1., 0.)), 4.)
            if hit[0] is not None:
                H0[i, j] = hit[0][1]
    GX, GZ = np.meshgrid(gx, gz, indexing='ij')
    c_ = PL['core']   # [cx, cz, rx, rz, q0, q1]: where the data weight drops (the plate bridges)
    qc = np.sqrt(((GX-c_[0])/c_[2])**2+((GZ-c_[1])/c_[3])**2)
    core = 1-ss2(qc, c_[4], c_[5])
    wd = 1-core*(1-PL['coreData'])
    # the nose stays pinned: cells whose front ray hits the nose object (or lies within noseMargin of its outline)
    pin = np.zeros_like(wd, bool)
    for i, xv in enumerate(gx):
        for j, zv in enumerate(gz):
            hit = nose_tree.ray_cast(Vector((xv, -2., zv)), Vector((0., 1., 0.)), 4.)
            pin[i, j] = hit[0] is not None
    m_ = int(round(PL['noseMargin']/PL['step']))
    pin_d = pin.copy()
    for _ in range(m_):
        pin_d = pin_d | np.roll(pin_d, 1, 0) | np.roll(pin_d, -1, 0) | np.roll(pin_d, 1, 1) | np.roll(pin_d, -1, 1)
    pw_ = pin_d.astype(float)   # softened, so the pin's edge leaves no crease in the plate
    for _ in range(PL.get('pinSoft', 0)):
        pp = np.pad(pw_, 1, mode='edge')
        pw_ = np.maximum(pin_d, (pp[2:, 1:-1]+pp[:-2, 1:-1]+pp[1:-1, 2:]+pp[1:-1, :-2]+pp[1:-1, 1:-1])/5)
    wd = wd+(PL['pinData']-wd)*pw_**2
    valid = np.isfinite(H0)
    wd = np.where(valid, wd, 0.)
    h0 = np.where(valid, H0, np.nanmean(H0))
    alpha = PL['alpha']

    def lap(u):
        up = np.pad(u, 1, mode='edge')
        return up[2:, 1:-1]+up[:-2, 1:-1]+up[1:-1, 2:]+up[1:-1, :-2]-4*u

    def A(u):
        return wd*u+alpha*lap(lap(u))
    b = wd*h0
    u = h0.copy()
    r = b-A(u)
    pdir = r.copy()
    rs = (r*r).sum()
    for it in range(4000):
        Ap = A(pdir)
        a_ = rs/(pdir*Ap).sum()
        u += a_*pdir
        r -= a_*Ap
        rs2 = (r*r).sum()
        if rs2 < 1e-16:
            break
        pdir = r+(rs2/rs)*pdir
        rs = rs2
    dH = np.where(valid, u-h0, 0.)
    # apply to the vertices by bilinear lookup, weighted by a C2 mask (the plate's own box faded in) and facing front
    sel = np.where((new[:, 0] > gx[0]) & (new[:, 0] < gx[-1]) & (new[:, 2] > gz[0]) & (new[:, 2] < gz[-1])
                   & (new[:, 1] < PL['maxY']))[0]
    fx = (new[sel, 0]-gx[0])/PL['step']
    fz = (new[sel, 2]-gz[0])/PL['step']
    i0 = np.clip(np.floor(fx).astype(int), 0, len(gx)-2)
    j0 = np.clip(np.floor(fz).astype(int), 0, len(gz)-2)
    tx, tz = fx-i0, fz-j0

    def bspl(t):   # uniform cubic B-spline weights (C2, so the moved skin shows no grid lines)
        return [(1-t)**3/6, (3*t**3-6*t**2+4)/6, (-3*t**3+3*t**2+3*t+1)/6, t**3/6]
    wx_, wz_ = bspl(tx), bspl(tz)
    d_ = np.zeros(len(sel))
    for a in range(4):
        ia = np.clip(i0-1+a, 0, len(gx)-1)
        for c in range(4):
            jc = np.clip(j0-1+c, 0, len(gz)-1)
            d_ += wx_[a]*wz_[c]*dH[ia, jc]
    am = PL['applyMask']   # [cx, cz, rx, rz, q0, q1]
    qa = np.sqrt(((new[sel, 0]-am[0])/am[2])**2+((new[sel, 2]-am[1])/am[3])**2)
    wa = 1-ss2(qa, am[4], am[5])
    g_ = mass_grad(new[sel])
    facing = ss2(-g_[:, 1]/np.maximum(np.linalg.norm(g_, axis=1), 1e-9), *PL['facing'])
    # only the front sheet: the vertex must lie near the front hit at its (x, z)
    Hs = (H0[i0, j0]*(1-tx)*(1-tz)+H0[i0+1, j0]*tx*(1-tz)+H0[i0, j0+1]*(1-tx)*tz+H0[i0+1, j0+1]*tx*tz)
    fs = PL.get('frontSheet', [.004, .012])
    front_ = np.where(np.isfinite(Hs), 1-ss2(np.abs(new[sel, 1]-np.nan_to_num(Hs, nan=9.)), *fs), 0.)
    dd = d_*wa*facing*front_
    new[sel, 1] += dd
    plate_rec = {'grid': [len(gx), len(gz)], 'iterations': it+1, 'maxCellChange': round(float(np.abs(dH).max()), 5),
                 'maxVertexMove': round(float(np.abs(dd).max()), 5), 'vertices': int((dd != 0).sum())}


disp = np.linalg.norm(new-pts, axis=1)
bx, bz0, bz1, by = P['maskBox']
inbox = (np.abs(pts[:, 0]) < bx) & (pts[:, 2] > bz0) & (pts[:, 2] < bz1) & (pts[:, 1] < by)
Mi = np.linalg.inv(M)
new_local = new@Mi[:3, :3].T+Mi[:3, 3]
head.data.vertices.foreach_set('co', new_local.ravel())
head.data.update()
record = {
    'fill': {'vertices': int((w_fill > 0).sum()), 'maxMove': round(float(np.linalg.norm(p1-p, axis=1).max()), 5)},
    'fairing': fair_rec,
    'plate': plate_rec,
    'aboveMouthMax': float(disp[pts[:, 2] > -.14].max()),
    'lift': {'vertices': int((np.abs(new[:, 2]-filled[:, 2]) > 0).sum()), 'maxMove': round(float(np.abs(new[:, 2]-filled[:, 2]).max()), 5)},
    'displacement': {'maskBox': P['maskBox'], 'maxInside': round(float(disp[inbox].max()), 6),
                     'maxOutside': float(disp[~inbox].max()), 'movedVertices': int((disp > 0).sum())},
}

# ---- 3. mouth line ----------------------------------------------------------------------------------------------------
head.data.calc_loop_triangles()
tris = np.empty(len(head.data.loop_triangles)*3, dtype=np.int32)
head.data.loop_triangles.foreach_get('vertices', tris)
tris = tris.reshape(-1, 3).tolist()
old_tree = BVHTree.FromPolygons(pts.tolist(), tris)
new_tree = BVHTree.FromPolygons(new.tolist(), tris)


def front_y(tree, x, z):
    hit = tree.ray_cast(Vector((x, -2., z)), Vector((0., 1., 0.)), 4.)
    return None if hit[0] is None else hit[0][1]


moved = {}
for o in meshes:
    if not o.name.startswith('closed_mouth'):
        continue
    Mo = o.matrix_world
    Mo_i = Mo.inverted()
    vs = np.array([tuple(Mo @ v.co) for v in o.data.vertices])
    lifted = lift_points(vs)
    offs = []
    for v, pw, pl in zip(o.data.vertices, vs, lifted):
        y0 = front_y(old_tree, pw[0], pw[2])
        y1 = front_y(new_tree, pw[0], pl[2])
        dy = (y1-y0) if (y0 is not None and y1 is not None) else 0.
        sink_ = (P['mouthSink'] or {}).get(o.name)
        if sink_ is not None and y0 is not None and y1 is not None:   # sat in the old pit: set it just under the new skin
            dy = y1+max(pw[1]-y0, 0.)+sink_-pw[1]
        offs.append(dy)
        v.co = Mo_i @ Vector((pw[0], pw[1]+dy, pl[2]))
    o.data.update()
    moved[o.name] = {'dzMax': round(float((lifted[:, 2]-vs[:, 2]).max()), 4),
                     'dyMin': round(min(offs), 4), 'dyMax': round(max(offs), 4)}
record['mouth'] = moved

require_single_closed_mesh(head, args.out, 'Head skin mouth v5m')
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'mouth-v5m.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'scope': 'Mouth v5m (Nick 2026-10-10): the v5 skin moved in place inside the muzzle mask only (divot filled toward '
             'the v5 mass, mouth and upper chin raised .025 with the chin underside kept), mouth line objects following',
    'parameters': P, 'parts': record, 'skinBefore': before, 'skinAfter': mesh_stats(head),
    'outputs': {q.name: sha(q) for q in args.out.iterdir() if q.suffix in ['.glb', '.blend']},
}, indent=2)+'\n')
print('mouth v5m ok', json.dumps(record), flush=True)
