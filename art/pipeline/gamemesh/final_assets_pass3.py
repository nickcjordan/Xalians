"""Finalize the cleanest candidate with a fresh consistent texture set."""
import sys,os,json,shutil,runpy
from pathlib import Path
import bpy
sys.path.insert(0,str(Path(__file__).parent))
import build_pass2 as p2
from build_pass2 import g
OUT=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass3');g.ITERATION=7;g.OUT=g.IterationOutput(str(OUT));p2.OUT=g.OUT
shutil.copyfile(OUT/'iter3_mesh.blend',OUT/'iter7_mesh.blend');shutil.copyfile(OUT/'iter3_mesh.json',OUT/'iter7_mesh.json')
bpy.ops.wm.open_mainfile(filepath=str(OUT/'iter7_mesh.blend'));g.lookdev.setup_scene('CYCLES');bpy.context.scene.cycles.samples=16;g.visible('game');box,az,el=p2.cameras()['ear_three_quarter'];cam=g.lookdev.place_camera('lookdev_unbaked',box,az,el,.04);g.lookdev.render(cam,OUT/'iter7_ear_without_normal.png',size=512)
import inspect
code=inspect.getsource(p2.bake).replace('p=v.co;distance=', 'p=v.co;frame=ear_frame(1 if p.x>0 else -1);height=(p-frame[0]).dot(frame[1]);distance=').replace('p.y>-.205 else .003','p.y>-.205 and height>.030 else .003');ns=dict(p2.bake.__globals__);exec(code,ns);ns['bake']()
settings=json.loads((OUT/'bake_settings.json').read_text());settings['cage_offset_m']={'ear_rim':.0012,'ear_root':.008,'toes':.003,'remaining':.008};g.write('bake_settings.json',settings)
sys.argv=[sys.argv[0],'--','--stage','render'];runpy.run_path(str(Path(__file__).with_name('build_gamemesh.py')),run_name='__main__')
