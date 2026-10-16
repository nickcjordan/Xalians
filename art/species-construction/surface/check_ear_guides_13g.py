"""Apply the unchanged full 12d/13 artifact thresholds to all saved systems."""
import sys
import json
from pathlib import Path
import numpy as np
from analyze_sweep_12d import analyze
from rogue_hairs_13 import analyze as rogue

before, after = map(Path, sys.argv[1:])
analyze(after / 'r')
rogue(after / 'r')
f = np.load(before / 'r/sweep-flags.npz')
g = np.load(after / 'r/sweep-flags.npz')
n = len(f['region'])
expected_children = json.loads((after / 'surface-info.json').read_text())['earGuides13g']['childrenPerEar'] * 2
assert len(g['region']) == n + expected_children, 'Dedicated children omitted from sweep'
names = list(json.loads((before / 'r/sweep-metrics.json').read_text())['regions'])
metrics = {}
for key in ('collision', 'neighborLength', 'regionalLength', 'partTransfer', 'lift', 'rogue'):
    bf = f[key] if key != 'rogue' else np.load(before / 'r/rogue-flags.npz')['rogue']
    af = g[key] if key != 'rogue' else np.load(after / 'r/rogue-flags.npz')['rogue']
    metrics[key] = dict(newOriginalFlags=int((af[:n] & ~bf).sum()),
                        newSystemFlags=int(af[n:].sum()),
                        regions={name: dict(before=int((bf & (f['region'] == i)).sum()),
                                            after=int((af & (g['region'] == i)).sum()))
                                 for i, name in enumerate(names)})
(after / 'artifact-gate.json').write_text(json.dumps(metrics, indent=2) + '\n')
new = np.zeros(len(g['region']), bool)
for key in ('collision', 'neighborLength', 'regionalLength', 'partTransfer', 'lift', 'rogue'):
    bf = f[key] if key != 'rogue' else np.load(before / 'r/rogue-flags.npz')['rogue']
    af = g[key] if key != 'rogue' else np.load(after / 'r/rogue-flags.npz')['rogue']
    new[:n] |= af[:n] & ~bf
    new[n:] |= af[n:]
np.savez_compressed(after / 'new-flags.npz', new=new)
assert all(v['newOriginalFlags'] == 0 and v['newSystemFlags'] == 0 and
           all(r['after'] <= r['before'] for r in v['regions'].values())
           for v in metrics.values()), 'New flag or regional increase; inspect artifact-gate.json'
print('13G_ALL_SYSTEMS_ARTIFACT_GATE_PASS')
