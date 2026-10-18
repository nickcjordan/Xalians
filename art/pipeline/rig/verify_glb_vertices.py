"""Independent per-vertex glTF LBS evaluation against Blender samples."""
import json, copy, hashlib
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree
from compensate_glb import read_glb, worlds, OUT
def main():
 path=OUT/'luceras_rigged.glb';g,buf=read_glb(path)
 def accessor(i):
  a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];dt={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];size=np.dtype(dt).itemsize
  return np.ndarray((a['count'],n),dtype=dt,buffer=buf,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',n*size),size)).copy()
 refs=np.load(OUT/'blender_game_vertices.npz');poses=['rest','crouch','leap','landing','head_left_up','tail_side_up','foreleg_step','breath_in'];results={};mapping={};rest={};ambiguous={}
 for pi,pose in enumerate(poses):
  gg=copy.deepcopy(g);t=(1+10*pi)/30;time_error=0
  for ch in g['animations'][0]['channels']:
   s=g['animations'][0]['samplers'][ch['sampler']];ts=accessor(s['input']).ravel();values=accessor(s['output']);ix=int(np.argmin(abs(ts-t)))
   if np.max(abs(values-values[0]))>1e-6:time_error=max(time_error,float(abs(ts[ix]-t)))
   gg['nodes'][ch['target']['node']][ch['target']['path']]=values[ix].tolist()
  world,_=worlds(gg);entry={}
  for ni,n in enumerate(gg['nodes']):
   if 'mesh' not in n:continue
   skin=g['skins'][n['skin']];ibm=accessor(skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1);ms=np.array([world[j]@ibm[k] for k,j in enumerate(skin['joints'])]);points=[];weight_error=0
   for prim in g['meshes'][n['mesh']]['primitives']:
    a=prim['attributes'];p=accessor(a['POSITION']);j=accessor(a['JOINTS_0']).astype(int);w=accessor(a['WEIGHTS_0']);weight_error=max(weight_error,float(np.max(abs(w.sum(axis=1)-1))));ph=np.column_stack([p,np.ones(len(p))]);points.append(np.einsum('nkij,nj,nk->ni',ms[j],ph,w)[:,:3])
   actual=np.concatenate(points);name=n['name'];expected=refs[pose+'__'+name][:,[0,2,1]].copy();expected[:,2]*=-1
   if pi==0:
    tree=cKDTree(expected);d,idx=tree.query(actual);mapping[name]=idx;rest[name]=actual;ambiguous[name]=len(tree.query_pairs(1e-6))
    assert max(d)<1e-6,('rest_correspondence',name,max(d))
   e=np.linalg.norm(actual-expected[mapping[name]],axis=1)
   entry[name]={'exported_split_vertices':len(actual),'source_vertices':len(expected),'max_vertex_error_m':float(e.max()),'mean_vertex_error_m':float(e.mean()),'p99_vertex_error_m':float(np.quantile(e,.99)),'vertices_over_tolerance':int((e>1e-6).sum()),'finite':bool(np.isfinite(actual).all()),'at_origin':int((np.linalg.norm(actual,axis=1)<1e-8).sum()),'farther_than_3m':int((np.linalg.norm(actual,axis=1)>3).sum()),'max_motion_m':float(np.linalg.norm(actual-rest[name],axis=1).max())}
   entry[name]['max_weight_sum_error']=weight_error
  results[pose]={'key_time_error_s':time_error,'meshes':entry}
 maximum=max(m['max_vertex_error_m'] for e in results.values() for m in e['meshes'].values())
 passed=maximum<=1e-6 and len(results)==8 and not any(ambiguous.values()) and all(e['key_time_error_s']<=1e-6 and set(e['meshes'])=={'game_body_horns_claws','game_eyes'} for e in results.values()) and all(m['finite'] and not m['at_origin'] and not m['farther_than_3m'] and m['max_weight_sum_error']<1e-6 for e in results.values() for m in e['meshes'].values())
 data={'method':__doc__,'rest_correspondence':'Nearest unchanged rest vertex. Export duplicates map back to source coordinates. Every exported split vertex is checked.','tolerance_m':1e-6,'tolerance_mm':.001,'max_vertex_error_m':maximum,'passed':passed,'glb_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'poses':results}
 data['source_rest_vertex_pairs_within_tolerance']=ambiguous
 (OUT/'glb_vertex_check.json').write_text(json.dumps(data,indent=2));print(json.dumps({'passed':passed,'maximum_mm':maximum*1000}));assert passed
if __name__=='__main__':main()
