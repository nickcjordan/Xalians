"""B-sntv pass 9: fur audit sheets.

python reskin_furaudit_sheets.py RENDER_DIR LABEL OUT_DIR
  OUT_DIR/pose_<tag>.png       one per pose: a row per view, clay | fur 960 (side rows add fur 192 real size and 2x)
  OUT_DIR/contact_side_fur.png all side fur frames in one grid, labelled
  RENDER_DIR/<LABEL>_<tag>_side_fur192.png  the 192 px side frames
"""
import sys, re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

RD, LABEL, OD = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3]); OD.mkdir(parents=True, exist_ok=True)
ORDER = ['rest', 'crouch', 'crouch_deep', 'leap', 'landing', 'landing_old', 'head_left_up', 'tail_side_up', 'foreleg_step', 'breath_in'] + \
        [f'sig_f{f:02d}' for f in (8, 11, 12, 14, 16, 18, 20, 22, 29, 38)]
VORDER = ['side', 'low34_front_left', 'back', 'front', 'threeq']


def font(n):
    for f in ('arialbd.ttf', 'DejaVuSans-Bold.ttf'):
        try: return ImageFont.truetype(f, n)
        except OSError: pass
    return ImageFont.load_default()


rx = re.compile(rf'^{re.escape(LABEL)}_(.+)_({"|".join(VORDER)})_fur\.png$')
have = {}
for p in RD.glob(f'{LABEL}_*_fur.png'):
    m = rx.match(p.name)
    if m: have.setdefault(m.group(1), set()).add(m.group(2))
H = 420; PAD = 10
sides = []
for tag in ORDER + sorted(set(have) - set(ORDER)):
    if tag not in have: continue
    rows = []
    for v in [x for x in VORDER if x in have[tag]]:
        fu = Image.open(RD / f'{LABEL}_{tag}_{v}_fur.png').convert('RGB'); cp = RD / f'{LABEL}_{tag}_{v}_clay.png'
        cl = Image.open(cp).convert('RGB') if cp.exists() else Image.new('RGB', fu.size, (60, 60, 60))
        sc = lambda im: im.resize((round(im.width * H / im.height), H), Image.LANCZOS)
        tiles = [sc(cl), sc(fu)]
        if v == 'side':
            small = fu.resize((192, round(fu.height * 192 / fu.width)), Image.LANCZOS); small.save(RD / f'{LABEL}_{tag}_side_fur192.png')
            tiles += [small, small.resize((small.width * 2, small.height * 2), Image.NEAREST)]; sides.append((tag, fu))
        rows.append((v, tiles))
    W = max(sum(t.width for t in r[1]) + PAD * (len(r[1]) + 1) for r in rows); RH = H + 30
    img = Image.new('RGB', (W, 48 + RH * len(rows)), (24, 24, 28)); d = ImageDraw.Draw(img)
    d.text((PAD, 12), f'{LABEL} {tag}: clay | fur 960 (side rows: | fur 192 | fur 192 at 2x)', fill=(240, 240, 240), font=font(20))
    for i, (v, tiles) in enumerate(rows):
        y = 48 + i * RH; x = PAD; d.text((PAD, y), v, fill=(250, 210, 120), font=font(16))
        for t in tiles: img.paste(t, (x, y + 22)); x += t.width + PAD
    img.save(OD / f'pose_{tag}.png')
# contact sheet of all side fur frames
cw = 480; ch = 320; cols = 4; n = len(sides); rows_ = (n + cols - 1) // cols
img = Image.new('RGB', (cols * (cw + PAD) + PAD, 48 + rows_ * (ch + 28)), (24, 24, 28)); d = ImageDraw.Draw(img)
d.text((PAD, 12), f'{LABEL}: side fur frames (sprite camera, 960 px shown at 480)', fill=(240, 240, 240), font=font(20))
for i, (tag, fu) in enumerate(sides):
    x = PAD + (i % cols) * (cw + PAD); y = 48 + (i // cols) * (ch + 28)
    d.text((x, y), tag, fill=(250, 210, 120), font=font(16)); img.paste(fu.resize((cw, ch), Image.LANCZOS), (x, y + 22))
img.save(OD / 'contact_side_fur.png'); print('SHEETS', len(have), 'poses', n, 'side frames')
