"""B-bafy: move chest-wall skin behind the upper arm off the humerus (leg_f*_01) onto the trunk (spine_05).

blender -b --factory-startup --python chest_weights.py -- RIG PARAMS_JSON OUT_JSON MODE [k1,k2,...] [OUT_RIG]
MODE sweep: for each transfer strength k, reweight in memory and measure the chest at the crouch and other frames.
MODE apply: reweight with k (first value) and save OUT_RIG (the input rig is never written).

Region (rest pose, per side): vertices carrying humerus weight whose position lies behind the humerus line by more
than POST0 at their own height (posterior = +Y), from the elbow height up to the shoulder, fading in over POST_FADE
and fading out toward the elbow, so the arm itself (front, sides and the triceps close behind the bone) keeps its
weights. A share k of the humerus weight in that region moves to spine_05, then four rounds of weight diffusion
inside the region smooth the edge. Rest pose is unchanged by construction (weights only act when posed).
"""
import bpy, sys, json, math, os
import numpy as np
from pathlib import Path
HERE = Path(__file__).resolve().parent
a = sys.argv[sys.argv.index('--') + 1:]
RIG, PJ, OUTJ, MODE = a[0], a[1], a[2], a[3]
KS = [float(x) for x in a[4].split(',')] if len(a) > 4 else [0.7]
OUT_RIG = a[5] if len(a) > 5 else None
sys.argv = [sys.argv[0], '--', '/tmp/chest_weights', 'none']
sys.path.insert(0, str(HERE)); sys.path.insert(0, str(HERE.parent / 'rig'))
os.environ['ANIM_RIG'] = RIG
import pose_rig as PR
import luceras_clips as LC
import neck_lib as NL

POST0, POST_FADE, ELBOW_FADE = 0.022, 0.020, 0.025
rig = PR.open_rig(); poser = PR.Poser(rig); PR.set_deform_mods(True)
body = bpy.data.objects['luceras_blockout']; me = body.data
E = np.empty(len(me.edges) * 2, int); me.edges.foreach_get('vertices', E); E = E.reshape(-1, 2)
me.calc_loop_triangles(); F = np.empty(len(me.loop_triangles) * 3, int); me.loop_triangles.foreach_get('vertices', F); F = F.reshape(-1, 3)
REST = np.array([v.co[:] for v in me.vertices]); nv = len(REST)
names = [g.name for g in body.vertex_groups]; gidx = {n: i for i, n in enumerate(names)}
Wm = np.zeros((nv, len(names)))
for v in me.vertices:
    for g in v.groups: Wm[v.index, g.group] = g.weight
W0 = Wm.copy()


def sstep(x):
    x = np.clip(x, 0, 1); return x * x * (3 - 2 * x)


def region(side):
    b = rig.data.bones[f'leg_f{side}_01']; h, t = np.array(b.head_local), np.array(b.tail_local)
    s = np.clip((REST[:, 2] - t[2]) / (h[2] - t[2]), 0, 1)               # 0 at the elbow height, 1 at the shoulder
    line_y = t[1] + (h[1] - t[1]) * s
    post = REST[:, 1] - line_y
    sgn = 1 if side == 'l' else -1
    f = sstep((post - POST0) / POST_FADE) * sstep((REST[:, 2] - t[2] + 0.005) / ELBOW_FADE) * (sgn * REST[:, 0] > 0.0) * (REST[:, 2] < h[2] + 0.01)
    return f * (Wm[:, gidx[f'leg_f{side}_01']] > 0)


FR = {s: region(s) for s in 'lr'}
nbr_i = np.concatenate([E[:, 0], E[:, 1]]); nbr_j = np.concatenate([E[:, 1], E[:, 0]]); deg = np.bincount(nbr_i, minlength=nv).clip(1)


def reweight(k):
    W = W0.copy()
    for s in 'lr':
        hum = gidx[f'leg_f{s}_01']; sp = gidx['spine_05']; f = FR[s] * k
        mv = W[:, hum] * f; W[:, hum] -= mv; W[:, sp] += mv
    mask = np.clip(FR['l'] + FR['r'], 0, 1) > 1e-4
    grow = mask.copy()
    for _ in range(3): grow[nbr_j[grow[nbr_i]]] = True
    for _ in range(4):
        avg = np.stack([np.bincount(nbr_i, weights=W[nbr_j, c], minlength=nv) for c in range(W.shape[1])], 1) / deg[:, None]
        W[grow] = 0.5 * W[grow] + 0.5 * avg[grow]
    W[W < 1e-4] = 0; W /= np.maximum(W.sum(1, keepdims=True), 1e-9)
    return W


CUR = [W0.copy()]


def write_weights(W):
    ref = CUR[0]; changed = np.flatnonzero(np.abs(W - ref).max(1) > 1e-6)
    for c, n in enumerate(names):
        g = body.vertex_groups[n]
        for i in changed:
            if W[i, c] > 0: g.add([int(i)], float(W[i, c]), 'REPLACE')
            elif ref[i, c] > 0: g.remove([int(i)])
    me.update(); CUR[0] = W.copy(); return changed


def curv(V):
    return NL.smooth_field(NL.curvature(V, NL.vertex_normals(V, F), E), E, 2)


reg = {s: np.flatnonzero(np.linalg.norm(REST - REST[i], axis=1) < 0.07) for s, i in (('l', 32720), ('r', 40835))}
fore = np.flatnonzero((REST[:, 1] < 0.08) & (REST[:, 2] > 0.15) & (REST[:, 2] < 0.45))
poser.reset(); bpy.context.view_layer.update(); H0 = curv(PR.eval_coords(body))
P = json.loads(Path(PJ).read_text())
_, fsig, _, _, _ = LC.make_sig(P['sig.horns-first-descent']); _, fidle, _ = LC.make_idle(P['idle'])
FRAMES = [('sig', f) for f in (4, 8, 10, 11, 12, 16, 25, 29, 33, 36, 38, 40, 45)] + [('idle', f) for f in (0, 20, 45, 70)]


def measure(tag):
    rows = {}
    for clip, f in FRAMES:
        fn = fsig if clip == 'sig' else fidle
        poser.pin_local = None; poser.apply(fn(f * 1000.0 / 30)); bpy.context.view_layer.update()
        V = PR.eval_coords(body); H = curv(V)
        r = {}
        for s in 'lr':
            d = H[reg[s]] - H0[reg[s]]; r[s] = {'top30': round(float(np.sort(d)[-30:].mean()), 3), 'over_0_15': int((d > 0.15).sum())}
        r['_H'] = H; r['_V'] = V
        rows[f'{clip}_f{f:02d}'] = r
    return rows


out = {'region_vertices': {s: int((FR[s] > 1e-3).sum()) for s in 'lr'}, 'params': dict(POST0=POST0, POST_FADE=POST_FADE, ELBOW_FADE=ELBOW_FADE)}
base = measure('base')
out['base'] = {k: {kk: vv for kk, vv in v.items() if not kk.startswith('_')} for k, v in base.items()}
print('BASE', json.dumps({k: (v['l']['top30'], v['r']['top30']) for k, v in out['base'].items()}), flush=True)
for k in KS:
    W = reweight(k); changed = write_weights(W)
    rows = measure(f'k{k}')
    rec = {'changed_vertices': int(len(changed)), 'max_weight_change': round(float(np.abs(W - W0).max()), 3)}
    for key, r in rows.items():
        b = base[key]
        dV = np.linalg.norm(r['_V'] - b['_V'], axis=1); dH = r['_H'] - b['_H']
        rec[key] = {'l': r['l'], 'r': r['r'], 'moved_mm_max': round(float(dV.max() * 1000), 2), 'moved_over_0_5mm': int((dV > 5e-4).sum()),
                    'fore_region_new_convex_over_0_1': int((dH[fore] > 0.1).sum())}
    out[f'k{k}'] = rec
    print('K', k, json.dumps({kk: (vv['l']['top30'], vv['r']['top30'], vv['moved_mm_max'], vv['fore_region_new_convex_over_0_1']) for kk, vv in rec.items() if isinstance(vv, dict)}), flush=True)
    if MODE == 'apply':
        poser.reset(); rig.animation_data.action = None; bpy.context.view_layer.update()
        rig['chest_weights_build'] = 'B-bafy'
        bpy.ops.wm.save_as_mainfile(filepath=OUT_RIG); print('SAVED', OUT_RIG, flush=True); break
    write_weights(W0)   # restore
Path(OUTJ).write_text(json.dumps(out, indent=1))
print('CW done', flush=True)
