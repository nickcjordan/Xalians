"""Torso v1 (numpy only): the trunk's midline depth profile re-faired (chest front, belly, upper back, lumbar hollow).

World units, +y toward the back, z up. Every edit is a function of position, never of a vertex index, so the step chains after
whatever runs before it.

Measured cause (assembled-3195, anatomy review 2026-10-13 finding 1): the front midline is a vertical plane (y -.196 to -.198
from z .22 down to -.04: no chest curve, no belly curve); the back bulges at the shoulder blades (y +.055 at z .28), cuts forward
to y -.044 at z .08 (the lumbar hollow) and swings back out to +.06 at z -.08 (the rump). Trunk depth runs .24 at the chest,
.153 at the waist and .25 at the rump. The profile is the trunk loft's own midline: assembled-3168 and 3190 (before body B)
measure the same hollow (-.044 at z .08); body B lowered the hump by about .006 and moved the front by .004. Nothing since
the loft has shaped the trunk in depth; the waist is pinched in depth as hard as in width.

The edit is a depth-only warp: every vertex moves along y only, so every front-view width (body B) is unchanged exactly.
  yf0(z), yb0(z)   the measured front and back midline profiles (a fit to the vertices near x = 0 at each height, see
                   midline_profiles, lightly smoothed along z)
  df(z), db(z)     target (a natural cubic spline through the spec's 'front' / 'back' target points) minus measured, faded to
                   0 outside the profile's z band and smoothed along z (deltaSmooth)
  c(z)             a split height in depth between front and back: yf0 + split (yb0 - yf0)
  tf, tb           the depth fraction toward the front or back surface (0 at c, 1 at the midline surface)
  dy = df(z) wf(x) S(tf) + db(z) wb(x) S(tb), S = smootherstep, so the side of the trunk (t near 0) stays put and the
                   change grows smoothly to the full amount at the front or back midline; wf, wb fade the edit out toward the
                   arms (smootherstep in |x|); a vertex more than `beyond` outside the back profile (the tails) is not moved.
The map y -> y + dy is monotonic (checked: d(dy)/dy stays above -1), so no fold can be introduced. A Taubin relax restricted
to the moved vertices (optional, `warpRelax`) evens the tangential spacing the warp stretches.

The warp is a function of z, so it can only be smooth in z or follow the old crease exactly at the midline: where the crease
bends across the back a sharp z-only change prints wavy bands beside the midline (development j and l). So the warp is kept
smooth (deltaSmooth .02) and a second stage, blur_field, blurs the warped skin's signed distance under masks on the back,
and the vertices are moved onto that field (hips_v1_field.move_vertices), which takes out what is left of the crease
wherever it runs.
"""
import numpy as np

from neck_v1_field import natural_spline


def smootherstep(t):
    t = np.clip(t, 0.0, 1.0)
    return t*t*t*(t*(6*t-15)+10)


def band(v, a, b, c, d):
    return smootherstep((v-a)/max(b-a, 1e-9))*smootherstep((d-v)/max(d-c, 1e-9))


def smooth1(a, cells):
    rad = int(np.ceil(3*cells))
    k = np.exp(-0.5*(np.arange(-rad, rad+1)/cells)**2)
    k /= k.sum()
    return np.convolve(np.pad(a, rad, mode='edge'), k, 'valid')


def midline_profiles(V, spec):
    """Front (min y) and back (max y) of the trunk at the midline, per z on a fine table. At each height the surface points
    near the midline (|x| under fitX, within slab in z, within band of the extreme) are fitted with y = a + b x^2 + c dz, and
    a is the profile: a fit over a few hundred vertices follows the surface, where the extreme vertex of a thin slab steps
    with the tessellation (those steps, copied into the change, printed as faint horizontal bands)."""
    P = spec['profile']
    zs = np.arange(P['z'][0], P['z'][1]+1e-9, P['dz'])
    fx = P.get('fitX', .035)
    near = V[(np.abs(V[:, 0]) < fx) & (V[:, 1] < P['maxY']) & (V[:, 1] > P['minY'])]
    yf, yb = np.full(len(zs), np.nan), np.full(len(zs), np.nan)
    for i, z in enumerate(zs):
        q = near[np.abs(near[:, 2]-z) < P['slab']]
        if len(q) < 12:
            continue
        for out, sgn in ((yf, -1), (yb, 1)):
            ext = (sgn*q[:, 1]).max()
            r = q[sgn*q[:, 1] > ext-P.get('band', .012)]
            if len(r) < 8:
                continue
            A = np.stack([np.ones(len(r)), r[:, 0]**2, r[:, 2]-z], 1)
            out[i] = np.linalg.lstsq(A, r[:, 1], rcond=None)[0][0]
    for a in (yf, yb):
        ok = ~np.isnan(a)
        a[~ok] = np.interp(zs[~ok], zs[ok], a[ok])
    cells = P['smooth']/P['dz']
    return zs, smooth1(yf, cells), smooth1(yb, cells)


def deltas(zs, yf, yb, spec):
    out = {}
    for key, cur in (('front', yf), ('back', yb)):
        S = spec[key]
        tz, ty = np.array(S['target'], float).T
        order = np.argsort(tz)
        tgt = natural_spline(tz[order], ty[order])(zs)       # C2 through the target points (a polyline creases the skin)
        a, b, c, d = S['zBand']
        dl = (tgt-cur)*band(zs, a, b, c, d)
        out[key] = smooth1(dl, spec.get('deltaSmooth', .01)/spec['profile']['dz'])
    return out


def warp(V, spec, sel=None):
    """Depth-only displacement for vertices V (n,3); returns dy (n,) and the record of profiles."""
    zs, yf, yb = midline_profiles(V, spec)
    dl = deltas(zs, yf, yb, spec)
    X, Y, Z = V[:, 0], V[:, 1], V[:, 2]
    # the split height c uses the profiles smoothed more heavily (rampSmooth): it only sets how the change spreads round the
    # section; the ramps end on the measured profiles themselves, so the midline gets the full change
    rc = spec.get('rampSmooth', 0.0)/spec['profile']['dz']
    yfs, ybs = (smooth1(yf, rc), smooth1(yb, rc)) if rc > 0 else (yf, yb)
    f0 = np.interp(Z, zs, yf)
    b0 = np.interp(Z, zs, yb)
    df = np.interp(Z, zs, dl['front'], left=0.0, right=0.0)
    db = np.interp(Z, zs, dl['back'], left=0.0, right=0.0)
    fs, bs = np.interp(Z, zs, yfs), np.interp(Z, zs, ybs)
    c = fs+spec['split']*(bs-fs)
    rf = spec.get('rampFull')
    if rf:
        # the ramps run on the smoothed profiles too and reach the full change at rampFull of the way to them, so the
        # tessellation's steps in the measured profile cannot print through the ramp's slope; the midline still gets
        # the full change (the smoothed profile is within a few thousandths of the measured one)
        tf = (c-Y)/np.maximum(c-fs, 1e-6)/rf
        tb = (Y-c)/np.maximum(bs-c, 1e-6)/rf
    else:
        tf = (c-Y)/np.maximum(c-f0, 1e-6)
        tb = (Y-c)/np.maximum(b0-c, 1e-6)
    ax = np.abs(X)
    wf = smootherstep((spec['front']['xOut']-ax)/(spec['front']['xOut']-spec['front']['xIn']))
    wb = smootherstep((spec['back']['xOut']-ax)/(spec['back']['xOut']-spec['back']['xIn']))
    beyond, bf = spec.get('beyond', .03), spec.get('beyondFade', spec.get('beyond', .03))
    keepb = smootherstep((b0+beyond+bf-Y)/bf)           # nothing far behind the back profile (the tails) moves
    keepf = smootherstep((Y-(f0-beyond-bf))/bf)
    dy = df*wf*smootherstep(tf)*keepf+db*wb*smootherstep(tb)*keepb
    yc = spec.get('yCut')                               # [full, zero]: nothing behind y zero moves (the tails and their
    if yc:                                              # root; the back never reaches y .056)
        dy = dy*smootherstep((yc[1]-Y)/(yc[1]-yc[0]))
    zb = spec.get('zLimit')
    if zb:
        dy = dy*band(Z, *zb)
    if sel is not None:
        dy = np.where(sel, dy, 0.0)
    rec = {'zs': zs.round(4).tolist(), 'frontBefore': yf.round(4).tolist(), 'backBefore': yb.round(4).tolist(),
           'frontDelta': dl['front'].round(4).tolist(), 'backDelta': dl['back'].round(4).tolist()}
    return dy, rec


def region(V, spec):
    """Vertices the step may move: the trunk box (|x| under the arms' inner edge fade, z band), not the tails or arms."""
    R = spec['region']
    return (np.abs(V[:, 0]) < R['xMax']) & (V[:, 2] > R['z'][0]) & (V[:, 2] < R['z'][1]) & (V[:, 1] > R['y'][0]) & (V[:, 1] < R['y'][1])


def taubin(V0, V1, tris, sel, spec):
    """Taubin relax of the moved vertices only (weights by how far they moved), then the y of each kept at the warp's."""
    rx = spec.get('warpRelax')
    if not rx or not rx.get('passes'):
        return V1
    nv = len(V0)
    e = np.concatenate([tris[:, [0, 1]], tris[:, [1, 2]], tris[:, [2, 0]]])
    m = sel[e[:, 0]] | sel[e[:, 1]]
    e = np.unique(np.sort(e[m], 1), axis=0)
    e = np.concatenate([e, e[:, ::-1]])
    deg = np.bincount(e[:, 0], minlength=nv).astype(float)
    idx = np.where(sel)[0]
    w = np.clip(np.abs(V1[idx, 1]-V0[idx, 1])/rx['fullMove'], 0, 1)[:, None]
    P = V1.copy()
    for _ in range(int(rx['passes'])):
        for f in (rx['lambda'], rx['mu']):
            acc = np.zeros((nv, 3))
            np.add.at(acc, e[:, 0], P[e[:, 1]])
            avg = acc[idx]/np.maximum(deg[idx], 1)[:, None]
            P[idx] += f*w*(avg-P[idx])
    return P


def blur_field(S, lo, step, spec):
    """Second stage: masked Gaussian blurs of the warped skin's signed distance S (positive outside) on a grid. The warp is
    smooth in z, so it cannot follow the old lumbar crease where that crease bends across the back; a blur of the field
    takes the crease out wherever it runs, and the masks (ellipsoids on the back, faded) keep it off the sides, so the
    front-view widths stay. Returns the field F and the mask weight w (F = S where w is 0)."""
    from neck_v1_field import gaussian_blur3, grid_coords
    X, Y, Z = grid_coords(lo, step, S.shape)
    F = S
    W = np.zeros_like(S)
    for bl in spec.get('blurs', []):
        Fb = gaussian_blur3(F, bl['sigma']/step)
        s = np.array(bl['s'], float)
        wb = np.zeros_like(S)
        for side in ((1, -1) if bl.get('mirror') else (1,)):      # mirror: the same mask at -x as well
            c = np.array(bl['c'], float)*np.array([side, 1, 1])
            e = np.sqrt(((X-c[0])/s[0])**2+((Y-c[1])/s[1])**2+((Z-c[2])/s[2])**2)
            wb = np.maximum(wb, smootherstep((bl['fade'][1]-e)/(bl['fade'][1]-bl['fade'][0])))
        yc = spec.get('yCut')
        if yc:
            wb = wb*smootherstep((yc[1]-Y)/(yc[1]-yc[0]))
        F = F+wb*(Fb-F)
        W = np.maximum(W, wb)
    return F, W
