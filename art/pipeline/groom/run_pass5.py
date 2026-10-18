"""Blender CPU runner under the required gpu slot, with sampled GPU telemetry."""
import argparse,subprocess,sys,time,json,datetime
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--iteration',required=True);p.add_argument('--mode',default='build');p.add_argument('--views',default='side');p.add_argument('--verify-baseline',action='store_true');a=p.parse_args()
o=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass5')
cmd=[sys.executable,'C:/dev/src/xalians-creature-pipeline/art/pipeline/slot/slot.py','run','gpu','--wait','3600','--owner','codex B-7qgf groom','--','wsl','/home/njord/.local/opt/blender-5.2.2-linux-x64/blender','-b','-t','6','--python-exit-code','1','--python','/mnt/c/dev/art-data/pipeline/codex-stream/luceras-groom/pass5/build_groom.py','--','--iteration',a.iteration,'--mode',a.mode,'--views',a.views]
if a.verify_baseline:cmd[cmd.index('--python')+1]='/mnt/c/dev/src/xalians-creature-pipeline/art/pipeline/groom/verify_and_build_pass5.py'
records=[];errors=[]
with (o/(a.mode+'_iter'+a.iteration+'.log')).open('w') as f:
 proc=subprocess.Popen(cmd,stdout=f,stderr=subprocess.STDOUT)
 while proc.poll() is None:
  try:
   q=subprocess.run(['nvidia-smi','--query-gpu=memory.used,memory.total','--format=csv,noheader,nounits'],capture_output=True,text=True,timeout=4)
   for line in q.stdout.strip().splitlines():
    used,total=[int(v.strip()) for v in line.split(',')];records.append({'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'used_mib':used,'total_mib':total})
  except Exception as e:errors.append(str(e))
  time.sleep(2)
 r=proc.returncode
peak=max((r['used_mib'] for r in records),default=None)
(o/('gpu_telemetry_'+a.mode+'_iter'+a.iteration+'.json')).write_text(json.dumps({'device':'CPU','scope':'Whole GPU memory sampled by Windows nvidia-smi, includes unrelated desktop applications. 2-second sampling is not an exact transient allocation peak.','peak_sampled_mib':peak,'peak_sampled_gib':peak/1024 if peak is not None else None,'samples':records,'errors':errors,'exit_code':r},indent=2))
raise SystemExit(r)
