"""Write spec.json for the Hypnopet blockout from the numbers below (meters; faces -y, left is +x, up is +z).

    python art/studio/blockout/hypnopet/make_spec.py

The numbers come from measures.json (F = 0.514 m, shoulder height 0.30 m). This script exists so the frame of
each ear plate (its normal made orthogonal to its root-to-tip axis) is computed rather than typed by hand.
"""
import json
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent


def unit(v):
    v = np.asarray(v, float)
    return v/np.linalg.norm(v)


def ear(root, tip, facing, outline, bend, thickness=0.014, rim=0.007, extend=0.025):
    """A shell whose local v runs from the tip (v = -1) to the root (v = +1) along the root-to-tip axis.
    Outline v values are in units of half the root-to-tip length; the root end is pushed `extend` farther
    so it sinks into the skull."""
    root, tip = np.asarray(root, float), np.asarray(tip, float)
    a = tip-root
    length = float(np.linalg.norm(a))
    au = a/length
    n = unit(facing)
    n = unit(n-(n@au)*au)
    center = (root+tip)/2
    half = length/2
    pts = [[u, round(v*half+(extend if v > 0.99 else 0), 4)] for u, v in outline]
    return {'center': [round(float(x), 4) for x in center], 'normal': [round(float(x), 4) for x in n],
            'up': [round(float(x), 4) for x in -au], 'outline': pts, 'smooth': 3, 'thickness': thickness,
            'rimThickness': rim, 'rimWidth': 0.03, 'bend': bend, 'bendAxis': 'u'}


def P(x, y, z, r, ratio=None):
    d = {'p': [x, y, z], 'r': r}
    if ratio is not None:
        d['ratio'] = ratio
    return d


def spec(v):
    parts = [
        {'part': 'torso', 'kind': 'mass', 'blend': 0.04,
         'params': {'center': v['torso_c'], 'radii': v['torso_r'], 'exponent': 2.2, 'rotation': v.get('torso_rot', [0, 0, 0])}},
        {'part': 'torso', 'kind': 'mass', 'blend': 0.04,
         'params': {'center': v['chest_c'], 'radii': v['chest_r'], 'exponent': 2.0}},
        {'part': 'hindlegs', 'kind': 'mass', 'mirror': 'x', 'blend': 0.04,
         'params': {'center': v['haunch_c'], 'radii': v['haunch_r'], 'exponent': 2.0, 'rotation': v.get('haunch_rot', [0, 0, 0])}},
        {'part': 'hindlegs', 'kind': 'sweep', 'mirror': 'x', 'blend': 0.03,
         'params': {'up': [0, 0, 1], 'points': v['hind']}},
        {'part': 'forelegs', 'kind': 'sweep', 'mirror': 'x', 'blend': 0.03,
         'params': {'up': [0, 0, 1], 'points': v['fore']}},
        *([{'part': 'forelegs', 'kind': 'mass', 'mirror': 'x', 'blend': 0.02,
            'params': {'center': v['forepaw_c'], 'radii': v['forepaw_r'], 'exponent': 2.3}},
           {'part': 'hindlegs', 'kind': 'mass', 'mirror': 'x', 'blend': 0.025,
            'params': {'center': v['hindfoot_c'], 'radii': v['hindfoot_r'], 'exponent': 2.3,
                       'rotation': v.get('hindfoot_rot', [0, 0, 0])}}] if 'forepaw_c' in v else []),
        {'part': 'tail', 'kind': 'sweep', 'blend': 0.02, 'params': {'points': v['tail']}},
        {'part': 'head', 'kind': 'sweep', 'blend': 0.04, 'params': {'points': v['neck']}},
        {'part': 'head', 'kind': 'mass', 'blend': 0.035,
         'params': {'center': v['skull_c'], 'radii': v['skull_r'], 'exponent': 2.0, 'rotation': v.get('skull_rot', [0, 0, 0])}},
        {'part': 'head', 'kind': 'mass', 'blend': 0.03,
         'params': {'center': v['cheek_c'], 'radii': v['cheek_r'], 'exponent': 2.0}},
        {'part': 'muzzle', 'kind': 'mass', 'blend': 0.02,
         'params': {'center': v['muzzle_c'], 'radii': v['muzzle_r'], 'exponent': 2.0}},
        {'part': 'muzzle', 'kind': 'mass', 'blend': 0.015,
         'params': {'center': v['chin_c'], 'radii': v['chin_r'], 'exponent': 2.0}},
        {'part': 'eyes', 'kind': 'mass', 'mirror': 'x', 'blend': v.get('eye_blend', 0.008),
         'params': {'center': v['eye_c'], 'radii': [v['eye_r']]*3, 'exponent': 2.0}},
        {'part': 'horn', 'kind': 'sweep', 'blend': 0.012, 'params': {'points': v['horn']}},
        *([{'part': 'ears', 'kind': 'mass', 'mirror': 'x', 'blend': 0.025,
            'params': {'center': v['ear_base_c'], 'radii': v['ear_base_r'], 'exponent': 2.0,
                       'rotation': v.get('ear_base_rot', [0, 0, 0])}}] if 'ear_base_c' in v else []),
        {'part': 'ears', 'kind': 'shell', 'mirror': 'x', 'blend': 0.02,
         'params': ear(v['ear_root'], v['ear_tip'], v['ear_facing'], v['ear_outline'], v['ear_bend'])},
    ]
    return {'creature': 'hypnopet', 'version': v['version'],
            'note': 'Hypnopet blockout: the flesh under the fur, fitted to the model sheet flesh views '
                    '(art/studio/blockout/hypnopet/measures.json). Meters; shoulder height 0.30 m, skull top '
                    '(horn excluded) 0.514 m. Faces -y, its left is +x, up is +z. Eyes and ears are part of the one '
                    'skin here; the horn is a straight tapered sweep (no spiral yet). Written by make_spec.py.',
            'voxel': v['voxel'], 'parts': parts}


V = {
    'version': 'v1', 'voxel': 0.002,
    'torso_c': [0, 0.02, 0.23], 'torso_r': [0.068, 0.15, 0.072],
    'chest_c': [0, -0.075, 0.235], 'chest_r': [0.066, 0.065, 0.075],
    'haunch_c': [0.052, 0.16, 0.2], 'haunch_r': [0.062, 0.09, 0.105],
    'hind': [P(0.055, 0.17, 0.17, 0.055), P(0.065, 0.25, 0.11, 0.04), P(0.072, 0.275, 0.06, 0.034),
             P(0.078, 0.255, 0.034, 0.036, 0.8), P(0.08, 0.18, 0.033, 0.042, 0.78), P(0.08, 0.13, 0.033, 0.04, 0.78),
             P(0.08, 0.10, 0.03, 0.03, 0.8)],
    'fore': [P(0.05, -0.085, 0.24, 0.04), P(0.047, -0.08, 0.15, 0.028), P(0.047, -0.072, 0.07, 0.023),
             P(0.049, -0.08, 0.03, 0.027, 0.75), P(0.05, -0.12, 0.024, 0.032, 0.7), P(0.051, -0.135, 0.022, 0.028, 0.75)],
    'tail': [P(0, 0.17, 0.255, 0.026), P(0, 0.21, 0.265, 0.022), P(0, 0.24, 0.278, 0.019), P(0, 0.255, 0.288, 0.014)],
    'neck': [P(0, -0.12, 0.36, 0.05), P(0, -0.1, 0.31, 0.055), P(0, -0.08, 0.26, 0.06)],
    'skull_c': [0, -0.15, 0.43], 'skull_r': [0.077, 0.08, 0.085],
    'cheek_c': [0, -0.18, 0.37], 'cheek_r': [0.058, 0.06, 0.055],
    'muzzle_c': [0, -0.235, 0.39], 'muzzle_r': [0.03, 0.035, 0.028],
    'chin_c': [0, -0.215, 0.345], 'chin_r': [0.032, 0.03, 0.02],
    'eye_c': [0.049, -0.195, 0.43], 'eye_r': 0.03,
    'horn': [P(0, -0.135, 0.49, 0.026), P(0, -0.142, 0.54, 0.022), P(0, -0.152, 0.585, 0.016),
             P(0, -0.164, 0.62, 0.01), P(0, -0.175, 0.645, 0.005), P(0, -0.18, 0.655, 0.003)],
    'ear_root': [0.045, -0.11, 0.48], 'ear_tip': [0.225, 0.035, 0.105], 'ear_facing': [-0.6, -1, 0],
    'ear_outline': [[0.025, 1.0], [0.045, 0.75], [0.06, 0.25], [0.064, -0.28], [0.055, -0.65], [0.03, -0.93], [0, -1.0],
                    [-0.03, -0.93], [-0.055, -0.65], [-0.064, -0.28], [-0.06, 0.25], [-0.045, 0.75], [-0.025, 1.0]],
    'ear_bend': 7.0,
}

VERSIONS = {'v1': V}

# v2, from the v1 overlays: the ears were seen edge-on from the side (turn the plate to 45 degrees, wider, a
# deeper cup) and had no root above the skull (an ear-base mass on the crown); skull moved back and longer so
# the ear roots sit on it; cheeks and neck slimmer; forelegs forward and thicker; hocks pulled in; lower hind
# legs slimmer; hind feet wider apart (front and back views disagree: 0.128 m against 0.08 m); feet lifted to
# the ground plane.
V2 = {**V, 'version': 'v2',
      'skull_c': [0, -0.138, 0.43], 'skull_r': [0.077, 0.09, 0.085],
      'cheek_r': [0.048, 0.055, 0.05], 'neck': [P(0, -0.12, 0.36, 0.046), P(0, -0.1, 0.31, 0.05), P(0, -0.08, 0.26, 0.058)],
      'muzzle_c': [0, -0.228, 0.39], 'chin_c': [0, -0.208, 0.345],
      'haunch_c': [0.058, 0.16, 0.2], 'haunch_r': [0.064, 0.09, 0.105],
      'hind': [P(0.06, 0.17, 0.17, 0.05), P(0.075, 0.235, 0.11, 0.034), P(0.085, 0.245, 0.065, 0.03),
               P(0.092, 0.235, 0.036, 0.034, 0.85), P(0.095, 0.17, 0.034, 0.042, 0.8), P(0.097, 0.12, 0.034, 0.04, 0.8),
               P(0.098, 0.095, 0.031, 0.03, 0.85)],
      'fore': [P(0.05, -0.095, 0.24, 0.042), P(0.048, -0.098, 0.15, 0.032), P(0.048, -0.092, 0.07, 0.027),
               P(0.05, -0.1, 0.032, 0.03, 0.75), P(0.051, -0.135, 0.026, 0.034, 0.72), P(0.052, -0.148, 0.024, 0.028, 0.8)],
      'ear_base_c': [0.058, -0.085, 0.505], 'ear_base_r': [0.032, 0.03, 0.036],
      'ear_root': [0.07, -0.08, 0.52], 'ear_tip': [0.225, 0.035, 0.105], 'ear_facing': [-1, -1, 0],
      'ear_outline': [[0.03, 1.0], [0.055, 0.75], [0.072, 0.25], [0.076, -0.28], [0.066, -0.65], [0.036, -0.93], [0, -1.0],
                      [-0.036, -0.93], [-0.066, -0.65], [-0.076, -0.28], [-0.072, 0.25], [-0.055, 0.75], [-0.03, 1.0]],
      'ear_bend': 10.0}
VERSIONS['v2'] = V2

# v3, from the v2 renders and overlays: thin rings at the wrists and ankles came from the elliptical sweep
# (ratio) running along vertical leg segments, and the toe ends read as knobs, so each leg is now a round
# sweep ending in a separate paw or foot mass. Ears rooted farther out and back, tips farther out and back,
# wider, so a gap shows between ear and face; skull longer to the rear so the ear roots sit on it; eyes sunk a
# little and blended softer; muzzle and chin narrower; neck slimmer; tail shorter; hind shanks closer in.
V3 = {**V2, 'version': 'v3',
      'skull_c': [0, -0.13, 0.43], 'skull_r': [0.077, 0.095, 0.085],
      'neck': [P(0, -0.12, 0.36, 0.042), P(0, -0.1, 0.31, 0.046), P(0, -0.08, 0.26, 0.056)],
      'muzzle_r': [0.025, 0.035, 0.027], 'chin_r': [0.028, 0.03, 0.02],
      'eye_c': [0.049, -0.19, 0.43], 'eye_blend': 0.012,
      'tail': [P(0, 0.17, 0.255, 0.024), P(0, 0.2, 0.262, 0.021), P(0, 0.225, 0.272, 0.018), P(0, 0.24, 0.28, 0.013)],
      'hind': [P(0.06, 0.17, 0.17, 0.05), P(0.07, 0.225, 0.11, 0.034), P(0.078, 0.24, 0.07, 0.028), P(0.085, 0.235, 0.04, 0.028)],
      'hindfoot_c': [0.09, 0.16, 0.032], 'hindfoot_r': [0.042, 0.1, 0.032],
      'fore': [P(0.05, -0.1, 0.24, 0.042), P(0.048, -0.105, 0.15, 0.032), P(0.048, -0.1, 0.075, 0.027), P(0.05, -0.105, 0.035, 0.026)],
      'forepaw_c': [0.052, -0.13, 0.025], 'forepaw_r': [0.034, 0.042, 0.025],
      'ear_base_c': [0.06, -0.08, 0.5], 'ear_base_r': [0.034, 0.032, 0.036],
      'ear_root': [0.08, -0.065, 0.51], 'ear_tip': [0.245, 0.06, 0.105],
      'ear_outline': [[0.032, 1.0], [0.06, 0.75], [0.08, 0.25], [0.085, -0.28], [0.074, -0.65], [0.04, -0.93], [0, -1.0],
                      [-0.04, -0.93], [-0.074, -0.65], [-0.085, -0.28], [-0.08, 0.25], [-0.06, 0.75], [-0.032, 1.0]],
      'ear_bend': 9.0}
VERSIONS['v3'] = V3

# v4, from the v3 renders and overlays: the hind foot was a flat sausage on a thin shank, so the foot is taller
# and tipped heel up (a wedge, as on the sheet) and the shank thicker; ear tips pulled in (they splayed past the
# target) and back, and the upper ear narrowed so the gap between face and ear opens; ear base moved back;
# skull rounder and the cheeks blended wider so the face loses the horse-like crease; muzzle smaller and a
# little higher; tail shorter; forelegs back a little.
V4 = {**V3, 'version': 'v4',
      'skull_c': [0, -0.13, 0.432], 'skull_r': [0.08, 0.095, 0.088],
      'cheek_c': [0, -0.17, 0.375], 'cheek_r': [0.052, 0.058, 0.05],
      'muzzle_c': [0, -0.226, 0.393], 'muzzle_r': [0.023, 0.032, 0.024],
      'chin_c': [0, -0.207, 0.35], 'chin_r': [0.026, 0.028, 0.019],
      'tail': [P(0, 0.17, 0.258, 0.024), P(0, 0.195, 0.265, 0.021), P(0, 0.215, 0.274, 0.017), P(0, 0.228, 0.282, 0.012)],
      'hind': [P(0.06, 0.17, 0.17, 0.05), P(0.07, 0.22, 0.115, 0.038), P(0.078, 0.232, 0.075, 0.034), P(0.085, 0.228, 0.045, 0.032)],
      'hindfoot_c': [0.09, 0.15, 0.04], 'hindfoot_r': [0.042, 0.1, 0.036], 'hindfoot_rot': [10, 0, 0],
      'fore': [P(0.05, -0.095, 0.24, 0.042), P(0.048, -0.098, 0.15, 0.032), P(0.048, -0.094, 0.075, 0.027), P(0.05, -0.098, 0.035, 0.026)],
      'forepaw_c': [0.052, -0.123, 0.025],
      'ear_base_c': [0.06, -0.068, 0.5],
      'ear_root': [0.08, -0.055, 0.51], 'ear_tip': [0.215, 0.085, 0.105],
      'ear_outline': [[0.03, 1.0], [0.045, 0.75], [0.066, 0.25], [0.085, -0.28], [0.076, -0.65], [0.042, -0.93], [0, -1.0],
                      [-0.042, -0.93], [-0.076, -0.65], [-0.085, -0.28], [-0.066, 0.25], [-0.045, 0.75], [-0.03, 1.0]]}
VERSIONS['v4'] = V4

# v5, from the v4 overlays: pulling the ear tips in narrowed the ears in the front view (IoU fell), so the ears
# go back out and the whole plate moves outward (root farther from the midline, bridged to the skull by a
# wider ear base) to open the gap between face and ear; the plate turns a little more to the front and is wider
# at its lower half; hind foot less tipped and taller at the toes; hind shank thicker; eyes a touch forward.
V5 = {**V4, 'version': 'v5',
      'eye_c': [0.049, -0.196, 0.43],
      'hind': [P(0.06, 0.17, 0.17, 0.05), P(0.07, 0.218, 0.115, 0.042), P(0.078, 0.23, 0.075, 0.038), P(0.085, 0.226, 0.048, 0.035)],
      'hindfoot_c': [0.09, 0.15, 0.04], 'hindfoot_r': [0.042, 0.1, 0.04], 'hindfoot_rot': [5, 0, 0],
      'ear_base_c': [0.07, -0.068, 0.505], 'ear_base_r': [0.042, 0.032, 0.036],
      'ear_root': [0.1, -0.055, 0.51], 'ear_tip': [0.24, 0.07, 0.105], 'ear_facing': [-0.85, -1, 0],
      'ear_outline': [[0.03, 1.0], [0.045, 0.75], [0.068, 0.25], [0.09, -0.28], [0.08, -0.65], [0.044, -0.93], [0, -1.0],
                      [-0.044, -0.93], [-0.08, -0.65], [-0.09, -0.28], [-0.068, 0.25], [-0.045, 0.75], [-0.03, 1.0]]}
VERSIONS['v5'] = V5

if __name__ == '__main__':
    import sys
    V = VERSIONS[sys.argv[1] if len(sys.argv) > 1 else max(VERSIONS)]
    (HERE/'spec.json').write_text(json.dumps(spec(V), indent=1), encoding='utf-8')
    print('wrote spec.json', V['version'])
