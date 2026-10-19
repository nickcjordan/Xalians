"""B-9cvs: crosswise station profiles along the paw's skeleton.

Stations sit on the mean of the two middle bone chains: across the knuckles, then 25, 50 and 75 percent of the arc
length from the knuckle to the ankle end of the chain (at the join). Each section plane is perpendicular to the chain
there. One panel per station, same mm scale everywhere; the new part in blue, an optional comparison mesh in grey.

Usage: python paw_part_stations.py MESH.npz PAWS.npz OUT_DIR [--cmp OTHER_MESH.npz --cmp-label LABEL --label LABEL]
Writes OUT_DIR/stations_<kind>.png and OUT_DIR/stations.json (per station: width, height, top-lobe count and depth).
"""
import sys, json, argparse, numpy as np
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, str(Path(__file__).parent))
from pawprofile_lib import section

ap = argparse.ArgumentParser(); ap.add_argument('mesh'); ap.add_argument('paws'); ap.add_argument('out')
ap.add_argument('--cmp'); ap.add_argument('--cmp-label', default='pass 4'); ap.add_argument('--label', default='pass 5'); A = ap.parse_args()
M = dict(np.load(A.mesh)); F = dict(np.load(A.paws)); C2 = dict(np.load(A.cmp)) if A.cmp else None
OUT = Path(A.out); OUT.mkdir(parents=True, exist_ok=True)
try:
    FONT = ImageFont.truetype('arial.ttf', 15); FB = ImageFont.truetype('arialbd.ttf', 17)
except Exception:
    FONT = FB = ImageFont.load_default()
res = {}


def stations(kind):
    a = F[f'{kind}_bone_C_2']; b = F[f'{kind}_bone_C_3']; C = 0.5 * (a + b)
    k0 = 3 * 8   # knuckle control point (curve index 3) in the dense chain
    C = C[k0:]; seg = np.linalg.norm(np.diff(C, axis=0), axis=1); s = np.r_[0, np.cumsum(seg)]; L = s[-1]
    out = []
    for fr in (0.0, 0.25, 0.5, 0.75):
        t = fr * L; j = min(np.searchsorted(s, t), len(C) - 2); p = C[j]; d = C[min(j + 2, len(C) - 1)] - C[max(j - 2, 0)]; d /= np.linalg.norm(d)
        out.append((fr, p, d))
    return out, L


def plane_xy(seg, p, d, lvec):
    ex = lvec - (lvec @ d) * d; ex /= np.linalg.norm(ex); ey = np.cross(d, ex)
    if ey[2] < 0: ey = -ey
    return np.stack([(seg - p) @ ex, (seg - p) @ ey], -1)


def lobes(xy):
    """Top outline across x: count local maxima (prominence >= 0.6 mm) and the mean valley depth."""
    if len(xy) == 0: return 0, 0.0
    g = np.arange(xy[..., 0].min(), xy[..., 0].max(), 0.0002); top = np.full(len(g), np.nan); a, b = xy[:, 0, 0], xy[:, 1, 0]
    for i, x in enumerate(g):
        m = (np.minimum(a, b) <= x) & (np.maximum(a, b) >= x)
        if not m.any(): continue
        f = np.where(np.abs(b[m] - a[m]) > 1e-12, (x - a[m]) / np.where(np.abs(b[m] - a[m]) > 1e-12, b[m] - a[m], 1), 0.5)
        top[i] = (xy[m, 0, 1] + (xy[m, 1, 1] - xy[m, 0, 1]) * f).max()
    ok = ~np.isnan(top); g, top = g[ok], top[ok]
    # only the upper part of the outline (above 60 percent of its height range) counts as the top
    h0 = top.min() + 0.6 * (top.max() - top.min()); pk = []; vals = []
    for i in range(3, len(top) - 3):
        if top[i] >= top[i - 3:i + 4].max() and top[i] > h0: pk.append(i)
    pk2 = []
    for i in pk:
        if not pk2 or g[i] - g[pk2[-1]] > 0.003: pk2.append(i)
        elif top[i] > top[pk2[-1]]: pk2[-1] = i
    deps = []
    for i0, i1 in zip(pk2[:-1], pk2[1:]):
        v = top[i0:i1 + 1].min(); deps.append(0.5 * (top[i0] + top[i1]) - v)
    good = [x for x in deps if x >= 0.0006]
    return len(good) + 1 if good else 1, float(np.mean(good) * 1000) if good else 0.0


for kind in ('hind', 'fore'):
    st, L = stations(kind); lvec = F[f'{kind}_l']
    V = M[f'paw_{kind}_l_V']; T = M[f'paw_{kind}_l_T']
    pw, ph, sc = 330, 330, 5.0   # px per mm
    im = Image.new('RGB', (pw * 4, ph + 70), 'white'); dr = ImageDraw.Draw(im)
    dr.text((8, 4), f'{kind} paw: crosswise stations along the middle bone line (perpendicular to it), knuckle to ankle. blue {A.label}' + (f', grey {A.cmp_label}' if C2 else '') + '. Left paw, outside at right. Grid 10 mm.', fill='black', font=FONT)
    res[kind] = dict(chain_length_mm=round(L * 1000, 1), stations=[])
    for c, (fr, p, d) in enumerate(st):
        x0 = c * pw; cy = 30 + ph // 2
        for gmm in range(-30, 31, 10):
            dr.line([(x0 + pw // 2 + gmm * sc, 30), (x0 + pw // 2 + gmm * sc, 30 + ph)], fill=(225, 225, 225)); dr.line([(x0, cy - gmm * sc), (x0 + pw, cy - gmm * sc)], fill=(225, 225, 225))
        def draw(VV, TT, col, w):
            reg = np.linalg.norm(VV - p, axis=1) < 0.06; sg = section(VV, TT, p, d, reg)
            if len(sg) == 0: return None
            xy = plane_xy(sg, p, d, lvec)
            for s_ in xy: dr.line([(x0 + pw // 2 + s_[0, 0] * 1000 * sc, cy - s_[0, 1] * 1000 * sc), (x0 + pw // 2 + s_[1, 0] * 1000 * sc, cy - s_[1, 1] * 1000 * sc)], fill=col, width=w)
            return xy
        if C2 is not None: draw(C2[f'paw_{kind}_l_V'], C2[f'paw_{kind}_l_T'], (170, 170, 170), 2)
        xy = draw(V, T, (20, 90, 200), 3)
        n, dep = lobes(xy) if xy is not None else (0, 0)
        wmm = float(np.ptp(xy[..., 0]) * 1000) if xy is not None else 0; hmm = float(np.ptp(xy[..., 1]) * 1000) if xy is not None else 0
        lab = ['across knuckles', '25% to ankle', '50% to ankle', '75% to ankle'][c]
        dr.text((x0 + 8, 34), lab, fill='black', font=FB); dr.text((x0 + 8, 30 + ph + 6), f'top lobes {n}, valley {dep:.1f} mm, {wmm:.0f} x {hmm:.0f} mm', fill='black', font=FONT)
        res[kind]['stations'].append(dict(station=lab, fraction=fr, point_mm=(p * 1000).round(1).tolist(), top_lobes=n, mean_valley_mm=round(dep, 1), width_mm=round(wmm, 1), height_mm=round(hmm, 1)))
        dr.line([(x0, 30), (x0, 30 + ph)], fill=(120, 120, 120))
    im.save(OUT / f'stations_{kind}.png')
open(OUT / 'stations.json', 'w').write(json.dumps(res, indent=1)); print(json.dumps(res))
