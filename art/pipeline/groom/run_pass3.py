"""Run a Luceras groom invocation through the shared slot, logging native output."""
import argparse,subprocess,sys
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--iteration',required=True);p.add_argument('--mode',default='build');p.add_argument('--views',default='side');a=p.parse_args()
o=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass3')
cmd=[sys.executable,'C:/dev/src/xalians-creature-pipeline/art/pipeline/slot/slot.py','run','blender','--wait','3600','--owner','codex B-pq45 groom','--','wsl','/home/njord/.local/opt/blender-5.2.2-linux-x64/blender','-b','-t','8','--python-exit-code','1','--python','/mnt/c/dev/art-data/pipeline/codex-stream/luceras-groom/pass3/build_groom.py','--','--iteration',a.iteration,'--mode',a.mode,'--views',a.views]
with (o/(a.mode+'_iter'+a.iteration+'.log')).open('w') as f:r=subprocess.run(cmd,stdout=f,stderr=subprocess.STDOUT)
raise SystemExit(r.returncode)
