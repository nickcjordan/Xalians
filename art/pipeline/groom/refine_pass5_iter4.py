from pathlib import Path
import json
T=Path('C:/dev/src/xalians-creature-pipeline/art/pipeline/groom');O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass5')
p=json.loads((O/'parameters.json').read_text());s=(O/'build_groom.py').read_text()
for tuft in p['plume_tufts']:
 i=int(tuft['name'].rsplit('_',1)[1])-1
 if i<3:
  tuft['length']=([.006,.012,.025] if tuft['color']=='white' else [.012,.025,.043])[i];tuft['width']=[.0015,.0025,.004][i]
 if tuft['color']=='white' and i in (10,13):tuft['width']=.0065;tuft['length']*=.94
s=s.replace("(.80 if name=='Authored plume white' else .48)","(.46 if name=='Authored plume white' else .48)")
s=s.replace("y+prng.uniform(-.004,.004,c)","y+prng.uniform(-min(.004,length*.075),min(.004,length*.075),c)")
s=s.replace("end_offsets*=width*.24", "end_offsets*=width*(.80 if white else .95)")
s=s.replace("ends[0]=1.0", "ends[0]=.95")
s=s.replace("gain*=1-.48*toe_break_mask(cr)","gain*=1-.42*toe_break_mask(cr)*(cz==7)")
# Comb individual paw lobes toward their own existing claw rather than all straight ahead.
s=s.replace("pf=np.tile([0.,-1.,-.1],(sum(paw),1));pt=", "pf=np.tile([0.,-1.,-.1],(sum(paw),1));pc=cr[paw];centers=np.array(P['fore_toe_centers']+P['hind_toe_centers']);targets=centers[np.argmin(np.linalg.norm(np.c_[abs(pc[:,0]),pc[:,1]][:,None,:]-centers[None,:,:],axis=2),axis=1)].copy();targets[:,1]-=.015;pf[:,:2]=targets-np.c_[abs(pc[:,0]),pc[:,1]];pf[:,0]*=np.sign(pc[:,0]);pf[:,2]=-.003;pf=unit(pf);pt=")
p['toe_skin_depth']=.45
compile(s,'iter4','exec');(O/'build_groom.py').write_text(s);(T/'build_groom_pass5.py').write_text(s);(O/'parameters.json').write_text(json.dumps(p,indent=2));(T/'parameters_pass5.json').write_text(json.dumps(p,indent=2))
