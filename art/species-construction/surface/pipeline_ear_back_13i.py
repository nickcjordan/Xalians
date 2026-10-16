"""Build, verify, render and sweep 13i serially under one PC compute lease."""
import subprocess
import sys
import shutil
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
WORK = ROOT/'untracked/species-construction/akinza/surface/fur-steps'
ARCHIVE = Path('C:/Users/njord/.claude/scratch-archive/Xalians/2026-10-15')
if '--worker' not in sys.argv:
    raise SystemExit(subprocess.call([
        sys.executable, 'C:/dev/src/xalians-creature-pipeline/art/pipeline/slot/slot.py',
        'run', 'gpu', '--wait', '7200', '--owner', 'Akinza 13i local build and evidence',
        '--', sys.executable, __file__, '--worker', *sys.argv[1:]]))
sys.argv.remove('--worker')
no_build = '--no-build' in sys.argv
if no_build:sys.argv.remove('--no-build')
plan = Path(sys.argv[1])
run = sys.argv[2]
before = WORK/'s12-13h'
if not before.exists():before = ARCHIVE/'s12-13h-superseded-13i'
original = ARCHIVE/'s12-13b-superseded-13c'
after = WORK/'s12-13i'
if run == 'restart2':
    saved = after/'restart1'
    saved.mkdir(exist_ok=False)
    for name in ('surface.blend','surface-info.json','patch-evidence.npz','held-data.json'):
        shutil.copy2(after/name, saved/name)
    for name in ('after','r'):
        source=(after/name).resolve();target=(saved/name).resolve()
        assert source.is_relative_to(after.resolve()) and target.is_relative_to(after.resolve())
        shutil.move(str(source),str(target))
    # The unchanged 13h comparison was rendered during restart1 with the same
    # cameras, T7 palette and shader source. Bind reuse to the actual source.
    assert (after/'before/head-backq.png').is_file()
    (after/'before/source.json').write_text(json.dumps(dict(
        surfaceSha256=hashlib.sha256((before/'surface.blend').read_bytes()).hexdigest(),
        reusedFrom='restart1 local native 13h render'),indent=2)+'\n')

def job(script, label, args):
    print('13I_JOB_BEGIN', label, flush=True)
    subprocess.run([sys.executable, str(HERE/'run_fur_12e.py'), '--worker', script,
                    '13i-local-'+run+'-'+label+'.log', '--', *map(str, args)], check=True)
    print('13I_JOB_END', label, flush=True)

if not no_build:
    job('restore_ear_back_13i.py', 'build', [before, original, WORK/'13i-restore-plan.npz', after, plan])
job('verify_ear_back_13i.py', 'held', [before, original, after])
job('review_ear_back_13i.py', 'after', ['--surface', after, '--out', after/'after',
    '--views', 'head-backq,ear-tip-close,ears-front,head-side,body-backq,body-front,tails-side',
    '--samples', '32', '--palette', 'T7'])
if not (after/'before/source.json').is_file():
    job('review_ear_back_13i.py', 'before', ['--surface', before, '--out', after/'before',
        '--views', 'head-backq', '--samples', '32', '--palette', 'T7'])
else:
    assert json.loads((after/'before/source.json').read_text())['surfaceSha256'] == hashlib.sha256((before/'surface.blend').read_bytes()).hexdigest()
job('sweep_fur_12d.py', 'skin', [after, after/'r'])
job('sweep_obstacles_12d.py', 'solids', [after, after/'r'])
print('13I_LOCAL_EVIDENCE_FINISHED', flush=True)
