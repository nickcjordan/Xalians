"""Crop each listed frame around the creature (review aid). python zoom.py FRAMES_DIR OUT.png f1,f2,... [half_w half_h]"""
import sys
import numpy as np
from PIL import Image
d, out, fs = sys.argv[1], sys.argv[2], [int(x) for x in sys.argv[3].split(',')]
hw = int(sys.argv[4]) if len(sys.argv) > 4 else 110; hh = int(sys.argv[5]) if len(sys.argv) > 5 else 90
tiles = []
for f in fs:
    im = Image.open(f'{d}/{f:04d}.png').convert('RGB'); a = np.asarray(im.convert('L')).astype(int)
    ys, xs = np.where(a > 110)
    cx, cy = int(xs.mean()), int(ys.mean())
    x0 = min(max(0, cx - hw), im.width - 2 * hw); y0 = min(max(0, cy - hh), im.height - 2 * hh)
    tiles.append(im.crop((x0, y0, x0 + 2 * hw, y0 + 2 * hh)).resize((4 * hw, 4 * hh), Image.LANCZOS))
cols = 4; rows = (len(tiles) + cols - 1) // cols
S = Image.new('RGB', (cols * 4 * hw, rows * 4 * hh), (20, 20, 20))
for i, t in enumerate(tiles): S.paste(t, ((i % cols) * 4 * hw, (i // cols) * 4 * hh))
S.save(out)
