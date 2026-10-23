"""Pixel measurements of the baked Akinza clips at the two review framings (numpy, no Blender). Numbers only.

  python art/species-construction/anim/clip_measure.py <rig dir> <rest skin npz> <bake dir> --box lo,hi --sprite-box lo,hi
      [--out <json>]

Landmarks are skinned exactly as the renders skin them (rig_core: corrective keys, then dual quaternions), on a small
set of skin vertices, and projected with the cameras of clip_frames.py: `side` (azimuth 90, elevation 3, fitted to
--box, 720 px) and `sprite` (look-dev side_left, azimuth 90, elevation 0, --sprite-box with a 6 percent margin, 192 px).
Image x grows toward the creature's back (it faces left), image y grows downward; "rise" is reported as up positive.

Per frame: shoulder top (the near shoulder's highest skin), sternum (the front of the chest), head centroid, nose,
crown, pelvis and neck-base joints, torso pitch (pelvis to neck base, degrees forward of vertical), the near ear's
ear_1 swing (degrees from rest) and ear tip, the three tail tips, both knee angles (degrees of bend).
Writes <bake dir>/measure.json (or --out).
"""
import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import rig_core as rc  # noqa: E402
sys.path.insert(0, str(HERE))
import akinza_clips as ac  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('rig', type=Path)
p.add_argument('rest', type=Path)
p.add_argument('bake', type=Path)
p.add_argument('--box', required=True)
p.add_argument('--sprite-box', required=True)
p.add_argument('--size', type=int, default=720)
p.add_argument('--sprite', type=int, default=192)
p.add_argument('--out', type=Path, default=None)
p.add_argument('--anticip-peak', type=int, default=3)
p.add_argument('--hold-breath', default='18,24', help='hold breath empty and full frames')
a = p.parse_args()
AF = a.anticip_peak
HB = [int(v) for v in a.hold_breath.split(',')]

B = rc.ANIM_BONES
NAMES = rc.ANIM_NAMES
NI = {b: i for i, b in enumerate(NAMES)}
R = a.rig
rig = json.loads((R/'rig.json').read_text())
J = json.loads((R/'joints.json').read_text())
s, off = rig['transform']['scale'], np.array(rig['transform']['offset'])
d = np.load(a.rest)
rest = s*(d['src'].astype(np.float64)-off)
wt = np.load(R/'weights.npz')
idx = wt['idx'].astype(int)
w = np.round(wt['w'].astype(np.float64)*4096)/4096
w /= w.sum(1, keepdims=True)
KEYS = json.loads((R/'correctives.json').read_text())['keys']
cz = np.load(R/'correctives.npz')
DELTAS = {k['name']: (cz[k['name']+'__ids'], cz[k['name']+'__delta'].astype(np.float64)) for k in KEYS}
dense = np.zeros((len(rest), len(NAMES)))
np.put_along_axis(dense, idx, w, 1)
share = lambda bones: dense[:, [NI[b] for b in bones]].sum(1)

# ---- landmark vertex sets (rest, rig metres)
sh = share(['upperarm.L']) > .5                      # the near shoulder's cap (the deltoid's top)
SHOULDER = np.flatnonzero(sh)[np.argsort(-rest[sh, 2])[:12]]
chest = (share(['chest']) > .5) & (np.abs(rest[:, 0]) < .03) & (rest[:, 2] > J['chest'][2]) & (rest[:, 2] < J['neck_base'][2])
STERNUM = np.flatnonzero(chest)[np.argsort(rest[chest, 1])[:12]]
head = share(['head']) > .95
HEAD = np.flatnonzero(head)
NOSE = HEAD[np.argsort(rest[HEAD, 1])[:8]]
CROWN = HEAD[np.argsort(-rest[HEAD, 2])[:12]]
belly = (share(['spine', 'pelvis']) > .5) & (np.abs(rest[:, 0]) < .04) & (rest[:, 2] > J['pelvis'][2]) & (rest[:, 2] < J['waist'][2]+.06)
BELLY = np.flatnonzero(belly)[np.argsort(rest[belly, 1])[:12]]
near = np.linalg.norm(rest-np.array(J['shoulder.L']), axis=1) < .08
TRAPEZIUS = np.flatnonzero(near)[np.argsort(-rest[near, 2])[:12]]      # the slope from the shoulder to the neck (side view top line)
SETS = dict(shoulder=SHOULDER, trapezius=TRAPEZIUS, sternum=STERNUM, head=HEAD, nose=NOSE, crown=CROWN, belly=BELLY)
SEL = np.unique(np.concatenate(list(SETS.values())))
POS = {k: np.searchsorted(SEL, v) for k, v in SETS.items()}


SHAPES = ac.load_shapes(a.bake)


def skin_sel(pose, lift, fr):
    vals = rc.corrective_values(J, pose, KEYS, B)
    x = ac.apply_shapes(rest[SEL].copy(), fr, SHAPES, sel=SEL)
    for k in KEYS:
        v = vals[k['name']]
        if v > 0:
            ids, dl = DELTAS[k['name']]
            m = np.isin(ids, SEL)
            x[np.searchsorted(SEL, ids[m])] += v*dl[m]
    T = rc.bone_transforms(J, pose, root_translate=tuple(rc.lift_vec(lift)), bones=B)
    P, _ = rc.skin_points_dq(x, idx[SEL], w[SEL], T, B)
    return P, T


def joint(T, name):
    b = next(b for b, _, h, t in B if h == name or t == name)
    Rb, tb = T[b]
    return Rb@np.array(J[name])+tb


class Cam:
    def __init__(self, box, az, el, size, fit, margin):
        lo, hi = box[:3], box[3:]
        ar, er = math.radians(az), math.radians(el)
        dvec = np.array([math.sin(ar)*math.cos(er), -math.cos(ar)*math.cos(er), math.sin(er)])
        f = -dvec
        r = np.cross(f, [0, 0, 1.])
        r /= np.linalg.norm(r)
        u = np.cross(r, f)
        corners = np.array([[hi[0] if k & 1 else lo[0], hi[1] if k & 2 else lo[1], hi[2] if k & 4 else lo[2]] for k in range(8)])
        xs, ys = corners@r, corners@u
        self.ortho = max(xs.max()-xs.min(), ys.max()-ys.min())*fit*(1+2*margin)
        self.cx, self.cy = (xs.max()+xs.min())/2, (ys.max()+ys.min())/2
        self.r, self.u, self.size = r, u, size
        self.px_per_src = size/self.ortho

    def px(self, P_m):
        X = np.atleast_2d(P_m)/s+off            # rig metres -> source units
        return np.stack([(X@self.r-self.cx)*self.px_per_src+self.size/2, self.size/2-(X@self.u-self.cy)*self.px_per_src], 1)


box = np.array([float(v) for v in a.box.split(',')])
sbox = np.array([float(v) for v in a.sprite_box.split(',')])
CAMS = {'side': Cam(box, 90., 3., a.size, 1.08, 0.), 'sprite': Cam(sbox, 90., 0., a.sprite, 1., .06)}


def knee_bend(T, sd):
    h, k, an = joint(T, f'hip.{sd}'), joint(T, f'knee.{sd}'), joint(T, f'ankle.{sd}')
    u, v = k-h, an-k
    return math.degrees(math.acos(max(-1, min(1, u@v/np.linalg.norm(u)/np.linalg.norm(v)))))


def ear_swing(pose):
    q = rc.quat_from_matrix(rc.euler_matrix(*pose.get('ear_1.L', (0, 0, 0))))
    return math.degrees(2*math.acos(min(1., abs(q[0]))))


out = dict(units='px, image y down; rise = up positive', mmPerPx={k: round(1000*s/c.px_per_src, 3) for k, c in CAMS.items()})
for clip in ('idle', 'stalk'):
    frames = json.loads((a.bake/clip/'poses.json').read_text())
    rows = []
    for fr in frames:
        P, T = skin_sel(fr['pose'], fr['lift'], fr)
        pts = {k: P[v].mean(0) for k, v in POS.items()}
        pts['pelvis'] = joint(T, 'pelvis')
        pts['neck_base'] = joint(T, 'neck_base')
        pts['ear_tip'] = joint(T, 'ear4.L')
        for t in rc.TAILS:
            pts[f'tail_{t}_tip'] = joint(T, f'tail_{t}_j5')
        tv = pts['neck_base']-pts['pelvis']
        row = dict(frame=fr['frame'], torso_pitch_deg=round(math.degrees(math.atan2(-tv[1], tv[2])), 2),
                   ear_swing_deg=round(ear_swing(fr['pose']), 2),
                   knee_bend_deg={sd: round(knee_bend(T, sd), 2) for sd in 'LR'})
        for cam, c in CAMS.items():
            row[cam] = {k: [round(float(x), 2) for x in c.px(v)[0]] for k, v in pts.items()}
        rows.append(row)
    out[clip] = rows


def series(clip, cam, key, axis):
    return np.array([r[cam][key][axis] for r in out[clip]])


summ = {}
for cam in CAMS:
    S = {}
    # idle breath: rise (up positive) between the breath's empty and full frames, measured as the loop's range
    for k in ('shoulder', 'sternum', 'head', 'crown', 'nose', 'pelvis', 'neck_base'):
        y = -series('idle', cam, k, 1)
        x = series('idle', cam, k, 0)
        S[f'idle_{k}_rise_range_px'] = round(float(y.max()-y.min()), 2)
        S[f'idle_{k}_foreaft_range_px'] = round(float(x.max()-x.min()), 2)
    # idle, breath only: frames 0 (empty) and the first breath peak (frame 19 of 45, inhale share .42) minus the
    # weight shift's own move, read from the same landmark on the pelvis
    summ[cam] = S
# per-breath rise: shoulder/sternum/head height change from breath empty to full, with the weight shift's vertical
# move removed by subtracting the pelvis joint's change over the same frames
for cam in CAMS:
    S = summ[cam]
    for clip, f0, f1 in (('idle', 0, 19), ('idle', 45, 64), ('stalk', HB[0], HB[1])):
        for k in ('shoulder', 'trapezius', 'sternum', 'head', 'crown'):
            dy = -(series(clip, cam, k, 1)[f1]-series(clip, cam, k, 1)[f0])
            dp = -(series(clip, cam, 'pelvis', 1)[f1]-series(clip, cam, 'pelvis', 1)[f0])
            S[f'{clip}_breath_{f0}_{f1}_{k}_rise_px'] = round(float(dy-dp), 2)
        dh = np.array(out[clip][f1][cam]['head'])-np.array(out[clip][f0][cam]['head'])
        dpp = np.array(out[clip][f1][cam]['pelvis'])-np.array(out[clip][f0][cam]['pelvis'])
        S[f'{clip}_breath_{f0}_{f1}_head_ride_px'] = round(float(np.linalg.norm(dh-dpp)), 2)
    # Night Stalk anticipation: frame 0 to its peak (AF)
    for k in ('shoulder', 'trapezius', 'sternum', 'crown', 'nose', 'head'):
        S[f'stalk_anticip_0_{AF}_{k}_rise_px'] = round(float(-(series('stalk', cam, k, 1)[AF]-series('stalk', cam, k, 1)[0])), 2)
        S[f'stalk_anticip_0_{AF}_{k}_back_px'] = round(float(series('stalk', cam, k, 0)[AF]-series('stalk', cam, k, 0)[0]), 2)
    # descent: nose path, frames 6 to 16 (x forward = negative image x)
    S['stalk_nose_path'] = {f: [round(float(series('stalk', cam, 'nose', 0)[f]), 1), round(float(series('stalk', cam, 'nose', 1)[f]), 1)]
                            for f in range(len(out['stalk']))}
# tails on the rise against the idle pose the stalk lands on (each frame's own idle clock): the lag and the overshoot
stalk_frames = json.loads((a.bake/'stalk'/'poses.json').read_text())
for cam in CAMS:
    rows = {}
    for r, fr in zip(out['stalk'], stalk_frames):
        ip = fr['info'].get('idlePhase')
        if ip is None or r['frame'] < 30:
            continue
        rows[r['frame']] = {t: [round(r[cam][f'tail_{t}_tip'][k]-out['idle'][ip][cam][f'tail_{t}_tip'][k], 2) for k in (0, 1)] for t in 'abc'}
    summ[cam]['stalk_tail_tip_minus_idle_px'] = rows
    for k in ('crown', 'pelvis', 'sternum', 'nose'):
        y = series('stalk', cam, k, 1)
        summ[cam][f'stalk_{k}_y_step_px'] = {f: round(float(y[f]-y[f-1]), 2) for f in range(1, len(y))}
crouch = out['stalk'][HB[0]]['torso_pitch_deg']
rest_p = out['stalk'][0]['torso_pitch_deg']
summ['torso_pitch_deg_per_frame'] = {r['frame']: r['torso_pitch_deg'] for r in out['stalk']}
summ['torso_pitch_share_of_crouch'] = {r['frame']: round((r['torso_pitch_deg']-rest_p)/(crouch-rest_p), 3) for r in out['stalk']}
summ['ear_swing_deg_stalk'] = {r['frame']: r['ear_swing_deg'] for r in out['stalk']}
summ['ear_swing_deg_idle_flick'] = {r['frame']: r['ear_swing_deg'] for r in out['idle'] if 50 <= r['frame'] <= 61}
summ['knee_bend_deg_idle'] = {sd: [min(r['knee_bend_deg'][sd] for r in out['idle']), max(r['knee_bend_deg'][sd] for r in out['idle'])] for sd in 'LR'}
summ['torso_pitch_deg_idle'] = [min(r['torso_pitch_deg'] for r in out['idle']), max(r['torso_pitch_deg'] for r in out['idle'])]
out['summary'] = summ
dst = a.out or a.bake/'measure.json'
dst.write_text(json.dumps(out, indent=1))
print(json.dumps({k: v for k, v in summ.items() if k in ('side', 'sprite')}, indent=0)[:6000])
print('torso share', summ['torso_pitch_share_of_crouch'])
print('ear stalk', summ['ear_swing_deg_stalk'])
print('flick', summ['ear_swing_deg_idle_flick'], 'knees', summ['knee_bend_deg_idle'], 'torso idle', summ['torso_pitch_deg_idle'])
print('mm per px', out['mmPerPx'])
