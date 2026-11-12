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
    lift_over_mm=0.15, lift_under_mm=0.35, dive_mm=3.0, fill_close_deg=8.0, fill_blur_deg=1.0, fill_keep_mm=2.0, rim_band_deg=0.0, rim_band_mm_per_deg=1.2, cap_under_mm=1.0, graze_cos_min=0.3, mesh_under_mm=0.35, jump_mm=3.0, jump_pad_deg=0.5, fillet_deg=1.5, fillet_iter=12, fillet_max_mm=0.0,
    fur_out_mm=1.0, fur_fade_mm=0.8,
    tuck_deg=3.0, far_deg=2.0, far_lower_deg=7.0, far_cap_deg=86.0, rows=120, roll_rows=4, roll_deg=1.8, seal_mm=0.15, closed_half_gap_deg=0.9,
    low_ramp_deg=25.0, low_rim_mm=0.15, rim_hold_mm=0.03, iris_clear_mm=0.46, low_blur_deg=1.5, low_fade_deg=8.0, low_ramp_flat_rim=True, rise_lo_mm=1.0, rise_hi_mm=3.0,
    sag_deg=18.0, sag_power=0.8, squint_tilt_deg=7.0, squint_cheek_deg=6.0, fold_mm=0.8, fold_at_deg=9.0, fold_width_deg=2.5,
    wince_arch_deg=24.0, wince_fold_upper_mm=1.6, wince_fold_upper_at_deg=7.0, wince_fold_upper2_mm=1.0, wince_fold_upper2_at_deg=15.0,
    wince_fold_lower_mm=1.4, wince_fold_lower_at_deg=6.0, wince_fold_width_deg=2.2, wince_bunch=0.6,
    lid_columns=150, lid_theta_pad_deg=6.0,
    fur_density_scale=1.0, ring_inner_mm=2.0, ring_outer_mm=12.0, fur_src_k=10, fur_head_k=40, fur_lift_upper=0.75, fur_lift_lower=0.8, fur_root_mm=0.05, fur_clear_mm=0.12, fur_sink_mm=0.10,
    fur_emerge_deg=2.0, fur_seed=11, fur_edge_lift_upper_mm=0.0, fur_edge_lift_lower_mm=4.0, heading_harmonic=True, heading_harmonic_upper=False, heading_smooth_upper_mm=6.0, heading_ring_in_mm=1.0, heading_ring_w_mm=4.0,
    heading_slit_w_deg=1.0, slit_heading_deg=30.0, slit_inner_deg_upper=-30.0, slit_inner_deg_lower=60.0, fur_reach_upper_mm=1000.0, fur_reach_lower_mm=5.5, fur_reach_dither=0.45, fur_reach_min=0.35,
    lash_count=240, lash_len_mm=5.0, lash_lower_scale=0.6, lash_tone=0.05, lash_radius_mm=0.55, lash_root_deg=0.25,
    lash_frame_deg=1.5, margin_dark=0.8, margin_dark_deg=4.0, margin_dark_lower=0.6,
    ribbon_m0_deg=-0.9, ribbon_close_widen_upper=1.5, ribbon_close_upper_min_deg=9.0, ribbon_close_lower_min_deg=5.0, caps_pad_deg=0.6,
    xfade_mm=4.0, src_foot_lower=True, src_foot_upper=False, src_band_lower_mm=[1.6, 9.0], foot_deg=1.0, fb_extent_mm=8.0, fb_seed=23,
    edge_hide_mm=3.0, ribbon_end_fade_deg=0.75, fur_density_scale_lower=1.3,
    src_k_lower=30, src_uniform_lower=True,
    corner_count=60, corner_from_deg=-0.5, corner_to_deg=4.0, corner_off_deg=1.2, corner_len_mm=4.0, corner_lift=0.5)
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
    'low_ramp_deg': 'pass 3: below the eye the closed lid rises from low_rim_mm over the globe at the rim to delta over this many degrees, never under the iris plus iris_clear_mm (pass 2 rose within w_in_deg and stood a roll over the lower rim)',
    'rim_band_deg': 'pass 2 widened the lower zone by this much for the lid to ride the rolled rim skin; 0 since pass 3 (it held the lid 0.6 mm over the skin below the rim, over face-fur roots)',
    'fillet_max_mm': 'pass 2 rounded the lower junction by raising it up to this much; 0 since pass 3 (it made the 2.7 mm roll above the lower rim)',
    'fur_edge_lift_lower_mm': 'pass 3: the lower lid fur flattening (fur_lift_lower) fades out over this distance inside the lid fur edge, so edge strands lie as the face fur next to them (upper: fur_edge_lift_upper_mm, 0 = off, as pass 2)',
    'fur_reach_lower_mm': 'pass 3: no lower lid strand reaches more than this past the lid fur edge, about one face strand at the lower rim (longer ones are shortened as a whole, to fur_reach_min of their length at least): pass 2 lower lid strands reached up to 10 mm and more past it over the flat, dense face fur below the eye, a doubled layer that darkened it (the crescent). The upper lid is not capped (fur_reach_upper_mm): its overlap darkens nothing, and a cap there drew the lid edge as a ring',
    'heading_smooth_upper_mm': 'pass 3: the upper lid keeps the pass 2 heading field (heading_harmonic_upper False) smoothed among its own strands with this Gaussian (two passes): the V above the inner half of the eye',
    'heading_harmonic': 'pass 3 (the lower lid; the upper lid only with heading_harmonic_upper): lid fur headings are the harmonic fill of the face fur headings round the lid and of slit_heading_deg along the closed line (no source or parting inside a lid)',
    'slit_heading_deg': 'pass 3: along the closed line the lid fur points away from it, turned this many degrees toward the outer corner',
    'xfade_mm': 'pass 4: the lid fur and the face fur cross-fade over this band outside the lid fur edge (sd -fur_out_mm to -(fur_out_mm+xfade_mm)): lid fur roots run on into it at a density ramping from full to none, and the face fur rooted there is hidden at the complementary share (per strand, at random), so each point has one layer of fur at the face density, not the lid fur lying over the face fur (0 = pass 3: lid fur roots stop at -fur_out_mm, the face fur all kept)',
    'src_foot_lower': "pass 4: each lower lid strand copies a face strand from the band just outside the lid (src_band_lower_mm out from the zone edge, between the corners, nearest to the strand's foot: its own column foot_deg past the lid fur edge, or its own place when it lies in the cross-fade band), and the lower lid density is measured in that band. Pass 3 copied ring strands 2 to 12 mm out nearest to the strand's closed place: 5.4 to 7.9 mm long against 2.5 to 2.9 mm for the face fur below the eye, 2.3 times its fibre per mm2 (the grey oval)",
    'fur_density_scale_lower': 'pass 4: the lower lid density on top of fur_density_scale: the lower lid copies the short strands nearest its edge (2.8 mm on average) while the face fur below the eye also carries longer strands from farther out lying over it (3.3 mm on average in the band, fibre 2.2 to 2.9 mm per mm2); at 1.0 the lower lid had 1.8 to 2.4 mm of fibre per mm2 against 2.3 to 2.9 in the face fur below it (eyelids_coverage.py)',
    'fur_lift_lower': 'pass 4: the lower lid fur lies at this share of its source strand lift (0.55 in passes 2 and 3; with the short strands it now copies, 0.55 laid them into a smooth, pale stubble)',
    'corner_count': "pass 4: the outer end of the closed line: this many face-fur strands rooted along the line's extension past the ribbon's outer end (corner_from_deg to corner_to_deg of theta past it, within corner_off_deg of the line), lying along it toward the outer corner (at most corner_len_mm, lift x corner_lift), shown as both lids near the line. The lid fur on either side points away from the line, and past the ribbon's end nothing covered the strip between: the bare skin the open ribbon's flick had lain over showed there (the pale spot). 0 = none",
    'src_k_lower': 'pass 4: the lower lid strand picks its source among this many band strands nearest its foot (with src_uniform_lower, at equal weight)',
    'fb_extent_mm': 'pass 4: face strands rooted within this far outside the zone edge are recorded (lids.npz fb_*) for the cross-fade and the nofaceband cause test',
    'edge_hide_mm': 'pass 4 cause test (flag noedgelid): lid fur strands rooted at sd under this (the outer band of the lid fur) are hidden',
    'ribbon_end_fade_deg': "pass 4: the lid fur cut under the ribbon band (and its thinning over it) fades out over this past the ribbon's own end: past the outer end of the closed line the cut stood 4 degrees wide with no ribbon there, and the bare lid sheet showed (the pale spot)",
}


def main(maps_dir, probe_dir, out, overrides=None):
    t0 = time.time()
    out.mkdir(parents=True, exist_ok=True)
    L = dict(LEVERS)
    if overrides:
        L.update(overrides)
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

    def nine_of(i, v):
        """Fix pass 4: a strand's per-point values at 9 points evenly along its length (a 9-point strand as it is). Below the
        eye most face strands are short and carry 27 to 60 points (pale, 2.1 to 3.4 mm); the lid fur's strands have 9."""
        s_, n_ = st[i], cnt[i]
        if n_ == 9:
            return v[s_:s_+9]
        seg_ = np.linalg.norm(np.diff(FP[s_:s_+n_], axis=0), axis=1)
        u_ = np.r_[0, np.cumsum(seg_)]
        u_ = u_/max(u_[-1], 1e-12)
        q_ = np.linspace(0, 1, 9)
        vv = np.asarray(v[s_:s_+n_])
        if vv.dtype.kind in 'iub':
            return vv[np.clip(np.searchsorted(u_, q_), 0, n_-1)]
        if vv.ndim == 1:
            return np.interp(q_, u_, vv)
        return np.stack([np.interp(q_, u_, vv[:, k]) for k in range(vv.shape[1])], 1)
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
        # fix pass 4: the lid fur roots run on past the lid fur edge over the cross-fade band (xfade_mm); the sheet keeps furU/furL
        xf = L['xfade_mm']
        if xf > 0:
            zs2 = sd > -(L['fur_out_mm']+xf)
            rootU = np.array([ph[zs2[:, j] & (ph > mid[j])].max() if (zs2[:, j] & (ph > mid[j])).any() else furU[j] for j in range(len(th))])
            rootL = np.array([ph[zs2[:, j] & (ph < mid[j])].min() if (zs2[:, j] & (ph < mid[j])).any() else furL[j] for j in range(len(th))])
            rootU, rootL = np.maximum(rootU, furU), np.minimum(rootL, furL)
        else:
            rootU, rootL = furU, furL
        A[key+'rootU'], A[key+'rootL'] = rootU, rootL
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
        # fix pass 3: below the eye the closed lid rises from the rim slowly (low_ramp_deg) from low_rim_mm over the globe, and
        # only as high as the iris needs (iris_clear_mm over it), instead of reaching delta within w_in_deg. Pass 2's steep rise,
        # with its rounded junction (a capped upper envelope up to fillet_max_mm), stood a roll 2.7 mm over the globe just above
        # the lower rim, 1 mm proud of the skin at the rim: a puffy under-eye bag and its shadow on the cheek below (the crescent)
        if L['low_ramp_deg'] > 0:
            ri_ = M[key+'ri']
            need = np.where(np.isfinite(ri_), ri_-rg+L['iris_clear_mm']/1000, -1.)
            need = np.maximum(need, gaussian_filter(np.where(np.isfinite(ri_), need, 0.), 1.0/step))
            ramp = L['low_rim_mm']/1000+(dl-L['low_rim_mm']/1000)*ec.smooth(din/L['low_ramp_deg'])
            low_in = gaussian_filter(np.maximum(ramp, need), L['low_blur_deg']/step)
            low_in = np.maximum(np.maximum(low_in, need), dm)
            # only under the opening's middle, faded out toward it, so the closed line and the upper lid are as pass 2
            mid_ = np.interp(TH, th, (rimU+rimL)/2)
            wlow = ec.smooth((mid_-PHg)/L['low_fade_deg'])
            if L['low_ramp_flat_rim']:
                # also wherever the skin just outside the rim stays low (the inner and outer edges of the eye): the upper lid
                # stood 1.9 mm proud of the skin along the inner edge, a cliff from the brow down to the inner corner (the V
                # seen from the side). Where the skin rolls up into the brow above the eye the lid keeps pass 2's height
                # (the socket fill meets the skin there). Per opening cell: the skin's height over the globe at the nearest
                # cell 3 to 5 degrees outside the rim; the ramp applies in full under rise_lo_mm, not at all over rise_hi_mm
                band_ = ~opening & (dout >= 3.) & (dout <= 5.) & np.isfinite(rs)
                _, (bi_, bj_) = distance_transform_edt(~band_, sampling=step, return_indices=True)
                rise = np.clip(rs[bi_, bj_]-rg[bi_, bj_], 0, None)*1000
                wflat = 1-ec.smooth((rise-L['rise_lo_mm'])/(L['rise_hi_mm']-L['rise_lo_mm']))
                wlow = np.maximum(wlow, gaussian_filter(wflat, 2.0/step))
            ob_in = np.where(opening, np.minimum(ob_in, ob_in+(low_in-ob_in)*wlow), ob_in)
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
        # fix pass 3: the first ring of cells outside the opening holds the lid just under the skin there (rim_hold_mm), not
        # the full dive: a lid sheet vertex inside the opening interpolates between its cell and these, and with the lower lid
        # now low at the rim (low_rim_mm) a dive in the next cell drew the sheet into the globe just inside the rim
        ring1 = ~opening & (dout <= step*1.01)
        lf = np.where(ring1, np.maximum(lf, np.minimum(L['low_rim_mm']/1000, skin_rel-L['rim_hold_mm']/1000)), lf)
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
        A[key+'show1'] = np.where(opening, 1., ec.smooth((sd+L['fur_out_mm']+L['xfade_mm'])/L['fur_fade_mm']))  # (the face fur still covers the widened band below the eye)
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
        # fix pass 4: the same, signed: how far each band reaches away from the eye (up for the upper ribbon, down for the
        # lower). At the outer end the upper ribbon's flick curls down into the eye (up to 1.7 degrees below its rim), so the
        # unsigned width cut the upper lid fur up to 4 degrees above the margin where no ribbon lies: the pale spot
        ext_s = np.where(cls[:, None] == 1, rph-ph0[:, None], ph0[:, None]-rph).max(1).clip(0)
        wus, wls = np.zeros(len(bt)), np.zeros(len(bt))
        for k, t in enumerate(bt):
            near = np.abs(th0-t) < 1.5
            if (near & (cls == 1)).any():
                wus[k] = ext_s[near & (cls == 1)].max()
            if (near & (cls == -1)).any():
                wls[k] = ext_s[near & (cls == -1)].max()
        A[key+'band_upper_out'], A[key+'band_lower_out'] = wus, wls
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
        foot = {1: L['src_foot_upper'], -1: L['src_foot_lower']}
        sb0, sb1 = L['src_band_lower_mm']
        nearF = np.linalg.norm(Drf, axis=1) < grid(rvis, rthF, rphF)+0.003      # rooted on the skin round the eye, not on the muzzle
        ringFb = liveF & (sdF < -sb0) & (sdF > -sb1) & nearF & (rthF > thm) & (rthF < thl)
        bandGb = near_eye & ~opening & (sd < -sb0) & (sd > -sb1) & (((S3-c)@f) > 0) & (TH > thm) & (TH < thl)
        for lid, sideF, sideG in ((1, rphF > clF, PHg > clG), (-1, rphF < clF, PHg < clG)):
            if foot[lid]:
                # fix pass 4: the density of the band the lid strands copy, between the corners
                n_, a_ = int((ringFb & sideF).sum()), float(cellA[bandGb & sideG].sum())
                dens[lid] = n_/a_ if a_ > 0 else 0.45
                ring_rec[lid] = dict(roots=n_, area_mm2=round(a_), per_mm2=round(dens[lid], 3), band_mm=[sb0, sb1])
                continue
            n_, a_ = int((ringF & sideF).sum()), float(cellA[bandG & sideG].sum())
            dens[lid] = n_/a_ if a_ > 0 else 0.45
            ring_rec[lid] = dict(roots=n_, area_mm2=round(a_), per_mm2=round(dens[lid], 3),
                                 sources=int((src_ok & sideF).sum()))
        rng = np.random.default_rng(L['fur_seed']+(0 if e == 'eye1' else 1))
        roots = dict(lid=[], theta=[], a=[])
        for lid, span in ((1, lambda t: np.interp(t, th, rootU)-(np.interp(t, th, close)+L['closed_half_gap_deg'])),
                          (-1, lambda t: (np.maximum(np.interp(t, th, close), np.interp(t, th, A[key+'winceline']))-L['closed_half_gap_deg'])-np.interp(t, th, rootL))):
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
                pmid = np.where(pmid >= np.interp(tt, th, rootL), pmid, pw)
            r0 = grid(rg, tt, pmid)+np.maximum(grid(lf, tt, pmid), 0)
            box = (thl-thm+8)*amax.max()*np.radians(1)**2
            dA = r0**2*np.cos(np.radians(pmid))*1e6*box/600000
            keep_ = rng.uniform(0, 1, len(tt)) < np.clip(dens[lid]*L['fur_density_scale']*(L['fur_density_scale_lower'] if lid == -1 else 1.)*dA, 0, 1)
            roots['lid'].append(np.full(int(keep_.sum()), lid))
            roots['theta'].append(tt[keep_])
            roots['a'].append(aa[keep_])
        lidv = np.concatenate(roots['lid'])
        tht = np.concatenate(roots['theta'])
        aat = np.concatenate(roots['a'])
        # each lid strand's source: one of the k nearest source strands on its own side of the closed line (by its closed
        # place), picked at random weighted by 1/d^2
        pcl = np.interp(tht, th, close)+lidv*(L['closed_half_gap_deg']+aat)
        # fix pass 3: each strand's home, where it shows: its closed place, or for a lower-lid strand that only shows in a
        # wince (its closed place is past the lid fur's extent) its wince place. The heading, the edge lift and the reach
        # are taken there; taken at the closed place, these strands came out short and standing, a lens-shaped patch of
        # stubble in the wincing lower lid
        pwin = np.interp(tht, th, A[key+'winceline'])-(L['closed_half_gap_deg']+aat)
        phome = np.where((lidv == -1) & (pcl < np.interp(tht, th, rootL)), pwin, pcl)
        Xl = c+(np.cos(np.radians(pcl))[:, None]*(np.cos(np.radians(tht))[:, None]*f+np.sin(np.radians(tht))[:, None]*lat)
                + np.sin(np.radians(pcl))[:, None]*up)*(grid(rg, tht, pcl)+np.maximum(grid(lf, tht, pcl), grid(Hs, tht, pcl)))[:, None]
        src_idx = np.zeros(len(lidv), int)
        for lid, sideF in ((1, rphF > clF), (-1, rphF < clF)):
            cand_ = np.flatnonzero(src_ok & sideF)
            me = np.flatnonzero(lidv == lid)
            Xq = Xl[me]
            if foot[lid]:
                # fix pass 4: from the band just outside the lid, between the corners, nearest to the strand's foot (its column,
                # foot_deg past the lid fur edge; a strand in the cross-fade band is its own foot)
                cand_ = np.flatnonzero(liveF & (cnt >= 9) & ~flagged_strand & sideF & (sdF < -sb0) & (sdF > -sb1) & nearF & (rthF > thm) & (rthF < thl))
                edge_ = np.interp(tht[me], th, furU if lid == 1 else furL)+lid*L['foot_deg']
                pf = np.where(lid*(phome[me]-edge_) < 0, edge_, phome[me])
                tf = tht[me]
                Xq = c+(np.cos(np.radians(pf))[:, None]*(np.cos(np.radians(tf))[:, None]*f+np.sin(np.radians(tf))[:, None]*lat)
                        + np.sin(np.radians(pf))[:, None]*up)*grid(rvis, tf, pf)[:, None]
            kq = L['src_k_lower'] if (foot[lid] and lid == -1) else L['fur_src_k']
            dq, iq = cKDTree(FP[st[cand_]]).query(Xq, k=kq)
            wq = 1/(dq**2+1e-6)
            if foot[lid] and lid == -1 and L['src_uniform_lower']:
                # fix pass 4: any of the src_k_lower nearest band strands with equal weight, so the lower lid carries the
                # band's own mix of short pale strands and the longer ones from farther out (nearest-first gave only the short
                # ones at the rim: a pale, even stubble)
                wq = np.ones_like(wq)
            cw = np.cumsum(wq, 1)
            pick = (cw < rng.uniform(0, 1, len(me))[:, None]*cw[:, -1:]).sum(1)
            src_idx[me] = cand_[iq[np.arange(len(me)), np.minimum(pick, kq-1)]]
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
        # fix pass 3: the heading field over each lid is the harmonic (Laplace) fill of the face fur's headings in a band
        # round the lid (Dirichlet) and of a fixed heading along the closed line: away from it, turned slit_heading_deg toward
        # the outer corner. The face fur round the eye points away from the eye all round, so a plain distance-weighted mean
        # of it (pass 2) holds a source inside the lid: a starburst parting on the closed lower lid and a sharp turn of the
        # upper lid fur above the inner half of the eye (the V seen from the side). With the closed line as part of the
        # boundary, each lid's boundary headings turn through no full circle, and the fill has no source or parting inside
        # fix pass 3: the upper lid keeps pass 2's field (its tone over the lid matched the face fur; a different heading
        # there darkened the whole upper lid by 9 to 10 levels) smoothed among the upper lid strands themselves (Gaussian,
        # heading_smooth_upper_mm, two passes), which spreads the sharp turn from up to back above the inner half of the eye
        # (the V seen from the side) over the lid
        if L['heading_smooth_upper_mm'] > 0:
            me = np.flatnonzero(lidv == 1)
            sig = L['heading_smooth_upper_mm']/1000
            tq_ = cKDTree(Xl[me])
            pairs = tq_.query_ball_point(Xl[me], 3*sig)
            for _ in range(2):
                hh = heading[me].copy()
                for k_, js in enumerate(pairs):
                    js = np.asarray(js)
                    w_ = np.exp(-0.5*(np.linalg.norm(Xl[me[js]]-Xl[me[k_]], axis=1)/sig)**2)
                    v_ = (w_[:, None]*hh[js]).sum(0)
                    heading[me[k_]] = v_/max(np.linalg.norm(v_), 1e-9)
        if L['heading_harmonic']:
            from scipy.sparse import coo_matrix
            from scipy.sparse.linalg import spsolve
            hfield = {}
            for lid, sideF, sideG in ((1, rphF > clF, PHg > clG), (-1, rphF < clF, PHg < clG)):
                if lid == 1 and not L['heading_harmonic_upper']:
                    continue
                cand_ = np.flatnonzero(src_ok & sideF)
                n_, u_, v_ = frames_at(FP[st[cand_]])
                tip = FP[st[cand_]+8]-FP[st[cand_]]
                hv = np.stack([np.einsum('ij,ij->i', tip, u_), np.einsum('ij,ij->i', tip, v_)], 1)
                hv /= np.maximum(np.linalg.norm(hv, axis=1, keepdims=True), 1e-9)
                inner = L['fur_out_mm']+L['heading_ring_in_mm']
                region = near_eye & sideG & (sd > -(inner+L['heading_ring_w_mm'])) & (TH > thm-14) & (TH < thl+14)
                ring_c = region & (sd <= -inner)
                slit_c = region & (np.abs(PHg-clG) < L['heading_slit_w_deg']) & (TH > thm) & (TH < thl)
                fixed = ring_c | slit_c
                val = np.zeros(opening.shape+(2,))
                dq, iq = cKDTree(FP[st[cand_]]).query(S3[ring_c], k=12)
                wq = 1/(np.maximum(dq, 0.001)**2)
                hm = np.einsum('ij,ijk->ik', wq, hv[iq])
                val[ring_c] = hm/np.maximum(np.linalg.norm(hm, axis=1, keepdims=True), 1e-9)
                # away from the line (90 up on the upper lid, -90 down on the lower), turned toward the outer corner by
                # slit_heading_deg at its outer end and toward the nose by slit_inner_deg (per lid) at its inner end, linearly
                # between: the lower lid's face fur in front of the inner corner points forward, and a lid heading turned the
                # other way there met it head on (a small parting at the inner corner)
                uu_ = np.clip((TH-thm)/(thl-thm), 0, 1)
                tilt = -L['slit_inner_deg_upper' if lid == 1 else 'slit_inner_deg_lower']*(1-uu_)+L['slit_heading_deg']*uu_
                a_ = np.radians(90.*lid-lid*tilt)
                sl_ = slit_c & ~ring_c
                val[sl_] = np.stack([np.cos(a_[sl_]), np.sin(a_[sl_])], 1)
                idx = -np.ones(opening.shape, int)
                unk = region & ~fixed
                idx[unk] = np.arange(unk.sum())
                cphi = np.maximum(np.cos(np.radians(PHg)), 0.2)
                rows, cols, vals = [], [], []
                rhs = np.zeros((unk.sum(), 2))
                diag = np.zeros(unk.sum())
                ii, jj = np.nonzero(unk)
                me_ = idx[ii, jj]
                for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    i2, j2 = ii+di, jj+dj
                    ok = (i2 >= 0) & (i2 < opening.shape[0]) & (j2 >= 0) & (j2 < opening.shape[1])
                    i2, j2, m_ = i2[ok], j2[ok], me_[ok]
                    wgt = np.ones(len(i2)) if dj == 0 else 1/cphi[ii[ok], jj[ok]]**2
                    inreg = region[i2, j2]
                    i2, j2, m_, wgt = i2[inreg], j2[inreg], m_[inreg], wgt[inreg]
                    np.add.at(diag, m_, wgt)
                    u2 = unk[i2, j2]
                    rows += list(m_[u2]); cols += list(idx[i2[u2], j2[u2]]); vals += list(-wgt[u2])
                    np.add.at(rhs, m_[~u2], wgt[~u2, None]*val[i2[~u2], j2[~u2]])
                Amat = coo_matrix((np.r_[vals, diag], (np.r_[rows, np.arange(len(diag))], np.r_[cols, np.arange(len(diag))])),
                                  shape=(len(diag), len(diag))).tocsr()
                sol = np.stack([spsolve(Amat, rhs[:, 0]), spsolve(Amat, rhs[:, 1])], 1)
                Fh = val.copy()
                Fh[unk] = sol
                hfield[lid] = Fh
                me = np.flatnonzero(lidv == lid)
                hh = np.stack([grid(Fh[..., 0], tht[me], phome[me]), grid(Fh[..., 1], tht[me], phome[me])], 1)
                nrm = np.linalg.norm(hh, axis=1)
                rec_h = rec.setdefault('heading', {}).setdefault(e, {})
                rec_h[str(lid)] = dict(cells=int(region.sum()), ring_cells=int(ring_c.sum()), slit_cells=int(slit_c.sum()),
                                       weakest=float(nrm.min()), weak_under_0p2=int((nrm < 0.2).sum()))
                # a strand whose closed place lies outside the filled region (lower-lid strands that only show in a wince,
                # whose closed place is past the lid fur's extent) keeps the distance-weighted mean, as in pass 2
                ok_ = nrm > 0.2
                heading[me[ok_]] = hh[ok_]/nrm[ok_, None]
            A[key+'heading_lower'] = hfield[-1]
            if 1 in hfield:
                A[key+'heading_upper'] = hfield[1]
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
        # fix pass 4: the corner strands (lid 5) along the closed line's extension past the ribbon's outer end
        nc_ = int(L['corner_count'])
        rngc = np.random.default_rng(L['fb_seed']+(5 if e == 'eye1' else 6))
        rib_hi = float(th0[cls == 1].max()) if (cls == 1).any() else thl
        cor_t = rib_hi+rngc.uniform(L['corner_from_deg'], L['corner_to_deg'], nc_)
        cor_off = rngc.uniform(-L['corner_off_deg'], L['corner_off_deg'], nc_)
        cor_src = np.zeros(nc_, int)
        if nc_:
            pc_ = np.interp(cor_t, th, close)+cor_off
            Xc_ = c+(np.cos(np.radians(pc_))[:, None]*(np.cos(np.radians(cor_t))[:, None]*f+np.sin(np.radians(cor_t))[:, None]*lat)
                     + np.sin(np.radians(pc_))[:, None]*up)*grid(rvis, cor_t, pc_)[:, None]
            cand_ = np.flatnonzero(src_ok)
            _, iq = cKDTree(FP[st[cand_]]).query(Xc_, k=6)
            cor_src = cand_[iq[np.arange(nc_), rngc.integers(0, 6, nc_)]]
        rng4 = np.random.default_rng(L['fb_seed']+(0 if e == 'eye1' else 1))
        A[key+'fur_u'] = np.concatenate([rng4.uniform(0, 1, len(lidv)), np.zeros(2*nl), np.zeros(nc_)])
        # fix pass 4: the face strands rooted within fb_extent_mm outside the zone edge (on the skin round the eye, near the eye
        # in theta): their point indices in the fur object, root sd, side of the closed line and a random number each
        fbs = np.flatnonzero(liveF & nearF & (sdF > -L['fb_extent_mm']) & (rthF > thm-14) & (rthF < thl+14))
        A[key+'fb_sd'] = sdF[fbs]
        A[key+'fb_side'] = np.where(rphF[fbs] > clF[fbs], 1, -1)
        A[key+'fb_v'] = rng4.uniform(0, 1, len(fbs))
        A[key+'fb_pidx'] = np.concatenate([gofs[i]+np.arange(cnt[i]) for i in fbs]) if len(fbs) else np.zeros(0, int)
        A[key+'fb_pstrand'] = np.repeat(np.arange(len(fbs)), cnt[fbs])
        A[key+'rib_ext'] = np.array([th0[cls == 1].min(), th0[cls == 1].max(), th0[cls == -1].min(), th0[cls == -1].max()])
        A[key+'fur_lid'] = np.concatenate([lidv, lash_lid, np.full(nc_, 5)])
        A[key+'fur_theta'] = np.concatenate([tht, lash_t, cor_t])
        A[key+'fur_a'] = np.concatenate([aat, np.full(2*nl, L['lash_root_deg']), cor_off])
        nfur = len(lidv)+2*nl+nc_
        A[key+'fur_len'] = np.zeros(nfur)
        A[key+'fur_gamma'] = np.zeros(nfur)
        A[key+'fur_jit'] = np.zeros(nfur)
        A[key+'fur_profile'] = prof
        all_src = np.concatenate([src_idx, lash_src, cor_src])
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
        Ds = np.stack([nine_of(i, FP) for i in src_idx])-P0[:, None, :]
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
        # fix pass 3: on the lower lid the flattening fades out toward the lid fur's edge (fur_edge_lift_lower_mm), so the
        # strands there lie as the face strands next to them (the upper lid as pass 2)
        sdl = grid(sd, tht, phome)
        el = np.where(lidv == 1, L['fur_edge_lift_upper_mm'], L['fur_edge_lift_lower_mm'])
        fade = np.where(el > 0, ec.smooth((sdl+L['fur_out_mm'])/np.maximum(el, 1e-6)), 1.)
        kl = 1-(1-kl)*fade[:, None]
        tip = prof3[:, -1, :]
        uv2 = np.maximum((tip[:, :2]**2).sum(1), 1e-12)[:, None]
        w2 = (tip[:, 2:]**2)
        fl = np.sqrt(1+(1-kl**2)*w2/uv2)
        prof3[:, :, :2] *= fl[:, :, None]
        prof3[:, :, 2] *= kl
        # fix pass 3: no lower lid strand reaches more than fur_reach_lower_mm past the lid fur's edge (sd = -fur_out_mm)
        # along the surface; a longer one is shortened as a whole (its shape kept, at least fur_reach_min of its length).
        # Pass 2's lower lid strands copied ring strands 2 to 12 mm out (7.6 mm long against 4.8 mm for the face fur at the
        # rim) and their tips reached 10 mm and more past the edge, a second layer over the flat (0.5 mm high), dense face fur
        # below the eye that darkened it by up to 33 levels (the crescent). The upper lid is not capped (fur_reach_upper_mm)
        rr_ = grid(rg, tht, phome)+np.maximum(grid(lf, tht, phome), 0.)
        dth = np.degrees(prof3[:, :, 0]/(rr_[:, None]*np.cos(np.radians(phome))[:, None]))
        dph = np.degrees(prof3[:, :, 1]/rr_[:, None])
        sdk = grid(sd, tht[:, None]+dth, phome[:, None]+dph)
        # each strand's reach is dithered (fur_reach_dither, uniform either side), so the tips end at varied distances and
        # do not draw a line where the lid fur stops
        dith = 1+L['fur_reach_dither']*np.random.default_rng(L['fur_seed']+(7 if e == 'eye1' else 8)).uniform(-1, 1, len(lidv))
        # (fix pass 4: measured from the strand's own root where that lies in the cross-fade band)
        lim = (np.minimum(-L['fur_out_mm'], sdl)-np.where(lidv == 1, L['fur_reach_upper_mm'], L['fur_reach_lower_mm'])*dith)[:, None]
        beyond = sdk < lim
        first = np.where(beyond.any(1), beyond.argmax(1), 9)
        k0 = np.maximum(first-1, 0)
        a0 = sdk[np.arange(len(sdk)), k0]
        a1 = sdk[np.arange(len(sdk)), np.minimum(first, 8)]
        frac = np.clip((a0-lim[:, 0])/np.maximum(a0-a1, 1e-9), 0, 1)
        q = np.where(first < 9, np.maximum((k0+frac*(first > 0))/8, L['fur_reach_min']), 1.)
        prof3 *= q[:, None, None]
        rec_reach = dict(shortened=int((q < 1).sum()), of=int(len(q)), min_scale=float(q.min()))
        # corner strands: the source's shape in its surface frame, turned to lie along +theta (toward the outer corner),
        # flattened (corner_lift) and capped at corner_len_mm
        if nc_:
            Pc0 = FP[st[cor_src]]
            Dc = Pc0-c
            tc_ = np.arctan2(Dc@lat, Dc@f)
            pc0 = np.arctan2(Dc@up, np.hypot(Dc@lat, Dc@f))
            nC = SN[stree.query(Pc0)[1]].astype(float)
            nC /= np.linalg.norm(nC, axis=1, keepdims=True)
            etc = -np.sin(tc_)[:, None]*f+np.cos(tc_)[:, None]*lat
            epc = -np.sin(pc0)[:, None]*(np.cos(tc_)[:, None]*f+np.sin(tc_)[:, None]*lat)+np.cos(pc0)[:, None]*up
            u1 = etc-np.einsum('ij,ij->i', etc, nC)[:, None]*nC
            u1 /= np.linalg.norm(u1, axis=1, keepdims=True)
            u2 = np.cross(nC, u1)
            u2 *= np.sign(np.einsum('ij,ij->i', u2, epc))[:, None]
            Dcs = np.stack([nine_of(i, FP) for i in cor_src])-Pc0[:, None, :]
            cp3 = np.stack([np.einsum('ijk,ik->ij', Dcs, u1), np.einsum('ijk,ik->ij', Dcs, u2), np.einsum('ijk,ik->ij', Dcs, nC)], 2)
            hc = cp3[:, -1, :2]/np.maximum(np.linalg.norm(cp3[:, -1, :2], axis=1, keepdims=True), 1e-9)
            angc = rngc.uniform(-0.25, 0.25, nc_)-np.arctan2(hc[:, 1], hc[:, 0])
            ca_, sa_ = np.cos(angc)[:, None], np.sin(angc)[:, None]
            a_u, a_v = cp3[:, :, 0].copy(), cp3[:, :, 1].copy()
            cp3[:, :, 0], cp3[:, :, 1] = a_u*ca_-a_v*sa_, a_u*sa_+a_v*ca_
            cp3[:, :, 2] *= L['corner_lift']
            lc = np.linalg.norm(np.diff(cp3, axis=1), axis=2).sum(1)
            cp3 *= np.minimum(1., L['corner_len_mm']/1000/np.maximum(lc, 1e-9))[:, None, None]
            cor_rad = np.stack([nine_of(i, rad) for i in cor_src])
        else:
            cp3, cor_rad = np.zeros((0, 9, 3)), np.zeros((0, 9))
        A[key+'fur_prof3'] = np.concatenate([prof3, lash_prof, cp3])
        A[key+'fur_rad'] = np.concatenate([np.stack([nine_of(i, rad) for i in src_idx]), lash_rad, cor_rad])
        for name, (dom, typ) in fdom.items():
            if name.startswith('.') or name in ('position', 'radius', 'curve_type') or 'furattr__'+name not in P.files:
                continue
            v = P['furattr__'+name]
            if dom == 'CURVE':
                out_v = v[all_src].copy()
                if name == 'pale':
                    out_v[len(src_idx):len(src_idx)+2*nl] = 1.
                if name == 'fur_tone':
                    out_v[len(src_idx):len(src_idx)+2*nl] = L['lash_tone']
                A[key+'fa__'+name] = out_v
            else:
                A[key+'fa__'+name] = np.concatenate([nine_of(i, v) for i in all_src])
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
            lash_strands=int((np.abs(A[key+'fur_lid']) == 3).sum()), ring=ring_rec, reach=rec_reach, fill=rec_fill, caps_points=int(len(fi)),
            face_band_strands=int(len(fbs)), face_band_points=int(len(A[key+'fb_pidx'])), corner_strands=int(nc_),
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
    # an optional fourth argument: a JSON object of lever overrides (for trials; the levers used are written to lids.json)
    main(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]), json.loads(sys.argv[4]) if len(sys.argv) > 4 else None)
