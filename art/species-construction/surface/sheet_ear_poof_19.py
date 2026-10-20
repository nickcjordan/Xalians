"""Contact sheets for the step 19 poof colors: white reference, G-a, G-b, G-c."""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
WORK = HERE.parents[2] / 'untracked/species-construction/akinza/surface/fur-steps'
s = WORK / 's12-19'
opts = json.loads((HERE / 'akinza-ear-poof-colors.json').read_text())['options']
dirs = {'white': s / 'opt-white', 'G-a': s / 'opt-G-a', 'G-b': s / 'after', 'G-c': s / 'opt-G-c'}
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 22)
report = {}
for view, name, crop in (('ears-front', '19-poof-colors.png', (180, 200, 844, 460)), ('ear-root-close', '19-poof-colors-close.png', None)):
    ims = [Image.open(dirs[k] / f'{view}.png').convert('RGB') for k in dirs]
    if crop:
        ims = [im.crop(crop) for im in ims]
    w, h = ims[0].size
    cols = 2
    sheet = Image.new('RGB', (cols * w, 2 * (h + 34)), '#f0f0f0')
    d = ImageDraw.Draw(sheet)
    for k, (key, im) in enumerate(zip(dirs, ims)):
        x, y = (k % cols) * w, (k // cols) * (h + 34)
        label = key if key != 'white' else 'Current white (step 18)'
        d.text((x + 10, y + 6), f"{label}: {opts[key]['label']}", font=font, fill='#172532')
        sheet.paste(im, (x, y + 34))
    sheet.save(WORK / name)
# measured poof brightness vs head white in the ears-front view (mean luminance)
for key, folder in dirs.items():
    a = np.asarray(Image.open(folder / 'ears-front.png').convert('RGB')).astype(float)
    L = a @ [.2126, .7152, .0722]
    poof = {side: float(L[y - 8:y + 8, x - 8:x + 8].mean()) for side, (x, y) in (('left', (352, 352)), ('right', (672, 351)))}
    head = float(L[300:330, 470:555].mean())
    report[key] = dict(poofLeft=round(poof['left'], 1), poofRight=round(poof['right'], 1), headWhite=round(head, 1))
(s / 'poof-color-measure.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
