"""Front-view face widths of raw reconstructions, to rank them before any join (experiment X29).

    <python with trimesh> art/studio/recon/raw_face_widths.py <run dir> [<run dir> ...] [--eye-z 0.436]

Each run's shape.glb is brought into the studio frame (as recon_scene.py does), its front silhouette rasterized at
1 mm, and the run of the silhouette through x = 0 measured at the eye height and at 0.21, 0.33 and 0.45 W below it
(W = the width at the eye height), the rows face_fit.py uses. The sheet: 1.02, 0.87 and 0.54 W. Only surface
forward of y = -0.165 counts, so the ears (hanging along the head, farther back) stay out of the silhouette.
"""
import argparse
import json
from pathlib import Path

import numpy as np
import trimesh
from scipy import ndimage

SHEET = {0.21: 1.02, 0.33: 0.87, 0.45: 0.54}
FACE_Y = -0.165


def silhouette(path):
    m = trimesh.load(path, force='mesh')
    v = np.asarray(m.vertices, float)
    v = np.stack([v[:, 0], -v[:, 2], v[:, 1]], 1)
    lo, hi = v.min(0), v.max(0)
    s = 0.658/(hi[2]-lo[2])
    v = (v-[(lo[0]+hi[0])/2, (lo[1]+hi[1])/2, lo[2]])*s+[0, 0.005, 0]
    mesh = trimesh.Trimesh(v, m.faces, process=False)
    pts, _ = trimesh.sample.sample_surface_even(mesh, 600000, seed=3)
    pts = pts[pts[:, 1] < FACE_Y]                # the face only: the hanging ears sit farther back
    px = 0.001
    ix = np.round((pts[:, 0]+0.3)/px).astype(int)
    iz = np.round(pts[:, 2]/px).astype(int)
    sil = np.zeros((int(0.7/px)+2, int(0.6/px)+2), bool)
    sil[iz, ix] = True
    sil = ndimage.binary_fill_holes(ndimage.binary_closing(sil, iterations=2))
    return sil, px


def width(sil, px, z):
    row = sil[int(round(z/px))]
    mid = int(round(0.3/px))
    if not row[mid]:
        return 0.0
    l = r = mid
    while l > 0 and row[l-1]:
        l -= 1
    while r < len(row)-1 and row[r+1]:
        r += 1
    return (r-l+1)*px


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('runs', nargs='+', type=Path)
    ap.add_argument('--eye-z', type=float, default=0.436)
    args = ap.parse_args()
    out = {}
    for run in args.runs:
        sil, px = silhouette(run/'shape.glb')
        W = width(sil, px, args.eye_z)
        row = {'W': round(W, 4)}
        for k, t in SHEET.items():
            row[f'{k}'] = round(width(sil, px, args.eye_z-k*W)/W, 3)
        row['offSheet'] = round(float(np.sqrt(np.mean([(row[f'{k}']-t)**2 for k, t in SHEET.items()]))), 3)
        out[run.name] = row
        print(run.name, json.dumps(row))


if __name__ == '__main__':
    main()
