import copy
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import completion_audit as gate


class CompletionAuditTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='completion-audit-test-')
        self.root = Path(self.temp.name)
        def git(*args):
            return gate.git(self.root, *args)
        git('init', '-q')
        (self.root / '.gitignore').write_text('.codex/audit-state/\nignored/\n')
        (self.root / 'work.md').write_text('User outcome and authorized work')
        (self.root / 'result.txt').write_text('Actual inspected result')
        git('add', '.')
        git('-c', 'user.name=Audit test', '-c', 'user.email=audit@example.invalid',
            '-c', 'core.hooksPath=', 'commit', '-qm', 'Test fixture')
        self.record = {
            'schemaVersion': 1, 'id': 'test', 'outcome': 'Deliver a correct result',
            'authorizedScope': 'Implement and verify the requested result', 'workRecord': 'work.md',
            'evidence': {'result': {'path': 'result.txt', 'sha256': gate.digest((self.root/'result.txt').read_bytes())}},
            'criteria': [{'id': 'quality', 'expectation': 'Result matches request', 'status': 'pass',
                          'assessment': 'Inspected actual result', 'evidence': ['result']}],
            'findings': [], 'audit': {'reviewer': 'Test reviewer', 'comparison': 'Compared with target',
                'regressions': 'Checked retained requirements', 'scopeCheck': 'Original scope retained'},
            'stop': {'kind': 'complete'}}

    def tearDown(self):
        self.temp.cleanup()

    def check(self):
        return gate.evaluate(self.record, self.root)

    def save(self):
        gate.write(self.root/'audit.json', self.record)

    def payload(self, event='Stop', session='chat-a', **extra):
        return {'session_id': session, 'cwd': str(self.root), 'hook_event_name': event, **extra}

    def fresh(self, session='chat-a'):
        gate.hook(self.payload('UserPromptSubmit', session), self.root)
        state = gate.read(gate.state_path(self.root, session))
        self.record['audit'].update(sessionId=session, requestId=state['requestId'], performedAt='2026-09-28T00:00:00Z')
        self.save()

    def add_open(self):
        self.record['findings'] = [{'id': 'F1', 'criterion': 'quality', 'status': 'open',
                                   'observation': 'Known wrong form', 'nextAction': 'Rebuild and compare'}]

    def test_complete_requires_evidence(self):
        self.assertTrue(self.check()['canStop'])
        self.record['criteria'][0]['evidence'] = []
        self.assertFalse(self.check()['canStop'])

    def test_open_finding_blocks_even_passing_criteria(self):
        self.add_open()
        self.assertFalse(self.check()['canStop'])

    def test_failed_criterion_blocks_without_findings(self):
        self.record['criteria'][0]['status'] = 'fail'
        self.assertFalse(self.check()['canStop'])

    def test_stale_evidence_blocks(self):
        (self.root/'result.txt').write_text('Unreviewed new result')
        self.assertFalse(self.check()['canStop'])

    def test_fabricated_approval_boundary_rejected(self):
        self.record['stop'] = {'kind': 'approval', 'question': 'Approve?', 'evidence': ['result']}
        self.assertFalse(self.check()['canStop'])
        self.record['stop'].update(requiredBy='User explicitly requires art approval', decisionNeeded='Accept this exact model')
        self.assertTrue(self.check()['canStop'])
        self.add_open()
        self.assertFalse(self.check()['canStop'])

    def test_blocker_requires_all_remaining_work_accounted_for(self):
        self.add_open()
        finding = self.record['findings'][0]
        finding.update(status='blocked', evidence=['result'], blocker={
            'externalDependency': 'Missing user-owned source file', 'attempts': 'Inspected available files',
            'unblocksWhen': 'Source file supplied'})
        self.record['stop'] = {'kind': 'blocked'}
        self.assertFalse(self.check()['canStop'])
        self.record['criteria'][0]['status'] = 'blocked'
        self.assertTrue(self.check()['canStop'])
        self.record['findings'].append({'id': 'F2', 'criterion': 'quality', 'status': 'open',
                                       'observation': 'Independent fix remains', 'nextAction': 'Do fix'})
        self.assertFalse(self.check()['canStop'])

    def test_user_stop_takes_precedence(self):
        self.add_open()
        self.record['stop'] = {'kind': 'user_stop', 'userWords': 'Stop working', 'source': 'Current user message'}
        self.assertTrue(self.check()['canStop'])

    def test_resolved_finding_requires_verification(self):
        self.add_open()
        self.record['findings'][0]['status'] = 'resolved'
        self.assertFalse(self.check()['canStop'])

    def test_omitted_findings_and_criteria_rejected(self):
        self.add_open()
        self.assertEqual(gate.history_check(self.root, 'audit.json', self.record), [])
        self.record['findings'] = []
        self.assertTrue(gate.history_check(self.root, 'audit.json', self.record))
        self.record['criteria'] = []
        self.assertTrue(gate.history_check(self.root, 'audit.json', self.record))

    def test_resolution_requires_new_result_evidence(self):
        self.add_open()
        gate.history_check(self.root, 'audit.json', self.record)
        self.record['findings'][0].update(status='resolved', resolution='Fixed shape', resolutionEvidence=['result'])
        self.assertTrue(gate.history_check(self.root, 'audit.json', self.record))
        (self.root/'result.txt').write_text('Actually changed result')
        self.record['evidence']['result']['sha256'] = gate.digest((self.root/'result.txt').read_bytes())
        self.assertEqual(gate.history_check(self.root, 'audit.json', self.record), [])

    def test_scope_or_criterion_cannot_silently_shrink(self):
        gate.history_check(self.root, 'audit.json', self.record)
        self.record['criteria'][0]['expectation'] = 'Only write a plan'
        self.assertTrue(gate.history_check(self.root, 'audit.json', self.record))

    def test_intermediate_check_does_not_poison_repair_baseline(self):
        self.add_open()
        gate.history_check(self.root, 'audit.json', self.record)
        (self.root/'result.txt').write_text('New render')
        self.record['evidence']['result']['sha256'] = gate.digest((self.root/'result.txt').read_bytes())
        gate.history_check(self.root, 'audit.json', self.record)
        self.record['findings'][0].update(status='resolved', resolution='Rebuilt', resolutionEvidence=['result'])
        self.assertEqual(gate.history_check(self.root, 'audit.json', self.record), [])
        self.record['findings'][0]['status'] = 'open'
        gate.history_check(self.root, 'audit.json', self.record)
        self.record['findings'][0]['status'] = 'resolved'
        self.assertTrue(gate.history_check(self.root, 'audit.json', self.record))

    def test_bad_hash_cannot_advance_resolution_history(self):
        self.add_open()
        original_hash = self.record['evidence']['result']['sha256']
        gate.history_check(self.root, 'audit.json', self.record)
        self.record['findings'][0].update(status='resolved', resolution='Claimed repair', resolutionEvidence=['result'])
        self.record['evidence']['result']['sha256'] = 'mistyped-new-hash'
        self.assertFalse(self.check()['canStop'])
        self.assertTrue(gate.history_check(self.root, 'audit.json', self.record))
        self.record['evidence']['result']['sha256'] = original_hash
        self.assertTrue(any('no new result' in p for p in gate.history_check(self.root, 'audit.json', self.record)))

    def test_failed_check_still_remembers_new_findings(self):
        self.add_open()
        gate.history_check(self.root, 'audit.json', self.record)
        self.record['findings'][0].update(status='resolved', resolution='Unchanged', resolutionEvidence=['result'])
        self.record['findings'].append({'id': 'F2', 'criterion': 'quality', 'status': 'open',
                                       'observation': 'New defect', 'nextAction': 'Fix new defect'})
        self.assertTrue(gate.history_check(self.root, 'audit.json', self.record))
        self.record['findings'].pop()
        self.record['evidence']['result']['sha256'] = 'genuinely-new'
        self.assertTrue(any('omitted' in p for p in gate.history_check(self.root, 'audit.json', self.record)))

    def test_equivalent_paths_share_history(self):
        self.add_open()
        gate.history_check(self.root, './audit.json', self.record)
        self.record['findings'] = []
        self.assertTrue(gate.history_check(self.root, 'audit.json', self.record))
        if os.name == 'nt':
            self.assertTrue(gate.history_check(self.root, '.\\AUDIT.json', self.record))

    def test_minimal_user_stop_seals_without_erasing_backlog(self):
        self.add_open()
        gate.history_check(self.root, 'audit.json', self.record)
        previous = copy.deepcopy(self.record)
        self.record = {k: self.record[k] for k in ('schemaVersion', 'id', 'outcome', 'authorizedScope', 'workRecord', 'audit')}
        self.record['stop'] = {'kind': 'user_stop', 'userWords': 'Stop', 'source': 'Current user message'}
        self.fresh()
        self.assertTrue(gate.seal(self.root, 'chat-a', 'audit.json')['canStop'])
        self.assertEqual(gate.hook(self.payload(), self.root), {})
        previous['findings'] = []
        self.assertTrue(gate.history_check(self.root, 'audit.json', previous))

    def test_missing_receipt_blocks_even_when_stop_hook_active(self):
        self.assertEqual(gate.hook(self.payload(stop_hook_active=True), self.root)['decision'], 'block')

    def test_receipt_is_single_use(self):
        self.fresh()
        self.assertTrue(gate.seal(self.root, 'chat-a', 'audit.json')['canStop'])
        self.assertEqual(gate.hook(self.payload(), self.root), {})
        self.assertEqual(gate.hook(self.payload(), self.root)['decision'], 'block')
        self.assertFalse(gate.seal(self.root, 'chat-a', 'audit.json')['canStop'])

    def test_receipt_cannot_cross_chat_or_new_prompt(self):
        self.fresh()
        self.assertFalse(gate.seal(self.root, 'chat-b', 'audit.json')['canStop'])
        gate.hook(self.payload('UserPromptSubmit'), self.root)
        self.assertFalse(gate.seal(self.root, 'chat-a', 'audit.json')['canStop'])

    def test_changed_work_invalidates_receipt(self):
        self.fresh()
        gate.seal(self.root, 'chat-a', 'audit.json')
        (self.root/'new-file.txt').write_text('New unaudited file')
        self.assertEqual(gate.hook(self.payload(), self.root)['decision'], 'block')

    def test_ignored_bound_artifact_change_invalidates(self):
        (self.root/'ignored').mkdir()
        target = self.root/'ignored/model.bin'; target.write_bytes(b'old model')
        self.record['evidence']['model'] = {'path': 'ignored/model.bin', 'sha256': gate.digest(target.read_bytes())}
        self.fresh(); gate.seal(self.root, 'chat-a', 'audit.json')
        target.write_bytes(b'new model')
        self.assertEqual(gate.hook(self.payload(), self.root)['decision'], 'block')

    def test_interrupt_never_restarts_work(self):
        self.fresh(); gate.seal(self.root, 'chat-a', 'audit.json')
        self.assertEqual(gate.hook(self.payload('Interrupt'), self.root), {})
        self.assertEqual(gate.hook(self.payload(), self.root), {})
        gate.hook(self.payload('UserPromptSubmit'), self.root)
        self.assertEqual(gate.hook(self.payload(), self.root)['decision'], 'block')

    def test_path_escape_and_malformed_input_rejected(self):
        self.record['evidence']['result']['path'] = '../escaped'
        with self.assertRaises(ValueError): self.check()
        with self.assertRaises(ValueError): gate.evaluate([], self.root)

    def test_malformed_state_hook_blocks(self):
        gate.write(gate.state_path(self.root, 'chat-a'), [])
        script = Path(gate.__file__).resolve()
        process = subprocess.run([sys.executable, str(script), 'hook'], input=json.dumps(self.payload()),
                                 text=True, capture_output=True, cwd=self.root)
        self.assertEqual(process.returncode, 0)
        self.assertEqual(json.loads(process.stdout)['decision'], 'block')

    @unittest.skipUnless(os.name == 'nt', 'Windows hook wrapper')
    def test_real_windows_wrapper_from_subdirectory(self):
        source = Path(gate.__file__).resolve().parents[1]
        (self.root/'scripts').mkdir()
        (self.root/'scripts/completion_audit.py').write_bytes(Path(gate.__file__).read_bytes())
        (self.root/'nested').mkdir()
        config = gate.read(source/'.codex/hooks.json')
        command = config['hooks']['Stop'][0]['hooks'][0]['commandWindows']
        process = subprocess.run(command, input=json.dumps(self.payload()), text=True,
                                 capture_output=True, cwd=self.root/'nested')
        self.assertEqual(process.returncode, 0, process.stderr)
        self.assertEqual(json.loads(process.stdout)['decision'], 'block')


if __name__ == '__main__':
    unittest.main()
