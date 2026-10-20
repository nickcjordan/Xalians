"""B-6kf7 pass 2: curvature and edge statistics for pass 0 / 1 / 2 (numpy). Usage: python neck_stats2.py PASS1_WORK PASS2_WORK"""
import sys, json, numpy as np
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent)); import neck_lib as NL
W1 = Path(sys.argv[1]); W2 = Path(sys.argv[2])
T = np.load(W1 / 'sculpt_topo.npz'); V0 = T['V']; E = T['E']; F = T['F']
Vs = {'pass0': V0, 'pass1': np.load(W1 / 'neck_V1.npy'), 'pass2': np.load(W2 / 'neck_V2.npy')}
C, Tn, s = NL.spline(NL.REST_PTS); idx, sv, th, r, ins = NL.param(V0, C, Tn, s)


def edge_dihedrals(V, mask):
    N = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]]); N /= np.maximum(np.linalg.norm(N, axis=1), 1e-30)[:, None]
    fb = np.flatnonzero(mask[F].all(1)); ed = {}
    for k in fb:
        t = F[k]
        for a, b in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])): ed.setdefault((min(a, b), max(a, b)), []).append(k)
    pr = np.array([v for v in ed.values() if len(v) == 2])
    return np.degrees(np.arccos(np.clip((N[pr[:, 0]] * N[pr[:, 1]]).sum(1), -1, 1)))


out = {}
bands = {'upper_ring_s110_174': ins & (sv > 110) & (sv < 174), 'jaw_angle_s164_198_lower_sides': ins & (sv > 164) & (sv < 198) & (((th > 80) & (th < 150)) | ((th > 210) & (th < 280))), 'whole_neck_s110_198': ins & (sv > 110) & (sv < 198)}
for name, V in Vs.items():
    H = NL.smooth_field(NL.curvature(V, NL.vertex_normals(V, F), E), E, 2)
    rec = {}
    # groove: per theta (15 deg bins), min over s of the bin-mean curvature
    for gname, lo, hi, thetas in (('upper_ring', 134, 152, (0, 30, 60, 90, 270, 300, 330)), ('jaw_angle', 168, 196, (90, 105, 120, 135, 225, 240, 255, 270))):
        row = {}
        for t0 in thetas:
            m = ins & (((th - t0 + 7.5) % 360) < 15)
            vals = [H[m & (np.abs(sv - x) <= 1.5)].mean() for x in np.arange(lo, hi + 0.1, 3.0) if (m & (np.abs(sv - x) <= 1.5)).sum() >= 3]
            row[t0] = round(float(min(vals)), 3)
        rec[gname + '_curvature_min_per_mm'] = row
    for bn, mask in bands.items():
        Hb = H[mask]; dih = edge_dihedrals(V, mask)
        rec[bn] = dict(H_min=round(float(Hb.min()), 3), H_p01=round(float(np.quantile(Hb, .01)), 3), verts_H_below_m010=int((Hb < -0.10).sum()),
                       dihedral_p99=round(float(np.quantile(dih, .99)), 2), dihedral_max=round(float(dih.max()), 2), edges_over_15deg=int((dih > 15).sum()))
    out[name] = rec
(W2 / 'curvature_stats.json').write_text(json.dumps(out, indent=1)); print(json.dumps(out, indent=1))
# largest curvature drop vs pass 0 on any vertex (catches creases at band edges wherever the axis parameter jumps)
H0 = NL.curvature(V0, NL.vertex_normals(V0, F), E)
drop = {}
for name in ('pass1', 'pass2'):
    V = Vs[name]; Hn = NL.curvature(V, NL.vertex_normals(V, F), E); dH = Hn - H0
    i = int(np.argmin(dH)); drop[name] = dict(vertex=i, H_before=round(float(H0[i]), 3), H_after=round(float(Hn[i]), 3), verts_dropped_over_0_1=int((dH < -0.1).sum()))
out['largest_curvature_drop_vs_pass0'] = drop
(W2 / 'curvature_stats.json').write_text(json.dumps(out, indent=1)); print('DROP', json.dumps(drop))
