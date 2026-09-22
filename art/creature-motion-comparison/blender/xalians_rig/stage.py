"""The fixed stage: render settings, camera, lights, markers, projection, meta, and frame output.

Everything here is shared across species so that every atlas is comparable
and every render is reproducible from its spec.
"""

import hashlib
import json
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

from .materials import color

FPS = 24
RESOLUTION = 384
CAMERA_LOCATION = (0, -6.7, 1.2)
CAMERA_TARGET = (0, 0, .30)
ORTHO_SCALE = 3.85
LIGHTS = (("key", (-3, -4, 5), 460, 4), ("fill", (3, -2, 2), 180, 3), ("rim", (1, 2, 4), 330, 3))


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"


def configure(spec):
    render = spec.get("render", {})
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = render.get("samples", 16)
    scene.cycles.use_denoising = True
    scene.cycles.seed = render.get("seed", 0)
    scene.cycles.use_animated_seed = False
    scene.render.resolution_x = RESOLUTION
    scene.render.resolution_y = RESOLUTION
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    # No stamp metadata in the PNGs (date, render time, file path), so two
    # renders of the same spec are byte-identical, not just pixel-identical.
    for field in ("use_stamp_date", "use_stamp_time", "use_stamp_render_time", "use_stamp_frame",
                  "use_stamp_frame_range", "use_stamp_memory", "use_stamp_hostname", "use_stamp_camera",
                  "use_stamp_lens", "use_stamp_scene", "use_stamp_marker", "use_stamp_filename",
                  "use_stamp_sequencer_strip", "use_stamp_note"):
        if hasattr(scene.render, field):
            setattr(scene.render, field, False)
    scene.render.fps = FPS
    clips = spec["clips"]
    scene.frame_start = min(start for start, _ in clips.values())
    scene.frame_end = max(start + count - 1 for start, count in clips.values())
    scene.world.color = color(render.get("world", "728880"))[:3]
    scene.view_settings.view_transform = "Standard"

    bpy.ops.object.camera_add(location=CAMERA_LOCATION)
    camera = bpy.context.object
    camera.name = "fixed stage camera | 3 quarter"
    camera.rotation_euler = (Vector(CAMERA_TARGET) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = ORTHO_SCALE
    scene.camera = camera

    light_energy = render.get("lights", {})
    for name, location, energy, size in LIGHTS:
        data = bpy.data.lights.new(name, "AREA")
        data.energy = light_energy.get(name, energy)
        data.shape = "DISK"
        data.size = size
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        obj.location = location
        obj.rotation_euler = (Vector((0, 0, .25)) - obj.location).to_track_quat("-Z", "Y").to_euler()

    for marker in spec.get("markers", []):
        scene.timeline_markers.new(marker["name"], frame=marker["frame"])
    return scene, camera


def project(scene, camera, point):
    view = world_to_camera_view(scene, camera, point)
    return [round(view.x * scene.render.resolution_x), round((1 - view.y) * scene.render.resolution_y)]


def file_hash(paths):
    digest = hashlib.sha256()
    for path in sorted(paths):
        digest.update(Path(path).name.encode())
        digest.update(Path(path).read_bytes())
    return digest.hexdigest()[:16]


def write_meta(scene, camera, spec, spec_path, points, output, source_files):
    """Project the named points and record provenance for the packer.

    ``points`` maps a name to ``(frame, callable returning a world Vector)``.
    """
    output.mkdir(parents=True, exist_ok=True)
    projected = {}
    for name, (frame, getter) in points.items():
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        projected[name] = project(scene, camera, getter())
    scene.frame_set(scene.frame_start)
    action_start = spec["clips"]["action"][0]
    markers = {m["name"]: {"frame": m["frame"], "time_ms": round((m["frame"] - action_start) * 1000 / FPS)}
               for m in spec.get("markers", []) if m.get("cue")}
    meta = {
        "species": spec["species"],
        "template": spec["template"],
        "variant": spec.get("variant", "blender"),
        "export": spec["export"],
        "label": spec.get("label", spec["species"]),
        "emitter": projected.pop("emitter"),
        "points": projected,
        "markers": markers,
        "clips": spec["clips"],
        "provenance": {
            "blender": bpy.app.version_string,
            "spec": Path(spec_path).name,
            "spec_hash": file_hash([spec_path]),
            "library_hash": file_hash(source_files),
            "cycles_seed": scene.cycles.seed,
            "samples": scene.cycles.samples,
            "style": spec.get("render", {}).get("style", "plain"),
        },
        "objects": len(bpy.data.objects),
    }
    (output / "meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    print("Wrote", output / "meta.json")
    return meta


def render_frames(scene, output, spec, subset=None):
    if subset:
        folder = output / "inspect"
        folder.mkdir(parents=True, exist_ok=True)
        for frame in subset:
            scene.frame_set(frame)
            scene.render.filepath = str(folder / f"f{frame:02d}.png")
            bpy.ops.render.render(write_still=True)
            print("Rendered inspection frame", frame)
        return
    for clip, (start, count) in spec["clips"].items():
        folder = output / clip
        folder.mkdir(parents=True, exist_ok=True)
        for i in range(count):
            scene.frame_set(start + i)
            scene.render.filepath = str(folder / f"{i:03d}.png")
            bpy.ops.render.render(write_still=True)
            print(f"Rendered {spec['species']} {clip} {i + 1}/{count}")
