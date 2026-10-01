// Shared I/O for judge_sim.mjs and judge_cli.mjs: paths, workflow journals, packets.
// The decisions themselves always come from loop_core.js.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const REPO = resolve(here, '..', '..', '..')
export const DEFAULT_JOURNALS = 'C:/Users/njord/.claude/projects/c--dev-src-Xalians/f0532f7e-7c4a-4de8-a1ff-d63721d93567/subagents/workflows'

// Akinza's REGION_IMAGES, used when species.json carries none (loop_tools.py REGION_IMAGES).
export const AKINZA_REGION_IMAGES = {
  R01: ['m04'], R02: ['m05'], R03: ['m04'], R04: ['m04', 'm05'], R05: ['m06'], R06: ['m06'], R07: ['m07'],
  R08: ['m08'], R09: ['m09'], R10: ['m10'], R11: ['m10'], R12: ['m02', 'm03'],
}

export const readJson = p => JSON.parse(readFileSync(p, 'utf8'))
export const maybeJson = p => existsSync(p) ? readJson(p) : null

export function speciesPaths(species) {
  const loopDir = join(REPO, 'docs', 'design', 'species-construction', species, 'loop')
  return {
    loopDir,
    status: join(loopDir, 'status.json'), rubric: join(loopDir, 'rubric.json'), invariants: join(loopDir, 'invariants.json'),
    species: join(loopDir, 'species.json'), rounds: join(loopDir, 'rounds'),
    packets: join(REPO, 'untracked', 'species-construction', species, 'loop', 'packets'),
    recipe: join(REPO, 'docs', 'design', 'species-construction', species, 'recipe.json'),
  }
}

export function loadSpecies(species) {
  const c = maybeJson(speciesPaths(species).species)
  const regionImages = c && c.regionImages ? Object.fromEntries(Object.entries(c.regionImages).filter(([k]) => /^R\d+$/.test(k))) : AKINZA_REGION_IMAGES
  const comps = c && c.components ? Object.fromEntries(Object.entries(c.components).filter(([, v]) => Array.isArray(v))) : null
  return { config: c, regionImages, pools: comps, threshold: c ? c.sideEffectThreshold : null }
}

export function loadRounds(species) {
  const dir = speciesPaths(species).rounds
  return readdirSync(dir).filter(f => /^round-\d+.*\.json$/.test(f)).sort().map(f => ({ file: f, ...readJson(join(dir, f)) }))
}

// Journal lines: {type:'started', key, label} and {type:'result', key, result}.
export function readJournal(file) {
  const labels = {}, out = []
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    if (e.type === 'started') labels[e.key] = e.label
    else if (e.type === 'result' && labels[e.key] !== undefined) out.push({ label: labels[e.key], result: e.result })
  }
  return out
}

// All journals of a directory in chronological order (by journal mtime); a later entry
// with the same label supersedes an earlier one.
export function readJournals(dir) {
  const files = readdirSync(dir).map(d => join(dir, d, 'journal.jsonl')).filter(existsSync)
    .map(f => ({ f, t: statSync(f).mtimeMs })).sort((a, b) => a.t - b.t)
  return files.flatMap(x => readJournal(x.f).map(e => ({ ...e, journal: x.f })))
}

// Look-ups the simulator needs. Builders by the assembly they returned, critics by the
// assembly in their label, combine checks by round.
export function indexJournal(entries) {
  const idx = { builders: {}, critics: {}, combines: {}, combineCritics: {}, specs: {}, ids: {} }
  for (const e of entries) {
    const m = /^(builder|critic|combine|spec) r(\d+)(?: (head|body|both|join))?(?: combined)?: (.+)$/.exec(e.label) || /^(combine) r(\d+)$/.exec(e.label)
    if (!m) continue
    const kind = m[1], round = +m[2]
    if (kind === 'builder' && e.result && e.result.assembly) idx.builders[e.result.assembly] = { ...e.result, label: e.label, round }
    else if (kind === 'critic' && / combined: /.test(e.label)) idx.combineCritics[round] = { critique: e.result, label: e.label, assembly: m[4] }
    else if (kind === 'critic') idx.critics[m[4]] = { critique: e.result, label: e.label, round, journal: e.journal }
    else if (kind === 'combine') idx.combines[round] = { ...(e.result || {}), label: e.label }
    else if (kind === 'spec') idx.specs[m[4]] = { ...e.result, round }
  }
  return idx
}

export function criticFor(idx, packetsDir, assembly) {
  const j = idx && idx.critics[assembly]
  if (j && j.critique) return { critique: j.critique, source: 'journal ' + j.label }
  const p = join(packetsDir, assembly, 'critique.json')
  if (existsSync(p)) return { critique: readJson(p), source: 'packet critique.json' }
  return null
}

export const packetOf = (packetsDir, assembly) => join(packetsDir, assembly)
