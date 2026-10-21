"""B-hxhq: pass 8 | pass 9 | sheet composites. usage: python compose_pass8.py PASS8_DIR PREFIX [crop]"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw
d = Path(sys.argv[1]); pre = sys.argv[2]
G = Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom'); BL = Path('C:/dev/art-data/pipeline/blobs')
blob = lambda h: BL / h[:2] / h
SHEET = {'side': blob('8a78d9128f7aebb5c291f60cb70e0cfbec928fa357d1a91dff1eba27746286f9'), 'three_quarter': blob('ee0d82e980b576199a8d8bdd66463ff92c5175771c6ea12a013afba580f89de4'), 'front': blob('c96afd98e282fa5abaee6f1aed3245e0892be71998e1ade914c7c3af4f108178')}
def label(im, t):
    im = im.copy(); dr = ImageDraw.Draw(im); dr.rectangle([0, 0, 9 * len(t) + 10, 22], fill=(25, 25, 25)); dr.text((5, 5), t, fill=(255, 255, 255)); return im
def row(items, H, name):
    tiles = [label(im.convert('RGB').resize((round(im.width * H / im.height), H), Image.LANCZOS), t) for t, im in items]
    out = Image.new('RGB', (sum(t.width for t in tiles) + 8 * (len(tiles) - 1), H), (30, 30, 30)); x = 0
    for t in tiles: out.paste(t, (x, 0)); x += t.width + 8
    out.save(d / name); print(d / name)
# full views: pass 7 render | pass 8 | sheet, all on the sheet camera
for v in ('side', 'three_quarter'):
    p8 = d / f'{pre}{v}.png'
    if p8.exists(): row([('Pass 8 ' + v, Image.open(G / 'pass8' / f'render_{v}.png')), ('Pass 9 ' + v, Image.open(p8)), ('Sheet', Image.open(SHEET[v]))], 900, f'composite_{v}_pass8_pass9_sheet.png')
# plume close: pass 7 on the same camera | pass 8 | sheet crop
crops = {'plume_side': (SHEET['side'], (1080, 60, 1374, 700)), 'plume_threeq': (SHEET['three_quarter'], (1000, 70, 1374, 720))}
for v, (sh, box) in crops.items():
    p7 = G / 'pass8' / f'render_{v}.png'; p8 = d / f'{pre}{v}.png'
    if p8.exists() and p7.exists(): row([('Pass 8 ' + v, Image.open(p7)), ('Pass 9 ' + v, Image.open(p8)), ('Sheet crop', Image.open(sh).crop(box))], 800, f'composite_{v}_pass8_pass9_sheet.png')
# sprite strip at 192 px
sp7 = G / 'pass8' / 'render_sprite_192.png'; sp8 = d / f'{pre}sprite.png'
if sp8.exists():
    s8 = Image.open(sp8).convert('RGB').resize((192, 192), Image.LANCZOS); s8.save(d / f'{pre}sprite_192.png')
    sh0 = Image.open(SHEET['side']).convert('RGB'); sh = Image.new('RGB', (192, 192), sh0.getpixel((5, 5))); r = sh0.resize((192, round(192 * sh0.height / sh0.width)), Image.LANCZOS); sh.paste(r, (0, (192 - r.height) // 2))
    strip = Image.new('RGB', (192 * 3 + 16, 192), (30, 30, 30))
    for i, im in enumerate([Image.open(sp7).convert('RGB').resize((192, 192)), s8, sh]): strip.paste(im, (i * 200, 0))
    strip.save(d / 'sprite_strip_pass8_pass9_sheet_192.png'); strip.resize((strip.width * 2, 384), Image.NEAREST).save(d / 'sprite_strip_pass8_pass9_sheet_192_x2.png'); print('strip')
