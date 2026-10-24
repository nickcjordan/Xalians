"""Surface pass: white fraction of the leg silhouettes and the plume, from a side image and boxes.

python surface_measure.py OUT.json NAME=IMAGE@scale@BOXES.json ...
Each image is reduced to 192 px wide first (the sprite size) when scale is 192, else measured as is. Background luminance is
the median of the image border; a pixel is white when its luminance is above background + 10 and dark when below
background - 40 (the background, its shadow and soft fringes count as neither); the white fraction is white / (white + dark).
"""
import sys, json
import numpy as np
from PIL import Image
out = {}
for arg in sys.argv[2:]:
    name, rest = arg.split('=', 1); path, size, boxp = rest.split('@')
    im = Image.open(path).convert('RGB'); W0 = im.width
    if size != 'full': im = im.resize((int(size), round(im.height * int(size) / im.width)), Image.LANCZOS)
    s = im.width / W0
    rgb = np.asarray(im, float); a = rgb @ np.array([0.2126, 0.7152, 0.0722])
    bgc = np.median(np.r_[rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]], axis=0); bg = float(bgc @ np.array([0.2126, 0.7152, 0.0722]))
    mask = np.linalg.norm(rgb - bgc, axis=2) > 14
    res = {}
    for k, (x0, y0, x1, y1) in json.load(open(boxp)).items():
        sl_ = (slice(int(y0 * s), int(y1 * s)), slice(int(x0 * s), int(x1 * s))); p = a[sl_]; mk = mask[sl_]
        w = ((p > 140) & mk).sum(); d = ((p < 120) & mk).sum()
        res[k] = round(float(w / max(w + d, 1)), 3)
    out[name] = dict(bg=round(float(bg), 1), **res); print(name, out[name])
json.dump(out, open(sys.argv[1], 'w'), indent=1)
