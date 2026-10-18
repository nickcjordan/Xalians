import bpy,sys,numpy as np
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from pass3 import p,r
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
rig=p.openfile(p.OUT/'trial7.blend');p.showpose(rig,'leap');r.g.lookdev.setup_scene('CYCLES');c=rig.matrix_world@rig.pose.bones['leg_hl_01'].head;rad=.12
cam=r.g.lookdev.place_camera('lookdev_detail',(c-Vector((rad,rad,rad)),c+Vector((rad,rad,rad))),90,0,.04)
o=bpy.data.objects['game_body_horns_claws'];q=r.coords(o,True);uv=np.array([list(world_to_camera_view(bpy.context.scene,cam,Vector(v))) for v in q]);uv[:,0]*=512;uv[:,1]=(1-uv[:,1])*512
np.savez_compressed(str(p.OUT/'hip_screen.npz'),uv=uv,tri=np.array([f.vertices[:] for f in o.data.polygons]),xyz=r.coords(o),posed=q,weights=r.weights(o,[b.name for b in rig.data.bones]),names=np.array([b.name for b in rig.data.bones]));print('CUSTOM_NORMALS',o.data.has_custom_normals)
