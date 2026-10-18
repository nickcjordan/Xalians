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
        'run', 'gpu', '--wait', '7200', '--owner', 'Akinza 15 fix ear fan build and evidence',
        '--', sys.executable, __file__, '--worker', *sys.argv[1:]]))
sys.argv.remove('--worker')
before = WORK / 's12-13i'
after = WORK / 's12-15fix'
skip = set(sys.argv[1:])


def job(script, label, args):
    print('15_JOB_BEGIN', label, flush=True)
    subprocess.run([sys.executable, str(HERE / 'run_fur_12e.py'), '--worker', script,
                    '15fix-' + label + '.log', '--', *map(str, args)], check=True)
    print('15_JOB_END', label, flush=True)


if 'build' not in skip:
    job('build_ear_fan_15fix.py', 'build', [before, ARCHIVE / 's12-13g-superseded-13h/patch-evidence.npz', after])
if 'render' not in skip:
    job('review_ear_fan_15.py', 'render', ['--surface', after, '--out', after / 'after',
        '--views', 'ears-front,ear-root-close,head-side,head-backq,body-backq,body-front,tails-side',
        '--samples', '32', '--palette', 'T7'])
if 'hq' not in skip:
    job('review_ear_fan_15.py', 'render-hq', ['--surface', after, '--out', after / 'after-hq',
        '--views', 'ears-front', '--samples', '256', '--palette', 'T7', '--no-denoise'])
if 'before' not in skip:
    job('review_ear_fan_15.py', 'render-before', ['--surface', before, '--out', after / 'before',
        '--views', 'ear-root-close', '--samples', '32', '--palette', 'T7'])
if 'skin' not in skip:
    job('sweep_fur_12d.py', 'skin', [after, after / 'r'])
if 'solids' not in skip:
    job('sweep_obstacles_12d.py', 'solids', [after, after / 'r'])
print('15FIX_PIPELINE_FINISHED', flush=True)
