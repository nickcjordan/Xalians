import sys,types,json,bpy,bmesh
from pathlib import Path
from mathutils.bvhtree import BVHTree
HERE=Path(__file__).parent;sys.path.insert(0,str(HERE));p=types.ModuleType('p');p.__file__=str(HERE/'build_pass3.py');exec(compile((HERE/'build_pass3.py').read_text().split('stage=sys.argv[')[0].replace("/pass3'","/pass6'"),p.__file__,'exec'),p.__dict__)
bpy.ops.wm.open_mainfile(filepath=str(p.g.OUT/'iter1_baked.blend'));src=bpy.data.objects['luceras_blockout'];o=bpy.data.objects['game_body'];bm=bmesh.new();bm.from_mesh(o.data);bm.normal_update();sb=bmesh.new();sb.from_mesh(src.data);tree=BVHTree.FromBMesh(sb)
candidates=[]
for e in bm.edges:
 if e.is_manifold and e.link_faces[0].normal.dot(e.link_faces[1].normal)<-.8:
  q=(e.verts[0].co+e.verts[1].co)/2
  if (q-p.g.Vector((-.0522158,-.201659,.567778))).length<.001:
   candidates.append({'edge_center':list(q),'faces':[{'center':list(f.calc_center_median()),'normal':list(f.normal),'area':f.calc_area(),'source_dot':f.normal.dot(tree.find_nearest(f.calc_center_median())[1]),'coords':[list(v.co) for v in f.verts]} for f in e.link_faces]})
(p.OUT/'remaining_fold_diagnosis.json').write_text(json.dumps(candidates,indent=2));print('REMAINING_FOLD',json.dumps(candidates),flush=True)
# Right-hand bend cameras from the same saved final review asset.
p.JOINTS={'hip':'leg_hr_01','tail_base':'tail_01'}
oldcamera=p.g.lookdev.place_camera
p.g.lookdev.place_camera=lambda name,box,az,el,margin:oldcamera(name,box,270,el,margin)
oldrender=p.g.lookdev.render
p.g.lookdev.render=lambda cam,path,size=1024:oldrender(cam,str(path).replace('_bend_','_bend_right_'),size)
oldwrite=p.g.write
p.g.write=lambda name,data:oldwrite('right_bend_review.json' if name=='bend_review.json' else name,data)
p.close_poses()
import hashlib
p.g.write('right_render_provenance.json',{'source':'gamemesh.blend via iter4_review.blend','sha256':hashlib.sha256((p.OUT/'gamemesh.blend').read_bytes()).hexdigest(),'iteration':4,'engine':'Cycles','samples':16})
