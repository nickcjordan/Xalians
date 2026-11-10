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
import akinza_clipset_b2 as c2  # noqa: E402

B = rc.ANIM_BONES
NAMES = rc.ANIM_NAMES
IDLE_N = ac.IDLE['frames']
turn, rot, slerp_e, table = cb.turn, cb.rot, cb.slerp_e, cb.table
ordered = c2.ordered
LEG_BASES = ('thigh', 'shin', 'foot')

# the foot's contact point at rest (rig metres, y and z; x is the ankle's): the hind claws' lowest point, 2.8 mm over the floor at
# rest (the claws reach 2.5 cm past the toe skin). Measured on the rest skin and claws (export_rigid_parts.py): with the heel up
# 10 to 40 degrees this point is the foot's lowest, and to 55 degrees nothing dips more than 0.3 mm under it; turned about the
# toe skin's front instead, the claws went 7 to 13 mm into the floor at 30 to 50 degrees
CONTACT = dict(y=-.0879, z=.0028)
ON_FLOOR = -CONTACT['z']                     # the contact point's move (z) that sets it on the floor


def frame_dict(f, pose, lift, breath, info, belly=None):
    return c2.frame_dict(f, pose, lift, breath, info, belly)


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
    mid_y=-.095,                               # the contact point's y at mid-stance (between the 4th and 5th planted frames)
    # the heel's pitch over the stance (phase frame, degrees): landing on the claws with the heel a little up, then the push-off
    # rolling onto the toes (heel 50 to 62 degrees up at frames 6 and 7) as the leg extends
    stance_pitch=[(0, 12.), (2, 16.), (4, 26.), (5, 36.), (6, 50.), (7, 62.)],
    # the swing (phase frames 7 to 24): the contact point's height and the foot's pitch, smooth keys; its y is a Hermite curve from
    # the toe-off to the next touchdown with the ground speed at both ends, plus swing_dy. Fix pass 2: the heel tucks high under
    # the hip right after the toe-off (the heel 160 to 260 mm up, 68 to 110 px at 720, on frames 8 to 11) while the thigh stays
    # back, then the thigh swings forward with the leg folded (the knee 85 at most, under the deep keys' 88) and the leg reaches
    # ahead bent; the foot's pitch kept low in the air (late swing 9 to 12) so the ankle points 32 degrees at most (the heel
    # ridge evade showed comes at 40)
    swing_z=[(7, 0.), (8, .06), (9, .1), (10, .13), (11, .14), (12, .125), (14, .095), (16, .08), (18, .07), (20, .065), (22, .045), (23.2, .016), (24, 0.)],
    swing_pitch=[(7, 62.), (8, 70.), (9, 74.), (10, 76.), (11, 74.), (12, 68.), (14, 52.), (16, 38.), (18, 22.), (20, 12.), (22, 9.), (24, 12.)],
    swing_dy=[(7, 0.), (9, .03), (10, .045), (11, .045), (12, .03), (14, 0.), (18, 0.), (20, .02), (22, .035), (23, .022), (24, 0.)],
    # the hips (root move, z): the bob, lowest about 2.5 frames after each touchdown, highest in the flight (step frames)
    bob=[(0, 0.), (2.5, -.022), (5, -.008), (7.5, .016), (9.25, .018), (12, 0.)],
    root_y=0.,
    # fix pass 2: the trunk leaned 27 to 28 degrees forward of vertical (the pelvis joint to the neck's base), the head held level
    # in the world (the neck takes .38 of the lean, the head the rest). (Measured on the folds: the spine past 10 folds the belly,
    # approved 0; the neck taking .45 of a 36-degree lean folded it 46 to 53 against the approved 44; the pelvis at 16 folded the
    # tail fork 62 at a push, taken out by the tail root turned down 11 and toward the pushing leg 6, below)
    lean={'pelvis': 16., 'spine': 9., 'chest': 11.},
    lean_bob=1.5,                              # the trunk pitches a little further forward as it sinks (degrees at the bottom)
    pelvis_yaw=4., chest_counter=.8,
    # the pelvis rolls 8 degrees toward the swing side, taken back half by the chest and half by the neck
    pelvis_roll=8., roll_back={'chest': .5, 'neck': .5},
    neck_share=.38, head_nod=1.2, head_nod_lag=2.,             # a small nod of the head (degrees, world) 2 frames behind the bob
    tail_root_turn=(-11., -6., 0.),
    # arms (fix pass 2): low with the elbows bent (55 to 70 degrees of swing), pumping 25 degrees either way against the same-side
    # leg (the near arm back with the near leg forward, frame 0)
    upper_back=6., upper_out=5., fore_bend=-62., hand_bend=-8.,
    arm_swing=25., fore_swing=8., arm_lag=1.,
    # ears (fix pass 2, the critic: half way along the sweep the ear stood level and broadside, a held cap): on stalk f18's line
    # on screen at .94 of the sweep, lagging .03 either way a frame or two after each contact
    ears=.94, ear_dip=.03, ear_lag=2., ear_cap=1., ear_inside=20.,
    # tails: lifted toward the horizontal (degrees per bone, +X lifts; bones 2 and 3 also take back the tail root's turn down),
    # bobbing behind the body on their own phases (fix pass 2: 1.3 frames apart they bobbed together). The tips' low points (their
    # height on screen, the body's bob included) fall on frames 3 and 16 (a), 6 and 19 (b), 9 and 23 (c): 3 frames apart, found by
    # a search over the lags (the body's bob holds the top tail's low on 3 whatever its own lag). The first bone takes half the bob
    # (the full bob there folded the tail fork 53 against the approved 52)
    tail_lift={'a': (0., 3., 3., 0., 2.), 'b': (2., 12., 12., 4., 1.), 'c': (3., 17., 16., 6., 3.)},
    tail_bob={'a': 5., 'b': 6., 'c': 6.5}, tail_bob_lag={'a': 0., 'b': 3., 'c': 5.}, tail_chain_lag=1.1, tail_bob_root=.5,
    tail_sway={'a': 2.5, 'b': 3.5, 'c': 3.}, tail_sway_phase={'a': 0., 'b': .37, 'c': .71},
    pant=.3,
)


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
    e = P['ears']+P['ear_dip']*math.cos(2*math.pi*((f % st)-P['ear_lag'])/st)
    c2.ear_line_capped(rig, pose, e, P['ear_cap'], inside=P['ear_inside'])
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
# the near (L) foot steps off on 3 and swings ahead to land on loop frame 0; the far (R) foot stays planted through 3, its heel rising
# as the leg extends behind the body (the push), and leaves the floor on 4, kicking up behind into its loop path. The only frame with
# both feet up is 5 (and 4 with the far claws 15 mm up as they leave), the run's own flight before the touchdown. The ears go to the
# run's line on screen in two frames (passing through the sweep's middle once, on frame 1). The ground under the planted feet speeds
# up from still to the run's speed (the game ramps the sprite's speed over the entry).
MOVE_IN = dict(
    frames=6,
    # the ground's move back under a planted foot from frame 0 (metres; the speed rises from 0 to the run's by frame 4)
    ground=lambda k: MOVE['speed']*min(k, 4.)**2/8.+MOVE['speed']*max(0., k-4.),
    # the body: the share of the way from idle (on idle's clock from frame 0) to the run (the loop body at frame k-6)
    body=[0., .1, .25, .5, .78, .93],
    dip=[0., -.012, -.02, -.008, .003, .002],       # the anticipation's dip and the push's rise (root z, m), on top of the blend
    ears=[0., .45, .88, 1., 1., 1.],                # shares of the run's own ear line (the loop's at frame k-6)
    ears_capped_from=.8,
    # the near (L) foot: planted on 0 to 2 (flat, the heel lifting 8 degrees on 2), then (frame, contact move y, height, pitch)
    near_planted=3, near_pitch=[0., 0., 8.],
    near_air=[(3, -.06, .055, 24.), (4, -.175, .07, 20.), (5, -.232, .026, 13.)],
    # the far (R) foot: planted on 0 to 3, the heel rising as the leg extends (the push), then its path off the floor
    far_planted=4, far_pitch=[0., 0., 6., 24.],
    far_air=[(4, .155, .015, 54.), (5, .235, .095, 66.)],
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
    if s >= P['ears_capped_from']:
        c2.ear_line_capped(rig, pose, s*linfo['ears'], MOVE['ear_cap'], inside=MOVE['ear_inside'])
    elif s > 0:
        cb.set_ear_line(rig, pose, s*linfo['ears'], toward=ip)
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


# move_out (8 frames, from loop frame 0's pose; idle frame 0 follows). Fix pass 2 (the critic: running poses that stand up): a
# braking pull-up. The near (L) foot, landing on loop frame 0 well ahead, stays down and takes the weight, its heel lowering flat by
# frame 2 and its knee giving (the hips sink 20 mm by 3); the trunk pulls up out of the run's 28 degree lean and past upright, a brief
# lean back of about 6 degrees on 3 over the planted foot, then settles; the arms come forward a little to catch the balance; the
# tails, still carried forward, lift and settle; the far (R) foot swings through low and sets down on 4 a little ahead of its idle
# spot. The run's pose is held from loop frame 0 (no more pumping arms or cycling legs) and blended into idle (the clock that lands on
# idle frame 89 on the last frame). The ground under the planted feet slows from the run's speed to still (the game slows the sprite
# over the exit), so the planted feet end on their idle spots. The ears stay on the run's line through 2 and are released late.
MOVE_OUT = dict(
    frames=8,
    # (eased in over frames 1 and 2: a quarter of the way on frame 1 started the pull-up with a jolt of 92 mm a frame at the head
    # against the loop's own 62 at most)
    body=[0., .12, .36, .63, .83, .94, .985, 1.],        # the share of the way from loop frame 0's body (held) to idle
    back=[0., -1., -10., -24., -17., -6., -1.5, 0.],     # the lean back (degrees over the trunk) on top of the blend
    back_split={'pelvis': .3, 'spine': .3, 'chest': .4},
    brake=[0., -.008, -.022, -.028, -.016, -.005, -.001, 0.],    # the planted leg giving (root z, m)
    arms=[0., .4, 1., .8, .4, .12, 0., 0.],              # the arms' forward catch (share of brake_arm, local degrees)
    brake_arm={'upperarm': -12., 'forearm': -10.},
    tails=[0., .35, 1., .7, .1, -.2, -.06, 0.],          # the tails' lift (share of tail_deg per bone), each tail later than the last
    tail_deg=(2., 4., 6., 7., 8.), tail_order={'a': 0., 'b': .6, 'c': 1.2}, tail_chain_lag=.4,
    ears=[1., 1., 1., .9, .65, .3, .08, 0.],             # the run's ear line (loop frame 0's) released into idle's
    near_pitch=[12., 5., 1.5, 0., 0., 0., 0., 0.],       # the near heel lowering flat
    # the far (R) foot: (contact move y, height, pitch) in the air from its loop frame 0 path; y None: down, moving with the ground
    far=[None, (.16, .105, 52.), (.08, .072, 34.), (0., .034, 16.), (None, 0., 3.), (None, 0., .8), (None, 0., 0.), (None, 0., 0.)],
)


def move_out_ground(k):
    """The ground's move back under the planted feet from frame 0 (metres): from the run's speed to still over 7 frames, ending
    where the near foot's loop touchdown spot reaches its idle spot."""
    D = -(MOVE['mid_y']-CONTACT['y']-MOVE['speed']*3.5)
    u = min(1., k/7.)
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
    ek = MOVE['ears']+MOVE['ear_dip']*math.cos(2*math.pi*((k % MOVE['step'])-MOVE['ear_lag'])/MOVE['step'])
    if s >= 1:
        c2.ear_line_capped(rig, pose, ek, MOVE['ear_cap'], inside=MOVE['ear_inside'])
    else:
        cb.set_ear_line(rig, pose, ek*s, toward=ip)
    lift = (1-e)*np.asarray(llift)+e*np.asarray(ilift)+np.array([0., 0., P['brake'][k]])
    loop_feet, _ = move_feet(0)
    g = move_out_ground(k)
    D = move_out_ground(7)
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
            keys.append(chest_arm_pose(rig, pose, sd, dirs))
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
        c2.ear_line_capped(rig, pose, e, P.get('ear_cap', 1.), inside=P.get('ear_inside', 20.))
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
    # the striking arm's chain: 0 idle, 1 the wind-up (the upper arm out and forward at shoulder height, 76 degrees of swing, under
    # the 76.9 where the rig's armpit_fwd key falls off; turned in, the pole inward and up, so the forearm stands up by the cheek with
    # the paw cocked back: turned out, the shoulder folded 131 to 378 triangles against the approved 5), 2 the rake's middle (the
    # forearm coming down in front of the face, the paw leading), 3 the hit (the arm forward at chest height, the elbow nearly
    # straight, the wrist hooked so the claws lead), 4 the fold back (the elbow 76 from straight, the paw drawn back toward the
    # chest), 5 the settle (opened a little), 6 idle again. Directions in the chest's frame; the elbow a hinge (hinged_arm)
    arm_keys=[(8, dict(d1=(.76, -.65, -.02), pole=(-.8, .2, 1.), elbow=76., wrist=-15.)),
              (10, dict(d1=(.5, -.82, -.25), pole=(-.75, -.1, .8), elbow=48., wrist=4.)),
              (11, dict(d1=(.17, -.90, -.40), pole=(-.6, -.3, .74), elbow=22., wrist=12.)),
              (14, dict(d1=(.30, -.70, -.65), pole=(-.8, -.2, .55), elbow=76., wrist=8.)),
              (16, dict(d1=(.27, -.62, -.74), pole=(-.8, -.2, .55), elbow=64., wrist=4.))],
    tracks={
        # chain position: the wind-up builds over 1 to 8 (the paw up by 8, held into 9), the rake 9 to 11 (accelerating), the fold
        # back 12 to 14 (decelerating), the settle on 16, the recovery from 17, back on balance at 21 (`recover`), idle's arm by 25
        'chain': [(0, 'linear', 0.), (2, 'in', .08), (4, 'smooth', .42), (6, 'smooth', .82), (8, 'out', 1.), (9, 'in', 1.25), (10, 'in', 1.8), (11, 'in', 3.),
                  (12, 'out', 3.55), (13, 'out', 3.9), (14, 'out', 4.), (16, 'smooth', 5.), (18, 'smooth', 5.15), (21, 'smooth', 5.6), (25, 'smooth', 6.)],
        # the weight back in the wind-up (root y, + back), into the strike after it, and down into the knees with the strike; the
        # body up a little with the paw in the wind-up
        'shift_y': [(0, 'linear', 0.), (3, 'smooth', .01), (8, 'smooth', .028), (10, 'smooth', .012), (12, 'out', -.02), (15, 'smooth', -.016),
                    (21, 'smooth', -.002), (25, 'smooth', 0.)],
        'shift_z': [(0, 'linear', 0.), (8, 'smooth', .004), (12, 'out', -.026), (15, 'smooth', -.022), (21, 'smooth', -.005), (25, 'smooth', 0.)],
        # the chest turns away in the wind-up (+: the near shoulder back) and into the strike (-); the trunk leans back a little, then
        # into the hit and stays over it (the critic: the chest tipped back at the hit)
        'yaw': [(0, 'linear', 0.), (8, 'smooth', 14.), (10, 'in', 4.), (12, 'out', -12.), (14, 'smooth', -13.), (21, 'smooth', -3.), (25, 'smooth', 0.)],
        'lean': [(0, 'linear', 0.), (8, 'smooth', -3.), (11, 'out', 8.), (13, 'smooth', 10.), (16, 'smooth', 9.), (21, 'smooth', 2.), (25, 'smooth', 0.)],
        'off': [(0, 'linear', 0.), (8, 'smooth', 1.), (12, 'out', -.8), (16, 'smooth', -.6), (24, 'smooth', 0.)],
        'head': [(0, 'linear', 0.), (3, 'smooth', 1.), (20, 'linear', 1.), (25, 'smooth', 0.)],
        # ears: onto f18's line in two frames (through the sweep's middle once, on 3), a flick forward with the rake and back with the
        # hit, held on the line, released into idle's in two frames (21 and 22)
        'ears': [(0, 'linear', 0.), (2, 'linear', 0.), (3, 'linear', .5), (4, 'out', .95), (8, 'smooth', .95), (10, 'smooth', .88), (12, 'out', 1.), (14, 'smooth', .93),
                 (17, 'smooth', .95), (20, 'linear', .95), (21, 'linear', .5), (22, 'out', .06), (23, 'smooth', 0.)],
        # (lagged down each chain by up to 3.6 frames, so the track ends by 21 and the last tail bone is still by 25)
        'tails': [(0, 'linear', 0.), (6, 'smooth', .5), (8, 'smooth', .6), (11, 'in', -.4), (13, 'out', -1.), (16, 'smooth', .35), (19, 'smooth', -.12),
                  (21, 'smooth', 0.)],
        'extra': [(0, 'linear', 0.)],
    },
    lean_split={'pelvis': .2, 'spine': .35, 'chest': .45}, yaw_split={'spine': .4, 'chest': .6}, neck_share=.45,
    # the far arm (R) comes forward and up a little for balance in the wind-up and pulls back in the strike
    off_arm={'upperarm.R': [-12., 0., 0.], 'forearm.R': [-25., 0., 0.]},
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
          (19, 'smooth', 22.), (21, 'out', 6.), (23, 'smooth', 0.)],
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
    # Fix pass 2 (the critic: the arms held forward like a sleepwalker; mine to decide, decided: the overhead keys): both arms' chain
    # 0 idle, 1 the dip (the arms back and down), 2 the rise (the upper arms out to the side at shoulder height, 72 degrees of swing,
    # under the overhead keys, the elbows bent up), 3 the top (OVERHEAD_KEY: the arms raised out, forward and up, 107.7 degrees, the
    # elbows bent inward over the head, the paws by the crown; the overhead keys full on), 4 the strike (both arms out toward the
    # opponent at chest height, nearly straight, the wrists hooked so the claws lead), 5 the soften (the elbows giving, the arms a
    # little lower: no thin stiff hang), 6 idle again (chest-frame directions, the elbow a hinge). The rise goes out to the side and
    # then up along the overhead pose's own direction, so the keys' mid stage is met on the arm path it was sculpted on
    arm_keys=[(5, dict(d1=(.42, .28, -.86), pole=(-.3, -.6, .75), elbow=34.)),
              (10, dict(d1=(.85, -.2, 0.), pole=(-.6, -.1, .8), elbow=62.)),
              (14, OVERHEAD_KEY),
              (19, dict(d1=(.12, -.96, -.25), pole=(-.85, -.2, .5), elbow=20., wrist=14.)),
              (21, dict(d1=(.22, -.78, -.55), pole=(-.85, -.2, .5), elbow=62., wrist=6.))],
    arm_lag={'R': .15}, fore_lead={'forearm': 0., 'hand': 0.},
    tracks={
        # the arms rise over 5 to 14 (out to the side by 10, overhead by 14), hold overhead through the hop's top (14 to 16), the
        # strike accelerates down and forward into the hit on 19, softens on 20 to 22, and returns to idle's arms by 39
        'chain': [(0, 'linear', 0.), (3, 'smooth', .6), (5, 'smooth', 1.), (8, 'smooth', 1.6), (10, 'smooth', 2.), (12, 'smooth', 2.6), (14, 'out', 3.),
                  (16, 'linear', 3.), (17, 'in', 3.25), (18, 'in', 3.6), (19, 'in', 4.), (20, 'out', 4.5), (21, 'smooth', 5.), (28, 'smooth', 5.3),
                  (33, 'smooth', 5.7), (39, 'smooth', 6.)],
        # the strike's overshoot past the strike pose (additive arm turns, arm_extra) and its settle
        'extra': [(19, 'linear', 0.), (20, 'out', .6), (22, 'smooth', -.2), (24, 'smooth', 0.)],
        # the root: the dip, the rise on the toes, the hop (top at 15), the landing on 19 and the squash (21), the settle and recovery
        'shift_z': [(0, 'linear', 0.), (3, 'smooth', -.03), (5, 'smooth', -.04), (9, 'smooth', 0.), (12, 'out', .035), (13, 'out', .06), (15, 'out', .085),
                    (17, 'in', .06), (18, 'in', .028), (19, 'in', -.018), (21, 'out', -.046), (23, 'smooth', -.036), (25, 'smooth', -.041), (33, 'smooth', -.01),
                    (39, 'smooth', 0.)],
        # the body lunges forward with the strike (root y, - forward) over the planted feet, giving the arms their reach
        'shift_y': [(0, 'linear', 0.), (5, 'smooth', .01), (12, 'smooth', 0.), (15, 'smooth', -.01), (19, 'out', -.04), (21, 'smooth', -.036), (30, 'smooth', -.006),
                    (39, 'smooth', 0.)],
        # the trunk: forward in the dip, arched back on the rise, over the strike (+ forward; folded further than 15 the chest-height
        # arms' swing passed 90 at the hit)
        'lean': [(0, 'linear', 0.), (4, 'smooth', 8.), (8, 'smooth', -4.), (12, 'smooth', -10.), (15, 'smooth', -8.), (17, 'in', 4.), (19, 'out', 12.),
                 (21, 'smooth', 15.), (24, 'smooth', 13.), (33, 'smooth', 5.), (39, 'smooth', 0.)],
        'head': [(0, 'linear', 0.), (3, 'smooth', 1.), (33, 'linear', 1.), (39, 'smooth', 0.)],
        # ears: onto f18's line in two frames (through the sweep's middle once, on 3); a lift forward at the hop's top and in the fall,
        # whipped back onto the line by the impact, a rebound; released into idle's in two frames (32 and 33)
        'ears': [(0, 'linear', 0.), (2, 'linear', 0.), (3, 'linear', .5), (4, 'out', .95), (11, 'smooth', .95), (14, 'smooth', .88), (17, 'smooth', .86),
                 (19, 'linear', .9), (20, 'out', 1.), (22, 'smooth', .9), (25, 'smooth', .96), (31, 'linear', .95), (32, 'linear', .5), (33, 'out', .06),
                 (34, 'smooth', 0.)],
        # tails: drooping in the rise, floating at the top, lifted in the fall, whipped down after the impact, a rebound, a settle
        'tails': [(0, 'linear', 0.), (4, 'smooth', -.2), (10, 'smooth', -.6), (14, 'smooth', .3), (17, 'smooth', .7), (19, 'linear', .6), (21, 'out', -1.),
                  (23, 'smooth', .35), (26, 'smooth', -.15), (30, 'smooth', 0.)],
        'breath_off': [(0, 'linear', 0.), (5, 'smooth', 1.), (33, 'linear', 1.), (39, 'smooth', 0.)],
    },
    lean_split={'pelvis': .3, 'spine': .3, 'chest': .4}, neck_share=.45,
    arm_extra={'upperarm': [-8., 0., 0.], 'hand': [8., 0., 0.]},
    ears_release_from=32, ear_cap=1., ear_inside=20.,
    tail_deg={'a': (5., 6., 7., 8., 9.), 'b': (5., 6., 7., 8., 9.), 'c': (4., 5., 6., 7., 8.)}, tail_order={'a': 0., 'b': .5, 'c': 1.}, tail_lag=.8,
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
                                    travel=dict(distanceM=round(move_out_ground(7), 4), rule='the ground under the planted feet slows from the run\'s speed '
                                                'to still over frames 0 to 7 (the game slows the sprite over move_out)')),
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
    # fix pass 2: the run's push, tuck and reach, the entry's push and the exit's brake, the light swipe's wind-up, hit and fold
    # back, and heavy's arms through the overhead keys' range (the rise in the middle stage, the top, the strike leaving it, the hit)
    'moveInPush': ('move_in', 3, 'move_in f3: the push (the far foot planted with its heel rising behind, the near foot stepping off)'),
    'movePush': ('move', 5, 'move f5: the near leg\'s push-off (on the toes, the leg extending, the trunk leaned 28 degrees)'),
    'moveTuck': ('move', 10, 'move f10: the near heel tucked high under the hip (the swing\'s fold)'),
    'movePoint': ('move', 22, 'move f22: the near foot reaching for the touchdown (the late swing\'s pointing)'),
    'moveOutBrake': ('move_out', 3, 'move_out f3: the brake (the trunk leaned back over the planted near foot, the knee giving)'),
    'lightWindup': ('light', 8, 'light f8: the wind-up (the paw cocked up by the side of the head, the elbow out)'),
    'lightHit': ('light', 11, 'light f11: the hit (the arm forward at chest height, the claws leading)'),
    'lightFold': ('light', 14, 'light f14: the arm folded back after the hit (the elbow 76 degrees from straight)'),
    'heavyRise': ('heavy', 12, 'heavy f12: the arms rising (92 degrees of upper-arm swing: the overhead keys\' middle stage)'),
    'heavyOverhead': ('heavy', 15, 'heavy f15: the hop\'s top, both arms overhead (107.7 degrees of swing: the overhead keys full on)'),
    'heavyStrikeStart': ('heavy', 17, 'heavy f17: the strike leaving the top (the arms coming forward and down at 104 to 107 degrees)'),
    'heavyHit': ('heavy', 19, 'heavy f19: the hit on the landing, both arms out at chest height (80 to 85 degrees of swing)'),
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
