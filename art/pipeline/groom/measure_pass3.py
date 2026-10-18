"""Whole dark-coat sRGB luminance measurements using saved spatial masks."""
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np,json,argparse
O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass3')
ap=argparse.ArgumentParser();ap.add_argument('--iteration');args=ap.parse_args()
sha='8a78d9128f7aebb5c291f60cb70e0cfbec928fa357d1a91dff1eba27746286f9'
refs={'sheet':Path('C:/dev/art-data/pipeline/blobs')/sha[:2]/sha,'pass2':O.parent/'pass2/render_side.png','pass3':O/(('iter'+args.iteration+'_' if args.iteration else 'render_')+'side.png')}
spec=json.loads((O/'coat_mask_polygons.json').read_text());result={'build_id':'B-pq45','method':'Spatial manual masks in native images, no pixel intensity filtering. Luma Y prime = 0.2126 R + 0.7152 G + 0.0722 B on sRGB 0-255 pixels. These are sRGB levels, not linear photometric luminance. No image recoloring. Same render mask for pass2 and pass3; anatomy-specific sheet mask.','mask_definition':spec,'distributions':{}}
for name,path in refs.items():
 im=Image.open(path).convert('RGB');mask=Image.new('L',im.size);d=ImageDraw.Draw(mask);k=im.width/1000;key='sheet' if name=='sheet' else 'render'
 for poly in spec['polygons'][key]:d.polygon([(round(x*k),round(y*k)) for x,y in poly],fill=255)
 for x,y,rx,ry in spec['exclude_ellipses_cx_cy_rx_ry'][key]:d.ellipse(tuple(round(v*k) for v in (x-rx,y-ry,x+rx,y+ry)),fill=0)
 a=np.asarray(im);m=np.asarray(mask)>0;rgb=a[m];lum=rgb@np.array([.2126,.7152,.0722]);result['distributions'][name]={'image':str(path),'pixels':int(m.sum()),'mean':float(lum.mean()),'p25':float(np.percentile(lum,25)),'p50':float(np.percentile(lum,50)),'p75':float(np.percentile(lum,75)),'iqr':float(np.percentile(lum,75)-np.percentile(lum,25)),'std':float(lum.std()),'mean_rgb':rgb.mean(0).tolist()}
 prefix=('iter'+args.iteration+'_' if args.iteration else '');mask.save(O/(prefix+'coat_mask_'+name+'.png'));v=a.copy();v[m]=(a[m]*.60+np.array([0,255,90])*.40).astype('uint8');Image.fromarray(v).save(O/(prefix+'coat_mask_overlay_'+name+'.png'))
d=result['distributions'];delta={key:d['pass3'][key]-d['sheet'][key] for key in ('mean','p25','p50','p75')};result['errors_srgb_levels']=delta;result['quartiles_and_mean_within_4_levels']=all(abs(x)<=4 for x in delta.values());result['spread_errors_srgb_levels']={k:d['pass3'][k]-d['sheet'][k] for k in ('iqr','std')};result['all_within_4_levels']=result['quartiles_and_mean_within_4_levels'] and all(abs(x)<=4 for x in result['spread_errors_srgb_levels'].values());name='color_measurements_iter'+args.iteration if args.iteration else 'color_measurements';(O/(name+'.json')).write_text(json.dumps(result,indent=2));print(json.dumps({'distributions':d,'errors':delta,'pass':result['all_within_4_levels']},indent=2))
