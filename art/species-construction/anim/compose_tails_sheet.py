"""Pass 8 per-point sheet for the tails in the crouch: rest, crouch frame 16 and 24, before and after, per view.

  python art/species-construction/anim/compose_tails_sheet.py <out.png> --title "..." \
      --row "label=<frames dir>" [--row ...] [--frames 0,16,24] [--refs <dir with tail-*.jpg>] [--size 420]

Each row is a motion_frames view folder (<NNNN>.png); rows are drawn in the order given, one column per frame.
References (2 to 4 pictures) go in a strip under the renders, labelled with their file names.
"""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

p = argparse.ArgumentParser()
p.add_argument('out', type=Path)
p.add_argument('--title', default='')
p.add_argument('--row', action='append', required=True)
p.add_argument('--frames', default='0,16,24')
p.add_argument('--refs', type=Path, default=None)
p.add_argument('--ref-names', default=None, help='comma list of reference file names (default: every tail-*.jpg)')
p.add_argument('--size', type=int, default=420)
a = p.parse_args()
frames = [int(x) for x in a.frames.split(',')]
S, LW, TH = a.size, 230, 40
try:
    font = ImageFont.truetype('arial.ttf', 18)
    small = ImageFont.truetype('arial.ttf', 14)
except OSError:
    font = small = ImageFont.load_default()
rows = [r.split('=', 1) for r in a.row]
refs = []
if a.refs:
    names = a.ref_names.split(',') if a.ref_names else sorted(x.name for x in a.refs.glob('tail-*.jpg'))
    refs = [a.refs/n for n in names]
RH = int(S*.62) if refs else 0
W = LW+S*len(frames)
sheet = Image.new('RGB', (W, TH+28+S*len(rows)+(RH+30 if refs else 0)), (245, 245, 245))
d = ImageDraw.Draw(sheet)
d.text((10, 10), a.title, fill=(0, 0, 0), font=font)
for c, f in enumerate(frames):
    d.text((LW+c*S+8, TH+4), 'rest (frame 0)' if f == 0 else f'crouch frame {f}', fill=(0, 0, 0), font=font)
for r, (label, folder) in enumerate(rows):
    y = TH+28+r*S
    for k, line in enumerate(label.split('|')):
        d.text((10, y+10+k*22), line, fill=(0, 0, 0), font=font)
    for c, f in enumerate(frames):
        im = Image.open(Path(folder)/f'{f:04d}.png').convert('RGB').resize((S, S), Image.LANCZOS)
        sheet.paste(im, (LW+c*S, y))
if refs:
    y = TH+28+len(rows)*S+6
    d.text((10, y+4), 'reference', fill=(0, 0, 0), font=font)
    x = LW
    for rp in refs:
        im = Image.open(rp).convert('RGB')
        im.thumbnail(((W-LW)//len(refs)-8, RH))
        sheet.paste(im, (x, y+24))
        d.text((x, y+4), rp.stem, fill=(60, 60, 60), font=small)
        x += (W-LW)//len(refs)
a.out.parent.mkdir(parents=True, exist_ok=True)
sheet.save(a.out)
print('SHEET', a.out, sheet.size)
