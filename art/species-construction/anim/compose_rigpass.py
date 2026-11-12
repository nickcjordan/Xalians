"""Boards and numbers for the rig pass of 2026-11-12 (pose_space_corrective.py: neck fold and grip arm keys; the ear turn board).

  python art/species-construction/anim/compose_rigpass.py <rigpass dir> <rig dir> <rig-pre dir> <rest skin npz> <held bake dir>

<rigpass dir> holds bake/ (rigpass_ear, rigpass_neck) and frames/ from render-rigpass.sh. Writes into <rigpass dir>:
  numbers.json   per board pose, on the rig before this pass and now: folds per region (pose_board.py's test: [turned past 90
                 degrees from its bone's expected normal, under a quarter of its rest area]) and creases (turned past 90 and 60
                 degrees from the locally smoothed surface) at the ear root, the neck and the arm; the near ear's dish facing (x of
                 its normal; + toward the side camera); the eye check (largest move of any vertex within the eyelids' clear
                 radius of an eye between the two rigs, at idle frame 0 and over faint and held); the pixel proof (idle frame 0
                 and hurt frame 6, side and sprite, before and after, and against the approved renders on disk);
  ear-turn-board.png, neck-fold-board.png, grip-arm-board.png, proof-board.png.
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
import scipy.sparse as sp
from PIL import Image, ImageChops, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
import rig_core as rc  # noqa: E402
import akinza_clips as ac  # noqa: E402
import akinza_clipset_b2 as c2  # noqa: E402

B = rc.ANIM_BONES
NAMES = rc.ANIM_NAMES
O, RIG, PRE, REST, HELD = (Path(x) for x in sys.argv[1:6])
ANIM = O.parents[1]


class Skin:
    def __init__(self, R):
        self.s = c2.SkinSampler(R, REST)
        d = np.load(REST)
        self.edges = d['edges'].astype(np.int64)
        self.tris = self.s.tris
        J = self.s.J
        rest = self.s.rest
        c = rest[self.tris].mean(1)
        self.region = {}
        for r, js, rad in (('ear_root', ['ear0.L', 'ear0.R'], .09), ('neck', ['neck_base', 'head_base'], .08),
                           ('shoulder', ['shoulder.L', 'shoulder.R'], .09), ('elbow', ['elbow.L', 'elbow.R'], .06)):
            dist = np.min([np.linalg.norm(c-np.array(J[j]), axis=1)-np.linalg.norm(c-np.array(J[j]), axis=1).min() for j in js], 0)
            self.region[r] = dist < rad
        self.near = c[:, 0] > 0
        n = len(rest)
        e = self.edges
        A = sp.coo_matrix((np.ones(2*len(e)), (np.r_[e[:, 0], e[:, 1]], np.r_[e[:, 1], e[:, 0]])), shape=(n, n)).tocsr()
        self.A = sp.diags(1/np.maximum(np.asarray(A.sum(1)).ravel(), 1))@A
        self.n_rest = np.cross(rest[self.tris[:, 1]]-rest[self.tris[:, 0]], rest[self.tris[:, 2]]-rest[self.tris[:, 0]])
        self.dom = self.s.idx[self.tris[:, 0], 0]

    def numbers(self, pose, lift, regions):
        P = self.s.posed(pose, lift)
        T = rc.bone_transforms(self.s.J, pose, bones=B, root_translate=tuple(rc.lift_vec(lift)))
        t = self.tris
        nP = np.cross(P[t[:, 1]]-P[t[:, 0]], P[t[:, 2]]-P[t[:, 0]])
        Rd = np.stack([T[b][0] for b in NAMES])[self.dom]
        ex = np.einsum('nij,nj->ni', Rd, self.n_rest)
        cos = np.einsum('ij,ij->i', nP, ex)/np.maximum(np.linalg.norm(nP, axis=1)*np.linalg.norm(ex, axis=1), 1e-20)
        area = np.linalg.norm(nP, axis=1)/np.maximum(np.linalg.norm(self.n_rest, axis=1), 1e-20)
        V = P.copy()
        for _ in range(8):
            V = .5*V+.5*(self.A@V)
        nV = np.cross(V[t[:, 1]]-V[t[:, 0]], V[t[:, 2]]-V[t[:, 0]])
        cc = np.einsum('ij,ij->i', nP, nV)/np.maximum(np.linalg.norm(nP, axis=1)*np.linalg.norm(nV, axis=1), 1e-20)
        out = {}
        for r in regions:
            m = self.region[r]
            if r in ('ear_root', 'shoulder', 'elbow'):
                m = m & self.near
            out[r] = dict(folds=[int(np.sum(m & (cos < 0))), int(np.sum(m & (area < .25)))],
                          creases=[int(np.sum(m & (cc < 0))), int(np.sum(m & (cc < .5)))])
        a, n0 = c2._ear_frames(self.s)['L']
        out['ear_dish_x'] = round(float((T['ear_1.L'][0]@n0)[0]), 3)
        return out, P


def frames(p):
    return json.loads(Path(p).read_text())


new, pre = Skin(RIG), Skin(PRE)
num = dict(ear_turn={}, neck_fold={}, grip_arm={}, eyes={}, proof={})
for fr in frames(O/'bake'/'rigpass_ear'/'poses.json'):
    nm = fr['info']['board']
    a_, _ = new.numbers(fr['pose'], fr['lift'], ('ear_root',))
    num['ear_turn'][nm] = dict(rig=a_)
for fr in frames(O/'bake'/'rigpass_neck'/'poses.json'):
    nm = fr['info']['board']
    a_, _ = new.numbers(fr['pose'], fr['lift'], ('neck',))
    b_, _ = pre.numbers(fr['pose'], fr['lift'], ('neck',))
    num['neck_fold'][nm] = dict(before=b_, after=a_)
hf = frames(HELD/'held'/'poses.json')
for f in (0, 12, 17, 21, 36):
    a_, _ = new.numbers(hf[f]['pose'], hf[f]['lift'], ('shoulder', 'elbow'))
    b_, _ = pre.numbers(hf[f]['pose'], hf[f]['lift'], ('shoulder', 'elbow'))
    num['grip_arm'][f'held {f}'] = dict(before=b_, after=a_)

# the eyes: no vertex within the eyelids' clear radius of an eye moves between the two rigs
rig = json.loads((RIG/'rig.json').read_text())
s_, off = rig['transform']['scale'], np.array(rig['transform']['offset'])
eyes = [s_*(np.array(c)-off) for c in rig['eyeCentres']]
near_eye = np.min([np.linalg.norm(new.s.rest-c, axis=1) for c in eyes], 0) < s_*rig['eyeClear']
idle0 = frames(ANIM/'clips4'/'bake'/'idle'/'poses.json')[0]
d0 = np.abs(new.s.posed(idle0['pose'], idle0['lift'])-pre.s.posed(idle0['pose'], idle0['lift'])).max()
num['eyes']['idle_f0_max_move_mm_all_vertices'] = float(d0*1000)
for clip, bake in (('faint', ANIM/'clipset2'/'bake-f12'), ('held', HELD), ('held_in', HELD), ('held_out', HELD)):
    mx = 0.
    for fr in frames(bake/clip/'poses.json'):
        mx = max(mx, float(np.abs(new.s.posed(fr['pose'], fr['lift'])[near_eye]-pre.s.posed(fr['pose'], fr['lift'])[near_eye]).max()))
    num['eyes'][f'{clip}_max_move_mm_near_eyes'] = round(mx*1000, 6)
num['eyes']['vertices_near_eyes'] = int(near_eye.sum())


def im(p):
    return Image.open(p).convert('RGB')


def diff(a, b):
    A_, B_ = np.asarray(im(a), np.int16), np.asarray(im(b), np.int16)
    if A_.shape != B_.shape:
        return dict(same_size=False), None
    d = np.abs(A_-B_).max(2)
    return dict(same_size=True, pixels_different=int((d > 0).sum()), max_channel_diff=int(d.max())), Image.fromarray((np.minimum(d*40, 255)).astype(np.uint8)).convert('RGB')


F = O/'frames'
proof_tiles = []
for clip, f, appr in (('idle', 0, ANIM/'clips4'/'frames'/'clay'), ('hurt', 6, ANIM/'clipset1'/'frames'/'clay')):
    for view in ('side', 'sprite'):
        p0, p1 = F/'proof-pre'/clip/view/f'{f:04d}.png', F/'proof-new'/clip/view/f'{f:04d}.png'
        st, dimg = diff(p0, p1)
        sa, _ = diff(appr/clip/view/f'{f:04d}.png', p1)
        num['proof'][f'{clip} {f} {view}'] = dict(before_vs_after=st, approved_on_disk_vs_after=sa)
        sc = 1 if view == 'side' else 3
        row = [im(p0), im(p1), dimg if dimg is not None else Image.new('RGB', im(p0).size)]
        row = [r.resize((r.width*sc, r.height*sc), Image.NEAREST) if sc > 1 else r for r in row]
        proof_tiles.append((f'{clip} f{f} {view}: before | after | difference x40 ({st.get("pixels_different")} px differ)', row))
(O/'numbers.json').write_text(json.dumps(num, indent=1))


def board(rows, out, title, tile=None):
    W = max(sum((tile or r[0].width) for r in rr) for _, rr in rows)
    H = sum((tile or rr[0].height)+18 for _, rr in rows)+24
    B_ = Image.new('RGB', (W, H), (14, 14, 14))
    dr = ImageDraw.Draw(B_)
    dr.text((6, 5), title, fill=(250, 220, 90))
    y = 24
    for lab, rr in rows:
        dr.text((6, y+2), lab, fill=(230, 230, 230))
        x = 0
        for r in rr:
            if tile:
                r = r.resize((tile, tile), Image.LANCZOS)
            B_.paste(r, (x, y+18))
            x += r.width
        y += (tile or rr[0].height)+18
    B_.save(out)
    print('wrote', out, B_.size)


board(proof_tiles, O/'proof-board.png', 'Rig pass proof: approved clips render the same before and after (clay, 64 samples)')
EAR = c2.EAR_TURN['board']
ears = frames(O/'bake'/'rigpass_ear'/'poses.json')
rows = []
for view in ('ear_side', 'ear_3q', 'side'):
    rows.append((f'{view}: ' + '   '.join(f"turn {t:.0f}: root folds {num['ear_turn'][f'ear_turn_{t:.0f}']['rig']['ear_root']['folds']} creases "
                                          f"{num['ear_turn'][f'ear_turn_{t:.0f}']['rig']['ear_root']['creases']} dish x {num['ear_turn'][f'ear_turn_{t:.0f}']['rig']['ear_dish_x']}"
                                          for t in EAR) if view == 'ear_side' else view,
                 [im(F/'new'/'rigpass_ear'/f'crop_{view}'/f'{i:04d}.png') if view != 'side' else im(F/'new'/'rigpass_ear'/'side'/f'{i:04d}.png')
                  for i in range(len(ears))]))
board(rows, O/'ear-turn-board.png', 'Ear turn: laid back 35 below the skull line, splayed 25, turned 0, 20, 40, 60, 80 about its length '
      '(no keys: the rig as it is). Folds [past 90, under 1/4 area], creases [past 90, past 60], near ear root', tile=360)
necks = frames(O/'bake'/'rigpass_neck'/'poses.json')
rows = []
for rig_, lab in (('pre', 'before'), ('new', 'after')):
    for view in ('neck_side', 'neck_3q'):
        rows.append((f'{lab} {view}: ' + '   '.join(f"{fr['info']['board']}: folds {num['neck_fold'][fr['info']['board']]['before' if rig_ == 'pre' else 'after']['neck']['folds']} "
                                                  f"creases {num['neck_fold'][fr['info']['board']]['before' if rig_ == 'pre' else 'after']['neck']['creases']}" for fr in necks),
                     [im(F/rig_/'rigpass_neck'/f'crop_{view}'/f'{i:04d}.png') for i in range(len(necks))]))
rows.append(('after, side 720', [im(F/'new'/'rigpass_neck'/'side'/f'{i:04d}.png') for i in range(len(necks))]))
board(rows, O/'neck-fold-board.png', 'Neck fold: the neck bone flexed forward 0, 45, 60, 95, 130 with the head straight on it, before and after the '
      'neck fold keys', tile=360)
rows = []
for rig_, lab in (('pre', 'before'), ('new', 'after')):
    for view in ('arm_side', 'arm_3q'):
        rows.append((f'{lab} {view}: ' + '   '.join(f"{k_}: elbow folds {v['before' if rig_ == 'pre' else 'after']['elbow']['folds']} creases "
                                                  f"{v['before' if rig_ == 'pre' else 'after']['elbow']['creases']}" for k_, v in num['grip_arm'].items()),
                     [im(F/f'arm-{rig_}'/'held'/f'crop_{view}'/f'{i:04d}.png') for i in (0, 12, 17, 21, 36)]))
board(rows, O/'grip-arm-board.png', 'Grip arm: held pass 10 loop frames 0, 12, 17, 21 (the pry), 36, before and after the grip arm keys', tile=360)
print(json.dumps(num['eyes']), json.dumps(num['proof']))
