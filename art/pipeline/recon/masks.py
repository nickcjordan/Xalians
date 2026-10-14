"""Figure masks for clay views shot on a light gray ground.

    <shape-env python> art/pipeline/recon/masks.py --out <dir> --view side=<png> --view front=<png> [...]

The background is a smooth light gray gradient, so it is modelled as a quadratic surface fitted to the
image border (per channel), and a pixel is foreground when its color distance from that surface exceeds
the tolerance. A small morphological cleanup follows (open, keep large components, fill holes, close).
Writes <name>.mask.png (white figure on black), <name>.rgba.png (the RGBA image the model receives) and
<name>.overlay.png (mask edge drawn on the view, for checking by eye), plus masks.json.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def fit_background(a, border=24):
    """Quadratic surface per channel fitted to a border band of the image."""
    h, w, _ = a.shape
    yy, xx = np.mgrid[0:h, 0:w]
    band = np.zeros((h, w), bool)
    band[:border, :] = band[-border:, :] = True
    band[:, :border] = band[:, -border:] = True
    x = xx[band] / w
    y = yy[band] / h
    A = np.stack([np.ones_like(x), x, y, x * x, y * y, x * y], 1)
    X = xx / w
    Y = yy / h
    full = np.stack([np.ones_like(X), X, Y, X * X, Y * Y, X * Y], -1)
    bg = np.zeros_like(a, dtype=np.float64)
    for c in range(3):
        coef, *_ = np.linalg.lstsq(A, a[..., c][band], rcond=None)
        bg[..., c] = full @ coef
    return bg


def fill_small_holes(fg, max_area, warm=None):
    """Fill enclosed holes that are small, or (given ``warm``) warm on average like the clay (a pale muzzle)."""
    holes = ndimage.binary_fill_holes(fg) & ~fg
    lab, n = ndimage.label(holes)
    if n:
        idx = range(1, n + 1)
        sizes = ndimage.sum(holes, lab, idx)
        keep = sizes <= max_area
        if warm is not None:
            w = np.asarray(ndimage.mean(warm, lab, idx))
            keep = (keep & (w > 1.0)) | (w > 2.5)
        fg = fg | np.isin(lab, 1 + np.nonzero(keep)[0])
    return fg


def figure_mask(path, tolerance=22.0, warmth=3.5):
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(np.float64)
    bg = fit_background(a)
    dist = np.sqrt(((a - bg) ** 2).sum(-1))
    # The clay is warm gray (red above blue by 5 to 12); the ground and its cast shadow are neutral or cool.
    # A smoothed warmth map relative to the fitted background separates the figure from its shadow.
    warm = ndimage.gaussian_filter((a[..., 0] - a[..., 2]) - (bg[..., 0] - bg[..., 2]), 2.0)
    fg = (dist > tolerance) & (warm > warmth)
    fg = ndimage.binary_closing(fg, iterations=2)
    fg = ndimage.binary_opening(fg, iterations=2)
    lab, n = ndimage.label(fg)
    if n > 1:
        sizes = ndimage.sum(fg, lab, range(1, n + 1))
        fg = np.isin(lab, 1 + np.nonzero(sizes >= 0.01 * sizes.max())[0])
    fg = fill_small_holes(fg, 0.0003 * fg.size, warm=warm)
    return im, fg, float(np.median(dist[~fg])), float(np.median(dist[fg]))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--view', action='append', required=True, help='name=path')
    ap.add_argument('--tolerance', type=float, default=22.0)
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    record = {'method': 'color distance from a quadratic background fitted to the border; open 2, '
                        'warmth (R-B minus background R-B, gaussian 2) > 3.5 to drop the neutral cast shadow; close 2, open 2, '
                        'components >= 1% of the largest, fill holes under 0.03% of the image with mean warmth > 1, or any hole with mean warmth > 2.5 (pale clay, not ground)',
              'tolerance': args.tolerance, 'views': {}}
    for v in args.view:
        name, p = v.split('=', 1)
        im, fg, bgd, fgd = figure_mask(p, args.tolerance)
        mask = Image.fromarray((fg * 255).astype('uint8'), 'L')
        mask.save(args.out / f'{name}.mask.png')
        rgba = np.dstack([np.asarray(im), (fg * 255).astype('uint8')])
        Image.fromarray(rgba, 'RGBA').save(args.out / f'{name}.rgba.png')
        edge = fg ^ ndimage.binary_erosion(fg, iterations=3)
        ov = np.asarray(im).copy()
        ov[~fg] = (ov[~fg] * 0.35 + np.array([20, 60, 160]) * 0.65).astype('uint8')
        ov[edge] = [255, 170, 0]
        Image.fromarray(ov).save(args.out / f'{name}.overlay.png')
        ys, xs = np.nonzero(fg)
        lab, ncomp = ndimage.label(fg)
        record['views'][name] = {'source': str(p), 'sourceSha256': sha(p),
                                 'mask': f'{name}.mask.png', 'rgba': f'{name}.rgba.png',
                                 'rgbaSha256': sha(args.out / f'{name}.rgba.png'),
                                 'bbox': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
                                 'coverage': round(float(fg.mean()), 4), 'components': int(ncomp),
                                 'medianBgDistance': round(bgd, 2), 'medianFgDistance': round(fgd, 2)}
    (args.out / 'masks.json').write_text(json.dumps(record, indent=1), encoding='utf-8')
    print(json.dumps(record['views'], indent=1))


if __name__ == '__main__':
    main()
