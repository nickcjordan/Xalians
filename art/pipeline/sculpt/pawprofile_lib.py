"""B-4cj4 paw profile tools (plain numpy, no Blender): plane sections of the body mesh, toe frames, measurements, PIL plots."""
import numpy as np
from PIL import Image, ImageDraw, ImageFont

def load(npz):
    d = np.load(npz); return {k: d[k] for k in d.files}

def claws(d, kind, side='l'):
    out = []
    for i in range(1, 5):
        v = d[f'claw_{kind}_claw_{side}_{i}']; tip = v[np.argmin(v[:, 1])]
        base = v[np.argmax(np.linalg.norm(v - tip, axis=1))]
        out.append((tip, base, v))
    return out

def section(w, tris, p0, n, region=None):
    """Segments where the plane (point p0, normal n) cuts the triangles. Returns (k,2,3)."""
    t = tris if region is None else tris[region[tris].all(1)]
    s = (w[t] - p0) @ n  # (m,3)
    sg = np.sign(s); cut = (sg.min(1) < 0) & (sg.max(1) > 0); t = t[cut]; s = s[cut]; P = w[t]
    segs = []
    for e0, e1 in ((0, 1), (1, 2), (2, 0)):
        a, b = s[:, e0], s[:, e1]; m = (a * b) < 0
        f = np.where(m, a / np.where(m, a - b, 1), 0)
        segs.append((m, P[:, e0] + (P[:, e1] - P[:, e0]) * f[:, None]))
    out = []
    for i in range(len(t)):
        pts = [segs[j][1][i] for j in range(3) if segs[j][0][i]]
        if len(pts) == 2: out.append(pts)
    return np.array(out).reshape(-1, 2, 3)

def toe_lines(d, kind, pivot):
    """Per toe: start at claw tip, direction toward the ankle pivot (xy)."""
    res = []
    for tip, base, v in claws(d, kind):
        a = np.array([tip[0], tip[1]]); dv = pivot - a; L = np.linalg.norm(dv); res.append((a, dv / L, L))
    return res

def lengthwise(w, tris, a, dirv, L, extra=0.01):
    """Section along a vertical plane through xy point a with xy direction dirv. Returns segments in (s, z), s = distance from a."""
    n = np.array([-dirv[1], dirv[0], 0.0]); p0 = np.array([a[0], a[1], 0.0])
    reg = (np.abs((w[:, :2] - a) @ n[:2]) < 0.03) & (w[:, 2] < 0.12)
    seg = section(w, tris, p0, n, reg)
    s = (seg[..., :2] - a) @ dirv; z = seg[..., 2]
    keep = (s.min(1) > -0.03) & (s.max(1) < L + extra)
    return np.stack([s, z], -1)[keep]

def crosswise(w, tris, c, axis, halfw=0.06):
    """Section across the paw: plane through xy point c with normal = paw axis. Returns (v, z) with v along the width axis."""
    n = np.array([axis[0], axis[1], 0.0]); perp = np.array([-axis[1], axis[0]])
    reg = (np.abs((w[:, :2] - c) @ axis) < 0.02) & (w[:, 2] < 0.08) & (np.abs((w[:, :2] - c) @ perp) < halfw)
    seg = section(w, tris, np.array([c[0], c[1], 0]), n, reg)
    v = (seg[..., :2] - c) @ perp; return np.stack([v, seg[..., 2]], -1)

def top_profile(seg2, s_bins):
    """Max z of the section at each s (top outline)."""
    out = np.full(len(s_bins), np.nan)
    if len(seg2) == 0: return out
    for i, s in enumerate(s_bins):
        a, b = seg2[:, 0, 0], seg2[:, 1, 0]; m = (np.minimum(a, b) <= s) & (np.maximum(a, b) >= s)
        if not m.any(): continue
        sa, sb, za, zb = a[m], b[m], seg2[m, 0, 1], seg2[m, 1, 1]
        f = np.where(np.abs(sb - sa) > 1e-9, (s - sa) / np.where(np.abs(sb - sa) > 1e-9, sb - sa, 1), 0.5)
        out[i] = (za + (zb - za) * f).max()
    return out

def plot(series, path, title, xr, zr, size=(720, 300), xlabel='', marks=(), sheet=None, flipx=False):
    """series: list of (segments (k,2,2), rgb, width, label). Draws in mm with grid. marks: (x,z,label,rgb)."""
    W, H = size; pad = 40; img = Image.new('RGB', (W, H + 26), 'white'); dr = ImageDraw.Draw(img)
    sx = (W - 2 * pad) / (xr[1] - xr[0]); sz = (H - 2 * pad) / (zr[1] - zr[0]); s_ = min(sx, sz)
    def P(x, z):
        xx = (xr[1] - x) if flipx else (x - xr[0]); return (pad + xx * s_, H - pad - (z - zr[0]) * s_)
    for gx in np.arange(np.ceil(xr[0] * 200) / 200, xr[1], 0.005):
        dr.line([P(gx, zr[0]), P(gx, zr[0] + (H - 2 * pad) / s_)], fill=(232, 232, 232))
        dr.text((P(gx, zr[0])[0] - 8, H - pad + 4), f'{gx*1000:.0f}', fill=(120, 120, 120))
    for gz in np.arange(np.ceil(zr[0] * 200) / 200, zr[0] + (H - 2 * pad) / s_, 0.005):
        dr.line([P(xr[0], gz), P(xr[1], gz)], fill=(232, 232, 232)); dr.text((4, P(xr[0], gz)[1] - 6), f'{gz*1000:.0f}', fill=(120, 120, 120))
    dr.line([P(xr[0], 0), P(xr[1], 0)], fill=(90, 90, 90), width=1)
    for segs, rgb, wd, lab in series:
        for sgm in segs: dr.line([P(*sgm[0]), P(*sgm[1])], fill=rgb, width=wd)
    for x, z, lab, rgb in [m for m in marks if np.isfinite(m[0]) and np.isfinite(m[1])]:
        q = P(x, z); dr.ellipse([q[0] - 4, q[1] - 4, q[0] + 4, q[1] + 4], outline=rgb, width=2); dr.text((q[0] + 5, q[1] - 14), lab, fill=rgb)
    dr.rectangle([0, H, W, H + 26], fill=(30, 30, 30)); dr.text((6, H + 6), title + '   ' + '  '.join(f'[{l}]' for _, _, _, l in series) + '  ' + xlabel, fill='white')
    yl = 6
    for _, rgb, _, lab in series: dr.rectangle([W - 150, yl, W - 138, yl + 10], fill=rgb); dr.text((W - 132, yl), lab, fill=(40, 40, 40)); yl += 14
    if sheet is not None:
        sh = sheet.copy(); sh.thumbnail((H + 26, H + 26)); comb = Image.new('RGB', (W + sh.width + 6, H + 26), 'white'); comb.paste(img, (0, 0)); comb.paste(sh, (W + 6, 0)); img = comb
    img.save(path); return img
