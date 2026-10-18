"""Assemble the evidence manifest only from completed files and explicit review notes."""
import json,hashlib,datetime
from pathlib import Path
OUT=Path(r'C:\dev\art-data\pipeline\codex-stream\luceras-rig\pass1')
HERE=Path(__file__).parent
def load(n):return json.loads((OUT/n).read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 evidence=['measurements.json','glb_check.json','bake_test.json','geometry_preservation.json','iter_notes.json']
 absent=[n for n in evidence if not (OUT/n).exists()]
 if absent:
  files=[dict(path=str(p),bytes=p.stat().st_size,sha256=sha(p)) for p in sorted(OUT.iterdir()) if p.is_file() and p.name!='report.json']
  report=dict(build_id='B-v3g9',stage=8,status='incomplete_with_evidence',method=['Inspected source files and inherited rig.','Rendered and reviewed own baseline.','Prepared the source-preserving skin refinement, control, bake, export and validation scripts. See logs for completed execution.'],remaining=absent,blockedBy=['Required evidence is incomplete at the user deadline. Shared heavy-job slot contention consumed part of the run.'],checks={'complete':False},outputs=files,iterations=load('iter_notes.json').get('iterations',[]),finished_utc=datetime.datetime.now(datetime.timezone.utc).isoformat())
  (OUT/'report.json').write_text(json.dumps(report,indent=2));print(OUT/'report.json');return
 m=load('measurements.json');v=load('glb_check.json');b=load('bake_test.json');geom=load('geometry_preservation.json');notes=load('iter_notes.json')
 required=['rig.blend','luceras_rigged.glb','deformation_sheet.png','measurements.json','iter_notes.json','gltf_validation.json','final_crouch_closeups.png','final_leap_closeups.png']
 required += ['final_'+pose+'_pair.png' for pose in ['rest','crouch','leap','landing','head_left_up','tail_side_up','foreleg_step','breath_in']]
 required += ['final_'+pose+'_neck_under_jaw_pair.png' for pose in ['crouch','leap']]
 missing=[n for n in required if not (OUT/n).exists()]
 checks=dict(m['checks'],gltf_validator=v['passed'],control_bake=b['passed'],geometry_preserved=geom['all_exact'],world_bind_preserved=load('bind_preservation.json')['passed'],required_files=not missing)
 freshness=load('artifact_freshness.json') if (OUT/'artifact_freshness.json').exists() else {'passed':False}
 checks['selected_iteration_freshness']=freshness['passed']
 runtime=load('runtime_check.json')
 checks['threejs_browser_smoke_test']=runtime['browser_smoke_test']=='passed'
 checks['exported_animation_cpu_skinning']=load('glb_skinning_check.json')['passed']
 remains=notes.get('remaining',[]);blocked=[k for k,x in checks.items() if not x]+remains
 inputs=[]
 for name,path,expected in [('sculpt',Path(r'C:\dev\art-data\pipeline\codex-stream\luceras-merge\revert-forelegs\luceras_sculpt.blend'),'d1203576f1f786fb8ae68097dde1e9fe344db0c6108b5077c0f9524d58a35754'),('game',Path(r'C:\dev\art-data\pipeline\codex-stream\luceras-gamemesh\pass6\gamemesh.blend'),'294527ef89b8711ba0e94edb8981bde76a0e3be5126ddb86e35ed1346636cc4f')]:
  digest=sha(path);inputs.append(dict(name=name,path=str(path),sha256=digest,unchanged=digest==expected))
 checks['sources_unchanged']=all(i['unchanged'] for i in inputs)
 if not checks['sources_unchanged']:blocked.append('Source hash mismatch')
 outputs=[dict(path=str(p),bytes=p.stat().st_size,sha256=sha(p)) for p in sorted(OUT.iterdir()) if p.is_file() and p.suffix in ('.png','.json','.glb','.blend','.txt','.html') and p.name!='report.json']
 report=dict(build_id='B-v3g9',stage=8,status='ready_for_orchestrator_review' if not blocked else 'incomplete_with_evidence',approval='Not approved. Claude reviews the pass; Nick approves the deformation sheet.',inputs=inputs,method=[
 'Read the stage 8 design and existing game-mesh bend evidence. Inspect both source files in Blender 5.2.2 through the shared slot.',
 'Reuse all 40 named joints. Review rest pivot overlays and extreme bends against the sculpt. Preserve both bodies as separate collections.',
 'Convert sculpt bone-parented accessories to one-bone skinning without changing their world rest positions. Refine body weights on existing edges, enforce rigid ear blades and resample the final sculpt weights onto the game body.',
 'Limit game skinning to four influences, retain smooth multi-influence sculpt weights, and normalize every vertex. Preserve all source mesh coordinates, vertex ordering, polygon topology, UVs and connected parts.',
 'Build a separate Blender control armature with IK feet and poles, root, body, head look, three tail controls and ears. Bake a control-driven test and compare evaluated matrices.',
 'Bake the eight review poses to the deform skeleton. Export only that skeleton and game meshes. Validate the GLB with the installed Khronos validator.',
 'Reopen the delivered rig, compare its baked deformation to the weighted checkpoint, measure rigid parts and paired body motion, render Cycles clay pairs and closeups, and inspect the images.'
 ],iterations=notes['iterations'],remaining=remains,budgets=dict(joints=dict(actual=m['joints'],limit=40),game_influences=dict(actual=m['bodies']['game']['max_influences'],limit=4),unweighted_vertices=dict(actual=sum(x['unweighted_vertices'] for x in m['bodies'].values()),limit=0),game_triangles=dict(actual=m['bodies']['game']['triangles'],limit=12000,frozen_input=11478),sculpt_triangles=dict(actual=m['bodies']['sculpt']['triangles'],limit=None),sculpt_shape_keys=dict(actual=m['bodies']['sculpt']['shape_keys'],limit=8),sprite_only_bones=dict(actual=len(m['sprite_only_bones']),limit=None)),checks=checks,blockedBy=blocked,outputs=outputs,tooling=[dict(path=str(p),sha256=sha(p)) for p in sorted(HERE.iterdir()) if p.suffix in ('.py','.mjs','.txt')],cost=dict(started_local='2026-10-16T12:43:00-05:00',finished_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),paid_services=0,installs=0,agent_token_usage='Not exposed by this runtime',notes='Slot wait is included in wall time. No slot was held for human or model review.'))
 report['budgets']['materials']=dict(actual=v.get('materials'),limit=2)
 report['selected_iteration']=notes.get('selected_iteration')
 report['runtime_check']=runtime
 report['sculpt_game_correspondence']=m['sculpt_game_correspondence']
 report['whole_closed_volume_per_pose']=m['whole_closed_volume_per_pose']
 report['budgets']['sculpt_influences']=dict(actual=m['bodies']['sculpt']['max_influences'],limit=None,note='Offline sculpt skinning keeps all normalized blends. The four-influence cap applies only to the game mesh.')
 report['budgets']['texture_dimensions']=dict(actual=v.get('images'),limit=[1024,1024])
 report['budgets']['raw_glb_bytes']=dict(actual=v.get('fileBytes'),compressed_delivery_target=409600,note='Stage 8 raw GLB with inherited PNG maps. Stage 10 compression and texture packaging are not performed here.')
 (OUT/'report.json').write_text(json.dumps(report,indent=2))
 print(OUT/'report.json')
if __name__=='__main__':main()
