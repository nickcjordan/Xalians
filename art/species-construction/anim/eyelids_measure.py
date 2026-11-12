"""Akinza eyelids fix pass 2: the numbers behind the lid look (PIL, numpy, scipy; no Blender).

  python art/species-construction/anim/eyelids_measure.py patch <png> <masks npz> <eye> <out prefix> [--label text]
  python art/species-construction/anim/eyelids_measure.py dash <sprite png> <masks npz> <eye> [--json out]
  python art/species-construction/anim/eyelids_measure.py vband <png> <masks npz> <eye> [--lids dir] [--json out]
  python art/species-construction/anim/eyelids_measure.py crescent <open png> <open masks> <eye> <out prefix> name=<png> ...
      [--lids <lids dir>] [--label text]
  python art/species-construction/anim/eyelids_measure.py outline <png> <masks npz> <eye> <out prefix> [--label text]
  python art/species-construction/anim/eyelids_measure.py bare <png> <masks npz> <eye> [--json out]

The masks come from eyelid_frames.py --masks: each eye's grid cells on the frame's outer surface, projected through the
render camera, with the bare zone's signed distance `sd` (surface mm, positive inside the zone and the opening: the area a
closed lid covers), whether a cell is on the line between the lid margins (the closed line with its ribbon bands and lips,
or the open part of a half-open eye) and whether it is in the opening. They are rasterised with a depth test into a
per-pixel sd and line map (nearest cell within 2 px fills the gaps between cells).

patch (item 1, a 720 crop): the lid area is sd >= 0 off the line (and off a 2 mm margin round it, where the lashes lie);
the ring is the face fur -10 <= sd < 0 round it. Luminance is Rec. 709 Y on the 8-bit sRGB values (levels). Printed and
written to <prefix>.json: the mean Y of the lid area and of the ring and their difference; the edge profile across the lid
boundary (mean Y in 0.5 mm bins of sd from -12 to +8, the line and 4 mm round it left out) and two edge strengths from it:
the largest change between neighbouring 1 mm steps within 3 mm of the boundary, and the same over ordinary face fur
(sd -12 to -4); and the mean gradient magnitude (Sobel on Y, Gaussian 1 px) in pixels within 1 mm of the boundary against
pixels in face fur 6 to 10 mm out. <prefix>.png: the crop with the lid boundary and the ring's outer edge drawn as dotted
lines, and the profile chart.

dash (item 2, a 192 sprite): the eye region is the pixels the eye's cells with sd >= -2 cover, grown by one pixel. Printed:
the darkest Y there, how many pixels are at or under 130 and 140, and the dash: the 8-connected pixels at or under 150 that
hold the darkest pixel, with their count and their length (largest distance between two of their pixel centres, plus 1).
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.ndimage import binary_dilation, distance_transform_edt, gaussian_filter, label, sobel

INK = (235, 235, 235)
BG = (24, 24, 24)


def font(size):
    for f in ('C:/Windows/Fonts/segoeui.ttf', 'C:/Windows/Fonts/arial.ttf'):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            continue
    return ImageFont.load_default()


def lum(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(float)
    return a, a[..., 0]*0.2126+a[..., 1]*0.7152+a[..., 2]*0.0722


def raster(npz, eye, shape):
    Z = np.load(npz)
    C = Z[eye.replace('-', 'm')]
    H, W = shape
    px, py, dep = C[:, 0], C[:, 1], C[:, 2]
    ok = (px >= 0) & (px < W) & (py >= 0) & (py < H)
    C, px, py, dep = C[ok], px[ok], py[ok], dep[ok]
    ix, iy = px.astype(int), py.astype(int)
    order = np.argsort(-dep)                 # far first, so the nearest cell is written last
    sd = np.full((H, W), np.nan)
    line = np.zeros((H, W), bool)
    opening = np.zeros((H, W), bool)
    sd[iy[order], ix[order]] = C[order, 3]
    line[iy[order], ix[order]] = C[order, 4] > 0.5
    opening[iy[order], ix[order]] = C[order, 5] > 0.5
    have = np.isfinite(sd)
    d, (ii, jj) = distance_transform_edt(~have, return_indices=True)
    fill = (~have) & (d <= 2)
    sd[fill] = sd[ii[fill], jj[fill]]
    line[fill] = line[ii[fill], jj[fill]]
    opening[fill] = opening[ii[fill], jj[fill]]
    return sd, line, opening, float(Z['W']), float(Z['H'])


def patch(png, npz, eye, prefix, label_text=''):
    rgb, Y = lum(png)
    sd, line, opening, W, H = raster(npz, eye, Y.shape)
    # pixels per surface mm from the sd map: median |grad sd| (mm per pixel)
    gy, gx = np.gradient(np.where(np.isfinite(sd), sd, 0))
    g = np.hypot(gx, gy)
    okg = np.isfinite(sd) & (np.abs(sd) < 8) & (g > 0) & (g < 5)
    mm_per_px = float(np.median(g[okg])) if okg.any() else 0.455
    px_mm = 1/mm_per_px
    near_line = binary_dilation(line, iterations=max(1, int(round(2*px_mm))))
    far_line = binary_dilation(line, iterations=max(1, int(round(4*px_mm))))
    fin = np.isfinite(sd)
    lid = fin & (sd >= 0) & ~near_line
    ring = fin & (sd < 0) & (sd >= -10)
    out = dict(png=str(png), masks=str(npz), eye=eye, mm_per_px=round(mm_per_px, 4),
               lid_pixels=int(lid.sum()), ring_pixels=int(ring.sum()),
               lid_mean_Y=round(float(Y[lid].mean()), 2) if lid.any() else None,
               ring_mean_Y=round(float(Y[ring].mean()), 2) if ring.any() else None)
    if lid.any() and ring.any():
        out['lid_minus_ring_Y'] = round(out['lid_mean_Y']-out['ring_mean_Y'], 2)
    # the lid area with the closed line in (as the eye sees it); the open part of a half-open eye is on the line mask too,
    # so this one is only meaningful for a closed eye
    out['lid_with_line_mean_Y'] = round(float(Y[fin & (sd >= 0)].mean()), 2) if lid.any() else None
    # the edge profile across the boundary, away from the line
    prof_mask = fin & ~far_line
    edges = np.arange(-12, 8.01, 0.5)
    mids = (edges[:-1]+edges[1:])/2
    prof = np.array([Y[prof_mask & (sd >= a) & (sd < b)].mean() if (prof_mask & (sd >= a) & (sd < b)).sum() > 20 else np.nan
                     for a, b in zip(edges[:-1], edges[1:])])
    step1 = lambda lo, hi: [abs(prof[k+2]-prof[k]) for k in range(len(mids)-2)
                            if lo <= mids[k] and mids[k+2] <= hi and np.isfinite(prof[k]) and np.isfinite(prof[k+2])]
    b_steps, c_steps = step1(-3, 3), step1(-12, -4)
    out['profile_mm'] = [float(m) for m in mids]
    out['profile_Y'] = [None if not np.isfinite(v) else round(float(v), 2) for v in prof]
    out['edge_step_boundary_max_Y_per_mm'] = round(float(max(b_steps)), 2) if b_steps else None
    out['edge_step_face_fur_max_Y_per_mm'] = round(float(max(c_steps)), 2) if c_steps else None
    G = np.hypot(sobel(gaussian_filter(Y, 1), 0), sobel(gaussian_filter(Y, 1), 1))
    bnd = prof_mask & (np.abs(sd) < 1)
    ctl = prof_mask & (sd < -6) & (sd > -10)
    out['gradient_at_boundary_mean'] = round(float(G[bnd].mean()), 2) if bnd.any() else None
    out['gradient_face_fur_mean'] = round(float(G[ctl].mean()), 2) if ctl.any() else None
    Path(prefix+'.json').write_text(json.dumps(out, indent=1))
    # picture: the crop with the boundary (sd = 0) and the ring's outer edge (sd = -10) dotted, and the profile chart
    im = Image.fromarray(rgb.astype(np.uint8))
    ov = np.asarray(im).copy()
    for lev, col in ((0., (255, 255, 255)), (-10., (20, 20, 20))):
        e = fin & (np.abs(sd-lev) < 0.6*mm_per_px+0.12)
        yy, xx = np.nonzero(e)
        dots = ((yy+xx) // 3) % 2 == 0
        ov[yy[dots], xx[dots]] = col
    ln = binary_dilation(line, iterations=1) & ~line & fin
    yy, xx = np.nonzero(ln)
    dots = ((yy+xx) // 2) % 3 == 0
    ov[yy[dots], xx[dots]] = (90, 90, 90)
    F = font(20)
    cw, ch = 720, 300
    chart = Image.new('RGB', (cw, ch), BG)
    d = ImageDraw.Draw(chart)
    v = prof[np.isfinite(prof)]
    lo_, hi_ = (float(v.min())-4, float(v.max())+4) if len(v) else (0, 255)
    X = lambda m: 50+(m+12)/20*(cw-70)
    Yp = lambda y: ch-40-(y-lo_)/(hi_-lo_)*(ch-80)
    d.line([(X(0), 30), (X(0), ch-40)], fill=(150, 150, 150))
    d.text((X(0)+4, 30), 'lid boundary', fill=INK, font=F)
    pts = [(X(m), Yp(y)) for m, y in zip(mids, prof) if np.isfinite(y)]
    if len(pts) > 1:
        d.line(pts, fill=INK, width=3)
    d.text((50, ch-34), 'face fur  <-  sd (mm)  ->  lid', fill=INK, font=F)
    d.text((10, 4), f'mean Y by distance from the lid boundary: {lo_:.0f} to {hi_:.0f}', fill=INK, font=F)
    lab = [label_text, f'lid mean Y {out["lid_mean_Y"]}, ring mean Y {out["ring_mean_Y"]}, difference {out.get("lid_minus_ring_Y")}',
           f'edge step max per mm: boundary {out["edge_step_boundary_max_Y_per_mm"]}, face fur {out["edge_step_face_fur_max_Y_per_mm"]}',
           f'gradient mean: boundary {out["gradient_at_boundary_mean"]}, face fur {out["gradient_face_fur_mean"]}']
    sheet = Image.new('RGB', (720*2+30, 720+150), BG)
    sheet.paste(im, (10, 140))
    sheet.paste(Image.fromarray(ov), (730+10, 140))
    dd = ImageDraw.Draw(sheet)
    for k, t in enumerate(lab):
        dd.text((10, 8+k*30), t, fill=INK, font=F)
    dd.text((740, 112), 'dotted: white = lid boundary, dark = 10 mm ring edge, grey = line band', fill=INK, font=F)
    full = Image.new('RGB', (sheet.width, sheet.height+ch+10), BG)
    full.paste(sheet, (0, 0))
    full.paste(chart, (10, sheet.height))
    full.save(prefix+'.png')
    print(json.dumps({k: v for k, v in out.items() if not k.startswith('profile')}))
    return out


def cells_theta_rel(npz, eye, lids_dir):
    """Per mask cell: theta and phi above the opening's middle. Masks from fix pass 3 on carry them (columns 6 and 7); older
    masks are matched to their cells through the lids build that wrote them (the same grid and zone)."""
    C = np.load(npz)[eye.replace('-', 'm')]
    if C.shape[1] >= 8:
        return C[:, 6], C[:, 7]
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import eyelids_core as ec
    E = ec.Lids(lids_dir).eyes[eye]
    th, ph = E.grid.th, E.grid.ph
    keep_t = (th > E.thm-14) & (th < E.thl+14)
    T, P = np.meshgrid(th[keep_t], ph)
    ok = E.sdz[:, keep_t] > -26
    T, P = T[ok], P[ok]
    if len(T) != len(C):
        raise SystemExit(f'{npz}: {len(C)} cells, the lids build gives {len(T)}')
    rU, rL, _ = E.curves(T)
    return T, P-(rU+rL)/2


def raster_cols(npz, eye, shape, cols):
    """Like raster, for any per-cell columns (nearest cell in depth, gaps of up to 2 px filled)."""
    Z = np.load(npz)
    C = Z[eye.replace('-', 'm')]
    H, W = shape
    px, py, dep = C[:, 0], C[:, 1], C[:, 2]
    ok = np.flatnonzero((px >= 0) & (px < W) & (py >= 0) & (py < H))
    order = ok[np.argsort(-dep[ok])]
    M = np.full((H, W, len(cols)), np.nan)
    M[py[order].astype(int), px[order].astype(int)] = np.stack(cols, 1)[order]
    have = np.isfinite(M[..., 0])
    d, (ii, jj) = distance_transform_edt(~have, return_indices=True)
    f = (~have) & (d <= 2)
    M[f] = M[ii[f], jj[f]]
    return M


CRESCENT_SD = (-18., -2.)
CRESCENT_BINS = [(-26, -22), (-22, -18), (-18, -15), (-15, -12), (-12, -9), (-9, -6), (-6, -4), (-4, -2), (-2, 0)]


def crescent_area(open_png, open_npz, eye, lids_dir=None):
    """The open frame's luminance, its sd map, the lower band (below the middle, between the corners, outside the opening)
    and the under-eye area in it (CRESCENT_SD), with the corners' theta."""
    _, Yo = lum(open_png)
    sdo = raster(open_npz, eye, Yo.shape)
    sd, opening = sdo[0], sdo[2]
    C = np.load(open_npz)[eye.replace('-', 'm')]
    T, rel = cells_theta_rel(open_npz, eye, lids_dir)
    M = raster_cols(open_npz, eye, Yo.shape, [T, rel])
    fin = np.isfinite(sd) & np.isfinite(M[..., 0])
    thm, thl = float(np.nanmin(T[C[:, 5] > 0.5])), float(np.nanmax(T[C[:, 5] > 0.5]))
    base = fin & (M[..., 1] < 0) & (M[..., 0] > thm) & (M[..., 0] < thl) & ~opening
    area = base & (sd >= CRESCENT_SD[0]) & (sd < CRESCENT_SD[1])
    return Yo, sd, base, area, thm, thl


def crescent(open_png, open_npz, tests, eye, prefix, lids_dir=None, label_text=''):
    """The under-eye area (fix pass 3): the pixels of the open frame's eye cells below the opening's middle, between the
    corners, outside the opening, and CRESCENT_SD surface mm out from the bare zone's edge (the face fur band under the eye;
    the open eye's lower liner, within 2 mm, is left out). The same pixels are read in every test frame (the same pose and
    camera). Prints and writes <prefix>.json: mean Y (Rec. 709, levels) of the area in the open frame and in each test frame,
    the difference, and the same per sd band; <prefix>.png: the test crops side by side, the area dotted, each labelled."""
    Yo, sd, base, area, thm, thl = crescent_area(open_png, open_npz, eye, lids_dir)
    out = dict(open=str(open_png), masks=str(open_npz), eye=eye, area=f'below the middle, theta {thm:.1f} to {thl:.1f}, outside the opening, sd {CRESCENT_SD[0]} to {CRESCENT_SD[1]} mm',
               area_pixels=int(area.sum()), open_mean_Y=round(float(Yo[area].mean()), 2),
               open_bands={f'{a}..{b}': round(float(Yo[base & (sd >= a) & (sd < b)].mean()), 2) for a, b in CRESCENT_BINS
                           if (base & (sd >= a) & (sd < b)).sum() > 30}, tests=[])
    ims = []
    for name, png in tests:
        rgb, Yt = lum(png)
        r = dict(name=name, png=str(png), mean_Y=round(float(Yt[area].mean()), 2), minus_open=round(float(Yt[area].mean()-Yo[area].mean()), 2),
                 bands={f'{a}..{b}': round(float(Yt[base & (sd >= a) & (sd < b)].mean()-Yo[base & (sd >= a) & (sd < b)].mean()), 2)
                        for a, b in CRESCENT_BINS if (base & (sd >= a) & (sd < b)).sum() > 30})
        out['tests'].append(r)
        ov = rgb.astype(np.uint8).copy()
        e = binary_dilation(area, iterations=1) & ~area
        yy, xx = np.nonzero(e)
        dots = ((yy+xx) // 3) % 2 == 0
        ov[yy[dots], xx[dots]] = (20, 20, 20)
        ims.append((f'{name}: {r["mean_Y"]} ({r["minus_open"]:+.1f} against open {out["open_mean_Y"]})', Image.fromarray(ov)))
    Path(prefix+'.json').write_text(json.dumps(out, indent=1))
    F = font(20)
    w, h = ims[0][1].size
    sheet = Image.new('RGB', (len(ims)*(w+10)+10, h+90), BG)
    d = ImageDraw.Draw(sheet)
    d.text((10, 6), label_text+'  (under-eye area dotted; mean Y of the area)', fill=INK, font=F)
    for k, (t, im) in enumerate(ims):
        sheet.paste(im, (10+k*(w+10), 80))
        d.text((10+k*(w+10), 44), t, fill=INK, font=F)
    sheet.save(prefix+'.png')
    print(json.dumps(out, indent=1))
    return out


def vband(png, npz, eye, lids_dir=None):
    """The upper lid's broad light and dark bands (fix pass 3, the V above the closed eye): over the lid area above the
    opening's middle (sd >= 0, the line and 6 mm round it left out: the lashes), the luminance blurred by a 4 px Gaussian (strand-scale
    noise gone, partings and folds kept), its standard deviation and its 5 to 95 percentile range, and the same standard
    deviation over the face fur above it (sd -12 to -2 mm) for scale."""
    from scipy.ndimage import gaussian_filter
    _, Y = lum(png)
    sd, line, opening, W, H = raster(npz, eye, Y.shape)
    T, rel = cells_theta_rel(npz, eye, lids_dir)
    M = raster_cols(npz, eye, Y.shape, [T, rel])
    gy, gx = np.gradient(np.where(np.isfinite(sd), sd, 0))
    g = np.hypot(gx, gy)
    okg = np.isfinite(sd) & (np.abs(sd) < 8) & (g > 0) & (g < 5)
    px_mm = 1/float(np.median(g[okg]))
    near_line = binary_dilation(line, iterations=max(1, int(round(6*px_mm))))
    area = np.isfinite(sd) & (sd >= 0) & (M[..., 1] > 0) & ~near_line
    ring = np.isfinite(sd) & (sd < -2) & (sd >= -12) & (M[..., 1] > 0)
    Yb = gaussian_filter(Y, 4)
    v, r = Yb[area], Yb[ring]
    out = dict(png=str(png), eye=eye, pixels=int(area.sum()), mean_Y=round(float(v.mean()), 2), blurred_std=round(float(v.std()), 2),
               blurred_p5_p95=[round(float(x), 1) for x in np.percentile(v, [5, 95])],
               face_fur_above_blurred_std=round(float(r.std()), 2) if ring.any() else None)
    print(json.dumps(out))
    return out


def dash(png, npz, eye):
    rgb, Y = lum(png)
    sd, line, opening, W, H = raster(npz, eye, Y.shape)
    reg = binary_dilation(np.isfinite(sd) & (sd >= -2), iterations=1)
    if not reg.any():
        return dict(png=str(png), eye=eye, region_pixels=0)
    yv = np.where(reg, Y, 999)
    k = np.unravel_index(np.argmin(yv), Y.shape)
    lab_, _ = label(reg & (Y <= 150), structure=np.ones((3, 3)))
    comp = lab_ == lab_[k] if lab_[k] > 0 else np.zeros_like(reg)
    yy, xx = np.nonzero(comp)
    if len(yy) > 1:
        P = np.stack([yy, xx], 1).astype(float)
        dmax = float(np.max(np.linalg.norm(P[:, None]-P[None], axis=2)))
    else:
        dmax = 0.
    out = dict(png=str(png), eye=eye, region_pixels=int(reg.sum()), darkest_Y=round(float(Y[k]), 1), darkest_at=[int(k[1]), int(k[0])],
               pixels_le_130=int((reg & (Y <= 130)).sum()), pixels_le_140=int((reg & (Y <= 140)).sum()),
               dash_pixels_le_150=int(comp.sum()), dash_length_px=round(dmax+1, 1) if len(yy) else 0,
               dash_Y=sorted(round(float(v), 1) for v in Y[comp])[:12])
    print(json.dumps(out))
    return out


OUTLINE_SECTORS = 12
OUTLINE_EDGE = (-7., 3.)       # the lid boundary zone (sd mm): the lid fur edge, the cross-fade band and the lid fur tips
OUTLINE_FACE = (-16., -9.)     # ordinary face fur farther out, the same width less one mm
OUTLINE_LINE_MM = 7.           # the closed line and this much round it left out (the lashes, the ribbon's flick at the outer end)


def outline(png, npz, eye, prefix=None, label_text=''):
    """Fix pass 4, the oval outline: patch's edge step averages the profile all round the lid, so an outline that is light on
    one side and dark on the other cancels out (pass 3 passed it with the outline in plain view). Here the pixels are split
    into OUTLINE_SECTORS sectors by their angle round the lid's centre in the picture; per sector the mean Y in 0.5 mm bins of
    sd (the line and OUTLINE_LINE_MM round it left out: the lashes and the ribbon's flick), smoothed with a 1 mm Gaussian; the edge strength is the largest |dY/d sd| (levels
    per mm, over 2 mm) in OUTLINE_EDGE, and the face fur's own the same in OUTLINE_FACE. Printed and written to <prefix>.json:
    both per sector, the largest of each over the sectors, and the sectors where the boundary is the stronger. <prefix>.png:
    the crop with the sectors and the lid boundary drawn, and the per-sector profiles."""
    rgb, Y = lum(png)
    sd, line, opening, W, H = raster(npz, eye, Y.shape)
    gy, gx = np.gradient(np.where(np.isfinite(sd), sd, 0))
    g = np.hypot(gx, gy)
    okg = np.isfinite(sd) & (np.abs(sd) < 8) & (g > 0) & (g < 5)
    mm_per_px = float(np.median(g[okg])) if okg.any() else 0.455
    far_line = binary_dilation(line, iterations=max(1, int(round(OUTLINE_LINE_MM/mm_per_px))))
    fin = np.isfinite(sd)
    lidm = fin & (sd >= 0)
    yy, xx = np.nonzero(lidm)
    cy, cx = float(yy.mean()), float(xx.mean())
    Yi, Xi = np.mgrid[0:Y.shape[0], 0:Y.shape[1]]
    ang = (np.degrees(np.arctan2(-(Yi-cy), Xi-cx)) % 360)
    sec = (ang // (360/OUTLINE_SECTORS)).astype(int)
    use = fin & ~far_line
    edges = np.arange(-18, 6.01, 0.5)
    mids = (edges[:-1]+edges[1:])/2
    out = dict(png=str(png), masks=str(npz), eye=eye, mm_per_px=round(mm_per_px, 4), sectors=[], edge_zone_mm=list(OUTLINE_EDGE),
               face_zone_mm=list(OUTLINE_FACE))
    profs = []
    for k in range(OUTLINE_SECTORS):
        m = use & (sec == k)
        prof = np.array([Y[m & (sd >= a) & (sd < b)].mean() if (m & (sd >= a) & (sd < b)).sum() >= 15 else np.nan
                         for a, b in zip(edges[:-1], edges[1:])])
        ok = np.isfinite(prof)
        rec = dict(sector=k, angle_deg=[k*360/OUTLINE_SECTORS, (k+1)*360/OUTLINE_SECTORS], pixels=int(m.sum()))
        if ok.sum() < 20:
            out['sectors'].append(rec)
            profs.append(None)
            continue
        p_ = np.interp(mids, mids[ok], prof[ok])
        w = gaussian_filter(ok.astype(float), 2.)
        ps = gaussian_filter(np.where(ok, prof, 0.), 2.)/np.maximum(w, 1e-6)
        d = np.abs(ps[4:]-ps[:-4])/2.0          # over 2 mm (4 bins of 0.5 mm), levels per mm
        dm = mids[2:-2]
        okd = ok[4:] & ok[:-4]

        def zmax(lo, hi):
            z = okd & (dm >= lo) & (dm <= hi)
            return (round(float(d[z].max()), 2), float(dm[z][np.argmax(d[z])])) if z.sum() >= 4 else (None, None)
        rec['edge_max_Y_per_mm'], rec['edge_at_mm'] = zmax(*OUTLINE_EDGE)
        rec['face_max_Y_per_mm'], rec['face_at_mm'] = zmax(*OUTLINE_FACE)
        rec['lid_0_4_mean_Y'] = round(float(np.nanmean(prof[(mids >= 0) & (mids < 4)])), 1) if np.isfinite(prof[(mids >= 0) & (mids < 4)]).any() else None
        rec['band_m6_m2_mean_Y'] = round(float(np.nanmean(prof[(mids >= -6) & (mids < -2)])), 1) if np.isfinite(prof[(mids >= -6) & (mids < -2)]).any() else None
        out['sectors'].append(rec)
        profs.append(np.where(ok, ps, np.nan))
    both = [s for s in out['sectors'] if s.get('edge_max_Y_per_mm') is not None and s.get('face_max_Y_per_mm') is not None]
    out['edge_max_over_sectors'] = max((s['edge_max_Y_per_mm'] for s in both), default=None)
    out['face_max_over_sectors'] = max((s['face_max_Y_per_mm'] for s in both), default=None)
    out['edge_median_over_sectors'] = round(float(np.median([s['edge_max_Y_per_mm'] for s in both])), 2) if both else None
    out['face_median_over_sectors'] = round(float(np.median([s['face_max_Y_per_mm'] for s in both])), 2) if both else None
    out['sectors_edge_stronger'] = [s['sector'] for s in both if s['edge_max_Y_per_mm'] > s['face_max_Y_per_mm']]
    out['sectors_compared'] = len(both)
    if prefix:
        Path(prefix+'.json').write_text(json.dumps(out, indent=1))
        im = rgb.astype(np.uint8).copy()
        e = fin & (np.abs(sd) < 0.6*mm_per_px+0.12)
        ey, ex = np.nonzero(e)
        dots = ((ey+ex) // 3) % 2 == 0
        im[ey[dots], ex[dots]] = (255, 255, 255)
        for k in range(OUTLINE_SECTORS):
            a = np.radians(k*360/OUTLINE_SECTORS)
            for r in range(0, 400, 3):
                x_, y_ = int(cx+r*np.cos(a)), int(cy-r*np.sin(a))
                if 0 <= x_ < im.shape[1] and 0 <= y_ < im.shape[0]:
                    im[y_, x_] = (40, 40, 40)
        F = font(18)
        pic = Image.fromarray(im)
        d_ = ImageDraw.Draw(pic)
        for s in out['sectors']:
            a = np.radians((s['sector']+0.5)*360/OUTLINE_SECTORS)
            x_, y_ = cx+170*np.cos(a), cy-170*np.sin(a)
            if s.get('edge_max_Y_per_mm') is not None:
                d_.text((x_-30, y_-10), f"{s['sector']}: {s['edge_max_Y_per_mm']:.1f}/{s['face_max_Y_per_mm'] or 0:.1f}", fill=(20, 20, 120), font=F)
        cw, ch = 720, 360
        chart = Image.new('RGB', (cw, ch), BG)
        dc = ImageDraw.Draw(chart)
        vals = np.concatenate([p[np.isfinite(p)] for p in profs if p is not None]) if any(p is not None for p in profs) else np.array([0, 255])
        lo_, hi_ = float(np.nanpercentile(vals, 1))-3, float(np.nanpercentile(vals, 99))+3
        X = lambda m: 50+(m+18)/24*(cw-70)
        Yp = lambda y: ch-40-(y-lo_)/(hi_-lo_)*(ch-80)
        dc.line([(X(0), 30), (X(0), ch-40)], fill=(150, 150, 150))
        for z0, z1, col in ((*OUTLINE_EDGE, (70, 70, 110)), (*OUTLINE_FACE, (70, 110, 70))):
            dc.rectangle([X(z0), ch-38, X(z1), ch-34], fill=col)
        for k, p in enumerate(profs):
            if p is not None:
                shade = 120+int(130*k/OUTLINE_SECTORS)
                pts = [(X(m), Yp(y)) for m, y in zip(mids, p) if np.isfinite(y)]
                if len(pts) > 1:
                    dc.line(pts, fill=(shade, shade, shade), width=2)
        dc.text((10, 4), f'mean Y by sd, per sector ({lo_:.0f} to {hi_:.0f}); bars: edge zone, face zone', fill=INK, font=F)
        sheet = Image.new('RGB', (pic.width+cw+30, max(pic.height, ch)+110), BG)
        sheet.paste(pic, (10, 100))
        sheet.paste(chart, (pic.width+20, 100))
        ds = ImageDraw.Draw(sheet)
        ds.text((10, 8), label_text, fill=INK, font=F)
        ds.text((10, 36), f"edge strength, levels per mm (sector: lid boundary / face fur): max {out['edge_max_over_sectors']} / {out['face_max_over_sectors']}, "
                f"median {out['edge_median_over_sectors']} / {out['face_median_over_sectors']}; boundary stronger in sectors {out['sectors_edge_stronger']}", fill=INK, font=F)
        sheet.save(prefix+'.png')
    print(json.dumps({k: v for k, v in out.items() if k != 'sectors'}))
    return out


def bare(png, npz, eye, r_mm=10.0):
    """Fix pass 4, the pale spot at the ends of the closed line (the lid sheet showing between the lashes and the lid fur): in
    a window of r_mm round each end of the line (its line cells at the largest and the smallest theta), the pixels that are
    smooth (standard deviation of Y over 5 x 5 pixels under 5 levels: no strands, a bare surface) and pale (Y over 150), and
    the largest 4-connected blob of them. Fur and the dark line are never that smooth; the open eye white is (so only
    meaningful for a closed or wincing eye)."""
    from scipy.ndimage import uniform_filter
    _, Y = lum(png)
    sd, line, opening, W, H = raster(npz, eye, Y.shape)
    gy, gx = np.gradient(np.where(np.isfinite(sd), sd, 0))
    g = np.hypot(gx, gy)
    okg = np.isfinite(sd) & (np.abs(sd) < 8) & (g > 0) & (g < 5)
    mm_per_px = float(np.median(g[okg])) if okg.any() else 0.455
    C = np.load(npz)[eye.replace('-', 'm')]
    ln = C[:, 4] > 0.5
    T = C[:, 6]
    var = uniform_filter(Y**2, 5)-uniform_filter(Y, 5)**2
    sm = np.sqrt(np.maximum(var, 0))
    yy, xx = np.mgrid[0:Y.shape[0], 0:Y.shape[1]]
    out = dict(png=str(png), eye=eye, window_mm=r_mm, mm_per_px=round(mm_per_px, 4))
    for end, q in (('outer', T[ln].max()), ('inner', T[ln].min())):
        k = ln & (np.abs(T-q) < 1.5)
        x, y = float(C[k, 0].mean()), float(C[k, 1].mean())
        win = ((xx-x)**2+(yy-y)**2 < (r_mm/mm_per_px)**2) & np.isfinite(sd)     # on the head's eye region (not the backdrop)
        sp = win & (sm < 5.0) & (Y > 150)
        lab_, n = label(sp)
        big = int(np.bincount(lab_[lab_ > 0]).max()) if n else 0
        out[end] = dict(at_px=[round(x), round(y)], smooth_pale_px=int(sp.sum()), largest_blob_px=big,
                        largest_blob_mm2=round(big*mm_per_px**2, 2), window_px=int(win.sum()))
    print(json.dumps(out))
    return out


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'patch':
        lab = sys.argv[sys.argv.index('--label')+1] if '--label' in sys.argv else ''
        patch(Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4], sys.argv[5], lab)
    elif cmd == 'crescent':
        # crescent <open png> <open masks> <eye> <out prefix> name=png [name=png ...] [--lids dir] [--label text]
        args = sys.argv[2:]
        lab = args[args.index('--label')+1] if '--label' in args else ''
        lids = args[args.index('--lids')+1] if '--lids' in args else None
        pos = [x for i, x in enumerate(args) if not x.startswith('--') and (i == 0 or args[i-1] not in ('--label', '--lids'))]
        crescent(Path(pos[0]), Path(pos[1]), [tuple(x.split('=', 1)) for x in pos[4:]], pos[2], pos[3], lids, lab)
    elif cmd == 'vband':
        # vband <png> <masks> <eye> [--lids dir] [--json out]
        lids = sys.argv[sys.argv.index('--lids')+1] if '--lids' in sys.argv else None
        o = vband(Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4], lids)
        if '--json' in sys.argv:
            Path(sys.argv[sys.argv.index('--json')+1]).write_text(json.dumps(o, indent=1))
    elif cmd == 'outline':
        # outline <png> <masks> <eye> <out prefix> [--label text]
        lab = sys.argv[sys.argv.index('--label')+1] if '--label' in sys.argv else ''
        outline(Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4], sys.argv[5], lab)
    elif cmd == 'bare':
        o = bare(Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4])
        if '--json' in sys.argv:
            Path(sys.argv[sys.argv.index('--json')+1]).write_text(json.dumps(o, indent=1))
    elif cmd == 'dash':
        o = dash(Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4])
        if '--json' in sys.argv:
            Path(sys.argv[sys.argv.index('--json')+1]).write_text(json.dumps(o, indent=1))
