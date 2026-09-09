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
                        {GAMES.map((game, index) => (
                            <button
                                type="button"
                                key={game.name}
                                className={`g-panel g-card-link lobbies-training-tile${this.state.selectedGameIndex === index ? ' on' : ''}`}
                                aria-pressed={this.state.selectedGameIndex === index}
                                onClick={() => this.selectGame(index)}>
                                <span className="g-legend-v4">{game.name}</span>
                                <p className="g-small-v4">{game.description}</p>
                                {index === 0 &&
                                    <span className="g-btn g-btn--primary lobbies-training-play">Play</span>
                                }
                            </button>
                        ))}
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
