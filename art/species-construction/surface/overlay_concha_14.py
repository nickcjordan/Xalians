"""Amber paths and blue roots for new flags, projected on the native front view."""
import json
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont

work=Path(__file__).resolve().parents[3]/'untracked/species-construction/akinza/surface/fur-steps'
after=work/('s12-14' if (work/'s12-14').is_dir() else 's14b');d=np.load(after/'r/evidence.npz');flag=np.load(after/'new-flags.npz')['new']
im=Image.open(after/'after/ears-front.png').convert('RGB');w,h=im.size
el=np.deg2rad(3);up=np.array([0,np.sin(el),np.cos(el)]);target=np.array([0,-.02,.74])
def project(p):
    q=p-target
    return np.c_[w/2+q[:,0]*w/1.35,h/2-(q@up)*w/1.35]
layer=Image.new('RGBA',im.size);draw=ImageDraw.Draw(layer)
points=d['points'];starts=d['starts'];counts=np.diff(np.r_[starts,len(points)])
for i in np.where(flag)[0]:
    q=project(points[starts[i]:starts[i]+counts[i]])
    draw.line([tuple(v) for v in q],fill=(219,155,36,180),width=2)
    x,y=q[0];draw.ellipse((x-2,y-2,x+2,y+2),fill=(51,141,204,220))
im=Image.alpha_composite(im.convert('RGBA'),layer).convert('RGB')
sheet=Image.new('RGB',(w,h+38),'#f0f0f0');sheet.paste(im,(0,38))
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)
ImageDraw.Draw(sheet).text((9,9),f'{int(flag.sum())} new flagged curves: amber paths, blue roots. Projection includes occluded paths.',fill='#172532',font=font)
sheet.save(work/'14-artifact-overlay.png')
(after/'overlay-proof.json').write_text(json.dumps(dict(source='after/ears-front.png',newFlaggedCurves=int(flag.sum()),colors=['amber','blue'],occlusion='Projected evidence paths, no depth test; use raw saved sweep for classification.'),indent=2)+'\n')
