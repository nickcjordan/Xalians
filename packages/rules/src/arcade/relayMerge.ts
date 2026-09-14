import { hashSeed, nextRandom } from './random.ts';

export type RelayDirection = 'up' | 'down' | 'left' | 'right';
export type RelayState = {
  seed: string;
  board: number[];
  score: number;
  moves: number;
  rngState: number;
  phase: 'playing' | 'won' | 'lost';
};

export type RelayMoveResult = { state: RelayState; changed: boolean };

const SIZE = 4;
export const RELAY_TARGET = 256;

function addTile(board: readonly number[], rngState: number): { board: number[]; rngState: number } {
  const empty = board.map((value, index) => value === 0 ? index : -1).filter((index) => index >= 0);
  if (!empty.length) return { board: [...board], rngState };
  const positionDraw = nextRandom(rngState);
  const valueDraw = nextRandom(positionDraw.state);
  const next = [...board];
  next[empty[Math.floor(positionDraw.value * empty.length)]] = valueDraw.value < 0.9 ? 2 : 4;
  return { board: next, rngState: valueDraw.state };
}

export function createRelayState(seed: string): RelayState {
  const first = addTile(Array(16).fill(0), hashSeed(`${seed}:relay`));
  const second = addTile(first.board, first.rngState);
  return { seed, board: second.board, score: 0, moves: 0, rngState: second.rngState, phase: 'playing' };
}

function collapse(line: readonly number[]): { line: number[]; score: number } {
  const values = line.filter(Boolean);
  const result: number[] = [];
  let score = 0;
  for (let i = 0; i < values.length; i += 1) {
    if (values[i] === values[i + 1]) {
      const merged = values[i] * 2;
      result.push(merged);
      score += merged;
      i += 1;
    } else {
      result.push(values[i]);
    }
  }
  while (result.length < SIZE) result.push(0);
  return { line: result, score };
}

function readLine(board: readonly number[], line: number, direction: RelayDirection): number[] {
  const indexes = Array.from({ length: SIZE }, (_, position) => {
    if (direction === 'left') return line * SIZE + position;
    if (direction === 'right') return line * SIZE + (SIZE - 1 - position);
    if (direction === 'up') return position * SIZE + line;
    return (SIZE - 1 - position) * SIZE + line;
  });
  return indexes.map((index) => board[index]);
}

function writeLine(board: number[], line: number, direction: RelayDirection, values: readonly number[]) {
  values.forEach((value, position) => {
    let index;
    if (direction === 'left') index = line * SIZE + position;
    else if (direction === 'right') index = line * SIZE + (SIZE - 1 - position);
    else if (direction === 'up') index = position * SIZE + line;
    else index = (SIZE - 1 - position) * SIZE + line;
    board[index] = value;
  });
}

export function relayHasMove(board: readonly number[]): boolean {
  if (board.includes(0)) return true;
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const index = y * SIZE + x;
      if (x < SIZE - 1 && board[index] === board[index + 1]) return true;
      if (y < SIZE - 1 && board[index] === board[index + SIZE]) return true;
    }
  }
  return false;
}

export function applyRelayMove(state: RelayState, direction: RelayDirection): RelayMoveResult {
  if (state.phase !== 'playing') return { state, changed: false };
  const board = [...state.board];
  let gained = 0;
  for (let line = 0; line < SIZE; line += 1) {
    const collapsed = collapse(readLine(state.board, line, direction));
    gained += collapsed.score;
    writeLine(board, line, direction, collapsed.line);
  }
  const changed = board.some((value, index) => value !== state.board[index]);
  if (!changed) return { state, changed: false };
  const spawned = addTile(board, state.rngState);
  const won = spawned.board.some((value) => value >= RELAY_TARGET);
  const phase = won ? 'won' : relayHasMove(spawned.board) ? 'playing' : 'lost';
  return {
    changed: true,
    state: {
      ...state,
      board: spawned.board,
      score: state.score + gained,
      moves: state.moves + 1,
      rngState: spawned.rngState,
      phase,
    },
  };
}
