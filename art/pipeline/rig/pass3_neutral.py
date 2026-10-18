import bpy,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from pass3 import p,r
from mathutils import Vector
rig=p.openfile(p.OUT/'trial8.blend');p.showpose(rig,'rest');r.g.lookdev.setup_scene('CYCLES');bpy.context.scene.cycles.samples=16
c=rig.matrix_world@rig.pose.bones['leg_hl_01'].head;rad=.12;cam=r.g.lookdev.place_camera('lookdev_detail',(c-Vector((rad,rad,rad)),c+Vector((rad,rad,rad))),90,0,.04)
for kind in ('sculpt','game'):
 for o in r.meshes(kind):r.g.lookdev.apply_clay(o)
 r.visible(kind);r.g.lookdev.render(cam,p.OUT/f'diagnostic_rest_hip_{kind}.png',size=512)
