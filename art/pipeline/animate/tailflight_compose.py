"""B-378v: before/after proof images (Windows Python with PIL).

python tailflight_compose.py strip  BEFORE_DIR AFTER_DIR OUT_PNG first last     pass 2 above this pass, one pair per frame
python tailflight_compose.py posed  DIR OUT_PNG label[,label...]                 furred before (left) and after (right)
Labels are text with a luminance band, so nothing rides on hue.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

FPS = 30


def font(size):
    for f in ('C:/Windows/Fonts/consola.ttf', 'C:/Windows/Fonts/arial.ttf'):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            pass
    return ImageFont.load_default()


def crop_box(paths, pad=30):
    """One crop for every frame: the union of the creature's bounding boxes (pixels brighter than the ground)."""
    box = None
    for p in paths:
        g = Image.open(p).convert('L').point(lambda v: 255 if v > 90 else 0)
        b = g.getbbox()
        if b: box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
    w, h = Image.open(paths[0]).size
    return (max(0, box[0] - pad), max(0, box[1] - pad), min(w, box[2] + pad), min(h, box[3] + pad))


def strip(bdir, adir, out, first, last, cols=5, tw=360, bname='pass 2', aname='this pass', bdesc='plume rigid on tail_06', adesc='plume bones tail_07..09'):
    frames = list(range(first, last + 1))
    bp = [Path(bdir) / f'{f:04d}.png' for f in frames]; ap = [Path(adir) / f'{f:04d}.png' for f in frames]
    box = crop_box(bp + ap)
    cw, ch = box[2] - box[0], box[3] - box[1]; th = int(ch * tw / cw); lab = 24; gap = 4; pad = 8
    rows = (len(frames) + cols - 1) // cols
    cell_h = lab + 2 * th + gap
    S = Image.new('RGB', (cols * (tw + pad) + pad, 56 + rows * (cell_h + pad)), (20, 20, 20))
    d = ImageDraw.Draw(S); f1 = font(16); f2 = font(20)
    d.text((pad, 8), f'Signature frames {first} to {last}, tracking camera. Each pair: TOP = {bname} ({bdesc}), '
                     f'BOTTOM = {aname} ({adesc}).', fill=(235, 235, 235), font=f2)
    d.text((pad, 32), 'Light-clay plume is a review-only stand-in for the furred plume (same tube and weights).', fill=(190, 190, 190), font=f1)
    for i, f in enumerate(frames):
        r, c = divmod(i, cols); x = pad + c * (tw + pad); y = 56 + r * (cell_h + pad)
        d.rectangle([x, y, x + tw, y + lab - 2], fill=(70, 70, 70)); d.text((x + 4, y + 3), f'f{f:02d}  {f * 1000 / FPS:4.0f} ms', fill=(255, 255, 255), font=f1)
        for k, p in enumerate((bp[i], ap[i])):
            im = Image.open(p).convert('RGB').crop(box).resize((tw, th), Image.LANCZOS)
            yy = y + lab + k * (th + gap); S.paste(im, (x, yy))
            tag = bname if k == 0 else aname
            d.rectangle([x, yy, x + 8 + 9 * len(tag), yy + 20], fill=(0, 0, 0) if k == 0 else (240, 240, 240))
            d.text((x + 4, yy + 1), tag, fill=(255, 255, 255) if k == 0 else (0, 0, 0), font=f1)
    S.save(out); return out


def posed(dirp, out, labels, bname='pass 2', aname='this pass', title='LEFT = pass 2 rig (plume rigid), RIGHT = this pass.'):
    dirp = Path(dirp); tiles = []
    for lab in labels:
        b = sorted(dirp.glob(f'before_f*_{lab}.png'))[0]; a = sorted(dirp.glob(f'after_f*_{lab}.png'))[0]
        tiles.append((lab, b, a))
    tw = 520; lab_h = 30; pad = 8
    S = Image.new('RGB', (pad + 2 * (tw + pad), 50 + len(tiles) * (tw + lab_h + pad)), (20, 20, 20))
    d = ImageDraw.Draw(S); f1 = font(18); f2 = font(20)
    d.text((pad, 12), 'Furred signature frames, pass 9 groom, Cycles. ' + title, fill=(235, 235, 235), font=f2)
    for i, (lab, b, a) in enumerate(tiles):
        y = 50 + i * (tw + lab_h + pad)
        fr = b.stem.split('_')[1]
        for k, p in enumerate((b, a)):
            x = pad + k * (tw + pad)
            d.rectangle([x, y, x + tw, y + lab_h - 2], fill=(0, 0, 0) if k == 0 else (240, 240, 240))
            d.text((x + 6, y + 4), f'{lab} ({fr})  ' + (bname if k == 0 else aname), fill=(255, 255, 255) if k == 0 else (0, 0, 0), font=f1)
            S.paste(Image.open(p).convert('RGB').resize((tw, tw), Image.LANCZOS), (x, y + lab_h))
    S.save(out); return out


if __name__ == '__main__':
    m = sys.argv[1]
    if m == 'strip':
        print(strip(sys.argv[2], sys.argv[3], sys.argv[4], int(sys.argv[5]), int(sys.argv[6]), 5, 360, *sys.argv[7:11]))
    elif m == 'posed':
        print(posed(sys.argv[2], sys.argv[3], sys.argv[4].split(','), *sys.argv[5:8]))
