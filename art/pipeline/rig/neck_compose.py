"""B-6kf7: compose before/after boards (plain Python + PIL). Usage: python neck_compose.py PASS_DIR"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
P = Path(sys.argv[1]); C = P / 'crops'
try: font = ImageFont.truetype('arial.ttf', 22)
except Exception: font = ImageFont.load_default()
def label(im, text):
    d = ImageDraw.Draw(im); d.rectangle([0, 0, im.width, 34], fill=(20, 20, 20)); d.text((10, 6), text, fill=(235, 235, 235), font=font); return im
for pose, ptxt in (('rest', 'rest'), ('idle_f45', 'idle 1.5 s'), ('sig_f29', 'signature hit 0.97 s')):
    for mode, mtxt in (('grz', 'clay, grazing light'), ('curv', 'curvature (blue/dark concave, amber/light convex)')):
        tiles = []
        for view in ('side', 'threeq'):
            for tag in ('before', 'after'):
                im = Image.open(C / f'{tag}_{pose}_{view}_{mode}.png').convert('RGB')
                tiles.append(label(im, f'{tag.upper()}  {view}  {ptxt}'))
        w, h = tiles[0].size
        board = Image.new('RGB', (2 * w, 2 * h), (0, 0, 0))
        for i, t in enumerate(tiles): board.paste(t, ((i % 2) * w, (i // 2) * h))
        board.save(C / f'compare_{pose}_{mode}.png'); print('board', pose, mode)
# stacked video frames
fb = sorted((P / 'work' / 'frames_before').glob('*.png')); fa = sorted((P / 'work' / 'frames_after').glob('*.png'))
out = P / 'work' / 'frames_stack'; out.mkdir(exist_ok=True)
for b, a in zip(fb, fa):
    ib = label(Image.open(b).convert('RGB'), 'BEFORE'); ia = label(Image.open(a).convert('RGB'), 'AFTER')
    s = Image.new('RGB', (ib.width, ib.height * 2)); s.paste(ib, (0, 0)); s.paste(ia, (0, ib.height)); s.save(out / b.name)
print('stack frames', len(fb))
