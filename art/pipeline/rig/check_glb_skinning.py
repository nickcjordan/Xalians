"""Evaluate exported glTF animation and linear skinning independently of Blender."""
import json,struct,hashlib,copy
from pathlib import Path
import numpy as np
OUT=Path(r'C:\dev\art-data\pipeline\codex-stream\luceras-rig\pass1')
raw=(OUT/'luceras_rigged.glb').read_bytes();length=struct.unpack_from('<I',raw,12)[0]
g=json.loads(raw[20:20+length]);binary=raw[28+length:]
def accessor(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']]
 dtype={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']]
 n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];size=np.dtype(dtype).itemsize
 return np.ndarray((a['count'],n),dtype=dtype,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',n*size),size)).copy()
def trs(n):
 if 'matrix' in n:return np.array(n['matrix']).reshape(4,4).T
 x,y,z,w=n.get('rotation',[0,0,0,1]);m=np.eye(4)
 m[:3,:3]=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])@np.diag(n.get('scale',[1,1,1]))
 m[:3,3]=n.get('translation',[0,0,0]);return m
parents={c:i for i,n in enumerate(g['nodes']) for c in n.get('children',[])}
result={};rest={}
for pose_i,name in enumerate(['rest','crouch','leap','landing','head_left_up','tail_side_up','foreleg_step','breath_in']):
 nodes=copy.deepcopy(g['nodes']);time=(1+pose_i*10)/30;max_time_error=0
 for channel in g['animations'][0]['channels']:
  sampler=g['animations'][0]['samplers'][channel['sampler']];t=accessor(sampler['input']).ravel();values=accessor(sampler['output']);i=int(np.argmin(abs(t-time)))
  if not np.allclose(values,values[0],atol=1e-6):max_time_error=max(max_time_error,float(abs(t[i]-time)))
  nodes[channel['target']['node']][channel['target']['path']]=values[i].tolist()
 world={}
 def mat(i):
  if i not in world:world[i]=(mat(parents[i]) if i in parents else np.eye(4))@trs(nodes[i])
  return world[i]
 entry={}
 for ni,node in enumerate(nodes):
  if 'mesh' not in node:continue
  skin=g['skins'][node['skin']];ibm=accessor(skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1)
  matrices=np.array([mat(j)@ibm[k] for k,j in enumerate(skin['joints'])]);points=[];weight_error=0
  for primitive in g['meshes'][node['mesh']]['primitives']:
   a=primitive['attributes'];p=accessor(a['POSITION']);j=accessor(a['JOINTS_0']).astype(int);w=accessor(a['WEIGHTS_0']);weight_error=max(weight_error,float(np.max(abs(w.sum(axis=1)-1))))
   homogeneous=np.column_stack([p,np.ones(len(p))]);transforms=matrices[j];posed=np.einsum('nkij,nj,nk->ni',transforms,homogeneous,w)[:,:3];points.append(posed)
  p=np.concatenate(points)
  if pose_i==0:rest[node['name']]=p
  entry[node['name']]=dict(vertices=len(p),finite=bool(np.isfinite(p).all()),farther_than_3m=int(np.sum(np.linalg.norm(p,axis=1)>3)),at_origin=int(np.sum(np.linalg.norm(p,axis=1)<1e-8)),bounds_min=p.min(axis=0).tolist(),bounds_max=p.max(axis=0).tolist(),max_weight_sum_error=weight_error,max_motion_from_rest_m=float(np.max(np.linalg.norm(p-rest[node['name']],axis=1))))
 result[name]=dict(nearest_key_time_error=max_time_error,meshes=entry)
passed=all(v['nearest_key_time_error']<1e-6 and all(m['finite'] and m['farther_than_3m']==0 and m['at_origin']==0 and m['max_weight_sum_error']<1e-5 for m in v['meshes'].values()) for v in result.values())
out=dict(method='Independent CPU evaluation of exported glTF TRS animation, inverse bind matrices and four-influence linear skinning. This is not a browser/WebGL test.',glb_sha256=hashlib.sha256(raw).hexdigest(),passed=passed,poses=result)
measure=json.loads((OUT/'measurements.json').read_text());bounds_errors={}
for name,entry in result.items():
 bounds_errors[name]={}
 for obj in measure['pose_checks'][name]['game']:
  low=obj['bounds_min'];high=obj['bounds_max'];expected_low=np.array([low[0],low[2],-high[1]]);expected_high=np.array([high[0],high[2],-low[1]])
  actual=entry['meshes'][obj['name']]
  bounds_errors[name][obj['name']]=float(max(np.max(abs(expected_low-actual['bounds_min'])),np.max(abs(expected_high-actual['bounds_max']))))
out['blender_world_bounds_max_errors_m']=bounds_errors
out['blender_bounds_match']=max(v for d in bounds_errors.values() for v in d.values())<1e-5
passed=passed and out['blender_bounds_match'];out['passed']=passed
(OUT/'glb_skinning_check.json').write_text(json.dumps(out,indent=2));print(json.dumps(dict(passed=passed,poses=len(result))))
assert passed
