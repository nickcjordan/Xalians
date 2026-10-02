"""The ear fan front as a volume of coat clumps, in field space (R03, loop v3 round 18). numpy only.

Used by author_fan_clumps_field.py --part front (Blender, OpenVDB) and by the scratch viewers in loop/r03_fieldview.py. Everything
works on a dense crop of the head skin's level set around one wing (negative inside, narrow band clamped at +-BAND) and returns
the edited crop. Implements specs/R03.md sections 2 and 3:

  1. Strip: the old fan in front of its own mid-surface M (mean of the front and rear faces, blurred) is cleared inside the fan zone.
  2. Core: a slab inside the sheet's closed front outline inset by --core-inset, from the coat plan front plus --core-depth
     to the old rear face minus --core-back, smooth-unioned back so the clumps have a body to grow from.
  3. Clumps: layer 1 (secondaries and drape) and layer 2 (primaries) are tapered rounded superellipse sections swept along a Bezier
     guide from the cup rim into the envelope, unioned per layer and then with the core.
  4. Cup: everything in front of the cup floor inside the cup polygon is carved (filleted rim); the floor yaws outward.
  5. Tuft: layer 3 pale clumps on the cup floor. Their field is returned so the caller can paint the faces near it pale.

Frames. Head-local (x, y, z) is what the crop is indexed in: x_h = S (x_fit - CX), y_h = S df + DF0, z_h = Z0 - S y_fit, S = 3.721,
with the fit frame of loop_tools.canonical (x across, positive to the viewer's right in the front view; y down from the crown) and
df the depth in figure heights (front negative). u = |x_h| / S is the distance from the head's own center line.
"""
import numpy as np

S = 3.721
CX = .0046
Z0 = .537
DF0 = .04
BAND = .03

CUPS = {
    'L': [(.107, .066), (.120, .062), (.153, .053), (.192, .041), (.206, .043), (.201, .071), (.180, .097), (.162, .111),
          (.148, .134), (.132, .147), (.111, .170), (.107, .168)],
    'R': [(-.093, .087), (-.106, .084), (-.140, .070), (-.172, .061), (-.179, .063), (-.178, .090), (-.166, .113), (-.154, .130),
          (-.137, .146), (-.100, .171), (-.093, .166)],
}

DEFAULTS = {
    'voxel': .0025,
    'strip_u': [.085, .100],            # |u| from which the old front is stripped: above y .045, and below it
    'strip_y_blend': [.035, .055],      # the strip u switches from the first to the second over these rows
    'strip_ramp': .008,                 # width of the strip's edge in u (figure heights)
    'strip_bottom': .195,               # no strip below this row
    'strip_bias': 0.,                   # the strip cuts this much (figure heights) behind the mid-surface
    'mid_blur': .010,                   # box blur (figure heights) of the mid-surface
    'core_inset': .006,                 # core outline inset from the closed sheet outline (figure heights)
    'core_depth': .012,                 # core front lies this far behind the coat plan front
    'core_valley': 0.,                  # the core front drops back this much (figure heights) away from the clumps
    'valley_reach': .015,
    'core_back': .012,                  # core rear lies this far in front of the old rear face
    'core_blend': .006,
    'layer_blend': [.004, .004, .003],  # within layer 1, within layer 2, layer 2 onto layer 1 (figure heights)
    's_length': 1.0,                    # secondaries (S) are this fraction of their table length (their tips then hide behind the primaries)
    's_back': 0.,                       # secondaries (S) lie this much further back than their table front (figure heights)
    'skull_ramp': 0.,                   # the cup carve runs this far into the skull side and meets the old front surface
    'section_p': 2.2,
    'blur': 1,                          # box blur radius (voxels) of each clump field, one pass
    'samples': 40,
    'tip_half_width': .002,             # floor of the half width and half thickness near a tip (figure heights)
    'tip_half_thick': .0012,
    'rear_margin': .004,
    'camber': .016,
    'width_scale': 1.0,
    'lower_scale': [1., 1.],            # width and thickness scale of the small lower locks (tip row .17 or lower), which are pins at table size
    'thick_taper_scale': 1.0,           # multiplies the table's thickness fall exponent (.8 taper) when taper_scale is changed
    'taper_scale': 1.0,                 # multiplies the table's taper exponents (below 1: fuller, blunter leaf points)
    'thick_scale': 1.0,
    'length_scale': 1.0,
    'top_lift': 0.,                     # tips of the top-edge clumps (tip row under .02) stand this much higher (figure heights); the ceiling still clips them
    'pull_from_y': .0,                  # length_scale applies only to clumps whose tip row is at least this (the table pushes the lower edge tips out)
    'root_cap': .02,                    # how far a clump is carried behind its root (figure heights)
    'cup_shift': 0.,
    'cup_fillet': .005,
    'floor_slope': .70,
    'floor_start': -.016,
    'floor_max': .036,
    'floor_bowl': .008,
    'tuft_blend': .004,
    'tuft_floor_blend': .002,
    'tuft_tip_half_width': None,        # tuft clumps use this tip floor (figure heights) instead of tip_half_width; None = same
    'tuft_scale': 1.0,
    'tuft_width_scale': 1.0,
    'ceiling': None,                    # head-local z above which nothing stands (the baseline skin top)
    'skip': '',
    'rear_clip': None,                  # None = off; else new clump and tuft material is cut off this far behind the old rear face (figure heights; negative = in front of it)
    'cups': None,                       # {'L': [(x, y), ...], 'R': [...]} cup polygons in the fit frame (None = CUPS above)
}


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


def smin(a, b, k):
    h = np.clip(.5+.5*(b-a)/k, 0, 1)
    return b*(1-h)+a*h-k*h*(1-h)


def smax(a, b, k):
    return -smin(-a, -b, k)


def box(a, r, axes=None):
    """Mean over a (2r+1) window along each axis (edge padded); float32."""
    axes = range(a.ndim) if axes is None else axes
    for ax in axes:
        n = a.shape[ax]
        pad = [(r+1, r) if i == ax else (0, 0) for i in range(a.ndim)]
        c = np.cumsum(np.pad(a, pad, mode='edge'), axis=ax, dtype=np.float64)
        a = ((np.take(c, np.arange(2*r+1, n+2*r+1), axis=ax)-np.take(c, np.arange(0, n), axis=ax))/(2*r+1)).astype(np.float32)
    return a


def blur_masked(val, valid, r, passes=2):
    num = np.where(valid, val, 0.).astype(np.float64)
    den = valid.astype(np.float64)
    for _ in range(passes):
        for ax in (0, 1):
            n = num.shape[ax]
            outs = []
            for a in (num, den):
                c = np.cumsum(np.pad(a, [(r+1, r) if i == ax else (0, 0) for i in range(2)], mode='edge'), axis=ax)
                outs.append(np.take(c, np.arange(2*r+1, n+2*r+1), axis=ax)-np.take(c, np.arange(0, n), axis=ax))
            num, den = outs
    return np.where(den > 1e-6, num/np.maximum(den, 1e-6), np.nan)


def fill_nan(a, passes=400):
    """Fill NaNs by repeatedly averaging the valid 4-neighbours."""
    a = a.copy()
    for _ in range(passes):
        bad = np.isnan(a)
        if not bad.any():
            break
        p = np.pad(a, 1, mode='constant', constant_values=np.nan)
        nb = np.stack([p[:-2, 1:-1], p[2:, 1:-1], p[1:-1, :-2], p[1:-1, 2:]])
        cnt = (~np.isnan(nb)).sum(axis=0)
        tot = np.nansum(nb, axis=0)
        fill = bad & (cnt > 0)
        a[fill] = tot[fill]/cnt[fill]
    return a


def chamfer(mask, steps):
    """Distance (in voxels, 8-neighbour chamfer) from the True cells of mask, capped at steps."""
    d = np.where(mask, 0., float(steps)).astype(np.float32)
    for _ in range(steps):
        p = np.pad(d, 1, mode='edge')
        cand = np.minimum(np.minimum(p[:-2, 1:-1], p[2:, 1:-1]), np.minimum(p[1:-1, :-2], p[1:-1, 2:]))+1.
        diag = np.minimum(np.minimum(p[:-2, :-2], p[:-2, 2:]), np.minimum(p[2:, :-2], p[2:, 2:]))+1.4142
        nd = np.minimum(d, np.minimum(cand, diag))
        if np.array_equal(nd, d):
            break
        d = nd
    return d


def sample_grid(arr, xf, yf, grid=500, outside=.5):
    """Bilinear sample of a fit-frame grid (column c is x = (c - grid/2)/grid, row r is y = r/grid)."""
    c = np.asarray(xf)*grid+grid/2
    r = np.asarray(yf)*grid
    c0 = np.floor(c).astype(int)
    r0 = np.floor(r).astype(int)
    fc, fr = c-c0, r-r0
    ok = (c0 >= 0) & (c0 < grid-1) & (r0 >= 0) & (r0 < grid-1)
    c0 = np.clip(c0, 0, grid-2)
    r0 = np.clip(r0, 0, grid-2)
    v = (arr[r0, c0]*(1-fc)*(1-fr)+arr[r0, c0+1]*fc*(1-fr)+arr[r0+1, c0]*(1-fc)*fr+arr[r0+1, c0+1]*fc*fr)
    return np.where(ok, v, outside)


def polygon_sdf(px, py, poly):
    """Signed distance (fit units, negative inside) of points to a closed polygon (list of (x, y))."""
    poly = np.array(poly, float)
    n = len(poly)
    d2 = np.full(px.shape, 1e9)
    inside = np.zeros(px.shape, bool)
    for i in range(n):
        ax, ay = poly[i]
        bx, by = poly[(i+1) % n]
        ex, ey = bx-ax, by-ay
        t = np.clip(((px-ax)*ex+(py-ay)*ey)/(ex*ex+ey*ey), 0, 1)
        d2 = np.minimum(d2, (px-ax-t*ex)**2+(py-ay-t*ey)**2)
        cond = ((ay > py) != (by > py)) & (px < (bx-ax)*(py-ay)/(by-ay+1e-30)+ax)
        inside ^= cond
    d = np.sqrt(d2)
    return np.where(inside, -d, d)


class Wing:
    """Voxel frame of one wing crop."""

    def __init__(self, field, lo, vs, side):
        self.F = field
        self.lo = np.array(lo)
        self.vs = vs
        self.side = side
        self.sg = 1. if side == 'L' else -1.
        nx, ny, nz = field.shape
        self.X = ((self.lo[0]+np.arange(nx))*vs).astype(np.float32)
        self.Y = ((self.lo[1]+np.arange(ny))*vs).astype(np.float32)
        self.Z = ((self.lo[2]+np.arange(nz))*vs).astype(np.float32)
        # per column (x, z): fit coordinates
        self.U = (np.abs(self.X)/S)[:, None]
        self.YF = ((Z0-self.Z)/S)[None, :]
        self.XF = (self.X/S+CX)[:, None]

    def fit_xy(self):
        return np.broadcast_arrays(self.XF, self.YF)


def surfaces(F, wing):
    """Front and rear faces of the skin per (x, z) column, head-local y, with sub-voxel crossings; NaN where empty."""
    inside = F < 0
    has = inside.any(axis=1)
    kf = inside.argmax(axis=1)
    kr = inside.shape[1]-1-inside[:, ::-1, :].argmax(axis=1)
    ix, iz = np.meshgrid(np.arange(F.shape[0]), np.arange(F.shape[2]), indexing='ij')
    ykf = np.clip(kf-1, 0, F.shape[1]-1)
    a, b = F[ix, ykf, iz], F[ix, kf, iz]
    tf = np.where(kf > 0, a/np.maximum(a-b, 1e-9), 0.)
    yf = wing.Y[kf]-(1-tf)*wing.vs
    ykr = np.clip(kr+1, 0, F.shape[1]-1)
    a, b = F[ix, kr, iz], F[ix, ykr, iz]
    tr = np.where(kr < F.shape[1]-1, -a/np.maximum(b-a, 1e-9), 0.)
    yr = wing.Y[kr]+tr*wing.vs
    return np.where(has, yf, np.nan), np.where(has, yr, np.nan)


def strip_u0(yf, p):
    """u from which the old front is stripped, per row (figure heights)."""
    a, b = p['strip_u']
    y0, y1 = p['strip_y_blend']
    return a+(b-a)*smoothstep((yf-y0)/(y1-y0))


def strip_weight(wing, p):
    ramp = p['strip_ramp']
    u0 = strip_u0(wing.YF, p)
    w = smoothstep((wing.U-u0+ramp/2)/ramp)*smoothstep((p['strip_bottom']+ramp-wing.YF)/ramp)
    return w.astype(np.float32)


def bezier_path(c, side, p, n):
    """Front-view guide of one clump as arrays of fit x, fit y (n samples by arc length)."""
    sg = 1. if side == 'L' else -1.
    x0, y0, _ = c['root']
    x1, y1, _ = c['tip']
    if y1 < .02:
        y1 = y1-p['top_lift']
    ls = (p['length_scale'] if c['tip'][1] >= p['pull_from_y'] else 1.)*(p['s_length'] if c['family'] == 'S' else 1.)
    if ls != 1.:
        x1, y1 = x0+(x1-x0)*ls, y0+(y1-y0)*ls
    # work in (outward, up): x' = sg (x - CX), y' = -y
    r = np.array([sg*(x0-CX), -y0])
    t = np.array([sg*(x1-CX), -y1])
    chord = t-r
    L = float(np.hypot(*chord))
    d = chord/L
    nl = np.array([-d[1], d[0]])
    ctrl = (r+t)/2-nl*(L/2)*np.tan(np.radians(c['curl']))
    s = np.linspace(0, 1, 200)[:, None]
    pts = (1-s)**2*r+2*(1-s)*s*ctrl+s**2*t
    seg = np.hypot(*np.diff(pts, axis=0).T)
    arc = np.r_[0, np.cumsum(seg)]
    tt = np.linspace(0, arc[-1], n)
    xs = np.interp(tt, arc, pts[:, 0])
    ys = np.interp(tt, arc, pts[:, 1])
    return sg*xs+CX, -ys, float(arc[-1])


def section_profiles(c, t, th_clamp, p):
    """Half width and half thickness along t (spec section 3), figure heights."""
    low = c['family'] != 'T' and c['tip'][1] >= .17
    wr, wm = c['widthRoot']*p['width_scale']*(p['lower_scale'][0] if low else 1.), c['widthMid']*p['width_scale']*(p['lower_scale'][0] if low else 1.)
    th = c['thick']*p['thick_scale']*(p['lower_scale'][1] if low else 1.)
    tp = c['taper']*p['taper_scale']
    rise = wr+(wm-wr)*smoothstep(t/.4)
    fall = wm*(np.clip(1-t, 0, 1)/.6)**tp
    w = np.where(t < .4, rise, fall)
    w = np.maximum(w, 2*p['tip_half_width'])
    thick = np.where(t < .4, th*(.75+.25*smoothstep(t/.4)), th*(np.clip(1-t, 0, 1)/.6)**(.8*c['taper']*p['thick_taper_scale']))
    thick = np.maximum(thick, 2*p['tip_half_thick'])
    if th_clamp is not None:
        thick = np.minimum(thick, np.maximum(th_clamp, 2*p['tip_half_thick']))
    return w/2, thick/2, thick


def clump_geometry(c, side, p, rear_df=None, n=None):
    """Axis samples (head-local) and profiles of one clump. rear_df(xf, yf) gives the rear face depth for the thickness clamp."""
    n = n or p['samples']
    xf, yf, L = bezier_path(c, side, p, n)
    t = np.linspace(0, 1, n)
    df_root, df_tip = c['root'][2], c['tip'][2]
    front = df_root+(df_tip-df_root)*t-p['camber']*t*(1-t)
    if c['family'] == 'S':
        front = front+p['s_back']
    clamp = None
    if rear_df is not None:
        clamp = rear_df(xf, yf)-front-p['rear_margin']
    hw, ht, thick = section_profiles(c, t, clamp, p)
    ax = np.stack([S*(xf-CX), S*(front+thick/2)+DF0, Z0-S*yf], axis=1)
    return {'t': t, 'xf': xf, 'yf': yf, 'front': front, 'hw': hw, 'ht': ht, 'thick': thick, 'axis': ax, 'L': L}


def clump_sdf(g, wing, p, norm_fn=None):
    """Approximate signed distance of one swept rounded clump, returned as (slices, array) over the wing crop."""
    ax = g['axis'].astype(np.float64)
    vs = wing.vs
    seg = np.linalg.norm(np.diff(ax, axis=0), axis=1)
    arc = np.r_[0, np.cumsum(seg)]
    Ls = float(arc[-1])
    tang = np.gradient(ax, axis=0)
    tang /= np.linalg.norm(tang, axis=1)[:, None]
    nrm = np.zeros_like(tang)
    for k in range(len(ax)):
        nv = np.array([0., 1., 0.])
        if norm_fn is not None:
            nv = norm_fn(g['xf'][k], g['yf'][k])
        nv = nv-(nv@tang[k])*tang[k]
        if np.linalg.norm(nv) < 1e-3:
            nv = np.array([0., 1., 0.])-tang[k][1]*tang[k]
        nrm[k] = nv/np.linalg.norm(nv)
    bin_ = np.cross(tang, nrm)
    hw = g['hw']*S
    ht = g['ht']*S
    reach = max(hw.max(), ht.max())+BAND+3*vs
    low = ax.min(axis=0)-reach
    high = ax.max(axis=0)+reach
    a = np.clip(np.floor(low/vs).astype(int)-wing.lo, 0, np.array(wing.F.shape)-1)
    z = np.clip(np.ceil(high/vs).astype(int)-wing.lo+1, 0, np.array(wing.F.shape))
    sl = tuple(slice(int(i), int(j)) for i, j in zip(a, z))
    if any(s.stop <= s.start for s in sl):
        return None
    xs, ys, zs = (np.arange(s.start, s.stop) for s in sl)
    X, Y, Z = np.meshgrid((wing.lo[0]+xs)*vs, (wing.lo[1]+ys)*vs, (wing.lo[2]+zs)*vs, indexing='ij')
    P = np.stack([X, Y, Z], axis=-1).reshape(-1, 3).astype(np.float32)
    del X, Y, Z
    best = np.full(len(P), 1e9, np.float32)
    idx = np.zeros(len(P), np.int32)
    for k in range(len(ax)):
        d2 = ((P-ax[k].astype(np.float32))**2).sum(axis=1)
        m = d2 < best
        best[m] = d2[m]
        idx[m] = k
    q = P-ax[idx].astype(np.float32)
    length = arc[idx]+(q*tang[idx]).sum(axis=1)
    aa = (q*bin_[idx]).sum(axis=1)
    cc = (q*nrm[idx]).sum(axis=1)
    tv = np.clip(length/Ls, 0, 1)
    tg = np.linspace(0, 1, len(ax))
    wh = np.interp(tv, tg, hw).astype(np.float32)
    hh = np.interp(tv, tg, ht).astype(np.float32)
    pe = p['section_p']
    e = ((np.abs(aa)/wh)**pe+(np.abs(cc)/hh)**pe)**(1./pe)
    tipr = max(p['tip_half_width'], .001)*S
    e = np.sqrt(e**2+(np.maximum(length-Ls, 0)/np.maximum(np.minimum(wh, hh), tipr))**2*.5
                +(np.maximum(-length, 0)/(p['root_cap']*S))**2)
    d = (e-1)*np.minimum(wh, hh)
    d = np.clip(d, -BAND, BAND).reshape(tuple(s.stop-s.start for s in sl)).astype(np.float32)
    if p['blur']:
        d = box(d, p['blur'])
    return sl, d


def floor_df(u, yf, sdf_cup, p):
    """Cup floor depth (figure heights, front negative): yawed outward, never beyond floor_max, bowled toward the middle."""
    base = np.minimum(p['floor_start']+p['floor_slope']*(u-.100), p['floor_max'])
    bowl = p['floor_bowl']*smoothstep(-sdf_cup/.025)
    return base+bowl


def build_wing(F, lo, vs, side, clumps, env, params=None, log=print):
    """Edit one wing crop. Returns (F_new, tuft_sdf or None, info)."""
    p = dict(DEFAULTS)
    p.update(params or {})
    skip = set(n.strip() for n in p['skip'].split(',') if n.strip())
    wing = Wing(F, lo, vs, side)
    sg = wing.sg
    F = F.copy()
    nx, ny, nz = F.shape
    XF, YF = wing.fit_xy()
    U = np.broadcast_to(wing.U, XF.shape)
    info = {}

    # --- surfaces of the old skin ---------------------------------------------------------------------------------------
    y_front0, y_rear0 = surfaces(F, wing)
    valid = ~np.isnan(y_front0)
    mid = (y_front0+y_rear0)/2
    r_mid = max(1, int(round(p['mid_blur']*S/vs)))
    mid = blur_masked(np.where(valid, mid, 0.), valid, r_mid, passes=2)
    rear_df_grid = (y_rear0-DF0)/S                                   # figure heights
    rear_fill = fill_nan(rear_df_grid)

    def rear_df(xf, yf):
        c = (np.asarray(xf)-CX)*S/vs-wing.lo[0]
        r = (Z0-S*np.asarray(yf))/vs-wing.lo[2]
        c0 = np.clip(np.round(c).astype(int), 0, nx-1)
        r0 = np.clip(np.round(r).astype(int), 0, nz-1)
        return rear_fill[c0, r0]

    # --- table of this side ----------------------------------------------------------------------------------------------
    mine = [c for c in clumps if c['side'] == side and c['name'] not in skip and c['name'][1:] not in skip]
    coat = [c for c in mine if c['family'] in 'PSD']
    tuft = [c for c in mine if c['family'] == 'T']

    # --- cup ------------------------------------------------------------------------------------------------------------------
    cup = [(x+(p['cup_shift']*sg), y) for x, y in (p['cups'] or CUPS)[side]]
    sdf_cup = polygon_sdf(XF, YF, cup).astype(np.float32)
    fl = floor_df(U, YF, sdf_cup, p).astype(np.float32)               # figure heights

    # --- plan front surface (coat fronts splatted per column, then filled) ------------------------------------------------
    geoms = []
    for c in sorted(coat, key=lambda c: c['layer']):
        geoms.append((c, clump_geometry(c, side, p, rear_df)))
    plan = np.full(XF.shape, np.inf, np.float32)
    for c, g in geoms:
        for k in range(len(g['t'])):
            cx = (g['axis'][k, 0]/vs)-wing.lo[0]
            cz = (g['axis'][k, 2]/vs)-wing.lo[2]
            rad = g['hw'][k]*S/vs
            i0, i1 = int(max(0, np.floor(cx-rad))), int(min(nx, np.ceil(cx+rad)+1))
            j0, j1 = int(max(0, np.floor(cz-rad))), int(min(nz, np.ceil(cz+rad)+1))
            if i1 <= i0 or j1 <= j0:
                continue
            ii, jj = np.meshgrid(np.arange(i0, i1), np.arange(j0, j1), indexing='ij')
            m = ((ii-cx)**2+(jj-cz)**2) <= rad*rad
            cur = plan[i0:i1, j0:j1]
            plan[i0:i1, j0:j1] = np.where(m, np.minimum(cur, g['front'][k]), cur)
    plan[np.isinf(plan)] = np.nan
    covered = ~np.isnan(plan)
    plan_f = fill_nan(plan)
    plan_f = box(plan_f, max(1, int(round(.008*S/vs))), axes=(0, 1)).astype(np.float32)
    info['planCover'] = float((~np.isnan(plan)).mean())

    # --- strip -----------------------------------------------------------------------------------------------------------------
    w = strip_weight(wing, p)
    w = np.where(np.isnan(mid), 0., w).astype(np.float32)
    mid_y = (np.where(np.isnan(mid), 0., mid)+p['strip_bias']*S).astype(np.float32)
    sl_m = (1/np.sqrt(1+np.gradient(mid_y, vs, axis=0)**2+np.gradient(mid_y, vs, axis=1)**2)).astype(np.float32)
    Y3 = wing.Y[None, :, None]
    for chunk in np.array_split(np.arange(nx), max(1, nx//40)):
        sl = F[chunk]
        g = (mid_y[chunk][:, None, :]-Y3)*sl_m[chunk][:, None, :]
        cut = np.maximum(sl, g)
        F[chunk] = sl+w[chunk][:, None, :]*(cut-sl)
    info['stripCells'] = int((w > .5).sum())

    # --- core ------------------------------------------------------------------------------------------------------------------
    sd_env = sample_grid(env['sdf_closed'], XF, YF, outside=.5)
    sd2 = np.maximum(sd_env+p['core_inset'], strip_u0(YF, p)-U-.004)
    sd2 = (sd2*S).astype(np.float32)
    inset_ok = (sd2 < 0) & (sdf_cup > 0)
    info['coatCover'] = float((covered & inset_ok).sum()/max(1, inset_ok.sum()))
    cup_w = smoothstep(-sdf_cup/.008)
    valley = 0.
    if p['core_valley'] > 0:
        dcov = chamfer(covered, int(round(p['valley_reach']*S/vs*1.5)))*vs/S
        valley = (p['core_valley']*smoothstep(dcov/p['valley_reach'])).astype(np.float32)
    front_core = np.where(sdf_cup < 0, (1-cup_w)*(plan_f+p['core_depth']+valley)+cup_w*(fl-.010), plan_f+p['core_depth']+valley)
    Yc_front = (front_core*S+DF0).astype(np.float32)
    Yc_rear = ((rear_fill-p['core_back'])*S+DF0).astype(np.float32)
    sb_f = (1/np.sqrt(1+np.gradient(Yc_front, vs, axis=0)**2+np.gradient(Yc_front, vs, axis=1)**2)).astype(np.float32)
    sb_r = (1/np.sqrt(1+np.gradient(Yc_rear, vs, axis=0)**2+np.gradient(Yc_rear, vs, axis=1)**2)).astype(np.float32)
    kc = p['core_blend']*S
    core_all = np.full(F.shape, BAND, np.float32)
    for chunk in np.array_split(np.arange(nx), max(1, nx//40)):
        g1 = (Yc_front[chunk][:, None, :]-Y3)*sb_f[chunk][:, None, :]
        g2 = (Y3-Yc_rear[chunk][:, None, :])*sb_r[chunk][:, None, :]
        core = np.maximum(np.maximum(sd2[chunk][:, None, :], g1), g2)
        no_rear = np.isnan(y_rear0[chunk])[:, None, :]
        core = np.where(no_rear, BAND, core)
        core_all[chunk] = np.clip(core, -BAND, BAND)
    F = np.minimum(smin(F, core_all, kc), BAND).astype(np.float32)
    del core_all

    # --- clumps ---------------------------------------------------------------------------------------------------------------
    k1, k2, k12 = (v*S for v in p['layer_blend'])
    L1 = np.full(F.shape, BAND, np.float32)
    L2 = np.full(F.shape, BAND, np.float32)
    def make_norm(grid):
        gx = np.gradient(grid, vs, axis=0)*S
        gz = np.gradient(grid, vs, axis=1)*S

        def norm_fn(xf, yf):
            c = int(np.clip(round((xf-CX)*S/vs-wing.lo[0]), 0, nx-1))
            r = int(np.clip(round((Z0-S*yf)/vs-wing.lo[2]), 0, nz-1))
            n = np.array([-gx[c, r], 1., -gz[c, r]])
            return n/np.linalg.norm(n)
        return norm_fn
    norm_fn = make_norm(plan_f)

    built = []
    for c, g in geoms:
        r = clump_sdf(g, wing, p, norm_fn)
        if r is None:
            continue
        sl, d = r
        tgt, k = (L1, k1) if c['layer'] == 1 else (L2, k2)
        cur = tgt[sl]
        tgt[sl] = np.where(cur >= BAND*.9, np.minimum(cur, d), smin(cur, d, k)).astype(np.float32)
        built.append({'name': c['name'], 'layer': c['layer'], 'length': round(g['L'], 4), 'thickTip': round(float(g['thick'][-2]), 4)})
    if p['rear_clip'] is not None:
        Yrc = ((rear_fill+p['rear_clip'])*S+DF0).astype(np.float32)
        slope_rc = (1/np.sqrt(1+np.gradient(Yrc, vs, axis=0)**2+np.gradient(Yrc, vs, axis=1)**2)).astype(np.float32)
        no_rc = np.isnan(y_rear0)[:, None, :]
        clip = lambda chunk: np.where(no_rc[chunk], -BAND, np.clip((Y3-Yrc[chunk][:, None, :])*slope_rc[chunk][:, None, :], -BAND, BAND))
        for chunk in np.array_split(np.arange(nx), max(1, nx//40)):
            c3 = clip(chunk)
            L1[chunk] = np.maximum(L1[chunk], c3)
            L2[chunk] = np.maximum(L2[chunk], c3)
    F = np.minimum(smin(F, L1, kc), BAND).astype(np.float32)
    del L1
    F = np.minimum(smin(F, L2, k12), BAND).astype(np.float32)
    del L2
    info['coat'] = built

    # --- cup carve ---------------------------------------------------------------------------------------------------------
    cut_df = fl.copy()
    carve_poly = cup
    if p['skull_ramp'] > 0:
        edge_u = min(abs(x-CX) for x, _ in cup)
        ramp = p['skull_ramp']
        carve_poly = [((x-sg*ramp) if abs(abs(x-CX)-edge_u) < .004 else x, y) for x, y in cup]
        t = smoothstep((edge_u-U)/ramp)
        front_old = fill_nan(np.where(np.isnan(y_front0), np.nan, (y_front0-DF0)/S))
        cut_df = np.where(U < edge_u, (1-t)*fl+t*front_old, fl).astype(np.float32)
    sdf_carve = polygon_sdf(XF, YF, carve_poly).astype(np.float32)
    cut_y = (cut_df*S+DF0).astype(np.float32)
    slope = (1/np.sqrt(1+np.gradient(cut_y, vs, axis=0)**2+np.gradient(cut_y, vs, axis=1)**2)).astype(np.float32)
    sdf_cup_h = (sdf_carve*S).astype(np.float32)
    kf = p['cup_fillet']*S
    for chunk in np.array_split(np.arange(nx), max(1, nx//40)):
        region = np.maximum(sdf_cup_h[chunk][:, None, :], (Y3-cut_y[chunk][:, None, :])*slope[chunk][:, None, :])
        F[chunk] = np.minimum(smax(F[chunk], -region, kf), BAND)
    info['cupFloorMean'] = float(fl[sdf_cup < 0].mean()) if (sdf_cup < 0).any() else None

    # --- tuft ---------------------------------------------------------------------------------------------------------------
    tuft_sdf = None
    if tuft:
        tuft_sdf = np.full(F.shape, BAND, np.float32)
        kt = p['tuft_blend']*S
        tgeoms = []
        for c in tuft:
            cc = dict(c)
            pt = dict(p, width_scale=p['width_scale']*p['tuft_width_scale'], thick_scale=p['thick_scale']*p['tuft_scale'])
            if p['tuft_tip_half_width'] is not None:
                pt['tip_half_width'] = p['tuft_tip_half_width']
                pt['tip_half_thick'] = min(p['tip_half_thick'], p['tuft_tip_half_width']*.6)
            tg = clump_geometry(cc, side, pt, None)
            tgeoms.append((c, tg))
            r = clump_sdf(tg, wing, pt, make_norm(fl))
            if r is None:
                continue
            sl, d = r
            cur = tuft_sdf[sl]
            tuft_sdf[sl] = np.where(cur >= BAND*.9, np.minimum(cur, d), smin(cur, d, kt)).astype(np.float32)
        if p['rear_clip'] is not None:
            for chunk in np.array_split(np.arange(nx), max(1, nx//40)):
                tuft_sdf[chunk] = np.maximum(tuft_sdf[chunk], clip(chunk))
        F = np.minimum(smin(F, tuft_sdf, p['tuft_floor_blend']*S), BAND).astype(np.float32)
        info['tuft'] = [c['name'] for c, _ in tgeoms]

    # --- ceiling ------------------------------------------------------------------------------------------------------------
    if p['ceiling'] is not None:
        F = np.maximum(F, np.clip(wing.Z[None, None, :]-p['ceiling'], -BAND, BAND)).astype(np.float32)
    return F, tuft_sdf, info
