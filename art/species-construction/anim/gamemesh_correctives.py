"""Akinza game mesh pass 1: how far plain linear skinning (what a glTF player does) sits from the sprite poses, and,
when that difference shows at a normal framing, corrective morph targets that remove it.

  python art/species-construction/anim/gamemesh_correctives.py <work dir> <rig dir> <bake dir> [--build] [--max-k 6]

The sprites pose the skin with dual quaternions plus the rig's 24 corrective keys driven by swing angles, after the
breath keys (clip_frames.py, rig_core.posed_skin). A glTF player blends the joint matrices linearly and adds morph
targets before skinning. Measured, per region (strongest bone), at the deepest Night Stalk frame (the lowest hips),
at the idle ear flick's peak and at the Night Stalk ear sweep's peak (largest ear_1 swing):
  * on the source skin (621,482 vertices): plain = linear skinning of the rest plus breath; sprite = posed_skin;
  * on the game mesh: the same two, with the corrective and breath deltas the decimation carried.
Distances in mm (rig metres), the full 3D distance and the part in the side camera's image plane, also in pixels at
the 720 px side framing (the clips' review camera, about 2.28 mm a pixel) and at the 192 px sprite (9.15 mm a pixel).

--build (used when a region's side-plane difference reaches 1 px at 720): for every frame of both clips, the
residual sprite - plain on the game mesh pulled back into bind space through each vertex's blended linear part
(so a morph delta added before skinning lands exactly on it), stacked over frames; its leading singular vectors
(uncentered, the rest pose has none) become morph targets `corrective_1..K` and each frame's least-squares
coefficients their animated weights. K grows until the largest remaining side-plane residual over every frame is
under 1 px at 720, up to --max-k. Writes <work>/correctives.npz and <work>/plain-vs-sprite.json.
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
import rig_core as rc  # noqa: E402
import akinza_clips as ac  # noqa: E402
import gamemesh_glb as gg  # noqa: E402

BOX = [-0.5375, -0.5567, -0.987, 0.6738, 0.7639, 0.932]      # clips4 / sprites1 720 px side box, source units


def region_names():
    out = {}
    for b in rc.ANIM_NAMES:
        bb = rc.base_of(b)
        out[b] = ('ears' if b.startswith('ear_') else 'head' if bb in ('head', 'jaw', 'neck') else
                  'arms' if bb in ('clavicle', 'upperarm', 'forearm', 'hand') else 'legs' if bb in ('thigh', 'shin', 'hip', 'glute') else
                  'feet' if bb == 'foot' else 'tails' if b.startswith('tail_') and b != 'tail_root' else 'trunk')
    return out


def main():
    p = argparse.ArgumentParser()
    p.add_argument('work', type=Path)
    p.add_argument('rig', type=Path)
    p.add_argument('bake', type=Path)
    p.add_argument('--build', action='store_true')
    p.add_argument('--max-k', type=int, default=6)
    a = p.parse_args()
    rig, J, s, off = gg.load_rig(a.rig)
    to_m = lambda X: s*(np.asarray(X, float)-off)
    ortho = max(BOX[4]-BOX[1], BOX[5]-BOX[2])*1.08
    mm_per_px720 = ortho*s*1000/720
    mm_per_px192 = 1000/gg.PX_PER_M
    REG = region_names()
    frames = gg.clip_frames(a.bake)
    wt = np.load(a.rig/'weights.npz')
    idx = wt['idx'].astype(int)
    w = np.round(wt['w'].astype(np.float64)*4096)/4096
    w /= w.sum(1, keepdims=True)
    KEYS = json.loads((a.rig/'correctives.json').read_text())['keys']
    cz = np.load(a.rig/'correctives.npz')
    DELTAS = {k['name']: (cz[k['name']+'__ids'], cz[k['name']+'__delta'].astype(np.float64)) for k in KEYS}
    SH = ac.load_shapes(a.bake)
    src = np.load(a.work/'source.npz')
    REST = to_m(src['verts'].astype(np.float64))
    src_reg = np.array([REG[rc.ANIM_NAMES[i]] for i in idx[:, 0]])
    G = np.load(a.work/'gamemesh.npz', allow_pickle=True)
    gpos = to_m(G['body_pos'])
    gwj, gww = G['body_wj'].astype(int), G['body_ww'].astype(float)
    gww = gww/gww.sum(1, keepdims=True)
    gshapes = {'breath': G['body_breath'].astype(float), 'breath_belly': G['body_breath_belly'].astype(float)}
    gcorr = {k['name']: G['body_corr_'+k['name']].astype(float) for k in KEYS}
    g_reg = np.array([REG[rc.ANIM_NAMES[i]] for i in gwj[np.arange(len(gwj)), np.argmax(gww, 1)]])

    def game_rest_shapes(fr):
        x = gpos.copy()
        for k, d in gshapes.items():
            x += fr.get('shapes', {}).get(k, 0.)*d
        return x

    def game_sprite(fr, T):
        x = game_rest_shapes(fr)
        vals = rc.corrective_values(J, fr['pose'], KEYS, rc.ANIM_BONES)
        for k in KEYS:
            if vals[k['name']] > 0:
                x += vals[k['name']]*gcorr[k['name']]
        return rc.skin_points_dq(x, gwj, gww, T, rc.ANIM_BONES)[0]

    def game_plain(fr, T):
        return rc.skin_points(game_rest_shapes(fr), gwj, gww, T, rc.ANIM_BONES)

    def stats(D, reg):
        side = np.linalg.norm(D[:, 1:], axis=1)*1000         # side camera looks along x: the image plane is y, z
        full = np.linalg.norm(D, axis=1)*1000
        out = {}
        for r in sorted(set(reg)):
            m = reg == r
            out[r] = dict(max3dMm=round(float(full[m].max()), 2), p99_3dMm=round(float(np.quantile(full[m], .99)), 2),
                          maxSideMm=round(float(side[m].max()), 2), maxSidePx720=round(float(side[m].max()/mm_per_px720), 2),
                          maxSidePx192=round(float(side[m].max()/mm_per_px192), 2))
        return out

    stalk = frames['sig.night-stalk']
    deep = int(np.argmin([rc.lift_vec(f['lift'])[2] for f in stalk[:45]]))
    ear = lambda f: rc.swing_deg(J, f['pose'], 'ear_1.L', rc.ANIM_BONES)
    idle_ear = int(np.argmax([ear(f) for f in frames['idle'][:90]]))
    stalk_ear = int(np.argmax([ear(f) for f in stalk[:45]]))
    probes = [('sig.night-stalk', deep, 'deepest crouch (lowest hips)'), ('idle', idle_ear, 'idle ear flick peak'),
              ('sig.night-stalk', stalk_ear, 'Night Stalk ear sweep peak')]
    report = dict(mmPerPx720=round(mm_per_px720, 3), mmPerPx192=round(mm_per_px192, 3), probes=[])
    for c, k, label in probes:
        fr = frames[c][k]
        T = gg.frame_T(J, fr)
        base = ac.apply_shapes(REST, fr, SH)
        sprite = rc.posed_skin(base, idx, w, J, fr['pose'], fr['lift'], KEYS, DELTAS, rc.ANIM_BONES)[0]
        plain = rc.skin_points(base, idx, w, T, rc.ANIM_BONES)
        Dg = game_sprite(fr, T)-game_plain(fr, T)
        report['probes'].append(dict(clip=c, frame=k, label=label, earSwingDeg=round(ear(fr), 2),
                                     source=stats(sprite-plain, src_reg), game=stats(Dg, g_reg)))
        print(label, c, k, json.dumps(report['probes'][-1]['source']), flush=True)
    visible = any(v['maxSidePx720'] >= 1. for pr in report['probes'] for v in pr['source'].values())
    report['visibleAt720'] = visible
    report['rule'] = 'a difference counts as visible at a normal framing when any region moves 1 px or more in the side image plane at the 720 px side framing'

    if a.build:
        rows, Minv, plains, sprites = [], [], [], []
        order = []
        for c, fl in frames.items():
            for k, fr in enumerate(fl):
                T = gg.frame_T(J, fr)
                pl = game_plain(fr, T)
                sp = game_sprite(fr, T)
                Rs = np.stack([T[b][0] for b in rc.ANIM_NAMES])
                M = np.einsum('nk,nkij->nij', gww, Rs[gwj])          # blended linear part per vertex
                r = np.linalg.solve(M, (sp-pl)[..., None])[..., 0]
                rows.append(r.ravel())
                Minv.append(M)
                order.append((c, k))
        A = np.array(rows)                                         # frames x 3n
        U, S, Vt = np.linalg.svd(A, full_matrices=False)
        chosen = None
        hist = []
        for K in range(1, a.max_k+1):
            basis = Vt[:K]
            coef = A@basis.T
            worst = 0.
            for (c, k), M, row, cf in zip(order, Minv, A, coef):
                rec = (cf@basis).reshape(-1, 3)
                err = np.einsum('nij,nj->ni', M, row.reshape(-1, 3)-rec)
                worst = max(worst, float(np.linalg.norm(err[:, 1:], axis=1).max()*1000))
            hist.append(dict(K=K, worstSideMm=round(worst, 3), worstSidePx720=round(worst/mm_per_px720, 3),
                             energyShare=round(float((S[:K]**2).sum()/(S**2).sum()), 6)))
            print('K', hist[-1], flush=True)
            chosen = K
            if worst/mm_per_px720 < 1.:
                break
        basis = Vt[:chosen].copy()
        coef = A@basis.T
        scale = np.abs(coef).max(0)                              # weights in [-1, 1], the delta carries the size
        basis *= scale[:, None]
        coef /= scale[None]
        names = [f'corrective_{i+1}' for i in range(chosen)]
        arrays = dict(names=np.array(names))
        n_body = len(gpos)
        n_eyes = len(G['eyes_pos'])
        for i, nm in enumerate(names):
            arrays[f'body__{nm}'] = basis[i].reshape(-1, 3)
            arrays[f'eyes__{nm}'] = np.zeros((n_eyes, 3))
        for c in frames:
            arrays[f'weights__{c}'] = np.array([coef[j] for j, (cc, k) in enumerate(order) if cc == c])
        np.savez_compressed(a.work/'correctives.npz', **arrays)
        report['correctives'] = dict(K=chosen, history=hist, names=names, bodyVertices=n_body,
                                     weightRange=[float(coef.min()), float(coef.max())])
    (a.work/'plain-vs-sprite.json').write_text(json.dumps(report, indent=1))
    print('CORRECTIVES_DONE visible', visible, flush=True)


if __name__ == '__main__':
    main()
