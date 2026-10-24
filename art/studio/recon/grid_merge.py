"""Merge a body grid and a finer head grid into one field by a weighted morph, not a smooth union.

    python art/studio/recon/grid_merge.py --spec <spec.json> --body body --head head --out <grid.npz>
        [--voxel 0.0015] [--inner 0.75]

Why (experiment X33, Hypnopet, critic item 9): the head grid was joined to the body grid with a clip ellipsoid and a
smooth union. Where two fields describe nearly the same surface, a smooth minimum inflates it by up to a quarter of
the blend radius, and the clip's edge leaves a crease; the critic found side lobes behind the ear roots and a crease
ring at the neck. A weighted morph between the two fields across a band has neither (the Akinza field-space lesson:
"a weighted morph between the native field and the new field across the joint leaves none").

The weight is 1 inside the head part's clip ellipsoid shrunk to --inner of its radii, falling smoothly to 0 at the
ellipsoid itself. The body is evaluated with its own clip and cuts (grid.py), the head without its clip. The output
covers the body grid's domain (for a mirrored body, its half) at --voxel and is used in the spec as one grid part.
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


def part(spec, name):
    p = next((p for p in spec['parts'] if p['part'] == name and p['kind'] == 'grid'), None)
    if p is None:
        sys.exit(f'no grid part {name!r}')
    return p


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--spec', type=Path, required=True)
    ap.add_argument('--body', default='body')
    ap.add_argument('--head', default='head')
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--voxel', type=float, default=0.0015)
    ap.add_argument('--inner', type=float, default=0.75)
    a = ap.parse_args()
    spec = json.loads(a.spec.read_text())
    body, head = part(spec, a.body), part(spec, a.head)
    bz = np.load(body['params']['file'])
    borigin, bvox, bshape = np.asarray(bz['origin'], float), float(bz['voxel']), np.array(bz['values'].shape)
    hi = borigin+bvox*(bshape-1)
    shape = np.floor((hi-borigin)/a.voxel).astype(int)+1
    axes = [borigin[i]+np.arange(shape[i])*a.voxel for i in range(3)]
    clip = head['params']['clip']
    hc, hr = np.asarray(clip['center'], float), np.asarray(clip['radii'], float)
    hparams = {k: v for k, v in head['params'].items() if k != 'clip'}
    out = np.empty(tuple(shape), np.float32)
    Y, Z = np.meshgrid(axes[1], axes[2], indexing='ij')
    for i in range(shape[0]):
        pts = np.stack([np.full(Y.size, axes[0][i]), Y.ravel(), Z.ravel()], axis=1)
        db = grid.sdf(body['params'], pts)
        e = np.linalg.norm((pts-hc)/hr, axis=1)
        t = np.clip((1.0-e)/(1.0-a.inner), 0.0, 1.0)
        w = t*t*(3-2*t)
        d = db
        m = w > 0
        if m.any():
            dh = grid.sample(hparams, pts[m])
            d = db.copy()
            d[m] = w[m]*dh+(1-w[m])*db[m]
        out[i] = np.minimum(d, 0.1).reshape(Y.shape)
    record = {'merged': {'body': body['params']['file'], 'bodySha256': body['params'].get('sha256'),
                         'bodyCuts': body['params'].get('cuts', []), 'head': head['params']['file'],
                         'headSha256': head['params'].get('sha256'), 'headClip': clip, 'inner': a.inner,
                         'voxel': a.voxel, 'spec': str(a.spec)}}
    a.out.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(a.out, origin=borigin, voxel=np.float64(a.voxel), values=out, record=json.dumps(record))
    print('wrote', a.out, out.shape, hashlib.sha256(a.out.read_bytes()).hexdigest()[:12])


if __name__ == '__main__':
    main()
