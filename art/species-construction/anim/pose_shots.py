"""Posed skins for review shots (numpy half; render_shots.py renders them, compose_pass6.py draws the sheets).

  python art/species-construction/anim/pose_shots.py --rig <rig dir> --skin <skin.npz> --out <dir> [--tag p6]
      [--e 0,.3,.5,.7,1] [--no-keys]

skin.npz holds the shaved skin in source units ('src'), as written by the diagnosis export (export_skin.py). For
each crouch share e the rig's planted-feet crouch (poses.json night_stalk recipe, rig_core.plant_legs) is posed
with dual quaternions plus the rig's corrective keys (or none with --no-keys) and saved as <out>/<tag>_e<NNN>.npy
(source units), with the posed joints in <out>/<tag>_shots.json. Also writes weight-colour arrays
<tag>_col_weights.npy (pelvis blue, glutes light blue, thighs amber, shins brown, tails dark, tail root white)
and <tag>_col_thigh.npy (thigh share of thigh+glute+pelvis: navy 0 to amber 1).
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
p.add_argument('--rig', type=Path, required=True)
p.add_argument('--skin', type=Path, required=True)
p.add_argument('--out', type=Path, required=True)
p.add_argument('--tag', default='p6')
p.add_argument('--e', default='0,.3,.5,.7,1')
p.add_argument('--no-keys', action='store_true')
a = p.parse_args()
a.out.mkdir(parents=True, exist_ok=True)
R = a.rig
rig = json.loads((R/'rig.json').read_text())
s, off = rig['transform']['scale'], np.array(rig['transform']['offset'])
from_m = lambda X: X/s+off
J = json.loads((R/'joints.json').read_text())
c = json.loads((R/'poses.json').read_text())['night_stalk']['crouch']
Xm = s*(np.load(a.skin)['src'].astype(np.float64)-off)
wt = np.load(R/'weights.npz')
idx = wt['idx'].astype(int)
w = np.round(wt['w'].astype(np.float64)*4096)/4096
w /= w.sum(1, keepdims=True)
KEYS = [] if a.no_keys else json.loads((R/'correctives.json').read_text())['keys']
cz = np.load(R/'correctives.npz')
DEL = {k['name']: (cz[k['name']+'__ids'], cz[k['name']+'__delta'].astype(np.float64)) for k in KEYS}
B = rc.ANIM_BONES
NI = {b: i for i, b in enumerate(rc.ANIM_NAMES)}


def crouch_at(e):
    if 'poles' in c:
        poles = c['poles']
    else:
        poles = {sd: (1-e)*np.array(c['polesRest'][sd])+e*np.array(c['polesCrouch'][sd]) for sd in 'LR'}
        poles = {sd: v/np.linalg.norm(v) for sd, v in poles.items()}
    lift = e*np.array(c['lift'])
    return rc.plant_legs(J, rc.slerp_pose(c['body'], e), lift, c['feet'], poles, bones=B), lift


JN = ['pelvis', 'waist', 'chest', 'hip.L', 'hip.R', 'knee.L', 'knee.R', 'ankle.L', 'ankle.R', 'toe.L', 'toe.R',
      'glute_tip.L', 'glute_tip.R', 'tail_base', 'tail_fork']+[f'tail_{t}_j{k}' for t in rc.TAILS for k in range(3)]


def posed_joints(pz, lift):
    T = rc.bone_transforms(J, pz, bones=B, root_translate=tuple(rc.lift_vec(lift)))
    out = {}
    for b, _, h, t in B:
        for jn in (h, t):
            if jn in JN and jn not in out:
                R_, t_ = T[b]
                out[jn] = R_@np.array(J[jn])+t_
    return {k: list(map(float, from_m(v))) for k, v in out.items()}


res = {'rest_joints_src': {k: list(map(float, from_m(np.array(J[k])))) for k in JN if k in J}}
for e in (float(x) for x in a.e.split(',')):
    pz, lift = crouch_at(e)
    P, _, vals = rc.posed_skin(Xm, idx, w, J, pz, lift, KEYS, DEL)
    tag = f'e{int(round(e*100)):03d}'
    np.save(a.out/f'{a.tag}_{tag}.npy', from_m(P).astype(np.float32))
    res[tag] = dict(joints=posed_joints(pz, lift), correctives={k: v for k, v in vals.items() if v > 0},
                    floorMin=float(P[:, 2].min()))
    print(tag, 'done', {k: round(v, 2) for k, v in vals.items() if v > 0}, flush=True)
dense = np.zeros((len(Xm), len(NI)), np.float32)
np.put_along_axis(dense, idx, w.astype(np.float32), 1)


def sh(bs):
    return dense[:, [NI[b] for b in bs if b in NI]].sum(1)


groups = [(['pelvis', 'hip.L', 'hip.R'], (.10, .30, .95)), (['glute.L', 'glute.R'], (.45, .75, 1.0)),
          (['thigh.L', 'thigh.R'], (1.0, .62, .05)), (['tail_root'], (1., 1., 1.)),
          ([f'tail_{t}{k}' for t in rc.TAILS for k in range(1, rc.TAIL_BONES+1)], (.12, .12, .12)),
          (['spine'], (.70, .70, .90)), (['shin.L', 'shin.R'], (.80, .55, .30)), (['foot.L', 'foot.R'], (.35, .22, .10))]
tot = np.zeros(len(Xm), np.float32)
acc = np.zeros((len(Xm), 3), np.float32)
for bs, cc in groups:
    v = sh(bs)
    acc += v[:, None]*np.array(cc, np.float32)
    tot += v
np.save(a.out/f'{a.tag}_col_weights.npy', acc+(1-tot)[:, None]*np.array([.55, .55, .55], np.float32))
th = sh(['thigh.L', 'thigh.R'])
q = th/np.maximum(th+sh(['pelvis', 'hip.L', 'hip.R', 'glute.L', 'glute.R', 'spine']), 1e-6)
np.save(a.out/f'{a.tag}_col_thigh.npy', np.c_[.1+.9*q, .2+.5*q, .6-.55*q].astype(np.float32))
(a.out/f'{a.tag}_shots.json').write_text(json.dumps(res, indent=1))
print('SHOTS_POSED')
