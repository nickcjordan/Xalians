from pathlib import Path
import json
T=Path('C:/dev/src/xalians-creature-pipeline/art/pipeline/groom');O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass5')
s=(O/'build_groom.py').read_text();p=json.loads((O/'parameters.json').read_text())
p['plume_tufts']=[v for v in p['plume_tufts'] if not(v['color']=='white' and int(v['name'].rsplit('_',1)[1])<=3)]
for tuft in p['plume_tufts']:
 i=int(tuft['name'].rsplit('_',1)[1])-1
 if tuft['color']=='white':
  if i==3:tuft['density']=.25;tuft['length']*=.7
  if i==4:tuft['density']=.50
  if i==5:tuft['density']=.75
  if i==10:tuft['length']=.130
  if i==13:tuft['length']=.160
p['deliver_on_build']=True
s=s.replace("['tail_plume','head','side','three_quarter','front','hind_leg','portrait','sprite'] if P.get('deliver_on_build',False)","['tail_plume','sprite','portrait','head','side','three_quarter','front','hind_leg','toes'] if P.get('deliver_on_build',False)")
compile(s,'final8','exec');(O/'build_groom.py').write_text(s);(T/'build_groom_pass5.py').write_text(s);(O/'parameters.json').write_text(json.dumps(p,indent=2));(T/'parameters_pass5.json').write_text(json.dumps(p,indent=2))
