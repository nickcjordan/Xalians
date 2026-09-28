"""Render matched construction close-ups from an existing Blender scene.

Run with Blender: -b <scene.blend> --python render_details.py -- --spec <json> --out <new-dir>.
The saved creature and lights are used without modification. This is not image editing.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blender_probe import aim


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--spec', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    args.out.mkdir(parents=True, exist_ok=False)
    spec = json.loads(args.spec.read_text())
    scene = bpy.context.scene
    scene.render.resolution_x = scene.render.resolution_y = spec['resolution']
    scene.render.resolution_percentage = 100
    records = []
    for view in spec['views']:
        target = Vector(view['target'])
        bpy.ops.object.camera_add(location=target+Vector(view['offset']))
        camera = bpy.context.object
        camera.data.type, camera.data.ortho_scale = 'ORTHO', view['orthoScale']
        aim(camera, target)
        scene.camera = camera
        bpy.context.view_layer.update()
        scene.render.filepath = str(args.out/(view['name']+'.png'))
        bpy.ops.render.render(write_still=True)
        records.append({**view, 'matrixWorld': [list(row) for row in camera.matrix_world],
                        'image': view['name']+'.png', 'sha256': sha(scene.render.filepath)})
    report = {'scope': 'Local joint-construction comparison, not full-body registration',
              'sceneSha256': sha(bpy.data.filepath), 'specSha256': sha(args.spec),
              'rendererSha256': sha(__file__), 'resolution': spec['resolution'],
              'views': records, 'approval': None}
    (args.out/'details.json').write_text(json.dumps(report,indent=2)+'\n')


if __name__ == '__main__':
    main()
