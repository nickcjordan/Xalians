"""Package the living planets the way the home page's galaxy map would load them, and measure what that costs.

Each world's map-size planet (built from its 512-wide maps) is written as a small SVG fragment with its pictures pulled out into
separate files named by their content's hash, so a picture two worlds share (the lens that bends a map onto the sphere, the
sun's light) is one file, downloaded once and cached. PNGs become lossless WebP. The page fetches a planet's fragment only
when the map comes near the screen and plays every planet at film rate (20 frames a second), as the story plates do.

Run from the repo root: python art/planets/package.py  (writes art/planets/dist/: map.html, <world>.svg, a/<hash>.webp)
"""
import base64
import gzip
import hashlib
import importlib.util
import io
import json
import os
import re
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
DIST = os.environ.get('PLANET_DIST') or os.path.join(HERE, 'dist')
ASSETS = os.path.join(DIST, 'a')
os.makedirs(ASSETS, exist_ok=True)
WORLDS = ['zolton', 'magmuth']
MAP_WIDTH = int(os.environ.get('PLANET_W', '512'))  # map width for a planet drawn at about 150 px (300 device px on a 2x screen)
Q = int(os.environ.get('PLANET_Q', '40'))  # re-encode lossy pictures at this quality (40: no visible loss at map size; 0 keeps each picture's own)


def load(world):
    sys.path.insert(0, HERE)
    spec = importlib.util.spec_from_file_location('build_' + world, os.path.join(HERE, world, 'build.py'))
    mod = importlib.util.module_from_spec(spec)
    sys.path.insert(0, os.path.join(HERE, world))
    spec.loader.exec_module(mod)
    sys.path.pop(0)
    return mod


def map_lens(n=320):
    """The lens for a map-size planet: the same sphere, at the planet's own size and without dither. Dither hides the 8-bit
    steps on a 600 px planet; at 150 px the steps are below a pixel, and plain smooth values compress about tenfold."""
    import math
    import numpy as np
    yy, xx = np.mgrid[0:n, 0:n]
    xn, yn = (xx + .5) / n * 2 - 1, (yy + .5) / n * 2 - 1
    inside = xn * xn + yn * yn < 1
    yc = np.clip(yn, -.999999, .999999)
    lo = np.arcsin(np.clip(xn / np.sqrt(1 - yc * yc), -1, 1))
    maxd = math.pi / 2 - 1
    d = np.zeros((n, n, 3))
    d[..., 0] = (np.where(inside, lo - xn, 0) / (2 * maxd) + .5) * 255
    d[..., 1] = (np.where(inside, np.arcsin(yc) - yn, 0) / (2 * maxd) + .5) * 255
    d[..., 2] = 128
    b = io.BytesIO()
    Image.fromarray(np.round(d).astype(np.uint8), 'RGB').save(b, 'WEBP', lossless=True, method=6)
    return b.getvalue()


LENS = map_lens()
LENS_URIS = set()


def extract(svg):
    """Move every embedded picture into a hashed file; PNG goes to lossless WebP."""
    files = {}

    def repl(m):
        mime, data = m.group(1), base64.b64decode(m.group(2))
        if m.group(0) in LENS_URIS:
            data, mime = LENS, 'image/webp-lossless'
        if mime == 'image/webp' and Q:
            im = Image.open(io.BytesIO(data))
            b = io.BytesIO()
            if im.mode == 'RGBA':
                im.save(b, 'WEBP', quality=Q, method=6, alpha_quality=max(40, Q))
            else:
                im.save(b, 'WEBP', quality=Q, method=6)
            data = b.getvalue()
        if mime == 'image/png':
            b = io.BytesIO()
            Image.open(io.BytesIO(data)).save(b, 'WEBP', lossless=True, method=6)
            data = b.getvalue()
        name = hashlib.sha1(data).hexdigest()[:12] + '.webp'
        path = os.path.join(ASSETS, name)
        if not os.path.exists(path):
            open(path, 'wb').write(data)
        files[name] = len(data)
        return 'href="a/%s"' % name
    LENS_URIS.clear()
    for m in re.finditer(r'<feImage href="(data:image/png;base64,[^"]+)"', svg):
        LENS_URIS.add('href="%s"' % m.group(1))
    out = re.sub(r'href="data:(image/[a-z]+);base64,([^"]+)"', repl, svg)
    return out, files


report = {}
for w in WORLDS:
    mod = load(w)
    s = mod.svg(w[:2] + 'm', 'planet', w.capitalize(), with_stars=False, width=MAP_WIDTH)
    s, files = extract(s)
    open(os.path.join(DIST, w + '.svg'), 'w', encoding='utf-8').write(s)
    report[w] = {'svg': len(s.encode('utf-8')), 'svg_gz': len(gzip.compress(s.encode('utf-8'), 9)), 'files': files}

shared = {}
for w, r in report.items():
    for n, sz in r['files'].items():
        shared.setdefault(n, [sz, []])[1].append(w)
lines = []
total = 0
for w, r in report.items():
    own = sum(sz for n, sz in r['files'].items() if len(shared[n][1]) == 1)
    lines.append((w, r['svg_gz'], own))
    total += r['svg_gz'] + own  # the site serves markup compressed (CloudFront compress = true); pictures are already compressed
common = sum(sz for n, (sz, ws) in shared.items() if len(ws) > 1)
total += common
json.dump({'worlds': [{'name': w, 'svg_gz': a, 'own': b} for w, a, b in lines], 'shared': common, 'total_gz': total}, open(os.path.join(DIST, 'sizes.json'), 'w'))
for w, a, b in lines:
    print('%-8s markup (compressed) %4d KB  own pictures %4d KB  = %4d KB' % (w, a // 1024, b // 1024, (a + b) // 1024))
print('shared pictures (once for every world) %d KB' % (common // 1024))
print('total for these worlds %d KB' % (total // 1024))
