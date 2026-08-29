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
        let list = []
        
        // list.push(<a href="/train/match"> <h1>Xalian Match</h1></a>);
        // list.push(<a href="/train/physics"> <h1>Physics</h1></a>);

        list.push(<MatchCardGamePage/>);
        list.push(<PhysicsGamePage/>);

        this.setState({ games: list, selectedGame: list[0] });
    }

    change = () => {
        let nextIndex = (this.state.selectedGameIndex + 1) % this.state.games.length;
        this.setState({ selectedGameIndex: nextIndex, selectedGame: this.state.games[nextIndex] })
    }

    render() {

        return <React.Fragment>

            <Container fluid className="content-background-container">
                <XalianNavbar></XalianNavbar>

                    <Row className="">
                        <Col style={{ textAlign: 'center' }} >
                            <Button onClick={ this.change }>switch</Button>
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