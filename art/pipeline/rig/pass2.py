"""B-bvrc localized skin repair. Frozen source coordinates and UVs."""
import bpy, sys, json, math, itertools, numpy as np
from pathlib import Path
from mathutils import Vector, Matrix
sys.path.insert(0,str(Path(__file__).parent))
import build_rig as r
import controls
OUT=r.OUT.parent/'pass2'; OLD=r.OUT; r.OUT=OUT
def write(n,d): r.write(n,d)
def openfile(path):
 bpy.ops.wm.open_mainfile(filepath=str(path));rig=bpy.data.objects['luceras_rig']
 rig['controls_enabled']=0.;rig.update_tag();rig.animation_data_create();rig.animation_data.action=None
 for k in ('sculpt','game'):
  for o in r.meshes(k):o.hide_set(False)
 r.pose(rig,'rest');return rig
def smooth(x):
 x=np.clip(x,0,1);return x*x*(3-2*x)
def fit_four(o,a,names,rig,target_override=None):
 xyz=r.coords(o);ph=np.column_stack([xyz,np.ones(len(xyz))]);samples=[]
 for pose in r.POSES:
  r.pose(rig,pose)
  mats=np.array([np.array(rig.matrix_world@rig.pose.bones[n].matrix@rig.data.bones[n].matrix_local.inverted()@rig.matrix_world.inverted()) for n in names])
  samples.append(np.einsum('bij,nj->nbi',mats,ph)[:,:,:3])
 r.pose(rig,'rest');X=np.concatenate(samples,axis=2);target=np.einsum('nb,nbc->nc',a,X) if target_override is None else target_override
 rank=a.copy();rank[:,[i for i,n in enumerate(names) if not rig.data.bones[n].use_deform]]=-1;order=np.argsort(-rank,axis=1)[:,:8];rows=np.arange(len(a))[:,None]
 best=np.zeros_like(a);support=order[:,:4];w=np.take_along_axis(a,support,axis=1);w/=w.sum(axis=1)[:,None];np.put_along_axis(best,support,w,axis=1)
 def cost(weights):
  err=np.einsum('nb,nbc->nc',weights,X)-target
  return np.sum(err*err,axis=1)+1e-8*np.sum((weights-a)**2,axis=1)
 score=cost(best)
 for combo in itertools.combinations(range(8),4):
  ids=order[:,combo];points=X[rows,ids];A=(points[:,:3,:]-points[:,3:4,:]).transpose(0,2,1);y=target-points[:,3,:]
  prior=np.take_along_axis(a,ids,axis=1);prior/=np.maximum(prior.sum(axis=1)[:,None],1e-30)
  G=np.einsum('nci,ncj->nij',A,A)+np.eye(3)[None]*1e-8;rhs=np.einsum('nci,nc->ni',A,y)+prior[:,:3]*1e-8
  u=np.linalg.solve(G,rhs[:,:,None])[:,:,0];ws=np.column_stack([u,1-u.sum(axis=1)]);valid=(ws.min(axis=1)>-1e-7)&np.all((prior>1e-8)|(ws<1e-7),axis=1)
  ws=np.clip(ws,0,1);ws/=np.maximum(ws.sum(axis=1)[:,None],1e-30);candidate=np.zeros_like(a);np.put_along_axis(candidate,ids,ws,axis=1);s=cost(candidate);use=valid&(s<score);best[use]=candidate[use];score[use]=s[use]
 delta=(np.einsum('nb,nbc->nc',best,X)-target).reshape(len(a),8,3);error=np.linalg.norm(delta,axis=2)
 write('four_influence_fit.json',{'method':'Nonnegative fitting of four existing anatomical influences at all eight review poses. Seventy candidate supports per vertex, sum constrained to one. Non-deforming bones and zero-weight unrelated joints are excluded.','target':'Corrected sculpt surface motion' if target_override is not None else 'Dense skin motion','max_target_pose_error_m':float(error.max()),'p99_target_pose_error_m':float(np.quantile(error,.99)),'mean_target_pose_error_m':float(error.mean())})
 return best
def showpose(rig,name):
 rig.animation_data.action=bpy.data.actions['review.poses'];bpy.context.scene.frame_set(1+r.POSES.index(name)*10);bpy.context.view_layer.update()
def detail(rig,prefix,size=512,regions=None):
 r.g.lookdev.setup_scene('CYCLES');bpy.context.scene.cycles.samples=16
 for k in ('sculpt','game'):
  for o in r.meshes(k):r.g.lookdev.apply_clay(o)
 centers={'elbow':('leg_fl_02',(0,0,0),.085,90,0),'hip':('leg_hl_01',(0,0,0),.12,90,0),'rump':('tail_01',(0,0,0),.13,135,25),'cheek':('head_01',(.04,-.035,-.005),.095,65,0),'horn_base':('head_01',(0,-.025,.09),.09,65,10)}
 for pose in ('crouch','leap'):
  showpose(rig,pose)
  for label,(bone,offset,rad,az,el) in centers.items():
   if regions is not None and label not in regions:continue
   pb=rig.pose.bones[bone];delta=pb.matrix.to_3x3()@pb.bone.matrix_local.to_3x3().inverted()@Vector(offset);c=rig.matrix_world@(pb.head+delta)
   cam=r.g.lookdev.place_camera('lookdev_detail',(c-Vector((rad,rad,rad)),c+Vector((rad,rad,rad))),az,el,.04)
   for kind in ('sculpt','game'):r.visible(kind);r.g.lookdev.render(cam,OUT/f'{prefix}_{pose}_{label}_{kind}.png',size=size)
 rig.animation_data.action=None;r.pose(rig,'rest')
def repair_weights(rig):
 names=[b.name for b in rig.data.bones];stats={}
 for o in [bpy.data.objects['luceras_blockout'],bpy.data.objects['game_body_horns_claws']]:
  p=r.coords(o);a=r.weights(o,names);old=a.copy()
  # Continuous two-bone elbow blend replaces noisy inherited influence islands.
  for side,sign in [('l',1),('r',-1)]:
   upper=names.index('leg_f'+side+'_01');lower=names.index('leg_f'+side+'_02')
   fore=a[:,upper]+a[:,lower];mask=smooth((fore-.55)/.3)*smooth((.355-p[:,2])/.045)*smooth((p[:,2]-.14)/.05)
   w=smooth((p[:,2]-.205)/.12);target=np.zeros_like(a);target[:,upper]=w;target[:,lower]=1-w
   a=a*(1-mask[:,None])+target*mask[:,None]
  # Diffuse existing hip weights across surface edges, preserving distal anchors.
  pelvis=names.index('spine_01');mask=np.zeros(len(p))
  for side in ('l','r'):
   center=np.array(rig.matrix_world@rig.data.bones['leg_h'+side+'_01'].head_local)
   mask=np.maximum(mask,smooth((.255-np.linalg.norm(p-center,axis=1))/.12))
  mask*=smooth((p[:,2]-.24)/.075)*smooth((.405-p[:,1])/.07)
  e=np.array([ed.vertices[:] for ed in o.data.edges]);active=np.flatnonzero(mask>0)
  keep=(mask[e[:,0]]>0)|(mask[e[:,1]]>0);e=e[keep];ids=np.unique(e);remap=np.full(len(p),-1,dtype=int);remap[ids]=np.arange(len(ids));e=remap[e]
  ii=np.concatenate([e[:,0],e[:,1]]);jj=np.concatenate([e[:,1],e[:,0]]);degree=np.bincount(ii,minlength=len(ids)).clip(1);w=a[ids].copy();m=mask[ids]
  channels=np.flatnonzero(w.max(axis=0)>0);w=w[:,channels]
  steps=1800 if o.get('body_kind')=='sculpt' else 90
  for step in range(steps):
   avg=np.column_stack([np.bincount(ii,weights=w[jj,c],minlength=len(ids)) for c in range(len(channels))])/degree[:,None]
   w+=(avg-w)*(.7*m[:,None])
  a[np.ix_(ids,channels)]=w
  # Keep a coherent four-bone support on each upper haunch instead of switching
  # between nearly tied opposite-leg weights when the game export is limited.
  for side,sign in [('l',1),('r',-1)]:
   for number in (1,2,3):
    j=names.index(f'leg_h{side}_{number:02}');removed=a[:,j]*mask*(1-smooth((sign*p[:,0]+.01)/.055));a[:,j]-=removed;a[:,pelvis]+=removed
   j=names.index('leg_h'+side+'_02');removed=a[:,j]*mask*smooth((p[:,2]-.31)/.07);a[:,j]-=removed;a[:,names.index('leg_h'+side+'_01')]+=removed
  for name in ('spine_03','spine_04','spine_05'):
   j=names.index(name);removed=a[:,j]*mask;a[:,j]-=removed;a[:,names.index('spine_02')]+=removed
  for number in range(1,7):
   j=names.index(f'tail_{number:02}');removed=a[:,j]*mask*(1-smooth((p[:,1]-.29)/.07));a[:,j]-=removed;a[:,pelvis]+=removed
  # Use the approved ear-shell anatomical frame, not inherited ear spill on skull.
  headmask=smooth((-.08-p[:,1])/.05)*smooth((p[:,2]-.455)/.045)
  target=np.zeros_like(a);target[:,names.index('head_01')]=1
  for side,sign in [('l',1),('r',-1)]:
   up=np.array([sign*.66,.22,.72]);up/=np.linalg.norm(up)
   face=np.array([sign*.68,-.72,.10]);face-=up*(face@up);face/=np.linalg.norm(face);across=np.cross(up,face)
   rel=p-np.array([sign*.041,-.168,.590]);v=rel@up;u=rel@across;depth=rel@(-face)
   blade=smooth((v-.004)/.018)*smooth((.031-abs(u))/.007)*smooth((.026-abs(depth-.004))/.008)
   blade*=((v<.09)&(sign*p[:,0]>.037))
   target[:,names.index('ear_'+side+'_01')]=blade;target[:,names.index('head_01')]-=blade
  a=a*(1-headmask[:,None])+target*headmask[:,None]
  # Do not change rigid accessory islands embedded in the game object.
  if o.get('body_kind')=='game':
   rigid=(old.max(axis=1)>.999999)&(p[:,2]>.65)
   a[rigid]=old[rigid]
   a=fit_four(o,a,names,rig)
   # Blender's glTF exporter drops influences <= 0.0001. Match that threshold
   # in the authoring skin so the runtime remains accurate to one micron.
   a[a<.00011]=0
  a=r.setweights(o,a,names,limit=4 if o.get('body_kind')=='game' else None)
  stats[o.name]={'changed_vertices':int((np.max(abs(a-old),axis=1)>1e-5).sum()),'max_influences':int((a>1e-8).sum(axis=1).max())}
 write('weight_repair.json',stats)
def main():
 mode=sys.argv[-1]
 if mode=='before':
  rig=openfile(OLD/'rig.blend');detail(rig,'before');write('geometry_before.json',{o.name:r.fingerprint(o) for k in ('sculpt','game') for o in r.meshes(k)})
  write('pose_angles.json',{name:{b.name:list(b.rotation_quaternion) for b in rig.pose.bones if b.name.startswith('leg')} for name in []})
 elif mode in ('weights','weights2','weights4','weights6','weights8'):
  tag={'weights':'iter1','weights2':'iter2','weights4':'iter4','weights6':'iter6','weights8':'iter8'}[mode]
  rig=openfile(OLD/'rig.blend');repair_weights(rig);r.check_geometry();bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(mode+'.blend')));detail(rig,tag);r.renders(rig,tag,False)
  if mode=='weights8':
   import pass2_correctives
   pass2_correctives.main()
 elif mode=='render':
  rig=openfile(OUT/'rig.blend');r.renders(rig,'final',True);detail(rig,'after')
if __name__=='__main__':main()
