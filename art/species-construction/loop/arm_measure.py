"""Cheap R07 geometry numbers for a body component without assembling.

  python art/species-construction/loop/arm_measure.py <verts.npz of the body> [--parts]

Takes a rig_dump.py vertex dump (the posed_arm_quick.py runs leave one at scratch-r07/<out>/verts.npz) and prints, for the
character's right arm (the -x side) in the arms-down construction pose, in fit units (figure height 1.8605, y down from
the crown with the floor at 1):
  - front-view arm outer and inner edge and width by row (.34 to .64), skin only,
  - the paw's edge-on width by row against the wrist (R07.5: widest about 1.12 wrists, at least .029 at 85 percent of the paw),
  - the flat span of the outer upper-arm face by row (R07.1: lateral surface within .003 world of its maximum, bound .017 fit).
"""
import argparse
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import loop_tools as lt  # noqa: E402

H = 1.8605
p = argparse.ArgumentParser()
p.add_argument('verts')
a = p.parse_args()
skin, parts, _ = lt.load_dump(a.verts)
arm = skin[(skin[:, 0] < -.2) & (skin[:, 2] < .34) & (skin[:, 2] > -.30)]
yfit = 1-(arm[:, 2]+.957)/H
print('row   outer   inner   width')
rows = np.arange(.34, .65, .02)
wrist = None
for r in rows:
    sel = arm[np.abs(yfit-r) < .004]
    # the arm only: drop vertices of the thigh and flank (x > -.2 already dropped); the hip may enter near .50, so keep the outer cluster
    if len(sel) == 0:
        continue
    xs = np.sort(sel[:, 0])
    gaps = np.where(np.diff(xs) > .012)[0]
    if len(gaps):
        xs = xs[:gaps[0]+1]   # outermost cluster (most negative x)
    outer, inner = xs[0]/H, xs[-1]/H
    print(f'{r:.2f} {outer:+.3f} {inner:+.3f} {inner-outer:.3f}')
print()
print('flat span of the lateral face (world, within .003 of max; fit = world/1.8605)')
for r in np.arange(.32, .44, .02):
    sel = skin[(skin[:, 0] < 0) & (np.abs(1-(skin[:, 2]+.957)/H-r) < .003) & (skin[:, 0] < -.18)]
    if not len(sel):
        continue
    xs = np.sort(sel[:, 0]); gaps = np.where(np.diff(xs) > .012)[0]
    sel = sel[sel[:, 0] <= (xs[gaps[0]] if len(gaps) else xs[-1])]
    xmin = sel[:, 0].min()
    flat = sel[sel[:, 0] < xmin+.003]
    span = flat[:, 1].max()-flat[:, 1].min()
    print(f'{r:.2f} outer x {xmin:+.4f} flat span {span:.4f} world = {span/H:.4f} fit; depth {sel[:,1].max()-sel[:,1].min():.4f}')
