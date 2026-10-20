"""B-yqgg: paw crop boards, the eight-pose sheet (pass 3 format) and pass 3 | new comparison."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import sys
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else r'C:/dev/art-data/pipeline/codex-stream/luceras-pawintegrate/pass1')
P3 = Path(r'C:/dev/art-data/pipeline/codex-stream/luceras-rig/pass3')
POSES = ['rest', 'crouch', 'leap', 'landing', 'head_left_up', 'tail_side_up', 'foreleg_step', 'breath_in']
F = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 22); S = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 16)
BG = (20, 23, 28)
def tile(img, label, w):
    im = img.convert('RGB').resize((w, round(img.height * w / img.width))); t = Image.new('RGB', (w, im.height + 26), BG); t.paste(im, (0, 26))
    ImageDraw.Draw(t).text((8, 4), label, font=S, fill='white'); return t
def grid(tiles, cols, title, sub, path):
    w, h = tiles[0].size; rows = (len(tiles) + cols - 1) // cols
    sh = Image.new('RGB', (w * cols, h * rows + 76), BG); d = ImageDraw.Draw(sh); d.text((16, 12), title, font=F, fill='white'); d.text((16, 46), sub, font=S, fill='#bec8d4')
    for i, t in enumerate(tiles): sh.paste(t, ((i % cols) * w, 76 + (i // cols) * h))
    sh.save(path); return path
# paw crops: one board per pose (4 paws x 2 views), one per paw-view across the poses
for pose in ('crouch', 'leap', 'landing', 'foreleg_step'):
    tl = [tile(Image.open(OUT / 'crops' / f'paw_{pose}_{k}_{s}_{v}.png'), f'{pose} | {k} {s} | {v}', 420) for k in ('fore', 'hind') for s in ('l', 'r') for v in ('side', 'front')]
    grid(tl, 4, f'LUCERAS | B-yqgg | paw crops | {pose}', 'Cycles clay, new sculpt with the welded pass 8 paws on the refit rig. Side view from the paw\'s own side, and a raised front three-quarter.', OUT / f'paw_crops_{pose}.png')
# deformation sheet, pass 3 format (sculpt | game pairs; the game mesh is parked and still has the old paws)
rows = []
for pose in POSES:
    a, b = Image.open(OUT / f'final_{pose}_sculpt.png').convert('RGB'), Image.open(OUT / f'final_{pose}_game.png').convert('RGB'); w, h = a.size
    r = Image.new('RGB', (w * 2, h + 42), BG); d = ImageDraw.Draw(r); r.paste(a, (0, 42)); r.paste(b, (w, 42))
    d.text((12, 10), pose.replace('_', ' ') + ' | SCULPT (new paws)', font=S, fill='white'); d.text((w + 12, 10), pose.replace('_', ' ') + ' | GAME MESH (parked, old paws)', font=S, fill='white')
    r.save(OUT / f'final_{pose}_pair.png'); rows.append(r)
W = 1280; sc = [im.resize((W, round(im.height * W / im.width))) for im in rows]
sh = Image.new('RGB', (W, sum(i.height for i in sc) + 76), BG); d = ImageDraw.Draw(sh)
d.text((16, 14), 'LUCERAS | ' + ('B-yqgg pass 2' if OUT.name == 'pass2' else 'B-yqgg') + ' | Deformation review (paws integrated)', font=F, fill='white'); d.text((16, 46), 'Cycles clay. Same cameras and skeleton as rig pass 3. Sculpt left, game mesh right (game mesh untouched, paws out of date).', font=S, fill='#bec8d4')
y = 76
for i in sc: sh.paste(i, (0, y)); y += i.height
sh.save(OUT / 'deformation_sheet.png')
# comparison: pass 3 sculpt | new sculpt per pose
rows = []
for pose in POSES:
    a, b = Image.open(P3 / f'final_{pose}_sculpt.png').convert('RGB'), Image.open(OUT / f'final_{pose}_sculpt.png').convert('RGB'); w, h = a.size
    r = Image.new('RGB', (w * 2, h + 42), BG); dd = ImageDraw.Draw(r); r.paste(a, (0, 42)); r.paste(b, (w, 42))
    dd.text((12, 10), pose.replace('_', ' ') + ' | RIG PASS 3 SCULPT (old paws)', font=S, fill='white'); dd.text((w + 12, 10), pose.replace('_', ' ') + ' | B-yqgg SCULPT (new paws)', font=S, fill='white'); rows.append(r)
sc = [im.resize((W, round(im.height * W / im.width))) for im in rows]
sh = Image.new('RGB', (W, sum(i.height for i in sc) + 76), BG); d = ImageDraw.Draw(sh)
d.text((16, 14), 'LUCERAS | rig pass 3 vs B-yqgg | sculpt deformation', font=F, fill='white'); d.text((16, 46), 'Same cameras, same skeleton and poses. Left: pass 3 sheet sculpt. Right: new sculpt with the approved paws.', font=S, fill='#bec8d4')
y = 76
for i in sc: sh.paste(i, (0, y)); y += i.height
sh.save(OUT / 'comparison_pass3_vs_new.png')
print('composed')
# paw crops before/after: pass 3 rig (old paws) | B-yqgg (new paws), same cameras
for pose in ([] if not (OUT / 'crops' / 'pass3paw_crouch_fore_l_side.png').exists() else ['crouch', 'leap', 'landing', 'foreleg_step']):
    tl = []
    for k in ('fore', 'hind'):
        for s in ('l', 'r'):
            for v in ('side', 'front'):
                tl.append(tile(Image.open(OUT / 'crops' / f'pass3paw_{pose}_{k}_{s}_{v}.png'), f'PASS 3 | {k} {s} {v}', 300))
                tl.append(tile(Image.open(OUT / 'crops' / f'paw_{pose}_{k}_{s}_{v}.png'), f'NEW | {k} {s} {v}', 300))
    grid(tl, 8, f'LUCERAS | paw crops | {pose} | rig pass 3 vs B-yqgg', 'Same cameras and pose. Each pair: pass 3 rig with the old paws, then the refit rig with the welded pass 8 paws.', OUT / f'paw_crops_{pose}_pass3_vs_new.png')
print('composed before/after')
