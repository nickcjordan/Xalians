"""Per-frame skin checks for the batch 2 clips (displaced, held, held_in, held_out, faint) and the batch 2 setup check (numpy, no
Blender). Numbers only; nothing here grades the look. Built from clipset_checks.py (batch 1), whose region, fold, stretch, arm,
tail, ear and foot tests are repeated unchanged; batch 2 adds:
- ground: the posed skin's lowest point (mm, under 0 is below the floor) overall and per region (head, ears, tails, arms,
  legs, trunk), and the skin vertices more than 1 mm below the floor;
- arms against the trunk and hips: the smallest signed gap (mm) from each side's arm skin (past the first 6 cm of the upper
  arm) to the trunk and hip skin (pelvis, spine, chest, glute and thigh weight over .5, no arm weight), and the arm vertices
  inside it (more than 1 mm behind its surface, within 2 cm), held's pinned arms;
- per clip: displaced, the first frame against approved idle frame 0 and the last against idle frame 89 (and the hand back);
  held, the loop seam (frame 0 against the module's frame 45, and the velocity change across it against the largest
  elsewhere); held_in, the first frame against idle frame 0 and its step into loop frame 0; held_out, the first frame against
  loop frame 0, the step from loop frame 44 into it, the last against idle frame 89; faint, the first frame against idle frame
  0 and the end hold (the last frames' largest vertex step).

  python art/species-construction/anim/clipset_checks_b2.py clips <rig dir> <rest skin npz> <bake dir> <approved bake dir>
      [--clips displaced,held,held_in,held_out,faint]
  python art/species-construction/anim/clipset_checks_b2.py setup <rig dir> <rest skin npz> <bake dir> <out json>
      [--frames faintA:0,faintB:0,faintC:0,displaced:4,held:10]

Writes <bake dir>/checks-skin.json (clips) or <out json> (setup).
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
import akinza_clipset_b2 as c2  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('mode', choices=['clips', 'setup'])
p.add_argument('rig', type=Path)
p.add_argument('rest', type=Path)
p.add_argument('bake', type=Path)
p.add_argument('approved', type=Path, help='clips: the approved bake dir (idle frames 0 and 89); setup: the out json')
p.add_argument('--clips', default='displaced,held,held_in,held_out,faint')
p.add_argument('--frames', default='faintA:0,faintB:0,faintC:0')
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
# fix pass 4: the nape and the back (neck, chest and spine skin behind the neck's line, no arm or ear weight), so an ear
# swung down behind the head is tested against them as against the skull
NAPE_BACK = np.where((share(['neck', 'chest', 'spine']) > .9) & (share([b for b in NAMES if b.startswith('ear_')]) < .01)
                     & (rest[:, 1] > J['neck_base'][1]))[0]
TAIL = {t: share([f'tail_{t}{k}' for k in range(2, rc.TAIL_BONES+1)]) > .5 for t in rc.TAILS}
any_tail = share([b for b in NAMES if b.startswith('tail_')])
LEGS = (share([b for b in NAMES if rc.base_of(b) in ('thigh', 'shin', 'foot')]) > .5) & (any_tail < .01)
REGIONS = {'shoulder': ['shoulder.L', 'shoulder.R'], 'elbow': ['elbow.L', 'elbow.R'], 'hip': ['hip.L', 'hip.R'],
           'knee': ['knee.L', 'knee.R'], 'neck': ['neck_base', 'head_base'], 'jaw': ['jaw_hinge'],
           'ear_root': ['ear0.L', 'ear0.R'], 'tail_fork': ['tail_fork'], 'ankle': ['ankle.L', 'ankle.R'], 'wrist': ['wrist.L', 'wrist.R']}
RADIUS = {'shoulder': .09, 'elbow': .06, 'hip': .10, 'knee': .07, 'neck': .08, 'jaw': .06, 'ear_root': .09,
          'tail_fork': .10, 'ankle': .06, 'wrist': .05}
centroid = rest[tris].mean(1)
region_of = {}
for r, js in REGIONS.items():
    dist = np.min([np.linalg.norm(centroid-np.array(J[j]), axis=1)-np.linalg.norm(centroid-np.array(J[j]), axis=1).min()
                   for j in js], axis=0)
    region_of[r] = dist < RADIUS[r]
# fix pass 5 (the guard leans its trunk forward): the spine (the back over the waist and chest joints) and the belly (the
# front of the trunk between the hips and the ribs), each from the trunk skin (more than half its weight on the pelvis,
# spine or chest, no arm, leg or tail weight)
TRUNK_SKIN = (share(['pelvis', 'spine', 'chest']) > .5) & (share([b for b in NAMES if rc.base_of(b) in ('upperarm', 'forearm', 'hand',
                                                                                                          'thigh', 'shin', 'foot', 'glute')]) < .05)     & (share([b for b in NAMES if b.startswith('tail')]) < .05)
TRUNK_SKIN = TRUNK_SKIN[tris].all(1)                                  # per triangle
_w, _c = np.array(J['waist']), np.array(J['chest'])
region_of['spine'] = TRUNK_SKIN & (centroid[:, 1] > _w[1]+.02) & (centroid[:, 2] > np.array(J['pelvis'])[2]+.04) & (centroid[:, 2] < _c[2]+.08)
region_of['belly'] = TRUNK_SKIN & (centroid[:, 1] < _w[1]-.02) & (centroid[:, 2] > np.array(J['hip.L'])[2]+.03) & (centroid[:, 2] < _c[2])
APPROVED_REGIONS = list(REGIONS)+['spine', 'belly']
ARMPIT_PT = {sd: np.array(J[f'shoulder.{sd}'])*np.array([.85, 1, 1])+np.array([0, 0, -.06]) for sd in 'LR'}
region_of['armpit'] = np.min([np.linalg.norm(centroid-ARMPIT_PT[sd], axis=1) for sd in 'LR'], axis=0) < .06
STRETCH_REGIONS = ('shoulder', 'armpit', 'elbow', 'ankle')
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
TRUNK_HIP = np.flatnonzero((share(['pelvis', 'spine', 'chest']+[b for b in NAMES if rc.base_of(b) in ('glute', 'thigh')]) > .5)
                           & (share([b for b in NAMES if rc.base_of(b) in ('clavicle', 'upperarm', 'forearm', 'hand')]) < .02))
DOM = np.array([NAMES[b] for b in idx[:, 0]])
GROUND_REGION = {
    'head': np.isin(DOM, ['head', 'jaw', 'neck']), 'ears': np.char.startswith(DOM.astype(str), 'ear_'),
    'tails': np.char.startswith(DOM.astype(str), 'tail_'),
    'arms': np.isin(np.array([rc.base_of(n) for n in DOM]), ['clavicle', 'upperarm', 'forearm', 'hand']),
    'legs': np.isin(np.array([rc.base_of(n) for n in DOM]), ['thigh', 'shin', 'foot'])}
GROUND_REGION['trunk'] = ~np.any(np.stack(list(GROUND_REGION.values())), 0)
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
    th_tree = cKDTree(P[TRUNK_HIP])
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
        dt, qt = th_tree.query(P[ARM[sd]], k=1, workers=-1)
        sgt = np.einsum('ij,ij->i', P[ARM[sd]]-P[TRUNK_HIP][qt], vn[TRUNK_HIP][qt])
        near = dt < .03
        out[f'arm_{sd}_to_trunk_hips_min_mm'] = round(float(dt.min())*1000, 1)
        out[f'arm_{sd}_trunk_hips_signed_gap_min_mm'] = round(float(sgt[near].min())*1000, 1) if near.any() else None
        out[f'arm_{sd}_inside_trunk_hips'] = int(np.sum((dt < .02) & (sgt < -.001)))
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
    nb = P[NAPE_BACK]
    nbn = vertex_normals(P)[NAPE_BACK]
    dd, qi = cKDTree(nb).query(P[EAR], k=1, workers=-1)
    signed = np.einsum('ij,ij->i', P[EAR]-nb[qi], nbn[qi])
    near = dd < .03
    out['ear_inside_nape_back'] = int(np.sum(near & (signed < -.001)))
    out['ear_nape_back_gap_min_mm'] = round(float(dd.min())*1000, 2)
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
    out['ground_min_mm'] = {r: round(float(P[m, 2].min())*1000, 1) for r, m in GROUND_REGION.items()}
    out['below_floor_1mm_vertices'] = int(np.sum(P[:, 2] < -.001))
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
    info = fr.get('info', {})
    if 'targets' in info and info['targets'] is None:        # batch 2: legs posed by hand (faint lying), no IK target
        return None
    t = info.get('targets')
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
        row['swing_deg'] = {b: round(rc.swing_deg(J, fr['pose'], b, B), 1) for b in ('foot.L', 'foot.R', 'clavicle.L', 'upperarm.L', 'forearm.L', 'hand.L',
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
    keys = [k for k in rows[0] if (k.endswith('_mm') or k in ('ear_inside_skull', 'ear_inside_nape_back', 'foldedTotal', 'collapsedTotal') or k.startswith('arm_')
                                   or k.endswith('_contact_vertices')) and k != 'bounds_src' and not isinstance(rows[0][k], dict)]
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
    def mx(X, Y):
        return round(float(np.linalg.norm(X-Y, axis=1).max())*1000, 5)

    def loaded(name, k):
        fr_ = json.loads((a.bake/name/'poses.json').read_text())[k]
        return posed(fr_['pose'], fr_['lift'], fr_)[0]
    if clip in ('displaced', 'held_out'):
        S['last_frame_vs_idle89_max_mm'] = mx(Ps[n-1], P_idle89)
        S['step_last_to_idle0_max_mm'] = mx(P_idle0, Ps[n-1])
        S['step_last_two_frames_max_mm'] = mx(Ps[n-1], Ps[n-2])
        S['velocity_change_at_handback_mm'] = round(float(np.linalg.norm((P_idle0-Ps[n-1])-(Ps[n-1]-Ps[n-2]), axis=1).max())*1000, 4)
    if clip in ('displaced', 'held_in', 'faint'):
        S['velocity_change_at_entry_mm'] = round(float(np.linalg.norm((Ps[1]-Ps[0])-(P_idle0-P_idle89), axis=1).max())*1000, 4)
    if clip == 'held':
        f45 = c2.held_frame(rig_obj, n)
        P45, _ = posed(f45['pose'], f45['lift'], f45)
        S['seam_frame0_vs_frame45_max_mm'] = mx(P45, Ps[0])
        v_in, v_out = Ps[0]-Ps[n-1], Ps[1]-Ps[0]
        S['seam_velocity_change_mm_per_frame'] = round(float(np.linalg.norm(v_out-v_in, axis=1).max())*1000, 4)
        acc = [float(np.linalg.norm((Ps[f+1]-Ps[f])-(Ps[f]-Ps[f-1]), axis=1).max())*1000 for f in range(1, n-1)]
        S['velocity_change_elsewhere_max_mm_per_frame'] = round(max(acc), 4)
        S['velocity_change_elsewhere_median_mm_per_frame'] = round(float(np.median(acc)), 4)
    if clip == 'held_in':
        P0, P1 = loaded('held', 0), loaded('held', 1)
        S['step_last_to_held0_max_mm'] = mx(P0, Ps[n-1])
        S['step_last_two_frames_max_mm'] = mx(Ps[n-1], Ps[n-2])
        S['step_held0_to_1_max_mm'] = mx(P1, P0)
        S['velocity_change_into_loop_mm'] = round(float(np.linalg.norm((P1-P0)-(P0-Ps[n-1]), axis=1).max())*1000, 4)
    if clip == 'held_out':
        g = json.loads((a.bake/'held'/'poses.json').read_text())
        Pg0, Pgl = loaded('held', 0), loaded('held', len(g)-1)
        S['first_frame_vs_held0_max_mm'] = mx(Ps[0], Pg0)
        S['step_held_last_to_first_max_mm'] = mx(Ps[0], Pgl)
    if clip == 'faint':
        S['end_hold_last5_max_step_mm'] = round(max(float(np.linalg.norm(Ps[k]-Ps[k-1], axis=1).max())*1000 for k in range(n-4, n)), 5)
        S['ground_min_per_region_mm'] = {r: min(x['ground_min_mm'][r] for x in rows) for r in rows[0]['ground_min_mm']}
        S['below_floor_1mm_vertices_max'] = max(x['below_floor_1mm_vertices'] for x in rows)
    report[clip] = dict(summary=S, frames=rows)
    print(clip, json.dumps({k: v for k, v in S.items() if k not in ('stretchMax',)})[:3000], flush=True)
(a.bake/'checks-skin.json').write_text(json.dumps(report, indent=1))
print('CHECKS_DONE')
