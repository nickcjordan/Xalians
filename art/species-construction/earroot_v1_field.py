"""Ear roots v1 (numpy only): the skull rounded into the back of each ear with a wide concave blend, no edge.

World units, +y toward the back, z up. Every edit is a function of position on the skin's signed distance S (positive
outside), never of a vertex index.

Why (anatomy review 2026-10-13, finding 10; Nick, 2026-10-13: "Yes, fix all ten of them."): in a horizontal section the
skull's back runs down and out to a tight concave corner (radius about .01) at |x| about .195, y about .025, and the ear's
rear face rises out of it; the corner runs from z about .60 up over the top of the root to z about .84. From behind it reads
as a vertical edge, the ear's back a flat plate set onto the skull.

A masked blur cannot fix it: the ear blade beside the corner is thin (about .03), so blurring raises the field there and
cancels the fill (a wider blur moved less, development a to c). The operator is a morphological closing of radius r:

  Sc(p)  = r - d_out(p)                        d_out = distance from p to the skin dilated by r (its surface {S = r} sampled
                                               as a projected point cloud, see closing_fill), capped at `searchR` x r;
                                               computed only on cells near the surface inside the mask
  fill   = smin3(0, Sc - S, k), lightly blurred (`fillSigma`) to remove the grid quantization of d_out
           closing only adds material, and only where the surface is concave with a radius under r: the corner becomes a
           fillet of radius r; the thin ear blade, its rim, the convex skull and the broad inner ear bowl are unchanged
  w      = max over sides of ellipsoid(c, s, fade) * rear(gy)
           rear: smootherstep of the y component of S's unit gradient (from S blurred by `gateSigma`), from rearGate[0] to
           rearGate[1], so only surface that faces backward (the skull behind the ear and the ear's rear face) takes the fill
  F      = S + w fill                         outside w the field is S exactly
  F      = F + w smin3(0, blur(F, smooth.sigma) - F, k)   stage 2 (optional `smooth`): a light fill-only blur that takes out
                                              the kink left where the fill's own smoothing clipped its peak
Ear shape, size, angle and inner ear are held (Nick approved the ears): the fill only widens the corner where the rear face
meets the skull.
"""
import numpy as np

from neck_v1_field import smootherstep, smin3, grid_coords, gaussian_blur3


def ellipsoid_mask(X, Y, Z, masks):
    w = np.zeros_like(X)
    for m in masks:
        for side in ((1, -1) if m.get('mirror', True) else (1,)):
            c = np.array(m['c'], float)*np.array([side, 1, 1])
            e = np.sqrt(((X-c[0])/m['s'][0])**2+((Y-c[1])/m['s'][1])**2+((Z-c[2])/m['s'][2])**2)
            w = np.maximum(w, smootherstep((m['fade'][1]-e)/(m['fade'][1]-m['fade'][0])))
    return w


def closing_fill(S, lo, step, P, r, R, k, chunk=1500):
    """Fill (<= 0) of a morphological closing of radius r at points P (n, 3).

    The dilated surface {S = r} is sampled as a point cloud: every grid cell with |S - r| under 1.5 cells is moved onto the
    level along the gradient (q' = q - (S(q) - r) grad S). d_out(p) is the distance from p to the nearest such point (exact
    to well under .0001 at this density, where a whole-cell search left .0025 terraces that printed as ripple bands,
    development h). Only points within R of P are kept; each side of the head uses its own side's points."""
    import neck_v1_field as nf
    gx, gy, gz = np.gradient(S, step)
    band = np.abs(S-r) < 1.5*step
    idx = np.argwhere(band)
    Q = lo+step*idx
    sv = S[band]
    G = np.stack([gx[band], gy[band], gz[band]], 1)
    G /= np.maximum((G*G).sum(1, keepdims=True), 1e-9)
    Q = Q-(sv-r)[:, None]*G
    pmin, pmax = P.min(0)-R, P.max(0)+R
    Q = Q[np.all((Q > pmin) & (Q < pmax), axis=1)]
    d = np.full(len(P), np.inf)
    for side in (1, -1):
        ps = np.where(side*P[:, 0] >= 0)[0]
        qs = Q[side*Q[:, 0] >= -.01].astype(np.float32)
        q2 = (qs*qs).sum(1)
        for c0 in range(0, len(ps), chunk):
            ii = ps[c0:c0+chunk]
            pp = P[ii].astype(np.float32)
            D2 = (pp*pp).sum(1)[:, None]+q2[None, :]-2*pp@qs.T
            d[ii] = np.sqrt(np.maximum(D2.min(1), 0))
    d = np.minimum(d, R)
    Sc = r-d
    s0 = nf.Trilinear(S, lo, step)(P)
    return smin3(np.zeros_like(s0), Sc-s0, k), int(len(Q))


def compose(S, lo, step, V, spec, log=print):
    X, Y, Z = grid_coords(lo, step, S.shape)
    rec = {}
    Bg = gaussian_blur3(S, spec['gateSigma']/step)
    gx, gy, gz = np.gradient(Bg, step)
    gn = gy/np.maximum(np.sqrt(gx*gx+gy*gy+gz*gz), 1e-9)
    g0, g1 = spec['rearGate']
    rear = smootherstep((gn-g0)/(g1-g0))
    w = ellipsoid_mask(X, Y, Z, spec['masks'])*rear
    C = spec['closing']
    shell = (w > 0) & (S > C['shell'][0]) & (S < C['shell'][1])
    cells = np.flatnonzero(shell)
    P = lo+step*np.argwhere(shell)
    fill_c, nq = closing_fill(S, lo, step, P, C['r'], C['searchR']*C['r'], spec['k'])
    unresolved = nq
    fill = np.zeros(S.size)
    fill[cells] = fill_c
    fill = fill.reshape(S.shape)
    # taper the fill out toward the shell's outer edge so it has no step there
    fill *= smootherstep((C['shell'][1]-S)/(C['shell'][1]-C['taper']))
    fill = gaussian_blur3(fill, spec['fillSigma']/step)
    F = S+w*fill
    sm = spec.get('smooth')
    if sm:
        # stage 2: a light fill-only blur of the closed field takes out the concave kink left where the fill's own smoothing
        # clipped its peak (at the old crease line); a plane is unchanged by a blur and the convex blade and rim give B > F
        B2 = gaussian_blur3(F, sm['sigma']/step)
        F = F+w*smin3(np.zeros_like(F), B2-F, spec['k'])
    rec.update({'fillMin': float(fill.min()), 'shellCells': int(len(cells)), 'dilatedSurfacePoints': unresolved,
                'maskCells': int((w > 0).sum())})
    log(f'ear root closing composed: {len(cells)} shell cells, fill min {fill.min():.4f}, {unresolved} dilated surface points')
    return F, w, rec
