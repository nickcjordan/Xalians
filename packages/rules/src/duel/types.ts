/*
	Duel rules - shared types.

	The duel game predates the ratified creature registry (@xalians/content/schema)
	by a wide margin: it runs on the pieces built by duelPieceBuilder.ts from the
	legacy translated wire shape (translator.translateCharacterToPresentableType in the
	lambda engine), not on a XalianRecord. So, unlike expedition/types.ts, these types
	are hand-written to match what duelPieceBuilder.ts actually produces and what the
	board state (`G` in boardgame.io parlance) actually carries, rather than deriving
	from the content schema. A future pass that moves duel onto the registry can retype
	this file without touching the rest of the game.
*/

export interface DuelSpecies {
	id: string;
	name: string;
	planet: string;
}

export interface DuelElements {
	primaryType: string;
	secondaryType: string | null;
}

export interface DuelTraits {
	canFly: boolean;
	attackRange: 'high' | 'medium' | 'low' | string;
}

export interface DuelMove {
	name: string;
	type?: string | null;
	rating?: number;
	[key: string]: unknown;
}

export interface DuelPieceStats {
	attack: number;
	defense: number;
	speed: number;
	range: number;
	distance: number;
	evasion: number;
}

export interface DuelPieceState {
	health: number;
	stamina: number;
}

export interface DuelPiece {
	xalianId: string;
	species: DuelSpecies;
	elementType: string;
	moves: DuelMove[];
	elements: DuelElements;
	stats: DuelPieceStats;
	state: DuelPieceState;
	traits: DuelTraits;
}

// the source xalian object duelPieceBuilder.buildDuelPiece consumes (the translated wire
// shape from the lambda engine / @xalians/content/species.json lookups); kept loose since
// it is a pass-through record this game does not own the shape of.
export interface SourceXalian {
	xalianId: string;
	species: { id: string; name?: string; planet?: string; [key: string]: unknown };
	elements: { primaryType: string; secondaryType?: string | null };
	moves?: DuelMove[];
	stats: Record<string, { range: string | number }>;
	[key: string]: unknown;
}

export interface Coordinate extends Array<number> {
	0: number;
	1: number;
}

export interface BoardGrid {
	map: Record<number, Coordinate>;
	rows: number[][];
}

export interface DuelPath {
	startIndex: number;
	startCoord: Coordinate;
	endIndex: number;
	endCoord: Coordinate;
	path: Coordinate[];
	spacesMoved: number;
}

export interface DuelFlag {
	player: 0 | 1;
	index: number | null;
	startIndex: number;
	holder: string | null;
}

export interface PlayerState {
	playerID: number;
	activeXalianIds: string[];
	inactiveXalianIds: string[];
	unsetXalianIds: string[];
}

export interface TurnMove {
	moverId: string;
	spacesMoved: number;
}

export interface CurrentTurnDetails {
	hasAttacked: boolean;
	hasMoved: boolean;
	remainingSpacesToMove: number;
	moves: TurnMove[];
	isComplete: boolean;
	actions: TurnAction[];
}

export interface MoveActionRecord {
	type: 'move';
	move: { moverId: string; path: DuelPath };
}

export interface AttackActionRecord {
	type: 'attack';
	attack: {
		attackerId: string;
		defenderId: string;
		result?: unknown;
	};
}

// only 'move'/'attack' actions are ever pushed onto G.currentTurnActions (combo
// actions decompose into a movePiece move before being recorded), so the union is
// exhaustive rather than carrying a catch-all branch.
export type TurnAction = MoveActionRecord | AttackActionRecord;

export interface BoardState {
	moveId?: string;
	cells: (string | null)[];
	xalians: DuelPiece[];
	flags: DuelFlag[];
	playerStates: [PlayerState, PlayerState];
	currentTurnDetails?: CurrentTurnDetails | null;
	currentTurnActions?: TurnAction[];
	hasBot?: boolean;
	startState?: BoardState | null;
	[key: string]: unknown;
}

export interface DuelCtx {
	currentPlayer: string;
	phase?: string;
	turn?: number;
	numMoves?: number;
	[key: string]: unknown;
}

export interface ScoredAction {
	type: 'move' | 'attack' | 'combo';
	score: number;
	path: DuelPath;
	description: string;
	moverId?: string;
	attackerId?: string;
	defenderId?: string;
	moveIndex?: number | null;
	moveAction?: ScoredAction;
	attackAction?: ScoredAction;
	xalian?: DuelPiece;
	[key: string]: unknown;
}

export interface AttackResult {
	damage: number;
	uncappedDamage: number;
	reactionDamage: number;
	typeEffectiveness: number;
	move: { name: string; type: string | null } | null;
}

export interface XalianTurnStatus {
	xalianHasAttacked: boolean;
	xalianHasMoved: boolean;
	remainingSpacesXalianCanMove: number;
}
