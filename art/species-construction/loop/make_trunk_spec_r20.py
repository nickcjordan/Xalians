"""Writes R06 round 20 trunk spec variants from the v1 table (specs/trunk-sections-r06-v1.json) with named overrides.
  make_trunk_spec_r20.py <out.json> [key=value ...]   keys: native_hw, hold_back, exp_front, exp_back, lat (narrow|wide), back_swell
"""
import json, sys
from pathlib import Path
base = json.loads(Path(__file__).resolve().parents[1].joinpath('specs/trunk-sections-r06-v1.json').read_text())
out = Path(sys.argv[1]); kv = dict(a.split('=') for a in sys.argv[2:])
by = {s['y']: s for s in base['stations']}
if kv.get('native_hw', '0') == '1':
    for y, h in {.28: .090, .30: .090, .32: .089, .34: .089, .36: .092, .38: .0954}.items():
        by[y]['halfWidth'] = h
if kv.get('hold_back', '0') == '1':
    for y, b in {.40: .0123, .42: .0013, .44: -.0048, .46: -.0034, .48: .0035}.items():
        by[y]['back'] = b
if 'exp_front' in kv:
    for y in (.28, .30, .32, .34, .36): by[y]['expFront'] = float(kv['exp_front'])
if 'exp_back' in kv:
    for y in (.28, .30, .32, .34, .36): by[y]['expBack'] = float(kv['exp_back'])
if 'back_swell' in kv:   # extra back depth at .32 to .36 (fit)
    for y, f in {.30: .5, .32: 1, .34: 1, .36: 1, .38: .5}.items(): by[y]['back'] += float(kv['back_swell'])*f
if 'hw_soft' in kv:     # soften the waist pinch: add hw_soft x this table (fit) to the half width
    for y, d in {.36: .001, .38: .0035, .40: .0055, .42: .0045, .44: .0035, .46: .0035, .48: .0025, .50: .0015}.items():
        by[y]['halfWidth'] += float(kv['hw_soft'])*d
if kv.get('smooth_front', '0') == '1':
    for y, f in {.40: -.1005, .42: -.0995, .44: -.0990, .46: -.0990, .48: -.0990, .50: -.0995}.items():
        by[y]['front'] = f
if kv.get('lat') == 'wide':
    base['weights']['lateral'] = {'inner': [[.30, .06], [.46, .30]], 'outer': [[.30, .10], [.46, .34]]}
base['description'] = 'R06 round 20 variant ' + ' '.join(sys.argv[2:])
out.write_text(json.dumps(base, indent=1)+'\n')
