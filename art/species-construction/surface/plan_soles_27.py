"""Step 27 plan, from saved evidence (no Blender): the isolated sole strands.
A sole strand (roots below z -.91, facing down, solef > .5, as build_fix_27) is a
groove spike when it has fewer than 8 active roots within 5 mm and lies more than
4 mm from any dense sole strand or any non-sole strand, so the dense fringe and
the heel tuft are never selected. These are culled (zero radius) by build_fix_27.
  python plan_soles_27.py <surface dir> <out.npy>
"""
import sys
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree

surface, out = Path(sys.argv[1]), sys.argv[2]
d = np.load(surface / 'r/evidence.npz')
act = np.load(surface / 'r/collision-evidence.npz')['active']
r, co, sf = d['roots'], d['co'], d['attr_solef']
n = d['curve_nrm'] / np.linalg.norm(d['curve_nrm'], axis=1, keepdims=True)
_, vi = cKDTree(co).query(r)
m = act & (r[:, 2] < -.91) & (n[:, 2] < -.25) & (sf[vi] > .5)
q = np.where(m)[0]
k = np.array([len(x) - 1 for x in cKDTree(r[act]).query_ball_point(r[q], .005)])
dense = np.r_[r[q[k >= 8]], r[act & ~m]]
dd, _ = cKDTree(dense).query(r[q])
ids = q[(k < 8) & (dd > .004)].astype(np.int32)
np.save(out, ids)
print('SOLE_SPIKES', len(ids), 'of', len(q))
