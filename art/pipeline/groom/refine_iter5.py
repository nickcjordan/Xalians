from pathlib import Path
import json
T=Path(__file__).parent;O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass2');p=T/'build_groom_pass2.py';s=p.read_text()
start=s.index(' if plume.any():');end=s.index(' gcoords=',start)
s=s[:start]+''' gwhite=np.zeros(len(gr))
 if plume.any():
  u=np.clip((gr[plume,1]-.565)/.133,0,1);v=np.clip(.66*u+.34*rng.random(plume.sum()),0,1)
  fan=rng.uniform(-1,1,plume.sum());width=.085*np.sin(np.pi*v)**.75
  tips=np.c_[rng.uniform(-.032,.032,plume.sum())*np.sin(np.pi*v),.685-.065*v+fan*width,.295+.365*v]
  end=tips-gr[plume]
  # Guides first follow a central core, then branch into overlapping pointed locks.
  gdelta[plume]=end[:,None,:]*t
  gdelta[plume,:,0]*=smooth(.10,.90,t[0,:,0])[None,:]
  gdelta[plume,:,1]+=(.018-.025*fan)[:,None]*np.sin(np.pi*t[0,:,0])[None,:]
  gwhite[plume]=((fan<-.25)&(v<.86)).astype(float)
''' +s[end:]
s=s.replace("white_group[plume]=(gdelta[nearest[plume,0],-1,1]<-.018).astype(float)","white_group[plume]=gwhite[nearest[plume,0]]")
s=s.replace("(.94,.93,.92,1)","(.999,.998,.997,1)")
s=s.replace("s.cycles.max_bounces=6;s.cycles.diffuse_bounces=3;s.cycles.glossy_bounces=4;s.cycles.transmission_bounces=4", "s.cycles.max_bounces=16;s.cycles.diffuse_bounces=4;s.cycles.glossy_bounces=8;s.cycles.transmission_bounces=12")
# Soft material transition at the nose edge while keeping the original shape bare.
s=s.replace("# Surface freckles at projected", "nose=(y<-.298)&(z>.493)&(z<.528)&(abs(x)<.021)\n edge=smooth(.012,.021,abs(x))*nose\n col=col*(1-edge[:,None]*.5)+pale*edge[:,None]*.5\n # Surface freckles at projected")
p.write_text(s);(O/'build_groom.py').write_text(s)
P=json.loads((O/'parameters.json').read_text());P.update(plume_lock_width=.0055,plume_radius=.00013,flank_gain=4.2);(O/'parameters.json').write_text(json.dumps(P,indent=2));(T/'parameters_pass2.json').write_text(json.dumps(P,indent=2))
notes=json.loads((O/'iter_notes.json').read_text());notes.append({'iteration':4,'renders':['iter4_side.png','iter4_head.png','iter4_tail_plume.png','iter4_three_quarter.png'],'coat_value':{'back_srgb':[78,76,75],'flank_srgb':[88,86,85],'bib_srgb':[195,195,195]},'pattern_placement':'Forelegs and paws improved. Mask-emission diagnostic proves white plume attribute is present; dense hair multiple scattering and low bounce limit suppress white response.','fur_length_by_region':'Retain body/face lengths; plume needs layered rather than full-length visible stems.','outline_shagginess':'Body coarse clumps retained.','plume_shape':'Wider, opaque points but still oversized blades with deep gaps. New method: shape guide endpoints to a tapered three-dimensional plume envelope.','face':'Whiskers now plainly visible and closer framing helps. Nose remains square; soften material transition only. Horn intrusion removed.','eyes':'Horizontal ellipse pupil and round catchlight improved.','changed_next':['Envelope-based overlapping plume endpoints and continuous spatial white group','Raise bounce limits after diagnostic confirms brighter white without emission','Increase only flank response toward target','Soften nose side color transition']});(O/'iter_notes.json').write_text(json.dumps(notes,indent=2))
