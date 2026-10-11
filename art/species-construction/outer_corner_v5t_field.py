"""Outer eye corner v5t (Nick 2026-10-11): the v5e head with only the dent outside each outer eye corner filled.

Run with Blender (through loop_tools.py blender or a recipe step), on the v5e head (H45 output):
  --python outer_corner_v5t_field.py -- --scene <head.blend> --out <new-dir> --spec <spec json>

Nick on v5e: "the dark indentation outside each outer eye corner ... feels like it's left over from a previous iteration
of an eye socket that just got kept moving outwards ... I want it fixed." Sections of head-3104 show it: the skin follows
the eye globe to its outer tip, which reaches back toward the side of the head, then makes a small concave notch before
it bulges out and turns down the head side. This step fills that notch so the skin runs from the outer lid edge to the
head side and the ear root as one gently convex surface. One part at a time: vertices move in place, only outward and
only inside the stated mask round each outer corner.

Per side, a frame looking at the corner from outside and in front: view axis d (`view`, x mirrored per side), plane axes
a (horizontal) and b (vertical), centre `centre` (x mirrored). The skin's height along d is sampled on a grid (`step`,
`half`) by rays along -d, first skin hit; cells where the eye globe is hit first are the opening. The dent is filled by
an upper closing of that height field: repeatedly h = max(h, blur(h)) (`closeIters`), which raises every concave pocket
and leaves convex parts as they are; the rise is then smoothed (`riseBlur` passes) so the filled surface has no kink
where it meets the old one. The rise is masked by an ellipse in the (a, b) plane (`mask` [ra, rb, q0, q1]: full inside
q0, none beyond q1), held at 0 within `holdOpening` [o0, o1] of the opening in the plane (the lid edge stays where it
is) and beyond |x| `maxX` and above z `maxZ` (no ear vertex), and applied along d to front-sheet vertices.

With `mode` 'plate' the masked height is instead refit as a thin plate (data weight `pinData` where the mask is 0, `coreData`
where it is 1, plus `alpha` times the squared Laplacian), its target the old height raised by `fillBias` times the
closing's rise, so the corner becomes the smoothest surface between the held lid edge and the held surroundings, leaning
outward into the dent. `push` [u, v, ru, rv, amp] (u measured toward the opening, mirrored per side) adds a smooth outward bump to that target on the head side's sharp
turn beside the corner (in the frame's plane), so the side rounds out instead of turning away in a shadow pocket.

With `mode` 'flow' no height field is used: an outward-only curvature flow on the mesh (`flow`: centre and radii of
an ellipsoid round each outer corner, x mirrored, `blend` [q0, q1] its C2 fade, `hold` [d0, d1] held within d0 of the
globe and free beyond d1 (with `holdExposed`, of the exposed part of the globe only: the globe vertices whose outward
normal ray meets no skin, so skin lying over the buried outer tip is free), `iters`, `rate`) moves each concave vertex out along its normal toward the average of its
neighbours, so the pocket fills from its rim inward while convex parts stay (`inflate` [cx, cy, cz, rx, ry, rz, amp],
x mirrored, first swells the skin outward along its normal by a Gaussian there); vertices outside the ellipsoid never move.

`maxSlope` drops the cells where the skin's height changes faster than that per unit across the view plane (the skin
turning away near its silhouette, where a height field is not single valued), and `maxRise` caps the closing's rise.

Writes head.blend, shape.glb, outer-corner-v5t.json.
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
    'view': [.90, -.43, 0.], 'centre': [.31, -.13, .02], 'step': .002, 'half': .14,
    'closeIters': 400, 'riseBlur': 20, 'mask': [.08, .11, .6, 1.], 'holdOpening': [.006, .014],
    'maxX': [.34, .355], 'mode': 'close', 'pinData': 50., 'coreData': .002, 'alpha': 1., 'fillBias': 0., 'push': None, 'maxSlope': None, 'maxRise': 1., 'flow': None, 'maxZ': [.14, .17], 'frontSheet': [.004, .012],
}

argv = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
parser = argparse.ArgumentParser()
parser.add_argument('--scene', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--spec', type=Path, required=True)
args = parser.parse_args(argv)
args.out.mkdir(parents=True, exist_ok=False)
provenance = snapshot(args.out, __file__, [args.scene, args.spec])
P = dict(DEFAULTS)
P.update({k: v for k, v in json.loads(args.spec.read_text()).items() if k != 'note'})


def ss2(t, a, b):
    t = np.clip((t-a)/(b-a), 0, 1)
    return t*t*t*(t*(6*t-15)+10)


def world_points(o):
    n = len(o.data.vertices)
    c = np.empty(n*3)
    o.data.vertices.foreach_get('co', c)
    M = np.array(o.matrix_world)
    return c.reshape(-1, 3)@M[:3, :3].T+M[:3, 3]


def blur(h, m):
    """3x3 box blur of h over the cells where m is true (normalised; cells outside m keep no weight)."""
    hp = np.pad(np.where(m, h, 0.), 1)
    mp = np.pad(m.astype(float), 1)
    s = sum(hp[1+di:hp.shape[0]-1+di, 1+dj:hp.shape[1]-1+dj] for di in (-1, 0, 1) for dj in (-1, 0, 1))
    c = sum(mp[1+di:mp.shape[0]-1+di, 1+dj:mp.shape[1]-1+dj] for di in (-1, 0, 1) for dj in (-1, 0, 1))
    return np.where(c > 0, s/np.maximum(c, 1e-9), h)


bpy.ops.wm.open_mainfile(filepath=str(args.scene.resolve()))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
head = max(meshes, key=lambda o: len(o.data.vertices))
require_single_closed_mesh(head, args.out, 'Head skin before outer corner v5t')
before = mesh_stats(head)
M = np.array(head.matrix_world)
pts = world_points(head)
head.data.calc_loop_triangles()
tris = np.empty(len(head.data.loop_triangles)*3, dtype=np.int32)
head.data.loop_triangles.foreach_get('vertices', tris)
skin_tree = BVHTree.FromPolygons(pts.tolist(), tris.reshape(-1, 3).tolist())
new = pts.copy()
record = {'sides': {}}

def flow_fill():
    """Outward-only curvature flow on the mesh: inside the mask each vertex that lies behind the average of its
    neighbours (along its normal: a concave spot) moves out toward it; convex spots do not move. Repeated, it fills the
    pocket from its rim inward and leaves the convex lid bulges and head side as they are."""
    F = P['flow']
    ne = len(head.data.edges)
    ev = np.empty(ne*2, dtype=np.int64)
    head.data.edges.foreach_get('vertices', ev)
    ev = ev.reshape(-1, 2)
    w = np.zeros(len(pts))
    rec = {}
    for sgn, side in ((-1., '-1'), (1., '1')):
        globe = bpy.data.objects[f'eye_globe_{side}']
        G = world_points(globe)
        gtree = BVHTree.FromPolygons(G.tolist(), [tuple(p.vertices) for p in globe.data.polygons])
        c = np.array(F['centre'], float)*[sgn, 1., 1.]
        r = np.array(F['radii'], float)
        q = np.sqrt((((pts-c)/r)**2).sum(1))
        cand = np.where(q < F['blend'][1])[0]
        if F.get('holdExposed'):   # hold by distance to the exposed part of the globe (the opening), not the buried tip
            from mathutils.kdtree import KDTree
            gn = np.empty(len(globe.data.vertices)*3)
            globe.data.vertices.foreach_get('normal', gn)
            Mg = np.array(globe.matrix_world)
            gn = gn.reshape(-1, 3)@Mg[:3, :3].T
            gn /= np.linalg.norm(gn, axis=1, keepdims=True)+1e-12
            near_g = np.where(np.sqrt((((G-c)/(r*1.5))**2).sum(1)) < 1.5)[0]
            exposed = [k for k in near_g if gn[k] @ (np.array([0., -1., 0.])) > -.2 and
                       skin_tree.ray_cast(Vector(G[k]+gn[k]*.0005), Vector(gn[k]), .03)[0] is None]
            kd = KDTree(max(1, len(exposed)))
            for i_, k in enumerate(exposed):
                kd.insert(Vector(G[k]), i_)
            kd.balance()
            dg = np.array([kd.find(Vector(p_))[2] if exposed else 1. for p_ in pts[cand]])
            rec[side+'_exposedGlobeVerts'] = len(exposed)
        else:
            dg = np.array([gtree.find_nearest(Vector(p_))[3] for p_ in pts[cand]])
        dsafe = np.array([gtree.find_nearest(Vector(p_))[3] for p_ in pts[cand]])
        wc = (1-ss2(q[cand], *F['blend']))*ss2(dg, *F['hold'])
        wc *= (1-ss2(np.abs(pts[cand, 0]), *P['maxX']))*(1-ss2(pts[cand, 2], *P['maxZ']))
        w[cand] = np.maximum(w[cand], wc)
        rec[side] = {'minGlobeDistance': round(float(dsafe.min()), 4), 'candidates': int(len(cand)), 'weighted': int((wc > 0).sum())}
    act = np.where(w > 0)[0]
    inact = np.zeros(len(pts), bool)
    inact[act] = True
    e = ev[inact[ev[:, 0]] | inact[ev[:, 1]]]
    loc = -np.ones(len(pts), np.int64)
    loc[act] = np.arange(len(act))
    deg = np.zeros(len(act))
    for a_ in (0, 1):
        m_ = inact[e[:, a_]]
        np.add.at(deg, loc[e[m_, a_]], 1)
    # vertex normals from the faces (kept from the input: the flow is small against the curvature it fills)
    head.data.calc_normals_split() if hasattr(head.data, 'calc_normals_split') else None
    vn = np.empty(len(pts)*3)
    head.data.vertices.foreach_get('normal', vn)
    vn = vn.reshape(-1, 3)@M[:3, :3].T
    vn /= np.linalg.norm(vn, axis=1, keepdims=True)+1e-12
    nA = vn[act]
    if F.get('inflate'):   # a smooth outward swell along the normal where the lid's end faces away (before the flow fairs it)
        ic = np.array(F['inflate'][:3], float)
        ir = np.array(F['inflate'][3:6], float)
        for sgn in (-1., 1.):
            cc = ic*[sgn, 1., 1.]
            qi = (((new[act]-cc)/ir)**2).sum(1)
            new[act] += (F['inflate'][6]*np.exp(-qi)*w[act])[:, None]*nA
    cur = new[act].copy()
    for it in range(F['iters']):
        acc = np.zeros((len(act), 3))
        for a_, b_ in ((0, 1), (1, 0)):
            m_ = inact[e[:, a_]]
            np.add.at(acc, loc[e[m_, a_]], new[e[m_, b_]])
        lap = acc/np.maximum(deg, 1)[:, None]-cur
        s_ = (lap*nA).sum(1)
        stepv = F['rate']*np.maximum(s_, 0.)*w[act]
        cur = cur+stepv[:, None]*nA
        new[act] = cur
        if it % 50 == 0 and F.get('smoothTangent'):
            pass
    rec['maxMove'] = float(np.linalg.norm(new-pts, axis=1).max())
    return rec


if P['mode'] == 'flow':
    record['flow'] = flow_fill()
else:

    for sgn, side in ((-1., '-1'), (1., '1')):
        globe = bpy.data.objects[f'eye_globe_{side}']
        G = world_points(globe)
        gtree = BVHTree.FromPolygons(G.tolist(), [tuple(p.vertices) for p in globe.data.polygons])
        d = np.array(P['view'], float)*[sgn, 1., 1.]
        d /= np.linalg.norm(d)
        a = np.cross([0., 0., 1.], d)
        a /= np.linalg.norm(a)
        b = np.cross(d, a)
        c = np.array(P['centre'], float)*[sgn, 1., 1.]
        g = np.arange(-P['half'], P['half']+1e-9, P['step'])
        N = len(g)
        H0 = np.full((N, N), np.nan)
        Opn = np.zeros((N, N), bool)
        far = 1.
        for i, u in enumerate(g):
            for j, v in enumerate(g):
                o_ = c+u*a+v*b+far*d
                hs = skin_tree.ray_cast(Vector(o_), Vector(-d), 2*far)
                if hs[0] is None:
                    continue
                hg = gtree.ray_cast(Vector(o_), Vector(-d), 2*far)
                if hg[0] is not None and hg[3] < hs[3]-1e-5:
                    Opn[i, j] = True
                    continue
                H0[i, j] = float(np.dot(np.array(hs[0])-c, d))
        valid = np.isfinite(H0)
        if P['maxSlope']:   # cells where the skin turns away from the view (near its silhouette) carry no data
            Hn = np.where(valid, H0, 0.)
            gu_ = np.zeros_like(Hn)
            gv_ = np.zeros_like(Hn)
            gu_[1:-1] = (Hn[2:]-Hn[:-2])/(2*P['step'])
            gv_[:, 1:-1] = (Hn[:, 2:]-Hn[:, :-2])/(2*P['step'])
            okn = valid.copy()
            okn[1:-1] &= valid[2:] & valid[:-2]
            okn[:, 1:-1] &= valid[:, 2:] & valid[:, :-2]
            valid = okn & (np.sqrt(gu_**2+gv_**2) < P['maxSlope'])
        # upper closing: fills concave pockets, leaves convex parts
        h = np.where(valid, H0, -9.)
        for _ in range(P['closeIters']):
            h = np.where(valid, np.maximum(h, blur(h, valid)), h)
        rise = np.where(valid, np.minimum(h-H0, P['maxRise']), 0.)
        for _ in range(P['riseBlur']):
            rise = blur(rise, valid)
        GU, GV = np.meshgrid(g, g, indexing='ij')
        ra, rb, q0, q1 = P['mask']
        qm = np.sqrt((GU/ra)**2+(GV/rb)**2)
        wm = 1-ss2(qm, q0, q1)
        ei, ej = np.nonzero(Opn)
        dO = np.full((N, N), 9.)
        for k0 in range(0, len(ei), 300):
            du = GU[..., None]-g[ei[k0:k0+300]][None, None, :]
            dv = GV[..., None]-g[ej[k0:k0+300]][None, None, :]
            dO = np.minimum(dO, np.sqrt(du*du+dv*dv).min(2))
        wo = ss2(dO, *P['holdOpening'])
        W = wm*wo
        GU, GV = np.meshgrid(g, g, indexing='ij')
        if P['mode'] == 'plate':   # thin plate between the held lid edge and the held surroundings (moves either way)
            wd = np.where(valid, P['pinData']-(P['pinData']-P['coreData'])*W, 0.)
            h0 = np.where(valid, H0, np.nanmean(H0))
            tgt = h0+np.where(valid, P['fillBias']*np.maximum(rise, 0.), 0.)
            if P['push']:   # round the head side out locally: a smooth outward bump on the turn beside the corner
                pu_, pv_, ru_, rv_, amp_ = P['push']
                tgt = tgt+np.where(valid, amp_*np.exp(-((GU+sgn*pu_)/ru_)**2-((GV-pv_)/rv_)**2), 0.)   # u > 0 toward the opening on both sides

            def lap(z):
                zp = np.pad(z, 1, mode='edge')
                return zp[2:, 1:-1]+zp[:-2, 1:-1]+zp[1:-1, 2:]+zp[1:-1, :-2]-4*z

            def A(z):
                return wd*z+P['alpha']*lap(lap(z))
            u_ = h0.copy()
            r = wd*tgt-A(u_)
            pdir = r.copy()
            rs = rs0 = (r*r).sum()
            for it in range(20000):
                Ap = A(pdir)
                st = rs/(pdir*Ap).sum()
                u_ += st*pdir
                r -= st*Ap
                rs2 = (r*r).sum()
                if rs2 < 1e-14*rs0:
                    break
                pdir = r+(rs2/rs)*pdir
                rs = rs2
            rise = np.where(valid, u_-h0, 0.)
        # vertices in this frame
        rel = pts-c
        pu, pv, pn = rel@a, rel@b, rel@d
        sel = np.where((np.abs(pu) < P['half']-2*P['step']) & (np.abs(pv) < P['half']-2*P['step']) & (pn > -.2)
                       & (np.abs(pts[:, 0]) > .1))[0]
        fu = (pu[sel]+P['half'])/P['step']
        fv = (pv[sel]+P['half'])/P['step']
        i0 = np.clip(np.floor(fu).astype(int), 0, N-2)
        j0 = np.clip(np.floor(fv).astype(int), 0, N-2)
        tu, tv = fu-i0, fv-j0

        def bspl(t):
            return [(1-t)**3/6, (3*t**3-6*t**2+4)/6, (-3*t**3+3*t**2+3*t+1)/6, t**3/6]
        wu, wv = bspl(tu), bspl(tv)
        rr = np.zeros(len(sel))
        ww_ = np.zeros(len(sel))
        hh = np.zeros(len(sel))
        vs = np.zeros(len(sel))
        Hf = np.where(valid, H0, 0.)
        for p in range(4):
            ip = np.clip(i0-1+p, 0, N-1)
            for q in range(4):
                jq = np.clip(j0-1+q, 0, N-1)
                w4 = wu[p]*wv[q]
                rr += w4*rise[ip, jq]
                ww_ += w4*W[ip, jq]
                hh += w4*Hf[ip, jq]*valid[ip, jq]
                vs += w4*valid[ip, jq]
        hs_ = np.where(vs > .5, hh/np.maximum(vs, 1e-9), np.nan)
        front = np.where(np.isfinite(hs_), 1-ss2(np.abs(pn[sel]-np.nan_to_num(hs_, nan=9.)), *P['frontSheet']), 0.)
        ax = np.abs(pts[sel, 0])
        lim = (1-ss2(ax, *P['maxX']))*(1-ss2(pts[sel, 2], *P['maxZ']))
        move = (rr if P['mode'] == 'plate' else np.maximum(rr, 0.))*ww_*front*lim
        new[sel] += move[:, None]*d[None, :]
        mid = np.abs(g) < .006
        opu = GU[:, mid][Opn[:, mid]]
        record['sides'][side+'_openingU'] = [round(float(opu.min()), 4), round(float(opu.max()), 4)] if len(opu) else None
        record['sides'][side] = {'view': d.round(4).tolist(), 'centre': c.round(4).tolist(), 'grid': N,
                                 'maxRiseCell': round(float(rise.max()), 5), 'vertices': int((move > 0).sum()),
                                 'maxMove': round(float(move.max()), 5), 'minMove': round(float(move.min()), 5)}

Mi = np.linalg.inv(M)
head.data.vertices.foreach_set('co', (new@Mi[:3, :3].T+Mi[:3, 3]).ravel())
head.data.update()
disp = np.linalg.norm(new-pts, axis=1)
record['displacement'] = {'moved': int((disp > 0).sum()), 'max': float(disp.max())}
require_single_closed_mesh(head, args.out, 'Head skin outer corner v5t')
bpy.ops.export_scene.gltf(filepath=str(args.out/'shape.glb'), export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(args.out/'head.blend'))
(args.out/'outer-corner-v5t.json').write_text(json.dumps({
    'approval': None, 'stageProvenanceSha256': provenance, 'sourceSha256': sha(args.scene),
    'scope': 'Outer eye corner v5t (Nick 2026-10-11): the dent outside each outer eye corner filled by an upper closing '
             'of the skin height seen from outside and in front, moved outward in place inside a tight mask',
    'parameters': P, 'parts': record, 'skinBefore': before, 'skinAfter': mesh_stats(head),
    'outputs': {q.name: sha(q) for q in args.out.iterdir() if q.suffix in ['.glb', '.blend']},
}, indent=2)+'\n')
print('outer corner v5t ok', json.dumps(record), flush=True)
