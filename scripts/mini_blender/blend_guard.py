"""Blender preflight for inferred jobs: require available, declared blend resources."""
import json
from pathlib import Path
import sys
import bpy

config = json.loads(Path(sys.argv[-1]).read_text())
allowed = {Path(p).resolve() for p in config['inputs']}

def resource(owner, value):
    if not value or value == '<builtin>':
        return
    path = Path(bpy.path.abspath(value, library=getattr(owner, 'library', None))).resolve()
    if path not in allowed or not path.is_file():
        raise RuntimeError('INFERENCE_UNSAFE: undeclared or unavailable blend resource: ' + value)

for blend in config['blends']:
    bpy.ops.wm.open_mainfile(filepath=blend)
    for library in bpy.data.libraries:
        resource(library, library.filepath)
    for collection in (bpy.data.images, bpy.data.fonts, bpy.data.sounds, bpy.data.movieclips,
                       bpy.data.cache_files, bpy.data.volumes):
        for item in collection:
            if getattr(item, 'packed_file', None) or len(getattr(item, 'packed_files', [])):
                continue
            if getattr(item, 'source', None) in ('GENERATED', 'VIEWER'):
                continue
            if getattr(item, 'source', None) in ('SEQUENCE', 'TILED') or getattr(item, 'is_sequence', False):
                raise RuntimeError('INFERENCE_UNSAFE: sequence or tiled asset requires a manifest')
            resource(item, getattr(item, 'filepath', ''))
    for obj in bpy.data.objects:
        for modifier in obj.modifiers:
            cache = getattr(modifier, 'point_cache', None)
            if cache and cache.use_disk_cache:
                raise RuntimeError('INFERENCE_UNSAFE: disk simulation cache requires a manifest')
            if getattr(modifier, 'bake_directory', ''):
                raise RuntimeError('INFERENCE_UNSAFE: geometry bake directory requires a manifest')
print('Inferred blend resource preflight passed')
