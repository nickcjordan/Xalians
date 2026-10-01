// node --test art/species-construction/loop/test/
// Core rules, the build check, and a differential run of the generated workflow against the
// frozen v2 workflow (test/fixtures/loop_workflow.v2.js) with a deterministic fake agent.
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as core from '../loop_core.js'
import { build, generate } from '../build_workflow.mjs'
import { loadRounds, speciesPaths, readJson } from '../loop_sim_lib.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const loopDir = join(here, '..')
const P = speciesPaths('akinza')
const LIMITS = { passBar: 8, cooldownRounds: 2, stallAttempts: 3, stallGain: 1, keepGain: 0.5, regressionDrop: 1, roundsPerBatch: 4, hardStopRounds: 16,
  gate: { minRegion: 7, weightedMean: 8, identityRegions: ['R01', 'R02', 'R03'], identityMin: 8 }, meanGain: 0.025, coverageRounds: 6 }

// A small synthetic species: R01-R04 head, R05-R11 body, R12 whole figure, eight criteria each (the last two measured).
const IDS12 = Array.from({ length: 12 }, (_, i) => 'R' + String(i + 1).padStart(2, '0'))
const rubric = { regions: Object.fromEntries(IDS12.map(id => [id, Array.from({ length: 8 }, (_, n) => ({ id: `${id}.${n + 1}`, kind: n >= 6 ? 'measured' : 'visual' }))])) }
// R(p, q): p criteria pass, q partial, the rest fail.
const R = (p, q = 0) => Array.from({ length: 8 }, (_, i) => i < p ? 'pass' : i < p + q ? 'partial' : 'fail')
function mkState(over) {
  const regions = {}
  IDS12.forEach((id, i) => {
    const results = Object.fromEntries(rubric.regions[id].map(c => [c.id, 'fail']))
    regions[id] = { name: id, weight: [3, 2, 2, 2, 1, 2, 2, 2.5, 1, 1, 1, 1][i], results, score: core.scoreFrom(rubric, results, id), issues: [], history: [], lastWorked: null, anchorScore: null, attempts: 0, parked: false }
  })
  const S = { limits: LIMITS, regions, lastOrders: [], invariants: { I01: true }, baseline: { head: 'head-1', body: 'body-1', assembly: 'assembled-1', packet: 'p1' }, round: 0 }
  return Object.assign(S, over)
}
const setResults = (S, id, list) => { rubric.regions[id].forEach((c, i) => { S.regions[id].results[c.id] = list[i] }); S.regions[id].score = core.scoreFrom(rubric, S.regions[id].results, id) }
const crit = (map, extra) => ({ criteria: Object.entries(map).flatMap(([id, list]) => rubric.regions[id].map((c, i) => ({ id: c.id, result: list[i], evidence: '' }))), invariants: [{ id: 'I01', ok: true, evidence: '' }], issues: [], summary: '', ...extra })
const better = region => [{ region, verdict: 'better', reason: '' }]
const setScores = (S, scores) => { for (const id of IDS12) S.regions[id].score = scores[id] ?? 9 }

test('credit and rounding follow v2 (Math.round(x*10)/10 on a 0..10 scale)', () => {
  assert.equal(core.credit('pass'), 1); assert.equal(core.credit('partial'), 0.5); assert.equal(core.credit('fail'), 0)
  const r = { regions: { A: Array.from({ length: 8 }, (_, i) => ({ id: `A.${i}` })) } }
  const res = Object.fromEntries(r.regions.A.map((c, i) => [c.id, i < 5 ? 'pass' : i < 6 ? 'partial' : 'fail']))
  assert.equal(core.scoreFrom(r, res, 'A'), 6.9)  // 5.5 / 8 = .6875 -> 68.75 -> 69
  const q = { regions: { A: Array.from({ length: 4 }, (_, i) => ({ id: `A.${i}` })) } }
  assert.equal(core.scoreFrom(q, { 'A.0': 'partial', 'A.1': 'fail', 'A.2': 'fail', 'A.3': 'fail' }, 'A'), 1.3)  // .125 -> 12.5 -> 13 (JS rounds half up)
  assert.equal(core.scoreFrom(q, { 'A.0': 'pass' }, 'A'), null)  // an unjudged criterion gives no score
})

test('scores and weighted means reproduce the recorded round 16 and the round 1 rescore', { skip: !existsSync(P.rounds) }, () => {
  const S = readJson(P.status)
  const r16 = readJson(join(P.rounds, 'round-16.json'))
  assert.equal(core.meanOf(S, r16.scores), r16.mean)
  const r1 = readJson(join(P.rounds, 'round-01-rescore.json'))
  assert.equal(core.meanOf(S, r1.scores), r1.mean)
  // the adopted status is internally consistent: every score is the score of its results under the current rubric
  const rub = readJson(P.rubric)
  for (const id of Object.keys(S.regions)) assert.equal(core.scoreFrom(rub, S.regions[id].results, id), S.regions[id].score, id)
})

test('the cold rescore of assembled-0226 scores as recorded (needs the untracked packet)', { skip: !existsSync(join(P.packets, 'assembled-0226', 'critique-rescore.json')) }, () => {
  const S = readJson(P.status), rub = readJson(P.rubric)
  const c = readJson(join(P.packets, 'assembled-0226', 'critique-rescore.json'))
  const m = JSON.parse(readFileSync(join(P.packets, 'assembled-0226', 'measured.json'), 'utf8'))
  const res = core.resultsAfter(S, core.overlayMeasured(rub, c, m), Object.fromEntries(Object.keys(S.regions).map(i => [i, {}])))
  const r1 = readJson(join(P.rounds, 'round-01-rescore.json'))
  // R09 and R11 differ by a later rubric revision (R09.6 and R09.7), so they are left out
  for (const id of ['R01', 'R02', 'R03', 'R04', 'R05', 'R06', 'R07', 'R08', 'R10', 'R12']) assert.equal(core.scoreFrom(rub, res[id], id), r1.scores[id], id)
})

test('round 2 debt: a side-effect loss within regressionDrop is kept when the mean rises, and becomes an issue', () => {
  const S = mkState()
  setResults(S, 'R01', R(0)); setResults(S, 'R02', R(8))
  const critique = crit({ R01: R(4), R02: R(7, 1) }, { pairwise: better('R01') })  // R02 10 -> 9.4, a .6 loss
  const d = core.judge(S, rubric, LIMITS, { id: 'R01', component: 'head' }, {}, critique)
  assert.equal(d.kept, true, d.reasons.join('; '))
  assert.deepEqual(d.debts.map(x => x.region), ['R02'])
  core.adopt(S, d, { assembly: 'a2', packet: 'p2', head: 'head-2' }, { ...critique, issues: [] }, 'head')
  assert.match(S.regions.R02.issues[0].summary, /Repay a side-effect loss/)
  assert.equal(S.baseline.head, 'head-2'); assert.equal(S.baseline.body, 'body-1'); assert.equal(S.baseline.assembly, 'a2')
})

test('a loss in two regions, or beyond regressionDrop, reverts', () => {
  const S = mkState()
  for (const id of ['R01', 'R02', 'R06']) setResults(S, id, R(8))
  setResults(S, 'R01', R(7))
  const two = core.judge(S, rubric, LIMITS, { id: 'R01', component: 'both' }, {}, crit({ R01: R(8), R02: R(7, 1), R06: R(7, 1) }, { pairwise: better('R01') }))
  assert.equal(two.kept, false)
  assert.match(two.reasons.join(';'), /lost credit in R02/)
  const S2 = mkState(); setResults(S2, 'R01', R(0)); setResults(S2, 'R02', R(8))
  const big = core.judge(S2, rubric, LIMITS, { id: 'R01', component: 'both' }, {}, crit({ R01: R(8), R02: R(4) }, { pairwise: better('R01') }))
  assert.equal(big.kept, false)  // R02 10 -> 5 is a 5 point drop, more than regressionDrop
})

test('round 11: a clean visible improvement with no criterion moving is kept on the critic verdict', () => {
  const S = mkState(); setResults(S, 'R01', R(1))
  const same = crit({ R01: R(1) }, { pairwise: better('R01') })
  const d = core.judge(S, rubric, LIMITS, { id: 'R01', component: 'head' }, {}, same)
  assert.equal(d.kept, true); assert.equal(d.keptOnVerdict, true)
  // but not when the verdict is only "same", or an invariant newly broke
  assert.equal(core.judge(S, rubric, LIMITS, { id: 'R01', component: 'head' }, {}, { ...same, pairwise: [{ region: 'R01', verdict: 'same', reason: '' }] }).kept, false)
  assert.equal(core.judge(S, rubric, LIMITS, { id: 'R01', component: 'head' }, {}, { ...same, invariants: [{ id: 'I01', ok: false, evidence: '' }] }).kept, false)
  // nor when a region lost credit
  setResults(S, 'R06', R(8))
  assert.equal(core.judge(S, rubric, LIMITS, { id: 'R01', component: 'both' }, {}, crit({ R01: R(1), R06: R(7, 1) }, { pairwise: better('R01') })).kept, false)
})

test('round 13: the component an order did not touch keeps its results (a pose refit cannot cost it credit)', () => {
  const S = mkState()
  setResults(S, 'R06', R(8)); setResults(S, 'R01', R(0))
  const critique = crit({ R01: R(8), R06: R(1) }, { pairwise: better('R01') })
  const head = core.judge(S, rubric, LIMITS, { id: 'R01', component: 'head' }, {}, critique)
  assert.equal(head.after.R06, 10); assert.equal(head.kept, true)
  const both = core.judge(S, rubric, LIMITS, { id: 'R01', component: 'both' }, {}, critique)
  assert.equal(both.after.R06, 1.3)  // no freezing for a whole-figure order
  const body = core.judge(S, rubric, LIMITS, { id: 'R06', component: 'body' }, {}, critique)
  assert.equal(body.after.R01, 0)  // a body order freezes the head regions
})

test('a head order also freezes the join pool; a join order freezes nothing', () => {
  const pools = core.defaultPools({ head: ['R01', 'R02'], body: ['R06', 'R07'], join: ['R05'], both: ['R12'] })
  const S = mkState(); setResults(S, 'R05', R(8)); setResults(S, 'R06', R(8))
  const critique = crit({ R01: R(8), R05: R(0) }, { pairwise: better('R01') })
  assert.equal(core.judge(S, rubric, LIMITS, { id: 'R01', component: 'head' }, {}, critique, { pools }).after.R05, 10)
  const j = core.judge(S, rubric, LIMITS, { id: 'R05', component: 'join' }, {}, crit({ R05: R(8), R06: R(0) }, { pairwise: better('R05') }), { pools })
  assert.equal(j.after.R06, 0)
})

test('side-effect carry: a non-target region below the threshold keeps its visual results; measured criteria still move', () => {
  const S = mkState(); setResults(S, 'R06', R(8)); setResults(S, 'R01', R(0))
  const critique = crit({ R01: R(8), R06: R(0) }, { pairwise: better('R01') })
  const diff = { regionChange: { R01: 0.05, R02: 0.01, R05: 0, R06: 0.0004, R07: 0, R12: 0.003 } }
  const none = core.judge(S, rubric, LIMITS, { id: 'R01', component: 'both' }, {}, critique, { diff })  // no threshold: v2 behaviour
  assert.equal(none.after.R06, 0)
  const carried = core.judge(S, rubric, LIMITS, { id: 'R01', component: 'both' }, {}, critique, { diff, threshold: 0.002 })
  assert.ok(['R05', 'R06', 'R07'].every(id => carried.carried.includes(id)))
  assert.equal(carried.after.R06, 7.5)  // six visual criteria carried, the two measured ones are the critic's copy (fail)
  assert.equal(core.judge(S, rubric, LIMITS, { id: 'R01', component: 'both' }, {}, critique, { diff, threshold: 0.0001 }).after.R06, 0)
  assert.deepEqual(core.sideEffectRegions(diff, 'R01', 0.002).sort(), ['R02', 'R12'])
  // older packets: derive the magnitude from changedPixelFraction and the region image map
  const old = { changedPixelFraction: { m04: 0.06, m05: 0.0001, m06: 0.0006 } }
  assert.deepEqual(core.sideEffectRegions(old, 'R01', 0.002, { R01: ['m04'], R02: ['m05'], R06: ['m06'] }), [])
  assert.deepEqual(core.sideEffectRegions(old, 'R01', 0.0005, { R01: ['m04'], R02: ['m05'], R06: ['m06'] }), ['R06'])
})

test('overlayMeasured replaces the critic\'s copy of measured criteria with the packet\'s', () => {
  const c = crit({ R06: R(8) })
  const o = core.overlayMeasured(rubric, c, { 'R06.8': { result: 'fail' } })
  assert.equal(o.criteria.find(x => x.id === 'R06.8').result, 'fail')
  assert.equal(o.criteria.find(x => x.id === 'R06.1').result, 'pass')
  assert.equal(core.overlayMeasured(rubric, c, null), c)
})

test('stall bookkeeping parks a region after stallAttempts orders without stallGain', () => {
  const r = { score: 3, anchorScore: null, attempts: 0, lastWorked: null }
  core.updateStall(r, 1, LIMITS); core.updateStall(r, 2, LIMITS)
  assert.equal(r.parked, undefined); assert.equal(r.anchorScore, 3)
  core.updateStall(r, 3, LIMITS)
  assert.equal(r.parked, true); assert.match(r.parkReason, /3 rounds without a net gain of 1/); assert.equal(r.lastWorked, 3)
  const g = { score: 3, anchorScore: 1.5, attempts: 2, lastWorked: null }  // a net gain of 1.5 resets the anchor and the count
  core.updateStall(g, 4, LIMITS)
  assert.equal(g.attempts, 0); assert.equal(g.anchorScore, 3); assert.equal(g.parked, undefined)
})

test('plateau: the last three round means gained less than .15 together', () => {
  assert.equal(core.plateau({ means: [3, 3.5, 4] }, LIMITS), false)  // fewer than four means
  assert.equal(core.plateau({ means: [4.7, 4.9, 5.0, 5.1] }, LIMITS), false)  // +.4
  assert.equal(core.plateau({ means: [4.9, 5.0, 5.05, 5.1] }, LIMITS), false)  // +.2
  assert.equal(core.plateau({ means: [4.9, 5.0, 5.02, 5.04] }, LIMITS), true)  // +.14
  assert.equal(core.plateau({ means: [1, 5.0, 5.02, 5.04, 5.05] }, LIMITS), true)  // only the last three gains count
  assert.equal(core.plateau({ means: [5, 5, 5, 5.2] }, { ...LIMITS, plateauRounds: 3, plateauGain: 0.25 }), true)
  assert.equal(core.plateau({ means: [] }, LIMITS), false)
  // v2 history: rounds 7 to 9 gained .128, so the rule stops the run after round 9 where v2 ran on to round 16
  assert.equal(core.plateau({ means: [4.71, 4.993, 5.121, 5.121, 5.121] }, LIMITS), true)
})

test('pickOrders: v2 pools without a config, species pools with one, a join slot beside a body order', () => {
  const S = mkState()
  setScores(S, { R01: 2, R05: 1, R06: 2 })
  const v2 = core.pickOrders(S, LIMITS, 1)  // default pools: R01-R04 head, R05-R11 body, R12 both
  assert.deepEqual(v2.map(o => o.component + ' ' + o.id), ['head R01', 'body R06'])  // R06 weight 2 x (8-2) outranks R05 weight 1 x (8-1)
  const pools = core.defaultPools({ head: ['R01', 'R02'], body: ['R06', 'R07'], join: ['R05'], both: ['R12'] })
  const picked = core.pickOrders(S, LIMITS, 1, pools)
  assert.equal(picked.length, 2)  // three slots (head R01, body R06, join R05), the cap keeps the two highest priorities
  assert.ok(!picked.some(o => o.component === 'join'))
  setScores(S, { R05: 1, R06: 2, R01: 9 })  // the head pool is done
  const withJoin = core.pickOrders(S, LIMITS, 1, pools)
  assert.deepEqual(withJoin.map(o => o.component + ' ' + o.id).sort(), ['body R06', 'join R05'])
  // a region in two pools is worked once: the join slot has it, the body slot takes the next
  const shared = core.defaultPools({ head: ['R01'], body: ['R05', 'R06'], join: ['R05'], both: [] })
  const sh = core.pickOrders(S, LIMITS, 1, shared)
  assert.deepEqual(sh.map(o => o.component + ' ' + o.id).sort(), ['body R06', 'join R05'])
  // a whole-figure region wins only when it outranks every slot
  S.regions.R12.score = 0; S.regions.R12.weight = 40
  assert.deepEqual(core.pickOrders(S, LIMITS, 1, core.defaultPools({ head: ['R01'], body: ['R06'], join: [], both: ['R12'] })).map(o => o.component), ['both'])
  S.regions.R12.score = 9
  // cooldown: a region worked in each of the last cooldownRounds orders sits out
  S.lastOrders = ['R06', 'R06+R01']
  assert.ok(!core.pickOrders(S, LIMITS, 1, shared).some(o => o.id === 'R06'))
  // a parked region is never picked
  S.lastOrders = []; S.regions.R06.parked = true
  assert.ok(!core.pickOrders(S, LIMITS, 1, shared).some(o => o.id === 'R06'))
  // an idle region past coverageRounds jumps the queue
  S.regions.R06.parked = false; S.regions.R07.score = 7.9; S.regions.R07.lastWorked = 1; S.regions.R06.lastWorked = 6
  assert.equal(core.pickOrders(S, LIMITS, 8, core.defaultPools({ head: [], body: ['R06', 'R07'], join: [], both: [] }))[0].id, 'R07')
})

test('gateMet needs every region, the weighted mean and the identity regions', () => {
  const S = mkState()
  for (const id of Object.keys(S.regions)) S.regions[id].score = 8.5
  assert.equal(core.gateMet(S, LIMITS), true)
  S.regions.R05.score = 6.9; assert.equal(core.gateMet(S, LIMITS), false)
  S.regions.R05.score = 8.5; S.regions.R01.score = 7.9; assert.equal(core.gateMet(S, LIMITS), false)
})

// ---- the build check and the generated workflow ----------------------------------------

test('build: strips exports, inlines once at the //@core marker, keeps meta first', () => {
  const out = build('export const meta = {\n  name: "x",\n}\nconst a = 1\n//@core\nreturn 1\n', 'export const f = 1\nexport function g() {}\nexport async function h() {}\n')
  assert.ok(out.startsWith('export const meta = {'))
  assert.ok(!/^export (const f|function g|async function h)/m.test(out))
  assert.match(out, /const f = 1\nfunction g\(\) \{\}\nasync function h\(\) \{\}/)
  assert.throws(() => build('export const meta = {\n}\nno marker\n', 'export const f = 1\n'), /exactly one/)
  assert.throws(() => build('export const meta = {\n}\n//@core\n', 'import x from "y"\n'), /cannot strip/)
})

test('loop_workflow.js is current (generated from loop_workflow.src.js and loop_core.js)', () => {
  assert.equal(readFileSync(join(loopDir, 'loop_workflow.js'), 'utf8').replace(/\r\n/g, '\n'), generate())
})

// Run a workflow script the way the runtime does: top-level await and return, with args, agent, parallel, phase, log.
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
function fnv(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0 } return h >>> 0 }
function fakeRuntime(args, seed) {
  const calls = [], logs = []
  const rub = args.rubric
  const agent = async (prompt, opts) => {
    const label = opts.label
    calls.push({ label, model: opts.model, effort: opts.effort, prompt })
    const h = fnv(seed + label)
    if (label.startsWith('builder')) {
      if (h % 7 === 0) return { failed: true, reason: 'fake failure', changes: '', approach: '' }
      const n = h % 1000
      return { failed: false, head: 'head-' + n, body: 'body-' + n, assembly: 'assembled-' + n, packet: 'p/assembled-' + n, technicalPass: true, approach: 'approach ' + label, changes: 'changes', reusable: [{ option: 'o' + n, what: 'w' }] }
    }
    if (label.startsWith('combine')) { const n = 1000 + h % 1000; return { failed: h % 5 === 0, head: 'head-c' + n, body: 'body-c' + n, assembly: 'assembled-' + n, packet: 'p/assembled-' + n, technicalPass: true, approach: 'combine', changes: 'c' } }
    if (label.startsWith('spec')) return { path: 'specs/x.md', summary: 'spec' }
    if (label.startsWith('record')) return 'done'
    if (label.startsWith('critic')) {
      const m = /Target region: (R\d+)/.exec(opts && prompt)
      const target = m ? m[1] : null
      const criteria = []
      for (const [id, crits] of Object.entries(rub.regions)) for (const c of crits) {
        const k = fnv(seed + label + c.id) % 100
        const r = id === target ? (k < 70 ? 'pass' : k < 85 ? 'partial' : 'fail') : (k < 50 ? 'pass' : k < 75 ? 'partial' : 'fail')
        criteria.push({ id: c.id, result: r, evidence: '' })
      }
      const pairwise = target ? [{ region: target, verdict: h % 10 < 8 ? 'better' : 'same', reason: '' }] : []
      return { criteria, pairwise, invariants: [{ id: 'I01', ok: true, evidence: '' }, { id: 'I05', ok: h % 9 !== 0, evidence: '' }], issues: target ? [{ region: target, summary: 'issue ' + label, fix: 'fix', fixability: 0.6 }] : [], readyForDesigner: h % 4 === 0, summary: 'critic ' + label }
    }
    return null
  }
  return { agent, parallel: fns => Promise.all(fns.map(f => f())), phase: () => {}, log: m => logs.push(m), calls, logs }
}
async function runWorkflow(text, args, seed) {
  const rt = fakeRuntime(args, seed)
  const body = text.replace(/^export const meta =/m, 'const meta =')
  const fn = new AsyncFunction('args', 'agent', 'parallel', 'phase', 'log', body)
  const ret = await fn(JSON.parse(JSON.stringify(args)), rt.agent, rt.parallel, rt.phase, rt.log)
  return { ret, calls: rt.calls, logs: rt.logs }
}

test('the generated workflow behaves exactly like the frozen v2 workflow on v2 args', { skip: !existsSync(P.status) }, async () => {
  const status = readJson(P.status), rub = readJson(P.rubric)
  const specs = JSON.parse(JSON.stringify(status.specs))
  // un-park everything and open the batch so several rounds run: keeps, reverts, builder failures and combinations all occur
  for (const id of Object.keys(status.regions)) { status.regions[id].parked = false; status.regions[id].attempts = 0; status.regions[id].anchorScore = null }
  status.limits.hardStopRounds = 40
  const v2 = readFileSync(join(here, 'fixtures', 'loop_workflow.v2.js'), 'utf8')
  const v3 = generate()
  let kept = 0, reverted = 0, combined = 0
  for (const seed of ['a', 'b', 'c', 'd', 'e']) {
    const args = { status: JSON.parse(JSON.stringify({ ...status, specs })), rubric: rub, rounds: 5 }
    const x = await runWorkflow(v2, args, seed), y = await runWorkflow(v3, args, seed)
    assert.deepEqual(y.ret, x.ret, 'result ' + seed)
    assert.deepEqual(y.logs, x.logs, 'log ' + seed)
    assert.deepEqual(y.calls, x.calls, 'agent calls and prompts ' + seed)
    for (const l of x.logs) { kept += (l.match(/KEPT/g) || []).length; reverted += (l.match(/reverted/g) || []).length; if (/combine/.test(l)) combined++ }
  }
  assert.ok(kept > 0 && reverted > 0, `the fake runs should exercise both outcomes (kept ${kept}, reverted ${reverted}, combination notes ${combined})`)
})

test('v3 args with species pools run the generated workflow (join slot, default pools untouched)', { skip: !existsSync(P.status) }, async () => {
  const status = readJson(P.status), rub = readJson(P.rubric)
  for (const id of Object.keys(status.regions)) { status.regions[id].parked = false }
  status.limits.hardStopRounds = 40
  const args = { status, rubric: rub, rounds: 2, pools: { head: ['R01', 'R02', 'R03', 'R04'], body: ['R05', 'R06', 'R07', 'R08', 'R09', 'R10', 'R11'], join: ['R05'], both: ['R12'] } }
  const out = await runWorkflow(generate(), args, 'j')
  assert.ok(out.logs.some(l => /join R05/.test(l)) || out.logs.some(l => /Round 1/.test(l)))
})
