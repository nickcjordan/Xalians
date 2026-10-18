from pathlib import Path
import json
O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass4');T=Path('C:/dev/src/xalians-creature-pipeline/art/pipeline/groom')
s=(O/'build_groom.py').read_text();(O/'build_groom_iter2.py').write_text(s)
s=s.replace("N=P['points'];t=np.linspace(0,1,N)[None,:,None]\n mats=", "N=17;t=np.linspace(0,1,N)[None,:,None]\n mats=")
s=s.replace("v=prng.uniform(.76,1,c);v[::7]=prng.uniform(.96,1,len(v[::7]));tt=t*v[:,None,None]", "groups=72;group=np.arange(c)%groups;ends=prng.uniform(.35,1,groups);ends[::9]=prng.uniform(.96,1,len(ends[::9]));v=np.minimum(1,ends[group]+prng.normal(0,.012,c));tt=t*v[:,None,None]")
s=s.replace("a=prng.uniform(0,math.tau,c);rad=np.sqrt(prng.random(c));cross", "ga=prng.uniform(0,math.tau,groups);gr=np.sqrt(prng.random(groups));a=ga[group]+prng.normal(0,.03,c);rad=gr[group]+prng.normal(0,.015,c);cross")
s=s.replace("envelope=np.sin(np.pi*tt)**.85", "envelope=np.sin(np.pi*tt)**.70")
s=s.replace(".018*np.sin(np.pi*tt[:,:,0])\n  phase", ".026*np.sin(np.pi*tt[:,:,0])\n  phase")
s=s.replace("phase=prng.uniform(0,6.28,(c,1,3));coords+=np.sin(tt*22+phase)*.0013*np.sin(np.pi*tt)", "phase=prng.uniform(0,6.28,(groups,1,3))[group];coords+=np.sin(tt*22+phase)*.0035*np.sin(np.pi*tt);coords+=prng.normal(0,.00025,coords.shape)*np.sin(np.pi*tt)")
s=s.replace("prng.uniform(.65,1.35,c),'FLOAT','CURVE'", "prng.uniform(.40,1.75,groups)[group],'FLOAT','CURVE'")
# Shape the lid as a coat-colored almond mantle with a thin dark line at the inner margin.
s=s.replace("(.019,.017,.016)","(.065,.060,.057)")
s=s.replace("*.0149+vertical[None,:]*np.sin(aa)[:,None]*.0138", "*.0156+vertical[None,:]*np.sin(aa)[:,None]*.0117")
s=s.replace("'opening_horizontal_radius':.0149,'opening_vertical_radius':.0138", "'opening_horizontal_radius':.0156,'opening_vertical_radius':.0117")
# Local skin and strand paw response, plus sparse short coat exposing toe forms.
s=s.replace("attr(body.data,'skin_gain',skin_gain)","skin_gain*=np.where(z<.043,P['paw_skin_response'],1)\n attr(body.data,'skin_gain',skin_gain)")
s=s.replace("keep_body=cz!=10", "keep_body=(cz!=10)&~((cz==7)&((np.arange(len(cz))%5)<2))")
s=s.replace("*(.0045/.0035)","*(P['paw_length']/.0035)")
(O/'build_groom_iter3_candidate.py').write_text(s)
p=json.loads((O/'parameters.json').read_text());p.update(face_response=.40,face_skin_response=.65,paw_response=3.6,paw_skin_response=1.6,paw_length=.0045,lid_radius=.000085,lid_children=12,tuft_children=5040,tuft_radius=.00009,plume_dark_linear=.085,plume_white_linear=.88)
for tuft in p['plume_tufts']:
 if tuft['color']=='white':tuft['width']=.023
(O/'parameters_iter3_candidate.json').write_text(json.dumps(p,indent=2))
