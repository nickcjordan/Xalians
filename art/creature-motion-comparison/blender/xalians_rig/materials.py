"""Colors and Principled materials from hex strings."""

import bpy


def color(hex_value):
    value = hex_value.lstrip("#")
    channels = [int(value[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    linear = [channel / 12.92 if channel <= .04045 else ((channel + .055) / 1.055) ** 2.4
              for channel in channels]
    return tuple(linear) + (1,)


def material(name, hex_value, roughness=0.72, subsurface=0.0, emission=0.0, subsurface_radius=None):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color(hex_value)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color(hex_value)
    shader.inputs["Roughness"].default_value = roughness
    if subsurface and "Subsurface Weight" in shader.inputs:
        shader.inputs["Subsurface Weight"].default_value = subsurface
        if subsurface_radius is not None:
            shader.inputs["Subsurface Radius"].default_value = subsurface_radius
    if emission:
        shader.inputs["Emission Color"].default_value = color(hex_value)
        shader.inputs["Emission Strength"].default_value = emission
    return mat


class Palette:
    """Builds the materials named in a spec's ``palette`` block.

    Each entry is ``"name": "hex"`` or ``"name": {"hex": ..., "roughness": ...,
    "subsurface": ..., "emission": ..., "subsurface_radius": [r, g, b]}``.
    Materials are created in the order the spec lists them.
    """

    def __init__(self, entries):
        self._materials = {}
        for name, entry in entries.items():
            if isinstance(entry, str):
                entry = {"hex": entry}
            radius = entry.get("subsurface_radius")
            self._materials[name] = material(
                entry.get("label", name), entry["hex"], entry.get("roughness", 0.72),
                entry.get("subsurface", 0.0), entry.get("emission", 0.0),
                tuple(radius) if radius else None)

    def __getitem__(self, name):
        return self._materials[name]

    def __contains__(self, name):
        return name in self._materials
