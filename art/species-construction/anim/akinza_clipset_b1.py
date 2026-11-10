"""Akinza clip set batch 1 as code: hurt, evade and guard (plus guard's entry), side facing, in place, 30 fps.

  python art/species-construction/anim/akinza_clipset_b1.py bake <rig dir> <out dir> [--clips hurt,evade,guard,guard_in,guard_out]
  python art/species-construction/anim/akinza_clipset_b1.py setup <rig dir> <out dir>     (guard's deepest frame, pose B)
  python art/species-construction/anim/akinza_clipset_b1.py verify-approved <rig dir> <approved bake dir> <scratch dir>

Built beside the approved idle and Night Stalk (akinza_clips.py, held byte-identical): this module imports their
rig, idle layers and helpers and changes none of them. `verify-approved` re-bakes idle and Night Stalk with
akinza_clips.bake into <scratch dir> and compares the poses files byte for byte with the approved bake.

A frame is a pose spec in the format of akinza_clips (per frame: pose, lift, shapes, info); `solve_feet` turns a body
pose (no legs) plus a root move and a spec per foot into the full pose: each foot's ankle target is its rest ankle
turned about a pivot (the front of the toe pads, so a heel rises, or the ankle in the air) and moved, the legs by the
rig's own two-bone IK with the fixed hinge planes (rig_core.plant_legs), then each foot turned to its world pitch.
Rig space: metres, +Z up, the creature faces -Y (back is +Y), its left is +X. A positive X rotation pitches a bone's
front down (a hanging arm swings back, a tail lifts, the jaw opens). Ears in all three swing back and down along the
back of the head with the opening rolled a little out (tipped_ears: ear_1 only, turned about the vertical so the tip
goes back, then tipped down), kept under 65 degrees from vertical in the render (fix pass 2).

hurt (15 frames, `impact` at frame 2): from idle frame 0 (frame 1 within a few px of it), a blow from the front: the
head and chest snap back on frames 2 and 3 (the head a little ahead of the chest, peak at 3), the face tipping up a
little and the jaw dropping; the hips pushed back and down with a knee give over frames 2 to 5, feet planted; the arms
lag the trunk by a frame and swing forward; both ears swing back and down along the back of the head (a rigid ear_1
swing) on frames 2 and 3, hold to frame 6 and return by frame 12; the tails whip up over frames 2 to 4, overshoot back
at 6 and 7 and settle; the body holds the snap to frame 5, comes back with a small forward rebound at frame 11 and
lands on idle frame 89 at frame 14 (the idle layer moving from the clock that starts at idle frame 0 to the clock that
ends on idle frame 89 under the hit).

evade (18 frames, `clear` at frame 6): a dip (frames 1 and 2, arms back, ears going back), a push from the toe pads
(frame 3, heels clearly up), a flight backward (toes off at 4, the body rising, knees folding, the feet about 9 cm off
the floor at 5 and 6, arms back and out for balance, body leaning back into the travel), touchdown at 7 about 30 cm
behind the start, absorb 7 to 9, then two quick alternating shuffle steps forward (near foot 10 to 12, far foot 12 to
14) back onto the idle spot with the body leaning into the move, a knee give at 14 and 15 and a settle onto idle frame
89 at frame 17. Ears and tails follow
through. The root travels back and returns: the clip stays in place over its length.

guard (27-frame loop, `set` at frame 7 of the entry): sunk a little with the heels raised onto the toe pads (weight on
the balls of the feet), the trunk leaning forward, the upper arms forward and a little out, the forearms up in front of
the chest with the claws forward and the paws just under the muzzle (the head tucked down and in behind them, chin
lowered), ears swept back and down along the back of the head (a rigid ear_1 swing), tails a little lowered; one
breath a loop (the chest, shoulders and arms rise and the body bobs a little) and a tip twitch of the top tail. Every
loop term has a whole cycle in 27 frames, so frame 27 equals frame 0. The 81-degree elbow uses rig-p8b's elbow keys
(elbow_corrective.py). guard_in (7 frames): the first time through, frames 0 to 6 of the loop are replaced by this
entry from idle frame 0 (the arms lead, the body sinks, the ears go back fast, the tails a frame behind), arriving on
loop frame 7 (`set`); with loop frames 7 and 8 it is also the contract's `react` fallback (guard's first 300 ms).
guard_out (8 frames): the game finishes the loop, then plays this exit in place of the next loop's frames 0 to 7
(frame 0 is loop frame 0's pose, the last is idle frame 89's), then idle from frame 0.
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
TOE_PIVOT_Y = -.064          # the front of the toe pads (the sole's contact runs y -0.07 to +0.05 at rest; fix pass 2: was -.058,
                             # which put the toe tips 3.8 mm into the floor at evade's 40-degree heel lift)
LEG_BASES = ('thigh', 'shin', 'foot')


# ---------------------------------------------------------------- helpers

def rot(e):
    return rc.euler_matrix(*e)


def quat(e):
    q = rc.quat_from_matrix(rot(e))
    return q if q[0] >= 0 else -q


def slerp_e(e0, e1, t):
    """Rotation between Euler rotations e0 and e1 at share t (quaternion slerp), Euler degrees."""
    if t == 0:
        return list(e0)
    if t == 1:
        return list(e1)
    q0, q1 = quat(e0), quat(e1)          # (t outside 0..1 carries on along the same arc: an overshoot or a lead-in)
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
    so about the toe pivot the heel rises), pivot: 'toe' | 'ankle' | 'free'}. 'free' (fix pass 2, in the air): the foot
    keeps its rest turn relative to the shin, so the ankle does not bend and the rig's ankle keys stay at 0 (they are
    driven by the size of the ankle's bend whichever way it bends, and were sculpted for the crouch's bend the other
    way, so a pointed foot read as a bulge and a crease at the ankle)."""
    A0 = np.array(J[f'ankle.{sd}'], float)
    th = 0. if spec.get('pivot') == 'free' else float(spec.get('pitch', 0.))
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
    for sd in 'LR':
        if feet.get(sd, {}).get('pivot') == 'free':
            pose[f'foot.{sd}'] = [0., 0., 0.]
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
# the near (left) ear blade's opening at rest, the normal of its best-fit plane (rig-p8b rest skin, ear_1.L to ear_4.L
# weighted skin, SVD as pose_board.ear_swing measures it), signed to face forward
EAR_OPENING_L = np.array([.258, -.966, -.035])


def _frame(x, y):
    x = np.asarray(x, float)/np.linalg.norm(x)
    y = np.asarray(y, float)-x*(x@np.asarray(y, float))
    y /= np.linalg.norm(y)
    return np.stack([x, y, np.cross(x, y)], 1)


def _rodrigues(axis, deg):
    k = np.asarray(axis, float)/np.linalg.norm(axis)
    th = math.radians(deg)
    K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
    return np.eye(3)+math.sin(th)*K+(1-math.cos(th))*K@K


def tipped_ears(rig, yaw_deg, down_deg, roll_deg=0., k=1.):
    """Both ears swung back and down along the back of the head (fix pass 2, the critic: the straight-back pin laid the
    blade flat over the skull, 93 degrees in the render; the night_stalk-style sweep at a small angle stood the ear up
    behind the head): a rigid swing of ear_1 that turns the ear about the vertical so its tip goes back (yaw), tips it
    down about its own horizontal cross axis (down), and rolls it about its own line so the opening turns a little out
    (roll), at the share k of that swing (slerp from rest). The right ear mirrors the left."""
    if not k:
        return {}
    u = np.subtract(rig.J['ear4.L'], rig.J['ear0.L']).astype(float)
    u /= np.linalg.norm(u)
    R1 = _rodrigues([0., 0., 1.], yaw_deg)
    d1 = R1@u
    R2 = _rodrigues(np.cross([0., 0., 1.], d1), down_deg)@R1
    RL = _rodrigues(R2@u, roll_deg)@R2
    eL = ac.share_of(rc.euler_from_matrix(RL), k)
    eR = ac.share_of(rc.euler_from_matrix(MIRROR_X@RL@MIRROR_X), k)
    return {'ear_1.L': eL, 'ear_1.R': eR}


def swept_ears(rig, back_deg, out_deg=14., k=1.):
    """Both ears swept back and down along the back of the head (fix pass 2, the critic: the straight-back pin laid the
    blade flat over the skull, 93 degrees in the render): a rigid swing of ear_1 to night_stalk's construction
    (pose_board.ear_swing) at a smaller angle, the blade pointing `back_deg` from upright toward the back and `out_deg`
    outward with its opening rolled out, and the share k of that swing (slerp from rest). The right ear mirrors the left."""
    if not k:
        return {}
    b, o = math.radians(back_deg), math.radians(out_deg)
    d = np.array([math.sin(o), math.cos(o)*math.sin(b), math.cos(o)*math.cos(b)])
    u = np.subtract(rig.J['ear4.L'], rig.J['ear0.L']).astype(float)
    RL = _frame(d, [1., 0., 0.])@_frame(u, EAR_OPENING_L).T
    eL = ac.share_of(rc.euler_from_matrix(RL), k)
    eR = ac.share_of(rc.euler_from_matrix(MIRROR_X@RL@MIRROR_X), k)
    return {'ear_1.L': eL, 'ear_1.R': eR}


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
    # fix pass 2 (blind critic): H2, frame 1 stays within a few px of idle (the first build had the head at 60 percent of
    # its peak speed and the ears at full speed a frame before the impact: a flinch before contact); the first big move
    # is frame 2 (`impact`), the peak frame 3. Share of the full snap per group, by frame (frames 0..14); the return is
    # eased (smoothstep) between keys
    # fix pass 3 (H1, the head was carried, not struck): the neck snaps back and the head's chin-up snap (11 degrees
    # against the neck) peaks on frames 2 and 3 and is recovered by 6, while the trunk peaks a frame later (4), so the
    # head clearly leads the chest; frame 1 stays still
    tracks={
        'head':  [(0, 'linear', 0.), (1, 'linear', .03), (2, 'linear', .8), (3, 'linear', 1.), (4, 'linear', .95), (5, 'linear', .85),
                  (11, 'smooth', -.06), (14, 'smooth', 0.)],
        'chin':  [(0, 'linear', 0.), (1, 'linear', 0.), (2, 'linear', .85), (3, 'linear', 1.), (4, 'linear', .7), (5, 'linear', .3),
                  (6, 'smooth', 0.)],
        'trunk': [(0, 'linear', 0.), (1, 'linear', .02), (2, 'linear', .3), (3, 'linear', .75), (4, 'linear', 1.), (5, 'linear', .95),
                  (11, 'smooth', -.05), (14, 'smooth', 0.)],
        'arms':  [(0, 'linear', 0.), (1, 'linear', 0.), (2, 'linear', .15), (3, 'linear', .55), (4, 'linear', .9), (5, 'linear', 1.),
                  (12, 'smooth', -.05), (14, 'smooth', 0.)],
        'ears':  [(0, 'linear', 0.), (1, 'linear', 0.), (2, 'linear', .7), (3, 'linear', 1.), (6, 'linear', 1.), (12, 'smooth', 0.)],
        # H6: the lower body gives too: the hips pushed back and down (the knees bend) over frames 2 to 5, feet planted
        'hips':  [(0, 'linear', 0.), (1, 'linear', 0.), (2, 'linear', .35), (3, 'linear', .8), (4, 'linear', 1.), (5, 'linear', .85),
                  (11, 'smooth', -.04), (14, 'smooth', 0.)],
    },
    idle_b=[(2, 'linear', 0.), (10, 'smooth', 1.)],          # the idle clock handover, under the hit
    hips_lift=(.004, .030, -.028),        # at the full give: hips 30 mm back, 28 mm down (the knees bend), 4 mm to the side
    hips_rot={'pelvis': [0., -2., 0.]},   # the pelvis rolls a little with the side shift
    snap={'pelvis': [-3., 0., 0.], 'spine': [-4., 0., 0.], 'chest': [-7., 0., 0.]},
    # (fix pass 2 held the head level for a 65-degree ear limit, since withdrawn; fix pass 3: the neck snaps back 6 degrees
    # and the head adds an 11-degree chin-up snap that is gone by frame 6)
    snap_head={'neck': [-6., 0., 0.], 'jaw': [7., 0., 0.]},
    chin={'head': [-11., 0., 0.]},
    snap_arms={'upperarm.L': [-18., 0., 0.], 'upperarm.R': [-18., 0., 0.], 'forearm.L': [-15., 0., 0.], 'forearm.R': [-15., 0., 0.]},
    # fix pass 3: the ears go back to the approved Night Stalk ear pose (night_stalk's ear_1 swing at full share, relative
    # to the head) along Night Stalk's own sweep (the share of that rotation), on frames 2 and 3
    # H4: the tails whip up over frames 2 to 4 (twice the first build's swing), overshoot back down at 6 and 7 and settle;
    # a lag per bone down each chain and a little between the tails; faded out by frame 14
    tails=[0., 0., .55, 1., .75, .15, -.45, -.3, -.05, .05, 0., 0., 0., 0., 0.],
    tail_lag=.5, tail_order={'a': 0., 'b': .3, 'c': .6},
    tail_deg={'a': (8., 10., 12., 14., 16.), 'b': (8., 10., 12., 14., 16.), 'c': (7., 9., 11., 13., 15.)},
    tail_fade=(11, 14),
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
    for b, e in P['hips_rot'].items():
        turn(pose, b, e, sh['hips'])
    for b, e in P['snap_head'].items():
        turn(pose, b, e, sh['head'])
    for b, e in P['chin'].items():
        turn(pose, b, e, sh['chin'])
    for b, e in P['snap_arms'].items():
        turn(pose, b, e, sh['arms'])
    for b, e in night_ears(rig, sh['ears']).items():
        turn(pose, b, e)
    fade = 1-cp.window(f, *P['tail_fade'])
    tails = {}
    for t in rc.TAILS:
        for k in range(1, rc.TAIL_BONES+1):
            v = table(P['tails'], f-P['tail_order'][t]-P['tail_lag']*(k-1))*fade
            tails[f'tail_{t}{k}'] = round(v, 4) if k == rc.TAIL_BONES else None
            turn(pose, f'tail_{t}{k}', [P['tail_deg'][t][k-1]*v, 0., 0.])
    lift = lift+sh['hips']*np.asarray(P['hips_lift'])
    full, _ = solve_feet(rig, pose, lift)
    info.update(shares={g: round(v, 4) for g, v in sh.items()}, tailTip={k: v for k, v in tails.items() if v is not None},
                planted=dict(L=True, R=True))
    return frame_dict(f, full, lift, breath, info)


# ---------------------------------------------------------------- evade

# per-frame tables, frames 0..17. Root move (x, y back, z up) in metres, the clip's own layer (the idle layer adds its
# small weight shift on top at the two ends)
EVADE = dict(
    frames=18, clear=6,
    # fix pass 2 (blind critic): E2, the jump read as pulled back on a wire (the heel barely lifted, a 19 px peak, straight
    # legs, arms held forward): the heels clearly up at the push (frame 3, 40 degrees), toes off at 4, the body rising
    # and the knees folding in the air (the feet about 9 cm off the floor at 5 and 6), the arms back and out for balance,
    # touchdown at 7, absorb 7 to 9; the trunk first clears its starting spot at 6 (`clear`). E3, the return was a
    # second jump landing at full speed and stopping dead: now two quick alternating shuffle steps forward (the near foot
    # from 10 to 12, the far foot from 12 to 14, under 2 cm off the floor), the body leaning into the move, its speed
    # peaking at about 52 mm a frame (22 px at 720) early and slowing over the last four frames, a knee give at 14 and
    # 15, settled onto idle frame 89 at 17. Root (x, y back, z up) in metres per frame.
    root=[(0, 0, 0), (0, .004, -.035), (0, .012, -.060), (0, .060, -.005), (0, .135, .060), (0, .208, .085), (0, .278, .080),
          (0, .295, .020), (0, .300, -.040), (0, .300, -.048), (0, .272, -.036), (0, .222, -.030), (0, .170, -.032),
          (0, .118, -.028), (0, .070, -.034), (0, .026, -.020), (0, .002, -.0008), (0, 0, 0)],
    # (fix pass 3: at the push, frame 3, the feet rise 6 mm so the toe claws stand on the floor, not 2 px under it)
    # feet per side: (dy, dz, pitch, pivot); pivot t = toe pads (the heel rises), a = ankle (in the air), f = free (the
    # foot follows the shin, no ankle bend: E5, the pointed foot in the air creased the ankle). Flight targets sit under
    # the hips with the knees folded (the legs' reach is checked per frame: ankle error 0)
    feet={'L': [(0, 0, 0, 't'), (0, 0, 0, 't'), (0, 0, 6, 't'), (0, .006, 40, 't'), (.05, .062, 38, 'a'), (.14, .125, 0, 'f'),
                (.225, .115, 0, 'f'), (.30, 0, 12, 't'), (.30, 0, 0, 't'), (.30, 0, 0, 't'), (.30, 0, 16, 't'),
                (.15, .016, 4, 'a'), (0, 0, 4, 't'), (0, 0, 0, 't'), (0, 0, 0, 't'), (0, 0, 0, 't'), (0, 0, 0, 't'), (0, 0, 0, 't')],
          'R': [(0, 0, 0, 't'), (0, 0, 0, 't'), (0, 0, 6, 't'), (0, .006, 40, 't'), (.05, .062, 38, 'a'), (.14, .125, 0, 'f'),
                (.225, .115, 0, 'f'), (.30, 0, 12, 't'), (.30, 0, 0, 't'), (.30, 0, 0, 't'), (.30, 0, 0, 't'),
                (.30, 0, 0, 't'), (.30, 0, 18, 't'), (.15, .016, 4, 'a'), (0, 0, 4, 't'), (0, 0, 0, 't'), (0, 0, 0, 't'), (0, 0, 0, 't')]},
    planted={'L': [1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1],
             'R': [1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1]},
    # trunk pitch (degrees, + leans forward), split pelvis .4, spine .3, chest .3; the head keeps .6 of it off
    lean=[0, 4, 7, 0, -8, -8, -6, 0, 6, 7, 9, 10, 10, 9, 7, 4, 1, 0],
    # arms: upper arm X (+ swings back), upper arm out (degrees, the left arm's Y; the right mirrors), forearm X
    arms=[(0, 0, 0), (10, 0, 2), (16, -4, 4), (14, -12, -2), (18, -24, -8), (22, -30, -12), (20, -30, -12), (12, -22, -10),
          (4, -12, -8), (0, -6, -6), (-6, -4, -8), (-10, -2, -12), (-8, 0, -10), (-6, 0, -8), (-4, 0, -6), (-2, 0, -3),
          (-.5, 0, -.5), (0, 0, 0)],
    # ears: share of the back-and-down swing (tipped_ears, 30 back, 12 down, 8 rolled out)
    # fix pass 3: the ears reach the approved Night Stalk ear pose (share 1 of its sweep) at the top of the jump
    ears=[0, .4, .75, .95, 1., 1., 1., .95, .85, .8, .8, .75, .65, .5, .3, .12, .03, 0],
    tails=[0, -.15, -.3, .1, .65, 1., .9, .5, -.3, -.6, -.35, .1, .25, .2, .05, -.08, -.04, 0],
    tail_lag=.7, tail_order={'a': 0., 'b': .4, 'c': .8},
    # E4: the lower two tails' lift sits at the root and fades toward the tip (their bones' own curve stays; an even lift
    # per bone straightened them into spikes at 5 to 7)
    tail_deg={'a': (4., 6., 8., 10., 12.), 'b': (9., 6., 2., -1., -3.), 'c': (10., 5., 0., -5., -9.)},
    # the lower tail is nearly straight from the side at rest (5 degrees root to tip): in the air both lower tails also curl,
    # their tips dipping (no lag), so they arc rather than spike
    tail_curl=[0, 0, 0, 0, .5, 1., 1., .6, .2, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    tail_curl_deg={'b': (0., -2., -4., -5., -6.), 'c': (0., -4., -7., -9., -11.)},
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
    for b, s_ in (('pelvis', .4), ('spine', .3), ('chest', .3)):
        turn(pose, b, [ln*s_, 0., 0.])
    turn(pose, 'neck', [-.3*ln, 0., 0.])
    turn(pose, 'head', [-.3*ln, 0., 0.])
    ua, uo, fa = P['arms'][f]
    for sd, sg in (('L', 1.), ('R', -1.)):
        turn(pose, f'upperarm.{sd}', [ua, sg*uo, 0.])
        turn(pose, f'forearm.{sd}', [fa, 0., 0.])
    for b, e in night_ears(rig, P['ears'][f]).items():
        turn(pose, b, e)
    fade = 1-cp.window(f, *P['tail_fade'])
    for t in rc.TAILS:
        for k in range(1, rc.TAIL_BONES+1):
            v = table(P['tails'], f-P['tail_order'][t]-P['tail_lag']*(k-1))
            curl = P['tail_curl'][f]*P['tail_curl_deg'].get(t, (0.,)*rc.TAIL_BONES)[k-1]
            turn(pose, f'tail_{t}{k}', [P['tail_deg'][t][k-1]*v*fade+curl, 0., 0.])
    specs = {}
    for sd in 'LR':
        dy, dz, pitch, pv = P['feet'][sd][f]
        specs[sd] = dict(t=(0., dy, dz), pitch=pitch, pivot={'t': 'toe', 'a': 'ankle', 'f': 'free'}[pv])
    full, targets = solve_feet(rig, pose, lift, specs)
    info = dict(idleA=round(wa, 4), idleB=round(wb, 4), idleClockA=f % IDLE_N, idleClockB=pb, root=list(P['root'][f]),
                feet={sd: dict(zip(('dy', 'dz', 'pitch', 'pivot'), P['feet'][sd][f])) for sd in 'LR'},
                planted={sd: bool(P['planted'][sd][f]) for sd in 'LR'},
                targets={sd: [round(float(x), 6) for x in targets[sd]] for sd in 'LR'})
    return frame_dict(f, full, lift, breath, info)


# ---------------------------------------------------------------- guard

GUARD = dict(
    frames=27, set=7, entry_frames=7,
    lift=(0., .008, -.045),               # sunk 45 mm, the hips 8 mm back
    heel=8.,                              # heels raised 8 degrees about the toe pads: the weight on the balls of the feet
    # guard pass 2 (orchestrator, 2026-11-09): the arms are short, so the head tucks down and in behind the paws, chin
    # lowered, as the boxing cat's does (was neck -3, head -4: the muzzle's underside sat 37 mm over the paws' top; with
    # the head 10 degrees down, about 14 mm, the paws 6 cm in front of the face); the neck takes none of it (at 12 the
    # neck began to collapse), so it does not fold
    trunk={'pelvis': [5., 0., 0.], 'spine': [3., 0., 0.], 'chest': [3., 0., 0.], 'neck': [0., 0., 0.], 'head': [10., 0., 0.]},
    clavicle={'clavicle.L': [0., -4., -8.], 'clavicle.R': [0., 4., 8.]},     # shoulders a little up and forward
    # world directions of the arm bones in the guard (left side; the right side mirrors x), the forearm up in front of
    # the chest, the hand forward and a little up, claws to the front. Setup check (2026-11-09): pose A, the upper arm
    # forward, down and in across the chest (-.30, -.86, -.40), folded the shoulders (armpit: 451 folded, 863 collapsed
    # triangles against the approved crouch's 5 and 27) and was dropped; pose B keeps the upper arm straight forward and
    # a little out (no swing across the chest), which holds the shoulders inside the approved maxima, and angles the
    # forearm in. Its 85-degree elbow folded the crease (780 triangles); rig-p8b's elbow keys (elbow_corrective.py) fix it
    # (guard pass 2: the forearm angles further in, (-.30, -.30, .90) to (-.45, -.30, .84), and the hand up, so the paws
    # come in front of the face, about 10 cm either side of the midline at the wrist, not beside the cheeks)
    # fix pass 3 (G1, the pose read as begging: both arms together, one thin forearm from the side, pads to the front):
    # each arm on its own, the far paw higher and further forward than the near one, the forearms angled across the
    # front of the face, the wrists cocked so the hands point forward and a little down: the claws face the opponent and
    # the pads face down. World directions per side (the near arm is the left, +X)
    # (setup check: the far upper arm stays a little out, -.10, and not above -.50: raised further or turned in it folded
    # the far shoulder, 11 to 16 triangles; the hands point forward and a little up, a cocked wrist of 35 to 51 degrees:
    # pointed down 15 to 20 degrees, the wrists folded)
    arm_dirs={'upperarm.L': (.10, -.82, -.56), 'forearm.L': (-.55, -.25, .80), 'hand.L': (-.35, -.90, .20),
              'upperarm.R': (-.10, -.86, -.50), 'forearm.R': (.45, -.42, .79), 'hand.R': (.35, -.88, .32)},
    # fix pass 3: the ears are the approved Night Stalk ear pose (night_stalk's ear_1 swing, full share, relative to the head)
    tail_share=.25,                        # tails a quarter of the way to their night_stalk pose (a little lowered)
    # the loop: one breath a loop, the chest and shoulders up and the body bobbing up on the inhale
    breath_inhale=.45,
    # (guard pass 2: no clavicle lift in the breath, was 3 degrees; with the raised arms any clavicle lift took the shoulder
    # one folded triangle past the approved crouch's 5; the shoulders and arms still rise with the chest and the bob)
    # fix pass 3 (G4, too faint at 192 px with dead holds): the breath doubled (chest, bob, breath key), the head and the
    # paws 2.5 frames behind the chest (the paws' bob is taken off the upper arms and given back late; the head nods
    # late), the lower two tails sway a little (one cycle a loop) so no two frames hold still
    # (chest 2.8 degrees, not 3.2: at 3.2 the breath peak folded one shoulder triangle past the approved 5; neck .8 and head
    # .6: more collapsed up to 7 throat triangles under the tucked chin. The paws' lag is shared by the upper arm and the
    # wrist: all of it on the upper arm (8 degrees) folded one shoulder triangle past 5 on the exhale, and a share on the
    # forearm collapsed up to 12 elbow triangles (the static guard has 4); measured lag 2.4 frames. The head's lag is a neck turn in the chest's frame, not a nod: a 1.5-degree nod moved the head 0.25 frames
    # late; the neck turn moves it 2.5 frames late with no throat fold)
    breath_rot={'chest': [-2.8, 0., 0.], 'spine': [-1.0, 0., 0.],
                'neck': [.8, 0., 0.], 'head': [.6, 0., 0.]},
    breath_key=1.6,
    bob_m=.024,                            # root up 24 mm on the full breath (fix pass 3: was 12)
    lag_f=2.5,
    arm_lag_deg={'upperarm': 4., 'hand': 16.},     # arm turns (parent frame) that delay the paws' share of the bob
    head_lag_deg={'neck': 14.},            # the head's late rise (degrees per bone, parent frame for the neck)
    tail_sway={'b': (0., 1.2, 1.6, 2., 2.4), 'c': (0., 1.2, 1.6, 2., 2.4)}, tail_sway_phase={'b': 0., 'c': .5},
    # G4: the top tail's tip flicks up in 2 frames and back over 3 (about 20 px at 720)
    twitch=[(13, 'linear', 0.), (14, 'linear', .55), (15, 'linear', 1.), (16, 'linear', .5), (17, 'linear', .15), (18, 'smooth', 0.)],
    twitch_deg={'tail_a4': 12., 'tail_a5': 20.},
    # entry (first loop only): shares of the guard per group by frame 0..7 (7 = loop frame 7, `set`)
    # fix pass 3 (G2, the arm straightened into a level reach that overshot the guard by 19 px): the forearm folds to the
    # guard's bend first (by frame 3) while the elbow is still low, then the elbow rises, so the paw comes up close to the
    # chest and stops at the guard (at most 2.0 mm past the loop's most forward paw). (Tried: blending the arm bones by
    # world direction bent the elbow past 150 degrees, 581 folded triangles; folding past the guard's bend, to 1.18 or
    # 1.07, folded 516 or 46 even with rig-p8b's elbow_mush_deep keys.)
    entry={'fore':  [0., .4, .78, .98, 1., 1., 1., 1.],
           'upper': [0., .07, .22, .48, .74, .92, .99, 1.],
           'body':  [0., .07, .24, .49, .73, .9, .98, 1.],
           'ears':  [0., .25, .5, .68, .84, .94, .99, 1.],      # (fix pass 2: was .32, .72, .93 by frame 3: 67 degrees visible at 3)
           'tails': [0., .02, .12, .32, .57, .8, .95, 1.]},
    # exit (guard_out, 8 frames): played after loop frame 26 in place of the next loop's frames 0 to 7; frame 0 is loop
    # frame 0's pose, the last is idle frame 89's, so idle frame 0 follows (the Night Stalk entry and hand back rule). The
    # arms drop a little ahead of the body rising, the ears and tails follow; eased so the hand back runs at idle speed
    exit_frames=8,
    # (fix pass 3: the elbow drops first with the forearm held at the guard's bend, then the forearm drops, so the paw comes
    # down along the body and never forward of the loop's most forward paw (0.1 mm short of it at most). Folding the forearm
    # further, a share of -.02 at frame 2, collapsed 13 elbow triangles; the upper arm at .12 by frame 1 put the paw 4.9 mm
    # past the guard. The forearm eases into idle's paw, 4.7 mm on the last step, not 10.2, for the hand back)
    exit={'upper': [0., .06, .3, .64, .87, .97, 1., 1.],
          'fore':  [0., 0., 0., .12, .5, .84, .98, 1.],
          'body':  [0., .1, .32, .58, .8, .94, .99, 1.],
          'ears':  [0., .08, .26, .5, .74, .9, .98, 1.],
          'tails': [0., .05, .18, .4, .64, .85, .96, 1.]},
)


def guard_group(b):
    if b.startswith('ear_'):
        return 'ears'
    if b.startswith('tail'):
        return 'tails'
    if rc.base_of(b) in ('clavicle', 'upperarm'):
        return 'upper'
    if rc.base_of(b) in ('forearm', 'hand'):
        return 'fore'
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
    for b, e in night_ears(rig, 1.).items():
        turn(pose, b, e)
    for b, e in rig.body.items():
        if b.startswith('tail'):
            turn(pose, b, ac.share_of(e, P['tail_share']))
    targets = dict(P['arm_dirs'])
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
    bl = cp.breath((f-P['lag_f']) % n, n, P['breath_inhale'])         # the head's and paws' late breath
    for bone, e in P['breath_rot'].items():
        turn(pose, bone, [v*b for v in e])
    for sd in 'LR':
        for ab, deg in P['arm_lag_deg'].items():
            turn(pose, f'{ab}.{sd}', [-deg*(bl-b), 0., 0.], pre=True)
    for hb, deg in P['head_lag_deg'].items():
        turn(pose, hb, [-deg*(bl-b), 0., 0.], pre=(hb == 'neck'))
    for t, degs in P['tail_sway'].items():
        for k in range(1, rc.TAIL_BONES+1):
            turn(pose, f'tail_{t}{k}', [degs[k-1]*math.sin(2*math.pi*((f-1.2*k) % n)/n+2*math.pi*P['tail_sway_phase'][t]), 0., 0.])
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


def guard_out_frame(rig, f):
    """Exit frame f (0..7): from guard loop frame f's pose (frame 0 is loop frame 0's) toward the idle on the clock that
    lands on idle frame 89 at the last frame, per group."""
    P = GUARD
    n = P['exit_frames']
    e = {g: v[f] for g, v in P['exit'].items()}
    gp, glift, gb, ginfo = guard_loop_body(rig, f)
    phase = IDLE_N-1-(n-1)+f
    ip, ilift, ib = idle_pose(rig, phase)
    pose = blend_poses(gp, ip, lambda b: e[guard_group(b)])
    lift = (1-e['body'])*glift+e['body']*ilift
    full, _ = solve_feet(rig, pose, lift, guard_feet(1-e['body']))
    breath = (1-e['body'])*gb+e['body']*ib
    return frame_dict(f, full, lift, breath, dict(shares={g: round(v, 4) for g, v in e.items()}, idleClock=phase, guard=ginfo,
                                                  heel=round(GUARD['heel']*(1-e['body']), 3), planted=dict(L=True, R=True)),
                      belly=e['body']*ib)


# ---------------------------------------------------------------- bake

CLIPS = {'hurt': (hurt_frame, HURT['frames']), 'evade': (evade_frame, EVADE['frames']),
         'guard': (guard_frame, GUARD['frames']), 'guard_in': (guard_in_frame, GUARD['entry_frames']),
         'guard_out': (guard_out_frame, GUARD['exit_frames'])}


def events():
    return {'hurt': [dict(name='impact', frame=HURT['impact'])], 'evade': [dict(name='clear', frame=EVADE['clear'])],
            'guard': [dict(name='set', frame=GUARD['set'])], 'guard_in': [], 'guard_out': []}


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
                           exit=dict(clip='guard_out', frames=GUARD['exit_frames'], rule='the game finishes the current loop (frame 26), '
                                     'then plays guard_out (its frame 0 is loop frame 0\'s pose and plays in its place; its last frame is '
                                     'idle frame 89\'s pose), then idle from frame 0'),
                           react='the contract\'s fallback for react is guard\'s first 300 ms: guard_in frames 0 to 6, then loop frames 7 and 8',
                           params=GUARD))
    (out/'clipset-spec.json').write_text(json.dumps(spec, indent=1, default=str))


def bake_setup(rig_dir, out):
    """Setup check: guard's deepest frame (loop frame 0, the breath empty and the body at its lowest) on the bare rig,
    pose B (pose A, the arms across the chest, folded the shoulders and was dropped): <out>/guardB, one frame."""
    rig = ac.Rig(rig_dir)
    out = Path(out)
    _GUARD_BASE.clear()
    (out/'guardB').mkdir(parents=True, exist_ok=True)
    (out/'guardB'/'poses.json').write_text(json.dumps([guard_frame(rig, 0)], indent=0))
    print('baked setup frame', flush=True)


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
