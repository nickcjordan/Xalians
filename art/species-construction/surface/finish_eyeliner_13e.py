"""Analyze fresh 13e sweeps and assemble the two required matched pairs."""
import json,sys,hashlib
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
from analyze_sweep_12d import analyze
from rogue_hairs_13 import analyze as rogue
ROOT=Path(__file__).resolve().parents[3]
WORK=ROOT/'untracked/species-construction/akinza/surface/fur-steps'
before=Path(sys.argv[1]) if len(sys.argv)>1 else WORK/'s12-13c-fix3'
after=WORK/'s12-13e'
assert (after/'r/obstacle-evidence.npz').exists(),'Fresh separate-object sweep missing'
index=json.loads((after/'after/index.json').read_text())
assert index['eyeliner']=='G1-outer'
assert index['eyelinerSourceSha256']==hashlib.sha256((Path(__file__).parent/'eyeliner_styles.py').read_bytes()).hexdigest()
assert json.loads((Path(__file__).parent/'akinza-surface.json').read_text())['eyeliner']['style']=='G1-outer'
assert json.loads((after/'before/index.json').read_text())['eyeliner']=='mix-g1'
analyze(after/'r');rogue(after/'r')
f=np.load(before/'r/sweep-flags.npz');g=np.load(after/'r/sweep-flags.npz')
names=list(json.loads((before/'r/sweep-metrics.json').read_text())['regions'])
metrics={}
for key in ('collision','neighborLength','regionalLength','partTransfer','lift','rogue'):
    bf=f[key] if key!='rogue' else np.load(before/'r/rogue-flags.npz')['rogue']
    af=g[key] if key!='rogue' else np.load(after/'r/rogue-flags.npz')['rogue']
    metrics[key]={'newFlags':int((af&~bf).sum()),'regions':{name:{'before':int((bf&(f['region']==i)).sum()),'after':int((af&(g['region']==i)).sum())} for i,name in enumerate(names)}}
assert all(v['newFlags']==0 and all(r['after']<=r['before'] for r in v['regions'].values()) for v in metrics.values())
(after/'artifact-gate.json').write_text(json.dumps(metrics,indent=2))
assert json.loads((after/'held-data.json').read_text())['unchanged']
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',26)
for view,name in [('eye-close','13e-eyeliner-close.png'),('head-front','13e-eyeliner-face.png')]:
    a=Image.open(after/'before'/f'{view}.png').convert('RGB');b=Image.open(after/'after'/f'{view}.png').convert('RGB');assert a.size==b.size
    w,h=a.size;sheet=Image.new('RGB',(w*2,h+44),'#f0f0f0');draw=ImageDraw.Draw(sheet)
    draw.text((14,8),'Before: G1',font=font,fill='#172532');draw.text((w+14,8),'Now: G1-outer',font=font,fill='#172532')
    sheet.paste(a,(0,44));sheet.paste(b,(w,44));sheet.save(WORK/name)
    pixels=np.array(sheet);assert np.array_equal(pixels[44:,:w],np.array(a));assert np.array_equal(pixels[44:,w:],np.array(b))
print('13E_FULL_ARTIFACT_GATE_AND_MATCHED_PAIRS_PASS')
