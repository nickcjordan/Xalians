"""Clear a region of a grid's solid so authored parts can replace it (experiment X33, Hypnopet head rebuild).

    python art/studio/recon/grid_clear.py --grid <grid.npz> --out <grid.npz>
        --ellipsoid cx,cy,cz,rx,ry,rz [--fade 0.25] [--protect <mask.npz> ...] [--floor 0.03]

Inside the ellipsoid (normalized radius r < 1 - fade) every voxel is pushed outside the solid; across the fade band
(1 - fade < r < 1) the push falls off smoothly, so the cut boundary is a soft shoulder rather than a wall; outside
it the grid is unchanged. Each --protect mask (grid_mask.py, a 0..1 weight on the same lattice) keeps its piece
untouched in proportion to its weight (the ears, which grow out of the head being cleared). The field becomes
(1 - w) * f + w * max(f, floor): outside wherever w = 1, unchanged where w = 0, and in the fade band the surface
moves inward to where w = depth / (depth + floor), so the cleared part is empty space the authored parts fill. Why: the reconstruction's own cheeks, jaw and skull carried lumps and a jowl 2.8 cm too wide
each side, and pieces added on top could only add volume, never take it away.
"""
import argparse
import json
from pathlib import Path

import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('--grid', type=Path, required=True)
ap.add_argument('--out', type=Path, required=True)
ap.add_argument('--ellipsoid', required=True)
ap.add_argument('--fade', type=float, default=0.25)
ap.add_argument('--protect', type=Path, nargs='*', default=[])
ap.add_argument('--floor', type=float, default=0.03)
a = ap.parse_args()
z = np.load(a.grid)
origin, voxel, vals = np.asarray(z['origin'], float), float(z['voxel']), np.asarray(z['values'], np.float32)
c = np.array([float(t) for t in a.ellipsoid.split(',')])
cen, rad = c[:3], c[3:]
ax = [origin[k]+np.arange(vals.shape[k])*voxel for k in range(3)]
X, Y, Z = np.meshgrid(*ax, indexing='ij')
r = np.sqrt(((X-cen[0])/rad[0])**2+((Y-cen[1])/rad[1])**2+((Z-cen[2])/rad[2])**2)
t = np.clip((1.0-r)/max(a.fade, 1e-6), 0.0, 1.0)
w = t*t*(3-2*t)
for p in a.protect:
    m = np.load(p)
    if m['values'].shape != vals.shape or not np.allclose(np.asarray(m['origin'], float), origin):
        raise SystemExit(f'{p} is not on the same lattice as {a.grid}')
    w = w*(1.0-np.clip(m['values'], 0.0, 1.0))
out = ((1.0-w)*vals+w*np.maximum(vals, a.floor)).astype(np.float32)
record = json.dumps({'grid': str(a.grid), 'ellipsoid': a.ellipsoid, 'fade': a.fade,
                     'protect': [str(p) for p in a.protect], 'floor': a.floor})
np.savez_compressed(a.out, origin=origin, voxel=np.float64(voxel), values=out, record=record)
print('wrote', a.out, 'cleared', int(((vals < 0) & (out >= 0)).sum()), 'voxels')
