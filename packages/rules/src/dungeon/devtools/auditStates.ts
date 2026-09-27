// Intuitiveness audit (docs/design/powerworks-intuitiveness-audit.md): save histories for the scripted moments.
// Run: node apps/web/scripts/runNode.cjs packages/rules/src/dungeon/devtools/auditStates.ts > untracked/powerworks-audit/states.json
import { createRun, command, legalMoves, legalTargets, SAVE_VERSION, type Command, type Order, type Run } from "../index.ts";
import { moveValue } from "../value.ts";

const seed = 7;
const policy = (s: Run): Record<string, Order> => {
  const orders: Record<string, Order> = {};
  for (const u of s.team.filter((u) => u.hp > 0)) {
    const moves = legalMoves(u, s);
    let best: { move: number; target: string; score: number } | null = null;
    for (const i of moves) {
      if (i < 0) continue;
      const v = moveValue(s, u, i);
      const target = v.target ?? legalTargets(s, u, i)[0]?.id;
      if (!target) continue;
      const score = v.harm + v.saved + v.healed;
      if (!best || score > best.score) best = { move: i, target, score };
    }
    if (best) orders[u.id] = { move: best.move, target: best.target };
    else if (moves.includes(-1)) orders[u.id] = { move: -1, target: s.enemies.find((e) => e.hp > 0)!.id };
  }
  return orders;
};

let s: Run = createRun(seed);
const history: Command[] = [{ kind: "draft", squad: "starter" }];
const sectors: Record<number, Command[]> = { 0: [...history] };
const found: Record<string, Command[]> = {};
let guard = 0;
while ((s.phase === "planning" || s.phase === "camp") && guard++ < 300) {
  if (s.phase === "camp") {
    const down = s.team.find((u) => u.hp <= 0);
    if (down && s.revival) {
      const c: Command = { kind: "revive", id: down.id };
      s = command(s, c);
      history.push(c);
    }
    const c: Command = { kind: "advance" };
    s = command(s, c);
    history.push(c);
    sectors[s.room] = [...history];
    continue;
  }
  // A planning moment worth auditing: a machine charging, and some condition on the board.
  const charging = s.enemies.some((e) => e.hp > 0 && e.charge !== null);
  const conditions = [...s.team, ...s.enemies].some((u) => u.hp > 0 && u.conditions.length > 0);
  if (charging && conditions && !found.charged) found.charged = [...history];
  if (conditions && !found.conditions) found.conditions = [...history];
  const c: Command = { kind: "round", orders: policy(s) };
  s = command(s, c);
  history.push(c);
}
console.log(JSON.stringify({ version: SAVE_VERSION, seed, sectors, found, end: s.phase }));
