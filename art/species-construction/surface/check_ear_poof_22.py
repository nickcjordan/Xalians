"""Step 22: Nick's circled head-side region, before (21) and after (22), with the
blue share measured against 16 halfway (before any poof); pairs and current views."""
import json
import shutil
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
WORK = HERE.parents[2] / 'untracked/species-construction/akinza/surface/fur-steps'
# Nick's screenshot matched into the ears-front render at scale .85, offset (132,180):
# his circle is the ellipse centred (404,332), radii 31 x 38 render px; mirror at x 620.
REGIONS = {'left (circled)': 404, 'right (mirror)': 620}
EARREF = {'left (circled)': (268, 300), 'right (mirror)': (756, 299)}
CROP = (155, 212, 549, 473)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 22)


def share(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(float)
    h, w = a.shape[:2]
    yy, xx = np.mgrid[:h, :w]
    head = a[302:332, 470:555].reshape(-1, 3).mean(0)
    br = lambda v: v[2] - v[0]
    out = {}
    for k, cx in REGIONS.items():
        m = ((xx - cx) / 31) ** 2 + ((yy - 332) / 38) ** 2 <= 1
        ex, ey = EARREF[k]
        ear = a[ey - 6:ey + 6, ex - 6:ex + 6].reshape(-1, 3).mean(0)
        out[k] = round(float((br(a[m].mean(0)) - br(head)) / (br(ear) - br(head))), 3)
    return out


paths = {'16 halfway': WORK / 's12-16half/after/ears-front.png', '21': WORK / 's12-21/after/ears-front.png',
         '22': WORK / 's12-22/after/ears-front.png'}
rep = {k: share(p) for k, p in paths.items()}
rep['22 minus 16 halfway'] = {k: round(rep['22'][k] - rep['16 halfway'][k], 3) for k in REGIONS}
(WORK / 's12-22/head-side-check.json').write_text(json.dumps(rep, indent=2) + '\n')
print(json.dumps(rep, indent=2))
ims = []
for label, key in (('Before: step 21', '21'), ('Now: step 22', '22')):
    im = Image.open(paths[key]).convert('RGB').crop(CROP)
    d = ImageDraw.Draw(im)
    cx = 404 - CROP[0]; cy = 332 - CROP[1]
    d.ellipse((cx - 31, cy - 38, cx + 31, cy + 38), outline=(240, 160, 0), width=2)
    ims.append((label, im.resize((im.width * 2, im.height * 2), Image.LANCZOS)))
w, h = ims[0][1].size
sheet = Image.new('RGB', (2 * w, h + 34), '#f0f0f0')
d = ImageDraw.Draw(sheet)
for k, (label, im) in enumerate(ims):
    d.text((k * w + 10, 6), label + ' (amber = the region Nick circled)', font=font, fill='#172532')
    sheet.paste(im, (k * w, 34))
sheet.save(WORK / '22-head-side-check.png')
for view, name in (('ears-front', '22-poof-ombre.png'), ('ear-root-close', '22-poof-ombre-close.png')):
    a = Image.open(WORK / 's12-21/after' / f'{view}.png').convert('RGB')
    b = Image.open(WORK / 's12-22/after' / f'{view}.png').convert('RGB')
    w, h = a.size
    s = Image.new('RGB', (2 * w, h + 38), '#f0f0f0')
    d = ImageDraw.Draw(s)
    d.text((12, 5), 'Before: step 21', font=font, fill='#172532')
    d.text((w + 12, 5), 'Now: step 22', font=font, fill='#172532')
    s.paste(a, (0, 38)); s.paste(b, (w, 38)); s.save(WORK / name)
for v in ('ears-front', 'head-side', 'head-backq', 'body-backq', 'body-front', 'tails-side'):
    shutil.copyfile(WORK / 's12-22/after' / f'{v}.png', WORK / f'current-{v}.png')
print('22_CHECK_DONE')
