/*
  Powerworks measurement: seeded runs under a simple greedy policy.

  Policy per companion per round: bind a charging enemy when a bind is legal (an immediate
  bind first, since only one that lands before the release stops it); pull a known charger
  (an enemy with a prolonged move) with a legal displace even before it has begun charging,
  and count how often that pull breaks a charge begun earlier in the same round; otherwise
  the legal move and target with the highest damage preview, a harm that also carries a
  status beating a plain harm at equal preview (contract decision 20), a knockout winning
  ties;
  Desperate strike only when it is the sole legal move or nothing else scores. Between
  encounters: revive whoever is down (once), then advance.

  Reports the numbers docs/design/powerworks-v5-mechanics.md pass 1 asks for. Run it as
  the vitest file beside it (`npm test -w packages/rules -- --run powerworksSim`), which
  prints the table, or import `simulate` from another script.
*/
import {
  beneficial,
  command,
  contactDelivery,
  createRun,
  damagePreview,
  legalMoves,
  moveAt,
  reachesOwnSide,
  readCompanion,
  resolveRound,
  usable,
  type Order,
  type Run,
  type StatusGroup,
  type Trigger,
  type Unit,
} from "../index.ts";
import { LIKELIHOOD_PERCENT } from "../levers.ts";
import {
  generateXalian,
  getSpeciesTemplates,
} from "../../generator/canonicalCreatureRelease.ts";

const TRIGGERS: Trigger[] = ["contact", "harmed", "ally-harmed"];

const GROUPS: StatusGroup[] = [
  "binding",
  "degrading",
  "guarding",
  "attention",
  "concealment",
  "mending",
  "shock",
  "tempo",
  "senses",
];

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
  /** Pass 2 rows (contract, "Measurement"). */
  applied: Record<StatusGroup, number>;
  resisted: number;
  companionDamage: number;
  companionDegradeDamage: number;
  opportunitiesLostToTrance: number;
  companionOpportunitiesUnderParalysis: number;
  removeUses: number;
  removeCleared: number;
  hiddenSkips: number;
  /** Pass 3 rows (contract, "Measurement"). */
  reactionsFired: Record<Trigger, number>;
  reactionDamage: number;
  contactStrikesOnGuardian: number;
  rangedStrikesOnGuardian: number;
  /** Pass 4 rows (contract, "Pass 4 contract"). */
  lostToStun: number;
  stumbles: number;
  chargesBrokenByShock: number;
  /** Per area move: uses, recipients reached (the target included), recipients only the area reached, and own allies it reached. */
  areaMoves: Record<string, { uses: number; recipients: number; areaOnly: number; allies: number }>;
  drainsHealed: number;
  drainsWithheld: number;
  withheldBeneficial: number;
  companionChargesBegun: number;
  companionReleasesLanded: number;
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
        // Decision 20: at equal preview a harm that also carries a status wins.
        if (
          damage > 0 &&
          m.effects.some((e) => e.support === "status" || e.support === "bind")
        )
          score += 0.25;
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
      if (u.bound > 0) stats.companionOpportunitiesUnderParalysis++;
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
        // Pass 3: how the greedy bot reaches the guardian, since only a contact
        // delivery draws Core discharge (contract decision 24).
        if (target?.species === "guardian" && order.move >= -1) {
          if (contactDelivery(m)) stats.contactStrikesOnGuardian++;
          else stats.rangedStrikesOnGuardian++;
        }
        orders[u.id] = order;
      }
    }
    const result = resolveRound(s, orders);
    stats.rounds++;
    // Reaction names seen this round, so the hit that follows a `react` event can be
    // told from an ordered move that happens to share a name.
    const reacting = new Set<string>();
    const areaReached = new Map<
      string,
      { name: string; ids: Set<string>; areaOnly: Set<string>; allies: Set<string> }
    >();
    for (const f of result.frames) {
      const e = f.event;
      if (!e) continue;
      if (e.kind === "blocked" && f.text.includes("Charge dispersed")) stats.bindInterruptions++;
      if (e.kind === "displace") {
        stats.displaceInterruptions++;
        if (e.actorId && preemptive.has(e.actorId)) stats.preemptivePullsBroke++;
      }
      const actor = result.state.enemies.find((t) => t.id === e.actorId);
      // Machine charges only; a companion's own charge is its own row (pass 4).
      if (e.kind === "charge" && actor) stats.chargesBegun++;
      if (e.kind === "hit" && actor && actor.moves.some((m) => m.name === e.moveName && m.preparation === "prolonged")) stats.releasesLanded++;
      if (e.kind === "bind") stats.bindsLanded++;
      if (e.kind === "missed") stats.bindsMissed++;
      const onCompanion = result.state.team.some((t) => t.id === e.targetId);
      if (e.kind === "hit" && onCompanion) stats.companionDamage += e.amount ?? 0;
      if (e.kind === "tick" && e.group === "degrading" && onCompanion) {
        stats.companionDamage += e.amount ?? 0;
        stats.companionDegradeDamage += e.amount ?? 0;
      }
      if ((e.kind === "status" || e.kind === "bind") && e.group)
        stats.applied[e.group]++;
      if (e.kind === "resisted") stats.resisted++;
      if (e.kind === "react") {
        const owner = [...result.state.team, ...result.state.enemies].find(
          (t) => t.id === e.actorId
        );
        const passive = owner?.passives.find((p) => p.name === e.moveName);
        if (passive?.trigger) stats.reactionsFired[passive.trigger]++;
        reacting.add(`${e.actorId}:${e.moveName}`);
      }
      // A reaction's own harm arrives as an ordinary hit under the passive's name.
      if (
        e.kind === "hit" &&
        onCompanion &&
        reacting.has(`${e.actorId}:${e.moveName}`)
      )
        stats.reactionDamage += e.amount ?? 0;
      if (e.kind === "lost") {
        if (e.status === "stunned") stats.lostToStun++;
        else stats.opportunitiesLostToTrance++;
      }
      // Pass 4 rows.
      if (e.kind === "stumble") stats.stumbles++;
      if (e.kind === "broken") stats.chargesBrokenByShock++;
      if (e.kind === "withheld") {
        if (e.reason === "requires") stats.drainsWithheld++;
        else stats.withheldBeneficial++;
      }
      const performer = [...result.state.team, ...result.state.enemies].find(
        (t) => t.id === e.actorId
      );
      const performed = performer?.moves.find((m) => m.name === e.moveName);
      if (e.kind === "restore" && performed?.effects.some((x) => x.requires))
        stats.drainsHealed++;
      if (performer && !performer.enemy && performed) {
        if (e.kind === "charge") stats.companionChargesBegun++;
        if (e.kind === "hit" && !e.area && performed.preparation === "prolonged")
          stats.companionReleasesLanded++;
      }
      // Who each area move reached this round, by performer and move.
      if (
        performed?.area &&
        e.targetId &&
        ["hit", "status", "bind", "resisted", "missed", "withheld"].includes(e.kind)
      ) {
        const key = `${e.actorId}:${e.moveName}`;
        const seen = areaReached.get(key) ?? { name: e.moveName!, ids: new Set<string>(), areaOnly: new Set<string>(), allies: new Set<string>() };
        seen.ids.add(e.targetId);
        if (e.area) seen.areaOnly.add(e.targetId);
        const victim = [...result.state.team, ...result.state.enemies].find((t) => t.id === e.targetId);
        if (victim && victim.enemy === performer!.enemy) seen.allies.add(e.targetId);
        areaReached.set(key, seen);
      }
      if (e.kind === "hidden") stats.hiddenSkips++;
      if (e.kind === "removed") {
        // One "removed" event per condition cleared, plus one when nothing answered.
        if (e.status) stats.removeCleared++;
        else stats.removeUses++;
      }
    }
    for (const reached of areaReached.values()) {
      const row = (stats.areaMoves[reached.name] ??= {
        uses: 0,
        recipients: 0,
        areaOnly: 0,
        allies: 0,
      });
      row.uses++;
      row.recipients += reached.ids.size;
      row.areaOnly += reached.areaOnly.size;
      row.allies += reached.allies.size;
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
    applied: Object.fromEntries(GROUPS.map((g) => [g, 0])) as Record<
      StatusGroup,
      number
    >,
    resisted: 0,
    companionDamage: 0,
    companionDegradeDamage: 0,
    opportunitiesLostToTrance: 0,
    companionOpportunitiesUnderParalysis: 0,
    removeUses: 0,
    removeCleared: 0,
    hiddenSkips: 0,
    reactionsFired: Object.fromEntries(TRIGGERS.map((t) => [t, 0])) as Record<
      Trigger,
      number
    >,
    reactionDamage: 0,
    contactStrikesOnGuardian: 0,
    rangedStrikesOnGuardian: 0,
    lostToStun: 0,
    stumbles: 0,
    chargesBrokenByShock: 0,
    areaMoves: {},
    drainsHealed: 0,
    drainsWithheld: 0,
    withheldBeneficial: 0,
    companionChargesBegun: 0,
    companionReleasesLanded: 0,
  };
  for (let seed = firstSeed; seed < firstSeed + runs; seed++) playRun(seed, stats);
  return stats;
}

/**
  The seam-only roster survey (contract, pass 3 "Measurement"): how many of `seeds`
  records per species carry a passive the seam reads as supported versus unsupported,
  and why. It reads no game state: it is the seam alone, over the wider roster.
*/
export type SeamSurvey = {
  records: number;
  withPassive: number;
  ongoing: number;
  triggered: number;
  supported: number;
  unsupported: number;
  reasons: Record<string, number>;
  byTrigger: Record<string, number>;
  species: Record<string, number>;
};
export function surveyPassives(seeds = 20): SeamSurvey {
  const templates = getSpeciesTemplates();
  const survey: SeamSurvey = {
    records: 0,
    withPassive: 0,
    ongoing: 0,
    triggered: 0,
    supported: 0,
    unsupported: 0,
    reasons: {},
    byTrigger: {},
    species: {},
  };
  for (const template of templates)
    for (let seed = 1; seed <= seeds; seed++) {
      const record = generateXalian(
        template.key,
        `powerworks-seam-${template.key}-${seed}`,
        {
          origin: template.homePlanet,
          serial: 1,
          profile: "full",
          generatedAt: "2026-09-21T00:00:00.000Z",
        }
      );
      const u = readCompanion(record, "X");
      survey.records++;
      if (u.passives.length) survey.withPassive++;
      for (const p of u.passives) {
        survey.species[template.key] = (survey.species[template.key] ?? 0) + 1;
        if (p.kind === "ongoing") survey.ongoing++;
        else {
          survey.triggered++;
          survey.byTrigger[p.trigger ?? "?"] =
            (survey.byTrigger[p.trigger ?? "?"] ?? 0) + 1;
        }
        if (p.support === "supported") survey.supported++;
        else {
          survey.unsupported++;
          const reason = p.reason ?? "unnamed";
          survey.reasons[reason] = (survey.reasons[reason] ?? 0) + 1;
        }
      }
    }
  return survey;
}
export function formatSurvey(survey: SeamSurvey): string {
  const rows: [string, string][] = [
    ["records read", String(survey.records)],
    [
      "records carrying a passive",
      `${survey.withPassive} (${(
        (100 * survey.withPassive) /
        survey.records
      ).toFixed(1)}%)`,
    ],
    ["ongoing / triggered passives", `${survey.ongoing} / ${survey.triggered}`],
    [
      "triggered by trigger",
      Object.entries(survey.byTrigger)
        .map(([k, v]) => `${k} ${v}`)
        .join(", ") || "none",
    ],
    [
      "supported / unsupported",
      `${survey.supported} / ${survey.unsupported}`,
    ],
    [
      "unsupported reasons",
      Object.entries(survey.reasons)
        .map(([k, v]) => `${v}x ${k}`)
        .join("; ") || "none",
    ],
    [
      "species carrying one",
      Object.entries(survey.species)
        .map(([k, v]) => `${k} ${v}`)
        .join(", ") || "none",
    ],
  ];
  const width = Math.max(...rows.map(([k]) => k.length));
  return rows.map(([k, v]) => `${k.padEnd(width)}  ${v}`).join("\n");
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
    // Pass 2 rows.
    [
      "conditions applied per group",
      GROUPS.filter((g) => stats.applied[g])
        .map((g) => `${g} ${stats.applied[g]}`)
        .join(", ") || "none",
    ],
    ["applications resisted or blocked", String(stats.resisted)],
    [
      "degrade share of companion damage taken",
      `${pct(stats.companionDegradeDamage, stats.companionDamage)} (${stats.companionDegradeDamage} of ${stats.companionDamage})`,
    ],
    ["opportunities lost to entranced", String(stats.opportunitiesLostToTrance)],
    [
      "companion opportunities under paralysis",
      `${pct(stats.companionOpportunitiesUnderParalysis, stats.playerOpportunities)} (${stats.companionOpportunitiesUnderParalysis})`,
    ],
    [
      "companion remove: cleared / found nothing",
      `${stats.removeCleared} / ${stats.removeUses}`,
    ],
    ["targets skipped as concealed", String(stats.hiddenSkips)],
    // Pass 3 rows.
    [
      "reactions fired per trigger",
      TRIGGERS.filter((t) => stats.reactionsFired[t])
        .map((t) => `${t} ${stats.reactionsFired[t]}`)
        .join(", ") || "none",
    ],
    [
      "reaction share of companion damage taken",
      `${pct(stats.reactionDamage, stats.companionDamage)} (${
        stats.reactionDamage
      } of ${stats.companionDamage})`,
    ],
    [
      "strikes ordered on the guardian, contact / ranged",
      `${stats.contactStrikesOnGuardian} / ${stats.rangedStrikesOnGuardian}`,
    ],
    // Pass 4 rows.
    ["opportunities lost to stunned", String(stats.lostToStun)],
    ["charges broken by shock", String(stats.chargesBrokenByShock)],
    ["stumbles (disoriented)", String(stats.stumbles)],
    [
      "area moves: uses, recipients (area-only, own allies)",
      Object.entries(stats.areaMoves)
        .map(
          ([name, r]) =>
            `${name.split(" (")[0]} ${r.uses} uses, ${r.recipients} recipients (${r.areaOnly} area-only, ${r.allies} allies)`
        )
        .join("; ") || "none",
    ],
    ["drains healed / withheld", `${stats.drainsHealed} / ${stats.drainsWithheld}`],
    ["beneficial effects withheld from a foe", String(stats.withheldBeneficial)],
    [
      "companion charges begun / releases landed",
      `${stats.companionChargesBegun} / ${stats.companionReleasesLanded}`,
    ],
  ];
  const width = Math.max(...rows.map(([k]) => k.length));
  return rows.map(([k, v]) => `${k.padEnd(width)}  ${v}`).join("\n");
}

/**
  The seam-only action survey (contract, pass 4): over `seeds` records per species, what
  every action effect reads as. Unsupported effects are grouped by the reason the table
  shows; beneficial effects that can only ever reach a foe (withheld every time by
  decision 35) are grouped by status or type; the pass 4 readings (area geometry, drains,
  charged ordinary acts, the new status groups) are counted with the species that carry
  them. It reads no game state: it is the seam alone, over the wider roster.
*/
export type ActionSurvey = {
  records: number;
  actions: number;
  effects: number;
  /** reason -> count and where. */
  unsupported: Record<string, { count: number; species: Set<string>; moves: Set<string> }>;
  /** status or type -> count and where: beneficial, aimed only at foes. */
  withheld: Record<string, { count: number; species: Set<string>; moves: Set<string> }>;
  /** Moves with no effect this game can resolve against a foe. */
  deadMoves: Record<string, { count: number; species: Set<string> }>;
  /** Pass 4 readings: key -> count and species. */
  readings: Record<string, { count: number; species: Set<string>; moves: Set<string> }>;
};
export function surveyActions(seeds = 20): ActionSurvey {
  const survey: ActionSurvey = {
    records: 0,
    actions: 0,
    effects: 0,
    unsupported: {},
    withheld: {},
    deadMoves: {},
    readings: {},
  };
  const note = (
    table: Record<string, { count: number; species: Set<string>; moves: Set<string> }>,
    key: string,
    species: string,
    move: string
  ) => {
    const row = (table[key] ??= { count: 0, species: new Set(), moves: new Set() });
    row.count++;
    row.species.add(species);
    row.moves.add(move);
  };
  for (const template of getSpeciesTemplates())
    for (let seed = 1; seed <= seeds; seed++) {
      const record = generateXalian(
        template.key,
        `powerworks-seam-${template.key}-${seed}`,
        {
          origin: template.homePlanet,
          serial: 1,
          profile: "full",
          generatedAt: "2026-09-21T00:00:00.000Z",
        }
      );
      const u = readCompanion(record, "X");
      survey.records++;
      for (const m of u.moves) {
        survey.actions++;
        const name = m.name.split(" (")[0];
        if (!usable(m)) {
          const row = (survey.deadMoves[name] ??= { count: 0, species: new Set() });
          row.count++;
          row.species.add(template.key);
        }
        if (!m.signature && m.preparation === "prolonged" && usable(m))
          note(survey.readings, "charged ordinary act (prolonged preparation)", template.key, name);
        if (m.area) {
          const harmed = m.effects.some((e) => e.recipient === "area" && e.support === "harm");
          note(
            survey.readings,
            `area ${harmed ? "harm" : "status"}: ${m.area.shape} on ${m.area.anchor}, ${m.area.extent}`,
            template.key,
            name
          );
        }
        for (const e of m.effects) {
          survey.effects++;
          if (e.support === "unsupported") {
            note(survey.unsupported, e.reason ?? "unnamed", template.key, name);
            continue;
          }
          if (e.requires) note(survey.readings, `drain (${e.type} requires ${e.requires})`, template.key, name);
          if (beneficial(e) && !reachesOwnSide(m, e))
            note(survey.withheld, e.status ?? e.type, template.key, name);
          if (e.group && ["shock", "tempo", "senses"].includes(e.group))
            note(survey.readings, `${e.group}: ${e.status}`, template.key, name);
          if (e.status === "focused")
            note(
              survey.readings,
              `focused on ${e.recipient === "self" ? "itself" : "a foe (withheld)"}`,
              template.key,
              name
            );
          if (e.status === "concealed" && e.recipient === "self")
            note(survey.readings, "concealed on itself", template.key, name);
        }
      }
    }
  return survey;
}
export function formatActionSurvey(survey: ActionSurvey): string {
  const where = (row: { species: Set<string>; moves?: Set<string> }) =>
    `${[...row.species].sort().join(", ")}${
      row.moves ? ` [${[...row.moves].sort().join(", ")}]` : ""
    }`;
  const lines: string[] = [
    `records ${survey.records}, actions ${survey.actions}, effects ${survey.effects}`,
    "",
    "unsupported (reason: count, species [moves])",
    ...(Object.entries(survey.unsupported)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([k, r]) => `  ${k}: ${r.count}, ${where(r)}`) || []),
    "",
    "beneficial, aimed only at foes, withheld (status or type: count, species [moves])",
    ...Object.entries(survey.withheld)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([k, r]) => `  ${k}: ${r.count}, ${where(r)}`),
    "",
    "moves with nothing to resolve against a foe (move: count, species)",
    ...Object.entries(survey.deadMoves)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([k, r]) => `  ${k}: ${r.count}, ${where(r)}`),
    "",
    "pass 4 readings (reading: count, species [moves])",
    ...Object.entries(survey.readings)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, r]) => `  ${k}: ${r.count}, ${where(r)}`),
  ];
  return lines.join("\n");
}
