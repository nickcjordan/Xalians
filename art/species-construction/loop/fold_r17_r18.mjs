// Fold the paused v3 batch (run wf_f71ec65d-b7a: prepare, round 17, round 18 half done) into
// status.json, so the next batch starts at round 19. One-off, kept for provenance like the
// replay_rNN scripts; loop v3 now writes a state snapshot every round so this is not needed again.
//   node art/species-construction/loop/fold_r17_r18.mjs <fold-input.json>
// fold-input.json holds the journal results of the audit, the method plan, the round 18 R09
// builder and its critic. Round 18's R03 builder was stopped by the pause before it built
// anything, so R03 gets no history entry and no attempt.
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as core from './loop_core.js'

const here = dirname(fileURLToPath(import.meta.url))
const REPO = join(here, '..', '..', '..')
const LOOP = join(REPO, 'docs/design/species-construction/akinza/loop')
const read = p => JSON.parse(readFileSync(p, 'utf8'))
const input = read(process.argv[2])
const S = read(join(LOOP, 'status.json'))
const rubric = read(join(LOOP, 'rubric.json'))
const species = read(join(LOOP, 'species.json'))
const r17 = read(join(LOOP, 'rounds/round-17.json'))
if (S.round !== 16) throw new Error('expected the status at round 16, found ' + S.round)
const L = S.limits
const pools = core.defaultPools(species.components)

// Prepare: the fresh audit, its ranked gaps, and the method plan (unpark where the method changed).
S.audit = input.audit.path
S.auditGaps = input.audit.gaps.slice().sort((a, b) => a.rank - b.rank).slice(0, 12).map(g => ({ rank: g.rank, region: g.region, gap: g.gap, structural: !!g.structural }))
for (const m of input.methods.regions) {
  const r = S.regions[m.region]
  if (!r || r.hold) continue
  if (m.changed && r.parked) { r.parked = false; r.parkReason = null; r.attempts = 0; r.anchorScore = r.score; r.methodChanged = 16 }
}
const base = 'docs/design/species-construction/akinza/recipe.json'

// Round 17, as recorded (both orders reverted; the medium-effort twin was a trial, never an order).
S.round = 17
S.lastOrders.push('R04+R09')
const recipes17 = { R04: 'docs/design/species-construction/akinza/loop/recipes/r17-R04.json', R09: 'docs/design/species-construction/akinza/loop/recipes/r17-R09.json' }
for (const o of r17.orders) {
  const r = S.regions[o.region]
  r.history.push({ round: 17, kept: false, approach: o.approach, reason: o.reason, reusable: [], verdict: o.verdict ? o.verdict.verdict : null, recipe: recipes17[o.region], base })
  core.updateStall(r, 17, L)
}

// Round 18: R09 judged by the same core the workflow runs; R03 interrupted.
S.round = 18
S.lastOrders.push('R03+R09')
const order = { id: 'R09', component: 'body' }
const b = { ...input.b18, recipe: 'docs/design/species-construction/akinza/loop/recipes/r18-R09.json' }
const measured = read(join(b.packet, 'measured.json'))
const critique = core.overlayMeasured(rubric, input.c18, measured)
const d = core.judge(S, rubric, L, order, b, critique, { pools, regionChange: b.regionChange || null, threshold: b.regionChange ? Math.min(species.sideEffectThreshold ?? 0.0005, 0.0015) : null, regionImages: species.regionImages })
if (d.kept) throw new Error('round 18 R09 was expected to revert: ' + JSON.stringify(d.after))
const r9 = S.regions.R09
r9.history.push({ round: 18, kept: false, approach: b.approach, reason: d.reasons.join('; '), reusable: b.reusable || [], verdict: d.verdict ? d.verdict.verdict : null, recipe: b.recipe, base })
core.updateStall(r9, 18, L)
const entry = { round: 18, orders: [
  { region: 'R03', component: 'head', assembly: null, kept: false, reason: 'interrupted: the batch was paused by Nick before the builder finished', approach: null },
  { region: 'R09', component: 'body', assembly: b.assembly, approach: b.approach, kept: false, reason: d.reasons.join('; '), verdict: d.verdict, gain: d.gain, after: d.after, summary: input.c18.summary },
], baseline: S.baseline, scores: core.scoresNow(S), mean: core.meanOf(S, core.scoresNow(S)), combined: null, recipe: base, note: 'Folded from the paused run by fold_r17_r18.mjs.' }
S.notes.push('2026-10-01: v3 batch 1 paused by Nick during round 18 (R03 builder interrupted). Prepare (audit 0458, method plan, six specs) and rounds 17 and 18 folded in by fold_r17_r18.mjs; nothing kept, mean 5.447.')
writeFileSync(join(LOOP, 'rounds/round-18.json'), JSON.stringify(entry))
writeFileSync(join(LOOP, 'status.json'), JSON.stringify(S, null, 1))
console.log(JSON.stringify({ round: S.round, mean: entry.mean, r18: d.reasons, after: d.after.R09, R08: d.after.R08, parked: Object.keys(S.regions).filter(id => S.regions[id].parked), lastOrders: S.lastOrders.slice(-3) }))
