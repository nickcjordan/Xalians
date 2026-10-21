"""B-hxhq: write pass 8 iter_notes.json, measurements.json and report.json with output hashes."""
import json, hashlib
from pathlib import Path

D = Path('C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass8')
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
build = json.loads((D / 'plume_build.json').read_text()); posed = json.loads((D / 'posed_check.json').read_text())
times = json.loads((D / 'render_times.json').read_text())
iters = [
    {'iteration': 1, 'seen': 'Spine, bottlebrush and tip read on every view, but the plume was 0.79 body lengths tall (sheet 0.5), a narrow banana leaning back then forward, every strand a uniform mid gray and no white core visible anywhere.', 'changed': 'Spine extension lowered and shortened to sheet proportions measured against body length (tip z 0.65), max tuft 0.095 m, 360 children per tuft, dark color 0.03 linear, hair roughness 0.62, IOR 1.45, no coat.'},
    {'iteration': 2, 'seen': 'Dark slate now, proportions closer, but narrow crescent (width/height 0.22 vs sheet 0.36), comb-like spikes at the curl base, white only visible in three-quarter.', 'changed': 'Tip bend 0.55 to 0.30, out angle 34 at the base rising to 56 mid, length floor 0.12 at the base to 0.32 at the tip, front tufts ramped short low on the plume, white core longer (0.03 to 0.07) and more outward.'},
    {'iteration': 3, 'seen': 'Wider leaf shape, white core visible from three-quarter and the lower front in side; spine still hooks forward at the top.', 'changed': 'Straighter spine (tip y 0.683), back tufts 1.12 to 1.15 length, lateral tufts moved to 130 deg, white azimuth to 118 deg.'},
    {'iteration': 4, 'seen': 'Leaf silhouette close to the sheet; front edge lacked dark tufts and tufts read as thin needles.', 'changed': 'Front tufts at 52 deg angled out 1.3x so they flank the white instead of covering it; tuft width 0.19 x length (max 20 mm), 460 children.'},
    {'iteration': 5, 'seen': 'Solid flame silhouette with pointed clumps, dense from all views, but the white core was hidden again behind the wider tufts.', 'changed': 'White roots on the front tufts (white_root attribute, white to dark along each strand).'},
    {'iteration': 6, 'seen': 'Three-quarter reads white core and dark sides; side still dark in the upper half.', 'changed': 'White roots also on the 130 deg lateral tufts (0.85).'},
    {'iteration': 7, 'seen': 'Little change: the white roots sit inside the volume, covered by neighbouring tuft mid-lengths.', 'changed': 'White root fade moved out to 0.45-0.80 of strand length.'},
    {'iteration': 8, 'seen': 'Too white and muddy gray in three-quarter, no crisp band; side mixed gray.', 'changed': 'Fade 0.30-0.50, lateral weight 0.75, brighter white (0.56 linear), max tuft 0.105.'},
    {'iteration': 9, 'seen': 'Three-quarter: white center, dark sides, close to the sheet; side white only on the lower front.', 'changed': 'White core strands 0.04 to 0.095 m, out 46 deg, azimuth 125 deg, ending at u 0.82.'},
    {'iteration': 10, 'seen': 'Side shows a white center-front stripe up to about 60 percent of the plume with dark back and dark pointed tip; three-quarter white core flanked by dark tufts; sprite shows a dark flame with a lighter center. Accepted as final for this pass; posed frames from the clips confirm the plume follows the tail.', 'changed': 'Final renders.'},
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
tools = ['build_plume_pass8.py', 'posed_pass8.py', 'compose_pass8.py', 'board_pass8.py', 'inspect_tail_pass8.py', 'check_attrs_pass8.py', 'write_report_pass8.py']
report = {
 'build_id': 'B-hxhq', 'defect': 'D-gnev', 'builder': 'Claude agent', 'pass': 8,
 'inputs': {'sculpt': {'path': 'C:/dev/art-data/pipeline/codex-stream/luceras-neck/pass2/luceras_sculpt.blend', 'sha256': sha(Path('C:/dev/art-data/pipeline/codex-stream/luceras-neck/pass2/luceras_sculpt.blend'))},
            'rig': {'path': 'C:/dev/art-data/pipeline/codex-stream/luceras-neck/pass2/rig.blend', 'sha256': sha(Path('C:/dev/art-data/pipeline/codex-stream/luceras-neck/pass2/rig.blend'))},
            'clips': {'path': 'C:/dev/art-data/pipeline/codex-stream/luceras-neck/pass2/clips.blend', 'sha256': sha(Path('C:/dev/art-data/pipeline/codex-stream/luceras-neck/pass2/clips.blend'))}},
 'method': [
  'Part 1, reattach: ran the pass 7 REAPPLY steps unchanged on the neck-fixed sculpt (scripts/reapply.sh): base/build_groom_pass5.py with base/parameters_pass5.json (byte copies from pass 7) into base/, then build_paws.py with parameters.json (byte copies) into paws_groom.blend. Binding is by nearest triangle and position, so strands in the neck band are regrown on the moved surface. base/geometry_check.json reports the sculpt unchanged.',
  'Part 2, plume (art/pipeline/groom/build_plume_pass8.py, plume_parameters.json): opens paws_groom.blend, deletes the 54 pass 5 plume objects (Plume tuft/guide/undercoat/transition) and adds a Delete Geometry modifier on plume_tone > 1.01 to the interpolated coat as a guard (it finds 0 such curves in this groom; curve data untouched).',
  'Spine: the tail centerline is measured from sculpt cross sections along the tail bones (y 0.55 to the tail tip, 0.132 m on the sculpt) and continued by a Catmull-Rom curve through spine_extension_yz to the plume tip at (0, 0.683, 0.660), 0.358 m beyond the sculpt. Proportions measured against body length on the sheet side view: plume height about 0.5 body lengths, width about 0.4 of its height, tip leaning forward. Saved as plume_spine.npz and as the hidden reference curve object Plume spine curve.',
  'Spine proxy: luceras_plume_spine, a hidden 10-sided tube mesh along the spine (radius equals the tail radius on the sculpt part, 3.5 to 1.2 mm beyond it). It is parented to luceras_rig like the body and has an Armature modifier on luceras_rig. Vertex groups: on the sculpt part each vertex copies the tail and spine weights of the nearest sculpt vertex, blended over the last 15 mm to tail_06; the extension is weighted 1.0 to tail_06 (the last tail bone). Every plume strand binds to a proxy triangle (barycentric root plus triangle-frame offsets, the pass 5 Geometry Nodes method), so the plume moves with tail_01..tail_06.',
  'Tufts: 30 stations along the plume, 7 tufts per station at azimuths 52, 130, 155 and 180 degrees from the inner (concave) face, both sides, alternately staggered 14 degrees; plus 3 tip tufts along the spine tangent. Each tuft has a station, side, out angle (34 deg at the base, 55 to 60 mid, 18 at the tip, front tufts 1.3x), a tip-ward bend, a length from a short-long-short profile peaking at about 55 percent of the plume (max 0.105 m, back tufts 1.15x), a width of 0.19 x length (4 to 20 mm) and a color. Children (up to 460) are generated only inside their own tuft: center strands longest, outer strands end earlier, so each tuft is a pointed clump. 75523 dark strands, 12 points each.',
  'White core: 54000 shorter strands (0.04 to 0.095 m) in locks of 30, rooted on the inner face within 125 degrees of the concave direction from low on the shaft (y 0.565) to 82 percent of the plume, lying along the spine at 46 degrees out. Front and lateral tufts carry a white_root weight (white for the first 30 to 50 percent of the strand) so the band reads through the tuft roots.',
  'Materials: Principled Hair (Chiang, color parametrization), dark slate 0.030 linear, white 0.56 linear (about sRGB 195), tips 1.25x lighter than roots, per-tuft tone 0.8 to 1.2, roughness 0.62, IOR 1.45, no coat.',
  'Review board each iteration (scripts/plume.sh): plume close side, three-quarter, front, back and top (review cameras built in code at render time), full side and three-quarter on the sheet cameras, 192 px sprite. Pass 7 rendered on the same plume cameras for the composites.',
  'Posed frames (art/pipeline/groom/posed_pass8.py): appends the groom curves, the spine proxy, studio and world into clips.blend (read only, not saved), retargets body trees to the clip body and the proxy Armature modifier and parent to the clip rig, renders sig.horns-first-descent at its apex (frame 25, highest spine_03) and idle at its largest tail_06 swing (frame 79), and measures root binding on the evaluated proxy.',
  'Renders: CPU Cycles, 6 threads, 64 samples with OpenImageDenoise (sprite 768 px, 128 samples, no denoise, Lanczos to 192), the pass 5 swappable neutral studio.'],
 'spine_rig_attachment': 'The plume spine is a hidden proxy tube (luceras_plume_spine) with an Armature modifier on luceras_rig. Over the sculpt tail it copies the nearest tail vertex weights (tail_04..tail_06 and spine), so it bends exactly like the tail skin; the 0.358 m extension beyond the sculpt tail tip is weighted 1.0 to tail_06, the last tail bone, because the sculpt tail ends where the plume begins. All plume strands are bound to proxy triangles, so the extension moves rigidly with tail_06 and the lower plume bends with tail_04..06. No bones were added; the rig and clips are unchanged.',
 'checks': {
  'body_geometry_unchanged': build['body_unchanged'], 'nonfinite_points': build['checks']['nonfinite'],
  'left_right_roots': {'dark': [build['checks']['left_dark'], build['checks']['right_dark']], 'white': [build['checks']['left_white'], build['checks']['right_white']], 'note': 'dark difference comes from the 180 deg back tufts whose roots straddle x = 0 plus per-tuft random length/child count; the tuft layout is mirrored'},
  'plume_extent_m': {'top_z': build['checks']['plume_top_z_m'], 'y': build['checks']['plume_y_extent_m'], 'x': build['checks']['plume_x_extent_m']},
  'posed_binding': {k: {'action': v['action'], 'frame': v['frame'], 'tail_06_angle_from_rest_deg': round(v['tail_06_angle_from_rest_deg'], 1), 'dark_root_error_max_mm': v['plume_binding']['Plume tufts dark']['root_error_max_mm'], 'white_root_error_max_mm': v['plume_binding']['Plume white core']['root_error_max_mm'], 'dark_length_change_max_pct': v['plume_binding']['Plume tufts dark']['length_change_max_pct'], 'plume_max_move_mm': v['plume_binding']['Plume tufts dark']['max_point_move_mm']} for k, v in posed['frames'].items()},
  'spine_reference_curve_note': 'Plume spine curve reports 5.9 mm root error by construction: its first point is on the tube axis, its binding root is the nearest tube surface point. It is hidden and only a reference.',
  'neck': 'composite_neck_pass7_pass8.png: fur continuous over the fixed seam behind the jaw, no gap, step or floating strands; same groom parameters as pass 7.',
  'bald_patches_floating_strands_spikes': 'none seen on the final board; tuft tips are intended points'},
 'iterations': iters,
 'render_seconds_per_frame': final,
 'remains': [
  'Side view: the sheet shows a clean, bright white stripe running up the plume center to about 70 percent of its height. Ours shows white on the lower front and a streaky white-and-slate mix up to about 60 percent; the boundary between white and dark is softer and grayer than the sheet, and the upper half is darker.',
  'Sprite (192 px): the sheet reads as a white lower plume under a dark crest; ours reads as a dark flame with only a faint lighter center. The white core needs to be stronger at sprite size.',
  'Silhouette: ours is a symmetric leaf; the sheet plume is more S-shaped, with the curl continuing visibly into the plume and the tip leaning further forward. Our plume is also slightly more upright and a little wider in the middle.',
  'Tuft character: the sheet tufts are coarse, clumped, slightly wavy flame tongues; ours are cleaner, straighter cones and from the top the plume reads as a spiky star (pincushion).',
  'The front view is mostly blocked by the head (the plume shows above it as a narrow crest); thickness is confirmed from the top and back views (about 0.16 m across), which the sheet does not show.',
  'The 0.358 m plume extension is rigid on tail_06: in the signature whip the plume swings as one piece and does not bend along its own length. A proper fix is two or three extra tail bones in the rig (tail_07..09) with clip keys; the proxy weights are ready to take them.',
  'Body coat outside the plume is the pass 7 groom regrown (same parameters); it still differs from the sheet as listed in pass 7.'],
 'blockedBy': [],
 'tooling': {t: sha(tool / t) for t in tools},
 'outputs': {str(p.relative_to(D)).replace('\\', '/'): sha(p) for p in outputs},
}
(D / 'report.json').write_text(json.dumps(report, indent=1))
print(D / 'report.json', len(report['outputs']))
