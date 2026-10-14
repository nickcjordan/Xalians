"""Hypnopet's test skeleton for the readiness rig test (experiment X31), from the v5 blockout's joint points.

    python art/studio/blockout/hypnopet/skeleton.py --out <skeleton.json>

The limbs, tail and neck are sweeps through named points (hip, knee, hock, heel; shoulder, elbow, wrist, paw), so
those points are the joints. The foot, ear and jaw bones follow the masses and the ear plate. Left side bones (+x)
carry "mirror": the rig test adds the right copies. "snap" gives the limb radius at a joint: the rig test moves
that joint to the centroid of the mesh cross-section there, so the same skeleton fits a body built another way.
Spine, neck and head joints sit deep in the body and are not snapped. Format: art/studio/readiness/README.md.
"""
import argparse
import json
from pathlib import Path


def bone(name, head, tail, parent=None, chain='core', mirror=False, snap=None, connect=True):
    return {'name': name, 'head': head, 'tail': tail, 'parent': parent, 'chain': chain, 'mirror': mirror,
            'snap': snap or {}, 'connect': connect and parent is not None}


# Joints placed by hand on the reconstructed body (body-recon-4) from side slices and the ear's principal axis
# (experiment X31): the authored joints did not fit it. Its haunch sits about 4 cm further forward and is
# larger, its shin drops nearly straight to a hock at the back, and its ears hang almost straight down instead
# of sweeping back.
RECON4 = {
    'hind': [[0.09, 0.13, 0.2], [0.105, 0.185, 0.135], [0.11, 0.2, 0.065], [0.112, 0.195, 0.03],
             [0.118, 0.085, 0.025], [0.118, 0.045, 0.02]],
    'ear': [[0.1, -0.08, 0.51], [0.16, -0.075, 0.39], [0.2, -0.062, 0.25], [0.235, -0.05, 0.105]],
}


def skeleton(fit=None):
    hip, knee, hock, heel = [0.06, 0.17, 0.17], [0.07, 0.218, 0.115], [0.078, 0.23, 0.075], [0.085, 0.226, 0.048]
    ball, toe = [0.09, 0.1, 0.035], [0.09, 0.058, 0.028]
    sh, elbow, wrist, paw, ftoe = [0.05, -0.095, 0.24], [0.048, -0.098, 0.15], [0.048, -0.094, 0.075], \
        [0.05, -0.098, 0.035], [0.052, -0.15, 0.025]
    t = [[0, 0.17, 0.258], [0, 0.195, 0.265], [0, 0.215, 0.274], [0, 0.232, 0.284]]
    e = [[0.1, -0.055, 0.51], [0.145, -0.02, 0.405], [0.19, 0.025, 0.27], [0.24, 0.07, 0.105]]
    if fit:
        hip, knee, hock, heel, ball, toe = fit['hind']
        e = fit['ear']
    b = [
        bone('pelvis', [0, 0.17, 0.225], [0, 0.06, 0.232]),
        bone('spine', [0, 0.06, 0.232], 'chest_head', 'pelvis'),
        bone('chest', [0, -0.05, 0.24], [0, -0.08, 0.27], 'spine'),
        bone('neck', [0, -0.08, 0.27], [0, -0.115, 0.36], 'chest'),
        bone('head', [0, -0.115, 0.36], [0, -0.13, 0.5], 'neck'),
        bone('jaw', [0, -0.15, 0.385], [0, -0.215, 0.348], 'head', chain='jaw', connect=False),
        bone('thigh', hip, knee, 'pelvis', 'hind', True, {'tail': 0.042}, connect=False),
        bone('shin', knee, hock, 'thigh', 'hind', True, {'tail': 0.038}),
        bone('ankle', hock, heel, 'shin', 'hind', True, {'tail': 0.035}),
        bone('foot', heel, ball, 'ankle', 'hind', True, {'tail': 0.03}),
        bone('toes', ball, toe, 'foot', 'hind', True),
        bone('upperarm', sh, elbow, 'chest', 'fore', True, {'tail': 0.032}, connect=False),
        bone('forearm', elbow, wrist, 'upperarm', 'fore', True, {'tail': 0.027}),
        bone('hand', wrist, paw, 'forearm', 'fore', True, {'tail': 0.026}),
        bone('paw', paw, ftoe, 'hand', 'fore', True),
        bone('tail1', t[0], t[1], 'pelvis', 'tail', snap={'tail': 0.021}, connect=False),
        bone('tail2', t[1], t[2], 'tail1', 'tail', snap={'tail': 0.017}),
        bone('tail3', t[2], t[3], 'tail2', 'tail'),
        bone('ear1', e[0], e[1], 'head', 'ear', True, {'tail': 0.05}, connect=False),
        bone('ear2', e[1], e[2], 'ear1', 'ear', True, {'tail': 0.06}),
        bone('ear3', e[2], e[3], 'ear2', 'ear', True),
    ]
    b[1]['tail'] = b[2]['head']
    src = 'v5 blockout joint points (make_spec.py V5)'+(', hind legs and ears placed on body-recon-4' if fit else '')
    return {'creature': 'hypnopet', 'source': src, 'bones': b,
            'separate': {'eye-left': 'head', 'eye-right': 'head'}, 'poses': POSES}


# Fixed test poses: [bone, world axis, degrees] (or [bone, 'move', [dx, dy, dz]] in meters), applied parent
# first, each about the bone's posed head. The
# creature faces -y with its left at +x, so +x turns a hanging limb backward, +z turns the head to its left, and
# -x on the head lifts the face.
POSES = {
    'stride': [['thigh_L', 'x', 22], ['ankle_L', 'x', 15], ['foot_L', 'x', -25],
               ['thigh_R', 'x', -30], ['shin_R', 'x', 40], ['ankle_R', 'x', -20], ['foot_R', 'x', 10],
               ['upperarm_L', 'x', -28], ['forearm_L', 'x', 45], ['hand_L', 'x', 20],
               ['upperarm_R', 'x', 22], ['hand_R', 'x', -15],
               ['tail1', 'z', 20], ['neck', 'x', 8]],
    'crouch': [['pelvis', 'move', [0, 0.01, -0.045]], ['pelvis', 'x', -10],
               ['thigh_L', 'x', -50], ['shin_L', 'x', 85], ['ankle_L', 'x', -40], ['foot_L', 'x', 15],
               ['thigh_R', 'x', -50], ['shin_R', 'x', 85], ['ankle_R', 'x', -40], ['foot_R', 'x', 15],
               ['upperarm_L', 'x', 10], ['upperarm_R', 'x', 10], ['tail1', 'x', -30], ['tail2', 'x', -20]],
    'look': [['neck', 'z', 30], ['neck', 'x', -10], ['head', 'z', 15], ['head', 'x', -15], ['jaw', 'x', 25],
             ['ear1_L', 'y', -15], ['ear1_R', 'y', 15], ['ear2_L', 'x', -20], ['ear2_R', 'x', -20],
             ['upperarm_L', 'x', -40], ['forearm_L', 'x', 80], ['hand_L', 'x', 40]],
    # past a normal gait, to find where each body gives out: deep folds at the knee, elbow and neck
    'extreme': [['thigh_L', 'x', -70], ['shin_L', 'x', 110], ['ankle_L', 'x', -60],
                ['upperarm_R', 'x', -60], ['forearm_R', 'x', 120], ['hand_R', 'x', 60],
                ['neck', 'z', 50], ['head', 'x', -30], ['jaw', 'x', 35], ['tail1', 'z', 45], ['tail2', 'z', 30]],
}


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--fit', choices=['recon4'], help='use joints placed on that body for the hind legs and ears')
    a = ap.parse_args()
    a.out.parent.mkdir(parents=True, exist_ok=True)
    a.out.write_text(json.dumps(skeleton(RECON4 if a.fit else None), indent=1), encoding='utf-8')
    print('wrote', a.out)
