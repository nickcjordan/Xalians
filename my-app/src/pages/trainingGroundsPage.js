import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import XalianNavbar from '../components/navbar';
import ListGroup from 'react-bootstrap/ListGroup';
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

            <Container fluid className="content-background-container">
                <XalianNavbar></XalianNavbar>

                    <Row className="">
                        <Col style={{ textAlign: 'center' }} >
                            <h1 className="page-title-text">Training Grounds</h1>
                            <p className="training-grounds-subtitle">Warm-up games while you wait for a duel.</p>

                            {/* was a single unlabelled bootstrap-blue "switch" button that
                                cycled games without saying which one you were on */}
                            <div className="training-game-switcher">
                                {this.state.games.map((game, index) => (
                                    <Button
                                        key={game.name}
                                        variant={this.state.selectedGameIndex === index ? 'xalianGreen' : 'xalianGray'}
                                        onClick={() => this.selectGame(index)}
                                        aria-pressed={this.state.selectedGameIndex === index}
                                    >
                                        {game.name}
                                    </Button>
                                ))}
                            </div>

                            <GameContainer>
                                {this.state.selectedGame}
                            </GameContainer>
                        </Col>
                    </Row>

            </Container>
        </React.Fragment>


    }

}


export default TrainingGroundsPage;