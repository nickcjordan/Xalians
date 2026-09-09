// Tier: chrome. A lobby of short warm-up games, not a game itself.
import React from 'react';
import XalianNavbar from '../components/navbar';
import MatchCardGamePage from './games/matchCardGamePage';
import PhysicsGamePage from './games/physicsGamePage';
import GameContainer from '../components/games/elements/gameContainer';

const GAMES = [
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

class TrainingGroundsPage extends React.Component {

    state = {
        selectedGameIndex: 0
    }

    selectGame = (index) => {
        this.setState({ selectedGameIndex: index });
    }

    render() {
        let selectedGame = GAMES[this.state.selectedGameIndex];

        return (
            <main className="g-page" data-tier="chrome">
                <XalianNavbar />

                <div className="g-shell">
                    <header className="g-masthead">
                        <div className="g-masthead-heading">
                            <p className="g-kicker">Training</p>
                            <h1 className="g-title">Training grounds</h1>
                            <p className="g-body-v4">Short games to learn the pieces before the arena.</p>
                        </div>
                    </header>

                    <div className="lobbies-training-grid">
                        {GAMES.map((game, index) => {
                            const selected = this.state.selectedGameIndex === index;
                            return (
                                <button
                                    type="button"
                                    key={game.name}
                                    className={`g-card-link lobbies-training-tile${selected ? ' on' : ''}`}
                                    aria-pressed={selected}
                                    onClick={() => this.selectGame(index)}>
                                    <span className="g-h3 lobbies-training-name">{game.name}</span>
                                    <p className="g-small-v4 lobbies-training-desc">{game.description}</p>
                                    {selected &&
                                        <span className="g-badge g-badge--info lobbies-training-badge">Selected</span>
                                    }
                                </button>
                            );
                        })}
                    </div>

                    <GameContainer>
                        {selectedGame.element}
                    </GameContainer>
                </div>
            </main>
        );
    }
}

export default TrainingGroundsPage;
