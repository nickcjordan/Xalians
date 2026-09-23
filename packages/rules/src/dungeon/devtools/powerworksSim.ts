/*
  Powerworks measurement: seeded runs under a simple greedy policy.

  Policy per companion per round: bind a charging enemy when a bind is legal (an immediate
  bind first, since only one that lands before the release stops it); pull a known charger
  (an enemy with a prolonged move) with a legal displace even before it has begun charging,
  and count how often that pull breaks a charge begun earlier in the same round; otherwise,
  since pass 5, every legal (move, target) pair, squadmates included, priced by contract
  decision 43 (`pairValue`). The damage-first policy of passes 1 to 4 (highest damage
  preview, a harm with a status winning at equal preview per decision 20, a knockout
  winning ties) is kept as `policy: "pass4"` so the two can be told apart.
  Desperate strike only when it is the sole legal move or nothing else scores. Between
  encounters: revive whoever is down (once), then advance.

  Reports the numbers docs/design/powerworks-v5-mechanics.md pass 1 asks for. Run it as
  the vitest file beside it (`npm test -w packages/rules -- --run powerworksSim`), which
  prints the table, or import `simulate` from another script.
*/
import {
  aimsAtFoe,
  aimsAtSquadmate,
  areaReach,
  basePower,
  command,
  contactDelivery,
  createRun,
  damagePreview,
  damaging,
  draftOffer,
  everyRoundHarms,
  guardedThreat,
  helpful,
  hostile,
  legalMoves,
  legalTargets,
  moveAt,
  readCompanion,
  resolveRound,
  restorePreview,
  squadmateOf,
  tickAmount,
  usable,
  type Frame,
  type Move,
  type MoveEffect,
  type Order,
  type Run,
  type Squad,
  type StatusGroup,
  type Trigger,
  type Unit,
} from "../index.ts";
import { DRAFT_OFFER_SIZE, LIKELIHOOD_PERCENT, SQUAD_SIZE } from "../levers.ts";
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
  /** Pass 5 rows (contract decisions 43 and 44). */
  ordersByMove: Record<string, Record<string, number>>;
  ordersAtSquadmates: number;
  allyHeals: number;
  allyHealed: number;
  allyRemoveUses: number;
  allyRemoveCleared: number;
  allyProtects: number;
  allyPrevented: number;
  /** Pass 6 rows (contract decision 51). Per species in the squad: runs it was drafted into and runs won. */
  squadSpecies: Record<string, { runs: number; wins: number }>;
  /** Per act ("Species: Move"): runs it was carried in, and orders given to it. */
  acts: Record<string, { carried: number; orders: number }>;
  ordersTotal: number;
  /** Orders that begin a charge (prolonged preparation, not already charging). */
  ordersChargeBegun: number;
  /** Orders of a move carrying a status or a bind (supported). */
  ordersStatus: number;
  /** Orders of a support move: one carrying a helpful effect it can aim at a squadmate (decision 39). */
  ordersSupport: number;
  /** Runs the sim stopped at its 400-step guard, still in play: counted as losses. */
  stalledRuns: number;
  /** The longest run, in rounds. */
  longestRun: number;
};

/**
  Sim-only (contract decision 43): the value the greedy policy puts on one hostile status
  landing on a foe, by group, and on clearing one condition of that group from a squadmate.
  It is a measurement tool, not a game lever, so it lives here and never in levers.ts.
  Shock and binding lead, so a removal clears them first. Guarding and mending are helpful,
  never hostile; concealment on a foe only hides it, so it is worth nothing to the squad.
*/
export const SIM_STATUS_VALUE: Record<StatusGroup, number> = {
  shock: 6,
  binding: 5,
  attention: 4,
  degrading: 3,
  tempo: 3,
  senses: 3,
  concealment: 0,
  guarding: 0,
  mending: 0,
};

/** Which policy orders the squad, and whether support is taken away (contract decision 44). */
export type SimOptions = {
  /** "pass5" is decision 43's pricing; "pass4" is the damage-first policy passes 1 to 4 measured with. */
  policy: "pass5" | "pass4";
  /** "none" is the shipped squad. "moves" removes every move carrying a helpful effect from the companions' legal orders (decision 44 as written); "aim" keeps every move but never names a squadmate. */
  healerFree: "none" | "moves" | "aim";
  /** Pass 6 (contract decision 51): the starter squad (the default), a random legal draft, or a greedy draft. */
  draft?: "starter" | "random" | "greedy";
};
const SHIPPED: SimOptions = { policy: "pass5", healerFree: "none" };

/**
  The pass 5 greedy policy (contract decision 43). The two charge answers keep their
  places: a reactive bind on a charging foe, then a pre-emptive pull on a known charger.
  Otherwise every legal (move, target) pair is priced and the best is taken:

    - harm by its preview on the target, with the knockout bonus passes 1 to 4 already
      priced a preview with, so the harm term is unchanged;
    - a charged harm (beginning a charge) by that value halved, for the round it costs;
    - a heal by the HP it would restore on a squadmate below half health;
    - a remove by the conditions it would clear on a squadmate, each at its group's
      SIM_STATUS_VALUE (shock and binding first);
    - a protect or guard by the harm the target's most dangerous attacker previews against
      it, halved, counting only the harm the guard's scope covers (`guardedThreat`);
    - a hostile status by SIM_STATUS_VALUE for its group.

  A pair's value is the sum of the terms its aim lets resolve (decision 40): aimed at a
  squadmate only the helpful ones, aimed at a foe the hostile ones and remove, plus whatever
  lands on the performer. Desperate strike keeps its half-point penalty.
*/
function pairValue(s: Run, u: Unit, i: number, m: Move, t: Unit): number {
  const ally = squadmateOf(u, t);
  let value = 0;
  if (!ally && damaging(m)) {
    const damage = damagePreview(u, m, t);
    let harm = damage + (damage > 0 && damage >= t.hp ? 50 : 0);
    if (m.preparation === "prolonged" && u.charge === null) harm /= 2;
    value += harm;
  }
  const around = areaReach(s, u, m, t);
  for (const e of m.effects) {
    if (e.support === "unsupported") continue;
    if (!ally && hostile(e) && (e.support === "bind" || e.support === "status") && e.group) {
      // A bind only earns its keep against a charge (the reactive rule above already takes
      // that case); spent on an idle machine it wastes a once-per-encounter paralysis.
      if (e.recipient !== "self" && !(e.group === "binding" && t.charge === null)) value += SIM_STATUS_VALUE[e.group];
      continue;
    }
    if (!helpful(e)) continue;
    // Own-side recipients of a helpful effect: the performer for a self effect; the named
    // squadmate and whoever of its line the area reaches when aimed at a squadmate; the
    // performer's own neighbors a burst on self reaches when aimed at a foe.
    const recipients =
      e.recipient === "self"
        ? [u]
        : e.recipient === "target"
        ? ally
          ? [t]
          : []
        : [...(ally ? [t] : []), ...around].filter((r) => r.enemy === u.enemy);
    for (const r of recipients) value += helpValue(s, u, e, r);
  }
  if (i === -1) value -= 0.5; // recoil: prefer any real damage at equal preview
  return value;
}
/** What one helpful effect is worth on one own-side recipient (contract decision 43). */
function helpValue(s: Run, u: Unit, e: MoveEffect, r: Unit): number {
  if (e.support === "restore")
    return r.hp < r.max / 2 ? Math.min(r.max - r.hp, restorePreview(u, e)) : 0;
  if (e.support === "remove")
    return r.conditions
      .filter(
        (c) =>
          c.remaining !== Infinity &&
          c.removable.some((method) => e.methods?.includes(method))
      )
      .reduce((sum, c) => sum + SIM_STATUS_VALUE[c.group], 0);
  if (e.support === "protect" || e.group === "guarding")
    return guardedThreat(s, r, e) / 2;
  if (e.group === "mending") {
    // A mending status is a heal spread over its duration.
    const tick = tickAmount(
      { status: e.status ?? "mending", group: "mending", intensity: e.intensity, remaining: 1, source: u.id, removable: [] },
      r
    );
    return r.hp < r.max / 2 ? Math.min(r.max - r.hp, tick * (e.opportunities ?? 1)) : 0;
  }
  return 0;
}
/**
  Sim-only (contract decision 51): what the greedy draft adds for an answer the squad does
  not carry yet. A bind and a displace are the two answers to a charge; a support move is
  worth a little less, since the pass 5 sim found the squad rarely spends one.
*/
export const SIM_DRAFT_ANSWER_VALUE = { bind: 5, displace: 5, support: 3 } as const;
/** A small seeded stream for the random draft, apart from the run's rng. */
function draftRandom(seed: number) {
  let state = (Math.imul(seed >>> 0, 2654435761) ^ 0x5bd1e995) >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
/** A random legal draft: SQUAD_SIZE distinct offer indexes, seeded (contract decision 51). */
export function randomDraft(seed: number): number[] {
  const random = draftRandom(seed);
  const indexes = Array.from({ length: DRAFT_OFFER_SIZE }, (_, i) => i);
  for (let i = indexes.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
  }
  return indexes.slice(0, SQUAD_SIZE);
}
/**
  The greedy draft (contract decision 51): pick one creature at a time by its every-round
  harm preview (the best attribute-scaled base power among its every-round harms, the number
  its move card shows) plus SIM_DRAFT_ANSWER_VALUE for each answer (bind, displace, support)
  the squad does not carry yet. Ties go to the earlier offer index.
*/
export function greedyDraft(seed: number): number[] {
  const offer = draftOffer(seed);
  const picked: number[] = [];
  const has = { bind: false, displace: false, support: false };
  while (picked.length < SQUAD_SIZE) {
    let best = -1;
    let bestScore = -Infinity;
    for (const e of offer) {
      if (picked.includes(e.index)) continue;
      const harm = Math.max(
        0,
        ...everyRoundHarms(e.unit).map((i) => basePower(e.unit, e.unit.moves[i]))
      );
      let score = harm;
      for (const answer of ["bind", "displace", "support"] as const)
        if (e.answers[answer] && !has[answer]) score += SIM_DRAFT_ANSWER_VALUE[answer];
      if (score > bestScore) {
        bestScore = score;
        best = e.index;
      }
    }
    picked.push(best);
    for (const answer of ["bind", "displace", "support"] as const)
      has[answer] ||= offer[best].answers[answer];
  }
  return picked;
}
/** A move carries a helpful effect (contract decision 44's healer-free crew drops these). */
const supportMove = (m: Move) => m.effects.some((e) => helpful(e));
function choose(u: Unit, s: Run, options: SimOptions): Order | null {
  if (options.policy === "pass4") return choosePass4(u, s.enemies);
  const legal = legalMoves(u, s).filter(
    (i) => options.healerFree !== "moves" || i < 0 || !supportMove(u.moves[i])
  );
  if (!legal.length) return null;
  let best: { order: Order; score: number } | null = null;
  for (const i of legal) {
    const m = moveAt(u, i);
    const bind = m.effects.find((e) => e.support === "bind");
    const pull = m.effects.some((e) => e.support === "displace");
    for (const t of legalTargets(s, u, i)) {
      const ally = squadmateOf(u, t);
      if (ally && options.healerFree === "aim") continue;
      let score: number;
      const charger = t.moves.some((c) => c.preparation === "prolonged");
      if (!ally && bind && t.charge)
        score = 1000 + (m.preparation === "immediate" ? 10 : 0) + LIKELIHOOD_PERCENT[bind.likelihood] / 100;
      else if (!ally && pull && charger) score = 900 + (t.charge ? 50 : 0);
      else score = pairValue(s, u, i, m, t);
      if (!best || score > best.score) best = { order: { move: i, target: t.id }, score };
    }
  }
  if (best) return best.order;
  const fallback = legal[0];
  return { move: fallback, target: legalTargets(s, u, fallback)[0]?.id ?? "" };
}

/** The damage-first policy passes 1 to 4 measured with, kept so pass 5 can tell the policy's effect from ally targeting's. */
function choosePass4(u: Unit, enemies: Unit[]): Order | null {
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

/**
  Harm a guard applied by a squadmate kept off a companion on one hit: the preview the hit
  would have dealt without those guards, less what it dealt. Read from the frame before the
  hit, so the attacker's and the victim's state are the ones the resolver used.
*/
function preventedBySquadmate(
  before: Frame,
  event: NonNullable<Frame["event"]>,
  allyWarded: Set<string>
): number {
  const units = [...before.team, ...before.enemies];
  const attacker = units.find((u) => u.id === event.actorId);
  const victim = units.find((u) => u.id === event.targetId);
  if (!attacker || !victim || victim.enemy) return 0;
  const fromMate = (source: string) =>
    source !== victim.id && before.team.some((t) => t.id === source);
  const guarded =
    (victim.ward && allyWarded.has(victim.id)) ||
    victim.conditions.some((c) => c.group === "guarding" && fromMate(c.source));
  if (!guarded) return 0;
  const move =
    attacker.moves.find((m) => m.name === event.moveName) ??
    (() => {
      const passive = attacker.passives.find((p) => p.name === event.moveName);
      return passive
        ? ({ ...passive, approach: "stationary", range: "contact", preparation: "immediate", recovery: "repeatable" } as unknown as Move)
        : undefined;
    })();
  if (!move) return 0;
  const bare: Unit = {
    ...victim,
    ward: victim.ward && !allyWarded.has(victim.id),
    conditions: victim.conditions.filter(
      (c) => !(c.group === "guarding" && fromMate(c.source))
    ),
  };
  const without = damagePreview(attacker, move, bare, event.area ? "area" : "target");
  return Math.max(0, without - (event.amount ?? 0));
}

export function playRun(seed: number, stats: SimStats, options: SimOptions = SHIPPED) {
  const squad: Squad =
    options.draft === "random"
      ? randomDraft(seed)
      : options.draft === "greedy"
      ? greedyDraft(seed)
      : "starter";
  let s: Run = createRun(seed, squad);
  // Pass 6 rows: who was drafted and which acts the squad carried.
  for (const u of s.team) {
    (stats.squadSpecies[u.species] ??= { runs: 0, wins: 0 }).runs++;
    for (const name of new Set(u.moves.map((m) => m.name.split(" (")[0])))
      (stats.acts[`${u.name}: ${name}`] ??= { carried: 0, orders: 0 }).carried++;
  }
  /** Companions whose standing ward came from a squadmate, until it is spent. */
  const allyWarded = new Set<string>();
  let guard = 0;
  let rooms = 1;
  let roundsThisRun = 0;
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
      const order = choose(u, s, options);
      if (!order) {
        stats.lockouts++;
        orders[u.id] = { move: -2, target: "" };
      } else {
        if (order.move === -1) stats.desperateStrikes++;
        const m = moveAt(u, order.move);
        const byMove = (stats.ordersByMove[u.name] ??= {});
        const moveName = m.name.split(" (")[0];
        byMove[moveName] = (byMove[moveName] ?? 0) + 1;
        // Pass 6 rows (contract decision 51).
        stats.ordersTotal++;
        if (order.move >= 0) {
          (stats.acts[`${u.name}: ${moveName}`] ??= { carried: 0, orders: 0 }).orders++;
          if (m.preparation === "prolonged" && u.charge === null) stats.ordersChargeBegun++;
          if (m.effects.some((e) => e.support === "bind" || e.support === "status"))
            stats.ordersStatus++;
          if (aimsAtSquadmate(m)) stats.ordersSupport++;
        }
        if (s.team.some((t) => t.id === order.target && t.id !== u.id))
          stats.ordersAtSquadmates++;
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
    roundsThisRun++;
    // Reaction names seen this round, so the hit that follows a `react` event can be
    // told from an ordered move that happens to share a name.
    const reacting = new Set<string>();
    const areaReached = new Map<
      string,
      { name: string; ids: Set<string>; areaOnly: Set<string>; allies: Set<string> }
    >();
    const isCompanion = (id?: string) => result.state.team.some((t) => t.id === id);
    for (const [k, f] of result.frames.entries()) {
      const e = f.event;
      // A ward a squadmate gave is spent once the frame shows it gone.
      for (const id of [...allyWarded])
        if (!f.team.find((t) => t.id === id)?.ward) allyWarded.delete(id);
      if (!e) continue;
      // Pass 5 rows: help one companion gives another (never itself).
      const toSquadmate =
        isCompanion(e.actorId) && isCompanion(e.targetId) && e.actorId !== e.targetId;
      if (toSquadmate && e.kind === "restore") {
        stats.allyHeals++;
        stats.allyHealed += e.amount ?? 0;
      }
      if (toSquadmate && e.kind === "removed") {
        if (e.status) stats.allyRemoveCleared++;
        else stats.allyRemoveUses++;
      }
      if (toSquadmate && e.kind === "ward") {
        stats.allyProtects++;
        allyWarded.add(e.targetId!);
      }
      if (toSquadmate && e.kind === "status" && e.group === "guarding") stats.allyProtects++;
      if (e.kind === "hit" && isCompanion(e.targetId) && k > 0)
        stats.allyPrevented += preventedBySquadmate(result.frames[k - 1], e, allyWarded);
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
        // `removeUses` counts only the ones that found nothing (the row's name since pass 2).
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
  if (s.phase === "planning" || s.phase === "camp") stats.stalledRuns++;
  stats.longestRun = Math.max(stats.longestRun, roundsThisRun);
  if (s.phase === "won") {
    stats.wins++;
    for (const u of s.team) stats.squadSpecies[u.species].wins++;
  } else stats.losses++;
}

export function simulate(
  runs = 200,
  firstSeed = 1,
  options: SimOptions = SHIPPED
): SimStats {
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
    ordersByMove: {},
    ordersAtSquadmates: 0,
    allyHeals: 0,
    allyHealed: 0,
    allyRemoveUses: 0,
    allyRemoveCleared: 0,
    allyProtects: 0,
    allyPrevented: 0,
    squadSpecies: {},
    acts: {},
    ordersTotal: 0,
    ordersChargeBegun: 0,
    ordersStatus: 0,
    ordersSupport: 0,
    stalledRuns: 0,
    longestRun: 0,
  };
  for (let seed = firstSeed; seed < firstSeed + runs; seed++)
    playRun(seed, stats, options);
  return stats;
}

/** The pass 5 rows (contract decisions 43 and 44): orders per move and what support did. */
export function formatPass5(stats: SimStats): string {
  const rows: [string, string][] = [
    ["orders naming a squadmate", String(stats.ordersAtSquadmates)],
    ["heals on squadmates (HP restored)", `${stats.allyHeals} (${stats.allyHealed})`],
    [
      "removes on squadmates: cleared / found nothing",
      `${stats.allyRemoveCleared} / ${stats.allyRemoveUses}`,
    ],
    ["protects on squadmates (harm prevented)", `${stats.allyProtects} (${stats.allyPrevented})`],
    ...Object.entries(stats.ordersByMove).map(
      ([name, moves]): [string, string] => [
        `orders: ${name}`,
        Object.entries(moves)
          .sort((a, b) => b[1] - a[1])
          .map(([move, n]) => `${move} ${n}`)
          .join(", "),
      ]
    ),
  ];
  const width = Math.max(...rows.map(([k]) => k.length));
  return rows.map(([k, v]) => `${k.padEnd(width)}  ${v}`).join("\n");
}

/**
  The pass 6 rows (contract decision 51): win rate by species drafted (with counts), the most
  and least ordered acts (orders per run the act was carried in), and how often charged,
  status and support moves are ordered.
*/
export function formatPass6(stats: SimStats, rows = 12): string {
  const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : "n/a");
  const species = Object.entries(stats.squadSpecies).sort(
    (a, b) => b[1].wins / b[1].runs - a[1].wins / a[1].runs || b[1].runs - a[1].runs
  );
  const acts = Object.entries(stats.acts)
    .filter(([, a]) => a.carried > 0)
    .map(([name, a]) => ({ name, ...a, rate: a.orders / a.carried }));
  const most = [...acts]
    .filter((a) => a.carried >= 10)
    .sort((a, b) => b.rate - a.rate || b.carried - a.carried)
    .slice(0, rows);
  const least = [...acts]
    .filter((a) => a.carried >= 10)
    .sort((a, b) => a.rate - b.rate || b.carried - a.carried)
    .slice(0, rows);
  const lines = [
    `win rate ${pct(stats.wins, stats.runs)} (${stats.wins} won, ${stats.losses} lost)`,
    `orders ${stats.ordersTotal}: charge begun ${stats.ordersChargeBegun} (${pct(stats.ordersChargeBegun, stats.ordersTotal)}), status-carrying ${stats.ordersStatus} (${pct(stats.ordersStatus, stats.ordersTotal)}), support move ${stats.ordersSupport} (${pct(stats.ordersSupport, stats.ordersTotal)}), named a squadmate ${stats.ordersAtSquadmates} (${pct(stats.ordersAtSquadmates, stats.ordersTotal)})`,
    `companion charges begun / releases landed ${stats.companionChargesBegun} / ${stats.companionReleasesLanded}`,
    `runs stopped at the 400-step guard (counted lost) ${stats.stalledRuns}; longest run ${stats.longestRun} rounds`,
    `heals on squadmates ${stats.allyHeals} (${stats.allyHealed} HP), removes cleared ${stats.allyRemoveCleared}, protects ${stats.allyProtects} (${stats.allyPrevented} prevented)`,
    "",
    "species: runs drafted, win rate",
    ...species.map(
      ([k, v]) => `  ${k.padEnd(12)} ${String(v.runs).padStart(4)}  ${pct(v.wins, v.runs)}`
    ),
    "",
    "most ordered acts carried in at least 10 runs: orders (runs carried, orders per run)",
    ...most.map((a) => `  ${a.name}: ${a.orders} (${a.carried}, ${a.rate.toFixed(1)})`),
    "",
    "least ordered acts carried in at least 10 runs: orders (runs carried, orders per run)",
    ...least.map((a) => `  ${a.name}: ${a.orders} (${a.carried}, ${a.rate.toFixed(1)})`),
  ];
  return lines.join("\n");
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
  shows; helpful effects that reach their target (aimed at a squadmate since pass 5,
  decision 39) are grouped by status or type; the pass 4 readings (area geometry, drains,
  charged ordinary acts, the new status groups) are counted with the species that carry
  them. It reads no game state: it is the seam alone, over the wider roster.
*/
export type ActionSurvey = {
  records: number;
  actions: number;
  effects: number;
  /** reason -> count and where. */
  unsupported: Record<string, { count: number; species: Set<string>; moves: Set<string> }>;
  /** status or type -> count and where: helpful effects that reach the target, aimed at a squadmate since pass 5. */
  allyAimed: Record<string, { count: number; species: Set<string>; moves: Set<string> }>;
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
    allyAimed: {},
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
          // Pass 5: a helpful effect that reaches its target is aimed at a squadmate
          // (contract decision 39); before pass 5 it could only ever be withheld from a foe.
          if (helpful(e) && e.recipient !== "self")
            note(
              survey.allyAimed,
              `${e.status ?? e.type}${aimsAtFoe(m) ? " (move also aims at a foe)" : " (squadmates only)"}`,
              template.key,
              name
            );
          if (e.group && ["shock", "tempo", "senses"].includes(e.group))
            note(survey.readings, `${e.group}: ${e.status}`, template.key, name);
          if (e.status === "focused")
            note(
              survey.readings,
              `focused on ${e.recipient === "self" ? "itself" : "a squadmate"}`,
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
    "helpful, aimed at a squadmate (status or type: count, species [moves])",
    ...Object.entries(survey.allyAimed)
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
