"""B-sntv: clearance probe for signature frames under candidate clip parameters.

blender -b --python reskin_probe.py -- RIG.blend PARAMS.json CANDIDATES.json OUT.json
CANDIDATES.json: {"frames": [..], "cands": [{"name": .., "sig": {param overrides}}]}; each candidate is posed at the
frames with the clip code (pose_rig Poser, no bake) and reports the minimum distances (mm):
head/jaw skin -> foreleg skin, horns -> body skin that is not head, horns -> foreleg skin.
"""
import bpy, sys, json
import numpy as np
from pathlib import Path
from mathutils.kdtree import KDTree

A = sys.argv[sys.argv.index('--') + 1:]
RIG, PARP, CANDP, OUTP = A[:4]
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
_argv = sys.argv; sys.argv = ['x', '--', str(Path(OUTP).parent / 'posetmp'), 'none']
import pose_rig as PR
import luceras_clips as LC
sys.argv = _argv
bpy.ops.wm.open_mainfile(filepath=RIG)
rig = bpy.data.objects['luceras_rig']; rig['controls_enabled'] = 0.0; rig.animation_data_create(); rig.animation_data.action = None
body = bpy.data.objects['luceras_blockout']; horns = [bpy.data.objects['horn_l'], bpy.data.objects['horn_r']]
gi = {g.index: g.name for g in body.vertex_groups}
nv = len(body.data.vertices); head = np.zeros(nv); fore = np.zeros(nv)
for v in body.data.vertices:
    for g in v.groups:
        n = gi[g.group]
        if n in ('head_01', 'jaw_01', 'ear_l_01', 'ear_r_01', 'neck_02'): head[v.index] += g.weight
        if n.startswith(('leg_fl_02', 'leg_fl_03', 'leg_fr_02', 'leg_fr_03')): fore[v.index] += g.weight
HI = np.nonzero(head > 0.5)[0][::2]; FI = np.nonzero(fore > 0.5)[0][::2]; BI = np.nonzero((head < 0.05) & (fore < 0.5))[0][::3]
params = json.loads(Path(PARP).read_text()); C = json.loads(Path(CANDP).read_text())
poser = PR.Poser(rig)


def ev(o):
    dg = bpy.context.evaluated_depsgraph_get(); e = o.evaluated_get(dg); m = e.to_mesh()
    a = np.empty(len(m.vertices) * 3); m.vertices.foreach_get('co', a); e.to_mesh_clear()
    a = a.reshape(-1, 3); W = np.array(o.matrix_world); return a @ W[:3, :3].T + W[:3, 3]


def mind(P, Q):
    kd = KDTree(len(Q))
    for i, q in enumerate(Q): kd.insert(q, i)
    kd.balance()
    return min(kd.find(p)[2] for p in P)


out = {}
for cand in C['cands']:
    sp = dict(params.get('sig.horns-first-descent', {}), **cand.get('sig', {}))
    P, fn, ev_, trav, T = LC.make_sig(sp)
    rows = {}
    for f in C['frames']:
        poser.pin_local = None; poser.apply(fn(f * 1000.0 / 30)); bpy.context.view_layer.update()
        B = ev(body); H = np.vstack([ev(h)[::3] for h in horns])
        rows[f] = dict(head_to_foreleg_mm=1000 * mind(B[HI], B[FI]), horn_to_body_mm=1000 * mind(H, B[BI]), horn_to_foreleg_mm=1000 * mind(H, B[FI]))
        print('PROBE', cand['name'], f, {k: round(v, 1) for k, v in rows[f].items()}, flush=True)
    out[cand['name']] = rows
Path(OUTP).write_text(json.dumps(out, indent=1))
print('PROBE done', flush=True)
