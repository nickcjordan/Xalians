"""Uniformly scale and translate a view; never deform its pose."""
import argparse
from pathlib import Path
import numpy as np
from PIL import Image
from common import binary, bounds, digest, read_json, write_json


def register(image, occupancy, features, output, size=1024, height=860, ground=960, landmarks=None):
    if not (0 < height <= ground + 1 <= size):
        raise ValueError('Invalid target geometry')
    mask = binary(occupancy)
    l, t, r, b = bounds(mask)
    if l == 0 or t == 0 or r == mask.shape[1]-1 or b == mask.shape[0]-1:
        raise ValueError('Source crop touches boundary; possible clipping')
    h = b - t + 1
    s = height / h
    tx = (size - 1) / 2 - s * (l + r) / 2
    ty = ground + 0.5 - s * (b + 0.5)
    if s * (r-l+1) > size-4:
        raise ValueError('View too wide for target canvas')
    output = Path(output); output.parent.mkdir(parents=True, exist_ok=True)
    generated = {}
    for src, suffix, resample in [(image, '.png', Image.Resampling.BICUBIC),
                                   (occupancy, '.occupancy.png', Image.Resampling.NEAREST),
                                   (features, '.mask.png', Image.Resampling.NEAREST)]:
        im = Image.open(src)
        if im.size != (mask.shape[1], mask.shape[0]):
            raise ValueError('Image and masks differ in size')
        im = im.convert('RGBA') if suffix == '.png' else im.convert('L')
        out = im.transform((size, size), Image.Transform.AFFINE,
                           (1/s, 0, -tx/s, 0, 1/s, -ty/s), resample=resample,
                           fillcolor=(255,255,255,255) if suffix == '.png' else 255)
        path = str(output) + suffix; out.save(path); generated[suffix] = digest(path)
    box = bounds(binary(str(output) + '.occupancy.png'))
    result = {'sourceSha256': digest(image), 'canvas': [size, size], 'scale': s,
              'translation': [tx, ty], 'sourceBounds': [l,t,r,b], 'bounds': box,
              'figureHeight': box[3]-box[1]+1, 'groundRow': box[3], 'hashes': generated,
              'landmarks': {key: (None if row is None else s*row+ty)
                            for key, row in (landmarks or {}).items()}}
    write_json(str(output) + '.geometry.json', result)
    return result


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('image'); p.add_argument('occupancy'); p.add_argument('features'); p.add_argument('output')
    p.add_argument('--landmarks'); p.add_argument('--size', type=int, default=1024)
    p.add_argument('--height', type=int, default=860); p.add_argument('--ground', type=int, default=960)
    a = p.parse_args()
    register(a.image,a.occupancy,a.features,a.output,a.size,a.height,a.ground,
             read_json(a.landmarks) if a.landmarks else None)
