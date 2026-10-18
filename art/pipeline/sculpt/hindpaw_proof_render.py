"""B-tx7x fixed-camera clay proof, CPU only, executed under the Blender slot."""
import bpy,sys
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'roster'))
import lookdev
args=sys.argv[sys.argv.index('--')+1:]
root=Path('/mnt/c/dev/art-data/pipeline/codex-stream')
out=root/'luceras-hindpaw/pass1'
tags=args or ['generated','approved','repaired']
paths={'generated':root/'luceras-compare/generated.blend','approved':root/'luceras-merge/revert-forelegs/luceras_sculpt.blend','repaired':out/'luceras_sculpt.blend'}
box=lambda lo,hi:(Vector(lo),Vector(hi))
hind=box((.05,-.02,0),(.22,.30,.15))
views={'hind_paw_side':(hind,90,0),'hind_paw_three_quarter':(hind,45,12),'hind_paw_low_front':(box((.07,.02,0),(.22,.23,.115)),0,4),'full_side':(box((-.20,-.36,0),(.20,.74,.74)),90,0)}
for tag in tags:
 bpy.ops.wm.open_mainfile(filepath=str(paths[tag]))
 for o in bpy.data.objects:
  if o.type=='ARMATURE':o.hide_render=True
 lookdev.setup_scene(engine='CYCLES')
 bpy.context.scene.render.threads_mode='FIXED';bpy.context.scene.render.threads=8
 for o in bpy.data.objects:
  if o.type=='MESH' and not o.name.startswith('lookdev_') and not o.hide_render:
   if 'claw' not in o.name.lower():lookdev.apply_clay(o)
 for name,(bounds,az,el) in views.items():
  camera=lookdev.place_camera('lookdev_cam_'+name,bounds,az,el,margin=.04)
  lookdev.render(camera,out/(tag+'_'+name+'.png'),size=900)
  print('RENDERED',tag,name,flush=True)
