"""Pair actual Cycles renders with explicit labels, never retouch body pixels."""
from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json,sys
OUT=Path(r'C:\dev\art-data\pipeline\codex-stream\luceras-rig\pass1')
POSES=['rest','crouch','leap','landing','head_left_up','tail_side_up','foreleg_step','breath_in']
REGIONS=['shoulder','elbow','hip','hock','neck','tail_base']
FONT=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',22)
SMALL=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',16)
def pair(prefix,pose,region=None):
 stem=prefix+'_'+pose+('_'+region if region else '')
 files=[OUT/(stem+'_'+k+'.png') for k in ('sculpt','game')]
 if not all(p.exists() for p in files):return None
 images=[Image.open(p).convert('RGB') for p in files];w,h=images[0].size
 result=Image.new('RGB',(w*2,h+42),(24,27,32));d=ImageDraw.Draw(result)
 for i,(im,label) in enumerate(zip(images,['SCULPT','GAME MESH'])):
  result.paste(im,(i*w,42));d.text((i*w+12,10),pose.replace('_',' ')+' | '+(region+' | ' if region else '')+label,font=SMALL,fill='white')
 result.save(OUT/(stem+'_pair.png'));return result
def main():
 prefix=sys.argv[1] if len(sys.argv)>1 else 'final'
 rows=[p for n in POSES if (p:=pair(prefix,n))]
 for pose in ('crouch','leap'):
  pair(prefix,pose,'neck_under_jaw')
  crops=[p for n in REGIONS if (p:=pair(prefix,pose,n))]
  if crops:
   sheet=Image.new('RGB',(crops[0].width*2,crops[0].height*3),(20,23,28))
   for i,c in enumerate(crops):sheet.paste(c,((i%2)*c.width,(i//2)*c.height))
   sheet.save(OUT/f'{prefix}_{pose}_closeups.png')
 if rows:
  width=1280;scaled=[im.resize((width,round(im.height*width/im.width))) for im in rows]
  sheet=Image.new('RGB',(width,sum(im.height for im in scaled)+76),(20,23,28));d=ImageDraw.Draw(sheet);d.text((16,14),'LUCERAS | B-v3g9 | Deformation review',font=FONT,fill='white');d.text((16,46),'Cycles clay. Same camera and skeleton for each pair. Sculpt left, game mesh right.',font=SMALL,fill='#bec8d4');y=76
  for im in scaled:sheet.paste(im,(0,y));y+=im.height
  sheet.save(OUT/('deformation_sheet.png' if prefix=='final' else prefix+'_deformation_sheet.png'))
 path=OUT/(prefix+'_camera_joints.json')
 if path.exists():
  data=json.loads(path.read_text())
  for view,bones in data.items():
   f=OUT/(prefix+'_rest_'+('' if view=='side' else view+'_')+'sculpt.png')
   if not f.exists():continue
   im=Image.open(f).convert('RGB');d=ImageDraw.Draw(im);w,h=im.size
   for n,b in bones.items():
    if n.startswith('socket') or (view=='side' and ('_r_' in n or '_fr_' in n or '_hr_' in n)):continue
    a=(b['head'][0]*w,(1-b['head'][1])*h);z=(b['tail'][0]*w,(1-b['tail'][1])*h)
    color='#74e5ff' if n.startswith('leg') else '#ffe787';d.line((a,z),fill=color,width=2);d.ellipse((a[0]-3,a[1]-3,a[0]+3,a[1]+3),fill=color)
    if not n.startswith('spine'):d.text((a[0]+4,a[1]-12),n,font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',10),fill=color)
   im.save(OUT/f'{prefix}_pivots_{view}.png')
if __name__=='__main__':main()
