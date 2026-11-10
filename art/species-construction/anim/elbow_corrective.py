"""Elbow corrective keys for rig-p8b (clip set batch 1, guard): the elbow crease folds past about 35 degrees of forearm
bend, and no approved clip bends it past 17 (Night Stalk). Numpy, no Blender.

  python art/species-construction/anim/elbow_corrective.py <rig dir> <rest skin npz> [--rounds 80] [--r0 .025 --r1 .06]
      [--relax 0] [--mid-share .6] [--rise0 30] [--dry-run]

Two keys per side, the same kind as pose_board.py's knee keys (mush keys: the posed skin smoothed along the skin plus
the rest skin's own detail turned by each vertex's skinning rotation, inside a smooth mask round the band where the
upper arm and the forearm share the weight; optionally the hip keys' relax of the smoothed layer, which unfolds a crease
that passes through itself). Driven like every key of the rig, by the bone's swing (rig_core.driver_value of
rig_core.swing_deg, Blender's ROT_W SWING_TWIST_Y local), on forearm.L / forearm.R:
  elbow_mush_mid  sculpted at the guard's forearm turned the share --mid-share of the way; rises from --rise0 (30) to
                  that angle and falls to 0 at the guard's angle;
  elbow_mush      sculpted at the guard's deepest frame (akinza_clipset_b1.guard_frame 0); rises from the mid angle to
                  the guard's angle and holds (or, with --deep-share, falls to 0 at the deep key's angle);
  elbow_mush_deep (--deep-share) sculpted with the forearm turned that share of its guard turn, past the guard (the
                  entry and exit fold the arm a little further on the way); rises from the guard's angle and holds.
Both are 0 at 30 degrees of bend or less, so idle, Night Stalk, hurt and evade (all under 30) are untouched. The mask
also needs the vertex to be arm skin (more than half its weight on that side's upper arm, forearm or hand), so the
chest and hips never move. Appends the keys to <rig dir>/correctives.json and correctives.npz, replacing earlier elbow
keys; the first run keeps the rig's own files as correctives-pre-elbow.json and .npz. Writes elbow-corrective.json
(parameters, sculpt angles, the key values over the approved and batch 1 clips).
"""
import argparse
import json
import math
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
import akinza_clipset_b1 as cb  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('rig', type=Path)
p.add_argument('rest', type=Path)
p.add_argument('--rounds', type=int, default=80)
p.add_argument('--fine', type=int, default=4)
p.add_argument('--r0', type=float, default=.03)          # defaults: the accepted rig-p8b build (elbow-corrective.json)
p.add_argument('--r1', type=float, default=.07)
p.add_argument('--relax', type=int, default=3000)
p.add_argument('--mid-share', type=float, default=.6)
p.add_argument('--deep-share', type=float, default=1.08, help='also a key past the guard, the forearm at this share of its guard turn '
               '(fix pass 3: guard_in and guard_out fold the forearm a little past the guard, to 1.07)')
p.add_argument('--rise0', type=float, default=30.)
p.add_argument('--fore-falloff', default='', help='t0,t1: the mask fades out along the forearm (0 at the elbow joint, 1 at the '
               'wrist) from t0 to t1, so the key cannot reach the middle of the forearm (fix pass 4: the pass 3 keys, mask r1 .07 '
               'past the blend band and 3000 relax rounds, moved the mid-forearm skin 10 to 15 mm, the hump of the S)')
p.add_argument('--backup', default='', help='also copy the current correctives to correctives-<name>.json and .npz first')
p.add_argument('--check-bakes', default='', help='comma list of poses.json files whose forearm swing is reported')
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
if a.backup and not (R/f'correctives-{a.backup}.json').exists():
    shutil.copyfile(R/'correctives.json', R/f'correctives-{a.backup}.json')
    shutil.copyfile(R/'correctives.npz', R/f'correctives-{a.backup}.npz')
if not (R/'correctives-pre-elbow.json').exists():
    shutil.copyfile(R/'correctives.json', R/'correctives-pre-elbow.json')
    shutil.copyfile(R/'correctives.npz', R/'correctives-pre-elbow.npz')
base_json = json.loads((R/'correctives.json').read_text())       # the rig's current keys (other passes' keys kept),
cz = np.load(R/'correctives.npz')                                  # earlier elbow keys replaced
keys = [k for k in base_json['keys'] if not k['name'].startswith('elbow_')]
deltas = {k['name']: (cz[k['name']+'__ids'], cz[k['name']+'__delta'].astype(np.float64)) for k in keys}
A = sp.coo_matrix((np.ones(2*len(edges)), (np.r_[edges[:, 0], edges[:, 1]], np.r_[edges[:, 1], edges[:, 0]])), shape=(n, n)).tocsr()
A = sp.diags(1/np.maximum(np.asarray(A.sum(1)).ravel(), 1))@A


def smooth(V, rounds):
    for _ in range(rounds):
        V = .5*V+.5*(A@V)
    return V


def quats(Rm):
    wq = np.sqrt(np.maximum(1+Rm[:, 0, 0]+Rm[:, 1, 1]+Rm[:, 2, 2], 1e-12))/2
    return np.stack([wq, (Rm[:, 2, 1]-Rm[:, 1, 2])/(4*wq), (Rm[:, 0, 2]-Rm[:, 2, 0])/(4*wq), (Rm[:, 1, 0]-Rm[:, 0, 1])/(4*wq)], 1)


def mask(sd):
    """1 within r0 of the elbow's blend band (arm skin where neither the upper arm nor the forearm and hand hold more
    than .97 of the weight), 0 past r1, smooth; times the vertex's arm share (smoothstep .5 to .9)."""
    g1, g2 = share([f'upperarm.{sd}']), share([f'forearm.{sd}', f'hand.{sd}'])
    tot = g1+g2
    held = np.maximum(g1, g2)/np.maximum(tot, 1e-9)
    band = (tot > .9) & (held < .97)
    dband, _ = cKDTree(rest[band]).query(rest, k=1, workers=-1)
    m = (1-rc.smoothstep(dband, a.r0, a.r1))*rc.smoothstep(share([f'upperarm.{sd}', f'forearm.{sd}', f'hand.{sd}']), .5, .9)
    if a.fore_falloff:
        t0, t1 = (float(x) for x in a.fore_falloff.split(','))
        e, wr = np.array(J[f'elbow.{sd}']), np.array(J[f'wrist.{sd}'])
        ax = (wr-e)/np.linalg.norm(wr-e)
        t = (rest-e)@ax/np.linalg.norm(wr-e)
        m = m*(1-rc.smoothstep(t, t0, t1))
    return m, int(band.sum())


rigobj = ac.Rig(R)
cb._GUARD_BASE.clear()
gf = cb.guard_frame(rigobj, 0)
full_pose, lift = gf['pose'], gf['lift']
mid_pose = dict(full_pose)
for sd in 'LR':
    mid_pose[f'forearm.{sd}'] = ac.share_of(full_pose[f'forearm.{sd}'], a.mid_share)
ang_full = {sd: rc.swing_deg(J, full_pose, f'forearm.{sd}', B) for sd in 'LR'}
ang_mid = {sd: rc.swing_deg(J, mid_pose, f'forearm.{sd}', B) for sd in 'LR'}
deep_pose = dict(full_pose)
for sd in 'LR':
    deep_pose[f'forearm.{sd}'] = ac.share_of(full_pose[f'forearm.{sd}'], a.deep_share) if a.deep_share else full_pose[f'forearm.{sd}']
ang_deep = {sd: rc.swing_deg(J, deep_pose, f'forearm.{sd}', B) for sd in 'LR'}
print('forearm swing at the guard', {k: round(v, 2) for k, v in ang_full.items()}, 'mid', {k: round(v, 2) for k, v in ang_mid.items()}, flush=True)
masks = {sd: mask(sd) for sd in 'LR'}
print('mask vertices', {sd: int((m[0] > 1e-4).sum()) for sd, m in masks.items()}, 'band', {sd: m[1] for sd, m in masks.items()}, flush=True)
SM_REST = smooth(rest, a.fine)-smooth(rest, a.rounds)
new_keys = []
GROUPS = [('elbow_mush_mid', mid_pose), ('elbow_mush', full_pose)]+([('elbow_mush_deep', deep_pose)] if a.deep_share else [])
for gname, pose in GROUPS:
    for sd in 'LR':
        k = dict(name=f'{gname}.{sd}', group=gname, bone=f'forearm.{sd}', pose='guard loop frame 0' + (
            f' (forearm at {a.mid_share} share)' if gname.endswith('mid') else f' (forearm at {a.deep_share} share)' if gname.endswith('deep') else ''))
        if gname == 'elbow_mush_mid':
            k.update(rise=[a.rise0, float(ang_mid[sd])], fall=float(ang_full[sd]))
        elif gname == 'elbow_mush':
            k.update(rise=[float(ang_mid[sd]), float(ang_full[sd])], fall=float(ang_deep[sd]) if a.deep_share else None)
        else:
            k.update(rise=[float(ang_full[sd]), float(ang_deep[sd])], fall=None)
        new_keys.append(k)
    P, Rv, vals = rc.posed_skin(rest, idx, w, J, pose, lift, keys=keys+new_keys[:-2], deltas=deltas)
    base = smooth(P, a.rounds)
    m_all = np.maximum(masks['L'][0], masks['R'][0])
    if a.relax:
        sel = np.where(m_all > 1e-4)[0]
        As = A[sel]
        lap = smooth(rest, a.rounds)
        lap = lap-A@lap
        Qv = quats(Rv)
        lq = (.6*m_all[sel])[:, None]
        for _ in range(300):
            Qv[sel] = (1-lq)*Qv[sel]+lq*(As@Qv)
        Qv /= np.linalg.norm(Qv, axis=1, keepdims=True)
        tl = np.einsum('nij,nj->ni', rc._qmat(Qv[sel]), lap[sel])
        lam = (.85*m_all[sel])[:, None]
        for _ in range(a.relax):
            base[sel] = (1-lam)*base[sel]+lam*(As@base+tl)
    target = base+np.einsum('nij,nj->ni', Rv, SM_REST)
    dR = np.einsum('nji,nj->ni', Rv, target-P)
    for sd in 'LR':
        key = next(k for k in new_keys if k['name'] == f'{gname}.{sd}')
        v = rc.driver_value(rc.swing_deg(J, pose, key['bone'], B), key['rise'], key['fall'])
        part = dR*masks[sd][0][:, None]/max(v, 1e-6)
        ids = np.where(np.linalg.norm(part, axis=1) > 1e-6)[0]
        deltas[key['name']] = (ids, part[ids])
        mv = np.linalg.norm(dR*masks[sd][0][:, None], axis=1)
        print(f'{key["name"]:18s} driver {v:.3f} rise {[round(x, 1) for x in key["rise"]]} fall {key["fall"] and round(key["fall"], 1)}: '
              f'{len(ids)} vertices, max move {mv.max()*1000:.1f} mm', flush=True)
keys_out = keys+new_keys


# key values over the clips (forearm swing and every elbow key's value)
def report_bake(path):
    frames = json.loads(Path(path).read_text())
    sw = [max(rc.swing_deg(J, fr['pose'], f'forearm.{sd}', B) for sd in 'LR') for fr in frames]
    vals = [max(rc.driver_value(rc.swing_deg(J, fr['pose'], k['bone'], B), k['rise'], k.get('fall')) for k in new_keys) for fr in frames]
    return dict(frames=len(frames), forearm_swing_max_deg=round(max(sw), 2), elbow_key_value_max=round(max(vals), 4))


rep = dict(params=vars(a) | {'rig': str(a.rig), 'rest': str(a.rest)}, swingFullDeg=ang_full, swingMidDeg=ang_mid,
           keys=new_keys, maskVertices={sd: int((masks[sd][0] > 1e-4).sum()) for sd in 'LR'},
           clips={str(Path(b).parent.name): report_bake(b) for b in a.check_bakes.split(',') if b})
print(json.dumps(rep['clips']), flush=True)
if not a.dry_run:
    np.savez_compressed(R/'correctives.npz', **{f'{k}__ids': v[0] for k, v in deltas.items()},
                        **{f'{k}__delta': v[1].astype(np.float32) for k, v in deltas.items()})
    out = dict(base_json)
    out['keys'] = keys_out
    (R/'correctives.json').write_text(json.dumps(out, indent=1))
    (R/'elbow-corrective.json').write_text(json.dumps(rep, indent=1, default=str))
    print('wrote', len(keys_out), 'keys', flush=True)
