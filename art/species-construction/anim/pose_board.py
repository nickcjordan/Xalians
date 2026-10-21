"""Akinza rig review poses, corrective shapes and deformation checks (numpy half; render_board.py renders).

  python art/species-construction/anim/pose_board.py --probe <probe dir> --rig <rig dir>

Reads skin.npz (probe) and joints.json, weights.npz, rig.json (rig). Skinning is dual quaternion
(Blender's Preserve Volume) plus corrective shape keys driven by joint swing angles. Writes into the rig
dir: poses.json (per pose: bone rotations, root lift, key values, posed joints), correctives.npz and
correctives.json (sparse rest-space deltas and their drivers), checks.json.

Correctives are sculpted procedurally at a pose: inside a soft mask around the joint the posed skin is
relaxed toward the rest surface's own shape, turned by each vertex's skinning rotation (each vertex moves
to its neighbours' average plus its rotated rest offset from them, many rounds). That unfolds pleats and
pushes the lost volume at the back of a knee, the groin, an armpit or an ear root back out, while the
mask edge holds everything around it. The posed change is turned back into rest space through the same
rotation, so the key reproduces it exactly at its driver's full value.

The checks follow the Luceras rig checks (art/pipeline/rig/measure.py: finite, no flying vertices,
influences, unweighted, weight sums, bilateral weight symmetry, edge stretch, closed volume per pose) plus
folded and collapsed triangles per joint region, tail-to-tail and tail-to-leg clearance, and ear blade
vertices inside the skull.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np
import scipy.sparse as sp
from scipy.spatial import cKDTree

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import rig_core as rc  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('--probe', type=Path, required=True)
p.add_argument('--rig', type=Path, required=True)
p.add_argument('--relax', type=int, default=3000)
p.add_argument('--spread', type=int, default=900)
p.add_argument('--ear-offset', type=float, default=.026)
a = p.parse_args()

B = rc.ANIM_BONES
NAMES = rc.ANIM_NAMES
NI = {b: i for i, b in enumerate(NAMES)}
rig = json.loads((a.rig/'rig.json').read_text())
J = json.loads((a.rig/'joints.json').read_text())
s, off = rig['transform']['scale'], np.array(rig['transform']['offset'])
d = np.load(a.probe/'skin.npz')
rest = s*(d['verts'].astype(np.float64)-off)
tris, edges = d['tris'], d['edges']
n = len(rest)
wt = np.load(a.rig/'weights.npz')
idx = wt['idx'].astype(int)
w = np.round(wt['w'].astype(np.float64)*4096)/4096      # Blender's vertex groups hold 1/4096 steps
w /= w.sum(1, keepdims=True)
dense = np.zeros((n, len(NAMES)))
np.put_along_axis(dense, idx, w, 1)
A = sp.coo_matrix((np.ones(2*len(edges)), (np.r_[edges[:, 0], edges[:, 1]], np.r_[edges[:, 1], edges[:, 0]])), shape=(n, n)).tocsr()
A = sp.diags(1/np.maximum(np.asarray(A.sum(1)).ravel(), 1))@A
LAP_REST = rest-A@rest


def quats(R):
    """(w, x, y, z) of each rotation matrix (rotations under 180 degrees, as skinning rotations are)."""
    wq = np.sqrt(np.maximum(1+R[:, 0, 0]+R[:, 1, 1]+R[:, 2, 2], 1e-12))/2
    return np.stack([wq, (R[:, 2, 1]-R[:, 1, 2])/(4*wq), (R[:, 0, 2]-R[:, 2, 0])/(4*wq), (R[:, 1, 0]-R[:, 0, 1])/(4*wq)], 1)


def share(bones):
    return dense[:, [NI[b] for b in bones]].sum(1)


def mirror(pose):
    out = dict(pose)
    for k, (x, y, z) in pose.items():
        if k.endswith('.L'):
            out[k[:-1]+'R'] = [x, -y, -z]
    return out


def unit(v):
    v = np.asarray(v, float)
    return v/np.linalg.norm(v)


def directions(base, targets):
    return rc.pose_from_directions(J, {k: unit(v) for k, v in targets.items()}, base=base, bones=B)


def tails(root, per):
    out = {'tail_root': root}
    for t, rots in per.items():
        for k in range(1, rc.TAIL_BONES+1):
            out[f'tail_{t}{k}'] = rots[min(k, len(rots))-1]
    return out


def vertex_normals(P):
    fn = np.cross(P[tris[:, 1]]-P[tris[:, 0]], P[tris[:, 2]]-P[tris[:, 0]])
    vn = np.zeros_like(P)
    for k in range(3):
        np.add.at(vn, tris[:, k], fn)
    return vn/np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-20)


# ---------------------------------------------------------------- ear fold: the blade laid along the skull
NRM = vertex_normals(rest)
head_share = share(['head'])
SKULL = np.where((head_share > .95) & (rest[:, 1] > J['head_base'][1]-.02))[0]   # back half of the head
skull_tree = cKDTree(rest[SKULL])
EAR_SIDE = {sd: share([f'ear_{k}.{sd}' for k in range(1, rc.EAR_BONES+1)]) for sd in ('L', 'R')}


def ear_swing(side='L', back=95., out=14.):
    """Ears pulled back the way a fennec's are (Nick, F34, with his photo): the whole ear swings back from
    its base as one straight, unbent cone, as if a muscle pulled the base; nothing in the blade bends. The
    ear points `back` degrees back from upright in side view and `out` degrees outward, its opening facing
    out. Only ear_1 turns; the outer ear bones stay at 0, so the blade's shape is its rest shape moved
    rigidly, and the only skin that deforms is the short band where the base blends into the head."""
    sx = 1 if side == 'L' else -1
    blade = EAR_SIDE[side] > .5
    q = rest[blade]-rest[blade].mean(0)
    nu = np.linalg.svd(q, full_matrices=False)[2][2]
    nu = nu if nu[1] < 0 else -nu                     # the opening faces forward at rest
    u = unit(np.array(J[f'ear{rc.EAR_BONES}.{side}'])-np.array(J[f'ear0.{side}']))
    bk, ot = math.radians(back), math.radians(out)
    d = unit((sx*math.sin(ot), math.cos(ot)*math.sin(bk), math.cos(ot)*math.cos(bk)))
    nT = np.array([sx, 0., 0.])

    def frame(x, y):
        y = unit(y-x*(x@y))
        return np.stack([x, y, np.cross(x, y)], 1)
    pose = {f'ear_1.{side}': rc.euler_from_matrix(frame(d, nT)@frame(u, nu).T)}
    for k in range(2, rc.EAR_BONES+1):
        pose[f'ear_{k}.{side}'] = [0., 0., 0.]
    return pose


ear_L = ear_swing('L')
EARS_BACK = mirror(ear_L)

# ---------------------------------------------------------------- poses
POSES = {'rest': {}}
crouch = {'pelvis': [24, 0, 0], 'spine': [6, 0, 0], 'chest': [8, 0, 0], 'neck': [-14, 0, 0], 'head': [-24, 0, 0]}
crouch.update(EARS_BACK)
crouch.update(tails([-72, 0, 22], {'a': [[-14, 0, 8], [-6, 0, 6]], 'b': [[-2, 0, 10], [-4, 0, 6]],
                                   'c': [[12, 0, 8], [-2, 0, 6]]}))
crouch = directions(crouch, {'thigh.L': (.16, -.76, -.63), 'shin.L': (.05, .64, -.77), 'foot.L': (0, -.9, -.44),
                             'thigh.R': (-.16, -.76, -.63), 'shin.R': (-.05, .64, -.77), 'foot.R': (0, -.9, -.44),
                             'upperarm.L': (.12, -.55, -.83), 'forearm.L': (.04, -.80, -.60),
                             'upperarm.R': (-.12, -.55, -.83), 'forearm.R': (-.04, -.80, -.60)})
POSES['night_stalk'] = crouch
POSES['ears_flat_back'] = dict(EARS_BACK)
POSES['tails_drawn_in'] = tails([-34, 0, 40], {'a': [[-16, 0, 14], [-6, 0, 14]], 'b': [[-6, 0, 16], [-4, 0, 14]],
                                               'c': [[8, 0, 16], [0, 0, 12]]})
POSES['tails_fanned'] = tails([12, 0, -12], {'a': [[26, 0, -6], [8, 0, -4]], 'b': [[0, -14, -22], [0, -4, -6]],
                                             'c': [[-26, 0, 14], [-6, 0, 4]]})
turn = {'neck': [0, 0, 18], 'head': [-12, 8, 32], 'jaw': [25, 0, 0]}
turn.update(mirror({'ear_1.L': [0, -8, -18]}))
POSES['head_turn'] = turn
ARM_UP = {'upperarm.L': (.10, -.85, .52), 'forearm.L': (.05, -.95, .30), 'hand.L': (0, -.95, .30)}
POSES['arm_reach'] = directions({'clavicle.L': [-6, -20, 0], 'clavicle.R': [0, 20, 0]},
                                {**ARM_UP, 'upperarm.R': (-.95, -.05, .30), 'forearm.R': (-.95, -.12, .26),
                                 'hand.R': (-.97, -.12, .2)})
POSES['leg_reach'] = directions({'pelvis': [-6, 0, 0]},
                                {'thigh.L': (.08, -.95, -.30), 'shin.L': (.02, -.30, -.95), 'foot.L': (0, -.97, -.25),
                                 'thigh.R': (-.10, .45, -.89), 'shin.R': (-.05, .62, -.78), 'foot.R': (0, -.6, -.8)})
twist = {'spine': [0, 8, 16], 'chest': [0, 8, 16], 'neck': [0, 0, 10]}
twist.update(tails([0, 0, -24], {'a': [[0, 0, -6]], 'b': [[0, 0, -6]], 'c': [[0, 0, -6]]}))
POSES['twist_bend'] = twist
# sculpt-only poses (not on the board): both arms raised forward like the board's left arm, so the
# shoulder-raise keys are mirror images; both legs in the leg reach's forward step
SCULPT = {'arms_up': directions({'clavicle.L': [-6, -20, 0], 'clavicle.R': [-6, 20, 0]},
                                {**ARM_UP, 'upperarm.R': (-.10, -.85, .52), 'forearm.R': (-.05, -.95, .30),
                                 'hand.R': (0, -.95, .30)}),
          'legs_step': directions({'pelvis': [-6, 0, 0]},
                                  {'thigh.L': (.08, -.95, -.30), 'shin.L': (.02, -.30, -.95), 'foot.L': (0, -.97, -.25),
                                   'thigh.R': (-.08, -.95, -.30), 'shin.R': (-.02, -.30, -.95), 'foot.R': (0, -.97, -.25)})}
ALL = {**POSES, **SCULPT}

# ---------------------------------------------------------------- correctives
# group: (name, sculpt pose, driver bone base, mask joint base, inner/outer mask radius m, bones the mask
# may touch (by weight), lowest rise start degrees)
GROUPS = [
    ('knee_step', 'legs_step', 'shin', 'knee', (.06, .14), ['thigh', 'shin'], 15),
    ('knee_bend', 'night_stalk', 'shin', 'knee', (.06, .14), ['thigh', 'shin'], 15),
    ('knee_cap', 'night_stalk', 'shin', 'knee', (0, 0), ['thigh', 'shin'], 15),
    ('hip_flex', 'night_stalk', 'thigh', 'hip', (.08, .17), ['pelvis', 'hip', 'thigh', 'spine'], 30),
    ('armpit_fwd', 'night_stalk', 'upperarm', 'shoulder', (.05, .10), ['chest', 'clavicle', 'upperarm', 'spine'], 8),
    ('shoulder_raise', 'arms_up', 'upperarm', 'shoulder', (.06, .12), ['chest', 'clavicle', 'upperarm', 'spine', 'neck'], 45),
    ('ear_clear', 'ears_flat_back', 'ear_1', 'ear0', (0, 0), ['ear_1'], 15),
]


SPREAD = {'hip_flex': 2000, 'knee_step': 150, 'knee_bend': 150}   # knees: a concentrated bend, not one round arc (Nick, F34)
INDEPENDENT = {'knee_cap'}          # rises over the whole bend, outside the step/bend handover


def side_bone(base, sd):
    return f'{base}.{sd}'


# plan every key's driver first: keys on one bone split its range, each rising from the previous key's
# angle to its own sculpt angle and handing over (falling to 0) at the next key's angle
plan = []
for gname, pose_name, dbase, jbase, radii, mbones, rise0 in GROUPS:
    for sd in ('L', 'R'):
        bone = side_bone(dbase, sd)
        ang = rc.swing_deg(J, ALL[pose_name], bone, B)
        prior = [] if gname in INDEPENDENT else [k for k in plan if k['bone'] == bone and k['rise'][1] < ang
                                                   and k['group'] not in INDEPENDENT]
        start = max([rise0]+[k['rise'][1] for k in prior])
        plan.append(dict(name=f'{gname}.{sd}', group=gname, bone=bone, rise=[float(start), float(ang)], fall=None, pose=pose_name))
for k in plan:
    if k['group'] in INDEPENDENT:
        continue
    nxt = sorted([o['rise'][1] for o in plan if o['bone'] == k['bone'] and o['rise'][1] > k['rise'][1]
                  and o['group'] not in INDEPENDENT])
    if nxt:
        k['fall'] = float(nxt[0])


def posed_joint(T, jn):
    b = next(b for b, _, h, t in B if h == jn or t == jn)
    R, t = T[b]
    return R@np.array(J[jn])+t


keys, deltas = [], {}
for gname, pose_name, dbase, jbase, (r0, r1), mbones, rise0 in GROUPS:
    pose = ALL[pose_name]
    P, Rv, vals = rc.posed_skin(rest, idx, w, J, pose, keys=keys, deltas=deltas)
    T = rc.bone_transforms(J, pose, bones=B)
    masks = {}
    for sd in ('L', 'R'):
        jn = f'{jbase}.{sd}'
        bone_of_joint = next(b for b, _, h, _t in B if h == jn)
        Rj, tj = T[bone_of_joint]
        c = Rj@np.array(J[jn])+tj
        mb = [side_bone(b, sd) if f'{b}.{sd}' in NI else b for b in mbones]
        allowed = rc.smoothstep(share(mb), .4, .7)
        masks[sd] = (1-rc.smoothstep(np.linalg.norm(P-c, axis=1), r0, r1))*allowed
    m = np.maximum(masks['L'], masks['R'])
    if gname == 'knee_cap':
        Nraw = vertex_normals(P)
        # an explicit knee, sculpted along the posed skin's normals in the knee's own frame (Nick, F34: a
        # real kneecap, not a bendy tube): the patella bump at the front of the bend, the patellar tendon
        # running flat down from it between two shallow grooves, the edge of the tibia plateau as a low ridge
        # across the front below the joint, the two hamstring cords at the back of the thigh, and a tight
        # fold at the back of the knee between them
        # normals smoothed along the skin, so the push follows the knee's form, not each triangle
        Nv = Nraw
        for _ in range(30):
            Nv = .5*Nv+.5*(A@Nv)
        Nv /= np.linalg.norm(Nv, axis=1, keepdims=True)
        disp = np.zeros(n)
        part = {}
        for sd in ('L', 'R'):
            k0 = posed_joint(T, f'knee.{sd}')
            ua = unit(posed_joint(T, f'hip.{sd}')-k0)
            ub = unit(posed_joint(T, f'ankle.{sd}')-k0)
            hng = unit(np.cross(ua, ub))
            fr = -unit(ua+ub)                                  # toward the front of the bent knee
            rel = P-k0
            dist = np.linalg.norm(rel, axis=1)
            region = rc.smoothstep(share([f'thigh.{sd}', f'shin.{sd}', f'foot.{sd}']), .5, .8)*(1-rc.smoothstep(dist, .11, .16))
            lat = rel@hng
            front = Nv@fr
            cand = (region > .5) & (np.abs(lat) < .015)
            pc = P[cand][np.argmax(rel[cand]@fr)]              # the front of the knee, on the midline
            rp = P-pc
            dl = rp@hng
            do = np.linalg.norm(rp-np.outer(dl, hng), axis=1)
            patella = np.exp(-(dl/.019)**2-(do/.022)**2)*rc.smoothstep(front, .1, .4)
            tb = rp@ub                                         # down the shin from the kneecap
            down = rc.smoothstep(tb, .012, .03)*(1-rc.smoothstep(tb, .07, .095))*rc.smoothstep(front, .2, .5)
            grooves = np.exp(-((np.abs(dl)-.021)/.006)**2)*down
            plateau = np.exp(-((tb-.032)/.006)**2)*(1-np.exp(-(dl/.014)**2))*rc.smoothstep(front, -.3, .1)
            ta = rel@ua                                        # up the thigh from the knee
            back = rc.smoothstep(-front, .3, .6)
            cords = np.exp(-((np.abs(lat)-.027)/.007)**2)*rc.smoothstep(ta, .015, .04)*(1-rc.smoothstep(ta, .09, .12))*back
            bis = rel@unit(ua-ub)
            fold = np.exp(-(bis/.013)**2)*np.exp(-(lat/.024)**2)*back
            # the corner: the front of the bent knee meets where the thigh's front line and the shin's front
            # line cross, instead of one round arc between them (front vertices are pushed out along their
            # normals until they reach either line)
            na = unit(fr-ua*(fr@ua))
            nb = unit(fr-ub*(fr@ub))
            near = dist < .16

            def front_line(axis, nrm_dir, bone):
                """The segment's front profile just past the knee (front-most skin on the midline at each
                distance along the bone, 3 to 10 cm out), fitted with a line: (offset0, slope)."""
                ss, oo = [], []
                pick = (share([bone]) > .9) & near & (np.abs(lat) < .015)
                along, off_ = rel@axis, rel@nrm_dir
                for s0 in np.arange(.03, .10, .005):
                    m_ = pick & (np.abs(along-s0) < .003)
                    if m_.sum() > 5:
                        ss.append(s0)
                        oo.append(off_[m_].max())
                c1, c0 = np.polyfit(ss, oo, 1)
                return c0, c1
            lines = [(ua, na, *front_line(ua, na, f'thigh.{sd}')), (ub, nb, *front_line(ub, nb, f'shin.{sd}'))]
            # the corner: front vertices pushed out along their normals until they reach either fitted line,
            # so the front of the bent knee comes to the point where the thigh's and the shin's front lines meet
            pushes = []
            for axis, nd, c0, c1 in lines:
                gap = (c0+c1*(rel@axis))-rel@nd                # > 0: inside this line, under the round arc
                ln = unit(nd-c1*axis)
                with np.errstate(divide='ignore', invalid='ignore'):
                    t_ = gap*np.sqrt(1+c1*c1)/np.maximum(Nv@ln, .25)
                pushes.append(np.where((Nv@ln) > .25, t_, np.inf))
            corner = np.clip(np.minimum(*pushes), 0, .010)
            corner = np.where(np.isfinite(corner), corner, 0)*rc.smoothstep(front, .15, .45)*(1-rc.smoothstep(np.abs(lat), .03, .05))
            rt, rs = lines[0][2], lines[1][2]
            dsd = (corner+.011*patella-.003*grooves+.0022*plateau+.0035*cords-.005*fold)*region
            # spread the push along the skin (about 2 cm) so it has no per-vertex spikes or pits
            for _ in range(80):
                dsd = .5*dsd+.5*(A@dsd)
            dsd *= rc.smoothstep(region, .01, .2)
            part[sd] = dsd
            disp += dsd
        dP = Nv*disp[:, None]
        dR = np.einsum('nji,nj->ni', Rv, dP)
        for sd in ('L', 'R'):
            key = next(k for k in plan if k['name'] == f'{gname}.{sd}')
            v = rc.driver_value(rc.swing_deg(J, pose, key['bone'], B), key['rise'], key['fall'])
            pd = np.einsum('nji,nj->ni', Rv, Nv*part[sd][:, None])/max(v, 1e-6)
            kid = np.where(np.linalg.norm(pd, axis=1) > 1e-6)[0]
            deltas[key['name']] = (kid, pd[kid])
            keys.append(key)
        print(f'knee_cap        at {pose_name}: {int((np.abs(disp) > 1e-5).sum())} vertices, max out {disp.max()*1000:.1f} mm, front radii '
              f'{rt*1000:.0f}/{rs*1000:.0f} mm, '
              f'in {-disp.min()*1000:.1f} mm', flush=True)
        continue
    if gname == 'ear_clear':
        # no relax here: only the blade vertices that end up inside the skull move, out along the posed
        # skull's normal to 3 mm above it; the push is spread a little over the blade so it has no edge
        skp = P[SKULL]
        skn = vertex_normals(P)[SKULL]
        tree = cKDTree(skp)
        blade = np.maximum(EAR_SIDE['L'], EAR_SIDE['R']) > .5
        ids = np.where(blade)[0]
        X = P.copy()
        for _ in range(4):
            dd, qi = tree.query(X[ids], k=1, workers=-1)
            sgn = np.einsum('ij,ij->i', X[ids]-skp[qi], skn[qi])
            bad = (dd < .04) & (sgn < .003)
            push = np.zeros((n, 3))
            push[ids[bad]] = ((.003-sgn[bad])[:, None])*skn[qi[bad]]
            for _s in range(10):      # a short spread: the push stays at the base, the blade stays rigid
                push = np.where(blade[:, None], .5*push+.5*(A@push), 0)
            X[ids] += push[ids]
        dd, qi = tree.query(X[ids], k=1, workers=-1)
        sgn = np.einsum('ij,ij->i', X[ids]-skp[qi], skn[qi])
        bad = (dd < .04) & (sgn < .003)
        X[ids[bad]] += ((.003-sgn[bad])[:, None])*skn[qi[bad]]
        dP = X-P
        dR = np.einsum('nji,nj->ni', Rv, dP)
        for sd in ('L', 'R'):
            key = next(k for k in plan if k['name'] == f'{gname}.{sd}')
            v = rc.driver_value(rc.swing_deg(J, pose, key['bone'], B), key['rise'], key['fall'])
            part = dR*(EAR_SIDE[sd] > .5)[:, None]/max(v, 1e-6)
            kid = np.where(np.linalg.norm(part, axis=1) > 1e-6)[0]
            deltas[key['name']] = (kid, part[kid])
            keys.append(key)
        print(f'ear_clear       at {pose_name}: {len(np.where(np.linalg.norm(dP, axis=1) > 1e-6)[0])} blade vertices moved, '
              f'max {np.linalg.norm(dP, axis=1).max()*1000:.1f} mm', flush=True)
        continue
    sel = np.where(m > 1e-4)[0]
    As = A[sel]
    # the bend's rotation field, spread wider inside the mask: the corrected surface bends over a longer
    # arc instead of pleating where the skinning rotation turns fast
    Qv = quats(Rv)
    lq = (.6*m[sel])[:, None]
    # the furred test (2026-10-21) showed only the crouch's groin crease through the fur, as a V at the front
    # of the hip at full size: that bend is spread over a longer arc than the others
    for _ in range(SPREAD.get(gname, a.spread)):
        Qv[sel] = (1-lq)*Qv[sel]+lq*(As@Qv)
    Qv /= np.linalg.norm(Qv, axis=1, keepdims=True)
    target_lap = np.einsum('nij,nj->ni', rc._qmat(Qv[sel]), LAP_REST[sel])
    X = P.copy()
    lam = (.85*m[sel])[:, None]
    for it in range(a.relax):
        X[sel] = (1-lam)*X[sel]+lam*(As@X+target_lap)
    dP = X-P
    dR = np.einsum('nji,nj->ni', Rv, dP)                     # back to rest space: R^T dP
    tot = masks['L']+masks['R']+1e-12
    for sd in ('L', 'R'):
        key = next(k for k in plan if k['name'] == f'{gname}.{sd}')
        v = rc.driver_value(rc.swing_deg(J, pose, key['bone'], B), key['rise'], key['fall'])
        part = dR*(masks[sd]/tot)[:, None]/max(v, 1e-6)
        ids = np.where(np.linalg.norm(part, axis=1) > 1e-6)[0]
        deltas[key['name']] = (ids, part[ids])
        keys.append(key)
    print(f'{gname:15s} at {pose_name}: {len(sel)} vertices, max move {np.linalg.norm(dP, axis=1).max()*1000:.1f} mm, '
          f'L rise {keys[-2]["rise"]} fall {keys[-2]["fall"]}', flush=True)
np.savez_compressed(a.rig/'correctives.npz', **{f'{k}__ids': v[0] for k, v in deltas.items()},
                    **{f'{k}__delta': v[1].astype(np.float32) for k, v in deltas.items()})
(a.rig/'correctives.json').write_text(json.dumps({'skinning': 'dual quaternion (Blender Preserve Volume)',
    'driver': 'swing of the bone about its own axis, degrees: Blender transform ROT_W, SWING_TWIST_Y, local space',
    'keys': keys}, indent=1))

# ---------------------------------------------------------------- checks
REGIONS = {'shoulder': ['shoulder.L', 'shoulder.R'], 'elbow': ['elbow.L', 'elbow.R'], 'hip': ['hip.L', 'hip.R'],
           'knee': ['knee.L', 'knee.R'], 'neck': ['neck_base', 'head_base'], 'jaw': ['jaw_hinge'],
           'ear_root': ['ear0.L', 'ear0.R'], 'tail_fork': ['tail_fork']}
RADIUS = {'shoulder': .09, 'elbow': .06, 'hip': .10, 'knee': .07, 'neck': .08, 'jaw': .06, 'ear_root': .09,
          'tail_fork': .10}
centroid = rest[tris].mean(1)
region_of = {}
for r, js in REGIONS.items():
    dist = np.min([np.linalg.norm(centroid-np.array(J[j]), axis=1)-np.linalg.norm(centroid-np.array(J[j]), axis=1).min()
                   for j in js], axis=0)
    region_of[r] = dist < RADIUS[r]
TAIL = {t: share([f'tail_{t}{k}' for k in range(2, rc.TAIL_BONES+1)]) > .5 for t in rc.TAILS}
any_tail = share([b for b in NAMES if b.startswith('tail_')])
LEGS = (share([b for b in NAMES if rc.base_of(b) in ('thigh', 'shin', 'foot')]) > .5) & (any_tail < .01)
EAR = share([b for b in NAMES if b.startswith('ear_')]) > .9


def normals(P):
    return np.cross(P[tris[:, 1]]-P[tris[:, 0]], P[tris[:, 2]]-P[tris[:, 0]])


def closed_volume(P):
    return float(np.einsum('ij,ij->i', P[tris[:, 0]], np.cross(P[tris[:, 1]], P[tris[:, 2]])).sum()/6)


n_rest = normals(rest)
area_rest = np.linalg.norm(n_rest, axis=1)
L_rest = np.linalg.norm(rest[edges[:, 0]]-rest[edges[:, 1]], axis=1)
vol_rest = closed_volume(rest)
tri_dom = idx[tris[:, 0], 0]
out_poses, checks = {}, {}
for name, pose in POSES.items():
    P, Rv, vals = rc.posed_skin(rest, idx, w, J, pose, keys=keys, deltas=deltas)
    lift = -float(P[:, 2].min())
    P[:, 2] += lift
    T = rc.bone_transforms(J, pose, bones=B, root_translate=(0, 0, lift))
    posed_j = {}
    for b, _, hj, tj in B:
        R, t = T[b]
        posed_j[hj] = (R@np.array(J[hj])+t).tolist()
        posed_j[tj] = (R@np.array(J[tj])+t).tolist()
    nP = normals(P)
    Rd = np.stack([T[b][0] for b in NAMES])[tri_dom]
    expect = np.einsum('nij,nj->ni', Rd, n_rest)
    cosang = np.einsum('ij,ij->i', nP, expect)/np.maximum(np.linalg.norm(nP, axis=1)*np.linalg.norm(expect, axis=1), 1e-20)
    area = np.linalg.norm(nP, axis=1)/np.maximum(area_rest, 1e-20)
    L = np.linalg.norm(P[edges[:, 0]]-P[edges[:, 1]], axis=1)/np.maximum(L_rest, 1e-12)
    reg = {}
    for r, m in region_of.items():
        reg[r] = dict(triangles=int(m.sum()), folded=int(np.sum(m & (cosang < 0))), tilted60=int(np.sum(m & (cosang < .5))),
                      collapsed=int(np.sum(m & (area < .25))), stretched=int(np.sum(m & (area > 3))),
                      area_min=float(area[m].min()), area_p01=float(np.quantile(area[m], .001)), area_max=float(area[m].max()))
    trees = {t: cKDTree(P[TAIL[t]]) for t in rc.TAILS}
    clear = {}
    for i, t in enumerate(rc.TAILS):
        for u in rc.TAILS[i+1:]:
            dd, _ = trees[u].query(P[TAIL[t]], k=1, workers=-1)
            clear[t+u] = dict(min_m=float(dd.min()), vertices_within_3mm=int(np.sum(dd < .003)))
    leg_tree = cKDTree(P[LEGS])
    for t in rc.TAILS:
        dd, _ = leg_tree.query(P[TAIL[t]], k=1, workers=-1)
        clear[t+'-legs'] = dict(min_m=float(dd.min()), vertices_within_3mm=int(np.sum(dd < .003)))
    # ear blade inside the skull: blade vertices behind the posed skull surface (signed by its normal)
    sk = P[SKULL]
    skn = vertex_normals(P)[SKULL]
    dd, qi = cKDTree(sk).query(P[EAR], k=1, workers=-1)
    signed = np.einsum('ij,ij->i', P[EAR]-sk[qi], skn[qi])
    near = dd < .03
    checks[name] = dict(finite=bool(np.isfinite(P).all()), farther_than_3m=int(np.sum(np.linalg.norm(P, axis=1) > 3)),
                        lift_m=lift, keys={k: round(v, 3) for k, v in vals.items() if v > 0},
                        edge_stretch_p99=float(np.quantile(L, .99)), edge_stretch_max=float(L.max()),
                        edge_shrink_p01=float(np.quantile(L, .01)), edge_shrink_min=float(L.min()),
                        volume_change=closed_volume(P)/vol_rest-1, folded_total=int(np.sum(cosang < 0)),
                        collapsed_total=int(np.sum(area < .25)), regions=reg, tails=clear,
                        ear_inside_skull=int(np.sum(near & (signed < -.001))), ear_skull_gap_min_m=float(signed[near].min()) if near.any() else None)
    out_poses[name] = dict(pose={k: list(map(float, v)) for k, v in pose.items()}, lift=lift, joints=posed_j,
                           keys={k: float(v) for k, v in vals.items()})
inf = (w > 1e-6).sum(1)
pos = rest[:, 0] > 1e-5
q = rest[pos].copy()
q[:, 0] *= -1
dd, jj = cKDTree(rest).query(q, k=1, workers=-1)
swap = np.array([NI[nm[:-1]+('R' if nm.endswith('L') else 'L')] if nm[-2:] in ('.L', '.R') else i for i, nm in enumerate(NAMES)])
ok = (dd < .001) & (any_tail[pos] < .01) & (any_tail[jj] < .01)
sym = np.abs(dense[pos][ok]-dense[jj[ok]][:, swap]).max(1)
weights = dict(max_influences=int(inf.max()), unweighted=int(np.sum(inf == 0)), sum_min=float(w.sum(1).min()),
               sum_max=float(w.sum(1).max()), mirrored_pairs=int(ok.sum()), symmetry_max=float(sym.max()),
               symmetry_p99=float(np.quantile(sym, .99)), joints=len(NAMES))
# correctives mirror each other: compare each .L key with its .R twin across x = 0
mir = {}
for k in keys:
    if k['name'].endswith('.L'):
        dl = np.zeros((n, 3))
        dr = np.zeros((n, 3))
        i0, v0 = deltas[k['name']]
        i1, v1 = deltas[k['name'][:-1]+'R']
        dl[i0], dr[i1] = v0, v1
        dm = dr[jj]*np.array([-1, 1, 1])
        mir[k['name'][:-2]] = float(np.abs(dl[pos][ok]-dm[ok]).max())
weights['corrective_mirror_max_m'] = mir
(a.rig/'poses.json').write_text(json.dumps(out_poses, indent=1))
(a.rig/'checks.json').write_text(json.dumps(dict(weights=weights, poses=checks, earSwing=dict(L=ear_L)), indent=1))
print(json.dumps(weights))
for name, c in checks.items():
    worst = {r: (v['folded'], v['collapsed']) for r, v in c['regions'].items() if v['folded'] or v['collapsed']}
    tl = {k: round(v['min_m']*1000, 1) for k, v in c['tails'].items()}
    print(f"{name:15s} stretch99 {c['edge_stretch_p99']:.2f} max {c['edge_stretch_max']:.2f} vol {c['volume_change']*100:+.1f}% "
          f"folded {c['folded_total']} coll {c['collapsed_total']} {worst} ear-in-skull {c['ear_inside_skull']} tails {tl}")
