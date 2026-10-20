"""B-6kf7: per-vertex crease statistics in the neck band, before vs after (numpy). Usage: python neck_crease_stats.py WORK_DIR"""
import sys, json, numpy as np
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent)); import neck_lib as NL
W = Path(sys.argv[1]); T = np.load(W / 'sculpt_topo.npz'); V0 = T['V']; E = T['E']; F = T['F']; V1 = np.load(W / 'neck_V1.npy')
C, Tn, s = NL.spline(NL.REST_PTS); idx, sv, th, r, ins = NL.param(V0, C, Tn, s)
band = ins & (sv > 110) & (sv < 174)
def stats(V):
    H = NL.smooth_field(NL.curvature(V, NL.vertex_normals(V, F), E), E, 2)[band]
    # dihedral across band edges
    N = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]]); N /= np.maximum(np.linalg.norm(N, axis=1), 1e-30)[:, None]
    fb = band[F].all(1); Fb = np.flatnonzero(fb); ed = {}
    for k in Fb:
        t = F[k]
        for a, b in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])): ed.setdefault((min(a, b), max(a, b)), []).append(k)
    pr = np.array([v for v in ed.values() if len(v) == 2]); dih = np.degrees(np.arccos(np.clip((N[pr[:, 0]] * N[pr[:, 1]]).sum(1), -1, 1)))
    return dict(H_p01=float(np.quantile(H, .01)), H_min=float(H.min()), H_p99=float(np.quantile(H, .99)), H_max=float(H.max()),
                verts_H_below_m006=int((H < -0.06).sum()), verts_H_below_m010=int((H < -0.10).sum()), verts_H_above_010=int((H > 0.10).sum()),
                dihedral_p99=float(np.quantile(dih, .99)), dihedral_max=float(dih.max()), dihedral_over_15=int((dih > 15).sum()))
res = dict(band='s 110..174 mm on the neck axis, all theta', before=stats(V0), after=stats(V1))
(W / 'crease_stats.json').write_text(json.dumps(res, indent=1)); print(json.dumps(res, indent=1))
