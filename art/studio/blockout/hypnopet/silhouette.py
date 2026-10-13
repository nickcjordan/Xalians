"""Silhouette helpers for the Hypnopet blockout fit (numpy, PIL, scipy).

mask(path)      figure mask of an image on a white or near-white background (largest component, holes filled,
                soft ground shadow removed)
frame(mask, top_row=None)  ground row, top row, figure height in pixels and the left/right extent
runs(row)       (start, end) runs of True pixels in one mask row
"""
import numpy as np
from PIL import Image
from scipy import ndimage

CORE, GROW = 222, 4
STRICT = 200          # contact shadow is lighter than this; the soles' occluded outline is darker
BAND, BAND_CUT = 0.05, 204
HOLE_MAX = 4000       # pixels: holes smaller than this are highlights, larger ones are real gaps
THRESH = 238          # mean RGB below this is figure (background is about 253; the clay's brightest highlight is about 245 only in tiny specks)


def load_rgba_or_rgb(path, bg=(253, 253, 253)):
    im = Image.open(path)
    if im.mode == 'RGBA':
        a = np.asarray(im).astype(float)
        alpha = a[..., 3:4]/255.0
        rgb = a[..., :3]*alpha+np.array(bg)*(1-alpha)
        return rgb, np.asarray(im)[..., 3] > 8
    return np.asarray(im.convert('RGB')).astype(float), None


def mask(path):
    rgb, alpha = load_rgba_or_rgb(path)
    if alpha is not None:
        m = alpha
    else:
        lum = rgb.mean(axis=2)
        # The soft ground shadow sits at 225 to 236 while the clay is mostly darker than 222, and its edges
        # are darker still (occlusion). So the figure is the core darker than CORE, opened to drop shadow
        # speckle, then grown a few pixels into anything darker than THRESH to recover lit rims.
        m = ndimage.binary_opening(lum < CORE, iterations=2)
        for _ in range(GROW):
            m = ndimage.binary_dilation(m) & (lum < THRESH) | m
    lab, n = ndimage.label(m)
    if n > 1:
        sizes = ndimage.sum(m, lab, range(1, n+1))
        m = lab == (1+int(np.argmax(sizes)))
    # fill only small holes (specular highlights inside the figure); the large gaps between the legs are
    # enclosed by the contact shadow on the ground and must stay open
    m = fill_small_holes(m)
    if alpha is None:
        m = drop_ground_shadow(m, lum)
    return m


def fill_small_holes(m):
    holes = ndimage.binary_fill_holes(m) & ~m
    lab, n = ndimage.label(holes)
    if n:
        sizes = ndimage.sum(holes, lab, range(1, n+1))
        m = m | np.isin(lab, np.flatnonzero(sizes < HOLE_MAX)+1)
    return m


def drop_ground_shadow(m, lum):
    """Remove the ground shadow strip: below the last row where the strictly dark clay (feet outlines)
    still reaches, the mask is shadow."""
    strict = ndimage.binary_opening(lum < STRICT, iterations=3)
    rows = np.flatnonzero(strict.any(axis=1))
    m = m.copy()
    if len(rows):
        m[rows[-1]+1:] = False
    # in the bottom band the soft shadow (about 205 to 236) hugs the feet: keep only the darker clay there
    rows = np.flatnonzero(m.any(axis=1))
    band = int(rows[-1]-BAND*(rows[-1]-rows[0]))
    keep = ndimage.binary_opening(lum < BAND_CUT, iterations=2)
    m[band:] &= keep[band:]
    m = fill_small_holes(m)
    lab, n = ndimage.label(m)
    if n > 1:
        sizes = ndimage.sum(m, lab, range(1, n+1))
        m = lab == (1+int(np.argmax(sizes)))
    return m


def runs(row):
    r = np.flatnonzero(np.diff(np.concatenate([[0], row.astype(np.int8), [0]])))
    return [(int(a), int(b-1)) for a, b in zip(r[0::2], r[1::2])]


def frame(m):
    rows = np.flatnonzero(m.any(axis=1))
    cols = np.flatnonzero(m.any(axis=0))
    return {'top': int(rows[0]), 'ground': int(rows[-1]), 'left': int(cols[0]), 'right': int(cols[-1])}
