from pathlib import Path
import json
T=Path('C:/dev/src/xalians-creature-pipeline/art/pipeline/groom');O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass5')
s=(O/'build_groom.py').read_text();p=json.loads((O/'parameters.json').read_text())
s=s.replace("end=guide[:,-1:,:].copy();", "straight=guide.copy();end=guide[:,-1:,:].copy();")
s=s.replace("guide[:,:,0]=guide_root[:,0:1]*(1-t[0,:,0])", "guide=straight*.65+guide*.35 if white else straight;guide[:,:,1]+=(0 if white else length*.055)*np.sin(np.pi*t[0,:,0]);guide[:,:,0]=guide_root[:,0:1]*(1-t[0,:,0])")
s=s.replace("groups=24;", "groups=40;")
s=s.replace("ends=.67+.31*prng.beta(2,2,groups)","ends=.53+.45*prng.beta(2,2,groups)")
for tuft in p['plume_tufts']:
 i=int(tuft['name'].rsplit('_',1)[1])-1
 if tuft['color']=='white' and i>=3:
  tuft['width']=.006+.007*i/13
  if i in (10,13):tuft['length']=(.145 if i==10 else .180);tuft['width']=.008
needle=" # Short transition coat bridges the old plume mask to the authored plume base."
extra=""" # Continuous short inner coat connects tuft roots along the entire curl.
 wc=P['inner_band_children'];yy=prng.uniform(.572,.696,wc);stations=np.linspace(.565,.696,80);zzs=np.array([np.mean(co[(abs(co[:,1]-v)<.003)&(co[:,1]>.53),2]) for v in stations]);zz=np.interp(yy,stations,zzs);slope=np.interp(yy,stations,np.gradient(zzs,stations));az=prng.uniform(0,math.tau,wc);roots,ids=project(np.c_[.0045*np.cos(az),yy-.0025,zz+.002]);normal=unit(np.cross(co[ids[:,1]]-co[ids[:,0]],co[ids[:,2]]-co[ids[:,0]]));forward=unit(np.c_[np.zeros(wc),np.ones(wc),slope]);tangent=unit(forward-normal*(forward*normal).sum(1)[:,None]);ln=prng.uniform(.004,.010,wc);coords=roots[:,None,:]+(normal*.22+tangent*.85)[:,None,:]*ln[:,None,None]*t
 wh=make_curves('Plume continuous inner undercoat',coords,ids,co,np.tile([.6,.6,.6],(wc,1)),mats['white'],body,tree,np.full(wc,.000075));attr(wh.data,'detail_tone',prng.uniform(.72,1.03,wc),'FLOAT','CURVE');gi=np.linspace(0,wc-1,16).astype(int);wg=make_curves('Plume inner undercoat guides',coords[gi],ids[gi],co,np.tile([.6,.6,.6],(16,1)),mats['white'],body,tree);wg.hide_render=True;wg.hide_set(True)
 # Short transition coat bridges the old plume mask to the authored plume base."""
assert needle in s;s=s.replace(needle,extra)
p['inner_band_children']=6500
compile(s,'iter6','exec');(O/'build_groom.py').write_text(s);(T/'build_groom_pass5.py').write_text(s);(O/'parameters.json').write_text(json.dumps(p,indent=2));(T/'parameters_pass5.json').write_text(json.dumps(p,indent=2))
