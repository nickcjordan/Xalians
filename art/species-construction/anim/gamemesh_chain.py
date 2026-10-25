"""Akinza game mesh pass 1: the whole chain under one hold of the machine slot, one Blender process at a time.

  python art/pipeline/slot/slot.py run gpu --wait 14400 --owner "Akinza game mesh" -- \
      python art/species-construction/anim/gamemesh_chain.py <iteration dir name> [--skip-build | --ao-compare] [build args...]

Steps (each stops the chain on failure): gamemesh_build.py (Blender), gamemesh_correctives.py (numpy: the plain
skinning against the sprite poses; corrective targets are built, and used only when the difference reaches 1 px at
the 720 px side framing), gamemesh_compare.py (Blender: masks and comparison renders). Blender runs through
run_blender.py --worker, which also waits until no other Blender process runs.
"""
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
A = ROOT/'untracked/species-construction/akinza/anim'
SURF = ROOT/'untracked/species-construction/akinza/surface/fur-steps/s12-29c-legs3b'
RIG, BAKE = A/'rig-p8b', A/'clips4/bake'


def run(cmd):
    print('CHAIN', ' '.join(str(c) for c in cmd), flush=True)
    r = subprocess.run([str(c) for c in cmd])
    if r.returncode:
        raise SystemExit(f'CHAIN_FAILED {cmd[2] if len(cmd) > 2 else cmd} exit {r.returncode}')


name = sys.argv[1]
rest = sys.argv[2:]
skip_build = '--skip-build' in rest
ao_only = '--ao-compare' in rest           # rebake AO on the saved build, then the comparison renders
rest = [x for x in rest if x not in ('--skip-build', '--ao-compare')]
work = A/'gamemesh1'/'work'/name
work.mkdir(parents=True, exist_ok=True)
py = sys.executable
rb = HERE/'run_blender.py'
if ao_only:
    run([py, rb, '--worker', 'gamemesh_ao.py', f'gm-{name}-ao.log', '--', work])
    corr = ['--correctives', work/'correctives.npz'] if (work/'use-correctives.txt').read_text() == 'yes' else []
    run([py, rb, '--worker', 'gamemesh_compare.py', f'gm-{name}-compare2.log', '--', SURF, RIG, BAKE, work, work/'compare', *corr])
    print('CHAIN_DONE', name, 'ao+compare', flush=True)
    raise SystemExit(0)
if not skip_build:
    run([py, rb, '--worker', 'gamemesh_build.py', f'gm-{name}-build.log', '--', SURF, RIG, BAKE, work, *rest])
run([py, HERE/'gamemesh_correctives.py', work, RIG, BAKE, '--build'])
rep = json.loads((work/'plain-vs-sprite.json').read_text())
corr = ['--correctives', work/'correctives.npz'] if rep['visibleAt720'] else []
(work/'use-correctives.txt').write_text('yes' if corr else 'no')
run([py, rb, '--worker', 'gamemesh_compare.py', f'gm-{name}-compare.log', '--', SURF, RIG, BAKE, work, work/'compare', *corr])
print('CHAIN_DONE', name, 'correctives', bool(corr), flush=True)
