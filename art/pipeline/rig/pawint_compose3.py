"""B-yqgg pass 3: left fore grazing before/after, right vs mirrored left mirror check, plus the pass 3 sheet and paw crops."""
import sys, runpy
from pathlib import Path
from PIL import Image
O = Path(r'C:/dev/art-data/pipeline/codex-stream/luceras-pawintegrate/pass3')
sys.argv = [sys.argv[0], str(O)]
ns = runpy.run_path(str(Path(__file__).parent / 'pawint_compose.py'), run_name='compose')
tile, grid = ns['tile'], ns['grid']
POSES = ('rest', 'crouch', 'leap', 'landing')
tl = []
for pose in POSES:
    for v in ('side', 'front'):
        tl.append(tile(Image.open(O / 'graze' / f'pass2_{pose}_fore_l_{v}.png'), f'BEFORE (pass 2) | {pose} | {v}', 400))
        tl.append(tile(Image.open(O / 'graze' / f'pass3_{pose}_fore_l_{v}.png'), f'AFTER (pass 3) | {pose} | {v}', 400))
grid(tl, 4, 'LUCERAS | B-yqgg pass 3 | left fore weld band, grazing light', 'One low sun raking down the leg across the join ring, lookdev lights off. Each pair: pass 2 then pass 3, same camera and pose.', O / 'graze_left_fore_before_after.png')
tl = []
for pose in POSES:
    for v in ('side', 'front'):
        tl.append(tile(Image.open(O / 'graze' / f'pass3_{pose}_fore_r_{v}.png'), f'RIGHT | {pose} | {v}', 400))
        tl.append(tile(Image.open(O / 'graze' / f'pass3_{pose}_fore_l_{v}.png').transpose(Image.FLIP_LEFT_RIGHT), f'LEFT, mirrored | {pose} | {v}', 400))
grid(tl, 4, 'LUCERAS | B-yqgg pass 3 | right fore vs left fore after both band fixes, grazing light', 'Left fore images flipped left to right so both legs read the same way.', O / 'graze_right_vs_left_fore.png')
print('composed pass3')
