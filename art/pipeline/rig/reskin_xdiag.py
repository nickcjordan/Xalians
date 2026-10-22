"""B-sntv pass 2 diagnostic: for the intersecting pairs at a pose, rest distance between the two triangles and the
penetration depth (read only).  blender -b --python reskin_xdiag.py -- RIG.blend PARAMS.json POSE_ORDER kind:val ..."""
import sys, json, runpy
import numpy as np
A = sys.argv[sys.argv.index('--') + 1:]
cfg = {'pose_order': A[2].split(','), 'train': [], 'smooth_stage': False, 'displace_stage': False}
open('/tmp/xd_cfg.json', 'w').write(json.dumps(cfg))
sys.argv = ['x', '--', A[0], A[1], '/tmp/xd_cfg.json', '/tmp/xd_out.blend', '/tmp/xd_rep.json']
import bpy
_save = bpy.ops.wm.save_as_mainfile
bpy.ops.wm.save_as_mainfile = lambda **k: None
g = runpy.run_path(__file__.replace('reskin_xdiag.py', 'reskin_contact.py'))
for kv in A[3:]:
    kind, val = kv.split(':'); val = int(val) if kind == 'sig' else val
    g['set_pose'](kind, val); P = g['ev'](); X = sorted(g['pairs_all'](P)); F = g['F']; V0 = g['V0']; TD = g['TDOM']; gn = g['gn']; DOM = g['DOM']
    if not X: print('XD', kv, 'none'); continue
    a = np.array([p[0] for p in X]); b = np.array([p[1] for p in X])
    rd = np.linalg.norm(V0[F[a]].mean(1) - V0[F[b]].mean(1), axis=1) * 1000
    pd = np.linalg.norm(P[F[a]].mean(1) - P[F[b]].mean(1), axis=1) * 1000
    print('XD', kv, 'pairs', len(X), 'rest dist mm pct10/50/90', np.percentile(rd, [10, 50, 90]).round(1), 'posed centroid dist', np.percentile(pd, [50, 90]).round(1), flush=True)
    for lo, hi in ((0, 10), (10, 25), (25, 60), (60, 1e9)):
        m = (rd >= lo) & (rd < hi)
        if m.any():
            pairs = {}
            for i in np.nonzero(m)[0]: k = tuple(sorted((gn[DOM[F[a[i], 0]]], gn[DOM[F[b[i], 0]]]))); pairs[k] = pairs.get(k, 0) + 1
            print('   rest', lo, hi, int(m.sum()), sorted(pairs.items(), key=lambda x: -x[1])[:4], flush=True)
