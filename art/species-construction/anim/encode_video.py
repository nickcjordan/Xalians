"""Encode PNG frame folders into looping videos with Blender's bundled ffmpeg (no ffmpeg on this machine).

  run_blender.py encode_video.py <log> -- <frames dir> <out dir> <name> [--fps 24]

Every subfolder of <frames dir> with NNNN.png frames (one per view) becomes <out>/<name>-<view>.mp4
(H.264) and <out>/<name>-<view>.webm (VP9), at the frames' own size (720 px wide at most).
"""
import argparse
import sys
from pathlib import Path

import bpy

p = argparse.ArgumentParser()
p.add_argument('frames', type=Path)
p.add_argument('out', type=Path)
p.add_argument('name')
p.add_argument('--fps', type=int, default=24)
a = p.parse_args(sys.argv[sys.argv.index('--')+1:])
a.out.mkdir(parents=True, exist_ok=True)
for view in sorted(d for d in a.frames.iterdir() if d.is_dir()):
    files = sorted(view.glob('[0-9][0-9][0-9][0-9].png'))
    if not files:
        continue
    img = bpy.data.images.load(str(files[0]))
    w, h = img.size
    sc = bpy.data.scenes.new(f'encode {view.name}')
    sc.sequence_editor_create()
    strip = sc.sequence_editor.strips.new_image('frames', str(files[0]), 1, 1) if hasattr(sc.sequence_editor, 'strips') \
        else sc.sequence_editor.sequences.new_image('frames', str(files[0]), 1, 1)
    for f in files[1:]:
        strip.elements.append(f.name)
    sc.frame_start, sc.frame_end = 1, len(files)
    sc.render.fps = a.fps
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = w, h, 100
    sc.render.use_sequencer = True
    if hasattr(sc.render.image_settings, 'media_type'):     # Blender 5: video output is its own media type
        sc.render.image_settings.media_type = 'VIDEO'
    sc.render.image_settings.file_format = 'FFMPEG'
    for container, codec, ext in (('MPEG4', 'H264', 'mp4'), ('WEBM', 'WEBM', 'webm')):
        ff = sc.render.ffmpeg
        ff.format = container
        ff.codec = codec
        ff.constant_rate_factor = 'HIGH'
        ff.ffmpeg_preset = 'GOOD'
        ff.gopsize = 12
        ff.audio_codec = 'NONE'
        if codec == 'H264':
            try:
                ff.use_max_b_frames = False
            except AttributeError:
                pass
        stem = f'{a.name}-{view.name}'
        target = a.out/f'{stem}.{ext}'
        target.unlink(missing_ok=True)
        sc.render.filepath = str(a.out/f'{stem}_tmp_')     # Blender appends the frame range and extension
        bpy.ops.render.render(animation=True, scene=sc.name)
        made = sorted(a.out.glob(f'{stem}_tmp_*.{ext}'))
        made[-1].rename(target)
        print('wrote', target, len(files), 'frames', flush=True)
print('ENCODE_DONE')
