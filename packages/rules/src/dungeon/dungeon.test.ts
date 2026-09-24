import { describe, expect, it } from "vitest";
import {
  COMPANION_KEYS,
  COMPANION_RECORDS,
  command,
  createRun,
  draftCandidate,
  draftOffer,
  draftOrder,
  everyRoundHarms,
  openRun,
  unitIds,
  damagePreview,
  basePower,
  areaReach,
  damaging,
  effectiveSpeed,
  initiative,
  legalMoves,
  legalTargets,
  guardedThreat,
  aimsAtFoe,
  aimsAtSquadmate,
  helpful,
  hostile,
  restorePreview,
  moveAt,
  readCompanion,
  resolveRound,
  restoreRun,
  selfBurst,
  statusGroup,
  tickAmount,
  usable,
  type Command,
  type Order,
  type Run,
  type Unit,
} from "./index.ts";
import {
  AREA_HARM_FACTOR,
  ATTENTION_OPPORTUNITIES,
  BINDING_OPPORTUNITIES,
  BLINDED_RANGED_FACTOR,
  SLOWED_SPEED_FACTOR,
  COOLDOWN_ROUNDS,
  DEGRADE_FACTOR,
  DRAFT_OFFER_SIZE,
  DRAFT_SEEDS_PER_SPECIES,
  ENCOUNTER_STALL_ROUNDS,
  SAVE_VERSION,
  SQUAD_SIZE,
  ENTRANCE_IMMUNITY_OPPORTUNITIES,
  FRIGHTENED_OUTPUT_FACTOR,
  LIKELIHOOD_PERCENT,
  LINGERING_OPPORTUNITIES,
  REINFORCED_FACTOR,
  SHIELDED_FACTOR,
  WARD_FACTOR,
} from "./levers.ts";
import cards from "./cards.json";
import {
  innateConditions,
  readCard,
  readEffect,
  type Card,
  type CardEffect,
  type CardPassive,
  type Move,
  type MoveEffect,
} from "./reading.ts";
import {
  generateXalian,
  getSpeciesTemplates,
} from "../generator/canonicalCreatureRelease.ts";
import type { CreatureRecord } from "@xalians/content/creature";

function orders(s: Run): Record<string, Order> {
  return Object.fromEntries(
    s.team
      .filter((u) => u.hp > 0)
      .map((u) => [
        u.id,
        {
          move: legalMoves(u)[0] ?? -2,
          target: s.enemies.find((e) => e.hp > 0)!.id,
        },
      ])
  );
}
const unit = (s: Run, id: string) =>
  [...s.team, ...s.enemies].find((u) => u.id === id)!;
function boss() {
  let s = createRun(1);
  for (let i = 0; i < 3; i++) {
    s.phase = "camp";
    s = command(s, { kind: "advance" });
  }
  return s;
}
/** The guardian alone, with the health to outlast a few rounds of testing. */
function lone() {
  const s = boss();
  s.enemies.filter((u) => u.id !== "B4").forEach((u) => (u.hp = 0));
  unit(s, "B4").hp = 500;
  s.team.forEach((u) => (u.hp = u.max = 500));
  return s;
}
/**
  Orders in which nobody binds, pulls or afflicts the guardian, so a charge it begins
  stands until the test acts on it. Chosen by what each move does, not by its index,
  so the helper does not depend on what a companion seed happened to roll.
*/
const quiet = (s: Run): Record<string, Order> => plain(s);
/** A plain harm effect, for fitted moves. */
const harm = (intensity: number, mechanism: CardEffect["mechanism"] = "impact"): CardEffect => ({
  key: "outcome",
  type: "harm",
  recipient: "target",
  likelihood: "consistent",
  intensity,
  mechanism,
});
/** A short-range harm that binds, pulls and afflicts nothing: the filler a test gives a bystander. */
const tap = (over: Partial<Move> = {}) => fitted("Quiet Tap", [harm(10)], over);
/** Give a unit exactly these fitted moves, all ready. */
function fitMoves(u: Unit, moves: Move[]) {
  u.moves = moves;
  u.cooldowns = moves.map(() => 0);
  u.signatureSpent = false;
}
const clone = <T,>(v: T): T => structuredClone(v);
const hasEvent = (r: { frames: { event?: { kind: string } }[] }, kind: string) =>
  r.frames.some((f) => f.event?.kind === kind);

/*
  Since pass 6 a run's four companions are the starter squad or four drafted from the offer
  (contract decisions 45 to 48). The shape checks hold for any squad; the intro-lesson checks
  (the two answers to a charge, the charged act, the fastest companion) are the starter's,
  because the offer guarantees the answers between eight creatures, not on any four picked.
*/
/** The starter plus drafted squads over a few seeds: every shape a run's team can take. */
const squads = (): Run[] => [
  createRun(1),
  ...[1, 2, 3, 4, 5].flatMap((seed) => [
    createRun(seed, [0, 1, 2, 3]),
    createRun(seed, [4, 5, 6, 7]),
  ]),
];
describe("Powerworks reads its companions", () => {
  it("reads four moves each from the frozen release with exactly one signature, action or passive, for any squad", () => {
    const units = [
      ...COMPANION_KEYS.map((key) => readCompanion(COMPANION_RECORDS[key], key.toUpperCase())),
      ...squads().flatMap((s) => s.team),
    ];
    for (const u of units) {
      expect(u.moves, u.species).toHaveLength(4);
      // A drafted species may carry its signature as a passive (Imprit's contact burn), so
      // the one signature is counted over actions and passives together.
      expect(
        [...u.moves, ...u.passives].filter((m) => m.signature),
        u.species
      ).toHaveLength(1);
      expect(u.hp).toBeGreaterThan(0);
      expect(u.hp).toBe(u.max);
      expect(u.speed).toBeGreaterThan(0);
      expect(u.attrs.strength).toBeGreaterThan(0);
      expect(u.cooldowns).toEqual([0, 0, 0, 0]);
      for (const m of u.moves) {
        expect(["closing", "stationary", "self"]).toContain(m.approach);
        expect(m.effects.length).toBeGreaterThan(0);
        for (const e of m.effects)
          if (e.support === "unsupported") expect(e.reason).toBeTruthy();
      }
    }
    for (const key of COMPANION_KEYS)
      expect(readCompanion(COMPANION_RECORDS[key], "X").species).toBe(key);
  });
  it("gives every squad four unique letter ids that never meet a machine's", () => {
    const machineIds = new Set(cards.rooms.flatMap((r) => r.enemies.map((row) => String(row[1]))));
    for (const s of squads()) {
      const ids = s.team.map((u) => u.id);
      expect(new Set(ids).size).toBe(4);
      for (const id of ids) {
        expect(id).toMatch(/^[A-Z][a-z]*$/);
        expect(machineIds.has(id)).toBe(false);
      }
    }
    expect(createRun(1).team.map((u) => u.id).sort()).toEqual(["A", "C", "G", "H"]);
  });
  it("every starter companion can deal damage and the fastest one outspeeds every charger", () => {
    // The intro lesson (stop the charge) needs a companion who acts before the release.
    const s = createRun(1);
    for (const u of s.team)
      expect(u.moves.filter((m) => damaging(m)).length, u.name).toBeGreaterThan(0);
    const fastest = Math.max(...s.team.map((u) => u.speed));
    const chargers = Object.entries(cards.templates).filter(([, t]) =>
      (t as Card).moves.some((m) => m.preparation === "prolonged")
    );
    expect(chargers.length).toBeGreaterThan(0);
    for (const [key, t] of chargers)
      expect(fastest, `${key} charges at speed ${t.speed}`).toBeGreaterThan(t.speed);
  });
  it("the starter carries the intro's two answers to a charge and four distinct actions each", () => {
    const s = createRun(1);
    // Avilily's paralysis (a bind) and Graviclaw's pull (a displace) are the lesson.
    expect(
      unit(s, "A").moves.some((m) => m.effects.some((e) => e.status === "paralyzed" && e.support === "bind"))
    ).toBe(true);
    expect(
      unit(s, "G").moves.some((m) => m.effects.some((e) => e.support === "displace"))
    ).toBe(true);
    for (const u of s.team) {
      // No two actions share a tray name, and nothing the squad carries is unsupported.
      const names = u.moves.map((m) => m.name.split(" (")[0]);
      expect(new Set(names).size, `${u.name}: ${names.join(", ")}`).toBe(4);
      for (const m of u.moves)
        for (const e of m.effects)
          expect(e.support, `${u.name} ${m.name} ${e.type}`).not.toBe("unsupported");
    }
  });
  it("the starter carries a real ordinary charged act on at least one companion (decision 36)", () => {
    // Creature pass two lets crush, beam and burst roll prolonged preparation, so the
    // player-side charge-up is exercised by a creature, not only by the machines. Any
    // companion may carry it, but not as a burst that reaches squadmates (decision 37).
    const s = createRun(1);
    const carriers = s.team.flatMap((u) =>
      u.moves
        .map((m, i) => ({ u, m, i }))
        .filter(
          ({ m }) =>
            !m.signature && m.preparation === "prolonged" && usable(m) && !selfBurst(m)
        )
    );
    expect(carriers.length, "no companion carries a usable ordinary charged act").toBeGreaterThan(0);
    for (const { u, i } of carriers) expect(legalMoves(u), u.name).toContain(i);
  });
  it("keeps an every-round harm on every companion of any squad, after its signature (decisions 37 and 46)", () => {
    // Throughput, not only the lessons: 0.7.0-3's kits alone took the greedy win rate from
    // 98% to 79% because three companions lost every harm they could use each round. Since
    // pass 6 the offer only carries creatures that pass, so every drafted squad does too.
    for (const s of squads())
      for (const u of s.team) {
        u.signatureSpent = true;
        const everyRound = everyRoundHarms(u);
        expect(everyRound, u.species).toEqual(
          u.moves
            .map((m, i) => ({ m, i }))
            .filter(
              ({ m }) =>
                !m.signature &&
                m.effects.some((e) => e.support === "harm") &&
                m.recovery === "repeatable" &&
                m.preparation !== "prolonged" &&
                !selfBurst(m) &&
                usable(m) &&
                // Decision 37 counts only a harm that previews at least 1 (pass 6).
                basePower(u, m) >= 1
            )
            .map(({ i }) => i)
        );
        expect(everyRound.length, `${u.name}: ${u.moves.map((m) => m.name.split(" (")[0]).join(", ")}`).toBeGreaterThan(0);
        // Repeatable means it is legal again at once: used, it sets no cooldown.
        const i = everyRound[0];
        u.cooldowns[i] = COOLDOWN_ROUNDS[u.moves[i].recovery];
        expect(legalMoves(u), u.name).toContain(i);
        expect(legalMoves(u), u.name).not.toContain(-1);
      }
  });
  it("names unsupported effects and keeps a move usable only when some effect is supported (starter)", () => {
    const s = createRun(1);
    // Pass 2 reads Ground Anchor: protected with a declared displacement immunity.
    const g = unit(s, "G");
    const anchor = g.moves.find((m) => m.effects[0].type === "status")!;
    expect(anchor.effects[0].support).toBe("status");
    expect(anchor.effects[0].group).toBe("guarding");
    expect(anchor.effects[0].protection).toEqual({
      type: "displace",
      degree: "immune",
    });
    expect(legalMoves(g)).toContain(g.moves.indexOf(anchor));
    // Pass 2 reads Hippochamp's cannon as harm plus a real removal (cooling).
    const h = unit(s, "H");
    const cannon = h.moves.find((m) => m.signature)!;
    expect(cannon.effects.map((e) => e.support)).toEqual(["harm", "remove"]);
    expect(cannon.effects[1].methods).toEqual(["cooling"]);
    expect(legalMoves(h)).toContain(0);
    // Every effect the four companions carry is now supported, so the "no effect here"
    // path is exercised at the seam instead: traversal statuses stay unsupported.
    for (const status of ["dispersed", "phased", "marked"]) {
      const read = readEffect({
        key: "outcome",
        type: "status",
        recipient: "target",
        likelihood: "consistent",
        status,
        persistence: "lingering",
        duration: "brief",
        removable: ["disrupting"],
      });
      expect(read.support).toBe("unsupported");
      expect(read.reason).toContain(status);
    }
    // Avilily reads two paralysis touches as binds and two touches as harm, so no Desperate strike.
    const a = unit(s, "A");
    expect(a.moves.filter((m) => m.effects[0].support === "bind").length).toBe(2);
    expect(legalMoves(a)).not.toContain(-1);
  });
});

describe("Powerworks battle rules", () => {
  it("rejects incomplete or cooling orders without consuming state or changing hidden plans", () => {
    const s = createRun(9),
      before = structuredClone(s);
    expect(() => resolveRound(s, {})).toThrow();
    expect(s).toEqual(before);
    const q = orders(s);
    const u = s.team[0];
    u.cooldowns[q[u.id].move] = 1;
    expect(() => resolveRound(s, q)).toThrow();
  });
  it("binding blocks closing moves before execution without cooling them, but not stationary contact", () => {
    const s = createRun();
    const e = s.enemies[0];
    e.bound = 1;
    const r = resolveRound(s, orders(s));
    expect(r.state.log.some((l) => l.includes("stopped by binding"))).toBe(true);
    expect(unit(r.state, e.id).cooldowns).toEqual([0]);
    // A companion carrying both approaches: bound, only its stationary moves stay legal,
    // and a stationary damaging move keeps Desperate strike off the list.
    const contact = { range: "contact" as const };
    const closing = { range: "contact" as const, approach: "closing" as const };
    const h = unit(s, "H");
    fitMoves(h, [
      fitted("Closing Ram", [harm(50)], closing),
      fitted("Standing Jab", [harm(40)], contact),
      fitted("Closing Grab", [statusEffect("restrained", { removable: ["freeing"] })], closing),
      fitted("Standing Hold", [statusEffect("paralyzed", { removable: ["stabilizing"] })], contact),
    ]);
    h.bound = 1;
    const legal = legalMoves(h);
    expect(legal).not.toContain(-1);
    expect(legal.every((i) => h.moves[i].approach === "stationary")).toBe(true);
    expect(legal).toEqual([1, 3]);
    expect(h.moves.some((m) => m.approach === "closing")).toBe(true);
    // Stationary contact is not a closing move: a companion whose every move touches
    // without closing loses nothing to binding.
    const a = unit(s, "A");
    fitMoves(a, [
      fitted("Standing Jab", [harm(40)], contact),
      fitted("Standing Peck", [harm(20, "piercing")], contact),
      fitted("Standing Hold", [statusEffect("paralyzed", { removable: ["stabilizing"] })], contact),
      fitted("Standing Grip", [statusEffect("restrained", { removable: ["freeing"] })], contact),
    ]);
    a.bound = 1;
    expect(a.moves.every((m) => m.range === "contact" && m.approach === "stationary")).toBe(true);
    expect(legalMoves(a)).toEqual([0, 1, 2, 3]);
  });
  it("retargets the same signature and spends it exactly once", () => {
    const s = createRun();
    s.enemies[0].hp = 1;
    s.enemies[1].hp = 200;
    const q = orders(s);
    q.C = { move: 0, target: s.enemies[0].id };
    const r = resolveRound(s, q).state;
    expect(r.log.some((l) => l.includes("Crystorn redirects Gem Radiance"))).toBe(true);
    const c = unit(r, "C");
    expect(c.signatureSpent).toBe(true);
    expect(c.cooldowns[0]).toBe(COOLDOWN_ROUNDS.brief);
  });
  it("does not announce a redirect for a self-only move whose ordered target has fallen", () => {
    const s = createRun();
    const g = unit(s, "G");
    const anchor = g.moves.findIndex((m) => m.effects.every((e) => e.recipient === "self"));
    expect(anchor).toBeGreaterThanOrEqual(0);
    s.enemies[0].hp = 1;
    s.enemies[1].hp = 200;
    const q = orders(s);
    q.G = { move: anchor, target: s.enemies[0].id };
    const r = resolveRound(s, q);
    expect(r.frames.some((f) => f.event?.kind === "redirect" && f.event.actorId === "G")).toBe(false);
    expect(r.state.log.some((l) => l.includes("Graviclaw redirects"))).toBe(false);
    expect(unit(r.state, "G").conditions.some((c) => c.status === "protected")).toBe(true);
  });
  it("ends immediately after the final knockout and preserves unexecuted orders", () => {
    const s = createRun();
    s.enemies[0].hp = 1;
    s.enemies[1].hp = 0;
    const r = resolveRound(s, orders(s)).state;
    expect(r.phase).toBe("camp");
    expect(r.xp).toBe(10);
    const c = unit(r, "C");
    expect(c.cooldowns).toEqual([0, 0, 0, 0]);
    expect(c.signatureSpent).toBe(false);
  });
  it("cooldown gates a move for its recovery rounds and then returns it", () => {
    let s = lone();
    fitMoves(unit(s, "C"), [
      fitted("Quick Jab", [harm(30)]),
      fitted("Heavy Swing", [harm(60)], { recovery: "brief" }),
    ]);
    const q = orders(s);
    q.C = { move: 1, target: "B4" };
    s = resolveRound(s, q).state;
    let c = unit(s, "C");
    expect(c.moves[1].recovery).toBe("brief");
    expect(c.cooldowns[1]).toBe(1);
    expect(COOLDOWN_ROUNDS.brief).toBe(1);
    expect(legalMoves(c)).not.toContain(1);
    expect(legalMoves(c)).toContain(0);
    s = resolveRound(s, orders(s)).state;
    c = unit(s, "C");
    expect(c.cooldowns[1]).toBe(0);
    expect(legalMoves(c)).toContain(1);
  });
  it("the signature is usable once per encounter, beyond its cooldown, and refreshes at the next one", () => {
    let s = lone();
    const q = orders(s);
    q.C = { move: 0, target: "B4" };
    s = resolveRound(s, q).state;
    expect(unit(s, "C").signatureSpent).toBe(true);
    s = resolveRound(s, orders(s)).state;
    s = resolveRound(s, orders(s)).state;
    const c = unit(s, "C");
    expect(c.cooldowns[0]).toBe(0);
    expect(legalMoves(c)).not.toContain(0);
    expect(() => resolveRound(s, { ...orders(s), C: { move: 0, target: "B4" } })).toThrow();
    let next = createRun(1);
    next.team.forEach((u) => (u.signatureSpent = true));
    next.phase = "camp";
    next = command(next, { kind: "advance" });
    expect(next.team.every((u) => !u.signatureSpent)).toBe(true);
  });
  it("a boss bound on release may charge again at its next opportunity (interrupted recovery lever 0)", () => {
    let s = lone();
    s = resolveRound(s, quiet(s)).state;
    expect(unit(s, "B4").charge).toBeTruthy();
    // The bind must land before the release, and it must land: a consistent hold from a
    // companion faster than the guardian.
    fitOnly(
      unit(s, "A"),
      fitted("Test Hold", [statusEffect("paralyzed", { removable: ["stabilizing"] })], {
        range: "contact",
      })
    );
    unit(s, "A").speed = 100;
    const q = orders(s);
    q.A = { move: 0, target: "B4" };
    const r = resolveRound(s, q);
    expect(hasEvent(r, "bind")).toBe(true);
    s = r.state;
    const b = unit(s, "B4");
    expect(b.charge).toBeNull();
    expect(b.recovery).toBe(0);
    expect(moveAt(b, s.orders.B4.move).preparation).toBe("prolonged");
  });
  it("displace breaks a charge, deals its share of harm, and blocks only the stale release", () => {
    let s = lone();
    // Nobody but the puller may bind or pull: the guardian must be free when the pull
    // lands, and the pull must be the only thing that could break its charge.
    for (const id of ["A", "C", "H"]) fitOnly(unit(s, id), tap());
    fitMoves(unit(s, "G"), [
      tap(),
      fitted(
        "Test Pull",
        [
          {
            key: "outcome",
            type: "displace",
            recipient: "target",
            likelihood: "consistent",
            intensity: 65,
          },
        ],
        { range: "medium" }
      ),
    ]);
    s = resolveRound(s, quiet(s)).state;
    expect(unit(s, "B4").charge).toBeTruthy();
    unit(s, "G").speed = 100;
    const q = quiet(s);
    q.G = { move: 1, target: "B4" };
    const r = resolveRound(s, q);
    expect(unit(s, "G").moves[1].effects[0].support).toBe("displace");
    const hit = r.frames.find((f) => f.event?.kind === "hit" && f.event.actorId === "G")!;
    expect(hit.event?.amount).toBeGreaterThan(0);
    expect(hasEvent(r, "displace")).toBe(true);
    expect(r.state.log.some((l) => l.includes("charge was broken"))).toBe(true);
    s = r.state;
    expect(unit(s, "B4").charge).toBeNull();
    // The pull landed before the guardian acted, so it passed only that stale opportunity.
    expect(unit(s, "B4").recovery).toBe(0);
    expect(moveAt(unit(s, "B4"), s.orders.B4.move).preparation).toBe("prolonged");
  });
  it("a companion with prolonged preparation charges, releases, then recovers", () => {
    // The rule, independent of what a seed rolled: a plain move and a fitted prolonged
    // harm. The real companion charge (decision 36) is tested in the pass 4 block.
    let s = lone();
    const h = unit(s, "H");
    fitMoves(h, [
      tap(),
      fitted("Tidal Surge", [harm(80)], { preparation: "prolonged" }),
    ]);
    let q = orders(s);
    q.H = { move: 1, target: "B4" };
    let r = resolveRound(s, q);
    expect(r.frames.some((f) => f.event?.kind === "charge" && f.event.actorId === "H")).toBe(true);
    s = r.state;
    expect(unit(s, "H").charge).toBe("B4");
    expect(legalMoves(unit(s, "H"))).toEqual([1]);
    q = orders(s);
    r = resolveRound(s, q);
    expect(
      r.frames.some(
        (f) => f.event?.kind === "hit" && f.event.actorId === "H" && f.event.moveName === "Tidal Surge"
      )
    ).toBe(true);
    s = r.state;
    expect(unit(s, "H").charge).toBeNull();
    expect(unit(s, "H").recovery).toBe(1);
    expect(legalMoves(unit(s, "H"))).not.toContain(1);
    s = resolveRound(s, orders(s)).state;
    expect(legalMoves(unit(s, "H"))).toContain(1);
  });
  it("rolls status likelihood from the seeded rng so runs replay and differ by seed", () => {
    // Avilily carries one likely hold and acts first, so every seed rolls it exactly once.
    const hold = () =>
      fitted(
        "Test Hold",
        [statusEffect("paralyzed", { likelihood: "likely", removable: ["stabilizing"] })],
        { range: "contact" }
      );
    const play = (seed: number) => {
      const s = createRun(seed);
      const a = unit(s, "A");
      fitOnly(a, hold());
      a.speed = 200;
      const q = orders(s);
      q.A = { move: 0, target: s.enemies[0].id };
      return resolveRound(s, q);
    };
    expect(hold().effects[0].likelihood).toBe("likely");
    expect(hold().effects[0].support).toBe("bind");
    expect(LIKELIHOOD_PERCENT.likely).toBeLessThan(100);
    expect(LIKELIHOOD_PERCENT.occasional).toBeLessThan(100);
    const byA = (r: ReturnType<typeof play>, kind: string) =>
      r.frames.some((f) => f.event?.kind === kind && f.event.actorId === "A");
    let landed = 0,
      missed = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const first = play(seed),
        again = play(seed);
      expect(again.state).toEqual(first.state);
      if (byA(first, "bind")) landed++;
      if (byA(first, "missed")) missed++;
    }
    expect(landed).toBeGreaterThan(0);
    expect(missed).toBeGreaterThan(0);
    expect(landed + missed).toBe(40);
  });
  it("immediate preparation wins initiative at equal speed", () => {
    // The same harm twice, differing only in preparation.
    const pair = () => [
      fitted("Brief Swing", [harm(40)], { preparation: "brief" }),
      fitted("Snap Swing", [harm(40)], { preparation: "immediate" }),
    ];
    const first = (move: number) => {
      const s = createRun(1);
      const h = unit(s, "H");
      fitMoves(h, pair());
      const m1 = unit(s, "M1");
      h.speed = m1.speed - 1;
      const q = orders(s);
      q.H = { move, target: "M1" };
      return resolveRound(s, q)
        .frames.filter((f) => f.event?.actorId && f.event.kind !== "redirect")
        .map((f) => f.event!.actorId);
    };
    expect(pair()[1].preparation).toBe("immediate");
    expect(pair()[0].preparation).toBe("brief");
    expect(first(1).indexOf("H")).toBeLessThan(first(1).indexOf("M1"));
    expect(first(0).indexOf("H")).toBeGreaterThan(first(0).indexOf("M1"));
  });
  it("preserves knockouts and health, clears cooldowns, permits one partial revival", () => {
    let s = createRun();
    s.phase = "camp";
    s.team[0].hp = 0;
    s.team[1].hp = 8;
    s.team[1].cooldowns = [2, 2, 2, 2];
    s = command(s, { kind: "revive", id: s.team[0].id });
    expect(s.team[0].hp).toBe(Math.ceil(s.team[0].max / 2));
    expect(s.revival).toBe(0);
    expect(() => command(s, { kind: "revive", id: s.team[0].id })).toThrow();
    const woundedId = s.team[1].id;
    s = command(s, { kind: "advance" });
    expect(unit(s, woundedId).hp).toBe(8);
    expect(unit(s, woundedId).cooldowns).toEqual([0, 0, 0, 0]);
  });
  it("offers recoil fallback only while nothing damaging is legal, never when bound", () => {
    const s = createRun();
    const c = unit(s, "C");
    expect(legalMoves(c)).not.toContain(-1);
    c.cooldowns = [1, 1, 1, 1];
    expect(legalMoves(c)).toEqual([-1]);
    const q = orders(s);
    q.C = { move: -1, target: s.enemies[0].id };
    const r = resolveRound(s, q);
    expect(r.frames.some((f) => f.text.includes("2 recoil"))).toBe(true);
    c.bound = 1;
    expect(legalMoves(c)).toEqual([]);
  });
  it("a full wipe loses without spending a revival or granting encounter XP", () => {
    const s = createRun();
    s.team.forEach((u) => {
      u.hp = 1;
      u.speed = 1;
    });
    s.enemies.forEach((u, i) => {
      u.moves[0].effects[0].intensity = 5000;
      s.orders[u.id].target = s.team[i].id;
    });
    s.team[2].hp = 0;
    s.team[3].hp = 0;
    const r = resolveRound(s, orders(s)).state;
    expect(r.phase).toBe("lost");
    expect(r.revival).toBe(1);
    expect(r.xp).toBe(0);
  });
  it("replays a version 8 starter history deterministically and rejects versions 1 to 7", () => {
    const s = createRun(41);
    const q = orders(s);
    const action = { kind: "round" as const, orders: q };
    const history = [{ kind: "draft", squad: "starter" }, action];
    expect(SAVE_VERSION).toBe(8);
    const restored = restoreRun(JSON.stringify({ version: 8, seed: 41, history }));
    expect(restored.state).toEqual(command(s, action));
    // Version 7 histories were played against the pass 7 machine HP (pass 8, decision 55),
    // so the same orders would resolve against other numbers from chamber 2 on.
    expect(() => restoreRun(JSON.stringify({ version: 7, seed: 41, history }))).toThrow(
      "Unsupported save."
    );
    // Version 6 histories name offer indexes of the offer before per-species seed retries
    // (contract decision 53), so the same indexes would draft other creatures.
    expect(() => restoreRun(JSON.stringify({ version: 6, seed: 41, history }))).toThrow(
      "Unsupported save."
    );
    // Version 5 histories open on a round, with no draft (pass 6, decision 48).
    expect(() =>
      restoreRun(JSON.stringify({ version: 5, seed: 41, history: [action] }))
    ).toThrow("Unsupported save.");
    expect(() => restoreRun('{"version":1,"seed":41,"history":[]}')).toThrow(
      "Unsupported save."
    );
    expect(() => restoreRun('{"version":2,"seed":41,"history":[]}')).toThrow(
      "Unsupported save."
    );
    // Version 3 histories name the generation-0.7.0-1 kits and pass 3 rules.
    expect(() => restoreRun('{"version":3,"seed":41,"history":[]}')).toThrow(
      "Unsupported save."
    );
    // Version 4 histories cannot carry an order that names a squadmate (pass 5).
    expect(() => restoreRun('{"version":4,"seed":41,"history":[]}')).toThrow(
      "Unsupported save."
    );
  });
  it("completes a seed range without negative HP or cooldowns", () => {
    for (let seed = 1; seed <= 30; seed++) {
      let s = createRun(seed);
      let rounds = 0;
      while ((s.phase === "planning" || s.phase === "camp") && rounds < 100) {
        if (s.phase === "camp") s = command(s, { kind: "advance" });
        else {
          s = resolveRound(s, orders(s)).state;
          rounds++;
        }
        for (const u of s.team as Unit[]) {
          expect(u.hp).toBeGreaterThanOrEqual(0);
          expect(u.cooldowns.every((n) => n >= 0)).toBe(true);
        }
      }
      // Since pass 6 a run also ends when an encounter stalls (decision 52): rounds in a row
      // in which nobody loses HP. This naive first-legal-move policy may reach it.
      expect(["won", "lost", "retreated"]).toContain(s.phase);
      if (s.phase === "retreated") expect(s.ended).toBe("outlasted");
    }
  });
  it("exposes public initiative and damage events without revealing a charging target", () => {
    const s = boss();
    const order = initiative(s.team, s.enemies, s.round);
    expect(order.map((u) => u.speed)).toEqual(
      order.map((u) => u.speed).sort((a, b) => b - a)
    );
    const result = resolveRound(s, orders(s));
    const hit = result.frames.find((f) => f.event?.kind === "hit")!;
    expect(hit.event?.actorId).toBeTruthy();
    expect(hit.event?.targetId).toBeTruthy();
    expect(hit.event?.amount).toBeGreaterThan(0);
    const charge = result.frames.find((f) => f.event?.kind === "charge")!;
    expect(charge.event?.actorId).toBe("B4");
    expect(charge.event).not.toHaveProperty("targetId");
  });
  it("enemy cards keep parity with the frozen numbers", () => {
    const s = boss();
    const target = unit(s, "H");
    const b = unit(s, "B4");
    target.ward = false;
    const neutral = { ...target, element: "fire" } as Unit;
    expect(b.moves[0].name).toBe("Clamp strike");
    // Pass 8 (decision 55): machines past the first chamber carry half again their HP.
    expect(b.hp).toBe(165);
    expect(b.speed).toBe(65);
    // Neutral matchup: 7 for the strike, 18 for the surge, both at attr 50.
    expect(damagePreview(b, b.moves[0], neutral)).toBe(7);
    expect(damagePreview(b, b.moves[1], neutral)).toBe(18);
  });
});

/*
  Pass 2: the status layer. Every test below builds its condition through the seam
  (readEffect) so a test can never assert a rule the table does not actually read.
*/
/** One authored move carrying exactly these effects, read through the seam. */
function fitted(name: string, effects: CardEffect[], over: Partial<Move> = {}): Move {
  return {
    key: name.toLowerCase().replace(/\W+/g, "-"),
    name,
    signature: false,
    approach: "stationary",
    range: "short",
    preparation: "immediate",
    recovery: "repeatable",
    effects: effects.map((effect) => readEffect(effect)),
    ...over,
  };
}
const statusEffect = (
  status: string,
  over: Partial<CardEffect> = {}
): CardEffect => ({
  key: "outcome",
  type: "status",
  recipient: "target",
  likelihood: "consistent",
  status,
  persistence: "lingering",
  duration: "brief",
  removable: ["cleansing"],
  ...over,
});
/** Give a companion one fitted move at index 0 and nothing else legal, so orders are unambiguous. */
function fitOnly(u: Unit, move: Move) {
  u.moves = [move];
  u.cooldowns = [0];
  u.signatureSpent = false;
}
const conditionOn = (u: Unit, status: string) =>
  u.conditions.find((c) => c.status === status);
/**
  Orders that change nothing on the foes but health: no displacement (it breaks
  charges), no bind and no status aimed at them. A plain harm first; failing that, a
  move whose only other effects stay on its user or remove (a ward, Ground Anchor).
  Chosen by what the move does, so a status test never measures a pull or a bind that
  a companion seed happened to put first.
*/
function plain(s: Run, over: Record<string, Order> = {}): Record<string, Order> {
  const quietMove = (u: Unit) => {
    const ready = legalMoves(u).filter(
      (i) => i >= 0 && moveAt(u, i).preparation !== "prolonged"
    );
    const safe = ready.find((i) =>
      moveAt(u, i).effects.every((e) => e.support === "harm")
    );
    const harmless = ready.find((i) =>
      moveAt(u, i).effects.every(
        (e) =>
          e.support === "harm" ||
          e.support === "remove" ||
          e.support === "unsupported" ||
          e.recipient === "self"
      )
    );
    return safe ?? harmless ?? legalMoves(u)[0] ?? -2;
  };
  return {
    ...Object.fromEntries(
      s.team
        .filter((u) => u.hp > 0)
        .map((u) => [
          u.id,
          { move: quietMove(u), target: selectable(s)[0].id },
        ])
    ),
    ...over,
  };
}
const selectable = (s: Run) => s.enemies.filter((e) => e.hp > 0);

describe("Powerworks status layer", () => {
  it("groups the fourteen statuses into five table groups and names the rest", () => {
    expect(statusGroup("paralyzed")).toBe("binding");
    expect(statusGroup("corroding")).toBe("degrading");
    expect(statusGroup("poisoned")).toBe("degrading");
    expect(statusGroup("shielded")).toBe("guarding");
    expect(statusGroup("protected")).toBe("guarding");
    expect(statusGroup("reinforced")).toBe("guarding");
    expect(statusGroup("entranced")).toBe("attention");
    expect(statusGroup("frightened")).toBe("attention");
    expect(statusGroup("concealed")).toBe("concealment");
    expect(statusGroup("mending")).toBe("mending");
    for (const outside of ["dispersed", "phased", "revealed", "stimulated"])
      expect(statusGroup(outside)).toBeNull();
  });
  it("applies a status on its likelihood roll, refreshes rather than stacks, and lasts the victim's opportunities", () => {
    // A fresh run per seed so the roll is the run rng, and the same seed twice must agree.
    const play = (seed: number, likelihood: CardEffect["likelihood"]) => {
      const s = createRun(seed);
      fitOnly(
        unit(s, "C"),
        fitted("Rot Wash", [statusEffect("corroding", { likelihood })])
      );
      s.enemies.forEach((e) => (e.hp = e.max = 400));
      return resolveRound(s, {
        ...orders(s),
        C: { move: 0, target: s.enemies[0].id },
      });
    };
    // consistent lands every time; occasional does not, and the roll comes from the run rng.
    for (let seed = 1; seed <= 5; seed++) {
      expect(hasEvent(play(seed, "consistent"), "status")).toBe(true);
      expect(play(seed, "occasional").state).toEqual(
        play(seed, "occasional").state
      );
    }
    let landed = 0;
    for (let seed = 1; seed <= 60; seed++)
      if (hasEvent(play(seed, "occasional"), "status")) landed++;
    expect(landed).toBeGreaterThan(0);
    expect(landed).toBeLessThan(60);
    expect(LIKELIHOOD_PERCENT.occasional).toBeLessThan(100);

    // Refresh, not stack: two applications leave one condition at the longer duration.
    let s = lone();
    fitOnly(
      unit(s, "C"),
      fitted("Rot Wash", [statusEffect("corroding", { intensity: 40 })])
    );
    fitOnly(
      unit(s, "A"),
      fitted("Deep Rot", [
        statusEffect("corroding", { intensity: 90, duration: "prolonged" }),
      ])
    );
    s = resolveRound(s, {
      C: { move: 0, target: "B4" },
      A: { move: 0, target: "B4" },
      G: { move: legalMoves(unit(s, "G"))[0], target: "B4" },
      H: { move: legalMoves(unit(s, "H"))[0], target: "B4" },
    }).state;
    const rotting = unit(s, "B4").conditions.filter(
      (c) => c.status === "corroding"
    );
    expect(rotting).toHaveLength(1);
    expect(rotting[0].intensity).toBe(90);
    // The boss has not had its own opportunity yet in this reading, so the longer
    // duration stands whole minus whatever opportunities it already spent.
    expect(rotting[0].remaining).toBeGreaterThan(0);
    expect(rotting[0].remaining).toBeLessThanOrEqual(
      LINGERING_OPPORTUNITIES.prolonged
    );
    expect(LINGERING_OPPORTUNITIES.prolonged).toBeGreaterThan(
      LINGERING_OPPORTUNITIES.brief
    );
    expect(BINDING_OPPORTUNITIES.brief).toBe(1);
    expect(ATTENTION_OPPORTUNITIES.brief).toBe(1);
  });
  it("does not let a degrading status take hold where it could never tick", () => {
    // Seen live 2026-09-23: Crystorn (light) corroding, "takes 0 damage" each opportunity,
    // because chemical has no effect on light in the effectiveness matrix.
    let s = lone();
    fitOnly(
      unit(s, "C"),
      fitted("Rot Wash", [statusEffect("corroding", { intensity: 90, duration: "prolonged" })])
    );
    unit(s, "B4").element = "light";
    const step = resolveRound(s, plain(s, { C: { move: 0, target: "B4" } }));
    expect(conditionOn(unit(step.state, "B4"), "corroding")).toBeUndefined();
    expect(step.state.log.join(" ")).toMatch(/unaffected: chemical has no effect on light/);
    // The same status on a target it can hurt still lands.
    s = lone();
    fitOnly(
      unit(s, "C"),
      fitted("Rot Wash", [statusEffect("corroding", { intensity: 90, duration: "prolonged" })])
    );
    s = resolveRound(s, plain(s, { C: { move: 0, target: "B4" } })).state;
    expect(conditionOn(unit(s, "B4"), "corroding")).toBeDefined();
  });
  it("counts a duration down by the victim's opportunities and expires it", () => {
    let s = lone();
    // Crystorn is slower than the guardian, so the condition lands after the
    // guardian's own opportunity this round and the full duration stands.
    fitOnly(
      unit(s, "C"),
      fitted("Rot Wash", [
        statusEffect("corroding", { intensity: 40, duration: "prolonged" }),
      ])
    );
    unit(s, "C").speed = 1;
    s = resolveRound(s, plain(s, { C: { move: 0, target: "B4" } })).state;
    const first = conditionOn(unit(s, "B4"), "corroding")!.remaining;
    expect(first).toBe(LINGERING_OPPORTUNITIES.prolonged);
    // One application only from here on: its own opportunity, not the round, spends
    // the duration.
    unit(s, "C").moves = [
      unit(s, "C").moves[0],
      fitted("Quiet Tap", [
        {
          key: "outcome",
          type: "harm",
          recipient: "target",
          likelihood: "consistent",
          intensity: 10,
          mechanism: "impact",
        },
      ]),
    ];
    unit(s, "C").cooldowns = [0, 0];
    s = resolveRound(s, plain(s, { C: { move: 1, target: "B4" } })).state;
    expect(conditionOn(unit(s, "B4"), "corroding")!.remaining).toBe(first - 1);
    let guard = 0;
    while (conditionOn(unit(s, "B4"), "corroding") && guard++ < 10)
      s = resolveRound(s, plain(s, { C: { move: 1, target: "B4" } })).state;
    expect(conditionOn(unit(s, "B4"), "corroding")).toBeUndefined();
    expect(guard).toBe(first - 1);
  });
  it("degrading ticks at the victim's opportunity on the element matchup and is never reduced by ward", () => {
    let s = lone();
    fitOnly(
      unit(s, "C"),
      fitted("Rot Wash", [
        statusEffect("corroding", { intensity: 80, duration: "prolonged" }),
      ])
    );
    s = resolveRound(s, plain(s, { C: { move: 0, target: "B4" } })).state;
    const boss = unit(s, "B4");
    const rot = conditionOn(boss, "corroding")!;
    expect(rot.element).toBe("chemical");
    const neutral = Math.floor((80 / 10) * DEGRADE_FACTOR);
    // Chemical is neutral against the guardian's electric and strong against plant,
    // so the tick reads the matchup and not a flat number.
    expect(tickAmount(rot, boss)).toBe(neutral);
    expect(tickAmount(rot, unit(s, "A"))).toBeGreaterThan(neutral);
    expect(unit(s, "A").element).toBe("plant");
    const before = unit(s, "B4").hp;
    const warded = clone(s);
    unit(warded, "B4").ward = true;
    const open = resolveRound(s, plain(s));
    const openWarded = resolveRound(warded, plain(warded));
    const tick = (r: { frames: { event?: { kind: string; amount?: number; targetId?: string } }[] }) =>
      r.frames.find(
        (f) => f.event?.kind === "tick" && f.event.targetId === "B4"
      )!.event!.amount;
    expect(tick(open)).toBeGreaterThan(0);
    expect(tick(openWarded)).toBe(tick(open));
    expect(before).toBeGreaterThan(0);
  });
  it("shielded halves incoming harm and does not multiply with ward; reinforced takes its quarter", () => {
    const s = lone();
    const attacker = unit(s, "B4");
    const target = unit(s, "H");
    const move = attacker.moves[0];
    const plain = damagePreview(attacker, move, target);
    const warded = { ...target, ward: true } as Unit;
    const shielded = {
      ...target,
      conditions: [
        {
          status: "shielded",
          group: "guarding" as const,
          intensity: 50,
          remaining: 2,
          source: "X",
          removable: [],
        },
      ],
    } as Unit;
    const both = { ...shielded, ward: true } as Unit;
    expect(damagePreview(attacker, move, shielded)).toBe(
      Math.floor(plain * SHIELDED_FACTOR)
    );
    expect(damagePreview(attacker, move, warded)).toBe(
      Math.floor(plain * WARD_FACTOR)
    );
    // The better one wins; they do not compound into a quarter.
    expect(damagePreview(attacker, move, both)).toBe(
      damagePreview(attacker, move, shielded)
    );
    const reinforced = {
      ...target,
      conditions: [
        {
          status: "reinforced",
          group: "guarding" as const,
          intensity: 50,
          remaining: 2,
          source: "X",
          removable: [],
        },
      ],
    } as Unit;
    expect(damagePreview(attacker, move, reinforced)).toBe(
      Math.floor(plain * REINFORCED_FACTOR)
    );
  });
  it("a protected unit immune to displacement takes neither the impact harm nor the charge break", () => {
    // Graviclaw's Ground Anchor declares exactly that immunity; its own pull is the test.
    let s = lone();
    const anchor = unit(s, "G").moves.findIndex((m) =>
      m.effects.some((e) => e.protection?.type === "displace")
    );
    expect(anchor).toBeGreaterThanOrEqual(0);
    const pull = unit(s, "G").moves.findIndex((m) =>
      m.effects.some((e) => e.support === "displace")
    );
    // Give the boss the same declared immunity and put it on a charge.
    s = resolveRound(s, quiet(s)).state;
    expect(unit(s, "B4").charge).toBeTruthy();
    const open = clone(s);
    const immune = clone(s);
    unit(immune, "B4").conditions = innateConditions([
      { type: "displace", degree: "immune" },
    ]);
    unit(open, "G").speed = 100;
    unit(immune, "G").speed = 100;
    const pullAt = (run: Run) =>
      resolveRound(run, plain(run, { G: { move: pull, target: "B4" } }));
    const hurt = pullAt(open);
    const blocked = pullAt(immune);
    // The frame right after Graviclaw's pull resolved, however the rest of the
    // squad is ordered.
    const chargeAfterPull = (
      r: { frames: { enemies: Unit[]; event?: { kind: string; actorId?: string } }[] }
    ) => {
      const pulls = r.frames.filter((f) => f.event?.actorId === "G");
      const last = pulls[pulls.length - 1];
      return last?.enemies.find((e) => e.id === "B4")?.charge ?? null;
    };
    const pullDamage = (r: { frames: { event?: { kind: string; actorId?: string; amount?: number } }[] }) =>
      r.frames
        .filter((f) => f.event?.kind === "hit" && f.event.actorId === "G")
        .reduce((sum, f) => sum + (f.event!.amount ?? 0), 0);
    expect(hasEvent(hurt, "displace")).toBe(true);
    expect(pullDamage(hurt)).toBeGreaterThan(0);
    expect(hurt.state.enemies.find((e) => e.id === "B4")!.charge).toBeNull();
    // Both the harm and the charge break are blocked; the charge survives.
    expect(hasEvent(blocked, "displace")).toBe(false);
    expect(hasEvent(blocked, "resisted")).toBe(true);
    expect(pullDamage(blocked)).toBe(0);
    // Read the frame right after the pull: the charge is still standing there, while
    // in the open run it is already broken.
    expect(chargeAfterPull(blocked)).toBeTruthy();
    expect(chargeAfterPull(hurt)).toBeNull();
    expect(anchor).toBeGreaterThanOrEqual(0);
  });
  it("entranced loses the opportunity without breaking a charge and cannot be reapplied within two opportunities", () => {
    let s = lone();
    // Everyone but the lurer holds a plain tap, so nothing else can break the charge.
    for (const id of ["A", "C", "G", "H"]) fitOnly(unit(s, id), tap());
    // The boss begins a charge first; the lure arrives before its release.
    s = resolveRound(s, plain(s)).state;
    expect(unit(s, "B4").charge).toBeTruthy();
    fitOnly(
      unit(s, "C"),
      fitted("Lure Light", [
        statusEffect("entranced", { removable: ["disrupting"] }),
      ])
    );
    unit(s, "C").speed = 200;
    const lure = (run: Run) =>
      resolveRound(run, plain(run, { C: { move: 0, target: "B4" } }));
    let r = lure(s);
    expect(hasEvent(r, "status")).toBe(true);
    expect(hasEvent(r, "lost")).toBe(true);
    s = r.state;
    // The charge survives the lost opportunity: only the order was dropped.
    expect(unit(s, "B4").charge).toBeTruthy();
    expect(conditionOn(unit(s, "B4"), "entranced")).toBeUndefined();
    // Within the guard window the same lure is refused.
    r = lure(s);
    expect(hasEvent(r, "status")).toBe(false);
    expect(hasEvent(r, "resisted")).toBe(true);
    expect(ENTRANCE_IMMUNITY_OPPORTUNITIES).toBe(2);
    // focused blocks attention outright, whatever the window says.
    const focused = clone(r.state);
    unit(focused, "B4").conditions.push({
      status: "focused",
      group: "guarding",
      intensity: 50,
      remaining: 5,
      source: "X",
      removable: [],
    });
    unit(focused, "B4").sinceEntranced = Infinity;
    const steady = lure(focused);
    expect(hasEvent(steady, "status")).toBe(false);
    expect(
      steady.state.log.some((l) => l.includes("focused"))
    ).toBe(true);
  });
  it("frightened halves the victim's harm output through its next opportunity", () => {
    const s = lone();
    const attacker = unit(s, "B4");
    const target = unit(s, "H");
    const plain = damagePreview(attacker, attacker.moves[0], target);
    const scared = {
      ...attacker,
      conditions: [
        {
          status: "frightened",
          group: "attention" as const,
          intensity: 50,
          remaining: 1,
          source: "X",
          removable: [],
        },
      ],
    } as Unit;
    expect(damagePreview(scared, attacker.moves[0], target)).toBe(
      Math.floor(plain * FRIGHTENED_OUTPUT_FACTOR)
    );
    expect(FRIGHTENED_OUTPUT_FACTOR).toBeLessThan(1);
  });
  it("a concealed unit is skipped in targeting while another stands and reveals itself by attacking", () => {
    let s = lone();
    // Two machines: one concealed, one open. Orders may not name the concealed one.
    const extra = clone(s);
    const open = extra.enemies.find((e) => e.id !== "B4")!;
    open.hp = 200;
    unit(extra, "B4").conditions.push({
      status: "concealed",
      group: "concealment",
      intensity: 50,
      remaining: 4,
      source: "X",
      removable: ["disrupting"],
    });
    const q = orders(extra);
    expect(() =>
      resolveRound(extra, {
        ...q,
        C: { move: legalMoves(unit(extra, "C"))[0], target: "B4" },
      })
    ).toThrow();
    // A stale order aimed at it is retargeted with a hidden event.
    const stale = clone(extra);
    stale.team.forEach((u) => (u.speed = 200));
    const aimed = Object.fromEntries(
      stale.team
        .filter((u) => u.hp > 0)
        .map((u) => [u.id, { move: legalMoves(u)[0], target: open.id }])
    );
    const r = resolveRound(stale, aimed);
    expect(r.state.phase).not.toBe("lost");
    // The concealed machine ends its own concealment when it executes harm.
    const striking = clone(extra);
    striking.orders.B4 = { move: 0, target: striking.team[0].id };
    const broken = resolveRound(striking, orders(striking));
    expect(
      broken.frames.some(
        (f) => f.event?.kind === "expired" && f.event.actorId === "B4"
      )
    ).toBe(true);
    expect(
      conditionOn(unit(broken.state, "B4"), "concealed")
    ).toBeUndefined();
  });
  it("remove ends exactly the conditions whose methods intersect, and nothing else", () => {
    let s = lone();
    // Hippochamp's cannon carries cooling. A chilled condition answers to it; a
    // paralysis removable only by detoxifying does not.
    const cannon = unit(s, "H").moves.findIndex((m) =>
      m.effects.some((e) => e.support === "remove")
    );
    expect(cannon).toBeGreaterThanOrEqual(0);
    const boss = unit(s, "B4");
    boss.conditions.push(
      {
        status: "chilled",
        group: "degrading",
        intensity: 20,
        element: "ice",
        remaining: 4,
        source: "X",
        removable: ["cooling", "warming"],
      },
      {
        status: "paralyzed",
        group: "binding",
        intensity: 50,
        remaining: 2,
        source: "X",
        removable: ["detoxifying"],
      }
    );
    const r = resolveRound(s, plain(s, { H: { move: cannon, target: "B4" } }));
    expect(hasEvent(r, "removed")).toBe(true);
    s = r.state;
    expect(conditionOn(unit(s, "B4"), "chilled")).toBeUndefined();
    expect(conditionOn(unit(s, "B4"), "paralyzed")).toBeTruthy();
  });
  it("the guardian's Clamp strike paralyzes a companion, and the discharge unit shocks less often", () => {
    const clamp = (cards.templates.guardian as Card).moves.find(
      (m) => m.key === "clamp-strike"
    )!;
    const contact = (cards.templates.discharge as Card).moves.find(
      (m) => m.key === "contact-strike"
    )!;
    const shockOf = (move: { effects: CardEffect[] }) =>
      move.effects.find((e) => e.type === "status")!;
    expect(shockOf(clamp as unknown as { effects: CardEffect[] }).status).toBe(
      "paralyzed"
    );
    expect(
      shockOf(clamp as unknown as { effects: CardEffect[] }).likelihood
    ).toBe("likely");
    expect(
      shockOf(contact as unknown as { effects: CardEffect[] }).likelihood
    ).toBe("occasional");
    // It lands on a real companion in a real round. Take Core surge away so the
    // guardian clamps every round rather than charging.
    const clamping = () => {
      const run = lone();
      unit(run, "B4").moves = [unit(run, "B4").moves[0]];
      unit(run, "B4").cooldowns = [0];
      return run;
    };
    let s = clamping();
    let landed = false;
    for (let round = 0; round < 12 && !landed; round++) {
      s.orders.B4 = { move: 0, target: unit(s, "H").id };
      const r = resolveRound(s, plain(s));
      s = r.state;
      const applied = r.frames.find(
        (f) => f.event?.kind === "bind" && f.event.actorId === "B4"
      );
      if (!applied) continue;
      landed = true;
      expect(applied.event!.status).toBe("paralyzed");
      const inFrame = applied.team.find((u) => u.id === applied.event!.targetId)!;
      const condition = inFrame.conditions.find(
        (c) => c.status === "paralyzed"
      )!;
      expect(condition.group).toBe("binding");
      expect(condition.removable).toEqual(["stabilizing"]);
      expect(inFrame.bound).toBe(BINDING_OPPORTUNITIES.brief);
    }
    expect(landed, "Clamp strike never paralyzed a companion").toBe(true);
    // A brief binding is spent at the victim's own opportunity, so it is still on the
    // unit in the next planning phase only when the applier is slower than the victim.
    let slow = clamping();
    unit(slow, "B4").speed = 1;
    let visible: Unit | undefined;
    for (let round = 0; round < 12 && !visible; round++) {
      slow.orders.B4 = { move: 0, target: unit(slow, "H").id };
      slow = resolveRound(slow, plain(slow)).state;
      visible = slow.team.find((u) => u.bound > 0);
    }
    expect(visible, "no paralysis survived into planning").toBeTruthy();
    expect(
      visible!.conditions.find((c) => c.status === "paralyzed")!.remaining
    ).toBe(BINDING_OPPORTUNITIES.brief);
  });
  it("a degrading tick that lands the killing blow clears the encounter", () => {
    const s = createRun(1);
    s.enemies[1].hp = 0;
    s.enemies[0].hp = 1;
    s.enemies[0].conditions.push({
      status: "corroding",
      group: "degrading",
      intensity: 200,
      element: "chemical",
      remaining: 3,
      source: "C",
      removable: ["cleansing"],
    });
    // The crawler must reach its own opportunity for the tick to land before the squad
    // finishes it off.
    s.enemies[0].speed = 300;
    const r = resolveRound(s, plain(s));
    expect(hasEvent(r, "tick")).toBe(true);
    expect(r.state.log.some((l) => /from corroding\. Knocked out\./.test(l))).toBe(
      true
    );
    expect(r.state.phase).toBe("camp");
    expect(r.state.xp).toBe(10);
  });
  it("replays a current-version save deterministically with conditions in play", () => {
    const s = createRun(7);
    const first = orders(s);
    const after = command(s, { kind: "round", orders: first });
    const second = orders(after);
    const history = [
      { kind: "draft" as const, squad: "starter" as const },
      { kind: "round" as const, orders: first },
      { kind: "round" as const, orders: second },
    ];
    const restored = restoreRun(
      JSON.stringify({ version: SAVE_VERSION, seed: 7, history })
    );
    expect(restored.state).toEqual(command(after, history[2]));
  });
});

/*
  Pass 3: passives and triggers (contract decisions 21 to 26). The seam tests read real
  roster records rather than fixtures, so a test can never assert a shape the release
  does not produce; the resolver tests use the one authored machine passive (decision 24)
  and, for depth and ally-harmed, a card passive fitted onto a test unit.
*/
/** A record generated from the frozen release, for the seam tests over the wider roster. */
function roster(species: string, seed: string): CreatureRecord {
  const template = getSpeciesTemplates().find((t) => t.key === species);
  if (!template) throw new Error(`Unknown species ${species}`);
  return generateXalian(species, seed, {
    origin: template.homePlanet,
    serial: 1,
    profile: "full",
    generatedAt: "2026-09-21T00:00:00.000Z",
  });
}
const passiveOn = (u: Unit, key: string) => u.passives.find((p) => p.key === key)!;
/** One card passive, read through the seam onto a throwaway card so nothing is invented. */
function cardPassive(passive: CardPassive) {
  return readCard(
    { ...(cards.templates.crawler as Card), passives: [passive] },
    "crawler",
    "T1",
    "Test unit"
  ).passives[0];
}
/**
  The guardian alone at test health, its Core surge removed so it clamps rather than
  charges, and Avilily set aside.

  Avilily is sidelined because Core discharge is authored at `brief` recovery (one answer
  per round) and she is the fastest companion with no ranged move at all: every action she
  has is contact, so she would always take the single reply and no test could aim it. With
  her out, Crystorn's touch is the only contact strike on the table (Graviclaw's Gravity
  Draw is medium and Hippochamp's cannon is medium), so the one answer is hers.
*/
function clamper() {
  const s = lone();
  const b = unit(s, "B4");
  b.moves = [b.moves[0]];
  b.cooldowns = [0];
  unit(s, "A").hp = 0;
  return s;
}
/** Crystorn's contact strike and her ranged radiance: the two orders a contact trigger tells apart. */
const C_CONTACT = 1;
const C_RANGED = 0;
/**
  Orders in which Crystorn takes the named move and the other two standing companions
  hold a ranged one, so a contact trigger can only have been hers. Requires `clamper()`,
  which sidelines Avilily.
*/
function onlyC(s: Run, move: number): Record<string, Order> {
  const orders: Record<string, Order> = {
    C: { move, target: "B4" },
    G: { move: 1, target: "B4" },
    H: { move: 0, target: "B4" },
  };
  // The premise, asserted rather than assumed: nobody but Crystorn closes to contact.
  for (const [id, order] of Object.entries(orders))
    if (id !== "C")
      expect(
        moveAt(unit(s, id), order.move).range,
        `${id} must hold a ranged move`
      ).not.toBe("contact");
  expect(unit(s, "A").hp, "Avilily must be sidelined by clamper()").toBe(0);
  return orders;
}
/** Legal orders that prefer a contact move on a standing foe, so contact triggers fire. */
function contactOrders(s: Run): Record<string, Order> {
  const foe = s.enemies.filter((e) => e.hp > 0)[0];
  return Object.fromEntries(
    s.team
      .filter((u) => u.hp > 0)
      .map((u) => {
        const legal = legalMoves(u);
        const touch = legal.find((i) => i >= 0 && moveAt(u, i).range === "contact");
        return [u.id, { move: touch ?? legal[0] ?? -2, target: foe.id }];
      })
  );
}
const reactsTo = (
  r: { frames: { event?: import("./index.ts").BattleEvent }[] },
  targetId?: string
) =>
  r.frames.filter(
    (f) => f.event?.kind === "react" && (!targetId || f.event.targetId === targetId)
  );

describe("Powerworks reads real passives at the seam", () => {
  it("bioflim's ongoing restore becomes a permanent mending condition on its owner", () => {
    const u = readCompanion(roster("bioflim", "pv-bioflim-1"), "X");
    const passive = u.passives.find((p) => p.kind === "ongoing")!;
    expect(passive.support).toBe("supported");
    expect(passive.trigger).toBeUndefined();
    expect(passive.cooldown).toBe(0);
    expect(passive.effects[0].type).toBe("restore");
    const mending = u.conditions.find((c) => c.status === "mending")!;
    expect(mending.group).toBe("mending");
    expect(mending.remaining).toBe(Infinity);
    expect(mending.source).toBe("X");
    expect(mending.intensity).toBeGreaterThan(0);
    // It is a real tick on the harm curve, not a label.
    expect(tickAmount(mending, u)).toBeGreaterThan(0);
  });
  it("vespersyn's ongoing concealed becomes a permanent concealment condition", () => {
    const u = readCompanion(roster("vespersyn", "pv-vespersyn-1"), "X");
    const passive = u.passives.find((p) => p.kind === "ongoing")!;
    expect(passive.support).toBe("supported");
    const hidden = u.conditions.find((c) => c.status === "concealed")!;
    expect(hidden.group).toBe("concealment");
    expect(hidden.remaining).toBe(Infinity);
    expect(hidden.removable).toEqual(["disrupting"]);
  });
  it("sonalloy and xylum read the same way, so ongoing restore is one rule", () => {
    for (const species of ["sonalloy", "xylum"]) {
      const u = readCompanion(roster(species, `pv-${species}-1`), "X");
      expect(
        u.conditions.filter((c) => c.status === "mending"),
        species
      ).toHaveLength(1);
    }
  });
  it("imprit's contact-triggered passive reads as a reaction that applies burning", () => {
    const u = readCompanion(roster("imprit", "pv-imprit-1"), "X");
    const passive = u.passives.find((p) => p.kind === "triggered")!;
    expect(passive.trigger).toBe("contact");
    expect(passive.support).toBe("supported");
    // Repeatable recovery is cooldown 0: it answers every touch.
    expect(passive.cooldown).toBe(COOLDOWN_ROUNDS.repeatable);
    const burning = passive.effects[0];
    expect(burning.support).toBe("status");
    expect(burning.status).toBe("burning");
    expect(burning.group).toBe("degrading");
    expect(burning.statusElement).toBe("fire");
    // An ongoing passive's conditions are its whole reading; a triggered one has none.
    expect(passive.conditions).toEqual([]);
  });
  it("an ongoing passive whose effects have no lasting state is unsupported and named", () => {
    // Harm cannot be a standing condition: nothing in the table keeps it (decision 21).
    const passive = cardPassive({
      key: "leak",
      name: "Constant leak",
      effects: [
        {
          key: "outcome",
          type: "harm",
          mechanism: "impact",
          recipient: "target",
          likelihood: "consistent",
          intensity: 20,
        },
      ],
    });
    expect(passive.kind).toBe("ongoing");
    expect(passive.support).toBe("unsupported");
    expect(passive.reason).toContain("harm");
    expect(passive.conditions).toEqual([]);
  });
  it("counts how many of 640 roster records carry a passive the seam reads", () => {
    const species = getSpeciesTemplates();
    let records = 0,
      ongoing = 0,
      triggered = 0,
      supported = 0;
    const reasons = new Set<string>();
    const carriers = new Set<string>();
    for (const t of species)
      for (let seed = 1; seed <= 20; seed++) {
        records++;
        const u = readCompanion(
          roster(t.key, `powerworks-seam-${t.key}-${seed}`),
          "X"
        );
        for (const p of u.passives) {
          carriers.add(t.key);
          if (p.kind === "ongoing") ongoing++;
          else triggered++;
          if (p.support === "supported") supported++;
          else reasons.add(p.reason ?? "");
        }
      }
    expect(records).toBe(species.length * 20);
    // Every passive the release produces on these seeds is one the table reads.
    expect(supported).toBe(ongoing + triggered);
    expect(reasons.size).toBe(0);
    expect(carriers.size).toBeGreaterThan(0);
    expect(ongoing + triggered).toBeGreaterThan(0);
  });
});

describe("Powerworks reactions", () => {
  it("Core discharge reads off the guardian card as a contact reaction", () => {
    const b = unit(boss(), "B4");
    const passive = passiveOn(b, "core-discharge");
    expect(passive.kind).toBe("triggered");
    expect(passive.trigger).toBe("contact");
    expect(passive.support).toBe("supported");
    expect(passive.element).toBe("electric");
    // Authored at brief recovery (Nick's lever, 2026-09-21): one answer per round.
    expect(passive.cooldown).toBe(COOLDOWN_ROUNDS.brief);
    expect(passive.effects[0].support).toBe("harm");
    expect(passive.effects[0].intensity).toBe(30);
    expect(b.passiveCooldowns).toEqual([0]);
    // The guardian keeps no standing condition from it: a reaction is not a state.
    expect(b.conditions).toEqual([]);
  });
  it("fires on a contact strike and not on a ranged stream", () => {
    expect(unit(clamper(), "C").moves[C_CONTACT].range).toBe("contact");
    expect(unit(clamper(), "C").moves[C_RANGED].range).not.toBe("contact");
    const fire = (move: number) => {
      const s = clamper();
      s.orders.B4 = { move: 0, target: "H" };
      return reactsTo(resolveRound(s, onlyC(s, move)), "C");
    };
    const contact = fire(C_CONTACT);
    expect(contact).toHaveLength(1);
    expect(contact[0].event!.moveName).toBe("Core discharge");
    expect(contact[0].event!.actorId).toBe("B4");
    expect(fire(C_RANGED)).toHaveLength(0);
  });
  it("answers in the owner's name with the owner's attributes and does real damage", () => {
    const s = clamper();
    s.orders.B4 = { move: 0, target: "H" };
    const r = resolveRound(s, onlyC(s, C_CONTACT));
    const index = r.frames.findIndex(
      (f) => f.event?.kind === "react" && f.event.targetId === "C"
    );
    const reply = r.frames
      .slice(index + 1)
      .find(
        (f) =>
          f.event?.kind === "hit" &&
          f.event.actorId === "B4" &&
          f.event.moveName === "Core discharge"
      )!;
    expect(reply).toBeTruthy();
    expect(reply.event!.targetId).toBe("C");
    expect(reply.event!.amount).toBeGreaterThan(0);
    // The reaction is not an ordered move: it spends no move cooldown.
    expect(r.state.enemies.find((u) => u.id === "B4")!.cooldowns).toEqual([0]);
  });
  it("fires at most once per triggering move", () => {
    const s = clamper();
    // The card is authored at brief recovery, which would explain a single answer on its
    // own, so this test swaps in a repeatable copy: the budget, not the cooldown, is what
    // must hold two landed effects on one move to one reply.
    const repeatable = cardPassive({
      key: "core-discharge",
      name: "Core discharge",
      trigger: "contact",
      recovery: "repeatable",
      element: "electric",
      effects: [
        {
          key: "outcome",
          type: "harm",
          mechanism: "elemental",
          recipient: "target",
          likelihood: "consistent",
          intensity: 30,
        },
      ],
    });
    expect(repeatable.cooldown).toBe(COOLDOWN_ROUNDS.repeatable);
    unit(s, "B4").passives = [repeatable];
    unit(s, "B4").passiveCooldowns = [0];
    // Two landed effects on one contact move cannot buy two replies.
    fitOnly(
      unit(s, "C"),
      fitted(
        "Double Touch",
        [
          {
            key: "outcome",
            type: "harm",
            mechanism: "impact",
            recipient: "target",
            likelihood: "consistent",
            intensity: 60,
          },
          statusEffect("corroding"),
        ],
        { range: "contact", approach: "closing" }
      )
    );
    s.orders.B4 = { move: 0, target: "H" };
    expect(reactsTo(resolveRound(s, onlyC(s, 0)), "C")).toHaveLength(1);
  });
  it("does not fire when the reaction's owner is knocked out by the strike", () => {
    const s = clamper();
    unit(s, "B4").hp = 1;
    s.orders.B4 = { move: 0, target: "H" };
    const r = resolveRound(s, onlyC(s, C_CONTACT));
    expect(reactsTo(r)).toHaveLength(0);
    expect(r.state.phase).toBe("won");
  });
  it("honours a passive's cooldown from its recovery", () => {
    expect(COOLDOWN_ROUNDS.repeatable).toBe(0);
    expect(COOLDOWN_ROUNDS.brief).toBe(1);
    // The three standing companions each hold one repeatable contact strike, so a
    // repeatable reaction answers several strikes a round and a brief one answers once
    // (the cooldown is spent on the first reply and re-armed at the round boundary).
    const perRound = (cooldown: number) => {
      let run = clamper();
      for (const id of ["C", "G", "H"])
        fitOnly(unit(run, id), fitted("Contact Jab", [harm(30)], { range: "contact" }));
      unit(run, "B4").passives[0].cooldown = cooldown;
      const counts: number[] = [];
      for (let round = 0; round < 3; round++) {
        run.enemies.filter((e) => e.hp > 0).forEach((e) => (e.hp = e.max));
        run.team.forEach((t) => (t.hp = t.max));
        run.orders.B4 = { move: 0, target: "H" };
        const r = resolveRound(run, contactOrders(run));
        counts.push(reactsTo(r).length);
        run = r.state;
        expect(run.phase).toBe("planning");
      }
      return counts;
    };
    const repeatable = perRound(COOLDOWN_ROUNDS.repeatable);
    expect(Math.min(...repeatable)).toBeGreaterThan(1);
    expect(perRound(COOLDOWN_ROUNDS.brief)).toEqual([1, 1, 1]);
  });
  it("is depth one: a reaction that harms never triggers a harmed reaction on the attacker", () => {
    const retort = cardPassive({
      key: "retort",
      name: "Retort",
      trigger: "harmed",
      recovery: "repeatable",
      effects: [
        {
          key: "outcome",
          type: "harm",
          mechanism: "impact",
          recipient: "target",
          likelihood: "consistent",
          intensity: 40,
        },
      ],
    });
    // Crystorn carries a harmed reply. The guardian's Core discharge harms her, and
    // that harm must not buy her a reaction (decision 23).
    const s = clamper();
    const c = unit(s, "C");
    c.passives = [retort];
    c.passiveCooldowns = [0];
    s.orders.B4 = { move: 0, target: "H" };
    const reacts = reactsTo(resolveRound(s, onlyC(s, C_CONTACT)));
    expect(reacts.some((f) => f.event!.moveName === "Core discharge")).toBe(true);
    expect(reacts.some((f) => f.event!.moveName === "Retort")).toBe(false);
    // The same Retort does fire on the guardian's ordered Clamp strike, so the passive
    // is live and the depth guard is what stopped the chain.
    const direct = clamper();
    const target = unit(direct, "C");
    target.passives = [retort];
    target.passiveCooldowns = [0];
    direct.orders.B4 = { move: 0, target: "C" };
    expect(
      reactsTo(resolveRound(direct, onlyC(direct, C_RANGED))).some(
        (f) => f.event!.moveName === "Retort"
      )
    ).toBe(true);
  });
  it("an ally-harmed reaction takes the harmed ally as its target", () => {
    // Crystorn shields whichever squadmate the guardian hurts: the one place an effect
    // reaches an ally, because the trigger supplies it (decision 26).
    const tend = cardPassive({
      key: "tend",
      name: "Tend",
      trigger: "ally-harmed",
      recovery: "repeatable",
      effects: [
        statusEffect("shielded", { removable: ["disrupting"] }),
      ],
    });
    const s = clamper();
    const c = unit(s, "C");
    c.passives = [tend];
    c.passiveCooldowns = [0];
    s.orders.B4 = { move: 0, target: "H" };
    const r = resolveRound(s, onlyC(s, C_RANGED));
    const react = reactsTo(r).find((f) => f.event!.moveName === "Tend")!;
    expect(react).toBeTruthy();
    expect(react.event!.actorId).toBe("C");
    expect(react.event!.targetId).toBe("H");
    expect(
      r.state.team.find((u) => u.id === "H")!.conditions.map((x) => x.status)
    ).toContain("shielded");
  });
  it("rolls a reaction's likelihood from the run rng, so it replays and differs by seed", () => {
    const scald = cardPassive({
      key: "scald",
      name: "Scald",
      trigger: "contact",
      recovery: "repeatable",
      effects: [statusEffect("burning", { likelihood: "occasional" })],
    });
    const play = (seed: number) => {
      let s = createRun(seed);
      for (let i = 0; i < 3; i++) {
        s.phase = "camp";
        s = command(s, { kind: "advance" });
      }
      s.enemies.filter((u) => u.id !== "B4").forEach((u) => (u.hp = 0));
      const b = unit(s, "B4");
      b.hp = 500;
      b.moves = [b.moves[0]];
      b.cooldowns = [0];
      b.passives = [scald];
      b.passiveCooldowns = [0];
      s.team.forEach((u) => (u.hp = u.max = 500));
      // Same reason as clamper(): Avilily is all contact, so she would take the reply.
      unit(s, "A").hp = 0;
      s.orders.B4 = { move: 0, target: "H" };
      return resolveRound(s, onlyC(s, C_CONTACT))
        .frames.map((f) => `${f.event?.kind}:${f.event?.status ?? ""}`)
        .join("|");
    };
    expect(play(4)).toBe(play(4));
    expect(new Set([1, 2, 3, 4, 5, 6, 7, 8].map(play)).size).toBeGreaterThan(1);
  });
  it("an ongoing passive's permanent condition survives the next encounter entry", () => {
    const s = createRun(3);
    const g = unit(s, "G");
    const carrier = readCompanion(roster("bioflim", "pv-bioflim-1"), g.id);
    g.passives = carrier.passives;
    g.passiveCooldowns = carrier.passives.map(() => 0);
    g.conditions = [
      ...g.conditions,
      ...carrier.passives.flatMap((p) => p.conditions),
    ];
    expect(g.conditions.some((c) => c.status === "mending")).toBe(true);
    const camped = { ...clone(s), phase: "camp" as const };
    const after = command(camped, { kind: "advance" }).team.find(
      (u) => u.id === "G"
    )!;
    // Exactly one: entry re-seeds it without duplicating what is already there.
    expect(after.conditions.filter((c) => c.status === "mending")).toHaveLength(1);
    expect(after.passiveCooldowns).toEqual(carrier.passives.map(() => 0));
  });
  it("replays a current-version save deterministically through to a reaction", () => {
    // A real run, played honestly with legal orders until the guardian answers a
    // contact strike, then restored from its command history alone. The orders play to
    // win (strongest legal preview, a revival when someone falls) until the final
    // chamber, then prefer contact on the guardian, so reaching the reaction depends on
    // the rules and not on what the companion seeds happened to roll.
    const strongest = (s: Run): Record<string, Order> =>
      Object.fromEntries(
        s.team
          .filter((u) => u.hp > 0)
          .map((u) => {
            let best: { order: Order; score: number } | null = null;
            for (const i of legalMoves(u))
              for (const t of s.enemies.filter((e) => e.hp > 0)) {
                const m = moveAt(u, i);
                const score =
                  damagePreview(u, m, t) +
                  (t.species === "guardian" && m.range === "contact" ? 1000 : 0);
                if (!best || score > best.score) best = { order: { move: i, target: t.id }, score };
              }
            return [u.id, best?.order ?? { move: -2, target: s.enemies[0].id }];
          })
      );
    const play = (seed: number) => {
      let s = createRun(seed);
      const history: Command[] = [];
      let reacted = false;
      for (let step = 0; step < 80 && !reacted && s.phase !== "won" && s.phase !== "lost"; step++) {
        if (s.phase === "camp") {
          const down = s.team.find((u) => u.hp <= 0);
          const action: Command =
            down && s.revival ? { kind: "revive", id: down.id } : { kind: "advance" };
          history.push(action);
          s = command(s, action);
          continue;
        }
        const action: Command = { kind: "round", orders: strongest(s) };
        history.push(action);
        const result = resolveRound(s, action.orders);
        if (reactsTo(result).length) reacted = true;
        s = result.state;
      }
      return { s, history, reacted };
    };
    const { s, history, reacted } = play(11);
    expect(reacted, "no reaction occurred in the played run").toBe(true);
    expect(history.some((c) => c.kind === "advance")).toBe(true);
    const restored = restoreRun(
      JSON.stringify({ version: SAVE_VERSION, seed: 11, history: [{ kind: "draft", squad: "starter" }, ...history] })
    );
    expect(restored.state).toEqual(s);
    expect(restored.state.log.some((l) => /Core discharge/.test(l))).toBe(true);
  });
});

/*
  Pass 4: the derived roster's effects (contract decisions 27 to 36). Every rule is built
  from fitted moves read through the seam, never from what a companion seed rolled, except
  the one test that checks a real companion's charged act (decision 36).
*/
/** The final chamber, seeded, with all three machines standing at test health. */
function wide(seed = 1) {
  let s = createRun(seed);
  for (let i = 0; i < 3; i++) {
    s.phase = "camp";
    s = command(s, { kind: "advance" });
  }
  s.enemies.forEach((u) => (u.hp = u.max = 500));
  s.team.forEach((u) => (u.hp = u.max = 500));
  return s;
}
/** Everyone taps quietly except the named companion, so nothing else binds, pulls or afflicts. */
function hush(s: Run, except: string[] = []) {
  for (const u of s.team) if (!except.includes(u.id)) fitOnly(u, tap());
}
/** An area harm effect at this intensity. */
const areaHarm = (intensity: number): CardEffect => ({ ...harm(intensity), recipient: "area" });
const events = (
  r: { frames: { event?: import("./index.ts").BattleEvent }[] },
  kind: string,
  actorId?: string
) =>
  r.frames
    .map((f) => f.event!)
    .filter((e) => e?.kind === kind && (!actorId || e.actorId === actorId));

describe("Powerworks pass 4: new status groups at the seam", () => {
  it("reads stunned as shock, slowed and sedated as tempo, blinded and disoriented as senses, focused as guarding", () => {
    expect(statusGroup("stunned")).toBe("shock");
    expect(statusGroup("slowed")).toBe("tempo");
    expect(statusGroup("sedated")).toBe("tempo");
    expect(statusGroup("blinded")).toBe("senses");
    expect(statusGroup("disoriented")).toBe("senses");
    expect(statusGroup("focused")).toBe("guarding");
    // Traversal stays unsupported (decision 35's last sentence).
    expect(statusGroup("phased")).toBeNull();
    expect(statusGroup("dispersed")).toBeNull();
  });
  it("reads concealed on itself as a legal action (decision 32) and keeps other self statuses refused", () => {
    const stalk = fitted("Night Stalk", [
      statusEffect("concealed", { recipient: "self", removable: ["disrupting"] }),
    ]);
    expect(stalk.effects[0].support).toBe("status");
    expect(stalk.effects[0].group).toBe("concealment");
    expect(usable(stalk)).toBe(true);
    const selfStun = readEffect(statusEffect("stunned", { recipient: "self" }));
    expect(selfStun.support).toBe("unsupported");
    // In play: the stalker is concealed, so the machines cannot pick it while another stands.
    let s = lone();
    hush(s, ["C"]);
    // The guardian clamps rather than charging, so its next order is freshly aimed.
    const b = unit(s, "B4");
    b.moves = [b.moves[0]];
    b.cooldowns = [0];
    s.orders.B4 = { move: 0, target: "H" };
    fitOnly(unit(s, "C"), stalk);
    unit(s, "C").speed = 200;
    s = resolveRound(s, plain(s, { C: { move: 0, target: "B4" } })).state;
    expect(conditionOn(unit(s, "C"), "concealed")?.group).toBe("concealment");
    expect(s.orders.B4.target).not.toBe("C");
  });
  it("keeps the drain's dependency and the area geometry on a real roster record", () => {
    // Tizzie's Psychic Signal and Bioflim's Chemical Touch are drains; a lash is a sweep.
    const found = { requires: false, area: false };
    for (const species of ["bioflim", "tizzie", "crystorn", "hippochamp"])
      for (let seed = 1; seed <= 20; seed++) {
        const u = readCompanion(roster(species, `powerworks-seam-${species}-${seed}`), "X");
        for (const m of u.moves) {
          if (m.effects.some((e) => e.requires)) found.requires = true;
          if (m.area && m.effects.some((e) => e.recipient === "area")) found.area = true;
        }
      }
    expect(found).toEqual({ requires: true, area: true });
  });
});

describe("Powerworks pass 4: shock", () => {
  /** The guardian mid-charge, with the named companion holding a fitted stun and acting first. */
  function charging(stun: Move) {
    let s = lone();
    hush(s);
    s = resolveRound(s, plain(s)).state;
    expect(unit(s, "B4").charge).toBeTruthy();
    fitOnly(unit(s, "C"), stun);
    unit(s, "C").speed = 200;
    return s;
  }
  const jolt = () =>
    fitted("Stun Jolt", [statusEffect("stunned", { removable: ["stabilizing"] })]);
  it("a stun loses the victim's next opportunity and breaks its charge (decision 27)", () => {
    const s = charging(jolt());
    const r = resolveRound(s, plain(s, { C: { move: 0, target: "B4" } }));
    expect(events(r, "status", "C")[0]?.status).toBe("stunned");
    expect(events(r, "status", "C")[0]?.group).toBe("shock");
    const broken = events(r, "broken", "C");
    expect(broken).toHaveLength(1);
    expect(broken[0].targetId).toBe("B4");
    const lost = events(r, "lost", "B4");
    expect(lost).toHaveLength(1);
    expect(lost[0].status).toBe("stunned");
    // The guardian neither released nor struck this round.
    expect(events(r, "hit", "B4")).toHaveLength(0);
    expect(unit(r.state, "B4").charge).toBeNull();
    expect(conditionOn(unit(r.state, "B4"), "stunned")).toBeUndefined();
  });
  it("cannot be reapplied within the trance window, and focus does not block it", () => {
    const s = charging(jolt());
    const first = resolveRound(s, plain(s, { C: { move: 0, target: "B4" } })).state;
    const again = resolveRound(first, plain(first, { C: { move: 0, target: "B4" } }));
    expect(events(again, "status", "C")).toHaveLength(0);
    expect(events(again, "resisted", "C")[0]?.status).toBe("stunned");
    expect(ENTRANCE_IMMUNITY_OPPORTUNITIES).toBe(2);
    // A focused guardian is still stunned: shock is physical, not attention.
    const focused = charging(jolt());
    unit(focused, "B4").conditions.push({
      status: "focused",
      group: "guarding",
      intensity: 50,
      remaining: 5,
      source: "X",
      removable: [],
    });
    const r = resolveRound(focused, plain(focused, { C: { move: 0, target: "B4" } }));
    expect(events(r, "status", "C")[0]?.status).toBe("stunned");
    expect(events(r, "lost", "B4")).toHaveLength(1);
  });
});

describe("Powerworks pass 4: tempo", () => {
  it("slowed halves the victim's speed for initiative through its duration (decision 28)", () => {
    let s = lone();
    hush(s, ["C"]);
    fitOnly(unit(s, "C"), fitted("Slow Wash", [statusEffect("slowed", { removable: ["warming"] })]));
    unit(s, "C").speed = 200;
    // Hippochamp sits between the guardian's full and halved speed.
    const b = unit(s, "B4");
    unit(s, "H").speed = Math.floor(b.speed * SLOWED_SPEED_FACTOR) + 1;
    const before = initiative(s.team, s.enemies, s.round).map((u) => u.id);
    expect(before.indexOf("B4")).toBeLessThan(before.indexOf("H"));
    s = resolveRound(s, plain(s, { C: { move: 0, target: "B4" } })).state;
    const slowed = unit(s, "B4");
    expect(conditionOn(slowed, "slowed")?.group).toBe("tempo");
    expect(effectiveSpeed(slowed)).toBe(Math.floor(slowed.speed * SLOWED_SPEED_FACTOR));
    const after = initiative(s.team, s.enemies, s.round).map((u) => u.id);
    expect(after.indexOf("B4")).toBeGreaterThan(after.indexOf("H"));
    // It wears off with the victim's own opportunities, and full speed returns.
    fitOnly(unit(s, "C"), tap());
    let guard = 0;
    while (conditionOn(unit(s, "B4"), "slowed") && guard++ < 6)
      s = resolveRound(s, plain(s)).state;
    expect(effectiveSpeed(unit(s, "B4"))).toBe(unit(s, "B4").speed);
  });
  it("sedated acts after every unsedated unit and its passives do not react (decision 29)", () => {
    let s = clamper();
    hush(s, ["C"]);
    fitOnly(unit(s, "C"), fitted("Soothing Mist", [statusEffect("sedated", { removable: ["disrupting"] })]));
    unit(s, "C").speed = 200;
    s.orders.B4 = { move: 0, target: "H" };
    s = resolveRound(s, plain(s, { C: { move: 0, target: "B4" } })).state;
    expect(conditionOn(unit(s, "B4"), "sedated")?.group).toBe("tempo");
    // Faster than everyone, and still last.
    s.team.forEach((u) => (u.speed = 1));
    const order = initiative(s.team, s.enemies, s.round).map((u) => u.id);
    expect(order[order.length - 1]).toBe("B4");
    // Core discharge answers a contact strike on an alert guardian, not on a sedated one.
    fitOnly(unit(s, "C"), fitted("Contact Jab", [harm(30)], { range: "contact" }));
    s.orders.B4 = { move: 0, target: "H" };
    const quietGuardian = resolveRound(s, plain(s, { C: { move: 0, target: "B4" } }));
    expect(reactsTo(quietGuardian)).toHaveLength(0);
    const alert = clone(s);
    unit(alert, "B4").conditions = [];
    expect(reactsTo(resolveRound(alert, plain(alert, { C: { move: 0, target: "B4" } })))).toHaveLength(1);
  });
});

describe("Powerworks pass 4: senses", () => {
  const blind = () => fitted("Glare Burst", [statusEffect("blinded", { removable: ["cleansing"] })]);
  it("blinded halves the victim's non-contact harm and leaves contact harm alone (decision 30)", () => {
    let s = lone();
    hush(s, ["C"]);
    fitOnly(unit(s, "C"), blind());
    unit(s, "C").speed = 200;
    s = resolveRound(s, plain(s, { C: { move: 0, target: "B4" } })).state;
    const b = unit(s, "B4");
    expect(conditionOn(b, "blinded")?.group).toBe("senses");
    const seen = { ...b, conditions: [] } as Unit;
    const shot = fitted("Test Beam", [harm(80)], { range: "medium" });
    const touch = fitted("Test Grip", [harm(80)], { range: "contact" });
    const h = unit(s, "H");
    expect(damagePreview(b, shot, h)).toBe(
      Math.floor(damagePreview(seen, shot, h) * BLINDED_RANGED_FACTOR)
    );
    expect(damagePreview(b, shot, h)).toBeLessThan(damagePreview(seen, shot, h));
    expect(damagePreview(b, touch, h)).toBe(damagePreview(seen, touch, h));
  });
  it("a blinded unit is immune to statuses from a visual signal", () => {
    const glare = fitted(
      "Frightening Signal",
      [statusEffect("frightened", { removable: ["stabilizing"] })],
      { reception: "visual" }
    );
    const play = (blinded: boolean) => {
      const s = lone();
      hush(s, ["C"]);
      fitOnly(unit(s, "C"), glare);
      unit(s, "C").speed = 200;
      if (blinded)
        unit(s, "B4").conditions.push({
          status: "blinded",
          group: "senses",
          intensity: 50,
          remaining: 2,
          source: "X",
          removable: ["cleansing"],
        });
      return resolveRound(s, plain(s, { C: { move: 0, target: "B4" } }));
    };
    expect(events(play(false), "status", "C")[0]?.status).toBe("frightened");
    const refused = play(true);
    expect(events(refused, "status", "C")).toHaveLength(0);
    expect(events(refused, "resisted", "C")[0]?.status).toBe("frightened");
  });
  it("disoriented sends the victim's aimed order to a drawn standing target, announced as a stumble (decision 31)", () => {
    const play = (seed: number) => {
      const s = wide(seed);
      hush(s, ["C"]);
      // The guardian disorients Crystorn before Crystorn acts.
      const b = unit(s, "B4");
      b.moves = [fitted("Disorienting Sweep", [statusEffect("disoriented", { removable: ["stabilizing"] })])];
      b.cooldowns = [0];
      b.speed = 300;
      s.orders.B4 = { move: 0, target: "C" };
      fitOnly(unit(s, "C"), fitted("Aimed Jab", [harm(30)]));
      unit(s, "C").speed = 1;
      const aimedAt = s.enemies[0].id;
      const r = resolveRound(s, plain(s, { C: { move: 0, target: aimedAt } }));
      const stumble = events(r, "stumble", "C");
      expect(stumble, `seed ${seed}`).toHaveLength(1);
      const hit = events(r, "hit", "C")[0];
      expect(hit.targetId).toBe(stumble[0].targetId);
      return stumble[0].targetId!;
    };
    expect(play(3)).toBe(play(3));
    const drawn = new Set(Array.from({ length: 12 }, (_, i) => play(i + 1)));
    expect(drawn.size).toBeGreaterThan(1);
  });
});

describe("Powerworks pass 4: areas", () => {
  const sweep = (extent: "small" | "medium" | "large") =>
    fitted("Test Sweep", [areaHarm(60)], {
      range: "contact",
      area: { shape: "sweep", extent, anchor: "self" },
    });
  const burst = () =>
    fitted("Test Burst", [areaHarm(60)], {
      range: "short",
      area: { shape: "radial", extent: "small", anchor: "self" },
    });
  const spread = () =>
    fitted("Test Field", [areaHarm(60)], {
      range: "short",
      area: { shape: "radial", extent: "medium", anchor: "location" },
    });
  const ids = (units: Unit[]) => units.map((u) => u.id);
  it("reads the line from the order of the team and enemies arrays (decision 33)", () => {
    const s = wide();
    const [e0, e1, e2] = s.enemies;
    const [t0, t1, t2] = s.team;
    // A sweep: small reaches the far neighbor, medium both, large the whole line.
    expect(ids(areaReach(s, t0, sweep("small"), e0))).toEqual([e1.id]);
    expect(ids(areaReach(s, t0, sweep("small"), e2))).toEqual([]);
    expect(ids(areaReach(s, t0, sweep("medium"), e1))).toEqual([e0.id, e2.id]);
    expect(ids(areaReach(s, t0, sweep("medium"), e0))).toEqual([e1.id]);
    expect(ids(areaReach(s, t0, sweep("large"), e0))).toEqual([e1.id, e2.id]);
    // Radial on self: every foe and the performer's own neighbors in its line.
    expect(ids(areaReach(s, t1, burst(), e0))).toEqual([e1.id, e2.id, t0.id, t2.id]);
    // Radial on the target or a location: the target's two neighbors.
    expect(ids(areaReach(s, t0, spread(), e1))).toEqual([e0.id, e2.id]);
    // The line closes up when a unit falls.
    e1.hp = 0;
    expect(ids(areaReach(s, t0, sweep("medium"), e0))).toEqual([e2.id]);
    // A move without an area reaches nobody else.
    expect(areaReach(s, t0, tap(), e0)).toEqual([]);
  });
  it("every recipient takes the area harm at AREA_HARM_FACTOR, the target included", () => {
    const s = wide();
    hush(s, ["C"]);
    const c = unit(s, "C");
    fitOnly(c, sweep("medium"));
    c.speed = 300;
    const middle = s.enemies[1];
    const r = resolveRound(s, plain(s, { C: { move: 0, target: middle.id } }));
    const hits = events(r, "hit", "C");
    expect(hits.map((h) => h.targetId).sort()).toEqual(ids(s.enemies).sort());
    expect(hits.filter((h) => h.area).map((h) => h.targetId).sort()).toEqual(
      [s.enemies[0].id, s.enemies[2].id].sort()
    );
    // The same harm aimed at one target, at the area share of its intensity.
    const single = fitted("Single", [harm(60 * AREA_HARM_FACTOR)], { range: "contact" });
    for (const h of hits) {
      const victim = unit(s, h.targetId!);
      expect(h.amount, victim.name).toBe(damagePreview(c, single, victim));
    }
    expect(damagePreview(c, sweep("medium"), middle)).toBeLessThan(
      damagePreview(c, fitted("Full", [harm(60)], { range: "contact" }), middle)
    );
  });
  it("rolls an area status independently for each recipient", () => {
    const field = fitted(
      "Slowing Field",
      [{ ...statusEffect("slowed", { removable: ["warming"], likelihood: "occasional" }), recipient: "area" }],
      { range: "short", area: { shape: "radial", extent: "medium", anchor: "location" } }
    );
    let mixed = false;
    for (let seed = 1; seed <= 20 && !mixed; seed++) {
      const s = wide(seed);
      hush(s, ["C"]);
      fitOnly(unit(s, "C"), field);
      unit(s, "C").speed = 300;
      const r = resolveRound(s, plain(s, { C: { move: 0, target: s.enemies[1].id } }));
      const landed = events(r, "status", "C").length;
      const shaken = events(r, "resisted", "C").length;
      expect(landed + shaken, `seed ${seed}`).toBe(3);
      if (landed > 0 && shaken > 0) mixed = true;
    }
    expect(mixed).toBe(true);
  });
  it("a burst on self reaches the performer's adjacent allies, and friendly harm provokes no reaction", () => {
    const s = wide();
    hush(s, [s.team[1].id]);
    const [left, bursting, right] = s.team;
    fitOnly(bursting, burst());
    bursting.speed = 300;
    // A harmed reply on the left neighbor must stay quiet: only a foe's move provokes one.
    left.passives = [
      cardPassive({
        key: "retort",
        name: "Retort",
        trigger: "harmed",
        recovery: "repeatable",
        effects: [harm(40)],
      }),
    ];
    left.passiveCooldowns = [0];
    const r = resolveRound(
      s,
      plain(s, { [bursting.id]: { move: 0, target: s.enemies[0].id } })
    );
    const hits = events(r, "hit", bursting.id);
    expect(hits.map((h) => h.targetId).sort()).toEqual(
      [...ids(s.enemies), left.id, right.id].sort()
    );
    expect(hits.find((h) => h.targetId === left.id)!.amount).toBeGreaterThan(0);
    expect(
      reactsTo(r).filter((f) => f.event!.actorId === left.id && f.event!.targetId === bursting.id)
    ).toHaveLength(0);
  });
});

describe("Powerworks pass 4: dependencies and beneficial effects", () => {
  const drain = () =>
    fitted("Test Drain", [
      { ...harm(50), key: "toll" },
      {
        key: "gain",
        type: "restore",
        recipient: "self",
        likelihood: "consistent",
        intensity: 60,
        requires: "toll",
      },
    ]);
  it("a drain heals only when its harm is actually dealt (decision 34)", () => {
    const run = (immune: boolean) => {
      const s = lone();
      hush(s, ["C"]);
      const c = unit(s, "C");
      fitOnly(c, drain());
      c.hp = 300;
      c.speed = 300;
      if (immune)
        unit(s, "B4").conditions = innateConditions([
          { type: "harm", mechanism: "impact", degree: "immune" },
        ]);
      return resolveRound(s, plain(s, { C: { move: 0, target: "B4" } }));
    };
    expect(drain().effects[1].requires).toBe("toll");
    const fed = run(false);
    expect(events(fed, "hit", "C")[0].amount).toBeGreaterThan(0);
    expect(events(fed, "restore", "C")[0].amount).toBeGreaterThan(0);
    expect(events(fed, "withheld", "C")).toHaveLength(0);
    const starved = run(true);
    expect(events(starved, "hit", "C")[0].amount).toBe(0);
    expect(events(starved, "restore", "C")).toHaveLength(0);
    const held = events(starved, "withheld", "C");
    expect(held).toHaveLength(1);
    expect(held[0].reason).toBe("requires");
    expect(held[0].effect).toBe("restore");
  });
  it("a beneficial status aimed at a foe is withheld while the move's harm resolves (decision 35)", () => {
    // Sonalloy's Reinforcing Lash shape: harm plus reinforced on the target.
    const lash = fitted("Reinforcing Lash", [
      harm(40),
      statusEffect("reinforced", { key: "condition", removable: ["disrupting"] }),
    ]);
    expect(usable(lash)).toBe(true);
    const s = lone();
    hush(s, ["C"]);
    fitOnly(unit(s, "C"), lash);
    unit(s, "C").speed = 300;
    const r = resolveRound(s, plain(s, { C: { move: 0, target: "B4" } }));
    expect(events(r, "hit", "C")[0].amount).toBeGreaterThan(0);
    expect(conditionOn(unit(r.state, "B4"), "reinforced")).toBeUndefined();
    const held = events(r, "withheld", "C");
    expect(held).toHaveLength(1);
    expect(held[0]).toMatchObject({ reason: "foe", effect: "reinforced", targetId: "B4" });
  });
  it("a move that can only benefit is aimed at a squadmate, never a foe; the same status on itself stays a self order", () => {
    // Pass 4 made Focusing Signal an illegal order (it could only help a foe). Pass 5
    // (decision 39) lets it name a squadmate, so it is legal again, and only there.
    const signal = fitted("Focusing Signal", [statusEffect("focused", { removable: ["disrupting"] })]);
    const response = fitted("Focusing Response", [
      statusEffect("focused", { recipient: "self", removable: ["disrupting"] }),
    ]);
    expect(signal.effects[0].support).toBe("status");
    expect(usable(signal)).toBe(true);
    expect(usable(response)).toBe(true);
    let s = lone();
    const c = unit(s, "C");
    fitMoves(c, [tap(), signal, response]);
    expect(legalMoves(c, s)).toEqual([0, 1, 2]);
    expect(legalTargets(s, c, 1).every((t) => !t.enemy && t.id !== "C")).toBe(true);
    expect(() => resolveRound(s, plain(s, { C: { move: 1, target: "B4" } }))).toThrow();
    s = resolveRound(s, plain(s, { C: { move: 2, target: "B4" } })).state;
    expect(conditionOn(unit(s, "C"), "focused")?.group).toBe("guarding");
  });
});

describe("Powerworks pass 4: a companion charges from its own record (decision 36)", () => {
  it("the real charged act begins a charge, then releases at the next opportunity", () => {
    let s = lone();
    const carrier = s.team.find((u) =>
      u.moves.some((m) => !m.signature && m.preparation === "prolonged" && usable(m))
    )!;
    expect(carrier).toBeTruthy();
    const index = carrier.moves.findIndex(
      (m) => !m.signature && m.preparation === "prolonged" && usable(m)
    );
    const name = carrier.moves[index].name;
    let r = resolveRound(s, plain(s, { [carrier.id]: { move: index, target: "B4" } }));
    expect(events(r, "charge", carrier.id)[0]?.moveName).toBe(name);
    s = r.state;
    expect(legalMoves(unit(s, carrier.id))).toEqual([index]);
    r = resolveRound(s, plain(s, { [carrier.id]: { move: index, target: "B4" } }));
    expect(events(r, "hit", carrier.id).some((h) => h.moveName === name)).toBe(true);
    expect(unit(r.state, carrier.id).charge).toBeNull();
  });
});

/*
  Pass 5: ally targeting (contract decisions 38 to 42). Every rule is built from fitted
  moves read through the seam, never from what a companion seed rolled.
*/
/** A restore aimed at the move's target. */
const mend = (intensity = 60, over: Partial<CardEffect> = {}): CardEffect => ({
  key: "mend",
  type: "restore",
  recipient: "target",
  likelihood: "consistent",
  intensity,
  ...over,
});
/** A protect aimed at the move's target. */
const cover = (): CardEffect => ({
  key: "cover",
  type: "protect",
  recipient: "target",
  likelihood: "consistent",
  intensity: 50,
});
/** A cooling removal aimed at the move's target: Hippochamp's cannon shape. */
const cooling = (): CardEffect => ({
  key: "clear",
  type: "remove",
  recipient: "target",
  likelihood: "consistent",
  methods: ["cooling"],
});
const overheated = (source = "B4") => ({
  status: "overheated",
  group: "degrading" as const,
  intensity: 30,
  element: "fire",
  remaining: 2,
  source,
  removable: ["cooling" as const],
});
const idsOf = (units: Unit[]) => units.map((u) => u.id);

describe("Powerworks pass 5: helpful and hostile at the seam (decision 38)", () => {
  it("classifies restore, protect, remove and guarding, mending or focused statuses as helpful", () => {
    for (const effect of [
      mend(),
      cover(),
      cooling(),
      statusEffect("shielded"),
      statusEffect("reinforced"),
      statusEffect("focused"),
      statusEffect("mending"),
      statusEffect("protected", { protection: { type: "displace", degree: "immune" } }),
    ]) {
      const e = readEffect(effect);
      const label = `${effect.type} ${effect.status ?? ""}`;
      expect(e.support, label).not.toBe("unsupported");
      expect(helpful(e), label).toBe(true);
      expect(hostile(e), label).toBe(false);
    }
    const pull: CardEffect = {
      key: "pull",
      type: "displace",
      recipient: "target",
      likelihood: "consistent",
      intensity: 40,
    };
    for (const effect of [
      harm(40),
      pull,
      statusEffect("paralyzed"),
      statusEffect("corroding"),
      statusEffect("stunned"),
      statusEffect("slowed"),
      statusEffect("blinded"),
      statusEffect("frightened"),
    ]) {
      const e = readEffect(effect);
      const label = `${effect.type} ${effect.status ?? ""}`;
      expect(hostile(e), label).toBe(true);
      expect(helpful(e), label).toBe(false);
    }
  });
  it("reads aimed protect and restore as supported: nothing is unsupported for ally targeting any more", () => {
    const protect = readEffect(cover());
    const restore = readEffect(mend());
    expect(protect.support).toBe("protect");
    expect(restore.support).toBe("restore");
    expect(protect.reason).toBeUndefined();
    expect(restore.reason).toBeUndefined();
    // Traversal stays unsupported and named.
    expect(readEffect(statusEffect("phased")).support).toBe("unsupported");
  });
});

describe("Powerworks pass 5: who an order may name (decision 39)", () => {
  const kit = () => [
    fitted("Test Mend", [mend()]),
    fitted("Test Jab", [harm(40)]),
    fitted("Test Cannon", [harm(40), cooling()], { range: "medium" }),
    fitted("Test Anchor", [
      statusEffect("protected", {
        recipient: "self",
        protection: { type: "displace", degree: "immune" },
        removable: [],
      }),
    ]),
  ];
  it("names squadmates for a helpful move, foes for a hostile one, both for a move carrying both", () => {
    const s = lone();
    const c = unit(s, "C");
    fitMoves(c, kit());
    const mates = idsOf(s.team.filter((u) => u.id !== "C"));
    expect(aimsAtSquadmate(c.moves[0])).toBe(true);
    expect(aimsAtFoe(c.moves[0])).toBe(false);
    expect(idsOf(legalTargets(s, c, 0))).toEqual(mates);
    expect(idsOf(legalTargets(s, c, 1))).toEqual(["B4"]);
    expect(idsOf(legalTargets(s, c, 2))).toEqual(["B4", ...mates]);
    // A move acting only on its user keeps the nominal foe target it always carried.
    expect(idsOf(legalTargets(s, c, 3))).toEqual(["B4"]);
    // Desperate strike aims at foes.
    expect(idsOf(legalTargets(s, c, -1))).toEqual(["B4"]);
  });
  it("never names the performer or a fallen unit, and rejects an order that crosses the rule", () => {
    const s = lone();
    const c = unit(s, "C");
    fitMoves(c, kit());
    unit(s, "A").hp = 0;
    expect(idsOf(legalTargets(s, c, 0))).not.toContain("A");
    expect(idsOf(legalTargets(s, c, 0))).not.toContain("C");
    const order = (move: number, target: string) => plain(s, { C: { move, target } });
    expect(() => resolveRound(s, order(0, "C"))).toThrow(/legal move and target/);
    expect(() => resolveRound(s, order(0, "A"))).toThrow(/legal move and target/);
    expect(() => resolveRound(s, order(0, "B4"))).toThrow(/legal move and target/);
    expect(() => resolveRound(s, order(1, "H"))).toThrow(/legal move and target/);
    expect(() => resolveRound(s, order(0, "H"))).not.toThrow();
    expect(() => resolveRound(s, order(2, "H"))).not.toThrow();
  });
  it("a helpful-only move is not a legal order while no squadmate stands", () => {
    const s = lone();
    const c = unit(s, "C");
    fitMoves(c, kit());
    expect(legalMoves(c, s)).toContain(0);
    for (const u of s.team) if (u.id !== "C") u.hp = 0;
    expect(legalMoves(c, s)).not.toContain(0);
    expect(legalMoves(c, s)).toContain(1);
    // Without the table the unit's own legality is unchanged.
    expect(legalMoves(c)).toContain(0);
  });
  it("machines carry no helpful move, so the enemy planner is unchanged (decision 42)", () => {
    for (const [key, card] of Object.entries(cards.templates)) {
      const u = readCard(card as Card, key, "T", key);
      for (const m of u.moves) expect(aimsAtSquadmate(m), `${key} ${m.name}`).toBe(false);
    }
  });
});

describe("Powerworks pass 5: what lands (decision 40)", () => {
  /** Hippochamp alone acts first, holding one fitted move; everyone else taps the guardian. */
  function first(move: Move) {
    const s = lone();
    hush(s, ["H"]);
    const h = unit(s, "H");
    fitOnly(h, move);
    h.speed = 300;
    return s;
  }
  it("aimed at a squadmate, only the helpful effects resolve: the cannon clears and does not wound", () => {
    const s = first(fitted("Test Cannon", [harm(55), cooling()], { range: "medium" }));
    const c = unit(s, "C");
    c.conditions.push(overheated());
    const before = c.hp;
    const r = resolveRound(s, plain(s, { H: { move: 0, target: "C" } }));
    expect(events(r, "hit", "H")).toHaveLength(0);
    const removed = events(r, "removed", "H");
    expect(removed).toHaveLength(1);
    expect(removed[0]).toMatchObject({ targetId: "C", status: "overheated" });
    expect(conditionOn(unit(r.state, "C"), "overheated")).toBeUndefined();
    // Nothing from Hippochamp touched Crystorn's health, and overheated never ticked.
    expect(unit(r.state, "C").hp).toBe(before);
  });
  it("aimed at a foe, the hostile effects and remove resolve", () => {
    const s = first(fitted("Test Cannon", [harm(55), cooling()], { range: "medium" }));
    unit(s, "B4").conditions.push(overheated("C"));
    const r = resolveRound(s, plain(s, { H: { move: 0, target: "B4" } }));
    expect(events(r, "hit", "H")[0].amount).toBeGreaterThan(0);
    expect(events(r, "removed", "H")[0]).toMatchObject({ targetId: "B4", status: "overheated" });
  });
  it("a strike never heals and a heal never wounds: the same move splits by aim", () => {
    const tend = fitted("Test Tend", [harm(40), mend(60)], { range: "short" });
    const atFoe = first(tend);
    const struck = resolveRound(atFoe, plain(atFoe, { H: { move: 0, target: "B4" } }));
    expect(events(struck, "hit", "H")[0].amount).toBeGreaterThan(0);
    expect(events(struck, "restore", "H")).toHaveLength(0);
    expect(events(struck, "withheld", "H")[0]).toMatchObject({ reason: "foe", effect: "restore" });
    const atMate = first(tend);
    unit(atMate, "C").hp = 100;
    const healed = resolveRound(atMate, plain(atMate, { H: { move: 0, target: "C" } }));
    expect(events(healed, "hit", "H")).toHaveLength(0);
    expect(events(healed, "withheld", "H")).toHaveLength(0);
    expect(events(healed, "restore", "H")[0]).toMatchObject({ targetId: "C" });
    expect(events(healed, "restore", "H")[0].amount).toBeGreaterThan(0);
  });
  it("a helpful area reaches squadmates in its geometry and is withheld from foes", () => {
    // A radial field on its target, aimed at the middle of the performer's own line (the
    // performer left out): the target and both its neighbors are healed, no foe is.
    const field = fitted("Test Mending Field", [mend(60, { recipient: "area" })], {
      range: "short",
      area: { shape: "radial", extent: "medium", anchor: "location" },
    });
    const s = wide();
    const performer = s.team[0];
    const line = s.team.filter((u) => u.id !== performer.id);
    hush(s, [performer.id]);
    fitOnly(performer, field);
    performer.speed = 300;
    for (const u of s.team) u.hp = 100;
    expect(idsOf(areaReach(s, performer, field, line[1]))).toEqual([line[0].id, line[2].id]);
    const r = resolveRound(s, plain(s, { [performer.id]: { move: 0, target: line[1].id } }));
    expect(events(r, "restore", performer.id).map((e) => e.targetId).sort()).toEqual(
      idsOf(line).sort()
    );
    expect(events(r, "hit", performer.id)).toHaveLength(0);
    // A burst on its user, aimed at a squadmate: every foe it reaches is withheld; the
    // performer's adjacent allies and the named squadmate are healed.
    const pulse = fitted("Test Mending Pulse", [mend(60, { recipient: "area" })], {
      range: "short",
      area: { shape: "radial", extent: "small", anchor: "self" },
    });
    const t = wide();
    const [left, middle, right, far] = t.team;
    hush(t, [middle.id]);
    fitOnly(middle, pulse);
    middle.speed = 300;
    for (const u of t.team) u.hp = 100;
    const pr = resolveRound(t, plain(t, { [middle.id]: { move: 0, target: far.id } }));
    expect(events(pr, "restore", middle.id).map((e) => e.targetId).sort()).toEqual(
      [far.id, left.id, right.id].sort()
    );
    expect(events(pr, "withheld", middle.id).map((e) => e.targetId).sort()).toEqual(
      idsOf(t.enemies).sort()
    );
  });
  it("aimed at a squadmate, a helpful status lands and provokes nothing", () => {
    const guard = fitted("Test Guard", [statusEffect("shielded", { removable: ["disrupting"] })]);
    const s = first(guard);
    const r = resolveRound(s, plain(s, { H: { move: 0, target: "A" } }));
    expect(events(r, "status", "H")[0]).toMatchObject({ targetId: "A", status: "shielded" });
    expect(conditionOn(unit(r.state, "A"), "shielded")?.source).toBe("H");
    expect(reactsTo(r).filter((f) => f.event!.targetId === "H")).toHaveLength(0);
  });
});

describe("Powerworks pass 5: readings (decision 41)", () => {
  it("restore on a squadmate heals on the harm curve, capped at its max HP", () => {
    const s = lone();
    hush(s, ["C"]);
    const c = unit(s, "C");
    fitOnly(c, fitted("Test Mend", [mend(60)]));
    c.speed = 300;
    const amount = restorePreview(c, c.moves[0].effects[0]);
    expect(amount).toBeGreaterThan(3);
    const h = unit(s, "H");
    h.hp = h.max - 3;
    const capped = resolveRound(s, plain(s, { C: { move: 0, target: "H" } }));
    expect(events(capped, "restore", "C")[0]).toMatchObject({ targetId: "H", amount: 3 });
    expect(unit(capped.state, "H").hp).toBe(h.max);
    h.hp = 100;
    const full = resolveRound(s, plain(s, { C: { move: 0, target: "H" } }));
    expect(events(full, "restore", "C")[0].amount).toBe(amount);
  });
  it("protect on a squadmate is the ward reading: harm halved until the squadmate's next opportunity", () => {
    const s = lone();
    hush(s, ["C"]);
    const b = unit(s, "B4");
    b.moves = [b.moves[0]];
    b.cooldowns = [0];
    s.orders.B4 = { move: 0, target: "H" };
    fitOnly(unit(s, "C"), fitted("Test Cover", [cover()]));
    unit(s, "C").speed = 300;
    // Hippochamp acts after the guardian, so the ward is standing when the clamp lands.
    unit(s, "H").speed = 1;
    const h = unit(s, "H");
    const bare = damagePreview(b, b.moves[0], { ...h, ward: false } as Unit);
    const warded = damagePreview(b, b.moves[0], { ...h, ward: true } as Unit);
    expect(warded).toBeLessThan(bare);
    const r = resolveRound(s, plain(s, { C: { move: 0, target: "H" } }));
    expect(events(r, "ward", "C")[0]).toMatchObject({ targetId: "H" });
    const clamp = events(r, "hit", "B4").find((e) => e.targetId === "H")!;
    expect(clamp.amount).toBe(warded);
    // Spent at Hippochamp's own opportunity, exactly as a self ward is.
    expect(unit(r.state, "H").ward).toBe(false);
    // What the ward guards against is the clamp, the guardian's strongest usable harm on it.
    expect(guardedThreat(s, h, readEffect(cover()))).toBe(bare);
    // A displacement immunity guards against no harm the guardian carries.
    const anchor = readEffect(
      statusEffect("protected", { protection: { type: "displace", degree: "immune" } })
    );
    expect(guardedThreat(s, h, anchor)).toBe(0);
  });
  it("a redirect never switches sides: a fallen squadmate's order goes to the next squadmate in line", () => {
    const s = wide();
    const [, second, third, healer] = s.team;
    hush(s, [healer.id]);
    fitOnly(healer, fitted("Test Mend", [mend(60)]));
    healer.speed = 1;
    // A machine fells the ordered squadmate before the healer acts.
    const e0 = s.enemies[0];
    fitOnly(e0, fitted("Test Crush", [harm(5000)]));
    e0.speed = 300;
    s.orders[e0.id] = { move: 0, target: second.id };
    for (const u of s.team) u.hp = 100;
    const r = resolveRound(s, plain(s, { [healer.id]: { move: 0, target: second.id } }));
    expect(unit(r.state, second.id).hp).toBe(0);
    const redirect = events(r, "redirect", healer.id)[0];
    expect(redirect.targetId).toBe(third.id);
    expect(events(r, "restore", healer.id)[0].targetId).toBe(third.id);
  });
  it("an ally-aimed order lapses when no squadmate stands, starting no cooldown", () => {
    const s = wide();
    const [, target, , healer] = s.team;
    hush(s, [healer.id]);
    fitOnly(healer, fitted("Test Mend", [mend(60)], { recovery: "brief" }));
    healer.speed = 1;
    for (const u of s.team) if (u.id !== target.id && u.id !== healer.id) u.hp = 0;
    target.hp = 1;
    const e0 = s.enemies[0];
    fitOnly(e0, fitted("Test Crush", [harm(5000)]));
    e0.speed = 300;
    s.orders[e0.id] = { move: 0, target: target.id };
    const r = resolveRound(s, plain(s, { [healer.id]: { move: 0, target: target.id } }));
    expect(events(r, "lapsed", healer.id)).toHaveLength(1);
    expect(events(r, "restore", healer.id)).toHaveLength(0);
    expect(events(r, "redirect", healer.id)).toHaveLength(0);
    expect(unit(r.state, healer.id).cooldowns).toEqual([0]);
  });
  it("replays a current-version save whose order names a squadmate", () => {
    const s = createRun(5);
    const h = unit(s, "H");
    const cannon = h.moves.findIndex((m) => aimsAtSquadmate(m));
    expect(cannon, "the squad carries a helpful other-aimed move").toBeGreaterThanOrEqual(0);
    const q = { ...orders(s), H: { move: cannon, target: "C" } };
    const after = command(s, { kind: "round", orders: q });
    const restored = restoreRun(
      JSON.stringify({ version: SAVE_VERSION, seed: 5, history: [{ kind: "draft", squad: "starter" }, { kind: "round", orders: q }] })
    );
    expect(restored.state).toEqual(after);
    // Aimed at Crystorn, the cannon clears or finds nothing; it never deals damage to her.
    expect(after.log.some((l) => /Emergency Water Cannon.*Crystorn/.test(l))).toBe(true);
    expect(after.log.some((l) => /Hippochamp uses Emergency Water Cannon on Crystorn/.test(l))).toBe(false);
  });
});

/*
  Pass 6: the squad draft (contract decisions 45 to 48). The offer is read from real
  generated records, so every guarantee is checked against what the release produces.
*/
describe("Powerworks pass 6: the offer (decisions 45 and 46)", () => {
  it("is seeded by the run seed: the same seed deals the same offer, generated from its named seeds", () => {
    const a = draftOffer(7);
    const b = draftOffer(7);
    expect(b.map((e) => e.seed)).toEqual(a.map((e) => e.seed));
    expect(draftOrder(7)).toEqual(draftOrder(7));
    for (const e of a) {
      // Contract decision 53: a species is tried from its own seeds, one pass at a time.
      expect(e.seed).toBe(`powerworks-draft-7-${e.species}-${e.attempt}`);
      const pass = Math.floor(e.candidate / draftOrder(7).length);
      expect(e.attempt).toBeGreaterThanOrEqual(pass * DRAFT_SEEDS_PER_SPECIES);
      expect(e.attempt).toBeLessThan((pass + 1) * DRAFT_SEEDS_PER_SPECIES);
      // The record is exactly the canonical release's creature for that seed.
      expect(e.record).toEqual(roster(e.species, e.seed));
      expect(e.species).toBe(draftOrder(7)[e.candidate % draftOrder(7).length]);
    }
    // A different seed deals a different offer.
    expect(draftOffer(8).map((e) => e.seed)).not.toEqual(a.map((e) => e.seed));
  });
  it("retries a species over its own seeds and offers the first creature that passes decision 37", () => {
    const passes = (species: string, seed: string) =>
      everyRoundHarms(readCompanion(roster(species, seed), "X")).length > 0;
    let retried = 0;
    let skipped = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const order = draftOrder(seed);
      for (let k = 0; k < order.length; k++) {
        const species = order[k];
        const c = draftCandidate(seed, k, order);
        const tries = Array.from({ length: DRAFT_SEEDS_PER_SPECIES }, (_, j) =>
          passes(species, `powerworks-draft-${seed}-${species}-${j}`)
        );
        if (!c) {
          // Skipped only when none of its tries passes.
          expect(tries.some(Boolean), `seed ${seed} ${species}`).toBe(false);
          skipped++;
          continue;
        }
        // The candidate is the first try that passes; every earlier try failed.
        expect(c.attempt, `seed ${seed} ${species}`).toBe(tries.indexOf(true));
        expect(c.seed).toBe(`powerworks-draft-${seed}-${species}-${c.attempt}`);
        if (c.attempt > 0) retried++;
      }
      // Deterministic: the same seed yields the same candidates.
      expect(draftCandidate(seed, 0, order)?.seed).toBe(draftCandidate(seed, 0)?.seed);
    }
    // Both branches are exercised over these seeds.
    expect(retried).toBeGreaterThan(0);
    expect(skipped).toBeGreaterThan(0);
    // A later pass over the roster tries fresh seeds, never repeating the first pass's.
    const order = draftOrder(1);
    const later = draftCandidate(1, order.length, order);
    if (later) expect(later.attempt).toBeGreaterThanOrEqual(DRAFT_SEEDS_PER_SPECIES);
  }, 120000);
  it("holds its guarantees over 200 seeds: eight distinct species, each with an every-round harm, and a bind, a displace and a support between them", () => {
    const offered: Record<string, number> = Object.fromEntries(
      getSpeciesTemplates().map((t) => [t.key, 0])
    );
    for (let seed = 1; seed <= 200; seed++) {
      const offer = draftOffer(seed);
      for (const e of offer) offered[e.species]++;
      expect(offer, `seed ${seed}`).toHaveLength(DRAFT_OFFER_SIZE);
      expect(offer.map((e) => e.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
      expect(new Set(offer.map((e) => e.species)).size, `seed ${seed}`).toBe(DRAFT_OFFER_SIZE);
      // Listed in draw order.
      const drawn = offer.map((e) => e.candidate);
      expect(drawn).toEqual([...drawn].sort((x, y) => x - y));
      for (const e of offer)
        expect(everyRoundHarms(e.unit).length, `seed ${seed} ${e.species}`).toBeGreaterThan(0);
      expect(offer.some((e) => e.answers.bind), `seed ${seed} bind`).toBe(true);
      expect(offer.some((e) => e.answers.displace), `seed ${seed} displace`).toBe(true);
      expect(offer.some((e) => e.answers.support), `seed ${seed} support`).toBe(true);
    }
    // Contract decision 53: no species is left nearly unseen. Before per-species retries
    // Hypnopet was offered 11 times in 400 seeds and Graviclaw 13, against a median of 105.
    for (const [species, n] of Object.entries(offered))
      expect(n, `${species} offered ${n} times in 200 seeds`).toBeGreaterThanOrEqual(10);
  }, 120000);
  it("is built constructively, never rerolled: guarantees from their first qualifier, the rest in draw order", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const order = draftOrder(seed);
      const offer = draftOffer(seed);
      // Replay the draw: every qualifying candidate of a new species, in order.
      const qualifying: NonNullable<ReturnType<typeof draftCandidate>>[] = [];
      const last = Math.max(...offer.map((e) => e.candidate));
      for (let k = 0; k <= last; k++) {
        const c = draftCandidate(seed, k, order);
        if (c && !qualifying.some((q) => q.species === c.species)) qualifying.push(c);
      }
      const picks = new Set(offer.map((e) => e.candidate));
      // Each guarantee comes from its first qualifier unless an earlier pick carries it.
      const guaranteed: number[] = [];
      for (const answer of ["bind", "displace", "support"] as const) {
        if (guaranteed.some((k) => qualifying.find((q) => q.candidate === k)!.answers[answer]))
          continue;
        const first = qualifying.find((q) => q.answers[answer] && !guaranteed.includes(q.candidate))!;
        expect(picks.has(first.candidate), `seed ${seed} ${answer}`).toBe(true);
        guaranteed.push(first.candidate);
      }
      // The rest are the earliest qualifiers not already picked, with no gaps.
      const rest = qualifying
        .filter((q) => !guaranteed.includes(q.candidate))
        .slice(0, DRAFT_OFFER_SIZE - guaranteed.length)
        .map((q) => q.candidate);
      expect([...picks].sort((x, y) => x - y), `seed ${seed}`).toEqual(
        [...guaranteed, ...rest].sort((x, y) => x - y)
      );
    }
  }, 120000);
});


/** A legal order for every standing companion of any squad: its first legal move at that move's first legal target. */
function anyOrders(s: Run): Record<string, Order> {
  return Object.fromEntries(
    s.team
      .filter((u) => u.hp > 0)
      .map((u) => {
        const i = legalMoves(u, s)[0];
        return [
          u.id,
          i === undefined ? { move: -2, target: "" } : { move: i, target: legalTargets(s, u, i)[0].id },
        ];
      })
  );
}
describe("Powerworks pass 6: the draft command and saves (decisions 47 and 48)", () => {
  it("a run opens in its draft, and the starter draft is byte-identical to the starter run", () => {
    const open = openRun(12);
    expect(open.phase).toBe("draft");
    expect(open.team).toEqual([]);
    expect(open.squad).toBeNull();
    expect(command(open, { kind: "draft", squad: "starter" })).toEqual(createRun(12));
    expect(createRun(12).squad).toBe("starter");
    expect(() => command(open, { kind: "advance" })).toThrow(/Choose a squad/);
    expect(() => command(open, { kind: "round", orders: {} })).toThrow(/Choose a squad/);
  });
  it("takes exactly four distinct offer indexes and rejects anything else", () => {
    const open = openRun(3);
    const bad: unknown[] = [
      [0, 1, 2],
      [0, 1, 2, 3, 4],
      [0, 0, 1, 2],
      [0, 1, 2, DRAFT_OFFER_SIZE],
      [-1, 0, 1, 2],
      [0, 1, 2, 2.5],
      ["0", 1, 2, 3],
      "random",
      null,
      {},
    ];
    for (const squad of bad)
      expect(
        () => command(open, { kind: "draft", squad: squad as number[] }),
        JSON.stringify(squad)
      ).toThrow(`Choose ${SQUAD_SIZE} different creatures from the offer.`);
    const run = command(open, { kind: "draft", squad: [6, 1, 3, 0] });
    expect(run.squad).toEqual([0, 1, 3, 6]);
    expect(run.phase).toBe("planning");
    const offer = draftOffer(3);
    expect(run.team.map((u) => u.species).sort()).toEqual(
      [0, 1, 3, 6].map((i) => offer[i].species).sort()
    );
    // Click order does not change the run.
    expect(command(open, { kind: "draft", squad: [0, 1, 3, 6] })).toEqual(run);
    // The draft is the first command and only that.
    expect(() => command(run, { kind: "draft", squad: [0, 1, 2, 3] })).toThrow(/already chosen/);
  });
  it("reads a drafted creature exactly as the offer shows it", () => {
    const offer = draftOffer(3);
    const run = createRun(3, [1, 2, 4, 7]);
    for (const u of run.team) {
      const shown = offer.find((e) => e.species === u.species)!.unit;
      expect(u.hp).toBe(shown.hp);
      expect(u.speed).toBe(shown.speed);
      expect(u.moves).toEqual(shown.moves);
    }
  });
  it("gives any four species unique ids that do not depend on their order", () => {
    const keys = getSpeciesTemplates().map((t) => t.key);
    expect(unitIds(["graviclaw", "avilily", "crystorn", "hippochamp"])).toEqual(["G", "A", "C", "H"]);
    let checked = 0;
    for (let a = 0; a < keys.length; a++)
      for (let b = a + 1; b < keys.length; b++)
        for (let c = b + 1; c < keys.length; c++)
          for (let d = c + 1; d < keys.length; d++) {
            const four = [keys[a], keys[b], keys[c], keys[d]];
            const ids = unitIds(four);
            expect(new Set(ids).size).toBe(4);
            expect(unitIds([...four].reverse()).reverse()).toEqual(ids);
            checked++;
          }
    expect(checked).toBe(35960);
  });
  it("replays a current-version save with a drafted squad deterministically", () => {
    let s = command(openRun(19), { kind: "draft", squad: [0, 2, 5, 7] });
    const history: Command[] = [{ kind: "draft", squad: [0, 2, 5, 7] }];
    for (let step = 0; step < 6 && (s.phase === "planning" || s.phase === "camp"); step++) {
      const action: Command =
        s.phase === "camp" ? { kind: "advance" } : { kind: "round", orders: anyOrders(s) };
      history.push(action);
      s = command(s, action);
    }
    expect(history.length).toBeGreaterThan(2);
    const restored = restoreRun(JSON.stringify({ version: SAVE_VERSION, seed: 19, history }));
    expect(restored.state).toEqual(s);
    expect(restored.state.squad).toEqual([0, 2, 5, 7]);
    // An illegal draft, a second draft, no draft, or an empty history is rejected.
    expect(() =>
      restoreRun(
        JSON.stringify({ version: SAVE_VERSION, seed: 19, history: [{ kind: "draft", squad: [0, 0, 1, 2] }] })
      )
    ).toThrow();
    expect(() =>
      restoreRun(JSON.stringify({ version: SAVE_VERSION, seed: 19, history: [history[0], history[0]] }))
    ).toThrow();
    expect(() => restoreRun(JSON.stringify({ version: SAVE_VERSION, seed: 19, history: [] }))).toThrow(
      "Unsupported save."
    );
    expect(() =>
      restoreRun(JSON.stringify({ version: SAVE_VERSION, seed: 19, history: history.slice(1) }))
    ).toThrow();
  });
});

describe("Powerworks pass 6: the stalemate rule (decision 52)", () => {
  /** Every unit on both sides carries only this fitted move, and the machines aim it at the first companion. */
  const fitAll = (s: Run, move: () => Move) => {
    for (const u of [...s.team, ...s.enemies]) fitOnly(u, move());
    for (const e of s.enemies) s.orders[e.id] = { move: 0, target: s.team[0].id };
  };
  const tapAll = (run: Run) =>
    Object.fromEntries(run.team.map((u) => [u.id, { move: 0, target: run.enemies[0].id }]));
  it("forces the squad out after ENCOUNTER_STALL_ROUNDS rounds in which nobody loses HP, keeping earned XP", () => {
    // Both sides only tap for nothing, so no round can make progress.
    let s = createRun(4);
    s.xp = 10;
    fitAll(s, () => fitted("Glancing Tap", [harm(0)]));
    for (let round = 1; round < ENCOUNTER_STALL_ROUNDS; round++) {
      s = resolveRound(s, tapAll(s)).state;
      expect(s.phase, `round ${round}`).toBe("planning");
      expect(s.stalled).toBe(round);
    }
    const hp = s.team.map((u) => u.hp);
    const r = resolveRound(s, tapAll(s));
    expect(r.state.phase).toBe("retreated");
    expect(r.state.ended).toBe("outlasted");
    expect(r.state.round).toBe(ENCOUNTER_STALL_ROUNDS);
    expect(r.state.xp).toBe(10);
    expect(r.state.team.map((u) => u.hp)).toEqual(hp);
    expect(r.frames.at(-1)!.event?.kind).toBe("outlasted");
    expect(r.state.log.at(-1)).toMatch(/defenses outlasted the squad: 6 rounds without progress/);
    expect(() => command(r.state, { kind: "advance" })).toThrow();
    expect(() => resolveRound(r.state, tapAll(r.state))).toThrow();
  });
  it("any lost HP resets the count, and a result on the stall round still counts", () => {
    let s = createRun(4);
    fitAll(s, () => fitted("Glancing Tap", [harm(0)]));
    for (let round = 1; round < ENCOUNTER_STALL_ROUNDS; round++) s = resolveRound(s, tapAll(s)).state;
    expect(s.stalled).toBe(ENCOUNTER_STALL_ROUNDS - 1);
    // One companion lands one point: progress, so the count starts again.
    const nudge = { ...tapAll(s), [s.team[0].id]: { move: 0, target: s.enemies[0].id } };
    fitOnly(s.team[0], fitted("Scratch", [harm(10)]));
    const after = resolveRound(s, nudge).state;
    expect(after.phase).toBe("planning");
    expect(after.stalled).toBe(0);
    // A clear on what would be the stall round is a clear.
    const last = structuredClone(s);
    last.enemies.forEach((e) => (e.hp = 1));
    for (const u of last.team) fitOnly(u, fitted("Finishing Tap", [harm(200)]));
    const r = resolveRound(
      last,
      Object.fromEntries(last.team.map((u, i) => [u.id, { move: 0, target: last.enemies[i % last.enemies.length].id }]))
    );
    expect(r.state.phase).toBe("camp");
    expect(r.state.ended).toBeUndefined();
  });
  it("a long fight that keeps making progress is never forced out", () => {
    // Everyone deals a sliver each round to foes with a deep pool of health: 40 rounds, far
    // past any round cap, all of them progress.
    let s = createRun(4);
    fitAll(s, () => fitted("Scratch", [harm(10)]));
    s.enemies.forEach((e) => (e.hp = e.max = 5000));
    s.team.forEach((u) => (u.hp = u.max = 5000));
    for (let round = 1; round <= 40; round++) {
      s = resolveRound(s, tapAll(s)).state;
      expect(s.phase, `round ${round}`).toBe("planning");
      expect(s.stalled).toBe(0);
    }
    expect(s.round).toBe(41);
  });
});
