/*
	Expedition (Reclamation) shared types. The record shape itself (XalianRecord) and the
	registry key unions come from @xalians/content/schema and packages/rules's own
	generator/types.ts (the generator's ElementKey/AttributeKey unions), per docs/design/
	frontend-backend-data-sharing.md decision 7 and CLAUDE.md's "one source per data kind."
	Nothing in this file redefines a record field; it types the derived, engine-owned shapes
	the rules build on top of a record (sites, the board, prepared views, the match state).

	Field-by-field precision stops where the original JS was already loosely shaped (the
	resolution log's per-event payloads, the bot's per-candidate scoring bag, the devtools
	report objects): those are typed with permissive index signatures rather than invented
	exhaustive unions, since inventing one here would be new type surface with no source of
	truth, not a description of an existing contract.
*/

import type { Sites, XalianRecord } from '@xalians/content/schema';
import type { ElementKey } from '../generator/types.ts';

export type Seat = 'A' | 'B';

// ---------------------------------------------------------------------------
// worlds and sites (sites.ts / expeditionRules.ts's drawFrames)
// ---------------------------------------------------------------------------

// one authored site, exactly as sites.json carries it (SitesSchema's array element)
export type AuthoredSite = Sites[string][number];

// the planet facts sites.ts joins onto a world from planetRecords.json, all optional since
// getWorlds() falls back to {} for a planet with no matching planetRecords entry
export interface WorldFacts {
	planet: string;
	element: string;
	planetKey?: string;
	terrain?: string;
	temperatureC?: { low: number; high: number };
	gravityVsEarth?: number;
	hazards?: string[];
	terrainFeatures?: string[];
	images?: { landscape: string; planet: string };
}

// getWorlds()'s per-world entry: the world's facts plus its three authored sites
export interface World extends WorldFacts {
	sites: AuthoredSite[];
}

// a site as it sits in a frame: the authored site plus the world it was drawn onto
// (drawFrames's worldFacts()), so every hold computation reads the site's own world
export interface FrameSite extends AuthoredSite {
	world: WorldFacts;
}

export interface Frame {
	index: number;
	sites: FrameSite[];
	stakes: Partial<Record<Seat, string>>;
}

// ---------------------------------------------------------------------------
// rules: DEFAULT_RULES / normalizeRules's shape (expeditionRules.ts)
// ---------------------------------------------------------------------------

export interface RoleToggles {
	sweep: boolean;
	bolster: boolean;
	shield: boolean;
}

export type ShieldCap = 'none' | 'ownHold' | 'half';

// the normalized rules object every match carries (createMatch always runs the caller's
// partial rules through normalizeRules, so this is what rulesOf(state) always returns)
export interface Rules {
	hiddenSends: boolean;
	lokiLine: boolean;
	trailingBonus: number;
	speed: boolean;
	hiddenFirst: boolean;
	roles: RoleToggles;
	holdFloor: number;
	holdCeiling: number;
	magnitudeScale: number;
	sweepDiscount: number;
	bolsterFloor: number;
	armoredReduction: number;
	shieldCap: ShieldCap;
	willful: boolean;
	willfulThreshold: number;
	presenceScale: boolean;
	instinctLanes: boolean;
	keenInstinct: number;
	dullInstinct: number;
	swiftMove: boolean;
	swiftSpeed: number;
	hurtAttacksLess: boolean;
	bolsterRecovery: number;
	hiddenSendCost: number;
	hiddenPower: number;
	stake: boolean;
	draftPoolSize: number;
	draftDistinctSpecies: boolean;
	claimCounting: ClaimCounting;
	stakeTiming: StakeTiming;
	pinning: boolean;
	reachFirst: boolean;
}

/*
	When during Deploy a handler may stake a world (pass 6).

	- 'before-first-send': the stake must be declared before this handler's first send of
	  the round, so it is a forecast about which world will suit the roster. This is the
	  game through pass 5.
	- 'any-turn': the stake may be declared on any of this handler's turns during Deploy,
	  so it can be a read of a board that already has creatures on it.

	Measured cause for the lever (docs/design/reclamation-ownership-log.md, pass 6): once
	pass 5 gave the Clash enough weight to decide worlds, a deploy-time hold edge stopped
	predicting who holds one, and the staker's win rate on its staked world fell from 61.7
	percent to 47.4 while its unstaked worlds stayed at 50. A forecast made before any
	creature stands is the thing that broke; a stake made later is a bet on a fight the
	handler can see. Still once per Proving, still symmetric, still no gift.
*/
export type StakeTiming = 'before-first-send' | 'any-turn';

/*
	Pass 8, the two rules the pass 7 reading made possible.

	- pinning: an attack whose primary effect is `restrain` PINS its target: the target's
	  own attack does not land this Clash, if it had not landed already. 171 of the pool's
	  1384 actions restrain and 11 percent of attacking creatures lead with one, and until
	  pass 8 every one of them was a plain attack. Pinning is what restraint means at a
	  world where nothing moves between worlds: you do not get to swing.
	- reachFirst: a creature whose attack reaches past contact lands before the
	  contact-only creatures at its world, whatever their speed. 18 percent of attackers
	  reach, and `spatial.range` had been read since pass 7 and used by nothing.

	Both ship behind these flags so the ablation can price them, per the standing rule that
	every rule earns its place or goes.
*/

/*
	How the Ruling counts a standing creature's contribution to its world (pass 5).

	- 'current': the creature contributes the hold it has left, so every point of damage
	  moves the world's margin. This is the game through pass 4b.
	- 'standing': the creature contributes its whole claim while it stands and nothing once
	  it is downed, so the Clash moves a world by whole creatures rather than by points.

	Measured cause for the lever (docs/design/reclamation-ownership-log.md, pass 5): under
	'current' the Clash extends the deploy leader as often as it erodes it, because both
	sides subtract from the one number that also decides the world.
*/
export type ClaimCounting = 'current' | 'standing';

// what a caller may pass to createMatch / rules-aware helpers: any subset of Rules, with
// roles itself also partial. Devtools CLI flags (--rules=k=v;k=v) and rule-sweep tuples
// build these dynamically from strings, so the value type stays loose there (parseRules'
// own return type); this is the shape createMatch's normalizeRules accepts.
export type RulesInput = Partial<Omit<Rules, 'roles'>> & { roles?: Partial<RoleToggles> };

// ---------------------------------------------------------------------------
// the creature on the table (creatureOnTable.ts)
// ---------------------------------------------------------------------------

export type StrainLevel = 'none' | 'strained' | 'severe';

export interface HoldResult {
	value: number;
	level: StrainLevel;
	heldLevel: StrainLevel;
	effectiveLevel: StrainLevel;
	willful: boolean;
	bolstered: boolean;
	isHome: boolean;
	matchup: number;
}

export type ActClass = 'contact' | 'reach' | 'projection' | 'support';
export type Role = 'strike' | 'sweep' | 'bolster' | 'shield' | 'none';

export interface Act {
	name: string;
	action: string;
	class: ActClass | null;
	printedMagnitude: number;
	magnitude: number;
	instrument?: string;
	signature?: boolean;
	// blowActOf's synthetic minimum-strike fallback, and favoredAct's/blowActOf's synthetic
	// 'hold' act, both lack a `fallback`/`instrument`/`signature` triple a real ability
	// carries; `fallback: true` marks the former so callers can count how often it fires.
	fallback?: boolean;
	/*
		Pass 7: what the record itself says about this act, carried through from
		recordReading.ts so the dossier can print it and a later rule can read it without
		going back to the record. Absent on the synthetic acts above.
	*/
	effectKind?: string;
	area?: boolean;
	range?: string | null;
	reach?: number;
}

export interface Conduct {
	attacking: string;
	supporting: string;
	boldness: number;
	curiosity: number;
	energy: number;
	aggression: number;
	sociability: number;
	isHighBoldness: boolean;
	isLowBoldness: boolean;
	isHighSociability: boolean;
	isHighCuriosity: boolean;
	isHighAggression: boolean;
}

// prepare()'s full derived view of one creature standing at one site
export interface PreparedCreature {
	record: XalianRecord;
	id: string;
	site: AuthoredSite | FrameSite | null;
	world: WorldFacts | null | undefined;
	sentIndex: number;
	baseHold: number;
	hold: number;
	holdMultiplier: number;
	isHome: boolean;
	bolstered: boolean;
	speed: number;
	willful: boolean;
	swift: boolean;
	presenceScale: number;
	strainLevel: StrainLevel;
	heldStrainLevel: StrainLevel;
	effectiveStrainLevel: StrainLevel;
	strainMultiplier: number;
	acts: Act[];
	favoredAct: Act;
	role: Role;
	blow: Act | null;
	blowMagnitude: number;
	blowIsFallback: boolean;
	conduct: Conduct;
	traitKeywords: string[];
	stealthy: boolean;
	armored: boolean;
	resilient: boolean;
	menacing: boolean;
	packBonded: boolean;
	solitary: boolean;
}

// prepare()'s options bag (creatureOnTable.prepare / holdAtSite)
export interface PrepareOptions {
	rules?: Rules | RulesInput | null;
	bolstered?: boolean;
	bolsterScale?: number;
	packBondedKinAtSite?: number;
	solitaryAlliesAtSite?: number;
}

// ---------------------------------------------------------------------------
// the board (expeditionRules.ts)
// ---------------------------------------------------------------------------

// one creature standing at one site, engine-owned mutable state (assumption 5:
// currentHold is a real number, reduced by blows and recomputed whenever the site's
// company changes)
export interface BoardEntry {
	recordId: string;
	record: XalianRecord;
	player: Seat;
	siteId: string;
	hidden: boolean;
	sentIndex: number;
	downed: boolean;
	fullHold: number;
	currentHold: number;
	damage: number;
	role: Role;
	hurt: boolean;
	bolstered: boolean;
	// set by resolve() the instant a round's hidden creatures reveal, so ordering and the
	// log can still tell which entries came in hidden this round
	wasHidden?: boolean;
}

// board[siteId][seat]
export type SiteBoard = Record<Seat, BoardEntry[]>;
// the whole match board: board[siteId] -> { A: [...], B: [...] }
export type Board = Record<string, SiteBoard>;

export interface PlayerState {
	roster: XalianRecord[];
	sentCount: number;
	holding: string[];
	downed: string[];
	withdrawn: string[];
	returned: string[];
	passed: boolean;
	firstPasser: boolean;
	sitesWon: number;
	stakeUsed: boolean;
}

export type MatchPhase = 'deploy' | 'resolve' | 'matchEnd';

// the resolution log is a heterogeneous stream of narration events (send/pass have none;
// 'stake' | 'swift-move' | 'attack' | 'shield' | 'sweep' | 'recover' | 'judge' each carry a
// different payload built inline where they are logged). A discriminated union would need
// to be invented rather than sourced, so this stays a permissive shape keyed by `type`;
// every reader already narrows on `type` and specific fields before use, exactly as the
// original JS did.
export interface LogEvent {
	type: string;
	[key: string]: unknown;
}

export interface MatchState {
	seed: string | number;
	rngState: number;
	rules: Rules;
	frames: Frame[];
	frameIndex: number;
	players: Record<Seat, PlayerState>;
	board: Board;
	swiftMoved: Record<Seat, string[]>;
	sentThisFrame: Record<Seat, number>;
	trailingBonus: Record<Seat, number>;
	phase: MatchPhase;
	starter: Seat;
	turn: Seat | null;
	resolutionLog: LogEvent[];
	winner: Seat | null;
	matchEndReason: string | null;
	lastJudgeResult?: unknown;
}

// getPublicState()'s per-side view
export interface PublicPlayerView {
	rosterCount: number;
	sentCount: number;
	holding: string[];
	withdrawn: string[];
	downed: string[];
	passed: boolean;
	sitesWon: number;
	hiddenSentThisRound: number;
	stakeUsed: boolean;
	sendableCap: number;
	// present only on the handler's own view (isSelf)
	roster?: XalianRecord[];
	movableRecordIds?: string[];
	stakeableSiteIds?: string[];
	returned?: string[];
}

export interface PublicBoardEntry {
	recordId: string;
	record: XalianRecord;
	sentIndex: number;
	hidden: boolean;
	currentHold: number;
	fullHold: number;
	damage: number;
	role: Role;
	hurt: boolean;
	downed: boolean;
	speed: number;
	bolstered: boolean;
}

export interface PublicState {
	frameIndex: number;
	rules: Rules;
	frame: Frame;
	nextFrame: Array<{ planet: string; element: string; siteId: string; siteName: string }> | null;
	phase: MatchPhase;
	turn: Seat | null;
	starter: Seat;
	board: Record<string, Record<Seat, PublicBoardEntry[]>>;
	stakes: Record<string, { by: Seat[]; countedValue: number }>;
	hiddenSendCost: number;
	resolutionLog: LogEvent[];
	lastJudgeResult: unknown;
	winner: Seat | null;
	you: Seat;
	opponent: Seat;
	players: Record<Seat, PublicPlayerView>;
}

// ---------------------------------------------------------------------------
// the bot (expeditionBot.ts)
// ---------------------------------------------------------------------------

export interface RivalWeights {
	flipValue: number;
	secureValue: number;
	stackDiscount: number;
	holdCost: number;
	hiddenHoldGuess: number;
	readSharpness: number;
	anticipation: number;
	minSendValue: number;
	overspendAllowance: number;
	nearWindow: number;
	baitPass: number;
	stakeEagerness: number;
}

export interface Rival {
	id: string;
	tag?: string;
	name?: string;
	faction?: string;
	home?: string;
	style?: string;
	measured?: { vsProctor: number };
	weights?: Partial<RivalWeights>;
}

// scoreSends' per-(creature, site) candidate. The hiding fields it used to carry went with
// the hide decision itself in pass 4b (assumption 27): a stealthy creature arrives hidden.
export interface SendCandidate {
	record: XalianRecord;
	site: FrameSite;
	prepared: PreparedCreature;
	margin: number;
	value: number;
	flips: boolean;
	cost: number;
	roleValue: number;
	effect: number;
	role: Role;
}

export interface ScoredSends {
	candidates: SendCandidate[];
	best: SendCandidate | null;
	margins: Record<string, number>;
	weights: RivalWeights;
	sendableCap: number;
	remainingSends: number;
	capRemaining: number;
	framesAfterThis: number;
	sitesWinning: number;
	sitesLosing: number;
	mustHold: boolean;
	myOnBoard: number;
	evenShare: number;
}

export type BotAction =
	| { type: 'send'; recordId: string; siteId: string; hidden: boolean }
	| { type: 'move'; recordId: string; siteId: string; reason: string }
	| { type: 'pass'; reason: string };

export interface StakeChoice {
	type: 'stake';
	siteId: string;
	edge: number;
}

// a caller's RNG stream (roster.ts's shuffle, the bot's near-equal pick, the devtools
// simulators' policies) - one float() per draw, [0, 1)
export interface RngLike {
  float(): number;
}

// readUnseen()'s return: a per-site unseen-hold map, plus two non-enumerable extras
// (`shares`, `unseen`) devtools and the table's advice read off it. An intersection type
// so ordinary per-site indexing (`read[siteId]`) still reads as a plain number map.
export type UnseenRead = Record<string, number> & { shares: Record<string, number>; unseen: number };

// note: FavoredActSpec (favoredAct's archetype-table entry) is defined in
// expeditionInterpretation.ts, next to FAVORED_ACT_BY_ARCHETYPE and getFavoredActSpec,
// rather than here - callers that need the type get it by inference from
// getFavoredActSpec's own return type, so it is not duplicated in this file.

// ---------------------------------------------------------------------------
// draft (draft.ts)
// ---------------------------------------------------------------------------

export interface DraftWorldRow {
	planet: string;
	element: string;
	hold: number;
	isHome: boolean;
	strainLevel: StrainLevel;
	blowMagnitude: number;
	bolsterLift: number;
}

// rateForDraft's return: a creature's whole draft value, hold plus its role's worth,
// across the nine worlds of a Proving
export interface DraftRating {
	best: number;
	mean: number;
	homes: number;
	role: Role;
	roleValue: number;
	rating: number;
	byWorld: DraftWorldRow[];
}

export interface DraftOptions {
	rules?: Rules | RulesInput | null;
	poolMeanBlow?: number;
}

export interface DraftPools {
	poolA: XalianRecord[];
	poolB: XalianRecord[];
	frames: Frame[];
}
