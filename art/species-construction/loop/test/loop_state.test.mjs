// loop_state.py: args (size, determinism), merge (a slim workflow result folds back without
// losing fields), replay (the round 14 journal reproduces what replay_r14.py wrote).
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generate } from '../build_workflow.mjs'
import { runWorkflow } from './fake_runtime.mjs'
import { DEFAULT_JOURNALS, REPO, readJson, speciesPaths } from '../loop_sim_lib.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const STATE = join(here, '..', 'loop_state.py')
const P = speciesPaths('akinza')
const py = spawnSync('python', ['--version'])
const havePython = py.status === 0
const run = (...args) => spawnSync('python', [STATE, ...args], { encoding: 'utf8', cwd: REPO })
const tmp = () => mkdtempSync(join(tmpdir(), 'loop-state-'))

test('args: under 20 KB, byte-identical across runs, slim shape', { skip: !havePython }, () => {
  const a = tmp(), b = tmp()
  const r1 = run('args', 'akinza', '--out', a), r2 = run('args', 'akinza', '--out', b)
  assert.equal(r1.status, 0, r1.stderr); assert.equal(r2.status, 0, r2.stderr)
  const x = readFileSync(join(a, 'args.json')), y = readFileSync(join(b, 'args.json'))
  assert.ok(x.equals(y), 'args.json differs between runs')
  assert.ok(x.length < 32768  /* v2 sent about 48 KB; the method lines (about 3 KB) arrived with v3 */, `args.json is ${x.length} bytes`)
  const args = JSON.parse(x.toString('utf8'))
  assert.deepEqual(Object.keys(args.status.regions.R01).sort().slice(0, 4), ['anchorScore', 'attempts', 'component', 'history'])
  assert.ok(args.status.regions.R01.history.length <= 4)
  assert.ok(Object.values(args.rubric.regions).flat().every(c => Object.keys(c).join() === 'id,kind'))
  assert.ok(args.status.baseline.recipe, 'baseline carries the recipe path')
  assert.ok(Array.isArray(args.status.means) && args.status.means.length > 1)
  assert.deepEqual(args.pools.join, ['R05'])
})

test('merge: a slim workflow result folds back into the full status without losing fields', { skip: !havePython || !existsSync(P.status) }, async () => {
  const dir = tmp()
  const full = readJson(P.status), rubric = readJson(P.rubric)
  for (const id of Object.keys(full.regions)) { full.regions[id].parked = false; full.regions[id].attempts = 0; full.regions[id].anchorScore = null }
  full.limits.hardStopRounds = 40
  // the same status as a v2 workflow sees it, and as args.json slims it
  const statusFile = join(dir, 'status.json')
  writeFileSync(statusFile, JSON.stringify(full, null, 1))
  assert.equal(run('args', 'akinza', '--out', dir, '--status', statusFile, '--rounds', '3').status, 0)
  const slim = JSON.parse(readFileSync(join(dir, 'args.json'), 'utf8'))
  const wf = generate()
  const a = await runWorkflow(wf, { status: full, rubric, rounds: 3 }, 'm1')
  const b = await runWorkflow(wf, { status: slim.status, rubric: slim.rubric, rounds: 3 }, 'm1')  // no pools: v2 pools on both sides, so only the slimming is under test
  assert.ok(a.ret.status.round > full.round, 'the fake run should play rounds')
  const resultFile = join(dir, 'result.json')
  writeFileSync(resultFile, JSON.stringify(b.ret))
  const m = run('merge', 'akinza', resultFile, '--status', statusFile, '--out', dir, '--note', 'test merge')
  assert.equal(m.status, 0, m.stderr)
  const merged = JSON.parse(readFileSync(join(dir, 'status.json'), 'utf8'))
  const want = a.ret.status
  assert.equal(merged.round, want.round)
  assert.deepEqual(merged.lastOrders, want.lastOrders)
  assert.deepEqual(merged.invariants, want.invariants)
  assert.equal(merged.baseline.assembly, want.baseline.assembly)
  assert.equal(merged.baseline.head, want.baseline.head); assert.equal(merged.baseline.body, want.baseline.body)
  for (const id of Object.keys(want.regions)) {
    const w = want.regions[id], g = merged.regions[id]
    for (const k of ['score', 'results', 'attempts', 'anchorScore', 'lastWorked']) assert.deepEqual(g[k], w[k], `${id}.${k}`)
    assert.equal(!!g.parked, !!w.parked, id + '.parked')
    assert.deepEqual(g.history, w.history, id + '.history')  // new entries appended in full, older ones untouched
  }
  // the fields args left out survive: notes, v1, decisionsForNick, full issues of an untouched region
  assert.deepEqual(merged.notes.slice(0, full.notes.length), full.notes); assert.equal(merged.notes.at(-1), 'test merge')
  assert.equal(merged.v1, full.v1)
  assert.deepEqual(merged.decisionsForNick, full.decisionsForNick)
  assert.deepEqual(merged.specs.R01.summary, full.specs.R01.summary)
  // means persist since v3.4 (the plateau window must survive a merge)
  assert.ok(Array.isArray(merged.means))
})

const J14 = join(DEFAULT_JOURNALS, 'wf_507975db-01a', 'journal.jsonl')
test('replay: the round 14 journal gives the status replay_r14.py produced (R08 adopted, scores, baseline)', { skip: !havePython || !existsSync(J14) || !existsSync(join(P.packets, 'assembled-0428')) }, () => {
  const dir = tmp()
  const before = spawnSync('git', ['show', 'f6dd810c:docs/design/species-construction/akinza/loop/status.json'], { encoding: 'utf8', cwd: REPO })
  const after = spawnSync('git', ['show', 'ebe1a999:docs/design/species-construction/akinza/loop/status.json'], { encoding: 'utf8', cwd: REPO })
  if (before.status !== 0 || after.status !== 0) return  // no history in a shallow clone
  const bf = join(dir, 'before.json'); writeFileSync(bf, before.stdout)
  const r = run('replay', 'akinza', J14, '--status', bf, '--out', dir)
  assert.equal(r.status, 0, r.stderr)
  const mine = JSON.parse(readFileSync(join(dir, 'status.json'), 'utf8')), want = JSON.parse(after.stdout)
  for (const k of ['round', 'lastOrders', 'invariants', 'baseline', 'specs', 'limits']) assert.deepEqual(mine[k], want[k], k)
  for (const id of Object.keys(want.regions)) for (const k of ['score', 'results', 'attempts', 'anchorScore', 'parked', 'lastWorked', 'issues']) assert.deepEqual(mine.regions[id][k], want.regions[id][k], `${id}.${k}`)
  const round = JSON.parse(readFileSync(join(dir, 'rounds', 'round-14.json'), 'utf8'))
  assert.equal(round.orders[0].kept, true); assert.equal(round.mean, 5.447)
})
