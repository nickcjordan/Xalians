"""Step 21 jobs under one PC lease: build | calibrate | final."""
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORK = HERE.parents[2] / 'untracked/species-construction/akinza/surface/fur-steps'
if '--worker' not in sys.argv:
    raise SystemExit(subprocess.call([
        sys.executable, 'C:/dev/src/xalians-creature-pipeline/art/pipeline/slot/slot.py',
        'run', 'gpu', '--wait', '7200', '--owner', 'Akinza 21 ear poof ombre reversed',
        '--', sys.executable, __file__, '--worker', *sys.argv[1:]]))
sys.argv.remove('--worker')
stage = sys.argv[1]
before, after = WORK / 's12-20', WORK / 's12-21'


def job(script, label, args):
    print('21_JOB_BEGIN', label, flush=True)
    subprocess.run([sys.executable, str(HERE / 'run_fur_12e.py'), '--worker', script,
                    '21-' + label + '.log', '--', *map(str, args)], check=True)
    print('21_JOB_END', label, flush=True)


if stage == 'build':
    job('build_ear_poof_21.py', 'build', [before, after])
    job('review_ear_poof_19.py', 'calib1', ['--surface', after, '--out', after / 'calib1',
        '--views', 'ears-front', '--samples', '32', '--palette', 'T7', '--poof-color', 'P-ombre-rev'])
elif stage == 'final':
    if '--reset-default' in sys.argv:
        job('build_ear_poof_21.py', 'default', [before, after, '--set-default-only'])
    job('review_fur_13.py', 'final', ['--surface', after, '--out', after / 'after',
        '--views', 'ears-front,ear-root-close,head-side,head-backq,body-backq,body-front,tails-side',
        '--samples', '32', '--palette', 'T7'])
print('21_STAGE_DONE', stage, flush=True)
