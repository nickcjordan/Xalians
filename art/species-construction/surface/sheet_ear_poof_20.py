"""Step 20 sheets (white ref, P-ice, P-ombre) and rendered root/tip color calibration."""
import json
import math
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
WORK = HERE.parents[2] / 'untracked/species-construction/akinza/surface/fur-steps'
s = WORK / 's12-20'
opts = json.loads((HERE / 'akinza-ear-poof-colors.json').read_text())['options']
dirs = {'white': s / 'opt-white', 'P-ice': s / 'opt-P-ice', 'P-ombre': s / 'opt-P-ombre'}
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 22)
for view, name, crop in (('ears-front', '20-poof-blue.png', (180, 200, 844, 460)), ('ear-root-close', '20-poof-blue-close.png', None)):
    ims = [Image.open(dirs[k] / f'{view}.png').convert('RGB') for k in dirs]
    if crop:
        ims = [im.crop(crop) for im in ims]
    w, h = ims[0].size
    sheet = Image.new('RGB', (3 * w, h + 34), '#f0f0f0')
    d = ImageDraw.Draw(sheet)
    for k, (key, im) in enumerate(zip(dirs, ims)):
        label = 'White (step 18, reference)' if key == 'white' else f"{key}: {opts[key]['label']}"
        d.text((k * w + 10, 6), label, font=font, fill='#172532')
        sheet.paste(im, (k * w, 34))
    sheet.save(WORK / name)
EARS = {'left': ((375, 364), -149), 'right': ((649, 363), -31)}


def zone(a, origin, axis, r0, r1):
    h, w = a.shape[:2]
    yy, xx = np.mgrid[:h, :w]
    dx, dy = xx - origin[0], yy - origin[1]
    r = np.hypot(dx, dy)
    ang = np.degrees(np.arctan2(dy, dx)) - axis
    ang = (ang + 180) % 360 - 180
    m = (r >= r0) & (r < r1) & (np.abs(ang) < 50)
    return a[m].mean(0)


report = {}
for key, folder in dirs.items():
    a = np.asarray(Image.open(folder / 'ears-front.png').convert('RGB')).astype(float)
    head = a[300:330, 470:555].reshape(-1, 3).mean(0)
    out = dict(headWhite=head.round(1).tolist())
    for side, (o, ax) in EARS.items():
        ear = zone(a, o, ax, 110, 140)
        root = zone(a, o, ax, 6, 20)
        tip = zone(a, o, ax, 34, 48)
        br = lambda c: c[2] - c[0]
        share = lambda c: round(float((br(c) - br(head)) / (br(ear) - br(head))), 2)
        out[side] = dict(earBlue=ear.round(1).tolist(), root=root.round(1).tolist(), tip=tip.round(1).tolist(),
                         rootBlueShare=share(root), tipBlueShare=share(tip),
                         rootValueVsHead=round(float(root.mean() / head.mean()), 2), tipValueVsHead=round(float(tip.mean() / head.mean()), 2))
    report[key] = out
(s / 'poof-color-measure.json').write_text(json.dumps(report, indent=2) + '\n')
for k, v in report.items():
    print(k, {side: {m: v[side][m] for m in ('rootBlueShare', 'tipBlueShare', 'rootValueVsHead', 'tipValueVsHead')} for side in ('left', 'right')})
