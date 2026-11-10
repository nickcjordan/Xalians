"""Deep-flexion corrective keys for rig-p8b (clip set batch 2, fix pass 3: faint folds the legs under the body and the tails down
over the rump, far past the crouch the rig's keys were sculpted for). Numpy, no Blender.

  python art/species-construction/anim/deepflex_corrective.py <rig dir> <rest skin npz> <sculpt poses.json>[:frame]
      [--groups knee,hip,tail] [--check-bakes a/poses.json,b/poses.json,...] [--dry-run]

The same kind of key as elbow_corrective.py's (a mush key: the posed skin smoothed along the skin, the rest skin's own detail
turned by each vertex's skinning rotation, optionally relaxed to unfold a crease that passes through itself, kept inside a
smooth mask round the joint's blend band). Two keys per joint and side, driven like every key of the rig by the bone's swing
(rig_core.driver_value of rig_core.swing_deg; Blender: ROT_W, SWING_TWIST_Y, local):
  <joint>_deep_mid  sculpted with the bone turned so its swing is --mid-share of the way from the group's rise0 to its swing in
                    the sculpt pose; rises from rise0 to that angle and falls to 0 at the full angle;
  <joint>_deep      sculpted at the sculpt pose; rises from the mid angle to the full angle and holds.
Groups (each key also needs the vertex to be that part's skin, so nothing else moves):
  knee  shin.L / shin.R, the band where the thigh and the shin share the weight; leg skin; rise0 KNEE_RISE0;
  hip   thigh.L / thigh.R, the band where the hip (pelvis, glute) and the thigh share the weight, with the belly; rise0 HIP_RISE0;
  tail  tail_root, the band where the pelvis and the tail root and first tail bones share the weight; rise0 TAIL_RISE0;
  neck  neck, the band where the chest and the neck, head and jaw share the weight (the head tucked down); rise0 NECK_RISE0.
The rise0 angles sit above the largest swing any approved or current clip uses (idle, Night Stalk, batch 1, batch 2's displaced
and held, batch 3's move: shin 83.1, thigh 77.3, tail_root 17.0, neck 17.4 degrees), so every key is exactly 0 over all of them:
their skins are unchanged bit for bit. The groups are
sculpted in order, each with the earlier groups' keys at their sculpt values. Appends the keys to <rig dir>/correctives.json
and .npz (replacing the rebuilt groups' earlier deep keys, keeping the other groups'; the first run keeps the rig's own files as
correctives-pre-deepflex.json and .npz) and
writes <rig dir>/deepflex-corrective.json (parameters, sculpt angles, every key's largest value over the --check-bakes).
"""
import argparse
import json
import os
import shutil
import sys
from pathlib import Path

import numpy as np
import scipy.sparse as sp
from scipy.spatial import cKDTree

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
import rig_core as rc  # noqa: E402
import akinza_clips as ac  # noqa: E402

KNEE_RISE0, HIP_RISE0, TAIL_RISE0, NECK_RISE0 = 88., 82., 25., 25.
p = argparse.ArgumentParser()
p.add_argument('rig', type=Path)
p.add_argument('rest', type=Path)
p.add_argument('sculpt', help='poses.json[:frame]: the deep pose the keys are sculpted at')
p.add_argument('--groups', default='knee,hip,tail,neck')
p.add_argument('--rounds', type=int, default=100)
p.add_argument('--fine', type=int, default=4)
p.add_argument('--relax', type=int, default=2000)
p.add_argument('--mid-share', type=float, default=.5, help='the mid key sits this share of the way from rise0 to the full angle')
p.add_argument('--radii', default='knee:.04:.12,hip:.06:.16,tail:.05:.12,neck:.04:.12', help='group:r0:r1, the mask (m) round the blend band')
p.add_argument('--check-bakes', default='')
p.add_argument('--dry-run', action='store_true')
a = p.parse_args()

B = rc.ANIM_BONES
NAMES = rc.ANIM_NAMES
NI = {b: i for i, b in enumerate(NAMES)}
R = a.rig
rig = json.loads((R/'rig.json').read_text())
J = json.loads((R/'joints.json').read_text())
s, off = rig['transform']['scale'], np.array(rig['transform']['offset'])
d = np.load(a.rest)
rest = s*(d['src'].astype(np.float64)-off)
edges = d['edges'].astype(np.int64)
n = len(rest)
wt = np.load(R/'weights.npz')
idx = wt['idx'].astype(int)
w = np.round(wt['w'].astype(np.float64)*4096)/4096
w /= w.sum(1, keepdims=True)
dense = np.zeros((n, len(NAMES)))
np.put_along_axis(dense, idx, w, 1)
share = lambda bones: dense[:, [NI[b] for b in bones]].sum(1)
if not a.dry_run and not (R/'correctives-pre-deepflex.json').exists():
    shutil.copyfile(R/'correctives.json', R/'correctives-pre-deepflex.json')
    shutil.copyfile(R/'correctives.npz', R/'correctives-pre-deepflex.npz')
base_json = json.loads((R/'correctives.json').read_text())
GROUPS = a.groups.split(',')
keys = [k for k in base_json['keys'] if not any(k['name'].startswith(f'{g}_deep') for g in GROUPS)]   # the rebuilt groups' deep keys go
with np.load(R/'correctives.npz') as cz:       # read and closed (Windows will not replace a file this process holds open)
    deltas = {k['name']: (np.array(cz[k['name']+'__ids']), cz[k['name']+'__delta'].astype(np.float64)) for k in keys}
A = sp.coo_matrix((np.ones(2*len(edges)), (np.r_[edges[:, 0], edges[:, 1]], np.r_[edges[:, 1], edges[:, 0]])), shape=(n, n)).tocsr()
A = sp.diags(1/np.maximum(np.asarray(A.sum(1)).ravel(), 1))@A
RADII = {g: (float(r0), float(r1)) for g, r0, r1 in (x.split(':') for x in a.radii.split(','))}
TAILB = [f'tail_{t}1' for t in rc.TAILS]


def smooth(V, rounds):
    for _ in range(rounds):
        V = .5*V+.5*(A@V)
    return V


def quats(Rm):
    wq = np.sqrt(np.maximum(1+Rm[:, 0, 0]+Rm[:, 1, 1]+Rm[:, 2, 2], 1e-12))/2
    return np.stack([wq, (Rm[:, 2, 1]-Rm[:, 1, 2])/(4*wq), (Rm[:, 0, 2]-Rm[:, 2, 0])/(4*wq), (Rm[:, 1, 0]-Rm[:, 0, 1])/(4*wq)], 1)


def spec(group, sd):
    """(driving bone, band bone sets (a, b), the part's skin bones) for a group and side."""
    if group == 'knee':
        return f'shin.{sd}', ([f'thigh.{sd}'], [f'shin.{sd}']), [f'thigh.{sd}', f'shin.{sd}', f'foot.{sd}']
    if group == 'hip':
        return f'thigh.{sd}', (['pelvis', f'glute.{sd}'], [f'thigh.{sd}']), ['pelvis', 'spine', f'glute.{sd}', f'thigh.{sd}']
    if group == 'neck':
        return 'neck', (['chest'], ['neck', 'head', 'jaw']), ['chest', 'neck', 'head', 'jaw']
    return 'tail_root', (['pelvis'], ['tail_root']+TAILB), ['pelvis', 'glute.L', 'glute.R', 'tail_root']+TAILB


def mask(group, sd):
    _, (ba, bb), part = spec(group, sd)
    g1, g2 = share(ba), share(bb)
    tot = g1+g2
    held = np.maximum(g1, g2)/np.maximum(tot, 1e-9)
    band = (tot > .9) & (held < .97)
    r0, r1 = RADII[group]
    dband, _ = cKDTree(rest[band]).query(rest, k=1, workers=-1)
    m = (1-rc.smoothstep(dband, r0, r1))*rc.smoothstep(share(part), .5, .9)
    if group == 'hip':       # the side's half of the body only (the two hips' masks meet at the midline)
        m = m*rc.smoothstep(rest[:, 0]*(1 if sd == 'L' else -1), -.02, .02)
    return m, int(band.sum())


def load_pose(arg):
    path, _, fr = arg.partition(':')
    frames = json.loads(Path(path).read_text())
    f = frames[int(fr) if fr else -1]
    return f['pose'], f['lift']


full_pose, lift = load_pose(a.sculpt)
SM_REST = smooth(rest, a.fine)-smooth(rest, a.rounds)
new_keys, report = [], {}
for group in GROUPS:
    sides = 'LR' if group in ('knee', 'hip') else 'C'
    for sd in sides:
        bone, _, _ = spec(group, sd if sd != 'C' else 'L')
        ang_full = rc.swing_deg(J, full_pose, bone, B)
        rise0 = {'knee': KNEE_RISE0, 'hip': HIP_RISE0, 'tail': TAIL_RISE0, 'neck': NECK_RISE0}[group]
        if ang_full <= rise0+4:
            raise SystemExit(f'{group} {sd}: the sculpt pose bends {bone} {ang_full:.1f} degrees, not past rise0 {rise0}')
        # the mid key's pose: the bone turned the share of its sculpt turn whose swing is --mid-share of the way from rise0 to
        # the full angle (bisection: the swing of a share of a turn is not that share of the swing)
        want = rise0+a.mid_share*(ang_full-rise0)
        lo_, hi_ = 0., 1.
        for _ in range(40):
            m_ = .5*(lo_+hi_)
            if rc.swing_deg(J, {bone: ac.share_of(full_pose[bone], m_)}, bone, B) < want:
                lo_ = m_
            else:
                hi_ = m_
        mid_pose = dict(full_pose)
        mid_pose[bone] = ac.share_of(full_pose[bone], .5*(lo_+hi_))
        ang_mid = rc.swing_deg(J, mid_pose, bone, B)
        m, nb = mask(group, sd if sd != 'C' else 'L')
        tag = '' if sd == 'C' else f'.{sd}'
        for gname, pose, rise, fall in ((f'{group}_deep_mid', mid_pose, [rise0, ang_mid], ang_full),
                                        (f'{group}_deep', full_pose, [ang_mid, ang_full], None)):
            k = dict(name=f'{gname}{tag}', group=gname, bone=bone, rise=[float(x) for x in rise], fall=None if fall is None else float(fall),
                     pose=f'faint heap end pose ({Path(a.sculpt).parent.name})' + (f', {bone} at its mid angle' if gname.endswith('mid') else ''))
            P, Rv, _ = rc.posed_skin(rest, idx, w, J, pose, lift, keys=keys+new_keys, deltas=deltas)
            base = smooth(P, a.rounds)
            if a.relax:
                sel = np.where(m > 1e-4)[0]
                As = A[sel]
                lap = smooth(rest, a.rounds)
                lap = lap-A@lap
                Qv = quats(Rv)
                lq = (.6*m[sel])[:, None]
                for _ in range(300):
                    Qv[sel] = (1-lq)*Qv[sel]+lq*(As@Qv)
                Qv /= np.linalg.norm(Qv, axis=1, keepdims=True)
                tl = np.einsum('nij,nj->ni', rc._qmat(Qv[sel]), lap[sel])
                lam = (.85*m[sel])[:, None]
                for _ in range(a.relax):
                    base[sel] = (1-lam)*base[sel]+lam*(As@base+tl)
            target = base+np.einsum('nij,nj->ni', Rv, SM_REST)
            dR = np.einsum('nji,nj->ni', Rv, target-P)
            v = rc.driver_value(rc.swing_deg(J, pose, bone, B), k['rise'], k['fall'])
            part = dR*m[:, None]/max(v, 1e-6)
            ids = np.where(np.linalg.norm(part, axis=1) > 1e-6)[0]
            deltas[k['name']] = (ids, part[ids])
            new_keys.append(k)
            mv = np.linalg.norm(dR*m[:, None], axis=1)
            report[k['name']] = dict(driver=round(v, 4), rise=[round(x, 2) for x in k['rise']], fall=k['fall'] and round(k['fall'], 2),
                                     vertices=int(len(ids)), max_move_mm=round(float(mv.max())*1000, 1), band=nb)
            print(f"{k['name']:20s} driver {v:.3f} rise {[round(x, 1) for x in k['rise']]} fall {k['fall'] and round(k['fall'], 1)}: "
                  f"{len(ids)} vertices, max move {mv.max()*1000:.1f} mm", flush=True)


def bake_values(path):
    frames = json.loads(Path(path).read_text())
    vals = {k['name']: max(rc.key_value(J, fr['pose'], k, B) for fr in frames) for k in new_keys}
    sw = {b: round(max(rc.swing_deg(J, fr['pose'], b, B) for fr in frames), 2) for b in sorted({k['bone'] for k in new_keys})}
    return dict(frames=len(frames), swing_max_deg=sw, deep_key_value_max=round(max(vals.values()), 6))


rep = dict(params={k: str(v) for k, v in vars(a).items()}, rise0=dict(knee=KNEE_RISE0, hip=HIP_RISE0, tail=TAIL_RISE0, neck=NECK_RISE0), keys=new_keys,
           sculpt=report, clips={str(Path(b).parent.parent.name)+'/'+str(Path(b).parent.name): bake_values(b) for b in a.check_bakes.split(',') if b})
print(json.dumps(rep['clips']), flush=True)
if not a.dry_run:
    tmp = R/'correctives.tmp.npz'
    np.savez_compressed(tmp, **{f'{k}__ids': v[0] for k, v in deltas.items()}, **{f'{k}__delta': v[1].astype(np.float32) for k, v in deltas.items()})
    os.replace(tmp, R/'correctives.npz')
    out = dict(base_json)
    out['keys'] = keys+new_keys
    (R/'correctives.tmp.json').write_text(json.dumps(out, indent=1))
    os.replace(R/'correctives.tmp.json', R/'correctives.json')
    (R/'deepflex-corrective.json').write_text(json.dumps(rep, indent=1, default=str))
    print('wrote', len(keys+new_keys), 'keys', flush=True)
