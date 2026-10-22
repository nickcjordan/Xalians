"""B-sntv proof sheets: pass 1 audit (B-j6jh) next to the re-skin audit, and the flags table before and after.

python reskin_compare.py OLD_AUDIT NEW_AUDIT OUT_DIR
  OUT/compare/<pose>_A_before_after.png      every camera, render A: before row over after row
  OUT/compare/<pose>_crops_<K>_before_after.png   crouch and sig_f08 crops, renders A, B, C
  OUT/flags_table.md, OUT/flags_table.json
"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OLD, NEW, OUT = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
CAMS = ['left', 'right', 'front', 'back', 'top', 'underside', 'low34_front_left', 'low34_rear_left']
POSES = ['rest', 'crouch', 'leap', 'landing', 'head_left_up', 'tail_side_up', 'foreleg_step', 'breath_in',
         'sig_f08', 'sig_f11', 'sig_f22', 'sig_f29', 'sig_f38']
CROPS = ['shoulders_armpits_left', 'shoulders_armpits_right', 'elbows_left', 'elbows_right', 'stifles_left', 'stifles_right',
         'hocks_left', 'hocks_right', 'wrists_left', 'wrists_right', 'chest_floor', 'belly', 'groin_inner_thighs', 'neck_throat', 'tail_base_rump']


def font(n):
    for f in ('arialbd.ttf', 'DejaVuSans-Bold.ttf'):
        try: return ImageFont.truetype(f, n)
        except OSError: pass
    return ImageFont.load_default()


def rows(title, pairs, dest, cell=420):
    """pairs: list of (label, before_path, after_path); two rows: before, after."""
    head, lab, side = 56, 30, 120
    W = side + len(pairs) * cell; H = head + 2 * (cell + lab)
    C = Image.new('RGB', (W, H), (24, 24, 24)); d = ImageDraw.Draw(C)
    d.text((16, 12), title, fill=(235, 235, 235), font=font(28))
    for r, nm in enumerate(('before\nB-j6jh', 'after\nB-sntv')):
        d.multiline_text((12, head + r * (cell + lab) + cell // 2 - 20), nm, fill=(255, 196, 64) if r else (150, 190, 255), font=font(22))
    for i, (l, b, a) in enumerate(pairs):
        x = side + i * cell
        for r, p in enumerate((b, a)):
            y = head + r * (cell + lab)
            d.text((x + 6, y + 2), l, fill=(220, 220, 220), font=font(18))
            if p.exists():
                im = Image.open(p).convert('RGB'); im.thumbnail((cell - 8, cell - 8))
                C.paste(im, (x + (cell - im.width) // 2, y + lab + (cell - 8 - im.height) // 2))
            else:
                d.text((x + 10, y + lab + 10), 'missing', fill=(200, 80, 80), font=font(18))
    dest.parent.mkdir(parents=True, exist_ok=True); C.save(dest, optimize=True); return dest


made = []
for p in POSES:
    made.append(rows(f'Luceras {p}: render A, all cameras (top: pass 1 audit B-j6jh; bottom: re-skin B-sntv)',
                     [(c, OLD / 'poses' / p / f'{c}_A.png', NEW / 'poses' / p / f'{c}_A.png') for c in CAMS], OUT / 'compare' / f'{p}_A_before_after.png'))
for p in ('crouch', 'sig_f08'):
    for k in 'ABC':
        for half, names in (('1', CROPS[:8]), ('2', CROPS[8:])):
            made.append(rows(f'Luceras {p} crops, render {k} (top: B-j6jh; bottom: B-sntv)',
                             [(c, OLD / 'crops' / p / f'{c}_{k}.png', NEW / 'crops' / p / f'{c}_{k}.png') for c in names],
                             OUT / 'compare' / f'{p}_crops_{k}_{half}_before_after.png', cell=360))
# flags table
old = json.loads((OLD / 'flags.json').read_text())['summary']
new = {}
for f in ('flags_sheet.json', 'flags_sig.json'):
    q = NEW / 'work' / f
    if q.exists(): new.update(json.loads(q.read_text()))
tab = {}
lines = ['| pose | collapse before | collapse after | flip before | flip after | collapse or flip tris before | after | after / before | target (< 2 %) | intersect pairs before | after | overmove before | after |',
         '|---|---|---|---|---|---|---|---|---|---|---|---|---|']
for p in POSES:
    if p not in new: continue
    o = old[p]; n = new[p]; cf = n['collapse_or_flip']
    t = dict(collapse=(o['collapse'], cf['collapse']), flip=(o['flip'], cf['flip']), cf_tris=(o['collapse_or_flip_triangles'], cf['triangles']),
             intersect=(o['intersect_new_pairs'], n['intersect']['new_pairs']), overmove=(o['overmove_vertices'], n['overmove']['vertices']))
    ratio = cf['triangles'] / o['collapse_or_flip_triangles'] if o['collapse_or_flip_triangles'] else (0.0 if cf['triangles'] == 0 else float('inf'))
    t['ratio'] = ratio; t['target'] = 0.02 * o['collapse_or_flip_triangles']; t['cf_pass'] = cf['triangles'] < t['target'] or cf['triangles'] == 0
    t['intersect_pass'] = n['intersect']['new_pairs'] == 0
    tab[p] = t
    lines.append(f"| {p} | {o['collapse']} | {cf['collapse']} | {o['flip']} | {cf['flip']} | {o['collapse_or_flip_triangles']} | {cf['triangles']} | "
                 f"{ratio * 100:.1f} % | {t['target']:.0f} {'pass' if t['cf_pass'] else 'FAIL'} | {o['intersect_new_pairs']} | {n['intersect']['new_pairs']} | "
                 f"{o['overmove_vertices']} | {n['overmove']['vertices']} |")
(OUT / 'flags_table.md').write_text('\n'.join(lines) + '\n'); (OUT / 'flags_table.json').write_text(json.dumps(tab, indent=1))
print('COMPARE', len(made), 'sheets')
print('\n'.join(lines))
