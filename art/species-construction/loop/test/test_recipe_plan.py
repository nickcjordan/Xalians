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


def var(i, rank, progress=0.0, source='variant', edits=True):
    return {'id': f'v{i:02d}', 'rank': rank, 'source': source, 'edits': [{'op': 'set'}] if edits else [], 'parts': {'progress': progress}}


class ChooseTests(unittest.TestCase):
    def test_marked_control_with_one_edit_keeps_its_slot(self):
        ranked = [var(2, 1, 0), var(3, 2, 0), var(4, 3, 0), {**var(1, 6, 0), 'control': True}]
        self.assertIn('v01', [v['id'] for v in rp.choose_candidates(ranked, 3, True)])

    def test_control_keeps_a_slot_and_one_per_sweep(self):
        ranked = [var(11, 1, 1, 'sweep 1'), var(10, 2, 1, 'sweep 1'), var(3, 3, 1), var(1, 6, 0, edits=False), var(2, 4, .5)]
        picks = rp.choose_candidates(ranked, 3, True)
        self.assertEqual([v['id'] for v in picks], ['v11', 'v03', 'v01'])

    def test_blind_ranking_takes_the_planners_order(self):
        ranked = [var(11, 1, 0, 'sweep 1'), var(10, 2, 0, 'sweep 1'), var(4, 3), var(2, 4), var(3, 5)]
        picks = rp.choose_candidates(ranked, 3, False)
        self.assertEqual(sorted(v['id'] for v in picks), ['v02', 'v03', 'v04'])

    def test_no_start_no_control_slot(self):
        ranked = [var(2, 1, 1), var(1, 2, 0, edits=False), var(3, 3, 1)]
        self.assertEqual([v['id'] for v in rp.choose_candidates(ranked, 2, False)], ['v02', 'v01'])


class ValueTests(unittest.TestCase):
    def test_a_list_for_a_flag_is_its_several_values(self):
        # round 31: --tip-min [0.0035, 0.0035] reached the script as the token '[0.0035,'
        self.assertEqual(rp.as_value([0.0035, 0.0035], '--tip-min'), '0.0035 0.0035')
        self.assertEqual(rp.as_value([1, 2], 'spec:rows'), '[1, 2]')
        self.assertEqual(rp.as_value(0.3, '--tip-floor'), '0.3')


if __name__ == '__main__':
    unittest.main()


class BlindCapTests(unittest.TestCase):
    def setUp(self):
        import loop_tools
        self.lt = loop_tools
        self.variants = [{'id': f'v{k:02d}', 'name': f'idea {k}', 'source': 'sweep a' if k in (4, 5) else 'variant', 'edits': [{'x': k}]} for k in range(1, 9)]

    def test_a_region_with_no_quick_criterion_builds_only_the_picks(self):
        notes = []
        kept = rp.cap_blind(self.lt, {'region': 'R02'}, self.variants, 3, notes)
        # audit 2026-10-07: a blind plan sends two candidates, not top
        self.assertEqual([v['id'] for v in kept], ['v01', 'v02'])
        self.assertIn('not built: v03', notes[0])

    def test_the_control_keeps_its_slot_and_a_sweep_counts_once(self):
        vs = [dict(v) for v in self.variants]
        vs[6]['control'] = True  # v07
        kept = rp.cap_blind(self.lt, {'region': 'R02', 'start': 'x.json'}, vs, 5, [])
        self.assertEqual([v['id'] for v in kept], ['v01', 'v07'])
        probes = rp.probe_set({'region': 'R06', 'start': 'x.json'}, vs, 5)
        self.assertEqual([v['id'] for v in probes], ['v07', 'v01', 'v02', 'v03', 'v04'])

    def test_a_region_with_quick_criteria_is_untouched(self):
        self.assertEqual(len(rp.cap_blind(self.lt, {'region': 'R06'}, self.variants, 3, [])), 8)
