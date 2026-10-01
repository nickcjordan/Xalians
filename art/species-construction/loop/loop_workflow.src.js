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
// Order pools: the species config's (args.pools), else v2's head R01-R04, body R05-R11, whole figure R12.
const POOLS = defaultPools(args.pools)
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

//@core

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
  const results = resultsAfter(S, critique, Object.fromEntries(IDS.map(id => [id, {}])))
  for (const id of IDS) {
    S.regions[id].results = results[id]
    S.regions[id].score = scoreFrom(RUBRIC, results[id], id)
    S.regions[id].issues = (critique.issues || []).filter(i => i.region === id).slice(0, 3)
  }
  S.invariants = Object.fromEntries((critique.invariants || []).map(i => [i.id, i.ok]))
  // A cold re-score after round 0 (a rubric change) is recorded beside that round, never over it.
  const kind = S.round > 0 ? 'rescore' : 'baseline'
  const entry = { round: S.round, kind, assembly: S.baseline.assembly, scores: scoresNow(S), mean: meanOf(S, scoresNow(S)), summary: critique.summary }
  await agent(recordPrompt(S.round, entry, kind === 'rescore' ? '-rescore' : ''), { label: 'record: baseline', phase: 'Baseline', model: 'haiku', effort: 'low' })
  log(`Cold baseline ${S.baseline.assembly}: mean ${entry.mean} ${JSON.stringify(entry.scores)}`)
}

phase('Rounds')
let milestone = null
for (let i = 0; i < ROUNDS; i++) {
  if (gateMet(S, L)) break
  if (S.round >= L.hardStopRounds) { milestone = 'hard stop'; break }
  const round = S.round + 1
  const orders = pickOrders(S, L, round, POOLS)
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
    out.decision = judge(S, RUBRIC, L, order, b, out.critique, { pools: POOLS })
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
      const merged = mergeCritiques(h, b)
      const check = await agent(
        criticPrompt(combine.packet, { note: `The head change for ${h.order.id} and the body change for ${b.order.id} were each kept on their own; this packet has both.` }, 'combined'),
        { label: `critic r${round} combined: ${combine.assembly}`, phase: 'Rounds', schema: CRITIC, model: 'opus', effort: 'medium' })
      if (check) {
        const cd = combineDecision(S, RUBRIC, h, b, merged, check)
        if (cd.decision) {
          combined = { build: combine, decision: cd.decision }
          adopt(S, combined.decision, combine, merged, 'both')
        } else {
          log(`Round ${round}: combination regressed (${cd.worse.join(', ')} ${cd.broken.join(', ')}); keeping the larger single gain`)
        }
      }
    }
  }
  if (!combined && kept.length) {
    adoptBest(S, kept)
  }

  const entry = recordEntry(S, L, round, outcomes, combined ? combined.build.assembly : null)
  await agent(recordPrompt(round, entry), { label: `record r${round}`, phase: 'Rounds', model: 'haiku', effort: 'low' })
  log(`Round ${round}: ` + entry.orders.map(o => `${o.region} ${o.kept ? 'KEPT' : 'reverted'}`).join(' | ') + ` mean ${entry.mean}`)
}

phase('Gate')
if (gateMet(S, L)) {
  const cold = await agent(criticPrompt(S.baseline.packet, null, 'cold'),
    { label: 'cold gate review ' + S.baseline.assembly, phase: 'Gate', schema: CRITIC, model: 'opus', effort: 'high' })
  if (cold) {
    const results = resultsAfter(S, cold, Object.fromEntries(IDS.map(id => [id, {}])))
    for (const id of IDS) { S.regions[id].results = results[id]; S.regions[id].score = scoreFrom(RUBRIC, results[id], id) }
    milestone = cold.readyForDesigner && gateMet(S, L) ? 'approval gate reached' : 'gate review found blockers'
  }
}
return { status: S, milestone, mean: meanOf(S, scoresNow(S)) }
