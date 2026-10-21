"""Akinza rig review poses and deformation checks (numpy half; Blender renders them with render_board.py).

  python art/species-construction/anim/pose_board.py --probe <probe dir> --rig <rig dir>

Reads skin.npz (probe), joints.json, joints-source.json, weights.npz, rig.json (rig). Writes into the rig
dir: poses.json (per pose: bone rotations, root lift, posed joint positions for the close-up cameras) and
checks.json. The checks follow the Luceras rig checks (art/pipeline/rig/measure.py: finite and no flying
vertices, influences, unweighted vertices, weight sums, bilateral weight symmetry, edge stretch, closed
volume per pose) plus what this rig needs: folded and collapsed triangles per joint region (the crease and
candy-wrapper signal), and clearance between the three tails and from the tails to the legs.
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from scipy.spatial import cKDTree

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import rig_core as rc  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('--probe', type=Path, required=True)
p.add_argument('--rig', type=Path, required=True)
a = p.parse_args()

B = rc.ANIM_BONES
NAMES = rc.ANIM_NAMES
rig = json.loads((a.rig/'rig.json').read_text())
J = json.loads((a.rig/'joints.json').read_text())
JS = json.loads((a.rig/'joints-source.json').read_text())
s, off = rig['transform']['scale'], np.array(rig['transform']['offset'])
d = np.load(a.probe/'skin.npz')
src = d['verts'].astype(np.float64)
rest = s*(src-off)
tris, edges = d['tris'], d['edges']
wt = np.load(a.rig/'weights.npz')
idx, w = wt['idx'].astype(int), wt['w'].astype(np.float64)
# Blender stores the weights in vertex groups at 1/256 steps; pose and check with the same numbers
w = np.round(w*256)/256
w /= w.sum(1, keepdims=True)


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
    """tail_root rotation plus per tail a list of rotations for bones 1..5 (shorter lists repeat the last)."""
    out = {'tail_root': root}
    for t, rots in per.items():
        for k in range(1, rc.TAIL_BONES+1):
            out[f'tail_{t}{k}'] = rots[min(k, len(rots))-1]
    return out


EARS_BACK = mirror({'ear_1.L': [0, 20, 46], 'ear_2.L': [0, 12, 18], 'ear_3.L': [0, 6, 6]})
POSES = {}
POSES['rest'] = {}
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
turn = {'neck': [0, 0, 18], 'head': [-12, 8, 32], 'jaw': [12, 0, 0]}
turn.update(mirror({'ear_1.L': [0, -8, -18]}))
POSES['head_turn'] = turn
POSES['arm_reach'] = directions({'clavicle.L': [-6, -20, 0], 'clavicle.R': [0, 20, 0]},
                                {'upperarm.L': (.10, -.85, .52), 'forearm.L': (.05, -.95, .30), 'hand.L': (0, -.95, .30),
                                 'upperarm.R': (-.95, -.05, .30), 'forearm.R': (-.95, -.12, .26), 'hand.R': (-.97, -.12, .2)})
POSES['leg_reach'] = directions({'pelvis': [-6, 0, 0]},
                                {'thigh.L': (.08, -.95, -.30), 'shin.L': (.02, -.30, -.95), 'foot.L': (0, -.97, -.25),
                                 'thigh.R': (-.10, .45, -.89), 'shin.R': (-.05, .62, -.78), 'foot.R': (0, -.6, -.8)})
twist = {'spine': [0, 8, 16], 'chest': [0, 8, 16], 'neck': [0, 0, 10]}
twist.update(tails([0, 0, -24], {'a': [[0, 0, -6]], 'b': [[0, 0, -6]], 'c': [[0, 0, -6]]}))
POSES['twist_bend'] = twist

REGIONS = {'shoulder': ['shoulder.L', 'shoulder.R'], 'elbow': ['elbow.L', 'elbow.R'], 'hip': ['hip.L', 'hip.R'],
           'knee': ['knee.L', 'knee.R'], 'neck': ['neck_base', 'head_base'], 'jaw': ['jaw_hinge'],
           'ear_root': ['ear0.L', 'ear0.R'], 'tail_fork': ['tail_fork']}
RADIUS = {'shoulder': .09, 'elbow': .06, 'hip': .10, 'knee': .07, 'neck': .08, 'jaw': .06, 'ear_root': .09,
          'tail_fork': .10}
centroid = rest[tris].mean(1)
region_of = {}
for r, js in REGIONS.items():
    # triangles within RADIUS of the skin over the joint: the joint's depth below the skin plus RADIUS
    dist = np.min([np.linalg.norm(centroid-np.array(J[j]), axis=1)-np.linalg.norm(centroid-np.array(J[j]), axis=1).min()
                   for j in js], axis=0)
    region_of[r] = dist < RADIUS[r]
names_idx = {b: i for i, b in enumerate(NAMES)}
tail_bones = [names_idx[b] for b in NAMES if b.startswith('tail_') and b != 'tail_root']
dom = idx[:, 0]


def tail_branch_mask():
    out = {}
    for t in rc.TAILS:
        ids = [names_idx[f'tail_{t}{k}'] for k in range(2, rc.TAIL_BONES+1)]   # past the first bone: clear of the crotch
        share = np.zeros(len(rest))
        for k in range(idx.shape[1]):
            share += np.where(np.isin(idx[:, k], ids), w[:, k], 0)
        out[t] = share > .5
    return out


TAIL = tail_branch_mask()
any_tail = np.zeros(len(rest))
for k in range(idx.shape[1]):
    any_tail += np.where(np.isin(idx[:, k], tail_bones+[names_idx['tail_root']]), w[:, k], 0)
LEGS = np.zeros(len(rest))
legs = [names_idx[b] for b in NAMES if base_of(b) in ('thigh', 'shin', 'foot')] if (base_of := rc.base_of) else []
for k in range(idx.shape[1]):
    LEGS += np.where(np.isin(idx[:, k], legs), w[:, k], 0)
LEGS = (LEGS > .5) & (any_tail < .01)


def normals(P):
    n = np.cross(P[tris[:, 1]]-P[tris[:, 0]], P[tris[:, 2]]-P[tris[:, 0]])
    return n


def closed_volume(P):
    return float(np.einsum('ij,ij->i', P[tris[:, 0]], np.cross(P[tris[:, 1]], P[tris[:, 2]])).sum()/6)


n_rest = normals(rest)
area_rest = np.linalg.norm(n_rest, axis=1)
L_rest = np.linalg.norm(rest[edges[:, 0]]-rest[edges[:, 1]], axis=1)
vol_rest = closed_volume(rest)
out_poses, checks = {}, {}
tri_dom = dom[tris[:, 0]]
for name, pose in POSES.items():
    T = rc.bone_transforms(J, pose, bones=B)
    P = rc.skin_points(rest, idx, w, T, bones=B)
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
                      area_min=float(area[m].min()), area_p01=float(np.quantile(area[m], .001)),
                      area_max=float(area[m].max()))
    # tails: clearance between tails past the crotch, and from the tails to the legs
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
    checks[name] = dict(finite=bool(np.isfinite(P).all()), farther_than_3m=int(np.sum(np.linalg.norm(P, axis=1) > 3)),
                        lift_m=lift, edge_stretch_p99=float(np.quantile(L, .99)), edge_stretch_max=float(L.max()),
                        edge_shrink_p01=float(np.quantile(L, .01)), edge_shrink_min=float(L.min()),
                        volume_change=closed_volume(P)/vol_rest-1, folded_total=int(np.sum(cosang < 0)),
                        collapsed_total=int(np.sum(area < .25)), regions=reg, tails=clear)
    out_poses[name] = dict(pose={k: list(map(float, v)) for k, v in pose.items()}, lift=lift, joints=posed_j)
# weights: Luceras checks
inf = (w > 1e-6).sum(1)
pos = rest[:, 0] > 1e-5
tree = cKDTree(rest)
q = rest[pos].copy()
q[:, 0] *= -1
dd, jj = tree.query(q, k=1, workers=-1)
swap = np.array([names_idx[n[:-1]+('R' if n.endswith('L') else 'L')] if n[-2:] in ('.L', '.R') else i
                 for i, n in enumerate(NAMES)])
dense = np.zeros((len(rest), len(NAMES)))
np.put_along_axis(dense, idx, w, 1)
ok = (dd < .001) & (any_tail[pos] < .01) & (any_tail[jj] < .01)
sym = np.abs(dense[pos][ok]-dense[jj[ok]][:, swap]).max(1)
weights = dict(max_influences=int(inf.max()), unweighted=int(np.sum(inf == 0)), sum_min=float(w.sum(1).min()),
               sum_max=float(w.sum(1).max()), mirrored_pairs=int(ok.sum()), symmetry_max=float(sym.max()),
               symmetry_p99=float(np.quantile(sym, .99)), joints=len(NAMES))
(a.rig/'poses.json').write_text(json.dumps(out_poses, indent=1))
(a.rig/'checks.json').write_text(json.dumps(dict(weights=weights, poses=checks), indent=1))
print(json.dumps(weights))
for name, c in checks.items():
    worst = {r: (v['folded'], v['collapsed']) for r, v in c['regions'].items() if v['folded'] or v['collapsed']}
    tl = {k: round(v['min_m']*1000, 1) for k, v in c['tails'].items()}
    print(f"{name:15s} stretch99 {c['edge_stretch_p99']:.2f} max {c['edge_stretch_max']:.2f} shrink {c['edge_shrink_min']:.2f} "
          f"vol {c['volume_change']*100:+.1f}% folded {c['folded_total']} collapsed {c['collapsed_total']} regions {worst} tails mm {tl}")
