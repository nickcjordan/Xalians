// Isolated Powerworks prototype. No collection mutations or real reward grants.
import cards from './cards.json';
import effectiveness from '@xalians/content/typeEffectivenessMatrix.json';

export type Move = { name: string; damage: number; range: string; kind: string };
export type Unit = { id: string; species: string; name: string; element: string; hp: number; max: number; speed: number; moves: Move[]; uses: number[]; enemy: boolean; snared: number; ward: boolean; charge: string | null; recovery: number };
export type Order = { move: number; target: string };
export type Phase = 'planning' | 'camp' | 'won' | 'lost' | 'retreated';
export type Run = { seed: number; rng: number; room: number; round: number; team: Unit[]; enemies: Unit[]; orders: Record<string, Order>; phase: Phase; revival: number; xp: number; log: string[] };
export type Frame = { team: Unit[]; enemies: Unit[]; text: string };
export type Command = { kind: 'round'; orders: Record<string, Order> } | { kind: 'advance' } | { kind: 'revive'; id: string } | { kind: 'retreat' };
export const ROOMS = cards.rooms;
const names: Record<string, string> = { graviclaw: 'Graviclaw', avilily: 'Avilily', crystorn: 'Crystorn', hippochamp: 'Hippochamp', crawler: 'Maintenance crawler', drone: 'Security drone', shield: 'Shield unit', discharge: 'Discharge unit', guardian: 'Central guardian' };
export const LAST_RESORT: Move = { name: 'Desperate strike', damage: 3, range: 'melee', kind: 'fallback' };
const clone = <T,>(value: T): T => structuredClone(value);
const standing = (units: Unit[]) => units.filter(u => u.hp > 0);
function random(s: Run) { s.rng = (Math.imul(1664525, s.rng) + 1013904223) >>> 0; return s.rng / 4294967296; }
function unit(species: string, id: string, hp?: number): Unit {
  const t = cards.templates[species as keyof typeof cards.templates];
  const enemy = 'enemy' in t;
  return { ...clone(t), name: names[species], species, id, enemy, max: hp ?? t.hp, hp: hp ?? t.hp, uses: t.moves.map((_, i) => enemy ? -1 : i === 3 ? 1 : 3), snared: 0, ward: false, charge: null, recovery: 0 };
}
export function moveAt(u: Unit, i: number): Move { return i === -1 ? LAST_RESORT : u.moves[i]; }
export function legalMoves(u: Unit): number[] {
  if (u.hp <= 0) return [];
  const moves = u.moves.map((_, i) => i).filter(i => (u.enemy || u.uses[i] > 0) && !(u.snared && u.moves[i].range === 'melee') && !(u.recovery && u.moves[i].kind === 'charge'));
  // Explicit exhaustion-only option; never substitutes for a failed signature.
  if (!u.enemy && !u.snared && !u.moves.some((m, i) => m.kind === 'hit' && u.uses[i] > 0)) moves.push(-1);
  return moves;
}
export function matchup(attacker: Unit, target: Unit): number {
  const key = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return (effectiveness as Record<string, Record<string, number>>)[key(attacker.element)][key(target.element)];
}
export function damagePreview(u: Unit, move: Move, target: Unit): number {
  return Math.floor(move.damage * (move.kind === 'fallback' ? 1 : matchup(u, target)) * (target.ward ? .5 : 1));
}
function prepare(s: Run) {
  s.orders = {};
  for (const u of standing(s.enemies)) {
    const available = legalMoves(u);
    const charge = available.find(i => u.moves[i].kind === 'charge');
    let move = charge ?? available[0];
    if (u.charge) move = u.moves.findIndex(m => m.kind === 'charge');
    else if (u.species === 'shield' && available.length > 1) move = random(s) < 1 / 3 ? 1 : 0;
    const foes = standing(s.team);
    s.orders[u.id] = { move: move ?? -2, target: u.charge ?? foes[Math.floor(random(s) * foes.length)].id };
  }
}
function enter(s: Run) {
  s.round = 1; s.phase = 'planning';
  for (const u of s.team) { u.uses = [3, 3, 3, 1]; u.snared = 0; u.ward = false; u.charge = null; u.recovery = 0; }
  s.enemies = ROOMS[s.room].enemies.map(row => unit(String(row[0]), String(row[1]), Number(row[2])));
  for (const row of [s.team, s.enemies]) for (let i = row.length - 1; i > 0; i--) { const j = Math.floor(random(s) * (i + 1)); [row[i], row[j]] = [row[j], row[i]]; }
  s.log.push(`Entered ${ROOMS[s.room].name}.`);
  prepare(s);
}
export function createRun(seed = 1): Run {
  const s: Run = { seed: seed >>> 0, rng: seed >>> 0, room: 0, round: 1, team: ['graviclaw', 'avilily', 'crystorn', 'hippochamp'].map((key, i) => unit(key, ['G', 'A', 'C', 'H'][i])), enemies: [], orders: {}, phase: 'planning', revival: 1, xp: 0, log: [] };
  enter(s); return s;
}
export function resolveRound(previous: Run, orders: Record<string, Order>): { state: Run; frames: Frame[] } {
  if (previous.phase !== 'planning') throw new Error('This encounter is not accepting orders.');
  for (const u of standing(previous.team)) {
    const q = orders[u.id]; const legal = legalMoves(u);
    if (!q || !(legal.length ? legal.includes(q.move) : q.move === -2) || (q.move !== -2 && !standing(previous.enemies).some(t => t.id === q.target))) throw new Error(`Choose a legal move and target for ${u.name}.`);
  }
  const s = clone(previous); const frames: Frame[] = [];
  const emit = (text: string) => { s.log.push(text); frames.push({ text, team: clone(s.team), enemies: clone(s.enemies) }); };
  emit(`Encounter ${s.room + 1} · Round ${s.round}`);
  const all = [...standing(s.team), ...standing(s.enemies)];
  const tie = [...all].sort((a, b) => a.id.localeCompare(b.id));
  const shift = (s.round - 1) % tie.length; const priority = [...tie.slice(shift), ...tie.slice(0, shift)];
  const sequence = [...all].sort((a, b) => b.speed - a.speed || priority.indexOf(a) - priority.indexOf(b));
  for (const u of sequence) {
    if (!standing(s.team).length || !standing(s.enemies).length) break;
    if (u.hp <= 0) continue;
    const q = (u.enemy ? s.orders : orders)[u.id]; const restrained = u.snared > 0;
    u.ward = false; if (u.recovery) u.recovery--;
    if (q.move === -2) emit(`${u.name} cannot act while restrained.`);
    else {
      const m = moveAt(u, q.move); const release = m.kind === 'charge' && !!u.charge;
      if (restrained && m.range === 'melee') {
        if (release) { u.charge = null; u.recovery = 1; }
        emit(`${u.name}'s ${m.name} is stopped by restraint.${release ? ' Charge dispersed; recovery begins.' : ' No move use spent.'}`);
      } else {
        const targets = u.enemy ? s.team : s.enemies;
        let target = targets.find(t => t.id === q.target);
        if (!target || target.hp <= 0) {
          const index = target ? targets.indexOf(target) : -1;
          target = Array.from({ length: targets.length }, (_, i) => targets[(index + i + 1) % targets.length]).find(t => t.hp > 0);
          if (target) emit(`${u.name} redirects ${m.name} to ${target.name} (${target.id}).`);
        }
        if (target) {
          if (!u.enemy && q.move >= 0) u.uses[q.move]--;
          if (m.kind === 'ward') { u.ward = true; emit(`${u.name} activates its shield: incoming damage halved until its next opportunity.`); }
          else if (m.kind === 'snare') { target.snared = 1; emit(`${u.name} uses ${m.name}: ${target.name} restrained through its next opportunity.`); }
          else if (m.kind === 'charge' && !release) { u.charge = target.id; emit(`${u.name} begins ${m.name}. A powerful melee release is coming at its next opportunity.`); }
          else {
            const damage = damagePreview(u, m, target); target.hp = Math.max(0, target.hp - damage);
            if (release) { u.charge = null; u.recovery = 1; }
            if (m.kind === 'fallback') u.hp = Math.max(0, u.hp - 2);
            emit(`${u.name} uses ${m.name} on ${target.name} (${target.id}): ${damage} damage.${target.hp === 0 ? ' Knocked out.' : ''}${m.kind === 'fallback' ? ' Attacker takes 2 recoil damage.' : ''}`);
          }
        }
      }
    }
    if (restrained) u.snared = Math.max(0, u.snared - 1);
  }
  if (!standing(s.team).length) { s.phase = 'lost'; emit('The squad has fallen. Previously earned practice XP is retained.'); }
  else if (!standing(s.enemies).length) { s.xp += s.room === 3 ? 30 : 10; s.phase = s.room === 3 ? 'won' : 'camp'; emit(`Encounter cleared. +${s.room === 3 ? 30 : 10} practice XP per squad member.`); }
  else { s.round++; prepare(s); }
  return { state: s, frames };
}
export function command(previous: Run, action: Command): Run {
  if (action.kind === 'round') return resolveRound(previous, action.orders).state;
  const s = clone(previous);
  if (s.phase !== 'camp') throw new Error('This action is available between encounters.');
  if (action.kind === 'revive') {
    const u = s.team.find(t => t.id === action.id);
    if (!u || u.hp > 0 || !s.revival) throw new Error('Revival is unavailable.');
    u.hp = Math.ceil(u.max / 2); s.revival = 0; s.log.push(`${u.name} revived at ${u.hp} HP.`);
  } else if (action.kind === 'retreat') { s.phase = 'retreated'; s.log.push('Squad extracted. Earned practice XP retained.'); }
  else {
    s.room++;
    if (s.room === 3) { for (const u of standing(s.team)) u.hp = Math.min(u.max, u.hp + 10); s.log.push('Recovery station: +10 HP to standing squad members.'); }
    enter(s);
  }
  return s;
}

// Saves contain commands, not trusted arbitrary combat state. Replay validates each action.
export function restoreRun(raw: string): { state: Run; history: Command[] } {
  const save = JSON.parse(raw);
  if (save.version !== 1 || !Number.isInteger(save.seed) || !Array.isArray(save.history) || save.history.length > 2000) throw new Error('Unsupported save.');
  let state = createRun(save.seed);
  for (const action of save.history) state = command(state, action);
  return { state, history: save.history };
}
