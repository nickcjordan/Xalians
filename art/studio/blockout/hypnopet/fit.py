"""Fit of a Hypnopet blockout to the flesh views: overlays and IoU per view and per height band.

    python art/studio/blockout/hypnopet/fit.py --build <blockout dir> --packet <packet dir> \
        --cameras <cameras.json> --out <fit dir> [--label v1]

For each pair (front -> flesh-front, side-left -> flesh-side, back -> flesh-back) the blockout's silhouette
(alpha of the packet's raw render) and the target's silhouette (silhouette.py) are brought to one frame: the
same figure height F (ground to skull top, horn excluded) and the same ground row, centered on each mask's
horizontal centroid. For the render, F comes from the camera (orthographic scale) and the blockout itself:
the lowest vertex and the top of the head part. Writes <view>.png overlays (target outline blue, blockout
outline amber, fills pale; legend in the image) and fit.json (IoU overall, per band of 0.1 F, and the band
above the skull, which is the horn).
"""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

import silhouette as sil
from measure import SKULL_TOP, TARGETS

PAIRS = [('front', 'front'), ('side-left', 'side'), ('back', 'back')]
BLUE, AMBER = (30, 70, 200), (235, 160, 20)
SIZE = 900          # output frame: F maps to 0.62 * SIZE


def font(n):
    for name in ('arial.ttf', 'segoeui.ttf', 'DejaVuSans.ttf'):
        try:
            return ImageFont.truetype(name, n)
        except OSError:
            pass
    return ImageFont.load_default()


def place(mask, ground_row, F_px, out_F, out_ground):
    """Resample mask so F_px becomes out_F and ground_row lands on out_ground, centroid at SIZE/2."""
    s = out_F/F_px
    cx = np.nonzero(mask)[1].mean()
    ys, xs = np.mgrid[0:SIZE, 0:SIZE]
    src_y = (ys-out_ground)/s+ground_row
    src_x = (xs-SIZE/2)/s+cx
    return ndimage.map_coordinates(mask.astype(np.float32), [src_y, src_x], order=1, cval=0) > 0.5


def outline(m):
    return m & ~ndimage.binary_erosion(m, iterations=2)


def iou(a, b):
    u = (a | b).sum()
    return float((a & b).sum())/u if u else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--build', type=Path, required=True)
    ap.add_argument('--packet', type=Path, required=True)
    ap.add_argument('--cameras', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--label', default='')
    ap.add_argument('--skull-top', type=float, help='skull top height (m) when the head part does not own the crown '
                                                     '(a reconstructed body, experiment X30)')
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    cams = {c['id']: c for c in json.loads(a.cameras.read_text(encoding='utf-8'))['cameras']}
    res = json.loads(a.cameras.read_text(encoding='utf-8'))['resolution']
    z = np.load(a.build/'blockout.npz')
    keys = [str(k) for k in z['partKeys']]
    v = z['vertices'].astype(float)
    z_ground = float(v[:, 2].min())
    z_skull = a.skull_top if a.skull_top is not None else float(v[z['part_id'] == keys.index('head'), 2].max())
    out_F, out_ground = 0.62*SIZE, 0.93*SIZE
    result = {'label': a.label, 'zGround': round(z_ground, 4), 'zSkullTop': round(z_skull, 4), 'views': {}}
    f = font(17)
    for cam, view in PAIRS:
        tm = sil.mask(TARGETS/f'flesh-{view}.png')
        fr = sil.frame(tm)
        t = place(tm, fr['ground'], fr['ground']-SKULL_TOP[view], out_F, out_ground)
        rgba = np.asarray(Image.open(a.packet/'raw'/f'{cam}.png'))
        bm = rgba[..., 3] > 127
        c = cams[cam]
        ppm = res/c['orthoScale']
        row = lambda zz: res/2-(zz-c['target'][2])*ppm    # noqa: E731  (orthographic, world z up)
        b = place(bm, row(z_ground), (z_skull-z_ground)*ppm, out_F, out_ground)
        bands = {}
        for k in range(10):
            lo, hi = int(out_ground-(k+1)*0.1*out_F), int(out_ground-k*0.1*out_F)
            bands[f'{k/10:.1f}-{(k+1)/10:.1f}'] = round(iou(t[lo:hi], b[lo:hi]) or 0, 3)
        top = int(out_ground-out_F)
        bands['above 1.0 (horn)'] = round(iou(t[:top], b[:top]) or 0, 3)
        result['views'][view] = {'camera': cam, 'iou': round(iou(t, b), 4), 'bands': bands,
                                 'targetOnly': int((t & ~b).sum()), 'blockoutOnly': int((b & ~t).sum())}
        img = np.full((SIZE, SIZE, 3), 255, np.uint8)
        img[t & ~b] = (205, 215, 245)
        img[b & ~t] = (250, 228, 185)
        img[t & b] = (225, 225, 225)
        img[outline(t)] = BLUE
        img[outline(b)] = AMBER
        im = Image.fromarray(img)
        d = ImageDraw.Draw(im)
        for k in range(11):
            y = out_ground-k*0.1*out_F
            d.line([(0, y), (14, y)], fill=(90, 90, 90))
            d.text((18, y-9), f'{k/10:.1f} F', fill=(90, 90, 90), font=font(12))
        d.text((10, 8), f'{a.label} {view}: target {view} flesh view (blue outline, pale blue = target only)', fill=BLUE, font=f)
        d.text((10, 30), f'blockout {cam} render (amber outline, pale amber = blockout only); gray = both', fill=(150, 95, 0), font=f)
        d.text((10, 52), f'IoU {result["views"][view]["iou"]:.3f}; F = ground to skull top, horn excluded', fill=(20, 20, 20), font=f)
        im.save(a.out/f'{view}.png')
    (a.out/'fit.json').write_text(json.dumps(result, indent=1), encoding='utf-8')
    for view, r in result['views'].items():
        worst = sorted(r['bands'].items(), key=lambda kv: kv[1])[:3]
        print(f"{view:6s} IoU {r['iou']:.3f}  worst bands {worst}")


if __name__ == '__main__':
    main()
