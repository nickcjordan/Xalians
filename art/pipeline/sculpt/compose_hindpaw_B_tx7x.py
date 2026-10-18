"""Compose already-rendered clay proof. No shape or pixel content edits."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
O=Path(r'C:\dev\art-data\pipeline\codex-stream\luceras-hindpaw\pass1')
f=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',24)
for view in ['hind_paw_side','hind_paw_three_quarter','hind_paw_low_front','full_side']:
 paths=[O/(tag+'_'+view+'.png') for tag in ['generated','approved','repaired']]
 if not all(p.exists() for p in paths):continue
 canvas=Image.new('RGB',(2700,948),(28,28,28));d=ImageDraw.Draw(canvas)
 for i,(p,label) in enumerate(zip(paths,['GENERATED | shape authority','APPROVED | before repair','REPAIRED | B-tx7x'])):
  canvas.paste(Image.open(p).convert('RGB'),(i*900,48));d.text((i*900+15,12),label,fill='white',font=f)
 canvas.save(O/('comparison_'+view+'.png'))
