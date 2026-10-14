"""Contact sheet: the sheet's views beside candidate renders, one row per view, for checkpoint reviews.

    python art/studio/recon/contact.py --out <png> --col <label>=<render dir> [--col ...] [--views head-front,...]

The first column is the reference for each view (bare front and side crops of the model sheet, the painted face
close-up for the three-quarter row); the rest are <render dir>/<view>.png composited on light gray. Labels are
drawn above each column. Experiment X29.
"""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

TARGETS = Path(r'C:\dev\art-data\studio\blockout\hypnopet\targets')
CLOSEUP = Path(r'C:\dev\art-data\studio\blockout\hypnopet\face-fit\closeup-face.png')
REF = {
    'head-front': (TARGETS/'flesh-front.png', (200, 200, 950, 800)),
    'head-threequarter-left': (CLOSEUP, None),
    'head-side-left': (TARGETS/'flesh-side.png', (50, 150, 800, 800)),
    'front': (TARGETS/'flesh-front.png', None),
    'side-left': (TARGETS/'flesh-side.png', None),
    'threequarter-left': (TARGETS/'turnaround.png', None),
}
H = 380


def font(n):
    for name in ('arial.ttf', 'segoeui.ttf', 'DejaVuSans.ttf'):
        try:
            return ImageFont.truetype(name, n)
        except OSError:
            pass
    return ImageFont.load_default()


def tile(path, crop=None):
    im = Image.open(path).convert('RGBA')
    if crop:
        im = im.crop(crop)
    bg = Image.new('RGBA', im.size, (240, 240, 238, 255))
    im = Image.alpha_composite(bg, im).convert('RGB')
    return im.resize((max(1, int(im.width*H/im.height)), H))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--col', action='append', required=True)
    ap.add_argument('--views', default='head-front,head-threequarter-left,head-side-left')
    args = ap.parse_args()
    cols = [c.split('=', 1) for c in args.col]
    views = args.views.split(',')
    rows = []
    for v in views:
        ims = [tile(*REF[v])]+[tile(Path(d)/f'{v}.png') for _, d in cols]
        rows.append(ims)
    widths = [max(r[i].width for r in rows) for i in range(len(cols)+1)]
    top = 30
    sheet = Image.new('RGB', (sum(widths), top+H*len(rows)), 'white')
    d = ImageDraw.Draw(sheet)
    f = font(18)
    x = 0
    for i, label in enumerate(['Sheet']+[c[0] for c in cols]):
        d.text((x+6, 6), label, fill=(20, 20, 20), font=f)
        for k, r in enumerate(rows):
            sheet.paste(r[i], (x, top+k*H))
        x += widths[i]
    args.out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.out)
    print(args.out, sheet.size)


if __name__ == '__main__':
    main()
