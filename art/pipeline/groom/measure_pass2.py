"""Measure unmodified rendered sRGB patches in the fixed side camera."""
import json,argparse
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np
O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass2')
p=argparse.ArgumentParser();p.add_argument('--iteration');a=p.parse_args()
name=('iter'+a.iteration+'_' if a.iteration else 'render_')+'side.png';im=Image.open(O/name).convert('RGB');pixels=np.array(im)
boxes={'back':(510,290,560,320),'flank':(450,350,500,380),'bib':(150,457,180,499)};targets={'back':[80,77,75],'flank':[99,94,92],'bib':[192,191,192]}
result={'build_id':'B-vmt3','image':name,'method':'Median and 10th/90th percentile sRGB pixels in fixed rectangular lit surface patches. Boxes scale with render width from the 1080x900 preview camera. No recoloring or exposure correction of images.','lighting':'Same neutral studio key/fill/rim and exposure for all regions. Disk light shapes differ from pass1 square lights; compare pass1 samples as baseline, not identical illumination.','patches':{}}
marked=im.copy();draw=ImageDraw.Draw(marked)
for n,b in boxes.items():
 box=[round(v*im.width/1080) for v in b];x,y,r,bottom=box;v=pixels[y:bottom,x:r,:3];median=np.median(v,axis=(0,1));result['patches'][n]={'box':box,'median_srgb':median.tolist(),'target_srgb':targets[n],'error_srgb':(median-np.array(targets[n])).tolist(),'p10_srgb':np.percentile(v,10,axis=(0,1)).tolist(),'p90_srgb':np.percentile(v,90,axis=(0,1)).tolist(),'no_violet_cast_R_ge_B':bool(median[0]>=median[2])};draw.rectangle(box,outline='red',width=2);draw.text((x,y-14),n,fill='red')
result['pass1_baseline']=json.loads((O.parent/'pass1/color_measurements.json').read_text())['final_patches']
dest=('color_measurements_iter'+a.iteration+'.json') if a.iteration else 'color_measurements.json';(O/dest).write_text(json.dumps(result,indent=2));marked.save(O/(dest.replace('.json','_patches.png')));print(json.dumps(result['patches'],indent=2))
