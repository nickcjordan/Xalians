"""Akinza eyelids: lid geometry for a lid state, numpy only (Blender's Python and the checks both import it).

The lids are separate objects; they add nothing to the skin. Each eye gets an upper and a lower lid sheet that slide over
the eye globe in the eye's own angle frame (eyelids_maps.py: yaw theta toward the outer corner, pitch phi up, both from the
globe's centre), plus short lid fur, and the eye's dark ribbon (the lid margin line of the fur of record) rides on each lid's
margin. Rest space is the surface's world units (the figure 1.86 tall); clip_frames.py carries every head part to its pose
with the head bone, and so does eyelid_frames.py with these.

Controls per eye: `close` 0 (open, as the approved build) to 1 (closed) and `squint` 0 to 1. The upper margin travels
s_u = 1-(1-close)(1-SQUINT_UPPER*squint) of the way from its tucked open place to the closed line, the lower
s_l = 1-(1-close^2)(1-SQUINT_LOWER*squint) (the lower lid joins late: the upper lid does most of a blink's travel).

Open (close = squint = 0): every lid sheet lies under the skin of the socket rim (tucked tuck_deg past the rim, and the
sheet under the skin or inside the globe wherever skin covers the globe: the tucked field `loff`), the lid fur has zero length
and zero radius, the ribbon is the original mesh untouched, the fur of record keeps its radii and the catch light shows:
`state_geometry` returns `open=True` for that eye.

Moving (by lift_at of its travel), a lid rises to the lifted field `lfield`: over the globe inside the opening, and over the
bare skin round the opening (the zone the face fur does not reach, which the open ribbon partly covers) lift_delta above it,
diving under the skin short of the first face-fur roots. So the lid unfolds over the bare band instead of leaving it bald
when the ribbon slides off it. Its fur copies the shape of the face strand next to it (turned toward the margin) and
shows where the lid does (`show0` tucked, `show1` lifted).

Built by eyelids_build.py into <lids dir>/lids.npz and lids.json (the levers below are recorded there).
"""
import json
from pathlib import Path

import numpy as np

SQUINT_UPPER = 0.86       # squint alone: the upper lid's share of its travel to the closed line (about a third left open)
SQUINT_LOWER = 0.32       # and the lower lid's
EYES = ('eye1', 'eye-1')  # eye1 is the creature's left (+X, the near side in the side view)


def smooth(x):
    x = np.clip(x, 0., 1.)
    return x*x*(3-2*x)


class Grid:
    """Bilinear lookup on the maps' regular theta x phi grid (degrees)."""

    def __init__(self, th, ph):
        self.th, self.ph = th, ph
        self.t0, self.p0 = float(th[0]), float(ph[0])
        self.dt, self.dp = float(th[1]-th[0]), float(ph[1]-ph[0])

    def __call__(self, F, t, p):
        x = np.clip((np.asarray(t, float)-self.t0)/self.dt, 0, len(self.th)-1.000001)
        y = np.clip((np.asarray(p, float)-self.p0)/self.dp, 0, len(self.ph)-1.000001)
        i, j = np.floor(y).astype(int), np.floor(x).astype(int)
        fy, fx = y-i, x-j
        return (F[i, j]*(1-fx)*(1-fy)+F[i, j+1]*fx*(1-fy)+F[i+1, j]*(1-fx)*fy+F[i+1, j+1]*fx*fy)


def interp1(xs, ys, x):
    return np.interp(np.asarray(x, float), xs, ys)


class Eye:
    def __init__(self, Z, key, L):
        g = lambda n: Z[key+'__'+n]
        self.key = key
        self.c, self.f, self.up, self.lat = g('frame')
        self.grid = Grid(Z['theta'], Z['phi'])
        self.rg, self.loff, self.rvis, self.lfield = g('rg'), g('loff'), g('rvis'), g('lfield')
        self.furU, self.furL = g('furU'), g('furL')
        self.show0, self.show1 = g('show0'), g('show1')
        self.cth, self.rimU, self.rimL, self.close = g('cth'), g('rimU'), g('rimL'), g('closeline')
        self.thm, self.thl = float(g('corners')[0]), float(g('corners')[1])
        self.lid_th = g('lid_theta')
        self.L = L
        self.fur = {k: g('fur_'+k) for k in ('lid', 'theta', 'a', 'len', 'gamma', 'jit')}
        self.fur_prof = g('fur_profile')
        self.fur_prof3 = g('fur_prof3')
        self.band_prof = g('fur_bandprof') if key+'__fur_bandprof' in Z.files else np.zeros((0, 9, 3))
        self.band_first = int(np.flatnonzero(np.abs(self.fur['lid']) == 2)[0]) if (np.abs(self.fur['lid']) == 2).any() else 0
        self.rib = dict(rest=g('rib_rest'), th=g('rib_th'), ph=g('rib_ph'), h=g('rib_h'), cls=g('rib_cls'), ph0=g('rib_ph0'),
                        th0=g('rib_th0'))
        self.capdata = dict(idx=g('caps_idx'), th=g('caps_th'), ph=g('caps_ph'), r_now=g('caps_r'), r_full=g('caps_rfull'))
        self.catch = g('catch')
        self.band = (g('band_theta'), g('band_upper'), g('band_lower'))

    # ---------------------------------------------------------------- frame
    def dirs(self, t, p):
        t, p = np.radians(t), np.radians(p)
        return (np.cos(p)[..., None]*(np.cos(t)[..., None]*self.f+np.sin(t)[..., None]*self.lat)+np.sin(p)[..., None]*self.up)

    def point(self, t, p, off):
        """Rest-space points at (theta, phi) off (surface units) outside the globe surface."""
        r = self.grid(self.rg, t, p)+off
        return self.c+self.dirs(t, p)*r[..., None]

    def angles(self, X):
        D = np.atleast_2d(X)-self.c
        a, b, u = D@self.f, D@self.lat, D@self.up
        return np.degrees(np.arctan2(b, a)), np.degrees(np.arctan2(u, np.hypot(a, b))), np.linalg.norm(D, axis=1)

    # ---------------------------------------------------------------- margins
    def curves(self, t):
        """Upper rim, lower rim and closed line at theta (outside the corners they all sit at the corner's height)."""
        return interp1(self.cth, self.rimU, t), interp1(self.cth, self.rimL, t), interp1(self.cth, self.close, t)

    def margins(self, t, close, squint):
        L = self.L
        su = 1-(1-close)*(1-SQUINT_UPPER*squint)
        sl = 1-(1-close*close)*(1-SQUINT_LOWER*squint)
        rU, rL, cl = self.curves(t)
        u = np.clip((np.asarray(t, float)-self.thm)/(self.thl-self.thm), 0, 1)
        bump = np.sin(np.pi*u)
        half = L['closed_half_gap_deg']
        pu = (rU+L['tuck_deg'])*(1-su)+(cl+half)*su
        pl = (rL-L['tuck_deg'])*(1-sl)+(cl-half)*sl
        # squint: the inner half of the upper lid pressed lower (the brow's pull), the lower lid pushed up by the cheek;
        # both fade out toward a full close
        k = squint*(1-close)
        pu = pu-k*L['squint_tilt_deg']*bump*(1-u)
        pl = pl+k*L['squint_cheek_deg']*bump
        mid = (pu+pl)/2
        cross = pu < pl
        pu, pl = np.where(cross, mid, pu), np.where(cross, mid, pl)
        return pu, pl, su, sl

    # ---------------------------------------------------------------- lid sheets
    def lam(self, s):
        """How far a lid has risen from its tucked field to its lifted one (0 open; 1 from LIFT_AT of its travel on)."""
        return smooth(np.asarray(s, float)/self.L['lift_at'])

    def field(self, t, p, lam):
        """The lid's height over the globe: the tucked field (under the skin, as when open) blended with the lifted one
        (over the bare skin between the rim and the face fur, then diving under the skin where the fur starts)."""
        a = self.grid(self.loff, t, p)
        if np.all(np.asarray(lam) == 0):
            return a
        return a+np.asarray(lam)*(self.grid(self.lfield, t, p)-a)

    def furlines(self, t):
        return interp1(self.cth, self.furU, t), interp1(self.cth, self.furL, t)

    def lid_sheet(self, which, t, close, squint):
        """Vertices (columns x rows x 3) of one lid sheet: rows from the margin's rolled lip to the far edge under the skin."""
        L = self.L
        pu, pl, su, sl = self.margins(t, close, squint)
        rU, rL, _ = self.curves(t)
        fU, fL = self.furlines(t)
        nr, roll = L['rows'], L['roll_rows']
        w = L['roll_deg']
        if which == 'upper':
            pm, far, sgn, lam = pu, np.minimum(np.maximum(fU, rU+L['tuck_deg'])+L['far_deg'], L['far_cap_deg']), 1., self.lam(su)
        else:
            pm, far, sgn, lam = pl, np.maximum(np.minimum(fL, rL-L['tuck_deg'])-L['far_deg'], -L['far_cap_deg']), -1., self.lam(sl)
        T = np.repeat(t[:, None], roll+nr, 1)
        P = np.empty_like(T)
        O = np.empty_like(T)
        m_off = self.field(t, pm, lam)
        # the lip: a quarter round from the margin down to the globe surface (just inside it at the last row)
        for k in range(roll):
            psi = (roll-k)/roll*np.pi/2               # k = 0 is the innermost lip row
            P[:, k] = pm-sgn*w*np.sin(psi)
            O[:, k] = m_off*np.cos(psi)-(L['seal_mm']/1000 if k == 0 else 0.)
        for k in range(nr):
            s = k/(nr-1)
            p = pm+(far-pm)*s
            P[:, roll+k] = p
            O[:, roll+k] = self.field(t, p, lam)
        if which == 'upper' and squint > 0:
            a = P[:, roll:]-pm[:, None]
            fold = L['fold_mm']/1000*squint*(1-close)*np.exp(-0.5*((a-L['fold_at_deg'])/L['fold_width_deg'])**2)
            inside = P[:, roll:] < rU[:, None]-0.5
            O[:, roll:] += fold*inside
        return self.point(T, P, O)

    def outer_radius(self, t, p, close, squint):
        """The outermost lid or globe radius at (theta, phi), with each lid's rolled lip (for the lid fur and the ribbon)."""
        pu, pl, su, sl = self.margins(t, close, squint)
        w = self.L['roll_deg']
        lu, ll = self.lam(su), self.lam(sl)
        off = np.where(p >= pu, self.field(t, p, lu), np.where(p <= pl, self.field(t, p, ll), 0.))
        for pm, sgn, lam in ((pu, 1., lu), (pl, -1., ll)):
            x = sgn*(pm-p)                                       # degrees past the margin onto its lip
            lip = (x > 0) & (x < w)
            m_off = self.field(t, pm, lam)
            off = np.where(lip, np.maximum(off, m_off*np.sqrt(np.clip(1-(x/w)**2, 0, 1))), off)
        return self.grid(self.rg, t, p)+np.maximum(off, 0.)

    def surface_radius(self, t, p, close, squint):
        """The outermost surface at rest skin, globe or lid: the rest visible surface (skin where it lies over the globe)
        or a lid."""
        return np.maximum(self.grid(self.rvis, t, p), self.outer_radius(t, p, close, squint))

    # ---------------------------------------------------------------- fur on the lids, and on the band the ribbon leaves
    def lid_fur(self, close, squint):
        """Points (strands x 9 x 3) and radii (strands x 9): the lid fur (lid 1 upper, -1 lower) and the band fur (2, -2:
        face fur on the skin band under the ribbon's rest place, shown where the ribbon has slid off it)."""
        F = self.fur
        n = len(F['theta'])
        X = np.zeros((n, 9, 3))
        rad = np.zeros((n, 9))
        li = np.flatnonzero(np.abs(F['lid']) == 1)
        bi = np.flatnonzero(np.abs(F['lid']) == 2)
        if len(li):
            X[li], rad[li] = self._lid_strands(li, close, squint)
        if len(bi):
            X[bi], rad[bi] = self._band_strands(bi, close, squint)
        return X, rad

    def _band_strands(self, ix, close, squint):
        F = self.fur
        t0, p0 = F['theta'][ix], F['a'][ix]
        prof = self.band_prof[ix-self.band_first]                 # (n, 9, 3): dtheta, dphi, height over the surface
        T = t0[:, None]+prof[:, :, 0]
        P = p0[:, None]+prof[:, :, 1]
        R = self.surface_radius(T, P, close, squint)+prof[:, :, 2]
        X = self.c+self.dirs(T, P)*R[..., None]
        covered = self.over_ribbon_rest(t0, p0, close, squint)
        rad = np.where(covered[:, None], 0., self.fur_prof[None, :]*F['len'][ix, None]/self.L['fur_len_mm'])
        rad = np.where(self.over_ribbon(T, P, close, squint) | self.over_ribbon_rest(T, P, close, squint), 0., rad)
        return X, rad

    def _lid_strands(self, ix, close, squint):
        L, F = self.L, self.fur
        t = F['theta'][ix]
        a_ = F['a'][ix]
        lidv = F['lid'][ix]
        pu, pl, su, sl = self.margins(t, close, squint)
        rU, rL, _ = self.curves(t)
        up = lidv == 1
        pm = np.where(up, pu, pl)
        sgn = np.where(up, 1., -1.)
        p_root = pm+sgn*a_
        lam = np.where(up, self.lam(su), self.lam(sl))
        s0, s1 = self.grid(self.show0, t, p_root), self.grid(self.show1, t, p_root)
        g = s0+lam*(s1-s0)                                             # 0 under the skin, 1 where the lid shows
        # the root must also be on its own lid's side of the margin's travel (a root past the far edge has no sheet)
        g = g*np.where(up, p_root <= self.furlines(t)[0], p_root >= self.furlines(t)[1])
        g = g*(np.where(up, su, sl) > 0)                               # a lid that has not moved shows no fur
        band = np.where(up, self.band_top(t, close, squint, 'upper'), self.band_top(t, close, squint, 'lower'))
        g = g*(a_ > band)
        # the source face strand's own shape (eyelids_build: fur_prof3, in the surface frame at the root), scaled by how far
        # the strand has come out from under the rim
        prof = self.fur_prof3[ix]*g[:, None, None]
        t0r, p0r = np.radians(t), np.radians(p_root)
        n0 = self.dirs(t, p_root)
        et = -np.sin(t0r)[:, None]*self.f+np.cos(t0r)[:, None]*self.lat
        ep = -np.sin(p0r)[:, None]*(np.cos(t0r)[:, None]*self.f+np.sin(t0r)[:, None]*self.lat)+np.cos(p0r)[:, None]*self.up
        R0 = self.outer_radius(t, p_root, close, squint)-L['fur_sink_mm']/1000
        X = (self.c+n0*R0[:, None])[:, None, :]+prof[:, :, :1]*et[:, None, :]+prof[:, :, 1:2]*ep[:, None, :]+prof[:, :, 2:]*n0[:, None, :]
        T, P, Rr = self.angles(X.reshape(-1, 3))
        T, P, Rr = T.reshape(-1, 9), P.reshape(-1, 9), Rr.reshape(-1, 9)
        floor = self.outer_radius(T, P, close, squint)+L['fur_clear_mm']/1000
        Rr = np.where(np.arange(9)[None, :] == 0, Rr, np.maximum(Rr, floor))
        X = self.c+self.dirs(T, P)*Rr[..., None]
        rad = (self.fur_prof[None, :]*L['fur_radius_scale']*(g > 1e-4)[:, None])
        # thinned where a point lies over the moved ribbon band (as sparse_caps thinned the face fur over the ribbon)
        rad = np.where(self.over_ribbon(T, P, close, squint), 0., rad)
        return X, rad

    def band_factor(self, t, ext, s, which):
        """How much a ribbon band of angular width `ext` at theta widens at lid travel s: closing, each band grows to a
        minimum width (tapered to nothing at the corners), the upper one also by ribbon_close_widen_upper, so where the two
        meet on the lips the closed line is a dark stroke as heavy as the open eye's upper liner (it must read at 192 px)."""
        L = self.L
        u = np.clip((np.asarray(t, float)-self.thm)/(self.thl-self.thm), 0, 1)
        taper = np.sqrt(np.sin(np.pi*u))
        ext = np.maximum(ext, 1e-3)
        if which == 'upper':
            target = np.maximum(ext*(1+L['ribbon_close_widen_upper']*s), s*L['ribbon_close_upper_min_deg']*taper)
        else:
            target = np.maximum(ext, s*L['ribbon_close_lower_min_deg']*taper)
        return target/ext

    def band_top(self, t, close, squint, which):
        """Degrees from the margin to the top edge of the ribbon band riding on that lid."""
        tt, wu, wl = self.band
        _, _, su, sl = self.margins(t, close, squint)
        w = interp1(tt, wu if which == 'upper' else wl, t)
        s = su if which == 'upper' else sl
        return self.L['ribbon_m0_deg']+w*self.band_factor(t, w, s, which)

    def over_ribbon(self, T, P, close, squint):
        pu, pl, su, sl = self.margins(T, close, squint)
        bu = self.band_top(T, close, squint, 'upper')
        bl = self.band_top(T, close, squint, 'lower')
        inside = (T > self.thm) & (T < self.thl)
        return inside & (((P >= pu) & (P <= pu+bu+0.3)) | ((P <= pl) & (P >= pl-bl-0.3)))

    # ---------------------------------------------------------------- ribbon
    def ribbon(self, close, squint):
        R, L = self.rib, self.L
        pu, pl, su, sl = self.margins(R['th0'], close, squint)
        m0 = L['ribbon_m0_deg']
        cls = R['cls']
        dU = np.minimum(0., pu+m0-R['ph0'])
        dL = np.maximum(0., pl-m0-R['ph0'])
        d = np.where(cls == 1, dU, np.where(cls == -1, dL, 0.))
        ext = np.abs(R['ph']-R['ph0'][:, None]).max(1)
        w = np.where(cls == 1, self.band_factor(R['th0'], ext, su, 'upper'),
                     np.where(cls == -1, self.band_factor(R['th0'], ext, sl, 'lower'), 1.))
        moved = d != 0
        if not moved.any():
            return None
        ph = R['ph0'][:, None]+d[:, None]+(R['ph']-R['ph0'][:, None])*w[:, None]
        th = R['th']
        r = self.surface_radius(th, ph, close, squint)+R['h']
        X = self.c+self.dirs(th, ph)*r[..., None]
        X = np.where(moved[:, None, None], X, R['rest'])
        return X

    # ---------------------------------------------------------------- face fur under the ribbon's old place
    def caps(self, close, squint):
        C = self.capdata
        if len(C['idx']) == 0:
            return None
        over = self.over_ribbon_rest(C['th'], C['ph'], close, squint)
        return C['idx'], np.where(over, C['r_now'], C['r_full'])

    def over_ribbon_rest(self, th, ph, close, squint):
        """Whether face-fur points (theta, phi) still lie under the ribbon band where it is now (its moved footprint)."""
        pu, pl, su, sl = self.margins(th, close, squint)
        m0 = self.L['ribbon_m0_deg']
        bu = self.band_top(th, close, squint, 'upper')
        bl = self.band_top(th, close, squint, 'lower')
        rU, rL, _ = self.curves(th)
        lo_u = np.minimum(rU, pu+m0)
        lo_l = np.maximum(rL, pl-m0)
        pad = self.L['caps_pad_deg']
        upper = (ph >= lo_u-pad) & (ph <= lo_u+bu+pad)
        lower = (ph <= lo_l+pad) & (ph >= lo_l-bl-pad)
        return upper | lower | (th <= self.thm) | (th >= self.thl)

    def catch_visible(self, close, squint):
        t, p = self.catch
        pu, pl, _, _ = self.margins(np.array([t]), close, squint)
        return bool(pl[0]+0.5 < p < pu[0]-0.5)


class Lids:
    def __init__(self, lids_dir):
        d = Path(lids_dir)
        self.Z = np.load(d/'lids.npz')
        self.info = json.loads((d/'lids.json').read_text())
        self.L = self.info['levers']
        self.eyes = {k: Eye(self.Z, k, self.L) for k in EYES}
        self.faces = {w: self.Z['faces_'+w] for w in ('upper', 'lower')}
        self.fur_attr = {k[len('furattr__'):]: self.Z[k] for k in self.Z.files if k.startswith('furattr__')}

    def state_geometry(self, eye, close=0., squint=0.):
        E = self.eyes[eye]
        is_open = close == 0 and squint == 0
        t = E.lid_th
        out = dict(open=is_open, upper=E.lid_sheet('upper', t, close, squint).reshape(-1, 3),
                   lower=E.lid_sheet('lower', t, close, squint).reshape(-1, 3))
        X, rad = E.lid_fur(close, squint)
        out['fur'], out['fur_radius'] = X.reshape(-1, 3), rad.ravel()
        out['ribbon'] = None if is_open else E.ribbon(close, squint)
        out['caps'] = None if is_open else E.caps(close, squint)
        out['catch'] = True if is_open else E.catch_visible(close, squint)
        return out


STATES = {'open': dict(close=0., squint=0.), 'half': dict(close=0.5, squint=0.), 'squint': dict(close=0., squint=1.),
          'closed': dict(close=1., squint=0.)}


def parse_state(text):
    """'open' / 'half' / 'squint' / 'closed', or 'L=0.3,R=0.3,squint=0.5' (squint for both eyes; squint.L / squint.R each)."""
    if text in STATES:
        s = STATES[text]
        return {'eye1': dict(s), 'eye-1': dict(s)}
    out = {'eye1': dict(close=0., squint=0.), 'eye-1': dict(close=0., squint=0.)}
    for kv in text.split(','):
        k, v = kv.split('=')
        v = float(v)
        if k == 'L':
            out['eye1']['close'] = v
        elif k == 'R':
            out['eye-1']['close'] = v
        elif k == 'squint':
            out['eye1']['squint'] = out['eye-1']['squint'] = v
        elif k == 'squint.L':
            out['eye1']['squint'] = v
        elif k == 'squint.R':
            out['eye-1']['squint'] = v
        else:
            raise ValueError(k)
    return out
