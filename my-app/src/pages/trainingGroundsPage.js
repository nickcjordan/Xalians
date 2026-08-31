import React from 'react';
import XalianNavbar from '../components/navbar';
import MatchCardGamePage from './games/matchCardGamePage';
import PhysicsGamePage from './games/physicsGamePage';
import GameContainer from '../components/games/elements/gameContainer';

class TrainingGroundsPage extends React.Component {

    state = {
        games: [],
        selectedGameIndex: 0,
        selectedGame: null
    }

    componentDidMount() {
        this.buildGamesList()
    }

    buildGamesList = () => {
        let list = [
            { name: 'Xalian Match', element: <MatchCardGamePage key="match" /> },
            { name: 'Physics', element: <PhysicsGamePage key="physics" /> },
        ];

        this.setState({ games: list, selectedGame: list[0].element });
    }

    selectGame = (index) => {
        this.setState({ selectedGameIndex: index, selectedGame: this.state.games[index].element });
    }

    render() {

        return <React.Fragment>

            <div className="g-console">
                <XalianNavbar></XalianNavbar>

                <div className="g-shell page-shell training-shell">
                    <header className="page-header">
                        <p className="g-kicker">Simulation Deck</p>
                        <h1 className="g-title">Training Grounds</h1>
                        <p className="training-grounds-subtitle">Warm-up games while you wait for a duel.</p>
                    </header>

                    {/* was a single unlabelled bootstrap-blue "switch" button that
                        cycled games without saying which one you were on */}
                    <div className="training-game-switcher">
                        <div className="g-segmented" role="group" aria-label="Training game">
                            {this.state.games.map((game, index) => (
                                <button
                                    type="button"
                                    className="g-segment"
                                    key={game.name}
                                    onClick={() => this.selectGame(index)}
                                    aria-pressed={this.state.selectedGameIndex === index}
                                >
                                    {game.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <GameContainer>
                        {this.state.selectedGame}
                    </GameContainer>
                </div>

            </div>
        </React.Fragment>


    }

}


export default TrainingGroundsPage;