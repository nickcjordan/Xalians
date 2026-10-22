"""B-sntv step 4: joint-angle-driven corrective shape keys, fitted only where the re-skin still leaves a defect.

blender -b --python reskin_corrective.py -- RIG_IN.blend PARAMS.json CFG.json RIG_OUT.blend REPORT.json

For every training pose (a review pose or a signature frame posed from the clip code) the defects are measured with the
audit's definitions (collapse: area < 30 % of rest; flip: normal against the dominant bone's rotated rest normal;
intersect: triangles of different dominant bones crossing). Each side (left, right, midline) with defects gets one
corrective:
  * region: the defect vertices grown over the surface (rings), feathered at its edge
  * target: the posed surface relaxed toward its rest edge lengths (position-based), with contacts pushed apart
    along their normals and a light smoothing; the region edge is held
  * the posed-space change is taken back to rest space through each vertex's skinning matrix, stored as a shape key,
    then refined against the evaluated result (armature + corrective smooth) in residual rounds
  * driver: pose-space kernel on the local rotations of the joints that carry the region (quaternion channels):
    1 at the training pose, 0 at rest and beyond 70 percent of the training angle away from it (product over joints)
All correctives are refitted in a second sweep with the others active, so overlapping kernels add up correctly.
"""
import bpy, sys, json, math, time
import numpy as np
from pathlib import Path
from mathutils import Vector, Quaternion
from mathutils.bvhtree import BVHTree

A = sys.argv[sys.argv.index('--') + 1:]
RIG_IN, PARP, CFGP, OUTB, REPP = A[:5]
CFG = json.load(open(CFGP))
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'animate'))
_argv = sys.argv; sys.argv = ['x', '--', str(Path(OUTB).parent / 'posetmp'), 'none']
import pose_rig as PR
import luceras_clips as LC
sys.argv = _argv

bpy.ops.wm.open_mainfile(filepath=RIG_IN)
sc = bpy.context.scene; vl = bpy.context.view_layer
rig = bpy.data.objects['luceras_rig']; rig['controls_enabled'] = 0.0; rig.animation_data_create(); rig.animation_data.action = None
body = bpy.data.objects['luceras_blockout']; me = body.data
poser = PR.Poser(rig)
params = json.loads(Path(PARP).read_text())
_, SIGFN, _, _, _ = LC.make_sig(params.get('sig.horns-first-descent', {}))
REVIEW = ['rest', 'crouch', 'leap', 'landing', 'head_left_up', 'tail_side_up', 'foreleg_step', 'breath_in']

me.calc_loop_triangles()
NT = len(me.loop_triangles); F = np.empty(NT * 3, np.int64); me.loop_triangles.foreach_get('vertices', F); F = F.reshape(-1, 3)
E = np.empty(len(me.edges) * 2, np.int64); me.edges.foreach_get('vertices', E); E = E.reshape(-1, 2)
NV = len(me.vertices)
gn = [g.name for g in body.vertex_groups]
deform = {b.name for b in rig.data.bones if b.use_deform}
W = np.zeros((NV, len(gn)), np.float32)
for v in me.vertices:
    for g in v.groups: W[v.index, g.group] = g.weight
Wd = W.copy()
for j, n in enumerate(gn):
    if n not in deform: Wd[:, j] = 0
DOM = Wd.argmax(1); TDOM = DOM[F[:, 0]]
deg = np.bincount(E.ravel(), minlength=NV).astype(float)
CO0 = np.empty(NV * 3); me.vertices.foreach_get('co', CO0); CO0 = CO0.reshape(-1, 3)


def set_pose(kind, val):
    rig.animation_data.action = None; poser.reset(); poser.pin_local = None
    if kind == 'review':
        rig.animation_data.action = bpy.data.actions['review.poses']; sc.frame_set(1 + 10 * REVIEW.index(val))
        # bake the channels into the pose so the action can be released (drivers read the channels either way)
        ch = {p.name: (p.location.copy(), p.rotation_quaternion.copy(), p.scale.copy()) for p in rig.pose.bones}
        rig.animation_data.action = None
        for nm, (l, q, s) in ch.items():
            p = rig.pose.bones[nm]; p.location = l; p.rotation_quaternion = q; p.scale = s
    elif kind == 'sig':
        poser.apply(SIGFN(val * 1000.0 / 30))
    vl.update()


def ev():
    dg = bpy.context.evaluated_depsgraph_get(); e = body.evaluated_get(dg); m = e.to_mesh()
    x = np.empty(len(m.vertices) * 3); m.vertices.foreach_get('co', x); e.to_mesh_clear(); return x.reshape(-1, 3)


def tri_geom(V):
    c = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]]); a = np.linalg.norm(c, axis=1)
    return a * 0.5, c / np.maximum(a, 1e-30)[:, None]


def skin_mats():
    out = np.tile(np.eye(4), (len(gn), 1, 1))
    for j, n in enumerate(gn):
        if n in rig.pose.bones: out[j] = np.array(rig.pose.bones[n].matrix @ rig.data.bones[n].matrix_local.inverted())
    return out


def vertex_lbs3(S):
    return np.einsum('vj,jab->vab', Wd, S[:, :3, :3])


def intersect_pairs(V, tris):
    if len(tris) == 0: return []
    t = BVHTree.FromPolygons(V.tolist(), F[tris].tolist(), all_triangles=True)
    out = []
    for p, q in t.overlap(t):
        if p >= q: continue
        a, b = tris[p], tris[q]
        if TDOM[a] == TDOM[b] or len(set(F[a]) & set(F[b])): continue
        out.append((a, b))
    return out


def all_bone_pairs(V):
    # the audit's intersect test: triangles of different dominant bones (sampled per bone pair via BVH per bone)
    trees = {}
    for j in np.unique(TDOM):
        ti = np.nonzero(TDOM == j)[0]; trees[j] = (BVHTree.FromPolygons(V.tolist(), F[ti].tolist(), all_triangles=True), ti, V[F[ti]].reshape(-1, 3).min(0), V[F[ti]].reshape(-1, 3).max(0))
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


set_pose(None, None); V0 = ev(); A0, N0 = tri_geom(V0); L0 = np.linalg.norm(V0[E[:, 0]] - V0[E[:, 1]], axis=1)


def defects(V):
    S = skin_mats(); A1, N1 = tri_geom(V)
    ratio = A1 / np.maximum(A0, 1e-14); valid = A0 > 1e-10
    Nr = np.einsum('tij,tj->ti', S[TDOM][:, :3, :3], N0); Nr /= np.maximum(np.linalg.norm(Nr, axis=1), 1e-30)[:, None]
    cf = valid & ((ratio < 0.30) | ((Nr * N1).sum(1) < 0))
    X = all_bone_pairs(V); xt = np.array(sorted({t for p in X for t in p}), dtype=np.int64)
    return cf, xt, len(X)


def grow(mask, rings):
    m = mask.copy(); dist = np.where(m, 0, 10 ** 6)
    for r in range(1, rings + 1):
        nb = np.zeros(NV, bool); nb[E[:, 0][m[E[:, 1]]]] = True; nb[E[:, 1][m[E[:, 0]]]] = True
        new = nb & ~m; dist[new] = r; m |= nb
    return m, dist


def nb_mean(X):
    t = np.zeros_like(X); np.add.at(t, E[:, 0], X[E[:, 1]]); np.add.at(t, E[:, 1], X[E[:, 0]])
    return t / deg[:, None]


def vnormals(V):
    _, n = tri_geom(V); a, _ = tri_geom(V); vn = np.zeros_like(V)
    for k in range(3): np.add.at(vn, F[:, k], n * a[:, None])
    return vn / np.maximum(np.linalg.norm(vn, axis=1), 1e-20)[:, None]


def relax(P, region_w, core_tris, its):
    X = P.copy(); act = region_w > 0
    em = act[E[:, 0]] & act[E[:, 1]]; Ei = E[em]; Li = L0[em]
    tris_in = np.nonzero(act[F].all(1))[0]
    push_log = []
    for it in range(its):
        d = X[Ei[:, 1]] - X[Ei[:, 0]]; L = np.linalg.norm(d, axis=1)
        corr = ((L - Li) / np.maximum(L, 1e-12))[:, None] * d * 0.5
        acc = np.zeros_like(X); cnt = np.zeros(NV)
        np.add.at(acc, Ei[:, 0], corr); np.add.at(acc, Ei[:, 1], -corr); np.add.at(cnt, Ei.ravel(), 1)
        step = acc / np.maximum(cnt, 1)[:, None]
        X += CFG.get('pbd_rate', 0.8) * region_w[:, None] * step
        X += CFG.get('smooth_rate', 0.05) * region_w[:, None] * (nb_mean(X) - X)
        if it % CFG.get('contact_every', 20) == 0 or it == its - 1:
            pairs = intersect_pairs(X, tris_in)
            push_log.append(len(pairs))
            if pairs:
                vn = vnormals(X); vs = np.unique(np.array([F[a] for a, b in pairs] + [F[b] for a, b in pairs]).ravel())
                vs = vs[region_w[vs] > 0]
                X[vs] -= vn[vs] * CFG.get('contact_push', 0.0008)
    return X, push_log


def driver_bones(region_mask):
    mass = Wd[region_mask].sum(0); order = np.argsort(-mass); out = []
    for j in order:
        n = gn[j]
        if mass[j] < 0.03 * region_mask.sum(): break
        if n in ('root', 'spine_01') or n.startswith('scapula') or n not in rig.pose.bones: continue
        q = rig.pose.bones[n].rotation_quaternion
        ang = 2 * math.degrees(math.acos(min(1.0, abs(q.w))))
        if ang < CFG.get('min_driver_deg', 6.0): continue
        out.append((n, tuple(q), ang))
        if len(out) >= CFG.get('max_driver_bones', 3): break
    return out


def add_driver(key, bones):
    """Simple-expression driver (no Python needed, under Blender's 256-character limit): per joint a clamped
    quaternion-dot kernel, multiplied over the joints."""
    fc = key.driver_add('value'); dr = fc.driver; dr.type = 'SCRIPTED'
    for v in list(dr.variables): dr.variables.remove(v)
    terms = []; letters = 'abcdefghijkl'
    for bi, (n, qt, ang) in enumerate(bones):
        parts = []
        for k in range(4):
            if abs(qt[k]) < 5e-4: continue
            nm = letters[bi * 4 + k]
            v = dr.variables.new(); v.name = nm; v.type = 'SINGLE_PROP'
            v.targets[0].id = rig; v.targets[0].data_path = f'pose.bones["{n}"].rotation_quaternion[{k}]'
            parts.append(f'{nm}*{qt[k]:.4f}')
        d0 = math.cos(math.radians(CFG.get('kernel_frac', 0.7) * ang) / 2)
        terms.append(f'max(0,min(1,(abs({"+".join(parts)})-{d0:.4f})/{1 - d0:.4f}))'.replace('+-', '-'))
    dr.expression = '*'.join(terms)
    assert len(dr.expression) < 250, dr.expression
    for m in list(fc.modifiers): fc.modifiers.remove(m)
    return dr.expression


def components(mask):
    lab = np.where(mask, np.arange(NV), NV + 1)
    em = mask[E[:, 0]] & mask[E[:, 1]]; Ee = E[em]
    for _ in range(2000):
        a, b = lab[Ee[:, 0]], lab[Ee[:, 1]]; m = np.minimum(a, b); old = lab.copy()
        np.minimum.at(lab, Ee[:, 0], m); np.minimum.at(lab, Ee[:, 1], m)
        ok = lab <= NV; lab[ok] = lab[lab[ok]]
        if np.array_equal(old, lab): break
    return lab


if not me.shape_keys: body.shape_key_add(name='Basis', from_mix=False)
KB = me.shape_keys.key_blocks
report = {'correctives': [], 'before': {}, 'after': {}}
trainings = [(t[0], t[1]) for t in CFG['train']]
specs = []   # (key name, kind, val, region_mask, region_w, bones)

# ---------------------------------------------------------------------------------------------- sweep 1: create
for kind, val in trainings:
    set_pose(kind, val); P = ev(); cf, xt, npairs = defects(P)
    report['before'][f'{kind}:{val}'] = dict(collapse_or_flip=int(cf.sum()), intersect_pairs=npairs)
    bad = np.zeros(NV, bool); bad[F[cf].ravel()] = True; bad[F[xt].ravel()] = True
    print('TRAIN', kind, val, int(cf.sum()), npairs, flush=True)
    core_all = bad.copy()
    reg_all, _ = grow(core_all, CFG.get('rings', 14))
    lab = components(reg_all)
    for ci, c in enumerate(np.unique(lab[reg_all])):
        comp = reg_all & (lab == c); core = core_all & comp
        if core.sum() < CFG.get('min_core', 6): continue
        reg, dist = grow(core, CFG.get('rings', 14)); reg &= comp | ~reg_all
        fe = CFG.get('feather', 6); R = CFG.get('rings', 14)
        rw = np.clip((R - dist) / fe, 0, 1) * reg
        bones = driver_bones(core)
        if not bones: continue
        cx = float(CO0[core, 0].mean()); side = 'l' if cx > 0.01 else 'r' if cx < -0.01 else 'm'
        name = f'CR_{kind}_{val}_{side}{ci}'[:60]
        k = body.shape_key_add(name=name, from_mix=False); k.slider_min = 0; k.slider_max = 1
        expr = add_driver(k, bones)
        specs.append(dict(name=name, kind=kind, val=val, reg=reg, rw=rw, bones=bones, expr=expr, core=int(core.sum()), region=int(reg.sum())))
        print('  CR', name, int(core.sum()), int(reg.sum()), [(b[0], round(b[2], 1)) for b in bones], flush=True)


def fit(spec, rounds):
    set_pose(spec['kind'], spec['val']); vl.update()
    k = KB[spec['name']]
    P = ev(); X, plog = relax(P, spec['rw'], None, CFG.get('iterations', 160))
    reg = spec['reg']; idx = np.nonzero(reg)[0]
    S = skin_mats(); M = vertex_lbs3(S)[idx]; Minv = np.linalg.inv(M)
    kd = np.empty(NV * 3); k.data.foreach_get('co', kd); kd = kd.reshape(-1, 3)
    val = k.value if k.value > 1e-3 else 1.0
    res_log = []
    for r in range(rounds):
        D = (X - P)[idx]
        kd[idx] += np.einsum('vab,vb->va', Minv, D) / val
        k.data.foreach_set('co', kd.ravel()); me.update(); vl.update()
        val = max(k.value, 1e-3)
        P = ev(); res_log.append(float(np.abs(X[idx] - P[idx]).max() * 1000))
    return dict(relax_contacts=plog, residual_mm=res_log, value_at_train=round(float(k.value), 3))


for sweep in range(CFG.get('sweeps', 2)):
    for sp in specs:
        info = fit(sp, CFG.get('rounds', 3)); sp.setdefault('fit', []).append(info)
        print('FIT', sweep, sp['name'], info['value_at_train'], [round(x, 1) for x in info['residual_mm']], info['relax_contacts'][-1:], flush=True)

for kind, val in trainings:
    set_pose(kind, val); P = ev(); cf, xt, npairs = defects(P)
    report['after'][f'{kind}:{val}'] = dict(collapse_or_flip=int(cf.sum()), intersect_pairs=npairs)
    print('AFTER', kind, val, int(cf.sum()), npairs, flush=True)
set_pose(None, None)
rest_ok = float(np.abs(ev() - V0).max() * 1000); report['rest_change_mm'] = rest_ok
for sp in specs:
    report['correctives'].append(dict(name=sp['name'], trained_on=f"{sp['kind']} {sp['val']}", core_vertices=sp['core'], region_vertices=sp['region'],
                                      driver_bones=[(b[0], round(b[2], 1)) for b in sp['bones']], driver_expression=sp['expr'], fit=sp.get('fit')))
rig.animation_data.action = None; poser.reset(); vl.update()
bpy.ops.wm.save_as_mainfile(filepath=OUTB)
Path(REPP).write_text(json.dumps(report, indent=1, default=str))
print('CORRECTIVE done rest_change_mm', rest_ok, flush=True)
