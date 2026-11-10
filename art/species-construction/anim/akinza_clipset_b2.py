"""Akinza clip set batch 2 as code: displaced, held (with held_in and held_out) and faint, side facing, 30 fps.

  python art/species-construction/anim/akinza_clipset_b2.py bake <rig dir> <out dir> [--clips displaced,held,held_in,held_out,faint]
      [--rest <rest skin npz>] [--faint A|B|C]
  python art/species-construction/anim/akinza_clipset_b2.py setup <rig dir> <out dir> [--rest <rest skin npz>]
  python art/species-construction/anim/akinza_clipset_b2.py verify-approved <rig dir> <approved bake dir> <batch 1 bake dir> <scratch dir>

Built beside the approved idle and Night Stalk (akinza_clips.py) and batch 1's hurt, evade and guard (akinza_clipset_b1.py):
this module imports their rig, idle layers, foot solver, ear line and helpers and changes none of them. `verify-approved`
re-bakes idle, Night Stalk and the batch 1 clips with their own modules (PYTHONHASHSEED pinned: guard_in and guard_out write
their pose keys in set order, so their bytes depend on the hash seed) and compares the poses files byte for byte.

Frames use batch 1's format (per frame: pose, lift, shapes, info). Poses are written in the rig's bone order, so the bytes do
not depend on the hash seed. Rig space: metres, +Z up, the creature faces -Y, its left (+X) is the near side to the side
camera. A positive X rotation pitches a bone's front down (a hanging arm or leg swings back, a tail lifts).

faint lies on the ground, so its legs are posed by hand (FK) once the feet leave the floor and the whole body turns on the
root bone (its head is the floor point under the pelvis); its root move is set per frame from the posed skin so the lowest
skin point rests on the floor (the rest skin is needed for the bake: --rest).
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
# px of idle frame 0; the hit (2, `impact`) drives the hips back and the trunk and head back from the hips; the arms fly up
# and out a frame behind; the near foot peels (3), lifts (4, 5) and lands toes first a step behind (6, 7) to catch the weight;
# a wobble forward over the new base (8, 9) and back (10, 11); the near foot steps back to its spot (12 to 15); settled by
# 18 (`settle`), idle frame 89's pose at 20.
DISPLACED = dict(
    frames=21, impact=2, settle=18,
    # root (x, y back, z up), metres: the hips driven back 19 cm and down 5.5 cm, the wobble, the return
    root=[(0, 0, 0), (0, .002, 0), (0, .055, -.012), (0, .11, -.026), (0, .15, -.038), (0, .175, -.05), (0, .19, -.058),
          (0, .194, -.056), (0, .182, -.046), (0, .172, -.038), (0, .176, -.042), (0, .166, -.044), (0, .14, -.04),
          (0, .10, -.034), (0, .058, -.028), (0, .024, -.02), (0, .008, -.012), (0, .002, -.006), (0, 0, -.002),
          (0, 0, 0), (0, 0, 0)],
    # feet: (dy back, dz up, pitch, pivot) as evade's (t toe pads, a ankle, f free); the near (left) foot steps
    feet={'L': [(0, 0, 0, 't'), (0, 0, 0, 't'), (0, 0, 0, 't'), (0, 0, 10, 't'), (.06, .055, 0, 'f'), (.16, .07, 0, 'f'),
                (.245, .012, 16, 't'), (.25, 0, 6, 't'), (.25, 0, 0, 't'), (.25, 0, 0, 't'), (.25, 0, 0, 't'), (.25, 0, 0, 't'),
                (.25, 0, 12, 't'), (.18, .045, 0, 'f'), (.08, .045, 0, 'f'), (0, .006, 6, 't'), (0, 0, 0, 't'), (0, 0, 0, 't'),
                (0, 0, 0, 't'), (0, 0, 0, 't'), (0, 0, 0, 't')],
          'R': [(0, 0, 0, 't')]*21},
    planted={'L': [1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1], 'R': [1]*21},
    # trunk pitch (degrees, + leans forward), split pelvis .3, spine .35, chest .35: thrown back at the hit, forward over the
    # stepped foot (the wobble), into the return step
    lean=[0, 0, -12, -21, -25, -21, -13, -4, 4, 3, -2, 0, 5, 7, 6, 4, 2, 1, 0, 0, 0],
    # the head: a share of the trunk's lean taken off by the neck (the head keeps its line), plus a lag: the head trails the
    # trunk's throw by a frame (chin toward the chest at the hit, then whipped back)
    head_lag=[0, 0, 7, 2, -5, -6, -3, 1, 2, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    # sideways (the stepping side): the hips drop toward the near foot as it lifts, the body rolls a little (pelvis Y)
    roll=[0, 0, 0, 2, 4, 5, 4, 2, 0, -1, 0, 0, 1, 3, 3, 2, 1, 0, 0, 0, 0],
    # arms: upper arm X (- raises forward), upper arm out (degrees, the left arm's Y; the right mirrors), forearm X; the far
    # arm a frame behind the near one
    arms=[(0, 0, 0), (0, 0, 0), (-6, -14, -14), (-18, -38, -38), (-28, -55, -58), (-32, -62, -68), (-28, -56, -62), (-20, -44, -48),
          (-12, -30, -32), (-10, -26, -26), (-14, -30, -30), (-10, -22, -22), (-6, -14, -14), (-4, -9, -9), (-3, -5, -5),
          (-2, -3, -3), (-1, -1, -1), (0, 0, 0), (0, 0, 0), (0, 0, 0), (0, 0, 0)],
    arm_lag={'L': 0., 'R': 1.},
    # ears: shares of Night Stalk's ear sweep on screen (set_ear_line): swept back by the lurch a frame after the hit, swung
    # with the wobble, released into idle's ears
    ears=[0, 0, .15, .45, .7, .78, .7, .55, .4, .45, .5, .4, .3, .2, .12, .06, .02, 0, 0, 0, 0],
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
    cb.set_ear_line(rig, pose, P['ears'][f], toward=ipose if f > 7 else None)
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
# bursts again a different way; the tail lashes through it. Here: a base pose with the arms pressed to the sides and the
# knees a little bent, three strains a loop at uneven spacing and size (each a quick pull, a short hold and a slower give),
# a tremor between them, the tails lashing on their own whole-loop rhythms plus a whip with each strain. Every term is
# periodic in 45 frames, so frame 45 equals frame 0.
HELD = dict(
    frames=45, entry_frames=6, exit_frames=10,
    # the pin: the upper arms pressed in against the ribs and a little back, the forearms in along the hips; the clavicles
    # drawn down a little (the grip); weight a little down and back, the trunk a touch forward
    # (setup: 9 and 6 degrees in left the arms 13 to 61 mm off the sides; 13 and 8, and 11 and 7, pressed them into the hips at
    # rest, 917 and 34 arm vertices inside; 10 and 6 lay them 7 mm off the hips at rest, 10 to 55 mm in the strains)
    pin={'upperarm.L': [10., 10., 0.], 'upperarm.R': [10., -10., 0.], 'forearm.L': [-4., 6., 0.], 'forearm.R': [-4., -6., 0.],
         'hand.L': [4., 0., 0.], 'hand.R': [4., 0., 0.], 'clavicle.L': [0., -4., 0.], 'clavicle.R': [0., 4., 0.],
         'pelvis': [5., 0., 0.], 'spine': [3., 0., 0.], 'chest': [2., 0., 0.]},
    lift=(0., .012, -.03),
    level_head={'neck': [-6., 0., 0.], 'head': [-8., 0., 0.]},       # (4 degrees chin-up: the f18 line then needs less ear swing)
    # the ears draw Night Stalk f18's line on screen (rule 1) but turn no more than `ear_cap` degrees from f18's own pose relative
    # to the head (setup: with the head's jerks the full line needed up to 44 degrees beyond f18 and folded the ear root 547
    # against the approved 50; capped at 4 degrees it folded 53 to 78)
    ear_cap=1.,
    # strains: (centre frame, onset, hold, release, size, the moves at full size). Moves: twist (chest and spine Z, + turns the
    # chest toward the camera), bend (spine and chest Y), lean (trunk X), head yaw and pitch, shrug (clavicle raise, near and
    # far), drop (root z), back (root y)
    strains=[
        dict(at=6, on=3, hold=3, rel=7, k=1.0, twist=18., bend=6., lean=-10., head_yaw=-20., head_pitch=-10., shrug=(-6., -2.),
             drop=.015, back=.03),
        dict(at=18, on=4, hold=4, rel=7, k=1.0, twist=-20., bend=-7., lean=12., head_yaw=10., head_pitch=-4., shrug=(-3., -7.),
             drop=.03, back=-.02),
        dict(at=33, on=3, hold=2, rel=6, k=.7, twist=10., bend=-4., lean=-9., head_yaw=-14., head_pitch=-8., shrug=(-5., -5.),
             drop=-.01, back=.025),
    ],
    tremor=dict(cycles=9, chest=1.2, head=0.),          # (a head tremor of 1.5 degrees folded the ear root 51 on its chin-down beats)
    # the feet shift on the spot: the near foot steps 5 cm forward in strain 2 and back in strain 3; the far heel lifts in
    # strain 1. Per foot: list of (frame, dy, dz, pitch) keys, linear between, periodic
    near_foot=[(0, 0., 0., 0.), (16, 0., 0., 0.), (17, 0., 0., 10.), (18, -.02, .035, 0.), (19, -.045, .03, 0.), (20, -.05, .008, 0.),
               (21, -.05, 0., 0.), (31, -.05, 0., 0.), (32, -.05, 0., 10.), (33, -.03, .03, 0.), (34, -.005, .02, 0.), (35, 0., .008, 0.),
               (36, 0., 0., 0.), (45, 0., 0., 0.)],
    far_foot=[(0, 0., 0., 0.), (3, 0., 0., 0.), (4, 0., 0., 9.), (5, 0., 0., 14.), (8, 0., 0., 14.), (10, 0., 0., 6.), (12, 0., 0., 0.),
              (45, 0., 0., 0.)],
    # tails lash: per tail, a lift and a yaw wave per bone (degrees at the tip bone, falling toward the root), whole cycles a
    # loop, a lag down each chain; plus a whip with each strain
    tail_waves={'a': dict(cycles=3, lift=9., yaw=11., phase=0.), 'b': dict(cycles=2, lift=8., yaw=13., phase=.3),
                'c': dict(cycles=3, lift=7., yaw=10., phase=.6)},
    tail_lag_f=1.4, tail_whip_deg=10.,
)


def ear_line_capped(rig, pose, e, cap, toward=None):
    """set_ear_line (the ears on Night Stalk's line on screen at share e), then each ear_1 pulled back toward the share e of f18's
    own pose relative to the head until it is at most `cap` degrees from it (the ear root folds past f18's pose)."""
    cb.set_ear_line(rig, pose, e, toward=toward)
    for b in cb.EAR_ROOTS:
        ref = ac.share_of(rig.body[b], e)
        D = rot(ref).T@rot(pose[b])
        ang = math.degrees(math.acos(max(-1., min(1., (np.trace(D)-1)/2))))
        if ang > cap:
            pose[b] = slerp_e(ref, pose[b], cap/ang)


def _strain_env(f, st, n):
    """The envelope of one strain at frame f (periodic in n): a quick ease-out onset, a hold, a smooth release."""
    best = 0.
    for sh in (-n, 0, n):
        u = f-(st['at']+sh)
        if -st['on'] <= u <= 0:
            v = cp.ease('out', (u+st['on'])/st['on'])
        elif 0 < u <= st['hold']:
            v = 1.
        elif st['hold'] < u <= st['hold']+st['rel']:
            v = 1-cp.ease('smooth', (u-st['hold'])/st['rel'])
        else:
            v = 0.
        best = max(best, v)
    return best*st['k']


def _keys_periodic(keys, f, n):
    f = f % n
    for k0, k1 in zip(keys, keys[1:]):
        if k0[0] <= f <= k1[0]:
            u = (f-k0[0])/(k1[0]-k0[0]) if k1[0] > k0[0] else 1.
            return [x+(y-x)*u for x, y in zip(k0[1:], k1[1:])]
    return list(keys[-1][1:])


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
    env = [_strain_env(f, st, n) for st in P['strains']]
    tw = bd = ln = hy = hp = 0.
    sh = [0., 0.]
    for st, e in zip(P['strains'], env):
        tw += e*st['twist']
        bd += e*st['bend']
        ln += e*st['lean']
        hy += e*st['head_yaw']
        hp += e*st['head_pitch']
        sh[0] += e*st['shrug'][0]
        sh[1] += e*st['shrug'][1]
        lift = lift+e*np.array([0., st['back'], -st['drop']])
    tr = math.sin(2*math.pi*P['tremor']['cycles']*f/n)
    turn(pose, 'spine', [.4*ln, .5*bd, .4*tw])
    turn(pose, 'chest', [.3*ln, .5*bd, .6*tw+P['tremor']['chest']*tr])
    turn(pose, 'pelvis', [.3*ln, 0., 0.])
    turn(pose, 'clavicle.L', [0., sh[0], 0.])
    turn(pose, 'clavicle.R', [0., -sh[1], 0.])
    # rule 1: the head's world orientation first (its turn here), the ears then drawn on Night Stalk f18's line
    # (the head turns against the trunk's twist, so its world turn stays within 10 degrees and turned away from the camera:
    # turned toward it, or further, the ear needs more than f18's swing (folds) or leaves f18's line on screen, up to 34 degrees)
    # (the neck and head take the trunk's lean back out, so the head's world pitch is the strain's own head pitch: chin up
    # only, as a chin-down head needs the ear past f18's swing and folds the ear root)
    turn(pose, 'neck', [.4*hp-.5*ln, 0., .4*hy])
    turn(pose, 'head', [.6*hp-.5*ln+P['tremor']['head']*tr, 0., .6*hy])
    ear_line_capped(rig, pose, 1., P['ear_cap'])
    whip = sum(env)
    for t in rc.TAILS:
        wv = P['tail_waves'][t]
        for k in range(1, rc.TAIL_BONES+1):
            u = (f-P['tail_lag_f']*(k-1))/n*wv['cycles']+wv['phase']
            g = (k+1)/(rc.TAIL_BONES+1)
            turn(pose, f'tail_{t}{k}', [g*(wv['lift']*math.sin(2*math.pi*u)+P['tail_whip_deg']*whip*(1 if t != 'c' else -1)*.6), 0.,
                                         g*wv['yaw']*math.sin(2*math.pi*u+1.3)])
    nf = _keys_periodic(P['near_foot'], f, n)
    ff = _keys_periodic(P['far_foot'], f, n)
    # the stepping foot: on its toe pads when down, flat just over the floor, following the shin (no ankle bend) in the air
    feet = {'L': dict(t=(0., nf[0], nf[1]), pitch=nf[2], pivot='toe' if nf[1] < .003 else 'ankle' if nf[1] < .01 else 'free'),
            'R': dict(t=(0., ff[0], ff[1]), pitch=ff[2], pivot='toe')}
    planted = {'L': bool(nf[1] < .003), 'R': True}
    breath = .5*max(env)                                         # a caught breath with each strain (the ribcage key)
    return pose, lift, feet, breath, dict(strains=[round(e, 4) for e in env], twist=round(tw, 3), planted=planted)


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
HELD_IN = {'arms': [0., .65, 1.08, 1.03, 1., 1.], 'body': [0., .4, .85, 1., 1., 1.], 'ears': [0., .45, .8, .95, 1., 1.],
           'tails': [0., .15, .45, .75, .95, 1.], 'jolt': [0., .5, 1., .4, .1, 0.]}
HELD_IN_JOLT = (0., .02, -.025)           # root (x, y back, z) at the jolt's peak, on top of the blend
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
    ear_line_capped(rig, pose, e['ears'], HELD['ear_cap'])
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
    ear_line_capped(rig, pose, 1-e['ears'], HELD['ear_cap'], toward=ip)
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
    if name == 'C':
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


LIE_ROLL = {'A': 8., 'B': -8., 'C': 0.}
# the ears: Night Stalk f18's ear (relative to the head) swung `inward` degrees further toward the head's midline about the
# head's front-to-back axis, so the lower ear lies on the ground behind the head instead of reaching under it (setup check: the
# ear root folds 50 at f18, 10 at 6 degrees inward, 3 at 12 and 18; swept_ears with no outward angle, which also rolls the
# blade, folded 284)
LIE_EARS = {'A': dict(inward=24.), 'B': dict(inward=24.), 'C': dict(inward=0.)}
# the tails keep Night Stalk's pose at the fork and curl along their chains (bones 2 to 5, each bone's own frame) down to the
# ground: lateral, toward the creature's right (the ground side); prone, down behind
LIE_TAIL_CURL = {'A': [0., 0., 18.], 'B': [0., 0., 18.], 'C': [-18., 0., 0.]}


def lie_ears(rig, inward, k=1.):
    """Both ears at the share k of Night Stalk f18's swing, then turned `inward` degrees toward the head's midline about the
    head's front-to-back axis (a rigid swing of ear_1; the right ear mirrors the left)."""
    out = {}
    for b, sg in (('ear_1.L', 1.), ('ear_1.R', -1.)):        # +Y turns the left ear's tip toward -X (the midline)
        base = rot(ac.share_of(rig.body[b], k))
        out[b] = [float(v) for v in rc.euler_from_matrix(rot([0., sg*inward, 0.])@base)]
    return out


def lie_pose(rig, name):
    """The candidate's lying pose (all bones, the legs by hand) and the root turn, before the root move."""
    body = LIMP_PRONE if name == 'C' else LIMP_LATERAL
    pose = {b: list(e) for b, e in body.items()}
    for b, e in rig.body.items():
        if b.startswith('tail'):
            pose[b] = list(e)
    pose.update(lie_ears(rig, LIE_EARS[name]['inward']))
    for t in rc.TAILS:
        for k in range(2, rc.TAIL_BONES+1):
            turn(pose, f'tail_{t}{k}', LIE_TAIL_CURL[name])
    pose['root'] = root_euler(name, LIE_ROLL[name])
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
# through (the head hangs, the legs and tail dangle with no tension); the elephant's body goes down as one mass that tips onto
# its side, the legs giving first and the head going down last. Here the head and neck give first (the chin drops, frames 1 to
# 3), the knees buckle a frame later and the hips drop fast (2 to 9) with the trunk slumping forward and then swaying back
# over the folded legs, and from frame 9 the whole body tips back and over onto its right side (the setup check's pose A,
# chosen there), gathering speed as it falls, the head and arms a beat behind the trunk and the ears and tails last; it lands
# on frame 27 (`down`), the head, arms, ears and tails bounce once and settle by frame 31, and it lies still (31 to 35 are
# the same pose; the game holds the last frame).
FAINT = dict(
    frames=36, down=27, candidate='A', settle_end=31, fold_start=9,
    # the buckle (feet planted, the legs by the rig's IK): share tracks (frame, ease into it, value)
    drop=[(0, 'linear', 0.), (2, 'in', .04), (5, 'in', .35), (9, 'in', 1.)],
    drop_m=(0., .12, -.12),                  # root at the full buckle: hips 12 cm back, 12 cm down (Night Stalk's crouch: 11.5 back, 14 down;
                                             # setup: 15 down folded the knees 4018 against the approved 3617, the knees at 77 to 82 degrees)
    slump=[(0, 'linear', 0.), (1, 'out', .35), (3, 'smooth', 1.), (6, 'smooth', .55), (9, 'smooth', 0.)],
    slump_rot={'neck': [12., 0., 0.], 'head': [10., 0., 0.], 'spine': [5., 0., 0.], 'chest': [6., 0., 0.]},
    sway=[(3, 'linear', 0.), (9, 'smooth', 1.)],
    sway_rot={'pelvis': [-8., 0., 0.], 'spine': [-5., -3., 0.], 'chest': [-4., -2., 0.], 'neck': [-6., -4., 0.], 'head': [-6., -4., 0.]},
    heel=[(0, 'linear', 0.), (4, 'smooth', 0.), (9, 'smooth', 10.)],      # the heels rise as the weight goes over the toes
    # the arms go limp: they hang, lagging the trunk (a lag in frames on the slump and sway), swinging a little forward
    arm_lag=1.5, arm_swing={'upperarm.L': [-10., -4., 0.], 'upperarm.R': [-8., 4., 0.], 'forearm.L': [-12., 0., 0.], 'forearm.R': [-10., 0., 0.]},
    arm_swing_track=[(0, 'linear', 0.), (4, 'smooth', .2), (8, 'smooth', 1.), (9, 'linear', 1.)],
    # the ears give with the head: their swing toward the lying pose (share of Night Stalk f18's sweep, then the inward turn)
    ears_k=[(0, 'linear', 0.), (2, 'linear', 0.), (8, 'smooth', .45), (14, 'smooth', .55)],
    tails_k=[(0, 'linear', 0.), (3, 'linear', 0.), (9, 'smooth', .25)],
    # the fall (from frame 9): the share of the way from the buckled pose to the lying pose per group, (start lag, end frame,
    # ease): the trunk and legs lead and land on 27 with a gravity ease (slow start, fast end), the head a frame behind and
    # landing with them, the arms 2 frames behind and down on 28, the ears and tails 3 behind and settling onto the ground by 30
    fall={'body': (0., 27, 'in'), 'twist': (0., 21, 'smooth'), 'legs': (12., 29, 'smooth'), 'head': (1., 27, 'in'), 'arms': (2., 28, 'in'),
          'ears': (2., 30, 'smooth'), 'tails': (2., 30, 'smooth')},
    # the bounce on landing (frames 27 to 31): additive turns at the bounce's share, which peaks a frame after the landing
    bounce=[(27, 'linear', 0.), (28, 'out', 1.), (29, 'smooth', -.35), (30, 'smooth', .1), (31, 'smooth', 0.)],
    bounce_rot={'head': [3., 0., 0.], 'forearm.L': [-8., 0., 0.], 'upperarm.L': [-4., 0., 0.], 'jaw': [4., 0., 0.]},
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
    pose.update(lie_ears(rig, LIE_EARS[P['candidate']]['inward']*0., tr('ears_k')))
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


_FAINT = {}


def faint_root(final, topple, twist):
    """The root turn on the way down (pose A): not the shortest arc from standing to lying (that swings the head toward the
    camera and forward before it goes back), but a twist about the vertical (the back comes round to the camera, `twist`
    share of a quarter turn) and a topple about the camera's axis onto its right side (`topple` share of a quarter turn,
    in the picture's plane: the head goes back and down to the screen's right), with the settle's small tilts (the rest of the
    final turn) coming in with the topple."""
    R0 = rot([-90., 0., 0.])@rot([0., 0., -90.])
    C = rot(final)@R0.T
    Rc = rot(slerp_e([0., 0., 0.], rc.euler_from_matrix(C), topple))
    R = Rc@rot([-90.*topple, 0., 0.])@rot([0., 0., -90.*twist])
    return [float(v) for v in rc.euler_from_matrix(R)]


def pelvis_world(pose, lift):
    return rot(pose.get('root', [0., 0., 0.]))@np.array(J_OF['pelvis'])+np.asarray(lift, float)


J_OF = {}


def faint_frames(rig, skin):
    """All faint frames (the lying pose comes from the settle on the posed skin, so the clip is made in one go). From the
    buckle's last frame every bone turns along the shortest arc (slerp) toward the lying pose at its group's share; the pelvis
    travels in a straight line over the floor between the two spots, the root move follows from it and the root turn, and its
    height is set so the lowest skin point rests on the floor (the body is always on something: the feet, then its side).
    (Setup for the fall, 2026-11-10: a sit on the rump between the buckle and the fall was tried and dropped: the three tails
    leave the body above the rump and point down into the floor once the trunk tips back, so they propped the body 24 to 31 cm
    up, and the hip flexion a sit needs folded the hips 316 to 5525 triangles against the approved 208.)"""
    P = FAINT
    n = P['frames']
    J_OF.update(rig.J)
    lie = lie_frame(rig, skin, P['candidate'])
    L, Llift = lie['pose'], np.asarray(lie['lift'], float)
    out = []
    fb = P['fold_start']
    Kb, Kblift, _, _ = faint_buckle(rig, fb)
    pb = pelvis_world(Kb, Kblift)
    pl = pelvis_world(L, Llift)
    for f in range(n):
        if f <= fb:
            full, lift, breath, info = faint_buckle(rig, f)
            out.append(frame_dict(f, full, lift, breath, info, belly=breath))
            continue
        shares = {}
        for g, (lag, end, kind) in P['fall'].items():
            shares[g] = cp.ease(kind, min(1., max(0., (f-fb-lag)/(end-fb-lag))))
        pose = cb.blend_poses(Kb, L, lambda b: shares[faint_group(b)])
        pose['root'] = faint_root(L['root'], shares['body'], shares['twist'])
        pxy = pb+(pl-pb)*shares['body']
        phase = 'fall' if f < P['down'] else 'settle' if f < P['settle_end'] else 'still'
        bo = ac.track(P['bounce'], f)
        for b, e in P['bounce_rot'].items():
            turn(pose, b, e, bo)
        if f >= P['settle_end']:
            pose = {k: list(v) for k, v in L.items()}
            lift = Llift.copy()
        else:
            lxy = pxy-rot(pose['root'])@np.array(rig.J['pelvis'])
            Pz = skin.posed(pose, [lxy[0], lxy[1], 0.])
            lift = np.array([lxy[0], lxy[1], -Pz[:, 2].min()])
        info = dict(phase=phase, shares={g: round(v, 4) for g, v in shares.items()}, bounce=round(bo, 4), planted=dict(L=False, R=False),
                    targets=None)
        out.append(frame_dict(f, pose, lift, 0., info, belly=0.))
    return out


def bake_setup(rig_dir, out, rest):
    rig = ac.Rig(rig_dir)
    skin = SkinSampler(rig_dir, rest)
    out = Path(out)
    for name in ('A', 'B', 'C'):
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
                           params=dict(FAINT=FAINT, LIMP_LATERAL=LIMP_LATERAL, LIE_ROLL=LIE_ROLL, LIE_EARS=LIE_EARS, LIE_TAIL_CURL=LIE_TAIL_CURL)))
    (out/'clipset-spec.json').write_text(json.dumps(spec, indent=1, default=str))


def verify_approved(rig_dir, approved, b1_bake, scratch):
    """Re-bake idle and Night Stalk (akinza_clips.bake) and batch 1's clips (akinza_clipset_b1.bake) into scratch in a fresh
    interpreter with PYTHONHASHSEED=0 each, and compare the poses files' sha256 with the approved bake and with batch 1's bake
    made the same way (guard_in and guard_out write their pose keys in set order, so their bytes depend on the hash seed: the
    batch 1 reference is re-made with the seed pinned, before any change, and kept beside the result)."""
    import hashlib
    import os
    import subprocess
    scratch = Path(scratch)
    scratch.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ, PYTHONHASHSEED='0')
    subprocess.run([sys.executable, str(HERE/'akinza_clipset_b1.py'), 'verify-approved', str(rig_dir), str(approved), str(scratch/'approved')],
                   check=True, env=env, capture_output=True)
    subprocess.run([sys.executable, str(HERE/'akinza_clipset_b1.py'), 'bake', str(rig_dir), str(scratch/'b1')], check=True, env=env,
                   capture_output=True)
    sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
    res = {}
    for clip in ('idle', 'stalk'):
        res[clip] = dict(approved=sha(Path(approved)/clip/'poses.json'), rebake=sha(scratch/'approved'/clip/'poses.json'))
    for clip in ('hurt', 'evade', 'guard', 'guard_in', 'guard_out'):
        res[clip] = dict(approved=sha(Path(b1_bake)/clip/'poses.json'), rebake=sha(scratch/'b1'/clip/'poses.json'))
    for v in res.values():
        v['identical'] = v['approved'] == v['rebake']
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
    p.add_argument('--faint', default=None, help='the lying candidate for faint (A, B or C; default FAINT[candidate])')
    a = p.parse_args()
    if a.faint:
        FAINT['candidate'] = a.faint
    if a.cmd == 'setup':
        bake_setup(a.rig, a.out, a.rest)
    elif a.cmd == 'bake':
        bake(a.rig, a.out, a.clips.split(',') if a.clips else None, a.rest)
    else:
        verify_approved(a.rig, a.out, a.more[0], a.more[1])
