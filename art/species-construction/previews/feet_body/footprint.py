"""Plan-view footprint of the -x hind foot: the sole (z -.935 to -.925) and the ankle (z -.83), current against a preview.

python footprint.py <probe.npz> <preview.npz> <out.png>
Drawn as rasterized sections (points splatted, closed with a max filter), so the outline is exact to about one pixel.
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

P = np.load(sys.argv[1]); v0 = P['v']; v1 = np.load(sys.argv[2])['skin']
S, PAD, TOP = 1100, 50, 120
font = ImageFont.truetype('arial.ttf', 21)
x0, x1, y0, y1 = -0.53, -0.25, -0.17, 0.11
sc = (S-2*PAD)/max(x1-x0, y1-y0)


def mask(v, z0, z1):
    sel = (v0[:, 0] < -0.2) & (v0[:, 2] > z0) & (v0[:, 2] < z1)
    p = v[sel][:, :2]
    m = Image.new('L', (S, S), 0); d = ImageDraw.Draw(m)
    for x, y in p:
        X, Y = PAD+(x-x0)*sc, PAD+(y-y0)*sc
        d.point((X, Y), fill=255)
    m = m.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MaxFilter(9))
    # fill the interior: flood from the corner, invert
    ImageDraw.floodfill(m, (0, 0), 128)
    m = m.point(lambda t: 0 if t == 128 else 255)
    return m.filter(ImageFilter.MinFilter(9)).filter(ImageFilter.MinFilter(7))


def edge(m, w):
    return ImageChops.difference(m.filter(ImageFilter.MaxFilter(w)), m)


img = Image.new('RGB', (S, S+TOP), 'white')
canvas = Image.new('RGB', (S, S), 'white')
cur, new = mask(v0, -0.935, -0.925), mask(v1, -0.935, -0.925)
ca, na = mask(v0, -0.835, -0.825), mask(v1, -0.835, -0.825)
canvas.paste((205, 205, 205), mask=cur)
canvas.paste((150, 150, 150), mask=ca)
canvas.paste((25, 85, 200), mask=edge(new, 7))
canvas.paste((25, 85, 200), mask=edge(na, 3))
img.paste(canvas, (0, TOP))
d = ImageDraw.Draw(img)
d.text((20, 12), 'Left hind foot seen from above: front at the top, the body centre to the right.', fill=0, font=font)
d.text((20, 40), 'Grey fill: current sole (light) and ankle (dark), assembled-3179.', fill=0, font=font)
d.text((20, 68), 'Blue outlines: the proposal (foot narrowed about the ankle, ball moved under it, sole edge rounded).', fill=0, font=font)
a = (PAD+0.02*sc, TOP+PAD+0.26*sc)
d.line([a, (a[0]+0.05*sc, a[1])], fill=0, width=4)
d.text((a[0], a[1]+8), '0.05 world units (2.7 percent of figure height)', fill=0, font=font)
img.save(sys.argv[3])
