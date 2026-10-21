"""B-5wvn: write pass 10 report.json. usage: python write_report_pass10.py PASS10_DIR"""
import sys, json, hashlib
from pathlib import Path
d = Path(sys.argv[1]); T = Path('C:/dev/src/xalians-creature-pipeline/art/pipeline/groom'); A = Path('C:/dev/art-data/pipeline/codex-stream')
h = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
b = json.loads((d / 'tail_pattern_build.json').read_text()); P = json.loads((d / 'tail_pattern_parameters.json').read_text())
times = {f['file']: round(f['seconds'], 1) for f in json.loads((d / 'render_times.json').read_text())['frames'] if f['file'].startswith('render_')}
posed = json.loads((d / 'posed_posed.json').read_text())
outs = sorted([p for p in d.glob('*') if p.is_file() and p.name != 'report.json' and not p.name.endswith('.blend1') and not p.name.startswith('iter')])
band = ', '.join(f'u {u}: {a} deg' for u, a in zip(P['band_u'], P['band_half_deg']))
r = {
 'build_id': 'B-5wvn', 'builder': 'Claude agent', 'pass': 10,
 'inputs': {'groom_pass9': {'path': str(A / 'luceras-groom/pass9/groom.blend'), 'sha256': h(A / 'luceras-groom/pass9/groom.blend')},
            'tailflight_clips': {'path': str(A / 'luceras-tailflight/pass3/work/clips.blend'), 'sha256': h(A / 'luceras-tailflight/pass3/work/clips.blend')}},
 'scope': 'Coat color only, plus a length floor on white underside strands of the thin shaft. No mesh, binding, plume geometry, rig, clip or motion change.',
 'method': [
  'Open pass9/groom.blend (pass 8 body groom plus pass 9 plume), read only; write pass10/groom.blend (art/pipeline/groom/build_tailpattern_pass10.py --mode build with tail_pattern_parameters.json).',
  'Tail centerline: Catmull-Rom through the rig joints tail_01 head to tail_06 tail, refined by sculpt cross-section centroids (slices 3 mm thick, 18 mm radius, tail-weighted vertices), held on the mid plane and smoothed. It stays within 1 mm of the bone line along most of the tail.',
  'Side of tail: for each tail vertex, the radial direction from the nearest centerline point is compared with U = -normalize(cross(x, T)), the underside in the tail\'s own frame (the same 180 deg azimuth the pass 9 plume uses for its shaft white band). U faces the backs of the thighs where the tail hangs from the rump, faces down along the bottom of the J, and faces away from the body in the rising part, into the plume white core.',
  'Mask (sculpt POINT attribute tail_pattern): smoothstep of that side value against cos(half width), edge 0.15. Half width along the tail (u = arc / tail length): ' + band + '. It is multiplied by a tail-weight ramp. A rump bridge is added: posterior-facing rump (normal y 0.3 to 0.65) from z 0.31 to 0.50, narrowing in x from 0.12 m at z 0.32 to 0.02 m at z 0.50, so the white backs of the thighs climb to the underside of the tail root. The mask is the max of the two.',
  'Skin: coat_color is blended to the existing pale skin color (median of the pale atlas) by the mask. skin_gain is set to 1.6 on the new white, because the skin shader scales pale skin to about 0.55 and the sparse shaft fur lets the skin show. Existing white is never darkened.',
  'Hair: every body coat strand (Luceras interpolated coat) takes the mask at its root (barycentric from bind_ia..ic and bind_a..c). Inside the edge it adds a 4 mm cell noise (0.35) and a per-strand jitter (0.12), then a smoothstep to a per-strand switch, so the edge breaks along clumps instead of a straight line. Switched strands take the existing pale hair coat_color and pale coat_gain (medians of the pale strands). The switch is stored as the CURVE attribute tail_pattern.',
  'Length floor: switched strands rooted beyond y 0.45 that are shorter than 8 mm are scaled about their root to 8 mm (at most 1.8x), by scaling position and the bind_height, bind_offset_x and bind_offset_y point offsets. ' + str(b['underside_strands_lengthened']) + ' strands. Roots and binding are unchanged.',
  'Plume: untouched. Its white core and its shaft white band (180 deg, from y 0.48) already sit on the same side as the new tail underside, so the body band runs into them.',
  'Renders: same script with --mode render. CPU Cycles, 6 threads, pass 5 neutral studio, 64 samples with OpenImageDenoise at 1374x1145 (side) and 900 px (closes); sprite 768 px at 128 samples without denoise, Lanczos to 192. Close cameras are built in code: tail_side (sheet side rotation, ortho 0.82 at (0, 0.50, 0.47)), tail_below (side 0.55, toward the tail 0.3, below -0.85; ortho 0.85; ground plane hidden because the camera is under it), plume_side (the pass 9 plume camera). Pass 9 is rendered on the same tail_side and tail_below cameras for the composites; its side, plume and sprite images are the pass 9 finals.',
  'Posed frames: art/pipeline/groom/posed_pass10.py, derived from animate/posed_tailflight.py (B-378v). Differences: groom body attributes overwrite same-named clip body attributes, so the new skin colors reach the posed skin; the view direction is an argument, here (1, -0.25, -0.3), low so the tail underside shows; the ground plane is hidden for a low camera. Clips: luceras-tailflight/pass3/work/clips.blend, read only and not saved; signature sig.horns-first-descent at frames 11 (launch), 22 (apex) and 38 (landing). Pass 9 is rendered the same way for comparison.'],
 'iterations': [
  {'iteration': 1, 'seen': 'Band +/-55 deg on the shaft: the white underside shows only as a faint lower edge; review cameras off center.', 'changed': 'Band widened, cameras moved.'},
  {'iteration': 2, 'seen': 'A close view at the bottom of the J shows a clear dark top and white underside, but at normal framing the shaft reads mid gray, and the rump under the tail root is dark.', 'changed': 'Band +/-88 deg on the shaft, rump bridge widened, underside length floor 8 mm.'},
  {'iteration': 3, 'seen': 'Full side shows a white line from the root into the plume. Close at the root, the shaft is uniformly gray on both sides.', 'changed': 'Diagnosed: the shaft fur near the root is sparse, so the skin shows, and the skin shader turns white skin to about 0.55 gray. Centerline slices tightened (the side distribution was already correct).'},
  {'iteration': 5, 'seen': 'With white skin gain 1.6 the root reads dark on top and white underneath.', 'changed': 'Rump bridge raised to z 0.50 and limited to posterior normals.'},
  {'iteration': 6, 'seen': 'Rear view: white climbs between the thighs to under the tail root and continues down the tail underside into the plume. Accepted; final renders and posed frames.', 'changed': 'Final renders.'}],
 'checks': {'body_geometry_unchanged': b['body_geometry_unchanged'], **json.loads((d / 'symmetry_check.json').read_text()),
            'mask': b['mask'], 'coat_strands_switched_white_gt_half': b['coat_strands_switched_white_gt_half'], 'coat_strands_partial_edge': b['coat_strands_partial'],
            'posed_frames': {k: {'frame': v['frame'], 'root_error_max_mm': round(v['root_error_max_mm'], 2), 'nonfinite': v['nonfinite']} for k, v in posed['frames'].items()},
            'posed_root_error_note': 'The 7.8 mm maximum is the hidden Plume spine curve reference (its first point is on the tube axis by construction, as in pass 9).',
            'motion_unchanged': 'Rig, clips and plume binding are untouched; the posed frames use the B-378v pass 3 clips as they are. Pass 9 and pass 10 posed frames match in pose.',
            'bald_patches_floating_strands_spikes': 'None seen on the final renders. Lengthened strands keep their roots.'},
 'render_seconds_per_frame': times,
 'remains': [
  'Subtle at sprite size: at 192 px the shaft reads as a lighter gray line, not a dark top over a white underside. The sheet shaft is thicker and furrier, so its two tones separate even when small; ours is a thin shaft with short, sparse fur.',
  'Sheet versus Nick: on the sheet side view the shaft near the rump is dark all round, and the pale underside line starts around mid shaft. Following Nick (2026-10-21), the white underside now runs the whole tail from the root. This is a deliberate departure from the sheet.',
  'Rump join in a pure side view: the white tail underside meets dark rump fur at the root, because long dark rump and flank strands hang over the posterior. The join is clear from behind and from below, weaker from the side. The sheet side view also shows a dark band above the white thigh back.',
  'White value on the shaft: skin and strands read light gray in the side light rather than the sheet bright white, because the underside is in shadow from the key.',
  'Thin shaft: the 8 mm floor helps the underside only. The shaft is still much thinner than the sheet tail, which is shaggy all along; thickening the shaft fur all round would be a separate groom change.',
  'Plume unchanged from pass 9; its own remaining notes stand (white core narrower than the sheet, tufts finer).',
  'The sheet has no view from below; the below composite uses the sheet three-quarter crop for reference only.'],
 'blockedBy': [],
 'tooling': {n: h(T / n) for n in ('build_tailpattern_pass10.py', 'inspect_tail_pass10.py', 'posed_pass10.py', 'compose_pass10.py', 'check_tailpattern_pass10.py', 'write_report_pass10.py')},
 'outputs': {p.name: h(p) for p in outs}}
for s in ('blend.sh', 'iter.sh', 'render.sh', 'final.sh', 'posed.sh'): r['outputs']['scripts/' + s] = h(d / 'scripts' / s)
(d / 'report.json').write_text(json.dumps(r, indent=1)); print(d / 'report.json', len(r['outputs']))
