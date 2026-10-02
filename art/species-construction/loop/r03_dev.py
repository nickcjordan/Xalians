"""Scratch driver for the R03 clump volume without Blender: run build_wing on a dumped crop and write views.

python art/species-construction/loop/r03_dev.py <dump-dir> <out-dir> [--side L] [key=value ...]   (values JSON)
"""
import ast
import json
import sys
import time
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent))
import fan_clumps_front as fc  # noqa: E402
from r03_fieldview import load, front_image, S, CX, Z0, DF0  # noqa: E402

dump, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
side = 'L'
params = {}
for a in sys.argv[3:]:
    if a.startswith('--side='):
        side = a.split('=', 1)[1]
    else:
        k, v = a.split('=', 1)
        params[k] = ast.literal_eval(v)
clumps = json.loads((HERE.parent/'specs/r03_clumps.json').read_text())['clumps']
env = dict(np.load(HERE.parent/'specs/r03_envelope.npz'))
F, lo, vs = load(dump, side)
t0 = time.time()
Fn, tuft, info = fc.build_wing(F, lo, vs, side, clumps, env, params)
print('built', side, round(time.time()-t0, 1), 's', {k: v for k, v in info.items() if k not in ('coat',)})
np.save(out/f'F{side}.npy', Fn)
if tuft is not None:
    np.save(out/f'T{side}.npy', tuft)
tmask = None
if tuft is not None:
    # tuft faces: first-hit voxel is within the pale tolerance of the tuft field
    from r03_fieldview import first_hit
    k = first_hit(Fn, True)
    ix, iz = np.meshgrid(np.arange(Fn.shape[0]), np.arange(Fn.shape[2]), indexing='ij')
    tv = tuft[ix, np.clip(k, 0, Fn.shape[1]-1), iz]
    tmask = (k >= 0) & (tv <= .0056)
front_image(Fn, lo, vs, scale=2, tuft=tmask).save(out/f'front_{side}.png')
(out/f'info_{side}.json').write_text(json.dumps(info, indent=1))
