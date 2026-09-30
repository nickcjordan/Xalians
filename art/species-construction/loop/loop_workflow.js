export const meta = {
  name: 'akinza-construction-loop',
  description: 'Builder (Sonnet) and critic (Opus) loop that improves the Akinza model region by region with a keep-or-revert ratchet',
  phases: [
    { title: 'Baseline critique', detail: 'Opus scores every region of the current baseline', model: 'opus' },
    { title: 'Rounds', detail: 'Sonnet builds one work order, Opus critiques candidate against baseline' },
    { title: 'Gate', detail: 'Cold Opus review when scores reach the approval gate', model: 'opus' },
  ],
}

const S = JSON.parse(JSON.stringify(args.status))
const L = S.limits
const ROUNDS = args.rounds || L.roundsPerBatch
const REPO = 'C:\\Users\\njord\\.codex\\worktrees\\1d07\\Xalians'
const CRITIC_BRIEF = REPO + '\\docs\\design\\species-construction\\akinza\\loop\\critic-brief.md'
const BUILDER_BRIEF = REPO + '\\docs\\design\\species-construction\\akinza\\loop\\builder-brief.md'
const IDS = Object.keys(S.regions)
const abs = p => p.includes(':') ? p : REPO + '\\' + p.split('/').join('\\')

const ISSUE = {
  type: 'object',
  properties: {
    summary: { type: 'string' }, evidence: { type: 'string' }, fix: { type: 'string' },
    fixability: { type: 'number' },
  },
  required: ['summary', 'evidence', 'fix', 'fixability'],
}
const CRITIC = {
  type: 'object',
  properties: {
    regions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' }, score: { type: 'number' }, baselineScore: { type: 'number' },
          change: { type: 'string' }, issues: { type: 'array', items: ISSUE },
        },
        required: ['id', 'score', 'issues'],
      },
    },
    targetImproved: { type: 'boolean' },
    readyForDesigner: { type: 'boolean' },
    summary: { type: 'string' },
  },
  required: ['regions', 'readyForDesigner', 'summary'],
}
const BUILD = {
  type: 'object',
  properties: {
    failed: { type: 'boolean' }, reason: { type: 'string' },
    head: { type: 'string' }, body: { type: 'string' }, assembly: { type: 'string' }, packet: { type: 'string' },
    technicalPass: { type: 'boolean' }, changes: { type: 'string' }, commit: { type: 'string' },
  },
  required: ['failed', 'changes'],
}

function scoresOf() {
  const out = {}
  for (const id of IDS) out[id] = S.regions[id].score
  return out
}
function weightedMean() {
  let total = 0, weight = 0
  for (const id of IDS) { total += S.regions[id].weight * (S.regions[id].score || 0); weight += S.regions[id].weight }
  return Math.round(total / weight * 100) / 100
}
function applyCritique(critique, useBaselineScores) {
  for (const r of critique.regions || []) {
    if (!S.regions[r.id]) continue
    const score = useBaselineScores ? r.baselineScore : r.score
    if (typeof score === 'number') S.regions[r.id].score = score
    if (!useBaselineScores) S.regions[r.id].issues = (r.issues || []).slice(0, 3)
  }
}
function gateMet() {
  const g = L.gate
  return IDS.every(id => (S.regions[id].score || 0) >= g.minRegion)
    && weightedMean() >= g.weightedMean
    && g.identityRegions.every(id => (S.regions[id].score || 0) >= g.identityMin)
}
function pickOrder() {
  const last = S.lastOrders.slice(-L.cooldownRounds)
  const cooled = last.length === L.cooldownRounds && last.every(x => x === last[0]) ? last[0] : null
  let best = null
  for (const id of IDS) {
    const r = S.regions[id]
    if (r.parked || id === cooled || r.score === null || r.score >= L.passBar) continue
    const fix = Math.max(0.3, ...(r.issues || []).map(i => i.fixability || 0.5))
    const priority = r.weight * (L.passBar - r.score) * fix
    if (!best || priority > best.priority) best = { id, priority: Math.round(priority * 100) / 100 }
  }
  return best
}
function criticPrompt(candidatePacket, baselinePacket, order, cold) {
  let text = `Read the critic brief at ${CRITIC_BRIEF} and follow it exactly.\n\n`
  text += `Candidate packet folder: ${abs(candidatePacket)}. Read its index.json, then every image it lists, the references and measurements.json.\n`
  if (cold) {
    text += `You are seeing this model for the first time. There are no previous scores. Judge whether it is ready to show the designer for approval against the references, and score every region honestly.\n`
  } else {
    if (baselinePacket) {
      text += `Baseline packet folder: ${abs(baselinePacket)}. Compare region by region: give each region's score for the candidate and baselineScore for the baseline, and say in change what visibly differs.\n`
    }
    if (order) {
      text += `This round's work order targeted ${order.id} (${S.regions[order.id].name}) with these issues: ${JSON.stringify(order.issues)}. Set targetImproved.\n`
    }
    text += `Previous scores for continuity, not a floor or a target: ${JSON.stringify(scoresOf())}.\n`
  }
  text += `Score all twelve regions R01 to R12. Write your full output to critique.json in the candidate packet folder, then return the structured output.`
  return text
}
function builderPrompt(order, round) {
  const region = S.regions[order.id]
  return `Read the builder brief at ${BUILDER_BRIEF} and follow it.\n\n` +
    `Round ${round} work order: region ${order.id} (${region.name}).\n` +
    `Issues, most damaging first, with the critic's evidence and suggested fixes (verify and measure before acting; they are suggestions, not measurements): ${JSON.stringify(region.issues)}\n` +
    `Baseline: head ${S.baseline.head}, body ${S.baseline.body}, assembly ${S.baseline.assembly}. Baseline packet with images and measurements: ${abs(S.baseline.packet)}.\n` +
    `Acceptance, judged by the critic afterward: ${order.id} rises by at least ${L.keepGain} with no other region falling by ${L.regressionDrop} or more, and the technical check passes.\n` +
    `Return the structured output. Set assembly to your new assembled-NNNN name and packet to the packet folder you created. Always set head and body to the exact component directories your assembly used, including one you did not change.`
}

const history = []
let milestone = null

phase('Baseline critique')
if (IDS.some(id => S.regions[id].score === null)) {
  const critique = await agent(criticPrompt(S.baseline.packet, null, null, false),
    { label: 'critic: baseline ' + S.baseline.assembly, phase: 'Baseline critique', schema: CRITIC, model: 'opus', effort: 'high' })
  if (!critique) return { status: S, history, milestone: 'baseline critique failed' }
  applyCritique(critique, false)
  history.push({ round: S.round, kind: 'baseline critique', assembly: S.baseline.assembly, scores: scoresOf(), summary: critique.summary })
  log(`Baseline ${S.baseline.assembly}: weighted mean ${weightedMean()} ${JSON.stringify(scoresOf())}`)
}

phase('Rounds')
let builderFailuresInARow = 0
for (let i = 0; i < ROUNDS; i++) {
  if (gateMet()) break
  if (S.round >= L.hardStopRounds) { milestone = 'hard stop'; break }
  const order = pickOrder()
  if (!order) { milestone = 'no eligible region'; break }
  order.issues = (S.regions[order.id].issues || []).slice(0, 2).map(x => x.summary)
  S.round += 1
  const round = S.round
  const region = S.regions[order.id]
  const before = region.score
  if (region.anchorScore === null) region.anchorScore = before
  log(`Round ${round}: ${order.id} ${region.name} (score ${before}, priority ${order.priority})`)

  const build = await agent(builderPrompt(order, round),
    { label: `builder r${round}: ${order.id}`, phase: 'Rounds', schema: BUILD, model: 'sonnet', effort: 'high' })
  const entry = { round, order: { region: order.id, priority: order.priority, issues: order.issues }, scoreBefore: before }
  S.lastOrders.push(order.id)
  region.attempts += 1

  if (!build || build.failed || !build.packet || build.technicalPass === false) {
    entry.kept = false
    entry.build = build ? { failed: true, reason: build.reason || 'technical check failed', changes: build.changes, assembly: build.assembly } : { failed: true, reason: 'builder returned nothing' }
    builderFailuresInARow = build ? 0 : builderFailuresInARow + 1
    log(`Round ${round}: build failed (${entry.build.reason})`)
  } else {
    builderFailuresInARow = 0
    const critique = await agent(criticPrompt(build.packet, S.baseline.packet, order, false),
      { label: `critic r${round}: ${build.assembly}`, phase: 'Rounds', schema: CRITIC, model: 'opus', effort: 'high' })
    entry.build = { assembly: build.assembly, head: build.head, body: build.body, packet: build.packet, changes: build.changes, commit: build.commit }
    if (!critique) {
      entry.kept = false
      entry.reason = 'critic returned nothing'
    } else {
      const target = (critique.regions || []).find(r => r.id === order.id)
      const baseTarget = target && typeof target.baselineScore === 'number' ? target.baselineScore : before
      const delta = target ? Math.round((target.score - baseTarget) * 10) / 10 : 0
      const regressions = (critique.regions || []).filter(r => r.id !== order.id && typeof r.baselineScore === 'number'
        && r.baselineScore - r.score >= L.regressionDrop).map(r => ({ id: r.id, from: r.baselineScore, to: r.score, change: r.change }))
      entry.targetDelta = delta
      entry.regressions = regressions
      entry.critique = critique.summary
      const meanOf = key => {
        let total = 0, weight = 0
        for (const id of IDS) {
          const r = (critique.regions || []).find(x => x.id === id)
          const v = r && typeof r[key] === 'number' ? r[key] : S.regions[id].score
          total += S.regions[id].weight * (v || 0); weight += S.regions[id].weight
        }
        return total / weight
      }
      entry.meanGain = Math.round((meanOf('score') - meanOf('baselineScore')) * 1000) / 1000
      const needMean = typeof L.meanGain === 'number' && S.round >= (L.meanGainFromRound || 0) ? L.meanGain : -Infinity
      entry.kept = delta >= L.keepGain && regressions.length === 0 && entry.meanGain >= needMean
      if (entry.kept) {
        applyCritique(critique, false)
        S.baseline = { head: build.head || S.baseline.head, body: build.body || S.baseline.body, assembly: build.assembly, packet: build.packet }
      }
      log(`Round ${round}: ${order.id} delta ${delta}, regressions ${regressions.length}, ${entry.kept ? 'KEPT' : 'reverted'}`)
    }
  }
  if (region.score - region.anchorScore >= L.stallGain) {
    region.anchorScore = region.score
    region.attempts = 0
  } else if (region.attempts >= L.stallAttempts) {
    region.parked = true
    region.parkReason = `${region.attempts} rounds without a net gain of ${L.stallGain} (from ${region.anchorScore} to ${region.score}); needs a method change`
    log(`Parked ${order.id}: ${region.parkReason}`)
  }
  entry.scoresAfter = scoresOf()
  entry.weightedMean = weightedMean()
  history.push(entry)
  if (builderFailuresInARow >= 2) { milestone = 'builder unavailable'; break }
}

phase('Gate')
if (gateMet()) {
  const cold = await agent(criticPrompt(S.baseline.packet, null, null, true),
    { label: 'cold gate review ' + S.baseline.assembly, phase: 'Gate', schema: CRITIC, model: 'opus', effort: 'high' })
  if (cold) {
    applyCritique(cold, false)
    history.push({ round: S.round, kind: 'cold gate review', assembly: S.baseline.assembly, scores: scoresOf(), ready: cold.readyForDesigner, summary: cold.summary })
    milestone = cold.readyForDesigner && gateMet() ? 'approval gate reached' : 'gate review found blockers'
  }
}

return { status: S, history, milestone, weightedMean: weightedMean() }
