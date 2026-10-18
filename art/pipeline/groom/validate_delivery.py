"""Read-only delivery checks. Never invokes git or Blender."""
import json,hashlib
from pathlib import Path
from PIL import Image
HERE=Path(__file__).resolve().parent
OUT=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass1')
SOURCE=OUT.parents[1]/'luceras-merge/revert-forelegs/luceras_sculpt.blend'
def read(name):return json.loads((OUT/name).read_text())
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
checks={}
expected={'side':(1374,1145),'three_quarter':(1374,1145),'front':(1145,1145),'head':(1145,1145),'hind_leg':(1145,1145),'tail_plume':(1145,1145),'portrait':(512,512),'sprite':(192,192)}
checks['render_dimensions']={v:{'expected':size,'actual':Image.open(OUT/('render_'+v+'.png')).size,'passed':Image.open(OUT/('render_'+v+'.png')).size==size} for v,size in expected.items()}
checks['all_sheet_composites']=all((OUT/('composite_'+v+'_vs_sheet.png')).is_file() for v in expected)
checks['both_runtime_composites']=all((OUT/('composite_'+v+'_vs_live_pass3.png')).is_file() for v in ('side','three_quarter'))
checks['approved_source_sha256']=sha(SOURCE)
checks['reference_hashes_verified']=all(r['hash_verified'] for r in read('input_provenance.json').values())
checks['source_unchanged']=checks['approved_source_sha256']=='d1203576f1f786fb8ae68097dde1e9fe344db0c6108b5077c0f9524d58a35754'
checks['all_original_mesh_signatures_unchanged']=read('geometry_check.json')['unchanged']
checks['attachment_proof_passed']=read('deformation_check.json')['passed']
checks['tooling_matches_delivered']={n:sha(HERE/n)==sha(OUT/n) for n in ('build_groom.py','parameters.json','REAPPLY.md','compose_proof.py')}
frames={f['file']:f for f in read('measurements.json')['frames'] if f['file'].startswith('render_')}
checks['all_final_frames_measured']=len(frames)==8
checks['all_final_frames_cpu_96_samples_denoised']=all(f['device']=='CPU' and f['samples']==96 and f['denoise'] and f['seconds']>0 for f in frames.values())
stats=read('groom_statistics.json');checks['strand_count_consistent']=stats['rendered_strands']==stats['children']+stats['whiskers']
checks['no_nonfinite_strand_points']=stats['nonfinite_points']==0
checks['eye_clearance_positive']=stats['eye_clearance_min_m']>0
checks['independent_final_review_present']=(OUT/'independent_review_final.json').is_file()
checks['technical_delivery_passed']=all(v['passed'] for v in checks['render_dimensions'].values()) and all(checks[k] for k in ('all_sheet_composites','both_runtime_composites','source_unchanged','reference_hashes_verified','all_original_mesh_signatures_unchanged','attachment_proof_passed','all_final_frames_measured','all_final_frames_cpu_96_samples_denoised','strand_count_consistent','no_nonfinite_strand_points','eye_clearance_positive','independent_final_review_present')) and all(checks['tooling_matches_delivered'].values())
checks['scope']='These checks establish delivery integrity and measured technical properties. They do not certify a model-sheet look match or Nick approval.'
(OUT/'delivery_checks.json').write_text(json.dumps(checks,indent=2));print(json.dumps(checks,indent=2))
