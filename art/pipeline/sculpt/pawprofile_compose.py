"""B-4cj4: proof composites for the paw profile pass (Lanczos resizing only, labelled columns).

Usage: python pawprofile_compose.py PASS1_DIR PAWSIZE_PASS1_DIR
Clay: A (current, B-tx7x) | C (B-ykwq option C, the base) | new | sheet, per view, from clay/<A|C|final>_<paw>_<view>.png.
Fur: C | new | sheet from the pass 6 style renders (pawsize C/render_*.png and fur/render_*.png).
Sheet crops are the right-hand column of the B-ykwq composites (the same crops the earlier boards used).
"""
import sys, json, hashlib
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

P1 = Path(sys.argv[1]); PS = Path(sys.argv[2]); OUT = P1
try:
    FONT = ImageFont.truetype('arialbd.ttf', 26)
except Exception:
    FONT = ImageFont.load_default()


def sheet_col(name):
    im = Image.open(PS / name).convert('RGB'); W, H = im.size
    return im.crop((int(W * 0.75) + 6, int(H * 0.09), W, H))


SHEET = {'hind_side': sheet_col('composite_hind_side_A_B_C_sheet.png'), 'fore_side': sheet_col('composite_fore_side_A_B_C_sheet.png'),
         'hind_tq': sheet_col('composite_hind_three_quarter_A_B_C_sheet.png'), 'fore_tq': sheet_col('composite_fore_three_quarter_A_B_C_sheet.png'),
         'front': sheet_col('composite_paws_front_A_B_C_sheet.png'), 'side': sheet_col('composite_side_A_B_C_sheet.png')}


def placeholder(w, h, text):
    im = Image.new('RGB', (w, h), (225, 225, 225)); d = ImageDraw.Draw(im); d.text((20, h // 2 - 12), text, fill=(60, 60, 60), font=FONT); return im


def compose(cols, labels, out, h=600):
    ims = []
    for c in cols:
        im = c if isinstance(c, Image.Image) else Image.open(c).convert('RGB')
        ims.append(im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS))
    W = sum(i.width for i in ims) + 6 * (len(ims) - 1); bar = 44
    comp = Image.new('RGB', (W, h + bar), 'white'); d = ImageDraw.Draw(comp); x = 0
    for im, lab in zip(ims, labels):
        comp.paste(im, (x, bar)); d.rectangle([x, 0, x + im.width, bar], fill=(28, 28, 28)); d.text((x + 10, 8), lab, fill='white', font=FONT); x += im.width + 6
    comp.save(OUT / out); return out


made = []
CL = P1 / 'clay'
for paw in ('hind', 'fore'):
    for view, sk in (('side', paw + '_side'), ('front', 'front'), ('tq', paw + '_tq'), ('top', None)):
        cols = [CL / f'A_{paw}_{view}.png', CL / f'C_{paw}_{view}.png', CL / f'final_{paw}_{view}.png']
        sh = SHEET[sk] if sk else placeholder(600, 600, 'sheet has no top view')
        if view == 'front':  # crop the one paw out of the sheet's four-paw front strip
            W, H = sh.size; sh = sh.crop((0, 0, int(W * 0.5), H)) if paw == 'hind' else sh.crop((int(W * 0.25), 0, int(W * 0.62), H))
        made.append(compose(cols + [sh], ['A current', 'C base (B-ykwq)', 'new (B-4cj4)', 'approved sheet'], f'composite_clay_{paw}_{view}_A_C_new_sheet.png'))
    made.append(compose([CL / f'A_{paw}_back_tq.png', CL / f'C_{paw}_back_tq.png', CL / f'final_{paw}_back_tq.png'], ['A current', 'C base (B-ykwq)', 'new (B-4cj4)'], f'composite_clay_{paw}_low_back_three_quarter_A_C_new.png'))
made.append(compose([CL / 'A_all_front.png', CL / 'C_all_front.png', CL / 'final_all_front.png', SHEET['front']], ['A current', 'C base (B-ykwq)', 'new (B-4cj4)', 'approved sheet'], 'composite_clay_paws_front_A_C_new_sheet.png', h=400))
FC = PS / 'C'; FN = P1 / 'fur'
for view, sk, h in (('paws_front', 'front', 420), ('hind_side', 'hind_side', 600), ('hind_three_quarter', 'hind_tq', 600), ('fore_three_quarter', 'fore_tq', 600), ('side', 'side', 600), ('fore_side', 'fore_side', 600)):
    made.append(compose([FC / f'render_{view}.png', FN / f'render_{view}.png', SHEET[sk]], ['C base (B-ykwq)', 'new (B-4cj4)', 'approved sheet'], f'composite_fur_{view}_C_new_sheet.png', h=h))
sp = Image.open(FN / 'render_sprite.png').convert('RGBA'); s192 = sp.resize((192, 192), Image.LANCZOS); s192.save(FN / 'render_sprite_192.png')
c192 = Image.open(FC / 'render_sprite_192.png').convert('RGBA')
strip = Image.new('RGBA', (192 * 2 + 8, 192 + 24), (255, 255, 255, 255)); strip.paste(c192, (0, 24), c192); strip.paste(s192, (200, 24), s192)
d = ImageDraw.Draw(strip); d.text((4, 4), 'C base', fill=(0, 0, 0)); d.text((204, 4), 'new (B-4cj4)', fill=(0, 0, 0)); strip.convert('RGB').save(OUT / 'sprite_192_C_new.png'); made.append('sprite_192_C_new.png')
print(json.dumps({m: hashlib.sha256((OUT / m).read_bytes()).hexdigest() for m in made}, indent=1))
