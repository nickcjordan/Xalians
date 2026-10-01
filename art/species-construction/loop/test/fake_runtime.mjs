// A deterministic fake of the workflow runtime (args, agent, parallel, phase, log), shared by the tests.
// Run a workflow script the way the runtime does: top-level await and return, with args, agent, parallel, phase, log.
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
export function fnv(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0 } return h >>> 0 }
export function fakeRuntime(args, seed) {
  const calls = [], logs = []
  const rub = args.rubric
  const agent = async (prompt, opts) => {
    const label = opts.label
    calls.push({ label, model: opts.model, effort: opts.effort, prompt })
    const h = fnv(seed + label)
    if (label.startsWith('builder')) {
      if (h % 7 === 0) return { failed: true, reason: 'fake failure', changes: '', approach: '' }
      const n = h % 1000
      return { failed: false, head: 'head-' + n, body: 'body-' + n, assembly: 'assembled-' + n, packet: 'p/assembled-' + n, technicalPass: true, approach: 'approach ' + label, changes: 'changes', reusable: [{ option: 'o' + n, what: 'w' }] }
    }
    if (label.startsWith('combine')) { const n = 1000 + h % 1000; return { failed: h % 5 === 0, head: 'head-c' + n, body: 'body-c' + n, assembly: 'assembled-' + n, packet: 'p/assembled-' + n, technicalPass: true, approach: 'combine', changes: 'c' } }
    if (label.startsWith('spec')) return { path: 'specs/x.md', summary: 'spec' }
    if (label.startsWith('record')) return 'done'
    if (label.startsWith('critic')) {
      const m = /Target region: (R\d+)/.exec(opts && prompt)
      const target = m ? m[1] : null
      const criteria = []
      for (const [id, crits] of Object.entries(rub.regions)) for (const c of crits) {
        const k = fnv(seed + label + c.id) % 100
        const r = id === target ? (k < 70 ? 'pass' : k < 85 ? 'partial' : 'fail') : (k < 50 ? 'pass' : k < 75 ? 'partial' : 'fail')
        criteria.push({ id: c.id, result: r, evidence: '' })
      }
      const pairwise = target ? [{ region: target, verdict: h % 10 < 8 ? 'better' : 'same', reason: '' }] : []
      return { criteria, pairwise, invariants: [{ id: 'I01', ok: true, evidence: '' }, { id: 'I05', ok: h % 9 !== 0, evidence: '' }], issues: target ? [{ region: target, summary: 'issue ' + label, fix: 'fix', fixability: 0.6 }] : [], readyForDesigner: h % 4 === 0, summary: 'critic ' + label }
    }
    return null
  }
  return { agent, parallel: fns => Promise.all(fns.map(f => f())), phase: () => {}, log: m => logs.push(m), calls, logs }
}
export async function runWorkflow(text, args, seed) {
  const rt = fakeRuntime(args, seed)
  const body = text.replace(/^export const meta =/m, 'const meta =')
  const fn = new AsyncFunction('args', 'agent', 'parallel', 'phase', 'log', body)
  const ret = await fn(JSON.parse(JSON.stringify(args)), rt.agent, rt.parallel, rt.phase, rt.log)
  return { ret, calls: rt.calls, logs: rt.logs }
}

