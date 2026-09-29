import React from 'react';
import ReclamationFigure, { ReclamationSilhouette } from './reclamationFigure';
import XalianImage from '../../xalianImage';
import { pieceShadowFilter } from '../duel/board/duelPieceToken';
import { SwiftGlyph, MediumGlyph, CompanyGlyph, PIECE_RIM } from './reclamationGlyphs';
import { formatHoldShown, countWord, captionOwned, speciesLabel } from './reclamationNarration';
import { reasonLines, ReasonLines } from './reclamationReasons';
import { elementOf } from './reclamationVocabulary';
import { Standing, standingSentence, WhyMarks } from './reclamationInstruments';
import { getSpeciesTypeSymbol } from '../../../utils/svgUtil';

/*
	ReclamationWorld — the frame: three worlds side by side, each at one of its sites.

	Each site is a matte panel headed by the planet's name. The handler's creatures stand
	below the midline facing up; the rival's stand above it facing down.

	PASS 52, THE GLANCE REDESIGN (docs/design/reclamation-glance-redesign.md). No "rival"
	and "you" tags, no margin sentence, no footing count, no "best here" names: whose a
	creature is reads from which side of the seam it stands on, and what each of yours
	would do here is on its own card (the fit strip).

	PASS 54, THE STANDING (docs/design/reclamation-world-standing.md). Who is winning a
	world, and by how much, is two bars in the seam between the ranks, the rival's above
	yours on one scale shared by the three worlds (reclamationInstruments' Standing). It
	replaced pass 52's front line, which split the whole field by share and so drew every
	send into an empty world the same, and the preview token and the corner totals with it.
	A creature pointed at or lifted grows your bar by what it would add and marks every
	figure here with what its send would cost.

	Every number shown is passed in already computed by the engine (prepare(),
	forecastClash(), forecastSend()): this component derives nothing.

	PASS 3, THE STAKE (assumption 22). A tray head carries a "Stake" control while its
	world is one this handler may still stake, and a mark saying what a staked world now
	counts. Neither is a decision this component makes: `stakeableSiteIds` is the engine's
	own list of legal stakes and `stakes` is its own per-site arithmetic, and pressing the
	control only asks the table to put the question. The question itself is answered on the
	status strip, so the worlds stay on screen while it is answered.
*/

/*
	The environment as a picture: one temperature scale shared by every site (the coldest
	and hottest bands any site in the table has), with the site's band drawn on it, and
	the medium as a glyph. While a creature is previewed its own tolerance band is drawn
	over the site's, so strain is seen as the two bands missing each other rather than
	read as a word.
*/
export const SCALE_MIN_C = -110;
export const SCALE_MAX_C = 130;

function pctOnScale(c) {
	const clamped = Math.max(SCALE_MIN_C, Math.min(SCALE_MAX_C, c));
	return ((clamped - SCALE_MIN_C) / (SCALE_MAX_C - SCALE_MIN_C)) * 100;
}

export function EnvironmentScale({ site, ghost, why }) {
	const env = (site && site.environment) || {};
	// pass 57: the reason mark the card's column carries, beside the bands it comes from
	const climate = why && why.climate ? why.climate : null;
	const t = env.temperatureC || {};
	const hasBand = typeof t.min === 'number' && typeof t.max === 'number';
	const tol = ghost && ghost.tolerance;
	const own = tol && tol.temperatureC && typeof tol.temperatureC.min === 'number' ? tol.temperatureC : null;
	const mediumOk = !tol ? null
		: (tol.breathes.length > 0 && env.medium && !tol.breathes.includes(env.medium)) ? 'cannot'
			: (env.medium && !tol.ambientMedia.includes(env.medium)) ? 'strained' : 'ok';
	const medium = env.medium ? String(env.medium) : 'unknown';
	const bandText = hasBand ? `${t.min} to ${t.max}\u00b0C` : 'unrecorded band';
	const ownText = own ? `; the creature tolerates ${own.min} to ${own.max}\u00b0C` : '';
	return (
		<div className={`rec-env${ghost ? ` rec-env--${ghost.strainLevel}` : ''}`} title={`${medium}, ${bandText}${ownText}`}>
			<span className={`rec-env-medium rec-env-medium--${medium}${mediumOk ? ` rec-env-medium--${mediumOk}` : ''}`} aria-label={`${medium} medium`}>
				<MediumGlyph medium={medium} />
			</span>
			<span className="rec-env-scale" aria-hidden="true">
				<span className="rec-env-zero" style={{ left: `${pctOnScale(0)}%` }} />
				{hasBand && (
					<span className="rec-env-band rec-env-band--site" style={{ left: `${pctOnScale(t.min)}%`, width: `${pctOnScale(t.max) - pctOnScale(t.min)}%` }} />
				)}
				{/* pass 37: placed by transform, so previewing one creature after another moves paint, not layout */}
				{own && (
					<span className="rec-env-band rec-env-band--creature" style={{ transform: `translateX(${pctOnScale(own.min)}cqw)`, width: `${Math.max(0.8, pctOnScale(own.max) - pctOnScale(own.min))}%` }} />
				)}
			</span>
			<span className="rec-env-readout g-mono">{hasBand ? `${t.min} to ${t.max}\u00b0C` : 'no band'}</span>
			<span className="rec-env-why" data-env-why={climate ? climate.cause || 'strained' : undefined}>
				{climate && <WhyMarks reasons={{ climate }} />}
			</span>
		</div>
	);
}

/*
	THE STAKE, on the tray head (Pass 3, assumption 22). A world this handler may still
	stake carries a small "Stake" control; a world already staked carries a mark saying
	what it now counts, in the colour of whoever staked it, and in both colours when both
	handlers staked the same one. Everything here is the engine's own arithmetic: the
	`stakes` block of the public state carries `by` and `countedValue` per site, so the
	head never counts anything itself.
*/
export function StakeMark({ stake, you }) {
	if (!stake || !stake.by || stake.by.length === 0) {
		return null;
	}
	const mine = stake.by.includes(you);
	const theirs = stake.by.some((seat) => seat !== you);
	const who = mine && theirs ? 'both' : mine ? 'mine' : 'theirs';
	const byText = who === 'both' ? 'staked by both handlers' : who === 'mine' ? 'staked by you' : 'staked by the rival';
	return (
		<span
			className={`rec-staked rec-staked--${who}`}
			data-staked={who}
			data-staked-value={stake.countedValue}
			title={`${byText}: it counts ${countWord(stake.countedValue)} toward the Charter for whoever holds it at the Ruling.`}
		>
			counts {countWord(stake.countedValue)}
		</span>
	);
}

function ReclamationWorld({
	frame,
	board,
	you,
	holds,
	hurt,
	ghosts,
	verdicts,
	armedRecordId,
	movingRecordId,
	onSiteClick,
	onSiteHover,
	onFigureClick,
	clickable,
	holdingIds,
	hiddenEnemyCount,
	forecast,
	standings,
	standingScale,
	preview,
	highlights,
	clashSiteId,
	deploying,
	arrival,
	hoverSiteId,
	advanced,
	stakes,
	stakeableSiteIds,
	pendingStakeSiteId,
	onStake,
}) {
	const opponent = you === 'A' ? 'B' : 'A';
	const hl = highlights || {};
	// pass 28: while a world is clashing the other two recede, so the eye has somewhere
	// to go. Only ever set during playback, and released at the Court's ruling.
	const clashing = clashSiteId || null;

	/*
		PASS 30. The entrance is worn for its own duration and then taken off, so the camera
		(pass 28) can come and go without the panel re-entering from opacity zero behind the
		Court's verdict. Keyed off the component's own mount rather than off any phase.
	*/
	const [entered, setEntered] = React.useState(true);
	React.useEffect(() => {
		// 460ms animation plus the longest per-panel stagger (2 x 110ms), with room
		const timer = setTimeout(() => setEntered(false), 900);
		return () => clearTimeout(timer);
	}, []);
	const arrivedIds = arrival ? arrival.ids : [];
	const stakeable = new Set(stakeableSiteIds || []);

	return (
		<div className="rec-world">
			{/* pass 52: a hidden rival send is a silhouette and a count; the sentence is its title */}
			{hiddenEnemyCount > 0 && (
				<div
					className="rec-hidden-banner rec-rise"
					data-hidden-banner
					title={`The rival has ${hiddenEnemyCount === 1 ? 'a creature' : `${hiddenEnemyCount} creatures`} hidden somewhere in this round. It is revealed when the worlds clash, and is not in the totals.`}
				>
					<ReclamationSilhouette count={hiddenEnemyCount} />
				</div>
			)}
			{/*
				PASS 56, THE SCENE (Nick, 2026-09-23: "make a big cinematic scene out of it for each
				of the worlds as all the attacks play out"). A world fights to its end before the next
				begins, so while one clashes it takes the table: its column opens to most of the width,
				its figures grow with it (they size to their rank), and the worlds waiting their turn
				narrow at its sides. Released at the Ruling, when all three are read side by side.
			*/}
			<div
				className={`rec-sites${clashing ? ' rec-sites--arena' : ''}`}
				data-arena={clashing ? Math.max(0, frame.sites.findIndex((s) => s.id === clashing)) : undefined}
			>
				{frame.sites.map((site, siteIndex) => {
					const theirs = (board[site.id][opponent] || []).filter((e) => e.record);
					const mine = (board[site.id][you] || []).filter((e) => e.record);
					const empty = theirs.length === 0 && mine.length === 0;
					const ghost = ghosts && ghosts[site.id];
					const verdict = verdicts && verdicts[site.id];
					const stake = stakes && stakes[site.id];
					const stakedHere = !!(stake && stake.by && stake.by.length > 0);
					const canStake = !!onStake && stakeable.has(site.id);
					const front = (standings && standings[site.id]) || { theirs: 0, mine: 0, theirsBefore: 0, mineBefore: 0 };
					const previewHere = preview && preview[site.id];
					const lead = Math.abs(front.theirs - front.mine) < 0.05
						? (front.theirs + front.mine > 0.05 ? 'level' : 'empty')
						: front.theirs > front.mine ? 'theirs' : 'mine';

					const classes = ['g-panel', 'rec-site', `rec-site--${lead}`, `g-el-${site.world.element}`];
					if (entered) {
						classes.push('rec-site--enter');
					}
					// the site something just landed on pulses in the colour of who sent it
					if (arrival && arrival.siteId === site.id) {
						classes.push(arrival.seat === you ? 'rec-site--landed-mine' : 'rec-site--landed-theirs');
					}
					if (empty) {
						classes.push('rec-site--empty');
					}
					if (clickable) {
						classes.push('rec-site--clickable');
					}
					if (ghost || movingRecordId) {
						classes.push('rec-site--targeted');
					}
					if (armedRecordId || movingRecordId) {
						classes.push('rec-site--ready');
					}
					if (verdict) {
						classes.push(`rec-site--verdict-${verdict.who}`);
					}
					if (hoverSiteId === site.id) {
						classes.push('rec-site--hover');
					}
					if (stakedHere) {
						classes.push('rec-site--staked');
					}
					if (pendingStakeSiteId === site.id) {
						classes.push('rec-site--stake-pending');
					}
					if (clashing) {
						classes.push(clashing === site.id ? 'rec-site--clashing' : 'rec-site--waiting');
					}

					/*
						PASS 52. What the Clash would leave each creature at: with a creature pointed
						at or lifted, the forecast of that send (so a strike's victim shows its cut
						before the click); otherwise the board as it stands. Undefined when nothing
						would change, and during the Clash and the Ruling, which show live holds.
						PASS 72: the forecast is the board stacked, with no Clash run, so the only
						number that moves is one a send changes by standing beside it (a bolster's
						lift, a pack's bond, a solitary creature's cost).
					*/
					const siteForecast = previewHere && previewHere.forecast ? previewHere.forecast : forecast;
					const forecastOf = (entry) => {
						const f = siteForecast && siteForecast[entry.recordId];
						const h = holds[entry.recordId];
						if (!f || !h || typeof h.hold !== 'number') {
							return undefined;
						}
						if (f.downed) {
							return 0;
						}
						return Math.abs(f.hold - h.hold) < 0.05 ? undefined : f.hold;
					};

					// the key is passed on the element itself, never inside the spread: React
					// warns loudly about a key arriving through a props object
					const figureProps = (entry, seat, facing) => {
						const h = holds[entry.recordId];
						const after = forecastOf(entry);
						return {
							record: entry.record,
							element: elementOf(entry.record),
							seat,
							you,
							facing,
							hidden: entry.hidden,
							hold: h ? h.hold : undefined,
							printedHold: h ? h.printed : undefined,
							hurt: !!(hurt && hurt[entry.recordId]),
							strainLevel: h ? h.strainLevel : undefined,
							isHome: h ? h.isHome : false,
							// pass 57: the marks a card's column carries, on the creature standing here
							reasons: h ? h.reasons : null,
							unstrainedHold: h ? h.unstrained : undefined,
							baseHold: h ? h.baseHold : undefined,
							// the base redesign's one glyph per creature: what it does at the Clash
							role: h ? h.role : entry.role,
							// the bulb meter is advanced mode's arithmetic; the bar is on every figure
							showMeter: !!advanced,
							fallen: !!entry.fallen,
							// pass 38: a strike of yours at a world with no rival in sight will find no target
							noTarget: seat === you && !!deploying && !!h && h.role === 'strike'
								&& theirs.length === 0 && !(hiddenEnemyCount > 0),
							// pass 73: the blow the creature pointed at would land on this one, at full strength
							blowIn: ghost && ghost.lands && ghost.lands[entry.recordId]
								? { ...ghost.lands[entry.recordId], by: speciesLabel(ghost.record), role: ghost.role, base: ghost.power, byElement: elementOf(ghost.record), toElement: elementOf(entry.record) }
								: null,
							forecast: after,
							// pass 69: a support creature's sentence carries its mend
							blowMagnitude: h ? h.rolePower : undefined,
							selected: armedRecordId === entry.recordId || movingRecordId === entry.recordId,
							// pass 38: not at the Ruling, where the winners of the round were dimmed along with the fallen
							dimmed: !verdict && holdingIds && holdingIds.includes(entry.recordId),
							acting: hl.acting === entry.recordId,
							hit: hl.hit === entry.recordId,
							// pass 32: the engine step, so an animation replays on a repeat actor
							beat: hl.beat,
							hover: hl.hover === entry.recordId,
							flash: hl.hit === entry.recordId ? hl.flash : undefined,
							arrive: arrivedIds.includes(entry.recordId),
							lossText: after !== undefined ? `With this send beside it: ${formatHoldShown(after)}` : undefined,
							onClick: (e) => {
								e.stopPropagation();
								onFigureClick(entry, seat, site);
							},
							title: 'Inspect this creature',
						};
					};

					return (
						<section
							className={classes.join(' ')}
							key={site.id}
							data-site-id={site.id}
							data-site-lead={lead}
							style={{ '--rec-i': siteIndex }}
							aria-label={standingSentence(site.world.planet, front.theirs, front.mine)}
							onClick={clickable ? () => onSiteClick(site.id) : undefined}
							onMouseEnter={onSiteHover ? () => onSiteHover(site.id) : undefined}
							onMouseLeave={onSiteHover ? () => onSiteHover(null) : undefined}
							role={clickable ? 'button' : undefined}
							tabIndex={clickable ? 0 : undefined}
							onKeyDown={clickable ? (e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									onSiteClick(site.id);
								}
							} : undefined}
						>
							<header className="rec-site-head">
								{/* pass 38: the place and the temperature scale are advanced mode; the place's description stays on the name */}
								{/* pass 54: the world's element as its symbol, the mark its natives wear, in the color of its column on every card */}
								<span className="rec-site-symbol" aria-hidden="true">{getSpeciesTypeSymbol(site.world.element, true, 16, 'rec-site-symbol-svg')}</span>
								<h3 className="rec-site-name" title={`${site.name}${site.description ? `. ${site.description}` : ''}`}>{site.world.planet}</h3>
								{advanced && <span className="rec-site-place" title={site.description || undefined}>{site.name}</span>}
								{/*
									PASS 57. The climate in every mode: the flame or snowflake on a card's column
									names this world's heat or cold, so the world shows its band, and a creature
									pointed at lays its own band over it (Nick: "What does it mean that a ghost-type
									creature going to a sand-based world shows a flame icon?").
								*/}
								<span className="rec-env-slot"><EnvironmentScale site={site} ghost={ghost} why={previewHere && previewHere.why ? previewHere.why : null} /></span>
								{/* the stake: what this world counts, or the control that puts it up */}
								<StakeMark stake={stake} you={you} />
								{canStake && (
									<button
										type="button"
										className={`rec-stake-btn${pendingStakeSiteId === site.id ? ' rec-stake-btn--asking' : ''}`}
										data-stake={site.id}
										aria-pressed={pendingStakeSiteId === site.id}
										title={`Stake ${site.world.planet}: counts ${stakedHere ? 'three' : 'two'} worlds for whoever holds it. Once a game, before your first send of a round.`}
										onClick={(e) => {
											e.stopPropagation();
											onStake(site.id);
										}}
									>
										<span className="rec-stake-word">Stake </span>&times;2
									</button>
								)}
							</header>

							{/*
								The rival's rank above, yours below, and between them the seam, which
								carries the world's standing. There are no "rival" and "you" tags: each
								rank's edge color and which side of the seam a creature stands on say
								whose it is.
							*/}
							<div className={`rec-site-field rec-site-floor${empty ? ' rec-site-field--empty' : ''}`}>
								<div className={`rec-rank rec-rank--theirs${theirs.length > 4 ? ' rec-rank--crowded' : ''}`} data-rank="theirs" data-rank-rows={rankGrid(theirs.length)['--rank-rows-n']} data-rank-list={theirs.length >= 2 && theirs.length <= 4 ? '' : undefined} data-rank-rows-wide={rankGrid(theirs.length)['--rank-rows-w']} style={rankGrid(theirs.length)}>
									{theirs.map((entry) => <ReclamationFigure key={entry.recordId} {...figureProps(entry, opponent, 'down')} />)}
								</div>

								<div className={`rec-site-midline${empty ? ' rec-site-midline--empty' : ''}`}>
									<Standing
										siteId={site.id}
										now={front}
										preview={previewHere ? previewHere.totals : null}
										scale={standingScale}
										marks={null}
										verdict={verdict || null}
									/>
									{!ghost && movingRecordId && <span className="rec-ghost rec-ghost--relocate" aria-label="Move here" title="Move here"><SwiftGlyph /></span>}
									{/*
										pass 45: the Clash told where it happens, between the two ranks; keyed
										per step so each line enters fresh. Pass 60: your creatures carry
										"your" in place of a side color, and a bare name is the rival's.
									*/}
									{!ghost && !movingRecordId && clashing === site.id && hl.caption && (
										<span className="rec-clash-caption" key={`cap-${hl.caption.key}`} data-clash-caption={site.id}>
											{captionOwned(hl.caption.parts, you).map((part, i) => (typeof part === 'string'
												? <React.Fragment key={i}>{part}</React.Fragment>
												: (
													<React.Fragment key={i}>
														{part.whose}
														<b className={`rec-clash-name rec-clash-name--${part.seat === you ? 'you' : part.seat ? 'rival' : 'none'}`}>{part.name}</b>
													</React.Fragment>
												)))}
										</span>
									)}
								</div>

								{/*
									PASS 62. While sends are being made, your creatures on a world stand in the left of
									your half, and the right is kept for the creature you point at or lift: its number,
									its chain and its words. Kept for the whole Deploy, so pointing and lifting move
									nothing (pass 36's rule), and let go when the worlds clash.
								*/}
								<div className={`rec-rank rec-rank--mine${mine.length > 4 ? ' rec-rank--crowded' : ''}`} data-rank="mine" data-rank-rows={rankGrid(mine.length)['--rank-rows-n']} data-rank-list={mine.length >= 2 && mine.length <= 4 ? '' : undefined} data-rank-rows-wide={rankGrid(mine.length)['--rank-rows-w']} data-ghost-lane={deploying && mine.length > 0 ? '' : undefined} style={rankGrid(mine.length)}>
									{mine.map((entry) => <ReclamationFigure key={entry.recordId} {...figureProps(entry, you, 'up')} />)}
									{/*
										PASS 57. The creature pointed at or lifted stands in your half of every world
										as it would there: its silhouette at the size of a piece, its number and why,
										big, in the room an empty world was not using. Laid over the rank, so pointing
										never moves a figure.
										PASS 58. The number is its card's: what your side there would gain, and never
										what it takes off the rival (pass 57's "20+14" added the two sides, Nick:
										"Why is it adding my health and the opponent's health?").
										PASS 72: what it adds as the sends stack, with no fight played out.
									*/}
									{ghost && previewHere && previewHere.why && ghost.record && (
										<GhostPiece key={`ghost-${ghost.record.id}`} ghost={ghost} previewHere={previewHere} site={site} beside={mine.length} />
									)}
								</div>
								{clashing === site.id && <BlowTracer acting={hl.acting} hit={hl.hit} beat={hl.beat} />}
							</div>
						</section>
					);
				})}
			</div>
		</div>
	);
}

/*
	PASS 37. A rank is a fixed box, so the figures in it size to the box rather than the box to
	the figures. The rows and columns a rank of n needs are handed to the CSS, which divides
	the rank's own measured size by them (container query units), so a world with eleven
	creatures on one side shows eleven smaller figures in the same space as one large one.
	Two grids are handed over, narrow and wide, and a container query on the rank's own
	width picks between them.
*/
/*
	PASS 64, THE BLOW. The pass 62 critic scored the Clash 3 of 10: "one static caption with a white
	box around the attacker ... nothing shows the hit or the damage." While a world fights, each blow
	is drawn from the creature that throws it to the creature it lands on: a stroke runs out from the
	attacker and ends in a burst on the target, red when the target is yours (red is what the Clash
	takes from you, pass 60), ink when it is the rival's.
*/
function BlowTracer({ acting, hit, beat }) {
	const ref = React.useRef(null);
	const [line, setLine] = React.useState(null);
	React.useLayoutEffect(() => {
		const svg = ref.current;
		const field = svg && svg.parentElement;
		const stageOf = (id) => field && field.querySelector(`[data-record-id="${id}"] .rec-piece-stage`);
		const measure = () => {
			const from = acting && stageOf(acting);
			const to = hit && stageOf(hit);
			if (!field || !from || !to || acting === hit) {
				return null;
			}
			const box = field.getBoundingClientRect();
			const a = from.getBoundingClientRect();
			const b = to.getBoundingClientRect();
			const target = to.closest('[data-record-id]');
			return {
				x1: Math.round(a.left + a.width / 2 - box.left),
				y1: Math.round(a.top + a.height / 2 - box.top),
				x2: Math.round(b.left + b.width / 2 - box.left),
				y2: Math.round(b.top + b.height / 2 - box.top),
				r: Math.round(Math.max(8, Math.min(b.width, b.height) * 0.42)),
				onMine: !!target && target.getAttribute('data-seat') === 'mine',
				beat,
			};
		};
		const first = measure();
		setLine(first);
		if (!first || typeof requestAnimationFrame === 'undefined') {
			return undefined;
		}
		// the world is still opening to take the table when its first blow lands, so the ends follow the creatures while it does
		const started = Date.now();
		let frame = requestAnimationFrame(function follow() {
			const next = measure();
			setLine((prev) => (next && prev && ['x1', 'y1', 'x2', 'y2', 'r'].every((k) => prev[k] === next[k]) ? prev : next));
			if (Date.now() - started < 900) {
				frame = requestAnimationFrame(follow);
			}
		});
		return () => cancelAnimationFrame(frame);
	}, [acting, hit, beat]);
	return (
		<svg ref={ref} className="rec-blow-tracer" aria-hidden="true" data-blow-tracer={line ? (line.onMine ? 'mine' : 'theirs') : undefined}>
			{line && (
				<g key={`blow-${line.beat}`} className={`rec-blow${line.onMine ? ' rec-blow--on-mine' : ''}`}>
					<line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} pathLength="1" />
					<circle className="rec-blow-burst" cx={line.x2} cy={line.y2} r={line.r} />
				</g>
			)}
		</svg>
	);
}

/*
	PASS 62, THE WORDS FITTED BY MEASURE. Pass 61 gave up the silhouette, the why and then the
	words at fixed heights of the half they stand in, measured on that half's outer box. A
	container query reads its inner box, 18 pixels less, so beside your creatures the words never
	showed on a screen under 1920 by 1080, and the why never showed at 1366 by 768, the commonest
	laptop there is. Now the ghost tries each step in turn and keeps the first that sits inside
	its half without covering a creature of yours. Each step gives up one thing:
	  art    the silhouette, which only a tall half ever shows
	  small  the number smaller and the words set closer
	  chain  the chain, whose marks and numbers the words say in full
	  why    what each thing does, not why
	  lines  (pass 68) the last lines one at a time, the fight's first, so the lines that
	         open the list (a world already yours, its home, the climate) are the last to go
	  words  the number and the chain alone, as the last resort
	Beside your creatures the ghost takes the right of your half, which the world keeps for it
	through the Deploy (data-ghost-lane): two or more of yours stood one per row across the whole
	half, and the ghost's number sat on their names.
*/
const SAYS_TRIM = { art: 0, small: 1, chain: 0, why: 0 };
const SAYS_STEPS = [{}, { art: 0 }, { art: 0, small: 1 }, { art: 0, small: 1, chain: 0 }, SAYS_TRIM, { ...SAYS_TRIM, lines: 3 }, { ...SAYS_TRIM, lines: 2 }, { ...SAYS_TRIM, lines: 1 }, { art: 0, small: 1, words: 0 }];

export function saysFits(el) {
	if (!el) {
		return true;
	}
	const box = el.getBoundingClientRect();
	const shown = [...el.children].filter((child) => child.getClientRects().length > 0);
	if (shown.length === 0) {
		return true;
	}
	const top = Math.min(...shown.map((child) => child.getBoundingClientRect().top));
	if (top < box.top - 0.5) {
		return false;
	}
	const rank = el.parentElement;
	if (!rank) {
		return true;
	}
	const over = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
	// the words keep off your creatures entirely; the number and chain off their names and bars
	const words = el.querySelector('.rec-reasons');
	if (words && words.getClientRects().length > 0) {
		const w = words.getBoundingClientRect();
		if ([...rank.querySelectorAll('.rec-figure')].some((figure) => over(w, figure.getBoundingClientRect()))) {
			return false;
		}
	}
	const parts = [...el.querySelectorAll('.rec-ghost-piece-read, .rec-ghost-piece-chain')].filter((part) => part.getClientRects().length > 0).map((part) => part.getBoundingClientRect());
	const marks = [...rank.querySelectorAll('.rec-figure .rec-figure-plate, .rec-figure .rec-figure-foot')].filter((mark) => mark.getClientRects().length > 0).map((mark) => mark.getBoundingClientRect());
	return !parts.some((part) => marks.some((mark) => over(part, mark)));
}

// the first step that fits, found before paint; a new creature, new words or a new size starts over
function useSaysFit(ref, key, count) {
	const [size, setSize] = React.useState('');
	const [fit, setFit] = React.useState({ key: null, size: null, step: 0 });
	const step = fit.key === key && fit.size === size ? fit.step : 0;
	React.useLayoutEffect(() => {
		const el = ref.current;
		if (!el) {
			return;
		}
		if (step < count - 1 && !saysFits(el)) {
			setFit({ key, size, step: step + 1 });
		} else if (fit.key !== key || fit.size !== size) {
			setFit({ key, size, step });
		}
	});
	React.useEffect(() => {
		const rank = ref.current && ref.current.parentElement;
		if (!rank || typeof ResizeObserver === 'undefined') {
			return undefined;
		}
		const observer = new ResizeObserver((entries) => {
			const b = entries[0] && entries[0].borderBoxSize && entries[0].borderBoxSize[0];
			if (b) {
				setSize(`${Math.round(b.inlineSize)}x${Math.round(b.blockSize)}`);
			}
		});
		observer.observe(rank, { box: 'border-box' });
		return () => observer.disconnect();
	}, [ref]);
	return step;
}

/*
	PASS 57. The creature pointed at or lifted stands in your half of every world as it would
	there: its number and why, in the room an empty world was not using, laid over the rank.
	PASS 58: the number is its card's, what your side there would gain, never what it takes off
	the rival. PASS 61: what moves the number, and why, in words. PASS 62: beside creatures of
	yours, it stands in the right of your half, kept for it through the Deploy.
*/
function GhostPiece({ ghost, previewHere, site, beside }) {
	const why = previewHere.why;
	// pass 61: what moves its number here, and why, in words under the chain; pass 72: and the element chart against the rivals here
	const reasons = reasonLines({ why, record: ghost.record, site, tolerance: ghost.tolerance, matchups: ghost.matchups });
	const ref = React.useRef(null);
	const step = useSaysFit(ref, `${ghost.record.id}|${beside}|${reasons.map((line) => line.effect + line.cause).join('|')}`, reasons.length ? SAYS_STEPS.length : 1);
	const says = reasons.length ? SAYS_STEPS[Math.min(step, SAYS_STEPS.length - 1)] : null;
	/*
		PASS 59. How the number is made, in order, under it: its normal hold, each mark with its
		factor, and what it adds to your creatures already there ("+8" beside two figures). The
		factor belongs to the arrival, so it stands before it. PASS 72: the Clash's toll is gone
		from the chain, since nothing is fought until both sides have passed.
	*/
	const marked = !!(why.home || why.worldElement || why.climate || why.selfLift || why.company);
	const going = Number(formatHoldShown(why.going));
	// what it adds to your creatures already there: the rest of its number, so the chain lands on it exactly
	const helps = Number(formatHoldShown(why.gain)) - going;
	const steps = helps !== 0;
	const chain = marked || steps;
	return (
		<span
			ref={ref}
			className={`rec-ghost-piece${beside ? ' rec-ghost-piece--beside' : ''}${reasons.length ? ' rec-ghost-piece--says' : ''}`}
			data-ghost-piece={site.id}
			data-says-fit={says ? step : undefined}
			data-says-art={says && says.art === 0 ? 'off' : undefined}
			data-says-small={says && says.small ? '' : undefined}
			data-says-chain={says && says.chain === 0 ? 'off' : undefined}
			data-says-why={says && says.why === 0 ? 'off' : undefined}
			data-says-lines={says && says.lines ? says.lines : undefined}
			data-says-words={says && says.words === 0 ? 'off' : undefined}
			aria-hidden="true"
		>
			<span className="rec-ghost-piece-art">
				<XalianImage variant="token" speciesName={ghost.record.species} primaryType={elementOf(ghost.record)} padding="0px" fill="black" filter={pieceShadowFilter(PIECE_RIM, 96)} moreClasses="rec-ghost-piece-img" />
			</span>
			<span className="rec-ghost-piece-read">
				<b className="g-mono" data-ghost-gain={why.gain.toFixed(2)}>{signedHold(why.gain)}</b>
			</span>
			{chain && (
				<span className="rec-ghost-piece-chain g-mono" data-ghost-chain>
					{marked && <i className="rec-ghost-piece-body">{formatHoldShown(why.body)}</i>}
					{marked && <WhyMarks reasons={why} className="rec-ghost-piece-whys" factors roomy />}
					{marked && steps && <i className="rec-ghost-piece-arrow" aria-hidden="true">{'→'}</i>}
					{steps && <i className="rec-ghost-piece-going">{going}</i>}
					{helps !== 0 && (
						<i className="rec-ghost-piece-allies" title="What it would add to your creatures already there">
							{`${helps > 0 ? '+' : '−'}${Math.abs(helps)}`}
							<CompanyGlyph />
						</i>
					)}
				</span>
			)}
			<ReasonLines lines={reasons} className="rec-ghost-piece-reasons" />
		</span>
	);
}

// pass 57: what a send would add to your side of a world, as its card's column prints it
function signedHold(v) {
	return v < -0.5 ? `−${formatHoldShown(-v)}` : `+${formatHoldShown(Math.max(0, v))}`;
}

export function rankGrid(n) {
	const count = Math.max(1, n);
	// a narrow rank (a phone's world, about 120px) takes four abreast, a wide one seven
	const narrow = count <= 4 ? 1 : count <= 10 ? 2 : 3;
	// pass 38: two to four in a phone's world stand one per row, each with its name, instead of shrinking abreast
	const list = count >= 2 && count <= 4;
	const wide = count <= 7 ? 1 : count <= 14 ? 2 : 3;
	return {
		'--rank-rows-n': list ? count : narrow,
		'--rank-cols-n': list ? 1 : Math.ceil(count / narrow),
		'--rank-rows-w': wide,
		'--rank-cols-w': Math.ceil(count / wide),
	};
}

export default ReclamationWorld;
