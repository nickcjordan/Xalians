"""Steps 24-28: one build plus before/after renders and the 12d sweeps, serially
under one PC lease.
  python pipeline_fix.py <tag> <before dir> <after dir> <build script> <views> [build args...]
"""
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORK = HERE.parents[2] / 'untracked/species-construction/akinza/surface/fur-steps'
if '--worker' not in sys.argv:
    raise SystemExit(subprocess.call([
        sys.executable, 'C:/dev/src/xalians-creature-pipeline/art/pipeline/slot/slot.py',
        'run', 'gpu', '--wait', '7200', '--owner', 'Akinza fur fix ' + sys.argv[1],
        '--', sys.executable, __file__, '--worker', *sys.argv[1:]]))
sys.argv.remove('--worker')
tag, before, after, build, views, *extra = sys.argv[1:]
before, after = WORK / before, WORK / after
skip = {a[7:] for a in extra if a.startswith('--skip=')}
extra = [a for a in extra if not a.startswith('--skip=')]


def job(script, label, args):
    print(tag + '_JOB_BEGIN', label, flush=True)
    subprocess.run([sys.executable, str(HERE / 'run_fur_12e.py'), '--worker', script,
                    f'{tag}-{label}.log', '--', *map(str, args)], check=True)
    print(tag + '_JOB_END', label, flush=True)


if 'build' not in skip:
    job(build, 'build', [before, after, *extra])
if 'before' not in skip:
    job('review_fix_24.py', 'render-before', ['--surface', before, '--out', after / 'before',
        '--views', views, '--samples', '32', '--palette', 'T7'])
if 'after' not in skip:
    job('review_fix_24.py', 'render-after', ['--surface', after, '--out', after / 'after',
        '--views', views, '--samples', '32', '--palette', 'T7'])
if 'sweep' not in skip:
    job('sweep_fur_12d.py', 'skin', [after, after / 'r'])
    job('sweep_obstacles_12d.py', 'solids', [after, after / 'r'])
print(tag + '_PIPELINE_DONE', flush=True)
