"""Serial full saved artifact sweeps, held-data checks and diagnostic counts."""
import argparse,subprocess,sys,json
from pathlib import Path
import numpy as np
from rogue_hairs_13 import analyze as rogue
HERE=Path(__file__).resolve().parent
p=argparse.ArgumentParser();p.add_argument('before',type=Path);p.add_argument('after',type=Path);p.add_argument('part',choices=['13b','13c']);a=p.parse_args()
def blender(script,args):
    subprocess.run([sys.executable,str(HERE/'run_fur_12e.py'),script,f'{a.part}-{script}.log','--',*map(str,args)],check=True)
blender('sweep_fur_12d.py',[a.after,a.after/'r'])
blender('sweep_obstacles_12d.py',[a.after,a.after/'r'])
subprocess.run([sys.executable,str(HERE/'analyze_sweep_12d.py'),str(a.after/'r')],check=True)
rogue(a.after/'r')
blender('verify_fur_13.py',[a.before,a.after,a.part])
f=np.load(a.before/'r/sweep-flags.npz');g=np.load(a.after/'r/sweep-flags.npz');names=list(json.loads((a.before/'r/sweep-metrics.json').read_text())['regions'])
metrics={}
for key in ('collision','neighborLength','regionalLength','partTransfer','lift'):
    metrics[key]=dict(newFlags=int((g[key]&~f[key]).sum()),regions={name:dict(before=int((f[key]&(f['region']==i)).sum()),after=int((g[key]&(g['region']==i)).sum())) for i,name in enumerate(names)})
rf=np.load(a.before/'r/rogue-flags.npz');rg=np.load(a.after/'r/rogue-flags.npz')
metrics['rogue']=dict(newFlags=int((rg['rogue']&~rf['rogue']).sum()),regions={name:dict(before=int((rf['rogue']&(f['region']==i)).sum()),after=int((rg['rogue']&(g['region']==i)).sum())) for i,name in enumerate(names)})
(a.after/'metrics.json').write_text(json.dumps(metrics,indent=2))
assert all(v['newFlags']==0 and all(r['after']<=r['before'] for r in v['regions'].values()) for v in metrics.values()),'Artifact or rogue gate regression'
print('ALL_SAVED_GATES_PASS')
