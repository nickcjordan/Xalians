"""Package the selected pass3 crops without changing rendered pixels."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib,shutil
OUT=Path(r'C:/dev/art-data/pipeline/codex-stream/luceras-rig/pass3')
FONT=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',22)
SMALL=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',16)
records=[]
for pose in ('crouch','leap'):
 for region in ('elbow','hip','rump','cheek','horn_base'):
  result=Image.new('RGB',(1024,1120),(20,23,28));draw=ImageDraw.Draw(result)
  draw.text((12,10),pose.upper()+' | '+region.replace('_',' ').upper(),font=FONT,fill='white')
  for row,kind in enumerate(('sculpt','game')):
   source=OUT/f'after_{pose}_{region}_{kind}.png';dest=source
   records.append({'source':source.name,'output':dest.name,'sha256':hashlib.sha256(source.read_bytes()).hexdigest()})
   for col,(prefix,label) in enumerate((('before','PASS 1 BEFORE'),('after','PASS 3 AFTER'))):
    im=Image.open(OUT/f'{prefix}_{pose}_{region}_{kind}.png').convert('RGB');assert im.size==(512,512)
    x=col*512;y=42+row*539;draw.text((x+10,y),label+' | '+kind.upper(),font=SMALL,fill='white');result.paste(im,(x,y+26))
  result.save(OUT/f'before_after_{pose}_{region}.png')
(OUT/'crop_provenance.json').write_text(json.dumps({'method':__doc__,'selected_blend':'rig.blend','selected_blend_sha256':hashlib.sha256((OUT/'rig.blend').read_bytes()).hexdigest(),'crops':records},indent=2))
print('Ten before/after comparison sheets packaged from the selected pass3 renders.')
