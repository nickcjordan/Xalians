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
import { speciesPaths, readJson } from '../loop_sim_lib.mjs'
import { runWorkflow } from './fake_runtime.mjs'

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
  // R09 and R11 differ by a later rubric revision (R09.6 and R09.7), and R06 by the 2026-10-02 trunk
  // profile criteria (R06.11 to R06.16), so they are left out
  for (const id of ['R01', 'R02', 'R03', 'R04', 'R05', 'R07', 'R08', 'R10', 'R12']) assert.equal(core.scoreFrom(rub, res[id], id), r1.scores[id], id)
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

// The v2 differential test (generated workflow equal to test/fixtures/loop_workflow.v2.js) held
// until the v3 workflow changes landed on 2026-10-01; the fixture stays as the v2 record. These
// tests pin the v3 behaviour with the same deterministic fake runtime.
function v3Args(status, rub, over) {
  for (const id of Object.keys(status.regions)) { if (!status.regions[id].hold) { status.regions[id].parked = false; status.regions[id].attempts = 0; status.regions[id].anchorScore = null } }
  status.limits.hardStopRounds = 60
  // the classic single builder unless a test asks for the split one
  status.limits.builderMode = over && over.split ? 'split' : 'single'
  return { status, rubric: rub, rounds: 6, species: { key: 'akinza', sideEffectThreshold: 0.0005 }, pools: { head: ['R01', 'R02', 'R03', 'R04'], body: ['R05', 'R06', 'R07', 'R08', 'R09', 'R10', 'R11'], join: ['R05'], both: ['R12'] }, ...over }
}
const okBuild = id => ({ failed: false, recipe: `recipes/r-${id}.json`, head: 'head-' + id, body: 'body-' + id, assembly: 'assembled-' + id, packet: 'p/' + id, technicalPass: true, approach: 'a', changes: 'c' })

test('v3 prepare: methods planned once, missing specs written in one parallel pass, held regions never ordered', { skip: !existsSync(P.status) }, async () => {
  const status = readJson(P.status), rub = readJson(P.rubric)
  status.methods = {}
  for (const id of ['R10', 'R11']) status.regions[id].hold = true
  const out = await runWorkflow(generate(), v3Args(status, rub), 'p')
  const labels = out.calls.map(c => c.label)
  assert.equal(labels.filter(l => l.startsWith('methods')).length, 1)
  assert.ok(!labels.some(l => l.startsWith('audit assembled')), 'an existing audit is not redone in Prepare without freshAudit')
  // R05 came back respec: its spec is rewritten in the prepare pass
  assert.ok(labels.includes('spec: R05'))
  assert.ok(!labels.some(l => /^(builder|spec).*R1[01]\b/.test(l)), 'held tails get no spec and no order')
  assert.ok(out.logs.some(l => /^Methods: .*R04 NEW/.test(l)), 'the plan marks R04 new')
  assert.ok(out.logs.some(l => l.startsWith('Methods: ')))
})

test('v3 kickoff: a fresh audit logs the ranked gap list and returns it', { skip: !existsSync(P.status) }, async () => {
  const status = readJson(P.status), rub = readJson(P.rubric)
  const out = await runWorkflow(generate(), v3Args(status, rub, { freshAudit: true, rounds: 1 }), 'k')
  assert.deepEqual(out.ret.kickoff.map(g => g.region), ['R05', 'R06'])
  assert.ok(out.logs.some(l => l.startsWith('KICKOFF gaps')))
  assert.equal(out.ret.status.audit, 'docs/audit.md')
})

test('v3 critic scope: only regions past the side-effect threshold are named', { skip: !existsSync(P.status) }, async () => {
  const status = readJson(P.status), rub = readJson(P.rubric)
  status.methods = { R01: 'm' }
  const change = Object.fromEntries(Object.keys(rub.regions).map(id => [id, 0.0001]))
  change.R09 = 0.01
  change.R03 = 0.01
  const out = await runWorkflow(generate(), v3Args(status, rub, { rounds: 1 }), 's', label => {
    if (label.startsWith('builder')) { const id = /: (R\d+)/.exec(label)[1]; return { ...okBuild(id), regionChange: { ...change, [id]: 0.02 } } }
    return undefined
  })
  const critics = out.calls.filter(c => c.label.startsWith('critic r') && !c.label.includes('combined'))
  assert.ok(critics.length > 0)
  for (const c of critics) {
    const body = !c.label.includes(' head:')
    // R09 moved past the threshold: a body, join or whole-figure critic is told to judge it; a head order freezes the body, so a head critic is not
    if (body) assert.match(c.prompt, /these other regions[^.]*R09/)
    else assert.doesNotMatch(c.prompt, /these other regions[^.]*R09/)
    // R12 moved below the threshold: nobody is asked to judge it
    assert.doesNotMatch(c.prompt, /these other regions[^.]*R12/)
  }
})

test('v3 plateau: flat rounds trigger one method review, a second plateau stops the batch', { skip: !existsSync(P.status) }, async () => {
  const status = readJson(P.status), rub = readJson(P.rubric)
  status.methods = { R01: 'm' }
  const out = await runWorkflow(generate(), v3Args(status, rub, { rounds: 12 }), 'q', label => {
    // every candidate fails its build: no round gains anything
    if (label.startsWith('builder')) return { failed: true, reason: 'fake', changes: '', approach: '' }
    return undefined
  })
  assert.ok(out.logs.some(l => /plateau/.test(l)), 'the plateau escalation is logged')
  assert.ok(out.calls.some(c => c.label.startsWith('method review')))
  assert.equal(out.ret.milestone, 'plateau')
})

test('v3 combine: two kept orders are merged by recipe, not by component directories', { skip: !existsSync(P.status) }, async () => {
  const status = readJson(P.status), rub = readJson(P.rubric)
  status.methods = { R01: 'm' }
  status.regions.R12.hold = true
  let saw = null
  for (const seed of ['c1', 'c2', 'c3', 'c4', 'c5', 'c6']) {
    await runWorkflow(generate(), v3Args(status, rub, { rounds: 4 }), seed, (label, prompt) => {
      if (label.startsWith('builder')) return okBuild(/: (R\d+)/.exec(label)[1])
      if (label.startsWith('combine')) { saw = prompt; return { failed: true, reason: 'fake', changes: '', approach: 'combine' } }
      if (label.startsWith('critic r')) {
        // a clean candidate: the target's criteria all pass, nothing else is judged
        const id = /Target region: (R\d+)/.exec(prompt)[1]
        return { criteria: rub.regions[id].map(c => ({ id: c.id, result: 'pass', evidence: '' })), pairwise: [{ region: id, verdict: 'better', reason: '' }], invariants: [], issues: [], summary: '' }
      }
      return undefined
    })
    if (saw) break
  }
  assert.ok(saw, 'some fake run keeps two orders in one round')
  assert.match(saw, /recipe\.py merge/)
})

test('v3 effort trial: the first order gets a medium-effort twin, judged and recorded, never adopted', { skip: !existsSync(P.status) }, async () => {
  const status = readJson(P.status), rub = readJson(P.rubric)
  status.methods = { R01: 'm' }
  const out = await runWorkflow(generate(), v3Args(status, rub, { rounds: 2, effortTrial: true }), 't', label => {
    if (label.startsWith('builder')) { const id = /: (R\d+)/.exec(label)[1]; return { ...okBuild(id), assembly: 'assembled-' + id + (label.includes('trial') ? '-t' : '') } }
    return undefined
  })
  const twins = out.calls.filter(c => c.label.includes('(medium trial)'))
  assert.equal(twins.filter(c => c.label.startsWith('builder')).length, 1, 'one twin builder in the first round only')
  assert.equal(twins.find(c => c.label.startsWith('builder')).effort, 'medium')
  assert.match(twins.find(c => c.label.startsWith('builder')).prompt, /-medium\.json/)
  const rec = out.calls.find(c => c.label === 'record r' + (status.round + 1))
  assert.match(rec.prompt, /"effortTrial":\{"region":"R\d+","effort":"medium"/)
  assert.ok(!/-t"/.test(JSON.stringify(out.ret.status.baseline)), 'the twin is never adopted')
})

test('reopen: a region above the pass bar is ordered only when the audit reopened it, one point below the bar', () => {
  const S = mkState()
  setScores(S, { R02: 8.3, R03: 6.4 })
  S.regions.R02.issues = [{ fixability: 0.9 }]
  S.regions.R02.lastWorked = 16
  assert.equal(core.priority(S, LIMITS, 'R02', 17), null)
  S.regions.R02.reopen = true
  assert.equal(core.priority(S, LIMITS, 'R02', 17), Math.round(S.regions.R02.weight * 1 * 0.9 * 100) / 100)
})

test('v3 branch: a reverted candidate judged better is handed to the next order for its region, with the audit rows', { skip: !existsSync(P.status) }, async () => {
  const status = readJson(P.status), rub = readJson(P.rubric)
  status.methods = { R01: 'm' }
  for (const id of Object.keys(status.regions)) if (id !== 'R04') status.regions[id].hold = true
  status.auditGaps = [{ rank: 1, region: 'R04', gap: 'crumpled paper bowl from behind', structural: true }]
  status.regions.R04.history = []
  status.lastOrders = []
  status.limits.auditRefreshKept = 0
  status.limits.verdictKeep = false
  status.limits.freezeHeld = false  // the neighbour loss below sits in a held region
  const prompts = []
  await runWorkflow(generate(), v3Args(status, rub, { rounds: 3 }), 'b', (label, prompt) => {
    if (label.startsWith('builder')) { prompts.push(prompt); return { ...okBuild('R04'), recipe: `recipes/r${prompts.length}-R04.json` } }
    // better on the target, but a neighbour loses a criterion: reverted, a promising branch
    if (label.startsWith('critic r')) return { criteria: [{ id: 'R03.1', result: 'fail', evidence: '' }], pairwise: [{ region: 'R04', verdict: 'better', reason: '' }], invariants: [], issues: [], summary: '' }
    return undefined
  })
  assert.ok(prompts.length >= 2)
  assert.doesNotMatch(prompts[0], /Promising branch/)
  assert.match(prompts[1], /Promising branch: round \d+'s candidate .*r1-R04\.json was judged better/)
  assert.match(prompts[0], /Independent audit rows for R04 \(rank: gap\): 1: crumpled paper bowl/)
})

test('v3 tools: a needed generator is built by a toolsmith before the rounds and handed to the order for its region; every round record carries the state', { skip: !existsSync(P.status) }, async () => {
  const status = readJson(P.status), rub = readJson(P.rubric)
  status.methods = { R06: 'author the trunk from sections' }
  status.tools = {}
  status.lastOrders = []  // the real status may hold R06 in cooldown
  status.limits.toolReaderCheck = false  // the reader check has its own test
  for (const id of Object.keys(status.regions)) if (id !== 'R06') status.regions[id].hold = true
  status.regions.R06.history = []
  const out = await runWorkflow(generate(), v3Args(status, rub, { rounds: 1, tools: [{ region: 'R06', script: 'author_trunk_sections_field.py', ready: false }, { region: 'R11', script: 'x.py', ready: false }] }), 'w')
  const labels = out.calls.map(c => c.label)
  assert.deepEqual(labels.filter(l => l.startsWith('tool:')), ['tool: R06'], 'only the workable region gets a toolsmith')
  assert.ok(labels.indexOf('tool: R06') < labels.findIndex(l => l.startsWith('builder')), 'the tool comes before the first order')
  const b = out.calls.find(c => c.label.startsWith('builder') && c.label.includes('R06'))
  assert.match(b.prompt, /Tool for this method: tool_R06\.py.*tool-R06\.json/)
  const rec = out.calls.find(c => c.label.startsWith('record r'))
  assert.match(rec.prompt, /"state":\{"round":\d+,"baseline"/)
})

test('priorityV3: the audit rank leads, an unused tool adds, idle time only breaks ties', () => {
  const S = mkState()
  setScores(S, { R03: 6.4, R04: 5, R01: 8.1, R05: 5.8 })
  for (const id of ['R01', 'R03', 'R04', 'R05']) { S.regions[id].issues = [{ fixability: 0.6 }]; S.regions[id].lastWorked = 2 }
  S.regions.R01.reopen = true
  S.auditGaps = [{ rank: 1, region: 'R04' }, { rank: 2, region: 'R03' }, { rank: 8, region: 'R01' }, { rank: 10, region: 'R05' }]
  const L3 = { ...LIMITS, priorityV3: true }
  const p = id => core.priority(S, L3, id, 19)
  assert.ok(p('R04') > p('R01') && p('R03') > p('R01'), 'audit ranks 1 and 2 beat a long-idle rank 8')
  S.tools = { R03: { recipe: 'r' } }
  const before = p('R03')
  assert.equal(Math.round((before - p('R04')) * 100) / 100 > 0, true, 'an unused tool lifts its region')
  S.regions.R03.toolUsed = true
  assert.ok(p('R03') < before)
  // v2 limits keep the coverage bonus
  assert.ok(core.priority(S, LIMITS, 'R05', 19) > 100)
})

test('keptResetsStall: a kept order with no criterion moving does not park the region', () => {
  const r = { score: 5.8, anchorScore: 5, attempts: 2, lastWorked: 13 }
  core.updateStall(r, 19, { ...LIMITS, keptResetsStall: true }, true)
  assert.equal(r.parked, undefined); assert.equal(r.attempts, 0)
  const r2 = { score: 5.8, anchorScore: 5, attempts: 2, lastWorked: 13 }
  core.updateStall(r2, 19, LIMITS, true)
  assert.equal(r2.parked, true)
})

test('verdictDebt: a better verdict carrying one small neighbour loss is kept, and the loss becomes a debt', () => {
  const S = mkState()
  setResults(S, 'R04', R(4)); setResults(S, 'R03', R(5))
  const c = crit({ R04: R(4), R03: R(4, 1) }, { pairwise: better('R04') })
  const L3 = { ...LIMITS, verdictDebt: { maxRegions: 1, minGain: -0.1 } }
  const d = core.judge(S, rubric, L3, { id: 'R04', component: 'head' }, {}, c)
  assert.equal(d.kept, true); assert.equal(d.keptWithDebt, true)
  assert.deepEqual(d.debts.map(x => x.region), ['R03'])
  assert.equal(core.judge(S, rubric, LIMITS, { id: 'R04', component: 'head' }, {}, c).kept, false, 'without the rule it reverts')
  const c2 = crit({ R04: R(4), R03: R(3) }, { pairwise: better('R04') })
  assert.equal(core.judge(S, rubric, L3, { id: 'R04', component: 'head' }, {}, c2).kept, false, 'a loss beyond regressionDrop still reverts')
})

test('prompts carry no control characters and name brief files that exist (round 19: a tab in a path)', { skip: !existsSync(P.status) }, async () => {
  const status = readJson(P.status), rub = readJson(P.rubric)
  status.tools = {}
  const out = await runWorkflow(generate(), v3Args(status, rub, { rounds: 2, freshAudit: true, replan: true, tools: [{ region: 'R06', script: 'x.py', ready: false }] }), 'z')
  for (const c of out.calls) {
    assert.doesNotMatch(c.prompt, /[\u0000-\u0008\u000b-\u001f]/, 'control character in the prompt of ' + c.label)
    for (const m of c.prompt.matchAll(/akinza\\loop\\([\w-]+\.(?:md|json))/g)) {
      if (/^(?:round|r\d|tool-|gap-audit-\d)/.test(m[1])) continue
      assert.ok(existsSync(join(here, '..', '..', '..', '..', 'docs', 'design', 'species-construction', 'akinza', 'loop', m[1])), `${c.label} names ${m[1]}, which does not exist`)
    }
  }
})

test('pairs: pickOrders orders a pair partner with its region; the judge needs both targets safe and their sum up', () => {
  const S = mkState()
  setScores(S, { R03: 5.7, R04: 6.4 })
  for (const id of ['R03', 'R04']) { S.regions[id].issues = [{ fixability: 0.6 }]; S.regions[id].lastWorked = 18 }
  const orders = core.pickOrders(S, LIMITS, 21, null, [['R03', 'R04']])
  const head = orders.find(o => o.component === 'head')
  assert.ok(head && head.with && head.with.length === 1)
  assert.deepEqual([head.id, ...head.with].sort(), ['R03', 'R04'])
  // judge: R04 better and up, R03 same and unchanged: kept
  const S2 = mkState()
  setResults(S2, 'R03', R(4)); setResults(S2, 'R04', R(3))
  const order = { id: 'R04', component: 'head', with: ['R03'] }
  const ok = crit({ R03: R(4), R04: R(5) }, { pairwise: [{ region: 'R04', verdict: 'better', reason: '' }, { region: 'R03', verdict: 'same', reason: '' }] })
  assert.equal(core.judge(S2, rubric, LIMITS, order, {}, ok).kept, true)
  // R04 up but R03 loses a step: a target loss reverts, even within regressionDrop
  const lose = crit({ R03: R(3, 1), R04: R(5) }, { pairwise: [{ region: 'R04', verdict: 'better', reason: '' }, { region: 'R03', verdict: 'same', reason: '' }] })
  const d = core.judge(S2, rubric, LIMITS, order, {}, lose)
  assert.equal(d.kept, false)
  assert.match(d.reasons.join(' '), /lost credit in R03/)
  // a worse verdict on the partner reverts
  const worse = crit({ R03: R(4), R04: R(5) }, { pairwise: [{ region: 'R04', verdict: 'better', reason: '' }, { region: 'R03', verdict: 'worse', reason: '' }] })
  assert.equal(core.judge(S2, rubric, LIMITS, order, {}, worse).kept, false)
  // single-region orders behave as before
  assert.equal(core.judge(S2, rubric, LIMITS, { id: 'R04', component: 'head' }, {}, lose).kept, true, 'without the pair the R03 loss is a debt')
})

test('audit rows: a kept candidate that resolves a row removes it; enough kept orders refresh the audit', { skip: !existsSync(P.status) }, async () => {
  const status = readJson(P.status), rub = readJson(P.rubric)
  status.methods = { R01: 'm' }
  for (const id of Object.keys(status.regions)) if (id !== 'R06') status.regions[id].hold = true
  status.regions.R06.history = []
  status.lastOrders = []
  status.tools = {}
  status.auditGaps = [{ rank: 5, region: 'R06', gap: 'plank torso', structural: true }, { rank: 7, region: 'R07', gap: 'fist paw', structural: true }]
  status.limits.auditRefreshKept = 1
  status.keptSinceAudit = 0
  const out = await runWorkflow(generate(), v3Args(status, rub, { rounds: 2 }), 'a', (label, prompt) => {
    if (label.startsWith('builder')) return okBuild('R06')
    if (label.startsWith('critic r')) return { criteria: rub.regions.R06.map(c => ({ id: c.id, result: 'pass', evidence: '' })), pairwise: [{ region: 'R06', verdict: 'better', reason: '' }], invariants: [], issues: [], auditRows: [{ rank: 5, resolved: true }], summary: '' }
    return undefined
  })
  assert.ok(out.logs.some(l => /audit rows resolved by kept work: 5/.test(l)))
  assert.ok(out.calls.some(c => /^audit r\d+:/.test(c.label)), 'the second round starts with a refreshed audit')
  const crit1 = out.calls.find(c => c.label.startsWith('critic r'))
  assert.match(crit1.prompt, /return auditRows with its rank/)
})

test('verdictKeep: a better verdict keeps without a checklist rise; measured regressions, target losses and invariants still revert; held regions never block', () => {
  const L4 = { ...LIMITS, verdictKeep: true }
  const S = mkState()
  setResults(S, 'R04', R(4)); setResults(S, 'R03', R(7)); setResults(S, 'R10', R(5))
  S.regions.R10.hold = true
  const ord = { id: 'R04', component: 'head' }
  // no criterion moves, verdict better: kept
  assert.equal(core.judge(S, rubric, L4, ord, {}, crit({ R04: R(4) }, { pairwise: better('R04') })).kept, true)
  // a held region loses a lot: still kept
  assert.equal(core.judge(S, rubric, L4, ord, {}, crit({ R04: R(4), R10: R(1) }, { pairwise: better('R04') })).kept, true)
  // a measured criterion (the last two of each region) loses credit: reverted
  const m = R(7); m[6] = 'fail'
  const r1 = core.judge(S, rubric, L4, ord, {}, crit({ R04: R(4), R03: m }, { pairwise: better('R04') }))
  assert.equal(r1.kept, false); assert.match(r1.reasons.join(' '), /measured regression R03\.7/)
  // one visual step lost in a workable neighbour: kept with a debt
  const v = ['pass', 'pass', 'pass', 'pass', 'pass', 'partial', 'pass', 'fail']
  const r2 = core.judge(S, rubric, L4, ord, {}, crit({ R04: R(4), R03: v }, { pairwise: better('R04') }))
  assert.equal(r2.kept, true); assert.deepEqual(r2.debts.map(d => d.region), ['R03'])
  // the target loses: reverted; verdict same: reverted
  assert.equal(core.judge(S, rubric, L4, ord, {}, crit({ R04: R(3, 1) }, { pairwise: better('R04') })).kept, false)
  assert.equal(core.judge(S, rubric, L4, ord, {}, crit({ R04: R(6) }, { pairwise: [{ region: 'R04', verdict: 'same', reason: '' }] })).kept, false)
})

test('gate: held regions do not block it', () => {
  const S = mkState()
  setScores(S, { R10: 4.2, R11: 1.3 })
  for (const id of IDS12) if (!['R10', 'R11'].includes(id)) S.regions[id].score = 9
  assert.equal(core.gateMet(S, LIMITS), false)
  S.regions.R10.hold = true; S.regions.R11.hold = true
  assert.equal(core.gateMet(S, LIMITS), true)
})

test('split builder: planner, one runner, three blind readers pick the candidate, the scoped critic grades it on the lean agent type', { skip: !existsSync(P.status) }, async () => {
  const status = readJson(P.status), rub = readJson(P.rubric)
  status.methods = { R06: 'm' }
  for (const id of Object.keys(status.regions)) if (id !== 'R06') status.regions[id].hold = true
  status.regions.R06.history = []
  status.lastOrders = []
  status.tools = {}
  status.limits.auditRefreshKept = 0
  status.limits.verdictKeep = true
  const cand = (n, side) => ({ name: 'v' + n, recipe: `plans/v${n}.json`, head: 'head-x', body: 'body-' + n, assembly: 'assembled-90' + n, packet: 'p/assembled-90' + n, technicalPass: true, regionChange: {}, seams: '', measured: '', pack: `p/assembled-90${n}/reader-pack`, keys: { R06: side } })
  const out = await runWorkflow(generate(), v3Args(status, rub, { rounds: 1, split: true }), 's', (label, prompt) => {
    if (label.startsWith('planner')) return { plan: 'plans/r21-R06.json', variants: 4, approach: 'loft sweep', needsCode: false }
    if (label.startsWith('runner')) return { ok: true, candidates: [cand(1, 'A'), cand(2, 'B')] }
    // every reader prefers candidate 2 (on side B) and finds candidate 1 the same as the baseline
    if (label.startsWith('reader')) return { packs: [
      // readers name a pack by its assembly, not by the folder the runner recorded (round 21)
      { pack: 'assembled-901', region: 'R06', choice: 'same', reason: 'flat' },
      { pack: 'assembled-902', region: 'R06', choice: 'B', reason: 'S curve reads' }] }
    if (label.startsWith('critic r')) return { criteria: rub.regions.R06.filter(c => c.kind === 'visual').map(c => ({ id: c.id, result: 'pass', evidence: '' })), pairwise: [{ region: 'R06', verdict: 'same', reason: 'critic unsure' }], invariants: [], issues: [], summary: '' }
    return undefined
  })
  const labels = out.calls.map(c => c.label)
  assert.equal(labels.filter(l => l.startsWith('planner')).length, 1)
  assert.equal(labels.filter(l => l.startsWith('runner')).length, 1)
  assert.equal(labels.filter(l => l.startsWith('reader')).length, 3)
  assert.ok(!labels.some(l => l.startsWith('builder')), 'no code builder when the plan needs no code')
  const critic = out.calls.find(c => c.label.startsWith('critic r'))
  assert.match(critic.label, /assembled-902/, 'the readers chose candidate 2')
  assert.match(critic.prompt, /p[\\/]assembled-902/)
  assert.equal(out.ret.status.baseline.assembly, 'assembled-902', 'the readers decide, so it is kept although the critic said same')
})

function splitStatus() {
  const status = readJson(P.status)
  status.methods = { R06: 'm' }
  for (const id of Object.keys(status.regions)) if (id !== 'R06') status.regions[id].hold = true
  status.regions.R06.history = []
  status.lastOrders = []
  status.tools = {}
  status.limits.auditRefreshKept = 0
  status.limits.verdictKeep = true
  return status
}
const splitCand = (n, side, extra) => ({ name: 'v' + n, recipe: `plans/v${n}.json`, head: 'head-x', body: 'body-' + n, assembly: 'assembled-90' + n, packet: 'p/assembled-90' + n, technicalPass: true, regionChange: {}, seams: 'no new seams flagged', measured: '', pack: `p/assembled-90${n}/reader-pack`, keys: { R06: side }, ...(extra || {}) })

test('split builder: a plan the readers reject unanimously goes to the code builder with their reasons, and its candidate faces the readers too', { skip: !existsSync(P.status) }, async () => {
  const status = splitStatus(), rub = readJson(P.rubric)
  status.limits.rejectToCode = true
  const out = await runWorkflow(generate(), v3Args(status, rub, { rounds: 1, split: true }), 's', (label, prompt) => {
    if (label.startsWith('planner')) return { plan: 'plans/r22-R06.json', variants: 4, approach: 'loft sweep', needsCode: false }
    if (label.startsWith('runner')) return { ok: true, candidates: [splitCand(1, 'A'), splitCand(2, 'B')] }
    if (label.startsWith('builder')) return { failed: false, recipe: 'r.json', head: 'head-x', body: 'body-9', assembly: 'assembled-909', packet: 'p/assembled-909', technicalPass: true, approach: 'fixed the box edge', changes: '', pack: 'p/assembled-909/reader-pack', keys: { R06: 'A' } }
    if (label.startsWith('reader') && label.endsWith('code')) return { packs: [{ pack: 'assembled-909', region: 'R06', choice: 'A', reason: 'no box edge' }] }
    if (label.startsWith('reader')) return { packs: [
      { pack: 'assembled-901', region: 'R06', choice: 'B', reason: 'cut box beside the eyes' },
      { pack: 'assembled-902', region: 'R06', choice: 'A', reason: 'ladder of slabs' }] }
    if (label.startsWith('critic r')) return { criteria: rub.regions.R06.filter(c => c.kind === 'visual').map(c => ({ id: c.id, result: 'pass', evidence: '' })), pairwise: [{ region: 'R06', verdict: 'better', reason: '' }], invariants: [], issues: [], summary: '' }
    return undefined
  })
  const labels = out.calls.map(c => c.label)
  assert.equal(labels.filter(l => l.startsWith('planner')).length, 1, 'no refine plan after a unanimous rejection')
  const builder = out.calls.find(c => c.label.startsWith('builder'))
  assert.ok(builder, 'the code builder runs')
  assert.match(builder.prompt, /cut box beside the eyes/)
  assert.match(builder.prompt, /reader_pack\.py/)
  assert.equal(labels.filter(l => l.startsWith('reader') && l.endsWith('code')).length, 3)
  assert.equal(out.ret.status.baseline.assembly, 'assembled-909')
})

test('split builder: with measuredTieKeep a clean candidate the readers call the same is kept on its measured gain', { skip: !existsSync(P.status) }, async () => {
  const status = splitStatus(), rub = readJson(P.rubric)
  status.limits.measuredTieKeep = true
  status.limits.refinePasses = 0
  const trunk = rub.regions.R06.filter(c => c.source === 'trunk').map(c => c.id)
  for (const id of trunk) status.regions.R06.results[id] = 'fail'
  status.regions.R06.score = core.scoreFrom(rub, status.regions.R06.results, 'R06')  // the real status may hold these as passes
  const run = { ok: true, candidates: [splitCand(1, 'A', { measured: 'R06 measured: 3 changed (1 newly passing, 0 newly failing)' }),
    splitCand(2, 'B', { measured: 'R06 measured: 3 changed (2 newly passing, 0 newly failing)' }),
    splitCand(3, 'B', { measured: 'R06 measured: 3 changed (3 newly passing, 0 newly failing)', seams: 'new seams flagged: elbow/back crease' })] }
  const go = limits => runWorkflow(generate(), v3Args({ ...status, limits: { ...status.limits, ...limits } }, rub, { rounds: 1, split: true }), 's', (label, prompt) => {
    if (label.startsWith('planner')) return { plan: 'plans/r22-R06.json', variants: 3, approach: 'waist sweep', needsCode: false }
    if (label.startsWith('runner')) return run
    if (label.startsWith('reader')) return { packs: [1, 2, 3].map(n => ({ pack: 'assembled-90' + n, region: 'R06', choice: 'same', reason: 'no visible change' })) }
    if (label.startsWith('critic r')) return { criteria: [...rub.regions.R06.filter(c => c.kind === 'visual').map(c => ({ id: c.id, result: status.regions.R06.results[c.id] || 'partial', evidence: '' })),
      ...trunk.slice(0, 2).map(id => ({ id, result: 'pass', evidence: 'measured.json' }))], pairwise: [{ region: 'R06', verdict: 'same', reason: '' }], invariants: [], issues: [], summary: '' }
    return undefined
  })
  const out = await go({})
  const critic = out.calls.find(c => c.label.startsWith('critic r'))
  assert.match(critic.label, /assembled-902/, 'the clean candidate with the larger measured gain, not the one with a new seam')
  assert.equal(out.ret.status.baseline.assembly, 'assembled-902')
  const off = await go({ measuredTieKeep: false })
  assert.ok(!off.calls.some(c => c.label.startsWith('critic r')), 'without the lever a same verdict ends the order')
})

test('tools: with toolReaderCheck a new tool is ready only when three readers find its starter no worse than the baseline; a rejected tool gets one fix pass', { skip: !existsSync(P.status) }, async () => {
  const status = readJson(P.status), rub = readJson(P.rubric)
  status.methods = { R06: 'author the trunk from sections' }
  status.tools = {}
  status.lastOrders = []
  for (const id of Object.keys(status.regions)) if (id !== 'R06') status.regions[id].hold = true
  status.regions.R06.history = []
  status.limits.toolReaderCheck = true
  const go = verdicts => {
    let check = 0
    return runWorkflow(generate(), v3Args(status, rub, { rounds: 0, tools: [{ region: 'R06', script: 'author_trunk_sections_field.py', ready: false }] }), 'w', (label, prompt) => {
      if (label.startsWith('tool:')) return { region: 'R06', script: 'author_trunk_sections_field.py', recipe: 'recipes/tool-R06.json', ready: true, checkPlan: 'plans/tool-check-R06.json', notes: '' }
      if (label.startsWith('runner tool check')) { check++; return { ok: true, candidates: [{ name: 'tool as built', assembly: 'assembled-990', packet: 'p/assembled-990', technicalPass: true, pack: 'p/assembled-990/reader-pack', keys: { R06: 'B' } }] } }
      if (label.startsWith('reader') && label.includes('tool check')) return { packs: [{ pack: 'assembled-990', region: 'R06', choice: verdicts[check - 1], reason: verdicts[check - 1] === 'A' ? 'cut box' : 'fine' }] }
      return undefined
    })
  }
  const bad = await go(['A', 'A'])
  assert.deepEqual(bad.calls.map(c => c.label).filter(l => l.startsWith('tool:')), ['tool: R06', 'tool: R06 fix'])
  assert.match(bad.calls.find(c => c.label === 'tool: R06 fix').prompt, /cut box/)
  assert.ok(bad.logs.some(l => /R06 not ready \(readers worse\)/.test(l)), JSON.stringify(bad.logs))
  const good = await go(['same'])
  assert.ok(good.logs.some(l => /R06 ready \(readers same\)/.test(l)), JSON.stringify(good.logs))
  assert.ok(!good.calls.some(c => c.label === 'tool: R06 fix'))
})

test('tools: a tool built but not yet passed by the readers is checked without a toolsmith, and its check is returned for its record', { skip: !existsSync(P.status) }, async () => {
  const status = readJson(P.status), rub = readJson(P.rubric)
  status.tools = {}
  status.lastOrders = []
  for (const id of Object.keys(status.regions)) if (id !== 'R06') status.regions[id].hold = true
  status.limits.toolReaderCheck = true
  const out = await runWorkflow(generate(), v3Args(status, rub, { rounds: 0, tools: [{ region: 'R06', script: 's.py', recipe: 'recipes/tool-R06.json', ready: false, built: true, checkPlan: 'plans/tool-check-R06.json' }] }), 'w', (label, prompt) => {
    if (label.startsWith('runner tool check')) return { ok: true, candidates: [{ name: 'tool as built', assembly: 'assembled-991', packet: 'p/assembled-991', technicalPass: true, pack: 'p/assembled-991/reader-pack', keys: { R06: 'A' } }] }
    if (label.startsWith('reader') && label.includes('tool check')) return { packs: [{ pack: 'assembled-991', region: 'R06 trunk and pelvis', choice: 'A', reason: 'clean' }] }
    return undefined
  })
  const labels = out.calls.map(c => c.label)
  assert.ok(!labels.some(l => l.startsWith('tool:')), 'no toolsmith for a built tool')
  assert.equal(labels.filter(l => l.startsWith('runner tool check')).length, 1)
  assert.match(out.ret.status.toolChecks.R06, /^better/, 'a reader naming the region in words still counts')
  assert.equal(out.ret.status.tools.R06.recipe, 'recipes/tool-R06.json')
})

test('v3.6: write roles run on the worker agent type, and a toolsmith that returns continue hands over to a fresh session that reads its notes', { skip: !existsSync(P.status) }, async () => {
  const status = readJson(P.status), rub = readJson(P.rubric)
  status.tools = {}
  status.lastOrders = []
  for (const id of Object.keys(status.regions)) if (id !== 'R06') status.regions[id].hold = true
  status.limits = { ...status.limits, toolReaderCheck: false, workerAgentType: 'loop-worker', toolSessions: 3, toolSessionCalls: 80 }
  let n = 0
  const out = await runWorkflow(generate(), v3Args(status, rub, { rounds: 0, tools: [{ region: 'R06', script: 's.py', ready: false }] }), 'w', (label, prompt) => {
    if (label.startsWith('tool:')) { n++; return n < 2 ? { region: 'R06', ready: false, notes: 'continue: loft written, smoke test next' } : { region: 'R06', script: 's.py', recipe: 'recipes/tool-R06.json', ready: true, notes: 'done' } }
    return undefined
  })
  const tools = out.calls.filter(c => c.label.startsWith('tool:'))
  assert.deepEqual(tools.map(c => c.label), ['tool: R06', 'tool: R06 session 2'])
  assert.match(tools[0].prompt, /sessions of at most about 80 tool calls/)
  assert.match(tools[1].prompt, /This is session 2: read .*R06-notes\.md first/)
  assert.ok(tools.every(c => c.opts && c.opts.agentType === 'loop-worker'), JSON.stringify(tools.map(c => c.opts)))
  assert.equal(out.ret.status.tools.R06.recipe, 'recipes/tool-R06.json')
})

test('v3.8: a reader-picked candidate the judge reverts gets one repair plan from it, judged the same way', { skip: !existsSync(P.status) }, async () => {
  const status = splitStatus(), rub = readJson(P.rubric)
  status.limits.repairPass = true
  status.limits.refinePasses = 0
  const visual = rub.regions.R06.filter(c => c.kind === 'visual').map(c => c.id)
  let critics = 0
  const out = await runWorkflow(generate(), v3Args(status, rub, { rounds: 1, split: true }), 's', (label, prompt) => {
    if (label.startsWith('planner') && label.endsWith('repair')) return { plan: 'plans/r24-R06-repair.json', variants: 3, approach: 'fix the rim', needsCode: false }
    if (label.startsWith('planner')) return { plan: 'plans/r24-R06.json', variants: 3, approach: 'inner ears', needsCode: false }
    if (label.startsWith('runner') && label.endsWith('repair')) return { ok: true, candidates: [splitCand(5, 'A')] }
    if (label.startsWith('runner')) return { ok: true, candidates: [splitCand(1, 'A')] }
    if (label.startsWith('reader')) return { packs: [{ pack: label.endsWith('repair') ? 'assembled-905' : 'assembled-901', region: 'R06', choice: 'A', reason: 'soft cupped' }] }
    if (label.startsWith('critic r')) {
      critics++
      // the first critique loses a target criterion; the repair's does not
      return { criteria: visual.map((id, k) => ({ id, result: critics === 1 && k === 0 ? 'fail' : (status.regions.R06.results[id] || 'partial'), evidence: '' })), pairwise: [{ region: 'R06', verdict: 'better', reason: '' }], invariants: [], issues: [{ region: 'R06', summary: 'torn rim', fix: 'close the rim', fixability: .6 }], summary: '' }
    }
    return undefined
  })
  const repairPlanner = out.calls.find(c => c.label.endsWith('repair') && c.label.startsWith('planner'))
  assert.ok(repairPlanner, 'a repair plan was asked for')
  assert.match(repairPlanner.prompt, /repair pass\. Start the plan from the readers' candidate recipe plans\/v1\.json/)
  assert.match(repairPlanner.prompt, /torn rim/)
  assert.equal(out.ret.status.baseline.assembly, 'assembled-905')
})

test('freezeHeld: a held region keeps its results whatever the critic says', () => {
  const S = mkState()
  S.regions.R10.hold = true
  const before = JSON.stringify(S.regions.R10.results)
  const ord = { id: 'R06', component: 'body' }
  const crit = { criteria: rubric.regions.R10.map(c => ({ id: c.id, result: 'pass', evidence: '' })), pairwise: [{ region: 'R06', verdict: 'better', reason: '' }], invariants: [], issues: [] }
  const d = core.judge(S, rubric, { ...LIMITS, freezeHeld: true }, ord, {}, crit)
  assert.equal(JSON.stringify(d.results.R10), before)
})

test('v3.9 geometry carry: a non-target region the geometry did not move keeps its visual results; a moved one and the target are graded', () => {
  const S = mkState()
  setResults(S, 'R08', R(4, 2))
  const ord = { id: 'R07', component: 'body' }
  const c = crit({ R07: R(6), R08: R(8), R09: R(8) }, { pairwise: better('R07') })
  const shift = { R07: 0, R08: 0, R09: 0.02 }
  const d = core.judge(S, rubric, { ...LIMITS, geometryCarry: 0.004 }, ord, {}, c, { regionShift: shift })
  assert.deepEqual(d.geoCarried, ['R08'])
  for (const cc of rubric.regions.R08) if (cc.kind === 'visual') assert.equal(d.results.R08[cc.id], S.regions.R08.results[cc.id])
  assert.equal(d.results.R09['R09.1'], 'pass', 'a region that moved is graded')
  assert.equal(d.results.R07['R07.1'], 'pass', 'the target is never carried')
  const off = core.judge(S, rubric, LIMITS, ord, {}, c, { regionShift: shift })
  assert.equal(off.geoCarried, undefined)
  assert.equal(off.results.R08['R08.8'], 'pass', 'without the limit the critic grade stands')
})

test('v3.9 paired re-grade: a target loss that does not hold against the baseline is restored and the candidate kept; one that holds still reverts', { skip: !existsSync(P.status) }, async () => {
  for (const holds of [false, true]) {
    const status = splitStatus(), rub = readJson(P.rubric)
    status.limits.repairPass = false
    status.limits.refinePasses = 0
    status.limits.pairedRegrade = true
    const visual = rub.regions.R06.filter(c => c.kind === 'visual').map(c => c.id)
    status.regions.R06.results[visual[0]] = 'pass'
    status.regions.R06.score = core.scoreFrom(rub, status.regions.R06.results, 'R06')
    const out = await runWorkflow(generate(), v3Args(status, rub, { rounds: 1, split: true }), 'g', (label, prompt) => {
      if (label.startsWith('planner')) return { plan: 'plans/r26-R06.json', variants: 3, approach: 'a', needsCode: false }
      if (label.startsWith('runner')) return { ok: true, candidates: [splitCand(1, 'A')] }
      if (label.startsWith('reader')) return { packs: [{ pack: 'assembled-901', region: 'R06', choice: 'A', reason: 'reads closer' }] }
      if (label.startsWith('critic r')) return { criteria: visual.map((id, k) => ({ id, result: k === 0 ? 'partial' : (status.regions.R06.results[id] || 'partial'), evidence: '' })), pairwise: [{ region: 'R06', verdict: 'better', reason: '' }], invariants: [], issues: [], summary: '' }
      // assembled-901 is odd, so the candidate is packet one
      if (label.startsWith('regrade')) {
        assert.match(prompt, new RegExp(visual[0].replace('.', '\.')))
        return { grades: [{ id: visual[0], one: holds ? 'partial' : 'pass', two: 'pass', evidence: '' }] }
      }
      return undefined
    })
    assert.ok(out.calls.some(c => c.label.startsWith('regrade')), 'a re-grade was asked for')
    assert.equal(out.ret.status.baseline.assembly === 'assembled-901', !holds)
  }
})

test('v3.9 critic scope: a region whose images moved but whose geometry did not is not sent to the critic', { skip: !existsSync(P.status) }, async () => {
  const status = splitStatus(), rub = readJson(P.rubric)
  status.regions.R07.hold = false
  status.regions.R08.hold = false
  status.limits.geometryCarry = 0.004
  status.limits.refinePasses = 0
  const out = await runWorkflow(generate(), v3Args(status, rub, { rounds: 1, split: true }), 'c', (label) => {
    if (label.startsWith('planner')) return { plan: 'plans/r26-R06.json', variants: 3, approach: 'a', needsCode: false }
    if (label.startsWith('runner')) return { ok: true, candidates: [splitCand(1, 'A', { regionChange: { R07: 0.5, R08: 0.5 }, regionShift: { R06: 0.01, R07: 0, R08: 0.02 } })] }
    if (label.startsWith('reader')) return { packs: [{ pack: 'assembled-901', region: 'R06', choice: 'A', reason: 'r' }] }
    return undefined
  })
  const critic = out.calls.find(c => c.label.startsWith('critic r'))
  assert.ok(critic)
  assert.match(critic.prompt, /other regions, whose images changed more than the side-effect threshold: R08\./)
})

test('args.pin: a pinned region replaces the first round pick of its component, once', { skip: !existsSync(P.status) }, async () => {
  const status = readJson(P.status), rub = readJson(P.rubric)
  status.methods = { R02: 'm', R03: 'm', R06: 'm' }
  status.lastOrders = []
  for (const id of Object.keys(status.regions)) if (!['R02', 'R03', 'R06'].includes(id)) status.regions[id].hold = true
  const out = await runWorkflow(generate(), v3Args(status, rub, { rounds: 2, pin: ['R02'] }), 'p', () => undefined)
  const firstBuilders = out.calls.filter(c => c.label.startsWith('builder r26')).map(c => c.label)
  assert.ok(firstBuilders.some(l => /head: R02/.test(l)), firstBuilders.join(','))
  assert.ok(!firstBuilders.some(l => /head: R03/.test(l)))
  assert.ok(firstBuilders.some(l => /body: R06/.test(l)))
})
