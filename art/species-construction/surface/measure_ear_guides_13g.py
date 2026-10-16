"""Measure rendered linear luminance in fixed cheek and tuft-root samples."""
import json
import sys
from pathlib import Path
import numpy as np
from scipy.spatial import ConvexHull
from scipy.ndimage import binary_erosion
from PIL import Image, ImageDraw

after = Path(sys.argv[1])
im = Image.open(after / 'r/ears-front.png').convert('RGB')
rgb = np.array(im) / 255
linear = np.where(rgb <= .04045, rgb / 12.92, ((rgb + .055) / 1.055) ** 2.4)
luminance = linear @ np.array([.2126, .7152, .0722])
w, h = im.size
scale = w / 1.35
el = np.deg2rad(3)
up = np.array([0, np.sin(el), np.cos(el)])
target = np.array([0, -.02, .74])

def project(p):
    p = np.asarray(p) - target
    return np.column_stack([w / 2 + p[:, 0] * scale, h / 2 - (p @ up) * scale])

def polygon_mask(q):
    mask = Image.new('1', im.size)
    ImageDraw.Draw(mask).polygon([tuple(v) for v in q], fill=1)
    return binary_erosion(np.array(mask), iterations=2)

guides = np.load(after / 'guide-evidence.npz')['guides']
report = dict(method='Mean Rec.709 linear luminance from native T7 front image; fixed 9 mm cheek disks and eroded guide-root-half hulls', samples={})
draw = ImageDraw.Draw(im)
for side, guide_set in [(-1, guides[:14]), (1, guides[14:])]:
    cheek_center = project([[side * .105, -.15, .565]])[0]
    yy, xx = np.mgrid[:h, :w]
    cheek = (xx - cheek_center[0]) ** 2 + (yy - cheek_center[1]) ** 2 < (.009 * scale) ** 2
    q = project(guide_set[:, 2:8].reshape(-1, 3))
    hull = q[ConvexHull(q).vertices]
    tuft = polygon_mask(hull)
    a = float(luminance[cheek].mean())
    b = float(luminance[tuft].mean())
    report['samples']['left' if side < 0 else 'right'] = dict(
        cheekLinearLuminance=a, tuftLinearLuminance=b, ratio=b / a,
        relativeDifference=abs(b / a - 1), cheekPixels=int(cheek.sum()),
        tuftPixels=int(tuft.sum()), cheekCenter=cheek_center.tolist(), tuftHull=hull.tolist(),
        cheekMeanRGB=(rgb[cheek].mean(0) * 255).tolist(), tuftMeanRGB=(rgb[tuft].mean(0) * 255).tolist())
    r = .009 * scale
    draw.ellipse((cheek_center[0] - r, cheek_center[1] - r, cheek_center[0] + r, cheek_center[1] + r), outline='#338dcc', width=2)
    draw.line([tuple(v) for v in np.vstack([hull, hull[0]])], fill='#db9b24', width=2)
report['withinFivePercent'] = all(v['relativeDifference'] <= .05 for v in report['samples'].values())
(after / 'luminance.json').write_text(json.dumps(report, indent=2) + '\n')
im.save(after / 'luminance-samples.png')
print(json.dumps(report, indent=2))
