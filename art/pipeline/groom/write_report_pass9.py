"""B-hxhq: write pass 9 iter_notes.json, measurements.json and report.json with output hashes."""
import json, hashlib
from pathlib import Path

D = Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass9')
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
build = json.loads((D / 'plume_build.json').read_text()); posed = json.loads((D / 'posed_check.json').read_text())
times = json.loads((D / 'render_times.json').read_text())
iters = [
    {'iteration': 1, 'seen': 'New layout: dark tufts only at the front edge (12 deg) and back (140 to 180 deg), white core covering both side faces (90 +/- 62 deg) and carried down the underside of the shaft from y 0.48, S spine, sub-clumped wavy tufts. Side view shows a clear white stripe; sprite shows white lower plume under a dark crest. Stripe narrow and left-hugging, shaft white hung below the tail as a separate band, tufts frizzy and split.', 'changed': 'White band half-width 75 deg, length up to 0.11 m, brighter white (0.58); shaft white shorter (8 to 22 mm) and flatter (18 deg); front tufts held to zero below u 0.3; fewer, tighter sub-clumps (1 to 3, 0.25 to 0.5 width), wave 0.05, curl 0.35.'},
    {'iteration': 2, 'seen': 'White lower plume under a dark crest from side, three-quarter and sprite; white tapers near 70 percent. Front edge still white up to 60 percent, where the sheet already has dark tufts on both sides of the stripe from about 40 percent.', 'changed': 'Front tufts ramp in from u 0.20 to 0.48, angled 1.15x further out so they stay outside the band; white 0.60 linear.'},
    {'iteration': 3, 'seen': 'Stripe now centered with dark tufts on both sides; top of the plume broad and blunt from the crest tufts.', 'changed': 'Tip length floor 0.18, crest lateral tufts shortened (0.70 to 0.75), out angle at the tip 12 deg, tip tufts 0.08 and 0.06 m.'},
    {'iteration': 4, 'seen': 'Pointed tip, white stripe to about 70 percent with dark on both sides, S lean (lower half back, tip forward), clumped wavy tongues, top view a soft clumped brush rather than a star. Accepted; final renders and posed frames.', 'changed': 'Final renders.'},
]
(D / 'iter_notes.json').write_text(json.dumps(iters, indent=1))
final = {f['file']: round(f['seconds'], 1) for f in times['frames'] if f['file'].startswith('render_')}
final.update({k + '.png': round(v['seconds'], 1) for k, v in posed['frames'].items()})
meas = {'build_id': 'B-hxhq', 'device': 'CPU, 6 threads (Cycles), no GPU used', 'peak_gpu_memory_gb': None, 'host_peak_gib_render': max(f['host_peak_gib'] for f in times['frames']),
        'denoise': 'OpenImageDenoise on all views except the 768 px sprite (128 samples, no denoise, downscaled to 192 with Lanczos)', 'samples': {'final': 64, 'sprite': 128, 'posed': 48, 'preview': 32},
        'plume_strands': {'dark_tuft_strands': build['dark_strands'], 'white_core_strands': build['white_core_strands'], 'tufts': build['tufts'], 'points_per_strand': build['points_per_strand']},
        'render_seconds_per_frame': final}
(D / 'measurements.json').write_text(json.dumps(meas, indent=1))
outputs = sorted([p for p in D.rglob('*') if p.is_file() and p.suffix in ('.png', '.json', '.blend', '.py', '.md', '.sh', '.npz') and not p.name.startswith('iter') and not p.name.startswith('board_iter') and p.name != 'report.json' and 'logs_' not in p.name and not p.name.endswith('.blend1')])
tool = Path('C:/dev/src/xalians-creature-pipeline/art/pipeline/groom')
tools = ['build_plume_pass9.py', 'posed_pass8.py', 'compose_pass9.py', 'board_pass8.py', 'write_report_pass9.py']
report = {
 'build_id': 'B-hxhq', 'defect': 'D-gnev', 'builder': 'Claude agent', 'pass': 9,
 'inputs': {'sculpt': {'path': 'C:/dev/art-data/pipeline/codex-stream/luceras-neck/pass2/luceras_sculpt.blend', 'sha256': sha(Path('C:/dev/art-data/pipeline/codex-stream/luceras-neck/pass2/luceras_sculpt.blend'))},
            'rig': {'path': 'C:/dev/art-data/pipeline/codex-stream/luceras-neck/pass2/rig.blend', 'sha256': sha(Path('C:/dev/art-data/pipeline/codex-stream/luceras-neck/pass2/rig.blend'))},
            'clips': {'path': 'C:/dev/art-data/pipeline/codex-stream/luceras-neck/pass2/clips.blend', 'sha256': sha(Path('C:/dev/art-data/pipeline/codex-stream/luceras-neck/pass2/clips.blend'))}},
 'method': [
  'Base: pass 8 paws_groom.blend (pass 7 groom reapplied to the luceras-neck pass2 sculpt), read only. The plume is rebuilt by art/pipeline/groom/build_plume_pass9.py (pass 8 script plus the changes below) with plume_parameters.json; it removes the 54 pass 5 plume objects as in pass 8.',
  'Spine (S): tail centerline measured on the sculpt from y 0.45 (0.245 m on the sculpt) and continued 0.384 m through spine_extension_yz: the curl rises, the lower plume leans back to y 0.738, the upper half curves forward to the tip at (0, 0.675, 0.668).',
  'Spine proxy: luceras_plume_spine as in pass 8 (hidden tube, parent and Armature modifier on luceras_rig, sculpt part copies nearest tail weights). New: along the extension the weight blends from tail_06 toward tail_05, reaching 35 percent tail_05 at the tip (ext_tail05_share), so the extension bends behind tail_06 in the whip without new bones.',
  'Dark tufts rooted outside the white band: front edge at +/-12 deg (ramping in from u 0.20 to 0.48, angled 1.15x outward), back at 140, 160 and 180 deg; crest tufts at +/-50 and +/-90 deg only above u 0.62, so the top is dark all round. Tufts are coarser flame tongues: center line waves (amplitude 0.05 x length, 0.8 to 1.6 periods) and curls (0.35 phase-shifted), width varies 0.65 to 1.4x, children split into 1 to 3 sub-clumps that fork off and end at their own points. 82863 dark strands, 257 tufts.',
  'White core: 90000 pure white strands (no grey mixing, 0.60 linear, tips 1.25x) in locks of 30 covering both side faces (90 +/- 75 deg), 0.035 to 0.11 m, 30 deg out; band half-width tapers to 14 deg and length to 40 percent at u 0.70, ending in a point at 70 percent. Below the plume the band turns to the underside of the shaft (centered 180 deg) and runs back to y 0.48, 8 to 22 mm long, 18 deg out.',
  'Board each iteration (scripts/plume.sh): plume close side, three-quarter, front, back, top; full side and three-quarter; 192 px sprite. Composites put pass 8 finals beside pass 9 and the sheet (compose_pass9.py).',
  'Posed frames: art/pipeline/groom/posed_pass8.py (unchanged) on clips.blend: signature apex frame 25, idle largest tail sway frame 79.',
  'Renders: CPU Cycles, 6 threads, 64 samples with OpenImageDenoise (sprite 768 px, 128 samples, no denoise, Lanczos to 192), pass 5 neutral studio.'],
 'spine_rig_attachment': 'Hidden proxy tube luceras_plume_spine with an Armature modifier on luceras_rig. Sculpt part: nearest tail vertex weights (tail and spine bones), so it bends with the tail skin. Extension (0.384 m): weight blends from 1.0 tail_06 at the tail tip to 0.65 tail_06 + 0.35 tail_05 at the plume tip, so the plume lags and bends behind the last bone in the whip. All plume strands are bound to proxy triangles. No bones added; rig and clips unchanged.',
 'checks': {
  'body_geometry_unchanged': build['body_unchanged'], 'nonfinite_points': build['checks']['nonfinite'],
  'left_right_roots': {'dark': [build['checks']['left_dark'], build['checks']['right_dark']], 'white': [build['checks']['left_white'], build['checks']['right_white']], 'note': 'dark difference comes from the 180 deg back tufts whose roots straddle x = 0 plus per-tuft random length/child count; the tuft layout is mirrored'},
  'plume_extent_m': {'top_z': build['checks']['plume_top_z_m'], 'y': build['checks']['plume_y_extent_m'], 'x': build['checks']['plume_x_extent_m']},
  'posed_binding': {k: {'action': v['action'], 'frame': v['frame'], 'tail_06_angle_from_rest_deg': round(v['tail_06_angle_from_rest_deg'], 1), 'dark_root_error_max_mm': v['plume_binding']['Plume tufts dark']['root_error_max_mm'], 'white_root_error_max_mm': v['plume_binding']['Plume white core']['root_error_max_mm'], 'dark_length_change_max_pct': v['plume_binding']['Plume tufts dark']['length_change_max_pct'], 'plume_max_move_mm': v['plume_binding']['Plume tufts dark']['max_point_move_mm']} for k, v in posed['frames'].items()},
  'spine_reference_curve_note': 'Plume spine curve reports 7.8 mm root error by construction: its first point is on the tube axis, its binding root is the nearest tube surface point. It is hidden and only a reference.',
  'neck': 'composite_neck_pass8_pass9.png: same body groom as pass 8 (paws_groom.blend), fur continuous over the fixed seam.',
  'bald_patches_floating_strands_spikes': 'none seen on the final board; tuft tips are intended points'},
 'iterations': iters,
 'render_seconds_per_frame': final,
 'remains': [
  'White core area: the stripe now runs up the center with dark on both sides and ends in a point near 70 percent, but it is narrower than the sheet. A crude pixel count gives white about 8 percent of plume pixels against about 12.5 percent on the sheet crop; the sheet lower plume is white across most of its width, ours keeps dark back tufts down to the base.',
  'White value: brightest stripe pixels about sRGB 212 to 216 (sheet 219 to 224); in the middle of the band the strands shade to about 175 to 185 in the side light, so the edge is crisp but the band is not uniformly bright.',
  'Sprite: reads as a white lower plume under a dark crest, but the white is a thin stripe at 192 px; the sheet sprite shows a broad white lower half.',
  'Silhouette: the S is present (curl into plume, lower half back, tip forward), but the sheet plume is narrower at the base and widest higher up; ours is widest in the middle and the top half is broader than the sheet.',
  'Tufts: now clumped wavy tongues and the top view is a soft clumped brush, not a star; they are still finer and more frizzy at the tips than the sheet painted clumps.',
  'Motion: the tail_05/tail_06 split bends the extension a little in the whip (visible at the signature apex), but it is linear blend skinning far from the joints, not a real chain; extra tail bones would still be the proper fix. In the apex frame the bottom of the plume, where front tufts are absent, reads thin from that angle.',
  'Front view is still mostly hidden by the head; depth is judged from top and back.',
  'Body coat outside the plume is unchanged from pass 8 (pass 7 groom reapplied).'],
 'blockedBy': [],
 'tooling': {t: sha(tool / t) for t in tools},
 'outputs': {str(p.relative_to(D)).replace('\\', '/'): sha(p) for p in outputs},
}
(D / 'report.json').write_text(json.dumps(report, indent=1))
print(D / 'report.json', len(report['outputs']))
