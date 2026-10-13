"""Akinza body B v1 field: the slimmer and softer trunk, shoulders, arms and legs (pure numpy, no Blender).

Body variant B of the 2026-10-12 previews (art/species-construction/previews/feet_body/deform_body.py, approved by Nick on
2026-10-13 as "your recommendations"), with the legs at variant A's amount (-5 percent) to keep the fuller, strong hind legs.
The body is modelled as it would be shaved: the bare widths sit inside the sheet's furred outline by the fur margin.

Everything is a function of position, never of a vertex index, so the step re-applies on a later base (the tails are being
rebuilt). Three parts, each slimmed toward its own axis with spatially smooth weights:
  trunk  scaled toward its vertical centre line, width (x) and depth (y) separately, by height;
  arms   scaled toward the arm's own axis and moved inward by the trunk's shoulder narrowing, so the cap stays over the arm;
         below the wrist the forepaw rides rigidly (its shape and claws unchanged, only shifted);
  legs   scaled toward each leg's own axis (stance and hind paws unchanged).
The outer top of each shoulder is lowered (sloped shoulders), then a masked Taubin smoothing (volume keeping) softens the
muscle forms over the changed region and a shrinking Laplacian on the shoulder cap only melts the deltoid knob.

Held, by region:
  head, face, ears and neck above its base: weight 0 above z headFade[1], faded from headFade[0];
  tails: every vertex behind the tail cut (y above cut(z) inside the tail band) is a tail vertex and does not move; every other
         vertex is faded in by its distance to the nearest tail vertex (tailFade), so the tail roots and whatever mesh the
         tails step builds keep their place whatever their vertex order;
  hind paws below the ankle and the forepaw shapes below the wrist.
"""
import numpy as np


def smooth(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


def profile(z, zt, vals, sigma=0.06):
    """Reduction by height: the control values joined linearly, then Gaussian smoothed so no height has a kink."""
    zt = np.asarray(zt, float)
    vals = np.asarray(vals, float)
    zs = np.arange(-0.80, 0.60, 0.005)
    f = np.interp(zs, zt[::-1], vals[::-1])
    k = np.exp(-0.5*(np.arange(-40, 41)*0.005/sigma)**2)
    k /= k.sum()
    f = np.convolve(np.pad(f, 40, mode='edge'), k, 'valid')
    return np.interp(z, zs, f)


def tail_vertices(v, spec):
    """Tail vertices by region: behind the cut line inside the tail band. Returns a boolean mask."""
    T = spec['tails']
    x, y, z = v[:, 0], v[:, 1], v[:, 2]
    cut = np.interp(z, T['cutZ'], T['cutY'])
    return (y > cut) & (z > T['band'][0]) & (z < T['band'][1])


def tail_keep(dist, spec):
    """Weight 0 on and next to the tails, 1 beyond tailFade[1] from the nearest tail vertex."""
    d0, d1 = spec['tails']['fade']
    return smooth((dist-d0)/(d1-d0))


def neighbour_mean_op(tris, n):
    """Returns f(v) = mean of each vertex's edge neighbours (uniform Laplacian), with np.bincount, no scipy."""
    e = np.concatenate([tris[:, [0, 1]], tris[:, [1, 2]], tris[:, [2, 0]]])
    e = np.sort(e, axis=1)
    e = np.unique(e, axis=0)
    a = np.concatenate([e[:, 0], e[:, 1]])
    b = np.concatenate([e[:, 1], e[:, 0]])
    deg = np.bincount(a, minlength=n).astype(np.float64)
    deg[deg == 0] = 1

    def mean(v, active=None):
        if active is None:
            out = np.empty_like(v)
            for c in range(3):
                out[:, c] = np.bincount(a, weights=v[b, c], minlength=n)/deg
            return out
        aa, bb, dd = active
        out = v.copy()
        for c in range(3):
            out[:, c] = np.bincount(aa, weights=v[bb, c], minlength=n)
        out[dd > 0] /= dd[dd > 0, None]
        return out

    def restrict(sel):
        """Only edges whose first vertex is in sel (the vertices that move)."""
        k = sel[a]
        return a[k], b[k], np.bincount(a[k], minlength=n).astype(np.float64)
    return mean, restrict


def compute(v0, tris, dist_to_tail, spec, fore_claws=None, log=print):
    """Returns (v, parts) with v the new skin coordinates; parts holds the masks and records."""
    B = spec['body']
    x, y, z = v0[:, 0], v0[:, 1], v0[:, 2]
    ax = np.abs(x)
    side = np.where(x >= 0, 1.0, -1.0)
    n = len(v0)

    # --- masks ------------------------------------------------------------------------------------------------
    h0, h1 = spec['headFade']
    head = 1-smooth((z-h0)/(h1-h0))
    is_tail = tail_vertices(v0, spec)
    tails = np.where(is_tail, 0.0, tail_keep(dist_to_tail, spec))
    A = spec['armMask']
    bz = np.interp(z, A['bzZ'], A['bzX'])
    tw = A['width']+A['widthShoulder']*smooth((z-A['shoulderZ'])/A['shoulderSpan'])
    arm_w = smooth((ax-bz+tw/2)/tw)*(1-smooth((z-A['topZ'][0])/(A['topZ'][1]-A['topZ'][0])))
    arm_w *= (z > A['bottomZ'])
    L = spec['legMask']
    leg_w = smooth((L['topZ']-z)/L['span'])
    trunk_w = np.clip(1-arm_w-leg_w, 0, 1)
    fw0, fw1 = spec['wristFade']
    forepaw = smooth((z-fw0)/(fw1-fw0))       # 1 above the wrist, 0 in the paw
    an0, an1 = spec['ankleFade']
    hindpaw = smooth((z-an0)/(an1-an0))       # 1 above the ankle, 0 in the foot
    keep = head*tails

    # --- axes (measured on this base, so a later base gets its own) -------------------------------------------------
    def sec_centres(sel, zs, tol=0.004):
        cx, cy = [], []
        for zz in zs:
            b = v0[sel & (np.abs(z-zz) < tol)]
            if len(b) < 20:
                cx.append(np.nan)
                cy.append(np.nan)
                continue
            cx.append(0.5*(b[:, 0].min()+b[:, 0].max()))
            cy.append(0.5*(b[:, 1].min()+b[:, 1].max()))
        cx, cy = np.array(cx), np.array(cy)
        ok = ~np.isnan(cx)
        cx = np.interp(zs, zs[ok], cx[ok])
        cy = np.interp(zs, zs[ok], cy[ok])
        k = np.ones(7)/7
        return (np.convolve(np.pad(cx, 3, mode='edge'), k, 'valid'), np.convolve(np.pad(cy, 3, mode='edge'), k, 'valid'))

    zt = np.arange(-0.36, 0.44, 0.01)
    tyc = sec_centres((ax < 0.08) & (y < 0.10) & ~is_tail, zt)[1]
    za = np.arange(-0.20, 0.23, 0.01)
    zl = np.arange(-0.86, -0.39, 0.01)
    arm_axis, leg_axis = {}, {}
    for s in (-1, 1):
        bza = np.interp(za, A['bzZ'], A['bzX'])
        sel = (side == s) & (y < 0.12) & ~is_tail
        ax_x, ax_y = [], []
        for zz, bb in zip(za, bza):
            b = v0[sel & (np.abs(z-zz) < 0.004) & (ax > bb)]
            ax_x.append(0.5*(b[:, 0].min()+b[:, 0].max()))
            ax_y.append(0.5*(b[:, 1].min()+b[:, 1].max()))
        arm_axis[s] = (np.array(ax_x), np.array(ax_y))
        leg_axis[s] = sec_centres(sel & (ax > 0.03), zl)

    # --- displacement ---------------------------------------------------------------------------------------------
    ZT = B['zt']
    rx = profile(z, ZT, B['tx'])
    ry = profile(z, ZT, B['ty'])
    yc = np.interp(z, zt, tyc)
    d_trunk = np.zeros_like(v0)
    d_trunk[:, 0] = -rx*x
    d_trunk[:, 1] = -ry*(y-yc)

    d_arm = np.zeros_like(v0)
    t_arm = {}
    for s in (-1, 1):
        sel = side == s
        axx = np.interp(z[sel], za, arm_axis[s][0])
        axy = np.interp(z[sel], za, arm_axis[s][1])
        joint_x = arm_axis[s][0][-1]
        shift = -float(profile(np.array([B['capZ']]), ZT, B['tx'])[0])*joint_x
        t_arm[s] = shift
        sc = B['arm']*(1+B['armCapGain']*smooth(z[sel]/0.2))*forepaw[sel]
        d_arm[sel, 0] = shift-sc*(x[sel]-axx)
        d_arm[sel, 1] = -sc*(y[sel]-axy)

    d_leg = np.zeros_like(v0)
    for s in (-1, 1):
        sel = side == s
        lx = np.interp(z[sel], zl, leg_axis[s][0])
        ly = np.interp(z[sel], zl, leg_axis[s][1])
        sc = B['leg']*hindpaw[sel]
        d_leg[sel, 0] = -sc*(x[sel]-lx)
        d_leg[sel, 1] = -sc*(y[sel]-ly)

    D0 = spec['drop']
    g = np.exp(-((ax-D0['x'])/D0['sigmaX'])**2)*smooth((z-D0['z0'])/D0['span'])
    d_trunk[:, 2] -= B['drop']*g
    d_arm[:, 2] -= B['drop']*g
    D = (trunk_w[:, None]*d_trunk+arm_w[:, None]*d_arm+leg_w[:, None]*d_leg)*keep[:, None]
    v = v0+D
    log(f'body warp: max {np.linalg.norm(D, axis=1).max():.4f}, arm shift {t_arm[1]:.4f} / {t_arm[-1]:.4f}')

    # --- softening ------------------------------------------------------------------------------------------------
    S = spec['smooth']
    soft = keep*np.where(arm_w > 0.5, forepaw, 1.0)*hindpaw
    soft = soft*(1-smooth((z-S['neckZ'][0])/(S['neckZ'][1]-S['neckZ'][0])))
    capw = S['capWeight']*keep*np.exp(-((ax-S['capX'])/S['capSigma'])**2)*np.exp(-((z-S['capZ'])/S['capSigma'])**2)
    capw[capw < 1e-6] = 0
    soft[soft < 1e-6] = 0
    mean, restrict = neighbour_mean_op(tris, n)
    act = restrict(soft > 0)
    w = soft[:, None]
    for i in range(S['taubinPasses']):
        v = v+S['lambda']*w*(mean(v, act)-v)
        v = v+S['mu']*w*(mean(v, act)-v)
        if i % 100 == 99:
            log(f'taubin {i+1}')
    act = restrict(capw > 0)
    cw = capw[:, None]
    for _ in range(S['capPasses']):
        v = v+cw*(mean(v, act)-v)

    moved_region = (keep > 0) & ((trunk_w+arm_w+leg_w) > 0)
    claws = {}
    if fore_claws:
        for name, c in fore_claws.items():
            s = 1 if c[:, 0].mean() > 0 else -1
            cc = c.copy()
            cc[:, 0] += t_arm[s]
            claws[name] = cc
    parts = {'keep': keep, 'soft': soft, 'capw': capw, 'isTail': is_tail, 'arm': arm_w, 'leg': leg_w, 'trunk': trunk_w,
             'forepaw': forepaw, 'hindpaw': hindpaw, 'movedRegion': moved_region, 'armShift': {'+x': t_arm[1], '-x': t_arm[-1]}}
    return v, claws, parts
