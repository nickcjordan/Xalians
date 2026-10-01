"""Write a reshape_torso_field.py spec whose model rows come from a live trunk_measure.py JSON.

  python make_torso_spec.py <trunk-measure.json> <out-spec.json> [--base specs/torso-reshape-r06-v5.json]

Edge model rows: front and back at x=0 for fit y up to .485, tail-free strip back (stripBack) below that, because the
tail root merges at x=0. Targets are the R06 spec's sheet rows with the lumbar hollow carried to the sheet's depth and
the rump pulled in a little; half width model rows are the measured left half widths (dense), targets a monotone
cubic through the R06 flank anchors (no step over .015 per .02). Everything below is a lever in the JSON it writes.
"""
import json
import sys
from pathlib import Path

import numpy as np
from scipy.interpolate import PchipInterpolator

src, out = Path(sys.argv[1]), Path(sys.argv[2])
SIGMA_R = float(sys.argv[sys.argv.index('--sigma-r')+1]) if '--sigma-r' in sys.argv else 0
SIGMA_M = float(sys.argv[sys.argv.index('--sigma-m')+1]) if '--sigma-m' in sys.argv else .004
SIGMA_T = float(sys.argv[sys.argv.index('--sigma-t')+1]) if '--sigma-t' in sys.argv else .02
base = Path(sys.argv[sys.argv.index('--base')+1]) if '--base' in sys.argv else Path(__file__).resolve().parents[1]/'specs/torso-reshape-r06-v5.json'
rows = {r['y']: r for r in json.loads(src.read_text())}
rows.update({round(y, 3): r for y, r in rows.items()})
spec = json.loads(base.read_text())

# target edges (fit): y -> (front, back); None keeps the measured value
# Targets are in the ray frame of trunk_measure.py: the loop silhouette frame sits about .0035 (fit) forward of it
# (measured: left render front edge -.0035 against the x=0 ray at every row .26 to .36), so a sheet row s is s+.0035 here.
FRONT_T = {y: None for y in (.24, .26, .28, .30, .32, .34, .36, .38, .40, .42, .44, .46, .48, .50, .52, .54, .56, .58, .60, .62)}
BACK_T = {.24: None, .26: None, .28: None, .30: None, .32: None, .34: None, .36: None, .38: .0225, .40: .0090, .42: -.0010, .44: -.0090,
          .46: -.0070, .48: .0025, .50: .0185, .52: None, .54: None, .56: None, .58: None, .60: None, .62: None}
if '--x-only' in sys.argv:      # second pass on an already hollowed body: the y pass becomes the identity
    BACK_T = {y: None for y in BACK_T}
edges = []
for y in sorted(FRONT_T):
    r = rows[round(y, 3)]
    mb = r['back'] if y <= .485 else r['stripBack']
    mf = r['front'] if y <= .515 else r['stripFront']
    ft = mf if FRONT_T[y] is None else FRONT_T[y]
    bt = mb if BACK_T[y] is None else BACK_T[y]
    edges.append([y, mf, mb, ft, bt])
spec['edges'] = edges

anchors = {.40: .0816, .42: .0699, .44: .0640, .46: .0680, .48: .0765, .50: .0885, .52: .1030, .54: .1170, .56: .1300, .58: .1393, .60: .1445, .62: .1470}
pc = PchipInterpolator(list(anchors), list(anchors.values()))
hw = []
for y in np.round(np.arange(.40, .6201, .005), 3):
    r = rows[float(y)]
    t = round(float(pc(y)), 4)
    hw.append([float(y), r['halfLeft'] if y <= .60 else t, t])
spec['halfWidth'] = {'note': 'rows: y, measured model half width (left), target half width (fit); x pass about the midline; sigma smooths the tables (world)',
                     'rows': hw, 'fadeTop': [.41, .45], 'fadeBottom': [.57, .60], 'lateralFade': .08, 'sigmaM': SIGMA_M, 'sigmaT': SIGMA_T, 'sigmaRatio': SIGMA_R}
spec['note'] = 'v6: model rows measured from the live body (trunk_measure.py), dense half width tables, sigma .02; lumbar hollow to the sheet depth.'
spec.pop('beltBlur', None)
if '--belt-blur' in sys.argv:   # z range world, fixed: the crease sits at fit .495 (z -.016) in body-0325
    spec['beltBlur'] = {'zRange': [-.005, -.035], 'zFade': .02, 'sigma': .012, 'xFull': .16, 'xFade': .05}
out.write_text(json.dumps(spec, indent=1))
print('edges'); [print(e) for e in edges]
print('hw'); [print(h) for h in hw]
