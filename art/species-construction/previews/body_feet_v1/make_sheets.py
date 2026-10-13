"""Before and after sheets for body B v1 and feet v1.

python make_sheets.py <work dir> <out dir> [after name] [chain label]
Views that were not rendered are skipped.
Each sheet places views side by side: a row per view set, columns as named, with labels. Reads r-before, r-after, r-heatbody,
r-heatfeet from the work dir.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W, O = Path(sys.argv[1]), Path(sys.argv[2])
AFTER = sys.argv[3] if len(sys.argv) > 3 else 'assembled-3185'
CHAIN = sys.argv[4] if len(sys.argv) > 4 else 'tails v4, body B v1, feet v1'
O.mkdir(parents=True, exist_ok=True)
try:
    FONT = ImageFont.truetype('arial.ttf', 22)
except OSError:
    FONT = ImageFont.load_default()


def tile(paths, labels, out, height=700, title=None):
    if not all(Path(p).is_file() for p in paths):
        return
    ims = []
    for p in paths:
        im = Image.open(p).convert('RGB')
        ims.append(im.resize((round(im.width*height/im.height), height)))
    top = 40 if title else 0
    sheet = Image.new('RGB', (sum(i.width for i in ims), height+34+top), 'white')
    d = ImageDraw.Draw(sheet)
    if title:
        d.text((10, 8), title, fill='black', font=FONT)
    x = 0
    for im, lab in zip(ims, labels):
        sheet.paste(im, (x, top+34))
        d.text((x+10, top+6), lab, fill='black', font=FONT)
        x += im.width
    sheet.save(O/out)


def pair(view, out, title, height=700):
    tile([W/'r-before'/f'{view}.png', W/'r-after'/f'{view}.png'], ['before (assembled-3180)', f'after ({AFTER})'], out, height, title)


full = ['bfront', 'bback', 'bside', 'bq', 'brq']
names = {'bfront': 'front', 'bback': 'back', 'bside': 'side', 'bq': 'three-quarter', 'brq': 'rear three-quarter'}
for v in full:
    pair(v, f'full-{names[v]}-before-after.png', f'Full body, {names[v]}: before and after (bare clay, body B v1 then feet v1)', 900)
tile([W/'r-after'/f'{v}.png' for v in full], [names[v] for v in full], 'full-body-after-bare-clay.png', 900,
     f'{AFTER} ({CHAIN}), bare clay')
tile([W/'r-before'/f'{v}.png' for v in full], [names[v] for v in full], 'full-body-before-bare-clay.png', 900,
     'assembled-3180 (tails v4), bare clay')
tile([W/'r-heatbody'/f'{v}-heat.png' for v in full], [names[v] for v in full], 'heat-body-b-v1.png', 900,
     'Body B v1 displacement (3180 to 3184): grey 0, blue small, brighter to amber at .03 world')
tile([W/'r-heatbody'/f'{v}-heat.png' for v in ('shoulderq', 'tailroot')], ['shoulder', 'tail root'], 'heat-body-b-v1-crops.png', 800,
     'Body B v1 displacement, close crops (grey 0, amber .03 world)')
tile([W/'r-heatfeet'/f'{v}-heat.png' for v in ('lfront', 'lback', 'lq', 'lside')], ['front', 'back', 'three-quarter', 'side'],
     'heat-feet-v1.png', 600, 'Feet v1 displacement (3184 to 3185): grey 0, amber .06 world')
crops = [('shoulderq', 'shoulder, three-quarter'), ('shoulderfront', 'shoulder, front'), ('neckq', 'neck base, three-quarter'),
         ('neckback', 'neck base, back'), ('hipback', 'hip, back'), ('hipq', 'hip, three-quarter'), ('hipside', 'hip, side'),
         ('tailroot', 'tail root, rear oblique'), ('tailrootside', 'tail root, side'), ('ankleq', 'ankle, three-quarter'),
         ('ankleback', 'ankle, back')]
for v, lab in crops:
    pair(v, f'crop-{v}.png', f'Close crop, {lab}: before and after', 700)
feet = [('ffront', 'front'), ('fback', 'back'), ('fside', 'side'), ('fq', 'three-quarter'), ('frq', 'rear three-quarter')]
tile([W/'r-before'/f'{v}.png' for v, _ in feet], [l for _, l in feet], 'feet-before.png', 560, 'Left hind foot, before (assembled-3180)')
tile([W/'r-after'/f'{v}.png' for v, _ in feet], [l for _, l in feet], 'feet-after.png', 560, f'Left hind foot, after ({AFTER})')
for v, lab in feet:
    pair(v, f'foot-{lab.replace(" ", "-")}-before-after.png', f'Left hind foot, {lab}: before and after', 700)
print('ok')
