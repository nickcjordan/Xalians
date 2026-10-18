"""Author angle-driven sculpt elbow and hip correctives in posed space, inverse-skinned to keys."""
import bpy,sys,json,numpy as np
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
import pass2 as p
r=p.r
def smooth_surface(q,edges,mask,steps=200):
 i=np.concatenate((edges[:,0],edges[:,1]));j=np.concatenate((edges[:,1],edges[:,0]));degree=np.bincount(i,minlength=len(q)).clip(1)
 x=q.copy()
 for k in range(steps):
  for f in (.60,):
   avg=np.column_stack([np.bincount(i,weights=x[j,c],minlength=len(q)) for c in range(3)])/degree[:,None]
   x+=(avg-x)*(f*mask[:,None])
 return x
def main():
 source=sys.argv[-1] if sys.argv[-1].endswith('.blend') else 'weights8.blend'
 rig=p.openfile(p.OUT/source);o=bpy.data.objects['luceras_blockout'];names=[b.name for b in rig.data.bones];a=r.weights(o,names);base=r.coords(o);edges=np.array([e.vertices[:] for e in o.data.edges]);raw=np.array([v.co[:] for v in o.data.vertices]);o.shape_key_add(name='Basis')
 generated=[];data={};angles={}
 for pose in ('crouch','leap'):
  p.showpose(rig,pose);q=r.coords(o,True)
  mats=np.array([np.array(rig.matrix_world@rig.pose.bones[n].matrix@rig.data.bones[n].matrix_local.inverted()@rig.matrix_world.inverted()@o.matrix_world)[:3,:3] for n in names]);skin=np.einsum('nb,bij->nij',a,mats)
  for side in ('l','r'):
   bone='leg_f'+side+'_02';center=np.array(rig.matrix_world@rig.data.bones[bone].head_local)
   mask=p.smooth((.095-np.linalg.norm(base-center,axis=1))/.05)
   fore=a[:,names.index('leg_f'+side+'_01')]+a[:,names.index(bone)];mask*=p.smooth((fore-.35)/.45)
   smooth=smooth_surface(q,edges,mask,steps=180);delta=(smooth-q)
   delta[:,0]+=(1 if side=='l' else -1)*.0035*mask
   length=np.linalg.norm(delta,axis=1);delta*=np.minimum(1,.018/np.maximum(length,1e-12))[:,None];length=np.linalg.norm(delta,axis=1)
   ids=np.flatnonzero(mask>1e-6);back=np.zeros_like(delta);back[ids]=np.linalg.solve(skin[ids],delta[ids,:,None])[:,:,0]
   key=o.shape_key_add(name=f'PSD_elbow_f{side}_{pose}');key.data.foreach_set('co',(raw+back).ravel());key.value=0
   local=rig.convert_space(pose_bone=rig.pose.bones[bone],matrix=rig.pose.bones[bone].matrix,from_space='POSE',to_space='LOCAL');angle=abs(local.to_euler('XYZ').x)
   data[key.name]={'pose':pose,'bone':bone,'angle_rad':angle,'affected_vertices':int((length>1e-7).sum()),'max_posed_delta_m':float(length.max()),'max_key_delta_m':float(np.linalg.norm(back,axis=1).max())};angles[(side,pose)]=angle;generated.append((key,side,pose,bone))
 for key,side,pose,bone in generated:
  peak=angles[(side,pose)];other=angles[(side,'leap' if pose=='crouch' else 'crouch')]
  if peak<other:expression=f'max(0,min(1,abs(a)/{peak:.12f},({other:.12f}-abs(a))/{other-peak:.12f}))'
  else:expression=f'max(0,min(1,(abs(a)-{other:.12f})/{peak-other:.12f}))'
  fc=key.driver_add('value');d=fc.driver;d.type='SCRIPTED';v=d.variables.new();v.name='a';v.type='TRANSFORMS';t=v.targets[0];t.id=rig;t.bone_target=bone;t.transform_type='ROT_X';t.transform_space='LOCAL_SPACE';t.rotation_mode='XYZ';d.expression=expression;data[key.name]['driver']=expression
 # Localized extension corrective at each hip removes residual leap puckering.
 p.showpose(rig,'leap');q=r.coords(o,True)
 mats=np.array([np.array(rig.matrix_world@rig.pose.bones[n].matrix@rig.data.bones[n].matrix_local.inverted()@rig.matrix_world.inverted()@o.matrix_world)[:3,:3] for n in names]);skin=np.einsum('nb,bij->nij',a,mats)
 for side,sign in [('l',1),('r',-1)]:
  bone='leg_h'+side+'_01';center=np.array(rig.matrix_world@rig.data.bones[bone].head_local)
  mask=p.smooth((.17-np.linalg.norm(base-center,axis=1))/.09)*p.smooth((sign*base[:,0]-.025)/.04)
  mask*=p.smooth((base[:,2]-.29)/.055)
  target=smooth_surface(q,edges,mask,steps=80);delta=target-q;delta[:,0]+=sign*.0025*mask
  length=np.linalg.norm(delta,axis=1);delta*=np.minimum(1,.012/np.maximum(length,1e-12))[:,None];length=np.linalg.norm(delta,axis=1)
  ids=np.flatnonzero(mask>1e-6);back=np.zeros_like(delta);back[ids]=np.linalg.solve(skin[ids],delta[ids,:,None])[:,:,0]
  key=o.shape_key_add(name=f'PSD_hip_{side}_extension');key.data.foreach_set('co',(raw+back).ravel());key.value=0
  local=rig.convert_space(pose_bone=rig.pose.bones[bone],matrix=rig.pose.bones[bone].matrix,from_space='POSE',to_space='LOCAL');angle=local.to_euler('XYZ').x
  fc=key.driver_add('value');d=fc.driver;d.type='SCRIPTED';v=d.variables.new();v.name='a';v.type='TRANSFORMS';t=v.targets[0];t.id=rig;t.bone_target=bone;t.transform_type='ROT_X';t.transform_space='LOCAL_SPACE';t.rotation_mode='XYZ';d.expression=f'max(0,min(1,a/{angle:.12f}))'
  data[key.name]={'pose':'leap','bone':bone,'angle_rad':angle,'affected_vertices':int((length>1e-7).sum()),'max_posed_delta_m':float(length.max()),'max_key_delta_m':float(np.linalg.norm(back,axis=1).max()),'driver':d.expression};generated.append((key,side,'leap',bone))
 tests={}
 for pose in r.POSES:
  p.showpose(rig,pose);tests[pose]={key.name:float(key.value) for key,_,_,_ in generated}
 p.write('corrective_keys.json',{'method':__doc__,'keys':data,'evaluated_driver_values':tests})
 rig.animation_data.action=None;r.pose(rig,'rest');r.check_geometry();bpy.ops.wm.save_as_mainfile(filepath=str(p.OUT/'corrected9.blend'));p.detail(rig,'iter9',regions=('elbow','hip','rump'))
if __name__=='__main__':main()
