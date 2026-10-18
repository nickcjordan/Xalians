from pathlib import Path
from PIL import Image,ImageOps,ImageDraw,ImageFont
import argparse,json
p=argparse.ArgumentParser();p.add_argument('--iteration');a=p.parse_args();O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass6');B=Path('C:/dev/art-data/pipeline/blobs');prefix='iter'+a.iteration+'_' if a.iteration else 'render_'
refs={'side':'8a78d9128f7aebb5c291f60cb70e0cfbec928fa357d1a91dff1eba27746286f9','three_quarter':'ee0d82e980b576199a8d8bdd66463ff92c5175771c6ea12a013afba580f89de4','front':'c96afd98e282fa5abaee6f1aed3245e0892be71998e1ade914c7c3af4f108178'}
crops={'fore_side':('side',(.19,.73,.30,.92)),'hind_side':('side',(.55,.72,.73,.93)),'fore_three_quarter':('three_quarter',(.24,.74,.34,.94)),'hind_three_quarter':('three_quarter',(.57,.73,.72,.93)),'paws_front':('front',(.24,.72,.76,.97))}
def ref(view):
 name,box=crops.get(view,(view,None));sha=refs[name];im=Image.open(B/sha[:2]/sha).convert('RGB')
 if box:im=im.crop(tuple(round(v*s) for v,s in zip(box,(im.width,im.height,im.width,im.height))))
 return im
font=ImageFont.truetype('arial.ttf',18)
def panel(ims,labels,path,size):
 w,h=size;out=Image.new('RGB',(w*len(ims),h+34),(194,194,194));d=ImageDraw.Draw(out)
 for i,(im,label) in enumerate(zip(ims,labels)):
  im=ImageOps.contain(im,(w,h),Image.Resampling.LANCZOS);out.paste(im,(i*w+(w-im.width)//2,34+(h-im.height)//2));d.rectangle((i*w,0,(i+1)*w,33),fill=(38,38,38));d.text((i*w+8,6),label,font=font,fill='white')
 out.save(path);return out
for view in list(crops)+['side','three_quarter']:
 f=O/(prefix+view+'.png')
 if not f.exists():continue
 im=Image.open(f).convert('RGB');old=O/('pass5_'+view+'.png')
 if view in crops:
  if not old.exists():continue
  panel([Image.open(old).convert('RGB'),im,ref(view)],['Pass 5','Pass 6 '+view,'Approved sheet'],O/((prefix if a.iteration else 'composite_')+view+'_pass5_pass6_sheet.png'),(800,350) if view=='paws_front' else (650,650))
 else:panel([im,ref(view)],['Pass 6 '+view,'Approved sheet'],O/((prefix if a.iteration else 'composite_')+view+'_vs_sheet.png'),(1374,1145))
f=O/(prefix+'sprite.png')
if f.exists():
 im=Image.open(f);im.resize((192,192),Image.Resampling.LANCZOS).save(O/(prefix+'sprite_192.png'));im=Image.open(O/(prefix+'sprite_192.png')).convert('RGB');old=Image.open(O.parent/'pass5/render_sprite.png').convert('RGB');panel([old,im],['Pass 5, 192 px','Pass 6, 192 px'],O/'composite_sprite_pass5_pass6.png',(192,192))
(O/'reference_provenance.json').write_text(json.dumps({'references':refs,'crops_fractional':crops,'proof':'Unretouched Cycles renders; Lanczos resizing only; baseline close cameras rerender pass5 with identical settings'},indent=2))
