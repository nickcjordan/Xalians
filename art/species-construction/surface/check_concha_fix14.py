"""Saved exact held-data check plus unchanged complete skin and solid sweeps."""
import sys,json,hashlib,runpy
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
from verify_fur_13 import digest
from concha_fix14_paths import baseline
work=HERE.parents[2]/'untracked/species-construction/akinza/surface/fur-steps'
after=work/sys.argv[sys.argv.index('--')+1];before=baseline(work)
out=after/'r';out.mkdir(exist_ok=True)
patch=np.load(after/'patch-evidence.npz');probe=np.load(work/'14-fix-probe.npz')
starts=probe['starts'];changed=patch['changed'];color=patch['color']
helpers={'__file__':str(HERE/'verify_fur_12f.py')}
exec(compile((HERE/'verify_fur_12f.py').read_text().split('args=sys.argv')[0],'helpers','exec'),helpers)
def snapshot(folder):
 bpy.ops.wm.open_mainfile(filepath=str(folder/'surface.blend'));result={}
 for ob in bpy.data.objects:
  if ob.type not in ('MESH','CURVES') or ob.name in ('Akinza concha tuft 14','Akinza inner ear undercoat 14 fix'):continue
  data=ob.data;attrs={}
  for a in data.attributes:
   if a.name=='concha_velvet14' or a.data_type not in ('FLOAT','FLOAT_VECTOR','INT','INT8','BOOLEAN'):continue
   width=3 if a.data_type=='FLOAT_VECTOR' else 1
   v=np.empty(len(a.data)*width,np.float32 if a.data_type.startswith('FLOAT') else np.int32)
   a.data.foreach_get('vector' if width==3 else 'value',v);v=v.reshape(-1,width)
   if ob.name=='Akinza fur':
    m=changed if a.name in ('position','radius','strlen','fur_guided') else color if a.name in ('cupm','pale','fur_tone') else None
    if m is not None:
     counts=np.diff(np.r_[starts,len(data.points)]);v=v[~(m if a.domain=='CURVE' else np.repeat(m,counts))]
   attrs[a.name]=digest(v)
  if ob.type=='MESH':
   loops=np.empty(len(data.loops),np.int32);data.loops.foreach_get('vertex_index',loops);attrs['topology']=digest(loops)
  result[ob.name]=dict(attrs=attrs,matrix=[list(v) for v in ob.matrix_world],slots=[m.name for m in data.materials])
 # Blender drops the already retired, zero-user 13g material on save.
 # Every material used by an actual object remains in the strict comparison.
 mats={m.name:helpers['material_graph'](m) for m in bpy.data.materials if m.use_nodes and m.users>0}
 for graph in mats.values():
  for node in graph['nodes']:
   if node['name']=='14 blue velvet':node['inputs']='authorized localized velvet color'
 return result,mats
a,ma=snapshot(before);b,mb=snapshot(after)
assert a==b,'Unrelated object data changed'
diff=dict(missing=sorted(set(ma)-set(mb)),added=sorted(set(mb)-set(ma)),changed=[name for name in ma.keys()&mb.keys() if ma[name]!=mb[name]])
(out/'material-difference.json').write_text(json.dumps(diff,indent=2)+'\n')
assert ma==mb,'Unrelated material graphs changed: '+str(diff)
report=dict(heldObjectsExact=True,allGeometryAndTopologyExact=True,earBackAndEyelinerExact=True,originalMaterialGraphsExact=True,
 nativeEdited=int(changed.sum()),restoredBlue=int(patch['restored'].sum()),surfaceSha256=hashlib.sha256((after/'surface.blend').read_bytes()).hexdigest(),protected=a)
(out/'held-data.json').write_text(json.dumps(report,indent=2)+'\n')
print('FIX_HELD_PASS',flush=True)
from refine_ear_root_12b2 import values
skin=bpy.data.objects['akinza_continuous_construction']
bvh=BVHTree.FromObject(skin,bpy.context.evaluated_depsgraph_get())
cu=bpy.data.objects['Akinza fur'].data
roots=values(cu,'position','vector',3)[starts][changed]
original_normals=probe['nrm'][changed];distances=[];agreements=[]
for q,n in zip(roots,original_normals):
 hit=bvh.find_nearest(Vector(q));distances.append(hit[3]);agreements.append(float(np.dot(n,np.array(hit[1]))))
attachment=dict(maxSurfaceDistance=max(distances),minOriginalNormalAgreement=min(agreements),tested=len(roots))
(out/'root-attachment.json').write_text(json.dumps(attachment,indent=2)+'\n')
assert max(distances)<.0012 and min(agreements)>0,'Native attachment changed sheet'
if 'undercoatRoots' in patch:
 undercoat=bpy.data.objects['Akinza inner ear undercoat 14 fix'].data
 us=np.empty(len(undercoat.curves),np.int32);undercoat.curves.foreach_get('first_point_index',us)
 actual=values(undercoat,'position','vector',3)[us]
 co=values(skin.data,'position','vector',3);tri=probe['tri'][patch['undercoatTriangles']]
 normals=np.cross(co[tri[:,1]]-co[tri[:,0]],co[tri[:,2]]-co[tri[:,0]])
 normals/=np.linalg.norm(normals,axis=1,keepdims=True)
 expected=(co[tri]*patch['undercoatBarycentric'][:,:,None]).sum(axis=1)+normals*.0007
 assert np.max(np.linalg.norm(actual-expected,axis=1))<1e-7,'Undercoat root attachment differs from actual triangle'
 assert np.all(normals[:,1]<0),'Undercoat reached an ear back'
 assert np.array_equal(actual,patch['undercoatRoots'])
 vertices=np.unique(tri);q=co[vertices]
 x=abs(q[:,0])-.17;z=q[:,2]-.64;uv=np.c_[.8*x+.6*z,-.6*x+.8*z]
 r=np.linalg.norm((uv-[.057,.019])/[.026,.021],axis=1)
 skin_normal=np.empty_like(co);skin.data.vertex_normals.foreach_get('vector',skin_normal.ravel())
 anatomical=(skin_normal[vertices,1]<-.15)&(values(skin.data,'earw')[vertices]>.95)&(abs(q[:,0])>.15)&(uv[:,0]>0)&(uv[:,0]<.15)&(abs(uv[:,1]-.019)<.075)&((values(skin.data,'cupm')[vertices]>.5)|(r<1.1))
 assert anatomical.all(),'Undercoat support escaped the actual front cup region'
 surface=expected-normals*.0007;x=abs(surface[:,0])-.17;z=surface[:,2]-.64
 vr=np.linalg.norm((np.c_[.8*x+.6*z,-.6*x+.8*z]-[.057,.019])/[.024,.019],axis=1)
 weight=values(undercoat,'concha_velvet14')[us]
 assert weight.max()<=.250001 and not ((weight>0)&(vr>1.00001)).any(),'Undercoat velvet escaped cup'
 info=json.loads((after/'surface-info.json').read_text())
 assert info['additionalFurObjects']==['Akinza concha tuft 14','Akinza inner ear undercoat 14 fix']
 (out/'undercoat-attachment.json').write_text(json.dumps(dict(roots=len(actual),maxTriangleAttachmentError=float(np.max(np.linalg.norm(actual-expected,axis=1))),minFrontFacing=float(-normals[:,1].max()),allAdditionalSystemsDeclared=True),indent=2)+'\n')
info=json.loads((after/'surface-info.json').read_text())
if info.get('finalWhiteVisibility14Fix',{}).get('nativeChangedFromFix2')==0:
 candidates=[work/'s12-14-fix2',Path('C:/Users/njord/.claude/scratch-archive/Xalians/2026-10-15/s12-14-fix2-rejected-14-fix'),Path('/mnt/c/Users/njord/.claude/scratch-archive/Xalians/2026-10-15/s12-14-fix2-rejected-14-fix')]
 previous=next(folder for folder in candidates if (folder/'surface.blend').exists())
 def complete_snapshot(folder):
  bpy.ops.wm.open_mainfile(filepath=str(folder/'surface.blend'));result={}
  for ob in bpy.data.objects:
   if ob.type not in ('MESH','CURVES'):continue
   attributes={}
   for a in ob.data.attributes:
    if ob.name=='Akinza concha tuft 14' and a.name=='radius':continue
    if a.data_type not in ('FLOAT','FLOAT_VECTOR','INT','INT8','BOOLEAN'):continue
    width=3 if a.data_type=='FLOAT_VECTOR' else 1
    v=np.empty(len(a.data)*width,np.float32 if a.data_type.startswith('FLOAT') else np.int32)
    a.data.foreach_get('vector' if width==3 else 'value',v);attributes[a.name]=digest(v)
   result[ob.name]=dict(attributes=attributes,matrix=[list(v) for v in ob.matrix_world],slots=[m.name for m in ob.data.materials])
  return result,{m.name:helpers['material_graph'](m) for m in bpy.data.materials if m.use_nodes and m.users>0}
 previous_data,previous_materials=complete_snapshot(previous);final_data,final_materials=complete_snapshot(after)
 assert previous_data==final_data and previous_materials==final_materials,'Final build changed more than white radii'
 (out/'final-radius-only.json').write_text(json.dumps(dict(onlyWhiteRadiusChanged=True,allNativeAndBlueDataExact=True,whitePathsExact=True,allMaterialGraphsExact=True,sourceSha256=hashlib.sha256((previous/'surface.blend').read_bytes()).hexdigest(),surfaceSha256=hashlib.sha256((after/'surface.blend').read_bytes()).hexdigest()),indent=2)+'\n')
if '--held-only' in sys.argv:raise SystemExit(0)
for script in ('sweep_fur_12d.py','sweep_obstacles_12d.py'):
 sys.argv=[script,'--',str(after),str(out)];runpy.run_path(str(HERE/script),run_name='__main__')
# A model-bound native review can authorize the remaining established views
# in this same exclusive lease. It is an agent inspection, never user approval.
decision=after/'after/native-decision.json'
if decision.exists():
 review=json.loads(decision.read_text())
 if review.get('continueRender') and review.get('surfaceSha256')==hashlib.sha256((after/'surface.blend').read_bytes()).hexdigest():
  import subprocess
  def win(path):
   path=str(path.resolve());assert path.startswith('/mnt/');return path[5].upper()+':'+path[6:]
  subprocess.run(['/mnt/c/Python314/python.exe',win(HERE/'finish_concha_fix14.py'),after.name,'--gate-only'],check=True)
  views='head-side,head-backq,body-backq,body-front,tails-side'
  if not all((after/'after'/f'{view}.png').exists() for view in views.split(',')):
   sys.argv=['render_concha_fix14.py','--',after.name,views]
   runpy.run_path(str(HERE/'render_concha_fix14.py'),run_name='__main__')
