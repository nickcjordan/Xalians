from pathlib import Path
import sys,json,hashlib
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).parent;sys.path.insert(0,str(root));import compose3
compose3.main();import compose_crops3
p=Path(r'C:/dev/art-data/pipeline/codex-stream/luceras-rig/pass3');poses=compose3.POSES
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18)
for prefix in ('final','browser'):
 files=[p/(f'final_{pose}_pair.png' if prefix=='final' else f'browser_{pose}.png') for pose in poses]
 if all(f.exists() for f in files):
  w=800 if prefix=='final' else 600;rows=[]
  for pose,f in zip(poses,files):
   im=Image.open(f).convert('RGB');im=im.resize((w,round(im.height*w/im.width)));tile=Image.new('RGB',(w,im.height+26),(20,23,28));tile.paste(im,(0,26));ImageDraw.Draw(tile).text((8,3),pose.replace('_',' '),font=font,fill='white');rows.append(tile)
  sheet=Image.new('RGB',(2*w,4*rows[0].height),(20,23,28))
  for i,tile in enumerate(rows):sheet.paste(tile,((i%2)*w,(i//2)*tile.height))
  sheet.save(p/(prefix+'_pose_contact.png'))
d=json.loads((p/'crop_provenance.json').read_text());d['baseline_origin']='Pass1 rig rendered by the same detail cameras in pass2; copied unchanged into pass3.';d['pass1_rig_sha256']=hashlib.sha256((p.parent/'pass1/rig.blend').read_bytes()).hexdigest();d['baseline_copies_exact']=all(hashlib.sha256(f.read_bytes()).digest()==hashlib.sha256((p.parent/'pass2'/f.name).read_bytes()).digest() for f in p.glob('before_*_sculpt.png')) and all(hashlib.sha256(f.read_bytes()).digest()==hashlib.sha256((p.parent/'pass2'/f.name).read_bytes()).digest() for f in p.glob('before_*_game.png'));(p/'crop_provenance.json').write_text(json.dumps(d,indent=2))
