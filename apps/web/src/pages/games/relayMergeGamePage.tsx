// Tier: immersive. Relay Merge is active slide-and-merge play inside the Arcade shell.
import * as React from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Undo2 } from 'lucide-react';
import { applyRelayMove, createRelayState, RELAY_TARGET, type RelayDirection, type RelayState } from '@xalians/rules/arcade';

import { arcadeGame } from '@/arcade/catalog';
import { arcadeSessionId, completeArcadeGame, dailyArcadeSeed, practiceArcadeSeed, recordArcadeResult } from '@/arcade/progress';
import { ArcadeGameShell } from '@/components/arcade/ArcadeGameShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const GAME = arcadeGame('relay')!;
const ELEMENTS = ['electric', 'air', 'fire', 'water', 'ice', 'plant', 'rock', 'light'] as const;

function elementFor(value: number) {
  if (!value) return '';
  return `el-${ELEMENTS[Math.min(ELEMENTS.length - 1, Math.max(0, Math.log2(value) - 1))]}`;
}

export default function RelayMergeGamePage() {
  const [seed, setSeed] = React.useState(() => dailyArcadeSeed('relay'));
  const [state, setState] = React.useState<RelayState>(() => createRelayState(seed));
  const [undo, setUndo] = React.useState<RelayState | null>(null);
  const [status, setStatus] = React.useState(`Combine matching cells to reach ${RELAY_TARGET}.`);
  const startedAt = React.useRef(performance.now());
  const recorded = React.useRef(false);
  const pointerStart = React.useRef<{ x: number; y: number } | null>(null);
  const actions = React.useRef<RelayDirection[]>([]);
  const sessionId = React.useRef(arcadeSessionId());

  const reset = React.useCallback(() => {
    const nextSeed = practiceArcadeSeed('relay');
    setSeed(nextSeed);
    setState(createRelayState(nextSeed));
    setUndo(null);
    setStatus(`New relay ready. Reach ${RELAY_TARGET}.`);
    startedAt.current = performance.now();
    recorded.current = false;
    actions.current = [];
    sessionId.current = arcadeSessionId();
  }, []);

  const move = React.useCallback((direction: RelayDirection) => {
    setState((current) => {
      const result = applyRelayMove(current, direction);
      if (!result.changed) {
        setStatus('That direction does not move a signal cell.');
        return current;
      }
      setUndo(current);
      actions.current.push(direction);
      setStatus(`Moved ${direction}. Score ${result.state.score}.`);
      return result.state;
    });
  }, []);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const map: Partial<Record<string, RelayDirection>> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
      const direction = map[event.key];
      if (direction) { event.preventDefault(); move(direction); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [move]);

  React.useEffect(() => {
    if (state.phase === 'playing' || recorded.current) return;
    recorded.current = true;
    const won = state.phase === 'won';
    const timeMs = performance.now() - startedAt.current;
    if (won) {
      setStatus(`Relay stabilized at ${RELAY_TARGET}. Verifying the move log…`);
      void completeArcadeGame('relay', { gameId: 'relay', sessionId: sessionId.current, seed, actions: actions.current }, { score: state.score, timeMs })
        .then((reward) => setStatus(`Relay stabilized at ${RELAY_TARGET}. ${reward.message}`));
    } else {
      recordArcadeResult('relay', false, 0, { score: state.score, timeMs });
      setStatus('No moves remain. Start a new relay to try again.');
    }
  }, [seed, state.phase, state.score]);

  const finishSwipe = (event: React.PointerEvent) => {
    if (!pointerStart.current) return;
    const dx = event.clientX - pointerStart.current.x;
    const dy = event.clientY - pointerStart.current.y;
    pointerStart.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };

  return (
    <ArcadeGameShell game={GAME} status={status} onNewGame={reset} aside={<Badge variant={state.phase === 'won' ? 'ok' : state.phase === 'lost' ? 'danger' : 'info'}>Score {state.score}</Badge>}>
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5">
        <div
          className="grid aspect-square w-full touch-none grid-cols-4 gap-2 border border-edge bg-s0 p-2 sm:gap-3 sm:p-3"
          aria-label="Relay Merge board"
          onPointerDown={(event) => { pointerStart.current = { x: event.clientX, y: event.clientY }; }}
          onPointerUp={finishSwipe}
        >
          {state.board.map((value, index) => (
            <div
              key={`${seed}:${index}`}
              className={cn(
                'flex aspect-square items-center justify-center border border-edge font-data text-heading',
                value ? `${elementFor(value)} bg-el text-black` : 'bg-s1 text-ink-4'
              )}
              aria-label={value ? `Signal strength ${value}` : 'Empty cell'}
            >
              {value || ''}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2" aria-label="Move controls">
          <span />
          <Button variant="secondary" size="icon" aria-label="Move up" disabled={state.phase !== 'playing'} onClick={() => move('up')}><ArrowUp /></Button>
          <span />
          <Button variant="secondary" size="icon" aria-label="Move left" disabled={state.phase !== 'playing'} onClick={() => move('left')}><ArrowLeft /></Button>
          <Button variant="secondary" size="icon" aria-label="Move down" disabled={state.phase !== 'playing'} onClick={() => move('down')}><ArrowDown /></Button>
          <Button variant="secondary" size="icon" aria-label="Move right" disabled={state.phase !== 'playing'} onClick={() => move('right')}><ArrowRight /></Button>
        </div>
        <Button
          variant="ghost"
          disabled={!undo || state.phase !== 'playing'}
          onClick={() => { if (undo) { setState(undo); setUndo(null); actions.current.pop(); setStatus('Last move undone.'); } }}
        >
          <Undo2 className="size-4" aria-hidden /> Undo
        </Button>
        <p className="m-0 max-w-[62ch] text-center font-body text-small text-ink-2">Use arrow keys, swipe the board, or press the direction controls. Equal cells merge once per move.</p>
      </div>
    </ArcadeGameShell>
  );
}
