"""Ankle keys for rig-p8b, direction aware (E5, clip set batch 1; batch 3's run on the toes needs it). Numpy, no Blender.

  python art/species-construction/anim/ankle_corrective.py poses <rig dir> <out dir>
  python art/species-construction/anim/ankle_corrective.py build <rig dir> <rest skin npz> [--rounds 40] [--r0 .025 --r1 .06]
      [--relax 0] [--band .1,.4] [--check-bakes a.json,b.json]

The cause (fix pass 2, evade f3 and f4): the rig's ankle keys (ankle_mush_low, _mid and ankle_mush, pose_board.py) are
driven by how far the ankle bends, whichever way, and were sculpted on the crouch's flexed ankle (toes up toward the
shin). A pointed foot (heel up) of the same size set them to full and put the crouch's correction on it: a bulge and a
crease behind the ankle.

build:
- the three ankle keys get a `direction` (rig_core.key_value): they fire only while the foot swings toward the shin
  (sign -1 about the hinge axis +X), times smoothstep(-swing_direction, band); every flexed-ankle frame of idle, Night
  Stalk, the approved crouch, hurt, evade and guard sits at -0.72 or further, past the band's top (0.4), so their values
  are unchanged bit for bit;
- two pointed-foot keys per side, the same kind as the knee and ankle mush keys (the posed skin smoothed along the skin
  plus the rest skin's own detail turned by each vertex's skinning rotation, in a smooth mask round the band where the
  shin and the foot share the weight, limited to that leg's skin; optionally the hip keys' relax that unfolds a crease),
  driven by the foot's swing the other way (sign +1):
    ankle_point_mid  sculpted at evade frame 3 (the 40-degree heel lift on the toe pads), rising from 3 degrees to its
                     swing there and falling to 0 at the full key's angle;
    ankle_point      sculpted on the toes with the heels up 60 degrees (both feet, the run toe-off's ankle), rising from
                     the mid angle to that swing and holding.
Appends to <rig dir>/correctives.json and .npz, replacing earlier ankle_point keys; the first run keeps the rig's files as
correctives-pre-ankle.json and .npz. Writes ankle-corrective.json (parameters, angles, key values over the clips given).

poses: the setup check's static poses, each one frame: evadeF3 (evade frame 3, heels up 40 degrees on the toe pads),
evadeF5pointed (evade frame 5 with both feet pointed 25 degrees about the ankle in the air, as the first fix build had
them), runToeoff (the near foot trailing on its toe pads with the heel up 60 degrees, the far foot swinging forward, the
trunk leaning into the run): <out>/<name>/poses.json.
"""
import argparse
import json
import shutil
import sys
from pathlib import Path

import numpy as np
import scipy.sparse as sp
from scipy.spatial import cKDTree

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
import rig_core as rc  # noqa: E402
import akinza_clips as ac  # noqa: E402
import akinza_clipset_b1 as cb  # noqa: E402

B = rc.ANIM_BONES
HINGE = [1., 0., 0.]


def run_toeoff(rig):
    """The near foot trailing on its toe pads, heel up 60 degrees; the far foot forward in the air; the trunk leaning in."""
    pose = {}
    for b, e in (('pelvis', [4., 0., 0.]), ('spine', [3., 0., 0.]), ('chest', [3., 0., 0.]), ('neck', [-4., 0., 0.]),
                 ('head', [-5., 0., 0.]), ('upperarm.L', [-20., 0., 0.]), ('upperarm.R', [18., 0., 0.]),
                 ('forearm.L', [-25., 0., 0.]), ('forearm.R', [-10., 0., 0.])):
        cb.turn(pose, b, e)
    lift = np.array([0., -.04, -.015])
    feet = {'L': dict(t=(0., .12, 0.), pitch=60., pivot='toe'), 'R': dict(t=(0., -.17, .11), pitch=-8., pivot='ankle')}
    full, targets = cb.solve_feet(rig, pose, lift, feet)
    return cb.frame_dict(0, full, lift, 0., dict(targets={sd: [float(x) for x in targets[sd]] for sd in 'LR'},
                                                  planted=dict(L=True, R=False), feet={sd: dict(feet[sd]) for sd in 'LR'}))


def tiptoe(rig, heel=60.):
    """Both feet on the toe pads, heels up `heel` degrees (the sculpt pose of the full pointed-foot key)."""
    lift = np.array([0., -.02, -.02])
    spec = dict(pitch=heel, pivot='toe')
    full, targets = cb.solve_feet(rig, {}, lift, {'L': spec, 'R': spec})
    return cb.frame_dict(0, full, lift, 0., dict(targets={sd: [float(x) for x in targets[sd]] for sd in 'LR'}))


def evade_f5_pointed(rig):
    feet = cb.EVADE['feet']
    old = {sd: feet[sd][5] for sd in 'LR'}
    for sd in 'LR':
        feet[sd][5] = (.14, .125, 25, 'a')
    try:
        return cb.evade_frame(rig, 5)
    finally:
        for sd in 'LR':
            feet[sd][5] = old[sd]


def cmd_poses(a):
    rig = ac.Rig(a.rig)
    out = Path(a.out)
    for name, fr in (('evadeF3', cb.evade_frame(rig, 3)), ('evadeF5pointed', evade_f5_pointed(rig)), ('runToeoff', run_toeoff(rig))):
        fr = dict(fr, frame=0)
        (out/name).mkdir(parents=True, exist_ok=True)
        (out/name/'poses.json').write_text(json.dumps([fr], indent=0))
        sw = {sd: round(rc.swing_deg(rig.J, fr['pose'], f'foot.{sd}', B), 1) for sd in 'LR'}
        dr = {sd: round(rc.swing_direction(rig.J, fr['pose'], f'foot.{sd}', HINGE, B), 3) for sd in 'LR'}
        print(name, 'foot swing', sw, 'direction (+ pointed)', dr, flush=True)


def cmd_build(a):
    R = a.rig
    rig = json.loads((R/'rig.json').read_text())
    J = json.loads((R/'joints.json').read_text())
    s, off = rig['transform']['scale'], np.array(rig['transform']['offset'])
    d = np.load(a.rest)
    rest = s*(d['src'].astype(np.float64)-off)
    edges = d['edges'].astype(np.int64)
    n = len(rest)
    NAMES = rc.ANIM_NAMES
    NI = {b: i for i, b in enumerate(NAMES)}
    wt = np.load(R/'weights.npz')
    idx = wt['idx'].astype(int)
    w = np.round(wt['w'].astype(np.float64)*4096)/4096
    w /= w.sum(1, keepdims=True)
    dense = np.zeros((n, len(NAMES)))
    np.put_along_axis(dense, idx, w, 1)
    share = lambda bones: dense[:, [NI[b] for b in bones]].sum(1)
    if not (R/'correctives-pre-ankle.json').exists():
        shutil.copyfile(R/'correctives.json', R/'correctives-pre-ankle.json')
        shutil.copyfile(R/'correctives.npz', R/'correctives-pre-ankle.npz')
    base_json = json.loads((R/'correctives.json').read_text())
    cz = np.load(R/'correctives.npz')
    band = [float(v) for v in a.band.split(',')]
    keys = []
    for k in base_json['keys']:
        if k['name'].startswith('ankle_point'):
            continue
        k = dict(k)
        if k['name'].startswith('ankle_mush'):
            k['direction'] = dict(axis=HINGE, sign=-1, band=band, note='fires only while the ankle flexes (toes toward the shin), the crouch direction it was sculpted for')
        keys.append(k)
    deltas = {k['name']: (cz[k['name']+'__ids'], cz[k['name']+'__delta'].astype(np.float64)) for k in keys}
    A = sp.coo_matrix((np.ones(2*len(edges)), (np.r_[edges[:, 0], edges[:, 1]], np.r_[edges[:, 1], edges[:, 0]])), shape=(n, n)).tocsr()
    A = sp.diags(1/np.maximum(np.asarray(A.sum(1)).ravel(), 1))@A

    def smooth(V, rounds):
        for _ in range(rounds):
            V = .5*V+.5*(A@V)
        return V

    def quats(Rm):
        wq = np.sqrt(np.maximum(1+Rm[:, 0, 0]+Rm[:, 1, 1]+Rm[:, 2, 2], 1e-12))/2
        return np.stack([wq, (Rm[:, 2, 1]-Rm[:, 1, 2])/(4*wq), (Rm[:, 0, 2]-Rm[:, 2, 0])/(4*wq), (Rm[:, 1, 0]-Rm[:, 0, 1])/(4*wq)], 1)

    def mask(sd):
        g1, g2 = share([f'shin.{sd}']), share([f'foot.{sd}'])
        tot = g1+g2
        held = np.maximum(g1, g2)/np.maximum(tot, 1e-9)
        bandv = (tot > .9) & (held < .97)
        dband, _ = cKDTree(rest[bandv]).query(rest, k=1, workers=-1)
        leg = rc.smoothstep(share([f'thigh.{sd}', f'shin.{sd}', f'foot.{sd}']), .5, .9)
        return (1-rc.smoothstep(dband, a.r0, a.r1))*leg

    robj = ac.Rig(R)
    mid = cb.evade_frame(robj, 3)
    full = tiptoe(robj, a.full_heel)
    ang = {}
    for tag, fr in (('mid', mid), ('full', full)):
        ang[tag] = {sd: rc.swing_deg(J, fr['pose'], f'foot.{sd}', B) for sd in 'LR'}
        print(tag, 'foot swing', {k: round(v, 2) for k, v in ang[tag].items()},
              'direction', {sd: round(rc.swing_direction(J, fr['pose'], f'foot.{sd}', HINGE, B), 3) for sd in 'LR'}, flush=True)
    masks = {sd: mask(sd) for sd in 'LR'}
    print('mask vertices', {sd: int((m > 1e-4).sum()) for sd, m in masks.items()}, flush=True)
    SM_REST = smooth(rest, a.fine)-smooth(rest, a.rounds) if a.fine else rest-smooth(rest, a.rounds)
    direction = dict(axis=HINGE, sign=1, band=band, note='fires only while the foot points (heel up), away from the shin')
    new_keys = []
    for gname, fr in (('ankle_point_mid', mid), ('ankle_point', full)):
        for sd in 'LR':
            k = dict(name=f'{gname}.{sd}', group=gname, bone=f'foot.{sd}', direction=direction,
                     pose='evade frame 3 (heels up 40 degrees)' if gname.endswith('mid') else f'on the toes, heels up {a.full_heel:g} degrees')
            if gname == 'ankle_point_mid':
                k.update(rise=[3., float(ang['mid'][sd])], fall=float(ang['full'][sd]))
            else:
                k.update(rise=[float(ang['mid'][sd]), float(ang['full'][sd])], fall=None)
            new_keys.append(k)
        P, Rv, vals = rc.posed_skin(rest, idx, w, J, fr['pose'], fr['lift'], keys=keys+new_keys[:-2], deltas=deltas)
        base = smooth(P, a.rounds)
        if a.relax:
            m_all = np.maximum(masks['L'], masks['R'])
            sel = np.where(m_all > 1e-4)[0]
            As = A[sel]
            lap = smooth(rest, a.rounds)
            lap = lap-A@lap
            Qv = quats(Rv)
            lq = (.6*m_all[sel])[:, None]
            for _ in range(300):
                Qv[sel] = (1-lq)*Qv[sel]+lq*(As@Qv)
            Qv /= np.linalg.norm(Qv, axis=1, keepdims=True)
            tl = np.einsum('nij,nj->ni', rc._qmat(Qv[sel]), lap[sel])
            lam = (.85*m_all[sel])[:, None]
            for _ in range(a.relax):
                base[sel] = (1-lam)*base[sel]+lam*(As@base+tl)
        target = base+np.einsum('nij,nj->ni', Rv, SM_REST)
        dR = np.einsum('nji,nj->ni', Rv, target-P)
        for sd in 'LR':
            key = next(k for k in new_keys if k['name'] == f'{gname}.{sd}')
            v = rc.key_value(J, fr['pose'], key, B)
            part = dR*masks[sd][:, None]/max(v, 1e-6)
            ids = np.where(np.linalg.norm(part, axis=1) > 1e-6)[0]
            deltas[key['name']] = (ids, part[ids])
            mv = np.linalg.norm(dR*masks[sd][:, None], axis=1)
            print(f'{key["name"]:20s} value {v:.3f} rise {[round(x, 1) for x in key["rise"]]} fall {key["fall"] and round(key["fall"], 1)}: '
                  f'{len(ids)} vertices, max move {mv.max()*1000:.1f} mm', flush=True)
    keys_out = keys+new_keys

    def report_bake(path):
        frames = json.loads(Path(path).read_text())
        mush = [k for k in keys_out if k['name'].startswith('ankle_mush')]
        old = [dict(k, direction=None) for k in mush]
        changed = 0
        maxnew = 0.
        for fr in frames:
            a_ = [rc.key_value(J, fr['pose'], k, B) for k in mush]
            b_ = [rc.key_value(J, fr['pose'], k, B) for k in old]
            changed += int(any(x != y for x, y in zip(a_, b_)))
            maxnew = max([maxnew]+[rc.key_value(J, fr['pose'], k, B) for k in new_keys])
        return dict(frames=len(frames), frames_with_ankle_mush_values_changed=changed, pointed_key_value_max=round(maxnew, 4))
    rep = dict(params={k: (str(v) if isinstance(v, Path) else v) for k, v in vars(a).items()}, swingDeg=ang, keys=new_keys,
               directionKeys=[k['name'] for k in keys_out if k.get('direction')],
               maskVertices={sd: int((masks[sd] > 1e-4).sum()) for sd in 'LR'},
               clips={str(Path(b).parent.name): report_bake(b) for b in a.check_bakes.split(',') if b})
    print(json.dumps(rep['clips']), flush=True)
    if not a.dry_run:
        np.savez_compressed(R/'correctives.npz', **{f'{k}__ids': v[0] for k, v in deltas.items()},
                            **{f'{k}__delta': v[1].astype(np.float32) for k, v in deltas.items()})
        outj = dict(base_json)
        outj['keys'] = keys_out
        (R/'correctives.json').write_text(json.dumps(outj, indent=1))
        (R/'ankle-corrective.json').write_text(json.dumps(rep, indent=1, default=str))
        print('wrote', len(keys_out), 'keys', flush=True)


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('cmd', choices=['poses', 'build'])
    p.add_argument('rig', type=Path)
    p.add_argument('rest', type=Path, nargs='?')
    p.add_argument('--out', type=Path)
    p.add_argument('--rounds', type=int, default=40)
    p.add_argument('--fine', type=int, default=0)
    p.add_argument('--r0', type=float, default=.025)
    p.add_argument('--r1', type=float, default=.06)
    p.add_argument('--relax', type=int, default=0)
    p.add_argument('--band', default='.1,.4')
    p.add_argument('--full-heel', type=float, default=60.)
    p.add_argument('--check-bakes', default='')
    p.add_argument('--dry-run', action='store_true')
    a = p.parse_args()
    if a.cmd == 'poses':
        a.out = a.out or a.rest
        cmd_poses(a)
    else:
        cmd_build(a)
