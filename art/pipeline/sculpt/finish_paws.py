"""Finalize a reviewed paws iteration without rebuilding its soft geometry."""
from pathlib import Path
import sys
P=Path('/mnt/c/dev/src/xalians-creature-pipeline/art/pipeline/sculpt/build_paws.py')
exec(compile(P.read_text().rsplit('main()',1)[0],str(P),'exec'))
body=bpy.data.objects['luceras_blockout'];rig=bpy.data.objects['luceras_rig'];rig.data.pose_position='REST'
source_tag=arg('--source-tag','iter9');m=json.loads((OUT/f'measurements_{source_tag}.json').read_text());m['finalSourceIteration']=source_tag
for side,sx in [('l',1),('r',-1)]:
 old=bpy.data.objects.get('fore_dewclaw_'+side)
 if old:
  root=world(old)[:14].mean(0);bpy.data.objects.remove(old,do_unlink=True)
  pts=np.array([root+[0,.003*t,-.009*t] for t in np.linspace(0,1,16)])
  o,_=sk.sweep('fore_dewclaw_'+side,pts,lambda i,t:.0022*(1-i/15)**.8+.0001,segments=14);sk.bone_parent(o,rig,'leg_f'+side+'_03')
  m['claws'][o.name]={'arcLengthM':float(np.linalg.norm(np.diff(pts,axis=0),axis=1).sum()),'rootM':root.tolist()}
rigid=[o for o in bpy.data.objects if o.type=='MESH' and o!=body and o.parent==rig];clawobjs=[o for o in rigid if 'claw' in o.name]
with bpy.data.libraries.load('/mnt/c/dev/art-data/pipeline/codex-stream/luceras-merge/merged.blend',link=False) as (src,dst):dst.objects=['luceras_blockout']
base=dst.objects[0];P0=sk.co(base);bpy.data.objects.remove(base,do_unlink=True)
lookdev.setup_scene(engine='CYCLES');bpy.context.scene.cycles.samples=24
for o in [body]+rigid:lookdev.apply_clay(o)
dark=lookdev._material('paw_claw_dark',(.12,.12,.12),.75)
for o in clawobjs:o.data.materials.clear();o.data.materials.append(dark)
for n,c in pawcams(P0).items():
 if n!='hind_paw_front':lookdev.render(c,str(OUT/'renders'/f'{TAG}_{n}.png'),1024)
for n,c in {**legcam.frame_legs(),**forecam.frame_forelegs()}.items():lookdev.render(c,str(OUT/'renders'/f'{n}.png'),1024)
full=lookdev.frame_cameras([body]+rigid)
for n,c in full.items():lookdev.render(c,str(OUT/'renders'/f'full_{n}.png'),1024)
lookdev.render(full['side_left'],str(OUT/'renders'/'sprite_side_192.png'),192)
m['maxWeightSumError']=max(abs(sum(g.weight for g in v.groups)-1) for v in body.data.vertices)
m['triangles']={o.name:sk.tri_count(o) for o in [body]+rigid};m['triangles']['wholeCreature']=sum(m['triangles'].values())
(OUT/'measurements.json').write_text(json.dumps(m,indent=2));(OUT/f'measurements_{TAG}.json').write_text(json.dumps(m,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'paws.blend'),compress=True)
export(OUT/'paws.glb',[body,rig]+rigid)
part=sk.mesh_from('paws_part',[],[]);part.data=body.data.copy();sk.cut_keep(part,(0,0,.065),(0,0,1),False,True);lookdev.apply_clay(part)
parts=[part]+[sk.evaluated_copy(o,o.name+'_export') for o in clawobjs];export(OUT/'paws_part.glb',parts,False)
(OUT/'final_tag.txt').write_text(TAG);(OUT/f'blender_log_{TAG}.json').write_text(json.dumps({'seconds':time.time()-T0,'sourceIteration':source_tag},indent=2))
print('FINALIZED',TAG,time.time()-T0,flush=True)
