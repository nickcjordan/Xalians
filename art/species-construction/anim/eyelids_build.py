"""Akinza eyelids: build the lid model from the eye maps and the eye-region probe (numpy and scipy, no Blender).

  python art/species-construction/anim/eyelids_build.py <maps dir> <probe dir> <out lids dir>

Inputs: eyelids_maps.py's maps.npz (the globe, skin, iris and catch-light radii over each eye's theta x phi grid) and
eyelids_probe.py's eye-region.npz/json (the ribbon, catch light, the fur strands and skin vertices around the eyes, with
their attributes). Writes <out>/lids.npz (everything eyelids_core.Lids reads) and <out>/lids.json (the levers, counts and
the build checks).

Per eye:
- the opening: grid cells where the skin passes under the globe (rs < rg); its upper and lower rim per theta (sub-cell, where
  rs - rg crosses zero), its corners (the first and last theta columns with an opening);
- the closed line: from corner to corner, the straight line between the corners' mid heights, sagging by `sag_deg` in the
  middle (sin^0.8), kept 2 degrees inside the rims;
- the lid offset field loff(theta, phi): inside the opening delta_min rising to delta (smoothstep over w_in from the rim; the
  lid clears the iris, which stands up to 1.44 mm proud of the globe), outside it 0 falling to -eps under the skin (the
  sheet goes under the skin and just inside the globe wherever skin covers the globe);
- rvis: the visible surface at rest (the globe, or the skin where it lies over the globe), for the ribbon's height;
- the lid fur roots (upper and lower lid, density over the region each lid shows when closed), each copying every curve
  and point attribute of the nearest face strand just outside its rim (so the hair shader colours it as the face there);
- the ribbon (the fur of record's lid margin strips, 1024 x 9 per eye): each vertex's (theta, phi), its height over the
  rest surface, and its column's class (upper margin, lower margin, or a corner that stays);
- the face-fur points sparse_caps thinned under the ribbon (ribbon_eyeliner_13h.sparse_caps, replayed here), with a full
  radius taken from nearby unthinned strands: when the ribbon slides down with the lid they get it back;
- the catch light's centre.
"""
import json
import sys
import time
from pathlib import Path

import numpy as np
from scipy.ndimage import distance_transform_edt
from scipy.spatial import cKDTree

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import eyelids_core as ec  # noqa: E402

LEVERS = dict(
    delta_mm=1.9, delta_min_mm=0.15, w_in_deg=3.0, eps_mm=0.35, w_out_deg=1.0,
    lift_delta_mm=0.5, lift_at=0.08, lift_blur_deg=1.0, lift_dive_mm=1.6, bare_root_mm=1.6, bare_max_mm=14.0, bare_smooth_deg=1.5, fur_line_margin_mm=0.3, fur_line_pad_mm=0.3, fur_emerge_mm=1.5,
    tuck_deg=3.0, far_deg=2.0, far_cap_deg=86.0, rows=120, roll_rows=4, roll_deg=1.8, seal_mm=0.15, closed_half_gap_deg=0.9,
    sag_deg=18.0, sag_power=0.8, squint_tilt_deg=7.0, squint_cheek_deg=6.0, fold_mm=0.8, fold_at_deg=9.0, fold_width_deg=2.5,
    lid_columns=150, lid_theta_pad_deg=6.0,
    fur_density_per_mm2=0.30, fur_density_lower_per_mm2=0.70, fur_len_mm=7.0, fur_lift_deg=8.0, fur_root_mm=0.05, fur_clear_mm=0.12, fur_sink_mm=0.10,
    fur_emerge_deg=2.0, fur_radius_scale=0.9, fur_gamma_upper_deg=50.0, fur_gamma_lower_deg=40.0,
    fur_seed=11, fur_profile_scale=1.0, ribbon_m0_deg=-0.9, ribbon_close_widen_upper=1.0, ribbon_close_upper_min_deg=3.5, ribbon_close_lower_min_deg=2.0, caps_pad_deg=0.6)
LEVER_NOTES = {
    'delta_mm': 'lid height over the globe inside the opening (surface mm; x0.793 for rig mm)',
    'tuck_deg': 'open lid margin this far past the rim, under the skin',
    'sag_deg': 'closed line: sag below the straight corner-to-corner line at the middle',
    'closed_half_gap_deg': 'closed margins this far either side of the closed line (half the lip roll: the lips meet there)',
    'squint_tilt_deg': 'squint: inner half of the upper margin pressed this much lower',
    'squint_cheek_deg': 'squint: lower margin pushed up this much in the middle',
    'fold_mm': 'squint: height of the tension fold on the upper lid, fold_at_deg above its margin',
    'lift_delta_mm': 'a moving lid lies this far over the bare skin between the rim and the face fur (the fur line)',
    'lift_at': 'share of its travel at which a lid has fully risen from its tucked field to the lifted one',
    'ribbon_m0_deg': 'the ribbon rides this far from the lid margin (negative: down onto the rolled lip)',
    'ribbon_close_upper_min_deg': 'closing, the upper ribbon band grows to at least this width in the middle (tapered to the corners): the closed line must read at 192 px',
    'ribbon_close_lower_min_deg': 'closing, the thin lower ribbon band grows to at least this width in the middle (tapered to the corners)',
}


def main(maps_dir, probe_dir, out):
    t0 = time.time()
    out.mkdir(parents=True, exist_ok=True)
    L = dict(LEVERS)
    M = np.load(maps_dir/'maps.npz')
    P = np.load(probe_dir/'eye-region.npz')
    PJ = json.loads((probe_dir/'eye-region.json').read_text())
    th, ph = M['theta'], M['phi']
    step = float(th[1]-th[0])
    grid = ec.Grid(th, ph)
    A = dict(theta=th, phi=ph)
    rec = dict(levers=L, leverNotes=LEVER_NOTES, eyes={}, built=time.strftime('%Y-%m-%d %H:%M'))
    # ---- fur of the probe: strands near the eyes
    cnt = P['fur__counts']
    st = np.r_[0, np.cumsum(cnt)[:-1]]
    FP = P['fur__points']
    rad = P['furattr__radius']
    gofs = P['fur__offsets']
    lens = np.array([np.linalg.norm(np.diff(FP[s:s+n], axis=0), axis=1).sum() for s, n in zip(st, cnt)])
    nine = cnt == 9
    full = nine & (rad[st] >= 0.000699) & (lens > 0.002)
    prof = np.median(np.array([rad[s:s+9] for s in st[full]]), axis=0)
    fdom = {n: (d, t) for n, d, t in PJ['furAttributes']}
    # ---- sparse_caps replayed: which face-fur points lie in each ribbon's footprint
    ang = np.radians(2.)
    up2 = np.array((0., np.sin(ang), np.cos(ang)))
    proj = lambda X: np.column_stack((X[:, 0], X@up2))
    fproj = proj(FP)
    point_strand = np.repeat(np.arange(len(cnt)), cnt)
    point_k = np.arange(len(FP))-np.repeat(st, cnt)
    flagged_any = np.zeros(len(FP), bool)
    flag_eye = {}
    for e, side in (('eye1', '1'), ('eye-1', '-1')):
        rows = P['Akinza G1 ribbon head_eye_globe_'+side+'__v'].reshape(1024, 9, 3)
        inner, outer = proj(rows[:, 0]), proj(rows[:, -1])
        ow = outer-inner
        width = np.linalg.norm(ow, axis=1)
        ow /= width[:, None]
        cy = float(P['head_eye_globe_'+side+'__v'][:, 1].mean())
        margin = float(width.max())+.004
        lo, hi = inner.min(0)-margin, inner.max(0)+margin
        ids = np.flatnonzero(((fproj > lo) & (fproj < hi)).all(1) & (FP[:, 1] < cy))
        _, j = cKDTree(inner).query(fproj[ids])
        d = np.einsum('ij,ij->i', fproj[ids]-inner[j], ow[j])
        r_up = np.maximum(rad[ids], prof[np.minimum(point_k[ids], 8)])
        f = (-r_up-.00008 < d) & (d < width[j]+r_up+.00008)
        flag_eye[e] = ids[f]
        flagged_any[ids[f]] = True
    # full radius for flagged points: per point index, the median of the 24 nearest unflagged full strands (by root)
    clean = full & ~np.array([flagged_any[s:s+n].any() for s, n in zip(st, cnt)])
    croots = FP[st[clean]]
    ctree = cKDTree(croots)
    for e, side in (('eye1', '1'), ('eye-1', '-1')):
        key = e+'__'
        c, f, up, lat = M[key+'frame']
        rg, rs, ri = M[key+'rg'], M[key+'rs'], M[key+'ri']
        A[key+'frame'], A[key+'rg'] = M[key+'frame'], rg
        opening = rs < rg
        # ---- rims and corners (sub-cell)
        cols = np.flatnonzero(opening.any(0))
        rimU = np.full(len(th), np.nan)
        rimL = np.full(len(th), np.nan)
        dd = rs-rg
        for jj in cols:
            ii = np.flatnonzero(opening[:, jj])
            i1, i0 = ii[-1], ii[0]
            a, b = dd[i1, jj], dd[min(i1+1, len(ph)-1), jj]
            rimU[jj] = ph[i1]+step*(a/(a-b) if np.isfinite(b) and b != a else 0.5)
            a, b = dd[i0, jj], dd[max(i0-1, 0), jj]
            rimL[jj] = ph[i0]-step*(a/(a-b) if np.isfinite(b) and b != a else 0.5)
        thm, thl = th[cols[0]]-step/2, th[cols[-1]]+step/2
        pm = (rimU[cols[0]]+rimL[cols[0]])/2
        pl = (rimU[cols[-1]]+rimL[cols[-1]])/2
        rimU[:cols[0]], rimL[:cols[0]] = pm, pm
        rimU[cols[-1]+1:], rimL[cols[-1]+1:] = pl, pl
        u = np.clip((th-thm)/(thl-thm), 0, 1)
        close = pm+(pl-pm)*u-L['sag_deg']*np.sin(np.pi*u)**L['sag_power']
        lo_, hi_ = rimL+2, rimU-2
        close = np.where(hi_ > lo_, np.clip(close, lo_, hi_), (rimU+rimL)/2)
        A[key+'cth'], A[key+'rimU'], A[key+'rimL'], A[key+'closeline'] = th, rimU, rimL, close
        A[key+'corners'] = np.array([thm, thl, pm, pl])
        # ---- lid offset field
        din = distance_transform_edt(opening, sampling=step)
        dout = distance_transform_edt(~opening, sampling=step)
        dl, dm = L['delta_mm']/1000, L['delta_min_mm']/1000
        loff = np.where(opening, dm+(dl-dm)*ec.smooth(din/L['w_in_deg']), -L['eps_mm']/1000*ec.smooth(dout/L['w_out_deg']))
        A[key+'loff'] = loff
        rvis = np.where(np.isfinite(rs) & (rs > rg), rs, rg)
        A[key+'rvis'] = rvis
        # ---- the bare zone: the skin round the opening that carries no face fur (its roots stop short of the eye; the
        # open ribbon covers part of it). Cells farther than bare_root_mm from every live face-fur root, joined to the
        # opening, within bare_max_mm of it; its edge smoothed (a signed distance, blurred) so a lid's top edge has no teeth
        from scipy.ndimage import gaussian_filter, label
        Dr = FP[st]-c
        rth_ = np.degrees(np.arctan2(Dr@lat, Dr@f))
        rph_ = np.degrees(np.arctan2(Dr@up, np.hypot(Dr@lat, Dr@f)))
        live = (rad[st] > 0) & (lens > 0.002) & ((Dr@f) > 0) & (np.abs(rth_) < 120)
        # distances are measured on the surface in 3D (surface mm), not in angle cells: near the top of the eye the angle
        # grid's theta cells shrink toward the pole, and cell distances there would call fur-covered skin bare
        TH = np.repeat(th[None], len(ph), 0)
        PHg = np.repeat(ph[:, None], len(th), 1)
        tr, pr = np.radians(TH), np.radians(PHg)
        S3 = c+(np.cos(pr)[..., None]*(np.cos(tr)[..., None]*f+np.sin(tr)[..., None]*lat)+np.sin(pr)[..., None]*up)*rvis[..., None]
        near_eye = (TH > thm-12) & (TH < thl+12) & (dout < 25)
        dfur = np.full(opening.shape, np.inf)
        dfur[near_eye] = cKDTree(FP[st][live]).query(S3[near_eye])[0]*1000
        dop = np.zeros(opening.shape)
        dop[near_eye & ~opening] = cKDTree(S3[opening]).query(S3[near_eye & ~opening])[0]*1000
        cand = near_eye & ~opening & (dfur > L['bare_root_mm']) & (dop < L['bare_max_mm'])
        lab, _ = label(cand | opening)
        keep = np.unique(lab[opening])
        zone = np.isin(lab, keep[keep > 0]) & ~opening
        Z = zone | opening
        sd = np.full(opening.shape, -30.)
        zi, zo = np.flatnonzero((Z & near_eye).ravel()), np.flatnonzero((~Z & near_eye).ravel())
        S3f = S3.reshape(-1, 3)
        sdf = sd.ravel()
        sdf[zi] = cKDTree(S3f[zo]).query(S3f[zi])[0]*1000
        sdf[zo] = -cKDTree(S3f[zi]).query(S3f[zo])[0]*1000
        sd = gaussian_filter(sdf.reshape(opening.shape), L['bare_smooth_deg']/step)
        zone_soft = ec.smooth((sd-L['fur_line_margin_mm'])/L['lift_dive_mm'])
        # sheet extents per column: the zone's top above the middle and bottom below it
        mid = (rimU+rimL)/2
        zs = zone_soft > 0.02
        furU = np.array([ph[zs[:, j] & (ph > mid[j])].max() if (zs[:, j] & (ph > mid[j])).any() else rimU[j] for j in range(len(th))])
        furL = np.array([ph[zs[:, j] & (ph < mid[j])].min() if (zs[:, j] & (ph < mid[j])).any() else rimL[j] for j in range(len(th))])
        furU, furL = np.maximum(furU, rimU), np.minimum(furL, rimL)
        A[key+'furU'], A[key+'furL'] = furU, furL
        gU, gL = (furU-rimU)[cols], (rimL-furL)[cols]
        # ---- the lifted field: a lid that has started to move lies lift_delta over the bare zone (the skin's height there,
        # its rim crease filled by a blur), rises over the globe inside the opening as before, and dives under the skin at
        # the zone's edge, short of the first face-fur roots
        clr = np.where(np.isfinite(rs), rs-rg, 0.05)
        h0 = np.where(opening, 0., np.maximum(clr, 0.))
        H = np.maximum(h0, gaussian_filter(h0, L['lift_blur_deg']/step))
        ds = L['lift_delta_mm']/1000
        lifted_in = np.maximum(dm+(dl-dm)*ec.smooth(din/L['w_in_deg']), H+ds)
        lf = np.where(opening, lifted_in, (H+ds)*zone_soft+loff*(1-zone_soft))
        A[key+'lfield'] = lf
        # where a lid's fur shows: open (tucked) inside the opening only; lifted, over the zone as well
        A[key+'show0'] = np.where(opening, ec.smooth(din/L['fur_emerge_deg']), 0.)
        A[key+'show1'] = np.where(opening, 1., ec.smooth((sd-L['fur_line_margin_mm']-L['lift_dive_mm']-L['fur_line_pad_mm'])/L['fur_emerge_mm']))
        iris_clear = (rg+loff-ri)[np.isfinite(ri) & opening]
        A[key+'lid_theta'] = np.linspace(thm-L['lid_theta_pad_deg'], thl+L['lid_theta_pad_deg'], L['lid_columns'])
        # ---- ribbon parameters
        R = P['Akinza G1 ribbon head_eye_globe_'+side+'__v'].reshape(1024, 9, 3)
        D = R-c
        rth = np.degrees(np.arctan2(D@lat, D@f))
        rph = np.degrees(np.arctan2(D@up, np.hypot(D@lat, D@f)))
        rr = np.linalg.norm(D, axis=2)
        rh = rr-grid(rvis, rth, rph)
        th0, ph0 = rth[:, 0], rph[:, 0]
        U0, L0, _ = (np.interp(th0, th, rimU), np.interp(th0, th, rimL), None)
        inside = (th0 > thm) & (th0 < thl)
        cls = np.where(inside, np.where(ph0 > (U0+L0)/2, 1, -1), 0)
        A[key+'rib_rest'], A[key+'rib_th'], A[key+'rib_ph'], A[key+'rib_h'] = R, rth, rph, rh
        A[key+'rib_cls'], A[key+'rib_th0'], A[key+'rib_ph0'] = cls, th0, ph0
        bt = np.linspace(thm, thl, 120)
        wu, wl = np.zeros(len(bt)), np.zeros(len(bt))
        ext = np.abs(rph-ph0[:, None]).max(1)
        for k, t in enumerate(bt):
            near = np.abs(th0-t) < 1.5
            if (near & (cls == 1)).any():
                wu[k] = ext[near & (cls == 1)].max()
            if (near & (cls == -1)).any():
                wl[k] = ext[near & (cls == -1)].max()
        A[key+'band_theta'], A[key+'band_upper'], A[key+'band_lower'] = bt, wu, wl
        # ---- catch light centre
        cv = P['catch light head_iris_and_pupil_'+side+'__v'].mean(0)-c
        A[key+'catch'] = np.array([np.degrees(np.arctan2(cv@lat, cv@f)), np.degrees(np.arctan2(cv@up, np.hypot(cv@lat, cv@f)))])
        # ---- caps: the flagged points of this eye, thinner than their full radius
        fi = flag_eye[e]
        _, nn = ctree.query(FP[st[point_strand[fi]]], k=24)
        cst = st[np.flatnonzero(clean)]
        kk = np.minimum(point_k[fi], 8)
        rfull = np.array([np.median(rad[cst[row]+k]) for row, k in zip(nn, kk)])
        thin = rad[fi] < rfull-1e-7
        fi, rfull = fi[thin], rfull[thin]
        Dp = FP[fi]-c
        A[key+'caps_idx'] = gofs[point_strand[fi]]+point_k[fi]
        A[key+'caps_th'] = np.degrees(np.arctan2(Dp@lat, Dp@f))
        A[key+'caps_ph'] = np.degrees(np.arctan2(Dp@up, np.hypot(Dp@lat, Dp@f)))
        A[key+'caps_r'], A[key+'caps_rfull'] = rad[fi], rfull
        # ---- lid fur roots
        rng = np.random.default_rng(L['fur_seed']+(0 if e == 'eye1' else 1))
        roots = dict(lid=[], theta=[], a=[], len=[], gamma=[], jit=[])
        for lid, span in ((1, lambda t: np.interp(t, th, furU)-(np.interp(t, th, close)+L['closed_half_gap_deg'])),
                          (-1, lambda t: (np.interp(t, th, close)-L['closed_half_gap_deg'])-np.interp(t, th, furL))):
            tt = rng.uniform(thm-4, thl+4, 400000)
            amax = np.maximum(span(tt), 0)
            aa = rng.uniform(0, 1, len(tt))*amax.max()
            keep = aa < amax
            tt, aa = tt[keep], aa[keep]
            pmid = (np.interp(tt, th, close)+lid*aa)
            r0 = grid(rg, tt, pmid)
            # area of one candidate in mm^2: box area / candidate count, times the true area factor cos(phi) r^2
            box = (thl-thm)*amax.max()*np.radians(1)**2
            dens = r0**2*np.cos(np.radians(pmid))*1e6*box/400000
            rho = L['fur_density_per_mm2'] if lid == 1 else L['fur_density_lower_per_mm2']
            keep = rng.uniform(0, 1, len(tt)) < np.clip(rho*dens, 0, 1)
            n = int(keep.sum())
            roots['lid'].append(np.full(n, lid))
            roots['theta'].append(tt[keep])
            roots['a'].append(aa[keep])
            roots['len'].append(L['fur_len_mm']*rng.uniform(0.8, 1.15, n))
            g0 = L['fur_gamma_upper_deg'] if lid == 1 else L['fur_gamma_lower_deg']
            roots['gamma'].append(g0+rng.normal(0, 10, n))
            roots['jit'].append(rng.uniform(0, 1, n))
        for k, v in roots.items():
            A[key+'fur_'+k] = np.concatenate(v)
        A[key+'fur_profile'] = prof
        # attributes from the nearest face strand just outside its rim (full, unflagged, 9 points)
        roots_all = FP[st]
        Dr = roots_all-c
        rth_ = np.degrees(np.arctan2(Dr@lat, Dr@f))
        rph_ = np.degrees(np.arctan2(Dr@up, np.hypot(Dr@lat, Dr@f)))
        front = (Dr@f) > 0
        ru, rl = np.interp(rth_, th, rimU), np.interp(rth_, th, rimL)
        cand = {1: np.flatnonzero(clean & front & (rph_ > ru) & (rph_ < ru+10)),
                -1: np.flatnonzero(clean & front & (rph_ < rl) & (rph_ > rl-10))}
        src_idx = np.array([cand[lid][np.argmin(np.abs(rth_[cand[lid]]-t))]
                            for lid, t in zip(A[key+'fur_lid'], A[key+'fur_theta'])])
        A[key+'fur_src'] = src_idx
        # each lid strand copies its source face strand's shape (curl, lift, flow) in the surface frame at the root:
        # u along +theta (toward the outer corner), v along +phi (up), w out of the eye; turned to point toward its margin
        prof3 = np.zeros((len(src_idx), 9, 3))
        for k, (i, lid) in enumerate(zip(src_idx, A[key+'fur_lid'])):
            pts = FP[st[i]:st[i]+9]
            d0 = pts[0]-c
            t0 = np.arctan2(d0@lat, d0@f)
            p0 = np.arctan2(d0@up, np.hypot(d0@lat, d0@f))
            n0 = np.cos(p0)*(np.cos(t0)*f+np.sin(t0)*lat)+np.sin(p0)*up
            et = -np.sin(t0)*f+np.cos(t0)*lat
            ep = -np.sin(p0)*(np.cos(t0)*f+np.sin(t0)*lat)+np.cos(p0)*up
            D = pts-pts[0]
            uvw = np.stack([D@et, D@ep, D@n0], 1)*L['fur_profile_scale']
            if lid == 1 and uvw[-1, 1] > 0 or lid == -1 and uvw[-1, 1] < 0:
                uvw[:, 1] *= -1
            prof3[k] = uvw
        A[key+'fur_prof3'] = prof3
        for name, (dom, typ) in fdom.items():
            if name.startswith('.') or name in ('position', 'radius', 'curve_type') or 'furattr__'+name not in P.files:
                continue
            v = P['furattr__'+name]
            if dom == 'CURVE':
                A[key+'fa__'+name] = v[src_idx]
            else:
                A[key+'fa__'+name] = np.concatenate([v[st[i]:st[i]+9] for i in src_idx])
        # lid skin attributes (the skin shader reads pale, pad, rim, eyed, padd, solef): per lid column, the nearest skin
        # vertex at the rim's outside
        SV = P['skin__v']
        stree = cKDTree(SV)
        for lid, rim in (('upper', rimU), ('lower', rimL)):
            lt = A[key+'lid_theta']
            pr = np.interp(lt, th, rim)+(2 if lid == 'upper' else -2)
            X = c+(np.cos(np.radians(pr))[:, None]*(np.cos(np.radians(lt))[:, None]*f+np.sin(np.radians(lt))[:, None]*lat)
                   + np.sin(np.radians(pr))[:, None]*up)*grid(rvis, lt, pr)[:, None]
            _, si = stree.query(X)
            for n in ('pale', 'pad', 'rim', 'eyed', 'padd', 'solef'):
                if 'skinattr__'+n in P.files:
                    A[key+f'sa_{lid}__'+n] = P['skinattr__'+n][si]
        rec['eyes'][e] = dict(
            corners=[float(thm), float(thl), float(pm), float(pl)],
            rim_upper_mid=float(np.interp((thm+thl)/2, th, rimU)), rim_lower_mid=float(np.interp((thm+thl)/2, th, rimL)),
            closed_line_mid=float(np.interp((thm+thl)/2, th, close)),
            upper_travel_share_mid=float((np.interp((thm+thl)/2, th, rimU)-np.interp((thm+thl)/2, th, close)) /
                                         (np.interp((thm+thl)/2, th, rimU)-np.interp((thm+thl)/2, th, rimL))),
            iris_clearance_min_mm=float(iris_clear.min()*1000) if len(iris_clear) else None,
            bare_zone_upper_deg=[float(np.min(gU)), float(np.max(gU))],
            bare_zone_lower_deg=[float(np.min(gL)), float(np.max(gL))],
            catch=A[key+'catch'].tolist(), lid_fur_strands=int(len(A[key+'fur_theta'])),
            lid_fur_upper=int((A[key+'fur_lid'] == 1).sum()), caps_points=int(len(fi)),
            ribbon_columns=dict(upper=int((cls == 1).sum()), lower=int((cls == -1).sum()), corner=int((cls == 0).sum())))
        print(e, rec['eyes'][e], flush=True)
    # ---- sheet faces (columns x rows grid), wound so the normal points out of the eye
    nc, nr = L['lid_columns'], L['roll_rows']+L['rows']
    ids = np.arange(nc*nr).reshape(nc, nr)
    quads = np.stack([ids[:-1, :-1], ids[1:, :-1], ids[1:, 1:], ids[:-1, 1:]], -1).reshape(-1, 4)
    for which in ('upper', 'lower'):
        A['faces_'+which] = quads
        # the rolled lip's faces (the first roll_rows rows) take the ribbon's dark material in the fur look: where the two lips
        # meet they draw the closed line, wide enough to read as a dark stroke at sprite size
        A['faces_lip_'+which] = np.repeat((np.arange(nr-1) < L['roll_rows'])[None], nc-1, 0).ravel()
    np.savez_compressed(out/'lids.npz', **A)
    (out/'lids.json').write_text(json.dumps(rec, indent=1))
    # orientation check on eye1: flip where the face normal points into the eye
    Ls = ec.Lids(out)
    for which in ('upper', 'lower'):
        g = Ls.state_geometry('eye1', 1., 0.)[which]
        q = Ls.faces[which]
        n = np.cross(g[q[:, 1]]-g[q[:, 0]], g[q[:, 3]]-g[q[:, 0]])
        outward = np.einsum('ij,ij->i', n, g[q].mean(1)-Ls.eyes['eye1'].c)
        good = outward > 0
        if good.mean() < 0.5:
            A['faces_'+which] = quads[:, ::-1]
        rec['faces_'+which+'_outward_share'] = float(max(good.mean(), 1-good.mean()))
    np.savez_compressed(out/'lids.npz', **A)
    rec['seconds'] = round(time.time()-t0, 1)
    (out/'lids.json').write_text(json.dumps(rec, indent=1))
    print('EYELIDS_BUILD_DONE', rec['seconds'])


if __name__ == '__main__':
    main(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]))
