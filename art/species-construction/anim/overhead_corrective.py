"""Overhead shoulder and armpit corrective keys for rig-p8b (clip set batch 3, fix pass 2: act.heavy raises both arms past the
top of the rig's shoulder range, where the arm-raise keys were sculpted, so the paws reach the crown at the top of the hop).
Numpy, no Blender.

  python art/species-construction/anim/overhead_corrective.py <rig dir> <rest skin npz> [--check-bakes a/poses.json,...]
      [--rise0 78] [--mid-share .5] [--dry-run]

The same kind of key as elbow_corrective.py's and deepflex_corrective.py's (a mush key: the posed skin smoothed along the skin,
the rest skin's own detail turned by each vertex's skinning rotation, relaxed to unfold a crease that passes through itself,
kept inside a smooth mask round the band where the upper arm and the body share the weight). Four keys per side, driven like
every key of the rig by the upper arm's swing (rig_core.driver_value of rig_core.swing_deg; Blender: ROT_W, SWING_TWIST_Y,
local):
  overhead_shoulder_mid, overhead_armpit_mid  sculpted with the upper arm turned so its swing is --mid-share of the way from
                     --rise0 to its swing in the overhead pose; rise from rise0 to that angle and fall to 0 at the full angle;
  overhead_shoulder, overhead_armpit           sculpted at the overhead pose; rise from the mid angle to the full angle and hold.
The shoulder keys hold the mask's part at and above the shoulder joint (the top of the shoulder, the deltoid, the side of the
chest), the armpit keys the part below it (the armpit's hollow and the side of the ribs): the two masks add up to the one mask,
so the pair together is the one corrective, named by region. The overhead pose is OVERHEAD_KEY (akinza_clipset_b3), both arms
raised out, forward and up (107.7 degrees of swing) with the elbows bent inward over the head, posed on the rest body (the key's
directions are in the chest's frame, so the arm's turn on the clavicle is the same on any trunk). The keys are sculpted with
every existing key at its value (the arm-raise keys armpit_fwd and shoulder_raise are both on in this range).
rise0 sits above the largest upper arm swing any approved or current clip uses (Night Stalk 76.93; batch 1's guard 73.3;
batch 2's displaced 69.0; batch 3's light 76.0 and move 29.6), so every key is exactly 0 over all of them and their skins are
unchanged bit for bit: --check-bakes reports each key's largest value over each bake and compares every frame's posed skin with
and without the new keys byte for byte.
The corrective files are shared with the other clip builders: the first run keeps the rig's files as correctives-pre-overhead.json
and .npz; the write takes <rig dir>/correctives.lock (created with this builder's name and the time; waiting while another holder
has it), re-reads the files as they are at that moment, adds or replaces only this run's keys by name, writes, and removes the
lock (nothing is written from a snapshot). Writes <rig dir>/overhead-corrective.json (parameters, sculpt angles, the masks, every
key's largest value and the skin comparison over the --check-bakes).
"""
import argparse
import hashlib
import json
import os
import shutil
import sys
import time
from pathlib import Path

import numpy as np
import scipy.sparse as sp
from scipy.spatial import cKDTree

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
import rig_core as rc  # noqa: E402
import akinza_clips as ac  # noqa: E402
import akinza_clipset_b3 as c3  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('rig', type=Path)
p.add_argument('rest', type=Path)
p.add_argument('--rise0', type=float, default=78.)
p.add_argument('--mid-share', type=float, default=.5)
p.add_argument('--rounds', type=int, default=100)
p.add_argument('--fine', type=int, default=4)
p.add_argument('--relax', type=int, default=2000)
p.add_argument('--r0', type=float, default=.05, help='the mask is 1 within r0 (m) of the blend band')
p.add_argument('--r1', type=float, default=.14, help='and 0 past r1')
p.add_argument('--radius', type=float, default=.22, help='and 0 past this distance (m) from the shoulder joint')
p.add_argument('--split', default='.0,.04', help='the armpit part: smoothstep of the depth (m) below the shoulder joint')
p.add_argument('--check-bakes', default='')
p.add_argument('--dry-run', action='store_true')
p.add_argument('--verify-only', type=Path, default=None, help='no sculpt: check the overhead keys the rig holds over --check-bakes and write the report here')
p.add_argument('--dry-out', type=Path, help='with --dry-run: write the whole key set, the rig keys and the new ones, to this folder for a look')
a = p.parse_args()

B = rc.ANIM_BONES
NAMES = rc.ANIM_NAMES
NI = {b: i for i, b in enumerate(NAMES)}
R = a.rig
rig = json.loads((R/'rig.json').read_text())
J = json.loads((R/'joints.json').read_text())
RIG = ac.Rig(R)
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
if not a.dry_run and not a.verify_only and not (R/'correctives-pre-overhead.json').exists():
    shutil.copyfile(R/'correctives.json', R/'correctives-pre-overhead.json')
    shutil.copyfile(R/'correctives.npz', R/'correctives-pre-overhead.npz')
MINE = lambda name: name.startswith('overhead_')
base_json = json.loads((R/'correctives.json').read_text())
keys = [k for k in base_json['keys'] if not MINE(k['name'])]
with np.load(R/'correctives.npz') as cz:       # read and closed (Windows will not replace a file this process holds open)
    deltas = {k['name']: (np.array(cz[k['name']+'__ids']), cz[k['name']+'__delta'].astype(np.float64)) for k in keys}
A = sp.coo_matrix((np.ones(2*len(edges)), (np.r_[edges[:, 0], edges[:, 1]], np.r_[edges[:, 1], edges[:, 0]])), shape=(n, n)).tocsr()
A = sp.diags(1/np.maximum(np.asarray(A.sum(1)).ravel(), 1))@A


def smooth(V, rounds):
    for _ in range(rounds):
        V = .5*V+.5*(A@V)
    return V


def quats(Rm):
    wq = np.sqrt(np.maximum(1+Rm[:, 0, 0]+Rm[:, 1, 1]+Rm[:, 2, 2], 1e-12))/2
    return np.stack([wq, (Rm[:, 2, 1]-Rm[:, 1, 2])/(4*wq), (Rm[:, 0, 2]-Rm[:, 2, 0])/(4*wq), (Rm[:, 1, 0]-Rm[:, 0, 1])/(4*wq)], 1)


def masks(sd):
    """The side's mask round the band where the upper arm and the body (clavicle, chest, spine) share the weight, split at the
    shoulder joint's height into the shoulder part (above) and the armpit part (below)."""
    g1 = share([f'upperarm.{sd}'])
    g2 = share([f'clavicle.{sd}', 'chest', 'spine'])
    tot = g1+g2
    held = np.maximum(g1, g2)/np.maximum(tot, 1e-9)
    band = (tot > .9) & (held < .97)
    dband, _ = cKDTree(rest[band]).query(rest, k=1, workers=-1)
    js = np.array(J[f'shoulder.{sd}'])
    dj = np.linalg.norm(rest-js, axis=1)
    m = (1-rc.smoothstep(dband, a.r0, a.r1))*rc.smoothstep(share([f'upperarm.{sd}', f'clavicle.{sd}', 'chest', 'spine']), .5, .9)
    m = m*(1-rc.smoothstep(dj, a.radius-.03, a.radius))*rc.smoothstep(rest[:, 0]*(1 if sd == 'L' else -1), -.01, .02)
    s0, s1 = (float(x) for x in a.split.split(','))
    pit = rc.smoothstep(js[2]-rest[:, 2], s0, s1)
    return {'shoulder': m*(1-pit), 'armpit': m*pit}, int(band.sum())


# the overhead pose: both arms at OVERHEAD_KEY on the rest body
full_pose = {}
for sd in 'LR':
    full_pose.update(c3.chest_arm_pose(RIG, {}, sd, c3.OVERHEAD_KEY))
lift = [0., 0., 0.]
SM_REST = smooth(rest, a.fine)-smooth(rest, a.rounds)
new_keys, report = [], {}


def sculpt():
    global new_keys
    for sd in 'LR':
        bone = f'upperarm.{sd}'
        ang_full = rc.swing_deg(J, full_pose, bone, B)
        if ang_full <= a.rise0+4:
            raise SystemExit(f'{sd}: the overhead pose swings {bone} {ang_full:.1f} degrees, not past rise0 {a.rise0}')
        want = a.rise0+a.mid_share*(ang_full-a.rise0)
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
        parts, nb = masks(sd)
        m_all = parts['shoulder']+parts['armpit']
        for stage, pose, rise, fall in (('_mid', mid_pose, [a.rise0, ang_mid], ang_full), ('', full_pose, [ang_mid, ang_full], None)):
            # one sculpt per stage and side (the whole mask), shared out to the shoulder and armpit keys by their parts
            P, Rv, _ = rc.posed_skin(rest, idx, w, J, pose, lift, keys=keys+new_keys, deltas=deltas)
            base = smooth(P, a.rounds)
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
            stage_keys = []
            for region in ('shoulder', 'armpit'):
                gname = f'overhead_{region}{stage}'
                k = dict(name=f'{gname}.{sd}', group=gname, bone=bone, rise=[float(x) for x in rise], fall=None if fall is None else float(fall),
                         pose=f'overhead (akinza_clipset_b3.OVERHEAD_KEY, both arms, rest body)' + (', the upper arm at its mid angle' if stage else ''))
                v = rc.driver_value(rc.swing_deg(J, pose, bone, B), k['rise'], k['fall'])
                part = dR*parts[region][:, None]/max(v, 1e-6)
                ids = np.where(np.linalg.norm(part, axis=1) > 1e-6)[0]
                deltas[k['name']] = (ids, part[ids])
                stage_keys.append(k)
                mv = np.linalg.norm(dR*parts[region][:, None], axis=1)
                report[k['name']] = dict(driver=round(v, 4), rise=[round(x, 2) for x in k['rise']], fall=k['fall'] and round(k['fall'], 2),
                                         vertices=int(len(ids)), max_move_mm=round(float(mv.max())*1000, 1), band=nb)
                print(f"{k['name']:26s} driver {v:.3f} rise {[round(x, 1) for x in k['rise']]} fall {k['fall'] and round(k['fall'], 1)}: "
                      f"{len(ids)} vertices, max move {mv.max()*1000:.1f} mm", flush=True)
            new_keys += stage_keys


if a.verify_only:
    # the keys as the rig holds them now: this run's (overhead_*) against all the others
    new_keys = [k for k in base_json['keys'] if MINE(k['name'])]
    with np.load(R/'correctives.npz') as cz:
        deltas.update({k['name']: (np.array(cz[k['name']+'__ids']), cz[k['name']+'__delta'].astype(np.float64)) for k in new_keys})
else:
    sculpt()


def frames_of(path):
    data = json.loads(Path(path).read_text())
    return data['frames'] if isinstance(data, dict) and 'frames' in data else data


def check_bake(path):
    """Each new key's largest value over a bake, the largest upper arm swing, and every frame's posed skin with and without the new
    keys compared byte for byte (sha256 of all frames)."""
    frames = frames_of(path)
    vals = {k['name']: max(rc.key_value(J, fr['pose'], k, B) for fr in frames) for k in new_keys}
    sw = round(max(rc.swing_deg(J, fr['pose'], f'upperarm.{sd}', B) for fr in frames for sd in 'LR'), 2)
    h0, h1 = hashlib.sha256(), hashlib.sha256()
    same = True
    for fr in frames:
        P0, _, _ = rc.posed_skin(rest, idx, w, J, fr['pose'], fr['lift'], keys=keys, deltas=deltas)
        P1, _, _ = rc.posed_skin(rest, idx, w, J, fr['pose'], fr['lift'], keys=keys+new_keys, deltas=deltas)
        h0.update(np.ascontiguousarray(P0).tobytes())
        h1.update(np.ascontiguousarray(P1).tobytes())
        same = same and bool(np.array_equal(P0.view(np.uint64), P1.view(np.uint64)))
    return dict(frames=len(frames), upperarm_swing_max_deg=sw, overhead_key_value_max=round(max(vals.values()), 6),
                skin_sha256_without=h0.hexdigest(), skin_sha256_with=h1.hexdigest(), skins_identical=same)


bakes = [b for b in a.check_bakes.split(',') if b]
clips = {}
for b in bakes:
    nm = str(Path(b).parent.parent.parent.name)+'/'+str(Path(b).parent.name)
    clips[nm] = check_bake(b)
    print(nm, {k: v for k, v in clips[nm].items() if not k.startswith('skin_sha')}, flush=True)
rep = dict(params={k: str(v) for k, v in vars(a).items()}, overhead_key=c3.OVERHEAD_KEY, keys=new_keys, sculpt=report,
           mask_vertices={sd: {r: int((m > 1e-4).sum()) for r, m in masks(sd)[0].items()} for sd in 'LR'}, clips=clips)
if a.verify_only:
    a.verify_only.parent.mkdir(parents=True, exist_ok=True)
    a.verify_only.write_text(json.dumps(dict(rig=str(R), keys=[k['name'] for k in new_keys], clips=clips), indent=1))
    print('VERIFY_DONE', all(v['skins_identical'] and v['overhead_key_value_max'] == 0 for v in clips.values()), flush=True)
    raise SystemExit(0)
if not a.dry_run:
    lock = R/'correctives.lock'
    t0 = time.time()
    while True:
        try:
            fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(fd, f'overhead_corrective.py (batch 3 builder) {time.strftime("%Y-%m-%d %H:%M:%S")}\n'.encode())
            os.close(fd)
            break
        except FileExistsError:
            if time.time()-t0 > 3600:
                raise SystemExit(f'{lock} held for an hour: {lock.read_text(errors="replace").strip()}; nothing written')
            print('waiting for', lock, '(', lock.read_text(errors='replace').strip(), ')', flush=True)
            time.sleep(5)
    try:
        cur_json = json.loads((R/'correctives.json').read_text())
        mine = {k['name'] for k in new_keys}
        cur_keys = [k for k in cur_json['keys'] if k['name'] not in mine and not MINE(k['name'])]
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
    (R/'overhead-corrective.json').write_text(json.dumps(rep, indent=1, default=str))
    print('wrote', len(cur_keys+new_keys), 'keys', flush=True)
else:
    if a.dry_out:
        a.dry_out.mkdir(parents=True, exist_ok=True)
        allk = keys+new_keys
        np.savez_compressed(a.dry_out/'correctives.npz', **{f"{k['name']}__ids": deltas[k['name']][0] for k in allk},
                            **{f"{k['name']}__delta": deltas[k['name']][1].astype(np.float32) for k in allk})
        (a.dry_out/'correctives.json').write_text(json.dumps(dict(base_json, keys=allk), indent=1))
        (a.dry_out/'overhead-corrective.json').write_text(json.dumps(rep, indent=1, default=str))
    print(json.dumps({k: {kk: vv for kk, vv in v.items() if not kk.startswith('skin_sha')} for k, v in clips.items()}))
