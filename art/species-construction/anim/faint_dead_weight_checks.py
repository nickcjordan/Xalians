"""Faint fix pass 9 checks (dead weight, not a noodle): per frame of a faint bake, the numbers the brief asks for.

  python art/species-construction/anim/faint_dead_weight_checks.py <rig dir> <rest skin npz> <faint poses.json> [--out x.json]
      [--compare <other poses.json>]

Per frame: the hip height (the pelvis joint over the floor, mm) and its speed and acceleration (mm per frame, per frame
squared); the trunk's pitch (the pelvis-to-neck-base line, degrees forward of vertical in the side view) and its angular speed
(degrees per frame); the head's height over the shoulders (the head skin's centroid over the mean of the two shoulder joints,
mm, and the head joint's) and the head skin's lowest point over the floor (mm); each forearm's angle from straight down
(degrees, its elbow-to-wrist line); the lowest chest skin, near and far forearm and paw, and knee skin over the floor (mm), so
the contact frames read off the table; and the near ear's elevation in the side view and its turn in the world since the frame before. With --compare, the largest skin
vertex distance per frame between the two bakes (mm), to prove the rest pose kept.
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


def joint_world(J, pose, lift, bone, joint):
    T = rc.bone_transforms(J, pose, bones=B, root_translate=tuple(rc.lift_vec(lift)))
    return T[bone][0]@np.array(J[joint], float)+T[bone][1]


def measure(rig_dir, rest, poses):
    skin = b2.SkinSampler(rig_dir, rest)
    J = skin.J
    parts = {'head': skin.part(['head', 'jaw']), 'chest': skin.part(['chest', 'spine']),
             'armL': skin.part(['forearm.L', 'hand.L']), 'armR': skin.part(['forearm.R', 'hand.R']),
             'kneeL': skin.part(['thigh.L', 'shin.L']), 'kneeR': skin.part(['thigh.R', 'shin.R'])}
    rows = []
    for fr in poses:
        pose, lift = fr['pose'], fr['lift']
        T = rc.bone_transforms(J, pose, bones=B, root_translate=tuple(rc.lift_vec(lift)))
        jw = lambda bone, j: T[bone][0]@np.array(J[j], float)+T[bone][1]
        pel = jw('pelvis', 'pelvis')
        neckb = jw('chest', 'neck_base')
        v = neckb-pel
        pitch = math.degrees(math.atan2(-v[1], v[2]))       # forward (toward -Y) of vertical
        sh = .5*(jw('upperarm.L', 'shoulder.L')+jw('upperarm.R', 'shoulder.R'))
        Ph = parts['head'].posed(pose, lift)
        hj = jw('head', 'head_base')
        fa = {}
        for sd in 'LR':
            d = jw(f'forearm.{sd}', f'wrist.{sd}')-jw(f'forearm.{sd}', f'elbow.{sd}')
            fa[sd] = math.degrees(math.acos(max(-1., min(1., -d[2]/np.linalg.norm(d)))))
        low = {k: float(p.posed(pose, lift)[:, 2].min())*1000 for k, p in parts.items() if k != 'head'}
        rows.append(dict(frame=fr['frame'], hip_mm=pel[2]*1000, trunk_pitch=pitch, head_over_sh_mm=(Ph[:, 2].mean()-sh[2])*1000,
                         headjoint_over_sh_mm=(hj[2]-sh[2])*1000, head_low_mm=float(Ph[:, 2].min())*1000,
                         head_y_mm=float(Ph[:, 1].mean())*1000, sh_y_mm=float(sh[1])*1000,
                         forearm_L=fa['L'], forearm_R=fa['R'], chest_low_mm=low['chest'], armL_low_mm=low['armL'],
                         armR_low_mm=low['armR'], knee_low_mm=min(low['kneeL'], low['kneeR']),
                         ear_el=b2.ear_side_elevation(rc_rig(rig_dir), skin, pose), W_ear=T['ear_1.L'][0]))
    for i, r in enumerate(rows):
        p = rows[i-1] if i else r
        pp = rows[i-2] if i > 1 else p
        r['hip_v'] = r['hip_mm']-p['hip_mm']
        r['hip_a'] = r['hip_mm']-2*p['hip_mm']+pp['hip_mm']
        r['trunk_w'] = r['trunk_pitch']-p['trunk_pitch']
        r['trunk_dw'] = r['trunk_w']-(p['trunk_pitch']-pp['trunk_pitch'])
        # the near ear's turn in the world since the frame before (degrees; a rigid ear_1 swing)
        Rd = r['W_ear']@p['W_ear'].T
        r['ear_swing'] = math.degrees(math.acos(max(-1., min(1., (float(np.trace(Rd))-1)/2))))
    for r in rows:
        r.pop('W_ear')
    return rows, skin


_RIG = {}


def rc_rig(rig_dir):
    if rig_dir not in _RIG:
        import akinza_clips as ac
        _RIG[rig_dir] = ac.Rig(rig_dir)
    return _RIG[rig_dir]


def main():
    p = argparse.ArgumentParser()
    p.add_argument('rig')
    p.add_argument('rest')
    p.add_argument('poses')
    p.add_argument('--out', default=None)
    p.add_argument('--compare', default=None)
    a = p.parse_args()
    poses = json.loads(Path(a.poses).read_text())
    rows, skin = measure(a.rig, a.rest, poses)
    if a.compare:
        other = json.loads(Path(a.compare).read_text())
        for r, f0, f1 in zip(rows, poses, other):
            d = np.linalg.norm(skin.posed(f0['pose'], f0['lift'])-skin.posed(f1['pose'], f1['lift']), axis=1)
            r['vs_compare_max_mm'] = float(d.max())*1000
    cols = [('frame', '{:>3d}'), ('hip_mm', '{:7.1f}'), ('hip_v', '{:6.1f}'), ('hip_a', '{:6.1f}'), ('trunk_pitch', '{:6.1f}'),
            ('trunk_w', '{:6.1f}'), ('trunk_dw', '{:6.1f}'), ('head_over_sh_mm', '{:7.1f}'), ('headjoint_over_sh_mm', '{:7.1f}'),
            ('head_low_mm', '{:7.1f}'), ('chest_low_mm', '{:7.1f}'), ('armL_low_mm', '{:7.1f}'), ('armR_low_mm', '{:7.1f}'),
            ('knee_low_mm', '{:6.1f}'), ('forearm_L', '{:6.1f}'), ('forearm_R', '{:6.1f}'), ('ear_el', '{:6.1f}'), ('ear_swing', '{:6.1f}')]
    if a.compare:
        cols.append(('vs_compare_max_mm', '{:7.2f}'))
    print(' '.join(c for c, _ in cols))
    for r in rows:
        print(' '.join(f.format(r[c]) for c, f in cols))
    if a.out:
        Path(a.out).write_text(json.dumps(rows, indent=1))


if __name__ == '__main__':
    main()
