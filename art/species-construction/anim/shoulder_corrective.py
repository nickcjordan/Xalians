"""Shoulder corrective keys for rig-p8b (clip set batch 1, fix pass 4, guard G6): with the upper arm raised forward in the
guard, the front of the shoulder swells into a ball, with a hard crease where the upper arm enters and a dimple at the
armpit; neither idle nor Night Stalk f18 shows it. Numpy, no Blender.

  python art/species-construction/anim/shoulder_corrective.py <rig dir> <rest skin npz> [--rounds 120] [--r0 .03 --r1 .07]
      [--relax 3000] [--mid-share .6] [--rise0 25] [--radius .13] [--band .08,.10] [--backup <name>] [--dry-run]
      [--check-bakes a.json,b.json]

The same kind of key as elbow_corrective.py (a mush key: the posed skin smoothed along the skin plus the rest skin's own
detail turned by each vertex's skinning rotation, inside a smooth mask round the band where the upper arm and the body
share the weight, then relaxed), so the shoulder slopes smoothly into the upper arm. Two keys per side, driven by the
upper arm's swing (rig_core.key_value):
  shoulder_mush_mid  sculpted with the upper arm turned the share --mid-share of its guard turn; rises from --rise0 to that
                     angle and falls to 0 at the guard's angle;
  shoulder_mush      sculpted at the guard's loop frame 0; rises from the mid angle to the guard's and holds.
Night Stalk turns the upper arm further than the guard (77 degrees against 56 to 66) and about nearly the same axis, so the
swing alone cannot keep these keys off it: each carries a direction gate (rig_core.key_value, as the ankle keys) on the
swing axis's front-to-back component (+y for the left arm, -y for the right): Night Stalk's arms swing with it at 0.015 to
0.072, the guard's at 0.110 to 0.191, evade's the other way (about -0.8), so a smoothstep over --band (0.08 to 0.10) is 0
on every Night Stalk, idle, hurt and evade frame and 1 on every guard frame. The mask also needs the vertex within
--radius of the shoulder joint and more than half its weight on that side's clavicle, upper arm, chest or spine, so the
neck, the head and the elbow keys' skin never move. Appends the keys to <rig dir>/correctives.json and correctives.npz,
replacing earlier shoulder_mush keys; writes shoulder-corrective.json (parameters, sculpt angles, key values over the
clips given).
"""
import argparse
import json
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
p.add_argument('--rounds', type=int, default=120)
p.add_argument('--fine', type=int, default=4)
p.add_argument('--r0', type=float, default=.03)
p.add_argument('--r1', type=float, default=.07)
p.add_argument('--relax', type=int, default=3000)
p.add_argument('--mid-share', type=float, default=.6)
p.add_argument('--rise0', type=float, default=25.)
p.add_argument('--radius', type=float, default=.13)
p.add_argument('--band', default='.08,.10')
p.add_argument('--backup', default='')
p.add_argument('--check-bakes', default='')
p.add_argument('--dry-run', action='store_true')
p.add_argument('--remove', action='store_true', help='take the shoulder_mush keys out of the rig and stop (fix pass 5: the new guard arm '
               'pose keeps the shoulder within the approved folds without them, so they are not left as dead keys)')
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
base_json = json.loads((R/'correctives.json').read_text())
cz = np.load(R/'correctives.npz')
keys = [k for k in base_json['keys'] if not k['name'].startswith('shoulder_mush')]
deltas = {k['name']: (cz[k['name']+'__ids'], cz[k['name']+'__delta'].astype(np.float64)) for k in keys}
if a.remove:
    gone = [k['name'] for k in base_json['keys'] if k['name'].startswith('shoulder_mush')]
    if not a.dry_run:
        np.savez_compressed(R/'correctives.npz', **{f'{k}__ids': v[0] for k, v in deltas.items()},
                            **{f'{k}__delta': v[1].astype(np.float32) for k, v in deltas.items()})
        out = dict(base_json)
        out['keys'] = keys
        (R/'correctives.json').write_text(json.dumps(out, indent=1))
        if (R/'shoulder-corrective.json').exists():
            (R/'shoulder-corrective.json').rename(R/'shoulder-corrective-pass4-removed.json')
    print('removed', gone, 'kept', len(keys), 'keys', flush=True)
    raise SystemExit(0)
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
    """1 within r0 of the shoulder's blend band (where neither the upper arm nor the body holds more than .97 of the
    weight), 0 past r1, smooth; times the vertex's share on that side's clavicle, upper arm, chest and spine (smoothstep .5
    to .9), times 1 within the radius of the shoulder joint (fading over the last 2 cm)."""
    g1 = share([f'upperarm.{sd}'])
    g2 = share([f'clavicle.{sd}', 'chest', 'spine'])
    tot = g1+g2
    held = np.maximum(g1, g2)/np.maximum(tot, 1e-9)
    band = (tot > .9) & (held < .97)
    dband, _ = cKDTree(rest[band]).query(rest, k=1, workers=-1)
    dj = np.linalg.norm(rest-np.array(J[f'shoulder.{sd}']), axis=1)
    m = (1-rc.smoothstep(dband, a.r0, a.r1))*rc.smoothstep(share([f'upperarm.{sd}', f'clavicle.{sd}', 'chest', 'spine']), .5, .9)
    return m*(1-rc.smoothstep(dj, a.radius-.02, a.radius)), int(band.sum())


lo, hi = (float(x) for x in a.band.split(','))
DIRECTION = {'L': dict(axis=[0., 1., 0.], sign=1, band=[lo, hi]), 'R': dict(axis=[0., -1., 0.], sign=1, band=[lo, hi])}
rigobj = ac.Rig(R)
cb._GUARD_BASE.clear()
gf = cb.guard_frame(rigobj, 0)
full_pose, lift = gf['pose'], gf['lift']
mid_pose = dict(full_pose)
for sd in 'LR':
    mid_pose[f'upperarm.{sd}'] = ac.share_of(full_pose[f'upperarm.{sd}'], a.mid_share)
ang_full = {sd: rc.swing_deg(J, full_pose, f'upperarm.{sd}', B) for sd in 'LR'}
ang_mid = {sd: rc.swing_deg(J, mid_pose, f'upperarm.{sd}', B) for sd in 'LR'}
print('upper arm swing at the guard', {k: round(v, 2) for k, v in ang_full.items()}, 'mid', {k: round(v, 2) for k, v in ang_mid.items()}, flush=True)
masks = {sd: mask(sd) for sd in 'LR'}
print('mask vertices', {sd: int((m[0] > 1e-4).sum()) for sd, m in masks.items()}, 'band', {sd: m[1] for sd, m in masks.items()}, flush=True)
SM_REST = smooth(rest, a.fine)-smooth(rest, a.rounds)
new_keys = []
for gname, pose in (('shoulder_mush_mid', mid_pose), ('shoulder_mush', full_pose)):
    for sd in 'LR':
        k = dict(name=f'{gname}.{sd}', group=gname, bone=f'upperarm.{sd}', direction=dict(DIRECTION[sd], note=(
            'fires only for the guard\'s forward raise: the swing axis\'s front-to-back component, 0.015 to 0.072 in Night Stalk, '
            '0.110 to 0.191 in the guard')), pose='guard loop frame 0' + (f' (upper arm at {a.mid_share} share)' if gname.endswith('mid') else ''))
        if gname == 'shoulder_mush_mid':
            k.update(rise=[a.rise0, float(ang_mid[sd])], fall=float(ang_full[sd]))
        else:
            k.update(rise=[float(ang_mid[sd]), float(ang_full[sd])], fall=None)
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
        v = rc.key_value(J, pose, key, B)
        part = dR*masks[sd][0][:, None]/max(v, 1e-6)
        ids = np.where(np.linalg.norm(part, axis=1) > 1e-6)[0]
        deltas[key['name']] = (ids, part[ids])
        mv = np.linalg.norm(dR*masks[sd][0][:, None], axis=1)
        print(f'{key["name"]:22s} driver {v:.3f} rise {[round(x, 1) for x in key["rise"]]} fall {key["fall"] and round(key["fall"], 1)}: '
              f'{len(ids)} vertices, max move {mv.max()*1000:.1f} mm', flush=True)
keys_out = keys+new_keys


def report_bake(path):
    frames = json.loads(Path(path).read_text())
    vals = [max(rc.key_value(J, fr['pose'], k, B) for k in new_keys) for fr in frames]
    sw = [max(rc.swing_deg(J, fr['pose'], f'upperarm.{sd}', B) for sd in 'LR') for fr in frames]
    return dict(frames=len(frames), upperarm_swing_max_deg=round(max(sw), 2), shoulder_key_value_max=float(max(vals)))


rep = dict(params=vars(a) | {'rig': str(a.rig), 'rest': str(a.rest)}, swingFullDeg=ang_full, swingMidDeg=ang_mid, keys=new_keys,
           maskVertices={sd: int((masks[sd][0] > 1e-4).sum()) for sd in 'LR'},
           clips={str(Path(b).parent.name): report_bake(b) for b in a.check_bakes.split(',') if b})
print(json.dumps(rep['clips']), flush=True)
if not a.dry_run:
    np.savez_compressed(R/'correctives.npz', **{f'{k}__ids': v[0] for k, v in deltas.items()},
                        **{f'{k}__delta': v[1].astype(np.float32) for k, v in deltas.items()})
    out = dict(base_json)
    out['keys'] = keys_out
    (R/'correctives.json').write_text(json.dumps(out, indent=1))
    (R/'shoulder-corrective.json').write_text(json.dumps(rep, indent=1, default=str))
    print('wrote', len(keys_out), 'keys', flush=True)
