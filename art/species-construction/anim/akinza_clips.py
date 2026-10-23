"""Akinza slice clips as code (plan step 3): the idle loop and the Night Stalk signature, side facing, in place.

  python art/species-construction/anim/akinza_clips.py <rig dir> <out dir>

A clip is a function of the frame (30 fps) that returns a pose spec; `solve` turns the spec into bone rotations
on the rig of record (rig_core.ANIM_BONES, Euler degrees relative to the parent, the same as poses.json) plus a
root move, with both feet planted by the rig's own IK (rig_core.plant_legs: fixed hinge planes facing each
foot's forward direction, the foot keeping its rest world orientation where it stands). The root never moves.
Writes <out>/idle/poses.json and <out>/stalk/poses.json (per frame: pose, lift, the clip's shares and layers)
and <out>/clips-spec.json (frame counts, events, parameters).

Rig space: metres, +Z up, the creature faces -Y, its left is +X. A positive X rotation pitches a bone nose-down
(its front goes down; on a tail bone, which points back, it lifts the tail), Y rolls it, Z turns it. The near side to the side camera (azimuth 90, from +X) is .L.

Idle (90 frames, frame 90 = frame 0): two breaths (chest and spine lift, shoulders rise a little, the neck and
head counter-turn so the head stays level), a small weight shift (the hips circle a few millimetres over the
planted feet and dip as the weight moves across, so the knees soften), one flick of the near ear (ear_1.L only,
a rigid swing back from the base along the approved swept-back direction and return), and the three tails
swaying, each with its own phase and a lag down its chain, up and down as well as sideways. Every periodic term
has a whole number of cycles in the loop, so the seam is exact.

Night Stalk (45 frames): from idle frame 0, a small anticipation (the chest fills and the head lifts a little),
the sink into the approved night_stalk pose (rig-p8b poses.json, held exactly: every body bone and the root move
go from rest to the night_stalk value by an eased share, as the approved crouch clip did; bone groups are
staggered: the ears lead, body and legs, then head and neck in step so the head stays level, the tails trail and
arrive together), settle and hold (only a slow breath and a twitch of the top tail's tip, both zero on the
`conceal` and `recover` frames so those frames are exactly night_stalk), then the recovery back to idle frame 0
(body first, head and ears after, tails last). Idle frame 0's small offsets fade out during the sink and back in
during the recovery, so the last frame equals idle frame 0 and the game can return to the idle loop.
"""
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

B = rc.ANIM_BONES

# ---------------------------------------------------------------- idle parameters (degrees, metres, frames)
IDLE = dict(
    frames=90,
    breath_period_f=45,          # two breaths in the 3 s loop
    breath_inhale_share=.42,
    breath_chest_deg=-2.0,       # chest pitches up (sternum rises, upper chest goes back)
    breath_spine_deg=-.6,
    breath_clavicle_deg=1.2,     # shoulders rise a little on the inhale
    breath_neck_deg=1.7,         # neck and head counter-turn so the head stays level
    breath_head_deg=.6,
    shift_x_m=.006,              # hips circle over the planted feet: 6 mm side to side ...
    shift_y_m=.004,              # ... 4 mm fore and aft, a quarter cycle later ...
    shift_dip_m=(.0015, .0025),  # ... and dip 1.5 mm plus 2.5 mm as the weight moves over a foot, so the knees soften
    shift_pitch_deg=.6,          # the pelvis tips a little with the fore-aft shift; spine and chest take it back
    flick_start_f=52,            # near ear flick (ear_1.L only): out in 3 frames, back over 5 with a small overshoot
    flick_share=.30,             # share of the approved swept-back ear_1 rotation (night_stalk) at the flick's peak
    tail_period_f=90,            # one slow sway per loop ...
    tail_harmonic=.22,           # ... plus a little of the second harmonic so the path is not a pure sine
    tail_lag_f=2.6,              # lag per bone down each chain (the tip trails the root by about 13 frames)
    tail_phase={'a': 0., 'b': .22, 'c': .47},     # cycles: each tail its own phase
    tail_lift_deg={'a': (1.1, 1.4, 1.8, 2.2, 2.6), 'b': (1.0, 1.3, 1.6, 2.0, 2.4), 'c': (.8, 1.0, 1.3, 1.6, 2.0)},
    tail_yaw_deg={'a': (1.4, 1.8, 2.3, 2.8, 3.2), 'b': (1.3, 1.7, 2.1, 2.6, 3.0), 'c': (.9, 1.1, 1.4, 1.7, 2.0)},
    tail_yaw_lead=.25,           # cycles: the sideways sway leads the up-and-down one, so each tip draws an ellipse
    tail_bias_deg={'c': .4},     # lower tail carried a little higher (per bone), so its sway stays as far from the legs as at rest
)

# ---------------------------------------------------------------- Night Stalk parameters (frames of 45)
STALK = dict(
    frames=45,
    anticipation=(0, 3, 7),      # anticipation layer: rises frames 0 to 3, gone by frame 7
    anticip_chest_deg=-1.6,      # the chest fills ...
    anticip_head_deg=-3.0,       # ... and the head lifts a little (nose up)
    # sink windows (start, end frame) per bone group; all groups reach the night_stalk value by `conceal`
    sink={'ears': (3, 12), 'body': (4, 16), 'head': (4, 16), 'arms': (5, 16), 'tail_a': (5, 16), 'tail_b': (6, 16),
          'tail_c': (7, 16)},
    sink_ease='smooth',
    idle_fade=(3, 14),           # idle frame 0's offsets fade out over these frames ...
    # recovery windows: back to rest by the last frame (44)
    recover={'body': (32, 42), 'arms': (32, 43), 'head': (33, 43), 'ears': (34, 44), 'tail_a': (34, 44),
             'tail_b': (34, 44), 'tail_c': (34, 44)},
    idle_return=(33, 44),        # ... and back in over these
    hold_breath_deg=-.7,        # one slow breath in the hold, chest only, zero at conceal and recover
    hold_breath_spine_deg=-.3,
    twitch=(23, 25, 31),         # the top tail's tip: up over frames 23 to 25, back down by 31
    twitch_deg={'tail_a4': 5.0, 'tail_a5': 9.0},        # on a tail bone (pointing back) +X lifts it: the tip flicks up
)
GROUP_OF = {}


def group_of(bone):
    if bone.startswith('ear_'):
        return 'ears'
    if bone.startswith('tail_a'):
        return 'tail_a'
    if bone.startswith('tail_b'):
        return 'tail_b'
    if bone.startswith('tail_c'):
        return 'tail_c'
    if bone in ('neck', 'head'):
        return 'head'
    if rc.base_of(bone) in ('upperarm', 'forearm', 'hand', 'clavicle'):
        return 'arms'
    return 'body'          # pelvis, spine, chest, tail_root (the sacrum goes with the pelvis), and the root move


# ---------------------------------------------------------------- rotation helpers

def rot(e):
    return rc.euler_matrix(*e)


def compose(base, off):
    """Bone rotation `off` applied in the bone's own frame on top of `base` (both Euler degrees)."""
    return rc.euler_from_matrix(rot(base)@rot(off))


def share_of(e, f):
    """The share f of rotation e (slerp from rest about the same axis); f may be negative or above 1."""
    out = rc.slerp_pose({'x': e}, f)
    return out.get('x', [0., 0., 0.])


def add_layer(pose, layer, k=1.):
    out = {b: list(v) for b, v in pose.items()}
    for b, e in layer.items():
        if k == 0:
            continue
        off = share_of(e, k) if k != 1 else e
        out[b] = compose(out.get(b, [0., 0., 0.]), off)
    return out


class Rig:
    def __init__(self, rig_dir):
        R = Path(rig_dir)
        self.dir = R
        self.J = json.loads((R/'joints.json').read_text())
        poses = json.loads((R/'poses.json').read_text())
        self.night = poses['night_stalk']
        c = self.night['crouch']
        self.body = {k: list(v) for k, v in c['body'].items()}
        self.lift = np.array(c['lift'], float)
        self.feet = c['feet']
        self.poles = c['poles']

    def solve(self, body_pose, lift):
        """Body pose (no legs) and root move -> full pose with the legs by the planted-feet IK."""
        return rc.plant_legs(self.J, body_pose, np.asarray(lift, float), self.feet, self.poles, bones=B)


# ---------------------------------------------------------------- idle

def idle_layers(rig, f):
    """Idle frame f (0..89, periodic) -> (rotation layer {bone: euler}, root move, info)."""
    P = IDLE
    n = P['frames']
    t = (f % n)/n                                  # loop phase 0..1
    b = cp.breath(f % n, P['breath_period_f'], P['breath_inhale_share'])
    lay = {}

    def put(bone, e):
        lay[bone] = compose(lay.get(bone, [0., 0., 0.]), e)
    # breath
    put('chest', [P['breath_chest_deg']*b, 0., 0.])
    put('spine', [P['breath_spine_deg']*b, 0., 0.])
    put('neck', [P['breath_neck_deg']*b, 0., 0.])
    put('head', [P['breath_head_deg']*b, 0., 0.])
    put('clavicle.L', [0., -P['breath_clavicle_deg']*b, 0.])
    put('clavicle.R', [0., P['breath_clavicle_deg']*b, 0.])
    # weight shift: the hips circle over the feet and dip as they pass over each foot
    w = 2*math.pi*t
    sx, sy = math.sin(w), math.sin(w+math.pi/2)
    lift = np.array([P['shift_x_m']*sx, P['shift_y_m']*sy, -(P['shift_dip_m'][0]+P['shift_dip_m'][1]*sx*sx)])
    put('pelvis', [P['shift_pitch_deg']*sy, 0., 0.])
    put('spine', [-.6*P['shift_pitch_deg']*sy, 0., 0.])
    put('chest', [-.4*P['shift_pitch_deg']*sy, 0., 0.])
    # near ear flick: ear_1.L swings back along the approved swept-back direction and returns
    s = flick_share(f % n)
    if s:
        put('ear_1.L', share_of(rig.body['ear_1.L'], s*P['flick_share']))
    # tails
    for tl in rc.TAILS:
        for k in range(1, rc.TAIL_BONES+1):
            u = (f-P['tail_lag_f']*k)/P['tail_period_f']+P['tail_phase'][tl]
            lift_w = math.sin(2*math.pi*u)+P['tail_harmonic']*math.sin(4*math.pi*u+.7)
            yaw_w = math.sin(2*math.pi*(u+P['tail_yaw_lead']))+P['tail_harmonic']*math.sin(4*math.pi*(u+P['tail_yaw_lead'])+1.9)
            put(f'tail_{tl}{k}', [P['tail_bias_deg'].get(tl, 0.)-P['tail_lift_deg'][tl][k-1]*lift_w, 0., P['tail_yaw_deg'][tl][k-1]*yaw_w])
    return lay, lift, dict(breath=round(b, 4), flick=round(s, 4), shift=[round(float(v), 5) for v in lift])


def flick_share(f):
    """Ear flick timeline (frames), share of the flick: out in 3 frames (the measured fold speed, research note),
    back over 4 with a small overshoot forward, settled by frame 8 of the flick (the return slower than the fold)."""
    f0 = IDLE['flick_start_f']
    tr = cp.Track([(f0, 'linear', {}), (f0+3, 'out', {'a': 1.}), (f0+7, 'smooth', {'a': -.06}), (f0+8, 'smooth', {'a': 0.})])
    return tr(f)['a'] if f0 <= f <= f0+8 else 0.


def idle_frame(rig, f):
    lay, lift, info = idle_layers(rig, f)
    pose = rig.solve(lay, lift)
    return dict(frame=f, pose=pose, lift=lift.tolist(), info=info)


# ---------------------------------------------------------------- Night Stalk

def stalk_shares(f):
    P = STALK
    out = {}
    for g, (s0, s1) in P['sink'].items():
        r0, r1 = P['recover'][g]
        e = cp.window(f, s0, s1, P['sink_ease'])
        if f >= r0:
            e = 1-cp.window(f, r0, r1, 'smooth')
        out[g] = e
    idle_w = 1-cp.window(f, *P['idle_fade'])
    if f >= P['idle_return'][0]:
        idle_w = cp.window(f, *P['idle_return'])
    return out, idle_w


def stalk_events():
    P = STALK
    conceal = max(s1 for _, s1 in P['sink'].values())
    recover = min(r0 for r0, _ in P['recover'].values())
    return dict(conceal=conceal, recover=recover)


def stalk_frame(rig, f, idle0):
    P = STALK
    sh, idle_w = stalk_shares(f)
    ev = stalk_events()
    # base: the approved crouch path, each bone at its group's eased share
    base = {}
    for b, e in rig.body.items():
        val = share_of(e, sh[group_of(b)])
        if any(abs(v) > 1e-12 for v in val):
            base[b] = val
    lift = sh['body']*rig.lift
    # idle frame 0's offsets (rotations and root move), fading out and back in
    lay0, lift0, _ = idle0
    pose = add_layer(base, lay0, idle_w)
    lift = lift+idle_w*np.asarray(lift0)
    # anticipation
    a0, a1, a2 = P['anticipation']
    an = cp.window(f, a0, a1) if f <= a1 else 1-cp.window(f, a1, a2)
    if an > 0:
        pose = add_layer(pose, {'chest': [P['anticip_chest_deg'], 0., 0.], 'head': [P['anticip_head_deg'], 0., 0.]}, an)
    # hold: a slow breath and the top tail's tip twitch, both zero at conceal and recover
    hb = 0.
    if ev['conceal'] <= f <= ev['recover']:
        u = (f-ev['conceal'])/(ev['recover']-ev['conceal'])
        hb = .5-.5*math.cos(2*math.pi*u)
        pose = add_layer(pose, {'chest': [P['hold_breath_deg'], 0., 0.], 'spine': [P['hold_breath_spine_deg'], 0., 0.]}, hb)
    t0, t1, t2 = P['twitch']
    tw = cp.window(f, t0, t1, 'out') if f <= t1 else 1-cp.window(f, t1, t2, 'smooth')
    if t0 < f < t2 and tw > 0:
        pose = add_layer(pose, {k: [v, 0., 0.] for k, v in P['twitch_deg'].items()}, tw)
    full = rig.solve(pose, lift)
    return dict(frame=f, pose=full, lift=lift.tolist(),
                info=dict(shares={g: round(v, 4) for g, v in sh.items()}, idle=round(idle_w, 4), anticipation=round(an, 4),
                          holdBreath=round(hb, 4), twitch=round(tw if t0 < f < t2 else 0., 4)))


def bake(rig_dir, out):
    rig = Rig(rig_dir)
    out = Path(out)
    idle = [idle_frame(rig, f) for f in range(IDLE['frames']+1)]          # frame 90 is the seam copy of frame 0
    idle0 = idle_layers(rig, 0)
    stalk = [stalk_frame(rig, f, idle0) for f in range(STALK['frames'])]
    ev = stalk_events()
    for name, frames in (('idle', idle), ('stalk', stalk)):
        (out/name).mkdir(parents=True, exist_ok=True)
        (out/name/'poses.json').write_text(json.dumps(frames, indent=0))
    spec = dict(fps=cp.FPS, rig=str(rig_dir),
                idle=dict(frames=IDLE['frames'], loop=True, seamFrame=IDLE['frames'], events=[], params=IDLE,
                          note='frame 90 is baked and checked as the seam copy of frame 0; the clip plays frames 0 to 89'),
                nightStalk=dict(frames=STALK['frames'], loop=False, events=[dict(name='conceal', frame=ev['conceal']),
                                                                             dict(name='recover', frame=ev['recover'])],
                                params=STALK, groups={b: group_of(b) for b in rig.body}))
    (out/'clips-spec.json').write_text(json.dumps(spec, indent=1))
    print('baked idle', len(idle), 'stalk', len(stalk), 'events', ev)


if __name__ == '__main__':
    bake(Path(sys.argv[1]), Path(sys.argv[2]))
