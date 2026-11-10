"""Playback sequences, key-frame sheets, the setup sheet and clips.json for the batch 1 clips (PIL, no Blender).

  python art/species-construction/anim/compose_clipset.py seq <frames dir> <idle frames dir> <seq dir> <clip> [tag, clay by default]
      In context, twice: idle frames 60 to 89, the clip (its frame 0 plays in place of idle frame 0; guard: guard_in, the
      rest of that loop, one more loop, guard_out), then idle frames 0 to 29 (the clip hands back to idle frame 0), a
      0.5 s hold on that idle frame, and again. Per view
      (<frames dir>/<clip>/<view>); a sprite view also gets a <view>3x copy scaled 3x nearest neighbour. Writes
      <seq dir>/<clip>-clay/<view>/NNNN.png for encode_video.py (--fps 30) and <seq dir>/<clip>-clay/order.json.
  python art/species-construction/anim/compose_clipset.py sheet <frames dir> <clip> <spec json> <out png> [ref strips...]
      Every frame of the clip's side view (they are short), the event frame marked, the reference strips under them.
  python art/species-construction/anim/compose_clipset.py setup <setup frames dir> <setup check json> <out png> [before json] [after label] [before label]
      The guard setup check (pose B): side, front and three-quarter, then the close views, with the numbers after and
      before rig-p8b's elbow keys.
  python art/species-construction/anim/compose_clipset.py ankle <ankle setup dir> <before json> <after json> <out png>
      The ankle keys' setup sheet: each static pose before and after, side, three-quarter and two ankle close views.
  python art/species-construction/anim/compose_clipset.py grid key=<frames dir>[,key2=<dir>] <rows json> <out png> <title> [size]
      A comparison sheet: rows of [label, frames dir key, clip, [views]] (fix pass 4: shoulder and ear root checks).
  python art/species-construction/anim/compose_clipset.py furcheck <fur frames dir> <approved fur frames dir> <out png> <picks json> [fur-checks json]
      The fur check sheet: each clip's deepest frame (side 720 and sprite 192) beside the approved Night Stalk fur frame 18
      at the same scale, then its close views; picks are [[clip, frame, [crop views]], ...].
  python art/species-construction/anim/compose_clipset.py setupfaint <setup frames dir> <setup check json> <extra json> <out png> [picked]
      Batch 2's faint setup sheet: the lying candidates A, B, C with their numbers (extra json: visible192 and fur per candidate).
  python art/species-construction/anim/compose_clipset.py json2 <bake dir> <out json> [extra json...]
      Batch 2's clips.json (displaced, held, held_in, held_out, faint), with the ear line per frame (ear-line.json).
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
    if clip == 'held':          # batch 2: held_in, the loop twice, held_out (in place of the next loop's frame 0 onward)
        n = count(frames, 'held')
        return ([('held_in', k) for k in range(count(frames, 'held_in'))]+[('held', k) for k in range(n)]*2
                +[('held_out', k) for k in range(count(frames, 'held_out'))])
    return [(clip, k) for k in range(count(frames, clip))]


def seq(frames, idle, out, clip, scale=3, tag='clay'):
    order = []
    for _ in range(2):
        order += [('idle', k) for k in range(60, 90)]
        order += clip_order(frames, clip)
        if clip == 'faint':     # batch 2: the game holds faint's last frame; here for 1 s, then the sequence starts again
            order += [order[-1]]*FPS
            continue
        order += [('idle', k) for k in range(30)]
        order += [('idle', 29)]*(FPS//2)
    for vd in sorted(d for d in (frames/clip).iterdir() if d.is_dir() and not d.name.startswith('crop_')):
        view = vd.name
        od = out/f'{clip}-{tag}'/view
        od.mkdir(parents=True, exist_ok=True)
        big = out/f'{clip}-{tag}'/f'{view}{scale}x' if view.startswith('sprite') else None
        if big is not None:
            big.mkdir(parents=True, exist_ok=True)
        for i, (c, k) in enumerate(order):
            src = (idle/'idle'/view if c == 'idle' else frames/c/view)/f'{k:04d}.png'
            place(src, od/f'{i:04d}.png')
            if big is not None:
                im = Image.open(src)
                im.resize((im.width*scale, im.height*scale), Image.NEAREST).save(big/f'{i:04d}.png')
        print('seq', clip, view, len(order))
    (out/f'{clip}-{tag}'/'order.json').write_text(json.dumps(dict(fps=FPS, order=[f'{c}:{k}' for c, k in order]), indent=0))


def sheet(frames, clip, spec, out, refs):
    sp = json.loads(Path(spec).read_text())[clip]
    events = {e['frame']: e['name'] for e in sp['events']}
    n = sp['frames']
    W = 240
    tiles = []
    parts = [(clip, k, '') for k in range(n)]
    if clip in ('guard', 'held'):     # entry, the loop, exit
        parts = ([(f'{clip}_in', k, 'in ') for k in range(count(frames, f'{clip}_in'))]+[(clip, k, '') for k in range(n)]
                 +[(f'{clip}_out', k, 'out ') for k in range(count(frames, f'{clip}_out'))])
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
    what = (f'{clip}_in (in f0 to f{count(frames, clip+"_in")-1}), the loop (f0 to f{n-1}) and {clip}_out (out f0 to f{count(frames, clip+"_out")-1})'
            if clip in ('guard', 'held') else f'every frame of {n}')
    dr.text((8, 6), f'Akinza {clip}: {what} (30 fps), clay side; events marked; reference frames below', fill=(235, 235, 235), font=font(20))
    out_im.paste(grid, (0, title))
    y = title+grid.height
    for s, r in zip(strips, refs):
        dr.text((8, y+6), f'reference: {Path(r).name} (anim/ref/{Path(r).parent.name}/sources.json)', fill=(200, 200, 200), font=font(16))
        out_im.paste(s, (0, y+28))
        y += s.height+30
    out_im.save(out)
    print('sheet', out, out_im.size)


def setup(fdir, chk, out, before=None, after_tag='with the elbow keys', before_tag='before (no elbow keys)'):
    """The guard setup sheet: pose B's deepest frame with rig-p8b's elbow keys (side, front, three-quarter at full width, then
    the close views at full size), the numbers after and, if given, before the elbow keys."""
    c = json.loads(Path(chk).read_text())
    r = c['frames']['guardB:0']
    appr = c['approvedCrouchFoldsMaxPerRegion']

    def line(tag, r):
        return (f"{tag}: folded/collapsed triangles  shoulder {r['folds']['shoulder']}  armpit {r['folds']['armpit']}  elbow {r['folds']['elbow']}  "
                f"wrist {r['folds'].get('wrist', '-')}  neck {r['folds']['neck']}  ear root {r['folds']['ear_root']};  arm vertices inside other skin "
                f"{r['arm_L_inside_upper']+r['arm_L_inside_forearm_hand']}/{r['arm_R_inside_upper']+r['arm_R_inside_forearm_hand']} (L/R);  "
                f"forearm and paw to chest/face {r['arm_L_forearm_hand_to_face_chest_min_mm']} mm;  elbow area ratio max {r['stretch']['elbow']['area_max']}")
    lines = [line(after_tag, r)]
    if before:
        lines.append(line(before_tag, json.loads(Path(before).read_text())['frames']['guardB:0']))
    lines.append(f"approved crouch maxima: shoulder {appr['shoulder']}, armpit {appr['armpit']}, elbow {appr['elbow']}, wrist {appr.get('wrist', '-')}, neck {appr['neck']}, ear root {appr['ear_root']}")
    big = [v for v in ('side', 'front', 'threequarter', 'back') if (Path(fdir)/'guardB'/v).exists()][:3]
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


def grid(fdirs, rows_json, out, title, size=400):
    """A comparison sheet: rows of [label, frames dir key, clip, [views]], each image <frames dir>/<clip>/<view>/0000.png
    resized to size px, the label over each row (fix pass 4: the shoulder against Night Stalk f18 and idle, the ear root)."""
    rows = json.loads(Path(rows_json).read_text()) if str(rows_json).endswith('.json') else json.loads(rows_json)
    S = int(size)
    W = max(len(r[3]) for r in rows)*S
    out_im = Image.new('RGB', (W, 30+len(rows)*(S+24)), (12, 12, 12))
    dr = ImageDraw.Draw(out_im)
    dr.text((8, 8), title, fill=(235, 235, 235), font=font(15))
    y = 30
    for lab, key, clip, views in rows:
        dr.text((8, y+4), lab, fill=(250, 210, 90), font=font(13))
        y += 22
        for i, v in enumerate(views):
            out_im.paste(Image.open(Path(fdirs[key])/clip/v/'0000.png').convert('RGB').resize((S, S), Image.LANCZOS), (i*S, y))
        y += S+2
    out_im.save(out)
    print('grid sheet', out, out_im.size)


def furcheck(fdir, approved_fur, out, picks_json, checks_json=None, S=560):
    """The batch 1 fur check sheet: per clip, its deepest frame's fur side view and sprite (3x nearest) beside the approved
    Night Stalk fur frame 18 at the same scale (the same framing box, so equal display sizes are equal scale), then its 3x
    close views; the fur check numbers per frame from fur-checks.json."""
    picks = json.loads(picks_json)            # [[clip, frame, [crop views]], ...]
    checks = {(r['clip'], r['frame']): r for r in json.loads(Path(checks_json).read_text())} if checks_json else {}
    ns_side = Image.open(Path(approved_fur)/'stalk'/'side'/'0018.png').convert('RGB').resize((S, S), Image.LANCZOS)
    ns_spr = Image.open(Path(approved_fur)/'stalk'/'sprite'/'0018.png').convert('RGB').resize((S, S), Image.NEAREST)
    cols = 4
    rows = []
    for clip, fr, crops in picks:
        r = checks.get((clip, fr), {})
        txt = (f"{clip} f{fr}: fur root error max {r.get('root_error_max_mm')} mm, strands with a point 0.5 mm inside the skin "
               f"{r.get('strands_inside_skin')} ({r.get('points_inside_skin')} points), length change max {r.get('length_change_max_pct')} pct")
        top = [Image.open(Path(fdir)/clip/'side'/f'{fr:04d}.png').convert('RGB').resize((S, S), Image.LANCZOS), ns_side,
               Image.open(Path(fdir)/clip/'sprite'/f'{fr:04d}.png').convert('RGB').resize((S, S), Image.NEAREST), ns_spr]
        cr = [Image.open(Path(fdir)/clip/v/f'{fr:04d}.png').convert('RGB').resize((S, S), Image.LANCZOS) for v in crops]
        rows.append((txt, top, ['side 720', 'Night Stalk f18 side (approved fur)', 'sprite 192 (3x)', 'Night Stalk f18 sprite (3x)']))
        rows.append((f'{clip} f{fr} close views at 3x the side view: ' + ', '.join(v.replace('crop_', '') for v in crops), cr, [v.replace('crop_', '') for v in crops]))
    W = cols*S
    H = 34+sum(S+44 for _ in rows)
    out_im = Image.new('RGB', (W, H), (12, 12, 12))
    dr = ImageDraw.Draw(out_im)
    dr.text((8, 8), 'Akinza batch 1 fur check: the deepest frame of each clip beside the approved Night Stalk fur frame 18, same scale', fill=(235, 235, 235), font=font(16))
    y = 34
    for txt, ims, labs in rows:
        dr.text((8, y+3), txt, fill=(250, 210, 90), font=font(13))
        y += 22
        for i, (im, lab) in enumerate(zip(ims, labs)):
            out_im.paste(im, (i*S, y))
            dr.rectangle([i*S, y, i*S+len(lab)*7+8, y+16], fill=(0, 0, 0))
            dr.text((i*S+4, y+2), lab, fill=(255, 255, 0), font=font(12))
        y += S+22
    out_im.save(out)
    print('fur check sheet', out, out_im.size)


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


def clips_json_b2(bake, out, extra):
    """Batch 2's clips.json: frames, events, entry and exit rules, the per-clip check summaries and per-frame numbers
    (checks-skin.json from clipset_checks_b2.py), the ear line against stalk f18 (ear-line.json), the render measures
    (measure-render.json) and any render logs or extra json given."""
    spec = json.loads((bake/'clipset-spec.json').read_text())
    chk = json.loads((bake/'checks-skin.json').read_text())
    meas = bake/'measure-render.json'
    meas = json.loads(meas.read_text()) if meas.exists() else {}
    ear = bake/'ear-line.json'
    ear = json.loads(ear.read_text()) if ear.exists() else {}
    rules = {'footSlide': 'planted sole contact drift per frame under 2 mm (frames the clip marks planted; the sole in contact both frames)',
             'startEnd': 'frame 0 equals approved idle frame 0 and the last frame equals approved idle frame 89, under 0.1 mm (faint: its start only)',
             'heldSeam': 'held frame 0 against frame 45 under 0.1 mm, and the velocity change across the seam against the largest elsewhere',
             'heldEntryExit': 'held_in frame 0 equals idle frame 0 and steps into loop frame 0; held_out frame 0 equals loop frame 0 and its last '
                              'frame equals idle frame 89',
             'folds': 'no more folded or collapsed triangles per region than the approved crouch clip (rest to night_stalk)',
             'ears': 'ear_root folds against the approved 50; the ear line against stalk f18 per frame (ear-line.json); no ear vertex inside '
                     'the skull or the nape and back',
             'tails': 'tails at least 60 mm apart and clear of the legs',
             'arms': 'held: arm skin inside the trunk and hips (vertices) and the smallest signed gap',
             'ground': 'faint: the lowest skin point per region (under 0 is below the floor) and vertices more than 1 mm under it',
             'furRootError': 'fur stage, after the blind critic passes the clay (not run)',
             'amplitudes': 'visible moves measured in the 720 side and 192 sprite renders (measure-render.json)'}
    doc = dict(format='akinza-clipset-b2', fps=spec['fps'], rig=spec['rig'], units='mm unless named', rules=rules,
               approvedCrouchFoldsMaxPerRegion=chk['approvedCrouchFoldsMaxPerRegion'], idleStep89to0_max_mm=chk['idleStep89to0_max_mm'],
               soleVertices=chk['soleVertices'], clips={})
    for clip in ('displaced', 'held', 'held_in', 'held_out', 'faint'):
        sp = spec.get(clip) or dict(frames=len(chk[clip]['frames']) if clip in chk else None, loop=False, events=[],
                                    partOf='held (see held.entry and held.exit)')
        entry = dict(frames=sp['frames'], loop=sp['loop'], events=sp['events'])
        for k in ('startsOn', 'endsOn', 'entry', 'exit', 'partOf', 'candidate'):
            if k in sp:
                entry[k] = sp[k]
        if clip in chk:
            entry['summary'] = chk[clip]['summary']
            entry['perFrame'] = [{k: v for k, v in r.items() if k not in ('bounds_src', 'info')} for r in chk[clip]['frames']]
        else:
            entry['status'] = 'not checked'
        if clip in ear:
            entry['earLine'] = dict(framesOnF18Line=ear[clip]['framesOnF18Line'], beyondF18OnLine=ear[clip]['beyondF18OnLine'],
                                    vsStalk18ScreenDeg=[r['vs_stalk18_screen'] for r in ear[clip]['perFrame']])
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


def setup_faint(fdir, chk, extra_json, out, picked='A'):
    """Batch 2's faint setup sheet: per lying candidate (A, B, C), the clay side 720, sprite 192 (3x nearest) and
    three-quarter views of the end pose on the bare rig, with its numbers: folds against the approved crouch maxima, the
    ground (the lowest skin point per region), the tails' clearances, the pixels the 192 sprite shows of the head, each ear and
    the tails (clipset_b2_preview.visible_regions) and the fur's hang below the floor (clip_frames --ground)."""
    c = json.loads(Path(chk).read_text())
    ex = json.loads(Path(extra_json).read_text())
    appr = c['approvedCrouchFoldsMaxPerRegion']
    S = 520
    names = {'A': 'A: on its right side (the far side down), the back to the camera, the head to the right',
             'B': 'B: on its right side, the belly and limbs to the camera, the head to the left (the elephant reference)',
             'C': "C: slumped forward on its belly, the near flank to the camera (the brief's example for B)"}
    rows = []
    for k in ('A', 'B', 'C'):
        r = c['frames'][f'faint{k}:0']
        over = r['regions_over_approved']
        v = ex.get('visible192', {}).get(f'faint{k}', {})
        fu = ex.get('fur', {}).get(f'faint{k}', {})
        lines = [names[k] + ('   << picked' if k == picked else ''),
                 f"folds over the approved crouch maxima: {over if over else 'none'};  ear root {r['folds']['ear_root']} (approved {appr['ear_root']}), "
                 f"tail fork {r['folds']['tail_fork']} ({appr['tail_fork']}), hip {r['folds']['hip']} ({appr['hip']}), neck {r['folds']['neck']} ({appr['neck']}), "
                 f"shoulder {r['folds']['shoulder']} ({appr['shoulder']})",
                 f"ground: lowest skin per region (mm) {r['ground_min_mm']}; vertices >1 mm under the floor {r['below_floor_1mm_vertices']}; "
                 f"fur lowest {fu.get('fur_lowest_mm', '-')} mm, strands under the floor {fu.get('strands_under_floor', '-')}",
                 f"tails apart ab {r['tail_ab_mm']} ac {r['tail_ac_mm']} bc {r['tail_bc_mm']} mm, to the legs a {r['tail_a_leg_mm']} b {r['tail_b_leg_mm']} "
                 f"c {r['tail_c_leg_mm']} mm;  sprite 192 pixels shown: head {v.get('head', 0)}, near ear {v.get('ear_near', 0)}, far ear "
                 f"{v.get('ear_far', 0)}, tails {v.get('tails', 0)} (idle frame 0: {ex.get('visible192', {}).get('idle0', {})})"]
        ims = [Image.open(Path(fdir)/f'faint{k}'/'side'/'0000.png').convert('RGB').resize((S, S), Image.LANCZOS),
               Image.open(Path(fdir)/f'faint{k}'/'sprite'/'0000.png').convert('RGB').resize((S, S), Image.NEAREST),
               Image.open(Path(fdir)/f'faint{k}'/'threequarter'/'0000.png').convert('RGB').resize((S, S), Image.LANCZOS)]
        rows.append((lines, ims))
    W = 3*S
    H = 40+sum(22*len(ln)+S+12 for ln, _ in rows)
    im = Image.new('RGB', (W, H), (12, 12, 12))
    dr = ImageDraw.Draw(im)
    dr.text((8, 8), 'Akinza faint setup check: the lying end pose candidates on the bare rig (clay), side 720, sprite 192 (3x), three-quarter',
            fill=(235, 235, 235), font=font(20))
    y = 40
    for ln, ims in rows:
        for i, t in enumerate(ln):
            dr.text((8, y), t, fill=(250, 210, 90) if i == 0 else (205, 205, 205), font=font(15 if i else 17))
            y += 22
        for i, x in enumerate(ims):
            im.paste(x, (i*S, y))
        y += S+12
    im.save(out)
    print('faint setup sheet', out, im.size)


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'seq':
        seq(Path(sys.argv[2]), Path(sys.argv[3]), Path(sys.argv[4]), sys.argv[5], tag=sys.argv[6] if len(sys.argv) > 6 else 'clay')
    elif cmd == 'sheet':
        sheet(Path(sys.argv[2]), sys.argv[3], sys.argv[4], Path(sys.argv[5]), sys.argv[6:])
    elif cmd == 'setup':
        setup(Path(sys.argv[2]), sys.argv[3], Path(sys.argv[4]), sys.argv[5] if len(sys.argv) > 5 else None, *sys.argv[6:8])
    elif cmd == 'grid':
        grid(dict(x.split('=', 1) for x in sys.argv[2].split(',')), sys.argv[3], Path(sys.argv[4]), sys.argv[5], *sys.argv[6:7])
    elif cmd == 'furcheck':
        furcheck(Path(sys.argv[2]), Path(sys.argv[3]), Path(sys.argv[4]), sys.argv[5], sys.argv[6] if len(sys.argv) > 6 else None)
    elif cmd == 'ankle':
        ankle(Path(sys.argv[2]), sys.argv[3], sys.argv[4], Path(sys.argv[5]))
    elif cmd == 'json':
        clips_json(Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4:])
    elif cmd == 'setupfaint':
        setup_faint(Path(sys.argv[2]), sys.argv[3], sys.argv[4], Path(sys.argv[5]), *sys.argv[6:7])
    elif cmd == 'json2':
        clips_json_b2(Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4:])
