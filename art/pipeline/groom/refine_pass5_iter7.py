from pathlib import Path
import json
T=Path('C:/dev/src/xalians-creature-pipeline/art/pipeline/groom');O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass5')
s=(O/'build_groom.py').read_text();p=json.loads((O/'parameters.json').read_text())
for tuft in p['plume_tufts']:
 i=int(tuft['name'].rsplit('_',1)[1])-1
 tuft['density']=([.12,.25,.48,.70][i] if i<4 else 1.0)
s=s.replace("c=P['tuft_children']", "c=max(1,round(P['tuft_children']*tuft.get('density',1.0)))")
needle="h['tuft_name']=tuft['name'];"
replace="profile=(1-.25*t[0,:,0])*(1-smooth(.78,1,t[0,:,0]));attr(h.data,'radius',np.tile(profile*P['tuft_radius'],c));h['tuft_name']=tuft['name'];"
assert needle in s;s=s.replace(needle,replace)
s=s.replace("stats['region_child_counts']['10']=P['tuft_children']*len(P['plume_tufts'])", "stats['region_child_counts']['10']=sum(v['children'] for v in json.loads((OUT/'authored_details.json').read_text())['tufts'])+P['inner_band_children']")
p['inner_band_children']=12000
compile(s,'iter7','exec');(O/'build_groom.py').write_text(s);(T/'build_groom_pass5.py').write_text(s);(O/'parameters.json').write_text(json.dumps(p,indent=2));(T/'parameters_pass5.json').write_text(json.dumps(p,indent=2))
