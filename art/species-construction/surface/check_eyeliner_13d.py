"""Rerun the full 12d sweep on the held 13b surface used for 13d mockups."""
import argparse,subprocess,sys,json
from pathlib import Path
import numpy as np
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
WORK=ROOT/'untracked/species-construction/akinza/surface/fur-steps'
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--surface',type=Path,default=WORK/'s12-13b')
SURFACE=parser.parse_args().surface;OUT=WORK/'s13d/r'
for script in ('sweep_fur_12d.py','sweep_obstacles_12d.py'):
    subprocess.run([sys.executable,str(HERE/'run_fur_12e.py'),script,f'13d-{script}.log','--',str(SURFACE),str(OUT)],check=True)
subprocess.run([sys.executable,str(HERE/'analyze_sweep_12d.py'),str(OUT)],check=True)
f=np.load(SURFACE/'r/sweep-flags.npz');g=np.load(OUT/'sweep-flags.npz')
names=list(json.loads((SURFACE/'r/sweep-metrics.json').read_text())['regions'])
metrics={key:dict(newFlags=int((g[key]&~f[key]).sum()),regions={name:dict(before=int((f[key]&(f['region']==i)).sum()),after=int((g[key]&(g['region']==i)).sum())) for i,name in enumerate(names)}) for key in ('collision','neighborLength','regionalLength','partTransfer','lift')}
assert all(v['newFlags']==0 and all(r['after']<=r['before'] for r in v['regions'].values()) for v in metrics.values())
(WORK/'s13d/artifact-gate.json').write_text(json.dumps(metrics,indent=2))
print('13D_FULL_ARTIFACT_GATE_PASS')
