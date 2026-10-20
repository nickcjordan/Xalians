"""Step 26 plan, from saved evidence (no Blender): for every tail strand,
* its true position along its own tail at every point (for crisp rings: the
  ring shader reads sth + intercept*strlen*tipShift, so a per-point sth makes
  the ring follow where each part of the hair actually lies);
* a length factor that trims strands reaching past their tail's smoothed outer
  envelope (bristly root collar, bumps on the outer edge), never lengthening.
  python plan_tails_26.py <surface dir> <out.npz>
"""
import sys
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

surface, out = Path(sys.argv[1]), Path(sys.argv[2])
d = np.load(surface / 'r/evidence.npz')
c = np.load(surface / 'r/collision-evidence.npz')
co, edges, tube, sth = d['co'], d['edges'], d['attr_tail_tube'], d['attr_sth']
P, starts = d['points'], d['starts']
counts = np.diff(np.r_[starts, len(P)])
active = c['active']
m = tube > .8
ok = m[edges].all(1)
e = edges[ok]
g = coo_matrix((np.ones(2 * len(e)), (np.r_[e[:, 0], e[:, 1]], np.r_[e[:, 1], e[:, 0]])), shape=(len(co), len(co))).tocsr()
_, lab = connected_components(g, directed=False)
labs, sizes = np.unique(lab[m], return_counts=True)
tails = labs[np.argsort(sizes)[-3:]]
print('tail components', sizes[np.argsort(sizes)[-3:]])
vtree = cKDTree(co)
_, rootv = vtree.query(P[starts])
tail_of = np.full(len(starts), -1)
for k, t in enumerate(tails):
    tail_of[(lab[rootv] == t) & m[rootv] & active] = k
plan_ids, factors, true_s, tparam = [], [], [], []
report = {}
for k, t in enumerate(tails):
    vm = np.where(lab == t)[0]
    s = sth[vm]
    bins = np.arange(s.min(), s.max() + .01, .01)
    idx = np.digitize(s, bins)
    axis, axs, radius = [], [], []
    for b in np.unique(idx):
        sel = vm[idx == b]
        if len(sel) < 6:
            continue
        cen = co[sel].mean(0)
        axis.append(cen); axs.append(sth[sel].mean()); radius.append(np.median(np.linalg.norm(co[sel] - cen, axis=1)))
    axis, axs, radius = np.array(axis), np.array(axs), np.array(radius)
    atree = cKDTree(axis)
    ids = np.where(tail_of == k)[0]
    tips = P[starts[ids] + counts[ids] - 1]
    dist, ai = atree.query(tips)
    reach = dist
    ts = axs[ai]
    # smoothed outer envelope along the tail: 80th percentile per 1.5 cm, then a running mean
    eb = np.arange(ts.min(), ts.max() + .015, .015)
    ei = np.digitize(ts, eb)
    env = np.zeros(len(eb) + 2)
    for b in range(len(env)):
        sel = ei == b
        env[b] = np.percentile(reach[sel], 80) if sel.sum() > 20 else np.nan
    good = np.isfinite(env)
    env = np.interp(np.arange(len(env)), np.where(good)[0], env[good])
    kern = np.ones(5) / 5
    env_s = np.convolve(np.r_[env[:1].repeat(2), env, env[-1:].repeat(2)], kern, 'valid')
    E = env_s[ei]
    R = radius[ai]
    over = reach > E * 1.04
    f = np.ones(len(ids))
    f[over] = np.clip((E[over] * 1.02 - R[over]) / np.maximum(reach[over] - R[over], 1e-6), .45, 1)
    for j, i in enumerate(ids):
        pts = P[starts[i]:starts[i] + counts[i]]
        _, pai = atree.query(pts)
        arc = np.r_[0, np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))]
        plan_ids.append(i); factors.append(f[j]); true_s.append(axs[pai]); tparam.append(arc / max(arc[-1], 1e-9))
    report[int(k)] = dict(strands=len(ids), trimmed=int(over.sum()), meanFactorTrimmed=float(f[over].mean()) if over.any() else 1.0)
print(report)
n = max(len(x) for x in true_s)
S = np.full((len(plan_ids), n), np.nan, np.float32)
Tp = np.full((len(plan_ids), n), np.nan, np.float32)
for j, (a, b) in enumerate(zip(true_s, tparam)):
    S[j, :len(a)] = a
    Tp[j, :len(b)] = b
np.savez_compressed(out, ids=np.array(plan_ids, np.int32), factor=np.array(factors, np.float32), trueS=S, t=Tp)
print('PLAN', len(plan_ids))
