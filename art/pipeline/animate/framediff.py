"""Per-frame image difference curve of a rendered frame sequence (motion polish, pass 10).

python framediff.py FRAMES_DIR [FRAMES_DIR ...] [--json OUT.json]
Mean absolute difference of consecutive frames, grayscale 0-255, at full size and at 192 px wide (the sprite size).
"""
import sys, json
from pathlib import Path
import numpy as np
from PIL import Image

args = sys.argv[1:]; out = None
if '--json' in args: i = args.index('--json'); out = args[i + 1]; args = args[:i] + args[i + 2:]
res = {}
for d in args:
    fs = sorted(Path(d).glob('[0-9][0-9][0-9][0-9].png')); prev = prev_s = None; full = {}; small = {}
    for f in fs:
        im = Image.open(f).convert('L'); a = np.asarray(im, np.float32)
        s = np.asarray(im.resize((192, round(im.height * 192 / im.width)), Image.LANCZOS), np.float32)
        if prev is not None:
            k = int(f.stem); full[k] = round(float(np.abs(a - prev).mean()), 2); small[k] = round(float(np.abs(s - prev_s).mean()), 2)
        prev, prev_s = a, s
    res[d] = dict(full=full, s192=small)
    print(Path(d).name, ' '.join(f'{k}:{v}' for k, v in full.items()))
if out: json.dump(res, open(out, 'w'), indent=1)
