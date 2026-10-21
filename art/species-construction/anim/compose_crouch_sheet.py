"""Crouch review sheet (rig pass 5): per point Nick raised on F36, the real references beside the crouch's
deepest frame.

  python art/species-construction/anim/compose_crouch_sheet.py <crouch-motion dir> <anim dir> [--deep 24]

Rows: tail root (ref/tail-*), calves (ref/calf-*), thigh to hip (ref/hip-*), feet (ref/feet-*). Each row
shows its references, then clay and furred frames of the crouch from motion_frames.py. The feet row puts
the rest frame and the deepest frame side by side with a blue line at the front of the toes at rest, so
planted feet read at a glance. References live only under untracked/ (Commons photos, never committed).
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

p = argparse.ArgumentParser()
p.add_argument('motion', type=Path)
p.add_argument('anim', type=Path)
p.add_argument('--deep', type=int, default=24)
a = p.parse_args()
M, REF = a.motion, a.anim/'ref'
try:
    font = ImageFont.truetype('arial.ttf', 22)
    small = ImageFont.truetype('arial.ttf', 16)
except OSError:
    font = small = ImageFont.load_default()
C, RH = 440, 300
BLUE = (40, 110, 230)


def fit(im, h):
    im = im.convert('RGB')
    return im.resize((max(1, round(im.width*h/im.height)), h), Image.LANCZOS)


def frame(folder, view, i):
    path = M/folder/view/f'{i:04d}.png'
    return Image.open(path).convert('RGB').resize((C, C), Image.LANCZOS) if path.exists() else None


def toe_front_x(im):
    """Left-most column of the creature in the lower tenth of a side frame (the front of the toes; the
    creature faces left in the side view)."""
    g = np.asarray(im.convert('L'), float)
    bg = np.median(g[:5, :5])
    low = g[int(.88*g.shape[0]):]
    cols = np.where((np.abs(low-bg) > 12).any(0))[0]
    return int(cols.min()) if len(cols) else None


def row(title, refs, tiles, width, guide=False):
    out = Image.new('RGB', (width, 40+RH+10+C+30), (245, 245, 245))
    d = ImageDraw.Draw(out)
    d.text((10, 8), title, fill=(0, 0, 0), font=font)
    x = 10
    for r in refs:
        im = fit(Image.open(r), RH)
        if x+im.width > width:
            break
        out.paste(im, (x, 40))
        d.text((x, 40+RH-18), r.stem, fill=(255, 255, 255), font=small)
        x += im.width+10
    y = 40+RH+10
    gx = None
    for k, (label, im) in enumerate(tiles):
        if im is None:
            continue
        if guide and gx is None:
            gx = toe_front_x(im)
        if guide and gx is not None:
            ImageDraw.Draw(im).line([(gx, 0), (gx, C)], fill=BLUE, width=2)
        out.paste(im, (10+k*(C+10), y))
        d.text((10+k*(C+10), y+C+4), label, fill=(0, 0, 0), font=small)
    return out


D = a.deep
W = 4*C+50
rows = [
    row('Tail root: the tails grow out of the rump and sacrum, carried by the pelvis (references: tail base in a crouch)',
        sorted(REF.glob('tail-*.jpg')),
        [('clay rest, back three-quarter', frame('frames-clay-rump', 'back3q', 0)),
         ('clay crouch, back three-quarter', frame('frames-clay-rump', 'back3q', D)),
         ('fur crouch, back three-quarter', frame('frames-fur-rump', 'back3q', D)),
         ('clay crouch, side', frame('frames-clay', 'side', D))], W),
    row('Calves: the calf keeps its outward shape, the back of the knee folds (references: hind leg in a deep crouch)',
        sorted(REF.glob('calf-*.jpg')),
        [('clay crouch, side', frame('frames-clay', 'side', D)),
         ('fur crouch, side', frame('frames-fur', 'side', D)),
         ('clay crouch, front three-quarter', frame('frames-clay', 'front3q', D)),
         ('fur crouch, front three-quarter', frame('frames-fur', 'front3q', D))], W),
    row('Thigh to hip: the thigh turns in the hip socket and stays on the body (references: femur head in the socket, squat)',
        sorted(REF.glob('hip-*.jpg')),
        [('clay crouch, front three-quarter', frame('frames-clay', 'front3q', D)),
         ('fur crouch, front three-quarter', frame('frames-fur', 'front3q', D)),
         ('clay crouch, side', frame('frames-clay', 'side', D)),
         ('clay halfway, side', frame('frames-clay', 'side', D//2))], W),
    row('Feet: planted; the hips lower over them (blue line: front of the toes at rest)',
        sorted(REF.glob('feet-*.jpg')),
        [('clay rest, side', frame('frames-clay', 'side', 0)),
         ('clay halfway, side', frame('frames-clay', 'side', D//2)),
         ('clay crouch, side', frame('frames-clay', 'side', D)),
         ('fur crouch, side', frame('frames-fur', 'side', D))], W, guide=True),
]
out = Image.new('RGB', (W, sum(r.height for r in rows)), (245, 245, 245))
y = 0
for r in rows:
    out.paste(r, (0, y))
    y += r.height
out.save(M/'crouch-deepest-sheet.png')
print(M/'crouch-deepest-sheet.png', out.size)
