"""Saved-data equality plus independent selection and full-radius protection."""
import sys
import json
import runpy
import hashlib
from pathlib import Path
import bpy
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parent))
from refine_ear_root_12b2 import values
before,after=map(Path,sys.argv[sys.argv.index('--')+1:])
patch=np.load(after/'patch-evidence.npz');flags=np.load(before/'r/sweep-flags.npz')
assert np.array_equal(patch['tail_id']>0,flags['actualTail'])
assert np.all((patch['hip_blend']>0) <= (flags['region']==6))
assert np.array_equal(patch['changed'],(patch['tail_id']>0)|(patch['hip_blend']>0))
sys.argv=[__file__,'--',str(after),str(before)]
runpy.run_path(str(Path(__file__).with_name('verify_fur_12d.py')),run_name='__main__')
hashes=[]
for folder in [before,after]:
    bpy.ops.wm.open_mainfile(filepath=str(folder/'surface.blend'))
    cu=bpy.data.objects['Akinza fur'].data
    hashes.append(hashlib.sha256(values(cu,'radius').tobytes()).hexdigest())
assert hashes[0]==hashes[1],'A hair radius changed'
p=after/'saved-protection-check.json';result=json.loads(p.read_text())
result.update(allRadiiEqual=True,allRadiiSha256=hashes[0],selectionConstrained=True,
              tailCurves=int((patch['tail_id']>0).sum()),hipCurves=int((patch['hip_blend']>0).sum()))
p.write_text(json.dumps(result,indent=2))
print('12E_SCOPE_AND_RADIUS_PASS',flush=True)
