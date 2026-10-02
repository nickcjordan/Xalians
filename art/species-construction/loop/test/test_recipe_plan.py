"""recipe_plan: plan validation and sweep expansion (no Blender)."""
import json
import sys
import tempfile
import unittest
from pathlib import Path

LOOP = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(LOOP))
import recipe as rc  # noqa: E402
import recipe_plan as rp  # noqa: E402


def write(doc):
    path = Path(tempfile.mkdtemp())/'plan.json'
    path.write_text(json.dumps(doc), encoding='utf-8')
    return path


BASE = {'base': 'x.json', 'baselinePacket': 'p', 'region': 'R07'}


class PlanTests(unittest.TestCase):
    def test_sweep_product_expands(self):
        plan = rp.load_plan(rc, write({**BASE, 'variants': [{'name': 'a', 'edits': []}],
                                       'sweeps': [{'step': 'B-23', 'grid': {'spec:a': [1, 2], 'spec:b': [3, 4, 5]}}]}))
        self.assertEqual(len(plan['_variants']), 1+6)
        self.assertEqual(plan['_variants'][1]['edits'][0], {'op': 'set', 'step': 'B-23', 'arg': 'spec:a', 'value': 1})

    def test_cap_is_24_builds(self):
        with self.assertRaises(SystemExit):
            rp.load_plan(rc, write({**BASE, 'sweeps': [{'step': 'B-23', 'grid': {'spec:a': list(range(5)), 'spec:b': list(range(5))}}]}))

    def test_sixteen_variant_limit_and_region_required(self):
        with self.assertRaises(SystemExit):
            rp.load_plan(rc, write({**BASE, 'variants': [{'name': str(i), 'edits': []} for i in range(17)]}))
        with self.assertRaises(SystemExit):
            rp.load_plan(rc, write({'base': 'x', 'baselinePacket': 'p', 'variants': [{'edits': []}]}))

    def test_bad_edit_rejected(self):
        with self.assertRaises(SystemExit):
            rp.load_plan(rc, write({**BASE, 'variants': [{'edits': [{'op': 'set', 'step': 'B-23'}]}]}))

    def test_as_value(self):
        self.assertEqual(rp.as_value([1, 2]), '[1, 2]')
        self.assertEqual(rp.as_value(True), 'true')
        self.assertEqual(rp.as_value(0.5), '0.5')


if __name__ == '__main__':
    unittest.main()
