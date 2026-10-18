from pathlib import Path
import json
T=Path('C:/dev/src/xalians-creature-pipeline/art/pipeline/groom');O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass5')
p=json.loads((O/'parameters.json').read_text());s=(O/'build_groom.py').read_text()
wa=[-5,-12,-18,-25,-30,-42,-30,-48,-37,-52,-40,-55,-43,-48]
for tuft in p['plume_tufts']:
 i=int(tuft['name'].rsplit('_',1)[1])-1
 if tuft['color']=='white':
  tuft['angle']=wa[i];tuft['width']=.004+.005*i/13;tuft['length']=(.020+.108*(i/13))*(.90 if i%2==0 else 1.0)
  if i in (10,13):tuft['length']=(.17 if i==10 else .218);tuft['angle']=(-35 if i==10 else -42);tuft['width']=.010
s=s.replace("all_triangles=True);N=17;t=", "all_triangles=True);N=25;t=")
s=s.replace("*min(.0008,length*.012)*np.sin(np.pi*t)","*min(.0018 if white else .0012,length*.022)*np.sin(np.pi*t)")
s=s.replace("coords+=prng.normal(0,.00025,coords.shape)*np.sin(np.pi*t)","coords+=prng.normal(0,.0004,coords.shape)*np.sin(np.pi*t)")
s=s.replace("eh=np.where(np.sin(aa)>0,P['lid_open_height']-.0018,P['lid_open_height'])", "eh=np.where(np.sin(aa)>0,P['lid_open_height']-P.get('lid_upper_reduction',.0018),P['lid_open_height'])")
s=s.replace("vertical[None,:]*np.sin(aa)[:,None]*eh[:,None]", "vertical[None,:]*np.where(np.sin(aa)>0,np.maximum(np.sin(aa),0)**P.get('lid_upper_power',1),np.sin(aa))[:,None]*eh[:,None]")
p.update(lid_upper_reduction=.0026,lid_upper_power=.72)
s=s.replace("(y<-.135)&(z<.031)","(y<-.125)&(z<.055)").replace("(y>.025)&(y<.112)&(z<.035)","(y>.025)&(y<.125)&(z<.058)")
s=s.replace("smooth(.006,.012,z)*(1-smooth(.026,.035,z))","smooth(.003,.010,z)*(1-smooth(.047,.058,z))")
s=s.replace("gain*=1-.25*toe_break_mask(cr)","gain*=1-.48*toe_break_mask(cr)")
p.update(toe_break_width=.0042,toe_skin_depth=.58)
compile(s,'iter3','exec');(O/'build_groom.py').write_text(s);(T/'build_groom_pass5.py').write_text(s);(O/'parameters.json').write_text(json.dumps(p,indent=2));(T/'parameters_pass5.json').write_text(json.dumps(p,indent=2))
