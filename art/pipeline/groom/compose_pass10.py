"""B-5wvn: pass 9 | pass 10 | sheet composites for the tail pattern pass, plus pass 9 | pass 10 posed frames.
usage: python compose_pass10.py PASS10_DIR"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw
d = Path(sys.argv[1]); w = d / 'work'
G = Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom'); BL = Path('C:/dev/art-data/pipeline/blobs')
blob = lambda h: BL / h[:2] / h
SIDE = Image.open(blob('8a78d9128f7aebb5c291f60cb70e0cfbec928fa357d1a91dff1eba27746286f9'))
TQ = Image.open(blob('ee0d82e980b576199a8d8bdd66463ff92c5175771c6ea12a013afba580f89de4'))
def label(im, t):
    im = im.copy(); dr = ImageDraw.Draw(im); dr.rectangle([0, 0, 7 * len(t) + 10, 20], fill=(25, 25, 25)); dr.text((5, 4), t, fill=(255, 255, 255)); return im
def row(items, H, name):
    tiles = [label(im.convert('RGB').resize((round(im.width * H / im.height), H), Image.LANCZOS), t) for t, im in items]
    out = Image.new('RGB', (sum(t.width for t in tiles) + 8 * (len(tiles) - 1), H), (30, 30, 30)); x = 0
    for t in tiles: out.paste(t, (x, 0)); x += t.width + 8
    out.save(d / name); print(d / name)
row([('Pass 9 side', Image.open(G / 'pass9' / 'render_side.png')), ('Pass 10 side', Image.open(d / 'render_side.png')), ('Sheet side', SIDE)], 900, 'composite_side_pass9_pass10_sheet.png')
row([('Pass 9 tail and rump', Image.open(w / 'pass9_tail_side.png')), ('Pass 10 tail and rump', Image.open(d / 'render_tail_side.png')), ('Sheet side crop', SIDE.crop((820, 60, 1374, 760)))], 800, 'composite_tail_side_pass9_pass10_sheet.png')
row([('Pass 9 tail from below 3/4', Image.open(w / 'pass9_tail_below.png')), ('Pass 10 tail from below 3/4', Image.open(d / 'render_tail_below.png')), ('Sheet 3/4 crop (no view from below)', TQ.crop((800, 60, 1374, 760)))], 800, 'composite_tail_below_pass9_pass10_sheet.png')
row([('Pass 9 plume', Image.open(G / 'pass9' / 'render_plume_side.png')), ('Pass 10 plume', Image.open(d / 'render_plume_side.png')), ('Sheet crop', SIDE.crop((1080, 60, 1374, 700)))], 800, 'composite_plume_side_pass9_pass10_sheet.png')
s10 = Image.open(d / 'render_sprite.png').convert('RGB').resize((192, 192), Image.LANCZOS); s10.save(d / 'render_sprite_192.png')
s9 = Image.open(G / 'pass9' / 'render_sprite_192.png').convert('RGB').resize((192, 192))
sh0 = SIDE.convert('RGB'); sh = Image.new('RGB', (192, 192), sh0.getpixel((5, 5))); r = sh0.resize((192, round(192 * sh0.height / sh0.width)), Image.LANCZOS); sh.paste(r, (0, (192 - r.height) // 2))
strip = Image.new('RGB', (192 * 3 + 16, 192), (30, 30, 30))
for i, im in enumerate([s9, s10, sh]): strip.paste(im, (i * 200, 0))
strip.save(d / 'composite_sprite_192_pass9_pass10_sheet.png'); strip.resize((strip.width * 2, 384), Image.NEAREST).save(d / 'composite_sprite_192_pass9_pass10_sheet_x2.png'); print('sprite')
for f in ('f11_launch', 'f22_apex', 'f38_landing'):
    row([('Pass 9 posed ' + f, Image.open(w / f'pass9posed_{f}.png')), ('Pass 10 posed ' + f, Image.open(d / f'posed_{f}.png'))], 800, f'composite_posed_{f}_pass9_pass10.png')
