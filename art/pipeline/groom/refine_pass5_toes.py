from pathlib import Path
import json,shutil
T=Path('C:/dev/src/xalians-creature-pipeline/art/pipeline/groom');O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass5')
s=(O/'build_groom.py').read_text();p=json.loads((O/'parameters.json').read_text())
(O/'build_groom_iter1.py').write_text(s);(O/'parameters_iter1.json').write_text(json.dumps(p,indent=2))
helper='''def toe_break_mask(co):
 # Symmetric local Voronoi grooves between the existing claw-bearing toe lobes.
 # Claw centers are measured from the approved sculpt, averaged across sides.
 x,y,z=co.T;xy=np.c_[abs(x),y];mask=np.zeros(len(co))
 for centers,gate in [(P['fore_toe_centers'],(y<-.135)&(z<.031)),(P['hind_toe_centers'],(y>.025)&(y<.112)&(z<.035))]:
  c=np.array(centers);dist=np.linalg.norm(xy[:,None,:]-c[None,:,:],axis=2);near=np.sort(dist,axis=1)[:,:2]
  groove=(1-smooth(.0006,P['toe_break_width'],near[:,1]-near[:,0]))*(1-smooth(.027,.040,near[:,0]))
  groove*=gate*smooth(.006,.012,z)*(1-smooth(.026,.035,z));mask=np.maximum(mask,groove)
 return mask

'''
s=s.replace('def refine_pattern(body,col,eyes):',helper+'def refine_pattern(body,col,eyes):')
s=s.replace("col[head]*=P['face_skin_response']", "col[head]*=P['face_skin_response']\n toe_break=toe_break_mask(co);col*=1-P['toe_skin_depth']*toe_break[:,None];attr(body.data,'toe_break',toe_break)")
s=s.replace("keep_body=(cz!=10)&~((cz==7)&((np.arange(len(cz))%5)<2))", "toe_break=toe_break_mask(cr);keep_body=(cz!=10)&~((cz==7)&((np.arange(len(cz))%5)<2))&~((cz==7)&(toe_break>.55)&((np.arange(len(cz))%4)!=0))")
s=s.replace("pl=P['paw_length']*(.72+.28*np.sin(np.arange(sum(paw))*1.71)**2);coords[paw]", "pl=P['paw_length']*(.72+.28*np.sin(np.arange(sum(paw))*1.71)**2)*(1-.78*toe_break_mask(cr[paw]));coords[paw]")
s=s.replace("gain*=np.where((cz==0)|(cz==1),P.get('body_response',1),1)", "gain*=1-.25*toe_break_mask(cr);gain*=np.where((cz==0)|(cz==1),P.get('body_response',1),1)")
p.update(toe_break_width=.0026,toe_skin_depth=.34,fore_toe_centers=[[.0196,-.1575],[.03014,-.1695],[.04285,-.1689],[.0566,-.1615]],hind_toe_centers=[[.1395,.0715],[.1632,.0618],[.1798,.0592],[.1835,.0825]])
compile(s,'toes','exec');(O/'build_groom.py').write_text(s);(T/'build_groom_pass5.py').write_text(s);(O/'parameters.json').write_text(json.dumps(p,indent=2));(T/'parameters_pass5.json').write_text(json.dumps(p,indent=2))
