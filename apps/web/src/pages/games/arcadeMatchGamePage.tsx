// Tier: immersive. Xalian Match is active memory play inside the Arcade shell.
import * as React from 'react';
import species from '@xalians/content/species.json';
import { createMemoryState, shuffleSeeded } from '@xalians/rules/arcade';

import XalianImage from '@/components/xalianImage';
import { arcadeGame } from '@/arcade/catalog';
import { arcadeSessionId, completeArcadeGame, dailyArcadeSeed, practiceArcadeSeed } from '@/arcade/progress';
import { ArcadeGameShell } from '@/components/arcade/ArcadeGameShell';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const GAME = arcadeGame('match')!;
type MatchCard = { id: string; speciesIndex: number; matched: boolean };

function deal(seed: string): MatchCard[] {
  const picks = shuffleSeeded(species.map((_, index) => index), `${seed}:species`).slice(0, 6);
  return createMemoryState(seed).deck.map((pair, index) => ({
    id: `${index}`,
    speciesIndex: picks[pair],
    matched: false,
  }));
}

export default function ArcadeMatchGamePage() {
  const [seed, setSeed] = React.useState(() => dailyArcadeSeed('match'));
  const [cards, setCards] = React.useState<MatchCard[]>(() => deal(seed));
  const [open, setOpen] = React.useState<number[]>([]);
  const [attempts, setAttempts] = React.useState(0);
  const [locked, setLocked] = React.useState(false);
  const [status, setStatus] = React.useState('Reveal two cards and find every matching species.');
  const startedAt = React.useRef(performance.now());
  const recorded = React.useRef(false);
  const timer = React.useRef<number | null>(null);
  const actions = React.useRef<number[]>([]);
  const sessionId = React.useRef(arcadeSessionId());

  React.useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const reset = React.useCallback(() => {
    const nextSeed = practiceArcadeSeed('match');
    setSeed(nextSeed); setCards(deal(nextSeed)); setOpen([]); setAttempts(0); setLocked(false);
    setStatus('New set ready. Reveal two cards.');
    startedAt.current = performance.now(); recorded.current = false;
    actions.current = []; sessionId.current = arcadeSessionId();
  }, []);

  const reveal = (index: number) => {
    if (locked || open.includes(index) || cards[index].matched) return;
    actions.current.push(index);
    if (!open.length) { setOpen([index]); setStatus(`${species[cards[index].speciesIndex].name} revealed. Find its match.`); return; }
    const first = open[0];
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setOpen([first, index]);
    if (cards[first].speciesIndex === cards[index].speciesIndex) {
      const nextCards = cards.map((card, cardIndex) => cardIndex === first || cardIndex === index ? { ...card, matched: true } : card);
      setCards(nextCards); setOpen([]);
      const finished = nextCards.every((card) => card.matched);
      if (finished && !recorded.current) {
        recorded.current = true;
        const score = Math.max(0, 1000 - nextAttempts * 25);
        const timeMs = performance.now() - startedAt.current;
        setStatus(`All species matched in ${nextAttempts} attempts. Verifying the match…`);
        void completeArcadeGame('match', { gameId: 'match', sessionId: sessionId.current, seed, actions: actions.current }, { score, timeMs })
          .then((reward) => setStatus(`All species matched in ${nextAttempts} attempts. ${reward.message}`));
      } else setStatus('Match found.');
      return;
    }
    setLocked(true); setStatus('No match. The cards will turn back over.');
    timer.current = window.setTimeout(() => { setOpen([]); setLocked(false); }, window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 50 : 700);
  };

  const matchedPairs = cards.filter((card) => card.matched).length / 2;
  return (
    <ArcadeGameShell game={GAME} status={status} onNewGame={reset} aside={<Badge variant={matchedPairs === 6 ? 'ok' : 'info'}>{matchedPairs}/6 pairs</Badge>}>
      <div className="mx-auto grid max-w-2xl grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3" aria-label="Memory card grid">
        {cards.map((card, index) => {
          const visible = open.includes(index) || card.matched;
          const specimen = species[card.speciesIndex];
          return (
            <button
              key={`${seed}:${card.id}`}
              type="button"
              disabled={locked || card.matched}
              aria-label={visible ? `${specimen.name}${card.matched ? ', matched' : ''}` : `Hidden card ${index + 1}`}
              onClick={() => reveal(index)}
              className={cn(
                'relative aspect-square min-h-11 border border-edge-strong bg-s1 p-2 shadow-[var(--thickness-tile)_var(--thickness-tile)_0_var(--color-ink-4)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-100',
                !card.matched && 'hover:bg-s2 active:translate-x-[var(--thickness-tile)] active:translate-y-[var(--thickness-tile)] active:shadow-none',
                card.matched && 'border-viable-lo bg-viable-tint'
              )}
            >
              {visible ? (
                <span className="flex h-full flex-col items-center justify-center gap-1">
                  <XalianImage variant="token" speciesName={specimen.name} primaryType={specimen.type} colored moreClasses="h-full w-full" />
                  <span className="type-legend">{specimen.name}</span>
                </span>
              ) : <span className="font-brand text-heading text-ink-3">X</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-5 text-center font-body text-small text-ink-2">{attempts} attempts</p>
    </ArcadeGameShell>
  );
}
