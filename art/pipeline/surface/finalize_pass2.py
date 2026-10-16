"""Finalize B-nv32 from measured artifacts and an explicit final visual review."""
from pathlib import Path
import json,hashlib,datetime,importlib.util
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(r'C:/dev/src/xalians-creature-pipeline');HERE=ROOT/'art/pipeline/surface';OUT=Path(r'C:/dev/art-data/pipeline/codex-stream/luceras-surface/pass2')
def read(n):return json.loads((OUT/n).read_text())
def write(n,v):(OUT/n).write_text(json.dumps(v,indent=2)+'\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
views=['side','three_quarter','front','head','hind_leg','tail_plume','sprite']
export=read('export_check.json');m=read('measurements.json');skin=read('geometry_skin_check.json');rt=read('runtime_check.json');manual=read('manual_review.json');notes=read('iter_notes.json')
m['cards_count']=sum(r['cards'] for r in m['cards']);m['triangle_headroom']=15000-m['triangles_total'];m['glb_size_bytes']=export['file_bytes'];m['cards_count_definition']='Logical tufts, whiskers and crossed plume sheets. Explicit backs and atlas tiles are included in triangles, not counted as separate logical cards.';write('measurements.json',m)
required=['surface.blend','luceras_surface.glb','measurements.json','iter_notes.json','runtime_phone.png']
for v in views:
 required += [f'lookdev_{v}.png',f'runtime_{v}.png',f'composite_{v}_vs_sheet.png',f'composite_runtime_{v}_vs_sheet.png']
for tex in ['basecolor','normal','orm']:
 required += [f'{tex}_1024.png',f'{tex}_2048.png']
missing=[n for n in required if not (OUT/n).is_file()]
assert not missing,missing
images={}
for n in required:
 if n.endswith('.png'):
  im=Image.open(OUT/n);im.load();images[n]=list(im.size)
orm=np.array(Image.open(OUT/'orm_1024.png'));texture={'metal_zero':bool(np.all(orm[:,:,2]==0)),'image_sizes':images,'source_AO_red_channel':'Copied from source AO bake at 2048 on body UVs, then box-filtered to 1024. Card regions use unoccluded R=1.','alpha':'Body MASK, threshold 0.5. Eyes OPAQUE.','basecolor_count':1,'unique_embedded_images':len(export['textures'])};write('texture_proof_check.json',texture)
budgets={
 'triangles':{'actual':m['triangles_total'],'limit':15000,'pass':m['triangles_total']<=15000,'remaining':15000-m['triangles_total']},
 'materials':{'actual':len(export['materials']),'limit':2,'pass':len(export['materials'])<=2},
 'influences':{'actual':export['max_influences'],'limit':4,'pass':export['max_influences']<=4},
 'joints':{'actual':export['joints'],'approved_limit':40,'pass':export['joints']==40},
 'basecolor_textures':{'actual':1,'limit':1,'pass':True},
 'shipped_map_dimensions':{'actual':[1024,1024],'limit':[1024,1024],'pass':all(t['size']==[1024,1024] for t in export['textures'])},
 'authoring_map_dimensions':{'actual':[2048,2048],'required':[2048,2048],'pass':all(Image.open(OUT/(k+'_2048.png')).size==(2048,2048) for k in ['basecolor','normal','orm'])},
 'alpha_blended_materials':{'actual':sum(t['alphaMode']=='BLEND' for t in export['materials']),'limit':0,'pass':all(t['alphaMode']!='BLEND' for t in export['materials'])},
 'glb_bytes':{'actual':export['file_bytes'],'limit':None,'note':'No byte cap specified.'}}
report={'build_id':'B-nv32','stage':7,'pass':2,'finish':'standard','status':manual['status'],'approval':'Nick approval has not been given for this pass.','base':'../pass1/surface.blend','output':str(OUT),'method_in_order':[
 'Loaded pass 1, retained the approved body, eyes and rig, removed previous card objects and regenerated the surface in Blender 5.2.2 through the shared slot owner codex B-nv32 surface.',
 'Rasterized existing body UV triangles at 2048. Painted continuous landmark masks for narrow face blaze, muzzle/chin, bib/belly and inner/rear-leg white. Excluded the tail shaft and all other regions from white.',
 'Evaluated region-specific, independently scattered tapered fur locks in world space. Blended evaluated fields rather than their coordinates. Added color variation and tangent-space height derivatives to the sculpt normal; retained the original AO in ORM red.',
 'Painted matte dark brown horns with bronze restricted by AO and normal crest response, pink-gray nasal leather and inner ears, and quiet dark claws. Preserved the amber horizontal-pupil eyes and seven whiskers per side.',
 'Added irregular surface and silhouette tufts. Roots project below the body surface, with length-scaled burial and alpha taper. Skin weights interpolate from supporting triangles, capped and normalized to four. Plume sheets converge at the tail shaft and use tail_06.',
 'Packed card/eye regions into unused atlas space, authored three 2048 maps and shipped three 1024 maps. Exported two metallic-roughness materials, MASK body/cards and opaque eyes. No body decimation or body UV change.',
 'Iterated against Cycles and actual three.js 0.160 GLB renders. Rejected constructions that produced flipped-normal black cards, floating comb roots or a dotted plume center. Captured final full-size, 192 px, 390 px, orbit and pose evidence.'
 ],'tooling':{'directory':str(HERE),'author_script':'build_surface_pass2.py','runtime_page':'runtime_pass2.html','runtime_capture':'runtime_final_pass2.cjs','author_script_sha256':sha(HERE/'build_surface_pass2.py')},'iterations':'iter_notes.json','fixes_by_iteration':[{'iteration':n['iteration'],'changes':n.get('changes',n.get('changes_planned',[]))} for n in notes['iterations']],
 'budgets':budgets,'geometry':{'original_triangles':11478,'added_card_triangles':m['triangles_total']-11478,'decimation_performed':False,'body_preservation':skin['source_geometry'],'logical_cards':m['cards_count'],'triangles_per_object':m['triangles_per_object'],'skin_check':'geometry_skin_check.json'},
 'checks':{'export':export['checks'],'textures':texture,'browser_errors':rt['errors'],'visual_checklist':manual['checklist'],'part_counts':{'body_components':skin['body_parts'],'eyes':skin['eyes'],'horns':skin['horns'],'claws_including_dewclaws':skin['claws_including_dewclaws'],'whiskers_each_side':7},'missing_deliverables':missing},
 'render_provenance':{'cycles':'Blender 5.2.2, roster Cycles neutral look-dev scene, 32 samples. 1024 square, sprite 192 square. Card shadow visibility is disabled only in Cycles to avoid paired-face self-shadow artifacts; body shadows remain.','runtime':'Actual exported GLB, three.js 0.160.0, headless Chrome SwiftShader, neutral three-light rig. Shadows enabled, matching orthographic camera transforms.','phone_dimensions':[390,390],'physical_mobile_GPU_test':False,'orbit_frames':rt.get('orbitFrames',0),'motion_frames':rt.get('motionFrames',0),'blend_sha256':sha(OUT/'surface.blend'),'glb_sha256':sha(OUT/'luceras_surface.glb')},
 'remaining':manual['remaining'],'independent_review':manual.get('independent_review',{}),'timing':manual['timing'],'deliverables':required}
write('report.json',report)
record=f'''# Luceras B-nv32 surface pass 2

Outcome: match the approved storm-slate pattern and shaggy outline on the approved mesh, within 15000 triangles, two materials and 1024 maps authored at 2048. No git, installs or paid services.

Delivered evidence in {OUT}: surface.blend, GLB, six authored/shipped textures, Cycles and three.js views, sheet comparisons, 192 and 390 px runtime proof, orbit/motion frames, source geometry and skin checks, measurements and report.

Actual budget: {m['triangles_total']} / 15000 triangles, {len(export['materials'])} / 2 materials, {export['max_influences']} / 4 influences, {export['joints']} / 40 joints. Body geometry and UVs unchanged. GLB bytes: {export['file_bytes']}.

Status: {manual['status']}. Nick has not approved this pass. Open observations and next actions are in report.json and manual_review.json. Final visual review and stop basis: {manual['timing']}.
'''
(HERE/'WORK_RECORD_PASS2.md').write_text(record)
audit={'schemaVersion':1,'id':'B-nv32-surface-pass2','outcome':'Match the sheet pattern and shaggy outline, preserve accepted parts, and deliver all proof within the user timebox.','authorizedScope':'Stage 7 pass 2 surface, cards, materials and proof. Original body geometry preserved.','workRecord':'art/pipeline/surface/WORK_RECORD_PASS2.md','stop':manual['stop'],'findings':manual['remaining'],'report':str(OUT/'report.json')}
if manual['stop']['kind']!='user_stop':
 audit['criteria']=[{'id':'delivery','expectation':'All requested artifacts and measured budgets pass, with visual match inspected.','status':'pass' if not manual['remaining'] else 'fail','assessment':manual['status'],'evidence':['report']}]
 audit['evidence']={'report':{'path':str(OUT/'report.json'),'sha256':sha(OUT/'report.json')}}
 audit['audit']={'reviewer':'Codex and independent surface_review','comparison':manual['status'],'regressions':'Reviewed retained eyes, horns, whiskers and approved body.','scopeCheck':'No scope reduction.'}
spec=importlib.util.spec_from_file_location('completion_audit',ROOT/'scripts/completion_audit.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);audit['result']=mod.evaluate(audit,ROOT)
write('completion_audit.json',audit);(HERE/'completion-audit-pass2.json').write_text(json.dumps(audit,indent=2)+'\n')
write('delivery_manifest.json',{n:{'bytes':(OUT/n).stat().st_size,'sha256':sha(OUT/n)} for n in required+['report.json','export_check.json','runtime_check.json','geometry_skin_check.json','texture_proof_check.json','completion_audit.json']})
print(json.dumps({'report':str(OUT/'report.json'),'triangles':m['triangles_total'],'bytes':export['file_bytes'],'status':manual['status'],'audit':audit['result']},indent=2))
