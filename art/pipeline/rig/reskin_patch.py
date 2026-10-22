"""B-sntv sculpt patches (critic S1, S2): vertex moves only, no topology change.

python reskin_patch.py BODY.npz PATCH.npz REPORT.json
Right-side patches that are rough where the left side is clean (S1 the crumpled right hip, S2 the right hind cannon
facet) are pulled onto the mirrored left surface (mean of the 8 nearest mirrored left vertices), with a weight that
follows the asymmetric roughness, spread and feathered over the surface so there is no seam.
"""
import sys, json
import numpy as np
from scipy.spatial import cKDTree

d = np.load(sys.argv[1]); co = d['co']; E = d['E']; nrm = d['nrm']; n = len(co)
deg = np.bincount(E.ravel(), minlength=n).astype(float)


def nb_mean(a):
    t = np.zeros_like(a); np.add.at(t, E[:, 0], a[E[:, 1]]); np.add.at(t, E[:, 1], a[E[:, 0]])
    return t / (deg if a.ndim == 1 else deg[:, None])


rough = np.abs(((co - nb_mean(co)) * nrm).sum(1))
for _ in range(3): rough = 0.5 * rough + 0.5 * nb_mean(rough)
mir = co * [-1, 1, 1]
tree = cKDTree(co); dd, j = tree.query(mir)
asym = rough - rough[j]
right = co[:, 0] < -0.012
t0, t1 = np.percentile(asym, 99.0), np.percentile(asym, 99.8)
w = np.where(right, np.clip((asym - t0) / (t1 - t0), 0, 1), 0.0)
# limit to the hind quarter and hind leg (S1 hip, S2 cannon); not the head or forelegs
w *= (co[:, 1] > 0.08)
for _ in range(25): w = np.maximum(w, 0.85 * nb_mean(w))      # spread
for _ in range(15): w = 0.5 * w + 0.5 * nb_mean(w)            # feather
w = np.clip(w * 1.5, 0, 1) * right
_, jj = tree.query(mir, k=8)
target = (co[jj].mean(1)) * [-1, 1, 1]
new = co + w[:, None] * (target - co)
# relax the patched band a little so the old and new surfaces meet smoothly
band = w > 0.01
for _ in range(4):
    nm = nb_mean(new); new[band] = new[band] + 0.5 * (w[band] * (1 - w[band]) * 4)[:, None] * (nm[band] - new[band])
idx = np.nonzero(band)[0]
mv = np.linalg.norm(new[idx] - co[idx], axis=1)
np.savez_compressed(sys.argv[2], idx=idx, co=new[idx])
rep = dict(vertices=int(len(idx)), full_weight=int((w > 0.99).sum()), max_move_mm=float(mv.max() * 1000), mean_move_mm=float(mv.mean() * 1000),
           bbox=[co[idx].min(0).tolist(), co[idx].max(0).tolist()], mirror_gap_mm_median=float(np.median(dd[idx]) * 1000))
json.dump(rep, open(sys.argv[3], 'w'), indent=1)
print('PATCH', rep)
