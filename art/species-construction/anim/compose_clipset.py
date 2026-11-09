"""Playback sequences, key-frame sheets, the setup sheet and clips.json for the batch 1 clips (PIL, no Blender).

  python art/species-construction/anim/compose_clipset.py seq <frames dir> <idle frames dir> <seq dir> <clip> [--scale 3]
      In context, twice: idle frames 60 to 89, the clip (its frame 0 plays in place of idle frame 0), then idle frames 0
      to 29 (the clip hands back to idle frame 0), a 0.5 s hold on that idle frame, and again. Per view
      (<frames dir>/<clip>/<view>); a sprite view also gets a <view>3x copy scaled 3x nearest neighbour. Writes
      <seq dir>/<clip>-clay/<view>/NNNN.png for encode_video.py (--fps 30) and <seq dir>/<clip>-clay/order.json.
  python art/species-construction/anim/compose_clipset.py sheet <frames dir> <clip> <spec json> <out png> [ref strips...]
      Every frame of the clip's side view (they are short), the event frame marked, the reference strips under them.
  python art/species-construction/anim/compose_clipset.py setup <setup frames dir> <setup check json> <out png>
      The guard setup check: poses A and B, side, front, three-quarter and the close views, with their numbers.
  python art/species-construction/anim/compose_clipset.py json <bake dir> <out json> [extra json...]
      clips.json: frames, events, rules, per-clip check summaries and per-frame numbers (checks-skin.json), the render
      measures (measure-render.json) and any render logs given.
"""
import json
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from compose_clips import font  # noqa: E402

FPS = 30


def place(src, dst):
    dst.unlink(missing_ok=True)
    shutil.copyfile(src, dst)


def seq(frames, idle, out, clip, scale=3):
    order = []
    for _ in range(2):
        order += [('idle', k) for k in range(60, 90)]
        n = len(list((frames/clip/'side').glob('[0-9][0-9][0-9][0-9].png')))
        order += [(clip, k) for k in range(n)]
        order += [('idle', k) for k in range(30)]
        order += [('idle', 29)]*(FPS//2)
    for vd in sorted(d for d in (frames/clip).iterdir() if d.is_dir()):
        view = vd.name
        od = out/f'{clip}-clay'/view
        od.mkdir(parents=True, exist_ok=True)
        big = out/f'{clip}-clay'/f'{view}{scale}x' if view.startswith('sprite') else None
        if big is not None:
            big.mkdir(parents=True, exist_ok=True)
        for i, (c, k) in enumerate(order):
            src = (idle/'idle'/view if c == 'idle' else frames/clip/view)/f'{k:04d}.png'
            place(src, od/f'{i:04d}.png')
            if big is not None:
                im = Image.open(src)
                im.resize((im.width*scale, im.height*scale), Image.NEAREST).save(big/f'{i:04d}.png')
        print('seq', clip, view, len(order))
    (out/f'{clip}-clay'/'order.json').write_text(json.dumps(dict(fps=FPS, order=[f'{c}:{k}' for c, k in order]), indent=0))


def sheet(frames, clip, spec, out, refs):
    sp = json.loads(Path(spec).read_text())[clip]
    events = {e['frame']: e['name'] for e in sp['events']}
    n = sp['frames']
    W = 240
    tiles = []
    for k in range(n):
        im = Image.open(frames/clip/'side'/f'{k:04d}.png').convert('RGB')
        im = im.resize((W, W), Image.LANCZOS)                 # the whole frame: evade's tails reach the right edge's last 70 px
        t = Image.new('RGB', (W, W+28), (20, 20, 20))
        t.paste(im, (0, 0))
        dr = ImageDraw.Draw(t)
        lab = f'f{k}' + (f'  {events[k]}' if k in events else '')
        dr.text((6, W+4), lab, fill=(250, 210, 90) if k in events else (235, 235, 235), font=font(18))
        tiles.append(t)
    per_row = 9
    rows = [tiles[i:i+per_row] for i in range(0, len(tiles), per_row)]
    th = tiles[0].height
    grid = Image.new('RGB', (W*per_row, th*len(rows)), (20, 20, 20))
    for r, row in enumerate(rows):
        for c, t in enumerate(row):
            grid.paste(t, (c*W, r*th))
    strips = [Image.open(r).convert('RGB') for r in refs if Path(r).exists()]
    strips = [s.resize((min(grid.width, round(s.width*220/s.height)), 220), Image.LANCZOS) for s in strips]
    title = 34
    h = title+grid.height+sum(s.height+30 for s in strips)
    out_im = Image.new('RGB', (grid.width, h), (12, 12, 12))
    dr = ImageDraw.Draw(out_im)
    dr.text((8, 6), f'Akinza {clip}: every frame of {n} (30 fps), clay side; events marked; reference frames below', fill=(235, 235, 235), font=font(20))
    out_im.paste(grid, (0, title))
    y = title+grid.height
    for s, r in zip(strips, refs):
        dr.text((8, y+6), f'reference: {Path(r).name} (anim/ref/clipset-b1/sources.json)', fill=(200, 200, 200), font=font(16))
        out_im.paste(s, (0, y+28))
        y += s.height+30
    out_im.save(out)
    print('sheet', out, out_im.size)


def setup(fdir, chk, out):
    c = json.loads(Path(chk).read_text())
    cols = ['side', 'front', 'threequarter', 'crop_shoulderL', 'crop_elbowL', 'crop_paws']
    S = 420
    rows = []
    for tag in ('guardA', 'guardB'):
        r = c['frames'][f'{tag}:0']
        appr = c['approvedCrouchFoldsMaxPerRegion']
        txt = (f"{tag}: folded/collapsed triangles  shoulder {r['folds']['shoulder']}  armpit {r['folds']['armpit']}  elbow {r['folds']['elbow']}"
               f"  (approved crouch max: shoulder {appr['shoulder']}, elbow {appr['elbow']});  arm vertices inside other skin "
               f"{r['arm_L_inside_upper']+r['arm_L_inside_forearm_hand']}/{r['arm_R_inside_upper']+r['arm_R_inside_forearm_hand']} (L/R);"
               f"  forearm and hand to chest/face {r['arm_L_forearm_hand_to_face_chest_min_mm']} mm;  shoulder area ratio max "
               f"{r['stretch']['shoulder']['area_max']}, edge p99 {r['stretch']['shoulder']['edge_p99']}")
        ims = []
        for v in cols:
            f = Path(fdir)/tag/v/'0000.png'
            ims.append(Image.open(f).convert('RGB').resize((S, S), Image.LANCZOS) if f.exists() else Image.new('RGB', (S, S)))
        rows.append((txt, ims))
    W = S*len(cols)
    out_im = Image.new('RGB', (W, 40+len(rows)*(S+60)), (12, 12, 12))
    dr = ImageDraw.Draw(out_im)
    dr.text((8, 8), 'Akinza guard setup check: deepest frame on the bare rig (clay); views ' + ', '.join(cols), fill=(235, 235, 235), font=font(20))
    y = 40
    for txt, ims in rows:
        dr.text((8, y+6), txt, fill=(250, 210, 90), font=font(15))
        for i, im in enumerate(ims):
            out_im.paste(im, (i*S, y+40))
        y += S+60
    out_im.save(out)
    print('setup sheet', out, out_im.size)


def clips_json(bake, out, extra):
    spec = json.loads((bake/'clipset-spec.json').read_text())
    chk = json.loads((bake/'checks-skin.json').read_text())
    meas = bake/'measure-render.json'
    meas = json.loads(meas.read_text()) if meas.exists() else {}
    rules = {'footSlide': 'planted sole contact drift per frame under 2 mm (frames the clip marks planted; the sole in contact both frames)',
             'startEnd': 'frame 0 equals approved idle frame 0 and the last frame equals approved idle frame 89, under 0.1 mm',
             'guardSeam': 'guard frame 0 against frame 27 under 0.1 mm (guard not built: stopped at the setup check)',
             'folds': 'no more folded or collapsed triangles per region than the approved crouch clip (rest to night_stalk)',
             'ears': 'no ear blade vertex inside the skull', 'tails': 'tails at least 60 mm apart and clear of the legs',
             'furRootError': 'fur stage, after the blind critic passes the clay (not run)',
             'amplitudes': 'visible moves measured in the 720 side and 192 sprite renders (measure-render.json)'}
    doc = dict(format='akinza-clipset-b1', fps=spec['fps'], rig=spec['rig'], units='mm unless named', rules=rules,
               approvedCrouchFoldsMaxPerRegion=chk['approvedCrouchFoldsMaxPerRegion'], idleStep89to0_max_mm=chk['idleStep89to0_max_mm'],
               soleVertices=chk['soleVertices'], clips={})
    for clip in ('hurt', 'evade', 'guard'):
        sp = spec[clip]
        entry = dict(frames=sp['frames'], loop=sp['loop'], events=sp['events'])
        for k in ('startsOn', 'endsOn', 'entry'):
            if k in sp:
                entry[k] = sp[k]
        if clip in chk:
            entry['summary'] = chk[clip]['summary']
            entry['perFrame'] = [{k: v for k, v in r.items() if k not in ('bounds_src', 'info')} for r in chk[clip]['frames']]
        else:
            entry['status'] = 'not built: stopped at the setup check (clipset1/setup)'
        if clip in meas:
            entry['renderMeasures'] = dict(summary=meas[clip]['summary'], rig={k: v for k, v in meas[clip]['rig'].items()})
        doc['clips'][clip] = entry
    for e in extra:
        d = json.loads(Path(e).read_text())
        if 'renderSeconds' in d:
            doc.setdefault('renders', {})[Path(e).parent.name+'/'+Path(e).name] = dict(
                look=d['look'], size=d['size'], sprite=d['sprite'], samples=d['samples'], seconds=d['seconds'],
                meanSeconds={k: round(sum(v)/len(v), 2) for k, v in d['renderSeconds'].items()})
        else:
            doc.setdefault('extra', {})[Path(e).name] = d
    Path(out).write_text(json.dumps(doc, indent=1))
    print('wrote', out)


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'seq':
        seq(Path(sys.argv[2]), Path(sys.argv[3]), Path(sys.argv[4]), sys.argv[5])
    elif cmd == 'sheet':
        sheet(Path(sys.argv[2]), sys.argv[3], sys.argv[4], Path(sys.argv[5]), sys.argv[6:])
    elif cmd == 'setup':
        setup(Path(sys.argv[2]), sys.argv[3], Path(sys.argv[4]))
    elif cmd == 'json':
        clips_json(Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4:])
