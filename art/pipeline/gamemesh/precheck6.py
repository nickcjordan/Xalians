import bpy,sys
from pathlib import Path
HERE=Path(__file__).parent;sys.path.insert(0,str(HERE));import build_pass1 as g
P=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass6');bpy.ops.wm.open_mainfile(filepath=str(P/'iter4_baked.blend'));rig=bpy.data.objects['luceras_rig'];g.block.POSES['landing'](g.clips.Poser(rig),rig);bpy.context.view_layer.update();g.lookdev.setup_scene('CYCLES');bpy.context.scene.cycles.samples=16;p=rig.matrix_world@rig.pose.bones['tail_01'].head;r=g.Vector((.105,.105,.105));cam=g.lookdev.place_camera('lookdev_close',(p-r,p+r),90,0,.04);g.visible('game');g.lookdev.render(cam,P/'iter4_precheck_landing.png',size=384)
