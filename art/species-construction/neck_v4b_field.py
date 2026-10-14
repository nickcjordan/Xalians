"""Neck v4b (numpy only): neck v4 with the jaw-to-throat junction closed by a rolling ball, so the front of the neck does
not run back under the jaw.

World units, +y toward the back, z up. Every edit is a function of position on the skin's signed distance (positive
outside), never of a vertex index.

Why (coordinator, 2026-10-13, on neck v4 / assembled-3201): the jaw-to-throat junction was a tight corner with a slight
undercut. Measured at the midline, going down from the jaw line the throat front ran back from y -.090 at z .512 to -.072 at
z .488 before turning forward (at x .03: -.094 to -.067), so the jaw edge overhung the throat like a ledge.

  F4              neck_v4_field.compose (jaw carve, then neck v3's column, throat line, nape, blurs)
  closing         a morphological closing of F4 by a ball of radius r (`closing`), under an ellipsoid mask at the junction:
                  the field is grown by r and shrunk back by r (a local Euclidean distance transform), which fills every
                  concave place tighter than r with a round fillet of radius r and leaves convex surfaces as they are, so the
                  junction becomes one round hollow and the short backward lean below it fills in
  fill            max(F4 - closed, 0), ramped in from minFill to fullFill, so the transform's voxel noise never prints
  F = F4 - w fill, then optional masked blurs (`cornerBlurs`, mirrored) of the result, for the jaw corners in the front view
"""
import numpy as np

from neck_v1_field import smootherstep, grid_coords, gaussian_blur3
import neck_v4_field as n4


def squared_distance_local(feature, reach):
    big = float(3*(reach+1)**2)
    D = np.where(feature, 0.0, big)
    for ax in range(3):
        n = D.shape[ax]
        out = D.copy()
        for k in range(1, reach+1):
            a = [slice(None)]*3
            b = [slice(None)]*3
            a[ax], b[ax] = slice(k, n), slice(0, n-k)
            out[tuple(a)] = np.minimum(out[tuple(a)], D[tuple(b)]+k*k)
            out[tuple(b)] = np.minimum(out[tuple(b)], D[tuple(a)]+k*k)
        D = out
    return D


def closing(F, step, r, smooth):
    mask = F-r < 0
    reach = int(np.ceil(r/step))+4
    din = np.sqrt(squared_distance_local(~mask, reach))
    dout = np.sqrt(squared_distance_local(mask, reach))
    D = np.where(mask, -(din-0.5), dout-0.5)*step
    if smooth > 0:
        D = gaussian_blur3(D, smooth/step)
    return D+r


def ellipsoid_weight(X, Y, Z, m, mirror):
    w = np.zeros_like(X)
    for side in ((1, -1) if mirror else (1,)):
        c = np.array(m['c'], float)*np.array([side, 1, 1])
        s = np.array(m['s'], float)
        e = np.sqrt(((X-c[0])/s[0])**2+((Y-c[1])/s[1])**2+((Z-c[2])/s[2])**2)
        w = np.maximum(w, smootherstep((m['fade'][1]-e)/(m['fade'][1]-m['fade'][0])))
    return w


def compose(S, lo, step, V, spec, log=print):
    rest = {k: v for k, v in spec.items() if k not in ('closing', 'cornerBlurs')}
    F, w, rec = n4.compose(S, lo, step, V, rest, log=log)
    X, Y, Z = grid_coords(lo, step, S.shape)
    cl = spec['closing']
    C = closing(F, step, cl['r'], cl.get('edtSmooth', .003))
    fill = np.maximum(F-C, 0.0)
    a, b = cl.get('minFill', .0004), cl.get('fullFill', .0015)
    fill = fill*smootherstep((fill-a)/(b-a))
    wc = ellipsoid_weight(X, Y, Z, cl['mask'], False)
    F = F-wc*fill
    near = np.abs(F) < .004
    rec['closingFillMaxNearSkin'] = float((wc*fill)[near].max())
    log(f'junction closing r {cl["r"]}: fill max near the skin {rec["closingFillMaxNearSkin"]:.4f}')
    W = np.maximum(w, wc)
    for bl in spec.get('cornerBlurs', []):
        wb = ellipsoid_weight(X, Y, Z, bl, True)
        F = F+wb*(gaussian_blur3(F, bl['sigma']/step)-F)
        W = np.maximum(W, wb)
    return F, W, rec
