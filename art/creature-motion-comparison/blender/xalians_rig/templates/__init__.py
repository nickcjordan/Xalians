"""Body-plan templates. Each builds parts from a spec and exposes ``apply_pose``.

A template is a class with:

- ``__init__(spec, palette)`` building the parts under a stage root;
- ``track(clip)`` returning the eased Track or Loop for a clip name;
- ``apply_pose(frame, clip)`` setting and keying every part for one frame;
- ``parts`` mapping names to objects or callables returning a world Vector,
  so a spec can name its emitter and other projected points.

Templates are imported on demand so an unfinished template cannot break the
others.
"""

import importlib

_MODULES = {"avian": ("avian", "Avian"), "amorphous": ("amorphous", "Amorphous"), "biped": ("biped", "Biped")}


class _Registry:
    def __getitem__(self, name):
        module_name, class_name = _MODULES[name]
        module = importlib.import_module(__name__ + "." + module_name)
        return getattr(module, class_name)

    def __contains__(self, name):
        return name in _MODULES


TEMPLATES = _Registry()
