"""B-ykwq: gather clay (mesh) and sheet/fur (image, by eye) paw ratios into measurements.json."""
import json, sys
from pathlib import Path
O = Path('C:/dev/art-data/pipeline/codex-stream/luceras-pawsize/pass1'); W = O / 'work'
fur = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
out = {'build_id': 'B-ykwq', 'definitions': {
    'paw_width_over_ankle_width': 'Front view. Paw width across the toes (claws excluded) divided by the narrowest leg width between the paw and the wrist or hock. Clay: extent of body vertices below z 30 mm across the paw axis, over the narrowest 5 mm slice between 35 mm and the joint.',
    'paw_length_over_leg_height': 'Side view. Ground contact length from toe tip (claws excluded) to the back of the paw at the ground, divided by the height of the wrist (fore) or hock (hind) above the ground. Clay: extent of body vertices below z 12 mm along the paw axis, over the rig joint height (leg_*_03 head).'},
    'sheet': {'method': 'By eye on the approved side and front sheet images (1374 x 1145) with a 10 px grid (work/sheet_*.png). Uncertainty about +-0.1 on each ratio; wrist and hock positions are judged from the dewclaw and the leg bend.',
        'fore': {'width_ratio': 1.75, 'width_px': {'paw': 95, 'ankle': 54}, 'length_ratio': 1.0, 'length_px': {'paw': 92, 'wrist_height': 90}},
        'hind': {'width_ratio': 1.85, 'width_px': {'paw': 93, 'ankle': 50}, 'length_ratio': 0.72, 'length_px': {'paw': 178, 'hock_height': 247}}},
    'clay': {}, 'fur_render': fur,
    'targets': {'B': 'halfway between A clay and sheet', 'C': 'sheet', 'note': 'Fore paw width on the clay (1.60) is already below the sheet (1.75), so B and C keep fore width at 1.0 and never enlarge it.'}}
for o in 'ABC':
    m = json.loads((W / f'measure_{o}.json').read_text())
    out['clay'][o] = {'topology_sha256': m['topology_sha256'], 'edges_sha256': m['edges_sha256']}
    for k, p in m['paws'].items():
        out['clay'][o][k] = {x: round(float(p[x]), 4) for x in ('paw_width_m', 'ankle_width_m', 'ankle_z_m', 'paw_length_ground_m', 'leg_height_m', 'width_ratio', 'length_ratio')}
(O / 'measurements.json').write_text(json.dumps(out, indent=1)); print('ok')
