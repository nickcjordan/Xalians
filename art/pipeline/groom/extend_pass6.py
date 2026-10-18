from pathlib import Path
p=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass6/build_groom.py');s=p.read_text();s=s.replace("low=co[:,2]<P['max_root_height'];newcol", "outside_color_hash=hashlib.sha256(col[co[:,2]>=P['max_root_height']].tobytes()).hexdigest();low=co[:,2]<P['max_root_height'];newcol")
s=s.replace("'material_nodes_outside_new_paw_material':'unchanged'", "'outside_mask_coat_color_unchanged':outside_color_hash==hashlib.sha256(col[~low].tobytes()).hexdigest(),'material_nodes_outside_new_paw_material':'unchanged'")
f='''
def deform():
 body=bpy.data.objects['luceras_blockout'];before=signature(body);o=bpy.data.objects['Pass6 continuous paw children'];dg=bpy.context.evaluated_depsgraph_get();rest=array(o.evaluated_get(dg).data.attributes['position'].data,'vector')
 arm=bpy.data.armatures.new('Temporary lower hind proof');rig=bpy.data.objects.new(arm.name,arm);bpy.context.scene.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 for name,head,tail in [('proof_fixed',(0,0,0),(0,0,.1)),('proof_paw',(.16,.09,.095),(.16,.09,.015))]:
  b=arm.edit_bones.new(name);b.head=head;b.tail=tail
 bpy.ops.object.mode_set(mode='OBJECT')
 for ob in list(bpy.context.scene.objects):
  if ob.type!='MESH' or ob.name.startswith('lookdev_'):continue
  co=np.array([ob.matrix_world@v.co for v in ob.data.vertices]);w=smooth(.08,.11,co[:,0])*smooth(0,.04,co[:,1])*(1-smooth(.06,.095,co[:,2]))
  if not np.any(w):continue
  for name,weights in [('proof_fixed',1-w),('proof_paw',w)]:
   vg=ob.vertex_groups.new(name=name)
   for i in np.where(weights>0)[0]:vg.add([int(i)],float(weights[i]),'REPLACE')
  mod=ob.modifiers.new('Temporary proof armature','ARMATURE');mod.object=rig
 bone=rig.pose.bones['proof_paw'];bone.rotation_mode='XYZ';bone.rotation_euler.x=math.radians(-16)
 bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();surf=array(body.evaluated_get(dg).data.vertices,'co');d=o.data;coords=array(o.evaluated_get(dg).data.attributes['position'].data,'vector');ids=np.stack([array(d.attributes['bind_i'+v].data,'value',1,np.int32) for v in 'abc'],axis=1);bar=np.stack([array(d.attributes['bind_'+v].data,'value',1) for v in 'abc'],axis=1);expected=np.einsum('ij,ijk->ik',bar,surf[ids]);err=np.linalg.norm(coords[::9]-expected,axis=1);move=np.linalg.norm(coords-rest,axis=1)
 write('deformation_check.json',{'base_mesh_unchanged':before==signature(body),'max_root_error_m':float(err.max()),'max_point_motion_m':float(move.max()),'moved_points':int(sum(move>1e-5)),'passed':before==signature(body) and float(err.max())<.00002 and float(move.max())>.005,'method':'Temporary 16 degree bone bend restricted to one hind paw and lowest 95 mm of leg; claws follow the same bone; evaluated hair roots compared with deformed surface barycentrics.'})
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'deformation_proof.blend'))
'''
s=s.replace('\ndef render():',f+'\ndef render():');s=s.replace("if args.mode=='baseline':cameras()", "if args.mode=='baseline':cameras()\n if args.mode=='deform':deform()")
s=s.replace("prefix='pass5_' if args.mode=='baseline'", "prefix='deformation_' if args.mode=='deform' else 'pass5_' if args.mode=='baseline'")
p.write_text(s)
