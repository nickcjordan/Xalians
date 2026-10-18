"""Assemble measured B-vmt3 delivery evidence without git or paid services."""
from pathlib import Path
from PIL import Image
import json,hashlib,datetime,shutil
T=Path(__file__).parent;O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass2')
def read(n,default=None):
 p=O/n;return json.loads(p.read_text()) if p.exists() else default
def write(n,v):(O/n).write_text(json.dumps(v,indent=2))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
views={'side':(1374,1145),'three_quarter':(1374,1145),'front':(1145,1145),'head':(1145,1145),'hind_leg':(1145,1145),'tail_plume':(1145,1145),'portrait':(512,512),'sprite':(192,192)}
sources={'build_groom_pass2.py':'build_groom.py','parameters_pass2.json':'parameters.json','compose_pass2.py':'compose_proof.py','REAPPLY_pass2.md':'REAPPLY.md','WORK_RECORD_pass2.md':'WORK_RECORD.md','measure_pass2.py':'measure_colors.py'}
for source,dest in sources.items():
 if (T/source).exists():shutil.copy2(T/source,O/dest)
required=['groom.blend','build_groom.py','parameters.json','iter_notes.json','measurements.json','color_measurements.json','deformation_check.json','deformation_proof.blend','deformation_side.png','deformation_hind_leg.png','independent_review_final.json','visual_review.json']
required+=['render_'+v+'.png' for v in views]+['composite_'+v+'_vs_sheet.png' for v in views]+['composite_'+v+'_vs_live_pass3.png' for v in ('side','three_quarter')]+['composite_'+v+'_vs_pass1.png' for v in ('sprite','portrait')]
missing=[n for n in required if not (O/n).is_file() or not (O/n).stat().st_size]
geom=read('geometry_check.json',{});deform=read('deformation_check.json',{});stats=read('groom_statistics.json',{});cost=read('measurements.json',{});visual=read('visual_review.json',{})
cost.update({k:stats[k] for k in ('guides','children','whiskers','follicle_curves','rendered_strands') if k in stats})
cost.update(cpu_threads=8,gpu_limit_gb=6.5,peak_gpu_memory_gb=None,gpu_limit_strategy='CPU Cycles selected explicitly for every frame. No Cycles GPU rendering allocation. Total laptop GPU memory was not instrumented and is not claimed as measured.',timing_scope='Wall-clock render call through file write, including scene synchronization. Shared slot wait excluded. Single render observations, not an isolated-system benchmark.',host_memory_units='GiB from Linux process ru_maxrss. Historical field suffix _gb is GiB.')
frames={f['file']:f for f in cost.get('frames',[]) if f.get('file','').startswith('render_')};cost['final_frame_costs']=list(frames.values());cost['final_frames_total_seconds']=sum(f['seconds'] for f in frames.values());cost['peak_process_host_memory_gib']=max((f.get('process_peak_host_memory_gb',0) for f in cost.get('frames',[])),default=0);write('measurements.json',cost)
source=O.parents[1]/'luceras-merge/revert-forelegs/luceras_sculpt.blend'
checks={'missing_required_outputs':missing,'approved_source_sha256':sha(source),'original_mesh_geometry_unchanged':geom.get('unchanged',False),'surface_attachment_bend_passed':deform.get('passed',False),'render_dimensions':{},'all_final_frames_measured':len(frames)==len(views),'all_final_frames_cpu':len(frames)==len(views) and all(f['device']=='CPU' for f in frames.values()),'strand_count_consistent':stats.get('rendered_strands')==sum(stats.get(k,0) for k in ('children','whiskers','follicle_curves')),'all_strand_points_finite':stats.get('nonfinite_points')==0,'minimum_eye_clearance_m':stats.get('eye_clearance_min_m'),'script_parameters_match_tooling':sha(O/'build_groom.py')==sha(T/'build_groom_pass2.py') and sha(O/'parameters.json')==sha(T/'parameters_pass2.json'),'visual_checklist':visual.get('checklist',{}),'scope':'Numerical checks establish measured technical properties. Visual inspection and artistic approval are separate.'}
checks['approved_source_unchanged']=checks['approved_source_sha256']=='d1203576f1f786fb8ae68097dde1e9fe344db0c6108b5077c0f9524d58a35754'
for v,size in views.items():
 p=O/('render_'+v+'.png');actual=Image.open(p).size if p.exists() else None;checks['render_dimensions'][v]={'expected':size,'actual':actual,'passed':actual==size}
checks['technical_delivery_passed']=not missing and all(checks[k] for k in ('approved_source_unchanged','original_mesh_geometry_unchanged','surface_attachment_bend_passed','all_final_frames_measured','all_final_frames_cpu','strand_count_consistent','all_strand_points_finite','script_parameters_match_tooling')) and all(v['passed'] for v in checks['render_dimensions'].values());write('delivery_checks.json',checks)
provenance={}
for name,p in [('approved_sculpt',source),('pass1_groom',O.parent/'pass1/groom.blend'),('pass1_script',O.parent/'pass1/build_groom.py'),('pass3_basecolor',O.parents[1]/'luceras-surface/pass3/basecolor_2048.png')]:provenance[name]={'path':str(p),'sha256':sha(p)}
refs=json.loads((O.parent/'pass1/input_provenance.json').read_text())
for n,v in refs.items():
 p=Path(v['path']);provenance[n]={'path':str(p),'sha256':sha(p),'expected_sha256':v['sha256'],'verified':sha(p)==v['sha256']}
write('input_provenance.json',provenance)
block=[]
if missing:block.append({'reason':'Missing requested evidence','files':missing})
if not checks['technical_delivery_passed']:block.append({'reason':'One or more technical delivery checks failed','evidence':'delivery_checks.json'})
if visual.get('status')=='needs_revision':block.append({'reason':'Remaining visual differences','details':visual.get('remaining',[])})
outputs=[]
for p in sorted(O.iterdir()):
 if not p.is_file() or p.name=='report.json' or p.suffix in ('.log','.blend1') or not p.stat().st_size:continue
 role='final_proof' if p.name.startswith(('render_','composite_')) else 'iteration_evidence' if p.name.startswith(('iter','debug_','color_measurements_iter')) else 'supporting_evidence'
 outputs.append({'path':str(p),'bytes':p.stat().st_size,'sha256':sha(p),'role':role})
report={'build_id':'B-vmt3','base_build_id':'B-gwvn','status':'incomplete' if block else 'ready_for_orchestrator_review','approval':'Not approved by Nick. This is a builder pass for Claude and Nick to review.','method_in_order':['Open the approved sculpt as a read-only input and compare original mesh coordinate and topology signatures before and after. Work only in a new output file.','Reuse the pass1 largest-component barycentric transfer from the pass3 2048 atlas. Retain the solved bib, blaze and flank pattern. Apply only requested local foreleg, paw, eyelid and plume corrections, and calibrate material response using rendered patches.','Write regional length, density, comb, clump and frizz attributes. Create seeded guides and three-nearest-guide interpolated child hair curves. Keep long bib, belly and hind feathering, short face/ear/paw fur, and bare-part exclusions.','Build a volume of tail locks from roots on the rising last third of the shaft, with layered guide paths, finer subclumps, pointed tips and a spatially continuous white underside group.','Use Chiang Principled Hair with root-to-tip and individual-strand contrast over matching colored skin. Use curvature-driven bronze horn crests, dark claws, amber rounded horizontal pupils, clear corneas, 14 white whiskers and 14 small follicle curves per side.','Retain surface triangle indices, root barycentrics and orthonormal offsets on every curve. Geometry Nodes reconstructs each point from evaluated sculpt vertices. No UV map is needed.','Render in a separate swappable neutral studio with key, fill, rim and gray ground. Use CPU Cycles, measured samples and denoising. Iterate against the sheet and preserve the review findings.','Run the temporary 18-degree hind-leg bend proof without changing base mesh geometry. Render all final views and make unretouched sheet, live-pass3 and pass1 game-size comparisons.','Measure final side render color patches, validate delivery dimensions/counts/geometry/binding, and hash all outputs.'], 'iterations':read('iter_notes.json',[]),'remaining':visual.get('remaining',[])+['Orchestrator review and Nick look approval.','Reapply to the completed B-v3g9 rig in rest pose, then review its final animation poses.'],'checks':checks,'blockedBy':block,'measurements':cost,'color_measurements':read('color_measurements.json',{}),'deformation':deform,'provenance':provenance,'timing':{'started_utc':'2026-10-16T19:11:28Z','editing_cutoff_utc':'2026-10-16T20:11:28Z','hard_stop_utc':'2026-10-16T20:26:28Z','report_written_utc':datetime.datetime.now(datetime.timezone.utc).isoformat()},'outputs':outputs}
report['completion_audit']=read('completion_audit_result_pass2.json',{})
report['timing']['last_groom_edit_utc']='2026-10-16T19:54:00Z'
report['timing']['groom_edit_time_note']='Approximate minute of the final camera-only build revision. Groom and material candidate was iteration12; iteration13 restored pass1 portrait framing. Final evidence rendering and audit followed.'
if datetime.datetime.now(datetime.timezone.utc)>=datetime.datetime(2026,10,16,20,11,28,tzinfo=datetime.timezone.utc) and visual.get('status')=='needs_revision':
 report['blockedBy'].append({'reason':'User editing time limit reached','user_instruction':'Cap: 75 minutes. Stop editing at 60.','scope':'Open artistic findings retained. Technical evidence and report completed within the75-minute cap.'})
write('report.json',report);print(O/'report.json')
