"""B-6kf7 pass 2: three-way boards (pass 0 / pass 1 / pass 2) and stacked video frames (plain Python + PIL).
Usage: python neck_compose2.py PASS1_DIR PASS2_DIR"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
P1 = Path(sys.argv[1]); P2 = Path(sys.argv[2]); C2 = P2 / 'crops'
try: font = ImageFont.truetype('arial.ttf', 22)
except Exception: font = ImageFont.load_default()
def label(im, text):
    im = im.convert('RGB'); d = ImageDraw.Draw(im); d.rectangle([0, 0, im.width, 34], fill=(20, 20, 20)); d.text((10, 6), text, fill=(235, 235, 235), font=font); return im
def row(paths, texts):
    ims = [label(Image.open(p), t) for p, t in zip(paths, texts)]
    w, h = ims[0].size; b = Image.new('RGB', (w * len(ims), h))
    for i, im in enumerate(ims): b.paste(im, (i * w, 0))
    return b
def stack(rows):
    w = max(r.width for r in rows); b = Image.new('RGB', (w, sum(r.height for r in rows)))
    y = 0
    for r in rows: b.paste(r, (0, y)); y += r.height
    return b
T = ['PASS 0 original', 'PASS 1 upper ring', 'PASS 2 + jaw angle']
# the line Nick circled: three-quarter and side, review look and grazing
for view in ('threeq', 'side'):
    rows = [row([C2 / f'{p}_nickline_{view}_{m}.png' for p in ('pass0', 'pass1', 'pass2')], [f'{t}  {view}  idle 1.5 s  {mt}' for t in T])
            for m, mt in (('review', 'review light'), ('grz', 'grazing'))]
    stack(rows).save(C2 / f'compare_nickline_{view}.png'); print('nickline', view)
# standard proof set
for pose, ptxt in (('rest', 'rest'), ('idle_f45', 'idle 1.5 s'), ('sig_f29', 'hit 0.97 s')):
    for mode in ('grz', 'curv'):
        rows = [row([P1 / 'crops' / f'before_{pose}_{v}_{mode}.png', P1 / 'crops' / f'after_{pose}_{v}_{mode}.png', C2 / f'pass2_{pose}_{v}_{mode}.png'],
                    [f'{t}  {v}  {ptxt}' for t in T]) for v in ('side', 'threeq')]
        stack(rows).save(C2 / f'compare3_{pose}_{mode}.png'); print('board', pose, mode)
fb = sorted((P1 / 'work' / 'frames_before').glob('*.png')); fa = sorted((P1 / 'work' / 'frames_after').glob('*.png')); f2 = sorted((P2 / 'work' / 'frames_pass2').glob('*.png'))
out = P2 / 'work' / 'frames_stack3'; out.mkdir(exist_ok=True)
for a, b, c in zip(fb, fa, f2):
    stack([label(Image.open(a), 'PASS 0'), label(Image.open(b), 'PASS 1'), label(Image.open(c), 'PASS 2')]).save(out / a.name)
print('stack3', len(f2))
