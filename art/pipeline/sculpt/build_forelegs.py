"""B-t5qe forelegs: coordinate-only numpy brushes on the base reconstruction."""
import sys,json,time
from pathlib import Path
HERE=Path(__file__).resolve().parent
if '--compose' in sys.argv:
 from PIL import Image,ImageDraw,ImageFont
 O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-forelegs/pass1');font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',23)
 def comp(a,b,out,la,lb):
  a=Image.open(a).convert('RGB');b=Image.open(b).convert('RGB');b=b.resize((round(b.width*a.height/b.height),a.height));im=Image.new('RGB',(a.width+b.width,a.height+48),(25,27,30));im.paste(a,(0,48));im.paste(b,(a.width,48));d=ImageDraw.Draw(im);d.text((12,10),la,font=font,fill='white');d.text((a.width+12,10),lb,font=font,fill='white');im.save(out)
 for p in O.glob('iter*_foreleg_*.png'):
  tag,view=p.stem.split('_foreleg_');comp(p,O/f'clay_{view}_crop.png',O/f'{tag}_composite_{view}_vs_clay.png',tag+' | '+view,'Shaved clay authority')
 for view in ['side','front','three_quarter']:
  p=O/f'foreleg_{view}.png'
  if p.exists():comp(p,O/f'clay_{view}_crop.png',O/f'composite_{view}_vs_clay.png','B-t5qe | '+view,'Shaved clay authority')
 if (O/'full_side_left.png').exists():comp(O/'full_side_left.png',O/'inputs/furred_side.png',O/'composite_full_side_vs_furred.png','B-t5qe | full side','Furred placement reference')
 imgs=[O/f'iter{i}_foreleg_side.png' for i in [0,2,5]]
 captions=['Base reconstruction','Taper and tendon planes','Focused elbow and carpus'];im=Image.new('RGB',(1536,565),(25,27,30));d=ImageDraw.Draw(im)
 for i,p in enumerate(imgs):
  im.paste(Image.open(p).resize((512,512)),(i*512,53));d.text((i*512+10,3),p.stem.replace('_foreleg_side',''),font=font,fill='white');d.text((i*512+10,28),captions[i],font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18),fill='white')
 im.save(O/'progress.png');sys.exit(0)
import bpy,bmesh,numpy as np
from mathutils import Vector,kdtree
sys.path[:0]=[str(HERE),str(HERE.parent/'roster')]
import sculptkit as sk,lookdev,forecam
T0=time.time();OUT=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-forelegs/pass1')
args=sys.argv[sys.argv.index('--')+1:];IT=int(args[args.index('--iteration')+1]);FINAL='--final' in args;TAG=f'iter{IT}'
body=bpy.data.objects['luceras_blockout'];P=sk.co(body);names=[g.name for g in body.vertex_groups];W=np.zeros((len(P),len(names)))
for v in body.data.vertices:
 for g in v.groups:W[v.index,g.group]=g.weight
fore=W[:,[i for i,n in enumerate(names) if n.startswith('leg_f')]].sum(1)
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
creature=[o for o in bpy.data.objects if o.type=='MESH' and not o.name.startswith('lookdev_')]
materials={o.name:list(o.data.materials) for o in creature};smooth={o.name:[f.use_smooth for f in o.data.polygons] for o in creature}
def ss(t):
 t=np.clip(t,0,1);return t*t*(3-2*t)
z=P[:,2];allowed=(fore>.5)&(z>.065)&(z<.3876)&(P[:,1]<-.02)&(abs(P[:,0])>.002)
weight=allowed*ss((z-.065)/.008)*ss((.3876-z)/.055)
# Shoulder attachment is restricted to the lateral upper arm, blending to untouched torso.
upper=ss((z-.235)/.045)
weight*=1-upper+upper*ss((abs(P[:,0])-.008)/.025)*ss((fore-.5)/.3)
if IT:
 sk.taubin(body,24,weight)
 S=sk.co(body);Q=S.copy();levels=np.linspace(.065,.31,99)
 # Measure the existing reconstructed cross-sections, then brush their horizontal envelope.
 for sign in [1,-1]:
  ids=np.where(allowed&(P[:,0]*sign>0))[0];v=S[ids];zz=v[:,2]
  centers=[];half=[]
  for h in levels:
   slab=(abs(S[:,2]-h)<.003)&(S[:,0]*sign>0)&(fore>.5)&(S[:,1]<-.02)
   vv=S[slab,:2].copy();vv[:,0]*=sign
   lo=np.min(vv,axis=0);hi=np.max(vv,axis=0);centers.append((lo+hi)/2);half.append((hi-lo)/2)
  centers=np.array(centers);half=np.array(half)
  if IT>=2:
   kernel=np.exp(-(np.arange(-7,8)/4)**2);kernel/=kernel.sum()
   for arr in [centers,half]:
    for k in range(2):arr[:,k]=np.convolve(np.pad(arr[:,k],(7,7),mode="edge"),kernel,mode="valid")
  oldc=np.column_stack([np.interp(zz,levels,centers[:,k]) for k in range(2)])
  oldh=np.column_stack([np.interp(zz,levels,half[:,k]) for k in range(2)])
  # Horizontal widths from side/front clay, rump height 0.566976 m.
  stations=[.065,.0684,.085,.115,.1653,.220,.2622,.285,.31]
  dx=[.036,.038,.039,.030,.036,.047,.058,.061,.080]
  dy=[.034,.037,.038,.031,.040,.052,.061,.080,.115]
  if IT==1:dx=np.array(dx)*1.05;dy=np.array(dy)*1.08
  targeth=np.column_stack([np.interp(zz,stations,dx),np.interp(zz,stations,dy)])/2
  cx=np.interp(zz,[.065,.0684,.2622,.31],[.026,.0253,.0438,.047])
  cy=np.interp(zz,[.065,.0684,.1653,.2622,.31],[-.105,-.1027,-.0845,-.074,-.103])
  centered=v[:,:2].copy();centered[:,0]*=sign;centered=(centered-oldc)/np.maximum(oldh,.001)
  target=np.column_stack([cx,cy])+centered*targeth;target[:,0]*=sign
  w=weight[ids]*ss((.325-zz)/.045)
  Q[ids,:2]=v[:,:2]+w[:,None]*(target-v[:,:2])
 sk.set_co(body,Q)
 if IT>=2:
  # Longitudinal tendon relief and rear joint landmarks, mirrored in local X.
  Q=sk.co(body);zz=Q[:,2];cx=np.interp(zz,[.0684,.2622],[.0253,.0438]);cy=np.interp(zz,[.0684,.2622],[-.1027,-.074]);x=abs(Q[:,0])-cx;y=Q[:,1]-cy
  elbow=np.exp(-((zz-.264)/.013)**2)*ss((y+.001)/.022)*np.exp(-(x/.024)**2)*weight
  Q[:,1]+=.0055*elbow
  wrist=np.exp(-((zz-.083)/.006)**2)*ss((y+.002)/.015)*np.exp(-(x/.015)**2)*weight
  Q[:,1]+=.0045*wrist
  sk.set_co(body,Q)
  for sign in [1,-1]:
   mask=weight*(P[:,0]*sign>0)
   # Lateral borders reveal the paired front and rear tendon planes at 1024 px.
   for back in [False,True]:
    pts=[]
    for h in np.linspace(.10,.235,9):
     q=sk.co(body);sel=(abs(q[:,2]-h)<.003)&(q[:,0]*sign>0)&allowed
     vv=q[sel];c=np.mean(vv,axis=0);ry=(vv[:,1].max()-vv[:,1].min())/2;rx=(abs(vv[:,0]).max()-abs(vv[:,0]).min())/2
     pts.append([sign*(abs(c[0])+.72*rx),c[1]+(.68 if back else -.68)*ry,h])
    sk.ridge(body,pts,.0026 if back else .0028,.0045,mask,taper=[0,.5,1,1,1,1,1,.5,0])
    groove=np.array(pts);groove[:,0]-=sign*.003
    sk.groove(body,groove,.0007,.0022,mask)
 if IT>=4:
  q=sk.co(body);zz=q[:,2];cx=np.interp(zz,[.0684,.2622],[.0253,.0438]);cy=np.interp(zz,[.0684,.2622],[-.1027,-.074])
  lateral=ss((abs(q[:,0])-cx)/.014)
  knob=.0018*np.exp(-((zz-.085)/.010)**2-((q[:,1]-cy)/.022)**2)*lateral*weight
  q[:,0]+=np.sign(q[:,0])*knob;sk.set_co(body,q)
  tree=sk.bvh(body)
  for sign in [1,-1]:
   pts=[]
   for y,h in [(-.078,.353),(-.070,.332),(-.060,.310),(-.052,.288)]:
    hit=tree.ray_cast(Vector((sign*.22,y,h)),Vector((-sign,0,0)))
    if hit[0] is not None:pts.append(list(hit[0]))
   if len(pts)>1:sk.ridge(body,pts,-.0015,.006,weight*(P[:,0]*sign>0),taper=[0,.8,1,0])
 Q=sk.co(body)
 if IT>=3:
  # Transfer the left surface to the existing right vertices. No topology edits.
  from mathutils.bvhtree import BVHTree
  faces=[tuple(f.vertices) for f in body.data.polygons if all(Q[i,0]>0 for i in f.vertices)]
  tree=BVHTree.FromPolygons([Vector(v) for v in Q],faces,all_triangles=False)
  for i in np.where(allowed&(P[:,0]<0))[0]:
   q=Q[i]*np.array([-1,1,1]);hit=tree.find_nearest(Vector(q))
   if hit[0] is not None:
    w=weight[i]
    Q[i]+=w*(np.array(hit[0])*np.array([-1,1,1])-Q[i])
 Q[~allowed]=P[~allowed];sk.set_co(body,Q)
Q=sk.co(body);move=np.any(P!=Q,axis=1)
np.save(OUT/f'{TAG}_co.npy',Q);np.savez(OUT/f'{TAG}_audit.npz',base=P,new=Q,allowed=allowed,weight=weight)
scene=lookdev.setup_scene(engine='CYCLES');scene.render.threads_mode='FIXED';scene.render.threads=8
for o in creature:lookdev.apply_clay(o)
for n,c in forecam.frame_forelegs().items():
 lookdev.render(c,str(OUT/f'{TAG}_{n}.png'),size=1024)
 if FINAL:
  import shutil
  shutil.copyfile(OUT/f'{TAG}_{n}.png',OUT/f'{n}.png')
if FINAL:
 np.savez(OUT/'forelegs_delta.npz',base_co=P[move],new_co=Q[move])
 meta={'build_id':'B-t5qe','base_hash':'2bed33840d829d8a2c7cb57c0ccae5c2ee7a88dcdef7793ea3ee3fe22ff1acd1','body_object':body.name,'count':int(move.sum()),'coordinate_space':'body local meters','region':'foreleg weights > 0.5, 0.065 < z < 0.3876, y < -0.02, abs(x) > 0.002','shoulder_blend_band':'z 0.3326 to 0.3876, entirely below the joint; lateral fade abs(x) 0.008 to 0.033','topology':'unchanged'}
 (OUT/'meta.json').write_text(json.dumps(meta,indent=2))
 # Actual horizontal mesh sections, using edge-plane intersections rather than vertex bins.
 E=sk.edges(body);rump=float(P[(P[:,1]>.1)&(P[:,1]<.30),2].max());sections=[]
 samples=[('elbow',.2622,63,82),('mid_forearm',.1653,42,51),('wrist_envelope',.085,45,46),('pastern_above_cutoff',.0667,40,39)]
 for label,h,front_px,side_px in samples:
  valid=(Q[:,0]>0)&(fore>.5)&(Q[:,1]<-.02)
  es=E[valid[E].all(1)&((Q[E[:,0],2]-h)*(Q[E[:,1],2]-h)<0)]
  v=Q[es[:,0]]+(Q[es[:,1]]-Q[es[:,0]])*((h-Q[es[:,0],2])/(Q[es[:,1],2]-Q[es[:,0],2]))[:,None]
  widths=np.ptp(v[:,:2],axis=0)
  sections.append({'name':label,'z_m':h,'front_width_m':float(widths[0]),'side_width_m':float(widths[1]),'front_fraction_of_rump':float(widths[0]/rump),'side_fraction_of_rump':float(widths[1]/rump),'clay_front_px':front_px,'clay_side_px':side_px,'clay_front_fraction':front_px/664,'clay_side_fraction':side_px/680,'front_relative_error':float(abs(widths[0]/rump/(front_px/664)-1)),'side_relative_error':float(abs(widths[1]/rump/(side_px/680)-1))})
 from mathutils.bvhtree import BVHTree
 trees={}
 for sign in [1,-1]:
  fs=[tuple(f.vertices) for f in body.data.polygons if all(Q[i,0]*sign>0 for i in f.vertices)]
  trees[sign]=BVHTree.FromPolygons([Vector(v) for v in Q],fs)
 asym=[];core=[]
 for i in np.where(allowed)[0]:
  hit=trees[-1 if Q[i,0]>0 else 1].find_nearest(Vector(Q[i]*[-1,1,1]))
  if hit[0] is not None:
   asym.append(hit[3])
   if weight[i]>.999:core.append(hit[3])
 lengths={n:float(rig.data.bones[n].length) for n in ['leg_fl_01','leg_fl_02','leg_fl_03','leg_fr_01','leg_fr_02','leg_fr_03']}
 elbow=(Q[:,0]>0)&(abs(Q[:,2]-.2622)<.006)&allowed
 dis=np.linalg.norm(Q-P,axis=1);outside=dis[~allowed]
 m={'build_id':'B-t5qe','lengths_m':lengths,'length_change_fraction':0.0,'length_definition':'Unchanged joint-to-joint lengths. leg_f*_03 is the full pastern and paw bone. Only its proximal 3.4 mm vertical interval is in scope.','pastern_in_scope_centerline_length_m':float(rig.data.bones['leg_fl_03'].length*(.0684-.065)/(.0684-.01)),'rump_height_m':rump,'widths':sections,'clay_rump_height_px':{'side':680,'front':664},'clay_pixel_sections':{'side':{'elbow':[356,438,720],'mid_forearm':[364,415,815],'wrist':[356,402,910],'pastern':[356,395,930]},'front':{'elbow':[622,685,690],'mid_forearm':[627,669,800],'wrist':[615,660,910],'pastern':[617,657,930]}},'measurement_uncertainty_px':2,'measurement_note':'Manual horizontal silhouette spans, approximate photographic references. Wrist width is measured at the visible carpal envelope z=.085; fixed rig wrist is z=.0684. Pastern measurement is restricted to z=.0667, above the untouched cutoff.','elbow_point_offset_behind_joint_m':float(Q[elbow,1].max()+.0663),'stance_width_at_wrist_joints_m':.0506,'displacement_outside_forelegs_and_declared_band':{'max_m':float(outside.max()),'mean_m':float(outside.mean())},'declared_band':meta['shoulder_blend_band'],'vertices_moved':int(move.sum()),'body_vertex_count':len(P),'below_65mm_max_displacement_m':float(dis[P[:,2]<=.065].max()),'above_shoulder_max_displacement_m':float(dis[P[:,2]>=.3876].max()),'left_right_asymmetry':{'method':'Bidirectional mirrored vertex to opposite triangle surface distance; unequal original triangulation retained.','max_m':float(max(asym)),'mean_m':float(np.mean(asym)),'core_max_m':float(max(core)),'core_mean_m':float(np.mean(core)),'exact_mirror':False},'topology_unchanged':True,'joint_displacement_max_m':0.0}
 (OUT/'measurements.json').write_text(json.dumps(m,indent=2))

 full=lookdev.frame_cameras(creature)
 for n,c in full.items():lookdev.render(c,str(OUT/f'full_{n}.png'),size=1024)
 lookdev.render(full['side_left'],str(OUT/'sprite_side_192.png'),size=192)
 part=bpy.data.objects.new('luceras_forelegs_part',body.data.copy());bpy.context.scene.collection.objects.link(part)
 bm=bmesh.new();bm.from_mesh(part.data);bm.verts.ensure_lookup_table();bmesh.ops.delete(bm,geom=[v for v in bm.verts if not allowed[v.index]],context='VERTS');bm.to_mesh(part.data);bm.free()
 bpy.ops.object.select_all(action='DESELECT');part.select_set(True);bpy.context.view_layer.objects.active=part
 bpy.ops.export_scene.gltf(filepath=str(OUT/'forelegs_part.glb'),export_format='GLB',use_selection=True,export_skins=False,export_animations=False)
 bpy.data.objects.remove(part,do_unlink=True)
 for o in creature:
  o.data.materials.clear()
  for m in materials[o.name]:o.data.materials.append(m)
  for f,s in zip(o.data.polygons,smooth[o.name]):f.use_smooth=s
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'forelegs.blend'),compress=True)
(OUT/f'{TAG}_timing.json').write_text(json.dumps({'blender_seconds':time.time()-T0}))
