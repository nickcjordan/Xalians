from pathlib import Path
import json
T=Path(__file__).parent;O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass2');p=T/'build_groom_pass2.py';s=p.read_text()
s=s.replace("dd[zone==10]*=.060","dd[zone==10]*=.115")
s=s.replace("width=.085*np.sin(np.pi*v)**.75","width=.12*np.sin(np.pi*v)**.75")
s=s.replace(".685-.065*v+fan*width", ".685-.095*v+fan*width")
s=s.replace("rng.uniform(.0002,.0010,(plume_child.sum(),1,1))", "rng.uniform(.0001,.00045,(plume_child.sum(),1,1))")
s=s.replace("rng.uniform(.70,1.32,len(gr))[nearest[:,0]]", "rng.uniform(.80,1.25,len(gr))[nearest[:,0]]*rng.uniform(.55,1.35,len(cr))")
s=s.replace("pw.inputs[2].default_value=(.999,.998,.997,1)", "ws=at('white_shade');lk.new(ws.outputs['Fac'],pw.inputs[2])")
s=s.replace("attr(child.data,'coat_gain',gain,'FLOAT','CURVE')", "attr(child.data,'coat_gain',gain,'FLOAT','CURVE')\n attr(child.data,'white_shade',rng.uniform(.958,.999,len(cr)),'FLOAT','CURVE')")
s=s.replace("s.cycles.max_bounces=16", "s.cycles.sample_clamp_indirect=3;s.cycles.sample_clamp_direct=6;s.cycles.max_bounces=16")
# Keep muzzle-edge fur short and comb it toward the bare nose margin.
s=s.replace("density[nose]=0;density[z<.004]=0", "muzzle=(y<-.275)&(z>.48)&(z<.54)&~nose;flow[muzzle]=[0,-.8,-.3];length[muzzle]=.004;lift[muzzle]=.45\n density[nose]=0;density[z<.004]=0")
s=s.replace("bare_nose=(coords[:,:,1]<-.303)&(coords[:,:,2]>.493)&(coords[:,:,2]<.528)&(abs(coords[:,:,0])<.018)", "bare_nose=(coords[:,:,1]<-.303)&((coords[:,:,0]/.018)**2+((coords[:,:,2]-.5105)/.0155)**2<1)")
# Limit lower feather outliers according to height above the ground.
s=s.replace("le[zone==9]=np.minimum", "le=np.minimum(le,np.where(co[:,2]<.10,.33*co[:,2]+.002,10))\n le[zone==9]=np.minimum")
p.write_text(s);(O/'build_groom.py').write_text(s)
P=json.loads((O/'parameters.json').read_text());P.update(plume_lock_width=.0037,plume_radius=.00013);(O/'parameters.json').write_text(json.dumps(P,indent=2));(T/'parameters_pass2.json').write_text(json.dumps(P,indent=2))
notes=json.loads((O/'iter_notes.json').read_text());notes.append({'iteration':5,'renders':['iter5_side.png','iter5_head.png','iter5_tail_plume.png'],'coat_value':'Back remains neutral near target; flank brighter, continuing measured evaluation.','pattern_placement':'White plume band now plainly reads. Body/leg pattern retained.','fur_length_by_region':'Body/face lengths retained. Older hind close flags isolated low feather outliers.','outline_shagginess':'Coarse body reads well at full body.','plume_shape':'New endpoint envelope yields layered plume with white underside, but broad smooth locks still read like rods or ribbons. Need finer individual locks and strand-level variation.','face':'Whiskers and dark rims clear. Nose edge remains boxy.','eyes':'Amber and horizontal pupil retained; soft round catchlight.','changed_next':['More narrower plume locks across a wider tapered envelope','Individual strand color variation inside locks','Subtle per-strand white shading variation and firefly clamp','Short muzzle-edge fur combed toward the nose boundary','Height-based cap on low feathering outliers']});(O/'iter_notes.json').write_text(json.dumps(notes,indent=2))
