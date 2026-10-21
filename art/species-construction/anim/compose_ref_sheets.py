"""Ear and knee review sheets with the real references beside the renders.

  python art/species-construction/anim/compose_ref_sheets.py <rig dir> <anim dir>

rig-ear-fold.png: a row of reference photos (Nick's fennec first, then the ref/ear-* photos), then per pose
(rest, ears flat back, the crouch) the clay side view, Nick's photo beside it, and the three-quarter back
view. rig-knee.png: a row of the ref/knee-* photos, then per pose (rest, the crouch, the leg reach) the
left knee in clay from the side and the front three-quarter, then furred from the same two angles.
The reference photos live only under untracked/ (stock and Commons images, never committed).
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

rig, anim = Path(sys.argv[1]), Path(sys.argv[2])
R, F, REF = rig/'renders', rig/'fur', anim/'ref'
try:
    font = ImageFont.truetype('arial.ttf', 22)
    small = ImageFont.truetype('arial.ttf', 16)
except OSError:
    font = small = ImageFont.load_default()
LABEL = {'rest': 'rest', 'ears_flat_back': 'ears flat back', 'night_stalk': 'Night Stalk crouch', 'leg_reach': 'leg reach'}


def fit(im, h):
    im = im.convert('RGB')
    return im.resize((max(1, round(im.width*h/im.height)), h), Image.LANCZOS)


def ref_row(paths, h, width):
    row = Image.new('RGB', (width, h+34), (245, 245, 245))
    d = ImageDraw.Draw(row)
    d.text((10, 6), 'References (untracked, never committed): ' + ', '.join(p.stem for p in paths), fill=(0, 0, 0), font=small)
    x = 10
    for p in paths:
        im = fit(Image.open(p), h)
        if x+im.width > width:
            break
        row.paste(im, (x, 30))
        x += im.width+10
    return row


def stack(rows, width):
    out = Image.new('RGB', (width, sum(r.height for r in rows)), (245, 245, 245))
    y = 0
    for r in rows:
        out.paste(r, (0, y))
        y += r.height
    return out


# ---- ears
nick = anim/'ref-fennec-ears-back-nick.png'
ear_refs = [nick]+sorted(REF.glob('ear-*.jpg'))
C = 520
W = 3*C+40
rows = [ref_row(ear_refs, 260, W)]
for nm in ('rest', 'ears_flat_back', 'night_stalk'):
    row = Image.new('RGB', (W, C+40), (245, 245, 245))
    d = ImageDraw.Draw(row)
    d.text((10, 8), f'{LABEL[nm]}: clay side | Nick\'s reference | clay three-quarter back', fill=(0, 0, 0), font=font)
    row.paste(Image.open(R/f'{nm}_ears_side.png').convert('RGB').resize((C, C), Image.LANCZOS), (10, 38))
    ph = fit(Image.open(nick), C)
    if ph.width > C:
        ph = ph.resize((C, round(ph.height*C/ph.width)), Image.LANCZOS)
    row.paste(ph, (20+C, 38))
    row.paste(Image.open(R/f'{nm}_ears_backq.png').convert('RGB').resize((C, C), Image.LANCZOS), (30+2*C, 38))
    rows.append(row)
stack(rows, W).save(anim/'rig-ear-fold.png')
# ---- knees
C = 420
W = 4*C+50
rows = [ref_row(sorted(REF.glob('knee-*.jpg')), 300, W)]
for nm in ('rest', 'night_stalk', 'leg_reach'):
    row = Image.new('RGB', (W, C+40), (245, 245, 245))
    d = ImageDraw.Draw(row)
    d.text((10, 8), f'{LABEL[nm]}: clay side | clay front three-quarter | furred side | furred front three-quarter', fill=(0, 0, 0), font=font)
    for k, path in enumerate((R/f'{nm}_knee.png', R/f'{nm}_knee_front.png', F/f'{nm}_knee_side.png', F/f'{nm}_knee_front.png')):
        row.paste(Image.open(path).convert('RGB').resize((C, C), Image.LANCZOS), (10+k*(C+10), 38))
    rows.append(row)
stack(rows, W).save(anim/'rig-knee.png')
print(anim/'rig-ear-fold.png', anim/'rig-knee.png')
