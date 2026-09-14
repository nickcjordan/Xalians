// Tier: immersive. Archive Patience is active Klondike play inside the Arcade shell.
import * as React from 'react';
import { Lightbulb, RotateCcw, Undo2, Wand2 } from 'lucide-react';
import {
  CARD_SUITS,
  applySolitaireAction,
  canMoveSolitaire,
  createSolitaireState,
  findSolitaireHint,
  type CardSuit,
  type SolitaireAction,
  type SolitaireCard,
  type SolitaireSource,
  type SolitaireState,
  type SolitaireTarget,
} from '@xalians/rules/arcade';

import { arcadeGame } from '@/arcade/catalog';
import { arcadeSessionId, completeArcadeGame, dailyArcadeSeed, practiceArcadeSeed } from '@/arcade/progress';
import { ArcadeGameShell } from '@/components/arcade/ArcadeGameShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const GAME = arcadeGame('patience')!;
const SAVE_KEY = 'xalians.arcade.patience.v1';
const SUIT_META: Record<CardSuit, { mark: string; label: string; element: string }> = {
  ember: { mark: 'E', label: 'Ember', element: 'fire' },
  tide: { mark: 'T', label: 'Tide', element: 'water' },
  stone: { mark: 'S', label: 'Stone', element: 'rock' },
  signal: { mark: 'G', label: 'Signal', element: 'electric' },
};

const rankLabel = (rank: number) => rank === 1 ? 'A' : rank === 11 ? 'J' : rank === 12 ? 'Q' : rank === 13 ? 'K' : String(rank);
const sourceKey = (source: SolitaireSource | null) => source ? JSON.stringify(source) : '';

type SavedPatience = { state: SolitaireState; actions: SolitaireAction[]; sessionId: string };

function loadSavedState(): SavedPatience | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null') as SavedPatience | null;
    return parsed?.state?.seed && parsed.state.phase === 'playing' && Array.isArray(parsed.actions) && parsed.sessionId ? parsed : null;
  } catch { return null; }
}

function CardFace({ card, source, selected, offset, onSelect, onAuto, onDrag }: {
  card: SolitaireCard;
  source: SolitaireSource;
  selected: boolean;
  offset?: boolean;
  onSelect: () => void;
  onAuto: () => void;
  onDrag: (source: SolitaireSource) => void;
}) {
  const meta = SUIT_META[card.suit];
  return (
    <button
      type="button"
      draggable={card.faceUp}
      aria-label={card.faceUp ? `${rankLabel(card.rank)} of ${meta.label}` : 'Face-down card'}
      aria-pressed={selected}
      onClick={onSelect}
      onDoubleClick={onAuto}
      onDragStart={() => onDrag(source)}
      className={cn(
        'relative flex h-28 w-20 shrink-0 flex-col justify-between border p-2 text-left focus-visible:z-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        offset && (card.faceUp ? '-mt-16' : '-mt-20'),
        card.faceUp ? `el-${meta.element} border-edge-strong bg-s2 text-ink` : 'border-edge-strong bg-s1 text-ink-3',
        selected && 'z-20 border-viable-hi bg-viable-tint'
      )}
    >
      {card.faceUp ? <React.Fragment><span className="type-data">{rankLabel(card.rank)}</span><span className="self-end type-heading text-el">{meta.mark}</span></React.Fragment> : <span className="m-auto font-brand text-heading">X</span>}
    </button>
  );
}

export default function SolitaireGamePage() {
  const saved = React.useMemo(loadSavedState, []);
  const [drawCount, setDrawCount] = React.useState<1 | 3>(saved?.state.drawCount ?? 1);
  const [seed, setSeed] = React.useState(saved?.state.seed ?? dailyArcadeSeed('patience'));
  const [state, setState] = React.useState<SolitaireState>(saved?.state ?? createSolitaireState(seed, drawCount));
  const [history, setHistory] = React.useState<SolitaireState[]>([]);
  const [selected, setSelected] = React.useState<SolitaireSource | null>(null);
  const [dragged, setDragged] = React.useState<SolitaireSource | null>(null);
  const [status, setStatus] = React.useState(saved ? 'Saved deal resumed.' : 'Build each suited archive from ace to king.');
  const startedAt = React.useRef(performance.now());
  const recorded = React.useRef(false);
  const actions = React.useRef<SolitaireAction[]>(saved?.actions ?? []);
  const actionCheckpoints = React.useRef<number[]>([]);
  const sessionId = React.useRef(saved?.sessionId ?? arcadeSessionId());

  React.useEffect(() => {
    if (state.phase === 'playing') localStorage.setItem(SAVE_KEY, JSON.stringify({ state, actions: actions.current, sessionId: sessionId.current }));
    else localStorage.removeItem(SAVE_KEY);
  }, [state]);

  React.useEffect(() => {
    if (state.phase !== 'won' || recorded.current) return;
    recorded.current = true;
    const score = Math.max(0, 2000 - state.moves * 5);
    const timeMs = performance.now() - startedAt.current;
    setStatus('All four archives complete. Verifying the deal…');
    void completeArcadeGame('patience', { gameId: 'patience', sessionId: sessionId.current, seed, drawCount, actions: actions.current }, { score, timeMs })
      .then((reward) => setStatus(`All four archives complete. ${reward.message}`));
  }, [drawCount, seed, state.moves, state.phase]);

  const reset = React.useCallback((nextDrawCount = drawCount) => {
    const nextSeed = practiceArcadeSeed('patience');
    const next = createSolitaireState(nextSeed, nextDrawCount);
    setDrawCount(nextDrawCount);
    setSeed(nextSeed);
    setState(next);
    setHistory([]);
    setSelected(null);
    setStatus('New deal ready. Build each suited archive from ace to king.');
    startedAt.current = performance.now();
    recorded.current = false;
    actions.current = [];
    actionCheckpoints.current = [];
    sessionId.current = arcadeSessionId();
  }, [drawCount]);

  const commit = (action: SolitaireAction, successMessage = 'Card moved.') => {
    const next = applySolitaireAction(state, action);
    if (next === state) { setStatus('That card cannot move there.'); return false; }
    setHistory((current) => [...current.slice(-49), state]);
    actionCheckpoints.current.push(actions.current.length);
    actions.current.push(action);
    setState(next);
    setSelected(null);
    setStatus(successMessage);
    return true;
  };

  const autoFoundation = (source: SolitaireSource) => {
    let card: SolitaireCard | undefined;
    if (source.zone === 'waste') card = state.waste.at(-1);
    else if (source.zone === 'foundation') card = state.foundations[source.suit].at(-1);
    else card = state.tableau[source.column][source.index];
    if (card) commit({ type: 'move', source, target: { zone: 'foundation', suit: card.suit } }, 'Card filed in its archive.');
  };

  const chooseSource = (source: SolitaireSource) => {
    if (sourceKey(selected) === sourceKey(source)) { setSelected(null); setStatus('Selection cleared.'); return; }
    setSelected(source);
    setStatus('Card selected. Choose a column or suited archive.');
  };

  const dropOn = (target: SolitaireTarget) => {
    const source = dragged ?? selected;
    setDragged(null);
    if (source) commit({ type: 'move', source, target });
  };

  const hint = () => {
    const found = findSolitaireHint(state);
    if (!found) { setStatus(state.stock.length || state.waste.length ? 'Draw another card; no board move is available.' : 'No legal move is available in this deal.'); return; }
    setSelected(found.source);
    setStatus(found.target.zone === 'foundation' ? 'Hint: the selected card can enter its suited archive.' : `Hint: the selected card can move to column ${found.target.column + 1}.`);
  };

  const autocomplete = () => {
    let next = state;
    let count = 0;
    const completedActions: SolitaireAction[] = [];
    while (count < 52) {
      const found = findSolitaireHint(next);
      if (!found || found.target.zone !== 'foundation') break;
      const action: SolitaireAction = { type: 'move', ...found };
      const applied = applySolitaireAction(next, action);
      if (applied === next) break;
      next = applied;
      completedActions.push(action);
      count += 1;
    }
    if (!count) { setStatus('No safe archive moves are available.'); return; }
    setHistory((current) => [...current.slice(-49), state]);
    actionCheckpoints.current.push(actions.current.length);
    actions.current.push(...completedActions);
    setState(next);
    setSelected(null);
    setStatus(`${count} safe archive move${count === 1 ? '' : 's'} completed.`);
  };

  const pileTargetProps = (target: SolitaireTarget) => ({
    onDragOver: (event: React.DragEvent) => event.preventDefault(),
    onDrop: (event: React.DragEvent) => { event.preventDefault(); dropOn(target); },
  });

  return (
    <ArcadeGameShell game={GAME} status={status} onNewGame={() => reset()} aside={<Badge variant={state.phase === 'won' ? 'ok' : 'info'}>{state.moves} moves</Badge>}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="type-legend mr-1">Deal</span>
        <Button size="sm" variant={drawCount === 1 ? 'outline' : 'ghost'} onClick={() => reset(1)}>Draw one</Button>
        <Button size="sm" variant={drawCount === 3 ? 'outline' : 'ghost'} onClick={() => reset(3)}>Draw three</Button>
        <Button size="sm" variant="ghost" disabled={!history.length} onClick={() => {
          const previous = history.at(-1);
          if (!previous) return;
          const checkpoint = actionCheckpoints.current.pop();
          if (checkpoint !== undefined) actions.current = actions.current.slice(0, checkpoint);
          setState(previous); setHistory((current) => current.slice(0, -1)); setSelected(null); setStatus('Last move undone.');
        }}><Undo2 className="size-4" aria-hidden /> Undo</Button>
        <Button size="sm" variant="ghost" onClick={hint}><Lightbulb className="size-4" aria-hidden /> Hint</Button>
        <Button size="sm" variant="ghost" onClick={autocomplete}><Wand2 className="size-4" aria-hidden /> File safe cards</Button>
      </div>

      <div className="overflow-x-auto border border-edge bg-glass p-4">
        <div className="mx-auto min-w-[720px] max-w-[920px]">
          <div className="mb-8 grid grid-cols-7 gap-5">
            <button type="button" onClick={() => commit({ type: 'draw' }, state.stock.length ? 'Cards drawn.' : 'Waste returned to the stock.')} className="flex h-28 w-20 items-center justify-center border border-edge-strong bg-s1 font-brand text-heading shadow-[var(--thickness-key)_var(--thickness-key)_0_var(--color-ink-4)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" aria-label={state.stock.length ? `Draw from stock, ${state.stock.length} cards remain` : 'Return waste to stock'}>
              {state.stock.length ? <span className="font-brand text-heading">X</span> : <RotateCcw className="size-5" aria-hidden />}
            </button>
            <div className="h-28 w-20 border border-edge bg-s0">
              {state.waste.at(-1) && <CardFace card={state.waste.at(-1)!} source={{ zone: 'waste' }} selected={sourceKey(selected) === sourceKey({ zone: 'waste' })} onSelect={() => chooseSource({ zone: 'waste' })} onAuto={() => autoFoundation({ zone: 'waste' })} onDrag={setDragged} />}
            </div>
            <span />
            {CARD_SUITS.map((suit) => {
              const card = state.foundations[suit].at(-1);
              const target: SolitaireTarget = { zone: 'foundation', suit };
              return (
                <div key={suit} {...pileTargetProps(target)} onClick={() => selected ? dropOn(target) : card && chooseSource({ zone: 'foundation', suit })} className={`el-${SUIT_META[suit].element} flex h-28 w-20 items-center justify-center border border-edge-strong bg-s0`} aria-label={`${SUIT_META[suit].label} archive`}>
                  {card ? <CardFace card={card} source={{ zone: 'foundation', suit }} selected={sourceKey(selected) === sourceKey({ zone: 'foundation', suit })} onSelect={() => chooseSource({ zone: 'foundation', suit })} onAuto={() => {}} onDrag={setDragged} /> : <span className="type-heading text-el">{SUIT_META[suit].mark}</span>}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-7 gap-5">
            {state.tableau.map((column, columnIndex) => {
              const target: SolitaireTarget = { zone: 'tableau', column: columnIndex };
              return (
                <div key={columnIndex} {...pileTargetProps(target)} onClick={() => { if (!column.length && selected) dropOn(target); }} className="min-h-[480px] border-t border-edge bg-s0/30 p-1" aria-label={`Tableau column ${columnIndex + 1}`}>
                  {column.map((card, index) => {
                    const source: SolitaireSource = { zone: 'tableau', column: columnIndex, index };
                    return <CardFace key={card.id} card={card} source={source} selected={sourceKey(selected) === sourceKey(source)} offset={index > 0} onSelect={() => card.faceUp ? chooseSource(source) : undefined} onAuto={() => card.faceUp ? autoFoundation(source) : undefined} onDrag={setDragged} />;
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ArcadeGameShell>
  );
}
