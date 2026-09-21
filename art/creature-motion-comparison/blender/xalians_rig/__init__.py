"""Shared, species-agnostic rig library for the Xalians Blender motion studies.

A species is described by a small JSON spec (palette, proportions, anatomy
switches, and a performance key track). A body-plan template turns the spec
into parts and a pose function. This package holds everything that is not
species knowledge: part builders, materials, the eased key track with lag,
the two-link leg solver, the fixed stage (camera, lights, render settings),
projection of emitter points, and the meta file the packer reads.

Run through ``build_species.py`` beside this package.
"""
