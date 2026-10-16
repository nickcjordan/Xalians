"""Execute the sparse repair and all requested saved checks serially."""
import subprocess,sys,argparse
from pathlib import Path
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
WORK=ROOT/'untracked/species-construction/akinza/surface/fur-steps'
p=argparse.ArgumentParser();p.add_argument('--before',type=Path,default=WORK/'s12f');p.add_argument('--after',type=Path,default=WORK/'s12-13b');p.add_argument('--skip-before',action='store_true');p.add_argument('--try-number',type=int,default=1);a=p.parse_args()
before=a.before;after=a.after
def local(script,args):subprocess.run([sys.executable,str(HERE/script),*map(str,args)],check=True)
def blender(script,log,args):local('run_fur_12e.py',[script,log,'--',*args])
local('plan_rogue_13b.py',[before,after])
if not a.skip_before:
    blender('review_fur_13.py','13b-before-render.log',['--surface',before,'--out',WORK/'13b-before','--views','head-backq,ear-tip-close','--samples','32','--palette','T7'])
else:
    assert all((WORK/'13b-before'/f'{view}.png').exists() for view in ('head-backq','ear-tip-close'))
blender('refine_rogue_hairs_13b.py',f'13b-build{a.try_number}.log',[before,after])
blender('review_fur_13.py',f'13b-after-render-try{a.try_number}.log',['--surface',after,'--out',after/'r','--views','head-backq,ear-tip-close,ears-front,ear-root-close','--samples','32','--palette','T7'])
local('check_fur_13.py',[before,after,'13b'])
local('pairs_fur_13.py',[WORK/'13b-before',after,'13b'])
print('13B_PIPELINE_FINISHED')
