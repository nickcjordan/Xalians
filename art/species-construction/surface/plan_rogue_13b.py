"""Converge a sparse cull against both unchanged artifacts and the new rogue test."""
import sys,json
from pathlib import Path
import numpy as np
from analyze_sweep_12d import analyze
from rogue_hairs_13 import analyze as rogue
before,out=map(Path,sys.argv[1:3]);out.mkdir(parents=True,exist_ok=True)
base=before/'r';pre=out/'pre-save';pre.mkdir(exist_ok=True)
old=np.load(base/'sweep-flags.npz');selected=np.load(base/'rogue-flags.npz')['rogue'].copy()
# The paths remain exactly equal, so baseline geometric measurements remain valid.
for filename in ('evidence.npz','obstacle-evidence.npz'):
    import shutil
    shutil.copy2(base/filename,pre/filename)
col=dict(np.load(base/'collision-evidence.npz'));history=[]
for iteration in range(20):
    col['active'][selected]=False;np.savez_compressed(pre/'collision-evidence.npz',**col)
    analyze(pre);newrogue=rogue(pre);now=np.load(pre/'sweep-flags.npz')
    new=np.zeros(len(selected),bool)
    for key in ('collision','neighborLength','regionalLength','partTransfer','lift'):new|=now[key]&~old[key]
    additional=(new|newrogue)&~selected;history.append(dict(iteration=iteration,culled=int(selected.sum()),newLegacy=int(new.sum()),remainingRogue=int(newrogue.sum())))
    if not additional.any():break
    selected|=additional
else:raise AssertionError('Sparse cull failed to converge')
np.savez_compressed(out/'cull-selection.npz',changed=selected)
(out/'cull-history.json').write_text(json.dumps(history,indent=2))
assert selected.sum()<.003*len(selected),'Unexpectedly broad cull'
print('CULL_PLAN',int(selected.sum()))
