import { hashSeed, nextRandom } from './random.ts';

export type SweepCell = { mine: boolean; revealed: boolean; flagged: boolean; adjacent: number };
export type SweepState = {
  seed: string;
  width: number;
  height: number;
  mines: number;
  cells: SweepCell[];
  started: boolean;
  phase: 'playing' | 'won' | 'lost';
  revealed: number;
};

export type SweepAction = { type: 'reveal' | 'flag'; index: number };

const neighbors = (index: number, width: number, height: number): number[] => {
  const x = index % width;
  const y = Math.floor(index / width);
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) out.push(ny * width + nx);
    }
  }
  return out;
};

export function createSweepState(seed: string, width = 9, height = 9, mines = 10): SweepState {
  if (mines < 1 || mines >= width * height - 9) throw new Error('Mine count leaves no safe opening.');
  return {
    seed, width, height, mines, started: false, phase: 'playing', revealed: 0,
    cells: Array.from({ length: width * height }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 })),
  };
}

function plantMines(state: SweepState, first: number): SweepCell[] {
  const excluded = new Set([first, ...neighbors(first, state.width, state.height)]);
  const candidates = state.cells.map((_, index) => index).filter((index) => !excluded.has(index));
  let rng = hashSeed(`${state.seed}:${first}`);
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const draw = nextRandom(rng);
    rng = draw.state;
    const j = Math.floor(draw.value * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const mineSet = new Set(candidates.slice(0, state.mines));
  return state.cells.map((cell, index) => ({
    ...cell,
    mine: mineSet.has(index),
    adjacent: neighbors(index, state.width, state.height).filter((n) => mineSet.has(n)).length,
  }));
}

export function applySweepAction(state: SweepState, action: SweepAction): SweepState {
  if (state.phase !== 'playing' || action.index < 0 || action.index >= state.cells.length) return state;
  let cells = state.started ? state.cells.map((cell) => ({ ...cell })) : state.cells.map((cell) => ({ ...cell }));
  const target = cells[action.index];
  if (action.type === 'flag') {
    if (target.revealed) return state;
    target.flagged = !target.flagged;
    return { ...state, cells };
  }
  if (!state.started) cells = plantMines({ ...state, cells }, action.index);
  const revealedTarget = cells[action.index];
  if (revealedTarget.flagged || revealedTarget.revealed) return state;
  if (revealedTarget.mine) {
    cells = cells.map((cell) => cell.mine ? { ...cell, revealed: true } : cell);
    return { ...state, started: true, cells, phase: 'lost' };
  }

  const queue = [action.index];
  const seen = new Set<number>();
  while (queue.length) {
    const index = queue.shift() as number;
    if (seen.has(index)) continue;
    seen.add(index);
    const cell = cells[index];
    if (cell.flagged || cell.mine) continue;
    cell.revealed = true;
    if (cell.adjacent === 0) {
      neighbors(index, state.width, state.height).forEach((neighbor) => {
        if (!seen.has(neighbor)) queue.push(neighbor);
      });
    }
  }
  const revealed = cells.filter((cell) => cell.revealed && !cell.mine).length;
  const won = revealed === cells.length - state.mines;
  return { ...state, started: true, cells, revealed, phase: won ? 'won' : 'playing' };
}
