"""Heel v1 (numpy only): the hind heel's back-bottom corner rounded, pads on the sole, the sole's edge lip and the heel side bumps
smoothed (anatomy review 2026-10-13, finding 7).

World units, +y toward the back, z up. Every edit is a function of position on the skin's signed distance S (positive
outside), never of a vertex index. The spec is written for the +x foot; every mass is mirrored to both sides.

  corner     [corner] in the side view, the heel's back-bottom corner is taken back to an arc of radius R round (yc, zc)
             (an arc tangent to the floor plane at y = yc): behind yc and below zc the field gains gain * (distance from the
             center - R) where that is positive, so the new zero set lies just outside the arc; nothing in front of yc or
             above zc changes, so the floor contact in front of the arc and the heel's back wall above it stay
  pads       [sole] within `band` of the floor plane `floorZ`, the field gains `depth` (the sole surface rises by that much)
             except under the pads, smooth ellipses in x, y (fade e1 to e2): four toe pads, the metatarsal pad and the heel's
             contact patch, so the pads stay on the floor as low mounds and the grooves between them rise; the same lift
             rolls the sole's edge lip in, since no pad reaches the edge
  blurX      [blurX] masked Gaussian blurs along x only (across the foot) over the heel's back and sides: the leg column runs
             down the back of the heel as a ridge with a groove either side (the small bumps on the heel's sides); averaging
             across the foot merges them into one round heel back without changing its height profile
  S1 = S + wbox (edits)
  F = pelvis_v1_field.compose(S1, ...) with the remaining keys: [blurs] masked isotropic blurs (pad edges, heel sides,
             the corner's join), [partBox] the part box, outside which F is S exactly.
"""
import numpy as np

from neck_v1_field import smootherstep, grid_coords
import pelvis_v1_field as pf


def pad_mask(X, Y, pads, side):
    P = np.zeros_like(X)
    for p in pads:
        cx, cy = side*p['c'][0], p['c'][1]
        e = np.sqrt(((X-cx)/p['s'][0])**2+((Y-cy)/p['s'][1])**2)
        e1, e2 = p.get('fade', [0.7, 1.15])
        P = np.maximum(P, smootherstep((e2-e)/(e2-e1)))
    return P


def compose(S, lo, step, V, spec, log=print):
    X, Y, Z = grid_coords(lo, step, S.shape)
    add = np.zeros_like(S)
    c = spec.get('corner')
    if c:
        r = np.sqrt((Y-c['yc'])**2+(Z-c['zc'])**2)
        quad = smootherstep((Y-c['yc'])/c.get('soft', .004))*smootherstep((c['zc']-Z)/c.get('soft', .004))
        xw = pf.box_weight(X, Y, Z, {'x': c['x']})
        add += c['gain']*np.maximum(r-c['R'], 0)*quad*xw
        log('heel corner rounded')
    so = spec.get('sole')
    if so:
        wz = smootherstep((so['floorZ']+so['band']-Z)/so['band'])
        P = np.maximum(pad_mask(X, Y, so['pads'], 1), pad_mask(X, Y, so['pads'], -1))
        xw = pf.box_weight(X, Y, Z, {'x': so['x'], 'y': so['y']})
        add += so['depth']*wz*(1-P)*xw
        log('sole pads raised in relief')
    F0 = S+add
    for bx in spec.get('blurX', []):
        sig = bx['sigma']/step
        rad = int(np.ceil(3*sig))
        k = np.exp(-0.5*(np.arange(-rad, rad+1)/sig)**2)
        k /= k.sum()
        q = np.pad(F0, [(rad, rad), (0, 0), (0, 0)], mode='edge')
        Fb = np.zeros_like(F0)
        for j, kv in enumerate(k):
            Fb += kv*q[j:j+F0.shape[0]]
        wb = np.zeros_like(F0)
        for side in (1, -1):
            c = np.array(bx['c'], float)*np.array([side, 1, 1])
            e = np.sqrt(((X-c[0])/bx['s'][0])**2+((Y-c[1])/bx['s'][1])**2+((Z-c[2])/bx['s'][2])**2)
            wb = np.maximum(wb, smootherstep((bx['fade'][1]-e)/(bx['fade'][1]-bx['fade'][0])))
        F0 = F0+wb*(Fb-F0)
        log('heel blurred across the foot')
    wbox = pf.box_weight(X, Y, Z, spec['partBox'])
    S1 = S+wbox*(F0-S)
    rest = {k: v for k, v in spec.items() if k not in ('corner', 'sole', 'blurX')}
    F, w, rec = pf.compose(S1, lo, step, V, rest, log=log)
    return F, w, rec
