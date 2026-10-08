"""S06: fur margin on the silhouette, per region, from alpha renders of the furred and clay model.

  python art/species-construction/surface/measure_margin.py <surface image dir>
Needs silhouette-fur/ and silhouette-clay/ (render_surface.py --alpha, the second with --hide-fur).
Regions: ears (z above 0.52, the whole crown band), tails (side view behind the body, front and back views
on the tail side below the chest), body (everything else: head, torso, limbs).
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

root = Path(sys.argv[1])
px = 2.05/1024
cx, cy, cz = 0.0, 0.16, -0.03
out = {}
for view in ('front', 'side', 'back'):
    fur = np.array(Image.open(root/f'silhouette-fur/{view}.png'))[:, :, 3] > 40
    clay = np.array(Image.open(root/f'silhouette-clay/{view}.png'))[:, :, 3] > 40
    h, w = fur.shape
    rows, cols = np.mgrid[0:h, 0:w]
    z = cz+(h/2-rows)*px
    right = (cols-w/2)*px
    if view == 'side':
        hor = cy+right            # image right is +y
        ears = z > 0.52
        tails = (z < 0.3) & (hor > 0.2)
        torso_side = hor > 0.2
    else:
        x = right if view == 'front' else -right
        ears = z > 0.52                     # the crown is ear fur too (rear fan roots)
        tails = (z < 0.3) & (x > 0.15)      # the tails stack on +x
        torso_side = tails
    body = ~ears & ~tails
    dist = ndi.distance_transform_edt(~clay)
    added = fur & ~clay
    out[view] = {}
    for name, mask in (('body', body), ('ears', ears), ('tails', tails)):
        d = dist[added & mask]
        out[view][name] = {'pixels': int(len(d)), 'p95': round(float(np.percentile(d, 95)*px), 4) if len(d) else 0.0,
                           'max': round(float(d.max()*px), 4) if len(d) else 0.0}
print(json.dumps(out, indent=1))
(root/'margin.json').write_text(json.dumps(out, indent=1))
