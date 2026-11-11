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
  neck  neck, the band where the chest and the neck, head and jaw share the weight (the head tucked down); rise0 NECK_RISE0;
  head  head, the band where the chest and the head and jaw share the weight (no skin is weighted to the neck bone), as the neck
        group's but driven by the head's own swing (faint fix pass 4: the head turned far back against the neck to lie on its
        jaw and cheek); rise0 HEAD_RISE0;
  belly chest, the band where the spine and the chest share the weight, with the pelvis (faint fix pass 6: the trunk curling
        forward 28 to 42 degrees stacked fine pleats across the lower belly); rise0 BELLY_RISE0.
--mid-sculpt poses.json:frame (faint fix pass 6) sculpts the mid keys at that frame of a clip instead of at the sculpt pose with
only the driving bone turned back, and puts the mid angle at that frame's swing: the in-between frames of the fall, where every
other bone is also on its way, are what the mid key has to clean (the hip and tail mid keys sculpted at the end pose left a
pinched pit at the hip and a spike at the tail root at faint frames 23 to 26).
--rise0 group:degrees,... overrides a group's rise0 (faint fix pass 4: batch 3's move now bends the shin 91.3 degrees, past the
knee's 88, so the knee keys rise from 95).
The rise0 angles sit above the largest swing any approved or current clip uses (idle, Night Stalk, batch 1, batch 2's displaced
and held, batch 3's move: shin 83.1, thigh 77.3, tail_root 17.0, neck 17.4 degrees), so every key is exactly 0 over all of them:
their skins are unchanged bit for bit. The groups are
sculpted in order, each with the earlier groups' keys at their sculpt values. Appends the keys to <rig dir>/correctives.json
and .npz (replacing the rebuilt groups' earlier deep keys, keeping the other groups'; the first run keeps the rig's own files as
correctives-pre-deepflex.json and .npz). Other builders write the same files, so the write takes <rig dir>/correctives.lock
(waiting while another holder has it), re-reads the files as they are at that moment, replaces only this run's keys by name,
writes, and removes the lock; keys another builder added meanwhile are kept. It
writes <rig dir>/deepflex-corrective.json (parameters, sculpt angles, every key's largest value over the --check-bakes).
"""
import argparse
import json
import time
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

KNEE_RISE0, HIP_RISE0, TAIL_RISE0, NECK_RISE0, HEAD_RISE0 = 88., 82., 25., 25., 30.
BELLY_RISE0 = 17.     # above every approved or current clip's chest swing (batch 3's move: 15.0) and faint's rest (15.9)
p = argparse.ArgumentParser()
p.add_argument('rig', type=Path)
p.add_argument('rest', type=Path)
p.add_argument('sculpt', help='poses.json[:frame]: the deep pose the keys are sculpted at')
p.add_argument('--groups', default='knee,hip,tail,neck')
p.add_argument('--rounds', type=int, default=100)
p.add_argument('--fine', type=int, default=4)
p.add_argument('--relax', type=int, default=2000)
p.add_argument('--mid-share', type=float, default=.5, help='the mid key sits this share of the way from rise0 to the full angle')
p.add_argument('--mid-sculpt', default=None, help='poses.json:frame: sculpt the mid keys at this clip frame (its swing is the mid angle)')
p.add_argument('--radii', default='knee:.04:.12,hip:.06:.16,tail:.05:.12,neck:.04:.12,head:.04:.12,belly:.05:.14', help='group:r0:r1, the mask (m) round the blend band')
p.add_argument('--check-bakes', default='')
p.add_argument('--dry-run', action='store_true')
p.add_argument('--rise0', default='', help='group:degrees,... overriding the defaults')
a = p.parse_args()
RISE0 = dict(knee=KNEE_RISE0, hip=HIP_RISE0, tail=TAIL_RISE0, neck=NECK_RISE0, head=HEAD_RISE0, belly=BELLY_RISE0)
RISE0.update({g: float(v) for g, v in (x.split(':') for x in a.rise0.split(',') if x)})

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
    if group == 'head':     # (no skin is weighted to the neck bone: the neck's skin blends the chest's and the head's)
        return 'head', (['chest'], ['neck', 'head', 'jaw']), ['chest', 'neck', 'head', 'jaw']
    if group == 'belly':
        return 'chest', (['spine'], ['chest']), ['pelvis', 'spine', 'chest']
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
MID = load_pose(a.mid_sculpt) if a.mid_sculpt else None
SM_REST = smooth(rest, a.fine)-smooth(rest, a.rounds)
new_keys, report = [], {}
for group in GROUPS:
    sides = 'LR' if group in ('knee', 'hip') else 'C'
    for sd in sides:
        bone, _, _ = spec(group, sd if sd != 'C' else 'L')
        ang_full = rc.swing_deg(J, full_pose, bone, B)
        rise0 = RISE0[group]
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
        mid_lift = lift
        if MID is not None:
            mid_pose, mid_lift = MID
        ang_mid = rc.swing_deg(J, mid_pose, bone, B)
        if not rise0+2 < ang_mid < ang_full-2:
            raise SystemExit(f'{group} {sd}: the mid pose bends {bone} {ang_mid:.1f} degrees, not between rise0 {rise0} and {ang_full:.1f}')
        m, nb = mask(group, sd if sd != 'C' else 'L')
        tag = '' if sd == 'C' else f'.{sd}'
        for gname, pose, plift, rise, fall in ((f'{group}_deep_mid', mid_pose, mid_lift, [rise0, ang_mid], ang_full),
                                               (f'{group}_deep', full_pose, lift, [ang_mid, ang_full], None)):
            k = dict(name=f'{gname}{tag}', group=gname, bone=bone, rise=[float(x) for x in rise], fall=None if fall is None else float(fall),
                     pose=(f'clip frame {a.mid_sculpt}' if gname.endswith('mid') and MID is not None else
                           f'faint heap end pose ({Path(a.sculpt).parent.name})' + (f', {bone} at its mid angle' if gname.endswith('mid') else '')))
            P, Rv, _ = rc.posed_skin(rest, idx, w, J, pose, plift, keys=keys+new_keys, deltas=deltas)
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


rep = dict(params={k: str(v) for k, v in vars(a).items()}, rise0=RISE0, keys=new_keys,
           sculpt=report, clips={str(Path(b).parent.parent.name)+'/'+str(Path(b).parent.name): bake_values(b) for b in a.check_bakes.split(',') if b})
print(json.dumps(rep['clips']), flush=True)
if not a.dry_run:
    # the corrective files are shared with the other clip builders (batch 3 adds shoulder keys): take
    # <rig>/correctives.lock (wait while another holder has it), load the files as they are now, replace only this run's
    # keys by name, write, release. Nothing is written from a snapshot.
    lock = R/'correctives.lock'
    t0 = time.time()
    while True:
        try:
            fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(fd, f'deepflex_corrective.py (batch 2 builder) {time.strftime("%Y-%m-%d %H:%M:%S")}\n'.encode())
            os.close(fd)
            break
        except FileExistsError:
            if time.time()-t0 > 1800:
                raise SystemExit(f'{lock} held for 30 minutes: {lock.read_text(errors="replace").strip()}; nothing written')
            print('waiting for', lock, '(', lock.read_text(errors='replace').strip(), ')', flush=True)
            time.sleep(5)
    try:
        cur_json = json.loads((R/'correctives.json').read_text())
        mine = {k['name'] for k in new_keys}
        cur_keys = [k for k in cur_json['keys'] if k['name'] not in mine and not any(k['name'].startswith(f'{g}_deep') for g in GROUPS)]
        with np.load(R/'correctives.npz') as cz:
            cur = {k['name']: (np.array(cz[k['name']+'__ids']), np.array(cz[k['name']+'__delta'])) for k in cur_keys}
        changed = sorted({k['name'] for k in cur_keys} ^ {k['name'] for k in keys})
        if changed:
            print('other keys changed since this run read the files (kept as they are now):', changed, flush=True)
        rep['other_keys_changed_during_run'] = changed
        for k in new_keys:
            cur[k['name']] = (deltas[k['name']][0], deltas[k['name']][1].astype(np.float32))
        tmp = R/'correctives.tmp.npz'
        np.savez_compressed(tmp, **{f'{k}__ids': v[0] for k, v in cur.items()}, **{f'{k}__delta': v[1] for k, v in cur.items()})
        t1 = time.time()
        while True:
            try:
                os.replace(tmp, R/'correctives.npz')
                break
            except PermissionError:
                # Windows will not replace a file another process still holds open (a lazy np.load); the lock stays held
                if time.time()-t1 > 1800:
                    tmp.unlink(missing_ok=True)
                    raise SystemExit('correctives.npz held open by another process for 30 minutes; nothing written')
                print('correctives.npz is open in another process; retrying', flush=True)
                time.sleep(10)
        out = dict(cur_json)
        out['keys'] = cur_keys+new_keys
        (R/'correctives.tmp.json').write_text(json.dumps(out, indent=1))
        os.replace(R/'correctives.tmp.json', R/'correctives.json')
    finally:
        lock.unlink(missing_ok=True)
    (R/'deepflex-corrective.json').write_text(json.dumps(rep, indent=1, default=str))
    print('wrote', len(cur_keys+new_keys), 'keys', flush=True)
