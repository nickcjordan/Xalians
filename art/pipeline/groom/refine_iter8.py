from pathlib import Path
import json
T=Path(__file__).parent;O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass2');p=T/'build_groom_pass2.py';s=p.read_text()
s=s.replace("np.full(len(co),.50)", "np.full(len(co),.52)")
s=s.replace("gwhite[plume]=((fan<-.25)&(v<.86)).astype(float)", "gwhite[plume]=((fan<-.25)&(v<.86)).astype(float)\n  kink=rng.uniform(-1,1,(plume.sum(),1,3))*.003;gdelta[plume]+=kink*np.sin(np.pi*t)*np.sin(2*np.pi*t)\n  short=rng.random(plume.sum())<.15;pi=np.where(plume)[0][short];gdelta[pi]=unit(gn[pi]*.5+np.array([0,0,1]))[:,None,:]*rng.uniform(.018,.045,(len(pi),1,1))*t;gwhite[pi]*=(gr[pi,1]<.65)")
start=s.index(" axis=unit(gdelta[nearest[plume_child,0],-1]);radial=");end=s.index(" frizz_amount=",start)
s=s[:start]+''' axis=unit(gdelta[nearest[plume_child,0],-1]);b1=unit(np.cross(axis,np.tile([1.,0,0],(len(axis),1))));b2=unit(np.cross(axis,b1))
 sectors=rng.integers(0,6,len(axis));angle=sectors*(2*np.pi/6)+nearest[plume_child,0]*1.618
 radial=b1*np.cos(angle)[:,None]+b2*np.sin(angle)[:,None]
 jitter=rng.normal(size=radial.shape);jitter-=axis*(jitter*axis).sum(1)[:,None]
 radial=radial*.78+jitter*.11
 width=P.get('plume_lock_width',.0075)*rng.uniform(.85,1,len(axis))
 delta[plume_child]+=radial[:,None,:]*width[:,None,None]*np.sin(np.pi*smooth(.45,1,t))**1.2+radial[:,None,:]*rng.uniform(.00005,.0003,(len(axis),1,1))*t*t
''' +s[end:]
s=s.replace("phase=rng.uniform(0,6.28,(len(cr),1,3));frizz=", "frizz_amount[plume_child]=.045\n phase=rng.uniform(0,6.28,(len(cr),1,3));frizz=")
s=s.replace("attr(body.data,'coat_color',np.c_[col,np.ones(len(col))],'FLOAT_COLOR')\n write('pattern_refinements", "attr(body.data,'coat_color',np.c_[col,np.ones(len(col))],'FLOAT_COLOR')\n skin_gain=1+.50*(1-smooth(.42,.55,z))*smooth(-.12,-.03,y)*(1-smooth(.22,.32,y))*smooth(.26,.34,z)*(col.mean(1)<.35)\n attr(body.data,'skin_gain',skin_gain)\n write('pattern_refinements")
s=s.replace("sm.inputs['To Min'].default_value=.75;sm.inputs['To Max'].default_value=.66", "sm.inputs['To Min'].default_value=.72;sm.inputs['To Max'].default_value=.62")
s=s.replace("m.node_tree.links.new(scale.outputs[0],b.inputs['Base Color']);assign(body,m)", "sg=m.node_tree.nodes.new('ShaderNodeAttribute');sg.attribute_name='skin_gain';smix=m.node_tree.nodes.new('ShaderNodeMixRGB');smix.blend_type='MULTIPLY';smix.inputs[0].default_value=1;m.node_tree.links.new(scale.outputs[0],smix.inputs[1]);m.node_tree.links.new(sg.outputs['Fac'],smix.inputs[2]);m.node_tree.links.new(smix.outputs[0],b.inputs['Base Color']);assign(body,m)")
p.write_text(s);(O/'build_groom.py').write_text(s)
P=json.loads((O/'parameters.json').read_text());P.update(hair_dark_scale=2.8,flank_gain=4.3,samples_preview=96);(O/'parameters.json').write_text(json.dumps(P,indent=2));(T/'parameters_pass2.json').write_text(json.dumps(P,indent=2))
notes=json.loads((O/'iter_notes.json').read_text());notes.append({'iteration':7,'renders':['iter7_side.png','iter7_head.png','iter7_tail_plume.png'],'coat_value':{'back_srgb':[85,82,81],'flank_srgb':[91,89,88],'bib_srgb':[197,196,197]},'pattern_placement':'White plume band retained, broad solved coat pattern retained.','fur_length_by_region':'Short nose-edge fur softens side edges; head and neck distinctly furred.','outline_shagginess':'Body locks still sharper than pass1.','plume_shape':'Cubic guides hide more of the long stems, but lock surfaces remain smooth. Fine white tips show preview sampling noise.','face':'Small dark whisker-pad dots now visible; whiskers remain clear.','eyes':'Stable wet amber horizontal-pupil eyes.','changed_next':['Six subclumps per plume lock to break smooth surfaces','Wiry guide kinks and local frizz; short base cover hairs','Double preview samples to distinguish noise from real strand structure','Adjust dark skin and flank response separately instead of driving hair color into saturation']});(O/'iter_notes.json').write_text(json.dumps(notes,indent=2))
