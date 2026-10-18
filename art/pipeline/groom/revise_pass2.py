from pathlib import Path
import json
T=Path(__file__).parent
p=T/'build_groom_pass2.py'
s=p.read_text().replace('B-gwvn','B-vmt3').replace("luceras-groom/pass1","luceras-groom/pass2")
s=s.replace("r=np.linspace(1,.025,pts)**.8","r=np.linspace(1,.008,pts)**1.25")
s=s.replace("plume=(y>.59)&(z>.245)","plume=(y>.565)&(z>.165)")
s=s.replace("(.065+.285*np.clip((y[plume]-.59)/.108,0,1))","(.035+.245*np.clip((y[plume]-.565)/.133,0,1))")
s=s.replace("density[plume]=40+80*smooth(.65,.695,y[plume])","density[plume]=65")
s=s.replace("lift[head]=.32","lift[head]=.5")
s=s.replace("density[head]*=1.7","density[head]*=2.4")
s=s.replace("density[toe]*=1.3","density[toe]*=1.7")
s=s.replace("toe=z<.038","toe=z<.043")
s=s.replace("flow[toe]=[0,-1,-.1];lift[toe]=.25","flow[toe]=[0,-1,-.1];lift[toe]=.42")
s=s.replace("np.where(zone==10,.97,P['clump'])","np.where(zone==10,.998,P['clump'])")
s=s.replace("np.where((zone==2)|(zone==10),.012,P['frizz'])","np.where((zone==2)|(zone==10),.018,P['frizz'])")
s=s.replace("rng.uniform(.68,1.38,len(gl))","rng.uniform(.45,1.6,len(gl))")
start=s.index(' if plume.any():')
end=s.index(' gcoords=',start)
s=s[:start]+''' if plume.any():
  u=np.clip((gr[plume,1]-.565)/.133,0,1)
  # Each guide is a tapered lock growing from the ascending last third.
  # Correlated direction produces an upward/backward fan, not random smoke.
  side=np.where(gn[plume,1]<-.05,-1.,1.)
  fan=.035+.075*np.sin(np.pi*u)**.8
  end=np.c_[gn[plume,0]*(.018+.022*np.sin(np.pi*u)),side*fan+.02,.045+.245*u]
  end*=rng.uniform(.78,1.12,plume.sum())[:,None]*P['lengths']['plume']/.30
  gdelta[plume]=end[:,None,:]*t
  gdelta[plume,:,1]+=.025*np.sin(np.pi*t[0,:,0])[None,:]
''' +s[end:]
s=s.replace("delta*=rng.uniform(.88,1.12,len(cr))[:,None,None]","delta*=rng.uniform(.70,1.25,len(cr))[:,None,None]")
s=s.replace("spread*=np.minimum(1,np.minimum(.018,cl*.65)/np.maximum(np.linalg.norm(spread,axis=1),1e-9))[:,None]","spread*=np.minimum(1,np.minimum(.035,cl*1.4)/np.maximum(np.linalg.norm(spread,axis=1),1e-9))[:,None]")
s=s.replace("weight=t*t*clump[:,None,None]","weight=smooth(.05,1,t)*clump[:,None,None]")
start=s.index(' plume_child=cz==10;')
end=s.index(' # Lift every non-root',start)
s=s[:start]+''' plume_child=cz==10
 delta[plume_child]=gdelta[nearest[plume_child,0]]+(gr[nearest[plume_child,0]]-cr[plume_child])[:,None,:]*smooth(0,1,t)
 axis=unit(gdelta[nearest[plume_child,0],-1]);radial=rng.normal(size=(plume_child.sum(),3));radial=unit(radial-axis*(radial*axis).sum(1)[:,None])
 width=P.get('plume_lock_width',.0025)*np.sqrt(rng.random(plume_child.sum()))
 delta[plume_child]+=radial[:,None,:]*width[:,None,None]*np.sin(np.pi*t)**1.4
 frizz_amount=(array(m.attributes['fur_frizz'].data,'value',1)[ci]*cb).sum(1)
 phase=rng.uniform(0,6.28,(len(cr),1,3));frizz=np.sin(t*13+phase)*t*(1-t)*cl[:,None,None]*frizz_amount[:,None,None];delta+=frizz
''' +s[end:]
s=s.replace("white_group[plume]=((cr[plume,1]<.650)&(gdelta[nearest[plume,0],-1,1]<.015)).astype(float)*.95","white_group[plume]=(gn[nearest[plume,0],1]<-.05).astype(float)")
s=s.replace("for j in range(6):","for j in range(14):")
s=s.replace("sign*(.019+j*.0005),-.284+(j%3)*.004,.508+(j//3)*.005","sign*(.019+(j%4)*.0009),-.287+(j%5)*.003,.505+(j//5)*.004")
s=s.replace("sign*(.065+j*.006),-.020-j*.003,.018-j*.008","sign*(.07+(j%7)*.007),-.025-(j%5)*.007,.027-j*.0048")
s=s.replace("(12,1)","(28,1)").replace("np.full(12,.00030)","np.full(28,.00020)").replace("'whiskers':12","'whiskers':28").replace("len(cr)+12","len(cr)+28")
s=s.replace("s.cycles.glossy_bounces=3","s.cycles.glossy_bounces=4")
s=s.replace("bpy.data.objects['lookdev_key'].data.energy=110", "bpy.data.objects['lookdev_key'].data.shape='DISK';bpy.data.objects['lookdev_key'].data.size=2.3;bpy.data.objects['lookdev_fill'].data.shape='DISK';bpy.data.objects['lookdev_rim'].data.shape='DISK';bpy.data.objects['lookdev_key'].data.energy=110")
s=s.replace("cornea.scale*=1.006","cornea.scale*=1.025")
s=s.replace("(1,1,1),.025","(1,1,1),.075")
s=s.replace("cb.inputs['IOR'].default_value=1.38","cb.inputs['IOR'].default_value=1.38")
s=s.replace("default_value=.035;assign(o,m)","default_value=.10;assign(o,m)")
s=s.replace("scale.inputs[2].default_value=(.65,.65,.65,1)","scale.inputs[2].default_value=(.38,.38,.38,1)")
# Add deliberate local corrections after the established atlas projection.
pos=s.index('\ndef zones(')
s=s[:pos]+'''
def refine_pattern(body,col,eyes):
 co=array(body.data.vertices,'co');n=array(body.data.vertices,'normal');x,y,z=co.T
 pale=np.median(col[col.mean(1)>.60],axis=0);dark=np.array([.065,.060,.057])
 # Preserve atlas blaze/bib/flank placement; correct only instructed leg/paw masks.
 fore=(y<-.07)&(z>.055)&(z<.30)
 front=smooth(.05,-.55,n[:,1]);inner=smooth(.04,-.65,n[:,0]*np.sign(x))
 w=fore*np.maximum(front,inner)*.93
 col=col*(1-w[:,None])+pale*w[:,None]
 paw=(1-smooth(.030,.055,z))*smooth(.002,.010,z)
 col=col*(1-paw[:,None])+dark*paw[:,None]
 for center,radius in eyes:
  d=np.linalg.norm(co-center,axis=1);rim=(1-smooth(radius+.002,radius+.010,d))
  col=col*(1-rim[:,None]*.8)+np.array([.023,.020,.018])*rim[:,None]*.8
 # Slate plume roots, with the continuous underside selected per guide below.
 tail=(y>.55)&(z>.15);col[tail]=dark
 # Surface freckles at projected whisker pads, symmetric on the two muzzle sides.
 for sign in (-1,1):
  for j in range(14):
   c=np.array([sign*(.019+(j%4)*.0009),-.287+(j%5)*.003,.505+(j//5)*.004])
   dot=1-smooth(.0006,.0015,np.linalg.norm(co-c,axis=1))
   col=col*(1-dot[:,None]*.9)+dark*dot[:,None]*.9
 attr(body.data,'coat_color',np.c_[col,np.ones(len(col))],'FLOAT_COLOR')
 write('pattern_refinements.json',{'base':'Unchanged pass3 barycentric atlas transfer','corrections':['White foreleg fronts and insides with normal-based smooth masks','Dark gray paw tops below ankles','Dark eye fur rim','Slate plume root color','Symmetric whisker pad freckles'], 'mesh_positions_changed':False})
 return col
''' +s[pos:]
s=s.replace("col=transfer(body);setup_materials", "col=refine_pattern(body,transfer(body),eyes);setup_materials")
# Replace hair material with controlled root/tip contrast and per-lock variation.
start=s.index('def hair_material(');end=s.index('\ndef groom(',start)
s=s[:start]+'''def hair_material(pale):
 m=bpy.data.materials.new('Luceras coarse Chiang storm coat');m.use_nodes=True;t=m.node_tree;t.nodes.clear();ns=t.nodes;lk=t.links
 out=ns.new('ShaderNodeOutputMaterial');h=ns.new('ShaderNodeBsdfHairPrincipled');h.model='CHIANG';h.parametrization='COLOR';h.inputs['Roughness'].default_value=.42;h.inputs['Radial Roughness'].default_value=.38;h.inputs['Coat'].default_value=.12
 def at(name):
  n=ns.new('ShaderNodeAttribute');n.attribute_name=name;return n
 def mul(a,b):
  n=ns.new('ShaderNodeMixRGB');n.blend_type='MULTIPLY';n.inputs[0].default_value=1;lk.new(a,n.inputs[1]);lk.new(b,n.inputs[2]);return n.outputs[0]
 root=at('coat_color');info=ns.new('ShaderNodeHairInfo');white=at('plume_white')
 tip=ns.new('ShaderNodeMixRGB');lk.new(white.outputs['Fac'],tip.inputs[0]);lk.new(root.outputs['Color'],tip.inputs[1]);tip.inputs[2].default_value=(*pale,1)
 bw=ns.new('ShaderNodeRGBToBW');lk.new(tip.outputs[0],bw.inputs[0]);response=ns.new('ShaderNodeMapRange');response.inputs['From Min'].default_value=.08;response.inputs['From Max'].default_value=.55;response.inputs['To Min'].default_value=P['hair_dark_scale'];response.inputs['To Max'].default_value=P['hair_color_scale'];lk.new(bw.outputs[0],response.inputs['Value'])
 ramp=ns.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.28,.28,.28,1);ramp.color_ramp.elements[1].position=.94;ramp.color_ramp.elements[1].color=(1.45,1.45,1.45,1);e=ramp.color_ramp.elements.new(.60);e.color=(.75,.75,.75,1);lk.new(info.outputs['Intercept'],ramp.inputs[0])
 tone=at('strand_tone');color=mul(mul(mul(tip.outputs[0],response.outputs['Result']),ramp.outputs['Color']),tone.outputs['Fac']);lk.new(color,h.inputs['Color']);lk.new(h.outputs[0],out.inputs[0]);return m
''' +s[end:]
s=s.replace("attr(child.data,'plume_tone'", "attr(child.data,'strand_tone',rng.uniform(.70,1.32,len(gr))[nearest[:,0]],'FLOAT','CURVE')\n attr(child.data,'plume_tone'")
# Replace Pointiness default ramp range, and use same crest mask to polish ridges.
s=s.replace("elements[0].position=.51","elements[0].position=.485").replace("elements[1].position=.58","elements[1].position=.515")
s=s.replace("(.045,.026,.012,1)","(.12,.065,.027,1)")
s=s.replace("b.inputs['Metallic'].default_value=.10;assign(o,m)","b.inputs['Metallic'].default_value=.18;rr=ns.new('ShaderNodeMapRange');rr.inputs['From Min'].default_value=.485;rr.inputs['From Max'].default_value=.515;rr.inputs['To Min'].default_value=.72;rr.inputs['To Max'].default_value=.32;lk.new(geo.outputs['Pointiness'],rr.inputs['Value']);lk.new(rr.outputs['Result'],b.inputs['Roughness']);assign(o,m)")
# Limit pupil length and add a soft limbal edge via facing.
s=s.replace("pupil=mathnode('LESS_THAN',z,.065)","pupil=mathnode('LESS_THAN',z,.065);yy=mathnode('ABSOLUTE',mathnode('SUBTRACT',sep.outputs['Y'],.5),0);pm=ns.new('ShaderNodeMath');pm.operation='MULTIPLY';lk.new(pupil,pm.inputs[0]);lk.new(mathnode('LESS_THAN',yy,.39),pm.inputs[1]);pupil=pm.outputs[0]")
s=s.replace("lk.new(mix.outputs[0],b.inputs['Base Color']);b.inputs['Coat Weight']", "facing=ns.new('ShaderNodeLayerWeight');edge=ns.new('ShaderNodeValToRGB');edge.color_ramp.elements[0].position=.12;edge.color_ramp.elements[0].color=(.06,.04,.02,1);edge.color_ramp.elements[1].position=.45;edge.color_ramp.elements[1].color=(1,1,1,1);lk.new(facing.outputs['Facing'],edge.inputs[0]);em=ns.new('ShaderNodeMixRGB');em.blend_type='MULTIPLY';em.inputs[0].default_value=1;lk.new(mix.outputs[0],em.inputs[1]);lk.new(edge.outputs[0],em.inputs[2]);lk.new(em.outputs[0],b.inputs['Base Color']);b.inputs['Coat Weight']")
p.write_text(s)
out=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass2')
par=json.loads((out/'parameters.json').read_text());par.update(build_id='B-vmt3',guides=8500,children=360000,root_radius=.000085,clump=.985,frizz=.09,hair_dark_scale=1.30,hair_color_scale=.55,proof_each_build=False,plume_lock_width=.0025)
par['lengths'].update(body=.023,head=.0065,neck=.012,bib=.034,belly=.030,hind=.034,toes=.0045,ear=.004,plume=.30)
(out/'parameters.json').write_text(json.dumps(par,indent=2));(T/'parameters_pass2.json').write_text(json.dumps(par,indent=2));(out/'build_groom.py').write_text(s)
c=(T/'compose_pass2.py').read_text().replace('B-gwvn','B-vmt3').replace('luceras-groom/pass1','luceras-groom/pass2');(T/'compose_pass2.py').write_text(c);(out/'compose_proof.py').write_text(c)
(T/'WORK_RECORD_pass2.md').write_text('B-vmt3: revise pass1 coarse strand character, plume, face, paws and horn crests. Preserve approved mesh geometry and binding, CPU fallback and honest costs. Start 2026-10-16 19:11:28 UTC. Stop edits 20:11:28 UTC. Final deadline 20:26:28 UTC. Current action: first revision build and comparison. No git, installs or paid services. All requested proof views, comparisons, deformation proof, checks, measurements and hashes required. Artistic approval remains with Nick.\n')
