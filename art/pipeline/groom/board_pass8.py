"""B-hxhq: tile one iteration's review renders into a single board image. usage: python board_pass8.py DIR PREFIX"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw
d = Path(sys.argv[1]); pre = sys.argv[2]
views = ['plume_side', 'plume_threeq', 'plume_front', 'plume_back', 'plume_top', 'side', 'three_quarter', 'sprite', 'posed_apex', 'posed_idle']
ims = [(v, Image.open(d / f'{pre}{v}.png').convert('RGB')) for v in views if (d / f'{pre}{v}.png').exists()]
H = 420; tiles = []
for v, im in ims:
    if v == 'sprite': im = im.resize((192, 192), Image.LANCZOS).resize((384, 384), Image.NEAREST)
    im = im.resize((round(im.width * H / im.height), H), Image.LANCZOS); dr = ImageDraw.Draw(im); dr.rectangle([0, 0, 150, 16], fill=(20, 20, 20)); dr.text((4, 2), v, fill=(255, 255, 255)); tiles.append(im)
rows = [tiles[:5], tiles[5:]]
W = max(sum(t.width for t in r) for r in rows if r); out = Image.new('RGB', (W, H * len([r for r in rows if r])), (40, 40, 40)); y = 0
for r in rows:
    if not r: continue
    x = 0
    for t in r: out.paste(t, (x, y)); x += t.width
    y += H
out.save(d / f'board_{pre.rstrip("_")}.png'); print(d / f'board_{pre.rstrip("_")}.png')
