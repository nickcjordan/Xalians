"""Compare unchanged body-wide gates and assemble native 13i review images."""
import sys
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from analyze_sweep_12d import analyze
from rogue_hairs_13 import analyze as rogue

before, original, after = map(Path, sys.argv[1:])
analyze(after/'r'); rogue(after/'r')
f = np.load(before/'r/sweep-flags.npz');g = np.load(after/'r/sweep-flags.npz')
assert len(f['region']) == len(g['region'])
names = list(json.loads((before/'r/sweep-metrics.json').read_text())['regions'])
metrics = {}
origins = {}
patch = np.load(after/'patch-evidence.npz')
original_flags = np.load(original/'r/sweep-flags.npz')
original_rogue = np.load(original/'r/rogue-flags.npz')['rogue']
new = np.zeros(len(g['region']), bool)
for key in ('collision', 'neighborLength', 'regionalLength', 'partTransfer', 'lift', 'rogue'):
    bf = f[key] if key != 'rogue' else np.load(before/'r/rogue-flags.npz')['rogue']
    af = g[key] if key != 'rogue' else np.load(after/'r/rogue-flags.npz')['rogue']
    new |= af & ~bf
    ids=np.where(af & ~bf)[0]
    native_ids=ids[ids<len(patch['restore'])]
    source_flags=original_rogue if key=='rogue' else original_flags[key]
    origins[key]=dict(newIds=ids.tolist(),
        alreadyFlaggedIn13b=native_ids[source_flags[native_ids]].tolist(),
        exactRestored13b=native_ids[patch['restore'][native_ids]&~patch['trim'][native_ids]].tolist(),
        trimmedApex=native_ids[patch['trim'][native_ids]].tolist(),
        heldOtherSystem=ids[ids>=len(patch['restore'])].tolist())
    metrics[key] = dict(newFlags=int((af & ~bf).sum()), regions={name:dict(before=int((bf & (f['region']==i)).sum()), after=int((af & (g['region']==i)).sum())) for i,name in enumerate(names)})
(after/'artifact-gate.json').write_text(json.dumps(metrics, indent=2)+'\n')
(after/'artifact-origin.json').write_text(json.dumps(origins,indent=2)+'\n')
np.savez_compressed(after/'new-flags.npz', new=new)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 24)
for view, path, label in [('head-backq', after/'before/head-backq.png', '13h'), ('ear-tip-close', original/'r/ear-tip-close.png', '13b')]:
    a = Image.open(path).convert('RGB');b = Image.open(after/'after'/f'{view}.png').convert('RGB')
    assert a.size == b.size
    w,h = a.size;sheet = Image.new('RGB', (w*2,h+38), '#f0f0f0');draw = ImageDraw.Draw(sheet)
    draw.text((12,5), 'Before: '+label, font=font, fill='#172532')
    draw.text((w+12,5), 'Now: 13i', font=font, fill='#172532')
    sheet.paste(a,(0,38));sheet.paste(b,(w,38));sheet.save(after.parent/f'13i-{view}.png')
    p = np.array(sheet)
    assert np.array_equal(p[38:,:w], np.array(a)) and np.array_equal(p[38:,w:], np.array(b))
for view in ('ears-front','head-side','head-backq','body-backq','body-front','tails-side'):
    source=Image.open(after/'after'/f'{view}.png')
    target=after.parent/f'current-{view}.png'
    source.save(target)
    assert np.array_equal(np.array(source),np.array(Image.open(target)))
(after/'pair-check.json').write_text(json.dumps(dict(nativePixels=True, beforeLeft=True, comparisons=['13h head-backq', '13b ear-tip-close'], currentViews=6, currentPixelsExact=True),indent=2)+'\n')
assert all(v['newFlags']==0 and all(r['after']<=r['before'] for r in v['regions'].values()) for v in metrics.values()), 'New flag or regional rise; inspect artifact-gate.json'
print('13I_ALL_BODY_GATES_AND_NATIVE_PAIRS_PASS')
