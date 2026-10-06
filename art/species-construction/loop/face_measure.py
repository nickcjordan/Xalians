"""Face measures of an assembled creature: the numbers the critic reads off the face by eye, measured.

    python art/species-construction/loop/face_measure.py <assembly> [--species akinza] [--out file.json]

From the fixed-camera eyes-front render (details-face/eyes-front.png), per eye, by rays cast from the iris centre:
  eyeAspect      height over width of the outer edge of the dark lid band (the aperture as drawn)
  irisWidth      iris width over eye width
  irisOffset     iris centre minus eye centre, over eye width, positive toward the nose (a convergent stare)
  band           dark band width at 12 angles (0 at the top, clockwise on the image), percent of eye width
  bandTopBottom  band at the top over band at the bottom (the spec asks for an upper-heavy lid, at least 2.5)
  bandMin        thinnest band (a uniform thick ring shows as a high minimum)
A mesh measure of how far the eye edge stands proud of the skin was tried and dropped: it read .008 to .010 world on
every face, the proud ones and the flush ones alike.

The R02 spec targets these (specs/R02.md section 1 and the round 26 addendum); recipe.py candidate records them as
faceMeasures, the runner reports them, and the critic reads them beside the images.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
DARK, BRIGHT, SKIN = 90, 185, 110
ANGLES = list(range(0, 360, 30))


def blobs(mask):
    """Connected components of a boolean mask, largest first, as arrays of (row, col)."""
    from scipy import ndimage
    lab, n = ndimage.label(mask)
    out = [np.argwhere(lab == k) for k in range(1, n+1)]
    return sorted(out, key=len, reverse=True)


def ray_profile(gray, alpha, cy, cx, ang, rmax):
    """Pixel values along a ray from (cy, cx); ang 0 is up, clockwise on the image."""
    t = np.arange(0, rmax)
    ys = np.round(cy - t*math.cos(math.radians(ang))).astype(int)
    xs = np.round(cx + t*math.sin(math.radians(ang))).astype(int)
    ok = (ys >= 0) & (ys < gray.shape[0]) & (xs >= 0) & (xs < gray.shape[1])
    ys, xs = ys[ok], xs[ok]
    return gray[ys, xs], alpha[ys, xs], ys, xs


def eye_rays(gray, alpha, cy, cx, rmax):
    """Per angle: (iris edge r, sclera outer r = band inner, band outer r) or None."""
    rows = {}
    for ang in ANGLES:
        v, a, ys, xs = ray_profile(gray, alpha, cy, cx, ang, rmax)
        n = len(v)
        k = 0
        while k < n and v[k] < DARK:  # iris and pupil
            k += 1
        iris = k
        while k < n and v[k] >= DARK:  # sclera (shaded toward its edge, but never as dark as the band)
            k += 1
        inner = k
        while k < n and v[k] < SKIN and a[k] > 0:  # the dark band, until the skin's mid grey
            k += 1
        outer = k
        rows[ang] = None if (inner >= n or outer <= inner) else (iris, inner, outer, (ys[min(outer, n-1)], xs[min(outer, n-1)]))
    return rows


def image_measures(path):
    from PIL import Image
    im = np.asarray(Image.open(path).convert('RGBA')).astype(float)
    gray, alpha = im[..., :3].mean(-1), im[..., 3]
    dark = (gray < DARK) & (alpha > 0)
    eyes = []
    for b in blobs(dark)[:6]:
        if len(b) < 0.002*gray.size:
            continue
        cy, cx = b.mean(0)
        h, w = np.ptp(b[:, 0])+1, np.ptp(b[:, 1])+1
        if h < 1.1*w * 0 or h < w*0.8:  # an iris is an upright oval; the mouth line and band arcs are not
            continue
        eyes.append((cy, cx, h, w))
        if len(eyes) == 2:
            break
    if len(eyes) < 2:
        return {'error': f'found {len(eyes)} iris blobs in {path.name}'}
    mid = (eyes[0][1]+eyes[1][1])/2  # the face centre line between the irises
    out = []
    for cy, cx, ih, iw in sorted(eyes, key=lambda e: e[1]):
        rays = eye_rays(gray, alpha, cy, cx, int(4*max(ih, iw)))
        good = {a: r for a, r in rays.items() if r}
        if len(good) < 8:
            out.append({'error': f'only {len(good)} of 12 rays crossed sclera and band'})
            continue
        pts = np.array([r[3] for r in good.values()], float)
        top, bottom = pts[:, 0].min(), pts[:, 0].max()
        left, right = pts[:, 1].min(), pts[:, 1].max()
        width, height = right-left, bottom-top
        ecx = (left+right)/2
        toward_nose = 1 if mid > ecx else -1
        band = {a: round(100*(r[2]-r[1])/width, 2) for a, r in good.items()}
        # a ray that runs on into a shadow (the fan's, at the upper outer corner) reads several times the median; drop it
        med = float(np.median(list(band.values())))
        band = {a: v for a, v in band.items() if v <= 3*max(med, .5)}
        topv = [band[a] for a in (330, 0, 30) if a in band]
        botv = [band[a] for a in (150, 180, 210) if a in band]
        out.append({'eyeAspect': round(height/width, 3), 'irisWidth': round(iw/width, 3),
                    'irisOffset': round(toward_nose*(cx-ecx)/width, 3), 'band': band,
                    'bandTopBottom': round(np.mean(topv)/max(np.mean(botv), .1), 2) if topv and botv else None,
                    'bandMin': min(band.values()), 'bandMedian': round(float(np.median(list(band.values()))), 2), 'widthPx': int(width)})
    return {'eyes': out}


def measure(assembly_dir):
    d = Path(assembly_dir)
    return image_measures(d/'details-face'/'eyes-front.png')


# Guards, calibrated on round 22 to 27 faces (2026-10-06): the baseline face (assembled-2751/2775) reads irisOffset .05 to
# .08, bandTopBottom about 7, bandMin about .4; the candidates the critic failed for an even thick ring (2783, 2792, the
# as-built tool 2797) read bandTopBottom 1.7 to 2.3 and bandMin 2.0 to 2.8; the one that broke I01 (2783) reads irisOffset
# .165. Spec: lid band top over bottom at least 2.5 (specs/R02.md, R02.6 row), iris toward the nose at most .003 fit units.
GUARDS = {'irisOffset': ('max', .12, 'a convergent stare (invariant I01)'),
          'bandTopBottom': ('min', 2.5, 'an even ring instead of an upper-heavy lid (R02.2, R02.6)'),
          'bandMin': ('max', 1.5, 'a thick ring all round (R02.2)')}


def guard_failures(cand, base=None):
    """[text] for each guard the candidate's face breaks where the baseline's does not, or breaks by more (so a body order
    with an unchanged face never fails, and a baseline that already breaks a guard does not block every candidate)."""
    fails = []
    ce, be = (cand or {}).get('eyes') or [], (base or {}).get('eyes') or []
    for key, (kind, limit, what) in GUARDS.items():
        cv = [e.get(key) for e in ce if isinstance(e.get(key), (int, float))]
        bv = [e.get(key) for e in be if isinstance(e.get(key), (int, float))]
        if not cv:
            continue
        worst = max(cv) if kind == 'max' else min(cv)
        bad = worst > limit if kind == 'max' else worst < limit
        if not bad:
            continue
        if bv:
            bworst = max(bv) if kind == 'max' else min(bv)
            if (worst <= bworst+1e-9) if kind == 'max' else (worst >= bworst-1e-9):
                continue
        fails.append(f'{key} {worst} ({"over" if kind == "max" else "under"} {limit}: {what})')
    return fails


def main():
    import species as sp
    p = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    p.add_argument('assembly')
    p.add_argument('--species', default='akinza')
    p.add_argument('--out')
    a = p.parse_args()
    s = sp.load(a.species)
    d = Path(a.assembly) if Path(a.assembly).is_dir() else s.work/a.assembly
    out = measure(d)
    if a.out:
        Path(a.out).write_text(json.dumps(out, indent=1), encoding='utf-8')
    print(json.dumps(out))


if __name__ == '__main__':
    main()
