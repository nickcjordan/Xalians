"""Pose-space corrective keys for rig-p8b (clip set batch 2, rig pass for the ear turn and the neck fold, 2026-11-12). Numpy, no
Blender.

  python art/species-construction/anim/pose_space_corrective.py <rig dir> <rest skin npz> <spec json>
      [--groups ear_turn,neck_fold,grip_arm] [--check-bakes a/poses.json,...] [--dry-run --dry-out <dir>]
      [--verify-only <out json>]

Why a new driver. Every earlier key of the rig is driven by one bone's swing (rig_core.driver_value of swing_deg, sometimes
gated by the swing's direction). The three corrections this pass needs live in parts of the rotation space that a swing cannot
separate from the approved clips:
  ear_turn   the ear turned about its base so its opening faces away from the camera (held: laid back and down along the neck;
             faint: trailing the falling head). The approved clips already swing the ear 79 to 95 degrees back and twist it up to
             35 degrees (hurt), so no swing or twist threshold leaves them out while catching the turn;
  neck_fold  the neck folded forward 60 to 130 degrees with the head hanging; one swing driver cannot tell the head hanging from
             the head turned back to lie on its jaw at faint's rest (Nick's ear rest A), and the key must not touch that rest;
  grip_arm   held's upper arm drawn back into the grip, inside the swing range batch 3's approved wind-ups use (46 to 57 back).
So each key here is a pose-space key (rig_core.pose_space_value): it sits at the rotations of one or more bones at its sculpt
pose and its value falls linearly from 1 there to exactly 0 at `radius` degrees of rotation distance (the root of the summed
squares of each bone's angle from its centre). A key whose radius is smaller than its distance to every rotation an approved
clip uses is exactly 0 over all of them, and posed_skin skips a key at 0, so those skins stay bit for bit; --check-bakes proves
it per key and per frame (the smallest distance against the radius, and every frame's posed skin hashed with and without the
keys). Keys a radius apart along a path interpolate linearly (tents), like the rise and fall of the swing keys.

The shape. Each key is a mush key like the deepflex and overhead keys (the posed skin smoothed along the skin inside a smooth
mask, relaxed so a crease that runs through itself unfolds, the rest skin's own detail turned back on by each vertex's skinning
rotation), sculpted with every existing key and every earlier key of this run on at its value. The neck keys first carry the
rest neck along a smooth curve from the chest's end of the neck to the head's (`neck_curve`): each rest cross-section of the
neck is placed on a Hermite curve between the chest-side and head-side rings, turned by the slerp of the chest's and the head's
turns aligned to the curve, so the neck keeps its own thickness instead of thinning into a stalk where the chest's and the
head's skinning blend across a deep fold; the mush then smooths what is left. Masks keep every key off the face around the eyes
(rig.json eyeCentres, eyeClear: the eyelids are fitted to that skin) and, for the ears and arms, on that side's half.

The spec json lists the keys: [{name, group, side (L, R or C), sculpt: {pose, lift} or "poses.json:frame", centre_bones,
radius, target ("mush", "neck_curve" or "cancel" with cancel_keys), mask (per group defaults below, overridable)}]. Writes the keys into
<rig dir>/correctives.json and .npz under <rig dir>/correctives.lock (waiting while another builder holds it; the files are
re-read at that moment and only this run's groups are replaced; the first run keeps correctives-pre-posespace.json and .npz),
and <rig dir>/pose-space-corrective.json (the spec, every key's centre, radius, vertex count and largest move, and the proof).
"""
import argparse
import hashlib
import json
import math
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

B = rc.ANIM_BONES
NAMES = rc.ANIM_NAMES
NI = {b: i for i, b in enumerate(NAMES)}
GROUPS = ('ear_turn', 'neck_fold', 'grip_arm')
# mask defaults (rig metres): within r0 of the band the mask is 1, past r1 it is 0
MASK = {'ear_turn': dict(r0=.025, r1=.07), 'neck_fold': dict(r0=.03, r1=.08), 'grip_arm': dict(r0=.015, r1=.05)}
NECK_S0, NECK_S1 = .2, 1.8      # the neck curve's ends along the rest neck axis, in neck-bone lengths from neck_base


def load_rig(R, rest_npz):
    rig = json.loads((R/'rig.json').read_text())
    J = json.loads((R/'joints.json').read_text())
    s, off = rig['transform']['scale'], np.array(rig['transform']['offset'])
    d = np.load(rest_npz)
    rest = s*(d['src'].astype(np.float64)-off)
    wt = np.load(R/'weights.npz')
    idx = wt['idx'].astype(int)
    w = np.round(wt['w'].astype(np.float64)*4096)/4096
    w /= w.sum(1, keepdims=True)
    eyes = [s*(np.array(c)-off) for c in rig['eyeCentres']]
    return rig, J, rest, d['edges'].astype(np.int64), d['tri'].astype(np.int64), idx, w, eyes, s*rig['eyeClear']


def frames_of(path):
    data = json.loads(Path(path).read_text())
    return data['frames'] if isinstance(data, dict) and 'frames' in data else data


def pose_of(spec):
    if isinstance(spec, dict):
        return spec['pose'], spec.get('lift', 0.)
    path, _, fr = str(spec).rpartition(':')
    f = frames_of(path)[int(fr)]
    return f['pose'], f['lift']


class Builder:
    def __init__(self, R, rest_npz, rounds=100, fine=4, relax=2000):
        self.R = Path(R)
        self.rig, self.J, self.rest, self.edges, self.tris, self.idx, self.w, self.eyes, self.eye_clear = load_rig(self.R, rest_npz)
        n = len(self.rest)
        self.n = n
        self.dense = np.zeros((n, len(NAMES)))
        np.put_along_axis(self.dense, self.idx, self.w, 1)
        e = self.edges
        A = sp.coo_matrix((np.ones(2*len(e)), (np.r_[e[:, 0], e[:, 1]], np.r_[e[:, 1], e[:, 0]])), shape=(n, n)).tocsr()
        self.A = sp.diags(1/np.maximum(np.asarray(A.sum(1)).ravel(), 1))@A
        self.rounds, self.fine, self.relax = rounds, fine, relax
        self._sm = {}
        de = np.min([np.linalg.norm(self.rest-c, axis=1) for c in self.eyes], axis=0)
        self.eye_free = rc.smoothstep(de, self.eye_clear, self.eye_clear+.03)      # 0 on the face round the eyes
        self.keys = [k for k in json.loads((self.R/'correctives.json').read_text())['keys'] if not k['name'].startswith(GROUPS)]
        with np.load(self.R/'correctives.npz') as cz:
            self.deltas = {k['name']: (np.array(cz[k['name']+'__ids']), cz[k['name']+'__delta'].astype(np.float64)) for k in self.keys}

    def share(self, bones):
        return self.dense[:, [NI[b] for b in bones]].sum(1)

    def smooth(self, V, rounds):
        for _ in range(rounds):
            V = .5*V+.5*(self.A@V)
        return V

    # ------------------------------------------------------------ masks
    def mask(self, group, sd, r0, r1):
        rest = self.rest
        if group == 'ear_turn':
            ear = self.share([f'ear_{i}.{sd}' for i in range(1, 5)])
            band = (ear > .02) & (ear < .98) & (rest[:, 0]*(1 if sd == 'L' else -1) > 0)
            part = self.share(['head', 'jaw']+[f'ear_{i}.{sd}' for i in range(1, 5)])*(1-rc.smoothstep(ear, .95, .995))  # the blade stays rigid
            side = rc.smoothstep(rest[:, 0]*(1 if sd == 'L' else -1), .0, .03)
        elif group == 'neck_fold':
            ch, hj = self.share(['chest']), self.share(['head', 'jaw'])
            band = (ch > .02) & (hj > .02)
            part = self.share(['chest', 'neck', 'head', 'jaw', 'spine'])
            side = np.ones(len(rest))
        else:   # grip_arm: the upper arm and the shoulder on that side (the lumps run along the whole upper arm)
            arm = self.share([f'clavicle.{sd}', f'upperarm.{sd}'])
            band = (arm > .3) & (rest[:, 0]*(1 if sd == 'L' else -1) > 0)
            part = self.share(['chest', 'spine', f'clavicle.{sd}', f'upperarm.{sd}'])*(1-rc.smoothstep(self.share([f'forearm.{sd}', f'hand.{sd}']), .3, .7))
            side = rc.smoothstep(rest[:, 0]*(1 if sd == 'L' else -1), .0, .03)
        db, _ = cKDTree(rest[band]).query(rest, k=1, workers=-1)
        no_ear = 1-rc.smoothstep(self.share([b for b in NAMES if b.startswith('ear_')]), .0, .05) if group != 'ear_turn' else 1.
        no_arm = 1-rc.smoothstep(self.share([b for b in NAMES if rc.base_of(b) in ('clavicle', 'upperarm', 'forearm', 'hand')]), .0, .05) \
            if group == 'neck_fold' else 1.
        m = (1-rc.smoothstep(db, r0, r1))*rc.smoothstep(part, .5, .9)*side*self.eye_free*no_ear*no_arm
        return m, int(band.sum())

    # ------------------------------------------------------------ targets
    def neck_curve(self, pose, lift, P, m):
        """The rest neck carried along a Hermite curve from the chest-side ring to the head-side ring (see the module note)."""
        J = self.J
        nb, hb = np.array(J['neck_base']), np.array(J['head_base'])
        L = float(np.linalg.norm(hb-nb))
        ax0 = (hb-nb)/L
        srel = (self.rest-nb)@ax0/L
        T = rc.bone_transforms(J, pose, bones=B, root_translate=tuple(rc.lift_vec(lift)))
        (CR, Ct), (HR, Ht) = T['chest'], T['head']
        p0, p1 = nb+NECK_S0*L*ax0, nb+NECK_S1*L*ax0
        c0, c1, d0, d1 = CR@p0+Ct, HR@p1+Ht, CR@ax0, HR@ax0
        kk = float(np.linalg.norm(c1-c0))
        ts = np.linspace(0, 1, 512)
        H = np.stack([2*ts**3-3*ts**2+1, ts**3-2*ts**2+ts, -2*ts**3+3*ts**2, ts**3-ts**2], 1)
        D = np.stack([6*ts**2-6*ts, 3*ts**2-4*ts+1, -6*ts**2+6*ts, 3*ts**2-2*ts], 1)
        ctrl = np.stack([c0, kk*d0, c1, kk*d1])
        cv, tg = H@ctrl, D@ctrl
        tg /= np.linalg.norm(tg, axis=1, keepdims=True)
        Rrel = CR.T@HR
        F = np.stack([rc.align_rotation(Fs@ax0, g)@Fs for Fs, g in ((CR@rc.helper_rotation(Rrel, t), g) for t, g in zip(ts, tg))])
        t = (srel-NECK_S0)/(NECK_S1-NECK_S0)
        i = np.clip(np.round(t*(len(ts)-1)).astype(int), 0, len(ts)-1)
        o = self.rest-(nb+np.outer(srel*L, ax0))
        tgt = cv[i]+np.einsum('nij,nj->ni', F[i], o)
        along = rc.smoothstep(t, 0., .25)*(1-rc.smoothstep(t, .75, 1.))
        k = m*along
        return P+k[:, None]*(tgt-P)

    def sm_rest(self, fine, rounds):
        key = (fine, rounds)
        if key not in self._sm:
            self._sm[key] = self.smooth(self.rest, fine)-self.smooth(self.rest, rounds)
        return self._sm[key]

    def mush(self, P, Rv, m, base=None, fine=None, rounds=None, relax=None):
        """deepflex_corrective.py's target: the skin smoothed along the skin, relaxed inside the mask, the rest detail turned on
        (the detail finer than `fine` rounds of smoothing is the rest skin's own; fine 0 keeps all of it)."""
        fine = self.fine if fine is None else fine
        rounds = self.rounds if rounds is None else rounds
        relax = self.relax if relax is None else relax
        base = self.smooth(P if base is None else base, rounds)
        if relax:
            sel = np.where(m > 1e-4)[0]
            As = self.A[sel]
            lap = self.smooth(self.rest, rounds)
            lap = lap-self.A@lap
            Qv = _quats(Rv)
            lq = (.6*m[sel])[:, None]
            for _ in range(300):
                Qv[sel] = (1-lq)*Qv[sel]+lq*(As@Qv)
            Qv /= np.linalg.norm(Qv, axis=1, keepdims=True)
            tl = np.einsum('nij,nj->ni', rc._qmat(Qv[sel]), lap[sel])
            lam = (.85*m[sel])[:, None]
            for _ in range(relax):
                base[sel] = (1-lam)*base[sel]+lam*(As@base+tl)
        return base+np.einsum('nij,nj->ni', Rv, self.sm_rest(fine, rounds))

    # ------------------------------------------------------------ one key
    def sculpt(self, spec, new_keys, new_deltas):
        pose, lift = pose_of(spec['sculpt'])
        group, sd = spec['group'], spec.get('side', 'C')
        mk = dict(MASK[group], **spec.get('mask', {}))
        if 'band_bones' in mk:
            # a mask of the spec's own: the band is the skin with more than band_min of its weight on band_bones (side
            # substituted), within near[1] m of the joint near[0], the part the skin on part_bones
            sd_ = sd if sd != 'C' else 'L'
            bb = [b.replace('{sd}', sd_) for b in mk['band_bones']]
            band = (self.share(bb) > mk.get('band_min', .3))
            if 'near' in mk:
                band &= np.linalg.norm(self.rest-np.array(self.J[mk['near'][0].replace('{sd}', sd_)]), axis=1) < mk['near'][1]
            db, _ = cKDTree(self.rest[band]).query(self.rest, k=1, workers=-1)
            part = self.share([b.replace('{sd}', sd_) for b in mk['part_bones']])
            m = (1-rc.smoothstep(db, mk['r0'], mk['r1']))*rc.smoothstep(part, .5, .9)*self.eye_free
            nb = int(band.sum())
        else:
            m, nb = self.mask(group, sd if sd != 'C' else 'L', mk['r0'], mk['r1'])
        for kn in spec.get('keep_near', ()):
            # (grip arm: the elbow keys keep working at the elbow itself; a fourth number is the share still taken out there)
            jn, k0, k1 = kn[:3]
            fl = kn[3] if len(kn) > 3 else 0.
            m = m*(fl+(1-fl)*rc.smoothstep(np.linalg.norm(self.rest-np.array(self.J[jn.replace('{sd}', sd)]), axis=1), k0, k1))
        keys = self.keys+new_keys
        deltas = dict(self.deltas, **new_deltas)
        P, Rv, vals = rc.posed_skin(self.rest, self.idx, self.w, self.J, pose, lift, keys=keys, deltas=deltas)
        if spec.get('target', 'mush') == 'neck_curve':
            Pc = self.neck_curve(pose, lift, P, m)          # already blended by the mask along the neck
            ms = m*spec.get('mush_share', .5)
            target = Pc+ms[:, None]*(self.mush(Pc, Rv, ms, fine=spec.get('fine'), rounds=spec.get('rounds'), relax=spec.get('relax'))-Pc)
        elif spec.get('target') == 'cancel':
            # the skin as it would be without the named keys of that side (the arm keys sculpted for other arm poses), the rest
            # of the rig's keys on: inside the mask the new key takes their effect back out
            drop = tuple(f'{c}.{sd}' for c in spec['cancel_keys'])
            kk = [k_ for k_ in keys if k_['name'] not in drop]
            Pc, _, _ = rc.posed_skin(self.rest, self.idx, self.w, self.J, pose, lift, keys=kk, deltas=deltas)
            target = P+m[:, None]*(Pc-P)
        else:
            target = self.mush(P, Rv, m, fine=spec.get('fine'), rounds=spec.get('rounds'), relax=spec.get('relax'))
            target = P+m[:, None]*(target-P)
        dR = np.einsum('nji,nj->ni', Rv, target-P)
        centre = {b: [float(x) for x in rc.quat_from_matrix(rc.euler_matrix(*pose.get(b, (0, 0, 0))))] for b in spec['centre_bones']}
        k = dict(name=spec['name'], group=group, bone=spec['centre_bones'][0],
                 pose_space=dict(centre=centre, radius=float(spec['radius'])),
                 pose=spec.get('label', str(spec['sculpt']) if not isinstance(spec['sculpt'], dict) else spec['name']))
        v = rc.key_value(self.J, pose, k, B)
        if v < .999:
            raise SystemExit(f"{spec['name']}: value {v} at its own sculpt pose")
        ids = np.where(np.linalg.norm(dR, axis=1) > 1e-6)[0]
        mv = np.linalg.norm(np.einsum('nij,nj->ni', Rv, dR), axis=1)
        new_keys.append(k)
        new_deltas[k['name']] = (ids, dR[ids])
        return dict(vertices=int(len(ids)), max_move_mm=round(float(mv.max())*1000, 1), band=nb,
                    mask_vertices=int((m > 1e-4).sum()), active_keys_at_sculpt={a: round(b, 3) for a, b in vals.items() if b > 0})


def _quats(Rm):
    wq = np.sqrt(np.maximum(1+Rm[:, 0, 0]+Rm[:, 1, 1]+Rm[:, 2, 2], 1e-12))/2
    return np.stack([wq, (Rm[:, 2, 1]-Rm[:, 1, 2])/(4*wq), (Rm[:, 0, 2]-Rm[:, 2, 0])/(4*wq), (Rm[:, 1, 0]-Rm[:, 0, 1])/(4*wq)], 1)


def key_distance(pose, k):
    ps = k['pose_space']
    return math.sqrt(sum(rc.local_turn_deg(pose, b, q)**2 for b, q in ps['centre'].items()))


def check_bake(bld, path, new_keys, new_deltas, skins=True):
    """Per new key: the smallest rotation distance over the bake's frames against its radius and its largest value; and every
    frame's posed skin with and without the new keys hashed and compared byte for byte."""
    frames = frames_of(path)
    shapes = ac.load_shapes(Path(path).parent.parent) if (Path(path).parent.parent/'breath_key.json').exists() else {}
    per = {}
    for k in new_keys:
        d = min(key_distance(fr['pose'], k) for fr in frames)
        per[k['name']] = dict(min_distance_deg=round(d, 3), radius_deg=k['pose_space']['radius'],
                              value_max=max(rc.key_value(bld.J, fr['pose'], k, B) for fr in frames))
    out = dict(frames=len(frames), keys=per, value_max=max(v['value_max'] for v in per.values()) if per else 0.,
               margin_min_deg=round(min(v['min_distance_deg']-v['radius_deg'] for v in per.values()), 3) if per else None)
    if skins:
        h0, h1 = hashlib.sha256(), hashlib.sha256()
        same = True
        deltas = dict(bld.deltas, **new_deltas)
        for fr in frames:
            base = ac.apply_shapes(bld.rest, fr, shapes) if shapes else bld.rest
            P0, _, _ = rc.posed_skin(base, bld.idx, bld.w, bld.J, fr['pose'], fr['lift'], keys=bld.keys, deltas=deltas)
            P1, _, _ = rc.posed_skin(base, bld.idx, bld.w, bld.J, fr['pose'], fr['lift'], keys=bld.keys+new_keys, deltas=deltas)
            h0.update(np.ascontiguousarray(P0).tobytes())
            h1.update(np.ascontiguousarray(P1).tobytes())
            same = same and bool(np.array_equal(P0.view(np.uint64), P1.view(np.uint64)))
        out.update(skin_sha256_without=h0.hexdigest(), skin_sha256_with=h1.hexdigest(), skins_identical=same)
    return out


def write_rig(R, new_keys, new_deltas, groups, rep):
    if not (R/'correctives-pre-posespace.json').exists():
        shutil.copyfile(R/'correctives.json', R/'correctives-pre-posespace.json')
        shutil.copyfile(R/'correctives.npz', R/'correctives-pre-posespace.npz')
    lock = R/'correctives.lock'
    t0 = time.time()
    while True:
        try:
            fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(fd, f'pose_space_corrective.py (batch 2 builder) {time.strftime("%Y-%m-%d %H:%M:%S")}\n'.encode())
            os.close(fd)
            break
        except FileExistsError:
            if time.time()-t0 > 3600:
                raise SystemExit(f'{lock} held for an hour: {lock.read_text(errors="replace").strip()}; nothing written')
            print('waiting for', lock, flush=True)
            time.sleep(5)
    try:
        cur_json = json.loads((R/'correctives.json').read_text())
        mine = {k['name'] for k in new_keys}
        cur_keys = [k for k in cur_json['keys'] if k['name'] not in mine and not k['name'].startswith(tuple(groups))]
        with np.load(R/'correctives.npz') as cz:
            cur = {k['name']: (np.array(cz[k['name']+'__ids']), np.array(cz[k['name']+'__delta'])) for k in cur_keys}
        for k in new_keys:
            cur[k['name']] = (new_deltas[k['name']][0], new_deltas[k['name']][1].astype(np.float32))
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
                time.sleep(10)
        out = dict(cur_json)
        out['keys'] = cur_keys+new_keys
        (R/'correctives.tmp.json').write_text(json.dumps(out, indent=1))
        os.replace(R/'correctives.tmp.json', R/'correctives.json')
    finally:
        lock.unlink(missing_ok=True)
    (R/'pose-space-corrective.json').write_text(json.dumps(rep, indent=1, default=str))
    print('wrote', len(cur_keys+new_keys), 'keys', flush=True)


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('rig', type=Path)
    p.add_argument('rest', type=Path)
    p.add_argument('spec', type=Path)
    p.add_argument('--groups', default=','.join(GROUPS))
    p.add_argument('--check-bakes', default='')
    p.add_argument('--no-skins', action='store_true', help='skip the per-frame skin hashes (the distance proof only)')
    p.add_argument('--dry-run', action='store_true')
    p.add_argument('--dry-out', type=Path, default=None, help='with --dry-run: write a full correctives set here (a rig dir copy)')
    a = p.parse_args()
    groups = [g for g in a.groups.split(',') if g]
    bld = Builder(a.rig, a.rest)
    spec = [s for s in json.loads(a.spec.read_text()) if s['group'] in groups]
    # keys of the groups not rebuilt stay as the rig has them
    kept = [k for k in json.loads((a.rig/'correctives.json').read_text())['keys'] if k['name'].startswith(GROUPS) and not k['name'].startswith(tuple(groups))]
    if kept:
        with np.load(a.rig/'correctives.npz') as cz:
            for k in kept:
                bld.deltas[k['name']] = (np.array(cz[k['name']+'__ids']), cz[k['name']+'__delta'].astype(np.float64))
        bld.keys += kept
    new_keys, new_deltas, report = [], {}, {}
    t0 = time.time()
    for s_ in spec:
        report[s_['name']] = bld.sculpt(s_, new_keys, new_deltas)
        print(s_['name'], report[s_['name']], f'{time.time()-t0:.0f}s', flush=True)
    clips = {}
    for b in [b for b in a.check_bakes.split(',') if b]:
        nm = Path(b).parent.parent.parent.name+'/'+Path(b).parent.parent.name+'/'+Path(b).parent.name
        clips[nm] = check_bake(bld, b, new_keys, new_deltas, skins=not a.no_skins)
        print(nm, {k: v for k, v in clips[nm].items() if k in ('frames', 'value_max', 'margin_min_deg', 'skins_identical')}, flush=True)
    rep = dict(spec=spec, keys=new_keys, sculpt=report, eye_clear_m=bld.eye_clear, clips=clips,
               proof=dict(all_zero=all(v['value_max'] == 0 for v in clips.values()),
                          all_identical=all(v.get('skins_identical', True) for v in clips.values())))
    print('PROOF', json.dumps(rep['proof']), flush=True)
    if a.dry_run:
        if a.dry_out:
            a.dry_out.mkdir(parents=True, exist_ok=True)
            for f in ('rig.json', 'joints.json', 'weights.npz', 'poses.json', 'toe-corrective.json'):
                if (a.rig/f).exists():
                    shutil.copyfile(a.rig/f, a.dry_out/f)
            allk = bld.keys+new_keys
            dd = dict(bld.deltas, **new_deltas)
            np.savez_compressed(a.dry_out/'correctives.npz', **{f"{k['name']}__ids": dd[k['name']][0] for k in allk},
                                **{f"{k['name']}__delta": dd[k['name']][1].astype(np.float32) for k in allk})
            base_json = json.loads((a.rig/'correctives.json').read_text())
            (a.dry_out/'correctives.json').write_text(json.dumps(dict(base_json, keys=allk), indent=1))
            (a.dry_out/'pose-space-corrective.json').write_text(json.dumps(rep, indent=1, default=str))
            print('dry rig in', a.dry_out, flush=True)
    else:
        if not rep['proof']['all_zero'] or not rep['proof']['all_identical']:
            raise SystemExit('a key is not 0 over an approved bake; nothing written')
        write_rig(a.rig, new_keys, new_deltas, groups, rep)
