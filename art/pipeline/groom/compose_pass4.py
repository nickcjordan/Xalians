"""Unretouched Cycles renders beside the approved reference or runtime pass."""
from PIL import Image,ImageDraw,ImageFont,ImageOps
from pathlib import Path
import json,argparse
ap=argparse.ArgumentParser();ap.add_argument('--iteration');a=ap.parse_args()
OUT=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass4');SURF=OUT.parents[1]/'luceras-surface/pass3';BLOB=Path('C:/dev/art-data/pipeline/blobs')
refs={'side':'8a78d9128f7aebb5c291f60cb70e0cfbec928fa357d1a91dff1eba27746286f9','front':'c96afd98e282fa5abaee6f1aed3245e0892be71998e1ade914c7c3af4f108178','three_quarter':'ee0d82e980b576199a8d8bdd66463ff92c5175771c6ea12a013afba580f89de4','head':'dd345a46081ff9cfe97e3f4db380ae45a249a55322e0b15ea54b28846af6c4a9'}
refs.update(hind_leg=refs['side'],tail_plume=refs['side'],sprite=refs['side'],portrait=refs['head'])
crops={'hind_leg':(.36,.36,.73,.94),'tail_plume':(.76,.07,.995,.62)}
def composite(im,ref,label,rightlabel,path):
 ref=ref.resize((round(ref.width*im.height/ref.height),im.height),Image.Resampling.LANCZOS);h=36 if im.height>192 else 24;g=Image.new('RGB',(im.width+ref.width,im.height+h),(35,35,35));g.paste(im,(0,h));g.paste(ref,(im.width,h));d=ImageDraw.Draw(g)
 try:f=ImageFont.truetype('arial.ttf',18 if im.height>192 else 10)
 except OSError:f=ImageFont.load_default()
 d.text((8,6),label,fill='white',font=f);d.text((im.width+8,6),rightlabel,fill='white',font=f);g.save(path);return g
allims=[]
for view,sha in refs.items():
 prefix='iter'+a.iteration+'_' if a.iteration else 'render_';rp=OUT/(prefix+view+'.png')
 if not rp.exists():continue
 im=Image.open(rp).convert('RGB');ref=Image.open(BLOB/sha[:2]/sha).convert('RGB')
 if view in crops:
  l,t,r,b=crops[view];w,h=ref.size;ref=ref.crop((int(l*w),int(t*h),int(r*w),int(b*h)))
 dest=OUT/(('iter'+a.iteration+'_' if a.iteration else 'composite_')+view+'_vs_sheet.png');comp=composite(im,ref,'B-spm3 Cycles '+view,'Approved sheet',dest);comp.thumbnail((900,440));allims.append(comp)
 if not a.iteration and view in ('side','three_quarter'):
  # Use the runtime half of the user-specified comparison as provenance.
  runtime=Image.open(SURF/('composite_runtime_'+view+'_vs_sheet.png')).convert('RGB');rw=Image.open(SURF/('runtime_'+view+'.png')).width;runtime=runtime.crop((0,42,rw,runtime.height));composite(im,runtime,'B-spm3 Cycles strands','Live pass 3',OUT/('composite_'+view+'_vs_live_pass3.png'))
if not a.iteration:
 for view in ('sprite','portrait'):
  if not (OUT/('render_'+view+'.png')).exists() or not (OUT.parent/'pass3'/('render_'+view+'.png')).exists():continue
  im=Image.open(OUT/('render_'+view+'.png')).convert('RGB');old=Image.open(OUT.parent/'pass3'/('render_'+view+'.png')).convert('RGB');composite(im,old,'B-spm3 pass 4','Pass 3 delivered render',OUT/('composite_'+view+'_vs_pass3.png'))
if allims:
 contact=Image.new('RGB',(1800,440*((len(allims)+1)//2)),(55,55,55))
 for i,im in enumerate(allims):contact.paste(im,((i%2)*900,(i//2)*440))
 contact.save(OUT/(('iter'+a.iteration if a.iteration else 'final')+'_contact.png'))
(OUT/'reference_provenance.json').write_text(json.dumps({'sha256':refs,'detail_crop_fractions':crops,'compositing':'Reference resized to render height, no retouching or color adjustment. Runtime comparison uses left panel of pass3 composite, excluding its title bar.'},indent=2))


if not a.iteration:
 for view in ('side','head'):
  images=[Image.open(OUT.parent/'pass3'/('render_'+view+'.png')).convert('RGB'),Image.open(OUT/('render_'+view+'.png')).convert('RGB'),Image.open(BLOB/refs[view][:2]/refs[view]).convert('RGB')]
  h=images[1].height;images=[im.resize((round(im.width*h/im.height),h),Image.Resampling.LANCZOS) for im in images];canvas=Image.new('RGB',(sum(im.width for im in images),h+36),(35,35,35));d=ImageDraw.Draw(canvas);x=0
  for im,label in zip(images,['Pass 3 delivered render (mixed older state)','B-spm3 pass 4 final','Approved sheet']):
   canvas.paste(im,(x,36));d.text((x+10,8),label,fill='white');x+=im.width
  canvas.save(OUT/('composite_'+view+'_pass3_pass4_sheet.png'))
