"""Local completion gate. Enforces recorded evidence, not artistic truth.

No model calls, network access, approvals, or autonomous shell execution.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import uuid


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(value, indent=2) + '\n', encoding='utf-8')
    os.replace(temporary, path)


def git(root, *args):
    return subprocess.check_output(['git', '-C', str(root), *args], stderr=subprocess.PIPE)


def repository(cwd):
    return Path(git(cwd, 'rev-parse', '--show-toplevel').decode().strip()).resolve()


def contained(root, relative):
    path = (root / relative).resolve()
    if Path(relative).is_absolute() or not path.is_relative_to(root.resolve()):
        raise ValueError('Evidence must stay inside the repository: ' + relative)
    return path


def snapshot(root):
    """Bind tracked modifications, HEAD, and nonignored new files without logs."""
    value = hashlib.sha256(git(root, 'rev-parse', 'HEAD'))
    value.update(git(root, 'diff', 'HEAD', '--no-ext-diff', '--binary'))
    names = git(root, 'ls-files', '--others', '--exclude-standard', '-z').decode().split('\0')
    for name in sorted(filter(None, names)):
        path = contained(root, name)
        value.update(name.encode())
        if path.is_file():
            value.update(hashlib.sha256(path.read_bytes()).digest())
    return value.hexdigest()


def nonempty(value):
    return isinstance(value, str) and bool(value.strip())


def evaluate(record, root):
    """A finding stays work until fixed with evidence or specifically blocked."""
    problems = []
    if not isinstance(record, dict):
        raise ValueError('Audit must be a JSON object')
    if record.get('schemaVersion') != 1:
        raise ValueError('Expected audit schemaVersion 1')
    for key in ('id', 'outcome', 'authorizedScope', 'workRecord'):
        if not nonempty(record.get(key)):
            raise ValueError('Missing ' + key)
    if not contained(root, record['workRecord']).is_file():
        raise ValueError('Missing persistent work record')
    stop = record.get('stop', {})
    # An explicit user stop takes precedence over an audit or unfinished work.
    if stop.get('kind') == 'user_stop':
        if not nonempty(stop.get('userWords')) or not nonempty(stop.get('source')):
            raise ValueError('A user stop requires actual words and source')
        return {'canStop': True, 'disposition': 'user_stop', 'problems': []}
    evidence = record.get('evidence', {})
    valid_evidence = set()
    for key, entry in evidence.items():
        path = contained(root, entry['path'])
        if not path.is_file() or digest(path.read_bytes()) != entry.get('sha256'):
            problems.append('Missing or changed evidence: ' + key)
        else:
            valid_evidence.add(key)
    criteria = record.get('criteria', [])
    findings = record.get('findings', [])
    if not criteria:
        raise ValueError('At least one outcome criterion is required')
    ids = [c['id'] for c in criteria]
    finding_ids = [f['id'] for f in findings]
    if len(set(ids)) != len(ids) or len(set(finding_ids)) != len(finding_ids):
        raise ValueError('Duplicate criterion or finding IDs')
    for criterion in criteria:
        if criterion.get('status') not in ('pass', 'fail', 'pending', 'blocked'):
            raise ValueError('Unknown criterion status')
        if not nonempty(criterion.get('expectation')):
            raise ValueError('Criterion needs an outcome expectation')
        refs = criterion.get('evidence', [])
        if not refs or not set(refs).issubset(valid_evidence) or not nonempty(criterion.get('assessment')):
            problems.append('Criterion lacks current inspection evidence: ' + criterion['id'])
        if criterion['status'] in ('fail', 'pending'):
            problems.append('Unfinished outcome criterion: ' + criterion['id'])
    runnable = []
    blocked = []
    for finding in findings:
        if finding.get('criterion') not in ids or not nonempty(finding.get('observation')):
            raise ValueError('Finding requires an existing criterion and observation')
        state = finding.get('status')
        if state in ('open', 'in_progress'):
            runnable.append(finding['id'])
            if not nonempty(finding.get('nextAction')):
                problems.append('Finding lacks next action: ' + finding['id'])
        elif state == 'resolved':
            refs = finding.get('resolutionEvidence', [])
            if not refs or not set(refs).issubset(valid_evidence) or not nonempty(finding.get('resolution')):
                problems.append('Unverified resolution: ' + finding['id'])
        elif state == 'blocked':
            blocked.append(finding)
            blocker = finding.get('blocker', {})
            if any(not nonempty(blocker.get(k)) for k in ('externalDependency', 'attempts', 'unblocksWhen')):
                problems.append('Unsubstantiated blocker: ' + finding['id'])
            if not finding.get('evidence') or not set(finding['evidence']).issubset(valid_evidence):
                problems.append('Blocker lacks current evidence: ' + finding['id'])
        elif state == 'out_of_scope':
            if not nonempty(finding.get('rationale')) or not nonempty(finding.get('scopeSource')):
                problems.append('Unjustified scope exclusion: ' + finding['id'])
        else:
            raise ValueError('Unknown finding status: ' + str(state))
    if runnable:
        problems.append('Continue authorized fixes: ' + ', '.join(runnable))
    audit = record.get('audit', {})
    if any(not nonempty(audit.get(k)) for k in ('reviewer', 'comparison', 'regressions', 'scopeCheck')):
        problems.append('Missing whole-outcome audit and regression/scope assessment')
    kind = stop.get('kind', 'continue')
    if kind not in ('continue', 'complete', 'approval', 'blocked'):
        raise ValueError('Unknown stop kind')
    if kind == 'continue':
        problems.append('Record explicitly requires continued work')
    if kind in ('complete', 'approval') and any(c['status'] != 'pass' for c in criteria):
        problems.append('Outcome is not ready for completion or approval')
    if kind in ('complete', 'approval') and blocked:
        problems.append('Blocked findings prevent completion or approval')
    if kind == 'approval':
        if not nonempty(stop.get('question')) or not stop.get('evidence') or not set(stop['evidence']).issubset(valid_evidence):
            problems.append('Approval needs one concrete question and current deliverable evidence')
        if not nonempty(stop.get('requiredBy')) or not nonempty(stop.get('decisionNeeded')):
            problems.append('Approval needs its existing authorization boundary and consequential decision')
    if kind == 'blocked':
        if not blocked or runnable or any(c['status'] not in ('pass', 'blocked') for c in criteria):
            problems.append('Blocker does not cover all remaining work')
        if not any(c['status'] == 'blocked' for c in criteria):
            problems.append('No blocked outcome criterion')
        if any(next(c for c in criteria if c['id'] == f['criterion'])['status'] != 'blocked' for f in blocked):
            problems.append('Blocked finding must correspond to a blocked criterion')
        for criterion in criteria:
            if criterion['status'] == 'blocked' and not any(f['criterion'] == criterion['id'] for f in blocked):
                problems.append('Blocked criterion lacks a specific blocker: ' + criterion['id'])
    return {'canStop': not problems, 'disposition': kind if not problems else 'continue',
            'problems': problems, 'nextActions': [f['nextAction'] for f in findings
                                                if f.get('status') in ('open', 'in_progress') and f.get('nextAction')]}


def state_path(root, session):
    if not nonempty(session):
        raise ValueError('Session ID required; do not share receipts between chats')
    return root / '.codex/audit-state' / (digest(session.encode()) + '.json')


def history_check(root, relative, record):
    """Retain obligations, comparing repairs with each failure's own baseline."""
    if record.get('stop', {}).get('kind') == 'user_stop':
        return []
    canonical = os.path.normcase(str(contained(root, relative)))
    path = root / '.codex/audit-state/tasks' / (digest(canonical.encode()) + '.json')
    old = read(path) if path.exists() else {'criteria': {}, 'findings': {}, 'failureEvidence': {}}
    problems = []
    criteria = {c['id']: c for c in record['criteria']}
    findings = {f['id']: f for f in record.get('findings', [])}
    kept_criteria = dict(old['criteria'])
    kept_findings = dict(old['findings'])
    baselines = dict(old.get('failureEvidence', {}))
    scope = record.get('scopeChange', {})
    changed_by_user = nonempty(scope.get('userWords')) and nonempty(scope.get('source'))
    if set(old['criteria']) - set(criteria) or set(old['findings']) - set(findings):
        problems.append('Previously recorded criteria or findings were omitted; retain and disposition them')
    outcome = record['outcome']
    if old.get('outcome') and old['outcome'] != outcome and not changed_by_user:
        problems.append('Outcome changed without explicit user scope-change evidence')
        outcome = old['outcome']
    for key, current in criteria.items():
        prior = old['criteria'].get(key)
        if prior and prior['expectation'] != current['expectation'] and not changed_by_user:
            problems.append('Outcome criterion changed without explicit user scope-change evidence')
        else:
            kept_criteria[key] = current
    evidence = record.get('evidence', {})
    actual_hashes = {}
    for key, entry in evidence.items():
        target = contained(root, entry['path'])
        if target.is_file():
            actual_hashes[key] = digest(target.read_bytes())
    valid_evidence = {key for key, value in actual_hashes.items() if value == evidence[key]['sha256']}
    all_hashes = set(actual_hashes.values())
    unresolved = ('open', 'in_progress', 'blocked')
    for key, current in findings.items():
        previous = old['findings'].get(key)
        baseline = baselines.get(key, old.get('evidenceHashes', []))
        refs = current.get('resolutionEvidence', [])
        if current['status'] == 'resolved' and (not nonempty(current.get('resolution'))
                                               or not refs or not set(refs).issubset(valid_evidence)):
            problems.append('Cannot record an unverified resolution: ' + key)
            if not previous:
                kept_findings[key] = {**current, 'status': 'open', 'nextAction': 'Verify the claimed resolution against the actual result'}
                baselines[key] = sorted(all_hashes)
            continue
        if previous and previous['status'] in unresolved and current['status'] == 'resolved':
            hashes = [evidence[e]['sha256'] for e in current.get('resolutionEvidence', []) if e in evidence]
            if not hashes or all(h in baseline for h in hashes):
                problems.append('Resolution has no new result evidence: ' + key)
                continue
        if current['status'] in unresolved and (not previous or previous['status'] not in unresolved):
            baselines[key] = sorted(all_hashes)
        elif key not in baselines:
            baselines[key] = list(baseline)
        kept_findings[key] = current
    # Failed checks still retain newly discovered obligations, never invalid closures.
    write(path, {'outcome': outcome, 'criteria': kept_criteria, 'findings': kept_findings,
                 'failureEvidence': baselines})
    return problems


def seal(root, session, relative):
    record_path = contained(root, relative)
    record = read(record_path)
    result = evaluate(record, root)
    result['problems'] += history_check(root, relative, record)
    result['canStop'] = result['canStop'] and not result['problems']
    if not result['canStop']:
        result['disposition'] = 'continue'
        return result
    path = state_path(root, session)
    state = read(path) if path.exists() else {}
    audit = record.get('audit', {})
    if (not state.get('requestId') or audit.get('requestId') != state['requestId']
            or audit.get('sessionId') != session or not nonempty(audit.get('performedAt'))):
        return {'canStop': False, 'disposition': 'continue',
                'problems': ['Audit is not bound to this chat and current review request. Run begin, then perform and record a fresh audit.']}
    state['receipt'] = {'requestId': state['requestId'], 'record': relative,
                        'sha256': digest(record_path.read_bytes()), 'snapshot': snapshot(root)}
    write(path, state)
    return result


def hook(payload, root):
    event = payload.get('hook_event_name')
    path = state_path(root, payload.get('session_id'))
    if event == 'UserPromptSubmit':
        write(path, {'requestId': str(uuid.uuid4())})
        return {}
    if event == 'Interrupt':
        write(path, {'requestId': str(uuid.uuid4()), 'interrupted': True})
        return {}
    if event != 'Stop':
        return {}
    state = read(path) if path.exists() else {'requestId': str(uuid.uuid4())}
    if not isinstance(state, dict) or not nonempty(state.get('requestId')):
        raise ValueError('Malformed audit hook state; run begin to repair it')
    if state.get('interrupted'):
        return {}
    receipt = state.get('receipt')
    reasons = []
    if receipt:
        try:
            record_path = contained(root, receipt['record'])
            result = evaluate(read(record_path), root)
            fresh = (receipt['requestId'] == state['requestId']
                     and read(record_path).get('audit', {}).get('requestId') == state['requestId']
                     and read(record_path).get('audit', {}).get('sessionId') == payload['session_id']
                     and receipt['sha256'] == digest(record_path.read_bytes())
                     and receipt['snapshot'] == snapshot(root))
            if fresh and result['canStop']:
                # Consume it: a later user turn must receive its own audit.
                write(path, {'requestId': str(uuid.uuid4())})
                return {}
            reasons = result['problems'] if not result['canStop'] else ['Work changed after the audit receipt.']
        except (ValueError, OSError, KeyError) as error:
            reasons = [str(error)]
    write(path, {'requestId': state['requestId']})
    return {'decision': 'block', 'reason':
            'Completion audit required. Read AGENTS.md and docs/design/autonomous-completion-audit.md. '
            'Inspect the actual result against the original outcome, record every substantive gap, '
            'fix executable authorized findings, and audit again. Do not stop after writing the audit. '
            'Preserve user stops and real external blockers; do not invent work or broaden scope. '
            'First run python scripts/completion_audit.py begin --session '
            + json.dumps(payload['session_id']) + ' and bind the audit to its returned sessionId/requestId. '
            'Then inspect, update the task audit JSON and run python scripts/completion_audit.py seal --session '
            + json.dumps(payload['session_id']) + ' --record <repository-relative-audit.json>. '
            'Set audit.performedAt to the actual review time. '
            'This receipt must describe this chat, not another task. ' + ' '.join(reasons)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=('begin', 'check', 'seal', 'hook'))
    parser.add_argument('--record')
    parser.add_argument('--session')
    args = parser.parse_args()
    try:
        if args.command == 'hook':
            payload = json.load(sys.stdin)
            root = repository(payload.get('cwd', Path.cwd()))
            result = hook(payload, root)
        else:
            root = repository(Path.cwd())
            if args.command == 'begin':
                state = {'requestId': str(uuid.uuid4())}
                write(state_path(root, args.session), state)
                print(json.dumps({'sessionId': args.session, **state}))
                return 0
            if not args.record:
                raise ValueError('--record is required')
            result = (seal(root, args.session, args.record) if args.command == 'seal'
                      else evaluate(read(contained(root, args.record)), root))
            if args.command == 'check':
                result['problems'] += history_check(root, args.record, read(contained(root, args.record)))
                result['canStop'] = result['canStop'] and not result['problems']
                if not result['canStop']:
                    result['disposition'] = 'continue'
        print(json.dumps(result))
        return 0 if args.command == 'hook' or result['canStop'] else 1
    except (ValueError, KeyError, TypeError, AttributeError) as error:
        if args.command == 'hook':
            print(json.dumps({'decision': 'block', 'reason': 'Repair the malformed completion audit record/state, then audit again: ' + str(error)}))
            return 0
        print(json.dumps({'canStop': False, 'error': str(error)}))
        return 2
    except (OSError, subprocess.SubprocessError) as error:
        if args.command == 'hook':
            # A broken hook cannot certify work or trap the chat in an error loop.
            print(json.dumps({'systemMessage': 'Completion audit hook failed: ' + str(error)
                              + '. Automatic enforcement is unavailable. Apply the AGENTS.md audit manually; do not claim completion from this failure.'}))
            return 0
        print(json.dumps({'canStop': False, 'error': str(error)}))
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
