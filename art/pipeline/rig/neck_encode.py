"""B-6kf7: encode PNG frame folders to H.264 MP4 with Blender's own FFmpeg (no installs).
Usage: blender -b --factory-startup --python neck_encode.py -- FRAMES_DIR OUT_MP4 [FPS]"""
import bpy, sys, struct
from pathlib import Path
a = sys.argv[sys.argv.index('--') + 1:]; d = Path(a[0]); dst = a[1]; fps = int(a[2]) if len(a) > 2 else 30
files = sorted(d.glob('*.png'))
sc = bpy.context.scene; sc.sequence_editor_create(); se = sc.sequence_editor
coll = se.strips if hasattr(se, 'strips') else se.sequences
st = coll.new_image(name='f', filepath=str(files[0]), channel=1, frame_start=1)
for fl in files[1:]: st.elements.append(fl.name)
with open(files[0], 'rb') as fh: hdr = fh.read(24)
w, h = struct.unpack('>II', hdr[16:24])
sc.render.resolution_x = w; sc.render.resolution_y = h; sc.render.resolution_percentage = 100
sc.frame_start = 1; sc.frame_end = len(files); sc.render.fps = fps
if hasattr(sc.render.image_settings, 'media_type'): sc.render.image_settings.media_type = 'VIDEO'
sc.render.image_settings.file_format = 'FFMPEG'; sc.render.ffmpeg.format = 'MPEG4'; sc.render.ffmpeg.codec = 'H264'
sc.render.ffmpeg.constant_rate_factor = 'HIGH'; sc.render.ffmpeg.ffmpeg_preset = 'GOOD'; sc.render.ffmpeg.gopsize = 15
sc.view_settings.view_transform = 'Standard'; sc.render.filepath = dst; sc.render.use_file_extension = False
bpy.ops.render.render(animation=True)
print('ENCODED', dst, flush=True)
