"""A soft mask of one detached piece of a grid's solid (an ear blade, a tail), for region warps.

    python art/studio/recon/grid_mask.py --grid <grid.npz> --seed x,y,z --out <mask.npz>
        [--box x0,x1,y0,y1,z0,z1] [--dilate 0.005] [--smooth 0.002]

Flood-fills the inside voxels connected to the seed, inside the optional box (cut the piece off where it joins the
body, for example below an ear's root), grows the result by --dilate so the band of field around the surface comes
along, and blurs it by --smooth into a 0..1 weight on the same lattice. grid_warp.py takes it as a region
{"mask": <path>}. Why (experiment X33): a box or ellipsoid region cannot separate an ear blade from a haunch a
couple of centimeters away; connectivity can.
"""
import argparse
import json
from pathlib import Path

import numpy as np
from scipy import ndimage

ap = argparse.ArgumentParser()
ap.add_argument('--grid', type=Path, required=True)
ap.add_argument('--seed', required=True)
ap.add_argument('--out', type=Path, required=True)
ap.add_argument('--box')
ap.add_argument('--dilate', type=float, default=0.005)
ap.add_argument('--smooth', type=float, default=0.002)
a = ap.parse_args()
z = np.load(a.grid)
origin, voxel, vals = np.asarray(z['origin'], float), float(z['voxel']), np.asarray(z['values'], np.float32)
solid = vals < 0.8*voxel          # a band of a voxel: a thin rim stays connected to its plate
if a.box:
    x0, x1, y0, y1, z0, z1 = (float(t) for t in a.box.split(','))
    lo = np.floor((np.array([x0, y0, z0])-origin)/voxel).astype(int).clip(0)
    hi = np.ceil((np.array([x1, y1, z1])-origin)/voxel).astype(int)
    keep = np.zeros_like(solid)
    keep[lo[0]:hi[0], lo[1]:hi[1], lo[2]:hi[2]] = True
    solid &= keep
lab, n = ndimage.label(solid, structure=np.ones((3, 3, 3)))
seed = np.round((np.array([float(t) for t in a.seed.split(',')])-origin)/voxel).astype(int)
k = lab[tuple(seed)]
if k == 0:
    raise SystemExit(f'seed {a.seed} is not inside the solid')
piece = lab == k
grown = ndimage.binary_dilation(piece, iterations=max(1, int(round(a.dilate/voxel))))
weight = ndimage.gaussian_filter(grown.astype(np.float32), a.smooth/voxel)
np.savez_compressed(a.out, origin=origin, voxel=np.float64(voxel), values=weight.astype(np.float32),
                    record=json.dumps({'grid': str(a.grid), 'seed': a.seed, 'box': a.box, 'voxels': int(piece.sum())}))
print('wrote', a.out, int(piece.sum()), 'voxels in the piece')
