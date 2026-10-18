from pathlib import Path
import json,argparse,numpy as np
from PIL import Image,ImageDraw
O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass4');T=Path('C:/dev/src/xalians-creature-pipeline/art/pipeline/groom');B=Path('C:/dev/art-data/pipeline/blobs');sha='8a78d9128f7aebb5c291f60cb70e0cfbec928fa357d1a91dff1eba27746286f9'
ap=argparse.ArgumentParser();ap.add_argument('--iteration');a=ap.parse_args();prefix='iter'+a.iteration+'_' if a.iteration else 'render_';spec=json.loads((T/'coat_mask_polygons.json').read_text());(O/'coat_mask_polygons.json').write_text(json.dumps(spec,indent=2))
paths={'sheet':B/sha[:2]/sha,'pass3':O.parent/'pass3/render_side.png','pass4':O/(prefix+'side.png')};result={'method':'Exact inherited spatial side-coat polygons. No luminance filtering. Additional head and body bounds intersect that same coat mask, consistently across iterations. sRGB luma 0.2126R+0.7152G+0.0722B.','regions':{}}
for label,path in paths.items():
 im=Image.open(path).convert('RGB');w,h=im.size;k=w/1000;mask=Image.new('L',im.size);draw=ImageDraw.Draw(mask);key='sheet' if label=='sheet' else 'render'
 for poly in spec['polygons'][key]:draw.polygon([(round(x*k),round(y*k)) for x,y in poly],fill=255)
 for x,y,rx,ry in spec['exclude_ellipses_cx_cy_rx_ry'][key]:draw.ellipse(tuple(round(v*k) for v in (x-rx,y-ry,x+rx,y+ry)),fill=0)
 m=np.asarray(mask)>0;rgb=np.asarray(im);yy,xx=np.mgrid[:h,:w];head=m&(xx<(196 if key=='sheet' else 180)*k)&(yy<315*k);body=m&(xx>300*k)&(xx<560*k)&(yy>320*k)&(yy<425*k)
 for region,sel in [('whole_coat',m),('face',head),('body',body)]:
  vals=rgb[sel];lum=vals@np.array([.2126,.7152,.0722]);result['regions'].setdefault(region,{})[label]={'pixels':int(sel.sum()),'mean_rgb':vals.mean(0).tolist(),'mean':float(lum.mean()),'p25':float(np.percentile(lum,25)),'p50':float(np.percentile(lum,50)),'p75':float(np.percentile(lum,75)),'std':float(lum.std())}
  overlay=rgb.copy();overlay[sel]=(rgb[sel]*.6+np.array([0,255,90])*.4).astype('uint8');Image.fromarray(overlay).save(O/(prefix+'mask_'+region+'_'+label+'.png'))
(O/(prefix+'color_measurements.json')).write_text(json.dumps(result,indent=2));print(json.dumps(result['regions'],indent=2))
