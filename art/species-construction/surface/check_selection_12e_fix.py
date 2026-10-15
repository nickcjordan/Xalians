"""Recompute the bounded connector selection from immutable baseline geometry."""
import sys,json
from pathlib import Path
import numpy as np
from tail_roots_12e_fix import root_axes,connector_selection,assign,LEGACY_CONNECTOR
before,after,parent=map(Path,sys.argv[1:])
d=np.load(before/'r/evidence.npz');f=np.load(before/'r/sweep-flags.npz');n=np.load(before/'r/collision-evidence.npz')['nearest']
config=json.loads((after/'plan-info.json').read_text()).get('connectorSelection',LEGACY_CONNECTOR)
t=root_axes(d,f,n);c=connector_selection(d,f,n,t,config);prior=np.load(parent/'patch-evidence.npz');p=np.load(after/'patch-evidence.npz')
w=np.maximum(c['weight'],prior['hip_blend'])
assert np.array_equal(w,p['hip_blend'])
assert np.array_equal(p['changed'],f['actualTail']|(w>0))
if (after/'measurement-core.npy').exists():
    core=connector_selection(d,f,n,t,LEGACY_CONNECTOR)
    assert np.array_equal(np.load(after/'measurement-core.npy'),(core['weight']>0)|(prior['hip_blend']>0))
local=(w>0)&~f['actualTail'];roots=d['roots'][local];_,dist,_=assign(roots,t)
assert np.all((roots[:,1]>.044)&(roots[:,2]<.121)&(roots[:,2]>-.361)&(abs(roots[:,0])<.291))
assert dist.max()<.092, 'Rump blend exceeds bounded anatomical tube'
(after/'selection-check.json').write_text(json.dumps(dict(equal=True,connectorCurves=int((w>0).sum()),rootBounds=[roots.min(0).tolist(),roots.max(0).tolist()],maximumRootAxisDistance=float(dist.max()),method='recomputation from baseline skin and immutable anatomy, plus separate root-space bounds and prior authorized root blend'),indent=2))
