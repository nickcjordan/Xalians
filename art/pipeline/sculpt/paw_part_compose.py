"""B-exrv / B-xsze / B-xv9f: proof composites for the authored paw parts: A | B | sheet (Lanczos resize, labelled columns).
Usage: python paw_part_compose.py PASS_DIR PAWSIZE_PASS1_DIR [--a "CLAYDIR|TAG|LABEL" --b "CLAYDIR|TAG|LABEL" --suffix NAME]
Default A = PASS_DIR/clay current ("current paw"), B = PASS_DIR/clay final ("new paw (B-exrv)"), suffix current_new.
Clay columns from clay/current_<view>.png and clay/final_<view>.png. Sheet crops: side crops cut from the approved side
sheet (work/sheet/side_<paw>_crop.png) and the sheet columns of the B-ykwq pawsize composites (three-quarter, front)."""
import sys, json, hashlib
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

import argparse
ap = argparse.ArgumentParser(); ap.add_argument('pass_dir'); ap.add_argument('pawsize'); ap.add_argument('--a'); ap.add_argument('--b'); ap.add_argument('--c'); ap.add_argument('--suffix', default='current_new')
A_ = ap.parse_args(); P1 = Path(A_.pass_dir); PS = Path(A_.pawsize); CL = P1 / 'clay'
def spec(x, d):
    if not x: return d
    c, t, l = x.split('|'); return Path(c), t, l
CA, TA, LA = spec(A_.a, (CL, 'current', 'current paw')); CB, TB, LB = spec(A_.b, (CL, 'final', 'new paw (B-exrv)')); SUF = A_.suffix
# B-xv9f: optional third clay column (e.g. pass 1 | pass 2 | pass 3 | sheet)
COLS = [(CA, TA, LA), (CB, TB, LB)] + ([spec(A_.c, None)] if A_.c else [])
try:
    FONT = ImageFont.truetype('arialbd.ttf', 26)
except Exception:
    FONT = ImageFont.load_default()


def sheet_col(name):
    im = Image.open(PS / name).convert('RGB'); W, H = im.size
    return im.crop((int(W * 0.75) + 6, int(H * 0.09), W, H))


front = sheet_col('composite_paws_front_A_B_C_sheet.png'); FW, FH = front.size
SHEET = {'hind_side': Image.open(P1 / 'work/sheet/side_hind_crop.png').convert('RGB'), 'fore_side': Image.open(P1 / 'work/sheet/side_fore_crop.png').convert('RGB'),
         'hind_tq': sheet_col('composite_hind_three_quarter_A_B_C_sheet.png'), 'fore_tq': sheet_col('composite_fore_three_quarter_A_B_C_sheet.png'),
         'hind_front': front.crop((0, 0, int(FW * 0.5), FH)), 'fore_front': front.crop((int(FW * 0.25), 0, int(FW * 0.62), FH)),
         'all_front': front, 'full_side': Image.open(P1 / 'work/sheet/side_full.png').convert('RGB')}


def compose(cols, labels, out, h=600):
    ims = []
    for c in cols:
        im = c if isinstance(c, Image.Image) else Image.open(c).convert('RGB')
        ims.append(im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS))
    W = sum(i.width for i in ims) + 6 * (len(ims) - 1); bar = 44
    comp = Image.new('RGB', (W, h + bar), 'white'); d = ImageDraw.Draw(comp); x = 0
    for im, lab in zip(ims, labels):
        comp.paste(im, (x, bar)); d.rectangle([x, 0, x + im.width, bar], fill=(28, 28, 28)); d.text((x + 10, 8), lab, fill='white', font=FONT); x += im.width + 6
    comp.save(P1 / out); return out


L = [c[2] for c in COLS] + ['approved sheet']
cp = lambda name: [c[0] / f'{c[1]}_{name}.png' for c in COLS]
made = []
for paw in ('hind', 'fore'):
    for view in ('side', 'front', 'tq'):
        made.append(compose(cp(f'{paw}_{view}') + [SHEET[f'{paw}_{view}']], L, f'composite_{paw}_{view}_{SUF}_sheet.png'))
    made.append(compose(cp(f'{paw}_back_tq') + [SHEET[f'{paw}_tq']], L[:-1] + ['sheet (no back view; front 3/4)'], f'composite_{paw}_low_back_tq_{SUF}_sheet.png'))
made.append(compose(cp('all_front') + [SHEET['all_front']], L, f'composite_paws_low_front_{SUF}_sheet.png', h=420))
made.append(compose(cp('full_side') + [SHEET['full_side']], L, f'composite_full_side_{SUF}_sheet.png', h=700))
made.append(compose(cp('hind_top') + cp('fore_top'), [f'hind {c[2]}' for c in COLS] + [f'fore {c[2]}' for c in COLS], f'composite_top_hind_fore_{SUF}.png', h=500))
CB, TB, LB = COLS[-1]
if (CB / f'{TB}_hind_sole.png').exists():
    made.append(compose([CB / f'{TB}_hind_sole.png', CB / f'{TB}_fore_sole.png'], [f'hind sole {LB}', f'fore sole {LB}'], f'composite_sole_hind_fore_{SUF.split("_")[-1]}.png', h=500))
print(json.dumps({m: hashlib.sha256((P1 / m).read_bytes()).hexdigest() for m in made}, indent=1))
