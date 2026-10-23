"""B-sntv pass 5: pose candidate probe (read only): plausibility angles, clearances and crossings per frame.

blender -b --python reskin_probe5.py -- RIG.blend PARAMS.json CANDS.json OUT.json
CANDS: {"frames": [...], "cands": [{"name", "sig": {overrides}, "crouch": {"splay": s, "tuck": t} (optional)}]}
"""
import sys, json, runpy, math
import numpy as np
from pathlib import Path
A = sys.argv[sys.argv.index('--') + 1:]
RIG, PARP, CANDP, OUTP = A[:4]
ORDER = 'rest,crouch,leap,landing,head_left_up,tail_side_up,foreleg_step,breath_in,crouch_deep,landing_old'.split(',')
open('/tmp/p5_cfg.json', 'w').write(json.dumps({'pose_order': ORDER, 'train': [], 'smooth_stage': False, 'displace_stage': False}))
sys.argv = ['x', '--', RIG, PARP, '/tmp/p5_cfg.json', '/tmp/p5.blend', '/tmp/p5.json']
import bpy
bpy.ops.wm.save_as_mainfile = lambda **k: None
g = runpy.run_path(str(Path(__file__).with_name('reskin_contact.py')))
from mathutils.kdtree import KDTree
rig, poser, vl, LC, ev, pairs_all, Wd, gn = g['rig'], g['poser'], g['vl'], g['LC'], g['ev'], g['pairs_all'], g['Wd'], g['gn']
OLDP = json.load(open(A[4])) if len(A) > 4 else None
wsum = lambda names: sum(Wd[:, gn.index(n)] for n in names if n in gn)
HEAD = np.nonzero(wsum(['head_01', 'jaw_01']) > 0.5)[0][::2]
FORE = np.nonzero(wsum(['leg_fl_02', 'leg_fl_03', 'leg_fr_02', 'leg_fr_03']) > 0.5)[0][::2]
HINDP = np.nonzero(wsum(['leg_hl_03', 'leg_hr_03']) > 0.5)[0][::2]


def mind(P, I, J):
    kd = KDTree(len(J))
    for k, j in enumerate(J): kd.insert(P[j], k)
    kd.balance(); return 1000 * min(kd.find(P[i])[2] for i in I)


def angles():
    pb = rig.pose.bones; out = {}
    for leg in ('fl', 'fr', 'hl', 'hr'):
        body = pb['spine_05' if leg[0] == 'f' else 'spine_01'].matrix.to_3x3(); lat = body.col[0].normalized()
        if leg[1] == 'r': lat = -lat
        s = [pb[f'leg_{leg}_{i:02d}'].tail - pb[f'leg_{leg}_{i:02d}'].head for i in (1, 2, 3)]
        ab = lambda v: round(math.degrees(math.asin(max(-1, min(1, v.normalized().dot(lat))))), 1)
        out[leg] = dict(abd1=ab(s[0]), abd2=ab(s[1]), mid=round(math.degrees((-s[0]).angle(s[1])), 1), distal_flex=round(math.degrees(s[1].angle(s[2])), 1))
    return out


def measure():
    P = ev(); r = angles()
    r['head_to_foreleg_mm'] = round(mind(P, HEAD, FORE), 1); r['hindpaw_to_foreleg_mm'] = round(mind(P, HINDP, FORE), 1)
    r['pairs'] = len(pairs_all(P)); return r


base = json.loads(Path(PARP).read_text()); C = json.loads(Path(CANDP).read_text()); res = {}
for cand in C['cands']:
    r = {}
    if 'crouch' in cand and OLDP:
        poser.reset()
        for bn, ch in OLDP['crouch'].items():
            if bn in rig.pose.bones:
                p = rig.pose.bones[bn]; p.rotation_mode = 'QUATERNION'; p.location = ch['loc']; p.rotation_quaternion = ch['rot']; p.scale = ch['scale']
        if cand['crouch'] is not None:
            for lg in ('fl', 'fr'):
                for i in (1, 2, 3): rig.pose.bones[f'leg_{lg}_{i:02d}'].rotation_quaternion = (1, 0, 0, 0)
            vl.update()
            sp = cand['crouch']; poser.solve_legs({'fl': dict(plant=1.0, **sp), 'fr': dict(plant=1.0, **sp), 'hl': {'plant': 0.0}, 'hr': {'plant': 0.0}})
        vl.update(); r['crouch_deep'] = measure()
    if C.get('frames'):
        spd = dict(base.get('sig.horns-first-descent', {}), **cand.get('sig', {}))
        _, fn, _, _, _ = LC.make_sig(spd)
        for f in C['frames']:
            poser.reset(); poser.pin_local = None; poser.apply(fn(f * 1000.0 / 30)); vl.update(); r[f'sig_{f}'] = measure()
    res[cand['name']] = r
    print('P5', cand['name'], json.dumps(r), flush=True)
Path(OUTP).write_text(json.dumps(res, indent=1))
print('P5 done', flush=True)
