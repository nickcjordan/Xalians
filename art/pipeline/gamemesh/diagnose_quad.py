import bpy,bmesh,json
from pathlib import Path
p=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass1')
b=bpy.data.objects['luceras_blockout'];bm=bmesh.new();bm.from_mesh(b.data)
r={'vertices_nonmanifold':sum(not v.is_manifold for v in bm.verts),'edges_nonmanifold':sum(not e.is_manifold for e in bm.edges),'edges_noncontiguous':sum(not e.is_contiguous for e in bm.edges),'degenerate_faces_1e14':sum(f.calc_area()<1e-14 for f in bm.faces),'short_edges_1e8':sum(e.calc_length()<1e-8 for e in bm.edges),'modifiers':[(m.name,m.type) for m in b.modifiers]}
r['edges_below_quadriflow_coordinate_tolerance']=sum(max(abs(c) for c in (e.verts[0].co-e.verts[1].co))<1e-4 for e in bm.edges)
r['minimum_edge_length_m']=min(e.calc_length() for e in bm.edges)
bmesh.ops.dissolve_degenerate(bm,dist=1e-7,edges=list(bm.edges));bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(b.data);bm.free();b.data.update()
r['after_triangles']=len(b.data.polygons)
for o in bpy.context.scene.objects:o.select_set(False)
b.select_set(True);bpy.context.view_layer.objects.active=b
b.data.use_mirror_x=True
for v in b.data.vertices:v.co*=1000
b.data.update()
r['temporary_coordinate_scale']=1000
(p/'iter0_pre_quad_diagnosis.json').write_text(json.dumps(r,indent=2));print(r,flush=True)
r['quad_result']=list(bpy.ops.object.quadriflow_remesh(use_mesh_symmetry=True,use_preserve_sharp=False,target_faces=4250))
if 'FINISHED' not in r['quad_result']:
 r['precondition']='voxel_0.001m_working_copy'
 b.data.remesh_voxel_size=1.;bpy.ops.object.voxel_remesh()
 r['quad_result']=list(bpy.ops.object.quadriflow_remesh(use_mesh_symmetry=True,use_preserve_sharp=False,target_faces=4250))
else:r['precondition']='dissolve_degenerate_and_merge_1e-7m'
for v in b.data.vertices:v.co/=1000
b.data.update()
b.data.calc_loop_triangles();r['quad_triangles']=len(b.data.loop_triangles)
(p/'iter0_quad_diagnosis.json').write_text(json.dumps(r,indent=2));print(r,flush=True)
if 'FINISHED' in r['quad_result']:bpy.ops.wm.save_as_mainfile(filepath=str(p/'iter0_quad_test.blend'))
if 'FINISHED' in r['quad_result']:
 import runpy,sys
 sys.argv=['build_gamemesh.py','--','--stage','all']
 runpy.run_path('/mnt/c/dev/src/xalians-creature-pipeline/art/pipeline/gamemesh/build_gamemesh.py',run_name='__main__')
