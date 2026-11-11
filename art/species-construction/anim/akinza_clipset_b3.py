"""Akinza clip set batch 3 as code: move (a run loop, with move_in and move_out), act.light (a one-arm claw swipe) and act.heavy
(a two-arm hop and slam), side facing, 30 fps.

  python art/species-construction/anim/akinza_clipset_b3.py bake <rig dir> <out dir> [--clips move,move_in,move_out,light,heavy]
  python art/species-construction/anim/akinza_clipset_b3.py setup <rig dir> <out dir>
  python art/species-construction/anim/akinza_clipset_b3.py verify-approved <rig dir> <approved bake> <batch 1 bake> <batch 2 bake> <scratch dir>

Built beside the approved idle and Night Stalk (akinza_clips.py), batch 1 (akinza_clipset_b1.py) and batch 2
(akinza_clipset_b2.py): this module imports their rig, idle layers, ear line and helpers and changes none of them.
`verify-approved` re-bakes all of them with their own modules in fresh interpreters under two hash seeds and compares the
poses files' sha256 with the stored bakes.

Frames use batch 1's format (per frame: pose, lift, shapes, info), written in the rig's bone order (batch 2's `ordered`).
Rig space: metres, +Z up, the creature faces -Y, its left (+X) is the near side to the side camera. A positive X rotation
pitches a bone's front down (a hanging arm or leg swings back, a tail lifts, a foot's heel rises).

The feet: batch 1's solve_feet turns a foot about the front of its toe pads; here (foot_target3, solve_feet3) the foot turns
about CONTACT, the hind claws' lowest point (the claws reach 2.5 cm past the toe skin, so on its toes Akinza stands on them),
so a foot on its toes rolls about the point that touches the floor and nothing of it dips under the floor. A foot spec is
{t: (dx, dy, dz) the contact point's move from its rest place, pitch: degrees (+ the heel up, the toes down)}; every foot gets
that world pitch (the ankle bends to it), the legs by the rig's own two-bone IK with the fixed hinge planes. The arms in the acts
are hinges too (hinged_arm: the elbow bends only in its rest plane, the upper arm's twist set by where the forearm bends).

move (24-frame loop, `foot_down` 0 near, 12 far; travel 1.248 m a loop): a light two-legged run on the toes. Each foot is down
on frames 0 to 7 of its phase, moving straight back at 52 mm a frame with the heel up 22 to 46 degrees; both feet are off on 8
to 11 and 20 to 23; the swing foot follows on back, folds under the hip and paws back onto the floor at the ground speed. The
hips bob 4.6 cm (lowest 2.5 frames after each touchdown, highest in the flight), the trunk leans 30 degrees forward (mostly
the chest), the pelvis turns and rolls with the legs, the head is held level, the arms are low and close with a small swing
against the legs, the ears half back with a dip after each contact, the tails lifted toward the horizontal and bobbing behind
the body on their own phases. move_in (6) is the lean and a first push off the far foot, the near foot landing on loop frame
0; move_out (8) is a braking step on the near foot, the far foot setting down beside it, rising into idle frame 89.
light (27, `hit` 11, `recover` 21): the near arm's claw swipe. heavy (42, `hit` 19, `recover` 33): a dip, a rise onto the
toes with both arms raised, a small hop, both claws struck down on the landing, a held squash, the recovery.
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
turn, rot, slerp_e, table = cb.turn, cb.rot, cb.slerp_e, cb.table


# ---------------------------------------------------------------- frozen from akinza_clipset_b2.py
# Fix pass 4 (the orchestrator): batch 2's builder is still editing akinza_clipset_b2.py, so the three helpers this module used
# from it are copied here as they stood at commit bf326b31, and the module no longer imports it; batch 2's edits cannot change
# these clips.

def ordered(pose):
    """The pose in the rig's bone order (deterministic bytes), floats only."""
    return {b: [float(x) for x in pose[b]] for b in NAMES if b in pose}


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


LEG_BASES = ('thigh', 'shin', 'foot')

# the foot's contact point at rest (rig metres, y and z; x is the ankle's): the hind claws' lowest point, 2.8 mm over the floor at
# rest (the claws reach 2.5 cm past the toe skin). Measured on the rest skin and claws (export_rigid_parts.py): with the heel up
# 10 to 40 degrees this point is the foot's lowest, and to 55 degrees nothing dips more than 0.3 mm under it; turned about the
# toe skin's front instead, the claws went 7 to 13 mm into the floor at 30 to 50 degrees
CONTACT = dict(y=-.0879, z=.0028)
ON_FLOOR = -CONTACT['z']                     # the contact point's move (z) that sets it on the floor


def frame_dict(f, pose, lift, breath, info, belly=None):
    return cb.frame_dict(f, ordered(pose), lift, breath, info, belly)


def periodic(keys, f, n):
    """A periodic key track [(frame, value), ...] over n frames (the first key's frame <= 0 < n), smooth (Catmull-Rom)
    between keys; f may be any real."""
    ks = sorted(keys)
    xs = [k for k, _ in ks]
    vs = [v for _, v in ks]
    m = len(ks)
    f = f % n
    ext_x = [xs[-1]-n]+xs+[xs[0]+n, xs[1]+n]
    ext_v = [vs[-1]]+vs+[vs[0], vs[1]]
    for i in range(1, m+1):
        x0, x1 = ext_x[i], ext_x[i+1]
        if x0 <= f <= x1 or (i == m and f >= x0):
            u = (f-x0)/(x1-x0)
            p0, p1, p2, p3 = ext_v[i-1], ext_v[i], ext_v[i+1], ext_v[i+2]
            t0, t1, t2, t3 = ext_x[i-1], x0, x1, ext_x[i+2]
            m1 = (p2-p0)/(t2-t0)*(x1-x0)
            m2 = (p3-p1)/(t3-t1)*(x1-x0)
            h00, h10, h01, h11 = 2*u**3-3*u**2+1, u**3-2*u**2+u, -2*u**3+3*u**2, u**3-u**2
            return h00*p1+h10*m1+h01*p2+h11*m2
    return vs[0]


def hermite(p0, p1, m0, m1, u):
    h00, h10, h01, h11 = 2*u**3-3*u**2+1, u**3-2*u**2+u, -2*u**3+3*u**2, u**3-u**2
    return h00*p0+h10*m0+h01*p1+h11*m1


# ---------------------------------------------------------------- feet

def foot_target3(J, sd, spec):
    """Ankle target and the foot's world rotation for a foot spec {t, pitch} about CONTACT (see the module note)."""
    A0 = np.array(J[f'ankle.{sd}'], float)
    th = float(spec.get('pitch', 0.))
    Rf = rot([th, 0., 0.])
    pv = np.array([A0[0], CONTACT['y'], CONTACT['z']])
    return pv+Rf@(A0-pv)+np.asarray(spec.get('t', (0., 0., 0.)), float), Rf


def solve_feet3(rig, body, lift, feet):
    """Body pose (no legs), root move and a foot spec per side -> full pose and the ankle targets (every foot set to its
    spec's world pitch)."""
    targets, Rfs = {}, {}
    for sd in 'LR':
        targets[sd], Rfs[sd] = foot_target3(rig.J, sd, feet.get(sd, {}))
    pose = rc.plant_legs(rig.J, body, np.asarray(lift, float), {sd: targets[sd].tolist() for sd in 'LR'}, rig.poles, bones=B)
    T = rc.bone_transforms(rig.J, pose, bones=B, root_translate=tuple(rc.lift_vec(lift)))
    for sd in 'LR':
        pose[f'foot.{sd}'] = rc.euler_from_matrix(T[f'shin.{sd}'][0].T@Rfs[sd])
    return pose, targets


def contact_world(J, sd, spec):
    """Where the foot's contact point is in the world for a foot spec."""
    A0 = np.array(J[f'ankle.{sd}'], float)
    return np.array([A0[0], CONTACT['y'], CONTACT['z']])+np.asarray(spec.get('t', (0., 0., 0.)), float)


# ---------------------------------------------------------------- head and ears

def head_world(rig, pose):
    """The head's world pitch (+ chin down: the top tipped forward) and yaw (+ the face turned toward +X, the camera)."""
    Wh = rc.bone_transforms(rig.J, pose, bones=B)['head'][0]
    up, fw = Wh@np.array([0., 0., 1.]), Wh@np.array([0., -1., 0.])
    return math.degrees(math.atan2(-up[1], up[2])), math.degrees(math.atan2(fw[0], -fw[1]))


def set_head_world(rig, pose, pitch=0., yaw=0., bone='neck'):
    """Turn `bone` (in its parent's frame) so the head's world pitch and yaw are the given ones (rule 1: the head's world
    orientation first). Two passes (the pitch and yaw corrections interact a little)."""
    for _ in range(3):
        p, y = head_world(rig, pose)
        if abs(p-pitch) < 1e-4 and abs(y-yaw) < 1e-4:
            break
        turn(pose, bone, [-(p-pitch), 0., 0.], pre=True)
        p, y = head_world(rig, pose)
        turn(pose, bone, [0., 0., -(y-yaw)], pre=True)


# ---------------------------------------------------------------- move (the run loop)

# Research note (brief): the emu steps every 6 of its frames with each foot down about two thirds of the step and a short flight;
# touchdown ahead of the hip, the leg sweeping back and opening at toe-off, the shank folding under the body in swing; the trunk
# nearly level and lowest just after touchdown. The basilisk leans its trunk and streams its tail straight back; the cheetah
# holds its head level and its tail streams back, bobbing behind the body. Applied below at a step every 12 frames.
MOVE = dict(
    frames=24, step=12, stance=8,              # each foot down on its phase's frames 0 to 7, both off on 8 to 11 (and 20 to 23)
    foot_down=(0, 12),                         # the near (L) foot touches on frame 0, the far (R) on frame 12
    phase={'L': 0, 'R': 12},
    # fix pass 2 (critic: upright and prancing): a longer stride, 58 mm a frame (1.74 m/s; contact 0.41 m a step), the foot
    # landing further ahead
    speed=.058,
    # (fix pass 3: 20 mm further back than fix pass 2's -.095, so the pushing leg can straighten behind the body)
    mid_y=-.075,                               # the contact point's y at mid-stance (between the 4th and 5th planted frames)
    # the heel's pitch over the stance (phase frame, degrees): landing on the claws with the heel a little up, then the push-off
    # rolling onto the toes (heel 50 to 62 degrees up at frames 6 and 7) as the leg extends
    # (fix pass 3: the heel rises later, 52 degrees at the toe-off, so the leg is long when the toes roll off last)
    stance_pitch=[(0, 12.), (2, 14.), (4, 20.), (5, 26.), (6, 36.), (7, 52.)],
    # the swing (phase frames 7 to 24): the contact point's height and the foot's pitch, smooth keys; its y is a Hermite curve from
    # the toe-off to the next touchdown with the ground speed at both ends, plus swing_dy. Fix pass 2: the heel tucks high under
    # the hip right after the toe-off (the heel 160 to 260 mm up, 68 to 110 px at 720, on frames 8 to 11) while the thigh stays
    # back, then the thigh swings forward with the leg folded (the knee 85 at most, under the deep keys' 88) and the leg reaches
    # ahead bent; the foot's pitch kept low in the air (late swing 9 to 12) so the ankle points 32 degrees at most (the heel
    # ridge evade showed comes at 40)
    # Fix pass 3 (the critic: the heel dropped as the foot passed under the body, a shin hanging under a raised knee): the foot held
    # high and behind the hip through the pass (the contact 130 to 135 mm up and 60 mm back on phase frames 12 to 16, the foot in line
    # with the shin, pointing 15 to 21 degrees), so the heel stays 96 to 101 px up at 720 under the body with the knee folded (to 92,
    # knee_deep_mid on a little) and the thigh only part way forward; then the shin unfolds forward for the contact (pointing 20 to 23
    # degrees in the late swing)
    swing_z=[(7, 0.), (8, .045), (9, .08), (10, .105), (11, .12), (12, .13), (14, .135), (15, .135), (16, .13), (17, .12), (18, .105), (19, .09), (20, .078),
             (21, .064), (22, .042), (23.2, .014), (24, 0.)],
    swing_pitch=[(7, 52.), (8, 58.), (9, 60.), (10, 60.), (12, 58.), (14, 55.), (16, 50.), (17, 44.), (18, 36.), (19, 24.), (20, 12.), (21, 6.), (22, 5.),
                 (23, 7.), (24, 12.)],
    swing_dy=[(7, 0.), (9, .03), (11, .05), (13, .06), (15, .06), (17, .035), (19, .015), (20, .03), (21, .04), (22, .035), (23, .02), (24, 0.)],
    # the hips (root move, z): the bob, lowest about 2.5 frames after each touchdown, highest in the flight (step frames)
    # (fix pass 3: the hips rise 64 mm into the toe-off, so the pushing leg straightens behind the body, knee 13 degrees from rest at
    # the last contact frame against 50 before, and settle before the touchdown so the reaching leg gets there)
    bob=[(0, 0.), (2.5, -.02), (4.5, .008), (6., .042), (7., .064), (8., .06), (9., .044), (10, .024), (11, .008), (12, 0.)],
    root_y=0.,
    # fix pass 2: the trunk leaned 27 to 28 degrees forward of vertical (the pelvis joint to the neck's base), the head held level
    # in the world (the neck takes .38 of the lean, the head the rest). (Measured on the folds: the spine past 10 folds the belly,
    # approved 0; the neck taking .45 of a 36-degree lean folded it 46 to 53 against the approved 44; the pelvis at 16 folded the
    # tail fork 62 at a push, taken out by the tail root turned down 11 and toward the pushing leg 6, below)
    # (fix pass 3: the pelvis 12, the chest 14: with the pushing leg straight behind, a 16 degree pelvis folded the tail fork 63
    # against the approved 52; the trunk 25 degrees)
    lean={'pelvis': 12., 'spine': 10., 'chest': 14.},
    lean_bob=.5,                              # the trunk pitches a little further forward as it sinks (degrees at the bottom)
    pelvis_yaw=4., chest_counter=.8,
    # the pelvis rolls 8 degrees toward the swing side, taken back half by the chest and half by the neck
    pelvis_roll=9., roll_back={'chest': .5, 'neck': .5},
    neck_share=.38, head_nod=1.2, head_nod_lag=2.,             # a small nod of the head (degrees, world) 2 frames behind the bob
    tail_root_turn=(-8., -1., 0.),
    # arms (fix pass 2): low with the elbows bent (55 to 70 degrees of swing), pumping 25 degrees either way against the same-side
    # leg (the near arm back with the near leg forward, frame 0)
    upper_back=6., upper_out=5., fore_bend=-62., hand_bend=-8.,
    arm_swing=25., fore_swing=8., arm_lag=1.,
    # ears (fix pass 2, the critic: half way along the sweep the ear stood level and broadside, a held cap): on stalk f18's line
    # on screen at .94 of the sweep, lagging .03 either way a frame or two after each contact
    ears=.94, ear_dip=.03, ear_lag=2., ear_cap=1., ear_inside=20.,      # (fix pass 2's pinned line, kept for the record; unused)
    # ears (fix pass 3, the art director's 'ears half back', F44): tipped back 40 degrees from upright on screen (idle 16), the share
    # .11 of the sweep from idle's ear to f18's line, a rigid bounce of .03 (6 to 7 degrees, never near horizontal) lagging each
    # foot_down by 2 frames
    # (fix pass 5, the critic: the ears moved with the body: their furthest-back point now 2 frames after the body's lowest, 4.5
    # frames after each foot_down)
    ears_half=.11, ear_bounce=.03, ear_bounce_lag=4.5,
    # tails: lifted toward the horizontal (degrees per bone, +X lifts; bones 2 and 3 also take back the tail root's turn down),
    # bobbing behind the body on their own phases (fix pass 2: 1.3 frames apart they bobbed together). The tips' low points (their
    # height on screen, the body's bob included) fall on frames 3 and 16 (a), 6 and 19 (b), 9 and 23 (c): 3 frames apart, found by
    # a search over the lags (the body's bob holds the top tail's low on 3 whatever its own lag). The first bone takes half the bob
    # (the full bob there folded the tail fork 53 against the approved 52)
    tail_lift={'a': (0., 3., 3., 0., 2.), 'b': (2., 12., 12., 4., 1.), 'c': (3., 17., 16., 6., 3.)},
    # (fix pass 3: the hips' larger bob carried all three tips down together, so each tail's own bob is larger, 9 to 11 degrees, the
    # lows on frames 4 and 15 (a), 9 and 23 (b), 1 and 11 (c), 3 frames apart at least; the first bone takes .3 of it)
    # (fix pass 5, the critic: the bottom tail (c) bobbed in phase with the body: its low points now 2.5 frames after the body's
    # lowest, on 5 and 17, a frame or two after the top tail's)
    tail_bob={'a': 9., 'b': 10., 'c': 11.}, tail_bob_lag={'a': 1., 'b': 4., 'c': 2.5}, tail_chain_lag=1.1, tail_bob_root=.3,
    tail_sway={'a': 2.5, 'b': 3.5, 'c': 3.}, tail_sway_phase={'a': 0., 'b': .37, 'c': .71},
    pant=.3,
)


_IDLE0 = {}


def idle0(rig):
    """Idle frame 0's body pose (the run's ears are set from its ear on screen)."""
    if id(rig) not in _IDLE0:
        _IDLE0[id(rig)] = cb.idle_pose(rig, 0)[0]
    return _IDLE0[id(rig)]


def move_feet(f):
    """Per side, the foot spec at loop frame f and whether it is planted."""
    P = MOVE
    n, v = P['frames'], P['speed']
    out, planted = {}, {}
    for sd in 'LR':
        p = (f-P['phase'][sd]) % n
        y0 = P['mid_y']-CONTACT['y']-v*3.5           # the contact point's move from rest at touchdown (phase frame 0)
        if p <= P['stance']-1:
            ty = y0+v*p
            tz = ON_FLOOR
            pitch = periodic_clamped(P['stance_pitch'], p)
            planted[sd] = True
        else:
            u = (p-(P['stance']-1))/(n-(P['stance']-1))
            ty = hermite(y0+v*(P['stance']-1), y0+n*0., v*(n-(P['stance']-1)), v*(n-(P['stance']-1)), u)
            ty += periodic_clamped(P.get('swing_dy', [(7, 0.), (24, 0.)]), p)     # (fix pass 2) the heel kick back, 0 at both ends
            tz = periodic_clamped(P['swing_z'], p)+ON_FLOOR
            pitch = periodic_clamped(P['swing_pitch'], p)
            planted[sd] = False
        out[sd] = dict(t=(0., ty, tz), pitch=pitch)
    return out, planted


def periodic_clamped(keys, f):
    """A smooth (Catmull-Rom) key track [(frame, value), ...] over its own range, held outside it."""
    if f <= keys[0][0]:
        return keys[0][1]
    if f >= keys[-1][0]:
        return keys[-1][1]
    return _cr(keys, f)


def _cr(keys, f):
    xs = [k for k, _ in keys]
    vs = [v for _, v in keys]
    for i in range(len(keys)-1):
        if xs[i] <= f <= xs[i+1]:
            x0, x1 = xs[i], xs[i+1]
            u = (f-x0)/(x1-x0)
            p0 = vs[i-1] if i > 0 else vs[i]-(vs[i+1]-vs[i])
            t0 = xs[i-1] if i > 0 else x0-(x1-x0)
            p3 = vs[i+2] if i+2 < len(vs) else vs[i+1]+(vs[i+1]-vs[i])
            t3 = xs[i+2] if i+2 < len(xs) else x1+(x1-x0)
            m1 = (vs[i+1]-p0)/(x1-t0)*(x1-x0)
            m2 = (p3-vs[i])/(t3-x0)*(x1-x0)
            return hermite(vs[i], vs[i+1], m1, m2, u)
    return vs[-1]


def move_body(rig, f):
    """Move loop frame f (periodic in 24): body pose (no legs), root move, breath, info."""
    P = MOVE
    n, st = P['frames'], P['step']
    w1 = 2*math.pi*f/n                                   # one cycle a loop (L touchdown at 0)
    bob = periodic(P['bob'], f % st, st)
    bob_min = min(v for _, v in P['bob'])
    sink = (bob-max(v for _, v in P['bob']))/(bob_min-max(v for _, v in P['bob']))     # 0 at the top, 1 at the bottom
    pose = {}
    for b, d in P['lean'].items():
        turn(pose, b, [d+(P['lean_bob']*sink if b != 'pelvis' else 0.)*.5, 0., 0.])
    # the pelvis turns with the legs (its near side forward with the near leg, frame 0) and rolls toward the swing side; the
    # chest turns against it
    yaw = P['pelvis_yaw']*math.cos(w1)
    roll = P['pelvis_roll']*math.sin(w1)
    turn(pose, 'pelvis', [0., roll, -yaw])
    turn(pose, 'chest', [0., -P['roll_back']['chest']*roll, P['chest_counter']*yaw*1.6])
    turn(pose, 'neck', [0., -P['roll_back']['neck']*roll, 0.], pre=True)
    # arms: back against the near leg (the near arm back when the near leg is forward, frame 0)
    for sd, sg in (('L', 1.), ('R', -1.)):
        ph = math.cos(2*math.pi*(f-P['arm_lag'])/n)*(1. if sd == 'L' else -1.)
        turn(pose, f'upperarm.{sd}', [P['upper_back']+P['arm_swing']*ph, sg*-P['upper_out'], 0.])
        turn(pose, f'forearm.{sd}', [P['fore_bend']-P['fore_swing']*ph, 0., 0.])
        turn(pose, f'hand.{sd}', [P['hand_bend'], 0., 0.])
    # the head level in the world with a small nod behind the bob, facing straight ahead: the neck takes back a share of the
    # lean, the head the rest (the guard's split: all of it in the neck folded the neck 53 against the approved 44)
    turn(pose, 'neck', [-P['neck_share']*sum(P['lean'].values()), 0., 0.])
    nod = P['head_nod']*(periodic(P['bob'], (f-P['head_nod_lag']) % st, st)-bob_min)/(max(v for _, v in P['bob'])-bob_min)
    set_head_world(rig, pose, pitch=-nod+P['head_nod']*.5, yaw=0., bone='head')
    # ears (fix pass 2): on Night Stalk f18's line on screen (the approved pinned ear, rule 1), a small rigid lag around it after each
    # contact; capped at 1 degree past f18's own pose relative to the head (batch 2: past it the ear root folds)
    e = P['ears_half']+P['ear_bounce']*math.cos(2*math.pi*((f % st)-P['ear_bounce_lag'])/st)
    cb.set_ear_line(rig, pose, e, toward=idle0(rig))
    # tails: lifted toward the horizontal, bobbing behind the body on their own phases, swaying side to side once a loop
    for t in rc.TAILS:
        for k in range(1, rc.TAIL_BONES+1):
            g = (k+1)/(rc.TAIL_BONES+1)*(P.get('tail_bob_root', 1.) if k == 1 else 1.)
            lag = P['tail_bob_lag'][t]+P['tail_chain_lag']*(k-1)
            bb = math.cos(2*math.pi*((f-lag) % st)/st-2*math.pi*2.5/st)       # the body's sink, lagged
            sw = math.sin(2*math.pi*((f-P['tail_chain_lag']*(k-1))/n+P['tail_sway_phase'][t]))
            turn(pose, f'tail_{t}{k}', [P['tail_lift'][t][k-1]-g*P['tail_bob'][t]*bb, 0., g*P['tail_sway'][t]*sw])
    # (fix pass 2) the tail root turned down and in a little: with the pelvis leaned 16 degrees the near leg's push folded the tail
    # fork 62 against the approved 52
    tx, ty_, tz_ = P.get('tail_root_turn', (0., 0., 0.))
    turn(pose, 'tail_root', [tx, ty_*math.cos(2*math.pi*(f-7)/n), tz_])     # the side turn follows the pushing leg (near at 7, far at 19)
    lift = np.array([0., P['root_y'], bob])
    breath = P['pant']*(.5-.5*math.cos(2*math.pi*2*f/n))
    return pose, lift, breath, dict(bob=round(bob, 5), sink=round(sink, 4), ears=round(e, 4), yaw=round(yaw, 3))


def move_frame(rig, f):
    body, lift, breath, info = move_body(rig, f)
    feet, planted = move_feet(f)
    full, targets = solve_feet3(rig, body, lift, feet)
    info.update(planted=planted, feet={sd: dict(t=[round(float(x), 6) for x in feet[sd]['t']], pitch=round(float(feet[sd]['pitch']), 4))
                                       for sd in 'LR'},
                targets={sd: [round(float(x), 6) for x in targets[sd]] for sd in 'LR'},
                contact={sd: [round(float(x), 6) for x in contact_world(rig.J, sd, feet[sd])] for sd in 'LR'})
    return frame_dict(f, full, lift, breath, info)


def move_travel():
    """The declared travel per loop: the ground speed times the loop's 24 frames (two steps), metres."""
    return round(MOVE['speed']*MOVE['frames'], 4)


# ---------------------------------------------------------------- move_in and move_out

def _lin(vals, x):
    """A per-frame list read at a fractional frame (linear between frames, held outside)."""
    if x <= 0:
        return vals[0]
    if x >= len(vals)-1:
        return vals[-1]
    i = int(math.floor(x))
    return vals[i]+(vals[i+1]-vals[i])*(x-i)


# move_in (6 frames, from idle frame 0; loop frame 0 follows). Fix pass 2 (the critic: both feet up while the knees still bent, a
# float, and the ears a held level cap): both feet stay down and flat through the dip (frames 1 and 2), moving back with the ground;
# the near (L) foot steps off on 3 and swings ahead to land on loop frame 0; the far (R) foot stays planted through 4 (fix pass 5),
# its heel rising as the leg extends behind the body (the push), and leaves the floor on 5, kicking up behind into its loop path. The
# only frame with both feet up is 5, the run's own flight before the touchdown. The ears go to the
# run's line on screen in two frames (passing through the sweep's middle once, on frame 1). The ground under the planted feet speeds
# up from still to the run's speed (the game ramps the sprite's speed over the entry).
MOVE_IN = dict(
    frames=6,
    # the ground's move back under a planted foot from frame 0 (metres; the speed rises from 0 to the run's by frame 4)
    ground=lambda k: MOVE['speed']*min(k, 4.)**2/8.+MOVE['speed']*max(0., k-4.),
    # the body: the share of the way from idle (on idle's clock from frame 0) to the run (the loop body at frame k-6)
    body=[0., .1, .25, .5, .78, .93],
    # (fix pass 5, the critic: in3 and in4 were a small two-footed hop: the far toes stay down through 4 with the leg extending,
    # knee 10 degrees from rest at 4, the hips rising 45 mm into it; the near foot steps higher and further at 3)
    # (fix pass 6, the critic: the head rose 18 px above idle's at in4 and dropped 35 px into loop frame 0, a pop up rather than a
    # drive forward: the hips 28, 35 and 24 mm lower on 3, 4 and 5, the head top 67, 61 and 72 px down at 720 (idle's 65, loop f0's
    # 81), the far knee bending 35 degrees at 4 as it pushes)
    dip=[0., -.012, -.02, -.022, .01, .006],        # the anticipation's dip and the push's rise (root z, m), on top of the blend
    ears=[0., .3, .6, .85, 1., 1.],                 # shares of the run's own ear set (the loop's at frame k-6; fix pass 3: half back)
    # the near (L) foot: planted on 0 to 2 (flat, the heel lifting 8 degrees on 2), then (frame, contact move y, height, pitch)
    near_planted=3, near_pitch=[0., 0., 8.],
    near_air=[(3, -.11, .1, 28.), (4, -.19, .085, 20.), (5, -.215, .03, 13.)],
    # the far (R) foot: planted on 0 to 4, the heel rising as the leg extends (the push), then its path off the floor
    far_planted=5, far_pitch=[0., 0., 6., 20., 40.],
    far_air=[(5, .25, .11, 58.)],
)


def move_in_frame(rig, k):
    P = MOVE_IN
    n = P['frames']
    e = P['body'][k]
    ip, ilift, ib = cb.idle_pose(rig, k)
    lp, llift, lb, linfo = move_body(rig, (k-n) % MOVE['frames'])
    pose = cb.blend_poses(ip, lp, lambda b: e)
    # the head: the blend's own, eased onto the loop's world orientation by the body share (frame 0 stays idle frame 0's head)
    p0, y0 = head_world(rig, pose)
    pl, yl = head_world(rig, lp)
    set_head_world(rig, pose, pitch=(1-e)*p0+e*pl, yaw=(1-e)*y0+e*yl, bone='head')
    # the ears: from idle's onto the run's line on screen (frame 1 the one frame through the sweep's middle)
    s = P['ears'][k]
    if s > 0:
        cb.set_ear_line(rig, pose, s*linfo['ears'], toward=idle0(rig))
    lift = (1-e)*np.asarray(ilift)+e*np.asarray(llift)+np.array([0., 0., P['dip'][k]])
    g = P['ground'](k)
    feet, planted = {}, {}
    for sd, n_down, pitches, air in (('L', P['near_planted'], P['near_pitch'], P['near_air']),
                                     ('R', P['far_planted'], P['far_pitch'], P['far_air'])):
        if k < n_down:
            pt = pitches[k]
            feet[sd] = dict(t=(0., g, ON_FLOOR*min(1., pt/10.)), pitch=pt)
            planted[sd] = True
        else:
            a = {a_[0]: a_[1:] for a_ in air}[k]
            feet[sd] = dict(t=(0., a[0], a[1]+ON_FLOOR), pitch=a[2])
            planted[sd] = False
    full, targets = solve_feet3(rig, pose, lift, feet)
    info = dict(share=e, ground_m=round(g, 5), planted=planted, idleClock=k, loopFrame=(k-n) % MOVE['frames'], ears=round(s*linfo['ears'], 4),
                feet={sd: dict(t=[round(float(x), 6) for x in feet[sd]['t']], pitch=round(float(feet[sd]['pitch']), 4)) for sd in 'LR'},
                targets={sd: [round(float(x), 6) for x in targets[sd]] for sd in 'LR'})
    return frame_dict(k, full, lift, (1-e)*ib+e*lb, info, belly=(1-e)*ib)


# move_out (10 frames, from loop frame 0's pose; idle frame 0 follows). Fix pass 2: a braking pull-up instead of running poses that
# stand up. Fix pass 3 (the critic: the body snapped upright in two frames, the head moving 47 and 65 px a frame; lengthened to 10
# frames as the brief allows): the near (L) foot, landing on loop frame 0 well ahead, stays down and takes the weight, its heel
# lowering flat by frame 2 with the body still behind it, leaning back over it to brake; the trunk straightens over frames 1 to 5
# and leans back past upright on 5 to 7, then settles; the knee gives (the hips sink 26 mm by 4); the arms come forward a little to
# catch the balance; the tails, still carried forward, lift and settle; the far (R) foot swings through low and sets down beside on 6.
# The run's pose is held from loop frame 0 and blended into idle (the clock that lands on idle frame 89 on the last frame). The ground
# under the planted feet slows from the run's speed to still over 9 frames (the game slows the sprite over the exit), so the planted
# feet end on their idle spots. The ears hold the run's half-back set through frame 2, then come up to idle's over 3 to 7.
MOVE_OUT = dict(
    frames=10,
    body=[0., .08, .2, .36, .54, .7, .83, .93, .985, 1.],     # the share of the way from loop frame 0's body (held) to idle
    back=[0., -1., -3., -6., -9., -13., -15., -9., -2.5, 0.],  # the lean back (degrees over the trunk) on top of the blend
    back_split={'pelvis': .3, 'spine': .3, 'chest': .4},
    brake=[0., -.006, -.014, -.022, -.026, -.022, -.014, -.006, -.002, 0.],    # the planted leg giving (root z, m)
    arms=[0., .2, .5, .8, 1., .8, .5, .2, .05, 0.],                    # the arms' forward catch (share of brake_arm, local degrees)
    brake_arm={'upperarm': -12., 'forearm': -10.},
    # the tails' lift (share of tail_deg per bone), each tail later than the last; done by frame 8 with every lag
    tails=[0., .25, .7, 1., .75, .35, -.08, 0., 0., 0.],
    tail_deg=(2., 4., 6., 7., 8.), tail_order={'a': 0., 'b': .4, 'c': .8}, tail_chain_lag=.25,
    ears=[1., 1., 1., .8, .55, .3, .12, 0., 0., 0.],     # the run's ear set (loop frame 0's) released into idle's
    near_pitch=[12., 6., 2., 0., 0., 0., 0., 0., 0., 0.],      # the near heel lowering flat
    # the far (R) foot: (contact move y, height, pitch) in the air from its loop frame 0 path; y None: down, moving with the ground
    far=[None, (.215, .12, 52.), (.155, .10, 42.), (.095, .075, 30.), (.04, .045, 18.), (-.005, .018, 8.), (None, 0., 2.), (None, 0., .5),
         (None, 0., 0.), (None, 0., 0.)],
)


def move_out_ground(k):
    """The ground's move back under the planted feet from frame 0 (metres): from the run's speed to still over the clip's last 9
    frames, ending where the near foot's loop touchdown spot reaches its idle spot."""
    D = -(MOVE['mid_y']-CONTACT['y']-MOVE['speed']*3.5)
    u = min(1., k/(MOVE_OUT['frames']-1.))
    return D*(1-(1-u)**2)


def move_out_frame(rig, k):
    P = MOVE_OUT
    n = P['frames']
    e = P['body'][k]
    lp, llift, lb, linfo = move_body(rig, 0)
    phase = IDLE_N-1-(n-1)+k
    ip, ilift, ib = cb.idle_pose(rig, phase)
    pose = cb.blend_poses(lp, ip, lambda b: e)
    for b, sh in P['back_split'].items():
        turn(pose, b, [P['back'][k]*sh, 0., 0.])
    for ab, d in P['brake_arm'].items():
        for sd in 'LR':
            turn(pose, f'{ab}.{sd}', [d*P['arms'][k], 0., 0.])
    for t in rc.TAILS:
        for j in range(1, rc.TAIL_BONES+1):
            v = _lin(P['tails'], k-P['tail_order'][t]-P['tail_chain_lag']*(j-1))
            turn(pose, f'tail_{t}{j}', [P['tail_deg'][j-1]*v, 0., 0.])
    # the head: held level, from the loop's world orientation to idle frame 89's by the body share (the neck takes the lean back)
    pi_, yi_ = head_world(rig, ip)
    pl, yl = head_world(rig, lp)
    set_head_world(rig, pose, pitch=e*pi_+(1-e)*pl, yaw=e*yi_+(1-e)*yl, bone='head')
    # the ears: the run's own line and flick carried on (the loop's share at frame k, so the ear tips do not stop dead on frame 1),
    # released into idle's from frame 3
    s = P['ears'][k]
    ek = MOVE['ears_half']+MOVE['ear_bounce']*math.cos(2*math.pi*((k % MOVE['step'])-MOVE['ear_bounce_lag'])/MOVE['step'])
    if s >= 1:
        cb.set_ear_line(rig, pose, ek, toward=idle0(rig))
    else:
        cb.set_ear_line(rig, pose, ek*s, toward=ip)
    lift = (1-e)*np.asarray(llift)+e*np.asarray(ilift)+np.array([0., 0., P['brake'][k]])
    loop_feet, _ = move_feet(0)
    g = move_out_ground(k)
    D = move_out_ground(n-1)
    pt = P['near_pitch'][k]
    feet = {'L': dict(t=(0., -D+g, ON_FLOOR*min(1., pt/10.)), pitch=pt)}
    fr_ = P['far'][k]
    if fr_ is None:
        feet['R'] = loop_feet['R']
        r_planted = False
    else:
        ty, tz, pitch = fr_
        if ty is None:                      # down: moving back with the ground onto its idle spot
            r_planted = True
            feet['R'] = dict(t=(0., -(D-g), ON_FLOOR*min(1., pitch/10.)), pitch=pitch)
        else:
            r_planted = False
            feet['R'] = dict(t=(0., ty, tz+ON_FLOOR), pitch=pitch)
    full, targets = solve_feet3(rig, pose, lift, feet)
    info = dict(share=e, ground_m=round(g, 5), planted=dict(L=True, R=r_planted), idleClock=phase, loopFrame=0, ears=round(ek*s, 4),
                feet={sd: dict(t=[round(float(x), 6) for x in feet[sd]['t']], pitch=round(float(feet[sd]['pitch']), 4)) for sd in 'LR'},
                targets={sd: [round(float(x), 6) for x in targets[sd]] for sd in 'LR'})
    return frame_dict(k, full, lift, (1-e)*lb+e*ib, info, belly=e*ib)


# ---------------------------------------------------------------- acts (light and heavy)

ACTS = {}
ARM_BONES = ('upperarm', 'forearm', 'hand')


def mirror(d):
    return (-d[0], d[1], d[2])


def _frame(x, y):
    x = np.asarray(x, float)/np.linalg.norm(x)
    y = np.asarray(y, float)-x*(x@np.asarray(y, float))
    y /= np.linalg.norm(y)
    return np.stack([x, y, np.cross(x, y)], 1)


def axis_angle(axis, deg):
    k = np.asarray(axis, float)/np.linalg.norm(axis)
    th = math.radians(deg)
    K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
    return np.eye(3)+math.sin(th)*K+(1-math.cos(th))*K@K


def hinged_arm(rig, body, side, d1, pole, elbow, wrist=0.):
    """One arm set as a hinge (the elbow bends only in its rest plane, as rig_core.hinged_leg does for the knee): the upper arm to
    world direction d1 with its elbow's bend plane turned to contain `pole` (the forearm bends toward it), the elbow bent `elbow`
    degrees from straight (its rest bend is about 27), the wrist `wrist` degrees further about the same hinge (+ bends it the elbow's
    way). Returns the upper arm, forearm and hand local rotations. (pose_from_directions turns each bone by the shortest arc, which
    can swing the forearm sideways off the hinge: a wind-up posed that way swung the elbow 94 degrees for a 73 degree bend.)"""
    J = rig.J
    u1 = rc.bone_axis(J, f'upperarm.{side}', B)
    u2 = rc.bone_axis(J, f'forearm.{side}', B)
    b_rest = u2-u1*(u1@u2)
    n_rest = np.cross(u1, u2)
    rest_bend = math.degrees(math.acos(max(-1., min(1., float(u1@u2)))))
    Rp = rc.bone_transforms(J, {k: v for k, v in body.items() if not k.startswith(('upperarm', 'forearm', 'hand'))}, bones=B)[f'clavicle.{side}'][0]
    Rt = _frame(d1, pole)@_frame(u1, b_rest).T
    out = {f'upperarm.{side}': [float(x) for x in rc.euler_from_matrix(Rp.T@Rt)]}
    out[f'forearm.{side}'] = [float(x) for x in rc.euler_from_matrix(axis_angle(n_rest, elbow-rest_bend))]
    out[f'hand.{side}'] = [float(x) for x in rc.euler_from_matrix(axis_angle(n_rest, wrist))]
    return out


def chest_arm_pose(rig, body, side, key):
    """An arm key {d1, pole, elbow, wrist} with its directions in the chest's frame (x out to the near side for the left arm, -y
    forward, +z up; the right arm's mirrored), posed on the body pose."""
    Rc = rc.bone_transforms(rig.J, body, bones=B)['chest'][0]
    m = (lambda d: np.asarray(d, float)) if side == 'L' else (lambda d: np.asarray(mirror(d), float))
    d1 = Rc@m(key['d1'])
    pole = Rc@m(key['pole'])
    return hinged_arm(rig, body, side, d1/np.linalg.norm(d1), pole, key['elbow'], key.get('wrist', 0.))


def chain_pose(keys, c, lead=None):
    """Local rotations along a chain of keyed poses (dicts bone -> Euler) at chain position c (0 .. len-1): slerp between the
    two keys either side. lead {bone base: p}: that bone runs ahead within each step (its share 1-(1-u)^(1+p)), so the elbow reaches
    its next bend early (between keys the elbow's bend passed slowly through the range just under where rig-p8b's elbow keys turn
    on, 25 to 30 degrees, and folded 1 to 3 elbow triangles against the approved 0)."""
    i = max(0, min(len(keys)-2, int(math.floor(c))))
    u = c-i
    out = {}
    for b in keys[i]:
        p = (lead or {}).get(rc.base_of(b), 0.)
        ub = 1-(1-u)**(1+p) if p and 0 < u < 1 else u
        out[b] = slerp_e(keys[i][b], keys[i+1][b], ub)
    return out


ELBOW_GAP = (24., 32.)


def skip_elbow_gap(rig, side, e, gap=ELBOW_GAP):
    """The forearm's local rotation (a pure turn about the elbow's hinge, hinged_arm) moved out of the band of swing where the
    rig's elbow keys are still off but the crease has formed: rig-p8b's elbow_mush_mid starts at 30 degrees of swing, and frames
    passing at 25 to 31 folded 3 to 7 upper-arm triangles by the elbow against the approved 0. The swing is snapped to the nearer
    edge of `gap` (a change of at most 4 degrees on one frame of a fast move)."""
    J = rig.J
    u1 = rc.bone_axis(J, f'upperarm.{side}', B)
    u2 = rc.bone_axis(J, f'forearm.{side}', B)
    n = np.cross(u1, u2)
    n /= np.linalg.norm(n)
    R = rot(e)
    q = rc.quat_from_matrix(R)
    q = q if q[0] >= 0 else -q
    th = math.degrees(2*math.atan2(float(np.dot(q[1:], n)), float(q[0])))
    if gap[0] < abs(th) < gap[1]:
        th = math.copysign(gap[0] if abs(th)-gap[0] < gap[1]-abs(th) else gap[1], th)
        return [float(x) for x in rc.euler_from_matrix(axis_angle(n, th))]
    return e


def act_idle_part(rig, P, f):
    """The idle layer under an act: idle's clock from idle frame 0 at weight idle_a, the clock that lands on idle frame 89 at the
    act's last frame at weight idle_b (batch 2's displaced)."""
    n = P['frames']
    wa, wb = ac.track(P['idle_a'], f), ac.track(P['idle_b'], f)
    lay_a, lift_a, info_a = ac.idle_layers(rig, f % IDLE_N)
    pb = (f-(n-1)+IDLE_N-1) % IDLE_N
    lay_b, lift_b, info_b = ac.idle_layers(rig, pb)
    pose = ac.add_layer({}, lay_a, wa)
    pose = ac.add_layer(pose, lay_b, wb)
    lift = wa*np.asarray(lift_a)+wb*np.asarray(lift_b)
    breath = (wa*info_a['breath']+wb*info_b['breath'])*ac.IDLE['breath_scale']
    return pose, lift, breath, dict(idleA=round(wa, 4), idleB=round(wb, 4), idleClockA=f % IDLE_N, idleClockB=pb)


def act_tracks(P, f):
    return {k: ac.track(v, f) for k, v in P['tracks'].items()}


def act_trunk(P, pose, lift, tr):
    """The act's trunk turns and root move on top of a pose (in place)."""
    for b, sh in P['lean_split'].items():
        turn(pose, b, [tr['lean']*sh, 0., 0.])
    for b, sh in P.get('yaw_split', {}).items():
        turn(pose, b, [0., 0., tr.get('yaw', 0.)*sh])
    return np.asarray(lift, float)+np.array([0., tr['shift_y'], tr['shift_z']])


_KEYS_CACHE = {}


def act_arm_keys(rig, name):
    """The striking arms' keyed poses (chest-frame directions), each posed on the act's body (idle layer and trunk) at its key frame."""
    P = ACTS[name]
    ck = (id(rig), name)
    if ck in _KEYS_CACHE:
        return _KEYS_CACHE[ck]
    out = {}
    for sd in P['arms']:
        keys = []
        for kf, dirs in P['arm_keys']:
            pose, lift, _, _ = act_idle_part(rig, P, kf)
            act_trunk(P, pose, lift, act_tracks(P, kf))
            # (fix pass 5: a key may carry per-side overrides, {'R': {...}}, so the two arms of heavy's hit part)
            keys.append(chest_arm_pose(rig, pose, sd, dict(dirs, **dirs.get(sd, {}))))
        out[sd] = keys
    _KEYS_CACHE[ck] = out
    return out


def act_frame(rig, name, f):
    P = ACTS[name]
    pose, lift, breath, iinfo = act_idle_part(rig, P, f)
    ipose = {k: list(v) for k, v in pose.items()}
    tr = act_tracks(P, f)
    lift = act_trunk(P, pose, lift, tr)
    # the striking arms along their chain: idle (this frame's own arm), the keyed poses, idle again (this frame's own arm)
    keys = act_arm_keys(rig, name)
    m = len(P['arm_keys'])
    for sd in P['arms']:
        c_sd = ac.track(P['tracks']['chain'], f-P.get('arm_lag', {}).get(sd, 0.))
        own = {f'{ab}.{sd}': list(ipose.get(f'{ab}.{sd}', [0., 0., 0.])) for ab in ARM_BONES}
        pose.update(chain_pose([own]+keys[sd]+[own], min(c_sd, m+1), P.get('fore_lead')))
        pose[f'forearm.{sd}'] = skip_elbow_gap(rig, sd, pose[f'forearm.{sd}'])
        for ab, e in P.get('arm_extra', {}).items():          # additive turns (the strike's overshoot) by their own track
            turn(pose, f'{ab}.{sd}', e if sd == 'L' else [e[0], -e[1], -e[2]], tr['extra'])
    for b, e in P.get('off_arm', {}).items():                 # the other arm's small counter-move (parent-frame turns)
        turn(pose, b, e, tr['off'], pre=True)
    # rule 1: the head's world orientation first: the neck takes back a share of the trunk's lean, then the head is held level and
    # facing ahead by the share `head` (0: the idle's own head)
    p0, y0 = head_world(rig, pose)
    h = tr['head']
    turn(pose, 'neck', [-P['neck_share']*tr['lean']*h, 0., 0.])
    set_head_world(rig, pose, pitch=(1-h)*p0+h*(P.get('head_pitch', 0.)+tr.get('nod', 0.)), yaw=(1-h)*y0, bone='head')
    # ears (fix pass 2): on Night Stalk f18's line on screen (capped at `ear_cap` degrees past f18's own pose relative to the head, as
    # the run's) while the track is near the line; on the way onto it and when released into idle's they run from this frame's
    # idle ears (one frame through the sweep's middle each way)
    e = tr['ears']
    if f < P['ears_release_from'] and e >= .8:
        ear_line_capped(rig, pose, e, P.get('ear_cap', 1.), inside=P.get('ear_inside', 20.))
    else:
        cb.set_ear_line(rig, pose, e, toward=ipose)
    # tails: lifts per bone at the tail track's value, lagged down each chain and between the tails
    for t in rc.TAILS:
        for k in range(1, rc.TAIL_BONES+1):
            v = ac.track(P['tracks']['tails'], f-P['tail_order'][t]-P['tail_lag']*(k-1))
            turn(pose, f'tail_{t}{k}', [P['tail_deg'][t][k-1]*v, 0., 0.])
    feet, planted = P['feet'](f) if P.get('feet') else ({sd: dict(t=(0., 0., 0.), pitch=0.) for sd in 'LR'}, dict(L=True, R=True))
    full, targets = solve_feet3(rig, pose, lift, feet)
    info = dict(iinfo, tracks={k: round(float(v), 4) for k, v in tr.items()}, planted=planted,
                feet={sd: dict(t=[round(float(x), 6) for x in feet[sd]['t']], pitch=round(float(feet[sd]['pitch']), 4)) for sd in 'LR'},
                targets={sd: [round(float(x), 6) for x in targets[sd]] for sd in 'LR'})
    b = breath*(1-tr.get('breath_off', 0.))
    return frame_dict(f, full, lift, b, info)


# act.light: a quick one-arm claw swipe with the near (L) arm. Research note: the cat draws its paw up and back to the chest with the
# elbow up over 3 to 4 frames, shoots it forward to full reach in 2 frames claws first, holds 2 to 3 frames and rakes back across
# the target before lifting away; the head never leaves the target and the body barely moves. The near arm, because its whole path
# (wind-up, swipe and follow-through) is drawn in front of the body at the side camera; the far arm's wind-up and follow-through are
# hidden behind the trunk, so at 192 px only its reach would show.
# Fix pass 2 (the critic: a jab, not a swipe; a straight arm hanging out after the hit; ears a held cap): the cocked paw rises to the
# side of the head (its top 1.21 m, the ear roots 1.25 to 1.27, the neck's base 1.06) with the elbow out and forward, then rakes down
# and forward to the hit with the claws leading; after the hit the elbow folds back (76 degrees from straight on 14, the keys' built
# range) and settles a little open (64 on 16), so the arm is bent from 12 on; the trunk leans into the hit (10 degrees forward, the
# neck taking it back so the chin stays level); the ears go onto Night Stalk f18's line in two frames, flick with the strike and are
# released late.
ACTS['light'] = dict(
    frames=27, hit=11, recover=21, side='L', arms=('L',), reach_declared=.35, fore_lead={'forearm': 0., 'hand': 0.},
    # Fix pass 3 (the critic: the raised paw sat in front of the face, hand to mouth at 192; the arm is too short to clear the head):
    # the wind-up cocks back behind the body line. Fix pass 4 (the orchestrator: with the elbow at shoulder height and the forearm
    # up, the paw sat beside the jaw, a paw at the throat at 192; variant A of the pose test picked): back and low. The striking
    # arm's chain: 0 idle, 1 the cock (the upper arm swung back, 46 degrees of swing, the elbow behind the back at mid-chest height,
    # the forearm level and pointing back, the wrist cocked back so the claws open; the paw at chest height about 20 cm behind the
    # back with background between, above the top tail; the upper arm turned so its elbow bends out and up, which took the
    # shoulder's creases from 28 and 65 to 3 and 5), 2 the arc's middle (the arm out to the side at shoulder height, the forearm coming
    # forward and down, the paw leading), 3 the hit (forward of the chest at belly to chest height, the elbow nearly straight, the
    # wrist hooked so the claws lead), 4 the follow-through (down and back across the body, the paw by the hip), 5 the settle (a
    # little open: the overshoot), 6 idle again. Directions in the chest's frame; the elbow a hinge (hinged_arm); every upper arm
    # swing under 75 degrees (the overhead keys stay at 0)
    arm_keys=[(8, dict(d1=(.3, .8, -.52), pole=(.5, .3, .8), elbow=60., wrist=-25.)),
              (10, dict(d1=(.9, -.25, -.35), pole=(-.1, -.8, .4), elbow=55., wrist=4.)),
              # (fix pass 5, the critic: frozen, f11 was still a straight-arm reach: the wrist hooked down 40 degrees so the claws point
              # down, the paw 25 px lower at 720 and a little across the body, the shoulder dropped into it by arm_extra's clavicle
              # turn; the wrist stays hooked through the follow-through so the claws stay open at 12, not a mitten)
              # (fix pass 6, the critic: f11 still read as a straight-arm reach, and the rake down happened in one frame, f11 to f12 the
              # paw dropping 50 px and swinging 90 px back to the hip; then f13 to f19 the paw, its 30 to 40 degree hook held while the
              # arm hung beside the body, went into the hip, 1100 to 1600 forearm and paw vertices inside the skin): the elbow bent 45
              # degrees from straight at the hit (its rest bend is 26; it was 28), a new key at 12 (the paw 35 px lower and 13 px
              # forward of f11's, the wrist hooked 40 as at the hit, so the claws rake down through the target; 55 collapsed 2 wrist
              # triangles), 13 lower again and coming back with the hook released (wrist -10), and the settle on 15 with the arm out to
              # the side and a little forward, so the paw passes outside the hip (60 mm or more from the skin from 12 to 26; idle's 66)
              (11, dict(d1=(.14, -.86, -.48), pole=(-.6, -.3, .74), elbow=45., wrist=-40.)),
              (12, dict(d1=(.16, -.82, -.55), pole=(-.6, -.3, .74), elbow=36., wrist=-40.)),
              (13, dict(d1=(.22, -.62, -.75), pole=(-.8, -.3, .5), elbow=40., wrist=-10.)),
              (15, dict(d1=(.5, -.2, -.84), pole=(-.9, -.3, .2), elbow=34., wrist=4.))],
    tracks={
        # chain position: the cock builds over 1 to 8 (held into 9), the arc 9 to 11 (accelerating), the rake 12 and 13
        # (decelerating), the settle on 15, the recovery from 16, back on balance at 21 (`recover`), idle's arm by 25
        'chain': [(0, 'linear', 0.), (2, 'in', .08), (4, 'smooth', .42), (6, 'smooth', .82), (8, 'out', 1.), (9, 'in', 1.25), (10, 'in', 1.85), (11, 'in', 3.),
                  (12, 'out', 4.), (13, 'out', 5.), (15, 'smooth', 6.), (18, 'smooth', 6.2), (21, 'smooth', 6.6), (25, 'smooth', 7.)],
        # the weight back in the wind-up (root y, + back), into the strike after it, and down into the knees with the strike
        # (fix pass 6: f11's own value kept as a key, then 5 cm forward on the rake at 12 so the paw stays forward of f11's)
        'shift_y': [(0, 'linear', 0.), (3, 'smooth', .01), (8, 'smooth', .028), (10, 'smooth', .012), (11, 'out', -.012), (12, 'out', -.05),
                    (15, 'smooth', -.018), (21, 'smooth', -.002), (25, 'smooth', 0.)],
        'shift_z': [(0, 'linear', 0.), (8, 'smooth', -.006), (12, 'out', -.026), (15, 'smooth', -.022), (21, 'smooth', -.005), (25, 'smooth', 0.)],
        # the chest turns away in the wind-up (+: the near shoulder back) and into the strike (-); the trunk leans back a little, then
        # into the hit and stays over it
        'yaw': [(0, 'linear', 0.), (8, 'smooth', 16.), (10, 'in', 4.), (12, 'out', -12.), (14, 'smooth', -13.), (21, 'smooth', -3.), (25, 'smooth', 0.)],
        # (fix pass 6: 14 on the rake at 12, then back to 11)
        'lean': [(0, 'linear', 0.), (8, 'smooth', -3.), (11, 'out', 8.), (12, 'out', 14.), (13, 'smooth', 11.), (16, 'smooth', 9.), (21, 'smooth', 2.),
                 (25, 'smooth', 0.)],
        'off': [(0, 'linear', 0.), (8, 'smooth', 1.), (12, 'out', -.8), (16, 'smooth', -.6), (24, 'smooth', 0.)],
        'head': [(0, 'linear', 0.), (3, 'smooth', 1.), (20, 'linear', 1.), (25, 'smooth', 0.)],
        # ears: onto f18's line in two frames (through the sweep's middle once, on 3), a flick forward with the arc and back with the
        # hit, held on the line, released into idle's in two frames (21 and 22)
        'ears': [(0, 'linear', 0.), (2, 'linear', 0.), (3, 'linear', .5), (4, 'out', .95), (8, 'smooth', .95), (10, 'smooth', .88), (12, 'out', 1.), (14, 'smooth', .93),
                 (17, 'smooth', .95), (20, 'linear', .95), (21, 'linear', .5), (22, 'out', .06), (23, 'smooth', 0.)],
        # (lagged down each chain by up to 3.6 frames, so the track ends by 21 and the last tail bone is still by 25)
        'tails': [(0, 'linear', 0.), (6, 'smooth', .5), (8, 'smooth', .6), (11, 'in', -.4), (13, 'out', -1.), (16, 'smooth', .35), (19, 'smooth', -.12),
                  (21, 'smooth', 0.)],
        # the shoulder dropped into the hit (arm_extra's clavicle turn, fix pass 5)
        'extra': [(0, 'linear', 0.), (8, 'linear', 0.), (11, 'in', 1.), (13, 'out', .8), (17, 'smooth', 0.)],
    },
    lean_split={'pelvis': .2, 'spine': .35, 'chest': .45}, yaw_split={'spine': .4, 'chest': .6}, neck_share=.45,
    # the far arm (R) comes forward and up a little for balance in the wind-up and pulls back in the strike
    off_arm={'upperarm.R': [-12., 0., 0.], 'forearm.R': [-25., 0., 0.]},
    arm_extra={'clavicle': [0., 5., -6.]},
    ears_release_from=21, ear_cap=1., ear_inside=20.,
    tail_deg={'a': (4., 5., 6., 7., 8.), 'b': (4., 5., 6., 7., 8.), 'c': (3., 4., 5., 6., 7.)}, tail_order={'a': 0., 'b': .4, 'c': .8}, tail_lag=.7,
    idle_a=[(0, 'linear', 1.), (4, 'smooth', 0.)], idle_b=[(19, 'linear', 0.), (25, 'smooth', 1.)],
)


def light_frame(rig, f):
    return act_frame(rig, 'light', f)


# act.heavy: a two-arm hop and slam. Research note: the fox crouches, rises straight up onto its hind feet with the forelegs drawn up,
# leaves the ground and comes down forepaws first 11 frames after the rise, the tail lagging the whole jump and whipping up and over
# 4 to 5 frames after the impact; the rearing boxing cat brings both arms down together over 3 to 4 frames with its trunk folding
# over them. Timeline: a dip (1 to 5), the rise onto the toes with both arms going up and the trunk arching back (6 to 12), a small
# hop (the toes off 13 to 18, the top at 15, the ears and tails lagging), the slam forward and down (16 to 19) landing on the hit
# frame 19 (the legs squash on 19 to 21, the ears and tails whip down a frame or two later), a hold with an overshoot and settle
# (19 to 24), the recovery (25 to 33, `recover` at 33), idle frame 89's pose at 41.
HEAVY_FEET = dict(
    # the heels' pitch (degrees, about the claws) and the contact point's height (m) for both feet
    heel=[(0, 'linear', 0.), (5, 'linear', 0.), (10, 'smooth', 24.), (12, 'smooth', 38.), (13, 'smooth', 48.), (16, 'smooth', 44.), (18, 'smooth', 30.),
          (19, 'smooth', 22.), (21, 'out', 22.), (23, 'smooth', 20.), (26, 'smooth', 17.), (30, 'smooth', 7.), (33, 'smooth', 0.)],
    # (fix pass 3: the heels stay up 17 to 22 degrees through the deeper landing crouch, 21 to 26; flat, the ankles bent 28 degrees
    # toward the shins, past the approved crouch's 22)
    z=[(12, 'linear', 0.), (13, 'out', .014), (15, 'out', .045), (17, 'in', .03), (18, 'in', .01), (19, 'in', 0.)],
)


def heavy_feet(f):
    P = HEAVY_FEET
    pitch = ac.track(P['heel'], f)
    z = ac.track(P['z'], f)
    tz = z+ON_FLOOR*min(1., pitch/10.)
    spec = dict(t=(0., 0., tz), pitch=pitch)
    on = z < 1e-6
    return {'L': spec, 'R': dict(spec)}, dict(L=bool(on), R=bool(on))


# the overhead pose (fix pass 2): both upper arms raised out, a little forward and up (107.7 degrees of swing), the elbows bent 70
# from straight inward over the head, so the paws come up by the crown (chest-frame directions, as the acts' arm keys). The overhead
# keys (overhead_corrective.py) are sculpted at it; act.heavy's top key is this pose
OVERHEAD_KEY = dict(d1=(.75, -.2, .63), pole=(-.6, -.1, .8), elbow=70.)


ACTS['heavy'] = dict(
    frames=42, hit=19, recover=33, side='L', arms=('L', 'R'), reach_declared=.40,
    # Fix pass 3 (the critic: the raised paws covered the face from 10 to 16; the arms are too short to clear the head): a full-body
    # coil with both arms drawn back behind the body line, a hop, a wide two-arm swing forward and down into the hit, a deeper
    # landing. Fix pass 4 (variant A of the pose test: back and low, the paws no longer raised by the face, a surrender pose in
    # three-quarter). Both arms' chain: 0 idle, 1 the coil (the upper arms swung back, 54 degrees of swing, further than light's,
    # the forearms level and pointing back, the wrists cocked back so the claws open, the paws at chest height about 11 cm behind
    # the back, the upper arms turned so the elbows bend out and up), 2 the coil on the toes (a little further back, 57 degrees), 3 the arms swung out to the sides below the head, 4 the wide arc (out at the sides at shoulder height, sweeping
    # forward), 5 the hit (both arms forward and angled down, the elbows nearly straight, the paws open, reaching 0.51 m), 6 the
    # landing (the elbows giving), 7 the paws drawn back to the chest, 8 idle again. Every upper arm swing under 75 degrees (the overhead keys stay at 0; they stay in the rig, unused by this clip)
    arm_keys=[(6, dict(d1=(.3, .85, -.43), pole=(.8, .4, .45), elbow=60., wrist=-25.)),
              (12, dict(d1=(.3, .88, -.36), pole=(.8, .4, .45), elbow=62., wrist=-25.)),
              # (fix pass 5, the critic: at 14 and 15 the forearm stood up with the paw at the chest, the near upper arm sinking into
              # it at 720: the elbows open, the bend turned forward, the paws out and around a little below shoulder height)
              (14, dict(d1=(.9, .25, -.36), pole=(-.1, -.9, .3), elbow=30., wrist=-10.)),
              (16, dict(d1=(.88, -.3, -.37), pole=(-.1, -.9, .3), elbow=28., wrist=-10.)),
              # (fix pass 5, the critic: the two arms ran parallel 8 px apart and merged at 192: the near paw at chest height, the far
              # one 30 px lower at the hip, 73 and 54 degrees of swing)
              (19, dict(d1=(.16, -.92, -.36), pole=(-.85, -.2, .5), elbow=16., wrist=-10., R=dict(d1=(.16, -.74, -.65)))),
              (22, dict(d1=(.25, -.55, -.8), pole=(-.85, -.2, .5), elbow=55., wrist=0.)),
              (26, dict(d1=(.3, -.15, -.94), pole=(-.8, -.4, .45), elbow=74., wrist=10.))],
    arm_lag={'R': .15}, fore_lead={'forearm': 0., 'hand': 0.},
    tracks={
        # the coil over 1 to 6, held and raised onto the toes to 12; the wide swing accelerates over 13 to 19 (the hit); the landing
        # 20 to 22; the paws back to the chest by 26; idle's arms by 39
        # (fix pass 5: spread so the claw tips speed up into the hit, 91, 130, 162, 166, 160, 248 and 210 mm a frame from 12 to 19;
        # with the open elbows the old spacing flung the paws out fastest at 13 to 14)
        'chain': [(0, 'linear', 0.), (3, 'smooth', .5), (6, 'smooth', 1.), (9, 'smooth', 1.5), (12, 'out', 2.), (13, 'in', 2.2), (14, 'in', 2.55), (15, 'in', 3.),
                  (16, 'in', 3.5), (17, 'in', 4.), (18, 'in', 4.5), (19, 'in', 5.), (20, 'out', 5.4), (22, 'smooth', 6.), (26, 'smooth', 7.), (32, 'smooth', 7.4),
                  (39, 'smooth', 8.)],
        'extra': [(0, 'linear', 0.)],
        # the root: the coil's sink, the rise on the toes, the hop (top at 15), the landing on 19 and a deep crouch (21), the recovery
        'shift_z': [(0, 'linear', 0.), (3, 'smooth', -.03), (6, 'smooth', -.05), (9, 'smooth', -.02), (12, 'out', .035), (13, 'out', .06), (15, 'out', .085),
                    (17, 'in', .06), (18, 'in', .028), (19, 'in', -.025), (21, 'out', -.095), (23, 'smooth', -.085), (25, 'smooth', -.088), (33, 'smooth', -.02),
                    (39, 'smooth', 0.)],
        # the body back over the heels in the coil, then driving forward over the arms at the hit (root y, - forward)
        'shift_y': [(0, 'linear', 0.), (6, 'smooth', .02), (12, 'smooth', .01), (15, 'smooth', -.01), (19, 'out', -.135), (21, 'smooth', -.125), (30, 'smooth', -.02),
                    (39, 'smooth', 0.)],
        # the trunk: leaned back in the coil, then driving forward and curling over the hit (+ forward)
        'lean': [(0, 'linear', 0.), (3, 'smooth', -4.), (6, 'smooth', -8.), (9, 'smooth', -6.), (12, 'smooth', -6.), (15, 'smooth', -2.), (17, 'in', 8.),
                 (19, 'out', 29.), (21, 'smooth', 31.), (23, 'smooth', 25.), (28, 'smooth', 12.), (33, 'smooth', 5.), (39, 'smooth', 0.)],
        'head': [(0, 'linear', 0.), (3, 'smooth', 1.), (33, 'linear', 1.), (39, 'smooth', 0.)],
        # ears: onto f18's line in two frames (through the sweep's middle once, on 3); lifted a little through the hop, then a rigid
        # dip of about 6 degrees down onto the line one to two frames after the landing, a rebound, held; released in two frames
        'ears': [(0, 'linear', 0.), (2, 'linear', 0.), (3, 'linear', .5), (4, 'out', .95), (12, 'smooth', .95), (15, 'smooth', .88), (19, 'smooth', .86),
                 (21, 'out', 1.), (23, 'smooth', .86), (26, 'smooth', .95), (31, 'linear', .95), (32, 'linear', .5), (33, 'out', .06), (34, 'smooth', 0.)],
        # tails: drooping in the coil, floating at the top, lifted in the fall, whipped down after the impact, a rebound, a settle
        'tails': [(0, 'linear', 0.), (4, 'smooth', -.2), (10, 'smooth', -.6), (14, 'smooth', .3), (17, 'smooth', .7), (19, 'linear', .6), (21, 'out', -1.),
                  (23, 'smooth', .35), (26, 'smooth', -.15), (30, 'smooth', 0.)],
        'breath_off': [(0, 'linear', 0.), (5, 'smooth', 1.), (33, 'linear', 1.), (39, 'smooth', 0.)],
    },
    lean_split={'pelvis': .3, 'spine': .3, 'chest': .4}, neck_share=.45,
    arm_extra={},
    ears_release_from=32, ear_cap=1., ear_inside=20.,
    # the three tails 2.5 frames apart (the critic: in step)
    tail_deg={'a': (5., 6., 7., 8., 9.), 'b': (5., 6., 7., 8., 9.), 'c': (4., 5., 6., 7., 8.)}, tail_order={'a': 0., 'b': 2.5, 'c': 5.}, tail_lag=.8,
    idle_a=[(0, 'linear', 1.), (4, 'smooth', 0.)], idle_b=[(31, 'linear', 0.), (39, 'smooth', 1.)],
    feet=heavy_feet,
)


def heavy_frame(rig, f):
    return act_frame(rig, 'heavy', f)


# ---------------------------------------------------------------- bake

CLIPS = {'move': (move_frame, MOVE['frames']), 'move_in': (move_in_frame, MOVE_IN['frames']), 'move_out': (move_out_frame, MOVE_OUT['frames']),
         'light': (light_frame, ACTS['light']['frames']), 'heavy': (heavy_frame, ACTS['heavy']['frames'])}
ORDER = ['move', 'move_in', 'move_out', 'light', 'heavy']
BREATH_KEY = HERE.parents[2]/'untracked/species-construction/akinza/anim/clips4/bake'


def events():
    return {'move': [dict(name='foot_down', frame=MOVE['foot_down'][0], foot='near (left)'),
                     dict(name='foot_down', frame=MOVE['foot_down'][1], foot='far (right)')],
            'move_in': [], 'move_out': [],
            'light': [dict(name='hit', frame=ACTS['light']['hit']), dict(name='recover', frame=ACTS['light']['recover'])],
            'heavy': [dict(name='hit', frame=ACTS['heavy']['hit']), dict(name='recover', frame=ACTS['heavy']['recover'])]}


def copy_breath_key(out):
    """The approved bake's breath shape key beside the poses (the renders and checks read it from the bake dir)."""
    import shutil
    for nm in ('breath_key.npz', 'breath_key.json'):
        shutil.copyfile(BREATH_KEY/nm, Path(out)/nm)


def bake(rig_dir, out, clips=None):
    rig = ac.Rig(rig_dir)
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    copy_breath_key(out)
    clips = clips or ORDER
    for name in clips:
        fn, n = CLIPS[name]
        frames = [fn(rig, f) for f in range(n)]
        (out/name).mkdir(parents=True, exist_ok=True)
        (out/name/'poses.json').write_text(json.dumps(frames, indent=0))
        print('baked', name, n, flush=True)
    ev = events()
    spec = dict(fps=cp.FPS, rig=str(rig_dir), approvedClips='akinza_clips.py (idle, Night Stalk), akinza_clipset_b1.py (hurt, evade, guard) and '
                'akinza_clipset_b2.py (displaced, held, faint), unchanged',
                rigKeys='fix pass 2 adds overhead_shoulder and overhead_armpit keys (overhead_corrective.py, rig-overhead-note.md), driven by the '
                'upper arm swing from 78 degrees: 0 over every approved and current clip and over move, move_in, move_out and light; on in heavy, '
                'its rise, top and strike',
                contactPoint=dict(CONTACT, note='the foot\'s contact point at rest (rig metres): the hind claws\' lowest point'),
                move=dict(frames=MOVE['frames'], loop=True, events=ev['move'], seamFrame=MOVE['frames'],
                          travel=dict(distanceM=move_travel(), per='loop (24 frames, two steps)', groundSpeedMPerFrame=MOVE['speed'],
                                      groundSpeedMPerS=round(MOVE['speed']*cp.FPS, 4),
                                      rule='a planted foot moves straight back at the ground speed; the game moves the sprite forward at it'),
                          entry=dict(clip='move_in', frames=MOVE_IN['frames'], rule="play move_in (its frame 0 is idle frame 0's pose and plays in its "
                                     "place), then the loop from frame 0 (the near foot's touchdown)",
                                     travel=dict(distanceM=round(MOVE_IN['ground'](MOVE_IN['frames']), 4), rule='the ground under the planted far foot '
                                                 'speeds up from still to the run\'s speed by frame 4 (the game ramps the sprite\'s speed over move_in)')),
                          exit=dict(clip='move_out', frames=MOVE_OUT['frames'], rule="the game finishes the current loop (frame 23), then plays move_out "
                                    "(its frame 0 is loop frame 0's pose and plays in its place; its last frame is idle frame 89's pose), then idle from frame 0",
                                    travel=dict(distanceM=round(move_out_ground(MOVE_OUT['frames']-1), 4), rule='the ground under the planted feet slows from the run\'s speed '
                                                'to still over frames 0 to 9 (the game slows the sprite over move_out)')),
                          params=dict(MOVE=MOVE, CONTACT=CONTACT)),
                move_in=dict(frames=MOVE_IN['frames'], loop=False, events=[], partOf='move (see move.entry)', startsOn='idle frame 0',
                             params={k: v for k, v in MOVE_IN.items() if k != 'ground'}),
                move_out=dict(frames=MOVE_OUT['frames'], loop=False, events=[], partOf='move (see move.exit)', endsOn='idle frame 89',
                              params=MOVE_OUT),
                light=dict(frames=ACTS['light']['frames'], loop=False, events=ev['light'], startsOn='idle frame 0', endsOn='idle frame 89',
                           archetype='strike', reachDeclaredM=ACTS['light']['reach_declared'], strikingArm='near (left)',
                           params={k: v for k, v in ACTS['light'].items() if k != 'feet'}),
                heavy=dict(frames=ACTS['heavy']['frames'], loop=False, events=ev['heavy'], startsOn='idle frame 0', endsOn='idle frame 89',
                           archetype='slam', reachDeclaredM=ACTS['heavy']['reach_declared'], strikingArm='both',
                           params=dict(ACTS={k: v for k, v in ACTS['heavy'].items() if k != 'feet'}, HEAVY_FEET=HEAVY_FEET)))
    (out/'clipset-spec.json').write_text(json.dumps(spec, indent=1, default=str))


# ---------------------------------------------------------------- setup check

SETUP = {
    # fix pass 5: light's hit (10 to 12), heavy's swing-through (13 to 16) and parted hit (18 to 20), move_in's push (2 to 5)
    'light10': ('light', 10, 'light f10' + ': the arc coming forward'),
    'light11': ('light', 11, 'light f11' + ': the hit, the wrist hooked, the claws down, the shoulder dropped into it'),
    'light12': ('light', 12, 'light f12' + ': the follow-through, the claws still open'),
    'heavy13': ('heavy', 13, 'heavy f13: the swing-through, the elbows open, the paws out and around'),
    'heavy14': ('heavy', 14, 'heavy f14: the swing-through, the elbows open, the paws out and around'),
    'heavy15': ('heavy', 15, 'heavy f15: the swing-through, the elbows open, the paws out and around'),
    'heavy16': ('heavy', 16, 'heavy f16: the swing-through, the elbows open, the paws out and around'),
    'heavy18': ('heavy', 18, 'heavy f18' + ': the arms coming into the hit'),
    'heavy19': ('heavy', 19, 'heavy f19' + ': the hit, the near paw at chest height, the far one at the hip'),
    'heavy20': ('heavy', 20, 'heavy f20' + ': after the hit'),
    'moveIn2': ('move_in', 2, 'move_in in2' + ': the dip, both feet down'),
    'moveIn3': ('move_in', 3, 'move_in in3' + ': the near foot stepping high, the far foot pushing'),
    'moveIn4': ('move_in', 4, 'move_in in4' + ': the far toes still down, the leg extended behind'),
    'moveIn5': ('move_in', 5, 'move_in in5' + ': the flight before the first touchdown'),
}


def bake_setup(rig_dir, out, names=None):
    rig = ac.Rig(rig_dir)
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    copy_breath_key(out)
    for name in (names or list(SETUP)):
        clip, f, _ = SETUP[name]
        fr = CLIPS[clip][0](rig, f)
        fr = dict(fr, frame=0, info=dict(fr['info'], setup=SETUP[name][2], fromClip=clip, fromFrame=f))
        (out/name).mkdir(parents=True, exist_ok=True)
        (out/name/'poses.json').write_text(json.dumps([fr], indent=0))
    print('baked setup frames', names or list(SETUP), flush=True)


# ---------------------------------------------------------------- the approved clips, re-baked

def verify_approved(rig_dir, approved, b1_bake, b2_bake, scratch):
    """Re-bake idle and Night Stalk (akinza_clips.bake), batch 1 (akinza_clipset_b1.bake) and batch 2 (akinza_clipset_b2.bake) with
    their own modules, each in a fresh interpreter under two hash seeds, and compare the poses files' sha256 with the stored bakes.
    (Batch 3 changes no shared module: the run's feet use their own pivot, foot_target3. Its one rig change, the overhead keys of
    fix pass 2, weighs exactly 0 over every one of these clips: overhead_corrective.py --check-bakes compares their posed skins with
    and without the keys byte for byte.)"""
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
        subprocess.run([sys.executable, str(HERE/'akinza_clipset_b2.py'), 'bake', str(rig_dir), str(scratch/f'b2-{seed}')], check=True, env=env,
                       capture_output=True)
        for clip in ('idle', 'stalk'):
            res.setdefault(clip, dict(stored=sha(Path(approved)/clip/'poses.json')))[f'rebake_seed{seed}'] = sha(scratch/f'approved-{seed}'/clip/'poses.json')
        for clip in ('hurt', 'evade', 'guard', 'guard_in', 'guard_out'):
            res.setdefault(clip, dict(stored=sha(Path(b1_bake)/clip/'poses.json')))[f'rebake_seed{seed}'] = sha(scratch/f'b1-{seed}'/clip/'poses.json')
        for clip in ('displaced', 'held', 'held_in', 'held_out', 'faint'):
            res.setdefault(clip, dict(stored=sha(Path(b2_bake)/clip/'poses.json')))[f'rebake_seed{seed}'] = sha(scratch/f'b2-{seed}'/clip/'poses.json')
    for v in res.values():
        v['identical'] = v['stored'] == v['rebake_seed1'] == v['rebake_seed2']
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
    a = p.parse_args()
    if a.cmd == 'bake':
        bake(a.rig, a.out, a.clips.split(',') if a.clips else None)
    elif a.cmd == 'setup':
        bake_setup(a.rig, a.out, a.clips.split(',') if a.clips else None)
    else:
        verify_approved(a.rig, a.out, a.more[0], a.more[1], a.more[2])
