from pathlib import Path
from PIL import Image,ImageDraw
O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-surface/pass1')
views=['side','three_quarter','front','head','hind_leg','tail_plume','sprite']
grid=Image.new('RGB',(7*320,2*345),(30,30,30));d=ImageDraw.Draw(grid)
for row,prefix in enumerate(['lookdev','runtime']):
 for col,v in enumerate(views):
  im=Image.open(O/f'{prefix}_{v}.png').convert('RGB').resize((320,320))
  grid.paste(im,(col*320,row*345+25));d.text((col*320+8,row*345+8),prefix+' '+v,fill='white')
grid.save(O/'proof_contact.png')
grid=Image.new('RGB',(6*256,4*278),(30,30,30));d=ImageDraw.Draw(grid)
for i in range(24):
 im=Image.open(O/f'runtime_orbit_{i:02d}.png').convert('RGB').resize((256,256));x=i%6*256;y=i//6*278
 grid.paste(im,(x,y+22));d.text((x+8,y+6),str(i*15)+' degrees',fill='white')
grid.save(O/'runtime_orbit_contact.png')
