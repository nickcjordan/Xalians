// Tier: immersive. Active play has a compact status bar and a persistent route back out.
import * as React from 'react';
import { Link } from 'react-router';
import { ArrowLeft, RotateCcw } from 'lucide-react';

import type { ArcadeGameDefinition } from '@/arcade/catalog';
import { ARCADE_DAILY_CAP, loadArcadeProgress } from '@/arcade/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LiveRegion, SkipLink } from '@/components/system/a11y';

type ArcadeGameShellProps = {
  game: ArcadeGameDefinition;
  status: string;
  onNewGame: () => void;
  children: React.ReactNode;
  aside?: React.ReactNode;
};

export function ArcadeGameShell({ game, status, onNewGame, children, aside }: ArcadeGameShellProps) {
  const progress = loadArcadeProgress();
  return (
    <main id="main" data-tier="immersive" className="min-h-screen bg-room font-body text-ink">
      <SkipLink />
      <header className="border-b border-edge bg-s0">
        <div className="mx-auto flex min-h-16 w-full max-w-[1440px] flex-wrap items-center gap-3 px-4 py-2 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link to="/arcade"><ArrowLeft className="size-4" aria-hidden /> Arcade</Link>
            </Button>
            <div className="min-w-0 flex-1">
              <p className="type-legend m-0">{game.rulesName}</p>
              <h1 className="type-subhead m-0 truncate">{game.name}</h1>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
            <Badge variant="info">{progress.earnedToday}/{ARCADE_DAILY_CAP} credits today</Badge>
            {aside}
            <Button type="button" variant="secondary" size="sm" onClick={onNewGame}>
              <RotateCcw className="size-4" aria-hidden /> New game
            </Button>
          </div>
        </div>
      </header>
      <LiveRegion>{status}</LiveRegion>
      <div className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6 sm:py-6">
        {children}
      </div>
    </main>
  );
}
