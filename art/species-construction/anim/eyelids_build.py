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

Fix pass 2 (2026-11-12): the lifted field is one smooth surface over the opening and the bare zone (the socket groove above
the eye filled, a shallow dive under the face past the zone, the lid riding the rolled skin below the eye in a widened band,
offsets corrected for grazing rays and checked against the skin mesh, the lower sheet cut before radial jumps); the lid fur
takes the face fur's density measured in the ring round the zone, copies ring strands in the true surface frame turned to a
smooth heading field, lies flatter and reaches the first face-fur roots; a lash line and a dark lid margin carry the closed
line at sprite size; a wince line (arched, corners down) and wince folds.
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
    lift_at=0.08, bare_root_mm=1.6, bare_max_mm=14.0, bare_smooth_deg=1.5,
    lift_over_mm=0.15, lift_under_mm=0.35, dive_mm=3.0, fill_close_deg=8.0, fill_blur_deg=1.0, fill_keep_mm=2.0, rim_band_deg=3.0, rim_band_mm_per_deg=1.2, cap_under_mm=1.0, graze_cos_min=0.3, mesh_under_mm=0.35, jump_mm=3.0, jump_pad_deg=0.5, fillet_deg=1.5, fillet_iter=12, fillet_max_mm=0.8,
    fur_out_mm=1.0, fur_fade_mm=0.8,
    tuck_deg=3.0, far_deg=2.0, far_lower_deg=7.0, far_cap_deg=86.0, rows=120, roll_rows=4, roll_deg=1.8, seal_mm=0.15, closed_half_gap_deg=0.9,
    sag_deg=18.0, sag_power=0.8, squint_tilt_deg=7.0, squint_cheek_deg=6.0, fold_mm=0.8, fold_at_deg=9.0, fold_width_deg=2.5,
    wince_arch_deg=24.0, wince_fold_upper_mm=1.6, wince_fold_upper_at_deg=7.0, wince_fold_upper2_mm=1.0, wince_fold_upper2_at_deg=15.0,
    wince_fold_lower_mm=1.4, wince_fold_lower_at_deg=6.0, wince_fold_width_deg=2.2, wince_bunch=0.6,
    lid_columns=150, lid_theta_pad_deg=6.0,
    fur_density_scale=1.0, ring_inner_mm=2.0, ring_outer_mm=12.0, fur_src_k=10, fur_head_k=40, fur_lift_upper=0.75, fur_lift_lower=0.55, fur_root_mm=0.05, fur_clear_mm=0.12, fur_sink_mm=0.10,
    fur_emerge_deg=2.0, fur_seed=11,
    lash_count=240, lash_len_mm=5.0, lash_lower_scale=0.6, lash_tone=0.05, lash_radius_mm=0.55, lash_root_deg=0.25,
    lash_frame_deg=1.5, margin_dark=0.8, margin_dark_deg=4.0, margin_dark_lower=0.6,
    ribbon_m0_deg=-0.9, ribbon_close_widen_upper=1.5, ribbon_close_upper_min_deg=9.0, ribbon_close_lower_min_deg=5.0, caps_pad_deg=0.6)
LEVER_NOTES = {
    'delta_mm': 'lid height over the globe inside the opening (surface mm; x0.793 for rig mm)',
    'tuck_deg': 'open lid margin this far past the rim, under the skin',
    'sag_deg': 'closed line: sag below the straight corner-to-corner line at the middle',
    'closed_half_gap_deg': 'closed margins this far either side of the closed line (half the lip roll: the lips meet there)',
    'squint_tilt_deg': 'squint: inner half of the upper margin pressed this much lower',
    'squint_cheek_deg': 'squint: lower margin pushed up this much in the middle',
    'fold_mm': 'squint: height of the tension fold on the upper lid, fold_at_deg above its margin',
    'lift_at': 'share of its travel at which a lid has fully risen from its tucked field to the lifted one',
    'ribbon_m0_deg': 'the ribbon rides this far from the lid margin (negative: down onto the rolled lip)',
    'ribbon_close_upper_min_deg': 'closing, the upper ribbon band grows to at least this width in the middle (tapered to the corners): the closed line must read at 192 px',
    'ribbon_close_lower_min_deg': 'closing, the thin lower ribbon band grows to at least this width in the middle (tapered to the corners)',
    'lift_over_mm': 'pass 2: a moving lid lies this far over the bare skin round the opening (it was 0.5, which made a raised rim)',
    'lift_under_mm': 'pass 2: and this far under the skin past the bare zone, reached over dive_mm (a shallow dive, no ridge)',
    'fill_close_deg': 'pass 2: the lid surface fills the socket groove at the rim (a grey closing this wide of the lid floor), so the closed lid runs over the socket instead of sinking into it',
    'fur_out_mm': 'pass 2: lid fur roots reach this far past the bare zone toward the first face-fur roots (no bald ring between lid and face fur)',
    'fur_density_scale': 'pass 2: lid fur density as a share of the face fur density measured in the ring ring_inner_mm to ring_outer_mm outside the bare zone, per lid side',
    'fur_src_k': 'pass 2: each lid strand copies one of this many nearest face strands of the ring (shape in the true surface frame, radii and every attribute)',
    'wince_arch_deg': 'wince: the line the lids squeeze to arches this far above the straight corner-to-corner line (corners bent down)',
    'lash_tone': 'lash line: fur_tone of the short dark strands along the lid margins (the hair shader multiplies colour by fur_tone)',
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
        # wince: the line both lids squeeze to arches above the corner-to-corner line (the corners bent down, the lower lid
        # pushed up by the cheek)
        wl = pm+(pl-pm)*u+L['wince_arch_deg']*np.sin(np.pi*u)**L['sag_power']
        A[key+'winceline'] = np.where(hi_ > lo_, np.clip(wl, lo_, hi_), (rimU+rimL)/2)
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
        A[key+'sdz'] = sd
        # sheet and lid-fur extents per column: where the zone, widened fur_out_mm toward the first face-fur roots, reaches
        # above the middle and below it
        mid = (rimU+rimL)/2
        zs = sd > -L['fur_out_mm']
        furU = np.array([ph[zs[:, j] & (ph > mid[j])].max() if (zs[:, j] & (ph > mid[j])).any() else rimU[j] for j in range(len(th))])
        furL = np.array([ph[zs[:, j] & (ph < mid[j])].min() if (zs[:, j] & (ph < mid[j])).any() else rimL[j] for j in range(len(th))])
        furU, furL = np.maximum(furU, rimU), np.minimum(furL, rimL)
        A[key+'furU'], A[key+'furL'] = furU, furL
        gU, gL = (furU-rimU)[cols], (rimL-furL)[cols]
        # ---- the lifted field (pass 2). A lid that has started to move lies on one smooth surface: over the globe in the
        # opening (delta, clearing the iris), lift_over over the bare skin round it, and under the skin past the zone edge,
        # reached over dive_mm (a shallow dive: no ridge where the lid goes under the face), then cap_under deeper still so
        # the sheet's far rows clear the skin's facets. Above the eye the groove where the skin rolls into the socket at the
        # rim is filled (a grey closing of that floor, blurred, never below it), so the closed lid runs over the socket
        # instead of sinking into it with a rim round it (pass 1's raised ring in clay). Below the eye there is no groove to
        # fill (the skin runs down and out from the rim; its radial height only looks high because the globe curves away):
        # there the bare zone is widened by rim_band_deg for the lid, which rides the rolled skin of the rim at lift_over and
        # then dives, its junction with the globe ramp rounded by a capped upper envelope (no ledge, no notch).
        from scipy.ndimage import grey_closing
        clr = np.where(np.isfinite(rs), rs-rg, 0.05)
        h0 = np.where(opening, 0., np.maximum(clr, 0.))
        Hs = np.maximum(h0, gaussian_filter(h0, 0.5/step))
        ob_in = dm+(dl-dm)*ec.smooth(din/L['w_in_deg'])
        ov, un, cu = L['lift_over_mm']/1000, L['lift_under_mm']/1000, L['cap_under_mm']/1000
        # the offsets are radial; where the skin is steep to the radial direction (the cheek just under the eye) a radial
        # offset is a much smaller distance along the skin normal, and the lid grazed the skin there (streaks in clay). Each
        # offset is divided by the cosine between the ray and the skin normal (clipped at graze_cos_min)
        sk_tree = cKDTree(P['skin__v'])
        cosg = np.ones(opening.shape)
        sel_ = near_eye & ~opening
        Dg = (S3[sel_]-c)
        Dg /= np.linalg.norm(Dg, axis=1, keepdims=True)
        Ng = P['skin__n'][sk_tree.query(S3[sel_])[1]].astype(float)
        cosg[sel_] = np.abs(np.einsum('ij,ij->i', Dg, Ng))/np.maximum(np.linalg.norm(Ng, axis=1), 1e-9)
        cosg = np.maximum(gaussian_filter(cosg, 1.0/step), L['graze_cos_min'])
        ov, un, cu = ov/cosg, un/cosg, cu/cosg
        lower_half = PHg < np.interp(TH, th, (rimU+rimL)/2)
        sd_eff = np.where(lower_half & ~opening, np.maximum(sd, (L['rim_band_deg']-dout)*L['rim_band_mm_per_deg']), sd)
        over = -un+(ov+un)*ec.smooth(sd_eff/L['dive_mm'])
        ob = np.where(opening, ob_in, Hs+over)
        k = max(3, int(round(L['fill_close_deg']/step)) | 1)
        fill = gaussian_filter(grey_closing(ob, size=(k, k)), L['fill_blur_deg']/step)
        # the fill holds in the upper half: in the opening and inside the zone, fading in over fill_keep_mm from its edge
        # (so the dive is untouched)
        keep = np.where(lower_half, 0., np.where(opening, 1., ec.smooth(sd/L['fill_keep_mm'])))
        lf = np.maximum(ob, ob+(fill-ob)*keep)
        # below the eye: the junction of the globe ramp and the rolled skin rounded (an upper envelope, capped)
        env = lf.copy()
        for _ in range(L['fillet_iter']):
            env = np.maximum(lf, gaussian_filter(env, L['fillet_deg']/step))
        wf = lower_half & (opening | (sd_eff > 0))
        lf = lf+np.minimum(env-lf, L['fillet_max_mm']/1000)*wf*ec.smooth(sd_eff/L['dive_mm']+opening)
        # past the (widened) zone the lid goes on down to cap_under under the skin over 2 mm, so the sheet's far edge never
        # shows and its far rows do not graze the skin
        skin_rel = np.where(opening, 0., np.maximum(clr, 0.))
        past = (sd_eff < 0) & ~opening
        lf = np.where(past, np.minimum(lf, skin_rel-un-(cu-un)*ec.smooth(-sd_eff/2.)), lf)
        # outward from the rim along each column the lid's height over the skin never rises again: once it has dived under
        # the face it stays under (the skin's faceting otherwise lets a shallow dive cross it two or three times, streaks)
        for j in range(len(th)):
            up_rows = np.flatnonzero((ph > rimU[j]) & ~opening[:, j])
            lo_rows = np.flatnonzero((ph < rimL[j]) & ~opening[:, j])[::-1]
            for rows in (up_rows, lo_rows):
                if len(rows):
                    rel = np.minimum.accumulate(lf[rows, j]-skin_rel[rows, j])
                    lf[rows, j] = skin_rel[rows, j]+rel
        # past the zone, checked against the skin mesh itself (signed distance along the four nearest skin vertices'
        # normals): where the radial map is unreliable (the ray nearly parallel to the cheek, rs jumping tens of mm across a
        # cell) the lid is pushed down until it lies at least mesh_under_mm under the skin; then the monotone pass again
        SVk, SNk = P['skin__v'], P['skin__n'].astype(float)
        SNk = SNk/np.maximum(np.linalg.norm(SNk, axis=1, keepdims=True), 1e-9)
        selp = near_eye & ~opening & (sd_eff < 0)
        tp, pp = np.radians(TH[selp]), np.radians(PHg[selp])
        dirp = np.cos(pp)[:, None]*(np.cos(tp)[:, None]*f+np.sin(tp)[:, None]*lat)+np.sin(pp)[:, None]*up
        for _ in range(4):
            Xp = c+dirp*(rg[selp]+lf[selp])[:, None]
            dd, ii = sk_tree.query(Xp, k=4)
            sn = np.einsum('ijk,ijk->ij', Xp[:, None, :]-SVk[ii], SNk[ii]).mean(1)
            cosn = np.abs(np.einsum('ik,ijk->ij', dirp, SNk[ii]).mean(1))
            need = np.maximum(sn+L['mesh_under_mm']/1000, 0.)*(dd[:, 0] < 0.004)
            lf[selp] -= need/np.maximum(cosn, L['graze_cos_min'])
        for j in range(len(th)):
            up_rows = np.flatnonzero((ph > rimU[j]) & ~opening[:, j])
            lo_rows = np.flatnonzero((ph < rimL[j]) & ~opening[:, j])[::-1]
            for rows in (up_rows, lo_rows):
                if len(rows):
                    rel = np.minimum.accumulate(lf[rows, j]-skin_rel[rows, j])
                    lf[rows, j] = skin_rel[rows, j]+rel
        A[key+'lfield'] = lf
        A[key+'sd_eff'] = sd_eff
        # the lower sheet ends before the first row under the lower rim where the radial skin offset jumps (the ray grazes
        # the cheek there and rs leaps by tens of mm from one row to the next; rows interpolated across such a jump stood
        # outside the skin: streaks under the eye in clay)
        lowfar = np.full(len(th), -90.)
        for j in range(len(th)):
            rows = np.flatnonzero(ph < rimL[j])[::-1]
            if len(rows) < 2:
                continue
            o_ = np.where(np.isfinite(rs[rows, j]), rs[rows, j]-rg[rows, j], np.nan)
            jump = np.flatnonzero(~(np.abs(np.diff(o_)) < L['jump_mm']/1000))
            if len(jump):
                lowfar[j] = ph[rows[jump[0]]]+L['jump_pad_deg']
        from scipy.ndimage import maximum_filter1d
        A[key+'lowfar'] = maximum_filter1d(lowfar, size=5)       # the most restrictive of the neighbouring columns
        A[key+'skin_off'] = Hs
        # where a lid's fur shows: open (tucked) inside the opening only; lifted, over the zone and fur_out past it
        A[key+'show0'] = np.where(opening, ec.smooth(din/L['fur_emerge_deg']), 0.)
        A[key+'show1'] = np.where(opening, 1., ec.smooth((sd+L['fur_out_mm'])/L['fur_fade_mm']))  # (the face fur still covers the widened band below the eye)
        rec_fill = dict(fill_raise_max_mm=float(((lf-ob)*(Z & near_eye)).max()*1000),
                        over_skin_max_mm=float(((lf-Hs)*(Z & ~opening & near_eye)).max()*1000))
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
        # ---- lid fur (pass 2): the face fur of the ring round the bare zone, continued over the lid. Pass 1 copied the
        # strand just outside the rim and turned it toward the margin, at 0.3 strands per mm2 upper, with its roots stopping
        # 2 to 4 mm short of the face fur: a short, sparse, inward-combed oval with a bald ring at its edge. Now the density
        # is the face fur's own, measured per side in the ring; each strand copies one of the fur_src_k nearest ring strands
        # (its shape in the true surface frame, its radii and every attribute), so it lies, points and shades as the face fur
        # there does (away from the eye: the fur parts along the closed line, and the lid's edge strands lean over the seam);
        # and the roots run fur_out_mm past the bare zone, meeting the first face-fur roots.
        SV, SN = P['skin__v'], P['skin__n']
        stree = cKDTree(SV)
        Drf = FP[st]-c
        rthF = np.degrees(np.arctan2(Drf@lat, Drf@f))
        rphF = np.degrees(np.arctan2(Drf@up, np.hypot(Drf@lat, Drf@f)))
        frontF = ((Drf@f) > 0) & (np.abs(rthF) < 120)
        sdF = grid(sd, rthF, rphF)
        clF = np.interp(rthF, th, close)
        liveF = (rad[st] > 0) & (lens > 0.001) & frontF
        flagged_strand = np.array([flagged_any[s_:s_+n_].any() for s_, n_ in zip(st, cnt)])
        src_ok = liveF & nine & ~flagged_strand & (sdF < 0) & (sdF > -(L['ring_outer_mm']+6))
        ringF = liveF & (sdF < -L['ring_inner_mm']) & (sdF > -L['ring_outer_mm'])
        cellA = (rvis*1000)**2*np.cos(np.radians(PHg))*np.radians(step)**2
        bandG = near_eye & ~opening & (sd < -L['ring_inner_mm']) & (sd > -L['ring_outer_mm']) & (((S3-c)@f) > 0)
        clG = np.interp(TH, th, close)
        dens, ring_rec = {}, {}
        for lid, sideF, sideG in ((1, rphF > clF, PHg > clG), (-1, rphF < clF, PHg < clG)):
            n_, a_ = int((ringF & sideF).sum()), float(cellA[bandG & sideG].sum())
            dens[lid] = n_/a_ if a_ > 0 else 0.45
            ring_rec[lid] = dict(roots=n_, area_mm2=round(a_), per_mm2=round(dens[lid], 3),
                                 sources=int((src_ok & sideF).sum()))
        rng = np.random.default_rng(L['fur_seed']+(0 if e == 'eye1' else 1))
        roots = dict(lid=[], theta=[], a=[])
        for lid, span in ((1, lambda t: np.interp(t, th, furU)-(np.interp(t, th, close)+L['closed_half_gap_deg'])),
                          (-1, lambda t: (np.maximum(np.interp(t, th, close), np.interp(t, th, A[key+'winceline']))-L['closed_half_gap_deg'])-np.interp(t, th, furL))):
            tt = rng.uniform(thm-4, thl+4, 600000)
            amax = np.maximum(span(tt), 0)
            aa = rng.uniform(0, 1, len(tt))*amax.max()
            keep_ = aa < amax
            tt, aa = tt[keep_], aa[keep_]
            # the area each strand stands for is taken at its closed place; a lower-lid strand that only shows in a wince
            # (the wince line sits higher, so the lower lid is taller there) at its wince place
            pmid = np.interp(tt, th, close)+lid*(L['closed_half_gap_deg']+aa)
            if lid == -1:
                pw = np.interp(tt, th, A[key+'winceline'])-(L['closed_half_gap_deg']+aa)
                pmid = np.where(pmid >= np.interp(tt, th, furL), pmid, pw)
            r0 = grid(rg, tt, pmid)+np.maximum(grid(lf, tt, pmid), 0)
            box = (thl-thm+8)*amax.max()*np.radians(1)**2
            dA = r0**2*np.cos(np.radians(pmid))*1e6*box/600000
            keep_ = rng.uniform(0, 1, len(tt)) < np.clip(dens[lid]*L['fur_density_scale']*dA, 0, 1)
            roots['lid'].append(np.full(int(keep_.sum()), lid))
            roots['theta'].append(tt[keep_])
            roots['a'].append(aa[keep_])
        lidv = np.concatenate(roots['lid'])
        tht = np.concatenate(roots['theta'])
        aat = np.concatenate(roots['a'])
        # each lid strand's source: one of the k nearest source strands on its own side of the closed line (by its closed
        # place), picked at random weighted by 1/d^2
        pcl = np.interp(tht, th, close)+lidv*(L['closed_half_gap_deg']+aat)
        Xl = c+(np.cos(np.radians(pcl))[:, None]*(np.cos(np.radians(tht))[:, None]*f+np.sin(np.radians(tht))[:, None]*lat)
                + np.sin(np.radians(pcl))[:, None]*up)*(grid(rg, tht, pcl)+np.maximum(grid(lf, tht, pcl), grid(Hs, tht, pcl)))[:, None]
        src_idx = np.zeros(len(lidv), int)
        for lid, sideF in ((1, rphF > clF), (-1, rphF < clF)):
            cand_ = np.flatnonzero(src_ok & sideF)
            me = np.flatnonzero(lidv == lid)
            dq, iq = cKDTree(FP[st[cand_]]).query(Xl[me], k=L['fur_src_k'])
            wq = 1/(dq**2+1e-6)
            cw = np.cumsum(wq, 1)
            pick = (cw < rng.uniform(0, 1, len(me))[:, None]*cw[:, -1:]).sum(1)
            src_idx[me] = cand_[iq[np.arange(len(me)), np.minimum(pick, L['fur_src_k']-1)]]
        # headings: each lid strand keeps its source's shape (length, lift, curl) but is turned about its normal to the
        # heading of a smooth field, the distance-weighted mean (1/d^2, the fur_head_k nearest) of the ring strands' own
        # headings on its side. Copying the source's heading alone left partings down the middle of each lid where the
        # face fur's radial-from-the-eye pattern diverges; the only parting left is the closed line itself
        def frames_at(P0_):
            Dn_ = P0_-c
            t0_ = np.arctan2(Dn_@lat, Dn_@f)
            p0_ = np.arctan2(Dn_@up, np.hypot(Dn_@lat, Dn_@f))
            n_ = SN[stree.query(P0_)[1]].astype(float)
            n_ /= np.linalg.norm(n_, axis=1, keepdims=True)
            et_ = -np.sin(t0_)[:, None]*f+np.cos(t0_)[:, None]*lat
            ep_ = -np.sin(p0_)[:, None]*(np.cos(t0_)[:, None]*f+np.sin(t0_)[:, None]*lat)+np.cos(p0_)[:, None]*up
            u_ = et_-np.einsum('ij,ij->i', et_, n_)[:, None]*n_
            u_ /= np.linalg.norm(u_, axis=1, keepdims=True)
            v_ = np.cross(n_, u_)
            v_ *= np.sign(np.einsum('ij,ij->i', v_, ep_))[:, None]
            return n_, u_, v_
        heading = np.zeros((len(lidv), 2))
        for lid, sideF in ((1, rphF > clF), (-1, rphF < clF)):
            cand_ = np.flatnonzero(src_ok & sideF)
            n_, u_, v_ = frames_at(FP[st[cand_]])
            tip = FP[st[cand_]+8]-FP[st[cand_]]
            hv = np.stack([np.einsum('ij,ij->i', tip, u_), np.einsum('ij,ij->i', tip, v_)], 1)
            hv /= np.maximum(np.linalg.norm(hv, axis=1, keepdims=True), 1e-9)
            me = np.flatnonzero(lidv == lid)
            dq, iq = cKDTree(FP[st[cand_]]).query(Xl[me], k=L['fur_head_k'])
            wq = 1/(np.maximum(dq, 0.001)**2)
            hm = np.einsum('ij,ijk->ik', wq, hv[iq])
            heading[me] = hm/np.maximum(np.linalg.norm(hm, axis=1, keepdims=True), 1e-9)
        # the lash line: short dark strands along each lid margin (upper full length, lower lash_lower_scale), shown as the lid
        # moves; with the lips and the ribbon bands they make the closed line a dash that reads at sprite size
        nl = L['lash_count']
        lash_t = np.concatenate([np.sort(rng.uniform(thm+1.0, thl-1.0, nl)) for _ in (1, -1)])
        lash_lid = np.concatenate([np.full(nl, 3), np.full(nl, -3)])
        uu = np.clip((lash_t-thm)/(thl-thm), 0, 1)
        lash_len = L['lash_len_mm']/1000*np.sqrt(np.sin(np.pi*uu))*rng.uniform(0.8, 1.1, 2*nl)*np.where(lash_lid > 0, 1., L['lash_lower_scale'])
        sgn_l = np.sign(lash_lid).astype(float)
        sp = np.linspace(0, 1, 9)
        d0 = np.stack([np.full(2*nl, 0.25), -0.80*sgn_l, np.full(2*nl, 0.45)], 1)
        d0 /= np.linalg.norm(d0, axis=1, keepdims=True)
        bend = np.stack([np.zeros(2*nl), -0.25*sgn_l, -0.35*np.ones(2*nl)], 1)
        lash_prof = (sp[None, :, None]*d0[:, None, :]+(sp**2)[None, :, None]*bend[:, None, :])*lash_len[:, None, None]
        lash_rad = np.repeat((L['lash_radius_mm']/1000*(1-0.7*sp))[None], 2*nl, 0)
        # lash attributes come from the nearest lid strand's source on the same side (then pale 1 and fur_tone lash_tone)
        lash_src = np.zeros(2*nl, int)
        for ll in (1, -1):
            mine = np.flatnonzero(lidv == ll)
            ii = np.flatnonzero(np.sign(lash_lid) == ll)
            _, nn_ = cKDTree(tht[mine, None]).query(lash_t[ii, None])
            lash_src[ii] = src_idx[mine[nn_]]
        A[key+'fur_lid'] = np.concatenate([lidv, lash_lid])
        A[key+'fur_theta'] = np.concatenate([tht, lash_t])
        A[key+'fur_a'] = np.concatenate([aat, np.full(2*nl, L['lash_root_deg'])])
        nfur = len(lidv)+2*nl
        A[key+'fur_len'] = np.zeros(nfur)
        A[key+'fur_gamma'] = np.zeros(nfur)
        A[key+'fur_jit'] = np.zeros(nfur)
        A[key+'fur_profile'] = prof
        all_src = np.concatenate([src_idx, lash_src])
        A[key+'fur_src'] = all_src
        # source shapes in the true surface frame at the root: u the theta direction laid in the tangent plane, v = n x u
        # (toward +phi), w the skin normal (pass 1 used the globe's radial direction, which on the flattened front of the
        # globe tilts tens of degrees from the surface normal and stood the lid fur up)
        P0 = FP[st[src_idx]]
        Dn = P0-c
        t0s = np.arctan2(Dn@lat, Dn@f)
        p0s = np.arctan2(Dn@up, np.hypot(Dn@lat, Dn@f))
        nS = SN[stree.query(P0)[1]].astype(float)
        nS /= np.linalg.norm(nS, axis=1, keepdims=True)
        et = -np.sin(t0s)[:, None]*f+np.cos(t0s)[:, None]*lat
        ep = -np.sin(p0s)[:, None]*(np.cos(t0s)[:, None]*f+np.sin(t0s)[:, None]*lat)+np.cos(p0s)[:, None]*up
        t1 = et-np.einsum('ij,ij->i', et, nS)[:, None]*nS
        t1 /= np.linalg.norm(t1, axis=1, keepdims=True)
        t2 = np.cross(nS, t1)
        t2 *= np.sign(np.einsum('ij,ij->i', t2, ep))[:, None]
        Ds = np.stack([FP[st[i]:st[i]+9] for i in src_idx])-P0[:, None, :]
        prof3 = np.stack([np.einsum('ijk,ik->ij', Ds, t1), np.einsum('ijk,ik->ij', Ds, t2), np.einsum('ijk,ik->ij', Ds, nS)], 2)
        h0 = prof3[:, -1, :2]/np.maximum(np.linalg.norm(prof3[:, -1, :2], axis=1, keepdims=True), 1e-9)
        ang = np.arctan2(heading[:, 1], heading[:, 0])-np.arctan2(h0[:, 1], h0[:, 0])
        ca, sa = np.cos(ang)[:, None], np.sin(ang)[:, None]
        pu_, pv_ = prof3[:, :, 0].copy(), prof3[:, :, 1].copy()
        prof3[:, :, 0], prof3[:, :, 1] = pu_*ca-pv_*sa, pu_*sa+pv_*ca
        # lid fur lies flatter than the face fur round the eye (that stands at 45 to 50 degrees, and over a closed lid such
        # a pile shades the cheek under it from the key light: the grey crescent of the first pass 2 renders); the normal
        # component is scaled by fur_lift_upper / fur_lift_lower and the tangent part lengthened to keep each strand's length
        kl = np.where(lidv == 1, L['fur_lift_upper'], L['fur_lift_lower'])[:, None]
        tip = prof3[:, -1, :]
        uv2 = np.maximum((tip[:, :2]**2).sum(1), 1e-12)[:, None]
        w2 = (tip[:, 2:]**2)
        fl = np.sqrt(1+(1-kl**2)*w2/uv2)
        prof3[:, :, :2] *= fl[:, :, None]
        prof3[:, :, 2] *= kl
        A[key+'fur_prof3'] = np.concatenate([prof3, lash_prof])
        A[key+'fur_rad'] = np.concatenate([np.stack([rad[st[i]:st[i]+9] for i in src_idx]), lash_rad])
        for name, (dom, typ) in fdom.items():
            if name.startswith('.') or name in ('position', 'radius', 'curve_type') or 'furattr__'+name not in P.files:
                continue
            v = P['furattr__'+name]
            if dom == 'CURVE':
                out_v = v[all_src].copy()
                if name == 'pale':
                    out_v[len(src_idx):] = 1.
                if name == 'fur_tone':
                    out_v[len(src_idx):] = L['lash_tone']
                A[key+'fa__'+name] = out_v
            else:
                A[key+'fa__'+name] = np.concatenate([v[st[i]:st[i]+9] for i in all_src])
        # lid skin attributes (the skin shader reads pale, pad, rim, eyed, padd, solef): per lid column, the nearest skin
        # vertex 1.5 degrees past the lid-fur extent (pass 1 took it at the rim, the bare skin of the eye ring)
        for lid, edge in (('upper', furU), ('lower', furL)):
            lt = A[key+'lid_theta']
            pr = np.interp(lt, th, edge)+(1.5 if lid == 'upper' else -1.5)
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
            lid_fur_upper=int((A[key+'fur_lid'] == 1).sum()), lid_fur_lower=int((A[key+'fur_lid'] == -1).sum()),
            lash_strands=int((np.abs(A[key+'fur_lid']) == 3).sum()), ring=ring_rec, fill=rec_fill, caps_points=int(len(fi)),
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
