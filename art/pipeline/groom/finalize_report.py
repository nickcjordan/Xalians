"""Assemble an evidence-based B-gwvn report after visual review."""
import json,hashlib,shutil,datetime
from pathlib import Path
HERE=Path(__file__).resolve().parent
OUT=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass1')
def read(name,default=None):
 p=OUT/name;return json.loads(p.read_text()) if p.exists() else default
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
for name in ('build_groom.py','parameters.json','REAPPLY.md','compose_proof.py'):
 shutil.copy2(HERE/name,OUT/name)
views=['side','three_quarter','front','head','hind_leg','tail_plume','portrait','sprite']
required=['groom.blend','build_groom.py','parameters.json','measurements.json','iter_notes.json','deformation_check.json','deformation_side.png','deformation_hind_leg.png']
required += ['render_'+v+'.png' for v in views]+['composite_'+v+'_vs_sheet.png' for v in views]+['composite_'+v+'_vs_live_pass3.png' for v in ('side','three_quarter')]
missing=[n for n in required if not (OUT/n).exists() or not (OUT/n).stat().st_size]
geometry=read('geometry_check.json',{});deform=read('deformation_check.json',{});visual=read('visual_review.json',{'status':'not_reviewed','remaining':['Final visual review has not been recorded.']});stats=read('groom_statistics.json',{});cost=read('measurements.json',{})
for k in ('guides','children','whiskers','rendered_strands'):
 if k in stats:cost[k]=stats[k]
cost['cpu_threads']=8;cost['gpu_limit_gb']=6.5;cost['gpu_limit_strategy']='CPU fallback used for every frame. Cycles device was CPU. GPU memory was not measured or used for Cycles rendering.'
latest={f['file']:f for f in cost.get('frames',[]) if f.get('file','').startswith('render_')};cost['final_frame_costs']=list(latest.values());cost['final_frames_total_seconds']=sum(f['seconds'] for f in latest.values());cost['peak_process_host_memory_gib']=max((f.get('process_peak_host_memory_gb',0) for f in cost.get('frames',[])),default=0);cost['host_memory_units']='GiB, measured with process ru_maxrss. Legacy per-frame field suffix _gb stores GiB.';cost['timing_scope']='Wall time from render invocation through file write, including scene synchronization. Slot wait excluded.'
(OUT/'measurements.json').write_text(json.dumps(cost,indent=2))
remaining=visual.get('remaining',[])+['Orchestrator review and Nick look approval.','Apply this script to the final B-v3g9 rigged sculpt in rest pose and review its animation poses.']
block=[]
if missing:block.append({'reason':'Missing required proof outputs','files':missing})
if not geometry.get('unchanged'):block.append({'reason':'Base geometry preservation check did not pass'})
if not deform.get('passed'):block.append({'reason':'Deformation attachment proof did not pass'})
if visual.get('status')=='not_reviewed':block.append({'reason':'Final visual review missing'})
if visual.get('status')=='needs_revision':block.append({'reason':'Remaining look differences at the user editing cutoff','constraint':'User required stopping groom edits after 75 minutes and reserving the remainder for final renders and report.','details':visual.get('remaining',[])})
outputs=[]
for p in sorted(OUT.iterdir()):
 if p.is_file() and p.name!='report.json' and p.suffix not in ('.log','.blend1') and p.stat().st_size:
  role='final_render_proof' if p.name.startswith(('render_','composite_')) else 'historical_iteration_evidence' if p.name.startswith('iter') or p.name in ('deformation_skin_hind_leg.png','tail_skin_only.png') else 'reapplicable_groom' if p.name=='groom.blend' else 'final_deformation_proof' if p.name.startswith('deformation_') else 'supporting_evidence'
  outputs.append({'path':str(p),'bytes':p.stat().st_size,'sha256':sha(p),'role':role})
report={
 'build_id':'B-gwvn',
 'status':'incomplete' if block or visual.get('status')=='needs_revision' else 'ready_for_orchestrator_review',
 'approval':'Not approved by Nick. Builder evidence and review candidate only.',
 'method_in_order':[
  'Verify the approved sculpt file SHA-256, open it read-only as an input, and preserve every existing mesh coordinate and topology index.',
  'Read the model sheet, vision picks, Akinza hair implementation, pass3 surface and neutral studio implementation.',
  'Project the pass3 2048 basecolor from the largest connected game-body component onto sculpt vertices using nearest triangle, barycentric UV interpolation and bilinear sampling. Store linear color attributes on the skin and strand roots.',
  'Write per-vertex length, density, clump, frizz, direction and region attributes. Smooth length transitions without changing any vertex.',
  'Build seeded guides and three-guide interpolated children as editable Blender hair curves. Add pointed clumps, frizz, a long tail fan, short ears, bare nose and eye exclusions, and white whiskers.',
  'Bind each curve point to original surface triangle indices, root barycentrics and orthonormal point offsets. Geometry Nodes reconstructs the point from the evaluated deformed surface. No new UV map is needed.',
  'Assign Chiang Principled Hair, transferred skin color, dark ridged horns, amber horizontal pupils, separate clear corneas and dark original claws.',
  'Place neutral key, fill, rim, ground and cameras in a swappable studio collection. Render CPU Cycles previews, compare with sheet, record findings and revise.',
  'Render the requested final views and comparisons. Add a separate temporary 18-degree hind-leg armature proof and measure root attachment error and base-mesh preservation.'
 ],
 'iterations':read('iter_notes.json',[]),
 'what_still_remains':remaining,
 'checks':{'required_outputs_missing':missing,'approved_mesh_geometry':geometry,'surface_attachment':deform,'groom_statistics':stats,'visual_checklist':visual,'cpu_rendering':True,'gpu_rendering_used':False,'delivery_integrity':read('delivery_checks.json',{}),'independent_review':read('independent_review_final.json',{}),'completion_audit':read('completion_audit_result.json',{}),'git_used':False,'installs':False,'paid_services':False},
 'blockedBy':block,
 'measurements_file':str(OUT/'measurements.json'),'primary_renders':{v:str(OUT/('render_'+v+'.png')) for v in views},'comparison_contact':str(OUT/'final_contact.png'),
 'reapplication_file':str(OUT/'REAPPLY.md'),
 'source_pattern_transfer':read('pattern_transfer.json',{}),
 'reference_provenance':read('reference_provenance.json',{}),'input_provenance':read('input_provenance.json',{}),'color_measurements':read('color_measurements.json',{}),
 'timing':{'started_utc':'2026-10-16T17:43:46+00:00','editing_cutoff_utc':'2026-10-16T18:58:46+00:00','hard_stop_utc':'2026-10-16T19:13:46+00:00','last_groom_edit_before_utc':'2026-10-16T18:53:16+00:00','report_written_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'note':'Shared slot wait is included in the overall task time. Per-frame timings exclude slot waits.'},
 'outputs':outputs
}
(OUT/'report.json').write_text(json.dumps(report,indent=2));print(OUT/'report.json')
