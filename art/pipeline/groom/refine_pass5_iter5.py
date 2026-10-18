from pathlib import Path
import json
T=Path('C:/dev/src/xalians-creature-pipeline/art/pipeline/groom');O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass5')
p=json.loads((O/'parameters.json').read_text());s=(O/'build_groom.py').read_text()
s=s.replace("guide[:,:,1]+=length*.055*np.sin(np.pi*t[0,:,0]);guide[:,:,0]=guide_root[:,0:1]*(1-t[0,:,0])", "end=guide[:,-1:,:].copy();p0=guide_root[:,None,:];p1=p0+np.array([0,length*.18,length*.38])[None,None,:];p2=p0+.72*(end-p0)+np.array([0,(-.05 if angle>0 else .04)*length,length*.08])[None,None,:];guide=(1-t)**3*p0+3*(1-t)**2*t*p1+3*(1-t)*t*t*p2+t**3*end;guide[:,:,0]=guide_root[:,0:1]*(1-t[0,:,0])")
s=s.replace("groups=40", "groups=24")
s=s.replace("ends=.53+.45*prng.beta(2,2,groups)", "ends=.67+.31*prng.beta(2,2,groups)")
s=s.replace("width*(.80 if white else .95)","width*(.32 if white else .24)")
compile(s,'iter5','exec');(O/'build_groom.py').write_text(s);(T/'build_groom_pass5.py').write_text(s);(O/'parameters.json').write_text(json.dumps(p,indent=2));(T/'parameters_pass5.json').write_text(json.dumps(p,indent=2))
