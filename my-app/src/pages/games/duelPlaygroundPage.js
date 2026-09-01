import React from 'react';
import XalianNavbar from '../../components/navbar';
import DuelSpecimenBoard from '../../components/games/duel/playground/duelSpecimenBoard';
import DuelRosterRail from '../../components/games/duel/board/duelRosterRail';
import AttackMoveChooserModal from '../../components/games/duel/board/attackMoveChooserModal';
import XalianTypeSymbolBadge from '../../components/games/duel/board/xalianTypeSymbolBadge';
import { verdictFor } from '../../components/games/duel/board/duelTargetLayer';
import * as duelPieceBuilder from '../../gameplay/duel/duelPieceBuilder';
import * as duelConstants from '../../gameplay/duel/duelGameConstants';
import * as duelValueTranslator from '../../gameplay/duel/duelValueTranslator';
import * as retrievalUtil from '../../utils/retrievalUtil';
import tokens from '../../constants/designTokens';

/**
 * DUEL - AFFORDANCE REFERENCE.
 *
 * The arena's own design system, laid out flat.
 *
 * Everything the board can say is drawn here at once, in every state it can be
 * in, from one page. The alternative was playing a match until the state you
 * wanted to look at happened to occur, which is a slow way to compare two marks
 * and an impossible way to compare fourteen.
 *
 * It renders the real components against the real stylesheet, so it cannot
 * flatter the design: if a mark reads badly here it reads badly in a match.
 * Deliberately unlinked from the navbar, like /styleguide - this is a tool for
 * working on the game, not part of it.
 */

const OWN = duelConstants.PLAYER_ONE_COLOR;
const FOE = duelConstants.PLAYER_TWO_COLOR;

const SECTIONS = [
	{ id: 'channels', index: '01', name: 'Channels' },
	{ id: 'floor', index: '02', name: 'Floor and Flags' },
	{ id: 'movement', index: '03', name: 'Movement' },
	{ id: 'pieces', index: '04', name: 'Pieces' },
	{ id: 'targeting', index: '05', name: 'Targeting' },
	{ id: 'rail', index: '06', name: 'Roster Rail' },
	{ id: 'instruments', index: '07', name: 'Instruments' },
	{ id: 'dialogs', index: '08', name: 'Dialogs' },
	{ id: 'scenarios', index: '09', name: 'Scenarios' },
	{ id: 'tokens', index: '10', name: 'Token Studies' },
];

/** the five readings the type matrix can produce, in the order they get worse */
const VERDICTS = [2, 1.5, 1, 0.5, 0];

class DuelPlaygroundPage extends React.Component {

	state = {
		cellSize: 62,
		squad: null,
		showChooser: false,
		expandedXalianId: null,
		viewport: typeof window !== 'undefined' ? window.innerWidth : 1600,
	};

	componentDidMount() {
		// a fixed slice rather than a shuffle: a reference sheet that shows
		// different creatures on every reload is not a reference sheet
		let samples = retrievalUtil.getMockXalianList() || [];
		let squad = samples.slice(0, 12).map(duelPieceBuilder.buildDuelPiece);
		this.setState({ squad });
		window.addEventListener('resize', this.handleResize);
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.handleResize);
	}

	handleResize = () => this.setState({ viewport: window.innerWidth });

	/**
	 * The cell size a board of this many columns can actually have here.
	 *
	 * The slider sets an intent, not a result: an 8x8 at the default 62px is 408
	 * pixels of board inside a 390 pixel phone, which put the whole page into
	 * horizontal scroll. Every specimen is clamped to the width its column really
	 * has, so the slider stays a preference and the layout stays honest.
	 */
	cellFor(columns) {
		const GUTTER = 96;      // page padding plus the tray's own frame
		const avail = Math.max(160, this.state.viewport - GUTTER);
		return Math.max(22, Math.min(this.state.cellSize, Math.floor(avail / columns)));
	}

	/** a piece with its vitals set where we want them, without touching the source */
	at = (i, health, stamina) => {
		let base = this.state.squad[i % this.state.squad.length];
		return {
			...base,
			state: {
				health: health == null ? duelConstants.MAX_HEALTH_POINTS : health,
				stamina: stamina == null ? duelConstants.MAX_STAMINA_POINTS : stamina,
			},
		};
	}

	/* ------------------------------------------------------------------ chrome */

	renderSectionHead(section, note) {
		return (
			<header className="sg-section-head">
				<span className="sg-section-index g-mono">{section.index}</span>
				<h2 className="g-h2">{section.name}</h2>
				{note && <p className="g-body sg-section-note">{note}</p>}
			</header>
		);
	}

	renderSubhead(title, note) {
		return (
			<div className="dp-subhead">
				<h3 className="g-h3 dp-subhead-title">{title}</h3>
				{note && <p className="g-body dp-subhead-note">{note}</p>}
			</div>
		);
	}

	/* ------------------------------------------------------------- 01 channels */

	renderChannels(section) {
		const size = this.cellFor(5);
		const channels = [
			{
				name: 'Amber', means: 'Ground you may take',
				body: 'Permission. One traced outline over the whole reachable area, filled faintly, with a pip on each square you can actually land on. The square the piece is standing on is inside the shape so the region reads as one piece of ground, but carries no pip, because staying put is not a move.',
				swatch: 'var(--g-lamp-amber)',
			},
			{
				name: 'Red', means: 'What you may strike',
				body: 'Warning. A firing solution struck across the floor from the piece in your hand to each thing it can reach, and the target square marked out in registration ticks. Red rather than amber because these two overlap constantly and a warning must not look like a permission.',
				swatch: 'var(--g-lamp-red)',
			},
			{
				name: 'Team', means: 'Who you are commanding',
				body: 'Identity. Every piece wears its side on the rim of its token base. The one you have picked up has that rim energised and throws a pool of its own colour onto the floor beneath it. Nothing else on the board is allowed to use these two hues.',
				swatch: `linear-gradient(90deg, ${OWN} 50%, ${FOE} 50%)`,
			},
		];

		return (
			<section className="sg-section" id={section.id}>
				{this.renderSectionHead(section, 'Three channels, and only three. An earlier pass had thirteen things drawing on the board at once, which meant that pointing at a piece changed most of the screen and none of it legibly. Each channel below owns one question a player asks.')}

				<div className="dp-channels">
					{channels.map(c => (
						<div className="g-panel dp-channel" key={c.name}>
							<span className="dp-channel-swatch" style={{ background: c.swatch }} />
							<p className="g-label dp-channel-name">{c.name}</p>
							<p className="dp-channel-means">{c.means}</p>
							<p className="g-body dp-channel-body">{c.body}</p>
						</div>
					))}
				</div>

				<div className="dp-row">
					<DuelSpecimenBoard columns={5} cellSize={size}
						caption="All three at once"
						note="Selected piece, its reach, and the one enemy in range."
						pieces={[
							{ index: 12, xalian: this.at(0), team: 'own', selected: true },
							{ index: 9, xalian: this.at(1), team: 'foe', targetable: true },
							{ index: 3, xalian: this.at(2), team: 'foe' },
						]}
						move={{ indices: [7, 11, 13, 17, 6, 8, 16, 18], origin: 12 }}
						originIndex={12}
						targets={[{ index: 9, verdict: verdictFor(1.5) }]} />
				</div>
			</section>
		);
	}

	/* ---------------------------------------------------------------- 02 floor */

	renderFloor(section) {
		const size = this.cellFor(5);
		return (
			<section className="sg-section" id={section.id}>
				{this.renderSectionHead(section, 'The tray, the floor and the two objects that sit on it before any creature does. The floor is generated in CSS - it used to be a JPG hotlinked from somebody\'s blog, which made a stranger\'s server a production dependency of the game.')}

				<div className="dp-row">
					<DuelSpecimenBoard columns={5} cellSize={size}
						caption="Empty floor"
						note="Scoring cut into stone, lit along the upper lip." />

					<DuelSpecimenBoard columns={5} cellSize={size}
						caption="Flags at rest"
						note="One per side, on the row in front of each home row."
						flags={[{ index: 2, team: 'own' }, { index: 22, team: 'foe' }]} />

					<DuelSpecimenBoard columns={5} cellSize={size}
						caption="Lattice around a piece"
						note="The scoring runs behind a token rather than stopping at it."
						pieces={[{ index: 12, xalian: this.at(3), team: 'own' }]} />
				</div>
			</section>
		);
	}

	/* ------------------------------------------------------------- 03 movement */

	renderMovement(section) {
		const size = this.cellFor(5);
		const cases = [
			{
				caption: 'One square', note: 'A piece with distance 1.',
				pieces: [{ index: 12, xalian: this.at(0), team: 'own', selected: true }],
				move: { indices: [7, 11, 13, 17], origin: 12 },
			},
			{
				caption: 'Full diamond', note: 'Distance 3, nothing in the way. Every corner is a curve, inside and out.',
				pieces: [{ index: 12, xalian: this.at(1), team: 'own', selected: true }],
				move: { indices: [2, 6, 7, 8, 10, 11, 13, 14, 16, 17, 18, 22, 1, 3, 5, 9, 15, 19, 21, 23], origin: 12 },
			},
			{
				caption: 'Blocked', note: 'Pieces block movement, so the region wraps them. This is the shape per-cell borders could not draw: the joints stayed square while the arms went soft.',
				pieces: [
					{ index: 12, xalian: this.at(2), team: 'own', selected: true },
					{ index: 11, xalian: this.at(3), team: 'own' },
					{ index: 7, xalian: this.at(4), team: 'foe' },
				],
				move: { indices: [13, 17, 8, 16, 18, 14, 22, 21, 23], origin: 12 },
			},
			{
				caption: 'Region with a hole', note: 'A square you cannot enter, with reachable ground all around it, comes out as a hole. That falls out of the even-odd fill rule rather than being special-cased.',
				pieces: [
					{ index: 12, xalian: this.at(5), team: 'own', selected: true },
					{ index: 7, xalian: this.at(6), team: 'foe' },
				],
				move: { indices: [2, 6, 8, 10, 11, 13, 14, 16, 17, 18, 22, 1, 3, 5, 9, 15, 19, 21, 23], origin: 12 },
			},
			{
				caption: 'Carrying the flag', note: 'A carrier is capped at two squares a turn, so a fast grab still has to survive the walk home.',
				pieces: [{ index: 12, xalian: this.at(7), team: 'own', selected: true, carrying: true, flagTeam: 'foe' }],
				move: { indices: [7, 11, 13, 17, 2, 6, 8, 10, 14, 16, 18, 22], origin: 12 },
			},
			{
				caption: 'Inspecting, not commanding', note: 'A dashed hollow outline with no fill. Deliberately a different statement rather than a fainter one - the old version was the same mark at lower opacity, which only read as dimmer for reasons unknown.',
				pieces: [{ index: 12, xalian: this.at(8), team: 'foe', referenced: true }],
				referencedMove: { indices: [7, 11, 13, 17, 6, 8, 16, 18], origin: 12 },
			},
		];

		return (
			<section className="sg-section" id={section.id}>
				{this.renderSectionHead(section, 'Where a piece may go, traced as a single outline over the whole reachable area rather than drawn square by square. Built per cell it could round its convex corners and nothing else: a concave corner is drawn by two different cells meeting at right angles, and neither can shorten itself to make room for a curve.')}

				<div className="dp-row">
					{cases.map(c => (
						<DuelSpecimenBoard key={c.caption} columns={5} cellSize={size} originIndex={12} {...c} />
					))}
				</div>
			</section>
		);
	}

	/* --------------------------------------------------------------- 04 pieces */

	renderPieces(section) {
		const size = this.cellFor(3);
		const states = [
			{ caption: 'At rest', note: 'Your side.', piece: { team: 'own' } },
			{ caption: 'At rest', note: 'Theirs.', piece: { team: 'foe' } },
			{ caption: 'Commanded', note: 'The console has acquired this specimen. Four brackets fly in from outside and lock on, then hold with a slow breath. They never join up, so there is no box - the corners imply the square and the creature stands in open space.', piece: { team: 'own', selected: true } },
			{ caption: 'Inspected', note: 'Outlined rather than lit. Inspecting is a question, not a command, so it does not spend a fill.', piece: { team: 'foe', referenced: true } },
			{ caption: 'In reach', note: 'Nothing is drawn on the creature - the bracket is on the square, containing it. It needs an attacker to be a study of anything, because reach is a relationship. See section 05.', piece: { team: 'foe', targetable: true }, withTarget: true },
			{ caption: 'Carrying', note: 'The win condition, so it gets the loudest thing the floor has: the square goes hazard-striped in the flag\'s colour. Being the tile rather than the creature, it stacks with being commanded.', piece: { team: 'own', carrying: true, flagTeam: 'foe' } },
		];

		return (
			<section className="sg-section" id={section.id}>
				{this.renderSectionHead(section, 'The square is the instrument and the creature standing in it is cargo. Every state below is a property of the tile rather than furniture attached to the creature, which is what lets them stack - a commanded carrier is a lit tile that is also striped - and what leaves the creature\'s canonical silhouette untouched. Creatures used to be drawn pushed a fifth of a square up out of the ground they stood on, so no mark on the floor could ever appear to contain one; they sit in their squares now.')}

				<div className="dp-row">
					{states.map((s, i) => (
						<DuelSpecimenBoard key={i} columns={3} cellSize={size}
							caption={s.caption} note={s.note}
							pieces={s.withTarget
								? [
									{ index: 4, xalian: this.at(i), ...s.piece },
									{ index: 6, xalian: this.at(i + 1), team: 'own', selected: true },
								]
								: [{ index: 4, xalian: this.at(i), ...s.piece }]}
							originIndex={s.withTarget ? 6 : undefined}
							targets={s.withTarget ? [{ index: 4, verdict: verdictFor(1.5) }] : undefined} />
					))}
				</div>

				{this.renderSubhead('Vitals on hover', 'Point at any piece below. Health reads green, then amber, then red as it falls; stamina reads brass. Neither glows - the hull never emits light in this system.')}
				<div className="dp-row">
					{[[15, 6, 'Untouched'], [9, 4, 'Worn'], [5, 2, 'Hurt'], [2, 1, 'Critical']].map(([h, s, label], i) => (
						<DuelSpecimenBoard key={label} columns={3} cellSize={size}
							caption={label} note={`${h} HP, ${s} stamina.`}
							pieces={[{ index: 4, xalian: this.at(i, h, s), team: 'own' }]} />
					))}
				</div>

				{this.renderSubhead('Element discs', 'All fourteen, as they are pinned to a token: a bulb behind coloured plastic. These hues are fixed points of the design system and are never restyled.')}
				<div className="g-panel dp-elements">
					{Object.keys(tokens.themeColors).map(type => (
						<div className="dp-element" key={type}>
							<XalianTypeSymbolBadge size={38} type={type} />
							<span className="dp-element-name">{type}</span>
						</div>
					))}
				</div>
			</section>
		);
	}

	/* ------------------------------------------------------------ 05 targeting */

	renderTargeting(section) {
		const size = this.cellFor(5);

		return (
			<section className="sg-section" id={section.id}>
				{this.renderSectionHead(section, 'Three earlier passes all failed the same way. Icons on the creature\'s face, then a ring around its body, then an ellipse around its plinth: every one of them decorated the target, and decorating one object cannot say anything about a relationship between two. A ring concentric with a token base is just a second base. Reach is relational, so the mark is: a solution struck from the attacker to the thing it can hit, and the target square registered in the floor\'s own geometry.')}

				{this.renderSubhead('The five verdicts', 'One hue at three intensities. The multiplier is stencilled onto the tile only when it is worth saying - a neutral trade is the default and does not need a number. A matchup you cannot win reads in dead ink rather than in warning red, because it is not a warning; it is a refusal.')}
				<div className="dp-row">
					{VERDICTS.map(v => {
						let verdict = verdictFor(v);
						return (
							<DuelSpecimenBoard key={verdict.key} columns={3} cellSize={size}
								caption={verdict.key === 'even' ? 'Even trade' : verdict.label}
								note={duelValueTranslator.effectivenessScoreToTextConversational(v)}
								pieces={[
									{ index: 6, xalian: this.at(0), team: 'own', selected: true },
									{ index: 2, xalian: this.at(1), team: 'foe', targetable: true },
								]}
								originIndex={6}
								targets={[{ index: 2, verdict }]} />
						);
					})}
				</div>

				{this.renderSubhead('Reach', 'Range is a species trait of one, two or three squares, and it ignores what is in the way: pieces block movement but not attacks. The solution line says so by running straight over whatever is between.')}
				<div className="dp-row">
					<DuelSpecimenBoard columns={5} cellSize={size}
						caption="Range 1" note="Adjacent only."
						pieces={[
							{ index: 12, xalian: this.at(2), team: 'own', selected: true },
							{ index: 11, xalian: this.at(3), team: 'foe', targetable: true },
							{ index: 2, xalian: this.at(4), team: 'foe' },
						]}
						originIndex={12}
						targets={[{ index: 11, verdict: verdictFor(1) }]} />

					<DuelSpecimenBoard columns={5} cellSize={size}
						caption="Several at once" note="Every enemy in reach is drawn, so the choice is a comparison rather than a sequence of hovers."
						pieces={[
							{ index: 12, xalian: this.at(5), team: 'own', selected: true },
							{ index: 2, xalian: this.at(6), team: 'foe', targetable: true },
							{ index: 14, xalian: this.at(7), team: 'foe', targetable: true },
							{ index: 21, xalian: this.at(8), team: 'foe', targetable: true },
						]}
						originIndex={12}
						targets={[
							{ index: 2, verdict: verdictFor(2) },
							{ index: 14, verdict: verdictFor(0.5) },
							{ index: 21, verdict: verdictFor(1) },
						]} />

					<DuelSpecimenBoard columns={5} cellSize={size}
						caption="Shooting past a body" note="The line runs over the blocker because reach does not care about it."
						pieces={[
							{ index: 22, xalian: this.at(9), team: 'own', selected: true },
							{ index: 17, xalian: this.at(10), team: 'own' },
							{ index: 7, xalian: this.at(11), team: 'foe', targetable: true },
						]}
						originIndex={22}
						targets={[{ index: 7, verdict: verdictFor(1.5) }]} />
				</div>

				{this.renderSubhead('Movement and targeting together', 'The two channels overlap constantly, which is the whole reason they are different hues. Amber is ground; red is a body.')}
				<div className="dp-row">
					<DuelSpecimenBoard columns={5} cellSize={size}
						pieces={[
							{ index: 17, xalian: this.at(0), team: 'own', selected: true },
							{ index: 11, xalian: this.at(1), team: 'foe', targetable: true },
							{ index: 18, xalian: this.at(2), team: 'foe', targetable: true },
						]}
						move={{ indices: [12, 16, 22, 7, 13, 21, 23, 2, 14], origin: 17 }}
						originIndex={17}
						targets={[
							{ index: 11, verdict: verdictFor(2) },
							{ index: 18, verdict: verdictFor(0) },
						]} />
				</div>
			</section>
		);
	}

	/* ----------------------------------------------------------------- 06 rail */

	buildBoardState(config) {
		const { unset = [], down = [], flagHolder = null } = config || {};
		return {
			playerStates: [
				{ unsetXalianIds: unset, inactiveXalianIds: down, activeXalianIds: [] },
				{ unsetXalianIds: [], inactiveXalianIds: [], activeXalianIds: [] },
			],
			flags: [
				{ player: 0, index: 3, holder: null },
				{ player: 1, index: 59, holder: flagHolder },
			],
		};
	}

	renderRail(section) {
		const squad = this.state.squad.slice(0, 5).map((x, i) => ({
			...x,
			state: { health: [15, 11, 6, 2, 15][i], stamina: [6, 4, 5, 1, 6][i] },
		}));
		const ids = squad.map(x => x.xalianId);

		const rails = [
			{
				title: 'Setup', note: 'Every piece a side owns has a fixed slot for the whole match. During setup they are all unplaced, and pressing one picks it up.',
				props: { phase: 'setup', boardState: this.buildBoardState({ unset: ids }) },
			},
			{
				title: 'In play', note: 'The same slots, in the same order, now carrying vitals. Nothing reshuffles under the cursor.',
				props: { phase: 'play', boardState: this.buildBoardState({}) },
			},
			{
				title: 'Under pressure', note: 'One down, one carrying the enemy flag, one of yours picked up. This replaced a row that appeared only when something died, which changed the page layout at the worst possible moment.',
				props: {
					phase: 'play',
					boardState: this.buildBoardState({ down: [ids[3]], flagHolder: ids[4] }),
					selectedXalianId: ids[0],
				},
			},
			{
				title: 'Their side, in your sights', note: 'The rail is the same component for the enemy, so what you can reach is legible without hunting across the board for it.',
				props: {
					phase: 'play',
					boardState: this.buildBoardState({}),
					isOwn: false, teamColor: FOE, side: 'right', title: 'Opponent',
					attackableIds: new Set([ids[1], ids[2]]),
					targetVerdicts: { [ids[1]]: verdictFor(2), [ids[2]]: verdictFor(0.5) },
				},
			},
		];

		return (
			<section className="sg-section" id={section.id}>
				{this.renderSectionHead(section, 'One component doing two jobs that used to be done badly by two. The tray you picked unplaced pieces out of during setup lived above the board; a graveyard row appeared below it once something died. Neither told you how the match was going, and the second one moved the board mid-match. Press any slot to open its deeper reading in place - asking what a piece is should not cost you sight of it, which is what the old centred offcanvas did.')}

				<div className="dp-row dp-row--rails">
					{rails.map(r => (
						<div className="dp-rail-case" key={r.title}>
							<DuelRosterRail
								xalians={squad}
								title="Your Squad"
								teamColor={OWN}
								side="left"
								isOwn
								isTurn
								expandedXalianId={this.state.expandedXalianId}
								onSelect={(x) => this.setState({
									expandedXalianId: this.state.expandedXalianId === x.xalianId ? null : x.xalianId,
								})}
								{...r.props} />
							<p className="dp-caption"><span className="duel-specimen-name">{r.title}</span><span className="duel-specimen-note">{r.note}</span></p>
						</div>
					))}
				</div>
			</section>
		);
	}

	/* ---------------------------------------------------------- 07 instruments */

	renderInstruments(section) {
		const strips = [
			{ label: 'Your turn, nothing spent', banner: 'yours', text: 'Your move', moves: 3, attack: 'Ready' },
			{ label: 'Part spent', banner: 'yours', text: 'Your move', moves: 1, attack: 'Ready' },
			{ label: 'Attack spent', banner: 'yours', text: 'Your move', moves: 2, attack: 'Spent' },
			{ label: 'Waiting', banner: 'theirs', text: 'Opponent moving', moves: 0, attack: 'Spent' },
		];

		return (
			<section className="sg-section" id={section.id}>
				{this.renderSectionHead(section, 'A turn is a shared pool of three squares of movement across the whole team plus exactly one attack, in any order. Both budgets are team-wide rather than per piece, which is the single most counter-intuitive rule in the game, so both are on a panel bolted along the bottom of the console where they stay in view.')}

				<div className="dp-row dp-row--stack">
					{strips.map(s => (
						<div className="dp-instrument" key={s.label}>
							<p className="dp-caption"><span className="duel-specimen-name">{s.label}</span></p>
							<p className={`duel-turn-banner duel-turn-banner--${s.banner}`}>{s.text}</p>
							<div className="duel-status-strip dp-status-strip">
								<div className="duel-status-readouts">
									<span className="duel-readout">
										<span className="duel-readout-label">Squad moves</span>
										<span className={`duel-readout-value ${s.moves === 0 ? 'duel-readout-value--spent' : ''}`}>{s.moves}sq</span>
									</span>
									<span className="duel-readout">
										<span className="duel-readout-label">Attack</span>
										<span className={`duel-readout-value ${s.attack === 'Spent' ? 'duel-readout-value--spent' : ''}`}>{s.attack}</span>
									</span>
								</div>
								<div className="duel-status-actions">
									<button type="button" className="g-btn">How to play</button>
									<button type="button" className="g-btn">End turn</button>
								</div>
							</div>
						</div>
					))}

					<div className="dp-instrument">
						<p className="dp-caption"><span className="duel-specimen-name">Match over</span></p>
						<p className="duel-winner-text">You win</p>
					</div>
				</div>
			</section>
		);
	}

	/* -------------------------------------------------------------- 08 dialogs */

	renderDialogs(section) {
		const attacker = this.at(0);
		const defender = this.at(1);

		return (
			<section className="sg-section" id={section.id}>
				{this.renderSectionHead(section, 'Two dialogs interrupt the board. The first is a choice and has to be readable at a glance; the second is a report and has to land. Both are hard to reach in a match, which is exactly why they belong here.')}

				{this.renderSubhead('Firing selector', 'Four generated moves plus a basic attack, each with its plate, its rating and its damage against this defender. Open it below - it is the real dialog, wired to two real pieces.')}
				<div className="dp-row dp-row--stack">
					<button type="button" className="g-btn" onClick={() => this.setState({ showChooser: true })}>
						Open firing selector
					</button>
				</div>

				{this.renderSubhead('Strike report', 'The verdict, stencilled. Upper case with no italics, the way the console labels everything else.')}
				<div className="dp-verdicts">
					{VERDICTS.map(v => (
						<div className="g-panel dp-verdict" key={v}>
							<span className="duel-specimen-name">{verdictFor(v).label}</span>
							<h2 className="duel-action-effect dp-verdict-line">
								{duelValueTranslator.effectivenessScoreToTextConversational(v)}
							</h2>
						</div>
					))}
				</div>

				<AttackMoveChooserModal
					show={this.state.showChooser}
					attacker={attacker}
					defender={defender}
					onCancel={() => this.setState({ showChooser: false })}
					onSelect={() => this.setState({ showChooser: false })} />
			</section>
		);
	}

	/* ------------------------------------------------------------ 09 scenarios */

	renderScenarios(section) {
		const size = Math.round(this.cellFor(8) * 0.78);

		return (
			<section className="sg-section" id={section.id}>
				{this.renderSectionHead(section, 'Full boards, because a mark that survives in isolation can still fail in a crowd. These are the moments a match actually turns on.')}

				<div className="dp-row">
					<DuelSpecimenBoard columns={8} cellSize={size}
						caption="Opening"
						note="Both squads on their home rows, flags at rest, nothing selected."
						flags={[{ index: 11, team: 'own' }, { index: 52, team: 'foe' }]}
						pieces={[
							...[57, 58, 59, 60, 61].map((index, i) => ({ index, xalian: this.at(i), team: 'own' })),
							...[2, 3, 4, 5, 6].map((index, i) => ({ index, xalian: this.at(i + 5), team: 'foe' })),
						]} />

					<DuelSpecimenBoard columns={8} cellSize={size}
						caption="Committed"
						note="Mid board, one of yours picked up, two enemies in reach and a third out of it."
						flags={[{ index: 11, team: 'own' }]}
						pieces={[
							{ index: 35, xalian: this.at(0, 11, 3), team: 'own', selected: true },
							{ index: 27, xalian: this.at(1, 6, 5), team: 'foe', targetable: true },
							{ index: 36, xalian: this.at(2, 15, 6), team: 'foe', targetable: true },
							{ index: 20, xalian: this.at(3, 9, 2), team: 'foe' },
							{ index: 51, xalian: this.at(4, 15, 6), team: 'own' },
							{ index: 60, xalian: this.at(5, 4, 1), team: 'own' },
						]}
						move={{ indices: [34, 43, 26, 42, 44, 33, 41, 49], origin: 35 }}
						originIndex={35}
						targets={[
							{ index: 27, verdict: verdictFor(2) },
							{ index: 36, verdict: verdictFor(0.5) },
						]} />

					<DuelSpecimenBoard columns={8} cellSize={size}
						caption="The run home"
						note="A carrier two squares from your home row, capped at two squares a turn, with an enemy close enough to drop it."
						pieces={[
							{ index: 43, xalian: this.at(6, 8, 4), team: 'own', selected: true, carrying: true, flagTeam: 'foe' },
							{ index: 35, xalian: this.at(7, 15, 6), team: 'foe' },
							{ index: 44, xalian: this.at(8, 12, 5), team: 'foe', targetable: true },
							{ index: 58, xalian: this.at(9, 15, 6), team: 'own' },
						]}
						move={{ indices: [42, 51, 41, 50, 59, 34, 52], origin: 43 }}
						originIndex={43}
						targets={[{ index: 44, verdict: verdictFor(1) }]} />
				</div>
			</section>
		);
	}

	/* -------------------------------------------------------- 10 token studies */

	renderTokens(section) {
		const size = this.cellFor(5);
		const big = Math.round(this.cellFor(8) * 0.8);

		// the same position in every study, so the only variable is the treatment
		const squad = (v) => ({
			variant: v,
			pieces: [
				{ index: 6, xalian: this.at(0), team: 'own' },
				{ index: 12, xalian: this.at(1), team: 'own', selected: true },
				{ index: 8, xalian: this.at(2), team: 'foe' },
				{ index: 18, xalian: this.at(3), team: 'foe' },
			],
		});

		const studies = [
			{
				v: 'milled', name: 'Milled disc',
				note: 'A machined counter in the house style - brass rim, hull face, art stamped into it. The most conservative option: it is the same milled metal as every other control on the site, so it needs no new vocabulary. Team colour has to live somewhere else, which is a real cost.',
			},
			{
				v: 'coin', name: 'Team coin',
				note: 'The disc is the team colour and the creature is knocked out of it. The loudest identity of the four - you can read the whole balance of power at a glance without looking at a single creature. Costs you the element hue on the token face.',
			},
			{
				v: 'element', name: 'Element chip',
				note: 'A hexagonal chip in the element colour of the creature, with the team as a rim. Puts the thing you actually plan around - the type matchup - into the body of the token. Fourteen hues on the board at once is the risk.',
			},
			{
				v: 'standee', name: 'Standee',
				note: 'The miniature, done deliberately: a side-on figure standing off the back of a flattened base, as if seen from a high angle rather than straight down. This is the original intent made consistent - the figure and its base agree about where the camera is.',
			},
		];

		return (
			<section className="sg-section" id={section.id}>
				{this.renderSectionHead(section, 'What a piece physically is. The board is drawn in plan, but every species SVG is a side-on silhouette of a standing animal - so a flat token carrying the creature as printed artwork makes that art correct rather than a compromise: it becomes a picture on a thing rather than a thing. The standee takes the opposite position and commits to the figure. Each study renders the same four pieces, so the treatment is the only variable.')}

				<div className="dp-token-row">
					{studies.map(st => (
						<DuelSpecimenBoard key={st.v} columns={5} cellSize={size}
							caption={st.name} note={st.note} {...squad(st.v)} />
					))}
				</div>

				{this.renderSubhead('In a crowd', 'A treatment that reads in a four-piece study can still fail on a full board, which is where these actually have to work.')}
				<div className="dp-token-row">
					{studies.map(st => (
						<DuelSpecimenBoard key={st.v} columns={8} cellSize={big}
							variant={st.v}
							caption={st.name}
							flags={[{ index: 11, team: 'own' }, { index: 52, team: 'foe' }]}
							pieces={[
								...[57, 58, 59, 60, 61].map((index, i) => ({ index, xalian: this.at(i), team: 'own' })),
								...[2, 3, 4, 5, 6].map((index, i) => ({ index, xalian: this.at(i + 5), team: 'foe' })),
								{ index: 35, xalian: this.at(2), team: 'own', selected: true },
								{ index: 27, xalian: this.at(7), team: 'foe' },
							]} />
					))}
				</div>
			</section>
		);
	}

	/* ----------------------------------------------------------------- render */

	render() {
		if (!this.state.squad) {
			return (
				<div className="g-console">
					<XalianNavbar />
					<div className="g-shell sg-page"><p className="g-body">Loading specimens...</p></div>
				</div>
			);
		}

		return (
			<div className="g-console">
				<XalianNavbar />

				<div className="g-shell sg-page dp-page">

					<header className="sg-masthead">
						<p className="g-label">Duel</p>
						<h1 className="g-title">Arena Affordance Reference</h1>
						<p className="g-body">
							Everything the duel board can say, drawn at once. The arena is normally rendered
							from a live game, so the only way to look at a state was to play a match until it
							happened: until something was carrying a flag, until a piece was down to two health,
							until an immune matchup came up. That is a slow way to compare two marks and an
							impossible way to compare fourteen.
						</p>
						<p className="g-body">
							Every board below is the real component against the real stylesheet, handed a
							position instead of a game. Nothing here is a mock, so nothing here can flatter the
							design: if a mark reads badly on this page it reads badly in a match.
						</p>

						<div className="dp-controls g-panel">
							<label className="g-label dp-control">
								Cell size
								<input type="range" className="g-range" min="40" max="96" value={this.state.cellSize}
									onChange={(e) => this.setState({ cellSize: parseInt(e.target.value) })} />
								<span className="g-mono dp-control-value">{this.state.cellSize}px</span>
							</label>
						</div>
					</header>

					<nav className="sg-index">
						{SECTIONS.map(s => (
							<a className="sg-index-item" href={`#${s.id}`} key={s.id}>
								<span className="sg-index-num g-mono">{s.index}</span>
								<span className="sg-index-name">{s.name}</span>
							</a>
						))}
					</nav>

					{this.renderChannels(SECTIONS[0])}
					{this.renderFloor(SECTIONS[1])}
					{this.renderMovement(SECTIONS[2])}
					{this.renderPieces(SECTIONS[3])}
					{this.renderTargeting(SECTIONS[4])}
					{this.renderRail(SECTIONS[5])}
					{this.renderInstruments(SECTIONS[6])}
					{this.renderDialogs(SECTIONS[7])}
					{this.renderScenarios(SECTIONS[8])}
					{this.renderTokens(SECTIONS[9])}

				</div>
			</div>
		);
	}
}

export default DuelPlaygroundPage;
