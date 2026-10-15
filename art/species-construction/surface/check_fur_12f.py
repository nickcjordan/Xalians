"""Serial final saved sweeps, held-data checks and the requested render set."""
import argparse,subprocess,sys
from pathlib import Path
here=Path(__file__).resolve().parent;root=here.parents[2]
work=root/'untracked/species-construction/akinza/surface/fur-steps'
p=argparse.ArgumentParser();p.add_argument('--before',type=Path,default=work/'s12e-fix');p.add_argument('--after',type=Path,default=work/'s12f');p.add_argument('--render',action='store_true');a=p.parse_args()
def blender(script,log,args):
    subprocess.run([sys.executable,str(here/'run_fur_12e.py'),script,log,'--',*map(str,args)],check=True)
if a.render:
    blender('review_fur_12f.py','12f-final-render.log',['--surface',a.after,'--out',a.after/'r','--views','ears-front,ear-root-close,head-side,head-backq,body-backq,body-front,tails-side','--samples','32','--palette','T7'])
blender('sweep_fur_12d.py','12f-final-sweep.log',[a.after,a.after/'r'])
blender('sweep_obstacles_12d.py','12f-final-obstacles.log',[a.after,a.after/'r'])
subprocess.run([sys.executable,str(here/'analyze_sweep_12d.py'),str(a.after/'r')],check=True)
blender('verify_fur_12f.py','12f-final-protection.log',[a.after,a.before])
subprocess.run([sys.executable,str(here/'measure_fur_12f.py'),str(a.before),str(a.after)],check=True)
