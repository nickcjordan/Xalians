"""Render traced SVGs beside hand-drawn SVGs from the set at the same height, all from vector, so the finish is judged at size.

  python scripts/art/compare-at-size.py <out.png> <label=path.svg> [<label=path.svg> ...] [--height 600]
"""
import argparse, io
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import resvg_py

ap = argparse.ArgumentParser()
ap.add_argument('out'); ap.add_argument('items', nargs='+'); ap.add_argument('--height', type=int, default=600)
a = ap.parse_args()
tiles = []
for it in a.items:
    label, path = it.split('=', 1)
    png = resvg_py.svg_to_bytes(svg_string=Path(path).read_text(encoding='utf-8'), height=a.height)
    im = Image.open(io.BytesIO(bytes(png))).convert('RGBA')
    bg = Image.new('RGB', im.size, 'white'); bg.paste(im, mask=im.split()[3]); tiles.append((label, bg))
pad, lab = 24, 36
W = sum(t.width for _, t in tiles) + pad * (len(tiles) + 1); H = a.height + lab + pad * 2
sheet = Image.new('RGB', (W, H), 'white'); d = ImageDraw.Draw(sheet)
try: font = ImageFont.truetype('arial.ttf', 22)
except Exception: font = ImageFont.load_default()
x = pad
for label, t in tiles:
    sheet.paste(t, (x, pad)); d.text((x, pad + a.height + 8), label, fill='black', font=font); x += t.width + pad
sheet.save(a.out); print(a.out, sheet.size)
