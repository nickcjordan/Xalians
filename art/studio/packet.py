"""Packet: the standard review images and comparisons for one build.

    python art/studio/packet.py --assembly <assembled dir> [--baseline <assembled dir>] \
        --cameras art/studio/cameras/akinza.json --out <dir> \
        [--component head --head <head dir> --baseline-head <head dir>] [--part <part key>]
        [--cameras-only front,side-left] [--quick [--quick-samples 12]] [--no-baseline]

Renders every camera of the cameras file (art/studio/packet_render.py, run through runner.py blender, so
the Blender slot lock applies) for the assembly and, when given, the baseline. Baseline renders are cached
under C:/dev/art-data/studio/packet-cache/<sha256 of the baseline blend>/ and reused while the cameras file
and renderer are unchanged. Per camera it writes <id>.png, and with a baseline <id>.baseline.png,
<id>.compare.png (before and after, labeled) and <id>.diff.png (unchanged pixels gray, changed pixels on a
blue to amber ramp by size of the change). With head directories it also writes heat.png, the skin
displacement of the head against the baseline head (gray exactly zero, blue to amber by size) and the
maximum displacement per species zone. Everything is summarized in packet.json.

Part-only previews (experiment X26): --cameras-only renders just the listed camera ids (packet.json lists only
those), --quick renders at --quick-samples (default 12) Cycles samples with denoising on (a preview, not the
packet of record; quick baselines are cached apart from full ones), and --no-baseline skips the baseline renders
and every comparison even when --baseline is given. A full packet stays the default and is for the chosen build.

The assembly directories may also be blockout outputs (art/studio/blockout.py: blockout.blend, blockout.npz).
With --part <part key> and a baseline that both carry part_id, packet.json gets partDisplacement: the skin
displacement inside versus outside that part (max and median for each), measured between the two blockouts'
vertices, plus part-heat.png.
"""
import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
LOOP = ROOT/'art/species-construction/loop'
CACHE_ROOT = Path(r'C:\dev\art-data\studio\packet-cache')
WORK_DEFAULT = ROOT/'untracked/species-construction'
CHANGED_MIN = 3          # per-channel difference (of 255) at or below which a pixel counts as unchanged
RAMP_FULL = 48           # difference at which the ramp reaches amber
BLUE, AMBER = np.array([30, 60, 160]), np.array([255, 190, 40])


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def font(size):
    for name in ('arial.ttf', 'segoeui.ttf', 'DejaVuSans.ttf'):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def ramp(t):
    """Blue (dark) to amber (light): luminance rises with t, never red or green."""
    t = np.clip(t, 0, 1)[..., None]
    return (BLUE*(1-t)+AMBER*t).astype(np.uint8)


def blend_file(assembly):
    for name in ('akinza.blend', 'head.blend', 'blockout.blend'):
        if (assembly/name).is_file():
            return assembly/name
    found = sorted(assembly.glob('*.blend'))
    if not found:
        sys.exit(f'no .blend in {assembly}')
    return found[0]


def start_render(blend, cameras, out, lock_species, tag, only=None, samples=0):
    """Launch Blender under the slot lock. Returns the process; wait with finish_render.

    `lock_species` is None for the studio's own runner (art/studio/runner.py, settings in runner.json). A cameras
    file that still names `lockSpecies` keeps the old path through loop_tools.py and that species' config."""
    out.mkdir(parents=True, exist_ok=True)
    tail = [str(HERE/'packet_render.py'), '--', '--scene', str(blend), '--cameras', str(cameras), '--out', str(out)]
    if only:
        tail += ['--only', ','.join(only)]
    if samples:
        tail += ['--samples', str(samples)]
    if lock_species:
        cmd = [sys.executable, str(LOOP/'loop_tools.py'), '--species', lock_species, 'blender', '--log', f'studio-packet-{tag}', *tail]
    else:
        cmd = [sys.executable, str(HERE/'runner.py'), 'blender', '--log', f'studio-packet-{tag}', *tail]
    return subprocess.Popen(cmd, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)


def finish_render(proc, what):
    text = proc.communicate()[0]
    if proc.returncode:
        sys.exit(f'render of {what} failed:\n{text[-2000:]}')


def config_key(cameras, samples=0):
    h = hashlib.sha256()
    h.update(f'samples={samples}'.encode())
    h.update(Path(cameras).read_bytes())
    h.update((HERE/'packet_render.py').read_bytes())
    return h.hexdigest()[:16]


def raw_images(blend, cameras, ids, jobs, samples=0):
    """Raw RGBA render folder for a blend, cached by its sha256. Queues a render job when it is missing."""
    sha = sha256(blend)
    folder = CACHE_ROOT/sha
    meta = folder/'meta.json'
    key = config_key(cameras, samples)
    fresh = meta.is_file() and json.loads(meta.read_text())['config'] == key and all((folder/f'{i}.png').is_file() for i in ids)
    if fresh:
        return sha, folder, True
    if folder.exists():
        shutil.rmtree(folder)
    jobs.append((blend, folder, sha, key))
    return sha, folder, False


def over_background(raw, bg):
    im = Image.open(raw).convert('RGBA')
    base = Image.new('RGBA', im.size, (*bg, 255))
    base.alpha_composite(im)
    return base.convert('RGB'), np.asarray(im)[..., 3] > 8


def label_strip(width, text, height=28, size=16):
    strip = Image.new('RGB', (width, height), 'white')
    ImageDraw.Draw(strip).text((8, 5), text, fill=(20, 20, 20), font=font(size))
    return strip


def side_by_side(before, after, name_before, name_after, cam):
    w, h = after.size
    sheet = Image.new('RGB', (w*2+4, h+28), (120, 120, 120))
    sheet.paste(label_strip(w, f'before: {name_before}   [{cam}]'), (0, 0))
    sheet.paste(label_strip(w, f'after: {name_after}   [{cam}]'), (w+4, 0))
    sheet.paste(before, (0, 28))
    sheet.paste(after, (w+4, 28))
    return sheet


def diff_image(before, after, mask_before, mask_after, name_before, name_after, cam):
    a, b = np.asarray(before).astype(int), np.asarray(after).astype(int)
    mag = np.abs(a-b).max(axis=2)
    changed = mag > CHANGED_MIN
    figure = mask_before | mask_after
    lum = 0.299*b[..., 0]+0.587*b[..., 1]+0.114*b[..., 2]
    context = (225-(255-lum)*0.45).clip(150, 245).astype(np.uint8)
    out = np.stack([context]*3, axis=-1)
    out[changed] = ramp((mag[changed]-CHANGED_MIN)/(RAMP_FULL-CHANGED_MIN))
    img = Image.fromarray(out)
    w, h = img.size
    sheet = Image.new('RGB', (w, h+60), 'white')
    sheet.paste(img, (0, 0))
    d = ImageDraw.Draw(sheet)
    bar = ramp(np.linspace(0, 1, 240))[None].repeat(14, axis=0)
    sheet.paste(Image.fromarray(bar), (10, h+8))
    f = font(13)
    d.text((256, h+7), f'blue = small change ({CHANGED_MIN+1}/255), amber = large ({RAMP_FULL}/255 or more)', fill=0, font=f)
    d.text((10, h+28), f'pale gray = unchanged   [{cam}]  {name_after} against {name_before}', fill=0, font=f)
    d.text((10, h+43), 'change is the largest per-channel difference between the two renders', fill=(80, 80, 80), font=f)
    fraction = float(changed[figure].sum())/max(1, int(figure.sum()))
    return sheet, fraction


# ---------------------------------------------------------------- head displacement

def head_skin(head_dir):
    sys.path.insert(0, str(LOOP))
    import recipe_steps as rs
    return rs.glb_vertices(head_dir/'shape.glb', skin_only=True)


def displacement(base, cand):
    """Per candidate vertex: distance to the same vertex of the baseline when the topology matches,
    else to the nearest baseline vertex."""
    if base.shape == cand.shape:
        return np.linalg.norm(cand-base, axis=1), 'same topology, vertex to vertex'
    try:
        from scipy.spatial import cKDTree
        d, _ = cKDTree(base).query(cand)
    except ImportError:
        d = np.empty(len(cand))
        for i in range(0, len(cand), 2000):
            chunk = cand[i:i+2000]
            d[i:i+2000] = np.sqrt(((chunk[:, None, :]-base[None, :, :])**2).sum(-1)).min(axis=1)
    return d, 'different topology, nearest vertex'


def view_rotation(az, el):
    az, el = np.radians(az), np.radians(el)
    f = np.array([np.sin(az)*np.cos(el), -np.cos(az)*np.cos(el), np.sin(el)])   # toward camera
    r = np.array([np.cos(az), np.sin(az), 0.])
    up = np.cross(f, r)
    return np.stack([r, up, -f])    # third row: depth, larger is farther


def heat_view(points, d, rot, vmax, size=700, scale=575, title=''):
    P = points@rot.T
    keep = (np.abs(points[:, 0]) < .55) & (points[:, 2] > -.42) & (points[:, 2] < .5)
    P, dd = P[keep], d[keep]
    order = np.argsort(-P[:, 2])
    P, dd = P[order], dd[order]
    u = (size/2+P[:, 0]*scale).astype(int)
    v = (size/2-P[:, 1]*scale).astype(int)
    col = np.where((dd > 0)[:, None], ramp(dd/vmax), np.array([200, 200, 200], np.uint8)[None])
    img = np.full((size, size, 3), 255, np.uint8)
    for du in (0, 1):
        for dv in (0, 1):
            uu, vv = u+du, v+dv
            ok = (uu >= 0) & (uu < size) & (vv >= 0) & (vv < size)
            img[vv[ok], uu[ok]] = col[ok]
    im = Image.fromarray(img)
    ImageDraw.Draw(im).text((8, 6), title, fill=0, font=font(16))
    return im


def heat_report(base_dir, cand_dir, out, species, component):
    base, cand = head_skin(base_dir), head_skin(cand_dir)
    d, how = displacement(base, cand)
    moved = d > 0
    vmax = max(float(np.percentile(d[moved], 99.5)), 1e-6) if moved.any() else 1.0
    views = [('front', view_rotation(0, 0)), ('three-quarter', view_rotation(40, 8)),
             ('side (+x, creature left)', view_rotation(90, 0)), ('top', view_rotation(0, 70))]
    ims = [heat_view(cand, d, rot, vmax, title=t) for t, rot in views]
    sheet = Image.new('RGB', (1400, 1400+70), 'white')
    for k, im in enumerate(ims):
        sheet.paste(im, ((k % 2)*700, (k//2)*700))
    dr = ImageDraw.Draw(sheet)
    bar = ramp(np.linspace(0, 1, 240))[None].repeat(14, axis=0)
    sheet.paste(Image.fromarray(bar), (10, 1408))
    f = font(15)
    med = float(np.median(d[moved])) if moved.any() else 0.0
    dr.text((256, 1407), f'blue = small, amber = {vmax:.4f} head units (99.5th percentile of moved vertices); gray = exactly zero ({how})', fill=0, font=f)
    dr.text((10, 1432), f'{cand_dir.name} against {base_dir.name}: moved {int(moved.sum())} of {len(d)} skin vertices; max {float(d.max()):.4f}, median of moved {med:.4f} head units', fill=0, font=f)
    sheet.save(out/'heat.png')
    # per zone, in the assembled figure's frame: the head is placed as the assembly places it
    sys.path.insert(0, str(LOOP))
    import species as sp
    import recipe as rc
    s = sp.load(species)
    join = s.get('join', {})
    sc = join.get('head-scale', .5)
    offset = np.array([0, join.get('head-depth-offset', -.02), join.get('jaw-anchor-z', .5)+.27*sc])
    world = cand*sc+offset
    frame = s.get('frame', {})
    floor, height = frame.get('floorZ', -.957), frame.get('fixedHeight', 1.8605)
    per_zone = {}
    for name, zone in s['zones'].items():
        if not isinstance(zone, dict):
            continue
        member = rc.in_zone(world, zone, floor, height)
        if member.any():
            per_zone[name] = round(float(d[member].max()), 6)
    return {'component': component, 'heatFile': 'heat.png', 'moved': int(moved.sum()), 'max': round(float(d.max()), 6),
            'median': round(med, 6), 'units': 'head units', 'perZone': per_zone}


# ---------------------------------------------------------------- displacement inside and outside one part

def load_blockout(directory):
    f = directory/'blockout.npz'
    if not f.is_file():
        return None
    z = np.load(f)
    return {'v': z['vertices'].astype(float), 'pid': z['part_id'], 'keys': [str(k) for k in z['partKeys']]}


def nearest_distance(a, b):
    """Per vertex of a: distance to the nearest vertex of b."""
    try:
        from scipy.spatial import cKDTree
        return cKDTree(b).query(a)[0]
    except ImportError:
        out = np.empty(len(a))
        for i in range(0, len(a), 500):
            c = a[i:i+500]
            out[i:i+500] = np.sqrt(((c[:, None, :]-b[None, :, :])**2).sum(-1)).min(axis=1)
        return out


def stats(d):
    moved = d > 1e-9
    return {'vertices': int(len(d)), 'moved': int(moved.sum()), 'max': round(float(d.max()) if len(d) else 0.0, 6),
            'median': round(float(np.median(d)) if len(d) else 0.0, 6),
            'medianOfMoved': round(float(np.median(d[moved])) if moved.any() else 0.0, 6)}


def part_report(base_dir, cand_dir, key, out):
    base, cand = load_blockout(base_dir), load_blockout(cand_dir)
    if base is None or cand is None:
        sys.exit('--part needs blockout.npz (with part_id) in both the baseline and the candidate directory')
    if key not in cand['keys'] or key not in base['keys']:
        sys.exit(f'--part {key}: not a part of both blockouts (candidate: {cand["keys"]}, baseline: {base["keys"]})')
    in_c = cand['pid'] == cand['keys'].index(key)
    in_b = base['pid'] == base['keys'].index(key)
    if base['v'].shape == cand['v'].shape and base['keys'] == cand['keys']:
        how = 'same topology, vertex to vertex'
        d_c = np.linalg.norm(cand['v']-base['v'], axis=1)
        d_b = d_c
    else:
        how = 'different topology: each vertex to the nearest vertex of the other build, both directions'
        d_c = nearest_distance(cand['v'], base['v'])
        d_b = nearest_distance(base['v'], cand['v'])
    # a vertex counts as inside the part when its own build assigns it to the part; the baseline's vertices
    # (removed or moved material) are counted by the baseline's assignment
    inside = np.concatenate([d_c[in_c], d_b[in_b]])
    outside = np.concatenate([d_c[~in_c], d_b[~in_b]])
    vmax = max(float(np.percentile(np.concatenate([d_c, d_b])[np.concatenate([d_c, d_b]) > 1e-9], 99.5)), 1e-6)         if (np.concatenate([d_c, d_b]) > 1e-9).any() else 1.0
    heat = part_heat(cand['v'], d_c, in_c, vmax, key, how, stats(inside), stats(outside), out)
    return {'key': key, 'method': how, 'units': 'world units', 'inside': stats(inside), 'outside': stats(outside),
            'heatFile': heat}


def part_heat(points, d, inside, vmax, key, how, s_in, s_out, out, size=520):
    views = [('front', view_rotation(0, 0)), ('side-left', view_rotation(90, 0)), ('top', view_rotation(0, 89))]
    lo, hi = points.min(axis=0), points.max(axis=0)
    mid = (lo+hi)/2
    scale = size*0.9/float(max(hi-lo))
    sheet = Image.new('RGB', (size*3, size+78), 'white')
    for k, (title, rot) in enumerate(views):
        P = (points-mid)@rot.T
        order = np.argsort(-P[:, 2])
        P, dd, ins = P[order], d[order], inside[order]
        u = (size/2+P[:, 0]*scale).astype(int)
        v = (size/2-P[:, 1]*scale).astype(int)
        col = np.where((dd > 1e-9)[:, None], ramp(dd/vmax), np.where(ins[:, None], 150, 215).astype(np.uint8))
        img = np.full((size, size, 3), 255, np.uint8)
        for du in (0, 1):
            for dv in (0, 1):
                uu, vv = u+du, v+dv
                ok = (uu >= 0) & (uu < size) & (vv >= 0) & (vv < size)
                img[vv[ok], uu[ok]] = col[ok]
        im = Image.fromarray(img)
        ImageDraw.Draw(im).text((8, 6), title, fill=0, font=font(16))
        sheet.paste(im, (k*size, 0))
    dr = ImageDraw.Draw(sheet)
    sheet.paste(Image.fromarray(ramp(np.linspace(0, 1, 240))[None].repeat(14, axis=0)), (10, size+8))
    f = font(14)
    dr.text((256, size+7), f'blue = small, amber = {vmax:.5f} world units (99.5th percentile of moved); dark gray = unmoved vertex of {key}, light gray = unmoved elsewhere', fill=0, font=f)
    dr.text((10, size+30), f'inside {key}: moved {s_in["moved"]} of {s_in["vertices"]}, max {s_in["max"]}, median of moved {s_in["medianOfMoved"]}', fill=0, font=f)
    dr.text((10, size+50), f'outside {key}: moved {s_out["moved"]} of {s_out["vertices"]}, max {s_out["max"]}, median of moved {s_out["medianOfMoved"]}   ({how})', fill=0, font=f)
    sheet.save(out/'part-heat.png')
    return 'part-heat.png'


# ---------------------------------------------------------------- main

def resolve(path, species):
    p = Path(path)
    if p.is_dir():
        return p.resolve()
    q = WORK_DEFAULT/species/path
    if q.is_dir():
        return q.resolve()
    sys.exit(f'not a directory: {path}')


def main():
    t0 = time.time()
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--assembly', required=True)
    ap.add_argument('--baseline')
    ap.add_argument('--cameras', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--component', default='head')
    ap.add_argument('--head')
    ap.add_argument('--baseline-head')
    ap.add_argument('--cameras-only', help='comma list of camera ids to render; the others are skipped')
    ap.add_argument('--quick', action='store_true', help='fewer Cycles samples with denoising on (a preview)')
    ap.add_argument('--quick-samples', type=int, default=12)
    ap.add_argument('--no-baseline', action='store_true', help='skip the baseline renders and comparisons even when --baseline is given')
    ap.add_argument('--part', help='part key: report displacement inside versus outside it (blockout outputs)')
    args = ap.parse_args()
    cameras = Path(args.cameras).resolve()
    spec = json.loads(cameras.read_text(encoding='utf-8'))
    species = spec['species']
    lock_species = spec.get('lockSpecies')     # set only by an old cameras file: the loop_tools species config that owns the slot lock; otherwise the studio runner
    ids = [c['id'] for c in spec['cameras']]
    only = None
    if args.cameras_only:
        only = [c.strip() for c in args.cameras_only.split(',') if c.strip()]
        unknown = [c for c in only if c not in ids]
        if unknown:
            sys.exit(f'--cameras-only: not in {cameras.name}: {", ".join(unknown)} (cameras: {", ".join(ids)})')
        ids = [c for c in ids if c in only]
    samples = args.quick_samples if args.quick else 0
    bg = tuple(spec['render']['background'])
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    assembly = resolve(args.assembly, species)
    baseline = resolve(args.baseline, species) if args.baseline and not args.no_baseline else None

    blend = blend_file(assembly)
    sha = sha256(blend)
    jobs = []
    cand_raw = CACHE_ROOT/'_run'/f'{sha[:12]}-{int(t0)}'
    base_raw = base_cached = None
    if baseline:
        _, base_raw, base_cached = raw_images(blend_file(baseline), cameras, ids, jobs, samples)
    procs = [(start_render(blend, cameras, cand_raw, lock_species, assembly.name, ids if only else None, samples), assembly.name)]
    for bl, folder, _, _ in jobs:
        procs.append((start_render(bl, cameras, folder, lock_species, baseline.name, ids if only else None, samples), baseline.name))
    for proc, what in procs:
        finish_render(proc, what)
    for bl, folder, bsha, key in jobs:
        (folder/'meta.json').write_text(json.dumps({'config': key, 'blend': str(bl), 'sha256': bsha}), encoding='utf-8')

    result = {'assembly': assembly.name, 'assemblySha256': sha, 'baseline': baseline.name if baseline else None,
              'cameras': [], 'displacement': None, 'partDisplacement': None, 'minutes': 0.0,
              'quick': {'samples': samples} if samples else None, 'camerasOnly': ids if only else None}
    for cam in ids:
        after, mask_after = over_background(cand_raw/f'{cam}.png', bg)
        after.save(out/f'{cam}.png')
        row = {'id': cam, 'file': f'{cam}.png', 'baselineFile': None, 'sideBySide': None, 'diffFile': None, 'changedFraction': None}
        if baseline:
            before, mask_before = over_background(base_raw/f'{cam}.png', bg)
            before.save(out/f'{cam}.baseline.png')
            side_by_side(before, after, baseline.name, assembly.name, cam).save(out/f'{cam}.compare.png')
            diff, fraction = diff_image(before, after, mask_before, mask_after, baseline.name, assembly.name, cam)
            diff.save(out/f'{cam}.diff.png')
            row.update(baselineFile=f'{cam}.baseline.png', sideBySide=f'{cam}.compare.png', diffFile=f'{cam}.diff.png',
                       changedFraction=round(fraction, 6))
        result['cameras'].append(row)
    if args.head and args.baseline_head:
        result['displacement'] = heat_report(resolve(args.baseline_head, species), resolve(args.head, species), out, species, args.component)
    if args.part:
        if not baseline:
            sys.exit('--part needs --baseline')
        part = part_report(baseline, assembly, args.part, out)
        result['partDisplacement'] = part
    # keep the raw candidate renders beside the packet so a later run can be compared pixel for pixel
    raw_out = out/'raw'
    if raw_out.exists():
        shutil.rmtree(raw_out)
    shutil.move(str(cand_raw), str(raw_out))
    result['minutes'] = round((time.time()-t0)/60, 2)
    (out/'packet.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps({k: v for k, v in result.items() if k != 'cameras'}, indent=1))
    print(f"baseline cache {'hit' if base_cached else 'miss' if baseline else 'n/a'}; {result['minutes']} min")


if __name__ == '__main__':
    main()
