"""Akinza clip set batch 2 as code: displaced, held (with held_in and held_out) and faint, side facing, 30 fps.

  python art/species-construction/anim/akinza_clipset_b2.py bake <rig dir> <out dir> [--clips displaced,held,held_in,held_out,faint]
      [--rest <rest skin npz>] [--faint K|S]
  python art/species-construction/anim/akinza_clipset_b2.py setup <rig dir> <out dir> [--rest <rest skin npz>] [--clips K,S]
  python art/species-construction/anim/akinza_clipset_b2.py verify-approved <rig dir> <approved bake dir> <batch 1 bake dir> <scratch dir>

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
    ears=[0, 0, 0, .45, .97, .97, .97, .97, .97, .97, .97, .97, .97, .8, .55, .3, .12, .03, 0, 0, 0],
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
# tether a loop (a forward lunge, a twist, an upward heave), uneven in timing and size, each a wind-up, a hard lunge that stops
# dead with a one-frame overshoot and snap back, a trembling hold with the shoulders hunched and a quick recoil; a low tremor and
# a panting breath between them; the elbows clamped to the ribs and the hands at the thighs, pushing out a little in each strain;
# the ears on stalk f18's line with a flick partway toward upright after each lunge; the tails lashing. Every term is periodic in
# 45 frames, so frame 45 equals frame 0.
HELD = dict(
    frames=45, entry_frames=6, exit_frames=10,
    # fix pass 2 (critic K1 to K6): a struggle against a tether, not a sway. The pin: the elbows clamped to the ribs the whole loop
    # (the upper arms 10 degrees in and no longer swung back, critic K3: the elbows flared back and the hands sat on the hips,
    # akimbo), the forearms a little forward and in so the hands lie at the thighs; the clavicles raised a little (the grip);
    # weight a little down and back, the trunk a touch forward
    # (setup: 9 and 6 degrees in left the arms 13 to 61 mm off the sides; 13 and 8, and 11 and 7, pressed them into the hips at
    # rest, 917 and 34 arm vertices inside; 10 and 6 lay them 7 mm off the hips at rest, 10 to 55 mm in the strains)
    pin={'upperarm.L': [-2., 10., 0.], 'upperarm.R': [-2., -10., 0.], 'forearm.L': [-14., 6., 0.], 'forearm.R': [-14., -6., 0.],
         'hand.L': [0., 0., 0.], 'hand.R': [0., 0., 0.], 'clavicle.L': [0., -2., 0.], 'clavicle.R': [0., 2., 0.],
         'pelvis': [5., 0., 0.], 'spine': [3., 0., 0.], 'chest': [2., 0., 0.]},
    lift=(0., .012, -.03),
    level_head={'neck': [-6., 0., 0.], 'head': [-8., 0., 0.]},       # (4 degrees chin-up: the f18 line then needs less ear swing)
    # the ears draw Night Stalk f18's line on screen (rule 1) but turn no more than `ear_cap` degrees from f18's own pose relative
    # to the head (setup: with the head's jerks the full line needed up to 44 degrees beyond f18 and folded the ear root 547
    # against the approved 50; capped at 4 degrees it folded 53 to 78)
    ear_cap=1.,
    # (fix pass 2: where the head's chin-up asks for less swing than f18's, the line is followed up to ear_inside degrees: capped
    # at 1 degree either way the ears stood 13 to 25 degrees off the line in the lunges)
    ear_inside=20.,
    # strains against the tether, each: a wind-up the other way (wind frames), a hard lunge (2 frames) to a one-frame overshoot,
    # a dead stop that snaps back a little (the end of the tether), a trembling hold (hold frames, the tremor below) with the
    # shoulders hunched, then a quick recoil past rest and a settle. Start frame t0, size k; the moves at full size: lean (trunk
    # pitch, + forward), twist (chest and spine yaw, + toward the camera), bend (side bend), rise (root up, m), fwd (root forward,
    # m), shrug (clavicle raise, degrees, near and far), head pitch (- chin up) and yaw, hands (the hands pushing out against the
    # bind, degrees of forearm)
    strains=[
        dict(name='forward lunge', t0=1, wind=2, hold=5, k=1.0, lean=14., twist=0., bend=0., rise=0., fwd=.035, shrug=(-6., -6.),
             head_pitch=-6., head_yaw=0., hands=5.),
        dict(name='twist', t0=15, wind=2, hold=4, k=.9, lean=4., twist=-20., bend=-6., rise=.0, fwd=-.01, shrug=(-3., -7.),
             head_pitch=-3., head_yaw=10., hands=4.),
        dict(name='upward heave', t0=29, wind=2, hold=6, k=.8, lean=-6., twist=6., bend=3., rise=.035, fwd=0., shrug=(-8., -8.),
             head_pitch=-8., head_yaw=-6., hands=3.),
    ],
    # the profile of a strain (share of its full size) by frame from its start: wind-up to -.25, lunge to 1.15 in 2 frames, the stop
    # snaps back to .95, the hold, the recoil to -.1 in 2 frames and a settle in 2 more
    wind_share=-.25, overshoot=1.15, stop=.95, recoil=-.1,
    # the trembling hold: 1.3 degrees of trunk and .8 of clavicle at a 2.5-frame period (about 2 px at 192, 6 to 8 at 720 at the
    # head); between the strains a low tremor (.3 of it) and a panting breath (6 a loop) keep every frame moving
    tremor=dict(period=2.5, trunk=2.2, shoulder=.8, rest=.3, neck=.25),
    # the arms' counter-turns that keep the elbows at the ribs and the hands at the thighs: the upper arm takes back all of the
    # clavicle's raise (without it the elbows stood 15 to 20 mm further off the ribs and the hands 70 to 100 mm off the thighs in
    # the strains) and a fifth of the trunk's lean (the arms bound to the ribs move with the trunk; taking back most of the lean
    # hung them plumb, the hands swinging 40 to 60 mm forward off the thighs)
    arm_counter=dict(lean=.2, shrug=1.),
    pant=dict(cycles=6, key=.35),
    # the ears flick partway toward upright (the share of f18's sweep drops by `flick`) 1.5 frames after each lunge, and back
    ear_flick=.3, ear_lag=1.5,
    # the feet shift on the spot: the near foot steps 5 cm forward after the twist and back after the heave, each one lift, one
    # carry and one set-down, flat (a flat foot lifted 3 cm cannot dip its toes under the floor: critic K6); the far heel lifts in
    # the forward lunge. Per foot: (frame, dy, dz, pitch) keys, linear between, periodic
    near_foot=[(0, 0., 0., 0.), (20, 0., 0., 0.), (21, -.02, .03, 0.), (22, -.045, .03, 0.), (23, -.05, 0., 0.), (36, -.05, 0., 0.),
               (37, -.03, .03, 0.), (38, -.005, .03, 0.), (39, 0., 0., 0.), (45, 0., 0., 0.)],
    far_foot=[(0, 0., 0., 0.), (3, 0., 0., 0.), (4, 0., 0., 9.), (5, 0., 0., 14.), (10, 0., 0., 14.), (12, 0., 0., 6.), (14, 0., 0., 0.),
              (45, 0., 0., 0.)],
    # tails lash: per tail, a lift and a yaw wave per bone (degrees at the tip bone, falling toward the root), whole cycles a
    # loop, a lag down each chain; plus a whip with each strain
    tail_waves={'a': dict(cycles=3, lift=9., yaw=11., phase=0.), 'b': dict(cycles=2, lift=8., yaw=13., phase=.3),
                'c': dict(cycles=3, lift=7., yaw=10., phase=.6)},
    tail_lag_f=1.4, tail_whip_deg=10.,
)


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


def _strain_profile(u, st):
    """A tether strain's share of its full size at frame u from its start (0 outside it): (share, holding: 0 or 1)."""
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


def held_loop_body(rig, f):
    """Held loop frame f (periodic in 45): body pose (no legs), root move, feet specs, breath, info."""
    P = HELD
    n = P['frames']
    pose = {}
    for b, e in P['pin'].items():
        turn(pose, b, e)
    for b, e in P['level_head'].items():          # rule 1: the head level in the world under the pin's forward trunk
        turn(pose, b, e)
    lift = np.asarray(P['lift'], float).copy()
    sts = held_strains(f, n)
    ln = tw = bd = hp = hy = hands = 0.
    sh = [0., 0.]
    holding = 0.
    for st, (v, hold) in zip(P['strains'], sts):
        ln += v*st['lean']
        tw += v*st['twist']
        bd += v*st['bend']
        hp += v*st['head_pitch']
        hy += v*st['head_yaw']
        hands += max(0., v)*st['hands']
        sh[0] += max(0., v)*st['shrug'][0]
        sh[1] += max(0., v)*st['shrug'][1]
        lift = lift+v*np.array([0., -st['fwd'], st['rise']])
        holding = max(holding, hold)
    # the tremor: full in a hold, low between the strains; a 2.5-frame period, so no two frames match
    T = P['tremor']
    tr = math.sin(2*math.pi*f/T['period'])*(1. if holding else T['rest'])
    turn(pose, 'pelvis', [.3*ln, 0., 0.])
    turn(pose, 'spine', [.4*ln, .5*bd, .4*tw])
    turn(pose, 'chest', [.3*ln+T['trunk']*tr, .5*bd, .6*tw])
    cl = {'L': sh[0]-T['shoulder']*abs(tr), 'R': -sh[1]+T['shoulder']*abs(tr)}      # the clavicles' raise (Y; - raises the near one)
    turn(pose, 'clavicle.L', [0., cl['L'], 0.])
    turn(pose, 'clavicle.R', [0., cl['R'], 0.])
    # the elbows stay clamped to the ribs and the hands at the thighs through the strains: the upper arms take back the shrug's
    # outward swing (the clavicle's raise carries the elbow out 2.8 mm a degree) and a little of the trunk's lean; the hands
    # push out against the bind from the elbow (the forearm only) and snap back
    ca = P['arm_counter']
    turn(pose, 'upperarm.L', [-ca['lean']*ln, -ca['shrug']*cl['L'], 0.])
    turn(pose, 'upperarm.R', [-ca['lean']*ln, -ca['shrug']*cl['R'], 0.])
    turn(pose, 'forearm.L', [0., -hands, 0.])
    turn(pose, 'forearm.R', [0., hands, 0.])
    # rule 1: the head's world orientation first: the neck and head take the trunk's lean back out, so the head's world pitch is
    # the strain's own (chin up only: a chin-down head needs the ear past f18's swing and folds the ear root), and the head turns
    # against the trunk's twist so its world turn stays small and away from the camera
    turn(pose, 'neck', [.4*hp-.5*ln-T['neck']*T['trunk']*tr, 0., .4*hy-.4*tw])
    turn(pose, 'head', [.6*hp-.5*ln, 0., .6*hy-.2*tw])
    # the ears on stalk f18's line, flicking partway toward upright 1.5 frames after each lunge
    lag = [max(0., v) for v, _ in held_strains(f-P['ear_lag'], n)]
    lead = [max(0., v) for v, _ in held_strains(f-P['ear_lag']-1, n)]
    flick = sum(max(0., a-b) for a, b in zip(lag, lead))                 # the lunge's rise, a frame and a half late
    e = 1.-min(P['ear_flick'], P['ear_flick']*flick/.6)
    ear_line_capped(rig, pose, e, P['ear_cap'], inside=P['ear_inside'])
    whip = sum(abs(v) for v, _ in sts)
    for t in rc.TAILS:
        wv = P['tail_waves'][t]
        for k in range(1, rc.TAIL_BONES+1):
            u = (f-P['tail_lag_f']*(k-1))/n*wv['cycles']+wv['phase']
            g = (k+1)/(rc.TAIL_BONES+1)
            turn(pose, f'tail_{t}{k}', [g*(wv['lift']*math.sin(2*math.pi*u)+P['tail_whip_deg']*whip*(1 if t != 'c' else -1)*.6), 0.,
                                         g*wv['yaw']*math.sin(2*math.pi*u+1.3)])
    nf = _keys_periodic(P['near_foot'], f, n)
    ff = _keys_periodic(P['far_foot'], f, n)
    feet = {'L': dict(t=(0., nf[0], nf[1]), pitch=nf[2], pivot='toe' if nf[1] < .003 else 'ankle'),
            'R': dict(t=(0., ff[0], ff[1]), pitch=ff[2], pivot='toe')}
    planted = {'L': bool(nf[1] < .003), 'R': True}
    pant = .5-.5*math.cos(2*math.pi*P['pant']['cycles']*f/n)
    breath = P['pant']['key']*pant+.4*holding                               # a panting breath, a caught one in each hold
    return pose, lift, feet, breath, dict(strains=[round(v, 4) for v, _ in sts], holding=holding, flick=round(1-e, 3), tremor=round(tr, 3),
                                          planted=planted)


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
# held_in (6 frames, from idle frame 0): the arms snap to the sides in two frames (a small overshoot inward), the body jolts
# down and back with them, the ears go back, the tails flare a frame behind; it arrives on loop frame 44's pose at frame 5, so
# loop frame 0 follows
HELD_IN = {'arms': [0., .9, 1.1, 1.02, 1., 1.], 'body': [0., .6, 1., 1., 1., 1.], 'ears': [0., .7, 1., 1., 1., 1.],
           'tails': [0., .25, .6, .85, .97, 1.], 'jolt': [0., 1., .55, .2, .05, 0.]}
HELD_IN_JOLT = (0., .02, -.03)            # root (x, y back, z) at the jolt's peak, on top of the blend
# fix pass 2 (critic K5): the seize in 1 to 2 frames: the shoulders snap up, the elbows snap in to the ribs (the arms' share above),
# the trunk jerks and compresses, the ears flatten fast; at the jolt's peak, on top of the blend
HELD_IN_SNAP = {'clavicle.L': [0., -9., 0.], 'clavicle.R': [0., 9., 0.], 'spine': [5., 0., 0.], 'chest': [4., 0., 0.], 'neck': [-3., 0., 0.],
                'head': [-4., 0., 0.]}
# held_out (10 frames, from loop frame 0's pose, played in place of it after loop frame 44): it shakes free: the arms burst
# out from the sides and the trunk shakes, then everything eases into idle on the clock that lands on idle frame 89 at 9
HELD_OUT = {'idle': [0., .05, .18, .38, .6, .78, .9, .97, .995, 1.], 'ears': [0., .1, .3, .52, .72, .86, .94, .98, .995, 1.],
            'burst': [0., .7, 1., .75, .4, .15, .04, 0., 0., 0.], 'shake': [0., 8., -9., 5., -2.5, 1., 0., 0., 0., 0.]}
HELD_OUT_ARMS = {'upperarm.L': [-18., -30., 0.], 'upperarm.R': [-14., 26., 0.], 'forearm.L': [-22., 0., 0.], 'forearm.R': [-18., 0., 0.]}


def held_in_frame(rig, k):
    n = HELD['frames']
    e = {g: v[k] for g, v in HELD_IN.items()}
    ip, ilift, ib = cb.idle_pose(rig, k)
    hp, hlift, hfeet, hb, hinfo = held_loop_body(rig, k-HELD['entry_frames'])
    pose = cb.blend_poses(ip, hp, lambda b: e[held_group(b)])
    for b, d in HELD_IN_SNAP.items():
        turn(pose, b, d, e['jolt'])
    ear_line_capped(rig, pose, e['ears'], HELD['ear_cap'], inside=HELD['ear_inside'])
    lift = (1-e['body'])*ilift+e['body']*hlift+e['jolt']*np.asarray(HELD_IN_JOLT)
    feet = _blend_feet(IDLE_FEET, hfeet, e['body'])
    full, targets = cb.solve_feet(rig, pose, lift, feet)
    info = dict(shares={g: round(v, 4) for g, v in e.items()}, idleClock=k, heldFrame=(k-HELD['entry_frames']) % n,
                planted=dict(L=True, R=True), targets={sd: [round(float(x), 6) for x in targets[sd]] for sd in 'LR'})
    return frame_dict(k, full, lift, (1-e['body'])*ib+e['body']*hb, info, belly=(1-e['body'])*ib)


def held_out_frame(rig, k):
    m = HELD['exit_frames']
    e = {g: v[k] for g, v in HELD_OUT.items()}
    hp, hlift, hfeet, hb, hinfo = held_loop_body(rig, k)
    phase = IDLE_N-1-(m-1)+k
    ip, ilift, ib = cb.idle_pose(rig, phase)
    pose = cb.blend_poses(hp, ip, lambda b: e['idle'] if held_group(b) != 'ears' else e['ears'])
    for b, d in HELD_OUT_ARMS.items():
        turn(pose, b, d, e['burst'])
    turn(pose, 'chest', [0., 0., e['shake']])
    turn(pose, 'neck', [0., 0., -.5*e['shake']])
    ear_line_capped(rig, pose, 1-e['ears'], HELD['ear_cap'], toward=ip, inside=HELD['ear_inside'])
    lift = (1-e['idle'])*hlift+e['idle']*ilift
    feet = _blend_feet(hfeet, IDLE_FEET, e['idle'])
    full, targets = cb.solve_feet(rig, pose, lift, feet)
    info = dict(shares={g: round(v, 4) for g, v in e.items()}, idleClock=phase, heldFrame=k, planted=dict(L=True, R=True),
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
# forward and tips over them, gathering speed under gravity, the head a frame behind the trunk and the arms two; the tails swing
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
    # ease): the knees fold down first (the legs), the trunk and root tip forward over them with a gravity ease and land on 27,
    # the head a frame behind landing with them, the arms 2 frames behind and down on 28, the ears and tails settling by 30
    # (the legs hold the crouch's fold while the whole body tips forward over the toes, so the knees go down to the floor without
    # folding past the crouch's approved bend and nothing rises; blending the legs toward the lying pose from the start opened the
    # knees and stood the body up, the chest rising to 655 mm)
    # (the root's forward pitch carries the whole body over on one gravity ease; the trunk's own bend, the head and the legs come
    # later, so nothing straightens up on the way down: with the trunk blended from the start the head rose 40 mm at 13 to 17)
    fall={'root': (0., 27, 'in'), 'hips': (0., 25., 'in'), 'feet': (0., 24., 'out'), 'feet_roll': (0., 25., 'linear'), 'body': (5., 27, 'smooth'),
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
            shares[g] = cp.ease(kind, min(1., max(0., (f-fb-lag)/(end-fb-lag))))
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

CLIPS = {'displaced': (displaced_frame, DISPLACED['frames']), 'held': (held_frame, HELD['frames']),
         'held_in': (held_in_frame, HELD['entry_frames']), 'held_out': (held_out_frame, HELD['exit_frames'])}
ORDER = ['displaced', 'held', 'held_in', 'held_out', 'faint']


def events():
    return {'displaced': [dict(name='impact', frame=DISPLACED['impact']), dict(name='settle', frame=DISPLACED['settle'])],
            'held': [], 'held_in': [], 'held_out': [], 'faint': [dict(name='down', frame=FAINT['down'])]}


def bake(rig_dir, out, clips=None, rest=DEFAULT_REST):
    rig = ac.Rig(rig_dir)
    out = Path(out)
    clips = clips or ORDER
    for name in clips:
        if name == 'faint':
            frames = faint_frames(rig, SkinSampler(rig_dir, rest))
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
                faint=dict(frames=FAINT['frames'], loop=False, events=ev['faint'], startsOn='idle frame 0',
                           endsOn='lying still (frames 31 to 35 are one pose); the game holds the last frame', candidate=FAINT['candidate'],
                           params=dict(FAINT=FAINT, LIMP_KNEEL=LIMP_KNEEL, LIE_PITCH=LIE_PITCH, LIE_EARS=LIE_EARS, LIE_TAIL_X1=LIE_TAIL_X1,
                                       LIE_DRAPE=LIE_DRAPE)))
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
    p.add_argument('cmd', choices=['bake', 'setup', 'verify-approved'])
    p.add_argument('rig', type=Path)
    p.add_argument('out', type=Path)
    p.add_argument('more', type=Path, nargs='*')
    p.add_argument('--clips', default=None)
    p.add_argument('--rest', type=Path, default=DEFAULT_REST)
    p.add_argument('--faint', default=None, help='the lying candidate for faint (K or S; default FAINT[candidate])')
    a = p.parse_args()
    if a.faint:
        FAINT['candidate'] = a.faint
    if a.cmd == 'setup':
        bake_setup(a.rig, a.out, a.rest, a.clips or 'K,S')
    elif a.cmd == 'bake':
        bake(a.rig, a.out, a.clips.split(',') if a.clips else None, a.rest)
    else:
        verify_approved(a.rig, a.out, a.more[0], a.more[1])
