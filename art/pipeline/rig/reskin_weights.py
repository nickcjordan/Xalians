"""B-sntv: heat (screened Poisson) skin weights for the Luceras sculpt, from the skeleton plus the new scapula bones.

Runs in a plain Python with numpy and scipy (Windows host), between two Blender steps:
  python reskin_weights.py cand  BODY.npz SKEL.json CAND.npz        nearest proxy segments per vertex (for the ray test)
  python reskin_weights.py solve BODY.npz SKEL.json CAND.npz VIS.npz WEIGHTS.npz [c]

Method (Baran and Popovic bone heat, with anatomical proxies):
  * every skinning bone is one or more proxy segments; the trunk bones are sagittal slabs (copies of the spine segment
    lowered toward the underline), spine_05's lower copies run forward to the point of the chest (the sternum), so the
    brisket belongs to the thorax and not to the neck or the upper arms
  * each vertex is attached to its nearest proxy that it can see (a straight line inside the body, ray-tested in Blender)
  * weights solve (L + M H) w = M H p, L the cotangent Laplacian, M lumped vertex areas, H = c / d^2 for the
    attached proxy, p the attachment indicator; skull, jaw and ear-blade vertices (old head+jaw+ear weight 1) keep
    their weights exactly and act as boundary values, so the rigid head stays rigid
  * small weights pruned (< 0.005), rows normalized
"""
import sys, json
import numpy as np
import scipy.sparse as sp
from scipy.sparse.linalg import splu

MODE = sys.argv[1]
body = np.load(sys.argv[2]); SK = json.load(open(sys.argv[3]))
co = body['co']; T = body['T']; Wold = body['W']; gold = list(body['groups']); n = len(co)
bones = json.loads(str(body['bones']))
for nm, (h, t) in SK['extra_bones'].items(): bones[nm] = (h, t)
SOLVE = SK['solve_bones']
FIXED_GROUPS = SK['fixed_groups']


def underline(y):
    tab = np.array(SK['underline'])   # (y, z) midline belly line
    return np.interp(y, tab[:, 0], tab[:, 1])


def proxies():
    """list of (bone, a, b) segments"""
    out = []
    for nm in SOLVE:
        if nm in SK.get('no_proxy', []): continue
        h, t = np.array(bones[nm][0], float), np.array(bones[nm][1], float)
        out.append((nm, h, t))
        if nm.startswith('spine_'):
            for f in SK['slab_fracs']:
                hh, tt = h.copy(), t.copy()
                hh[2] -= f * (h[2] - underline(h[1])); tt[2] -= f * (t[2] - underline(t[1]))
                if nm == 'spine_05' and f >= SK['sternum_from_frac']:
                    fy = SK['sternum_front_y']
                    tt[1] = fy; tt[2] = max(underline(fy) + SK['sternum_lift'], t[2] - f * (t[2] - underline(fy)))
                out.append((nm, hh, tt))
    return out


def seg_dist(P, a, b):
    ab = b - a; L2 = max(float(ab @ ab), 1e-12)
    u = np.clip(((P - a) @ ab) / L2, 0, 1)
    Q = a + u[:, None] * ab
    return np.linalg.norm(P - Q, axis=1), Q


PX = proxies()
K = SK.get('candidates', 6)
fixed_cols = [gold.index(g) for g in FIXED_GROUPS if g in gold]
fixed = Wold[:, fixed_cols].sum(1) >= 0.999

if MODE == 'cand':
    D = np.empty((n, len(PX)), np.float32); Qs = np.empty((n, len(PX), 3), np.float32)
    for j, (nm, a, b) in enumerate(PX):
        D[:, j], Qs[:, j] = seg_dist(co, a, b)
    order = np.argsort(D, axis=1)[:, :K]
    pts = np.take_along_axis(Qs, order[:, :, None], 1)
    order[fixed] = -1
    np.savez_compressed(sys.argv[4], cand=order, pts=pts, dist=np.take_along_axis(D, order.clip(0), 1))
    print('CAND', n, len(PX), 'fixed', int(fixed.sum()), [p[0] for p in PX])
    sys.exit(0)

# ---------------------------------------------------------------------------------------------------- solve
C = np.load(sys.argv[4]); vis = np.load(sys.argv[5])['vis']; OUTP = sys.argv[6]
c = float(sys.argv[7]) if len(sys.argv) > 7 else SK.get('heat_c', 1.0)
cand, dist = C['cand'], C['dist']
B = len(SOLVE); bidx = {nm: i for i, nm in enumerate(SOLVE)}
px_bone = np.array([bidx[p[0]] for p in PX])
# attachment: nearest visible proxy; if none visible, nearest proxy (weaker heat)
first_vis = np.where(vis.any(1), vis.argmax(1), 0)
seg = np.take_along_axis(cand, first_vis[:, None], 1)[:, 0]
d = np.take_along_axis(dist, first_vis[:, None], 1)[:, 0].astype(float)
d = np.maximum(d, SK.get('min_dist', 0.004))
P = np.zeros((n, B)); free = ~fixed
P[free, px_bone[seg[free]]] = 1.0
# ties: other visible proxies of other bones within 2 percent of the nearest distance also attach (Blender heat)
for k in range(cand.shape[1]):
    m = free & vis[:, k] & (dist[:, k] <= d * 1.02) & (cand[:, k] >= 0)
    P[m, px_bone[cand[m, k]]] = 1.0
P[free] /= P[free].sum(1, keepdims=True)
Hh = c / d ** 2   # unseen (paws, toes: the straight bone line leaves the foot) attach with full heat to the nearest proxy
Hh[fixed] = 0
# cotangent Laplacian
v0, v1, v2 = co[T[:, 0]], co[T[:, 1]], co[T[:, 2]]
def cot(a, b, cc):
    u, v = b - a, cc - a
    cr = np.linalg.norm(np.cross(u, v), axis=1)
    return (u * v).sum(1) / np.maximum(cr, 1e-14)
c0 = cot(v0, v1, v2); c1 = cot(v1, v2, v0); c2 = cot(v2, v0, v1)
area = 0.5 * np.linalg.norm(np.cross(v1 - v0, v2 - v0), axis=1)
I = np.concatenate([T[:, 1], T[:, 2], T[:, 0]]); J = np.concatenate([T[:, 2], T[:, 0], T[:, 1]])
Wc = 0.5 * np.clip(np.concatenate([c0, c1, c2]), 0.0, 20.0) + 1e-3
Wm = sp.coo_matrix((Wc, (I, J)), shape=(n, n)).tocsr(); Wm = Wm + Wm.T
L = sp.diags(np.asarray(Wm.sum(1)).ravel()) - Wm
M = np.bincount(T.ravel(), np.repeat(area / 3, 3), minlength=n)
A = (L + sp.diags(M * Hh)).tocsr()
Fi = np.nonzero(free)[0]; Ki = np.nonzero(fixed)[0]
AFF = A[Fi][:, Fi].tocsc(); AFK = A[Fi][:, Ki]
Wfix = np.zeros((len(Ki), B))
for g in FIXED_GROUPS + SOLVE:
    if g in gold and g in bidx: Wfix[:, bidx[g]] += Wold[Ki, gold.index(g)]
Wfix /= np.maximum(Wfix.sum(1, keepdims=True), 1e-12)
rhs = (M * Hh)[Fi, None] * P[Fi] - AFK @ Wfix
print('SOLVE factorizing', AFF.shape, AFF.nnz, flush=True)
lu = splu(AFF, permc_spec='COLAMD')
Wf = lu.solve(rhs)
Wn = np.zeros((n, B)); Wn[Fi] = Wf; Wn[Ki] = Wfix
# joint bands: along each limb chain the parent and child share weight only inside a band around the joint plane
# (normal = mean of the two bone directions); beyond it the segment is rigid. Heat alone leaks the cannon into the
# paw and the forearm into the wrist (forepaw verts down to 0.75 leg_f*_03).
band_log = {}
for par, chi, hw, rad in SK.get('bands', []):
    if par not in bidx or chi not in bidx: continue
    ip, ic = bidx[par], bidx[chi]
    hp, tp = np.array(bones[par][0]), np.array(bones[par][1]); hc, tc = np.array(bones[chi][0]), np.array(bones[chi][1])
    J = hc; nrm = (tp - hp) / np.linalg.norm(tp - hp) + (tc - hc) / np.linalg.norm(tc - hc); nrm /= np.linalg.norm(nrm)
    s = (co - J) @ nrm
    near = (np.linalg.norm(co - J, axis=1) < rad) & ((Wn[:, ip] + Wn[:, ic]) > 0.3) & free
    ss = lambda x: (lambda u: u * u * (3 - 2 * u))(np.clip(x, 0, 1))
    before = Wn[near].copy()
    Wn[near, ip] *= ss((hw - s[near]) / (2 * hw)); Wn[near, ic] *= ss((hw + s[near]) / (2 * hw))
    tot = Wn[near].sum(1, keepdims=True); bad = tot[:, 0] < 1e-6
    Wn[near] = np.where(bad[:, None], before, Wn[near] / np.maximum(tot, 1e-12))
    band_log[f'{par}>{chi}'] = int(near.sum())
print('BANDS', band_log, flush=True)
Wn[Wn < SK.get('prune', 0.005)] = 0
Wn /= np.maximum(Wn.sum(1, keepdims=True), 1e-12)
np.savez_compressed(OUTP, W=Wn.astype(np.float32), names=np.array(SOLVE), attach=px_bone[seg], fixed=fixed, vis_any=vis.any(1))
print('SOLVE done', 'unseen', int((~vis.any(1) & free).sum()), 'max influences', int((Wn > 0).sum(1).max()),
      'mean influences', float((Wn > 0).sum(1).mean()), flush=True)
