"""Playback sequences, key-frame sheets, the setup sheet and clips.json for the batch 3 clips (move with move_in and move_out,
light, heavy). PIL, no Blender. New beside compose_clipset.py (batches 1 and 2), whose helpers it imports and does not change.

  python art/species-construction/anim/compose_clipset_b3.py seq <frames dir> <idle frames dir> <seq dir> <clip> [tag, clay by default]
      In context, twice: idle frames 60 to 89, the clip (move: move_in, the loop three times, move_out; the acts: their frames),
      then idle frames 0 to 29, a 0.5 s hold on that idle frame, and again. Per view; a sprite view also gets a 3x copy (nearest).
  python art/species-construction/anim/compose_clipset_b3.py sheet <frames dir> <clip> <spec json> <out png> [ref strips...]
      Every frame of the clip's side view (move: in f0.., the loop f0..23, out f0..), the event frames marked, the reference
      strips under them.
  python art/species-construction/anim/compose_clipset_b3.py setup <setup frames dir> <setup check json> <out png> <rows json>
      The setup sheet: per row [label, frame name, [views]], the views at 512 px (sprite 3x nearest), the frame's folds against
      the approved crouch maxima and its key angles under it.
  python art/species-construction/anim/compose_clipset_b3.py json3 <bake dir> <out json> [extra json...]
      clips.json for batch 3: frames, events, travel, reach, entry and exit rules, the per-clip check summaries and per-frame
      numbers (checks-skin.json from clipset_checks_b3.py), the ear line per frame (ear-line.json), the render measures
      (measure-render.json) and any render logs or extra json given.
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from compose_clips import font  # noqa: E402
from compose_clipset import FPS, place, count  # noqa: E402


def clip_order(frames, clip):
    if clip == 'move':
        n = count(frames, 'move')
        return ([('move_in', k) for k in range(count(frames, 'move_in'))]+[('move', k) for k in range(n)]*3
                + [('move_out', k) for k in range(count(frames, 'move_out'))])
    return [(clip, k) for k in range(count(frames, clip))]


def seq(frames, idle, out, clip, scale=3, tag='clay'):
    order = []
    for _ in range(2):
        order += [('idle', k) for k in range(60, 90)]
        order += clip_order(frames, clip)
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
    events = {}
    for e in sp['events']:
        events.setdefault(e['frame'], []).append(e['name'])
    n = sp['frames']
    W = 240
    parts = [(clip, k, '') for k in range(n)]
    if clip == 'move':
        parts = ([('move_in', k, 'in ') for k in range(count(frames, 'move_in'))]+[(clip, k, '') for k in range(n)]
                 + [('move_out', k, 'out ') for k in range(count(frames, 'move_out'))])
    tiles = []
    for c, k, pre in parts:
        im = Image.open(frames/c/'side'/f'{k:04d}.png').convert('RGB').resize((W, W), Image.LANCZOS)
        t = Image.new('RGB', (W, W+28), (20, 20, 20))
        t.paste(im, (0, 0))
        dr = ImageDraw.Draw(t)
        ev = events.get(k) if c == clip else None
        lab = f'{pre}f{k}'+(f"  {', '.join(ev)}" if ev else '')
        dr.text((6, W+4), lab, fill=(250, 210, 90) if ev else (235, 235, 235), font=font(18))
        tiles.append(t)
    per_row = 9
    rows = [tiles[i:i+per_row] for i in range(0, len(tiles), per_row)]
    th = tiles[0].height
    grid = Image.new('RGB', (W*per_row, th*len(rows)), (20, 20, 20))
    for r, row in enumerate(rows):
        for c_, t in enumerate(row):
            grid.paste(t, (c_*W, r*th))
    strips = [Image.open(r).convert('RGB') for r in refs if Path(r).exists()]
    strips = [s.resize((min(grid.width, round(s.width*220/s.height)), 220), Image.LANCZOS) for s in strips]
    title = 34
    h = title+grid.height+sum(s.height+30 for s in strips)
    out_im = Image.new('RGB', (grid.width, h), (12, 12, 12))
    dr = ImageDraw.Draw(out_im)
    what = (f"move_in (in f0 to f{count(frames, 'move_in')-1}), the loop (f0 to f{n-1}) and move_out (out f0 to f{count(frames, 'move_out')-1})"
            if clip == 'move' else f'every frame of {n}')
    dr.text((8, 6), f'Akinza {clip}: {what} (30 fps), clay side; events marked; reference frames below', fill=(235, 235, 235), font=font(20))
    out_im.paste(grid, (0, title))
    y = title+grid.height
    for s, r in zip(strips, refs):
        dr.text((8, y+6), f'reference: {Path(r).name} (anim/ref/{Path(r).parent.name}/sources.json)', fill=(200, 200, 200), font=font(16))
        out_im.paste(s, (0, y+28))
        y += s.height+30
    out_im.save(out)
    print('sheet', out, out_im.size)


def setup(fdir, chk, out, rows_json, S=512):
    """The batch 3 setup sheet: per row [label, frame name, [views]] the views (sprite at 3x nearest, everything at S px), with the
    frame's folds over the approved crouch maxima (none if empty), the regions that matter for it and its joint angles."""
    c = json.loads(Path(chk).read_text())
    appr = c['approvedCrouchFoldsMaxPerRegion']
    rows = json.loads(Path(rows_json).read_text()) if str(rows_json).endswith('.json') else json.loads(rows_json)
    per = max(len(r[2]) for r in rows)
    blocks = []
    for lab, name, views in rows:
        r = c['frames'][f'{name}:0']
        over = r['regions_over_approved']
        ang = r['angles']
        lines = [lab,
                 f"folds over the approved crouch maxima: {over if over else 'none'};  shoulder {r['folds']['shoulder']} ({appr['shoulder']}), armpit "
                 f"{r['folds']['armpit']} ({appr['armpit']}), elbow {r['folds']['elbow']} ({appr['elbow']}), hip {r['folds']['hip']} ({appr['hip']}), knee "
                 f"{r['folds']['knee']} ({appr['knee']}), ankle {r['folds']['ankle']} ({appr['ankle']}), tail fork {r['folds']['tail_fork']} ({appr['tail_fork']}), "
                 f"neck {r['folds']['neck']} ({appr['neck']}), belly {r['folds']['belly']} ({appr['belly']})",
                 f"angles (degrees of swing from rest): thigh {ang['thigh_L']}/{ang['thigh_R']}, knee {ang['knee_L']}/{ang['knee_R']}, ankle (+ pointing) "
                 f"{ang['ankle_L']}/{ang['ankle_R']}, upper arm {ang['upperarm_L']}/{ang['upperarm_R']}, elbow {ang['elbow_L']}/{ang['elbow_R']};  keys "
                 + ', '.join(f'{k} {v}' for k, v in sorted(r['keys'].items()) if any(s in k for s in ('shoulder', 'armpit', 'ankle', 'knee_mush.', 'elbow_mush.')))]
        ims = []
        for v in views:
            im = Image.open(Path(fdir)/name/v/'0000.png').convert('RGB')
            im = im.resize((S, S), Image.NEAREST if v.startswith('sprite') else Image.LANCZOS)
            ImageDraw.Draw(im).text((6, 6), v.replace('crop_', 'close: ')+(' 192 (3x)' if v == 'sprite' else ''), fill=(255, 230, 90), font=font(16))
            ims.append(im)
        blocks.append((lines, ims))
    H = 40+sum(22*len(ln)+S+14 for ln, _ in blocks)
    out_im = Image.new('RGB', (per*S, H), (12, 12, 12))
    dr = ImageDraw.Draw(out_im)
    dr.text((8, 8), 'Akinza clip set batch 3 setup check: the extreme poses on the bare rig (clay)', fill=(235, 235, 235), font=font(20))
    y = 40
    for ln, ims in blocks:
        for i, t in enumerate(ln):
            dr.text((8, y), t, fill=(250, 210, 90) if i == 0 else (205, 205, 205), font=font(17 if i == 0 else 14))
            y += 22
        for i, im in enumerate(ims):
            out_im.paste(im, (i*S, y))
        y += S+14
    out_im.save(out)
    print('setup sheet', out, out_im.size)


def clips_json_b3(bake, out, extra):
    spec = json.loads((bake/'clipset-spec.json').read_text())
    chk = json.loads((bake/'checks-skin.json').read_text())
    meas = bake/'measure-render.json'
    meas = json.loads(meas.read_text()) if meas.exists() else {}
    ear = bake/'ear-line.json'
    ear = json.loads(ear.read_text()) if ear.exists() else {}
    rules = {'startEnd': 'the acts and move_in start on approved idle frame 0; the acts and move_out end on approved idle frame 89 (under 0.1 mm)',
             'moveSeam': 'move frame 0 against the module\'s frame 24 under 0.1 mm, and the velocity change across the seam against the loop\'s median',
             'moveEntryExit': 'move_in frame 0 equals idle frame 0 and steps into loop frame 0; move_out frame 0 equals loop frame 0 and its last frame '
                              'equals idle frame 89',
             'plantedFeet': 'move: each planted foot\'s contact point (the hind claws\' lowest point, on the foot bone) moves straight back at one speed '
                            '(within 5 percent over its stance, both feet the same), its vertical drift under 2 mm, the heel never on the floor',
             'footSlide': 'acts: planted sole contact drift per frame under 2 mm (frames the clip marks planted; the sole in contact both frames)',
             'folds': 'no more folded or collapsed triangles per region than the approved crouch clip (rest to night_stalk)',
             'ears': 'ear_root folds against the approved 50; the ear line against stalk f18 per frame (ear-line.json); no ear vertex inside the skull or '
                     'the nape and back',
             'tails': 'tails at least 60 mm apart and clear of the legs',
             'arms': 'arm skin inside the chest, face, trunk and hips (vertices) and the smallest gaps',
             'reach': 'acts: the striking claw tips\' furthest point forward at `hit` (-y from the origin, metres) and their distance from the origin',
             'furRootError': 'fur stage, after the blind critic passes the clay (not run)',
             'amplitudes': 'visible moves measured in the 720 side and 192 sprite renders (measure-render.json)'}
    doc = dict(format='akinza-clipset-b3', fps=spec['fps'], rig=spec['rig'], units='mm unless named', rules=rules,
               approvedCrouchFoldsMaxPerRegion=chk['approvedCrouchFoldsMaxPerRegion'], idleStep89to0_max_mm=chk['idleStep89to0_max_mm'],
               contactPoint=chk.get('contactPoint'), clips={})
    for clip in ('move', 'move_in', 'move_out', 'light', 'heavy'):
        sp = spec.get(clip, {})
        entry = {k: v for k, v in sp.items() if k != 'params'}
        if clip in chk:
            entry['summary'] = chk[clip]['summary']
            S = chk[clip]['summary']
            if 'reach_at_hit_forward_m' in S:            # the acts: the measured reach (the further striking claw tips forward at `hit`)
                entry['reachM'] = max(S.get(f'reach_at_hit_forward_m_{o}', S['reach_at_hit_forward_m']) for o in 'LR')
                entry['reachRule'] = ('reachM: the striking claw tips\' furthest point forward of the origin (along the facing) at `hit`, '
                                      'measured on the posed claws; reachDeclaredM was the brief\'s starting value')
            entry['perFrame'] = [{k: v for k, v in r.items() if k not in ('bounds_src', 'info')} for r in chk[clip]['frames']]
        else:
            entry['status'] = 'not checked'
        if clip in ear:
            entry['earLine'] = dict(framesOnF18Line=ear[clip]['framesOnF18Line'], vsStalk18ScreenDeg=[r['vs_stalk18_screen'] for r in ear[clip]['perFrame']],
                                    vsStalk10ScreenDeg=[r['vs_stalk10_screen'] for r in ear[clip]['perFrame']])
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
        seq(Path(sys.argv[2]), Path(sys.argv[3]), Path(sys.argv[4]), sys.argv[5], tag=sys.argv[6] if len(sys.argv) > 6 else 'clay')
    elif cmd == 'sheet':
        sheet(Path(sys.argv[2]), sys.argv[3], sys.argv[4], Path(sys.argv[5]), sys.argv[6:])
    elif cmd == 'setup':
        setup(Path(sys.argv[2]), sys.argv[3], Path(sys.argv[4]), sys.argv[5])
    elif cmd == 'json3':
        clips_json_b3(Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4:])
