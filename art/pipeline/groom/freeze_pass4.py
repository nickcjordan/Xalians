from pathlib import Path
import json,shutil,datetime
O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass4');T=Path(__file__).parent
assert not (O/'invocation_build_iter6.json').exists(), 'Do not change an active build'
p=json.loads((O/'parameters.json').read_text());p['samples_final']=48;p['samples_tail_final']=64
(O/'parameters.json').write_text(json.dumps(p,indent=2));shutil.copy2(O/'parameters.json',T/'parameters_pass4.json');shutil.copy2(O/'parameters.json',O/'parameters_iter6_candidate.json')
(O/'edit_freeze.json').write_text(json.dumps({'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'iteration':6,'reason':'Final groom frozen before48minute edit cutoff.48samples per final view,64for plume, to retain complete proof within60minute cap after shared-slot wait.','samples_final':48,'samples_tail':64},indent=2))
