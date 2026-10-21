"""How rigid is the folded ear? Best-fit rigid transform (Kabsch) of each ear's blade from rest to a pose,
and the residual per vertex: max and 95th percentile, and where on the ear it sits (distance from the root
hinge along the ear's rest axis, as a share of the ear's length).

  python art/species-construction/anim/ear_rigidity.py --probe <probe dir> --rig <rig dir> [--pose ears_flat_back]
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import rig_core as rc  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('--probe', type=Path, required=True)
p.add_argument('--rig', type=Path, required=True)
p.add_argument('--pose', default='ears_flat_back')
a = p.parse_args()
rig = json.loads((a.rig/'rig.json').read_text())
J = json.loads((a.rig/'joints.json').read_text())
s, off = rig['transform']['scale'], np.array(rig['transform']['offset'])
rest = s*(np.load(a.probe/'skin.npz')['verts'].astype(float)-off)
wt = np.load(a.rig/'weights.npz')
idx = wt['idx'].astype(int)
w = np.round(wt['w'].astype(float)*4096)/4096
w /= w.sum(1, keepdims=True)
keys = json.loads((a.rig/'correctives.json').read_text())['keys']
cz = np.load(a.rig/'correctives.npz')
deltas = {k['name']: (cz[k['name']+'__ids'], cz[k['name']+'__delta'].astype(float)) for k in keys}
pose = json.loads((a.rig/'poses.json').read_text())[a.pose]
P, _, vals = rc.posed_skin(rest, idx, w, J, pose['pose'], 0., keys, deltas)
NI = {b: i for i, b in enumerate(rc.ANIM_NAMES)}
dense = np.zeros((len(rest), len(NI)))
np.put_along_axis(dense, idx, w, 1)
out = {}
for sd in ('L', 'R'):
    ear = dense[:, [NI[f'ear_{k}.{sd}'] for k in range(1, rc.EAR_BONES+1)]].sum(1)
    for label, sel in (('blade (ear weight 1.0)', ear > .999), ('blade and base band (ear weight > 0.5)', ear > .5)):
        X, Y = rest[sel], P[sel]
        cx, cy = X.mean(0), Y.mean(0)
        U, S, Vt = np.linalg.svd((X-cx).T@(Y-cy))
        dsign = np.sign(np.linalg.det(Vt.T@U.T))
        R = Vt.T@np.diag([1, 1, dsign])@U.T
        res = np.linalg.norm((X-cx)@R.T+cy-Y, axis=1)
        root = np.array(J[f'ear0.{sd}'])
        axis = np.array(J[f'ear{rc.EAR_BONES}.{sd}'])-root
        along = (X-root)@axis/(axis@axis)
        worst = np.argsort(-res)[:200]
        out[f'{sd} {label}'] = dict(vertices=int(sel.sum()), max_mm=round(float(res.max())*1000, 3),
                                    p95_mm=round(float(np.quantile(res, .95))*1000, 3),
                                    worst_200_along_ear=[round(float(np.quantile(along[worst], q)), 2) for q in (.1, .5, .9)],
                                    worst_200_ear_weight=[round(float(np.quantile(ear[sel][worst], q)), 3) for q in (.1, .5, .9)])
print(json.dumps(dict(pose=a.pose, keys={k: round(v, 3) for k, v in vals.items() if v > 0}, ears=out), indent=1))
