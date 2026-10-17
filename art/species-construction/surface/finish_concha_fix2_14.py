"""Compare unchanged tests by retained native identity and whole-region counts."""
import sys,json,hashlib,shutil
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
from analyze_sweep_12d import analyze
from rogue_hairs_13 import analyze as rogue
from concha_fix2_14_paths import baseline
work=Path(__file__).resolve().parents[3]/'untracked/species-construction/akinza/surface/fur-steps'
after=work/sys.argv[1];before=baseline(work);native=420420
if '--pairs-only' not in sys.argv:
 analyze(after/'r');rogue(after/'r')
 f=np.load(before/'r/sweep-flags.npz');g=np.load(after/'r/sweep-flags.npz')
 names=list(json.loads((before/'r/sweep-metrics.json').read_text())['regions']);metrics={}
 for key in ('collision','neighborLength','regionalLength','partTransfer','lift','rogue'):
  old=f[key] if key!='rogue' else np.load(before/'r/rogue-flags.npz')['rogue']
  new=g[key] if key!='rogue' else np.load(after/'r/rogue-flags.npz')['rogue']
  assert not old[native:].any(),'Retired dedicated systems had unresolved flags'
  reference=np.r_[old[:native],np.zeros(len(new)-native,bool)]
  added=new&~reference
  metrics[key]=dict(newFlags=int(added.sum()),newIds=np.where(added)[0].tolist(),replacementSystemFlags=int(new[native:].sum()),regions={name:dict(before=int((old&(f['region']==i)).sum()),after=int((new&(g['region']==i)).sum())) for i,name in enumerate(names)})
 report=dict(nativeIdsStable=native,replacedDedicatedSystems=True,oldDedicatedFlags=0,sourceSha256=hashlib.sha256((before/'surface.blend').read_bytes()).hexdigest(),surfaceSha256=hashlib.sha256((after/'surface.blend').read_bytes()).hexdigest(),categories=metrics)
 (after/'artifact-gate.json').write_text(json.dumps(report,indent=2)+'\n')
 assert all(v['newFlags']==0 and v['replacementSystemFlags']==0 and all(r['after']<=r['before'] for r in v['regions'].values()) for v in metrics.values()),'Second fix artifact gate failed'
 if '--gate-only' in sys.argv:print('FIX2_ARTIFACT_GATE_PASS');raise SystemExit(0)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',24)
def pair(a,b,name):
 a=Image.open(a).convert('RGB');b=Image.open(b).convert('RGB');assert a.size==b.size
 w,h=a.size;out=Image.new('RGB',(2*w,h+38),'#f0f0f0');draw=ImageDraw.Draw(out)
 draw.text((12,5),'Before: step 14 fix',font=font,fill='#172532');draw.text((w+12,5),'Now: step 14 fix 2',font=font,fill='#172532')
 out.paste(a,(0,38));out.paste(b,(w,38));out.save(work/name)
 assert np.array_equal(np.asarray(out)[38:,:w],np.asarray(a)) and np.array_equal(np.asarray(out)[38:,w:],np.asarray(b))
for view in ('ears-front','ear-root-close'):pair(before/'after'/f'{view}.png',after/'after'/f'{view}.png',f'14-fix2-{view}.png')
assert json.loads((after/'r/held-data.json').read_text())['allGeometryAndTopologyExact']
clay=work/'s14a/after/ear-base-clay.png';pair(clay,clay,'14-fix2-ear-base-clay.png')
for view in ('ears-front','head-side','head-backq','body-backq','body-front','tails-side'):
 src=after/'after'/f'{view}.png';dst=work/f'current-{view}.png';shutil.copyfile(src,dst)
 assert src.read_bytes()==dst.read_bytes()
(after/'pair-check.json').write_text(json.dumps(dict(nativePixels=True,beforeLeft=True,beforeSurfaceSha256=hashlib.sha256((before/'surface.blend').read_bytes()).hexdigest(),currentViews=6,currentBytesExact=True,clayReusedBecauseAllGeometryExact=True),indent=2)+'\n')
print('FIX2_PAIRS_PASS')
