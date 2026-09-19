import type { ArcadeGameId } from './catalog';

export type ArcadeRecord = {
  played: number;
  wins: number;
  bestScore?: number;
  bestTimeMs?: number;
  lastPlayedAt?: string;
};

export type ArcadeLocalProgress = {
  version: 1;
  credits: number;
  day: string;
  earnedToday: number;
  records: Partial<Record<ArcadeGameId, ArcadeRecord>>;
};

const STORAGE_KEY = 'xalians.arcade.progress.v1';
export const ARCADE_DAILY_CAP = 100;
export const ARCADE_TOKEN_PRICE = 100;

export const utcDay = (date = new Date()) => date.toISOString().slice(0, 10);

export function dailyArcadeSeed(gameId: ArcadeGameId, date = new Date()): string {
  return `${utcDay(date)}:${gameId}:v1`;
}

export function practiceArcadeSeed(gameId: ArcadeGameId): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `${gameId}:${random}`;
}

export function arcadeSessionId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function emptyArcadeProgress(day = utcDay()): ArcadeLocalProgress {
  return { version: 1, credits: 0, day, earnedToday: 0, records: {} };
}

export function arcadeCreditsRemaining(earnedToday: number): number {
  return Math.max(0, ARCADE_DAILY_CAP - earnedToday);
}

export function loadArcadeProgress(storage: Storage | undefined = globalThis.localStorage): ArcadeLocalProgress {
  if (!storage) return emptyArcadeProgress();
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || 'null') as ArcadeLocalProgress | null;
    if (!parsed || parsed.version !== 1) return emptyArcadeProgress();
    if (parsed.day !== utcDay()) return { ...parsed, day: utcDay(), earnedToday: 0 };
    return parsed;
  } catch {
    return emptyArcadeProgress();
  }
}

export function saveArcadeProgress(progress: ArcadeLocalProgress, storage: Storage | undefined = globalThis.localStorage) {
  storage?.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function recordArcadeResult(
  gameId: ArcadeGameId,
  won: boolean,
  award: number,
  result: { score?: number; timeMs?: number } = {},
  storage: Storage | undefined = globalThis.localStorage
): ArcadeLocalProgress {
  const current = loadArcadeProgress(storage);
  const previous = current.records[gameId] ?? { played: 0, wins: 0 };
  const remaining = arcadeCreditsRemaining(current.earnedToday);
  const earned = won ? Math.min(award, remaining) : 0;
  const record: ArcadeRecord = {
    played: previous.played + 1,
    wins: previous.wins + Number(won),
    lastPlayedAt: new Date().toISOString(),
    bestScore: result.score === undefined ? previous.bestScore : Math.max(previous.bestScore ?? 0, result.score),
    bestTimeMs: !won || result.timeMs === undefined
      ? previous.bestTimeMs
      : Math.min(previous.bestTimeMs ?? Number.POSITIVE_INFINITY, result.timeMs),
  };
  const next: ArcadeLocalProgress = {
    ...current,
    credits: (current.credits + earned) % ARCADE_TOKEN_PRICE,
    earnedToday: current.earnedToday + earned,
    records: { ...current.records, [gameId]: record },
  };
  saveArcadeProgress(next, storage);
  return next;
}

type AccountReward = {
  awardedCredits: number;
  credits: number;
  earnedToday: number;
  tokensAwarded: number;
  tokenBalance: number;
  duplicate: boolean;
};

export type ArcadeRewardOutcome = {
  progress: ArcadeLocalProgress;
  message: string;
  accountBacked: boolean;
};

function applyAccountProgress(reward: AccountReward, storage: Storage | undefined = globalThis.localStorage) {
  const current = loadArcadeProgress(storage);
  const next = { ...current, day: utcDay(), credits: reward.credits, earnedToday: reward.earnedToday };
  saveArcadeProgress(next, storage);
  return next;
}

export function syncArcadeProgressFromAttributes(
  attributes: Record<string, unknown> | undefined,
  storage: Storage | undefined = globalThis.localStorage
): ArcadeLocalProgress {
  const current = loadArcadeProgress(storage);
  if (!attributes) return current;
  const credits = typeof attributes.arcadeCredits === 'number' ? attributes.arcadeCredits : 0;
  const earnedToday = attributes.arcadeDay === utcDay() && typeof attributes.arcadeEarnedToday === 'number'
    ? attributes.arcadeEarnedToday
    : 0;
  const next = { ...current, credits, earnedToday };
  saveArcadeProgress(next, storage);
  return next;
}

export async function completeArcadeGame(
  gameId: ArcadeGameId,
  completion: Record<string, unknown>,
  result: { score?: number; timeMs?: number } = {}
): Promise<ArcadeRewardOutcome> {
  let user;
  try {
    const { currentUser } = await import('@/utils/authUtil');
    user = await currentUser();
  } catch {
    const progress = recordArcadeResult(gameId, true, 0, result);
    return { progress, accountBacked: false, message: 'Win recorded. Account rewards could not be reached.' };
  }

  if (!user) {
    const award = ARCADE_GAMES_AWARD[gameId];
    const progress = recordArcadeResult(gameId, true, award, result);
    return { progress, accountBacked: false, message: `Practice win recorded locally. ${progress.earnedToday}/${ARCADE_DAILY_CAP} guest credits today.` };
  }

  try {
    const { callCompleteArcade } = await import('@/utils/dbApi');
    const reward = await callCompleteArcade(completion) as AccountReward;
    recordArcadeResult(gameId, true, 0, result);
    const progress = applyAccountProgress(reward);
    const tokenText = reward.tokensAwarded > 0 ? ` ${reward.tokensAwarded} Scrambler Token earned.` : '';
    const awardText = reward.duplicate ? 'This session was already recorded.' : `${reward.awardedCredits} Arcade Credits earned.`;
    return { progress, accountBacked: true, message: `${awardText}${tokenText} ${reward.earnedToday}/${ARCADE_DAILY_CAP} today.` };
  } catch {
    const progress = recordArcadeResult(gameId, true, 0, result);
    return { progress, accountBacked: false, message: 'Win recorded, but account rewards could not be verified. Try another game when the connection returns.' };
  }
}

const ARCADE_GAMES_AWARD: Record<ArcadeGameId, number> = {
  artillery: 30,
  patience: 35,
  sweep: 20,
  relay: 20,
  match: 15,
};
