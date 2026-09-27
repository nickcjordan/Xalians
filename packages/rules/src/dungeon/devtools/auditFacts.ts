// Intuitiveness audit (docs/design/powerworks-intuitiveness-audit.md): the engine's facts behind the answer key for each moment.
// Run: node apps/web/scripts/runNode.cjs packages/rules/src/dungeon/devtools/auditFacts.ts --dir=untracked/powerworks-audit --moments=scripts/powerworks-audit/moments.json
import { readFileSync } from "node:fs";
import {
  areaReach,
  command,
  damagePreview,
  initiative,
  legalMoves,
  legalTargets,
  moveAt,
  nimbleFactor,
  openRun,
  type Command,
  type Order,
  type Run,
  type Unit,
} from "../index.ts";
import { machineThreat, moveValue, pickShare, projectOrders, atHealth, valueOn, total } from "../value.ts";

const dir = process.argv.find((a) => a.startsWith("--dir="))!.slice(6);
const states = JSON.parse(readFileSync(`${dir}/states.json`, "utf8"));
const momentsPath = process.argv.find((a) => a.startsWith("--moments="))?.slice(10) ?? `${dir}/moments.json`;
const moments = JSON.parse(readFileSync(momentsPath, "utf8"));

const short: Record<string, string> = { crawler: "Crawler", drone: "Drone", shield: "Bulwark", discharge: "Capacitor", guardian: "Guardian" };
const restore = (history: Command[]): Run => {
  let s = openRun(states.seed);
  for (const c of history) s = command(s, c);
  return s;
};
const out: Record<string, unknown> = {};
for (const m of moments) {
  const history: Command[] = m.history.startsWith("sector")
    ? states.sectors[m.history.slice(6)]
    : states.found[m.history];
  const s = restore(history);
  const label = (u: Unit) => {
    if (!u.enemy) return u.name;
    const peers = s.enemies.filter((e) => e.species === u.species);
    return (short[u.species] ?? u.name) + (peers.length > 1 ? ` ${peers.findIndex((e) => e.id === u.id) + 1}` : "");
  };
  const byName = (n: string) => [...s.team, ...s.enemies].find((u) => u.name === n || u.id === n || label(u) === n)!;
  const moveIndex = (u: Unit, name: string) => u.moves.findIndex((x) => x.name.startsWith(name));
  const plans: Record<string, Order> = {};
  for (const [who, o] of Object.entries(m.plans ?? {}) as [string, { move: string; target: string }][]) {
    const u = byName(who);
    plans[u.id] = { move: moveIndex(u, o.move), target: byName(o.target).id };
  }
  const f: Record<string, unknown> = { room: s.room + 1, round: s.round };
  f.units = [...s.team, ...s.enemies].map((u) => ({
    who: label(u),
    hp: `${u.hp}/${u.max}`,
    speed: u.speed,
    conditions: u.conditions.map((c) => `${c.status} (${c.group}, ${c.remaining === Infinity ? "lasting" : c.remaining + " left"})`),
    charging: u.charge ? `charging ${moveAt(u, u.chargeMove).name} at ${label(byName(u.charge))}` : null,
    bound: u.bound || 0,
    guarded: !!u.ward,
  }));
  f.turnOrder = initiative(s.team, s.enemies, s.round, { ...s.orders, ...plans }).map(label);
  f.machineNextAttack = s.enemies.filter((e) => e.hp > 0).map((e) => {
    const t = machineThreat(s, e);
    return { who: label(e), expectedHealth: Math.round(t.amount), move: t.move !== null ? moveAt(e, t.move).name : null, upClose: !t.ranged, held: t.held ?? null, targetKnown: false };
  });
  f.legalMoves = Object.fromEntries(s.team.filter((u) => u.hp > 0).map((u) => [u.name, legalMoves(u, s).map((i) => (i < 0 ? "Desperate strike" : moveAt(u, i).name))]));
  f.companionBody = s.team.filter((u) => u.hp > 0).map((u) => ({
    who: u.name,
    pickedByMachinesPct: Math.round(pickShare(s, u) * 100),
    slipsPctVs: Object.fromEntries(s.enemies.filter((e) => e.hp > 0).map((e) => {
      const t = machineThreat(s, e);
      return [label(e), t.move !== null ? Math.round((1 - nimbleFactor(e, u, moveAt(e, t.move))) * 100) : 0];
    })),
  }));
  if (m.select) {
    const u = byName(m.select);
    f.selectedMoves = u.moves.map((mv, i) => {
      const legal = legalMoves(u, s).includes(i);
      const v = legal ? moveValue(s, u, i) : null;
      return {
        move: mv.name,
        legal,
        valueHealth: v ? total(v) : null,
        harm: v?.harm, kept: v?.saved, healed: v?.healed, knockout: v?.knockout,
        readOn: v?.target ? label(byName(v.target)) : null,
        whyZero: v?.why ?? null,
      };
    });
  }
  const inHand = m.choose ?? m.hover;
  if (m.select && inHand) {
    const u = byName(m.select);
    const i = moveIndex(u, inHand);
    const mv = moveAt(u, i);
    f.moveInHand = {
      move: mv.name,
      range: mv.range, approach: mv.approach, preparation: mv.preparation,
      effects: mv.effects.map((e) => `${e.support}${e.status ? ":" + e.status : ""} ${e.likelihood} ${e.recipient}`),
      onEachTarget: legalTargets(s, u, i).map((t) => {
        const v = valueOn(s, u, i, t);
        return {
          target: label(t),
          damage: t.enemy ? damagePreview(u, mv, t) : 0,
          healthAfter: t.enemy ? Math.max(0, t.hp - damagePreview(u, mv, t)) : t.hp,
          alsoReaches: areaReach(s, u, mv, t).map((r) => `${label(r)} (${damagePreview(u, mv, r, "area")} damage)`),
          value: total(v), kept: v.saved, why: v.why ?? null,
        };
      }),
      aimedAt: m.aim ? label(byName(m.aim)) : null,
    };
  }
  if (Object.keys(plans).length) {
    const p = projectOrders(s, plans);
    f.planResult = s.enemies.map((e) => ({ who: label(e), healthNow: e.hp, healthAfterPlan: p.hp[e.id] }));
    f.wastedOrders = Object.entries(plans).flatMap(([id, q]) => {
      const u = s.team.find((x) => x.id === id)!;
      const at = p.before[id] ? atHealth(s, p.before[id]) : s;
      const t = [...at.enemies, ...s.team].find((x) => x.id === q.target)!;
      const v = valueOn(at, u, q.move, t);
      return total(v) <= 0 ? [{ who: u.name, move: moveAt(u, q.move).name, target: label(t), why: v.why }] : [];
    });
  }
  out[m.id] = f;
}
console.log(JSON.stringify(out, null, 1));
