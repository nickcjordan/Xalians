"""B-sntv pass 8b: fur check sheets, one per rig: clay | fur 960 | fur 192 (one row per frame and view).

python reskin_furcheck_sheet.py RENDER_DIR LABEL OUT.png TITLE
The 192 column is the 960 fur frame downscaled to 192 px wide (Lanczos), shown at its real size and at 2x nearest.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

RD, LABEL, OUT, TITLE = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3]), sys.argv[4]
ROWS = [('crouch_deep', 'side'), ('crouch_deep', 'threeq')] + [(f'sig_f{f:02d}', 'side') for f in (12, 14, 16, 18, 20, 22, 29)] + [('sig_f16', 'threeq')]
ROWS = sorted(set(ROWS), key=ROWS.index)


def font(n):
    for f in ('arialbd.ttf', 'DejaVuSans-Bold.ttf'):
        try: return ImageFont.truetype(f, n)
        except OSError: pass
    return ImageFont.load_default()


H = 480; PAD = 12; rows = []
for tag, view in ROWS:
    c = RD / f'{LABEL}_{tag}_{view}_clay.png'; fu = RD / f'{LABEL}_{tag}_{view}_fur.png'
    if not (c.exists() and fu.exists()): continue
    ci, fi = Image.open(c).convert('RGB'), Image.open(fu).convert('RGB')
    small = fi.resize((192, round(fi.height * 192 / fi.width)), Image.LANCZOS); small.save(RD / f'{LABEL}_{tag}_{view}_fur192.png')
    sc = lambda im: im.resize((round(im.width * H / im.height), H), Image.LANCZOS)
    big2 = small.resize((small.width * 2, small.height * 2), Image.NEAREST)
    rows.append((f'{tag} {view}', [sc(ci), sc(fi), small, big2]))
W = max(sum(t.width for t in r[1]) + PAD * 5 for r in rows); RH = H + 34
img = Image.new('RGB', (W, 56 + RH * len(rows)), (24, 24, 28)); d = ImageDraw.Draw(img)
d.text((PAD, 14), TITLE + '   columns: clay | fur 960 | fur 192 (real size) | fur 192 at 2x', fill=(240, 240, 240), font=font(22))
for i, (name, tiles) in enumerate(rows):
    y = 56 + i * RH; x = PAD
    d.text((PAD, y), name, fill=(250, 210, 120), font=font(18))
    for t in tiles:
        img.paste(t, (x, y + 26)); x += t.width + PAD
img.save(OUT); print('SHEET', OUT, img.size, len(rows))
