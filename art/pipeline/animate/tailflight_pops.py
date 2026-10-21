"""B-378v pass 3: per-frame pose-step check (joint rotation and root height) for a before and an after clip record.

python tailflight_pops.py CHECK_BEFORE CHECK_AFTER OUT_JSON [first last]
Inputs are tailflight_check.py records (pose matrices per bone per frame, armature space, rig at the origin).
- local joint rotation step: angle between consecutive frames of each bone's rotation relative to its parent (deg/frame)
- root height step: change of the pelvis joint (spine_01 head) height per frame (mm/frame)
- pop: a frame whose step is at least 2.5x the larger of the neighbouring frames' steps and at least 12 deg
  (rotation) or 25 mm (height); i.e. a one-frame spike rather than a fast but continuous move.
"""
import json, math, sys
import numpy as np

SIG = 'sig.horns-first-descent'
b, a = (json.load(open(p)) for p in sys.argv[1:3])
out = sys.argv[3]; lo, hi = (int(sys.argv[4]), int(sys.argv[5])) if len(sys.argv) > 5 else (30, 45)
parents = a.get('parents') or b.get('parents')


def series(rec):
    rows = rec[SIG]; names = [n for n in rows[0]['mats']]
    loc = {}
    for n in names:
        R = []
        for r in rows:
            M = np.array(r['mats'][n])[:3, :3]; M = M / np.linalg.norm(M, axis=0)
            pn = parents.get(n)
            if pn and pn in r['mats']:
                Pm = np.array(r['mats'][pn])[:3, :3]; Pm = Pm / np.linalg.norm(Pm, axis=0); M = Pm.T @ M
            R.append(M)
        R = np.array(R)
        steps = [math.degrees(math.acos(max(-1.0, min(1.0, (np.trace(R[i].T @ R[i + 1]) - 1) / 2)))) for i in range(len(R) - 1)]
        loc[n] = np.array(steps)
    z = np.array([np.array(r['mats']['spine_01'])[2, 3] for r in rows])
    return loc, np.diff(z) * 1000


def pops(steps, thr):
    res = []
    for i in range(len(steps)):
        nb = max(steps[i - 1] if i > 0 else 0.0, steps[i + 1] if i + 1 < len(steps) else 0.0)
        if steps[i] >= thr and steps[i] >= 2.5 * nb:
            res.append((i + 1, round(float(steps[i]), 1), round(float(nb), 1)))
    return res


report = {'definition': __doc__.split('\n', 2)[2].strip(), 'window': [lo, hi]}
for tag, rec in (('before', b), ('after', a)):
    loc, dz = series(rec)
    names = sorted(loc)
    win = {}
    for f in range(lo, hi + 1):   # step INTO frame f
        i = f - 1
        top = sorted(((round(float(loc[n][i]), 1), n) for n in names), reverse=True)[:4]
        win[f] = {'max_joint_step_deg': top[0][0], 'top_joints': [f'{n} {v}' for v, n in top], 'root_height_step_mm': round(float(dz[i]), 1)}
    allp = {n: pops(loc[n], 12.0) for n in names}
    report[tag] = {'window_steps_into_frame': win,
                   'leg_hip_steps_deg': {n: [round(float(x), 1) for x in loc[n][lo - 1:hi]] for n in ('leg_hl_01', 'leg_hr_01', 'leg_fl_01', 'leg_fr_01') if n in loc},
                   'root_height_steps_mm': [round(float(x), 1) for x in dz[lo - 1:hi]],
                   'max_joint_step_whole_clip': max(((round(float(loc[n].max()), 1), n, int(loc[n].argmax()) + 1) for n in names)),
                   'pops_whole_clip_rotation': {n: v for n, v in allp.items() if v},
                   'pops_whole_clip_root_height': pops(np.abs(dz), 25.0)}
json.dump(report, open(out, 'w'), indent=1)
for tag in ('before', 'after'):
    r = report[tag]
    print(tag, 'max joint step', r['max_joint_step_whole_clip'], 'pops', {k: v for k, v in r['pops_whole_clip_rotation'].items()}, 'height pops', r['pops_whole_clip_root_height'])
    print(' hl hip', r['leg_hip_steps_deg'].get('leg_hl_01')); print(' fl hip', r['leg_hip_steps_deg'].get('leg_fl_01')); print(' root dz', r['root_height_steps_mm'])
