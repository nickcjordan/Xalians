"""Recipe pins, the honest cache, relative containment, tool scores and rebuild estimates.

    python -m unittest art/species-construction/loop/test/test_recipe_pins.py -v      (from the repository root)

No Blender runs. The git history search runs against a throwaway repository; the rest uses small fakes and files that
already exist in this repository."""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

LOOP = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(LOOP))
import recipe as rc  # noqa: E402
import recipe_steps as rs  # noqa: E402
import recipe_sweep as sweep  # noqa: E402

SCRIPT = 'art/species-construction/study_provenance.py'


def git(root, *argv):
    subprocess.run(['git', '-c', 'user.name=t', '-c', 'user.email=t@t', *argv], cwd=root, check=True, capture_output=True)


class FrozenNames(unittest.TestCase):
    def test_script_and_data_names(self):
        sha = 'abcdef0123456789'
        self.assertEqual(rs.frozen_name('a/b/author_x.py', sha).as_posix(), 'a/b/author_x_pabcdef01.py')
        self.assertEqual(rs.frozen_name('a/R03.md', sha).as_posix(), 'a/R03-pabcdef01.md')

    def test_a_frozen_name_is_not_frozen_twice(self):
        sha = '11111111aaaaaaaa'
        once = rs.frozen_name('a/R03.md', 'abcdef0123456789')
        self.assertEqual(rs.frozen_name(once, sha).as_posix(), 'a/R03-p11111111.md')


class History(unittest.TestCase):
    def test_finds_the_bytes_a_run_used_in_any_commit(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            git(root, 'init', '-q')
            (root/'spec.md').write_bytes(b'method one\nline two\n')
            git(root, 'add', '.')
            git(root, 'commit', '-q', '-m', 'one')
            (root/'spec.md').write_bytes(b'a different method\n')
            git(root, 'commit', '-qam', 'two')
            wanted = {rs.sha256_bytes(b'method one\nline two\n')}
            data, path, commit = rs.find_in_history(root, ['spec.md'], wanted)
            self.assertEqual(data, b'method one\nline two\n')
            self.assertEqual(path, 'spec.md')
            self.assertEqual(len(commit), 40)

    def test_crlf_recorded_hash_matches_the_lf_blob(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            git(root, 'init', '-q')
            (root/'t.py').write_bytes(b'x = 1\ny = 2\n')
            git(root, 'add', '.')
            git(root, 'commit', '-q', '-m', 'one')
            (root/'t.py').write_bytes(b'x = 3\n')
            git(root, 'commit', '-qam', 'two')
            crlf_sha = rs.sha256_bytes(b'x = 1\r\ny = 2\r\n')
            self.assertIsNotNone(rs.find_in_history(root, ['t.py'], {crlf_sha}))

    def test_bytes_that_were_never_committed_are_not_found(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            git(root, 'init', '-q')
            (root/'t.py').write_bytes(b'x = 1\n')
            git(root, 'add', '.')
            git(root, 'commit', '-q', '-m', 'one')
            self.assertIsNone(rs.find_in_history(root, ['t.py'], {rs.sha256_bytes(b'never committed')}))

    def test_relocated_copy_is_found_by_name(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            git(root, 'init', '-q')
            (root/'old').mkdir()
            (root/'old/R03.md').write_bytes(b'old method\n')
            git(root, 'add', '.')
            git(root, 'commit', '-q', '-m', 'one')
            git(root, 'mv', 'old', 'new')
            (root/'new/R03.md').write_bytes(b'new method\n')
            git(root, 'commit', '-qam', 'two')
            paths = rs.history_paths_named(root, ['R03.md'])
            self.assertIn('old/R03.md', paths)
            found = rs.find_in_history(root, paths, {rs.sha256_bytes(b'old method\n')})
            self.assertEqual(found[0], b'old method\n')


class Pins(unittest.TestCase):
    def test_changed_missing_and_unpinned(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root/'a.json').write_bytes(b'{"a": 1}\n')
            (root/'b.json').write_bytes(b'{"b": 1}\n')
            pins = {'a.json': rs.sha256_bytes(b'{"a": 1}\n'), 'b.json': rs.sha256_bytes(b'{"b": 0}\n'), 'gone.json': '0'*64}
            got = dict(rs.check_pins(pins, {'a.json', 'b.json', 'gone.json', 'new.json'}, root))
            self.assertEqual(got, {'b.json': 'CHANGED', 'gone.json': 'MISSING', 'new.json': 'UNPINNED'})

    def test_line_endings_do_not_change_a_pin(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root/'a.py').write_bytes(b'x = 1\r\ny = 2\r\n')
            self.assertEqual(rs.check_pins({'a.py': rs.sha256_bytes(b'x = 1\ny = 2\n')}, None, root), [])

    def test_edit_carries_pins_forward_and_pins_new_files(self):
        step = {'script': SCRIPT, 'args': ['--x', '1']}
        stale = {key: '0'*64 for key in rs.read_files(SCRIPT, [])}
        refreshed = dict(step)
        rc.refresh_pins(refreshed, {'pins': stale})
        self.assertEqual(refreshed['pins'], stale)  # unchanged inputs keep the recorded sha, so drift stays CHANGED
        fresh = dict(step)
        rc.refresh_pins(fresh, {})
        self.assertEqual(fresh['pins'], rs.pins_now(SCRIPT, []))  # a step with no record is pinned from today's bytes

    def test_file_arguments_are_read_files(self):
        spec = 'art/species-construction/specs/arms-r07-v10.json'
        if not (rs.ROOT/spec).is_file():
            self.skipTest('spec not present')
        files = rs.read_files(SCRIPT, ['--spec', '{repo}/'+spec, '--out', '{out}'])
        self.assertEqual(files[spec], 'file')
        self.assertEqual(files[SCRIPT], 'script')


class Analysis(unittest.TestCase):
    def record(self, directory, sources, inputs=None):
        (Path(directory)/'stage-start.json').write_text(json.dumps({'sources': sources, 'inputs': inputs or {}}), encoding='utf-8')

    def test_ok_differs_and_unrecorded(self):
        with tempfile.TemporaryDirectory() as tmp:
            work = Path(tmp)
            name = Path(SCRIPT).name
            self.record(work, {name: rs.file_hash(rs.ROOT/SCRIPT)})
            self.assertEqual(rc.analyze_files(SCRIPT, [], work, {}, work)[SCRIPT]['status'], 'ok')
            self.record(work, {name: '1'*64})
            got = rc.analyze_files(SCRIPT, [], work, {}, work)[SCRIPT]
            self.assertEqual((got['status'], got['wanted']), ('differs', ['1'*64]))
            self.assertEqual(rc.analyze_files(SCRIPT, [], None, {}, work)[SCRIPT]['status'], 'unrecorded')

    def test_the_only_unexplained_recorded_source_belongs_to_a_renamed_script(self):
        # a script committed under a versioned name (_r12) was recorded under its run-time name
        with tempfile.TemporaryDirectory() as tmp:
            work = Path(tmp)
            self.record(work, {'run_time_name.py': '2'*64})
            got = rc.analyze_files(SCRIPT, [], work, {}, work)[SCRIPT]
            self.assertEqual((got['status'], got['names']), ('differs', ['run_time_name.py']))

    def test_a_spec_that_is_not_the_recorded_input_differs(self):
        spec = 'art/species-construction/specs/arms-r07-v10.json'
        if not (rs.ROOT/spec).is_file():
            self.skipTest('spec not present')
        with tempfile.TemporaryDirectory() as tmp:
            work = Path(tmp)
            self.record(work, {}, {'C:\\data\\arms-r07-v10.json': '3'*64})
            got = rc.analyze_files(SCRIPT, ['--spec', '{repo}/'+spec], work, {}, work)[spec]
            self.assertEqual((got['status'], got['wanted']), ('differs', ['3'*64]))
            self.record(work, {}, {'C:\\data\\arms-r07-v10.json': rs.file_hash(rs.ROOT/spec)})
            self.assertEqual(rc.analyze_files(SCRIPT, ['--spec', '{repo}/'+spec], work, {}, work)[spec]['status'], 'ok')


class RelativeContainment(unittest.TestCase):
    def report(self, **maxima):
        foreign = {r: {'vertices': 10, 'p95': m/2, 'max': m} for r, m in maxima.items()}
        return {'foreign': foreign, 'outsideAllZones': {'vertices': 0, 'p95': 0.0, 'max': 0.0}}

    def test_overlap_the_baseline_step_also_had_is_not_a_side_effect(self):
        report = self.report(R01=.0148, R02=.0030, R04=.0008)
        reference = {**self.report(R01=.0121, R02=.0004, R04=.0008), 'step': 'H33', 'output': 'head-0455', 'baseline': 'head-0375'}
        rc.apply_reference(report, reference)
        self.assertEqual(report['verdict']['absolute'], ['R01', 'R02'])  # the flat rule flags both
        self.assertEqual(report['verdict']['relative'], ['R02'])         # R01 is within 1.5 x what the baseline step did to it
        self.assertAlmostEqual(report['foreign']['R01']['allowance'], .01815, places=5)
        self.assertEqual(report['foreign']['R02']['allowance'], rc.FLAT_ALLOWANCE)  # 1.5 x .0004 is under the floor

    def test_without_a_reference_the_flat_rule_stands(self):
        report = self.report(R01=.0148, R02=.0015)
        rc.apply_reference(report, None, 'no baseline version')
        self.assertEqual(report['verdict']['relative'], ['R01'])
        self.assertEqual(report['rule']['note'], 'no baseline version')


class Estimates(unittest.TestCase):
    def fixture(self, minutes):
        steps = [{'id': k, 'inputs': {'base': prev}, 'minutes': m} for (k, prev, m) in minutes]
        recipe = SimpleNamespace(order=steps, byid={s['id']: s for s in steps}, assembly={'minutes': 5.0})
        cache = SimpleNamespace(_load=lambda: {'steps': {}, 'assemblies': {}})
        return recipe, cache

    def test_early_edit_costs_the_chain_and_a_late_step_a_few_minutes(self):
        recipe, cache = self.fixture([('H1', 'root', 4.0), ('H2', 'H1', 6.0), ('H3', 'H2', 5.0)])
        every = {'H1': {'dir': None}, 'H2': {'dir': None}, 'H3': {'dir': None}, 'assembly': {'dir': None}}
        got = rc.estimate(recipe, cache, every)
        self.assertEqual((got['serialMinutes'], got['wallMinutes']), (20.0, 20.0))
        late = {'H1': {'dir': 'a'}, 'H2': {'dir': 'b'}, 'H3': {'dir': None}, 'assembly': {'dir': None}}
        self.assertEqual(rc.estimate(recipe, cache, late)['wallMinutes'], 10.0)

    def test_two_slots_overlap_independent_chains_and_unknown_is_named(self):
        recipe, cache = self.fixture([('H1', 'root', 10.0), ('B1', 'root', 8.0), ('B2', 'B1', None)])
        plan = {'H1': {'dir': None}, 'B1': {'dir': None}, 'B2': {'dir': None}, 'assembly': {'dir': 'x'}}
        got = rc.estimate(recipe, cache, plan)
        self.assertEqual(got['wallMinutes'], 10.0)
        self.assertEqual(got['unknown'], ['B2'])


class SweepScore(unittest.TestCase):
    def test_reads_the_first_top_level_sweep_score(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            (out/'stage-start.json').write_text(json.dumps({'sweepScore': 9}), encoding='utf-8')
            (out/'fairing.json').write_text(json.dumps({'nested': {'sweepScore': 5}}), encoding='utf-8')
            self.assertIsNone(sweep.tool_record(out))
            (out/'trunk-sections.json').write_text(json.dumps({'sweepScore': -0.0123, 'sweepTerms': {'rms_back': 0.01}}), encoding='utf-8')
            self.assertEqual(sweep.tool_record(out), (-0.0123, {'rms_back': 0.01}, 'trunk-sections.json'))

    def test_the_score_is_a_term_and_a_missing_one_drops_out(self):
        term = {'fitIou': .5, 'stationDiff': .1, 'toolScore': -0.010}
        base = {'fitIou': .5, 'stationDiff': .1}
        total, parts = sweep.total_score(term, base, 0.0, tool_ref=-0.020)
        self.assertAlmostEqual(parts['tool'], 1.0)
        self.assertAlmostEqual(total, 1.0)
        _, parts = sweep.total_score({**term, 'toolScore': None}, base, 0.0, tool_ref=-0.020)
        self.assertNotIn('tool', parts)


class DumpStyle(unittest.TestCase):
    def test_rewriting_in_place_keeps_an_indent_one_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/'recipe.json'
            path.write_bytes(json.dumps({'a': {'b': [1, 2]}}, indent=1).encode('utf-8'))
            rc.dump({'a': {'b': [1, 2]}, 'c': 1}, path, like=path)
            self.assertEqual(path.read_bytes().decode('utf-8'), json.dumps({'a': {'b': [1, 2]}, 'c': 1}, indent=1))


if __name__ == '__main__':
    unittest.main()
