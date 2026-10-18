import bpy
from pathlib import Path
O=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-groom/pass2')
bpy.ops.wm.open_mainfile(filepath=str(O/'groom.blend'))
h=bpy.data.objects['Luceras interpolated coat'];m=h.data.materials[0];t=m.node_tree
out=next(n for n in t.nodes if n.bl_idname=='ShaderNodeOutputMaterial');at=t.nodes.new('ShaderNodeAttribute');at.attribute_name='plume_white';em=t.nodes.new('ShaderNodeEmission');t.links.new(at.outputs['Fac'],em.inputs['Color']);t.links.new(em.outputs[0],out.inputs[0])
s=bpy.context.scene;s.camera=bpy.data.objects['groom_camera_tail_plume'];s.render.resolution_x=600;s.render.resolution_y=600;s.cycles.samples=16;s.render.filepath=str(O/'debug_plume_mask.png');bpy.ops.render.render(write_still=True)
