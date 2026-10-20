"""Step 21 jobs under one PC lease: build | calibrate | final."""
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORK = HERE.parents[2] / 'untracked/species-construction/akinza/surface/fur-steps'
if '--worker' not in sys.argv:
    raise SystemExit(subprocess.call([
        sys.executable, 'C:/dev/src/xalians-creature-pipeline/art/pipeline/slot/slot.py',
        'run', 'gpu', '--wait', '7200', '--owner', 'Akinza 22 ombre only on the ear tuft',
        '--', sys.executable, __file__, '--worker', *sys.argv[1:]]))
sys.argv.remove('--worker')
before, after = WORK / 's12-21', WORK / 's12-22'


def job(script, label, args):
    print('22_JOB_BEGIN', label, flush=True)
    subprocess.run([sys.executable, str(HERE / 'run_fur_12e.py'), '--worker', script,
                    '22-' + label + '.log', '--', *map(str, args)], check=True)
    print('22_JOB_END', label, flush=True)


job('build_ear_poof_22.py', 'build', [before, after])
job('review_fur_13.py', 'final', ['--surface', after, '--out', after / 'after',
    '--views', 'ears-front,ear-root-close,head-side,head-backq,body-backq,body-front,tails-side',
    '--samples', '32', '--palette', 'T7'])
print('22_DONE', flush=True)
