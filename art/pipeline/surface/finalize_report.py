"""Record frozen-asset evidence and unresolved art findings. Does not edit the asset."""
from pathlib import Path
import json,hashlib,datetime,importlib.util
import numpy as np
from PIL import Image
ROOT=Path('C:/dev/src/xalians-creature-pipeline')
HERE=ROOT/'art/pipeline/surface'
OUT=Path('C:/dev/art-data/pipeline/codex-stream/luceras-surface/pass1')
def read(n):return json.loads((OUT/n).read_text())
def write(n,v):(OUT/n).write_text(json.dumps(v,indent=2)+'\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
views=['side','three_quarter','front','head','hind_leg','tail_plume','sprite']
notes=read('iter_notes.json')
notes['iterations']=[n for n in notes['iterations'] if n['iteration']<9]
for i,plume,changes in [
 (9,'Increasing transparent bounces did not remove the large rectangular Cycles patches. Runtime matte remained intact.', ['Explicitly triangulated both sides of every curved plume tile using the same diagonal to prevent intersections between independently triangulated nonplanar quads.']),
 (10,'Large rectangular patches are resolved. Root meets the tail shaft. A thin bright central seam persists in three.js, and the plume still reads as a flat feather rather than hair tufts.',[])]:
 notes['iterations'].append({'iteration':i,'evidence':[f'iter{i}_{v}.png' for v in views if v!='sprite'],
 'comparison':{'color':'Storm slate family is present. Runtime chest cards are too bright against the underlying chest.',
 'pattern_placement':'Face blaze, throat, belly and inner-leg masks are present, but white cheeks and the broad side chest/belly pattern are narrower and darker than the sheet.',
 'fur_length_by_region':'Face and neck use shorter texture flow. Body remains wavy rather than convincingly fibrous, especially inner hind legs. Hind cards are too regular and have dark rectangular roots.',
 'plume_shape':plume,'eye_color_and_pupil':'Amber irises and horizontal goat pupils are readable in head views. Whiskers are present but vanish at sprite size.'},
 'changes_for_next_iteration':changes,'disposition':'Frozen at the user editing cutoff; remaining defects recorded for the next pass.' if i==10 else 'Continue diagnosis.'})
notes['final_review']={'comparison_files':[f'composite_{v}_vs_sheet.png' for v in views]+[f'composite_runtime_{v}_vs_sheet.png' for v in views],
 'independent_reviewer':'/root/surface_review','review_status':'needs_revision',
 'timing_note':'Iteration 9 and 10 notes consolidated during final proof preparation. Earlier notes retained.'}
write('iter_notes.json',notes)
remaining=[
 {'id':'plume_seam','severity':'major','observation':'Thin bright central seam is conspicuous in three.js. The crossed sheets still read as a flat feather, not a volume of hair tufts.','next_action':'Rework the plume center registration and crossed-sheet silhouette while staying within the 58 remaining triangles.'},
 {'id':'hind_roots','severity':'major','observation':'Black rectangular hind-fringe root tabs and regular comb spacing are visible in close views.','next_action':'Bury or reshape roots, soften the root mask, and stagger tuft length and angle.'},
 {'id':'chest_cards','severity':'major','observation':'Runtime chest ruff forms two brighter strips that do not blend into the coat.','next_action':'Match the card values and normal response to the chest or remove unnecessary chest cards.'},
 {'id':'fur_flow','severity':'major','observation':'Body and inner-leg fur contains broad wavy bands. Texture flow is not yet convincing short strand fur on the face and neck or longer clumps on the body.','next_action':'Reduce low-frequency normal variation and author directional, region-specific clump masks.'},
 {'id':'white_pattern','severity':'major','observation':'White muzzle cheeks and side chest/belly coverage are less broad and less white than the approved sheet. The plume uses a pale lower-center sweep and dark crown; this does not fully satisfy white-toward-tips wording.','next_action':'Expand sheet-registered white masks, check the plume tip pattern against Nick\'s chosen sheet, and compare again under neutral runtime lighting.'},
 {'id':'skin_attachment','severity':'moderate','observation':'Hind-fringe roots stay within 0.60 mm at rest but separate up to 2.55 mm in the tested hock pose.','next_action':'Interpolate weights at each card root from the exact supporting triangle and repeat deformation tests.'},
 {'id':'temporal_mobile','severity':'unverified','observation':'A 24-angle runtime orbit was inspected. Continuous animation flicker and physical mobile GPU performance were not measured.','next_action':'Review a continuous orbit and tail/hock animation on target mobile hardware.'}
]
export=read('export_check.json');measure=read('measurements.json');skin=read('geometry_skin_check.json');runtime=read('runtime_check.json');build=read('build_state.json')
measure['cards_count']=sum(c['cards'] for c in measure['cards'])
measure['cards_count_definition']='76 logical cards: 2 tiled plume sheets, 40 hind tufts, 20 chest tufts, 14 whiskers. Explicit backs and atlas tiles are included in triangle counts, not counted as extra logical cards.'
measure['glb_size_bytes']=export['file_bytes'];measure['triangle_headroom']=12000-measure['triangles_total']
write('measurements.json',measure)
required=['surface.blend','luceras_surface.glb','measurements.json','iter_notes.json']
for v in views:
 required += [f'lookdev_{v}.png',f'runtime_{v}.png',f'composite_{v}_vs_sheet.png',f'composite_runtime_{v}_vs_sheet.png']
for tex in ['basecolor','normal','orm']:
 required += [f'{tex}_1024.png',f'{tex}_2048.png']
missing=[f for f in required if not (OUT/f).is_file()]
assert not missing,missing
image_checks={}
for f in required:
 if f.endswith('.png'):
  im=Image.open(OUT/f);im.load();image_checks[f]=list(im.size)
  if f.startswith(('lookdev_','runtime_')):assert im.size==((192,192) if 'sprite' in f else (1024,1024))
orm=np.array(Image.open(OUT/'orm_1024.png'))
texture_check={'metal_blue_min':int(orm[:,:,2].min()),'metal_blue_max':int(orm[:,:,2].max()),'metal_zero':bool(np.all(orm[:,:,2]==0)),
 'roughness_green_range_8bit':[int(orm[:,:,1].min()),int(orm[:,:,1].max())],
 'ao_source':'Approved ao_2048.png copied into ORM R on the original body UVs. New cards and eye allocations use AO 1. Dilation and downsampling affect borders.',
 'proof_dimensions':image_checks}
write('texture_proof_check.json',texture_check)
checks={
 'export_structure':{'status':'pass','evidence':'export_check.json','details':export['checks']},
 'source_mesh_and_uvs':{'status':'pass','evidence':'geometry_skin_check.json','details':skin['source_geometry']},
 'holes':{'status':'pass_for_inspected_views','evidence':['measurements.json','runtime_orbit_contact.png'],'details':'No non-manifold edges or zero-area faces in original body and eyes. No obvious body holes in inspected Cycles and runtime views. Open card edges are intentional.'},
 'dark_spots':{'status':'fail','details':'Dark hind-fringe attachment tabs remain. Large rectangular plume shading patches were fixed in iteration 10.'},
 'stretched_or_seamed_texture':{'status':'fail','details':'Wavy inner-leg flow and a thin bright plume seam remain.'},
 'floating_cards':{'status':'warning','evidence':'geometry_skin_check.json','details':'Tail root is visually joined. Hind and chest roots are within 0.60 mm at rest. Tested hock deformation increases maximum hind-root distance to 2.55 mm.'},
 'flicker':{'status':'not_fully_verified','evidence':'runtime_orbit_contact.png','details':'24 static orbit samples show persistent plume coverage, with changing apparent width. This is not a continuous temporal or mobile test.'},
 'part_counts':{'status':'pass','details':'Approved anatomy unchanged: 2 horns, 2 eyes, 18 small claws including dewclaws, 40 bones; 7 added whiskers per side; 2 plume sheets; 20 hind tufts per side and 20 chest tufts.'},
 'runtime_load':{'status':'pass','evidence':'runtime_check.json','details':'three.js r160, no page or console errors, 11942 triangles, 2 materials, alpha MASK and no alpha blending.'},
 'proof_files':{'status':'pass','evidence':'texture_proof_check.json','details':'All 7 Cycles and 7 runtime views, 14 equal-height sheet composites, and 192 px sprite views exist and decode.'},
 'look_matches_sheet':{'status':'needs_revision','details':'Known art discrepancies are listed in remaining. This pass is not represented as Nick-approved or production-ready.'}}
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
report={'build_id':'B-rmyz','creature':'Luceras','stage':7,'pass':1,'finish':'standard',
 'status':'delivered_for_review_needs_revision','approval':'Nick has not approved this surface pass.',
 'output_folder':str(OUT),'timing':{'started_utc':'2026-10-16T14:09:00Z','editing_cutoff_utc':'2026-10-16T15:09:00Z','last_asset_build_epoch':build['time'],'finalized_utc':now,'total_cap_minutes':75,'editing_cap_minutes':60,'notes':'Shared Blender slot contention consumed part of the authoring window. Asset edits stopped before the 60-minute cutoff. Later work was rendering, QA, comparisons and reporting.'},
 'tools':{'blender':'5.2.2 LTS in WSL','slot_owner':'codex B-rmyz surface','three_js':'0.160.0','runtime':'Headless installed Chrome through installed playwright-core; SwiftShader WebGL','tooling':str(HERE),'git_used':False,'installs':False,'paid_services':False},
 'inputs':{'game_mesh':'C:/dev/art-data/pipeline/codex-stream/luceras-gamemesh/pass6/gamemesh.blend','game_mesh_sha256':build['source_blend_sha256'],'references':'reference_provenance.json','coat':'storm slate, Saiphus storm-cloud gray','authority':'User-supplied Nick picks and approved model sheet'},
 'method_in_order':[
 'Inspected approved mesh, UV occupancy, rig, material parts and supplied look references. Preserved the original body vertices, faces and UVs.',
 'Rasterized the existing UV layout at 2048 inside Blender. Barycentric world positions and normals drive side/front landmark masks for slate coat, blaze, muzzle, throat, chest, belly, inner legs and hind feathering. Masks were traced procedurally from sheet landmarks, not solved by automatic camera registration.',
 'Projected a small approved side-sheet fur sample through regional flow fields and mixed it with anisotropic procedural clump noise. Face/head/neck flow is shorter, body longer, and hind/chest longest. Derived strand gradients in tangent space and combined them with the approved baked sculpt normal.',
 'Retained source AO in ORM R; painted roughness in G and set metal B to zero. Horns use near-black brown, AO-derived ridge crest variation and lower roughness. Claws and nose are dark. Eyes share the atlas with amber radial iris, horizontal black pupil and low roughness.',
 'Allocated eye and cutout swatches in unused atlas space. Original body UVs were not repacked. Sampled and matted the approved sheet plume, split it into 25 atlas tiles per sheet, and built two crossed curved sheets with explicit front/back triangles. Plume is weighted to tail_06.',
 'Added 20 surface-rooted hind tufts per leg, 20 short chest tufts and 7 thin curved white whiskers per side. Hind/chest weights come from nearby body skin; whiskers are weighted to head_01. No body decimation was required.',
 'Downsampled to one 1024 base color, one 1024 tangent normal and one 1024 ORM. Exported 2 metallic-roughness materials to GLB. The body material uses MASK at the default 0.5 cutoff, with explicit card backs as needed. Eye material is opaque. GLB embeds 3 unique images; multiple texture objects reuse these images.',
 'Saved surface.blend with packed textures and the roster Cycles look-dev rig. A Blender-only backfacing transparency branch mirrors glTF face culling after export. Rendered iteration previews and compared to sheets, resolving several plume and fringe construction faults.',
 'Froze iteration 10, rendered seven final Cycles views and matching three.js r160 views, generated sheet comparisons, checked the actual GLB and original geometry, tested a tail/hock pose, and inspected 24 runtime orbit samples.'
 ],
 'iterations':'iter_notes.json','fixes_by_iteration':[{'iteration':n['iteration'],'changes_for_next_iteration':n.get('changes_for_next_iteration',n.get('changes',[]))} for n in notes['iterations']],
 'budgets':{'triangles':{'actual':11942,'limit':12000,'pass':True,'remaining':58},'materials':{'actual':2,'limit':2,'pass':True},'max_vertex_influences':{'actual':4,'limit':4,'pass':True},'joints':{'actual':40,'approved_source':40},'shipped_texture_dimensions':{'actual':[1024,1024],'limit':[1024,1024],'pass':True,'unique_images':3,'basecolor_count':1},'authoring_texture_dimensions':{'actual':[2048,2048],'required':[2048,2048],'pass':True},'alpha_blended_materials':{'actual':0,'limit':0,'pass':True},'glb_size_bytes':{'actual':export['file_bytes'],'limit':None,'note':'No byte limit specified.'}},
 'geometry':{'decimation_performed':False,'original_triangles':11478,'added_triangles':464,'logical_cards':76,'card_breakdown':'measurements.json','skin_check':'geometry_skin_check.json'},
 'render_provenance':{'cycles':'Blender 5.2.2 Cycles, roster look-dev rig, 32 samples, 1024 square except 192 sprite','runtime':'three.js 0.160.0, orthographic cameras matched by transform, neutral three-light rig and hemisphere fill. Different shading and shadows from Cycles remain visible.','physical_mobile_test':False,'surface_blend_sha256':sha(OUT/'surface.blend'),'glb_sha256':export['sha256']},
 'checks':checks,'remaining':remaining,
 'independent_review':{'reviewer':'/root/surface_review','scope':'All six iteration 10 Cycles previews and all seven refreshed runtime screenshots.','result':'needs_revision','summary':'Confirmed joined plume root, readable amber horizontal pupil, blaze, dark horns and quiet claws. Flagged central plume seam and feather-like appearance, black hind tabs, bright chest strips, wavy inner-leg fur and insufficient white cheeks.'},
 'deliverables':required,'recommended_next_pass':'Address the plume seam and hair-like shape, bury hind roots, blend chest cards, widen sheet white masks, and replace wavy fur flow before asking Nick to approve.'}
write('report.json',report)
(HERE/'WORK_RECORD.md').write_text('''# Luceras surface B-rmyz

Requested stage 7 pass 1 standard finish from the approved pass6 game mesh. Started 2026-10-16 14:09 UTC; user editing cutoff 15:09 UTC and final cap 15:24 UTC. No git operations, installs or paid services.

Delivered surface.blend, luceras_surface.glb, authored 2048 and shipped 1024 maps, seven Cycles views, seven three.js r160 views, fourteen sheet comparisons, measurements, iteration notes and report in C:/dev/art-data/pipeline/codex-stream/luceras-surface/pass1/.

Technical checks: 11942 triangles of 12000; two materials; forty joints; at most four normalized weights; no unweighted vertices; no alpha blending; source body vertices, topology and UVs identical. Runtime loaded without browser errors. Pose and orbit evidence saved.

Art review does not pass. Open findings: plume seam and feather-like appearance, hind-fringe root tabs, bright chest strips, wavy fur, insufficient white cheek/chest/belly coverage and small posed root separation. Independent reviewer /root/surface_review agrees. Physical mobile performance and continuous flicker remain unverified. Full evidence and next actions are in report.json and iter_notes.json.

Stopped asset editing at the user timebox. Final work was rendering, checks and reporting. The completion audit records a user-timebox stop, not artistic completion or Nick approval. The audit evaluator is called directly with the explicit worktree root to honor the user's no-git instruction.
''')
audit={'schemaVersion':1,'id':'B-rmyz-surface-pass1','outcome':'Timeboxed surface pass delivered with open art defects.','authorizedScope':'Stage 7 pass 1 standard surface and proof; no geometry redesign.','workRecord':'art/pipeline/surface/WORK_RECORD.md','stop':{'kind':'user_stop','userWords':'Cap 75 minutes; stop editing at 60 and spend the rest on the final renders, the runtime screenshots and the report.','source':'User task brief'},'findings':remaining,'report':str(OUT/'report.json')}
spec=importlib.util.spec_from_file_location('completion_audit',ROOT/'scripts/completion_audit.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
audit['result']=mod.evaluate(audit,ROOT)
(HERE/'completion-audit.json').write_text(json.dumps(audit,indent=2)+'\n');write('completion_audit.json',audit)
manifest={f:{'bytes':(OUT/f).stat().st_size,'sha256':sha(OUT/f)} for f in required+['report.json','export_check.json','runtime_check.json','geometry_skin_check.json','texture_proof_check.json','completion_audit.json']}
write('delivery_manifest.json',manifest)
print(json.dumps({'report':str(OUT/'report.json'),'required_files':len(required),'missing':missing,'triangles':measure['triangles_total'],'glb_bytes':export['file_bytes'],'audit':audit['result'],'art_status':report['status']},indent=2))
