"""Akinza sprites pass 1 (sprites-pass1-brief.md): downsampling, the render test and the final frame checks. PIL and
numpy, no Blender. Numbers only; nothing here grades the look.

  python art/species-construction/anim/sprite_measures.py down <src dir> <dst dir> [--factor 2]
      Every <src>/<clip>/<view>/NNNN.png (straight-alpha RGBA) reduced by --factor with a box (area) filter: the
      factor x factor block averaged in linear light on premultiplied alpha, converted back to straight alpha and
      sRGB, rounded to 8 bits (an RGB frame is taken as opaque and written as RGB). Written to <dst>/<clip>/NNNN.png.
  python art/species-construction/anim/sprite_measures.py test <sprites1 dir> <clips4 dir>
      The render test: <sprites1>/test/a (192 direct) and <sprites1>/test/b (384 downsampled to 192) against the
      clips4 clay sprite frames. Writes <sprites1>/render-test.json and render-test.png.
  python art/species-construction/anim/sprite_measures.py checks <sprites1 dir> <clips4 dir>
      The final frame checks (<sprites1>/frames, the clay at the same camera in <sprites1>/clay, the atlas in
      <sprites1>/atlas): writes <sprites1>/checks.json.
  python art/species-construction/anim/sprite_measures.py report <sprites1 dir> [--validator log] [--tests log]
      <sprites1>/sprites.json: the render settings and times (frames-raw/frames-fur.json), the render test, the checks,
      the player shots and the quoted validator and test output, from whatever exists so far.

Measures (all at the 192 px cell):
- shimmer: the clips4 critic's method (critic/tools/shimmer2.py, sprite view, r = 2): where the clay frame pair is
  figure in both frames (eroded 2 px) and still (no clay pixel changes by more than 2 levels within 2 px), the share
  of fur pixels whose luminance (PIL 'L') changes by more than 6 levels from one frame to the next; the fur composited
  over the clips4 fur background (247, 248, 247) first, so the clips4 frames measure the same way;
- edge fringe: for each edge pixel (0.02 < alpha < 0.99), its luminance deviation from an ideal edge of the same
  alpha in the color of the opaque fur within 2 px (4 px if none): alpha * (L(pixel) - L(local opaque)), which is
  the same over any background; light halo = share of edge pixels more than 12 levels above, dark halo more than 12
  below; plus the dark-background ring contrast: the composited luminance of the ring just outside the alpha 0.5
  outline over the dark background, above that background;
- sharpness: the near eye (11 x 11 px around the eye_l socket), luminance p95 - p5 and mean Sobel magnitude over the
  dark background; the ear edge (the box of both ears' base and tip joints, 8 px out), edge width = pixels with
  0.05 < alpha < 0.95 per outline pixel (an outline pixel has alpha >= 0.5 and a 4-neighbor below 0.5), and the
  mean alpha step across the outline.
"""
import argparse
import json
import math
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

CELL = 192
DARK = (24, 33, 42)          # the night-tundra-like flat background of the player
LIGHT = (232, 236, 239)
FUR_BG = (247, 248, 247)     # the clips4 fur renders' plain background, for the shimmer measure
TESTS = [('idle', 0), ('stalk', 18), ('idle', 46)]
CLIP_FRAMES = {'idle': 90, 'stalk': 45}


def font(size):
    for f in ('C:/Windows/Fonts/arial.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):
        if Path(f).exists():
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


# ---------------------------------------------------------------- pixels

def srgb_to_lin(c):
    return np.where(c <= .04045, c/12.92, ((c+.055)/1.055)**2.4)


def lin_to_srgb(c):
    return np.where(c <= .0031308, c*12.92, 1.055*np.power(np.clip(c, 0, None), 1/2.4)-.055)


def load_rgba(p):
    im = Image.open(p)
    assert im.mode in ('RGBA', 'RGB'), (p, im.mode)
    return np.asarray(im.convert('RGBA')).astype(np.float64)/255


def downsample(rgba, k):
    """Box filter by k: average in linear light on premultiplied alpha, back to straight alpha sRGB, 8 bits."""
    h, w = rgba.shape[:2]
    assert h % k == 0 and w % k == 0
    a = rgba[..., 3:4]
    pre = srgb_to_lin(rgba[..., :3])*a
    pre = pre.reshape(h//k, k, w//k, k, 3).mean((1, 3))
    am = a.reshape(h//k, k, w//k, k, 1).mean((1, 3))
    rgb = np.where(am > 0, pre/np.maximum(am, 1e-12), 0)
    out = np.concatenate([lin_to_srgb(np.clip(rgb, 0, 1)), am], 2)
    return np.round(np.clip(out, 0, 1)*255).astype(np.uint8)


def composite(rgba, bg):
    """Straight alpha over a flat background in 8-bit sRGB values (as a browser canvas draws it)."""
    a = rgba[..., 3:4]
    return rgba[..., :3]*255*a+np.asarray(bg, float)*(1-a)


def luma(rgb255):
    return rgb255[..., 0]*.299+rgb255[..., 1]*.587+rgb255[..., 2]*.114


def L_rgb(path, size=None):
    im = Image.open(path).convert('L')
    if size and im.size[0] != size:
        im = im.resize((size, size), Image.LANCZOS)
    return np.asarray(im).astype(float)


def fur_L(path):
    """A fur frame's luminance as the critic measured it: RGBA composited over FUR_BG first; RGB frames as they are."""
    im = Image.open(path)
    if im.mode == 'RGBA':
        c = np.round(composite(np.asarray(im).astype(np.float64)/255, FUR_BG))
        return np.asarray(Image.fromarray(c.astype(np.uint8), 'RGB').convert('L')).astype(float)
    return np.asarray(im.convert('L')).astype(float)


def dil(m, r):
    im = Image.fromarray((m*255).astype('uint8')).filter(ImageFilter.MaxFilter(2*r+1))
    return np.asarray(im) > 0


def shimmer_pair(c0, c1, f0, f1, r=2):
    """shimmer2.py, one frame pair: (still-surface px, mean abs change, share of px changing more than 6 levels)."""
    bgC = c0[2, 2]
    cfg = (np.abs(c1-bgC) > 6) & (np.abs(c0-bgC) > 6)
    m = ~dil(~cfg, r) & ~dil(np.abs(c1-c0) > 2, r)
    d = np.abs(f1-f0)[m]
    if not m.sum():
        return 0, float('nan'), float('nan')
    return int(m.sum()), float(d.mean()), float((d > 6).mean()*100)


def box_mean(x, valid, r):
    """Mean of x over valid pixels in a (2r+1) square window, and the count."""
    pad = np.pad(x*valid[..., None] if x.ndim == 3 else x*valid, [(r, r), (r, r)]+([(0, 0)] if x.ndim == 3 else []))
    vp = np.pad(valid.astype(float), r)
    s = np.zeros_like(x, dtype=float)
    n = np.zeros(valid.shape)
    h, w = valid.shape
    for dy in range(2*r+1):
        for dx in range(2*r+1):
            s += pad[dy:dy+h, dx:dx+w]
            n += vp[dy:dy+h, dx:dx+w]
    return s, n


def outline(A):
    inside = A >= .5
    o = np.zeros_like(inside)
    o[1:, :] |= inside[1:, :] & ~inside[:-1, :]
    o[:-1, :] |= inside[:-1, :] & ~inside[1:, :]
    o[:, 1:] |= inside[:, 1:] & ~inside[:, :-1]
    o[:, :-1] |= inside[:, :-1] & ~inside[:, 1:]
    return o


def fringe(rgba, bg=DARK):
    A = rgba[..., 3]
    rgb = rgba[..., :3]*255
    Lp = luma(rgb)
    opaque = A >= .99
    band = (A > .02) & (A < .99)
    s2, n2 = box_mean(Lp, opaque, 2)
    s4, n4 = box_mean(Lp, opaque, 4)
    loc = np.where(n2 > 0, s2/np.maximum(n2, 1), np.where(n4 > 0, s4/np.maximum(n4, 1), np.nan))
    ok = band & np.isfinite(loc)
    dev = A[ok]*(Lp[ok]-loc[ok])
    # dark-background ring: just outside the alpha 0.5 outline (alpha < 0.5 with a 4-neighbor at or above it)
    inside = A >= .5
    ring = dil(inside, 1) & ~inside
    comp = luma(composite(rgba, bg))
    ring_contrast = comp[ring]-luma(np.asarray(bg, float)[None, None])[0, 0]
    return dict(edgePx=int(ok.sum()), meanDev=round(float(dev.mean()), 2), meanAbsDev=round(float(np.abs(dev).mean()), 2),
                lightHaloPct=round(float((dev > 12).mean()*100), 2), darkHaloPct=round(float((dev < -12).mean()*100), 2),
                p99AbsDev=round(float(np.percentile(np.abs(dev), 99)), 1),
                darkRingPx=int(ring.sum()), darkRingContrastMean=round(float(ring_contrast.mean()), 1),
                darkRingAlphaMean=round(float(A[ring].mean()), 3))


def sobel(L):
    p = np.pad(L, 1, mode='edge')
    gx = (p[:-2, 2:]+2*p[1:-1, 2:]+p[2:, 2:])-(p[:-2, :-2]+2*p[1:-1, :-2]+p[2:, :-2])
    gy = (p[2:, :-2]+2*p[2:, 1:-1]+p[2:, 2:])-(p[:-2, :-2]+2*p[:-2, 1:-1]+p[:-2, 2:])
    return np.hypot(gx, gy)/8


def sharpness(rgba, row):
    out = {}
    L = luma(composite(rgba, DARK))
    ex, ey = (np.array(row['uv']['eye_l'])*CELL).astype(float)
    ix, iy = int(math.floor(ex)), int(math.floor(ey))
    crop = L[iy-5:iy+6, ix-5:ix+6]
    out['eyeContrast'] = round(float(np.percentile(crop, 95)-np.percentile(crop, 5)), 1)
    out['eyeSobelMean'] = round(float(sobel(L)[iy-5:iy+6, ix-5:ix+6].mean()), 2)
    pts = np.array([row['aux'][k] for k in ('ear_base_L', 'ear_tip_L', 'ear_base_R', 'ear_tip_R')])*CELL
    x0, y0 = np.floor(pts.min(0)-8).astype(int)
    x1, y1 = np.ceil(pts.max(0)+8).astype(int)
    x0, y0 = max(x0, 0), max(y0, 0)
    A = rgba[y0:y1, x0:x1, 3]
    o = outline(A)
    soft = ((A > .05) & (A < .95)).sum()
    out['earBox'] = [int(x0), int(y0), int(x1), int(y1)]
    out['earOutlinePx'] = int(o.sum())
    out['earEdgeWidth'] = round(float(soft/max(o.sum(), 1)), 3)
    gy, gx = np.gradient(A)
    out['earAlphaStep'] = round(float(np.hypot(gx, gy)[o].mean()), 3)
    return out


def sockets_of(folder, clip):
    rows = json.loads((Path(folder)/clip/'sockets.json').read_text())['rows']
    return {r['frame']: r for r in rows}


# ---------------------------------------------------------------- down

def cmd_down(a):
    t0 = time.time()
    n = 0
    for p in sorted(Path(a.src).glob('*/*/*.png')):
        clip = p.parent.parent.name
        mode = Image.open(p).mode                  # an RGB frame (the clay) is treated as opaque and stays RGB
        im = load_rgba(p)
        d = Path(a.dst)/clip
        d.mkdir(parents=True, exist_ok=True)
        Image.fromarray(downsample(im, a.factor), 'RGBA').convert(mode).save(d/p.name)
        n += 1
    print('downsampled', n, 'frames in', round(time.time()-t0, 1), 's')


# ---------------------------------------------------------------- render test

def way_path(w, clip, f):
    return (w['dir']/clip/w['sub'] if w['sub'] else w['dir']/clip)/f'{f:04d}.png'


def frames_log(folder):
    return json.loads((Path(folder)/'frames-fur.json').read_text())


def panel(rgba8, bg, scale, crop=None):
    im = Image.fromarray(rgba8, 'RGBA')
    if crop:
        im = im.crop(crop)
    base = Image.new('RGBA', im.size, bg+(255,))
    base.alpha_composite(im)
    if scale != 1:
        base = base.resize((base.width*scale, base.height*scale), Image.NEAREST)
    return base.convert('RGB')


def cmd_test(a):
    S = Path(a.sprites)
    C4 = Path(a.clips4)
    ways = {'a': dict(name='192 px rendered directly', dir=S/'test/a', sub='sprite'),
            'b': dict(name='384 px rendered, 2x2 box downsampled to 192 (linear light, premultiplied alpha)', dir=S/'test/b192', sub='')}
    socks = {c: sockets_of(S/'test/a', c) for c in ('idle', 'stalk')}
    res = dict(frames=[f'{c}:{f}' for c, f in TESTS], pairs=[f'{c}:{f}-{f+1}' for c, f in TESTS], ways={})
    for k, w in ways.items():
        rows = []
        for clip, f in TESTS:
            p0, p1 = way_path(w, clip, f), way_path(w, clip, f+1)
            c0 = L_rgb(C4/f'frames/clay/{clip}/sprite/{f:04d}.png')
            c1 = L_rgb(C4/f'frames/clay/{clip}/sprite/{f+1:04d}.png')
            px, mean_abs, share = shimmer_pair(c0, c1, fur_L(p0), fur_L(p1))
            rgba = load_rgba(p0)
            row = dict(frame=f'{clip}:{f}', shimmer=dict(stillPx=px, meanAbs=round(mean_abs, 2), pctOver6=round(share, 2)),
                       fringe=fringe(rgba), sharpness=sharpness(rgba, socks[clip][f]))
            rows.append(row)
        log = frames_log(S/('test/a' if k == 'a' else 'test/b'))
        secs = {c: log['renderSeconds'].get(f'{c}/sprite', []) for c in ('idle', 'stalk')}
        apply_s = [x for c in ('idle', 'stalk') for x in log['applySeconds'].get(c, [])]
        allr = [x for v in secs.values() for x in v]
        w['rows'] = rows
        w['renderSecondsPerFrame'] = dict(mean=round(float(np.mean(allr)), 2), each=secs, poseSecondsMean=round(float(np.mean(apply_s)), 2),
                                          runSeconds=log['seconds'], sprite=log['sprite'])
        w['summary'] = dict(shimmerPctOver6Mean=round(float(np.mean([r['shimmer']['pctOver6'] for r in rows])), 2),
                            lightHaloPctMean=round(float(np.mean([r['fringe']['lightHaloPct'] for r in rows])), 2),
                            darkHaloPctMean=round(float(np.mean([r['fringe']['darkHaloPct'] for r in rows])), 2),
                            meanAbsDev=round(float(np.mean([r['fringe']['meanAbsDev'] for r in rows])), 2),
                            eyeContrastMean=round(float(np.mean([r['sharpness']['eyeContrast'] for r in rows])), 1),
                            eyeSobelMean=round(float(np.mean([r['sharpness']['eyeSobelMean'] for r in rows])), 2),
                            earEdgeWidthMean=round(float(np.mean([r['sharpness']['earEdgeWidth'] for r in rows])), 3),
                            earAlphaStepMean=round(float(np.mean([r['sharpness']['earAlphaStep'] for r in rows])), 3))
        res['ways'][k] = {kk: (str(vv) if isinstance(vv, Path) else vv) for kk, vv in w.items()}
    # the clips4 fur frames (approved, RGB over the plain background) at the same pairs, for reference
    base = []
    for clip, f in TESTS:
        fd = 'fur-idle' if clip == 'idle' else 'fur'
        c0 = L_rgb(C4/f'frames/clay/{clip}/sprite/{f:04d}.png')
        c1 = L_rgb(C4/f'frames/clay/{clip}/sprite/{f+1:04d}.png')
        px, mean_abs, share = shimmer_pair(c0, c1, fur_L(C4/f'frames/{fd}/{clip}/sprite/{f:04d}.png'),
                                           fur_L(C4/f'frames/{fd}/{clip}/sprite/{f+1:04d}.png'))
        base.append(dict(frame=f'{clip}:{f}', stillPx=px, meanAbs=round(mean_abs, 2), pctOver6=round(share, 2)))
    res['clips4Reference'] = dict(note='the approved clips4 fur sprite frames (RGB on the plain background, 192 direct) at the same pairs',
                                  rows=base, shimmerPctOver6Mean=round(float(np.mean([r['pctOver6'] for r in base])), 2))
    (S/'render-test.json').write_text(json.dumps(res, indent=1))
    sheet(S, ways)
    print(json.dumps({k: dict(summary=v['summary'], seconds=v['renderSecondsPerFrame']['mean'],
                              pose=v['renderSecondsPerFrame']['poseSecondsMean']) for k, v in res['ways'].items()}, indent=1))
    print('clips4 reference shimmer', res['clips4Reference']['shimmerPctOver6Mean'])


def union_box(paths, pad=6):
    lo = np.array([CELL, CELL])
    hi = np.array([0, 0])
    for p in paths:
        A = np.asarray(Image.open(p))[..., 3]
        ys, xs = np.nonzero(A)
        lo = np.minimum(lo, [xs.min(), ys.min()])
        hi = np.maximum(hi, [xs.max()+1, ys.max()+1])
    lo = np.maximum(lo-pad, 0)
    hi = np.minimum(hi+pad, CELL)
    return (int(lo[0]), int(lo[1]), int(hi[0]), int(hi[1]))


def sheet(S, ways):
    """render-test.png: per test frame, one row on the dark and one on the light background: a and b at 1x, then
    a and b at 4x nearest neighbor (the 4x panels cropped to the figures' union box, 6 px out)."""
    paths = [way_path(w, c, f) for w in ways.values() for c, f in TESTS]
    crop = union_box(paths)
    cw, ch = (crop[2]-crop[0])*4, (crop[3]-crop[1])*4
    gap, lab = 16, 34
    F, Fs = font(22), font(16)
    W = 120+2*(CELL+gap)+2*(cw+gap)
    rows = []
    for clip, f in TESTS:
        for bg, bgname in ((DARK, 'dark'), (LIGHT, 'light')):
            rows.append((clip, f, bg, bgname))
    H = 70+len(rows)*(ch+lab+gap)
    out = Image.new('RGB', (W, H), (250, 250, 250))
    d = ImageDraw.Draw(out)
    d.text((16, 8), 'Akinza sprites pass 1 render test: a = 192 px direct, b = 384 px box-downsampled to 192.', fill=(20, 20, 20), font=F)
    d.text((16, 36), f'1x, then 4x nearest neighbor (cropped to x {crop[0]}-{crop[2]}, y {crop[1]}-{crop[3]} of the 192 px cell)',
           fill=(20, 20, 20), font=F)
    y = 70
    for clip, f, bg, bgname in rows:
        d.text((16, y+lab), f'{clip} {f}\n{bgname}', fill=(20, 20, 20), font=F)
        x = 120
        for k in ('a', 'b'):
            im = load_rgba(way_path(ways[k], clip, f))
            out.paste(panel((im*255).round().astype(np.uint8), bg, 1), (x, y+lab))
            d.text((x, y+8), f'{k} 1x', fill=(20, 20, 20), font=Fs)
            x += CELL+gap
        for k in ('a', 'b'):
            im = load_rgba(way_path(ways[k], clip, f))
            out.paste(panel((im*255).round().astype(np.uint8), bg, 4, crop), (x, y+lab))
            d.text((x, y+8), f'{k} 4x', fill=(20, 20, 20), font=Fs)
            x += cw+gap
        y += ch+lab+gap
    out.save(S/'render-test.png', optimize=True)
    print('wrote', S/'render-test.png', out.size)


# ---------------------------------------------------------------- final checks

def figure(path):
    im = np.asarray(Image.open(path).convert('RGB')).astype(np.int16)
    return np.abs(im-im[2, 2]).sum(2) > 30


def mask_offset(m0, m1, search=3):
    """Centroid offset (dx, dy) of m1 from m0, the integer shift of m1 that best matches m0, and the XOR counts."""
    y0, x0 = np.nonzero(m0)
    y1, x1 = np.nonzero(m1)
    dxy = [float(x1.mean()-x0.mean()), float(y1.mean()-y0.mean())]
    best, best_xor = (0, 0), None
    for dy in range(-search, search+1):
        for dx in range(-search, search+1):
            sh = np.roll(np.roll(m1, -dy, 0), -dx, 1)
            x = int((sh ^ m0).sum())
            if best_xor is None or x < best_xor:
                best, best_xor = (dx, dy), x
    return dict(centroidOffsetPx=[round(v, 3) for v in dxy], bestShiftPx=list(best), xorPx=int((m0 ^ m1).sum()),
                iou=round(float((m0 & m1).sum()/max((m0 | m1).sum(), 1)), 4), figurePx=int(m0.sum()))


def socket_checks(S, m):
    """Per frame, from the atlas: every socket inside the cell; the status point's clearance (distance to the nearest
    pixel with alpha above 0.02, in that frame's cell image, ear tips included) and its height over the head; the ground
    socket's drift from idle frame 0; alpha under the near eye and the emitter."""
    src = {'idle': 'idle', 'sig.night-stalk': 'stalk'}
    g0 = np.array(m['clips']['idle']['facings']['side']['frames'][0]['sockets']['ground'])
    rows = []
    for name, clip in m['clips'].items():
        for f, fr in enumerate(clip['facings']['side']['frames']):
            A = np.asarray(Image.open(S/f'frames/{src[name]}/{f:04d}.png'))[..., 3].astype(float)/255
            ys, xs = np.nonzero(A > .02)
            sx, sy = fr['sockets']['status']
            clear = float(np.min(np.hypot(xs+.5-sx, ys+.5-sy)))
            above = float(ys.min()-sy)                # >0: the status point is above the figure's top pixel row
            inside = all(0 <= p[0] <= CELL and 0 <= p[1] <= CELL for p in fr['sockets'].values())
            ex, ey = fr['sockets']['eye_l']
            mx, my = fr['sockets']['emitter']
            rows.append(dict(frame=f'{name}:{f}', statusClearPx=round(clear, 2), statusAboveTopPx=round(above, 2), inside=inside,
                             groundDriftPx=round(float(np.hypot(*(np.array(fr['sockets']['ground'])-g0))), 3),
                             eyeAlpha=round(float(A[int(ey), int(ex)]), 3), emitterAlpha=round(float(A[int(my), int(mx)]), 3)))
    return dict(frames=len(rows), allInsideCell=all(r['inside'] for r in rows),
                statusClearMinPx=min(r['statusClearPx'] for r in rows),
                statusClearMinFrame=min(rows, key=lambda r: r['statusClearPx'])['frame'],
                statusAboveTopMinPx=min(r['statusAboveTopPx'] for r in rows),
                statusYRange=[round(min(fr['sockets']['status'][1] for c in m['clips'].values() for fr in c['facings']['side']['frames']), 2),
                              round(max(fr['sockets']['status'][1] for c in m['clips'].values() for fr in c['facings']['side']['frames']), 2)],
                groundDriftMaxPx=max(r['groundDriftPx'] for r in rows),
                eyeAlphaMin=min(r['eyeAlpha'] for r in rows), emitterAlphaMin=min(r['emitterAlpha'] for r in rows), rows=rows)


def cmd_checks(a):
    S = Path(a.sprites)
    C4 = Path(a.clips4)
    out = {}
    # 1. the approved poses: clay sprite of every frame at the chosen camera against the clips4 clay sprite frames
    rows = []
    for clip, n in CLIP_FRAMES.items():
        for f in range(n):
            r = mask_offset(figure(C4/f'frames/clay/{clip}/sprite/{f:04d}.png'), figure(S/f'clay/{clip}/{f:04d}.png'))
            rows.append(dict(frame=f'{clip}:{f}', **r))
    worst = max(rows, key=lambda r: math.hypot(*r['centroidOffsetPx']))
    out['approvedPoses'] = dict(rule='clay outline of every frame at the sprite camera against clips4 clay sprite frames: centroid offset under 1 px, best integer shift 0',
                                frames=len(rows), maxCentroidOffsetPx=round(math.hypot(*worst['centroidOffsetPx']), 3), worstFrame=worst['frame'],
                                maxXorPx=max(r['xorPx'] for r in rows), minIoU=min(r['iou'] for r in rows),
                                nonzeroBestShift=[r['frame'] for r in rows if r['bestShiftPx'] != [0, 0]],
                                passed=all(math.hypot(*r['centroidOffsetPx']) < 1 and r['bestShiftPx'] == [0, 0] for r in rows), rows=rows)
    # 2. every frame inside the cell with margin
    mrows = []
    for clip, n in CLIP_FRAMES.items():
        for f in range(n):
            A = np.asarray(Image.open(S/f'frames/{clip}/{f:04d}.png'))[..., 3]
            ys, xs = np.nonzero(A)
            mrows.append(dict(frame=f'{clip}:{f}', left=int(xs.min()), top=int(ys.min()), right=int(CELL-1-xs.max()), bottom=int(CELL-1-ys.max()),
                              borderPx=int((A[0] > 0).sum()+(A[-1] > 0).sum()+(A[:, 0] > 0).sum()+(A[:, -1] > 0).sum())))
    mins = {k: min(r[k] for r in mrows) for k in ('left', 'top', 'right', 'bottom')}
    out['cellMargin'] = dict(rule='alpha > 0 anywhere in the frame; margin = empty pixels between the figure and each cell edge, every frame',
                             minMarginPx=mins, minFrames={k: min(mrows, key=lambda r: r[k])['frame'] for k in mins},
                             framesTouchingEdge=[r['frame'] for r in mrows if r['borderPx']], passed=min(mins.values()) >= 1)
    # 3. shimmer, every consecutive pair (the idle loop includes 89 -> 0), against the clips4 frames at the same pairs
    sh = {}
    for clip, n in CLIP_FRAMES.items():
        pairs = [(f, (f+1) % n) for f in range(n)] if clip == 'idle' else [(f, f+1) for f in range(n-1)]
        cl = {f: L_rgb(C4/f'frames/clay/{clip}/sprite/{f:04d}.png') for f in range(n)}
        fu = {f: fur_L(S/f'frames/{clip}/{f:04d}.png') for f in range(n)}
        fd = 'fur-idle' if clip == 'idle' else 'fur'
        f4 = {f: fur_L(C4/f'frames/{fd}/{clip}/sprite/{f:04d}.png') for f in range(n)}
        mine = [shimmer_pair(cl[p], cl[q], fu[p], fu[q]) for p, q in pairs]
        ref = [shimmer_pair(cl[p], cl[q], f4[p], f4[q]) for p, q in pairs]
        big = [i for i, m in enumerate(mine) if m[0] >= 200]       # shimmer.py's floor: pairs with at least 200 still px
        sh[clip] = dict(pairs=len(pairs), pairsWith200StillPx=len(big),
                        pctOver6MeanOver200=round(float(np.mean([mine[i][2] for i in big])), 2),
                        clips4PctOver6MeanOver200=round(float(np.mean([ref[i][2] for i in big])), 2),
                        pctOver6PixelWeighted=round(float(sum(m[0]*m[2] for m in mine)/max(sum(m[0] for m in mine), 1)), 2),
                        clips4PctOver6PixelWeighted=round(float(sum(m[0]*m[2] for m in ref)/max(sum(m[0] for m in ref), 1)), 2),
                        pctOver6Mean=round(float(np.nanmean([m[2] for m in mine])), 2),
                        pctOver6Worst=round(float(np.nanmax([m[2] for m in mine])), 2),
                        worstPair=f'{pairs[int(np.nanargmax([m[2] for m in mine]))]}', meanAbs=round(float(np.nanmean([m[1] for m in mine])), 2),
                        clips4PctOver6Mean=round(float(np.nanmean([m[2] for m in ref])), 2),
                        clips4PctOver6Worst=round(float(np.nanmax([m[2] for m in ref])), 2),
                        perPair=[round(m[2], 2) for m in mine], stillPxPerPair=[m[0] for m in mine])
    out['shimmer'] = sh
    # 4. fringe over every frame
    fr = {}
    for clip, n in CLIP_FRAMES.items():
        rows_f = [fringe(load_rgba(S/f'frames/{clip}/{f:04d}.png')) for f in range(n)]
        fr[clip] = {k: round(float(np.mean([r[k] for r in rows_f])), 3) for k in ('meanDev', 'meanAbsDev', 'lightHaloPct', 'darkHaloPct',
                                                                                    'p99AbsDev', 'darkRingContrastMean', 'darkRingAlphaMean')}
        fr[clip]['worstLightHaloPct'] = max(r['lightHaloPct'] for r in rows_f)
        fr[clip]['worstDarkHaloPct'] = max(r['darkHaloPct'] for r in rows_f)
    out['fringe'] = fr
    # 5. the clip joins: Night Stalk starts on idle frame 0's pose and ends on idle frame 89's, so idle frame 0 follows
    joins = {}
    for a_, b_ in (('stalk/0000', 'idle/0000'), ('stalk/0044', 'idle/0089')):
        x = np.asarray(Image.open(S/f'frames/{a_}.png')).astype(int)
        y = np.asarray(Image.open(S/f'frames/{b_}.png')).astype(int)
        d = np.abs(x-y)
        joins[f'{a_} vs {b_}'] = dict(maxLevelDiff=int(d.max()), pxDiffering=int((d.max(2) > 0).sum()), pxOver6=int((d.max(2) > 6).sum()))
    out['clipJoins'] = joins
    # 6. sockets, from the packed atlas
    man = S/'atlas/manifest.json'
    if man.exists():
        out['sockets'] = socket_checks(S, json.loads(man.read_text()))
    (S/'checks.json').write_text(json.dumps(out, indent=1))
    print(json.dumps({k: ({kk: vv for kk, vv in v.items() if kk != 'rows'} if isinstance(v, dict) else v) for k, v in out.items()}, indent=1)[:6000])


def cmd_report(a):
    """<sprites1>/sprites.json: settings, times and check numbers, from whatever this pass has written so far."""
    S = Path(a.sprites)
    out = json.loads((S/'sprites.json').read_text()) if (S/'sprites.json').exists() else {}
    fur = S/'frames-raw/frames-fur.json'
    if fur.exists():
        log = json.loads(fur.read_text())
        c = log['cycles']
        out['render'] = dict(way='384 px rendered, 2x2 box downsampled to 192 (linear light, premultiplied alpha)', cellPx=CELL,
                             renderPx=log['sprite'], samples=c['samples'], filterWidth=c['filter_width'], seed=c['seed'],
                             animatedSeed=c['use_animated_seed'], denoiser=c['denoiser'], adaptiveThreshold=c['adaptive_threshold'],
                             filmTransparent=log.get('alpha'), output='8-bit straight-alpha RGBA PNG', device='CPU',
                             camera='clips4 sprite camera: look-dev side_left (azimuth 90, elevation 0), ortho, fitted to the sprite box '
                                    f"{log['spriteBox']} (both clips' skin bounds 6 cm out) with a 6 percent margin",
                             look='palette T7, the fur of record s12-29c-legs3b on rig-p8b, the render_surface three-light rig unchanged; '
                                  'no light, glow or emission added', clips='anim/clips4/bake (akinza_clips.py at 8e3286ad), not re-baked')
        rs = [x for k in ('idle/sprite', 'stalk/sprite') for x in log['renderSeconds'].get(k, [])]
        ps = [x for k in ('idle', 'stalk') for x in log['applySeconds'].get(k, [])]
        out['times'] = dict(frames=len(rs), frame1RenderSeconds=rs[0], frame1PoseSeconds=ps[0], renderSecondsMean=round(float(np.mean(rs)), 2),
                            renderSecondsMax=max(rs), poseSecondsMean=round(float(np.mean(ps)), 2), renderSecondsTotal=round(float(sum(rs))),
                            runSeconds=log['seconds'], startupSeconds=round(log['seconds']-sum(rs)-sum(ps)))
    for k, f in (('renderTest', 'render-test.json'), ('checks', 'checks.json'), ('playerShots', 'player-shots/shots.json')):
        if (S/f).exists():
            d = json.loads((S/f).read_text())
            if k == 'renderTest':
                d = dict(ways={w: dict(name=v['name'], summary=v['summary'], renderSecondsPerFrame=v['renderSecondsPerFrame']['mean'],
                                       poseSecondsPerFrame=v['renderSecondsPerFrame']['poseSecondsMean'],
                                       rows=[{kk: r[kk] for kk in ('frame', 'shimmer')} for r in v['rows']])
                               for w, v in d['ways'].items()}, clips4Reference=d['clips4Reference'])
            if k == 'checks':
                d = {kk: ({x: y for x, y in vv.items() if x != 'rows'} if isinstance(vv, dict) else vv) for kk, vv in d.items()}
            out[k] = d
    for k in ('validator', 'tests'):
        v = getattr(a, k)
        if v:
            out[k] = Path(v).read_text().strip().splitlines()[-12:]
    out['paths'] = {k: str(S/k) for k in ('render-test.png', 'frames', 'atlas', 'player.html', 'player-shots') if (S/k).exists()}
    (S/'sprites.json').write_text(json.dumps(out, indent=1))
    print('wrote', S/'sprites.json', list(out))


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest='cmd', required=True)
    d = sub.add_parser('down')
    d.add_argument('src')
    d.add_argument('dst')
    d.add_argument('--factor', type=int, default=2)
    t = sub.add_parser('test')
    t.add_argument('sprites')
    t.add_argument('clips4')
    c = sub.add_parser('checks')
    c.add_argument('sprites')
    c.add_argument('clips4')
    r = sub.add_parser('report')
    r.add_argument('sprites')
    r.add_argument('--validator', default=None, help='a saved validator output to quote')
    r.add_argument('--tests', default=None, help='a saved test run output to quote')
    a = p.parse_args()
    {'down': cmd_down, 'test': cmd_test, 'checks': cmd_checks, 'report': cmd_report}[a.cmd](a)
