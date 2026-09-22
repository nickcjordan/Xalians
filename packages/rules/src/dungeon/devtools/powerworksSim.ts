/*
  Powerworks measurement: seeded runs under a simple greedy policy.

  Policy per companion per round: bind a charging enemy when a bind is legal (an immediate
  bind first, since only one that lands before the release stops it); pull a known charger
  (an enemy with a prolonged move) with a legal displace even before it has begun charging,
  and count how often that pull breaks a charge begun earlier in the same round; otherwise
  the legal move and target with the highest damage preview (a knockout wins ties);
  Desperate strike only when it is the sole legal move or nothing else scores. Between
  encounters: revive whoever is down (once), then advance.

  Reports the numbers docs/design/powerworks-v5-mechanics.md pass 1 asks for. Run it as
  the vitest file beside it (`npm test -w packages/rules -- --run powerworksSim`), which
  prints the table, or import `simulate` from another script.
*/
import {
  command,
  createRun,
  damagePreview,
  legalMoves,
  moveAt,
  resolveRound,
  type Order,
  type Run,
  type Unit,
} from "../index.ts";
import { LIKELIHOOD_PERCENT } from "../levers.ts";

export type SimStats = {
  runs: number;
  wins: number;
  losses: number;
  encounters: number;
  rounds: number;
  playerOpportunities: number;
  desperateStrikes: number;
  lockouts: number;
  bindInterruptions: number;
  releasesLanded: number;
  chargesBegun: number;
  displaceInterruptions: number;
  preemptivePulls: number;
  preemptivePullsBroke: number;
  bindsLanded: number;
  bindsMissed: number;
  roomsReached: number[];
};

function choose(u: Unit, enemies: Unit[]): Order | null {
  const legal = legalMoves(u);
  if (!legal.length) return null;
  const foes = enemies.filter((t) => t.hp > 0);
  let best: { order: Order; score: number } | null = null;
  for (const i of legal) {
    const m = moveAt(u, i);
    for (const t of foes) {
      let score = 0;
      const bind = m.effects.find((e) => e.support === "bind");
      const pull = m.effects.some((e) => e.support === "displace");
      const charger = t.moves.some((c) => c.preparation === "prolonged");
      if (bind && t.charge)
        // Only a bind that lands before the release stops it: prefer immediate preparation, then likelihood.
        score = 1000 + (m.preparation === "immediate" ? 10 : 0) + LIKELIHOOD_PERCENT[bind.likelihood] / 100;
      else if (pull && charger) score = 900 + (t.charge ? 50 : 0);
      else {
        const damage = damagePreview(u, m, t);
        score = damage + (damage > 0 && damage >= t.hp ? 50 : 0);
        if (i === -1) score -= 0.5; // recoil: prefer any real damage at equal preview
      }
      if (!best || score > best.score) best = { order: { move: i, target: t.id }, score };
    }
  }
  return best?.order ?? { move: legal[0], target: foes[0].id };
}

export function playRun(seed: number, stats: SimStats) {
  let s: Run = createRun(seed);
  let guard = 0;
  let rooms = 1;
  while ((s.phase === "planning" || s.phase === "camp") && guard++ < 400) {
    if (s.phase === "camp") {
      const down = s.team.find((u) => u.hp <= 0);
      if (down && s.revival) s = command(s, { kind: "revive", id: down.id });
      s = command(s, { kind: "advance" });
      rooms++;
      continue;
    }
    const orders: Record<string, Order> = {};
    const preemptive = new Set<string>();
    for (const u of s.team.filter((u) => u.hp > 0)) {
      stats.playerOpportunities++;
      const order = choose(u, s.enemies);
      if (!order) {
        stats.lockouts++;
        orders[u.id] = { move: -2, target: "" };
      } else {
        if (order.move === -1) stats.desperateStrikes++;
        const m = moveAt(u, order.move);
        const target = s.enemies.find((t) => t.id === order.target);
        if (m.effects.some((e) => e.support === "displace") && target && !target.charge) {
          stats.preemptivePulls++;
          preemptive.add(u.id);
        }
        orders[u.id] = order;
      }
    }
    const result = resolveRound(s, orders);
    stats.rounds++;
    for (const f of result.frames) {
      const e = f.event;
      if (!e) continue;
      if (e.kind === "blocked" && f.text.includes("Charge dispersed")) stats.bindInterruptions++;
      if (e.kind === "displace") {
        stats.displaceInterruptions++;
        if (e.actorId && preemptive.has(e.actorId)) stats.preemptivePullsBroke++;
      }
      if (e.kind === "charge") stats.chargesBegun++;
      const actor = result.state.enemies.find((t) => t.id === e.actorId);
      if (e.kind === "hit" && actor && actor.moves.some((m) => m.name === e.moveName && m.preparation === "prolonged")) stats.releasesLanded++;
      if (e.kind === "bind") stats.bindsLanded++;
      if (e.kind === "missed") stats.bindsMissed++;
    }
    s = result.state;
  }
  stats.encounters += rooms;
  stats.roomsReached.push(rooms);
  if (s.phase === "won") stats.wins++;
  else stats.losses++;
}

export function simulate(runs = 200, firstSeed = 1): SimStats {
  const stats: SimStats = {
    runs,
    wins: 0,
    losses: 0,
    encounters: 0,
    rounds: 0,
    playerOpportunities: 0,
    desperateStrikes: 0,
    lockouts: 0,
    bindInterruptions: 0,
    releasesLanded: 0,
    chargesBegun: 0,
    displaceInterruptions: 0,
    preemptivePulls: 0,
    preemptivePullsBroke: 0,
    bindsLanded: 0,
    bindsMissed: 0,
    roomsReached: [],
  };
  for (let seed = firstSeed; seed < firstSeed + runs; seed++) playRun(seed, stats);
  return stats;
}

export function formatTable(stats: SimStats): string {
  const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : "n/a");
  const reached = [1, 2, 3, 4].map(
    (r) => `${r}: ${stats.roomsReached.filter((x) => x >= r).length}`
  );
  const rows: [string, string][] = [
    ["runs", String(stats.runs)],
    ["win rate", `${pct(stats.wins, stats.runs)} (${stats.wins} won, ${stats.losses} lost)`],
    ["runs reaching sector", reached.join(", ")],
    ["mean rounds per encounter", (stats.rounds / stats.encounters).toFixed(2)],
    ["mean rounds per run", (stats.rounds / stats.runs).toFixed(2)],
    ["Desperate strike frequency", `${pct(stats.desperateStrikes, stats.playerOpportunities)} of ${stats.playerOpportunities} player opportunities`],
    ["opportunities with no legal move", `${pct(stats.lockouts, stats.playerOpportunities)} (${stats.lockouts})`],
    ["charges begun / releases landed", `${stats.chargesBegun} / ${stats.releasesLanded} (${pct(stats.releasesLanded, stats.chargesBegun)} of charges land)`],
    ["charge interruptions by bind", String(stats.bindInterruptions)],
    ["charge interruptions by displace", String(stats.displaceInterruptions)],
    ["pre-emptive pulls attempted", `${stats.preemptivePulls} (${stats.preemptivePullsBroke} broke a charge begun earlier that round)`],
    ["binds landed / missed", `${stats.bindsLanded} / ${stats.bindsMissed} (${pct(stats.bindsLanded, stats.bindsLanded + stats.bindsMissed)} landed)`],
  ];
  const width = Math.max(...rows.map(([k]) => k.length));
  return rows.map(([k, v]) => `${k.padEnd(width)}  ${v}`).join("\n");
}
