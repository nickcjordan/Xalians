import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from build_handoff import verify,VIEWS


class BundleIntegrityTests(unittest.TestCase):
    def fixture(self,directory):
        payload=directory/'asset';payload.write_bytes(b'test artifact')
        item={'name':'','image':'asset','mask':'asset','occupancy':'asset','depth':'asset','normals':'asset','objectIds':'asset'}
        manifest={'views':[{**item,'name':name} for name in VIEWS],
                  'files':{'asset':hashlib.sha256(payload.read_bytes()).hexdigest()},
                  'approval':None,'productionReady':False}
        (directory/'manifest.json').write_text(json.dumps(manifest))
        return manifest

    def test_changed_or_missing_artifact_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory=Path(tmp);self.fixture(directory)
            self.assertEqual(verify(directory)['status'],'technical-pass')
            (directory/'asset').write_bytes(b'changed')
            with self.assertRaisesRegex(ValueError,'changed'):verify(directory)
            (directory/'asset').unlink()
            with self.assertRaisesRegex(ValueError,'Missing'):verify(directory)

    def test_duplicate_view_and_approval_claim_fail(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory=Path(tmp);manifest=self.fixture(directory)
            manifest['views'][1]['name']='front'
            (directory/'manifest.json').write_text(json.dumps(manifest))
            with self.assertRaisesRegex(ValueError,'unique'):verify(directory)
            manifest=self.fixture(directory);manifest['approval']={'reviewer':'Nick'}
            (directory/'manifest.json').write_text(json.dumps(manifest))
            with self.assertRaisesRegex(ValueError,'cannot approve'):verify(directory)


if __name__=='__main__':unittest.main()
