"""B-78vx: contact sheets, animated WebP/GIF and 192 px strips from rendered frames (Windows Python with PIL).

python compose.py OUT_DIR sheet  FRAMES_DIR CLIP OUT_PNG [step]   every Nth frame, events marked
python compose.py OUT_DIR anim   FRAMES_DIR OUT_STEM size          animated WebP + GIF (loops forever)
python compose.py OUT_DIR strip  FRAMES_DIR OUT_STEM               192 px film strip PNG + animated WebP
Events come from OUT_DIR/work/bake.json and measure.json. Event frames get a thick border (luminance plus amber)
and a text label, so state never rides on hue alone.
"""
import json, sys
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


def events_for(out, clip):
    b = json.loads((out / 'work' / 'bake.json').read_text())
    m = json.loads((out / 'work' / 'measure.json').read_text())
    if clip == 'idle':
        return {0: ['loop seam (= last)']}
    ev = {}
    for name, ms in b['events']:
        ev.setdefault(round(ms * FPS / 1000), []).append(name)
    ev.setdefault(m['recover']['frame'], []).append('recover')
    return ev


def frames(d):
    return sorted(Path(d).glob('[0-9][0-9][0-9][0-9].png'))


def sheet(out, d, clip, dst, step=3):
    fs = frames(d)
    ev = events_for(out, clip)
    idx = {int(f.stem): f for f in fs}
    pick = sorted(set(list(range(0, max(idx) + 1, step)) + [k for k in ev if k in idx]))
    pick = [k for k in pick if k in idx]
    im0 = Image.open(idx[pick[0]]); w, h = im0.size
    tw = 320; th = int(h * tw / w); cols = 6; rows = (len(pick) + cols - 1) // cols
    pad = 6; lab = 22
    S = Image.new('RGB', (cols * (tw + pad) + pad, rows * (th + lab + pad) + pad + 40), (24, 24, 24))
    dr = ImageDraw.Draw(S); f1 = font(15); f2 = font(20)
    dr.text((pad, 8), f'{clip}: every {step}rd frame plus event frames, 30 fps. Thick amber frame + label = event.', fill=(230, 230, 230), font=f2)
    for i, k in enumerate(pick):
        r, c = divmod(i, cols); x = pad + c * (tw + pad); y = 40 + pad + r * (th + lab + pad)
        im = Image.open(idx[k]).convert('RGB').resize((tw, th), Image.LANCZOS)
        S.paste(im, (x, y + lab))
        names = ev.get(k, [])
        t = f'f{k:02d}  {k * 1000 / FPS:6.0f} ms'
        if names:
            dr.rectangle([x - 4, y + lab - 4, x + tw + 3, y + lab + th + 3], outline=(255, 176, 0), width=5)
            t += '  ' + ', '.join(n.upper() for n in names)
            dr.rectangle([x, y, x + tw, y + lab - 2], fill=(255, 176, 0))
            dr.text((x + 4, y + 2), t, fill=(0, 0, 0), font=f1)
        else:
            dr.text((x + 4, y + 2), t, fill=(200, 200, 200), font=f1)
    S.save(dst)
    return dst


def anim(d, stem, size, hold_end=0):
    fs = frames(d)
    ims = []
    for f in fs:
        im = Image.open(f).convert('RGB'); w, h = im.size
        ims.append(im.resize((size, int(round(h * size / w))), Image.LANCZOS))
    ims += [ims[-1]] * hold_end
    dur = int(round(1000 / FPS))
    ims[0].save(f'{stem}.webp', save_all=True, append_images=ims[1:], duration=dur, loop=0, quality=90, method=4)
    pal = [im.convert('P', palette=Image.ADAPTIVE, colors=128) for im in ims]
    pal[0].save(f'{stem}.gif', save_all=True, append_images=pal[1:], duration=[dur] * len(pal), loop=0, disposal=1)
    return [f'{stem}.webp', f'{stem}.gif']


def strip(d, stem, every=2):
    fs = frames(d)
    ims = [Image.open(f).convert('RGB') for f in fs]
    w, h = ims[0].size
    pick = ims[::every]
    S = Image.new('RGB', (w * len(pick), h))
    for i, im in enumerate(pick):
        S.paste(im, (i * w, 0))
    S.save(f'{stem}_strip.png')
    dur = int(round(1000 / FPS))
    ims[0].save(f'{stem}.webp', save_all=True, append_images=ims[1:], duration=dur, loop=0, lossless=True)
    return [f'{stem}_strip.png', f'{stem}.webp']


if __name__ == '__main__':
    out = Path(sys.argv[1]); mode = sys.argv[2]
    if mode == 'sheet':
        print(sheet(out, sys.argv[3], sys.argv[4], sys.argv[5], int(sys.argv[6]) if len(sys.argv) > 6 else 3))
    elif mode == 'anim':
        print(anim(sys.argv[3], sys.argv[4], int(sys.argv[5]), int(sys.argv[6]) if len(sys.argv) > 6 else 0))
    elif mode == 'strip':
        print(strip(sys.argv[3], sys.argv[4]))
