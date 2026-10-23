"""Per-frame skin checks for the baked Akinza clips (numpy, no Blender). Numbers only; nothing here grades the look.

  python art/species-construction/anim/clip_checks.py <rig dir> <rest skin npz> <bake dir> [--every 1]

<rest skin npz>: the skin of the surface of record in source units with its topology (src, tri, edges; the
positions applied to fur-steps/s12-29c-legs3b). Every frame is posed the way the renders pose it (rig_core.posed_skin:
dual quaternions plus the corrective keys driven by that frame's swing angles). Checks, per frame:
- foot slide: sole contact vertices (foot-weighted skin within 6 mm of the floor at rest), drift from the
  previous frame and from rest, in mm; and the IK's ankle error;
- tails: tail-to-tail clearance (each pair) and tail-to-leg clearance, the masks of pose_board.py, in mm;
- ears: ear blade vertices behind the posed skull surface (pose_board.py's test);
- folds: folded and collapsed triangles per joint region (pose_board.py's test), beside the approved crouch
  clip's per-region maximum over its 25 out-swing frames (rest to night_stalk by one eased share);
- idle seam: frame 0 against frame 90, and the velocity across the seam (frames 89, 0, 1) against the largest
  frame-to-frame velocity change anywhere else in the loop;
- Night Stalk: the frames at full crouch share (conceal, recover and the hold) against the rig's night_stalk pose,
  max vertex difference in mm, split into the skin the hold layers leave alone and the rest; the last frame
  against idle frame 0.
Writes <bake dir>/checks-skin.json.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np
from scipy.spatial import cKDTree

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import rig_core as rc  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('rig', type=Path)
p.add_argument('rest', type=Path)
p.add_argument('bake', type=Path)
p.add_argument('--every', type=int, default=1)
p.add_argument('--clips', default='idle,stalk')
a = p.parse_args()

B = rc.ANIM_BONES
NAMES = rc.ANIM_NAMES
NI = {b: i for i, b in enumerate(NAMES)}
R = a.rig
rig = json.loads((R/'rig.json').read_text())
J = json.loads((R/'joints.json').read_text())
POSES = json.loads((R/'poses.json').read_text())
s, off = rig['transform']['scale'], np.array(rig['transform']['offset'])
d = np.load(a.rest)
rest = s*(d['src'].astype(np.float64)-off)
tris, edges = d['tri'].astype(np.int64), d['edges'].astype(np.int64)
wt = np.load(R/'weights.npz')
idx = wt['idx'].astype(int)
w = np.round(wt['w'].astype(np.float64)*4096)/4096
w /= w.sum(1, keepdims=True)
KEYS = json.loads((R/'correctives.json').read_text())['keys']
cz = np.load(R/'correctives.npz')
DELTAS = {k['name']: (cz[k['name']+'__ids'], cz[k['name']+'__delta'].astype(np.float64)) for k in KEYS}
dense = np.zeros((len(rest), len(NAMES)))
np.put_along_axis(dense, idx, w, 1)


def share(bones):
    return dense[:, [NI[b] for b in bones]].sum(1)


def vertex_normals(P):
    fn = np.cross(P[tris[:, 1]]-P[tris[:, 0]], P[tris[:, 2]]-P[tris[:, 0]])
    vn = np.zeros_like(P)
    for k in range(3):
        np.add.at(vn, tris[:, k], fn)
    return vn/np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-20)


# masks, as pose_board.py builds them
head_share = share(['head'])
SKULL = np.where((head_share > .95) & (rest[:, 1] > J['head_base'][1]-.02))[0]
EAR = share([b for b in NAMES if b.startswith('ear_')]) > .9
TAIL = {t: share([f'tail_{t}{k}' for k in range(2, rc.TAIL_BONES+1)]) > .5 for t in rc.TAILS}
any_tail = share([b for b in NAMES if b.startswith('tail_')])
LEGS = (share([b for b in NAMES if rc.base_of(b) in ('thigh', 'shin', 'foot')]) > .5) & (any_tail < .01)
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
SOLE = {sd: np.where((share([f'foot.{sd}']) > .5) & (rest[:, 2] < .006))[0] for sd in 'LR'}
TOP_TIP = share(['tail_a4', 'tail_a5']) > .01          # skin the hold's tail-tip twitch may move
CHEST_ZONE = share(['chest', 'spine', 'neck', 'head', 'clavicle.L', 'clavicle.R', 'upperarm.L', 'upperarm.R', 'forearm.L',
                    'forearm.R', 'hand.L', 'hand.R']+[f'ear_{k}.{sd}' for k in range(1, 5) for sd in 'LR']+['jaw']) > .01
n_rest = np.cross(rest[tris[:, 1]]-rest[tris[:, 0]], rest[tris[:, 2]]-rest[tris[:, 0]])
area_rest = np.linalg.norm(n_rest, axis=1)
tri_dom = idx[tris[:, 0], 0]


def posed(pose, lift):
    P, _, vals = rc.posed_skin(rest, idx, w, J, pose, lift, KEYS, DELTAS)
    return P, vals


def folds(P, pose, lift):
    T = rc.bone_transforms(J, pose, bones=B, root_translate=tuple(rc.lift_vec(lift)))
    nP = np.cross(P[tris[:, 1]]-P[tris[:, 0]], P[tris[:, 2]]-P[tris[:, 0]])
    Rd = np.stack([T[b][0] for b in NAMES])[tri_dom]
    expect = np.einsum('nij,nj->ni', Rd, n_rest)
    cosang = np.einsum('ij,ij->i', nP, expect)/np.maximum(np.linalg.norm(nP, axis=1)*np.linalg.norm(expect, axis=1), 1e-20)
    area = np.linalg.norm(nP, axis=1)/np.maximum(area_rest, 1e-20)
    reg = {r: [int(np.sum(m & (cosang < 0))), int(np.sum(m & (area < .25)))] for r, m in region_of.items()}
    return reg, int(np.sum(cosang < 0)), int(np.sum(area < .25)), T


def frame_checks(P, pose, lift, prev, T=None):
    reg, ftot, ctot, T = folds(P, pose, lift)
    out = dict(folds=reg, foldedTotal=ftot, collapsedTotal=ctot)
    trees = {t: cKDTree(P[TAIL[t]]) for t in rc.TAILS}
    for i, t in enumerate(rc.TAILS):
        for u in rc.TAILS[i+1:]:
            out[f'tail_{t}{u}_mm'] = round(float(trees[u].query(P[TAIL[t]], k=1, workers=-1)[0].min())*1000, 1)
    lt = cKDTree(P[LEGS])
    for t in rc.TAILS:
        out[f'tail_{t}_leg_mm'] = round(float(lt.query(P[TAIL[t]], k=1, workers=-1)[0].min())*1000, 1)
        out[f'tail_{t}_floor_mm'] = round(float(P[TAIL[t]][:, 2].min())*1000, 1)
    sk = P[SKULL]
    skn = vertex_normals(P)[SKULL]
    dd, qi = cKDTree(sk).query(P[EAR], k=1, workers=-1)
    signed = np.einsum('ij,ij->i', P[EAR]-sk[qi], skn[qi])
    near = dd < .03
    out['ear_inside_skull'] = int(np.sum(near & (signed < -.001)))
    out['ear_skull_gap_min_mm'] = round(float(signed[near].min())*1000, 2) if near.any() else None
    for sd in 'LR':
        sole = P[SOLE[sd]]
        out[f'sole_{sd}_from_rest_mm'] = round(float(np.linalg.norm(sole-rest[SOLE[sd]], axis=1).max())*1000, 3)
        out[f'sole_{sd}_from_prev_mm'] = round(float(np.linalg.norm(sole-prev[SOLE[sd]], axis=1).max())*1000, 3) if prev is not None else None
        Ra, ta = T[f'shin.{sd}']
        ank = Ra@np.array(J[f'ankle.{sd}'])+ta
        out[f'ankle_{sd}_err_mm'] = round(float(np.linalg.norm(ank-np.array(J[f'ankle.{sd}'])))*1000, 3)
    out['floor_min_mm'] = round(float(P[:, 2].min())*1000, 2)
    out['bounds_src'] = [(P.min(0)/s+off).round(4).tolist(), (P.max(0)/s+off).round(4).tolist()]   # for the render framing
    return out


def load(clip):
    return json.loads((a.bake/clip/'poses.json').read_text())


report = dict(rig=str(R), rest=str(a.rest), units='mm unless named', soleVertices={sd: int(len(v)) for sd, v in SOLE.items()})
# approved crouch clip: rest to night_stalk, 24 out-swing frames, the recipe stored in poses.json
c = POSES['night_stalk']['crouch']
appr = []
for f in range(0, 25, a.every):
    e = .5-.5*math.cos(math.pi*f/24)
    lift = e*np.array(c['lift'])
    pz = rc.plant_legs(J, rc.lagged_slerp_pose(c['body'], e, c.get('tailLag')), lift, c['feet'], c['poles'], bones=B)
    P, _ = posed(pz, lift)
    reg, ftot, ctot, _ = folds(P, pz, lift)
    appr.append(dict(frame=f, folds=reg, foldedTotal=ftot, collapsedTotal=ctot))
report['approvedCrouchFolds'] = dict(frames=appr, maxPerRegion={r: [max(x['folds'][r][0] for x in appr), max(x['folds'][r][1] for x in appr)]
                                                                for r in REGIONS})
print('approved crouch max per region', report['approvedCrouchFolds']['maxPerRegion'], flush=True)
ns = POSES['night_stalk']
P_ns, _ = posed(ns['pose'], ns['lift'])
rest0 = {}
for clip in a.clips.split(','):
    frames = load(clip)
    rows, Ps, acc_all = [], {}, []
    prev, prev_prev = None, None
    for fr in frames:
        P, vals = posed(fr['pose'], fr['lift'])
        row = dict(frame=fr['frame'], keys={k: round(v, 3) for k, v in vals.items() if v > 0}, **frame_checks(P, fr['pose'], fr['lift'], prev))
        if prev is not None:
            row['max_vertex_step_mm'] = round(float(np.linalg.norm(P-prev, axis=1).max())*1000, 2)
        if clip == 'stalk':
            dv = np.linalg.norm(P-P_ns, axis=1)
            row['vs_night_stalk_max_mm'] = round(float(dv.max())*1000, 4)
            row['vs_night_stalk_outside_hold_layers_max_mm'] = round(float(dv[~(TOP_TIP | CHEST_ZONE)].max())*1000, 4)
            row['info'] = fr['info']
        if clip == 'idle' and prev_prev is not None and fr['frame'] <= 90:
            # velocity change at the previous frame (frames 1..89), the loop's own frame-to-frame smoothness
            acc_all.append(float(np.linalg.norm((P-prev)-(prev-prev_prev), axis=1).max()*1000))
        if clip == 'idle' and fr['frame'] in (0, 1, 89, 90):
            Ps[fr['frame']] = P
        if clip == 'stalk' and fr['frame'] in (0, len(frames)-1):
            Ps[fr['frame']] = P
        prev_prev, prev = prev, P
        rows.append(row)
        print(clip, fr['frame'], {k: row[k] for k in ('foldedTotal', 'tail_ab_mm', 'tail_bc_mm', 'tail_ac_mm', 'tail_c_leg_mm', 'ear_inside_skull',
                                                     'sole_L_from_prev_mm', 'sole_L_from_rest_mm')}, row.get('vs_night_stalk_max_mm'), flush=True)
    summary = {}
    keys = [k for k in rows[0] if k.endswith('_mm') or k in ('ear_inside_skull', 'foldedTotal', 'collapsedTotal')]
    for k in keys:
        vals = [r[k] for r in rows if r.get(k) is not None]
        if vals:
            summary[k] = dict(min=min(vals), max=max(vals))
    summary['foldsMaxPerRegion'] = {r: [max(x['folds'][r][0] for x in rows), max(x['folds'][r][1] for x in rows)] for r in REGIONS}
    if clip == 'idle':
        seam = np.linalg.norm(Ps[90]-Ps[0], axis=1).max()*1000
        v_in = Ps[0]-Ps[89]          # frame 89 -> frame 90 (= 0)
        v_out = Ps[1]-Ps[0]
        acc_seam = np.linalg.norm(v_out-v_in, axis=1).max()*1000
        summary['seam_frame0_vs_frame90_max_mm'] = round(float(seam), 5)
        summary['seam_velocity_change_mm_per_frame'] = round(float(acc_seam), 4)
        summary['velocity_change_elsewhere_max_mm_per_frame'] = round(max(acc_all), 4)
        summary['velocity_change_elsewhere_median_mm_per_frame'] = round(float(np.median(acc_all)), 4)
        summary['seam_speed_in_out_mm_per_frame'] = [round(float(np.linalg.norm(v_in, axis=1).max()*1000), 3),
                                                     round(float(np.linalg.norm(v_out, axis=1).max()*1000), 3)]
        rest0['idle0'] = Ps[0]
    if clip == 'stalk':
        full = [r for r in rows if all(v == 1 for v in r['info']['shares'].values()) and r['info']['idle'] == 0]
        summary['fullCrouchFrames'] = [r['frame'] for r in full]
        exact = [r for r in full if r['info']['holdBreath'] == 0 and r['info']['twitch'] == 0 and r['info']['anticipation'] == 0]
        summary['night_stalk_exact_frames'] = {r['frame']: r['vs_night_stalk_max_mm'] for r in exact}
        summary['hold_vs_night_stalk_max_mm'] = max(r['vs_night_stalk_max_mm'] for r in full)
        summary['hold_vs_night_stalk_outside_hold_layers_max_mm'] = max(r['vs_night_stalk_outside_hold_layers_max_mm'] for r in full)
        if 'idle0' in rest0:
            last = Ps[len(frames)-1]
            summary['last_frame_vs_idle0_max_mm'] = round(float(np.linalg.norm(last-rest0['idle0'], axis=1).max())*1000, 4)
            summary['first_frame_vs_idle0_max_mm'] = round(float(np.linalg.norm(Ps[0]-rest0['idle0'], axis=1).max())*1000, 4)
        # in-between folds against the approved crouch clip's per-region maximum
        mx = report['approvedCrouchFolds']['maxPerRegion']
        summary['framesOverApprovedFolds'] = [dict(frame=r['frame'], regions={g: r['folds'][g] for g in REGIONS
                                                                               if r['folds'][g][0] > mx[g][0] or r['folds'][g][1] > mx[g][1]})
                                              for r in rows if any(r['folds'][g][0] > mx[g][0] or r['folds'][g][1] > mx[g][1] for g in REGIONS)]
    report[clip] = dict(summary=summary, frames=rows)
    print(clip, json.dumps(summary), flush=True)
(a.bake/'checks-skin.json').write_text(json.dumps(report, indent=1))
print('CHECKS_DONE')
