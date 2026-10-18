"""Lanczos shipping exports and labeled proof without painted or sharpened pixels."""
from PIL import Image,ImageDraw,ImageFont,ImageOps
from pathlib import Path
import json,argparse,time,hashlib
ap=argparse.ArgumentParser();ap.add_argument('--iteration');ap.add_argument('--diagnostic',action='store_true');a=ap.parse_args()
O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass5');B=Path('C:/dev/art-data/pipeline/blobs');S=O.parents[1]/'luceras-surface/pass3'
refs={'side':'8a78d9128f7aebb5c291f60cb70e0cfbec928fa357d1a91dff1eba27746286f9','front':'c96afd98e282fa5abaee6f1aed3245e0892be71998e1ade914c7c3af4f108178','three_quarter':'ee0d82e980b576199a8d8bdd66463ff92c5175771c6ea12a013afba580f89de4','head':'dd345a46081ff9cfe97e3f4db380ae45a249a55322e0b15ea54b28846af6c4a9'}
refs.update(hind_leg=refs['side'],tail_plume=refs['side'],sprite=refs['side'],portrait=refs['head'],toes=refs['side'])
crops={'hind_leg':(.36,.36,.73,.94),'tail_plume':(.76,.07,.995,.62),'toes':(.55,.76,.74,.94)}
def reference(view):
 sha=refs[view];im=Image.open(B/sha[:2]/sha).convert('RGB')
 if view in crops:
  l,t,r,b=crops[view];w,h=im.size;im=im.crop((int(l*w),int(t*h),int(r*w),int(b*h)))
 if view=='sprite':
  fitted=ImageOps.contain(im,(184,184),method=Image.Resampling.LANCZOS);im=Image.new('RGB',(192,192),(192,192,192));im.paste(fitted,((192-fitted.width)//2,(192-fitted.height)//2))
 return im
def panel(images,labels,path,height=None):
 h=height or images[0].height
 images=[im.resize((round(im.width*h/im.height),h),Image.Resampling.LANCZOS) if im.height!=h else im for im in images]
 th=32 if h>192 else 24;out=Image.new('RGB',(sum(im.width for im in images),h+th),(35,35,35));d=ImageDraw.Draw(out);x=0
 try:font=ImageFont.truetype('arial.ttf',16 if h>192 else 10)
 except OSError:font=ImageFont.load_default()
 for im,label in zip(images,labels):out.paste(im,(x,th));d.text((x+7,5),label,fill='white',font=font);x+=im.width
 out.save(path);return out
if a.diagnostic:
 images=[Image.open(O.parent/'pass4/render_sprite.png').convert('RGB')];labels=['Pass 4: direct, denoise']
 for n in ['direct192_no_denoise','supersample768_denoise','supersample768_no_denoise']:
  f=O/('diagnostic_'+n+'.png')
  if f.exists():images.append(Image.open(f).convert('RGB').resize((192,192),Image.Resampling.LANCZOS));labels.append(n)
 images.append(reference('sprite'));labels.append('Approved sheet')
 panel(images,labels,O/'crispness_diagnostic_comparison.png',192)
 raise SystemExit()
prefix='iter'+a.iteration+'_' if a.iteration else 'render_'
exports=[]
for view,size in [('sprite',192),('portrait',512)]:
 source=O/(prefix+view+'_4x.png')
 if source.exists():
  t=time.perf_counter();im=Image.open(source);im.resize((size,size),Image.Resampling.LANCZOS).save(O/(prefix+view+'.png'));seconds=time.perf_counter()-t
  exports.append({'source':source.name,'output':prefix+view+'.png','source_dimensions':list(im.size),'target_dimensions':[size,size],'method':'Pillow Lanczos, no unsharp mask, no color changes','seconds':seconds,'sha256':hashlib.sha256((O/(prefix+view+'.png')).read_bytes()).hexdigest()})
(O/((prefix if a.iteration else '')+'shipping_exports.json')).write_text(json.dumps(exports,indent=2))
contact=[]
for view in refs:
 f=O/(prefix+view+'.png')
 if not f.exists():continue
 im=Image.open(f).convert('RGB');ref=reference(view)
 comp=panel([im,ref],['B-7qgf '+view,'Approved sheet'],O/((prefix if a.iteration else 'composite_')+view+'_vs_sheet.png'))
 comp.thumbnail((1000,460));contact.append(comp)
 if not a.iteration and view in ('side','three_quarter'):
  runtime=Image.open(S/('composite_runtime_'+view+'_vs_sheet.png')).convert('RGB');rw=Image.open(S/('runtime_'+view+'.png')).width;runtime=runtime.crop((0,42,rw,runtime.height))
  panel([im,runtime],['B-7qgf Cycles strands','Live pass 3'],O/('composite_'+view+'_vs_live_pass3.png'))
 if view in ('sprite','tail_plume','head'):
  old=Image.open(O.parent/'pass4'/('render_'+view+'.png')).convert('RGB')
  panel([old,im,ref],['Pass 4','Pass 5 '+('iteration '+a.iteration if a.iteration else 'final'),'Approved sheet'],O/((prefix if a.iteration else 'composite_')+view+'_pass4_pass5_sheet.png'),im.height)
if contact:
 out=Image.new('RGB',(2000,460*((len(contact)+1)//2)),(55,55,55))
 for i,im in enumerate(contact):out.paste(im,((i%2)*1000,(i//2)*460))
 out.save(O/(prefix+'contact.png'))
(O/'reference_provenance.json').write_text(json.dumps({'sha256':refs,'detail_crop_fractions':crops,'method':'Reference resized to matching panel height with Lanczos. Sprite sheet is fitted without distortion to a 192 by 192 canvas, so all sprite columns share the shipping size. Cycles proof pixels unretouched. Shipping files reduced from 4x with Lanczos. Pass4 source files are original delivered renders.'},indent=2))
