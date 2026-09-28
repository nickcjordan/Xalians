"""Historical renders cannot certify a changed mesh or a false resolution record."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import review_shape_study as review


class ShapeReviewTests(unittest.TestCase):
    def fixture(self, root):
        mesh = root/'mesh.glb'
        mesh.write_bytes(b'mesh at rendering time')
        Image.new('RGBA', (24,24)).save(root/'front.png')
        record = {'source': str(mesh), 'sourceSha256': review.sha(mesh),
                  'outputs': {'front.png': review.sha(root/'front.png')},
                  'cameras': [{'name':'front','resolution':[32,32]}]}
        (root/'geometry.json').write_text(json.dumps(record))
        return mesh

    def execute(self, root):
        with patch.object(sys, 'argv', ['review', str(root), '--label', 'test']), \
                patch.object(review, 'check_cameras'):
            review.main()

    def test_changed_mesh_rejected_even_with_unchanged_render(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            self.fixture(root).write_bytes(b'changed geometry')
            with self.assertRaisesRegex(ValueError, 'Source mesh changed'):
                self.execute(root)

    def test_false_dimensions_rejected_even_with_matching_image_hash(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            self.fixture(root)
            with self.assertRaisesRegex(ValueError, 'image dimensions disagree'):
                self.execute(root)


if __name__ == '__main__':
    unittest.main()
