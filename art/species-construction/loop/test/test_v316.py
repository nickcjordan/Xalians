"""v3.16 (2026-10-12): advisory criteria, the rebase's cold baseline flag, approved looks and containment as a report."""
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

LOOP = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(LOOP))
import loop_state as ls  # noqa: E402
import reader_pack as rp  # noqa: E402
import recipe_candidate as rcand  # noqa: E402
import recipe_sweep as sw  # noqa: E402

REPO = LOOP.parents[2]
DOCS = REPO/'docs/design/species-construction/akinza'
STATUS = DOCS/'loop/status.json'


class AdvisoryTests(unittest.TestCase):
    def test_rubric_as_of_drops_later_flags_only(self):
        rub = {'regions': {'R01': [{'id': 'R01.1', 'kind': 'measured', 'advisory': True, 'advisorySince': '2026-10-12', 'advisoryWhy': 'x'},
                                   {'id': 'R01.2', 'kind': 'measured'}]}}
        old = ls.rubric_as_of(rub, '2026-10-01')
        self.assertNotIn('advisory', old['regions']['R01'][0])
        self.assertTrue(ls.rubric_as_of(rub, '2026-10-12')['regions']['R01'][0]['advisory'])
        self.assertIs(ls.rubric_as_of(rub, None), rub)
        self.assertTrue(rub['regions']['R01'][0]['advisory'], 'the input is not changed')

    def test_live_rubric_marks_sheet_criteria_advisory(self):
        rub = json.loads((DOCS/'loop/rubric.json').read_text(encoding='utf-8'))
        by = {c['id']: c for cs in rub['regions'].values() for c in cs}
        for cid in ('R01.1', 'R01.2', 'R03.1', 'R03.2', 'R04.1', 'R04.6', 'R08.10', 'R08.11', 'R09.9'):
            self.assertTrue(by[cid].get('advisory'), cid)
            self.assertIn('Nick 2026-10-12', by[cid]['advisoryWhy'])
        self.assertFalse(by['R06.16'].get('advisory'), 'the belly line is measured against the model, not the sheet')
        self.assertNotIn('R12.1', by)
        self.assertNotIn('R12.2', by)
        self.assertIn('R12.6', by)

    def test_hint_counts_gating_criteria_only(self):
        rows = [{'id': 'R03.1', 'region': 'R03', 'result': ['fail', 'pass'], 'advisory': True},
                {'id': 'R03.9', 'region': 'R03', 'result': ['fail', 'pass']}]
        line = rcand.hint('R03', rows, {}, [], {})
        self.assertIn('R03 measured: 1 changed (1 newly passing, 0 newly failing), 1 advisory moved', line)
        self.assertIn('nothing moved outside the part', line)


class ContainmentReportTests(unittest.TestCase):
    def test_sweep_total_does_not_charge_containment(self):
        total, parts = sw.total_score({'fitIou': .9, 'stationDiff': .01}, {'fitIou': .9, 'stationDiff': .01}, .05)
        self.assertEqual(total, 0)
        self.assertEqual(parts.get('contain'), 0)


class RebaseTests(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())
        self.status = self.dir/'status.json'
        shutil.copyfile(STATUS, self.status)

    def test_live_status_is_rebased(self):
        S = json.loads(STATUS.read_text(encoding='utf-8'))
        self.assertEqual(S['baseline']['assembly'], 'assembled-3300')
        self.assertEqual(S['baseline']['recipe'], 'docs/design/species-construction/akinza/recipe-integrated-v3.json')
        self.assertEqual(S['needsColdBaseline'], 'assembled-3300')
        self.assertNotIn('R01', S.get('awaiting') or {})
        self.assertTrue(all(d.get('answer') for d in S['decisions'] if d.get('region') == 'R01'))
        self.assertEqual(sorted(r for r, v in S['regions'].items() if v.get('approved')), ['R01', 'R02', 'R03', 'R04'])

    def test_args_ask_for_a_cold_baseline(self):
        args = ls.build_args('akinza', status_path=self.status)
        self.assertTrue(args.get('coldBaseline'))
        self.assertTrue(args['status']['regions']['R02'].get('approved'))
        flags = {c['id']: c for cs in args['rubric']['regions'].values() for c in cs}
        self.assertTrue(flags['R01.1'].get('advisory'))
        S = json.loads(self.status.read_text(encoding='utf-8'))
        del S['needsColdBaseline']
        self.status.write_text(json.dumps(S), encoding='utf-8')
        self.assertNotIn('coldBaseline', ls.build_args('akinza', status_path=self.status))

    def test_merge_spends_the_flag_only_for_the_scored_assembly(self):
        d = ls.species_dirs('akinza')
        full = json.loads(self.status.read_text(encoding='utf-8'))
        other = ls.merge_status(json.loads(json.dumps(full)), {'coldScoredAssembly': 'assembled-1'}, d, 'akinza')
        self.assertEqual(other['needsColdBaseline'], 'assembled-3300')
        self.assertNotIn('coldScoredAssembly', other)
        done = ls.merge_status(json.loads(json.dumps(full)), {'coldScoredAssembly': 'assembled-3300'}, d, 'akinza')
        self.assertNotIn('needsColdBaseline', done)
        self.assertNotIn('coldScoredAssembly', done)


class ApprovedLookTests(unittest.TestCase):
    def test_approved_look_lookup(self):
        docs = Path(tempfile.mkdtemp())
        packet = docs/'packet'
        packet.mkdir()
        (docs/'approved-looks.json').write_text(json.dumps({'lookReference': {'packet': str(packet)},
                                                            'parts': [{'part': 'eyes', 'regions': ['R02']}]}), encoding='utf-8')
        self.assertEqual(rp.approved_look('R02', docs)['parts'], ['eyes'])
        self.assertIsNone(rp.approved_look('R06', docs))
        self.assertIsNone(rp.approved_look('R02', docs/'nowhere'))
        shutil.rmtree(packet)
        with self.assertRaises(SystemExit):
            rp.approved_look('R02', docs)

    def test_live_record_quotes_every_part(self):
        rec = json.loads((DOCS/'approved-looks.json').read_text(encoding='utf-8'))
        self.assertEqual({p['part'] for p in rec['parts']}, {'eyes', 'nose', 'mouth', 'muzzle', 'ears', 'head'})
        for p in rec['parts']:
            self.assertTrue(p['quotes'] and all(q['text'] and q['at'] for q in p['quotes']), p['part'])
            self.assertTrue(p['regions'])


if __name__ == '__main__':
    unittest.main()
