import sys,json
from pathlib import Path
import bpy,numpy as np
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).parent))
import build_pass2 as p
O=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass4')
bpy.ops.wm.open_mainfile(filepath=str(O/'iter1_mesh.blend'))
s=bpy.data.objects['luceras_blockout'];s.data.calc_loop_triangles();a=np.array([v.co[:] for v in s.data.vertices]);t=np.array([x.vertices[:] for x in s.data.loop_triangles]);r={}
for y in [.28,.30,.31,.32,.33,.34,.35,.36,.37,.38,.39,.40,.42]:
 try:
  q=p.section(a,t,Vector((0,1,0)),Vector(),y,np.array((0,y,.46)));r[str(y)]={'n':len(q),'min':q.min(0).tolist(),'max':q.max(0).tolist(),'points':q.tolist()}
 except Exception as e:r[str(y)]=str(e)
(O/'iter1_sections.json').write_text(json.dumps(r))
for name in ['game_body','luceras_blockout']:
 ob=bpy.data.objects[name];out=[]
 for v in ob.data.vertices:
  if .30<v.co.y<.42 and .38<v.co.z<.54 and abs(v.co.x)<.05 and (name=='game_body' or v.index%40==0):
   out.append({'id':v.index,'co':list(v.co),'weights':[(ob.vertex_groups[g.group].name,g.weight) for g in v.groups if g.weight>.1]})
 (O/('iter1_'+name+'_root.json')).write_text(json.dumps(out))
ear={}
origin,axis,across,depth=p.ear_frame(1)
for h in [-.01,-.005,0,.005,.01,.015,.02,.025,.03,.035]:
 try:
  q=p.section(a,t,axis,origin,h,np.array(origin+axis*h));rel=q-np.array(origin);ear[str(h)]={'n':len(q),'across':[(rel@np.array(across)).min(),(rel@np.array(across)).max()],'depth':[(rel@np.array(depth)).min(),(rel@np.array(depth)).max()],'points':q.tolist()}
 except Exception as e:ear[str(h)]=str(e)
(O/'iter1_ear_sections.json').write_text(json.dumps(ear))
print('DIAGNOSTIC_DONE',flush=True)
import time,runpy,os
request=O/'next_stage.json';deadline=time.time()+180
print('REVIEW_WINDOW',flush=True)
while time.time()<deadline and not request.exists():time.sleep(.5)
if request.exists():
 cfg=json.loads(request.read_text());request.unlink();os.environ['GM_ITERATION']=str(cfg.get('iteration',1));sys.argv=[sys.argv[0],'--','--stage',cfg.get('stage','render')]
 runpy.run_path(str(Path(__file__).with_name(cfg.get('script','build_gamemesh.py'))),run_name='__main__')
