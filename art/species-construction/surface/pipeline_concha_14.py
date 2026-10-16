"""Exclusive PC evidence lease; final mode renders while mini runs full checks."""
import subprocess
import sys
import json
import hashlib
from pathlib import Path
from concha_14_paths import baseline
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
WORK=ROOT/'untracked/species-construction/akinza/surface/fur-steps'
if '--worker' not in sys.argv:
    raise SystemExit(subprocess.call([sys.executable,'C:/dev/src/xalians-creature-pipeline/art/pipeline/slot/slot.py',
        'run','gpu','--wait','7200','--owner','Akinza step 14 native renders and full saved checks','--',sys.executable,__file__,'--worker',*sys.argv[1:]]))
sys.argv.remove('--worker')
final='--final' in sys.argv
after=WORK/('s12-14' if (WORK/'s12-14').is_dir() else 's14b');before=baseline(WORK)
def job(script,label,args):
    print('14_JOB_BEGIN',label,flush=True)
    subprocess.run([sys.executable,str(HERE/'run_fur_12e.py'),'--worker',script,'14-'+('final-' if final else '')+label+'.log','--',*map(str,args)],check=True)
    print('14_JOB_END',label,flush=True)
if '--checks-only' not in sys.argv:
    job('render_concha_coat_14.py','after',[ '--surface',after,'--out',after/'after','--views','ears-front,ear-root-close,head-side,head-backq,body-backq,body-front,tails-side','--samples','32','--palette','T7'])
    binding=after/'before/source.json'
    earlier_baseline=WORK/'s14c/before'
    if not binding.exists() and (earlier_baseline/'source.json').is_file():
        import shutil
        shutil.copytree(earlier_baseline,after/'before',dirs_exist_ok=True)
    reuse=binding.is_file() and json.loads(binding.read_text())==dict(surfaceSha256=hashlib.sha256((before/'surface.blend').read_bytes()).hexdigest(),viewSourceSha256=hashlib.sha256((HERE/'render_concha_coat_14.py').read_bytes()).hexdigest())
    if not reuse:job('render_concha_coat_14.py','before',['--surface',before,'--out',after/'before','--views','ears-front,ear-root-close','--samples','32','--palette','T7'])
if '--render-only' not in sys.argv and (not final or '--force-checks' in sys.argv):
    job('verify_concha_14.py','held',[before,after])
    job('sweep_fur_12d.py','skin',[after,after/'r'])
    job('sweep_obstacles_12d.py','solids',[after,after/'r'])
print('14_PC_EVIDENCE_FINISHED',flush=True)
