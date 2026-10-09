"""Flat swatch of the tiger stripe function (tiger_stripes.py, pattern kind 'tiger4') over the trunk's unrolled coordinates.

x: angle around the body, left belly -> back midline (center) -> right belly
y: height in row periods. The same function drives the shader in render_surface.py, so tune here first.
The pale underside is drawn the way build_surface.py makes it: a wavy edge near angle 2.1 where the stripes
narrow to points (pass --no-field to see the bare function).
  python art/species-construction/surface/stripe_swatch.py <out.png> [--palette T4] [--rows 12] [--no-field]
The image stacks the back view (spine down the middle) over the right flank seen from the side (spine on top).
"""
import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

import tiger_stripes as ts

HERE = Path(__file__).resolve().parent


def hexrgb(s):
    s = s.lstrip('#')
    return np.array([int(s[i:i+2], 16) for i in (0, 2, 4)], float)


RAD_PER_ROW = 0.48  # on the trunk one row period (0.075 of the stripe axis) spans about 0.48 radians of arc


def swatch(params, W=1400, H=None, rows=10.0, field=True, coat='#F8FAFD', blue='#93C4E8', flank=False):
    """Back view (flank False): x is the angle from the left belly through the spine to the right belly, y is rows.
    Flank view: the right flank as seen from the side, spine along the top, belly at the bottom, rows along x."""
    X = ts.NumpyOps(np)
    if flank:
        H = H or int(W*np.pi/(RAD_PER_ROW*rows))
        th = np.linspace(0.0, np.pi, H)[:, None].repeat(W, 1)
        h = np.linspace(0, rows, W)[None, :].repeat(H, 0)
    else:
        H = H or int(W*rows*RAD_PER_ROW/(2*np.pi))
        th = np.linspace(-np.pi, np.pi, W)[None, :].repeat(H, 0)
        h = np.linspace(rows, 0, H)[:, None].repeat(W, 1)
    a = np.abs(th)
    side = (th > 0).astype(float)
    edge = 10.0
    if field:  # stand-in for build_surface's stored field edge angle (fielda): about 2.15 with a wave
        edge = 2.15+0.14*np.sin(h*1.9+side*2.0)+0.07*np.sin(h*4.3)
        belly = ts.sm(X, (a-edge)/0.4, 0.0, 1.0)
    f = ts.stripe(X, a, side, h, params, edge)
    img = hexrgb(coat)[None, None, :]*(1-f[..., None])+hexrgb(blue)[None, None, :]*f[..., None]
    if field:  # a faint line on the pale field edge so the swatch shows where it is
        img = img-np.clip(1-np.abs(belly-0.02)/0.02, 0, 1)[..., None]*6
    return np.clip(img, 0, 255).astype(np.uint8)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('out')
    ap.add_argument('--palette', default='T4')
    ap.add_argument('--rows', type=float, default=10.0)
    ap.add_argument('--no-field', action='store_true')
    args = ap.parse_args()
    pals = json.loads((HERE/'akinza-palettes.json').read_text())
    pal = pals.get(args.palette, {})
    params = pal.get('patternParams', {})
    kw = dict(field=not args.no_field, coat=pal.get('coat', '#F8FAFD'), blue=pal.get('blue', '#93C4E8'))
    back = swatch(params, rows=args.rows, **kw)
    flank = swatch(params, rows=args.rows*2, flank=True, **kw)
    gap = np.full((24, back.shape[1], 3), 200, np.uint8)
    Image.fromarray(np.concatenate([back, gap, flank], 0)).save(args.out)
