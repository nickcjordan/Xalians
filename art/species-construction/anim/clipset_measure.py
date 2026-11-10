"""Visible amplitudes of the batch 1 clips, measured in the renders (the blind critic's silhouette methods,
anim/clips4/critic/tools: a pixel belongs to the creature where its gray differs from the corner by more than 6),
plus the travel of the body in the rig (numpy, PIL; no Blender). Numbers only.

  python art/species-construction/anim/clipset_measure.py <frames dir> <idle frames dir> <bake dir> <rig dir> <rest skin npz>
      [--clips hurt,evade] [--out <json>]

<frames dir>/<clip>/{side,sprite}/NNNN.png are the clip's clay frames; <idle frames dir>/idle/{side,sprite} the
approved idle's (same framings). Per frame and view: the silhouette's box, the snout (the front-most pixel in the head
band, the top 130 px at 720 as the batch 1 critic's ear.py, scaled at 192), the crown (the head band's top pixel), the ear tip (the head
band's pixel farthest from the snout) and its angle (0 straight up from the snout, 90 straight back), the rear-most
tail pixel, the lowest pixel (the feet), and the pixels that changed since the previous frame. Per clip and view: the
largest move of each landmark from frame 0, in px and in mm (side 2.354 and sprite 9.152 mm a pixel, clips4
measure.json), and the changed pixels at the hand back (clip's last frame to idle frame 0) against idle's own 89 to 0.
Per frame also the centroid's speed, the rear tail tip's path, guard's loop seam in changed pixels, and from the rig
projected into both views: the muzzle's underside over the near paw's top (px and mm), the pelvis joint, the near knee's
bend. In the rig: the root's travel back (y) and up (z), the feet's lift, and the body's front (the front-most skin that is
not arm, tail or ear) against frame 0's back (the rear-most skin that is not tail or ear), and the same for the trunk
alone (pelvis, spine and chest skin), so `clear` can be read.
Writes <bake dir>/measure-render.json (or --out).
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

p = argparse.ArgumentParser()
p.add_argument('frames', type=Path)
p.add_argument('idle', type=Path)
p.add_argument('bake', type=Path)
p.add_argument('rig', type=Path)
p.add_argument('rest', type=Path)
p.add_argument('--clips', default='hurt,evade,guard_in,guard,guard_out')
p.add_argument('--out', type=Path, default=None)
p.add_argument('--box', default='-0.5375,-0.5567,-0.987,0.6738,0.7639,0.932')
p.add_argument('--sprite-box', default='-0.5675,-0.5867,-1.017,0.7038,0.7939,0.962')
a = p.parse_args()
a.box = [float(v) for v in a.box.split(',')]
a.sprite_box = [float(v) for v in a.sprite_box.split(',')]
MM = {'side': 2.354, 'sprite': 9.152}


def mask(path):
    im = np.asarray(Image.open(path).convert('L')).astype(float)
    return np.abs(im-im[3, 3]) > 6


def feats(m, head_h):
    ys, xs = np.nonzero(m)
    top = int(ys.min())
    band = ys < top+head_h
    i = int(np.argmin(np.where(band, xs, 10**9)))
    sx, sy = int(xs[i]), int(ys[i])
    sel = band & (xs > sx)
    d = np.where(sel, (xs-sx)**2+(ys-sy)**2, -1)
    j = int(np.argmax(d))
    tx, ty = int(xs[j]), int(ys[j])
    k = int(np.argmax(xs))
    lo = int(np.argmax(ys))
    return dict(box=[int(xs.min()), top, int(xs.max()), int(ys.max())], snout=[sx, sy], crown=[int(xs[np.argmin(ys)]), top],
                ear_tip=[tx, ty], ear_angle=round(math.degrees(math.atan2(tx-sx, sy-ty)), 1), tail_rear=[int(xs[k]), int(ys[k])],
                lowest=[int(xs[lo]), int(ys[lo])], centroid=[round(float(xs.mean()), 2), round(float(ys.mean()), 2)], area=int(m.sum()))


def series(view, clip, n):
    return [mask(a.frames/clip/view/f'{k:04d}.png') for k in range(n)]


# ---- rig: travel, feet and the body's front and back
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
NI = {b: i for i, b in enumerate(NAMES)}
dense = np.zeros((len(rest), len(NAMES)))
np.put_along_axis(dense, idx, w, 1)
share = lambda bones: dense[:, [NI[b] for b in bones]].sum(1)
TAILS = share([b for b in NAMES if b.startswith('tail')]) > .2
ARMS = share([b for b in NAMES if rc.base_of(b) in ('upperarm', 'forearm', 'hand')]) > .2
EARS = share([b for b in NAMES if b.startswith('ear_')]) > .2
BODY_FRONT = np.flatnonzero(~TAILS & ~ARMS & ~EARS)
BODY_BACK = np.flatnonzero(~TAILS & ~EARS)
TRUNK = np.flatnonzero((share(['pelvis', 'spine', 'chest']) > .5) & ~TAILS & ~ARMS)
FEET = np.flatnonzero(share(['foot.L', 'foot.R']) > .5)
SHAPES = ac.load_shapes(a.bake)
HANDL = np.flatnonzero(share(['hand.L']) > .5)
HEADV = np.flatnonzero((share(['head', 'jaw']) > .9) & ~EARS)


class Cam:
    """The render cameras as clip_measure.py builds them (side: azimuth 90, elevation 3, fitted to the box, 720 px;
    sprite: azimuth 90, elevation 0, the sprite box with a 6 percent margin, 192 px)."""
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


CAMS = {'side': Cam(np.array(a.box), 90., 3., 720, 1.08, 0.), 'sprite': Cam(np.array(a.sprite_box), 90., 0., 192, 1., .06)}


def landmarks(P, fr):
    """The near paw's top and the muzzle's underside (the lowest head and jaw skin within 6 cm of the head's front),
    their vertical gap in mm and in px at both framings (positive: the muzzle above the paw), the pelvis joint projected,
    and the near knee's bend."""
    hv = P[HEADV]
    front = hv[hv[:, 1] < hv[:, 1].min()+.06]
    mu = front[np.argmin(front[:, 2])]
    paw = P[HANDL][np.argmax(P[HANDL][:, 2])]
    T = rc.bone_transforms(J, fr['pose'], bones=rc.ANIM_BONES, root_translate=tuple(rc.lift_vec(fr['lift'])))
    jt = lambda b, j: T[b][0]@np.array(J[j])+T[b][1]
    h, k_, an = jt('thigh.L', 'hip.L'), jt('thigh.L', 'knee.L'), jt('shin.L', 'ankle.L')
    u, v = k_-h, an-k_
    out = dict(muzzle_over_paw_mm=round(float(mu[2]-paw[2])*1000, 1), paw_ahead_of_muzzle_mm=round(float(mu[1]-paw[1])*1000, 1),
               knee_L_bend_deg=round(math.degrees(math.acos(max(-1., min(1., u@v/np.linalg.norm(u)/np.linalg.norm(v))))), 1))
    for cam, c in CAMS.items():
        q = c.px(np.array([mu, paw, jt('pelvis', 'pelvis')]))
        out[f'muzzle_over_paw_{cam}_px'] = round(float(q[1, 1]-q[0, 1]), 1)
        out[f'pelvis_{cam}_px'] = [round(float(x), 1) for x in q[2]]
    return out

out = dict(units='px (image y down) unless named; mm in the rig', mmPerPx=MM, method='clips4 critic silhouettes (gray differs from the '
           'corner by more than 6); head band = the top 130 px at 720 (scaled at 192), as the batch 1 critic measures the ear angle')
idle_m = {v: [mask(a.idle/'idle'/v/f'{k:04d}.png') for k in (0, 89)] for v in MM}
for clip in a.clips.split(','):
    frames = json.loads((a.bake/clip/'poses.json').read_text())
    n = len(frames)
    C = dict(perFrame={}, summary={})
    for view in MM:
        ms = series(view, clip, n)
        head_h = int(round(130*ms[0].shape[0]/720))     # the critic's head band (clipset1/critic/ear.py): top 130 px at 720
        F = [feats(m, head_h) for m in ms]
        for k in range(n):
            F[k]['changed_px'] = int((ms[k] ^ ms[k-1]).sum()) if k else int((ms[0] ^ idle_m[view][1]).sum())
        C['perFrame'][view] = F
        S = {}
        for key in ('snout', 'crown', 'ear_tip', 'tail_rear', 'lowest', 'centroid'):
            dx = [F[k][key][0]-F[0][key][0] for k in range(n)]
            dy = [F[0][key][1]-F[k][key][1] for k in range(n)]          # up positive
            kx = int(np.argmax(np.abs(dx)))
            ky = int(np.argmax(np.abs(dy)))
            S[key] = dict(max_back_px=max(dx), max_forward_px=-min(dx), max_up_px=max(dy), max_down_px=-min(dy),
                          largest_dx=[kx, dx[kx]], largest_dy=[ky, dy[ky]],
                          max_back_mm=round(max(dx)*MM[view], 1), max_up_mm=round(max(dy)*MM[view], 1), max_down_mm=round(-min(dy)*MM[view], 1))
        S['ear_angle'] = dict(frame0=F[0]['ear_angle'], max=max(f['ear_angle'] for f in F), min=min(f['ear_angle'] for f in F),
                              per_frame=[f['ear_angle'] for f in F])
        S['changed_px_per_frame'] = [f['changed_px'] for f in F]
        S['handback_last_to_idle0_changed_px'] = int((idle_m[view][0] ^ ms[n-1]).sum())
        S['idle_89_to_0_changed_px'] = int((idle_m[view][0] ^ idle_m[view][1]).sum())
        S['entry_idle89_to_frame0_changed_px'] = F[0]['changed_px']
        S['snout_path_px'] = [F[k]['snout'] for k in range(n)]
        S['centroid_speed_px_per_frame'] = [round(float(np.hypot(F[k]['centroid'][0]-F[k-1]['centroid'][0], F[k]['centroid'][1]-F[k-1]['centroid'][1])), 2)
                                            for k in range(1, n)]
        S['tail_rear_path_px'] = [F[k]['tail_rear'] for k in range(n)]
        if clip == 'held':          # batch 2's loop
            S['loop_seam_last_to_0_changed_px'] = int((ms[0] ^ ms[n-1]).sum())
            S['loop_changed_px_median'] = float(np.median([int((ms[k] ^ ms[k-1]).sum()) for k in range(1, n)]))
        if clip == 'guard':
            S['loop_seam_26_to_0_changed_px'] = int((ms[0] ^ ms[n-1]).sum())
            S['loop_changed_px_median'] = float(np.median([int((ms[k] ^ ms[k-1]).sum()) for k in range(1, n)]))
        S['lowest_y_px'] = [F[k]['box'][3] for k in range(n)]
        C['summary'][view] = S
    # rig
    rows = []
    P0 = None
    for fr in frames:
        P, _, _ = rc.posed_skin(ac.apply_shapes(rest, fr, SHAPES), idx, w, J, fr['pose'], fr['lift'], KEYS, DELTAS)
        if P0 is None:
            P0 = P
        rows.append(dict(frame=fr['frame'], root_m=[round(float(x), 4) for x in fr['lift']],
                         feet_lowest_mm=round(float(P[FEET, 2].min())*1000, 1),
                         body_front_y_mm=round(float(P[BODY_FRONT, 1].min())*1000, 1),
                         body_back_y_mm=round(float(P[BODY_BACK, 1].max())*1000, 1),
                         trunk_front_y_mm=round(float(P[TRUNK, 1].min())*1000, 1), trunk_back_y_mm=round(float(P[TRUNK, 1].max())*1000, 1),
                         **landmarks(P, fr)))
    back0 = rows[0]['body_back_y_mm']
    tback0 = rows[0]['trunk_back_y_mm']
    for r in rows:
        r['front_behind_frame0_back_mm'] = round(r['body_front_y_mm']-back0, 1)
        r['trunk_front_behind_frame0_trunk_back_mm'] = round(r['trunk_front_y_mm']-tback0, 1)
    C['rig'] = dict(perFrame=rows, root_back_max_mm=round(max(r['root_m'][1] for r in rows)*1000, 1),
                    root_up_max_mm=round(max(r['root_m'][2] for r in rows)*1000, 1),
                    feet_lift_max_mm=max(r['feet_lowest_mm'] for r in rows),
                    first_frame_body_clear=next((r['frame'] for r in rows if r['front_behind_frame0_back_mm'] > 0), None),
                    first_frame_trunk_clear=next((r['frame'] for r in rows if r['trunk_front_behind_frame0_trunk_back_mm'] > 0), None),
                    note='front_behind_frame0_back_mm > 0: the body (no arms, tails or ears; the head included) is wholly behind where its '
                         'back was at frame 0; trunk_...: the same for the trunk alone (pelvis, spine and chest skin)')
    out[clip] = C
    print(clip, json.dumps({v: {k: C['summary'][v][k] for k in ('snout', 'crown', 'ear_tip', 'tail_rear', 'lowest')} for v in MM})[:3000])
    print(clip, 'rig', {k: v for k, v in C['rig'].items() if k != 'perFrame'})
dst = a.out or a.bake/'measure-render.json'
dst.write_text(json.dumps(out, indent=1))
print('wrote', dst)
