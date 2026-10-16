"""Fresh saved sweeps, protection check and all requested 13g deliverables."""
import subprocess
import sys
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
before, after = map(Path, sys.argv[1:3])


def run(script, *args):
    subprocess.run([sys.executable, str(HERE / script), *map(str, args)], check=True)


def blender(script, *args):
    if '--mini' not in sys.argv:
        busy = subprocess.run(['wsl', '-e', 'pgrep', '-x', 'blender'], capture_output=True).returncode == 0
        if not busy:
            result = subprocess.run([
                sys.executable, 'C:/dev/src/xalians-creature-pipeline/art/pipeline/slot/slot.py',
                'run', 'gpu', '--wait', '0', '--owner', 'Akinza 13g exclusive saved checks', '--',
                sys.executable, str(HERE / 'run_fur_12e.py'), '--worker', script,
                f'13g-final-{script}.log', '--', *map(str, args)])
            if result.returncode == 0:
                return
            if result.returncode != 3:
                raise subprocess.CalledProcessError(result.returncode, result.args)
    root = HERE.parents[2]
    inputs = [*HERE.glob('*.py'), *HERE.glob('*.json')]
    for surface in (before, after):
        inputs += [q for q in surface.iterdir() if q.is_file() and q.suffix in ('.blend', '.json', '.npz')]
    outputs = {
        'sweep_fur_12d.py': [after / 'r/evidence.npz', after / 'r/collision-evidence.npz'],
        'sweep_obstacles_12d.py': [after / 'r/obstacle-evidence.npz'],
        'verify_ear_guides_13g.py': [after / 'held-data.json'],
        'review_ear_guides_13g.py': [after / 'r' / f'{view}.png' for view in ('head-side', 'head-backq', 'body-backq', 'body-front', 'tails-side')] + [after / 'r/index.json', after / 'r/hair-scale.json']
    }[script]
    output_paths = {q.resolve() for q in outputs}
    inputs = [q for q in inputs if q.resolve() not in output_paths]
    job = dict(mappings=[dict(source=str(root), target='akinza')],
               inputs=list(map(str, inputs)), outputs=list(map(str, outputs)),
               args=['-b', '--factory-startup', '--python-exit-code', '1', '--python', str(HERE / script), '--', *map(str, args)])
    path = after / f'mini-{script}.json'
    path.write_text(json.dumps(job, indent=2))
    subprocess.run([sys.executable, 'C:/dev/src/xalians-mini-blender-compute/scripts/mini-blender.py',
                    str(path), '--route', 'mini', '--evidence', str(after / f'mini-{script}-evidence')], check=True)


resume = '--resume' in sys.argv
if not (resume and (after / 'held-data.json').exists()):
    blender('verify_ear_guides_13g.py', before, after)
if not (resume and (after / 'r/evidence.npz').exists() and (after / 'r/collision-evidence.npz').exists()):
    blender('sweep_fur_12d.py', after, after / 'r')
if not (resume and (after / 'r/obstacle-evidence.npz').exists()):
    blender('sweep_obstacles_12d.py', after, after / 'r')
run('check_ear_guides_13g.py', before, after)
blender('review_ear_guides_13g.py', '--surface', after, '--out', after / 'r',
        '--views', 'head-side,head-backq,body-backq,body-front,tails-side',
        '--samples', '32', '--palette', 'T7')
run('measure_ear_guides_13g.py', after)
run('pairs_ear_guides_13g.py', after.parent / '13g-before', after)
print('13G_FINAL_VERIFICATION_AND_DELIVERY_FINISHED')
