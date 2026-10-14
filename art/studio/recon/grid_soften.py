"""Soften a reconstruction grid locally: a heavy blur inside given spheres, faded into the untouched field.

    python art/studio/recon/grid_soften.py --grid <grid.npz> --out <grid.npz> --at x,y,z,radius,sigma [--at ...]
        [--mirror-x] [--below z,fade,sigma]

Each --at is a sphere (center and radius in meters) and a blur width (sigma, meters). Inside the sphere the
field is the blurred one, fading back to the original over the outer third of the radius. A blurred distance
field loses its small bumps and ridges while large forms stay put, so this flattens a feature the reconstruction
invented (the closed eye mounds with their raised skirts, which read as goggles once the studio's eyes are
seated) without editing the mesh. --mirror-x also softens each sphere's reflection through x = 0.
--below softens a whole horizontal slab instead: full blur below height z, fading out over the next `fade`
meters (the jagged cut edge grid_plate.py leaves around the feet). Experiments X29, X32.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from scipy import ndimage


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--grid', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--at', action='append', default=[])
    ap.add_argument('--below')
    ap.add_argument('--mirror-x', action='store_true')
    args = ap.parse_args()

    z = np.load(args.grid)
    origin, voxel, vals = np.asarray(z['origin'], float), float(z['voxel']), np.asarray(z['values'], np.float32)
    record = json.loads(str(z['record'])) if 'record' in z.files else {}
    spheres = []
    for a in args.at:
        x, y, zc, r, s = (float(t) for t in a.split(','))
        spheres.append((x, y, zc, r, s))
        if args.mirror_x and x != 0:
            spheres.append((-x, y, zc, r, s))
    out = vals.copy()
    axes = [origin[i]+np.arange(vals.shape[i])*voxel for i in range(3)]
    for x, y, zc, r, s in spheres:
        lo = [max(0, int((c-r*1.2-o)/voxel)) for c, o in zip((x, y, zc), origin)]
        hi = [min(n, int((c+r*1.2-o)/voxel)+1) for c, n, o in zip((x, y, zc), vals.shape, origin)]
        pad = int(np.ceil(3*s/voxel))
        plo = [max(0, a-pad) for a in lo]
        phi = [min(n, b+pad) for b, n in zip(hi, vals.shape)]
        block = vals[plo[0]:phi[0], plo[1]:phi[1], plo[2]:phi[2]]
        blurred = ndimage.gaussian_filter(block, s/voxel)
        sl = tuple(slice(a-p, b-p) for a, b, p in zip(lo, hi, plo))
        X, Y, Z = np.meshgrid(axes[0][lo[0]:hi[0]], axes[1][lo[1]:hi[1]], axes[2][lo[2]:hi[2]], indexing='ij')
        d = np.sqrt((X-x)**2+(Y-y)**2+(Z-zc)**2)/r
        w = np.clip((1.0-d)/(1/3), 0.0, 1.0)            # 1 inside two thirds of the radius, 0 at the radius
        w = w*w*(3-2*w)
        cur = out[lo[0]:hi[0], lo[1]:hi[1], lo[2]:hi[2]]
        out[lo[0]:hi[0], lo[1]:hi[1], lo[2]:hi[2]] = (cur*(1-w)+blurred[sl]*w).astype(np.float32)
    below = None
    if args.below:
        zc, fade, s = (float(t) for t in args.below.split(','))
        top = min(vals.shape[2], int((zc+fade-origin[2])/voxel)+1)
        pad = int(np.ceil(3*s/voxel))
        block = vals[:, :, :min(vals.shape[2], top+pad)]
        blurred = ndimage.gaussian_filter(block, s/voxel)[:, :, :top]
        w = np.clip((zc+fade-axes[2][:top])/fade, 0.0, 1.0)
        w = (w*w*(3-2*w))[None, None, :]
        out[:, :, :top] = (out[:, :, :top]*(1-w)+blurred*w).astype(np.float32)
        below = [zc, fade, s]
    if not spheres and below is None:
        ap.error('give --at or --below')
    record['softened'] = {'from': str(args.grid), 'fromSha256': hashlib.sha256(args.grid.read_bytes()).hexdigest(),
                          'spheres': spheres, **({'below': below} if below else {})}
    np.savez_compressed(args.out, origin=origin, voxel=np.float64(voxel), values=out, record=json.dumps(record))
    print(json.dumps(record['softened']))


if __name__ == '__main__':
    main()
