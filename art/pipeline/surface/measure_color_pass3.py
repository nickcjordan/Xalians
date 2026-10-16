from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np,json,sys
OUT=Path(r'C:/dev/art-data/pipeline/codex-stream/luceras-surface/pass3')
iteration=int(sys.argv[1]);runtime=Image.open(OUT/'runtime_side.png').convert('RGB')
ref=Image.open(Path(r'C:/dev/art-data/pipeline/blobs/8a/8a78d9128f7aebb5c291f60cb70e0cfbec928fa357d1a91dff1eba27746286f9')).convert('RGB')
rois={'back':[432,375,472,395],'flank':[350,455,410,495],'white':[210,462,235,510]}
refrois={'back':[550,440,610,475],'flank':[455,520,535,575],'white':[195,550,245,600]}
target={'back':[80,77,75],'flank':[99,94,92],'white':[192,191,192]}
result={'iteration':iteration,'method':'Arithmetic mean and median of raw 8-bit sRGB pixels in fixed anatomical ROI boxes, no image grading. Targets transcribed from Pass 3 brief. Independent sheet samples show local strand variation and are not silently substituted for the brief targets.','targets_from_brief':target,'runtime':{},'independent_sheet_samples':{}}
for key,im,boxes in [('runtime',runtime,rois),('independent_sheet_samples',ref,refrois)]:
 arr=np.array(im);draw=ImageDraw.Draw(im)
 for n,(a,b,c,d) in boxes.items():
  values=arr[b:d,a:c];mean=values.mean((0,1));result[key][n]={'box':[a,b,c,d],'mean':mean.round(2).tolist(),'median':np.median(values,axis=(0,1)).tolist(),'std':values.std((0,1)).round(2).tolist()}
  if key=='runtime':result[key][n]['delta_from_brief']=(mean-target[n]).round(2).tolist()
  draw.rectangle([a,b,c,d],outline=(255,90,20),width=2);draw.text((a,b-13),n,fill=(255,150,40))
 im.save(OUT/('iter'+str(iteration)+'_color_rois_'+key+'.png'))
(OUT/('color_measurements_iter'+str(iteration)+'.json')).write_text(json.dumps(result,indent=2))
print(json.dumps(result['runtime'],indent=2))
