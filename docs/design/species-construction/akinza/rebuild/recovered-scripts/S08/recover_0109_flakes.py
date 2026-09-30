import bpy,bmesh,json,sys,shutil
from pathlib import Path
root=Path('/mnt/c/Users/njord/.codex/worktrees/1d07/Xalians')
sys.path.insert(0,str(root/'art/species-construction'))
from study_provenance import snapshot
from blender_blockout import sha,require_single_closed_mesh
source=root/'untracked/species-construction/akinza/head-0109/geometry-failure.blend'
out=source.parent/'recovered-02';out.mkdir(exist_ok=False)
snapshot_dir=out/'source-snapshot';snapshot_dir.mkdir()
sources={}
for entry in [Path(__file__)]+[root/'art/species-construction'/name for name in ['blender_blockout.py','blender_probe.py','authored_surfaces.py','surface_math.py']]:
 target=snapshot_dir/entry.name;shutil.copyfile(entry,target);sources[entry.name]=sha(target)
record_path=out/'stage-start.json'
record_path.write_text(json.dumps({'scope':'Actual recovery script and imported helpers snapshotted before mesh load','inputs':{str(source):sha(source)},'sources':sources},indent=2)+'\n')
provenance=sha(record_path)
bpy.ops.wm.open_mainfile(filepath=str(source))
o=max((o for o in bpy.context.scene.objects if o.type=='MESH'),key=lambda o:len(o.data.vertices))
bm=bmesh.new();bm.from_mesh(o.data);left=set(bm.verts);removed=[]
while left:
 v=left.pop();part={v};stack=[v]
 while stack:
  v=stack.pop()
  for e in v.link_edges:
   other=e.other_vert(v)
   if other in left:left.remove(other);part.add(other);stack.append(other)
 if len(part)>32:continue
 bounds=[[min(v.co[i] for v in part) for i in range(3)],[max(v.co[i] for v in part) for i in range(3)]]
 extent=max(bounds[1][i]-bounds[0][i] for i in range(3))
 if extent>=.012:continue
 small=bmesh.new();mapping={v:small.verts.new(v.co) for v in part}
 for face in {f for v in part for f in v.link_faces}:small.faces.new([mapping[v] for v in face.verts])
 volume=abs(small.calc_volume());small.free()
 if volume<.0025**3:
  removed.append({'vertices':len(part),'bounds':bounds,'volume':volume})
  bmesh.ops.delete(bm,geom=list(part),context='VERTS')
bm.to_mesh(o.data);bm.free()
for polygon in o.data.polygons:polygon.use_smooth=True
bpy.context.view_layer.objects.active=o
bpy.ops.mesh.customdata_custom_splitnormals_clear()
after=require_single_closed_mesh(o,out,'Recovered rear scalp')
bpy.ops.export_scene.gltf(filepath=str(out/'shape.glb'),export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'head.blend'))
(out/'recovery.json').write_text(json.dumps({'approval':None,'stageProvenanceSha256':provenance,'sourceSha256':sha(source),'reason':'Explicit recovery of two measured thin remesh flakes, each smaller in volume than one .0025 voxel. Original failure retained.','removed':removed,'after':after,'outputs':{p.name:sha(p) for p in out.iterdir() if p.suffix in ['.glb','.blend']}},indent=2)+'\n')
