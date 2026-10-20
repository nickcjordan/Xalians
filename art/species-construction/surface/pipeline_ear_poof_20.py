"""Step 19: save the default gray, then render every option, under one PC lease."""
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORK = HERE.parents[2] / 'untracked/species-construction/akinza/surface/fur-steps'
if '--worker' not in sys.argv:
    raise SystemExit(subprocess.call([
        sys.executable, 'C:/dev/src/xalians-creature-pipeline/art/pipeline/slot/slot.py',
        'run', 'gpu', '--wait', '7200', '--owner', 'Akinza 20 blue-white ear poof options',
        '--', sys.executable, __file__, '--worker', *sys.argv[1:]]))
before, after = WORK / 's12-19', WORK / 's12-20'


def job(script, label, args):
    print('20_JOB_BEGIN', label, flush=True)
    subprocess.run([sys.executable, str(HERE / 'run_fur_12e.py'), '--worker', script,
                    '20-' + label + '.log', '--', *map(str, args)], check=True)
    print('20_JOB_END', label, flush=True)


job('build_ear_poof_20.py', 'build', [before, after])
for name in ('P-ice', 'P-ombre'):
    job('review_ear_poof_19.py', 'render-' + name, ['--surface', after, '--out', after / ('opt-' + name),
        '--views', 'ears-front,ear-root-close', '--samples', '32', '--palette', 'T7', '--poof-color', name])
job('review_ear_poof_19.py', 'render-white', ['--surface', after, '--out', after / 'opt-white',
    '--views', 'ears-front,ear-root-close', '--samples', '32', '--palette', 'T7', '--poof-color', 'white'])
print('20_PIPELINE_FINISHED', flush=True)
