"""Akinza buttocks v1 (numpy only): the -x buttock given the +x buttock's shape, its crease and ridge smoothed, and the
cleft's lower end faded out above the crotch.

World units, +y toward the back, z up. Every edit is a function of position on the skin's signed distance S, never of a
vertex index.

Anatomy review 2026-10-13, finding 9. Measured on assembled-3221 (after tail base v1): away from the tails (a point and its
mirror both more than .03 from any tail) the two buttocks agree to .0082 (mirror test); the mismatch the review found (up to
.048 at about (-.07, .042, -.146)) mirrors onto the +x tail roots, so there is no +x buttock skin to copy there, and tail
base v1 already rebuilt the +x buttock under the lowest tail (its channel was what the guard had frozen). A mirror of the
tail-free body (below) was built and tried: copying the +x body near the roots raised a lobe on the -x buttock, and kept
clear of the tails on both sides it only moved the -x outer hip by .005 toward a +x side that is itself the odd one there,
leaving a slit at the mask edge. So buttocks v1 runs with the mirror off ([mirror.enabled] false) and works on the -x
crease and ridge and the lower cleft directly.

  T        the distance to the tails (tail base v1's moved tails, from [tailbase])
  B, Bm    with [mirror.enabled]: the skin's field with the tails filled out by a biharmonic fill, mirrored in x (the grid is
           symmetric about x = 0); F0 = S + wm (Bm - S) on the -x side inside [mirror.mask], faded out before the midline
           (x [mirror.xFade]) and kept clear of the tails at the point and at its mirror ([mirror.clear]); else F0 = S
  F0'      soft masses [masses], joined by smooth minimum (none in v1: a fill of the lower cleft stood as a nub)
  F1       masked blurs [blurs], each kept off the tails by its own [clear] band: the -x buttock's crease and ridge beside
           the lowest tail's root, and two on the back of the perineum where the cleft runs down into the crotch
  F        S + w (F1 - S), w the part box [partBox]
The crotch apex itself (pelvis v2, approved) is outside the blur masks: a blur centred there (variants f, g) pushed the
apex down and puckered it.
"""
import json
from pathlib import Path

import numpy as np

import neck_v1_field as nf
import tailbase_v1_field as tb
from tails_v4_field import sweep
from pelvis_v1_field import box_weight


def compose(S, lo, step, spec, repo, log=print):
    shape = S.shape
    X, Y, Z = nf.grid_coords(lo, step, shape)
    if abs(lo[0]+(lo[0]+step*(shape[0]-1))) > 1e-9:
        raise SystemExit('the grid must be symmetric about x = 0')
    tspec = json.loads((Path(repo)/spec['tailbase']).read_text(encoding='utf-8'))
    _old, new, _ = tb.tails(tspec, repo)
    hd = float(spec['hole']['d'])
    T = np.full(shape, hd+.02, np.float32)
    for n in new:
        T = np.minimum(T, sweep(n, lo, step, shape, reach=hd+.02))
    hole = T < hd
    hole[[0, -1], :, :] = False
    hole[:, [0, -1], :] = False
    hole[:, :, [0, -1]] = False
    mv = spec['mirror']
    if not mv.get('enabled', True):
        F = S.copy()
        B = None
        log('mirror off')
    else:
        F, B = _mirrored(S, T, X, Y, Z, step, hd, spec, log)
    return _rest(F, S, T, X, Y, Z, step, shape, spec, log, hole, B)


def _mirrored(S, T, X, Y, Z, step, hd, spec, log):
    """F0 with the mirror on: the -x buttock takes the tail-free body's +x form (see the module docstring)."""
    hole = T < hd
    hole[[0, -1], :, :] = False
    hole[:, [0, -1], :] = False
    hole[:, :, [0, -1]] = False
    farv = float(spec['hole'].get('far', .06))
    Sb = np.where((S > 0) & (T-S < spec['hole'].get('tailNear', .002)), np.maximum(S, farv), S).astype(np.float32)
    B = tb.biharmonic_fill(Sb, hole, spec['hole'].get('iterations', 600), spec['hole'].get('coarseIterations', 3000), log=log)
    B[~hole] = S[~hole]
    Bm = B[::-1].copy()
    mv = spec['mirror']
    wm = tb.ellipsoid_w(X, Y, Z, mv['mask'])
    # both the point and its mirror image must be clear of the tails: the +x side by the tails' roots is no buttock to copy
    wm = wm*nf.smootherstep((mv['xFade'][1]-X)/(mv['xFade'][1]-mv['xFade'][0]))*_clear(T, mv['clear'])*_clear(T[::-1], mv['clear'])
    log('mirrored -x buttock')
    return (S+wm*(Bm-S)).astype(np.float32), B


def _clear(T, c):
    return nf.smootherstep((T-c[0])/(c[1]-c[0])).astype(np.float32)


def _rest(F, S, T, X, Y, Z, step, shape, spec, log, hole, B):
    dc = spec['mirror']['clear']
    for m in spec.get('masses', []):
        # spec 'masses': ellipsoids joined with a smooth minimum (k), kept clear of the tails
        e = np.sqrt(((X-m['c'][0])/m['s'][0])**2+((Y-m['c'][1])/m['s'][1])**2+((Z-m['c'][2])/m['s'][2])**2)
        D = ((e-1)*min(m['s'])).astype(np.float32)
        Fm = nf.smin3(F, D, m['k']).astype(np.float32)
        F = (F+_clear(T, m.get('clear', dc))*(Fm-F)).astype(np.float32)
        log('mass')
    for bl in spec.get('blurs', []):
        Fb = nf.gaussian_blur3(F, bl['sigma']/step).astype(np.float32)
        wb = np.zeros(shape, np.float32)
        for e in bl['mask']:
            wb = np.maximum(wb, tb.ellipsoid_w(X, Y, Z, e))
        wb = wb*_clear(T, bl.get('clear', dc))
        F = (F+wb*(Fb-F)).astype(np.float32)
        log('masked blur')
    w = box_weight(X, Y, Z, spec['partBox']).astype(np.float32)
    F = (S+w*(F-S)).astype(np.float32)
    return F, w, {'holeCells': int(hole.sum())}, {'B': B if B is not None else S, 'T': T, 'hole': hole}
