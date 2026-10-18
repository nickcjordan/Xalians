from pathlib import Path
import json,hashlib
O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass5');T=Path(__file__).parent
s=(O/'build_groom.py').read_text().replace("s.render.threads=P.get('cpu_threads',12)",'s.render.threads=6').replace("'device':s.cycles.device,'cpu_threads':s.render.threads,'process_peak_host_memory_gb'","'device':s.cycles.device,'process_peak_host_memory_gb'")
p=json.loads((O/'parameters.json').read_text());p.pop('cpu_threads',None)
for f in [O/'build_groom.py',O/'build_groom_iter8.py',T/'build_groom_pass5.py']:f.write_text(s)
for f in [O/'parameters.json',O/'parameters_iter8.json',T/'parameters_pass5.json']:f.write_text(json.dumps(p,indent=2))
f=T/'finalize_pass5.py';s=f.read_text().replace('Cycles CPU with 12 threads for final frames and six for previews.','Cycles CPU with six threads for all measured frames.');f.write_text(s)
f=T/'REAPPLY_pass5.md';s=f.read_text().replace('Cycles uses CPU with 12 threads for final frames; preview timings used six threads.','Cycles uses CPU with six threads.');f.write_text(s);(O/'REAPPLY.md').write_text(s)
state=json.loads((O/'build_state.json').read_text());result={k:hashlib.sha256((O/n).read_bytes()).hexdigest()==state[k] for k,n in [('script_sha256','build_groom.py'),('parameters_sha256','parameters.json')]}
result['note']='The slot became available before the queued thread adjustment. Keep the already-running six-thread build and restore its exact source and parameters; no restart or mixed provenance.'
(O/'running_source_verification.json').write_text(json.dumps(result,indent=2));assert all(result[k] for k in ['script_sha256','parameters_sha256']);print(result)
