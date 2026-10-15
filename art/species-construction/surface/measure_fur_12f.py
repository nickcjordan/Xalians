"""Compare unchanged full-sweep flags and assemble the requested review set."""
import sys,json
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parents[3]
work=root/'untracked/species-construction/akinza/surface/fur-steps'
before,after=map(Path,sys.argv[1:3])
result={'imagesOnly':True}
if '--images-only' not in sys.argv:
    f=np.load(before/'r/sweep-flags.npz');g=np.load(after/'r/sweep-flags.npz')
    names=list(json.loads((before/'r/sweep-metrics.json').read_text())['regions'])
    metrics={}
    for k in ['collision','neighborLength','regionalLength','partTransfer','lift']:
        metrics[k]=dict(newFlags=int((g[k]&~f[k]).sum()),regions={name:dict(before=int((f[k]&(f['region']==i)).sum()),after=int((g[k]&(g['region']==i)).sum())) for i,name in enumerate(names)})
    assert all(v['newFlags']==0 and all(r['after']<=r['before'] for r in v['regions'].values()) for v in metrics.values()),'New artifact flags or regional increase'
    result=dict(artifactGate=metrics,changedCurves=int(np.load(after/'patch-evidence.npz')['changed'].sum()),heldData=json.loads((after/'saved-protection-check.json').read_text())['equal'])
    (after/'metrics.json').write_text(json.dumps(result,indent=2))
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',24)
for view in ['ears-front','ear-root-close']:
    ims=[Image.open(work/'12f-before'/f'{view}.png').convert('RGB'),Image.open(after/'r'/f'{view}.png').convert('RGB')]
    assert ims[0].size==ims[1].size
    w,h=ims[0].size;pair=Image.new('RGB',(2*w,h+36),'#f0f0f0');d=ImageDraw.Draw(pair)
    for j,im in enumerate(ims):pair.paste(im,(j*w,36));d.text((j*w+12,4),['Before: 12e fix','Now: 12f'][j],font=font,fill='black')
    pair.save(work/f'12f-{view}.png')
for view in ['ears-front','head-side','head-backq','body-backq','body-front','tails-side']:
    im=Image.open(after/'r'/f'{view}.png');im.save(work/f'current-{view}.png')
print(json.dumps(result,indent=2))
