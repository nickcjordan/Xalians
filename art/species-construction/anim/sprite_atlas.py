"""Akinza sprites pass 1 (sprites-pass1-brief.md): pack the furred sprite frames into xalians-frame-atlas-v2 and build
the standalone review player. PIL and numpy, no Blender.

  python art/species-construction/anim/sprite_atlas.py pack <sprites1 dir> <clips spec json> [--status-clear 10]
      <sprites1>/frames/<clip>/NNNN.png (192 px straight-alpha RGBA cells) and <sprites1>/frames-raw/<clip>/sockets.json
      (clip_frames.py --sockets) -> <sprites1>/atlas/: manifest.json, one sheet per clip and facing, sha256.txt.
  python art/species-construction/anim/sprite_atlas.py player <sprites1 dir>
      <sprites1>/player.html: one standalone page with the sheets as data URIs and the v2 reader inlined.

Atlas (docs/design/creature-asset-contract.md section 8, decision 12): one fixed 192 px cell for both clips (the
clips4 sprite camera); each frame trimmed to its pixels with any alpha, packed into its clip's sheet (2 px apart), with
its offset back into the cell; `anchor` is the cell pixel nearest the ground socket at idle frame 0. Sockets per frame
in cell pixels (continuous, origin top-left, y down), from the posed rig of that frame (clip_frames.py --sockets):
ground, head, eye_l, eye_r, emitter, carry; status is the head socket's column, --status-clear px above the highest
head, jaw or ear skin point of that frame. Clips: `idle` (90 frames, loops, no events) and `sig.night-stalk` (45
frames, plays once, markers set (the clip spec's conceal) and recover from the clip spec, entry and then = idle frame 0).
"""
import argparse
import base64
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image

CELL = 192
FPS = 30
PAD = 2
SOCKETS = ['ground', 'head', 'eye_l', 'eye_r', 'emitter', 'status', 'carry']
CLIPS = {'idle': dict(src='idle', frames=90), 'sig.night-stalk': dict(src='stalk', frames=45)}
ROOT = Path(__file__).resolve().parents[3]
READER = ROOT/'art/creature-motion-pilot/runtime/atlas-player-v2.mjs'


# the clip spec's settle event is `conceal`; the contract names a self act's settle event `set` (section 6)
CONTRACT_EVENT = {'conceal': 'set'}

def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def trim(im):
    A = np.asarray(im)[..., 3]
    ys, xs = np.nonzero(A)
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max())+1, int(ys.max())+1
    return im.crop((x0, y0, x1, y1)), (x0, y0)


def shelf(sizes):
    """Shelf packing in frame order: rows left to right, wrapped at a width near the square root of the total area."""
    area = sum((w+PAD)*(h+PAD) for w, h in sizes)
    width = max(max(w for w, _ in sizes), int(math.ceil(math.sqrt(area)*1.05)))
    x = y = row_h = 0
    out = []
    for w, h in sizes:
        if x and x+w > width:
            x, y, row_h = 0, y+row_h+PAD, 0
        out.append((x, y))
        x += w+PAD
        row_h = max(row_h, h)
    return out, width, y+row_h


def cmd_pack(a):
    S = Path(a.sprites)
    spec = json.loads(Path(a.spec).read_text())
    out = S/'atlas'
    out.mkdir(parents=True, exist_ok=True)
    for f in out.iterdir():
        if f.is_file():
            f.unlink()                               # this pass's own output folder, rebuilt each run
    socks = {}
    for name, c in CLIPS.items():
        rows = json.loads((S/'frames-raw'/c['src']/'sockets.json').read_text())['rows']
        socks[name] = {r['frame']: r for r in rows}
        assert sorted(socks[name]) == list(range(c['frames'])), name
    g0 = np.array(socks['idle'][0]['uv']['ground'])*CELL
    anchor = [int(math.floor(g0[0])), int(math.floor(g0[1]))]
    ev = {e['name']: e['frame'] for e in spec['nightStalk']['events']}
    clips, files = {}, {}
    for name, c in CLIPS.items():
        n = c['frames']
        assert spec['idle' if name == 'idle' else 'nightStalk']['frames'] == n
        tiles, offs = [], []
        for f in range(n):
            im = Image.open(S/'frames'/c['src']/f'{f:04d}.png')
            assert im.mode == 'RGBA' and im.size == (CELL, CELL), (name, f, im.mode, im.size)
            t, o = trim(im)
            tiles.append(t)
            offs.append(o)
        pos, W, H = shelf([t.size for t in tiles])
        sheet = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        frames = []
        for f, (t, o, p) in enumerate(zip(tiles, offs, pos)):
            sheet.paste(t, p)
            r = socks[name][f]
            sk = {k: [round(v*CELL, 2) for v in r['uv'][k]] for k in ('ground', 'head', 'eye_l', 'eye_r', 'emitter', 'carry')}
            top = r['aux']['head_ear_top'][1]*CELL
            sk['status'] = [round(r['uv']['head'][0]*CELL, 2), round(top-a.status_clear, 2)]
            frames.append(dict(x=p[0], y=p[1], w=t.size[0], h=t.size[1], offset=[o[0], o[1]], sockets={k: sk[k] for k in SOCKETS}))
        fname = f'{name}-side.png'
        sheet.save(out/fname, optimize=True)
        files[fname] = sha(out/fname)
        clip = dict(frameCount=n, durationMs=round(n*1000/FPS, 3), loop=name == 'idle', markers=[])
        if name != 'idle':
            clip.update(name='Night Stalk', act='akinza-defining',
                        archetype='focus',  # contract section 6: a self act (status on self) is the focus brace, events set and recover
                        markers=[dict(name=CONTRACT_EVENT.get(k, k), frame=ev[k], timeMs=round(ev[k]*1000/FPS, 3)) for k in ('conceal', 'recover')],
                        entry=dict(clip='idle', frame=0, note="frame 0 is idle frame 0's pose: start it in place of idle frame 0"),
                        then=dict(clip='idle', frame=0, note="frame 44 is idle frame 89's pose: idle frame 0 follows, so no image repeats or is skipped"))
        clip['facings'] = dict(side=dict(sheet=fname, size=[W, H], frames=frames))
        clips[name] = clip
    info = json.loads((S/'sprites.json').read_text()) if (S/'sprites.json').exists() else {}
    manifest = dict(
        format='xalians-frame-atlas-v2', species='akinza', profile='slice-side-192',
        cell=dict(w=CELL, h=CELL), anchor=anchor, fps=FPS,
        pixels='cell pixels: origin at the cell top-left, x right, y down; pixel (i, j) covers [i, i+1) x [j, j+1); socket '
               'positions are continuous. A frame goes into the cell at its offset; the anchor goes on the creature\'s floor point',
        facings=dict(side=dict(camera='side_left', faces='left', note='the creature faces left (-x); mirror x about the anchor to face right')),
        sockets=SOCKETS,
        socketRules=dict(
            ground='the floor point midway between the two planted ankles', head="the head bone's midpoint",
            eye_l="the rig's left eye center on the head bone (the creature's left, the near side here)",
            eye_r="the rig's right eye center on the head bone (far side, behind the head here)",
            emitter='the front of the mouth: the midline skin point at the mouth height that is farthest forward',
            status=f'the head socket\'s column, {a.status_clear} px above the highest head, jaw or ear skin point of the frame',
            carry="midway between the two hand bones' midpoints"),
        clips=clips, files=files,
        source=dict(rig='anim/rig-p8b', fur='surface/fur-steps/s12-29c-legs3b', palette='T7',
                    clips='anim/clips4 (akinza_clips.py, clip_frames.py at 8e3286ad), approved F40',
                    render=info.get('render'), camera='clips4 sprite camera: look-dev side_left, azimuth 90, elevation 0, '
                    'ortho, fitted to the union of both clips\' skin bounds 6 cm out, 6 percent margin'))
    (out/'manifest.json').write_text(json.dumps(manifest, indent=1)+'\n')
    lines = [f'{sha(out/f)}  {f}' for f in sorted(p.name for p in out.iterdir() if p.is_file() and p.name != 'sha256.txt')]
    (out/'sha256.txt').write_text('\n'.join(lines)+'\n')
    print('packed', {k: (v['facings']['side']['size'], (out/v['facings']['side']['sheet']).stat().st_size) for k, v in clips.items()},
          'anchor', anchor)


# ---------------------------------------------------------------- player

PAGE = r'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Akinza Sprite Player</title>
<style>
:root {
  --page: #f4f5f6; --ink: #1b2026; --muted: #56606b; --line: #c9ced4; --panel: #ffffff;
  --night: #18212a; --day: #e8ecef; --key: #1f4f8a; --key-ink: #ffffff; --mark: #f2a516;
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--page); color: var(--ink); font: 16px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
main { max-width: 1120px; margin: 0 auto; padding: 16px; }
h1 { font-size: 22px; margin: 4px 0 4px; }
p.sub { margin: 0 0 14px; color: var(--muted); font-size: 14px; }
.controls { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 10px; }
button { font: inherit; font-weight: 600; min-height: 48px; min-width: 48px; padding: 0 18px; border-radius: 6px; border: 2px solid var(--key);
  background: var(--panel); color: var(--key); cursor: pointer; touch-action: manipulation; }
button.primary { background: var(--key); color: var(--key-ink); }
button:focus-visible, input:focus-visible { outline: 3px solid var(--mark); outline-offset: 2px; }
label.toggle { display: inline-flex; align-items: center; gap: 8px; min-height: 48px; padding: 0 6px; font-size: 15px; cursor: pointer; }
label.toggle input { width: 22px; height: 22px; margin: 0; }
#status { font: 14px/1.4 ui-monospace, "Cascadia Mono", Consolas, monospace; background: var(--panel); border: 1px solid var(--line);
  border-radius: 6px; padding: 8px 10px; margin-bottom: 14px; min-height: 2.9em; overflow-wrap: anywhere; }
.stages { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-start; }
figure { margin: 0; background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 8px; max-width: 100%; }
figure canvas { display: block; image-rendering: pixelated; image-rendering: crisp-edges; }
figcaption { font-size: 13px; color: var(--muted); margin-top: 6px; }
.legend { display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 14px 0 6px; font-size: 14px; }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.legend canvas { width: 16px; height: 16px; }
.facts { font-size: 13px; color: var(--muted); margin-top: 12px; }
.facts code { font-size: 12px; overflow-wrap: anywhere; }
</style>
</head>
<body>
<main>
<h1>Akinza sprites</h1>
<p class="sub">Idle loops; Night Stalk plays once and hands back to idle frame 0. Side facing, 192 px cell, 30 fps, read through the xalians-frame-atlas-v2 reader.</p>
<div class="controls">
  <button id="stalk" class="primary" type="button">Night Stalk</button>
  <button id="pause" type="button" aria-pressed="false">Pause</button>
  <button id="step" type="button" aria-label="Step one frame">Step</button>
  <label class="toggle"><input id="sockets" type="checkbox"> Socket dots</label>
  <label class="toggle"><input id="entry" type="checkbox" checked> Start at idle frame 0</label>
</div>
<div id="status" aria-live="polite">loading</div>
<div class="stages" id="stages"></div>
<div class="legend" id="legend" hidden></div>
<div class="facts" id="facts"></div>
</main>
<script type="module">
__READER__
const MANIFEST = __MANIFEST__;
const SHEETS = __SHEETS__;
const VIEW2X = __VIEW2X__;
const FACTS = __FACTS__;
const BG = { night: getComputedStyle(document.documentElement).getPropertyValue('--night').trim(), day: getComputedStyle(document.documentElement).getPropertyValue('--day').trim() };
const atlas = await atlasFromSources(MANIFEST, (s) => SHEETS[s]);
const cell = MANIFEST.cell;
const full = [0, 0, cell.w, cell.h];
const stages = [
  { bg: 'night', scale: 1, view: full, label: 'Night, actual size (192 px cell)' },
  { bg: 'night', scale: 2, view: VIEW2X, label: `Night, 2x (the frames' union box, x ${VIEW2X[0]} to ${VIEW2X[2]}, y ${VIEW2X[1]} to ${VIEW2X[3]})` },
  { bg: 'day', scale: 1, view: full, label: 'Light, actual size' },
  { bg: 'day', scale: 2, view: VIEW2X, label: 'Light, 2x' },
];
const host = document.getElementById('stages');
const k = Math.max(1, Math.round(window.devicePixelRatio || 1));
for (const st of stages) {
  const fig = document.createElement('figure');
  const c = document.createElement('canvas');
  const w = (st.view[2] - st.view[0]) * st.scale, h = (st.view[3] - st.view[1]) * st.scale;
  c.width = w * k; c.height = h * k; c.style.width = `${w}px`; c.style.height = `${h}px`;
  const cap = document.createElement('figcaption');
  cap.textContent = st.label;
  fig.append(c, cap);
  host.append(fig);
  st.ctx = c.getContext('2d');
  st.w = w; st.h = h;
}
const MARKS = {
  ground: 'square', head: 'circle', eye_l: 'ring', eye_r: 'cross', emitter: 'diamond', status: 'triangle', carry: 'plus',
};
function mark(ctx, shape, x, y, r) {
  ctx.beginPath();
  if (shape === 'square') ctx.rect(x - r, y - r, 2 * r, 2 * r);
  else if (shape === 'circle' || shape === 'ring') ctx.arc(x, y, r, 0, Math.PI * 2);
  else if (shape === 'diamond') { ctx.moveTo(x, y - r * 1.3); ctx.lineTo(x + r * 1.3, y); ctx.lineTo(x, y + r * 1.3); ctx.lineTo(x - r * 1.3, y); ctx.closePath(); }
  else if (shape === 'triangle') { ctx.moveTo(x, y - r * 1.3); ctx.lineTo(x + r * 1.2, y + r); ctx.lineTo(x - r * 1.2, y + r); ctx.closePath(); }
  if (shape === 'cross' || shape === 'plus') {
    const d = shape === 'cross' ? r * 0.9 : r * 1.2;
    const segs = shape === 'cross' ? [[-d, -d, d, d], [-d, d, d, -d]] : [[-d, 0, d, 0], [0, -d, 0, d]];
    for (const lw of [4, 2]) {
      ctx.lineWidth = lw; ctx.strokeStyle = lw === 4 ? '#101418' : '#f2a516';
      ctx.beginPath(); for (const [a, b, c2, d2] of segs) { ctx.moveTo(x + a, y + b); ctx.lineTo(x + c2, y + d2); } ctx.stroke();
    }
    return;
  }
  ctx.lineWidth = 1.5; ctx.strokeStyle = '#101418';
  if (shape === 'ring') { ctx.lineWidth = 3.5; ctx.stroke(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#f2a516'; ctx.stroke(); return; }
  ctx.fillStyle = '#f2a516'; ctx.fill(); ctx.stroke();
}
const legend = document.getElementById('legend');
for (const [name, shape] of Object.entries(MARKS)) {
  const s = document.createElement('span');
  const c = document.createElement('canvas'); c.width = 32; c.height = 32;
  const x = c.getContext('2d'); x.scale(2, 2); mark(x, shape, 8, 8, 4);
  s.append(c, document.createTextNode(name)); legend.append(s);
}
const showSockets = document.getElementById('sockets');
showSockets.addEventListener('change', () => { legend.hidden = !showSockets.checked; draw(); });
const seq = createSequencer(MANIFEST, 'idle');
const fd = frameDurationMs(MANIFEST);
const log = { shown: [], events: [] };
window.__sprites = { seq, log, manifest: MANIFEST };
let lastEvent = '';
function draw() {
  const clip = seq.clip, frame = seq.frame();
  for (const st of stages) {
    const ctx = st.ctx;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = BG[st.bg]; ctx.fillRect(0, 0, st.w, st.h);
    const ax = (MANIFEST.anchor[0] - st.view[0]) * st.scale, ay = (MANIFEST.anchor[1] - st.view[1]) * st.scale;
    drawFrame(ctx, atlas, clip, 'side', frame, ax, ay, st.scale);
    if (showSockets.checked) {
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = st.bg === 'night' ? 'rgba(232,236,239,.55)' : 'rgba(24,33,42,.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, ay + 0.5); ctx.lineTo(st.w, ay + 0.5); ctx.stroke(); ctx.restore();
      for (const name of MANIFEST.sockets) {
        const [sx, sy] = socketAt(MANIFEST, clip, 'side', frame, name, { scale: st.scale });
        mark(ctx, MARKS[name], ax + sx, ay + sy, st.scale === 1 ? 2.5 : 3.5);
      }
    }
  }
  const q = seq.queued ? ' | Night Stalk queued: starts at idle frame 0' : '';
  document.getElementById('status').textContent = `${clip} frame ${frame} of ${MANIFEST.clips[clip].frameCount} (${Math.round(seq.timeMs)} ms)${q}${lastEvent ? ' | last marker: ' + lastEvent : ''}`;
}
function tick(dt) {
  const r = seq.advance(dt);
  for (const e of r.events) { lastEvent = `${e.name} at ${Math.round(e.atMs)} ms`; log.events.push(`${e.clip}:${e.name}@${Math.round(e.atMs)}`); }
  log.shown.push(`${r.clip}:${r.frame}`);
  if (log.shown.length > 2000) log.shown.splice(0, 1000);
  draw();
}
let paused = false, last = null, acc = 0;
function loop(now) {
  if (last !== null && !paused) {
    acc += Math.min(250, now - last);
    while (acc >= fd) { acc -= fd; tick(fd); }
  }
  last = now;
  requestAnimationFrame(loop);
}
document.getElementById('stalk').addEventListener('click', () => {
  seq.play('sig.night-stalk', { atEntry: document.getElementById('entry').checked });
  if (seq.clip === 'sig.night-stalk') lastEvent = '';
  draw();
});
const pauseBtn = document.getElementById('pause');
pauseBtn.addEventListener('click', () => { paused = !paused; pauseBtn.textContent = paused ? 'Play' : 'Pause'; pauseBtn.setAttribute('aria-pressed', String(paused)); });
document.getElementById('step').addEventListener('click', () => { if (!paused) pauseBtn.click(); tick(fd); });
document.getElementById('facts').innerHTML = FACTS;
draw();
requestAnimationFrame(loop);
window.__sprites.ready = true;
</script>
</body>
</html>
'''


def cmd_player(a):
    S = Path(a.sprites)
    A = S/'atlas'
    m = json.loads((A/'manifest.json').read_text())
    sheets = {}
    for c in m['clips'].values():
        for side in c['facings'].values():
            sheets[side['sheet']] = 'data:image/png;base64,'+base64.b64encode((A/side['sheet']).read_bytes()).decode()
    lo = [CELL, CELL]
    hi = [0, 0]
    for c in m['clips'].values():
        for side in c['facings'].values():
            for fr in side['frames']:
                lo = [min(lo[0], fr['offset'][0]), min(lo[1], fr['offset'][1])]
                hi = [max(hi[0], fr['offset'][0]+fr['w']), max(hi[1], fr['offset'][1]+fr['h'])]
                for p in fr['sockets'].values():
                    lo = [min(lo[0], math.floor(p[0])), min(lo[1], math.floor(p[1]))]
                    hi = [max(hi[0], math.ceil(p[0])), max(hi[1], math.ceil(p[1]))]
    view = [max(0, lo[0]-6), max(0, lo[1]-6), min(CELL, hi[0]+6), min(CELL, hi[1]+6)]
    info = json.loads((S/'sprites.json').read_text()) if (S/'sprites.json').exists() else {}
    r = info.get('render', {})
    facts = ('Render: ' + (r.get('way', '') or '') + f"; Cycles {r.get('samples', '')} samples, {r.get('filterWidth', '')} px filter, "
             f"OpenImageDenoise, seed {r.get('seed', '')}; film transparent, straight-alpha RGBA. Rig rig-p8b, fur s12-29c-legs3b, palette T7. "
             f"Sheets: " + ', '.join(f"<code>{k}</code> {Path(A/k).stat().st_size//1024} KB" for k in sheets) + '. Manifest <code>atlas/manifest.json</code>.')
    reader = READER.read_text()
    html = (PAGE.replace('__READER__', reader).replace('__MANIFEST__', json.dumps(m))
            .replace('__SHEETS__', json.dumps(sheets)).replace('__VIEW2X__', json.dumps(view)).replace('__FACTS__', json.dumps(facts)))
    (S/'player.html').write_text(html, encoding='utf-8')
    size = (S/'player.html').stat().st_size
    print('player.html', size, 'bytes', round(size/1024/1024, 2), 'MB', 'view2x', view)
    assert size < 8*1024*1024, 'player over 8 MB'


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest='cmd', required=True)
    k = sub.add_parser('pack')
    k.add_argument('sprites')
    k.add_argument('spec')
    k.add_argument('--status-clear', type=float, default=10.)
    q = sub.add_parser('player')
    q.add_argument('sprites')
    a = p.parse_args()
    {'pack': cmd_pack, 'player': cmd_player}[a.cmd](a)
