// Command line front for the core, used by loop_state.py (replay) so a stopped run is
// re-decided by the same code the workflow runs. Reads one JSON document on stdin:
//
//   {"op": "replay", "state": status, "rubric": rubric, "packetsDir": dir, "pools": {...}|null,
//    "threshold": n|null, "regionImages": {...}|null, "refresh": true,
//    "rounds": [{"round": N, "outcomes": [{"order": {"id","component"}, "spec": {...}|null,
//                "build": {...}|null, "critique": {...}|null, "failed": "reason"|null}],
//                "combine": {"build": {...}, "check": {...}}|null}]}
//
// and writes {"state": status after, "entries": [round records], "notes": [...]}.
// refresh (default on) re-reads the measured criteria of the baseline from its packet's
// measured.json before each round, and of each candidate from its own packet, so a stale
// frozen or copied measured result cannot decide a round (the round 14 correction).
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import * as core from './loop_core.js'

const packetOf = (dir, assembly) => join(dir, assembly)
const fwd = p => p.replace(/\\/g, '/')
const maybeJson = p => existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null

export function refreshBaseline(S, rubric) {
  const m = S.baseline.packet ? maybeJson(join(S.baseline.packet, 'measured.json')) : null
  if (!m) return 0
  let n = 0
  for (const [rid, crits] of Object.entries(rubric.regions)) for (const c of crits) {
    if (c.kind === 'measured' && m[c.id] && m[c.id].result && S.regions[rid].results[c.id] !== m[c.id].result) { S.regions[rid].results[c.id] = m[c.id].result; n++ }
  }
  if (n) for (const id of Object.keys(S.regions)) { const s = core.scoreFrom(rubric, S.regions[id].results, id); if (s !== null) S.regions[id].score = s }
  return n
}

export function replay(req) {
  const S = req.state, rubric = req.rubric, L = S.limits
  const pools = core.defaultPools(req.pools || null)
  const refresh = req.refresh !== false
  const entries = [], notes = []
  S.specs = S.specs || {}
  for (const id of Object.keys(S.regions)) { const r = S.regions[id]; r.results = r.results || {}; r.history = r.history || []; if (r.lastWorked === undefined) r.lastWorked = null }
  for (const rd of req.rounds) {
    const round = rd.round
    // The priority is what the workflow saw when it picked the order, before any re-read.
    const outcomes = rd.outcomes.map(o => ({ ...o, order: { ...o.order, priority: core.priority(S, L, o.order.id, round) } }))
    if (refresh) { const n = refreshBaseline(S, rubric); if (n) notes.push(`round ${round}: re-read ${n} measured results from the baseline packet ${S.baseline.assembly}`) }
    S.round = round
    S.lastOrders.push(outcomes.map(o => o.order.id).join('+'))
    for (const o of outcomes) {
      if (o.spec) S.specs[o.order.id] = { path: o.spec.path, image: o.spec.image, summary: o.spec.summary, round }
      if (o.build && o.build.assembly) o.build.packet = fwd(packetOf(req.packetsDir, o.build.assembly))
      if (o.failed || !o.critique) { o.failed = o.failed || 'critic returned nothing'; continue }
      const packet = o.build.packet
      const critique = refresh ? core.overlayMeasured(rubric, o.critique, maybeJson(join(packet, 'measured.json'))) : o.critique
      const opts = { pools }
      if (req.threshold !== null && req.threshold !== undefined) { opts.threshold = req.threshold; opts.diff = maybeJson(join(packet, 'diff.json')); opts.regionImages = req.regionImages || undefined }
      o.critique = critique
      o.decision = core.judge(S, rubric, L, o.order, o.build, critique, opts)
    }
    const kept = outcomes.filter(o => o.decision && o.decision.kept)
    let combined = null
    if (kept.length === 2 && rd.combine && rd.combine.build && rd.combine.check) {
      const [h, b] = kept[0].order.component === 'head' ? kept : [kept[1], kept[0]]
      const cb = { ...rd.combine.build }
      if (cb.assembly) cb.packet = fwd(packetOf(req.packetsDir, cb.assembly))
      const merged = core.mergeCritiques(h, b)
      const check = refresh && cb.packet ? core.overlayMeasured(rubric, rd.combine.check, maybeJson(join(cb.packet, 'measured.json'))) : rd.combine.check
      const cd = core.combineDecision(S, rubric, h, b, merged, check)
      if (cd.decision) { combined = { build: cb, decision: cd.decision }; core.adopt(S, cd.decision, cb, merged, 'both') }
      else notes.push(`round ${round}: combination regressed (${cd.worse.join(', ')} ${cd.broken.join(', ')}); kept the larger single gain`)
    } else if (kept.length === 2) notes.push(`round ${round}: two orders kept but the journal has no combination; kept the larger single gain`)
    if (!combined && kept.length) core.adoptBest(S, kept)
    entries.push(core.recordEntry(S, L, round, outcomes, combined ? combined.build.assembly : null))
  }
  return { state: S, entries, notes }
}

if (import.meta.main) {
  const req = JSON.parse(readFileSync(0, 'utf8'))
  if (req.op !== 'replay') { console.error('unknown op ' + req.op); process.exit(2) }
  process.stdout.write(JSON.stringify(replay(req)))
}
