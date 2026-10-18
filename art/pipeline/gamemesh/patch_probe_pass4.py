"""Inspect topology-defined tail root patch and ear source sections."""
import bpy,bmesh,sys,json,numpy as np,time,runpy,os
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).parent));import build_pass2 as p
O=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass4')
bpy.ops.wm.open_mainfile(filepath=str(O/'iter1_baked.blend'))
b=bpy.data.objects['game_body'];s=bpy.data.objects['luceras_blockout'];bm=bmesh.new();bm.from_mesh(b.data);bm.verts.ensure_lookup_table();layer=bm.verts.layers.deform.active
ids={v.index for v in b.data.vertices if any(b.vertex_groups[g.group].name.startswith('tail_') and g.weight>.5 for g in v.groups)}
faces=[f for f in bm.faces if .28<f.calc_center_median().y<.40 and sum(v.index in ids for v in f.verts)>=2]
verts=set(v for f in faces for v in f.verts);bmesh.ops.delete(bm,geom=faces,context='FACES_ONLY')
wire=[e for e in bm.edges if not e.link_faces];bmesh.ops.delete(bm,geom=wire,context='EDGES')
loops=p.loops([e for e in bm.edges if e.is_boundary]);print('TAIL_PATCH',len(faces),[(len(loop),[min(v.co[i] for v in loop) for i in range(3)],[max(v.co[i] for v in loop) for i in range(3)]) for loop in loops],flush=True)
(O/'iter2_patch_loops.json').write_text(json.dumps([[list(v.co) for v in loop] for loop in loops]))
s.data.calc_loop_triangles();a=np.array([v.co[:] for v in s.data.vertices]);t=np.array([x.vertices[:] for x in s.data.loop_triangles]);ear={};origin,axis,across,depth=p.ear_frame(1)
for h in [-.01,-.005,0,.005,.01,.015,.02,.025,.03,.035]:
 try:
  q=p.section(a,t,axis,origin,h,np.array(origin+axis*h));rel=q-np.array(origin);ear[str(h)]={'n':len(q),'across':[(rel@np.array(across)).min(),(rel@np.array(across)).max()],'depth':[(rel@np.array(depth)).min(),(rel@np.array(depth)).max()],'points':q.tolist()}
 except Exception as e:ear[str(h)]=str(e)
(O/'iter2_ear_sections.json').write_text(json.dumps(ear))
(O/'iter2_root_geometry.json').write_text(json.dumps({'verts':[(v.index,list(v.co),list(v.normal)) for v in b.data.vertices],'faces':[list(f.vertices) for f in b.data.polygons]}))
request=O/'next_stage.json';deadline=time.time()+150;print('REVIEW_WINDOW',flush=True)
while time.time()<deadline and not request.exists():time.sleep(.5)
if request.exists():
 cfg=json.loads(request.read_text());request.unlink();os.environ['GM_ITERATION']=str(cfg.get('iteration',3));sys.argv=[sys.argv[0],'--','--stage',cfg.get('stage','repair')];runpy.run_path(str(Path(__file__).with_name(cfg.get('script','build_gamemesh.py'))),run_name='__main__')
