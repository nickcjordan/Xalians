"""B-vsb3. Uniform paw height variants, source reconstruction surface retained."""
import bpy,bmesh,numpy as np,sys,json,time,runpy
from pathlib import Path
from mathutils import Vector
T=time.time()
HERE=Path('/mnt/c/dev/src/xalians-creature-pipeline/art/pipeline/sculpt')
OUT=Path('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-paws/pass4')
sys.path[:0]=[str(HERE),str(HERE.parent/'roster')]
# Reuse only the previous builder's function definitions. Do not execute its shaping pass.
sys.argv=['build_paws.py','--','--out',str(OUT)]
ns={'__file__':str(HERE/'build_paws.py')}
code=(OUT/'previous_builder.py').read_text();exec(code.rsplit('\nmain()',1)[0],ns)
sk=ns['sk'];lookdev=ns['lookdev'];region=ns['region']
body=bpy.data.objects['luceras_blockout'];rig=bpy.data.objects['luceras_rig'];rig.data.pose_position='REST'
merged=sk.co(body).copy();src=body.copy();src.data=body.data.copy();bpy.context.collection.objects.link(src);src.hide_render=True
source=ns['load_body']('/mnt/c/dev/art-data/pipeline/claude-stream/luceras-torso/pass1/torso.blend')
generated=sk.co(source).copy()
paw=sk.mesh_from('generated_hind_paw',[],[]);paw.data=source.data.copy();paw.modifiers.clear();paw.vertex_groups.clear()
bm=bmesh.new();bm.from_mesh(paw.data);bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.co.x<=0 or v.co.y<=.025],context='VERTS');bm.to_mesh(paw.data);bm.free()
sk.cut_keep(paw,(0,0,.0575),(0,0,1),False,False);ns['clean'](paw)
exec((OUT/'graft_band.py').read_text(encoding='utf-8-sig'))
graft_band(body,paw)
ns['transfer'](src,body)
bpy.data.objects.remove(src,do_unlink=True);bpy.data.objects.remove(source,do_unlink=True)
P=sk.co(body).copy();np.save(OUT/'generated_grafted_coords.npy',P)
weights=[[(g.group,g.weight) for g in v.groups] for v in body.data.vertices]
# Keep source toe positions and outline. These centers select the four reconstructed lobes.
ns['CFG']={'hind':{'toeX':[.140,.165,.182,.199]},'fore':{'toeX':[.018,.033,.048,.061]}}
clay=json.loads((OUT/'clay_measurements.json').read_text())
results={}
for tag,s in [('s085',.85),('s075',.75),('s065',.65)]:
 p=P.copy();t=np.clip((p[:,2]-.055)/.010,0,1);smooth=t*t*(3-2*t);factor=s+(1-s)*smooth
 mask=p[:,2]<.065;p[mask,2]*=factor[mask];sk.set_co(body,p)
 ns['CFG']={'hind':{'toeX':[.140,.165,.182,.199]},'fore':{'toeX':[.018,.033,.048,.061]}}
 claws,ci=ns['seat_claws'](body,rig)
 rigid=[o for o in bpy.data.objects if o.type=='MESH' and o!=body and o.parent==rig]
 scene=lookdev.setup_scene(engine='CYCLES')
 for o in [body]+rigid:lookdev.apply_clay(o)
 dark=lookdev._material('paw_claw_dark',(.12,.12,.12),.75)
 for o in claws:o.data.materials.clear();o.data.materials.append(dark)
 for f in body.data.polygons:f.use_smooth=True
 if body.data.has_custom_normals:body.data.normals_split_custom_set([(0,0,0)]*len(body.data.loops))
 m={'scaleZ':s,'scaleX':1,'scaleY':1,'blendBandM':[.055,.065],'pawTypes':{},'claws':ci}
 for k in ['hind','fore']:
  ix=np.flatnonzero(region(P,k));q=P[ix];lo=q.min(0);L=float(np.ptp(q[:,1]));kn=ix[q[:,1]<lo[1]+.35*L];heel=ix[(q[:,1]>lo[1]+.80*L)&(q[:,1]<lo[1]+.95*L)&(q[:,2]<=.055)]
  v=p[ix];kh=float(p[kn,2].max());hh=float(p[heel,2].max())
  m['pawTypes'][k]={'lengthM':L,'widthM':float(np.ptp(v[:,0])),'knuckleHeightM':kh,'heelHeightM':hh,'knuckleHeightLengthRatio':kh/L,'heelHeightLengthRatio':hh/L,'clayKnuckleHeightLengthRatio':clay[k]['knuckleLengthRatio'],'clayHeelHeightLengthRatio':clay[k]['heelLengthRatio'],'clayHeelNote':clay[k]['heelMeasurementNote'],'knuckleDefinition':'Maximum Z in distal 35 percent of original footprint.','heelDefinition':'Maximum Z in 80 to 95 percent longitudinal band, limited to original paw below 55 mm.'}
 bm=bmesh.new();bm.from_mesh(body.data);seen=set();components=[]
 for v in bm.verts:
  if v in seen:continue
  todo=[v];seen.add(v);n=0
  while todo:
   a=todo.pop();n+=1
   for e in a.link_edges:
    b=e.other_vert(a)
    if b not in seen:seen.add(b);todo.append(b)
  components.append(n)
 bm.free()
 from mathutils.kdtree import KDTree
 tree=KDTree(len(p))
 for i,v in enumerate(p):tree.insert(Vector(v),i)
 tree.balance();prot=merged[merged[:,2]>=.065]
 m.update({'protectedDisplacementMaxM':max(tree.find(Vector(v))[2] for v in prot),'xyDisplacementMaxM':float(np.abs(p[:,:2]-P[:,:2]).max()),'bodyNonManifoldEdges':sk.nonmanifold_edges(body),'bodyComponents':components,'weightsUnchangedFromGraft':weights==[[(g.group,g.weight) for g in v.groups] for v in body.data.vertices],'maxInfluences':max(len(v.groups) for v in body.data.vertices),'weightSumError':max(abs(sum(g.weight for g in v.groups)-1) for v in body.data.vertices),'wholeTriangles':sum(sk.tri_count(o) for o in [body]+rigid),'armatureBones':len(rig.data.bones),'clawMinZ':{o.name:float(ns['world'](o)[:,2].min()) for o in claws},'blendDisplacementMaxM':float(np.abs(p[(P[:,2]>.055)&mask,2]-P[(P[:,2]>.055)&mask,2]).max())})
 m['leftRightAsymmetryMaxM']=float(sk.nearest_dist(sk.bvh(body),p[p[:,2]<.055]*np.array([-1,1,1])).max())
 assert m['protectedDisplacementMaxM']==0 and m['xyDisplacementMaxM']==0
 assert m['bodyNonManifoldEdges']==0 and len(components)==1 and m['maxInfluences']<=4 and m['wholeTriangles']<400000
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'paws_{tag}.blend'),compress=True)
 ns['export'](OUT/f'paws_{tag}.glb',[body,rig]+rigid)
 part=sk.mesh_from('paws_part',[],[]);part.data=body.data.copy();sk.cut_keep(part,(0,0,.065),(0,0,1),False,True)
 parts=[part]+[sk.evaluated_copy(o,o.name+'_export') for o in claws];ns['export'](OUT/f'paws_part_{tag}.glb',parts,False)
 for o in parts:bpy.data.objects.remove(o,do_unlink=True)
 results[tag]=m;(OUT/'measurements.json').write_text(json.dumps(results,indent=2))
 # Required fixed comparison renderer, unchanged.
 sys.argv=['compare_render.py','--','--out',str(OUT/'renders'),'--tag',tag];runpy.run_path(str(HERE/'compare_render.py'),run_name='__main__')
 if (OUT/'quick.flag').exists():break
 # Additional inherited deliverables for each variant.
 scene.cycles.samples=16
 for name,cam in {**ns['legcam'].frame_legs(),**ns['forecam'].frame_forelegs()}.items():lookdev.render(cam,OUT/'renders'/f'{tag}_{name}.png',1024)
 full=lookdev.frame_cameras([body]+rigid)
 for name,cam in full.items():lookdev.render(cam,OUT/'renders'/f'{tag}_body_{name}.png',1024)
 lookdev.render(full['side_left'],OUT/'renders'/f'{tag}_sprite_side_192.png',192)
 for name,cam in ns['pawcams'](P).items():lookdev.render(cam,OUT/'renders'/f'{tag}_close_{name}.png',1024)
 q=P[region(P,'fore')];lo=q.min(0);hi=q.max(0);lo[1]=hi[1]-.045;hi[1]+=.018;lo[2]=.035;hi[2]=.071
 dc=lookdev.place_camera('lookdev_cam_dewclaw',(Vector(lo),Vector(hi)),145,12,margin=.12);lookdev.render(dc,OUT/'renders'/f'{tag}_fore_dewclaw_back.png',1024)
 (OUT/'timing.json').write_text(json.dumps({'blenderSeconds':time.time()-T}))
if not (OUT/'quick.flag').exists():runpy.run_path(str(OUT/'verify_saved.py'),run_name='__main__')
print('DONE',time.time()-T,flush=True)
