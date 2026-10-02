// Construction loop core: every pure function of the judge and the round bookkeeping.
//
// One source for three consumers: the workflow (build_workflow.mjs inlines this file at
// the //@core marker of loop_workflow.src.js, stripping the `export` keywords), the node
// tests and judge simulator, and loop_state.py (through judge_cli.mjs). Nothing in here
// reads a global, a file, the clock or a random number: state, rubric and limits arrive as
// parameters, so the workflow sandbox (no Date.now, no Math.random, no filesystem) runs it
// unchanged. The v2 rules are kept exactly, with their comments; the v3 additions are the
// species pools, plateau, and the side-effect carry.

// The v2 pools: head round 1-4, body round 5-11, the whole figure R12. A species config
// (species.json "pools": {head, body, join, both}) replaces them; join is the assembly
// seam (the neck), worked by an order that edits only the recipe's assembly step.
export function defaultPools(config) {
  if (!config) return { head: ['R01', 'R02', 'R03', 'R04'], body: ['R05', 'R06', 'R07', 'R08', 'R09', 'R10', 'R11'], join: [], both: ['R12'] }
  return { head: config.head || [], body: config.body || [], join: config.join || [], both: config.both || [] }
}

export const credit = r => r === 'pass' ? 1 : r === 'partial' ? 0.5 : 0

export function scoreFrom(rubric, results, id) {
  const crits = rubric.regions[id]
  if (crits.some(c => !results[c.id])) return null
  return Math.round(10 * crits.reduce((t, c) => t + credit(results[c.id]), 0) / crits.length * 10) / 10
}

export function meanOf(state, scores) {
  const ids = Object.keys(state.regions)
  let t = 0, w = 0
  for (const id of ids) { t += state.regions[id].weight * (scores[id] || 0); w += state.regions[id].weight }
  return Math.round(t / w * 1000) / 1000
}

export const scoresNow = state => Object.fromEntries(Object.keys(state.regions).map(id => [id, state.regions[id].score]))

export function resultsAfter(state, critique, base) {
  const merged = {}
  for (const id of Object.keys(state.regions)) merged[id] = { ...base[id] }
  for (const c of critique.criteria || []) {
    const region = c.id.split('.')[0]
    if (merged[region]) merged[region][c.id] = c.result
  }
  return merged
}

export const baseResults = state => Object.fromEntries(Object.keys(state.regions).map(id => [id, state.regions[id].results]))

export function gateMet(state, limits) {
  const g = limits.gate
  // v3: a region held by Nick's direction (the tails) cannot block the gate (audit 2026-10-02:
  // with the tails at 4.2 and 1.3 the gate was unreachable).
  const ids = Object.keys(state.regions).filter(id => !state.regions[id].hold)
  return ids.every(id => (state.regions[id].score || 0) >= g.minRegion) && meanOf(state, scoresNow(state)) >= g.weightedMean
    && g.identityRegions.every(id => (state.regions[id].score || 0) >= g.identityMin)
}

// v3: the loop stops when the last plateauRounds round means (state.means, one per
// completed round since the last cold score, the current mean last) gained less than
// plateauGain together. v2 rounds 6 to 9 gained .128 in three rounds, and rounds 13 to 16
// gained none, at the same cost per round as the rounds that paid.
export function plateau(state, limits) {
  const n = limits.plateauRounds ?? 3, gain = limits.plateauGain ?? 0.15
  const means = state.means || []
  if (means.length <= n) return false
  return Math.round((means[means.length - 1] - means[means.length - 1 - n]) * 1000) / 1000 < gain
}

export function priority(state, limits, id, round) {
  const r = state.regions[id]
  // v3: a held region (Nick's direction, such as the tails on 2026-10-01) is never ordered.
  if (r.parked || r.hold || r.score === null) return null
  // v3: a region the independent audit ranks among its top structural gaps is reopened even
  // above the pass bar, and counts as one point below it (round 17: the face scored 8.3
  // while the audit ranked its slit profile eye third).
  if (r.score >= limits.passBar && !r.reopen) return null
  const fix = Math.max(0.3, ...(r.issues || []).map(i => i.fixability || 0.5))
  let p = r.weight * (r.score >= limits.passBar ? 1 : limits.passBar - r.score) * fix
  const idle = r.lastWorked === null ? round : round - r.lastWorked
  if (limits.priorityV3) {
    // v3 (after round 19): the independent audit's ranking leads, then a tool built for the
    // region and not yet used, and idle time only breaks ties. Round 19's coverage bonus
    // (+100 for six idle rounds) sent the head (audit rank 8) and the neck (rank 10) ahead
    // of the fan and torso (ranks 1, 2 and 5) whose new tools had just been built.
    const ranks = (state.auditGaps || []).filter(g => g.region === id).map(g => g.rank)
    if (ranks.length) p += (limits.auditWeight ?? 2) * Math.max(0, 13 - Math.min(...ranks))
    if (state.tools && state.tools[id] && !r.toolUsed) p += limits.toolBonus ?? 20
    if (limits.gate && limits.gate.identityRegions.includes(id)) p += limits.identityBonus ?? 0
    p += Math.min(idle, 20) * 0.05
  } else if (idle >= limits.coverageRounds) p += 100 + idle  // coverage: a region idle this long goes next
  return Math.round(p * 100) / 100
}

// Slots: the best region of each pool (head, body, join), or the best "both" region when
// it outranks every slot. v2 has two slots, so both orders always ran; v3 adds the join
// slot and limits.ordersPerRound (default 2) keeps the round to the two highest priorities
// (a join order runs beside a head or body order, never with both). A region that sits in
// two pools (the neck is in body and join) is worked once: the join slot takes it first
// and the body slot picks its best of the rest.
export function pickOrders(state, limits, round, pools, pairs) {
  const P = pools || defaultPools()
  const last = state.lastOrders.slice(-limits.cooldownRounds)
  const cooled = id => last.length === limits.cooldownRounds && last.every(x => x.split('+').includes(id))
  const best = (pool, skip) => (pool || []).filter(id => !cooled(id) && id !== skip).map(id => ({ id, priority: priority(state, limits, id, round) }))
    .filter(x => x.priority !== null).sort((a, b) => b.priority - a.priority)[0] || null
  const both = best(P.both)
  const join = best(P.join)
  const head = best(P.head), body = best(P.body, join && join.id)
  const slots = [head && { ...head, component: 'head' }, body && { ...body, component: 'body' }, join && { ...join, component: 'join' }].filter(Boolean)
  if (both && both.priority > Math.max(0, ...slots.map(s => s.priority))) return [{ ...both, component: 'both' }]
  const cap = limits.ordersPerRound ?? 2
  const chosen = slots.length <= cap ? slots : (() => {
    const keep = new Set(slots.slice().sort((a, b) => b.priority - a.priority).slice(0, cap).map(s => s.component))
    return slots.filter(s => keep.has(s.component))
  })()
  // v3: a region in a pair (species.json "pairs") is ordered with its partner when the partner
  // is in the same pool and workable, so one builder tunes the shared tool for both.
  for (const s of chosen) {
    const pr = (pairs || []).find(p => p.includes(s.id))
    if (!pr) continue
    const pool = P[s.component] || []
    const partners = pr.filter(x => x !== s.id && pool.includes(x) && priority(state, limits, x, round) !== null)
    if (partners.length) s.with = partners
  }
  return chosen
}

// v3: the regions whose images moved more than threshold, excluding the target. diff is a
// diff.json: regionChange is {R: number | {changedPixelFraction, silhouetteXor}} (the
// largest of its numbers counts), or, for older packets, changedPixelFraction per image
// joined to regions by regionImages ({R: [image ids]}). A region the map omits counts as
// changed (the conservative reading).
export function regionMagnitude(diff, regionImages) {
  const out = {}
  if (diff && diff.regionChange) {
    for (const [r, v] of Object.entries(diff.regionChange)) out[r] = typeof v === 'number' ? v : Math.max(0, ...Object.values(v).filter(x => typeof x === 'number'))
  } else if (diff && diff.changedPixelFraction && regionImages) {
    for (const [r, ms] of Object.entries(regionImages)) out[r] = Math.max(0, ...ms.map(m => diff.changedPixelFraction[m] || 0))
  }
  return out
}
export function sideEffectRegions(diff, target, threshold, regionImages, ids) {
  const mag = regionMagnitude(diff, regionImages)
  const all = ids || Object.keys(mag)
  return all.filter(r => r !== target && !(mag[r] !== undefined && mag[r] <= threshold))
}

// Copy a packet's measured.json results onto a critique: the critic copies them, and a
// copy can be stale (round 14, a frozen R08.10). Pure: returns a new critique.
export function overlayMeasured(rubric, critique, measured) {
  if (!measured) return critique
  const measuredIds = new Set(Object.values(rubric.regions).flat().filter(c => c.kind === 'measured').map(c => c.id))
  const crit = (critique.criteria || []).filter(c => !(measuredIds.has(c.id) && measured[c.id] && measured[c.id].result))
  for (const id of measuredIds) if (measured[id] && measured[id].result) crit.push({ id, result: measured[id].result, evidence: 'measured.json' })
  return { ...critique, criteria: crit }
}

// opts (all optional, v3): pools (head/body/join/both), regionChange or diff + threshold
// (the side-effect carry), regionImages.
export function judge(state, rubric, limits, order, build, critique, opts) {
  const o = opts || {}
  const pools = o.pools || defaultPools()
  const ids = Object.keys(state.regions)
  const before = scoresNow(state)
  const results = resultsAfter(state, critique, baseResults(state))
  // A component the order did not touch keeps its results: round 13's head-only fan
  // build was reverted because the per-model pose refit moved a posed leg band and
  // took R08 from 7.3 to 6.4 on an identical body.
  const frozen = order.component === 'head' ? [...pools.body, ...pools.join] : order.component === 'body' ? pools.head : []
  for (const id of frozen) if (state.regions[id]) results[id] = { ...state.regions[id].results }
  // v3 side-effect carry: a non-target region whose images moved less than the threshold
  // keeps its visual results (the critic did not look at it); measured criteria are still
  // the critic's copies of measured.json.
  const carried = []
  const diff = o.diff || (o.regionChange ? { regionChange: o.regionChange } : null)
  if (diff && o.threshold !== undefined && o.threshold !== null) {
    const affected = new Set(sideEffectRegions(diff, order.id, o.threshold, o.regionImages, ids))
    for (const id of ids) {
      if (id === order.id || frozen.includes(id) || affected.has(id)) continue
      for (const c of rubric.regions[id]) if (c.kind !== 'measured' && state.regions[id].results[c.id]) results[id][c.id] = state.regions[id].results[c.id]
      carried.push(id)
    }
  }
  const after = {}
  for (const id of ids) { const s = scoreFrom(rubric, results[id], id); after[id] = s === null ? before[id] : s }
  const target = order.id
  // v3: an order may cover a pair of regions that one tool builds (order.with, such as the
  // fan front and back: rounds 17 and 20 each improved one and cost the other a step).
  // Every target needs a verdict of better or same, at least one better; no target may lose;
  // and their weighted sum must rise.
  const targets = [target, ...(order.with || [])]
  const verdicts = targets.map(t => (critique.pairwise || []).find(p => p.region === t) || null)
  const single = targets.length === 1
  const pair = single ? verdicts[0] : {
    region: targets.join('+'),
    verdict: verdicts.some(v => v && v.verdict === 'worse') ? 'worse' : verdicts.some(v => v && v.verdict === 'better') ? 'better' : 'same',
    reason: verdicts.map((v, i) => `${targets[i]}: ${v ? v.verdict + ' ' + v.reason : 'no verdict'}`).join(' | '),
  }
  const wsum = sc => targets.reduce((t, id) => t + state.regions[id].weight * (sc[id] || 0), 0)
  // A side-effect loss of up to regressionDrop in one other region is allowed when the
  // weighted mean still rises (round 2: a head build that took R01 from 2.5 to 6.9 was
  // reverted for smoothing the cheek tufts, R02 3.3 to 2.5). The loss becomes the
  // region's top issue so the next order repays it.
  const lost = ids.filter(id => after[id] !== null && before[id] !== null && after[id] < before[id])
  const drops = lost.filter(id => targets.includes(id) || before[id] - after[id] > limits.regressionDrop || lost.length > 1)
  const baseInv = state.invariants || {}
  const broken = (critique.invariants || []).filter(i => !i.ok && baseInv[i.id] !== false).map(i => i.id)
  const gain = Math.round((meanOf(state, after) - meanOf(state, before)) * 1000) / 1000
  const reasons = []
  if (!pair || pair.verdict !== 'better') reasons.push(`critic verdict ${pair ? pair.verdict : 'missing'}`)
  if (single ? !(after[target] > before[target]) : !(wsum(after) > wsum(before))) reasons.push(targets.map(t => `${t} checklist ${before[t]} to ${after[t]}`).join(', '))
  if (drops.length) reasons.push('lost credit in ' + drops.map(id => `${id} ${before[id]} to ${after[id]}`).join(', '))
  if (broken.length) reasons.push('broke invariant ' + broken.join(', '))
  if (gain < limits.meanGain) reasons.push(`weighted mean ${gain >= 0 ? '+' : ''}${gain}`)
  const debts = lost.filter(id => !drops.includes(id)).map(id => ({ region: id, before: before[id], after: after[id], by: targets.join('+') }))
  // A clean visible improvement is kept even when none of its criteria move (round 11:
  // the fan rear lost its comb rows and seams with no side effect, and was reverted
  // because the bowl outline kept every R04 result where it was).
  const onVerdict = reasons.length && pair && pair.verdict === 'better' && !lost.length && !broken.length && gain >= 0
  const extra = carried.length ? { carried } : {}
  if (onVerdict) return { kept: true, keptOnVerdict: true, reasons: [], results, after, gain, debts: [], verdict: pair, invariants: critique.invariants || [], ...extra }
  // v3 (limits.verdictDebt): a better verdict may also carry the same kind of debt a score gain
  // may (one other region losing up to regressionDrop), within a small mean loss. Rounds 17 to
  // 19 had four better verdicts with no criterion moving; two were reverted for one small side
  // loss each (the fan back's needles cost the fan front a step; the paw's cuff cost the legs).
  // v3.4 (limits.verdictKeep, audit 2026-10-02 recommendation 4): the reader or critic verdict
  // decides, guarded by the measured criteria and the invariants. A held region's losses never
  // count (round 8's tail kink sat in a region Nick holds as fine). No measured criterion in a
  // workable region may lose credit; one workable non-target region may lose visual credit
  // within regressionDrop as a debt; no target may lose; no invariant may newly break.
  if (limits.verdictKeep) {
    const held = new Set(ids.filter(id => state.regions[id].hold))
    const lostW = lost.filter(id => !held.has(id))
    const dropsW = lostW.filter(id => targets.includes(id) || before[id] - after[id] > limits.regressionDrop || lostW.length > 1)
    const measuredLoss = []
    for (const id of ids) {
      if (held.has(id)) continue
      for (const c of rubric.regions[id]) {
        if (c.kind !== 'measured') continue
        const b = state.regions[id].results[c.id], a = results[id][c.id]
        if (b && a && credit(a) < credit(b)) measuredLoss.push(`${c.id} ${b} to ${a}`)
      }
    }
    const rs = []
    if (!pair || pair.verdict !== 'better') rs.push(`verdict ${pair ? pair.verdict : 'missing'}`)
    if (dropsW.length) rs.push('lost credit in ' + dropsW.map(id => `${id} ${before[id]} to ${after[id]}`).join(', '))
    if (measuredLoss.length) rs.push('measured regression ' + measuredLoss.join(', '))
    if (broken.length) rs.push('broke invariant ' + broken.join(', '))
    const dW = lostW.filter(id => !dropsW.includes(id)).map(id => ({ region: id, before: before[id], after: after[id], by: targets.join('+') }))
    return { kept: !rs.length, keptOnVerdict: !rs.length, reasons: rs, results, after, gain, debts: rs.length ? [] : dW, verdict: pair || null, invariants: critique.invariants || [], ...extra }
  }
  const vd = limits.verdictDebt
  const debtKeep = vd && reasons.length && pair && pair.verdict === 'better' && !targets.some(t => after[t] < before[t]) && !drops.length && lost.length <= (vd.maxRegions ?? 1) && !broken.length && gain >= (vd.minGain ?? -0.1)
  if (debtKeep) return { kept: true, keptOnVerdict: true, keptWithDebt: true, reasons: [], results, after, gain, debts, verdict: pair, invariants: critique.invariants || [], ...extra }
  return { kept: !reasons.length, reasons, results, after, gain, debts, verdict: pair || null, invariants: critique.invariants || [], ...extra }
}

// Mutates state: the kept decision becomes the new baseline. build.recipe, when the
// builder returns one (v3), is the candidate recipe the baseline now rests on.
export function adopt(state, decision, build, critique, component) {
  for (const id of Object.keys(state.regions)) {
    state.regions[id].results = decision.results[id]
    state.regions[id].score = decision.after[id]
  }
  for (const i of critique.issues || []) {
    if (state.regions[i.region]) state.regions[i.region].issues = (critique.issues || []).filter(x => x.region === i.region).slice(0, 3)
  }
  for (const d of decision.debts || []) {
    const r = state.regions[d.region]
    r.issues = [{ region: d.region, summary: `Repay a side-effect loss: the kept ${d.by} change took ${d.region} from ${d.before} to ${d.after}`, fix: `Restore the ${d.region} criteria that the ${d.by} change lost (see the critic evidence for that round) without undoing it`, fixability: 0.9 }, ...(r.issues || [])].slice(0, 3)
  }
  state.invariants = Object.fromEntries(decision.invariants.map(i => [i.id, i.ok]))
  const next = {
    head: component === 'body' ? state.baseline.head : (build.head || state.baseline.head),
    body: component === 'head' ? state.baseline.body : (build.body || state.baseline.body),
    assembly: build.assembly, packet: build.packet,
  }
  if (build.recipe || state.baseline.recipe) next.recipe = build.recipe || state.baseline.recipe
  state.baseline = next
  return state
}

// Mutates the region: the stall-park bookkeeping of one worked order. A region parks when
// stallAttempts orders in a row fail to lift it stallGain above its anchor score.
export function updateStall(region, round, limits, kept) {
  region.lastWorked = round
  region.attempts = (region.attempts || 0) + 1
  if (region.anchorScore === null || region.anchorScore === undefined) region.anchorScore = region.score
  if (region.score - region.anchorScore >= limits.stallGain) { region.anchorScore = region.score; region.attempts = 0 }
  // v3: a kept order is progress even when no criterion moved (round 19: the neck join was
  // kept on a better verdict and parked in the same breath, three attempts without +1).
  else if (kept && limits.keptResetsStall) region.attempts = 0
  else if (region.attempts >= limits.stallAttempts) { region.parked = true; region.parkReason = `${region.attempts} rounds without a net gain of ${limits.stallGain}` }
  return region
}

// The combination check of two kept orders (a head and a body build assembled together):
// returns {decision} when no region fell below the lower of its two single-order scores
// and no invariant newly broke, else {worse, broken}. merged is both critiques' criteria,
// invariants and issues; check is the combined critic.
export function combineDecision(state, rubric, h, b, merged, check) {
  const ids = Object.keys(state.regions)
  const results = resultsAfter(state, check, resultsAfter(state, merged, baseResults(state)))
  const after = Object.fromEntries(ids.map(id => [id, scoreFrom(rubric, results[id], id) ?? state.regions[id].score]))
  const expected = Object.fromEntries(ids.map(id => [id, Math.max(h.decision.after[id] ?? 0, b.decision.after[id] ?? 0)]))
  const worse = ids.filter(id => after[id] < Math.min(h.decision.after[id] ?? 0, b.decision.after[id] ?? 0))
  const broken = (check.invariants || []).filter(i => !i.ok && (state.invariants || {})[i.id] !== false).map(i => i.id)
  if (!worse.length && !broken.length) {
    return { decision: { kept: true, results, after, invariants: check.invariants, gain: Math.round((meanOf(state, after) - meanOf(state, scoresNow(state))) * 1000) / 1000, expected }, worse, broken }
  }
  return { decision: null, worse, broken }
}

export function mergeCritiques(h, b) {
  return { criteria: [...h.critique.criteria, ...b.critique.criteria], invariants: [...h.critique.invariants, ...b.critique.invariants], issues: [...(h.critique.issues || []), ...(b.critique.issues || [])], summary: '' }
}

// No combination adopted: adopt the kept order with the larger gain; the rest are
// reported as kept alone but not adopted. Mutates kept (sorts) and the losers' decisions.
export function adoptBest(state, kept) {
  const best = kept.sort((a, b) => b.decision.gain - a.decision.gain)[0]
  adopt(state, best.decision, best.build, best.critique, best.order.component)
  for (const o of kept) if (o !== best) { o.decision.kept = false; o.decision.reasons = ['kept alone, but the combination was not adopted'] }
  return best
}

// The round record: updates each worked region's history and stall bookkeeping (mutates
// state) and returns the entry the recorder writes to rounds/round-NN.json.
// baseRecipe (v3) is the baseline recipe the round's orders started from; with each
// candidate recipe and verdict it lets a later order resume a promising reverted branch.
export function recordEntry(state, limits, round, outcomes, combinedAssembly, baseRecipe) {
  const entry = { round, orders: [], baseline: state.baseline, scores: scoresNow(state), mean: meanOf(state, scoresNow(state)), combined: combinedAssembly || null }
  for (const o of outcomes.filter(Boolean)) {
    const r = state.regions[o.order.id]
    const kept = !!(o.decision && o.decision.kept)
    for (const w of o.order.with || []) {
      const rw = state.regions[w]
      rw.history.push({ round, kept, approach: '(paired with ' + o.order.id + ') ' + (o.build ? o.build.approach : '(no build)'), reason: o.failed || (o.decision ? o.decision.reasons.join('; ') : '') })
      updateStall(rw, round, limits, kept)
    }
    const reason = o.failed || (o.decision ? o.decision.reasons.join('; ') : '')
    const h = { round, kept, approach: o.build ? o.build.approach : '(no build)', reason, reusable: o.build ? o.build.reusable || [] : [] }
    if (o.decision && o.decision.verdict) h.verdict = o.decision.verdict.verdict
    if (o.build && o.build.recipe) { h.recipe = o.build.recipe; if (baseRecipe) h.base = baseRecipe }
    r.history.push(h)
    updateStall(r, round, limits, kept)
    entry.orders.push({
      region: o.order.id, component: o.order.component, priority: o.order.priority, spec: o.spec ? o.spec.path : null,
      assembly: o.build ? o.build.assembly : null, approach: o.build ? o.build.approach : null, changes: o.build ? o.build.changes : null,
      previews: o.build ? o.build.previews : null, componentBuilds: o.build ? o.build.componentBuilds : null,
      fitBefore: o.build ? o.build.fitBefore : null, fitAfter: o.build ? o.build.fitAfter : null,
      kept, keptOnVerdict: !!(o.decision && o.decision.keptOnVerdict), reason, verdict: o.decision ? o.decision.verdict : null, gain: o.decision ? o.decision.gain : null,
      after: o.decision ? o.decision.after : null, summary: o.critique ? o.critique.summary : null, parked: r.parked,
    })
  }
  return entry
}
