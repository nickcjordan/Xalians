"""Remove a ground plate from a reconstruction grid: below a height, keep solid only under the feet.

    python art/studio/recon/grid_plate.py --grid <grid.npz> --out <grid.npz> [--height 0.016] [--grow 0.002]

The model copies a drawing's ground shadow as a thin plate joined to the feet. A thinning cut leaves a rim around
each foot (it read as a shoe sole), so this cuts by footprint instead: the solid cross-section at --height is the
feet; below it, solid outside that footprint (grown by --grow) is emptied. Experiment X30.
"""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from scipy import ndimage

ap = argparse.ArgumentParser()
ap.add_argument('--grid', type=Path, required=True)
ap.add_argument('--out', type=Path, required=True)
ap.add_argument('--height', type=float, default=0.016)
ap.add_argument('--grow', type=float, default=0.002)
a = ap.parse_args()
z = np.load(a.grid)
origin, voxel, vals = np.asarray(z['origin'], float), float(z['voxel']), np.array(z['values'], np.float32)
record = json.loads(str(z['record'])) if 'record' in z.files else {}
k = int(round((a.height-origin[2])/voxel))
foot = vals[:, :, k] < 0
foot = ndimage.binary_dilation(foot, iterations=max(1, int(round(a.grow/voxel))))
below = vals[:, :, :k]
below[~foot[:, :, None].repeat(k, axis=2)] = np.maximum(below[~foot[:, :, None].repeat(k, axis=2)], 2*voxel)
vals[:, :, :k] = below
record['plateCut'] = {'from': str(a.grid), 'fromSha256': hashlib.sha256(a.grid.read_bytes()).hexdigest(),
                      'height': a.height, 'grow': a.grow}
np.savez_compressed(a.out, origin=origin, voxel=np.float64(voxel), values=vals, record=json.dumps(record))
print(json.dumps(record['plateCut']))
