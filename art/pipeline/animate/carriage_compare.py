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
    fore = np.array([x.startswith(('leg_fl_', 'leg_fr_')) for x in names]); fdom = np.array([str(x).startswith(('leg_fl_', 'leg_fr_')) for x in n['body_dom']]) if 'body_dom' in n.files else np.zeros(len(dv), bool)
    rows_extra = dict(max_joint_mm_without_fore_legs=round(float(dj[~fore].max()), 4), max_body_vertex_mm_without_fore_legs=round(float(dv[~fdom].max()), 4) if (~fdom).any() else None,
                      fore_leg_max_mm=round(float(dj[fore].max()), 4))
    rows[key] = dict(**rows_extra, max_joint_mm=round(float(dj.max()), 4), worst_joint=names[int(dj.argmax())], max_body_vertex_mm=round(float(dv.max()), 4),
                     hind_joint_world_mm=round(float(dj[hind].max()), 4), hind_local_rotation_deg=round(max(dq), 5))
    worst = max(worst, rows[key]['max_joint_mm'], rows[key]['max_body_vertex_mm'])
worst_nf = max(max(v['max_joint_mm_without_fore_legs'], v['max_body_vertex_mm_without_fore_legs'] or 0) for v in rows.values())
res = dict(tolerance_mm=tol, worst_mm=round(worst, 4), passed=bool(worst <= tol), worst_mm_without_fore_legs=round(worst_nf, 4), passed_without_fore_legs=bool(worst_nf <= tol), poses=rows)
json.dump(res, open(sys.argv[3], 'w'), indent=1)
print('COMPARE', 'pass' if res['passed'] else 'FAIL', 'worst', res['worst_mm'], 'mm; without the fore legs', res['worst_mm_without_fore_legs'], 'mm')
for k, v in rows.items(): print(k, v)
