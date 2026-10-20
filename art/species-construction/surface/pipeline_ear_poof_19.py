"""Step 19: save the default gray, then render every option, under one PC lease."""
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORK = HERE.parents[2] / 'untracked/species-construction/akinza/surface/fur-steps'
if '--worker' not in sys.argv:
    raise SystemExit(subprocess.call([
        sys.executable, 'C:/dev/src/xalians-creature-pipeline/art/pipeline/slot/slot.py',
        'run', 'gpu', '--wait', '7200', '--owner', 'Akinza 19 ear poof color options',
        '--', sys.executable, __file__, '--worker', *sys.argv[1:]]))
before, after = WORK / 's12-18', WORK / 's12-19'


def job(script, label, args):
    print('19_JOB_BEGIN', label, flush=True)
    subprocess.run([sys.executable, str(HERE / 'run_fur_12e.py'), '--worker', script,
                    '19-' + label + '.log', '--', *map(str, args)], check=True)
    print('19_JOB_END', label, flush=True)


job('build_ear_poof_19.py', 'build', [before, after])
for name in ('white', 'G-a', 'G-c'):
    job('review_ear_poof_19.py', 'render-' + name, ['--surface', after, '--out', after / ('opt-' + name),
        '--views', 'ears-front,ear-root-close', '--samples', '32', '--palette', 'T7', '--poof-color', name])
job('review_ear_poof_19.py', 'render-G-b', ['--surface', after, '--out', after / 'after',
    '--views', 'ears-front,ear-root-close,head-side,head-backq,body-backq,body-front,tails-side',
    '--samples', '32', '--palette', 'T7', '--poof-color', 'G-b'])
print('19_PIPELINE_FINISHED', flush=True)
