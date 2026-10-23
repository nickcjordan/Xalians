"""B-sntv pass 6: per-frame contact sculpts (shot sculpts) on the final deformed surface.

blender -b --python reskin_shotsculpt.py -- RIG_IN.blend PARAMS.json CFG.json RIG_OUT.blend REPORT.json

The sprites are a fixed set of frames, so the forearm-to-chest (and forearm-to-cannon, forearm-to-upper-arm) contacts
of the folded forelegs are resolved as authored fixes per frame instead of a general deformer.

For each shot (a review pose, or a signature frame posed from the clip code) on the evaluated mesh (armature, DQ,
corrective smooth and the pass 5 correctives all live):
  * find the crossing triangle pairs with the audit's definition (different dominant bones, no shared vertex)
  * decide who yields: across limbs or limb against body, the lower rank yields (body < upper arm < forearm < cannon,
    the head never moves); two segments of the same limb (the carpus fold, the elbow crease) share the yield half and half
  * push the yielding skin out to the pusher's surface plus a margin (nearest point on the pusher skin, its normal),
    then spread the push with a soft falloff (harmonic fill out to FALLOFF mm, zero beyond) and add a slight rim bulge
    on the body skin; repeat on the result until the shot has no crossing pair
Signature frames are then blended with their neighbours (0.25 / 0.5 / 0.25) and re-resolved from the blend, so the
sculpt eases in and out instead of popping.

Storage and playback: each shot is a point attribute 'shot_NN' (float vector, body local space, posed-space offset).
A Geometry Nodes modifier 'ShotSculpt' at the end of the stack adds the offset chosen by an Index Switch. Its index is
driven by the scene frame and a non-deform helper bone 'shot_key' whose location x is keyed per action (1 on the
signature clip, 2 on review.poses, 0 elsewhere; the poser resets it to 0 when no action plays). reskin_shottag.py
keys it after the bake.
"""
import bpy, sys, json, math, time
import numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

A = sys.argv[sys.argv.index('--') + 1:]
RIG_IN, PARP, CFGP, OUTB, REPP = A[:5]
CFG = json.load(open(CFGP))
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'animate'))
_argv = sys.argv; sys.argv = ['x', '--', str(Path(OUTB).parent / 'posetmp'), 'none']
import pose_rig as PR
import luceras_clips as LC
sys.argv = _argv

MARGIN = CFG.get('margin_mm', 0.6) / 1000; FALL = CFG.get('falloff_mm', 20) / 1000; BULGE = CFG.get('bulge', 0.12)
ITERS = CFG.get('iterations', 14); REVIEW = CFG['pose_order']

bpy.ops.wm.open_mainfile(filepath=RIG_IN)
sc = bpy.context.scene; vl = bpy.context.view_layer
rig = bpy.data.objects['luceras_rig']; rig['controls_enabled'] = 0.0; rig.animation_data_create(); rig.animation_data.action = None
body = bpy.data.objects['luceras_blockout']; me = body.data
poser = PR.Poser(rig)
params = json.loads(Path(PARP).read_text())
_, SIGFN, _, _, _ = LC.make_sig(params.get('sig.horns-first-descent', {}))

me.calc_loop_triangles()
NT = len(me.loop_triangles); F = np.empty(NT * 3, np.int64); me.loop_triangles.foreach_get('vertices', F); F = F.reshape(-1, 3)
E = np.empty(len(me.edges) * 2, np.int64); me.edges.foreach_get('vertices', E); E = E.reshape(-1, 2)
NV = len(me.vertices)
gn = [g.name for g in body.vertex_groups]
deform = {b.name for b in rig.data.bones if b.use_deform}
Wd = np.zeros((NV, len(gn)), np.float32)
for v in me.vertices:
    for g in v.groups:
        if gn[g.group] in deform: Wd[v.index, g.group] = g.weight
DOM = Wd.argmax(1); TDOM = DOM[F[:, 0]]
deg = np.bincount(E.ravel(), minlength=NV).astype(float)
HEADM = sum(Wd[:, gn.index(n)] for n in gn if n.startswith(('head_', 'jaw_', 'ear_', 'horn_'))) > 0.5


def limb_of(n):
    return n[:7] if n.startswith('leg_') else 'body'


def rank_of(n):
    if n.startswith(('head_', 'jaw_', 'ear_', 'horn_')): return 9
    if n.startswith('leg_'):
        s = int(n[7:9]) if n[7:9].isdigit() else 1
        return min(s, 3)
    return 0


RANK = np.array([rank_of(n) for n in gn]); LIMB = [limb_of(n) for n in gn]
LIMBID = {l: i for i, l in enumerate(sorted(set(LIMB)))}; LIMBV = np.array([LIMBID[LIMB[j]] for j in range(len(gn))])


def ev():
    dg = bpy.context.evaluated_depsgraph_get(); e = body.evaluated_get(dg); m = e.to_mesh()
    x = np.empty(len(m.vertices) * 3); m.vertices.foreach_get('co', x); e.to_mesh_clear(); return x.reshape(-1, 3)


def set_shot(shot):
    rig.animation_data.action = None; poser.reset(); poser.pin_local = None
    kind, val = shot
    if kind == 'review':
        rig.animation_data.action = bpy.data.actions['review.poses']; sc.frame_set(1 + 10 * REVIEW.index(val))
        ch = {p.name: (p.location.copy(), p.rotation_quaternion.copy(), p.scale.copy()) for p in rig.pose.bones}
        rig.animation_data.action = None
        for nm, (l, q, s) in ch.items():
            p = rig.pose.bones[nm]; p.location = l; p.rotation_quaternion = q; p.scale = s
    else:
        poser.apply(SIGFN(val * 1000.0 / 30))
    vl.update()


def pairs_all(V):
    trees = {}
    for j in np.unique(TDOM):
        ti = np.nonzero(TDOM == j)[0]; P = V[F[ti]].reshape(-1, 3)
        trees[j] = (BVHTree.FromPolygons(V.tolist(), F[ti].tolist(), all_triangles=True), ti, P.min(0), P.max(0))
    keys = sorted(trees); out = set()
    for a in range(len(keys)):
        ta, ia, la, ha = trees[keys[a]]
        for b in range(a + 1, len(keys)):
            tb, ib, lb, hb = trees[keys[b]]
            if np.any(ha < lb) or np.any(hb < la): continue
            for p, q in ta.overlap(tb):
                g1, g2 = int(ia[p]), int(ib[q])
                if len(set(F[g1]) & set(F[g2])): continue
                out.add((min(g1, g2), max(g1, g2)))
    return out


def grow(mask, rings):
    m = mask.copy()
    for _ in range(rings):
        nb = np.zeros(NV, bool); nb[E[:, 0][m[E[:, 1]]]] = True; nb[E[:, 1][m[E[:, 0]]]] = True; m |= nb
    return m


def nbm(x):
    t = np.zeros_like(x); np.add.at(t, E[:, 0], x[E[:, 1]]); np.add.at(t, E[:, 1], x[E[:, 0]])
    return t / deg[:, None] if x.ndim == 2 else t / deg


def vnormals(V):
    c = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]]); vn = np.zeros_like(V)
    for k in range(3): np.add.at(vn, F[:, k], c)
    return vn / np.maximum(np.linalg.norm(vn, axis=1), 1e-20)[:, None]


def pairs_sub(V, tris):
    t = BVHTree.FromPolygons(V.tolist(), F[tris].tolist(), all_triangles=True); out = set()
    for p, q in t.overlap(t):
        a, b = int(tris[p]), int(tris[q])
        if a >= b or TDOM[a] == TDOM[b] or len(set(F[a]) & set(F[b])): continue
        out.add((a, b))
    return out


def bone_pairs(X):
    bp = {}
    for a, b in X:
        k = '|'.join(sorted((gn[TDOM[a]], gn[TDOM[b]]))); bp[k] = bp.get(k, 0) + 1
    return sorted(bp.items(), key=lambda x: -x[1])[:6]


def tris_of(mask):
    return np.nonzero(mask[F].any(1))[0]


def bone_segs():
    M = body.matrix_world.inverted() @ rig.matrix_world; out = {}
    for j, n in enumerate(gn):
        if n in rig.pose.bones:
            pb = rig.pose.bones[n]; out[j] = (np.array(M @ pb.head), np.array(M @ pb.tail))
    return out


FLIPLOG = []


def oriented(Q, pt):
    # face winding made outward per triangle: the normal must point away from its bone's axis
    segs = bone_segs(); c = Q[F[pt]].mean(1); n = np.cross(Q[F[pt, 1]] - Q[F[pt, 0]], Q[F[pt, 2]] - Q[F[pt, 0]])
    sg = np.ones(len(pt))
    for j in np.unique(TDOM[pt]):
        if j not in segs: continue
        m = TDOM[pt] == j; h, t = segs[j]; ax = t - h; L = max(np.dot(ax, ax), 1e-12)
        u = np.clip(((c[m] - h) @ ax) / L, 0, 1); foot = h + u[:, None] * ax
        sg[m] = np.sign(((c[m] - foot) * n[m]).sum(1) + 1e-30)
    tri = F[pt].copy(); flip = sg < 0; tri[flip] = tri[flip][:, ::-1]
    FLIPLOG.append(round(float(flip.mean()), 3))
    return tri


def pusher_side(jy, jp):
    fold = LIMBV[jy] == LIMBV[jp]
    if RANK[jp] == 9: return RANK[DOM] == 9, fold
    if fold: return DOM == jp, fold
    segs = [j for j in range(len(gn)) if LIMBV[j] == LIMBV[jp] and RANK[j] >= 2] if RANK[jp] >= 2 else [jp]
    return np.isin(DOM, segs), fold


def inside(tree, o, dirs):
    odd = 0
    for d in dirs:
        n_, p_ = 0, o.copy()
        for _ in range(8):
            h = tree.ray_cast(p_, d, 0.3)
            if h[0] is None: break
            n_ += 1; p_ = h[0] + d * 1e-5
        odd += n_ % 2
    return odd * 2 > len(dirs)   # majority: a ray may leave through the open end of a limb segment


def capsule(Q, jb, seg):
    """The bone's skin as a capsule with a radius profile along the axis (the outer envelope of its own skin)."""
    h, t = seg; ax = t - h; L2 = max(np.dot(ax, ax), 1e-12); m = DOM == jb
    u = ((Q[m] - h) @ ax) / L2; foot = h + np.clip(u, 0, 1)[:, None] * ax; r = np.linalg.norm(Q[m] - foot, axis=1)
    nb = CFG.get('cap_bins', 12); edges = np.linspace(-0.15, 1.15, nb + 1); prof = np.zeros(nb)
    for b in range(nb):
        k = (u >= edges[b]) & (u < edges[b + 1])
        prof[b] = np.percentile(r[k], CFG.get('cap_pct', 97)) if k.sum() >= 5 else 0.0
    for b in range(nb):   # fill empty bins from the neighbours
        if prof[b] == 0: prof[b] = max(prof[max(0, b - 1)], prof[min(nb - 1, b + 1)])
    return h, ax, L2, edges, prof


def cap_r(cap, u):
    h, ax, L2, edges, prof = cap; c = 0.5 * (edges[1:] + edges[:-1])
    return np.where((u < edges[0]) | (u > edges[-1]), 0.0, np.interp(u, c, prof))


def capsule_carve(V, dirs, cap, reach_in):
    """Depth along dirs to get past the capsule when it lies within reach_in below the point (0 otherwise)."""
    h, ax, L2, edges, prof = cap; out = np.zeros(len(V)); step = 0.0005
    def ins(X):
        u = ((X - h) @ ax) / L2; foot = h + np.clip(u, 0, 1)[:, None] * ax
        return np.linalg.norm(X - foot, axis=1) < cap_r(cap, u)
    entered = np.zeros(len(V), bool); act = np.ones(len(V), bool); entered |= ins(V)
    nmax = int((reach_in + 0.08) / step)
    for k in range(1, nmax + 1):
        if not act.any(): break
        idx = np.nonzero(act)[0]; X = V[idx] + dirs[idx] * (k * step); i_ = ins(X)
        newly = i_ & ~entered[idx]
        # a point that has not met the capsule within reach_in never will be carved
        late = ~entered[idx] & ~i_ & (k * step > reach_in); act[idx[late]] = False
        entered[idx[newly]] = True
        leave = entered[idx] & ~i_ & ~newly
        out[idx[leave]] = k * step; act[idx[leave]] = False
    return out


def capsule_exit(V, dirs, cap):
    """Distance along dirs from each point to leave the capsule (0 when the point is outside)."""
    h, ax, L2, edges, prof = cap; out = np.zeros(len(V)); step = 0.0005
    def ins(X):
        u = ((X - h) @ ax) / L2; foot = h + np.clip(u, 0, 1)[:, None] * ax
        return np.linalg.norm(X - foot, axis=1) < cap_r(cap, u)
    act = ins(V)
    for k in range(1, CFG.get('exit_steps', 160) + 1):
        if not act.any(): break
        X = V[act] + dirs[act] * (k * step); still = ins(X)
        idx = np.nonzero(act)[0]; done = idx[~still]; out[done] = k * step; act[done] = False
    return out


AXES = (Vector((0.577, 0.577, 0.577)), Vector((-0.6, 0.8, 0.0)), Vector((0.0, -0.6, 0.8)))


def resolve(P, D0, tag):
    """Dent each yielding skin straight in along its own normal until it clears the pusher's volume, spread softly.

    Iterate on Q = P + D0 - d * N0 (N0: the posed vertex normals, d: dent depth >= 0):
      crossing pairs -> per (yielder, pusher) the yielder's vertices inside the pusher volume (odd ray parity, 3 rays)
      get the depth along -N0 that exits the pusher (ray cast inward) plus a margin; triangles that cross only by an edge
      get a 0.5 mm nudge; the depth field is spread by a harmonic fill out to FALLOFF with a smoothstep taper and only
      ever grows. Folds inside one limb share the depth half and half. Returns the best D, the log and the max depth.
    """
    N0 = vnormals(P + D0); d = np.zeros(NV); log = []; bodyyield = np.zeros(NV, bool)
    X = pairs_all(P + D0)
    if not X: return D0.copy(), [0], 0.0
    seed = np.zeros(NV, bool); seed[F[np.array(sorted({t for p in X for t in p}))].ravel()] = True
    area = grow(seed, CFG.get('area_rings', 16))
    best = (len(X), d.copy()); log.append(len(X))
    if CFG.get('channel_reach_mm', 0) > 0:
        # one-shot channel: body skin with a forelimb (forearm or cannon capsule) lying within reach below it is carved
        # past the limb, then the depth field is smoothed wide so the brisket narrows instead of grooving
        Q = P + D0; segs_now = bone_segs(); req = np.zeros(NV)
        body = (RANK[DOM] == 0) & ~HEADM & area
        bi = np.nonzero(body)[0]
        for jb in [j for j in range(len(gn)) if gn[j].startswith('leg_f') and RANK[j] >= 2 and j in segs_now]:
            cap = capsule(Q, jb, segs_now[jb])
            dep = capsule_carve(Q[bi], -N0[bi], cap, CFG['channel_reach_mm'] / 1000)
            req[bi] = np.maximum(req[bi], np.where(dep > 0, dep + MARGIN, 0))
        rmask = req > 0; bodyyield |= rmask
        if rmask.any():
            dd = req.copy(); wide = grow(rmask, CFG.get('channel_rings', 30)) & ~HEADM
            for _ in range(CFG.get('channel_smooth', 60)):
                dd = np.where(wide, np.maximum(req, 0.5 * dd + 0.5 * nbm(dd)), 0.0)
            for _ in range(CFG.get('channel_relax', 10)):
                dd = np.where(wide, 0.5 * dd + 0.5 * nbm(dd), 0.0)
            d = np.maximum(dd, 0.0); area |= wide
            log.append(f'channel {int(rmask.sum())} v, max {req.max() * 1000:.1f} mm')
    for it in range(ITERS):
        Q = P + D0 - d[:, None] * N0
        if it:
            area |= grow(d > 1e-5, 3)
            X = pairs_sub(Q, tris_of(area)); log.append(len(X))
            if len(X) < best[0]: best = (len(X), d.copy())
            if not X: break
            if it == 1: log.append(bone_pairs(X)[:3])
        jobs = {}
        for a, b in X:
            ja, jb = TDOM[a], TDOM[b]
            if HEADM[F[a]].all() and HEADM[F[b]].all(): continue
            if LIMBV[ja] == LIMBV[jb] or RANK[ja] == RANK[jb]:
                jobs.setdefault((ja, jb, 0.5), set()).add(a); jobs.setdefault((jb, ja, 0.5), set()).add(b)
            elif RANK[ja] < RANK[jb]: jobs.setdefault((ja, jb, 1.0), set()).add(a)
            else: jobs.setdefault((jb, ja, 1.0), set()).add(b)
        need = np.zeros(NV); cmask = np.zeros(NV, bool); pushed = 0
        segs_now = bone_segs()
        for (jy, jp, share), yt in jobs.items():
            yt = np.array(sorted(yt)); pside, fold = pusher_side(jy, jp)
            pbones = [j for j in np.unique(DOM[pside]) if j in segs_now and RANK[j] > 0] if RANK[jp] != 9 else []
            if not pbones: continue
            yside = (DOM == jy) if fold else (LIMBV[DOM] == LIMBV[jy])
            cand = np.zeros(NV, bool); cand[F[yt].ravel()] = True
            cand = grow(cand, CFG.get('cand_rings', 6)) & yside & ~HEADM & ~pside
            ci = np.nonzero(cand)[0]
            if not len(ci): continue
            hit = np.zeros(NV, bool)
            for jb in pbones:
                cap = capsule(Q, jb, segs_now[jb])
                dep = capsule_carve(Q[ci], -N0[ci], cap, CFG.get('carve_reach_mm', 0) / 1000) if not fold else capsule_exit(Q[ci], -N0[ci], cap)
                ok = dep > 0
                amt = (dep + MARGIN) * share
                upd = ok & (amt > need[ci]); need[ci[upd]] = amt[upd]; hit[ci[ok]] = True
            cmask |= hit; pushed += int(hit.sum())
            if RANK[jy] == 0: bodyyield |= hit
            for t in yt:   # edge-only crossings: nudge the triangle in
                if not hit[F[t]].any():
                    for vi in F[t]:
                        if not HEADM[vi]: need[vi] = max(need[vi], CFG.get('nudge_mm', 0.5) / 1000 * share * 2); cmask[vi] = True
        log.append(f'p{pushed}/{int(cmask.sum())}')
        if not cmask.any(): log.append('no push'); break
        # soft spread of the extra depth
        kd = KDTree(int(cmask.sum())); ci = np.nonzero(cmask)[0]
        for k, vi in enumerate(ci): kd.insert(Vector(Q[vi]), k)
        kd.balance()
        reg = grow(cmask, CFG.get('fall_rings', 14)) & ~HEADM
        dist = np.full(NV, 1e9)
        for vi in np.nonzero(reg)[0]: dist[vi] = kd.find(Vector(Q[vi]))[2]
        reg &= dist < FALL; free = reg & ~cmask
        u = np.where(cmask, need, 0.0)
        for _ in range(CFG.get('fill_iters', 120)):
            u = np.where(free, nbm(u), u); u[~(reg | cmask)] = 0.0
        w = np.clip(1 - dist / FALL, 0, 1); w = w * w * (3 - 2 * w)
        u = np.where(cmask, need, u * np.where(free, w, 1.0))
        d = d + u
    else:
        X = pairs_sub(P + D0 - d[:, None] * N0, tris_of(area)); log.append(len(X))
        if len(X) < best[0]: best = (len(X), d.copy())
    depth = [float(best[1].max())]
    best = (best[0], D0 - best[1][:, None] * N0)
    D = best[1]
    # rim bulge on body skin that yielded: a slight outward swell just beyond the contact, scaled to the dent
    if bodyyield.any() and BULGE > 0:
        Q = P + D; vn = vnormals(Q); dent = np.linalg.norm(D - D0, axis=1)
        core = bodyyield & (dent > 0.5e-3)
        if core.any():
            kd = KDTree(int(core.sum())); ci = np.nonzero(core)[0]
            for k, vi in enumerate(ci): kd.insert(Vector(Q[vi]), k)
            kd.balance(); ring = grow(core, CFG.get('fall_rings', 14)) & ~core & ~HEADM & (RANK[DOM] == 0)
            b = np.zeros(NV)
            for vi in np.nonzero(ring)[0]:
                co, k, d = kd.find(Vector(Q[vi])); x = d / FALL
                if 0 < x < 1.2: b[vi] = BULGE * dent[ci[k]] * math.sin(math.pi * min(x / 1.2, 1.0))
            for _ in range(2): b = np.where(ring, 0.5 * b + 0.5 * nbm(b), 0)
            D = D + b[:, None] * vn
            X = pairs_all(P + D)
            if X:   # the bulge touched something: resolve again from here (no second bulge)
                D, l2, _ = resolve_nb(P, D); log += ['bulge', len(X)] + l2
    return D, log, max(depth) if depth else 0.0


def resolve_nb(P, D0):
    global BULGE
    b = BULGE; BULGE = 0.0
    try: return resolve(P, D0, 'nb')
    finally: BULGE = b


SHOTS = [('review', p) for p in CFG.get('review_shots', ['crouch_deep'])] + [('sig', f) for f in range(CFG['sig_first'], CFG['sig_last'] + 1)]
rep = dict(config=CFG, shots={}); t0 = time.time()
Pbase, Dsh = {}, {}
for shot in SHOTS:
    set_shot(shot); P = ev(); Pbase[shot] = P; X0 = len(pairs_all(P))
    if CFG.get('dry'): X0 = 0
    D, log, dep = resolve(P, np.zeros_like(P), 'first') if X0 else (np.zeros_like(P), [0], 0.0)
    if CFG.get('dry'): D[:50] = 0.001
    Dsh[shot] = D
    rep['shots'][f'{shot[0]}:{shot[1]}'] = dict(pairs_before=X0, first_pass=log, first_depth_mm=round(dep * 1000, 1))
    print('SHOT', shot, 'pairs', X0, 'log', log, 'depth mm', round(dep * 1000, 1), round(time.time() - t0), 'flipped', FLIPLOG[:12], flush=True); FLIPLOG.clear()
    if X0: print('   bones before', bone_pairs(pairs_all(P)), 'after', bone_pairs(pairs_all(P + D)), flush=True)

# temporal blend across neighbouring signature frames, then re-resolve from the blend
sig = [s for s in SHOTS if s[0] == 'sig']
if CFG.get('temporal', True) and not CFG.get('dry'):
    Db = {}
    for i, s in enumerate(sig):
        a = Dsh[sig[i - 1]] if i > 0 else np.zeros((NV, 3)); c = Dsh[sig[i + 1]] if i + 1 < len(sig) else np.zeros((NV, 3))
        Db[s] = 0.25 * a + 0.5 * Dsh[s] + 0.25 * c
    for s in sig:
        D, log, dep = resolve_nb(Pbase[s], Db[s])
        Dsh[s] = D; r = rep['shots'][f'sig:{s[1]}']; r['after_blend'] = log; r['blend_depth_mm'] = round(dep * 1000, 1)
        print('BLEND', s, log, round(time.time() - t0), flush=True)

# final measurement per shot: pairs left, max offset, surface step between neighbouring frames
for s in SHOTS:
    P = Pbase[s]; D = Dsh[s]; X = pairs_all(P + D); n = np.linalg.norm(D, axis=1)
    r = rep['shots'][f'{s[0]}:{s[1]}']; r.update(pairs_after=len(X), max_offset_mm=round(float(n.max()) * 1000, 1), moved_vertices=int((n > 1e-4).sum()))
for i in range(1, len(sig) - 1):
    a, b, c = (Dsh[sig[i - 1]], Dsh[sig[i]], Dsh[sig[i + 1]])
    acc = np.linalg.norm(a - 2 * b + c, axis=1); rep['shots'][f'sig:{sig[i][1]}']['sculpt_accel_mm'] = round(float(acc.max()) * 1000, 2)

# ---- storage + Geometry Nodes playback
for k in [a.name for a in me.attributes if a.name.startswith('shot_')]: me.attributes.remove(me.attributes[k])
index_of = {}
for i, s in enumerate(SHOTS, start=1):
    D = Dsh[s]
    if np.abs(D).max() < 1e-6: continue
    nm = f'shot_{i:02d}'; at = me.attributes.new(nm, 'FLOAT_VECTOR', 'POINT'); at.data.foreach_set('vector', D.astype(np.float32).ravel()); index_of[s] = i
ng = bpy.data.node_groups.new('ShotSculpt', 'GeometryNodeTree')
ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
gi = ng.nodes.new('NodeGroupInput'); go = ng.nodes.new('NodeGroupOutput')
isw = ng.nodes.new('GeometryNodeIndexSwitch'); isw.data_type = 'VECTOR'
need = len(SHOTS) + 1
while len(isw.index_switch_items) < need: isw.index_switch_items.new()
sp = ng.nodes.new('GeometryNodeSetPosition')
# the shot index comes from the location x of an empty 'shot_selector', driven by the frame and the selector bone
emp = bpy.data.objects.get('shot_selector')
if emp is None:
    emp = bpy.data.objects.new('shot_selector', None); sc.collection.objects.link(emp)
emp.hide_render = True; emp.hide_viewport = True; emp['role'] = 'B-sntv pass 6 shot sculpt index (location x, driven)'
oi = ng.nodes.new('GeometryNodeObjectInfo'); oi.inputs['Object'].default_value = emp
sx = ng.nodes.new('ShaderNodeSeparateXYZ'); fi = ng.nodes.new('FunctionNodeFloatToInt'); fi.rounding_mode = 'ROUND'
ng.links.new(oi.outputs['Location'], sx.inputs[0]); ng.links.new(sx.outputs['X'], fi.inputs[0]); ng.links.new(fi.outputs[0], isw.inputs['Index'])
ng.links.new(gi.outputs['Geometry'], sp.inputs['Geometry'])
for s, i in index_of.items():
    na = ng.nodes.new('GeometryNodeInputNamedAttribute'); na.data_type = 'FLOAT_VECTOR'; na.inputs['Name'].default_value = f'shot_{i:02d}'
    ng.links.new(na.outputs['Attribute'], isw.inputs[i + 1])
ng.links.new(isw.outputs[0], sp.inputs['Offset']); ng.links.new(sp.outputs['Geometry'], go.inputs['Geometry'])
md = body.modifiers.new('ShotSculpt', 'NODES'); md.node_group = ng
# keep it last in the stack
body.modifiers.move(body.modifiers.find('ShotSculpt'), len(body.modifiers) - 1)

# helper bone and driver
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='EDIT')
if 'shot_key' not in rig.data.edit_bones:
    b = rig.data.edit_bones.new('shot_key'); b.head = (0, 0, 0); b.tail = (0, 0, 0.02); b.parent = rig.data.edit_bones['root']; b.use_deform = False
bpy.ops.object.mode_set(mode='OBJECT')
rig.data.bones['shot_key']['sprite_only'] = True; rig.data.bones['shot_key']['role'] = 'B-sntv pass 6 shot sculpt selector (location x: 1 signature clip, 2 review poses, 0 otherwise)'
pb = rig.pose.bones['shot_key']; pb.rotation_mode = 'QUATERNION'
sigi = {s[1]: i for s, i in index_of.items() if s[0] == 'sig'}; revi = {s[1]: i for s, i in index_of.items() if s[0] == 'review'}
terms = []
if sigi:
    lo, hi = min(sigi), max(sigi); base = sigi[lo] - lo
    # every frame lo..hi has its slot (empty slots are zero offsets): index = frame + base
    terms.append(f'(k>0.5)*(k<1.5)*(frame>{lo - 0.5})*(frame<{hi + 0.5})*(frame+{base})')
for p, i in revi.items():
    fr = 1 + 10 * REVIEW.index(p); terms.append(f'(k>1.5)*(frame>{fr - 0.5})*(frame<{fr + 0.5})*{i}')
fc = emp.driver_add('location', 0); dr = fc.driver; dr.type = 'SCRIPTED'
v = dr.variables.new(); v.name = 'k'; v.type = 'SINGLE_PROP'; v.targets[0].id = rig; v.targets[0].data_path = 'pose.bones["shot_key"].location[0]'
dr.expression = '+'.join(terms) or '0'
for m in list(fc.modifiers): fc.modifiers.remove(m)
assert len(dr.expression) < 250, dr.expression
# sig slots must be contiguous: index = frame + base needs shot_{frame+base}; empty frames simply have no attribute linked
# review.poses carries shot_key = 2 (constant)
ac = bpy.data.actions['review.poses']; rig.animation_data.action = ac
pb.location = (2.0, 0, 0); pb.keyframe_insert('location', index=0, frame=1, group='shot_key')
rig.animation_data.action = None; poser.reset(); vl.update()
rep['driver'] = dr.expression; rep['slots'] = {f'{s[0]}:{s[1]}': i for s, i in index_of.items()}

# verify through the live stack: review shot via the action at its frame, sig shots via the poser with k=1 and the frame
check = {}
for s in SHOTS:
    if s[0] == 'review':
        rig.animation_data.action = ac; sc.frame_set(1 + 10 * REVIEW.index(s[1])); vl.update(); V = ev(); rig.animation_data.action = None
    else:
        set_shot(s); pb.location = (1.0, 0, 0); sc.frame_set(s[1]); vl.update(); V = ev(); pb.location = (0, 0, 0)
    check[f'{s[0]}:{s[1]}'] = dict(pairs=len(pairs_all(V)), driver_index=round(emp.evaluated_get(bpy.context.evaluated_depsgraph_get()).location[0], 2), err_mm=round(float(np.abs(V - (Pbase[s] + Dsh[s])).max()) * 1000, 3))
    print('LIVE', s, check[f'{s[0]}:{s[1]}'], flush=True)
rep['live_check'] = check
set_shot(('sig', 0)); poser.reset(); rig.animation_data.action = None; sc.frame_set(1); vl.update()
bpy.ops.wm.save_as_mainfile(filepath=OUTB)
Path(REPP).write_text(json.dumps(rep, indent=1)); print('SHOTSCULPT done', round(time.time() - t0), flush=True)
