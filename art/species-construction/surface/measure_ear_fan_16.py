"""Step 16 (D1 half-circle fan). White-tuft area and extent along each ear, painting versus a render.

Both images are the ears-front camera (the target is that render's rows 2..667).
White hair is thresholded against the blue inner-ear coat inside each ear's
inner region: the painted fan's hull, widened, which never reaches the head.
"""
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage
from scipy.spatial import ConvexHull

HERE = Path(__file__).resolve().parent
WORK = HERE.parents[2] / 'untracked/species-construction/akinza/surface/fur-steps'
BRIEFS = WORK / 'briefs'
ORIGIN = {1: np.array([649., 361.]), -1: np.array([375., 362.])}
AXIS = {1: -31.0, -1: -149.0}


def load(p, crop=False):
    a = np.asarray(Image.open(p).convert('RGB')).astype(int)
    return a[2:667] if crop else a


def white(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return (b - r < 24) & (r > 188)


def regions(fan, base):
    changed = np.abs(fan - base).sum(2) > 30
    changed = ndimage.binary_opening(changed, iterations=1)
    h, w = changed.shape
    yy, xx = np.mgrid[:h, :w]
    out = {}
    for side in (1, -1):
        half = (xx > 512) if side > 0 else (xx < 512)
        pts = np.c_[xx[changed & half], yy[changed & half]]
        hull = pts[ConvexHull(pts).vertices]
        c = hull.mean(0)
        hull = c + (hull - c) * 1.08
        mask = Image.new('L', (w, h), 0)
        ImageDraw.Draw(mask).polygon([tuple(q) for q in hull], fill=1)
        inside = np.asarray(mask).astype(bool)
        out[side] = inside
    return out


def ear_tip(base, side):
    bg = (np.abs(base - base[5, 5]).sum(2) < 12)
    h, w = bg.shape
    yy, xx = np.mgrid[:h, :w]
    axis = np.array([np.cos(np.radians(AXIS[side])), np.sin(np.radians(AXIS[side]))])
    m = ~bg & ((xx > 512) if side > 0 else (xx < 512)) & (yy < 420)
    proj = (xx[m] - ORIGIN[side][0]) * axis[0] + (yy[m] - ORIGIN[side][1]) * axis[1]
    return axis, float(proj.max())


def blue_gap(img):
    h, w = img.shape[:2]
    yy, xx = np.mgrid[:h, :w]
    head = ((xx - 512) / 140.0) ** 2 + ((yy - 395) / 175.0) ** 2 <= 1.0
    out = {}
    for side in (1, -1):
        o = ORIGIN[side]
        band = (~head) & (np.hypot(xx - o[0], yy - o[1]) < 14)
        r, b = img[..., 0], img[..., 2]
        blue = band & (b - r > 40)
        out['right' if side > 0 else 'left'] = dict(bandPixels=int(band.sum()), bluePixels=int(blue.sum()),
                                                     blueShare=round(float(blue.sum() / band.sum()), 3))
    return out


def measure(img, region, base):
    res = {}
    wm = white(img)
    for side, R in region.items():
        axis, ear_len = ear_tip(base, side)
        m = wm & R
        yy, xx = np.nonzero(m)
        proj = (xx - ORIGIN[side][0]) * axis[0] + (yy - ORIGIN[side][1]) * axis[1]
        res['right' if side > 0 else 'left'] = dict(
            whiteArea=int(m.sum()), regionArea=int(R.sum()), whiteShare=round(float(m.sum() / R.sum()), 3),
            extentPx=round(float(np.percentile(proj, 95)), 1) if len(proj) else 0.0,
            extentShareOfEar=round(float(np.percentile(proj, 95) / ear_len), 3) if len(proj) else 0.0,
            earLengthPx=round(ear_len, 1))
    return res, wm


if __name__ == '__main__':
    fan = load(BRIEFS / '16-target-D1.png')
    base = load(BRIEFS / '15-target-base.png')
    region = regions(fan, base)
    report = dict(threshold='white = (B - R < 24) and R > 188, inside each ear region (painted hull x1.08)')
    report['painting'], wp = measure(fan, region, base)
    report['paintingBlueGap'] = blue_gap(fan)
    report['base13i'], _ = measure(base, region, base)
    if len(sys.argv) > 1:
        render = load(Path(sys.argv[1]), crop=True)
        report['render'], wr = measure(render, region, base)
        report['renderBlueGap'] = blue_gap(render)
        # Three panels: painting, render, overlay (blue = painting only, amber = render only, dark = both).
        over = (render * .55 + 255 * .45).astype(np.uint8)
        allr = region[1] | region[-1]
        both = wp & wr & allr
        over[wp & ~wr & allr] = (40, 110, 230)
        over[wr & ~wp & allr] = (245, 165, 20)
        over[both] = (60, 60, 60)
        edge = allr ^ ndimage.binary_erosion(allr, iterations=2)
        over[edge] = (120, 120, 120)
        h, w = render.shape[:2]
        sheet = Image.new('RGB', (3 * w, h + 40), '#f0f0f0')
        d = ImageDraw.Draw(sheet)
        font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 24)
        for k, label in enumerate(['Target: painted D1 half-circle fan', sys.argv[3] if len(sys.argv) > 3 else 'Now: step 16 render',
                                   'White hair: blue = painting only, amber = render only, dark = both']):
            d.text((k * w + 12, 7), label, font=font, fill='#172532')
        sheet.paste(Image.fromarray(fan.astype(np.uint8)), (0, 40))
        sheet.paste(Image.fromarray(render.astype(np.uint8)), (w, 40))
        sheet.paste(Image.fromarray(over), (2 * w, 40))
        sheet.save(WORK / '16-vs-target.png')
        inter = int((wp & wr & allr).sum())
        union = int(((wp | wr) & allr).sum())
        report['overlapIoU'] = round(inter / union, 3)
    print(json.dumps(report, indent=2))
    if len(sys.argv) > 2:
        Path(sys.argv[2]).write_text(json.dumps(report, indent=2) + '\n')
