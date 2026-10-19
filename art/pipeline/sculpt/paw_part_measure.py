"""B-exrv / B-xsze / B-xv9f: measurements and profile plots for the authored paw parts (plain numpy + PIL).
Usage: python paw_part_measure.py PASS_DIR [--mesh M.npz --frames paws.npz --params params.json --out DIR --build ID]
Defaults (pass 1 layout): PASS_DIR/work/final_mesh.npz, work/final/paws.npz, PASS_DIR/paw_part_params.json, out PASS_DIR.
Base sculpt from PASS_DIR/work/base.npz, sheet crops from PASS_DIR/work/sheet. Writes measurements.json and
profile_<paw>_toes.png, profile_<paw>_crosswise.png into the out dir."""
import sys, json, argparse, numpy as np
from pathlib import Path
from PIL import Image
sys.path.insert(0, str(Path(__file__).parent))
from pawprofile_lib import section, plot

ap = argparse.ArgumentParser(); ap.add_argument('pass_dir'); ap.add_argument('--mesh'); ap.add_argument('--frames'); ap.add_argument('--params')
ap.add_argument('--out'); ap.add_argument('--build', default='B-exrv'); A = ap.parse_args()
P1 = Path(A.pass_dir); W = P1 / 'work'; OUTD = Path(A.out) if A.out else P1; OUTD.mkdir(parents=True, exist_ok=True)
M = dict(np.load(A.mesh or W / 'final_mesh.npz')); F = dict(np.load(A.frames or W / 'final' / 'paws.npz')); B = dict(np.load(W / 'base.npz'))
PJ = json.loads(open(A.params or P1 / 'paw_part_params.json').read())
SHEET = {'hind': Image.open(W / 'sheet' / 'side_hind_crop.png'), 'fore': Image.open(W / 'sheet' / 'side_fore_crop.png')}
# narrowest leg width above the paw, from the pawsize board (clay A, same definition), and the join section here
ANKLE_PAWSIZE = {'hind': 43.4, 'fore': 34.8}
out = {'build_id': A.build, 'units': 'mm', 'definitions': {
    'knuckle_height': 'Highest point of each toe top within 6 to 26 mm (hind) / 5 to 22 mm (fore) behind that toe tip, measured on a vertical section along the toe.',
    'foot_top_height': 'Lowest top-surface height on the same toe section between the knuckle and 22 mm behind it (the dip behind the knuckle).',
    'paw_width': 'Extent across the paw axis of the paw mesh below 30 mm (hind) / 26 mm (fore), within 40 mm of the toe tips. Claws excluded.',
    'ankle_width': 'Narrowest leg width between paw and joint (pawsize board definition, clay A), and the width of the join section of this part.',
    'paw_length': 'Ground contact length along the paw axis: extent of mesh points below 12 mm (pawsize board definition). Claws excluded.',
    'cleft_depth_top': 'On the crosswise section through the middle knuckles: mean of the two neighbouring toe peaks minus the valley between them, per toe pair (mm).',
    'cleft_depth_front': 'On a horizontal section at 40 percent of the middle knuckle height: how far the front outline notches back between neighbouring toe fronts (mm).',
    'heel_run': 'Along the middle toe line: distance from the knuckle peak back to where the top surface first rises 4 mm above the foot-top dip (the flat foot top plus the dip). rise_start_s is that point measured behind the toe tip.'}}


def top_along(V, T, a, d, L, back=0.0):
    """Top outline (s, z) of the vertical section through xy point a with xy direction d (s grows backward from a)."""
    n = np.array([-d[1], d[0], 0.0]); reg = (np.abs((V[:, :2] - a) @ n[:2]) < 0.03) & (V[:, 2] < 0.1)
    seg = section(V, T, np.array([a[0], a[1], 0.0]), n, reg)
    s = -((seg[..., :2] - a) @ d); z = seg[..., 2]; keep = (s.min(1) > -0.03) & (s.max(1) < L)
    return np.stack([s, z], -1)[keep]


def top_profile(seg, sb):
    out = np.full(len(sb), np.nan)
    for i, s in enumerate(sb):
        a, b = seg[:, 0, 0], seg[:, 1, 0]; m = (np.minimum(a, b) <= s) & (np.maximum(a, b) >= s)
        if not m.any(): continue
        f = np.where(np.abs(b[m] - a[m]) > 1e-9, (s - a[m]) / np.where(np.abs(b[m] - a[m]) > 1e-9, b[m] - a[m], 1), 0.5)
        out[i] = (seg[m, 0, 1] + (seg[m, 1, 1] - seg[m, 0, 1]) * f).max()
    return out


for kind in ('hind', 'fore'):
    V = M[f'paw_{kind}_l_V']; T = M[f'paw_{kind}_l_T']; f = F[f'{kind}_f'][:2]; l = F[f'{kind}_l'][:2]; O = F[f'{kind}_O'][:2]
    tips = F[f'{kind}_tips'][:, :2]; dg = PJ[kind]['digits']; kn_rng = (0.006, 0.026) if kind == 'hind' else (0.005, 0.022)
    toes = []; series = []; cols = [(20, 90, 200), (230, 140, 20), (60, 60, 60), (150, 80, 200)]
    sb = np.arange(-0.005, 0.12, 0.0005)
    for i in range(4):
        spl = np.radians(dg['splay_deg'][i]); d = f * np.cos(spl) + l * np.sin(spl); d /= np.linalg.norm(d)
        a = tips[i] + d * 0.004
        seg = top_along(V, T, a, d, 0.13); prof = top_profile(seg, sb)
        m = (sb >= kn_rng[0]) & (sb <= kn_rng[1]); k = np.nanargmax(np.where(m, prof, -1)); kz, ks = prof[k], sb[k]
        m2 = (sb > ks) & (sb < ks + 0.022); j = np.nanargmin(np.where(m2, prof, 9)); fz, fs = prof[j], sb[j]
        toes.append(dict(toe=i + 1, knuckle_height=round(kz * 1000, 1), knuckle_s=round(ks * 1000, 1), foot_top_height=round(fz * 1000, 1), foot_top_s=round(fs * 1000, 1), dip=round((kz - fz) * 1000, 1)))
        series.append((seg, cols[i], 2, f'toe {i + 1}'))
        if i in (1, 2):
            beh = (sb > fs) & ~np.isnan(prof) & (prof > fz + 0.004); rs = sb[beh].min() if beh.any() else np.nan
            toes[-1]['rise_start_s'] = round(rs * 1000, 1); toes[-1]['heel_run'] = round((rs - ks) * 1000, 1)
    # current sculpt, same lines (for comparison)
    Bw = B['world']; Bt = B['tris']; cur = []
    for i in (1, 2):
        spl = np.radians(dg['splay_deg'][i]); d = f * np.cos(spl) + l * np.sin(spl); d /= np.linalg.norm(d)
        cur.append(top_along(Bw, Bt, tips[i] + d * 0.004, d, 0.13))
    sel = series + [(cur[0], (200, 200, 200), 1, 'current sculpt, toe 2 line')]
    plot(sel, OUTD / f'profile_{kind}_toes.png', f'{kind} paw: lengthwise sections along each toe (new part)', (-0.01, 0.12), (-0.003, 0.06),
         size=(900, 340), xlabel='mm behind toe tip', sheet=SHEET[kind])
    # crosswise across the knuckles
    ks_mean = np.mean([t['knuckle_s'] for t in toes]) / 1000; c = O - f * ks_mean
    perp = np.array([-f[1], f[0]]); n = np.array([f[0], f[1], 0.0])
    reg = (np.abs((V[:, :2] - c) @ f) < 0.02) & (V[:, 2] < 0.08)
    seg = section(V, T, np.array([c[0], c[1], 0]), n, reg); xs = np.stack([(seg[..., :2] - c) @ perp, seg[..., 2]], -1)
    c2 = c - f * 0.012; seg2 = section(V, T, np.array([c2[0], c2[1], 0]), n, (np.abs((V[:, :2] - c2) @ f) < 0.02) & (V[:, 2] < 0.08))
    xs2 = np.stack([(seg2[..., :2] - c2) @ perp, seg2[..., 2]], -1)
    regB = (np.abs((Bw[:, :2] - c) @ f) < 0.02) & (Bw[:, 2] < 0.08) & (Bw[:, 0] > 0)
    segB = section(Bw, Bt, np.array([c[0], c[1], 0]), n, regB); xsB = np.stack([(segB[..., :2] - c) @ perp, segB[..., 2]], -1)
    plot([(xs, (20, 90, 200), 2, 'new: across knuckles'), (xs2, (230, 140, 20), 2, 'new: 12 mm behind'), (xsB, (190, 190, 190), 1, 'current sculpt, same plane')],
         OUTD / f'profile_{kind}_crosswise.png', f'{kind} paw: crosswise sections (left paw, outside at right)', (-0.06, 0.06), (-0.003, 0.05), size=(900, 340), xlabel='mm across', sheet=SHEET[kind])
    # cleft depth on top: top envelope of the knuckle section, peaks near each toe, valleys between neighbours
    def envelope(xz, grid, lo=True):
        out = np.full(len(grid), np.nan); a, b = xz[:, 0, 0], xz[:, 1, 0]
        for k_, g_ in enumerate(grid):
            mm = (np.minimum(a, b) <= g_) & (np.maximum(a, b) >= g_)
            if not mm.any(): continue
            t_ = np.where(np.abs(b[mm] - a[mm]) > 1e-12, (g_ - a[mm]) / np.where(np.abs(b[mm] - a[mm]) > 1e-12, b[mm] - a[mm], 1), 0.5)
            out[k_] = (xz[mm, 0, 1] + (xz[mm, 1, 1] - xz[mm, 0, 1]) * t_).max()
        return out
    def notch_depths(grid, env, centres, win=0.004):
        pk = []
        for cc in centres:
            mm = np.abs(grid - cc) < win; j_ = np.nanargmax(np.where(mm, env, -9)); pk.append((grid[j_], env[j_]))
        dep = []
        for (x0, z0), (x1, z1) in zip(pk[:-1], pk[1:]):
            mm = (grid > x0) & (grid < x1); dep.append(round(float((0.5 * (z0 + z1) - np.nanmin(np.where(mm, env, 9))) * 1000), 1))
        return dep
    S_ = PJ[kind].get('size', 1.0); vs = [x * S_ / 1000 for x in dg['v']]
    gx = np.arange(-0.05, 0.05, 0.00025); envt = envelope(xs, gx)
    cleft_top = notch_depths(gx, envt, vs)
    # B-xv9f: per-toe width (valley to valley across the knuckles; outer toes run to the outer edge of the section above
    # half the toe's knuckle height), height (knuckle top above the ground) and length (knuckle peak to the front-most
    # point of the toe on its lengthwise line, claws excluded)
    pk = []
    for cc in vs:
        mm_ = np.abs(gx - cc) < 0.004; pk.append(gx[np.nanargmax(np.where(mm_, envt, -9))])
    val = []
    for x0, x1 in zip(pk[:-1], pk[1:]):
        mm_ = (gx > x0) & (gx < x1); val.append(gx[np.nanargmin(np.where(mm_, envt, 9))])
    for i_ in range(4):
        hz = 0.5 * toes[i_]['knuckle_height'] / 1000; ok_ = ~np.isnan(envt) & (envt > hz)
        lo_ = val[i_ - 1] if i_ > 0 else gx[ok_].min(); hi_ = val[i_] if i_ < 3 else gx[ok_].max()
        toes[i_]['width'] = round(float(hi_ - lo_) * 1000, 1); toes[i_]['height'] = toes[i_]['knuckle_height']
        sl = series[i_][0]; sfront = float(sl[..., 0].min()) * 1000
        toes[i_]['length'] = round(toes[i_]['knuckle_s'] - sfront, 1)
        toes[i_]['length_over_width'] = round(toes[i_]['length'] / toes[i_]['width'], 2); toes[i_]['height_over_width'] = round(toes[i_]['height'] / toes[i_]['width'], 2)
    # cleft depth at the front: horizontal section, front outline along f as a function of lateral position
    zf_ = 0.4 * np.mean([toes[1]['knuckle_height'], toes[2]['knuckle_height']]) / 1000
    regH = (np.abs(V[:, 2] - zf_) < 0.01)
    segH = section(V, T, np.array([0, 0, zf_]), np.array([0, 0, 1.0]), regH)
    xh = np.stack([(segH[..., :2] - O) @ l, (segH[..., :2] - O) @ f], -1)
    tipl = [(tp - O) @ l for tp in tips]
    envf = envelope(xh, gx); cleft_front = notch_depths(gx, envf, tipl)
    # width, length
    u = (V[:, :2] - O) @ f; v = (V[:, :2] - O) @ l
    zmax = (0.030 if kind == 'hind' else 0.026) * S_; m = (V[:, 2] < zmax) & (u > -0.040 * S_)
    width = (v[m].max() - v[m].min()) * 1000
    g = V[:, 2] < 0.012; length = (u[g].max() - u[g].min()) * 1000
    sec_w = None
    try:
        info = json.loads(open(W / 'final' / 'paws.npz.json').read())[kind]; sec_w = round(info['section_width_mm'], 1); sec_ax = [round(x, 1) for x in info['section_half_axes_mm']]
    except Exception:
        sec_ax = None
    wr = json.loads(open(W / '..' / '..' / '..' / 'luceras-pawsize' / 'pass1' / 'measurements.json').read())['clay']['A'][f'{kind}_l']
    out[kind] = dict(cleft_depth_top=cleft_top, cleft_depth_top_mean=round(float(np.mean(cleft_top)), 1), cleft_depth_front=cleft_front,
                     cleft_depth_front_mean=round(float(np.mean(cleft_front)), 1),
                     toe_dims=[{k_: t_[k_] for k_ in ('toe', 'width', 'height', 'length', 'length_over_width', 'height_over_width')} for t_ in toes], front_section_z_mm=round(zf_ * 1000, 1),
                     heel_run_middle_toes=round(float(np.mean([toes[1]['heel_run'], toes[2]['heel_run']])), 1),
                     rise_start_s_middle_toes=round(float(np.mean([toes[1]['rise_start_s'], toes[2]['rise_start_s']])), 1), toes=toes, knuckle_height_max=max(t['knuckle_height'] for t in toes), knuckle_height_middle_toes=round(np.mean([toes[1]['knuckle_height'], toes[2]['knuckle_height']]), 1),
                     foot_top_height_middle_toes=round(np.mean([toes[1]['foot_top_height'], toes[2]['foot_top_height']]), 1),
                     paw_width=round(width, 1), ankle_width_narrowest=ANKLE_PAWSIZE[kind], join_section_width=sec_w, join_section_half_axes=sec_ax,
                     width_over_ankle=round(width / ANKLE_PAWSIZE[kind], 2), paw_length_ground=round(length, 1),
                     current_sculpt=dict(paw_width=round(wr['paw_width_m'] * 1000, 1), paw_length_ground=round(wr['paw_length_ground_m'] * 1000, 1), width_over_ankle=round(wr['width_ratio'], 2)))
    # B-hxde: the PASS4 table ratios against the leg width just above the paw (side view; pawsize board narrowest leg width)
    o_ = out[kind]; lw_ = ANKLE_PAWSIZE[kind]; SHEET_R = {'hind': (0.8, 2.5), 'fore': (1.0, 2.0)}[kind]
    o_['sheet_ratios'] = dict(leg_width=lw_, height_over_leg=round(o_['knuckle_height_middle_toes'] / lw_, 2), length_over_leg=round(o_['paw_length_ground'] / lw_, 2),
                             sheet_height_over_leg=SHEET_R[0], sheet_length_over_leg=SHEET_R[1],
                             dip_middle_toes=round(o_['knuckle_height_middle_toes'] - o_['foot_top_height_middle_toes'], 1))
out['hind_over_fore_width'] = round(out['hind']['paw_width'] / out['fore']['paw_width'], 2)
open(OUTD / 'measurements.json', 'w').write(json.dumps(out, indent=1)); print(json.dumps({k: {kk: vv for kk, vv in v.items() if kk != 'toes'} if isinstance(v, dict) and 'toes' in v else v for k, v in out.items() if k != 'definitions'}, indent=1))
