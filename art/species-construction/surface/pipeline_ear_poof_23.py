"""Step 21 jobs under one PC lease: build | calibrate | final."""
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORK = HERE.parents[2] / 'untracked/species-construction/akinza/surface/fur-steps'
if '--worker' not in sys.argv:
    raise SystemExit(subprocess.call([
        sys.executable, 'C:/dev/src/xalians-creature-pipeline/art/pipeline/slot/slot.py',
        'run', 'gpu', '--wait', '7200', '--owner', 'Akinza 23 poof kept on the ear',
        '--', sys.executable, __file__, '--worker', *sys.argv[1:]]))
sys.argv.remove('--worker')
before, after = WORK / 's12-22', WORK / 's12-23'


def job(script, label, args):
    print('23_JOB_BEGIN', label, flush=True)
    subprocess.run([sys.executable, str(HERE / 'run_fur_12e.py'), '--worker', script,
                    '23-' + label + '.log', '--', *map(str, args)], check=True)
    print('23_JOB_END', label, flush=True)


job('build_ear_poof_23.py', 'build', [before, after])
job('review_fur_13.py', 'final', ['--surface', after, '--out', after / 'after',
    '--views', 'ears-front,ear-root-close,head-side,head-backq,body-backq,body-front,tails-side',
    '--samples', '32', '--palette', 'T7'])
job('sweep_fur_12d.py', 'skin', [after, after / 'r'])
job('sweep_obstacles_12d.py', 'solids', [after, after / 'r'])
print('23_DONE', flush=True)
