"""B-e6bc: coordinate-only tail refinement. Always start from the approved base."""
import bpy,bmesh,sys,json,time,argparse
from pathlib import Path
import numpy as np
T0=time.time(); HERE=Path(__file__).resolve().parent
sys.path[:0]=[str(HERE),str(HERE.parent/'roster')]
import sculptkit as sk
import lookdev,tailcam
p=argparse.ArgumentParser();p.add_argument('--iteration',type=int,default=0);p.add_argument('--final',action='store_true');a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
OUT=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-tail/pass1');TAG=f'iter{a.iteration}'
body=bpy.data.objects['luceras_blockout']; P=sk.co(body); Q=P.copy()
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
creature=[o for o in bpy.data.objects if o.type=='MESH' and not o.name.startswith('lookdev_')]
original_materials={o.name:list(o.data.materials) for o in creature}
original_smooth={o.name:[f.use_smooth for f in o.data.polygons] for o in creature}
# Smooth Hermite interpolation through fixed joints, extended into the declared root band.
J=np.array([[0,.282,.526]]+[list(rig.data.bones[f'tail_{i:02d}'].head_local) for i in range(1,7)]+[list(rig.data.bones['tail_06'].tail_local)])
u=np.r_[0,np.cumsum(np.linalg.norm(np.diff(J,axis=0),axis=1))]
d=np.gradient(J,u,axis=0); ss=np.linspace(0,u[-1],1601);C=np.empty((len(ss),3))
for k in range(len(J)-1):
 m=(ss>=u[k])&(ss<=u[k+1]);h=u[k+1]-u[k];t=(ss[m]-u[k])/h
 C[m]=(2*t**3-3*t**2+1)[:,None]*J[k]+(t**3-2*t**2+t)[:,None]*h*d[k]+(-2*t**3+3*t**2)[:,None]*J[k+1]+(t**3-t**2)[:,None]*h*d[k+1]
Cbase=C.copy()
if a.iteration>=3:
 d[-1]=[0,.08,1.05]
 k=len(J)-2;m=ss>=u[k];h=u[k+1]-u[k];t=(ss[m]-u[k])/h
 C[m]=(2*t**3-3*t**2+1)[:,None]*J[k]+(t**3-2*t**2+t)[:,None]*h*d[k]+(-2*t**3+3*t**2)[:,None]*J[k+1]+(t**3-t**2)[:,None]*h*d[k+1]
arc=np.r_[0,np.cumsum(np.linalg.norm(np.diff(C,axis=0),axis=1))];basearc=np.r_[0,np.cumsum(np.linalg.norm(np.diff(Cbase,axis=0),axis=1))];root=np.argmin(abs(ss-u[1])); L=arc[-1]-arc[root]
# Broad spatial gate never includes legs; closest-curve distance tightens it to the tail root.
candidates=np.where((P[:,1]>.282)&(abs(P[:,0])<.055)&(P[:,2]>.245))[0]
idx=np.empty(len(candidates),int)
for start in range(0,len(candidates),500):
 v=P[candidates[start:start+500]];idx[start:start+500]=np.argmin(((v[:,None,:]-Cbase[None,:,:])**2).sum(2),axis=1)
rad=P[candidates]-Cbase[idx];dist=np.linalg.norm(rad,axis=1)
keep=dist<.047;ids=candidates[keep];idx=idx[keep];rad=rad[keep];dist=dist[keep]
s=(arc[idx]-arc[root])/L
rump=float(P[(P[:,1]>.08)&(P[:,1]<.30),2].max())
# Clay measurements: side image, rump crest to ground 680 px; normal diameters 34,22,15,5 px.
fractions=np.array([34,22,15,5])/680
stations=np.array([0,1/3,2/3,.95,1.0]);radii=np.r_[fractions*rump/2,0.00022]
r=np.interp(s,stations,radii)
# Root transition is inside y .282-.335 and within .047 m of the centerline.
w=np.clip((s+.060)/(.140 if a.iteration==1 else .080),0,1);w=w*w*(3-2*w)
if a.iteration>=2:
 fade=np.clip((.047-dist)/.020,0,1);fade=fade*fade*(3-2*fade);w*=fade
if a.iteration==1:r=np.interp(s,stations,np.r_[np.array([.057,.039,.031,.017])*rump/2,.0012])
if a.iteration:
 oriented=rad.copy()
 if a.iteration>=3:
  tb=np.gradient(Cbase,axis=0);tb/=np.linalg.norm(tb,axis=1)[:,None]
  tn=np.gradient(C,axis=0);tn/=np.linalg.norm(tn,axis=1)[:,None]
  nb=np.column_stack((np.zeros(len(tb)),-tb[:,2],tb[:,1]));nn=np.column_stack((np.zeros(len(tn)),-tn[:,2],tn[:,1]))
  oriented=rad[:,0,None]*np.array([1,0,0])+(rad*nb[idx]).sum(1)[:,None]*nn[idx]+(rad*tb[idx]).sum(1)[:,None]*tn[idx]
 target=C[idx]+oriented/np.maximum(dist[:,None],1e-12)*r[:,None]
 Q[ids]=P[ids]+w[:,None]*(target-P[ids]);sk.set_co(body,Q);Q=sk.co(body)
 if a.iteration>=3:
  weights=np.zeros(len(P));weights[ids]=np.exp(-((s+.015)/.070)**2)*fade*np.clip((P[ids,1]-.282)/.014,0,1)
  sk.smooth(body,24,.5,weights);Q=sk.co(body)
move=np.any(Q!=P,axis=1);mask=np.zeros(len(P),bool);mask[ids]=True
np.save(OUT/f'{TAG}_co.npy',Q)
scene=lookdev.setup_scene(engine='CYCLES');scene.render.threads_mode='FIXED';scene.render.threads=8
for o in creature:lookdev.apply_clay(o)
cams=tailcam.frame_tail()
for name,cam in cams.items():lookdev.render(cam,str(OUT/f'{TAG}_{name}.png'),size=1024)
if a.final:
 np.savez(OUT/'tail_delta.npz',base_co=P[move],new_co=Q[move])
 meta={'build_id':'B-e6bc','base_hash':'0fffa66c7806c08ec385251af235505d224c2e8305b09ce7804850d9f0fab507','body_object':body.name,'count':int(move.sum()),'coordinate_space':'body local, meters','topology':'unchanged vertex count, order, edges and faces','root_band':{'y_min':.282,'y_max':.35,'max_abs_x':.055,'max_distance_to_extended_tail_curve':.047},'tail_region':'closest distance < .047 m to fixed joint Hermite curve, y > .282, abs(x) < .055, z > .245; root band ends at y .35'}
 (OUT/'meta.json').write_text(json.dumps(meta,indent=2))
 # Mesh-plane section diameter measured on the actual result near arc stations.
 diam=[]
 for f in stations[:-1]:
  sel=abs(s-f)<.012;v=Q[ids[sel]];ci=C[idx[sel]];rr=np.linalg.norm(v-ci,axis=1)
  diam.append({'fraction_of_length':float(f),'diameter_m':float(np.median(rr)*2),'fraction_of_rump_height':float(np.median(rr)*2/rump),'clay_fraction':float(fractions[len(diam)]),'clay_diameter_px':[34,22,15,5][len(diam)]})
 chest=P[(abs(P[:,0])<.035)&(P[:,2]>.32)&(P[:,2]<.43)&(P[:,1]<.1)];chest_front=float(chest[:,1].min());rump_back=float(J[1,1]);bodylength=rump_back-chest_front
 m={'centerline_length_m':float(L),'base_centerline_length_m':float(basearc[-1]-basearc[root]),'centerline_method':'Hermite curve through unchanged tail joints; last tangent made upright; root tail_01 head to tail_06 tip','length_ratio_to_base':float(L/(basearc[-1]-basearc[root])),'body_chest_to_rump_m':bodylength,'body_landmarks_y':[chest_front,rump_back],'length_ratio_to_body':float(L/bodylength),'rump_height_m':rump,'clay_rump_height_px':680,'clay_measurement_note':'manual normal-to-centerline measurements on clay_side; approximate 2 px uncertainty; rump crest y=344 to ground y=1024','thickness':diam,'lowest_centerline_above_ground_m':float(C[root:,2].min()),'tip_lift_m':float(C[-1,2]-C[root:,2].min()),'displacement_outside_tail_band':{'max_m':float(np.linalg.norm(Q[~mask]-P[~mask],axis=1).max()),'mean_m':float(np.linalg.norm(Q[~mask]-P[~mask],axis=1).mean())},'vertices_moved':int(move.sum()),'body_vertices':len(P),'creature_triangles':sum(sk.tri_count(o) for o in creature),'joint_displacement_max_m':0.0,'topology_changed':False}
 np.savez(OUT/'surface_audit_arrays.npz',base=P,new=Q,edges=sk.edges(body),mask=mask,curve_base=Cbase,curve_new=C,root_index=root)
 (OUT/'measurements.json').write_text(json.dumps(m,indent=2))
 full=lookdev.frame_cameras(creature)
 for name,cam in full.items():lookdev.render(cam,str(OUT/f'full_{name}.png'),size=1024)
 lookdev.render(full['side_left'],str(OUT/'sprite_side_192.png'),size=192)
 tp=bpy.data.objects.new('luceras_tail_part',body.data.copy());bpy.context.scene.collection.objects.link(tp);tp.vertex_groups.clear()
 bm=bmesh.new();bm.from_mesh(tp.data);bm.verts.ensure_lookup_table();bmesh.ops.delete(bm,geom=[v for v in bm.verts if not mask[v.index]],context='VERTS');bm.to_mesh(tp.data);bm.free()
 bpy.ops.object.select_all(action='DESELECT');tp.select_set(True);bpy.context.view_layer.objects.active=tp
 bpy.ops.export_scene.gltf(filepath=str(OUT/'tail_part.glb'),export_format='GLB',use_selection=True,export_skins=False,export_animations=False)
 bpy.data.objects.remove(tp,do_unlink=True)
 for o in creature:
  o.data.materials.clear()
  for material in original_materials[o.name]:o.data.materials.append(material)
  for f,smooth in zip(o.data.polygons,original_smooth[o.name]):f.use_smooth=smooth
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'tail.blend'),compress=True)
(OUT/f'{TAG}_timing.json').write_text(json.dumps({'blender_seconds':time.time()-T0}))
