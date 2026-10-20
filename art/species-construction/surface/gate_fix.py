"""Bug gate for steps 24-28 (unchanged 12d/13 tests).
  python gate_fix.py <before dir> <after dir> <changed key in after patch-evidence> <pairs: view:out.png,...>
Native strands (the 'Akinza fur' system, ids below its count) that the step did
not change and that newly flag only because their neighbors changed are
reported as neighbor noise; changed strands and any added system count as real.
"""
import sys
import json
import shutil
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from analyze_sweep_12d import analyze
from rogue_hairs_13 import analyze as rogue

WORK = Path(__file__).resolve().parents[3] / 'untracked/species-construction/akinza/surface/fur-steps'
before, after, key, pairs = WORK / sys.argv[1], WORK / sys.argv[2], sys.argv[3], sys.argv[4]
analyze(after / 'r')
rogue(after / 'r')
fb, fa = np.load(before / 'r/sweep-flags.npz'), np.load(after / 'r/sweep-flags.npz')
rb, ra = np.load(before / 'r/rogue-flags.npz'), np.load(after / 'r/rogue-flags.npz')
patch = np.load(after / 'patch-evidence.npz')
changed = patch[key]
M = len(changed)
nb = len(fb['region'])
assert nb >= M
rep = {}
for k in ('collision', 'neighborLength', 'regionalLength', 'partTransfer', 'lift', 'rogue'):
    ob = rb['rogue'] if k == 'rogue' else fb[k]
    oa = ra['rogue'] if k == 'rogue' else fa[k]
    new_native = oa[:M] & ~ob[:M]
    rep[k] = dict(changedStrandsNew=int((new_native & changed).sum()),
                  neighborNoise=int((new_native & ~changed).sum()),
                  oldExtraSystems=int(ob[M:].sum()), newExtraSystems=int(oa[M:].sum()),
                  nativeBefore=int(ob[:M].sum()), nativeAfter=int(oa[:M].sum()))
(after / 'artifact-gate.json').write_text(json.dumps(rep, indent=2) + '\n')
print(json.dumps(rep, indent=1))
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 24)
for item in pairs.split(','):
    view, name = item.split(':')
    a = Image.open(after / 'before' / f'{view}.png').convert('RGB')
    b = Image.open(after / 'after' / f'{view}.png').convert('RGB')
    w, h = a.size
    s = Image.new('RGB', (2 * w, h + 38), '#f0f0f0')
    d = ImageDraw.Draw(s)
    d.text((12, 5), 'Before', font=font, fill='#172532')
    d.text((w + 12, 5), 'Now', font=font, fill='#172532')
    s.paste(a, (0, 38)); s.paste(b, (w, 38)); s.save(WORK / name)
print('GATE_FIX_DONE')
