"""Akinza eyelids fix pass 2: the numbers behind the lid look (PIL, numpy, scipy; no Blender).

  python art/species-construction/anim/eyelids_measure.py patch <png> <masks npz> <eye> <out prefix> [--label text]
  python art/species-construction/anim/eyelids_measure.py dash <sprite png> <masks npz> <eye> [--json out]

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


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'patch':
        lab = sys.argv[sys.argv.index('--label')+1] if '--label' in sys.argv else ''
        patch(Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4], sys.argv[5], lab)
    elif cmd == 'dash':
        o = dash(Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4])
        if '--json' in sys.argv:
            Path(sys.argv[sys.argv.index('--json')+1]).write_text(json.dumps(o, indent=1))
