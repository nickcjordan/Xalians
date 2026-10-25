"""Akinza game mesh pass 1: how the shaved game mesh's silhouette differs from the furred sprites (numbers, an overlay).

  python art/species-construction/anim/gamemesh_furgap.py <work dir> <rig dir> <bake dir> <sprites dir> <out dir>
      [--correctives FILE]

For idle frame 0 and the deepest Night Stalk frame: the game mesh posed as the glb plays it, projected into the 192 px
sprite cell (side_left; the cell scale and offset fit on the head socket, gamemesh_checks.py), rasterized with one
label per region (strongest bone), against the approved furred atlas frame's alpha (alpha > 0.5) placed at its offset.
Per region: the sprite pixels outside the mesh nearest that region (the fur beyond the skin), and how far they reach
past the mesh's outline (max and p95, px), plus the mesh pixels the fur does not cover. Writes <out>/furgap.json and
<out>/furgap-<frame>.png (sprite alpha gray, mesh outline amber, scaled 3x).
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE))
import rig_core as rc  # noqa: E402
import gamemesh_glb as gg  # noqa: E402

REGIONS = ['ears', 'head', 'arms', 'legs', 'feet', 'tails', 'trunk']


def region(b):
    bb = rc.base_of(b)
    return ('ears' if b.startswith('ear_') else 'head' if bb in ('head', 'jaw', 'neck') else
            'arms' if bb in ('clavicle', 'upperarm', 'forearm', 'hand') else 'legs' if bb in ('thigh', 'shin', 'hip', 'glute') else
            'feet' if bb == 'foot' else 'tails' if b.startswith('tail_') and b != 'tail_root' else 'trunk')


def main():
    p = argparse.ArgumentParser()
    for k in ('work', 'rig', 'bake', 'sprites', 'out'):
        p.add_argument(k, type=Path)
    p.add_argument('--correctives', type=Path, default=None)
    a = p.parse_args()
    rig, J, s, off = gg.load_rig(a.rig)
    G = np.load(a.work/'gamemesh.npz', allow_pickle=True)
    corr = np.load(a.correctives, allow_pickle=True) if a.correctives else None
    cn = [str(x) for x in corr['names']] if corr is not None else []
    frames = gg.clip_frames(a.bake)
    atlas = json.loads((a.sprites/'atlas'/'manifest.json').read_text())
    facts = json.loads((a.work/'akinza.raw.glb.facts.json').read_text())
    # cell mapping from the head socket (as gamemesh_checks.py)
    hy, hz, ax, ay = [], [], [], []
    for clip, n in (('idle', 90), ('sig.night-stalk', 45)):
        fs = atlas['clips'][clip]['facings']['side']['frames']
        for k in range(n):
            hy.append(facts['sockets'][clip][k]['head'][1])
            hz.append(facts['sockets'][clip][k]['head'][2])
            ax.append(fs[k]['sockets']['head'][0])
            ay.append(fs[k]['sockets']['head'][1])
    hy, hz = np.array(hy), np.array(hz)
    A = np.c_[np.r_[hy, -hz], np.r_[np.ones_like(hy), np.zeros_like(hy)], np.r_[np.zeros_like(hy), np.ones_like(hy)]]
    (kk, bx, by), *_ = np.linalg.lstsq(A, np.r_[ax, ay], rcond=None)
    stalk = frames['sig.night-stalk']
    deep = int(np.argmin([rc.lift_vec(f['lift'])[2] for f in stalk[:45]]))
    out = dict(cellPxPerM=round(float(kk), 4), frames={})
    a.out.mkdir(parents=True, exist_ok=True)
    cell = atlas['cell']['w']
    S = 8                                                   # supersampled raster, then box down to the cell
    for clip, k, tag in (('idle', 0, 'idle-0'), ('sig.night-stalk', deep, f'night-stalk-{deep}')):
        fr = frames[clip][k]
        T = gg.frame_T(J, fr)
        lab = Image.new('L', (cell*S, cell*S), 0)
        dr = ImageDraw.Draw(lab)
        for pr in [str(x) for x in G['prims']]:
            x = s*(G[pr+'_pos'].astype(np.float64)-off)
            sh = fr.get('shapes', {})
            x = x+sh.get('breath', 0.)*G[pr+'_breath']+sh.get('breath_belly', 0.)*G[pr+'_breath_belly']
            for j, n in enumerate(cn):
                x = x+corr[f'weights__{clip}'][k, j]*corr[f'{pr}__{n}']
            ww = G[pr+'_ww'].astype(float)
            ww /= ww.sum(1, keepdims=True)
            wj = G[pr+'_wj'].astype(int)
            X = rc.skin_points(x, wj, ww, T, rc.ANIM_BONES)
            u = (kk*X[:, 1]+bx)*S
            v = (-kk*X[:, 2]+by)*S
            reg = np.array([REGIONS.index(region(rc.ANIM_NAMES[b]))+1 for b in wj[np.arange(len(wj)), np.argmax(ww, 1)]])
            I = G[pr+'_idx'].astype(int)
            depth = X[I, 0].mean(1)                          # draw far side first (camera on +X)
            for t in np.argsort(depth):
                tri = I[t]
                dr.polygon([(u[i], v[i]) for i in tri], fill=int(reg[tri[0]]))
        L = np.asarray(lab)
        # cell-resolution mesh coverage and labels
        cov = (L > 0).reshape(cell, S, cell, S).mean((1, 3)) > .5
        counts = np.stack([(L == r).reshape(cell, S, cell, S).sum((1, 3)) for r in range(1, len(REGIONS)+1)])
        lab_c = np.where(counts.sum(0) > 0, counts.argmax(0)+1, 0)
        # sprite alpha in the cell
        fs = atlas['clips'][clip]['facings']['side']['frames'][k]
        sheet = Image.open(a.sprites/'atlas'/atlas['clips'][clip]['facings']['side']['sheet']).convert('RGBA')
        crop = np.asarray(sheet.crop((fs['x'], fs['y'], fs['x']+fs['w'], fs['y']+fs['h'])))[..., 3]
        alpha = np.zeros((cell, cell))
        ox, oy = fs['offset']
        alpha[oy:oy+fs['h'], ox:ox+fs['w']] = crop/255.
        spr = alpha > .5
        dist, (iy, ix) = ndimage.distance_transform_edt(~cov, return_indices=True)
        near = lab_c[iy, ix]
        res = {}
        for r, name in enumerate(REGIONS, 1):
            fur = spr & ~cov & (near == r)
            bare = cov & ~spr & (lab_c == r)
            d = dist[fur]
            res[name] = dict(furOutsideMeshPx=int(fur.sum()), furReachMaxPx=round(float(d.max()), 2) if len(d) else 0.,
                             furReachP95Px=round(float(np.quantile(d, .95)), 2) if len(d) else 0., meshNotUnderFurPx=int(bare.sum()),
                             meshPx=int((cov & (lab_c == r)).sum()))
        res['all'] = dict(spritePx=int(spr.sum()), meshPx=int(cov.sum()), spriteOnlyPx=int((spr & ~cov).sum()), meshOnlyPx=int((cov & ~spr).sum()))
        out['frames'][tag] = res
        # overlay, 3x
        img = np.zeros((cell, cell, 3), np.uint8)
        img[...] = (24, 26, 30)
        img[spr] = (150, 156, 166)
        edge = cov & ~ndimage.binary_erosion(cov)
        img[edge] = (242, 179, 61)
        Image.fromarray(img).resize((cell*3, cell*3), Image.NEAREST).save(a.out/f'furgap-{tag}.png')
    (a.out/'furgap.json').write_text(json.dumps(out, indent=1))
    print(json.dumps(out, indent=1))


if __name__ == '__main__':
    main()
