"""B-sntv pass 3: old vs new apex tuck, side by side, from the rendered sidetrack frames.

python reskin_apex_compare.py OLD_FRAMES NEW_FRAMES OUT_DIR
  OUT/compare/apex_tuck_old_vs_new.png        strip of frames 8 to 38 (top: pass 2, bottom: pass 3)
  OUT/frames/apex_compare_960_travel/####.png  every frame, pass 2 left, pass 3 right (encoded to video/apex_compare.mp4)
"""
import sys, os
LA, LB = os.environ.get('APEX_LABELS', 'pass 2 (old apex tuck)|pass 3 (elbows beside the chest)').split('|')
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OLD, NEW, OUT = (Path(a) for a in sys.argv[1:4])


def font(n):
    for f in ('arialbd.ttf', 'DejaVuSans-Bold.ttf'):
        try: return ImageFont.truetype(f, n)
        except OSError: pass
    return ImageFont.load_default()


frames = sorted(p.name for p in NEW.glob('*.png') if (OLD / p.name).exists())
seq = OUT / 'frames' / 'apex_compare_960_travel'; seq.mkdir(parents=True, exist_ok=True)
for i, fn in enumerate(frames):
    a = Image.open(OLD / fn).convert('RGB'); b = Image.open(NEW / fn).convert('RGB')
    W = a.width // 2 * 2; H = a.height
    C = Image.new('RGB', (W, H), (20, 20, 20))
    C.paste(a.resize((W // 2, H // 2)), (0, H // 4)); C.paste(b.resize((W // 2, H // 2)), (W // 2, H // 4))
    d = ImageDraw.Draw(C); d.text((10, 10), f'{LA}   frame {int(fn[:4])}', fill=(150, 190, 255), font=font(18))
    d.text((W // 2 + 10, 10), LB, fill=(255, 196, 64), font=font(18))
    C.save(seq / f'{i:04d}.png')
pick = [f for f in (8, 11, 14, 17, 20, 22, 24, 26, 29, 32, 35, 38) if f'{f:04d}.png' in frames]
cell = 420; ims = []
S = Image.new('RGB', (len(pick) * cell, 2 * cell + 60), (20, 20, 20)); d = ImageDraw.Draw(S)
d.text((10, 8), f'Luceras signature, sidetrack: top {LA}, bottom {LB}', fill=(235, 235, 235), font=font(24))
for i, f in enumerate(pick):
    for r, src in enumerate((OLD, NEW)):
        im = Image.open(src / f'{f:04d}.png').convert('RGB')
        w, h = im.size; im = im.crop((int(w * 0.18), int(h * 0.05), int(w * 0.82), int(h * 0.95))); im.thumbnail((cell - 6, cell - 6))
        S.paste(im, (i * cell + 3, 60 + r * cell)); d.text((i * cell + 8, 60 + r * cell + 4), f'f{f}', fill=(255, 196, 64), font=font(18))
(OUT / 'compare').mkdir(parents=True, exist_ok=True); S.save(OUT / 'compare' / 'apex_tuck_old_vs_new.png', optimize=True)
print('APEX', len(frames), 'frames', pick)
