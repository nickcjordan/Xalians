"""B-6kf7: compute the neck seam fix as a region delta (numpy only, run with plain Python).

Usage: python neck_fit.py WORK_DIR
Reads WORK_DIR/sculpt_topo.npz (rest V, E, F of pass3 luceras_sculpt.blend) and WORK_DIR/before_diag.npz (axis
parameters and normalised rig weights). Writes WORK_DIR/neck_delta.npz (index, base_co, new_co) and neck_fit.json.

Cause (from neck_diag): at rest a ring step sits at s ~ 140 mm along the neck axis (about 53 mm below the head_01 joint):
the head-side section is 3 to 5 mm larger in radius than the neck-side section, joined by a narrow notch (mean curvature
to -0.10 /mm on the top line) and a lip just above it (+0.09 /mm). It is identical at the idle frame, so it is shape,
not skinning.

Method: per theta (10 degree bins, periodic), the median radius profile r(s) of the neck surface in 1 mm bins over
s 96..190; target = the profile smoothed along s by a Gaussian (sigma SIGMA mm), which keeps the taper and the broad
form but spreads the step; displacement = (target - r) times a window in s (full on CORE, cosine fade to 0 at BAND) and a
theta window (full on the top and sides, fading to 0 across the throat so the throat line stays as is). Each vertex moves
along its own radial direction (perpendicular to the axis) by the bilinear-interpolated displacement. Vertices weighted
to the jaw or ears (> 0.02) or off the neck tube (radius more than TUBE mm from the bin median) never move. Then a light
tangential relax inside the core evens the spacing (band boundary pinned).
"""
import sys, json, numpy as np
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import neck_lib as NL

W = Path(sys.argv[1])
CORE = (128.0, 156.0); BAND = (114.0, 170.0); SIGMA = 7.0; TUBE = 6.0; USE_TUBE = False; SMOOTH_IT = 40; ROUNDS = 5; FURN_SOFT, FURN_HARD = 0.3, 0.5; RELAX_IT = 0; SEAM = (134.0, 154.0); TAUBIN_IT = 15
THROAT_FULL, THROAT_ZERO = 115.0, 150.0      # |theta - 180| >= 65 full, <= 30 zero (throat line kept)
T = np.load(W / 'sculpt_topo.npz'); D = np.load(W / 'before_diag.npz')
V0 = T['V']; E = T['E']; F = T['F']
assert np.array_equal(V0, D['V0']), 'sculpt and clips body differ'
C, Tn, s = NL.spline(NL.REST_PTS)
idx, sv, th, r, inside = NL.param(V0, C, Tn, s)
names = [str(x) for x in D['names']]; Ws = D['Ws']
furn = Ws[:, [names.index(x) for x in ('jaw_01', 'ear_l_01', 'ear_l_02', 'ear_r_01', 'ear_r_02')]].sum(1)
cand = inside & (sv > 90) & (sv < 196) & (furn < FURN_HARD)
fsoft = np.clip((FURN_HARD - furn) / (FURN_HARD - FURN_SOFT), 0, 1); fsoft = fsoft * fsoft * (3 - 2 * fsoft)   # 1 below FURN_SOFT, 0 at FURN_HARD

def radial_step(Vc):
    R0 = Vc - C[idx]; t0_ = Tn[idx]; r = np.linalg.norm(R0 - t0_ * (R0 * t0_).sum(1)[:, None], axis=1) * 1000
    sb = np.arange(96.0, 190.01, 1.0); tb = np.arange(0.0, 360.0, 10.0)
    med = np.full((len(tb), len(sb)), np.nan)
    for i, t0 in enumerate(tb):
        mt = cand & (((th - t0 + 5) % 360) < 10)
        for j, x in enumerate(sb):
            m = mt & (np.abs(sv - x) <= 0.5)
            if m.sum() >= 3: med[i, j] = np.median(r[m])
    # fill gaps along s by linear interpolation, then Gaussian target
    def fill(row):
        ok = ~np.isnan(row)
        return np.interp(sb, sb[ok], row[ok]) if ok.sum() > 4 else row
    medf = np.array([fill(x) for x in med])
    k = np.arange(-25, 26); g = np.exp(-0.5 * (k / SIGMA) ** 2); g /= g.sum()
    def gsmooth(row):
        pad = np.r_[np.full(25, row[0]) + (row[0] - row[25:0:-1]), row, np.full(25, row[-1]) + (row[-1] - row[-2:-27:-1])]   # odd reflection keeps the slope
        return np.convolve(pad, g, 'valid')
    tgt = np.array([gsmooth(x) for x in medf])
    disp = np.nan_to_num(tgt - medf)
    # smooth the displacement field lightly across theta (periodic) and s
    disp = (np.roll(disp, 1, 0) + 2 * disp + np.roll(disp, -1, 0)) / 4

    def win_s(x):
        w = np.zeros_like(x)
        w[(x >= CORE[0]) & (x <= CORE[1])] = 1
        lo = (x > BAND[0]) & (x < CORE[0]); w[lo] = 0.5 - 0.5 * np.cos(np.pi * (x[lo] - BAND[0]) / (CORE[0] - BAND[0]))
        hi = (x > CORE[1]) & (x < BAND[1]); w[hi] = 0.5 + 0.5 * np.cos(np.pi * (x[hi] - CORE[1]) / (BAND[1] - CORE[1]))
        return w
    dth = np.abs(((th - 180.0) + 180.0) % 360.0 - 180.0)   # angular distance from theta 180 (throat), 0..180
    wt = np.clip((dth - (180 - THROAT_ZERO)) / (THROAT_ZERO - THROAT_FULL), 0, 1)
    wt = 0.5 - 0.5 * np.cos(np.pi * wt)

    # per-vertex displacement: bilinear in (theta, s)
    fi = (th / 10.0) % len(tb); i0 = np.floor(fi).astype(int) % len(tb); i1 = (i0 + 1) % len(tb); ft = fi - np.floor(fi)
    fs = np.clip(sv - sb[0], 0, len(sb) - 1.001); j0 = np.floor(fs).astype(int); fj = fs - j0
    dv = ((1 - ft) * ((1 - fj) * disp[i0, j0] + fj * disp[i0, j0 + 1]) + ft * ((1 - fj) * disp[i1, j0] + fj * disp[i1, j0 + 1]))
    mr = ((1 - ft) * ((1 - fj) * medf[i0, j0] + fj * medf[i0, j0 + 1]) + ft * ((1 - fj) * medf[i1, j0] + fj * medf[i1, j0 + 1]))
    tube = np.abs(r - mr) < TUBE if USE_TUBE else np.ones(len(r), bool)
    w = win_s(sv) * wt * cand * tube * fsoft
    # smooth the per-vertex weight over the mesh so frozen / tube-edge vertices do not leave steps
    inband = (sv > BAND[0]) & (sv < BAND[1])
    w = NL.smooth_field(w, E, 6) * (cand & tube & inband)
    dv = np.nan_to_num(dv)
    move = w > 1e-4
    R = Vc - C[idx]; t = Tn[idx]; Rr = R - t * (R * t).sum(1)[:, None]; u = Rr / np.maximum(np.linalg.norm(Rr, axis=1), 1e-12)[:, None]
    Dv = np.zeros_like(Vc); Dv[move] = u[move] * (dv[move] * w[move] / 1000.0)[:, None]
    # smooth the displacement field over the mesh (vertex-level noise from the binned profile), zero held outside the band
    fixed = ~(cand & inband)
    Dv = NL.smooth_field(Dv, E, SMOOTH_IT, keep=fixed)
    move = np.linalg.norm(Dv, axis=1) > 1e-9
    return Vc + Dv, w

V1 = V0.copy()
for rnd in range(ROUNDS):
    V1, w = radial_step(V1)
dth_ = np.abs(((th - 180.0) + 180.0) % 360.0 - 180.0); wt = np.clip((dth_ - (180 - THROAT_ZERO)) / (THROAT_ZERO - THROAT_FULL), 0, 1); wt = 0.5 - 0.5 * np.cos(np.pi * wt)
# seam clean-up: Taubin smoothing (lambda/mu, no shrink) on the seam core only, to even the old seam's sliver faces
wc = np.clip(np.minimum(sv - (SEAM[0] - 4), (SEAM[1] + 4) - sv) / 4.0, 0, 1) * wt * cand * fsoft
wc = NL.smooth_field(wc, E, 4) * (cand & (sv > SEAM[0] - 4) & (sv < SEAM[1] + 4))
cnt = np.zeros(len(V1)); np.add.at(cnt, E[:, 0], 1); np.add.at(cnt, E[:, 1], 1); cnt = np.maximum(cnt, 1)
for it in range(TAUBIN_IT):
    for fac in (0.5, -0.53):
        S = np.zeros_like(V1); np.add.at(S, E[:, 0], V1[E[:, 1]]); np.add.at(S, E[:, 1], V1[E[:, 0]])
        V1 = V1 + fac * wc[:, None] * (S / cnt[:, None] - V1)
move = np.linalg.norm(V1 - V0, axis=1) > 1e-9

# light tangential relax in the band (pinned outside, weight-scaled) to even spacing after the radial move
N1 = NL.vertex_normals(V1, F)
cnt = np.zeros(len(V1))
for it in range(RELAX_IT):
    S = np.zeros_like(V1); cnt[:] = 0
    np.add.at(S, E[:, 0], V1[E[:, 1]]); np.add.at(S, E[:, 1], V1[E[:, 0]]); np.add.at(cnt, E[:, 0], 1); np.add.at(cnt, E[:, 1], 1)
    L = S / np.maximum(cnt, 1)[:, None] - V1
    Lt = L - N1 * (L * N1).sum(1)[:, None]
    V1[move] += 0.3 * w[move, None] * Lt[move]
moved = np.flatnonzero(np.linalg.norm(V1 - V0, axis=1) > 0)
dist = np.linalg.norm(V1 - V0, axis=1) * 1000
np.savez_compressed(W / 'neck_delta.npz', index=moved.astype(np.int64), base_co=V0[moved], new_co=V1[moved])
np.save(W / 'neck_V1.npy', V1)
# band definition for the outside-band proof: candidate vertices within BAND in s
inband = (sv > BAND[0]) & (sv < BAND[1])
band = cand & inband
res = dict(params=dict(core_mm=CORE, band_mm=BAND, sigma_mm=SIGMA, tube_mm=TUBE, throat_full_deg=THROAT_FULL, throat_zero_deg=THROAT_ZERO, relax_iterations=RELAX_IT, relax_step=0.3, jaw_ear_weight_soft=FURN_SOFT, jaw_ear_weight_frozen=FURN_HARD, displacement_smoothing_iterations=SMOOTH_IT, rounds=ROUNDS, seam_taubin_mm=SEAM, taubin_iterations=TAUBIN_IT, taubin_lambda_mu=(0.5, -0.53), tube_mask=USE_TUBE),
           moved_vertices=int(len(moved)), moved_outside_band=int((~band[moved]).sum()), furniture_moved=int((furn[moved] >= FURN_HARD).sum()),
           move_mm=dict(max=float(dist.max()), p99=float(np.quantile(dist[moved], .99)), mean=float(dist[moved].mean())),
           s_range_of_moved=[float(sv[moved].min()), float(sv[moved].max())], vertices_total=int(len(V0)))
def evaluate(V):
    H = NL.curvature(V, NL.vertex_normals(V, F), E)
    _, sv2, th2, r2, _ = NL.param(V, C, Tn, s)
    out = {}
    for t0 in range(0, 360, 30):
        m = cand & (((th - t0 + 5) % 360) < 10) & (sv > 116) & (sv < 168)
        xs = np.arange(116, 168, 2.0)
        hb = [float(H[m & (np.abs(sv - x) <= 1)].mean()) if (m & (np.abs(sv - x) <= 1)).sum() > 2 else None for x in xs]
        rb = [float(np.median(r2[m & (np.abs(sv - x) <= 1)])) if (m & (np.abs(sv - x) <= 1)).sum() > 2 else None for x in xs]
        hv = [x for x in hb if x is not None]
        if not hv: continue
        out[t0] = dict(H_min=min(hv), H_max=max(hv), r=[None if x is None else round(x, 2) for x in rb], H=[None if x is None else round(1000 * x) for x in hb])
    return out
res['eval_before'] = evaluate(V0); res['eval_after'] = evaluate(V1)
(W / 'neck_fit.json').write_text(json.dumps(res, indent=1))
print(json.dumps({k: v for k, v in res.items() if not k.startswith('eval')}))
for t0 in res['eval_before']:
    b = res['eval_before'][t0]; a = res['eval_after'][t0]
    print(t0, 'Hmin %.3f -> %.3f  Hmax %.3f -> %.3f' % (b['H_min'], a['H_min'], b['H_max'], a['H_max']))
    print('   rb', b['r']); print('   ra', a['r']); print('   Ha', a['H'])
