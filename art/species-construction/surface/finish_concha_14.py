"""Native comparison sheets, exact current copies and unchanged all-body gate."""
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
from analyze_sweep_12d import analyze
from rogue_hairs_13 import analyze as rogue
from concha_14_paths import baseline
ROOT=Path(__file__).resolve().parents[3]
WORK=ROOT/'untracked/species-construction/akinza/surface/fur-steps'
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',24)

def pair(a,b,name):
    a=Image.open(a).convert('RGB');b=Image.open(b).convert('RGB');assert a.size==b.size
    w,h=a.size;sheet=Image.new('RGB',(w*2,h+38),'#f0f0f0');d=ImageDraw.Draw(sheet)
    d.text((12,5),'Before: 13i / assembled-3300',font=font,fill='#172532')
    d.text((w+12,5),'Now: step 14',font=font,fill='#172532')
    sheet.paste(a,(0,38));sheet.paste(b,(w,38));sheet.save(WORK/name)
    assert np.array_equal(np.array(sheet)[38:,:w],np.array(a)) and np.array_equal(np.array(sheet)[38:,w:],np.array(b))

if '--gate-only' not in sys.argv:
    pair(WORK/'s14a/before/ear-base-clay.png',WORK/'s14a/after/ear-base-clay.png','14-ear-base-clay.png')
if '--clay-only' in sys.argv:raise SystemExit(0)
after=WORK/('s12-14' if (WORK/'s12-14').is_dir() else 's14b');before=baseline(WORK)
if '--gate-only' not in sys.argv:
    for view in ('ears-front','ear-root-close'):pair(after/'before'/f'{view}.png',after/'after'/f'{view}.png',f'14-{view}.png')
    for view in ('ears-front','head-side','head-backq','body-backq','body-front','tails-side'):
        source=Image.open(after/'after'/f'{view}.png');target=WORK/f'current-{view}.png';source.save(target)
        assert np.array_equal(np.array(source),np.array(Image.open(target)))
    (after/'pair-check.json').write_text(json.dumps(dict(nativePixels=True,beforeLeft=True,currentViews=6,currentPixelsExact=True),indent=2)+'\n')
    if '--pairs-only' in sys.argv:
        import hashlib
        assert hashlib.sha256((after/'surface.blend').read_bytes()).hexdigest()==json.loads((after/'held-data.json').read_text())['surfaceSha256']
        raise SystemExit(0)
analyze(after/'r');rogue(after/'r')
f=np.load(before/'r/sweep-flags.npz');g=np.load(after/'r/sweep-flags.npz')
assert len(f['region'])==len(g['region'])
names=list(json.loads((before/'r/sweep-metrics.json').read_text())['regions'])
metrics={};new=np.zeros(len(g['region']),bool)
for key in ('collision','neighborLength','regionalLength','partTransfer','lift','rogue'):
    bf=f[key] if key!='rogue' else np.load(before/'r/rogue-flags.npz')['rogue']
    af=g[key] if key!='rogue' else np.load(after/'r/rogue-flags.npz')['rogue']
    new|=af&~bf
    metrics[key]=dict(newFlags=int((af&~bf).sum()),newIds=np.where(af&~bf)[0].tolist(),
        regions={name:dict(before=int((bf&(f['region']==i)).sum()),after=int((af&(g['region']==i)).sum())) for i,name in enumerate(names)})
(after/'artifact-gate.json').write_text(json.dumps(metrics,indent=2)+'\n')
np.savez_compressed(after/'new-flags.npz',new=new)
assert all(v['newFlags']==0 and all(r['after']<=r['before'] for r in v['regions'].values()) for v in metrics.values()),'New artifact flags; continue repairs within build cap'
print('14_BODY_WIDE_GATE_AND_PAIRS_PASS')
