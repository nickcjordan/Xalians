"""Playback sequences and key-frame sheets for the Akinza clips (PIL, no Blender).

  python art/species-construction/anim/compose_clips.py seq <frames dir> <seq dir> <name> <clip> [--sprite-scale 3]
      <frames dir>/<clip>/<view>/NNNN.png -> <seq dir>/<name>/<view>/NNNN.png in playback order: the idle loop
      three times; Night Stalk twice with a 0.5 s gap (its last frame held 15 frames). A sprite view also gets a
      `<view>3x` copy scaled up 3x nearest neighbour. Then encode_video.py turns each <seq dir>/<name> into
      <name>-<view>.mp4.
  python art/species-construction/anim/compose_clips.py sheet <frames dir> <clip> <out png> <spec json> [ref strips...]
  python art/species-construction/anim/compose_clips.py json <bake dir> <out json> [frames json or fur-checks json...]
      clips.json: frame counts, events, and the per-frame check numbers (clip_checks.py, plus any fur checks and
      render times given).
      Every 6th frame of <frames dir>/<clip>/side side by side, plus each event frame (frame number and any event
      under each), with the reference strips beside them.
"""
import json
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FPS = 30


def font(size):
    for f in ('C:/Windows/Fonts/arial.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):
        if Path(f).exists():
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def place(src, dst):
    dst.unlink(missing_ok=True)
    shutil.copyfile(src, dst)          # real copies: hard links become link members the mini's job archive refuses


def order(clip, n):
    if clip == 'idle':
        return list(range(n))*3
    gap = [n-1]*(FPS//2)
    return list(range(n))+gap+list(range(n))


def seq(frames, out, name, clip, scale=3):
    for vd in sorted(d for d in (frames/clip).iterdir() if d.is_dir()):
        files = sorted(vd.glob('[0-9][0-9][0-9][0-9].png'))
        n = len(files)
        if not n:
            continue
        od = out/name/vd.name
        od.mkdir(parents=True, exist_ok=True)
        big = None
        if vd.name.startswith('sprite'):
            big = out/name/f'{vd.name}{scale}x'
            big.mkdir(parents=True, exist_ok=True)
            for f in files:
                im = Image.open(f)
                im.resize((im.width*scale, im.height*scale), Image.NEAREST).save(big/f'up_{f.name}')
        for i, k in enumerate(order(clip, n)):
            place(files[k], od/f'{i:04d}.png')
            if big is not None:
                place(big/f'up_{files[k].name}', big/f'{i:04d}.png')
        print('seq', name, vd.name, n, '->', len(order(clip, n)))
    for d in (out/name).iterdir():
        for f in d.glob('up_*.png'):
            f.unlink()


def sheet(frames, clip, out, spec, refs):
    sp = json.loads(Path(spec).read_text())
    key = 'idle' if clip == 'idle' else 'nightStalk'
    events = {e['frame']: e['name'] for e in sp[key]['events']}
    n = sp[key]['frames']
    picks = sorted(set(range(0, n, 6)) | set(events))      # every 6th frame plus each event frame
    ims = [Image.open(frames/clip/'side'/f'{k:04d}.png').convert('RGB') for k in picks]
    W = 300
    tiles = []
    f_lab = font(20)
    for k, im in zip(picks, ims):
        im = im.resize((W, round(im.height*W/im.width)), Image.LANCZOS)
        t = Image.new('RGB', (W, im.height+30), (20, 20, 20))
        t.paste(im, (0, 0))
        d = ImageDraw.Draw(t)
        lab = f'f{k}' + (f'  {events[k]}' if k in events else '')
        d.text((8, im.height+4), lab, fill=(235, 235, 235), font=f_lab)
        tiles.append(t)
    per_row = 10
    rows = [tiles[i:i+per_row] for i in range(0, len(tiles), per_row)]
    th = tiles[0].height
    grid = Image.new('RGB', (W*per_row, th*len(rows)), (20, 20, 20))
    for r, row in enumerate(rows):
        for c, t in enumerate(row):
            grid.paste(t, (c*W, r*th))
    strips = [Image.open(r).convert('RGB') for r in refs if Path(r).exists()]
    sw = 0
    if strips:
        strips = [s.resize((round(s.width*170/s.height), 170), Image.LANCZOS) for s in strips]
        sw = max(s.width for s in strips)
    sh = sum(s.height+8 for s in strips)
    title = 34
    out_im = Image.new('RGB', (grid.width+(sw+20 if strips else 0), max(grid.height, sh)+title), (12, 12, 12))
    d = ImageDraw.Draw(out_im)
    d.text((8, 6), f'Akinza {key}: every 6th frame of {n} (30 fps), clay side; reference frames at right', fill=(235, 235, 235), font=font(20))
    out_im.paste(grid, (0, title))
    y = title
    for s in strips:
        out_im.paste(s, (grid.width+20, y))
        y += s.height+8
    out_im.save(out)
    print('sheet', out, out_im.size)


def clips_json(bake, out, extra):
    spec = json.loads((bake/'clips-spec.json').read_text())
    chk = json.loads((bake/'checks-skin.json').read_text())
    rules = {'footSlide': 'planted sole contact drift per frame under 2 mm', 'loopSeam': 'idle frame 0 against 90 under 0.1 mm; no velocity pop across 89, 0, 1',
             'tails': 'F39 clearances or better (rig-p8b checks.json: rest ab 136.3, bc 123.3, ac 207.7, b-legs 121.5, c-legs 117.8; '
                      'night_stalk ab 70.8, ac 143.0, bc 156.4); tails at least 60 mm apart',
             'ears': 'no ear blade vertex inside the skull', 'nightStalk': 'deepest frames against rig-p8b night_stalk under 0.5 mm',
             'folds': 'in-between frames no more folded or collapsed triangles per region than the approved crouch clip'}
    doc = dict(format='akinza-clips-pass1', fps=spec['fps'], rig=spec['rig'], units='mm unless named', rules=rules,
               clips={'idle': dict(frames=spec['idle']['frames'], loop=True, events=spec['idle']['events'], note=spec['idle']['note']),
                      'nightStalk': dict(frames=spec['nightStalk']['frames'], loop=False, events=spec['nightStalk']['events'])},
               approvedCrouchFoldsMaxPerRegion=chk['approvedCrouchFolds']['maxPerRegion'], soleVertices=chk['soleVertices'])
    for key, clip in (('idle', 'idle'), ('nightStalk', 'stalk')):
        rows = []
        for r in chk[clip]['frames']:
            r = {k: v for k, v in r.items() if k != 'bounds_src'}
            rows.append(r)
        doc['clips'][key]['summary'] = chk[clip]['summary']
        doc['clips'][key]['perFrame'] = rows
    for e in extra:
        d = json.loads(Path(e).read_text())
        if isinstance(d, list):          # fur checks
            for r in d:
                key = 'idle' if r['clip'] == 'idle' else 'nightStalk'
                doc['clips'][key].setdefault('furPerFrame', []).append(r)
        else:
            doc.setdefault('renders', {})[Path(e).parent.name+'/'+Path(e).name] = dict(
                look=d['look'], size=d['size'], sprite=d['sprite'], samples=d['samples'], seconds=d['seconds'],
                firstFrameSeconds={k: v[0] for k, v in d['renderSeconds'].items()},
                meanSeconds={k: round(sum(v)/len(v), 2) for k, v in d['renderSeconds'].items()})
    for key in ('idle', 'nightStalk'):
        fr = doc['clips'][key].get('furPerFrame')
        if fr:
            doc['clips'][key]['furSummary'] = dict(
                root_error_max_mm=max(r['root_error_max_mm'] for r in fr), root_to_surface_max_mm=max(r['root_to_surface_max_mm'] for r in fr),
                length_change_max_pct=max(r['length_change_max_pct'] for r in fr),
                strands_inside_skin={r['frame']: r['strands_inside_skin'] for r in fr if 'strands_inside_skin' in r})
    Path(out).write_text(json.dumps(doc, indent=1))
    print('wrote', out)


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'json':
        clips_json(Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4:])
    elif cmd == 'seq':
        seq(Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4], sys.argv[5])
    else:
        sheet(Path(sys.argv[2]), sys.argv[3], Path(sys.argv[4]), sys.argv[5], sys.argv[6:])
