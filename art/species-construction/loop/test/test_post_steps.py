"""Post-assembly recipe steps (kind "post"): chain order, keys, the plan, `add`, and run_post's copy and record. No Blender."""
import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

LOOP = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(LOOP))
import recipe as rc  # noqa: E402

LIVE = rc.ROOT/'docs/design/species-construction/akinza/recipe.json'
SCRIPT = 'art/species-construction/study_provenance.py'


def post(sid, asm, extra=None):
    return {'id': sid, 'kind': 'post', 'component': 'assembly', 'regions': ['R02'], 'runner': 'python', 'script': SCRIPT,
            'inputs': {'asm': asm, **(extra or {})}, 'args': ['{asm}', '{out}', '--tag', sid]}


class PostSteps(unittest.TestCase):
    def recipe_with(self, *steps):
        data = json.loads(LIVE.read_text(encoding='utf-8'))
        for s in steps:
            rc.add_step(data, s['inputs']['asm'], copy.deepcopy(s))
        tmp = Path(tempfile.mkdtemp())/'r.json'
        tmp.write_text(json.dumps(data), encoding='utf-8')
        return rc.load(tmp)

    def test_chain_order_keys_and_plan(self):
        base = rc.load(LIVE)
        r = self.recipe_with(post('A1', 'assembly'))
        self.assertEqual([s['id'] for s in r.post], ['A1'])
        self.assertNotIn('A1', [s['id'] for s in r.order])
        keys, base_keys = rc.compute_keys(r), rc.compute_keys(base)
        self.assertEqual(keys['assembly'], base_keys['assembly'], 'a post step does not change the assembly key')
        self.assertEqual(keys['final'], keys['A1'])
        plan, _ = rc.make_plan(r, rc.Cache(r))
        base_plan, _ = rc.make_plan(base, rc.Cache(base))
        self.assertEqual(plan['assembly']['dir'], base_plan['assembly']['dir'])
        self.assertIsNone(plan['A1']['dir'])

    def test_add_after_assembly_goes_first_in_the_chain(self):
        r = self.recipe_with(post('A1', 'assembly'), post('A0', 'assembly'))
        self.assertEqual([s['id'] for s in r.post], ['A0', 'A1'])
        self.assertEqual(r.byid['A1']['inputs']['asm'], 'A0')

    def test_a_broken_chain_fails(self):
        data = json.loads(LIVE.read_text(encoding='utf-8'))
        data['steps'] += [post('A1', 'assembly'), post('A2', 'assembly')]
        tmp = Path(tempfile.mkdtemp())/'r.json'
        tmp.write_text(json.dumps(data), encoding='utf-8')
        with self.assertRaises(SystemExit):
            rc.load(tmp)

    def test_run_post_copies_the_assembly_records_the_step_and_renders(self):
        with tempfile.TemporaryDirectory() as tmp:
            work = Path(tmp)
            src = work/'assembled-0001'
            src.mkdir()
            (src/'akinza.glb').write_bytes(b'glb')
            (src/'assembly.json').write_text(json.dumps({'objects': {}}), encoding='utf-8')
            (src/'stage-start.json').write_text('{}', encoding='utf-8')
            (src/'render').mkdir()
            recipe = mock.Mock(work=work, species='akinza')
            calls = []
            with mock.patch.object(rc, 'run_step', side_effect=lambda *a: calls.append(a)), \
                 mock.patch.object(rc, '_run', side_effect=lambda *a, **k: ((work/'assembled-0002'/'render').mkdir(), mock.Mock(returncode=0))[1]):
                rc.run_post(recipe, post('A1', 'assembly'), {'asm': src}, 'assembled-0002')
            out = work/'assembled-0002'
            self.assertTrue((out/'akinza.glb').is_file())
            self.assertFalse((out/'stage-start.json').exists())
            record = json.loads((out/'assembly.json').read_text(encoding='utf-8'))
            self.assertEqual(record['post'], [{'step': 'A1', 'script': SCRIPT, 'input': 'assembled-0001'}])
            self.assertEqual(len(calls), 1)


if __name__ == '__main__':
    unittest.main()
