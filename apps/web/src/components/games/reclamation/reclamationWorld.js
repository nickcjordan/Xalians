import React from 'react';
import ReclamationFigure, { ReclamationSilhouette } from './reclamationFigure';
import XalianImage from '../../xalianImage';
import { pieceShadowFilter } from '../duel/board/duelPieceToken';
import { team } from '../../../constants/designTokens';
import { SwiftGlyph, MediumGlyph } from './reclamationGlyphs';
import { formatHoldShown, countWord } from './reclamationNarration';
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
					title={`The rival has ${hiddenEnemyCount === 1 ? 'a creature' : `${hiddenEnemyCount} creatures`} hidden somewhere in this round. It is revealed when the worlds clash, and is not in the forecast.`}
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
							forecast: after,
							blowMagnitude: h ? h.blowMagnitude : undefined,
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
							lossText: after !== undefined ? (after === 0 ? 'Falls in the Clash, as the board stands' : `After the Clash, as the board stands: ${formatHoldShown(after)}`) : undefined,
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
										pass 45: the Clash told where it happens, between the two ranks, each
										name in its side's color; keyed per step so each line enters fresh
									*/}
									{!ghost && !movingRecordId && clashing === site.id && hl.caption && (
										<span className="rec-clash-caption" key={`cap-${hl.caption.key}`} data-clash-caption={site.id}>
											{hl.caption.parts.map((part, i) => (typeof part === 'string'
												? <React.Fragment key={i}>{part}</React.Fragment>
												: <b key={i} className={`rec-clash-name rec-clash-name--${part.seat === you ? 'you' : part.seat ? 'rival' : 'none'}`}>{part.name}</b>))}
										</span>
									)}
								</div>

								<div className={`rec-rank rec-rank--mine${mine.length > 4 ? ' rec-rank--crowded' : ''}`} data-rank="mine" data-rank-rows={rankGrid(mine.length)['--rank-rows-n']} data-rank-list={mine.length >= 2 && mine.length <= 4 ? '' : undefined} data-rank-rows-wide={rankGrid(mine.length)['--rank-rows-w']} style={rankGrid(mine.length)}>
									{mine.map((entry) => <ReclamationFigure key={entry.recordId} {...figureProps(entry, you, 'up')} />)}
									{/*
										PASS 57. The creature pointed at or lifted stands in your half of every world
										as it would there: its silhouette at the size of a piece, what it would move
										the world (its card's number) and why, big, in the room an empty world was
										not using. Laid over the rank, so pointing never moves a figure.
									*/}
									{ghost && previewHere && previewHere.why && ghost.record && (
										<span key={`ghost-${ghost.record.id}`} className={`rec-ghost-piece${mine.length ? ' rec-ghost-piece--beside' : ''}`} data-ghost-piece={site.id} aria-hidden="true">
											<span className="rec-ghost-piece-art">
												<XalianImage variant="token" speciesName={ghost.record.species} primaryType={elementOf(ghost.record)} padding="0px" fill="black" filter={pieceShadowFilter(team.one, 96)} moreClasses="rec-ghost-piece-img" />
											</span>
											<span className="rec-ghost-piece-read">
												<b className="g-mono" data-ghost-swing={previewHere.why.swing.toFixed(2)}>{signedHold(previewHere.why.swing)}</b>
												<WhyMarks reasons={previewHere.why} className="rec-ghost-piece-whys" />
											</span>
											{/* pass 57, after the blind readers: when part of the number comes off the rival, say how much of it is which */}
											{previewHere.why.taken > 0.5 && (
												<span className="rec-ghost-piece-split g-mono" data-ghost-split>
													<i className="rec-ghost-piece-own">{formatHoldShown(Math.max(0, previewHere.why.own + previewHere.why.allies))}</i>
													<span aria-hidden="true"> + </span>
													<i className="rec-ghost-piece-taken">{formatHoldShown(previewHere.why.taken)}</i>
												</span>
											)}
										</span>
									)}
								</div>
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
// pass 57: what a send would move a world, as its card's column prints it
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
