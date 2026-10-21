"""Pose board and close-up sheet from render_board.py's renders.

  python art/species-construction/anim/compose_board.py <rig dir> <out dir> [--label "rig build N"]

rig-pose-board.png: the side view of every pose in one row (rest first), labelled, with each pose's check
numbers under it. rig-closeups.png: one row per pose, columns shoulder, hip, neck, ear root, tail fork.
"""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

p = argparse.ArgumentParser()
p.add_argument('rig', type=Path)
p.add_argument('out', type=Path)
p.add_argument('--label', default='')
a = p.parse_args()
R = a.rig/'renders'
poses = list(json.loads((a.rig/'poses.json').read_text()))
checks = json.loads((a.rig/'checks.json').read_text())['poses']
try:
    font = ImageFont.truetype('arial.ttf', 22)
    small = ImageFont.truetype('arial.ttf', 16)
except OSError:
    font = small = ImageFont.load_default()
LABEL = {'rest': 'rest', 'night_stalk': 'Night Stalk crouch', 'ears_flat_back': 'ears flat back',
         'tails_drawn_in': 'tails drawn in', 'tails_fanned': 'tails fanned', 'head_turn': 'head turn, jaw open',
         'arm_reach': 'arm reach', 'leg_reach': 'leg reach', 'twist_bend': 'trunk twist and bend'}
cell = 620
head, foot = 40, 70
cols = 5
rows = -(-len(poses)//cols)
board = Image.new('RGB', (cols*cell, rows*(cell+head+foot)+50), (245, 245, 245))
d = ImageDraw.Draw(board)
d.text((12, 12), f'Akinza rig, clay pose board {a.label}: side view from the left, one framing for every pose', fill=(0, 0, 0), font=font)
for i, name in enumerate(poses):
    x, y = (i % cols)*cell, 50+(i//cols)*(cell+head+foot)
    im = Image.open(R/f'{name}_side.png').resize((cell, cell), Image.LANCZOS)
    board.paste(im, (x, y+head))
    d.text((x+10, y+8), LABEL.get(name, name), fill=(0, 0, 0), font=font)
    c = checks[name]
    t = c['tails']
    near = min(v['min_m'] for k, v in t.items() if '-' not in k)*1000
    d.text((x+10, y+head+cell+6), f"edge stretch p99 {c['edge_stretch_p99']:.2f}  volume {c['volume_change']*100:+.1f}%", fill=(40, 40, 40), font=small)
    d.text((x+10, y+head+cell+28), f"folded tris {c['folded_total']}  collapsed {c['collapsed_total']}  tails apart {near:.0f} mm", fill=(40, 40, 40), font=small)
a.out.mkdir(parents=True, exist_ok=True)
board.save(a.out/'rig-pose-board.png')
VIEWS = ['shoulder', 'hip', 'neck', 'ear_root', 'tail_fork']
c2, lw = 400, 230
sheet = Image.new('RGB', (lw+len(VIEWS)*c2, 50+len(poses)*c2), (245, 245, 245))
d = ImageDraw.Draw(sheet)
for k, v in enumerate(VIEWS):
    d.text((lw+k*c2+10, 14), v.replace('_', ' '), fill=(0, 0, 0), font=font)
for i, name in enumerate(poses):
    y = 50+i*c2
    d.text((10, y+10), LABEL.get(name, name), fill=(0, 0, 0), font=font)
    reg = checks[name]['regions']
    rmap = {'shoulder': 'shoulder', 'hip': 'hip', 'neck': 'neck', 'ear_root': 'ear_root', 'tail_fork': 'tail_fork'}
    for k, v in enumerate(VIEWS):
        sheet.paste(Image.open(R/f'{name}_{v}.png').resize((c2, c2), Image.LANCZOS), (lw+k*c2, y))
        r = reg[rmap[v]]
        d.text((12, y+44+k*22), f"{v.replace('_', ' ')}: fold {r['folded']} coll {r['collapsed']}", fill=(60, 60, 60), font=small)
sheet.save(a.out/'rig-closeups.png')
print(a.out/'rig-pose-board.png', board.size, a.out/'rig-closeups.png', sheet.size)
