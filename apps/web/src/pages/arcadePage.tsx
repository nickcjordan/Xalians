// Tier: chrome. The Arcade catalog is a browsable index; active games are immersive routes.
import * as React from 'react';
import { Link } from 'react-router';
import { Gauge, Trophy } from 'lucide-react';

import XalianNavbar from '@/components/navbar';
import { ARCADE_GAMES } from '@/arcade/catalog';
import { ARCADE_DAILY_CAP, ARCADE_TOKEN_PRICE, loadArcadeProgress, syncArcadeProgressFromAttributes } from '@/arcade/progress';
import { Shell, Masthead, SectionHead } from '@/components/system/masthead';
import { SkipLink } from '@/components/system/a11y';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function ArcadePage() {
  const [progress, setProgress] = React.useState(loadArcadeProgress);

  React.useEffect(() => {
    let active = true;
    Promise.all([import('@/utils/authUtil'), import('@/utils/dbApi')])
      .then(([auth, api]) => auth.currentUser().then((user) => user ? api.callGetUser() : null))
      .then((account) => {
        if (active && account) setProgress(syncArcadeProgressFromAttributes(account.attributes));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);
  return (
    <main id="main" className="min-h-screen bg-room font-body text-ink" data-tier="chrome">
      <SkipLink />
      <XalianNavbar />
      <Shell className="pb-16">
        <Masthead
          kicker="Arcade"
          title="Familiar games, living rewards"
          subtitle="Play the rules you already know and advance your Xalians collection."
          beside={<Badge variant="info">{progress.earnedToday}/{ARCADE_DAILY_CAP} today</Badge>}
        />

        <Card variant="glass" className="mb-8 grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="type-legend m-0">Scrambler charge</p>
            <p className="mt-2 mb-3 font-body text-body text-ink-2">
              Qualifying wins fill one shared daily meter. Every {ARCADE_TOKEN_PRICE} credits converts into a Scrambler Token for signed-in players.
            </p>
            <Progress value={progress.earnedToday} aria-label="Arcade credits earned today" />
          </div>
          <div className="flex items-center gap-3 border-l-0 border-edge md:border-l md:pl-6">
            <Gauge className="size-5" aria-hidden />
            <div><span className="type-data text-heading">{progress.credits}</span><p className="type-legend m-0">Credits to token</p></div>
          </div>
        </Card>

        <SectionHead title="Choose a game"><span className="ml-auto font-body text-small text-ink-2">Daily and practice seeds available</span></SectionHead>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ARCADE_GAMES.map((game) => {
            const record = progress.records[game.id];
            const Icon = game.icon;
            return (
              <Link key={game.id} to={`/arcade/${game.id}`} className="no-underline">
                <Card variant="link" className="h-full p-5">
                  <CardHeader>
                    <div className="flex items-center gap-3"><Icon className="size-5" aria-hidden /><CardTitle>{game.name}</CardTitle></div>
                    <Badge variant="info">{game.duration}</Badge>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-4">
                    <CardDescription>{game.description}</CardDescription>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-edge pt-3">
                      <span className="type-data text-small">+{game.credits} credits</span>
                      <span className="inline-flex items-center gap-1.5 font-body text-small text-ink-2">
                        <Trophy className="size-3.5" aria-hidden /> {record?.wins ?? 0} won
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </Shell>
    </main>
  );
}
