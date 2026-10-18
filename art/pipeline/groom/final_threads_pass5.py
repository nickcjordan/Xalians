from pathlib import Path
import json
O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass5');T=Path(__file__).parent
s=(O/'build_groom.py').read_text().replace('s.render.threads=6',"s.render.threads=P.get('cpu_threads',12)").replace("'device':s.cycles.device,'process_peak_host_memory_gb'","'device':s.cycles.device,'cpu_threads':s.render.threads,'process_peak_host_memory_gb'")
p=json.loads((O/'parameters.json').read_text());p['cpu_threads']=12
compile(s,'final8','exec')
for f in [O/'build_groom.py',O/'build_groom_iter8.py',T/'build_groom_pass5.py']:f.write_text(s)
for f in [O/'parameters.json',O/'parameters_iter8.json',T/'parameters_pass5.json']:f.write_text(json.dumps(p,indent=2))
f=T/'finalize_pass5.py';s=f.read_text().replace('Cycles CPU with six threads.','Cycles CPU with 12 threads for final frames and six for previews.').replace("'device':f['device'],'process_peak_host_memory_gib'","'device':f['device'],'cpu_threads':f.get('cpu_threads',6),'process_peak_host_memory_gib'");f.write_text(s)
f=T/'REAPPLY_pass5.md';s=f.read_text().replace('Cycles uses CPU with six threads.','Cycles uses CPU with 12 threads for final frames; preview timings used six threads.');f.write_text(s);(O/'REAPPLY.md').write_text(s)
