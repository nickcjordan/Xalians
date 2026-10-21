"""B-bafy: before (pass 3) / after (pass 4) proof sheets of the chest behind the foreleg (Windows Python, PIL).

python chest_compose.py CROPS_DIR OUT_PNG name1,name2,...   (names without the before_/after_ prefix)
One row per name: LEFT pass 3, RIGHT pass 4. Labels are text on a luminance band (no hue coding).
grz = one low raking sun; curv = mean curvature, dark blue concave, light amber convex; review = look-dev lights.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


def font(size):
    for f in ('C:/Windows/Fonts/consola.ttf', 'C:/Windows/Fonts/arial.ttf'):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            pass
    return ImageFont.load_default()


d, out, names = Path(sys.argv[1]), sys.argv[2], sys.argv[3].split(',')
tw, lab, pad = 460, 28, 8
S = Image.new('RGB', (pad + 2 * (tw + pad), 60 + len(names) * (tw + lab + pad)), (20, 20, 20))
dr = ImageDraw.Draw(S); f1 = font(17); f2 = font(19)
dr.text((pad, 8), 'Chest behind the left foreleg. LEFT = pass 3 (before), RIGHT = pass 4 (elbow tuck 0.6).', fill=(235, 235, 235), font=f2)
dr.text((pad, 32), 'grz: one low raking sun. curv: mean curvature, dark blue = concave, light amber = convex. review: look-dev lights.', fill=(190, 190, 190), font=f1)
for i, n in enumerate(names):
    y = 60 + i * (tw + lab + pad)
    for k, tag in enumerate(('before', 'after')):
        x = pad + k * (tw + pad)
        dr.rectangle([x, y, x + tw, y + lab - 2], fill=(0, 0, 0) if k == 0 else (240, 240, 240))
        dr.text((x + 6, y + 4), f'{n}  ' + ('pass 3' if k == 0 else 'pass 4'), fill=(255, 255, 255) if k == 0 else (0, 0, 0), font=f1)
        S.paste(Image.open(d / f'{tag}_{n}.png').convert('RGB').resize((tw, tw), Image.LANCZOS), (x, y + lab))
S.save(out); print(out)
