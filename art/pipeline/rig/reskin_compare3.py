"""B-sntv pass 2 proof sheets: B-j6jh pass 1 audit, re-skin pass 1, re-skin pass 2, row over row; flags table.

python reskin_compare3.py OLD_AUDIT P1_AUDIT P2_AUDIT OUT_DIR
Like for like: crouch_deep and landing_old are the B-j6jh crouch and landing poses (landing_old with the hind feet
re-solved under the body), so their B-j6jh column is that audit's crouch / landing; pass 1 did not render them.
"""
import json, sys, os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OLD, P1, P2, OUT = (Path(a) for a in sys.argv[1:5])
CAMS = ['left', 'right', 'front', 'back', 'top', 'underside', 'low34_front_left', 'low34_rear_left']
POSES = ['rest', 'crouch', 'crouch_deep', 'leap', 'landing', 'landing_old', 'head_left_up', 'tail_side_up', 'foreleg_step', 'breath_in',
         'sig_f08', 'sig_f11', 'sig_f12', 'sig_f14', 'sig_f16', 'sig_f18', 'sig_f20', 'sig_f22', 'sig_f29', 'sig_f38']
OLDMAP = {'crouch_deep': 'crouch', 'landing_old': 'landing'}
SAME_AS_OLD = {'rest', 'breath_in', 'crouch_deep', 'landing_old', 'sig_f08', 'sig_f11', 'sig_f38'}
CROPS = ['shoulders_armpits_left', 'shoulders_armpits_right', 'elbows_left', 'elbows_right', 'stifles_left', 'stifles_right',
         'hocks_left', 'hocks_right', 'wrists_left', 'wrists_right', 'chest_floor', 'belly', 'groin_inner_thighs', 'neck_throat', 'tail_base_rump']


def font(n):
    for f in ('arialbd.ttf', 'DejaVuSans-Bold.ttf'):
        try: return ImageFont.truetype(f, n)
        except OSError: pass
    return ImageFont.load_default()


def rows(title, cols, triples, dest, cell=400):
    head, lab, side = 56, 30, 150
    W = side + len(cols) * cell; H = head + 3 * (cell + lab)
    C = Image.new('RGB', (W, H), (24, 24, 24)); d = ImageDraw.Draw(C)
    d.text((16, 12), title, fill=(235, 235, 235), font=font(26))
    for r, nm in enumerate(os.environ.get('CMP_LABELS', 'B-j6jh/pass 5 rig|B-sntv/pass 1|B-sntv/pass 2').replace('/', '\n').split('|')):
        d.multiline_text((12, head + r * (cell + lab) + cell // 2 - 24), nm, fill=[(150, 190, 255), (200, 200, 200), (255, 196, 64)][r], font=font(22))
    for i, (l, paths) in enumerate(zip(cols, triples)):
        x = side + i * cell
        for r, p in enumerate(paths):
            y = head + r * (cell + lab); d.text((x + 6, y + 2), l, fill=(220, 220, 220), font=font(18))
            if p is not None and p.exists():
                im = Image.open(p).convert('RGB'); im.thumbnail((cell - 8, cell - 8))
                C.paste(im, (x + (cell - im.width) // 2, y + lab + (cell - 8 - im.height) // 2))
            else:
                d.text((x + 10, y + lab + 10), 'not rendered', fill=(160, 160, 160), font=font(18))
    dest.parent.mkdir(parents=True, exist_ok=True); C.save(dest, optimize=True)


for p in POSES:
    op = OLDMAP.get(p, p)
    note = '' if p in SAME_AS_OLD else '  (pose rewritten in B-sntv; top row is the old pose of that name)'
    rows(f'Luceras {p}: render A, all cameras{note}', CAMS,
         [(OLD / 'poses' / op / f'{c}_A.png', P1 / 'poses' / p / f'{c}_A.png', P2 / 'poses' / p / f'{c}_A.png') for c in CAMS],
         OUT / 'compare' / f'{p}_A_3way.png')
for p in os.environ.get('CMP_CROPS', 'crouch,crouch_deep,sig_f08').split(','):
    op = OLDMAP.get(p, p)
    for k in 'ABC':
        for half, names in (('1', CROPS[:8]), ('2', CROPS[8:])):
            rows(f'Luceras {p} crops, render {k}', names,
                 [(OLD / 'crops' / op / f'{c}_{k}.png', P1 / 'crops' / p / f'{c}_{k}.png', P2 / 'crops' / p / f'{c}_{k}.png') for c in names],
                 OUT / 'compare' / f'{p}_crops_{k}_{half}_3way.png', cell=340)


def load(a):
    out = {}
    for f in ('flags_sheet.json', 'flags_sig.json'):
        q = a / 'work' / f
        if q.exists(): out.update(json.loads(q.read_text()))
    return out


old = json.loads((OLD / 'flags.json').read_text())['summary']; f1 = load(P1); f2 = load(P2)
c1, c2 = os.environ.get('CMP_COLS', 'pass 1|pass 2').split('|')
lines = [f'| pose | like for like with B-j6jh | collapse or flip: B-j6jh | {c1} | {c2} | below B-j6jh | intersect pairs: B-j6jh | {c1} | {c2} | zero | overmove: B-j6jh | {c1} | {c2} | overmove down vs {c1} |',
         '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|']
tab = {}
for p in POSES:
    if p not in f2: continue
    o = old.get(OLDMAP.get(p, p)) or dict(collapse_or_flip_triangles=None, intersect_new_pairs=None, overmove_vertices=None); a = f1.get(p); b = f2[p]
    cf = (o['collapse_or_flip_triangles'], a['collapse_or_flip']['triangles'] if a else None, b['collapse_or_flip']['triangles'])
    x = (o['intersect_new_pairs'], a['intersect']['new_pairs'] if a else None, b['intersect']['new_pairs'])
    ov = (o['overmove_vertices'], a['overmove']['vertices'] if a else None, b['overmove']['vertices'])
    below = None if cf[0] is None else (cf[2] < cf[0] or (cf[0] == 0 and cf[2] == 0))
    tab[p] = dict(like_for_like=p in SAME_AS_OLD, collapse_or_flip=cf, intersect=x, overmove=ov, cf_below_bj6jh=below, intersect_zero=x[2] == 0)
    s = lambda v: '-' if v is None else str(v)
    lines.append(f"| {p} | {'yes' if p in SAME_AS_OLD else 'no (pose rewritten)'} | {s(cf[0])} | {s(cf[1])} | {cf[2]} | {'n/a' if below is None else ('yes' if below else 'NO')} | "
                 f"{s(x[0])} | {s(x[1])} | {x[2]} | {'yes' if x[2] == 0 else 'NO'} | {s(ov[0])} | {s(ov[1])} | {ov[2]} | {'-' if ov[1] is None else ('yes' if ov[2] <= ov[1] else 'no')} |")
(OUT / 'flags_table.md').write_text('\n'.join(lines) + '\n'); (OUT / 'flags_table.json').write_text(json.dumps(tab, indent=1))
print('\n'.join(lines))
