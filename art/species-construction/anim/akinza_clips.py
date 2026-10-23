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

Idle (90 frames, frame 90 = frame 0): two breaths (the breath shape key of breath_key.py swells the ribcage out
and up, the clavicles lift the shoulders with the arms hanging as before, the chest pitches up a little and the head
rides with it), a weight shift forward and back (the hips and torso sway over the planted feet as one column, dipping
at the forward peak where the far knee softens), one flick of the near ear (ear_1.L only, a rigid swing back from
the base along the approved swept-back direction, 40 degrees, and return), and the three tails swaying, each with its
own phase and a lag down its chain, up and down as well as sideways. Every periodic term has a whole number of cycles
in the loop, so the seam is exact.

Night Stalk (45 frames, pass 2 timing from the blind critic): from idle frame 0, an anticipation over frames 1 to 4
(an inhale and a slight lean back, the tails still swaying at the idle rate), the sink over frames 6 to 15 into the
approved night_stalk pose (rig-p8b poses.json, held exactly: every body bone and the root move go from rest to their
night_stalk value by an eased share per bone group; the torso pitch starts with the knee bend and leads it, the
head's level-keeping turn lags a frame, the ears sweep from frame 4 and land at 11, the tails trail and arrive
together, the idle layer eases to a stop), settled at frame 16 (`conceal`), a 21-frame hold (one slow breath across
it and a twitch of the top tail's tip off the breath peak; frames 16, 36 and 37 are exactly night_stalk), then the
recovery from frame 37 (`recover`): the knees lead, the lean holds to frame 39 and the spine straightens last with
the ears, the idle layer easing back in on the clock that lands on idle frame 0 at frame 44.
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
# pass 2 (blind critic on clips pass 1): the breath and the weight shift did not read from the side (sizes now set
# in pixels at the 720 side framing, about 2.3 mm a pixel), the ear flick was too slow and small.
IDLE = dict(
    frames=90,
    breath_period_f=45,          # two breaths in the 3 s loop
    breath_inhale_share=.42,
    breath_scale=1.0,            # one breath is BREATH: chest and shoulders rise 6 to 8 px at 720, the head rides 3 to 4 px
    shift_y_m=.010,              # pass 2: the hips and torso sway forward and back 10 mm each way (about 9 px peak to
                                 #   peak at 720) over one 90-frame cycle, the body moving as one column ...
    shift_x_m=.003,              # ... with a little side to side, a quarter cycle later ...
    shift_dip_m=(.002, .004),    # ... dipping up to 2 mm, plus 4 mm at the forward peak so no leg ever straightens fully
    shift_soft_deg=1.6,          # the pelvis rolls so the far (right) hip drops at the forward peak: the far knee softens
    flick_start_f=52,            # near ear flick (ear_1.L only): out in 2 frames, back over 4 to a 1-frame overshoot
    flick_share=.444,            # share of the approved swept-back ear_1 rotation (90 degrees): 40 degrees back
    tail_period_f=90,            # tails unchanged from pass 1: one slow sway per loop ...
    tail_harmonic=.22,           # ... plus a little of the second harmonic so the path is not a pure sine
    tail_lag_f=2.6,              # lag per bone down each chain (the tip trails the root by about 13 frames)
    tail_phase={'a': 0., 'b': .22, 'c': .47},     # cycles: each tail its own phase
    tail_lift_deg={'a': (1.1, 1.4, 1.8, 2.2, 2.6), 'b': (1.0, 1.3, 1.6, 2.0, 2.4), 'c': (.8, 1.0, 1.3, 1.6, 2.0)},
    tail_yaw_deg={'a': (1.4, 1.8, 2.3, 2.8, 3.2), 'b': (1.3, 1.7, 2.1, 2.6, 3.0), 'c': (.9, 1.1, 1.4, 1.7, 2.0)},
    tail_yaw_lead=.25,           # cycles: the sideways sway leads the up-and-down one, so each tip draws an ellipse
    tail_bias_deg={'c': .4},     # lower tail carried a little higher (per bone), so its sway stays as far from the legs as at rest
)
# one full breath (b = 1), shared by the idle and the Night Stalk hold: the chest pitches up (the sternum rises, the
# upper chest goes back), the clavicles lift the shoulders, the spine takes a little, the neck and head turn back
# part of the chest's pitch so the head rides with the breath instead of nodding
BREATH = {'chest': [-1.2, 0., 0.], 'spine': [-.3, 0., 0.], 'clavicle.L': [0., -5.5, 0.], 'clavicle.R': [0., 5.5, 0.],
          'upperarm.L': [0., 5.5, 0.], 'upperarm.R': [0., -5.5, 0.],     # the arms hang as before: lifted, not swung out
          'neck': [.6, 0., 0.], 'head': [.2, 0., 0.]}
# with this, plus the breath shape key (breath_key.py: the ribcage out and up, the upper belly out), see measure.json

# ---------------------------------------------------------------- Night Stalk parameters (frames of 45)
# pass 2 timing (critic): anticipation 0-5, sink 6-15 (settled at 16, `conceal`), hold 16-36, recovery 37-44 (`recover`
# at 37), ending on idle frame 0. Each bone group follows its own key track of its share of the approved crouch:
# (frame, ease into this key, share). The torso pitch starts with the knee bend and leads it (critic: the torso stayed
# upright while the knees bent and read as a squat), the head's level-keeping turn lags a frame so the head travels
# forward and down, the ears start at frame 4 and land at 10 with a small settle, and on the way up the knees lead
# while the lean holds to frame 39 and the spine straightens last, with the ears.
STALK = dict(
    frames=45,
    tracks={
        'drop':   [(6, 'linear', 0.), (16, 'smooth', 1.), (37, 'linear', 1.), (43, 'smooth', 0.)],   # root move down (so the knees bend)
        'back':   [(6, 'linear', 0.), (13, 'smooth', 1.), (39, 'linear', 1.), (44, 'smooth', 0.)],   # root move back, with the lean it balances
        'pitch':  [(6, 'linear', 0.), (13, 'smooth', 1.), (39, 'linear', 1.), (44, 'smooth', 0.)],   # pelvis, spine, chest, tail root
        'head':   [(7, 'linear', 0.), (15, 'smooth', 1.), (39, 'linear', 1.), (44, 'smooth', 0.)],   # neck and head (their level-keeping turn)
        'arms':   [(7, 'linear', 0.), (16, 'smooth', 1.), (38, 'linear', 1.), (44, 'smooth', 0.)],
        'ears':   [(4, 'linear', 0.), (9, 'smooth', .93), (11, 'out', 1.), (39, 'linear', 1.), (44, 'smooth', 0.)],   # no overshoot past the approved swing (it folds the ear root): the last 7 percent settles over frames 9 to 11
        'tail_a': [(7, 'linear', 0.), (16, 'smooth', 1.), (38, 'linear', 1.), (44, 'smooth', 0.)],
        'tail_b': [(8, 'linear', 0.), (16, 'smooth', 1.), (38, 'linear', 1.), (44, 'smooth', 0.)],
        'tail_c': [(9, 'linear', 0.), (16, 'smooth', 1.), (38, 'linear', 1.), (44, 'smooth', 0.)],
    },
    # the live idle layer (tails swaying at the idle rate, breath, weight shift) runs on through the anticipation and
    # eases to a stop over the sink; on the way up it eases back in on the clock that lands on idle frame 0 at frame 44
    idle_w=[(6, 'linear', 1.), (15, 'smooth', 0.), (37, 'linear', 0.), (44, 'smooth', 1.)],
    # anticipation, frames 1-4: an inhale and a slight lean back (chest and shoulders up, head up), gone by frame 8
    anticipation=[(1, 'linear', 0.), (4, 'smooth', 1.), (8, 'smooth', 0.)],
    anticip={'pelvis': [-.4, 0., 0.], 'chest': [-1.2, 0., 0.], 'head': [-3.0, 0., 0.]},   # plus .7 of a breath (below)
    anticip_breath=.7,           # the anticipation's inhale: this share of a full breath (the breath key and rotations)
    hold=(16, 36),               # one slow breath across the hold (zero on frames 16 and 36, so 16 to 37 start and end on night_stalk)
    # the hold's breath, its own rotations: the crouched chest pitches up further and the clavicles lift half as far
    # with no arm counter-turn (the forward arms ride the shoulders), so the shoulder skin folds no more than the
    # approved crouch's; the ribcage key at 1.5 of a breath (2.1 folded the crouched chest's sides) (the crouched chest shows less of it from the side), no belly
    hold_layer={'chest': [-2.4, 0., 0.], 'spine': [-.7, 0., 0.], 'clavicle.L': [0., -2.4, 0.], 'clavicle.R': [0., 2.4, 0.],
                'neck': [2.0, 0., 0.], 'head': [.8, 0., 0.]},
    hold_breath_key=1.5,
    twitch=[(26, 'linear', 0.), (28, 'out', 1.), (33, 'smooth', 0.)],      # the top tail's tip: out over 26-28, settled by 33
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
    return 'pitch'         # pelvis, spine, chest, tail_root (the sacrum goes with the pelvis); the root move is 'drop'


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


# bones whose layer offset is applied in the parent's frame (pre-multiplied): the breath's arm counter-turn undoes the
# clavicle's lift in the parent's frame, so the arm keeps its world direction in any base pose (the crouch's arms
# reach forward; a post-multiplied counter-turn swung them)
PRE = {'upperarm.L', 'upperarm.R'}


def add_layer(pose, layer, k=1.):
    out = {b: list(v) for b, v in pose.items()}
    for b, e in layer.items():
        if k == 0:
            continue
        off = share_of(e, k) if k != 1 else e
        base = out.get(b, [0., 0., 0.])
        out[b] = rc.euler_from_matrix(rot(off)@rot(base)) if b in PRE else compose(base, off)
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
    for bone, e in BREATH.items():
        put(bone, [v*b*P['breath_scale'] for v in e])
    # weight shift (pass 2): the hips and torso sway forward and back over the planted feet as one column, a little
    # side to side a quarter cycle later; the body dips more at the forward peak and the pelvis rolls so the far hip
    # drops there, softening the far knee
    w = 2*math.pi*t
    sy, sx = math.sin(w), math.sin(w+math.pi/2)
    fwd = max(0., sy)                                # forward is -Y; the forward peak is a quarter of the way into the loop
    lift = np.array([P['shift_x_m']*sx, -P['shift_y_m']*sy,
                     -(P['shift_dip_m'][0]*(1-math.cos(w))/2+P['shift_dip_m'][1]*fwd*fwd)])
    put('pelvis', [0., -P['shift_soft_deg']*fwd*fwd, 0.])
    put('spine', [0., .6*P['shift_soft_deg']*fwd*fwd, 0.])
    put('chest', [0., .4*P['shift_soft_deg']*fwd*fwd, 0.])
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
    """Ear flick timeline (frames), share of the flick (pass 2, critic): out in 2 frames, back over 4 to a 1-frame
    overshoot forward, settled on the 7th frame (the return slower than the out-stroke, as in the research note)."""
    f0 = IDLE['flick_start_f']
    tr = cp.Track([(f0, 'linear', {}), (f0+2, 'out', {'a': 1.}), (f0+6, 'smooth', {'a': -.07}), (f0+7, 'smooth', {'a': 0.})])
    return tr(f)['a'] if f0 <= f <= f0+7 else 0.


def idle_frame(rig, f):
    lay, lift, info = idle_layers(rig, f)
    pose = rig.solve(lay, lift)
    v = round(info['breath']*IDLE['breath_scale'], 5)
    return dict(frame=f, pose=pose, lift=lift.tolist(), shapes=dict(breath=v, breath_belly=v), info=info)


# ---------------------------------------------------------------- Night Stalk

def track(keys, f):
    """Key track [(frame, ease into this key, value)] at frame f (value held before the first and after the last key)."""
    if f <= keys[0][0]:
        return keys[0][2]
    for (f0, _, v0), (f1, kind, v1) in zip(keys, keys[1:]):
        if f0 <= f <= f1:
            return v0+(v1-v0)*cp.ease(kind, (f-f0)/(f1-f0)) if f1 > f0 else v1
    return keys[-1][2]


def stalk_shares(f):
    P = STALK
    return {g: track(k, f) for g, k in P['tracks'].items()}, track(P['idle_w'], f)


def stalk_events():
    """conceal: the first frame every group is at its full crouch share with the idle layer gone; recover: the last
    such frame, the frame the recovery starts from."""
    full = [f for f in range(STALK['frames'])
            if all(abs(v-1) < 1e-12 for v in stalk_shares(f)[0].values()) and stalk_shares(f)[1] == 0]
    return dict(conceal=full[0], recover=full[-1])


def breath_layer(scale=1.):
    return {bone: [v*scale for v in e] for bone, e in BREATH.items()}


def stalk_frame(rig, f):
    P = STALK
    sh, idle_w = stalk_shares(f)
    # base: the approved crouch path, each bone at its group's share of its night_stalk rotation
    base = {}
    for b, e in rig.body.items():
        val = share_of(e, sh[group_of(b)])
        if any(abs(v) > 1e-12 for v in val):
            base[b] = val
    # the crouch's root move split (clips pass 2 measure): the hips go back with the lean that they counterbalance and
    # down with the knees; moving both on the knees' clock carried the head 18 px back at the end of the sink
    lift = np.array([sh['drop']*rig.lift[0], sh['back']*rig.lift[1], sh['drop']*rig.lift[2]])
    # the live idle layer: on the idle's own clock from idle frame 0 going in, and coming out on the clock that lands
    # on idle frame 0 at the last frame
    n = P['frames']
    phase = (f if f < n//2 else f-(n-1)) % IDLE['frames']
    lay, lift_i, info_i = idle_layers(rig, phase)
    pose = add_layer(base, lay, idle_w)
    lift = lift+idle_w*np.asarray(lift_i)
    an = track(P['anticipation'], f)
    if an > 0:
        pose = add_layer(pose, P['anticip'], an)
        pose = add_layer(pose, breath_layer(P['anticip_breath']), an)
    h0, h1 = P['hold']
    hb = cp.breath(f-h0, h1-h0, IDLE['breath_inhale_share']) if h0 <= f <= h1 else 0.
    if hb > 0:
        pose = add_layer(pose, P['hold_layer'], hb)
    tw = track(P['twitch'], f)
    if tw > 0:
        pose = add_layer(pose, {k: [v, 0., 0.] for k, v in P['twitch_deg'].items()}, tw)
    full = rig.solve(pose, lift)
    ib = idle_w*info_i['breath']*IDLE['breath_scale']+an*P['anticip_breath']
    shapes = dict(breath=round(ib+hb*P['hold_breath_key'], 5), breath_belly=round(ib, 5))   # the hold: no belly swell (it
    return dict(frame=f, pose=full, lift=lift.tolist(), shapes=shapes,                        # presses into the crouch's groin fold)
                info=dict(shares={g: round(v, 4) for g, v in sh.items()}, idle=round(idle_w, 4), idlePhase=phase,
                          anticipation=round(an, 4), holdBreath=round(hb, 4), twitch=round(tw, 4)))


def load_shapes(bake_dir):
    """The clip's shape keys (breath_key.py), {name: (ids, rest-space delta in rig metres)}; empty if none."""
    out = {}
    f = Path(bake_dir)/'breath_key.npz'
    if f.exists():
        z = np.load(f)
        out['breath'] = (z['ids'].astype(np.int64), z['delta'].astype(np.float64))
        if 'belly_ids' in z.files:
            out['breath_belly'] = (z['belly_ids'].astype(np.int64), z['belly_delta'].astype(np.float64))
    return out


def apply_shapes(points_m, frame, shapes, sel=None):
    """Rest skin (rig metres) plus each shape key at the frame's value, before the rig's correctives and skinning.
    sel: an optional sorted vertex subset that points_m holds."""
    vals = frame.get('shapes', {})
    if not shapes or not any(vals.get(k, 0) for k in shapes):
        return points_m
    x = points_m.copy()
    for k, (ids, dl) in shapes.items():
        v = vals.get(k, 0.)
        if not v:
            continue
        if sel is None:
            x[ids] += v*dl
        else:
            m = np.isin(ids, sel)
            x[np.searchsorted(sel, ids[m])] += v*dl[m]
    return x


def bake(rig_dir, out):
    rig = Rig(rig_dir)
    out = Path(out)
    idle = [idle_frame(rig, f) for f in range(IDLE['frames']+1)]          # frame 90 is the seam copy of frame 0
    stalk = [stalk_frame(rig, f) for f in range(STALK['frames'])]
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
