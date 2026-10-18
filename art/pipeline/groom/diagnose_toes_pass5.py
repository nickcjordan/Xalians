import bpy,json,time
from pathlib import Path
from mathutils import Vector
O=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-groom/pass5')
bpy.ops.wm.open_mainfile(filepath=str(O/'groom.blend'))
body=bpy.data.objects['luceras_blockout'];s=bpy.context.scene
mat=bpy.data.materials.new('Toe mask diagnostic');mat.use_nodes=True;ns=mat.node_tree.nodes;lk=mat.node_tree.links;ns.clear()
at=ns.new('ShaderNodeAttribute');at.attribute_name='toe_break';ramp=ns.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.25,.25,.25,1);ramp.color_ramp.elements[1].color=(0,1,.05,1);lk.new(at.outputs['Fac'],ramp.inputs[0]);em=ns.new('ShaderNodeEmission');lk.new(ramp.outputs[0],em.inputs[0]);out=ns.new('ShaderNodeOutputMaterial');lk.new(em.outputs[0],out.inputs[0]);body.data.materials.clear();body.data.materials.append(mat)
for o in s.objects:
 if o.type=='CURVES':o.hide_render=True
cam=bpy.data.objects['groom_camera_hind_leg'];s.camera=cam;cam.data.ortho_scale=.27;target=Vector((.15,.09,.035));cam.location=target+Vector((.7,-.8,.55))*5;cam.rotation_mode='QUATERNION';cam.rotation_quaternion=(target-cam.location).to_track_quat('-Z','Y');cam.data.shift_x=0;cam.data.shift_y=0
s.render.resolution_x=768;s.render.resolution_y=768;s.render.resolution_percentage=100;s.cycles.samples=16;s.render.filepath=str(O/'diagnostic_toe_mask.png');bpy.ops.render.render(write_still=True)
pts=[v.co[:] for v in body.data.vertices if .10<abs(v.co.x)<.22 and .03<v.co.y<.13 and v.co.z<.065]
values=[a.value for a,v in zip(body.data.attributes['toe_break'].data,body.data.vertices) if .10<abs(v.co.x)<.22 and .03<v.co.y<.13 and v.co.z<.065]
(O/'toe_mask_diagnostic.json').write_text(json.dumps({'points':pts,'mask':values,'max':max(values),'masked_vertices':sum(v>.1 for v in values)},indent=2))
