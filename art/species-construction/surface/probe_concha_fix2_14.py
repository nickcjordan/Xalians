"""Read-only white-fiber visibility diagnosis. Never saves a model."""
import sys,json,hashlib
from pathlib import Path
import bpy
import numpy as np
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
from refine_ear_root_12b2 import values
import review_fur_13
import render_surface as render
work=HERE.parents[2]/'untracked/species-construction/akinza/surface/fur-steps'
source=work/'s12-14-fix3';out=work/'14-fix2-diagnosis';out.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source/'surface.blend'))
ob=bpy.data.objects['Akinza concha tuft 14'];cu=ob.data
report=dict(surfaceSha256=hashlib.sha256((source/'surface.blend').read_bytes()).hexdigest(),hideRender=ob.hide_render,matrix=[list(row) for row in ob.matrix_world],modifiers=[dict(name=m.name,type=m.type,render=m.show_render) for m in ob.modifiers],materials=[m.name for m in cu.materials],curves=len(cu.curves),radiiQuantiles=np.quantile(values(cu,'radius'),[0,.1,.5,.9,1]).tolist(),diagnosticOnly=True,modelSaved=False)
for obj in list(bpy.data.objects):
 if obj.type in ('LIGHT','CAMERA'):bpy.data.objects.remove(obj)
 elif obj!=ob:obj.hide_render=True
ob.hide_render=False
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=False
scene.view_settings.view_transform='Standard';scene.view_settings.look='None'
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
render.setup_world(scene)
for n in scene.world.node_tree.nodes:
 if n.bl_idname=='ShaderNodeBackground':n.inputs['Color'].default_value=(.025,.035,.05,1)
rig=render.make_rig();data=bpy.data.cameras.new('diagnostic camera');camera=bpy.data.objects.new('diagnostic camera',data);scene.collection.objects.link(camera);scene.camera=camera
view=render.VIEWS['ears-front'];render.place(camera,rig,view)
scene.render.filepath=str(out/'original-white-only.png');bpy.ops.render.render(write_still=True)
(out/'visibility.json').write_text(json.dumps(report,indent=2)+'\n')
print('READ_ONLY_DIAGNOSIS',report,flush=True)
