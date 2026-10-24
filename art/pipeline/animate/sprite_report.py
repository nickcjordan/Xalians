"""Luceras sprites pass 1 report.json: paths with sha256, cell, frame counts, render time, checks, open notes.

python sprite_report.py PASS_DIR NOTES.json
"""
import json, sys, hashlib
from pathlib import Path

P = Path(sys.argv[1]); notes = json.loads(Path(sys.argv[2]).read_text()) if len(sys.argv) > 2 else {}
cell = json.loads((P / 'cell.json').read_text()); fin = json.loads((P / 'finalize.json').read_text())
pops = json.loads((P / 'pops.json').read_text()); fr = {d.name: json.loads((d / 'fringe.json').read_text()) for d in sorted((P / 'alpha_check').iterdir())}


def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()


files = {}
for sub in ('sheets', 'preview'):
    for p in sorted((P / sub).glob('*')): files[str(p.relative_to(P)).replace('\\', '/')] = sha(p)
for p in ('cell.json', 'measure.json', 'pops.json', 'root_offsets.json'): files[p] = sha(P / p)
frames = {}
for clip in fin['clips']:
    frames[clip] = {p.name: sha(p) for p in sorted((P / 'frames' / clip).glob('*.png'))}
    frames[clip + ' (4x masters)'] = {p.name: sha(p) for p in sorted((P / 'master' / clip).glob('*.png'))}
rt = {}
for clip in fin['clips']:
    t = json.loads((P / 'master' / clip / 'render_times.json').read_text()); v = list(t.values())
    rt[clip] = dict(frames=len(v), total_s=round(sum(v), 1), mean_s=round(sum(v) / len(v), 1), max_s=max(v))
rep = dict(build='luceras-sprites pass1', source=dict(scene='luceras-surface/headpass1/scene_of_record.blend (k16 groom), opened read-only',
           bake='luceras-reskin/pass10/anim3/work/bake.json (h1 rig, pass 10 clips)'),
           cell=cell, clips=fin['clips'], render_time=rt, downscale=dict(method='premultiplied 4x4 box (area) filter, output straight alpha', comparison=fr),
           pop_checks=pops, files_sha256=files, frames_sha256=frames, tools=['art/pipeline/animate/sprite_render.py', 'sprite_cell.py', 'sprite_downscale.py',
           'sprite_pops.py', 'sprite_finalize.py', 'sprite_report.py'], **notes)
(P / 'report.json').write_text(json.dumps(rep, indent=1)); print('report written', len(files), 'files')
