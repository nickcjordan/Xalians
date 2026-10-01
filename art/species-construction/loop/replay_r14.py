"""Rebuild loop status after round 14 from the stopped workflow's journal.

Round 14's R08 candidate (assembled-0428) was reverted because the baseline still
carried R08.10 as a pass frozen from assembled-0408, while assembled-0419 itself
measures .829 (fail): the posed refit had moved with the head. Measured results are
now re-read from the adopted packet, and the pose is cached per body component.
"""
import json
import math

REPO = 'C:/dev/src/xalians-akinza-loop/'
L = REPO + 'docs/design/species-construction/akinza/loop/'
P = REPO + 'untracked/species-construction/akinza/loop/packets/'
J = 'C:/Users/njord/.claude/projects/c--dev-src-Xalians/f0532f7e-7c4a-4de8-a1ff-d63721d93567/subagents/workflows/wf_507975db-01a/journal.jsonl'
HEAD = ('R01', 'R02', 'R03', 'R04')

S = json.load(open(L + 'status.json', encoding='utf-8'))
R = json.load(open(L + 'rubric.json', encoding='utf-8'))
IDS = list(S['regions'])
labels, res = {}, {}
for line in open(J, encoding='utf-8'):
    e = json.loads(line)
    if e.get('type') == 'started':
        labels[e['key']] = e['label']
    if e.get('type') == 'result':
        res[labels.get(e['key'])] = e['result']


def credit(r):
    return 1 if r == 'pass' else .5 if r == 'partial' else 0


def score(results, rid):
    crits = R['regions'][rid]
    return math.floor(100 * sum(credit(results[c['id']]) for c in crits) / len(crits) + .5) / 10


def mean(sc):
    return round(sum(S['regions'][i]['weight'] * sc[i] for i in IDS) / sum(S['regions'][i]['weight'] for i in IDS), 3)


measured = {c['id']: rid for rid, cs in R['regions'].items() for c in cs if c['kind'] == 'measured'}

# The round 13 baseline as it actually measures: body measured criteria from its own packet.
m19 = json.load(open(P + 'assembled-0419/measured.json'))
for cid, rid in measured.items():
    if cid in m19 and rid not in HEAD:
        S['regions'][rid]['results'][cid] = m19[cid]['result']
before = {i: score(S['regions'][i]['results'], i) for i in IDS}

# Round 14 body order: visual results from the critic, measured from the candidate packet.
crit = res['critic r14 body: assembled-0428']
results = {i: dict(S['regions'][i]['results']) for i in IDS}
for c in crit['criteria']:
    rid = c['id'].split('.')[0]
    if rid not in HEAD:
        results[rid][c['id']] = c['result']
m28 = json.load(open(P + 'assembled-0428/measured.json'))
for cid, rid in measured.items():
    if cid in m28 and rid not in HEAD:
        results[rid][cid] = m28[cid]['result']
after = {i: score(results[i], i) for i in IDS}
print('baseline as measured', before, mean(before))
print('round 14 candidate  ', after, mean(after))
assert after['R08'] > before['R08'] and all(after[i] >= before[i] for i in IDS)

for i in IDS:
    S['regions'][i]['results'], S['regions'][i]['score'] = results[i], after[i]
issues = [x for x in crit.get('issues', []) if x.get('region') == 'R08'][:3]
if issues:
    S['regions']['R08']['issues'] = issues
S['invariants'] = {x['id']: x['ok'] for x in crit['invariants']}
b = res['builder r14 body: R08']
S['baseline'] = {'head': S['baseline']['head'], 'body': b['body'], 'assembly': b['assembly'], 'packet': P + b['assembly']}
r = S['regions']['R08']
r['history'].append({'round': 14, 'kept': True, 'approach': b.get('approach', ''),
                     'reason': 'kept after re-reading the baseline measurements from its own packet (R08.10 had been frozen as a pass)',
                     'reusable': b.get('reusable', [])})
r['lastWorked'] = 14
r['attempts'] = (r.get('attempts') or 0) + 1
if r['score'] - (r.get('anchorScore') or 0) >= S['limits']['stallGain']:
    r['anchorScore'], r['attempts'] = r['score'], 0
S['round'] = 14
S['lastOrders'].append('R08')
S['notes'].append('2026-10-01: stopped at the start of round 15. Round 14 R08 (assembled-0428) was reverted against a stale frozen R08.10; measured results are now re-read from the adopted packet, the posed pose and joints are cached per body component (pose-cache/<body>), and R08 is adopted.')
json.dump(S, open(L + 'status.json', 'w', encoding='utf-8', newline='\n'), indent=1, ensure_ascii=False)

rec = json.load(open(L + 'rounds/round-14.json', encoding='utf-8'))
for o in rec['orders']:
    o['kept'] = True
    o['reason'] = 'kept after re-reading the baseline measurements from its own packet (R08.10 had been frozen as a pass)'
rec['baseline'], rec['scores'], rec['mean'] = S['baseline'], after, mean(after)
rec['note'] = 'Recorded first as reverted; adopted after the stale measurement was found.'
json.dump(rec, open(L + 'rounds/round-14.json', 'w', encoding='utf-8', newline='\n'))
print(S['baseline'])
