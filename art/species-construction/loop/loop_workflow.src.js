export const meta = {
  name: 'species-construction-loop-v3',
  description: 'Construction loop v3: gap audit, method plan and specs, then recipe-edit orders with containment, scoped critics, keep-or-revert, plateau escalation',
  phases: [
    { title: 'Baseline', detail: 'Cold checklist critique of the baseline when results are missing', model: 'opus' },
    { title: 'Prepare', detail: 'Gap audit (kickoff list for Nick), method plan, specs in parallel', model: 'opus' },
    { title: 'Rounds', detail: 'Per order: builder edits the recipe, critic on the target and changed regions; combine by recipe merge; record' },
    { title: 'Gate', detail: 'Cold review when the checklist scores reach the approval gate', model: 'opus' },
  ],
}

// Source of the generated loop_workflow.js (node build_workflow.mjs). Contract:
// docs/design/species-construction/LOOP-v3.md. Arguments come from
// `python art/species-construction/loop/loop_state.py args <species>`: {species, pools, rubric, status},
// plus rounds, coldBaseline, freshAudit and replan when asked for.
const S = JSON.parse(JSON.stringify(args.status))
const RUBRIC = args.rubric
const SP = args.species || { key: 'akinza' }
const L = S.limits
const ROUNDS = args.rounds ?? L.roundsPerBatch
const REPO = 'C:\\dev\\src\\xalians-akinza-loop'
const BRANCH = 'akinza/construction-loop'
const SPECIESDIR = REPO + '\\docs\\design\\species-construction\\' + SP.key
const LOOPDIR = SPECIESDIR + '\\loop'
const PACKETS = 'untracked/species-construction/' + SP.key + '/loop/packets'
const BRIEF = name => LOOPDIR + '\\' + name
const IDS = Object.keys(S.regions)
// Order pools: the species config's (args.pools), else v2's head R01-R04, body R05-R11, whole figure R12.
const POOLS = defaultPools(args.pools)
// Pairs of regions one tool builds together (species.json "pairs"), ordered as one job.
const PAIRS = SP.pairs || []
// The side-effect carry threshold. The judge simulator found a real defect (round 8: a tail
// dent, R10 4.2 to 3.3) at an image change of .0023, so the threshold is capped below it
// whatever the shakedown calibrates.
const THRESHOLD = Math.min(SP.sideEffectThreshold ?? 0.0005, 0.0015)
const abs = p => !p ? p : p.includes(':') ? p : REPO + '\\' + p.split('/').join('\\')
S.specs = S.specs || {}
S.methods = S.methods || {}
S.tools = S.tools || {}
S.means = S.means || []
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
    auditRows: { type: 'array', items: { type: 'object', properties: { rank: { type: 'number' }, resolved: { type: 'boolean' }, evidence: { type: 'string' } }, required: ['rank', 'resolved'] } },
    readyForDesigner: { type: 'boolean' },
    summary: { type: 'string' },
  },
  required: ['criteria', 'invariants', 'summary'],
}
const BUILD = {
  type: 'object',
  properties: {
    failed: { type: 'boolean' }, reason: { type: 'string' },
    recipe: { type: 'string' },
    head: { type: 'string' }, body: { type: 'string' }, assembly: { type: 'string' }, packet: { type: 'string' },
    technicalPass: { type: 'boolean' }, approach: { type: 'string' }, changes: { type: 'string' },
    previews: { type: 'number' }, componentBuilds: { type: 'number' },
    fitBefore: { type: 'string' }, fitAfter: { type: 'string' },
    regionChange: { type: 'object', additionalProperties: { type: 'number' } },
    containment: { type: 'string' },
    reusable: { type: 'array', items: { type: 'object', properties: { option: { type: 'string' }, what: { type: 'string' } }, required: ['option', 'what'] } },
    commit: { type: 'string' },
  },
  required: ['failed', 'changes', 'approach'],
}
const SPEC = { type: 'object', properties: { path: { type: 'string' }, image: { type: 'string' }, summary: { type: 'string' }, structure: { type: 'string' } }, required: ['path', 'summary'] }
const AUDIT_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    gaps: { type: 'array', items: { type: 'object', properties: { rank: { type: 'number' }, region: { type: 'string' }, gap: { type: 'string' }, structural: { type: 'boolean' } }, required: ['rank', 'region', 'gap'] } },
  },
  required: ['path', 'gaps'],
}
const METHOD = {
  type: 'object',
  properties: {
    region: { type: 'string' }, method: { type: 'string' }, steps: { type: 'string' },
    changed: { type: 'boolean' }, respec: { type: 'boolean' }, why: { type: 'string' },
  },
  required: ['region', 'method', 'changed', 'respec'],
}
const TOOL = { type: 'object', properties: { region: { type: 'string' }, script: { type: 'string' }, recipe: { type: 'string' }, ready: { type: 'boolean' }, notes: { type: 'string' } }, required: ['region', 'ready', 'notes'] }
const METHODS = { type: 'object', properties: { path: { type: 'string' }, regions: { type: 'array', items: METHOD } }, required: ['path', 'regions'] }
const REVIEW = { type: 'object', properties: { ...METHOD.properties, unpark: { type: 'boolean' } }, required: ['region', 'method', 'unpark', 'respec'] }

//@core

const workable = id => !S.regions[id].hold
function criteriaText(id) {
  return RUBRIC.regions[id].map(c => `${c.id} (${c.kind}, now ${S.regions[id].results[c.id] || 'unjudged'})${c.text ? ': ' + c.text : ''}`).join('\n') +
    (RUBRIC.regions[id].some(c => c.text) ? '' : `\n(Criterion texts and the images each names: ${BRIEF('rubric.json')}.)`)
}
function criticPrompt(packet, order, mode, scope) {
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
    for (const w of order.with || []) t += `Paired target region (one order builds both; judge it and give its own pairwise verdict exactly like the target): ${w} (${S.regions[w].name}). Its criteria and current baseline results:
${criteriaText(w)}
` + auditLines(w)
    if (featuresOn() && (S.auditGaps || []).some(g => g.region === order.id)) t += auditLines(order.id) + 'Check each audit row against the images yourself. A criterion that one of these rows shows failing in both models cannot pass. For every audit row listed for the target (and any paired target), return auditRows with its rank and resolved true only when this candidate no longer shows the problem the row describes.\n'
    t += 'Judge the target region\'s visual criteria and give the pairwise verdict for it. ' +
      (scope && scope.length ? `Then judge the visual criteria of these other regions, whose images changed more than the side-effect threshold: ${scope.join(', ')}. Leave every other region's visual criteria out; their images did not move enough to judge. ` : 'No other region\'s images moved more than the side-effect threshold, so judge no other region\'s visual criteria. ') +
      'Copy measured criteria for all regions. Report every invariant. List up to three issues for the target region.\n'
  }
  t += 'Write your full output to critique.json in the packet folder, then return the structured output.'
  return t
}
function historyCard(id) {
  const h = S.regions[id].history
  if (!h.length) return 'No earlier attempts are recorded for this region under the checklist.'
  return h.slice(-6).map(e => `Round ${e.round}: ${e.kept ? 'KEPT' : 'REVERTED'}. Approach: ${e.approach}. ${e.reason ? 'Reason: ' + e.reason + '. ' : ''}${e.reusable && e.reusable.length ? 'Reusable: ' + e.reusable.map(x => x.option + ' (' + x.what + ')').join('; ') : ''}`).join('\n')
}
// A reverted candidate the critic judged better is a promising branch: the region's next
// order starts from it instead of from scratch (round 17: the rear fan clump volume was
// judged better but reverted for a small side loss, and a method change rarely flips its
// criteria on the first build).
function branchLine(id) {
  if (!featuresOn()) return ''
  const last = S.regions[id].history.slice(-1)[0]
  if (!last || last.kept || last.verdict !== 'better' || !last.recipe) return ''
  return `Promising branch: round ${last.round}'s candidate ${abs(last.recipe)} was judged better but reverted (${last.reason}). Start from it: carry its changes onto the current baseline with recipe.py rebase <current baseline recipe> <that candidate> <your candidate> (it reads the candidate's derivedFrom block; a candidate made before that block was added needs the old base as a first argument, from git), then fix what it was reverted for.\n\n`
}
// The audit's rows for a region, in the builder and critic prompts: the checklist can pass a
// part the independent audit still ranks as a top gap.
// A tool the method plan needed, built by a toolsmith before the rounds: its starter recipe
// adds the new step, and the region's first order tunes it instead of writing it.
function toolLine(id) {
  const t = S.tools[id]
  if (!t || !t.recipe) return ''
  S.regions[id].toolUsed = true
  return `Tool for this method: ${t.script || 'see the starter recipe'}, built and smoke-tested by a toolsmith before the rounds. Its starter recipe ${abs(t.recipe)} adds the step to the baseline (rebase it with recipe.py rebase <current baseline recipe> <starter> <your candidate> if the baseline has moved). Start from it (unless a promising branch is listed above), tune its parameters, and change the script only to fix what tuning cannot reach.\n\n`
}
function toolPrompt(t) {
  return `Read the toolsmith brief at ${BRIEF('toolsmith-brief.md')} and follow it. Region ${t.region} (${S.regions[t.region].name}). The method plan (${BRIEF('methods.md')}, ${BRIEF('methods.json')}) needs a tool that does not exist yet: ${t.script}. Method: ${S.methods[t.region] || ''}\n` +
    (S.specs[t.region] ? `Region spec: ${abs(S.specs[t.region].path)}.\n` : '') +
    `Baseline recipe: ${abs(S.baseline.recipe)}. Baseline packet: ${abs(S.baseline.packet)}. Write the starter recipe to ${LOOPDIR}\\recipes\\tool-${t.region}.json and the ready record to ${LOOPDIR}\\tools\\${t.region}.json, commit by name on branch ${BRANCH} with a plain message and no Co-Authored-By trailer, and return the structured output.`
}
function auditLines(id) {
  if (!featuresOn()) return ''
  const rows = (S.auditGaps || []).filter(g => g.region === id)
  if (!rows.length) return ''
  return `Independent audit rows for ${id} (rank: gap): ${rows.map(g => `${g.rank}: ${g.gap}`).join(' | ')}\n\n`
}
// args.featuresFrom: the first round that uses the round 17 additions (branches, audit rows,
// reopen), so a run started before them resumes from the journal with every earlier agent cached.
const FEATURES_FROM = args.featuresFrom ?? 0
let roundNow = 0
const featuresOn = () => roundNow >= FEATURES_FROM
const candidateRecipe = (round, id) => `${LOOPDIR}\\recipes\\r${String(round).padStart(2, '0')}-${id}.json`
function builderPrompt(order, round, suffix) {
  const r = S.regions[order.id]
  const spec = S.specs[order.id]
  const scopeLine = order.component === 'join'
    ? 'This is a join order: change only the recipe\'s assembly step (its args, through the --join parameters of loop_tools.py assemble). Do not change any head or body step.'
    : order.component === 'both' ? 'You may change head and body steps.'
    : `Change only ${order.component} steps whose regions include ${order.id}, or add a ${order.component} step tagged with ${order.id}.`
  const partners = (order.with || []).map(w => `Paired region ${w} (${S.regions[w].name}), built by the same tool and judged with this order: neither region may lose credit and their combined score must rise.\nIts criteria:\n${criteriaText(w)}\nIts issues: ${S.regions[w].issues ? JSON.stringify(S.regions[w].issues) : 'see status.json'}\n` + branchLine(w) + auditLines(w)).join('\n')
  return `Read the builder brief at ${BRIEF('builder-brief.md')} and follow it, including its recipe section.\n\n` +
    `Round ${round} work order for the ${order.component === 'both' ? 'head and body' : order.component} component: region ${order.id} (${r.name})${order.with ? ' together with ' + order.with.join(', ') : ''}.\n` +
    (partners ? partners + '\n' : '') +
    (S.methods[order.id] ? `Method for this region (${BRIEF('methods.md')}): ${S.methods[order.id]}\n` : '') +
    `Rubric criteria with the baseline's current results. Turn failing or partial criteria into passes without breaking passing ones:\n${criteriaText(order.id)}\n\n` +
    `Critic issues, most damaging first (suggestions to verify, not measurements): ${r.issues ? JSON.stringify(r.issues) : 'read this region\'s issues in ' + BRIEF('status.json')}\n\n` +
    (spec ? `Target spec: ${abs(spec.path)}${spec.image ? ' with image ' + abs(spec.image) : ''}. Implement its structure table.\n` + (spec.structure ? `Structure table from the spec:\n${spec.structure}\n` : '') + '\n' : '') +
    `History card for this region:\n${historyCard(order.id)}\n\n` +
    branchLine(order.id) +
    toolLine(order.id) +
    auditLines(order.id) +
    (S.audit ? `Gap audit (independent, ranked by how much each gap stops the model reading as the sheet): ${abs(S.audit)}. Read the rows for your region and fix the most visible gap first, not the easiest criterion. A structural gap (a wrong length, cross section, depth, joint position, or a part built the wrong way) is fixed by rebuilding that part, by a parameter of the step that authors it, or by the proportion levers named in the builder brief, never by stacking more surface warps on it.\n\n` : '') +
    `Shared sheet measurement: ${BRIEF('sheet.json')} (outlines, station tables, landmarks; overlay sheet.png). Compare against it with sheet_measure.py model rather than re-tracing the sheet.\n\n` +
    'Search parameters with recipe.py sweep (many values in one call, scored automatically) rather than one build per turn, and read the seam check (loop_tools.py quick --baseline prints it; the packet has seams.json) before you hand over: a new crease, collar or step at a joint is the side effect that reverted the last two promising candidates.\n\n' +
    `Baseline recipe: ${abs(S.baseline.recipe)}. Baseline: head ${S.baseline.head}, body ${S.baseline.body}, assembly ${S.baseline.assembly}. Baseline packet: ${abs(S.baseline.packet)} (fit.json and measured.json are in it).\n` +
    `Your candidate recipe: ${candidateRecipe(round, order.id + (suffix || ''))}. ${scopeLine} Run recipe.py build --dry-run first: it prints what rebuilds and the minutes it costs. An early head step rebuilds the chain after it (about 25 minutes per build), so prefer changing or adding a step as late in the chain as the region allows. Build it with recipe.py build, run recipe.py contain on every new component step, then packet into ${PACKETS}/<assembly> and diff against the baseline packet.\n` +
    `Keep: the critic must judge ${order.id} better, at least one of its criteria must improve, no region may lose credit, and no invariant may newly break.\n` +
    'Return the structured output with recipe set to your candidate recipe path, head and body set to the component directories your assembly used, assembly and packet set to yours, regionChange set to the magnitude of every region in diff.json regionChange (region id to number), containment as one line (the largest foreign-region displacement and where), approach as one recognisable sentence, and reusable options you added.'
}
function specPrompt(id) {
  return `Read the spec brief at ${BRIEF('spec-brief.md')} and follow it. Region: ${id} (${S.regions[id].name}).\n` +
    (S.methods[id] ? `Method chosen for this region (${BRIEF('methods.md')}): ${S.methods[id]}. Write the spec so a builder can implement it with that method.\n` : '') +
    `Criteria:\n${criteriaText(id)}\n\nHistory card:\n${historyCard(id)}\n\n` +
    (S.audit ? `Gap audit: ${abs(S.audit)}. The spec must close this region's rows in it, most visible first, and say for each whether it is structural (rebuild or proportion lever) or a local surface fix.\n\n` : '') +
    `Start from the generated targets: run python art/species-construction/loop/spec_targets.py ${SP.key} ${id} --baseline ${S.baseline.assembly} (it writes specs/${id}-targets.md, .json and .png: the zone's sheet station rows against the model, the landmarks and the measured criteria). Take every measurement from it or from ${BRIEF('sheet.json')}; spend your own effort on the structure table, cross sections and failure looks, not on re-measuring.\n\n` +
    `Current baseline packet: ${abs(S.baseline.packet)}. Write ${LOOPDIR}\\specs\\${id}.md and ${LOOPDIR}\\specs\\${id}.png, commit them by name on branch ${BRANCH} with a plain message and no Co-Authored-By trailer, and return the structured output.`
}
function auditPrompt() {
  const held = IDS.filter(id => !workable(id))
  return `You are the independent gap auditor of the construction loop (docs/design/species-construction/LOOP-v3.md). Compare the current model with the reference sheet and rank the gaps by how much each one stops the model reading as the creature on the sheet, most damaging first. Follow the format and strictness of the previous audit ${S.audit ? abs(S.audit) : BRIEF('gap-audit-0226.md')}, but judge only what you see now.\n\n` +
    `Model packet: ${abs(S.baseline.packet)} (index.json lists the images; m01 is the sheet, m11 the silhouette overlay). References: ${SPECIESDIR}\\evidence\\. Shared sheet measurement: ${BRIEF('sheet.json')} and sheet.png. Rubric: ${BRIEF('rubric.json')}. Current scores per region: ${JSON.stringify(scoresNow(S))}.\n` +
    (held.length ? `Regions on hold by Nick's direction, not to be ranked: ${held.map(id => id + ' ' + S.regions[id].name).join(', ')}.\n` : '') +
    `For each gap give the region, what is wrong in one or two sentences with its view, and whether it is structural (a length, cross section, depth, joint position, count, or a part built the wrong way) or a surface fix. Write ${LOOPDIR}\\gap-audit-${S.baseline.assembly.replace('assembled-', '')}.md, commit it by name on branch ${BRANCH} with a plain message and no Co-Authored-By trailer, and return the structured output with its repository-relative path and the ranked gaps.`
}
function methodPrompt() {
  return `Read the method brief at ${BRIEF('method-brief.md')} and follow its planning section for every region.\n` +
    `Baseline packet: ${abs(S.baseline.packet)}. Recipe: ${abs(S.baseline.recipe)}. Gap audit: ${abs(S.audit)}. Status (scores, results, issues, history): ${BRIEF('status.json')}.\n` +
    `Regions on hold by Nick's direction (method "hold", no change): ${IDS.filter(id => !workable(id)).join(', ') || 'none'}. Parked regions: ${IDS.filter(id => S.regions[id].parked).join(', ') || 'none'}. For a parked region, set changed true only when the method is different from what its history shows stalled.\n` +
    'Set respec true for a region whose current spec would mislead a builder using the new method. Return the structured output with one entry per region.'
}
function reviewPrompt(id, why) {
  return `Read the method brief at ${BRIEF('method-brief.md')} and follow its method review section for region ${id} (${S.regions[id].name}). ${why}\n` +
    `Its current method: ${S.methods[id] || 'none recorded'}. History card:\n${historyCard(id)}\n` +
    `Status: ${BRIEF('status.json')}. Baseline packet: ${abs(S.baseline.packet)}. Recipe: ${abs(S.baseline.recipe)}.\n` +
    'Return the structured output: the new method, unpark true only when the new method is a real change that can close the remaining gap, respec true when the region\'s spec must be rewritten for it.'
}
function combinePrompt(a, b, round, baselinePacket) {
  return `Read the builder brief at ${BRIEF('builder-brief.md')} for the environment rules. Do not change geometry or scripts. ` +
    `Merge the two kept candidate recipes with python art/species-construction/loop/recipe.py merge ${abs(S.baseline.recipe)} ${abs(a.build.recipe)} ${abs(b.build.recipe)} ${candidateRecipe(round, 'combined')}, ` +
    `build it with recipe.py build, then run loop_tools.py check, packet into ${PACKETS}/<assembly>, and diff against the baseline packet ${abs(baselinePacket)}. ` +
    'Return the structured output with failed, changes (one line), approach "combine", recipe, head, body, assembly, packet, regionChange (the magnitude of every region in diff.json regionChange) and technicalPass.'
}

// ---- v3.4: plan, execute, select (audit 2026-10-02 recommendations 8 and 11) -------------
// The builder is split: a planner writes a plan of recipe variants, a cheap runner executes it
// with one blocking command (recipe.py run-plan) and makes blind reader packs, three blind
// readers pick the candidate that reads most like the reference, and only then does the scoped
// critic grade the chosen one. Lean agent type for every role that does not edit code: each
// turn of the default type re-reads about 61K tokens of project instructions it does not need.
const LEAN = L.leanAgentType === undefined ? 'Explore' : L.leanAgentType
const leanOpts = o => LEAN ? { ...o, agentType: LEAN } : o
const PLAN_OUT = { type: 'object', properties: { plan: { type: 'string' }, variants: { type: 'number' }, approach: { type: 'string' }, needsCode: { type: 'boolean' }, codeTask: { type: 'string' } }, required: ['approach', 'needsCode'] }
const RUN_OUT = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' }, reason: { type: 'string' },
    candidates: { type: 'array', items: { type: 'object', properties: {
      name: { type: 'string' }, recipe: { type: 'string' }, head: { type: 'string' }, body: { type: 'string' }, assembly: { type: 'string' }, packet: { type: 'string' },
      technicalPass: { type: 'boolean' }, regionChange: { type: 'object', additionalProperties: { type: 'number' } }, seams: { type: 'string' }, measured: { type: 'string' }, pack: { type: 'string' }, keys: { type: 'object', additionalProperties: { type: 'string' } },
    }, required: ['assembly', 'packet'] } },
  },
  required: ['ok', 'candidates'],
}
const READ_OUT = { type: 'object', properties: { packs: { type: 'array', items: { type: 'object', properties: { pack: { type: 'string' }, region: { type: 'string' }, choice: { type: 'string', enum: ['A', 'B', 'same'] }, reason: { type: 'string' }, remaining: { type: 'string' } }, required: ['pack', 'region', 'choice', 'reason'] } } }, required: ['packs'] }

function plannerPrompt(order, round, refine) {
  return `Read the planner brief at ${BRIEF('planner-brief.md')} and the plan format at ${BRIEF('plan-schema.md')}, and follow them.\n\n` +
    builderPrompt(order, round).replace(/^Read the builder brief[^\n]*\n\n/, '') +
    `\n\nWrite the plan to ${LOOPDIR}\\plans\\r${String(round).padStart(2, '0')}-${order.id}${refine ? '-refine' : ''}.json. Do not build anything yourself.` +
    (refine ? `\n\nThis is the refine pass. The first plan's results: ${refine}. Plan variants that fix what the readers and measurements said.` : '')
}
function runnerPrompt(plan, order, round) {
  const seed = `r${round}-${order.id}`
  return `You run one command and report its result. Start it with the Bash tool and run_in_background true, then wait for its completion notice; do not poll, sleep or tail logs while it runs.\n` +
    `Command: python art/species-construction/loop/recipe.py run-plan ${plan} --top ${L.planTop ?? 3}\n` +
    `Working directory: ${REPO}. When it finishes, read plan-result.json beside the plan. For each top candidate that has a packet, run python art/species-construction/loop/reader_pack.py ${abs(S.baseline.packet)} <candidate packet> --regions ${[order.id, ...(order.with || [])].join(',')} --out <candidate packet>\\reader-pack --seed ${seed}-<candidate name>, and set its pack to that folder and its keys to the side the candidate is on for each region, from the pack key.json (A when aIsCandidate is true, else B). Never show key.json to anyone.\n` +
    'Return the structured output: ok, and per candidate its name, recipe, head, body, assembly, packet, technicalPass, regionChange (region to magnitude, from candidate.json), seams and measured as one line each from candidate.json, and pack. If the command failed, ok false and the reason.'
}
function readerPrompt(packs, order, k) {
  return `Read the reader brief at ${BRIEF('reader-brief.md')} and follow it. You are reader ${k + 1} of three; you work alone.\n` +
    `Packs to judge (each folder holds pack.json and its panels): ${packs.join(' ; ')}.\n` +
    `For every pack and every region it lists, say which of A and B reads more like the Reference, or same. Return the structured output.`
}
// Majority of three readers per candidate, mapped back to better, same or worse against the baseline.
function readerVerdicts(cands, reads, regions) {
  const out = []
  for (const c of cands) {
    const per = {}
    for (const rid of regions) {
      let better = 0, worse = 0
      const reasons = []
      for (const r of reads) {
        const norm = s => String(s || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
        const e = r && (r.packs || []).find(p => c.pack && p.pack && p.region === rid && (norm(c.pack).endsWith(norm(p.pack)) || norm(p.pack).endsWith(norm(c.pack))))
        if (!e) continue
        // the candidate's side in the pack comes from the runner's key; the pack folder records it as key.json, read by the runner into c.keys
        const side = (c.keys || {})[rid] || 'B'
        if (e.choice === side) better++; else if (e.choice !== 'same') worse++
        reasons.push(e.reason)
      }
      per[rid] = { verdict: better >= 2 ? 'better' : worse >= 2 ? 'worse' : 'same', better, worse, reason: reasons.join(' | ') }
    }
    out.push({ cand: c, per, score: Object.values(per).reduce((t, v) => t + v.better - v.worse, 0) })
  }
  return out.sort((a, b) => b.score - a.score)
}

function recordPrompt(round, entry, suffix) {
  return `Write one file exactly, byte for byte, with the Write tool. Do not reformat, summarise or change anything.
` +
    `File: ${LOOPDIR}\\rounds\\round-${String(round).padStart(2, '0')}${suffix || ''}.json
Content:
${JSON.stringify(entry)}

Reply with the word done.`
}
function snapshot() {
  const regions = {}
  for (const id of IDS) {
    const r = S.regions[id]
    regions[id] = { score: r.score, results: r.results, attempts: r.attempts, anchorScore: r.anchorScore, lastWorked: r.lastWorked, parked: !!r.parked, parkReason: r.parkReason || null, toolUsed: !!r.toolUsed, issues: r.issues || [], history: r.history.slice(-2) }
  }
  return { round: S.round, baseline: S.baseline, lastOrders: S.lastOrders, invariants: S.invariants, specs: S.specs, tools: S.tools, auditGaps: S.auditGaps || [], audit: S.audit || null, keptSinceAudit: S.keptSinceAudit || 0, means: S.means, regions }
}
function applyMethod(m, unparkOk) {
  const r = S.regions[m.region]
  if (!r || !workable(m.region)) return
  S.methods[m.region] = m.method
  if (m.respec) delete S.specs[m.region]
  if (unparkOk && r.parked) { r.parked = false; r.parkReason = null; r.attempts = 0; r.anchorScore = r.score; r.methodChanged = S.round }
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
  S.means = [entry.mean]
  log(`Cold baseline ${S.baseline.assembly}: mean ${entry.mean} ${JSON.stringify(entry.scores)}`)
}

// Prepare: the kickoff gap list, the method per region, and every missing spec in one
// parallel pass, so no round starts by inventing a method or a target.
phase('Prepare')
let kickoff = null
if (!S.audit || args.freshAudit) {
  const audit = await agent(auditPrompt(), { label: 'audit ' + S.baseline.assembly, phase: 'Prepare', schema: AUDIT_SCHEMA, model: 'opus', effort: 'high' })
  if (audit) {
    S.audit = audit.path
    kickoff = audit.gaps.slice().sort((a, b) => a.rank - b.rank).slice(0, 12)
    S.auditGaps = kickoff.map(g => ({ rank: g.rank, region: g.region, gap: g.gap, structural: !!g.structural }))
    // The kickoff check: the orchestrator sends this list to Nick as a progress note; the rounds do not wait for him.
    log('KICKOFF gaps ' + JSON.stringify(kickoff))
  }
}
let replanned = false
if (!Object.keys(S.methods).length || args.replan) {
  const plan = await agent(methodPrompt(), { label: 'methods ' + S.baseline.assembly, phase: 'Prepare', schema: METHODS, model: 'opus', effort: 'high' })
  if (plan) {
    for (const m of plan.regions || []) applyMethod(m, !!m.changed)
    replanned = true
    log('Methods: ' + (plan.regions || []).map(m => `${m.region} ${m.changed ? 'NEW' : 'same'}${m.respec ? ' respec' : ''}`).join(', '))
  }
}
// Plateau is measured from the last method change: a new plan starts a fresh window.
if (replanned) S.means = [meanOf(S, scoresNow(S))]
const toSpec = IDS.filter(id => workable(id) && !S.specs[id] && !S.regions[id].parked && (S.regions[id].score ?? 0) < L.passBar)
if (toSpec.length) {
  const specs = await parallel(toSpec.map(id => () => agent(specPrompt(id), { label: `spec: ${id}`, phase: 'Prepare', schema: SPEC, model: 'opus', effort: 'high' })))
  specs.forEach((spec, i) => { if (spec) S.specs[toSpec[i]] = { path: spec.path, image: spec.image, summary: spec.summary, structure: spec.structure, round: S.round } })
}
// Tools: a method that needs a new generator gets it from a toolsmith before any order, so
// rounds tune parameters instead of writing generators inside a six-build budget (round 18's
// fan front builder spent 77 minutes writing its generator and never handed over).
const toBuild = (args.tools || []).filter(t => !t.ready && S.regions[t.region] && workable(t.region) && !S.regions[t.region].parked && !S.tools[t.region])
if (toBuild.length) {
  const built = await parallel(toBuild.map(t => () => agent(toolPrompt(t), { label: `tool: ${t.region}`, phase: 'Prepare', schema: TOOL, model: 'sonnet', effort: 'high' })))
  built.forEach((r, i) => { if (r && r.ready) S.tools[toBuild[i].region] = { script: r.script || toBuild[i].script, recipe: r.recipe } })
  log('Tools: ' + toBuild.map((t, i) => `${t.region} ${built[i] && built[i].ready ? 'ready' : 'not ready'}`).join(', '))
}
for (const t of args.tools || []) if (t.ready && t.recipe && !S.tools[t.region]) S.tools[t.region] = { script: t.script, recipe: t.recipe }

phase('Rounds')
let milestone = null
let escalated = false
const reviewed = new Set()
for (let i = 0; i < ROUNDS; i++) {
  if (gateMet(S, L)) break
  if (S.round >= L.hardStopRounds) { milestone = 'hard stop'; break }
  const round = S.round + 1
  roundNow = round
  // Reopen: a region above the pass bar with a structural gap in the audit's top ten is worked again.
  // Audit refresh: after limits.auditRefreshKept kept orders, a fresh audit re-ranks the gaps,
  // so a region the loop has fixed stops carrying its old rank (round 20: the fan back kept
  // its rank 1 bonus after its shard bowl was gone).
  if (L.auditRefreshKept && (S.keptSinceAudit || 0) >= L.auditRefreshKept) {
    const fresh = await agent(auditPrompt(), { label: `audit r${round}: ${S.baseline.assembly}`, phase: 'Rounds', schema: AUDIT_SCHEMA, model: 'opus', effort: 'high' })
    if (fresh) {
      S.audit = fresh.path
      S.auditGaps = fresh.gaps.slice().sort((a, b) => a.rank - b.rank).slice(0, 12).map(g => ({ rank: g.rank, region: g.region, gap: g.gap, structural: !!g.structural }))
      S.keptSinceAudit = 0
      log(`Round ${round}: audit refreshed: ` + S.auditGaps.map(g => g.rank + ' ' + g.region).join(', '))
    }
  }
  if (featuresOn()) {
    for (const id of IDS) S.regions[id].reopen = false
    for (const g of S.auditGaps || []) if (g.structural && g.rank <= 10 && S.regions[g.region] && workable(g.region)) S.regions[g.region].reopen = true
  }
  const orders = pickOrders(S, L, round, POOLS, PAIRS)
  if (!orders.length) { milestone = 'no eligible region'; break }
  S.round = round
  S.lastOrders.push(orders.map(o => [o.id, ...(o.with || [])].join('+')).join('+'))
  log(`Round ${round}: ` + orders.map(o => `${o.component} ${o.id} ${S.regions[o.id].name} (score ${S.regions[o.id].score}, priority ${o.priority})`).join(' | '))
  const baselineAtStart = JSON.parse(JSON.stringify(S.baseline))
  const parkedBefore = new Set(IDS.filter(id => S.regions[id].parked))

  // Builder effort trial (args.effortTrial, first round of the batch only): the first order
  // also runs a twin builder at medium effort on the same baseline, judged by its own critic
  // and recorded, never adopted. Builders were 61 percent of the v2 tokens.
  const trial = args.effortTrial && i === 0 ? orders[0] : null
  const trialRun = trial ? (async () => {
    const tb = await agent(builderPrompt(trial, round, '-medium') + ' This is an effort trial twin: build in your own new directories, never commit, and edit no committed script; put any script change in a new file named after the original with a -trial suffix.',
      { label: `builder r${round} ${trial.component}: ${trial.id} (medium trial)`, phase: 'Rounds', schema: BUILD, model: 'sonnet', effort: 'medium' })
    if (!tb || tb.failed || !tb.packet || tb.technicalPass === false) return { failed: tb ? (tb.reason || 'technical check failed') : 'builder returned nothing' }
    const frozenT = trial.component === 'head' ? [...POOLS.body, ...POOLS.join] : trial.component === 'body' ? POOLS.head : []
    const scopeT = sideEffectRegions(tb.regionChange ? { regionChange: tb.regionChange } : null, trial.id, THRESHOLD, SP.regionImages, IDS).filter(id => !frozenT.includes(id))
    const tc = await agent(criticPrompt(tb.packet, trial, 'candidate', scopeT),
      { label: `critic r${round} ${trial.component}: ${tb.assembly} (medium trial)`, phase: 'Rounds', schema: CRITIC, model: 'opus', effort: 'high' })
    if (!tc) return { failed: 'critic returned nothing', build: tb }
    const d = judge(S, RUBRIC, L, trial, tb, tc, { pools: POOLS, regionChange: tb.regionChange || null, threshold: tb.regionChange ? THRESHOLD : null, regionImages: SP.regionImages })
    return { build: tb, kept: d.kept, reasons: d.reasons, after: d.after, gain: d.gain, verdict: d.verdict }
  })() : null

  const outcomes = await parallel(orders.map(order => async () => {
    const out = { order }
    for (const w of order.with || []) if (!S.specs[w]) {
      const ws = await agent(specPrompt(w), { label: `spec r${round}: ${w}`, phase: 'Rounds', schema: SPEC, model: 'opus', effort: 'high' })
      if (ws) S.specs[w] = { path: ws.path, image: ws.image, summary: ws.summary, structure: ws.structure, round }
    }
    if (!S.specs[order.id]) {
      const spec = await agent(specPrompt(order.id), { label: `spec r${round}: ${order.id}`, phase: 'Rounds', schema: SPEC, model: 'opus', effort: 'high' })
      if (spec) { S.specs[order.id] = { path: spec.path, image: spec.image, summary: spec.summary, structure: spec.structure, round }; out.spec = spec }
    }
    if (L.builderMode === 'split') {
      const plan = await agent(plannerPrompt(order, round), leanOpts({ label: `planner r${round} ${order.component}: ${order.id}`, phase: 'Rounds', schema: PLAN_OUT, model: 'sonnet', effort: 'high' }))
      if (plan && plan.needsCode) {
        // a plan that needs a script change goes to the code builder, which builds one candidate itself
        out.build = await agent(builderPrompt(order, round) + `\n\nThe planner asked for this code change first: ${plan.codeTask}`,
          { label: `builder r${round} ${order.component}: ${order.id}`, phase: 'Rounds', schema: BUILD, model: 'sonnet', effort: 'high' })
      } else if (plan && plan.plan) {
        let picked = null
        for (let pass = 0; pass <= (L.refinePasses ?? 1) && !picked; pass++) {
          const thePlan = pass === 0 ? plan : await agent(plannerPrompt(order, round, out.firstPass), leanOpts({ label: `planner r${round} ${order.component}: ${order.id} refine`, phase: 'Rounds', schema: PLAN_OUT, model: 'sonnet', effort: 'high' }))
          if (!thePlan || !thePlan.plan) break
          const run = await agent(runnerPrompt(thePlan.plan, order, round), leanOpts({ label: `runner r${round} ${order.component}: ${order.id}${pass ? ' refine' : ''}`, phase: 'Rounds', schema: RUN_OUT, model: 'haiku', effort: 'low' }))
          const cands = run && run.ok ? (run.candidates || []).filter(c => c.packet && c.technicalPass !== false && c.pack) : []
          if (!cands.length) { out.firstPass = run ? (run.reason || 'no candidate built') : 'runner returned nothing'; continue }
          const regions = [order.id, ...(order.with || [])]
          const reads = await parallel([0, 1, 2].map(k => () => agent(readerPrompt(cands.map(c => c.pack), order, k), leanOpts({ label: `reader ${k + 1} r${round}: ${order.id}${pass ? ' refine' : ''}`, phase: 'Rounds', schema: READ_OUT, model: 'opus', effort: 'medium' }))))
          const ranked = readerVerdicts(cands, reads.filter(Boolean), regions)
          out.readers = ranked.map(x => ({ assembly: x.cand.assembly, per: x.per }))
          const best = ranked[0]
          if (best && regions.some(rid => best.per[rid].verdict === 'better') && !regions.some(rid => best.per[rid].verdict === 'worse')) picked = best
          else out.firstPass = JSON.stringify(ranked.map(x => ({ candidate: x.cand.name, per: x.per })))
        }
        if (picked) {
          out.build = { failed: false, recipe: picked.cand.recipe, head: picked.cand.head, body: picked.cand.body, assembly: picked.cand.assembly, packet: picked.cand.packet, technicalPass: true,
            approach: plan.approach, changes: plan.approach, regionChange: picked.cand.regionChange }
          out.readerVerdict = picked.per
        } else out.build = { failed: true, reason: 'no candidate read better than the baseline: ' + (out.firstPass || '').slice(0, 300), changes: '', approach: plan.approach }
      } else out.build = { failed: true, reason: 'planner returned no plan', changes: '', approach: '' }
    } else {
      out.build = await agent(builderPrompt(order, round),
        { label: `builder r${round} ${order.component}: ${order.id}`, phase: 'Rounds', schema: BUILD, model: 'sonnet', effort: 'high' })
    }
    const b = out.build
    if (!b || b.failed || !b.packet || b.technicalPass === false) { out.failed = b ? (b.reason || 'technical check failed') : 'builder returned nothing'; return out }
    // The critic looks at the target and at regions whose images moved past the threshold;
    // a component the order did not touch is frozen by the judge, so it is not judged either.
    const frozen = order.component === 'head' ? [...POOLS.body, ...POOLS.join] : order.component === 'body' ? POOLS.head : []
    // At most the two regions that moved most past the threshold (audit 2026-10-02: a 0.0005
    // threshold exempted almost nothing, so every critique graded 54 to 79 criteria); the
    // measured criteria and the seam check guard the rest.
    const targetsHere = [order.id, ...(order.with || [])]
    const mag = regionMagnitude(b.regionChange ? { regionChange: b.regionChange } : null, SP.regionImages)
    const scope = sideEffectRegions(b.regionChange ? { regionChange: b.regionChange } : null, order.id, THRESHOLD, SP.regionImages, IDS)
      .filter(id => !frozen.includes(id) && !targetsHere.includes(id) && !S.regions[id].hold)
      .sort((x, y) => (mag[y] ?? 1) - (mag[x] ?? 1)).slice(0, L.criticScopeMax ?? 2)
    out.critique = await agent(criticPrompt(b.packet, order, 'candidate', scope),
      leanOpts({ label: `critic r${round} ${order.component}: ${b.assembly}`, phase: 'Rounds', schema: CRITIC, model: 'opus', effort: 'high' }))
    if (!out.critique) { out.failed = 'critic returned nothing'; return out }
    if (out.readerVerdict) {
      const rv = Object.entries(out.readerVerdict).map(([region, v]) => ({ region, verdict: v.verdict, reason: 'readers ' + v.better + ' better, ' + v.worse + ' worse: ' + v.reason.slice(0, 400) }))
      out.critique = { ...out.critique, criticPairwise: out.critique.pairwise, pairwise: rv }
    }
    out.decision = judge(S, RUBRIC, L, order, b, out.critique,
      { pools: POOLS, regionChange: b.regionChange || null, threshold: b.regionChange ? THRESHOLD : null, regionImages: SP.regionImages })
    return out
  }))

  const trialOutcome = trialRun ? await trialRun : null
  const kept = outcomes.filter(o => o && o.decision && o.decision.kept)
  let combined = null
  if (kept.length === 2 && kept.every(o => o.build.recipe)) {
    const [a, b] = kept
    const combine = await agent(combinePrompt(a, b, round, baselineAtStart.packet),
      { label: `combine r${round}`, phase: 'Rounds', schema: BUILD, model: 'sonnet', effort: 'medium' })
    if (combine && !combine.failed && combine.packet && combine.technicalPass !== false) {
      const merged = mergeCritiques(a, b)
      const check = await agent(
        criticPrompt(combine.packet, { note: `The ${a.order.component} change for ${a.order.id} and the ${b.order.component} change for ${b.order.id} were each kept on their own; this packet has both.` }, 'combined'),
        { label: `critic r${round} combined: ${combine.assembly}`, phase: 'Rounds', schema: CRITIC, model: 'opus', effort: 'medium' })
      if (check) {
        const cd = combineDecision(S, RUBRIC, a, b, merged, check)
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
  const adopted = combined ? kept : kept.filter(o => o.decision.kept)
  const resolved = new Set(adopted.flatMap(o => (o.critique.auditRows || []).filter(a => a.resolved).map(a => a.rank)))
  if (resolved.size) {
    log(`Round ${round}: audit rows resolved by kept work: ${[...resolved].join(', ')}`)
    S.auditGaps = (S.auditGaps || []).filter(g => !resolved.has(g.rank))
  }
  S.keptSinceAudit = (S.keptSinceAudit || 0) + adopted.length

  const entry = recordEntry(S, L, round, outcomes, combined ? combined.build.assembly : null, baselineAtStart.recipe || null)
  entry.recipe = S.baseline.recipe || null
  if (trialOutcome) entry.effortTrial = { region: trial.id, effort: 'medium', assembly: trialOutcome.build ? trialOutcome.build.assembly : null, kept: !!trialOutcome.kept, reasons: trialOutcome.reasons || [trialOutcome.failed], gain: trialOutcome.gain ?? null, verdict: trialOutcome.verdict || null }
  S.means.push(entry.mean)
  // The state after this round rides in the record, so a stopped batch resumes with
  // loop_state.py merge <round file> instead of a journal replay.
  entry.state = snapshot()
  await agent(recordPrompt(round, entry), leanOpts({ label: `record r${round}`, phase: 'Rounds', model: 'haiku', effort: 'low' }))
  log(`Round ${round}: ` + entry.orders.map(o => `${o.region} ${o.kept ? 'KEPT' : 'reverted'}`).join(' | ') + ` mean ${entry.mean}`)

  // Method review: a region that parked this round gets one new method per batch, and
  // unparks when the reviewer names a real change (v2 parked four regions and no method
  // change ever reached them inside a batch).
  for (const id of IDS.filter(x => S.regions[x].parked && !parkedBefore.has(x) && !reviewed.has(x) && workable(x))) {
    reviewed.add(id)
    const rv = await agent(reviewPrompt(id, `It parked in round ${round}: ${S.regions[id].parkReason}.`),
      { label: `method review r${round}: ${id}`, phase: 'Rounds', schema: REVIEW, model: 'opus', effort: 'medium' })
    if (rv) { applyMethod({ ...rv, region: id }, !!rv.unpark); log(`Method review ${id}: ${rv.unpark ? 'unparked with a new method' : 'stays parked'}`) }
  }

  // Plateau: the first time the last rounds gain too little, review the method of the two
  // highest-priority regions and start a fresh window; the second time, stop and report.
  if (plateau(S, L)) {
    if (escalated) { milestone = 'plateau'; break }
    escalated = true
    const top = IDS.filter(id => workable(id) && !reviewed.has(id)).map(id => ({ id, p: priority(S, L, id, round + 1) }))
      .filter(x => x.p !== null).sort((a, b) => b.p - a.p).slice(0, 2).map(x => x.id)
    log(`Round ${round}: plateau (${S.means.slice(-1 - (L.plateauRounds ?? 3)).join(', ')}); method review for ${top.join(', ')}`)
    const reviews = await parallel(top.map(id => () => agent(reviewPrompt(id, `The loop has plateaued: the last rounds gained less than ${L.plateauGain ?? 0.15} together, and this region ranks highest.`),
      { label: `method review r${round}: ${id}`, phase: 'Rounds', schema: REVIEW, model: 'opus', effort: 'medium' })))
    reviews.forEach((rv, k) => { reviewed.add(top[k]); if (rv) applyMethod({ ...rv, region: top[k] }, false) })
    S.means = [S.means[S.means.length - 1]]
  }
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
return { status: S, milestone, mean: meanOf(S, scoresNow(S)), kickoff }
