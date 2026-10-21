"""B-bafy: sweep the fore elbow tuck at the deepest crouch and measure the chest bump (read only).

blender -b --factory-startup --python chest_sweep.py -- RIG PARAMS_JSON OUT_JSON frame tuck1,tuck2,...
Poses the rig straight from the clip spec (pose_rig.Poser) at the frame for each tuck value. Chest region: body
vertices within 70 mm of the rest armpit points (vertex 32720 left, 40835 right). Measures: elbow joint position,
mean of the 30 largest curvature increases over rest per side, count of vertices whose curvature rose by > 0.15 /mm,
and the elbow-crouch corrective value.
"""
import bpy, sys, json, math
import numpy as np
from pathlib import Path
HERE = Path(__file__).resolve().parent
a = sys.argv[sys.argv.index('--') + 1:]
RIG, PJ, OUTJ, FRAME, TUCKS = a[0], a[1], a[2], int(a[3]), [float(x) for x in a[4].split(',')]
sys.argv = [sys.argv[0], '--', '/tmp/chest_sweep', 'none']
sys.path.insert(0, str(HERE)); sys.path.insert(0, str(HERE.parent / 'rig'))
import os
os.environ['ANIM_RIG'] = RIG
import pose_rig as PR
import luceras_clips as LC
import neck_lib as NL

rig = PR.open_rig(); poser = PR.Poser(rig); PR.set_deform_mods(True)
body = bpy.data.objects['luceras_blockout']; me = body.data
E = np.empty(len(me.edges) * 2, int); me.edges.foreach_get('vertices', E); E = E.reshape(-1, 2)
me.calc_loop_triangles(); F = np.empty(len(me.loop_triangles) * 3, int); me.loop_triangles.foreach_get('vertices', F); F = F.reshape(-1, 3)
REST = np.array([v.co[:] for v in me.vertices])
reg = {s: np.flatnonzero(np.linalg.norm(REST - REST[i], axis=1) < 0.07) for s, i in (('l', 32720), ('r', 40835))}


def curv(V):
    return NL.smooth_field(NL.curvature(V, NL.vertex_normals(V, F), E), E, 2)


poser.reset(); bpy.context.view_layer.update(); H0 = curv(PR.eval_coords(body))
P = json.loads(Path(PJ).read_text())['sig.horns-first-descent']
out = []
for tk in TUCKS:
    P2 = dict(P, fore_crouch_elbow_tuck=tk)
    _, fn, _, _, _ = LC.make_sig(P2)
    poser.pin_local = None; poser.apply(fn(FRAME * 1000.0 / 30)); bpy.context.view_layer.update()
    V = PR.eval_coords(body); H = curv(V)
    rec = {'tuck': tk, 'frame': FRAME}
    kb = me.shape_keys.key_blocks
    rec['elbow_crouch_corrective'] = round(float(kb['PSD_elbow_fl_crouch'].value), 3)
    for s in 'lr':
        d = H[reg[s]] - H0[reg[s]]
        rec[s] = {'elbow': [round(x, 4) for x in rig.pose.bones[f'leg_f{s}_02'].head], 'top30_curv_increase': round(float(np.sort(d)[-30:].mean()), 3),
                  'verts_over_0_15': int((d > 0.15).sum()), 'max_increase': round(float(d.max()), 3)}
    out.append(rec); print('SWEEP', json.dumps(rec), flush=True)
Path(OUTJ).write_text(json.dumps(out, indent=1))
