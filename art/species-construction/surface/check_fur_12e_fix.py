"""Serial saved-result sweep, scope verification and the three required renders."""
import argparse
import subprocess
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
HERE=Path(__file__).resolve().parent
BASE=ROOT/'untracked/species-construction/akinza/surface/fur-steps'
p=argparse.ArgumentParser();p.add_argument('--before',type=Path,default=BASE/'s12d');p.add_argument('--after',type=Path,default=BASE/'s12e-fix');p.add_argument('--parent',type=Path,default=BASE/'s12e');p.add_argument('--render',action='store_true');p.add_argument('--worker',action='store_true');a=p.parse_args()
if not a.worker:
    slot=Path('C:/dev/src/xalians-creature-pipeline/art/pipeline/slot/slot.py')
    raise SystemExit(subprocess.call([sys.executable,str(slot),'run','gpu','--wait','1800',
                                     '--owner','Akinza fur 12e serial validation','--',
                                     sys.executable,__file__,'--worker',*sys.argv[1:]]))


def blender(script,log,args):
    subprocess.run([sys.executable,str(HERE/'run_fur_12e.py'),'--worker',script,log,'--',*map(str,args)],check=True)


blender('sweep_fur_12d.py','12e-fix-sweep.log',[a.after,a.after/'r'])
blender('sweep_obstacles_12d.py','12e-fix-obstacles.log',[a.after,a.after/'r'])
subprocess.run([sys.executable,str(HERE/'analyze_sweep_12d.py'),str(a.after/'r')],check=True)
subprocess.run([sys.executable,str(HERE/'check_selection_12e_fix.py'),str(a.before),str(a.after),str(a.parent)],check=True)
blender('verify_fur_12e_fix.py','12e-fix-verify.log',[a.before,a.after])
subprocess.run([sys.executable,str(HERE/'measure_fur_12e_fix.py'),'--before',str(a.before),'--after',str(a.after)],check=True)
if a.render:
    blender('review_fur_12e.py','12e-fix-after-render.log',['--surface',a.after,'--out',a.after/'r','--views','tails-side,tails-back,tails-threequarter','--samples','32','--palette','T7'])
    subprocess.run([sys.executable,str(HERE/'measure_fur_12e_fix.py'),'--before',str(a.before),'--after',str(a.after)],check=True)
