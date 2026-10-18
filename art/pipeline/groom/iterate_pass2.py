from pathlib import Path
import json
T=Path(__file__).parent;O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass2');p=T/'build_groom_pass2.py';s=p.read_text()
start=s.index(' if plume.any():');end=s.index(' gcoords=',start)
s=s[:start]+''' if plume.any():
  u=np.clip((gr[plume,1]-.565)/.133,0,1)
  # Distinct layered locks overlap in three dimensions along the rising shaft.
  fan=rng.uniform(-1,1,plume.sum())
  end=np.c_[rng.uniform(-.035,.035,plume.sum()),fan*(.025+.070*np.sin(np.pi*u)**.7)-.035*u,.035+.26*u]
  end*=rng.uniform(.55,1.10,plume.sum())[:,None]*P['lengths']['plume']/.30
  short=rng.random(plume.sum())<.35
  end[short]*=.48
  gdelta[plume]=end[:,None,:]*t
  gdelta[plume,:,1]+=.018*np.sin(np.pi*t[0,:,0])[None,:]
''' +s[end:]
s=s.replace("gn[nearest[plume,0],1]<-.05", "gdelta[nearest[plume,0],-1,1]<-.018")
s=s.replace("(.06,.04,.02,1)","(1,1,1,1)").replace("edge.color_ramp.elements[1].color=(1,1,1,1)","edge.color_ramp.elements[1].color=(.08,.05,.025,1)")
s=s.replace("elements[0].position=.12","elements[0].position=.35").replace("elements[1].position=.45","elements[1].position=.85")
s=s.replace("tone=at('strand_tone');color=mul(mul(mul(tip.outputs[0],response.outputs['Result']),ramp.outputs['Color']),tone.outputs['Fac'])", "tone=at('strand_tone');gain=at('coat_gain');color=mul(mul(mul(mul(tip.outputs[0],response.outputs['Result']),ramp.outputs['Color']),tone.outputs['Fac']),gain.outputs['Fac'])")
s=s.replace("attr(child.data,'strand_tone'", "gain=1+P.get('flank_gain',.7)*(1-smooth(.42,.55,cr[:,2]))*smooth(-.12,-.03,cr[:,1])*(1-smooth(.22,.32,cr[:,1]))*smooth(.26,.34,cr[:,2])*(cc.mean(1)<.35)\n attr(child.data,'coat_gain',gain,'FLOAT','CURVE')\n attr(child.data,'strand_tone'")
start=s.index("   m,b=material('Matte dark brown horn");end=s.index("  elif 'claw'",start)
s=s[:start]+'''   co=array(o.data.vertices,'co');norm=array(o.data.vertices,'normal');ed=array(o.data.edges,'vertices',2,np.int32);a,bb=ed.T;degree=np.maximum(np.bincount(a,minlength=len(co))+np.bincount(bb,minlength=len(co)),1)
   avg=np.stack([np.bincount(a,weights=co[bb,k],minlength=len(co))+np.bincount(bb,weights=co[a,k],minlength=len(co)) for k in range(3)],axis=1)/degree[:,None]
   convex=((co-avg)*norm).sum(1);lo,hi=np.quantile(convex,[.65,.95]);crest=smooth(lo,hi,convex);attr(o.data,'horn_crest',crest)
   m,b=material('Matte dark brown horn '+o.name,(.018,.012,.008),.60);ns=m.node_tree.nodes;lk=m.node_tree.links;at=ns.new('ShaderNodeAttribute');at.attribute_name='horn_crest';ramp=ns.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.009,.007,.005,1);ramp.color_ramp.elements[1].color=(.060,.036,.017,1);lk.new(at.outputs['Fac'],ramp.inputs[0]);lk.new(ramp.outputs[0],b.inputs['Base Color']);b.inputs['Metallic'].default_value=.16
   rr=ns.new('ShaderNodeMapRange');rr.inputs['To Min'].default_value=.70;rr.inputs['To Max'].default_value=.34;lk.new(at.outputs['Fac'],rr.inputs['Value']);lk.new(rr.outputs['Result'],b.inputs['Roughness']);assign(o,m)
''' +s[end:]
p.write_text(s);(O/'build_groom.py').write_text(s)
P=json.loads((O/'parameters.json').read_text());P.update(hair_dark_scale=2.25,hair_color_scale=.48,plume_lock_width=.005,flank_gain=.70);(O/'parameters.json').write_text(json.dumps(P,indent=2));(T/'parameters_pass2.json').write_text(json.dumps(P,indent=2))
notes=[{'iteration':1,'renders':['iter1_side.png','iter1_head.png','iter1_tail_plume.png'],'coat_value':{'back_srgb':[60,58,58],'flank_srgb':[57,54,54],'bib_srgb':[199,199,199],'finding':'Too dark; root contrast improved but material needs higher dark-coat response.'},'pattern_placement':'Atlas bib and blaze retained; white foreleg edge and dark paw tops now present.','fur_length_by_region':'Face and neck visibly furred; bib still long and silky in places.','outline_shagginess':'Sharper body outline, some oversized tufts at rump.','plume_shape':'Two smooth fans, no convincing interlocking pointed locks; underside still reads gray.','face':'More visible fur and whiskers, nose remains blocky.','eyes':'Softer round catchlight but reversed limbal mask made iris too dark.','horns':'Too bronze overall.','changed_next':['Increase dark hair response and flank gain, slightly reduce white response','Create randomized overlapping plume locks and broader lock bodies with crisp ends','Correct iris edge mask','Compute signed mesh curvature on horns and restrict bronze to convex crests']}]
(O/'iter_notes.json').write_text(json.dumps(notes,indent=2))
