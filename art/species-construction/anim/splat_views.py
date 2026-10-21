"""Quick orthographic depth-shaded point splats of the skin with a 5 cm grid, for locating joints (no Blender).
  python splat_views.py skin.npz out.png [--box xmin,xmax,ymin,ymax,zmin,zmax] [--px 500] [--joints joints.json]
"""
import argparse
import json
import numpy as np
from PIL import Image, ImageDraw

p = argparse.ArgumentParser()
p.add_argument('npz'); p.add_argument('out')
p.add_argument('--box'); p.add_argument('--px', type=float, default=500)
p.add_argument('--joints')
p.add_argument('--views', default='front,side,top')
a = p.parse_args()
v = np.load(a.npz)['verts'].astype(float)
if a.box:
    b = list(map(float, a.box.split(',')))
    m = (v[:, 0] > b[0]) & (v[:, 0] < b[1]) & (v[:, 1] > b[2]) & (v[:, 1] < b[3]) & (v[:, 2] > b[4]) & (v[:, 2] < b[5])
    v = v[m]
J = {k: x for k, x in json.load(open(a.joints)).items() if not k.startswith('_')} if a.joints else {}
# view: (horizontal axis, sign), (vertical axis), depth axis (smaller = nearer)
VIEWS = {'front': (0, 1, 2, 1), 'side': (1, -1, 2, 0), 'top': (0, 1, 1, 2), 'back': (0, -1, 2, 1)}
panels = []
for name in a.views.split(','):
    h, hs, vert, dep = VIEWS[name]
    if name == 'top':
        X, Y, D = v[:, 0], -v[:, 1], -v[:, 2]
    elif name == 'side':
        X, Y, D = -v[:, 1], v[:, 2], -v[:, 0]   # viewed from +x: front (-y) to the left
    elif name == 'back':
        X, Y, D = -v[:, 0], v[:, 2], -v[:, 1]
    else:
        X, Y, D = v[:, 0], v[:, 2], v[:, 1]
    x0, x1, y0, y1 = X.min()-.05, X.max()+.05, Y.min()-.05, Y.max()+.05
    W, H = int((x1-x0)*a.px), int((y1-y0)*a.px)
    zb = np.full((H, W), np.inf)
    col = np.zeros((H, W))
    px = ((X-x0)*a.px).astype(int); py = ((y1-Y)*a.px).astype(int)
    order = np.argsort(-D)
    for dx in (0, 1):
        for dy in (0, 1):
            xx, yy = np.clip(px+dx, 0, W-1), np.clip(py+dy, 0, H-1)
            zb[yy[order], xx[order]] = D[order]
    ok = np.isfinite(zb)
    lo, hi = zb[ok].min(), zb[ok].max()
    img = np.full((H, W, 3), 235, np.uint8)
    shade = (40+170*(zb[ok]-lo)/(hi-lo+1e-9)).astype(np.uint8)
    img[ok] = np.stack([shade]*3, 1)
    im = Image.fromarray(img)
    d = ImageDraw.Draw(im)
    for g in np.arange(np.floor(x0*20)/20, x1, .05):
        X0 = (g-x0)*a.px
        d.line([(X0, 0), (X0, H)], fill=(120, 160, 230) if abs(g*10-round(g*10)) < 1e-6 else (200, 215, 240), width=1)
        if abs(g*10-round(g*10)) < 1e-6:
            d.text((X0+2, 2), f'{g:.1f}', fill=(30, 60, 160))
    for g in np.arange(np.floor(y0*20)/20, y1, .05):
        Y0 = (y1-g)*a.px
        d.line([(0, Y0), (W, Y0)], fill=(120, 160, 230) if abs(g*10-round(g*10)) < 1e-6 else (200, 215, 240), width=1)
        if abs(g*10-round(g*10)) < 1e-6:
            d.text((2, Y0+2), f'{g:.1f}', fill=(30, 60, 160))
    for k, j in J.items():
        j = np.array(j, float)
        if name == 'top':
            jx, jy = j[0], -j[1]
        elif name == 'side':
            jx, jy = -j[1], j[2]
        elif name == 'back':
            jx, jy = -j[0], j[2]
        else:
            jx, jy = j[0], j[2]
        cx, cy = (jx-x0)*a.px, (y1-jy)*a.px
        d.ellipse([cx-4, cy-4, cx+4, cy+4], outline=(230, 150, 0), width=2)
        d.text((cx+5, cy-5), k, fill=(200, 110, 0))
    d.text((W//2, 2), name, fill=(0, 0, 0))
    panels.append(im)
Wt = sum(p.width for p in panels)+10*len(panels)
Ht = max(p.height for p in panels)
out = Image.new('RGB', (Wt, Ht), (255, 255, 255))
x = 0
for pnl in panels:
    out.paste(pnl, (x, 0)); x += pnl.width+10
out.save(a.out)
print(a.out, out.size)
