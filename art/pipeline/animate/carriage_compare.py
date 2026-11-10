"""luceras-final: compare the render-time poses (carriage_verify.py old) with the rebaked clips (new).

python carriage_compare.py OLD.npz NEW.npz OUT.json [tol_mm=1.0]
Per pose: the largest bone joint move (world head/tail) and the largest body vertex move (every 5th evaluated vertex),
both in mm; the hind joints (leg_h*) separately: world move and local rotation change (deg) between the two.
"""
import json, sys, math
import numpy as np

o, n = np.load(sys.argv[1]), np.load(sys.argv[2]); tol = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
names = [str(x) for x in o['names']]; assert names == [str(x) for x in n['names']]
hind = [i for i, x in enumerate(names) if x.startswith('leg_h')]
rows = {}; worst = 0.0
for key in [str(k) for k in o['keys']]:
    bo, bn = o[key + '_bones'], n[key + '_bones']
    dj = np.maximum(np.linalg.norm(bo[:, :3] - bn[:, :3], axis=1), np.linalg.norm(bo[:, 3:] - bn[:, 3:], axis=1)) * 1000
    dv = np.linalg.norm(o[key + '_body'] - n[key + '_body'], axis=1) * 1000
    qo, qn = o[key + '_local'][hind, :4], n[key + '_local'][hind, :4]
    dq = [math.degrees(2 * math.acos(min(1.0, abs(float(a @ b))))) for a, b in zip(qo, qn)]
    rows[key] = dict(max_joint_mm=round(float(dj.max()), 4), worst_joint=names[int(dj.argmax())], max_body_vertex_mm=round(float(dv.max()), 4),
                     hind_joint_world_mm=round(float(dj[hind].max()), 4), hind_local_rotation_deg=round(max(dq), 5))
    worst = max(worst, rows[key]['max_joint_mm'], rows[key]['max_body_vertex_mm'])
res = dict(tolerance_mm=tol, worst_mm=round(worst, 4), passed=bool(worst <= tol), poses=rows)
json.dump(res, open(sys.argv[3], 'w'), indent=1)
print('COMPARE', 'pass' if res['passed'] else 'FAIL', 'worst', res['worst_mm'], 'mm')
for k, v in rows.items(): print(k, v)
