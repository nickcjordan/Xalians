"""Species config loader for the construction loop tools.

The config lives at docs/design/species-construction/<species>/loop/species.json
and holds every species-specific constant (paths, placement, views, fit bands,
region images, component pools, region zones, the side-effect threshold).

    import species
    s = species.load('akinza')
    s.work, s.docs, s.evidence      # Paths
    s['fitBands']                   # raw config keys
    s.zone_box('R07')               # zone as world-frame limits
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


def config_path(key):
    return ROOT/'docs/design/species-construction'/key/'loop/species.json'


class Species(dict):
    """The raw config as a dict, plus resolved paths."""

    def __init__(self, key):
        path = config_path(key)
        if not path.is_file():
            raise SystemExit(f'No species config at {path}')
        super().__init__(json.loads(path.read_text(encoding='utf-8')))
        self.key, self.path = key, path
        p = self['paths']
        self.work, self.docs = ROOT/p['work'], ROOT/p['docs']
        self.cameras, self.evidence = ROOT/p['cameras'], ROOT/p['evidence']
        self.rubric, self.rig_dir = ROOT/p['rubric'], ROOT/p['rigDir']
        self.sheet_pose, self.rig_script = ROOT/p['sheetPose'], ROOT/p['rigScript']
        self.sheet = ROOT/self['sheet']
        self.floor_z, self.fixed_height = self['frame']['floorZ'], self['frame']['fixedHeight']

    def zone(self, region):
        """The region's zone dict, or None for a region without one (the whole figure)."""
        z = self['zones'].get(region)
        return z if isinstance(z, dict) else None

    def at_to_z(self, at):
        return self.floor_z+self.fixed_height*(1-at)

    def zone_box(self, region):
        """World-frame limits: {'z': (lo, hi), 'x': (lo, hi), 'symmetricX': bool, 'y': (lo, hi)}, or None."""
        z = self.zone(region)
        if z is None:
            return None
        h = self.fixed_height
        return {'z': (self.at_to_z(z['at'][1]), self.at_to_z(z['at'][0])),
                'x': tuple(v*h for v in z['x']), 'symmetricX': z['symmetricX'],
                'y': tuple(v*h for v in z['y'])}

    def pool(self, name):
        return list(self['components'][name])


def load(key='akinza'):
    return Species(key)


def set_threshold(key, value):
    """Write sideEffectThreshold into the config, keeping the file's layout (one line replaced)."""
    path = config_path(key)
    lines = path.read_text(encoding='utf-8').splitlines()
    for i, line in enumerate(lines):
        if line.strip().startswith('"sideEffectThreshold":'):
            lines[i] = f'  "sideEffectThreshold": {value},'
            break
    else:
        raise SystemExit('sideEffectThreshold not found in the species config')
    path.write_text('\n'.join(lines)+'\n', encoding='utf-8')
