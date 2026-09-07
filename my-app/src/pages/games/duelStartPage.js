// Terminal: registry. Kozrak's arena runs every duel as a paid ledger entry;
// setup is the docket you fill out at the clerk's counter before the bracket admits you.
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
import EncyclopediaLink from '../../components/encyclopediaLink';

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
        // a stable per-visit ledger entry number, so the docket reads like a
        // real filed entry rather than a counter that resets on every render
        this.setState({ entryNumber: 2000 + Math.floor(Math.random() * 900) });

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

    // the ink bar under a candidate's photo: attack and defense read off the
    // same stat block the board itself uses, so the docket never invents a number
    renderInkMeter = (label, statBlock) => {
        if (!statBlock) return null;
        let percent = Math.min(100, Math.round((statBlock.points / statBlock.maxPoints) * 100));
        return (
            <div className="registry-roster-meter">
                <span className="g-meter-name">{label}</span>
                <div className="g-meter g-meter--ink">
                    <div className="g-meter-track" />
                    <div className="g-meter-fill" style={{ width: `${percent}%` }} />
                </div>
            </div>
        );
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
                <div className="g-console" data-terminal="registry">
                    <XalianNavbar />

                    <div className="g-shell registry-shell">
                        <header className="g-masthead">
                            <div className="g-masthead-heading">
                                <p className="g-kicker">Registry</p>
                                <h1 className="g-title">Duel</h1>
                                <p className="g-body">Muster the roster before the bracket admits you.</p>
                            </div>
                            <div className="g-masthead-aside">
                                <span className="g-nameplate">Valleron Arena &middot; Window 2</span>
                            </div>
                        </header>

                        <div className="g-counter registry-counter">
                            <div className="registry-roster-head">
                                <span className="g-legend">Combatants on file</span>
                                <span className="g-legend registry-roster-count">{selectedCount} / {needed} entered</span>
                            </div>

                            <div className="registry-roster-grid">
                                {this.state.userXalians.map((x) => {
                                    let selected = this.state.selectedXalianIds.includes(x.xalianId);
                                    let primaryType = x.elements.primaryType;
                                    let secondaryType = x.elements.secondaryType;
                                    let element = primaryType.toLowerCase();
                                    return (
                                        <button
                                            type="button"
                                            key={`squad-pick-${x.xalianId}`}
                                            aria-pressed={selected}
                                            className={`g-paper g-paper--docket registry-roster-card g-el-${element}${selected ? ' registry-roster-card--selected' : ''}`}
                                            onClick={() => this.toggleXalianSelection(x.xalianId)}>
                                            {selected &&
                                                <span className="g-stamp registry-roster-stamp">Entered</span>
                                            }
                                            <div className="registry-roster-row">
                                                <span className="g-plate--photo registry-roster-photo">
                                                    <XalianImage colored speciesName={x.species.name} primaryType={primaryType} moreClasses="species-tile-img" />
                                                </span>
                                                <div className="registry-roster-info">
                                                    <span className="registry-roster-name">
                                                        {x.species.name}
                                                        <span onClick={(e) => e.stopPropagation()}>
                                                            <EncyclopediaLink kind="species" name={x.species.name} variant="icon" />
                                                        </span>
                                                    </span>
                                                    <span className="registry-roster-id">No. {x.xalianId.split('-').pop().substring(0, 8)}</span>
                                                    <div className="registry-roster-chips">
                                                        <span className="g-chip g-chip--outline">{primaryType}</span>
                                                        {secondaryType &&
                                                            <span className="g-chip g-chip--outline">{secondaryType}</span>
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                            {this.renderInkMeter('Attack', x.stats.standardAttackPoints)}
                                            {this.renderInkMeter('Defense', x.stats.standardDefensePoints)}
                                        </button>
                                    );
                                })}
                            </div>

                            {selectedCount > 0 && fillerCount > 0 &&
                                <p className="registry-note">
                                    {fillerCount} remaining slot{fillerCount > 1 ? 's' : ''} will be filled from the pool at random
                                </p>
                            }

                            <div className="g-counter-lip" />

                            <div className="g-keybank registry-keybank">
                                <span className="g-key-socket">
                                    <button type="button" className="g-key" onClick={() => this.setGameDetails()}>Random Squad</button>
                                </span>
                                <span className="g-key-socket">
                                    <button type="button" className="g-key g-key--primary" disabled={selectedCount < 1} onClick={this.startWithSelectedSquad}>
                                        Enter Duel
                                    </button>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        } else {
            let playersChosen = this.state.players != null;
            let teamSizeChosen = this.state.numberOfPieces != null;
            let complete = playersChosen && teamSizeChosen;
            let formatLabel = playersChosen ? (this.state.players === 1 ? '1 vs bot' : '2 combatants') : 'pending';
            let bracketLabel = teamSizeChosen ? `${this.state.numberOfPieces} v ${this.state.numberOfPieces}` : 'pending';
            let feeTokens = teamSizeChosen ? this.state.numberOfPieces : 'pending';

            return (
                <div className="g-console" data-terminal="registry">
                    <XalianNavbar />

                    <div className="g-shell registry-shell">
                        <header className="g-masthead">
                            <div className="g-masthead-heading">
                                <p className="g-kicker">Registry</p>
                                <h1 className="g-title">Duel</h1>
                            </div>
                            <div className="g-masthead-aside">
                                <span className="g-nameplate">Valleron Arena &middot; Window 2</span>
                            </div>
                        </header>

                        {/* the clerk's counter: the docket up top carries the typed
                            terms, the physical keys below fill it in */}
                        <div className="g-counter registry-counter">
                            <div className="registry-counter-top">
                                <div className="g-clip-well">
                                    <div className="g-paper g-paper--docket registry-docket">
                                        <div className="g-clip" />
                                        {complete &&
                                            <div className="g-stamp registry-stamp">Admitted<small>fee pending</small></div>
                                        }
                                        <p className="registry-docket-hd">Terms of entry</p>
                                        <div className="registry-docket-row">
                                            <span className="g-spec-key">Format</span>
                                            <span className="g-paper-field">{formatLabel}</span>
                                        </div>
                                        <div className="registry-docket-row">
                                            <span className="g-spec-key">Bracket</span>
                                            <span className="g-paper-field">{bracketLabel}</span>
                                        </div>
                                        <div className="registry-docket-row">
                                            <span className="g-spec-key">Start positions</span>
                                            <span className="g-paper-field">{this.state.randomizeStartingPositions ? 'Randomized' : 'Fixed'}</span>
                                        </div>
                                        {process.env.NODE_ENV !== 'production' &&
                                            <div className="registry-docket-row">
                                                <span className="g-spec-key">Debug mode</span>
                                                <span className="g-paper-field">{this.state.debugMode ? 'On' : 'Off'}</span>
                                            </div>
                                        }
                                    </div>
                                </div>

                                {/* the questions the clerk asks, answered on physical
                                    switches — paper cannot hold a control */}
                                <div className="registry-controls">
                                    <div className="registry-control">
                                        <span className="g-legend">Players</span>
                                        <div className="g-segmented" role="group" aria-label="Players">
                                            <button type="button" className="g-segment"
                                                aria-pressed={this.state.players === 1}
                                                onClick={() => this.setState({ players: 1 })}>
                                                <i className="bi bi-person-fill" /> vs <i className="bi bi-robot" />
                                            </button>
                                            <button type="button" className="g-segment"
                                                aria-pressed={this.state.players === 2}
                                                onClick={() => this.setState({ players: 2 })}>
                                                <i className="bi bi-person-fill" /> vs <i className="bi bi-person-fill" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="registry-control">
                                        <span className="g-legend">Team Size</span>
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

                                    <div className="registry-control">
                                        <span className="g-legend">Randomize Start Positions</span>
                                        <label className="g-check">
                                            <input
                                                type="checkbox"
                                                checked={this.state.randomizeStartingPositions}
                                                onChange={() => this.setState({ randomizeStartingPositions: !this.state.randomizeStartingPositions })} />
                                            <span className="g-check-box" />
                                        </label>
                                    </div>

                                    {process.env.NODE_ENV !== 'production' &&
                                        <div className="registry-control">
                                            <span className="g-legend">Debug Mode</span>
                                            <label className="g-check">
                                                <input
                                                    type="checkbox"
                                                    checked={this.state.debugMode}
                                                    onChange={() => this.setState({ debugMode: !this.state.debugMode })} />
                                                <span className="g-check-box" />
                                            </label>
                                        </div>
                                    }
                                </div>
                            </div>

                            <div className="g-counter-lip" />

                            <div className="g-bezel registry-bezel">
                                <div className="g-ledger">
                                    <span className="g-lamp g-lamp--amber">
                                        ENTRY {this.state.entryNumber || 'pending'} <span className="dim">&nbsp;BRACKET {bracketLabel}</span>
                                    </span>
                                    <span>FEE <b>{feeTokens} TOKENS</b> <span className="dim">{complete ? 'CLEARED' : 'PENDING'}</span></span>
                                </div>
                            </div>

                            <div className="g-keybank registry-keybank">
                                <span className="g-key-socket">
                                    <button type="button" className="g-key" onClick={() => this.setState({ showHowToPlay: true })}>
                                        How to Play
                                    </button>
                                </span>
                                <span className="g-key-socket">
                                    <button type="button" className="g-key g-key--primary"
                                        disabled={!complete}
                                        onClick={this.handleStartClicked}>
                                        Enter the Bracket
                                    </button>
                                </span>
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
