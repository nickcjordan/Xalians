"""Feet diagnosis sheet: the current left hind foot from six sides, with the references under it.

python diagnosis_sheet.py <render dir> <r02.png> <m01.png> <silhouette.png> <out.png>
"""
import sys
from PIL import Image, ImageDraw, ImageFont

rd, r02, m01, sil, out = sys.argv[1:6]
font = ImageFont.truetype('arial.ttf', 22); small = ImageFont.truetype('arial.ttf', 18)
views = [('ffront', 'front: 0.114 fh wide'), ('fside', 'side: 0.112 fh long'), ('fq', 'three-quarter'),
         ('frq', 'rear three-quarter: 0.132 fh seen'), ('fback', 'back: wide slab, thin ankle'), ('fsole', 'sole: as wide as long')]
C = 380
row1 = [Image.open(f'{rd}/{v}.png').convert('RGB').resize((C, C)) for v, _ in views]
a = Image.open(r02).convert('RGB'); w, h = a.size; a = a.crop((0, h//2, w, h))
b = Image.open(m01).convert('RGB'); w, h = b.size; b = b.crop((0, int(h*0.80), w, h))
c = Image.open(sil).convert('RGB'); w, h = c.size; c = c.crop((80, int(h*0.84), 1000, h))
H2 = 330
W = C*6
ra = a.resize((round(a.width*H2/a.height), H2))
rc = c.resize((round(c.width*H2/c.height), H2))
rb = b.resize((W, round(b.height*W/b.width)))
S = Image.new('RGB', (W, 80+C+50+H2+50+rb.height+60), 'white'); d = ImageDraw.Draw(S)
d.text((10, 12), 'Why the hind feet read clunky: current left hind foot (assembled-3179, bare clay); fh = figure heights', fill=0, font=font)
for k, (im, (_, cap)) in enumerate(zip(row1, views)):
    S.paste(im, (k*C, 80)); d.text((k*C+6, 56), cap, fill=(30, 30, 30), font=small)
y = 80+C+50
d.text((6, y-26), 'accepted paw reference (r02): hind paw three-quarter and side', fill=(30, 30, 30), font=small); S.paste(ra, (0, y))
d.text((ra.width+46, y-26), "Nick's silhouette: low, flat feet", fill=(30, 30, 30), font=small); S.paste(rc, (ra.width+40, y))
y += H2+50
d.text((6, y-26), 'reference sheet feet (front, front-left, left, back, right, front-right)', fill=(30, 30, 30), font=small); S.paste(rb, (0, y))
d.text((10, y+rb.height+18), 'The foot is as wide as it is long (0.114 by 0.112 fh), 3.2 times the ankle width, and hangs 0.067 fh off the outside of the ankle; the side view sees only its length.', fill=0, font=small)
S.save(out)
