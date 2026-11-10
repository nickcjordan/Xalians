"""Fix pass 3 measures of the batch 1 clips (numpy, PIL; no Blender). Numbers only.

  python art/species-construction/anim/clipset_measure_p3.py <clipset bake> <clipset frames> <approved bake> <approved frames>
      <rig dir> <rest skin npz> [--out <json>]

- head_ear: the head and ears' width and height in both framings, from the rig (the head, jaw and ear skin projected
  into the render cameras, px) and from the render (the critic's head band: the top 130 px at 720, scaled at 192, from the
  snout to its farthest pixel), per clip frame, against Night Stalk frame 18 and idle frame 0 (the approved bake and
  frames). The band can catch a raised paw (guard), so the rig number is the one for the head and ears alone.
- hurt: the head's chin-up turn against the neck (degrees, pitch of the head relative to the neck from frame 0) and the
  head's and chest's travel from frame 0 per frame (mm and side px), so the lead can be read.
- evade: the lowest skin and claw vertices against the floor (mm), and the render's lowest silhouette row against the
  floor row (z = 0 projected) at 720 and 192.
- guard: the top tail's tip twitch in px at both framings (the tip joint against the same frames with the twitch off),
  the breath at both framings (the chest top, the crown and the paws' vertical travel over the loop, px from the rig),
  and the frame to frame change at 192 and 720 (silhouette pixels and any RGB difference), the seam (26 to 0) included.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
import rig_core as rc  # noqa: E402
import akinza_clips as ac  # noqa: E402
import akinza_clipset_b1 as cb  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('bake', type=Path)
p.add_argument('frames', type=Path)
p.add_argument('approved_bake', type=Path)
p.add_argument('approved_frames', type=Path)
p.add_argument('rig', type=Path)
p.add_argument('rest', type=Path)
p.add_argument('--out', type=Path, default=None)
p.add_argument('--box', default='-0.5375,-0.5567,-0.987,0.6738,0.7639,0.932')
p.add_argument('--sprite-box', default='-0.5675,-0.5867,-1.017,0.7038,0.7939,0.962')
a = p.parse_args()
MM = {'side': 2.354, 'sprite': 9.152}

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
NAMES = rc.ANIM_NAMES
B = rc.ANIM_BONES
NI = {b: i for i, b in enumerate(NAMES)}
dense = np.zeros((len(rest), len(NAMES)))
np.put_along_axis(dense, idx, w, 1)
share = lambda bones: dense[:, [NI[b] for b in bones]].sum(1)
EARS = share([b for b in NAMES if b.startswith('ear_')]) > .2
HEAD_EARS = np.flatnonzero((share(['head', 'jaw']+[b for b in NAMES if b.startswith('ear_')]) > .9))
FEET = np.flatnonzero(share(['foot.L', 'foot.R']) > .5)
CHEST_TOP = np.flatnonzero(share(['chest']) > .9)
HANDS = np.flatnonzero(share(['hand.L', 'hand.R']) > .5)


class Cam:
    """The render cameras (clipset_measure.py's): side azimuth 90, elevation 3, 720 px; sprite elevation 0, 192 px."""
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
        self.pps = size/self.ortho

    def px(self, P_m):
        X = np.atleast_2d(P_m)/s+off
        return np.stack([(X@self.r-self.cx)*self.pps+self.size/2, self.size/2-(X@self.u-self.cy)*self.pps], 1)


CAMS = {'side': Cam(np.array([float(v) for v in a.box.split(',')]), 90., 3., 720, 1.08, 0.),
        'sprite': Cam(np.array([float(v) for v in a.sprite_box.split(',')]), 90., 0., 192, 1., .06)}


def skin(fr, shapes):
    P, _, _ = rc.posed_skin(ac.apply_shapes(rest, fr, shapes), idx, w, J, fr['pose'], fr['lift'], KEYS, DELTAS)
    return P


def jt(fr, bone, joint):
    T = rc.bone_transforms(J, fr['pose'], bones=B, root_translate=tuple(rc.lift_vec(fr['lift'])))
    return T[bone][0]@np.array(J[joint])+T[bone][1]


def mask(path):
    im = np.asarray(Image.open(path).convert('L')).astype(float)
    return np.abs(im-im[3, 3]) > 6


def rgb(path):
    return np.asarray(Image.open(path).convert('RGB')).astype(int)


def band(m):
    """The critic's head band: the snout (front-most pixel in the top 130 px at 720) to the band's farthest pixel."""
    ys, xs = np.nonzero(m)
    top = int(ys.min())
    hh = int(round(130*m.shape[0]/720))
    sel = ys < top+hh
    i = int(np.argmin(np.where(sel, xs, 10**9)))
    sx, sy = int(xs[i]), int(ys[i])
    dd = np.where(sel & (xs > sx), (xs-sx)**2+(ys-sy)**2, -1)
    j = int(np.argmax(dd))
    return dict(snout_to_far_px=round(float(math.sqrt(dd[j])), 1), band_width_px=int(xs[sel].max()-sx))


def head_ear(P):
    out = {}
    for v, c in CAMS.items():
        q = c.px(P[HEAD_EARS])
        out[v] = dict(width_px=round(float(q[:, 0].max()-q[:, 0].min()), 1), height_px=round(float(q[:, 1].max()-q[:, 1].min()), 1))
    return out


load = lambda bake, clip: json.loads((bake/clip/'poses.json').read_text())
SH = ac.load_shapes(a.bake)
SHA = ac.load_shapes(a.approved_bake)
out = dict(units='px at the render framings (side 720, sprite 192); mm in the rig', mmPerPx=MM)

# ---- head and ears against Night Stalk f18 and idle 0
refs = {'stalk18': ('stalk', 18), 'idle0': ('idle', 0)}
he = {'refs': {}}
for name, (clip, k) in refs.items():
    fr = load(a.approved_bake, clip)[k]
    he['refs'][name] = dict(rig=head_ear(skin(fr, SHA)),
                            render={v: band(mask(a.approved_frames/clip/v/f'{k:04d}.png')) for v in MM})
for clip in ('hurt', 'evade', 'guard_in', 'guard', 'guard_out'):
    frs = load(a.bake, clip)
    rows = []
    for fr in frs:
        k = fr['frame']
        rows.append(dict(frame=k, rig=head_ear(skin(fr, SH)), render={v: band(mask(a.frames/clip/v/f'{k:04d}.png')) for v in MM}))
    he[clip] = rows
out['head_ear'] = he

# ---- hurt: the chin-up snap and the head's lead
frs = load(a.bake, 'hurt')
T0 = None
rows = []
for fr in frs:
    T = rc.bone_transforms(J, fr['pose'], bones=B, root_translate=tuple(rc.lift_vec(fr['lift'])))
    rel = T['neck'][0].T@T['head'][0]
    if T0 is None:
        T0 = (rel, jt(fr, 'head', 'head_top'), jt(fr, 'chest', 'clavicle'))
    turn = rc.euler_from_matrix(T0[0].T@rel)
    hd, ch = jt(fr, 'head', 'head_top')-T0[1], jt(fr, 'chest', 'clavicle')-T0[2]
    rows.append(dict(frame=fr['frame'], head_vs_neck_from_f0_deg=[round(float(x), 2) for x in turn],
                     head_top_travel_mm=round(float(np.linalg.norm(hd))*1000, 1), chest_travel_mm=round(float(np.linalg.norm(ch))*1000, 1),
                     head_top_travel_side_px=round(float(np.linalg.norm(hd))*1000/MM['side'], 1),
                     chest_travel_side_px=round(float(np.linalg.norm(ch))*1000/MM['side'], 1)))
out['hurt'] = dict(perFrame=rows, note='head_vs_neck_from_f0_deg: XYZ euler of the head against the neck relative to frame 0 '
                   '(negative X: chin up); travel: the head top and the chest (clavicle joint) from frame 0')

# ---- evade: claws and floor at frame 3
frs = load(a.bake, 'evade')
ev = []
floor = {}
for fr in frs:
    P = skin(fr, SH)
    k = fr['frame']
    row = dict(frame=k, feet_lowest_mm=round(float(P[FEET, 2].min())*1000, 2))
    for v, c in CAMS.items():
        m = mask(a.frames/'evade'/v/f'{k:04d}.png')
        ys, xs = np.nonzero(m)
        if k == 0:
            floor[v] = int(ys.max())          # frame 0 stands on the floor (idle frame 0's pose): its lowest row is the floor row
        row[f'{v}_lowest_row'] = int(ys.max())
        row[f'{v}_floor_row'] = floor[v]
        row[f'{v}_px_under_floor'] = int(ys.max())-floor[v]
        row[f'{v}_feet_lowest_row_rig'] = round(float(c.px(P[FEET])[:, 1].max()), 2)
    ev.append(row)
out['evade'] = dict(perFrame=ev, note="rows grow down; the floor row is frame 0's lowest silhouette row (standing on the floor); "
                    "px_under_floor > 0 means pixels below it; feet_lowest_mm is the rig's lowest foot vertex above the floor")

# ---- guard: tail twitch, breath, frame to frame change
rg = ac.Rig(R)
frs = load(a.bake, 'guard')
n = len(frs)
tw = cb.GUARD['twitch_deg']
cb.GUARD['twitch_deg'] = {}
cb._GUARD_BASE.clear()
calm = [cb.guard_frame(rg, k) for k in range(n)]
cb.GUARD['twitch_deg'] = tw
cb._GUARD_BASE.clear()
tip = {v: [] for v in CAMS}
for fr, fc in zip(frs, calm):
    a_ = jt(fr, 'tail_a5', 'tail_a_j5')
    b_ = jt(fc, 'tail_a5', 'tail_a_j5')
    for v, c in CAMS.items():
        q = c.px(np.array([a_, b_]))
        tip[v].append(round(float(np.linalg.norm(q[0]-q[1])), 1))
br = {v: dict(chest_top=[], crown=[], paws=[]) for v in CAMS}
for fr in frs:
    P = skin(fr, SH)
    for v, c in CAMS.items():
        br[v]['chest_top'].append(float(c.px(P[CHEST_TOP])[:, 1].min()))
        br[v]['crown'].append(float(c.px(P[HEAD_EARS])[:, 1].min()))
        br[v]['paws'].append(float(c.px(P[HANDS])[:, 1].min()))
breath = {v: {k: dict(range_px=round(max(x)-min(x), 2), per_frame=[round(y, 2) for y in x]) for k, x in d_.items()} for v, d_ in br.items()}
change = {}
for v in MM:
    ms = [mask(a.frames/'guard'/v/f'{k:04d}.png') for k in range(n)]
    cs = [rgb(a.frames/'guard'/v/f'{k:04d}.png') for k in range(n)]
    sil = [int((ms[k] ^ ms[k-1]).sum()) for k in range(n)]           # k = 0: frame 26 to 0 (the seam)
    pix = [int((np.abs(cs[k]-cs[k-1]).max(2) > 0).sum()) for k in range(n)]
    pix8 = [int((np.abs(cs[k]-cs[k-1]).max(2) > 8).sum()) for k in range(n)]
    change[v] = dict(silhouette_px=sil, rgb_any_px=pix, rgb_over8_px=pix8, min_silhouette=min(sil), min_rgb_any=min(pix),
                     min_rgb_over8=min(pix8), note='index k: frame k-1 to k; index 0 is the seam, frame 26 to frame 0')
out['guard'] = dict(tail_tip_twitch_px=tip, tail_tip_twitch_max_px={v: max(x) for v, x in tip.items()}, breath=breath, change=change)

dst = a.out or a.bake/'measure-pass3.json'
dst.write_text(json.dumps(out, indent=1))
print('refs', json.dumps(he['refs']))
for clip in ('hurt', 'evade', 'guard_in', 'guard', 'guard_out'):
    r = he[clip]
    print(clip, 'rig side width max', max(x['rig']['side']['width_px'] for x in r), 'min', min(x['rig']['side']['width_px'] for x in r),
          'render band side max', max(x['render']['side']['snout_to_far_px'] for x in r))
print('hurt', [(x['frame'], x['head_vs_neck_from_f0_deg'][0], x['head_top_travel_mm'], x['chest_travel_mm']) for x in rows])
print('evade f3', ev[3])
print('guard tip', out['guard']['tail_tip_twitch_max_px'], 'breath', {v: {k: x['range_px'] for k, x in d_.items()} for v, d_ in breath.items()})
print('guard change', {v: {k: c[k] for k in ('min_silhouette', 'min_rgb_any', 'min_rgb_over8')} for v, c in change.items()})
print('wrote', dst)
