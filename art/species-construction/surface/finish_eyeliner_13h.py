"""Unchanged full-body gates and three native, pixel-exact comparison sheets."""
import sys
import json
import hashlib
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from analyze_sweep_12d import analyze
from rogue_hairs_13 import analyze as rogue

args = sys.argv[1:]
reuse = '--reuse-analysis' in args
if reuse:
    args.remove('--reuse-analysis')
before, after = map(Path, args)
assert json.loads((after/'held-data.json').read_text())['unchanged']
index = json.loads((after/'after/index.json').read_text())
assert index['eyeliner'] == 'G1-ribbon'
assert index['eyelinerSourceSha256'] == hashlib.sha256(Path(__file__).with_name('eyeliner_styles.py').read_bytes()).hexdigest()
assert json.loads(Path(__file__).with_name('akinza-surface.json').read_text())['eyeliner']['style'] == 'G1-ribbon'
assert json.loads((after/'before/index.json').read_text())['eyeliner'] == 'G1-outer'
if not reuse:
    analyze(after/'r')
    rogue(after/'r')
f = np.load(before/'r/sweep-flags.npz')
g = np.load(after/'r/sweep-flags.npz')
n = len(f['region'])
assert len(g['region']) >= n
names = list(json.loads((before/'r/sweep-metrics.json').read_text())['regions'])
metrics = {}
for key in ('collision', 'neighborLength', 'regionalLength', 'partTransfer', 'lift', 'rogue'):
    bf = f[key] if key != 'rogue' else np.load(before/'r/rogue-flags.npz')['rogue']
    af = g[key] if key != 'rogue' else np.load(after/'r/rogue-flags.npz')['rogue']
    metrics[key] = dict(newFlags=int((af[:n] & ~bf).sum()+af[n:].sum()), newSystemFlags=int(af[n:].sum()), regions={name: dict(before=int((bf & (f['region'] == i)).sum()), after=int((af & (g['region'] == i)).sum())) for i, name in enumerate(names)})
(after/'artifact-gate.json').write_text(json.dumps(metrics, indent=2))
gate_pass = all(v['newFlags'] == 0 and all(r['after'] <= r['before'] for r in v['regions'].values()) for v in metrics.values())
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 26)
for view, name in [('eye-close', 'close'), ('head34', 'head34'), ('head-front', 'face')]:
    a = Image.open(after/'before'/f'{view}.png').convert('RGB')
    b = Image.open(after/'after'/f'{view}.png').convert('RGB')
    assert a.size == b.size
    w, h = a.size
    sheet = Image.new('RGB', (w*2, h+44), '#f0f0f0')
    draw = ImageDraw.Draw(sheet)
    draw.text((14, 8), 'Before: 13e', font=font, fill='#172532')
    draw.text((w+14, 8), 'Now: 13h G1-ribbon', font=font, fill='#172532')
    sheet.paste(a, (0, 44))
    sheet.paste(b, (w, 44))
    sheet.save(after.parent/f'13h-eyeliner-{name}.png')
    p = np.array(sheet)
    assert np.array_equal(p[44:, :w], np.array(a)) and np.array_equal(p[44:, w:], np.array(b))
print('13H_NATIVE_PAIRS_PIXEL_EXACT', flush=True)
assert gate_pass, 'New flags or regional rise; see artifact-gate.json. Comparison sheets retained.'
print('13H_FULL_ARTIFACT_GATE_PASS')
