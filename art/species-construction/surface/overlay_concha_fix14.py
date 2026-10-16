"""Native front diagnostic of the recorded step 14 defects and repaired paths."""
import sys,json
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
from concha_fix14_paths import baseline
work=Path(__file__).resolve().parents[3]/'untracked/species-construction/akinza/surface/fur-steps'
before=baseline(work);after=work/sys.argv[1]
gate=json.loads((before/'artifact-gate.json').read_text())
ids=sorted(set(i for key in ('collision','neighborLength','rogue') for i in gate[key]['newIds']))
panels=[]
for folder,rgba in ((before,(219,155,36,185)),(after,(51,141,204,195))):
 d=np.load(folder/'r/evidence.npz');c=np.load(folder/'r/collision-evidence.npz');im=Image.open(folder/'after/ears-front.png').convert('RGBA');w,h=im.size
 up=np.array([0,np.sin(np.deg2rad(3)),np.cos(np.deg2rad(3))]);target=np.array([0,-.02,.74])
 layer=Image.new('RGBA',im.size);draw=ImageDraw.Draw(layer);s=d['starts'];p=d['points'];counts=np.diff(np.r_[s,len(p)])
 for i in ids:
  if not c['active'][i]:continue
  q=p[s[i]:s[i]+counts[i]]-target;xy=np.c_[w/2+q[:,0]*w/1.35,h/2-(q@up)*w/1.35]
  draw.line([tuple(v) for v in xy],fill=rgba,width=2)
 panels.append(Image.alpha_composite(im,layer).convert('RGB'))
sheet=Image.new('RGB',(w*2,h+38),'#f0f0f0');draw=ImageDraw.Draw(sheet);font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)
draw.text((9,9),f'{len(ids)} recorded defect paths: amber before. Projection includes occluded paths.',font=font,fill='#172532')
draw.text((w+9,9),'Blue: corresponding active repaired paths. Classifications use full saved tests.',font=font,fill='#172532')
for j,im in enumerate(panels):sheet.paste(im,(w*j,38))
sheet.save(work/'14-fix-artifact-overlay.png')
(after/'overlay-proof.json').write_text(json.dumps(dict(recordedCurveIds=ids,colors=['amber','blue'],depthTest=False,source='native ears-front images and full saved evidence',caveat='Projected paths can be occluded; artifact classification comes from complete saved sweeps.'),indent=2)+'\n')
