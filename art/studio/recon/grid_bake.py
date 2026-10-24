"""Bake a grid part's clip and cuts into a new grid, so later field edits (grid_soften.py) can smooth across a cut.

    python art/studio/recon/grid_bake.py --spec <spec.json> --part body --out <grid.npz>

Reads the first grid instance of that part in the spec, evaluates its signed distance (the grid sampled, the clip
ellipsoid intersected, every cut subtracted, exactly as art/studio/parts/grid.py does at build time) at the grid's
own lattice points, and writes an npz with the same origin, voxel and shape. Use the baked grid in the spec with
no cuts. Why (experiment X33, Hypnopet crown): a cut's smooth subtraction leaves a rounded rim where it meets the
surface; once baked, a local blur can round the rim into the surface around it.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from parts import grid  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--spec', type=Path, required=True)
    ap.add_argument('--part', required=True)
    ap.add_argument('--out', type=Path, required=True)
    a = ap.parse_args()
    spec = json.loads(a.spec.read_text())
    inst = next((p for p in spec['parts'] if p['part'] == a.part and p['kind'] == 'grid'), None)
    if inst is None:
        sys.exit(f'no grid part {a.part!r} in {a.spec}')
    params = inst['params']
    z = np.load(params['file'])
    origin, voxel, vals = np.asarray(z['origin'], float), float(z['voxel']), np.asarray(z['values'], np.float32)
    off = np.asarray(params.get('offset', (0, 0, 0)), float)
    axes = [origin[i]+off[i]+np.arange(vals.shape[i])*voxel for i in range(3)]
    out = np.empty_like(vals)
    for i in range(vals.shape[0]):                    # one x slab at a time keeps memory small
        Y, Z = np.meshgrid(axes[1], axes[2], indexing='ij')
        pts = np.stack([np.full(Y.size, axes[0][i]), Y.ravel(), Z.ravel()], axis=1)
        out[i] = grid.sdf(params, pts).reshape(Y.shape).astype(np.float32)
    out = np.minimum(out, 4*voxel*50)                 # far field stays far, without the BIG constant
    record = json.loads(str(z['record'])) if 'record' in z.files else {}
    record['baked'] = {'from': params['file'], 'fromSha256': hashlib.sha256(Path(params['file']).read_bytes()).hexdigest(),
                       'clip': params.get('clip'), 'cuts': params.get('cuts', []), 'spec': str(a.spec)}
    a.out.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(a.out, origin=origin+off, voxel=np.float64(voxel), values=out, record=json.dumps(record))
    print('wrote', a.out, out.shape)


if __name__ == '__main__':
    main()
