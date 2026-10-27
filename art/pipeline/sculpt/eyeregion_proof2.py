"""Luceras eye-region pass 2: proof boards (pass 1 as the comparison) and blind-reader lineups (host Python with PIL, numpy).

Usage: python eyeregion_proof.py   (paths fixed below; writes pass1/proof/)
"""
import json, random
import numpy as np
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

R = Path(r'C:\dev\art-data\pipeline\codex-stream')
E = R / 'luceras-eyeregion' / 'pass2'; OUT = E / 'proof'; E1 = R / 'luceras-eyeregion' / 'pass1'; OUT.mkdir(parents=True, exist_ok=True)
S = R / 'luceras-surface'; A = S / 'appealbuild1'; REF = S / 'furpass1' / 'ref'
try: FONT = ImageFont.load_default(size=20); BIG = ImageFont.load_default(size=40)
except TypeError: FONT = BIG = ImageFont.load_default()


def label(im, t):
    d = ImageDraw.Draw(im); x0, y0, x1, y1 = d.textbbox((0, 0), t, font=FONT); d.rectangle((0, 0, x1 - x0 + 14, y1 - y0 + 10), fill=(20, 20, 22)); d.text((7, 3 - y0 + 2), t, fill=(240, 240, 240), font=FONT); return im


def fit(im, size):
    im = im.convert('RGB'); s = min(size[0] / im.width, size[1] / im.height); im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    c = Image.new('RGB', size, (28, 28, 30)); c.paste(im, ((size[0] - im.width) // 2, (size[1] - im.height) // 2)); return c


def grid(cells, cols, size, gap=6):
    rows = (len(cells) + cols - 1) // cols; o = Image.new('RGB', (cols * size[0] + gap * (cols - 1), rows * size[1] + gap * (rows - 1)), (10, 10, 12))
    for i, (im, t) in enumerate(cells): o.paste(label(fit(im, size), t), ((i % cols) * (size[0] + gap), (i // cols) * (size[1] + gap)))
    return o


new = lambda f: Image.open(E / 'final' / 'renders' / f'{f}.png')
b5 = lambda f: Image.open(E1 / 'final' / 'renders' / f'{f}.png')
b3 = lambda f: Image.open(E1 / 'b3ctl' / f'{f}.png')
cur = lambda f: Image.open(A / 'before' / 'renders' / f'a_{f}.png')
T4 = Image.open(R.parent / 'codex-runs' / 'B-5sh4' / 'output.png').convert('RGB'); t4side = T4.crop((0, 0, 1150, 809))
sheet_side = Image.open(A / 'work' / 'sheet_side_mirror.png')
sh = {'face_front': Image.open(REF / 'sheet_front.png').crop((380, 140, 660, 420)), 'face': Image.open(REF / 'sheet_head.png'),
      'face_side': Image.open(REF / 'sheet_side.png').crop((40, 150, 360, 470)).transpose(Image.FLIP_LEFT_RIGHT)}

# face sheet: sheet | b5 | pass 1, front / three-quarter / side
cells = []
for v, vn in (('face_front', 'front'), ('face', 'three-quarter'), ('face_side', 'side')):
    cells += [(sh[v], f'sheet {vn}'), (b5(f'rest_{v}_fur'), f'pass 1 {vn}'), (new(f'rest_{v}_fur'), f'pass 2 {vn}')]
grid(cells, 3, (560, 560)).save(OUT / 'face_sheet.png')
# clay board: b5 clay | pass 1 clay
cells = []
for v, vn in (('face_front', 'front'), ('face', 'three-quarter'), ('face_side', 'side'), ('eye_l', 'left eye close')):
    cells += [(b5(f'rest_{v}_clay'), f'pass 1 clay {vn}'), (new(f'rest_{v}_clay'), f'pass 2 clay {vn}')]
grid(cells, 2, (560, 560)).save(OUT / 'clay_board.png')
# eye close-ups (fur), sheet eye at the same scale as the front crops
def eye_crop(im, side_left=True):
    im = im.convert('RGB'); a = np.asarray(im).astype(int); m = (a[..., 0] - a[..., 2] > 60) & (a[..., 0] > 90)
    half = m[:, :im.width // 2] if side_left else m[:, im.width // 2:]
    ys, xs = np.where(half); cx, cy = int(np.median(xs)) + (0 if side_left else im.width // 2), int(np.median(ys))
    return im.crop((cx - 110, cy - 90, cx + 110, cy + 90)).resize((660, 540), Image.LANCZOS)
grid([(Image.open(REF / 'sheet_front.png').convert('RGB').crop((428, 232, 498, 290)).resize((660, 540), Image.LANCZOS), 'sheet eye'),
      (eye_crop(b5('rest_face_front_fur')), 'pass 1 eye 3x'), (eye_crop(new('rest_face_front_fur')), 'pass 2 eye 3x')], 3, (660, 540)).save(OUT / 'eye_3x.png')
grid([(b5('rest_eye_l_fur'), 'pass 1 left eye (fur)'), (new('rest_eye_l_fur'), 'pass 2 left eye (fur)'),
      (b5('rest_eye_l_clay'), 'pass 1 left eye (clay)'), (new('rest_eye_l_clay'), 'pass 2 left eye (clay)'), (b5('rest_corner_l_fur'), 'pass 1 inner corner (fur)'), (new('rest_corner_l_fur'), 'pass 2 inner corner (fur)'), (b5('rest_corner_l_clay'), 'pass 1 inner corner (clay)'), (new('rest_corner_l_clay'), 'pass 2 inner corner (clay)')], 2, (640, 640)).save(OUT / 'eye_close.png')
# side and sprite
side = [(sheet_side, 'sheet (mirrored)'), (b5('rest_side_fur'), 'pass 1'), (new('rest_side_fur'), 'pass 2'), (t4side, 'T4 painting')]
grid(side, 2, (960, 640)).save(OUT / 'side_960.png')
s192 = lambda im: fit(im, (960, 640)).resize((192, 128), Image.LANCZOS).resize((576, 384), Image.NEAREST)
grid([(s192(im), t + ' 192 px x3') for im, t in side], 4, (576, 384)).save(OUT / 'side_192x3.png')
# view board (brief step 3): front, three-quarter, side, sprite, sheet beside; fur and clay
vb = [(sh['face_front'], 'sheet front'), (new('rest_face_front_fur'), 'pass 2 front fur'), (new('rest_face_front_clay'), 'pass 2 front clay'),
      (sh['face'], 'sheet three-quarter'), (new('rest_face_fur'), 'pass 2 three-quarter fur'), (new('rest_face_clay'), 'pass 2 three-quarter clay'),
      (sh['face_side'], 'sheet side'), (new('rest_face_side_fur'), 'pass 2 side fur'), (new('rest_face_side_clay'), 'pass 2 side clay'),
      (s192(sheet_side), 'sheet sprite 192 x3'), (s192(new('rest_side_fur')), 'pass 2 sprite 192 x3'), (s192(new('rest_side_clay')), 'pass 2 sprite clay 192 x3')]
grid(vb, 3, (560, 560)).save(OUT / 'view_board.png')
# motion: signature f16 (three-quarter, side, inner corner) and idle f39, pass 1 beside pass 2
mot = []
for f, tt in (('sig_f16_face_fur', 'signature f16 three-quarter'), ('sig_f16_face_side_fur', 'signature f16 side'), ('sig_f16_corner_l_fur', 'signature f16 inner corner')):
    mot += [(Image.open(E1 / 'final' / 'motion' / f'{f}.png'), 'pass 1 ' + tt), (Image.open(E / 'final' / 'motion' / f'{f}.png'), 'pass 2 ' + tt)]
mot += [(Image.open(E1 / 'final' / 'motion_idle' / 'idle_f39_face_fur.png'), 'pass 1 idle f39'), (Image.open(E / 'final' / 'motion_idle' / 'idle_f39_face_fur.png'), 'pass 2 idle f39')]
grid(mot, 2, (560, 560)).save(OUT / 'motion.png')

# value check: mean sRGB luminance of the grey fur in a ring round each eye (1.15 to 1.9 eye-opening half-widths,
# white blaze excluded) against a cheek patch below and outside the eye, front view
def ring_vs_cheek(im):
    a = np.asarray(im.convert('RGB')).astype(float); L = a @ np.array([0.2126, 0.7152, 0.0722])
    m = (a[..., 0] - a[..., 2] > 60) & (a[..., 0] > 90); H, W = L.shape; out = {}
    for nm, sl in (('left', slice(0, W // 2)), ('right', slice(W // 2, W))):
        ys, xs = np.where(m[:, sl]); xs = xs + sl.start; cx, cy = np.median(xs), np.median(ys); rad = (np.percentile(xs, 97) - np.percentile(xs, 3)) / 2
        yy, xx = np.mgrid[0:H, 0:W]; d = np.hypot(xx - cx, yy - cy) / rad
        grey = (L < 185) & (L > 40)
        ring = (d > 1.15) & (d < 1.9) & grey
        sgn = -1 if nm == 'left' else 1
        cheek = (np.hypot(xx - (cx + sgn * 1.4 * rad), yy - (cy + 2.6 * rad)) < 0.5 * rad) & grey
        out[nm] = dict(ring=round(float(L[ring].mean()), 1), cheek=round(float(L[cheek].mean()), 1), ring_minus_cheek=round(float(L[ring].mean() - L[cheek].mean()), 1))
    return out
values = {'pass1': ring_vs_cheek(b5('rest_face_front_fur')), 'pass2': ring_vs_cheek(new('rest_face_front_fur'))}
(OUT / 'eye_ring_value.json').write_text(json.dumps(values, indent=1))

# blind readers: face-on lineup (sheet, b3, pass 1 at the same framing), and the kid-pick lineup at sprite size
def crop_creature(im, k):
    im = fit(im, (960, 640)) if im.size != (960, 640) else im.convert('RGB'); im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    a_ = np.asarray(im).astype(int); m_ = np.abs(a_ - a_[3, 3]).sum(2) > 14; ys, xs = np.where(m_)
    return im.crop((max(0, xs.min() - 6), max(0, ys.min() - 6), min(im.width, xs.max() + 7), min(im.height, ys.max() + 7)))


def lineup(order, path, keyp):
    W = sum(im.width for _, im in order) + 30 * (len(order) + 1); H = max(im.height for _, im in order) + 60
    lin = Image.new('RGB', (W, H), (193, 193, 193)); x = 30; d = ImageDraw.Draw(lin)
    for i, (k, im) in enumerate(order): lin.paste(im, (x, H - im.height - 10)); d.text((x + 4, 6), str(i + 1), fill=(20, 20, 20), font=BIG); x += im.width + 30
    lin.save(path); keyp.write_text(json.dumps({str(i + 1): k for i, (k, _) in enumerate(order)}, indent=1))


faces = [('sheet', fit(sh['face_front'], (420, 420))), ('pass1', fit(b5('rest_face_front_fur'), (420, 420))), ('pass2', fit(new('rest_face_front_fur'), (420, 420)))]
for run, seed in ((1, 91), (2, 92)):
    o_ = list(faces); random.Random(seed).shuffle(o_); lineup(o_, OUT / f'faceon_run{run}_lineup.png', OUT / f'faceon_run{run}_key.json')
k = 192 / 410.0
kids = [('T4', crop_creature(t4side.resize((960, 675)).crop((0, 17, 960, 657)), k * 0.84)), ('current_colorpass1', crop_creature(cur('rest_side_fur'), k)),
        ('b3', crop_creature(b3('rest_side_fur'), k)), ('pass2', crop_creature(new('rest_side_fur'), k))]
for run, seed in ((1, 93), (2, 94)):
    o_ = list(kids); random.Random(seed).shuffle(o_); lineup(o_, OUT / f'kidpick_run{run}_lineup.png', OUT / f'kidpick_run{run}_key.json')
print('proof done', json.dumps(values))
