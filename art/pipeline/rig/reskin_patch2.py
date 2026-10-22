"""B-sntv pass 2 sculpt patches (critic S3, S5, S6, S7, S9, S11 and the hind cannon rings): vertex moves only.

python reskin_patch2.py BODY.npz PATCH1.npz WEIGHTS.npz PATCH2.npz REPORT.json
Starts from the pass 1 mirror patch (S1, S2), then blends feathered regions toward a Taubin-smoothed copy of the
surface (lambda 0.5 / mu -0.53, which removes ripples and seams without shrinking the form):
  cannons     hind cannons above the toes: the seam rings and ripple bands (critic 26, 27, 59, S3) and the hock drip (S9)
  forearms    forearms above the paws: ripple bands (36, S3) and the lumpy carpal pads (S4, pads only; dewclaws are objects)
  tail        tail skin: specks and blisters (S11)
  belly       midline underside bump (S5), flattened with a longer smoothing
  throat      bump below the jaw (S6), flattened with a longer smoothing
  brisket     lumpy, blotchy brisket surface (S7)
Not touched: S8 (haunch width is the approved silhouette), S10 (horn collar belongs to the horn seat), the toes and
pads under the claws (claw objects sit on them).
"""
import sys, json
import numpy as np

d = np.load(sys.argv[1]); co0 = d['co'].astype(float); E = d['E']; n = len(co0)
P1 = np.load(sys.argv[2]); co = co0.copy(); co[P1['idx']] = P1['co']
WZ = np.load(sys.argv[3]); W = WZ['W']; names = [str(x) for x in WZ['names']]
deg = np.bincount(E.ravel(), minlength=n).astype(float)


def nbm(X):
    t = np.zeros_like(X); np.add.at(t, E[:, 0], X[E[:, 1]]); np.add.at(t, E[:, 1], X[E[:, 0]])
    return t / (deg if X.ndim == 1 else deg[:, None])


def taubin(X, its):
    X = X.copy()
    for _ in range(its):
        X += 0.5 * (nbm(X) - X); X += -0.53 * (nbm(X) - X)
    return X


def feather(m, steps=6):
    w = m.astype(float)
    for _ in range(steps): w = 0.5 * w + 0.5 * nbm(w)
    return np.clip(w, 0, 1)


wsum = lambda pre: sum(W[:, i] for i, nm in enumerate(names) if nm.startswith(pre))
x, y, z = co[:, 0], co[:, 1], co[:, 2]
REG = {
    'cannons': ((wsum('leg_hl_03') + wsum('leg_hr_03') >= 0.5) & (z > 0.035) & (z < 0.22), 20, 1.0),
    'forearms': ((wsum('leg_fl_02') + wsum('leg_fl_03') + wsum('leg_fr_02') + wsum('leg_fr_03') >= 0.5) & (z > 0.04) & (z < 0.24), 20, 1.0),
    'tail': ((wsum('tail_') >= 0.5) & (y > 0.34) & (y < 0.62), 10, 1.0),   # the thin tip is left alone
    'belly': ((np.abs(x) < 0.03) & (y > -0.02) & (y < 0.22) & (z < 0.42), 60, 1.0),
    'throat': ((np.abs(x) < 0.035) & (y > -0.25) & (y < -0.12) & (z > 0.34) & (z < 0.47), 60, 1.0),
    'perineum': ((np.abs(x) < 0.02) & (y > 0.18) & (y < 0.33) & (z > 0.36) & (z < 0.47), 40, 1.0),   # pass 3: midline groove under the tail root and between the thighs (critic 31, present at rest)
    'brisket': ((np.abs(x) < 0.07) & (y > -0.17) & (y < -0.02) & (z < 0.36) & ((wsum('spine_05') + wsum('neck_01')) >= 0.5), 30, 1.0),
}
cache = {}
new = co.copy(); rep = {}
for nm, (m, its, k) in REG.items():
    if its not in cache: cache[its] = taubin(co, its)
    w = feather(m) * k
    mv = (cache[its] - co) * w[:, None]
    new += mv
    a = np.linalg.norm(mv, axis=1)
    rep[nm] = dict(vertices=int((a > 1e-6).sum()), max_move_mm=round(float(a.max() * 1000), 2), mean_move_mm=round(float(a[a > 1e-6].mean() * 1000), 3), taubin_iterations=its)
# triangle quality: slivers (a near-zero rest area flips on the smallest motion: the single flagged triangle at the
# right hip in rest, head_left_up and breath_in) are relaxed tangentially, which keeps the surface where it is
T = d['T']
import os
SK_RELAX = int(os.environ.get('PATCH_RELAX', '30'))   # pass 4: more tangential relax steps for the last slivers


def tri_q(X):
    a, b, c = X[T[:, 0]], X[T[:, 1]], X[T[:, 2]]
    area = 0.5 * np.linalg.norm(np.cross(b - a, c - a), axis=1)
    L = np.stack([np.linalg.norm(b - c, axis=1), np.linalg.norm(c - a, axis=1), np.linalg.norm(a - b, axis=1)], 1)
    return area, area / np.maximum(L.max(1) ** 2, 1e-20)   # ~0.43 equilateral, -> 0 sliver


ar, q = tri_q(new); bad = (q < 0.02) | (ar < 1e-9)
rep['slivers_before'] = int(bad.sum())
vm = np.zeros(n, bool); vm[T[bad].ravel()] = True
for _ in range(2):
    nb = np.zeros(n, bool); nb[E[:, 0][vm[E[:, 1]]]] = True; nb[E[:, 1][vm[E[:, 0]]]] = True; vm |= nb
tri_n = np.cross(new[T[:, 1]] - new[T[:, 0]], new[T[:, 2]] - new[T[:, 0]]); vn = np.zeros_like(new)
for k in range(3): np.add.at(vn, T[:, k], tri_n)
vn /= np.maximum(np.linalg.norm(vn, axis=1), 1e-20)[:, None]
for _ in range(SK_RELAX):
    dlt = nbm(new) - new; dlt -= (dlt * vn).sum(1)[:, None] * vn
    new[vm] += 0.5 * dlt[vm]
ar, q = tri_q(new); rep['slivers_after'] = int(((q < 0.02) | (ar < 1e-9)).sum()); rep['sliver_relax_vertices'] = int(vm.sum())
idx = np.nonzero(np.linalg.norm(new - co0, axis=1) > 1e-7)[0]
np.savez_compressed(sys.argv[4], idx=idx, co=new[idx])
tot = np.linalg.norm(new - co0, axis=1)
rep['total'] = dict(vertices=int(len(idx)), max_move_mm=round(float(tot.max() * 1000), 2), includes_pass1_mirror_patch=int(len(P1['idx'])))
json.dump(rep, open(sys.argv[5], 'w'), indent=1)
print('PATCH2', json.dumps(rep))
