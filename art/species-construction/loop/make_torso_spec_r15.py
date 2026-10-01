"""Write torso-reshape-r06-v8.json: a dorsal swell on the rib cage (y pass, rows .26 to .40 only, waist rows untouched) plus a
hip flare (x pass, rows .46 to .62), both as small deltas on the rows measured from the live body (trunk_measure.py).

  python make_torso_spec_r15.py <trunk-measure-coarse.json (.02 steps .24-.62)> <trunk-measure-fine.json (.005 steps .40-.56)> <out.json>
"""
import json
import sys
import numpy as np

coarse = {r['y']: r for r in json.load(open(sys.argv[1]))}
fine = {r['y']: r for r in json.load(open(sys.argv[2]))}
BACK = {.26: 0, .28: .002, .30: .006, .32: .008, .34: .008, .36: .005, .38: .002, .40: 0, .42: 0}
FRONT = {.26: 0, .28: -.001, .30: -.002, .32: -.003, .34: -.003, .36: -.002, .38: 0, .40: 0, .42: 0}
edges = []
for y in sorted(BACK):
    r = coarse[round(y, 3)]
    edges.append([y, r['front'], r['back'], round(r['front']+FRONT[y], 4), round(r['back']+BACK[y], 4)])
HIP = {.46: 0, .48: .001, .50: .003, .52: .0045, .54: .006, .56: .0065, .58: .004, .60: .001, .62: 0, .64: 0}
rows = []
M = {}
for y in np.round(np.arange(.44, .641, .005), 3):
    if y in fine:
        M[y] = fine[y]['halfLeft']
    elif y in coarse and y <= .6:
        M[y] = coarse[y]['halfLeft']
M[.62], M[.64] = .148, .151
ks = sorted(M)
for y in np.round(np.arange(.44, .641, .01), 3):
    m = float(np.interp(y, ks, [M[k] for k in ks]))
    d = float(np.interp(y, sorted(HIP), [HIP[k] for k in sorted(HIP)])) if y >= .46 else 0.
    rows.append([float(y), round(m, 4), round(m+d, 4)])
spec = json.load(open('art/species-construction/specs/torso-reshape-r06-v7d.json'))
spec['note'] = 'v8 (round 15): dorsal swell .24-.40 (y pass) and hip flare .46-.62 (x pass) as deltas on body-0426 rows'
spec['edges'] = edges
spec['skipYPass'] = False
spec['yFade'] = {'topZero': .25, 'topFull': .27, 'bottomFull': .40, 'bottomZero': .43}
spec['frontX'] = [[.24, .08, .22], [.42, .08, .22], [.65, .08, .22]]
spec['backX'] = [[.24, .07, .17], [.42, .07, .17], [.65, .07, .17]]
spec['edgeSmoothing'] = .012
spec['dispSigma'] = .02
spec['sliceStep'] = .004
hw = spec['halfWidth']
hw['rows'] = rows
hw['fadeTop'] = [.46, .49]
hw['fadeBottom'] = [.58, .61]
hw['sigmaT'] = .006
hw['sigmaM'] = .004
hw['preBlur'] = {'zRange': [.04, -.06], 'zFade': .04, 'sigma': .01, 'xPad': .035, 'xFade': .035}
json.dump(spec, open(sys.argv[3], 'w'), indent=1)
print(edges)
print(rows)
