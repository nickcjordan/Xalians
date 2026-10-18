"""B-a87k scoped repair and evidence, preserving frozen geometry."""
import bpy,sys,json,numpy as np
from pathlib import Path
from mathutils.kdtree import KDTree
sys.path.insert(0,str(Path(__file__).parent))
import pass2 as p
r=p.r
BASE=p.OUT;p.OUT=BASE.parent/'pass3';r.OUT=p.OUT
p.write=lambda n,d: (p.OUT/n).write_text(json.dumps(d,indent=2,default=lambda x:x.item() if isinstance(x,np.generic) else str(x)))

def parts(o):
 adj=[[] for _ in o.data.vertices]
 for e in o.data.edges:
  i,j=e.vertices;adj[i].append(j);adj[j].append(i)
 left=set(range(len(adj)));result=[]
 while left:
  todo=[left.pop()];part=[]
  while todo:
   i=todo.pop();part.append(i)
   for j in adj[i]:
    if j in left:left.remove(j);todo.append(j)
  result.append(np.array(part))
 return sorted(result,key=len,reverse=True)

def swapnames(names):
 out=[]
 for n in names:
  q=n.replace('_fl_','_fr_').replace('_hl_','_hr_') if ('_fl_' in n or '_hl_' in n) else n.replace('_fr_','_fl_').replace('_hr_','_hl_') if ('_fr_' in n or '_hr_' in n) else n.replace('_l','_r') if '_l' in n else n.replace('_r','_l') if '_r' in n else n
  out.append(names.index(q) if q in names else names.index(n))
 return out

def symmetry(o,names,apply=False):
 xyz=r.coords(o);a=r.weights(o,names);orig=a.copy();kd=KDTree(len(a))
 for i,v in enumerate(xyz):kd.insert(v,i)
 kd.balance();swap=swapnames(names);matched=[];outliers=[]
 for i in np.flatnonzero(xyz[:,0]>.00001):
  q=xyz[i].copy();q[0]*=-1;_,j,d=kd.find(q)
  if d>=.001:continue
  back=xyz[j].copy();back[0]*=-1;_,ii,dd=kd.find(back)
  err=float(abs(orig[i]-orig[j,swap]).max());matched.append((i,j,d,err,ii==i))
  if err>.05:outliers.append({'i':int(i),'j':int(j),'distance_m':d,'difference':err,'point':xyz[i].tolist(),'mutual':ii==i})
  # Only exact bilateral counterparts are changed. Near neighbors are evidence,
  # not sufficient proof of matching topology on this approved sculpt.
  if apply and ii==i and d<.00001:
   w=(orig[i]+orig[j,swap])*.5
   if o.get('body_kind')=='game':
    w[np.argsort(w)[:-4]]=0;w[w<.00011]=0;w/=w.sum()
   a[i]=w;a[j]=w[swap]
 if apply:r.setweights(o,a,names,4 if o.get('body_kind')=='game' else None)
 return {'pairs_1mm':len(matched),'max_error_1mm':max((v[3] for v in matched),default=0),'exact_mutual_pairs':sum(v[2]<.00001 and v[4] for v in matched),'changed_vertices':int((abs(a-orig).max(axis=1)>1e-7).sum()),'outliers':sorted(outliers,key=lambda x:-x['difference'])}

def rigid(o,names):
 a=r.weights(o,names);xyz=r.coords(o);result=[]
 for ix in parts(o)[1:] if o.name=='game_body_horns_claws' else parts(o):
  mean=a[ix].mean(axis=0);bone=int(mean.argmax());a[ix]=0;a[ix,bone]=1
  result.append({'vertices':len(ix),'center':xyz[ix].mean(axis=0).tolist(),'bone':names[bone],'weight':1.0})
 r.setweights(o,a,names,4);return result

def main():
 mode=sys.argv[-1]
 if mode in ('trial','trial2','inspect'):
  rig=p.openfile(BASE/'rig.blend');names=[b.name for b in rig.data.bones];data={}
  for kind in ('sculpt','game'):
   for o in r.meshes(kind):
    if o.name=='luceras_blockout' or kind=='game':data[o.name]=symmetry(o,names,False)
  p.write('symmetry_before.json',data)
  o=bpy.data.objects['game_body_horns_claws'];a=r.weights(o,names);xyz=r.coords(o)
  p.write('game_components_before.json',[{'vertices':len(ix),'center':xyz[ix].mean(axis=0).tolist(),'weights':{names[j]:float(v) for j,v in enumerate(a[ix].mean(axis=0)) if v>.00001}} for ix in parts(o)])
  if mode=='inspect':return
  mask=np.zeros(len(a))
  for s in ('l','r'):
   c=np.array(rig.matrix_world@rig.data.bones['leg_h'+s+'_01'].head_local);mask=np.maximum(mask,p.smooth((.21-np.linalg.norm(xyz-c,axis=1))/.10))
  mask*=p.smooth((xyz[:,2]-.29)/.07)*p.smooth((.38-xyz[:,1])/.06)
  bodymask=np.zeros(len(a));bodymask[parts(o)[0]]=1;mask*=bodymask
  edges=np.array([e.vertices[:] for e in o.data.edges]);ii=np.r_[edges[:,0],edges[:,1]];jj=np.r_[edges[:,1],edges[:,0]];degree=np.bincount(ii,minlength=len(a)).clip(1);support=a>0
  for _ in range(30):
   avg=np.column_stack([np.bincount(ii,weights=a[jj,c],minlength=len(a)) for c in range(len(names))])/degree[:,None]
   avg*=support;avg/=np.maximum(avg.sum(axis=1)[:,None],1e-30);a+=(avg-a)*(.35*mask[:,None])
  a[a<.00011]=0;r.setweights(o,a,names,4)
  p.write('rigid_binding.json',{obj.name:rigid(obj,names) for obj in r.meshes('game')})
  p.write('symmetry_repair.json',{obj.name:symmetry(obj,names,mode=='trial') for k in ('sculpt','game') for obj in r.meshes(k) if obj.name=='luceras_blockout' or k=='game'})
  r.check_geometry();rig['build_id']='B-a87k';bpy.context.scene['rig_build_id']='B-a87k';bpy.ops.wm.save_as_mainfile(filepath=str(p.OUT/('trial1.blend' if mode=='trial' else 'trial2.blend')))
  p.detail(rig,'iter1' if mode=='trial' else 'iter2',regions=('hip','rump'))
 elif mode=='final':
  import pass2_export,pass2_additional_checks
  pass2_export.main();pass2_additional_checks.main()
  rig=p.openfile(p.OUT/'rig.blend');r.renders(rig,'final',True);p.detail(rig,'after')
 elif mode=='render':
  rig=p.openfile(p.OUT/'rig.blend');r.renders(rig,'final',True);p.detail(rig,'after')
if __name__=='__main__':main()


