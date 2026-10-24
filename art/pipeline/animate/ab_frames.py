"""Old against new, side by side, one frame sequence for an A/B video (motion polish, pass 10).

python ab_frames.py OLD_DIR NEW_DIR OUT_DIR "OLD LABEL" "NEW LABEL"
Each output frame: a header band with the old label centred over the left half and the new label over the right half
(each label is shrunk until it fits its half, so they never overlap) and the frame number on its own line, then the two
frames at full size next to each other with a thin divider.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OLD, NEW, OUT = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]); LA, LB = sys.argv[4], sys.argv[5]
OUT.mkdir(parents=True, exist_ok=True)


def font(n):
    for f in ('arialbd.ttf', 'DejaVuSans-Bold.ttf'):
        try: return ImageFont.truetype(f, n)
        except OSError: pass
    return ImageFont.load_default()


def fit(d, text, maxw, size):
    while size > 10:
        f = font(size); w = d.textlength(text, font=f)
        if w <= maxw: return f, w
        size -= 1
    return font(10), d.textlength(text, font=font(10))


frames = sorted(p.name for p in NEW.glob('[0-9][0-9][0-9][0-9].png') if (OLD / p.name).exists())
for fn in frames:
    a = Image.open(OLD / fn).convert('RGB'); b = Image.open(NEW / fn).convert('RGB')
    W, H = a.width, a.height; HB = 64; GAP = 4
    C = Image.new('RGB', (2 * W + GAP, H + HB), (20, 20, 20)); d = ImageDraw.Draw(C)
    C.paste(a, (0, HB)); C.paste(b, (W + GAP, HB))
    for x0, text, col in ((0, LA, (150, 190, 255)), (W + GAP, LB, (255, 196, 64))):
        f, w = fit(d, text, W - 24, 24); d.text((x0 + (W - w) / 2, 6), text, fill=col, font=f)
    ft = font(18); t = f'frame {int(fn[:4])}'; d.text((2 * W + GAP - d.textlength(t, font=ft) - 10, 38), t, fill=(220, 220, 220), font=ft)
    C.save(OUT / fn)
print('AB', len(frames), OUT)
