"""Small, explicit image operations shared by the view-pack commands."""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

VIEWS = {'front': 0, 'front-left': 45, 'left': 90, 'back': 180,
         'right': 270, 'front-right': 315}


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')


def binary(path):
    a = np.asarray(Image.open(path).convert('L'))
    if not np.isin(a, [0, 255]).all():
        raise ValueError(f'Nonbinary mask: {path}')
    return a == 0


def save_mask(a, path):
    Image.fromarray(np.where(a, 0, 255).astype('uint8')).save(path)


def bounds(a):
    y, x = np.nonzero(a)
    if not len(x):
        raise ValueError('Empty foreground')
    return [int(x.min()), int(y.min()), int(x.max()), int(y.max())]


def iou(a, b):
    if a.shape != b.shape:
        raise ValueError('Mask dimensions differ')
    union = np.count_nonzero(a | b)
    return float(np.count_nonzero(a & b) / union) if union else 0.0


def overlay(a, b, path):
    out = np.full((*a.shape, 3), 255, dtype='uint8')
    out[a & ~b] = [220, 45, 45]
    out[b & ~a] = [45, 90, 220]
    out[a & b] = [128, 128, 128]
    Image.fromarray(out).save(path)
