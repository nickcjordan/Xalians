"""B-sntv pass 2: contact correctives fitted on the final deformed surface (after armature, DQ blend and corrective smooth).

blender -b --python reskin_contact.py -- RIG_IN.blend PARAMS.json CFG.json RIG_OUT.blend REPORT.json

Pass 1 showed that shape keys (applied before the armature) are smoothed back out by the corrective smooth. Here each
corrective is a Displace modifier placed AFTER the corrective smooth: it moves the evaluated surface along its own
normal, with a per-vertex amount stored in a vertex group and a strength driven by the joint angles (pose-space kernel
on the quaternion channels of the joints that carry the region, 1 at the training pose, 0 at rest and beyond 70 percent
of the training angle away). Because the normal comes from the deformed surface, the push follows the pose.

Fitting, per training pose (review poses and signature frames posed from the clip code), on the evaluated mesh:
  * find intersecting triangle pairs with the audit's definition (different dominant bones, no shared vertex)
  * grow a working region around them; push the contact vertices inward along their normals in 0.4 mm steps,
    smoothing the push field after each step so it stays a soft dent, until the region has no intersection
  * split the push field into connected parts; each part becomes one vertex group + one Displace modifier + one driver
  * re-evaluate with the drivers live; repeat (up to ROUNDS) while the pose still intersects
"""
import bpy, sys, json, math
import numpy as np
from pathlib import Path
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
REVIEW = CFG['pose_order']

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
V2T = [[] for _ in range(NV)]


def set_pose(kind, val):
    rig.animation_data.action = None; poser.reset(); poser.pin_local = None
    if kind == 'review':
        rig.animation_data.action = bpy.data.actions['review.poses']; sc.frame_set(1 + 10 * REVIEW.index(val))
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


def vnormals(V):
    c = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]]); vn = np.zeros_like(V)
    for k in range(3): np.add.at(vn, F[:, k], c)
    return vn / np.maximum(np.linalg.norm(vn, axis=1), 1e-20)[:, None]


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


def pairs_sub(V, tris):
    t = BVHTree.FromPolygons(V.tolist(), F[tris].tolist(), all_triangles=True); out = set()
    for p, q in t.overlap(t):
        a, b = int(tris[p]), int(tris[q])
        if a >= b or TDOM[a] == TDOM[b] or len(set(F[a]) & set(F[b])): continue
        out.add((a, b))
    return out


def grow(mask, rings):
    m = mask.copy()
    for _ in range(rings):
        nb = np.zeros(NV, bool); nb[E[:, 0][m[E[:, 1]]]] = True; nb[E[:, 1][m[E[:, 0]]]] = True; m |= nb
    return m


def nbm(x):
    t = np.zeros_like(x); np.add.at(t, E[:, 0], x[E[:, 1]]); np.add.at(t, E[:, 1], x[E[:, 0]]); return t / deg


def components(mask):
    lab = np.where(mask, np.arange(NV), NV + 1); em = mask[E[:, 0]] & mask[E[:, 1]]; Ee = E[em]
    for _ in range(3000):
        a, b = lab[Ee[:, 0]], lab[Ee[:, 1]]; m = np.minimum(a, b); old = lab.copy()
        np.minimum.at(lab, Ee[:, 0], m); np.minimum.at(lab, Ee[:, 1], m)
        ok = lab <= NV; lab[ok] = lab[lab[ok]]
        if np.array_equal(old, lab): break
    return lab


def driver_bones(core):
    mass = Wd[core].sum(0); order = np.argsort(-mass); out = []
    for j in order:
        n = gn[j]
        if mass[j] < 0.03 * core.sum(): break
        if n in ('root', 'spine_01') or n.startswith('scapula') or n not in rig.pose.bones: continue
        q = rig.pose.bones[n].rotation_quaternion; ang = 2 * math.degrees(math.acos(min(1.0, abs(q.w))))
        if ang < CFG.get('min_driver_deg', 6.0): continue
        out.append((n, tuple(q), ang))
        if len(out) >= CFG.get('max_driver_bones', 3): break
    return out


def add_mod(name, wv, amount, bones):
    vg = body.vertex_groups.new(name=name)
    q = np.round(np.clip(wv, 0, 1) * 1024).astype(int)
    for v in np.unique(q):
        if v > 0: vg.add(np.nonzero(q == v)[0].tolist(), v / 1024.0, 'REPLACE')
    md = body.modifiers.new(name, 'DISPLACE'); md.direction = 'NORMAL'; md.mid_level = 0.0; md.vertex_group = name
    md.space = 'LOCAL'; md.strength = amount
    fc = body.driver_add(f'modifiers["{name}"].strength'); dr = fc.driver; dr.type = 'SCRIPTED'
    for v in list(dr.variables): dr.variables.remove(v)
    terms = []; letters = 'abcdefghijkl'
    for bi, (n, qt, ang) in enumerate(bones):
        parts = []
        for k in range(4):
            if abs(qt[k]) < 5e-4: continue
            nm = letters[bi * 4 + k]; v = dr.variables.new(); v.name = nm; v.type = 'SINGLE_PROP'
            v.targets[0].id = rig; v.targets[0].data_path = f'pose.bones["{n}"].rotation_quaternion[{k}]'; parts.append(f'{nm}*{qt[k]:.4f}')
        d0 = math.cos(math.radians(CFG.get('kernel_frac', 0.7) * ang) / 2)
        terms.append(f'max(0,min(1,(abs({"+".join(parts)})-{d0:.4f})/{1 - d0:.4f}))'.replace('+-', '-'))
    dr.expression = f'{amount:.5f}*' + '*'.join(terms)
    assert len(dr.expression) < 250, dr.expression
    for m in list(fc.modifiers): fc.modifiers.remove(m)
    return dr.expression


report = {'before': {}, 'after': {}, 'correctives': []}
trainings = [tuple(t) for t in CFG['train']]
count = 0


# ------------------------------------------------------------------ stage 1: crease smoothing correctives (pass 2)
# A fold that crosses itself (upper arm skin over forearm skin in a tight elbow, gaskin over rump) cannot be pushed apart
# along normals; it has to be unfolded. Each crease region gets a Smooth modifier after the corrective smooth, masked
# by a feathered vertex group, its factor driven by the joint-angle kernel (0 at rest, so rest and detail elsewhere
# are untouched). Factor and iterations are chosen per region by measuring the region's defects at the training pose.
def tri_geom(V):
    c = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]]); a = np.linalg.norm(c, axis=1)
    return a * 0.5, c / np.maximum(a, 1e-30)[:, None]


def skin_mats():
    out = np.tile(np.eye(4), (len(gn), 1, 1))
    for j, n in enumerate(gn):
        if n in rig.pose.bones: out[j] = np.array(rig.pose.bones[n].matrix @ rig.data.bones[n].matrix_local.inverted())
    return out


set_pose(None, None); V0 = ev(); A0, N0 = tri_geom(V0)
HEADM = sum(Wd[:, gn.index(n)] for n in ('head_01', 'jaw_01', 'ear_l_01', 'ear_r_01') if n in gn) > 0.5


def cf_mask(V):
    S = skin_mats(); A1, N1 = tri_geom(V); ratio = A1 / np.maximum(A0, 1e-14)
    Nr = np.einsum('tij,tj->ti', S[TDOM][:, :3, :3], N0); Nr /= np.maximum(np.linalg.norm(Nr, axis=1), 1e-30)[:, None]
    return (A0 > 1e-10) & ((ratio < 0.30) | ((Nr * N1).sum(1) < 0))


def kernel_expr(dr, bones, scale):
    for v in list(dr.variables): dr.variables.remove(v)
    terms = []; letters = 'abcdefghijkl'
    for bi, (n, qt, ang) in enumerate(bones):
        parts = []
        for k in range(4):
            if abs(qt[k]) < 5e-4: continue
            nm = letters[bi * 4 + k]; v = dr.variables.new(); v.name = nm; v.type = 'SINGLE_PROP'
            v.targets[0].id = rig; v.targets[0].data_path = f'pose.bones["{n}"].rotation_quaternion[{k}]'; parts.append(f'{nm}*{qt[k]:.4f}')
        d0 = math.cos(math.radians(CFG.get('kernel_frac', 0.7) * ang) / 2)
        terms.append(f'max(0,min(1,(abs({"+".join(parts)})-{d0:.4f})/{1 - d0:.4f}))'.replace('+-', '-'))
    dr.expression = f'{scale:.4f}*' + '*'.join(terms)
    assert len(dr.expression) < 250, dr.expression


if CFG.get('smooth_stage', True):
    for kind, val in trainings:
        set_pose(kind, val); P = ev(); cf = cf_mask(P); X = pairs_all(P)
        report['before'][f'{kind}:{val}'] = dict(pairs=len(X), cf=int(cf.sum()))
        core = np.zeros(NV, bool); core[F[cf].ravel()] = True
        if X: core[F[np.array(sorted({t for p in X for t in p}))].ravel()] = True
        print('SPOSE', kind, val, 'pairs', len(X), 'cf', int(cf.sum()), flush=True)
        if core.sum() < 6: continue
        reg = grow(core, CFG.get('s_rings', 8)) & ~HEADM; lab = components(reg)   # the rigid head is never smoothed
        for c in np.unique(lab[reg]):
            comp = reg & (lab == c); cc = comp & core
            if cc.sum() < CFG.get('min_core', 6): continue
            bones = driver_bones(cc)
            if not bones: continue
            w = comp.astype(float)
            for _ in range(CFG.get('s_feather', 4)): w = np.where(grow(comp, 0), 0.5 * w + 0.5 * nbm(w), 0)
            w = np.clip(w * 1.5, 0, 1) * comp
            name = f'CS_{kind}_{val}_{count:03d}'[:60]; count += 1
            vg = body.vertex_groups.new(name=name); q = np.round(w * 1024).astype(int)
            for v in np.unique(q):
                if v > 0: vg.add(np.nonzero(q == v)[0].tolist(), v / 1024.0, 'REPLACE')
            md = body.modifiers.new(name, 'SMOOTH'); md.vertex_group = name; md.use_x = md.use_y = md.use_z = True
            tris_c = np.nonzero(comp[F].all(1))[0]
            def score():
                V = ev(); return int(cf_mask(V)[tris_c].sum()) + 3 * len(pairs_sub(V, tris_c))
            md.factor = 0.0; md.iterations = 1; base = score(); best = (base, 0.0, 1)
            for fac, its in CFG.get('s_grid', [[0.5, 5], [0.5, 15], [0.8, 30], [1.0, 60]]):
                md.factor = fac; md.iterations = its; sc_ = score()
                if sc_ < best[0]: best = (sc_, fac, its)
            if best[1] == 0.0:
                body.modifiers.remove(md); body.vertex_groups.remove(vg); print('  CS none helps', name, base, flush=True); continue
            md.iterations = best[2]; md.factor = best[1]
            fc = body.driver_add(f'modifiers["{name}"].factor'); kernel_expr(fc.driver, bones, best[1]); fc.driver.type = 'SCRIPTED'
            for m in list(fc.modifiers): fc.modifiers.remove(m)
            report['correctives'].append(dict(kind='smooth', name=name, trained_on=f'{kind} {val}', vertices=int(comp.sum()), factor=best[1], iterations=best[2],
                                              score_before=base, score_after=best[0], driver_bones=[(b[0], round(b[2], 1)) for b in bones], driver_expression=fc.driver.expression))
            print('  CS', name, int(comp.sum()), 'score', base, '->', best[0], best[1:], [b[0] for b in bones], flush=True)
    vl.update()


if not CFG.get('displace_stage', True): trainings_d = []
else: trainings_d = trainings
for kind, val in trainings_d:
    for rnd in range(CFG.get('rounds', 3)):
        set_pose(kind, val); P = ev(); X = pairs_all(P)
        if rnd == 0: report.setdefault('before_displace', {})[f'{kind}:{val}'] = len(X)
        print('POSE', kind, val, 'round', rnd, 'pairs', len(X), flush=True)
        if not X: break
        core = np.zeros(NV, bool); core[F[np.array(sorted({t for p in X for t in p}))].ravel()] = True
        reg = grow(core, CFG.get('rings', 25)); tris = np.nonzero(reg[F].all(1))[0]
        vn = vnormals(P); d = np.zeros(NV); best = (len(pairs_sub(P, tris)), d.copy()); cap = CFG.get('max_depth', 0.012)
        for it in range(CFG.get('iterations', 30)):
            Q = P + d[:, None] * vn; Xs = pairs_sub(Q, tris)
            if len(Xs) < best[0]: best = (len(Xs), d.copy())
            if not Xs: break
            # penetration of each vertex behind the other triangle's plane (outward normals), half to each side
            Tn = np.cross(Q[F[:, 1]] - Q[F[:, 0]], Q[F[:, 2]] - Q[F[:, 0]])
            Tn /= np.maximum(np.linalg.norm(Tn, axis=1), 1e-20)[:, None]; Tc = Q[F].mean(1)
            push = np.zeros(NV)
            for a, b in Xs:
                for t, o in ((a, b), (b, a)):
                    sd = (Q[F[t]] - Tc[o]) @ Tn[o]
                    for vi, sv in zip(F[t], sd):
                        if sv < 0: push[vi] = min(push[vi], 0.5 * sv - 0.0002)
                    if (sd >= 0).all():   # crossing by an edge only: nudge the whole triangle a little
                        for vi in F[t]: push[vi] = min(push[vi], -0.0003)
            d = np.maximum(d + push, -cap)
            for _ in range(3): d = np.where(reg, np.minimum(d, 0.7 * nbm(d)), 0.0)   # spread the dent smoothly, never shallower at the contact
        if best[0] < len(pairs_sub(P + d[:, None] * vn, tris)): d = best[1]
        left = len(pairs_sub(P + d[:, None] * vn, tris)); start = len(pairs_sub(P, tris))
        if left >= start:
            print('  no gain, round skipped', start, left, flush=True); break
        dm = d < -2e-5; lab = components(dm)
        for c in np.unique(lab[dm]):
            comp = dm & (lab == c)
            if comp.sum() < 4: continue
            bones = driver_bones(comp & core) or driver_bones(comp)
            if not bones: continue
            amt = float(d[comp].min()); wv = np.where(comp, d / amt, 0.0)
            name = f'CD_{kind}_{val}_{count:03d}'[:60]; count += 1
            expr = add_mod(name, wv, amt, bones)
            report['correctives'].append(dict(name=name, trained_on=f'{kind} {val}', round=rnd, vertices=int(comp.sum()), depth_mm=round(-amt * 1000, 2),
                                              driver_bones=[(b[0], round(b[2], 1)) for b in bones], driver_expression=expr))
            print('  CD', name, int(comp.sum()), round(-amt * 1000, 2), [b[0] for b in bones], flush=True)
        print('  iterations', it, 'left in region', left, flush=True)
# ------------------------------------------------------------------ stage 3: contact hooks (pass 2)
# Forearm skin that sits inside the chest wall (folded forelegs at the apex and the hit, the old deep crouch) is a deep
# overlap between two separate surfaces: pushing each along its own normal makes it worse. Here the chest skin at the
# contact is moved into the chest and the limb skin away from it, along the chest's mean normal, by a Hook modifier
# after the smooth. The hook target is a non-deform helper bone under the root whose location channel is driven by
# the joint-angle kernel (zero at rest). Offsets are found by a line search on the pose's intersection count.
def kernel_terms(dr, bones):
    for v in list(dr.variables): dr.variables.remove(v)
    terms = []; letters = 'abcdefghijkl'
    for bi, (n, qt, ang) in enumerate(bones):
        parts = []
        for k in range(4):
            if abs(qt[k]) < 5e-4: continue
            nm = letters[bi * 4 + k]; v = dr.variables.new(); v.name = nm; v.type = 'SINGLE_PROP'
            v.targets[0].id = rig; v.targets[0].data_path = f'pose.bones["{n}"].rotation_quaternion[{k}]'; parts.append(f'{nm}*{qt[k]:.4f}')
        d0 = math.cos(math.radians(CFG.get('kernel_frac', 0.7) * ang) / 2)
        terms.append(f'max(0,min(1,(abs({"+".join(parts)})-{d0:.4f})/{1 - d0:.4f}))'.replace('+-', '-'))
    return '*'.join(terms)


def new_hook_bone(name):
    bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='EDIT')
    b = rig.data.edit_bones.new(name); b.head = (0, 0, 0); b.tail = (0, 0, 0.02); b.parent = rig.data.edit_bones['root']; b.use_deform = False
    bpy.ops.object.mode_set(mode='OBJECT')
    rig.data.bones[name]['sprite_only'] = True; rig.data.bones[name]['role'] = 'B-sntv pass 2 contact hook (driven location, zero at rest)'
    pb = rig.pose.bones[name]; pb.rotation_mode = 'QUATERNION'; return pb


if CFG.get('hook_stage', False):
    SPINE = {gn.index(n) for n in gn if n.startswith(('spine_', 'scapula', 'neck_'))}
    for kind, val in CFG.get('hook_train', []):
        kind, val = kind, (int(val) if kind == 'sig' else val)
        set_pose(kind, val); P = ev(); X = pairs_all(P)
        print('HPOSE', kind, val, 'pairs', len(X), flush=True)
        if not X: continue
        Tn = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]]); Tn /= np.maximum(np.linalg.norm(Tn, axis=1), 1e-20)[:, None]
        for side, sg in (('l', 1), ('r', -1)):
            XS = [(a, b) for a, b in X if sg * P[F[a]].mean(0)[0] > 0]
            if len(XS) < 3: continue
            ch, lb = set(), set()
            for a, b in XS:
                for t in (a, b): (ch if DOM[F[t, 0]] in SPINE else lb).add(t)
            if not ch or not lb: continue
            ch = np.array(sorted(ch)); lb = np.array(sorted(lb))
            nrm = Tn[ch].mean(0); nrm /= np.linalg.norm(nrm)
            cm = np.zeros(NV, bool); cm[F[ch].ravel()] = True; lm = np.zeros(NV, bool); lm[F[lb].ravel()] = True
            def fall(m, rings):
                w = m.astype(float)
                for _ in range(rings): w = np.maximum(w, 0.85 * nbm(w))
                for _ in range(4): w = 0.5 * w + 0.5 * nbm(w)
                return np.clip(w * 1.3, 0, 1)
            wc = fall(cm, CFG.get('hook_rings', 14)) * (~HEADM); wl = fall(lm, CFG.get('hook_rings', 14)) * (~HEADM)
            hooks = []
            for tag, w, sgn, share in (('c', wc, -1.0, CFG.get('hook_chest_share', 0.65)), ('l', wl, 1.0, 1 - CFG.get('hook_chest_share', 0.65))):
                name = f'CH_{kind}_{val}_{side}{tag}'[:60]
                pb = new_hook_bone(name)
                vg = body.vertex_groups.new(name=name); q = np.round(w * 1024).astype(int)
                for v in np.unique(q):
                    if v > 0: vg.add(np.nonzero(q == v)[0].tolist(), v / 1024.0, 'REPLACE')
                md = body.modifiers.new(name, 'HOOK'); md.object = rig; md.subtarget = name; md.vertex_group = name; md.falloff_type = 'NONE'; md.strength = 1.0
                vl.update(); md.matrix_inverse = (rig.matrix_world @ rig.pose.bones[name].matrix).inverted()
                hooks.append((pb, sgn * share, name, md))
            region = grow(cm | lm, CFG.get('hook_rings', 14) + 4); tris = np.nonzero(region[F].all(1))[0]
            start = len(pairs_sub(P, tris)); best = (start, 0.0)
            for smm in CFG.get('hook_steps', [3, 6, 9, 12, 16, 20, 25, 30, 36]):
                for pb, k, _, _ in hooks: pb.location = tuple(nrm * smm / 1000.0 * k)
                vl.update(); Q = ev(); c = len(pairs_sub(Q, tris))
                if c < best[0]: best = (c, smm)
                if c == 0: break
            print('  HOOK', kind, val, side, 'region pairs', start, '->', best[0], 'at', best[1], 'mm', flush=True)
            if best[1] == 0.0:
                for pb, k, name, md in hooks: pb.location = (0, 0, 0); md.strength = 0.0
                continue
            bones = driver_bones(cm | lm)
            for pb, k, name, md in hooks:
                off = nrm * best[1] / 1000.0 * k
                pb.location = (0, 0, 0)
                for ax in range(3):
                    fc = pb.driver_add('location', ax); dr = fc.driver; dr.type = 'SCRIPTED'
                    expr = kernel_terms(dr, bones)
                    # the location channel is in the bone's own axes (rest = identity under the root, so armature axes)
                    dr.expression = f'{off[ax]:.5f}*' + expr; assert len(dr.expression) < 250
                    for m in list(fc.modifiers): fc.modifiers.remove(m)
                report['correctives'].append(dict(kind='hook', name=name, trained_on=f'{kind} {val}', side=side, offset_mm=round(best[1] * k, 2),
                                                  direction=[round(float(x), 3) for x in nrm * np.sign(k)], vertices=int((body.vertex_groups[name].index >= 0) and 0),
                                                  region_pairs_before=start, region_pairs_after=best[0], driver_bones=[(b[0], round(b[2], 1)) for b in bones]))
            vl.update()


for kind, val in trainings:
    set_pose(kind, val); V = ev(); X = pairs_all(V); cfn = int(cf_mask(V).sum()); report['after'][f'{kind}:{val}'] = dict(pairs=len(X), cf=cfn); print('AFTER', kind, val, len(X), cfn, flush=True)
set_pose(None, None); rig.animation_data.action = None; poser.reset(); vl.update()
bpy.ops.wm.save_as_mainfile(filepath=OUTB)
Path(REPP).write_text(json.dumps(report, indent=1))
print('CONTACT done', len(report['correctives']), flush=True)
