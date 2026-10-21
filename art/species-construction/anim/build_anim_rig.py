"""Akinza animation rig, numpy half: joints and skin weights for rig_core.ANIM_BONES on the shaved skin of
the fur of record, then the re-origin and scale to the species record's height.

  python art/species-construction/anim/build_anim_rig.py --probe <dir with skin.npz, objects.json> --out <dir>

The probe comes from probe_skin.py (run_blender.py) on fur-steps/s12-29c/surface.blend. Writes into --out:
joints-source.json (source units, the figure 1.8605 tall, floor at z -.957), joints.json (meters, origin
on the ground under the pelvis), weights.npz (idx, w per skin vertex, indices into ANIM_NAMES), rig.json
(scale, offset, height rule, bone list, weight stats).
"""
import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import rig_core as rc  # noqa: E402

ROOT = HERE.parents[2]
RECORD = ROOT/'docs/species-templates/v5/akinza.json'

p = argparse.ArgumentParser()
p.add_argument('--probe', type=Path, required=True)
p.add_argument('--out', type=Path, required=True)
p.add_argument('--eye-clear', type=float, default=.02)
a = p.parse_args()
a.out.mkdir(parents=True, exist_ok=True)
t0 = time.time()
d = np.load(a.probe/'skin.npz')
skin = d['verts'].astype(np.float64)
edges = d['edges']
objs = json.loads((a.probe/'objects.json').read_text())


def centre(o):
    return np.mean(o['bounds'], 0)


claws = {'fore': np.array([centre(o) for o in objs if 'fore claw -1' in o['name']]),
         'hind': np.array([centre(o) for o in objs if 'hind claw -1' in o['name']])}
mouth = next(o for o in objs if o['name'].startswith('head_closed_mouth'))
mouth_z = float(np.mean([mouth['bounds'][0][2], mouth['bounds'][1][2]]))
eyes = [centre(o) for o in objs if o['name'].startswith('head_eye_globe_')]
eye_r = [float(np.ptp(np.array(o['bounds']), 0).max()/2) for o in objs if o['name'].startswith('head_eye_globe_')]

joints = rc.derive_anim_joints(skin, edges, claws, mouth_z=mouth_z)
(a.out/'joints-source.json').write_text(json.dumps(joints, indent=1))
print('joints', round(time.time()-t0, 1), flush=True)
idx, w = rc.compute_anim_weights(skin, edges, joints, eye_centres=eyes, eye_clear=max(eye_r)+a.eye_clear)
print('weights', round(time.time()-t0, 1), flush=True)

record = json.loads(RECORD.read_text(encoding='utf-8'))
band = record['physiology']['size']['heightCm']
ref_cm = (band[0]+band[1])/2
s, off = rc.anim_transform(joints, ref_cm/100)
out_j = rc.transform_joints(joints, s, off)
(a.out/'joints.json').write_text(json.dumps(out_j, indent=1))
np.savez_compressed(a.out/'weights.npz', idx=idx, w=w)
used = np.bincount(idx[w > 1e-6].ravel(), minlength=len(rc.ANIM_NAMES))
(a.out/'rig.json').write_text(json.dumps({
    'skeleton': 'rig_core.ANIM_BONES',
    'bones': [list(b) for b in rc.ANIM_BONES],
    'joints': len(rc.ANIM_BONES),
    'transform': {'rule': "x' = scale*(x-offset); offset is the ground point under the pelvis joint",
                  'scale': s, 'offset': off.tolist(), 'sourceHeight': rc.FIXED_HEIGHT,
                  'heightCm': ref_cm, 'heightRule': 'reference = middle of the record heightCm band '
                  f'{band}, measured floor to the top of the ear fan (the construction loop\'s fixed figure height)'},
    'skin': {'vertices': len(skin), 'source': 'fur-steps/s12-29c/surface.blend akinza_continuous_construction'},
    'mouthZ': mouth_z, 'eyeCentres': [list(map(float, e)) for e in eyes], 'eyeClear': max(eye_r)+a.eye_clear,
    'verticesPerBone': {b: int(used[i]) for i, b in enumerate(rc.ANIM_NAMES)},
    'seconds': round(time.time()-t0, 1)}, indent=1))
print('done', round(time.time()-t0, 1))
