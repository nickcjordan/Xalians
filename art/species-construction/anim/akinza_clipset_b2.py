"""Akinza clip set batch 2 as code: displaced, held (with held_in and held_out) and faint, side facing, 30 fps.

  python art/species-construction/anim/akinza_clipset_b2.py bake <rig dir> <out dir> [--clips displaced,held,held_in,held_out,faint]
      [--rest <rest skin npz>] [--faint K|S]
  python art/species-construction/anim/akinza_clipset_b2.py setup <rig dir> <out dir> [--rest <rest skin npz>] [--clips K,S]
  python art/species-construction/anim/akinza_clipset_b2.py verify-approved <rig dir> <approved bake dir> <batch 1 bake dir> <scratch dir>
  python art/species-construction/anim/akinza_clipset_b2.py rigpass <rig dir> <out dir> [<held bake dir for the grip arm keys or -> [<faint bake dir for faint's neck keys>]]

Built beside the approved idle and Night Stalk (akinza_clips.py) and batch 1's hurt, evade and guard (akinza_clipset_b1.py):
this module imports their rig, idle layers, foot solver, ear line and helpers and changes none of them. `verify-approved`
re-bakes idle, Night Stalk and the batch 1 clips with their own modules (PYTHONHASHSEED pinned: guard_in and guard_out write
their pose keys in set order, so their bytes depend on the hash seed) and compares the poses files byte for byte.

Frames use batch 1's format (per frame: pose, lift, shapes, info). Poses are written in the rig's bone order, so the bytes do
not depend on the hash seed. Rig space: metres, +Z up, the creature faces -Y, its left (+X) is the near side to the side
camera. A positive X rotation pitches a bone's front down (a hanging arm or leg swings back, a tail lifts).

faint (fix pass 2) collapses forward onto its chest in profile: the legs by the rig's IK to ankle targets on the floor until it
lands, then the lying pose's own (posed by hand); the whole body pitches forward on the root bone (its head is the floor point
under the pelvis); the lying pose settles as a rigid shape on the floor and the root move is checked per frame on the posed skin
so no skin goes under the floor (the rest skin is needed for the bake: --rest).
"""
import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
import rig_core as rc  # noqa: E402
import clip_primitives as cp  # noqa: E402
import akinza_clips as ac  # noqa: E402
import akinza_clipset_b1 as cb  # noqa: E402

B = rc.ANIM_BONES
NAMES = rc.ANIM_NAMES
IDLE_N = ac.IDLE['frames']
DEFAULT_REST = HERE.parents[2]/'untracked/species-construction/akinza/anim/pass7/legs/legs3-tail2.npz'
turn, rot, slerp_e, table = cb.turn, cb.rot, cb.slerp_e, cb.table


def ordered(pose):
    """The pose in the rig's bone order (deterministic bytes), floats only."""
    return {b: [float(x) for x in pose[b]] for b in NAMES if b in pose}


def frame_dict(f, pose, lift, breath, info, belly=None):
    return cb.frame_dict(f, ordered(pose), lift, breath, info, belly)


class SkinSampler:
    """The rest skin, weights and corrective keys, to pose the skin inside the bake (faint's floor contact)."""
    def __init__(self, rig_dir, rest_npz):
        R = Path(rig_dir)
        rig = json.loads((R/'rig.json').read_text())
        s, off = rig['transform']['scale'], np.array(rig['transform']['offset'])
        d = np.load(rest_npz)
        self.rest = s*(d['src'].astype(np.float64)-off)
        wt = np.load(R/'weights.npz')
        self.idx = wt['idx'].astype(int)
        w = np.round(wt['w'].astype(np.float64)*4096)/4096
        self.w = w/w.sum(1, keepdims=True)
        self.keys = json.loads((R/'correctives.json').read_text())['keys']
        cz = np.load(R/'correctives.npz')
        self.deltas = {k['name']: (cz[k['name']+'__ids'], cz[k['name']+'__delta'].astype(np.float64)) for k in self.keys}
        self.J = json.loads((R/'joints.json').read_text())
        self.tris = d['tri'].astype(np.int64)

    def posed(self, pose, lift):
        P, _, _ = rc.posed_skin(self.rest, self.idx, self.w, self.J, pose, lift, self.keys, self.deltas)
        return P

    def part(self, bones):
        """A sampler for the skin with more than half its weight on these bones only (fix pass 3: the faint's tails and ears kept
        off the floor one by one, posing only their own skin)."""
        dense = np.zeros(len(self.rest))
        for k in range(self.idx.shape[1]):
            dense += np.where(np.isin(self.idx[:, k], [NAMES.index(b) for b in bones]), self.w[:, k], 0.)
        ids = np.flatnonzero(dense > .5)
        remap = -np.ones(len(self.rest), int)
        remap[ids] = np.arange(len(ids))
        sub = SkinSampler.__new__(SkinSampler)
        sub.rest, sub.idx, sub.w, sub.J, sub.keys = self.rest[ids], self.idx[ids], self.w[ids], self.J, self.keys
        sub.deltas = {}
        for k, (kid, dl) in self.deltas.items():
            m = remap[kid] >= 0
            sub.deltas[k] = (remap[kid][m], dl[m])
        return sub


# ---------------------------------------------------------------- displaced

# Knocked off balance backward by a shove it did not choose (the game slides the sprite; the clip shows the loss of balance).
# Research note: the kangaroo kicked in the belly is driven back at the hips with the trunk upright-to-back, and its feet step
# back to catch the weight within about 200 ms; the shoved puppy's head and ears whip with the hit and a foreleg steps a
# few frames later. Per-frame tables, frames 0..20 (20 is idle frame 89's pose): the frame before the hit (1) stays within a few
# px of idle frame 0. Fix pass 2 (critic D1 to D3): the hips lead: the hit (2, `impact`) drives the pelvis back, two thirds of
# its travel by 3, while the trunk tips forward over it so the head lags level (it does not travel back yet); the upper body
# whips back over 3 and 4 and peaks at 5; the arms fly up and out; the far foot (the right, behind the near leg) peels (3),
# lifts flat (4, 5) and is down toes first a step behind on 6 (the heel down on 7) to catch the weight, the near foot planted
# the whole clip (the side camera's 3 degree elevation draws the far paw 12 px above the near paw's floor line, so with the near
# foot stepping both read as off the floor at 4 to 6 though the far paw stood on it: critic D3); a wobble forward over the new
# base (8, 9) and back (10, 11); the far foot peels (12), lifts straight up (13), travels (14) and sets down at its spot (15,
# 16); settled by 18 (`settle`), idle frame 89's pose at 20.
DISPLACED = dict(
    frames=21, impact=2, settle=18,
    # root (x, y back, z up), metres: the hips driven back 19 cm (13 cm of it by frame 3) and down 5.5 cm, the wobble, the return
    root=[(0, 0, 0), (0, .002, 0), (0, .075, -.016), (0, .13, -.03), (0, .162, -.042), (0, .18, -.052), (0, .19, -.058),
          (0, .194, -.056), (0, .182, -.046), (0, .172, -.038), (0, .176, -.042), (0, .166, -.044), (0, .14, -.04),
          (0, .10, -.034), (0, .058, -.028), (0, .024, -.02), (0, .008, -.012), (0, .002, -.006), (0, 0, -.002),
          (0, 0, 0), (0, 0, 0)],
    # feet: (dy back, dz up, pitch, pivot) as evade's (t toe pads, a ankle: the foot's world pitch in the air, f free); the far
    # (right) foot steps, the near (left) foot stays planted
    # (in the air the foot hangs 18 to 20 degrees toes down about the ankle: held flat, the ankle bent past the crouch's and folded
    # 111 to 192 against the approved 49; at 20 the toes clear the floor by 13 to 22 mm. Each foot sets down toes first on its
    # spot: set down 5 to 10 mm short, it slid that far as the heel came down)
    feet={'R': [(0, 0, 0, 't'), (0, 0, 0, 't'), (0, 0, 0, 't'), (0, 0, 10, 't'), (.07, .045, 18, 'a'), (.17, .05, 20, 'a'),
                (.25, 0, 14, 't'), (.25, 0, 4, 't'), (.25, 0, 0, 't'), (.25, 0, 0, 't'), (.25, 0, 0, 't'), (.25, 0, 0, 't'),
                (.25, 0, 12, 't'), (.235, .05, 20, 'a'), (.12, .055, 20, 'a'), (0, 0, 8, 't'), (0, 0, 0, 't'), (0, 0, 0, 't'),
                (0, 0, 0, 't'), (0, 0, 0, 't'), (0, 0, 0, 't')],
          'L': [(0, 0, 0, 't')]*21},
    planted={'R': [1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1], 'L': [1]*21},
    # trunk pitch (degrees, + leans forward), split pelvis .3, spine .35, chest .35: tipped forward over the driven hips (2, 3),
    # whipped back (4, 5), forward over the stepped foot (the wobble), into the return step
    lean=[0, 0, 9, 13, -11, -23, -19, -11, -2, 4, 2, -1, 2, 6, 6, 4, 2, 1, 0, 0, 0],
    # the head: a share of the trunk's lean taken off by the neck (the head keeps its line), plus a lag: the head lags the
    # hips a little forward (chin toward the chest, 2 and 3), then is whipped back with the upper body (4 to 6)
    head_lag=[0, 0, 5, 8, -2, -7, -6, -2, 1, 2, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    # sideways (the stepping side): the hips drop toward the far foot as it lifts, the body rolls a little (pelvis Y)
    roll=[0, 0, 0, -2, -4, -5, -4, -2, 0, 1, 0, 0, -1, -3, -3, -2, -1, 0, 0, 0, 0],
    # arms: upper arm X (- raises forward), upper arm out (degrees, the left arm's Y; the right mirrors), forearm X; the far
    # arm a frame behind the near one
    arms=[(0, 0, 0), (0, 0, 0), (-6, -14, -14), (-18, -38, -38), (-28, -55, -58), (-32, -62, -68), (-28, -56, -62), (-20, -44, -48),
          (-12, -30, -32), (-10, -26, -26), (-14, -30, -30), (-10, -22, -22), (-6, -14, -14), (-4, -9, -9), (-3, -5, -5),
          (-2, -3, -3), (-1, -1, -1), (0, 0, 0), (0, 0, 0), (0, 0, 0), (0, 0, 0)],
    arm_lag={'L': 0., 'R': 1.},
    # ears (fix pass 2, critic D2): shares of Night Stalk's ear sweep on screen (set_ear_line, rigid ear_1 swings): in a frame
    # behind the head's first move (3), on stalk f18's line from 4 through the whole lurch (as hurt), released into idle's ears
    # a frame or two behind the head's return. The line at .97 of the sweep, no more than ear_cap degrees from that share of
    # f18's own ear pose relative to the head (ear_line_capped): the full line folded the ear root 51 to 70 in the forward wobble
    # (8 to 12) against the approved 50, capped at half a degree still 52 and 53; at .97 and 1 degree at most 38
    # (fix pass 3: the release crosses horizontal in one frame, as hurt does at its f9: 14 at 2 degrees above horizontal, 15 at 46,
    # 16 at 76; it was 14 at 2 and 15 at 33, two cap-like frames)
    ears=[0, 0, 0, .45, .97, .97, .97, .97, .97, .97, .97, .97, .97, .8, .55, .22, .06, .01, 0, 0, 0],
    # fix pass 4 (critic pass 3: the ear held one angle to the head from 4 to 12 while the head travelled 150 px): follow-through
    # on top of that line as a rigid ear_1 swing in the picture's plane (degrees, + the tip further back and down, - toward
    # horizontal; ear_follow()): deeper back as the whip stops (5), a rebound toward horizontal that never reaches it as the body
    # swings forward (7, 8), one small bob with the wobble (9 to 11); 3 and 14 untouched
    # (the bob's 4 degrees at 10 folded the ear root 57 against the approved 50; at 2, 45)
    ear_follow=[0, 0, 0, 0, 4, 13, 7, -5, -9, -3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    # fix pass 5 (critic pass 4: against the head the ear still swung only about 8 degrees over 4 to 13): from frame 4 the ear is
    # a rigid ear_1 swing against the head itself, frame 4's ear (relative to the head) turned about the head's own side axis by
    # ear_rel degrees (+ further back and down): it keeps travelling 1 to 2 frames after the head reverses at 6 to 7, deepest at
    # 8, springs back past frame 4's pose at 10 to 11 and settles; ear_rel_w blends it in from the line's ear (ear_follow) and
    # hands back to the release at 13
    ear_rel=[0, 0, 0, 0, 0, 5, 10, 13, 14, 5, -8, -7, -3, 0, 0, 0, 0, 0, 0, 0, 0],
    ear_rel_w=[0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, .6, 0, 0, 0, 0, 0, 0, 0, 0],
    ears_toward_idle_from=12,
    ear_cap=1., ear_inside=20.,
    # tails: lag and swing with the lurch (degrees per bone lift, a lag down each chain and between the tails)
    tails=[0, 0, .25, .8, 1., .7, .1, -.4, -.5, -.25, .2, .3, .15, -.05, -.08, -.03, 0, 0, 0, 0, 0],
    tail_lag=.6, tail_order={'a': 0., 'b': .35, 'c': .7},
    tail_deg={'a': (8., 10., 12., 14., 16.), 'b': (7., 9., 11., 13., 15.), 'c': (6., 8., 10., 12., 14.)},
    tail_fade=(15, 18),
    idle_a=[(0, 'linear', 1.), (3, 'smooth', 0.)],
    idle_b=[(13, 'linear', 0.), (18, 'smooth', 1.)],
)


_DISP_CACHE = {}


def displaced_frame(rig, f):
    P = DISPLACED
    n = P['frames']
    wa, wb = ac.track(P['idle_a'], f), ac.track(P['idle_b'], f)
    lay_a, lift_a, info_a = ac.idle_layers(rig, f % IDLE_N)
    pb = (f-(n-1)+IDLE_N-1) % IDLE_N
    lay_b, lift_b, info_b = ac.idle_layers(rig, pb)
    pose = ac.add_layer({}, lay_a, wa)
    pose = ac.add_layer(pose, lay_b, wb)
    ipose = {k: list(v) for k, v in pose.items()}
    lift = wa*np.asarray(lift_a)+wb*np.asarray(lift_b)+np.asarray(P['root'][f], float)
    breath = (wa*info_a['breath']+wb*info_b['breath'])*ac.IDLE['breath_scale']
    ln = P['lean'][f]
    for b, s_ in (('pelvis', .3), ('spine', .35), ('chest', .35)):
        turn(pose, b, [ln*s_, 0., 0.])
    turn(pose, 'pelvis', [0., P['roll'][f], 0.])
    turn(pose, 'spine', [0., -.6*P['roll'][f], 0.])
    turn(pose, 'neck', [-.4*ln+.5*P['head_lag'][f], 0., 0.])
    turn(pose, 'head', [-.2*ln+.5*P['head_lag'][f], 0., 0.])
    for sd, sg in (('L', 1.), ('R', -1.)):
        ua, uo, fa = (float(table(np.array([r[i] for r in P['arms']]), f-P['arm_lag'][sd])) for i in range(3))
        turn(pose, f'upperarm.{sd}', [ua, sg*uo, 0.])
        turn(pose, f'forearm.{sd}', [fa, 0., 0.])
    if f > P['ears_toward_idle_from']:
        cb.set_ear_line(rig, pose, P['ears'][f], toward=ipose)
    else:
        ear_line_capped(rig, pose, P['ears'][f], P['ear_cap'], inside=P['ear_inside'])
    ear_follow(rig, pose, P['ear_follow'][f])
    w_ = P['ear_rel_w'][f]
    if w_ > 0 and f != 4:
        if 'ear4' not in _DISP_CACHE:
            f4 = displaced_frame(rig, 4)['pose']
            _DISP_CACHE['ear4'] = {b: f4[b] for b in cb.EAR_ROOTS}
        a = math.radians(P['ear_rel'][f])
        Rx = np.array([[1., 0., 0.], [0., math.cos(a), math.sin(a)], [0., -math.sin(a), math.cos(a)]])
        for b in cb.EAR_ROOTS:
            rel = [float(v) for v in rc.euler_from_matrix(Rx@rot(_DISP_CACHE['ear4'][b]))]
            pose[b] = slerp_e(pose[b], rel, w_)
    fade = 1-cp.window(f, *P['tail_fade'])
    for t in rc.TAILS:
        for k in range(1, rc.TAIL_BONES+1):
            v = table(P['tails'], f-P['tail_order'][t]-P['tail_lag']*(k-1))*fade
            turn(pose, f'tail_{t}{k}', [P['tail_deg'][t][k-1]*v, 0., 0.])
    specs = {}
    for sd in 'LR':
        dy, dz, pitch, pv = P['feet'][sd][f]
        specs[sd] = dict(t=(0., dy, dz), pitch=pitch, pivot={'t': 'toe', 'a': 'ankle', 'f': 'free'}[pv])
    full, targets = cb.solve_feet(rig, pose, lift, specs)
    info = dict(idleA=round(wa, 4), idleB=round(wb, 4), idleClockA=f % IDLE_N, idleClockB=pb, root=list(P['root'][f]),
                feet={sd: dict(zip(('dy', 'dz', 'pitch', 'pivot'), P['feet'][sd][f])) for sd in 'LR'},
                planted={sd: bool(P['planted'][sd][f]) for sd in 'LR'},
                targets={sd: [round(float(x), 6) for x in targets[sd]] for sd in 'LR'}, ears=P['ears'][f])
    return frame_dict(f, full, lift, breath, info)


# ---------------------------------------------------------------- held

# Bound in place by an unseen grip. Research note: the pinned cat (both cat references) does not struggle evenly: it lies
# tense, then twists its trunk, head and hind legs hard against the grip in a burst of about 8 to 12 frames, pauses, and
# bursts again a different way; the tail lashes through it. Fix pass 2 (critic: it read as swaying): three strains against a
# tether a loop, each a wind-up, a hard lunge that stops dead with a one-frame overshoot and snap back, a trembling hold with
# the shoulders hunched and a quick recoil. Fix pass 3 (critic pass 2: strains 2 and 3 too small at 192, even spacing, only the
# head trembled, the arms read as hanging): three strains of one size at 192 (a forward lunge, a yank back with a twist, an
# upward heave; 10 to 12 px of snout travel), their stops 10, 19 and 16 frames apart; a real head jerk at each stop (chin up,
# 10 to 13 degrees against the trunk, the ears kept on their line); the whole torso shivers in the holds (trunk pitch and roll,
# the hips a little, the arms with it); the shoulders hunched and the hands pressed to the thighs the whole loop; ear flicks of
# different sizes and lags, each stopping short of horizontal; both paws planted. Every term is periodic in 45 frames, so frame
# 45 equals frame 0.
HELD = dict(
    frames=45, entry_frames=6, exit_frames=10,
    # the pin: the elbows clamped to the ribs (no swing back: critic pass 1 K3), the forearms in so the hands press on the thighs,
    # the clavicles raised (the shoulders hunched against the grip: critic pass 2 K3); weight a little down and back, the trunk a
    # touch forward
    # (setup: the forearms at 14 back and 9 in left the hands 36 mm off the thighs; at 6 and 13, 8 mm, no arm skin inside)
    # (fix pass 4, critic pass 3 K-arms: they read as idle's arms): the shoulders shrugged 9 px at 720 against idle (clavicles
    # 7.5 up), the upper arms back 16 and in 37 (the elbows at the ribs: 29 mm off at 36 in, 10 mm at 44 in, which collapsed
    # 118 shoulder triangles against the approved 27), the forearms angled back (the elbow flexed 31 degrees, in its band) and
    # out 33 so the paws rest on the thighs' outer side, the wrists turned 3 so the pads lie flat on them
    pin={'upperarm.L': [16., 37., 0.], 'upperarm.R': [16., -37., 0.], 'forearm.L': [-5., -33., 0.], 'forearm.R': [-5., 33., 0.],
         'hand.L': [0., 3., 0.], 'hand.R': [0., -3., 0.], 'clavicle.L': [0., -7.5, 0.], 'clavicle.R': [0., 7.5, 0.],
         'pelvis': [5., 0., 0.], 'spine': [3., 0., 0.], 'chest': [2., 0., 0.]},
    # pass 3's pin, which held_out's burst is laid on so the shaking-free keeps its arms (held_out_frame)
    pin_p3={'upperarm.L': [-2., 10., 0.], 'upperarm.R': [-2., -10., 0.], 'forearm.L': [-6., 13., 0.], 'forearm.R': [-6., -13., 0.],
            'hand.L': [0., 0., 0.], 'hand.R': [0., 0., 0.], 'clavicle.L': [0., -6., 0.], 'clavicle.R': [0., 6., 0.]},
    lift=(0., .012, -.03),
    level_head={'neck': [-6., 0., 0.], 'head': [-8., 0., 0.]},       # (4 degrees chin-up: the f18 line then needs less ear swing)
    # the ears draw Night Stalk f18's line on screen (rule 1) but turn no more than ear_cap degrees from f18's own pose relative
    # to the head where that asks for more swing (the ear root folds past f18's pose), and follow it up to ear_inside degrees
    # where the head's chin-up asks for less
    ear_cap=1., ear_inside=20.,
    # (fix pass 3: the line at .97 of the sweep, as displaced: with the torso's shiver the full line folded the ear root 51 and 52
    # against the approved 50)
    ear_base=.97,
    # strains against the tether, each: a wind-up the other way (wind frames), a hard lunge (2 frames) to a one-frame overshoot,
    # a dead stop that snaps back a little (the end of the tether), a trembling hold (hold frames) with the shoulders hunched, then
    # a quick recoil past rest and a settle. Start frame t0 (the overshoot lands on t0+4), size k; the moves at full size: lean
    # (trunk pitch, + forward), twist (chest and spine yaw), bend (side bend), rise (root up, m), fwd (root forward, m), shrug
    # (clavicle raise, near and far), head (the head's pitch against the trunk with the strain, - chin up; the neck and head also
    # take back head_level of the trunk's lean), jerk (a chin-up snap of the head against the trunk at the stop, by
    # jerk_profile), jerk_yaw, press (the hands pressed harder on the thighs, near and far, degrees of forearm: in the twist the
    # far hand presses into the hip and is left alone), flick (the share of the ear
    # sweep given up toward upright) and flick_lag (frames after the lunge)
    # fix pass 4: the hands no longer press (pressed in, the paws sank into the thighs), but the near one in the yank back, where
    # the twist carries it 40 to 50 mm off the thigh; the elbows press out against the
    # bind instead (elbow_out, degrees of upper arm swung out with the strain, snapping back with it); the third strain pulls
    # down (the knees bend, the hips drop, the head ducks forward and down: duck, degrees chin down at the stop) instead of the
    # heave; the ear flicks are swings back and down past the line (flick: (frame from the lunge's start, degrees) keys,
    # ear_follow), one a swing, one double, one small
    strains=[
        dict(name='forward lunge', t0=1, wind=2, hold=3, k=1., lean=7., twist=0., bend=0., rise=0., fwd=.035, shrug=(-.5, -.5),
             head=-2., jerk=-8., jerk_yaw=3., press=(0., 0.), elbow_out=5., duck=0.,
             flick=[(2, 0.), (3, 6.), (4, 10.), (5, 8.), (6, 3.), (7, 0.)]),
        dict(name='yank back and twist', t0=11, wind=2, hold=6, k=1., lean=-7.5, twist=-9., bend=-5., rise=0., fwd=-.022,
             shrug=(-.5, -1.), head=-4., jerk=-10., jerk_yaw=0., press=(5.5, 0.), elbow_out=5.5, duck=0.,
             flick=[(3, 0.), (4, 7.), (5, 12.), (6, 5.), (7, 2.), (8, 8.), (9, 3.), (10, 0.)]),
        dict(name='pull down and under', t0=30, wind=2, hold=5, k=1., lean=5., twist=4., bend=-2., rise=-.035, fwd=.012,
             shrug=(-.5, -.5), head=2., jerk=0., jerk_yaw=3., press=(0., 0.), elbow_out=4.5, duck=5.,
             flick=[(3, 0.), (4, 2.), (5, 3.5), (6, 1.5), (7, 0.)]),
    ],
    head_level=.4,
    jerk_profile=[(0, 0.), (1, .35), (2, 1.), (3, .45), (4, .15), (5, 0.)],    # by frame from the overshoot frame's lead-in (u = wind+2)
    # the profile of a strain (share of its full size) by frame from its start: wind-up to -.25, lunge to 1.15 in 2 frames, the stop
    # snaps back to .95, the hold, the recoil to -.1 in 2 frames and a settle in 2 more
    wind_share=-.25, overshoot=1.15, stop=.95, recoil=-.1,
    # the shiver of the holds, at a 2.5-frame period (degrees and m; full in a hold, rest of it between): trunk pitch, trunk roll,
    # hips yaw, a sideways shake of the root, the forearms (the arms tremble with the torso), the clavicles; the neck takes back
    # neck of the trunk's pitch
    # (fix pass 4: doubled in the holds, the critic's 6 to 8 px at 720; `rest` the share left between the strains)
    # (fix pass 5: the tremble in the ribcage: the neck takes back neck of the chest's and spine's shake, pitch and side to side,
    # so the head shakes no more than the chest)
    tremor=dict(period=2.5, trunk=4.4, roll=3.6, hips=2., shake=.006, arms=2.4, shoulder=1.6, rest=.15, neck=.85),
    # fix pass 5 (critic pass 4: the fix pass 4 pant, a 3-frame heave, bobbed the head and neck about 20 px at 720 while the
    # chest moved 2 to 5: a buzz, not breathing): in the rests (full where no strain is moving: env from the strains' summed
    # size, 1 at 0, 0 at env_off and above) the loop's own breath (pant, a 7.5-frame cycle, 6 a loop) grows into a chest-and-belly
    # breath: the breath key (the ribcage and belly rise and swell), the ribcage lifting (chest pitch back, degrees), the
    # shoulders with it (clavicle raise); the neck takes back the chest's turn so the head only rides along with the chest
    pant_rest=dict(chest=3.2, clav=1., key=1.5, env_off=.5),
    # the arms' counter-turns that keep the elbows at the ribs and the hands at the thighs: the upper arm takes back all of the
    # clavicle's raise and (fix pass 4) all of the trunk's lean and three fifths of its twist, and the forearm turns in as the
    # elbow presses out (degrees per degree, near and far), so the paws stay on the thighs through the lunges (the near paw
    # left the thigh by up to 70 mm in the yank back without them)
    arm_counter=dict(lean=1., shrug=1., twist=.6, elbow=(1.2, .9)),
    clav_back=1.5, clav_back_twist=1.2,
    pant=dict(cycles=6, key=.35),
    # both paws planted the whole loop (critic pass 2 K6); the far heel lifts in the forward lunge (the toes stay down)
    near_foot=[(0, 0., 0., 0.), (45, 0., 0., 0.)],
    far_foot=[(0, 0., 0., 0.), (3, 0., 0., 0.), (4, 0., 0., 7.), (5, 0., 0., 11.), (8, 0., 0., 11.), (10, 0., 0., 5.), (12, 0., 0., 0.),
              (45, 0., 0., 0.)],
    # tails lash: per tail, a lift and a yaw wave per bone (degrees at the tip bone, falling toward the root), whole cycles a
    # loop, a lag down each chain; plus a whip with each strain
    tail_waves={'a': dict(cycles=3, lift=9., yaw=11., phase=0.), 'b': dict(cycles=2, lift=8., yaw=13., phase=.3),
                'c': dict(cycles=3, lift=7., yaw=10., phase=.6)},
    tail_lag_f=1.4, tail_whip_deg=10.,
    # fix pass 4 (critic pass 3 K-tails: the top tail bent at one joint like an elbow at 8 to 12, 23 to 26 and 39 to 43, a zigzag at
    # 9): the lag down the chain shortened, the whip low-passed over whip_smooth frames, and each frame's bends smoothed along
    # the chain (chain_smooth: the share of a joint's bend shared with its neighbours, passes), so the bend changes from joint to
    # joint smoothly
    tail_lag_p4=.7, whip_smooth=2, chain_smooth=(.5, 2),
    # fix pass 5 (critic pass 4: the top tail still bent 70 to 90 degrees over a short span at 8 to 9, 23 to 25 and 39: the
    # pass 4 smoothing evened the added lash, not the bends the tail shows, which include its own rest curve): every frame,
    # the bends between neighbouring bones as the tail is posed (world turn from each bone to the next) are evened along the
    # chain keeping their sum (so the tip points where it did), passes of share `tail_spread` until no joint bends more than
    # twice the mean of its neighbours
    tail_spread=(.5, 12, 1.8),
    # fix pass 6 (critic pass 5: the top tail still hooked 90 to 100 degrees over its last third at 9 to 11, 24 to 27 and 40 to 42
    # as the side view sees it: its last three bones fan out toward the camera there (world x .86 to .9), so on screen they are
    # short and turn down hard): the top tail's last bones turned back about the vertical (yaw_back degrees at the tip, by
    # yaw_back_shares root to tip), then its bends as the side view sees them (each bone's angle in the y-z plane) shared along
    # the chain in proportion to the bones' length on screen, the sum kept, so the curl spreads toward the root (each bone turned
    # about world x, its depth kept). (+ yaw_back turns a bone pointing at the camera toward the back; 45 left 55 degrees of turn
    # in a third of the tail on screen at 26 to 28, 55 leaves 51; before, 96 to 101)
    tail_a_side=dict(yaw_back=55., yaw_back_shares=(0., .25, .6, 1., 1.), spread=1.),
    # fix pass 6 (critic pass 5: at 7 to 11 the middle tail's tip landed on the lower tail, a closed loop with a spike at 192;
    # it also crossed it on screen at 28 to 31): the middle tail turned up about world x at its root (degrees, by keys of
    # (frame, share), smoothstep between): 16 left its tip 38 mm from the lower tail on screen, 24 leaves 65 or more)
    tail_b_clear=dict(deg=24., keys=[(3, 0.), (6, 1.), (12, 1.), (15, 0.), (24, 0.), (27, 1.), (32, 1.), (35, 0.)]),
)


# Held fix pass 7 (Nick on F48, 2026-11-11: "the 'held' looks kinda like a demon trying to escape their body but its close"):
# the grip has to read as outside the body. The trunk wrenching and the chest heaving with the arms and feet locked and the face
# straight ahead read as a force inside it. So: it looks at what holds it (in the lunge the head turns and dips toward the near
# arm, in the yank back toward the far side; a quick glance down between strains; no more chin-up toss); in each of those
# strains one arm tries to pull free (its elbow pushes out from the side 3 to 5 cm with that shoulder shrugging up, then is
# snapped back to the side and stops dead, as if the grip yanked it back); the whole body pulls one way as one unit, leaning
# from the hips over the braced feet with the knees flexing (lean_shares: the pelvis carries the lean, the spine and chest
# little), the trunk's twist against the hips halved and the rests' chest heave reduced. The spacing (10, 19, 16), the stops
# and rebounds, the tremor, the ear flicks, the tails, the planted feet, held_in and held_out, the seam and the clamp are kept.
HELD['strains'][0].update(head=2., jerk=0., jerk_yaw=0., rise=-.006, look=26., dip=14., arm='L', elbow_push=13.)
# (the far-side look turned 28 degrees swung the near ear forward over the face and showed the far ear behind it; 16 still laid
# the near ear over the back of the skull: 12, with the ears lifted ear_back degrees toward the line while it looks, -6;
# swept 14 to 22 degrees further back they hung down behind the head like a lop ear)
HELD['strains'][1].update(head=2., jerk=0., jerk_yaw=0., twist=-4.5, rise=-.015, look=-12., dip=14., arm='R', elbow_push=13.,
                          ear_back=-6.)
HELD['strains'][2].update(look=10., dip=6.)  # (its twist kept at 4: halved, the far paw went into the hip at 33 to 38)
HELD.update(
    lean_shares=(.65, .25, .1),          # pelvis, spine, chest (pass 6: .3, .4, .3)
    neck_look=.35,                       # the neck's share of the look's yaw and dip (the head's the rest)
    arm_shrug=.45,                       # degrees of clavicle raise per degree of the arm's push
    # glances between the strains (frame, yaw, dip), periodic in 45
    # (one, in the long rest after the yank back; one at 41 to 43 also played in held_in, which blends loop frames 39 to 44)
    glance=[(0, 0., 0.), (24, 0., 0.), (25, 3., 9.), (26, 3., 10.), (28, 0., 0.), (45, 0., 0.)],
    pant_rest=dict(HELD['pant_rest'], chest=2.0, key=1.0),
)



# Held fix pass 8 (blind critic h7: the trunk no longer writhes, but nothing in the frame stays put while the body pulls, the
# pinned arms moving with the chest as one block; each strain starts and ends with a one-frame jump of 17 to 27 px at 720 and the
# chest swings 8 to 12 px every frame inside it, so at 192 it reads as lurching and shivering). The design (orchestrator,
# overridable by Nick): it is held from behind. An unseen grip holds both wrists beside and a little behind the hips: the
# wrists stay at their grip points in the world and the arms reach them by IK from the shoulders as the body puts them
# (held_grip_arms), so as the chest, head and hips pull forward away from them the elbows straighten and the shoulders are
# drawn back (clav_pull): the stretch is the read of the grip. Every strain pulls forward, away from the grip, at its own
# strength: it builds over 3 or 4 frames, stops dead against the hold, rebounds a little toward the grip, holds, and gives back
# over 6 frames (no wind-up the other way). The tremor is half its size and slower (a 5-frame period). In the first two
# strains the head turns and dips to look down at the near elbow and holds it through the hold; in the second the near elbow
# pries out from the side while the paw stays held, the chest still for that beat, and is snapped back past the side. The
# hips sink as it pulls (the legs push). The stops stay 10, 19 and 16 frames apart (5, 15, 34).
for _st, _upd in zip(HELD['strains'], (
        dict(name='pull forward, looking at the near elbow', t0=2, ramp=3, hold=2, give=6, k=1., lean=6., twist=0., bend=0.,
             rise=-.014, fwd=.026, shrug=(-.6, -.6), head=0., jerk=0., jerk_yaw=0., press=(0., 0.), elbow_out=0., duck=0.,
             look=22., dip=26., arm=None, elbow_push=0., ear_back=0.),
        dict(name='pull forward and twist, the near arm prying', t0=12, ramp=3, hold=7, give=6, k=.85, lean=6., twist=-3.,
             bend=-3., rise=-.01, fwd=.031, shrug=(-.6, -.8), head=0., jerk=0., jerk_yaw=0., press=(0., 0.), elbow_out=0.,
             duck=0., look=18., dip=24., arm=None, elbow_push=0., ear_back=0., pry_at=5),
        dict(name='pull down and forward', t0=30, ramp=4, hold=4, give=6, k=.9, lean=6., twist=3., bend=-2., rise=-.022,
             fwd=.035, shrug=(-.5, -.5), head=2., jerk=0., jerk_yaw=0., press=(0., 0.), elbow_out=0., duck=0., look=0.,
             dip=4., arm=None, elbow_push=0., ear_back=0.))):
    _st.update(_upd)
HELD.update(
    rebound=.9, stop8=.95, ramp_gather=0., look_back=3,
    # (the neck takes .6 of the look's yaw and dip, the head the rest: at .35 the 24 to 26 degree dip collapsed 6 throat
    # triangles under the jaw at 4 to 8 and 14 to 23)
    neck_look=.6,
    tremor=dict(HELD['tremor'], period=5., trunk=2.2, roll=1.8, hips=1., shake=.003, arms=1.2, shoulder=.8),
    # the grip (near side; the far side mirrored): the wrist's point in the world (m, after the root move) and the elbows' bend
    # direction (out and a little back)
    grip_wrist=(.19, .045, .72), grip_pole=(1., .25, 0.),
    # the pry: the elbow's bend plane swung toward pry_pole (back and up: the elbow drives out behind the body's outline), then
    # snapped back past grip_pole by pry_over toward pry_in (into the side); the chest's tremor held still by pry_still
    pry_pole=(.3, 1., .6), pry_in=(-.3, .4, 0.), pry_over=.15, pry_still=.8,
    # clav_pull: degrees of clavicle turn back per unit of the strains' summed pull. dip_ear: the share of the head's dip the
    # ears swing back with it (at .7 the ear-root folds reached 69 at the glance and 68 in the third pull, at 0 the near ear rode
    # forward to a flat cap at -2 degrees; .35 keeps it at about -11 to -15 and the folds near the approved 50). far_loop and
    # far_loop_yaw: the far ear's swing below the near one's mirror, degrees, less per degree of the look's yaw toward the
    # camera (fixed at 6 it hung below the near one at the looks, 1300 to 1600 px of it in view at 720 against idle's 377; at
    # 1.5 less .6 per degree, 320 to 560)
    clav_pull=6., dip_ear=.35, far_loop=1.5, far_loop_yaw=.6,
)


def _look_profile(u, st):
    """Fix pass 7: a strain's look share by frame u from its start: it turns to look through the wind-up and lunge, holds through
    the hold and turns back with the recoil (0 outside). Held fix pass 8: with the pull's ramp, it turns to look as the pull
    builds, holds to the hold's end and turns back over look_back frames."""
    if 'look_keys' in st:
        # held fix pass 9: the strain's own look keys (frame from its start, share)
        keys = st['look_keys']
    elif 'ramp' in st and 'look_lead' in HELD:
        # held fix pass 9 (critic h8: the snout jumped 22 then 31 px a frame into each strain): the look starts look_lead frames
        # before the pull and reaches its full turn at the pull's stop, so it eases in over ramp + look_lead frames
        r, h = st['ramp'], st['hold']
        keys = [(-HELD['look_lead'], 0.), (r, 1.), (r+1+h, 1.), (r+1+h+HELD['look_back'], 0.)]
    elif 'ramp' in st:
        r, h = st['ramp'], st['hold']
        keys = [(0., 0.), (r-1, 1.), (r+1+h, 1.), (r+1+h+HELD['look_back'], 0.)]
    else:
        w, h = st['wind'], st['hold']
        keys = [(0., 0.), (w, .3), (w+2, 1.), (w+3+h, 1.), (w+5+h, .3), (w+7+h, 0.)]
    if u <= keys[0][0] or u >= keys[-1][0]:
        return 0.
    for (u0, v0), (u1, v1) in zip(keys, keys[1:]):
        if u0 <= u <= u1:
            return v0+(v1-v0)*cp.ease('smooth', (u-u0)/(u1-u0))
    return 0.


def _arm_profile(u, st):
    """Fix pass 7: the arm pulling free, its share by frame u from the strain's start: out from the lunge's stop through the hold,
    snapped back to the side in one frame at the hold's end and stopped dead (a small rebound; snapped past the side by .15 the
    paw went into the hip), then still. Held fix pass 8 (pry): from pry_at frames after the strain's start the elbow drives out
    over 3 frames, holds a frame, is snapped back past the side in one frame (pry_over) and settles the next."""
    if 'pry_at' in st and 'pry_keys' in HELD:
        # held fix pass 10 (critic h9: a one-frame jump to a hoop at 17 to 18): two small wrenches over four frames, a strain
        # with a wobble while it is out, then snapped back past the side and settled (pry_keys: frames from pry_at, share)
        a = st['pry_at']
        keys = [(0., 0.)]+[(a+u, v) for u, v in HELD['pry_keys']]
        if u <= 0 or u >= keys[-1][0]:
            return 0.
        for (u0, v0), (u1, v1) in zip(keys, keys[1:]):
            if u0 <= u <= u1:
                return v0+(v1-v0)*((u-u0)/(u1-u0))
        return 0.
    if 'pry_at' in st and 'pry_shape' in HELD:
        # held fix pass 9 (critic h8: the elbow popped out in one frame and held dead still): it builds over two frames
        # (pry_shape: the shares at a+1 and a+2), strains with a small wobble while it is out, then is snapped back past the
        # side in one frame and settles
        a = st['pry_at']
        s1, s2, w1, w2 = HELD['pry_shape']
        keys = [(0., 0.), (a, 0.), (a+1, s1), (a+2, s2), (a+3, w1), (a+4, w2), (a+5, -HELD['pry_over']), (a+6, 0.)]
        if u <= 0 or u >= keys[-1][0]:
            return 0.
        for (u0, v0), (u1, v1) in zip(keys, keys[1:]):
            if u0 <= u <= u1:
                return v0+(v1-v0)*((u-u0)/(u1-u0))
        return 0.
    if 'pry_at' in st:
        a = st['pry_at']
        keys = [(0., 0.), (a, 0.), (a+3, 1.), (a+4, 1.), (a+5, -HELD['pry_over']), (a+6, 0.)]
        if u <= 0 or u >= keys[-1][0]:
            return 0.
        for (u0, v0), (u1, v1) in zip(keys, keys[1:]):
            if u0 <= u <= u1:
                return v0+(v1-v0)*cp.ease('linear' if (u0, u1) == (a+4, a+5) else 'smooth', (u-u0)/(u1-u0))
        return 0.
    w, h = st['wind'], st['hold']
    keys = [(0., 0.), (w+2, .1), (w+3, .4), (w+2+h, 1.), (w+3+h, 1.), (w+4+h, -.04), (w+5+h, .03), (w+6+h, 0.)]
    if u <= 0 or u >= keys[-1][0]:
        return 0.
    for (u0, v0), (u1, v1) in zip(keys, keys[1:]):
        if u0 <= u <= u1:
            return v0+(v1-v0)*cp.ease('linear' if (u0, u1) == (w+3+h, w+4+h) else 'smooth', (u-u0)/(u1-u0))
    return 0.


def _periodic_share(fn, f, st, n):
    best = 0.
    for sh in (-n, 0, n):
        v = fn(f-(st['t0']+sh), st)
        if abs(v) > abs(best):
            best = v
    return best


def _rot_angle(M):
    return math.degrees(math.acos(max(-1., min(1., (np.trace(M)-1)/2))))


def ear_line_capped(rig, pose, e, cap, toward=None, inside=0.):
    """set_ear_line (the ears on Night Stalk's line on screen at share e), then each ear_1 pulled back toward the share e of f18's
    own pose relative to the head until it is at most `cap` degrees from it (the ear root folds past f18's pose). With `inside`
    (degrees), a line that asks for less swing than that share (the ear turned less from its rest than the share is: the head
    tipped back) is followed up to `inside` degrees from it, uncapped (less swing folds the ear root less)."""
    if e <= 0:
        return
    cb.set_ear_line(rig, pose, e, toward=toward)
    for b in cb.EAR_ROOTS:
        ref = ac.share_of(rig.body[b], e)
        R = rot(pose.get(b, [0., 0., 0.]))
        ang = _rot_angle(rot(ref).T@R)
        lim = inside if inside > 0 and _rot_angle(R) < _rot_angle(rot(ref)) else cap
        if ang > lim:
            pose[b] = slerp_e(ref, pose[b], lim/ang)


def ear_follow(rig, pose, deg):
    """Fix pass 4: both ears swung rigidly (ear_1 only) about the world's X axis, the side camera's line of sight, so the swing
    is in the picture's plane: deg > 0 takes the tips further back and down, deg < 0 lifts them toward horizontal. 0 leaves the
    pose untouched."""
    if not deg:
        return
    Wh = rc.bone_transforms(rig.J, pose, bones=B)['head'][0]
    a = math.radians(deg)
    Rx = np.array([[1., 0., 0.], [0., math.cos(a), math.sin(a)], [0., -math.sin(a), math.cos(a)]])
    for b in cb.EAR_ROOTS:
        pose[b] = [float(v) for v in rc.euler_from_matrix(Wh.T@Rx@Wh@rot(pose.get(b, [0., 0., 0.])))]


def _strain_profile8(u, st):
    """Held fix pass 8: a pull away from a grip behind it, its share at frame u from its start (0 outside it): it builds over
    `ramp` frames (near steady, so no one frame jumps), stops dead against the hold at 1, rebounds toward the grip for a frame
    (rebound), settles at `stop8` through the hold, then gives back over `give` frames. Returns (share, holding: 0 or 1)."""
    P = HELD
    r, h, g = st['ramp'], st['hold'], st['give']
    keys = [(0., 0., 'linear'), (r, 1., 'ramp'), (r+1, P['rebound'], 'linear'), (r+2, P['stop8'], 'smooth'),
            (r+1+h, P['stop8'], 'linear'), (r+1+h+g, 0., 'smooth')]
    if u <= 0 or u >= keys[-1][0]:
        return 0., 0.
    for (u0, v0, _), (u1, v1, kind) in zip(keys, keys[1:]):
        if u0 <= u <= u1:
            x = (u-u0)/(u1-u0)
            # (the ramp gathers a little speed and is stopped by the hold, not eased into it)
            e = (x+P['ramp_gather']*x*x)/(1+P['ramp_gather']) if kind == 'ramp' else cp.ease(kind, x)
            return v0+(v1-v0)*e, float(r+1 <= u <= r+1+h)
    return 0., 0.


def _strain_profile(u, st):
    """A tether strain's share of its full size at frame u from its start (0 outside it): (share, holding: 0 or 1)."""
    if 'ramp' in st:
        return _strain_profile8(u, st)
    P = HELD
    w, h = st['wind'], st['hold']
    keys = [(0., 0.), (w, P['wind_share']), (w+2, P['overshoot']), (w+3, P['stop']), (w+3+h, 1.), (w+5+h, P['recoil']), (w+7+h, 0.)]
    if u <= 0 or u >= keys[-1][0]:
        return 0., 0.
    for (u0, v0), (u1, v1) in zip(keys, keys[1:]):
        if u0 <= u <= u1:
            kind = 'out' if (u0, u1) == (w, w+2) or (u0, u1) == (w+3+h, w+5+h) else 'smooth'
            return v0+(v1-v0)*cp.ease(kind, (u-u0)/(u1-u0)), float(w+3 <= u <= w+3+h)
    return 0., 0.


def _keys_periodic(keys, f, n):
    f = f % n
    for k0, k1 in zip(keys, keys[1:]):
        if k0[0] <= f <= k1[0]:
            u = (f-k0[0])/(k1[0]-k0[0]) if k1[0] > k0[0] else 1.
            return [x+(y-x)*u for x, y in zip(k0[1:], k1[1:])]
    return list(keys[-1][1:])


def held_strains_one(f, st, n):
    """One strain's share at frame f (periodic in n)."""
    best = 0.
    for sh in (-n, 0, n):
        v, _ = _strain_profile(f-(st['t0']+sh), st)
        if abs(v) > abs(best):
            best = v
    return best*st['k']


def held_strains(f, n):
    """Per strain: its share and whether it is in its trembling hold at frame f (periodic in n)."""
    out = []
    for st in HELD['strains']:
        best = (0., 0.)
        for sh in (-n, 0, n):
            v, hold = _strain_profile(f-(st['t0']+sh), st)
            if abs(v) > abs(best[0]) or hold:
                best = (v, max(hold, best[1]))
        out.append((best[0]*st['k'], best[1]))
    return out


def _jerk(f, st, n):
    """A strain's head-jerk share at frame f: jerk_profile from the frame the lunge starts (periodic in n)."""
    if 'ramp' in st:
        return 0.
    best = 0.
    xs, ys = zip(*HELD['jerk_profile'])
    for sh in (-n, 0, n):
        u = f-(st['t0']+sh)-st['wind']
        if xs[0] <= u <= xs[-1]:
            best = max(best, float(np.interp(u, xs, ys)))
    return best


def _aim_bone(rig, pose, b, d):
    """Held fix pass 8: bone b turned by the smallest world rotation that points it along world d (its twist kept)."""
    T = rc.bone_transforms(rig.J, pose, bones=B)
    Wb = T[b][0]
    Rp = T[BONE_OF[b][1]][0]
    Rn = rc.align_rotation(Wb@rc.bone_axis(rig.J, b, B), np.asarray(d, float))@Wb
    pose[b] = [float(v) for v in rc.euler_from_matrix(Rp.T@Rn)]


_GRIP = {}


def held_grip_arms(rig, pose, lift, pry=0.):
    """Held fix pass 8 (held from behind): each wrist held at its grip point in the world (grip_wrist, near side; the far one
    mirrored), the arm reaching it by two-bone IK from the shoulder as the body puts it (the elbow bending toward grip_pole, out
    and a little back), and each paw kept at its grip turn in the world (the pin's own paw turn, so the paw stays where it is
    held). When the body pulls past the arm's reach the arm is straight and the wrist trails by the excess (wrist_trail_mm).
    pry (near arm): the elbow's bend plane swung from grip_pole toward pry_pole by that share (negative: past grip_pole toward
    the body by pry_in), the wrist still held. Returns per side the shoulder-to-wrist reach share and the wrist's trail."""
    P = HELD
    J = rig.J
    if 'hand' not in _GRIP:
        # the paws' grip turn: the pin's paw turn in the world at the loop's rest (no strain, no tremor)
        base = {}
        for b, e in P['pin'].items():
            turn(base, b, e)
        T0 = rc.bone_transforms(J, base, bones=B)
        _GRIP['hand'] = {sd: T0[f'hand.{sd}'][0] for sd in 'LR'}
    out = {}
    for sd in 'LR':
        mx = np.array([1. if sd == 'L' else -1., 1., 1.])
        Wt = np.asarray(P['grip_wrist'], float)*mx
        T = rc.bone_transforms(J, pose, bones=B, root_translate=tuple(rc.lift_vec(lift)))
        S = T[f'upperarm.{sd}'][0]@np.array(J[f'shoulder.{sd}'])+T[f'upperarm.{sd}'][1]
        l1 = float(np.linalg.norm(np.subtract(J[f'elbow.{sd}'], J[f'shoulder.{sd}'])))
        l2 = float(np.linalg.norm(np.subtract(J[f'wrist.{sd}'], J[f'elbow.{sd}'])))
        d = Wt-S
        Dw = float(np.linalg.norm(d))
        D = min(Dw, (l1+l2)*(1-1e-6))
        u = d/Dw
        pole = _unit(np.asarray(P['grip_pole'], float)*mx)
        if sd == 'L' and pry:
            pole = _slerp_dir(pole, _unit(np.asarray(P['pry_pole' if pry > 0 else 'pry_in'], float)), abs(pry))
        pp = pole-u*(u@pole)
        pp /= np.linalg.norm(pp)
        ca = max(-1., min(1., (l1*l1+D*D-l2*l2)/(2*l1*D)))
        E = S+l1*(ca*u+math.sqrt(1-ca*ca)*pp)
        W2 = S+u*D
        _aim_bone(rig, pose, f'upperarm.{sd}', E-S)
        _aim_bone(rig, pose, f'forearm.{sd}', W2-E)
        Tf = rc.bone_transforms(J, pose, bones=B)[f'forearm.{sd}'][0]
        pose[f'hand.{sd}'] = [float(v) for v in rc.euler_from_matrix(Tf.T@_GRIP['hand'][sd])]
        if P.get('grip_hand_share') is not None:
            # held fix pass 9: with the wrists held behind the back the paw kept at the pin's world turn bent the wrist
            # (wrist-region collapses 2 to 7 at the pry and the third pull): the paw keeps that share of its world turn
            # and follows the forearm for the rest
            pose[f'hand.{sd}'] = slerp_e(P['pin'][f'hand.{sd}'], pose[f'hand.{sd}'], P['grip_hand_share'])
        out[sd] = dict(reach=round(Dw/(l1+l2), 4), trail_mm=round(max(0., Dw-D)*1000, 2))
    return out


def held_loop_body(rig, f, grip=True):
    """Held loop frame f (periodic in 45): body pose (no legs), root move, feet specs, breath, info. grip=False leaves out fix pass
    7's look, glance and arm pulling free (held_in and held_out blend loop frames 39 to 44 and 0 to 9 and passed without them;
    all three are 0 at loop frames 44 and 0, so the seams are unchanged)."""
    P = HELD
    n = P['frames']
    pose = {}
    for b, e in P['pin'].items():
        turn(pose, b, e)
    for b, e in P['level_head'].items():          # rule 1: the head level in the world under the pin's forward trunk
        turn(pose, b, e)
    lift = np.asarray(P['lift'], float).copy()
    sts = held_strains(f, n)
    ln = tw = bd = hd = jk = jy = 0.
    press = [0., 0.]
    sh = [0., 0.]
    eo = 0.
    holding = 0.
    for st, (v, hold) in zip(P['strains'], sts):
        ln += v*st['lean']
        tw += v*st['twist']
        bd += v*st['bend']
        hd += v*st['head']
        j = _jerk(f, st, n)*st['k']
        jk += j*(st['jerk']+st.get('duck', 0.))
        jy += j*st['jerk_yaw']
        press = [p+max(0., v)*q for p, q in zip(press, st['press'])]
        sh[0] += max(0., v)*st['shrug'][0]
        sh[1] += max(0., v)*st['shrug'][1]
        eo += max(0., v)*st.get('elbow_out', 0.)
        lift = lift+v*np.array([0., -st['fwd'], st['rise']])
        holding = max(holding, hold)
    # the pant in the rests (fix pass 4): full where the strains are still, a 3-frame breath
    PR = P['pant_rest']
    env = max(0., 1.-sum(abs(v) for v, _ in sts)/PR['env_off'])
    pb = .5-.5*math.cos(2*math.pi*P['pant']['cycles']*f/n)          # the loop's breath, 0 out to 1 in
    # the shiver: full in a hold, low between the strains; a 2.5-frame period, so no two frames match; the parts out of phase
    T = P['tremor']
    amp = 1. if holding else T['rest']
    pry = 0.
    for st in (P['strains'] if grip else ()):
        if 'pry_at' in st:
            pry += _periodic_share(_arm_profile, f, st, n)
    if pry:
        # held fix pass 8: the chest still while the arm pries
        amp *= 1.-P['pry_still']*min(1., abs(pry))
    ph = 2*math.pi*f/T['period']
    tr, tr2, tr3 = (amp*math.sin(ph+o) for o in (0., 1.9, 3.7))
    for st in P['strains']:
        if st.get('hold_wave') and 'ramp' in st:
            # held fix pass 9 (critic h8: strain 3's hold fluttered every other frame, the 5-frame tremor switched on at full
            # size): through this strain's hold one slow swell and give (a half sine over the hold) replaces the tremor, and
            # it fades in and out of the low tremor around it
            h0 = st['t0']+st['ramp']+1
            for sh_ in (-n, 0, n):
                u = f-(h0+sh_)
                if -1 <= u <= st['hold']+1:
                    hump = math.sin(math.pi*max(0., min(1., u/st['hold'])))
                    w_ = 1.-min(1., abs(u-st['hold']/2.)/(st['hold']/2.+1.))**4
                    lo_ = T['rest']*math.sin(ph), T['rest']*math.sin(ph+1.9), T['rest']*math.sin(ph+3.7)
                    tr, tr2, tr3 = ((1-w_)*l+w_*st['hold_wave']*hump*k for l, k in zip(lo_, (1., .6, -.4)))
    lift = lift+np.array([T['shake']*tr3, 0., 0.])
    lp, ls, lc = P.get('lean_shares', (.3, .4, .3))
    turn(pose, 'pelvis', [lp*ln, 0., T['hips']*tr2])
    # (fix pass 5: the tremble's pitch moved from the chest to the spine, whose turn about the waist carries the whole ribcage)
    turn(pose, 'spine', [ls*ln+T['trunk']*tr, .5*bd+T['roll']*tr2, .4*tw])
    turn(pose, 'chest', [lc*ln-env*PR['chest']*pb, .5*bd+.6*T['roll']*tr3, .6*tw])
    # fix pass 7: one arm pulling free in a strain (per side, degrees of upper arm out), and where the head looks
    push = {'L': 0., 'R': 0.}
    lk_y = lk_d = ear_back = 0.
    for st in (P['strains'] if grip else ()):
        if st.get('arm'):
            push[st['arm']] += st['elbow_push']*_periodic_share(_arm_profile, f, st, n)
        if st.get('look') is not None:
            lv = _periodic_share(_look_profile, f, st, n)
            if P.get('look_max'):
                # held fix pass 9: where two strains' looks overlap the head keeps the deeper one (summed, the look back
                # from the first and the look into the second bent the head 44 degrees down)
                lk_y = max(lk_y, lv*st['look'], key=abs)
                lk_d = max(lk_d, lv*st.get('dip', 0.), key=abs)
            else:
                lk_y += lv*st['look']
                lk_d += lv*st.get('dip', 0.)
            ear_back += lv*st.get('ear_back', 0.)
    if 'glance' in P and grip:
        gy, gd = _keys_periodic(P['glance'], f, n)
        lk_y += gy
        lk_d += gd
    pc = env*PR['clav']*pb
    cl = {'L': sh[0]-T['shoulder']*abs(tr)-pc, 'R': -sh[1]+T['shoulder']*abs(tr)+pc}      # the clavicles' raise (Y; - raises the near one)
    if 'arm_shrug' in P:
        # fix pass 7: the shoulder of the arm pulling free shrugs up with it
        cl['L'] -= P['arm_shrug']*push['L']
        cl['R'] += P['arm_shrug']*push['R']
    # (fix pass 5: the shrug goes up and back: the clavicles turn back a little the whole loop, and the near one further back
    # as the trunk twists away (the yank's twist carried the near shoulder ball forward against the throat at 14 to 21))
    cbk = P['clav_back']+P['clav_back_twist']*max(0., -tw)
    # held fix pass 8: the shoulders drawn back by the arms the grip holds as the body pulls away from it
    pull = sum(max(0., v) for v, _ in sts)
    cbk += P.get('clav_pull', 0.)*pull
    turn(pose, 'clavicle.L', [0., cl['L'], cbk])
    turn(pose, 'clavicle.R', [0., cl['R'], -P['clav_back']-P.get('clav_pull', 0.)*pull])
    # the elbows stay clamped to the ribs and the hands on the thighs: the upper arms take back the shrug's outward swing and a
    # little of the trunk's lean; the hands press harder in each strain and the forearms tremble with the torso
    ca = P['arm_counter']
    # (the elbows' press against the bind: out and back, so the side view sees it as the elbow pushing off the body)
    turn(pose, 'upperarm.L', [-ca['lean']*ln+ca.get('twist', 0.)*tw+.8*eo, -ca['shrug']*cl['L']-eo-push['L'], 0.])
    turn(pose, 'upperarm.R', [-ca['lean']*ln+ca.get('twist', 0.)*tw+.8*eo, -ca['shrug']*cl['R']+eo+push['R'], 0.])
    ce = ca.get('elbow', (0., 0.))
    turn(pose, 'forearm.L', [T['arms']*tr2, press[0]+ce[0]*eo, 0.])
    turn(pose, 'forearm.R', [T['arms']*tr3, -press[1]-ce[1]*eo, 0.])
    grip_info = held_grip_arms(rig, pose, lift, pry) if P.get('grip_wrist') else None
    # rule 1, the head's world orientation first: the neck and head take back head_level of the trunk's lean, then turn by the
    # strain's own head pitch and the jerk (chin up only: a chin-down head needs the ear past f18's swing and folds the ear root);
    # the head turns against the trunk's twist and side bend so its world turn and roll stay small
    hl = P['head_level']
    # (fix pass 5: the neck takes .3 of the head's own pitch and the head .7, was .4 and .6: the chin-up toss at the yank's stop
    # creased the back of the neck at 15)
    nl = P.get('neck_look', 0.)
    turn(pose, 'neck', [.3*(hd+jk)+nl*lk_d-.5*hl*ln-T['neck']*T['trunk']*tr+env*PR['chest']*pb, -.5*bd-T['neck']*(T['roll']*tr2+.6*T['roll']*tr3),
                        .4*jy+nl*lk_y-.5*tw])
    turn(pose, 'head', [.7*(hd+jk)+(1-nl)*lk_d-.5*hl*ln, -.5*bd, .6*jy+(1-nl)*lk_y-.5*tw])
    # the ears on stalk f18's line; each strain's flick (fix pass 4) a rigid swing back and down past the line and back
    # (ear_follow), its own keys by frame from the lunge's start
    e = P['ear_base']
    ear_line_capped(rig, pose, e, P['ear_cap'], inside=P['ear_inside'])
    fd = 0.
    for st in P['strains']:
        xs, ys = zip(*st['flick'])
        for sh_ in (-n, 0, n):
            u = f-(st['t0']+sh_)
            if xs[0] <= u <= xs[-1]:
                fd += float(np.interp(u, xs, ys))
    # held fix pass 8: as the head dips to look at the grip, the ears swing back with it (dip_ear of the dip) so they keep
    # their line instead of riding forward over the skull
    for f0_, du_, dg_ in P.get('ear_flicks', ()):
        # held fix pass 9: flicks of their own between the strains, a rigid swing up toward the line and back over du_ frames
        for sh_ in (-n, 0, n):
            u = f-(f0_+sh_)
            if 0 <= u <= du_:
                fd += dg_*math.sin(math.pi*u/du_)
    ear_follow(rig, pose, fd+ear_back+P.get('dip_ear', 0.)*lk_d+P.get('ear_pin_down', 0.))
    if P.get('ear_pin_yaw'):
        ear_pin_yaw(pose, P['ear_pin_yaw'])
    if P.get('far_loop'):
        # held fix pass 8: the far ear swings with the near one (mirrored) and far_loop degrees further back and down, so the
        # side view keeps it behind the near one when the head turns (it showed as a second outline at 14 to 23); as the head
        # turns its snout toward the camera the far ear rises behind the near one (far_loop_yaw degrees per degree), lower
        # it hung below the near one as a lip
        # (mirrored against the head, not across the world's midline: mirrored in the world while the head turned 18 to 22
        # degrees, the far ear sat turned against the head and folded its root 400 to 530 triangles)
        mirror_far_ear_head(pose, P['far_loop']-P.get('far_loop_yaw', 0.)*lk_y)
    if P.get('ear_p10'):
        held_ears_p10(rig, pose, f, n)
    # the tails (fix pass 4): the waves and the whip as before, but a shorter lag down the chain, the whip low-passed in time,
    # and each frame's bends shared along the chain so no joint bends alone
    lagk = P['tail_lag_p4']
    def whip_at(x):
        ws = P['whip_smooth']
        return sum(sum(abs(v) for v, _ in held_strains(x-d, n)) for d in range(-ws, ws+1))/(2*ws+1)
    for tn in rc.TAILS:
        wv = P['tail_waves'][tn]
        raw = []
        for k in range(1, rc.TAIL_BONES+1):
            u = (f-lagk*(k-1))/n*wv['cycles']+wv['phase']
            g = (k+1)/(rc.TAIL_BONES+1)
            wh = whip_at(f-lagk*(k-1))
            raw.append([g*(wv['lift']*math.sin(2*math.pi*u)+P['tail_whip_deg']*wh*(1 if tn != 'c' else -1)*.6), 0.,
                        g*wv['yaw']*math.sin(2*math.pi*u+1.3)])
        raw = np.array(raw)
        s_, passes = P['chain_smooth']
        for _ in range(passes):
            pad = np.vstack([raw[:1], raw, raw[-1:]])
            raw = (1-s_)*raw+s_*.5*(pad[:-2]+pad[2:])
        for k in range(1, rc.TAIL_BONES+1):
            turn(pose, f'tail_{tn}{k}', [float(x) for x in raw[k-1]])
    spread_tail_bends(rig, pose, P['tail_spread'])
    tail_side_fix(rig, pose, f)
    nf = _keys_periodic(P['near_foot'], f, n)
    ff = _keys_periodic(P['far_foot'], f, n)
    feet = {'L': dict(t=(0., nf[0], nf[1]), pitch=nf[2], pivot='toe'),
            'R': dict(t=(0., ff[0], ff[1]), pitch=ff[2], pivot='toe')}
    planted = {'L': True, 'R': True}
    pant = .5-.5*math.cos(2*math.pi*P['pant']['cycles']*f/n)
    breath = P['pant']['key']*pant+.4*holding+env*PR['key']*pb    # a panting breath, a caught one in each hold, the rest's deeper breath
    return pose, lift, feet, breath, dict(strains=[round(v, 4) for v, _ in sts], holding=holding, flick=round(fd, 2), tremor=round(tr, 3),
                                          jerk=round(jk, 3), pant=round(env, 3), elbows_out=round(eo, 2), planted=planted,
                                          push={k: round(v, 2) for k, v in push.items()}, look=[round(lk_y, 2), round(lk_d, 2)],
                                          pry=round(pry, 3), grip=grip_info)


def _rotvec(R):
    ang = math.acos(max(-1., min(1., (np.trace(R)-1)/2)))
    if ang < 1e-9:
        return np.zeros(3)
    v = np.array([R[2, 1]-R[1, 2], R[0, 2]-R[2, 0], R[1, 0]-R[0, 1]])
    return v/(2*math.sin(ang))*ang


def _axrot(v):
    ang = float(np.linalg.norm(v))
    if ang < 1e-12:
        return np.eye(3)
    k = v/ang
    K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
    return np.eye(3)+math.sin(ang)*K+(1-math.cos(ang))*K@K


def tail_bends(rig, pose):
    """Per tail, the world bend (degrees) at each joint between neighbouring tail bones, root to tip."""
    T = rc.bone_transforms(rig.J, pose, bones=B)
    out = {}
    for tn in rc.TAILS:
        d = [_unit(T[f'tail_{tn}{k}'][0]@rc.bone_axis(rig.J, f'tail_{tn}{k}', B)) for k in range(1, rc.TAIL_BONES+1)]
        out[tn] = [math.degrees(math.acos(max(-1., min(1., float(a@b))))) for a, b in zip(d, d[1:])]
    return out


def spread_tail_bends(rig, pose, spec):
    """Even the bends along each tail (fix pass 5): the turn from each bone's world direction to the next as rotation vectors,
    shared with their neighbours (the sum kept) until no joint carries more than `limit` times its neighbours' mean, the bones
    then set to the new directions from the first."""
    share_, passes, limit = spec
    T = rc.bone_transforms(rig.J, pose, bones=B)
    tg = {}
    for tn in rc.TAILS:
        bs = [f'tail_{tn}{k}' for k in range(1, rc.TAIL_BONES+1)]
        d = [_unit(T[b][0]@rc.bone_axis(rig.J, b, B)) for b in bs]
        r = []
        for a, b in zip(d, d[1:]):
            ax = np.cross(a, b)
            s_ = np.linalg.norm(ax)
            ang = math.atan2(s_, float(a@b))
            r.append(ax/s_*ang if s_ > 1e-12 else np.zeros(3))
        r = np.array(r)
        for _ in range(passes):
            m = np.linalg.norm(r, axis=1)
            nb = np.array([np.mean([m[j] for j in (i-1, i+1) if 0 <= j < len(m)]) for i in range(len(m))])
            if np.all(m <= limit*np.maximum(nb, math.radians(2.))):
                break
            pad = np.vstack([r[:1], r, r[-1:]])
            lap = .5*(pad[:-2]+pad[2:])-r
            lap[0] = .5*(r[1]-r[0])
            lap[-1] = .5*(r[-2]-r[-1])
            r = r+share_*lap
        nd = [d[0]]
        for v in r:
            nd.append(_unit(_axrot(v)@nd[-1]))
        for b, v in zip(bs, nd):
            tg[b] = v
    order = [f'tail_{tn}{k}' for tn in rc.TAILS for k in range(1, rc.TAIL_BONES+1)]
    new = rc.pose_from_directions(rig.J, {b: tg[b] for b in order}, base=pose, bones=B)
    for b in order:
        pose[b] = [float(x) for x in new[b]]


def _keys_smooth_periodic(keys, f, n):
    """(frame, value) keys, smoothstep between them, periodic in n (the last key's value past it)."""
    f = f % n
    for k0, k1 in zip(keys, keys[1:]):
        if k0[0] <= f <= k1[0]:
            u = (f-k0[0])/(k1[0]-k0[0]) if k1[0] > k0[0] else 1.
            u = u*u*(3-2*u)
            return k0[1]+(k1[1]-k0[1])*u
    return keys[-1][1] if f > keys[-1][0] else keys[0][1]


def tail_side_fix(rig, pose, f):
    """Fix pass 6: the top tail's turn back and its side-view bends spread (HELD['tail_a_side']); the middle tail turned up
    clear of the lower one (HELD['tail_b_clear'])."""
    P = HELD
    A_ = P['tail_a_side']
    T = rc.bone_transforms(rig.J, pose, bones=B)
    bs = [f'tail_a{k}' for k in range(1, rc.TAIL_BONES+1)]
    d = [_unit(T[b][0]@rc.bone_axis(rig.J, b, B)) for b in bs]
    tg = {}
    if A_['yaw_back']:
        nd = []
        for v, sh in zip(d, A_['yaw_back_shares']):
            a = math.radians(A_['yaw_back']*sh)
            Rz = np.array([[math.cos(a), -math.sin(a), 0.], [math.sin(a), math.cos(a), 0.], [0., 0., 1.]])
            nd.append(Rz@v)
        d = nd
    if A_['spread']:
        th = np.unwrap([math.atan2(v[2], v[1]) for v in d])
        t = np.diff(th)
        Lp = np.array([math.hypot(v[1], v[2])*float(np.linalg.norm(np.array(rig.J[BONE_OF[b][3]])-np.array(rig.J[BONE_OF[b][2]]))) for b, v in zip(bs, d)])
        wk = .5*(Lp[:-1]+Lp[1:])
        t = (1-A_['spread'])*t+A_['spread']*t.sum()*wk/wk.sum()
        th2 = np.r_[th[0], th[0]+np.cumsum(t)]
        nd = []
        for v, a0, a1 in zip(d, th, th2):
            ph = a1-a0
            Rx = np.array([[1., 0., 0.], [0., math.cos(ph), -math.sin(ph)], [0., math.sin(ph), math.cos(ph)]])
            nd.append(Rx@v)
        d = nd
    if A_['yaw_back'] or A_['spread']:
        tg.update({b: v for b, v in zip(bs, d)})
    Bc = P['tail_b_clear']
    k = _keys_smooth_periodic(Bc['keys'], f, P['frames'])
    if Bc['deg'] and k > 0:
        a = math.radians(Bc['deg']*k)
        Rx = np.array([[1., 0., 0.], [0., math.cos(a), -math.sin(a)], [0., math.sin(a), math.cos(a)]])
        for j in range(1, rc.TAIL_BONES+1):
            b = f'tail_b{j}'
            tg[b] = Rx@_unit(T[b][0]@rc.bone_axis(rig.J, b, B))
    if tg:
        order = [b for b in [f'tail_{tn}{j}' for tn in rc.TAILS for j in range(1, rc.TAIL_BONES+1)] if b in tg]
        new = rc.pose_from_directions(rig.J, {b: tg[b] for b in order}, base=pose, bones=B)
        for b in order:
            pose[b] = [float(x) for x in new[b]]


BONE_OF = {x[0]: x for x in B}


def held_frame(rig, f):
    body, lift, feet, breath, info = held_loop_body(rig, f)
    full, targets = cb.solve_feet(rig, body, lift, feet)
    info.update(targets={sd: [round(float(x), 6) for x in targets[sd]] for sd in 'LR'},
                feet={sd: dict(t=[float(x) for x in feet[sd]['t']], pitch=float(feet[sd]['pitch']), pivot=feet[sd]['pivot']) for sd in 'LR'})
    return frame_dict(f, full, lift, breath, info)


def held_group(b):
    if b.startswith('ear_'):
        return 'ears'
    if b.startswith('tail'):
        return 'tails'
    if rc.base_of(b) in ('clavicle', 'upperarm', 'forearm', 'hand'):
        return 'arms'
    return 'body'


def _blend_feet(fa, fb, k):
    out = {}
    for sd in 'LR':
        ta, tb = np.asarray(fa[sd].get('t', (0., 0., 0.)), float), np.asarray(fb[sd].get('t', (0., 0., 0.)), float)
        out[sd] = dict(t=tuple((1-k)*ta+k*tb), pitch=(1-k)*fa[sd].get('pitch', 0.)+k*fb[sd].get('pitch', 0.),
                       pivot=fb[sd]['pivot'] if k >= .5 else fa[sd].get('pivot', 'toe'))
    return out


IDLE_FEET = {'L': dict(t=(0., 0., 0.), pitch=0., pivot='toe'), 'R': dict(t=(0., 0., 0.), pitch=0., pivot='toe')}
# held_in (6 frames, from idle frame 0). Fix pass 3 (critic pass 2 K5: the seize read as a slump, and the ears jumped 43 degrees
# in one frame): frame 1 is one jolt up and back onto the toes, the shoulders snapping up and in and the arms snapping to the
# sides; from frame 2 it drops into the held crouch; the ears ease back over three frames; it arrives on loop frame 44's pose at
# frame 5, so loop frame 0 follows
# (the ears' elevation on screen 86, 47, 10, -20, -26: steps of 38, 37, 30 and 6 degrees)
HELD_IN = {'arms': [0., .8, 1.05, 1.01, 1., 1.], 'body': [0., .15, .7, .95, 1., 1.], 'ears': [0., .22, .48, .88, 1., 1.],
           'tails': [0., .25, .6, .85, .97, 1.], 'jolt': [0., 1., .35, .1, 0., 0.],
           # (fix pass 5: the far ear mirrored on the near one (share) and dropped further (degrees) through the seize; the first and
           # last frames keep idle's and loop frame 44's ears)
           'far_mirror': [0., 1., 1., 1., .5, 0.], 'far_down': [0., 4., 0., 4., 8., 0.], 'far_twist': [0., 45., 60., 60., 0., 0.]}
# (fix pass 6: far_down 16, 16, 14 left the far ear 53 to 745 px below the near ear's outline at 720 in frames 1 to 3, the lip
# at 192; with the blade turned 45 to 60 degrees about its length and 0 to 4 down: 76, 73 and 9 px below, 221, 228 and 284
# above; idle frame 0's own far ear shows 4 below and 435 above)
HELD_IN_JOLT = (0., .015, .01)            # root (x, y back, z up) at the jolt's peak, on top of the blend (fix pass 6: the rise
                                          # halved, .02 to .01: at .02 both feet left the floor 2.4 and 2.8 px at 720 on frame 1)
HELD_IN_HEELS = 0.                        # the heels up (degrees about the toe pads) at the jolt's peak (fix pass 5: 14 lifted the near
                                          # heel 10 px at 720; pinned)
# at the jolt's peak, on top of the blend: the shoulders snap up and in, the trunk and head jerk back
HELD_IN_SNAP = {'clavicle.L': [0., -8., -5.], 'clavicle.R': [0., 8., 5.], 'spine': [-3., 0., 0.], 'chest': [-3., 0., 0.],
                'neck': [-3., 0., 0.], 'head': [-4., 0., 0.]}
# held_out (10 frames, from loop frame 0's pose, played in place of it after loop frame 44): it shakes free: the arms burst
# out from the sides and the trunk shakes, then everything eases into idle on the clock that lands on idle frame 89 at 9
# (fix pass 3, critic pass 2: a flat cap at 2 and 3 and a clamshell at 4: the ears now cross horizontal in one frame, as hurt
# does: their elevation -28, -22, -6, 36, 68, 82, 85)
# (fix pass 4: the loop's arms are clamped tighter than pass 3's; as the burst starts the arms take back the difference
# (`unclamp`), so from frame 2 held_out's arms move as pass 3's did)
HELD_OUT = {'idle': [0., .05, .18, .38, .6, .78, .9, .97, .995, 1.], 'ears': [0., .12, .42, .72, .9, .98, 1., 1., 1., 1.],
            'burst': [0., .7, 1., .75, .4, .15, .04, 0., 0., 0.], 'shake': [0., 8., -9., 5., -2.5, 1., 0., 0., 0., 0.],
            'unclamp': [0., .7, 1., 1., 1., 1., 1., 1., 1., 1.], 'far_mirror': [0., 1., 1., 1., 1., 1., 1., 1., 1., 1.],
            'far_down': [0., 4., 6., 3., 4., 4., 2., 0., 0., 0.], 'far_twist': [0., 60., 75., 45., 30., 15., 0., 0., 0., 0.]}
# (fix pass 6: far_down 16, 24, 18, 16 left 1603, 476 and more px of far ear below the near ear's outline at 720 in frames 1 to
# 3 and a sliver above at 4; turned 60 degrees about its length and 4 to 8 down, see the fix pass 6 report for the counts)
HELD_OUT_ARMS = {'upperarm.L': [-18., -30., 0.], 'upperarm.R': [-14., 26., 0.], 'forearm.L': [-22., 0., 0.], 'forearm.R': [-18., 0., 0.]}
# Held fix pass 8: (item 7) the near ear passes the flat cap in one frame on the way in (held_in 2) and out (held_out 2) (it
# held it two frames, held_in 1 and 2 and held_out 2 and 3); (item 8) the far ear is no longer turned about its length in the
# seize and the shake (fix pass 6's 45 to 75 degree turn folded its root 647 and 685 triangles against the approved 50: the
# folds the pass 9 builder took for a rig drift; 20 degrees of turn still folded 281 to 356); it is swung up behind the near
# one a little instead (far_down), which leaves more of it in view in held_in 2 and 3 and held_out 1 and 2 than the turn
# did (see the pass 8 report); (item 9) the hands' release
# spread over the first three frames (they jumped 90 px at 720 from held_out 0 to 1): the arms leave the grip by world
# direction (release, see held_out_frame) and the fling (burst) is smaller and slower
HELD_IN.update(ears=[0., .4, .9, 1., 1., 1.], far_twist=[0.]*6, far_down=[0., 0., -8., -6., -2., 0.])
HELD_OUT.update(ears=[0., .06, .5, .93, .99, 1., 1., 1., 1., 1.], far_twist=[0.]*10, far_down=[0., -8., -6., 0., 0., 0., 0., 0., 0., 0.],
                burst=[0., .2, .45, .65, .6, .4, .2, .06, 0., 0.], unclamp=[0., .35, .8, 1., 1., 1., 1., 1., 1., 1.],
                release=[0., .2, .45, .7, .88, .97, 1., 1., 1., 1.], release_local=[0., 0., 0., .05, .2, .45, .7, .9, 1., 1.])


# Held fix pass 9 (blind critic h8; the orchestrator agrees: the grip and the slow pulls work, but the head lurches into each
# strain, the ear reads as a hood, and at 192 the arms vanish into the body so the grip does not read). (1) The wrists are
# held behind the back and buttock line (grip_wrist: 6.5 cm back of pass 8's point, 3 cm out and 8 cm up, where the top
# tail passes 6 cm or more clear of the near arm; the elbow bends out and a little back, grip_pole), so the side view shows
# background between the arm and the body; the paw keeps .3 of its world grip turn and follows the forearm for the rest (at
# the full world turn the wrist collapsed 2 to 7 triangles at the pry and the third pull); (2) the looks ease in (see the
# look keys below) and the deeper of two overlapping looks is kept (look_max); (3) strain 3's hold is one slow swell
# (hold_wave) instead of the 5-frame tremor; (4) the look stays near profile and pitches the snout down and back toward the
# near hip (yaw 5 and 4, dip 28 and 30; strain 3 a short glance); (5) the pry builds over two frames and strains while it is
# out (pry_shape); (6) the ears pinned back and down along the neck: swung 11 degrees further back and down in the picture's
# plane (ear_pin_down) and turned 18 degrees about the head's vertical (ear_pin_yaw), so the tip sits below the root on
# screen through the loop and the inner face turns partly from the camera; they ride the head's dip instead of swinging back
# against it (dip_ear 0). Turning the inner face fully from the camera (60 degrees, or a roll about the ear's length)
# collapsed 46 to 470 ear-root triangles against the approved 0; this keeps 2 to 4 folded and 0 collapsed. Three flicks of
# their own between the strains; no separate glance (the look back from the second strain runs over 8 frames there); (7) the
# far foot set back half a step in held_in (and forward again in held_out), so the trailing leg pushes in the pulls;
# (8) held_in's lunge, arm snap and ears spread over more frames.
HELD.update(
    grip_wrist=(.22, .11, .80), grip_pole=(1., .2, 0.), grip_hand_share=.3,
    look_lead=2, look_back=5, look_max=True,
    pry_shape=(.5, .9, 1.04, .94),
    ear_pin_yaw=-18., ear_pin_down=11., dip_ear=0.,
    ear_flicks=[(9, 5, -10.), (24, 6, -12.), (40, 4, -8.)],
    glance=[(0, 0., 0.), (45, 0., 0.)],
    # (the far foot 8 cm back; its heel lifts 8 degrees in the third pull, which folded the far ankle 81 and 157 against the
    # approved 49 and 131 with the heel down)
    far_foot=[(0, .08, 0., 0.), (3, .08, 0., 0.), (4, .08, 0., 7.), (5, .08, 0., 11.), (8, .08, 0., 11.), (10, .08, 0., 5.),
              (12, .08, 0., 0.), (30, .08, 0., 0.), (33, .08, 0., 8.), (40, .08, 0., 8.), (43, .08, 0., 0.), (45, .08, 0., 0.)],
)
# (the looks by frame from each strain's start: the first turns down as its pull stops (it may not start before loop frame 0,
# which held_in and held_out play without a look) and the second carries the look on, the deeper of the two kept where they
# overlap; the second's starts 4 frames before its pull, the third's 5; each turns back over 5 to 8 frames)
for _st, _upd in zip(HELD['strains'], (dict(look=5., dip=28., look_keys=[(2., 0.), (8., 1.), (11., 1.), (15., 0.)]),
                                       dict(look=4., dip=30., look_keys=[(-4., 0.), (3., 1.), (11., 1.), (19., 0.)]),
                                       dict(look=2., dip=14., hold_wave=1., look_keys=[(-5., 0.), (3., 1.), (5., 1.), (10., 0.)]))):
    _st.update(_upd)
HELD_IN.update(body=[0., .12, .38, .68, .9, 1.], arms=[0., .45, .8, .95, 1., 1.], ears=[0., .3, .65, .9, 1., 1.], jolt=[0., .7, .45, .15, 0., 0.],
               far_step=[0., 0., .45, .9, 1., 1.], far_lift=[0., .012, .03, .012, 0., 0.])
HELD_OUT.update(far_step=[0., 0., .1, .5, .9, 1., 1., 1., 1., 1.], far_lift=[0., .01, .025, .03, .012, 0., 0., 0., 0., 0.],
                # (the grip now holds the wrists behind the back, a longer way from idle's arms: the release and the
                # fling spread wider so no frame jumps)
                release=[0., .12, .27, .43, .6, .76, .88, .96, 1., 1.], burst=[0., .1, .25, .38, .4, .3, .15, .05, 0., 0.])


# Held fix pass 10 (blind critic h9 passed the read, the motion and the grip; the ear and the neck were limits of the rig): (1) the
# ears laid back and down along the neck relative to the head (ear_turn_dirs: below the skull's long axis, splayed, turned about
# their length so the dish is edge-on to the camera; on the rig as it is that ear's root is clean up to about 40 below, see
# EAR_TURN), counter-turned against the head's own pitch by `counter` of it and kept within lo to hi below the skull line, so they
# never come up to horizontal and never go deep enough to fold the root; the far ear mirrored a little lower (far_below) so it
# stays behind the near one; three quick flicks of their own (frame, frames, degrees up toward the skull line); held_in and
# held_out move them to and from this ear by the same three numbers (ear_head_params), so they pass horizontal once;
# (2) in the holds the head turns 30 over the near shoulder and dips, the snout down and back toward the held paw (look keys
# eased over 4 to 6 frames); (3) the paws keep more of their grip turn in the world (grip_hand_share), so they stay put through
# the pulls; (4) the pry builds in two small wrenches over four frames (pry_keys); (5) the pulls carry the hips forward more and
# sink them less, so the trailing (far) leg straightens at the peaks.
HELD.update(
    ear_p10=dict(below=34., counter=.6, lo=30., hi=40., splay=25., turn=62., far_below=2., far_turn=55., far_mid=15.,
                 flicks=[(13, 4, 12.), (24, 3, 10.), (39, 4, 12.)]),
    grip_hand_share=.7,
    pry_keys=[(0., 0.), (1., .3), (2., .4), (3., .75), (4., .9), (5., .97), (6., .88), (7., -.15), (8., 0.)],
)
for _st, _upd in zip(HELD['strains'], (dict(rise=-.004, fwd=.034), dict(rise=-.003, fwd=.038), dict(rise=-.008, fwd=.042))):
    _st.update(_upd)
# (6) held_out's arms leave the grip more evenly (the paw jumped 40 and 35 px at 720 at out 2 and out 4)
HELD_OUT.update(burst=[0., .08, .16, .22, .24, .2, .12, .05, 0., 0.], release=[0., .15, .3, .45, .6, .74, .86, .95, 1., 1.],
                release_local=[0., 0., .03, .1, .22, .4, .62, .82, .95, 1.], shake=[0., 3., -3., 1.5, -.6, .2, 0., 0., 0., 0.])
# (5) the trailing foot's heel stays down in the pulls (lifted 7 to 11 degrees it bent the far knee from 22 to 33 at the peaks)
HELD['far_foot'] = [(f_, y_, z_, 0.) for f_, y_, z_, _ in HELD['far_foot']]
for _st, _upd in zip(HELD['strains'], (dict(look=30., dip=26., look_keys=[(0., 0.), (6., 1.), (11., 1.), (15., 0.)]),
                                       dict(look=30., dip=26., look_keys=[(2., 0.), (6., 1.), (12., 1.), (18., 0.)]),
                                       dict())):
    _st.update(_upd)


def held_ears_p10(rig, pose, f, n):
    """Held fix pass 10: both ears set relative to the head (see above); returns the near ear's (below, splay, turn)."""
    E_ = HELD['ear_p10']
    skin = _ear_skin(rig)
    yh_ = _world(rig, pose, 'head')@np.array([0., 1., 0.])
    ax_ = math.degrees(math.atan2(yh_[2], yh_[1]))         # the skull line's elevation pointing back (+ the back of the head up)
    if 'ax0' not in E_:
        E_['ax0'] = -4.                                    # the loop's rest head (level_head) draws it about 4 below level
    below = min(E_['hi'], max(E_['lo'], E_['below']+E_['counter']*(ax_-E_['ax0'])))
    fl = 0.
    for f0_, du_, dg_ in E_['flicks']:
        for sh_ in (-n, 0, n):
            u = f-(f0_+sh_)
            if 0 <= u <= du_:
                fl += dg_*math.sin(math.pi*u/du_)
    prm = (below-fl, E_['splay'], E_['turn'])
    set_ear_head_params(rig, skin, pose, 'L', *prm)
    set_ear_head_params(rig, skin, pose, 'R', prm[0]+E_['far_below'], prm[1], E_.get('far_turn', prm[2]))
    return prm


_EAR_SKIN = {}


def _ear_skin(rig):
    """A SkinSampler of the rig (for the ears' own frames, _ear_frames), made once."""
    if 'skin' not in _EAR_SKIN:
        _EAR_SKIN['skin'] = SkinSampler(rig.dir, DEFAULT_REST)
    return _EAR_SKIN['skin']


def ears_between(rig, pose, idle_pose, held_pose, w):
    """Held fix pass 10: both ears the share w of the way from idle's ear to the loop's, by ear_head_params' three numbers
    relative to the head as it is in `pose` (so they pass the skull's long axis once); w 0 keeps idle's ears and w 1 takes the
    loop's exactly."""
    ears = [f'ear_{i}.{sd}' for sd in 'LR' for i in range(1, 5)]
    if w <= 0.:
        for b in ears:
            pose[b] = list(idle_pose.get(b, [0., 0., 0.]))
        return
    if w >= 1.:
        for b in ears:
            pose[b] = list(held_pose.get(b, [0., 0., 0.]))
        return
    skin = _ear_skin(rig)
    for sd in 'LR':
        qi, qh = dict(pose), dict(pose)
        for i in range(1, 5):
            qi[f'ear_{i}.{sd}'] = list(idle_pose.get(f'ear_{i}.{sd}', [0., 0., 0.]))
            qh[f'ear_{i}.{sd}'] = list(held_pose.get(f'ear_{i}.{sd}', [0., 0., 0.]))
        h0, h1 = ear_head_params(rig, skin, qi, sd), ear_head_params(rig, skin, qh, sd)
        b_, s_, t_ = (x+(y-x)*w for x, y in zip(h0, h1))
        if sd == 'R':       # the far ear dips below the near one on the way (it showed beside it as a second outline)
            b_ += HELD['ear_p10'].get('far_mid', 0.)*math.sin(math.pi*w)
        set_ear_head_params(rig, skin, pose, sd, b_, s_, t_)


def ear_pin_yaw(pose, deg):
    """Held fix pass 9: each ear_1 turned deg degrees about the head's own vertical (near side; the far side mirrored), so
    the pinned ear lies back and down along the neck with its back and rim to the side camera, not its inner face."""
    for sd, sg in (('L', 1.), ('R', -1.)):
        pose[f'ear_1.{sd}'] = [float(v) for v in rc.euler_from_matrix(rot([0., 0., sg*deg])@rot(pose.get(f'ear_1.{sd}', [0., 0., 0.])))]


def mirror_far_ear_head(pose, down):
    """Held fix pass 8: the far ear's turn against the head set to the near ear's, mirrored across the head's own midline, then
    `down` degrees further back and down about the head's X axis."""
    el_ = pose.get('ear_1.L', [0., 0., 0.])
    dn = math.radians(down)
    Rx = np.array([[1., 0., 0.], [0., math.cos(dn), math.sin(dn)], [0., -math.sin(dn), math.cos(dn)]])
    pose['ear_1.R'] = [float(v) for v in rc.euler_from_matrix(Rx@rot([el_[0], -el_[1], -el_[2]]))]


def mirror_far_ear(rig, pose, down=0., share=1., twist=0.):
    """Fix pass 5 (critic pass 4: at held_in 1 and held_out 2 the far ear stood above the near one, a clamshell): the far ear
    swings as the near one does, mirrored across the body's midline in the world (so a rolled head does not lift it), then
    `down` degrees further back and down in the picture's plane, so in the side view it stays behind or below the near ear.
    Fix pass 6 (critic pass 5: it hung below the near ear as a second lip at held_in 1 to 3 and held_out 1 to 3, a sliver above
    at held_out 4): also turned `twist` degrees about its own length, so its blade is edge-on to the side camera and its
    outline narrow enough to stay inside the near ear's."""
    if 'ear_1.L' not in pose:
        return
    T = rc.bone_transforms(rig.J, pose, bones=B)
    Wh = T['head'][0]
    M = np.diag([-1., 1., 1.])
    Wf = M@(Wh@rot(pose['ear_1.L']))@M
    if down:
        a = math.radians(down)
        Wf = np.array([[1., 0., 0.], [0., math.cos(a), math.sin(a)], [0., -math.sin(a), math.cos(a)]])@Wf
    if twist:
        ax = Wf@_unit(np.array(rig.J['ear4.R'])-np.array(rig.J['ear0.R']))
        Wf = _axrot(ax*math.radians(twist))@Wf
    pose['ear_1.R'] = slerp_e(pose.get('ear_1.R', [0., 0., 0.]), [float(v) for v in rc.euler_from_matrix(Wh.T@Wf)], share)


def held_in_frame(rig, k):
    n = HELD['frames']
    e = {g: v[k] for g, v in HELD_IN.items()}
    ip, ilift, ib = cb.idle_pose(rig, k)
    hp, hlift, hfeet, hb, hinfo = held_loop_body(rig, k-HELD['entry_frames'], grip=False)
    pose = cb.blend_poses(ip, hp, lambda b: e[held_group(b)])
    for b, d in HELD_IN_SNAP.items():
        turn(pose, b, d, e['jolt'])
    ear_line_capped(rig, pose, e['ears']*HELD['ear_base'], HELD['ear_cap'], inside=HELD['ear_inside'])
    if HELD.get('ear_pin_yaw'):
        ear_follow(rig, pose, HELD.get('ear_pin_down', 0.)*e['ears'])
        ear_pin_yaw(pose, HELD['ear_pin_yaw']*e['ears'])
    # (held fix pass 8: the loop's far ear is mirrored on the near one and far_loop further down; held_in arrives on it)
    if HELD.get('far_loop') and e['ears'] > 0:
        mirror_far_ear_head(pose, HELD['far_loop']*e['ears'])
    mirror_far_ear(rig, pose, HELD_IN['far_down'][k], HELD_IN['far_mirror'][k], HELD_IN['far_twist'][k])
    if HELD.get('ear_p10'):
        ears_between(rig, pose, ip, hp, e['ears'])
    lift = (1-e['body'])*ilift+e['body']*hlift+e['jolt']*np.asarray(HELD_IN_JOLT)
    feet = _blend_feet(IDLE_FEET, hfeet, e['body'])
    planted = dict(L=True, R=True)
    if 'far_step' in HELD_IN:
        # held fix pass 9: the far foot steps back half a step as it is seized (peel, travel, set down), so the trailing
        # leg can push in the pulls
        st_ = _blend_feet(IDLE_FEET, hfeet, HELD_IN['far_step'][k])['R']
        st_['t'] = (st_['t'][0], st_['t'][1], st_['t'][2]+HELD_IN['far_lift'][k])
        feet['R'] = st_
        planted['R'] = HELD_IN['far_lift'][k] == 0. and HELD_IN['far_step'][k] in (0., 1.)
    for sd in 'LR':
        feet[sd]['pitch'] += HELD_IN_HEELS*e['jolt']
    full, targets = cb.solve_feet(rig, pose, lift, feet)
    info = dict(shares={g: round(v, 4) for g, v in e.items()}, idleClock=k, heldFrame=(k-HELD['entry_frames']) % n,
                planted=planted, targets={sd: [round(float(x), 6) for x in targets[sd]] for sd in 'LR'})
    return frame_dict(k, full, lift, (1-e['body'])*ib+e['body']*hb, info, belly=(1-e['body'])*ib)


def held_out_frame(rig, k):
    m = HELD['exit_frames']
    e = {g: v[k] for g, v in HELD_OUT.items()}
    hp, hlift, hfeet, hb, hinfo = held_loop_body(rig, k, grip=False)
    phase = IDLE_N-1-(m-1)+k
    ip, ilift, ib = cb.idle_pose(rig, phase)
    pose = cb.blend_poses(hp, ip, lambda b: e['idle'] if held_group(b) != 'ears' else e['ears'])
    for b, d in HELD['pin_p3'].items():
        turn(pose, b, [x-y for x, y in zip(d, HELD['pin'][b])], e['unclamp']*(1-e['idle']))
    for b, d in HELD_OUT_ARMS.items():
        turn(pose, b, d, e['burst'])
    turn(pose, 'chest', [0., 0., e['shake']])
    turn(pose, 'neck', [0., 0., -.5*e['shake']])
    if HELD.get('grip_wrist') and 'release' in HELD_OUT:
        # held fix pass 8 (item 9: the hands jumped 90 px at 720 from held_out 0 to 1; with the arms held behind by the grip,
        # blending their local turns toward idle's swung the elbow 48 px one way and 23 the other): the grip lets go and the
        # arms swing by each bone's world direction from where the grip held them toward idle's arms flung by the burst
        # (release), then hand over to the plain blend's own turns (release_local) so the clip still ends on idle frame 89
        ARMB = [f'{b}.{sd}' for sd in 'LR' for b in ('upperarm', 'forearm', 'hand')]
        T0 = rc.bone_transforms(rig.J, hp, bones=B)
        tp = dict(pose)
        for b in ARMB:
            tp[b] = list(ip.get(b, [0., 0., 0.]))
        for b, d in HELD_OUT_ARMS.items():
            turn(tp, b, d, e['burst'])
        T1 = rc.bone_transforms(rig.J, tp, bones=B)
        wr = HELD_OUT['release'][k]
        tg = {b: _slerp_dir(T0[b][0]@rc.bone_axis(rig.J, b, B), T1[b][0]@rc.bone_axis(rig.J, b, B), wr) for b in ARMB}
        # (aimed by the smallest turn from the held arm's own turn, so the twist the grip's IK gave it is kept and frame 0 is
        # loop frame 0 exactly)
        pz = dict(pose, **{b: list(hp.get(b, [0., 0., 0.])) for b in ARMB})
        for b in ARMB:
            _aim_bone(rig, pz, b, tg[b])
        wl = HELD_OUT['release_local'][k]
        for b in ARMB:
            pose[b] = slerp_e([float(x) for x in pz[b]], pose[b], wl)
    ear_line_capped(rig, pose, (1-e['ears'])*HELD['ear_base'], HELD['ear_cap'], toward=ip if e['ears'] > 0 else None,
                    inside=HELD['ear_inside'])
    if HELD.get('ear_pin_yaw'):
        ear_follow(rig, pose, HELD.get('ear_pin_down', 0.)*(1-e['ears']))
        ear_pin_yaw(pose, HELD['ear_pin_yaw']*(1-e['ears']))
    # (held fix pass 8: it leaves from the loop's far ear, mirrored on the near one and far_loop further down)
    if HELD.get('far_loop') and e['ears'] < 1:
        mirror_far_ear_head(pose, HELD['far_loop']*(1-e['ears']))
    mirror_far_ear(rig, pose, HELD_OUT['far_down'][k], HELD_OUT['far_mirror'][k], HELD_OUT['far_twist'][k])
    if HELD.get('ear_p10'):
        ears_between(rig, pose, ip, hp, 1.-e['ears'])
    lift = (1-e['idle'])*hlift+e['idle']*ilift
    feet = _blend_feet(hfeet, IDLE_FEET, e['idle'])
    planted = dict(L=True, R=True)
    if 'far_step' in HELD_OUT:
        # held fix pass 9: the far foot steps forward again from its half step back as it shakes free
        st_ = _blend_feet(hfeet, IDLE_FEET, HELD_OUT['far_step'][k])['R']
        st_['t'] = (st_['t'][0], st_['t'][1], st_['t'][2]+HELD_OUT['far_lift'][k])
        feet['R'] = st_
        planted['R'] = HELD_OUT['far_lift'][k] == 0. and HELD_OUT['far_step'][k] in (0., 1.)
    full, targets = cb.solve_feet(rig, pose, lift, feet)
    info = dict(shares={g: round(v, 4) for g, v in e.items()}, idleClock=phase, heldFrame=k, planted=planted,
                targets={sd: [round(float(x), 6) for x in targets[sd]] for sd in 'LR'})
    return frame_dict(k, full, lift, (1-e['idle'])*hb+e['idle']*ib, info, belly=e['idle']*ib)


# ---------------------------------------------------------------- the faint end poses (setup check)

def _roty(deg):
    return rot([0., deg, 0.])


def root_euler(name, roll=0.):
    """The whole body's turn on the root bone for a lying candidate (Euler degrees, R = Rz Ry Rx). A: on its right side (the
    far side down), the back to the camera, the head to the screen's right (it fell back and to its right); B: on its right
    side, the belly and limbs to the camera, the head to the screen's left (it fell forward and rolled onto its right side,
    as the elephant in the faint references); C: slumped forward on its belly, the near flank to the camera, the head to the
    screen's left. `roll` turns the lying body about its own length (world Y; + turns the side facing up toward the camera);
    a lateral body needs a few degrees of it, since lying exactly on its side is the Euler's singular point."""
    if name in LIE_PITCH:                        # fix pass 2: a forward collapse in profile, pitched forward on the root
        R0 = rot([LIE_PITCH[name], 0., 0.])
    elif name == 'C':
        R0 = rot([90., 0., 0.])
    else:
        sg = 1. if name == 'A' else -1.
        R0 = np.array([[0., sg, 0.], [0., 0., sg], [1., 0., 0.]])     # columns: local x -> +Z, y -> sg*X, z -> sg*Y
    return [float(v) for v in rc.euler_from_matrix(_roty(roll)@R0)]


# limp body poses relative to the root (the trunk, head, arms, legs and tails as they lie; legs by hand, not planted)
LIMP_LATERAL = {
    # a loose C: the spine curls forward a little and sags to the ground side, the head rests on its right side
    'pelvis': [4., 0., 0.], 'spine': [6., -7., 0.], 'chest': [5., -7., 0.], 'neck': [0., 6., -15.], 'head': [4., 8., -25.],
    'jaw': [6., 0., 0.],
    # arms limp in front of the chest: the lower (right) arm lies forward along the ground, the upper (left) drapes down over it
    'clavicle.L': [0., 0., 0.], 'clavicle.R': [0., 0., 0.],
    'upperarm.L': [-45., 22., 0.], 'forearm.L': [-20., 0., 0.], 'hand.L': [10., 0., 0.],
    'upperarm.R': [-60., -20., 0.], 'forearm.R': [-15., 0., 0.], 'hand.R': [5., 0., 0.],
    # legs loose, hips and knees bent; the top (left) leg falls onto the lower one and a little ahead of it, the lower leg's
    # splay taken in so it does not prop the hips up
    'thigh.L': [-45., 6., 0.], 'shin.L': [55., 0., 0.], 'foot.L': [25., 0., 0.],
    'thigh.R': [-30., -8., 0.], 'shin.R': [45., 0., 0.], 'foot.R': [25., 0., 0.],
}
LIMP_PRONE = {
    # slumped forward on the belly: the spine nearly flat, the head down with the jaw on the ground and the mouth slack
    'pelvis': [0., 0., 0.], 'spine': [-4., 0., 0.], 'chest': [-2., 0., 0.], 'neck': [8., 0., 0.], 'head': [-14., 0., 0.],
    'jaw': [8., 0., 0.],
    'clavicle.L': [0., 0., 0.], 'clavicle.R': [0., 0., 0.],
    # arms limp back along the flanks, elbows a little bent
    'upperarm.L': [15., 0., -10.], 'forearm.L': [-20., 0., 0.], 'hand.L': [20., 0., 0.],
    'upperarm.R': [12., 0., 10.], 'forearm.R': [-20., 0., 0.], 'hand.R': [20., 0., 0.],
    # legs flat behind, knees a little bent, the feet pointed so their tops lie on the ground
    'thigh.L': [-4., 0., 0.], 'shin.L': [40., 0., 0.], 'foot.L': [35., 0., 0.],
    'thigh.R': [0., 0., 0.], 'shin.R': [30., 0., 0.], 'foot.R': [35., 0., 0.],
}
# the tails: Night Stalk's own tail pose (lowered and drawn in, approved: the tail fork folds 50 against its 52), which is as far as
# the fork bends cleanly (setup check: swinging the tails toward the ground side at their first bones, 14 to 40 degrees, folded
# the fork 433 to 477 triangles; the board's own tails_drawn_in and twist_bend fold it 460 and 651)
TAILS_NS = 'night_stalk'


# fix pass 2 (the orchestrator's redesign after critic pass 1): faint collapses forward onto the chest in profile, no turn. K: a
# kneel with the rump up (the knees on the floor behind the hips, the thighs less folded); S: sitting back on the heels (the
# hips and knees folded deep). The trunk pitched forward on the root (the settle then finds the rest)
LIMP_KNEEL = {
    # the trunk arched a little (the rump up, the chest flat), the head and neck at Night Stalk's own extension (more folds the
    # neck: 45 degrees 70 against the approved 44, 55 degrees 299)
    'pelvis': [0., 0., 0.], 'spine': [-8., 0., 0.], 'chest': [-7., 0., 0.], 'neck': [-14., 0., 0.], 'head': [-24., 0., 0.],
    'jaw': [10., 0., 0.],
    'clavicle.L': [0., 0., 0.], 'clavicle.R': [0., 0., 0.],
    # the arms limp, lying forward along the floor beside the head
    'upperarm.L': [-18., -6., 0.], 'forearm.L': [-4., 0., 0.], 'hand.L': [0., 0., 0.],
    'upperarm.R': [-14., 6., 0.], 'forearm.R': [-6., 0., 0.], 'hand.R': [0., 0., 0.],
    # the legs: Night Stalk f18's thighs (its approved hip fold), the knees opened from its 73 to 40 so the shins lie back along
    # the floor, the feet pointed 45 so their tops lie on it (Night Stalk's own knees and feet left the feet 11 cm in the air)
    'thigh.L': [-75.6, -13.2, -5.8], 'shin.L': [40., -9.5, 12.8], 'foot.L': [45., 3.4, -6.4],
    'thigh.R': [-75.6, 13.2, 5.8], 'shin.R': [40., 9.5, -12.8], 'foot.R': [45., -3.4, 6.4],
}
LIMP_SITBACK = dict(LIMP_KNEEL, **{'thigh.L': [-105., -13.2, -5.8], 'shin.L': [120., -9.5, 12.8], 'foot.L': [-20., 3.4, -6.4],
                                    'thigh.R': [-105., 13.2, 5.8], 'shin.R': [120., 9.5, -12.8], 'foot.R': [-20., -3.4, 6.4]})
LIE_PITCH = {'K': 120., 'S': 95.}
LIMP = {'A': 'LIMP_LATERAL', 'B': 'LIMP_LATERAL', 'C': 'LIMP_PRONE', 'K': 'LIMP_KNEEL', 'S': 'LIMP_SITBACK'}
LIE_ROLL = {'A': 8., 'B': -8., 'C': 0., 'K': 0., 'S': 0.}
# the ears: Night Stalk f18's ear (relative to the head) swung `inward` degrees further toward the head's midline about the
# head's front-to-back axis, so the lower ear lies on the ground behind the head instead of reaching under it (setup check: the
# ear root folds 50 at f18, 10 at 6 degrees inward, 3 at 12 and 18; swept_ears with no outward angle, which also rolls the
# blade, folded 284)
LIE_EARS = {'A': dict(inward=24.), 'B': dict(inward=24.), 'C': dict(inward=0.), 'K': dict(inward=20., down=25.), 'S': dict(inward=20., down=25.)}
# the tails keep Night Stalk's pose at the fork and curl along their chains (bones 2 to 5, each bone's own frame) down to the
# ground: lateral, toward the creature's right (the ground side); prone, down behind
LIE_TAIL_CURL = {'A': [0., 0., 18.], 'B': [0., 0., 18.], 'C': [-18., 0., 0.], 'K': [-28., 0., 0.], 'S': [-28., 0., 0.]}


def lie_ears(rig, inward, k=1., down=0.):
    """Both ears at the share k of Night Stalk f18's swing, then turned `inward` degrees toward the head's midline about the
    head's front-to-back axis and `down` degrees further down the back of the neck about its side-to-side axis (a rigid swing
    of ear_1; the right ear mirrors the left). (Fix pass 2 setup: past f18 the ear root folds 112 to 225 at 10 to 30 degrees
    down, but turned 20 degrees inward as well only 7 at 20 down and 13 at 30; 20 inward alone, 5.)"""
    out = {}
    for b, sg in (('ear_1.L', 1.), ('ear_1.R', -1.)):        # +Y turns the left ear's tip toward -X (the midline)
        base = rot(ac.share_of(rig.body[b], k))
        out[b] = [float(v) for v in rc.euler_from_matrix(rot([-down, 0., 0.])@rot([0., sg*inward, 0.])@base)]
    return out


# fix pass 2: the kneel's tails drape behind onto the floor. A chain curl about each bone's X does not bend a tail that runs
# sideways (Akinza's tails curve out to its left, so for their outer bones X is nearly the bone's own line: a twist), so bones 2 to
# 5 are set by world direction (rig_core.pose_from_directions): from where the first bone points (Night Stalk's pose at the
# fork, which keeps the fork's folds approved) arching back and down to lie back along the floor, each tail splayed its own way
# across the floor (+X is toward the camera). Per tail: the sideways share, and the chain's down-and-back directions per bone
# (setup: the kneel's rump sits 0.34 m up and its tails leave it pointing up; the fork's approved folds stop the lowering at the
# first bones' 25 degrees past Night Stalk's (the root past 30, or the first bones past 25, fold the fork 78/29 and 50/92 against
# 52/6), so the chains hang behind the rump with their tips 0.15 to 0.25 m off the floor: they cannot reach it)
LIE_TAIL_X1 = {'K': 0., 'S': 0.}
# (setup: with the first bones lowered 25 degrees more, tails a and b met at their bases, 5 mm apart, and b lay on the calves.
# Bones 2 and 3 drop near straight down from the first bones' tips (0.45 m up), bones 4 and 5 run back and down; a splays toward
# the camera, c away, b back between them over the calves: apart 68 mm or more, 11 mm or more clear of the legs, the lowest
# tail skin 113 to 184 mm off the floor (the chains are 0.42 m long: hanging plumb from 0.45 m they would reach the calves
# first); spreading them wider or steeper laid b on the calves (0 to 8 mm) or brought a and b within 32 to 58 mm)
_D = lambda x, back, down: dict(x=x, dirs=((back, -1.), (back, -1.), (1., -down), (1., -down)))
LIE_DRAPE = {'K': {'a': _D(.7, -.1, 1.6), 'b': _D(-.2, .3, 1.3), 'c': _D(-.7, .6, 1.6)}}
LIE_DRAPE['S'] = LIE_DRAPE['K']


def drape_tails(rig, pose, spec):
    """Tail bones 2 to 5 set to world directions (back = +Y, down = -Z, sideways share x), the root and first bones kept."""
    order = []
    targets = {}
    for tl, sp in spec.items():
        for k, (yb, zb) in zip(range(2, rc.TAIL_BONES+1), sp['dirs']):
            d = np.array([sp['x'], yb, zb], float)
            targets[f'tail_{tl}{k}'] = d/np.linalg.norm(d)
            order.append(f'tail_{tl}{k}')
    out = rc.pose_from_directions(rig.J, {b: targets[b] for b in order}, base=pose, bones=B)
    return {k: [float(x) for x in v] for k, v in out.items()}


def lie_pose(rig, name):
    """The candidate's lying pose (all bones, the legs by hand) and the root turn, before the root move."""
    body = globals()[LIMP[name]]
    pose = {b: list(e) for b, e in body.items()}
    for b, e in rig.body.items():
        if b.startswith('tail'):
            pose[b] = list(e)
    pose.update(lie_ears(rig, LIE_EARS[name]['inward'], down=LIE_EARS[name].get('down', 0.)))
    pose['root'] = root_euler(name, LIE_ROLL[name])
    if name in LIE_DRAPE:
        for tl in rc.TAILS:
            turn(pose, f'tail_{tl}1', [LIE_TAIL_X1.get(name, 0.), 0., 0.], pre=True)
        pose = drape_tails(rig, pose, LIE_DRAPE[name])
    else:
        for t in rc.TAILS:
            for k in range(2, rc.TAIL_BONES+1):
                turn(pose, f'tail_{t}{k}', LIE_TAIL_CURL[name])
    return pose


def ground_lift(skin, pose, centre_y=.10, clearance=0.):
    """The root move that sets the posed skin's lowest point on the floor (plus clearance) and its middle (the bounding box's
    centre along Y) at centre_y, the framing's middle; x stays 0."""
    P = skin.posed(pose, [0., 0., 0.])
    return np.array([0., centre_y-(P[:, 1].min()+P[:, 1].max())/2, clearance-P[:, 2].min()])


def settle(skin, pose, span=20., step=1.):
    """Let the lying body come to rest on the floor as a rigid shape (a limp body settles until its weight is over what it
    rests on): the root turn is tilted about the two horizontal world axes (X, across the screen's depth: the body tips in the
    picture; Y, along the lying body: it rolls) within +-span degrees, and the tilt that leaves the centre of mass (the skin's
    area-weighted centroid) lowest, with the lowest point on the floor, is kept. The root turn is rigid for the whole body
    (every bone hangs from the root and no key reads the root), so the skin is posed once and only turned. Returns the root
    Euler and the two tilts."""
    from scipy.spatial import ConvexHull
    R0 = rot(pose.get('root', [0., 0., 0.]))
    body = {k: v for k, v in pose.items() if k != 'root'}
    P = skin.posed(body, [0., 0., 0.])
    hull = P[ConvexHull(P[::7]).vertices*7]
    t = skin.tris
    c3 = P[t].mean(1)
    ar = np.linalg.norm(np.cross(P[t[:, 1]]-P[t[:, 0]], P[t[:, 2]]-P[t[:, 0]]), axis=1)
    com = (c3*ar[:, None]).sum(0)/ar.sum()

    def height(ax, ay):
        R = rot([ax, 0., 0.])@_roty(ay)@R0
        return float((R@com)[2]-(hull@R.T)[:, 2].min())
    grid = [(height(ax, ay), ax, ay) for ax in np.arange(-span, span+1e-9, step) for ay in np.arange(-span, span+1e-9, step)]
    _, bx, by = min(grid)
    fine = [(height(bx+dx, by+dy), bx+dx, by+dy) for dx in np.arange(-1, 1.01, .25) for dy in np.arange(-1, 1.01, .25)]
    _, bx, by = min(fine)
    R = rot([bx, 0., 0.])@_roty(by)@R0
    return [float(v) for v in rc.euler_from_matrix(R)], (float(bx), float(by))


def lie_frame(rig, skin, name):
    pose = lie_pose(rig, name)
    pose['root'], tilt = settle(skin, pose)
    lift = ground_lift(skin, pose)
    return frame_dict(0, pose, lift, 0., dict(candidate=name, root=pose['root'], settleTilt=tilt, planted=dict(L=False, R=False),
                                              targets=None), belly=0.)


# ---------------------------------------------------------------- faint

# The knees buckle, the body sways and folds, drops, and comes to rest lying limp. Research note: the darted bobcat is limp all
# through (the head hangs, the legs and tail dangle with no tension); the elephant's body goes down as one mass, the legs giving
# first and the head going down last. Fix pass 2 (the orchestrator's redesign after critic pass 1: pose A's roll onto the side
# read as a spin, and the fall floated and kicked): a forward collapse onto the chest in the picture's plane, never turning. The
# head and neck give first (the chin drops, frames 1 to 3, the head's droop and roll in the world capped so the ear stays on its
# line instead of reading as a cap) while the ears go back onto stalk f18's line on screen, the knees buckle from frame 2 into a
# crouch by 9 (as pass 1, which the critic liked, 3 cm shallower), and from frame 11 the hips sink and the feet slide back
# along the floor, rolling from their toe pads onto their tops, so the knees come down to the floor (at 25) while the trunk sags
# forward and tips over them, gathering speed under gravity, the head two frames behind the trunk's bend, the arms hanging; the tails swing
# up and back as the hips drop and settle into their drape; the chest and forearms meet the floor and the head lands ahead of
# them on frame 27 (`down`); one small bounce (the body lifts 8 mm off the floor and drops back), settled by 31, still to 35 (the
# game holds the last frame). The end pose is the setup check's kneel, K.
FAINT = dict(
    frames=36, down=27, candidate='K', settle_end=31, fold_start=11,
    # the buckle (feet planted, the legs by the rig's IK): share tracks (frame, ease into it, value)
    drop=[(0, 'linear', 0.), (2, 'in', .04), (5, 'in', .35), (9, 'in', 1.)],
    drop_m=(0., .12, -.09),                  # root at the full buckle: hips 12 cm back, 9 cm down (Night Stalk's crouch: 11.5 back, 14 down;
                                             # setup: 15 down folded the knees 4018 against the approved 3617, the knees at 77 to 82 degrees;
                                             # fix pass 2: from 12 down the legs, sliding back under the hips on the way to the kneel, folded
                                             # the knees to 86 to 92 degrees (4600 to 4990); from 9 down they peak at 74)
    slump=[(0, 'linear', 0.), (1, 'out', .35), (3, 'smooth', 1.), (6, 'smooth', .55), (9, 'smooth', .2), (11, 'smooth', .3)],
    slump_rot={'neck': [12., 0., 0.], 'head': [10., 0., 0.], 'spine': [5., 0., 0.], 'chest': [6., 0., 0.]},
    sway=[(3, 'linear', 0.), (9, 'smooth', 1.), (11, 'smooth', .7)],
    sway_rot={'pelvis': [-8., 0., 0.], 'spine': [-5., -3., 0.], 'chest': [-4., -2., 0.], 'neck': [-6., -4., 0.], 'head': [-6., -4., 0.]},
    heel=[(0, 'linear', 0.), (4, 'smooth', 0.), (9, 'smooth', 10.), (11, 'smooth', 12.)],      # the heels rise as the weight goes over the toes
    # fix pass 2 (critic F4, the clamshell and hammerhead): the head's world pitch is capped (chin down at most head_cap degrees)
    # and the ears draw stalk f18's line on screen at the ears share (ear_line_capped, at most ear_cap degrees past f18's own pose
    # relative to the head, where the ear root folds)
    head_cap=6., ear_cap=1.,
    # (and its roll in the world, the sway's side lean, taken out by the neck: with the head rolled 13 degrees by the sway the ears,
    # capped where the ear root folds, stood 20 to 25 degrees off stalk f18's line at 8 to 10)
    head_roll_cap=0.,
    ear_inside=20.,                          # (the sway tips the head back: the line then asks for less swing, followed up to 20 degrees)
    # the arms go limp: they hang, lagging the trunk (a lag in frames on the slump and sway), swinging a little forward
    arm_lag=1.5, arm_swing={'upperarm.L': [-10., -4., 0.], 'upperarm.R': [-8., 4., 0.], 'forearm.L': [-12., 0., 0.], 'forearm.R': [-10., 0., 0.]},
    arm_swing_track=[(0, 'linear', 0.), (4, 'smooth', .2), (8, 'smooth', 1.), (9, 'linear', 1.)],
    # (the line at .97 of the sweep: at the full sweep, capped at 1 degree, the ear root folded 51 to 53 at 7 to 14 against 50)
    ears_k=[(0, 'linear', 0.), (1, 'linear', 0.), (4, 'smooth', .7), (7, 'smooth', .97)],
    tails_k=[(0, 'linear', 0.), (3, 'linear', 0.), (9, 'smooth', .25)],
    # the fall (from frame 11): the share of the way from the buckled pose to the lying pose per group, (start lag, end frame,
    # ease): the root tips the whole body forward from 12 with a gravity ease and lands on 27, the trunk's own bend from 14, the
    # head's from 16 landing with them, the arms eased in from 13 and down on 28, the ears settling by 30, the tails turning to
    # their drape from 20 and down on 27; the hips sink on their own track and the feet slide back on theirs (below)
    # (the legs hold the crouch's fold while the whole body tips forward over the toes, so the knees go down to the floor without
    # folding past the crouch's approved bend and nothing rises; blending the legs toward the lying pose from the start opened the
    # knees and stood the body up, the chest rising to 655 mm)
    # (the root's forward pitch carries the whole body over on one gravity ease; the trunk's own bend, the head and the legs come
    # later, so nothing straightens up on the way down: with the trunk blended from the start the head rose 40 mm at 13 to 17.
    # The pitch starts at once and gathers speed ('gravity': half steady, half accelerating), so the trunk tips over the legs while
    # the feet slide back: on a pure accelerating ease it stayed upright to 17 while the legs slid out under it. The trunk's own
    # bend from 14: from 16, under the earlier tip, the fork's skin collapsed 7 against the approved 6 at 18 and 19)
    fall={'root': (1., 27, 'gravity'), 'hips': (0., 25., 'in'), 'feet': (0., 24., 'out'), 'feet_roll': (0., 25., 'linear'), 'body': (3., 27, 'smooth'),
          'legs': (10., 28, 'smooth'), 'head': (5., 27, 'smooth'), 'arms': (2., 28, 'in'), 'ears': (3., 30, 'smooth'),
          'tails': (9., 27, 'in')},
    # the ankle targets: this share of a straight slide in the world, the rest carried in the body's frame (all world: the legs
    # straightened to 9 degrees and the feet lifted 23 to 31 mm; all body frame: the knees folded to 124 and the feet lifted 62 mm
    # before the landing; at .7 the knees folded to 91; at .85, the slide easing out (fast first, while the hips are still high, so
    # the feet pass under the hips early) the knees peak at 74 on frames 13 and 14 and open to 34 to 46 on the way down, the feet
    # on the floor throughout)
    ankle_world_share=.85,
    # (the feet roll from their toe pads onto their tops on their own track, `feet_roll`, at an even rate: rolled with the slide's
    # fast start, or smoothly, the ankles bent past the crouch's, folding 55 to 215 against the approved 49. The tails turn to their
    # lying drape late, from 20, and on a gravity ease: turned from 11 the fork's skin collapsed 7 to 15 against the approved 6; on a
    # smooth ease tail b lay on the calves on 25 and 26, 0.1 mm off)
    # the legs go from the IK to the lying pose's own on the landing (frame 27, when the root has landed): eased in from 25, with
    # the root still turning, the lying pose's leg angles lifted the knees 26 mm off the floor and the feet 21 mm; eased over 27 to
    # 30 the IK's hips folded 532/3999 against the approved 208/1464
    legs_to_lie=(26, 27),
    # the tails swing up and back as the hips drop (a lift on their middle bones, clear of the fork), so they never prop the body
    # (on bones 3 and 4: on bones 2 and 3, with the drape's steep second bones, the fork's skin collapsed 12 to 17 against 6)
    tail_up=[(11, 'linear', 0.), (15, 'smooth', 1.), (21, 'linear', 1.), (26, 'smooth', 0.)], tail_up_deg={3: 16., 4: 12.},
    # the bounce on landing (frames 27 to 31): additive turns at the bounce's share, which peaks a frame after the landing
    bounce=[(27, 'linear', 0.), (28, 'out', 1.), (29, 'smooth', -.35), (30, 'smooth', .1), (31, 'smooth', 0.)],
    # (a bounce in the arms pushed the paws into the floor and lifted the whole body 50 mm at frame 28; a chin-up bounce of the head,
    # 4 degrees, folded the neck 54 against the approved 44: the whole body lifts off the floor a little and drops back)
    bounce_rot={'jaw': [3., 0., 0.]}, bounce_lift=.008,
)


def faint_group(b):
    if b.startswith('ear_'):
        return 'ears'
    if b.startswith('tail'):
        return 'tails'
    if b in ('neck', 'head', 'jaw'):
        return 'head'
    if rc.base_of(b) in ('clavicle', 'upperarm', 'forearm', 'hand'):
        return 'arms'
    if rc.base_of(b) in ('thigh', 'shin', 'foot', 'glute'):
        return 'legs'
    return 'body'


def faint_buckle(rig, f):
    """Faint frames 0 to fold_start: the buckle on planted feet. Returns the full pose (legs by IK), root move, breath, info."""
    P = FAINT
    tr = lambda k: ac.track(P[k], f)
    ip, ilift, ib = cb.idle_pose(rig, f)
    pose = {k: list(v) for k, v in ip.items()}
    sl, sw = tr('slump'), tr('sway')
    for b, e in P['slump_rot'].items():
        turn(pose, b, e, sl)
    for b, e in P['sway_rot'].items():
        turn(pose, b, e, sw)
    lagged = lambda k: ac.track(P[k], max(0., f-P['arm_lag']))
    for b, e in P['arm_swing'].items():
        turn(pose, b, e, lagged('arm_swing_track'))
    # fix pass 2: the head's chin-down droop capped in the world, then the ears on stalk f18's line on screen (rule 1)
    Wh = rc.bone_transforms(rig.J, pose, bones=B)['head'][0]
    up = Wh@np.array([0., 0., 1.])
    pitch = math.degrees(math.atan2(-up[1], up[2]))                # + chin down (the head's top tipped forward)
    if pitch > P['head_cap']:
        turn(pose, 'neck', [-(pitch-P['head_cap']), 0., 0.], pre=True)
    Wh = rc.bone_transforms(rig.J, pose, bones=B)['head'][0]
    up = Wh@np.array([0., 0., 1.])
    roll = math.degrees(math.atan2(up[0], up[2]))                  # + the head's top tipped toward the camera
    if abs(roll) > P['head_roll_cap']:
        turn(pose, 'neck', [0., -math.copysign(abs(roll)-P['head_roll_cap'], roll), 0.], pre=True)
    ear_line_capped(rig, pose, tr('ears_k'), P['ear_cap'], inside=P['ear_inside'])
    for b, e in rig.body.items():
        if b.startswith('tail'):
            pose[b] = slerp_e(pose.get(b, [0., 0., 0.]), e, tr('tails_k'))
    d = tr('drop')
    lift = np.asarray(ilift, float)*(1-d)+d*np.asarray(P['drop_m'])
    heel = tr('heel')
    feet = {sd: dict(pitch=heel, pivot='toe') for sd in 'LR'}
    full, targets = cb.solve_feet(rig, pose, lift, feet)
    info = dict(drop=round(d, 4), slump=round(sl, 4), sway=round(sw, 4), heel=round(heel, 3), planted=dict(L=True, R=True),
                targets={sd: [round(float(x), 6) for x in targets[sd]] for sd in 'LR'})
    return full, lift, ib*(1-d), info


def pelvis_world(pose, lift):
    return rot(pose.get('root', [0., 0., 0.]))@np.array(J_OF['pelvis'])+np.asarray(lift, float)


J_OF = {}


def faint_frames(rig, skin):
    """All faint frames (the lying pose comes from the settle on the posed skin, so the clip is made in one go). Fix pass 2: from
    the buckle's last frame the trunk, head, arms, ears and tails turn along the shortest arc (slerp) toward the lying pose at
    their groups' shares and the root pitches forward in the picture's plane; the hips travel on a straight line from the
    crouch's spot down to the lying pose's; the legs are solved by the rig's own two-bone IK (rig_core.plant_legs, the knee's
    hinge plane turning with the root) to ankle targets that slide back along the floor while each foot rolls from standing on its
    toe pads to lying on its top (its world turn slerped), the ankle's height set so the foot's lowest skin stays on the floor;
    so both feet stay down the whole way and the knees fold down to the floor. If any skin would go under the floor the whole
    body is raised to rest on it. Over the last frames the legs ease from the IK into the lying pose's own."""
    P = FAINT
    n = P['frames']
    J = rig.J
    J_OF.update(J)
    lie = lie_frame(rig, skin, P['candidate'])
    L, Llift = lie['pose'], np.asarray(lie['lift'], float)
    out = []
    fb = P['fold_start']
    Kb, Kblift, _, _ = faint_buckle(rig, fb)
    pb = pelvis_world(Kb, Kblift)
    pl = pelvis_world(L, Llift)
    TB = rc.bone_transforms(J, Kb, bones=B, root_translate=tuple(Kblift))
    TL = rc.bone_transforms(J, L, bones=B, root_translate=tuple(Llift))
    ank = {k: {sd: T[f'shin.{sd}'][0]@np.array(J[f'ankle.{sd}'])+T[f'shin.{sd}'][1] for sd in 'LR'} for k, T in (('b', TB), ('l', TL))}
    rf = {k: {sd: T[f'foot.{sd}'][0] for sd in 'LR'} for k, T in (('b', TB), ('l', TL))}
    dom = skin.idx[:, 0]
    foot_off = {sd: skin.rest[dom == NAMES.index(f'foot.{sd}')]-np.array(J[f'ankle.{sd}']) for sd in 'LR'}
    legs_l = {b: L[b] for b in L if rc.base_of(b) in ('thigh', 'shin', 'foot')}
    rel_b = {sd: np.zeros(3)+(rot([0., 0., 0.]).T@(ank['b'][sd]-pb)) for sd in 'LR'}
    rel_l = {sd: rot(L['root']).T@(ank['l'][sd]-pl) for sd in 'LR'}
    for f in range(n):
        if f <= fb:
            full, lift, breath, info = faint_buckle(rig, f)
            out.append(frame_dict(f, full, lift, breath, info, belly=breath))
            continue
        shares = {}
        for g, (lag, end, kind) in P['fall'].items():
            u = min(1., max(0., (f-fb-lag)/(end-fb-lag)))
            # 'gravity': half a steady fall, half an accelerating one (it starts tipping at once and gathers speed to the floor)
            shares[g] = .5*u+.5*cp.ease('in', u) if kind == 'gravity' else cp.ease(kind, u)
        body = cb.blend_poses(Kb, L, lambda b: shares[faint_group(b)])
        body = {k: v for k, v in body.items() if rc.base_of(k) not in ('thigh', 'shin', 'foot')}
        body['root'] = slerp_e([0., 0., 0.], L['root'], shares['root'])     # a forward pitch in the picture's plane
        bo = ac.track(P['bounce'], f)
        for b, e in P['bounce_rot'].items():
            turn(body, b, e, bo)
        tu = ac.track(P['tail_up'], f)
        for tl in rc.TAILS:
            for k, deg in P['tail_up_deg'].items():
                turn(body, f'tail_{tl}{k}', [deg*tu, 0., 0.])
        phase = 'fall' if f < P['down'] else 'settle' if f < P['settle_end'] else 'still'
        if f >= P['settle_end']:
            pose, lift = {k: list(v) for k, v in L.items()}, Llift.copy()
        elif f >= P['down']:
            # landed: the lying pose's legs and root move, the arms, ears and tails still settling, the bounce a lift off the floor
            pose = {k: v for k, v in body.items()}
            pose.update({k: list(v) for k, v in legs_l.items()})
            lift = Llift+np.array([0., 0., P['bounce_lift']*max(0., bo)])
            low = float(skin.posed(pose, lift)[:, 2].min())
            lift = lift-np.array([0., 0., min(0., low)])
        else:
            Rr = rot(body['root'])
            pw = pb+(pl-pb)*shares['hips']
            lift = pw-Rr@np.array(J['pelvis'])
            s = shares['feet']
            targets, Rf = {}, {}
            for sd in 'LR':
                Rf[sd] = rot(slerp_e(rc.euler_from_matrix(rf['b'][sd]), rc.euler_from_matrix(rf['l'][sd]), shares['feet_roll']))
                # the ankle relative to the hips in the body's own (root) frame, blended between the crouch's and the lying pose's,
                # carried by the root's turn, then set down on the floor (a straight blend in the world overran the legs' reach)
                rel = rel_b[sd]+(rel_l[sd]-rel_b[sd])*s
                m = P['ankle_world_share']
                a_ = (1-m)*(pw+Rr@rel)+m*(ank['b'][sd]+(ank['l'][sd]-ank['b'][sd])*s)
                a_[2] = -(foot_off[sd]@Rf[sd].T)[:, 2].min()
                targets[sd] = a_.tolist()
            poles = {sd: (Rr@np.asarray(rig.poles[sd], float)).tolist() for sd in 'LR'}
            pose = rc.plant_legs(J, body, lift, targets, poles, bones=B)
            T = rc.bone_transforms(J, pose, bones=B, root_translate=tuple(rc.lift_vec(lift)))
            for sd in 'LR':
                pose[f'foot.{sd}'] = rc.euler_from_matrix(T[f'shin.{sd}'][0].T@Rf[sd])
            wl = cp.window(f, *P['legs_to_lie'])
            if wl > 0:
                pose = {k: (slerp_e(pose[k], legs_l[k], wl) if k in legs_l else v) for k, v in pose.items()}
                lift = lift+(Llift-lift)*wl
            Pz = skin.posed(pose, lift)
            low = float(Pz[:, 2].min())
            lift = np.array([lift[0], lift[1], lift[2]-min(0., low)]) if low < 0 else np.asarray(lift, float)
        info = dict(phase=phase, shares={g: round(v, 4) for g, v in shares.items()}, bounce=round(bo, 4), planted=dict(L=False, R=False),
                    targets=None)
        out.append(frame_dict(f, pose, lift, 0., info, belly=0.))
    return out


def bake_setup(rig_dir, out, rest, names='K,S'):
    rig = ac.Rig(rig_dir)
    skin = SkinSampler(rig_dir, rest)
    out = Path(out)
    for name in names.split(','):
        fr = lie_frame(rig, skin, name)
        (out/f'faint{name}').mkdir(parents=True, exist_ok=True)
        (out/f'faint{name}'/'poses.json').write_text(json.dumps([fr], indent=0))
        P = skin.posed(fr['pose'], fr['lift'])
        low = np.argsort(P[:, 2])[:200]
        names = [NAMES[b] for b in skin.idx[low, 0]]
        print('setup', name, 'tilt', fr['info']['settleTilt'], 'lift', np.round(fr['lift'], 4).tolist(), 'lowest bones', sorted(set(names)), 'y span',
              round(float(P[:, 1].min()), 3), round(float(P[:, 1].max()), 3), 'height', round(float(P[:, 2].max()), 3), flush=True)


# ---------------------------------------------------------------- bake

# ---------------------------------------------------------------- faint (fix pass 3: a crumple)

# Loses consciousness and crumples where it stands (fix pass 3; the orchestrator's mechanism, real loss of consciousness): tone
# goes from the top down. The head droops first (the neck gives); then the knees buckle and the body drops nearly straight down
# under gravity, the feet staying where they stand (they roll onto their toes); it lands sitting on its folded legs; then the
# trunk, no longer held up, tips forward over the folded legs: the forearms land, then the chest, then the head last; the ears and
# tails fall limp; it ends as a heap on the folded legs (end pose A of the setup check, with the end pose decision's head: on the
# jaw and far cheek, the snout forward in profile). Built from three states of the whole body: STAND (idle frame 0), SIT (on the
# folded legs, the hips where HEAP has them, the trunk slumped a little), HEAP (the end pose): the trunk, head and arms slerp
# STAND to SIT with the drop and SIT to HEAP with the tip; the root turns about the hips; the legs by the rig's two-bone IK to
# ankle targets set by feet that roll on their own soles (foot_roll: no point of the foot that is on the floor moves while it
# is on the floor); the deep knee, hip, tail-root and neck bends on the rig's deep-flexion keys (deepflex_corrective.py); the
# tails by world direction, so they only ever fall; the ears from stalk f18's line to their rest on the body as rigid ear_1
# swings.
#   f0 to 4    the head droops, chin down, the neck giving; the ears onto stalk f18's line (one in-between); no lean back
#   f3 to 15   the knees buckle and the hips drop under gravity (accelerating) to SIT, the feet rolling onto their toes; a small
#              settle to 18
#   f15 to 27  the trunk tips forward over the folded legs, accelerating: the forearms land, then the chest, the head on 27
#              (`down`); a small bounce; still from 31 (the game holds the last frame)
FAINT_FRONT_PX = 16    # fix pass 9: 16 (the slack topple's hanging head reaches 7 cm further forward than pass 8's fold); pass 3 to 8: 8. D: faint's farthest pixel past the 192 cell's front edge plus 4 px, rounded up to 8 (end pose decision)
CRUMPLE = dict(
    frames=36, down=27, still_from=31,
    # SIT: on the folded legs (the hips at HEAP's point, the heels up), the trunk slumped forward a little, the head hanging, the
    # arms hanging limp beside the body
    SIT=dict(pitch=18., body={'spine': [8., 0., 0.], 'chest': [6., 0., 0.], 'neck': [18., 0., 0.], 'head': [12., 0., 0.]},
             arms={'upperarm.L': [-4., -6., 0.], 'upperarm.R': [-4., 6., 0.], 'forearm.L': [-10., 0., 0.], 'forearm.R': [-10., 0., 0.]}),
    # HEAP: the end pose (clipset2/setup3/bake/faintA after the end pose decision; the setup sheet's creases passed): root pitch,
    # the hips' world point, the heels' roll, the knees' pole, every non-leg non-tail bone, the tails' world directions
    HEAP=None,
    heel_pole_sit=(0., -1., -1.),
    droop=[(0, 'linear', 0.), (1, 'linear', .2), (4, 'out', 1.)],
    droop_rot={'neck': [10., 0., 0.], 'head': [8., 0., 0.]},
    drop=[(0, 'linear', 0.), (3, 'linear', 0.), (15, 'in', 1.)],
    # (a settle that rebounds above the sit raised the centroid 2.3 mm at 17: it now only sinks and eases back while the trunk tips)
    settle=[(15, 'linear', 0.), (16, 'out', -.008), (17, 'smooth', -.005), (19, 'smooth', 0.)],
    tip=(15, 26),                           # the trunk and chest down on 26, the head (held up a little) on 27
    arms_lead=2.5,                          # frames the arms run ahead of the trunk's tip (they reach the floor first)
    # (the head swung out on the trunk's arc 16 sprite px past the cell's front at 22, held from 20 by the neck's lift; it now
    # lags the falling trunk, the neck and head tipped back against it (lag), and comes down with the last of the fall, lifted
    # only for the last frames so it lands after the chest; chin toward the chest instead swung it 22 px out)
    head_hold=[(15, 'linear', 0.), (23, 'linear', 0.), (25, 'smooth', 1.), (26, 'linear', 1.), (27, 'in', 0.)],
    curl=[(15, 'linear', 0.), (20, 'smooth', 1.), (24, 'smooth', 1.), (26, 'smooth', 0.)],
    curl_rot={'neck': [-30., 0., 0.], 'head': [-22., 0., 0.]},
    # the head held a little up until the trunk is down, so it lands last: lifted by the neck with its own turn kept (a chin-up turn
    # of the head pushed the far ear, behind the rolled head, 26 mm into the floor at 26)
    head_hold_neck=[-8., 0., 0.],
    ears_line=[(0, 'linear', 0.), (1, 'linear', 0.), (2, 'linear', .55), (3, 'linear', .97)],
    ears_lie=[(17, 'linear', 0.), (28, 'smooth', 1.)],
    tails=[(2, 'linear', 0.), (26, 'in', 1.)],
    tail_clear=(.026, .022, .017, .012, .007), tail_twist_in=.2,    # each tail joint's clearance over the floor (the tail's thickness there, rest skin)
    bounce=[(27, 'linear', 0.), (28, 'out', 1.), (29, 'smooth', -.35), (30, 'smooth', .1), (31, 'smooth', 0.)],
    bounce_rot={'jaw': [3., 0., 0.]}, bounce_lift=.006,
)


CRUMPLE['HEAP'] = dict(
    pitch=120.0, pelvis=[0.0, -0.17, 0.3336], heel=55.0, pole=[0.0, -1.0, -1.0],
    body={'spine': [6.0, 0.0, 0.0], 'chest': [5.0, 0.0, 0.0], 'neck': [-30.0, 0.0, 0.0],
          'head': [-82.14, -9.096, 48.874], 'upperarm.L': [-43.412, -27.488, -12.632],
          'forearm.L': [18.87, -1.269, 2.911], 'hand.L': [-4.361, -2.778, 0.207],
          'upperarm.R': [-43.412, 27.488, 12.632], 'forearm.R': [18.87, 1.269, -2.911],
          'hand.R': [-4.361, 2.778, -0.207], 'ear_1.L': [153.375, 72.368, -156.842], 'ear_2.L': [0.0, -0.0, 0.0],
          'ear_3.L': [0.0, -0.0, 0.0], 'ear_4.L': [0.0, -0.0, 0.0], 'ear_1.R': [32.893, -20.389, -52.938],
          'ear_2.R': [0.0, -0.0, 0.0], 'ear_3.R': [0.0, -0.0, 0.0], 'ear_4.R': [0.0, -0.0, 0.0]},
    tail_dirs={'tail_root': [-0.0, 0.932, -0.3624], 'tail_a1': [0.2873, 0.8457, -0.4497],
               'tail_a2': [0.2425, 0.4555, -0.8566], 'tail_a3': [0.2873, 0.1991, -0.9369],
               'tail_a4': [0.4472, 0.5257, -0.7236], 'tail_a5': [0.5145, 0.8563, -0.0449],
               'tail_b1': [0.0, 0.766, -0.6428], 'tail_b2': [0.0, 0.4226, -0.9063], 'tail_b3': [0.0, 0.5736, -0.8192],
               'tail_b4': [0.0, 0.9703, -0.2419], 'tail_b5': [-0.0, 1.0, -0.0], 'tail_c1': [-0.2873, 0.7548, -0.5897],
               'tail_c2': [-0.2873, 0.1991, -0.9369], 'tail_c3': [-0.4104, 0.0318, -0.9114],
               'tail_c4': [-0.5145, 0.2933, -0.8058], 'tail_c5': [-0.5145, 0.8058, -0.2933]})


def _unit(v):
    v = np.asarray(v, float)
    return v/np.linalg.norm(v)


def _slerp_dir(a, b, t):
    """Unit vectors: the great-circle blend from a to b."""
    a, b = _unit(a), _unit(b)
    om = math.acos(max(-1., min(1., float(a@b))))
    if om < 1e-6:
        return a
    return (math.sin((1-t)*om)*a+math.sin(t*om)*b)/math.sin(om)


SPLAY_MAX = 80.


def _side_out_blend(a, b, t, sd, splay=0.):
    """Fix pass 7: a downward arm direction from a to b with its two angles eased evenly: its lean in the side view (back from
    straight down) and its splay out to its own side (a great-circle blend kept the side view's lean until late and then swung
    it forward 38 degrees in one frame)."""
    sx = 1. if sd == 'L' else -1.

    def ang(v):
        v = _unit(v)
        return math.atan2(v[1], -v[2]), math.asin(max(-1., min(1., sx*v[0])))
    (s0, o0), (s1, o1) = ang(a), ang(b)
    s_, o_ = s0+(s1-s0)*t, o0+(o1-o0)*t
    o_ += splay*(math.radians(SPLAY_MAX)-o_)          # (splay: further out to the side, toward SPLAY_MAX degrees)
    return np.array([sx*math.sin(o_), math.cos(o_)*math.sin(s_), -math.cos(o_)*math.cos(s_)])


def _gravity(u):
    """Half a steady fall, half an accelerating one: it starts at once and gathers speed."""
    u = min(1., max(0., u))
    return .5*u+.5*u*u


_ROLL = {}


def foot_roll(skin, sd, theta, step=.25):
    """The foot rolled heel up by theta degrees on its own sole, as a rigid body turning about X: (rotation, translation (y, z))
    so a rest foot point v goes to Rx(theta) v + (0, ty, tz). Built in small steps, each a turn about the front-most point on the
    floor, the foot then set down on its lowest point: a point of the foot on the floor stays where it is while it is on it (the
    toe pads do not slide back; the setup's turn about a fixed pivot slid them 2.7 mm and pushed the toe tips 5.5 mm into the
    floor)."""
    key = (sd, round(float(theta), 4))
    if key in _ROLL:
        return _ROLL[key]
    dom = skin.idx[:, 0]
    V = skin.rest[dom == NAMES.index(f'foot.{sd}')][:, 1:3]
    z0 = float(V[:, 1].min())
    n = int(math.ceil(abs(theta)/step)) if theta else 0
    d = math.radians(theta/n) if n else 0.
    cR, sR = math.cos(d), math.sin(d)
    R2 = np.array([[cR, -sR], [sR, cR]])
    phi, t = 0., np.zeros(2)
    for _ in range(n):
        c_, s_ = math.cos(phi), math.sin(phi)
        p = V@np.array([[c_, s_], [-s_, c_]])+t
        zmin = p[:, 1].min()
        on = p[:, 1] < zmin+2e-4
        c = p[on][np.argmin(p[on][:, 0])]                 # the front-most point on the floor (the creature faces -y)
        t = R2@(t-c)+c
        phi += d
        c_, s_ = math.cos(phi), math.sin(phi)
        p = V@np.array([[c_, s_], [-s_, c_]])+t
        t[1] += z0-p[:, 1].min()
    out = (rot([math.degrees(phi), 0., 0.]), np.array([0., t[0], t[1]]))
    _ROLL[key] = out
    return out


def _tail_dirs(rig, pose, lift):
    T = rc.bone_transforms(rig.J, pose, bones=B, root_translate=tuple(rc.lift_vec(lift)))
    return {b: _unit(T[b][0]@rc.bone_axis(rig.J, b, B)) for b in ['tail_root']+[f'tail_{t}{k}' for t in rc.TAILS for k in range(1, rc.TAIL_BONES+1)]}


def crumple_legs(rig, skin, body, lift, heel, pole):
    """The legs by IK to ankle targets from the rolled feet, the feet turned to their roll."""
    targets, Rfs = {}, {}
    for sd in 'LR':
        Rf, t = foot_roll(skin, sd, heel)
        targets[sd] = Rf@np.array(rig.J[f'ankle.{sd}'], float)+t
        Rfs[sd] = Rf
    poles = {sd: [pole[0]*(1 if sd == 'L' else -1), pole[1], pole[2]] for sd in 'LR'}
    full = rc.plant_legs(rig.J, body, lift, {sd: targets[sd].tolist() for sd in 'LR'}, poles, bones=B)
    T = rc.bone_transforms(rig.J, full, bones=B, root_translate=tuple(rc.lift_vec(lift)))
    for sd in 'LR':
        full[f'foot.{sd}'] = rc.euler_from_matrix(T[f'shin.{sd}'][0].T@Rfs[sd])
    return full, targets, poles


def crumple_frame(rig, skin, f, cache):
    P = CRUMPLE
    SIT, HEAP = P['SIT'], P['HEAP']
    tr = lambda k: ac.track(P[k], f)
    if 'stand' not in cache:
        i0, l0, _ = cb.idle_pose(rig, 0)
        cache['stand'] = (i0, np.asarray(l0, float))
        cache['tails0'] = _tail_dirs(rig, i0, np.asarray(l0, float))
    ip, ilift, ib = cb.idle_pose(rig, f)
    d = tr('drop')
    t0, t1 = P['tip']
    tp = _gravity((f-t0)/(t1-t0)) if f > t0 else 0.
    tpa = _gravity((f+P['arms_lead']-t0)/(t1-t0)) if f+P['arms_lead'] > t0 else 0.
    body = {k: list(v) for k, v in ip.items() if rc.base_of(k) not in ('thigh', 'shin', 'foot') and not k.startswith('tail') and k != 'root'}
    for b, e in P['droop_rot'].items():
        turn(body, b, e, tr('droop')*(1-d))
    names = sorted(set(body) | set(SIT['body']) | set(SIT['arms']) | set(HEAP['body']))
    out = {}
    for b in names:
        if b.startswith('ear_'):
            continue
        a0 = body.get(b, [0., 0., 0.])
        s_ = SIT['body'].get(b, SIT['arms'].get(b, [0., 0., 0.]))
        h_ = HEAP['body'].get(b, [0., 0., 0.])
        arm = rc.base_of(b) in ('clavicle', 'upperarm', 'forearm', 'hand')
        out[b] = slerp_e(slerp_e(a0, s_, d), h_, tpa if arm else tp)
    for b in body:
        if b.startswith('ear_'):
            out[b] = body[b]
    body = out
    for b, e in P['curl_rot'].items():
        turn(body, b, e, tr('curl'))
    hh = tr('head_hold')
    if hh > 0:
        # the neck lifts the head; the head keeps its world turn exactly (its own turn undoes the neck's)
        Wh = rc.bone_transforms(rig.J, body, bones=B)['head'][0]
        turn(body, 'neck', P['head_hold_neck'], hh)
        Wn = rc.bone_transforms(rig.J, body, bones=B)['neck'][0]
        body['head'] = [float(v) for v in rc.euler_from_matrix(Wn.T@Wh)]
    pitch = slerp_e(slerp_e([0., 0., 0.], [SIT['pitch'], 0., 0.], d), [HEAP['pitch'], 0., 0.], tp)
    body['root'] = pitch
    stand_pelvis = cache['stand'][1]+np.array(rig.J['pelvis'])
    pw = stand_pelvis+(np.asarray(HEAP['pelvis'])-stand_pelvis)*d+np.array([0., 0., tr('settle')])
    lift = pw-rot(body['root'])@np.array(rig.J['pelvis'])
    # the ears: onto stalk f18's line as the head droops, then from that line (relative to the head) to their rest on the body
    el = tr('ears_lie')
    if tr('ears_line') > 0:
        # (the line uncapped pressed the ears 4 mm into the skull at 14 to 18 as the head hung chin down; capped as the other clips)
        ear_line_capped(rig, body, tr('ears_line'), 1., inside=20.)
    ear_from = {b: list(body.get(b, [0., 0., 0.])) for b in HEAP['body'] if b.startswith('ear_')}
    if el > 0:
        for b in ear_from:
            body[b] = slerp_e(ear_from[b], HEAP['body'][b], el)
    # the tails: each bone's world direction from the idle's to the heap's on a great circle (they only ever fall); a tail that
    # would reach through the floor before the body is down (the root still high and pitched back) lies on it instead: down each
    # chain, a joint that would go under its own thickness above the floor has the bone into it turned up to horizontal enough to
    # rest there, keeping its heading (cutting the whole tail's share back, the tails crowded to 26 mm apart)
    tt = tr('tails')
    for b in cache['tails0']:
        body.pop(b, None)
    if 'ear_parts' not in cache:
        cache['ear_parts'] = {sd: skin.part([f'ear_{i}.{sd}' for i in range(1, 5)]) for sd in 'LR'}
    tdir = {b: _slerp_dir(cache['tails0'][b], HEAP['tail_dirs'][b], tt) for b in cache['tails0']}
    lift_est = pw-rot(body['root'])@np.array(rig.J['pelvis'])
    T = rc.bone_transforms(rig.J, rc.pose_from_directions(rig.J, {'tail_root': tdir['tail_root']}, base=body, bones=B), bones=B,
                           root_translate=tuple(rc.lift_vec(lift_est)))
    bone_of = {x[0]: x for x in B}
    tail_lift = {}
    for tn in rc.TAILS:
        _, _, h0, _ = bone_of[f'tail_{tn}1']
        pj = T['tail_root'][0]@np.array(rig.J[h0])+T['tail_root'][1]
        for k in range(1, rc.TAIL_BONES+1):
            b = f'tail_{tn}{k}'
            _, _, h, tl_ = bone_of[b]
            L = float(np.linalg.norm(np.array(rig.J[tl_])-np.array(rig.J[h])))
            dv = tdir[b]
            r_ = P['tail_clear'][k-1]
            if pj[2]+L*dv[2] < r_:
                dz = max(-1., min(1., (r_-pj[2])/L))
                hz = np.array([dv[0], dv[1], 0.])
                hz = hz/np.linalg.norm(hz) if np.linalg.norm(hz) > 1e-9 else np.array([0., 1., 0.])
                nd = np.array([hz[0]*math.sqrt(1-dz*dz), hz[1]*math.sqrt(1-dz*dz), dz])
                tail_lift[b] = round(math.degrees(math.acos(max(-1., min(1., float(nd@dv))))), 1)
                tdir[b] = nd
                dv = nd
            pj = pj+L*dv
    body = {k: [float(x) for x in v] for k, v in rc.pose_from_directions(rig.J, tdir, base=body, bones=B).items()}
    # (set by direction a tail loses the idle's own twist about its length, 2.5 to 4 degrees: so it eases in from the idle's
    # tail pose over the first fifth of the fall, and frame 0 is idle frame 0 exactly)
    wt = min(1., tt/P['tail_twist_in'])
    for b in tdir:
        body[b] = slerp_e(ip.get(b, [0., 0., 0.]), body[b], wt)
    bo = tr('bounce')
    for b, e in P['bounce_rot'].items():
        turn(body, b, e, bo)
    lift = lift+np.array([0., 0., P['bounce_lift']*max(0., bo)])
    # an ear that would reach through the floor before the head is down stops short on it (its lie share cut back)
    ear_cut = {}
    if el > 0:
        for sd in 'LR':
            bs = [b for b in ear_from if b.endswith('.'+sd)]

            def ear_low(s_):
                for b in bs:
                    body[b] = slerp_e(ear_from[b], HEAP['body'][b], s_)
                return float(cache['ear_parts'][sd].posed(body, lift)[:, 2].min())
            if ear_low(el) < 0:
                # the nearest share to the track's that keeps the ear on the floor (the line's ear can reach through the floor
                # as well as the rest's, so both ways are tried)
                cands = sorted(set(round(x, 3) for x in np.linspace(0., 1., 21)), key=lambda s_: abs(s_-el))
                best = min(cands, key=lambda s_: (ear_low(s_) < 0, abs(s_-el)))
                ear_low(best)
                ear_cut[sd] = round(el-best, 3)
    heel = HEAP['heel']*d
    pole = _unit(np.array([0., -1., 0.])*(1-d)+np.asarray(P['heel_pole_sit'], float)*d)
    pole = _unit(pole*(1-tp)+np.asarray(HEAP['pole'], float)*tp)
    full, targets, poles = crumple_legs(rig, skin, body, lift, heel, pole)
    # nothing under the floor: the whole body raised over the rolled feet (the IK keeps them down)
    raised = 0.
    Pz = skin.posed(full, lift)
    low = float(Pz[:, 2].min())
    raised_by = None
    if low < -2e-4:
        raised = -low
        raised_by = NAMES[int(skin.idx[int(np.argmin(Pz[:, 2])), 0])]
        lift = lift+np.array([0., 0., raised])
        full, targets, poles = crumple_legs(rig, skin, body, lift, heel, pole)
    info = dict(drop=round(d, 4), tip=round(tp, 4), tipArms=round(tpa, 4), heel=round(heel, 2), earsLine=round(tr('ears_line'), 3),
                earsLie=round(el, 3), tails=round(tt, 3), bounce=round(bo, 4), raised_mm=round(raised*1000, 2), raised_by=raised_by, tailLift=tail_lift, earCut=ear_cut, planted=dict(L=True, R=True),
                targets={sd: [round(float(x), 6) for x in targets[sd]] for sd in 'LR'})
    breath = ib*(1-d)
    return frame_dict(f, full, lift, breath, info, belly=breath)


def crumple_frames(rig, skin):
    cache = {}
    return [crumple_frame(rig, skin, f, cache) for f in range(CRUMPLE['frames'])]


# ---------------------------------------------------------------- faint, fix pass 4 and 5

# Faint fix pass 4 (critic pass 4 on faint, then the orchestrator's look at the setup4 sheet): the body kneels down onto the
# floor instead of floating on its toe tips. Two poses posed on the bare rig at the setup check (clipset2/setup4): K, the knee
# landing at frame 16 (the knees just down, the toes curled under on the toe keys, the hips over the knees, the trunk slumped a
# little, the arms limp), and E, the end pose from frame 27 (`down`) (the knees and shins on the floor, the hips back over the
# heels, the spine rounded, the chest, near forearm and paw, jaw and tail tips on the floor). The legs reach both by the rig's
# IK to the rolled feet (each foot rolled heel up on its sole, then turned about its toe joint while the toe keys curl the toes
# back by the same angle, so it kneels on the balls of its feet).
# Fix pass 5 (blind critic pass 5 on faint): the head stays in profile (no roll; pitched only, chin toward the chest through
# the fall, lying on its jaw and chin with the snout forward at rest: E's 38 degree roll onto the far cheek is gone); the ears
# keep the approved ear's own shape and are swung only in the picture's plane: they hold still in the world for the first
# frames while the head drops (they lag it), then angle up and back off the skull at a set angle above the skull's back line
# (the side view's line from the head's highest skin point to its rearmost); the heels stay down until the knees have broken;
# the trunk tips from the knee landing on with no pause, the spine rounding as the chest drops; the arms hang in the world and
# trail the body until the chest is falling, then swing forward to the floor; the tails land late (they slid while the hips
# went back) with a slight upward curl at the tips; the head's reach stays 15 px inside the widened frame.
# Fix pass 5, the clip (the orchestrator's look at the setup5 sheet: at 22 to 26 it read as crouching to pounce, the head raised and
# looking forward, the near forearm stepping out): the head keeps dropping snout down from 20 (its pitch never falls while it is
# in the air; the snout-up turn that kept it inside the frame is gone) and lands before the chest, the neck tucking and the
# trunk curling deeper so the hanging head fits the frame; the elbows give (the upper arms trailing back along the flanks, the
# forearms hanging under the chest), so the paws land under the chest, and the near arm rests folded under it like the far arm.
# Fix pass 6 (blind critic 6 on faint): the fold falls without easing from 18 to the head's touchdown (the frames retimed on a
# warp of the clip's clock, `time`, so the head's front falls further every frame); the knees pinned where they land at 16
# (the pelvis height solved so each knee stays put, its skin on the floor); the head stays chin down into the landing and turns
# onto its jaw only as the floor takes it (no turn in the air); the elbows bend from 20 so the forearms fall flat and trail the
# chest, and at rest the near forearm lies back and out along the floor so the side of the paw shows (it pointed at the camera);
# the ears sag from 11 as a rigid swing that trails the head and reaches its rest by the landing (it stood pricked to 27 and
# flipped 80 degrees after `down`); the rest ear is one of three options (EAR_REST; Nick picked A, 2026-11-11: "option A for
# the ears"), A by default; the paws and fore
# claws are kept out of the floor; the hind claws follow the toe keys in the renders (clip_frames.py) and retract by a per-frame
# `claws` turn while the foot rolls onto its toe pads, so they leave the floor; the heels rise 40 degrees, not 70, so the toes lie
# flat; the hip and tail deep keys were re-sculpted on this clip's own in-between frames and belly keys added
# (deepflex_corrective.py --mid-sculpt, the belly group): the pit at the hip, the spike at the tail root and the belly pleats.
FAINT4 = dict(
    frames=36, down=27, knees=16, still_from=31,
    # fix pass 6: the clip's clock (frame -> time on the tracks, knots between which it is linear; identity outside), so the head's
    # front falls further every frame from 18 to its touchdown at 25 (it fell 40, 44, 33, 26, 23, 28 and 36 px: the fold eased
    # and floated; this clock, fitted on the bake, gives 24, 29, 30, 31, 32, 35, 38 and 40 px a frame over 17 to 25)
    time=[(18, 18.), (19, 18.715), (20, 19.297), (21, 20.092), (22, 21.0964), (23, 22.5458), (24, 23.922), (25, 25.)],
    # fix pass 6: the knees stay where they are at the landing (16) to the end: each frame the pelvis height is solved so the IK
    # puts each knee joint at its frame-16 place along the body (y), its height following its depth (x, a few cm) on the shin's
    # reach from the planted ankle, with the lowest knee skin knee_skin_mm over the floor
    knee_skin_mm=.3,
    K=dict(pitch=12., pelvis=[0., -.25, .2625], heel=70., pole=[0., -1., -1.],
           body={'spine': [5., 0., 0.], 'chest': [5., 0., 0.], 'neck': [18., 0., 0.],
                 'upperarm.L': [-4., -6., 0.], 'upperarm.R': [-4., 6., 0.], 'forearm.L': [-10., 0., 0.], 'forearm.R': [-10., 0., 0.]}),
    # E's head: pitched 10 degrees snout down in profile, the neck bent 45 so the jaw and chin rest on the floor (pitched 20 its
    # front reached y -0.787, past the 15 px margin; 0 left the head 4 mm off the floor at the neck's limit)
    # fix pass 5 clip: the near arm rests folded under the chest like the far arm (its mirror), not reached out ahead of the face
    # fix pass 6: the heels 40 degrees up, as far as the toe keys curl the toes (40), so the toes lie flat on the floor and their
    # claws stay out of it (at 70 the toes and claws were pushed 10 to 19 mm into it); the shins lie lower. With the knees pinned
    # the pelvis sits about 40 mm higher than fix pass 5's E, so the trunk pitches 5 degrees further forward to put the chest down
    E=dict(pitch=94.3, pelvis=[0., -.117, .19336], heel=40., pole=[.3, -1., -.6], head_pitch=10.,
           body={'spine': [15.873, 0., 0.], 'chest': [15.873, 0., 0.], 'neck': [45., 0., 0.],
                 'upperarm.L': [132.1604, -76.8013, -135.3943], 'forearm.L': [1.0574, 26.42, -6.7151], 'hand.L': [12.8953, 14.8194, .0995],
                 'upperarm.R': [132.1604, 76.8013, 135.3943], 'forearm.R': [1.0574, -26.42, 6.7151], 'hand.R': [12.8953, -14.8194, -.0995]}),
    # the tails' world directions at E (they drape to the floor, the last bone of each curling up a little) and each joint's
    # clearance over it
    # (fix pass 6: tail a turned further out, its second bone lay on the near thigh at the new rest)
    tails_E={'tail_root': [0, .55, -.83], 'tail_a1': [.35, .5, -.79], 'tail_a2': [.36, .45, -.82], 'tail_a3': [.2873, .1991, -.9369],
             'tail_a4': [.4472, .5257, -.7236], 'tail_a5': [.45, .84, .3], 'tail_b1': [0, .5, -.87], 'tail_b2': [0., .4226, -.9063],
             'tail_b3': [0., .5736, -.8192], 'tail_b4': [0., .9703, -.2419], 'tail_b5': [0, .96, .22], 'tail_c1': [-.25, .5, -.83],
             'tail_c2': [-.2873, .1991, -.9369], 'tail_c3': [-.4104, .0318, -.9114], 'tail_c4': [-.5145, .2933, -.8058],
             'tail_c5': [-.47, .84, .26]},
    # (fix pass 6: tail b's third bone went 2 mm into the floor at .022, .017; fix pass 7: per tail, the fourth joint lower so
    # each tail's end lies on the floor (with .014 the fourth and fifth bones' lowest skin stood 4.6 to 7.3 mm over it at rest))
    tail_clear={'a': (.026, .025, .021, .0087, .006), 'b': (.026, .025, .021, .0090, .006), 'c': (.026, .025, .021, .0096, .006)},
    # fix pass 8 (the plumes sank through the floor in fur, 37 px at 720 from f25 on: the skin lay on the floor, the plume fur
    # did not): each tail rests on its fur. tail_fur_profile is the fur envelope of the surface fur-steps/s12-29c-legs3b per tail
    # bone (tail_fur_profile.py: per 10 mm along the bone, the fur's and the skin's largest distance from the bone's line; the
    # plume fur reaches 92 to 126 mm from the line on bones 2 to 4, the skin 9 to 27 mm), and drape_tail_dirs raises any bone
    # from tail_fur_from to the tip whose envelope, its fur's reach past the skin compressed by tail_fur_comp, would go under the
    # floor, keeping its heading. The envelope is the fur's largest reach all round the bone, so the fur under it reaches the
    # floor short of that: at rest the deepest tail fur is 22 to 28 mm under the floor uncompressed (.25 left it 18 to 23).
    # The fur render presses that share onto the floor (clip_frames.py --tail-floor-squash). The fork bones (1) are left to
    # the skin clearances: lifted on their fur they drew tails b and c to 53 mm apart at rest and 42 at 29 (pass 7: 57, 49).
    # The skin clearances (tail_clear, pass 7's) still hold under it all
    tail_fur_profile=HERE.parents[2]/'untracked/species-construction/akinza/anim/clipset2/bake-f8/tail-fur-profile.json',
    tail_fur_comp=.3, tail_fur_from=2,
    # fix pass 8: lifted onto their fur, tails a and c passed through the kneeling feet at rest (tail a's third bone 12 mm into
    # the near foot, tail c's fourth 18 mm into the far foot; at pass 7 tail a was 7 mm into the near foot): their bones 2 to 5
    # turn this many degrees back about the vertical at E (a toward the back from its splay to the camera side, c from its
    # splay away), so they pass behind the feet (tail c 36 mm clear of the far foot at rest; turning the second bones out
    # instead put tail c 14 mm into the far foot)
    tail_back_turn=15.,
    # toe keys (toe_corrective.py): the toes curl back 40 degrees as the shin swings from 95 to 112; the foot turns the same angle
    # about its toe joint so the toes stay where they stand
    toe_curl=(95., 112., 40.),
    # tracks (frame, ease into the key, value)
    fall=[(0, 'linear', 0.), (2, 'linear', .02), (16, 'in', 1.)],              # idle -> K: the knees buckle, the body drops onto them
    heel=[(5, 'linear', 0.), (16, 'out', 1.)],                                   # the heels stay down until the knees have broken
    tip=[(14, 'linear', 0.), (17, 'in', .08), (27, 'in', 1.)],                   # K -> E: the trunk tips forward (root pitch)
    # the hips slide back over the heels from the landing (later, the trunk carried the head 16 px past the frame's margin)
    slide=[(13, 'linear', 0.), (21, 'smooth', 1.)],
    round=[(14, 'linear', 0.), (24, 'smooth', 1.)],                              # the spine and chest round as the chest goes down
    # fix pass 5 clip: the curl deeper (the chest 26) and held to 25, so the chest front comes down and back and the hanging head
    # fits the frame without turning its snout up
    curl=[(16, 'linear', 0.), (22, 'smooth', 1.), (25, 'linear', 1.), (27, 'smooth', 0.)], curl_rot={'spine': [12., 0., 0.], 'chest': [26., 0., 0.]},
    spine_lead=1.5,                                                               # the spine bends ahead of the chest
    # the head's world pitch (degrees snout down, no roll): the chin drops from frame 1 and keeps hanging; it turns to E's only as
    # the floor takes it (never back up while it is in the air), and its front stays behind head_reach (y, m: 15 px inside the
    # widened 750 px frame). Fix pass 5 clip: it keeps dropping snout down from 20 until the floor takes it (25), the neck tucking
    # (up to 68 degrees, 25 a frame) to keep it in the frame
    head_pitch=[(0, 'linear', 0.), (1, 'linear', 3.), (4, 'out', 20.), (16, 'smooth', 45.), (21, 'smooth', 50.), (24, 'smooth', 55.),
                (26, 'smooth', 62.)],
    head_idle=[(0, 'linear', 0.), (1, 'linear', .5), (3, 'smooth', 1.)],        # idle's own head turn eases out
    # fix pass 6: no turn toward E's before the floor takes the head (critic 6: it rolled from chin tucked to level at 24 to 27
    # and landed looking alert). It stays chin down to the touchdown (25); the turn onto its jaw is then driven by the floor as
    # the chest comes down, which finishes it by 27 (54, 35, 10 degrees at 25 to 27), ahead of this track's 29. (Letting the
    # neck give first instead lifted the head 20 mm off the floor at 25 and 26.)
    head_land=[(25, 'linear', 0.), (29, 'smooth', 1.)], head_reach=-.772,
    neck_tuck_cap=[(0, 'linear', 50.), (19, 'linear', 50.), (21, 'smooth', 68.), (25, 'linear', 68.), (27, 'smooth', 0.)], neck_tuck_rate=40.,
    # ears: the approved ear (idle's own, unturned) held at its idle angle in the world while the head drops (they lag it), then
    # swung in the picture's plane to ear_above degrees above the skull's back line (the head's long axis pointing back, level
    # at idle) as it was ear_delay frames before, so they trail the head; at rest ear_above_rest. (Set by world direction and
    # splayed 45 to 70 the ear lay over the crown as a cap or a horizontal blade; held to the skull's crown-to-occiput line it
    # pointed down the back of the head.)
    # fix pass 6: the ears stay as they stand in the world while the head drops (they lag it), then droop back from 11 (ear_sag)
    # and drop, splay and turn about their length to their rest (ear_turn, from 20), reached at the head's touchdown (25) and held
    # still in the world while the head turns onto its jaw. The rest is one of EAR_REST's options
    # fix pass 7 (critic 7: the ear stood locked upright to 21, then swung about 90 degrees to flat over 22 to 25, a flop): one
    # eased sag from 8 trailing the head, its elevation and its turn about its length on their own tracks, at the rest by the
    # head's touchdown (25); and its twist against the head (about its own length, the swing-twist split of ear_1's turn)
    # past the rest's own twist kept to ear_twist_keep of what holding it still in the world gives: that alone twisted it 57
    # to 77 degrees against the head at 23 to 25 while the head was still pitched 52 to 54 (the rest: 39), which sheared the ear
    # root's blend into a flat pale plate. (Clamping the twist at 45 instead turned the ear 19 degrees in the world at 26, as
    # the head turned up under it.)
    ear_sag=[(8, 'linear', 0.), (25, 'in', 1.)], ear_turn=[(14, 'linear', 0.), (25, 'in', 1.)], ear_twist_keep=.3,
    ear_rest='A', far_down=8.,
    neck=[(14, 'linear', 0.), (22, 'smooth', 1.)],                               # the neck bends (chin in) as the chest starts down
    # arms: idle -> K's limp hang (fall), hanging down in the world from the landing (trailing the body as it tips), to E's on
    # the floor once the chest is falling
    arm_hang=[(16, 'linear', 0.), (19, 'smooth', 1.)], arm_hang_dir=[.3, .2, -1.],
    # fix pass 5 clip: the paws hang outside the kneeling thighs (straight down they passed into them at 18 to 20), then the elbows give
    # from 19 (the upper arm trailing back along the flank, the forearm hanging under the chest; the near arm's directions, the
    # far arm's mirrored), so the paws come down under the chest instead of stepping out in front
    # fix pass 6 (critic 6: at 22 to 24 the arm went straight and planted the paw at 23 before the chest arrived, bracing): from 20
    # the elbows bend, the upper arm down and a little out, the forearm and paw swinging back and out toward flat so they trail
    # the chest; then to their rest by world direction as the chest comes down (the paw put on the floor only when it would reach it)
    arm_fold=[(19, 'linear', 0.), (22, 'smooth', 1.)],
    # fix pass 7 (critic 7: at 22 to 24 an S-shaped kink, the forearm doubling back against the thigh; the forearm set by world
    # direction trailing back bent the elbow backward, +33 to +61 degrees about X where the guard flexes it -73): one hanging
    # bend, the upper arm by world direction a little back of straight down, the elbow by its own turn (flexing the way it
    # bends), the wrist straight
    arm_fold_dirs={'upperarm': [.3, .55, -.78]}, arm_fold_turns={'forearm': [-10., 0., 0.], 'hand': [0., 0., 0.]},
    # then from 18 the upper arm eases evenly (its lean in the side view and its splay out) to its rest direction and the elbow
    # and wrist to their rest turns; a paw that would reach the floor first splays the arm out to the side (seen end-on), and
    # only past that swings it on ahead of the track
    arms=[(18, 'linear', 0.), (25, 'linear', 1.)],
    # fix pass 7 (critic 7: at 25 the upper arm stood upright under the shoulder for a frame, an elbow prop): before `down`
    # the upper arm's drop toward the floor is held to this track (it was solved to put the paw on the floor, 0.77 at 25, the
    # upper arm 21 degrees from vertical in the side view), so the elbow folds forward under the chest as it comes down
    arm_drop_cap=[(19, 'linear', .9), (23, 'smooth', .72), (25, 'linear', .64), (26, 'linear', .52), (27, 'linear', .32)],
    # fix pass 7 (critic 7: the shoulder mass jammed into the jaw at 23 and 24): the shoulders drawn back and down from 21 and
    # let go again by the rest (27), so the rest pose is unchanged; near side's turn, the far side's mirrored
    clav=[(20, 'linear', 0.), (23, 'smooth', 1.), (25, 'linear', 1.), (27, 'smooth', 0.)], clav_rot=[0., 0., -12.],
    # fix pass 6: the arms at rest by world direction (near side; the far arm mirrored): the upper arm out and a little forward
    # along the floor from the shoulder, the forearm back and out flat on the floor, the paw on back along it, palm down, so the
    # camera sees the forearm at an angle and the side of the paw (pointing out at the camera it read as a cut stump)
    arm_dirs_E={'upperarm': [.85, -.45, -.27], 'forearm': [.8, .6, -.05], 'hand': [.3, .95, -.1]}, arm_rest_mm=.5,
    # fix pass 7: the elbow and wrist turns those directions give at rest (frame 27, near side), the target their turns ease
    # toward on the way down
    arm_rest_turns={'forearm': [-23.0, 32.8, -19.7], 'hand': [-36.5, 11.0, -10.1]},
    tails=[(4, 'linear', 0.), (16, 'smooth', .4), (25, 'in', 1.)],
    # the tails held up off the floor while the hips slide back (their tips slid 38 px along it), set down as the hips settle
    tail_lift=[(12, 'linear', 0.), (17, 'smooth', 1.), (23, 'linear', 1.), (27, 'smooth', 0.)], tail_lift_deg=15.,
    tail_twist_in=.15,
    settle=[(16, 'linear', 0.), (17, 'out', 1.), (19, 'smooth', 0.)], settle_rot={'spine': [2.5, 0., 0.], 'chest': [2., 0., 0.]},
    # the bounce: the shoulders, neck and head lift off the floor a little at 28 and drop back; the tails a frame behind (the
    # ears trail it through their delay)
    bounce=[(27, 'linear', 0.), (28, 'out', 1.), (29, 'smooth', .25), (30, 'smooth', -.08), (31, 'smooth', 0.)],
    bounce_rot={'chest': [-3., 0., 0.], 'neck': [-3., 0., 0.]},
    bounce_late=[(28, 'linear', 0.), (29, 'out', 1.), (30, 'smooth', .2), (31, 'smooth', 0.)],
    bounce_tail=[-6., 0., 0.],
)


def _power_keys(f0, f1, p=2., v0=0., v1=1.):
    """Dense linear track keys for v0 + (v1 - v0) * u**p, u = (f - f0) / (f1 - f0), one key a frame (p 2: a fall from rest under
    a steady pull, distance growing with the square of time)."""
    return [(f, 'linear', v0+(v1-v0)*((f-f0)/(f1-f0))**p) for f in range(f0, f1+1)]


def _topple_keys(f0, f1, th0, th1, length, sub=200):
    """Fix pass 9: dense linear keys (one a frame) for a trunk toppling as one slack mass from th0 to th1 degrees forward of
    vertical between frames f0 and f1: a uniform rod pivoting about its foot under gravity (theta'' = 3 g / (2 length) sin theta),
    its starting speed solved so it reaches th1 at f1. Values are the share (theta - th0) / (th1 - th0): it gathers speed all the
    way to the contact."""
    k = 3*9.81/(2*length)/900.                     # per frame squared
    n = f1-f0

    def run(w0):
        th, w, out = math.radians(th0), w0, [0.]
        for _ in range(n):
            for _ in range(sub):
                w += k*math.sin(th)/sub
                th += w/sub
            out.append(th)
        return out
    lo, hi = 0., .5
    for _ in range(50):
        mid = .5*(lo+hi)
        if run(mid)[-1] > math.radians(th1):
            hi = mid
        else:
            lo = mid
    th = run(.5*(lo+hi))
    th[0] = math.radians(th0)
    return [(f0+i, 'linear', min(1., (x-math.radians(th0))/math.radians(th1-th0))) for i, x in enumerate(th)]


# Fix pass 9 (Nick on F46b and F48, 2026-11-11: "the body sort of collapses like a wet noodle rather than an unconscious body"):
# dead weight. Reference: Stanley Ketchel knocked out on his feet (1909 fight film, ref/clipset-b2/faint2): the knees buckle
# straight down under him with the feet where they stood, the trunk stays in one piece and tips as the hips land, the chin is
# on the chest from the first frames and the head hangs behind the trunk, hitting the floor last (2 frames after the
# shoulders); the arms hang and trail. So: a short slack beat (0 to 3: the chin drops, the neck goes slack, the arms hang
# straight down, the ears and tails begin to droop, a few mm of sink), then the hips fall straight down onto the heels under
# gravity (0.9 g, distance with the square of time, no ease-out) and the knees hit the floor at 11 with a jolt (the trunk
# compresses for a frame, the head, arms and tails keep going and snap back); the trunk, started tipping during the drop,
# topples forward over the knees as one mass under gravity (a rod about its foot, gathering speed to the contact; spine and
# chest share the root's tip, no progressive curl) and the chest and forearms hit at 18, the head a frame later; the head,
# shoulders and tails bounce once (the tails out of step), and it is still from 25. The rest pose (25 on) is pass 8's: the
# knees land where they landed in pass 8 (knee_pin), every track reaches its pass 8 end value, and the checks prove the skin
# within a fraction of a mm of pass 8's frame 31.
FAINT4.update(
    knees=12, land=19, arm_land=21, still_from=26, time=[],
    # the hips fall straight down onto the heels: K's pelvis over E's (pass 8 carried it 25 cm forward over the knees on the way
    # down and slid it back after); z where the knee skin meets the floor as the fall ends
    K=dict(FAINT4['K'], pelvis=[0., -.126, .236]),
    # the knees land where pass 8's did, from the landing frame, so the rest pose is pass 8's (its knee joint at its landing)
    knee_pin=[.2005, -.2998, .0324],
    # the head's front kept 15 px inside the frame widened forward by FAINT_FRONT_PX = 16 (pass 8: -.772 with 8): a slack trunk
    # toppling in one piece about its knees carries the hanging head 7 cm further forward than the pass 8 fold did, and
    # holding it inside the old frame meant tucking the neck past pass 8's largest bend and then turning the head up
    head_reach=-.842,
    # the slack beat (0 to 3: a few mm of sink as the knees unlock), then the hips fall under a steady pull (distance with the
    # square of time, about 0.8 g) onto the heels, the knees hitting the floor at 12
    fall=[(0, 'linear', 0.), (1, 'linear', .006), (2, 'linear', .014), (3, 'linear', .022)]+_power_keys(3, 12, 2., .022, 1.)[1:],
    heel=[(3, 'linear', 0.), (12, 'out', 1.)],
    # the topple: tip, round and slide share one track, solved at the bake (solve_topple) so the trunk's pitch follows a slack
    # trunk falling about its foot under gravity (a rod of `length` m) from 7 at the speed the drop gives it, thrown forward as
    # the knees hit (kick), to the chest's contact at land (19)
    topple=dict(f0=7, f1=19, length=.55, kick=12), spine_lead=0.,
    tip=_topple_keys(7, 19, 4., 112.5, .55), slide=_topple_keys(7, 19, 4., 112.5, .55), round=_topple_keys(7, 19, 4., 112.5, .55),
    curl=[(0, 'linear', 0.)],
    # the knee jolt: the waist gives for a frame as the knees hit (the topple solve keeps the trunk line gathering speed)
    settle=[(12, 'linear', 0.), (13, 'out', 1.), (15, 'smooth', 0.)], settle_rot={'spine': [5., 0., 0.]},
    # the slack neck (degrees of extra bend): the head hangs from the slack beat, swings on at the knee jolt, and gives the
    # bend back to the rest's as the head reaches the floor
    neck_hang=[(0, 'linear', 0.), (1, 'linear', 6.), (3, 'out', 22.), (12, 'linear', 24.), (13, 'out', 32.), (15, 'smooth', 26.),
               (17, 'smooth', 14.), (19, 'smooth', -6.), (21, 'smooth', 0.)],
    neck=[(0, 'linear', 0.), (1, 'linear', .15), (3, 'out', .6), (12, 'smooth', .7), (19, 'smooth', 1.)],
    # the head's world pitch: the chin falls in the slack beat, hangs through the drop, snaps on at the knee jolt, and hangs
    # further as the trunk tips; in the last two frames it lags the trunk's fastest turn (its chin comes forward toward the
    # floor, so the floor's turn onto the jaw at the contact (19) is not a single 70 degree flip); it never rises
    head_pitch=[(0, 'linear', 0.), (1, 'linear', 8.), (3, 'out', 32.), (12, 'smooth', 40.), (13, 'out', 54.), (15, 'smooth', 62.),
                (17, 'smooth', 64.), (18, 'smooth', 56.), (19, 'smooth', 50.)],
    head_idle=[(0, 'linear', 0.), (1, 'linear', .5), (2, 'smooth', 1.)],
    head_land=[(20, 'linear', 0.), (23, 'smooth', 1.)],
    neck_tuck_cap=[(0, 'linear', 50.), (14, 'linear', 50.), (16, 'smooth', 68.), (20, 'linear', 68.), (22, 'smooth', 0.)],
    ear_sag=[(2, 'linear', 0.), (20, 'in', 1.)], ear_turn=[(7, 'linear', 0.), (20, 'in', 1.)],
    # the arms go slack in the slack beat and swing down to hang under the shoulders (a free swing of the arm, about a quarter
    # of its pendulum period, 6 frames); as the trunk topples they trail back from the shoulder
    # and the elbows give (arm_fold: the upper arm back along the flank, the elbow bent), so they are carried down under the
    # chest; after the chest lands they flop out to their rest (arm_land)
    arm_hang=[(0, 'linear', 0.), (1, 'linear', .12), (6, 'smooth', 1.)], arm_hang_dir=[.3, .25, -1.],
    # (the elbow nearly straight: bent, the forearm hung plumb under a trailing upper arm and planted its paw like a prop)
    arm_fold=[(13, 'linear', 0.), (17, 'smooth', 1.)], arm_fold_dirs={'upperarm': [.5, .6, -.62]},
    arm_fold_turns={'forearm': [-5., 0., 0.], 'hand': [0., 0., 0.]},
    # where a paw meets the floor the arm is pushed back and out by the body (the upper arm toward `dir`, the elbow folding
    # `elbow` degrees more)
    arm_buckle=dict(dir=[.65, .72, -.2], elbow=-5.),
    arms=[(19, 'linear', 0.), (21, 'linear', 1.)],
    arm_drop_cap=[(19, 'linear', .9), (20, 'smooth', .6), (21, 'linear', .32)],
    clav=[(16, 'linear', 0.), (18, 'smooth', 1.), (20, 'linear', 1.), (22, 'smooth', 0.)],
    tails=[(1, 'linear', 0.), (12, 'in', .55), (19, 'in', 1.)],
    # the tails lifted a little as the hips land (they pressed tails a and b together, 0.2 mm apart, at 12 and 13)
    tail_lift=[(9, 'linear', 0.), (12, 'smooth', 1.), (15, 'linear', 1.), (19, 'smooth', 0.)],
    # the knee jolt in the arms and tails (they keep going for a frame): the hanging arms swing on forward, the tails drop
    # (the tails' drop, jolt_tail, is 0: dropped onto the landing floor they pressed tails a and b together)
    jolt=[(12, 'linear', 0.), (13, 'out', 1.), (14, 'smooth', -.3), (15, 'smooth', 0.)], jolt_arm=10., jolt_tail=0.,
    # the bounce off the floor (the head and shoulders, the ears through their own lag), the tails one at a time behind it
    bounce=[(19, 'linear', 0.), (20, 'out', 1.), (21, 'smooth', .25), (22, 'smooth', -.08), (23, 'smooth', 0.)],
    bounce_late=[(20, 'linear', 0.), (21, 'out', 1.), (22, 'smooth', .2), (23, 'smooth', 0.)],
    tail_bounce={'a': 0, 'b': 1, 'c': 2}, tail_bounce_deg=7.,
)


# Fix pass 10 (blind critic f9; the orchestrator agrees the dead-weight drop is right): keep the gravity drop, the knee hit at
# 12, the one-piece topple, the rest pose from 26, the start seam, `down` at 27 and the 16 px cell. Change: (1) the trunk is
# already tipping during the drop (pushed at 3 so it reaches th_kick at the knee hit) and carries its turn through the knee
# hit, so it never hangs upright on its knees; (2) the neck by its world pitch: little bend in the slack beat (the chin drop is
# the head's own, no S-pinch under the jaw), folding down from the knee hit so the head hangs below the shoulders by 15, and
# the head turning toward its rest during the fall (60 degrees snout down at most, 24 at the contact) so the landing needs no
# big turn; (3) the chest squashes 3 px into its own contact frame (19) and the chest and head rebound 4 to 6 px over 20 and
# 21; (4) the arms never brace: they hang, then trail back and out along the flanks from the knee hit (arm_fold), and until
# the chest lands no part of an arm goes lower than half the chest's own height (arm_over_chest_share: the upper arm swings
# further back and out, arm_guard_back), so no paw reaches the floor first; after the landing they flop out to their rest
# by each bone's world direction over 19 to 23 (flop_dirs), on the floor, not through it; (5) the ear is idle's
# own ear swung only in the picture's plane, upright while the head hangs and trailing back to rest A over 17 to 21; (6) the
# tails' drop spread over 11 to 13 and their sag carried through the topple; no late tip flick.
FAINT4.update(
    topple=dict(f0=3, f1=19, length=.55, kick=12, th_kick=32.),
    neck_world=[(0, 'linear', 0.), (1, 'linear', 6.), (3, 'out', 16.), (12, 'smooth', 36.), (13, 'out', 90.), (14, 'smooth', 135.),
                (15, 'smooth', 162.), (16, 'smooth', 168.), (17, 'smooth', 170.)],
    neck_world_w=[(0, 'linear', 0.), (1, 'linear', 1.), (19, 'linear', 1.), (21, 'smooth', 0.)],
    head_pitch=[(0, 'linear', 0.), (1, 'linear', 8.), (3, 'out', 30.), (12, 'smooth', 42.), (13, 'out', 50.), (14, 'smooth', 56.),
                (15, 'smooth', 58.), (16, 'smooth', 52.), (17, 'smooth', 42.), (18, 'smooth', 26.), (19, 'smooth', 12.),
                (20, 'smooth', 10.)],
    head_land=[(20, 'linear', 0.), (22, 'smooth', 1.)],
    ear_plane=True, ear_rel_min=25.,
    ear_el=[(0, 'linear', 85.8), (4, 'smooth', 82.), (12, 'linear', 82.), (15, 'smooth', 84.), (16, 'smooth', 80.), (17, 'smooth', 70.),
            (18, 'smooth', 59.), (19, 'smooth', 49.), (20, 'smooth', 43.), (21, 'smooth', 40.)],
    ear_far_in=[(0, 'linear', 0.), (6, 'smooth', 1.)], ear_rest_in=[(20, 'linear', 0.), (22, 'smooth', 1.)],
    arm_buckle=None, arm_over_chest=8., arm_over_chest_share=.5, arm_guard_from=13, arm_guard_back=[.8, .55, -.1], arm_guard_back_land=[.8, .55, .05], flop_dirs=True, clav=[(0, 'linear', 0.)],
    arm_fold=[(12, 'linear', 0.), (16, 'smooth', 1.)], arm_fold_dirs={'upperarm': [.4, .7, -.6]},
    arm_fold_turns={'forearm': [-12., 0., 0.], 'hand': [0., 0., 0.]},
    arms=[(19, 'linear', 0.), (23, 'linear', 1.)], arm_land=23,

    tails=[(1, 'linear', 0.), (12, 'in', .5), (19, 'smooth', 1.)],
    # (released by 15 the tails' fall pressed tails a and b to 32 mm apart at 15: they come down over 12 to 19 instead; lifted
    # from 9 to a peak at 12, so the top tail's tip takes the hips' last drop over 10 to 12 (23, 28 and 21 px at 720; it fell
    # 42 at 12 with the lift peaking at 12 alone) and keeps sagging through the topple to 16)
    tail_lift=[(9, 'linear', 0.), (11, 'smooth', .45), (12, 'smooth', .9), (13, 'smooth', .85), (14, 'smooth', .68), (16, 'smooth', .4),
               (19, 'smooth', 0.)], tail_lift_deg=22.,
    tail_splay=[(11, 'linear', 0.), (14, 'smooth', 1.), (17, 'linear', 1.), (21, 'smooth', 0.)], tail_splay_deg=14.,
    tail_splay_tails=(('a', 1.),),
    tail_bounce={'a': 0, 'b': 0, 'c': 0}, tail_bounce_deg=4.,
    bounce=[(18, 'linear', 0.), (19, 'linear', -.25), (20, 'out', 1.), (21, 'smooth', .3), (22, 'smooth', -.05), (23, 'smooth', 0.)],
    bounce_rot={'chest': [-6., 0., 0.], 'neck': [-2.5, 0., 0.]},
)


# Fix pass 11 (blind critic f10; the orchestrator agrees: the topple and the knee hit are right, but the first twelve frames read
# as kneeling down, an upright trunk sinking on a vertical neck with the head balanced, and the landing still eases in and
# slides). Keep the accelerating drop, the knee hit at 12, the one-piece topple, the head and chest landing together, the rest
# (ear A, head, tails on their fur), the start seam and `down` at 27. Change: (1) the slack beat: the chin drops 38 degrees by 4
# on a neck that starts folding forward at once (16 degrees by 3, 44 by 6, 86 by 9, 128 by 12), so the head hangs chin-tucked
# in front of the chest and below the shoulders from 11 instead of balancing on top; the trunk is already tipping during the
# drop (33 degrees at the knee hit); (2) no pre-turn while the head is held up: it hangs chin down (92 degrees snout down at
# 12, the neck hanging below it) and turns to its rest pitch over 13 to 19, 4 to 15 degrees a frame (the floor's 3 more at the
# landing). Two limits set that window: the widened cell's front margin (head_reach) caps how far it may still hang at 15 to
# 17 (hanging chin-tucked through 17 put its crown 4 to 7 cm past the frame), and a head that lands short of its rest pitch
# either slides 10 cm back along the floor as the neck settles (held up by the neck) or is turned 25 degrees in the landing
# frame by the floor, so the turn is done by the landing (19), not over 17 to 21;
# (4) the chest's contact frame (19) and a 3 to 4 px rebound of chest and head over 20 and 21, still from 22; (5) the arms
# rest where they land (arm_hold): no flop forward after the landing; (6) the ear turned about the head's vertical (ear_yaw)
# so its back and rim face the camera while it trails, back to rest A by 20.
FAINT4.update(
    topple=dict(f0=3, f1=19, length=.55, kick=12, th_kick=33.),
    neck_world=[(0, 'linear', 0.), (1, 'linear', 6.), (3, 'out', 16.), (6, 'smooth', 44.), (9, 'smooth', 86.), (12, 'smooth', 128.),
                (13, 'smooth', 140.), (14, 'smooth', 152.), (15, 'smooth', 162.), (16, 'smooth', 167.), (17, 'smooth', 169.)],
    head_pitch=[(0, 'linear', 0.), (1, 'linear', 10.), (2, 'linear', 24.), (3, 'smooth', 34.), (4, 'out', 38.), (8, 'smooth', 64.),
                (11, 'smooth', 86.), (12, 'smooth', 92.), (13, 'smooth', 88.), (14, 'smooth', 80.), (15, 'smooth', 69.), (16, 'smooth', 56.),
                (17, 'smooth', 42.), (18, 'smooth', 27.), (19, 'smooth', 13.), (20, 'smooth', 10.)],
    head_land=[(20, 'linear', 0.), (22, 'smooth', 1.)],
    neck_tuck_cap=[(0, 'linear', 20.), (19, 'linear', 20.), (21, 'smooth', 0.)],
    bounce=[(18, 'linear', 0.), (19, 'linear', -.25), (20, 'out', 1.), (21, 'smooth', .45), (22, 'smooth', 0.)],
    bounce_rot={'chest': [-3.2, 0., 0.], 'neck': [-1.5, 0., 0.]},
    # (8) the top tail's tip kept falling through the knee hit: its lift gives back from 12 (it held .85 at 13 as the hips
    # stopped, so the tip's drop fell from 22 to 19 px at 720 and picked up to 29 at 14)
    tail_lift=[(9, 'linear', 0.), (11, 'smooth', .45), (12, 'smooth', .9), (13, 'smooth', .72), (14, 'smooth', .55), (15, 'smooth', .4),
               (16, 'smooth', .28), (19, 'smooth', 0.)],
    bounce_late=[(20, 'linear', 0.), (21, 'out', 1.), (22, 'smooth', 0.)],
    arm_hold=True,
    ear_yaw=[(3, 'linear', 0.), (9, 'smooth', 1.), (16, 'linear', 1.), (20, 'smooth', 0.)], ear_yaw_deg=-20.,
    # (7) the hanging neck's bend shared with the chest while the head hangs (the chest rounds 26 degrees over 5 to 10, held to
    # 13, given back by 16; the topple solve keeps the trunk line where it was): the neck alone bent 60 to 95 degrees on the
    # chest at 10 to 13 and folded the throat (neck-region folds 636 to 1394 there, 16 to 365 with the curl)
    curl=[(5, 'linear', 0.), (10, 'smooth', 1.), (13, 'linear', 1.), (16, 'smooth', 0.)], curl_rot={'chest': [26., 0., 0.]},
    still_from=22,
)


# Fix pass 12 (blind critic f11 passed the read, the arms and tails, the chest hit, the start seam and the still end; the ear's
# inner face and the neck's pinch were limits of the rig). With the rig pass (pose_space_corrective.py: the neck fold keys, and
# for the ear the finding that a turn about its length is clean on the rig as it is): (1) the ear eases from idle's to
# ear_hang_prm relative to the head over 3 to 8 (rest A's own height above the skull's long axis, splayed 25 instead of 75,
# turned 60 about its length so the dish is edge-on), holds while the head hangs, and gives back to the rest A path over 15 to
# 19, so 18 is already half laid back; (2) the head's turn to its rest pitch starts at 13 and is two thirds done by 17, so the
# contact frame carries less of it; (3) the bounce of head and shoulders 8 to 10 px at 720 over 20 and 21, settled on 22.
FAINT4.update(
    ear_hang=[(3, 'linear', 0.), (8, 'smooth', 1.), (15, 'linear', 1.), (19, 'smooth', 0.)], ear_hang_prm=(-30., 25., -60.),
    head_pitch=[(0, 'linear', 0.), (1, 'linear', 10.), (2, 'linear', 24.), (3, 'smooth', 34.), (4, 'out', 38.), (8, 'smooth', 64.),
                (11, 'smooth', 86.), (12, 'smooth', 92.), (13, 'smooth', 86.), (14, 'smooth', 76.), (15, 'smooth', 63.), (16, 'smooth', 49.),
                (17, 'smooth', 36.), (18, 'smooth', 24.), (19, 'smooth', 13.), (20, 'smooth', 10.)],
    bounce=[(18, 'linear', 0.), (19, 'linear', -.25), (20, 'out', 1.), (21, 'smooth', .45), (22, 'smooth', 0.)],
    bounce_rot={'chest': [-8., 0., 0.], 'neck': [-3.5, 0., 0.]},
)


def _ear_frames(skin):
    """Per side: the ear's rest axis (root to tip) and its dish-facing normal (the blade's normal, signed toward the dish: rest
    vertex normals facing forward)."""
    if getattr(skin, '_ea', None) is not None:
        return skin._ea
    dense = np.zeros((len(skin.rest), len(NAMES)))
    np.put_along_axis(dense, skin.idx, skin.w, 1)
    fn = np.cross(skin.rest[skin.tris[:, 1]]-skin.rest[skin.tris[:, 0]], skin.rest[skin.tris[:, 2]]-skin.rest[skin.tris[:, 0]])
    vn = np.zeros_like(skin.rest)
    for k in range(3):
        np.add.at(vn, skin.tris[:, k], fn)
    vn /= np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-20)
    out = {}
    for sd in 'LR':
        ev = np.flatnonzero(dense[:, [NAMES.index(f'ear_{i}.{sd}') for i in range(1, 5)]].sum(1) > .9)
        a = _unit(np.array(skin.J[f'ear4.{sd}'])-np.array(skin.J[f'ear0.{sd}']))
        X = skin.rest[ev]-skin.rest[ev].mean(0)
        X = X-np.outer(X@a, a)
        _, _, vt = np.linalg.svd(X, full_matrices=False)
        n = np.cross(a, vt[0])
        if (vn[ev]@n).mean() < 0:
            n = -n
        out[sd] = (a, n)
    skin._ea = out
    return out


def _frame3(x, y):
    x = _unit(x)
    y = np.asarray(y, float)-x*(x@np.asarray(y, float))
    y = _unit(y)
    return np.stack([x, y, np.cross(x, y)], 1)


def ear_world_dirs(el, psi, phi, sd='L'):
    """The ear's world axis (pointing back, el degrees above horizontal, splayed psi toward its own side) and its dish normal
    (world down made square to the axis, turned phi degrees about it, + toward the ear's own side)."""
    e, p = math.radians(el), math.radians(psi)
    sx = 1. if sd == 'L' else -1.
    d = np.array([sx*math.sin(p), math.cos(p)*math.cos(e), math.cos(p)*math.sin(e)])
    dn = _unit(np.array([0., 0., -1.])+d*d[2])
    ph = math.radians(phi)*sx
    return d, dn*math.cos(ph)+np.cross(d, dn)*math.sin(ph)


def ear_world_params(rig, skin, pose, sd='L'):
    """(el, psi, phi) of a pose's ear (ear_1's world turn), the inverse of ear_world_dirs."""
    a, nn = _ear_frames(skin)[sd]
    W1 = rc.bone_transforms(rig.J, pose, bones=B)[f'ear_1.{sd}'][0]
    d, n = W1@a, W1@nn
    sx = 1. if sd == 'L' else -1.
    psi = math.degrees(math.asin(max(-1., min(1., sx*d[0]))))
    el = math.degrees(math.atan2(d[2], d[1]))
    dn = _unit(np.array([0., 0., -1.])+d*d[2])
    ph = math.degrees(math.atan2(float(n@np.cross(d, dn)), float(n@dn)))
    return el, psi, ph*sx


def set_ear_world(rig, skin, pose, sd, el, psi, phi):
    """ear_1 turned so the ear's axis and dish normal are ear_world_dirs(el, psi, phi) (2 to 4 straight)."""
    a, nn = _ear_frames(skin)[sd]
    Wh = rc.bone_transforms(rig.J, pose, bones=B)['head'][0]
    d, n = ear_world_dirs(el, psi, phi, sd)
    R0 = rot(rig.body[f'ear_1.{sd}'])
    M = _frame3(d, n)@_frame3(Wh@R0@a, Wh@R0@nn).T
    pose[f'ear_1.{sd}'] = [float(v) for v in rc.euler_from_matrix(Wh.T@M@Wh@R0)]
    for i in range(2, 5):
        pose[f'ear_{i}.{sd}'] = [0., 0., 0.]


def _lerp_params(a, b, t):
    return tuple(x+((y-x+180.) % 360.-180.)*t for x, y in zip(a, b))


def toe_roll(skin, sd, theta, curl):
    """The foot rolled heel up theta degrees: on its sole by theta-curl (foot_roll: the contact stays put), then a further curl
    about its toe joint's X axis (the toe keys curl the toes back by the same angle, so the toes stay where they stand)."""
    R0, t0 = foot_roll(skin, sd, theta-curl)
    Rj = rot([curl, 0., 0.])
    j = np.array(skin.J[f'toe.{sd}'])
    return R0@Rj, R0@(j-Rj@j)+t0


def kneel_legs(rig, skin, body, lift, heel, pole, curl):
    targets, Rfs = {}, {}
    for sd in 'LR':
        Rf, t = toe_roll(skin, sd, heel, min(curl, heel))
        targets[sd] = Rf@np.array(rig.J[f'ankle.{sd}'], float)+t
        Rfs[sd] = Rf
    poles = {sd: [pole[0]*(1 if sd == 'L' else -1), pole[1], pole[2]] for sd in 'LR'}
    full = rc.plant_legs(rig.J, body, lift, {sd: targets[sd].tolist() for sd in 'LR'}, poles, bones=B)
    T = rc.bone_transforms(rig.J, full, bones=B, root_translate=tuple(rc.lift_vec(lift)))
    for sd in 'LR':
        full[f'foot.{sd}'] = rc.euler_from_matrix(T[f'shin.{sd}'][0].T@Rfs[sd])
    return full, targets


def toe_curl_of(shin_swing):
    lo, hi, ang = FAINT4['toe_curl']
    return ang*min(1., max(0., (shin_swing-lo)/(hi-lo)))


def fur_low(bins, comp, pj, dv):
    """Fix pass 8: the lowest point (rig z) of a tail bone's fur envelope with its head at pj and world direction dv: each bin of the
    profile (tail_fur_profile.py) a ring of radius r about the bone's line from s0 to s1, the fur's reach past the skin compressed
    by comp (r = r_skin + (1 - comp) * (r_fur - r_skin)); a ring reaches r * sqrt(1 - dz^2) under the line."""
    c = math.sqrt(max(0., 1-dv[2]*dv[2]))
    lo = math.inf
    for s0, s1, rf, rk, _ in bins:
        r = rk+(1-comp)*(rf-rk)
        lo = min(lo, pj[2]+min(s0*dv[2], s1*dv[2])-r*c)
    return lo


def _raise_to(dv, dz):
    hz = np.array([dv[0], dv[1], 0.])
    hz = hz/np.linalg.norm(hz) if np.linalg.norm(hz) > 1e-9 else np.array([0., 1., 0.])
    return np.array([hz[0]*math.sqrt(1-dz*dz), hz[1]*math.sqrt(1-dz*dz), dz])


def drape_tail_dirs(rig, pose, lift, dirs, clear, fur=None, comp=0., fur_from=1):
    """Tails by world direction per bone; down each chain a joint that would go under its own clearance over the floor is raised
    to lie on it, keeping its heading. Fix pass 8: with `fur` (the tail fur profile, {bone: {'bins': ...}}), a bone whose fur
    envelope (compressed by comp, fur_low) would reach under the floor is then raised, keeping its heading, until it rests on it
    (bones fur_from to the tip)."""
    tg = {b: _unit(v) for b, v in dirs.items()}
    T = rc.bone_transforms(rig.J, rc.pose_from_directions(rig.J, {'tail_root': tg['tail_root']}, base=pose, bones=B), bones=B,
                           root_translate=tuple(rc.lift_vec(lift)))
    clear_all = clear
    for tn in rc.TAILS:
        # (fix pass 7: `clear` may give each tail its own clearances, {tail: (...)})
        clear = clear_all[tn] if isinstance(clear_all, dict) else clear_all
        _, _, h0, _ = BONE_OF[f'tail_{tn}1']
        pj = T['tail_root'][0]@np.array(rig.J[h0])+T['tail_root'][1]
        for k in range(1, rc.TAIL_BONES+1):
            b = f'tail_{tn}{k}'
            _, _, h, tl_ = BONE_OF[b]
            L = float(np.linalg.norm(np.array(rig.J[tl_])-np.array(rig.J[h])))
            dv = tg[b]
            if pj[2]+L*dv[2] < clear[k-1]:
                dz = max(-1., min(1., (clear[k-1]-pj[2])/L))
                hz = np.array([dv[0], dv[1], 0.])
                hz = hz/np.linalg.norm(hz) if np.linalg.norm(hz) > 1e-9 else np.array([0., 1., 0.])
                dv = np.array([hz[0]*math.sqrt(1-dz*dz), hz[1]*math.sqrt(1-dz*dz), dz])
                tg[b] = dv
            if fur is not None and k >= fur_from and fur_low(fur[b]['bins'], comp, pj, dv) < 0:
                # the smallest rise of the bone's height share that puts its envelope on the floor (scan, then bisect)
                lo_, hi_ = float(dv[2]), None
                for dz in np.arange(lo_+.01, 1.0001, .01):
                    if fur_low(fur[b]['bins'], comp, pj, _raise_to(dv, min(1., dz))) >= 0:
                        hi_ = min(1., float(dz))
                        break
                    lo_ = float(dz)
                if hi_ is None:
                    hi_ = 1.
                for _ in range(30):
                    mid = (lo_+hi_)/2
                    if fur_low(fur[b]['bins'], comp, pj, _raise_to(dv, mid)) >= 0:
                        hi_ = mid
                    else:
                        lo_ = mid
                dv = _raise_to(dv, hi_)
                tg[b] = dv
            pj = pj+L*dv
    order = ['tail_root']+[f'tail_{tn}{k}' for tn in rc.TAILS for k in range(1, rc.TAIL_BONES+1)]
    return {k: [float(x) for x in v] for k, v in rc.pose_from_directions(rig.J, {b: tg[b] for b in order}, base=pose, bones=B).items()}


def tails_E_turned():
    """Fix pass 8: FAINT4 tails_E with tails a and c's bones 2 to 5 turned tail_back_turn degrees back about the vertical (a
    from +X toward +Y, c from -X toward +Y); tail b and the bones before them as they are."""
    E = {k: list(v) for k, v in FAINT4['tails_E'].items()}
    for tn, sg in (('a', 1.), ('c', -1.)):
        f = math.radians(sg*FAINT4['tail_back_turn'])
        for k in range(2, rc.TAIL_BONES+1):
            x, y, z = E[f'tail_{tn}{k}']
            E[f'tail_{tn}{k}'] = [x*math.cos(f)-y*math.sin(f), x*math.sin(f)+y*math.cos(f), z]
    return E


def _world(rig, pose, b):
    return rc.bone_transforms(rig.J, pose, bones=B)[b][0]


def _euler(R):
    return [float(v) for v in rc.euler_from_matrix(R)]


def ear_side_elevation(rig, skin, pose, sd='L', lift=(0., 0., 0.)):
    """The ear's root-to-tip axis in the side view: degrees above horizontal, pointing back (+Y)."""
    a, _ = _ear_frames(skin)[sd]
    d = rc.bone_transforms(rig.J, pose, bones=B)[f'ear_1.{sd}'][0]@a
    return math.degrees(math.atan2(d[2], d[1]))


def ear_swing_to(rig, skin, pose, sd, el):
    """ear_1 swung rigidly about the world's X axis (the side camera's line of sight, so the swing is in the picture's plane and
    the ear keeps its own turn about its length) until its side-view elevation is el."""
    T = rc.bone_transforms(rig.J, pose, bones=B)
    a, _ = _ear_frames(skin)[sd]
    W1, Wh = T[f'ear_1.{sd}'][0], T['head'][0]
    d = W1@a
    da = math.radians(el-math.degrees(math.atan2(d[2], d[1])))
    Rx = np.array([[1., 0., 0.], [0., math.cos(da), -math.sin(da)], [0., math.sin(da), math.cos(da)]])
    pose[f'ear_1.{sd}'] = _euler(Wh.T@Rx@W1)


def skull_back_line(Ph):
    """The skull's back line in the side view from the head's skin (head and jaw): from its highest point to its rearmost,
    degrees above horizontal pointing back (it points down, so negative)."""
    crown, back = Ph[np.argmax(Ph[:, 2])], Ph[np.argmax(Ph[:, 1])]
    v = back-crown
    return math.degrees(math.atan2(v[2], v[1]))


# ---------------------------------------------------------------- faint, fix pass 6 helpers

# the rigid parts clip_frames.py poses on their bones (export_rigid_parts.py, batch 3): the fore claws are kept out of the floor
# with the paws (fix pass 6: at 23 they went 9 mm into it while the paw skin stood clear)
PARTS_NPZ = HERE.parents[2]/'untracked/species-construction/akinza/anim/clipset3/parts.npz'


def claw_points(skin, kind='fore'):
    """Per side, the fore (hand.<side>) or hind (foot.<side>) claws' rest points (rig metres), or empty arrays without the
    parts file."""
    attr = '_fc' if kind == 'fore' else '_hc'
    if getattr(skin, attr, None) is None:
        out = {'L': np.zeros((0, 3)), 'R': np.zeros((0, 3))}
        if PARTS_NPZ.exists():
            pz = np.load(PARTS_NPZ)
            for m in json.loads(Path(str(PARTS_NPZ)+'.json').read_text()):
                if f'{kind} claw' in m['name'].lower():
                    sd = m['bone'][-1]
                    out[sd] = np.vstack([out[sd], pz[m['key']]])
        setattr(skin, attr, out)
    return getattr(skin, attr)


def fore_claws(skin):
    return claw_points(skin, 'fore')


TOE_KEY = json.loads((HERE.parents[2]/'untracked/species-construction/akinza/anim/rig-p8b/toe-corrective.json').read_text())['params'] \
    if (HERE.parents[2]/'untracked/species-construction/akinza/anim/rig-p8b/toe-corrective.json').exists() else dict(angle=40., mid_share=.5)


def hind_claw_turns(rig, skin, pose, lift, clear=.0005):
    """Fix pass 6: per side, the hind claws' turn up about the toe joint (degrees, on top of the toe keys' own, which
    clip_frames.py also gives them) that keeps them `clear` m over the floor: a claw retracts when the foot rolls onto its toe
    pads (heels up on the sole, 6 to 16, the claws went up to 12 mm into the floor). 0 where they are clear."""
    hc = claw_points(skin, 'hind')
    if not len(hc['L']):
        return {'L': 0., 'R': 0.}
    vals = rc.corrective_values(rig.J, pose, skin.keys, B)
    T = rc.bone_transforms(rig.J, pose, bones=B, root_translate=tuple(rc.lift_vec(lift)))
    out = {}
    for sd in ('L', 'R'):
        base = float(TOE_KEY['angle'])*(vals.get(f'toe_curl.{sd}', 0.)+float(TOE_KEY['mid_share'])*vals.get(f'toe_curl_mid.{sd}', 0.))
        j = np.array(rig.J[f'toe.{sd}'])

        def low(extra):
            a = math.radians(-(base+extra))
            Rx = np.array([[1., 0., 0.], [0., math.cos(a), -math.sin(a)], [0., math.sin(a), math.cos(a)]])
            X = (hc[sd]-j)@Rx.T+j
            return float((X@T[f'foot.{sd}'][0].T+T[f'foot.{sd}'][1])[:, 2].min())
        if low(0.) >= clear:
            out[sd] = 0.
            continue
        lo, hi = 0., 60.
        for _ in range(20):
            mid = .5*(lo+hi)
            if low(mid) >= clear:
                hi = mid
            else:
                lo = mid
        out[sd] = round(hi, 3)
    return out


def faint_time(f):
    """The faint clock at frame f (FAINT4['time'] knots, linear between them, identity outside)."""
    kn = FAINT4['time']
    if not kn or f <= kn[0][0] or f >= kn[-1][0]:
        return float(f)
    for (f0, t0), (f1, t1) in zip(kn, kn[1:]):
        if f0 <= f <= f1:
            return t0+(t1-t0)*(f-f0)/(f1-f0)
    return float(f)


def head_dirs(theta, psi, phi, sd='L'):
    """In the head's frame: the ear axis theta degrees above the skull line (+Y, back) in the sagittal plane, splayed psi degrees
    toward the ear's own side, and the dish normal: the head's down made square to the axis, turned phi degrees about it."""
    t, p = math.radians(theta), math.radians(psi)
    sx = 1. if sd == 'L' else -1.
    d = np.array([sx*math.sin(p), math.cos(p)*math.cos(t), math.cos(p)*math.sin(t)])
    dn = np.array([0., 0., -1.])
    dn = _unit(dn-d*(d@dn))
    ph = math.radians(phi)*sx
    return d, dn*math.cos(ph)+np.cross(d, dn)*math.sin(ph)


def set_ear_dn(rig, skin, pose, sd, d, n):
    """ear_1 turned so the ear's axis is world d and its dish normal world n (2 to 4 straight)."""
    a, nn = _ear_frames(skin)[sd]
    Wh = rc.bone_transforms(rig.J, pose, bones=B)['head'][0]
    R0 = rot(rig.body[f'ear_1.{sd}'])
    M = _frame3(d, n)@_frame3(Wh@R0@a, Wh@R0@nn).T
    pose[f'ear_1.{sd}'] = _euler(Wh.T@M@Wh@R0)
    for i in range(2, 5):
        pose[f'ear_{i}.{sd}'] = [0., 0., 0.]


def set_ear_head(rig, skin, pose, sd, theta, psi, phi):
    """ear_1 turned so the ear's axis and dish normal are head_dirs(...) in the head's frame (2 to 4 straight)."""
    a, nn = _ear_frames(skin)[sd]
    Wh = rc.bone_transforms(rig.J, pose, bones=B)['head'][0]
    d, n = head_dirs(theta, psi, phi, sd)
    R0 = rot(rig.body[f'ear_1.{sd}'])
    M = _frame3(Wh@d, Wh@n)@_frame3(Wh@R0@a, Wh@R0@nn).T
    pose[f'ear_1.{sd}'] = _euler(Wh.T@M@Wh@R0)
    for i in range(2, 5):
        pose[f'ear_{i}.{sd}'] = [0., 0., 0.]


def _axis_angle(k, deg):
    a = math.radians(deg)
    K = np.array([[0., -k[2], k[1]], [k[2], 0., -k[0]], [-k[1], k[0], 0.]])
    return np.eye(3)+math.sin(a)*K+(1-math.cos(a))*K@K


def ear_twist(rig, pose, sd):
    """Fix pass 7: ear_1's twist against its parent (the head), degrees, signed about the bone's rest axis: the twist part of
    the swing-twist split of its local turn (rig_core.swing_deg is the swing part)."""
    u = np.asarray(rc.bone_axis(rig.J, f'ear_1.{sd}', B), float)
    R = rot(pose.get(f'ear_1.{sd}', [0., 0., 0.]))
    v = R@u
    w = np.cross(u, v)
    n = float(np.linalg.norm(w))
    Rs = np.eye(3) if n < 1e-9 else _axis_angle(w/n, math.degrees(math.acos(max(-1., min(1., float(u@v))))))
    Rt = Rs.T@R
    ax = np.array([Rt[2, 1]-Rt[1, 2], Rt[0, 2]-Rt[2, 0], Rt[1, 0]-Rt[0, 1]])
    return math.degrees(math.atan2(float(ax@u)/2, (float(np.trace(Rt))-1)/2))


def set_ear_twist(rig, skin, pose, sd, deg):
    """ear_1 turned about the ear's own root-to-tip line (so the ear points where it pointed, only its dish turns) until its
    twist against the head is deg (bisection over the turn)."""
    a, _ = _ear_frames(skin)[sd]
    R0 = rot(pose.get(f'ear_1.{sd}', [0., 0., 0.]))
    q = dict(pose)

    def tw(d):
        q[f'ear_1.{sd}'] = _euler(R0@_axis_angle(a, d))
        return ear_twist(rig, q, sd)
    lo, hi = -120., 120.
    s = 1. if tw(5.) > tw(-5.) else -1.
    for _ in range(40):
        mid = .5*(lo+hi)
        if s*(tw(mid)-deg) < 0:
            lo = mid
        else:
            hi = mid
    pose[f'ear_1.{sd}'] = _euler(R0@_axis_angle(a, .5*(lo+hi)))


# fix pass 6, the rest ear (held forever in the game; Nick picks): A the fix pass 5 ear, the approved ear's own turn swung in the
# picture's plane to `above` degrees over the head's long axis (flat back over the crown and nape: a hood at 192); B back and
# down about 45 degrees from A, turned about its length so its edge, not its dish, faces the camera, clear of the skull; C out to
# the side and down (a sedated cat's drooped ear), foreshortened beside the head. B and C relative to the head (head_dirs);
# the far ear mirrors the near one (A: far_down degrees lower)
EAR_REST = {'A': dict(mode='swing', above=30.),
            'B': dict(mode='head', theta=-30., psi=85., phi=-20.),
            'C': dict(mode='head', theta=-35., psi=100., phi=-60.)}
# (B: a back-and-down ear with less splay than 80 degrees goes 4 to 30 mm into the neck at rest, so B keeps the splay near the
# approved ear's own 59 plus 26 and lies back beside the neck, its dish turned down and in; turned fully edge-on (phi 5) it
# folded the ear root 1139 triangles against A's 402, at -20 498)


def ear_rest_world(rig, skin, pose, ip):
    """Per side, the rest ear's world parameters (ear_world_params) for the head as it is in `pose`."""
    spec = EAR_REST[FAINT4['ear_rest']]
    q = dict(pose)
    out = {}
    for sd in 'LR':
        if spec['mode'] == 'swing':
            for i in range(1, 5):
                q[f'ear_{i}.{sd}'] = list(ip.get(f'ear_{i}.{sd}', [0., 0., 0.]))
            yh = _world(rig, q, 'head')@np.array([0., 1., 0.])
            el = math.degrees(math.atan2(yh[2], yh[1]))+spec['above']-(FAINT4['far_down'] if sd == 'R' else 0.)
            ear_swing_to(rig, skin, q, sd, el)
        else:
            set_ear_head(rig, skin, q, sd, spec['theta'], spec['psi'], spec['phi'])
        out[sd] = ear_world_params(rig, skin, q, sd)
    return out


def knee_pin_solve(rig, skin, body, lift, heel, curl, pin, cache):
    """Fix pass 6: the pelvis height and knee depth that put each knee joint at the pinned point across the floor (its y fixed;
    its height follows its depth x along the shin's reach from the planted ankle) with the lowest knee skin knee_skin_mm over the
    floor. Returns (lift, pole, knee skin low, x) or None when the hip cannot reach."""
    J = rig.J
    l1 = float(np.linalg.norm(np.subtract(J['knee.L'], J['hip.L'])))
    l2 = float(np.linalg.norm(np.subtract(J['ankle.L'], J['knee.L'])))
    Rf, tA = toe_roll(skin, 'L', heel, min(curl, heel))
    A = Rf@np.array(J['ankle.L'], float)+tA
    nolegs = {k: v for k, v in body.items() if rc.base_of(k) not in ('thigh', 'shin', 'foot')}
    T0 = rc.bone_transforms(J, nolegs, bones=B, root_translate=tuple(rc.lift_vec(lift)))
    H0 = T0['hip.L'][0]@np.array(J['hip.L'])+T0['hip.L'][1]
    py = pin[1]

    def at(px):
        r2 = l2*l2-(px-A[0])**2-(py-A[1])**2
        if r2 < 0:
            return None
        Kp = np.array([px, py, A[2]-math.sqrt(r2)])
        h2 = l1*l1-(H0[0]-Kp[0])**2-(H0[1]-Kp[1])**2
        if h2 < 0:
            return None
        dz = Kp[2]+math.sqrt(h2)-H0[2]
        l_ = np.asarray(lift, float)+np.array([0., 0., dz])
        pole = (Kp-(H0+np.array([0., 0., dz]))).tolist()
        full, _ = kneel_legs(rig, skin, body, l_, heel, pole, curl)
        low = min(float(cache['knee_parts'][sd].posed(full, l_)[:, 2].min()) for sd in 'LR')
        return l_, pole, low, px

    target = FAINT4['knee_skin_mm']/1000.
    xs = np.linspace(pin[0]-.08, pin[0]+.08, 17)
    vals = [(x, at(x)) for x in xs]
    vals = [(x, v) for x, v in vals if v is not None]
    if not vals:
        return None
    # the depth nearest the pin whose knee skin crosses the target, refined by bisection
    best = min(vals, key=lambda xv: (abs(xv[1][2]-target), abs(xv[0]-pin[0])))
    brackets = [(xa, va, xb) for (xa, va), (xb, vb) in zip(vals, vals[1:]) if (va[2]-target)*(vb[2]-target) <= 0]
    if brackets:
        xa, va, xb = min(brackets, key=lambda br: abs(.5*(br[0]+br[2])-pin[0]))
        lo, hi, vlo = xa, xb, va
        for _ in range(16):
            mid = .5*(lo+hi)
            vm = at(mid)
            if vm is None:
                break
            if (vm[2]-target)*(vlo[2]-target) <= 0:
                hi = mid
            else:
                lo, vlo = mid, vm
        vm = at(.5*(lo+hi))
        if vm is not None:
            best = (vm[3], vm)
    return best[1]


def faint4_frame(rig, skin, f, cache):
    P = FAINT4
    K, E = P['K'], P['E']
    LAND = P.get('land', P['down'])             # fix pass 9: the chest's landing (pass 8: `down`, 27)
    ARM_LAND = P.get('arm_land', LAND)          # fix pass 9: the arms at their rest (they flop out after the chest lands)
    t = faint_time(f)
    tr = lambda k, x=None: ac.track(P[k], t if x is None else x)
    if 'idle0' not in cache:
        i0, l0, _ = cb.idle_pose(rig, 0)
        cache['idle0'] = (i0, np.asarray(l0, float))
        cache['tails0'] = _tail_dirs(rig, i0, np.asarray(l0, float))
        cache['head_parts'] = skin.part(['head', 'jaw'])
        cache['knee_parts'] = {sd: skin.part([f'thigh.{sd}', f'shin.{sd}']) for sd in ('L', 'R')}
        cache['curl'] = 0.
        cache['s_head'] = 0.
        cache['t'] = -1.
        cache['WE'] = rot([E['head_pitch'], 0., 0.])
        # the ears as they stand in idle frame 0, in the world (fix pass 6: held there while the head drops, then the sag)
        cache['ear0'] = {sd: ear_world_params(rig, skin, dict(i0, root=[0., 0., 0.]), sd) for sd in ('L', 'R')}
    dt = max(0., t-cache['t'])
    cache['t'] = t
    ip, ilift, ib = cb.idle_pose(rig, f)
    fa, tp = tr('fall'), tr('tip')
    trs = tr('round', t+P['spine_lead'])
    tpa = tr('arms')
    ARMS = ('upperarm', 'forearm', 'hand')
    # trunk and neck by their local turns: idle -> K (fall) -> E (tip); arms idle -> K for now
    body = {k: list(v) for k, v in ip.items() if rc.base_of(k) not in ('thigh', 'shin', 'foot') and not k.startswith('tail')
            and k != 'root'}
    for b in sorted(set(body) | set(K['body']) | set(E['body'])):
        if b.startswith('ear_'):
            continue
        a0 = body.get(b, [0., 0., 0.])
        k_ = slerp_e(a0, K['body'].get(b, [0., 0., 0.]), fa)
        if rc.base_of(b) in ARMS:
            body[b] = k_
            continue
        t2 = trs if b == 'spine' else (tr('round') if b == 'chest' else (tr('neck') if b == 'neck' else tp))
        body[b] = slerp_e(k_, E['body'].get(b, [0., 0., 0.]), t2)
    for b, e in P['settle_rot'].items():
        turn(body, b, e, tr('settle'))
    for b, e in P['curl_rot'].items():
        turn(body, b, e, tr('curl'))
    if 'neck_hang' in P:
        # fix pass 9: the slack neck lets the head hang (degrees on top of the neck's own turn, gone by the rest)
        turn(body, 'neck', [tr('neck_hang'), 0., 0.])
    bo = tr('bounce')
    for b, e in P['bounce_rot'].items():
        turn(body, b, e, bo)
    cl = tr('clav')
    if cl:
        cr = P['clav_rot']
        turn(body, 'clavicle.L', cr, cl)
        turn(body, 'clavicle.R', [cr[0], -cr[1], -cr[2]], cl)
    body['root'] = slerp_e(slerp_e([0., 0., 0.], [K['pitch'], 0., 0.], fa), [E['pitch'], 0., 0.], tp)
    if 'neck_world' in P:
        # fix pass 10 (critic f9: the head sat far out in front on a long straight neck at 13 to 18, and an S-pinch under the
        # jaw at 2 to 12, the neck bent 40 to 60 degrees with the head turned back against it): the neck by its world pitch
        # (neck_world, degrees forward of its rest, pointing up), weighed in on neck_world_w: it bends little in the slack
        # beat (the chin drop is the head's own), folds down as the knees hit so the head hangs below the shoulders, and
        # gives way to the rest's own neck by the landing
        nw = tr('neck_world_w')
        if nw > 0:
            loc = _euler(_world(rig, body, 'chest').T@rot([tr('neck_world'), 0., 0.]))
            body['neck'] = slerp_e(body['neck'], loc, nw)

    def mirror(v, sd):
        return np.asarray(v, float)*np.array([1. if sd == 'L' else -1., 1., 1.])
    # arms: hanging straight down in the world from the landing (outside the kneeling thighs)
    ah = tr('arm_hang')
    jo = tr('jolt') if 'jolt' in P else 0.
    if ah > 0:
        hd = rot([-P.get('jolt_arm', 0.)*jo, 0., 0.])@np.asarray(P['arm_hang_dir'], float)
        hang = rc.pose_from_directions(rig.J, {f'{b}.{sd}': _unit(mirror(hd, sd))
                                               for sd in ('L', 'R') for b in ('upperarm', 'forearm')}, base=body, bones=B)
        for sd in ('L', 'R'):
            for b in ('upperarm', 'forearm'):
                body[f'{b}.{sd}'] = slerp_e(body[f'{b}.{sd}'], [float(x) for x in hang[f'{b}.{sd}']], ah)
    # fix pass 6: then the elbows bend from 20, the forearms and paws swinging back and out toward flat (trailing the chest)
    af = tr('arm_fold')
    if af > 0:
        # fix pass 7: the upper arm by world direction, the elbow and wrist by their own turns (the elbow flexing the way it
        # bends, -X as in the guard; set by world direction the forearm trailing back bent the elbow backward 33 to 61 degrees
        # at 22 to 24, the S-shaped rubbery kink)
        fd = {f'upperarm.{sd}': _unit(mirror(P['arm_fold_dirs']['upperarm'], sd)) for sd in ('L', 'R')}
        T0 = rc.bone_transforms(rig.J, body, bones=B)
        tg = {b: _slerp_dir(T0[b][0]@rc.bone_axis(rig.J, b, B), fd[b], af) for b in fd}
        fold = rc.pose_from_directions(rig.J, tg, base=body, bones=B)
        for b in fd:
            body[b] = [float(x) for x in fold[b]]
        for sd in ('L', 'R'):
            for b in ('forearm', 'hand'):
                e = P['arm_fold_turns'][b]
                body[f'{b}.{sd}'] = slerp_e(body.get(f'{b}.{sd}', [0., 0., 0.]), [e[0], e[1]*(1 if sd == 'L' else -1), e[2]*(1 if sd == 'L' else -1)], af)
    p_idle = cache['idle0'][1]+np.array(rig.J['pelvis'])
    pw = p_idle+(np.asarray(K['pelvis'])-p_idle)*fa+(np.asarray(E['pelvis'])-np.asarray(K['pelvis']))*tr('slide')
    lift = pw-rot(body['root'])@np.array(rig.J['pelvis'])
    # legs: IK to the rolled feet, the toe curl following the shin's swing
    heel = E['heel']*tr('heel')
    pole = _unit(np.array([0., -1., 0.])*(1-fa)+np.asarray(K['pole'], float)*fa)
    pole = _unit(pole*(1-tp)+np.asarray(E['pole'], float)*tp)
    curl = cache['curl']
    for _ in range(3):
        full, targets = kneel_legs(rig, skin, body, lift, heel, pole, curl)
        curl = toe_curl_of(rc.swing_deg(rig.J, full, 'shin.L', B))
    full, targets = kneel_legs(rig, skin, body, lift, heel, pole, curl)
    cache['curl'] = curl

    def knee_low(pz_, l_):
        return min(float(cache['knee_parts'][sd].posed(pz_, l_)[:, 2].min()) for sd in ('L', 'R'))
    kl = knee_low(full, lift)
    knee_fix = 0.
    pinned = None
    if P.get('knee_pin') and t >= P['knees'] and 'knee_pin' not in cache:
        # fix pass 9: the knees land on pass 8's landing point, from the landing frame itself (so the rest pose is pass 8's;
        # landing them by their height first and pinning from the next frame put them 7 mm back for a frame)
        cache['knee_pin'] = list(P['knee_pin'])
    if (t > P['knees'] or P.get('knee_pin')) and 'knee_pin' in cache:
        # fix pass 6: the knees stay where they landed (they slid 10 px forward and back over 16 to 20)
        res = knee_pin_solve(rig, skin, body, lift, heel, curl, cache['knee_pin'], cache)
        if res is not None:
            l2, pole_, kl, px = res
            knee_fix = float(l2[2]-lift[2])
            lift, pole = l2, np.asarray(pole_, float)
            pinned = round(px-cache['knee_pin'][0], 5)
            full, targets = kneel_legs(rig, skin, body, lift, heel, pole, curl)
    elif (P['knees'] <= t and abs(kl-.001) > .002) or kl < -.0005:
        # the knees on the floor at the landing (the pelvis height solved so the lowest knee skin sits 1 mm over it); before
        # the landing only kept out of it
        # (fix pass 6: with the toe curl solved again for the raised pelvis, which turns the shin: at the landing the curl lagged
        # and the toes went 2 mm into the floor and slid 5 mm)
        lift0 = lift
        for _ in range(3):
            lo, hi = -.15, .15
            for _ in range(18):
                mid = .5*(lo+hi)
                l2 = lift0+np.array([0., 0., mid])
                fl, _ = kneel_legs(rig, skin, body, l2, heel, pole, curl)
                if knee_low(fl, l2) > .001:
                    hi = mid
                else:
                    lo = mid
            knee_fix = hi
            lift = lift0+np.array([0., 0., hi])
            full, targets = kneel_legs(rig, skin, body, lift, heel, pole, curl)
            curl = toe_curl_of(rc.swing_deg(rig.J, full, 'shin.L', B))
        full, targets = kneel_legs(rig, skin, body, lift, heel, pole, curl)
        cache['curl'] = curl
    if P['knees'] <= t and 'knee_pin' not in cache:
        Tk = rc.bone_transforms(rig.J, full, bones=B, root_translate=tuple(rc.lift_vec(lift)))
        cache['knee_pin'] = (Tk['shin.L'][0]@np.array(rig.J['knee.L'])+Tk['shin.L'][1]).tolist()
    arm_from = {f'{b}.{sd}': list(body.get(f'{b}.{sd}', [0., 0., 0.])) for sd in ('L', 'R') for b in ARMS}
    if 'arm_parts' not in cache:
        cache['arm_parts'] = {sd: skin.part([f'forearm.{sd}', f'hand.{sd}']) for sd in ('L', 'R')}
    fc = fore_claws(skin)
    dirs_E = {f'{b}.{sd}': _unit(mirror(P['arm_dirs_E'][b], sd)) for sd in ('L', 'R') for b in ARMS}

    def arms_at(t_, splay=0.):
        # the arm bones from their hang (or fold) to their rest by world direction; the lowest point of the forearm and paw skin
        # and of the fore claws (fix pass 6)
        # (fix pass 7: only the upper arm by world direction; the elbow and wrist turn from their fold to their rest turns, so
        # the elbow keeps bending its own way on the way down instead of passing through a backward bend)
        base = dict(body, **arm_from)
        pzE = rc.pose_from_directions(rig.J, dirs_E, base=base, bones=B)
        T0 = rc.bone_transforms(rig.J, base, bones=B)
        tg = {b: (dirs_E[b] if t_ >= 1 else _side_out_blend(T0[b][0]@rc.bone_axis(rig.J, b, B), dirs_E[b], t_, b[-1], splay))
              for b in dirs_E if b.startswith('upperarm')}
        pz = rc.pose_from_directions(rig.J, tg, base=base, bones=B)
        for b in dirs_E:
            if b in tg:
                body[b] = [float(x) for x in pz[b]]
            elif t_ >= 1 and f >= ARM_LAND:
                body[b] = [float(x) for x in pzE[b]]
            else:
                # toward the rest's own elbow and wrist turns (arm_rest_turns; the turns that reach dirs_E from an upper arm
                # still pointing down bend the elbow backward)
                e = P['arm_rest_turns'][rc.base_of(b)]
                body[b] = slerp_e(arm_from[b], [e[0], e[1]*(1 if b.endswith('L') else -1), e[2]*(1 if b.endswith('L') else -1)], t_)
        low = min(float(cache['arm_parts'][sd].posed(body, lift)[:, 2].min()) for sd in ('L', 'R'))
        if len(fc['L']):
            Tw = rc.bone_transforms(rig.J, body, bones=B, root_translate=tuple(rc.lift_vec(lift)))
            low = min([low]+[float((fc[sd]@Tw[f'hand.{sd}'][0].T+Tw[f'hand.{sd}'][1])[:, 2].min()) for sd in ('L', 'R') if len(fc[sd])])
        return low
    # fix pass 6: the rest arm lies on the floor: the upper arm's drop (its direction's downward share, the rest of it kept)
    # solved so the lowest forearm, paw or claw point at rest sits arm_rest_mm over the floor
    ux, uy, uz = P['arm_dirs_E']['upperarm']
    hz = math.hypot(ux, uy)

    def rest_low(zz):
        for sd in ('L', 'R'):
            dirs_E[f'upperarm.{sd}'] = _unit(mirror([ux/hz*math.sqrt(1-zz*zz), uy/hz*math.sqrt(1-zz*zz), -zz], sd))
        return arms_at(1.)
    lo, hi = 0., .9
    for _ in range(14):
        mid = .5*(lo+hi)
        if rest_low(mid) > P['arm_rest_mm']/1000.:
            lo = mid
        else:
            hi = mid
    arm_drop = .5*(lo+hi)
    if f < ARM_LAND:
        arm_drop = min(arm_drop, tr('arm_drop_cap'))
    rest_low(arm_drop)
    buckle = 0.
    if P.get('arm_buckle') and f < ARM_LAND:
        # fix pass 9: a dead arm whose paw meets the floor is pushed back and out by the falling body: the upper arm swings
        # toward bk['dir'] (back, out to its side and toward the floor, clear of the thigh) and the elbow folds, by the share
        # that keeps the paw and claws on the floor (it never gives back before the arms flop out to their rest)
        bk = P['arm_buckle']
        T0 = rc.bone_transforms(rig.J, dict(body, **arm_from), bones=B)
        ua0 = {sd: T0[f'upperarm.{sd}'][0]@rc.bone_axis(rig.J, f'upperarm.{sd}', B) for sd in 'LR'}
        af0 = {k_: list(v) for k_, v in arm_from.items()}

        def set_buckle(u):
            dirs = {f'upperarm.{sd}': _slerp_dir(ua0[sd], _unit(np.asarray(bk['dir'], float)*np.array([1. if sd == 'L' else -1., 1., 1.])), u)
                    for sd in 'LR'}
            pz = rc.pose_from_directions(rig.J, dirs, base=dict(body, **af0), bones=B)
            for sd in 'LR':
                arm_from[f'upperarm.{sd}'] = [float(x) for x in pz[f'upperarm.{sd}']]
                arm_from[f'forearm.{sd}'] = list(af0[f'forearm.{sd}'])
                turn(arm_from, f'forearm.{sd}', [bk['elbow']*u, 0., 0.])
            return arms_at(0.)
        lo, hi = cache.get('buckle', 0.), 1.
        if set_buckle(lo) < .0005:
            for _ in range(16):
                mid = .5*(lo+hi)
                if set_buckle(mid) < .0005:
                    lo = mid
                else:
                    hi = mid
            lo = hi
        buckle = lo
        set_buckle(buckle)
        cache['buckle'] = buckle
    arm_guard = None
    if P.get('arm_over_chest') is not None and P['arm_guard_from'] <= f < ARM_LAND:
        # fix pass 10 (critic f9: at 17 and 18 the arm went straight down and planted the paw under the chest like a push-up):
        # from arm_guard_from until the chest lands, no part of the arm (forearm, paw, claws) goes lower than
        # arm_over_chest_share of the chest's own lowest skin's height plus arm_over_chest mm, so no paw reaches the floor
        # before the chest (and on it, not through it, while they flop out after the landing): the trailing upper arm swings
        # further back along the flank toward arm_guard_back (the share
        # that keeps it there, never given back before the landing), so the chest comes down onto the arm trailing under it
        if 'chest_part' not in cache:
            cache['chest_part'] = skin.part(['chest', 'spine'])
        arm_guard = float(cache['chest_part'].posed(body, lift)[:, 2].min())*P['arm_over_chest_share']+P['arm_over_chest']/1000.
        if f >= LAND:
            # after the chest's landing, while the arms flop out to their rest, they lie on the floor (not through it)
            arm_guard = P['arm_rest_mm']/1000.
        Tg = rc.bone_transforms(rig.J, dict(body, **arm_from), bones=B)
        ua0 = {sd: Tg[f'upperarm.{sd}'][0]@rc.bone_axis(rig.J, f'upperarm.{sd}', B) for sd in 'LR'}
        af0 = {k_: list(v) for k_, v in arm_from.items()}

        def set_back(u):
            gb = P['arm_guard_back_land'] if f >= LAND else P['arm_guard_back']
            dirs = {f'upperarm.{sd}': _slerp_dir(ua0[sd], _unit(mirror(gb, sd)), u) for sd in 'LR'}
            pz = rc.pose_from_directions(rig.J, dirs, base=dict(body, **af0), bones=B)
            for sd in 'LR':
                arm_from[f'upperarm.{sd}'] = [float(x) for x in pz[f'upperarm.{sd}']]
            return arms_at(tpa)
        lo = cache.get('arm_back', 0.)
        if set_back(lo) < arm_guard:
            hi = 1.
            for _ in range(16):
                mid = .5*(lo+hi)
                if set_back(mid) < arm_guard:
                    lo = mid
                else:
                    hi = mid
            lo = hi
        set_back(lo)
        cache['arm_back'] = lo
        buckle = lo
    splay = 0.
    if f < ARM_LAND and arms_at(tpa) < .0005 and arms_at(tpa, 1.) >= .0005:
        # fix pass 7: a hanging paw that would reach the floor splays out to the side (the share that keeps it off the floor),
        # seen end-on from the side camera, instead of swinging forward ahead of its track (that reached forward like a brace
        # at 23)
        lo, hi = 0., 1.
        for _ in range(14):
            mid = .5*(lo+hi)
            if arms_at(tpa, mid) < .0005:
                lo = mid
            else:
                hi = mid
        splay = hi
    elif f < ARM_LAND and arms_at(tpa) < .0005 and P.get('flop_flat') and f >= LAND:
        # fix pass 10: after the landing the arm flops out on its own track (arms); where the in-between would go through the
        # floor its upper arm lies flatter (its drop toward the floor lowered until the arm is on it) rather than jumping on
        # to the rest (that moved the paw 86 px at 720 in one frame)
        lo, hi = -.6, arm_drop
        for _ in range(16):
            mid = .5*(lo+hi)
            for sd in ('L', 'R'):
                dirs_E[f'upperarm.{sd}'] = _unit(mirror([ux/hz*math.sqrt(1-mid*mid), uy/hz*math.sqrt(1-mid*mid), -mid], sd))
            if arms_at(tpa) > P['arm_rest_mm']/1000.:
                lo = mid
            else:
                hi = mid
        arm_drop = lo
        for sd in ('L', 'R'):
            dirs_E[f'upperarm.{sd}'] = _unit(mirror([ux/hz*math.sqrt(1-lo*lo), uy/hz*math.sqrt(1-lo*lo), -lo], sd))
    elif f < ARM_LAND and arms_at(tpa) < .0005:
        # a hanging paw would reach the floor: it swings on toward its rest instead (the share that keeps it on the floor)
        lo, hi = tpa, 1.
        for _ in range(14):
            mid = .5*(lo+hi)
            if arms_at(mid) < .0005:
                lo = mid
            else:
                hi = mid
        tpa = max(hi, cache.get('tpa', 0.))
        if arms_at(tpa) < .0005:
            # fix pass 7: still on or under the floor with the elbow and wrist at their rest turns: the upper arm lies flatter
            # (its drop lowered until the paw is on the floor)
            lo, hi = 0., arm_drop
            for _ in range(14):
                mid = .5*(lo+hi)
                for sd in ('L', 'R'):
                    dirs_E[f'upperarm.{sd}'] = _unit(mirror([ux/hz*math.sqrt(1-mid*mid), uy/hz*math.sqrt(1-mid*mid), -mid], sd))
                if arms_at(tpa) > P['arm_rest_mm']/1000.:
                    lo = mid
                else:
                    hi = mid
            arm_drop = lo
            for sd in ('L', 'R'):
                dirs_E[f'upperarm.{sd}'] = _unit(mirror([ux/hz*math.sqrt(1-lo*lo), uy/hz*math.sqrt(1-lo*lo), -lo], sd))
    cache['tpa'] = tpa
    if f < ARM_LAND:
        # (once splayed it stays out, letting go by half a frame as the arm nears its rest, never below what clears the floor)
        splay = max(splay, cache.get('splay', 0.)*(.5 if tpa > .6 else 1.))
    cache['splay'] = splay
    arm_low = arms_at(tpa, splay)
    if P.get('flop_dirs') and LAND <= f < ARM_LAND:
        # fix pass 10: after the chest lands, the arms flop from where they lay at the landing to their rest by each bone's
        # world direction on the arms track (blending their local turns swung the forearm through the floor), each in-between
        # kept on the floor, not through it (the upper arm lifted toward its landing direction by the share that does it)
        Tn = rc.bone_transforms(rig.J, body, bones=B)
        if f == LAND or 'arm_land_dirs' not in cache:
            cache['arm_land_dirs'] = {f'{b}.{sd}': Tn[f'{b}.{sd}'][0]@rc.bone_axis(rig.J, f'{b}.{sd}', B) for sd in 'LR' for b in ARMS}
        tl = tr('arms')
        arm_keep = {k: list(body[k]) for k in dirs_E}

        def flop_at(s_):
            tg = {k: _slerp_dir(cache['arm_land_dirs'][k], dirs_E[k], tl*(1-s_) if k.startswith('upperarm') else tl)
                  for sd in 'LR' for k in (f'upperarm.{sd}', f'forearm.{sd}', f'hand.{sd}')}
            pz = rc.pose_from_directions(rig.J, tg, base=dict(body, **arm_keep), bones=B)
            for k in tg:
                body[k] = [float(x) for x in pz[k]]
            return min(float(cache['arm_parts'][sd].posed(body, lift)[:, 2].min()) for sd in ('L', 'R'))
        sl = 0.
        if f > LAND and flop_at(0.) < P['arm_rest_mm']/1000.:
            lo_, hi_ = 0., 1.
            for _ in range(14):
                mid = .5*(lo_+hi_)
                if flop_at(mid) < P['arm_rest_mm']/1000.:
                    lo_ = mid
                else:
                    hi_ = mid
            sl = hi_
        arm_low = flop_at(sl) if f > LAND else arm_low
        if f == LAND:
            for k, v in arm_keep.items():
                body[k] = v
    if P.get('arm_hold') and f >= LAND:
        # fix pass 11 (critic f10: after the landing the paw slid about 45 px forward along the floor over 19 to 23 as the arm
        # flopped out to its rest under the chin): the arms rest where they land. From the chest's landing each wrist stays
        # at its landing point and each paw keeps its landing turn in the world; the arm reaches it by two-bone IK from the
        # shoulder as the chest rebounds and settles, the elbow kept in its landing plane
        Tw = rc.bone_transforms(rig.J, body, bones=B, root_translate=tuple(rc.lift_vec(lift)))
        jw = lambda b, j: Tw[b][0]@np.array(rig.J[j], float)+Tw[b][1]
        if f == LAND or 'arm_hold' not in cache:
            cache['arm_hold'] = {sd: dict(W=jw(f'forearm.{sd}', f'wrist.{sd}'), E=jw(f'upperarm.{sd}', f'elbow.{sd}'),
                                          H=rc.bone_transforms(rig.J, body, bones=B)[f'hand.{sd}'][0]) for sd in 'LR'}
        else:
            for sd in 'LR':
                h = cache['arm_hold'][sd]
                S = jw(f'upperarm.{sd}', f'shoulder.{sd}')
                l1 = float(np.linalg.norm(np.subtract(rig.J[f'elbow.{sd}'], rig.J[f'shoulder.{sd}'])))
                l2 = float(np.linalg.norm(np.subtract(rig.J[f'wrist.{sd}'], rig.J[f'elbow.{sd}'])))
                d = h['W']-S
                Dw = float(np.linalg.norm(d))
                D = min(Dw, (l1+l2)*(1-1e-6))
                u = d/Dw
                pp = (h['E']-S)-u*float(u@(h['E']-S))
                pp /= max(float(np.linalg.norm(pp)), 1e-12)
                ca = max(-1., min(1., (l1*l1+D*D-l2*l2)/(2*l1*D)))
                El = S+l1*(ca*u+math.sqrt(1-ca*ca)*pp)
                _aim_bone(rig, body, f'upperarm.{sd}', El-S)
                _aim_bone(rig, body, f'forearm.{sd}', S+u*D-El)
                Tf = rc.bone_transforms(rig.J, body, bones=B)[f'forearm.{sd}'][0]
                body[f'hand.{sd}'] = [float(v) for v in rc.euler_from_matrix(Tf.T@h['H'])]
        arm_low = min(float(cache['arm_parts'][sd].posed(body, lift)[:, 2].min()) for sd in ('L', 'R'))
    # the head: pitched only (profile), its world pitch on the head_pitch track (idle's own head turn eased out over the first
    # frames); fix pass 6: it turns toward E's only as the floor takes it (or past head_reach), then on head_land from the touchdown
    Wi = _world(rig, dict(ip, root=[0., 0., 0.]), 'head')
    hb = slerp_e(_euler(Wi), [tr('head_pitch'), 0., 0.], tr('head_idle'))
    we_ = _euler(cache['WE'])
    neck0 = list(body['neck'])

    def head_at(s_, n_=0.):
        body['neck'] = list(neck0)
        turn(body, 'neck', [n_, 0., 0.])
        Wn_ = _world(rig, body, 'neck')
        body['head'] = _euler(Wn_.T@rot(slerp_e(hb, we_, s_)))
        Ph = cache['head_parts'].posed(body, lift)
        return float(Ph[:, 2].min())-.0005, float(Ph[:, 1].min())-P['head_reach']

    def solve(lo, hi, ok):
        for _ in range(14):
            mid = .5*(lo+hi)
            if ok(mid):
                hi = mid
            else:
                lo = mid
        return hi
    s_head = max(cache['s_head'], tr('head_land'))
    # its front past head_reach: the chin tucks (the neck bends further, the head keeps its turn), up to neck_tuck_cap degrees
    tuck = 0.
    if s_head < 1 and head_at(s_head)[1] < 0:
        cap = min(tr('neck_tuck_cap'), cache.get('tuck', 0.)+P['neck_tuck_rate']*dt)
        tuck = solve(0., cap, lambda n_: head_at(s_head, n_)[1] >= 0)
    s_air = s_head
    if s_head < 1 and head_at(s_head, tuck)[0] < 0:
        s_head = solve(s_head, 1., lambda s_: head_at(s_, tuck)[0] >= 0)
    reach_turn = 0.
    if s_head < 1 and head_at(s_head, tuck)[1] < 0:
        s_floor = s_head
        s_head = solve(s_head, 1., lambda s_: min(head_at(s_, tuck)) >= 0)
        reach_turn = s_head-s_floor
    cache['s_head'] = s_head
    cache['tuck'] = tuck
    lift_neck = 0.
    if head_at(s_head, tuck)[0] < 0:
        # fix pass 6: on the floor with its turn done, a head that would go under it is held on it by the neck (it unbends)
        lift_neck = solve(0., -25., lambda n_: head_at(s_head, tuck+n_)[0] >= 0) if head_at(s_head, tuck-25.)[0] >= 0 else -25.
        tuck += lift_neck
    head_at(s_head, tuck)
    if f >= LAND and bo:
        turn(body, 'head', [-3., 0., 0.], tr('bounce_late'))
    # fix pass 6, the ears: as they stood in idle frame 0, in the world, until ear_sag starts; then each eased (its world
    # direction and its turn about its length) toward its rest turn in the world (set relative to the head as it lies at rest),
    # reached at the head's touchdown; while the head turns onto its jaw after it the ears hold still in the world (riding the
    # head through that turn swung them 35 degrees in two frames)
    ws = tr('ear_sag')
    if 'ear_rest' not in cache:
        # the rest ear's world turn: set relative to the head as it lies at rest (E's head pitch, in profile)
        q = dict(body)
        q['head'] = _euler(_world(rig, q, 'neck').T@cache['WE'])
        cache['ear_rest'] = ear_rest_world(rig, skin, q, ip)
        # fix pass 7: the rest ear's twist against the head (degrees, magnitude), the soft limit's start
        cache['ear_rest_twist'] = {}
        for sd in ('L', 'R'):
            set_ear_world(rig, skin, q, sd, *cache['ear_rest'][sd])
            cache['ear_rest_twist'][sd] = abs(ear_twist(rig, q, sd))+.05
    rest = cache['ear_rest']
    ear_info = {}
    for sd in ('L', 'R'):
        # (in two parts: from 11 it droops back in the picture's plane a quarter of the way (its elevation on ear_sag, lying back
        # 15 to 20 degrees over the skull's back line by 21), then from 20 it drops, splays and turns about its length to its rest
        # (ear_turn). Easing all three together from 11 opened the dish to the camera over the crown at 18 to 20; the shortest
        # turn laid it flat on the side of the skull at 20 to 22; swinging it all the way back first laid it over the crown at 17
        # to 21. Fix pass 7: the elevation eases in from 8 and the turn from 14, both to the rest by 25, then the twist limit)
        e0, e1 = cache['ear0'][sd], rest[sd]
        wt_ = tr('ear_turn')
        prm = (e0[0]+(e1[0]-e0[0])*ws,)+_lerp_params(e0[1:], e1[1:], wt_)
        if f > 0 and P.get('ear_plane'):
            # fix pass 10 (critic f9: at 15 to 18 the ear swung forward over the head showing its dish, then flipped flat at
            # 19): idle frame 0's own ear turn, swung only in the picture's plane (as rest A is), to the world elevation on
            # ear_el (the near ear; the far ear far_down lower as at rest), never closer to the skull's long axis than
            # ear_rel_min degrees; it trails the head: upright while the head hangs, back to rest A as the head turns onto
            # its jaw, then onto rest A's own turn on ear_rest_in
            for i in range(1, 5):
                body[f'ear_{i}.{sd}'] = list(cache['idle0'][0].get(f'ear_{i}.{sd}', [0., 0., 0.]))
            yh_ = _world(rig, body, 'head')@np.array([0., 1., 0.])
            ax_ = math.degrees(math.atan2(yh_[2], yh_[1]))
            el_ = max(tr('ear_el'), ax_+P['ear_rel_min'])-(P['far_down']*tr('ear_far_in') if sd == 'R' else 0.)
            ear_swing_to(rig, skin, body, sd, el_)
            if 'ear_yaw' in P:
                # fix pass 11 (critic f10: over 15 to 18 the ear pointed out at the camera and showed its concave inner face
                # as a scoop): ear_1 turned about the head's own vertical, the tip back toward the head's midline, so the
                # side camera sees its back and rim while it trails; 0 again by rest A (the far ear mirrored)
                yw = P['ear_yaw_deg']*tr('ear_yaw')*(1. if sd == 'L' else -1.)
                if yw:
                    body[f'ear_1.{sd}'] = _euler(rot([0., 0., yw])@rot(body[f'ear_1.{sd}']))
            ri = tr('ear_rest_in')
            if ri > 0:
                prm = _lerp_params(ear_world_params(rig, skin, body, sd), e1, ri)
                set_ear_world(rig, skin, body, sd, *prm)
            else:
                prm = ear_world_params(rig, skin, body, sd)
            wh_ = tr('ear_hang') if 'ear_hang' in P else 0.
            if wh_ > 0:
                # fix pass 12 (critic f11: over 8 to 17 the ear stood splayed 75 degrees out, pointing at the camera, so its
                # concave inner face showed as a scoop): relative to the head the ear eases to ear_hang_prm (above the skull's
                # long axis as rest A is, splayed less, turned about its length so the dish is edge-on to the camera: a clean
                # root with the rig as it is, ear_turn_dirs), held while the head hangs, and handed back over the head's turn
                # to rest so rest A follows unchanged
                h0 = ear_head_params(rig, skin, body, sd)
                h1 = P['ear_hang_prm']
                set_ear_head_params(rig, skin, body, sd, *(x+(y-x)*wh_ for x, y in zip(h0, h1)))
                prm = ear_world_params(rig, skin, body, sd)
                ear_info[sd+'hang'] = round(wh_, 3)
            ear_info[sd+'rel'] = round(el_-ax_, 2)
            ear_info[sd] = [round(x, 2) for x in prm]
            continue
        if f > 0:
            set_ear_world(rig, skin, body, sd, *prm)
            # fix pass 7: the ear's twist against the head past the rest's twist kept to ear_twist_keep of it (the ear turned
            # back about its own length; the rest frames' twists are under the rest's, so they are untouched)
            tw = ear_twist(rig, body, sd)
            c0 = cache['ear_rest_twist'][sd]
            if abs(tw) > c0:
                set_ear_twist(rig, skin, body, sd, math.copysign(c0+(abs(tw)-c0)*P['ear_twist_keep'], tw))
            ear_info[sd+'twist'] = round(tw, 2)
        ear_info[sd] = [round(x, 2) for x in prm]
    yh = _world(rig, body, 'head')@np.array([0., 1., 0.])
    ear_info['headAxis'] = round(math.degrees(math.atan2(yh[2], yh[1])), 2)
    # tails: each bone's world direction from idle's to E's, draped on the floor; idle's twist eases out
    tt = tr('tails')
    tE = tails_E_turned()
    tdir = {b: _slerp_dir(cache['tails0'][b], tE[b], tt) for b in cache['tails0']}
    tb = tr('bounce_late')
    if 'tail_bounce' in P:
        # fix pass 9: each tail bounces once off the floor on its own frame (a rigid lift about its fork, a, b, c a frame
        # apart), and drops on with the knee jolt
        for tn, dl in P['tail_bounce'].items():
            a_ = P['tail_bounce_deg']*tr('bounce_late', t-dl)+P.get('jolt_tail', 0.)*tr('jolt', t-dl)
            if a_:
                Rb = _axis_angle(np.array([1., 0., 0.]), a_)
                for k in range(1, rc.TAIL_BONES+1):
                    tdir[f'tail_{tn}{k}'] = Rb@tdir[f'tail_{tn}{k}']
    elif tb:
        tdir['tail_root'] = rot([P['bounce_tail'][0]*tb, 0., 0.])@tdir['tail_root']
    tl = tr('tail_lift')
    if tl:
        Rl = rot([P['tail_lift_deg']*tl, 0., 0.])
        tdir = {b: Rl@v for b, v in tdir.items()}
    if 'tail_splay' in P:
        # fix pass 10: tail a fans out from b about the vertical (toward the camera) while the trunk topples, so a and b do
        # not close on each other as they come down (they came to 32 to 48 mm apart at 15); (tail c fanned away the same
        # way met the far leg, 0.1 mm at 18 and 19)
        sp = P['tail_splay_deg']*tr('tail_splay')
        if sp:
            for tn, sg in P['tail_splay_tails']:
                Rz = _axis_angle(np.array([0., 0., 1.]), -sg*sp)
                for k in range(1, rc.TAIL_BONES+1):
                    tdir[f'tail_{tn}{k}'] = Rz@tdir[f'tail_{tn}{k}']
    if 'fur' not in cache:
        cache['fur'] = json.loads(Path(P['tail_fur_profile']).read_text())
    tbody = drape_tail_dirs(rig, dict(body), lift, tdir, P['tail_clear'], fur=cache['fur'], comp=P['tail_fur_comp'],
                            fur_from=P['tail_fur_from'])
    wt = min(1., tt/P['tail_twist_in'])
    for b in tdir:
        body[b] = slerp_e(ip.get(b, [0., 0., 0.]), tbody[b], wt)
    full, targets = kneel_legs(rig, skin, body, lift, heel, pole, curl)
    info = dict(time=round(t, 4), fall=round(fa, 4), tip=round(tp, 4), arms=round(tpa, 4), splay=round(splay, 4), armLow_mm=round(arm_low*1000, 2),
                neckTuck=round(tuck, 2), armHang=round(ah, 4), armFold=round(af, 4), heel=round(heel, 2), curl=round(curl, 2),
                headLand=round(s_head, 3), headAir=round(s_air, 3), reachTurn=round(reach_turn, 3), earSag=round(ws, 3), ears=ear_info,
                tails=round(tt, 3), bounce=round(bo, 4), armDrop=round(arm_drop, 4), armBuckle=round(buckle, 4), armGuard_mm=None if arm_guard is None else round(arm_guard*1000, 2), kneeLow_mm=round(kl*1000, 2), kneeFix_mm=round(knee_fix*1000, 2),
                kneePinDx=pinned, planted=dict(L=True, R=True), targets={sd: [round(float(x), 6) for x in targets[sd]] for sd in ('L', 'R')})
    breath = ib*(1-fa)
    fd_ = frame_dict(f, full, lift, breath, info, belly=breath)
    # fix pass 6: the hind claws' extra turn up about the toe joint (retracted), read by clip_frames.py
    fd_['claws'] = hind_claw_turns(rig, skin, full, lift)
    return fd_


def trunk_line_pitch(rig, f, tp):
    """Fix pass 9: the trunk's pitch (the pelvis-to-neck-base line, degrees forward of vertical in the side view) at frame f
    with the topple share tp on tip, round and slide, composed as faint4_frame composes the root, spine and chest."""
    P, K, E = FAINT4, FAINT4['K'], FAINT4['E']
    tr = lambda k: ac.track(P[k], float(f))
    ip, _, _ = cb.idle_pose(rig, f)
    fa = tr('fall')
    body = {b: list(ip.get(b, [0., 0., 0.])) for b in ('pelvis', 'spine', 'chest')}
    for b in ('spine', 'chest'):
        body[b] = slerp_e(slerp_e(body[b], K['body'].get(b, [0., 0., 0.]), fa), E['body'].get(b, [0., 0., 0.]), tp)
    for b, e in P['settle_rot'].items():
        turn(body, b, e, tr('settle'))
    for b, e in P['curl_rot'].items():
        turn(body, b, e, tr('curl'))
    body['root'] = slerp_e(slerp_e([0., 0., 0.], [K['pitch'], 0., 0.], fa), [E['pitch'], 0., 0.], tp)
    T = rc.bone_transforms(rig.J, body, bones=B)
    v = (T['chest'][0]@np.array(rig.J['neck_base'])+T['chest'][1])-(T['pelvis'][0]@np.array(rig.J['pelvis'])+T['pelvis'][1])
    return math.degrees(math.atan2(-v[1], v[2]))


def solve_topple(rig, f0, f1, length, kick=None, th1=None, after=(), sub=200, th_kick=None):
    """Fix pass 9: per-frame topple shares (dense keys for tip, round and slide) that make the trunk's pitch follow a slack
    trunk falling about its foot under gravity (theta'' = 3 g / (2 length) sin theta) from frame f0, where it carries on at the
    speed the drop gives it (no jump), to the chest's contact at f1 (share 1). At frame `kick` (the knees hitting the floor)
    the hips stop dead and the trunk is thrown forward: an added turning speed, solved so it reaches the frame-f1 pitch at f1.
    Each frame's share is solved so the composed pitch is the simulated one (the drop's own pitch from K and the knee jolt are
    in the composition), so the trunk gathers speed all the way to the chest. With th1 the contact pitch is given (the slumped
    trunk's chest meets the floor short of the rest's pitch) and `after` keys take the share on to 1 (the back flattening).
    Fix pass 10 (critic f9: at 12 to 14 it hung upright on its knees and the head's fall halved): with th_kick, the trunk is
    already tipping during the drop: it is given a push at f0 (an added turning speed, solved) so that it reaches th_kick
    degrees at the knee hit, then the kick is solved as before, so the topple never stalls at the knees.
    """
    th0 = trunk_line_pitch(rig, f0, 0.)
    th1 = trunk_line_pitch(rig, f1, 1.) if th1 is None else th1
    w_in = math.radians(th0-trunk_line_pitch(rig, f0-1, 0.))
    k = 3*9.81/(2*length)/900.
    kick = f1 if kick is None else kick
    push = 0.

    def run(dw, upto=None):
        th, w, out = math.radians(th0), w_in+push, [math.radians(th0)]
        for i in range(f1-f0 if upto is None else upto-f0):
            if f0+i == kick:
                w += dw
            for _ in range(sub):
                w += k*math.sin(th)/sub
                th += w/sub
            out.append(th)
        return out
    if th_kick is not None:
        lo, hi = 0., .3
        for _ in range(50):
            push = .5*(lo+hi)
            if run(0., kick)[-1] > math.radians(th_kick):
                hi = push
            else:
                lo = push
        push = .5*(lo+hi)
    lo, hi = 0., .6
    for _ in range(50):
        mid = .5*(lo+hi)
        if run(mid)[-1] > math.radians(th1):
            hi = mid
        else:
            lo = mid
    dw = .5*(lo+hi)
    target = [math.degrees(x) for x in run(dw)]
    keys = [(f0, 'linear', 0.)]
    for i in range(1, f1-f0+(1 if after else 0)):
        f = f0+i
        a, b = 0., 1.
        for _ in range(40):
            m = .5*(a+b)
            if trunk_line_pitch(rig, f, m) < target[i]:
                a = m
            else:
                b = m
        keys.append((f, 'linear', .5*(a+b)))
    keys += [tuple(k) for k in after] if after else [(f1, 'linear', 1.)]
    return keys, dict(th0=th0, th1=th1, w_in_deg=math.degrees(w_in), push_deg=math.degrees(push), kick_deg=math.degrees(dw),
                      target=[round(x, 2) for x in target])


def faint4_frames(rig, skin):
    if 'topple' in FAINT4:
        tp = FAINT4['topple']
        keys, info = solve_topple(rig, tp['f0'], tp['f1'], tp['length'], tp.get('kick'), tp.get('th1'), tp.get('after', ()),
                                  th_kick=tp.get('th_kick'))
        FAINT4['tip'] = FAINT4['round'] = FAINT4['slide'] = keys
        FAINT4['topple_solved'] = info
    cache = {}
    frames = [faint4_frame(rig, skin, f, cache) for f in range(FAINT4['still_from']+1)]
    # it lies still: frames still_from to the end are one pose
    for k in range(FAINT4['still_from']+1, FAINT4['frames']):
        frames.append(dict(frames[FAINT4['still_from']], frame=k))
    return frames


# ---------------------------------------------------------------- rig pass (2026-11-12): ear turn, neck fold, grip arm
# The pose-space keys (pose_space_corrective.py) are sculpted at these poses on the rest body (only the named bones turned): a key
# depends only on the turns of its centre bones relative to their parents, so the same keys serve any trunk or head. The ear turn
# board: the ear laid back and down `below` degrees under the skull's long axis (head +Y), splayed `splay` degrees out to its
# own side, its dish as the minimal swing from rest leaves it, then turned `turn` degrees about its own length, the dish going
# down and in, away from the side camera (+X for the near ear). The neck fold board: the neck bone flexed forward (+X) with the
# head straight on it.
EAR_TURN = dict(below=35., splay=25., turns=(), radius=20., board=(0., 20., 40., 60., 80.))
# (turns: the ear turn keys' sculpt turns; none are built. On the raw skin the board's turn about the ear's length collapses no
# ear-root triangle up to 70 degrees (3 at 80) and turning it in toward the midline about the head's vertical none up to 60; the
# mush keys sculpted at 20 to 80 collapsed 77 to 828 instead. Only a turn out toward the camera side about the head's vertical
# crushes the base's outer edge into the skull (30 at 40, 210 at 60), which neither a mush, a widened blend nor an edge-length
# relaxation target fixes, so the clips turn the ear about its length and inward. Measures: clipset2/rigpass/ear-turn-map.json)
NECK_FOLD = dict(angles=(60., 95., 130.), radius=35., board=(0., 45., 60., 95., 130.))
# grip arm keys: on the arm drawn back into the grip the rig's arm keys sculpted for other arm poses (the elbow mush keys at
# this bend most, armpit_fwd for the arm raised forward) put a sausage of lumps along the upper arm and a bulge at the elbow
# (with them switched off the arm is smooth but the inner elbow collapses 91 triangles); the grip keys are mush keys over the
# upper arm and elbow (mask: the skin weighted to the upper arm or forearm within 14 cm of the elbow, out 2 to 6 cm). (Taking the
# arm keys' effect back out instead left the bulge, or creased the elbow's front when half of it was taken out there.) Per
# side, centres picked from held's loop frames, farthest first, each at least a radius from the others (so
# along the loop no two keys add up past 1), until every loop frame is within half a radius of one; the distance is the root of
# the summed squares of the upper arm's, clavicle's and forearm's angles (every approved arm is 52 or more from every centre)
GRIP_ARM = dict(radius=20., bones=('upperarm', 'clavicle', 'forearm'),
                mask=dict(r0=.02, r1=.06, band_bones=['upperarm.{sd}', 'forearm.{sd}'], band_min=.3, near=['elbow.{sd}', .14],
                          part_bones=['upperarm.{sd}', 'forearm.{sd}', 'hand.{sd}', 'clavicle.{sd}', 'chest', 'spine']))


def grip_arm_frames(frames, sd):
    bones = [f'{b}.{sd}' for b in GRIP_ARM['bones']]
    q = lambda p, b: rc.quat_from_matrix(rc.euler_matrix(*p.get(b, (0, 0, 0))))
    dist = lambda p1, p2: math.sqrt(sum(rc.local_turn_deg(p1, b, q(p2, b))**2 for b in bones))
    r = GRIP_ARM['radius']
    cen = [0]
    while True:
        dd = [min(dist(f['pose'], frames[c]['pose']) for c in cen) for f in frames]
        far = int(np.argmax(dd))
        if dd[far] <= r/2:
            return sorted(cen)
        cand = [i for i in np.argsort(dd)[::-1] if all(dist(frames[i]['pose'], frames[c]['pose']) >= r for c in cen)]
        if not cand:
            return sorted(cen)
        cen.append(int(cand[0]))
# faint pass 12: neck keys on faint's own path where the head bends back on the folded neck as it turns to its rest (12 to 18,
# where the board's keys, sculpted with the head straight on the neck, are 0): one key a frame, the radius under the distance
# between neighbouring frames (18.3 to 24.2) and under f18's distance to the rest pose (22.4), so each frame takes its own key
# and the rest pose (Nick's ear rest A) none
NECK_FAINT = dict(frames=(12, 13, 14, 15, 16, 17, 18), radius=18., mush_share=1., mush_share_at={17: .5})
# (mush_share: the share of the smoothing on top of the neck curve; at .5 the neck creases at 12 to 18 counted 7/20, 18/40, 91/171,
# 60/171, 8/56, 7/48, 12/63 (turned over 90 and 60 degrees from the smoothed surface), at 1 0/0, 0/0, 0/0, 0/1, 7/15, 35/80, 4/9)


def ear_turn_dirs(skin, sd, below, splay, turn):
    """The ear's axis and dish normal in the head's frame for the ear turn board (see above)."""
    a, n0 = _ear_frames(skin)[sd]
    sx = 1. if sd == 'L' else -1.
    el, ps = math.radians(-below), math.radians(splay)
    d = np.array([sx*math.sin(ps), math.cos(ps)*math.cos(el), math.cos(ps)*math.sin(el)])
    n = rc.align_rotation(a, d)@n0
    return d, _axis_angle(d, sx*turn)@n


def ear_head_params(rig, skin, pose, sd):
    """(below, splay, turn) of a pose's ear in the head's frame, the inverse of ear_turn_dirs: degrees below the skull's long axis
    (negative above it), splayed toward its own side, turned about its length from the minimal swing's dish."""
    a, n0 = _ear_frames(skin)[sd]
    Wh, W1 = _world(rig, pose, 'head'), _world(rig, pose, f'ear_1.{sd}')
    d, n = Wh.T@W1@a, Wh.T@W1@n0
    sx = 1. if sd == 'L' else -1.
    nb = rc.align_rotation(a, d)@n0
    return (-math.degrees(math.atan2(d[2], d[1])), math.degrees(math.asin(max(-1., min(1., sx*d[0])))),
            sx*math.degrees(math.atan2(float(np.cross(nb, n)@d), float(nb@n))))


def set_ear_head_params(rig, skin, pose, sd, below, splay, turn):
    """ear_1 set from ear_head_params' (below, splay, turn) for the head as it is in `pose`."""
    set_ear_turn(rig, skin, pose, sd, below, splay, turn)


def set_ear_turn(rig, skin, pose, sd, below, splay, turn):
    """ear_1 set to the ear turn board's ear for the head as it is in `pose` (2 to 4 straight)."""
    Wh = rc.bone_transforms(rig.J, pose, bones=B)['head'][0]
    d, n = ear_turn_dirs(skin, sd, below, splay, turn)
    set_ear_dn(rig, skin, pose, sd, Wh@d, Wh@n)


def rigpass_poses(rig, skin):
    """(name, pose) for every board pose: ear turns (both ears turned together), neck folds."""
    out = []
    for t in EAR_TURN['board']:
        q = {}
        for sd in 'LR':
            set_ear_turn(rig, skin, q, sd, EAR_TURN['below'], EAR_TURN['splay'], t)
        out.append((f'ear_turn_{t:.0f}', q))
    for th in NECK_FOLD['board']:
        out.append((f'neck_fold_{th:.0f}', {'neck': [float(th), 0., 0.]}))
    return out


def rigpass_spec(rig, skin, grip_bake=None, faint_bake=None):
    """The pose-space key spec (pose_space_corrective.py): the ear turn keys per side at EAR_TURN['turns'], the neck fold keys at
    NECK_FOLD['angles'], and the grip arm keys per side at held's GRIP_ARM['frames'] (poses.json:frame)."""
    spec = []
    for sd in 'LR':
        for t in EAR_TURN['turns']:
            q = {}
            set_ear_turn(rig, skin, q, sd, EAR_TURN['below'], EAR_TURN['splay'], t)
            spec.append(dict(name=f'ear_turn_{t:.0f}.{sd}', group='ear_turn', side=sd, sculpt=dict(pose=ordered(q), lift=0.),
                             centre_bones=[f'ear_1.{sd}'], radius=EAR_TURN['radius'], target='mush',
                             label=f"rest body, ear laid back {EAR_TURN['below']:.0f} below the skull line, splayed {EAR_TURN['splay']:.0f}, "
                                   f"turned {t:.0f} about its length (dish away from the camera)"))
    for th in NECK_FOLD['angles']:
        spec.append(dict(name=f'neck_fold_{th:.0f}', group='neck_fold', side='C', sculpt=dict(pose={'neck': [float(th), 0., 0.]}, lift=0.),
                         centre_bones=['neck', 'head'], radius=NECK_FOLD['radius'], target='neck_curve', mush_share=.5,
                         label=f'rest body, neck flexed forward {th:.0f} degrees, head straight on the neck'))
    if faint_bake:
        for f in NECK_FAINT['frames']:
            spec.append(dict(name=f'neck_fold_faint_{f}', group='neck_fold', side='C', sculpt=f'{Path(faint_bake)/"faint"/"poses.json"}:{f}',
                             centre_bones=['neck', 'head'], radius=NECK_FAINT['radius'], target='neck_curve',
                             mush_share=NECK_FAINT['mush_share_at'].get(f, NECK_FAINT['mush_share']), label=f'faint frame {f} (pass 12 bake)'))
    if grip_bake:
        hf = json.loads((Path(grip_bake)/'held'/'poses.json').read_text())
        for sd in 'LR':
            for f in grip_arm_frames(hf, sd):
                spec.append(dict(name=f'grip_arm_{f}.{sd}', group='grip_arm', side=sd, sculpt=f'{Path(grip_bake)/"held"/"poses.json"}:{f}',
                                 centre_bones=[f'{b}.{sd}' for b in GRIP_ARM['bones']], radius=GRIP_ARM['radius'],
                                 target='mush', mask=GRIP_ARM['mask'],
                                 label=f'held loop frame {f}'))
    return spec


def bake_rigpass(rig_dir, out, rest=DEFAULT_REST, grip_bake=None, faint_bake=None):
    """The board poses as two clips (rigpass_ear, rigpass_neck) for clip_frames.py, and the key spec as pose-space-spec.json."""
    rig = ac.Rig(rig_dir)
    skin = SkinSampler(rig_dir, rest)
    out = Path(out)
    poses = rigpass_poses(rig, skin)
    for clip, pre in (('rigpass_ear', 'ear_turn_'), ('rigpass_neck', 'neck_fold_')):
        frames = [dict(frame=i, pose=ordered(q), lift=[0., 0., 0.], shapes=dict(breath=0., breath_belly=0.), info=dict(board=nm))
                  for i, (nm, q) in enumerate(p for p in poses if p[0].startswith(pre))]
        (out/clip).mkdir(parents=True, exist_ok=True)
        (out/clip/'poses.json').write_text(json.dumps(frames, indent=0))
        print('baked', clip, len(frames), flush=True)
    (out/'pose-space-spec.json').write_text(json.dumps(rigpass_spec(rig, skin, grip_bake, faint_bake), indent=1))


CLIPS = {'displaced': (displaced_frame, DISPLACED['frames']), 'held': (held_frame, HELD['frames']),
         'held_in': (held_in_frame, HELD['entry_frames']), 'held_out': (held_out_frame, HELD['exit_frames'])}
ORDER = ['displaced', 'held', 'held_in', 'held_out', 'faint']


def events():
    return {'displaced': [dict(name='impact', frame=DISPLACED['impact']), dict(name='settle', frame=DISPLACED['settle'])],
            'held': [], 'held_in': [], 'held_out': [], 'faint': [dict(name='down', frame=FAINT4['down'])]}


def bake(rig_dir, out, clips=None, rest=DEFAULT_REST):
    rig = ac.Rig(rig_dir)
    out = Path(out)
    clips = clips or ORDER
    for name in clips:
        if name == 'faint':
            frames = faint4_frames(rig, SkinSampler(rig_dir, rest))
        else:
            fn, n = CLIPS[name]
            frames = [fn(rig, f) for f in range(n)]
        (out/name).mkdir(parents=True, exist_ok=True)
        (out/name/'poses.json').write_text(json.dumps(frames, indent=0))
        print('baked', name, len(frames), flush=True)
    ev = events()
    spec = dict(fps=cp.FPS, rig=str(rig_dir), approvedClips='akinza_clips.py (idle, Night Stalk) and akinza_clipset_b1.py (hurt, evade, '
                'guard), unchanged',
                displaced=dict(frames=DISPLACED['frames'], loop=False, events=ev['displaced'], startsOn='idle frame 0', endsOn='idle frame 89',
                               params=DISPLACED),
                held=dict(frames=HELD['frames'], loop=True, events=[], seamFrame=HELD['frames'],
                          entry=dict(clip='held_in', frames=HELD['entry_frames'], rule="play held_in (its frame 0 is idle frame 0's pose and "
                                     "plays in its place; its last frame is loop frame 44's pose), then the loop from frame 0"),
                          exit=dict(clip='held_out', frames=HELD['exit_frames'], rule="the game finishes the current loop (frame 44), then "
                                    "plays held_out (its frame 0 is loop frame 0's pose and plays in its place; its last frame is idle frame "
                                    "89's pose), then idle from frame 0"),
                          params=dict(HELD=HELD, HELD_IN=HELD_IN, HELD_OUT=HELD_OUT, HELD_OUT_ARMS=HELD_OUT_ARMS)),
                faint=dict(frames=FAINT4['frames'], loop=False, events=ev['faint'], startsOn='idle frame 0',
                           endsOn=f"lying still (frames {FAINT4['still_from']} to {FAINT4['frames']-1} are one pose); the game holds the last frame",
                           cell=dict(front_px=FAINT_FRONT_PX, note='faint renders in a cell widened forward by front_px sprite pixels '
                                     '(clip_frames.py --front-px); at the atlas the other clips offsets and anchor shift right by it'),
                           params=dict(FAINT4=FAINT4, EAR_REST=EAR_REST)))
    (out/'clipset-spec.json').write_text(json.dumps(spec, indent=1, default=str))


def verify_approved(rig_dir, approved, b1_bake, scratch):
    """Re-bake idle and Night Stalk (akinza_clips.bake) and batch 1's clips (akinza_clipset_b1.bake) into scratch, each in a fresh
    interpreter under two different hash seeds, and compare the poses files' sha256 with the approved bake and batch 1's bake.
    (Fix pass 2: guard_in and guard_out now write their pose keys in sorted order, so no seed needs pinning; batch 1's stored
    guard_in and guard_out were re-written in that order once, their values checked equal.)"""
    import hashlib
    import os
    import subprocess
    scratch = Path(scratch)
    scratch.mkdir(parents=True, exist_ok=True)
    sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
    res = {}
    for seed in ('1', '2'):
        env = dict(os.environ, PYTHONHASHSEED=seed)
        subprocess.run([sys.executable, str(HERE/'akinza_clipset_b1.py'), 'verify-approved', str(rig_dir), str(approved), str(scratch/f'approved-{seed}')],
                       check=True, env=env, capture_output=True)
        subprocess.run([sys.executable, str(HERE/'akinza_clipset_b1.py'), 'bake', str(rig_dir), str(scratch/f'b1-{seed}')], check=True, env=env,
                       capture_output=True)
        for clip in ('idle', 'stalk'):
            res.setdefault(clip, dict(approved=sha(Path(approved)/clip/'poses.json')))[f'rebake_seed{seed}'] = sha(scratch/f'approved-{seed}'/clip/'poses.json')
        for clip in ('hurt', 'evade', 'guard', 'guard_in', 'guard_out'):
            res.setdefault(clip, dict(approved=sha(Path(b1_bake)/clip/'poses.json')))[f'rebake_seed{seed}'] = sha(scratch/f'b1-{seed}'/clip/'poses.json')
    for v in res.values():
        v['identical'] = v['approved'] == v['rebake_seed1'] == v['rebake_seed2']
    (scratch/'verify.json').write_text(json.dumps(res, indent=1))
    print(json.dumps({k: v['identical'] for k, v in res.items()}))
    return res


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('cmd', choices=['bake', 'setup', 'verify-approved', 'rigpass'])
    p.add_argument('rig', type=Path)
    p.add_argument('out', type=Path)
    p.add_argument('more', type=Path, nargs='*')
    p.add_argument('--clips', default=None)
    p.add_argument('--rest', type=Path, default=DEFAULT_REST)
    p.add_argument('--faint', default=None, help='the lying candidate for faint (K or S; default FAINT[candidate])')
    p.add_argument('--ear-rest', default=None, choices=sorted(EAR_REST), help="faint's rest ear (fix pass 6; default FAINT4['ear_rest'])")
    a = p.parse_args()
    if a.faint:
        FAINT['candidate'] = a.faint
    if a.ear_rest:
        FAINT4['ear_rest'] = a.ear_rest
    if a.cmd == 'setup':
        bake_setup(a.rig, a.out, a.rest, a.clips or 'K,S')
    elif a.cmd == 'rigpass':
        mo = [None if str(x) in ('-', '.') else x for x in a.more]+[None, None]
        bake_rigpass(a.rig, a.out, a.rest, mo[0], mo[1])
    elif a.cmd == 'bake':
        bake(a.rig, a.out, a.clips.split(',') if a.clips else None, a.rest)
    else:
        verify_approved(a.rig, a.out, a.more[0], a.more[1])
