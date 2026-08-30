import React from 'react';
import XalianNavbar from '../../components/navbar';
import XalianImage from '../../components/xalianImage';

import * as retrievalUtil from '../../utils/retrievalUtil';
import { Client } from 'boardgame.io/react';
import { Duel } from '../../components/games/duel/duel';
import * as translator from '../../utils/valueTranslator';
import * as gameConstants from '../../gameplay/duel/duelGameConstants'
import { Local } from 'boardgame.io/multiplayer';
import * as duelConstants from '../../gameplay/duel/duelGameConstants';
import * as duelPieceBuilder from '../../gameplay/duel/duelPieceBuilder';
import DuelPage from './duelPage';
import HowToPlayModal from '../../components/games/duel/howToPlayModal';
import LocalDuelStorage from '../../store/LocalStorage';

class DuelStartPage extends React.Component {

    state = {
        randomizeStartingPositions: true,
        debugMode: process.env.NODE_ENV !== 'production',
        selectedXalianIds: [],
        showHowToPlay: false
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

    // reading the rules here counts as having seen them, so the board does not
    // pop the same modal again the moment the duel starts
    onHideHowToPlay = () => {
        LocalDuelStorage.setHowToPlaySeen();
        this.setState({ showHowToPlay: false });
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
                <div className="g-console">
                    <XalianNavbar />

                    <div className="g-shell page-shell duel-setup-shell">
                        <header className="page-header">
                            <p className="g-kicker">Arena Control</p>
                            <h1 className="g-title">Choose Your Squad</h1>
                        </header>

                        <div className="g-panel duel-setup-panel">
                            <div className="duel-setup-head">
                                <span className="duel-setup-label">Selected</span>
                                <span className="duel-squad-count">{selectedCount} / {needed}</span>
                            </div>

                            <div className="species-grid duel-squad-grid">
                                {this.state.userXalians.map((x) => {
                                    let selected = this.state.selectedXalianIds.includes(x.xalianId);
                                    let element = x.elements.primaryType.toLowerCase();
                                    return (
                                        <button
                                            type="button"
                                            key={`squad-pick-${x.xalianId}`}
                                            aria-pressed={selected}
                                            className={`species-tile duel-squad-tile g-el-${element}${selected ? ' duel-squad-tile--selected' : ''}`}
                                            onClick={() => this.toggleXalianSelection(x.xalianId)}>
                                            <span className="species-tile-plate">
                                                <XalianImage colored speciesName={x.species.name} primaryType={x.elements.primaryType} moreClasses="species-tile-img" />
                                            </span>
                                            <span className="species-tile-legend">
                                                <span className="species-tile-name">{x.species.name}</span>
                                                <span className="species-tile-meta">
                                                    <span className="species-tile-id">#{x.xalianId.split('-').pop().substring(0, 8)}</span>
                                                </span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {selectedCount > 0 && fillerCount > 0 &&
                                <p className="duel-setup-note">
                                    {fillerCount} remaining squad slot{fillerCount > 1 ? 's' : ''} will be filled randomly
                                </p>
                            }

                            <div className="duel-setup-actions">
                                <button type="button" className="g-btn" onClick={() => this.setGameDetails()}>Random Squad</button>
                                <button type="button" className="g-btn g-btn--primary" disabled={selectedCount < 1} onClick={this.startWithSelectedSquad}>Enter Duel</button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        } else {
            return (
                <div className="g-console">
                    <XalianNavbar />

                    <div className="g-shell page-shell duel-setup-shell">
                        <header className="page-header">
                            <p className="g-kicker">Arena Control</p>
                            <h1 className="g-title">Duel Setup</h1>
                        </header>

                        {/* the match parameters, set on one panel of controls rather
                            than floating loose on the starfield */}
                        <div className="g-panel duel-setup-panel">

                            <div className="duel-setup-row">
                                <span className="duel-setup-label">Players</span>
                                <div className="g-segmented" role="group" aria-label="Players">
                                    <button type="button" className="g-segment duel-players-segment"
                                        aria-pressed={this.state.players === 1}
                                        onClick={() => this.setState({ players: 1 })}>
                                        <i className="bi bi-person-fill" /> vs <i className="bi bi-robot" />
                                    </button>
                                    <button type="button" className="g-segment duel-players-segment"
                                        aria-pressed={this.state.players === 2}
                                        onClick={() => this.setState({ players: 2 })}>
                                        <i className="bi bi-person-fill" /> vs <i className="bi bi-person-fill" />
                                    </button>
                                </div>
                            </div>

                            <div className="duel-setup-row">
                                <span className="duel-setup-label">Team Size</span>
                                <div className="g-segmented" role="group" aria-label="Team size">
                                    {piecesPerTeamOptions.map((option) => (
                                        <button type="button" className="g-segment" key={`pieces-${option.value}`}
                                            aria-pressed={this.state.numberOfPieces === option.value}
                                            onClick={() => this.setState({ numberOfPieces: option.value })}>
                                            {option.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="duel-setup-row">
                                <span className="duel-setup-label">Randomize Start Positions</span>
                                <label className="g-check">
                                    <input
                                        type="checkbox"
                                        checked={this.state.randomizeStartingPositions}
                                        onChange={() => this.setState({ randomizeStartingPositions: !this.state.randomizeStartingPositions })} />
                                    <span className="g-check-box" />
                                </label>
                            </div>

                            {process.env.NODE_ENV !== 'production' &&
                                <div className="duel-setup-row">
                                    <span className="duel-setup-label">Debug Mode</span>
                                    <label className="g-check">
                                        <input
                                            type="checkbox"
                                            checked={this.state.debugMode}
                                            onChange={() => this.setState({ debugMode: !this.state.debugMode })} />
                                        <span className="g-check-box" />
                                    </label>
                                </div>
                            }

                            <div className="duel-setup-actions">
                                <button type="button" className="g-btn" onClick={() => this.setState({ showHowToPlay: true })}>
                                    How to Play
                                </button>
                                <button type="button" className="g-btn g-btn--primary"
                                    disabled={!this.state.players || !this.state.numberOfPieces}
                                    onClick={this.handleStartClicked}>
                                    Start Duel
                                </button>
                            </div>
                        </div>
                    </div>

                    <HowToPlayModal show={this.state.showHowToPlay} onHide={this.onHideHowToPlay} />
                </div>
            );
        }
    }
}

export default DuelStartPage;
