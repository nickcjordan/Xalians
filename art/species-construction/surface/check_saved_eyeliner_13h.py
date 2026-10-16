"""Serial protection and full-body sweeps of the saved ribbon surface."""
import sys
import runpy
import gc
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
before, after = map(Path, sys.argv[sys.argv.index('--')+1:])
for name, args in [
    ('verify_eyeliner_13h.py', [before, after]),
    ('sweep_fur_12d.py', [after, after/'r']),
    ('sweep_obstacles_12d.py', [after, after/'r']),
]:
    sys.argv = [name, '--', *map(str, args)]
    runpy.run_path(str(HERE/name), run_name='__main__')
    gc.collect()
print('13H_SAVED_SWEEPS_FINISHED', flush=True)
