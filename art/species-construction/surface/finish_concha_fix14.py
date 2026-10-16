"""Unchanged artifact gate, before/after native sheets, exact current copies."""
import sys,json,hashlib,shutil
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
from analyze_sweep_12d import analyze
from rogue_hairs_13 import analyze as rogue
from concha_fix14_paths import baseline
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
WORK=ROOT/'untracked/species-construction/akinza/surface/fur-steps'
after=WORK/sys.argv[1];before=baseline(WORK)
if '--pairs-only' not in sys.argv:
 analyze(after/'r');rogue(after/'r')
 f=np.load(before/'r/sweep-flags.npz');g=np.load(after/'r/sweep-flags.npz')
 names=list(json.loads((before/'r/sweep-metrics.json').read_text())['regions'])
 oldgate=json.loads((before/'artifact-gate.json').read_text());metrics={};new=np.zeros(len(g['region']),bool)
 for key in ('collision','neighborLength','regionalLength','partTransfer','lift','rogue'):
  bf=f[key] if key!='rogue' else np.load(before/'r/rogue-flags.npz')['rogue']
  af=g[key] if key!='rogue' else np.load(after/'r/rogue-flags.npz')['rogue']
  assert len(af)>=len(bf)
  bf=np.r_[bf,np.zeros(len(af)-len(bf),bool)]
  mask=af&~bf;new|=mask
  failed=[i for i in oldgate[key]['newIds'] if af[i]]
  metrics[key]=dict(newFlags=int(mask.sum()),newIds=np.where(mask)[0].tolist(),addedCurves=len(af)-len(f['region']),addedCurveFlags=int(af[len(f['region']):].sum()),recordedFlagsStillPresent=failed,
   regions={name:dict(before=int((bf[:len(f['region'])]&(f['region']==i)).sum()),after=int((af&(g['region']==i)).sum())) for i,name in enumerate(names)})
 (after/'artifact-gate.json').write_text(json.dumps(metrics,indent=2)+'\n')
 np.savez_compressed(after/'new-flags.npz',new=new)
 if '--gate-only' in sys.argv:
  assert all(v['newFlags']==0 and not v['recordedFlagsStillPresent'] and all(r['after']<=r['before'] for r in v['regions'].values()) for v in metrics.values()),'Fix artifact gate failed'
  print('FIX_ARTIFACT_GATE_PASS');raise SystemExit(0)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',24)
def pair(a,b,name):
 a=Image.open(a).convert('RGB');b=Image.open(b).convert('RGB');assert a.size==b.size
 w,h=a.size;im=Image.new('RGB',(w*2,h+38),'#f0f0f0');draw=ImageDraw.Draw(im)
 draw.text((12,5),'Before: step 14',font=font,fill='#172532');draw.text((w+12,5),'Now: step 14 fix',font=font,fill='#172532')
 im.paste(a,(0,38));im.paste(b,(w,38));im.save(WORK/name)
 assert np.array_equal(np.asarray(im)[38:,:w],np.asarray(a)) and np.array_equal(np.asarray(im)[38:,w:],np.asarray(b))
for view in ('ears-front','ear-root-close'):
 pair(before/'after'/f'{view}.png',after/'after'/f'{view}.png',f'14-fix-{view}.png')
# Geometry equality permits reuse of the same shaved anatomy image.
held=json.loads((after/'r/held-data.json').read_text());assert held['allGeometryAndTopologyExact']
clay=WORK/'s14a/after/ear-base-clay.png';pair(clay,clay,'14-fix-ear-base-clay.png')
for view in ('ears-front','head-side','head-backq','body-backq','body-front','tails-side'):
 src=after/'after'/f'{view}.png';dst=WORK/f'current-{view}.png';shutil.copyfile(src,dst)
 assert np.array_equal(np.asarray(Image.open(src)),np.asarray(Image.open(dst)))
(after/'pair-check.json').write_text(json.dumps(dict(nativePixels=True,beforeLeft=True,beforeSurfaceSha256=hashlib.sha256((before/'surface.blend').read_bytes()).hexdigest(),currentViews=6,currentPixelsExact=True,clayReusedBecauseAllGeometryExact=True),indent=2)+'\n')
print('FIX_PAIRS_PASS')
