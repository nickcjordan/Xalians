import bpy,time,json
from pathlib import Path
O=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-groom/pass2')
bpy.ops.wm.open_mainfile(filepath=str(O/'groom.blend'))
h=bpy.data.objects['Luceras interpolated coat'];t=h.data.materials[0].node_tree
hair=next(n for n in t.nodes if n.bl_idname=='ShaderNodeBsdfHairPrincipled')
color=hair.inputs['Color'].links[0].from_node;color.inputs[2].default_value=(.999,.998,.997,1)
s=bpy.context.scene;s.cycles.max_bounces=16;s.cycles.transmission_bounces=12;s.cycles.glossy_bounces=8
s.camera=bpy.data.objects['groom_camera_tail_plume'];s.render.resolution_x=900;s.render.resolution_y=900;s.cycles.samples=48;s.render.filepath=str(O/'debug_plume_bounces.png');t0=time.perf_counter();bpy.ops.render.render(write_still=True);print('seconds',time.perf_counter()-t0)
