// Tier: chrome. Setup is a form; the board entered afterward is the immersive experience and keeps its own design.
import React from 'react';
import XalianNavbar from '../../components/navbar';
import XalianImage from '../../components/xalianImage';

import * as retrievalUtil from '../../utils/retrievalUtil';
import DuelPage from './duelPage';
import HowToPlayModal from '../../components/games/duel/howToPlayModal';
import LocalDuelStorage from '../../store/LocalStorage';

const TEAM_SIZE_OPTIONS = [2, 3, 4, 5, 6];

class DuelStartPage extends React.Component {

    state = {
        players: 1,
        numberOfPieces: 4,
        randomizeStartingPositions: true,
        debugMode: process.env.NODE_ENV !== 'production',
        selectedXalianIds: [],
        showHowToPlay: false
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

    setGameDetails = () => {
        let squad = (this.state.userXalians || []).filter((x) => this.state.selectedXalianIds.includes(x.xalianId));
        let details = {
            numberOfPieces: this.state.numberOfPieces,
            players: 2,
            bot: this.state.players === 1,
            randomizeStartingPositions: this.state.randomizeStartingPositions,
            debugMode: this.state.debugMode,
            playerSquad: squad.length > 0 ? squad : null
        };
        this.setState({ gameDetails: details });
    }

    // reading the rules here counts as having seen them, so the board does not
    // pop the same modal again the moment the duel starts
    onHideHowToPlay = () => {
        LocalDuelStorage.setHowToPlaySeen();
        this.setState({ showHowToPlay: false });
    }

    setTeamSize = (size) => {
        this.setState((prev) => ({
            numberOfPieces: size,
            selectedXalianIds: prev.selectedXalianIds.slice(0, size)
        }));
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

    renderSquadPicker() {
        let needed = this.state.numberOfPieces;
        let selectedCount = this.state.selectedXalianIds.length;
        return (
            <div className="lobbies-squad-picker">
                <div className="lobbies-squad-picker-head">
                    <span className="g-small-v4">{selectedCount} / {needed} chosen</span>
                    <span className="g-small-v4">Open slots fill from the pool at random</span>
                </div>
                <div className="lobbies-squad-picker-grid">
                    {this.state.userXalians.map((x) => {
                        let selected = this.state.selectedXalianIds.includes(x.xalianId);
                        let primaryType = x.elements.primaryType;
                        return (
                            <button
                                type="button"
                                key={`squad-pick-${x.xalianId}`}
                                aria-pressed={selected}
                                className={`lobbies-squad-pick g-el-${primaryType.toLowerCase()}${selected ? ' on' : ''}`}
                                onClick={() => this.toggleXalianSelection(x.xalianId)}>
                                <span className="lobbies-squad-pick-art">
                                    <XalianImage colored speciesName={x.species.name} primaryType={primaryType} unPadded />
                                </span>
                                <span className="g-small-v4">{x.species.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    renderSquadSummary() {
        let chosen = (this.state.userXalians || []).filter((x) => this.state.selectedXalianIds.includes(x.xalianId));
        if (chosen.length === 0) {
            return <b className="g-data-v4">not set</b>;
        }
        return (
            <div className="lobbies-squad-plates">
                {chosen.map((x) => {
                    let primaryType = x.elements.primaryType;
                    return (
                        <span key={`squad-plate-${x.xalianId}`} className={`lobbies-squad-plate g-el-${primaryType.toLowerCase()}`} title={x.species.name}>
                            <XalianImage colored speciesName={x.species.name} primaryType={primaryType} unPadded />
                        </span>
                    );
                })}
            </div>
        );
    }

    render() {
        if (this.state.gameDetails) {
            return (
                <DuelPage gameDetails={this.state.gameDetails} />
            );
        }

        let bracketLabel = `${this.state.numberOfPieces} v ${this.state.numberOfPieces}`;

        return (
            <main className="g-page" data-tier="chrome">
                <XalianNavbar />

                <div className="g-shell">
                    <header className="g-masthead">
                        <div className="g-masthead-heading">
                            <p className="g-kicker">Duel</p>
                            <h1 className="g-title">New match</h1>
                        </div>
                        <div className="g-masthead-aside">
                            <button type="button" className="g-btn" onClick={() => this.setState({ showHowToPlay: true })}>
                                How to play
                            </button>
                            <button type="button" className="g-btn g-btn--primary" onClick={this.setGameDetails}>
                                Start match
                            </button>
                        </div>
                    </header>

                    <div className="lobbies-form">
                        <div className="g-panel lobbies-form-panel">
                            <div className="lobbies-row">
                                <span className="g-legend-v4">Opponent</span>
                                <div className="g-segmented" role="group" aria-label="Opponent">
                                    <button type="button" className="g-segment" aria-pressed={this.state.players === 1}
                                        onClick={() => this.setState({ players: 1 })}>Bot</button>
                                    <button type="button" className="g-segment" aria-pressed={this.state.players === 2}
                                        onClick={() => this.setState({ players: 2 })}>Second player</button>
                                </div>
                            </div>

                            <div className="lobbies-row">
                                <span className="g-legend-v4">Team size</span>
                                <div className="g-segmented" role="group" aria-label="Team size">
                                    {TEAM_SIZE_OPTIONS.map((size) => (
                                        <button type="button" className="g-segment" key={`team-size-${size}`}
                                            aria-pressed={this.state.numberOfPieces === size}
                                            onClick={() => this.setTeamSize(size)}>
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="lobbies-row">
                                <span className="g-legend-v4">Randomize start positions</span>
                                <span className={`g-toggle${this.state.randomizeStartingPositions ? ' on' : ''}`}
                                    role="switch"
                                    aria-checked={this.state.randomizeStartingPositions}
                                    tabIndex={0}
                                    onClick={() => this.setState({ randomizeStartingPositions: !this.state.randomizeStartingPositions })}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.setState({ randomizeStartingPositions: !this.state.randomizeStartingPositions }); } }} />
                            </div>

                            <div className={`lobbies-row${this.state.userXalians ? ' lobbies-row--stack' : ''}`}>
                                <span className="g-legend-v4">Squad</span>
                                {this.state.userXalians ? this.renderSquadPicker() :
                                    <span className="g-small-v4">Sign in to pick from your Xalians</span>
                                }
                            </div>

                            {process.env.NODE_ENV !== 'production' &&
                                <div className="lobbies-row">
                                    <span className="g-legend-v4">Debug mode</span>
                                    <span className={`g-toggle${this.state.debugMode ? ' on' : ''}`}
                                        role="switch"
                                        aria-checked={this.state.debugMode}
                                        tabIndex={0}
                                        onClick={() => this.setState({ debugMode: !this.state.debugMode })}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.setState({ debugMode: !this.state.debugMode }); } }} />
                                </div>
                            }
                        </div>

                        <div className="g-glass lobbies-summary">
                            <p className="g-legend-v4 lobbies-summary-head">Match</p>
                            <div className="lobbies-summary-line">
                                <span className="g-small-v4">Opponent</span>
                                <b className="g-data-v4">{this.state.players === 1 ? 'Bot' : 'Second player'}</b>
                            </div>
                            <div className="lobbies-summary-line">
                                <span className="g-small-v4">Team size</span>
                                <b className="g-data-v4">{bracketLabel}</b>
                            </div>
                            <div className="lobbies-summary-line">
                                <span className="g-small-v4">Start positions</span>
                                <b className="g-data-v4">{this.state.randomizeStartingPositions ? 'Randomized' : 'Fixed'}</b>
                            </div>
                            <div className="lobbies-summary-line lobbies-summary-line--squad">
                                <span className="g-small-v4">Squad</span>
                                {this.renderSquadSummary()}
                            </div>
                        </div>
                    </div>
                </div>

                <HowToPlayModal show={this.state.showHowToPlay} onHide={this.onHideHowToPlay} />
            </main>
        );
    }
}

export default DuelStartPage;
