"""Sprite-size check: one packet view of the whole creature scaled to game sprite height (experiment X21).

    python art/studio/sprite_check.py --image <packet>/threequarter-left.png --out <dir> [--height 192]

Crops the figure (pixels that differ from the corner background color) with a small margin, scales it to
--height pixels tall (Lanczos), and writes sprite-<height>.png plus sprite-<height>-x2.png, the same sprite
enlarged two times with nearest-neighbor sampling so its pixels can be looked at without resampling blur.
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--image', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--height', type=int, default=192)
    args = ap.parse_args()
    im = Image.open(args.image).convert('RGB')
    a = np.asarray(im).astype(int)
    bg = a[0, 0]
    mask = np.abs(a-bg).max(axis=2) > 6
    rows, cols = np.where(mask.any(axis=1))[0], np.where(mask.any(axis=0))[0]
    top, bottom, left, right = rows[0], rows[-1]+1, cols[0], cols[-1]+1
    m = max(2, int(0.02*(bottom-top)))
    box = (max(left-m, 0), max(top-m, 0), min(right+m, im.width), min(bottom+m, im.height))
    fig = im.crop(box)
    h = args.height
    w = max(1, round(fig.width*h/fig.height))
    sprite = fig.resize((w, h), Image.LANCZOS)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    sprite.save(out/f'sprite-{h}.png')
    sprite.resize((w*2, h*2), Image.NEAREST).save(out/f'sprite-{h}-x2.png')
    print(f'sprite {w}x{h} from {box} of {args.image}')


if __name__ == '__main__':
    main()
