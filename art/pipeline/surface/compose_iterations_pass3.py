from pathlib import Path
from PIL import Image,ImageDraw
import sys
OUT=Path(r'C:/dev/art-data/pipeline/codex-stream/luceras-surface/pass3');BLOB=Path(r'C:/dev/art-data/pipeline/blobs')
refs={'side':'8a78d9128f7aebb5c291f60cb70e0cfbec928fa357d1a91dff1eba27746286f9','front':'c96afd98e282fa5abaee6f1aed3245e0892be71998e1ade914c7c3af4f108178','three_quarter':'ee0d82e980b576199a8d8bdd66463ff92c5175771c6ea12a013afba580f89de4','head':'dd345a46081ff9cfe97e3f4db380ae45a249a55322e0b15ea54b28846af6c4a9'}
refs.update(hind_leg=refs['side'],tail_plume=refs['side'],sprite=refs['side'],phone=refs['side'])
crops={'hind_leg':(.36,.36,.67,.94),'tail_plume':(.78,.07,.995,.61)}
for it in map(int,sys.argv[1:]):
 for view,sha in refs.items():
  src=OUT/('iter'+str(it)+'_runtime_'+view+'.png')
  if not src.exists():continue
  im=Image.open(src).convert('RGB');im.thumbnail((512,512));ref=Image.open(BLOB/sha[:2]/sha).convert('RGB')
  if view in crops:
   a,b,c,d=crops[view];w,h=ref.size;ref=ref.crop((int(a*w),int(b*h),int(c*w),int(d*h)))
  ref=ref.resize((round(ref.width*im.height/ref.height),im.height),Image.Resampling.LANCZOS)
  grid=Image.new('RGB',(im.width+ref.width,im.height+28),(34,35,37));grid.paste(im,(0,28));grid.paste(ref,(im.width,28));dr=ImageDraw.Draw(grid);dr.text((8,8),'B-8dst iteration '+str(it)+' / '+view+' / three.js',fill='white');dr.text((im.width+8,8),'Approved sheet',fill='white');grid.save(OUT/('iter'+str(it)+'_'+view+'_vs_sheet.png'))
