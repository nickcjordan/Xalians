"""Build, render and sweep step 15 serially under one PC compute lease."""
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
WORK = ROOT / 'untracked/species-construction/akinza/surface/fur-steps'
ARCHIVE = Path('C:/Users/njord/.claude/scratch-archive/Xalians/2026-10-15')
if '--worker' not in sys.argv:
    raise SystemExit(subprocess.call([
        sys.executable, 'C:/dev/src/xalians-creature-pipeline/art/pipeline/slot/slot.py',
        'run', 'gpu', '--wait', '7200', '--owner', 'Akinza 18 ear poof build and evidence',
        '--', sys.executable, __file__, '--worker', *sys.argv[1:]]))
sys.argv.remove('--worker')
before = WORK / 's12-16half'
after = WORK / 's12-18'
skip = set(sys.argv[1:])


def job(script, label, args):
    print('15_JOB_BEGIN', label, flush=True)
    subprocess.run([sys.executable, str(HERE / 'run_fur_12e.py'), '--worker', script,
                    '18-' + label + '.log', '--', *map(str, args)], check=True)
    print('15_JOB_END', label, flush=True)


if 'build' not in skip:
    job('build_ear_poof_18.py', 'build', [before, after])
if 'render' not in skip:
    job('review_ear_fan_15.py', 'render', ['--surface', after, '--out', after / 'after',
        '--views', 'ears-front,ear-root-close,head-side,head-backq,body-backq,body-front,tails-side',
        '--samples', '32', '--palette', 'T7'])
if 'skin' not in skip:
    job('sweep_fur_12d.py', 'skin', [after, after / 'r'])
if 'solids' not in skip:
    job('sweep_obstacles_12d.py', 'solids', [after, after / 'r'])
print('18_PIPELINE_FINISHED', flush=True)
