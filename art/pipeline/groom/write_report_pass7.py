import json, hashlib, glob, os
os.chdir('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass7')
sha = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()
notes = json.load(open('iter_notes.json'))
fr = json.load(open('measurements_frames.json'))['frames']
final = [f for f in fr if f['file'].startswith('render_')]
pc = json.load(open('paw_checks.json')); pres = json.load(open('preservation_check.json'))
gs = json.load(open('base/groom_statistics.json'))
dc = json.load(open('deformation_check.json')) if os.path.exists('deformation_check.json') else None
m = {'build_id': 'B-j5p6', 'device': 'CPU Cycles, 6 threads; gpu slot held, no GPU render allocations',
     'denoise': 'OpenImageDenoise on close and full views at 64 samples; sprite 128 samples, no denoise, 768 px reduced to 192 px with Lanczos',
     'paw_strands_added': pc['strands'], 'paw_points_per_strand': pc['points'], 'pass5_toe_strands_hidden': pres['pass5_toe_strands_hidden'],
     'inherited_groom_statistics': gs, 'final_frames': final, 'peak_gpu_memory': 'not applicable, CPU render',
     'deformation_frames_seconds': {p: {k: v for k, v in r.items() if k.endswith('seconds')} for p, r in dc['poses'].items()} if dc else None,
     'all_frames_including_previews': fr}
json.dump(m, open('measurements.json', 'w'), indent=1)
src = 'C:/dev/art-data/pipeline/codex-stream/luceras-pawintegrate/pass3/luceras_sculpt.blend'
rig = 'C:/dev/art-data/pipeline/codex-stream/luceras-pawintegrate/pass3/rig.blend'
r = json.load(open('report_body.json'))
r.update({'build_id': 'B-j5p6', 'builder': 'Claude agent',
          'input_sculpt': {'path': src, 'sha256': sha(src), 'note': 'B-yqgg pass 3: approved skeleton-first paws welded in; topology changed (211257 verts)'},
          'input_rig': {'path': rig, 'sha256': sha(rig)},
          'iterations': notes,
          'render_seconds_per_frame': {f['file']: round(f['seconds'], 1) for f in final}})
r['checks'].update({'ground_clipping': 'min strand z %.4f m' % pc['min_point_z_m'], 'left_right': 'left %d, right %d strands' % (pc['left'], pc['right']),
                    'nonfinite_points': pc['nonfinite'], 'mesh_and_inherited_curves_unchanged': pres['inherited_mesh_positions_topology_and_curve_data_unchanged'],
                    'coat_color_above_85mm_unchanged': pres['coat_color_above_paw_region_unchanged'],
                    'base_geometry_unchanged': json.load(open('base/geometry_check.json'))['unchanged'],
                    'deformation': {p: {'frame': v['frame'], 'binding': v['binding']} for p, v in dc['poses'].items()} if dc else 'not run',
                    'rig_rest_matches_groom_body': dc['rig_rest_matches_groom_body'] if dc else None})
outs = sorted(glob.glob('render_*.png') + glob.glob('composite_*.png') + glob.glob('deform_*.png') + ['groom.blend', 'build_paws.py', 'parameters.json', 'compose_proof.py', 'iter_notes.json',
              'measurements.json', 'preservation_check.json', 'paw_checks.json', 'toe_axes.json', 'deformation_check.json', 'REAPPLY.md', 'base/groom.blend', 'base/build_groom_pass5.py',
              'base/parameters_pass5.json', 'scripts/profile.txt'])
r['outputs'] = {o: sha(o) for o in outs if os.path.exists(o)}
json.dump(r, open('report.json', 'w'), indent=1)
print(json.dumps(r['render_seconds_per_frame'], indent=1))
