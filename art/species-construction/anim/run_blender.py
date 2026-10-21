"""Serial WSL Blender runner for the Akinza animation stage, under the shared machine slot.

  python art/species-construction/anim/run_blender.py <script in this folder> <log name> -- [script args...]

Takes the slot's exclusive `gpu` class (it also excludes every Blender holder), then waits until no other
Blender process runs, so only one Blender process runs at a time. Paths in the args are converted to WSL.
The log goes to untracked/species-construction/akinza/anim/logs/<log name>.
"""
import argparse
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
LOGS = ROOT/'untracked/species-construction/akinza/anim/logs'
SLOT = ROOT/'art/pipeline/slot/slot.py'
BLENDER = '/home/njord/.local/opt/blender-5.2.2-linux-x64/blender'


def wsl(path):
    p = str(path).replace(chr(92), '/')
    return '/mnt/'+p[0].lower()+p[2:] if len(p) > 1 and p[1] == ':' else p


if __name__ == '__main__':
    if '--worker' not in sys.argv:
        raise SystemExit(subprocess.call([sys.executable, str(SLOT), 'run', 'gpu', '--wait', '7200',
                                          '--owner', 'Akinza rig (anim stage)', '--',
                                          sys.executable, __file__, '--worker', *sys.argv[1:]]))
    sys.argv.remove('--worker')
    p = argparse.ArgumentParser()
    p.add_argument('script')
    p.add_argument('log')
    p.add_argument('args', nargs=argparse.REMAINDER)
    a = p.parse_args()
    args = a.args[1:] if a.args and a.args[0] == '--' else a.args
    LOGS.mkdir(parents=True, exist_ok=True)
    while subprocess.run(['wsl', '-e', 'pgrep', '-x', 'blender'], capture_output=True).returncode == 0:
        print('Waiting for the single Blender process slot', flush=True)
        time.sleep(5)
    t0 = time.time()
    with (LOGS/a.log).open('w', encoding='utf-8') as f:
        r = subprocess.run(['wsl', '-e', BLENDER, '-b', '--factory-startup', '--python-exit-code', '1',
                            '--python', wsl(HERE/a.script), '--', *[wsl(x) if (':' in x[:3]) else x for x in args]],
                           stdout=f, stderr=subprocess.STDOUT)
    print((LOGS/a.log).read_text(encoding='utf-8')[-3000:])
    print(f'RUN_SECONDS {time.time()-t0:.0f}')
    raise SystemExit(r.returncode)
