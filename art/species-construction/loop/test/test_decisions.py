import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import loop_state as ls  # noqa: E402


class AnswerDuringRun(unittest.TestCase):
    """v3.14: an answer Nick gives while a round runs survives the merge of that round, which still returns the item open."""

    def test_an_answer_given_mid_run_wins_and_frees_the_pair(self):
        item = {'key': 'idiom:R03:', 'kind': 'idiom', 'region': 'R03', 'question': 'q'}
        full = {'regions': {}, 'decisions': [{**item, 'answer': 'soften', 'frees': ['R04']}], 'awaiting': {}}
        returned = {'regions': {}, 'decisions': [dict(item), {'key': 'reverts:R09:', 'kind': 'reverts', 'region': 'R09', 'question': 'r'}],
                    'awaiting': {'R03': 'q', 'R04': 'q', 'R09': 'r'}}
        S = ls.merge_status(full, returned, ls.species_dirs('akinza'), 'akinza')
        keys = {d['key']: d for d in S['decisions']}
        self.assertEqual(keys['idiom:R03:']['answer'], 'soften')
        self.assertIn('reverts:R09:', keys)
        self.assertEqual(sorted(S['awaiting']), ['R09'])


if __name__ == '__main__':
    unittest.main()
