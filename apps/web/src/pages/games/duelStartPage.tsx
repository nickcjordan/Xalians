// Tier: chrome. Setup is a form; the board entered afterward is the immersive experience and keeps its own design.
import * as React from 'react';

import XalianNavbar from '@/components/navbar';
import XalianImage from '@/components/xalianImage';
import { Shell, Masthead } from '@/components/system/masthead';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import * as retrievalUtil from '@/utils/retrievalUtil';
import DuelPage from './duelPage';
import HowToPlayModal from '@/components/games/duel/howToPlayModal';
import LocalDuelStorage from '@/store/LocalStorage';

const TEAM_SIZE_OPTIONS = [2, 3, 4, 5, 6];

type XalianRecord = {
    xalianId: string;
    species: { name: string };
    elements: { primaryType: string };
};

type GameDetails = {
    numberOfPieces: number;
    players: number;
    bot: boolean;
    randomizeStartingPositions: boolean;
    debugMode: boolean;
    playerSquad: XalianRecord[] | null;
};

type DuelStartPageState = {
    players: number;
    numberOfPieces: number;
    randomizeStartingPositions: boolean;
    debugMode: boolean;
    selectedXalianIds: string[];
    showHowToPlay: boolean;
    userXalians?: XalianRecord[];
    gameDetails?: GameDetails;
};

class DuelStartPage extends React.Component<{}, DuelStartPageState> {

    state: DuelStartPageState = {
        players: 1,
        numberOfPieces: 4,
        randomizeStartingPositions: true,
        debugMode: process.env.NODE_ENV !== 'production',
        selectedXalianIds: [],
        showHowToPlay: false
    }

    componentDidMount() {
        retrievalUtil.getCurrentUserAndXalians()
            .then((user: any) => {
                if (user && user.xalians && user.xalians.length > 0) {
                    this.setState({ userXalians: user.xalians.map((x: any) => x.attributes) });
                }
            })
            .catch(() => {
                // signed out or API unavailable — duel falls back to random squads
            });
    }

    setGameDetails = () => {
        let squad = (this.state.userXalians || []).filter((x) => this.state.selectedXalianIds.includes(x.xalianId));
        let details: GameDetails = {
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

    setTeamSize = (size: number) => {
        this.setState((prev) => ({
            numberOfPieces: size,
            selectedXalianIds: prev.selectedXalianIds.slice(0, size)
        }));
    }

    toggleXalianSelection = (xalianId: string) => {
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
            <div className="flex flex-col gap-3">
                <div className="flex justify-between gap-3 text-small text-ink-2">
                    <span>{selectedCount} / {needed} chosen</span>
                    <span>Open slots fill from the pool at random</span>
                </div>
                <div className="grid max-h-64 grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-2 overflow-y-auto p-0.5">
                    {(this.state.userXalians || []).map((x) => {
                        let selected = this.state.selectedXalianIds.includes(x.xalianId);
                        let primaryType = x.elements.primaryType;
                        return (
                            <button
                                type="button"
                                key={`squad-pick-${x.xalianId}`}
                                aria-pressed={selected}
                                className={`el-${primaryType.toLowerCase()} flex flex-col items-center gap-1 border p-2 text-center outline-none transition-[background-color,border-color] duration-1 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${selected ? 'border-viable-lo bg-viable-tint' : 'border-edge bg-s0 hover:bg-s1'}`}
                                onClick={() => this.toggleXalianSelection(x.xalianId)}>
                                <span className="block h-11 w-11 overflow-hidden bg-el/80">
                                    <XalianImage variant="token" colored speciesName={x.species.name} primaryType={primaryType} unPadded />
                                </span>
                                <span className="text-small text-ink-2">{x.species.name}</span>
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
            return <span className="type-data text-ink">not set</span>;
        }
        return (
            <div className="flex flex-1 flex-wrap justify-end gap-2">
                {chosen.map((x) => {
                    let primaryType = x.elements.primaryType;
                    return (
                        <span
                            key={`squad-plate-${x.xalianId}`}
                            className={`el-${primaryType.toLowerCase()} block h-9 w-9 overflow-hidden bg-el/80`}
                            title={x.species.name}>
                            <XalianImage variant="token" colored speciesName={x.species.name} primaryType={primaryType} unPadded />
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
            <main className="pb-16" data-tier="chrome">
                <XalianNavbar />

                <Shell>
                    <Masthead
                        kicker="Duel"
                        title="New match"
                        aside={(
                            <>
                                <Button variant="secondary" onClick={() => this.setState({ showHowToPlay: true })}>
                                    How to play
                                </Button>
                                <Button onClick={this.setGameDetails}>
                                    Start match
                                </Button>
                            </>
                        )}
                    />

                    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_22rem]">
                        <Card variant="panel" className="gap-0 p-0">
                            <div className="flex items-center justify-between gap-4 px-6 py-4">
                                <span className="type-legend">Opponent</span>
                                <ToggleGroup
                                    type="single"
                                    variant="outline"
                                    value={this.state.players === 1 ? 'bot' : 'second'}
                                    onValueChange={(v) => { if (v) { this.setState({ players: v === 'bot' ? 1 : 2 }); } }}
                                    aria-label="Opponent">
                                    <ToggleGroupItem value="bot">Bot</ToggleGroupItem>
                                    <ToggleGroupItem value="second">Second player</ToggleGroupItem>
                                </ToggleGroup>
                            </div>

                            <div className="flex items-center justify-between gap-4 border-t border-edge px-6 py-4">
                                <span className="type-legend">Team size</span>
                                <ToggleGroup
                                    type="single"
                                    variant="outline"
                                    value={String(this.state.numberOfPieces)}
                                    onValueChange={(v) => { if (v) { this.setTeamSize(Number(v)); } }}
                                    aria-label="Team size">
                                    {TEAM_SIZE_OPTIONS.map((size) => (
                                        <ToggleGroupItem value={String(size)} key={`team-size-${size}`}>
                                            {size}
                                        </ToggleGroupItem>
                                    ))}
                                </ToggleGroup>
                            </div>

                            <div className="flex items-center justify-between gap-4 border-t border-edge px-6 py-4">
                                <span className="type-legend">Randomize start positions</span>
                                <Switch
                                    checked={this.state.randomizeStartingPositions}
                                    onCheckedChange={(checked) => this.setState({ randomizeStartingPositions: checked })} />
                            </div>

                            <div className={`flex gap-4 border-t border-edge px-6 py-4 ${this.state.userXalians ? 'flex-col items-stretch' : 'items-center justify-between'}`}>
                                <span className="type-legend">Squad</span>
                                {this.state.userXalians ? this.renderSquadPicker() :
                                    <span className="text-small text-ink-2">Sign in to pick from your Xalians</span>
                                }
                            </div>

                            {process.env.NODE_ENV !== 'production' &&
                                <div className="flex items-center justify-between gap-4 border-t border-edge px-6 py-4">
                                    <span className="type-legend">Debug mode</span>
                                    <Switch
                                        checked={this.state.debugMode}
                                        onCheckedChange={(checked) => this.setState({ debugMode: checked })} />
                                </div>
                            }
                        </Card>

                        <Card variant="glass" className="gap-3">
                            <p className="type-legend mb-1">Match</p>
                            <div className="flex items-center justify-between gap-3 border-t border-edge py-2 first:border-t-0 first:pt-0">
                                <span className="text-small text-ink-2">Opponent</span>
                                <span className="type-data text-ink">{this.state.players === 1 ? 'Bot' : 'Second player'}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 border-t border-edge py-2">
                                <span className="text-small text-ink-2">Team size</span>
                                <span className="type-data text-ink">{bracketLabel}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 border-t border-edge py-2">
                                <span className="text-small text-ink-2">Start positions</span>
                                <span className="type-data text-ink">{this.state.randomizeStartingPositions ? 'Randomized' : 'Fixed'}</span>
                            </div>
                            <div className="flex items-start justify-between gap-3 border-t border-edge py-2">
                                <span className="text-small text-ink-2">Squad</span>
                                {this.renderSquadSummary()}
                            </div>
                        </Card>
                    </div>
                </Shell>

                <HowToPlayModal show={this.state.showHowToPlay} onHide={this.onHideHowToPlay} />
            </main>
        );
    }
}

export default DuelStartPage;
