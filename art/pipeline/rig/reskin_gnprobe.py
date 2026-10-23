"""B-sntv pass 5: contact deformer variants in one session (read only).

blender -b --python reskin_gnprobe.py -- RIG_WITH_GN.blend PARAMS.json OLDPOSES.json OUT.json
For each variant (modifier off, push caps, radius scale) poses crouch_deep (pass 5 channels) and sig frames 14, 22,
29, and reports the crossing pairs, the bone pairs involved and the contact push depth (max and p99, mm).
"""
import sys, json, runpy
import numpy as np
from pathlib import Path
A = sys.argv[sys.argv.index('--') + 1:]
RIG, PARP, OLDP_, OUTP = A[:4]
ORDER = 'rest,crouch,leap,landing,head_left_up,tail_side_up,foreleg_step,breath_in,crouch_deep,landing_old'.split(',')
open('/tmp/gp_cfg.json', 'w').write(json.dumps({'pose_order': ORDER, 'train': [], 'smooth_stage': False, 'displace_stage': False}))
sys.argv = ['x', '--', RIG, PARP, '/tmp/gp_cfg.json', '/tmp/gp.blend', '/tmp/gp.json']
import bpy
bpy.ops.wm.save_as_mainfile = lambda **k: None
g = runpy.run_path(str(Path(__file__).with_name('reskin_contact.py')))
rig, poser, vl, LC, ev, pairs_all, gn, DOM, F = g['rig'], g['poser'], g['vl'], g['LC'], g['ev'], g['pairs_all'], g['gn'], g['DOM'], g['F']
body = g['body']; md = body.modifiers['Contact Push']; ng = md.node_group
OLDP = json.load(open(OLDP_)); base = json.loads(Path(PARP).read_text())
_, fn, _, _, _ = LC.make_sig(base.get('sig.horns-first-descent', {}))
mins = [n for n in ng.nodes if n.bl_idname == 'ShaderNodeMath' and n.operation == 'MINIMUM']
capnode = [n for n in mins if abs(n.inputs[1].default_value - 0.05) < 1e-5][0]


def pose(which):
    poser.reset(); poser.pin_local = None
    if which == 'crouch_deep':
        for bn, ch in OLDP['crouch'].items():
            if bn in rig.pose.bones:
                p = rig.pose.bones[bn]; p.rotation_mode = 'QUATERNION'; p.location = ch['loc']; p.rotation_quaternion = ch['rot']; p.scale = ch['scale']
    else:
        poser.apply(fn(int(which) * 1000.0 / 30))
    vl.update()


def push_stats():
    dg = bpy.context.evaluated_depsgraph_get(); e = body.evaluated_get(dg); m = e.to_mesh()
    a = m.attributes.get('contact_push'); v = np.zeros(len(m.vertices))
    if a is not None: a.data.foreach_get('value', v)
    e.to_mesh_clear(); v = v[v > 1e-4] * 1000
    return dict(max_mm=round(float(v.max()), 1) if len(v) else 0.0, p99_mm=round(float(np.percentile(v, 99)), 1) if len(v) else 0.0, vertices=int(len(v)))


res = {}
VAR = [('off', None, None), ('cap10', 0.010, 1.0), ('cap20', 0.020, 1.0), ('cap50', 0.050, 1.0)]
for name, c, rs in VAR:
    md.show_viewport = c is not None
    if c is not None:
        capnode.inputs[1].default_value = c
    r = {}
    for which in ('crouch_deep', '14', '22', '29'):
        pose(which); P = ev(); X = pairs_all(P); bp = {}
        for a, b in X:
            k = '|'.join(sorted((gn[DOM[F[a, 0]]], gn[DOM[F[b, 0]]]))); bp[k] = bp.get(k, 0) + 1
        r[which] = dict(pairs=len(X), top=sorted(bp.items(), key=lambda x: -x[1])[:5], push=push_stats() if c is not None else None)
    res[name] = r
    print('GP', name, json.dumps({k: (v['pairs'], v['push']) for k, v in r.items()}), flush=True)
    print('   top', json.dumps({k: v['top'] for k, v in r.items()}), flush=True)
Path(OUTP).write_text(json.dumps(res, indent=1)); print('GP done', flush=True)
