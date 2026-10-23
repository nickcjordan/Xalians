"""B-sntv pass 5/6: reference photos beside the rig's poses (ref_compare.png).

python reskin_refcompare.py REF_DIR AUDIT_DIR OUT.png [LABEL]
Each row: a reference photo (scaled to the row height) and the matching audit renders (A, clay) with a note on what to compare.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

REF, AUD, OUT = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]); LABEL = sys.argv[4] if len(sys.argv) > 4 else AUD.parent.name
ROWS = [
    ('Baby_goat_jumping.jpg', [('sig_f16', 'left_A'), ('sig_f16', 'front_A')], 'Flight tuck: forelegs folded in the parasagittal plane, carpus folded about 90 to 110 deg, forearm against the brisket.'),
    ('Juvenile_Nubian_ibex_jumping_40361.jpg', [('sig_f14', 'left_A'), ('sig_f18', 'front_A')], 'Rising: both forelegs fold close together under the chest, elbows tight, hooves against the forearm.'),
    ('Juvenile_Nubian_ibex_jumping_40362.jpg', [('crouch_deep', 'left_A'), ('crouch_deep', 'front_A')], 'Crouched: forelegs under the chest, elbows near the chest wall, a little wider than the trunk, no frog splay.'),
    ('Leaping_mountain_goat.JPG', [('sig_f22', 'left_A'), ('sig_f29', 'left_A')], 'Folded against the chest (f22); f29 has no photo: forelegs reach forward and down beside the head (REF_NOTES).'),
]
H = 420; PAD = 16


def font(n):
    for f in ('arialbd.ttf', 'DejaVuSans-Bold.ttf'):
        try: return ImageFont.truetype(f, n)
        except OSError: pass
    return ImageFont.load_default()


def fit(im, h, minw=380):
    im = im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS)
    if im.width >= minw: return im
    c = Image.new('RGB', (minw, h), (24, 24, 28)); c.paste(im, ((minw - im.width) // 2, 0)); return c


def trim(im):
    g = im.convert('L'); bg = g.getpixel((2, 2)); box = g.point(lambda v: 255 if abs(v - bg) > 6 else 0).getbbox()
    if not box: return im
    x0, y0, x1, y1 = box; m = 24
    return im.crop((max(0, x0 - m), max(0, y0 - m), min(im.width, x1 + m), min(im.height, y1 + m)))


rows = []
for ref, shots, note in ROWS:
    tiles = [fit(Image.open(REF / ref).convert('RGB'), H)]; caps = [ref]
    for pose, view in shots:
        p = AUD / 'poses' / pose / f'{view}.png'
        tiles.append(fit(trim(Image.open(p).convert('RGB')), H) if p.exists() else Image.new('RGB', (H, H), (60, 60, 60))); caps.append(f'{LABEL} {pose} {view}')
    rows.append((tiles, caps, note))
W = max(sum(t.width for t in r[0]) + PAD * (len(r[0]) + 1) for r in rows)
RH = H + 80; img = Image.new('RGB', (W, 60 + RH * len(rows)), (24, 24, 28)); d = ImageDraw.Draw(img)
d.text((PAD, 16), f'Reference photos (left) beside {LABEL} (clay renders)', fill=(240, 240, 240), font=font(26))
for ri, (tiles, caps, note) in enumerate(rows):
    y = 60 + ri * RH; x = PAD
    for t, c in zip(tiles, caps):
        img.paste(t, (x, y)); d.text((x, y + H + 4), c, fill=(220, 220, 220), font=font(16)); x += t.width + PAD
    d.text((PAD, y + H + 28), note, fill=(250, 210, 120), font=font(18))
img.save(OUT); print('REFCOMPARE', OUT, img.size)
