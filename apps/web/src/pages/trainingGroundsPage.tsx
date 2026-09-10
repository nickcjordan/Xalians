// Tier: chrome. A lobby of short warm-up games, not a game itself.
import * as React from 'react';

import XalianNavbar from '@/components/navbar';
import MatchCardGamePage from './games/matchCardGamePage';
import PhysicsGamePage from './games/physicsGamePage';
import GameContainer from '@/components/games/elements/gameContainer';
import { Shell, Masthead } from '@/components/system/masthead';
import { cardVariants } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Game = {
    name: string;
    description: string;
    element: React.ReactNode;
};

const GAMES: Game[] = [
    {
        name: 'Xalian Match',
        description: 'Flip cards and match each silhouette to its species before you run out of turns.',
        element: <MatchCardGamePage key="match" />
    },
    {
        name: 'Physics',
        description: 'Dial in an angle and power to launch a shot at the target.',
        element: <PhysicsGamePage key="physics" />
    }
];

type TrainingGroundsPageState = {
    selectedGameIndex: number;
};

class TrainingGroundsPage extends React.Component<{}, TrainingGroundsPageState> {

    state: TrainingGroundsPageState = {
        selectedGameIndex: 0
    }

    selectGame = (index: number) => {
        this.setState({ selectedGameIndex: index });
    }

    render() {
        let selectedGame = GAMES[this.state.selectedGameIndex];

        return (
            <main className="pb-16" data-tier="chrome">
                <XalianNavbar />

                <Shell>
                    <Masthead
                        kicker="Training"
                        title="Training grounds"
                        subtitle="Short games to learn the pieces before the arena."
                    />

                    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                        {GAMES.map((game, index) => {
                            const selected = this.state.selectedGameIndex === index;
                            return (
                                <button
                                    type="button"
                                    key={game.name}
                                    aria-pressed={selected}
                                    onClick={() => this.selectGame(index)}
                                    className={cn(
                                        cardVariants({ variant: 'link' }),
                                        'w-full items-start gap-2 text-left p-4',
                                        selected && 'border-viable-lo'
                                    )}>
                                    <span className="type-subhead">{game.name}</span>
                                    <p className="m-0 font-body text-small text-ink-2">{game.description}</p>
                                    {selected &&
                                        <Badge className="mt-1">Selected</Badge>
                                    }
                                </button>
                            );
                        })}
                    </div>

                    <GameContainer>
                        {selectedGame.element}
                    </GameContainer>
                </Shell>
            </main>
        );
    }
}

export default TrainingGroundsPage;
