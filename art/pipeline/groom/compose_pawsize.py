"""B-ykwq paw size board: A | B | C | sheet composites, Lanczos resizing only, large column labels."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont
import json

O = Path('C:/dev/art-data/pipeline/codex-stream/luceras-pawsize/pass1')
A = Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass6')
BL = Path('C:/dev/art-data/pipeline/blobs')
refs = {'side': '8a78d9128f7aebb5c291f60cb70e0cfbec928fa357d1a91dff1eba27746286f9', 'three_quarter': 'ee0d82e980b576199a8d8bdd66463ff92c5175771c6ea12a013afba580f89de4', 'front': 'c96afd98e282fa5abaee6f1aed3245e0892be71998e1ade914c7c3af4f108178'}
# same sheet crops as pass 6 compose_proof.py
crops = {'fore_side': ('side', (.19, .73, .30, .92)), 'hind_side': ('side', (.55, .72, .73, .93)), 'fore_three_quarter': ('three_quarter', (.24, .74, .34, .94)),
         'hind_three_quarter': ('three_quarter', (.57, .73, .72, .93)), 'paws_front': ('front', (.24, .72, .76, .97)), 'side': ('side', None)}
font = ImageFont.truetype('arialbd.ttf', 44)
cols = [('A  current', lambda v: A / f'render_{v}.png'), ('B  middle', lambda v: O / 'B' / f'render_{v}.png'), ('C  sheet ratios', lambda v: O / 'C' / f'render_{v}.png')]


def ref(view):
    name, box = crops[view]; sha = refs[name]; im = Image.open(BL / sha[:2] / sha).convert('RGB')
    if box: im = im.crop(tuple(round(v * s) for v, s in zip(box, (im.width, im.height, im.width, im.height))))
    return im


def panel(ims, labels, path, size, bar=64):
    w, h = size; out = Image.new('RGB', (w * len(ims) + 6 * (len(ims) - 1), h + bar), (255, 255, 255)); d = ImageDraw.Draw(out)
    for i, (im, label) in enumerate(zip(ims, labels)):
        x = i * (w + 6); im = ImageOps.contain(im, (w, h), Image.Resampling.LANCZOS)
        d.rectangle((x, bar, x + w - 1, bar + h - 1), fill=(194, 194, 194)); out.paste(im, (x + (w - im.width) // 2, bar + (h - im.height) // 2))
        d.rectangle((x, 0, x + w - 1, bar - 1), fill=(30, 30, 30)); d.text((x + 14, 8), label, font=font, fill='white')
    out.save(path); return path


made = {}
sizes = {'paws_front': (900, 360), 'side': (900, 750)}
for view in crops:
    files = [f(view) for _, f in cols]
    if not all(p.exists() for p in files): print('skip', view, [str(p) for p in files if not p.exists()]); continue
    ims = [Image.open(p).convert('RGB') for p in files] + [ref(view)]
    made[view] = str(panel(ims, [c[0] for c in cols] + ['Approved sheet'], O / f'composite_{view}_A_B_C_sheet.png', sizes.get(view, (650, 650))))
# sprite strip: each option 768 px render reduced to 192 px with Lanczos; sheet side reduced the same way for reference
spr = []
for label, f in cols:
    p = f('sprite')
    if p.exists(): im = Image.open(p).convert('RGB').resize((192, 192), Image.Resampling.LANCZOS); spr.append(im); im.save(p.with_name('render_sprite_192.png'))
if len(spr) == 3:
    sheet = Image.open(BL / refs['side'][:2] / refs['side']).convert('RGB'); sheet = ImageOps.contain(sheet, (192, 192), Image.Resampling.LANCZOS)
    font_small = font
    out = Image.new('RGB', (4 * 192 + 3 * 6, 192 + 64), (255, 255, 255)); d = ImageDraw.Draw(out)
    for i, (im, lab) in enumerate(zip(spr + [sheet], ['A', 'B', 'C', 'Sheet'])):
        x = i * 198; d.rectangle((x, 64, x + 191, 255), fill=(194, 194, 194)); out.paste(im, (x + (192 - im.width) // 2, 64 + (192 - im.height) // 2))
        d.rectangle((x, 0, x + 191, 63), fill=(30, 30, 30)); d.text((x + 12, 8), lab, font=font, fill='white')
    out.save(O / 'composite_sprite_192_A_B_C_sheet.png'); made['sprite'] = str(O / 'composite_sprite_192_A_B_C_sheet.png')
(O / 'composites.json').write_text(json.dumps({'composites': made, 'sheet_references': refs, 'sheet_crops_fractional': crops, 'A_source': str(A), 'proof': 'Unretouched Cycles renders, Lanczos resizing only'}, indent=1))
print(json.dumps(made, indent=1))
