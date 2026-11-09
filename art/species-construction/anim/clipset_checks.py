"""Per-frame skin checks for the batch 1 clips (hurt, evade, guard, guard_in, guard_out) and the guard setup check (numpy, no
Blender). Numbers only; nothing here grades the look.

  python art/species-construction/anim/clipset_checks.py clips <rig dir> <rest skin npz> <bake dir> <approved bake dir>
      [--clips hurt,evade,guard,guard_in,guard_out]
  python art/species-construction/anim/clipset_checks.py setup <rig dir> <rest skin npz> <bake dir> <out json>
      [--frames guard:0,guard:13]

Every frame is posed the way the renders pose it (rig_core.posed_skin, the breath key of the bake dir first), the same
as clip_checks.py, whose region, tail, ear and fold tests are repeated here. Per frame:
- folds: folded and collapsed triangles per joint region (pose_board.py's test), beside the approved crouch clip's
  per-region maximum (rest to night_stalk by one eased share, 25 frames); an extra `armpit` region is reported (the
  skin round the point 6 cm under each shoulder joint, 15 percent in from it) and is not in the approved table;
- stretch: per region (shoulder, armpit, elbow), edge length ratio (p99 and max) and triangle area ratio (max) against
  rest, for edges and triangles inside the region;
- arms: arm vertices (more than .9 of their weight on one side's upper arm, forearm or hand, past the first 6 cm of
  the upper arm) inside other skin (the nearest vertex of the skin that side's arm bones own under .02 of, signed by
  its normal: more than 1 mm behind it, within 2 cm), counted for the upper arm and for the forearm and hand, plus the
  forearm and hand's smallest signed gap to the chest, neck and head skin;
- tails: tail-to-tail and tail-to-leg clearance in mm (the masks of pose_board.py);
- ears: ear blade vertices behind the posed skull surface;
- feet: the sole (foot-weighted skin within 6 mm of the floor at rest); its contact this frame (posed z under 3 mm);
  slide = horizontal move of the vertices in contact in this frame and the previous one, in mm; the sole's lowest
  point (under 0 is into the floor); and the IK's ankle error against the ankle target the clip asked for.
Per clip: the first frame against the approved idle frame 0 and the last against approved idle frame 89 (max vertex
difference, mm); the step into the next clip frame (idle 0 after hurt and evade, guard 7 after guard_in) against the
clip's own last step; guard_out's frame 0 against guard frame 0, its last frame against idle frame 89 and the hand
back; guard's seam (frame 0 against the module's frame 27, and the velocity change across it against
the largest anywhere else in the loop). Writes <bake dir>/checks-skin.json (clips) or <out json> (setup).
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
sys.path.insert(0, str(HERE))
import rig_core as rc  # noqa: E402
import akinza_clips as ac  # noqa: E402
import akinza_clipset_b1 as cb  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('mode', choices=['clips', 'setup'])
p.add_argument('rig', type=Path)
p.add_argument('rest', type=Path)
p.add_argument('bake', type=Path)
p.add_argument('approved', type=Path, help='clips: the approved bake dir (idle frames 0 and 89); setup: the out json')
p.add_argument('--clips', default='hurt,evade,guard,guard_in,guard_out')
p.add_argument('--frames', default='guard:0')
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
APPROVED_REGIONS = list(REGIONS)
ARMPIT_PT = {sd: np.array(J[f'shoulder.{sd}'])*np.array([.85, 1, 1])+np.array([0, 0, -.06]) for sd in 'LR'}
region_of['armpit'] = np.min([np.linalg.norm(centroid-ARMPIT_PT[sd], axis=1) for sd in 'LR'], axis=0) < .06
STRETCH_REGIONS = ('shoulder', 'armpit', 'elbow')
edge_region = {}
vert_region = {}
for r in STRETCH_REGIONS:
    vm = np.zeros(len(rest), bool)
    vm[tris[region_of[r]].ravel()] = True
    vert_region[r] = vm
    edge_region[r] = vm[edges[:, 0]] & vm[edges[:, 1]]
SOLE = {sd: np.where((share([f'foot.{sd}']) > .5) & (rest[:, 2] < .006))[0] for sd in 'LR'}
ARM = {}
ARM_FORE = {}
for sd in 'LR':
    bones = [f'upperarm.{sd}', f'forearm.{sd}', f'hand.{sd}']
    pure = share(bones) > .9
    far = np.linalg.norm(rest-np.array(J[f'shoulder.{sd}']), axis=1) > .06
    ARM[sd] = np.flatnonzero(pure & far)
    ARM_FORE[sd] = np.flatnonzero((share([f'forearm.{sd}', f'hand.{sd}']) > .9))
OTHER = {sd: np.flatnonzero(share([f'upperarm.{sd}', f'forearm.{sd}', f'hand.{sd}', f'clavicle.{sd}']) < .02) for sd in 'LR'}
FACE_CHEST = np.flatnonzero((share(['chest', 'neck', 'head', 'jaw', 'spine']) > .5) & (share([b for b in NAMES if b.startswith('ear_')]) < .1))
n_rest = np.cross(rest[tris[:, 1]]-rest[tris[:, 0]], rest[tris[:, 2]]-rest[tris[:, 0]])
area_rest = np.linalg.norm(n_rest, axis=1)
L_rest = np.linalg.norm(rest[edges[:, 0]]-rest[edges[:, 1]], axis=1)
tri_dom = idx[tris[:, 0], 0]
SHAPES = ac.load_shapes(a.bake)


def posed(pose, lift, fr=None):
    base = ac.apply_shapes(rest, fr, SHAPES) if fr is not None else rest
    P, _, vals = rc.posed_skin(base, idx, w, J, pose, lift, KEYS, DELTAS)
    return P, vals


def folds(P, pose, lift):
    T = rc.bone_transforms(J, pose, bones=B, root_translate=tuple(rc.lift_vec(lift)))
    nP = np.cross(P[tris[:, 1]]-P[tris[:, 0]], P[tris[:, 2]]-P[tris[:, 0]])
    Rd = np.stack([T[b][0] for b in NAMES])[tri_dom]
    expect = np.einsum('nij,nj->ni', Rd, n_rest)
    cosang = np.einsum('ij,ij->i', nP, expect)/np.maximum(np.linalg.norm(nP, axis=1)*np.linalg.norm(expect, axis=1), 1e-20)
    area = np.linalg.norm(nP, axis=1)/np.maximum(area_rest, 1e-20)
    reg = {r: [int(np.sum(m & (cosang < 0))), int(np.sum(m & (area < .25)))] for r, m in region_of.items()}
    st = {}
    Lr = np.linalg.norm(P[edges[:, 0]]-P[edges[:, 1]], axis=1)/np.maximum(L_rest, 1e-12)
    for r in STRETCH_REGIONS:
        e = Lr[edge_region[r]]
        ar = area[region_of[r]]
        st[r] = dict(edge_p99=round(float(np.quantile(e, .99)), 3), edge_max=round(float(e.max()), 3),
                     edge_min=round(float(e.min()), 3), area_max=round(float(ar.max()), 3), area_p999=round(float(np.quantile(ar, .999)), 3),
                     area_min=round(float(ar.min()), 4), tilted60=int(np.sum(region_of[r] & (cosang < .5))))
    return reg, int(np.sum(cosang < 0)), int(np.sum(area < .25)), st, T


def arm_checks(P):
    out = {}
    vn = vertex_normals(P)
    fc_tree = cKDTree(P[FACE_CHEST])
    for sd in 'LR':
        oth = OTHER[sd]
        tree = cKDTree(P[oth])
        dd, qi = tree.query(P[ARM[sd]], k=1, workers=-1)
        sg = np.einsum('ij,ij->i', P[ARM[sd]]-P[oth][qi], vn[oth][qi])
        inside = (dd < .02) & (sg < -.001)
        fore = np.isin(ARM[sd], ARM_FORE[sd])
        out[f'arm_{sd}_inside_upper'] = int(np.sum(inside & ~fore))
        out[f'arm_{sd}_inside_forearm_hand'] = int(np.sum(inside & fore))
        df, qf = fc_tree.query(P[ARM_FORE[sd]], k=1, workers=-1)
        sgf = np.einsum('ij,ij->i', P[ARM_FORE[sd]]-P[FACE_CHEST][qf], vn[FACE_CHEST][qf])
        near = df < .03
        out[f'arm_{sd}_forearm_hand_to_face_chest_min_mm'] = round(float(df.min())*1000, 1)
        out[f'arm_{sd}_forearm_hand_signed_gap_min_mm'] = round(float(sgf[near].min())*1000, 1) if near.any() else None
    return out


def frame_checks(P, pose, lift, prev, targets=None):
    reg, ftot, ctot, st, T = folds(P, pose, lift)
    out = dict(folds=reg, foldedTotal=ftot, collapsedTotal=ctot, stretch=st)
    trees = {t: cKDTree(P[TAIL[t]]) for t in rc.TAILS}
    for i, t in enumerate(rc.TAILS):
        for u in rc.TAILS[i+1:]:
            out[f'tail_{t}{u}_mm'] = round(float(trees[u].query(P[TAIL[t]], k=1, workers=-1)[0].min())*1000, 1)
    lt = cKDTree(P[LEGS])
    for t in rc.TAILS:
        out[f'tail_{t}_leg_mm'] = round(float(lt.query(P[TAIL[t]], k=1, workers=-1)[0].min())*1000, 1)
    sk = P[SKULL]
    skn = vertex_normals(P)[SKULL]
    dd, qi = cKDTree(sk).query(P[EAR], k=1, workers=-1)
    signed = np.einsum('ij,ij->i', P[EAR]-sk[qi], skn[qi])
    near = dd < .03
    out['ear_inside_skull'] = int(np.sum(near & (signed < -.001)))
    out['ear_skull_gap_min_mm'] = round(float(signed[near].min())*1000, 2) if near.any() else None
    out.update(arm_checks(P))
    for sd in 'LR':
        sole = P[SOLE[sd]]
        on = sole[:, 2] < .003
        out[f'sole_{sd}_contact_vertices'] = int(on.sum())
        out[f'sole_{sd}_lowest_mm'] = round(float(sole[:, 2].min())*1000, 2)
        if prev is not None:
            both = on & (prev[SOLE[sd]][:, 2] < .003)
            mv = np.linalg.norm((sole-prev[SOLE[sd]])[:, :2], axis=1)
            out[f'sole_{sd}_slide_mm'] = round(float(mv[both].max())*1000, 3) if both.any() else None
        if targets is not None:
            Ra, ta = T[f'shin.{sd}']
            ank = Ra@np.array(J[f'ankle.{sd}'])+ta
            out[f'ankle_{sd}_err_mm'] = round(float(np.linalg.norm(ank-np.asarray(targets[sd])))*1000, 3)
    out['floor_min_mm'] = round(float(P[:, 2].min())*1000, 2)
    out['bounds_src'] = [(P.min(0)/s+off).round(4).tolist(), (P.max(0)/s+off).round(4).tolist()]
    return out


def approved_crouch():
    c = POSES['night_stalk']['crouch']
    appr = []
    for f in range(0, 25):
        e = .5-.5*math.cos(math.pi*f/24)
        lift = e*np.array(c['lift'])
        pz = rc.plant_legs(J, rc.lagged_slerp_pose(c['body'], e, c.get('tailLag')), lift, c['feet'], c['poles'], bones=B)
        P, _ = posed(pz, lift)
        reg, ftot, ctot, st, _ = folds(P, pz, lift)
        appr.append(dict(frame=f, folds=reg, stretch=st))
    mx = {r: [max(x['folds'][r][0] for x in appr), max(x['folds'][r][1] for x in appr)] for r in region_of}
    smx = {r: {k: max(x['stretch'][r][k] for x in appr) for k in ('edge_p99', 'edge_max', 'area_max', 'tilted60')} for r in STRETCH_REGIONS}
    return mx, smx


def targets_of(fr):
    t = fr.get('info', {}).get('targets')
    if t:
        return t
    feet = {}
    for sd in 'LR':
        heel = fr.get('info', {}).get('heel', 0.)
        tg, _ = cb.foot_target(J, sd, dict(pitch=heel, pivot='toe'))
        feet[sd] = tg.tolist()
    return feet


rig_obj = ac.Rig(R)
print('approved crouch ...', flush=True)
APPR, APPR_ST = approved_crouch()
print('approved crouch max per region', APPR, flush=True)

if a.mode == 'setup':
    out = dict(rig=str(R), rest=str(a.rest), units='mm unless named', approvedCrouchFoldsMaxPerRegion=APPR,
               approvedCrouchStretchMax=APPR_ST, frames={})
    # rest, the approved night_stalk and the board's arm_reach as baselines
    base = {'rest': ({}, 0.), 'night_stalk': (POSES['night_stalk']['pose'], POSES['night_stalk']['lift']),
            'arm_reach (board pose)': (POSES['arm_reach']['pose'], POSES['arm_reach']['lift'])}
    for name, (pz, lift) in base.items():
        P, vals = posed(pz, lift)
        out['frames'][name] = dict(keys={k: round(v, 3) for k, v in vals.items() if v > 0}, **frame_checks(P, pz, lift, None))
        print(name, json.dumps({k: v for k, v in out['frames'][name].items() if k not in ('bounds_src',)})[:900], flush=True)
    for spec in a.frames.split(','):
        clip, fno = spec.split(':')
        fr = json.loads((a.bake/clip/'poses.json').read_text())[int(fno)]
        P, vals = posed(fr['pose'], fr['lift'], fr)
        row = dict(keys={k: round(v, 3) for k, v in vals.items() if v > 0}, **frame_checks(P, fr['pose'], fr['lift'], None, targets_of(fr)))
        row['swing_deg'] = {b: round(rc.swing_deg(J, fr['pose'], b, B), 1) for b in ('clavicle.L', 'upperarm.L', 'forearm.L', 'hand.L',
                                                                                    'upperarm.R', 'forearm.R', 'hand.R')}
        T = rc.bone_transforms(J, fr['pose'], bones=B, root_translate=tuple(rc.lift_vec(fr['lift'])))
        joints = {}
        for b, _, h, t in B:
            if rc.base_of(b) in ('upperarm', 'forearm', 'hand'):
                Rb, tb = T[b]
                joints[t] = (Rb@np.array(J[t])+tb).round(4).tolist()
        row['arm_joints_m'] = joints
        row['regions_over_approved'] = {r: row['folds'][r] for r in APPROVED_REGIONS
                                        if row['folds'][r][0] > APPR[r][0] or row['folds'][r][1] > APPR[r][1]}
        out['frames'][f'{clip}:{fno}'] = row
        print(spec, json.dumps({k: v for k, v in row.items() if k not in ('bounds_src',)})[:2500], flush=True)
    Path(a.approved).parent.mkdir(parents=True, exist_ok=True)
    Path(a.approved).write_text(json.dumps(out, indent=1))
    print('SETUP_DONE')
    raise SystemExit(0)

# ---------------------------------------------------------------- clips
idle = json.loads((a.approved/'idle'/'poses.json').read_text())
P_idle0, _ = posed(idle[0]['pose'], idle[0]['lift'], idle[0])
P_idle1, _ = posed(idle[1]['pose'], idle[1]['lift'], idle[1])
P_idle89, _ = posed(idle[89]['pose'], idle[89]['lift'], idle[89])
P_idle88, _ = posed(idle[88]['pose'], idle[88]['lift'], idle[88])
idle_step = float(np.linalg.norm(P_idle0-P_idle89, axis=1).max()*1000)
report = dict(rig=str(R), rest=str(a.rest), approved=str(a.approved), units='mm unless named',
              soleVertices={sd: int(len(v)) for sd, v in SOLE.items()}, armVertices={sd: int(len(v)) for sd, v in ARM.items()},
              approvedCrouchFoldsMaxPerRegion=APPR, approvedCrouchStretchMax=APPR_ST,
              idleStep89to0_max_mm=round(idle_step, 4))
for clip in a.clips.split(','):
    frames = json.loads((a.bake/clip/'poses.json').read_text())
    rows, Ps = [], {}
    prev = None
    for fr in frames:
        P, vals = posed(fr['pose'], fr['lift'], fr)
        row = dict(frame=fr['frame'], keys={k: round(v, 3) for k, v in vals.items() if v > 0},
                   **frame_checks(P, fr['pose'], fr['lift'], prev, targets_of(fr)))
        if prev is not None:
            row['max_vertex_step_mm'] = round(float(np.linalg.norm(P-prev, axis=1).max())*1000, 2)
        row['planted'] = fr['info'].get('planted')
        row['info'] = fr['info']
        Ps[fr['frame']] = P
        prev = P
        rows.append(row)
        print(clip, fr['frame'], {k: row.get(k) for k in ('foldedTotal', 'tail_ab_mm', 'tail_bc_mm', 'tail_c_leg_mm', 'ear_inside_skull',
                                                          'sole_L_slide_mm', 'sole_L_lowest_mm', 'ankle_L_err_mm', 'arm_L_inside_forearm_hand',
                                                          'arm_L_inside_upper', 'max_vertex_step_mm')}, flush=True)
    n = len(frames)
    S = {}
    keys = [k for k in rows[0] if (k.endswith('_mm') or k in ('ear_inside_skull', 'foldedTotal', 'collapsedTotal') or k.startswith('arm_')
                                   or k.endswith('_contact_vertices')) and k != 'bounds_src']
    for k in keys + ['max_vertex_step_mm']:
        vals = [r[k] for r in rows if r.get(k) is not None]
        if vals:
            S[k] = dict(min=min(vals), max=max(vals))
    # slide only where the clip marks the feet planted (and the sole is in contact both frames)
    for sd in 'LR':
        pl = [r[f'sole_{sd}_slide_mm'] for r in rows if r.get(f'sole_{sd}_slide_mm') is not None and (r['planted'] or {}).get(sd)]
        S[f'sole_{sd}_slide_planted_max_mm'] = max(pl) if pl else None
    S['foldsMaxPerRegion'] = {r: [max(x['folds'][r][0] for x in rows), max(x['folds'][r][1] for x in rows)] for r in region_of}
    S['stretchMax'] = {r: {k: max(x['stretch'][r][k] for x in rows) for k in ('edge_p99', 'edge_max', 'area_max', 'tilted60')}
                       for r in STRETCH_REGIONS}
    S['framesOverApprovedFolds'] = [dict(frame=r['frame'], regions={g: r['folds'][g] for g in APPROVED_REGIONS
                                                                    if r['folds'][g][0] > APPR[g][0] or r['folds'][g][1] > APPR[g][1]})
                                    for r in rows if any(r['folds'][g][0] > APPR[g][0] or r['folds'][g][1] > APPR[g][1] for g in APPROVED_REGIONS)]
    S['first_frame_vs_idle0_max_mm'] = round(float(np.linalg.norm(Ps[0]-P_idle0, axis=1).max())*1000, 5)
    if clip in ('hurt', 'evade'):
        S['last_frame_vs_idle89_max_mm'] = round(float(np.linalg.norm(Ps[n-1]-P_idle89, axis=1).max())*1000, 5)
        S['step_last_to_idle0_max_mm'] = round(float(np.linalg.norm(P_idle0-Ps[n-1], axis=1).max())*1000, 4)
        S['step_last_two_frames_max_mm'] = round(float(np.linalg.norm(Ps[n-1]-Ps[n-2], axis=1).max())*1000, 4)
        S['velocity_change_at_handback_mm'] = round(float(np.linalg.norm((P_idle0-Ps[n-1])-(Ps[n-1]-Ps[n-2]), axis=1).max())*1000, 4)
        S['velocity_change_at_entry_mm'] = round(float(np.linalg.norm((Ps[1]-Ps[0])-(P_idle0-P_idle89), axis=1).max())*1000, 4)
    if clip == 'guard':
        rig_ = rig_obj
        f27 = cb.guard_frame(rig_, n)
        P27, _ = posed(f27['pose'], f27['lift'], f27)
        S['seam_frame0_vs_frame27_max_mm'] = round(float(np.linalg.norm(P27-Ps[0], axis=1).max())*1000, 5)
        v_in, v_out = Ps[0]-Ps[n-1], Ps[1]-Ps[0]
        S['seam_velocity_change_mm_per_frame'] = round(float(np.linalg.norm(v_out-v_in, axis=1).max())*1000, 4)
        acc = [float(np.linalg.norm((Ps[f+1]-Ps[f])-(Ps[f]-Ps[f-1]), axis=1).max())*1000 for f in range(1, n-1)]
        S['velocity_change_elsewhere_max_mm_per_frame'] = round(max(acc), 4)
        S['velocity_change_elsewhere_median_mm_per_frame'] = round(float(np.median(acc)), 4)
    if clip == 'guard_in':
        g = json.loads((a.bake/'guard'/'poses.json').read_text())
        P7, _ = posed(g[7]['pose'], g[7]['lift'], g[7])
        P8, _ = posed(g[8]['pose'], g[8]['lift'], g[8])
        S['step_last_to_guard7_max_mm'] = round(float(np.linalg.norm(P7-Ps[n-1], axis=1).max())*1000, 4)
        S['step_last_two_frames_max_mm'] = round(float(np.linalg.norm(Ps[n-1]-Ps[n-2], axis=1).max())*1000, 4)
        S['step_guard7_to_8_max_mm'] = round(float(np.linalg.norm(P8-P7, axis=1).max())*1000, 4)
        S['velocity_change_at_set_mm'] = round(float(np.linalg.norm((P8-P7)-(P7-Ps[n-1]), axis=1).max())*1000, 4)
    if clip == 'guard_out':
        g = json.loads((a.bake/'guard'/'poses.json').read_text())
        Pg0, _ = posed(g[0]['pose'], g[0]['lift'], g[0])
        Pg26, _ = posed(g[-1]['pose'], g[-1]['lift'], g[-1])
        S['first_frame_vs_guard0_max_mm'] = round(float(np.linalg.norm(Ps[0]-Pg0, axis=1).max())*1000, 5)
        S['step_guard26_to_first_max_mm'] = round(float(np.linalg.norm(Ps[0]-Pg26, axis=1).max())*1000, 4)
        S['last_frame_vs_idle89_max_mm'] = round(float(np.linalg.norm(Ps[n-1]-P_idle89, axis=1).max())*1000, 5)
        S['step_last_to_idle0_max_mm'] = round(float(np.linalg.norm(P_idle0-Ps[n-1], axis=1).max())*1000, 4)
        S['step_last_two_frames_max_mm'] = round(float(np.linalg.norm(Ps[n-1]-Ps[n-2], axis=1).max())*1000, 4)
        S['velocity_change_at_handback_mm'] = round(float(np.linalg.norm((P_idle0-Ps[n-1])-(Ps[n-1]-Ps[n-2]), axis=1).max())*1000, 4)
    report[clip] = dict(summary=S, frames=rows)
    print(clip, json.dumps({k: v for k, v in S.items() if k not in ('stretchMax',)})[:3000], flush=True)
(a.bake/'checks-skin.json').write_text(json.dumps(report, indent=1))
print('CHECKS_DONE')
