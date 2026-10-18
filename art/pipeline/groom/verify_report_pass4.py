from pathlib import Path
import json,hashlib
O=Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass4')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
r=json.loads((O/'report.json').read_text());bad=[x['path'] for x in r['outputs'] if sha(Path(x['path']))!=x['sha256']]
a=json.loads((O/'audit_evidence_pass4.json').read_text());stale=[n for n,h in a['artifact_hashes'].items() if sha(O/n)!=h]
i=json.loads((O/'independent_review_final.json').read_text(encoding='utf-8-sig'));stale_review=[n for n,h in i['evidence_sha256'].items() if sha(O/n)!=h]
assert not bad and not stale and not stale_review,(bad,stale,stale_review)
assert r['checks']['all_final_frames_current'] and r['checks']['surface_attachment_bend_passed']
assert r['status']=='needs_revision_time_capped' and not r['checks']['technical_delivery_passed']
assert not (O/'invocation_build_iter6.json').exists()
assert '\u2014' not in (O/'report.json').read_text() and '\\u2014' not in (O/'report.json').read_text()
print(json.dumps({'report_output_hashes_verified':len(r['outputs']),'audit_evidence_current':True,'independent_evidence_current':True,'all_final_images_iteration':r['costs']['final_iteration'],'gpu_peak_sampled_gib':r['costs']['peak_gpu_memory_gib'],'status':r['status']}))
