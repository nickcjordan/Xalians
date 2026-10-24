"""Luceras sprites: downscale 4x RGBA masters (straight alpha PNG from Blender) to the 1x cell, and compare filters.

Library use: downscale(master_rgba_uint8, factor, method) -> straight-alpha uint8 RGBA.
  'premult_box'      premultiply, average each factor x factor block, unpremultiply (area filter, no ringing)  [default]
  'premult_lanczos'  premultiply, Lanczos per channel, clamp, unpremultiply
  'straight_box'     average straight colour and alpha separately (the naive path; pulls in the colour stored under
                     transparent pixels, which Blender writes as black)
CLI: python sprite_downscale.py compare MASTER.png FACTOR OUTDIR   -> fringe metrics JSON + composites
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image

LUM = np.array([0.2126, 0.7152, 0.0722])


def downscale(a, k, method='premult_box'):
    a = a.astype(np.float64) / 255.0; H, W = a.shape[0] // k * k, a.shape[1] // k * k; a = a[:H, :W]
    rgb, al = a[..., :3], a[..., 3:4]
    if method == 'straight_box':
        o_rgb = rgb.reshape(H // k, k, W // k, k, 3).mean((1, 3)); o_al = al.reshape(H // k, k, W // k, k, 1).mean((1, 3))
    elif method == 'premult_box':
        pm = rgb * al; o_pm = pm.reshape(H // k, k, W // k, k, 3).mean((1, 3)); o_al = al.reshape(H // k, k, W // k, k, 1).mean((1, 3))
        o_rgb = np.where(o_al > 1e-6, o_pm / np.maximum(o_al, 1e-6), 0.0)
    elif method == 'premult_lanczos':
        pm = rgb * al; size = (W // k, H // k)
        ch = [np.asarray(Image.fromarray(pm[..., i].astype(np.float32), 'F').resize(size, Image.LANCZOS)) for i in range(3)]
        o_al = np.clip(np.asarray(Image.fromarray(al[..., 0].astype(np.float32), 'F').resize(size, Image.LANCZOS)), 0, 1)[..., None]
        o_pm = np.clip(np.stack(ch, -1), 0, None); o_rgb = np.where(o_al > 1e-6, o_pm / np.maximum(o_al, 1e-6), 0.0)
    else:
        raise ValueError(method)
    out = np.concatenate([np.clip(o_rgb, 0, 1), np.clip(o_al, 0, 1)], -1)
    return (out * 255.0 + 0.5).astype(np.uint8)


def composite(a, bg):
    a = a.astype(np.float64) / 255.0; c = a[..., :3] * a[..., 3:4] + np.array(bg)[None, None, :] / 255.0 * (1 - a[..., 3:4])
    return (np.clip(c, 0, 1) * 255 + 0.5).astype(np.uint8)


def fringe(a):
    """Edge pixels (5..95 % alpha): their straight colour luminance against the opaque pixels within 2 px. A dark
    fringe shows as a negative difference; a halo as a positive one."""
    from numpy.lib.stride_tricks import sliding_window_view
    al = a[..., 3] / 255.0; L = (a[..., :3] / 255.0) @ LUM
    op = (al > 0.98).astype(float); pad = np.pad(op, 2); padL = np.pad(L * op, 2)
    cnt = sliding_window_view(pad, (5, 5)).sum((-1, -2)); sm = sliding_window_view(padL, (5, 5)).sum((-1, -2))
    edge = (al > 0.05) & (al < 0.95) & (cnt > 0)
    d = L[edge] - sm[edge] / cnt[edge]
    return dict(edge_pixels=int(edge.sum()), mean_lum_diff=round(float(d.mean()), 4), p10_lum_diff=round(float(np.percentile(d, 10)), 4),
                share_darker_than_0p15=round(float((d < -0.15).mean()), 4), share_brighter_than_0p15=round(float((d > 0.15).mean()), 4))


if __name__ == '__main__' and sys.argv[1] == 'compare':
    src, k, od = sys.argv[2], int(sys.argv[3]), Path(sys.argv[4]); od.mkdir(parents=True, exist_ok=True)
    m = np.asarray(Image.open(src).convert('RGBA')); res = {'master_transparent_rgb_mean': (m[m[..., 3] == 0][:, :3].mean(0).round(2).tolist() if (m[..., 3] == 0).any() else None)}
    tiles = []
    for meth in ('straight_box', 'premult_box', 'premult_lanczos'):
        o = downscale(m, k, meth); res[meth] = fringe(o); Image.fromarray(o).save(od / f'{meth}.png')
        tiles.append([composite(o, (128, 128, 128)), composite(o, (24, 24, 28))])
    json.dump(res, open(od / 'fringe.json', 'w'), indent=1); print(json.dumps(res, indent=1))
    # crop around the plume tip (leftmost alpha) and the horn (rightmost) at 4x zoom for the eye
    o = downscale(m, k); ys, xs = np.where(o[..., 3] > 8)
    for name, (cx, cy) in (('plume', (xs.min() + 40, ys[np.argmin(xs)])), ('horn', (xs.max() - 40, ys[np.argmax(xs)]))):
        x0, y0 = max(0, cx - 50), max(0, cy - 50); rows = []
        for t in tiles:
            rows.append(np.concatenate([np.asarray(Image.fromarray(c[y0:y0 + 100, x0:x0 + 100]).resize((400, 400), Image.NEAREST)) for c in t], 1))
        Image.fromarray(np.concatenate(rows, 0)).save(od / f'crop_{name}.png')
