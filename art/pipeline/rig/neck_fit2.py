"""B-6kf7 pass 2: blend the lower stretch of the neck seam behind the jaw angle (numpy only).

Usage: python neck_fit2.py PASS1_WORK PASS2_WORK
Starts from the pass 1 geometry (PASS1_WORK/neck_V1.npy) and the pass 0 rest (sculpt_topo.npz). Same method as pass 1
(neck_fit.py): per-theta median radius profile, Gaussian target along s, radial displacement windowed in s and theta,
mesh-smoothed displacement field, several rounds, Taubin clean-up on the seam core. Band: the jaw-angle groove on the
lower sides, s 164..198 mm (full 172..190), theta full on 90..140 and 220..270 (left and right lower sides), fading to
zero by 70 / 160 and 200 / 290, so the throat line (theta 180) and the top line keep their pass 1 shape. Sigma is
smaller than pass 1 (5 mm) so only the seam line softens and the cheek volume and jaw outline stay.
The coordinator lifted the head-and-jaw hold for this band (2026-10-20); vertices weighted > 0.5 to the ears stay frozen.
Writes PASS2_WORK/neck_V2.npy, neck_delta2.npz (pass 1 -> pass 2), neck_delta_cum.npz (pass 0 -> pass 2), neck_fit2.json.
"""
import sys, json, numpy as np
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import neck_lib as NL

W1 = Path(sys.argv[1]); W2 = Path(sys.argv[2]); W2.mkdir(parents=True, exist_ok=True)
CORE = (172.0, 191.0); BAND = (164.0, 197.0); SIGMA = 5.0; SMOOTH_IT = 30; ROUNDS = 4
TH_FULL = ((90.0, 145.0), (215.0, 270.0)); TH_FADE = 20.0
SEAM = (170.0, 192.0); TAUBIN_IT = 15; EAR_HARD = 0.5; FILL_IT = 200; FILL_H0 = 0.025; SLIVER_MM2 = 0.05; CLOSE_IT = 6; JUMP_S = 212.0; JUMP_RINGS = 10; TAPER_IT = 12; TAPER_FULL = 0.9
T = np.load(W1 / 'sculpt_topo.npz'); D = np.load(W1 / 'before_diag.npz')
V0 = T['V']; E = T['E']; F = T['F']; V1 = np.load(W1 / 'neck_V1.npy')
C, Tn, s = NL.spline(NL.REST_PTS)
idx, sv, th, r0, inside = NL.param(V0, C, Tn, s)   # rest parametrisation (pass 0), fixed
names = [str(x) for x in D['names']]; Ws = D['Ws']
ear = Ws[:, [names.index(x) for x in ('ear_l_01', 'ear_l_02', 'ear_r_01', 'ear_r_02')]].sum(1)
cand = inside & (sv > 150) & (sv < 212) & (ear < EAR_HARD)
inband = (sv > BAND[0]) & (sv < BAND[1])
def win_t(t):
    w = np.zeros_like(t)
    for a, b in TH_FULL:
        d = np.maximum(a - t, t - b); d = np.maximum(d, 0)   # degrees outside [a, b]
        w = np.maximum(w, np.clip(1 - d / TH_FADE, 0, 1))
    return 0.5 - 0.5 * np.cos(np.pi * w)


# close the band on the surface: near the back of the jaw the nearest axis sample can jump, so a few vertices inside
# the band map to far s and would be held still, leaving a crease. Add any vertex with half or more of its neighbours in
# the band (CLOSE_IT times). Added vertices get no direct displacement; they follow their neighbours through the
# smoothed displacement field.
deg = np.zeros(len(V0)); np.add.at(deg, E[:, 0], 1); np.add.at(deg, E[:, 1], 1); deg = np.maximum(deg, 1)
B = cand & inband
for _ in range(CLOSE_IT):
    k_ = np.zeros(len(V0)); np.add.at(k_, E[:, 0], B[E[:, 1]]); np.add.at(k_, E[:, 1], B[E[:, 0]])
    B = B | ((k_ / deg >= 0.5) & inside & (ear < EAR_HARD))
# the strip just behind the jaw angle maps to s 215..245 (the nearest axis sample jumps forward along the head) although
# it lies on the groove; take in such param-far vertices that are within JUMP_RINGS edge rings of the band
jump = inside & (sv > JUMP_S) & (sv < 250) & (ear < EAR_HARD) & (win_t(th) > 0.5)
grow = B.copy()
for _ in range(JUMP_RINGS):
    nx = grow.copy(); nx[E[grow[E[:, 0]], 1]] = True; nx[E[grow[E[:, 1]], 0]] = True; grow = nx & (B | jump)
B = B | grow
added = B & ~(cand & inband)


def win_s(x):
    w = np.zeros_like(x); w[(x >= CORE[0]) & (x <= CORE[1])] = 1
    lo = (x > BAND[0]) & (x < CORE[0]); w[lo] = 0.5 - 0.5 * np.cos(np.pi * (x[lo] - BAND[0]) / (CORE[0] - BAND[0]))
    hi = (x > CORE[1]) & (x < BAND[1]); w[hi] = 0.5 + 0.5 * np.cos(np.pi * (x[hi] - CORE[1]) / (BAND[1] - CORE[1]))
    return w


wt = win_t(th)
sb = np.arange(150.0, 212.01, 1.0); tb = np.arange(0.0, 360.0, 10.0)
k = np.arange(-20, 21); g = np.exp(-0.5 * (k / SIGMA) ** 2); g /= g.sum()


def radial_step(Vc):
    R0 = Vc - C[idx]; t0_ = Tn[idx]; r = np.linalg.norm(R0 - t0_ * (R0 * t0_).sum(1)[:, None], axis=1) * 1000
    med = np.full((len(tb), len(sb)), np.nan)
    for i, t0 in enumerate(tb):
        mt = cand & (((th - t0 + 5) % 360) < 10)
        for j, x in enumerate(sb):
            m = mt & (np.abs(sv - x) <= 0.5)
            if m.sum() >= 3: med[i, j] = np.median(r[m])
    medf = np.array([np.interp(sb, sb[~np.isnan(x)], x[~np.isnan(x)]) if (~np.isnan(x)).sum() > 4 else x for x in med])
    def gs(row):
        pad = np.r_[row[0] + (row[0] - row[20:0:-1]), row, row[-1] + (row[-1] - row[-2:-22:-1])]
        return np.convolve(pad, g, 'valid')
    disp = np.nan_to_num(np.array([gs(x) for x in medf]) - medf)
    disp = (np.roll(disp, 1, 0) + 2 * disp + np.roll(disp, -1, 0)) / 4
    fi = (th / 10.0) % len(tb); i0 = np.floor(fi).astype(int) % len(tb); i1 = (i0 + 1) % len(tb); ft = fi - np.floor(fi)
    fs = np.clip(sv - sb[0], 0, len(sb) - 1.001); j0 = np.floor(fs).astype(int); fj = fs - j0
    dv = np.nan_to_num((1 - ft) * ((1 - fj) * disp[i0, j0] + fj * disp[i0, j0 + 1]) + ft * ((1 - fj) * disp[i1, j0] + fj * disp[i1, j0 + 1]))
    w = NL.smooth_field(win_s(sv) * wt * (cand & inband), E, 6) * (cand & inband)
    R = Vc - C[idx]; t = Tn[idx]; Rr = R - t * (R * t).sum(1)[:, None]; u = Rr / np.maximum(np.linalg.norm(Rr, axis=1), 1e-12)[:, None]
    Dv = u * (dv * w / 1000.0)[:, None]
    Dv = NL.smooth_field(Dv, E, SMOOTH_IT, keep=~B)
    return Vc + Dv


V2 = V1.copy()
for _ in range(ROUNDS): V2 = radial_step(V2)
# concave-only fill: move only vertices whose umbrella Laplacian points out of the surface (groove floor) along the
# normal, so the groove fills while convex forms (cheek, jaw outline) are left alone; mask recomputed every iteration
wf = NL.smooth_field(win_s(sv) * wt * (cand & inband), E, 6)
wf = NL.smooth_field(wf, E, 4, keep=~added) * B
cnt = np.zeros(len(V2)); np.add.at(cnt, E[:, 0], 1); np.add.at(cnt, E[:, 1], 1); cnt = np.maximum(cnt, 1)
for _ in range(FILL_IT):
    N2 = NL.vertex_normals(V2, F)
    S = np.zeros_like(V2); np.add.at(S, E[:, 0], V2[E[:, 1]]); np.add.at(S, E[:, 1], V2[E[:, 0]])
    L = S / cnt[:, None] - V2; ln = (L * N2).sum(1)
    H = NL.curvature(V2, N2, E)
    conc = np.clip((-H - FILL_H0) / FILL_H0, 0, 1)          # 0 above -FILL_H0, 1 at -2*FILL_H0 (1/mm)
    conc = NL.smooth_field(conc, E, 2)
    step = 0.5 * wf * conc * np.maximum(ln, 0)
    V2 = V2 + N2 * step[:, None]
wc = np.clip(np.minimum(sv - (SEAM[0] - 4), (SEAM[1] + 4) - sv) / 4.0, 0, 1) * wt * cand
wc = NL.smooth_field(wc * (cand & inband), E, 4) * B
cnt = np.zeros(len(V2)); np.add.at(cnt, E[:, 0], 1); np.add.at(cnt, E[:, 1], 1); cnt = np.maximum(cnt, 1)
for _ in range(TAUBIN_IT):
    for fac in (0.5, -0.53):
        S = np.zeros_like(V2); np.add.at(S, E[:, 0], V2[E[:, 1]]); np.add.at(S, E[:, 1], V2[E[:, 0]])
        V2 = V2 + fac * wc[:, None] * (S / cnt[:, None] - V2)

# edge taper: the change fades to zero over the outer TAPER_IT rings of the closed band, so no step is left where the
# band meets still vertices (the band edge in s, and the strip behind the jaw angle whose axis parameter jumps)
tp = NL.smooth_field(B.astype(float), E, TAPER_IT, keep=~B); tp = np.clip(tp / TAPER_FULL, 0, 1); tp = tp * tp * (3 - 2 * tp)
V2 = V1 + (V2 - V1) * tp[:, None]
# sliver faces (rest area < SLIVER_MM2) are normal-unstable: their vertices take the mean displacement of their
# neighbours, so a sliver moves with its surroundings instead of flipping
A0 = 0.5 * np.linalg.norm(np.cross(V0[F[:, 1]] - V0[F[:, 0]], V0[F[:, 2]] - V0[F[:, 0]]), axis=1) * 1e6
sl = np.zeros(len(V0), bool); sl[F[A0 < SLIVER_MM2].ravel()] = True
sl &= np.linalg.norm(V2 - V1, axis=1) > 0
Dl = V2 - V1
for _ in range(4):
    S = np.zeros_like(Dl); np.add.at(S, E[:, 0], Dl[E[:, 1]]); np.add.at(S, E[:, 1], Dl[E[:, 0]])
    Dl[sl] = (S / cnt[:, None])[sl]
V2 = V1 + Dl
m12 = np.flatnonzero(np.linalg.norm(V2 - V1, axis=1) > 0); m02 = np.flatnonzero(np.linalg.norm(V2 - V0, axis=1) > 0)
d12 = np.linalg.norm(V2 - V1, axis=1) * 1000; d02 = np.linalg.norm(V2 - V0, axis=1) * 1000
np.save(W2 / 'neck_V2.npy', V2)
np.savez_compressed(W2 / 'neck_delta2.npz', index=m12.astype(np.int64), base_co=V1[m12], new_co=V2[m12])
np.savez_compressed(W2 / 'neck_delta_cum.npz', index=m02.astype(np.int64), base_co=V0[m02], new_co=V2[m02])
dth = np.abs(((th - 180.0) + 180.0) % 360.0 - 180.0)
res = dict(params=dict(core_mm=CORE, band_mm=BAND, sigma_mm=SIGMA, theta_full_deg=TH_FULL, theta_fade_deg=TH_FADE, smoothing_iterations=SMOOTH_IT, rounds=ROUNDS,
                       seam_taubin_mm=SEAM, taubin_iterations=TAUBIN_IT, ear_weight_frozen=EAR_HARD, concave_fill_iterations=FILL_IT, concave_fill_threshold_per_mm=FILL_H0, sliver_face_area_mm2=SLIVER_MM2, band_closing_iterations=CLOSE_IT, jump_strip_min_s=JUMP_S, jump_strip_rings=JUMP_RINGS, edge_taper_iterations=TAPER_IT, edge_taper_full=TAPER_FULL),
           pass1_to_pass2=dict(moved_vertices=int(len(m12)), move_mm=dict(max=float(d12.max()), p99=float(np.quantile(d12[m12], .99)), mean=float(d12[m12].mean())),
                               s_range=[float(sv[m12].min()), float(sv[m12].max())], outside_s_band=int((~(cand & inband))[m12].sum()), outside_closed_band=int((~B)[m12].sum()), closing_added_vertices=int(added.sum()),
                               within_20deg_of_throat=int((dth[m12] < 20).sum()), dorsal_within_60deg_of_top=int((np.abs(((th[m12]) + 180) % 360 - 180) < 60).sum())),
           pass0_to_pass2=dict(moved_vertices=int(len(m02)), move_mm=dict(max=float(d02.max()), p99=float(np.quantile(d02[m02], .99)), mean=float(d02[m02].mean()))),
           vertices_total=int(len(V0)))
(W2 / 'neck_fit2.json').write_text(json.dumps(res, indent=1)); print(json.dumps(res))
