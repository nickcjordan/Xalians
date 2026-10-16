"""Serial WSL Blender runner. One invocation is a read or one surface build."""
import argparse
import subprocess
import time
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT/'untracked/species-construction/akinza/surface/fur-steps'


def wsl(path):
    p = str(path).replace('\\', '/')
    return '/mnt/'+p[0].lower()+p[2:] if len(p)>1 and p[1]==':' else p


if __name__ == '__main__':
    slot=Path('C:/dev/src/xalians-creature-pipeline/art/pipeline/slot/slot.py')
    if '--worker' not in sys.argv:
        # The shared gpu class is an exclusive compute mutex, also excluding
        # every Blender class holder. Rendering itself still uses the CPU.
        raise SystemExit(subprocess.call([sys.executable,str(slot),'run','gpu','--wait','7200',
                                         '--owner','Akinza fur serial CPU Blender','--',
                                         sys.executable,__file__,'--worker',*sys.argv[1:]]))
    sys.argv.remove('--worker')
    p=argparse.ArgumentParser();p.add_argument('script');p.add_argument('log');p.add_argument('args',nargs=argparse.REMAINDER)
    a=p.parse_args();args=a.args[1:] if a.args and a.args[0]=='--' else a.args
    blender='/home/njord/.local/opt/blender-5.2.2-linux-x64/blender'
    # Other tasks' Blender processes are never stopped or changed.
    while subprocess.run(['wsl','-e','pgrep','-x','blender'],capture_output=True).returncode==0:
        print('Waiting for the single Blender process slot',flush=True);time.sleep(5)
    with (BASE/a.log).open('w',encoding='utf-8') as f:
        r=subprocess.run(['wsl','-e',blender,'-b','--factory-startup','--python-exit-code','1',
                          '--python',wsl(ROOT/'art/species-construction/surface'/a.script),
                          '--',*[wsl(x) for x in args]],stdout=f,stderr=subprocess.STDOUT)
    print((BASE/a.log).read_text(encoding='utf-8')[-2500:])
    raise SystemExit(r.returncode)
