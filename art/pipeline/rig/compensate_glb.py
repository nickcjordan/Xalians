"""Bake evaluated transforms into glTF, retaining all original weighted joints.

TRS cannot represent shear. Only where required, a non-joint helper stores
the first rotation and scale of an SVD factorization, and the joint stores
the second rotation. No geometry, skin indices or bind matrices are changed.
"""
import json, struct, itertools, hashlib
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation
OUT=Path(r'C:\dev\art-data\pipeline\codex-stream\luceras-rig\pass2')
def read_glb(path):
 b=path.read_bytes();n=struct.unpack_from('<I',b,12)[0];return json.loads(b[20:20+n]),bytearray(b[28+n:])
def trs(n):
 if 'matrix' in n:return np.array(n['matrix']).reshape(4,4).T
 m=np.eye(4);m[:3,:3]=Rotation.from_quat(n.get('rotation',[0,0,0,1])).as_matrix()@np.diag(n.get('scale',[1,1,1]));m[:3,3]=n.get('translation',[0,0,0]);return m
def worlds(g):
 parents={c:i for i,n in enumerate(g['nodes']) for c in n.get('children',[])};world={}
 def mat(i):
  if i not in world:world[i]=(mat(parents[i]) if i in parents else np.eye(4))@trs(g['nodes'][i])
  return world[i]
 for i in range(len(g['nodes'])):mat(i)
 return world,parents
def main():
 path=OUT/'luceras_rigged.glb';g,buf=read_glb(path);world,parents=worlds(g)
 assert not any(n.get('name','').startswith('scale_compensation_') for n in g['nodes']),'Regenerate the original Blender GLB before compensation.'
 samples=json.loads((OUT/'evaluated_deformation_matrices.json').read_text());C=np.array([[1,0,0,0],[0,0,1,0],[0,-1,0,0],[0,0,0,1]],float)
 joints=set(j for s in g['skins'] for j in s['joints']);frames=sorted(map(int,samples));desired={}
 for f in frames:
  desired[f]={i:C@np.array(samples[str(f)][g['nodes'][i]['name']])@C.T@world[i] for i in joints}
 local={i:np.array([np.linalg.inv(desired[f].get(parents.get(i),world.get(parents.get(i),np.eye(4))))@desired[f][i] for f in frames]) for i in joints}
 anim=g['animations'][0];anim['channels']=[ch for ch in anim['channels'] if ch['target']['node'] not in joints]
 def accessor(values,kind,limits=False):
  a=np.asarray(values,dtype='<f4');offset=(len(buf)+3)//4*4;buf.extend(b'\0'*(offset-len(buf)));data=a.tobytes();buf.extend(data)
  vi=len(g['bufferViews']);g['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(data)})
  item={'bufferView':vi,'componentType':5126,'count':len(a),'type':kind}
  if limits:item.update(min=[float(a.min())],max=[float(a.max())])
  ai=len(g['accessors']);g['accessors'].append(item);return ai
 times=accessor(np.array(frames)/30,'SCALAR',True)
 def track(node,prop,values):
  values=np.array(values)
  if prop=='rotation':
   for k in range(1,len(values)):
    if np.dot(values[k-1],values[k])<0:values[k]*=-1
  output=accessor(values,'VEC4' if prop=='rotation' else 'VEC3');si=len(anim['samplers']);anim['samplers'].append({'input':times,'output':output,'interpolation':'LINEAR'});anim['channels'].append({'sampler':si,'target':{'node':node,'path':prop}})
 helpers=[];errors={}
 for i,ms in local.items():
  scales=np.linalg.norm(ms[:,:3,:3],axis=1);rot=ms[:,:3,:3]/scales[:,None,:]
  shear=float(np.max(abs(np.transpose(rot,(0,2,1))@rot-np.eye(3))))
  if shear<2e-6:
   qs=Rotation.from_matrix(rot).as_quat();track(i,'translation',ms[:,:3,3]);track(i,'rotation',qs);track(i,'scale',scales)
   recon=Rotation.from_quat(qs).as_matrix()*scales[:,None,:];errors[g['nodes'][i]['name']]=float(np.max(abs(recon-ms[:,:3,:3])))
  else:
   helper=len(g['nodes']);name='scale_compensation_'+g['nodes'][i]['name'];g['nodes'].append({'name':name,'children':[i],'extras':{'purpose':'Evaluated scale inheritance compensation. Not a skin joint.'}})
   if i in parents:
    children=g['nodes'][parents[i]]['children'];children[children.index(i)]=helper
   else:
    for scene in g['scenes']:
     if i in scene['nodes']:scene['nodes'][scene['nodes'].index(i)]=helper
   # Align factors to the most anisotropic sample to avoid axis swaps.
   sv=[np.linalg.svd(m[:3,:3]) for m in ms];ref=sv[int(np.argmax([max(s)-min(s) for u,s,v in sv]))][0]
   us=[];ss=[];vs=[];err=[]
   for m,(u,s,vt) in zip(ms,sv):
    best=None
    for perm in itertools.permutations(range(3)):
     up=u[:,perm];sp=s[list(perm)];vp=vt[list(perm),:]
     for signs in itertools.product((-1,1),repeat=3):
      uu=up*np.array(signs)[None,:];vv=vp*np.array(signs)[:,None]
      if np.linalg.det(uu)<0 or np.linalg.det(vv)<0:continue
      score=np.linalg.norm(uu-ref)
      if best is None or score<best[0]:best=(score,uu,sp,vv)
    _,u,s,vt=best
    if max(s)-min(s)<5e-7:
     u=ref.copy()
     if np.linalg.det(u)<0:u[:,0]*=-1
     s=np.full(3,np.mean(s));vt=Rotation.from_matrix(u.T@m[:3,:3]/s[0]).as_matrix()
    us.append(Rotation.from_matrix(u).as_quat());ss.append(s);vs.append(Rotation.from_matrix(vt).as_quat());err.append(float(np.max(abs(u@np.diag(s)@vt-m[:3,:3]))))
   track(helper,'translation',ms[:,:3,3]);track(helper,'rotation',us);track(helper,'scale',ss)
   track(i,'translation',np.zeros((len(ms),3)));track(i,'rotation',vs);track(i,'scale',np.ones((len(ms),3)))
   helpers.append({'name':name,'compensated_bone':g['nodes'][i]['name'],'skin_joint':False,'max_shear':shear});errors[g['nodes'][i]['name']]=max(err)
 g['buffers'][0]['byteLength']=len(buf);jb=json.dumps(g,separators=(',',':')).encode();jb+=b' '*((-len(jb))%4);buf.extend(b'\0'*((-len(buf))%4))
 output=struct.pack('<4sII',b'glTF',2,28+len(jb)+len(buf))+struct.pack('<I4s',len(jb),b'JSON')+jb+struct.pack('<I4s',len(buf),b'BIN\0')+buf
 path.write_bytes(output)
 (OUT/'scale_compensation.json').write_text(json.dumps({'method':__doc__,'frames':len(frames),'skin_joints':len(joints),'helper_nodes':helpers,'local_matrix_reconstruction_errors':errors,'max_error':max(errors.values()),'glb_sha256':hashlib.sha256(output).hexdigest()},indent=2))
 print('Compensated',len(helpers),'non-joint helpers; maximum matrix error',max(errors.values()))
if __name__=='__main__':main()
