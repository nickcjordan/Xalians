"""Step 23 gate: native strands versus s12-18 (identical native geometry), poof
strands (ids >= 420420, culled ones inactive) reported by category."""
import json
from pathlib import Path
import numpy as np
from analyze_sweep_12d import analyze
from rogue_hairs_13 import analyze as rogue

WORK = Path(__file__).resolve().parents[3] / 'untracked/species-construction/akinza/surface/fur-steps'
b, a = WORK / 's12-18', WORK / 's12-23'
N = 420420
analyze(a / 'r')
rogue(a / 'r')
fb, fa = np.load(b / 'r/sweep-flags.npz'), np.load(a / 'r/sweep-flags.npz')
rb, ra = np.load(b / 'r/rogue-flags.npz'), np.load(a / 'r/rogue-flags.npz')
rep = {}
for key in ('collision', 'neighborLength', 'regionalLength', 'partTransfer', 'lift', 'rogue'):
    ob = rb['rogue'] if key == 'rogue' else fb[key]
    oa = ra['rogue'] if key == 'rogue' else fa[key]
    rep[key] = dict(nativeNew=int((oa[:N] & ~ob[:N]).sum()), poof18=int(ob[N:].sum()), poof23=int(oa[N:].sum()))
for k in ('long', 'straight', 'oblique', 'contrary'):
    rep['rogue_' + k] = dict(poof18=int(rb[k][N:].sum()), poof23=int(ra[k][N:].sum()))
(a / 'artifact-gate.json').write_text(json.dumps(rep, indent=2) + '\n')
print(json.dumps(rep, indent=1))
