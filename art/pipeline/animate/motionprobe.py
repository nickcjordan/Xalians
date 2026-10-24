"""Fast pose probe of the signature clip from the clip code (no bake, no mesh): motion polish, pass 10.

blender -b --python motionprobe.py -- RIG.blend PARAMS.json OUT.json [VARIANTS.json]
VARIANTS.json: {"name": {param overrides for sig.horns-first-descent}, ...}; without it the params alone are probed.
Per frame 0..60: foot proxy height (leg_??_03 tail, armature z, minus its rest height), pitch proxy (spine_01 head to
spine_05 tail), hind cannon angle from vertical, fore elbow angle and its per-frame step, hind toe to nearest fore
toe distance, and an articulation speed (sum over deform bones of the per-frame local rotation change, degrees).
"""
import bpy, sys, json, math
import numpy as np
from pathlib import Path

A = sys.argv[sys.argv.index('--') + 1:]
RIG, PARP, OUTP = A[:3]; VARP = A[3] if len(A) > 3 else None
sys.path.insert(0, str(Path(__file__).resolve().parent))
_argv = sys.argv; sys.argv = ['x', '--', '/tmp/motionprobe', 'none']
import pose_rig as PR
import luceras_clips as LC
sys.argv = _argv
bpy.ops.wm.open_mainfile(filepath=RIG)
rig = bpy.data.objects['luceras_rig']; rig['controls_enabled'] = 0.0; rig.animation_data_create(); rig.animation_data.action = None
vl = bpy.context.view_layer; poser = PR.Poser(rig)
base = json.loads(Path(PARP).read_text()).get('sig.horns-first-descent', {})
variants = json.loads(Path(VARP).read_text()) if VARP else {'base': {}}
pb = rig.pose.bones; deform = [b.name for b in rig.data.bones if b.use_deform]


def hp(n): return np.array(pb[n].head)
def tp(n): return np.array(pb[n].tail)
def ang(a, b):
    c = a @ b / (np.linalg.norm(a) * np.linalg.norm(b)); return math.degrees(math.acos(max(-1, min(1, c))))


poser.reset(); vl.update(); rest_toe = {l: float(tp(f'leg_{l}_03')[2]) for l in ('fl', 'fr', 'hl', 'hr')}
out = {}
for name, ov in variants.items():
    P = dict(base, **ov); _, fn, ev, trav, T = LC.make_sig(P)
    rows = {}; prevq = None
    for f in range(0, 61):
        poser.reset(); poser.pin_local = None; poser.apply(fn(f * 1000.0 / 30)); vl.update()
        q = {n: pb[n].matrix.to_quaternion() for n in deform}
        lq = {n: (pb[n].parent.matrix.inverted() @ pb[n].matrix).to_quaternion() for n in ('leg_fl_01', 'leg_fl_02', 'leg_hl_01', 'leg_hl_02')}
        speed = 0.0 if prevq is None else sum(math.degrees(prevq[n].rotation_difference(q[n]).angle) for n in deform)
        lstep = {} if f == 0 else {n: round(math.degrees(prevlq[n].rotation_difference(lq[n]).angle), 1) for n in lq}
        prevq = q; prevlq = lq
        d = tp('spine_05') - hp('spine_01')
        toe = {l: tp(f'leg_{l}_03') for l in ('fl', 'fr', 'hl', 'hr')}
        rows[f] = dict(foot_mm={l: round(float(toe[l][2] - rest_toe[l]) * 1000, 1) for l in toe},
                       pitch=round(math.degrees(math.atan2(d[2], math.hypot(d[0], d[1]))), 1),
                       hind_cannon=round(ang(tp('leg_hl_03') - hp('leg_hl_03'), np.array((0, 0, -1.0))), 1),
                       elbow=round(180 - ang(tp('leg_fl_01') - hp('leg_fl_01'), tp('leg_fl_02') - hp('leg_fl_02')), 1),
                       hind_to_fore_mm=round(float(min(np.linalg.norm(toe['hl'] - toe['fl']), np.linalg.norm(toe['hl'] - toe['fr']))) * 1000, 1),
                       speed=round(speed, 1), local_step=lstep)
    for f in range(1, 61): rows[f]['elbow_step'] = round(rows[f]['elbow'] - rows[f - 1]['elbow'], 1)
    out[name] = dict(T={k: round(v, 1) for k, v in T.items()}, rows=rows)
    print('VARIANT', name, flush=True)
    for f in range(8, 45):
        r = rows[f]; print(f'  {f:2d} spd {r["speed"]:6.1f} p {r["pitch"]:6.1f} fl {r["foot_mm"]["fl"]:7.1f} hl {r["foot_mm"]["hl"]:7.1f} hc {r["hind_cannon"]:5.1f} el {r["elbow"]:6.1f} ({r["elbow_step"]:6.1f}) h2f {r["hind_to_fore_mm"]:6.1f} ls {r["local_step"]}', flush=True)
json.dump(out, open(OUTP, 'w'), indent=1); print('MOTIONPROBE done', flush=True)
