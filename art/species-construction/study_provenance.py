"""Bind local geometry experiments to input bytes and imported helper sources."""
import hashlib
import json
from pathlib import Path
import shutil


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def snapshot(out, entry, inputs):
    out, entry = Path(out), Path(entry).resolve()
    source = out / 'source-snapshot'
    source.mkdir()
    names = [entry.name, 'study_provenance.py', 'blender_blockout.py', 'blender_probe.py',
             'authored_surfaces.py', 'surface_math.py']
    sources = {}
    for name in dict.fromkeys(names):
        target = source / name
        shutil.copyfile(entry.parent / name, target)
        sources[name] = digest(target)
    record = {'scope': 'Input and helper snapshot taken before mesh import',
              'inputs': {str(Path(p).resolve()): digest(p) for p in inputs},
              'sources': sources}
    path = out / 'stage-start.json'
    path.write_text(json.dumps(record, indent=2) + '\n')
    return digest(path)
