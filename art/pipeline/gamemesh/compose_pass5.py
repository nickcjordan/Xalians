"""Compose pass 4 comparisons and bend grids from one numbered render iteration."""
import os,sys,runpy,json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
OUT=Path(r'C:\dev\art-data\pipeline\codex-stream\luceras-gamemesh\pass5')
ITER=int(sys.argv[1]) if len(sys.argv)>1 else 1
os.environ['GM_OUT']=str(OUT)
helpers=runpy.run_path(str(Path(__file__).with_name('compose_checks.py')),run_name='__main__')
for limb in ('fore','hind'):
 for side in ('l','r'):
  view=f'{limb}_paw_{side}_three_quarter'
  if (OUT/f'iter{ITER}_game_{view}.png').exists():helpers['pair'](view)
try:font=ImageFont.truetype('arial.ttf',17)
except OSError:font=ImageFont.load_default()
poses=('rest','crouch','leap','landing')
for joint in ('shoulder','elbow','wrist','hip','stifle','hock','neck','tail_base'):
 files=[OUT/f'iter{ITER}_bend_{joint}_{p}_{v}.png' for v in ('sculpt','game') for p in poses]
 if not all(f.exists() for f in files):continue
 grid=Image.new('RGB',(1536,840),(25,25,25));d=ImageDraw.Draw(grid)
 for row,v in enumerate(('sculpt','game')):
  for col,p in enumerate(poses):
   im=Image.open(OUT/f'iter{ITER}_bend_{joint}_{p}_{v}.png');grid.paste(im,(384*col,420*row+36))
   d.text((384*col+8,420*row+8),f'{joint} / {p} / '+('sculpt' if v=='sculpt' else 'game mesh'),fill='white',font=font)
 grid.save(OUT/f'check_bend_{joint}.png')

