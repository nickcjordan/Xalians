"""Clay or weight-colour renders of posed skins for review sheets (Blender half of pose_shots.py).

  run_blender.py render_shots.py <log> -- <surface dir> <npy dir> <spec json>

Spec: {samples, shots: [{name, pos (npy file in the npy dir, or rest), color (clay or an npy colour file),
alpha (0..1 transparency), az, el, center [3], scale (ortho width, source units), size}]}. Writes
<npy dir>/shots/<name>.png. The skin is the surface blend's; every other object is removed.
"""
import sys
import sys, json, math
from pathlib import Path
import bpy, numpy as np
from mathutils import Vector
sys.path.insert(0, str(Path(__file__).resolve().parents[2]/'pipeline/roster'))
import lookdev
args = sys.argv[sys.argv.index('--')+1:]
surf, D, spec = Path(args[0]), Path(args[1]), json.loads(Path(args[2]).read_text())
bpy.ops.wm.open_mainfile(filepath=str(surf/'surface.blend'))
sc = bpy.context.scene
skin = bpy.data.objects['akinza_continuous_construction']
for o in list(bpy.data.objects):
    if o is not skin:
        bpy.data.objects.remove(o, do_unlink=True)
lookdev.setup_scene('CYCLES')
sc.cycles.samples = spec.get('samples', 24)
for o in bpy.data.objects:
    if o.name == 'lookdev_ground':
        o.hide_render = True
skin.matrix_world = np.eye(4).tolist() if False else skin.matrix_world
mw = np.array(skin.matrix_world); mi = np.linalg.inv(mw)
rest = np.empty(len(skin.data.vertices)*3, np.float32); skin.data.vertices.foreach_get('co', rest); rest = rest.reshape(-1, 3)
attr = skin.data.color_attributes.new('diag', 'FLOAT_COLOR', 'POINT')
mat = bpy.data.materials.new('diag'); mat.use_nodes = True
nt = mat.node_tree; nt.nodes.clear()
out = nt.nodes.new('ShaderNodeOutputMaterial'); mix = nt.nodes.new('ShaderNodeMixShader')
pr = nt.nodes.new('ShaderNodeBsdfPrincipled'); tr = nt.nodes.new('ShaderNodeBsdfTransparent')
at = nt.nodes.new('ShaderNodeVertexColor'); at.layer_name = 'diag'
pr.inputs['Roughness'].default_value = .6
nt.links.new(at.outputs['Color'], pr.inputs['Base Color'])
nt.links.new(pr.outputs[0], mix.inputs[1]); nt.links.new(tr.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], out.inputs[0])
skin.data.materials.clear(); skin.data.materials.append(mat)
for p in skin.data.polygons: p.material_index = 0
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.clip_end = 100
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGB'
sc.render.resolution_percentage = 100
(D/'shots').mkdir(exist_ok=True)
cache = {}
def load(nm):
    if nm not in cache: cache[nm] = np.load(D/nm)
    return cache[nm]
for sh in spec['shots']:
    X = rest.astype(np.float64)@mw[:3, :3].T+mw[:3, 3] if sh['pos'] == 'rest' else load(sh['pos']).astype(np.float64)
    skin.data.vertices.foreach_set('co', (X@mi[:3, :3].T+mi[:3, 3]).astype(np.float32).ravel())
    col = np.full((len(X), 4), 1., np.float32)
    col[:, :3] = .72 if sh['color'] == 'clay' else load(sh['color'])
    attr.data.foreach_set('color', col.ravel())
    skin.data.update()
    mix.inputs['Fac'].default_value = sh.get('alpha', 0.)
    az, el = math.radians(sh['az']), math.radians(sh['el'])
    d = Vector((math.sin(az)*math.cos(el), -math.cos(az)*math.cos(el), math.sin(el)))
    c = Vector(sh['center'])
    cam.location = c+d*10
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    cam.data.ortho_scale = sh['scale']
    sc.render.resolution_x = sc.render.resolution_y = sh.get('size', 800)
    sc.render.filepath = str(D/'shots'/(sh['name']+'.png'))
    bpy.ops.render.render(write_still=True)
    print('shot', sh['name'], flush=True)
print('SHOTS_DONE')
