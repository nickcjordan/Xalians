"""Hypnopet's test skeleton and poses for the sculpt-stage body (sculpt-14 onward), for the deformation audit.

    python art/studio/blockout/hypnopet/rig_sculpt.py --out <skeleton.json>

Joints are placed by the orchestrator over side, front and top slices of the body against rabbit skeleton photos
(research/hypnopet/NOTES.md, hind-limb and forepaw sheets), and revised after the independent critic's audit of
audit-2 (2026-10-23):
- spine in the dorsal third of the trunk, the pelvis root inside the rump;
- hip in the upper rear of the haunch; femur forward and down to a knee at the haunch's front, near the belly;
  tibia back and down to a hock low at the back; the tarsus and metatarsals from the hock forward along the ground
  (no vertical "ankle" bone pivoting on the sole: a rabbit's metatarsals start at the hock);
- the head bone runs from the atlas to the snout so the muzzle and upper lip ride on the head, a skull bone to the
  crown, the jaw hinge behind the mouth corner (audit-2: the jaw carried the nose);
- forelimb: shoulder inside the chest, elbow tucked at the chest line, forearm down to the wrist;
- ear chain from a root on the side of the crown over the arch and down the blade's medial line, four bones (a
  lop ear: stiff root tube, one fold, a blade that bends along its length);
- a two-bone tail stub.
Poses keep planted feet planted by solving the leg angles with the same forward kinematics the rig test uses
(world-axis rotations about each bone's posed head, parents first), and stay inside LIMITS, which are set from the
rest pose's own joint angles and the reference ranges (stifle 54 to 132, hock 66 to 137, hip a 74 degree span).
Flexion signs in this rig: hip, shoulder and elbow flex with negative x; the knee flexes with positive x; the hock
flexes with negative x on the tarsus.
"""
import argparse
import json
import math
from pathlib import Path

import numpy as np

# hind leg on sculpt-31's slices (audit-9 critic: the shin ran 5.6 cm in front of the shank through the air notch
# under the haunch): the knee at the front of the haunch; the hock at the bottom of the shank column (centered
# x 0.076, y 0.21 from z 0.07 to 0.12), where it meets the foot; the metatarsals forward along the foot (centered
# x 0.09 to 0.10 after warps-7 moved the feet in; warps-9 narrowed the foot about x 0.10)
# the knee 1 cm higher than the first placement, so the straight shin clears the tip of the air notch under the
# haunch by about 6 mm rather than 2 (audit-12 critic)
HIND = {'hip': [0.08, 0.175, 0.205], 'knee': [0.098, 0.118, 0.152], 'hock': [0.077, 0.212, 0.075],
        'tarsus': [0.0845, 0.185, 0.045], 'ball': [0.0959, 0.075, 0.025], 'toe': [0.0967, 0.045, 0.02]}
# the paw and toe joints follow warps-8's shorter forepaw (y about -0.1 scaled by 0.85)
FORE = {'shoulder': [0.045, -0.11, 0.26], 'elbow': [0.05, -0.08, 0.185], 'wrist': [0.048, -0.095, 0.07],
        'paw': [0.05, -0.104, 0.035], 'toe': [0.052, -0.151, 0.025]}
# the toe bone ends inside the second toe: on the foot's midline it fell in the split between the middle toes
# (sculpt-27 toes; audit-6 found it outside the skin)
# the blade joints sit on its thickest line, found as the deepest inside point of each horizontal slice of the
# grid (re-measured on grid-skin-5f after warps-9's 15 degree rake and 3 degree swing): a lop ear is cupped, so a slice's centroid falls in the cup, outside the skin (audit-3)
# the root in the ear's root where it joins the crown (audit-9 critic: ear1 sat in the air notch under the arch),
# then the outer shoulder of the arch, along the root tube's center line (audit-12: 1.2 cm low, it pivoted the ear on
# the tube's lower front edge)
EAR = [[0.065, -0.085, 0.522], [0.118, -0.08, 0.522], [0.168, -0.065, 0.42], [0.213, -0.009, 0.28], [0.219, 0.038, 0.11]]


def bone(name, head, tail, parent=None, chain='core', mirror=False, connect=True):
    return {'name': name, 'head': list(head), 'tail': list(tail), 'parent': parent, 'chain': chain, 'mirror': mirror,
            'snap': {}, 'connect': connect and parent is not None}


def bones():
    H, F, E = HIND, FORE, EAR
    return [
        # the spine 1.5 cm higher than the first placement, about a quarter of the trunk's depth under the back
        # (audit-12: at 35 percent a back arch would over-compress the back)
        bone('pelvis', [0, 0.19, 0.262], [0, 0.075, 0.272]),
        bone('spine', [0, 0.075, 0.272], [0, -0.05, 0.272], 'pelvis'),
        bone('chest', [0, -0.05, 0.272], [0, -0.085, 0.295], 'spine'),
        bone('neck', [0, -0.085, 0.285], [0, -0.12, 0.37], 'chest'),
        bone('head', [0, -0.12, 0.37], [0, -0.255, 0.405], 'neck'),
        bone('skull', [0, -0.13, 0.40], [0, -0.13, 0.52], 'head', connect=False),
        # the back of the cranium (to y -0.05) is 5 to 8 cm behind the skull bone; without a core bone there the ear
        # chains owned it and creased it when the ears moved (audit-9)
        bone('occiput', [0, -0.12, 0.44], [0, -0.07, 0.455], 'head', connect=False),
        # the jaw carries only what lies below the lip line: the gap's midline at the front, the mouth corner (kept
        # under the opening's roof, 0.375 to 0.381 there), then back along the cheek to below the hinge (sculpt-18
        # mouth; heat weights put jaw weight in the upper lip); the fade is 7 mm either side, so the mouth's back wall
        # stretches evenly when the jaw opens (audit-8: a 4 mm fade creased it into a ragged curtain); and nothing
        # below the chin and the top of the throat (audit-9: the jaw dragged the throat down to z 0.30 in a V crease).
        # The hinge sits higher and further back, behind and above the mouth corners (audit-9 critic); the tip in the
        # chin, under the deeper mouth of sculpt-37
        # (lines and tip moved by sculpt.py's lower-face map with the sculpt, sculpt-48)
        dict(bone('jaw', [0, -0.162, 0.388], [0, -0.232, 0.3314], 'head', chain='jaw', connect=False),
             weightBelow=[[-0.40, 0.355], [-0.255, 0.363], [-0.240, 0.3701], [-0.229, 0.3754], [-0.215, 0.3736],
                          [-0.200, 0.3701], [-0.150, 0.3604], [0.20, 0.355]],
             weightAbove=[[-0.40, 0.295], [-0.235, 0.312], [-0.200, 0.3278], [-0.160, 0.3428], [0.20, 0.35]],
             weightRamp=0.007),
        bone('thigh', H['hip'], H['knee'], 'pelvis', 'hind', True, connect=False),
        bone('shin', H['knee'], H['hock'], 'thigh', 'hind', True),
        bone('ankle', H['hock'], H['tarsus'], 'shin', 'hind', True),
        bone('foot', H['tarsus'], H['ball'], 'ankle', 'hind', True),
        bone('toes', H['ball'], H['toe'], 'foot', 'hind', True),
        bone('upperarm', F['shoulder'], F['elbow'], 'chest', 'fore', True, connect=False),
        bone('forearm', F['elbow'], F['wrist'], 'upperarm', 'fore', True),
        bone('hand', F['wrist'], F['paw'], 'forearm', 'fore', True),
        bone('paw', F['paw'], F['toe'], 'hand', 'fore', True),
        # the tail stub follows the sculpt's tail ball down and into the rump (sculpt-32, sculpt-37)
        bone('tail1', [0, 0.196, 0.242], [0, 0.222, 0.243], 'pelvis', 'tail', connect=False),
        bone('tail2', [0, 0.222, 0.243], [0, 0.238, 0.244], 'tail1', 'tail'),
        bone('ear1', E[0], E[1], 'skull', 'ear', True, connect=False),
        bone('ear2', E[1], E[2], 'ear1', 'ear', True),
        bone('ear3', E[2], E[3], 'ear2', 'ear', True),
        bone('ear4', E[3], E[4], 'ear3', 'ear', True),
    ]


def mirrored(bs):
    out = []
    for b in bs:
        if not b['mirror']:
            out.append(dict(b))
            continue
        for side, sx in (('L', 1), ('R', -1)):
            c = dict(b)
            c['name'] = f"{b['name']}_{side}"
            c['head'] = [sx*b['head'][0], *b['head'][1:]]
            c['tail'] = [sx*b['tail'][0], *b['tail'][1:]]
            if b['parent'] and any(o['name'] == b['parent'] and o['mirror'] for o in bs):
                c['parent'] = f"{b['parent']}_{side}"
            out.append(c)
    return out


def rot(axis, deg):
    k = np.asarray(axis, float)
    k = k/np.linalg.norm(k)
    a = math.radians(deg)
    K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
    return np.eye(3)+math.sin(a)*K+(1-math.cos(a))*K@K


def fk(bs, steps, transforms=False):
    """Posed (head, tail) per bone, with the rig test's semantics: steps sorted by bone order, each a world-axis
    rotation about the bone's posed head (or a parent-frame axis 'px'), carried down to its descendants. With
    transforms, also each bone's (R, t), which carries a rest point rigidly with that bone."""
    names = [b['name'] for b in bs]
    kids = {n: [] for n in names}
    for b in bs:
        if b['parent']:
            kids[b['parent']].append(b['name'])
    R = {n: np.eye(3) for n in names}
    t = {n: np.zeros(3) for n in names}
    rest = {b['name']: (np.array(b['head'], float), np.array(b['tail'], float)) for b in bs}
    by = {b['name']: b for b in bs}

    def desc(n):
        out = [n]
        for c in kids[n]:
            out += desc(c)
        return out

    for name, axis, val in sorted(steps, key=lambda s: names.index(s[0])):
        h = R[name]@rest[name][0]+t[name]
        if axis == 'move':
            M, off = np.eye(3), np.asarray(val, float)
        else:
            a = np.array({'x': (1, 0, 0), 'y': (0, 1, 0), 'z': (0, 0, 1)}[axis[-1]], float)
            if axis[0] == 'p' and by[name]['parent']:
                a = R[by[name]['parent']]@a
            M = rot(a, val)
            off = h-M@h
        for d in desc(name):
            R[d] = M@R[d]
            t[d] = M@t[d]+off
    out = {n: (R[n]@rest[n][0]+t[n], R[n]@rest[n][1]+t[n]) for n in names}
    return (out, {n: (R[n], t[n]) for n in names}) if transforms else out


def solve(bs, base, free, targets, x0=None):
    """Angles for the `free` (bone, axis) pairs that put each target bone's posed point (head or tail) on its goal,
    with `base` steps applied first. Least squares by a small Gauss-Newton loop."""
    x = np.zeros(len(free)) if x0 is None else np.asarray(x0, float)

    def resid(xv):
        p = fk(bs, base+[[b, a, float(v)] for (b, a), v in zip(free, xv)])
        return np.concatenate([p[n][0 if end == 'head' else 1]-np.asarray(g, float) for n, end, g in targets])
    for _ in range(60):
        r = resid(x)
        J = np.stack([(resid(x+np.eye(len(x))[i]*0.05)-r)/0.05 for i in range(len(x))], axis=1)
        dx = np.linalg.lstsq(J, -r, rcond=None)[0]
        x = x+np.clip(dx, -10, 10)
        if np.abs(dx).max() < 1e-4:
            break
    return [round(float(v), 2) for v in x], float(np.abs(resid(x)).max())


def joint_angle(a, b, c):
    u, v = np.asarray(a)-np.asarray(b), np.asarray(c)-np.asarray(b)
    return math.degrees(math.acos(np.clip(u@v/np.linalg.norm(u)/np.linalg.norm(v), -1, 1)))


def poses_and_limits():
    bs = mirrored(bones())
    rest = fk(bs, [])
    plant_hind = lambda s, drop=0.0: [(f'ankle_{s}', 'head', rest[f'ankle_{s}'][0]+np.array([0, 0.008, -drop])),  # noqa: E731
                                      (f'foot_{s}', 'tail', rest[f'foot_{s}'][1])]
    plant_fore = lambda s: [(f'hand_{s}', 'head', rest[f'hand_{s}'][0]), (f'paw_{s}', 'tail', rest[f'paw_{s}'][1])]  # noqa: E731
    report = {}
    # crouch: the whole body down 3.5 cm, level, the head lifted a little by the neck, all four feet planted, so the
    # elbows flex as the chest lowers (audit-9 critic: tipping the hips 10 degrees nose-up made a sit-back on locked
    # forelegs; tipping it nose-down took the shoulder past its limit)
    base = [['pelvis', 'move', [0, 0.0, -0.035]], ['neck', 'x', -3], ['tail1', 'x', -25], ['tail2', 'x', -15]]
    crouch = list(base)
    for s in ('L', 'R'):
        # the hock lowers 6 mm toward the ground as a real crouch folds the leg (audit-12: with the hock held at its
        # standing height the shank lay flat over the air under the haunch; 2.2 cm put the heel through the floor, 1 cm grazed it)
        ang, err = solve(bs, crouch, [(f'thigh_{s}', 'x'), (f'shin_{s}', 'x'), (f'ankle_{s}', 'x')], plant_hind(s, 0.006))
        crouch += [[f'thigh_{s}', 'x', ang[0]], [f'shin_{s}', 'x', ang[1]], [f'ankle_{s}', 'x', ang[2]]]
        report[f'crouch hind {s}'] = err
        ang, err = solve(bs, crouch, [(f'upperarm_{s}', 'x'), (f'forearm_{s}', 'x'), (f'hand_{s}', 'x')], plant_fore(s))
        crouch += [[f'upperarm_{s}', 'x', ang[0]], [f'forearm_{s}', 'x', ang[1]], [f'hand_{s}', 'x', ang[2]]]
        report[f'crouch fore {s}'] = err
    # stride: the stance legs stay on the ground: the left hind in mid-stance, the right fore trailing (solved like
    # the crouch: the toe 4 cm back, the wrist lifting); the swing legs are
    # posed freely, the right hind swinging forward folded and the left fore reaching forward with the elbow bent
    # the reaching forepaw hangs curled at the wrist (audit-9: bent up 25 degrees it showed its sole). The paw's angle
    # is the sum of shoulder, elbow and wrist, and the wrist curls with +x in this rig (audit-12: -20 bent it further
    # back, sole forward): -25 - 40 + 60 leaves the paw hanging level (80 folded it into the forearm, audit-13)
    stride = [['thigh_R', 'x', -25], ['shin_R', 'x', 24], ['ankle_R', 'x', -10],
              ['upperarm_L', 'x', -25], ['forearm_L', 'x', -40], ['hand_L', 'x', 60],
              ['tail1', 'z', 12], ['neck', 'x', 6]]
    goal = lambda b, end, d: (b, end, (rest[b][0 if end == 'head' else 1]+np.asarray(d, float)).tolist())  # noqa: E731
    # the left hind is in mid-stance, planted where it stands: a push-off that extends hip, knee and hock needs the
    # foot well behind the hip, which a single frame with the body still cannot give (audit-9: solving for a foot 4.5
    # to 13 cm back gave a flexed hock every time, and the hip past its limit)
    ang, err = solve(bs, stride, [('upperarm_R', 'x'), ('forearm_R', 'x'), ('hand_R', 'x')],
                     [goal('paw_R', 'tail', [0, 0.04, 0]), goal('hand_R', 'head', [0, 0.045, 0.015])])
    stride += [['upperarm_R', 'x', ang[0]], ['forearm_R', 'x', ang[1]], ['hand_R', 'x', ang[2]]]
    report['stride fore R'] = err
    poses = {
        'stride': stride,
        'crouch': crouch,
        # head turned and lifted, jaw a little wider (a laugh, not a yawn), the near ear lifted clear of the thigh it
        # swings toward (audit-4: it passed through the haunch) with its blade sagging back toward vertical along
        # its length (audit-9: posed only at the root, the blade stayed a rigid plank), the far ear hanging; no paw
        # raised on the turning side went through the muzzle in audit-3; the elbow fold is tested in extreme)
        'look': [['neck', 'z', 22], ['head', 'pz', 13], ['head', 'px', -12], ['jaw', 'x', 8],
                 ['ear1_L', 'y', -20], ['ear3_L', 'y', 4], ['ear4_L', 'y', 4], ['ear1_R', 'y', 8]],
        # the deepest folds the limits allow: the left knee and hip flexed with the foot lifted, the right elbow
        # folded with the paw lifted in front of the chest and curled down at the wrist (audit-9: a palm facing
        # forward read as a high five; audit-12: the wrist sign was wrong). The shoulder swings well forward and a
        # little out, so the elbow leaves the chest floor and the forearm folds in front of the chest (audit-12: with
        # the shoulder 10 degrees forward the folded forearm fused into the breastbone) (shoulder forward, so the forearm folds in front of
        # the chest rather than through it; audit-4 with the shoulder back: 236 faces through the chest), the neck
        # turned 50 degrees split over neck and head, the near ear lifted off the shoulder and the far ear swung
        # out so it clears the tucked leg (a lop ear drapes over a leg; it never passes through it), the tail swung
        'extreme': [['thigh_L', 'x', -38], ['shin_L', 'x', 26], ['ankle_L', 'x', -12],
                    ['upperarm_R', 'x', -45], ['upperarm_R', 'y', 10], ['forearm_R', 'x', -85], ['hand_R', 'x', 95],
                    ['neck', 'z', 32], ['head', 'pz', 18], ['head', 'px', -18], ['jaw', 'x', 12],
                    ['ear1_L', 'y', -22], ['ear2_L', 'y', -10], ['ear3_L', 'y', 10], ['ear4_L', 'y', 8],
                    ['ear1_R', 'y', 18], ['ear2_R', 'y', 8], ['ear3_R', 'y', -10], ['ear4_R', 'y', -10],
                    ['tail1', 'z', 25], ['tail2', 'z', 18]],
        'mouth-closed': [['jaw', 'x', -12]],
    }
    knee = joint_angle(HIND['hip'], HIND['knee'], HIND['hock'])
    hock = joint_angle(HIND['knee'], HIND['hock'], HIND['ball'])
    elbow = joint_angle(FORE['shoulder'], FORE['elbow'], FORE['wrist'])
    limits = {
        'thigh': {'x': [-40, 35], 'y': [-12, 12], 'z': [-12, 12],
                  'source': 'hip span about 74 deg (paca 44-118, est. for rabbit), split around the standing rest'},
        'shin': {'x': [round(knee-132), round(knee-54)],
                 'source': f'stifle 54-132 deg (paca); rest knee angle {knee:.0f}; +x flexes'},
        'ankle': {'x': [round(-(hock-40)), round(137-hock)],
                  'source': f'hock 66-137 deg in hopping (Hall et al. 2022), 40 allowed in a crouch; rest hock angle {hock:.0f}; -x flexes'},
        'foot': {'x': [-30, 30], 'source': 'est.'},
        'toes': {'x': [-30, 30], 'source': 'est.'},
        'upperarm': {'x': [-55, 35], 'y': [-12, 12], 'z': [-12, 12], 'source': 'est. from face washing and standing'},
        'forearm': {'x': [round(-(elbow-40)), round(180-elbow)],
                    'source': f'elbow folds to about 40 deg when face washing and straightens to 180; rest elbow angle {elbow:.0f}; -x flexes'},
        'hand': {'x': [-40, 100], 'source': 'est.: the carpus curls the paw under to about 100 degrees when a rabbit '
                 'tucks or grooms; extension kept to 40'},
        'neck': {'x': [-30, 30], 'z': [-45, 45], 'source': 'est.; turns past 45 are split onto the head'},
        'head': {'x': [-30, 25], 'z': [-30, 30], 'source': 'est.'},
        'jaw': {'x': [-15, 15], 'source': 'happy open mouth 15-25 deg total (dog photos); the rest is already open'},
        'skull': {'source': 'carries the crown; not posed'},
        'ear1': {'x': [-20, 20], 'y': [-25, 25], 'source': 'lop ear root: a short stiff tube'},
        'ear2': {'x': [-30, 30], 'y': [-30, 30], 'source': 'lop ear fold'},
        'ear3': {'x': [-40, 40], 'y': [-40, 40], 'source': 'lop ear blade'},
        'ear4': {'x': [-40, 40], 'y': [-40, 40], 'source': 'lop ear blade'},
        'tail1': {'x': [-30, 30], 'z': [-30, 30], 'source': 'mostly rigid stub (research/hypnopet tail)'},
        'tail2': {'x': [-25, 25], 'z': [-25, 25], 'source': 'mostly rigid stub'},
    }
    report['rest angles'] = {'knee': round(knee, 1), 'hock': round(hock, 1), 'elbow': round(elbow, 1)}
    return poses, limits, report


def skeleton():
    poses, limits, report = poses_and_limits()
    return {'creature': 'hypnopet', 'source': 'rig_sculpt.py: joints placed on sculpt-14 over slices against rabbit '
            'skeleton reference, revised after the audit-2 critic', 'bones': bones(),
            'separate': {'eye-left': 'head', 'eye-right': 'head'}, 'poses': poses, 'limits': limits,
            'solve': report}


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', type=Path, required=True)
    a = ap.parse_args()
    sk = skeleton()
    a.out.parent.mkdir(parents=True, exist_ok=True)
    a.out.write_text(json.dumps(sk, indent=1), encoding='utf-8')
    print('wrote', a.out, json.dumps(sk['solve']))
