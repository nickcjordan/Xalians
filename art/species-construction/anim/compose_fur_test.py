"""fur-pose-test.png from fur_pose_test.py's renders: per pose the full side view, the sprite at its real
size (192 px tall) and the same sprite enlarged 4x with no smoothing, side by side.

  python art/species-construction/anim/compose_fur_test.py <fur render dir> <out png>
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

src, out = Path(sys.argv[1]), Path(sys.argv[2])
idx = json.loads((src/'index.json').read_text())
poses = list(dict.fromkeys(r['pose'] for r in idx['images']))
try:
    font = ImageFont.truetype('arial.ttf', 22)
except OSError:
    font = ImageFont.load_default()
LABEL = {'night_stalk': 'Night Stalk crouch', 'leg_reach': 'leg reach'}
rows = []
for nm in poses:
    full = Image.open(src/f'{nm}_side.png')
    spr = Image.open(src/f'{nm}_sprite.png')
    big = spr.resize((spr.width*4, spr.height*4), Image.NEAREST)
    h = max(full.height, big.height)
    row = Image.new('RGB', (full.width+spr.width+big.width+60, h+40), (245, 245, 245))
    d = ImageDraw.Draw(row)
    d.text((10, 8), f'{LABEL.get(nm, nm)}: full side framing | sprite {spr.height} px, real size | the same sprite at 4x',
           fill=(0, 0, 0), font=font)
    row.paste(full, (10, 40))
    row.paste(spr, (full.width+30, 40))
    row.paste(big, (full.width+spr.width+50, 40))
    rows.append(row)
W = max(r.width for r in rows)
sheet = Image.new('RGB', (W, sum(r.height for r in rows)), (245, 245, 245))
y = 0
for r in rows:
    sheet.paste(r, (0, y))
    y += r.height
sheet.save(out)
print(out, sheet.size)
