import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup';
import ToggleButton from 'react-bootstrap/ToggleButton';
import XalianNavbar from '../../components/navbar';
import Form from 'react-bootstrap/Form';
import XalianImage from '../../components/xalianImage';
import MatchGameFlippedCard from '../../components/games/elements/matchGameFlippedCard';

import GameContainer from '../../components/games/elements/gameContainer';
import * as retrievalUtil from '../../utils/retrievalUtil';
import { Client } from 'boardgame.io/react';
import { Duel } from '../../components/games/duel/duel';
import DuelBoard from '../../components/games/duel/board/duelBoard';
import * as translator from '../../utils/valueTranslator';
import * as gameConstants from '../../gameplay/duel/duelGameConstants'
import { Local } from 'boardgame.io/multiplayer';
import DuelBotInstance from '../../components/games/duel/bot/duelBotInstance';
import * as duelConstants from '../../gameplay/duel/duelGameConstants';
import * as duelPieceBuilder from '../../gameplay/duel/duelPieceBuilder';
import gsap from 'gsap';
import DuelPage from './duelPage';

class DuelStartPage extends React.Component {

    state = {
        randomizeStartingPositions: true,
        debugMode: true
    }

    // componentDidUpdate(prevProps, prevState) {
        // if (this.state.players && this.state.numberOfPieces && !this.state.gameDetails ) {
           
        // }
    // }

    setGameDetails = (passedIn = null) => {
        // let details = {
        //     numberOfPieces: this.state.numberOfPieces,
        //     players: this.state.players,
        //     bot: this.state.players == 1 ? true : false,
        //     randomizeStartingPositions: this.state.randomizeStartingPositions,
        //     debugMode: this.state.debugMode
        // };
        let details = {
            numberOfPieces: this.state.numberOfPieces,
            players: 2,
            bot: this.state.players == 1 ? true : false,
            randomizeStartingPositions: this.state.randomizeStartingPositions,
            debugMode: this.state.debugMode
        };
        this.setState({gameDetails: passedIn || details})
    }

    componentDidMount() {
        // DEBUG
        // this.setGameDetails({
        //     numberOfPieces: 6,
        //     players: 2,
        //     bot: true,
        //     randomizeStartingPositions: true
        // });

        // this.setGameDetails({
        //     numberOfPieces: 2,
        //     players: 2,
        //     bot: false,
        //     randomizeStartingPositions: true
        // });
    }


    render() {
        const piecesPerTeamOptions = [
            { name: '2', value: 2 },
            { name: '3', value: 3 },
            { name: '4', value: 4 },
            { name: '5', value: 5 },
            { name: '6', value: 6 },
        ];


        if (this.state.gameDetails) {
            return (
                <DuelPage gameDetails={this.state.gameDetails} />
            );
        } else {
            return (
                <React.Fragment>
                    <Container fluid className="content-background-container">
                        <XalianNavbar></XalianNavbar>


                        {/* <GameContainer> */}
                            <div style={{ display: 'flex', flexDirection: 'column', justifyItems: 'center', maxWidth: '400px', margin: 'auto' }}>

                                <h4 style={{ margin: 'auto', textAlign: 'center', marginTop: '25px', marginBottom: '10px' }}>Players:</h4>
                                <ToggleButtonGroup name='players-button-group' style={{width: 'fit-content', margin: 'auto'}} onChange={(val) => {
                                    this.setState({ players: val })
                                }}> 
                                <ToggleButton key={`players-radio-${0}`} id={`players-radio-${0}`} type="radio" variant='xalianGray' name="radio" style={{ width: 'fit-content', margin: 'auto' }}
                                    value={1}
                                    checked={this.state.players == 1}
                                >
                                    <i class="bi bi-person-fill" style={{ paddingRight: '10px', fontSize: '24pt' }}></i> vs. <i class="bi bi-robot" style={{ paddingLeft: '10px', fontSize: '24pt' }}></i>
                                </ToggleButton>

                                <ToggleButton key={`players-radio-${1}`} id={`players-radio-${1}`} type="radio" variant='xalianGray' name="radio" style={{ width: 'fit-content', margin: 'auto' }}
                                    value={2}
                                    checked={this.state.players == 2}
                                >
                                    <i class="bi bi-person-fill" style={{ paddingRight: '10px', fontSize: '24pt' }}></i> vs. <i class="bi bi-person-fill" style={{ paddingLeft: '10px', fontSize: '24pt' }}></i>
                                </ToggleButton>
                                </ToggleButtonGroup>

                                
                                <h4 style={{ margin: 'auto', textAlign: 'center', marginTop: '50px', marginBottom: '10px'}}>Team Size:</h4>
                                <ToggleButtonGroup style={{ margin: 'auto', textAlign: 'center' }} name='pieces-per-team-button-group' onChange={(val) => {
                                    this.setState({ numberOfPieces: val });
                                }}>
                                    {piecesPerTeamOptions.map((radio, idx) => (
                                        <ToggleButton key={`pieces-per-team-radio-${idx}`} id={`pieces-per-team-radio-${idx}`} type="radio" variant='xalianGray' name="radio" style={{ fontSize: '18pt' }}
                                            value={radio.value}
                                            checked={this.state.numberOfPieces == radio.value}
                                            
                                        >
                                            {radio.name}
                                        </ToggleButton>
                                    ))}
                                </ToggleButtonGroup>

                                <div style={{ height: '100%', display: 'flex', justifyContent: 'space-evenly', alignItems: 'stretch', alignContent: 'center', marginTop: '50px'}}>
                                    <h4 style={{ marginTop: 'auto', marginBottom: 'auto', alignSelf: 'center', textAlign: 'center', width: 'fit-content' }}>Randomize Start Positions:</h4>
                                    <ToggleButtonGroup style={{ textAlign: 'center', width: '35px' }} type='checkbox' onChange={(e) =>
                                                this.setState({ randomizeStartingPositions: !this.state.randomizeStartingPositions })
                                            }>
                                        <ToggleButton key={`randomize-positions-1`} id={`randomize-positions-1`} type="checkbox" name="randomize-checkbox" variant={this.state.randomizeStartingPositions ? 'xalianGreen' : 'xalianGray'} style={{ padding: '0px', margin: 'auto', height: '35px', width: '35px' }}
                                            value={true}
                                            checked={this.state.randomizeStartingPositions}
                                        >{this.state.randomizeStartingPositions && <i class="bi bi-check" style={{ fontSize: '35px', lineHeight: '35px' }} />}</ToggleButton>
                                    </ToggleButtonGroup>

                                </div>

                                <div style={{ height: '100%', display: 'flex', justifyContent: 'space-evenly', alignItems: 'stretch', alignContent: 'center', marginTop: '50px'}}>
                                    <h4 style={{ marginTop: 'auto', marginBottom: 'auto', alignSelf: 'center', textAlign: 'center', width: 'fit-content' }}>Debug Mode:</h4>
                                    <ToggleButtonGroup style={{ textAlign: 'center', width: '35px' }} type='checkbox' onChange={(e) =>
                                                this.setState({ debugMode: !this.state.debugMode })
                                            }>
                                        <ToggleButton key={`debugMode-1`} id={`debugMode-1`} type="checkbox" name="debugMode-checkbox" variant={this.state.debugMode ? 'xalianGreen' : 'xalianGray'} style={{ padding: '0px', margin: 'auto', height: '35px', width: '35px' }}
                                            value={true}
                                            checked={this.state.debugMode}
                                        >{this.state.debugMode && <i class="bi bi-check" style={{ fontSize: '35px', lineHeight: '35px' }} />}</ToggleButton>
                                    </ToggleButtonGroup>

                                </div>

                                <Button onClick={ () => {
                                    this.setGameDetails();
                                } }
                                size='lg' disabled={!this.state.players  || !this.state.numberOfPieces} variant='xalianGreen' style={{ width: 'fit-content', margin: 'auto', marginTop: '50px'}}>Start Duel!</Button>
                            </div>

                        {/* </GameContainer> */}

                    </Container>

                </React.Fragment>
            );
        }


    }
}

export default DuelStartPage;
