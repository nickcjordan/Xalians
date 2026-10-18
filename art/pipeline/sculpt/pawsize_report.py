"""B-ykwq: write report.json with output sha256."""
import json, hashlib
from pathlib import Path
O = Path('C:/dev/art-data/pipeline/codex-stream/luceras-pawsize/pass1')


def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()


files = sorted([p for p in O.glob('*') if p.is_file() and p.name != 'report.json'] + [p for o in 'BC' for p in (O / o).glob('*') if p.is_file()] + [O / o / 'base' / 'groom.blend' for o in 'BC'])
chk = {o: json.loads((O / f'pawsize_{o}_sculpt_checks.json').read_text()) for o in 'BC'}
frames = {o: {f['file']: round(f['seconds'], 1) for f in json.loads((O / o / 'measurements_frames.json').read_text())['frames']} for o in 'BC'}
m = json.loads((O / 'measurements.json').read_text())
pc = {o: json.loads((O / o / 'paw_checks.json').read_text()) for o in 'BC'}
rep = {
    'build_id': 'B-ykwq', 'kind': 'preview: paw size variant board for Nick (no winner picked)',
    'inputs': {'sculpt_A': 'C:/dev/art-data/pipeline/codex-stream/luceras-hindpaw/pass1/luceras_sculpt.blend', 'groom_A': 'C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass6/groom.blend', 'base_groom_A': 'C:/dev/art-data/pipeline/codex-stream/luceras-groom/pass6/base/groom.blend'},
    'method': [
        'Measured paw width / ankle width and paw length / leg height on the clay mesh (art/pipeline/sculpt/pawsize_measure.py) and by eye on the sheet and pass 6 renders (measurements.json).',
        'Option scales (width, length, height) chosen so the clay ratios land halfway (B) or on (C) the sheet ratios, then corrected once after measuring the first build. Fore width stays 1.0 in both: the clay fore width ratio (1.60) is already under the sheet (1.75). Height scale is about the geometric mean of width and length.',
        'art/pipeline/sculpt/pawsize_scale.py moves body vertices only. Pivot per paw: centre of the narrowest leg section above the paw, dropped to the sole line (z 0). Length and height weight is 1 below the paw top (fore 30 mm, hind 40 mm) and falls off smoothly to 0 at 12 mm above the wrist (80 mm) or 10 mm above the hock (175 mm). Width falls off sooner (fore 30 to 50 mm, hind 40 to 65 mm) so the ankle keeps its width. The field is computed from the left paws and mirrored for the right. Claw and dewclaw objects are translated by the field at their centroid, at their current size. Region deltas: pawsize_<B|C>_region_delta.npz (base_co, new_co, body local) with .json meta, for art/pipeline/sculpt/apply_region_delta.py; reverse by swapping the arrays.',
        'Groom: the pass 6 base layer (pass6/base/groom.blend) was reused with the same vertex and claw moves applied, so every body strand keeps its binding and the coat away from the paws is identical across options. Re-running build_groom_pass5.py on the moved mesh would redraw the whole body coat (area-weighted root sampling, as the pass 6 report noted), so options would differ outside the paws. Then pass6/build_paws.py ran unchanged with <B|C>/parameters.json: toe line lengths scaled by the fore/hind length scale; toe and paw fur length, groove width and reach, and toe top height scaled by the mean paw scale. Leg fringe unchanged.',
        'Renders: build_paws.py render mode, final settings (CPU Cycles 6 threads, 64 samples plus OIDN; sprite 768 px, 128 samples, no denoise, Lanczos to 192 px), pass 6 studio and cameras. The A column is the pass 6 final renders from the same script, settings and cameras. Composites by art/pipeline/groom/compose_pawsize.py, Lanczos resizing only, same sheet crops as pass 6.'],
    'scales_width_length_height': {o: chk[o]['scales'] for o in 'BC'},
    'ratios_clay': {o: {k: {'width': v['width_ratio'], 'length': v['length_ratio']} for k, v in m['clay'][o].items() if isinstance(v, dict)} for o in 'ABC'},
    'ratios_sheet': {k: {'width': v['width_ratio'], 'length': v['length_ratio']} for k, v in m['sheet'].items() if isinstance(v, dict) and 'width_ratio' in v},
    'checks': {
        'topology_sha256_equal_A_B_C': len({m['clay'][o]['topology_sha256'] for o in 'ABC'}) == 1 and len({m['clay'][o]['edges_sha256'] for o in 'ABC'}) == 1,
        'topology_sha256': m['clay']['A']['topology_sha256'],
        'per_option_sculpt_checks': {o: {k: v for k, v in chk[o].items() if k != 'claws'} for o in 'BC'},
        'no_movement_above_falloff': 'Max per-vertex displacement where the weight is 0, and above the falloff end for fore and hind, is 0.0 m in B and C.',
        'triangles_turned': '4 triangles in the moved region turn by more than 60 degrees in both B and C (the same count at both strengths, so likely near-degenerate slivers); not inspected one by one.',
        'toe_self_intersection': 'Inside the full-strength zone the move is one affine map per paw, which cannot create new intersections between toes. No BVH overlap test was run.',
        'claws_seated': 'Minimum claw-to-skin gap 0 to 0.1 mm before and after for every claw. Hind claws are less embedded after the move (about 0.61 to 0.80 of sampled claw vertices inside the skin in C, was 0.74 to 0.91) because they keep their size while the toes shrink. Renders show them seated at the toe tips.',
        'bare_skin': 'None seen in any close composite.',
        'planted': 'z is scaled about the ground plane; min body z after: B 0.068 mm, C 0.060 mm.',
        'fur_outline': {'A_toe_fur_median_mm': 4.95, 'B_toe_fur_median_mm': round(pc['B']['length_median_toe_m'] * 1000, 2), 'C_toe_fur_median_mm': round(pc['C']['length_median_toe_m'] * 1000, 2), 'min_strand_z_m': min(pc['B']['min_point_z_m'], pc['C']['min_point_z_m'])},
        'symmetry': 'Field mirrored from the left paws; measured left and right ratios agree within 0.02.',
        'body_coat_identical_outside_paws': 'Base coat bindings reused; preservation_check.json is true in B and C.'},
    'render_seconds': frames,
    'composites': json.loads((O / 'composites.json').read_text())['composites'],
    'remains': [
        'The paw shape is still the generated one, so the hind paws still splay outward. In the low front view they read wider than the fore paws even in C, while the sheet hind paws face forward and look about as wide as the fore paws. Size alone does not close that gap.',
        'Claws keep their size, so they read relatively larger on smaller paws; in the C hind three-quarter view the two middle hind claws sit very close together.',
        'Sheet ratios are by-eye measurements with about +-0.1 uncertainty; fur render ratios were measured by eye on A only.',
        'No rig pose test of B or C; topology and weights are unchanged, so the rig binds the same way.',
        'Fore width was not reduced because the clay fore ratio is already below the sheet. Narrower fore paws would be a new lever, not a sheet match.'],
    'outputs': {str(p.relative_to(O)).replace('\\', '/'): sha(p) for p in files}}
(O / 'report.json').write_text(json.dumps(rep, indent=1))
print(json.dumps({k: rep[k] for k in ('ratios_clay', 'ratios_sheet', 'render_seconds')}, indent=0), rep['checks']['topology_sha256_equal_A_B_C'])
