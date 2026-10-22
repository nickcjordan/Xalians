"""B-j6jh: compose the deformation audit (contact sheets, flags.json, index.md). Plain Python + Pillow, no Blender.

python defaudit_compose.py OUT_DIR
Reads OUT/work/flags_sheet.json and OUT/work/flags_sig.json written by defaudit.py.
"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import os
BUILD = os.environ.get('AUD_BUILD', 'B-j6jh')   # B-sntv: the re-skin audit labels its own build

OUT = Path(sys.argv[1])
CAMS = ['left', 'right', 'front', 'back', 'top', 'underside', 'low34_front_left', 'low34_rear_left']
POSES = ['rest', 'crouch', 'leap', 'landing', 'head_left_up', 'tail_side_up', 'foreleg_step', 'breath_in',
         'sig_f08', 'sig_f11', 'sig_f22', 'sig_f29', 'sig_f38']
SIGNOTE = {'sig_f08': 'deepest crouch', 'sig_f11': 'takeoff', 'sig_f22': 'apex', 'sig_f29': 'hit', 'sig_f38': 'landing'}


def font(n):
    for f in ('arialbd.ttf', 'DejaVuSans-Bold.ttf'):
        try: return ImageFont.truetype(f, n)
        except OSError: pass
    return ImageFont.load_default()


def sheet(paths, labels, title, dest, cols=4, cell=700):
    ims = [Image.open(p).convert('RGB') for p in paths]
    rows = (len(ims) + cols - 1) // cols; head = 56; lab = 36
    W = cols * cell; Hc = cell + lab
    canvas = Image.new('RGB', (W, head + rows * Hc), (24, 24, 24)); d = ImageDraw.Draw(canvas)
    d.text((16, 12), title, fill=(235, 235, 235), font=font(30))
    for i, (im, l) in enumerate(zip(ims, labels)):
        im.thumbnail((cell - 8, cell - 8)); x = (i % cols) * cell; y = head + (i // cols) * Hc
        canvas.paste(im, (x + (cell - im.width) // 2, y + lab + (cell - 8 - im.height) // 2))
        d.text((x + 10, y + 4), l, fill=(255, 196, 64), font=font(24))
    dest.parent.mkdir(parents=True, exist_ok=True); canvas.save(dest, optimize=True); return dest


flags = {}
for f in ('flags_sheet.json', 'flags_sig.json'):
    p = OUT / 'work' / f
    if p.exists(): flags.update(json.loads(p.read_text()))

# contact sheets: every pose, all cameras, render A
for pose in POSES:
    ps = [OUT / 'poses' / pose / f'{c}_A.png' for c in CAMS]
    if all(p.exists() for p in ps):
        t = f'Luceras {BUILD}  {pose}' + (f' ({SIGNOTE[pose]}, sig.horns-first-descent frame {pose[-2:]})' if pose in SIGNOTE else ' (review.poses)') + '  render A, look-dev clay'
        sheet(ps, CAMS, t, OUT / 'contact' / f'{pose}_A_contact.png')
# crop sheets (A, B, C side by side per region) for the crop poses
for pose in ('crouch', 'sig_f08'):
    d = OUT / 'crops' / pose
    if not d.exists(): continue
    regions = sorted({p.stem.rsplit('_', 1)[0] for p in d.glob('*_A.png')})
    for kind in 'ABC':
        ps = [d / f'{r}_{kind}.png' for r in regions]
        sheet(ps, regions, f'Luceras {BUILD}  {pose} close crops, render {kind}', OUT / 'contact' / f'{pose}_crops_{kind}_contact.png', cols=5, cell=560)

# flags.json
DEF = {
    'mesh': 'luceras_blockout (sculpt body, 211257 vertices); accessories (horns, eyes, claws, whiskers) not checked',
    'reference': 'the same body evaluated at rest: identity pose, all six correctives at 0',
    'collapse': 'triangle area below 30 percent of its rest area',
    'flip': "posed triangle normal points against the rest normal carried by the rotation of the triangle's dominant bone",
    'intersect': 'triangle pairs with different dominant bones that intersect each other (pairs sharing a vertex ignored); '
                 'pairs already intersecting at rest are excluded (rest has 0)',
    'overmove': "vertex displacement from rest more than 1.5 x the displacement its dominant bone's rigid transform predicts, "
                'and at least 3 mm more (armature space, so whole-body travel cancels)',
    'clusters': 'flagged triangles/vertices joined on a 12 mm grid, left/right/midline (|x| < 5 mm) kept apart; region = '
                'dominant bone of most members; nearest_joint = nearest posed joint to the cluster centre',
    'overlay_colours': 'gray clay; amber = collapse or flip; blue = intersect; magenta = overmove (later colours win: blue over amber over magenta)',
}
summary = {}
for pose in POSES:
    r = flags.get(pose)
    if not r: continue
    big = lambda k, n=5: [f"{c['n']} {c['side']} {c['region']} (near {c['nearest_joint']})" for c in r[k]['clusters'][:n]]
    summary[pose] = dict(collapse=r['collapse_or_flip']['collapse'], flip=r['collapse_or_flip']['flip'],
                         collapse_or_flip_triangles=r['collapse_or_flip']['triangles'], intersect_new_pairs=r['intersect']['new_pairs'],
                         intersect_triangles=r['intersect']['triangles'], overmove_vertices=r['overmove']['vertices'],
                         top_collapse_or_flip=big('collapse_or_flip'), top_intersect=big('intersect'), top_overmove=big('overmove'),
                         overlay=f'flags/{pose}_overlay_best.png ({r["overlay_best_camera"]})')
poses_out = {}
for k, v in flags.items():
    v = dict(v); v.pop('render_s', None); poses_out[k] = v
(OUT / 'flags.json').write_text(json.dumps(dict(build=BUILD, definitions=DEF, summary=summary, poses=poses_out), indent=1))

# timing
tot = {k: sum(v.get('render_s', {}).values()) for k, v in flags.items()}
(OUT / 'work' / 'render_time.json').write_text(json.dumps(dict(per_pose_render_s=tot, render_s=sum(tot.values()),
                                                                per_pose_wall_s={k: v.get('pose_s') for k, v in flags.items()}), indent=1))

# index.md
L = [f'# Luceras deformation audit, {BUILD}', '',
     'Render only: the pass 5 rig (`luceras-tailflight/pass5/rig.blend`, action `review.poses`) and its clips '
     '(`pass5/work/clips.blend`, action `sig.horns-first-descent`) were opened read-only; nothing was saved.', '',
     'Sculpt only (luceras_blockout with eyes, horns, claws, whiskers), clay; no fur, no game mesh, no plume stand-in.', '',
     '**Cameras** (orthographic, fitted to the posed sculpt bounds, 4 percent margin, 1400 px long side): '
     'left (az 90), right (az -90), front, back (az 180), top (head toward the frame bottom), underside (looking straight up, '
     'head toward the frame bottom, creature left on the frame right), low34_front_left (az 45, el -12), low34_rear_left (az 135, el -12). '
     'Ground hidden in underside and low views.', '',
     '**Renders**: A = look-dev clay, Cycles CPU 32 samples, denoised; B = grazing: look-dev lights off, one shadowless sun 18 degrees '
     "off the image plane from the image's upper left (relief only, no cast shadows); C = mean curvature, Workbench flat "
     '(dark blue = concave, mid gray = flat, light amber = convex).', '',
     '**Crops** (crouch and sig_f08): 10 regions, bilateral ones per side, 1400 px square, each from the camera that sees it best; '
     'window sizes 13 to 34 cm, i.e. 4x to 10x the full-view magnification.', '',
     '**Flags**: see `flags.json` (definitions, per-pose summary, clusters). Overlays: amber = collapse/flip, blue = intersect, '
     'magenta = overmove.', '', '## Flag summary', '',
     '| pose | collapse | flip | intersect pairs (new) | overmove vertices | best overlay |', '|---|---|---|---|---|---|']
for p, s in summary.items():
    L.append(f"| {p} | {s['collapse']} | {s['flip']} | {s['intersect_new_pairs']} | {s['overmove_vertices']} | `{s['overlay']}` |")
L += ['', '## Files', '']
for sub in ('contact', 'poses', 'crops', 'flags'):
    L.append(f'### {sub}/'); L.append('')
    for p in sorted((OUT / sub).rglob('*.png')):
        L.append(f'- `{p.relative_to(OUT).as_posix()}`')
    L.append('')
L += ['### other', '', '- `flags.json`', '- `index.md`', '- `work/` (logs, raw per-set flags, render_time.json, test renders)', '']
L += ['Tooling: `art/pipeline/animate/defaudit.py` (Blender), `art/pipeline/animate/defaudit_compose.py` (sheets, index), '
      '`art/pipeline/animate/defaudit_inspect.py` (inventory); run scripts in `work/*.sh`.', '']
(OUT / 'index.md').write_text('\n'.join(L), encoding='utf-8')
print('COMPOSED', len(summary), 'poses')
