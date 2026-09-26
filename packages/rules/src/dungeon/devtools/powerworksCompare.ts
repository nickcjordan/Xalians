/*
  Powerworks pass 7 comparison: the same seeded runs under several policies, side by side.

  The pass 5 greedy policy prices moves with hand-set values (SIM_STATUS_VALUE and the
  rest of `pairValue`), so a species it plays badly can look weak when the prices are what
  is wrong. This plays the same seeds and the same drafts under the random floor, the pass 5
  policy and the look-ahead (`planLookahead`), which prices positions instead of moves, and
  reports what changes. The look-ahead is slow, so the seeds are spread over worker threads.

    node apps/web/scripts/runNode.cjs packages/rules/src/dungeon/devtools/powerworksCompare.ts \
      --runs=400 --draft=random --policies=random,pass5,lookahead --workers=20 [--md=<path>]
*/
import { readFileSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { isMainThread, parentPort, Worker } from "node:worker_threads";
import {
  LOOKAHEAD,
  simulate,
  speciesValue,
  type Lookahead,
  type SimOptions,
  type SimStats,
} from "./powerworksSim.ts";

type Job = { first: number; runs: number; options: SimOptions };
type Policy = SimOptions["policy"];

/** Sums two stats records field by field: counts add, lists join, the longest run is the longer. */
function merge(a: SimStats, b: SimStats): SimStats {
  const add = (x: unknown, y: unknown, key: string): unknown => {
    if (typeof x === "number" && typeof y === "number")
      return key === "longestRun" ? Math.max(x, y) : x + y;
    if (Array.isArray(x) && Array.isArray(y)) return [...x, ...y];
    if (x && y && typeof x === "object" && typeof y === "object") {
      const out: Record<string, unknown> = { ...(x as Record<string, unknown>) };
      for (const [k, v] of Object.entries(y as Record<string, unknown>))
        out[k] = k in out ? add(out[k], v, k) : v;
      return out;
    }
    return y ?? x;
  };
  return add(a, b, "") as SimStats;
}

async function play(
  source: string,
  workers: number,
  runs: number,
  options: SimOptions
): Promise<SimStats> {
  const chunk = options.policy === "lookahead" ? 2 : 25;
  const jobs: Job[] = [];
  for (let first = 1; first <= runs; first += chunk)
    jobs.push({ first, runs: Math.min(chunk, runs - first + 1), options });
  let total: SimStats | null = null;
  await Promise.all(
    Array.from({ length: Math.min(workers, jobs.length) }, async () => {
      const worker = new Worker(source, { eval: true });
      try {
        for (let job = jobs.shift(); job; job = jobs.shift()) {
          const current = job;
          const stats = await new Promise<SimStats>((resolve, reject) => {
            const fail = (error: Error) => {
              worker.off("message", done);
              reject(error);
            };
            const done = (value: SimStats) => {
              worker.off("error", fail);
              resolve(value);
            };
            worker.once("message", done);
            worker.once("error", fail);
            worker.postMessage(current);
          });
          total = total ? merge(total, stats) : stats;
        }
      } finally {
        await worker.terminate();
      }
    })
  );
  return total!;
}

const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : "-");
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
/** Half the width of a 95% interval on a rate of `wins` in `runs`, in points. */
const margin = (wins: number, runs: number) =>
  runs ? Math.round(196 * Math.sqrt(((wins / runs) * (1 - wins / runs)) / runs)) : 0;

/** The pass 7 report: overall rows, then each species' win rate under every policy. */
export function formatCompare(
  runs: number,
  draft: string,
  byPolicy: [Policy, SimStats][],
  lookahead: Partial<Lookahead> = {}
): string {
  const k = { ...LOOKAHEAD, ...lookahead };
  const pass5 = byPolicy.find(([p]) => p === "pass5")?.[1];
  const ahead = byPolicy.find(([p]) => p === "lookahead")?.[1];
  const head = `| | ${byPolicy.map(([p]) => p).join(" | ")} |\n|---|${byPolicy.map(() => "---").join("|")}|`;
  const row = (label: string, cell: (s: SimStats) => string) =>
    `| ${label} | ${byPolicy.map(([, s]) => cell(s)).join(" | ")} |`;
  const overall = [
    head,
    row("runs won", (s) => `${s.wins} (${pct(s.wins, s.runs)} ±${margin(s.wins, s.runs)})`),
    row("runs outlasted (stall rule)", (s) => String(s.outlastedRuns)),
    row("rounds per run", (s) => (s.rounds / s.runs).toFixed(1)),
    row("encounters reached per run", (s) => (s.encounters / s.runs).toFixed(2)),
    row("orders of a support move", (s) => pct(s.ordersSupport, s.ordersTotal)),
    row("orders naming a squadmate", (s) => pct(s.ordersAtSquadmates, s.ordersTotal)),
    row("orders carrying a status or bind", (s) => pct(s.ordersStatus, s.ordersTotal)),
    row("orders beginning a charge", (s) => pct(s.ordersChargeBegun, s.ordersTotal)),
    row("desperate strikes", (s) => pct(s.desperateStrikes, s.ordersTotal)),
    row("heals on squadmates (HP)", (s) => `${s.allyHeals} (${s.allyHealed})`),
    row("look-ahead moved off the pass 5 order", (s) =>
      s.lookaheadDecisions ? pct(s.lookaheadOverrides, s.lookaheadDecisions) : "-"
    ),
  ].join("\n");
  const kinds = ahead
    ? Object.entries(ahead.lookaheadOverrideKinds)
        .sort((a, b) => b[1] - a[1])
        .map(([k, n]) => `${k} ${pct(n, ahead.lookaheadOverrides)}`)
        .join(", ")
    : "";
  const species = [
    ...new Set(byPolicy.flatMap(([, s]) => Object.keys(s.squadSpecies))),
  ].sort();
  const rate = (s: SimStats | undefined, k: string) => {
    const v = s?.squadSpecies[k];
    return v && v.runs ? Math.round((100 * v.wins) / v.runs) : NaN;
  };
  const speciesRows = species
    .map((k) => ({ k, delta: rate(ahead, k) - rate(pass5, k) }))
    .sort((a, b) => rate(ahead, a.k) - rate(ahead, b.k) || a.k.localeCompare(b.k))
    .map(
      ({ k, delta }) =>
        `| ${k} | ${byPolicy[0][1].squadSpecies[k]?.runs ?? 0} | ${byPolicy
          .map(([, s]) => {
            const v = s.squadSpecies[k];
            return v ? `${rate(s, k)}% ±${margin(v.wins, v.runs)}` : "-";
          })
          .join(" | ")} | ${Number.isNaN(delta) ? "-" : signed(delta)} |`
    );
  const speciesTable = [
    `| species | runs drafted | ${byPolicy.map(([p]) => p).join(" | ")} | look-ahead minus pass 5 |`,
    `|---|---|${byPolicy.map(() => "---").join("|")}|---|`,
    ...speciesRows,
  ].join("\n");
  return `Powerworks policy comparison: ${runs} runs, seeds 1-${runs}, ${draft} draft; look-ahead ${k.samples} dice x ${k.horizon} rounds.\n\n${overall}\n\nWin rate of runs whose squad included the species, lowest under the look-ahead first (± is a 95% interval):\n\n${speciesTable}\n${kinds ? `\nWhat the look-ahead chose instead of the pass 5 order: ${kinds}.\n` : ""}`;
}

/** Each act's orders per run carried, for the named species, under every policy. */
export function formatActs(byPolicy: [Policy, SimStats][], species: string[]): string {
  const out: string[] = [];
  for (const name of species) {
    const acts = [
      ...new Set(
        byPolicy.flatMap(([, s]) => Object.keys(s.acts).filter((a) => a.startsWith(`${name}: `)))
      ),
    ].sort();
    if (!acts.length) continue;
    out.push(
      `| ${name} act | carried | ${byPolicy.map(([p]) => `${p} orders per run`).join(" | ")} |`,
      `|---|---|${byPolicy.map(() => "---").join("|")}|`,
      ...acts.map(
        (a) =>
          `| ${a.slice(name.length + 2)} | ${byPolicy[0][1].acts[a]?.carried ?? 0} | ${byPolicy
            .map(([, s]) => {
              const v = s.acts[a];
              return v && v.carried ? (v.orders / v.carried).toFixed(1) : "-";
            })
            .join(" | ")} |`
      ),
      ""
    );
  }
  return out.join("\n");
}

/**
  Pass 9: each species' value to a squad under one policy, and what it did per run it was in:
  its fitted value (`speciesValue`), its drafted HP, speed and best power, harm dealt and
  taken, HP healed and guards given to squadmates, machine opportunities denied, knockouts.
*/
export function formatSpecies(policy: Policy, stats: SimStats): string {
  const values = speciesValue(stats.runRecords);
  const rows = Object.entries(stats.contrib)
    .map(([k, c]) => ({ k, c, v: values[k]?.value ?? 0 }))
    .sort((a, b) => a.v - b.v);
  const vs = rows.map((r) => r.v);
  const sd = Math.sqrt(vs.reduce((n, v) => n + v * v, 0) / (vs.length || 1));
  const per = (n: number, c: { runs: number }) => (c.runs ? (n / c.runs).toFixed(1) : "-");
  return [
    `Species value under ${policy}: fitted value in encounters (0 is the average pick), then per run it was in.`,
    `Spread: lowest ${vs[0]?.toFixed(2)}, highest ${vs[vs.length - 1]?.toFixed(2)}, standard deviation ${sd.toFixed(2)}.`,
    "",
    "| species | runs | value | HP | speed | power | dealt | taken | healed | guards | denied | fell |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...rows.map(
      ({ k, c, v }) =>
        `| ${k} | ${c.runs} | ${v >= 0 ? "+" : ""}${v.toFixed(2)} | ${per(c.max, c)} | ${per(c.speed, c)} | ${per(c.power, c)} | ${per(c.dealt, c)} | ${per(c.taken, c)} | ${per(c.healed, c)} | ${per(c.guards, c)} | ${per(c.denied, c)} | ${per(c.fell, c)} |`
    ),
    "",
  ].join("\n");
}

async function main() {
  const arg = (name: string, fallback: string) =>
    process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
  const runs = Number(arg("runs", "400"));
  const draft = arg("draft", "random") as NonNullable<SimOptions["draft"]>;
  const policies = arg("policies", "random,pass5,lookahead").split(",") as Policy[];
  const workers = Number(arg("workers", String(Math.max(1, availableParallelism() - 4))));
  const acts = arg("acts", "").split(",").filter(Boolean);
  const md = arg("md", "");
  // --samples= and --horizon= override the look-ahead's settings for this measurement.
  const lookahead = {
    ...(arg("samples", "") ? { samples: Number(arg("samples", "")) } : {}),
    ...(arg("horizon", "") ? { horizon: Number(arg("horizon", "")) } : {}),
  };
  // The bundle runNode.cjs wrote is deleted once this module returns, so the workers get its
  // text, read now, rather than its path.
  const source = readFileSync(__filename, "utf8");
  const byPolicy: [Policy, SimStats][] = [];
  for (const policy of policies) {
    const started = Date.now();
    const stats = await play(source, workers, runs, { policy, healerFree: "none", draft, lookahead });
    console.error(`${policy}: ${stats.wins}/${stats.runs} won in ${Math.round((Date.now() - started) / 1000)}s`);
    byPolicy.push([policy, stats]);
  }
  const species = process.argv.includes("--species")
    ? byPolicy.map(([p, st]) => formatSpecies(p, st)).join("\n")
    : "";
  const report = `${formatCompare(runs, draft, byPolicy, lookahead)}\n${formatActs(byPolicy, acts)}\n${species}`;
  console.log(report);
  if (md) writeFileSync(md, report);
}

if (isMainThread) void main();
else
  parentPort!.on("message", (job: Job) =>
    parentPort!.postMessage(simulate(job.runs, job.first, job.options))
  );
