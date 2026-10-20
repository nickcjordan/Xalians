"""Step 21 sheets: white (ref) and P-ombre-rev, ears-front and close-up; six current views."""
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
WORK = HERE.parents[2] / 'untracked/species-construction/akinza/surface/fur-steps'
s = WORK / 's12-21'
dirs = {'White (step 18, reference)': WORK / 's12-20/opt-white', 'P-ombre-rev: white root, blue tips (default)': s / 'after'}
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 22)
for view, name, crop in (('ears-front', '21-poof-ombre-rev.png', (180, 200, 844, 460)), ('ear-root-close', '21-poof-ombre-rev-close.png', None)):
    ims = [Image.open(d / f'{view}.png').convert('RGB') for d in dirs.values()]
    if crop:
        ims = [im.crop(crop) for im in ims]
    w, h = ims[0].size
    sheet = Image.new('RGB', (2 * w, h + 34), '#f0f0f0')
    dr = ImageDraw.Draw(sheet)
    for k, (label, im) in enumerate(zip(dirs, ims)):
        dr.text((k * w + 10, 6), label, font=font, fill='#172532')
        sheet.paste(im, (k * w, 34))
    sheet.save(WORK / name)
for v in ('ears-front', 'head-side', 'head-backq', 'body-backq', 'body-front', 'tails-side'):
    shutil.copyfile(s / 'after' / f'{v}.png', WORK / f'current-{v}.png')
print('21_SHEETS_DONE')
