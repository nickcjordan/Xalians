from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import sys,json
sys.path.insert(0,str(Path(__file__).parent))
import compose as c
OUT=Path(r'C:\dev\art-data\pipeline\codex-stream\luceras-rig\pass2');c.OUT=OUT
FONT=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',22);SMALL=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',16)
def main():
 rows=[c.pair('final',pose) for pose in c.POSES];assert all(rows)
 scaled=[im.resize((1280,round(im.height*1280/im.width))) for im in rows]
 sheet=Image.new('RGB',(1280,sum(im.height for im in scaled)+76),(20,23,28));d=ImageDraw.Draw(sheet);d.text((16,14),'LUCERAS | B-bvrc | Deformation review',font=FONT,fill='white');d.text((16,46),'Cycles clay. Same camera and skeleton for each pair. Sculpt left, game mesh right.',font=SMALL,fill='#bec8d4');y=76
 for im in scaled:sheet.paste(im,(0,y));y+=im.height
 sheet.save(OUT/'deformation_sheet.png')
 for pose in ('crouch','leap'):
  crops=[c.pair('final',pose,region) for region in c.REGIONS];assert all(crops)
  s=Image.new('RGB',(crops[0].width*2,crops[0].height*3),(20,23,28))
  for i,im in enumerate(crops):s.paste(im,((i%2)*im.width,(i//2)*im.height))
  s.save(OUT/f'final_{pose}_closeups.png')
  for region in ('elbow','hip','rump','cheek','horn_base'):
   result=Image.new('RGB',(1024,1120),(20,23,28));draw=ImageDraw.Draw(result);draw.text((12,10),pose.upper()+' | '+region.replace('_',' ').upper(),font=FONT,fill='white')
   for row,kind in enumerate(('sculpt','game')):
    for col,(prefix,label) in enumerate((('before','PASS 1 BEFORE'),('after','PASS 2 AFTER'))):
     im=Image.open(OUT/f'{prefix}_{pose}_{region}_{kind}.png').convert('RGB');assert im.size==(512,512)
     x=col*512;y=42+row*539;draw.text((x+10,y),label+' | '+kind.upper(),font=SMALL,fill='white');result.paste(im,(x,y+26))
   result.save(OUT/f'before_after_{pose}_{region}.png')
 print('Eight-pose sheet and ten before/after region sheets created.')
if __name__=='__main__':main()
