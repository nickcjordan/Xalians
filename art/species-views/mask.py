"""Derive masks from pixels; semantic feature extraction stays explicit."""
import argparse
from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image
from common import bounds, digest, save_mask, write_json


def fill_enclosed(foreground):
    """Fill enclosed light regions for occupancy, preserving exterior gaps."""
    h, w = foreground.shape
    outside = np.zeros((h, w), dtype=bool)
    q = deque()
    for y, x in ([(0, x) for x in range(w)] + [(h-1, x) for x in range(w)]
                 + [(y, 0) for y in range(h)] + [(y, w-1) for y in range(h)]):
        if not foreground[y, x] and not outside[y, x]:
            outside[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for yy, xx in ((y-1, x), (y+1, x), (y, x-1), (y, x+1)):
            if 0 <= yy < h and 0 <= xx < w and not foreground[yy, xx] and not outside[yy, xx]:
                outside[yy, xx] = True; q.append((yy, xx))
    return ~outside


def derive(image, prefix, mode='white', background=245, feature=225, surface_boxes=()):
    if mode not in ('white', 'alpha') or not 0 < feature <= background < 256:
        raise ValueError('Invalid mask settings')
    im = Image.open(image).convert('RGBA')
    a = np.asarray(im)
    rgb = np.asarray(Image.alpha_composite(Image.new('RGBA', im.size, 'white'), im).convert('RGB'))
    if mode == 'alpha':
        if a[:, :, 3].min() == 255:
            raise ValueError('Alpha mode requires transparent pixels')
        occupied = a[:, :, 3] >= 128
    else:
        # The fill is a provisional occupancy inference and needs visual review.
        occupied = rgb.min(axis=2) < background
        filled = fill_enclosed(occupied)
        # Only explicitly identified surface regions may fill. Limb gaps are background.
        for x0,y0,x1,y1 in surface_boxes:
            if not (0 <= x0 < x1 <= im.width and 0 <= y0 < y1 <= im.height):
                raise ValueError('Invalid surface region')
            occupied[y0:y1,x0:x1] = filled[y0:y1,x0:x1]
    features = occupied & (rgb.mean(axis=2) < feature)
    box = bounds(occupied)
    prefix = Path(prefix)
    prefix.parent.mkdir(parents=True, exist_ok=True)
    save_mask(occupied, str(prefix) + '.occupancy.png')
    save_mask(features, str(prefix) + '.mask.png')
    result = {'sourceSha256': digest(image), 'mode': mode, 'backgroundThreshold': background,
              'featureThreshold': feature, 'surfaceBoxes': list(surface_boxes), 'bounds': box,
              'semanticValidation': 'blocked',
              'note': 'Pixel thresholds cannot distinguish pale fur from markings. Inspect masks and annotate feature identity.'}
    write_json(str(prefix) + '.mask.json', result)
    return result


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('image'); p.add_argument('prefix')
    p.add_argument('--mode', choices=['white', 'alpha'], default='white')
    p.add_argument('--background', type=int, default=245)
    p.add_argument('--feature', type=int, default=225)
    a = p.parse_args()
    derive(a.image, a.prefix, a.mode, a.background, a.feature)
