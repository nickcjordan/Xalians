"""A helper edit must not rewrite an experiment's recorded implementation."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('study_provenance', ROOT/'study_provenance.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class StudyProvenanceTests(unittest.TestCase):
    def test_saved_sources_and_input_are_bound_before_mutation(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, output = root/'scripts', root/'result'
            source.mkdir()
            output.mkdir()
            names = ['entry.py', 'study_provenance.py', 'blender_blockout.py',
                     'blender_probe.py', 'authored_surfaces.py', 'surface_math.py']
            for name in names:
                (source/name).write_text('original '+name)
            mesh = root/'input.glb'
            mesh.write_bytes(b'original mesh')
            recorded = module.snapshot(output, source/'entry.py', [mesh])
            manifest = json.loads((output/'stage-start.json').read_text())
            (source/'surface_math.py').write_text('changed helper')
            mesh.write_bytes(b'changed input')
            self.assertEqual(recorded, module.digest(output/'stage-start.json'))
            self.assertEqual((output/'source-snapshot/surface_math.py').read_text(),
                             'original surface_math.py')
            self.assertNotEqual(manifest['sources']['surface_math.py'],
                                module.digest(source/'surface_math.py'))
            self.assertEqual(manifest['inputs'][str(mesh.resolve())],
                             hashlib.sha256(b'original mesh').hexdigest())
            with self.assertRaises(FileExistsError):
                module.snapshot(output, source/'entry.py', [mesh])


if __name__ == '__main__':
    unittest.main()
