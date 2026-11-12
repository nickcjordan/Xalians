"""Held fix pass 7 checks (fighting a grip outside the body): per frame of a held bake, the numbers the brief asks for.

  python art/species-construction/anim/held_grip_checks.py <rig dir> <bake dir> [--compare <other bake dir>] [--out x.json]

Per loop frame: the trunk's twist against the pelvis (the chest's yaw about the vertical against the pelvis's, degrees: the
neck-base side of the chest against the hips), the head's yaw and pitch in the world (degrees: + yaw turns the snout toward
the near side, the camera; + pitch is chin down) and against the chest, each elbow's travel out from the body (mm: the elbow
joint's sideways distance in the chest's own frame, so the trunk's lean, roll and twist do not count, against loop frame 0's), the chest's height and forward position
(mm, the chest-heave's size) and the root's. With --compare, the same numbers for another bake side by side (peaks only).
Per strain (its overshoot frame, from HELD): the head's yaw and pitch and the larger elbow travel. The feet: the planted
slide is clipset_checks_b2.py's (sole slide while planted).
"""
import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
import rig_core as rc  # noqa: E402
import akinza_clipset_b2 as b2  # noqa: E402

B = rc.ANIM_BONES


def yaw_pitch(R):
    """The snout direction (-Y of the bone frame in the world) as yaw (+ toward +X) and pitch (+ down), degrees."""
    d = R@np.array([0., -1., 0.])
    return math.degrees(math.atan2(d[0], -d[1])), math.degrees(math.atan2(-d[2], math.hypot(d[0], d[1])))


def measure(J, poses):
    rows = []
    for fr in poses:
        pose, lift = fr['pose'], fr['lift']
        T = rc.bone_transforms(J, pose, bones=B, root_translate=tuple(rc.lift_vec(lift)))
        jw = lambda bone, j: T[bone][0]@np.array(J[j], float)+T[bone][1]

        def heading(bone):
            # the bone frame's forward (-Y) projected on the floor
            d = T[bone][0]@np.array([0., -1., 0.])
            return math.degrees(math.atan2(d[0], -d[1]))
        twist = heading('chest')-heading('pelvis')
        hy, hp = yaw_pitch(T['head'][0])
        cy, cp_ = yaw_pitch(T['chest'][0])
        # the elbows in the chest's own frame (rest axes), so the trunk's lean, roll and twist do not count as the arm moving
        Rc, tc = T['chest']
        el = {sd: Rc.T@(jw(f'upperarm.{sd}', f'elbow.{sd}')-tc) for sd in 'LR'}
        mid = np.zeros(3)
        rows.append(dict(frame=fr['frame'], twist=twist, head_yaw=hy, head_pitch=hp, head_yaw_vs_chest=hy-cy, head_pitch_vs_chest=hp-cp_,
                         elbow_L_out_mm=(el['L'][0]-mid[0])*1000, elbow_R_out_mm=(mid[0]-el['R'][0])*1000,
                         chest_z_mm=float(jw('chest', 'chest')[2])*1000, chest_y_mm=float(jw('chest', 'chest')[1])*1000,
                         root_y_mm=float(lift[1])*1000 if len(lift) > 1 else 0.))
    for r in rows:
        r['elbow_L_travel_mm'] = r['elbow_L_out_mm']-rows[0]['elbow_L_out_mm']
        r['elbow_R_travel_mm'] = r['elbow_R_out_mm']-rows[0]['elbow_R_out_mm']
    return rows


def main():
    p = argparse.ArgumentParser()
    p.add_argument('rig')
    p.add_argument('bake')
    p.add_argument('--compare', default=None)
    p.add_argument('--out', default=None)
    a = p.parse_args()
    J = json.loads((Path(a.rig)/'joints.json').read_text())
    rows = measure(J, json.loads((Path(a.bake)/'held'/'poses.json').read_text()))
    cols = ['frame', 'twist', 'head_yaw', 'head_pitch', 'head_yaw_vs_chest', 'head_pitch_vs_chest', 'elbow_L_travel_mm', 'elbow_R_travel_mm',
            'chest_z_mm', 'chest_y_mm']
    print(' '.join(cols))
    for r in rows:
        print(' '.join(f'{r[c]:7.1f}' if c != 'frame' else f'{r[c]:3d}' for c in cols))
    summ = dict(twist_peak_abs=max(abs(r['twist']) for r in rows), chest_z_range_mm=max(r['chest_z_mm'] for r in rows)-min(r['chest_z_mm'] for r in rows),
                chest_y_range_mm=max(r['chest_y_mm'] for r in rows)-min(r['chest_y_mm'] for r in rows),
                elbow_L_travel_max_mm=max(r['elbow_L_travel_mm'] for r in rows), elbow_R_travel_max_mm=max(r['elbow_R_travel_mm'] for r in rows))
    strains = []
    for st in b2.HELD['strains']:
        f = (st['t0']+st['wind']+2) % b2.HELD['frames']
        hold_end = (st['t0']+st['wind']+3+st['hold']) % b2.HELD['frames']
        span = [(st['t0']+k) % b2.HELD['frames'] for k in range(st['wind']+st['hold']+8)]
        r = rows[f]
        strains.append(dict(name=st['name'], overshoot_frame=f, head_yaw=round(r['head_yaw'], 1), head_pitch=round(r['head_pitch'], 1),
                            head_yaw_peak=round(max((rows[k]['head_yaw'] for k in span), key=abs), 1),
                            head_pitch_peak=round(max(rows[k]['head_pitch'] for k in span), 1),
                            elbow_travel_peak_mm=round(max(max(rows[k]['elbow_L_travel_mm'], rows[k]['elbow_R_travel_mm']) for k in span), 1),
                            hold_end=hold_end))
    summ['strains'] = strains
    if a.compare:
        o = measure(J, json.loads((Path(a.compare)/'held'/'poses.json').read_text()))
        summ['compare'] = dict(twist_peak_abs=max(abs(r['twist']) for r in o), chest_z_range_mm=max(r['chest_z_mm'] for r in o)-min(r['chest_z_mm'] for r in o),
                               chest_y_range_mm=max(r['chest_y_mm'] for r in o)-min(r['chest_y_mm'] for r in o),
                               elbow_L_travel_max_mm=max(r['elbow_L_travel_mm'] for r in o), elbow_R_travel_max_mm=max(r['elbow_R_travel_mm'] for r in o),
                               head_yaw_abs_max=max(abs(r['head_yaw']) for r in o))
    print(json.dumps(summ, indent=1))
    if a.out:
        Path(a.out).write_text(json.dumps(dict(rows=rows, summary=summ), indent=1))


if __name__ == '__main__':
    main()
