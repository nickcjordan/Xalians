"""B-sntv pass 3: elbow clearance probe (read only).

blender -b --python reskin_elbow.py -- RIG.blend PARAMS.json CANDIDATES.json OUT.json
For each candidate (sig parameter overrides and a crouch_deep foreleg splay), poses crouch_deep (the pass 5 crouch with
the forelegs re-solved) and the signature frames, then reports per side:
  elbow_mm   signed distance of the elbow joint (leg_f*_02 head) from the posed trunk skin (vertices whose dominant
             bone is a spine, neck_01 or scapula bone); positive = outside the ribcage surface
  pairs      the audit's intersecting triangle pairs for the whole body
"""
import sys, json, runpy, math
import numpy as np
from pathlib import Path
A = sys.argv[sys.argv.index('--') + 1:]
RIG, PARP, CANDP, OUTP = A[:4]
ORDER = 'rest,crouch,leap,landing,head_left_up,tail_side_up,foreleg_step,breath_in,crouch_deep,landing_old'.split(',')
open('/tmp/el_cfg.json', 'w').write(json.dumps({'pose_order': ORDER, 'train': [], 'smooth_stage': False, 'displace_stage': False}))
sys.argv = ['x', '--', RIG, PARP, '/tmp/el_cfg.json', '/tmp/el.blend', '/tmp/el.json']
import bpy
bpy.ops.wm.save_as_mainfile = lambda **k: None
g = runpy.run_path(str(Path(__file__).with_name('reskin_contact.py')))
from mathutils.kdtree import KDTree
from mathutils import Vector
rig, poser, vl, LC = g['rig'], g['poser'], g['vl'], g['LC']
DOM, gn, ev, pairs_all, vnormals = g['DOM'], g['gn'], g['ev'], g['pairs_all'], g['vnormals']
OLDP = json.load(open(Path(RIG).parent.parent / 'oldposes.json')) if (Path(RIG).parent.parent / 'oldposes.json').exists() else json.load(open(A[4]))
TRUNK = np.isin(DOM, [gn.index(n) for n in gn if n.startswith(('spine_', 'scapula')) or n == 'neck_01'])
base = json.loads(Path(PARP).read_text()); C = json.loads(Path(CANDP).read_text())


def crouch_deep(splay, extra=None):
    poser.reset()
    for bn, ch in OLDP['crouch'].items():
        if bn in rig.pose.bones:
            pb = rig.pose.bones[bn]; pb.rotation_mode = 'QUATERNION'; pb.location = ch['loc']; pb.rotation_quaternion = ch['rot']; pb.scale = ch['scale']
    if splay is None:   # the pass 5 channels exactly (pass 2 crouch_deep)
        vl.update(); return
    for lg in ('fl', 'fr'):
        for i in (1, 2, 3): rig.pose.bones[f'leg_{lg}_{i:02d}'].rotation_quaternion = (1, 0, 0, 0)
    vl.update()
    legs = {'fl': dict(plant=1.0, splay=splay, **(extra or {})), 'fr': dict(plant=1.0, splay=splay, **(extra or {})), 'hl': {'plant': 0.0}, 'hr': {'plant': 0.0}}
    poser.solve_legs(legs); vl.update()


def measure():
    P = ev(); vn = vnormals(P); idx = np.nonzero(TRUNK)[0]
    kd = KDTree(len(idx))
    for i, j in enumerate(idx): kd.insert(P[j], i)
    kd.balance(); out = {}
    for side in ('l', 'r'):
        E = rig.pose.bones[f'leg_f{side}_02'].head
        co, i, d = kd.find(E); j = idx[i]
        out[f'elbow_{side}_mm'] = round(float(np.dot(np.array(E) - P[j], vn[j]) * 1000), 1)
    # pass 4: elbow width against the shoulder line (front view): elbow joint |x| vs the widest trunk skin at the shoulder
    # joint's height (+-30 mm), and the forearm-width limit (trunk half-width + one forearm width, 45 mm)
    S = rig.pose.bones['leg_fl_01'].head; Pt = P[TRUNK]
    band = np.abs(Pt[:, 2] - S.z) < 0.03
    hw = float(np.abs(Pt[band, 0]).max()) if band.any() else float('nan')
    out['shoulder_skin_halfwidth_mm'] = round(hw * 1000, 1)
    for side in ('l', 'r'):
        out[f'elbow_{side}_x_mm'] = round(abs(rig.pose.bones[f'leg_f{side}_02'].head.x) * 1000, 1)
    out['pairs'] = len(pairs_all(P))
    return out


res = {}
for cand in C['cands']:
    r = {}
    for sd in ('l', 'r'):
        rig.pose.bones[f'scapula_{sd}'].constraints[0].influence = cand.get('scap', 0.5)
    if 'crouch_splay' in cand:
        crouch_deep(cand['crouch_splay'], cand.get('crouch_extra')); r['crouch_deep'] = measure()
    sp = dict(base.get('sig.horns-first-descent', {}), **cand.get('sig', {}))
    _, fn, _, _, _ = LC.make_sig(sp)
    for f in C.get('frames', []):
        poser.reset(); poser.pin_local = None; poser.apply(fn(f * 1000.0 / 30)); vl.update(); r[f'sig_{f}'] = measure()
    res[cand['name']] = r
    print('ELBOW', cand['name'], json.dumps(r), flush=True)
Path(OUTP).write_text(json.dumps(res, indent=1))
print('ELBOW done', flush=True)
