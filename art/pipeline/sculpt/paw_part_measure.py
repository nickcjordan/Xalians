"""B-exrv: measurements and profile plots for the authored paw parts (plain numpy + PIL).
Usage: python paw_part_measure.py PASS1_DIR
Reads work/final_mesh.npz (Blender export of the final objects), work/final/paws.npz (paw frames) and work/base.npz (current sculpt).
Writes measurements.json and profile_<paw>_toes.png, profile_<paw>_crosswise.png."""
import sys, json, numpy as np
from pathlib import Path
from PIL import Image
sys.path.insert(0, str(Path(__file__).parent))
from pawprofile_lib import section, plot

P1 = Path(sys.argv[1]); W = P1 / 'work'
M = dict(np.load(W / 'final_mesh.npz')); F = dict(np.load(W / 'final' / 'paws.npz')); B = dict(np.load(W / 'base.npz'))
PJ = json.loads(open(P1 / 'paw_part_params.json').read())
SHEET = {'hind': Image.open(W / 'sheet' / 'side_hind_crop.png'), 'fore': Image.open(W / 'sheet' / 'side_fore_crop.png')}
# narrowest leg width above the paw, from the pawsize board (clay A, same definition), and the join section here
ANKLE_PAWSIZE = {'hind': 43.4, 'fore': 34.8}
out = {'build_id': 'B-exrv', 'units': 'mm', 'definitions': {
    'knuckle_height': 'Highest point of each toe top within 6 to 26 mm (hind) / 5 to 22 mm (fore) behind that toe tip, measured on a vertical section along the toe.',
    'foot_top_height': 'Lowest top-surface height on the same toe section between the knuckle and 22 mm behind it (the dip behind the knuckle).',
    'paw_width': 'Extent across the paw axis of the paw mesh below 30 mm (hind) / 26 mm (fore), within 40 mm of the toe tips. Claws excluded.',
    'ankle_width': 'Narrowest leg width between paw and joint (pawsize board definition, clay A), and the width of the join section of this part.',
    'paw_length': 'Ground contact length along the paw axis: extent of mesh points below 12 mm (pawsize board definition). Claws excluded.'}}


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
    # current sculpt, same lines (for comparison)
    Bw = B['world']; Bt = B['tris']; cur = []
    for i in (1, 2):
        spl = np.radians(dg['splay_deg'][i]); d = f * np.cos(spl) + l * np.sin(spl); d /= np.linalg.norm(d)
        cur.append(top_along(Bw, Bt, tips[i] + d * 0.004, d, 0.13))
    sel = series + [(cur[0], (200, 200, 200), 1, 'current sculpt, toe 2 line')]
    plot(sel, P1 / f'profile_{kind}_toes.png', f'{kind} paw: lengthwise sections along each toe (new part)', (-0.01, 0.12), (-0.003, 0.06),
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
         P1 / f'profile_{kind}_crosswise.png', f'{kind} paw: crosswise sections (left paw, outside at right)', (-0.06, 0.06), (-0.003, 0.05), size=(900, 340), xlabel='mm across', sheet=SHEET[kind])
    # width, length
    u = (V[:, :2] - O) @ f; v = (V[:, :2] - O) @ l
    zmax = 0.030 if kind == 'hind' else 0.026; m = (V[:, 2] < zmax) & (u > -0.040)
    width = (v[m].max() - v[m].min()) * 1000
    g = V[:, 2] < 0.012; length = (u[g].max() - u[g].min()) * 1000
    sec_w = None
    try:
        info = json.loads(open(W / 'final' / 'paws.npz.json').read())[kind]; sec_w = round(info['section_width_mm'], 1); sec_ax = [round(x, 1) for x in info['section_half_axes_mm']]
    except Exception:
        sec_ax = None
    wr = json.loads(open(W / '..' / '..' / '..' / 'luceras-pawsize' / 'pass1' / 'measurements.json').read())['clay']['A'][f'{kind}_l']
    out[kind] = dict(toes=toes, knuckle_height_max=max(t['knuckle_height'] for t in toes), knuckle_height_middle_toes=round(np.mean([toes[1]['knuckle_height'], toes[2]['knuckle_height']]), 1),
                     foot_top_height_middle_toes=round(np.mean([toes[1]['foot_top_height'], toes[2]['foot_top_height']]), 1),
                     paw_width=round(width, 1), ankle_width_narrowest=ANKLE_PAWSIZE[kind], join_section_width=sec_w, join_section_half_axes=sec_ax,
                     width_over_ankle=round(width / ANKLE_PAWSIZE[kind], 2), paw_length_ground=round(length, 1),
                     current_sculpt=dict(paw_width=round(wr['paw_width_m'] * 1000, 1), paw_length_ground=round(wr['paw_length_ground_m'] * 1000, 1), width_over_ankle=round(wr['width_ratio'], 2)))
out['hind_over_fore_width'] = round(out['hind']['paw_width'] / out['fore']['paw_width'], 2)
open(P1 / 'measurements.json', 'w').write(json.dumps(out, indent=1)); print(json.dumps({k: {kk: vv for kk, vv in v.items() if kk != 'toes'} if isinstance(v, dict) and 'toes' in v else v for k, v in out.items() if k != 'definitions'}, indent=1))
