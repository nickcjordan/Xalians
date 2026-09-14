import { applyArtilleryShot, chooseArtilleryBotShot, createArtilleryState, type ArtilleryDifficulty, type ArtilleryShot } from './artillery.ts';
import { applySweepAction, createSweepState, type SweepAction } from './hazardSweep.ts';
import { applyMemoryReveal, createMemoryState } from './memory.ts';
import { applyRelayMove, createRelayState, type RelayDirection } from './relayMerge.ts';
import { applySolitaireAction, createSolitaireState, type SolitaireAction } from './solitaire.ts';

export const ARCADE_AWARDS = {
  artillery: 30,
  patience: 35,
  sweep: 20,
  relay: 20,
  match: 15,
} as const;

export type ArcadeGameId = keyof typeof ARCADE_AWARDS;
export type ArcadeCompletion =
  | { gameId: 'artillery'; seed: string; difficulty?: ArtilleryDifficulty; actions: ArtilleryShot[] }
  | { gameId: 'sweep'; seed: string; level: 'survey' | 'field' | 'frontier'; actions: SweepAction[] }
  | { gameId: 'relay'; seed: string; actions: RelayDirection[] }
  | { gameId: 'patience'; seed: string; drawCount: 1 | 3; actions: SolitaireAction[] }
  | { gameId: 'match'; seed: string; actions: number[] };

const SWEEP_LEVELS = {
  survey: { width: 9, height: 9, mines: 10 },
  field: { width: 16, height: 16, mines: 40 },
  frontier: { width: 30, height: 16, mines: 99 },
} as const;

function replayArtillery(completion: Extract<ArcadeCompletion, { gameId: 'artillery' }>): boolean {
  if (completion.actions.length > 80) return false;
  let state = createArtilleryState(completion.seed, 'bot', completion.difficulty ?? 'standard');
  for (const shot of completion.actions) {
    if (state.phase !== 'aiming' || state.current !== 'left') return false;
    state = applyArtilleryShot(state, shot).state;
    if (state.phase === 'finished') break;
    if (state.current !== 'right') return false;
    state = applyArtilleryShot(state, chooseArtilleryBotShot(state)).state;
    if (state.phase === 'finished') break;
  }
  return state.phase === 'finished' && state.winner === 'left';
}

function replaySweep(completion: Extract<ArcadeCompletion, { gameId: 'sweep' }>): boolean {
  if (completion.actions.length > 600) return false;
  const config = SWEEP_LEVELS[completion.level];
  let state = createSweepState(completion.seed, config.width, config.height, config.mines);
  for (const action of completion.actions) state = applySweepAction(state, action);
  return state.phase === 'won';
}

function replayRelay(completion: Extract<ArcadeCompletion, { gameId: 'relay' }>): boolean {
  if (completion.actions.length > 5000) return false;
  let state = createRelayState(completion.seed);
  for (const action of completion.actions) state = applyRelayMove(state, action).state;
  return state.phase === 'won';
}

function replayPatience(completion: Extract<ArcadeCompletion, { gameId: 'patience' }>): boolean {
  if (completion.actions.length > 5000) return false;
  let state = createSolitaireState(completion.seed, completion.drawCount);
  for (const action of completion.actions) state = applySolitaireAction(state, action);
  return state.phase === 'won';
}

function replayMatch(completion: Extract<ArcadeCompletion, { gameId: 'match' }>): boolean {
  if (completion.actions.length > 1000) return false;
  let state = createMemoryState(completion.seed);
  for (const index of completion.actions) state = applyMemoryReveal(state, index);
  return state.phase === 'won';
}

export function verifyArcadeCompletion(completion: ArcadeCompletion): boolean {
  if (!completion.seed || completion.seed.length > 128) return false;
  switch (completion.gameId) {
    case 'artillery': return replayArtillery(completion);
    case 'sweep': return replaySweep(completion);
    case 'relay': return replayRelay(completion);
    case 'patience': return replayPatience(completion);
    case 'match': return replayMatch(completion);
  }
}
