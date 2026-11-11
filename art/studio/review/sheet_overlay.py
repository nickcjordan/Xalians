"""Compare a board render with the model sheet at one metric scale (experiment X33).

    python art/studio/review/sheet_overlay.py overlay --render <png> --camera <id> --cameras <cameras.json>
        --scale <sheet_scale.json> --view front|side --box h0,h1,z0,z1 [--res 0.0002] --out <jpg>
    python art/studio/review/sheet_overlay.py profile --render <png> --camera <id> --cameras <cameras.json>
        --scale <sheet_scale.json> [--z 0.30,0.565,0.005] [--chart <png>]

overlay: three panels (the render, the sheet, the two blended) resampled onto one world grid, with a line every
5 cm of height. The horizontal world axis is x for the front view and y for the side view.
profile: the front edge of the side silhouette per height, sheet against render, printed in millimeters
(negative = the render stands forward of the sheet) and optionally charted (blue sheet, amber render).

sheet_scale.json holds, per view, the sheet image, the image column of world 0 on the horizontal axis, the
ground row and meters per pixel, measured once per sheet (Hypnopet: ground-to-skull-top scale; the side anchored on
the eye center). These were scratch scripts during X33 and were lost with the session scratchpad; they live here
now so later rounds can reproduce every measurement.
"""
import argparse
import json

import numpy as np
from PIL import Image, ImageDraw


def camera(cameras, cid):
    c = json.load(open(cameras, encoding='utf-8'))
    for cam in c['cameras']:
        if cam['id'] == cid:
            return cam
    raise SystemExit(f'no camera {cid!r}')


def render_mapper(render, cam, view):
    """World (h, z) to render pixel, for an orthographic camera looking along x (side) or y (front)."""
    im = Image.open(render).convert('RGB')
    n = im.size[0]
    t = cam['target']
    th = t[0] if view == 'front' else t[1]
    o = cam['orthoScale']

    def px(h, z):
        return n/2+(h-th)/o*n, n/2-(z-t[2])/o*n
    return im, px


def sheet_mapper(scale, view):
    s = scale[view]
    im = Image.open(s['sheet']).convert('RGB')

    def px(h, z):
        return s['col0']+h/s['mPerPx'], s['ground']-z/s['mPerPx']
    return im, px


def sample(im, px, H, Z):
    a = np.asarray(im)
    u, v = px(H, Z)
    u = np.clip(np.round(u).astype(int), 0, a.shape[1]-1)
    v = np.clip(np.round(v).astype(int), 0, a.shape[0]-1)
    return Image.fromarray(a[v, u])


def overlay(args):
    cam = camera(args.cameras, args.camera)
    scale = json.load(open(args.scale, encoding='utf-8'))
    h0, h1, z0, z1 = (float(t) for t in args.box.split(','))
    W, Hh = int((h1-h0)/args.res), int((z1-z0)/args.res)
    H, Z = np.meshgrid(h0+np.arange(W)*args.res, z1-np.arange(Hh)*args.res)
    A = sample(*render_mapper(args.render, cam, args.view), H, Z)
    B = sample(*sheet_mapper(scale, args.view), H, Z)
    out = Image.new('RGB', (W*3, Hh), 'white')
    out.paste(A, (0, 0))
    out.paste(B, (W, 0))
    out.paste(Image.blend(A, B, 0.5), (2*W, 0))
    d = ImageDraw.Draw(out)
    for zz in np.arange(np.ceil(z0*20)/20, z1, 0.05):
        y = (z1-zz)/args.res
        d.line([(0, y), (3*W, y)], fill=(90, 140, 230))
        d.text((3, y+2), f'z{zz:.2f}', fill=(40, 80, 200))
    for hh in np.arange(np.ceil(h0*20)/20, h1, 0.05):
        for k in range(3):
            x = (hh-h0)/args.res+k*W
            d.line([(x, 0), (x, Hh)], fill=(200, 210, 240))
    out.save(args.out, quality=88)
    print('wrote', args.out, out.size)


def front_edge_render(im, px, z, lo=-0.36, hi=-0.10):
    a = np.asarray(im, float)
    mask = np.abs(a-a[3, 3]).sum(-1) > 10
    u0, v = px(lo, z)
    u1, _ = px(hi, z)
    v = int(round(v))
    if not 0 <= v < a.shape[0]:
        return None
    cols = np.where(mask[v, max(0, int(u0)):min(a.shape[1], int(u1))])[0]
    if len(cols) == 0:
        return None
    return lo+(cols.min()+max(0, int(u0))-u0)*(hi-lo)/(u1-u0)


def front_edge_sheet(im, s, z, lo=-0.36, hi=-0.10):
    a = np.asarray(im.convert('L'), float)
    r = int(round(s['ground']-z/s['mPerPx']))
    c0, c1 = int(s['col0']+lo/s['mPerPx']), int(s['col0']+hi/s['mPerPx'])
    cols = np.where(a[r, c0:c1] < 235)[0]
    return None if len(cols) == 0 else (cols.min()+c0-s['col0'])*s['mPerPx']


def profile(args):
    cam = camera(args.cameras, args.camera)
    scale = json.load(open(args.scale, encoding='utf-8'))
    im, px = render_mapper(args.render, cam, 'side')
    sim = Image.open(scale['side']['sheet'])
    z0, z1, dz = (float(t) for t in args.z.split(','))
    rows = []
    for z in np.arange(z0, z1, dz):
        a, b = front_edge_sheet(sim, scale['side'], z), front_edge_render(im, px, z)
        rows.append((z, a, b))
        d = '' if a is None or b is None else f'{(b-a)*1000:+6.1f} mm'
        print(f'z {z:.3f}  sheet {a if a is None else round(a, 4)}  render {b if b is None else round(b, 4)}  {d}')
    if args.chart:
        W, Hh = 700, 900
        img = Image.new('RGB', (W, Hh), 'white')
        d = ImageDraw.Draw(img)

        def P(y, z):
            return ((y+0.32)/0.22*W, (0.58-z)/0.30*Hh)
        for col, k in (((40, 70, 200), 1), ((220, 140, 0), 2)):
            pts = [P(r[k], r[0]) for r in rows if r[k] is not None]
            d.line(pts, fill=col, width=3)
        for zz in np.arange(0.30, 0.58, 0.05):
            d.line([P(-0.32, zz), P(-0.10, zz)], fill=(220, 220, 230))
            d.text(P(-0.318, zz), f'z{zz:.2f}', fill=(90, 90, 90))
        d.text((10, 10), 'blue: sheet   amber: render   (front edge of the side silhouette)', fill=(0, 0, 0))
        img.save(args.chart)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('mode', choices=['overlay', 'profile'])
    ap.add_argument('--render', required=True)
    ap.add_argument('--camera', required=True)
    ap.add_argument('--cameras', required=True)
    ap.add_argument('--scale', required=True)
    ap.add_argument('--view', choices=['front', 'side'], default='side')
    ap.add_argument('--box', default='-0.30,-0.16,0.30,0.43')
    ap.add_argument('--res', type=float, default=0.0002)
    ap.add_argument('--z', default='0.30,0.565,0.005')
    ap.add_argument('--chart')
    ap.add_argument('--out')
    a = ap.parse_args()
    overlay(a) if a.mode == 'overlay' else profile(a)
