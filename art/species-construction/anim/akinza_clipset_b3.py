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
    speed=.052,                                # m a frame the planted foot moves back (the ground speed): 1.56 m/s
    mid_y=-.085,                               # the contact point's y at mid-stance (between the 4th and 5th planted frames)
    # the heel's pitch over the stance (phase frame, degrees): landing on the toe pads, the heel rising to the toe-off
    stance_pitch=[(0, 22.), (2, 22.), (4, 26.), (6, 36.), (7, 46.)],
    # the swing (phase frames 7 to 24): the contact point's height and the foot's pitch, smooth keys; its y is a Hermite curve from
    # the toe-off to the next touchdown with the ground speed at both ends (the foot follows on back a little after it lifts,
    # swings forward and paws back onto the floor)
    # (the swing foot kept low under the hip, 6.5 to 8.5 cm: at 9.5 to 10.5 cm, the knee folded to 83 degrees, past the approved
    # crouch's 75.5)
    swing_z=[(7, 0.), (8, .02), (9, .05), (10, .08), (12, .085), (14, .065), (16, .07), (18, .07), (20, .06), (22, .032), (23.2, .008), (24, 0.)],
    swing_pitch=[(7, 46.), (8, 58.), (10, 70.), (12, 64.), (14, 50.), (16, 36.), (18, 27.), (20, 22.), (22, 22.), (24, 22.)],
    # the hips (root move, z): the bob, lowest about 2.5 frames after each touchdown, highest in the flight (step frames)
    bob=[(0, 0.), (2.5, -.022), (5, -.008), (7.5, .020), (9.25, .024), (12, 0.)],
    root_y=0.,
    # the trunk leaned forward from the hips (degrees), the head held level in the world. (Measured on the folds: the pelvis
    # pitched 10 folded the tail fork 70 at the near leg's push against the approved 52; the spine at 13 folded the belly, approved
    # 0; so the lean is mostly the chest's)
    lean={'pelvis': 3., 'spine': 8., 'chest': 19.},
    lean_bob=1.5,                              # the trunk pitches a little further forward as it sinks (degrees at the bottom)
    pelvis_yaw=4., chest_counter=.8,
    # (the pelvis rolls 8 degrees toward the swing side, taken back by the chest (a quarter) and the neck: at 2.5 to 6 the near leg's
    # push folded the tail fork 54 to 67 against the approved 52; taken back by the chest alone at 8 the belly folded 1, approved 0)
    pelvis_roll=8., roll_back={'chest': .25, 'neck': .75},
    neck_share=.45, head_nod=1.2, head_nod_lag=2.,             # a small nod of the head (degrees, world) 2 frames behind the bob
    # arms: low and close; the upper arms swung back against the lean, the forearms bent forward; a small swing against the legs
    upper_back=14., upper_out=5., fore_bend=-48., hand_bend=-6.,
    arm_swing=9., fore_swing=6., arm_lag=1.,
    # ears: half way along Night Stalk's sweep on screen, dipping further back a frame or two after each contact
    ears=.5, ear_dip=.07, ear_lag=2.,
    # tails: lifted toward the horizontal (degrees per bone, +X lifts), bobbing behind the body on their own phases
    tail_lift={'a': (0., -2., -3., 0., 2.), 'b': (2., 7., 7., 4., 1.), 'c': (3., 12., 11., 6., 3.)},
    tail_bob={'a': 3.2, 'b': 3.8, 'c': 4.2}, tail_bob_lag={'a': 2.0, 'b': 3.3, 'c': 4.6}, tail_chain_lag=1.1,
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
    # ears: half back, dipping further back a frame or two after each contact
    e = P['ears']+P['ear_dip']*math.cos(2*math.pi*((f % st)-P['ear_lag'])/st)
    cb.set_ear_line(rig, pose, e)
    # tails: lifted toward the horizontal, bobbing behind the body on their own phases, swaying side to side once a loop
    for t in rc.TAILS:
        for k in range(1, rc.TAIL_BONES+1):
            g = (k+1)/(rc.TAIL_BONES+1)
            lag = P['tail_bob_lag'][t]+P['tail_chain_lag']*(k-1)
            bb = math.cos(2*math.pi*((f-lag) % st)/st-2*math.pi*2.5/st)       # the body's sink, lagged
            sw = math.sin(2*math.pi*((f-P['tail_chain_lag']*(k-1))/n+P['tail_sway_phase'][t]))
            turn(pose, f'tail_{t}{k}', [P['tail_lift'][t][k-1]-g*P['tail_bob'][t]*bb, 0., g*P['tail_sway'][t]*sw])
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

# move_in (6 frames, from idle frame 0; loop frame 0 follows): the lean and a first push off. The near (L) foot steps off first and
# swings forward through the air to land on loop frame 0; the far (R) foot pushes: planted while its heel rises, it leaves the floor
# on frame 4 and kicks up behind into its loop path; the body dips (frames 1 and 2), then leans in and rises with the push into the
# loop's flight. The ground under the planted far foot speeds up from still to the run's ground speed (the game ramps the sprite's
# speed over the entry): GROUND_IN is its move back per frame.
MOVE_IN = dict(
    frames=6,
    # the ground's move back under a planted foot from frame 0 (metres; the speed rises from 0 to the run's by frame 4)
    ground=lambda k: MOVE['speed']*min(k, 4.)**2/8.+MOVE['speed']*max(0., k-4.),
    # the body: the share of the way from idle (on idle's clock from frame 0) to the loop's flight (the loop body at frame k-6)
    body=[0., .12, .3, .55, .8, .94],
    dip=[0., -.012, -.016, -.008, 0., 0.],          # the anticipation's dip (root z, m), on top of the blend
    ears=[0., .15, .3, .45, .5, .5],                # shares of Night Stalk's sweep on screen
    # the near (L) foot: contact move (ty, tz) from rest and pitch per frame; it lifts at 2 and swings forward to land at loop 0
    # (the last two frames reach ahead and paw back onto the touchdown spot, as the loop's own swing does before frame 0: arriving
    # from behind, the foot's velocity reversed on the touchdown, a change of 77 mm a frame against the loop's 34 at most)
    near=[(0., 0., 0.), (0., 0., 8.), (-.035, .03, 24.), (-.12, .06, 28.), (-.215, .035, 24.), (-.225, .012, 22.)],
    # the far (R) foot: planted on frames 0 to 3 (the contact moving back with the ground, the heel rising), off from 4
    far_pitch=[0., 6., 18., 32., 48., 62.],
    far_air=[(4, .032, .115), (5, .068, .175)],     # (frame, the contact's height, its move back) once it has left the floor
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
    cb.set_ear_line(rig, pose, P['ears'][k])
    lift = (1-e)*np.asarray(ilift)+e*np.asarray(llift)+np.array([0., 0., P['dip'][k]])
    ty, tz, pitch = P['near'][k]
    feet = {'L': dict(t=(0., ty, tz+(ON_FLOOR if pitch > 10 and tz < .001 else 0.)), pitch=pitch)}
    g = P['ground'](k)
    fp = P['far_pitch'][k]
    air = {a_[0]: a_[1:] for a_ in P['far_air']}
    if k in air:
        feet['R'] = dict(t=(0., air[k][1], air[k][0]+ON_FLOOR), pitch=fp)
    else:
        feet['R'] = dict(t=(0., g, ON_FLOOR*min(1., fp/10.)), pitch=fp)
    full, targets = solve_feet3(rig, pose, lift, feet)
    planted = dict(L=k < 2, R=k not in air)
    info = dict(share=e, ground_m=round(g, 5), planted=planted, idleClock=k, loopFrame=(k-n) % MOVE['frames'],
                feet={sd: dict(t=[round(float(x), 6) for x in feet[sd]['t']], pitch=round(float(feet[sd]['pitch']), 4)) for sd in 'LR'},
                targets={sd: [round(float(x), 6) for x in targets[sd]] for sd in 'LR'})
    return frame_dict(k, full, lift, (1-e)*ib+e*lb, info, belly=(1-e)*ib)


# move_out (8 frames, from loop frame 0's pose; idle frame 0 follows): a braking step, rising out of the lean. The near (L) foot,
# landing on loop frame 0 well ahead, stays down and brakes, its heel lowering; the far (R) foot swings through and sets down beside
# it; the ground under them slows from the run's speed to still (the game slows the sprite over the exit), so the planted feet end
# on their idle spots; the body sinks into the brake and rises out of the lean into idle (the clock that lands on idle frame 89).
MOVE_OUT = dict(
    frames=8,
    # the body: the share of the way from the loop (continuing at its frame k) to idle
    body=[0., .07, .2, .4, .63, .84, .97, 1.],
    brake=[0., -.002, -.006, -.010, -.006, -.002, 0., 0.],     # the brake's extra sink (root z, m)
    ears=[1., .92, .78, .58, .36, .18, .06, 0.],              # the run's ear line released into idle's
    near_pitch=[None, None, 18., 12., 7., 3., .8, 0.],          # the near heel lowering (None: the loop's own)
    # the far (R) foot: swinging through from its loop path (frames 0 and 1 its loop's) at the loop's swing speed, down on frame 5
    far=[None, None, (.085, .055, 45.), (.03, .045, 26.), (-.015, .02, 12.), (None, 0., 3.), (None, 0., .8), (None, 0., 0.)],
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
    lp, llift, lb, linfo = move_body(rig, k)
    phase = IDLE_N-1-(n-1)+k
    ip, ilift, ib = cb.idle_pose(rig, phase)
    pose = cb.blend_poses(lp, ip, lambda b: e)
    # the head: the blend's own, held on the loop's world orientation by the loop's share (the last frame is idle frame 89's head)
    p0, y0 = head_world(rig, pose)
    pl, yl = head_world(rig, lp)
    set_head_world(rig, pose, pitch=e*p0+(1-e)*pl, yaw=e*y0+(1-e)*yl, bone='head')
    # the ears: the loop's own line released into idle's (frame 0 is loop frame 0's)
    cb.set_ear_line(rig, pose, linfo['ears']*P['ears'][k], toward=ip if k > 0 else None)
    lift = (1-e)*np.asarray(llift)+e*np.asarray(ilift)+np.array([0., 0., P['brake'][k]])
    loop_feet, _ = move_feet(k)
    g = move_out_ground(k)
    D = move_out_ground(7)
    # the near (L) foot: planted from its touchdown, moving back with the ground, the heel lowering
    pl = P['near_pitch'][k] if P['near_pitch'][k] is not None else loop_feet['L']['pitch']
    feet = {'L': dict(t=(0., -D+g, ON_FLOOR*min(1., pl/10.)), pitch=pl)}
    fr_ = P['far'][k]
    if fr_ is None:
        feet['R'] = loop_feet['R']
        r_planted = False
    else:
        ty, tz, pitch = fr_
        if ty is None:                      # down: moving back with the ground onto its idle spot
            ty = -(D-g)
            r_planted = True
        else:
            r_planted = False
        feet['R'] = dict(t=(0., ty, tz+ON_FLOOR*min(1., pitch/10.)), pitch=pitch)
    full, targets = solve_feet3(rig, pose, lift, feet)
    info = dict(share=e, ground_m=round(g, 5), planted=dict(L=True, R=r_planted), idleClock=phase, loopFrame=k,
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
    # ears: Night Stalk's sweep on screen at the track's share, released into idle's ears late
    if f >= P['ears_release_from']:
        cb.set_ear_line(rig, pose, tr['ears'], toward=ipose)
    else:
        cb.set_ear_line(rig, pose, tr['ears'])
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
ACTS['light'] = dict(
    frames=27, hit=11, recover=21, side='L', arms=('L',), reach_declared=.35, fore_lead={'forearm': 0., 'hand': 0.},
    # the striking arm's chain: 0 idle, 1 the wind-up (the elbow raised out to the side and a little forward, bent up, the paw drawn
    # up by the cheek, claws up; drawn behind the shoulder, the rig's armpit_fwd key, sculpted for a forward raise, folded the
    # shoulder 588 and the armpit 452 against the approved 5 and 4), 2 the swipe's middle (the arm out to the side and coming forward at shoulder height, the forearm still trailing),
    # 3 the hit (the arm forward at chest height, the elbow nearly straight and bent a little inward, the paw in line, claws
    # leading), 4 the follow-through (raked down and across in front of the belly), 5 idle again. Directions in the chest's frame,
    # each upper arm at least 10 degrees out (turned in, the armpit_fwd key collapses the armpit) and under 76.9 degrees of swing;
    # the elbow a hinge (hinged_arm)
    arm_keys=[(8, dict(d1=(.70, -.40, -.60), pole=(0., 0., 1.), elbow=74.)),
              (10, dict(d1=(.45, -.85, -.27), pole=(-.5, -.2, .85), elbow=40.)),
              (11, dict(d1=(.17, -.90, -.40), pole=(-.6, -.3, .74), elbow=22.)),
              (14, dict(d1=(.22, -.55, -.80), pole=(-.8, -.2, .55), elbow=48.))],
    tracks={
        # chain position: the wind-up builds over 1 to 8, the swipe 9 to 11 (accelerating), the follow-through 12 to 14 (decelerating),
        # the recovery from 15, back on balance at 21 (`recover`), idle's arm by 25
        # (measured on the claw tips: the swipe speeds up over 8 to 11, 197, 221 and 250 mm a frame, the furthest point forward on 11;
        # with the middle key less far forward the swipe was one 451 mm frame)
        'chain': [(0, 'linear', 0.), (2, 'in', .08), (4, 'smooth', .42), (6, 'smooth', .82), (8, 'out', 1.), (9, 'in', 1.5), (10, 'linear', 2.), (11, 'out', 3.),
                  (12, 'out', 3.6), (13, 'out', 3.9), (14, 'out', 4.), (17, 'smooth', 4.35), (21, 'smooth', 4.75), (25, 'smooth', 5.)],
        # the weight back in the wind-up (root y, + back), into the strike after it, and down into the knees with the strike
        'shift_y': [(0, 'linear', 0.), (3, 'smooth', .01), (8, 'smooth', .028), (10, 'smooth', .012), (12, 'out', -.02), (15, 'smooth', -.016),
                    (21, 'smooth', -.002), (25, 'smooth', 0.)],
        'shift_z': [(0, 'linear', 0.), (8, 'smooth', -.012), (12, 'out', -.026), (15, 'smooth', -.022), (21, 'smooth', -.005), (25, 'smooth', 0.)],
        # the chest turns away in the wind-up (+: the near shoulder back) and into the strike (-); the trunk leans back, then into it
        'yaw': [(0, 'linear', 0.), (8, 'smooth', 14.), (10, 'in', 4.), (12, 'out', -16.), (14, 'smooth', -18.), (21, 'smooth', -3.), (25, 'smooth', 0.)],
        'lean': [(0, 'linear', 0.), (8, 'smooth', -4.), (12, 'out', 7.), (15, 'smooth', 6.), (21, 'smooth', 1.), (25, 'smooth', 0.)],
        'off': [(0, 'linear', 0.), (8, 'smooth', 1.), (12, 'out', -.8), (16, 'smooth', -.6), (24, 'smooth', 0.)],
        'head': [(0, 'linear', 0.), (3, 'smooth', 1.), (20, 'linear', 1.), (25, 'smooth', 0.)],
        'ears': [(0, 'linear', 0.), (8, 'smooth', .1), (13, 'smooth', .26), (17, 'smooth', .18), (24, 'smooth', 0.)],
        # (lagged down each chain by up to 3.6 frames, so the track ends by 21 and the last tail bone is still by 25)
        'tails': [(0, 'linear', 0.), (6, 'smooth', .5), (8, 'smooth', .6), (11, 'in', -.4), (13, 'out', -1.), (16, 'smooth', .35), (19, 'smooth', -.12),
                  (21, 'smooth', 0.)],
        'extra': [(0, 'linear', 0.)],
    },
    lean_split={'pelvis': .2, 'spine': .35, 'chest': .45}, yaw_split={'spine': .4, 'chest': .6}, neck_share=.45,
    # the far arm (R) comes forward and up a little for balance in the wind-up and pulls back in the strike
    off_arm={'upperarm.R': [-12., 0., 0.], 'forearm.R': [-25., 0., 0.]},
    ears_release_from=14,
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


ACTS['heavy'] = dict(
    frames=42, hit=19, recover=33, side='L', arms=('L', 'R'), reach_declared=.40,
    # both arms' chain: 0 idle, 1 the dip (the arms back and down), 2 the top (the upper arms raised forward to 72 degrees of swing,
    # the elbows bent 65 inward and up so the forearms rise in front of the chin, claws up), 3 the strike (down and forward, the
    # claws leading), 4 idle again (chest-frame directions, the elbow a hinge). Setup check: raised overhead (108 degrees of swing,
    # where shoulder_raise is fully on) both shoulders folded 2180 and collapsed 1238 triangles against the approved 5 and 27; at 72
    # degrees with the elbow bending straight up, 190 and 259; turned so the elbows bend inward and up (the upper arm's twist), 4
    # and 3. So the arms rise to the top of the rig's shoulder range, not overhead
    arm_keys=[(5, dict(d1=(.42, .28, -.86), pole=(-.3, -.6, .75), elbow=34.)),
              (12, dict(d1=(.2603, -.9078, -.3420), pole=(-.85, 0., .53), elbow=65., wrist=10.)),
              (19, dict(d1=(.18, -.75, -.64), pole=(-.85, -.2, .5), elbow=26., wrist=8.))],
    arm_lag={'R': .35}, fore_lead={'forearm': 0., 'hand': 0.},
    tracks={
        # (the strike accelerates into the hit: the claw tips' fastest steps 17 to 18 and 18 to 19, 193 and 178 mm a frame, then the
        # overshoot 133; the rise slowed over 5 to 12, which flung the arms up 213 mm in one frame)
        'chain': [(0, 'linear', 0.), (3, 'smooth', .6), (5, 'smooth', 1.), (7, 'smooth', 1.3), (10, 'smooth', 1.8), (12, 'out', 2.), (15, 'linear', 2.), (16, 'in', 2.08),
                  (17, 'in', 2.25), (18, 'in', 2.55), (19, 'in', 3.), (24, 'linear', 3.), (28, 'smooth', 3.35), (33, 'smooth', 3.75), (39, 'smooth', 4.)],
        # the strike's overshoot past the strike pose (additive arm turns, arm_extra) and its settle
        'extra': [(19, 'linear', 0.), (20, 'out', 1.), (22, 'smooth', -.3), (24, 'smooth', 0.)],
        # the root: the dip, the rise on the toes, the hop (top at 15), the landing on 19 and the squash (21), the settle and recovery
        'shift_z': [(0, 'linear', 0.), (3, 'smooth', -.03), (5, 'smooth', -.04), (9, 'smooth', 0.), (12, 'out', .035), (13, 'out', .06), (15, 'out', .085),
                    (17, 'in', .06), (18, 'in', .028), (19, 'in', -.018), (21, 'out', -.046), (23, 'smooth', -.036), (25, 'smooth', -.041), (33, 'smooth', -.01),
                    (39, 'smooth', 0.)],
        # the hips go back a little as the trunk folds over the strike
        'shift_y': [(0, 'linear', 0.), (5, 'smooth', .01), (12, 'smooth', 0.), (15, 'smooth', -.01), (19, 'out', .025), (21, 'smooth', .03), (30, 'smooth', .008),
                    (39, 'smooth', 0.)],
        # the trunk: forward in the dip, arched back on the rise, folding over the strike (+ forward)
        'lean': [(0, 'linear', 0.), (4, 'smooth', 8.), (8, 'smooth', -4.), (12, 'smooth', -12.), (15, 'smooth', -8.), (17, 'in', 8.), (19, 'out', 28.),
                 (21, 'smooth', 33.), (24, 'smooth', 28.), (33, 'smooth', 6.), (39, 'smooth', 0.)],
        'head': [(0, 'linear', 0.), (3, 'smooth', 1.), (33, 'linear', 1.), (39, 'smooth', 0.)],
        # ears: pushed back by the rise, floating up at the top and in the fall, whipped back and down after the impact, then released
        'ears': [(0, 'linear', 0.), (4, 'smooth', .15), (10, 'smooth', .45), (14, 'smooth', .2), (17, 'smooth', .1), (19, 'linear', .15), (21, 'out', .85),
                 (24, 'smooth', .6), (28, 'smooth', .55), (36, 'smooth', 0.)],
        # tails: drooping in the rise, floating at the top, lifted in the fall, whipped down after the impact, a rebound, a settle
        'tails': [(0, 'linear', 0.), (4, 'smooth', -.2), (10, 'smooth', -.6), (14, 'smooth', .3), (17, 'smooth', .7), (19, 'linear', .6), (21, 'out', -1.),
                  (23, 'smooth', .35), (26, 'smooth', -.15), (30, 'smooth', 0.)],
        'breath_off': [(0, 'linear', 0.), (5, 'smooth', 1.), (33, 'linear', 1.), (39, 'smooth', 0.)],
    },
    lean_split={'pelvis': .3, 'spine': .3, 'chest': .4}, neck_share=.45,
    arm_extra={'upperarm': [14., 0., 0.], 'hand': [10., 0., 0.]},
    ears_release_from=28,
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

def overhead_top():
    """act.heavy's arms raised overhead (the brief's 'both arms at their highest', past rig-p8b's 76.9 degree shoulder_raise
    threshold): the upper arms 108 degrees of swing, the forearms bent up and back. Posed for the setup check only."""
    return dict(d1=(.35, -.85, .39), pole=(0., .5, .87), elbow=60.)


SETUP = {
    'moveToeoff': ('move', 7, 'move f7: the near leg at its toe-off (the longest stride, the back leg furthest extended)'),
    'moveStance': ('move', 3, 'move f3: the deepest knee bend of the stance, just after the near foot\'s contact'),
    'moveSwing': ('move', 14, 'move f14: the deepest knee bend of the run (the near leg folded under the hip in its swing)'),
    'movePoint': ('move', 22, 'move f22: the near foot most pointed (reaching for the touchdown)'),
    'lightWindup': ('light', 8, 'light f8: the wind-up (the striking arm drawn up, the chest turned away)'),
    'lightHit': ('light', 11, 'light f11: the hit (the arm forward, the chest turned into it)'),
    'heavyTop': ('heavy', 12, 'heavy f12: both arms at their highest (as built, under 76.9 degrees of upper-arm swing)'),
    'heavyOverhead': ('heavy', 12, 'heavy f12 with the arms overhead (108 degrees of upper-arm swing, shoulder_raise fully on): not built'),
    'heavyStrike': ('heavy', 21, 'heavy f21: the strike, both arms down and forward, the trunk folded over it, the legs squashed'),
}


def bake_setup(rig_dir, out, names=None):
    rig = ac.Rig(rig_dir)
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    copy_breath_key(out)
    for name in (names or list(SETUP)):
        clip, f, _ = SETUP[name]
        if name == 'heavyOverhead':
            keys = list(ACTS['heavy']['arm_keys'])
            ACTS['heavy']['arm_keys'] = [keys[0], (keys[1][0], overhead_top()), keys[2]]
            _KEYS_CACHE.clear()
            fr = CLIPS[clip][0](rig, f)
            ACTS['heavy']['arm_keys'] = keys
            _KEYS_CACHE.clear()
        else:
            fr = CLIPS[clip][0](rig, f)
        fr = dict(fr, frame=0, info=dict(fr['info'], setup=SETUP[name][2], fromClip=clip, fromFrame=f))
        (out/name).mkdir(parents=True, exist_ok=True)
        (out/name/'poses.json').write_text(json.dumps([fr], indent=0))
    print('baked setup frames', names or list(SETUP), flush=True)


# ---------------------------------------------------------------- the approved clips, re-baked

def verify_approved(rig_dir, approved, b1_bake, b2_bake, scratch):
    """Re-bake idle and Night Stalk (akinza_clips.bake), batch 1 (akinza_clipset_b1.bake) and batch 2 (akinza_clipset_b2.bake) with
    their own modules, each in a fresh interpreter under two hash seeds, and compare the poses files' sha256 with the stored bakes.
    (Batch 3 adds no rig key or corrective and changes no shared module: the run's feet use their own pivot, foot_target3.)"""
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
