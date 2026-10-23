"""B-sntv pass 6: joint-angle driven correctives (deep-flexion smooth at the stifle, hock, carpus, flank).

blender -b --python reskin_anglecorr.py -- RIG_IN.blend PARAMS.json CFG.json RIG_OUT.blend REPORT.json

Each corrective is a Smooth modifier after the corrective smooth (and before any ShotSculpt), masked by a feathered
vertex group around a joint band (vertices carried by both bones of the joint), with its factor driven by the flexion
angle of the driving bone (its rotation away from rest): 0 below deg[0], full at deg[1] and beyond, a smooth ramp
between. A rolled or creased fold at the joint is unfolded only when the joint is deeply flexed; rest and mild poses
are untouched. Factor and iterations are picked from a grid by the collapse/flip and crossing count in the region at
the training poses (the same measures as the audit).

CFG: {"pose_order": [...], "correctives": [{"name", "bones": [a, b], "band": 0.12, "rings": 6, "feather": 4,
       "drive": bone, "deg": [d0, d1], "grid": [[factor, iterations], ...], "train": [["review", pose] | ["sig", frame]],
       "extra_bones": [...optional bones whose dominant skin within the grown band is included]}]}
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
NV = len(me.vertices); deg = np.bincount(E.ravel(), minlength=NV).astype(float)
gn = [g.name for g in body.vertex_groups]
deform = {b.name for b in rig.data.bones if b.use_deform}
Wd = np.zeros((NV, len(gn)), np.float32)
for v in me.vertices:
    for g in v.groups:
        if gn[g.group] in deform: Wd[v.index, g.group] = g.weight
DOM = Wd.argmax(1); TDOM = DOM[F[:, 0]]


def ev():
    dg = bpy.context.evaluated_depsgraph_get(); e = body.evaluated_get(dg); m = e.to_mesh()
    x = np.empty(len(m.vertices) * 3); m.vertices.foreach_get('co', x); e.to_mesh_clear(); return x.reshape(-1, 3)


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
    if 'shot_key' in rig.pose.bones: rig.pose.bones['shot_key'].location = (0, 0, 0)
    vl.update()


def grow(mask, rings):
    m = mask.copy()
    for _ in range(rings):
        nb = np.zeros(NV, bool); nb[E[:, 0][m[E[:, 1]]]] = True; nb[E[:, 1][m[E[:, 0]]]] = True; m |= nb
    return m


def nbm(x):
    t = np.zeros_like(x); np.add.at(t, E[:, 0], x[E[:, 1]]); np.add.at(t, E[:, 1], x[E[:, 0]]); return t / deg


def tri_geom(V):
    c = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]]); a = np.linalg.norm(c, axis=1)
    return a * 0.5, c / np.maximum(a, 1e-30)[:, None]


def skin_mats():
    out = np.tile(np.eye(4), (len(gn), 1, 1))
    for j, n in enumerate(gn):
        if n in rig.pose.bones: out[j] = np.array(rig.pose.bones[n].matrix @ rig.data.bones[n].matrix_local.inverted())
    return out


set_pose(None, None); V0 = ev(); A0, N0 = tri_geom(V0)


def cf_mask(V):
    S = skin_mats(); A1, N1 = tri_geom(V); ratio = A1 / np.maximum(A0, 1e-14)
    Nr = np.einsum('tij,tj->ti', S[TDOM][:, :3, :3], N0); Nr /= np.maximum(np.linalg.norm(Nr, axis=1), 1e-30)[:, None]
    return (A0 > 1e-10) & ((ratio < 0.30) | ((Nr * N1).sum(1) < 0))


def pairs_sub(V, tris):
    t = BVHTree.FromPolygons(V.tolist(), F[tris].tolist(), all_triangles=True); out = 0
    for p, q in t.overlap(t):
        a, b = int(tris[p]), int(tris[q])
        if a >= b or TDOM[a] == TDOM[b] or len(set(F[a]) & set(F[b])): continue
        out += 1
    return out


def roughness(V, tris):
    # mean dihedral bend across the region's interior edges (a rolled or creased fold scores high)
    _, N = tri_geom(V); return float(np.mean(1 - (N[tris] * nbm_t(N, tris)).sum(1)))


def nbm_t(N, tris):
    # mean normal of the triangles sharing a vertex with each triangle (vertex-averaged normals)
    vn = np.zeros((NV, 3)); A_, _ = tri_geom(V0)
    for k in range(3): np.add.at(vn, F[:, k], N)
    vn /= np.maximum(np.linalg.norm(vn, axis=1), 1e-20)[:, None]
    m = vn[F[tris]].mean(1); return m / np.maximum(np.linalg.norm(m, axis=1), 1e-20)[:, None]


rep = dict(config=CFG, correctives=[])
ss = body.modifiers.find('ShotSculpt')
for c in CFG['correctives']:
    ja, jb = gn.index(c['bones'][0]), gn.index(c['bones'][1])
    band = (Wd[:, ja] > c.get('band', 0.12)) & (Wd[:, jb] > c.get('band', 0.12))
    if band.sum() < 4:
        print('AC empty band', c['name'], flush=True); rep['correctives'].append(dict(name=c['name'], kept=False, reason='empty band')); continue
    reg = grow(band, c.get('rings', 6))
    allowed = np.isin(DOM, [gn.index(b) for b in c['bones'] + c.get('extra_bones', [])])
    reg &= allowed
    w = reg.astype(float)
    for _ in range(c.get('feather', 4)): w = np.where(grow(reg, 0), 0.5 * w + 0.5 * nbm(w), 0)
    w = np.clip(w * 1.6, 0, 1) * reg
    name = f"AC_{c['name']}"
    vg = body.vertex_groups.new(name=name); q = np.round(w * 1024).astype(int)
    for v in np.unique(q):
        if v > 0: vg.add(np.nonzero(q == v)[0].tolist(), v / 1024.0, 'REPLACE')
    md = body.modifiers.new(name, 'SMOOTH'); md.vertex_group = name; md.use_x = md.use_y = md.use_z = True
    ss = body.modifiers.find('ShotSculpt')
    if ss >= 0: body.modifiers.move(body.modifiers.find(name), ss)
    tris = np.nonzero(reg[F].all(1))[0]
    md.factor = 0.0; md.iterations = 1
    base = {}
    for kind, val in c['train']:
        set_pose(kind, val); V = ev(); base[f'{kind}:{val}'] = (int(cf_mask(V)[tris].sum()), pairs_sub(V, tris), roughness(V, tris))
    def total(fac, its):
        md.factor = fac; md.iterations = its; out = {}
        for kind, val in c['train']:
            set_pose(kind, val); V = ev(); out[f'{kind}:{val}'] = (int(cf_mask(V)[tris].sum()), pairs_sub(V, tris), roughness(V, tris))
        return out
    def score(d): return sum(a + 3 * b + 2000 * r for a, b, r in d.values())
    best = (score(base), 0.0, 1, base)
    for fac, its in c.get('grid', [[0.5, 10], [0.8, 20], [1.0, 40]]):
        d = total(fac, its); s_ = score(d)
        print('  grid', name, fac, its, round(s_, 1), flush=True)
        if s_ < best[0]: best = (s_, fac, its, d)
    if best[1] == 0.0 and not c.get('force'):
        body.modifiers.remove(md); body.vertex_groups.remove(vg); print('AC none helps', name, flush=True)
        rep['correctives'].append(dict(name=name, kept=False, before=base)); continue
    if c.get('force'): best = (None, c['force'][0], c['force'][1], total(*c['force']))
    md.factor = best[1]; md.iterations = best[2]
    d0, d1 = c['deg']; w0, w1 = math.cos(math.radians(d0) / 2), math.cos(math.radians(d1) / 2)
    fc = body.driver_add(f'modifiers["{name}"].factor'); dr = fc.driver; dr.type = 'SCRIPTED'
    v = dr.variables.new(); v.name = 'w'; v.type = 'SINGLE_PROP'; v.targets[0].id = rig; v.targets[0].data_path = f'pose.bones["{c["drive"]}"].rotation_quaternion[0]'
    dr.expression = f'{best[1]:.3f}*min(1,max(0,({w0:.5f}-abs(w))/{w0 - w1:.5f}))'
    for m in list(fc.modifiers): fc.modifiers.remove(m)
    after = {}
    for kind, val in c['train']:
        set_pose(kind, val); V = ev(); after[f'{kind}:{val}'] = dict(cf=int(cf_mask(V)[tris].sum()), pairs=pairs_sub(V, tris), bend=round(roughness(V, tris), 5),
                                                                    drive_deg=round(2 * math.degrees(math.acos(min(1, abs(rig.pose.bones[c['drive']].rotation_quaternion[0])))), 1), factor=round(md.factor, 3))
    rep['correctives'].append(dict(name=name, kept=True, vertices=int(reg.sum()), factor=best[1], iterations=best[2], driver=dr.expression,
                                   before={k: dict(cf=a, pairs=b, bend=round(r, 5)) for k, (a, b, r) in base.items()}, after=after))
    print('AC', name, int(reg.sum()), best[1:3], 'after', after, flush=True)
set_pose(None, None); rig.animation_data.action = None; poser.reset(); vl.update()
bpy.ops.wm.save_as_mainfile(filepath=OUTB)
Path(REPP).write_text(json.dumps(rep, indent=1)); print('ANGLECORR done', flush=True)
