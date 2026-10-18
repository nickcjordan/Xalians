"""Validate B-pq45 delivery and hash artifacts. No git calls."""
from pathlib import Path
from PIL import Image
import json,hashlib,datetime,shutil
O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass3');T=Path('C:/dev/src/xalians-creature-pipeline/art/pipeline/groom')
read=lambda n:json.loads((O/n).read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
expected={'side':(1374,1145),'three_quarter':(1374,1145),'front':(1145,1145),'head':(1145,1145),'hind_leg':(1145,1145),'tail_plume':(1145,1145),'portrait':(512,512),'sprite':(192,192)}
checks={'build_id':'B-pq45'}
checks['dimensions']={v:{'expected':list(size),'actual':list(Image.open(O/('render_'+v+'.png')).size),'passed':Image.open(O/('render_'+v+'.png')).size==size} for v,size in expected.items()}
checks['sheet_composites']=all((O/('composite_'+v+'_vs_sheet.png')).exists() for v in expected)
checks['live_composites']=all((O/('composite_'+v+'_vs_live_pass3.png')).exists() for v in ('side','three_quarter'))
checks['previous_pass_composites']=all((O/('composite_'+v+'_vs_pass2.png')).exists() for v in ('sprite','portrait'))
checks['three_column_composite']=(O/'composite_side_pass2_pass3_sheet.png').exists()
checks['approved_source_unchanged']=sha(Path('C:/dev/art-data/pipeline/codex-stream/luceras-merge/revert-forelegs/luceras_sculpt.blend'))=='d1203576f1f786fb8ae68097dde1e9fe344db0c6108b5077c0f9524d58a35754'
checks['original_mesh_geometry_unchanged']=read('geometry_check.json')['unchanged']
checks['surface_attachment_bend_passed']=read('deformation_check.json')['passed']
checks['whole_dark_coat_within_4_levels']=read('color_measurements.json')['all_within_4_levels']
frames={f['file']:f for f in read('measurements.json')['frames'] if f['file'].startswith('render_')};stats=read('groom_statistics.json')
checks['all_final_frames_match_groom_iteration']=len(frames)==8 and all(str(f.get('iteration'))==str(read('build_state.json')['iteration'])=='11' for f in frames.values());checks['eight_final_frames_measured']=checks['all_final_frames_match_groom_iteration']
checks['cpu_samples_denoise']=all(f['device']=='CPU' and f['samples']==(read('parameters.json').get('samples_tail_final',read('parameters.json')['samples_final']) if f['view']=='tail_plume' else read('parameters.json')['samples_final']) and f['denoise'] and f['seconds']>0 for f in frames.values())
checks['finite_strands']=stats['nonfinite_points']==0
checks['eye_clearance_positive']=stats['eye_clearance_min_m']>0
checks['count_consistent']=stats['rendered_strands']==stats['children']+stats['whiskers']+stats['follicle_curves']
checks['tooling_matches']={name:sha(O/name)==sha(T/dst) for name,dst in [('build_groom.py','build_groom_pass3.py'),('parameters.json','parameters_pass3.json'),('compose_proof.py','compose_pass3.py'),('measure_colors.py','measure_pass3.py')]}
checks['technical_delivery_passed']=all(x['passed'] for x in checks['dimensions'].values()) and all(checks[k] for k in ['sheet_composites','live_composites','previous_pass_composites','three_column_composite','approved_source_unchanged','original_mesh_geometry_unchanged','surface_attachment_bend_passed','eight_final_frames_measured','cpu_samples_denoise','finite_strands','eye_clearance_positive','count_consistent']) and all(checks['tooling_matches'].values())
(O/'delivery_checks.json').write_text(json.dumps(checks,indent=2))
visual=read('visual_review.json');report={'build_id':'B-pq45','base_build_id':'B-vmt3','status':visual['status'],'approval':'Builder revision for orchestrator and Nick. No art-director approval claimed.','method_in_order':['Resume pass3 iteration7 after reading iter_notes.json and build_state.json. Preserve iteration7 groom and script snapshots. Continue its deterministic builder using the unchanged approved sculpt and original game atlas.','Preserve source mesh signatures. Transfer atlas color with the established barycentric projection and retain the existing regional pattern refinements.','Use four times body/neck guide density for approximately half clump diameter, varied guide directions and sizes, plus independent loose fibers. Keep surface triangle and barycentric attachment for every curve.','Calibrate dark hair response and root-to-tip contrast independently of pale pattern using spatial whole-coat masks. Compare mean and 25th,50th,75th sRGB luminance percentiles against the sheet.','Refine socket fur, dark lid material, horizontal pupil, amber iris and glossy cornea without changing source mesh geometry.','Build layered shaft-rooted plume guides, overlapping short visible tufts and a wider white inner band.','Use the separate neutral studio collection and CPU Cycles. Record actual per-frame times, samples, denoising and process peak host memory. Total GPU memory is unmeasured; no Cycles GPU device is used.','Render all final views and a temporary 18-degree bent hind-leg proof. Make unretouched sheet, runtime, pass2 and three-column comparisons.','Review checklist, verify source signatures, binding and outputs, and record hashes.'],'iterations':read('iter_notes.json'),'what_still_remains':visual.get('remaining',[]),'checks':checks,'checklist':visual['checklist'],'blockedBy':[],'time_limit':{'original_started_utc':'2026-10-16T20:13:25Z','resume_started_utc':'2026-10-16T20:53:07Z','editing_cutoff_utc':'2026-10-16T21:26:07Z','hard_stop_utc':'2026-10-16T21:38:07Z'},'color_measurements':read('color_measurements.json'),'costs':read('measurements.json'),'outputs':[]}
for p in sorted(O.iterdir()):
 if p.is_file() and p.name!='report.json' and p.suffix not in ['.blend1','.pyc']:
  report['outputs'].append({'path':str(p),'bytes':p.stat().st_size,'sha256':sha(p)})
report['written_utc']=datetime.datetime.now(datetime.timezone.utc).isoformat();(O/'report.json').write_text(json.dumps(report,indent=2));print(json.dumps(checks,indent=2))
