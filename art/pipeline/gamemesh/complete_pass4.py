from pathlib import Path
import time,json,subprocess,sys,hashlib
O=Path(r'C:\dev\art-data\pipeline\codex-stream\luceras-gamemesh\pass4');D=Path(r'C:\dev\src\xalians-creature-pipeline\art\pipeline\gamemesh')
end=time.time()+210
while time.time()<end:
 p=O/'render_provenance.json'
 if p.exists() and json.loads(p.read_text()).get('iteration')==8:break
 time.sleep(1)
else:raise RuntimeError('Final render provenance not completed before report wait deadline.')
for script,args in [('compose_pass4.py',['8']),('audit_pass4.py',[]),('finalize_pass4.py',[])]:
 subprocess.run([sys.executable,str(D/script),*args],check=True)
report=O/'report.json';(O/'report.sha256').write_text(hashlib.sha256(report.read_bytes()).hexdigest()+'  report.json\n')
print('FINAL_REPORT_READY',report,flush=True)
