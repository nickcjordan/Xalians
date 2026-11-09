"""Akinza clip set batch 1 as code: hurt, evade and guard (plus guard's entry), side facing, in place, 30 fps.

  python art/species-construction/anim/akinza_clipset_b1.py bake <rig dir> <out dir> [--clips hurt,evade,guard,guard_in]
  python art/species-construction/anim/akinza_clipset_b1.py setup <rig dir> <out dir>     (guard's deepest frame, poses A and B)
  python art/species-construction/anim/akinza_clipset_b1.py verify-approved <rig dir> <approved bake dir> <scratch dir>

Built beside the approved idle and Night Stalk (akinza_clips.py, held byte-identical): this module imports their
rig, idle layers and helpers and changes none of them. `verify-approved` re-bakes idle and Night Stalk with
akinza_clips.bake into <scratch dir> and compares the poses files byte for byte with the approved bake.

A frame is a pose spec in the format of akinza_clips (per frame: pose, lift, shapes, info); `solve_feet` turns a body
pose (no legs) plus a root move and a spec per foot into the full pose: each foot's ankle target is its rest ankle
turned about a pivot (the front of the toe pads, so a heel rises, or the ankle in the air) and moved, the legs by the
rig's own two-bone IK with the fixed hinge planes (rig_core.plant_legs), then each foot turned to its world pitch.
Rig space: metres, +Z up, the creature faces -Y (back is +Y), its left is +X. A positive X rotation pitches a bone's
front down (a hanging arm swings back, a tail lifts, the jaw opens). Ears in hurt and evade pin back as the idle
flick does (ear_1 only, turned straight back with a slight outward swivel); guard's ears are a share of
night_stalk's back-and-out sweep (guard stopped at the setup check, see GUARD).

hurt (15 frames, `impact` at frame 2): from idle frame 0, a blow from the front: the head and chest snap back over
frames 1 to 3 (the head a little ahead of the chest), the hips pushed back and down, the face tipping up and the jaw
dropping a little; the arms lag the trunk by a frame and swing forward; both ears pin back (a rigid swing of ear_1)
over frames 1 and 2, hold to frame 6 and return by frame 12; the tails flick up with a lag down each chain and a
damped rebound; the body holds the snap to frame 5, comes back with a small forward rebound at frame 11 and lands on
idle frame 89 at frame 14 (the idle layer moving from the clock that starts at idle frame 0 to the clock that ends
on idle frame 89 under the hit).

evade (18 frames, `clear` at frame 6): a dip (frames 1 and 2, arms back, ears pinning), a push from the toe pads
(frame 3, heels up), a low flight backward (toes off at frame 4 to touchdown at 8, toes pointed, knees tucked, arms
forward, body leaning back into the travel), touchdown and absorb 33.5 cm behind the start (frames 8 and 9), a push at
10, then a quick, low hop forward (toes off at 11, touchdown at 14) back onto the idle spot and a settle onto idle
frame 89 at frame 17. Ears and tails follow
through. The root travels back and returns: the clip stays in place over its length.

guard (27-frame loop, `set` at frame 7 of the entry): sunk a little with the heels raised onto the toe pads (weight on
the balls of the feet), the trunk leaning forward, both forearms up in front of the chest and face with the claws
forward, ears back, tails a little lowered; one breath a loop (the chest, shoulders and arms rise and the body bobs a
little) and a tip twitch of the top tail. Every loop term has a whole cycle in 27 frames, so frame 27 equals frame 0.
guard_in (7 frames): the first time through, frames 0 to 6 of the loop are replaced by this entry from idle frame 0
(the arms lead, the body sinks, the ears go back fast, the tails a frame behind), arriving on loop frame 7 (`set`).
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

B = rc.ANIM_BONES
IDLE_N = ac.IDLE['frames']
TOE_PIVOT_Y = -.058          # the front of the toe pads (the sole's contact runs y -0.07 to +0.05 at rest)
LEG_BASES = ('thigh', 'shin', 'foot')


# ---------------------------------------------------------------- helpers

def rot(e):
    return rc.euler_matrix(*e)


def quat(e):
    q = rc.quat_from_matrix(rot(e))
    return q if q[0] >= 0 else -q


def slerp_e(e0, e1, t):
    """Rotation between Euler rotations e0 and e1 at share t (quaternion slerp), Euler degrees."""
    if t <= 0:
        return list(e0)
    if t >= 1:
        return list(e1)
    q0, q1 = quat(e0), quat(e1)
    d = float(q0@q1)
    if d < 0:
        q1, d = -q1, -d
    if d > 1-1e-9:
        q = q0+(q1-q0)*t
    else:
        th = math.acos(min(1., d))
        q = (math.sin((1-t)*th)*q0+math.sin(t*th)*q1)/math.sin(th)
    return rc.euler_from_matrix(rc._qmat(q/np.linalg.norm(q)))


def blend_poses(p0, p1, share_of_bone):
    """Per bone, slerp from p0 to p1 by share_of_bone(bone)."""
    out = {}
    for b in set(p0) | set(p1):
        out[b] = slerp_e(p0.get(b, [0., 0., 0.]), p1.get(b, [0., 0., 0.]), share_of_bone(b))
    return out


def turn(pose, bone, e, k=1., pre=False):
    """Add rotation e (share k) to a bone: in the bone's own frame (post), or the parent's frame (pre)."""
    if k == 0 or not any(e):
        return
    off = ac.share_of(e, k) if k != 1 else list(e)
    base = pose.get(bone, [0., 0., 0.])
    pose[bone] = rc.euler_from_matrix(rot(off)@rot(base)) if pre else ac.compose(base, off)


def table(vals, f):
    """Per-frame table at a (possibly fractional) frame: linear between frames, held outside."""
    if f <= 0:
        return vals[0]
    if f >= len(vals)-1:
        return vals[-1]
    i = int(math.floor(f))
    u = f-i
    return vals[i]*(1-u)+vals[i+1]*u


def vtable(rows, f):
    return np.array([table([r[k] for r in rows], f) for k in range(len(rows[0]))])


def body_only(pose):
    return {k: list(v) for k, v in pose.items() if rc.base_of(k) not in LEG_BASES}


def foot_target(J, sd, spec):
    """Ankle target and the foot's world rotation for a foot spec {t: (dx, dy, dz), pitch: degrees (+ = front down,
    so about the toe pivot the heel rises), pivot: 'toe' | 'ankle'}."""
    A0 = np.array(J[f'ankle.{sd}'], float)
    th = float(spec.get('pitch', 0.))
    Rf = rot([th, 0., 0.])
    pv = np.array([A0[0], TOE_PIVOT_Y, 0.]) if spec.get('pivot', 'toe') == 'toe' else A0
    return pv+Rf@(A0-pv)+np.asarray(spec.get('t', (0., 0., 0.)), float), Rf


def solve_feet(rig, body, lift, feet=None):
    """Body pose (no legs), root move and feet specs -> full pose and the ankle targets."""
    feet = feet or {}
    targets, Rfs = {}, {}
    for sd in 'LR':
        targets[sd], Rfs[sd] = foot_target(rig.J, sd, feet.get(sd, {}))
    pose = rc.plant_legs(rig.J, body, np.asarray(lift, float), {sd: targets[sd].tolist() for sd in 'LR'}, rig.poles, bones=B)
    if any(abs(feet.get(sd, {}).get('pitch', 0.)) > 1e-9 for sd in 'LR'):
        T = rc.bone_transforms(rig.J, pose, bones=B, root_translate=tuple(rc.lift_vec(lift)))
        for sd in 'LR':
            Rs = T[f'shin.{sd}'][0]
            pose[f'foot.{sd}'] = rc.euler_from_matrix(Rs.T@Rfs[sd])
    return pose, targets


def idle_pose(rig, phase, k=1.):
    """The idle layer at idle clock `phase` as a body pose, its root move and breath, at weight k."""
    lay, lift, info = ac.idle_layers(rig, phase % IDLE_N)
    return ac.add_layer({}, lay, k), k*np.asarray(lift, float), k*info['breath']*ac.IDLE['breath_scale']


def idle_pair(rig, f, n, wb):
    """The idle layer on the clock from idle frame 0 at weight 1-wb and on the clock that lands on idle frame 89 at
    the clip's last frame (n-1) at weight wb: at frame 0 with wb = 0 this is idle frame 0, at the last frame with
    wb = 1 it is idle frame 89."""
    lay_a, lift_a, info_a = ac.idle_layers(rig, f % IDLE_N)
    pb = (f-(n-1)+IDLE_N-1) % IDLE_N
    lay_b, lift_b, info_b = ac.idle_layers(rig, pb)
    pose = ac.add_layer({}, lay_a, 1-wb)
    pose = ac.add_layer(pose, lay_b, wb)
    lift = (1-wb)*np.asarray(lift_a)+wb*np.asarray(lift_b)
    breath = ((1-wb)*info_a['breath']+wb*info_b['breath'])*ac.IDLE['breath_scale']
    return pose, lift, breath, dict(idleClockA=f % IDLE_N, idleClockB=pb, idleB=round(wb, 4))


def night_ears(rig, k):
    """Both ears swung back by the share k of night_stalk's ear_1 rotation (the approved swept-back swing)."""
    return {b: ac.share_of(rig.body[b], k) for b in ('ear_1.L', 'ear_1.R')} if k else {}


MIRROR_X = np.diag([-1., 1., 1.])


def pinned_ears(rig, back_deg, swivel_deg=0.):
    """Both ears pinned back as a rigid swing of ear_1 (the idle flick's mechanism, clips pass 4): a slight outward
    swivel of the blade about its own base-to-tip line, then a turn straight back about the head's side-to-side axis.
    (Partway along night_stalk's back-and-out sweep the ear's opening faces the side camera and the blade shows
    broadside; the straight-back swing keeps it edge-on, flattened back.) The right ear mirrors the left."""
    if not back_deg and not swivel_deg:
        return {}
    u = np.subtract(rig.J['ear4.L'], rig.J['ear0.L']).astype(float)
    u /= np.linalg.norm(u)
    th = math.radians(swivel_deg)
    K = np.array([[0, -u[2], u[1]], [u[2], 0, -u[0]], [-u[1], u[0], 0]])
    Rsw = np.eye(3)+math.sin(th)*K+(1-math.cos(th))*K@K
    RL = rc.euler_matrix(-back_deg, 0., 0.)@Rsw
    return {'ear_1.L': rc.euler_from_matrix(RL), 'ear_1.R': rc.euler_from_matrix(MIRROR_X@RL@MIRROR_X)}


def frame_dict(f, pose, lift, breath, info, belly=None):
    v = round(float(breath), 5)
    return dict(frame=f, pose=pose, lift=[float(x) for x in lift],
                shapes=dict(breath=v, breath_belly=round(float(breath if belly is None else belly), 5)), info=info)


# ---------------------------------------------------------------- hurt

HURT = dict(
    frames=15, impact=2,
    # share of the full snap per group, by frame (frames 0..14); the return is eased (smoothstep) between keys
    tracks={
        'head':  [(0, 'linear', 0.), (1, 'linear', .45), (2, 'linear', .95), (3, 'linear', 1.), (4, 'linear', .97), (5, 'linear', .9),
                  (11, 'smooth', -.06), (14, 'smooth', 0.)],
        'trunk': [(0, 'linear', 0.), (1, 'linear', .3), (2, 'linear', .8), (3, 'linear', 1.), (4, 'linear', .97), (5, 'linear', .92),
                  (11, 'smooth', -.05), (14, 'smooth', 0.)],
        'arms':  [(0, 'linear', 0.), (1, 'linear', .08), (2, 'linear', .45), (3, 'linear', .88), (4, 'linear', 1.), (5, 'linear', .95),
                  (12, 'smooth', -.05), (14, 'smooth', 0.)],
        'ears':  [(0, 'linear', 0.), (1, 'linear', .55), (2, 'linear', 1.), (6, 'linear', 1.), (12, 'smooth', 0.)],
    },
    idle_b=[(2, 'linear', 0.), (10, 'smooth', 1.)],          # the idle clock handover, under the hit
    snap_lift=(0., .025, -.012),          # hips pushed back 25 mm and down 12 mm at the full snap
    snap={'pelvis': [-3., 0., 0.], 'spine': [-4., 0., 0.], 'chest': [-7., 0., 0.]},
    snap_head={'neck': [-4., 0., 0.], 'head': [-12., 0., 0.], 'jaw': [7., 0., 0.]},
    snap_arms={'upperarm.L': [-18., 0., 0.], 'upperarm.R': [-18., 0., 0.], 'forearm.L': [-15., 0., 0.], 'forearm.R': [-15., 0., 0.]},
    ear_back=48., ear_swivel=18.,          # degrees: ear_1 turned straight back (and swivelled out) at the full pin; 55 and 8
                                           # folded the ear root (115 triangles against the approved 50)
    # tails: a damped flick from frame 1 (up first), a lag per bone down each chain, faded out by frame 14
    tail_t0=1.0, tail_period=8., tail_decay=4.5, tail_lag={'a': .7, 'b': .8, 'c': .9}, tail_order={'a': 0., 'b': .5, 'c': 1.},
    tail_deg={'a': (5., 7., 9., 11., 13.), 'b': (5., 7., 9., 11., 13.), 'c': (4., 6., 8., 10., 12.)},
    tail_fade=(10, 14),
)


def hurt_group(b):
    if b.startswith('ear_'):
        return 'ears'
    if b in ('neck', 'head', 'jaw'):
        return 'head'
    if rc.base_of(b) in ('upperarm', 'forearm', 'hand'):
        return 'arms'
    return 'trunk'


def hurt_frame(rig, f):
    P = HURT
    n = P['frames']
    sh = {g: ac.track(k, f) for g, k in P['tracks'].items()}
    wb = ac.track(P['idle_b'], f)
    pose, lift, breath, info = idle_pair(rig, f, n, wb)
    for b, e in P['snap'].items():
        turn(pose, b, e, sh['trunk'])
    for b, e in P['snap_head'].items():
        turn(pose, b, e, sh['head'])
    for b, e in P['snap_arms'].items():
        turn(pose, b, e, sh['arms'])
    for b, e in pinned_ears(rig, P['ear_back']*sh['ears'], P['ear_swivel']*sh['ears']).items():
        turn(pose, b, e)
    fade = 1-cp.window(f, *P['tail_fade'])
    tails = {}
    for t in rc.TAILS:
        for k in range(1, rc.TAIL_BONES+1):
            x = f-P['tail_t0']-P['tail_order'][t]-P['tail_lag'][t]*(k-1)
            v = math.exp(-max(x, 0)/P['tail_decay'])*math.sin(2*math.pi*x/P['tail_period']) if x > 0 else 0.
            a = P['tail_deg'][t][k-1]*v*fade
            tails[f'tail_{t}{k}'] = round(v*fade, 4) if k == rc.TAIL_BONES else None
            turn(pose, f'tail_{t}{k}', [a, 0., 0.])
    lift = lift+sh['trunk']*np.asarray(P['snap_lift'])
    full, _ = solve_feet(rig, pose, lift)
    info.update(shares={g: round(v, 4) for g, v in sh.items()}, tailTip={k: v for k, v in tails.items() if v is not None},
                planted=dict(L=True, R=True))
    return frame_dict(f, full, lift, breath, info)


# ---------------------------------------------------------------- evade

# per-frame tables, frames 0..17. Root move (x, y back, z up) in metres, the clip's own layer (the idle layer adds its
# small weight shift on top at the two ends)
EVADE = dict(
    frames=18, clear=6,
    # check pass 2 timing: dip 1-2, push 3 (heels up), toes off at 4, flight 4-7, touchdown 8 (toes) about 30 cm back,
    # absorb 9, push 10, toes off at 11, flight 11-13, touchdown 14 on the idle spot, settle 15-16 onto idle frame 89
    # at 17. The first timing landed the return hop at 15 and left two frames to settle: the last step into idle frame
    # 89 moved the knees 20 mm (velocity change at the hand back to idle 20 mm against idle's own 3 mm step)
    # check pass 3 (render measure): with 21.5 cm of travel at frame 6 the trunk (pelvis, spine and chest skin) first
    # cleared where its back stood at frame 7; the flight back is now faster (about 7.7 cm a frame) so it clears at 6
    root=[(0, 0, 0), (0, .004, -.030), (0, .010, -.055), (0, .050, .004), (0, .120, .045), (0, .198, .058), (0, .275, .055),
          (0, .315, .035), (0, .335, .000), (0, .338, -.045), (0, .322, -.030), (0, .265, .030), (0, .175, .046),
          (0, .085, .036), (0, .018, .004), (0, .003, -.007), (0, .0005, -.0006), (0, 0, 0)],
    # feet: (dy, dz, pitch, pivot); pivot t = toe pads (the heel rises), a = ankle (in the air). Flight targets sit
    # under the hips and high enough that the knees stay bent (the legs' reach is checked per frame: ankle error 0)
    feet=[(0, 0, 0, 't'), (0, 0, 0, 't'), (0, 0, 0, 't'), (0, 0, 24, 't'), (.035, .010, 34, 't'), (.125, .060, 22, 'a'),
          (.215, .066, 14, 'a'), (.290, .036, 8, 'a'), (.335, 0, 10, 't'), (.335, 0, 0, 't'), (.335, 0, 20, 't'),
          (.305, .016, 26, 't'), (.190, .050, 14, 'a'), (.085, .040, 8, 'a'), (0, 0, 6, 't'), (0, 0, 0, 't'),
          (0, 0, 0, 't'), (0, 0, 0, 't')],
    planted=[1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1],    # 1: both feet on the floor (the toe pads at least)
    # trunk pitch (degrees, + leans forward), split pelvis .4, spine .3, chest .3; the head keeps .6 of it off
    lean=[0, 3, 6, -2, -6, -6, -5, -2, 3, 7, 5, 6, 5, 3, 3, 2, .5, 0],
    # arms (upperarm, forearm X; - swings forward), ears (pin share), tails (share of the lift)
    arms=[(0, 0), (8, 2), (14, 4), (6, -4), (-14, -18), (-20, -26), (-22, -28), (-16, -22), (-8, -12), (-10, -12), (2, -2),
          (-8, -14), (-14, -20), (-10, -14), (-5, -7), (-2, -3), (-.5, -.5), (0, 0)],
    ears=[0, .3, .52, .58, .58, .56, .55, .52, .46, .36, .36, .4, .38, .28, .14, .05, .01, 0],
    ear_back=82., ear_swivel=30.,          # degrees at an ears value of 1 (straight back, swivelled out): .58 is 48 back, 17 out
    tails=[0, -.15, -.3, .1, .65, 1., .9, .55, .1, -.6, -.5, .2, .5, .45, .1, -.15, -.08, 0],
    tail_lag=.7, tail_order={'a': 0., 'b': .4, 'c': .8},
    tail_deg={'a': (4., 6., 8., 10., 12.), 'b': (4., 6., 8., 10., 12.), 'c': (3., 5., 7., 9., 11.)},
    tail_fade=(13, 16),
    idle_b=[(12, 'linear', 0.), (16, 'smooth', 1.)],
    idle_a=[(0, 'linear', 1.), (3, 'smooth', 0.)],
)


def evade_frame(rig, f):
    P = EVADE
    n = P['frames']
    wa, wb = ac.track(P['idle_a'], f), ac.track(P['idle_b'], f)
    lay_a, lift_a, info_a = ac.idle_layers(rig, f % IDLE_N)
    pb = (f-(n-1)+IDLE_N-1) % IDLE_N
    lay_b, lift_b, info_b = ac.idle_layers(rig, pb)
    pose = ac.add_layer({}, lay_a, wa)
    pose = ac.add_layer(pose, lay_b, wb)
    lift = wa*np.asarray(lift_a)+wb*np.asarray(lift_b)+np.asarray(P['root'][f], float)
    breath = (wa*info_a['breath']+wb*info_b['breath'])*ac.IDLE['breath_scale']
    ln = P['lean'][f]
    for b, s in (('pelvis', .4), ('spine', .3), ('chest', .3)):
        turn(pose, b, [ln*s, 0., 0.])
    turn(pose, 'neck', [-.3*ln, 0., 0.])
    turn(pose, 'head', [-.3*ln, 0., 0.])
    ua, fa = P['arms'][f]
    for sd in 'LR':
        turn(pose, f'upperarm.{sd}', [ua, 0., 0.])
        turn(pose, f'forearm.{sd}', [fa, 0., 0.])
    for b, e in pinned_ears(rig, P['ear_back']*P['ears'][f], P['ear_swivel']*P['ears'][f]).items():
        turn(pose, b, e)
    fade = 1-cp.window(f, *P['tail_fade'])
    for t in rc.TAILS:
        for k in range(1, rc.TAIL_BONES+1):
            v = table(P['tails'], f-P['tail_order'][t]-P['tail_lag']*(k-1))
            turn(pose, f'tail_{t}{k}', [P['tail_deg'][t][k-1]*v*fade, 0., 0.])
    dy, dz, pitch, pv = P['feet'][f]
    spec = dict(t=(0., dy, dz), pitch=pitch, pivot='toe' if pv == 't' else 'ankle')
    full, targets = solve_feet(rig, pose, lift, {'L': spec, 'R': spec})
    info = dict(idleA=round(wa, 4), idleB=round(wb, 4), idleClockA=f % IDLE_N, idleClockB=pb, root=list(P['root'][f]),
                feet=dict(dy=dy, dz=dz, pitch=pitch, pivot=pv), planted=dict(L=bool(P['planted'][f]), R=bool(P['planted'][f])),
                targets={sd: [round(float(x), 6) for x in targets[sd]] for sd in 'LR'})
    return frame_dict(f, full, lift, breath, info)


# ---------------------------------------------------------------- guard

GUARD = dict(
    frames=27, set=7, entry_frames=7,
    lift=(0., .008, -.045),               # sunk 45 mm, the hips 8 mm back
    heel=8.,                              # heels raised 8 degrees about the toe pads: the weight on the balls of the feet
    trunk={'pelvis': [5., 0., 0.], 'spine': [3., 0., 0.], 'chest': [3., 0., 0.], 'neck': [-3., 0., 0.], 'head': [-4., 0., 0.]},
    clavicle={'clavicle.L': [0., -4., -8.], 'clavicle.R': [0., 4., 8.]},     # shoulders a little up and forward
    # world directions of the arm bones in the guard (left side; the right side mirrors x), the forearm up in front of
    # the chest, the hand forward and a little up, claws to the front. Setup check (2026-11-09): pose A, the upper arm
    # forward, down and in across the chest (-.30, -.86, -.40), folded the shoulders (armpit: 451 folded, 863 collapsed
    # triangles against the approved crouch's 5 and 27); pose B keeps the upper arm straight forward and a little out
    # (no swing across the chest), which holds the shoulders inside the approved maxima, and angles the forearm in
    arm_dirs={'upperarm.L': (.08, -.85, -.52), 'forearm.L': (-.30, -.30, .90), 'hand.L': (-.10, -.88, .46)},
    arm_dirs_pose_a={'upperarm.L': (-.30, -.86, -.40), 'forearm.L': (-.26, -.36, .90), 'hand.L': (-.06, -.88, .47)},
    ear_pin=.5,
    tail_share=.25,                        # tails a quarter of the way to their night_stalk pose (a little lowered)
    # the loop: one breath a loop, the chest and shoulders up and the body bobbing up on the inhale
    breath_inhale=.45,
    breath_rot={'chest': [-1.6, 0., 0.], 'spine': [-.5, 0., 0.], 'clavicle.L': [0., -3., 0.], 'clavicle.R': [0., 3., 0.],
                'neck': [.8, 0., 0.], 'head': [.6, 0., 0.]},
    breath_key=.8,
    bob_m=.008,                            # root up 8 mm on the full breath
    twitch=[(13, 'linear', 0.), (15, 'out', 1.), (20, 'smooth', 0.)],     # the top tail's tip: up over 2 frames, down over 5
    twitch_deg={'tail_a4': 6., 'tail_a5': 10.},
    # entry (first loop only): shares of the guard per group by frame 0..7 (7 = loop frame 7, `set`)
    entry={'arms':  [0., .12, .36, .63, .85, .96, .995, 1.],
           'body':  [0., .07, .24, .49, .73, .9, .98, 1.],
           'ears':  [0., .32, .72, .93, .99, 1., 1., 1.],
           'tails': [0., .02, .12, .32, .57, .8, .95, 1.]},
)


def guard_group(b):
    if b.startswith('ear_'):
        return 'ears'
    if b.startswith('tail'):
        return 'tails'
    if rc.base_of(b) in ('clavicle', 'upperarm', 'forearm', 'hand'):
        return 'arms'
    return 'body'


def mirror_dir(d):
    return (-d[0], d[1], d[2])


_GUARD_BASE = {}


def guard_base(rig):
    """The static guard body pose (no loop layers, no legs) and its root move; arms set by world direction."""
    key = id(rig)
    if key in _GUARD_BASE:
        return _GUARD_BASE[key]
    P = GUARD
    pose = {}
    for b, e in P['trunk'].items():
        turn(pose, b, e)
    for b, e in P['clavicle'].items():
        turn(pose, b, e)
    for b, e in night_ears(rig, P['ear_pin']).items():
        turn(pose, b, e)
    for b, e in rig.body.items():
        if b.startswith('tail'):
            turn(pose, b, ac.share_of(e, P['tail_share']))
    targets = {}
    for b, d in P['arm_dirs'].items():
        targets[b] = d
    for b, d in P['arm_dirs'].items():
        targets[b[:-1]+'R'] = mirror_dir(d)
    order = ['upperarm.L', 'forearm.L', 'hand.L', 'upperarm.R', 'forearm.R', 'hand.R']
    pose = rc.pose_from_directions(rig.J, {b: targets[b] for b in order}, base=pose, bones=B)
    out = ({k: list(map(float, v)) for k, v in pose.items()}, np.asarray(P['lift'], float))
    _GUARD_BASE[key] = out
    return out


def guard_loop_body(rig, f):
    """Guard loop frame f (periodic in 27): body pose, root move, breath key value, info."""
    P = GUARD
    n = P['frames']
    base, lift = guard_base(rig)
    pose = {k: list(v) for k, v in base.items()}
    b = cp.breath(f % n, n, P['breath_inhale'])
    for bone, e in P['breath_rot'].items():
        turn(pose, bone, [v*b for v in e])
    tw = ac.track(P['twitch'], f % n)
    for bone, deg in P['twitch_deg'].items():
        turn(pose, bone, [deg*tw, 0., 0.])
    lift = lift+np.array([0., 0., P['bob_m']*b])
    return pose, lift, P['breath_key']*b, dict(breath=round(b, 4), twitch=round(tw, 4))


def guard_feet(k=1.):
    spec = dict(pitch=GUARD['heel']*k, pivot='toe')
    return {'L': spec, 'R': spec}


def guard_frame(rig, f):
    pose, lift, bk, info = guard_loop_body(rig, f)
    full, targets = solve_feet(rig, pose, lift, guard_feet())
    info.update(heel=GUARD['heel'], planted=dict(L=True, R=True), plantedPart='toe pads (heels raised)')
    return frame_dict(f, full, lift, bk, info, belly=0.)


def guard_in_frame(rig, f):
    """Entry frame f (0..6): from idle frame f's pose toward guard loop frame f's, per group, arriving at loop frame 7."""
    P = GUARD
    e = {g: v[f] for g, v in P['entry'].items()}
    ip, ilift, ib = idle_pose(rig, f)
    gp, glift, gb, ginfo = guard_loop_body(rig, f)
    pose = blend_poses(ip, gp, lambda b: e[guard_group(b)])
    lift = (1-e['body'])*ilift+e['body']*glift
    full, _ = solve_feet(rig, pose, lift, guard_feet(e['body']))
    breath = (1-e['body'])*ib+e['body']*gb
    belly = (1-e['body'])*ib
    return frame_dict(f, full, lift, breath, dict(shares={g: round(v, 4) for g, v in e.items()}, idleClock=f, guard=ginfo,
                                                  heel=round(GUARD['heel']*e['body'], 3), planted=dict(L=True, R=True)), belly=belly)


# ---------------------------------------------------------------- bake

CLIPS = {'hurt': (hurt_frame, HURT['frames']), 'evade': (evade_frame, EVADE['frames']),
         'guard': (guard_frame, GUARD['frames']), 'guard_in': (guard_in_frame, GUARD['entry_frames'])}


def events():
    return {'hurt': [dict(name='impact', frame=HURT['impact'])], 'evade': [dict(name='clear', frame=EVADE['clear'])],
            'guard': [dict(name='set', frame=GUARD['set'])], 'guard_in': []}


def bake(rig_dir, out, clips=None):
    rig = ac.Rig(rig_dir)
    out = Path(out)
    clips = clips or list(CLIPS)
    for name in clips:
        fn, n = CLIPS[name]
        frames = [fn(rig, f) for f in range(n)]
        (out/name).mkdir(parents=True, exist_ok=True)
        (out/name/'poses.json').write_text(json.dumps(frames, indent=0))
        print('baked', name, n, flush=True)
    ev = events()
    spec = dict(fps=cp.FPS, rig=str(rig_dir), approvedClips='akinza_clips.py (idle, Night Stalk), unchanged',
                hurt=dict(frames=HURT['frames'], loop=False, events=ev['hurt'], startsOn='idle frame 0', endsOn='idle frame 89',
                          params=HURT),
                evade=dict(frames=EVADE['frames'], loop=False, events=ev['evade'], startsOn='idle frame 0', endsOn='idle frame 89',
                           params=EVADE),
                guard=dict(frames=GUARD['frames'], loop=True, events=ev['guard'], seamFrame=GUARD['frames'],
                           entry=dict(clip='guard_in', frames=GUARD['entry_frames'], rule='the first time through, play guard_in '
                                      'frames 0 to 6 in place of guard frames 0 to 6 (guard_in frame 0 is idle frame 0\'s pose and '
                                      'plays in its place), then guard from frame 7 (`set`, the guard fully up) and loop'),
                           params=GUARD))
    (out/'clipset-spec.json').write_text(json.dumps(spec, indent=1, default=str))


def bake_setup(rig_dir, out):
    """Setup check: guard's deepest frame (loop frame 0, the breath empty and the body at its lowest) on the bare rig,
    for pose A (the first arm placement) and pose B (the current one): <out>/guardA and <out>/guardB, one frame each."""
    rig = ac.Rig(rig_dir)
    out = Path(out)
    cur = GUARD['arm_dirs']
    for tag, dirs in (('guardA', GUARD['arm_dirs_pose_a']), ('guardB', cur)):
        GUARD['arm_dirs'] = dirs
        _GUARD_BASE.clear()
        (out/tag).mkdir(parents=True, exist_ok=True)
        (out/tag/'poses.json').write_text(json.dumps([guard_frame(rig, 0)], indent=0))
    GUARD['arm_dirs'] = cur
    _GUARD_BASE.clear()
    print('baked setup frames', flush=True)


def verify_approved(rig_dir, approved, scratch):
    """Re-bake idle and Night Stalk with the approved module into scratch and compare bytes with the approved bake."""
    scratch = Path(scratch)
    scratch.mkdir(parents=True, exist_ok=True)
    ac.bake(Path(rig_dir), scratch)
    res = {}
    for clip in ('idle', 'stalk'):
        a_ = (Path(approved)/clip/'poses.json').read_bytes()
        b_ = (scratch/clip/'poses.json').read_bytes()
        res[clip] = dict(identical=a_ == b_, bytes=[len(a_), len(b_)])
    print(json.dumps(res))
    return res


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('cmd', choices=['bake', 'setup', 'verify-approved'])
    p.add_argument('rig', type=Path)
    p.add_argument('out', type=Path)
    p.add_argument('scratch', type=Path, nargs='?')
    p.add_argument('--clips', default=None)
    a = p.parse_args()
    if a.cmd == 'bake':
        bake(a.rig, a.out, a.clips.split(',') if a.clips else None)
    elif a.cmd == 'setup':
        bake_setup(a.rig, a.out)
    else:
        verify_approved(a.rig, a.out, a.scratch)
