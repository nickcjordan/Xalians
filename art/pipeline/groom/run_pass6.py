import subprocess,sys,time,json,datetime,argparse
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--mode',default='build');p.add_argument('--views',default='paws_front,fore_three_quarter,hind_three_quarter');p.add_argument('--iteration',default='1');a=p.parse_args();o=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass6')
cmd=[sys.executable,'C:/dev/src/xalians-creature-pipeline/art/pipeline/slot/slot.py','run','gpu','--wait','3600','--owner','codex B-svtw groom','--','wsl','/home/njord/.local/opt/blender-5.2.2-linux-x64/blender','-b','-t','6','--python-exit-code','1','--python','/mnt/c/dev/art-data/pipeline/codex-stream/luceras-groom/pass6/build_groom.py','--','--mode',a.mode,'--views',a.views,'--iteration',a.iteration]
records=[]
with (o/(a.mode+'_'+a.iteration+'.log')).open('w') as f:
 proc=subprocess.Popen(cmd,stdout=f,stderr=subprocess.STDOUT)
 while proc.poll() is None:
  q=subprocess.run(['nvidia-smi','--query-gpu=memory.used,memory.total','--format=csv,noheader,nounits'],capture_output=True,text=True)
  try:records.append({'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'used_mib':int(q.stdout.strip().split(',')[0])})
  except:pass
  time.sleep(2)
(o/('telemetry_'+a.mode+'_'+a.iteration+'.json')).write_text(json.dumps({'device':'CPU','peak_sampled_mib':max((r['used_mib'] for r in records),default=None),'scope':'Whole GPU, 2 second sampling, includes waiting and unrelated processes; not an exact transient peak','records':records,'exit_code':proc.returncode},indent=2))
sys.exit(proc.returncode)
