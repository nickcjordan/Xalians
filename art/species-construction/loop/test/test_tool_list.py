import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import loop_state as ls  # noqa: E402

STEPS = 'new: author_x.py --part rear replaces H34'


class ToolList(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())
        (self.dir/'tools').mkdir()
        (self.dir/'methods.json').write_text(json.dumps({'regions': {'R04': {'steps': STEPS}}}), encoding='utf-8')

    def write(self, rec):
        (self.dir/'tools'/'R04.json').write_text(json.dumps(rec), encoding='utf-8')

    def test_prose_after_the_script_path_is_still_the_same_tool(self):
        self.write({'script': 'art/x/author_x_v5.py (--part rear; the front lives in v3/v4; v5 is a copy)', 'recipe': 'r.json', 'checkPlan': 'c.json', 'readerCheck': 'worse: torn'})
        [t] = ls.tool_list(self.dir)
        self.assertNotIn('replaces', t)
        self.assertTrue(t['built'])
        self.assertNotIn('stalled', t)

    def test_rejected_after_the_fix_pass_waits_for_a_method_review(self):
        self.write({'script': 'author_x_v5.py', 'recipe': 'r.json', 'checkPlan': 'c.json', 'readerCheck': 'worse: torn', 'rejectedForMethod': ls.steps_key(STEPS)})
        [t] = ls.tool_list(self.dir)
        self.assertTrue(t['stalled'])
        (self.dir/'methods.json').write_text(json.dumps({'regions': {'R04': {'steps': STEPS + ' with a new section'}}}), encoding='utf-8')
        [t] = ls.tool_list(self.dir)
        self.assertNotIn('stalled', t)


if __name__ == '__main__':
    unittest.main()
