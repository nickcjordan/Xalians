from pathlib import Path
import json
T=Path(__file__).parent;O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass2');p=T/'build_groom_pass2.py';s=p.read_text()
s=s.replace("dd[zone==10]*=.022","dd[zone==10]*=.060")
s=s.replace("fan*(.025+.070*np.sin(np.pi*u)**.7)-.035*u", "fan*(.035+.115*np.sin(np.pi*u)**.7)-.055*u")
s=s.replace("rng.uniform(.55,1.10,plume.sum())", "rng.uniform(.72,1.03,plume.sum())")
s=s.replace("short=rng.random(plume.sum())<.35", "short=rng.random(plume.sum())<.22")
s=s.replace("end[short]*=.48", "end[short]*=.55")
s=s.replace("delta[plume_child]+=radial[:,None,:]*width[:,None,None]*np.sin(np.pi*t)**1.4", "delta[plume_child]+=radial[:,None,:]*width[:,None,None]*np.sin(np.pi*t)**1.2+radial[:,None,:]*rng.uniform(.0002,.0010,(plume_child.sum(),1,1))*t*t")
s=s.replace("lk.new(color,h.inputs['Color']);lk.new(h.outputs[0],out.inputs[0]);return m", "pw=ns.new('ShaderNodeMixRGB');lk.new(white.outputs['Fac'],pw.inputs[0]);lk.new(color,pw.inputs[1]);pw.inputs[2].default_value=(.94,.93,.92,1);lk.new(pw.outputs[0],h.inputs['Color']);lk.new(h.outputs[0],out.inputs[0]);return m")
s=s.replace("np.full(28,.00035)", "np.full(28,.00045)")
# Make the white whiskers readable without changing studio exposure.
s=s.replace("wh.inputs['Color'].default_value=(.80,.80,.80,1)", "wh.inputs['Color'].default_value=(.95,.95,.95,1);wt=whiskmat.node_tree;wo=next(n for n in wt.nodes if n.bl_idname=='ShaderNodeOutputMaterial');we=wt.nodes.new('ShaderNodeEmission');we.inputs['Color'].default_value=(.9,.9,.9,1);we.inputs['Strength'].default_value=.7;wm=wt.nodes.new('ShaderNodeMixShader');wm.inputs[0].default_value=.20;wt.links.new(wh.outputs[0],wm.inputs[1]);wt.links.new(we.outputs[0],wm.inputs[2]);wt.links.new(wm.outputs[0],wo.inputs[0])")
# Reconnect follicle material to the dark hair shader only.
s=s.replace("dh.inputs['Color'].default_value=(.015,.012,.010,1)", "dh.inputs['Color'].default_value=(.015,.012,.010,1);do=next(n for n in dotmat.node_tree.nodes if n.bl_idname=='ShaderNodeOutputMaterial');dotmat.node_tree.links.new(dh.outputs[0],do.inputs[0])")
# Horns are bare: remove any head strand whose points enter a horn surface.
s=s.replace("bare_nose=(coords", "horn_culled=0\n for horn in [o for o in bpy.context.scene.objects if o.type=='MESH' and 'horn' in o.name.lower()]:\n  hc=[body.matrix_world.inverted()@horn.matrix_world@v.co for v in horn.data.vertices];ht=BVHTree.FromPolygons(hc,[list(f.vertices) for f in horn.data.polygons]);candidates=np.where((cr[:,2]>.54)&(cr[:,1]<-.10))[0]\n  for i in candidates:\n   for point in coords[i,1:]:\n    q,normal,idx,dist=ht.find_nearest(Vector(point))\n    if q is not None and (Vector(point)-q).dot(normal)<-.0001:\n     keep[i]=False;horn_culled+=1;break\n bare_nose=(coords")
s=s.replace("'culled_for_eye_or_nose_clearance':culled", "'culled_for_bare_part_clearance':culled,'horn_intersection_culled':horn_culled")
# A rounded horizontal pupil in the plane of the outward-facing eye.
start=s.index(" z=mathnode('ABSOLUTE'");end=s.index(" noise=ns.new",start)
s=s[:start]+''' xx=mathnode('SUBTRACT',sep.outputs['X'],.5);yy=mathnode('SUBTRACT',sep.outputs['Y'],.5);zz=mathnode('SUBTRACT',sep.outputs['Z'],.5)
 sign=1 if o.location.x>0 else -1
 add=ns.new('ShaderNodeMath');add.operation='ADD';lk.new(mathnode('MULTIPLY',xx,.6*sign),add.inputs[0]);lk.new(mathnode('MULTIPLY',yy,.8),add.inputs[1]);horizontal=add.outputs[0]
 add2=ns.new('ShaderNodeMath');add2.operation='ADD';lk.new(mathnode('POWER',mathnode('DIVIDE',horizontal,.37),2),add2.inputs[0]);lk.new(mathnode('POWER',mathnode('DIVIDE',zz,.075),2),add2.inputs[1]);pupil=mathnode('LESS_THAN',add2.outputs[0],1)
''' +s[end:]
# Head close-up: center on the head and horns instead of the shoulder.
s=s.replace("if name=='three_quarter':data.ortho_scale=1.18", "if name=='three_quarter':data.ortho_scale=1.18\n  if name in ('head','portrait'):\n   data.ortho_scale=.47;target=Vector((0,-.205,.635));o.location=target+Vector((.57,-.81,.13))*10;o.rotation_quaternion=(target-o.location).to_track_quat('-Z','Y')")
p.write_text(s);(O/'build_groom.py').write_text(s)
P=json.loads((O/'parameters.json').read_text());P.update(plume_lock_width=.006,plume_radius=.00014,flank_gain=2.6);(O/'parameters.json').write_text(json.dumps(P,indent=2));(T/'parameters_pass2.json').write_text(json.dumps(P,indent=2))
notes=json.loads((O/'iter_notes.json').read_text());notes.append({'iteration':3,'renders':['iter3_side.png','iter3_head.png','iter3_tail_plume.png','iter3_front.png','iter3_hind_leg.png'],'coat_value':{'back_srgb':[78,76,75],'flank_srgb':[84,82,80],'bib_srgb':[189,189,189],'finding':'Back near target; flank still low. No violet cast.'},'pattern_placement':'Body pattern intact; plume white still reads gray under dense multilayer scattering.','fur_length_by_region':'Coarse body and head read more clearly; paws are furred without massive volume.','outline_shagginess':'Small pointed body locks visible, some larger upper-back tufts.','plume_shape':'Opaque pointed locks achieved, but too few broad blades and narrow overall silhouette.','face':'Dots faint; whiskers present but weak. Head composition too wide. Some hair intrudes into horn bases.','eyes':'Round highlight and amber improved; pupil is still rectangular and needs projected ellipse.','changed_next':['Intermediate plume guide count, wider endpoint fan, slightly thinner strands and tip irregularity','Give white plume locks a separate high-albedo response to compensate for dense hair scattering','Increase flank response only','Cull head hairs inside horn volumes','Use elliptical horizontal pupil in outward eye plane','Strengthen whisker readability and improve close-up framing']});(O/'iter_notes.json').write_text(json.dumps(notes,indent=2))
