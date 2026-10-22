"""B-sntv pass 4: N-way proof sheets (one row per audit) for chosen poses and crops.

python reskin_compare4.py OUT_DIR LABEL=AUDIT_DIR [LABEL=AUDIT_DIR ...]
env CMP4_POSES (comma list), CMP4_CROPS (comma list of poses whose crops are compared)
The B-j6jh audit has no crouch_deep or landing_old: its crouch / landing stand in (the same poses).
Frames an older audit did not render show "not rendered".
"""
import os, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(sys.argv[1]); ROWS = [(a.split('=', 1)[0].replace('/', '\n'), Path(a.split('=', 1)[1])) for a in sys.argv[2:]]
CAMS = ['left', 'right', 'front', 'back', 'top', 'underside', 'low34_front_left', 'low34_rear_left']
CROPS = ['shoulders_armpits_left', 'shoulders_armpits_right', 'elbows_left', 'elbows_right', 'stifles_left', 'stifles_right',
         'hocks_left', 'hocks_right', 'wrists_left', 'wrists_right', 'chest_floor', 'belly', 'groin_inner_thighs', 'neck_throat', 'tail_base_rump']
OLDMAP = {'crouch_deep': 'crouch', 'landing_old': 'landing'}


def font(n):
    for f in ('arialbd.ttf', 'DejaVuSans-Bold.ttf'):
        try: return ImageFont.truetype(f, n)
        except OSError: pass
    return ImageFont.load_default()


def sheet(title, cols, paths, dest, cell=360):
    head, lab, side = 56, 28, 150
    C = Image.new('RGB', (side + len(cols) * cell, head + len(ROWS) * (cell + lab)), (24, 24, 24)); d = ImageDraw.Draw(C)
    d.text((16, 12), title, fill=(235, 235, 235), font=font(26))
    for r, (lab_, _) in enumerate(ROWS):
        d.multiline_text((10, head + r * (cell + lab) + cell // 2 - 24), lab_, fill=(255, 196, 64) if r == len(ROWS) - 1 else (190, 200, 220), font=font(20))
    for i, c in enumerate(cols):
        x = side + i * cell
        for r in range(len(ROWS)):
            y = head + r * (cell + lab); p = paths[r][i]; d.text((x + 6, y + 2), c, fill=(220, 220, 220), font=font(16))
            if p.exists():
                im = Image.open(p).convert('RGB'); im.thumbnail((cell - 8, cell - 8))
                C.paste(im, (x + (cell - im.width) // 2, y + lab + (cell - 8 - im.height) // 2))
            else:
                d.text((x + 10, y + lab + 10), 'not rendered', fill=(150, 150, 150), font=font(16))
    dest.parent.mkdir(parents=True, exist_ok=True); C.save(dest, optimize=True)


def src(audit, pose, i):
    return OLDMAP.get(pose, pose) if i == 0 else pose


for pose in os.environ.get('CMP4_POSES', 'crouch_deep').split(','):
    sheet(f'Luceras {pose}: render A, all cameras', CAMS,
          [[a / 'poses' / src(a, pose, i) / f'{c}_A.png' for c in CAMS] for i, (_, a) in enumerate(ROWS)], OUT / 'compare' / f'{pose}_A_4way.png')
for pose in os.environ.get('CMP4_CROPS', 'crouch_deep').split(','):
    if not pose: continue
    for k in 'ABC':
        for half, names in (('1', CROPS[:8]), ('2', CROPS[8:])):
            sheet(f'Luceras {pose} crops, render {k}', names,
                  [[a / 'crops' / src(a, pose, i) / f'{c}_{k}.png' for c in names] for i, (_, a) in enumerate(ROWS)],
                  OUT / 'compare' / f'{pose}_crops_{k}_{half}_4way.png', cell=320)
print('COMPARE4 done')
