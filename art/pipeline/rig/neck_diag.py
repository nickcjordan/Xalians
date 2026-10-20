"""B-6kf7: diagnose the Luceras neck seam on a clips blend (rig + baked idle and signature actions). Read only.

Usage: blender -b --factory-startup --python neck_diag.py -- CLIPS_BLEND OUT_DIR TAG
Measures, on the body (luceras_blockout), the rest shape and three poses (idle frame 45 = 1.5 s, signature frames 29 = hit
and 30 = deepest neck): groove residual around the neck axis (neck_lib.groove_table), mean curvature binned on the rest
(s, theta) grid, and the weight profile of neck_01 / neck_02 / head_01 / jaw_01 / spine_05 along the axis.
Writes OUT_DIR/<TAG>_diag.json and OUT_DIR/<TAG>_diag.npz.
"""
import bpy, sys, json, numpy as np
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import neck_lib as NL

a = sys.argv[sys.argv.index('--') + 1:]; SRC, OUT, TAG = a[0], Path(a[1]), a[2]; OUT.mkdir(parents=True, exist_ok=True)
POSES = [('rest', None, 0), ('idle_f45', 'idle', 45), ('sig_f29_hit', 'sig.horns-first-descent', 29), ('sig_f30_neck', 'sig.horns-first-descent', 30)]
BONES = ('spine_05', 'neck_01', 'neck_02', 'head_01', 'jaw_01')

bpy.ops.wm.open_mainfile(filepath=SRC)
rig = bpy.data.objects['luceras_rig']; rig['controls_enabled'] = 0.0; rig.location = (0, 0, 0)
body = bpy.data.objects['luceras_blockout']; me = body.data
n = len(me.vertices)
V0 = np.empty(n * 3); me.vertices.foreach_get('co', V0); V0 = V0.reshape(-1, 3)
E = np.empty(len(me.edges) * 2, int); me.edges.foreach_get('vertices', E); E = E.reshape(-1, 2)
me.calc_loop_triangles(); F = np.empty(len(me.loop_triangles) * 3, int); me.loop_triangles.foreach_get('vertices', F); F = F.reshape(-1, 3)
names = [b.name for b in rig.data.bones if b.use_deform]; gi = {g.index: g.name for g in body.vertex_groups}
W = np.zeros((n, len(names))); col = {nm: i for i, nm in enumerate(names)}
for v in me.vertices:
    for g in v.groups:
        nm = gi.get(g.group)
        if nm in col: W[v.index, col[nm]] = g.weight
Ws = W / np.maximum(W.sum(1), 1e-12)[:, None]

C, T, s = NL.spline(NL.REST_PTS)
idx, sv, th, r, inside = NL.param(V0, C, T, s)
ks = NL.ctrl_s()
S_LO, S_HI = 10.0, ks[2] + 40.0
sel = inside & (sv > S_LO - 15) & (sv < S_HI + 15)
# exclude head furniture from the radial profile: vertices mostly on jaw or ears
far = np.array([col.get(x) for x in ('jaw_01', 'ear_l_01', 'ear_l_02', 'ear_r_01', 'ear_r_02') if x in col])
headstuff = Ws[:, far].sum(1) > 0.5
selr = sel & ~headstuff

rest_mats = {b.name: np.array(b.matrix_local) for b in rig.data.bones}


def axis_posed():
    """Pose the axis with the bin-average weights of nearby vertices (linear blend, like the mesh)."""
    M = np.stack([np.array(rig.pose.bones[nm].matrix) @ np.linalg.inv(rest_mats[nm]) for nm in names])
    Cp = np.empty_like(C)
    for k in range(len(C)):
        m = sel & (np.abs(sv - s[k]) < 3.0)
        w = Ws[m].mean(0) if m.sum() >= 5 else None
        if w is None:
            nm = NL.CTRL_BONES[min(3, int(np.searchsorted(ks, s[k])))]; w = np.zeros(len(names)); w[col[nm]] = 1
        A = np.tensordot(w, M, 1); Cp[k] = A[:3, :3] @ C[k] + A[:3, 3]
    Tp = np.gradient(Cp, axis=0); Tp /= np.linalg.norm(Tp, axis=1)[:, None]
    return Cp, Tp


def eval_V():
    dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg); m = ev.to_mesh()
    x = np.empty(len(m.vertices) * 3); m.vertices.foreach_get('co', x); ev.to_mesh_clear(); return x.reshape(-1, 3)


out = dict(src=SRC, tag=TAG, ctrl_s_mm=ks, s_range=[S_LO, S_HI], selected=int(sel.sum()), poses={})
store = {}
for pname, act, f in POSES:
    if act is None:
        rig.animation_data_create(); rig.animation_data.action = None
        for p in rig.pose.bones: p.rotation_mode = 'QUATERNION'; p.rotation_quaternion = (1, 0, 0, 0); p.location = (0, 0, 0); p.scale = (1, 1, 1)
    else:
        rig.animation_data.action = bpy.data.actions[act]
    bpy.context.scene.frame_set(f); bpy.context.view_layer.update()
    Vp = eval_V() if act else V0.copy()
    Cp, Tp = (C, T) if act is None else axis_posed()
    # radius about the posed axis at each vertex's rest axis sample
    R = Vp - Cp[idx]; t = Tp[idx]; rp = np.linalg.norm(R - t * (R * t).sum(1)[:, None], axis=1) * 1000
    g = NL.groove_table(sv, th, rp, selr, S_LO, S_HI)
    Np = NL.vertex_normals(Vp, F); H = NL.curvature(Vp, Np, E)
    # curvature binned on the rest grid (mean of 1/mm, then negative = concave)
    sb = g['s']; tb = g['theta']; Hb = np.full((len(tb), len(sb)), np.nan)
    for i, t0 in enumerate(tb):
        mt = sel & (((th - t0) % 360) < 15)
        for j, s0 in enumerate(sb):
            m = mt & (np.abs(sv - s0) <= 1.0)
            if m.sum() >= 3: Hb[i, j] = H[m].mean()
    summ = NL.ring_summary(g)
    out['poses'][pname] = dict(action=act, frame=f, groove=summ, curvature_profile_median=[None if np.isnan(x) else round(float(x), 5) for x in np.nanmedian(Hb, axis=0)],
                               curvature_min_bin=float(np.nanmin(Hb)))
    store[pname + '_res'] = g['residual']; store[pname + '_Hb'] = Hb; store[pname + '_H'] = H; store[pname + '_V'] = Vp
    print('DIAG', pname, flush=True)
# weight profile along s (selected vertices)
sb = np.arange(S_LO - 10, S_HI + 10.01, 2.0); wp = {}
for nm in BONES:
    if nm not in col: continue
    wp[nm] = [round(float(Ws[sel & (np.abs(sv - x) <= 1.0), col[nm]].mean()), 4) if (sel & (np.abs(sv - x) <= 1.0)).sum() else None for x in sb]
out['weight_profile'] = dict(s=sb.tolist(), w=wp)
# per-theta weight transition s positions (where head_01 weight crosses 0.5 and its 10-90 width)
tr = []
for t0 in range(0, 360, 30):
    mt = sel & (((th - t0) % 360) < 30); prof = []
    for x in sb:
        m = mt & (np.abs(sv - x) <= 1.0); prof.append(Ws[m, col['head_01']].mean() if m.sum() >= 3 else np.nan)
    prof = np.array(prof); ok = ~np.isnan(prof)
    def cross(level):
        for j in range(1, len(sb)):
            if ok[j] and ok[j - 1] and prof[j - 1] < level <= prof[j]: return float(sb[j - 1] + (level - prof[j - 1]) / (prof[j] - prof[j - 1]) * 2.0)
        return None
    tr.append(dict(theta=t0, s10=cross(0.1), s50=cross(0.5), s90=cross(0.9)))
out['head_weight_transition'] = tr
np.savez_compressed(OUT / f'{TAG}_diag.npz', sv=sv, th=th, r=r, sel=sel, selr=selr, idx=idx, s=s, V0=V0, Ws=Ws, names=np.array(names), **store)
(OUT / f'{TAG}_diag.json').write_text(json.dumps(out, indent=1))
print('DIAG done', flush=True)
