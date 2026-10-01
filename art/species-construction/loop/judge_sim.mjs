// Judge simulator: re-decide every recorded round of a species with loop_core.js.
//
//   node judge_sim.mjs <species> [--rules rules.json | --preset name] [--journals dir] [--follow] [--json]
//
// Inputs: the round records (orders, assemblies, recorded keep or revert), each candidate
// packet's critique (from the workflow journal when it has one, else the packet's
// critique.json), measured.json and diff.json, and the start-of-round results, which the
// simulator rebuilds by applying its own decisions in order from the round 1 cold rescore
// (critique-rescore.json of the rescored assembly). --follow applies the recorded
// decisions instead, which localises a difference to the round that caused it.
//
// rules.json: {"name", "measuredRefresh": bool, "carry": {"threshold": n} | null,
//              "plateau": {"rounds": n, "gain": x} | null}. The default is v2 as it ran.
// Presets: v2, v2m (v2 plus measured results re-read from packets, the round 14 fix),
// carry.002, carry.005, carry.01 (v2m plus the side-effect carry at that threshold).
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import * as core from './loop_core.js'
import { DEFAULT_JOURNALS, criticFor, indexJournal, loadRounds, loadSpecies, maybeJson, packetOf, readJournals, readJson, speciesPaths } from './loop_sim_lib.mjs'

export const PRESETS = {
  v2: { name: 'v2' },
  v2m: { name: 'v2m', measuredRefresh: true },
  'carry.002': { name: 'carry.002', measuredRefresh: true, carry: { threshold: 0.002 } },
  'carry.005': { name: 'carry.005', measuredRefresh: true, carry: { threshold: 0.005 } },
  'carry.01': { name: 'carry.01', measuredRefresh: true, carry: { threshold: 0.01 } },
}

// Differences between the recorded decision and the v2 rules that are not rule differences:
// the corrections made by hand when the orchestrator replayed a stopped run.
export const MANUAL = {
  '13:R03': 'round 13: the pose refit moved R08.10 on an identical body; recorded kept after the freeze rule was added',
  '14:R08': 'round 14: baseline carried a stale frozen R08.10 (a pass from assembled-0408; assembled-0419 measures .829); recorded kept after the measured results were re-read from the packets',
}

const short = (x, n) => String(x).length > n ? String(x).slice(0, n - 1) + '~' : String(x)
const num = x => x === null || x === undefined ? 'n/a' : (x >= 0 ? '+' : '') + x

export function initialState(species, rubric, status, packetsDir, rescore) {
  const S = JSON.parse(JSON.stringify(status))
  const critique = readJson(join(packetsDir, rescore.assembly, 'critique-rescore.json'))
  const measured = maybeJson(join(packetsDir, rescore.assembly, 'measured.json'))
  const crit = core.overlayMeasured(rubric, critique, measured)
  const results = core.resultsAfter(S, crit, Object.fromEntries(Object.keys(S.regions).map(id => [id, {}])))
  for (const id of Object.keys(S.regions)) {
    const r = S.regions[id]
    r.results = results[id]
    const s = core.scoreFrom(rubric, results[id], id)
    r.score = s === null ? rescore.scores[id] : s
    r.issues = (critique.issues || []).filter(i => i.region === id).slice(0, 3)
    r.parked = false; r.attempts = 0; r.anchorScore = r.score; r.lastWorked = null; r.history = []
  }
  S.invariants = Object.fromEntries((critique.invariants || []).map(i => [i.id, i.ok]))
  S.baseline = { head: null, body: null, assembly: rescore.assembly, packet: packetOf(packetsDir, rescore.assembly) }
  S.lastOrders = []; S.round = rescore.round; S.specs = {}
  return S
}

// Re-read the baseline's measured criteria from its packet (the round 14 correction).
export function refreshMeasured(S, rubric, packetsDir) {
  const m = maybeJson(join(S.baseline.packet, 'measured.json'))
  if (!m) return 0
  let n = 0
  for (const [rid, crits] of Object.entries(rubric.regions)) for (const c of crits) {
    if (c.kind === 'measured' && m[c.id] && m[c.id].result && S.regions[rid].results[c.id] !== m[c.id].result) { S.regions[rid].results[c.id] = m[c.id].result; n++ }
  }
  for (const id of Object.keys(S.regions)) { const s = core.scoreFrom(rubric, S.regions[id].results, id); if (s !== null) S.regions[id].score = s }
  return n
}

export function simulate(species, rules, opts) {
  const o = opts || {}
  const P = speciesPaths(species)
  const rubric = readJson(P.rubric), status = readJson(P.status)
  const sp = loadSpecies(species)
  const pools = core.defaultPools(sp.pools)
  const rounds = loadRounds(species)
  const rescore = rounds.filter(r => r.kind === 'rescore').pop()
  const idx = indexJournal(readJournals(o.journals || DEFAULT_JOURNALS))
  const S = initialState(species, rubric, status, P.packets, rescore)
  const L = S.limits
  const means = [rescore.mean]
  const rows = [], notes = []
  let plateauAt = null
  for (const rec of rounds.filter(r => !r.kind && r.round > rescore.round)) {
    const startMean = core.meanOf(S, core.scoresNow(S))
    const decided = []
    if (rules.measuredRefresh) { const n = refreshMeasured(S, rubric, P.packets); if (n) notes.push(`r${rec.round}: re-read ${n} measured results from the baseline packet ${S.baseline.assembly}`) }
    for (const ord of rec.orders) {
      const order = { id: ord.region, component: ord.component, priority: ord.priority }
      const row = { round: rec.round, region: ord.region, component: ord.component, assembly: ord.assembly, recorded: !!ord.kept, recordedReason: ord.reason || '' }
      if (!ord.assembly) { row.sim = 'failed'; row.note = 'no build'; rows.push(row); continue }
      const found = criticFor(idx, P.packets, ord.assembly)
      if (!found) { row.sim = 'no critique'; rows.push(row); continue }
      row.criticSource = found.source
      const packet = packetOf(P.packets, ord.assembly)
      const measured = maybeJson(join(packet, 'measured.json'))
      const critique = rules.measuredRefresh ? core.overlayMeasured(rubric, found.critique, measured) : found.critique
      const build = idx.builders[ord.assembly] || { assembly: ord.assembly, packet }
      const jopts = { pools }
      if (rules.carry) { jopts.threshold = rules.carry.threshold; jopts.diff = maybeJson(join(packet, 'diff.json')); jopts.regionImages = sp.regionImages }
      const decision = core.judge(S, rubric, L, order, { ...build, packet: build.packet || packet }, critique, jopts)
      row.decision = decision; row.build = build; row.critique = critique; row.order = order
      row.sim = decision.kept ? 'KEPT' : 'rev'
      row.simKept = decision.kept
      row.gain = decision.gain; row.reasons = decision.reasons; row.carried = decision.carried
      if (o.follow) { decision.kept = row.recorded; row.followed = true }
      decided.push({ order, build: row.build, critique, decision, row })
      rows.push(row)
    }
    // Adopt as the workflow does: both kept means a combination check, else the larger gain.
    const kept = decided.filter(d => d.decision.kept)
    let combined = false
    if (kept.length === 2) {
      const [h, b] = kept[0].order.component === 'head' ? kept : [kept[1], kept[0]]
      const cc = idx.combineCritics[rec.round]
      const cb = idx.combines[rec.round]
      if (cc && cb) {
        const merged = core.mergeCritiques(h, b)
        const check = rules.measuredRefresh ? core.overlayMeasured(rubric, cc.critique, maybeJson(join(packetOf(P.packets, cc.assembly), 'measured.json'))) : cc.critique
        const cd = core.combineDecision(S, rubric, h, b, merged, check)
        if (cd.decision) { core.adopt(S, cd.decision, { ...cb, head: h.build.head, body: b.build.body, packet: cb.packet || packetOf(P.packets, cc.assembly) }, merged, 'both'); combined = true }
        else notes.push(`r${rec.round}: combination regressed (${cd.worse.join(', ')} ${cd.broken.join(', ')})`)
      } else notes.push(`r${rec.round}: no combine critic in the journals, took the larger gain`)
    }
    if (!combined && kept.length) core.adoptBest(S, kept)
    S.baseline.packet = packetOf(P.packets, S.baseline.assembly)  // journal packets are repo-relative; always resolve here
    for (const d of decided) { d.row.simFinal = d.decision.kept; if (d.row.sim === 'KEPT' && !d.decision.kept) d.row.sim = 'kept alone' }
    const mean = core.meanOf(S, core.scoresNow(S))
    means.push(mean)
    for (const d of decided) { d.row.meanBefore = startMean; d.row.meanAfter = mean }
    S.round = rec.round
    const pl = rules.plateau || { rounds: L.plateauRounds ?? 3, gain: L.plateauGain ?? 0.15 }
    if (plateauAt === null && core.plateau({ means }, { plateauRounds: pl.rounds, plateauGain: pl.gain })) plateauAt = rec.round
  }
  return { species, rules, rows, means, rounds: rounds.filter(r => !r.kind && r.round > rescore.round).map(r => r.round), plateauAt, notes, recordedMeans: rounds.filter(r => !r.kind && r.round > rescore.round).map(r => r.mean), rescore }
}

export function report(sim) {
  const out = []
  out.push(`Judge simulator: ${sim.species}, rules ${sim.rules.name || JSON.stringify(sim.rules)}${sim.follow ? ' (following recorded decisions)' : ''}`)
  out.push('round  order            assembly        recorded  sim        gain     mean path          critic source / reason')
  let agree = 0, total = 0
  const diffs = []
  for (const r of sim.rows) {
    const rec = r.recorded ? 'KEPT' : 'rev'
    const same = r.sim === 'failed' || r.sim === 'no critique' ? null : (r.simFinal === r.recorded)
    if (same !== null) { total++; if (same) agree++; else diffs.push(r) }
    const reasons = r.simFinal ? (r.decision && r.decision.keptOnVerdict ? 'kept on verdict' : '') : (r.reasons || []).join('; ')
    out.push(`${String(r.round).padStart(3)}    ${(r.region + ' ' + r.component).padEnd(15)}  ${(r.assembly || '-').padEnd(14)}  ${rec.padEnd(8)}  ${String(r.sim).padEnd(9)}  ${num(r.gain).padEnd(7)}  ${r.meanBefore !== undefined ? r.meanBefore + ' > ' + r.meanAfter : ''}`.padEnd(100) + `  ${short(reasons, 70)}${r.carried && r.carried.length ? ' [carried ' + r.carried.join(',') + ']' : ''}${same === false ? '   <-- DIFFERS' : ''}`)
  }
  out.push(`agree ${agree} of ${total} orders`)
  for (const d of diffs) out.push(`  r${d.round} ${d.region}: recorded ${d.recorded ? 'kept' : 'reverted'}, simulated ${d.sim}. ${MANUAL[d.round + ':' + d.region] || 'unexplained'}. recorded reason: ${short(d.recordedReason, 160)}; simulated: ${short((d.reasons || []).join('; '), 160)}`)
  for (const n of sim.notes) out.push('  note ' + n)
  out.push('means (sim)      ' + sim.means.join(' '))
  out.push('means (recorded) ' + [sim.rescore.mean, ...sim.recordedMeans].join(' '))
  out.push(`plateau (last 3 round means gain < .15): ${sim.plateauAt === null ? 'never' : 'stops after round ' + sim.plateauAt}`)
  out.push('plateau grid, first round that would stop the run (rounds x gain):')
  const first = sim.rounds[0]
  for (const n of [2, 3, 4, 5]) out.push('  ' + n + ' rounds: ' + [0.1, 0.15, 0.2, 0.3].map(g => {
    const i = sim.means.findIndex((_, k) => core.plateau({ means: sim.means.slice(0, k + 1) }, { plateauRounds: n, plateauGain: g }))
    return `gain<${g}: ${i < 0 ? 'never' : 'r' + (first + i - 1)}`
  }).join('  '))
  return out.join('\n')
}

// One table over several rule sets: every order where any set differs from the first set's
// decision, with each set's decision, gain and carried regions, then the mean paths.
export function compare(species, names, opts) {
  const sims = names.map(n => simulate(species, PRESETS[n], opts))
  const out = [`Compare ${names.join(' | ')} (columns: decision gain [regions carried])`]
  const base = sims[0]
  base.rows.forEach((row, i) => {
    const cells = sims.map(s => s.rows[i])
    if (cells.every(c => c.simFinal === base.rows[i].simFinal && JSON.stringify(c.reasons) === JSON.stringify(base.rows[i].reasons))) return
    out.push(`r${row.round} ${row.region} ${row.component} ${row.assembly} (recorded ${row.recorded ? 'KEPT' : 'rev'})`)
    cells.forEach((c, k) => out.push(`    ${names[k].padEnd(10)} ${String(c.sim).padEnd(10)} ${num(c.gain)}  ${c.carried && c.carried.length ? '[carried ' + c.carried.join(',') + ']' : ''}  ${c.simFinal ? '' : short((c.reasons || []).join('; '), 150)}`))
  })
  out.push('')
  for (const [k, s] of sims.entries()) out.push(`${names[k].padEnd(10)} means ${s.means.join(' ')}  plateau ${s.plateauAt === null ? 'never' : 'after round ' + s.plateauAt}`)
  return out.join(String.fromCharCode(10))
}

if (import.meta.main) {
  const argv = process.argv.slice(2)
  const species = argv.find(a => !a.startsWith('--')) || 'akinza'
  const flag = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null }
  if (flag('--compare')) { console.log(compare(species, flag('--compare').split(','), { journals: flag('--journals') })); process.exit(0) }
  let rules = PRESETS.v2
  if (flag('--preset')) rules = PRESETS[flag('--preset')] || (() => { throw new Error('unknown preset') })()
  if (flag('--rules')) rules = readJson(flag('--rules'))
  const sim = simulate(species, rules, { journals: flag('--journals'), follow: argv.includes('--follow') })
  sim.follow = argv.includes('--follow')
  if (argv.includes('--json')) console.log(JSON.stringify({ rules: sim.rules, means: sim.means, plateauAt: sim.plateauAt, rows: sim.rows.map(r => ({ round: r.round, region: r.region, recorded: r.recorded, sim: r.sim, gain: r.gain, reasons: r.reasons, carried: r.carried })) }, null, 1))
  else console.log(report(sim))
}
