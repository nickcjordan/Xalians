"""Create equal-height sheet comparisons without changing the proof renders."""
from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json,sys
OUT=Path(r'C:/dev/art-data/pipeline/codex-stream/luceras-surface/pass3')
BLOB=Path(r'C:/dev/art-data/pipeline/blobs')
refs={'side':'8a78d9128f7aebb5c291f60cb70e0cfbec928fa357d1a91dff1eba27746286f9','front':'c96afd98e282fa5abaee6f1aed3245e0892be71998e1ade914c7c3af4f108178','three_quarter':'ee0d82e980b576199a8d8bdd66463ff92c5175771c6ea12a013afba580f89de4','head':'dd345a46081ff9cfe97e3f4db380ae45a249a55322e0b15ea54b28846af6c4a9'}
refs.update(hind_leg=refs['side'],tail_plume=refs['side'],sprite=refs['side'])
crops={'hind_leg':(.36,.36,.67,.94),'tail_plume':(.78,.07,.995,.61)}
try:font=ImageFont.truetype('arial.ttf',22)
except OSError:font=ImageFont.load_default()
preview='--preview' in sys.argv
for view,h in refs.items():
 render=OUT/((f'iter{sys.argv[-1]}_' if preview else 'lookdev_')+view+'.png')
 if not render.exists():continue
 sheet=Image.open(BLOB/h[:2]/h).convert('RGB');im=Image.open(render).convert('RGB')
 if view in crops:
  a,b,c,d=crops[view];w,hh=sheet.size;sheet=sheet.crop((int(a*w),int(b*hh),int(c*w),int(d*hh)))
 height=im.height
 if height<=192:
  try:font=ImageFont.truetype('arial.ttf',10)
  except OSError:font=ImageFont.load_default()
 sheet=sheet.resize((round(sheet.width*height/sheet.height),height),Image.Resampling.LANCZOS)
 grid=Image.new('RGB',(im.width+sheet.width,height+42),(34,35,37));grid.paste(im,(0,42));grid.paste(sheet,(im.width,42));draw=ImageDraw.Draw(grid);draw.text((12,9),'B-8dst / '+view+' / Cycles',font=font,fill='white');draw.text((im.width+12,9),'Approved sheet',font=font,fill='white')
 grid.save(OUT/((f'iter{sys.argv[-1]}_' if preview else 'composite_')+view+'_vs_sheet.png'))
 runtime=OUT/('runtime_'+view+'.png')
 if runtime.exists() and not preview:
  ri=Image.open(runtime).convert('RGB');g=Image.new('RGB',(ri.width+sheet.width,height+42),(34,35,37));g.paste(ri,(0,42));g.paste(sheet,(ri.width,42));d=ImageDraw.Draw(g);d.text((12,9),'B-8dst / '+view+' / three.js r160',font=font,fill='white');d.text((ri.width+12,9),'Approved sheet',font=font,fill='white');g.save(OUT/('composite_runtime_'+view+'_vs_sheet.png'))
(OUT/'reference_provenance.json').write_text(json.dumps({'hashes':refs,'detail_crop_fractions':crops,'comparison':'Sheet view rescaled to exactly the render height. Detail views use the documented sheet crop. Original proof files remain untouched.'},indent=2))
