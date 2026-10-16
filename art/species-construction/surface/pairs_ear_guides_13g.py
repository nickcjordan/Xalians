"""Native matched 13g sheets and exactly six current saved-surface views."""
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

before, after = map(Path, sys.argv[1:3])
work = after.parent
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 24)
checks = {}
for view in ('ears-front', 'ear-root-close', 'ear-tip-close'):
    a = Image.open(before / f'{view}.png').convert('RGB')
    b = Image.open(after / 'r' / f'{view}.png').convert('RGB')
    assert a.size == b.size
    w, h = a.size
    pair = Image.new('RGB', (2 * w, h + 38), '#f0f0f0')
    draw = ImageDraw.Draw(pair)
    draw.text((12, 5), 'Before: 13e', font=font, fill='#172532')
    draw.text((w + 12, 5), 'Now: 13g', font=font, fill='#172532')
    pair.paste(a, (0, 38))
    pair.paste(b, (w, 38))
    pair.save(work / f'13g-{view}.png')
    pixels = np.array(pair)
    assert np.array_equal(pixels[38:, :w], np.array(a))
    assert np.array_equal(pixels[38:, w:], np.array(b))
    checks[view] = dict(nativePixels=True, beforeLeft=True, size=list(pair.size))
if '--pairs-only' not in sys.argv:
    for view in ('ears-front', 'head-side', 'head-backq', 'body-backq', 'body-front', 'tails-side'):
        Image.open(after / 'r' / f'{view}.png').save(work / f'current-{view}.png')
(after / 'pair-check.json').write_text(json.dumps(checks, indent=2) + '\n')
print('13G_NATIVE_PAIRS_PASS' if '--pairs-only' in sys.argv else '13G_NATIVE_PAIRS_AND_SIX_CURRENT_VIEWS_PASS')
