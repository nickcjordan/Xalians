from pathlib import Path
import json
O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass4');T=Path('C:/dev/src/xalians-creature-pipeline/art/pipeline/groom');s=(O/'build_groom_iter6_candidate.py').read_text()
s=s.replace("ends=prng.uniform(.35,1,groups);ends[::9]=prng.uniform(.96,1,len(ends[::9]))", "ends=.35+.54*prng.beta(2,2,groups);ends[0]=1.0")
s=s.replace("coords+=offset[:,None,:]*envelope", "coords+=offset[:,None,:]*envelope\n  end_offsets=prng.normal(0,1,(groups,3));end_offsets-=direction[None,:]*(end_offsets*direction[None,:]).sum(1)[:,None];end_offsets*=width*.44;end_offsets[0]=0;coords+=end_offsets[group,None,:]*smooth(.40,1,t)")
s=s.replace("*.0035*np.sin(np.pi*t)","*.0012*np.sin(np.pi*t)")
s=s.replace("prng.uniform(.45,1.45,groups)[group]","prng.uniform(.65,1.25,groups)[group]")
s=s.replace("h.inputs['Roughness'].default_value=.43;h.inputs['Radial Roughness'].default_value=.38;h.inputs['Coat'].default_value=.08", "h.inputs['Roughness'].default_value=.60;h.inputs['Radial Roughness'].default_value=.50;h.inputs['Coat'].default_value=.04")
s=s.replace("P['lid_open_height']-.001,P['lid_open_height']", "P['lid_open_height']-.0018,P['lid_open_height']")
compile(s,'candidate6','exec');(O/'build_groom_iter6_candidate.py').write_text(s)
p=json.loads((O/'parameters.json').read_text());p['plume_white_linear']=.82;(O/'parameters_iter6_candidate.json').write_text(json.dumps(p,indent=2))
