"""Labelled comparison sheet: columns are versions, rows are views.

python make_sheet.py <out.png> <cell height> "<title>" <dir1>:<label1> [<dir2>:<label2> ...] -- view1[:caption] view2 ...
Each view file <dir>/<view>.png is scaled to the cell height. Optional crop: view@x0,y0,x1,y1 (fractions).
"""
import sys
from PIL import Image, ImageDraw, ImageFont

a = sys.argv[1:]
out, cell, title = a[0], int(a[1]), a[2]
i = a.index('--')
cols = [x.split(':', 1) for x in a[3:i]]
rows = a[i+1:]
try:
    font = ImageFont.truetype('arial.ttf', 20); small = ImageFont.truetype('arial.ttf', 17)
except OSError:
    font = small = ImageFont.load_default()


def load(d, spec):
    name, _, crop = spec.partition('@')
    im = Image.open(f'{d}/{name}.png').convert('RGB')
    if crop:
        x0, y0, x1, y1 = [float(t) for t in crop.split(',')]
        w, h = im.size; im = im.crop((int(x0*w), int(y0*h), int(x1*w), int(y1*h)))
    return im.resize((max(1, round(im.width*cell/im.height)), cell))


grid = []
for r in rows:
    spec, _, cap = r.partition(':')
    grid.append(([load(d, spec) for d, _ in cols], cap or spec.partition('@')[0]))
widths = [max(g[0][j].width for g in grid) for j in range(len(cols))]
W = sum(widths) + 10*(len(cols)+1)
H = 50 + len(grid)*(cell+34) + 10
S = Image.new('RGB', (W, H), 'white'); d = ImageDraw.Draw(S)
d.text((10, 12), title, fill=0, font=font)
y = 50
for ims, cap in grid:
    x = 10
    for j, im in enumerate(ims):
        d.text((x+4, y+6), f'{cols[j][1]}  ({cap})', fill=(30, 30, 30), font=small)
        S.paste(im, (x, y+30)); x += widths[j]+10
    y += cell+34
S.save(out)
print('saved', out, S.size)
