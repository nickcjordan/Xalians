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


# Track A's re-authored hind legs (experiment X32, authored-hind-3 onward): the joints are the leg sweep's own
# control points, then the foot pad and toes. Read off the spec, not measured.
AUTHORED5 = {
    'hind': [[0.105, 0.155, 0.165], [0.11, 0.19, 0.12], [0.115, 0.2, 0.068], [0.117, 0.196, 0.04],
             [0.12, 0.09, 0.03], [0.12, 0.05, 0.026]],
}



# The sculpt-stage body (sculpt-14 onward: torso 3.3 cm longer, ears swung back, hind foot longer). Joints placed
# by the orchestrator over side slices of this body against rabbit skeleton photos (research/hypnopet/hind-limb,
# forepaw): the hip in the upper rear of the haunch; the femur forward and down to a knee at the haunch's
# front-bottom, near the belly; the tibia (about 1.1 times the femur) back and down to a hock low at the back; the
# heel on the ground behind it and the metatarsals forward along the ground; the foreleg's elbow tucked at the chest
# line with the humerus inside the chest; the ear chain along the blade's measured center line from the crown root
# through the fold; a two-joint tail stub. No joint is snapped (a centroid snap pulls an anatomical knee into the
# middle of the haunch).
SCULPT14 = {
    'hind': [[0.08, 0.175, 0.205], [0.105, 0.135, 0.125], [0.115, 0.203, 0.058], [0.115, 0.207, 0.025],
             [0.12, 0.075, 0.025], [0.12, 0.045, 0.02]],
    'fore': [[0.045, -0.11, 0.26], [0.05, -0.08, 0.185], [0.048, -0.095, 0.07], [0.05, -0.105, 0.035],
             [0.052, -0.16, 0.025]],
    'ear': [[0.105, -0.085, 0.505], [0.145, -0.072, 0.44], [0.19, -0.026, 0.295], [0.233, 0.012, 0.11]],
    'tail': [[0, 0.198, 0.258], [0, 0.218, 0.266], [0, 0.234, 0.272], [0, 0.246, 0.276]],
    'spine': {'pelvis': [[0, 0.205, 0.228], [0, 0.075, 0.235]], 'chest': [[0, -0.05, 0.24], [0, -0.08, 0.27]]},
    'jaw': [[0, -0.165, 0.385], [0, -0.243, 0.336]],
    'nosnap': True,
}


def skeleton(fit=None):
    hip, knee, hock, heel = [0.06, 0.17, 0.17], [0.07, 0.218, 0.115], [0.078, 0.23, 0.075], [0.085, 0.226, 0.048]
    ball, toe = [0.09, 0.1, 0.035], [0.09, 0.058, 0.028]
    sh, elbow, wrist, paw, ftoe = [0.05, -0.095, 0.24], [0.048, -0.098, 0.15], [0.048, -0.094, 0.075], \
        [0.05, -0.098, 0.035], [0.052, -0.15, 0.025]
    t = [[0, 0.17, 0.258], [0, 0.195, 0.265], [0, 0.215, 0.274], [0, 0.232, 0.284]]
    e = [[0.1, -0.055, 0.51], [0.145, -0.02, 0.405], [0.19, 0.025, 0.27], [0.24, 0.07, 0.105]]
    pelvis, chest, jaw = [[0, 0.17, 0.225], [0, 0.06, 0.232]], [[0, -0.05, 0.24], [0, -0.08, 0.27]],         [[0, -0.15, 0.385], [0, -0.215, 0.348]]
    if fit:
        hip, knee, hock, heel, ball, toe = fit['hind']
        e = fit.get('ear', e)
        if 'fore' in fit:
            sh, elbow, wrist, paw, ftoe = fit['fore']
        t = fit.get('tail', t)
        pelvis = fit.get('spine', {}).get('pelvis', pelvis)
        chest = fit.get('spine', {}).get('chest', chest)
        jaw = fit.get('jaw', jaw)
    b = [
        bone('pelvis', pelvis[0], pelvis[1]),
        bone('spine', pelvis[1], 'chest_head', 'pelvis'),
        bone('chest', chest[0], chest[1], 'spine'),
        bone('neck', [0, -0.08, 0.27], [0, -0.115, 0.36], 'chest'),
        bone('head', [0, -0.115, 0.36], [0, -0.13, 0.5], 'neck'),
        bone('jaw', jaw[0], jaw[1], 'head', chain='jaw', connect=False),
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
    if fit and fit.get('nosnap'):
        for x in b:
            x['snap'] = {}
    src = 'v5 blockout joint points (make_spec.py V5)'+(f", replaced: {', '.join(sorted(k for k in fit if k != 'nosnap'))}" if fit else '')
    return {'creature': 'hypnopet', 'source': src, 'bones': b,
            'separate': {'eye-left': 'head', 'eye-right': 'head'}, 'poses': POSES, 'limits': LIMITS}


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
    # hips 4.5 cm lower with the hind feet planted: the thigh, shin and ankle angles are a two-link solve in the
    # side plane on the sculpt14 joints (hip to hock length kept, knee forward), so the hock and foot stay put
    # (audit-1 used angles from the old skeleton and lifted the feet off the ground)
    'crouch': [['pelvis', 'move', [0, 0.01, -0.045]], ['pelvis', 'x', -10],
               ['thigh_L', 'x', -8.3], ['shin_L', 'x', 35.3], ['ankle_L', 'x', -17],
               ['thigh_R', 'x', -8.3], ['shin_R', 'x', 35.3], ['ankle_R', 'x', -17],
               ['upperarm_L', 'x', 10], ['upperarm_R', 'x', 10], ['tail1', 'x', -30], ['tail2', 'x', -20]],
    'look': [['neck', 'z', 30], ['neck', 'x', -10], ['head', 'z', 15], ['head', 'x', -15], ['jaw', 'x', 22],
             ['ear1_L', 'y', -15], ['ear1_R', 'y', 15], ['ear2_L', 'x', -20], ['ear2_R', 'x', -20],
             ['upperarm_L', 'x', -40], ['forearm_L', 'x', 80], ['hand_L', 'x', 40]],
    # the deepest folds the reference allows (LIMITS): knee, elbow and neck at their ends of range
    'extreme': [['thigh_L', 'x', -55], ['shin_L', 'x', 75], ['ankle_L', 'x', -45],
                ['upperarm_R', 'x', -55], ['forearm_R', 'x', 110], ['hand_R', 'x', 55],
                ['neck', 'z', 50], ['head', 'x', -30], ['jaw', 'x', 22], ['tail1', 'z', 40], ['tail2', 'z', 30]],
    # the rest expression is the sheet's open smile; the rig must close it cleanly (alignment decision 15)
    'mouth-closed': [['jaw', 'x', -12]],
}

# Plausibility limits for every pose, in degrees of rotation about each world axis relative to rest (pipeline
# lesson 46: count gates are paired with real-animal limits). Sources: research/hypnopet/NOTES.md; the hock range
# from Hall et al. 2022 (rabbit hopping, PeerJ 13611: 66 to 137 degrees, about 70 swept); hip and stifle ranges
# from a rodent goniometry study (paca: hip 44 to 118, stifle 54 to 132) for orientation, rabbit values unsourced;
# elbow from face-washing photos (folds to 40 to 60 degrees); jaw from the happy-mouth dog photos (15 to 25 open);
# abduction kept small because a rabbit's limbs swing in the body's plane. Estimates are marked est.
LIMITS = {
    'thigh': {'x': [-55, 40], 'y': [-15, 15], 'z': [-15, 15], 'source': 'paca hip 44-118 (74 deg), est. for rabbit'},
    'shin': {'x': [-40, 75], 'source': 'paca stifle 54-132 (78 deg), est. for rabbit'},
    'ankle': {'x': [-50, 50], 'source': 'Hall et al. 2022 rabbit hock 66-137 deg'},
    'foot': {'x': [-30, 30], 'source': 'est. from hopping photos'},
    'toes': {'x': [-30, 30], 'source': 'est.'},
    'upperarm': {'x': [-55, 40], 'y': [-15, 15], 'z': [-15, 15], 'source': 'est. from face-washing and standing photos'},
    'forearm': {'x': [-20, 110], 'source': 'elbow folds to 40-60 deg when face washing'},
    'hand': {'x': [-40, 60], 'source': 'est.'},
    'neck': {'x': [-30, 30], 'z': [-60, 60], 'source': 'est.'},
    'head': {'x': [-35, 30], 'z': [-30, 30], 'source': 'est.'},
    'jaw': {'x': [-15, 25], 'source': 'happy open mouth 15-25 deg (dog photos); closing from the open rest'},
    'ear1': {'x': [-25, 25], 'y': [-25, 25], 'source': 'lop ear root: a short stiff tube, small range'},
    'ear2': {'x': [-45, 45], 'y': [-45, 45], 'source': 'lop ear blade flops and bends along its length'},
    'ear3': {'x': [-45, 45], 'y': [-45, 45], 'source': 'lop ear blade'},
    'tail1': {'x': [-45, 45], 'z': [-45, 45], 'source': 'est.'},
    'tail2': {'x': [-45, 45], 'z': [-45, 45], 'source': 'est.'},
}

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--fit', choices=['recon4', 'authored5', 'sculpt14'], help='use joints placed on that body')
    a = ap.parse_args()
    a.out.parent.mkdir(parents=True, exist_ok=True)
    a.out.write_text(json.dumps(skeleton({'recon4': RECON4, 'authored5': AUTHORED5, 'sculpt14': SCULPT14}.get(a.fit)), indent=1), encoding='utf-8')
    print('wrote', a.out)
