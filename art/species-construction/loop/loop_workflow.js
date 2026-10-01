export const meta = {
  name: 'akinza-construction-loop-v2',
  description: 'Akinza loop v2: specs, parallel head and body builders with silhouette self-checks, checklist critics, keep-or-revert',
  phases: [
    { title: 'Baseline', detail: 'Cold checklist critique of the baseline when results are missing', model: 'opus' },
    { title: 'Rounds', detail: 'Per order: spec (first time), builder, critic; then combine and record' },
    { title: 'Gate', detail: 'Cold review when the checklist scores reach the approval gate', model: 'opus' },
  ],
}

const S = JSON.parse(JSON.stringify(args.status))
const RUBRIC = args.rubric
const L = S.limits
const ROUNDS = args.rounds ?? L.roundsPerBatch
const REPO = 'C:\\dev\\src\\xalians-akinza-loop'
const LOOPDIR = REPO + '\\docs\\design\\species-construction\\akinza\\loop'
const BRIEF = name => LOOPDIR + '\\' + name
const IDS = Object.keys(S.regions)
const HEAD = ['R01', 'R02', 'R03', 'R04']
const BODY = ['R05', 'R06', 'R07', 'R08', 'R09', 'R10', 'R11']
// Every worked region gets a spec before its first build (round 1: the unspecced head build took 61 minutes, the specced tail build 18).
const SPEC_REGIONS = ['R01', 'R02', 'R03', 'R04', 'R05', 'R06', 'R07', 'R08', 'R09', 'R10', 'R11']
const AUDIT = LOOPDIR + '\\gap-audit-0226.md'
const abs = p => p.includes(':') ? p : REPO + '\\' + p.split('/').join('\\')
S.specs = S.specs || {}
for (const id of IDS) {
  const r = S.regions[id]
  r.results = r.results || {}
  r.history = r.history || []
  if (r.lastWorked === undefined) r.lastWorked = null
}

const RESULT = { type: 'string', enum: ['pass', 'partial', 'fail'] }
const ISSUE = {
  type: 'object',
  properties: {
    region: { type: 'string' }, summary: { type: 'string' }, evidence: { type: 'string' },
    fix: { type: 'string' }, fixability: { type: 'number' },
  },
  required: ['region', 'summary', 'fix', 'fixability'],
}
const CRITIC = {
  type: 'object',
  properties: {
    criteria: {
      type: 'array',
      items: { type: 'object', properties: { id: { type: 'string' }, result: RESULT, evidence: { type: 'string' } }, required: ['id', 'result', 'evidence'] },
    },
    pairwise: {
      type: 'array',
      items: {
        type: 'object',
        properties: { region: { type: 'string' }, verdict: { type: 'string', enum: ['better', 'same', 'worse'] }, reason: { type: 'string' } },
        required: ['region', 'verdict', 'reason'],
      },
    },
    invariants: {
      type: 'array',
      items: { type: 'object', properties: { id: { type: 'string' }, ok: { type: 'boolean' }, evidence: { type: 'string' } }, required: ['id', 'ok', 'evidence'] },
    },
    issues: { type: 'array', items: ISSUE },
    readyForDesigner: { type: 'boolean' },
    summary: { type: 'string' },
  },
  required: ['criteria', 'invariants', 'summary'],
}
const BUILD = {
  type: 'object',
  properties: {
    failed: { type: 'boolean' }, reason: { type: 'string' },
    head: { type: 'string' }, body: { type: 'string' }, assembly: { type: 'string' }, packet: { type: 'string' },
    technicalPass: { type: 'boolean' }, approach: { type: 'string' }, changes: { type: 'string' },
    previews: { type: 'number' }, componentBuilds: { type: 'number' },
    fitBefore: { type: 'string' }, fitAfter: { type: 'string' },
    reusable: { type: 'array', items: { type: 'object', properties: { option: { type: 'string' }, what: { type: 'string' } }, required: ['option', 'what'] } },
    commit: { type: 'string' },
  },
  required: ['failed', 'changes', 'approach'],
}
const SPEC = { type: 'object', properties: { path: { type: 'string' }, image: { type: 'string' }, summary: { type: 'string' } }, required: ['path', 'summary'] }

const credit = r => r === 'pass' ? 1 : r === 'partial' ? 0.5 : 0
function scoreFrom(results, id) {
  const crits = RUBRIC.regions[id]
  if (crits.some(c => !results[c.id])) return null
  return Math.round(10 * crits.reduce((t, c) => t + credit(results[c.id]), 0) / crits.length * 10) / 10
}
function meanOf(scores) {
  let t = 0, w = 0
  for (const id of IDS) { t += S.regions[id].weight * (scores[id] || 0); w += S.regions[id].weight }
  return Math.round(t / w * 1000) / 1000
}
const scoresNow = () => Object.fromEntries(IDS.map(id => [id, S.regions[id].score]))
function resultsAfter(critique, base) {
  const merged = {}
  for (const id of IDS) merged[id] = { ...base[id] }
  for (const c of critique.criteria || []) {
    const region = c.id.split('.')[0]
    if (merged[region]) merged[region][c.id] = c.result
  }
  return merged
}
const baseResults = () => Object.fromEntries(IDS.map(id => [id, S.regions[id].results]))
function gateMet() {
  const g = L.gate
  return IDS.every(id => (S.regions[id].score || 0) >= g.minRegion) && meanOf(scoresNow()) >= g.weightedMean
    && g.identityRegions.every(id => (S.regions[id].score || 0) >= g.identityMin)
}

function priority(id, round) {
  const r = S.regions[id]
  if (r.parked || r.score === null || r.score >= L.passBar) return null
  const fix = Math.max(0.3, ...(r.issues || []).map(i => i.fixability || 0.5))
  let p = r.weight * (L.passBar - r.score) * fix
  const idle = r.lastWorked === null ? round : round - r.lastWorked
  if (idle >= L.coverageRounds) p += 100 + idle  // coverage: a region idle this long goes next
  return Math.round(p * 100) / 100
}
function pickOrders(round) {
  const last = S.lastOrders.slice(-L.cooldownRounds)
  const cooled = id => last.length === L.cooldownRounds && last.every(x => x.includes(id))
  const best = pool => pool.filter(id => !cooled(id)).map(id => ({ id, priority: priority(id, round) }))
    .filter(x => x.priority !== null).sort((a, b) => b.priority - a.priority)[0] || null
  const both = best(['R12'])
  const head = best(HEAD), body = best(BODY)
  if (both && both.priority > Math.max(head ? head.priority : 0, body ? body.priority : 0)) return [{ ...both, component: 'both' }]
  return [head && { ...head, component: 'head' }, body && { ...body, component: 'body' }].filter(Boolean)
}

function criteriaText(id) {
  return RUBRIC.regions[id].map(c => `${c.id} (${c.kind}, now ${S.regions[id].results[c.id] || 'unjudged'}): ${c.text}`).join('\n')
}
function criticPrompt(packet, order, mode) {
  let t = `Read the critic brief at ${BRIEF('critic-brief.md')}, the rubric at ${BRIEF('rubric.json')} and the invariants at ${BRIEF('invariants.json')}, and follow them exactly.

`
  t += `Packet folder: ${abs(packet)}. Read its index.json, then every image it lists, the references, measurements.json, fit.json and measured.json${mode === 'cold' ? '' : ', and diff.json'}.
`
  if (mode === 'cold') {
    t += 'This is a cold baseline request. Judge every visual criterion of every region, copy every measured criterion, report every invariant, and list up to three issues per region.\n'
  } else if (mode === 'combined') {
    t += `Baseline packet folder, for comparison: ${abs(S.baseline.packet)}.
`
    t += `This is a combination check. ${order.note} Judge the visual criteria of every region diff.json lists as changed, copy measured criteria, and report every invariant. Give no pairwise verdicts and no issues.
`
  } else {
    t += `Baseline packet folder, for comparison: ${abs(S.baseline.packet)}.
`
    t += `This is a candidate request. Target region: ${order.id} (${S.regions[order.id].name}). Its criteria and current baseline results:
${criteriaText(order.id)}
`
    t += 'Judge the target region\'s visual criteria and give the pairwise verdict for it. Then judge the visual criteria of every other region diff.json lists as changed. Copy measured criteria for all regions. Report every invariant. List up to three issues for the target region.\n'
  }
  t += 'Write your full output to critique.json in the packet folder, then return the structured output.'
  return t
}
function historyCard(id) {
  const h = S.regions[id].history
  if (!h.length) return 'No earlier attempts are recorded for this region under the checklist.'
  return h.slice(-6).map(e => `Round ${e.round}: ${e.kept ? 'KEPT' : 'REVERTED'}. Approach: ${e.approach}. ${e.reason ? 'Reason: ' + e.reason + '. ' : ''}${e.reusable && e.reusable.length ? 'Reusable: ' + e.reusable.map(x => x.option + ' (' + x.what + ')').join('; ') : ''}`).join('\n')
}
function builderPrompt(order, round) {
  const r = S.regions[order.id]
  const spec = S.specs[order.id]
  return `Read the builder brief at ${BRIEF('builder-brief.md')} and follow it.\n\n` +
    `Round ${round} work order for the ${order.component === 'both' ? 'head and body' : order.component} component: region ${order.id} (${r.name}).\n` +
    `Rubric criteria with the baseline's current results. Turn failing or partial criteria into passes without breaking passing ones:\n${criteriaText(order.id)}\n\n` +
    `Critic issues, most damaging first (suggestions to verify, not measurements): ${JSON.stringify(r.issues || [])}\n\n` +
    (spec ? `Target spec: ${spec.path}${spec.image ? ' with image ' + spec.image : ''}. Implement its structure table.\n\n` : '') +
    `History card for this region:\n${historyCard(order.id)}\n\n` +
    `Gap audit (independent, ranked by how much each gap stops the model reading as the sheet): ${AUDIT}. Read the rows for your region and fix the most visible gap first, not the easiest criterion. A structural gap (a wrong length, cross section, depth, joint position, or a part built the wrong way) is fixed by rebuilding that part or by the proportion levers named in the builder brief, never by stacking more surface warps on it.\n\n` +
    `Baseline: head ${S.baseline.head}, body ${S.baseline.body}, assembly ${S.baseline.assembly}. Baseline packet: ${abs(S.baseline.packet)} (fit.json and measured.json are in it). ` +
    (order.component === 'both' ? 'You may change both components.' : `Change only the ${order.component}; assemble with the baseline ${order.component === 'head' ? 'body ' + S.baseline.body : 'head ' + S.baseline.head}.`) + '\n' +
    `Keep: the critic must judge ${order.id} better, at least one of its criteria must improve, no region may lose credit, and no invariant may newly break.\n` +
    'Return the structured output with head and body set to the exact component directories your assembly used, assembly and packet set to yours, approach as one recognisable sentence, and reusable options you added.'
}
function specPrompt(order) {
  return `Read the spec brief at ${BRIEF('spec-brief.md')} and follow it. Region: ${order.id} (${S.regions[order.id].name}).\n` +
    `Criteria:\n${criteriaText(order.id)}\n\nHistory card:\n${historyCard(order.id)}\n\n` +
    `Gap audit: ${AUDIT}. The spec must close this region's rows in it, most visible first, and say for each whether it is structural (rebuild or proportion lever) or a local surface fix.\n\n` +
    `Current baseline packet: ${abs(S.baseline.packet)}. Write ${LOOPDIR}\\specs\\${order.id}.md and ${LOOPDIR}\\specs\\${order.id}.png, commit them by name on branch akinza/construction-loop with a plain message and no Co-Authored-By trailer, and return the structured output.`
}

function judge(order, build, critique) {
  const before = scoresNow()
  const results = resultsAfter(critique, baseResults())
  const after = {}
  for (const id of IDS) { const s = scoreFrom(results[id], id); after[id] = s === null ? before[id] : s }
  const target = order.id
  const pair = (critique.pairwise || []).find(p => p.region === target)
  // A side-effect loss of up to regressionDrop in one other region is allowed when the
  // weighted mean still rises (round 2: a head build that took R01 from 2.5 to 6.9 was
  // reverted for smoothing the cheek tufts, R02 3.3 to 2.5). The loss becomes the
  // region's top issue so the next order repays it.
  const lost = IDS.filter(id => after[id] !== null && before[id] !== null && after[id] < before[id])
  const drops = lost.filter(id => id === order.id || before[id] - after[id] > L.regressionDrop || lost.length > 1)
  const baseInv = S.invariants || {}
  const broken = (critique.invariants || []).filter(i => !i.ok && baseInv[i.id] !== false).map(i => i.id)
  const gain = Math.round((meanOf(after) - meanOf(before)) * 1000) / 1000
  const reasons = []
  if (!pair || pair.verdict !== 'better') reasons.push(`critic verdict ${pair ? pair.verdict : 'missing'}`)
  if (!(after[target] > before[target])) reasons.push(`${target} checklist ${before[target]} to ${after[target]}`)
  if (drops.length) reasons.push('lost credit in ' + drops.map(id => `${id} ${before[id]} to ${after[id]}`).join(', '))
  if (broken.length) reasons.push('broke invariant ' + broken.join(', '))
  if (gain < L.meanGain) reasons.push(`weighted mean ${gain >= 0 ? '+' : ''}${gain}`)
  const debts = lost.filter(id => !drops.includes(id)).map(id => ({ region: id, before: before[id], after: after[id], by: target }))
  return { kept: !reasons.length, reasons, results, after, gain, debts, verdict: pair || null, invariants: critique.invariants || [] }
}
function adopt(decision, build, critique, component) {
  for (const id of IDS) {
    S.regions[id].results = decision.results[id]
    S.regions[id].score = decision.after[id]
  }
  for (const i of critique.issues || []) {
    if (S.regions[i.region]) S.regions[i.region].issues = (critique.issues || []).filter(x => x.region === i.region).slice(0, 3)
  }
  for (const d of decision.debts || []) {
    const r = S.regions[d.region]
    r.issues = [{ region: d.region, summary: `Repay a side-effect loss: the kept ${d.by} change took ${d.region} from ${d.before} to ${d.after}`, fix: `Restore the ${d.region} criteria that the ${d.by} change lost (see the critic evidence for that round) without undoing it`, fixability: 0.9 }, ...(r.issues || [])].slice(0, 3)
  }
  S.invariants = Object.fromEntries(decision.invariants.map(i => [i.id, i.ok]))
  S.baseline = {
    head: component === 'body' ? S.baseline.head : (build.head || S.baseline.head),
    body: component === 'head' ? S.baseline.body : (build.body || S.baseline.body),
    assembly: build.assembly, packet: build.packet,
  }
}
function recordPrompt(round, entry, suffix) {
  return `Write one file exactly, byte for byte, with the Write tool. Do not reformat, summarise or change anything.
` +
    `File: ${LOOPDIR}\\rounds\\round-${String(round).padStart(2, '0')}${suffix || ''}.json
Content:
${JSON.stringify(entry)}

Reply with the word done.`
}

phase('Baseline')
if (args.coldBaseline || IDS.some(id => S.regions[id].score === null)) {
  const critique = await agent(criticPrompt(S.baseline.packet, null, 'cold'),
    { label: 'critic: cold baseline ' + S.baseline.assembly, phase: 'Baseline', schema: CRITIC, model: 'opus', effort: 'high' })
  if (!critique) return { status: S, milestone: 'baseline critique failed' }
  const results = resultsAfter(critique, Object.fromEntries(IDS.map(id => [id, {}])))
  for (const id of IDS) {
    S.regions[id].results = results[id]
    S.regions[id].score = scoreFrom(results[id], id)
    S.regions[id].issues = (critique.issues || []).filter(i => i.region === id).slice(0, 3)
  }
  S.invariants = Object.fromEntries((critique.invariants || []).map(i => [i.id, i.ok]))
  // A cold re-score after round 0 (a rubric change) is recorded beside that round, never over it.
  const kind = S.round > 0 ? 'rescore' : 'baseline'
  const entry = { round: S.round, kind, assembly: S.baseline.assembly, scores: scoresNow(), mean: meanOf(scoresNow()), summary: critique.summary }
  await agent(recordPrompt(S.round, entry, kind === 'rescore' ? '-rescore' : ''), { label: 'record: baseline', phase: 'Baseline', model: 'haiku', effort: 'low' })
  log(`Cold baseline ${S.baseline.assembly}: mean ${entry.mean} ${JSON.stringify(entry.scores)}`)
}

phase('Rounds')
let milestone = null
for (let i = 0; i < ROUNDS; i++) {
  if (gateMet()) break
  if (S.round >= L.hardStopRounds) { milestone = 'hard stop'; break }
  const round = S.round + 1
  const orders = pickOrders(round)
  if (!orders.length) { milestone = 'no eligible region'; break }
  S.round = round
  S.lastOrders.push(orders.map(o => o.id).join('+'))
  log(`Round ${round}: ` + orders.map(o => `${o.component} ${o.id} ${S.regions[o.id].name} (score ${S.regions[o.id].score}, priority ${o.priority})`).join(' | '))
  const baselineAtStart = JSON.parse(JSON.stringify(S.baseline))

  const outcomes = await parallel(orders.map(order => async () => {
    const out = { order }
    if (SPEC_REGIONS.includes(order.id) && !S.specs[order.id]) {
      const spec = await agent(specPrompt(order), { label: `spec r${round}: ${order.id}`, phase: 'Rounds', schema: SPEC, model: 'opus', effort: 'high' })
      if (spec) { S.specs[order.id] = { path: spec.path, image: spec.image, summary: spec.summary, round }; out.spec = spec }
    }
    out.build = await agent(builderPrompt(order, round),
      { label: `builder r${round} ${order.component}: ${order.id}`, phase: 'Rounds', schema: BUILD, model: 'sonnet', effort: 'high' })
    const b = out.build
    if (!b || b.failed || !b.packet || b.technicalPass === false) { out.failed = b ? (b.reason || 'technical check failed') : 'builder returned nothing'; return out }
    out.critique = await agent(criticPrompt(b.packet, order, 'candidate'),
      { label: `critic r${round} ${order.component}: ${b.assembly}`, phase: 'Rounds', schema: CRITIC, model: 'opus', effort: 'high' })
    if (!out.critique) { out.failed = 'critic returned nothing'; return out }
    out.decision = judge(order, b, out.critique)
    return out
  }))

  const kept = outcomes.filter(o => o && o.decision && o.decision.kept)
  let combined = null
  if (kept.length === 2) {
    const [h, b] = kept[0].order.component === 'head' ? kept : [kept[1], kept[0]]
    const combine = await agent(
      `Read the builder brief at ${BRIEF('builder-brief.md')} for the environment rules. Do not change geometry. ` +
      `Assemble head ${h.build.head} with body ${b.build.body} into a new assembled-NNNN (get the number with next-number), then run check, packet into untracked/species-construction/akinza/loop/packets/<name>, and diff against the baseline packet ${abs(baselineAtStart.packet)}. ` +
      'Return the structured output with failed, changes (one line), approach "combine", head, body, assembly, packet and technicalPass.',
      { label: `combine r${round}`, phase: 'Rounds', schema: BUILD, model: 'sonnet', effort: 'medium' })
    if (combine && !combine.failed && combine.packet && combine.technicalPass !== false) {
      const merged = { criteria: [...h.critique.criteria, ...b.critique.criteria], invariants: [...h.critique.invariants, ...b.critique.invariants], issues: [...(h.critique.issues || []), ...(b.critique.issues || [])], summary: '' }
      const check = await agent(
        criticPrompt(combine.packet, { note: `The head change for ${h.order.id} and the body change for ${b.order.id} were each kept on their own; this packet has both.` }, 'combined'),
        { label: `critic r${round} combined: ${combine.assembly}`, phase: 'Rounds', schema: CRITIC, model: 'opus', effort: 'medium' })
      if (check) {
        const results = resultsAfter(check, resultsAfter(merged, baseResults()))
        const after = Object.fromEntries(IDS.map(id => [id, scoreFrom(results[id], id) ?? S.regions[id].score]))
        const expected = Object.fromEntries(IDS.map(id => [id, Math.max(h.decision.after[id] ?? 0, b.decision.after[id] ?? 0)]))
        const worse = IDS.filter(id => after[id] < Math.min(h.decision.after[id] ?? 0, b.decision.after[id] ?? 0))
        const broken = (check.invariants || []).filter(i => !i.ok && (S.invariants || {})[i.id] !== false).map(i => i.id)
        if (!worse.length && !broken.length) {
          combined = { build: combine, decision: { kept: true, results, after, invariants: check.invariants, gain: Math.round((meanOf(after) - meanOf(scoresNow())) * 1000) / 1000, expected } }
          adopt(combined.decision, combine, merged, 'both')
        } else {
          log(`Round ${round}: combination regressed (${worse.join(', ')} ${broken.join(', ')}); keeping the larger single gain`)
        }
      }
    }
  }
  if (!combined && kept.length) {
    const best = kept.sort((a, b) => b.decision.gain - a.decision.gain)[0]
    adopt(best.decision, best.build, best.critique, best.order.component)
    for (const o of kept) if (o !== best) { o.decision.kept = false; o.decision.reasons = ['kept alone, but the combination was not adopted'] }
  }

  const entry = { round, orders: [], baseline: S.baseline, scores: scoresNow(), mean: meanOf(scoresNow()), combined: combined ? combined.build.assembly : null }
  for (const o of outcomes.filter(Boolean)) {
    const r = S.regions[o.order.id]
    const kept = !!(o.decision && o.decision.kept)
    const reason = o.failed || (o.decision ? o.decision.reasons.join('; ') : '')
    r.history.push({ round, kept, approach: o.build ? o.build.approach : '(no build)', reason, reusable: o.build ? o.build.reusable || [] : [] })
    r.lastWorked = round
    r.attempts = (r.attempts || 0) + 1
    if (r.anchorScore === null || r.anchorScore === undefined) r.anchorScore = r.score
    if (r.score - r.anchorScore >= L.stallGain) { r.anchorScore = r.score; r.attempts = 0 }
    else if (r.attempts >= L.stallAttempts) { r.parked = true; r.parkReason = `${r.attempts} rounds without a net gain of ${L.stallGain}` }
    entry.orders.push({
      region: o.order.id, component: o.order.component, priority: o.order.priority, spec: o.spec ? o.spec.path : null,
      assembly: o.build ? o.build.assembly : null, approach: o.build ? o.build.approach : null, changes: o.build ? o.build.changes : null,
      previews: o.build ? o.build.previews : null, componentBuilds: o.build ? o.build.componentBuilds : null,
      fitBefore: o.build ? o.build.fitBefore : null, fitAfter: o.build ? o.build.fitAfter : null,
      kept, reason, verdict: o.decision ? o.decision.verdict : null, gain: o.decision ? o.decision.gain : null,
      after: o.decision ? o.decision.after : null, summary: o.critique ? o.critique.summary : null, parked: r.parked,
    })
  }
  await agent(recordPrompt(round, entry), { label: `record r${round}`, phase: 'Rounds', model: 'haiku', effort: 'low' })
  log(`Round ${round}: ` + entry.orders.map(o => `${o.region} ${o.kept ? 'KEPT' : 'reverted'}`).join(' | ') + ` mean ${entry.mean}`)
}

phase('Gate')
if (gateMet()) {
  const cold = await agent(criticPrompt(S.baseline.packet, null, 'cold'),
    { label: 'cold gate review ' + S.baseline.assembly, phase: 'Gate', schema: CRITIC, model: 'opus', effort: 'high' })
  if (cold) {
    const results = resultsAfter(cold, Object.fromEntries(IDS.map(id => [id, {}])))
    for (const id of IDS) { S.regions[id].results = results[id]; S.regions[id].score = scoreFrom(results[id], id) }
    milestone = cold.readyForDesigner && gateMet() ? 'approval gate reached' : 'gate review found blockers'
  }
}
return { status: S, milestone, mean: meanOf(scoresNow()) }
