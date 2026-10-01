"""Where did a rebuilt body move away from its baseline? (neighbour check without assembling)

  python art/species-construction/loop/mesh_delta.py <baseline verts.npz> <candidate verts.npz> [--min .003]

Both are rig_dump.py outputs of the body components. Reports, per coarse cell of the figure, the largest distance
from a candidate vertex to the nearest baseline vertex (a mesh pitch of .0025 means noise below about .004),
and the cells above --min, so side effects outside the arm show up as numbers before the packet diff does.
"""
import argparse
import sys
from pathlib import Path

import numpy as np
from scipy.spatial import cKDTree

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import loop_tools as lt  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument('base'); p.add_argument('cand'); p.add_argument('--min', type=float, default=.003)
a = p.parse_args()
b, _, _ = lt.load_dump(a.base)
c, _, _ = lt.load_dump(a.cand)
tb, tc = cKDTree(b), cKDTree(c)
d_cb, _ = tb.query(c)
d_bc, _ = tc.query(b)
pts = np.concatenate([c, b]); dist = np.concatenate([d_cb, d_bc])
cell = .05
keys = np.floor(pts/cell).astype(int)
rows = {}
for k, d, q in zip(map(tuple, keys), dist, pts):
    r = rows.setdefault(k, [0., q])
    if d > r[0]:
        r[0], r[1] = d, q
big = sorted(((v[0], k, v[1]) for k, v in rows.items() if v[0] > a.min), reverse=True)
print(f'vertices {len(c)} vs {len(b)}; max {dist.max():.4f}; cells above {a.min}: {len(big)}')
for d, k, q in big[:40]:
    print(f'  {d:.4f} at x {q[0]:+.3f} y {q[1]:+.3f} z {q[2]:+.3f}')
