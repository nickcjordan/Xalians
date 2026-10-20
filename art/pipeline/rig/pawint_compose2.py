"""B-yqgg pass 2: right fore grazing before/after board, plus pass 2 sheet, paw crops and comparison (pawint_compose.py layout)."""
import sys, runpy
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
O = Path(r'C:/dev/art-data/pipeline/codex-stream/luceras-pawintegrate/pass2')
sys.argv = [sys.argv[0], str(O)]
ns = runpy.run_path(str(Path(__file__).parent / 'pawint_compose.py'), run_name='compose')
tile, grid = ns['tile'], ns['grid']
tl = []
for pose in ('rest', 'crouch', 'leap', 'landing'):
    for v in ('side', 'front'):
        tl.append(tile(Image.open(O / 'graze' / f'pass1_{pose}_fore_r_{v}.png'), f'BEFORE (pass 1) | {pose} | {v}', 400))
        tl.append(tile(Image.open(O / 'graze' / f'pass2_{pose}_fore_r_{v}.png'), f'AFTER (pass 2) | {pose} | {v}', 400))
grid(tl, 4, 'LUCERAS | B-yqgg pass 2 | right fore weld band, grazing light', 'One low sun raking down the leg across the join ring, lookdev lights off. Each pair: pass 1 then pass 2, same camera and pose.', O / 'graze_right_fore_before_after.png')
print('composed graze')
# mirror check: right fore pass 2 beside the left fore (flipped so both read the same way), same lighting
tl = []
for pose in ('rest', 'crouch', 'leap', 'landing'):
    for v in ('side', 'front'):
        tl.append(tile(Image.open(O / 'graze' / f'pass2_{pose}_fore_r_{v}.png'), f'RIGHT (pass 2) | {pose} | {v}', 400))
        tl.append(tile(Image.open(O / 'graze' / f'pass2_{pose}_fore_l_{v}.png').transpose(Image.FLIP_LEFT_RIGHT), f'LEFT, mirrored | {pose} | {v}', 400))
grid(tl, 4, 'LUCERAS | B-yqgg pass 2 | right fore vs left fore (mirror check), grazing light', 'Left fore images flipped left to right so both legs read the same way. The left fore had no seam.', O / 'graze_right_vs_left_fore.png')
print('composed mirror')
