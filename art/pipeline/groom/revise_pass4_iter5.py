from pathlib import Path
import json
O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass4');T=Path('C:/dev/src/xalians-creature-pipeline/art/pipeline/groom')
s=(O/'build_groom.py').read_text();(O/'build_groom_iter4.py').write_text(s)
s=s.replace('groups=72;group=','groups=24;group=')
s=s.replace("coords=roots[:,None,:]+direction[None,None,:]*length*tt;coords[:,:,1]+=.018*np.sin(np.pi*tt[:,:,0])", "sample=tt[:,:,0]*(N-1);left=np.minimum(sample.astype(int),N-2);frac=sample-left\n  coords=guide[0,left]*(1-frac[:,:,None])+guide[0,left+1]*frac[:,:,None]+(roots-guide_root[0])[:,None,:]*(1-smooth(0,1,tt))")
start=s.index("  a=ga[group]") if "  a=ga[group]" in s else -1
# Keep group center paths, but give each child a separately tapering local bundle spread.
s=s.replace("a=ga[group]+prng.normal(0,.03,c);rad=gr[group]+prng.normal(0,.015,c)","a=ga[group];rad=gr[group]")
s=s.replace("coords+=offset[:,None,:]*envelope", "coords+=offset[:,None,:]*envelope\n  jitter=prng.normal(0,1,(c,3));jitter-=direction[None,:]*(jitter*direction[None,:]).sum(1)[:,None];coords+=jitter[:,None,:]*.0018*np.sin(np.pi*t)**.8")
s=s.replace("*.0035*np.sin(np.pi*tt);coords+=prng.normal(0,.00025,coords.shape)*np.sin(np.pi*tt)","*.0035*np.sin(np.pi*t);coords+=prng.normal(0,.00025,coords.shape)*np.sin(np.pi*t)")
s=s.replace("coords[:,:,0]+=np.sign(roots[:,0])[:,None]*.026*np.sin(np.pi*tt[:,:,0])", "coords[:,:,0]+=np.sign(roots[:,0])[:,None]*.026*np.sin(np.pi*tt[:,:,0])")
# Child bundles converge on a local endpoint. End scatter is kept below a hair-width.
s=s.replace("v=np.minimum(1,ends[group]+prng.normal(0,.012,c))", "v=np.minimum(1,ends[group]+prng.normal(0,.002,c))")
s=s.replace("np.array([0,.002,.007])[None,None,:]*t", "np.array([0,.006,.002])[None,None,:]*t*(.65+.35*np.sin(np.arange(sum(transition))*1.65)**2)[:,None,None]")
# Dense short overlapping eyelid layers. All roots remain on the original skin.
s=s.replace("outer=center+radials*.022+outward*.001", "layer=(np.arange(len(aa))%P['lid_children'])/max(P['lid_children']-1,1)\n   outer=center+radials*(.020+.006*layer[:,None])+outward*.001")
s=s.replace("edge=horizontal[None,:]*np.cos(aa)[:,None]*P['lid_open_width']+vertical[None,:]*np.sin(aa)[:,None]*P['lid_open_height']", "ew=P['lid_open_width']+.0013*layer;eh=np.where(np.sin(aa)>0,P['lid_open_height']-.001,P['lid_open_height'])+.0013*layer\n   edge=horizontal[None,:]*np.cos(aa)[:,None]*ew[:,None]+vertical[None,:]*np.sin(aa)[:,None]*eh[:,None]")
s=s.replace("attr(h.data,'detail_tone',prng.uniform(.85,1.15,len(aa)),'FLOAT','CURVE')", "attr(h.data,'detail_tone',prng.uniform(.85,1.15,len(aa)),'FLOAT','CURVE');profile=(1-.3*t[0,:,0])*(1-smooth(.86,1,t[0,:,0]));attr(h.data,'radius',np.tile(profile*P['lid_radius'],len(aa)))")
s=s.replace("data.ortho_scale=.43;target=", "data.ortho_scale=.43;data.shift_x=.06;target=")
(O/'build_groom.py').write_text(s);(T/'build_groom_pass4.py').write_text(s)
p=json.loads((O/'parameters.json').read_text());p.update(lid_radius=.00014,lid_children=24,lid_open_width=.0147,lid_open_height=.0124,samples_preview=48)
(O/'parameters.json').write_text(json.dumps(p,indent=2));(T/'parameters_pass4.json').write_text(json.dumps(p,indent=2))
n=json.loads((O/'iter_notes.json').read_text());n.append({'iteration':4,'coat_value':'Face/body local correction retained; no body change.','pattern_placement':'White plume band solid and brighter. White facial and body atlas regions preserved.','fur_length_by_region':'Paw4.5mm tops and visible claws retained.','outline_shagginess':'Narrower plume is closer in width but internal tuft ends remain wispy.','plume_shape':'Independent audit identified taper bug: shortened child bundles retain spread at their own endpoints. Non-denoised96sample test shows geometry rather than denoise is the cause.','face':'Head frame now includes horn tops; right edge needs a small camera shift.','eyes':'Narrower skin rim and slate mantle help but globe border still too exposed.','changed_next':['Interpolate every child from its own named guide explicitly','Use24 local child bundles with a taper that closes at each bundle endpoint','Add thicker overlapping short eyelid layers, with a thin dark terminal line','Align short transition hairs along the shaft to remove a blunt upright patch','Shift head camera slightly to include far horn tip']});(O/'iter_notes.json').write_text(json.dumps(n,indent=2))
compile(s,'build_groom.py','exec')
