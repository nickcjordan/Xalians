"""Rendered color of the poof strands' own root and outer thirds (step 21).

Pixels come from projecting each poof strand's points (patch evidence) into the
ears-front camera; only the first and last thirds of each strand are used.
Blue share: 0 = head white, 1 = ear blue (by blue minus red).
  python measure_ear_poof_21.py <surface dir> <ears-front.png>
"""
import sys
import json
import math
from pathlib import Path
import numpy as np
from PIL import Image

surface, image = Path(sys.argv[1]), Path(sys.argv[2])
poof = np.load(surface / 'patch-evidence.npz')['poof']
el = math.radians(3)
fwd = np.array([0, math.cos(el), -math.sin(el)])
right = np.cross(fwd, [0, 0, 1]); right /= np.linalg.norm(right)
up = np.cross(right, fwd)
S = 1.35 / 1024
t0 = np.array([0, -.02, .74])
a = np.asarray(Image.open(image).convert('RGB')).astype(float)
n = poof.shape[1]
head = a[300:330, 470:555].reshape(-1, 3).mean(0)
out = dict(headWhite=head.round(1).tolist())
for side, sign in (('left', -1), ('right', 1)):
    sel = np.sign(poof[:, 0, 0]) == sign
    def pix(part):
        q = part.reshape(-1, 3) - t0
        x = np.round(512 + q @ right / S).astype(int)
        y = np.round(333.5 - q @ up / S).astype(int)
        return np.unique(np.c_[x, y], axis=0)
    root = pix(poof[sel, : n // 3])
    tip = pix(poof[sel, 2 * n // 3:])
    rootset = {tuple(v) for v in root}
    tip = np.array([v for v in tip if tuple(v) not in rootset])   # outer third only, never a root pixel
    ox = 375 if sign < 0 else 649
    ax = math.radians(-149 if sign < 0 else -31)
    ear = a[int(363 + 125 * math.sin(ax)) - 6:int(363 + 125 * math.sin(ax)) + 6,
            int(ox + 125 * math.cos(ax)) - 6:int(ox + 125 * math.cos(ax)) + 6].reshape(-1, 3).mean(0)
    br = lambda c: c[2] - c[0]
    col = lambda p: a[p[:, 1], p[:, 0]].mean(0)
    rc, tc = col(root), col(tip)
    hh, ww = a.shape[:2]
    yy, xx = np.mgrid[:hh, :ww]
    inhead = ((xx - 512) / 140.0) ** 2 + ((yy - 395) / 175.0) ** 2 <= 1.0
    near = inhead & (np.hypot(xx - ox, yy - 363) < 22)
    hc = a[near].mean(0)
    tip_head = np.array([v for v in tip if inhead[v[1], v[0]]]) if len(tip) else np.zeros((0, 2), int)
    thc = col(tip_head) if len(tip_head) else None
    out[side] = dict(earBlue=ear.round(1).tolist(), root=rc.round(1).tolist(), tip=tc.round(1).tolist(),
                     rootBlueShare=round(float((br(rc) - br(head)) / (br(ear) - br(head))), 2),
                     tipBlueShare=round(float((br(tc) - br(head)) / (br(ear) - br(head))), 2),
                     rootPixels=len(root), tipPixels=len(tip),
                     headNextToEarBaseBlueShare=round(float((br(hc) - br(head)) / (br(ear) - br(head))), 3),
                     poofTipPixelsOverHead=len(tip_head),
                     poofTipOverHeadBlueShare=None if thc is None else round(float((br(thc) - br(head)) / (br(ear) - br(head))), 3))
print(json.dumps(out, indent=1))
if len(sys.argv) > 3:
    Path(sys.argv[3]).write_text(json.dumps(out, indent=2) + '\n')
