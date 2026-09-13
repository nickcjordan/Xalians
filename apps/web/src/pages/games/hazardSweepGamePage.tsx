// Tier: immersive. Hazard Sweep is active Minesweeper play inside the Arcade shell.
import * as React from 'react';
import { Flag, TriangleAlert } from 'lucide-react';
import { applySweepAction, createSweepState, type SweepAction, type SweepState } from '@xalians/rules/arcade';

import { arcadeGame } from '@/arcade/catalog';
import { arcadeSessionId, completeArcadeGame, dailyArcadeSeed, practiceArcadeSeed, recordArcadeResult } from '@/arcade/progress';
import { ArcadeGameShell } from '@/components/arcade/ArcadeGameShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const GAME = arcadeGame('sweep')!;
const LEVELS = {
  survey: { label: 'Survey', width: 9, height: 9, mines: 10 },
  field: { label: 'Field', width: 16, height: 16, mines: 40 },
  frontier: { label: 'Frontier', width: 30, height: 16, mines: 99 },
} as const;
type Level = keyof typeof LEVELS;

function elapsedLabel(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function HazardSweepGamePage() {
  const [level, setLevel] = React.useState<Level>('survey');
  const [seed, setSeed] = React.useState(() => dailyArcadeSeed('sweep'));
  const [state, setState] = React.useState<SweepState>(() => createSweepState(seed, 9, 9, 10));
  const [status, setStatus] = React.useState('Reveal a cell. Your first reveal is always safe.');
  const [elapsed, setElapsed] = React.useState(0);
  const startedAt = React.useRef<number | null>(null);
  const recorded = React.useRef(false);
  const actions = React.useRef<SweepAction[]>([]);
  const sessionId = React.useRef(arcadeSessionId());

  const reset = React.useCallback((nextLevel = level) => {
    const config = LEVELS[nextLevel];
    const nextSeed = practiceArcadeSeed('sweep');
    setLevel(nextLevel);
    setSeed(nextSeed);
    setState(createSweepState(nextSeed, config.width, config.height, config.mines));
    setStatus('New field ready. Reveal a cell.');
    setElapsed(0);
    startedAt.current = null;
    recorded.current = false;
    actions.current = [];
    sessionId.current = arcadeSessionId();
  }, [level]);

  React.useEffect(() => {
    if (!state.started || state.phase !== 'playing' || startedAt.current === null) return;
    const timer = window.setInterval(() => setElapsed(performance.now() - (startedAt.current as number)), 250);
    return () => window.clearInterval(timer);
  }, [state.phase, state.started]);

  React.useEffect(() => {
    if (state.phase === 'playing' || recorded.current) return;
    recorded.current = true;
    const timeMs = startedAt.current === null ? 0 : performance.now() - startedAt.current;
    setElapsed(timeMs);
    if (state.phase === 'won') {
      setStatus(`Field cleared in ${elapsedLabel(timeMs)}. Verifying the survey log…`);
      void completeArcadeGame('sweep', { gameId: 'sweep', sessionId: sessionId.current, seed, level, actions: actions.current }, { score: state.revealed, timeMs })
        .then((reward) => setStatus(`Field cleared in ${elapsedLabel(timeMs)}. ${reward.message}`));
    } else {
      recordArcadeResult('sweep', false, 0, { score: state.revealed, timeMs });
      setStatus('A buried hazard was disturbed. Start a new field to try again.');
    }
  }, [level, seed, state.phase, state.revealed]);

  const act = (index: number, type: 'reveal' | 'flag') => {
    if (startedAt.current === null && type === 'reveal') startedAt.current = performance.now();
    const next = applySweepAction(state, { type, index });
    if (next !== state) actions.current.push({ type, index });
    setState(next);
    if (next.phase === 'playing') setStatus(type === 'flag' ? 'Flag updated.' : `${next.revealed} safe cells revealed.`);
  };

  const flags = state.cells.filter((cell) => cell.flagged).length;
  return (
    <ArcadeGameShell game={GAME} status={status} onNewGame={() => reset()} aside={
      <div className="flex gap-1" role="group" aria-label="Field size">
        {(Object.keys(LEVELS) as Level[]).map((key) => (
          <Button key={key} size="sm" variant={level === key ? 'outline' : 'ghost'} onClick={() => reset(key)}>{LEVELS[key].label}</Button>
        ))}
      </div>
    }>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge variant="info"><Flag className="size-3.5" aria-hidden /> {flags}/{state.mines}</Badge>
        <Badge variant={state.phase === 'lost' ? 'danger' : state.phase === 'won' ? 'ok' : 'default'}>{state.phase}</Badge>
        <span className="type-data">{elapsedLabel(elapsed)}</span>
        <p className="m-0 font-body text-small text-ink-2">Click to reveal. Right-click or Shift+Enter to flag.</p>
      </div>
      <div className="overflow-auto border border-edge bg-s0 p-3">
        <div
          role="grid"
          aria-label={`${LEVELS[level].label} hazard field`}
          className="mx-auto grid w-max gap-1"
          style={{ gridTemplateColumns: `repeat(${state.width}, 2.75rem)` }}
        >
          {state.cells.map((cell, index) => {
            const label = cell.revealed
              ? cell.mine ? 'Hazard' : cell.adjacent ? `${cell.adjacent} adjacent hazards` : 'Clear'
              : cell.flagged ? 'Flagged, hidden' : 'Hidden';
            return (
              <button
                key={`${seed}:${index}`}
                type="button"
                role="gridcell"
                aria-label={`Cell ${index + 1}: ${label}`}
                disabled={state.phase !== 'playing' || cell.revealed}
                onClick={() => act(index, 'reveal')}
                onContextMenu={(event) => { event.preventDefault(); act(index, 'flag'); }}
                onKeyDown={(event) => { if (event.key === 'Enter' && event.shiftKey) { event.preventDefault(); act(index, 'flag'); } }}
                className={cn(
                  'flex size-11 items-center justify-center border font-data text-body focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-100',
                  cell.revealed ? 'border-edge bg-s1' : 'border-edge-strong bg-s2 shadow-[var(--thickness-key)_var(--thickness-key)_0_var(--color-ink-4)] hover:bg-s3 active:translate-x-[var(--thickness-key)] active:translate-y-[var(--thickness-key)] active:shadow-none',
                  cell.revealed && cell.mine && 'border-plague bg-plague-tint'
                )}
              >
                {cell.flagged && !cell.revealed ? <Flag className="size-4" aria-hidden /> : null}
                {cell.revealed && cell.mine ? <TriangleAlert className="size-4" aria-hidden /> : null}
                {cell.revealed && !cell.mine && cell.adjacent > 0 ? cell.adjacent : null}
              </button>
            );
          })}
        </div>
      </div>
    </ArcadeGameShell>
  );
}
