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
        debugMode: process.env.NODE_ENV !== 'production',
        selectedXalianIds: []
    }

    // componentDidUpdate(prevProps, prevState) {
        // if (this.state.players && this.state.numberOfPieces && !this.state.gameDetails ) {
           
        // }
    // }

    setGameDetails = (playerSquad = null) => {
        let details = {
            numberOfPieces: this.state.numberOfPieces,
            players: 2,
            bot: this.state.players == 1 ? true : false,
            randomizeStartingPositions: this.state.randomizeStartingPositions,
            debugMode: this.state.debugMode,
            playerSquad: playerSquad
        };
        this.setState({gameDetails: details})
    }

    componentDidMount() {
        retrievalUtil.getCurrentUserAndXalians()
            .then((user) => {
                if (user && user.xalians && user.xalians.length > 0) {
                    this.setState({ userXalians: user.xalians.map((x) => x.attributes) });
                }
            })
            .catch(() => {
                // signed out or API unavailable — duel falls back to random squads
            });
    }

    handleStartClicked = () => {
        if (this.state.userXalians && this.state.userXalians.length > 0) {
            this.setState({ choosingSquad: true });
        } else {
            this.setGameDetails();
        }
    }

    toggleXalianSelection = (xalianId) => {
        this.setState((prev) => {
            if (prev.selectedXalianIds.includes(xalianId)) {
                return { selectedXalianIds: prev.selectedXalianIds.filter((id) => id !== xalianId) };
            } else if (prev.selectedXalianIds.length < prev.numberOfPieces) {
                return { selectedXalianIds: [...prev.selectedXalianIds, xalianId] };
            }
            return null;
        });
    }

    startWithSelectedSquad = () => {
        let squad = this.state.userXalians.filter((x) => this.state.selectedXalianIds.includes(x.xalianId));
        this.setGameDetails(squad);
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
        } else if (this.state.choosingSquad) {
            let needed = this.state.numberOfPieces;
            let selectedCount = this.state.selectedXalianIds.length;
            let fillerCount = needed - selectedCount;
            return (
                <React.Fragment>
                    <Container fluid className="content-background-container">
                        <XalianNavbar></XalianNavbar>

                        <div style={{ display: 'flex', flexDirection: 'column', justifyItems: 'center', maxWidth: '600px', margin: 'auto' }}>
                            <h4 style={{ margin: 'auto', textAlign: 'center', marginTop: '25px', marginBottom: '10px' }}>Choose Your Squad ({selectedCount}/{needed}):</h4>

                            <Row style={{ margin: 'auto', justifyContent: 'center' }}>
                                {this.state.userXalians.map((x) => {
                                    let selected = this.state.selectedXalianIds.includes(x.xalianId);
                                    return (
                                        <Col key={`squad-pick-${x.xalianId}`} xs={4} sm={3} style={{ padding: '5px' }}>
                                            <a onClick={() => this.toggleXalianSelection(x.xalianId)} style={{ cursor: 'pointer' }}>
                                                <div style={{ borderRadius: '10px', padding: '3px', border: selected ? '3px solid #4caf50' : '3px solid transparent', opacity: selected || selectedCount < needed ? 1 : 0.4 }}>
                                                    <XalianImage colored bordered speciesName={x.species.name} primaryType={x.elements.primaryType} moreClasses="xalian-image-grid" />
                                                    <h6 className="condensed-row" style={{ textAlign: 'center', marginTop: '5px', marginBottom: '0px' }}>{x.species.name}</h6>
                                                    <p style={{ textAlign: 'center', fontSize: '8pt', marginBottom: '0px', opacity: 0.7 }}>#{x.xalianId.split('-').pop().substring(0, 8)}</p>
                                                </div>
                                            </a>
                                        </Col>
                                    );
                                })}
                            </Row>

                            {selectedCount > 0 && fillerCount > 0 &&
                                <p style={{ margin: 'auto', textAlign: 'center', marginTop: '10px', opacity: 0.7 }}>{fillerCount} remaining squad slot{fillerCount > 1 ? 's' : ''} will be filled randomly</p>
                            }

                            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '30px', marginBottom: '50px' }}>
                                <Button onClick={() => this.setGameDetails()} size='lg' variant='xalianGray' style={{ width: 'fit-content' }}>Random Squad</Button>
                                <Button onClick={this.startWithSelectedSquad} size='lg' disabled={selectedCount < 1} variant='xalianGreen' style={{ width: 'fit-content' }}>Enter Duel!</Button>
                            </div>
                        </div>

                    </Container>
                </React.Fragment>
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
                                    <i className="bi bi-person-fill" style={{ paddingRight: '10px', fontSize: '24pt' }}></i> vs. <i className="bi bi-robot" style={{ paddingLeft: '10px', fontSize: '24pt' }}></i>
                                </ToggleButton>

                                <ToggleButton key={`players-radio-${1}`} id={`players-radio-${1}`} type="radio" variant='xalianGray' name="radio" style={{ width: 'fit-content', margin: 'auto' }}
                                    value={2}
                                    checked={this.state.players == 2}
                                >
                                    <i className="bi bi-person-fill" style={{ paddingRight: '10px', fontSize: '24pt' }}></i> vs. <i className="bi bi-person-fill" style={{ paddingLeft: '10px', fontSize: '24pt' }}></i>
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
                                        >{this.state.randomizeStartingPositions && <i className="bi bi-check" style={{ fontSize: '35px', lineHeight: '35px' }} />}</ToggleButton>
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
                                        >{this.state.debugMode && <i className="bi bi-check" style={{ fontSize: '35px', lineHeight: '35px' }} />}</ToggleButton>
                                    </ToggleButtonGroup>

                                </div>

                                <Button onClick={this.handleStartClicked}
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
