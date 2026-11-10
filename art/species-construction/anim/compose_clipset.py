"""Playback sequences, key-frame sheets, the setup sheet and clips.json for the batch 1 clips (PIL, no Blender).

  python art/species-construction/anim/compose_clipset.py seq <frames dir> <idle frames dir> <seq dir> <clip> [--scale 3]
      In context, twice: idle frames 60 to 89, the clip (its frame 0 plays in place of idle frame 0; guard: guard_in, the
      rest of that loop, one more loop, guard_out), then idle frames 0 to 29 (the clip hands back to idle frame 0), a
      0.5 s hold on that idle frame, and again. Per view
      (<frames dir>/<clip>/<view>); a sprite view also gets a <view>3x copy scaled 3x nearest neighbour. Writes
      <seq dir>/<clip>-clay/<view>/NNNN.png for encode_video.py (--fps 30) and <seq dir>/<clip>-clay/order.json.
  python art/species-construction/anim/compose_clipset.py sheet <frames dir> <clip> <spec json> <out png> [ref strips...]
      Every frame of the clip's side view (they are short), the event frame marked, the reference strips under them.
  python art/species-construction/anim/compose_clipset.py setup <setup frames dir> <setup check json> <out png> [before json]
      The guard setup check (pose B): side, front and three-quarter, then the close views, with the numbers after and
      before rig-p8b's elbow keys.
  python art/species-construction/anim/compose_clipset.py ankle <ankle setup dir> <before json> <after json> <out png>
      The ankle keys' setup sheet: each static pose before and after, side, three-quarter and two ankle close views.
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


def count(frames, clip):
    return len(list((frames/clip/'side').glob('[0-9][0-9][0-9][0-9].png')))


def clip_order(frames, clip):
    """The clip's frames as a game plays them. guard: guard_in 0 to 6 in place of the first loop's 0 to 6, the rest of
    that loop (7 to 26), one more full loop, then guard_out (in place of the next loop's first frames)."""
    if clip == 'guard':
        n = count(frames, 'guard')
        return ([('guard_in', k) for k in range(count(frames, 'guard_in'))]+[('guard', k) for k in range(7, n)]
                +[('guard', k) for k in range(n)]+[('guard_out', k) for k in range(count(frames, 'guard_out'))])
    return [(clip, k) for k in range(count(frames, clip))]


def seq(frames, idle, out, clip, scale=3):
    order = []
    for _ in range(2):
        order += [('idle', k) for k in range(60, 90)]
        order += clip_order(frames, clip)
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
            src = (idle/'idle'/view if c == 'idle' else frames/c/view)/f'{k:04d}.png'
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
    parts = [(clip, k, '') for k in range(n)]
    if clip == 'guard':     # entry, the loop, exit
        parts = ([('guard_in', k, 'in ') for k in range(count(frames, 'guard_in'))]+[('guard', k, '') for k in range(n)]
                 +[('guard_out', k, 'out ') for k in range(count(frames, 'guard_out'))])
    for c, k, pre in parts:
        im = Image.open(frames/c/'side'/f'{k:04d}.png').convert('RGB')
        im = im.resize((W, W), Image.LANCZOS)                 # the whole frame: evade's tails reach the right edge's last 70 px
        t = Image.new('RGB', (W, W+28), (20, 20, 20))
        t.paste(im, (0, 0))
        dr = ImageDraw.Draw(t)
        ev = events.get(k) if c == clip else None
        lab = f'{pre}f{k}' + (f'  {ev}' if ev else '')
        dr.text((6, W+4), lab, fill=(250, 210, 90) if ev else (235, 235, 235), font=font(18))
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
    what = (f'guard_in (in f0 to f6), the loop (f0 to f{n-1}) and guard_out (out f0 to f{count(frames, "guard_out")-1})' if clip == 'guard'
            else f'every frame of {n}')
    dr.text((8, 6), f'Akinza {clip}: {what} (30 fps), clay side; events marked; reference frames below', fill=(235, 235, 235), font=font(20))
    out_im.paste(grid, (0, title))
    y = title+grid.height
    for s, r in zip(strips, refs):
        dr.text((8, y+6), f'reference: {Path(r).name} (anim/ref/clipset-b1/sources.json)', fill=(200, 200, 200), font=font(16))
        out_im.paste(s, (0, y+28))
        y += s.height+30
    out_im.save(out)
    print('sheet', out, out_im.size)


def setup(fdir, chk, out, before=None):
    """The guard setup sheet: pose B's deepest frame with rig-p8b's elbow keys (side, front, three-quarter at full width, then
    the close views at full size), the numbers after and, if given, before the elbow keys."""
    c = json.loads(Path(chk).read_text())
    r = c['frames']['guardB:0']
    appr = c['approvedCrouchFoldsMaxPerRegion']

    def line(tag, r):
        return (f"{tag}: folded/collapsed triangles  shoulder {r['folds']['shoulder']}  armpit {r['folds']['armpit']}  elbow {r['folds']['elbow']}  "
                f"neck {r['folds']['neck']}  ear root {r['folds']['ear_root']};  arm vertices inside other skin "
                f"{r['arm_L_inside_upper']+r['arm_L_inside_forearm_hand']}/{r['arm_R_inside_upper']+r['arm_R_inside_forearm_hand']} (L/R);  "
                f"forearm and paw to chest/face {r['arm_L_forearm_hand_to_face_chest_min_mm']} mm;  elbow area ratio max {r['stretch']['elbow']['area_max']}")
    lines = [line('with the elbow keys', r)]
    if before:
        lines.append(line('before (no elbow keys)', json.loads(Path(before).read_text())['frames']['guardB:0']))
    lines.append(f"approved crouch maxima: shoulder {appr['shoulder']}, armpit {appr['armpit']}, elbow {appr['elbow']}, neck {appr['neck']}, ear root {appr['ear_root']}")
    big = ['side', 'front', 'threequarter']
    crops = [d.name for d in sorted(Path(fdir, 'guardB').iterdir()) if d.is_dir() and d.name.startswith('crop_')]
    S = 1024
    ims = [Image.open(Path(fdir)/'guardB'/v/'0000.png').convert('RGB') for v in big]
    cims = [Image.open(Path(fdir)/'guardB'/v/'0000.png').convert('RGB') for v in crops]
    W = S*3
    ch = S*3//max(len(cims), 1) if len(cims) > 3 else S
    cims = [im.resize((ch, ch), Image.LANCZOS) for im in cims]
    head = 30+26*len(lines)
    out_im = Image.new('RGB', (W, head+S+40+ch+30), (12, 12, 12))
    dr = ImageDraw.Draw(out_im)
    dr.text((8, 6), 'Akinza guard setup check, pose B: deepest frame on the bare rig (clay); side, front, three-quarter; close views: '
            + ', '.join(c_[5:] for c_ in crops), fill=(235, 235, 235), font=font(22))
    for i, t in enumerate(lines):
        dr.text((8, 34+26*i), t, fill=(250, 210, 90) if i == 0 else (200, 200, 200), font=font(18))
    for i, im in enumerate(ims):
        out_im.paste(im, (i*S, head))
    for i, im in enumerate(cims):
        out_im.paste(im, (i*ch, head+S+30))
        dr.text((i*ch+8, head+S+6), crops[i][5:], fill=(235, 235, 235), font=font(18))
    out_im.save(out)
    print('setup sheet', out, out_im.size)


def ankle(fdir, before_json, after_json, out):
    """The ankle setup sheet (E5): each static pose before and after the direction-aware ankle keys, side, three-quarter
    and the two ankle close views, with the ankle region's folds."""
    poses = ['evadeF3', 'evadeF5pointed', 'runToeoff']
    views = ['side', 'threequarter', 'crop_ankleL', 'crop_ankleLback']
    cb_, ca_ = json.loads(Path(before_json).read_text()), json.loads(Path(after_json).read_text())
    S = 360
    rows = []
    for pz in poses:
        for tag, folder, c in (('before', 'frames-before', cb_), ('after', 'frames-after', ca_)):
            r = c['frames'][f'{pz}:0']
            txt = (f"{pz} {tag}: ankle folded/collapsed {r['folds']['ankle']}  knee {r['folds']['knee']}  (approved crouch ankle "
                   f"{c['approvedCrouchFoldsMaxPerRegion']['ankle']});  ankle keys {', '.join(f'{k} {v}' for k, v in r['keys'].items() if k.startswith('ankle'))}")
            ims = [Image.open(Path(fdir)/folder/pz/v/'0000.png').convert('RGB').resize((S, S), Image.LANCZOS) for v in views]
            rows.append((txt, ims))
    W = S*len(views)
    out_im = Image.new('RGB', (W, 36+len(rows)*(S+28)), (12, 12, 12))
    dr = ImageDraw.Draw(out_im)
    dr.text((8, 8), 'Akinza ankle keys (E5): before and after, side, three-quarter, ankle close (side), ankle close (back three-quarter)',
            fill=(235, 235, 235), font=font(16))
    y = 36
    for txt, ims in rows:
        dr.text((8, y+4), txt, fill=(250, 210, 90) if ' after' in txt[:30] else (200, 200, 200), font=font(13))
        for i, im in enumerate(ims):
            out_im.paste(im, (i*S, y+24))
        y += S+28
    out_im.save(out)
    print('ankle sheet', out, out_im.size)


def clips_json(bake, out, extra):
    spec = json.loads((bake/'clipset-spec.json').read_text())
    chk = json.loads((bake/'checks-skin.json').read_text())
    meas = bake/'measure-render.json'
    meas = json.loads(meas.read_text()) if meas.exists() else {}
    rules = {'footSlide': 'planted sole contact drift per frame under 2 mm (frames the clip marks planted; the sole in contact both frames)',
             'startEnd': 'frame 0 equals approved idle frame 0 and the last frame equals approved idle frame 89, under 0.1 mm',
             'guardSeam': 'guard frame 0 against frame 27 under 0.1 mm, and the velocity change across the seam against the largest elsewhere in the loop',
             'guardEntryExit': 'guard_in frame 0 equals idle frame 0; guard_out frame 0 equals guard frame 0 and its last frame equals idle frame 89',
             'ears': 'no ear blade vertex inside the skull; the visible ear angle in the render at most 65 degrees from vertical (batch 1 critic)',
             'folds': 'no more folded or collapsed triangles per region than the approved crouch clip (rest to night_stalk)',
             'tails': 'tails at least 60 mm apart and clear of the legs',
             'furRootError': 'fur stage, after the blind critic passes the clay (not run)',
             'amplitudes': 'visible moves measured in the 720 side and 192 sprite renders (measure-render.json)'}
    doc = dict(format='akinza-clipset-b1', fps=spec['fps'], rig=spec['rig'], units='mm unless named', rules=rules,
               approvedCrouchFoldsMaxPerRegion=chk['approvedCrouchFoldsMaxPerRegion'], idleStep89to0_max_mm=chk['idleStep89to0_max_mm'],
               soleVertices=chk['soleVertices'], clips={})
    for clip in ('hurt', 'evade', 'guard', 'guard_in', 'guard_out'):
        sp = spec.get(clip) or dict(frames=len(chk[clip]['frames']) if clip in chk else None, loop=False, events=[],
                                    partOf='guard (see guard.entry and guard.exit)')
        entry = dict(frames=sp['frames'], loop=sp['loop'], events=sp['events'])
        for k in ('startsOn', 'endsOn', 'entry', 'exit', 'react', 'partOf'):
            if k in sp:
                entry[k] = sp[k]
        if clip in chk:
            entry['summary'] = chk[clip]['summary']
            entry['perFrame'] = [{k: v for k, v in r.items() if k not in ('bounds_src', 'info')} for r in chk[clip]['frames']]
        else:
            entry['status'] = 'not checked'
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
        setup(Path(sys.argv[2]), sys.argv[3], Path(sys.argv[4]), sys.argv[5] if len(sys.argv) > 5 else None)
    elif cmd == 'ankle':
        ankle(Path(sys.argv[2]), sys.argv[3], sys.argv[4], Path(sys.argv[5]))
    elif cmd == 'json':
        clips_json(Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4:])
