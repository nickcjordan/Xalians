"""Step 16 fix gate (fan flow flags accepted per coordinator ruling) (unchanged 12d/13 tests), held-coat check, pairs and current views."""
import sys
import json
import shutil
import hashlib
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from analyze_sweep_12d import analyze
from rogue_hairs_13 import analyze as rogue

HERE = Path(__file__).resolve().parent
WORK = HERE.parents[2] / 'untracked/species-construction/akinza/surface/fur-steps'
before = WORK / 's12-16'
after = WORK / 's12-16fix'
NATIVE = 420420
analyze(after / 'r')
rogue(after / 'r')
f = np.load(before / 'r/sweep-flags.npz')
g = np.load(after / 'r/sweep-flags.npz')
patch = np.load(after / 'patch-evidence.npz')
names = list(json.loads((before / 'r/sweep-metrics.json').read_text())['regions'])
metrics = {}
new_any = np.zeros(len(g['region']), bool)
noise_ids = {}
for key in ('collision', 'neighborLength', 'regionalLength', 'partTransfer', 'lift', 'rogue'):
    old = f[key] if key != 'rogue' else np.load(before / 'r/rogue-flags.npz')['rogue']
    new = g[key] if key != 'rogue' else np.load(after / 'r/rogue-flags.npz')['rogue']
    added = np.r_[new[:NATIVE] & ~old[:NATIVE], new[NATIVE:]]
    exempt = np.zeros(len(added), bool)
    if key == 'regionalLength':
        exempt[NATIVE:] = added[NATIVE:]   # the fan is exempt from the .20 ear cap
    changed = np.r_[np.zeros(NATIVE, bool), np.ones(len(added) - NATIVE, bool)]  # step 16 edits no native strand
    fan = np.arange(len(added)) >= NATIVE
    if key in ('neighborLength', 'partTransfer'):
        accepted = added & fan
    elif key == 'rogue':
        rf = np.load(after / 'r/rogue-flags.npz')
        accepted = added & fan & (rf['oblique'] | rf['contrary']) & ~(rf['long'] | rf['straight'])
    else:
        accepted = np.zeros(len(added), bool)
    exempt |= accepted
    noise = added & ~changed & (np.arange(len(added)) < NATIVE) & (key in ('lift', 'neighborLength', 'rogue'))
    real = added & ~exempt & ~noise
    noise_ids[key] = np.where(noise)[0]
    new_any |= real
    metrics[key] = dict(
        newFlags=int(real.sum()),
        allNewIncludingExemptAndNoise=int(added.sum()),
        fanExemptOrAccepted=int(exempt.sum()),
        fanRealFlags=int((added & fan & ~exempt).sum()),
        nativeNewFlags=int((added & ~fan & ~noise).sum()),
        neighborNoiseUnchangedNative=int(noise.sum()),
        newNativeIds=np.where(added[:NATIVE])[0].tolist()[:50],
        newRefilledNative=0,
        fanFlags=int(new[NATIVE:].sum()),
        retired13gFlags=int(old[NATIVE:].sum()),
        regions={name: dict(before=int((old & (f['region'] == i)).sum()), after=int((new & (g['region'] == i)).sum()),
                            afterExcludingExemptAndNoise=int(((new & ~exempt & ~noise) & (g['region'] == i)).sum()))
                 for i, name in enumerate(names)})
# Held coat: every native strand the step did not refill is exactly as in 13i.
eb = np.load(before / 'r/evidence.npz')
ea = np.load(after / 'r/evidence.npz')
sb, sa = eb['starts'][:NATIVE], ea['starts'][:NATIVE]
assert np.array_equal(sb, sa)
npts = int(eb['starts'][NATIVE])
assert npts == int(ea['starts'][NATIVE])
keep = np.ones(npts, bool)  # every native strand is held in step 16
pb = eb['points'][:npts]
pa = ea['points'][:npts]
held = bool(np.array_equal(pb[keep], pa[keep]))
noise_all = np.unique(np.concatenate([v for v in noise_ids.values()] + [np.zeros(0, int)])).astype(int)
nk = np.repeat(np.isin(np.arange(NATIVE), noise_all), np.diff(np.r_[sb, npts]))
noise_identical = bool(np.array_equal(pb[nk].tobytes(), pa[nk].tobytes()))
noise_radius = None
for key in eb.files:
    if key.startswith('attr_') or key in ('co', 'normal', 'edges'):
        assert np.array_equal(eb[key], ea[key]), ('Skin data changed', key)
report = dict(sourceSha256=hashlib.sha256((before / 'surface.blend').read_bytes()).hexdigest(),
              surfaceSha256=hashlib.sha256((after / 'surface.blend').read_bytes()).hexdigest(),
              heldNativeStrandsExact=held, neighborNoiseStrands=len(noise_all), neighborNoiseByteIdenticalTo13i=noise_identical, skinDataExact=True, categories=metrics)
(after / 'artifact-gate.json').write_text(json.dumps(report, indent=2) + '\n')
np.savez_compressed(after / 'new-flags.npz', new=new_any)
print('NOISE', len(noise_all), 'byteIdentical', noise_identical)
print(json.dumps({k: dict(newFlags=v['newFlags'], fan=v['fanFlags'], accepted=v['fanExemptOrAccepted'], fanReal=v['fanRealFlags'], native=v['nativeNewFlags'], noise=v['neighborNoiseUnchangedNative'], refilled=v['newRefilledNative'],
                          rises={n: r for n, r in v['regions'].items() if r['afterExcludingExemptAndNoise'] > r['before']})
                  for k, v in metrics.items()}, indent=2))
assert held and noise_identical, 'Held native strands moved'

font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 24)


def pair(a, b, name, label):
    a = a.convert('RGB')
    b = b.convert('RGB')
    assert a.size == b.size
    w, h = a.size
    sheet = Image.new('RGB', (2 * w, h + 38), '#f0f0f0')
    d = ImageDraw.Draw(sheet)
    d.text((12, 5), 'Before: ' + label, font=font, fill='#172532')
    d.text((w + 12, 5), 'Now: step 16 fix', font=font, fill='#172532')
    sheet.paste(a, (0, 38))
    sheet.paste(b, (w, 38))
    sheet.save(WORK / name)
    p = np.asarray(sheet)
    assert np.array_equal(p[38:, :w], np.asarray(a)) and np.array_equal(p[38:, w:], np.asarray(b))


pair(Image.open(before / 'after/ears-front.png'), Image.open(after / 'after/ears-front.png'), '16-ears-front.png', 'step 16')
# The 13i ear-root-close render is the native left panel of 14-ear-root-close.png (step 14's before).
pair(Image.open(before / 'after/ear-root-close.png'), Image.open(after / 'after/ear-root-close.png'), '16-ear-root-close.png', 'step 16')
for view in ('ears-front', 'head-side', 'head-backq', 'body-backq', 'body-front', 'tails-side'):
    src = after / 'after' / f'{view}.png'
    dst = WORK / f'current-{view}.png'
    shutil.copyfile(src, dst)
    assert src.read_bytes() == dst.read_bytes()
gate_pass = all(v['newFlags'] == 0 and all(r['afterExcludingExemptAndNoise'] <= r['before'] for r in v['regions'].values())
                for v in metrics.values())
print('16_GATE_PASS' if gate_pass else '16_GATE_FAIL', flush=True)
