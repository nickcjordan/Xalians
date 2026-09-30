"""Replay the Codex rollout file edits of the Akinza construction to recover script bytes.

The Akinza stages from 2026-09-28 17:35Z to 2026-09-29 01:46Z (UTC) ran scripts that
were edited in place and often never committed. The Codex worktree is gone, but the
rollout JSONL files still hold every edit. This tool starts from the raw git blobs of a
base commit and re-applies, in timestamp order across all rollouts:

* tools.apply_patch calls, with codex-rs semantics (lines split on LF, trailing CR
  ignored when matching, context and added lines written without CR, Add File joined
  with LF plus a final LF);
* PowerShell here-strings piped to python that write a .py file (run with the current
  Windows Python in the sandbox, so read_text/write_text normalize to CRLF, as then);
* PowerShell here-strings piped to Set-Content (text plus CRLF).

At each command that matches a snapshot rule it copies the named files, byte for byte,
into the output folder. Validated on 2026-09-30: the replayed tree equals ba7cd0e3 at
that commit's time and reproduces every run-time script hash recorded for the window (52
distinct hashes). A --check against 46dbc305 lists five mismatches: README.md,
assemble_reconstructed_creature.py, rebuild_body_field.py and refine_reconstructed_nose.py
were edited later by the Claude session, and refine_reconstructed_paw_volume.py (used by no
Akinza rebuild step) has two late patches this replay cannot apply. Every other script ends
equal to 46dbc305.

Usage (from the repository root, Windows):
    python art/species-construction/rebuild/replay_codex_edits.py \
        --spec art/species-construction/rebuild/akinza_recovered_scripts.json \
        --out docs/design/species-construction/akinza/rebuild/recovered-scripts \
        [--sandbox <scratch dir>] [--check 2026-09-28T23:28:30Z@ba7cd0e3]

The sandbox is deleted and recreated. Python snippets from the rollouts are executed
inside it, so run this only on the rollouts listed in the spec.
"""
import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

WT = 'C:/Users/njord/.codex/worktrees/1d07/Xalians'
sandbox = None


def log(message):
    print(message)

def sha(b):
    return hashlib.sha256(b).hexdigest()

def variants(b):
    lf = b.replace(b'\r\n', b'\n')
    return {'raw': sha(b), 'lf': sha(lf), 'crlf': sha(lf.replace(b'\n', b'\r\n'))}


def local(path):
    p = path.replace('\\', '/')
    for pre in (WT + '/', '/mnt/c/Users/njord/.codex/worktrees/1d07/Xalians/'):
        if p.lower().startswith(pre.lower()):
            p = p[len(pre):]
    if re.match(r'^[A-Za-z]:/', p) or p.startswith('/'):
        return None
    return os.path.join(sandbox, p)

# ---- JS string literal parsing ----
def parse_js_string(s, i):
    q = s[i]
    assert q in '"\'`'
    j = i + 1; out = []
    while j < len(s):
        c = s[j]
        if c == '\\':
            n = s[j + 1]
            m = {'n': '\n', 't': '\t', 'r': '\r', '\\': '\\', '"': '"', "'": "'", '`': '`', '0': '\0', 'b': '\b', 'f': '\f', 'v': '\v', '$': '$'}
            if n in m:
                out.append(m[n]); j += 2
            elif n == 'u':
                if s[j + 2] == '{':
                    k = s.index('}', j); out.append(chr(int(s[j + 3:k], 16))); j = k + 1
                else:
                    out.append(chr(int(s[j + 2:j + 6], 16))); j += 6
            elif n == 'x':
                out.append(chr(int(s[j + 2:j + 4], 16))); j += 4
            elif n == '\n':
                j += 2
            else:
                out.append(n); j += 2
        elif c == q:
            return ''.join(out), j + 1
        else:
            out.append(c); j += 1
    raise ValueError('unterminated')

def js_vars(src):
    v = {}
    for m in re.finditer(r'const\s+(\w+)\s*=\s*(["\'`])', src):
        try:
            val, _ = parse_js_string(src, m.end() - 1)
            v[m.group(1)] = val
        except Exception:
            pass
    return v

def ops_from_js(src):
    vars_ = js_vars(src)
    ops = []
    for m in re.finditer(r'tools\.apply_patch\(\s*', src):
        i = m.end()
        if src[i] in '"\'`':
            val, _ = parse_js_string(src, i)
            ops.append((m.start(), 'patch', val))
    for m in re.finditer(r'tools\.exec_command\(\s*\{\s*cmd\s*:\s*', src):
        i = m.end()
        if src[i] in '"\'`':
            q = src[i]
            val, _ = parse_js_string(src, i)
            if q == '`':
                val = re.sub(r'\$\{(\w+)\}', lambda mm: vars_.get(mm.group(1), mm.group(0)), val)
            ops.append((m.start(), 'cmd', val))
    ops.sort()
    return ops

# ---- apply_patch emulation (codex-rs semantics) ----
def seek(lines, pattern, start, eof):
    if not pattern:
        return start
    n = len(pattern)
    rng = range(start, len(lines) - n + 1)
    if eof and len(lines) >= n:
        rng = [len(lines) - n] + list(rng)
    for f in (lambda a: a, lambda a: a.rstrip(), lambda a: a.strip()):
        for i in rng:
            if all(f(lines[i + k]) == f(pattern[k]) for k in range(n)):
                return i
    return None

class PatchError(Exception):
    pass

def apply_patch(text, log):
    lines = text.split('\n')
    if lines and lines[0].strip() == '*** Begin Patch':
        lines = lines[1:]
    i = 0
    changed = []
    while i < len(lines):
        L = lines[i]
        if L.strip() == '*** End Patch' or L == '':
            i += 1; continue
        if L.startswith('*** Add File: '):
            path = L[len('*** Add File: '):].strip(); i += 1; body = []
            while i < len(lines) and not lines[i].startswith('*** '):
                body.append(lines[i][1:] if lines[i].startswith('+') else lines[i]); i += 1
            fp = local(path)
            if fp:
                os.makedirs(os.path.dirname(fp), exist_ok=True)
                open(fp, 'wb').write(('\n'.join(body) + '\n').encode('utf-8'))
                changed.append(('add', path))
            continue
        if L.startswith('*** Delete File: '):
            fp = local(L[len('*** Delete File: '):].strip())
            if fp and os.path.exists(fp):
                os.remove(fp)
            changed.append(('delete', L)); i += 1; continue
        if L.startswith('*** Update File: '):
            path = L[len('*** Update File: '):].strip(); i += 1
            move = None
            if i < len(lines) and lines[i].startswith('*** Move to: '):
                move = lines[i][len('*** Move to: '):].strip(); i += 1
            chunks = []; cur = None
            while i < len(lines) and not (lines[i].startswith('*** ') and not lines[i].startswith('*** End of File')):
                l = lines[i]
                if l.startswith('@@'):
                    cur = {'ctx': l[2:].strip() or None, 'old': [], 'new': [], 'eof': False}; chunks.append(cur)
                elif l.startswith('*** End of File'):
                    if cur: cur['eof'] = True
                else:
                    if cur is None:
                        cur = {'ctx': None, 'old': [], 'new': [], 'eof': False}; chunks.append(cur)
                    if l.startswith('+'):
                        cur['new'].append(l[1:])
                    elif l.startswith('-'):
                        cur['old'].append(l[1:])
                    elif l.startswith(' '):
                        cur['old'].append(l[1:]); cur['new'].append(l[1:])
                    elif l == '':
                        cur['old'].append(''); cur['new'].append('')
                    else:
                        raise PatchError('bad line ' + l[:60])
                i += 1
            fp = local(path)
            if not fp or not os.path.exists(fp):
                log(f'  !! PATCH TARGET MISSING {path}')
                continue
            orig = open(fp, 'rb').read().decode('utf-8')
            ol = orig.split('\n')
            if ol and ol[-1] == '':
                ol.pop()
            reps = []; idx = 0
            for ch in chunks:
                if ch['ctx']:
                    k = seek(ol, [ch['ctx']], idx, False)
                    if k is None:
                        raise PatchError(f'context not found {ch["ctx"][:60]} in {path}')
                    idx = k + 1
                if not ch['old']:
                    ins = len(ol)
                    reps.append((ins, 0, ch['new'])); continue
                pat, new = ch['old'], ch['new']
                k = seek(ol, pat, idx, ch['eof'])
                if k is None and pat and pat[-1] == '':
                    pat = pat[:-1]; new = new[:-1] if new and new[-1] == '' else new
                    k = seek(ol, pat, idx, ch['eof'])
                if k is None:
                    raise PatchError(f'chunk not found in {path}: {pat[:2]}')
                reps.append((k, len(pat), new)); idx = k + len(pat)
            reps.sort(key=lambda r: r[0])
            for s0, n0, new in reversed(reps):
                ol[s0:s0 + n0] = new
            if not ol or ol[-1] != '':
                ol.append('')
            out = '\n'.join(ol)
            dst = local(move) if move else fp
            open(dst, 'wb').write(out.encode('utf-8'))
            if move:
                os.remove(fp)
            changed.append(('update', path))
            continue
        i += 1
    return changed

TRACK = re.compile(r'(art/species-construction/[A-Za-z0-9_/]+\.py|untracked/species-construction/akinza/recover_0109_flakes\.py)')

def run_cmd(cmd, log):
    changed = []
    # PowerShell here-strings piped to python or Set-Content
    for m in re.finditer(r"@'\n(.*?)\n'@\s*\|\s*(Set-Content\s+(\S+)|(?:&\s*)?(\S*python(?:\.exe)?)\s+-)", cmd, re.S):
        body = m.group(1)
        if m.group(3):
            fp = local(m.group(3).strip('"\''))
            rel = m.group(3)
            if fp and TRACK.search(rel.replace('\\', '/')):
                os.makedirs(os.path.dirname(fp), exist_ok=True)
                open(fp, 'wb').write((body + '\r\n').encode('utf-8'))
                changed.append(('set-content', rel))
        else:
            if re.search(r"\.py\b", body) and re.search(r"write_text|open\([^\n]*['\"]w|copyfile", body):
                code = body.replace(WT, sandbox.replace('\\', '/')).replace('/mnt/c/Users/njord/.codex/worktrees/1d07/Xalians', sandbox.replace('\\', '/'))
                r = subprocess.run([sys.executable, '-'], input=code.encode('utf-8'), cwd=sandbox, capture_output=True, timeout=120)
                changed.append(('python', f'rc={r.returncode} ' + r.stderr.decode('utf-8', 'replace')[-240:].replace('\n', ' ')))
    return changed

def build_base(repo, base):
    if os.path.exists(sandbox):
        shutil.rmtree(sandbox)
    os.makedirs(sandbox)
    listing = subprocess.run(['git', '-C', repo, 'ls-tree', '-r', base, '--', 'art/species-construction',
                              'docs/design/species-construction'], capture_output=True, text=True, check=True).stdout
    proc = subprocess.Popen(['git', '-C', repo, 'cat-file', '--batch'], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    for line in listing.splitlines():
        meta, path = line.split('\t', 1)
        proc.stdin.write((meta.split()[2] + '\n').encode()); proc.stdin.flush()
        size = int(proc.stdout.readline().split()[2]); data = proc.stdout.read(size); proc.stdout.read(1)
        target = os.path.join(sandbox, path)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        open(target, 'wb').write(data)
    proc.stdin.close(); proc.wait()


def gather_events(rollouts, start, end):
    events = []
    for index, path in enumerate(rollouts):
        with open(path, encoding='utf-8') as handle:
            for line in handle:
                if '"custom_tool_call"' not in line:
                    continue
                record = json.loads(line)
                payload = record.get('payload', {})
                if payload.get('type') != 'custom_tool_call' or payload.get('name') != 'exec':
                    continue
                if start <= record['timestamp'] <= end:
                    events.append((record['timestamp'], index, payload.get('call_id'), payload.get('input', '')))
    events.sort()
    return events


def check(repo, commit):
    names = subprocess.run(['git', '-C', repo, 'ls-tree', '-r', '--name-only', commit, '--', 'art/species-construction'],
                           capture_output=True, text=True).stdout.split()
    bad = []
    for name in names:
        want = subprocess.run(['git', '-C', repo, 'show', f'{commit}:{name}'], capture_output=True).stdout.replace(b'\r\n', b'\n')
        path = os.path.join(sandbox, name)
        have = open(path, 'rb').read().replace(b'\r\n', b'\n') if os.path.exists(path) else None
        if have != want:
            bad.append(name)
    log(f'CHECK {commit}: {len(names)} files, mismatches {bad}')
    return not bad


def main():
    global sandbox
    parser = argparse.ArgumentParser()
    parser.add_argument('--spec', required=True)
    parser.add_argument('--out', required=True)
    parser.add_argument('--repo', default='.')
    parser.add_argument('--sandbox', default=os.path.join(tempfile.gettempdir(), 'akinza-codex-replay'))
    parser.add_argument('--check', action='append', default=[], help='ISO-time@commit checkpoint, repeatable')
    args = parser.parse_args()
    spec = json.load(open(args.spec, encoding='utf-8'))
    sandbox = os.path.abspath(args.sandbox)
    build_base(args.repo, spec['baseCommit'])
    checks = sorted(c.split('@') for c in args.check)
    snaps = {}
    for ts, index, call_id, source in gather_events(spec['rollouts'], spec['start'], spec['end']):
        while checks and ts > checks[0][0]:
            check(args.repo, checks.pop(0)[1])
        try:
            ops = ops_from_js(source)
        except Exception as error:
            log(f'{ts} r{index} JS parse failed: {error}')
            continue
        for _, kind, value in ops:
            if kind == 'patch':
                try:
                    apply_patch(value, log)
                except PatchError as error:
                    log(f'{ts} r{index} patch failed: {error}')
                continue
            run_cmd(value, log)
            for rule in spec['snapshots']:
                if re.search(rule['match'], value):
                    snaps[rule['step']] = (ts, call_id, index)
                    folder = os.path.join(args.out, rule['step'])
                    os.makedirs(folder, exist_ok=True)
                    for name in rule['files']:
                        shutil.copyfile(os.path.join(sandbox, name), os.path.join(folder, os.path.basename(name)))
    for ts, commit in checks:
        check(args.repo, commit)
    report = {}
    for rule in spec['snapshots']:
        ts, call_id, index = snaps.get(rule['step'], (None, None, None))
        files = {}
        for name, want in zip(rule['files'], rule.get('expect', [None] * len(rule['files']))):
            path = os.path.join(args.out, rule['step'], os.path.basename(name))
            got = sha(open(path, 'rb').read()) if os.path.exists(path) else None
            files[os.path.basename(name)] = {'source': name, 'sha256': got, 'expected': want, 'ok': want is None or got == want}
        report[rule['step']] = {'snapshotAt': ts, 'rollout': spec['rollouts'][index] if index is not None else None,
                                'callId': call_id, 'files': files}
    print(json.dumps(report, indent=2))
    if not all(f['ok'] for r in report.values() for f in r['files'].values()):
        sys.exit('A recovered file does not match its expected sha256')


if __name__ == '__main__':
    main()
