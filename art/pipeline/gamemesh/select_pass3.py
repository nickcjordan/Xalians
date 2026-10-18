"""Finalize the cleanest candidate with a fresh consistent texture set."""
import sys,os,json,shutil,runpy
from pathlib import Path
import bpy
sys.path.insert(0,str(Path(__file__).parent))
import build_pass2 as p2
from build_pass2 import g
OUT=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass3');g.ITERATION=6;g.OUT=g.IterationOutput(str(OUT));p2.OUT=g.OUT
shutil.copyfile(OUT/'iter3_mesh.blend',OUT/'iter6_mesh.blend');shutil.copyfile(OUT/'iter3_mesh.json',OUT/'iter6_mesh.json')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'iter6_mesh.blend'));g.lookdev.setup_scene('CYCLES');bpy.context.scene.cycles.samples=16;g.visible('game');box,az,el=p2.cameras()['ear_three_quarter'];cam=g.lookdev.place_camera('lookdev_unbaked',box,az,el,.04);g.lookdev.render(cam,OUT/'iter6_ear_without_normal.png',size=512)
p2.bake()
sys.argv=[sys.argv[0],'--','--stage','render'];runpy.run_path(str(Path(__file__).with_name('build_gamemesh.py')),run_name='__main__')
