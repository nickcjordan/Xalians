"""Akinza eyelids: lid geometry for a lid state, numpy only (Blender's Python and the checks both import it).

The lids are separate objects; they add nothing to the skin. Each eye gets an upper and a lower lid sheet that slide over
the eye globe in the eye's own angle frame (eyelids_maps.py: yaw theta toward the outer corner, pitch phi up, both from the
globe's centre), plus lid fur and a lash line, and the eye's dark ribbon (the lid margin line of the fur of record) rides on
each lid's margin. Rest space is the surface's world units (the figure 1.86 tall); clip_frames.py carries every head part to
its pose with the head bone, and so does eyelid_frames.py with these.

Controls per eye: `close` 0 (open, as the approved build) to 1 (closed), `squint` 0 to 1 and `wince` 0 to 1. The upper
margin travels s_u = 1-(1-close)(1-SQUINT_UPPER*squint)(1-wince) of the way from its tucked open place to its line, the lower
s_l = 1-(1-close^2)(1-SQUINT_LOWER*squint)(1-wince) (the lower lid joins a blink late: the upper lid does most of the travel).
The line is the closed line (sagging between the corners, a sleeping eye) blended by `wince` toward the wince line (arched
above the corner-to-corner line: the corners bent down, the lower lid pushed up by the cheek); a wince also raises tension
folds on both lids.

Open (close = squint = wince = 0): every lid sheet lies under the skin of the socket rim (tucked tuck_deg past the rim, and
the sheet under the skin or inside the globe wherever skin covers the globe: the tucked field `loff`), the lid fur and lashes
have zero length and zero radius, the ribbon is the original mesh untouched, the fur of record keeps its radii and the catch
light shows: `state_geometry` returns `open=True` for that eye.

Moving (by lift_at of its travel), a lid rises to the lifted field `lfield` (pass 2): one smooth surface over the globe in
the opening, over the bare skin round it, filling the socket groove at the rim, and diving gently under the skin past the
bare zone. Its fur copies the face fur of the ring round the bare zone (density, shape in the true surface frame, radii,
every attribute) and shows where the lid does (`show0` tucked, `show1` lifted).

Built by eyelids_build.py into <lids dir>/lids.npz and lids.json (the levers are recorded there).
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


def gauss(x, w):
    return np.exp(-0.5*(np.asarray(x, float)/w)**2)


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
        self.sdz = g('sdz')
        self.furU, self.furL = g('furU'), g('furL')
        has = lambda n: key+'__'+n in Z.files
        # fix pass 4: lid fur roots run on over the cross-fade band (rootU/rootL; before pass 4 they stopped at furU/furL)
        self.rootU, self.rootL = (g('rootU'), g('rootL')) if has('rootU') else (self.furU, self.furL)
        self.xfade = float(L.get('xfade_mm', 0.))
        self.fur_u = g('fur_u') if has('fur_u') else None
        self.fb = dict(sd=g('fb_sd'), side=g('fb_side'), v=g('fb_v'), pidx=g('fb_pidx'), pstrand=g('fb_pstrand')) if has('fb_sd') else None
        self.rib_ext = g('rib_ext') if has('rib_ext') else None
        self.flags = set()
        self.show0, self.show1 = g('show0'), g('show1')
        self.cth, self.rimU, self.rimL, self.close = g('cth'), g('rimU'), g('rimL'), g('closeline')
        self.wline = g('winceline')
        self.lowfar = g('lowfar') if key+'__lowfar' in Z.files else None
        self.thm, self.thl = float(g('corners')[0]), float(g('corners')[1])
        self.lid_th = g('lid_theta')
        self.L = L
        self.hold_lower = False      # cause test (fix pass 3): the lower lid held at its open place while the upper one moves
        self.fur = {k: g('fur_'+k) for k in ('lid', 'theta', 'a', 'src')}
        self.fur_prof3 = g('fur_prof3')
        self.fur_rad = g('fur_rad')
        self.rib = dict(rest=g('rib_rest'), th=g('rib_th'), ph=g('rib_ph'), h=g('rib_h'), cls=g('rib_cls'), ph0=g('rib_ph0'),
                        th0=g('rib_th0'))
        self.capdata = dict(idx=g('caps_idx'), th=g('caps_th'), ph=g('caps_ph'), r_now=g('caps_r'), r_full=g('caps_rfull'))
        self.catch = g('catch')
        self.band = (g('band_theta'), g('band_upper'), g('band_lower'))
        # fix pass 4: the bands' reach away from the eye (signed), for the lid fur cut, thinning and dark margin
        self.band_out = (g('band_upper_out'), g('band_lower_out')) if has('band_upper_out') else None

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

    def margins(self, t, close, squint, wince=0.):
        L = self.L
        su = 1-(1-close)*(1-SQUINT_UPPER*squint)*(1-wince)
        sl = 1-(1-close*close)*(1-SQUINT_LOWER*squint)*(1-wince)
        if self.hold_lower:
            sl = 0.*sl
        rU, rL, cl = self.curves(t)
        line = cl+(interp1(self.cth, self.wline, t)-cl)*wince
        u = np.clip((np.asarray(t, float)-self.thm)/(self.thl-self.thm), 0, 1)
        bump = np.sin(np.pi*u)
        half = L['closed_half_gap_deg']
        pu = (rU+L['tuck_deg'])*(1-su)+(line+half)*su
        pl = (rL-L['tuck_deg'])*(1-sl)+(line-half)*sl
        # squint: the inner half of the upper lid pressed lower (the brow's pull), the lower lid pushed up by the cheek;
        # both fade out toward a full close or a wince
        k = squint*(1-close)*(1-wince)
        pu = pu-k*L['squint_tilt_deg']*bump*(1-u)
        pl = pl+k*L['squint_cheek_deg']*bump*(not self.hold_lower)
        mid = (pu+pl)/2
        cross = pu < pl
        pu, pl = np.where(cross, mid, pu), np.where(cross, mid, pl)
        return pu, pl, su, sl

    # ---------------------------------------------------------------- lid sheets
    def lam(self, s):
        """How far a lid has risen from its tucked field to its lifted one (0 open; 1 from LIFT_AT of its travel on)."""
        return smooth(np.asarray(s, float)/self.L['lift_at'])

    def field(self, t, p, lam):
        """The lid's height over the globe: the tucked field (under the skin, as when open) blended with the lifted one."""
        a = self.grid(self.loff, t, p)
        if np.all(np.asarray(lam) == 0):
            return a
        return a+np.asarray(lam)*(self.grid(self.lfield, t, p)-a)

    def furlines(self, t):
        return interp1(self.cth, self.furU, t), interp1(self.cth, self.furL, t)

    def rootlines(self, t):
        return interp1(self.cth, self.rootU, t), interp1(self.cth, self.rootL, t)

    def lid_weight(self, sd):
        """Fix pass 4, the cross-fade: the lid fur's share of the fur at zone signed distance sd (1 inside the lid fur edge,
        -fur_out_mm, falling to 0 at -(fur_out_mm+xfade_mm)); the face fur rooted there keeps the rest."""
        if self.xfade <= 0:
            return np.ones(np.shape(sd))
        return smooth((np.asarray(sd, float)+self.L['fur_out_mm']+self.xfade)/self.xfade)

    def ribbon_cover(self, t, which):
        """Fix pass 4: 1 along the ribbon band riding this lid, falling to 0 over ribbon_end_fade_deg past its own ends (the
        lid fur cut and thinning under the band end there; pass 3 kept a 4-degree cut past the outer end of the closed line,
        where no ribbon is, and the bare lid sheet showed)."""
        if self.rib_ext is None or self.L.get('ribbon_end_fade_deg', 0) <= 0:
            return np.ones(np.shape(t))
        a, b = self.rib_ext[:2] if which == 'upper' else self.rib_ext[2:]
        w = self.L['ribbon_end_fade_deg']
        t = np.asarray(t, float)
        return smooth((t-a)/w+0.5)*smooth((b-t)/w+0.5)

    def fold_weight(self, t, p):
        """Folds only where the lid lies over the skin or the globe (not where it dives under the face)."""
        return smooth((self.grid(self.sdz, t, p)-0.5)/2.5)

    def folds(self, which, t, p, pm, close, squint, wince):
        """Extra height of a lid at (theta, phi) from its margin pm: the squint's tension fold on the upper lid (as pass 1)
        and the wince's folds, two on the upper lid and one on the lower (pressed skin bunching parallel to the slit)."""
        L = self.L
        t, p = np.asarray(t, float), np.asarray(p, float)
        if which == 'upper':
            a = p-pm
            rU = self.curves(t)[0]
            off = L['fold_mm']/1000*squint*(1-close)*(1-wince)*gauss(a-L['fold_at_deg'], L['fold_width_deg'])*(p < rU-0.5)
            if wince > 0:
                w = L['wince_fold_width_deg']
                off = off+wince/1000*(L['wince_fold_upper_mm']*gauss(a-L['wince_fold_upper_at_deg'], w)
                                      + L['wince_fold_upper2_mm']*gauss(a-L['wince_fold_upper2_at_deg'], w))*self.fold_weight(t, p)
        else:
            a = pm-p
            off = np.zeros(np.broadcast(a, t).shape)
            if wince > 0:
                off = wince/1000*L['wince_fold_lower_mm']*gauss(a-L['wince_fold_lower_at_deg'], L['wince_fold_width_deg'])*self.fold_weight(t, p)
        return off*(a > 0)

    def fold_shape(self, which, t, p, pm):
        """0 to 1 at the wince folds (for the fur bunching up along them)."""
        L, w = self.L, self.L['wince_fold_width_deg']
        if which == 'upper':
            a = p-pm
            return np.maximum(gauss(a-L['wince_fold_upper_at_deg'], w), gauss(a-L['wince_fold_upper2_at_deg'], w))
        return gauss((pm-p)-L['wince_fold_lower_at_deg'], w)

    def lid_sheet(self, which, t, close, squint, wince=0.):
        """Vertices (columns x rows x 3) of one lid sheet: rows from the margin's rolled lip to the far edge under the skin."""
        L = self.L
        pu, pl, su, sl = self.margins(t, close, squint, wince)
        rU, rL, _ = self.curves(t)
        fU, fL = self.furlines(t)
        nr, roll = L['rows'], L['roll_rows']
        w = L['roll_deg']
        if which == 'upper':
            pm, far, sgn, lam = pu, np.minimum(np.maximum(fU, rU+L['tuck_deg'])+L['far_deg'], L['far_cap_deg']), 1., self.lam(su)
        else:
            pm, far, sgn, lam = pl, np.maximum(np.minimum(fL, rL-L['tuck_deg'])-L.get('far_lower_deg', L['far_deg']), -L['far_cap_deg']), -1., self.lam(sl)
            if self.lowfar is not None:
                far = np.maximum(far, np.minimum(interp1(self.cth, self.lowfar, t), pm-L['roll_deg']-1.))
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
        if squint > 0 or wince > 0:
            O[:, roll:] += self.folds(which, T[:, roll:], P[:, roll:], pm[:, None], close, squint, wince)
        return self.point(T, P, O)

    def outer_radius(self, t, p, close, squint, wince=0.):
        """The outermost lid or globe radius at (theta, phi), with each lid's rolled lip and folds (for the lid fur, the
        lashes and the ribbon)."""
        pu, pl, su, sl = self.margins(t, close, squint, wince)
        w = self.L['roll_deg']
        lu, ll = self.lam(su), self.lam(sl)
        fu = self.field(t, p, lu)
        fl = self.field(t, p, ll)
        if squint > 0 or wince > 0:
            fu = fu+self.folds('upper', t, p, pu, close, squint, wince)
            fl = fl+self.folds('lower', t, p, pl, close, squint, wince)
        off = np.where(p >= pu, fu, np.where(p <= pl, fl, 0.))
        for pm, sgn, lam in ((pu, 1., lu), (pl, -1., ll)):
            x = sgn*(pm-p)                                       # degrees past the margin onto its lip
            lip = (x > 0) & (x < w)
            m_off = self.field(t, pm, lam)
            off = np.where(lip, np.maximum(off, m_off*np.sqrt(np.clip(1-(x/w)**2, 0, 1))), off)
        return self.grid(self.rg, t, p)+np.maximum(off, 0.)

    def surface_radius(self, t, p, close, squint, wince=0.):
        """The outermost surface at rest skin, globe or lid: the rest visible surface (skin where it lies over the globe)
        or a lid."""
        return np.maximum(self.grid(self.rvis, t, p), self.outer_radius(t, p, close, squint, wince))

    def surface_frame(self, t, p, close, squint, wince=0., h=0.3):
        """The outer surface's normal n and tangents at (theta, phi): u along +theta laid in the tangent plane, v = n x u
        (toward +phi)."""
        S = lambda tt, pp: self.c+self.dirs(tt, pp)*self.surface_radius(tt, pp, close, squint, wince)[..., None]
        dT = S(t+h, p)-S(t-h, p)
        dP = S(t, p+h)-S(t, p-h)
        n = np.cross(dT, dP)
        n /= np.maximum(np.linalg.norm(n, axis=-1, keepdims=True), 1e-12)
        n *= np.sign(np.einsum('...i,...i->...', n, self.dirs(t, p)))[..., None]
        u = dT-np.einsum('...i,...i->...', dT, n)[..., None]*n
        u /= np.maximum(np.linalg.norm(u, axis=-1, keepdims=True), 1e-12)
        v = np.cross(n, u)
        v *= np.sign(np.einsum('...i,...i->...', v, dP)+1e-15)[..., None]
        return n, u, v

    # ---------------------------------------------------------------- fur on the lids, and the lash line
    def lid_fur(self, close, squint, wince=0.):
        """Points (strands x 9 x 3) and radii (strands x 9): the lid fur (lid 1 upper, -1 lower) and the lashes (3, -3)."""
        F = self.fur
        n = len(F['theta'])
        X = np.zeros((n, 9, 3))
        rad = np.zeros((n, 9))
        self.tone_mult = np.ones(n)
        li = np.flatnonzero(np.abs(F['lid']) == 1)
        ki = np.flatnonzero(np.abs(F['lid']) == 3)
        ci = np.flatnonzero(F['lid'] == 5)
        if len(li):
            X[li], rad[li] = self._lid_strands(li, close, squint, wince)
        if len(ki):
            X[ki], rad[ki] = self._lash_strands(ki, close, squint, wince)
        if len(ci):
            X[ci], rad[ci] = self._corner_strands(ci, close, squint, wince)
        # a strand that does not show sits, zero length, at its root (or the eye centre when it never had one)
        X[rad[:, 0] == 0] = X[rad[:, 0] == 0][:, :1]
        return X, rad

    def _place(self, ix, t, p_root, prof, close, squint, wince):
        """Strands with the given surface-frame profiles rooted at (theta, phi) on the outer surface, every point kept
        fur_clear over it."""
        L = self.L
        R0 = self.surface_radius(t, p_root, close, squint, wince)-L['fur_sink_mm']/1000
        n0, u0, v0 = self.surface_frame(t, p_root, close, squint, wince)
        X0 = self.c+self.dirs(t, p_root)*R0[:, None]
        X = X0[:, None, :]+prof[:, :, :1]*u0[:, None, :]+prof[:, :, 1:2]*v0[:, None, :]+prof[:, :, 2:]*n0[:, None, :]
        T, P, Rr = self.angles(X.reshape(-1, 3))
        T, P, Rr = T.reshape(-1, 9), P.reshape(-1, 9), Rr.reshape(-1, 9)
        floor = self.surface_radius(T, P, close, squint, wince)+L['fur_clear_mm']/1000
        Rr = np.where(np.arange(9)[None, :] == 0, Rr, np.maximum(Rr, floor))
        return self.c+self.dirs(T, P)*Rr[..., None], T, P

    def _lid_strands(self, ix, close, squint, wince):
        L, F = self.L, self.fur
        t = F['theta'][ix]
        a_ = F['a'][ix]
        lidv = F['lid'][ix]
        pu, pl, su, sl = self.margins(t, close, squint, wince)
        up = lidv == 1
        pm = np.where(up, pu, pl)
        sgn = np.where(up, 1., -1.)
        p_root = pm+sgn*a_
        lam = np.where(up, self.lam(su), self.lam(sl))
        s0, s1 = self.grid(self.show0, t, p_root), self.grid(self.show1, t, p_root)
        g = s0+lam*(s1-s0)                                             # 0 under the skin, 1 where the lid shows
        # the root must also be on its own lid's side of the margin's travel (a root past the far edge has no sheet)
        g = g*np.where(up, p_root <= self.rootlines(t)[0], p_root >= self.rootlines(t)[1])
        g = g*(np.where(up, su, sl) > 0)                               # a lid that has not moved shows no fur
        band = np.where(up, self.band_top_fur(t, close, squint, 'upper', wince), self.band_top_fur(t, close, squint, 'lower', wince))
        cov = np.where(up, self.ribbon_cover(t, 'upper'), self.ribbon_cover(t, 'lower'))
        g = g*(a_ > band*cov)
        sd_root = self.grid(self.sdz, t, p_root)
        if self.xfade > 0 and self.fur_u is not None:
            # fix pass 4, the cross-fade: past the lid fur edge each strand shows only if its random number is under the lid's
            # share there (the face fur rooted there is hidden at the complementary share, face_radii)
            g = g*(self.fur_u[ix] < self.lid_weight(sd_root))
        if 'noedgelid' in self.flags:
            g = g*(sd_root >= L['edge_hide_mm'])
        # the source face strand's own shape in the surface frame (eyelids_build: fur_prof3), scaled by how far the strand
        # has come out from under the rim; along the wince folds the fur bunches up (stands higher, lies shorter)
        prof = self.fur_prof3[ix]*g[:, None, None]
        if wince > 0:
            fs = np.where(up, self.fold_shape('upper', t, p_root, pm), self.fold_shape('lower', t, p_root, pm))*wince*L['wince_bunch']
            prof = prof*np.stack([1-0.4*fs, 1-0.4*fs, 1+fs], 1)[:, None, :]
        X, T, P = self._place(ix, t, p_root, prof, close, squint, wince)
        rad = self.fur_rad[ix]*(g > 1e-4)[:, None]
        # the dark lid margin: lid fur next to the ribbon band darkens toward it (fur_tone, which the hair shader multiplies
        # the colour by) as the lid closes, so the closed line reads as a dark dash at sprite size without a heavier stroke
        # (it starts past half travel: a half-open or squinting lid keeps the face's own tone next to its margin)
        near = 1-smooth((a_-band)/L['margin_dark_deg'])
        ramp = lambda x: smooth((x-0.5)/0.5)
        # (fix pass 4: only along the ribbon band; past its outer end the strands keep the face's tone)
        self.tone_mult[ix] = 1-L['margin_dark']*near*cov*np.where(up, ramp(su), L['margin_dark_lower']*ramp(sl))
        # thinned where a point lies over the moved ribbon band (as sparse_caps thinned the face fur over the ribbon)
        rad = np.where(self.over_ribbon(T, P, close, squint, wince), 0., rad)
        return X, rad

    def _corner_strands(self, ix, close, squint, wince):
        """Fix pass 4: face-fur strands rooted along the closed line's extension past the ribbon's outer end, lying along it
        toward the outer corner, shown as both lids near the line (a closed eye or a wince; not half, not squint)."""
        F = self.fur
        t = F['theta'][ix]
        pu, pl, su, sl = self.margins(t, close, squint, wince)
        g = np.broadcast_to(smooth((np.minimum(su, sl)-0.5)/0.4), t.shape)
        p_root = (pu+pl)/2+F['a'][ix]
        prof = self.fur_prof3[ix]*(g > 1e-4)[:, None, None]
        X, _, _ = self._place(ix, t, p_root, prof, close, squint, wince)
        return X, self.fur_rad[ix]*(g > 1e-4)[:, None]

    def _lash_strands(self, ix, close, squint, wince):
        """The lash line: short dark strands rooted along each lid margin, leaning over the line where the lids meet."""
        L, F = self.L, self.fur
        t = F['theta'][ix]
        up = F['lid'][ix] > 0
        pu, pl, su, sl = self.margins(t, close, squint, wince)
        pm = np.where(up, pu, pl)
        sgn = np.where(up, 1., -1.)
        s = np.where(up, su, sl)
        g = smooth(s/0.15)*((t > self.thm) & (t < self.thl))
        p_root = pm+sgn*L['lash_root_deg']
        # the frame is taken on the lid face just past the rolled lip (the lip itself turns the normal into the eye)
        R0 = self.surface_radius(t, p_root, close, squint, wince)-L['fur_sink_mm']/1000
        n0, u0, v0 = self.surface_frame(t, pm+sgn*L['lash_frame_deg'], close, squint, wince)
        X0 = self.c+self.dirs(t, p_root)*R0[:, None]
        prof = self.fur_prof3[ix]*g[:, None, None]
        X = X0[:, None, :]+prof[:, :, :1]*u0[:, None, :]+prof[:, :, 1:2]*v0[:, None, :]+prof[:, :, 2:]*n0[:, None, :]
        T, P, Rr = self.angles(X.reshape(-1, 3))
        T, P, Rr = T.reshape(-1, 9), P.reshape(-1, 9), Rr.reshape(-1, 9)
        floor = self.surface_radius(T, P, close, squint, wince)+L['fur_clear_mm']/1000
        Rr = np.where(np.arange(9)[None, :] == 0, Rr, np.maximum(Rr, floor))
        X = self.c+self.dirs(T, P)*Rr[..., None]
        rad = self.fur_rad[ix]*(g > 1e-4)[:, None]
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

    def band_top(self, t, close, squint, which, wince=0.):
        """Degrees from the margin to the top edge of the ribbon band riding on that lid."""
        tt, wu, wl = self.band
        _, _, su, sl = self.margins(t, close, squint, wince)
        w = interp1(tt, wu if which == 'upper' else wl, t)
        s = su if which == 'upper' else sl
        return self.L['ribbon_m0_deg']+w*self.band_factor(t, w, s, which)

    def band_top_fur(self, t, close, squint, which, wince=0.):
        """Fix pass 4: degrees from the margin to the top of the ribbon band where it lies over the lid (away from the eye):
        band_top with the band's signed reach (at the outer end the upper ribbon curls down into the eye, over the line,
        and leaves the lid above the margin bare). Before pass 4 (no signed arrays) it is band_top."""
        if self.band_out is None:
            return self.band_top(t, close, squint, which, wince)
        tt, wu, wl = self.band
        _, _, su, sl = self.margins(t, close, squint, wince)
        w = interp1(tt, wu if which == 'upper' else wl, t)
        wo = interp1(tt, self.band_out[0] if which == 'upper' else self.band_out[1], t)
        s = su if which == 'upper' else sl
        return self.L['ribbon_m0_deg']+wo*self.band_factor(t, w, s, which)

    def over_ribbon(self, T, P, close, squint, wince=0.):
        pu, pl, su, sl = self.margins(T, close, squint, wince)
        bu = self.band_top_fur(T, close, squint, 'upper', wince)
        bl = self.band_top_fur(T, close, squint, 'lower', wince)
        inside = (T > self.thm) & (T < self.thl)
        w = self.L['roll_deg']
        # the bands, and each lid's dark rolled lip under them: fur from either lid crossing the margins is thinned there,
        # so the closed line (lips and bands together) is not hidden under lid fur
        cu, cl = self.ribbon_cover(T, 'upper'), self.ribbon_cover(T, 'lower')
        bands = (((P >= pu) & (P <= pu+bu+0.3)) & (cu > 0.5)) | (((P <= pl) & (P >= pl-bl-0.3)) & (cl > 0.5))
        lips = ((P <= pu) & (P >= pu-w-0.3)) | ((P >= pl) & (P <= pl+w+0.3))
        return inside & (bands | lips)

    # ---------------------------------------------------------------- ribbon
    def ribbon(self, close, squint, wince=0.):
        R, L = self.rib, self.L
        pu, pl, su, sl = self.margins(R['th0'], close, squint, wince)
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
        r = self.surface_radius(th, ph, close, squint, wince)+R['h']
        X = self.c+self.dirs(th, ph)*r[..., None]
        X = np.where(moved[:, None, None], X, R['rest'])
        return X

    # ---------------------------------------------------------------- face fur under the ribbon's old place
    def caps(self, close, squint, wince=0.):
        C = self.capdata
        if len(C['idx']) == 0:
            return None
        over = self.over_ribbon_rest(C['th'], C['ph'], close, squint, wince)
        return C['idx'], np.where(over, C['r_now'], C['r_full'])

    def over_ribbon_rest(self, th, ph, close, squint, wince=0.):
        """Whether face-fur points (theta, phi) still lie under the ribbon band where it is now (its moved footprint)."""
        pu, pl, su, sl = self.margins(th, close, squint, wince)
        m0 = self.L['ribbon_m0_deg']
        bu = self.band_top(th, close, squint, 'upper', wince)
        bl = self.band_top(th, close, squint, 'lower', wince)
        rU, rL, _ = self.curves(th)
        lo_u = np.minimum(rU, pu+m0)
        lo_l = np.maximum(rL, pl-m0)
        pad = self.L['caps_pad_deg']
        upper = (ph >= lo_u-pad) & (ph <= lo_u+bu+pad)
        lower = (ph <= lo_l+pad) & (ph >= lo_l-bl-pad)
        return upper | lower | (th <= self.thm) | (th >= self.thl)

    def face_radii(self, close, squint, wince=0.):
        """The face-fur points this eye overrides, and their radii (NaN: keep the fur of record's): the caps under the
        ribbon's old place (as before pass 4), and the face strands rooted in the cross-fade band, hidden at the face fur's
        complementary share there as far as each lid has moved (fix pass 4; the cause-test flag nofaceband hides every face
        strand rooted within 4 mm outside the lid fur edge once the lid moves). None when nothing is recorded."""
        C, B = self.capdata, self.fb
        parts_i, parts_r = [], []
        if len(C['idx']):
            over = self.over_ribbon_rest(C['th'], C['ph'], close, squint, wince)
            parts_i.append(np.asarray(C['idx'], np.int64))
            parts_r.append(np.where(over, C['r_now'], C['r_full']).astype(float))
        if B is not None and len(B['pidx']):
            _, _, su, sl = self.margins(np.array([0.5*(self.thm+self.thl)]), close, squint, wince)
            lam = np.where(B['side'] > 0, float(np.ravel(self.lam(su))[0]), float(np.ravel(self.lam(sl))[0]))
            hide = np.zeros(len(B['sd']), bool)
            if self.xfade > 0:
                hide = B['v'] < lam*self.lid_weight(B['sd'])
            if 'nofaceband' in self.flags:
                hide = hide | ((B['sd'] > -(self.L['fur_out_mm']+4.0)) & (lam > 0))
            parts_i.append(np.asarray(B['pidx'], np.int64))
            parts_r.append(np.where(hide[B['pstrand']], 0., np.nan))
        if not parts_i:
            return None
        idx = np.concatenate(parts_i)
        r = np.concatenate(parts_r)
        # a point in both: hidden wins, then the caps value
        order = np.lexsort((np.isnan(r), r != 0, idx))
        idx, r = idx[order], r[order]
        first = np.r_[True, idx[1:] != idx[:-1]]
        return idx[first], r[first]

    def catch_visible(self, close, squint, wince=0.):
        t, p = self.catch
        pu, pl, _, _ = self.margins(np.array([t]), close, squint, wince)
        return bool(pl[0]+0.5 < p < pu[0]-0.5)


class _Arrays(dict):
    """lids.npz read whole at load (an NpzFile reads lazily, so a rebuild while a render runs would break it)."""

    @property
    def files(self):
        return list(self.keys())


class Lids:
    def __init__(self, lids_dir):
        d = Path(lids_dir)
        with np.load(d/'lids.npz') as z:
            self.Z = _Arrays({k: z[k] for k in z.files})
        self.info = json.loads((d/'lids.json').read_text())
        self.L = self.info['levers']
        self.eyes = {k: Eye(self.Z, k, self.L) for k in EYES}
        self.faces = {w: self.Z['faces_'+w] for w in ('upper', 'lower')}
        self.fur_attr = {k[len('furattr__'):]: self.Z[k] for k in self.Z.files if k.startswith('furattr__')}

    def state_geometry(self, eye, close=0., squint=0., wince=0., flags=()):
        """flags (cause tests, fix pass 3; none in any clip): holdlower (the lower lid sheet, its fur, lashes and ribbon band
        held at their open places while the upper lid moves), nolidfur (no lid fur or lashes), nolowerfur / noupperfur (that
        lid's fur hidden, the lashes kept), keepcaps (the face fur under the ribbon's old place left as thinned)."""
        E = self.eyes[eye]
        flags = set(flags or ())
        E.hold_lower = 'holdlower' in flags
        E.flags = flags
        is_open = close == 0 and squint == 0 and wince == 0
        t = E.lid_th
        out = dict(open=is_open, upper=E.lid_sheet('upper', t, close, squint, wince).reshape(-1, 3),
                   lower=E.lid_sheet('lower', t, close, squint, wince).reshape(-1, 3))
        X, rad = E.lid_fur(close, squint, wince)
        lid = E.fur['lid']
        if 'nolidfur' in flags:
            rad = rad*0.
        if 'nolowerfur' in flags:
            rad = rad*(lid != -1)[:, None]
        if 'noupperfur' in flags:
            rad = rad*(lid != 1)[:, None]
        out['fur'], out['fur_radius'] = X.reshape(-1, 3), rad.ravel()
        out['fur_tone_mult'] = E.tone_mult.copy()
        out['ribbon'] = None if is_open else E.ribbon(close, squint, wince)
        out['caps'] = None if (is_open or 'keepcaps' in flags) else E.caps(close, squint, wince)
        # fix pass 4: every face-fur radius this eye overrides (caps and the cross-fade band); None when open
        fr = None if is_open else E.face_radii(close, squint, wince)
        if fr is not None and 'keepcaps' in flags and len(E.capdata['idx']):
            ci = np.isin(fr[0], E.capdata['idx'])
            fr = (fr[0], np.where(ci & ~(fr[1] == 0), np.nan, fr[1]))
        out['face'] = fr
        out['catch'] = True if is_open else E.catch_visible(close, squint, wince)
        return out


STATES = {'open': dict(close=0., squint=0., wince=0.), 'half': dict(close=0.5, squint=0., wince=0.),
          'squint': dict(close=0., squint=1., wince=0.), 'wince': dict(close=0., squint=0., wince=1.),
          'closed': dict(close=1., squint=0., wince=0.)}


FLAGS = ('holdlower', 'nolidfur', 'nolowerfur', 'noupperfur', 'keepcaps', 'noedgelid', 'nofaceband')


def parse_state(text):
    """'open' / 'half' / 'squint' / 'wince' / 'closed', or 'L=0.3,R=0.3,squint=0.5,wince=0.2' (squint and wince for both
    eyes; squint.L / squint.R / wince.L / wince.R each). Cause-test flags (Lids.state_geometry) follow with '+', for both
    eyes: 'closed+holdlower', 'closed+nolidfur'."""
    text, *flags = text.split('+')
    bad = [f for f in flags if f not in FLAGS]
    if bad:
        raise ValueError(bad)
    out = _parse_base(text)
    for e in out:
        out[e]['flags'] = list(flags)
    return out


def _parse_base(text):
    if text in STATES:
        s = STATES[text]
        return {'eye1': dict(s), 'eye-1': dict(s)}
    out = {'eye1': dict(close=0., squint=0., wince=0.), 'eye-1': dict(close=0., squint=0., wince=0.)}
    for kv in text.split(','):
        k, v = kv.split('=')
        v = float(v)
        if k == 'L':
            out['eye1']['close'] = v
        elif k == 'R':
            out['eye-1']['close'] = v
        elif k in ('squint', 'wince'):
            out['eye1'][k] = out['eye-1'][k] = v
        elif k.split('.')[0] in ('squint', 'wince') and k.split('.')[-1] in ('L', 'R'):
            out['eye1' if k.endswith('L') else 'eye-1'][k.split('.')[0]] = v
        else:
            raise ValueError(k)
    return out
