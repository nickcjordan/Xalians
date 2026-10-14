"""Shoulders v2 (numpy only): the shoulder joint re-blended into the trunk by a rolling-ball closing of the skin.

World units, +y toward the back, z up. Every edit is a function of position on the skin's signed distance S (positive
outside), never of a vertex index.

Measured cause (assembled-3198, anatomy review 2026-10-13 finding 3): the deltoid is shoulders v1's mirrored shoulder ball
on the top of the arm tube, joined to the trunk with a small blend (smooth minimum k .035), so it reads as a round pod set
onto the side of the trunk: behind it the back surface drops .02 to .025 into a vertical groove (x about .18, z .22 to .26),
the shoulder-top line kinks where the neck slope meets the ball, and the arm leaves the trunk at z .22 with a gap of about
.03 (a tight high armpit arch). Blurring the field there (development a) also shaved the arm and the pod (a blur thins
every convex tube thinner than a few sigma), and added ellipsoids (b) made new pods with their own creases.

The edit is a morphological closing (a rolling ball of radius r): the skin is grown outward by r and the grown surface is
shrunk back by r. A closing only adds material, and only where the surface is concave on a scale tighter than r: grooves,
kinks and inside corners fill with round fillets of radius r, while every convex surface (the pod, the arm, the trunk) is
left exactly as it was. That is a larger blend radius between arm and trunk without moving anything that is not in a
corner.

  closing(S, r)   inside = S - r < 0 (the skin grown by r: S is an accurate distance well beyond r near the surface);
                  its signed distance by a local Euclidean distance transform (half-voxel corrected), smoothed (sigma
                  `edtSmooth`), plus r
  fill            max(S - closing, 0), ramped in from `minFill` to `fullFill` so the transform's voxel noise on flat
                  surfaces never becomes a bump
  capsules       optional tapered capsules (pelvis_v1_field.capsule_field, mirrored) joined first by smooth minimum, so
                  the closings also round their joins
  masses          optional ellipsoids (mirrored) joined by smooth minimum before the closings
  F = S - sum_k w_k fill_k     each closing {r, mask} (ellipsoid masks c, s, fade, mirrored in x) adds its fill where its
                  mask is; the fills are combined by max, not summed
  blurs           optional masked Gaussian blurs of the result (ellipsoid masks, mirrored), for convex rims
  F = S + wbox (F - S)         part box (pelvis_v1_field.box_weight)
"""
import numpy as np

from neck_v1_field import smootherstep, grid_coords, gaussian_blur3
from neck_v1_field import smin3
from pelvis_v1_field import box_weight, capsule_field


def squared_distance_local(feature, reach):
    """Squared distance in voxels to the nearest feature voxel, exact up to `reach` voxels (separable lower envelope over a
    window of +-reach along each axis in turn; beyond the reach the value is at least reach squared). Blender's Python has
    no scipy, so this stands in for ndimage.distance_transform_edt where only short distances matter."""
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


def signed_distance_of(mask, step, reach):
    """Signed distance (negative inside) of a voxel mask, half-voxel corrected, exact to `reach` voxels."""
    din = np.sqrt(squared_distance_local(~mask, reach))
    dout = np.sqrt(squared_distance_local(mask, reach))
    return np.where(mask, -(din-0.5), dout-0.5)*step


def closing(S, step, r, smooth):
    D = signed_distance_of(S-r < 0, step, int(np.ceil(r/step))+4)
    if smooth > 0:
        D = gaussian_blur3(D, smooth/step)
    return D+r


def ellipsoid_weight(X, Y, Z, m):
    w = np.zeros_like(X)
    for side in ((1, -1) if m.get('mirror', True) else (1,)):
        c = np.array(m['c'], float)*np.array([side, 1, 1])
        s = np.array(m['s'], float)
        e = np.sqrt(((X-c[0])/s[0])**2+((Y-c[1])/s[1])**2+((Z-c[2])/s[2])**2)
        w = np.maximum(w, smootherstep((m['fade'][1]-e)/(m['fade'][1]-m['fade'][0])))
    return w


def compose(S, lo, step, spec, log=print):
    X, Y, Z = grid_coords(lo, step, S.shape)
    rec = {'closings': []}
    S0 = S
    for m in spec.get('capsules', []):
        for side in (1, -1):
            S = smin3(S, capsule_field(X, Y, Z, m, side), m['k'])
    for m in spec.get('masses', []):
        # ellipsoid masses (mirrored) joined by smooth minimum before the closings: the front of the deltoid brought
        # forward so it wraps into the chest instead of ending in a plateau behind the chest's corner
        for side in (1, -1):
            c = np.array(m['c'], float)*np.array([side, 1, 1])
            sz = np.array(m['s'], float)
            e = np.sqrt(((X-c[0])/sz[0])**2+((Y-c[1])/sz[1])**2+((Z-c[2])/sz[2])**2)
            S = smin3(S, (e-1)*sz.min(), m['k'])
    fill = np.zeros_like(S)
    for cl in spec['closings']:
        C = closing(S, step, cl['r'], cl.get('edtSmooth', spec.get('edtSmooth', .004)))
        f = np.maximum(S-C, 0.0)
        a, b = cl.get('minFill', spec.get('minFill', .0008)), cl.get('fullFill', spec.get('fullFill', .002))
        f = f*smootherstep((f-a)/(b-a))
        w = np.ones_like(S)
        if 'masks' in cl:
            w = np.zeros_like(S)
            for m in cl['masks']:
                w = np.maximum(w, ellipsoid_weight(X, Y, Z, m))
        for m in cl.get('exclude', []):
            w = w*(1-ellipsoid_weight(X, Y, Z, m))
        fill = np.maximum(fill, w*f)
        near = np.abs(S) < .004
        rec['closings'].append({'r': cl['r'], 'fillMaxNearSkin': float((w*f)[near].max())})
        log(f'closing r {cl["r"]}: fill max near the skin {(w*f)[near].max():.4f}')
    F = S-fill
    for bl in spec.get('blurs', []):
        # masked Gaussian blur of the closed field (mirrored): softens the deltoid ball's own convex rim, which a closing
        # cannot touch; run after the closing, so the grooves are already filled and the blur no longer thins the arm
        wb = ellipsoid_weight(X, Y, Z, bl)
        F = F+wb*(gaussian_blur3(F, bl['sigma']/step)-F)
        log(f'masked blur sigma {bl["sigma"]}')
    wbox = box_weight(X, Y, Z, spec['partBox'])
    F = S0+wbox*(F-S0)
    return F, wbox, rec
