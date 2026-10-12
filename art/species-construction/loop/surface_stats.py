"""Coat surface hardness per region, from the shaded clay renders (deterministic, no model calls).

Idea: a hard shard or knife edge in the clay shading is a short, steep luminance step; a soft
overlapping lock is a gradual one. Inside a region's zone (species.json zones, projected into each
fixed detail camera) and away from the silhouette, hardness is 100 times the share of object pixels
whose luminance gradient (Gaussian sigma 1 px, luminance 0 to 1) exceeds STEEP. The detail cameras
are fixed per set, so the same assembly measures the same and two assemblies are comparable.
`ridge` (share of pixels whose band-pass response |G1 - G3| exceeds RIDGE) is reported beside it as
a second reading of tonal ridges; the sweep scorer uses `hardness`.

    python surface_stats.py <packet> [--baseline <packet>] [--regions R03,R04] [--sheet]
    from surface_stats import surface_scores
    surface_scores(packet, ['R03', 'R04'], baseline=None)
        -> {region: {'hardness', 'ridge', 'pixels', 'images', 'change' (with a baseline)}}

A packet argument may also be an assembly folder or name (assembled-2055), for assemblies that
were never packeted; a packet's index.json names the assembly whose full-resolution detail
renders (the work folder) are measured. Hardness is comparable between assemblies for one region,
not between regions (each region is seen by cameras of different scale and, for the face, with
dark features that are not coat).
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

sys.path.insert(0, str(Path(__file__).resolve().parent))
import loop_tools as lt  # noqa: E402
import packet_images as pi  # noqa: E402

STEEP = 0.04     # luminance gradient per pixel counted as a steep step
RIDGE = 0.02     # |G1 - G3| counted as a tonal ridge
ERODE = 5        # px of silhouette interior excluded, so the outline is not counted as a surface edge
MIN_PIXELS = 500

# Detail renders that show each region's coat (set, name). The whole-figure R12 has none.
SURFACE_IMAGES = {
    'R01': [('head', 'head-front'), ('head', 'head-side')],
    'R02': [('face', 'nose-front'), ('face', 'nose-profile'), ('face', 'eyes-front'), ('regions', 'face-front')],
    'R03': [('head', 'head-front'), ('face', 'head-three-quarter'), ('head', 'head-side')],
    'R04': [('head', 'head-back'), ('head', 'head-top'), ('face', 'head-rear-oblique'), ('regions', 'ears-rear')],
    'R05': [('neck', 'neck-front'), ('neck', 'neck-profile'), ('neck', 'neck-rear'), ('neck', 'shoulders-front')],
    'R06': [('regions', 'trunk-front'), ('neck', 'shoulders-front')],
    'R07': [('paws', 'forearm-front'), ('paws', 'forearm-profile'), ('paws', 'forepaw-front'), ('paws', 'forepaw-profile')],
    'R08': [('paws', 'hindleg-front'), ('paws', 'hindleg-profile'), ('tail', 'shin-profile')],
    'R09': [('paws', 'hindpaw-front'), ('paws', 'hindpaw-profile'), ('paws', 'hindpaw-oblique')],
    'R10': [('tail', 'tail-root-back'), ('tail', 'tail-root-oblique'), ('tail', 'tail-root-opposite'), ('tail', 'tail-fan-back')],
    'R11': [('tail', 'tail-root-back'), ('tail', 'tail-root-oblique'), ('tail', 'tail-root-opposite')],
}
DEFAULT_REGIONS = list(SURFACE_IMAGES)


def resolve_assembly(source):
    """Assembly name of a packet folder, an assembly folder or a bare name."""
    p = Path(str(source))
    if (p/'index.json').exists():
        return pi.packet_assembly(p)
    return p.name


def _hard(gray, interior):
    """(steep pixel count, ridge pixel count, interior pixel count) of a luminance image."""
    g1 = ndi.gaussian_filter(gray, 1.0)
    grad = ndi.gaussian_gradient_magnitude(gray, 1.0)
    ridge = np.abs(g1-ndi.gaussian_filter(gray, 3.0))
    return int((grad[interior] > STEEP).sum()), int((ridge[interior] > RIDGE).sum()), int(interior.sum())


def _image_counts(assembly, region, dset, name):
    try:
        view, res = pi.detail_view(assembly, dset, name)
        im = Image.open(pi.detail_path(assembly, dset, name)).convert('RGBA')
    except (OSError, StopIteration, KeyError):
        return None
    box = pi.zone_pixels(region, view, res)
    if box is None:
        return None
    alpha = np.asarray(im.getchannel('A')) > 200
    gray = np.asarray(im.convert('L'), float)/255
    crop = np.zeros_like(alpha)
    crop[box[1]:box[3], box[0]:box[2]] = True
    interior = ndi.binary_erosion(alpha, iterations=ERODE) & crop
    if interior.sum() < MIN_PIXELS:
        return None
    return _hard(gray, interior)


def surface_scores(packet, regions=None, baseline=None):
    """Per region: {'hardness', 'ridge', 'pixels', 'images'}, plus 'change' (hardness minus the
    baseline's; negative is softer) when a baseline is given. A region with no measurable image
    has hardness None."""
    regions = list(regions or DEFAULT_REGIONS)
    assembly = resolve_assembly(packet)
    base = surface_scores(baseline, regions) if baseline is not None else None
    out = {}
    for r in regions:
        counts, used = [], []
        for dset, name in SURFACE_IMAGES.get(r, []):
            c = _image_counts(assembly, r, dset, name)
            if c:
                counts.append(c)
                used.append(name)
        if not counts:
            out[r] = {'hardness': None, 'ridge': None, 'pixels': 0, 'images': []}
        else:
            s, g, n = (sum(x) for x in zip(*counts))
            out[r] = {'hardness': round(100*s/n, 3), 'ridge': round(100*g/n, 3), 'pixels': n, 'images': used}
        if base is not None:
            b = base[r]['hardness']
            out[r]['change'] = None if b is None or out[r]['hardness'] is None else round(out[r]['hardness']-b, 3)
    return out


# The reference sheet is a painting with fur strands the model must not reproduce yet. This puts
# its shading on the same footing (figure resampled to the detail cameras' pixels per figure
# height) so it can be looked at beside the model; it is context, not a target.
SHEET_VIEW = {'R01': 'front', 'R02': 'front', 'R03': 'front', 'R04': 'back', 'R05': 'front', 'R06': 'front',
              'R08': 'front', 'R09': 'front'}


def sheet_scores(regions=None):
    full = np.asarray(Image.open(lt.SPECIES.docs/lt.SPECIES['referenceSheet']).convert('L'), float)/255
    px_per_figure = 800/0.9*lt.FIXED_HEIGHT
    out = {}
    for r in regions or SHEET_VIEW:
        view, zone = SHEET_VIEW.get(r), lt.SPECIES.zone(r)
        if view is None or zone is None:
            continue
        mask = lt.reference_figure(view)
        rows, cols = np.where(mask)
        top, bottom, cx = rows.min(), rows.max(), (cols.min()+cols.max())/2
        h = bottom-top
        scale = px_per_figure/h
        r0, r1 = int(top+zone['at'][0]*h), int(top+zone['at'][1]*h)
        half = zone['x'][1]*h
        c0, c1 = int(max(0, cx-half)), int(min(full.shape[1], cx+half))
        gray = ndi.zoom(full[r0:r1, c0:c1], scale, order=1)
        m = ndi.zoom(mask[r0:r1, c0:c1].astype(float), scale, order=1) > .5
        interior = ndi.binary_erosion(m, iterations=ERODE)
        if interior.sum() < MIN_PIXELS:
            continue
        s, g, n = _hard(gray, interior)
        out[r] = {'hardness': round(100*s/n, 3), 'ridge': round(100*g/n, 3), 'pixels': n, 'view': view}
    return out


def main():
    ap = argparse.ArgumentParser(description='Coat surface hardness per region')
    ap.add_argument('packet')
    ap.add_argument('--baseline')
    ap.add_argument('--regions', default=','.join(DEFAULT_REGIONS))
    ap.add_argument('--sheet', action='store_true')
    ap.add_argument('--species')
    a = ap.parse_args()
    regions = a.regions.split(',')
    result = {'surface': surface_scores(a.packet, regions, a.baseline)}
    if a.sheet:
        result['sheet'] = sheet_scores(regions)
    print(json.dumps(result, indent=1))


if __name__ == '__main__':
    main()
