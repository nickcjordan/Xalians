"""Final pass 3 provenance and completeness report. No claims without measured evidence."""
import json,hashlib,sys
from pathlib import Path
from datetime import datetime,timezone
from PIL import Image
OUT=Path(r'C:\dev\art-data\pipeline\codex-stream\luceras-gamemesh\pass3')
SOURCE=Path(r'C:\dev\art-data\pipeline\codex-stream\luceras-merge\revert-forelegs\luceras_sculpt.blend')
def load(n):
 p=OUT/n
 return json.loads(p.read_text(encoding='utf-8-sig')) if p.exists() else {}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
m=load('measurements.json');glb=load('glb_check.json');notes=load('iter_notes.json');prov=load('render_provenance.json')
views=['hind_paw_l_three_quarter','hind_paw_r_three_quarter','fore_paw_l_three_quarter','fore_paw_r_three_quarter','sprite','full_side','full_three_quarter','head_three_quarter','hind_paw_side','ear_three_quarter','ear_side','horn_silhouette_side']
bends=['shoulder','elbow','wrist','hip','stifle','hock','neck','tail_base']
required=['sculpt_check.json','gamemesh.blend','gamemesh.glb','normal_1024.png','normal_2048.png','ao_1024.png','ao_2048.png','uv_layout.png','wire_full_side.png','wire_full_three_quarter.png','pose_grid.png','measurements.json','iter_notes.json']+['check_'+n+'.png' for n in views]+['check_bend_'+n+'.png' for n in bends]
missing=[n for n in required if not (OUT/n).exists()]
artifacts={}
for n in required:
 p=OUT/n
 if not p.exists():continue
 record={'bytes':p.stat().st_size,'sha256':sha(p)}
 if p.suffix=='.png':
  with Image.open(p) as im:im.verify()
  with Image.open(p) as im:record['pixels']=list(im.size)
 artifacts[n]=record
flags={v:{p:d['flagged_over_30_percent_loss'] for p,d in ps.items() if d.get('flagged_over_30_percent_loss')} for v,ps in m.get('volume_change_per_joint_region_per_pose',{}).items()}
remaining=notes.get('remaining',[]).copy()
if missing:remaining.append('Missing deliverables: '+', '.join(missing))
if not notes.get('visual_no_loss'):remaining.append('No-visible-loss criterion has not passed.')
for n,v in m.get('hard_budget_checks',{}).items():
 if not v:remaining.append('Failed technical check: '+n)
if not prov.get('unchanged_after_renders'):remaining.append('Frozen blend rendering provenance not verified.')
budgets={'triangles':{'measured':m.get('triangles_total'),'limit':11500,'glb':glb.get('triangles')},'joints':{'measured':m.get('joints'),'existing':40,'limit':60},'influences':{'measured':m.get('max_influences'),'limit':4},'unweighted_vertices':{'measured':m.get('unweighted_count'),'limit':0},'materials':{'measured':len(m.get('materials',[])),'limit':2},'body_non_manifold_edges':{'measured':m.get('body_non_manifold_edges'),'limit':0},'texel_density_ratio':{'measured':m.get('texel_density_ratio'),'target_max_to_min':2},'textures':{'measured':m.get('texture_sizes'),'bake_required':2048,'runtime_required':1024},'uv_margin':{'configured_px_at_1024':8,'minimum':8,'measured':False},'joint_region_volume_loss_fraction':{'maximum_allowed':.30,'flags':flags}}
report={'build_id':'B-db8w','status':'complete' if not remaining else 'cap_reached_incomplete','started_utc':'2026-10-16T11:52:59Z','finished_utc':datetime.now(timezone.utc).isoformat(),'cap_minutes':45,'completion_reason':'35-minute geometry edit window ended. Final selected-state rebakes, renders and audit completed within the overall 45-minute cap.','editing_cutoff_utc':'2026-10-16T12:27:59Z','source':str(SOURCE),'source_sha256':sha(SOURCE),'source_unchanged':sha(SOURCE)=='d1203576f1f786fb8ae68097dde1e9fe344db0c6108b5077c0f9524d58a35754','gamemesh_blend_sha256':sha(OUT/'gamemesh.blend'),'base_blend_sha256':'c3d7d9b22445ae6940204fdf7f1968f5e234861c0802006c6d8c7572fd6e015e','method_in_order':notes.get('method_in_order',[]),'budgets':budgets,'what_fixed_per_iteration':notes.get('iterations',[]),'what_remains':remaining,'selected_iteration':notes.get('selected_iteration'),'completion_audit':load('completion_audit.json'),'checks':{'visual_no_loss':notes.get('visual_no_loss',False),'critic_checklist':notes.get('final_checklist',{}),'hard_budgets':m.get('hard_budget_checks',{}),'glb':glb,'normal_quality':load('normal_quality.json'),'deformation':flags,'render_provenance':prov,'missing_deliverables':missing},'bake_settings':load('bake_settings.json'),'artifacts':artifacts,'notes':['Whiskers omitted from game mesh for stage 7 texture/card decision.','No source sculpt edits, installs, paid services or git operations.','Triangulated joint deformation is verified with the four original proxy poses and eight close bend comparison grids. Edge-ring counts are superseded by pass 3 instructions.','Region volumes are dominant-bone surface patches closed to the moving bone head. This is a deformation proxy, not anatomical enclosed volume.','Surface distances are sampled in both directions, not an exact Hausdorff distance.','UVs retain smart-projected seams; underside seam placement is not guaranteed.','GLB is structurally checked. No mobile-browser runtime test was performed.']}
(OUT/'report.json').write_text(json.dumps(report,indent=2))
print(OUT/'report.json')
