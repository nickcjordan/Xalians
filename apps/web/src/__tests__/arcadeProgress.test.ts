import { beforeEach, describe, expect, it } from 'vitest';
import { ARCADE_DAILY_CAP, arcadeCreditsRemaining, emptyArcadeProgress, loadArcadeProgress, recordArcadeResult, saveArcadeProgress, syncArcadeProgressFromAttributes, utcDay } from '../arcade/progress';

describe('Arcade progress', () => {
  beforeEach(() => localStorage.clear());

  it('caps daily guest earnings and converts each full credit meter', () => {
    recordArcadeResult('match', true, 90);
    const progress = recordArcadeResult('artillery', true, 30);
    expect(progress.earnedToday).toBe(100);
    expect(progress.credits).toBe(0);
    expect(progress.records.match?.wins).toBe(1);
    expect(progress.records.artillery?.wins).toBe(1);
  });

  it('resets the daily cap without discarding records or carried credits', () => {
    const previous = { ...emptyArcadeProgress('2026-09-12'), credits: 45, earnedToday: 100, records: { match: { played: 2, wins: 1 } } };
    saveArcadeProgress(previous);
    const progress = loadArcadeProgress();
    expect(progress.day).toBe(utcDay());
    expect(progress.earnedToday).toBe(0);
    expect(progress.credits).toBe(45);
    expect(progress.records.match?.played).toBe(2);
  });

  it('replaces guest counters with authoritative account counters', () => {
    recordArcadeResult('match', true, 15);
    const synced = syncArcadeProgressFromAttributes({ arcadeDay: utcDay(), arcadeCredits: 5, arcadeEarnedToday: 55 });
    expect(synced.credits).toBe(5);
    expect(synced.earnedToday).toBe(55);
  });

  it('reports the full daily cap remaining at zero progress', () => {
    expect(arcadeCreditsRemaining(0)).toBe(ARCADE_DAILY_CAP);
  });

  it('reports the partial remainder mid progress', () => {
    expect(arcadeCreditsRemaining(35)).toBe(ARCADE_DAILY_CAP - 35);
  });

  it('reports zero remaining once earnings reach the cap', () => {
    expect(arcadeCreditsRemaining(ARCADE_DAILY_CAP)).toBe(0);
  });

  it('never reports a negative remainder past the cap', () => {
    expect(arcadeCreditsRemaining(ARCADE_DAILY_CAP + 20)).toBe(0);
  });
});
