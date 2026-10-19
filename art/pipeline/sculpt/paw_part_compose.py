"""B-exrv: proof composites for the authored paw parts: current | new | sheet (Lanczos resize, labelled columns).
Usage: python paw_part_compose.py PASS1_DIR PAWSIZE_PASS1_DIR
Clay columns from clay/current_<view>.png and clay/final_<view>.png. Sheet crops: side crops cut from the approved side
sheet (work/sheet/side_<paw>_crop.png) and the sheet columns of the B-ykwq pawsize composites (three-quarter, front)."""
import sys, json, hashlib
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

P1 = Path(sys.argv[1]); PS = Path(sys.argv[2]); CL = P1 / 'clay'
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


L = ['current paw', 'new paw (B-exrv)', 'approved sheet']
made = []
for paw in ('hind', 'fore'):
    for view in ('side', 'front', 'tq'):
        made.append(compose([CL / f'current_{paw}_{view}.png', CL / f'final_{paw}_{view}.png', SHEET[f'{paw}_{view}']], L, f'composite_{paw}_{view}_current_new_sheet.png'))
    made.append(compose([CL / f'current_{paw}_back_tq.png', CL / f'final_{paw}_back_tq.png', SHEET[f'{paw}_tq']],
                        ['current paw', 'new paw (B-exrv)', 'sheet (no back view; front 3/4)'], f'composite_{paw}_low_back_tq_current_new_sheet.png'))
made.append(compose([CL / 'current_all_front.png', CL / 'final_all_front.png', SHEET['all_front']], L, 'composite_paws_low_front_current_new_sheet.png', h=420))
made.append(compose([CL / 'current_full_side.png', CL / 'final_full_side.png', SHEET['full_side']], ['current', 'new paws (B-exrv)', 'approved sheet'], 'composite_full_side_current_new_sheet.png', h=700))
made.append(compose([CL / 'current_hind_top.png', CL / 'final_hind_top.png', CL / 'current_fore_top.png', CL / 'final_fore_top.png'],
                    ['hind current', 'hind new', 'fore current', 'fore new'], 'composite_top_hind_fore_current_new.png', h=500))
print(json.dumps({m: hashlib.sha256((P1 / m).read_bytes()).hexdigest() for m in made}, indent=1))
