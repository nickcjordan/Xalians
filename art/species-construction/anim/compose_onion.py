"""Onion-skin key sheet from rendered clay frames (batch 2 faint fix pass 9): the frames' silhouettes laid over each other on the
render's own background, each frame's outline tinted along a blue-to-amber ramp that also steps up in lightness (so the order
reads without hue), the last frame drawn solid, a frame label at each silhouette's top, plus a strip of the frames themselves.

  python art/species-construction/anim/compose_onion.py <frames dir (side PNGs 0000.png ...)> <out png> --frames 0-20[:step]
      [--title text] [--bg 66]
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def ramp(t):
    """Blue (dark) to amber (light): hue as reinforcement only, the lightness carries the order."""
    a, b = np.array([60., 110., 230.]), np.array([255., 200., 90.])
    return tuple(int(x) for x in (a+(b-a)*t))


def main():
    p = argparse.ArgumentParser()
    p.add_argument('frames', type=Path)
    p.add_argument('out', type=Path)
    p.add_argument('--frames', dest='spec', default='0-20')
    p.add_argument('--title', default='')
    p.add_argument('--bg', type=int, default=66)
    a = p.parse_args()
    rng, _, step = a.spec.partition(':')
    f0, f1 = (int(x) for x in rng.split('-'))
    fs = list(range(f0, f1+1, int(step) if step else 1))
    ims = [Image.open(a.frames/f'{f:04d}.png').convert('RGB') for f in fs]
    W, H = ims[0].size
    base = np.full((H, W, 3), 30., np.float32)
    canvas = Image.fromarray(base.astype(np.uint8))
    dr = ImageDraw.Draw(canvas)
    for i, (f, im) in enumerate(zip(fs, ims)):
        arr = np.asarray(im).astype(np.int16)
        mask = (np.abs(arr-a.bg).max(2) > 6)
        m = Image.fromarray((mask*255).astype(np.uint8))
        edge = np.asarray(m.filter(ImageFilter.FIND_EDGES)) > 0
        t = i/max(1, len(fs)-1)
        col = np.array(ramp(t), np.float32)
        c = np.asarray(canvas).astype(np.float32)
        if i == len(fs)-1:
            c[mask] = np.asarray(im)[mask]*.85+col*.15
        else:
            c[mask] = c[mask]*.75+col*.25*(.4+.6*t)
        c[edge] = col
        canvas = Image.fromarray(c.clip(0, 255).astype(np.uint8))
        dr = ImageDraw.Draw(canvas)
        ys, xs = np.nonzero(mask)
        if len(ys):
            k = np.argmin(ys)
            dr.text((int(xs[k])+4+(i % 2)*16, max(0, int(ys[k])-12)), f'{f}', fill=ramp(t))
    strip_h = H//4
    tiles = [im.resize((W//4, strip_h)) for im in ims]
    cols = 7
    rows = (len(tiles)+cols-1)//cols
    sheet = Image.new('RGB', (max(W, cols*(W//4)), 28+H+rows*(strip_h+14)), (14, 14, 14))
    sd = ImageDraw.Draw(sheet)
    sd.text((8, 8), a.title or f'onion skin, frames {fs[0]} to {fs[-1]} (dark blue earliest, light amber latest; last frame solid)', fill=(235, 235, 235))
    sheet.paste(canvas, (0, 28))
    for i, (f, tl) in enumerate(zip(fs, tiles)):
        x, y = (i % cols)*(W//4), 28+H+(i//cols)*(strip_h+14)
        sheet.paste(tl, (x, y+14))
        sd.text((x+4, y), f'f{f}', fill=ramp(i/max(1, len(fs)-1)))
    sheet.save(a.out)
    print('wrote', a.out, sheet.size)


if __name__ == '__main__':
    main()
